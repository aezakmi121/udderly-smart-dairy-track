-- Tests for the rate lookup functions.
--
-- These are the functions that decide what a farmer is paid, so they get
-- checked against a matrix shaped like a real rate list: disjoint cow and
-- buffalo fat bands, an SNF floor below which nothing is payable, a flat
-- minimum rate at the bottom of the cow band, and two versions where the
-- second takes effect from an evening session.
--
-- Run via scripts/test-rate-logic.sh, which builds a throwaway Postgres,
-- applies every migration, loads this file and reports pass/fail.

\set ON_ERROR_STOP on
SET client_min_messages TO WARNING;

CREATE TABLE _results(name text, ok boolean, detail text);

CREATE OR REPLACE FUNCTION _check(p_name text, p_got anyelement, p_want anyelement)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _results VALUES (
    p_name,
    p_got IS NOT DISTINCT FROM p_want,
    format('got %s, want %s', coalesce(p_got::text, 'NULL'), coalesce(p_want::text, 'NULL'))
  );
END $$;

------------------------------------------------------------------------------
-- Fixture. rate = fat * 61 / 6.5, floored at 35 up to fat 3.7, and unpayable
-- outside each species' band. The 'v2' version is 10% higher.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _seed(p_from date, p_session text, p_mult numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE f numeric; s numeric; r numeric; sp text;
BEGIN
  FOR sp IN SELECT unnest(ARRAY['Cow','Buffalo']) LOOP
    f := CASE WHEN sp = 'Cow' THEN 2.5 ELSE 5.0 END;
    WHILE f <= (CASE WHEN sp = 'Cow' THEN 6.5 ELSE 12.2 END) LOOP
      s := 7.0;
      WHILE s <= 12.0 LOOP
        r := 0;
        IF sp = 'Cow' AND f >= 3.0 AND f <= 5.5 AND s >= 8.4 THEN
          r := GREATEST(round(f * 61.0 / 6.5, 2), 35.0);
        ELSIF sp = 'Buffalo' AND f >= 5.6 AND s >= 8.7 THEN
          r := round(f * 61.0 / 6.5, 2);
        END IF;
        INSERT INTO public.rate_matrix(species, fat, snf, effective_from, effective_session, rate)
        VALUES (sp, f, s, p_from, p_session, round(r * p_mult, 2))
        ON CONFLICT DO NOTHING;
        s := s + 0.1;
      END LOOP;
      f := f + 0.1;
    END LOOP;
  END LOOP;
END $$;

-- Each _check returns an empty row; suppress that and report at the end.
\o /dev/null

SELECT _seed('2026-07-15', 'morning', 1.0);
SELECT _seed('2026-08-01', 'evening', 1.1);

------------------------------------------------------------------------------
-- Ordinary pricing
------------------------------------------------------------------------------
SELECT _check('cow mid-band is priced',
  (SELECT rate FROM fn_get_rate('Cow', 4.0, 8.5, '2026-07-20', 'morning')), 37.54::numeric);

SELECT _check('cow mid-band resolves as Cow',
  (SELECT species FROM fn_resolve_rate(4.0, 8.5, '2026-07-20', 'morning')), 'Cow'::text);

SELECT _check('buffalo mid-band resolves as Buffalo',
  (SELECT species FROM fn_resolve_rate(7.2, 9.1, '2026-07-20', 'morning')), 'Buffalo'::text);

-- Species comes from the matrix, not a threshold setting, so the boundary is
-- wherever the bands say it is.
SELECT _check('fat 5.5 is the top of the cow band',
  (SELECT species FROM fn_resolve_rate(5.5, 9.0, '2026-07-20', 'morning')), 'Cow'::text);

SELECT _check('fat 5.6 is the bottom of the buffalo band',
  (SELECT species FROM fn_resolve_rate(5.6, 9.0, '2026-07-20', 'morning')), 'Buffalo'::text);

