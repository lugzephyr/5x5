// The only module that talks to IndexedDB. Everything else goes through these functions and hooks.
import { Dexie, type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { WorkoutPlan } from '@/domain/program'
import { defaultSettings, type SettingsValues } from '@/domain/settings'
import type { BaseRecord, Settings, Workout } from '@/domain/types'

const db = new Dexie('5x5') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  workouts: 'id, date, finishedAt, updatedAt',
  settings: 'id, updatedAt',
})

/** Settings is a single record with a fixed id, so devices share it when syncing. */
const SETTINGS_ID = 'settings'
const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  createdAt: 0,
  updatedAt: 0,
  ...defaultSettings(),
}

type WorkoutChanges = Partial<Omit<Workout, keyof BaseRecord>>

export const isFinished = (w: Workout) => w.finishedAt > 0 && !w.deletedAt

// Queries go through the finishedAt index, so a set tap on the active workout doesn't re-run history
const activeWorkout = () =>
  db.workouts
    .where({ finishedAt: 0 })
    .filter((w) => !w.deletedAt)
    .first()

// Reads

export function useSettings(): Settings | undefined {
  // Defaults fill any field missing from older saved settings
  return useLiveQuery(async () => ({
    ...DEFAULT_SETTINGS,
    ...(await db.settings.get(SETTINGS_ID)),
  }))
}

/** Finished workouts, oldest first. */
export function useHistory(): Workout[] | undefined {
  return useLiveQuery(() =>
    db.workouts.where('finishedAt').above(0).filter(isFinished).sortBy('date'),
  )
}

/** The workout in progress, or null if there isn't one. */
export function useActiveWorkout(): Workout | null | undefined {
  return useLiveQuery(async () => (await activeWorkout()) ?? null)
}

export function useWorkout(id: string): Workout | null | undefined {
  return useLiveQuery(async () => {
    const workout = await db.workouts.get(id)
    return workout && !workout.deletedAt ? workout : null
  }, [id])
}

// Writes

export async function saveSettings(values: Partial<SettingsValues>): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get(SETTINGS_ID)) ?? { ...DEFAULT_SETTINGS, createdAt: now }
    // Callers may pass a whole Settings record; keep the stored record fields
    await db.settings.put({
      ...current,
      ...values,
      id: SETTINGS_ID,
      createdAt: current.createdAt,
      updatedAt: now,
    })
  })
}

/** Returns the workout in progress, starting one from the plan if there isn't one. */
export async function startWorkout(plan: WorkoutPlan): Promise<string> {
  return db.transaction('rw', db.workouts, async () => {
    const active = await activeWorkout()
    if (active) return active.id
    const now = Date.now()
    return db.workouts.add({
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      date: now,
      finishedAt: 0,
      ...plan,
    })
  })
}

/** Reads and writes in one transaction, so rapid taps never work on stale data. */
export async function updateWorkout(
  id: string,
  change: (workout: Workout) => WorkoutChanges,
): Promise<void> {
  await db.transaction('rw', db.workouts, async () => {
    const workout = await db.workouts.get(id)
    if (workout) await db.workouts.update(id, { ...change(workout), updatedAt: Date.now() })
  })
}

export async function finishWorkout(id: string): Promise<void> {
  await updateWorkout(id, () => ({ finishedAt: Date.now(), rest: undefined }))
}

/** Soft delete, so a later sync can tell "deleted" from "never existed". */
export async function deleteWorkout(id: string): Promise<void> {
  const now = Date.now()
  await db.workouts.update(id, { deletedAt: now, updatedAt: now })
}

// Backup

export interface Backup {
  app: '5x5'
  version: 1
  exportedAt: number
  workouts: Workout[]
  settings: Settings[]
}

export async function exportBackup(): Promise<Backup> {
  const [workouts, settings] = await Promise.all([db.workouts.toArray(), db.settings.toArray()])
  return { app: '5x5', version: 1, exportedAt: Date.now(), workouts, settings }
}

export function parseBackup(json: string): Backup {
  const data = JSON.parse(json) as Partial<Backup>
  if (data.app !== '5x5' || !Array.isArray(data.workouts) || !Array.isArray(data.settings)) {
    throw new Error('Not a 5x5 backup file')
  }
  return data as Backup
}

/** Replaces all local data with the backup. */
export async function importBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.workouts, db.settings, async () => {
    await Promise.all([db.workouts.clear(), db.settings.clear()])
    await Promise.all([db.workouts.bulkPut(backup.workouts), db.settings.bulkPut(backup.settings)])
  })
}

/** Adds workouts whose id isn't stored yet, so importing again keeps edits and deletions. Returns how many were added. */
export async function addWorkouts(workouts: Workout[]): Promise<number> {
  return db.transaction('rw', db.workouts, async () => {
    const stored = await db.workouts.bulkGet(workouts.map((w) => w.id))
    const added = workouts.filter((_, i) => !stored[i])
    await db.workouts.bulkAdd(added)
    return added.length
  })
}

/** Asks the browser not to evict our data when storage runs low. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.()
}
