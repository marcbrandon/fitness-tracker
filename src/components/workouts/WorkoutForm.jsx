import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import WorkoutEntry from './WorkoutEntry'

const createEmptyEntry = () => ({
  id: crypto.randomUUID(),
  exercise_id: '',
  sets: '',
  reps: '',
  weight: '',
})

export default function WorkoutForm({ onSuccess, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [entries, setEntries] = useState([createEmptyEntry()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const addEntry = () => {
    setEntries([...entries, createEmptyEntry()])
  }

  const updateEntry = (id, updatedEntry) => {
    setEntries(entries.map((e) => (e.id === id ? updatedEntry : e)))
  }

  const removeEntry = (id) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id))
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
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Log Workout</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exercises
        </label>
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
        <button
          type="button"
          onClick={addEntry}
          className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          + Add Exercise
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Workout'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
