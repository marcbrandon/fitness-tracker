# Fitness Tracker

A personal fitness tracking app for logging workouts, exercises, and nutrition.

**Live**: https://fitness-tracker-taupe-seven.vercel.app

## Features

- **Workout Logging** - Log workouts with multiple exercises, sets, reps, and weight
- **Exercise Library** - Build a custom exercise library with muscle group tagging (supports multiple muscle groups per exercise)
- **Nutrition Tracking** - Track daily calories and macros (protein, carbs, fat)
- **Dashboard** - View stats with selectable time ranges (today, week, month, year, all time)
- **Data Import** - Import exercises, workouts, and nutrition data via JSON
- **Authentication** - User accounts with email/password and password reset

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Hosting**: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### Setup

1. Clone the repo:
   ```bash
   git clone git@github.com:marcbrandon/fitness-tracker.git
   cd fitness-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the database schema in Supabase SQL Editor (see below)

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Exercises library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout entries
CREATE TABLE workout_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL,
  notes TEXT,
  order_index INTEGER DEFAULT 0
);

-- Nutrition logs
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can CRUD own exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own workout entries" ON workout_entries
  FOR ALL USING (
    workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD own nutrition logs" ON nutrition_logs
  FOR ALL USING (auth.uid() = user_id);
```

## Data Import Format

Import data via JSON file on the `/import` page:

```json
{
  "exercises": [
    { "name": "Bench Press", "muscle_groups": ["Chest", "Triceps"] }
  ],
  "nutrition": [
    {
      "date": "2026-01-15",
      "calories": 2200,
      "protein": 150,
      "carbs": 200,
      "fat": 70
    }
  ],
  "workouts": [
    {
      "date": "2026-01-15",
      "notes": "Push day",
      "entries": [
        { "exercise": "Bench Press", "sets": 4, "reps": 8, "weight": 185 }
      ]
    }
  ]
}
```

## Deployment

The app auto-deploys to Vercel on push to `master`. For manual deployment:

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

## License

MIT
