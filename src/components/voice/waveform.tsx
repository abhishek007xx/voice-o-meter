"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";

const BARS = 56;

/** pink → yellow → red arcade gradient across the bars */
function barColor(t: number): string {
  const lerp = (a: number[], b: number[], k: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const hex = (rgb: number[]) =>
    `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const PINK = [255, 46, 136];
  const YELLOW = [255, 214, 10];
  const RED = [239, 35, 60];
  if (t < 0.5) return hex(lerp(PINK, YELLOW, t * 2));
  return hex(lerp(YELLOW, RED, (t - 0.5) * 2));
}

export interface WaveformProps {
  analyserRef: RefObject<AnalyserNode | null>;
  active: boolean;
  className?: string;
}

/**
 * Mirrored equalizer bars driven directly by the mic signal.
 * When inactive, bars gracefully fall asleep.
 */
export function Waveform({ analyserRef, active, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const smoothed = new Array<number>(BARS).fill(0);

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const an = analyserRef.current;
      if (an && active) {
        const data = new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(data);
        for (let b = 0; b < BARS; b++) {
          const start = Math.floor((b / BARS) * data.length);
          const end = Math.floor(((b + 1) / BARS) * data.length);
          let peak = 0;
          for (let i = start; i < end; i++) {
            const v = Math.abs(data[i]);
            if (v > peak) peak = v;
          }
          // fast attack, slow decay — like a real toy equalizer
          smoothed[b] = Math.max(peak * 2.4, smoothed[b] * 0.86);
        }
      } else {
        for (let b = 0; b < BARS; b++) smoothed[b] *= 0.86;
      }

      const slot = w / BARS;
      const barW = Math.max(2, slot * 0.55);
      const cy = h / 2;
      for (let b = 0; b < BARS; b++) {
        const v = Math.min(1, smoothed[b]);
        const barH = Math.max(2, v * (cy - 4));
        ctx.fillStyle = barColor(BARS === 1 ? 0 : b / (BARS - 1));
        const x = b * slot + (slot - barW) / 2;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, cy - barH, barW, barH * 2, 3);
          ctx.fill();
        } else {
          ctx.fillRect(x, cy - barH, barW, barH * 2);
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("h-24 w-full sm:h-28", className)}
    />
  );
}
