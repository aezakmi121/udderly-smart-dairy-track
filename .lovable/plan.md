## Goal

Stop the silent ₹0-rate problem (cow code 22 in the slip — 5.6 fat / 11.2 SNF returned no match) and add slip-photo scanning so manual collection entry isn't needed.

## Part 1 — Rate matrix is the only source of truth, with safe clamp fallback

Today `fn_get_rate` does a strict floor lookup. If fat or SNF is below the lowest band, or if no row matches the floor pair, it returns `null` and the form falls back to the legacy flat `milk_rates` rate. The slip-machine has the same gap and prints `0.00`. We will:

1. **Rewrite `fn_get_rate`** to:
   - Find the active matrix for `(species, date)`.
   - **Above range** (fat or snf above the matrix max for that species) → clamp to the matrix max band and return that rate. Mark `source = 'clamped_high'`.
   - **Below range** (fat or snf below the matrix min) → return the **absolute minimum rate** in the entire active matrix for that species (i.e. `MIN(rate)` across all bands of that species/effective_from). Mark `source = 'clamped_low'`.
   - **In range with exact floor match** → return that rate, `source = 'matrix'`.
   - **No matrix loaded at all** → return null, `source = 'none'`.
   - New return columns: `rate, effective_from, source, used_fat, used_snf`.

2. **`useRateMatrix` hook** — surface `source`, `used_fat`, `used_snf`. Drop the legacy `useMilkRateSettings.calculateRate` fallback in `MilkCollectionForm`. If `source = 'none'`, block save with a clear toast ("No rate matrix loaded — upload one in Settings").

3. **UI badges** in `MilkCollectionForm` and the new slip-review screen:
   - `matrix` → no badge.
   - `clamped_high` → amber ⚠ "Clamped to top band (fat/snf above matrix)".
   - `clamped_low` → amber ⚠ "Floor rate applied (fat/snf below matrix)".

4. **Settings → Rate Matrix Viewer**: add a small "Clamp activity" panel showing how many collections in the last 30 days used `clamped_high` / `clamped_low`, so admin knows when to extend the matrix.

## Part 2 — AI slip scanner

New flow under **Milk Collection → Scan Slip** (Admin only):

```text
Upload photo ──► extract-collection-slip edge fn ──► review screen ──► bulk insert
                 (Gemini vision, JSON via tool call)   (editable, badged)
```

### Edge function `extract-collection-slip`
- Auth: requires `admin` role (verify JWT in code).
- Input: `{ image_base64, collection_date_override?, session_override? }`.
- Calls Lovable AI Gateway with `google/gemini-2.5-pro` (image + tool calling for structured JSON):
  ```json
  { "date": "DD-MM-YYYY", "shift": "M|E|All", "mpp_code": "01925",
    "sections": [
      {"species":"Cow", "rows":[{"code":"32","qty":1.66,"fat":5.7,"snf":9.9,"printed_amount":60.81}, ...]},
      {"species":"Buff", "rows":[...]}
    ],
    "totals": { "cow": {"qty":..,"amount":..}, "buff": {...} } }
  ```
- For each row: resolve `farmer_id` from `farmers.farmer_code`, call new `fn_get_rate` to compute `rate` and `total_amount`, attach `rate_source`.
- Computes `discrepancy` per row: `|computed_amount − printed_amount| > 1.0` flagged.
- Returns enriched JSON; **does not insert** — review step does that.
- Handles 429/402 from gateway with friendly errors.

### Frontend
- `SlipScanModal.tsx` — file/camera input, sends base64 to edge fn.
- `SlipReviewTable.tsx` — editable rows with columns: Code | Farmer (auto-mapped) | Qty | Fat | SNF | Rate (computed, badged) | Amount | Diff | ⚠.
  - Unknown farmer codes → red row, dropdown to pick or "create farmer".
  - Discrepancy > ₹1 → yellow row.
  - Date/Session header editable; "All" shift forces user to pick morning or evening before save.
- Save → bulk insert into `milk_collections` (single transaction-like loop, with rollback toast on partial failure).
- Entry point: button in `MilkCollectionManagement` header next to "Add".

## Technical Details

**Migration:**
```sql
CREATE OR REPLACE FUNCTION public.fn_get_rate(
  p_species text, p_fat numeric, p_snf numeric, p_date date DEFAULT CURRENT_DATE
) RETURNS TABLE(rate numeric, effective_from date, source text, used_fat numeric, used_snf numeric) ...
```
Logic: pick `eff_date = max(effective_from where <= p_date)`; compute `fat_max, fat_min, snf_max, snf_min, min_rate` for that species/eff_date; if `p_fat > fat_max OR p_snf > snf_max` → clamp both down to bracket and look up, source='clamped_high'; elsif `p_fat < fat_min OR p_snf < snf_min` → return `min_rate`, source='clamped_low'; else floor lookup, source='matrix' (if floor pair has no row, also fall back to clamped_low min_rate).

**Files added/edited:**
- migration: redefine `fn_get_rate`.
- `src/hooks/useRateMatrix.ts` — return new fields.
- `src/components/milk-collection/MilkCollectionForm.tsx` — drop legacy fallback, show badge, block on `source=none`.
- `src/components/settings/RateMatrixViewer.tsx` — clamp activity panel.
- `supabase/functions/extract-collection-slip/index.ts` — new.
- `supabase/config.toml` — register function (verify_jwt default).
- `src/components/milk-collection/SlipScanModal.tsx` — new.
- `src/components/milk-collection/SlipReviewTable.tsx` — new.
- `src/components/milk-collection/MilkCollectionManagement.tsx` — add "Scan Slip" button (admin only).

**Verification on the uploaded slip:**
- Cow code 22 (5.6 fat, 11.2 snf) → `clamped_high` → uses cow top-band rate (likely ~5.9/10.5 or similar) instead of 0.
- Buff rows all in range → `matrix`.
- Computed cow total will exceed slip's ₹1326.83 (since slip dropped row 22) — review screen flags this; admin can choose to keep computed value or override.

## Out of scope
- Auto-creating farmers from unknown codes (review UI offers it but admin must confirm).
- OCR on hand-written slips (only computer-printed slips like the sample).
- Editing the matrix from the clamp panel (just visibility).