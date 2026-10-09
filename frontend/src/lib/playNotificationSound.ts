// No audio asset exists (or was supplied) for the admin "new order" chime,
// so this generates a short two-tone sound with the native Web Audio API
// instead of requiring a file. A GainNode envelope (quick fade in/out)
// avoids the click/pop a hard on/off would produce.
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }
  return sharedAudioContext;
}

// Browsers block audio output until the page has had at least one user
// gesture (click/keydown) — this "warms up" (creates + resumes) the shared
// AudioContext on that first gesture, so a later background-poll-triggered
// chime isn't silently dropped. Safe to call repeatedly.
export function unlockNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") void ctx.resume();
  } catch {
    // Audio unsupported/blocked — the chime will just silently no-op later.
  }
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.015);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.15);
    playTone(ctx, 1046.5, now + 0.15, 0.18);
  } catch {
    // Never let a blocked/unsupported chime break the toast/badge update.
  }
}
