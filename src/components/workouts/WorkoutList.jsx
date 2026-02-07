import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import WorkoutForm from './WorkoutForm'

export default function WorkoutList() {
  const [searchParams] = useSearchParams()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [expandedWorkout, setExpandedWorkout] = useState(null)

  const workoutRefs = useRef({})

  // Auto-expand workout from URL parameter and scroll to it
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId) {
      setExpandedWorkout(expandId)
    }
  }, [searchParams])

  // Scroll to expanded workout after workouts load
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && workouts.length > 0 && workoutRefs.current[expandId]) {
      workoutRefs.current[expandId].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [workouts, searchParams])

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
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading workouts...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Workouts</h2>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingWorkout(null)
          }}
        >
          {showForm ? 'Cancel' : 'Log Workout'}
        </Button>
      </div>

      {(showForm || editingWorkout) && (
        <WorkoutForm
          existingWorkout={editingWorkout}
          onSuccess={() => {
            setShowForm(false)
            setEditingWorkout(null)
            fetchWorkouts()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingWorkout(null)
          }}
        />
      )}

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">No workouts yet. Log your first workout!</p>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <Card key={workout.id} ref={(el) => (workoutRefs.current[workout.id] = el)} className="scroll-mt-5">
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() =>
                  setExpandedWorkout(
                    expandedWorkout === workout.id ? null : workout.id
                  )
                }
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{formatDate(workout.date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Set(workout.workout_entries?.map(e => e.exercise_id)).size || 0} exercises{workout.notes && `, ${workout.notes}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingWorkout(workout)
                        setShowForm(false)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(workout.id)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                    <span className="text-muted-foreground">
                      {expandedWorkout === workout.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {expandedWorkout === workout.id && (
                <CardContent className="pt-0">
                  {workout.workout_entries?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exercise</TableHead>
                          <TableHead>Sets</TableHead>
                          <TableHead>Reps</TableHead>
                          <TableHead>Weight</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workout.workout_entries
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                {entry.exercise_id ? (
                                  <Link
                                    to={`/exercises/${entry.exercise_id}`}
                                    className="hover:text-primary hover:underline"
                                  >
                                    {entry.exercises?.name || 'Unknown'}
                                  </Link>
                                ) : (
                                  entry.exercises?.name || 'Unknown'
                                )}
                              </TableCell>
                              <TableCell>{entry.sets || '-'}</TableCell>
                              <TableCell>{entry.reps || '-'}</TableCell>
                              <TableCell>
                                {entry.weight ? `${entry.weight} lbs` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No exercises recorded</p>
                  )}
                  {workout.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      <strong>Notes:</strong> {workout.notes}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
