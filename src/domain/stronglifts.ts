// Reads the CSV that the StrongLifts app exports (one row per exercise, weights in kg).
import { addDays, parse } from 'date-fns'
import { EXERCISES } from './program'
import type { ExerciseId, Workout, WorkoutType } from './types'

export interface StrongLiftsImport {
  workouts: Workout[]
  /** Rows the app doesn't track (other workouts or exercises) or can't read. */
  skippedRows: number
}

const EXERCISE_IDS = new Map(
  Object.entries(EXERCISES).map(([id, { name }]) => [name, id as ExerciseId]),
)
const TYPES: Record<string, WorkoutType> = { 'Workout A': 'A', 'Workout B': 'B' }

/** Workouts sorted oldest first. Ids come from the StrongLifts workout number, so importing twice doesn't duplicate. */
export function parseStrongLiftsCsv(text: string, now: number): StrongLiftsImport {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, ''))
  const columns = new Map(header.map((name, i) => [name.trim(), i]))
  const column = (name: string) => {
    const i = columns.get(name)
    if (i === undefined) throw new Error('Not a StrongLifts export')
    return i
  }
  const c = {
    day: column('Date (yyyy/mm/dd)'),
    number: column('Workout'),
    name: column('Workout Name'),
    exercise: column('Exercise'),
    start: column('Start Time (h:mm)'),
    end: column('End Time (h:mm)'),
  }
  const sets = [1, 2, 3, 4, 5].map((n) => ({
    reps: column(`Set ${n} (Reps)`),
    kg: column(`Set ${n} (KG)`),
  }))

  const workouts = new Map<string, Workout>()
  let skippedRows = 0
  for (const row of rows) {
    if (row.length === 1 && !row[0]) continue // blank line
    const type = TYPES[row[c.name]]
    const exerciseId = EXERCISE_IDS.get(row[c.exercise])
    // Skipped exercises still carry their weight
    const weightKg = Number(sets.map((s) => row[s.kg]).find(Boolean))
    const date = localTime(row[c.day], row[c.start])
    if (!type || !exerciseId || !(weightKg > 0) || Number.isNaN(date)) {
      skippedRows++
      continue
    }

    let workout = workouts.get(row[c.number])
    if (!workout) {
      let finishedAt = localTime(row[c.day], row[c.end])
      if (Number.isNaN(finishedAt)) finishedAt = date
      // An end before the start is on the next day (a workout past midnight)
      if (finishedAt < date) finishedAt = addDays(finishedAt, 1).getTime()
      workout = {
        id: `stronglifts-${row[c.number]}`,
        createdAt: now,
        updatedAt: now,
        type,
        date,
        finishedAt,
        exercises: [],
      }
      workouts.set(row[c.number], workout)
    }
    const { sets: setCount, reps: targetReps } = EXERCISES[exerciseId]
    workout.exercises.push({
      exerciseId,
      weightKg,
      targetReps,
      // A blank cell is a set that wasn't done
      reps: sets.slice(0, setCount).map((s) => (row[s.reps] ? Number(row[s.reps]) : null)),
    })
  }

  if (workouts.size === 0) throw new Error('No workouts found')
  return { workouts: [...workouts.values()].sort((a, b) => a.date - b.date), skippedRows }
}

/** "2023/11/06" and "4:35 PM" as local time, or NaN. */
function localTime(day: string, time: string): number {
  return parse(`${day} ${time}`, 'yyyy/MM/dd h:mm a', 0).getTime()
}

/** Splits CSV into rows of fields; quoted fields may contain commas, quotes and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      rows.push([...row, field])
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}
