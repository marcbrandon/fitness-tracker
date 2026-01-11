import { useState, useEffect } from 'react'
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
    return <div className="text-muted-foreground">Loading workouts...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Workouts</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Log Workout'}
        </Button>
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
        <p className="text-muted-foreground">No workouts yet. Log your first workout!</p>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <Card key={workout.id}>
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
                      {workout.workout_entries?.length || 0} exercises
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                                {entry.exercises?.name || 'Unknown'}
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
