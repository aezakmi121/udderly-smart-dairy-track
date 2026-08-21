# AI tracking — what it touches, and the screen cleanup

Status: **built**. Part 1 is what the system is wired to; Part 2 is what was
done to the screen.

---

## Part 1 — What AI tracking is connected to

`ai_records` is the source of truth for the whole breeding side of the farm. It
is read by more of the app than it looks like from the AI Tracking page.

### 1.1 The data

| Table / key | Relationship |
|---|---|
| `ai_records` | The record: `ai_date`, `service_number`, `ai_status`, `pd_done`, `pd_result`, `pd_date`, `expected_delivery_date`, `actual_delivery_date`, `is_successful`, `semen_batch`, `technician_name`. |
| `cows` | FK `ai_records_cow_id_fkey`. The board also **writes** `needs_milking_move`, `needs_milking_move_at`, `moved_to_milking`, `moved_to_milking_at`, and filters on `cows.status`. |
| `calves` | A calving through `DeliveryWithCalfModal` creates the calf row (`useCalves.ts`). |
| `app_settings` | `breeding_settings` (gestation, heat window, PD window, calving/dry-off windows) and `delivery_expected_days` — read when a record is created to compute `expected_delivery_date`. |

One DB constraint worth knowing: `ai_records_delivery_implies_pregnancy` —
a row with `actual_delivery_date` must have `pd_done = true` and
`pd_result = 'positive'`. Any write path that records a calving must set the PD
alongside it or the insert is refused.

### 1.2 What reads it

| Consumer | What it does |
|---|---|
| `CowSummaryDashboard` | The board. Groups the herd via `groupHerd()` / `breedingActions.ts`. |
| `AITrackingTable` | The flat All Records list. |
| **Dashboard** → `CowActionSummaryCard` → `useCowActionSummary` | The four big tiles (PD Due, Close to Delivery, Overdue Delivery, Needs AI). **Its own queries — not `groupHerd()`.** Deep-links into `/ai-tracking?filter=…`. |
| `useEnhancedNotifications` | In-app notification bell — PD due and delivery reminders. |
| `check-alerts` edge function | Server-side push/WhatsApp alerts on the same two events. |
| `useCowMilkingStatus` | The dry-group → milking-group move. |
| `CowDetailsModal` | Breeding history on the cow. |
| `IndividualCowPerformance` (reports) | Per-cow breeding performance. |

### 1.3 The logic layer

- `lib/aiCycle.ts` — `cycleState()` returns `awaiting_pd` / `pregnant` / `open` /
  `delivered` / `failed`; `canServeAgain()` and `latestRecord()`.
- `lib/breedingActions.ts` — `cowActions()` buckets a cow into action groups;
  `ACTION_ORDER`, `ACTION_LABEL`, `ACTION_HELP`, `groupHerd()`.
- `lib/breedingSettings.ts` — the numbers, with defaults.
- `lib/pdUtils.ts`, `lib/cowSorting.ts` — badges and sort order.

### 1.4 Bugs found while tracing it

These matter because the counts are the headline of the screen.

1. **"Needs AI" on the dashboard is always 0.** `useCowActionSummary` runs
   `.from('cows').select(…).eq('is_active', true)` — **`cows` has no `is_active`
   column**, it has `status`. The query errors, `Promise.allSettled` swallows it,
   `totalActive` falls back to `0`, and `needsAI = max(0, 0 − pregnant) = 0`. The
   tile has never shown a real number.
2. **The dashboard and the board disagree on the same herd.** The card hardcodes
   PD due at 60 days and close-to-delivery at 60 days ahead. The board uses
   `breeding_settings`: PD due from 35, overdue after 60, due to calve within 21.
   Two screens, two answers.
3. **The card counts records, not cows.** No `latestRecord()` — a cow with two
   unchecked services is counted twice.
4. **The card ignores `breeding_settings` entirely.** Changing a setting moves the
   board and leaves the dashboard where it was.
5. **Three of the four deep links do nothing.** `AITrackingManagement` maps only
   `?filter=pd-due`; `close-delivery`, `overdue-delivery` and `needs-ai` land on
   an unfiltered page (there is a comment in the code acknowledging this).
6. **`bg-white` is hardcoded** on both tab panels — the panels stay white in dark
   mode.
7. **A cow ready to be served appears nowhere.** `cowActions()` returns no group
   for `open` (PD negative) or `delivered`. So a cow whose PD came back negative,
   or who calved four months ago and was never re-served, is invisible on the
   board. This is the "AI pending" gap.

---

## Part 2 — The screen cleanup

The groups you described already exist in `breedingActions.ts` — `pd_overdue`,
`pd_due`, `due_to_calve`, `move_to_milking`, `overdue_delivery`, `heat_watch`.
The logic is fine. It is the presentation that is buried, and one group is
missing.

### 2.1 Strip the chrome

`AITrackingManagement.tsx`:

- **Remove** the `<h1>AI Tracking</h1>` and "Track artificial insemination
  records and pregnancy detection." The nav already says where you are.
- **Remove** the nested white card headers inside both tabs — "Cow Summary
  Dashboard" with "One card per cow with delivery tracking and milking group
  management", and the "AI Records (n)" header. That is a heading inside a tab
  inside a page, all saying the same thing. The tab label is enough; move the
  record count onto the tab itself: `All Records (128)`.
- **Replace** `bg-white` with `bg-card` so dark mode works.

