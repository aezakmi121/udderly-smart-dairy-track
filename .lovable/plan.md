## Goal
Replace OneSignal with native Web Push (VAPID) using the `@negrel/webpush` Deno library. Removes third-party SDK fragility (alias drift, opt-in confusion, ad-blocker issues) while keeping the same UX: enable in settings, receive push for alerts/milking reminders/test sends.

## How it will work end-to-end

```text
Browser                       Supabase                      Push Service (FCM/Apple/Mozilla)
-------                       --------                      --------------------------------
1. User clicks "Enable"
2. SW registers /sw.js
3. PushManager.subscribe(VAPID_PUBLIC) ──► returns {endpoint, p256dh, auth}
4. INSERT into push_subscriptions ──────► row stored, linked to user_id
                                          
                                          check-alerts / test send:
                                          5. SELECT subs WHERE user_id IN (...)
                                          6. For each sub: webpush.sendNotification ─► POST to endpoint
                                                                                       │
                                                                          7. Push service delivers ─► browser SW
                                                                                                      │
                                                                                              8. SW 'push' event
                                                                                                 → showNotification()
```

No third-party account. VAPID keys are generated once (offline command) and stored as Supabase secrets. The push endpoint URL is the device's own browser-vendor push service — we just POST to it with a VAPID-signed JWT.

## Files to ADD

| File | Purpose |
|---|---|
| `supabase/migrations/<ts>_push_subscriptions.sql` | Create `push_subscriptions` table (user_id, endpoint UNIQUE, p256dh, auth, user_agent, created_at) with RLS: users manage own rows, service role full access |
| `supabase/functions/send-web-push/index.ts` | Replaces `send-onesignal-notification`. Uses `jsr:@negrel/webpush` to send to one user, list of users, or all subs. Logs to `notification_history`. |
| `src/services/webPushService.ts` | Replaces `oneSignalService.ts`. Exposes `isSupported()`, `getPermission()`, `subscribe(userId)`, `unsubscribe(userId)`, `getSubscription()`. Pure browser API — no SDK to load. |

## Files to MODIFY

| File | Change |
|---|---|
| `public/sw.js` | Add `push` and `notificationclick` handlers (display notification, focus/open app on click). Keep existing PWA cache logic. This becomes the ONLY service worker. |
| `index.html` | Remove `<script src="cdn.onesignal.com/...">`. Update CSP to drop all `onesignal.com` / `*.os.tc` entries. Register `/sw.js` directly (small inline script or in main.tsx). |
| `src/hooks/usePushNotifications.ts` | Rewire to `webPushService`. State becomes simpler: `isEnabled = !!subscription`. No more polling, no alias-vs-id mismatch. Test send still calls edge function. |
| `src/components/notifications/PushNotificationSettings.tsx` | Drop OneSignal-specific labels ("SDK opted-in", subscription ID display). Replace `send-onesignal-notification` invoke with `send-web-push`. |
| `supabase/functions/check-alerts/index.ts` | Replace `fetch onesignal` block with `supabase.functions.invoke('send-web-push', { userIds, title, body, data })`. |
| `supabase/functions/send-milking-reminders/index.ts` | Same swap. |
| `supabase/functions/notify-plant-sale/index.ts` | Same swap. |
| `supabase/config.toml` | Remove `[functions.send-onesignal-notification]`, add `[functions.send-web-push] verify_jwt = false` (called by other functions internally). |

## Files to DELETE

| File | Reason |
|---|---|
| `public/OneSignalSDKWorker.js` | OneSignal SDK service worker — no longer needed. PWA cache logic moves into `public/sw.js`. |
| `src/services/oneSignalService.ts` | Replaced by `webPushService.ts`. |
| `supabase/functions/send-onesignal-notification/` | Replaced by `send-web-push`. Will also call `delete_edge_functions` to remove the deployed function. |

## DB migration

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);
create index on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
-- policies: users select/insert/delete own; admins select all
```

Keep `profiles.onesignal_player_id` column for now (drop in a follow-up after migration confirmed working).

## Secrets needed

User must generate a VAPID key pair once (one terminal command — I'll provide it) and add two secrets:
- `VAPID_PUBLIC_KEY` (also bundled into client via `VITE_VAPID_PUBLIC_KEY` env var)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` = `mailto:your-email@example.com`

I'll ask for these via `add_secret` after you approve.

## Migration UX

Existing users will see "Notifications disabled" once after deploy (their OneSignal subscription doesn't exist in `push_subscriptions`). They click **Enable Notifications** once — browser permission is already granted, so no system prompt — and a fresh native subscription is stored. Same one-tap re-enable you've been doing for OneSignal anyway.

## Why this fixes your current pain
- No SDK loading from CDN → no ad-blocker / CSP / "SDK didn't load in time" errors.
- No alias vs subscription ID concept — there is just ONE `endpoint` column. If it's there, push works; if not, it doesn't.
- Permission, subscription, and DB row are all checked synchronously via `navigator.serviceWorker` + `pushManager.getSubscription()`. No 6-second polling loop.
- "Sent but 0 recipients" becomes impossible — we either have a subscription row to send to, or we don't.

## Cross-browser support (same as OneSignal)
- Android Chrome/Edge/Firefox/Samsung: full support
- Desktop Chrome/Edge/Firefox/Safari 16+: full support
- iOS Safari 16.4+: works only when app is installed to home screen as PWA (this is an Apple restriction, identical to OneSignal)

## Out of scope (can do later)
- Drop `profiles.onesignal_player_id` column
- Remove `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` secrets from Supabase
- Native (Capacitor) push — would need `@capacitor/push-notifications` + FCM, separate change
