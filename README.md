# Udderly Smart Dairy Track

Smart dairy farm management system — track cows, milk production, feed, AI/PD records, vaccinations, and more.

**Production URL**: https://udderly-smart-dairy-track.vercel.app

---

## Monthly Rate Upload (Excel, two tabs)

This application supports Excel-based Fat-SNF rate charts with versioned effective dates.

### Excel Template Format

Your Excel file must contain exactly two tabs named "Buffalo" and "Cow". Each tab should follow this layout:

- **Row 2**: SNF values starting from column B (e.g., B2=8.0, C2=8.5, D2=9.0...)
- **Column A from row 3**: Fat values (e.g., A3=3.0, A4=3.5, A5=4.0...)
- **Rate grid**: Starts from B3 (intersection of Fat and SNF values)

### Dynamic Bounds

The parser automatically detects axis lengths, so you can:
- Extend SNF to the right (e.g., up to 12.0)
- Add more Fat rows downward
- No layout shifts needed — just add data at the edges

### Upload Process

1. Navigate to Settings > Milk Rates
2. Click "Upload Excel Rate Matrix"
3. Select your .xlsx file and set the effective date
4. Review the upload summary showing species, axis counts, and rows processed

### Rate Calculation

During milk collection:
- Select Species (Buffalo/Cow), enter Fat %, SNF %, and date
- The system finds the appropriate rate using floor logic (largest value ≤ input)
- Shows a badge indicating the rate version used
- Fallback to legacy rates if no matrix data available

---

## Local Development

### Prerequisites

Node.js 18+ and npm installed.

### Setup

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd udderly-smart-dairy-track

# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Settings → API (anon key) |

### Database Setup

1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/gjimccbtclynetngfrpw/sql/new)
2. Open `db/seed.sql` from this repository
3. Replace `<AUTH_UUID>` with your actual user UUID (found in Auth → Users after first login)
4. Run the SQL script to create your admin role

### First Login & RBAC

- **First-time users** will see an "Access Pending" screen until an admin assigns them a role
- **Admin users** can assign roles via the Settings page
- **Role types**:
  - `admin`: Full system access
  - `worker`: Farm operations (cows, milk, feed management)
  - `farmer`: Collection center operations

---

## Deployment (Vercel)

The app is deployed on Vercel. Push to `main` to trigger a production deploy.

**Required Vercel environment variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Required Supabase configuration:**
- Authentication → URL Configuration → Site URL: `https://udderly-smart-dairy-track.vercel.app`
- Authentication → URL Configuration → Redirect URLs: include the Vercel URL and `/reset-password`

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Push Notifications**: OneSignal
- **Deployment**: Vercel
