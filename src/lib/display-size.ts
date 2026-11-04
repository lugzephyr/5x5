// Per device, so it lives in this browser's storage rather than the synced settings
const KEY = 'displaySize'

/** Root font size in percent; every rem-based size in the UI scales with it. */
export const DISPLAY_SIZES = [
  { value: 100, label: 'Small' },
  { value: 112.5, label: 'Medium' },
  { value: 125, label: 'Large' },
  { value: 137.5, label: 'Extra large' },
]

/** The saved size, else Large on touch screens (shadcn is sized for a mouse) and Small otherwise. */
export function getDisplaySize(): number {
  const saved = Number(read())
  if (DISPLAY_SIZES.some((s) => s.value === saved)) return saved
  return matchMedia('(pointer: coarse)').matches ? 125 : 100
}

export function applyDisplaySize(size = getDisplaySize()): void {
  document.documentElement.style.fontSize = `${size}%`
}

export function saveDisplaySize(size: number): void {
  try {
    localStorage.setItem(KEY, String(size))
  } catch {
    // Storage blocked: the size still applies until the app is reopened
  }
  applyDisplaySize(size)
}

// Throws when the browser blocks site storage; startup must not fail over a display preference
function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