What is left at the top: the two tabs, and the Filters / Add AI Record buttons.

### 2.2 Collapsible sections

Each action group becomes a `<Collapsible>` (`components/ui/collapsible.tsx` is
already there) with the heading row as the trigger:

```
▸  PD overdue                              3
▸  Due to calve                            5
▸  Move to milking                         1
▸  PD due                                  7
▸  Watch for heat                          4
▸  AI pending                              6
```

- **Collapsed by default**, so the board opens as a six-line summary of the
  morning. Open one and the cow cards render inside, exactly as they do now
  (`CowActionRow` unchanged).
- Open/closed state remembered per group in `localStorage`, so if you always work
  PD overdue first it stays open for you.
- The `ACTION_HELP` line moves **inside** the section rather than sitting under
  every heading — six explanatory paragraphs on a board you read daily is noise
  after the first week.
- Empty groups stay hidden, as now.
- The "Nothing needs attention today" card stays — it is the best thing the
  screen can tell you.

### 2.3 Hide "Check the record"

Drop `check_record` from `ACTION_ORDER` so it is off the board.

It is a data-integrity signal, not a job for the shed — it fires when the gap
between service and calving is biologically impossible, meaning a calving landed
on the wrong record or a date is wrong. Rather than delete the detection,
**keep it and surface it as one muted line at the foot of the board**:

```
2 records have an impossible service→calving gap — review
```

**As built:** it renders below the action groups as a muted collapsed section
carrying its own count, so it costs one greyed line when there is something in it
and nothing at all when there is not. `cowActions()` still detects it, and
`CHECK_RECORD_GROUP` keeps it addressable. Removing the section entirely is a
one-line change if you would rather it vanish.

### 2.4 Add the missing "AI pending" group

The real gap from §1.4.7. A new `needs_service` group in `breedingActions.ts`:

A cow belongs in it when her latest record is
- `open` — PD came back negative or inconclusive, she can be served now; or
- `failed` — the service did not take; or
- `delivered` more than `serviceDueAfterCalvingDays` ago (new setting, default
  **60** — the voluntary waiting period) with no newer service.

```ts
needs_service: 'AI pending',
// help: 'Ready to be served — nothing is booked for her.'
```

Ordered last among the urgent groups, before `heat_watch`. This is also what
makes the dashboard's "Needs AI" tile mean something instead of being a
guess at `active cows − pregnant cows`.

### 2.5 Make the dashboard tile agree with the board

Point `CowActionSummaryCard` at `groupHerd()` instead of its own queries. One
source of truth, and §1.4 items 1–4 all disappear at once:

**As built:** the query and the grouping moved into a shared
`useHerdActionGroups` hook. `useCowActionSummary` (the tile counts) and
`useCowActionDetails` (the list behind a tile) were both rewritten on top of it,
so the count and the list it opens cannot disagree — the details hook had the
same hardcoded 60-day windows and the same non-existent `cows.is_active` filter.

- `useCowActionSummary`'s bespoke SQL is deleted.
- Counts become cows, not records, because `groupHerd()` works off
  `latestRecord()`.
- `breeding_settings` applies to both screens.
- The broken `is_active` query goes with it.

Then wire the four deep links properly — `?filter=pd-due` should open the board
with **that section expanded and the rest collapsed**, which the collapsible work
in §2.2 makes trivial. All four tiles, not just one.

Tile → section mapping:

| Tile | Section |
|---|---|
| PD Due | `pd_due` + `pd_overdue` |
| Close to Delivery | `due_to_calve` |
| Overdue Delivery | `overdue_delivery` |
| Needs AI | `needs_service` (new) |

### 2.6 "Due to calve" stays at three weeks

Raising `dueToCalveWithinDays` from 21 to 30 was tried and reverted. The move to
milking happens 30 days out, so a 30-day calving window makes the two headings
the same list of cows under different names — which is what splitting them was
for in the first place, and which a test and a Settings warning both already
guard against. Three weeks is already less than a month, so the heading reads
the way you described it without recreating the collision. It remains
configurable in Settings for anyone who wants it wider.

### 2.7 Build order

| # | Change | Files |
|---|---|---|
| 1 | Strip headings, fix `bg-white` | `AITrackingManagement.tsx` |
| 2 | Collapsible sections + localStorage | `CowSummaryDashboard.tsx` |
| 3 | Drop `check_record` from the board, add the footer line | `breedingActions.ts`, `CowSummaryDashboard.tsx` |
| 4 | Add `needs_service` group + `serviceDueAfterCalvingDays` | `breedingActions.ts`, `breedingSettings.ts` |
| 5 | Dashboard card reads `groupHerd()`; delete `useCowActionSummary` | `CowActionSummaryCard.tsx`, `useCowActionSummary.ts` |
| 6 | Deep links expand the right section | `AITrackingManagement.tsx`, `CowSummaryDashboard.tsx` |
| 7 | `dueToCalveWithinDays` 21 → 30 | `breedingSettings.ts` |

1–3 are the visual cleanup you asked for and are independent of the rest. 4–5 fix
the counts. 6–7 are polish.

### 2.8 Open question

**Should `heat_watch` stay on the board?** It fires for every cow 18–24 days past
service, which on a herd this size is a standing list that never empties.
Collapsed by default it costs one line, so it is probably fine — but if it is
noise in practice, it is the next thing to fold away.
