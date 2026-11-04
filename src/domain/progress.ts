import { exerciseResult, isFullySkipped, type Result } from './program'
import type { ExerciseId, Workout } from './types'

export interface ProgressPoint {
  date: number
  weightKg: number
  result: Result
}

/** An exercise's lifted sessions from `since` on, oldest first; fully skipped ones are left out. */
export function progressSeries(
  history: Workout[],
  exerciseId: ExerciseId,
  since = 0,
): ProgressPoint[] {
  return history
    .filter((w) => w.date >= since)
    .flatMap((w) =>
      w.exercises
        .filter((e) => e.exerciseId === exerciseId && !isFullySkipped(e))
        .map((e) => ({ date: w.date, weightKg: e.weightKg, result: exerciseResult(e) })),
    )
}
