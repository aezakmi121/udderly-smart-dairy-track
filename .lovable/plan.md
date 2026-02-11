

# Complete Overhaul: Notifications, API, and Database Access

This plan covers everything you asked about. Let me answer your questions first, then lay out the implementation.

---

## Your Questions Answered

### Where is your database?
Your database is hosted on **Supabase** (a cloud service). Your project ID is `gjimccbtclynetngfrpw`. You can access it at:
- **Dashboard**: https://supabase.com/dashboard/project/gjimccbtclynetngfrpw
- **Table Editor**: Click "Table Editor" in the left sidebar to view/edit data
- **SQL Editor**: Click "SQL Editor" to run queries directly

### Are you using a GitHub repo?
Your code lives in Lovable. You can export it to GitHub via **Settings > GitHub** in Lovable. The database is separate on Supabase -- code changes don't affect the database directly unless you run migrations.

### How to update/change the database?
Three ways:
1. **Supabase Dashboard** (easiest): Go to Table Editor at the link above and edit rows directly
2. **SQL Editor**: Run SQL queries at https://supabase.com/dashboard/project/gjimccbtclynetngfrpw/sql/new
3. **Through Lovable**: I can create database migrations when you ask me to add/change tables

### Can you make an API for your webapp?
Yes! We can create **Supabase Edge Functions** that act as your API. Other webapps can call these endpoints to get your expenses, milk data, etc. This is exactly how you'd aggregate data from multiple sources.

---

## Implementation Plan

### Part 1: Remove Firebase/FCM (Cleanup)

Files to **delete**:
- `src/config/firebase.ts`
- `src/services/firebaseMessaging.ts`
- `src/services/notificationScheduler.ts`
- `src/services/sessionNotificationService.ts`
- `public/firebase-messaging-sw.js`
- `src/components/notifications/FirebaseDebugPanel.tsx`
- `src/components/settings/ExpoPushTest.tsx`

Files to **clean up** (remove Firebase references):
- `src/hooks/usePushNotifications.ts` -- rewrite to use OneSignal
- `src/components/settings/SettingsManagement.tsx` -- remove FCMPushTest section
- `src/components/notifications/PushNotificationSettings.tsx` -- rewrite for OneSignal

Edge functions to **delete**:
- `supabase/functions/send-push-notification/` (FCM-based)
- `supabase/functions/expo-push/` (Expo-based)
- `supabase/functions/schedule-milking-notifications/`

Remove `firebase` package from dependencies.

### Part 2: OneSignal Integration

OneSignal is a free push notification service that works on web, Android, and iOS without the Firebase complexity.

**Setup steps (you'll need to do):**
1. Create a free account at https://onesignal.com
2. Create an app, get your **App ID** (public) and **REST API Key** (secret)

**What I'll build:**

1. **`src/services/oneSignalService.ts`** -- OneSignal Web SDK integration
   - Initialize OneSignal with your App ID
   - Register user for push notifications
   - Tag users with their role (admin/worker) for targeted notifications
   - Subscribe/unsubscribe

2. **`supabase/functions/send-onesignal-notification/index.ts`** -- Edge function for sending push notifications server-side
   - Uses OneSignal REST API with your API key
   - Sends to specific users or segments
   - Supports scheduled notifications

3. **`src/hooks/usePushNotifications.ts`** -- Rewrite to use OneSignal
   - Simple enable/disable toggle
   - No complex token management (OneSignal handles it)

### Part 3: Revamped Notification Settings UI

Replace the current "Notifications & Alerts" section in Settings with a comprehensive panel:

**`src/components/settings/NotificationSettings.tsx`** -- New unified settings component:
- **Push Notification Toggle**: Enable/disable OneSignal push notifications
- **Alert Configuration**: Configurable days for each alert type:
  - PD check alert (default: 60 days after AI)
  - Expected delivery alert (default: 283 days after AI)
  - Vaccination due reminder (days before due date)
  - Low stock threshold alerts
  - Milking session reminders
- **Notification Categories Toggle**: Enable/disable by category
  - Reminders (PD, vaccination, delivery, AI)
  - Alerts (low stock, session start/end)
  - Updates (collection summaries)
- **Test Notification Button**: Send a test push via OneSignal

### Part 4: Server-Side Notification Checker (Cron)

Create **`supabase/functions/check-alerts/index.ts`** -- A cron-triggered edge function that:
1. Checks all alert conditions daily:
   - PD checks due/overdue
   - Expected deliveries approaching
   - Vaccinations due
   - Low feed stock
   - AI scheduled today
2. Sends push notifications via OneSignal for any triggered alerts
3. Logs sent notifications to `notification_history` table

Set up a **pg_cron job** to run this daily (e.g., 6:00 AM).

### Part 5: Public API Edge Functions

Create API endpoints other webapps can call:

1. **`supabase/functions/api/index.ts`** -- Main API endpoint with routes:
   - `GET /api?type=expenses&from=2024-01-01&to=2024-12-31` -- Get expenses
   - `GET /api?type=milk-production&from=...&to=...` -- Get milk production data
   - `GET /api?type=revenue&from=...&to=...` -- Get revenue (plant sales, store sales, collection center sales)
   - `GET /api?type=summary` -- Get a dashboard summary (total expenses, revenue, milk produced)

   Authentication: API key-based (you'll generate an API key stored as a Supabase secret)

---

## Technical Details

### OneSignal Web SDK Setup
- OneSignal provides a CDN script; we'll load it in `index.html`
- App ID (public key) goes in the codebase
- REST API Key (secret) goes in Supabase secrets for the edge function

### Database Changes
- Add `onesignal_player_id` column to `profiles` table (replaces `fcm_token`)
- No other schema changes needed -- existing `notification_history`, `notification_settings`, and `app_settings` tables are reused

### Cron Job for Daily Alerts
```sql
-- Runs check-alerts edge function daily at 6:00 AM
SELECT cron.schedule(
  'daily-alert-check',
  '0 6 * * *',
  $$ SELECT net.http_post(...) $$
);
```

### API Authentication
- Generate a random API key, store as Supabase secret `PUBLIC_API_KEY`
- Other webapps include this key in their request header: `Authorization: Bearer <api-key>`
- The edge function validates the key before returning data

### Files Summary

| Action | File |
|--------|------|
| Delete | `src/config/firebase.ts` |
| Delete | `src/services/firebaseMessaging.ts` |
| Delete | `src/services/notificationScheduler.ts` |
| Delete | `src/services/sessionNotificationService.ts` |
| Delete | `public/firebase-messaging-sw.js` |
| Delete | `src/components/settings/ExpoPushTest.tsx` |
| Delete | `src/components/notifications/FirebaseDebugPanel.tsx` |
| Delete | Edge functions: `send-push-notification`, `expo-push`, `schedule-milking-notifications` |
| Create | `src/services/oneSignalService.ts` |
| Create | `supabase/functions/send-onesignal-notification/index.ts` |
| Create | `supabase/functions/check-alerts/index.ts` |
| Create | `supabase/functions/api/index.ts` |
| Create | `src/components/settings/NotificationSettings.tsx` |
| Modify | `src/hooks/usePushNotifications.ts` (rewrite for OneSignal) |
| Modify | `src/components/settings/SettingsManagement.tsx` (new notification section) |
| Modify | `index.html` (OneSignal SDK script) |
| Modify | `supabase/config.toml` (new edge function configs) |
| Migration | Add `onesignal_player_id` to `profiles`, enable `pg_cron` and `pg_net` extensions |

