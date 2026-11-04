import { describe, expect, it } from 'vitest'
import { defaultSettings, switchUnit } from './settings'
import { formatWeight, fromUnit, isMultipleOf, roundToPlates, toUnit } from './units'

describe('units', () => {
  it('round-trips pounds through kilograms', () => {
    expect(toUnit(fromUnit(135, 'lb'), 'lb')).toBe(135)
    expect(formatWeight(fromUnit(137.5, 'lb'), 'lb')).toBe('137.5 lb')
  })

  it('rounds to loadable plates in the given unit', () => {
    expect(roundToPlates(56.25, 'kg')).toBe(57.5)
    expect(roundToPlates(56.25, 'kg', Math.floor)).toBe(55)
    expect(toUnit(roundToPlates(fromUnit(121.5, 'lb'), 'lb'), 'lb')).toBe(120)
  })
})

describe('isMultipleOf', () => {
  it('accepts whole steps only', () => {
    expect(isMultipleOf(27.5, 2.5)).toBe(true)
    expect(isMultipleOf(0.3, 0.1)).toBe(true)
    expect(isMultipleOf(26.87, 2.5)).toBe(false)
  })
})

describe('switchUnit', () => {
  it('uses the new unit defaults for bar and increments', () => {
    const lb = switchUnit({ ...defaultSettings('kg'), restSeconds: 90 }, 'lb')
    expect(lb.unit).toBe('lb')
    expect(lb.restSeconds).toBe(90)
    expect(toUnit(lb.barWeightKg, 'lb')).toBe(45)
    expect(toUnit(lb.exercises.deadlift.incrementKg, 'lb')).toBe(10)
  })
})
