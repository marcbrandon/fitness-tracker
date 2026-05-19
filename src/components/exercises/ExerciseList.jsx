import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ExerciseForm from './ExerciseForm'

export default function ExerciseList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)

  const selectedGroups = new Set(
    searchParams.get('filter')?.split(',').filter(Boolean) ?? []
  )

  const toggleGroup = (group) => {
    const next = new Set(selectedGroups)
    if (next.has(group)) {
      next.delete(group)
    } else {
      next.add(group)
    }
    if (next.size === 0) {
      setSearchParams({})
    } else {
      setSearchParams({ filter: [...next].join(',') })
    }
  }

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*, workout_entries(count), user_exercise_library!inner(user_id)')
      .order('name')

    if (!error) {
      setExercises(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExercises()
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.detail?.type === 'exercise') fetchExercises() }
    window.addEventListener('fitness-data-changed', handler)
    return () => window.removeEventListener('fitness-data-changed', handler)
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Remove this exercise from your library?')) return

    const { error } = await supabase
      .from('user_exercise_library')
      .delete()
      .eq('exercise_id', id)

    if (!error) {
      setExercises(exercises.filter((e) => e.id !== id))
    }
  }

  const muscleGroups = [...new Set(exercises.flatMap((e) => e.muscle_group ?? []))].sort()
  const filtered = selectedGroups.size > 0
    ? exercises.filter((e) => e.muscle_group?.some((g) => selectedGroups.has(g)))
    : exercises

  if (loading) {
    return <div className="text-muted-foreground">Loading exercises...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{filtered.length} Exercises</h2>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingExercise(null)
          }}
        >
          {showForm ? 'Cancel' : 'Add Exercise'}
        </Button>
      </div>

      {muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {muscleGroups.map((group) => (
            <Button
              key={group}
              variant={selectedGroups.has(group) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleGroup(group)}
            >
              {group}
            </Button>
          ))}
        </div>
      )}

      {(showForm || editingExercise) && (
        <ExerciseForm
          existingExercise={editingExercise}
          onSuccess={() => {
            setShowForm(false)
            setEditingExercise(null)
            fetchExercises()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingExercise(null)
          }}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">
          {exercises.length === 0 ? 'No exercises yet. Add one above!' : 'No exercises match the selected filter.'}
        </p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Muscle Group</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/exercises/${exercise.id}${selectedGroups.size > 0 ? `?back_filter=${[...selectedGroups].join(',')}` : ''}`}
                      className="hover:text-primary hover:underline"
                    >
                      {exercise.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {exercise.muscle_group?.length > 0
                      ? exercise.muscle_group.join(', ')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {exercise.workout_entries?.[0]?.count || 0}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingExercise(exercise)
                        setShowForm(false)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exercise.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
