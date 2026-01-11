import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      required
    >
      <option value="">Select exercise</option>
      {exercises.map((exercise) => (
        <option key={exercise.id} value={exercise.id}>
          {exercise.name} {exercise.muscle_group && `(${exercise.muscle_group})`}
        </option>
      ))}
    </select>
  )
}
