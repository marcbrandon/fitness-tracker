#!/usr/bin/env node
// Seed a dedicated test account with realistic fake data.
//
//   node --env-file=.env.local scripts/seed-test-account.mjs           # seed (only if empty)
//   node --env-file=.env.local scripts/seed-test-account.mjs --reset   # wipe seeded data, then reseed
//
// Requires in .env.local (gitignored):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD
//
// Runs as the test user through the normal anon key + RLS, so it can only ever
// touch that user's rows. As an extra guard, --reset only deletes data from an
// account this script has marked as seeded (user_metadata.seed_test_account) —
// pointing it at a real account with real data aborts instead of wiping it.

import { createClient } from '@supabase/supabase-js'

const WEEKS = 16
const SEED_MARK = 'seed_test_account'
const reset = process.argv.includes('--reset')

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD } = process.env
for (const [k, v] of Object.entries({ VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD })) {
  if (!v) die(`Missing ${k}. Add it to .env.local and run with: node --env-file=.env.local ${process.argv[1]}`)
}

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function must({ data, error }, what) {
  if (error) die(`${what}: ${error.message}`)
  return data
}

// Deterministic PRNG so every seed produces the same data
let rngState = 0x5eed
function rand() {
  rngState = (rngState * 1664525 + 1013904223) >>> 0
  return rngState / 2 ** 32
}
const between = (min, max) => min + Math.floor(rand() * (max - min + 1))
const roundTo = (n, step) => Math.round(n / step) * step

const isoDate = (d) => d.toISOString().slice(0, 10)

// --- Exercise catalogue -------------------------------------------------------
// start/gain: weight (lb) or reps/seconds at week 0, and progression per week
const EXERCISES = {
  'Bench Press':            { type: 'weighted',   muscle_group: ['Chest', 'Triceps'],    start: 135, gain: 2.5, reps: [5, 8] },
  'Overhead Press':         { type: 'weighted',   muscle_group: ['Shoulders', 'Triceps'], start: 85,  gain: 1.25, reps: [5, 8] },
  'Incline Dumbbell Press': { type: 'weighted',   muscle_group: ['Chest', 'Shoulders'],  start: 45,  gain: 1.25, reps: [8, 12] },
  'Tricep Pushdown':        { type: 'weighted',   muscle_group: ['Triceps'],             start: 40,  gain: 1.25, reps: [10, 15] },
  'Dips':                   { type: 'bodyweight', muscle_group: ['Chest', 'Triceps'],    start: 8,   gain: 0.4, reps: null },
  'Deadlift':               { type: 'weighted',   muscle_group: ['Back', 'Legs'],        start: 185, gain: 5, reps: [3, 5] },
  'Barbell Row':            { type: 'weighted',   muscle_group: ['Back', 'Biceps'],      start: 115, gain: 2.5, reps: [6, 10] },
  'Pull-up':                { type: 'bodyweight', muscle_group: ['Back', 'Biceps'],      start: 5,   gain: 0.3, reps: null },
  'Assisted Pull-up':       { type: 'assisted',   muscle_group: ['Back', 'Biceps'],      start: 70,  gain: -2.5, reps: [6, 10] },
  'Bicep Curl':             { type: 'weighted',   muscle_group: ['Biceps'],              start: 25,  gain: 0.6, reps: [8, 12] },
  'Squat':                  { type: 'weighted',   muscle_group: ['Legs'],                start: 155, gain: 5, reps: [5, 8] },
  'Romanian Deadlift':      { type: 'weighted',   muscle_group: ['Legs', 'Back'],        start: 135, gain: 2.5, reps: [8, 10] },
  'Leg Press':              { type: 'weighted',   muscle_group: ['Legs'],                start: 270, gain: 7.5, reps: [10, 12] },
  'Plank':                  { type: 'timed',      muscle_group: ['Core'],                start: 45,  gain: 3, reps: null },
}

