## Final plan — Bank statement → Expenses

### Flow
```
Upload PDF → Extract debit rows → AI auto-categorise
  → Review (mandatory) → Approve → Insert into existing `expenses`
```
Credits/deposits ignored. Cash entries keep using existing "Add Expense" form.

---

### 1. New tables

- **`bank_accounts`** — `id, name, bank_name, last4, source_id (FK→expense_sources, auto-created), is_active, created_by`
- **`statement_imports`** — `id, bank_account_id, file_url, status (parsing|review|approved|failed), txn_count, total_debits, period_from, period_to, uploaded_by, created_at, error_message`
- **`statement_transactions`** — `id, import_id, txn_date, narration, ref_no, amount, suggested_category_id, suggested_payment_method_id, suggested_vendor, confidence, status (pending|approved|skipped), expense_id (after approve)`. Unique `(bank_account_id, ref_no)` for dedup across re-uploads.

All RLS = admin-only via `has_role(..., 'admin')`. New private storage bucket `bank-statements`.

### 2. Edge functions

- **`parse-statement`** (POST: PDF + `bank_account_id`)
  → save PDF to `bank-statements` bucket → extract text (regex templates for HDFC/ICICI/SBI/Axis; AI fallback for unknown formats) → keep only debit rows → dedup by ref_no → batch ~30 narrations to Lovable AI Gateway (`google/gemini-3-flash-preview`) with **tool-calling** constrained to existing category + payment_method UUIDs (no hallucinations) → insert into `statement_transactions` → set import status=`review` → return `import_id`.
  Surfaces 402/429 errors as toasts.

- **`approve-statement-import`** (POST: `{import_id, decisions: [{txn_id, action, category_id, payment_method_id, vendor_name}]}`)
  → for each `approved` row: `INSERT INTO expenses` (source_id from bank_account, payment_date=txn_date, amount, description=narration, category, payment_method, vendor, paid_by=current admin's name, status='paid') → mark txn `approved` with `expense_id` link → mark import `approved` once all rows resolved.

- **`send-expense-digest`** (cron) — daily / weekly / monthly. Reads `expenses` for the period, builds HTML summary (totals, top categories, top vendors, comparison vs previous period), sends via Resend to all admins + push via existing `send-web-push`. Includes "N pending statement reviews" CTA if any.

### 3. Frontend

- **Settings → Bank Accounts** (new section under existing Expense Settings modal): CRUD list. Creating an account auto-creates its `expense_sources` row.
- **Expenses page**:
  - **"Pending reviews" strip** above ExpenseStats: `📄 2 imports awaiting review · 47 transactions →` (only renders if any import in `review` state). Hidden otherwise.
  - **"Import Statement"** button next to existing "Add Expense": dialog with bank account selector + PDF upload + progress → redirects to review screen.
- **`/expenses/import/:id`** — review screen:
  - Header: bank, period, txn count, dupes skipped, total debits.
  - Table: Date · Narration · Amount · Category (editable dropdown of existing categories) · Payment Method · Vendor · Confidence chip · Action [Approve / Skip].
  - Filters: by category, by confidence range.
  - Bulk: "Select all > 0.85 confidence" → "Approve N".
  - Footer: **"Approve all selected"** (mandatory click — never auto-approves).
  - On done → toast "N expenses added" → navigate back to Expenses page.
- **Settings → Notifications**: three new per-user toggles — Daily / Weekly / Monthly expense digest.
  - Daily: 22:00 IST (yesterday's expenses)
  - Weekly: Mon 08:00 IST (last 7 days)
  - Monthly: 1st of month 08:00 IST (previous month full breakdown)

### 4. Where data appears after approval

No new section needed. Approved rows become normal `expenses` rows and automatically appear in:
- ExpenseStats cards
- ExpenseTable (filterable by source = bank account)
- Reports → Expense Reports (`ExpenseReportsNew`) — all charts + PDFs
- Existing PDF expense reports

The only **new** UI surfaces: Bank Accounts settings, Import button, Pending-reviews strip, Review screen.

### 5. Cron setup

- pg_cron + pg_net jobs:
  - `expense-digest-daily` — `0 16 * * *` UTC (= 22:00 IST daily) → `send-expense-digest?period=daily`
  - `expense-digest-weekly` — `30 2 * * 1` UTC (= 08:00 IST Mon) → `?period=weekly`
  - `expense-digest-monthly` — `30 2 1 * *` UTC (= 08:00 IST 1st) → `?period=monthly`

### 6. Implementation order (one go)

1. Migration: 3 tables + RLS + storage bucket + cron jobs
2. Edge function: `parse-statement`
3. Edge function: `approve-statement-import`
4. Edge function: `send-expense-digest`
5. Frontend: Bank Accounts settings tab
6. Frontend: Import button + upload dialog
7. Frontend: Review screen at `/expenses/import/:id`
8. Frontend: Pending reviews strip on Expenses page
9. Frontend: Digest toggles in Notification Settings

Ready to build. Approving this kicks off implementation in default mode.
