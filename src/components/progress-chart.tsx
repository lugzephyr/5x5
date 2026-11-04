import { format } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type DotProps,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { Result } from '@/domain/program'
import type { ProgressPoint } from '@/domain/progress'
import type { Unit } from '@/domain/types'
import { toUnit } from '@/domain/units'

const RESULT_LABEL: Record<Result, string> = {
  done: 'Done',
  missed: 'Missed',
  skipped: 'Skipped sets',
}

// One series per chart, so the line uses the theme's primary ink; missed points add the destructive status color
const config = { weight: { label: 'Weight', color: 'var(--primary)' } } satisfies ChartConfig

interface Props {
  name: string
  points: ProgressPoint[]
  unit: Unit
}

/** An exercise's working weight over time; missed sessions are hollow red markers, the latest a dot. */
export function ProgressChart({ name, points, unit }: Props) {
  const data = points.map((p) => ({
    date: p.date,
    weight: toUnit(p.weightKg, unit),
    result: p.result,
  }))
  const first = data.at(0)
  const last = data.at(-1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription>
          {last
            ? `${last.weight} ${unit} · ${formatChange(last.weight - first!.weight, unit)}`
            : 'No sessions in this range'}
        </CardDescription>
      </CardHeader>
      {data.length > 0 && (
        <CardContent>
          <ChartContainer config={config} className="aspect-auto h-40 w-full">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(date: number) => format(date, 'd MMM')}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                padding={{ left: 20, right: 12 }}
              />
              <YAxis width="auto" tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      format(payload[0].payload.date, 'EEE, d MMM yyyy')
                    }
                    formatter={(value, _name, item) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {value} {unit}
                        </span>
                        <span className="text-muted-foreground">
                          {RESULT_LABEL[item.payload.result as Result]}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="weight"
                type="linear"
                stroke="var(--color-weight)"
                strokeWidth={2}
                // Mark only what matters: missed sessions and the latest one
                dot={({ cx, cy, index, payload }: DotItemDotProps) =>
                  payload.result === 'missed' || index === data.length - 1 ? (
                    <Marker key={index} cx={cx} cy={cy} payload={payload} />
                  ) : (
                    <g key={index} />
                  )
                }
                activeDot={<Marker active />}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      )}
    </Card>
  )
}

/** Explains the missed marker, so it never relies on color or the tooltip alone. */
export function ProgressKey() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg width={12} height={12} aria-hidden>
        <Marker cx={6} cy={6} payload={{ result: 'missed' }} />
      </svg>
      Missed session
    </div>
  )
}

/** Filled dot (latest or hovered session), hollow destructive ring for missed ones; a card-colored ring keeps it off the line. */
function Marker({
  cx,
  cy,
  payload,
  active,
}: DotProps & { payload?: { result: Result }; active?: boolean }) {
  if (cx === undefined || cy === undefined) return null
  const missed = payload?.result === 'missed'
  return (
    <circle
      cx={cx}
      cy={cy}
      r={active ? 5 : 4}
      strokeWidth={2}
      fill={missed ? 'var(--card)' : 'var(--primary)'}
      stroke={missed ? 'var(--destructive)' : 'var(--card)'}
    />
  )
}

function formatChange(change: number, unit: Unit): string {
  const rounded = Math.round(change * 100) / 100
  if (rounded === 0) return 'no change'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} ${unit}`
}
