import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFormStorage } from '../../hooks/useFormStorage'

const muscleGroups = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
  'Cardio',
  'Full Body',
]

const initialFormState = { name: '', muscleGroup: '' }

export default function ExerciseForm({ onSuccess }) {
  const [formData, setFormData, clearFormStorage] = useFormStorage('exercise', initialFormState)
  const { name, muscleGroup } = formData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const updateForm = (updates) => {
    setFormData({ ...formData, ...updates })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('exercises').insert({
      name,
      muscle_group: muscleGroup || null,
      user_id: user.id,
    })

    if (error) {
      setError(error.message)
    } else {
      clearFormStorage()
      setFormData(initialFormState)
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Add Exercise</h3>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            value={name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="Exercise name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="w-48">
          <select
            value={muscleGroup}
            onChange={(e) => updateForm({ muscleGroup: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select muscle group</option>
            {muscleGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </form>
  )
}
