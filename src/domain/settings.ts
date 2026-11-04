import type { BaseRecord, ExerciseId, Settings, Unit } from './types'
import { fromUnit } from './units'

export type SettingsValues = Omit<Settings, keyof BaseRecord>

const DEFAULTS: Record<
  Unit,
  { bar: number; start: Record<ExerciseId, number>; increment: number }
> = {
  kg: { bar: 20, start: { squat: 20, bench: 20, row: 30, ohp: 20, deadlift: 40 }, increment: 2.5 },
  lb: { bar: 45, start: { squat: 45, bench: 45, row: 65, ohp: 45, deadlift: 95 }, increment: 5 },
}

/** The first weight for an exercise with no history; adjust it on the workout screen if needed. */
export function startWeightKg(exerciseId: ExerciseId, unit: Unit): number {
  return fromUnit(DEFAULTS[unit].start[exerciseId], unit)
}

export function defaultSettings(unit: Unit = 'kg'): SettingsValues {
  const d = DEFAULTS[unit]
  // Deadlift progresses twice as fast
  const exercise = (id: ExerciseId) => ({
    incrementKg: fromUnit(id === 'deadlift' ? d.increment * 2 : d.increment, unit),
  })
  return {
    unit,
    barWeightKg: fromUnit(d.bar, unit),
    exercises: {
      squat: exercise('squat'),
      bench: exercise('bench'),
      row: exercise('row'),
      ohp: exercise('ohp'),
      deadlift: exercise('deadlift'),
    },
    restSeconds: 180,
    restAfterMissSeconds: 300,
    missesBeforeDeload: 3,
    deloadPercent: 10,
    breakDays: 14,
    sound: true,
    keepScreenOn: true,
  }
}

/** Switches units; bar and increments reset to the new unit's defaults. */
export function switchUnit<T extends SettingsValues>(settings: T, unit: Unit): T {
  if (settings.unit === unit) return settings
  const { barWeightKg, exercises } = defaultSettings(unit)
  return { ...settings, unit, barWeightKg, exercises }
}
