import { describe, expect, it } from 'vitest'
import {
  breakDeloadPercent,
  daysSinceLastWorkout,
  isComplete,
  nextReps,
  nextWeightKg,
  planWorkout,
  tapSet,
} from './program'
import { defaultSettings, switchUnit } from './settings'
import { toUnit } from './units'
import type { ExerciseId, Workout, WorkoutType } from './types'

const settings = defaultSettings('kg')
const DONE = [5, 5, 5, 5, 5]
const MISSED = [5, 5, 4, 3, 3]

function workout(type: WorkoutType, exercises: [ExerciseId, number, (number | null)[]][]): Workout {
  return {
    id: crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    type,
    date: 0,
    finishedAt: 0,
    exercises: exercises.map(([exerciseId, weightKg, reps]) => ({
      exerciseId,
      weightKg,
      targetReps: 5,
      reps,
    })),
  }
}

const squat = (weightKg: number, reps: (number | null)[]) =>
  workout('A', [['squat', weightKg, reps]])

describe('nextWeightKg', () => {
  it('uses the starting weight with no history', () => {
    expect(nextWeightKg('row', [], settings)).toBe(30)
  })

  it('adds the increment after a done session', () => {
    expect(nextWeightKg('squat', [squat(60, DONE)], settings)).toBe(62.5)
  })

  it('adds the larger deadlift increment', () => {
    const history = [workout('B', [['deadlift', 100, [5]]])]
    expect(nextWeightKg('deadlift', history, settings)).toBe(105)
  })

  it('repeats the weight after a missed session', () => {
    expect(nextWeightKg('squat', [squat(60, MISSED)], settings)).toBe(60)
  })

  it('repeats the weight after skipped sets, or a fully skipped exercise', () => {
    expect(nextWeightKg('squat', [squat(60, [5, 5, 5, null, null])], settings)).toBe(60)
    const skipped = [squat(60, DONE), squat(62.5, [null, null, null, null, null])]
    expect(nextWeightKg('squat', skipped, settings)).toBe(62.5)
  })

  it('counts an exercise with a missed set as missed, even with skipped sets', () => {
    const missedAndSkipped = [5, 4, null, null, null]
    const history = [squat(60, missedAndSkipped), squat(60, MISSED), squat(60, MISSED)]
    expect(nextWeightKg('squat', history, settings)).toBe(52.5)
  })

  it("doesn't count skipped sessions toward a deload", () => {
    const history = [squat(60, MISSED), squat(60, MISSED), squat(60, [5, 5, null, null, null])]
    expect(nextWeightKg('squat', history, settings)).toBe(60)
    expect(nextWeightKg('squat', [...history, squat(60, MISSED)], settings)).toBe(52.5)
  })

  it('deloads after the configured misses in a row and rounds to plates', () => {
    const history = [squat(62.5, MISSED), squat(62.5, MISSED), squat(62.5, MISSED)]
    // 62.5 * 0.9 = 56.25 → 55
    expect(nextWeightKg('squat', history, settings)).toBe(55)
  })

  it('only counts misses at the current weight', () => {
    const history = [squat(60, MISSED), squat(62.5, MISSED), squat(62.5, MISSED)]
    expect(nextWeightKg('squat', history, settings)).toBe(62.5)
  })

  it('respects custom deload settings', () => {
    const custom = { ...settings, missesBeforeDeload: 2, deloadPercent: 20 }
    expect(nextWeightKg('squat', [squat(100, MISSED), squat(100, MISSED)], custom)).toBe(80)
  })

  it('never deloads below the bar', () => {
    const history = [squat(20, MISSED), squat(20, MISSED), squat(20, MISSED)]
    expect(nextWeightKg('squat', history, settings)).toBe(20)
  })

  it('rounds weights logged in the other unit to plates', () => {
    const lb = switchUnit(settings, 'lb')
    // 20 kg ≈ 44.09 lb → 45 lb
    expect(toUnit(nextWeightKg('squat', [squat(20, MISSED)], lb), 'lb')).toBe(45)
    expect(toUnit(nextWeightKg('squat', [squat(20, DONE)], lb), 'lb')).toBe(50)
  })

  it('continues from a manually changed weight', () => {
    expect(nextWeightKg('squat', [squat(60, DONE), squat(70, DONE)], settings)).toBe(72.5)
  })
})

describe('planWorkout', () => {
  it('alternates A and B, with progressed weights and empty sets', () => {
    expect(planWorkout([], settings).type).toBe('A')
    const plan = planWorkout([squat(60, DONE)], settings)
    expect(plan.type).toBe('B')
    expect(plan.exercises.map((e) => [e.exerciseId, e.weightKg, e.reps.length])).toEqual([
      ['squat', 62.5, 5],
      ['ohp', 20, 5],
      ['deadlift', 40, 1],
    ])
    expect(plan.exercises[0].reps.every((r) => r === null)).toBe(true)
  })
})

describe('nextReps', () => {
  it('cycles target → down to 0 → skipped', () => {
    const seen: (number | null)[] = []
    let reps: number | null = null
    for (let i = 0; i < 7; i++) seen.push((reps = nextReps(reps, 5)))
    expect(seen).toEqual([5, 4, 3, 2, 1, 0, null])
  })
})

