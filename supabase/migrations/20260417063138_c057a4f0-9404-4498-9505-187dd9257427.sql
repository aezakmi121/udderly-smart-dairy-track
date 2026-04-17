-- 1. Add species to cream_stock and ghee_production
ALTER TABLE public.cream_stock 
  ADD COLUMN IF NOT EXISTS species text NOT NULL DEFAULT 'cow' 
  CHECK (species IN ('cow','buffalo','mixed'));

ALTER TABLE public.ghee_production 
  ADD COLUMN IF NOT EXISTS species text NOT NULL DEFAULT 'cow' 
  CHECK (species IN ('cow','buffalo','mixed'));

ALTER TABLE public.ghee_production 
  ADD COLUMN IF NOT EXISTS current_stock numeric NOT NULL DEFAULT 0;

-- 2. Add product column to plant_sales (milk or ffm)
ALTER TABLE public.plant_sales 
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'milk' 
  CHECK (product IN ('milk','ffm'));

-- 3. FFM Stock table
CREATE TABLE IF NOT EXISTS public.ffm_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('in','out')),
  source text NOT NULL CHECK (source IN ('separation','dahi','plant_sale','discard','adjustment')),
  quantity numeric NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  milk_distribution_id uuid REFERENCES public.milk_distributions(id) ON DELETE SET NULL,
  dahi_production_id uuid REFERENCES public.dahi_production(id) ON DELETE SET NULL,
  plant_sale_id uuid REFERENCES public.plant_sales(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.ffm_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and workers can manage ffm stock"
  ON public.ffm_stock FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

CREATE INDEX IF NOT EXISTS idx_ffm_stock_date ON public.ffm_stock(transaction_date DESC);

-- 4. Ghee Dispatch table (stock movements without revenue)
CREATE TABLE IF NOT EXISTS public.ghee_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  dispatch_type text NOT NULL CHECK (dispatch_type IN ('store','customer_order','sample')),
  quantity numeric NOT NULL,
  customer_name text,
  ghee_production_id uuid REFERENCES public.ghee_production(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.ghee_dispatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and workers can manage ghee dispatch"
  ON public.ghee_dispatch FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worker'::app_role));

CREATE TRIGGER update_ghee_dispatch_updated_at
  BEFORE UPDATE ON public.ghee_dispatch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ghee_dispatch_date ON public.ghee_dispatch(dispatch_date DESC);

-- 5. Trigger: auto-create FFM stock 'in' row when milk_distributions has ffm_yield > 0
CREATE OR REPLACE FUNCTION public.auto_ffm_stock_from_distribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_stock numeric := 0;
  new_qty numeric := 0;
BEGIN
  new_qty := COALESCE(NEW.ffm_yield, 0);

  -- Skip if no FFM produced
  IF new_qty <= 0 THEN
    RETURN NEW;
  END IF;

  -- Skip on UPDATE if ffm_yield didn't change
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.ffm_yield, 0) = new_qty THEN
    RETURN NEW;
  END IF;

  -- Get latest running stock
  SELECT current_stock INTO prev_stock
  FROM public.ffm_stock
  ORDER BY created_at DESC
  LIMIT 1;

  prev_stock := COALESCE(prev_stock, 0);

  INSERT INTO public.ffm_stock (
    transaction_date, transaction_type, source, quantity, current_stock,
    milk_distribution_id, notes
  ) VALUES (
    NEW.distribution_date, 'in', 'separation', new_qty, prev_stock + new_qty,
    NEW.id, 'Auto-logged from milk distribution (' || NEW.session || ')'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_ffm_stock
  AFTER INSERT OR UPDATE OF ffm_yield ON public.milk_distributions
  FOR EACH ROW EXECUTE FUNCTION public.auto_ffm_stock_from_distribution();

-- 6. Trigger: maintain running ghee stock on production / dispatch / sale
CREATE OR REPLACE FUNCTION public.recalc_ghee_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_produced numeric := 0;
  total_dispatched numeric := 0;
  total_sold numeric := 0;
  running numeric := 0;
BEGIN
  SELECT COALESCE(SUM(ghee_yield), 0) INTO total_produced FROM public.ghee_production;
  SELECT COALESCE(SUM(quantity), 0) INTO total_dispatched FROM public.ghee_dispatch;
  SELECT COALESCE(SUM(quantity), 0) INTO total_sold FROM public.ghee_sales;
  running := total_produced - total_dispatched - total_sold;

  -- Apply running total to most recent ghee_production row (single running total)
  UPDATE public.ghee_production
  SET current_stock = running
  WHERE id = (SELECT id FROM public.ghee_production ORDER BY production_date DESC, created_at DESC LIMIT 1);

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_ghee_stock_on_production
  AFTER INSERT OR UPDATE OR DELETE ON public.ghee_production
  FOR EACH STATEMENT EXECUTE FUNCTION public.recalc_ghee_stock();

CREATE TRIGGER trg_ghee_stock_on_dispatch
  AFTER INSERT OR UPDATE OR DELETE ON public.ghee_dispatch
  FOR EACH STATEMENT EXECUTE FUNCTION public.recalc_ghee_stock();

CREATE TRIGGER trg_ghee_stock_on_sale
  AFTER INSERT OR UPDATE OR DELETE ON public.ghee_sales
  FOR EACH STATEMENT EXECUTE FUNCTION public.recalc_ghee_stock();