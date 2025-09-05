# Changelog

## [2024-12-XX] - Excel Rate Matrix System

### Added
- **Excel-based Rate Matrix**: Support for monthly Excel uploads with Buffalo/Cow tabs containing Fat-SNF rate charts
- **Dynamic Axis Detection**: Auto-detects SNF and Fat axis lengths from Excel headers  
- **Rate Matrix Upload Modal**: Complete UI for uploading .xlsx files with progress tracking and results summary
- **Species Selection**: Added species dropdown (Buffalo/Cow) in milk collection form
- **Matrix Rate Calculation**: New `fn_get_rate` RPC function with floor logic for rate lookup
- **Rate Version Badges**: Visual indicators showing matrix rate vs legacy rate usage
- **Versioned Effective Dates**: Support for historical rate lookups by date

### Changed  
- **MilkCollectionForm**: Now uses matrix-based rates with fallback to legacy rates
- **MilkRateSettings**: Added Excel upload section alongside existing single rate form
- **Rate Display**: Enhanced with badges showing rate source and effective date

### Technical
- New `rate_matrix` table with species, fat, snf, rate, and effective_from columns
- New `upload-rate-matrix` edge function for Excel processing using XLSX library
- New `useRateMatrix` hook for debounced rate queries
- Backward compatibility maintained with existing `milk_rates` table

### Files Modified
- `src/components/settings/MilkRateSettings.tsx` - Added Excel upload functionality
- `src/components/milk-collection/MilkCollectionForm.tsx` - Matrix rate integration with species selection
- `README.md` - Added Excel rate matrix documentation

### Files Added
- `supabase/functions/upload-rate-matrix/index.ts` - Excel processing edge function
- `src/components/settings/RateMatrixUploadModal.tsx` - Upload UI component
- `src/hooks/useRateMatrix.ts` - Rate calculation hook

---

## Configuration & Infrastructure Improvements

### Fixed
- **Environment Configuration**: Replaced hardcoded Supabase credentials with environment variables in `src/integrations/supabase/client.ts`
  - Added proper error handling for missing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Created `.env.example` with required environment variables

- **PWA Service Worker**: Updated `public/sw.js` to be Vite-compatible
  - Removed outdated Create React App cache paths (`/static/js/bundle.js`, `/static/css/main.css`)
  - Implemented strategic caching: cache-first for `/assets/*`, network-first for navigation
  - Added proper cache management and cleanup

- **RBAC System**: Enhanced role-based access control
  - Created `db/seed.sql` with admin role setup instructions
  - Added "Access Pending" screen for users without assigned roles
  - Updated `useUserPermissions` hook to handle no-role scenarios gracefully

### Added
- **Error Handling**: Top-level `ErrorBoundary` component with friendly error messages and retry functionality
- **Loading States**: Added `Skeleton` components to data-heavy pages (Cows Management, Milk Production)
- **Documentation**: Updated README.md with comprehensive setup instructions including:
  - Environment variable configuration
  - Database seeding process
  - First-login flow and role assignment
  - PWA setup notes

### Developer Experience
- **Package Management**: Standardized on npm (removed any bun.lockb if present)
- **Documentation**: Added setup notes for easier onboarding
- **Code Quality**: Added proper error boundaries and loading states

### Files Modified
- `src/integrations/supabase/client.ts` - Environment variable integration
- `public/sw.js` - Vite-compatible PWA caching
- `src/hooks/useUserPermissions.ts` - No-role handling
- `src/components/common/ProtectedRoute.tsx` - Access pending screen
- `src/App.tsx` - Error boundary integration
- `src/components/cows/CowsManagement.tsx` - Loading skeletons
- `src/components/milk/MilkProduction.tsx` - Loading skeletons
- `README.md` - Comprehensive setup documentation

### Files Added
- `.env.example` - Environment variable template
- `db/seed.sql` - Database initialization script
- `src/components/common/ErrorBoundary.tsx` - Global error handling
- `src/components/common/AccessPendingScreen.tsx` - No-role user experience
- `CHANGELOG.md` - This changelog

### Migration Notes
1. Copy `.env.example` to `.env` and add your Supabase credentials
2. Run `db/seed.sql` in Supabase SQL Editor with your user UUID
3. Update service worker registration if using custom PWA configuration
4. Test error boundaries and loading states in development