------------------------------------------------------------------------------
-- Rejection. An unpriced cell is not a Rs.0 rate.
------------------------------------------------------------------------------
SELECT _check('fat below the payable band is rejected',
  (SELECT source FROM fn_resolve_rate(2.9, 9.0, '2026-07-20', 'morning')), 'rejected'::text);

SELECT _check('a rejected sample has no species',
  (SELECT species FROM fn_resolve_rate(2.9, 9.0, '2026-07-20', 'morning')), NULL::text);

-- Low SNF rejects however good the fat is: the real 9.4/8.5 row that used to
-- be filed as Cow and paid Rs.0.
SELECT _check('low SNF rejects despite high fat',
  (SELECT source FROM fn_resolve_rate(9.4, 8.5, '2026-07-20', 'morning')), 'rejected'::text);

SELECT _check('SNF just below the cow gate is rejected',
  (SELECT source FROM fn_resolve_rate(4.5, 8.3, '2026-07-20', 'morning')), 'rejected'::text);

SELECT _check('SNF at the cow gate is payable',
  (SELECT source FROM fn_resolve_rate(4.5, 8.4, '2026-07-20', 'morning')), 'matrix'::text);

------------------------------------------------------------------------------
-- Clamping. Above the grid is still payable; never silently zero.
------------------------------------------------------------------------------
SELECT _check('SNF above the grid clamps and still pays',
  (SELECT source FROM fn_resolve_rate(4.0, 13.0, '2026-07-20', 'morning')), 'clamped_high'::text);

SELECT _check('SNF above the grid pays the top-band rate',
  (SELECT rate FROM fn_resolve_rate(4.0, 13.0, '2026-07-20', 'morning')), 37.54::numeric);

SELECT _check('fat above the grid clamps to the top of the buffalo band',
  (SELECT source FROM fn_resolve_rate(15.0, 9.5, '2026-07-20', 'morning')), 'clamped_high'::text);

------------------------------------------------------------------------------
-- Floor rate: a flat region is a legitimate shape, not an error.
------------------------------------------------------------------------------
SELECT _check('floor applies at the bottom of the cow band',
  (SELECT rate FROM fn_resolve_rate(3.0, 9.0, '2026-07-20', 'morning')), 35.00::numeric);

SELECT _check('floor still applies mid-way up',
  (SELECT rate FROM fn_resolve_rate(3.5, 9.0, '2026-07-20', 'morning')), 35.00::numeric);

SELECT _check('above the floor the rate rises again',
  (SELECT rate FROM fn_resolve_rate(4.0, 9.0, '2026-07-20', 'morning')), 37.54::numeric);

------------------------------------------------------------------------------
-- Versioning by date and session
------------------------------------------------------------------------------
SELECT _check('a date before any list has no rate',
  (SELECT source FROM fn_resolve_rate(4.0, 8.5, '2026-01-01', 'morning')), 'none'::text);

SELECT _check('31 Jul evening uses the old list',
  (SELECT effective_from FROM fn_resolve_rate(7.2, 9.1, '2026-07-31', 'evening')), '2026-07-15'::date);

-- The new list starts at the evening session, so that morning is still old.
SELECT _check('1 Aug MORNING still uses the old list',
  (SELECT effective_from FROM fn_resolve_rate(7.2, 9.1, '2026-08-01', 'morning')), '2026-07-15'::date);

SELECT _check('1 Aug EVENING switches to the new list',
  (SELECT effective_from FROM fn_resolve_rate(7.2, 9.1, '2026-08-01', 'evening')), '2026-08-01'::date);

SELECT _check('2 Aug morning stays on the new list',
  (SELECT effective_from FROM fn_resolve_rate(7.2, 9.1, '2026-08-02', 'morning')), '2026-08-01'::date);

SELECT _check('the new list actually prices higher',
  (SELECT rate FROM fn_resolve_rate(7.2, 9.1, '2026-08-02', 'morning')), 74.33::numeric);

