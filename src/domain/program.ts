import { differenceInCalendarDays } from 'date-fns'
import { startWeightKg, type SettingsValues } from './settings'
import type { ExerciseId, Rest, Workout, WorkoutExercise, WorkoutType } from './types'
import { roundToPlates } from './units'

export const EXERCISES: Record<ExerciseId, { name: string; sets: number; reps: number }> = {
  squat: { name: 'Squat', sets: 5, reps: 5 },
  bench: { name: 'Bench Press', sets: 5, reps: 5 },
  row: { name: 'Barbell Row', sets: 5, reps: 5 },
  ohp: { name: 'Overhead Press', sets: 5, reps: 5 },
  deadlift: { name: 'Deadlift', sets: 1, reps: 5 },
}

const WORKOUTS: Record<WorkoutType, ExerciseId[]> = {
  A: ['squat', 'bench', 'row'],
  B: ['squat', 'ohp', 'deadlift'],
}

export type WorkoutPlan = Pick<Workout, 'type' | 'exercises' | 'breakDeloadPercent'>

// `history` is always finished workouts, oldest first.

/**
 * A set is done (target reps), missed (fewer reps) or skipped (not logged).
 * An exercise is missed if any set missed, else skipped if any set was skipped, else done.
 */
export type Result = 'done' | 'missed' | 'skipped'

export function setResult(reps: number | null, targetReps: number): Result {
  if (reps === null) return 'skipped'
  return reps >= targetReps ? 'done' : 'missed'
}

/** No set logged at all: the exercise wasn't lifted. */
export function isFullySkipped(exercise: WorkoutExercise): boolean {
  return exercise.reps.every((r) => r === null)
}

/** Whether the exercise was actually lifted (any set logged) in any of these workouts. */
function wasLifted(exerciseId: ExerciseId, workouts: Workout[]): boolean {
  return workouts.some((w) =>
    w.exercises.some((e) => e.exerciseId === exerciseId && !isFullySkipped(e)),
  )
}

export function exerciseResult(exercise: WorkoutExercise): Result {
  const results = exercise.reps.map((r) => setResult(r, exercise.targetReps))
  if (results.includes('missed')) return 'missed'
  return results.includes('skipped') ? 'skipped' : 'done'
}

/**
 * Done adds the increment. Missed or skipped repeats the weight. Enough missed
 * sessions in a row at the same weight deload by a percentage; skipped ones don't count.
 * A break deload recorded after the exercise was last done lowers it once more.
 */
export function nextWeightKg(
  exerciseId: ExerciseId,
  history: Workout[],
  settings: SettingsValues,
): number {
  const weight = progressedWeightKg(exerciseId, history, settings)
  if (!wasLifted(exerciseId, history)) return weight
  // Any later session, even a skipped one, already carries the lowered weight
  const lastIndex = history.findLastIndex((w) =>
    w.exercises.some((e) => e.exerciseId === exerciseId),
  )
  const percent = history
    .slice(lastIndex + 1)
    .findLast((w) => w.breakDeloadPercent)?.breakDeloadPercent
  return percent ? deloadKg(weight, percent, settings) : weight
}

function progressedWeightKg(
  exerciseId: ExerciseId,
  history: Workout[],
  settings: SettingsValues,
): number {
  const sessions = history.flatMap((w) => w.exercises).filter((e) => e.exerciseId === exerciseId)
  const last = sessions.at(-1)
  const { incrementKg } = settings.exercises[exerciseId]

  if (!last) return startWeightKg(exerciseId, settings.unit)
  // A weight logged in the other unit (before switching units) becomes a loadable one
  const lastKg = roundToPlates(last.weightKg, settings.unit)
  const result = exerciseResult(last)
  if (result === 'done') return lastKg + incrementKg
  if (result === 'skipped') return lastKg

  let misses = 0
  for (const s of sessions.toReversed()) {
    const r = exerciseResult(s)
    if (s.weightKg !== last.weightKg || r === 'done') break
    if (r === 'missed') misses++
  }
  if (misses < settings.missesBeforeDeload) return lastKg
  return deloadKg(lastKg, settings.deloadPercent, settings)
}

