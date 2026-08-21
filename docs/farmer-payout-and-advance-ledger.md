# Farmer payouts, advances, and the ledger

Status: design note. Nothing here is built yet — Part 1 documents what already
exists in the codebase today, Part 2 is the proposal.

---

## Part 1 — What exists today

### The short answer

**Yes, there is an advance system.** It works, it is idempotent, and it is
audited. What it does *not* have is a recovery *plan*: a ₹35,000 advance is
recovered as fast as the milk allows, all at once, until it is gone. There is no
way to say "take ₹10,000 this cycle, ₹5,000 next".

There is also **no farmer ledger** in the sense of a single running balance. The
numbers exist, but they are spread across five tables and are only ever assembled
per-cycle, never per-farmer-over-time.

### 1.1 The tables

| Table | What it holds |
|---|---|
| `farmer_payout_cycles` | One row per fortnight. `cycle_start`/`cycle_end`, `half` (`first`/`second`), `year_month`, `status`. |
| `farmer_payouts` | The bill. One row per `(cycle_id, farmer_id)` — UNIQUE. Milk totals, `advances_deducted`, `carry_forward_in`, `other_deductions`, `net_payable`, `paid_amount`, `unpaid_balance`, `bill_number`, `pdf_storage_path`. |
| `farmer_payment_events` | Every payment against a bill. `amount`, `method`, `reference`, `paid_on`, `idempotency_key`. Append-only in practice. |
| `farmer_advances` | The advance itself. `amount`, `recovered_amount`, `status` (`outstanding`/`recovered`/`written_off`), `advance_date`, `notes`. |
| `farmer_advance_recoveries` | Audit trail: which advance was recovered in which payout, and how much. `UNIQUE (advance_id, payout_id)` — this is what makes finalize re-runnable. |
| `farmer_advance_requests` | Farmer-initiated requests from the portal. `amount`, `reason`, `status`, `approved_advance_id`. |
| `farmer_payout_audit` | Before/after JSON per action, with actor. |
| `farmer_notifications` | WhatsApp send log. |

Cycle statuses run `open → closed_for_collection → drafted → finalized → fully_paid`.
Payout statuses run `draft → finalized → paid` (plus `void`).

### 1.2 The workflow, end to end

**1. Cycle rollover** — `rollover-payout-cycle` (cron/manual)
Creates the current fortnight as `open`, flips the previous one to
`closed_for_collection`. Cycle boundaries are 1–15 and 16–EOM, IST
(`_shared/cycles.ts`).

**2. Collection** — milk lands in `milk_collections` all fortnight.
The Current tab shows a live per-farmer total straight off that table
(`useCurrentCycleLive`); nothing is written to `farmer_payouts` yet.

**3. Draft the bills** — `generate-payout-cycle` (admin, "Generate Bills")
Idempotent, re-runnable. For each farmer it:
- aggregates accepted `milk_collections` in the date range → qty, amount, sessions, avg fat/SNF
- reads the **immediately preceding** cycle's `unpaid_balance` → `carry_forward_in`
- sums **all** outstanding advances → caps at the milk amount → `advances_deducted`
- `net_payable = max(milk + carry_forward − advance, 0)`
- upserts on `(cycle_id, farmer_id)`, sets the cycle to `drafted`

**4. Finalize** — `finalize-payout-cycle` (admin, one-way)
Assigns bill numbers (`YYYY-MM-A/B-<farmer_code>`), renders a Hindi PDF into the
private `farmer-bills` bucket, flips payouts to `finalized`, then recovers
advances **FIFO by `advance_date`**, writing one `farmer_advance_recoveries` row
per (advance, payout) and bumping `farmer_advances.recovered_amount`. The
`UNIQUE` constraint plus an up-front "does a recovery row already exist for this
payout" check means re-running finalize does not double-deduct. Then it fires
WhatsApp notifications.

