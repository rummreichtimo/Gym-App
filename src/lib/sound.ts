'use client';

/**
 * Short chime for the end of a rest period, synthesised with the Web Audio API
 * so no audio asset has to be shipped or loaded.
 */
let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
}

export function playRestFinishedSound(): void {
  const context = getContext();
  if (!context) return;

  // Browsers suspend the context until a user gesture has occurred.
  if (context.state === 'suspended') void context.resume();

  const now = context.currentTime;
  // Two short rising beeps.
  [
    { frequency: 660, at: 0 },
    { frequency: 880, at: 0.18 },
  ].forEach(({ frequency, at }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + at);
    oscillator.stop(now + at + 0.18);
  });
}

/** Short haptic pulse where the browser supports it. */
export function vibrate(pattern: number | number[] = [80, 60, 80]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
