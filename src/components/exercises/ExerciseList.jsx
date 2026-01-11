import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    return <div className="text-muted-foreground">Loading exercises...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Exercise Library</h2>
      <ExerciseForm onSuccess={fetchExercises} />

      {exercises.length === 0 ? (
        <p className="text-muted-foreground">No exercises yet. Add one above!</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Muscle Group</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium">{exercise.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {exercise.muscle_group || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exercise.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
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
