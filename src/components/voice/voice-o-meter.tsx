"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  FlaskConical,
  Gavel,
  Loader2,
  Mic,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Confetti } from "./confetti";
import { Gauge } from "./gauge";
import { Waveform } from "./waveform";
import { autoCorrelate, machoScore, median, sleep } from "@/lib/pitch";
import {
  ANALYSIS_STEPS,
  ANALYZING_MESSAGES,
  ANONYMOUS_NAME,
  APPEAL_REJECTIONS,
  getVerdict,
  HOW_IT_WORKS,
  hzFact,
  RECORDING_TIPS,
  TICKER_PHRASES,
} from "@/lib/verdicts";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

type Phase = "idle" | "countdown" | "recording" | "analyzing" | "result";

interface HallEntry {
  id: string;
  name: string;
  score: number;
  hz: number;
  title: string;
  emoji: string;
  ts: number;
}

const RECORD_MS = 5000;
const HALL_KEY = "voiceometer3000.hall";
const NAME_KEY = "voiceometer3000.name";

const screenAnim = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.98 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

/** Animated count-up number for the big reveal */
function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => setV(Math.round(x)),
    });
    return () => controls.stop();
  }, [to]);
  return <>{v}</>;
}

export function VoiceOMeter() {
  const { toast } = useToast();

  const [phase, setPhaseState] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const [name, setName] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analyzeMsgIdx, setAnalyzeMsgIdx] = useState(0);
  const [result, setResult] = useState<{ score: number; hz: number } | null>(null);
  const [rank, setRank] = useState(1);
  const [hall, setHall] = useState<HallEntry[]>([]);
  const [confettiTick, setConfettiTick] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [tipIdx, setTipIdx] = useState(0);

  const sessionRef = useRef(0);
  const busyRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const pitchesRef = useRef<number[]>([]);

  /* ---------- persistence ---------- */

  useEffect(() => {
    try {
      const h = localStorage.getItem(HALL_KEY);
      if (h) setHall(JSON.parse(h) as HallEntry[]);
      const n = localStorage.getItem(NAME_KEY);
      if (n) setName(n);
    } catch {
      /* private mode — the Meter forgives */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* ignore */
    }
  }, [name]);

  /* ---------- audio lifecycle ---------- */

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  /* rotating tips while recording */
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setTipIdx((i) => (i + 1) % RECORDING_TIPS.length), 2600);
    return () => clearInterval(id);
  }, [phase]);

  /* ---------- the flow ---------- */

  const saveToHall = (score: number, hz: number) => {
    const verdict = getVerdict(score);
    const entry: HallEntry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: name.trim().slice(0, 24) || ANONYMOUS_NAME,
      score,
      hz,
      title: verdict.title,
      emoji: verdict.emoji,
      ts: Date.now(),
    };
    setRank(hall.filter((e) => e.score > score).length + 1);
    setHall((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem(HALL_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const finishRecording = async (session: number) => {
    cleanupAudio();
    setCurrentPitch(null);
    const pitches = pitchesRef.current;
    if (pitches.length < 6) {
      setMicError(
        "We barely heard you! Are you a mime? 🤐 Speak up, hold that \u201caaaahhh\u201d, and try again."
      );
      setPhase("idle");
      return;
    }
    const hz = median(pitches);
    const score = machoScore(hz);
    setResult({ score, hz });
    setPhase("analyzing");
    for (let i = 0; i < ANALYZING_MESSAGES.length; i++) {
      setAnalyzeMsgIdx(i);
      if (i > 0) sfx.tick();
      await sleep(720);
      if (sessionRef.current !== session) return;
    }
    sfx.fanfare();
    setConfettiTick((t) => t + 1);
    setPhase("result");
    saveToHall(score, hz);
  };

  const runRecording = (analyser: AnalyserNode, sampleRate: number, session: number) => {
    const buffer = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    let lastDetect = 0;

    const loop = (now: number) => {
      if (sessionRef.current !== session) return;
      const elapsed = now - startedAt;
      setProgress(Math.min(1, elapsed / RECORD_MS));

      if (now - lastDetect > 45) {
        lastDetect = now;
        analyser.getFloatTimeDomainData(buffer);
        const p = autoCorrelate(buffer, sampleRate);
        if (p > 0) {
          pitchesRef.current.push(p);
          setCurrentPitch(p);
          setSampleCount(pitchesRef.current.length);
        }
      }

      if (elapsed >= RECORD_MS) {
        void finishRecording(session);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const startTest = async () => {
    if (busyRef.current) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "result") return;
    busyRef.current = true;
    sfx.click(); // unlock audio on user gesture
    setMicError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("This browser doesn't support microphone access. The Meter is sad. 😞 Try Chrome, Edge or Safari.");
      busyRef.current = false;
      return;
    }

    const session = ++sessionRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      if (sessionRef.current !== session) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      pitchesRef.current = [];
      setResult(null);
      setCurrentPitch(null);
      setSampleCount(0);
      setProgress(0);

      setPhase("countdown");
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        sfx.tick();
        await sleep(750);
        if (sessionRef.current !== session) return;
      }
      sfx.go();
      setPhase("recording");
      runRecording(analyser, ctx.sampleRate, session);
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : "";
      if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setMicError("No microphone found! The Meter is now just a very colorful thermometer. 🌡️");
      } else {
        setMicError(
          "Mic access denied! The Meter can't hear you — maybe it's shy? 🙈 Click the 🔒 icon in the address bar, allow the microphone, and try again."
        );
      }
      cleanupAudio();
      setPhase("idle");
    } finally {
      busyRef.current = false;
    }
  };

  const cancelTest = () => {
    sfx.click();
    sessionRef.current += 1; // invalidates every in-flight loop
    cleanupAudio();
    setCurrentPitch(null);
    setProgress(0);
    setPhase("idle");
  };

  const shareResult = async () => {
    if (!result) return;
    const v = getVerdict(result.score);
    const text = `🎤 My voice is ${result.score}% MACHO (${Math.round(result.hz)} Hz) — official verdict: ${v.title} ${v.emoji}\nThink your voice is deeper? Prove it. — VOICE-O-METER 3000`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "VOICE-O-METER 3000", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard! 🔥",
          description: "Now go challenge your friends.",
          className: "!border-white/20 !bg-[#241640] !text-white",
        });
      }
    } catch {
      /* user cancelled the share sheet — no drama */
    }
  };

  const dispute = () => {
    sfx.click();
    toast({
      title: APPEAL_REJECTIONS[Math.floor(Math.random() * APPEAL_REJECTIONS.length)],
      description: "Results are final. The Meter apologizes for nothing. 🎤",
      className: "!border-white/20 !bg-[#241640] !text-white",
    });
  };

  const clearHall = () => {
    sfx.click();
    setHall([]);
    try {
      localStorage.removeItem(HALL_KEY);
    } catch {
      /* ignore */
    }
    toast({
      title: "Hall of Fame demolished 🏚️",
      description: "All legendary voices have been forgotten.",
      className: "!border-white/20 !bg-[#241640] !text-white",
    });
  };

  /* ---------- derived ---------- */

  const liveScore = currentPitch !== null ? machoScore(currentPitch) : null;
  const verdict = result ? getVerdict(result.score) : null;

  /* ---------- render ---------- */

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-arcade text-white">
      {/* CRT scanlines */}
      <div className="crt-overlay" aria-hidden />

      {/* scrolling ticker */}
      <div className="overflow-hidden border-b border-white/10 bg-black/50 py-1.5">
        <div className="animate-marquee flex w-max whitespace-nowrap">
          {[...TICKER_PHRASES, ...TICKER_PHRASES].map((p, i) => (
            <span key={i} className="mx-6 text-[11px] font-semibold tracking-wide text-white/50">
              {p}
            </span>
          ))}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:py-10">
        {/* header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-[#ff2e88]/40 bg-[#ff2e88]/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-[#ff8fc0]">
              EST. 2026
            </span>
            <span className="rounded-full border border-[#06d6a0]/40 bg-[#06d6a0]/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-[#06d6a0]">
              FUN-GRADE EQUIPMENT
            </span>
          </div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl md:text-6xl">
            <span className="text-[#ff2e88] drop-shadow-[0_0_25px_rgba(255,46,136,0.5)]">VOICE</span>
            <span className="text-white/90">-O-</span>
            <span className="text-[#ffd60a] drop-shadow-[0_0_25px_rgba(255,214,10,0.5)]">METER</span>
            <sup className="ml-1 align-super text-2xl text-[#06d6a0] sm:text-3xl">3000</sup>
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/55 sm:text-base">
            The world&apos;s most <span className="font-semibold text-white/80">unofficial</span>{" "}
            voice test. Do you sound like Barry White 🎩 or Mickey Mouse 🐭? There&apos;s only one
            way to find out.
          </p>
        </header>

        {/* screens */}
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.section key="idle" {...screenAnim} aria-label="Start screen" className="flex flex-col gap-6">
              {/* certification badges */}
              <div className="flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#06d6a0]" /> CERTIFIED 127% ACCURATE*
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">
                  <FlaskConical className="h-3.5 w-3.5 text-[#ffd60a]" /> INSTITUTE OF TOTALLY REAL SCIENCE™
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ff5db1]" /> 100% ON-DEVICE
                </span>
              </div>

              {/* idle gauge */}
              <Gauge
                score={null}
                mode="idle"
                readout={
                  <>
                    <span className="font-display text-3xl text-white/85">READY</span>
                    <span className="text-[10px] tracking-[0.3em] text-white/40">
                      AWAITING VOICE SPECIMEN
                    </span>
                  </>
                }
              />

              {/* mic error */}
              {micError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{micError}</p>
                </div>
              )}

              {/* name + start */}
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <label
                  htmlFor="contestant-name"
                  className="text-sm font-semibold text-white/75"
                >
                  📝 Contestant name{" "}
                  <span className="font-normal text-white/40">(for the Hall of Fame)</span>
                </label>
                <Input
                  id="contestant-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  placeholder={`Leave empty to compete as ${ANONYMOUS_NAME}`}
                  className="h-12 border-white/15 bg-[#160c2b] text-white placeholder:text-white/30 focus-visible:ring-[#ff2e88]"
                />
                <Button
                  onClick={() => void startTest()}
                  className="h-14 bg-[#ff2e88] text-lg text-white shadow-[0_0_35px_rgba(255,46,136,0.4)] hover:bg-[#ff1a7a]"
                >
                  <Mic className="mr-2 h-6 w-6" />
                  <span className="font-display tracking-wide">START THE TEST</span>
                </Button>
                <p className="text-center text-xs text-white/40">
                  Works best with the confidence of someone who absolutely deserves this. 🔊
                </p>
              </div>

              {/* how it works */}
              <div className="grid gap-3 sm:grid-cols-3">
                {HOW_IT_WORKS.map((s, i) => (
                  <div
                    key={s.title}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center"
                  >
                    <div className="text-2xl" aria-hidden>
                      {s.icon}
                    </div>
                    <p className="mt-2 text-sm font-bold tracking-wide text-white/80">
                      STEP {i + 1} — {s.title.toUpperCase()}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/50">{s.text}</p>
                  </div>
                ))}
              </div>

              <HallOfFame hall={hall} onClear={clearHall} />
            </motion.section>
          )}

          {phase === "countdown" && (
            <motion.section
              key="countdown"
              {...screenAnim}
              aria-label="Get ready"
              className="flex flex-col items-center gap-8 py-6"
            >
              <p className="font-display text-sm tracking-[0.35em] text-white/60">
                GET READY TO SPEAK
              </p>
              <div className="relative">
                <motion.div
                  className="absolute -inset-8 rounded-full border-2 border-[#ffd60a]/40"
                  animate={{ scale: [0.9, 1.45], opacity: [0.7, 0] }}
                  transition={{ duration: 0.75, repeat: Infinity, ease: "easeOut" }}
                  aria-hidden
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="font-display text-[7rem] leading-none text-[#ffd60a] drop-shadow-[0_0_35px_rgba(255,214,10,0.5)] sm:text-[9rem]"
                  >
                    {countdown}
                  </motion.div>
                </AnimatePresence>
              </div>
              <p className="max-w-sm text-center text-sm leading-relaxed text-white/60">
                When the number hits 1, say{" "}
                <span className="font-bold text-[#ffd60a]">&ldquo;Aaaaahhh&rdquo;</span> or go full
                movie trailer:{" "}
                <span className="italic">&ldquo;In a world where one voice rules them all…&rdquo;</span>
              </p>
              <Button variant="ghost" onClick={cancelTest} className="text-white/40 hover:text-white/70">
                cancel, I&apos;m scared 😰
              </Button>
            </motion.section>
          )}

          {phase === "recording" && (
            <motion.section
              key="recording"
              {...screenAnim}
              aria-label="Recording"
              className="flex flex-col gap-5"
            >
              <div className="flex items-center justify-center gap-3" role="status" aria-live="polite">
                <motion.span
                  className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,35,60,0.9)]"
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  aria-hidden
                />
                <span className="font-display text-sm tracking-[0.35em] text-red-400">
                  LISTENING…
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <Waveform analyserRef={analyserRef} active={phase === "recording"} />
                <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                  <span>🎙️ {sampleCount} voice samples captured</span>
                  <span className="font-mono font-bold text-white/80">
                    {currentPitch !== null ? `${Math.round(currentPitch)} Hz` : "listening…"}
                  </span>
                </div>
              </div>

              <Gauge
                score={liveScore}
                mode="live"
                readout={
                  <>
                    <span className="font-display text-4xl text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                      {liveScore !== null ? `${liveScore}%` : "--%"}
                    </span>
                    <span className="text-[10px] tracking-[0.3em] text-white/40">
                      {currentPitch !== null ? "LIVE READING" : "WAITING FOR VOICE"}
                    </span>
                  </>
                }
              />

              <div>
                <Progress
                  value={progress * 100}
                  className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#ff2e88] [&>div]:to-[#ffd60a]"
                />
                <p className="mt-1.5 text-center text-[11px] text-white/40">
                  keep talking — the fake science needs data
                </p>
              </div>

              <div className="flex min-h-6 items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="text-center text-sm text-white/60"
                  >
                    {RECORDING_TIPS[tipIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <Button variant="ghost" onClick={cancelTest} className="text-white/40 hover:text-white/70">
                abort mission 🚀
              </Button>
            </motion.section>
          )}

          {phase === "analyzing" && (
            <motion.section
              key="analyzing"
              {...screenAnim}
              aria-label="Analyzing"
              className="flex flex-col items-center gap-7 py-6"
              role="status"
              aria-live="polite"
            >
              <div className="relative">
                <motion.div
                  className="absolute -inset-5 rounded-full border-2 border-[#06d6a0]/30"
                  animate={{ scale: [0.9, 1.4], opacity: [0.7, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  aria-hidden
                />
                <motion.span
                  className="block text-7xl"
                  animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  aria-hidden
                >
                  🔬
                </motion.span>
              </div>

              <div className="flex h-9 items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={analyzeMsgIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="text-center text-base font-semibold text-white/85"
                  >
                    {ANALYZING_MESSAGES[analyzeMsgIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="fancy-scroll flex w-full max-w-sm flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                {ANALYSIS_STEPS.map((s, i) => {
                  const done = i < analyzeMsgIdx;
                  const current = i === analyzeMsgIdx;
                  return (
                    <div key={s.label} className="flex items-center gap-3 text-sm">
                      <span className="flex w-5 justify-center" aria-hidden>
                        {done ? (
                          "✅"
                        ) : current ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#06d6a0]" />
                        ) : (
                          "⬜"
                        )}
                      </span>
                      <span
                        className={cn(
                          done && "text-white/40 line-through",
                          current && "font-semibold text-white",
                          !done && !current && "text-white/30"
                        )}
                      >
                        {s.icon} {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {phase === "result" && result && verdict && (
            <motion.section
              key="result"
              {...screenAnim}
              aria-label="Your verdict"
              className="flex flex-col gap-5"
            >
              {/* verdict header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.15 }}
                  className="text-6xl sm:text-7xl"
                  aria-hidden
                >
                  {verdict.emoji}
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-display mt-2 text-3xl sm:text-4xl"
                  style={{ color: verdict.color, textShadow: `0 0 24px ${verdict.color}66` }}
                >
                  {verdict.title}
                </motion.h2>
                <p className="mt-1 text-sm text-white/60">{verdict.subtitle}</p>
              </div>

              <Gauge
                score={result.score}
                mode="result"
                readout={
                  <>
                    <span
                      className="font-display text-4xl"
                      style={{ color: verdict.color, textShadow: `0 0 18px ${verdict.color}66` }}
                    >
                      <CountUp to={result.score} />%
                    </span>
                    <span className="text-[10px] tracking-[0.3em] text-white/40">MACHO SCORE</span>
                  </>
                }
              />

              {/* stat chips */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: "MACHO SCORE", value: `${result.score}%`, color: verdict.color },
                  { label: "AVG PITCH", value: `${Math.round(result.hz)} Hz`, color: "#ffffff" },
                  { label: "SAMPLES", value: `${sampleCount} 🎙️`, color: "#ffffff" },
                  { label: "SQUAD RANK", value: `#${rank}/${hall.length || 1}`, color: "#ffd60a" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center"
                  >
                    <p className="font-display text-lg leading-tight" style={{ color: c.color }}>
                      {c.value}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold tracking-[0.18em] text-white/40">
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-white/75">
                {hzFact(result.hz)}
              </div>

              {/* roast */}
              <blockquote
                className="relative rounded-xl border-2 border-dashed p-5 pt-6"
                style={{ borderColor: `${verdict.color}55` }}
              >
                <span
                  className="absolute -top-2.5 left-4 bg-arcade px-2 text-[10px] font-bold tracking-[0.25em]"
                  style={{ color: verdict.color }}
                >
                  OFFICIAL ROAST
                </span>
                <p className="leading-relaxed text-white/85">{verdict.roast}</p>
              </blockquote>

              {hall.length === 1 && (
                <p className="text-center text-xs text-white/45">
                  Squad rank #1 of 1 — go grab some friends (or rivals) and make it interesting. 😜
                </p>
              )}

              {/* actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void startTest()}
                  className="h-12 flex-1 bg-[#ffd60a] text-base font-bold text-[#241640] hover:bg-[#ffdf3d]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> TEST AGAIN
                </Button>
                <Button
                  onClick={() => void shareResult()}
                  variant="outline"
                  className="h-12 flex-1 border-[#06d6a0]/50 bg-transparent text-base font-bold text-[#06d6a0] hover:bg-[#06d6a0]/10 hover:text-[#06d6a0]"
                >
                  <Share2 className="mr-2 h-4 w-4" /> SHARE
                </Button>
                <Button
                  onClick={dispute}
                  variant="ghost"
                  className="h-12 text-base font-semibold text-white/50 hover:text-white/80"
                >
                  <Gavel className="mr-2 h-4 w-4" /> DISPUTE
                </Button>
              </div>

              <HallOfFame hall={hall} onClear={clearHall} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* footer */}
      <footer className="mt-auto border-t border-white/10 bg-black/30 px-4 py-5 text-center">
        <p className="mx-auto max-w-2xl text-xs leading-relaxed text-white/40">
          *127% accuracy certified by the Institute of Totally Real Science™. VOICE-O-METER 3000 is
          0% science and 100% fun — pitch varies with mood, caffeine, and courage.
        </p>
        <p className="mt-1.5 text-xs text-white/30">
          🔒 All audio is analyzed locally in your browser. Nothing is recorded, stored, or
          uploaded. Ever.
        </p>
      </footer>

      <Confetti trigger={confettiTick} />
    </div>
  );
}

/* ---------------- Hall of Fame ---------------- */

function HallOfFame({ hall, onClear }: { hall: HallEntry[]; onClear: () => void }) {
  if (hall.length === 0) return null;
  return (
    <section
      aria-label="Hall of Fame"
      className="rounded-2xl border border-[#ffd60a]/25 bg-[#ffd60a]/[0.04] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#ffd60a]">
          <Trophy className="h-4 w-4" /> HALL OF FAME ({hall.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs text-white/35 hover:text-red-300"
          aria-label="Clear Hall of Fame"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> clear
        </Button>
      </div>
      <div className="fancy-scroll flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {hall.map((e, idx) => {
          const v = getVerdict(e.score);
          return (
            <div
              key={e.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2",
                idx === 0 && "border-[#ffd60a]/50 bg-[#ffd60a]/[0.07]"
              )}
            >
              <span className="text-2xl" aria-hidden>
                {e.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/90">{e.name}</p>
                <p className="text-xs text-white/40">
                  {e.title} · {Math.round(e.hz)} Hz
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg leading-tight" style={{ color: v.color }}>
                  {e.score}%
                </p>
                <p className="text-[10px] text-white/35">
                  {formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