describe('tapSet', () => {
  const fresh = () => planWorkout([], settings)

  it('starts the normal rest after a done set', () => {
    const result = tapSet(fresh(), 0, 0, settings, 1000)
    expect(result.exercises[0].reps[0]).toBe(5)
    expect(result.rest).toEqual({ startedAt: 1000, seconds: 180 })
  })

  it('starts the longer rest after a missed set', () => {
    const first = tapSet(fresh(), 0, 0, settings, 1000)
    const second = tapSet(first, 0, 0, settings, 2000) // 5 → 4
    expect(second.rest).toEqual({ startedAt: 2000, seconds: 300 })
  })

  it('counts up with no target after the last set of an exercise', () => {
    let w: ReturnType<typeof tapSet> = fresh()
    for (let s = 0; s < 5; s++) w = tapSet(w, 0, s, settings, s)
    expect(w.rest).toEqual({ startedAt: 4, seconds: null })
  })

  it('keeps the timer when a set goes back to skipped', () => {
    let w: ReturnType<typeof tapSet> = tapSet(fresh(), 0, 0, settings, 1000)
    for (let i = 0; i < 5; i++) w = tapSet(w, 0, 0, settings, 2000) // 5 → 0
    const cleared = tapSet(w, 0, 0, settings, 3000) // 0 → skipped
    expect(cleared.exercises[0].reps[0]).toBeNull()
    expect(cleared.rest).toEqual(w.rest)
  })

  it('keeps the timer when correcting an exercise that was already finished', () => {
    let w: ReturnType<typeof tapSet> = fresh()
    for (let s = 0; s < 5; s++) w = tapSet(w, 0, s, settings, s)
    w = tapSet(w, 1, 0, settings, 1000)
    const corrected = tapSet(w, 0, 4, settings, 2000) // squat set 5: 5 → 4
    expect(corrected.exercises[0].reps[4]).toBe(4)
    expect(corrected.rest).toEqual({ startedAt: 1000, seconds: 180 })
  })

  it('stops the timer when no sets are skipped', () => {
    let w: ReturnType<typeof tapSet> = fresh()
    w.exercises.forEach((e, ei) => e.reps.forEach((_, si) => (w = tapSet(w, ei, si, settings, 0))))
    expect(isComplete(w.exercises)).toBe(true)
    expect(w.rest).toBeUndefined()
  })
})

describe('break deload', () => {
  const DAY = 86_400_000
  const at = (
    days: number,
    type: WorkoutType,
    exercises: [ExerciseId, number, (number | null)[]][],
    breakDeloadPercent?: number,
  ): Workout => ({ ...workout(type, exercises), date: days * DAY, breakDeloadPercent })

  it('suggests 5% per week off, up to 20%', () => {
    expect([7, 13, 14, 21, 28, 60].map(breakDeloadPercent)).toEqual([5, 5, 10, 15, 20, 20])
  })

  it('counts calendar days since the last workout', () => {
    const last = { ...workout('A', []), date: new Date(2026, 0, 5, 20).getTime() }
    expect(daysSinceLastWorkout([], 0)).toBeNull()
    expect(daysSinceLastWorkout([last], new Date(2026, 0, 19, 18).getTime())).toBe(14)
  })

  it('lowers every planned exercise with history, but not new ones', () => {
    const history = [at(0, 'A', [['squat', 100, DONE]])]
    const plan = planWorkout(history, settings, 'B', 10)
    expect(plan.breakDeloadPercent).toBe(10)
    // squat 102.5 → 92.25 → 90; ohp and deadlift were never done
    expect(plan.exercises.map((e) => e.weightKg)).toEqual([90, 20, 40])
  })

  it("doesn't lower exercises that were only ever skipped", () => {
    const skipped = [null, null, null, null, null]
    const history = [
      at(0, 'A', [
        ['squat', 100, DONE],
        ['row', 30, skipped],
      ]),
      at(20, 'B', [['squat', 90, DONE]], 10),
    ]
    // squat 92.5 → 83.25 → 82.5; bench never lifted stays at the bar; row only skipped stays 30
    expect(planWorkout(history, settings, 'A', 10).exercises.map((e) => e.weightKg)).toEqual([
      82.5, 20, 30,
    ])
    expect(nextWeightKg('row', history, settings)).toBe(30)
  })

  it("lowers the other workout's exercises once, when they come up next", () => {
    const history = [
      at(0, 'A', [['squat', 100, DONE]]),
      at(1, 'B', [['ohp', 50, DONE]]),
      at(20, 'A', [['squat', 90, DONE]], 10), // first workout after the break
    ]
    expect(nextWeightKg('ohp', history, settings)).toBe(45) // 52.5 → 47.25 → 45
    expect(nextWeightKg('squat', history, settings)).toBe(92.5) // already deloaded, normal progression
    const later = [...history, at(21, 'B', [['ohp', 45, DONE]])]
    expect(nextWeightKg('ohp', later, settings)).toBe(47.5) // only once
  })

  it("doesn't lower again after skipping the lowered exercise", () => {
    const history = [
      at(0, 'A', [['squat', 100, DONE]]),
      at(20, 'A', [['squat', 90, [null, null, null, null, null]]], 10),
    ]
    expect(nextWeightKg('squat', history, settings)).toBe(90)
  })
})
