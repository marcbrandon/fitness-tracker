import { supabase } from '@/lib/supabase'

const ROUTINES = ['Core', 'Legs', 'Push', 'Pull', 'Shoulders']

// Resolve an exercise name to { id, name }, scoped to the user's library so we
// don't accidentally match another user's exercise with a similar name.
// Tries exact match first, falls back to partial, returns error object on ambiguity or no match.
async function resolveExerciseName(name) {
  const trimmed = name.trim()
  const { data: exact, error: exactError } = await supabase
    .from('exercises')
    .select('id, name, user_exercise_library!inner(user_id)')
    .ilike('name', trimmed)
    .limit(2)

  if (exactError) return { error: exactError.message }

  if (exact?.length === 1) return { exercise: { id: exact[0].id, name: exact[0].name } }
  if (exact && exact.length > 1) {
    return {
      error: `Multiple exercises match "${name}" exactly — please clarify with an ID.`,
      matches: exact.map((m) => ({ id: m.id, name: m.name })),
    }
  }

  const { data: partial, error } = await supabase
    .from('exercises')
    .select('id, name, user_exercise_library!inner(user_id)')
    .ilike('name', `%${trimmed}%`)

  if (error) return { error: error.message }
  if (!partial?.length) return { error: `No exercise found matching "${name}". Use add_exercise to create it, or get_exercises to browse the library.` }
  if (partial.length > 1) return { error: `Multiple exercises match "${name}" — please clarify.`, matches: partial.map((m) => ({ id: m.id, name: m.name })) }
  return { exercise: { id: partial[0].id, name: partial[0].name } }
}

