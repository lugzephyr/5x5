import { describe, expect, it } from 'vitest'
import { parseStrongLiftsCsv } from './stronglifts'

// Same layout as a real export, including the leading spaces in the KG headers
const HEADER =
  'Date (yyyy/mm/dd),Workout,Workout Name,Program Name,Body Weight (KG),Exercise,SetsxReps,SetsxTime,Top Set Reps x KG,e1RM  (KG),Reps,Volume (KG),Workout Volume (KG),Duration (hours),Start Time (h:mm),End Time (h:mm),Notes,Set 1 (Reps), Set 1 (KG),Set 2 (Reps), Set 2 (KG),Set 3 (Reps), Set 3 (KG),Set 4 (Reps), Set 4 (KG),Set 5 (Reps), Set 5 (KG)'

const row = (
  day: string,
  number: number,
  name: string,
  exercise: string,
  sets: [reps: string, kg: string][],
  start = '4:35 PM',
  end = '5:10 PM',
) => {
  const cells = sets.flat()
  while (cells.length < 10) cells.push('')
  // Columns 6–13 hold totals the app doesn't use; the note checks quoting
  const fields = [
    day,
    number,
    name,
    '',
    '75',
    exercise,
    ...Array(8).fill(''),
    start,
    end,
    'a, "note"',
  ]
  return [...fields, ...cells].map((f) => `"${String(f).replaceAll('"', '""')}"`).join(',')
}
const five = (reps: string, kg: string) =>
  Array.from({ length: 5 }, () => [reps, kg] as [string, string])

const csv = (...rows: string[]) => [HEADER, ...rows].join('\r\n') + '\r\n'

describe('parseStrongLiftsCsv', () => {
  it('groups rows into workouts with sets, weights and times', () => {
    const { workouts, skippedRows } = parseStrongLiftsCsv(
      csv(
        row('2024/01/03', 2, 'Workout B', 'Squat', five('5', '62.5')),
        row('2024/01/03', 2, 'Workout B', 'Overhead Press', [
          ['5', '35'],
          ['5', '35'],
          ['5', '35'],
          ['4', '35'],
          ['5', '35'],
        ]),
        row('2024/01/03', 2, 'Workout B', 'Deadlift', [['5', '80']]),
        row('2024/01/01', 1, 'Workout A', 'Bench Press', five('', '40')),
      ),
      123,
    )

    expect(skippedRows).toBe(0)
    expect(workouts.map((w) => w.id)).toEqual(['stronglifts-1', 'stronglifts-2'])
    expect(workouts[0]).toMatchObject({
      type: 'A',
      exercises: [
        { exerciseId: 'bench', weightKg: 40, targetReps: 5, reps: [null, null, null, null, null] },
      ],
    })
    expect(workouts[1]).toEqual({
      id: 'stronglifts-2',
      createdAt: 123,
      updatedAt: 123,
      type: 'B',
      date: new Date(2024, 0, 3, 16, 35).getTime(),
      finishedAt: new Date(2024, 0, 3, 17, 10).getTime(),
      exercises: [
        { exerciseId: 'squat', weightKg: 62.5, targetReps: 5, reps: [5, 5, 5, 5, 5] },
        { exerciseId: 'ohp', weightKg: 35, targetReps: 5, reps: [5, 5, 5, 4, 5] },
        { exerciseId: 'deadlift', weightKg: 80, targetReps: 5, reps: [5] },
      ],
    })
  })

  it('skips rows the app does not track', () => {
    const { workouts, skippedRows } = parseStrongLiftsCsv(
      csv(
        row('2024/01/01', 1, 'Workout A', 'Squat', five('5', '60')),
        row('2024/01/01', 1, 'Workout A', 'Chin-ups', five('8', '0')),
        row('2024/01/02', 2, 'Madcow', 'Squat', five('5', '60')),
      ),
      0,
    )
    expect(skippedRows).toBe(2)
    expect(workouts).toHaveLength(1)
    expect(workouts[0].exercises.map((e) => e.exerciseId)).toEqual(['squat'])
  })

  it('puts an end before the start on the next day', () => {
    const [workout] = parseStrongLiftsCsv(
      csv(row('2024/01/01', 1, 'Workout A', 'Squat', five('5', '60'), '11:40 PM', '12:20 AM')),
      0,
    ).workouts
    expect(workout.finishedAt).toBe(new Date(2024, 0, 2, 0, 20).getTime())
  })

  it('rejects other files', () => {
    expect(() => parseStrongLiftsCsv('a,b\n1,2\n', 0)).toThrow()
    expect(() => parseStrongLiftsCsv(csv(), 0)).toThrow()
  })
})
