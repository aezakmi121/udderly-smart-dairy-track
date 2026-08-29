# Dismantling the sales, distribution and slip-verification modules

Status: **proposal, for decision.** Nothing removed yet.

Nine screens to go: Plant Sales, Store Sales, Collection Center, Milk
Distribution, CC Distribution, Store Receipts, Slip Verification, Dahi
Production, Distribution Reports.

---

## 1. The headline: there is almost nothing to lose

Every table behind these screens, with its row count and the last time anything
was written to it:

| Table | Rows | Last write |
|---|---:|---|
| `slip_verification` | 29 | Oct 2025 |
| `milk_distributions` | 2 | Feb 2026 |
| `collection_center_distributions` | 1 | Apr 2026 |
| `plant_sales` | **0** | never |
| `store_sales` | **0** | never |
| `collection_center_sales` | **0** | never |
| `store_receipts` | **0** | never |
| `dahi_production` | **0** | never |
| `cream_stock` | **0** | never |
| `ffm_stock` | **0** | never |

**Seven of the ten are completely empty. The other three hold 32 rows between
them, none written in months.** This is not a live part of the farm — it is
about 4,700 lines of code and ten tables maintaining themselves.

## 2. The removal set

### Screens and code

| Route | Component | Lines |
|---|---|---|
| `/plant-sales` | `revenue/PlantSales*` (3 files) | |
| `/store-sales` | `revenue/StoreSales*` (3) | |
| `/collection-center-sales` | `revenue/CollectionCenterSales*` (3) | |
| `/milk-distribution` | `revenue/MilkDistribution*` (3) | |
| `/collection-center-distribution` | `revenue/CollectionCenterDistribution*` (3) | |
| `/store-receipts` | `revenue/StoreReceipt*` (2) | |
| `/slip-verification` | `revenue/SlipVerificationManagement` | |
| `/dahi-production` | `revenue/DahiProduction*` (2) | |
| `/distribution-reports` | `reports/DistributionReports` + `reports/distribution/` (5 tabs) | |
| | **total** | **~4,700** |

The whole `src/components/revenue/` directory goes.

### Hooks — every one is used only by a screen on that list

Verified: no other component imports any of them.

```
usePlantSales · useStoreSales · useStoreReceipts · useDahiProduction
useMilkDistribution · useCollectionCenterSales
useCollectionCenterDistributions · useSlipVerification
useDistributionAnalytics
```

### Two tables the brief did not mention

`cream_stock` and `ffm_stock` are not on your list, but they only exist to serve
this subsystem — they hold foreign keys into `milk_distributions`,
`dahi_production` and `plant_sales`, are reached only through the Cream & FFM
tab of Distribution Reports, and are both **empty**. A trigger
`trg_auto_ffm_stock` on `milk_distributions` writes into `ffm_stock`; both ends
are inside the removal set, so it goes with them.

Leaving them behind would strand two tables whose only purpose was to be joined
to tables that no longer exist.

### Edge functions

- `notify-plant-sale` — called only from `usePlantSales`. Goes.
- `api` — **does not go, but has to change.** See §4.

## 3. What is NOT affected — checked, not assumed

These share a name or a word with something being removed, and are staying:

| Stays | Why the confusion, and why it is safe |
|---|---|
| **`collection_centre` role** | The *role* an operator logs in with. Used by RLS on `milk_collections` and the whole Milk Collection screen. Unrelated to the `collection_center_sales` / `collection_center_distributions` **tables**. |
| **`/milk-collection` + `milk_collections`** | The daily collection register. Untouched. |
| **Slip printing, the QR, `/f/:token`** | These run off `milk_collections.slip_printed_at` and `fn_mark_slip_printed`. **`slip_verification` is a different thing entirely** — a reconciliation table comparing recorded quantity against the paper slip. Removing it does not touch printing or the farmer portal. |
| **`milk_production`** | Read by the distribution screens, owned by Milk Production. Untouched. |
| **Reports** | Milk Collection, Milk Production, Feed, Cattle, Expense tabs. `DistributionReports` was never one of them — it is only a standalone route. |
| **All four permission keys** | `milkCollection`, `milkProduction`, `analytics`, `settings` are each used by surviving routes too. Nothing is orphaned. |
| **Navigation** | Sidebar and bottom nav are generated from `routes.tsx`. Deleting the route entries removes the links; there is nothing hardcoded. |

