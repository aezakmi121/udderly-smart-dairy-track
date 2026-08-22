# Breeding board — categories, and the data behind them

Status: **built.** Section 10 records what shipped and the decisions taken.

---

## 1. The problem you spotted

"AI pending" has cow 5 and 12 — confirmed **not pregnant** — sitting next to 32
and 35, which **recently calved**. Two completely different situations under one
heading, and the card shows a service date for all four, which is the wrong fact
for half of them.

That is a symptom of something bigger. The board's groups are a **list of
alerts**, not a **map of the herd**. A cow only appears if she trips one of seven
conditions. So:

- A cow served 10 days ago → belongs to no group. Invisible.
- A cow confirmed pregnant, four months out → belongs to no group. Invisible.
- A cow that calved last week → belongs to no group. Invisible.

You cannot tell whether the board is complete, because there is no reason the
counts should add up to anything. **If a cow is quietly missing, nothing tells
you.**

## 2. The principle worth adopting

**Make the categories a partition of the herd, not a grab-bag of alerts.**

Every active cow is in exactly one *stage* of her reproductive cycle at any
moment. If every stage has a heading, then:

```
sum of all heading counts  ==  active herd size
```

That equality is a self-check. If it fails, a cow has fallen through and you can
see it. It also means the board answers "where does the herd stand" and not just
"what is on fire" — which is what "the full picture" means.

Alerts then become **badges within a stage**, not stages of their own.

## 3. The cycle

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │
   [calved] ──► fresh ──► ready to serve ──► served ──► awaiting PD
                                  ▲                          │
                                  │                    ┌─────┴─────┐
                                  │              PD negative   PD positive
                                  │                    │           │
                                  └────────────────────┘           ▼
                                                              pregnant
                                                                   │
                                                    ┌──────────────┤
                                              dry off / move    due to calve
                                                    │              │
                                                    └──────► [calved]
```

## 4. Proposed categories

Eleven stages, in the order the board would render them. **Bold** = new.

### Needs doing now

| # | Heading | Who is in it | The fact on the card | Action button |
|---|---|---|---|---|
| 1 | Overdue to calve | Pregnant, expected date passed, no calving recorded | days overdue, expected date | Record calving |
| 2 | Due to calve | Pregnant, ≤ 21 days out | days to go, expected date | Record calving |
| 3 | Move to milking | Pregnant, ≤ 30 days out, not yet moved | days to go | Moved |
| 4 | PD overdue | Served > 60 days, unchecked | days since service | Record PD |
| 5 | PD due | Served 35–60 days, unchecked | days since service | Record PD |
| 6 | **Not pregnant — reserve** | PD negative/inconclusive, or service failed | **days open**, PD date, services this lactation | Add AI record |
| 7 | **Ready to serve** | Calved > 60 days ago, never served since | **days since calving (= days open)** | Add AI record |
| 8 | Watch for heat | Served 18–24 days ago | days since service | Record PD |

### Just so you know

| # | Heading | Who is in it | The fact on the card |
|---|---|---|---|
| 9 | **Recently calved** | Calved ≤ 60 days ago (the waiting period) | **days since calving**, lactation #, calf |
| 10 | **Pregnant — on track** | Confirmed pregnant, > 30 days out | days to calving, due date |
| 11 | **Served — waiting** | Served < 18 days, too early for anything | days since service |

### Problems

| # | Heading | Who is in it |
|---|---|---|
| 12 | Check the record | Impossible service→calving gap (already built, muted) |

**Cow 5 and 12** land in **#6 Not pregnant — reserve**. **Cow 32 and 35** land in
**#7 Ready to serve** or **#9 Recently calved** depending on how long ago they
calved. Different headings, different dates, different urgency — which is what
you were asking for.

Groups 9–11 are the ones that make the herd add up. They are pure information,
so they render muted, below a divider, collapsed, with no action buttons.

## 5. Badges, not headings

Three things matter but do **not** deserve their own heading, because a cow can
be in one *and* be somewhere in the cycle. They render as a badge on her card,
and as a filter chip at the top of the board:

| Badge | When | Why it matters |
|---|---|---|
| **Repeat breeder** | 3+ services since last calving, still not pregnant | She may need a vet, not another straw. |
| **Long open** | days open > 120 and not pregnant | The single most expensive number on a dairy. |
| **Flagged to move** | `needs_milking_move` set by hand | Already exists. |

Making these badges rather than headings is deliberate — a repeat breeder is
still, right now, either *PD due* or *not pregnant*, and you want to act on the
stage. The badge tells you to act differently.

## 6. The information problem

> "we dont have relevant information other than service date like for delivered
> cow when did it last deliver"

Two separate causes.

### 6.1 The card has a fallback that shows the wrong fact

`CowActionRow` picks its headline from a `switch (group)`. `needs_service` is not
in the switch, so it falls to `default:` — which prints `service #N · date`. That
is why a recently-calved cow shows you a service date.

