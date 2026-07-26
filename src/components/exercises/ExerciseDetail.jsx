import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ExerciseForm from './ExerciseForm'
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
  const [searchParams] = useSearchParams()
  const { theme } = useTheme()
  const [exercise, setExercise] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  // Capture "now" once at mount so time-range filtering stays pure and stable
  // across re-renders instead of calling Date.now() during render.
  const [now] = useState(() => Date.now())
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyName = () => {
    navigator.clipboard.writeText(exercise.name)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const backFilter = searchParams.get('back_filter')
  const backUrl = backFilter ? `/exercises?filter=${backFilter}` : '/exercises'

  const dotColor = theme === 'dark' ? '#ffffff' : '#000000'

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === 'workout' || e.detail?.type === 'exercise') setRefreshKey((k) => k + 1)
    }
    window.addEventListener('fitness-data-changed', handler)
    return () => window.removeEventListener('fitness-data-changed', handler)
  }, [])

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
  }, [id, refreshKey])

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
    return new Date(now - days * 24 * 60 * 60 * 1000)
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

  const exerciseType = exercise?.type || 'weighted'
  const isTimed = exerciseType === 'timed'
  const isBodyweight = exerciseType === 'bodyweight'
  const isAssisted = exerciseType === 'assisted'
  const hasWeight = !isTimed && !isBodyweight
  const yUnit = isTimed ? 's' : isBodyweight ? ' reps' : ' lbs'

  // Calculate stats
  const pr = (() => {
    if (filteredEntries.length === 0) return null
    if (isTimed || isBodyweight) {
      const max = Math.max(...filteredEntries.map((e) => e.reps || 0))
      return max > 0 ? max : null
    }
    if (isAssisted) {
      const vals = filteredEntries.map((e) => e.weight).filter((w) => w > 0)
      return vals.length > 0 ? Math.min(...vals) : null
    }
    const max = Math.max(...filteredEntries.map((e) => e.weight || 0))
    return max > 0 ? max : null
  })()

  const prLabel = isTimed
    ? 'Best Time'
    : isBodyweight
      ? 'Best Reps'
      : isAssisted
        ? 'Best (least assist)'
        : 'Personal Record'

  const totalSessions = filteredEntries.length

  const totalVolume = hasWeight
    ? filteredEntries.reduce(
        (sum, e) => sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 0),
        0,
      )
    : null

  const lastPerformed = entries.length > 0
    ? entries[entries.length - 1]?.workouts?.date
    : null

  // Chart data - use index to ensure unique keys
  const chartValue = (entry) => hasWeight ? Number(entry.weight) : Number(entry.reps)
  const chartData = filteredEntries
    .filter((e) => hasWeight ? e.weight > 0 : e.reps > 0)
    .map((entry, index) => ({
      index,
      date: formatShortDate(entry.workouts?.date),
      value: chartValue(entry),
      reps: entry.reps,
      sets: entry.sets,
    }))

  // Encode rep count as dot opacity: fewer reps = more transparent (more gray).
  // 6+ reps hits full brightness. Only applies to weighted/assisted — for
  // timed/bodyweight, the y-axis IS reps (or seconds), so the encoding would be
  // redundant.
  const repOpacity = (reps) => {
    if (!reps || reps < 1) return 1
    const clamped = Math.min(reps, 6)
    return 0.3 + ((clamped - 1) / 5) * 0.7
  }

  // Render callbacks (not components) so recharts gets a plain <circle> element
  // per point without a new component identity being created each render.
  const renderRepDot = (props) => {
    const { cx, cy, payload, index } = props
    if (cx == null || cy == null) return null
    const opacity = hasWeight ? repOpacity(payload?.reps) : 1
    return <circle key={index} cx={cx} cy={cy} r={4} fill={dotColor} opacity={opacity} />
  }

  const renderRepActiveDot = (props) => {
    const { cx, cy, payload, index } = props
    if (cx == null || cy == null) return null
    const opacity = hasWeight ? repOpacity(payload?.reps) : 1
    return <circle key={index} cx={cx} cy={cy} r={6} fill={dotColor} opacity={opacity} />
  }

  const chartTitle = isTimed
    ? 'Time Progression'
    : isBodyweight
      ? 'Reps Progression'
      : 'Weight Progression'
  const yLabel = isTimed ? 'Seconds' : isBodyweight ? 'Reps' : 'Weight'
  const repsColumnLabel = isTimed ? 'Seconds' : 'Reps'

  // Recent sessions (reverse for most recent first)
  const recentSessions = [...filteredEntries].reverse()

  if (loading) {
    return <div className="text-muted-foreground">Loading exercise details...</div>
  }

  if (!exercise) {
    return (
      <div>
        <p className="text-muted-foreground mb-4">Exercise not found</p>
        <Link to={backUrl} className="text-primary hover:underline">
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
          to={backUrl}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          &larr; Back to exercises
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-bold cursor-pointer select-none"
              onClick={copyName}
              title="Tap to copy"
            >
              {exercise.name}
              {copied && <span className="ml-2 text-sm font-normal text-muted-foreground">Copied!</span>}
            </h2>
            {exercise.muscle_group && exercise.muscle_group.length > 0 && (
              <div className="flex gap-2 mt-2">
                {exercise.muscle_group.map((group) => (
                  <span key={group} className="text-sm bg-muted px-2 py-1 rounded">
                    {group}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      {editing && (
        <ExerciseForm
          existingExercise={exercise}
          onSuccess={() => {
            setEditing(false)
            setRefreshKey((k) => k + 1)
          }}
          onCancel={() => setEditing(false)}
        />
      )}

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
              {pr !== null ? `${pr}${yUnit}` : '-'}
            </div>
            <div className="text-sm text-muted-foreground">{prLabel}</div>
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
              {hasWeight && totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
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
            <CardTitle>{chartTitle}</CardTitle>
            {hasWeight && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>Reps:</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, opacity: 0.3 }} />
                  <span>1</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, opacity: 0.65 }} />
                  <span>3</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, opacity: 1 }} />
                  <span>6+</span>
                </span>
              </div>
            )}
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
                  labelFormatter={(index) => {
                    const d = chartData[index]
                    if (!d) return ''
                    if (!hasWeight) return d.date
                    const parts = [d.date]
                    if (d.sets && d.reps) parts.push(`${d.sets}×${d.reps}`)
                    else if (d.reps) parts.push(`${d.reps} reps`)
                    return parts.join(' — ')
                  }}
                  formatter={(value) => [`${value}${yUnit}`, yLabel]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={renderRepDot}
                  activeDot={renderRepActiveDot}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.length === 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
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
                  <TableHead>{repsColumnLabel}</TableHead>
                  {hasWeight && <TableHead>Weight</TableHead>}
                  {hasWeight && <TableHead>Volume</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.workouts?.date)}</TableCell>
                    <TableCell>{entry.sets || '-'}</TableCell>
                    <TableCell>
                      {entry.reps ? (isTimed ? `${entry.reps}s` : entry.reps) : '-'}
                    </TableCell>
                    {hasWeight && (
                      <TableCell>
                        {entry.weight ? `${entry.weight} lbs` : '-'}
                      </TableCell>
                    )}
                    {hasWeight && (
                      <TableCell>
                        {entry.sets && entry.reps && entry.weight
                          ? (entry.sets * entry.reps * entry.weight).toLocaleString()
                          : '-'}
                      </TableCell>
                    )}
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
