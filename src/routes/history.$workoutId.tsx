import { createFileRoute, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ChevronLeftIcon } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { WorkoutEditor } from '@/components/workout-editor'
import { WorkoutTimeDialog } from '@/components/workout-time-dialog'
import { deleteWorkout, updateWorkout, useSettings, useWorkout } from '@/data/repository'
import { changeWeight, tapSet } from '@/domain/program'
import { formatTime, formatWorkoutDuration } from '@/lib/time'

export const Route = createFileRoute('/history/$workoutId')({
  component: WorkoutPage,
})

function WorkoutPage() {
  const { workoutId } = Route.useParams()
  const workout = useWorkout(workoutId)
  const settings = useSettings()
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Back to wherever we came from (list or calendar); /history when opened directly
  const back = () => (canGoBack ? router.history.back() : navigate({ to: '/history' }))
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (workout === undefined || !settings) return null

  return (
    <div className="flex flex-col gap-4">
      {workout === null ? (
        <p className="text-sm text-muted-foreground">This workout doesn't exist.</p>
      ) : (
        <>
          <header>
            <div className="-ml-2 flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void back()}>
                <ChevronLeftIcon />
              </Button>
              <h1 className="text-2xl font-semibold">Workout {workout.type}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(workout.date, 'EEEE, d MMM yyyy')}
            </p>
            {workout.finishedAt > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {formatTime(workout.date)}–{formatTime(workout.finishedAt)} ·{' '}
                {formatWorkoutDuration(workout.date, workout.finishedAt)}
                <WorkoutTimeDialog
                  date={workout.date}
                  finishedAt={workout.finishedAt}
                  onSave={(time) => updateWorkout(workout.id, () => time)}
                />
              </div>
            )}
          </header>

          <WorkoutEditor
            exercises={workout.exercises}
            unit={settings.unit}
            // Past workouts have no rest timer, so only the reps are kept
            onTapSet={(ei, si) =>
              updateWorkout(workout.id, (w) => ({
                exercises: tapSet(w, ei, si, settings, Date.now()).exercises,
              }))
            }
            onChangeWeight={(ei, kg) => updateWorkout(workout.id, (w) => changeWeight(w, ei, kg))}
          />

          <Button variant="destructive" size="lg" onClick={() => setConfirmDelete(true)}>
            Delete workout
          </Button>

          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete workout?"
            description="Future weights will be recalculated without it."
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              await deleteWorkout(workout.id)
              await back()
            }}
          />
        </>
      )}
    </div>
  )
}
