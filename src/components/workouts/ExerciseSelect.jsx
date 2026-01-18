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
      const { data } = await supabase.from('exercises').select('*').order('name')
      if (data) setExercises(data)
    }
    fetchExercises()
  }, [])

  return (
    <Select value={value} onValueChange={onChange}>
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
