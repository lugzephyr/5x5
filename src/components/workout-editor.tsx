import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EXERCISES, setResult } from '@/domain/program'
import type { Unit, WorkoutExercise } from '@/domain/types'
import { WeightDialog } from '@/components/weight-dialog'
import { cn } from '@/lib/utils'

interface Props {
  exercises: WorkoutExercise[]
  unit: Unit
  onTapSet: (exerciseIndex: number, setIndex: number) => void
  onChangeWeight: (exerciseIndex: number, weightKg: number) => void
}

export function WorkoutEditor({ exercises, unit, onTapSet, onChangeWeight }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {exercises.map((exercise, exerciseIndex) => {
        const { name } = EXERCISES[exercise.exerciseId]
        return (
          <Card key={exercise.exerciseId}>
            <CardHeader>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription>
                {exercise.reps.length}×{exercise.targetReps}
              </CardDescription>
              <CardAction>
                <WeightDialog
                  title={name}
                  weightKg={exercise.weightKg}
                  unit={unit}
                  onChange={(kg) => onChangeWeight(exerciseIndex, kg)}
                />
              </CardAction>
            </CardHeader>
            <CardContent className="flex gap-2">
              {exercise.reps.map((reps, setIndex) => (
                <SetButton
                  key={setIndex}
                  reps={reps}
                  targetReps={exercise.targetReps}
                  onClick={() => onTapSet(exerciseIndex, setIndex)}
                />
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface SetButtonProps {
  reps: number | null
  targetReps: number
  onClick: () => void
}

function SetButton({ reps, targetReps, onClick }: SetButtonProps) {
  const result = setResult(reps, targetReps)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={reps === null ? 'Log set' : `${reps} reps`}
      className={cn(
        'flex size-12 items-center justify-center rounded-full border-2 text-lg font-semibold transition-colors select-none',
        result === 'skipped' && 'border-border text-muted-foreground/50',
        result === 'done' && 'border-primary bg-primary text-primary-foreground',
        result === 'missed' && 'border-destructive bg-destructive/10 text-destructive',
      )}
    >
      {reps ?? targetReps}
    </button>
  )
}
