
-- Add foreign key constraints to expenses table for proper relational queries

-- Add foreign key for category_id
ALTER TABLE public.expenses 
  ADD CONSTRAINT fk_expenses_category 
  FOREIGN KEY (category_id) 
  REFERENCES public.expense_categories(id) 
  ON DELETE SET NULL;

-- Add foreign key for source_id  
ALTER TABLE public.expenses 
  ADD CONSTRAINT fk_expenses_source 
  FOREIGN KEY (source_id) 
  REFERENCES public.expense_sources(id) 
  ON DELETE SET NULL;

-- Add foreign key for payment_method_id
ALTER TABLE public.expenses 
  ADD CONSTRAINT fk_expenses_payment_method 
  FOREIGN KEY (payment_method_id) 
  REFERENCES public.payment_methods(id) 
  ON DELETE SET NULL;
