import { supabase } from '@/lib/supabase'

export const TOOL_DEFINITIONS = [
  {
    name: 'get_recent_workouts',
    description: 'Retrieve recent workouts with all exercise entries. Use this to check workout history.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of workouts to retrieve (default 10, max 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'log_workout',
    description: 'Create a new workout with exercise entries. Use get_exercises first to find exercise IDs.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
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
              exercise_id: { type: 'string', description: 'UUID of the exercise' },
              sets: { type: 'number', description: 'Number of sets' },
              reps: { type: 'number', description: 'Number of reps per set' },
              weight: { type: 'number', description: 'Weight in lbs' },
              notes: { type: 'string', description: 'Optional notes for this entry' },
            },
            required: ['exercise_id'],
          },
        },
      },
      required: ['date', 'entries'],
    },
  },
  {
    name: 'update_workout',
    description: 'Update an existing workout notes or date.',
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string', description: 'UUID of the workout to update' },
        date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
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
    name: 'get_exercises',
    description: 'Get all available exercises in the user\'s library. Use this to find exercise IDs before logging workouts.',
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
        muscle_group: { type: 'string', description: 'Primary muscle group (e.g., "chest", "back", "legs")' },
        description: { type: 'string', description: 'Optional description of the exercise' },
      },
      required: ['name', 'muscle_group'],
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
          description: 'Number of days to retrieve (default 7, max 30)',
        },
      },
      required: [],
    },
  },
]

export async function executeTool(name, input) {
  switch (name) {
    case 'get_recent_workouts': {
      const limit = Math.min(input.limit ?? 10, 50)
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_entries (
            *,
            exercises (name, muscle_group)
          )
        `)
        .order('date', { ascending: false })
        .limit(limit)

      if (error) return { error: error.message }
      return data
    }

    case 'log_workout': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({ date: input.date, notes: input.notes, user_id: user.id })
        .select()
        .single()

      if (workoutError) return { error: workoutError.message }

      if (input.entries?.length > 0) {
        const entries = input.entries.map((entry, i) => ({
          workout_id: workout.id,
          exercise_id: entry.exercise_id,
          sets: entry.sets,
          reps: entry.reps,
          weight: entry.weight,
          notes: entry.notes,
          order_index: i,
        }))

        const { error: entriesError } = await supabase
          .from('workout_entries')
          .insert(entries)

        if (entriesError) return { error: entriesError.message }
      }

      return { success: true, workout_id: workout.id, date: workout.date }
    }

    case 'update_workout': {
      const updates = {}
      if (input.date) updates.date = input.date
      if (input.notes !== undefined) updates.notes = input.notes

      const { error } = await supabase
        .from('workouts')
        .update(updates)
        .eq('id', input.workout_id)

      if (error) return { error: error.message }
      return { success: true }
    }

    case 'delete_workout': {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', input.workout_id)

      if (error) return { error: error.message }
      return { success: true }
    }

    case 'get_exercises': {
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (input.muscle_group) {
        query = query.ilike('muscle_group', `%${input.muscle_group}%`)
      }

      const { data, error } = await query
      if (error) return { error: error.message }
      return data
    }

    case 'add_exercise': {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: input.name,
          muscle_group: input.muscle_group,
          description: input.description,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) return { error: error.message }
      return { success: true, exercise_id: data.id, name: data.name }
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
      return { success: true, date: data.date }
    }

    case 'get_nutrition': {
      const limit = Math.min(input.limit ?? 7, 30)
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit)

      if (error) return { error: error.message }
      return data
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
