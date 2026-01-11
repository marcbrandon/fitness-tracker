import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFormStorage } from '../../hooks/useFormStorage'

const getInitialFormState = () => ({
  date: new Date().toISOString().split('T')[0],
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
})

export default function NutritionForm({ existingLog, onSuccess, onCancel }) {
  // Only use local storage for new entries, not when editing
  const [storedData, setStoredData, clearFormStorage] = useFormStorage(
    'nutrition',
    getInitialFormState()
  )

  const initialData = existingLog
    ? {
        date: existingLog.date,
        calories: existingLog.calories || '',
        protein: existingLog.protein || '',
        carbs: existingLog.carbs || '',
        fat: existingLog.fat || '',
        notes: existingLog.notes || '',
      }
    : storedData

  const [formData, setFormData] = useState(initialData)
  const { date, calories, protein, carbs, fat, notes } = formData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const updateForm = (updates) => {
    const newData = { ...formData, ...updates }
    setFormData(newData)
    // Only persist to storage for new entries
    if (!existingLog) {
      setStoredData(newData)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = {
      user_id: user.id,
      date,
      calories: calories ? parseInt(calories) : null,
      protein: protein ? parseInt(protein) : null,
      carbs: carbs ? parseInt(carbs) : null,
      fat: fat ? parseInt(fat) : null,
      notes: notes || null,
    }

    let result
    if (existingLog) {
      result = await supabase
        .from('nutrition_logs')
        .update(data)
        .eq('id', existingLog.id)
    } else {
      result = await supabase.from('nutrition_logs').upsert(data, {
        onConflict: 'user_id,date',
      })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      clearFormStorage()
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">
        {existingLog ? 'Edit Nutrition Log' : 'Log Nutrition'}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => updateForm({ date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calories
          </label>
          <input
            type="number"
            value={calories}
            onChange={(e) => updateForm({ calories: e.target.value })}
            placeholder="kcal"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Protein (g)
          </label>
          <input
            type="number"
            value={protein}
            onChange={(e) => updateForm({ protein: e.target.value })}
            placeholder="grams"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carbs (g)
          </label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => updateForm({ carbs: e.target.value })}
            placeholder="grams"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fat (g)
          </label>
          <input
            type="number"
            value={fat}
            onChange={(e) => updateForm({ fat: e.target.value })}
            placeholder="grams"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
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
          {loading ? 'Saving...' : 'Save'}
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
