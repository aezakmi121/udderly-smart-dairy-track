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

## Part 2 — Proposal

Three layers, each independently useful. Layer 1 alone solves the ₹35,000 case.

### Layer 1 — Recovery policy on the advance

Add to `farmer_advances`:

```sql
ALTER TABLE public.farmer_advances
  ADD COLUMN recovery_mode text NOT NULL DEFAULT 'auto'
    CHECK (recovery_mode IN ('auto','installment','manual','paused')),
  ADD COLUMN installment_amount numeric CHECK (installment_amount > 0),
  ADD COLUMN recovery_start_date date,
  ADD CONSTRAINT farmer_advances_installment_required
    CHECK (recovery_mode <> 'installment' OR installment_amount IS NOT NULL);
```

- **`auto`** — today's behaviour. Recover as much as the bill allows. Default, so
  nothing existing changes.
- **`installment`** — recover at most `installment_amount` per cycle. Your ₹35,000
  at ₹10,000 → four cycles, and the farmer still takes money home each time.
- **`manual`** — never deducted automatically. The admin types a figure on the
  draft bill each cycle (Layer 2). This is the "upto the farmer" case: ₹10,000
  now, ₹5,000 next, nothing the cycle their buffalo is dry.
- **`paused`** — recover nothing, keep the balance visible. For a farmer in
  trouble.
- **`recovery_start_date`** — a grace period. Advance given today, recovery starts
  next month.

Plus one safety rail, because it is the thing that actually protects the farmer
regardless of mode — a floor on take-home, in `app_settings.payout_settings`:

```jsonc
{
  "advance_recovery": {
    "default_mode": "auto",
    "min_take_home_pct": 30,   // never recover more than 70% of the milk bill
    "min_take_home_amount": 0  // or an absolute floor, whichever binds harder
  }
}
```

Optionally overridable per farmer (`farmers.min_take_home_pct`) for the one or
two who want everything cut at once.

**Recovery amount for a cycle then becomes:**

```
budget      = milk_amount − max(min_take_home_amount, milk_amount × min_take_home_pct/100)
per advance = auto        → remaining
              installment → min(remaining, installment_amount)
              manual      → 0   (admin supplies it per cycle)
              paused      → 0
              and 0 if recovery_start_date > cycle_end
deducted    = min(Σ eligible, budget)     -- FIFO by advance_date, as today
```

`generate-payout-cycle` changes from ~6 lines to a small helper. Everything
downstream — FIFO recovery in finalize, `farmer_advance_recoveries`, the PDF —
already handles a partial `advances_deducted` correctly and needs no change.

### Layer 2 — Per-cycle override on the draft bill

```sql
ALTER TABLE public.farmer_payouts
  ADD COLUMN advances_deducted_override numeric CHECK (advances_deducted_override >= 0),
  ADD COLUMN deduction_override_note text,
  ADD COLUMN deduction_override_by uuid,
  ADD COLUMN deduction_override_at timestamptz;
```

`generate-payout-cycle` uses `COALESCE(override, computed)` and — critically —
**does not include the override columns in its upsert**, so regenerating a draft
never clobbers a manual decision. The override is clamped to the outstanding
balance, and clearing it (set to `NULL`) returns the row to policy.

UI: in the Recon tab, each `DraftRow` gains an inline editable "Advance this
cycle" field showing `deducted / outstanding`, with the net recomputing live. Admin
only, draft-status only — rejected once the cycle is finalized.

This is the piece that makes "₹10k now, ₹5k next, up to the farmer" a
ten-second job at the counter rather than a policy decision.

### Layer 3 — The ledger

**Derive it, do not store it.** A physical ledger table means dual writes and
guaranteed drift. Everything needed is already in the money tables; a view over
them is always consistent by construction.

The accounting model — one running balance, *what the dairy owes the farmer*:

| Event | Source | Effect |
|---|---|---|
| Milk billed | `farmer_payouts` (finalized, not void) | `+ total_amount` |
| Other deductions | `farmer_payouts` | `− other_deductions` |
| Advance disbursed | `farmer_advances` | `− amount` |
| Advance written off | `farmer_advances` (`written_off`) | `+ unrecovered remainder` |
| Cash repaid by farmer | `farmer_advance_recoveries` (`source='cash'`) | `+ amount` |
| Payment made to farmer | `farmer_payment_events` | `− amount` |

**Advance *recovery against a bill* is deliberately not a ledger event.** The
disbursement already debited the farmer; the recovery is only how that debit gets
netted out at bill time. Counting both is the classic double-count in this kind
of ledger, and it is worth stating explicitly in the migration comment so nobody
"fixes" it later.

