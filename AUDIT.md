# Full Repo Audit — udderly-smart-dairy-track

**Date:** 2026-05-26
**Branch audited:** `claude/clever-ride-nEf9r` (HEAD)
**Scope:** Full webapp — Bluetooth printing, deployment, Supabase backend, auth, frontend quality, dependencies, PWA/mobile, observability
**Output:** Findings only. No code changes in this pass.

---

## Direct answers to the two user questions

### Deployment platform
**Vercel**, confirmed.
- `vercel.json` present (SPA rewrites only).
- `README.md:5,97` explicitly state Vercel and the prod URL `https://udderly-smart-dairy-track.vercel.app`.
- No Lovable artifacts anywhere in the repo (no `lovable-tagger`, no `lovable.dev` references, no gpt-engineer files).

### Bluetooth printing
**Web Bluetooth API**, ESC/POS, implemented in `src/services/thermalPrinting.ts`. Triggered from `src/components/settings/PrinterSettings.tsx` (scan/connect/test) and `src/components/milk-collection/PrintSlipDialog.tsx` (per-record print). There is **no native fallback wired up** — `capacitor-thermal-printer@^0.2.5` is in `package.json` but `grep -r capacitor-thermal-printer src/` returns zero, and the `android/` folder is absent (Capacitor never `cap add android`-ed). So mobile (Capacitor WebView) builds have **no working print path** — see finding **H-08**.

---

## Severity legend & how to read findings

`Severity`: **C**ritical / **H**igh / **M**edium / **L**ow / **I**nfo
Each finding is keyed (e.g. **C-01**, **H-03**) so they can be referenced in the backlog at the end.

---

## 1. Bluetooth printing (primary focus)

Status: **Concerns** — works on desktop Chrome, but has correctness and UX issues that matter for the actual deployment context (Indian dairy farmers, Android phones).

### C-02 — OTP generator uses `Math.random()` — not crypto-secure  *(unrelated to printing, listed in §3)*

### H-03 — Non-ASCII farmer names will print as garbage
**Location:** `src/services/thermalPrinting.ts:279-285` (`textToBytes`), used by both `buildSlipData` and `printTestSlip`.
**Evidence:**
```ts
const textToBytes = (text: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));  // returns UTF-16 code units >127 unmodified
  }
  return bytes;
};
```
**Impact:** Any farmer name containing Devanagari, Marathi, or even an accented Latin character will be silently mangled on the printer. `charCodeAt` returns UTF-16 code units up to 0xFFFF, but ESC/POS printers expect either CP437 (default) or a UTF-8 stream after the code-page is set via `ESC t n`. For an Indian dairy app with farmer names in Hindi/Marathi this is real, not theoretical.
**Recommended fix:** Encode with `new TextEncoder().encode(text)` after sending `ESC t n` to select an appropriate code page (CP1252 for Latin, or a code-page that matches the actual printer if Devanagari support is required — many cheap thermal printers cannot print Devanagari at all, in which case transliterate names server-side).
**Verification:** Create a farmer with name `राम कुमार`, attempt to print — expect mojibake or `?`s.

### H-04 — "Saved" printer is not actually persistent across reloads
**Location:** `src/services/thermalPrinting.ts:67-92` (`getSavedPrinter` / `savePrinter`), `150-247` (`connectToPrinter`).
**Evidence:** `device.id` is saved to `localStorage`, but on a fresh page load the in-memory `connectedDevice` is null. `connectToPrinter` then calls `navigator.bluetooth.requestDevice` again — which always pops the OS Bluetooth picker. The stored address is never used to silently reconnect.
**Impact:** Users must pick the printer from a list every session, defeating the purpose of "saving" it. PrinterSettings shows a green "Saved" badge that overpromises.
**Recommended fix:** Use Chromium's `navigator.bluetooth.getDevices()` (returns devices already granted persistent permission for this origin) on app boot; only fall back to `requestDevice` if the saved id is not in the list.
**Verification:** Hard-reload the app after configuring a printer; click "Test Print" — picker re-appears.

