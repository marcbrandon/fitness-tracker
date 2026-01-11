import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFormStorage } from '@/hooks/useFormStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import WorkoutEntry from './WorkoutEntry'

const createEmptyEntry = () => ({
  id: crypto.randomUUID(),
  exercise_id: '',
  sets: '',
  reps: '',
  weight: '',
})

const getInitialFormState = () => ({
  date: new Date().toISOString().split('T')[0],
  notes: '',
  entries: [createEmptyEntry()],
})

export default function WorkoutForm({ onSuccess, onCancel }) {
  const [formData, setFormData, clearFormStorage] = useFormStorage('workout', getInitialFormState())
  const { date, notes, entries } = formData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const updateForm = (updates) => {
    setFormData({ ...formData, ...updates })
  }

  const addEntry = () => {
    updateForm({ entries: [...entries, createEmptyEntry()] })
  }

  const updateEntry = (id, updatedEntry) => {
    updateForm({ entries: entries.map((e) => (e.id === id ? updatedEntry : e)) })
  }

  const removeEntry = (id) => {
    if (entries.length > 1) {
      updateForm({ entries: entries.filter((e) => e.id !== id) })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const validEntries = entries.filter((entry) => entry.exercise_id)
    if (validEntries.length === 0) {
      setError('Please add at least one exercise')
      setLoading(false)
      return
    }

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        date,
        notes: notes || null,
      })
      .select()
      .single()

    if (workoutError) {
      setError(workoutError.message)
      setLoading(false)
      return
    }

    const workoutEntries = validEntries.map((entry, index) => ({
      workout_id: workout.id,
      exercise_id: entry.exercise_id,
      sets: entry.sets ? parseInt(entry.sets) : null,
      reps: entry.reps ? parseInt(entry.reps) : null,
      weight: entry.weight ? parseFloat(entry.weight) : null,
      order_index: index,
    }))

    const { error: entriesError } = await supabase
      .from('workout_entries')
      .insert(workoutEntries)

    if (entriesError) {
      setError(entriesError.message)
    } else {
      clearFormStorage()
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Log Workout</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => updateForm({ date: e.target.value })}
              className="w-auto"
            />
          </div>

          <div className="space-y-2">
            <Label>Exercises</Label>
            <div className="space-y-3">
              {entries.map((entry) => (
                <WorkoutEntry
                  key={entry.id}
                  entry={entry}
                  onChange={(updated) => updateEntry(entry.id, updated)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addEntry}>
              + Add Exercise
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Workout'}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
