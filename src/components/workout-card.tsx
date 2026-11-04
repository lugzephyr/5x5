import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EXERCISES, exerciseResult, isFullySkipped } from '@/domain/program'
import type { Unit, Workout } from '@/domain/types'
import { formatWeight } from '@/domain/units'
import { formatWorkoutDuration } from '@/lib/time'
import { cn } from '@/lib/utils'

/** A finished workout's summary, linking to its detail page. */
export function WorkoutCard({ workout, unit }: { workout: Workout; unit: Unit }) {
  return (
    <Link to="/history/$workoutId" params={{ workoutId: workout.id }}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{format(workout.date, 'EEE, d MMM yyyy')}</CardTitle>
          <CardDescription>
            Workout {workout.type} · {formatWorkoutDuration(workout.date, workout.finishedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {workout.exercises.map((e) => {
            const result = exerciseResult(e)
            return (
              <div key={e.exerciseId} className="flex justify-between">
                <span>{EXERCISES[e.exerciseId].name}</span>
                <span
                  className={cn(
                    result === 'missed' && 'text-destructive',
                    result === 'skipped' && 'text-muted-foreground',
                  )}
                >
                  {isFullySkipped(e)
                    ? 'Skipped'
                    : `${e.reps.map((r) => r ?? '–').join('/')} · ${formatWeight(e.weightKg, unit)}`}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </Link>
  )
}
