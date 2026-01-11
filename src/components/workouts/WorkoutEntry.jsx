import ExerciseSelect from './ExerciseSelect'

export default function WorkoutEntry({ entry, onChange, onRemove }) {
  const handleChange = (field, value) => {
    onChange({ ...entry, [field]: value })
  }

  return (
    <div className="flex flex-wrap gap-3 items-start p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-48">
        <ExerciseSelect
          value={entry.exercise_id}
          onChange={(val) => handleChange('exercise_id', val)}
        />
      </div>
      <div className="w-20">
        <input
          type="number"
          value={entry.sets}
          onChange={(e) => handleChange('sets', e.target.value)}
          placeholder="Sets"
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="w-20">
        <input
          type="number"
          value={entry.reps}
          onChange={(e) => handleChange('reps', e.target.value)}
          placeholder="Reps"
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="w-24">
        <input
          type="number"
          value={entry.weight}
          onChange={(e) => handleChange('weight', e.target.value)}
          placeholder="Weight"
          min="0"
          step="0.5"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="px-3 py-2 text-red-600 hover:text-red-800"
      >
        Remove
      </button>
    </div>
  )
}
