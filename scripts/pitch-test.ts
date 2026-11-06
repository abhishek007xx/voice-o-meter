/**
 * Unit test for the pitch detection + scoring pipeline.
 * Generates synthetic sine waves and checks the detector locks
 * onto the correct fundamental frequency.
 */
import { autoCorrelate, machoScore, median } from "../src/lib/pitch";

const SAMPLE_RATE = 48000;

function makeSine(freq: number, seconds = 0.05, noise = 0): Float32Array {
  const n = Math.floor(SAMPLE_RATE * seconds);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) + (Math.random() - 0.5) * noise;
  }
  return buf;
}

function makeSawtooth(freq: number, seconds = 0.05): Float32Array {
  const n = Math.floor(SAMPLE_RATE * seconds);
  const buf = new Float32Array(n);
  const period = SAMPLE_RATE / freq;
  for (let i = 0; i < n; i++) {
    buf[i] = 0.5 * (2 * ((i % period) / period) - 1);
  }
  return buf;
}

let failures = 0;
function check(label: string, actual: number, expected: number, tolerancePct: number) {
  const ok = Math.abs(actual - expected) / expected <= tolerancePct / 100;
  console.log(
    `${ok ? "✅" : "❌"} ${label}: expected ~${expected} Hz, got ${actual.toFixed(1)} Hz`
  );
  if (!ok) failures++;
}

console.log("=== Pitch detection accuracy (sine waves) ===");
for (const f of [75, 85, 110, 130, 150, 180, 200, 240, 275, 320]) {
  const detected = autoCorrelate(makeSine(f), SAMPLE_RATE);
  check(`sine ${f} Hz`, detected, f, 1.5);
}

console.log("\n=== Harmonic-rich signal (sawtooth) ===");
for (const f of [110, 220]) {
  const detected = autoCorrelate(makeSawtooth(f), SAMPLE_RATE);
  check(`sawtooth ${f} Hz`, detected, f, 1.5);
}

console.log("\n=== Noise rejection ===");
const silence = new Float32Array(2048);
console.log(
  `${autoCorrelate(silence, SAMPLE_RATE) === -1 ? "✅" : "❌"} silence returns -1`
);
const noise = new Float32Array(2048);
for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 0.02;
console.log(
  `${autoCorrelate(noise, SAMPLE_RATE) === -1 ? "✅" : "❌"} low noise returns -1`
);

console.log("\n=== Macho score mapping ===");
const cases: [number, number][] = [
  [75, 100],
  [110, 70],
  [150, 47],
  [200, 24],
  [275, 0],
];
for (const [hz, expected] of cases) {
  const s = machoScore(hz);
  const ok = Math.abs(s - expected) <= 3;
  console.log(`${ok ? "✅" : "❌"} machoScore(${hz}) = ${s} (expected ~${expected})`);
  if (!ok) failures++;
}

console.log("\n=== Median robustness ===");
const med = median([100, 105, 102, 400, 98]); // 400 is a cough/octave error
console.log(
  `${Math.abs(med - 102) < 1 ? "✅" : "❌"} median ignores outliers: ${med}`
);

console.log(
  `\n${failures === 0 ? "🎉 ALL TESTS PASSED" : `💥 ${failures} test(s) failed`}`
);
process.exit(failures === 0 ? 0 : 1);