const ROUTINES = [
  { name: 'Push', exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Pushdown', 'Dips'] },
  { name: 'Pull', exercises: ['Deadlift', 'Barbell Row', 'Pull-up', 'Assisted Pull-up', 'Bicep Curl'] },
  { name: 'Legs', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Plank'] },
  { name: 'Upper', exercises: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Pull-up', 'Bicep Curl'] },
]
const WORKOUT_DAYS = [1, 2, 4, 5] // Mon, Tue, Thu, Fri
const NOTES = ['Felt strong', 'Low energy today', 'Short on time', 'New gym playlist helped', 'Slept badly', null, null, null, null, null]

// --- Main ---------------------------------------------------------------------
const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const { user } = must(
  await supabase.auth.signInWithPassword({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
  'Sign in'
)
console.log(`Signed in as test user ${user.id}`)

const countOf = async (table) => {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  if (error) die(`Count ${table}: ${error.message}`)
  return count
}
const existing = { workouts: await countOf('workouts'), nutrition_logs: await countOf('nutrition_logs') }
const hasData = existing.workouts > 0 || existing.nutrition_logs > 0
const isSeeded = user.user_metadata?.[SEED_MARK] === true

if (hasData && !reset) {
  die(`Account already has ${existing.workouts} workouts and ${existing.nutrition_logs} nutrition logs. Re-run with --reset to wipe and reseed.`)
}
if (hasData && !isSeeded) {
  die(`Refusing to reset: this account has data but was not created by this script (no ${SEED_MARK} flag). Is TEST_USER_EMAIL your real account?`)
}

if (hasData) {
  console.log('Resetting previously seeded data…')
  // workout_entries cascade from workouts
  must(await supabase.from('workouts').delete().eq('user_id', user.id), 'Delete workouts')
  must(await supabase.from('nutrition_logs').delete().eq('user_id', user.id), 'Delete nutrition logs')
  must(await supabase.from('user_exercise_library').delete().eq('user_id', user.id), 'Delete exercise library')
  must(await supabase.from('exercises').delete().eq('user_id', user.id), 'Delete own exercises')
}

// Mark before inserting so a half-finished seed can still be reset
must(await supabase.auth.updateUser({ data: { [SEED_MARK]: true } }), 'Mark account as seeded')

// Exercises: reuse an existing global exercise by name (as the app does), otherwise create one
const exerciseIds = {}
for (const [name, ex] of Object.entries(EXERCISES)) {
  const matches = must(
    await supabase.from('exercises').select('id, user_id').ilike('name', name).order('user_id', { nullsFirst: true }).limit(1),
    `Look up ${name}`
  )
  let id = matches[0]?.id
  if (!id) {
    id = must(
      await supabase.from('exercises').insert({ name, type: ex.type, muscle_group: ex.muscle_group, user_id: user.id }).select('id').single(),
      `Create ${name}`
    ).id
  }
  exerciseIds[name] = id
}
must(
  await supabase.from('user_exercise_library').upsert(
    Object.values(exerciseIds).map((exercise_id) => ({ exercise_id, user_id: user.id })),
    { onConflict: 'user_id,exercise_id', ignoreDuplicates: true }
  ),
  'Add exercises to library'
)
console.log(`Exercises: ${Object.keys(exerciseIds).length}`)

// Dates: the last WEEKS weeks, ending yesterday
const today = new Date()
today.setUTCHours(0, 0, 0, 0)
const start = new Date(today)
start.setUTCDate(start.getUTCDate() - WEEKS * 7)

const workouts = []
const plans = [] // entries per workout, parallel to `workouts`
let routineIdx = 0
for (let d = new Date(start); d < today; d.setUTCDate(d.getUTCDate() + 1)) {
  if (!WORKOUT_DAYS.includes(d.getUTCDay()) || rand() < 0.1) continue // ~10% skipped sessions
  const week = (d - start) / (7 * 86400000)
  const routine = ROUTINES[routineIdx++ % ROUTINES.length]
  workouts.push({ user_id: user.id, date: isoDate(d), routine: routine.name, notes: NOTES[between(0, NOTES.length - 1)] })

  const entries = []
  routine.exercises.forEach((name) => {
    const ex = EXERCISES[name]
    const progress = ex.start + ex.gain * week
    const sets = name === 'Deadlift' ? 3 : between(3, 4)
    for (let s = 0; s < sets; s++) {
      let reps, weight
      if (ex.type === 'timed') {
        reps = roundTo(progress + between(-10, 5), 5) // seconds, stored in reps
        weight = null
      } else if (ex.type === 'bodyweight') {
        reps = Math.max(1, Math.round(progress) - s + between(-1, 1))
        weight = null
      } else {
        reps = between(ex.reps[0], ex.reps[1]) - (s === sets - 1 ? between(0, 1) : 0)
        weight = Math.max(ex.type === 'assisted' ? 0 : 5, roundTo(progress, 5))
      }
      entries.push({ exercise_id: exerciseIds[name], sets: 1, reps, weight })
    }
  })
  plans.push(entries)
}

const inserted = must(await supabase.from('workouts').insert(workouts).select('id, date'), 'Insert workouts')
const idByDate = Object.fromEntries(inserted.map((w) => [w.date, w.id]))
const allEntries = workouts.flatMap((w, i) =>
  plans[i].map((e, order_index) => ({ ...e, workout_id: idByDate[w.date], order_index }))
)
must(await supabase.from('workout_entries').insert(allEntries), 'Insert workout entries')
console.log(`Workouts: ${inserted.length} (${allEntries.length} sets)`)

// Nutrition: most days, slightly higher on training days
const trainingDates = new Set(workouts.map((w) => w.date))
const nutrition = []
for (let d = new Date(start); d < today; d.setUTCDate(d.getUTCDate() + 1)) {
  if (rand() < 0.15) continue // ~15% of days not logged
  const trained = trainingDates.has(isoDate(d))
  const protein = between(140, 190)
  const fat = between(55, 90)
  const carbs = between(trained ? 200 : 140, trained ? 300 : 220)
  nutrition.push({
    user_id: user.id,
    date: isoDate(d),
    protein,
    fat,
    carbs,
    calories: roundTo(protein * 4 + carbs * 4 + fat * 9 + between(-60, 60), 10),
    notes: rand() < 0.08 ? 'Ate out' : null,
  })
}
must(await supabase.from('nutrition_logs').insert(nutrition), 'Insert nutrition logs')
console.log(`Nutrition logs: ${nutrition.length}`)

console.log(`✓ Seeded ${isoDate(start)} → ${isoDate(new Date(today - 86400000))}`)
