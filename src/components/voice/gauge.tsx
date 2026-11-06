"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ZONES = [
  { from: 0, to: 20, color: "#ff2e88", label: "DIVA 🎀" },
  { from: 20, to: 40, color: "#c77dff", label: "SPARKLE ✨" },
  { from: 40, to: 60, color: "#ffd60a", label: "MYSTIC 🧙" },
  { from: 60, to: 80, color: "#ff8c42", label: "SMOOTH 🕺" },
  { from: 80, to: 100, color: "#ef233c", label: "MACHO 💪" },
];

/* Geometry of the semicircle dial (viewBox 0 0 320 212) */
const CX = 160;
const CY = 160;
const R_ARC = 132;
const R_TICK_OUT = 122;
const R_TICK_IN = 112;
const R_LABEL = 86;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(r: number, a0: number, a1: number) {
  const s = polar(CX, CY, r, a0);
  const e = polar(CX, CY, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/** score 0 → 180° (left), score 100 → 360° (right) */
const scoreAngle = (score: number) => 180 + Math.min(100, Math.max(0, score)) * 1.8;

/** round to 2 decimals — keeps SSR and client SVG attributes byte-identical */
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface GaugeProps {
  /** 0-100, or null when there is nothing to show (needle idles) */
  score: number | null;
  mode: "idle" | "live" | "result";
  /** custom readout rendered under the pivot */
  readout?: ReactNode;
  className?: string;
}

export function Gauge({ score, mode, readout, className }: GaugeProps) {
  const clamped = score === null ? null : Math.min(100, Math.max(0, score));
  const needleAngle = clamped === null ? 0 : -90 + clamped * 1.8;
  const idling = mode === "idle" || clamped === null;

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[400px] select-none", className)}
      role="img"
      aria-label={
        clamped === null
          ? "Masculinity meter, waiting for a voice"
          : `Masculinity meter reading ${clamped} out of 100`
      }
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-[radial-gradient(ellipse,#ff2e88_0%,transparent_70%)] opacity-20 blur-2xl" />

      <svg viewBox="0 0 320 212" className="w-full overflow-visible">
        {/* track */}
        <path
          d={arcPath(R_ARC, 180, 360)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* zones */}
        {ZONES.map((z) => (
          <path
            key={z.label}
            d={arcPath(R_ARC, scoreAngle(z.from) + 1.2, scoreAngle(z.to) - 1.2)}
            fill="none"
            stroke={z.color}
            strokeWidth={18}
            strokeLinecap="butt"
            opacity={0.9}
          />
        ))}
        {/* ticks */}
        {Array.from({ length: 11 }, (_, i) => {
          const a = scoreAngle(i * 10);
          const p1 = polar(CX, CY, R_TICK_IN, a);
          const p2 = polar(CX, CY, R_TICK_OUT, a);
          return (
            <line
              key={i}
              x1={r2(p1.x)}
              y1={r2(p1.y)}
              x2={r2(p2.x)}
              y2={r2(p2.y)}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}
        {/* zone labels */}
        {ZONES.map((z) => {
          const a = scoreAngle((z.from + z.to) / 2);
          const p = polar(CX, CY, R_LABEL, a);
          return (
            <text
              key={z.label}
              x={r2(p.x)}
              y={r2(p.y)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9.5}
              fontWeight={700}
              fill={z.color}
              opacity={0.95}
            >
              {z.label}
            </text>
          );
        })}
        {/* end mascots */}
        <text x={20} y={200} fontSize={26} textAnchor="middle" aria-hidden>
          👸
        </text>
        <text x={300} y={200} fontSize={26} textAnchor="middle" aria-hidden>
          🎩
        </text>
      </svg>

      {/* needle (HTML so we get buttery springs + glow) */}
      <motion.div
        className="absolute bottom-[24.5%] left-1/2 z-10 h-[53%] w-[6px] -translate-x-1/2 origin-bottom rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
        initial={{ rotate: mode === "result" ? 0 : needleAngle }}
        animate={idling ? { rotate: [-44, -33, -47, -36, -44] } : { rotate: needleAngle }}
        transition={
          idling
            ? { duration: 7, repeat: Infinity, ease: "easeInOut" }
            : mode === "result"
              ? { type: "spring", stiffness: 42, damping: 10 }
              : { type: "spring", stiffness: 260, damping: 24 }
        }
      />
      {/* pivot hub */}
      <div className="absolute bottom-[24.5%] left-1/2 z-20 h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-[#241640] bg-[#ffd60a] shadow-[0_0_14px_#ffd60a]" />

      {/* readout under the dial */}
      {readout ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">{readout}</div>
      ) : null}
    </div>
  );
}
