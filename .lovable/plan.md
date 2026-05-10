# Notification System: End-to-End Audit & Fix Plan

## What I found (evidence from your live data)

### 🔴 Bug 1 — Triple-fire confirmed (root cause of "3 continuous notifications")
`notification_history` shows every milking session firing **3 times in a row**, exactly 5 minutes apart:
```
23:25, 23:30, 23:35 UTC  → 04:55, 05:00, 05:05 IST  (morning)
11:25, 11:30, 11:35 UTC  → 16:55, 17:00, 17:05 IST  (evening)
```
**Why:** `pg_cron` runs `send-milking-reminders` every 5 minutes. Inside the function, `isWithinWindow(current, target, windowMinutes=5)` matches when `|diff| ≤ 5`, so the 04:55, 05:00 and 05:05 ticks all pass. There is also no `tag` on the push payload and no DB-level "already-sent-today" guard, so nothing dedupes.

### 🔴 Bug 2 — Only **1 device** is registered in the entire system
`push_subscriptions` table: **1 row, 1 user**. So if you've installed the PWA on a phone + a laptop expecting both to ring, only one ever subscribed successfully. The hook `usePushNotifications.checkStatus` does silent re-registration only when the browser already has a `PushSubscription` — fresh devices need an explicit Enable click that never happened (or failed silently).

### 🔴 Bug 3 — "Sometimes I get nothing, then a flood when I open the app"
Classic symptom of:
- **PushSubscription expiring** (Chrome rotates after ~30 days of inactivity) — we don't detect/refresh on app open.
- **Android Doze / iOS low-power** suppressing push when SW is asleep; opening the app re-syncs.
- We **don't prune `410 Gone` subscriptions** until next send, and we don't surface "your device hasn't received pushes in N days" to the UI.

### 🟡 Bug 4 — No diagnostics / observability
- `notification_history` only logs server-initiated pushes. We don't log: SW push received, notification displayed, notification clicked, subscription expired, permission revoked.
- No admin "notification health" panel to see per-device delivery.
- VAPID keys exist but no startup check the SW is actually using `/sw.js` (the old `OneSignalSDKWorker.js` stub still loads).

### 🟢 What is working
- VAPID + `send-web-push` end-to-end pipeline (200s in logs, 1 device receives).
- `check-alerts` daily 06:00 cron — runs cleanly, dedupes by alert type.
- `notification_settings` per-category toggles, quiet hours schema.
- Native Web Push migration off OneSignal completed.

---

## Plan

### Phase A — Stop the triple-fire (highest priority, ~10 min change)
1. In `send-milking-reminders/index.ts`:
   - Tighten window from `±5` to `±2` minutes so only ONE 5-min cron tick can match.
   - Add `tag: 'milking_morning_<YYYY-MM-DD>'` / `milking_evening_<date>` on the push payload + a DB guard: skip if `notification_history` already has a `sent` row with that tag today.
2. Same idempotency tag pattern for `check-alerts` daily run (already once-a-day but harden it).

### Phase B — Multi-device registration & subscription health
3. On every app load (in `usePushNotifications`), if permission is `granted` but DB has no row matching the current endpoint, **auto re-register silently**. Log result.
4. Add a daily edge function `prune-stale-subscriptions` that pings each subscription with a silent payload and removes any that 404/410. Already partially done inside `send-web-push` — extract to scheduled job so dead devices get cleared even on quiet days.
5. In `PushNotificationSettings.tsx`, show a **device list**: endpoint suffix, user-agent, last successful delivery, "Send test to this device" button.

### Phase C — Diagnostics & full observability
6. New `notification_events` table (separate from `notification_history`):
   ```
   id, subscription_id, user_id, event_type, payload_tag, status,
   error_code, source_function, created_at
   ```
   `event_type` ∈ `dispatch_attempt | dispatch_ok | dispatch_fail | sw_received | sw_displayed | sw_clicked | permission_revoked | subscription_expired`.
7. Patch `public/sw.js` to POST `sw_received` / `sw_displayed` / `sw_clicked` back to a new lightweight `log-notification-event` edge function (with the subscription endpoint hash so we can correlate).
8. Patch `send-web-push` to write `dispatch_attempt` + `dispatch_ok/fail` rows with the FCM/APNs response code.
9. Build `NotificationDiagnosticsPanel` (admin-only, in Settings):
   - Last 50 dispatches × per device, with deliver/display/click status.
   - "Triple-fire detector" — flags any tag sent >1× per day.
   - Per-cron-job last-run + outcome.
   - Big "Send test to all my devices" button.

### Phase D — Cleanup
10. Delete `public/OneSignalSDKWorker.js` stub (it still registers a SW that immediately unregisters — confusing and noisy).
11. Sanity-check all cron jobs and document them in `db/seed.sql`-style migration so they're reproducible.

---

## Technical details

**Files to edit**
- `supabase/functions/send-milking-reminders/index.ts` — tighter window + idempotency
- `supabase/functions/send-web-push/index.ts` — write `notification_events` rows
- `supabase/functions/log-notification-event/index.ts` — NEW, public, accepts SW callbacks
- `supabase/functions/prune-stale-subscriptions/index.ts` — NEW, scheduled daily
- `public/sw.js` — beacon `pushed`/`shown`/`clicked` events
- `src/hooks/usePushNotifications.ts` — auto re-register on app load when DB row missing
- `src/components/notifications/PushNotificationSettings.tsx` — device list UI
- `src/components/settings/NotificationDiagnosticsPanel.tsx` — NEW admin panel
- delete `public/OneSignalSDKWorker.js`

**Migration**
```sql
create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subscription_endpoint_hash text,
  event_type text not null,
  payload_tag text,
  status text,
  error_code int,
  source text,
  meta jsonb,
  created_at timestamptz default now()
);
create index on public.notification_events (created_at desc);
create index on public.notification_events (payload_tag, created_at desc);
-- RLS: admins read all; service role writes
```

**Cron changes**
- Keep `milking-reminders` every 5 min (idempotency in code handles dedupe).
- Add `prune-stale-subscriptions` daily 03:00 IST.

---

## Question before I start

**The triple-fire is the biggest visible bug** — should I do Phase A as a quick standalone fix first (so you stop getting spammed at 5am tomorrow) and then proceed with B–D, or implement everything in one pass?