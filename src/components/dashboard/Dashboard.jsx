import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const timeRanges = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'week', label: 'This Week', days: 7 },
  { key: 'month', label: 'This Month', days: 30 },
  { key: 'year', label: 'This Year', days: 365 },
  { key: 'all', label: 'All Time', days: null },
]

function getStartDate(days) {
  if (days === null) return null
  if (days === 0) return new Date().toISOString().split('T')[0]
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('week')
  const [stats, setStats] = useState({
    workoutCount: 0,
    totalExercises: 0,
    avgCalories: 0,
    avgProtein: 0,
  })
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [todayNutrition, setTodayNutrition] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date().toISOString().split('T')[0]
      const startDate = getStartDate(
        timeRanges.find((r) => r.key === timeRange)?.days
      )

      // Build workout query
      let workoutQuery = supabase
        .from('workouts')
        .select('*, workout_entries(count)')
        .order('date', { ascending: false })
        .limit(5)

      if (startDate) {
        workoutQuery = workoutQuery.gte('date', startDate)
      }

      // Build nutrition query
      let nutritionQuery = supabase
        .from('nutrition_logs')
        .select('calories, protein')

      if (startDate) {
        nutritionQuery = nutritionQuery.gte('date', startDate)
      }

      const [workoutsRes, exercisesRes, nutritionRes, todayNutritionRes] =
        await Promise.all([
          workoutQuery,
          supabase.from('exercises').select('id', { count: 'exact' }),
          nutritionQuery,
          supabase
            .from('nutrition_logs')
            .select('*')
            .eq('date', today)
            .single(),
        ])

      const workouts = workoutsRes.data || []
      const exerciseCount = exercisesRes.count || 0
      const nutritionLogs = nutritionRes.data || []

      const avgCalories =
        nutritionLogs.length > 0
          ? Math.round(
              nutritionLogs.reduce((sum, l) => sum + (l.calories || 0), 0) /
                nutritionLogs.length
            )
          : 0

      const avgProtein =
        nutritionLogs.length > 0
          ? Math.round(
              nutritionLogs.reduce((sum, l) => sum + (l.protein || 0), 0) /
                nutritionLogs.length
            )
          : 0

      setStats({
        workoutCount: workouts.length,
        totalExercises: exerciseCount,
        avgCalories,
        avgProtein,
      })
      setRecentWorkouts(workouts)
      setTodayNutrition(todayNutritionRes.data)
      setLoading(false)
    }

    fetchDashboardData()
  }, [timeRange])

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  const rangeLabel = timeRanges.find((r) => r.key === timeRange)?.label || ''

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                timeRange === range.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">
              {stats.workoutCount}
            </div>
            <div className="text-sm text-muted-foreground">Workouts ({rangeLabel.toLowerCase()})</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              {stats.totalExercises}
            </div>
            <div className="text-sm text-muted-foreground">Exercises in library</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600">
              {stats.avgCalories}
            </div>
            <div className="text-sm text-muted-foreground">Avg cal/day ({rangeLabel.toLowerCase()})</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">
              {stats.avgProtein}g
            </div>
            <div className="text-sm text-muted-foreground">Avg protein/day ({rangeLabel.toLowerCase()})</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Workouts</CardTitle>
            <Link
              to="/workouts"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workouts yet</p>
            ) : (
              <ul className="divide-y">
                {recentWorkouts.map((workout) => (
                  <li key={workout.id} className="py-2">
                    <div className="font-medium">{formatDate(workout.date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {workout.workout_entries?.[0]?.count || 0} exercises
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today's Nutrition</CardTitle>
            <Link
              to="/nutrition"
              className="text-sm text-primary hover:underline"
            >
              {todayNutrition ? 'Edit' : 'Log'}
            </Link>
          </CardHeader>
          <CardContent>
            {todayNutrition ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {todayNutrition.calories || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {todayNutrition.protein || 0}g
                  </div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {todayNutrition.carbs || 0}g
                  </div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {todayNutrition.fat || 0}g
                  </div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No nutrition logged for today.{' '}
                <Link to="/nutrition" className="text-primary hover:underline">
                  Log now
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
