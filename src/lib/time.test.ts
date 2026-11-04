import { describe, expect, it } from 'vitest'
import { formatClock, formatWorkoutDuration, parseWorkoutTime } from './time'

describe('formatClock', () => {
  it('shows minutes and seconds, adding hours when needed', () => {
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(245)).toBe('4:05')
    expect(formatClock(3725)).toBe('1:02:05')
  })
})

describe('formatWorkoutDuration', () => {
  it('shows hours and minutes, and 0 minutes for under a minute', () => {
    expect(formatWorkoutDuration(0, 65 * 60_000)).toBe('1 hour 5 minutes')
    expect(formatWorkoutDuration(0, 20_000)).toBe('0 minutes')
  })
})

describe('parseWorkoutTime', () => {
  const now = new Date('2026-11-04T20:00').getTime()

  it('reads the inputs as local time', () => {
    expect(parseWorkoutTime('2026-11-02', '18:00', '18:52', now)).toEqual({
      date: new Date('2026-11-02T18:00').getTime(),
      finishedAt: new Date('2026-11-02T18:52').getTime(),
    })
  })

  it('reads a finish before the start as the next day', () => {
    expect(parseWorkoutTime('2026-11-02', '23:30', '00:30', now)).toEqual({
      date: new Date('2026-11-02T23:30').getTime(),
      finishedAt: new Date('2026-11-03T00:30').getTime(),
    })
  })

  it('accepts a finish in the same minute as the start', () => {
    const at = new Date('2026-11-02T18:00').getTime()
    expect(parseWorkoutTime('2026-11-02', '18:00', '18:00', now)).toEqual({
      date: at,
      finishedAt: at,
    })
  })

  it('rejects missing values, 12+ hour workouts and the future', () => {
    expect(parseWorkoutTime('', '18:00', '18:52', now)).toEqual({
      error: 'Enter a date and both times',
    })
    expect(parseWorkoutTime('2026-11-02', '18:52', '18:00', now)).toEqual({
      error: 'Workout is over 12 hours',
    })
    expect(parseWorkoutTime('2026-11-04', '19:30', '20:30', now)).toEqual({
      error: "Can't be in the future",
    })
  })
})
