# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

There is no test suite.

## Architecture

React 19 + Vite SPA backed by Supabase (PostgreSQL + Auth). No server-side code — all data access is direct from the client via the Supabase JS client with Row-Level Security enforcing user isolation.

**Entry point flow:**
```
main.jsx → App.jsx → BrowserRouter → ThemeProvider → AuthProvider → AppRoutes
```

`AppRoutes` wraps every authenticated route with `ProtectedRoute` (redirects to `/login` if no session) and `Layout` (header + nav shell).

**Feature structure** — each domain (workouts, exercises, nutrition) follows the same pattern:
- `src/pages/` — page component that wraps feature content in `<Layout>`
- `src/components/<feature>/` — list, form, and detail components; data is fetched with `useEffect` + direct Supabase queries and re-fetched manually after mutations (no query library)
- No global data cache; state lives in individual components via `useState`

**Global state** is only `AuthContext` (session, auth methods) and `ThemeContext` (light/dark). Both are React Context with custom hooks (`useAuth`, `useTheme`).

**Path alias:** `@` maps to `./src` (configured in `vite.config.js`).

**UI:** shadcn/ui primitives in `src/components/ui/`, Tailwind CSS v4, lucide-react icons, recharts for charts. Theme uses CSS custom properties with `oklch` colors defined in `index.css`.

**URL state pattern:** expandable list items use `?expand=<id>` query params so links are shareable (e.g., dashboard workout rows linking to expanded workout view).

**Form persistence:** `useFormStorage` hook (`src/hooks/useFormStorage.js`) persists draft form state to `localStorage` by key.

## Environment

Requires `.env.local` with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Database

Four tables in Supabase: `exercises`, `workouts`, `workout_entries`, `nutrition_logs`. All have RLS enabled — users can only access rows matching their `auth.uid()`. `workout_entries` inherits access via a subquery on `workouts`. Full schema is in README.md.

Workout queries typically use nested selects:
```js
supabase.from('workouts').select('*, workout_entries(*, exercises(name, muscle_group))')
```

## Deployment

Auto-deploys to Vercel on push to `master`. Live at https://mbh-fitness-tracker.vercel.app.
