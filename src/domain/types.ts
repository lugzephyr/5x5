export type Unit = 'kg' | 'lb'
export type WorkoutType = 'A' | 'B'
export type ExerciseId = 'squat' | 'bench' | 'row' | 'ohp' | 'deadlift'

/** Fields every stored record has, so it can be synced later. */
export interface BaseRecord {
  id: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface WorkoutExercise {
  exerciseId: ExerciseId
  weightKg: number
  targetReps: number
  /** Reps per set; null means the set is skipped (not logged). */
  reps: (number | null)[]
}

export interface Rest {
  startedAt: number
  /** Target rest; null means no target (after an exercise's last set). */
  seconds: number | null
}

export interface Workout extends BaseRecord {
  type: WorkoutType
  date: number
  /** 0 while in progress, so the active workout can be found through the index. */
  finishedAt: number
  exercises: WorkoutExercise[]
  rest?: Rest
  /** Set on the first workout after a break when weights were lowered by this percentage. */
  breakDeloadPercent?: number
}

export interface Settings extends BaseRecord {
  unit: Unit
  barWeightKg: number
  exercises: Record<ExerciseId, { incrementKg: number }>
  restSeconds: number
  restAfterMissSeconds: number
  missesBeforeDeload: number
  deloadPercent: number
  /** Days without a workout before offering a deload; 0 turns it off. */
  breakDays: number
  sound: boolean
  keepScreenOn: boolean
}
