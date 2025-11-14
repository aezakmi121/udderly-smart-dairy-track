-- Function to update cow's last calving date based on most recent calf
CREATE OR REPLACE FUNCTION public.update_cow_last_calving_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the mother cow's last_calving_date to the most recent calf's date_of_birth
  IF NEW.mother_cow_id IS NOT NULL THEN
    UPDATE public.cows
    SET 
      last_calving_date = (
        SELECT MAX(date_of_birth)
        FROM public.calves
        WHERE mother_cow_id = NEW.mother_cow_id
          AND status != 'dead'
      ),
      updated_at = NOW()
    WHERE id = NEW.mother_cow_id;
  END IF;
  
  -- If this is an UPDATE and the mother_cow_id changed, update the old mother too
  IF TG_OP = 'UPDATE' AND OLD.mother_cow_id IS NOT NULL AND OLD.mother_cow_id != NEW.mother_cow_id THEN
    UPDATE public.cows
    SET 
      last_calving_date = (
        SELECT MAX(date_of_birth)
        FROM public.calves
        WHERE mother_cow_id = OLD.mother_cow_id
          AND status != 'dead'
      ),
      updated_at = NOW()
    WHERE id = OLD.mother_cow_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_update_cow_last_calving_on_insert
AFTER INSERT ON public.calves
FOR EACH ROW
EXECUTE FUNCTION public.update_cow_last_calving_date();

-- Create trigger for UPDATE operations
CREATE TRIGGER trigger_update_cow_last_calving_on_update
AFTER UPDATE ON public.calves
FOR EACH ROW
WHEN (
  OLD.mother_cow_id IS DISTINCT FROM NEW.mother_cow_id 
  OR OLD.date_of_birth IS DISTINCT FROM NEW.date_of_birth
  OR OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION public.update_cow_last_calving_date();

-- Optionally, backfill existing data: update all cows with their most recent calf's birth date
UPDATE public.cows c
SET 
  last_calving_date = (
    SELECT MAX(date_of_birth)
    FROM public.calves
    WHERE mother_cow_id = c.id
      AND status != 'dead'
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.calves WHERE mother_cow_id = c.id
);