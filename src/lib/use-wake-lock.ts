import { useEffect } from 'react'

/** Keeps the screen on while enabled. The lock is lost when the app is hidden, so it's re-requested on return. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let cancelled = false

    const request = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => (cancelled ? void l.release() : (lock = l)))
        .catch(() => {})
    }

    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [enabled])
}
