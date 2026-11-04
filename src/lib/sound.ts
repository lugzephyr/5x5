let context: AudioContext | undefined

/** Browsers only allow audio after a user gesture, so call this from a tap handler. */
export function unlockAudio(): void {
  context ??= new AudioContext()
  // iOS Safari reports 'interrupted' after the app was in the background
  if (context.state !== 'running') void context.resume()
}

/** Three short beeps, plus a vibration where supported. */
export function playAlert(): void {
  navigator.vibrate?.([200, 100, 200, 100, 200])
  if (!context) return
  for (let i = 0; i < 3; i++) {
    const start = context.currentTime + i * 0.3
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.4, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.2)
  }
}
