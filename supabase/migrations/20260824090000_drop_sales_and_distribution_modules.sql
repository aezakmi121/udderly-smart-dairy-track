-- Drop the ten tables behind the sales, distribution and slip-verification
-- screens, all of which were removed from the app in the same change.
--
-- Seven were empty. The other three held 32 rows between them, none written in
-- months, archived as CSV in docs/archive before this ran.
--
-- Plain DROP TABLE, never CASCADE: if a dependency the survey missed exists,
-- this should fail loudly rather than quietly take something with it. The
-- children come first because they hold the foreign keys.
--
-- Not touched, despite sharing a name: the collection_centre role, the
-- milk_collections table and the whole Milk Collection screen; and
-- milk_collections.slip_printed_at, which drives slip printing and the farmer
-- QR portal and has nothing to do with slip_verification.

DROP TABLE public.ffm_stock;
DROP TABLE public.cream_stock;

DROP TABLE public.slip_verification;
DROP TABLE public.collection_center_distributions;
DROP TABLE public.collection_center_sales;
DROP TABLE public.milk_distributions;
DROP TABLE public.plant_sales;
DROP TABLE public.store_sales;
DROP TABLE public.store_receipts;
DROP TABLE public.dahi_production;

-- Its only trigger went with milk_distributions.
DROP FUNCTION IF EXISTS public.auto_ffm_stock_from_distribution();
