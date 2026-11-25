// Warung Rush — tiny synthesized sounds, made with the Web Audio API.
// One file, one job: every beep, sizzle and chime, with no audio files.

let audioCtx = null;
let muted = false;

function ctx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Unlock audio on the first user gesture; browsers block it before then.
export function unlockAudio() {
  ctx();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, volume, when = 0) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const start = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noise(seconds, volume, filterFreq) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

// One named sound per game event. Keep them short and cheerful.
export function playSound(name) {
  switch (name) {
    case 'pickup':
      tone(520, 0.08, 'sine', 0.12);
      break;
    case 'chop':
      noise(0.12, 0.25, 1800);
      break;
    case 'sizzle':
      noise(0.4, 0.12, 4200);
      break;
    case 'ding':
      tone(880, 0.35, 'sine', 0.18);
      tone(1318, 0.4, 'sine', 0.12, 0.08);
      break;
    case 'served':
      tone(660, 0.12, 'triangle', 0.16);
      tone(880, 0.12, 'triangle', 0.16, 0.1);
      tone(1100, 0.25, 'triangle', 0.16, 0.2);
      break;
    case 'fail':
      tone(220, 0.3, 'sawtooth', 0.08);
      tone(165, 0.4, 'sawtooth', 0.08, 0.12);
      break;
    case 'error':
      tone(180, 0.12, 'square', 0.06);
      break;
    case 'click':
      tone(700, 0.05, 'sine', 0.08);
      break;
    default:
      break;
  }
}
