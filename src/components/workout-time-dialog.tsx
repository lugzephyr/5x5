import { format } from 'date-fns'
import { ChevronDownIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseWorkoutTime } from '@/lib/time'

interface Props {
  date: number
  finishedAt: number
  onSave: (time: { date: number; finishedAt: number }) => void
}

export function WorkoutTimeDialog({ date, finishedAt, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [day, setDay] = useState<Date>()
  const [start, setStart] = useState('')
  const [finish, setFinish] = useState('')
  const [now, setNow] = useState(0)
  const parsed = parseWorkoutTime(day ? format(day, 'yyyy-MM-dd') : '', start, finish, now)

  function openChange(next: boolean) {
    if (next) {
      setDay(new Date(date))
      setStart(format(date, 'HH:mm'))
      setFinish(format(finishedAt, 'HH:mm'))
      setNow(Date.now())
    }
    setOpen(next)
  }

  function save() {
    if ('error' in parsed) return
    onSave(parsed)
    setOpen(false)
  }

  const timeField = (label: string, value: string, onChange: (value: string) => void) => (
    <Field>
      <FieldLabel htmlFor={`workout-${label}`}>{label}</FieldLabel>
      <Input
        type="time"
        id={`workout-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit time" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workout time</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="workout-date">Date</FieldLabel>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    id="workout-date"
                    className="justify-between font-normal"
                  />
                }
              >
                {day ? format(day, 'PPP') : 'Select date'}
                <ChevronDownIcon data-icon="inline-end" />
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={day}
                  defaultMonth={day}
                  disabled={{ after: new Date(now) }}
                  onSelect={(d) => {
                    setDay(d)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>
          <FieldGroup className="flex-row">
            {timeField('Start', start, setStart)}
            {timeField('Finish', finish, setFinish)}
          </FieldGroup>
        </FieldGroup>
        {'error' in parsed && <p className="text-sm text-destructive">{parsed.error}</p>}
        <DialogFooter>
          <Button onClick={save} disabled={'error' in parsed}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
