// Tiny WebAudio bleeps for EMBER PACT: no audio files, everything is
// synthesised. Created lazily on the first user gesture (browsers block
// audio before one); every call is guarded so a headless screenshot run
// with no audio device can never throw.
let audioCtx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (muted) return null;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

function blip(freq, dur, type, gain, when = 0) {
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.02);
  } catch {
    // Audio is decoration; a failure must never break the game.
  }
}

// Named sound effects, one per game event.
export function playSound(name) {
  if (muted) return;
  switch (name) {
    case 'play': blip(520, 0.12, 'triangle', 0.12); blip(780, 0.1, 'triangle', 0.08, 0.05); break;
    case 'hit': blip(180, 0.18, 'sawtooth', 0.14); blip(90, 0.22, 'square', 0.1, 0.04); break;
    case 'heal': blip(660, 0.15, 'sine', 0.1); blip(880, 0.2, 'sine', 0.1, 0.08); break;
    case 'draw': blip(440, 0.08, 'triangle', 0.08); break;
    case 'turn': blip(392, 0.1, 'triangle', 0.09); blip(523, 0.12, 'triangle', 0.09, 0.07); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.25, 'triangle', 0.12, i * 0.12)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => blip(f, 0.3, 'sine', 0.1, i * 0.14)); break;
    case 'click': blip(700, 0.06, 'triangle', 0.07); break;
    default: blip(440, 0.08, 'triangle', 0.06);
  }
}