**5. Pay** — `record-payment-event` (one) / `bulk-record-payments` (many)
Inserts into `farmer_payment_events`. A trigger
(`recalc_farmer_payout_from_events`) recomputes `paid_amount`,
`unpaid_balance = max(net − paid, 0)`, and the last method/ref/date. When no
non-paid bills remain, the cycle flips to `fully_paid`. Both endpoints take an
`idempotency_key` so a retried request is a no-op.

**6. Carry forward** — anything left unpaid becomes the next cycle's
`carry_forward_in` when that cycle is drafted.

**7. The farmer's view** — `farmer-portal-data` returns bills, daily rows, and
outstanding advances; `FarmerPortal.tsx` shows an "अग्रिम बकाया" tile with
"अगले बिल से कटेगा". `farmer-request-advance` lets a farmer ask for one (max
₹1,00,000, one pending request at a time).

### 1.3 What the admin UI actually offers

`PayoutsManagement.tsx` has five tabs — Current, Recon, Payments, History,
Advances. The Advances tab (`AdvancesTab.tsx`) is thin: a form to add an advance
(farmer, amount, date, note) and a flat list of the **last 100 advances across
all farmers**, each with a "Due ₹x" badge. That is the whole thing.

### 1.4 Concrete gaps

Ordered roughly by how much they hurt.

1. **No recovery plan.** ₹35,000 advance against a ₹12,000 fortnight bill →
   `advances_deducted = 12,000`, `net_payable = 0`. The farmer gets nothing for
   three cycles running. This is exactly the case you asked about, and there is
   no knob for it anywhere — not on the advance, not on the farmer, not on the
   draft bill.
2. **No per-cycle override.** Even manually, an admin cannot edit
   `advances_deducted` on a draft bill from the UI.
3. **No ledger.** No per-farmer running balance, no statement, no opening/closing
   figures. To answer "what is this farmer's position?" you would join four
   tables by hand.
4. **Advance requests are a dead end.** The table and the edge function exist;
   there is no admin screen to approve or reject, and `approved_advance_id` is
   never written. A farmer who requests an advance is talking into a void.
5. **No cash repayment path.** If a farmer hands back ₹5,000 in cash rather than
   having it cut from milk, there is nowhere to record it.
   `farmer_advance_recoveries.payout_id` is `NOT NULL`.
6. **No write-off or edit UI.** `written_off` is a valid status that nothing can
   set. A typo'd advance amount can only be fixed in SQL.
7. **`other_deductions` is dead.** It is on the table, it prints on the PDF, and
   `generate-payout-cycle` hardcodes it to `0`. No feed/medicine/transport
   deduction is possible.
8. **Partial payment is recorded as `paid`.** In
   `recalc_farmer_payout_from_events` both branches resolve to
   `'paid'::payout_status` — a ₹100 payment on a ₹10,000 bill marks it paid, and
   because the cycle flips to `fully_paid` once no row is non-paid, **a cycle can
   read `fully_paid` with real money outstanding**. `unpaid_balance` stays
   correct, so nothing is lost, but every status-based readout lies.
9. **Skipped cycles drop the carry-forward.** `carry_forward_in` is read from the
   single most recent cycle with `cycle_end < cycle_start`. Chains correctly cycle
   to cycle, but if a cycle is never drafted the balance behind it is silently
   dropped.
10. **`farmer_advances.farmer_id` has no foreign key.** `farmer_payouts` got one
    in the Phase 1 data-integrity migration; advances were missed. Orphan advances
    are possible.
11. **Finalize won't top up a raised deduction.** The guard is "any recovery row
    exists for this payout", so if `advances_deducted` is edited upward after a
    first finalize, the delta is never recovered.
12. **RLS is broad.** `collection_centre` can `SELECT` every farmer's advances and
    every payout. Fine if the centre is trusted staff; worth a conscious decision.

---

## Part 2 — The plan (finalised)