export const TOOL_DEFINITIONS = [
  {
    name: 'get_recent_workouts',
    description: 'Retrieve recent workouts with all exercise entries. Use this to check workout history. If the user asks about a specific date, pass that date. If the user asks about a specific routine (e.g. "last Push workout"), pass the routine to filter efficiently.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of workouts to retrieve (default 6, max 20)',
        },
        date: {
          type: 'string',
          description: 'Optional specific date in YYYY-MM-DD format. If provided, returns only the workout for that date.',
        },
        routine: {
          type: 'string',
          enum: ROUTINES,
          description: 'Optional filter by routine name. Returns the most recent workouts matching that routine.',
        },
      },
      required: [],
    },
  },
  {
    name: 'log_workout',
    description: 'Append new exercise entries to a workout for a given date. Each call must contain ONLY the exercise(s) explicitly mentioned in the user\'s most recent message — do not include exercises from earlier in the conversation even if you think they may not have been logged yet. When in doubt, log less. Creates the workout if it does not exist yet. Provide exercise_name — matched case-insensitively against the exercise library. If multiple exercises match, they will be returned for clarification.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
        routine: {
          type: 'string',
          enum: ROUTINES,
          description: 'Optional routine type',
        },
        notes: {
          type: 'string',
          description: 'Optional notes for the workout',
        },
        entries: {
          type: 'array',
          description: 'List of exercise entries',
          items: {
            type: 'object',
            properties: {
              exercise_name: { type: 'string', description: 'Name of the exercise — matched case-insensitively against the library' },
              sets: { type: 'number', description: 'Number of sets (default to 1 if not specified)' },
              reps: { type: 'number', description: 'Number of reps per set' },
              weight: { type: 'number', description: 'Weight in lbs' },
              notes: { type: 'string', description: 'Optional notes for this entry' },
            },
            required: ['exercise_name'],
          },
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'update_workout',
    description: 'Update an existing workout\'s date, routine, or notes.',
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string', description: 'UUID of the workout to update' },
        date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        routine: { type: 'string', description: 'New routine. Pass empty string to clear.', enum: [...ROUTINES, ''] },
        notes: { type: 'string', description: 'New notes for the workout' },
      },
      required: ['workout_id'],
    },
  },
  {
    name: 'delete_workout',
    description: 'Delete a workout and all its entries. Ask for confirmation before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string', description: 'UUID of the workout to delete' },
      },
      required: ['workout_id'],
    },
  },
  {
    name: 'update_workout_entry',
    description: 'Update a specific exercise entry within a workout. Use this to fix sets, reps, weight, notes, or the exercise itself. Entry IDs are returned by get_recent_workouts.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'UUID of the workout entry to update' },
        exercise_name: { type: 'string', description: 'New exercise name — matched case-insensitively. Provide this to change which exercise the entry is for.' },
        sets: { type: 'number', description: 'New number of sets' },
        reps: { type: 'number', description: 'New number of reps per set' },
        weight: { type: 'number', description: 'New weight in lbs' },
        notes: { type: 'string', description: 'New notes for this entry' },
      },
      required: ['entry_id'],
    },
  },
  {
    name: 'delete_workout_entry',
    description: 'Delete a single exercise entry from a workout without affecting other entries. Entry IDs are returned by get_recent_workouts.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'UUID of the workout entry to delete' },
      },
      required: ['entry_id'],
    },
  },
  {
    name: 'update_exercise',
    description: 'Update an exercise in the library — rename it, change its type, muscle group, or description.',
    input_schema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'UUID of the exercise to update' },
        name: { type: 'string', description: 'New name for the exercise' },
        type: { type: 'string', enum: ['weighted', 'bodyweight', 'timed', 'assisted'], description: 'New type' },
        muscle_group: { type: 'string', description: 'New muscle group' },
        description: { type: 'string', description: 'New description' },
      },
      required: ['exercise_id'],
    },
  },
  {
    name: 'get_exercises',
    description: 'Get all available exercises in the user\'s library. Use this to browse exercises or find IDs.',
    input_schema: {
      type: 'object',
      properties: {
        muscle_group: {
          type: 'string',
          description: 'Optional filter by muscle group',
        },
      },
      required: [],
    },
  },
  {
    name: 'add_exercise',
    description: 'Add a new exercise to the library.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the exercise' },
        type: { type: 'string', enum: ['weighted', 'bodyweight', 'timed', 'assisted'], description: 'Exercise type: "weighted" (sets/reps/weight, default), "bodyweight" (sets/reps, no weight — e.g. pull-ups, push-ups, dips), "timed" (sets/seconds, more is better — e.g. planks), or "assisted" (sets/reps/weight, less weight is better)' },
        muscle_group: { type: 'string', description: 'Primary muscle group (e.g., "chest", "back", "legs")' },
        description: { type: 'string', description: 'Optional description of the exercise' },
      },
      required: ['name', 'muscle_group'],
    },
  },
  {
    name: 'get_exercise_pr',
    description: 'Get the all-time personal record (heaviest weight) for a specific exercise. Use this when an exercise is mentioned during a workout so you can recognize a new PR if the user beats it.',
    input_schema: {
      type: 'object',
      properties: {
        exercise_name: {
          type: 'string',
          description: 'Name of the exercise — matched case-insensitively',
        },
      },
      required: ['exercise_name'],
    },
  },
  {
    name: 'log_nutrition',
    description: 'Log nutrition data for a specific date.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        calories: { type: 'number', description: 'Total calories' },
        protein: { type: 'number', description: 'Protein in grams' },
        carbs: { type: 'number', description: 'Carbohydrates in grams' },
        fat: { type: 'number', description: 'Fat in grams' },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['date', 'calories'],
    },
  },
  {
    name: 'get_nutrition',
    description: 'Get nutrition logs for recent dates.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of days to retrieve (default 7, max 14)',
        },
      },
      required: [],
    },
    cache_control: { type: 'ephemeral' },
  },
]

function notifyDataChanged(type) {
  window.dispatchEvent(new CustomEvent('fitness-data-changed', { detail: { type } }))
}