------------------------------------------------------------------------------
-- Rounding: what the slip prints must be what it charges.
------------------------------------------------------------------------------
SELECT _check('rates are rounded to paise',
  (SELECT count(*) FROM (
     SELECT (fn_resolve_rate(f, 9.0, '2026-07-20', 'morning')).rate AS r
     FROM generate_series(3.0, 12.0, 0.1) f
   ) t WHERE r > 0 AND round(r, 2) <> r), 0::bigint);

------------------------------------------------------------------------------
-- Species is never ambiguous, and never assigned outside its band.
------------------------------------------------------------------------------
SELECT _check('no sample is priced by both species',
  (SELECT count(*) FROM (
     SELECT (fn_resolve_rate(f, s, '2026-07-20', 'morning')).ambiguous AS amb
     FROM generate_series(2.5, 12.2, 0.3) f, generate_series(7.0, 12.0, 0.3) s
   ) t WHERE amb), 0::bigint);

SELECT _check('Cow is never assigned above the cow band',
  (SELECT count(*) FROM (
     SELECT f, (fn_resolve_rate(f, 9.0, '2026-07-20', 'morning')).species AS sp
     FROM generate_series(2.5, 12.2, 0.1) f
   ) t WHERE sp = 'Cow' AND f > 5.5), 0::bigint);

SELECT _check('Buffalo is never assigned below the buffalo band',
  (SELECT count(*) FROM (
     SELECT f, (fn_resolve_rate(f, 9.0, '2026-07-20', 'morning')).species AS sp
     FROM generate_series(2.5, 12.2, 0.1) f
   ) t WHERE sp = 'Buffalo' AND f < 5.6), 0::bigint);

------------------------------------------------------------------------------
-- Backdating impact report
------------------------------------------------------------------------------
INSERT INTO public.farmers(id, name, farmer_code)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Farmer', 'T001')
ON CONFLICT DO NOTHING;

INSERT INTO public.milk_collections
  (farmer_id, collection_date, session, quantity, fat_percentage, snf_percentage, rate_per_liter, total_amount, species)
VALUES
  ('11111111-1111-1111-1111-111111111111', '2026-07-20', 'morning', 10, 4.0, 8.5, 37.54, 375.40, 'Cow'),
  ('11111111-1111-1111-1111-111111111111', '2026-07-20', 'evening', 10, 4.0, 8.5, 37.54, 375.40, 'Cow'),
  ('11111111-1111-1111-1111-111111111111', '2026-07-21', 'morning', 10, 4.0, 8.5, 37.54, 375.40, 'Cow');

SELECT _check('impact counts collections from the given date',
  (SELECT affected_collections FROM fn_rate_change_impact('2026-07-20', 'morning')), 3::bigint);

-- Session granularity: starting at the evening excludes that morning.
SELECT _check('impact respects the session boundary',
  (SELECT affected_collections FROM fn_rate_change_impact('2026-07-20', 'evening')), 2::bigint);

SELECT _check('impact sums the affected value',
  (SELECT affected_amount FROM fn_rate_change_impact('2026-07-21', 'morning')), 375.40::numeric);

SELECT _check('a future date affects nothing',
  (SELECT affected_collections FROM fn_rate_change_impact('2027-01-01', 'morning')), 0::bigint);

------------------------------------------------------------------------------
-- Report
------------------------------------------------------------------------------
\o
\echo ''
SELECT name, detail FROM _results WHERE NOT ok;

SELECT
  count(*) FILTER (WHERE ok) AS passed,
  count(*) FILTER (WHERE NOT ok) AS failed,
  (count(*) FILTER (WHERE NOT ok) > 0) AS any_failed
FROM _results \gset

\if :any_failed
  \echo '=== FAILED:' :failed 'of' :passed '+' :failed 'rate logic checks ==='
  DO $$ BEGIN RAISE EXCEPTION 'rate logic checks failed'; END $$;
\else
  \echo '=== all' :passed 'rate logic checks passed ==='
\endif