No views depend on these tables. The only cross-table function is the
FFM trigger above. Every other trigger on them is `updated_at` housekeeping.

## 4. The one real decision: the `api` edge function

`supabase/functions/api` is an externally-callable, key-authenticated endpoint
(`PUBLIC_API_KEY`, rate-limited). It has four types, and two of them are built
on tables being removed:

| Type | Uses | After removal |
|---|---|---|
| `expenses` | `expenses` | fine |
| `milk-production` | `milk_production` | fine |
| **`revenue`** | `plant_sales`, `store_sales`, `collection_center_sales` | **has nothing left** |
| **`summary`** | `expenses`, `milk_production`, `plant_sales`, `store_sales` | **revenue always 0, so `profit` = −expenses** |

The `summary` case is the dangerous one. It would not error — it would keep
answering, with revenue silently zero and profit reported as a pure loss. A
wrong number that looks right is worse than an endpoint that is gone.

**If anything consumes this API, we need to know before removing.** Three
options:

1. **Drop `revenue`, and drop the revenue/profit fields from `summary`.**
   Honest. Breaks any caller expecting those fields.
2. **Repoint them at where revenue actually lives now** — farmer payouts and
   milk sales. More work, and only worth it if the endpoint is used.
3. **Leave the two tables `plant_sales` and `store_sales` in place** purely to
   keep the API answering zeros. I would not: it is the silent-wrong-number
   outcome.

I would take (1) unless you know of a consumer. **Do you know what calls this
API — a dashboard, a spreadsheet, an accountant's tool, anything?** If nothing
does, the cleanest answer is to delete the `api` function entirely, and that is
a fourth option worth considering.

## 5. How to dismantle it safely

**Two phases, and the gap between them is the safety.**

### Phase 1 — code only, database untouched

Remove routes, components, hooks and `notify-plant-sale`. Adjust the `api`
function per §4. The ten tables stay exactly where they are.

- Nothing can be lost, because nothing is dropped.
- Rollback is `git revert` of one commit.
- If a screen turns out to be needed after all, the data is still there.

Order within the phase, so the build never breaks mid-way:

1. Delete the nine route entries from `routes.tsx` — the screens vanish from the
   nav immediately.
2. Delete `src/components/revenue/`, `reports/DistributionReports.tsx`,
   `reports/distribution/`.
3. Delete the nine hooks.
4. Delete `notify-plant-sale`; edit `api`.
5. Remove the now-dead table branches from `src/utils/paginatedFetch.ts`.
6. Regenerate `types.ts` — or leave it; stale extra table types are harmless
   until Phase 2.

### Phase 2 — drop the tables, after a decent interval

A month is a reasonable wait. Nothing writes to these tables once Phase 1 ships,
so nothing accumulates.

**Take a backup of the 32 surviving rows first** — a `COPY … TO` of
`slip_verification`, `milk_distributions` and `collection_center_distributions`
committed to the repo as a CSV. It is 32 rows; there is no reason not to.

Drop order matters, because of the foreign keys:

```sql
-- Children first: these point into the others.
DROP TABLE public.ffm_stock;
DROP TABLE public.cream_stock;

-- Then the rest, in any order.
DROP TABLE public.slip_verification;
DROP TABLE public.collection_center_distributions;
DROP TABLE public.collection_center_sales;
DROP TABLE public.milk_distributions;      -- takes trg_auto_ffm_stock with it
DROP TABLE public.plant_sales;
DROP TABLE public.store_sales;
DROP TABLE public.store_receipts;
DROP TABLE public.dahi_production;

DROP FUNCTION IF EXISTS public.auto_ffm_stock_from_distribution();
```

Plain `DROP TABLE`, never `CASCADE` — if a dependency has appeared that this
survey missed, the drop should fail loudly rather than quietly take something
with it. That is the same reasoning behind flipping the cow foreign keys to
`RESTRICT`.

## 6. Found in passing

`src/components/reports/MilkReports.tsx` has no importers — dead code,
unrelated to this removal. Worth deleting in the same sweep.

## 7. Questions

1. **What calls the `api` edge function?** The one thing that could break
   outside this app. §4.
2. **Phase 2 now, or after a wait?** I would wait; you may know these screens
   are dead beyond doubt.
3. **`cream_stock` / `ffm_stock` — confirm they go?** They are empty and serve
   only this subsystem, but they were not on your list.
4. **Anything in those 32 rows worth keeping** beyond a CSV in the repo?
