-- Tests for the collection centre guards on milk_collections.
--
-- These decide what a semi-skilled operator can do to recorded milk, including
-- milk that has already been paid for, so they are exercised rather than
-- assumed. Each case acts as a real user by setting test.uid, which the stubbed
-- auth.uid() reads, and runs as a non-superuser so RLS actually applies.

\set ON_ERROR_STOP on
SET client_min_messages TO WARNING;

CREATE TABLE _rls_results(name text, ok boolean, detail text);

-- Runs a statement as the given user and records whether it was permitted.
CREATE OR REPLACE FUNCTION _try(p_name text, p_uid uuid, p_sql text, p_want_allowed boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE allowed boolean := true; msg text := '';
BEGIN
  PERFORM set_config('test.uid', p_uid::text, true);
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    allowed := false; msg := SQLERRM;
  END;
  INSERT INTO _rls_results VALUES (
    p_name, allowed = p_want_allowed,
    format('%s, wanted %s. %s',
           CASE WHEN allowed THEN 'allowed' ELSE 'blocked' END,
           CASE WHEN p_want_allowed THEN 'allowed' ELSE 'blocked' END, msg)
  );
END $$;

-- An UPDATE or DELETE that RLS filters out affects zero rows rather than
-- raising, so "did it change anything" is the real question for those.
CREATE OR REPLACE FUNCTION _try_rows(p_name text, p_uid uuid, p_sql text, p_want_rows integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('test.uid', p_uid::text, true);
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _rls_results VALUES (p_name, n = p_want_rows, format('%s rows, wanted %s', n, p_want_rows));
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  INSERT INTO _rls_results VALUES (p_name, 0 = p_want_rows, format('blocked, wanted %s rows. %s', p_want_rows, SQLERRM));
END $$;

\o /dev/null

------------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------------
INSERT INTO public.user_roles(user_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin'),
  ('cccccccc-0000-0000-0000-000000000003', 'collection_centre');

INSERT INTO public.farmers(id, name, farmer_code)
VALUES ('ffffffff-0000-0000-0000-00000000000f', 'Test Farmer', 'T001')
ON CONFLICT DO NOTHING;

-- One settled period and one still open.
INSERT INTO public.farmer_payout_cycles(cycle_start, cycle_end, half, year_month, status) VALUES
  ('2026-06-01', '2026-06-15', 'first', '2026-06', 'finalized'),
  ('2026-07-01', '2026-07-15', 'first', '2026-07', 'open');

-- Seed rows as the table owner, before RLS is exercised.
INSERT INTO public.milk_collections
  (id, farmer_id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-00000000000f',
   '2026-06-10', 'morning', 10, 4.0, 8.5, 37.54, 375.40, 'Cow'),   -- settled
  ('22222222-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-00000000000f',
   '2026-07-10', 'morning', 10, 4.0, 8.5, 37.54, 375.40, 'Cow');   -- open

-- A PIN to try and read. Seeded before the role switch, because the point of
-- the checks below is that RLS hides it, not that the row is missing.
INSERT INTO public.farmer_pins(farmer_id, pin_hash, pin_salt)
VALUES ('ffffffff-0000-0000-0000-00000000000f', 'GUARD_HASH', 'GUARD_SALT')
ON CONFLICT (farmer_id) DO UPDATE SET pin_hash = 'GUARD_HASH';

-- Run the checks as a role that RLS applies to.
CREATE ROLE _tester;
GRANT USAGE ON SCHEMA public, auth TO _tester;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milk_collections TO _tester;
GRANT SELECT ON public.user_roles, public.farmer_payout_cycles, public.farmers TO _tester;
GRANT INSERT ON _rls_results TO _tester;
-- Supabase grants these to anon and authenticated on every table in public, so
-- the tester gets them too. Without this the PIN checks below would pass for
-- the wrong reason -- a missing GRANT rather than the RLS that actually ships.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_pins TO _tester;
SET ROLE _tester;

------------------------------------------------------------------------------
-- Collection centre: the day job must work
------------------------------------------------------------------------------
SELECT _try('CC can record milk in an open period',
  'cccccccc-0000-0000-0000-000000000003',
  $q$INSERT INTO public.milk_collections
       (farmer_id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species)
     VALUES ('ffffffff-0000-0000-0000-00000000000f','2026-07-11','morning',5,4.0,8.5,37.54,187.70,'Cow')$q$,
  true);

SELECT _try_rows('CC can correct a collection in an open period',
  'cccccccc-0000-0000-0000-000000000003',
  $q$UPDATE public.milk_collections SET quantity = 11
      WHERE id = '22222222-0000-0000-0000-000000000002'$q$,
  1);

-- Order-independent: the settled row is visible to the collection centre.
SELECT _try_rows('CC can read collections, including settled ones',
  'cccccccc-0000-0000-0000-000000000003',
  $q$SELECT 1 FROM public.milk_collections
      WHERE id = '11111111-0000-0000-0000-000000000001'$q$,
  1);

------------------------------------------------------------------------------
-- Collection centre: settled money is off limits
------------------------------------------------------------------------------
SELECT _try('CC cannot record into a settled period',
  'cccccccc-0000-0000-0000-000000000003',
  $q$INSERT INTO public.milk_collections
       (farmer_id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species)
     VALUES ('ffffffff-0000-0000-0000-00000000000f','2026-06-11','morning',5,4.0,8.5,37.54,187.70,'Cow')$q$,
  false);

SELECT _try_rows('CC cannot alter a settled collection',
  'cccccccc-0000-0000-0000-000000000003',
  $q$UPDATE public.milk_collections SET quantity = 99
      WHERE id = '11111111-0000-0000-0000-000000000001'$q$,
  0);

-- Moving an open row into a settled period would launder the guard.
SELECT _try_rows('CC cannot move a collection into a settled period',
  'cccccccc-0000-0000-0000-000000000003',
  $q$UPDATE public.milk_collections SET collection_date = '2026-06-12'
      WHERE id = '22222222-0000-0000-0000-000000000002'$q$,
  0);

------------------------------------------------------------------------------
-- Collection centre: never deletes
------------------------------------------------------------------------------
SELECT _try_rows('CC cannot delete an open collection',
  'cccccccc-0000-0000-0000-000000000003',
  $q$DELETE FROM public.milk_collections WHERE id = '22222222-0000-0000-0000-000000000002'$q$,
  0);

SELECT _try_rows('CC cannot delete a settled collection',
  'cccccccc-0000-0000-0000-000000000003',
  $q$DELETE FROM public.milk_collections WHERE id = '11111111-0000-0000-0000-000000000001'$q$,
  0);

------------------------------------------------------------------------------
-- Admin keeps full control
------------------------------------------------------------------------------
SELECT _try_rows('admin can alter a settled collection',
  'aaaaaaaa-0000-0000-0000-000000000001',
  $q$UPDATE public.milk_collections SET quantity = 12
      WHERE id = '11111111-0000-0000-0000-000000000001'$q$,
  1);

SELECT _try_rows('admin can delete a collection',
  'aaaaaaaa-0000-0000-0000-000000000001',
  $q$DELETE FROM public.milk_collections WHERE id = '11111111-0000-0000-0000-000000000001'$q$,
  1);

------------------------------------------------------------------------------
-- A user with no role gets nothing
------------------------------------------------------------------------------
SELECT _try_rows('a user with no role sees no collections',
  '00000000-0000-0000-0000-0000000000ff',
  $q$SELECT 1 FROM public.milk_collections$q$,
  0);

SELECT _try('a user with no role cannot record milk',
  '00000000-0000-0000-0000-0000000000ff',
  $q$INSERT INTO public.milk_collections
       (farmer_id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species)
     VALUES ('ffffffff-0000-0000-0000-00000000000f','2026-07-12','morning',5,4.0,8.5,37.54,187.70,'Cow')$q$,
  false);

------------------------------------------------------------------------------
-- PIN hashes are unreachable from the client, whoever is asking
--
-- The whole PIN design rests on this. A four digit PIN offers little once its
-- hash is in hand, so the table carries no policies at all and is reached only
-- by the edge functions through the service role.
------------------------------------------------------------------------------
SELECT _try_rows('an admin cannot read PIN hashes',
  'aaaaaaaa-0000-0000-0000-000000000001',
  $q$SELECT 1 FROM public.farmer_pins$q$,
  0);

SELECT _try_rows('the collection centre cannot read PIN hashes',
  'cccccccc-0000-0000-0000-000000000003',
  $q$SELECT 1 FROM public.farmer_pins$q$,
  0);

-- Setting a PIN for somebody is signing in as them. Clearing is the only
-- staff-side action, and it goes through fn_clear_farmer_pin.
SELECT _try('the collection centre cannot set a PIN directly',
  'cccccccc-0000-0000-0000-000000000003',
  $q$INSERT INTO public.farmer_pins(farmer_id, pin_hash, pin_salt)
     VALUES ('ffffffff-0000-0000-0000-00000000000f', 'x', 'y')$q$,
  false);

SELECT _try_rows('nobody can delete a PIN behind the audited function',
  'aaaaaaaa-0000-0000-0000-000000000001',
  $q$DELETE FROM public.farmer_pins$q$,
  0);

SELECT _try_rows('a user with no role cannot read PIN hashes',
  '00000000-0000-0000-0000-0000000000ff',
  $q$SELECT 1 FROM public.farmer_pins$q$,
  0);

RESET ROLE;
\o

\echo ''
SELECT name, detail FROM _rls_results WHERE NOT ok;

SELECT
  count(*) FILTER (WHERE ok) AS passed,
  count(*) FILTER (WHERE NOT ok) AS failed
FROM _rls_results \gset

\if :failed
  \echo '=== FAILED:' :failed 'of' :passed '+' :failed 'access guard checks ==='
  DO $$ BEGIN RAISE EXCEPTION 'access guard checks failed'; END $$;
\else
  \echo '=== all' :passed 'access guard checks passed ==='
\endif
