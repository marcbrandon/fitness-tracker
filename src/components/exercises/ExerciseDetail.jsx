import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const timeRanges = [
  { key: 'month', label: 'Month', days: 30 },
  { key: 'year', label: 'Year', days: 365 },
  { key: 'all', label: 'All Time', days: null },
]

export default function ExerciseDetail() {
  const { id } = useParams()
  const [exercise, setExercise] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      const [exerciseRes, entriesRes] = await Promise.all([
        supabase.from('exercises').select('*').eq('id', id).single(),
        supabase
          .from('workout_entries')
          .select('*, workouts(date)')
          .eq('exercise_id', id),
      ])

      if (!exerciseRes.error) {
        setExercise(exerciseRes.data)
      }

      if (!entriesRes.error) {
        const sorted = (entriesRes.data || []).sort(
          (a, b) => new Date(a.workouts?.date) - new Date(b.workouts?.date)
        )
        setEntries(sorted)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getStartDate = (days) => {
    if (days === null) return null
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
  }

  const startDate = getStartDate(
    timeRanges.find((r) => r.key === timeRange)?.days
  )

  const filteredEntries = entries.filter((entry) => {
    if (!startDate) return true
    return entry.workouts?.date >= startDate
  })

  // Calculate stats
  const pr = filteredEntries.length > 0
    ? Math.max(...filteredEntries.map((e) => e.weight || 0))
    : 0

  const totalSessions = filteredEntries.length

  const totalVolume = filteredEntries.reduce(
    (sum, e) => sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 0),
    0
  )

  const lastPerformed = entries.length > 0
    ? entries[entries.length - 1]?.workouts?.date
    : null

  // Chart data - use index to ensure unique keys
  const chartData = filteredEntries
    .filter((e) => e.weight > 0)
    .map((entry, index) => ({
      index,
      date: formatShortDate(entry.workouts?.date),
      weight: Number(entry.weight),
    }))

  // Recent sessions (reverse for most recent first)
  const recentSessions = [...filteredEntries].reverse()

  if (loading) {
    return <div className="text-muted-foreground">Loading exercise details...</div>
  }

  if (!exercise) {
    return (
      <div>
        <p className="text-muted-foreground mb-4">Exercise not found</p>
        <Link to="/exercises" className="text-primary hover:underline">
          Back to exercises
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/exercises"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          &larr; Back to exercises
        </Link>
        <h2 className="text-2xl font-bold">{exercise.name}</h2>
        {exercise.muscle_group && exercise.muscle_group.length > 0 && (
          <div className="flex gap-2 mt-2">
            {exercise.muscle_group.map((group) => (
              <span
                key={group}
                className="text-sm bg-muted px-2 py-1 rounded"
              >
                {group}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {timeRanges.map((range) => (
          <Button
            key={range.key}
            variant={timeRange === range.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range.key)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {pr > 0 ? `${pr} lbs` : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Personal Record</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalSessions}</div>
            <div className="text-sm text-muted-foreground">Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Total Volume (lbs)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {lastPerformed ? formatShortDate(lastPerformed) : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Last Performed</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Weight Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="index"
                  tick={{ fill: 'currentColor', fontSize: '0.75rem' }}
                  tickFormatter={(index) => chartData[index]?.date || ''}
                />
                <YAxis
                  tick={{ fill: 'currentColor', fontSize: '0.75rem' }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                  labelFormatter={(index) => chartData[index]?.date || ''}
                  formatter={(value) => [`${value} lbs`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.length === 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Weight Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Log more sessions to see your progress chart.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground">No sessions logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.workouts?.date)}</TableCell>
                    <TableCell>{entry.sets || '-'}</TableCell>
                    <TableCell>{entry.reps || '-'}</TableCell>
                    <TableCell>
                      {entry.weight ? `${entry.weight} lbs` : '-'}
                    </TableCell>
                    <TableCell>
                      {entry.sets && entry.reps && entry.weight
                        ? (entry.sets * entry.reps * entry.weight).toLocaleString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
