import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { isSameDay } from 'date-fns'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WorkoutCard } from '@/components/workout-card'
import { useHistory, useSettings } from '@/data/repository'
import type { Unit, Workout } from '@/domain/types'

type View = 'list' | 'calendar'

export const Route = createFileRoute('/history/')({
  // The view lives in the URL, so going back from a workout returns to it
  validateSearch: (search): { view?: View } =>
    search.view === 'calendar' ? { view: 'calendar' } : {},
  component: HistoryPage,
})

function HistoryPage() {
  const { view = 'list' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const history = useHistory()
  const settings = useSettings()
  if (!history || !settings) return null

  const workouts = history.toReversed() // newest first

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">History</h1>
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[view]}
          onValueChange={([next]) =>
            next &&
            navigate({ search: next === 'calendar' ? { view: 'calendar' } : {}, replace: true })
          }
          aria-label="View"
        >
          <ToggleGroupItem value="list">List</ToggleGroupItem>
          <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
        </ToggleGroup>
      </header>

      {workouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Finished workouts show up here.</p>
      ) : view === 'calendar' ? (
        <HistoryCalendar workouts={workouts} unit={settings.unit} />
      ) : (
        workouts.map((w) => <WorkoutCard key={w.id} workout={w} unit={settings.unit} />)
      )}
    </div>
  )
}

/**
 * Only days with a workout can be picked. A day with one workout opens it;
 * a day with several shows their cards below.
 */
function HistoryCalendar({ workouts, unit }: { workouts: Workout[]; unit: Unit }) {
  const navigate = useNavigate()
  const [day, setDay] = useState<Date>()
  const onDay = (date: Date) => workouts.filter((w) => isSameDay(w.date, date))
  // Built once per render so the calendar's per-day check doesn't scan every workout
  const workoutDays = new Set(workouts.map((w) => new Date(w.date).toDateString()))
  const isWorkoutDay = (date: Date) => workoutDays.has(date.toDateString())

  function select(date: Date | undefined) {
    const found = date ? onDay(date) : []
    if (found.length === 1) {
      void navigate({ to: '/history/$workoutId', params: { workoutId: found[0].id } })
    } else {
      setDay(date)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Calendar
            className="w-full"
            mode="single"
            selected={day}
            onSelect={select}
            defaultMonth={new Date(workouts[0].date)}
            disabled={(date) => !isWorkoutDay(date)}
            // Workout days get the filled box, so today is an outline to tell them apart
            modifiers={{ workout: isWorkoutDay }}
            modifiersClassNames={{ workout: 'bg-muted' }}
            classNames={{
              today: 'rounded-(--cell-radius) ring-1 ring-muted-foreground/50 ring-inset',
            }}
          />
        </CardContent>
      </Card>
      {day && onDay(day).map((w) => <WorkoutCard key={w.id} workout={w} unit={unit} />)}
    </>
  )
}
