import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Unit } from '@/domain/types'
import { WEIGHT_STEP, formatWeight, fromUnit, isMultipleOf, toUnit } from '@/domain/units'

interface Props {
  title: string
  weightKg: number
  unit: Unit
  onChange: (weightKg: number) => void
}

export function WeightDialog({ title, weightKg, unit, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const step = WEIGHT_STEP[unit]
  const parsed = Number(value)
  const isNumber = value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
  // Only weights that can be loaded with plates
  const valid = isNumber && isMultipleOf(parsed, step)

  function openChange(next: boolean) {
    if (next) setValue(String(toUnit(weightKg, unit)))
    setOpen(next)
  }

  // Moves to the next valid weight up or down, so the buttons also fix an invalid entry
  function adjust(direction: 1 | -1) {
    const steps = isNumber ? parsed / step : 0
    const next = direction > 0 ? Math.floor(steps + 1e-9) + 1 : Math.ceil(steps - 1e-9) - 1
    setValue(String(Math.max(0, next * step)))
  }

  function save() {
    if (!valid) return
    onChange(fromUnit(parsed, unit))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        {formatWeight(weightKg, unit)}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" onClick={() => adjust(-1)} aria-label="Less">
            <MinusIcon />
          </Button>
          <Input
            className="h-9 text-center text-base"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            aria-label={`Weight in ${unit}`}
            aria-invalid={!valid}
          />
          <Button variant="outline" size="icon-lg" onClick={() => adjust(1)} aria-label="More">
            <PlusIcon />
          </Button>
        </div>
        {!valid && (
          <p className="text-sm text-destructive">
            Use steps of {step} {unit}
          </p>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={!valid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