### H-08 — Dead native fallback / mobile build print path is broken
**Location:** `package.json:47` (`capacitor-thermal-printer@^0.2.5`), `capacitor.config.ts`, missing `android/` folder.
**Evidence:** `grep -rn capacitor-thermal-printer src/` returns zero hits. No `android/` directory in the repo, so `npx cap add android` was never run. `capacitor.config.ts` has only `appId`, `appName`, `webDir` — no plugin config.
**Impact:** Web Bluetooth inside the Capacitor Android WebView is unsupported by Chromium WebView for most versions. If the team ever ships an APK, the print button will simply fail with "Web Bluetooth not supported". The installed `capacitor-thermal-printer` dependency was presumably planned to bridge this gap but the integration was never wired up.
**Recommended fix:** Either delete the unused dep and document that the app is desktop-Chrome / Android-Chrome-only (not the installed PWA / native APK), or finish the Capacitor integration (`thermalPrinting.ts` should branch on `Capacitor.isNativePlatform()` and call the native plugin's `print()` method).
**Verification:** `grep -rn capacitor-thermal-printer src/`; check for `android/` folder.

### M-09 — No `gattserverdisconnected` listener; silent disconnects
**Location:** `src/services/thermalPrinting.ts:150-247`.
**Evidence:** `connectedDevice.gatt.connect()` returns a server, but no `connectedDevice.addEventListener('gattserverdisconnected', ...)` is registered.
**Impact:** When the printer is powered off, goes out of BLE range, or its OS pairing is dropped, the in-memory `connectedDevice` still claims to be valid until the next `writeValue` throws. The UI's "Saved" badge stays green.
**Recommended fix:** Attach the event listener on first connect, set `printerCharacteristic = null`, and surface a toast / banner to the UI.

### M-10 — BLE write strategy is hardcoded and likely wrong for some printers
**Location:** `src/services/thermalPrinting.ts:371-377` and `437-441`.
**Evidence:** Always 20-byte chunks, always `writeValue` (which is `writeValueWithResponse` under the hood), always 50 ms sleep.
**Impact:**
- MTU is not negotiated; many BLE printers support 247-byte MTU which would print 12× faster.
- `writeValue` waits for a response per chunk; if the characteristic only supports `writeWithoutResponse`, the call throws. The code doesn't check `characteristic.properties.write` vs `writeWithoutResponse`.
- 50 ms fixed delay is either too slow (wastes time) or too fast (overflows buffer) depending on printer.
**Recommended fix:** Inspect `characteristic.properties` after discovery, pick the correct write method, and try to bump MTU on the GATT server.

### M-11 — No retry / partial-print recovery
**Location:** `printCollectionSlip` and `printTestSlip` in `thermalPrinting.ts`.
**Evidence:** If a chunk write fails mid-stream (e.g. transient BLE disconnect), the function throws, leaving a half-printed slip. The caller (`PrintSlipDialog.tsx:94-99`) only shows a generic "Print Failed" toast.
**Impact:** Operationally annoying — collection-center staff may not realize they need to reprint, or may print duplicates without realizing the first attempt failed late.
**Recommended fix:** Add one retry on transient errors; if it still fails, show a "Partial print — reprint?" prompt.

### L-12 — Picker shows every Bluetooth device
**Location:** `src/services/thermalPrinting.ts:117-120,165-168`.
**Evidence:** `acceptAllDevices: true` with `optionalServices` listed.
**Impact:** UX clutter — users see phones, watches, headphones in the picker. Easy to pick the wrong device.
**Recommended fix:** Try `filters: [{ services: PRINTER_SERVICE_UUIDS[0] }]` (and a name-prefix filter if applicable); keep `acceptAllDevices` only behind an "Advanced" toggle.

### L-13 — Memory-only characteristic handle
**Location:** `thermalPrinting.ts:43-45` (module-scope `let connectedDevice` etc).
**Impact:** Tab discard / page navigation clears the handle, forcing reconnect. Minor.

### I-14 — Static UUID lists work but are undocumented
**Location:** `thermalPrinting.ts:26-40`. Fine in practice (HM-10, generic SPP, CP-Q3 style printers), but a code comment listing which printer models were actually tested would help future maintainers.

---

## 2. Deployment (Vercel)

Status: **Concerns** — minimal config; missing security headers.

### M-15 — `vercel.json` has no security headers
**Location:** `vercel.json` (full file is 5 lines: SPA rewrite only).
**Impact:** App ships with whatever Vercel's defaults are (Vercel sets some, but none of the policy headers below). Missing:
- `Strict-Transport-Security` — Vercel adds this on apex domains but worth pinning explicitly.
- `Content-Security-Policy` — none. With `console.log` and inline-style usage from shadcn, this would need scripting, but at minimum a report-only CSP is cheap defense in depth.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: bluetooth=(self)` — this is the one that matters for this app if anyone ever embeds it.
- `X-Frame-Options: DENY` (or use CSP `frame-ancestors`).
**Recommended fix:** Add a `headers` array to `vercel.json`.
**Verification (after fix):** `curl -I https://udderly-smart-dairy-track.vercel.app`.

> **Caveat:** I attempted `curl -I` from this container and got `403 host_not_allowed` (sandbox network policy). Header verification on the live site needs to be done from an external machine.

### I-16 — Vercel auto-HTTPS satisfies Web Bluetooth secure-context — Pass
No action needed. `window.isSecureContext` will be true on `*.vercel.app`.

### L-17 — `vite.config.ts` has no production hardening
**Location:** `vite.config.ts` (16 lines total).
**Impact:**
- No `build.sourcemap` setting — default is `false` for production, OK, but worth pinning.
- No `esbuild.drop` to strip `console.*` from prod bundle.
- No `build.rollupOptions.output.manualChunks` for the larger pages (milk-collection, payouts).
**Recommended fix:** Add `build: { sourcemap: false }`, `esbuild: { drop: ['console', 'debugger'] }`.

### I-18 — `.env.example` is clean
Only `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_VAPID_PUBLIC_KEY` — all client-safe. No service-role or Gemini key with `VITE_` prefix.

---

## 3. Supabase backend security

Status: **Concerns** — overall good architecture with one critical secret-fallback issue and one critical RNG issue.

### C-01 — Hardcoded dev-fallback JWT secret in farmer auth
**Location:** `supabase/functions/_shared/farmerJwt.ts:5`.
**Evidence:**
```ts
const secret = Deno.env.get('FARMER_JWT_SECRET') ?? 'dev-fallback-change-me-please-32chars!!';
```
**Impact:** If `FARMER_JWT_SECRET` is **not** set in the deployed Supabase function secrets, the symmetric HMAC key is a string committed to a public(?) git repo. Anyone who reads this file can sign valid farmer JWTs and call any function that accepts them (e.g. `farmer-portal-data`, `farmer-request-advance`, `farmer-bill-pdf`). This would let an attacker impersonate any farmer with knowledge of their `farmer_id` UUID.
**Recommended fix:** Remove the fallback entirely — `throw new Error('FARMER_JWT_SECRET not configured')` if missing — so the function fails closed in misconfigured environments. Then verify in Supabase dashboard that the secret is actually set in production.
**Verification (action item for user, not me):** In Supabase dashboard → Project Settings → Edge Functions → Secrets, confirm `FARMER_JWT_SECRET` is set and is at least 32 random bytes.

### C-02 — OTP code generated with `Math.random()`
**Location:** `supabase/functions/farmer-send-otp/index.ts:39`.
**Evidence:**
```ts
const code = String(Math.floor(100000 + Math.random() * 900000));
```
**Impact:** `Math.random()` is a non-cryptographic PRNG. Combined with the 5-minute expiry and 3-OTPs-per-10min rate limit (line 28-37), an attacker who observes one or two issued codes for any phone (or controls one of their own farmer numbers) can predict subsequent codes for other farmers if the PRNG state is leaked. Even without state leak, `Math.random()` outputs are not unpredictable enough for a security token.
**Recommended fix:** Use `crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000` and zero-pad. Deno exposes `crypto.getRandomValues` globally.

### M-19 — OTP hash is unsalted SHA-256 of `code:phone`
**Location:** `supabase/functions/farmer-send-otp/index.ts:40-42`, `farmer-verify-otp/index.ts:22-24`.
**Impact:** If the `farmer_otp_codes` table is ever exfiltrated, all 1,000,000 candidate codes × N stored phone numbers can be precomputed in seconds. There is no salt and no work factor. For an OTP that expires in 5 minutes this is mostly mitigated by time-of-use, but for forensic/post-leak analysis it lets an attacker reconstruct historical OTPs.
**Recommended fix:** Either don't store the OTP hash at all (compare in-memory then discard) or add a per-row salt. Honestly the simplest fix is to delete used rows immediately and let the existing TTL/cleanup handle the rest.

### M-20 — Edge function CORS allows `*`
**Location:** `supabase/functions/_shared/cors.ts:2`. Used by ~30 functions.
**Impact:** Any origin can call any endpoint. For functions that require JWT this is mostly defense-in-depth, but for `verify_jwt = false` functions (api, send-web-push, OTP endpoints, payout cycle, etc — per `supabase/config.toml`) it widens the attack surface.
**Recommended fix:** Set `Access-Control-Allow-Origin` to the Vercel origin in production (with the localhost dev origin behind an env-var check).

### M-21 — Baseline RLS in the very first migration is overly permissive
**Location:** `supabase/migrations/20250704080804-*.sql` — `FOR ALL TO authenticated USING (true) WITH CHECK (true)` on 11 tables: weight_logs, vaccination_schedules, vaccination_records, milk_production, farmers, milk_rates, milk_collections, feed_categories, feed_items, feed_transactions, ai_records.
**Evidence:** `grep -c "FOR ALL TO authenticated USING (true)" supabase/migrations/*.sql` shows only the 20250704 migration is the chief offender, but the followup migrations refine some tables (not all).
**Impact:** Every authenticated user (including a `worker` who shouldn't see financial data, or a `farmer` accessing the regular app rather than the portal) has full read+write on these tables unless a later migration explicitly drops the policy and replaces it. Tables that are most likely to remain over-exposed without a follow-up: `vaccination_schedules`, `vaccination_records`, `feed_categories`, `feed_items`, `feed_transactions`, `ai_records`.
**Recommended fix (verification step):** Run `mcp__supabase__get_advisors` against the live project — Supabase's lint will list every table whose effective policy is still `USING (true)`. Then write a single tightening migration per offender.

### I-22 — Frontend client is correctly anon-key only
**Location:** `src/integrations/supabase/client.ts`. `VITE_SUPABASE_PUBLISHABLE_KEY` only; no service-role anywhere in `src/`.

### I-23 — Edge function `verify_jwt` config is intentional, not a finding
Functions with `verify_jwt = false` in `supabase/config.toml` (farmer-*, payout cycles, api, web-push, etc.) all implement their own auth — custom farmer JWT, static API key, or signature verification from upstream services. Document for the team but not a vulnerability.

### I-24 — Rate limiting on OTP exists
3 OTPs per phone per 10 min, 5 attempts per OTP — sensible. No per-IP throttle — minor but acceptable given the phone-based rate limit.

---

## 4. Auth & RBAC (Supabase auth side)

Status: **Pass with minor concerns** — Supabase password reset is correctly isolated (`PASSWORD_RECOVERY` event), client-side password strength validation exists in `AuthForm.tsx`, `SecureInput` prevents clipboard for passwords. Server-side RBAC is enforced via the `has_role()` function in newer migrations.

### M-25 — Token storage in `localStorage`
**Location:** `src/integrations/supabase/client.ts:20-23`.
**Impact:** XSS becomes session-takeover. Given there are 108 `console.*` and 450 `any` usages in src/, an XSS via downstream-data injection isn't theoretical. The trade-off vs httpOnly cookies is the standard Supabase one — document the decision explicitly.

### L-26 — Long client guard list vs server enforcement
**Location:** `src/config/routes.tsx:48-215`. Every route has a `permission` string evaluated by `getAccessibleRoutes(permissions)`. This is **UI gating only**. Server-side enforcement relies entirely on RLS — which is why **M-21** matters so much. If a worker pastes the `/expenses` URL directly, the route loads; whether they see expense rows depends on RLS, not the route guard.
**Recommended fix:** Audit each permission-gated table's RLS to confirm it really restricts access. The route guard is fine — just don't trust it for security.

---

## 5. Frontend code quality

Status: **Concerns** — TS strict effectively off; lots of `any`; console logs ship to prod.

### H-27 — TypeScript strict mode is effectively disabled
**Location:** `tsconfig.json:3-13`.
**Evidence:**
```json
"allowJs": true,
"noImplicitAny": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"strictNullChecks": false
```
**Impact:** `strict` is not in this config, and the individual strict flags are explicitly off. This is the root cause of finding **C-01**-style bugs slipping through — null checks aren't enforced, `any` is implicit. A real-world consequence is the `printerCharacteristic` reference in `thermalPrinting.ts` — it's `let printerCharacteristic: any = null` and downstream code doesn't check for null before calling `.writeValue`, relying on a runtime check that's correct but not type-enforced.
**Recommended fix:** Turn `strict: true` and fix the cascade of errors. Doing this incrementally — one strictness flag at a time — is realistic.

### M-28 — 450 `any` usages in `src/`
**Location:** `grep -rn "\bany\b" src/ --include="*.ts*" | wc -l` = 450. Particularly bad in `thermalPrinting.ts` where every Bluetooth API type is `any`. TypeScript ships `@types/web-bluetooth` for this.
**Recommended fix:** `npm i -D @types/web-bluetooth` and remove the `any`s in the Bluetooth service file as a first pass.

### M-29 — 108 `console.*` calls ship to production
**Location:** `grep -rn console\\. src --include="*.ts*"` = 108. `thermalPrinting.ts` alone has ~30 `console.log`s including device IDs and connection state.
**Impact:** Browser DevTools leak operational data; in PWA install, console persists across sessions. Some logs include the BLE device id (`device.id`) which is origin-scoped and not a real secret, but the noise alone makes prod debugging harder.
**Recommended fix:** Add `esbuild: { drop: ['console', 'debugger'] }` in `vite.config.ts`. Keep a `logger.ts` wrapper for the handful of intentional prod logs.

### I-30 — Zero `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`
Good. Whatever silences TS is implicit-`any`-driven, not explicit suppression.

### L-31 — No error boundary observed at route level
Routes are wired up in `src/config/routes.tsx` without a top-level `<ErrorBoundary>`. A render error in `MilkCollectionManagement` would crash the whole app shell. (Verify by inspecting `src/App.tsx` — not read in this pass.)

---

## 6. Dependencies

Status: **Concerns** — at least one almost-certainly-unused dep, one suspicious near-typo dep.

### H-32 — Unused dep: `capacitor-thermal-printer`
See **H-08**.

### M-33 — Suspicious near-duplicate: `react-hook-form-resolvers@0.0.1`
**Location:** `package.json:65`.
**Evidence:** The project also depends on `@hookform/resolvers@^3.9.0` (line 17), which is the correct package. `react-hook-form-resolvers@0.0.1` is a third-party package on npm — its origin should be verified. This kind of `0.0.1` package with a similar name to a popular library is a classic typo-squatting / supply-chain risk pattern.
**Recommended fix:** Run `npm view react-hook-form-resolvers` and inspect what's actually in node_modules. If unused, remove it. If used somewhere, audit what the package does and consider switching to `@hookform/resolvers`.
**Verification:** `grep -rn "react-hook-form-resolvers" src/` and `npm view react-hook-form-resolvers`.

### M-34 — `npm audit` / `npm outdated` not run in this pass
Container has no `node_modules` and a network policy that blocks the registry. Findings deferred — run locally:
```sh
npm ci
npm audit --production
npm outdated
npx depcheck
npm ls react
```

---

## 7. PWA / Capacitor mobile

Status: **Concerns** — Capacitor is a phantom; PWA itself is solid.

### H-35 — Capacitor Android target is not actually set up
**Location:** Missing `android/` folder, `capacitor.config.ts` is the bare minimum (10 lines), no plugins configured.
**Impact:** The team has paid the dependency cost of `@capacitor/android`, `@capacitor/cli`, `@capacitor/core`, and `capacitor-thermal-printer` (4 deps, several MB of install footprint) for zero benefit. The dependency declaration suggests intent to ship an APK; the actual repo state cannot build one.
**Recommended fix:** Either delete the four Capacitor deps and treat the app as web-only, or run `npx cap add android`, commit the `android/` directory, wire up `capacitor-thermal-printer` in `thermalPrinting.ts` behind a `Capacitor.isNativePlatform()` branch, and add proper Android permissions to the manifest (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, and `ACCESS_FINE_LOCATION` for SDK < 31).

### I-36 — PWA manifest is complete
`public/manifest.json` has all icon sizes, theme color, `standalone` display, `portrait-primary` orientation, categories. No action needed.

### L-37 — Service worker doesn't exclude auth/sensitive routes
**Location:** `public/sw.js:117-143`.
**Evidence:** Navigation requests are cached in `PAGES_CACHE` whenever status 200, with no path exclusion list.
**Impact:** A `/reset-password` page render or an authenticated dashboard render can end up in the page cache, potentially served to a different user on the same device. Practically limited because the SPA shell is the same HTML for all routes, but the cache key is the full URL.
**Recommended fix:** Only cache the root `index.html`; never cache responses with auth-bearing URLs. Or exclude `/auth`, `/reset-password`, `/farmer-portal/*` from the navigation cache.

---

## 8. Observability

Status: **Concerns** — no error tracking, no print-path telemetry.

### M-38 — No error monitoring integration found
**Location:** Nothing in `src/` matches `Sentry`, `LogRocket`, `Datadog`, `Bugsnag`, or `@vercel/analytics`.
**Impact:** When a print fails in production, the team has zero visibility unless the user reports it. Same for any React render error, network failure, or RLS denial.
**Recommended fix:** Add Sentry (free tier handles small dairy ops volume), and explicitly capture `console.error` and the Bluetooth catch blocks.

### M-39 — No telemetry on the print path specifically
The user's hot path (collection slip → print) has no event tracking. If the printer fails to print 30% of the time, no one would know without reading toasts in the field.
**Recommended fix:** Once Sentry/analytics is in, emit `print_attempt`, `print_success`, `print_failure_reason` events.

### I-40 — Edge function logs are accessible via Supabase dashboard
Standard — flag for the team that this is the primary backend observability tool.

---

## Prioritized remediation backlog

| Key | Severity | Title | Rough effort |
|-----|----------|-------|--------------|
| **C-01** | Critical | Remove dev-fallback JWT secret in `farmerJwt.ts`; verify env var is set in prod | 15 min |
| **C-02** | Critical | Replace `Math.random()` OTP with `crypto.getRandomValues` | 15 min |
| **H-03** | High | Fix non-ASCII text encoding in thermal print | 1–2 hr |
| **H-04** | High | Use `bluetooth.getDevices()` for true printer persistence | 1 hr |
| **H-08 / H-35 / H-32** | High | Decide Capacitor strategy — delete deps OR finish Android setup with native print bridge | 1 hr (delete) or 1 day (wire up) |
| **H-27** | High | Turn TS strict on incrementally | 0.5–2 days |
| **M-09** | Medium | Add `gattserverdisconnected` listener | 30 min |
| **M-10** | Medium | Honor characteristic `write` vs `writeWithoutResponse`; negotiate MTU | 1–2 hr |
| **M-11** | Medium | Retry / partial-print recovery in print path | 1 hr |
| **M-15** | Medium | Security headers in `vercel.json` | 30 min |
| **M-19** | Medium | OTP hash storage (salt or skip) | 30 min |
| **M-20** | Medium | Restrict CORS to Vercel origin in prod | 30 min |
| **M-21** | Medium | Audit `USING (true)` policies via `get_advisors`, tighten survivors | 2–4 hr |
| **M-25** | Medium | Document or change auth token storage decision | 30 min discussion |
| **M-28** | Medium | Drop `any` from `thermalPrinting.ts` using `@types/web-bluetooth` | 1 hr |
| **M-29** | Medium | Add `esbuild.drop: ['console']` for prod builds | 5 min |
| **M-33** | Medium | Investigate `react-hook-form-resolvers@0.0.1` — typo squat? | 15 min |
| **M-34** | Medium | Run `npm audit` / `outdated` / `depcheck` locally | 15 min |
| **M-38 / M-39** | Medium | Add Sentry + print-path events | 2–4 hr |
| **L-12** | Low | Filter Bluetooth picker by printer service UUID | 15 min |
| **L-13** | Low | Persist characteristic handle (mostly a no-op given H-04) | — |
| **L-17** | Low | Vite production hardening (sourcemap pin, chunk strategy) | 30 min |
| **L-26** | Low | Document client-route-guard ≠ security model | 15 min |
| **L-31** | Low | Add top-level error boundary | 30 min |
| **L-37** | Low | Tighten service-worker page cache | 30 min |
| **I-14, I-16, I-18, I-22, I-23, I-24, I-30, I-36, I-40** | Info | No action needed — documented for the team | — |

**Suggested first-pass scope (one afternoon):** C-01, C-02, M-15, M-29, M-33, M-34, L-12. These are the highest-risk-per-minute items and most are mechanical.

**Suggested second-pass scope (one day):** H-03, H-04, H-08 (decision), M-09, M-10, M-11, M-21.

---

## Verification artefacts referenced

- `vercel.json` — 5 lines, SPA rewrite only
- `vite.config.ts` — 16 lines, no production hardening
- `tsconfig.json` — strict flags individually disabled
- `package.json` — `capacitor-thermal-printer`, `react-hook-form-resolvers@0.0.1`
- `supabase/config.toml` — `verify_jwt` flags per function
- `supabase/migrations/20250704080804-*.sql` — 11 baseline `FOR ALL TO authenticated USING (true)` policies
- `supabase/functions/_shared/farmerJwt.ts:5` — dev fallback secret
- `supabase/functions/farmer-send-otp/index.ts:39` — `Math.random()` OTP
- `src/services/thermalPrinting.ts` — full file reviewed
- `src/components/settings/PrinterSettings.tsx` — full file reviewed
- `src/components/milk-collection/PrintSlipDialog.tsx` — full file reviewed
- `public/sw.js` — full file reviewed

## What was not verified in this pass (needs follow-up)

- Live HTTP response headers from the prod Vercel URL (container sandbox blocks outbound to `*.vercel.app`).
- `npm audit` / `npm outdated` / `depcheck` (no `node_modules`, registry blocked).
- Supabase `get_advisors` lint output (MCP tool not invoked in this pass).
- On-device Web Bluetooth behaviour on actual Android Chrome with a real ESC/POS printer.
- A per-table RLS effective-policy matrix (would require either `get_advisors` or running `pg_policies` query against the live DB).
