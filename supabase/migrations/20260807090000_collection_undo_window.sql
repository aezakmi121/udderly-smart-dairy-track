-- Let the operator take back the entry they just made, and only that one.
--
-- Wrong member code is the live problem: milk gets credited to the wrong
-- farmer, and it is noticed within seconds -- the farmer is still standing
-- there. The collection centre has no DELETE at all, so today the only remedy
-- is to find an admin, which in practice means it is left wrong.
--
-- Editing is already allowed while the period is open, but editing the farmer
-- on an existing row is not the same thing as undoing: the slip has been
-- printed with a name on it, and the honest record is that the entry never
-- should have existed.
--
-- So a deliberately narrow DELETE: your own row, made minutes ago, in a period
-- that has not been settled. Everything outside that stays an admin action.

-- Who recorded this. Defaults so it is filled without the client having to
-- remember, and left nullable because 18,570 existing rows predate it.
ALTER TABLE public.milk_collections
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

COMMENT ON COLUMN public.milk_collections.created_by IS
  'Who recorded the collection. Null for rows predating the column.';

-- How long an operator has to take an entry back. Long enough to notice the
-- name on the slip is wrong, short enough that it is not a way of quietly
-- rewriting the day.
CREATE OR REPLACE FUNCTION public.fn_collection_undo_window()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $function$ SELECT interval '15 minutes' $function$;

DROP POLICY IF EXISTS "Collection centre undoes its own recent entry" ON public.milk_collections;
CREATE POLICY "Collection centre undoes its own recent entry"
  ON public.milk_collections
  FOR DELETE
  USING (
    has_role((SELECT auth.uid()), 'collection_centre'::app_role)
    -- Somebody else's mistake is not yours to erase.
    AND created_by = (SELECT auth.uid())
    -- Rows from before the column exist have no owner, so they are never
    -- undoable -- otherwise every historical row would be fair game.
    AND created_by IS NOT NULL
    AND created_at > now() - public.fn_collection_undo_window()
    AND NOT public.fn_date_is_settled(collection_date)
  );
