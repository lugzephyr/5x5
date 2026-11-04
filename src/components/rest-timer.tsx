import { cn } from 'cn'
import type { Rest } from '@/domain/types'
import { formatClock, useNow } from '@/lib/time'

export function RestTimer({ rest }: { rest: Rest }) {
  const now = useNow(250)
  const elapsed = Math.max(0, Math.floor((now - rest.startedAt) / 1000))
  const remaining = rest.seconds === null ? null : rest.seconds - elapsed
  const done = remaining !== null && remaining <= 0

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-3 ring-1 ring-foreground/10',
        done ? 'bg-primary text-primary-foreground' : 'bg-card',
      )}
    >
      <span className="text-sm">
        {remaining === null ? 'Next exercise' : done ? 'Rest is over' : 'Rest'}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums">
        {formatClock(elapsed)}
        {rest.seconds !== null && (
          <span className="text-base font-normal opacity-60"> / {formatClock(rest.seconds)}</span>
        )}
      </span>
    </div>
  )
}
