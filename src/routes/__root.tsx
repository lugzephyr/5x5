import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { ChartLineIcon, DumbbellIcon, HistoryIcon, SettingsIcon } from 'lucide-react'
import { ActiveWorkoutEffects } from '@/components/active-workout-effects'
import { unlockAudio } from '@/lib/sound'

const TABS = [
  { to: '/', label: 'Workout', icon: DumbbellIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/progress', label: 'Progress', icon: ChartLineIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    // Any tap unlocks audio, so the rest timer can beep later
    <div className="mx-auto min-h-svh max-w-md" onPointerDown={unlockAudio}>
      <ActiveWorkoutEffects />
      <main className="px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
