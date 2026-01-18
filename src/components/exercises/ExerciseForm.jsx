import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFormStorage } from '@/hooks/useFormStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

const initialFormState = { name: '', muscleGroups: [] }

export default function ExerciseForm({ existingExercise, onSuccess, onCancel }) {
  const [storedData, setStoredData, clearFormStorage] = useFormStorage('exercise', initialFormState)

  const initialData = existingExercise
    ? { name: existingExercise.name, muscleGroups: existingExercise.muscle_group || [] }
    : storedData

  const [formData, setFormData] = useState(initialData)
  const { name, muscleGroups: selectedGroups } = formData
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const updateForm = (updates) => {
    const newData = { ...formData, ...updates }
    setFormData(newData)
    if (!existingExercise) {
      setStoredData(newData)
    }
  }

  const toggleMuscleGroup = (group) => {
    const current = selectedGroups || []
    const updated = current.includes(group)
      ? current.filter((g) => g !== group)
      : [...current, group]
    updateForm({ muscleGroups: updated })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = {
      name,
      muscle_group: selectedGroups?.length > 0 ? selectedGroups : null,
    }

    let result
    if (existingExercise) {
      result = await supabase
        .from('exercises')
        .update(data)
        .eq('id', existingExercise.id)
    } else {
      result = await supabase.from('exercises').insert({
        ...data,
        user_id: user.id,
      })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      clearFormStorage()
      setFormData(initialFormState)
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{existingExercise ? 'Edit Exercise' : 'Add Exercise'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              value={name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="Exercise name"
              required
            />
          </div>
          <div>
            <Label className="mb-2 block">Muscle Groups</Label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleMuscleGroup(group)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedGroups?.includes(group)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : existingExercise ? 'Save' : 'Add'}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  )
}
