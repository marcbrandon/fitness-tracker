import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFormStorage } from '@/hooks/useFormStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const getInitialFormState = () => ({
  date: new Date().toISOString().split('T')[0],
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
})

export default function NutritionForm({ existingLog, onSuccess, onCancel }) {
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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          {existingLog ? 'Edit Nutrition Log' : 'Log Nutrition'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => updateForm({ date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Calories</Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => updateForm({ calories: e.target.value })}
                placeholder="kcal"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Protein (g)</Label>
              <Input
                type="number"
                value={protein}
                onChange={(e) => updateForm({ protein: e.target.value })}
                placeholder="grams"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                value={carbs}
                onChange={(e) => updateForm({ carbs: e.target.value })}
                placeholder="grams"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Fat (g)</Label>
              <Input
                type="number"
                value={fat}
                onChange={(e) => updateForm({ fat: e.target.value })}
                placeholder="grams"
                min="0"
              />
            </div>
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
              {loading ? 'Saving...' : 'Save'}
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