/** Lowers a weight by a percentage, rounded down to loadable plates and never below the bar. */
function deloadKg(weightKg: number, percent: number, settings: SettingsValues): number {
  const deloaded = roundToPlates(weightKg * (1 - percent / 100), settings.unit, Math.floor)
  return Math.max(deloaded, settings.barWeightKg)
}

/** Suggested deload after a break: 5% per full week off, up to 20%. */
export function breakDeloadPercent(daysOff: number): number {
  return Math.min(20, 5 * Math.max(1, Math.floor(daysOff / 7)))
}

/** Calendar days since the last workout, or null with no history. */
export function daysSinceLastWorkout(history: Workout[], now: number): number | null {
  const last = history.at(-1)
  return last ? differenceInCalendarDays(now, last.date) : null
}

/**
 * Workouts alternate A and B unless `type` is chosen. With `breakDeloadPercent`, every
 * exercise that has history is lowered (the first workout after a break).
 */
export function planWorkout(
  history: Workout[],
  settings: SettingsValues,
  type: WorkoutType = history.at(-1)?.type === 'A' ? 'B' : 'A',
  breakDeloadPercent?: number,
): WorkoutPlan {
  const deload = (exerciseId: ExerciseId, kg: number) =>
    breakDeloadPercent && wasLifted(exerciseId, history)
      ? deloadKg(kg, breakDeloadPercent, settings)
      : kg
  return {
    type,
    breakDeloadPercent,
    exercises: WORKOUTS[type].map((exerciseId) => ({
      exerciseId,
      weightKg: deload(exerciseId, nextWeightKg(exerciseId, history, settings)),
      targetReps: EXERCISES[exerciseId].reps,
      reps: Array<null>(EXERCISES[exerciseId].sets).fill(null),
    })),
  }
}

/** Tapping a set cycles: skipped → target → target-1 → … → 0 → skipped. */
export function nextReps(reps: number | null, targetReps: number): number | null {
  if (reps === null) return targetReps
  return reps === 0 ? null : reps - 1
}

export function changeWeight(
  workout: Pick<Workout, 'exercises'>,
  exerciseIndex: number,
  weightKg: number,
): Pick<Workout, 'exercises'> {
  return {
    exercises: workout.exercises.map((e, i) => (i === exerciseIndex ? { ...e, weightKg } : e)),
  }
}

/** No skipped sets left. */
export function isComplete(exercises: WorkoutExercise[]): boolean {
  return exercises.every((e) => e.reps.every((r) => r !== null))
}

/** Logs a tap on a set and works out the rest timer that follows it. */
export function tapSet(
  workout: Pick<Workout, 'exercises' | 'rest'>,
  exerciseIndex: number,
  setIndex: number,
  settings: SettingsValues,
  now: number,
): Pick<Workout, 'exercises' | 'rest'> {
  const exercise = workout.exercises[exerciseIndex]
  const reps = nextReps(exercise.reps[setIndex], exercise.targetReps)
  const exercises = workout.exercises.map((e, i) =>
    i === exerciseIndex ? { ...e, reps: e.reps.with(setIndex, reps) } : e,
  )

  // A logged set restarts the rest, unless it corrects an exercise that was already finished
  let rest: Rest | undefined = workout.rest
  if (isComplete(exercises)) {
    rest = undefined
  } else if (reps !== null && !isComplete([exercise])) {
    // After an exercise's last set, the timer counts up until the next exercise starts
    const exerciseFinished = isComplete([exercises[exerciseIndex]])
    const seconds = exerciseFinished
      ? null
      : setResult(reps, exercise.targetReps) === 'done'
        ? settings.restSeconds
        : settings.restAfterMissSeconds
    rest = { startedAt: now, seconds }
  }
  return { exercises, rest }
}
