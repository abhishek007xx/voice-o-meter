/**
 * Tiny chiptune sound engine — synthesized live with Web Audio,
 * so we ship zero audio files and maximum nostalgia.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.06
) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + startOffset;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    // audio is a luxury, not a necessity
  }
}

export const sfx = {
  /** soft UI blip (also unlocks the AudioContext on user gesture) */
  click: () => tone(520, 0, 0.06, "triangle", 0.05),
  /** countdown tick */
  tick: () => tone(660, 0, 0.09, "square", 0.05),
  /** GO! */
  go: () => {
    tone(880, 0, 0.1, "square", 0.05);
    tone(1318, 0.1, 0.16, "square", 0.05);
  },
  /** verdict fanfare */
  fanfare: () => {
    tone(523, 0, 0.12, "square", 0.05);
    tone(659, 0.13, 0.12, "square", 0.05);
    tone(784, 0.26, 0.12, "square", 0.05);
    tone(1047, 0.39, 0.38, "square", 0.06);
    tone(784, 0.39, 0.38, "triangle", 0.03);
  },
};
