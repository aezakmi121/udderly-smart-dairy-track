# The cows screen — what to strip, and the button that should not be there

Status: **built.** Section 8 records the decisions and what shipped.

---

## 1. Start with what you found

Those nine animals — 34, 40, 50–56 — aged 2½ to 4½ years, never served, never
milked, are **sold or dead and nobody has updated the record.** That is not a
breeding problem. It is a symptom of this screen.

And it makes sense once you look at what the screen offers. There is **no way to
mark a cow dead**, and the only removal affordance is a red bin icon that does
something nobody would risk. So the record stays `active` forever, and every
count in the app — herd size, "never served", the dashboard tiles — carries nine
animals that left.

Fix the screen and that class of problem stops recurring.

## 2. The chrome (your three asks)

### 2.1 The headings

```
Cows Management                                    ← h2, delete
Manage your dairy cows and their information       ← delete
  ┌──────────────────────────────────────────┐
  │ Cow Details                              │    ← CardTitle, delete
  │ 22 of 35 cows shown                      │    ← keep the count, move it
```

Three headings before a single cow. The nav already says where you are. Delete
the page `<h2>` and its subtitle, and the card header; keep `22 of 35 cows
shown` as a small line above the list, where it is doing real work.

### 2.2 The filter button is full-width because of the layout, not the button

```tsx
<div className="flex flex-col gap-2 sm:flex-row">   // ← flex-col on mobile
```

`flex-col` makes both children stretch to the container width, so on a phone
Filters and Add Cow are each a full-width bar. Change to `flex-row` with
`justify-end`, and give Filters an icon-only form below `sm` — the funnel icon
plus the active-filter dot is enough, and it is what the AI board already does.

`FilterModal` also renders **Cancel** and **Apply Filters** at the foot, but the
filters apply live as you change them. Both buttons just close the sheet. One
"Done" is honest.

### 2.3 The side-scrolling

Nine columns in an `overflow-x-auto` table:

```
Image │ Cow Number │ Breed │ Status │ Age │ Days in Milk │ Daily Avg │ Calves │ Actions
```

On a phone you can see about two of them. Everything else is a horizontal drag,
and the three action buttons — the ones you actually came to press — are at the
far right, furthest from your thumb.

**Recommendation: one card per cow, like the breeding board.** That pattern is
already in the app and you have just been using it:

```
┌────────────────────────────────────────────────┐
│ 🐄  #23   Holstein                    [Active] │
│          4 yr · 112 days in milk · 14.2 L/day  │
│                                    2 calves  › │
└────────────────────────────────────────────────┘
```

- Tap the card → the existing `CowDetailsModal`, which is already rich (462
  lines: breeding history, production, vaccinations). Everything trimmed from
  the table is already in there.
- Edit and calves stay reachable from the card or the modal.
- No horizontal scroll at any width.
- Table layout kept for `sm` and up, where nine columns genuinely fit.

Column triage:

| Column | Card | Detail modal only |
|---|---|---|
| Image | small leading avatar | |
| Cow number, status | headline | |
| Breed, age, days in milk, daily avg | second line | |
| Calves count | small, right | full list already there |
| Lifetime yield, notes, arrival date | | already there |

## 3. Marking a cow dead

**The enum already has it.** `cow_status` is
`active, dry, pregnant, sick, sold, dead` — the database has supported `dead`
all along. Two dropdowns simply never offered it:

- `CowModal.tsx:113-117` — the add/edit form stops at `sold`
- `CowFiltersModal.tsx:70-75` — the status filter stops at `sold`

So this is a two-line fix, not a migration.

Three things to add around it:

1. **Colour it.** `getStatusColor` has cases for active / pregnant / dry / sick
   and a grey `default` — `sold` and `dead` are both the same grey. Give `dead`
   its own muted treatment so it reads as "gone", not "unknown".

2. **Hide gone animals by default.** A list that accumulates every animal that
   ever left gets worse every year. Default the screen to the animals still on the
   farm — active, dry, pregnant, sick — with a "Show sold & dead" toggle. The moment you mark
   those nine, they leave the working list and stay in the records.

3. **Optional, and I would take it:** `exit_date` and `exit_reason` columns.
   Without a date, "when did we lose her" is unanswerable and herd size over
   time cannot be charted. Two nullable columns, prompted when you pick
   sold/dead. Say if you would rather not and the status alone is fine.

## 4. The button that should not be there

This is the thing I would fix first, and it is not on your list.

The red bin next to every cow runs a **hard `DELETE`** behind a one-line
`confirm()`. Every foreign key pointing at `cows` is `ON DELETE CASCADE`:

| Cascades away with the cow | |
|---|---|
| `ai_records` | her whole breeding history |
| `calves` | every calf she has had |
| `milk_production` | every litre ever recorded |
| `cow_group_assignments` | |
| `vaccination_records` | |
| `weight_logs` | |

Across your 35 active cows that is **10,189 milk production rows, 50 AI records
and 63 calves.** One misclick on a phone, one `confirm()` dismissed by habit,
and a cow's entire history is gone with no undo and no audit row.

It is also, almost certainly, why the screen has no "dead" option in practice:
the only way to remove a cow destroys everything, so nobody uses it, so the
record just stays `active`.

**Recommendation:**

- **Remove the delete button.** Replace it with "Mark as sold / dead", which is
  what it is being reached for. An animal that leaves the herd is not a data
  entry error.
- **Flip those FKs to `RESTRICT`**, mirroring what the Phase 1 data-integrity
  migration did for `farmer_payouts` and `milk_collections`. Then even a direct
  delete fails loudly instead of silently taking the history.