Scope deliberately cut back after review. **Dropped:** recovery modes,
installment schedules, interest, the derived ledger views, cash repayment,
write-offs, `other_deductions`. What is left is the smallest thing that answers
"did this farmer take an advance, what came off it last, and what is left" — for
the admin who manages it and the farmer who reads it.

### 2.1 What we are actually building

Three small pieces:

1. **One number the admin controls** — how much comes off the advance this cycle.
2. **A clear advance summary** — last deduction, which cycle it came from, what
   remains. Admin sees it per farmer; the farmer sees only their own.
3. **Two hygiene fixes** that are cheap while we are in here.

No new tables. One meaningful new column.

### 2.2 The one knob

Today `generate-payout-cycle` decides the deduction for you:
`min(total outstanding, milk amount)` — which is why a ₹35,000 advance eats a
₹12,000 bill whole and the farmer goes home with nothing.

Rather than a policy engine, give the admin the number directly:

```sql
ALTER TABLE public.farmer_payouts
  ADD COLUMN advances_deducted_override numeric CHECK (advances_deducted_override >= 0),
  ADD COLUMN deduction_override_by uuid,
  ADD COLUMN deduction_override_at timestamptz;
```

- `generate-payout-cycle` uses `COALESCE(override, computed)`.
- The override columns are **excluded from its upsert**, so regenerating a draft
  never wipes a manual decision.
- Clamped to the outstanding balance. Setting it back to `NULL` returns the row
  to the automatic figure.
- Editable only while the payout is `draft`; rejected once the cycle is finalized.

In the Recon tab each draft row gets one inline field — "Advance this cycle",
showing `deducted / outstanding` — and the net recomputes live. Admin types
`10000`. Next cycle they type `5000`. The cycle after, `0`. That is the whole
"upto the farmer" behaviour, with no modes to configure and nothing to maintain.

> This is the one piece of the earlier proposal worth keeping. If you would
> rather not have it, everything below still works — the deduction just stays
> automatic, and the ₹35,000 case still zeroes the farmer out for three cycles.
> It is one nullable column and one input box, so it is the cheapest possible
> answer to that problem.

### 2.3 The advance summary — no new storage

Everything needed is already recorded. `farmer_advance_recoveries` holds one row
per `(advance_id, payout_id, amount)`, and the payout carries its cycle. So
"last deducted ₹X in cycle Y" is a query, not a column:

```sql
CREATE VIEW public.farmer_advance_summary AS
SELECT
  a.farmer_id,
  SUM(a.amount)                                     AS total_taken,
  SUM(a.amount - a.recovered_amount)                AS outstanding,
  MAX(a.advance_date)                               AS last_advance_date,
  (SELECT r.amount FROM farmer_advance_recoveries r
     JOIN farmer_advances a2 ON a2.id = r.advance_id
    WHERE a2.farmer_id = a.farmer_id
    ORDER BY r.created_at DESC LIMIT 1)             AS last_deducted_amount,
  (SELECT c.cycle_start FROM farmer_advance_recoveries r
     JOIN farmer_advances a2 ON a2.id = r.advance_id
     JOIN farmer_payouts p ON p.id = r.payout_id
     JOIN farmer_payout_cycles c ON c.id = p.cycle_id
    WHERE a2.farmer_id = a.farmer_id
    ORDER BY r.created_at DESC LIMIT 1)             AS last_deducted_cycle_start,
  -- + matching cycle_end
FROM public.farmer_advances a
WHERE a.status = 'outstanding'
GROUP BY a.farmer_id;
```

One view, admin-readable, and it cannot drift because it derives from the rows
finalize already writes.

### 2.4 Admin view — Advances tab

Replace the flat "last 100 advances across all farmers" list with one row per
farmer who has an outstanding advance:

```
कोड 042 · रामेश्वर                              बाकी ₹25,000
लिया ₹35,000 · पिछली कटौती ₹10,000 · 1–15 अगस्त
```

Plus a total across the herd at the top, a search box, and the existing "add
advance" form unchanged. Tapping a row expands the full recovery history for that
farmer — every `farmer_advance_recoveries` row with its cycle. That is the whole
screen.

