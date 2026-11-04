import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PERCENTS = [5, 10, 15, 20]

interface Props {
  days: number
  defaultPercent: number
  onApply: (percent: number) => void
  onDismiss: () => void
}

/** Offers to lower all weights after a break. */
export function BreakDeloadCard({ days, defaultPercent, onApply, onDismiss }: Props) {
  const [percent, setPercent] = useState(defaultPercent)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Time for a deload?</CardTitle>
        <CardDescription>Last workout {days} days ago.</CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[String(percent)]}
          onValueChange={([next]) => next && setPercent(Number(next))}
          aria-label="Deload"
        >
          {PERCENTS.map((p) => (
            <ToggleGroupItem key={p} value={String(p)}>
              −{p}%
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button className="flex-1" onClick={() => onApply(percent)}>
          Apply
        </Button>
      </CardFooter>
    </Card>
  )
}
