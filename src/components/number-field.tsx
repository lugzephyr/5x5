import { useId, useState } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { isMultipleOf } from '@/domain/units'

interface Props {
  label: string
  value: number
  suffix?: string
  /** If set, only multiples of it are valid */
  step?: number
  /** Called on blur or Enter with a valid number; invalid input reverts. */
  onCommit: (value: number) => void
}

/** A settings row: label on the left, a compact number input on the right. */
export function NumberField({ label, value, suffix, step, onCommit }: Props) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)

  // Follow outside changes, e.g. switching units
  if (value !== shown) {
    setShown(value)
    setText(String(value))
  }

  const n = Number(text)
  const valid =
    text.trim() !== '' &&
    Number.isFinite(n) &&
    n >= 0 &&
    (step === undefined || isMultipleOf(n, step))

  function commit() {
    if (valid) {
      if (n !== value) onCommit(n)
    } else {
      setText(String(value))
    }
  }

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="w-28">
        <InputGroupInput
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-invalid={!valid}
        />
        {suffix && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </Field>
  )
}
