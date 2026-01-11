import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
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
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const [workoutsRes, exercisesRes, nutritionRes, todayNutritionRes] =
        await Promise.all([
          supabase
            .from('workouts')
            .select('*, workout_entries(count)')
            .gte('date', weekAgo)
            .order('date', { ascending: false })
            .limit(5),
          supabase.from('exercises').select('id', { count: 'exact' }),
          supabase
            .from('nutrition_logs')
            .select('calories, protein')
            .gte('date', weekAgo),
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
        workoutsThisWeek: workouts.length,
        totalExercises: exerciseCount,
        avgCalories,
        avgProtein,
      })
      setRecentWorkouts(workouts)
      setTodayNutrition(todayNutritionRes.data)
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-gray-500">Loading dashboard...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">
            {stats.workoutsThisWeek}
          </div>
          <div className="text-sm text-gray-600">Workouts this week</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">
            {stats.totalExercises}
          </div>
          <div className="text-sm text-gray-600">Exercises in library</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-orange-600">
            {stats.avgCalories}
          </div>
          <div className="text-sm text-gray-600">Avg calories/day</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600">
            {stats.avgProtein}g
          </div>
          <div className="text-sm text-gray-600">Avg protein/day</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Workouts</h3>
            <Link
              to="/workouts"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View all
            </Link>
          </div>
          {recentWorkouts.length === 0 ? (
            <p className="text-gray-500 text-sm">No workouts yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentWorkouts.map((workout) => (
                <li key={workout.id} className="py-2">
                  <div className="font-medium">{formatDate(workout.date)}</div>
                  <div className="text-sm text-gray-600">
                    {workout.workout_entries?.[0]?.count || 0} exercises
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Today's Nutrition</h3>
            <Link
              to="/nutrition"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {todayNutrition ? 'Edit' : 'Log'}
            </Link>
          </div>
          {todayNutrition ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {todayNutrition.calories || 0}
                </div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {todayNutrition.protein || 0}g
                </div>
                <div className="text-sm text-gray-600">Protein</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {todayNutrition.carbs || 0}g
                </div>
                <div className="text-sm text-gray-600">Carbs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {todayNutrition.fat || 0}g
                </div>
                <div className="text-sm text-gray-600">Fat</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              No nutrition logged for today.{' '}
              <Link to="/nutrition" className="text-blue-600 hover:underline">
                Log now
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
