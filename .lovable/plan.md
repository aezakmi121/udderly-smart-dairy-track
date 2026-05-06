## 1. Cow Action Summary Card (Dashboard)

**Where:** Top of the Dashboard (`src/components/dashboard/Dashboard.tsx`), placed *above* the existing 4 stat cards so it's the first thing seen on login. On mobile it spans full width; on desktop it's a wide hero card spanning all 4 columns.

**What it shows** — a single big card titled "Action Required" with 4 large clickable tiles, each showing a count + label + icon, color-coded by urgency:

| Tile | Source | Logic |
|---|---|---|
| **PD Due** | `ai_tracking` | AI date ≥ 60 days ago, status still "Pending" (no PD result recorded) |
| **Close to Delivery** | `ai_tracking` | Pregnant cows with expected_delivery within next 60 days |
| **Overdue Delivery** | `ai_tracking` | Pregnant cows where expected_delivery < today and not yet delivered |
| **Needs AI** | `cows` + `ai_tracking` | Cows with no active pregnancy and (last delivery > 60 days OR no AI in last 90 days) |

Each tile is clickable → navigates to `/ai-tracking` with a filter prefilled (e.g. `?filter=pd-due`). The AI Tracking page already has filtering — we'll wire query-param presets into `AITrackingFilters`.

**Sizing:** Card uses `text-4xl` for the count, `text-base` for the label, large icon (`h-8 w-8`), generous padding. Visually 2× the height of the existing stat cards so it dominates the viewport.

**Visibility:** Only renders if `canEdit.cows` permission is true (re-uses existing `useUserPermissions`).

**Data:** New hook `useCowActionSummary` that runs one batched query (or 2-3 parallel queries with `Promise.allSettled`) returning the 4 counts. Cached for 5 min via React Query.

### Technical bits
- New file: `src/hooks/useCowActionSummary.ts`
- New file: `src/components/dashboard/CowActionSummaryCard.tsx`
- Edit `src/components/dashboard/Dashboard.tsx` — render the new card above the stats grid
- Edit `src/components/ai-tracking/AITrackingFilters.tsx` (or its parent) to read `?filter=` query param and apply the preset filter

---

## 2. Allow Uploading Existing Photos in Slip Scanner

**Current behavior:** `SlipScanModal.tsx` has `<Input type="file" capture="environment">`. The `capture` attribute on mobile forces the camera; users cannot pick a saved photo from the gallery.

**Fix:** Provide two buttons side-by-side inside the modal:
- **Take Photo** — opens camera (`capture="environment"`)
- **Upload from Gallery** — no `capture` attribute, opens file picker / gallery

Both feed the same `setFile` state, so the rest of the extraction flow (`extract-collection-slip` edge function call, review, save) is unchanged. No backend changes needed — the function already accepts any image data URL.

Also accept PDFs? Out of scope here; only images for now (consistent with the OCR pipeline).

### Technical bits
- Edit only `src/components/milk-collection/SlipScanModal.tsx`:
  - Replace the single `<Input type="file" capture="environment">` with two hidden inputs + two visible buttons (Camera + Gallery), or use one input without `capture` and add a small "Take Photo" button that triggers a separate camera-only input. Show a thumbnail preview of the selected image before extraction.

---

## Out of scope
- No DB migrations.
- No edge function changes.
- No changes to existing AI tracking logic — only filter preset wiring.

Approve and I'll implement both in one pass.