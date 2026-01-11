import { useState, useEffect } from 'react'
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
import NutritionForm from './NutritionForm'

export default function NutritionList() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState(null)

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .order('date', { ascending: false })

    if (!error) {
      setLogs(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this nutrition log?')) return

    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)
    if (!error) {
      setLogs(logs.filter((l) => l.id !== id))
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
    return <div className="text-muted-foreground">Loading nutrition logs...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Nutrition</h2>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingLog(null)
          }}
        >
          {showForm ? 'Cancel' : 'Log Nutrition'}
        </Button>
      </div>

      {(showForm || editingLog) && (
        <NutritionForm
          existingLog={editingLog}
          onSuccess={() => {
            setShowForm(false)
            setEditingLog(null)
            fetchLogs()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingLog(null)
          }}
        />
      )}

      {logs.length === 0 ? (
        <p className="text-muted-foreground">No nutrition logs yet. Start tracking!</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Calories</TableHead>
                <TableHead className="text-right">Protein</TableHead>
                <TableHead className="text-right">Carbs</TableHead>
                <TableHead className="text-right">Fat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{formatDate(log.date)}</TableCell>
                  <TableCell className="text-right">
                    {log.calories ? `${log.calories} kcal` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.protein ? `${log.protein}g` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.carbs ? `${log.carbs}g` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.fat ? `${log.fat}g` : '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingLog(log)
                        setShowForm(false)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
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
