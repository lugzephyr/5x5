import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useId, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { NumberField } from '@/components/number-field'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  addWorkouts,
  exportBackup,
  importBackup,
  isFinished,
  parseBackup,
  saveSettings,
  useSettings,
  type Backup,
} from '@/data/repository'
import { EXERCISES } from '@/domain/program'
import { switchUnit } from '@/domain/settings'
import { parseStrongLiftsCsv, type StrongLiftsImport } from '@/domain/stronglifts'
import type { ExerciseId, Unit } from '@/domain/types'
import { WEIGHT_STEP, fromUnit, toUnit } from '@/domain/units'
import { DISPLAY_SIZES, getDisplaySize, saveDisplaySize } from '@/lib/display-size'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const REST_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10].map((min) => ({
  value: min * 60,
  label: `${min} min`,
}))
const MISS_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))
const DELOAD_OPTIONS = [5, 10, 15, 20].map((n) => ({ value: n, label: `${n}%` }))
const BREAK_OPTIONS = [
  { value: 0, label: 'Off' },
  ...[1, 2, 3, 4].map((weeks) => ({ value: weeks * 7, label: `${weeks} wk` })),
]

function SettingsPage() {
  const settings = useSettings()
  if (!settings) return null
  const { unit } = settings

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Section title="General">
        <Field orientation="horizontal">
          <FieldLabel>Units</FieldLabel>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[unit]}
            onValueChange={([next]) => next && saveSettings(switchUnit(settings, next as Unit))}
          >
            <ToggleGroupItem value="kg">kg</ToggleGroupItem>
            <ToggleGroupItem value="lb">lb</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <WeightField
          label="Bar weight"
          kg={settings.barWeightKg}
          unit={unit}
          onCommit={(barWeightKg) => saveSettings({ barWeightKg })}
        />
        <DisplaySizeField />
      </Section>

      <Section title="Increments">
        {(Object.keys(EXERCISES) as ExerciseId[]).map((id) => (
          <WeightField
            key={id}
            label={EXERCISES[id].name}
            kg={settings.exercises[id].incrementKg}
            unit={unit}
            onCommit={(incrementKg) =>
              saveSettings({ exercises: { ...settings.exercises, [id]: { incrementKg } } })
            }
          />
        ))}
      </Section>

      <Section title="Progression">
        <SelectField
          label="Misses before deload"
          value={settings.missesBeforeDeload}
          options={MISS_OPTIONS}
          onChange={(missesBeforeDeload) => saveSettings({ missesBeforeDeload })}
        />
        <SelectField
          label="Deload"
          value={settings.deloadPercent}
          options={DELOAD_OPTIONS}
          onChange={(deloadPercent) => saveSettings({ deloadPercent })}
        />
        <SelectField
          label="Deload prompt after"
          value={settings.breakDays}
          options={BREAK_OPTIONS}
          onChange={(breakDays) => saveSettings({ breakDays })}
        />
      </Section>

      <Section title="Rest timer">
        <SelectField
          label="After a set"
          value={settings.restSeconds}
          options={REST_OPTIONS}
          onChange={(restSeconds) => saveSettings({ restSeconds })}
        />
        <SelectField
          label="After a missed set"
          value={settings.restAfterMissSeconds}
          options={REST_OPTIONS}
          onChange={(restAfterMissSeconds) => saveSettings({ restAfterMissSeconds })}
        />
        <SwitchRow
          label="Sound when rest is over"
          checked={settings.sound}
          onChange={(sound) => saveSettings({ sound })}
        />
        <SwitchRow
          label="Keep screen on during workouts"
          checked={settings.keepScreenOn}
          onChange={(keepScreenOn) => saveSettings({ keepScreenOn })}
        />
      </Section>

      <BackupSection />
    </div>
  )
}

function BackupSection() {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [strongLifts, setStrongLifts] = useState<StrongLiftsImport | null>(null)
  const [message, setMessage] = useState('')

  async function onExport() {
    const backup = await exportBackup()
    const name = `5x5-backup-${format(backup.exportedAt, 'yyyy-MM-dd')}.json`
    const file = new File([JSON.stringify(backup)], name, { type: 'application/json' })
    // The share sheet is the reliable way to save a file from an installed app on phones
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {})
    } else {
      const url = URL.createObjectURL(file)
      Object.assign(document.createElement('a'), { href: url, download: name }).click()
      // Revoking right away can cancel the download in some browsers
      setTimeout(() => URL.revokeObjectURL(url))
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    const csv = file.name.toLowerCase().endsWith('.csv')
    try {
      if (csv) setStrongLifts(parseStrongLiftsCsv(text, Date.now()))
      else setPending(parseBackup(text))
      setMessage('')
    } catch {
      setMessage(csv ? "That file isn't a StrongLifts export." : "That file isn't a 5x5 backup.")
    }
  }

  return (
    <Section
      title="Backup"
      description="Stored on this device only. Import takes a 5x5 backup or a StrongLifts CSV export."
    >
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onExport}>
          Export
        </Button>
        <Button variant="outline" size="lg" onClick={() => input.current?.click()}>
          Import
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json,text/csv,text/comma-separated-values,.csv"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Replace all data?"
        description={`Your workouts and settings will be replaced by the backup (${pluralize(
          pending?.workouts.filter(isFinished).length ?? 0,
          'workout',
        )}).`}
        confirmLabel="Replace"
        destructive
        onConfirm={async () => {
          if (!pending) return
          try {
            await importBackup(pending)
            setMessage('Backup restored.')
          } catch {
            setMessage("That backup couldn't be restored.")
          }
        }}
      />
      <ConfirmDialog
        open={strongLifts !== null}
        onOpenChange={(open) => !open && setStrongLifts(null)}
        title="Add StrongLifts workouts?"
        description={`${pluralize(strongLifts?.workouts.length ?? 0, 'workout')} found. Any already imported are left as they are.${
          strongLifts?.skippedRows
            ? ` ${pluralize(strongLifts.skippedRows, 'row')} the app doesn't track will be skipped.`
            : ''
        }`}
        confirmLabel="Add"
        onConfirm={async () => {
          if (!strongLifts) return
          try {
            const added = await addWorkouts(strongLifts.workouts)
            setMessage(added ? `Added ${pluralize(added, 'workout')}.` : 'No new workouts to add.')
          } catch {
            setMessage("Those workouts couldn't be added.")
          }
        }}
      />
    </Section>
  )
}

/** Kept per device outside the settings record, so it holds its own state. */
function DisplaySizeField() {
  const [size, setSize] = useState(getDisplaySize)
  return (
    <SelectField
      label="Display size"
      value={size}
      options={DISPLAY_SIZES}
      onChange={(next) => {
        saveDisplaySize(next)
        setSize(next)
      }}
    />
  )
}

/** A weight input shown in the chosen unit and stored in kg. */
function WeightField({
  label,
  kg,
  unit,
  onCommit,
}: {
  label: string
  kg: number
  unit: Unit
  onCommit: (kg: number) => void
}) {
  return (
    <NumberField
      label={label}
      value={toUnit(kg, unit)}
      suffix={unit}
      step={WEIGHT_STEP[unit]}
      onCommit={(v) => onCommit(fromUnit(v, unit))}
    />
  )
}

const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  )
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  )
}