- If a genuine mistyped-cow delete is still wanted, keep it admin-only behind
  typing the cow number — and only for a cow with no records at all.

**While in there:** `ai_records`, `vaccination_records` and `weight_logs` each
carry **two identical foreign keys** to `cows` (`fk_*_cow_id` and
`*_cow_id_fkey`). Same duplicate-FK situation Phase 1 cleaned up for
`milk_collections`. Drop the legacy `fk_`-prefixed one.

## 5. Dead code

`CowFilters.tsx` (125 lines) is not imported anywhere — `CowFiltersModal`
replaced it. Delete it.

## 6. What this costs

| # | Change | Size | Risk |
|---|---|---|---|
| 1 | Strip the three headings, keep the count | tiny | none |
| 2 | `flex-row`, icon-only Filters on mobile, one "Done" | tiny | none |
| 3 | Add `dead` to both dropdowns, colour it | tiny | none |
| 4 | Hide sold/dead by default + toggle | small | none |
| 5 | Card list below `sm`, table above | medium | none |
| 6 | Delete button → "Mark sold/dead" | small | **removes a destructive path** |
| 7 | FKs `CASCADE` → `RESTRICT`, drop duplicate FKs | one migration | low — nothing hard-deletes cows today |
| 8 | Delete `CowFilters.tsx` | tiny | none |
| 9 | *Optional* `exit_date` / `exit_reason` | small + migration | none |

1–4 are an hour and give you most of what you asked for. 6–7 are the ones that
matter for not losing data. 5 is the biggest visual win.

## 7. Questions

1. **Card list on mobile only, or everywhere?** I would keep the table on
   desktop — nine columns are genuinely useful on a laptop.
2. **`exit_date` / `exit_reason` — worth it?** §3.3.
3. **Keep any hard delete at all,** or is "mark sold/dead" enough forever?
4. **Do the nine phantom cows get marked `sold` or `dead`?** You will know
   which; if some are one and some the other I can prepare the update once you
   say which is which.


---

## 8. What shipped

### The decision that simplified everything

The proposal was to split `status` into `presence` + `condition`. Your answer —
*"as long as they are alive and in farm they are considered active no matter
their status"* — removed the need for the second column entirely. There is no
condition to track, so there is one axis:

```
status:  active | sold | dead        + exit_date, exit_reason, exit_note
```

`dry`, `pregnant` and `sick` stay in the database enum because Postgres cannot
drop an enum value, but nothing writes them any more and the UI never offers
them.

### The future-proofing, which was the real point

`lib/cowPresence.ts` is now the only place that decides whether a cow is on the
farm, and it decides by **exclusion** — she is here unless she has left:

```ts
export const isOnFarm = (status) => !GONE_STATUSES.includes(status);
```

That direction matters. The five hooks each listed the statuses that *counted
as present*, which is why a status nobody had thought about would silently drop
a cow off some screens and not others. Stated as an exclusion, an unrecognised
status leaves her visible. There is a test for exactly that.

All five hooks now resolve to one query. The names are kept so call sites still
read as what they are for:

| Was | Now |
|---|---|
| `useActiveCows` — `['active']` | on the farm |
| `useMilkingCows` — `['active','pregnant','sick']` | on the farm |
| `useVaccinationCows` — `['active','dry','sick']` | on the farm |
| `useAICows`, `useWeightLogCows`, `useGroupAssignmentCows` | on the farm |

`useMilkingCows` excluding `dry` was the one exclusion that was arguably right.
It is folded in because nothing sets `dry`; the comment says that if dry-off is
ever tracked, this is the hook to split back out — and it should read the
breeding board's dry-off window rather than a status someone has to remember.

### The delete button

Gone, and the cascades with it. Verified against the live database — deleting a
cow that has milk history is now refused by the constraint rather than silently
taking 10,189 rows with it:

```
NOTICE: Deleting a cow with milk history is now refused, as intended
```

`ai_records`, `calves`, `milk_production`, `vaccination_records` and
`weight_logs` are `RESTRICT`. `cow_group_assignments` stays `CASCADE`
deliberately — group membership is current arrangement, not history, and an
assignment for a cow who no longer exists means nothing.

The three duplicate FKs (`fk_ai_records_cow_id`, `fk_vaccination_records_cow_id`,
`fk_weight_logs_cow_id`) are dropped, the same cleanup Phase 1 did for
`milk_collections`.

### The screen

- Page `<h2>`, its subtitle and the "Cow Details" card header: gone. The count
  survives as one small line at the foot.
- The button row was `flex-col` on mobile, which is what stretched Filters to
  full width. Now `flex-row justify-end`.
- **Cards below `sm`, table at `sm` and up** — nine columns genuinely fit on a
  laptop, and never fit on a phone.
- Two collapsible groups: **On the farm** (open) and **Left the herd**
  (collapsed, dashed border). Opposite default to the breeding board, on
  purpose: that is a worklist you scan, this is a register you look things up
  in, so the group holding nearly every cow starts open.
- **Search cuts across both groups** — asking after a cow should not require
  knowing first whether she has been sold.
- `CowFilters.tsx`, 125 lines of dead code, deleted.

### One more always-zero metric

`CattleReports` counted `cows.status === 'pregnant'`, which nothing has ever
set — the same silent zero as the "Needs AI" tile. It now counts cows with a
positive PD and no calving recorded, restricted to cows still on the farm.

### Not done

No hard delete of any kind survives, per your answer. If a genuinely mistyped
cow ever needs removing, it is a deliberate database operation, not a button.