**Fix:** every group declares its own headline and detail. No `default` fallback
that quietly prints the wrong thing. Calving-derived groups show the calving
date; service-derived groups show the service date.

### 6.2 The board only ever looks at ONE record per cow

`latestRecord()` reduces each cow to her single most recent `ai_record`. That is
right for deciding her *stage*, but it throws away everything needed for
context — and critically, **for a cow served after calving, the calving is on the
previous record**, so "when did she last calve" is simply not in scope.

**Fix:** compute a small per-cow lactation summary from *all* her records, not
just the latest:

```ts
interface CowCycle {
  lastCalvingDate: string | null;   // max(actual_delivery_date) across records
  daysInMilk: number | null;        // today − lastCalvingDate
  daysOpen: number | null;          // today − lastCalvingDate, while not pregnant
  servicesThisLactation: number;    // records with ai_date > lastCalvingDate
  lactationNumber: number | null;   // cows.lactation_number
}
```

`daysOpen` and `servicesThisLactation` are the two numbers a breeding board
exists for, and neither is currently computed anywhere. They also give the
**Repeat breeder** and **Long open** badges for free.

### 6.3 A bug in the way: `cows.last_calving_date` goes stale

There are **two calving paths** and they behave differently:

| Path | Writes | Updates `cows.last_calving_date`? |
|---|---|---|
| `DeliveryWithCalfModal` | `ai_records.actual_delivery_date` **+ a `calves` row** | ✅ — trigger fires on `calves` |
| `QuickCalvingSheet` (the board's "Record calving") | `ai_records.actual_delivery_date` only | ❌ — no calf row, no trigger |

`update_cow_last_calving_date()` is triggered on `calves`, not on `ai_records`.
So every calving recorded from the board leaves `cows.last_calving_date` at its
old value — or null.

Two consequences: anything reading `cows.last_calving_date` is wrong (the
grouping recommendations and the days-in-milk figure in reports both do), and we
must **not** build the new categories on that column.

**Fix, both halves:**
- Derive `lastCalvingDate` on the board from `ai_records`, which is always correct.
- Add a trigger on `ai_records` so `cows.last_calving_date` is maintained from
  `actual_delivery_date` too, and backfill it. That fixes the reports without
  touching them.

## 7. How categories change — the answer is "by themselves"

Nothing is stored, nothing is moved, there is no job and no cron.
`cowActions()` recomputes every cow's groups from her records on every render, so
a category change is a consequence of a record changing or of a day passing:

| You do this | She moves |
|---|---|
| Record PD negative on cow 5 | *PD due* → **Not pregnant** — instantly |
| Record PD positive | *PD due* → **Pregnant — on track** |
| Record a calving | *Due to calve* → **Recently calved** |
| Add an AI record | *Not pregnant* / *Ready to serve* → **Served — waiting** |
| **Nothing — 60 days pass** | **Recently calved** → **Ready to serve**, on its own |
| **Nothing — she nears her due date** | *Pregnant — on track* → *Move to milking* → *Due to calve* → *Overdue* |
| Sell her / mark inactive | Off the board entirely (`cows.status`) |

The three rows that need no input at all are the point: the board ages forward
without anyone maintaining it.

The one thing that is stored is `moved_to_milking` — because "have you physically
walked her to the other shed" is not derivable from a date. That stays a button.

## 8. What this costs

| Piece | Where | Size |
|---|---|---|
| Split `needs_service` into `not_pregnant` + `ready_to_serve` | `breedingActions.ts` | small |
| Add `recently_calved`, `pregnant_on_track`, `served_waiting` | `breedingActions.ts` | small |
| `CowCycle` summary from all records per cow | `useHerdActionGroups.ts` | medium |
| Per-group headline/detail, no `default` fallback | `CowActionRow.tsx` | medium |
| Repeat-breeder / long-open badges | `CowActionRow.tsx` + settings | small |
| Two-tier board (action groups, then a muted "just so you know" tier) | `CowSummaryDashboard.tsx` | small |
| Herd-total reconciliation line ("41 cows · all accounted for") | `CowSummaryDashboard.tsx` | small |
| `ai_records` → `cows.last_calving_date` trigger + backfill | migration | small |
| New settings: `repeatBreederServices` (3), `longOpenDays` (120) | `breedingSettings.ts` + migration | small |

No new tables. Two migrations — one for the trigger and backfill, one for the
settings keys.

## 9. Open questions for you

1. **Eleven headings, or fewer?** The full partition is what makes the herd add
   up. If it feels long even collapsed, the alternative is to keep the
   information tier as a single **"Everything else (23)"** heading that expands
   into sub-groups.
2. **Waiting period of 60 days** — that is `serviceDueAfterCalvingDays`, already
   configurable. Is 60 right for this herd, and is it the same number that should
   separate "Recently calved" from "Ready to serve"? (Using one number for both
   is what makes them a clean partition.)
3. **Repeat breeder at 3 services** — or 4?
4. **Long open at 120 days** — or 150?
5. **Do you want "Served — waiting" at all?** It is the least interesting stage.
   Dropping it breaks the add-up property, which is the one reason to keep it.


---

## 10. What shipped

### Decisions taken

| Question | Answer | Why |
|---|---|---|
| Eleven headings, or fold? | **Fold.** Eight action headings, then one muted "Everything else". | The partition survives; the morning board stays eight lines. Position is read weekly, not daily. |
| Waiting period | **60 days, one number for both.** | Standard for crossbreds, already `serviceDueAfterCalvingDays`. One number is what makes "recently calved" and "ready to serve" a clean split rather than a gap. |
| Repeat breeder | **3 services.** | Standard definition. At four you have burned an extra oestrous cycle before anyone asks. |
| Long open | **120 days.** | ~13-month calving interval is ~90 days open. 120 is a month past target and still recoverable; 150 is not. |
| Keep "Served — waiting"? | **Yes, inside the fold.** | Least interesting stage, and the reason the numbers add up. Costs nothing once folded. |

### The stages, as built

`cowStage()` returns **exactly one** stage per cow, first match wins down
`ACTION_ORDER` then `INFO_ORDER`. `cowBadges()` returns the overlays. A cow ten
days from calving who has not been moved is listed under *Due to calve* with a
**Needs moving** badge — not twice under two headings.

Action tier: overdue to calve · due to calve · move to milking · PD overdue ·
PD due · not pregnant · ready to serve · watch for heat.

Fold ("Everything else"): recently calved · pregnant — on track · served — waiting.

Below that: **Never served**, then **Check the record**, then the reconciliation
line.

### Verified against the real herd

Running the stage logic over the live database placed the cows exactly where
this document predicted:

```
pregnant_on_track  7   15, 25, 4, 41, 45, 6, 9
recently_calved    7   1, 16, 2, 21, 24, 33, 46
ready_to_serve     4   26, 27, 32, 35
not_pregnant       2   12, 5
heat_watch         1   23
served_waiting     1   39
```

Cows **5 and 12** — the confirmed-empty ones — separate cleanly from **32 and
35**, which had recently calved. Those four shared a heading before.

### The hole the partition found

The counts above total **22 cows. The herd has 35 active.**

Thirteen — 10, 19, 22, 28, 34, 40, 50, 51, 52, 53, 54, 55, 56 — have **no AI
record at all**, so the board, which is built from `ai_records`, could not see
them. Not "in the wrong heading": absent. This is precisely what the add-up
property was meant to catch, and it caught it on the first run.

They now appear as a **Never served** section, and the reconciliation line reads
against the active herd rather than against whatever the board happened to find:

```
35 of 35 active cows accounted for · 13 never served
```

Whether a never-served cow is a heifer coming up to breeding age or a cow nobody
entered cannot be told without an age rule, so the section is informational
rather than an action heading. **Open question:** add a breeding-age setting
(~13–15 months off `cows.date_of_birth`) and promote the ones past it into the
action tier?

### The `last_calving_date` fix

A trigger on `ai_records` now maintains `cows.last_calving_date` alongside the
existing one on `calves`, taking the later of the two so neither path can move
the date backwards. The board's own "Record calving" writes no calf row, so the
old trigger never fired for it.

The backfill turned out to be a **no-op** — all 38 cows were already correct, so
no board-recorded calving has hit this yet. The trigger stops it happening.

### Also fixed

`AIRecord.pd_result` was typed `'positive' | 'negative'`, missing the
`'inconclusive'` the database enum has and the app already writes. That is why
every call site needed a cast. Widened, and the casts came out.