```sql
CREATE VIEW public.farmer_ledger AS
  SELECT farmer_id, finalized_at::date AS entry_date, 'milk_bill' AS kind,
         id AS ref_id, bill_number AS ref_label, total_amount AS delta
    FROM public.farmer_payouts WHERE status IN ('finalized','paid')
  UNION ALL
  SELECT farmer_id, advance_date, 'advance_given', id, notes, -amount
    FROM public.farmer_advances
  UNION ALL
  SELECT p.farmer_id, e.paid_on, 'payment', e.id, e.method::text, -e.amount
    FROM public.farmer_payment_events e
    JOIN public.farmer_payouts p ON p.id = e.payout_id
  -- + other_deductions, write-offs, cash repayments
;
```

with a running balance via
`SUM(delta) OVER (PARTITION BY farmer_id ORDER BY entry_date, kind)`, and a
companion `farmer_balances` view for the one-row-per-farmer summary
(`milk_earned`, `advances_outstanding`, `paid_out`, `net_balance`).

**A reconciliation check** worth having as a DB function and surfacing in the
admin UI — for every farmer, `ledger_balance` must equal
`Σ unpaid_balance − Σ advances_outstanding`. Any drift means a bug, and you want
to find it in a nightly check rather than in an argument with a farmer.

Then two screens fall out almost for free:
- **Admin**: farmer detail → statement, filterable by date, CSV export. This is
  the answer to "show me everything about this farmer".
- **Portal**: the farmer's own statement in Hindi. They already see an advance
  tile; a real ledger of "मिला / कटा / बकाया" is far more convincing on paper.

### Layer 4 — Filling the smaller holes

Roughly in the order they are worth doing:

- **Advance requests admin screen** — a Pending list in the Advances tab, with
  Approve (creates the `farmer_advances` row, writes `approved_advance_id`,
  sets mode/installment right there) and Reject with a note. Notify over WhatsApp.
  Wires up a feature that is already 80% built.
- **Cash repayment** — make `farmer_advance_recoveries.payout_id` nullable, add
  `source text NOT NULL DEFAULT 'payout' CHECK (source IN ('payout','cash','writeoff'))`
  and `recovered_on date`, and replace the constraint with
  `UNIQUE (advance_id, payout_id) WHERE payout_id IS NOT NULL`. Then a "Record
  repayment" button.
- **Advance edit / write-off** — with an audit row for each. Only while
  `recovered_amount = 0` for edits; write-off at any time.
- **`other_deductions`** — a small `farmer_deductions` table (`farmer_id`,
  `cycle_id`, `kind`, `amount`, `note`) summed into the payout, so feed and
  medicine stop being invisible.
- **Fix the partial-payment status** — a `partially_paid` enum value, so
  `fully_paid` on a cycle means what it says.
- **Add the missing FK** on `farmer_advances.farmer_id` → `farmers.id`, mirroring
  the Phase 1 treatment of `farmer_payouts`.
- **Rebuild the Advances tab** — per-farmer grouping, outstanding total at the
  top, search, and a link into the farmer's ledger. The current flat 100-row list
  does not survive fifty farmers.

### Suggested order

| Step | Scope | Why here |
|---|---|---|
| 1 | Layer 1 + Layer 2 | Solves the actual problem. One migration, one edge-function change, one UI field. |
| 2 | Layer 3 views + admin statement | Makes the result auditable and answers "where does this farmer stand". |
| 3 | Advance requests screen + cash repayment | Closes the loop already half-built. |
| 4 | Write-off, `other_deductions`, status fix, FK | Hygiene. |
| 5 | Portal statement in Hindi | Farmer-facing polish. |

Steps 1 and 2 are the ones that matter. Everything after is cleanup.

### Worked example — ₹35,000, recovered your way

```
Cycle A  milk ₹12,000  advance outstanding ₹35,000
         mode=manual, admin types 10,000
         → deducted 10,000 · net payable ₹2,000 · outstanding ₹25,000

Cycle B  milk ₹14,000  admin types 5,000
         → deducted 5,000 · net payable ₹9,000 · outstanding ₹20,000

Cycle C  milk ₹9,000   admin types 0 (bad month)
         → net payable ₹9,000 · outstanding ₹20,000

Cycle D  switched to installment, ₹8,000/cycle, milk ₹15,000
         → deducted 8,000 · net payable ₹7,000 · outstanding ₹12,000
```

Under today's code, cycle A pays ₹0, cycle B pays ₹0, cycle C pays ₹0, and the
farmer is owed nothing until the ₹35,000 is gone.

### Open questions

1. **Interest on advances?** None of this models it. If advances are effectively
   interest-free credit, skip it entirely — that is the simpler system. If not,
   it needs a rate on the advance and an accrual job, and the ledger gains an
   `interest_accrued` entry kind.
2. **Should the farmer see the recovery plan in the portal?** "₹25,000 बाकी,
   ₹10,000 अगले बिल से" is more honest than the current "अगले बिल से कटेगा", but
   it commits you publicly to an amount you may want to vary.
3. **Who may set an override?** Admin only, or collection centre too? Layer 2
   above assumes admin only.
4. **Cap on total advance per farmer?** The portal request path already caps a
   single request at ₹1,00,000, but nothing caps the running total.
