import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useState } from 'react'
import { BreakDeloadCard } from '@/components/break-deload-card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RestTimer } from '@/components/rest-timer'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WorkoutEditor } from '@/components/workout-editor'
import {
  deleteWorkout,
  finishWorkout,
  startWorkout,
  updateWorkout,
  useActiveWorkout,
  useHistory,
  useSettings,
} from '@/data/repository'
import {
  changeWeight,
  breakDeloadPercent,
  daysSinceLastWorkout,
  isComplete,
  isFullySkipped,
  planWorkout,
  tapSet,
} from '@/domain/program'
import type { ExerciseId, WorkoutType } from '@/domain/types'
import { formatClock, useNow } from '@/lib/time'

export const Route = createFileRoute('/')({
  component: TodayPage,
})

function TodayPage() {
  const settings = useSettings()
  const history = useHistory()
  const active = useActiveWorkout()
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  // A or B picked by hand before starting; null follows the rotation
  const [chosenType, setChosenType] = useState<WorkoutType | null>(null)
  // Weights adjusted before starting; kept per exercise, so they carry across A and B
  const [plannedWeights, setPlannedWeights] = useState<Partial<Record<ExerciseId, number>>>({})
  // Ticks so the date and break prompt stay right when the app is left open across days
  const today = useNow(60_000)
  // Answer to the deload prompt after a break: the percentage applied, or dismissed
  const [breakAnswer, setBreakAnswer] = useState<number | 'dismissed' | null>(null)

  if (!settings || !history || active === undefined) return null

  // Until the first set is tapped, show the plan; that tap starts the workout
  const breakPercent = typeof breakAnswer === 'number' ? breakAnswer : undefined
  const plan = planWorkout(history, settings, chosenType ?? undefined, breakPercent)
  const workout = active ?? {
    ...plan,
    exercises: plan.exercises.map((e) => ({
      ...e,
      weightKg: plannedWeights[e.exerciseId] ?? e.weightKg,
    })),
  }

  const daysOff = daysSinceLastWorkout(history, today)
  const showBreakPrompt =
    !active && breakAnswer === null && !!settings.breakDays && (daysOff ?? 0) >= settings.breakDays

  const onTapSet = async (exerciseIndex: number, setIndex: number) => {
    let id = active?.id
    if (!id) {
      id = await startWorkout(workout)
      setChosenType(null)
      setPlannedWeights({})
      setBreakAnswer(null)
    }
    await updateWorkout(id, (w) => tapSet(w, exerciseIndex, setIndex, settings, Date.now()))
  }

  const onChangeWeight = async (exerciseIndex: number, weightKg: number) => {
    if (active) await updateWorkout(active.id, (w) => changeWeight(w, exerciseIndex, weightKg))
    else
      setPlannedWeights((w) => ({ ...w, [workout.exercises[exerciseIndex].exerciseId]: weightKg }))
  }

  const onFinish = () => {
    if (!active) return
    // Nothing logged means nothing to save, so offer to discard instead
    if (active.exercises.every(isFullySkipped)) setConfirm('discard')
    else if (isComplete(active.exercises)) void finishWorkout(active.id)
    else setConfirm('finish')
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workout {workout.type}</h1>
          <p className="text-sm text-muted-foreground">
            {format(active?.date ?? today, 'EEEE, d MMM')}
          </p>
        </div>
        {active ? (
          <WorkoutClock startedAt={active.date} />
        ) : (
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[workout.type]}
            onValueChange={([type]) => type && setChosenType(type as WorkoutType)}
            aria-label="Workout"
          >
            <ToggleGroupItem value="A">A</ToggleGroupItem>
            <ToggleGroupItem value="B">B</ToggleGroupItem>
          </ToggleGroup>
        )}
      </header>

      {showBreakPrompt && (
        <BreakDeloadCard
          days={daysOff!}
          defaultPercent={breakDeloadPercent(daysOff!)}
          onApply={setBreakAnswer}
          onDismiss={() => setBreakAnswer('dismissed')}
        />
      )}

      <WorkoutEditor
        exercises={workout.exercises}
        unit={settings.unit}
        onTapSet={onTapSet}
        onChangeWeight={onChangeWeight}
      />

      {active && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setConfirm('discard')}
          >
            Discard
          </Button>
          <Button size="lg" className="flex-1" onClick={onFinish}>
            Finish workout
          </Button>
        </div>
      )}

      {active?.rest && (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]">
          <RestTimer rest={active.rest} />
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'finish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Finish workout?"
        description="Sets you haven't logged will be saved as skipped."
        confirmLabel="Finish"
        onConfirm={() => active && finishWorkout(active.id)}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Discard workout?"
        description="This workout won't be saved."
        confirmLabel="Discard"
        destructive
        onConfirm={() => active && deleteWorkout(active.id)}
      />
    </div>
  )
}

/** Time since the workout started, in its own component so only it re-renders every second. */
function WorkoutClock({ startedAt }: { startedAt: number }) {
  const now = useNow(1000)
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  return <span className="text-2xl font-semibold tabular-nums">{formatClock(seconds)}</span>
}
