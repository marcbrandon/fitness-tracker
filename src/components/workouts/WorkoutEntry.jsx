import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ExerciseSelect from './ExerciseSelect'

export default function WorkoutEntry({ entry, onChange, onRemove }) {
  const handleChange = (field, value) => {
    onChange({ ...entry, [field]: value })
  }

  return (
    <div className="flex flex-wrap gap-3 items-start p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-48">
        <ExerciseSelect
          value={entry.exercise_id}
          onChange={(val) => handleChange('exercise_id', val)}
        />
      </div>
      <div className="w-20">
        <Input
          type="number"
          value={entry.sets}
          onChange={(e) => handleChange('sets', e.target.value)}
          placeholder="Sets"
          min="1"
        />
      </div>
      <div className="w-20">
        <Input
          type="number"
          value={entry.reps}
          onChange={(e) => handleChange('reps', e.target.value)}
          placeholder="Reps"
          min="1"
        />
      </div>
      <div className="w-24">
        <Input
          type="number"
          value={entry.weight}
          onChange={(e) => handleChange('weight', e.target.value)}
          placeholder="Weight"
          min="0"
          step="0.5"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive">
        Remove
      </Button>
    </div>
  )
}
