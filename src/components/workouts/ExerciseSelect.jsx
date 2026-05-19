import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ExerciseSelect({ value, onChange }) {
  const [exercises, setExercises] = useState([])

  useEffect(() => {
    const fetchExercises = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, type, user_exercise_library!inner(user_id)')
        .order('name')
      if (data) setExercises(data)
    }
    fetchExercises()
  }, [])

  return (
    <Select value={value} onValueChange={(id) => {
      const exercise = exercises.find((e) => e.id === id)
      onChange({ id, type: exercise?.type || 'weighted' })
    }}>
      <SelectTrigger>
        <SelectValue placeholder="Select exercise" />
      </SelectTrigger>
      <SelectContent>
        {exercises.map((exercise) => (
          <SelectItem key={exercise.id} value={exercise.id}>
            {exercise.name} {exercise.muscle_group?.length > 0 && `(${exercise.muscle_group.join(', ')})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
