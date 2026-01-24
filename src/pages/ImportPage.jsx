import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImportPage() {
  const { user } = useAuth()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setError(null)
    setResult(null)

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text)

      if (typeof data !== 'object') {
        throw new Error('Invalid JSON structure')
      }

      setPreview({
        exercises: Array.isArray(data.exercises) ? data.exercises.length : 0,
        nutrition: Array.isArray(data.nutrition) ? data.nutrition.length : 0,
        workouts: Array.isArray(data.workouts) ? data.workouts.length : 0,
        data,
      })
    } catch (err) {
      setError(err.message)
      setPreview(null)
    }
  }

  const handleImport = async () => {
    if (!preview?.data) return

    setImporting(true)
    setError(null)
    const { data } = preview
    const stats = { exercises: 0, nutrition: 0, workouts: 0 }

    try {
      // 1. Import exercises first (we need their IDs for workouts)
      const exerciseNameToId = {}

      if (data.exercises?.length > 0) {
        const { data: existing } = await supabase
          .from('exercises')
          .select('id, name')
          .eq('user_id', user.id)

        const existingByName = {}
        existing?.forEach((e) => {
          existingByName[e.name.toLowerCase()] = e
        })

        for (const exercise of data.exercises) {
          const key = exercise.name.toLowerCase()
          const existingExercise = existingByName[key]

          // Support both muscle_groups array and legacy muscle_group string
          let muscleGroups = exercise.muscle_groups
          if (!muscleGroups && exercise.muscle_group) {
            muscleGroups = [exercise.muscle_group]
          }

          if (existingExercise) {
            await supabase
              .from('exercises')
              .update({ muscle_group: muscleGroups || null })
              .eq('id', existingExercise.id)
            exerciseNameToId[key] = existingExercise.id
          } else {
            const { data: newExercise } = await supabase
              .from('exercises')
              .insert({
                user_id: user.id,
                name: exercise.name,
                muscle_group: muscleGroups || null,
              })
              .select()
              .single()

            if (newExercise) {
              exerciseNameToId[key] = newExercise.id
              existingByName[key] = newExercise
            }
          }
          stats.exercises++
        }
      }

      // Refresh exercise mapping to include all exercises (for workout entries)
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, name')
        .eq('user_id', user.id)

      allExercises?.forEach((e) => {
        exerciseNameToId[e.name.toLowerCase()] = e.id
      })

      // 2. Import nutrition (delete existing then insert)
      if (data.nutrition?.length > 0) {
        for (const log of data.nutrition) {
          // Delete existing record for this date
          await supabase
            .from('nutrition_logs')
            .delete()
            .eq('user_id', user.id)
            .eq('date', log.date)

          // Insert new record (round numbers to integers)
          const { error: nutritionError } = await supabase.from('nutrition_logs').insert({
            user_id: user.id,
            date: log.date,
            calories: log.calories != null ? Math.round(log.calories) : null,
            protein: log.protein != null ? Math.round(log.protein) : null,
            carbs: log.carbs != null ? Math.round(log.carbs) : null,
            fat: log.fat != null ? Math.round(log.fat) : null,
            notes: log.notes || null,
          })
          if (nutritionError) {
            throw new Error(`Nutrition import failed for ${log.date}: ${nutritionError.message}`)
          }
          stats.nutrition++
        }
      }

      // 3. Import workouts (replace by date)
      if (data.workouts?.length > 0) {
        for (const workout of data.workouts) {
          // Delete existing workout(s) for this date
          const { data: existingWorkouts } = await supabase
            .from('workouts')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', workout.date)

          if (existingWorkouts?.length > 0) {
            await supabase
              .from('workouts')
              .delete()
              .in(
                'id',
                existingWorkouts.map((w) => w.id)
              )
          }

          // Insert new workout
          const { data: newWorkout } = await supabase
            .from('workouts')
            .insert({
              user_id: user.id,
              date: workout.date,
              notes: workout.notes || null,
            })
            .select()
            .single()

          // Insert entries
          if (newWorkout && workout.entries?.length > 0) {
            const entries = workout.entries.map((entry, index) => {
              const exerciseId = exerciseNameToId[entry.exercise.toLowerCase()]
              return {
                workout_id: newWorkout.id,
                exercise_id: exerciseId || null,
                sets: entry.sets || null,
                reps: entry.reps || null,
                weight: entry.weight || null,
                order_index: index,
              }
            })
            await supabase.from('workout_entries').insert(entries)
          }
          stats.workouts++
        }
      }

      setResult(stats)
      setPreview(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-6">Import Data</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload JSON File</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90
              file:cursor-pointer"
          />

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {preview && (
            <div className="mt-4 space-y-3">
              <p className="font-medium">Preview:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{preview.exercises} exercise(s)</li>
                <li>{preview.nutrition} nutrition log(s)</li>
                <li>{preview.workouts} workout(s)</li>
              </ul>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-muted rounded">
              <p className="font-medium text-green-600">Import complete!</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>{result.exercises} exercise(s) processed</li>
                <li>{result.nutrition} nutrition log(s) processed</li>
                <li>{result.workouts} workout(s) processed</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
            {`{
  "exercises": [
    { "name": "Bench Press", "muscle_groups": ["Chest", "Triceps"] }
  ],
  "nutrition": [
    {
      "date": "2026-01-15",
      "calories": 2200,
      "protein": 150,
      "carbs": 200,
      "fat": 70,
      "notes": ""
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
}`}
          </pre>
        </CardContent>
      </Card>
    </Layout>
  )
}
