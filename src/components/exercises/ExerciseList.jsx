import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ExerciseForm from './ExerciseForm'

export default function ExerciseList() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name')

    if (!error) {
      setExercises(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExercises()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this exercise?')) return

    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (!error) {
      setExercises(exercises.filter((e) => e.id !== id))
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading exercises...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Exercise Library</h2>
      <ExerciseForm onSuccess={fetchExercises} />

      {exercises.length === 0 ? (
        <p className="text-gray-500">No exercises yet. Add one above!</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Exercise
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Muscle Group
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {exercises.map((exercise) => (
                <tr key={exercise.id}>
                  <td className="px-4 py-3">{exercise.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {exercise.muscle_group || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
