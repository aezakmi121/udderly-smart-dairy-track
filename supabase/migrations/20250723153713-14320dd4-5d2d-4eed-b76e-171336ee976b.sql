-- Fix function search path security issues by setting search_path explicitly

-- 1. Fix calculate_days_in_milk function
CREATE OR REPLACE FUNCTION public.calculate_days_in_milk(cow_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  last_calving DATE;
BEGIN
  SELECT last_calving_date INTO last_calving 
  FROM public.cows 
  WHERE id = cow_id;
  
  IF last_calving IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN CURRENT_DATE - last_calving;
END;
$function$;

-- 2. Fix update_feed_stock function
CREATE OR REPLACE FUNCTION public.update_feed_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.transaction_type = 'incoming' THEN
    UPDATE public.feed_items 
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.feed_item_id;
  ELSE
    UPDATE public.feed_items 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.feed_item_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 4. Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY assigned_at DESC
  LIMIT 1
$function$;

-- 5. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone_number');
  
  -- Assign default worker role
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('eccc0710-369d-4c43-be95-6a93c7d6bf9a', 'admin');
  
  RETURN NEW;
END;
$function$;

-- 6. Fix update_cow_milk_totals function
CREATE OR REPLACE FUNCTION public.update_cow_milk_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update current month yield
  UPDATE public.cows SET 
    current_month_yield = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.milk_production 
      WHERE cow_id = NEW.cow_id 
      AND DATE_TRUNC('month', production_date) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    lifetime_yield = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM public.milk_production 
      WHERE cow_id = NEW.cow_id
    ),
    updated_at = NOW()
  WHERE id = NEW.cow_id;
  
  RETURN NEW;
END;
$function$;

-- 7. Fix create_daily_deliveries_for_date function
CREATE OR REPLACE FUNCTION public.create_daily_deliveries_for_date(target_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  record_count INTEGER := 0;
BEGIN
  INSERT INTO public.daily_deliveries (
    delivery_date,
    customer_id,
    delivery_boy_id,
    scheduled_quantity,
    rate_per_liter
  )
  SELECT 
    target_date,
    ca.customer_id,
    ca.delivery_boy_id,
    c.daily_quantity,
    c.rate_per_liter
  FROM public.customer_allocations ca
  JOIN public.customers c ON ca.customer_id = c.id
  WHERE ca.is_active = true
    AND c.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_deliveries dd 
      WHERE dd.delivery_date = target_date 
        AND dd.customer_id = ca.customer_id 
        AND dd.delivery_boy_id = ca.delivery_boy_id
    );
  
  GET DIAGNOSTICS record_count = ROW_COUNT;
  RETURN record_count;
END;
$function$;

-- 8. Fix update_customer_credit function
CREATE OR REPLACE FUNCTION public.update_customer_credit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update customer's current credit based on transaction type
  IF NEW.transaction_type = 'credit_sale' THEN
    UPDATE customers 
    SET current_credit = current_credit + NEW.amount 
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'payment' THEN
    UPDATE customers 
    SET current_credit = current_credit - NEW.amount,
        last_payment_date = CURRENT_DATE
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE customers 
    SET current_credit = current_credit + NEW.amount 
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$function$;