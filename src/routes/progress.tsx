import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProgressChart, ProgressKey } from '@/components/progress-chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useHistory, useSettings } from '@/data/repository'
import { EXERCISES } from '@/domain/program'
import { progressSeries } from '@/domain/progress'
import type { ExerciseId } from '@/domain/types'

const DAY_MS = 86_400_000
const RANGES = { '1m': 30, '3m': 90, all: Infinity } as const
type Range = keyof typeof RANGES

export const Route = createFileRoute('/progress')({
  // The range lives in the URL like History's view, so it survives navigation
  validateSearch: (search): { range?: Range } =>
    search.range === '1m' || search.range === '3m' ? { range: search.range } : {},
  component: ProgressPage,
})

function ProgressPage() {
  const { range = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const history = useHistory()
  const settings = useSettings()
  const [today] = useState(Date.now)
  if (!history || !settings) return null

  const since = today - RANGES[range] * DAY_MS

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Progress</h1>
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[range]}
          onValueChange={([next]) =>
            next &&
            navigate({ search: next === 'all' ? {} : { range: next as Range }, replace: true })
          }
          aria-label="Range"
        >
          <ToggleGroupItem value="1m">1M</ToggleGroupItem>
          <ToggleGroupItem value="3m">3M</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </header>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Finished workouts show up here.</p>
      ) : (
        <>
          <ProgressKey />
          {(Object.keys(EXERCISES) as ExerciseId[]).map((id) => (
            <ProgressChart
              key={id}
              name={EXERCISES[id].name}
              points={progressSeries(history, id, since)}
              unit={settings.unit}
            />
          ))}
        </>
      )}
    </div>
  )
}
