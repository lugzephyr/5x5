import { useEffect } from 'react'
import { useActiveWorkout, useSettings } from '@/data/repository'
import { playAlert } from '@/lib/sound'
import { useWakeLock } from '@/lib/use-wake-lock'

/** Keeps the screen on and sounds the rest alert during a workout, whichever tab is open. */
export function ActiveWorkoutEffects() {
  const settings = useSettings()
  const active = useActiveWorkout()
  useWakeLock(!!active && !!settings?.keepScreenOn)

  const rest = active?.rest
  const restEnd = rest?.seconds != null ? rest.startedAt + rest.seconds * 1000 : null
  const sound = !!settings?.sound
  useEffect(() => {
    if (!sound || restEnd === null || restEnd <= Date.now()) return
    // Timers pause while the app is in the background; returning long after the rest ended stays quiet
    const timer = setTimeout(() => Date.now() - restEnd < 3000 && playAlert(), restEnd - Date.now())
    return () => clearTimeout(timer)
  }, [restEnd, sound])

  return null
}
