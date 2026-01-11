import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFormStorage } from '@/hooks/useFormStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

export default function ExerciseForm({ existingExercise, onSuccess, onCancel }) {
  const [storedData, setStoredData, clearFormStorage] = useFormStorage('exercise', initialFormState)

  const initialData = existingExercise
    ? { name: existingExercise.name, muscleGroup: existingExercise.muscle_group || '' }
    : storedData

  const [formData, setFormData] = useState(initialData)
  const { name, muscleGroup } = formData
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = {
      name,
      muscle_group: muscleGroup || null,
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
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <Input
              type="text"
              value={name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="Exercise name"
              required
            />
          </div>
          <div className="w-48">
            <Select
              value={muscleGroup}
              onValueChange={(value) => updateForm({ muscleGroup: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Muscle group" />
              </SelectTrigger>
              <SelectContent>
                {muscleGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : existingExercise ? 'Save' : 'Add'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  )
}
