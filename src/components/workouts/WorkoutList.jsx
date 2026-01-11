import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import WorkoutForm from './WorkoutForm'

export default function WorkoutList() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedWorkout, setExpandedWorkout] = useState(null)

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_entries (
          *,
          exercises (name, muscle_group)
        )
      `)
      .order('date', { ascending: false })

    if (!error) {
      setWorkouts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout?')) return

    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (!error) {
      setWorkouts(workouts.filter((w) => w.id !== id))
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-gray-500">Loading workouts...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Workouts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Log Workout'}
        </button>
      </div>

      {showForm && (
        <WorkoutForm
          onSuccess={() => {
            setShowForm(false)
            fetchWorkouts()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {workouts.length === 0 ? (
        <p className="text-gray-500">No workouts yet. Log your first workout!</p>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <div key={workout.id} className="bg-white rounded-lg shadow">
              <div
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() =>
                  setExpandedWorkout(
                    expandedWorkout === workout.id ? null : workout.id
                  )
                }
              >
                <div>
                  <div className="font-semibold">{formatDate(workout.date)}</div>
                  <div className="text-sm text-gray-600">
                    {workout.workout_entries?.length || 0} exercises
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(workout.id)
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                  <span className="text-gray-400">
                    {expandedWorkout === workout.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedWorkout === workout.id && (
                <div className="border-t px-4 py-3">
                  {workout.workout_entries?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="pb-2">Exercise</th>
                          <th className="pb-2">Sets</th>
                          <th className="pb-2">Reps</th>
                          <th className="pb-2">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workout.workout_entries
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-1">
                                {entry.exercises?.name || 'Unknown'}
                              </td>
                              <td className="py-1">{entry.sets || '-'}</td>
                              <td className="py-1">{entry.reps || '-'}</td>
                              <td className="py-1">
                                {entry.weight ? `${entry.weight} lbs` : '-'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-sm">No exercises recorded</p>
                  )}
                  {workout.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      <strong>Notes:</strong> {workout.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
