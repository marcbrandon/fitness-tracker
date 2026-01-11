import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
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
    return <div className="text-gray-500">Loading nutrition logs...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Nutrition</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingLog(null)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Log Nutrition'}
        </button>
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
        <p className="text-gray-500">No nutrition logs yet. Start tracking!</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Calories
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Protein
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Carbs
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Fat
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">{formatDate(log.date)}</td>
                  <td className="px-4 py-3 text-right">
                    {log.calories ? `${log.calories} kcal` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {log.protein ? `${log.protein}g` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {log.carbs ? `${log.carbs}g` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {log.fat ? `${log.fat}g` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingLog(log)
                        setShowForm(false)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
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
