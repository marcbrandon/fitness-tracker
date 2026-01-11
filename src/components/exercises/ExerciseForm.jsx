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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Exercise</CardTitle>
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
            {loading ? 'Adding...' : 'Add'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  )
}
