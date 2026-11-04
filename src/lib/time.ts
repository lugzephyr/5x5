import { addDays, differenceInHours, formatDuration, intervalToDuration } from 'date-fns'
import { useEffect, useState } from 'react'

/** The current time, updated every `intervalMs`. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

/** A running clock: 4:05 or 1:02:05. */
export function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** A time of day in the device's format (e.g. 6:05 PM or 18:05), matching the native time pickers. */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { timeStyle: 'short' })
}

/** A finished workout's length: "52 minutes", "1 hour 5 minutes". */
export function formatWorkoutDuration(start: number, end: number): string {
  return (
    formatDuration(intervalToDuration({ start, end }), { format: ['hours', 'minutes'] }) ||
    '0 minutes'
  )
}

/** Reads date (yyyy-MM-dd) and start/finish (HH:mm) inputs as local time, or says what's wrong. */
export function parseWorkoutTime(
  day: string,
  start: string,
  finish: string,
  now: number,
): { date: number; finishedAt: number } | { error: string } {
  const date = new Date(`${day}T${start}`).getTime()
  let finishedAt = new Date(`${day}T${finish}`).getTime()
  if (Number.isNaN(date) || Number.isNaN(finishedAt))
    return { error: 'Enter a date and both times' }
  // A finish before the start is on the next day (a workout past midnight)
  if (finishedAt < date) finishedAt = addDays(finishedAt, 1).getTime()
  if (differenceInHours(finishedAt, date) >= 12) return { error: 'Workout is over 12 hours' }
  if (finishedAt > now) return { error: "Can't be in the future" }
  return { date, finishedAt }
}
