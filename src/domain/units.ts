import type { Unit } from './types'

const KG_PER_LB = 0.45359237

/** Smallest practical weight change (one pair of the smallest common plates). */
export const WEIGHT_STEP: Record<Unit, number> = { kg: 2.5, lb: 5 }

export function isMultipleOf(value: number, step: number): boolean {
  return Math.abs(value / step - Math.round(value / step)) < 1e-9
}

export function toUnit(kg: number, unit: Unit): number {
  const value = unit === 'kg' ? kg : kg / KG_PER_LB
  return Math.round(value * 100) / 100
}

export function fromUnit(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}

export function formatWeight(kg: number, unit: Unit): string {
  return `${toUnit(kg, unit)} ${unit}`
}

/** Rounds to a weight that can be loaded with the unit's plates. */
export function roundToPlates(kg: number, unit: Unit, round = Math.round): number {
  const step = WEIGHT_STEP[unit]
  return fromUnit(round(toUnit(kg, unit) / step) * step, unit)
}
