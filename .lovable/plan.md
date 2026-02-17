

# Distribution Reports Redesign: Tabbed Layout with Production Breakdown

## Overview
Restructure the Distribution Reports page from a single monolithic view into a tabbed interface with separate sections, and add a detailed milk production breakdown showing per-session and per-cow data.

## What Changes

### 1. Tabbed Layout for Distribution Reports
The current single-page view will be split into organized tabs:

- **Overview** -- The existing KPI cards and summary charts (current content, cleaned up)
- **Production** -- New tab showing milk production breakdown by session (morning/evening), by cow, daily totals, and trends
- **Distribution** -- The distribution pie chart, source comparison, and destination tracking
- **Store & Plant** -- Store dispatch vs receipt analysis, plant sales with revenue, discrepancy tracking
- **Cream & FFM** -- Cream extraction, FFM yield, dahi production data

### 2. Production Breakdown (New)
The Production tab will show:
- **Session-wise totals**: Morning vs Evening production with individual cow quantities
- **Per-cow table**: Each cow's contribution for the selected date range
- **Daily production chart**: Bar chart showing morning/evening split per day
- **Top producers**: Highlight highest-yielding cows

### 3. Data Flow
The existing `useDistributionAnalytics` hook already fetches milk production data (`farmProd`). The production breakdown will extend this to include cow-level details by fetching production records with cow information (cow_number) for the selected date range.

---

## Technical Details

### Files to Create
1. **`src/components/reports/distribution/DistributionOverviewTab.tsx`** -- KPI cards and summary (extracted from current DistributionReports)
2. **`src/components/reports/distribution/ProductionBreakdownTab.tsx`** -- New production breakdown with per-cow and per-session data
3. **`src/components/reports/distribution/DistributionTab.tsx`** -- Distribution pie chart and source comparison
4. **`src/components/reports/distribution/StorePlantTab.tsx`** -- Store dispatch/receipt and plant sales analysis
5. **`src/components/reports/distribution/CreamFFMTab.tsx`** -- Cream extraction and FFM data

### Files to Modify
1. **`src/components/reports/DistributionReports.tsx`** -- Refactor to use Tabs component wrapping the new sub-components. Date range selector and export buttons stay at the top (shared across tabs).
2. **`src/hooks/useDistributionAnalytics.ts`** -- Extend to return cow-level production breakdown:
   - Add `productionBreakdown` field with per-cow, per-session quantities
   - Query `milk_production` with cow join to get `cow_number`

### Hook Data Extension
The `useDistributionAnalytics` hook will be extended to include:
```
productionBreakdown: {
  byCow: Array<{
    cowNumber: string;
    morning: number;
    evening: number;
    total: number;
  }>;
  bySession: {
    morning: number;
    evening: number;
  };
  dailyBreakdown: Array<{
    date: string;
    morning: number;
    evening: number;
    total: number;
  }>;
}
```

### Component Structure
```text
DistributionReports
+-- Date Range Selector (shared)
+-- Export Buttons (shared)
+-- Tabs
    +-- Overview Tab (KPI cards)
    +-- Production Tab (cow-level breakdown)
    +-- Distribution Tab (pie chart, source comparison)
    +-- Store & Plant Tab (dispatch/receipt, revenue)
    +-- Cream & FFM Tab
```

### Tab Component
Uses existing `@/components/ui/tabs` (Radix Tabs) with responsive styling matching the pattern in `ReportsManagement.tsx` -- grid-based TabsList with mobile-friendly text sizes.

