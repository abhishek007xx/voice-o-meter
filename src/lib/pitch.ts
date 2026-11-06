/**
 * The "totally real science" behind VOICE-O-METER 3000.
 *
 * Implements autocorrelation-based fundamental frequency (F0) detection.
 * All processing is local: raw audio never leaves the browser.
 */

/** Pitches below this are ignored (probably rumble / electrical noise) */
export const MIN_PITCH_HZ = 60;
/** Pitches above this are ignored (probably harmonics / squeaky chairs) */
export const MAX_PITCH_HZ = 500;

/** Minimum RMS energy for a frame to be considered "someone is talking" */
const RMS_THRESHOLD = 0.008;
/** Minimum correlation clarity (peak vs energy) to accept a pitch */
const CLARITY_THRESHOLD = 0.35;

/**
 * Detect the fundamental frequency of a frame of time-domain audio
 * using the classic autocorrelation method (with edge trimming and
 * parabolic interpolation for sub-sample precision).
 *
 * @returns pitch in Hz, or -1 if the frame is unvoiced / too quiet.
 */
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;

  // 1. Is anyone actually talking?
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const v = buf[i];
    rms += v * v;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_THRESHOLD) return -1;

  // 2. Trim leading/trailing near-silence (relative to the frame's own peak)
  let peak = 0;
  for (let i = 0; i < SIZE; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  const cut = peak * 0.2;
  let start = 0;
  let end = SIZE - 1;
  while (start < SIZE / 2 && Math.abs(buf[start]) < cut) start++;
  while (end > SIZE / 2 && Math.abs(buf[end]) < cut) end--;
  if (end - start < 256) return -1; // not enough signal to work with

  const data = buf.subarray(start, end + 1);

  // 3. Only search lags that map to our pitch window
  const maxLag = Math.min(Math.floor(sampleRate / MIN_PITCH_HZ), data.length - 2);
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_PITCH_HZ));
  if (maxLag <= minLag + 2) return -1;

  // 4. Autocorrelation
  const c = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    const n = data.length - lag;
    for (let i = 0; i < n; i++) {
      sum += data[i] * data[i + lag];
    }
    c[lag] = sum;
  }

  // 5. Skip the initial descent, then find the highest peak
  let d = 0;
  while (d < maxLag - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -Infinity;
  let maxPos = -1;
  for (let i = d; i <= maxLag; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return -1;

  // 6. Reject noisy / unvoiced frames
  if (maxVal < CLARITY_THRESHOLD * c[0]) return -1;

  // 7. Parabolic interpolation around the peak for sub-sample precision
  let t0 = maxPos;
  const x1 = maxPos > 0 ? c[maxPos - 1] : maxVal;
  const x2 = maxVal;
  const x3 = maxPos < maxLag ? c[maxPos + 1] : maxVal;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) {
    const shift = b / (2 * a);
    if (Math.abs(shift) < 1) t0 = maxPos - shift;
  }

  const pitch = sampleRate / t0;
  if (pitch < MIN_PITCH_HZ || pitch > MAX_PITCH_HZ) return -1;
  return pitch;
}

/** Median — more robust to coughs, laughs and accidental opera */
export function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Pitch (Hz) that maps to 100% MACHO — below this, you're legally a subwoofer */
export const PITCH_FLOOR_HZ = 75;
/** Pitch (Hz) that maps to 0% MACHO — above this, only dogs fully appreciate you */
export const PITCH_CEIL_HZ = 275;

/**
 * Map a median pitch to the completely unofficial 0-100 "macho score".
 * Uses a log scale because human pitch perception works that way
 * (and because it makes the needle swing more dramatically).
 */
export function machoScore(hz: number): number {
  const clamped = Math.min(Math.max(hz, PITCH_FLOOR_HZ), PITCH_CEIL_HZ);
  const t =
    (Math.log(PITCH_CEIL_HZ) - Math.log(clamped)) /
    (Math.log(PITCH_CEIL_HZ) - Math.log(PITCH_FLOOR_HZ));
  return Math.round(t * 100);
}

/** Guaranteed-ish pause (for dramatic effect) */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