export async function executeTool(name, input) {
  switch (name) {
    case 'get_recent_workouts': {
      let query = supabase
        .from('workouts')
        .select(`
          id, date, routine, notes,
          workout_entries (
            id, sets, reps, weight, notes,
            exercises (name, muscle_group)
          )
        `)
        .order('date', { ascending: false })

      if (input.date) {
        query = query.eq('date', input.date)
      } else {
        if (input.routine) {
          query = query.eq('routine', input.routine)
        }
        query = query.limit(Math.min(input.limit ?? 6, 20))
      }

      const { data, error } = await query
      if (error) return { error: error.message }
      return data
    }

    case 'log_workout': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      // Resolve exercise names to IDs
      const resolvedEntries = []
      for (const entry of input.entries ?? []) {
        const result = await resolveExerciseName(entry.exercise_name)
        if (result.error) return result
        resolvedEntries.push({ ...entry, exercise_id: result.exercise.id })
      }

      // Check for an existing workout on this date to avoid duplicates.
      // Note: the DB should also enforce a UNIQUE(user_id, date) constraint on
      // workouts to prevent races between concurrent log_workout calls.
      const { data: existing } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', input.date)
        .maybeSingle()

      let workoutId
      const wasCreated = !existing
      if (existing) {
        workoutId = existing.id
        const workoutUpdates = {}
        if (input.notes !== undefined) workoutUpdates.notes = input.notes
        if (input.routine !== undefined) workoutUpdates.routine = input.routine || null
        if (Object.keys(workoutUpdates).length > 0) {
          await supabase.from('workouts').update(workoutUpdates).eq('id', workoutId)
        }
      } else {
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({ date: input.date, routine: input.routine || null, notes: input.notes, user_id: user.id })
          .select()
          .single()

        if (workoutError) {
          // Recover from the race: another concurrent call created the workout
          // between our check and insert. Re-fetch and continue.
          if (workoutError.code === '23505') {
            const { data: raced } = await supabase
              .from('workouts')
              .select('id')
              .eq('user_id', user.id)
              .eq('date', input.date)
              .maybeSingle()
            if (!raced) return { error: workoutError.message }
            workoutId = raced.id
          } else {
            return { error: workoutError.message }
          }
        } else {
          workoutId = workout.id
        }
      }

      if (resolvedEntries.length > 0) {
        // Append after any existing entries
        const { data: existingEntries } = await supabase
          .from('workout_entries')
          .select('order_index')
          .eq('workout_id', workoutId)
          .order('order_index', { ascending: false })
          .limit(1)

        const startIndex = existingEntries?.length > 0 ? existingEntries[0].order_index + 1 : 0

        const entries = resolvedEntries.map((entry, i) => ({
          workout_id: workoutId,
          exercise_id: entry.exercise_id,
          sets: entry.sets ?? 1,
          reps: entry.reps,
          weight: entry.weight,
          notes: entry.notes,
          order_index: startIndex + i,
        }))

        const { error: entriesError } = await supabase
          .from('workout_entries')
          .insert(entries)

        if (entriesError) return { error: entriesError.message }
      }

      notifyDataChanged('workout')
      return {
        success: true,
        workout_id: workoutId,
        date: input.date,
        created: wasCreated,
        entries_added: resolvedEntries.length,
      }
    }

    case 'update_workout': {
      const updates = {}
      if (input.date) updates.date = input.date
      if (input.routine !== undefined) updates.routine = input.routine || null
      if (input.notes !== undefined) updates.notes = input.notes

      const { error } = await supabase
        .from('workouts')
        .update(updates)
        .eq('id', input.workout_id)

      if (error) return { error: error.message }
      notifyDataChanged('workout')
      return { success: true }
    }

    case 'delete_workout': {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', input.workout_id)

      if (error) return { error: error.message }
      notifyDataChanged('workout')
      return { success: true }
    }

    case 'update_workout_entry': {
      const updates = {}

      if (input.exercise_name) {
        const result = await resolveExerciseName(input.exercise_name)
        if (result.error) return result
        updates.exercise_id = result.exercise.id
      }

      if (input.sets !== undefined) updates.sets = input.sets
      if (input.reps !== undefined) updates.reps = input.reps
      if (input.weight !== undefined) updates.weight = input.weight
      if (input.notes !== undefined) updates.notes = input.notes

      const { error } = await supabase
        .from('workout_entries')
        .update(updates)
        .eq('id', input.entry_id)

      if (error) return { error: error.message }
      notifyDataChanged('workout')
      return { success: true }
    }

    case 'delete_workout_entry': {
      const { error } = await supabase
        .from('workout_entries')
        .delete()
        .eq('id', input.entry_id)

      if (error) return { error: error.message }
      notifyDataChanged('workout')
      return { success: true }
    }

    case 'get_exercises': {
      let query = supabase
        .from('exercises')
        .select('id, name, type, muscle_group, description, user_exercise_library!inner(user_id)')
        .order('name')

      if (input.muscle_group) {
        query = query.ilike('muscle_group', `%${input.muscle_group}%`)
      }

      const { data, error } = await query
      if (error) return { error: error.message }
      return data
    }

    case 'update_exercise': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const updates = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.type !== undefined) updates.type = input.type
      if (input.muscle_group !== undefined) updates.muscle_group = [input.muscle_group.charAt(0).toUpperCase() + input.muscle_group.slice(1)]
      if (input.description !== undefined) updates.description = input.description

      // Check ownership — fork if global or another user's exercise
      const { data: existing } = await supabase
        .from('exercises')
        .select('id, user_id, name, muscle_group, description')
        .eq('id', input.exercise_id)
        .single()

      if (!existing) return { error: 'Exercise not found' }

      if (existing.user_id === user.id) {
        const { error } = await supabase.from('exercises').update(updates).eq('id', input.exercise_id)
        if (error) return { error: error.message }
      } else {
        const { data: fork, error: forkError } = await supabase
          .from('exercises')
          .insert({
            name: updates.name ?? existing.name,
            type: updates.type ?? existing.type ?? 'weighted',
            muscle_group: updates.muscle_group ?? existing.muscle_group,
            description: updates.description ?? existing.description,
            user_id: user.id,
          })
          .select()
          .single()
        if (forkError) return { error: forkError.message }

        const { error: libError } = await supabase
          .from('user_exercise_library')
          .update({ exercise_id: fork.id })
          .eq('exercise_id', input.exercise_id)
        if (libError) return { error: libError.message }
      }

      notifyDataChanged('exercise')
      return { success: true }
    }

    case 'add_exercise': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const muscleGroup = input.muscle_group
        ? [input.muscle_group.charAt(0).toUpperCase() + input.muscle_group.slice(1)]
        : []

      // Reuse existing global exercise if name matches exactly. Use limit(1) rather
      // than maybeSingle() so multiple same-name rows (owned by different users)
      // don't error out.
      const { data: existingRows } = await supabase
        .from('exercises')
        .select('id, name')
        .ilike('name', input.name.trim())
        .limit(1)
      const existing = existingRows?.[0]

      let exerciseId
      if (existing) {
        exerciseId = existing.id
      } else {
        const { data: created, error: createError } = await supabase
          .from('exercises')
          .insert({ name: input.name, type: input.type || 'weighted', muscle_group: muscleGroup, description: input.description, user_id: user.id })
          .select()
          .single()
        if (createError) return { error: createError.message }
        exerciseId = created.id
      }

      const { error: libError } = await supabase
        .from('user_exercise_library')
        .insert({ exercise_id: exerciseId, user_id: user.id })
      // Postgres unique_violation (23505) means the library row already exists —
      // that's fine, treat it as success.
      if (libError && libError.code !== '23505') return { error: libError.message }

      notifyDataChanged('exercise')
      return { success: true, exercise_id: exerciseId, name: existing?.name ?? input.name }
    }

    case 'get_exercise_pr': {
      const resolved = await resolveExerciseName(input.exercise_name)
      if (resolved.error) return resolved

      const { data: ex } = await supabase
        .from('exercises')
        .select('type')
        .eq('id', resolved.exercise.id)
        .single()

      const type = ex?.type || 'weighted'

      if (type === 'timed' || type === 'bodyweight') {
        const { data, error } = await supabase
          .from('workout_entries')
          .select('reps, workouts(date)')
          .eq('exercise_id', resolved.exercise.id)
          .order('reps', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) return { error: error.message }
        const prField = type === 'timed' ? 'pr_seconds' : 'pr_reps'
        return {
          exercise: resolved.exercise.name,
          type,
          [prField]: data?.reps ?? null,
          pr_date: data?.workouts?.date ?? null,
        }
      }

      if (type === 'assisted') {
        // Lower assistance weight = better PR. 0 = unassisted (best) so include it.
        const { data, error } = await supabase
          .from('workout_entries')
          .select('weight, workouts(date)')
          .eq('exercise_id', resolved.exercise.id)
          .not('weight', 'is', null)
          .order('weight', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (error) return { error: error.message }
        return { exercise: resolved.exercise.name, type, pr_weight: data?.weight ?? null, pr_date: data?.workouts?.date ?? null, note: 'Lower weight = less assistance = better' }
      }

      // weighted
      const { data, error } = await supabase
        .from('workout_entries')
        .select('weight, workouts(date)')
        .eq('exercise_id', resolved.exercise.id)
        .order('weight', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return { error: error.message }
      return { exercise: resolved.exercise.name, type, pr_weight: data?.weight ?? null, pr_date: data?.workouts?.date ?? null }
    }

    case 'log_nutrition': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { data, error } = await supabase
        .from('nutrition_logs')
        .upsert(
          {
            date: input.date,
            calories: input.calories,
            protein: input.protein,
            carbs: input.carbs,
            fat: input.fat,
            notes: input.notes,
            user_id: user.id,
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single()

      if (error) return { error: error.message }
      notifyDataChanged('nutrition')
      return { success: true, date: data.date }
    }

    case 'get_nutrition': {
      const limit = Math.min(input.limit ?? 7, 14)
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('date, calories, protein, carbs, fat, notes')
        .order('date', { ascending: false })
        .limit(limit)

      if (error) return { error: error.message }
      return data
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
