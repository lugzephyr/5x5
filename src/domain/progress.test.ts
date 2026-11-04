import { describe, expect, it } from 'vitest'
import { progressSeries } from './progress'
import type { Workout } from './types'

const workout = (date: number, weightKg: number, reps: (number | null)[]): Workout => ({
  id: crypto.randomUUID(),
  createdAt: 0,
  updatedAt: 0,
  type: 'A',
  date,
  finishedAt: date,
  exercises: [{ exerciseId: 'squat', weightKg, targetReps: 5, reps }],
})

describe('progressSeries', () => {
  const history = [
    workout(1, 60, [5, 5, 5, 5, 5]),
    workout(2, 62.5, [5, 5, 4, 3, 3]),
    workout(3, 62.5, [null, null, null, null, null]),
    workout(4, 62.5, [5, 5, 5, null, null]),
  ]

  it('lists lifted sessions from the given date with their result, leaving out fully skipped ones', () => {
    expect(progressSeries(history, 'squat')).toEqual([
      { date: 1, weightKg: 60, result: 'done' },
      { date: 2, weightKg: 62.5, result: 'missed' },
      { date: 4, weightKg: 62.5, result: 'skipped' },
    ])
    expect(progressSeries(history, 'squat', 2).map((p) => p.date)).toEqual([2, 4])
  })
})
