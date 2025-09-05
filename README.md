# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2d32d2de-68e0-4e6c-a137-eb09985ceae9

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
- No layout shifts needed - just add data at the edges

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

## Setup

### Environment Variables

1. Copy the environment template:
   ```sh
   cp .env.example .env
   ```

2. Get your Supabase credentials from the [Supabase Dashboard](https://supabase.com/dashboard):
   - `VITE_SUPABASE_URL`: Your project URL (Settings → API)
   - `VITE_SUPABASE_ANON_KEY`: Your anon/public key (Settings → API)

3. Update `.env` with your actual values.

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

### PWA Setup

- Service Worker is configured for offline functionality
- For production PWA features, consider upgrading to [Workbox](https://workboxjs.org/) or [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- Current caching strategy:
  - Cache-first for built assets (`/assets/*`)
  - Network-first for navigation and pages

### Package Management

We use **npm** as the package manager. Please delete any other lockfiles (`yarn.lock`, `bun.lockb`, etc.) if present.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2d32d2de-68e0-4e6c-a137-eb09985ceae9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2d32d2de-68e0-4e6c-a137-eb09985ceae9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