**Admin only, properly.** The tab is already gated on `isAdmin`, but RLS
currently lets `collection_centre` `SELECT` every farmer's advances. Since the
decision is "only admin can do it", drop that policy:

```sql
DROP POLICY "CC view advances" ON public.farmer_advances;
```

### 2.5 Farmer view — read-only, and only if there is one

`farmer-portal-data` already returns the farmer's advances; it needs the last
recovery joined in. In `FarmerPortal.tsx`:

- **No advance → show nothing.** Not a zero tile, not an empty row. A farmer who
  has never taken an advance should never see the word.
- **Advance outstanding →** replace the current "अगले बिल से कटेगा" tile with the
  real figures:

```
अग्रिम / Advance
लिया:          ₹35,000
पिछली कटौती:   ₹10,000  (1–15 अगस्त)
बाकी:          ₹25,000
```

Read-only. Nothing on the portal writes to advances, and the existing
`farmer-request-advance` endpoint stays as it is (the approval screen for it is
out of scope — see 2.7).

### 2.6 Two hygiene fixes while we are here

- **Add the missing foreign key** on `farmer_advances.farmer_id` → `farmers.id`
  with `ON DELETE RESTRICT`, mirroring what `farmer_payouts` got in the Phase 1
  data-integrity migration. Orphan advances are currently possible.
- **Fix the partial-payment status.** Both branches of
  `recalc_farmer_payout_from_events` resolve to `'paid'`, so a ₹100 payment on a
  ₹10,000 bill marks the bill paid and the cycle can read `fully_paid` with money
  still owed. Add a `partially_paid` value to `payout_status` and use it. No data
  is wrong today — `unpaid_balance` stays correct — but every status readout is.

### 2.7 Explicitly not doing (recorded so it is a decision, not an oversight)

| Deferred | Why |
|---|---|
| Recovery modes / installments | Overkill. §2.2 gives the same control with one field. |
| Interest on advances | Confirmed: advances are interest-free. |
| The `farmer_ledger` views | Wanted a running balance; not needed for this question. Revisit if a full statement is ever asked for. |
| Cash repayment of an advance | Needs `farmer_advance_recoveries.payout_id` to become nullable. Add when someone actually hands cash back. |
| Write-off / edit advance UI | Rare. SQL for now. |
| `other_deductions` | Still dead. Leave it. |
| Advance-requests admin screen | The table and edge function exist and go nowhere. Worth doing eventually; not part of this. |
| Skipped-cycle carry-forward | Only bites if a cycle is never drafted. Watch it. |

### 2.8 Build order

| # | Change | Size |
|---|---|---|
| 1 | Migration: override columns, `farmer_advance_summary` view, FK, drop CC policy | one migration |
| 2 | `generate-payout-cycle` — `COALESCE(override, computed)`, exclude override from upsert | ~10 lines |
| 3 | Recon tab — inline "Advance this cycle" field | one component |
| 4 | Advances tab — per-farmer summary rows | rewrite of `AdvancesTab.tsx` |
| 5 | `farmer-portal-data` + `FarmerPortal.tsx` — advance block, hidden when none | ~30 lines |
| 6 | `partially_paid` status | small migration + trigger edit |

Steps 1–3 are the functional change; 4–5 are what you and the farmer actually
look at. Step 6 is independent and can go whenever.

### 2.9 The ₹35,000 case, finalised

```
Cycle A  milk ₹12,000   admin types 10,000
         farmer gets ₹2,000 · advance left ₹25,000
         portal shows: लिया ₹35,000 · पिछली कटौती ₹10,000 (1–15 अगस्त) · बाकी ₹25,000

Cycle B  milk ₹14,000   admin types 5,000
         farmer gets ₹9,000 · advance left ₹20,000

Cycle C  milk ₹9,000    admin types 0
         farmer gets ₹9,000 · advance left ₹20,000
```
