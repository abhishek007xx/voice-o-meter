"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  life: number;
  maxLife: number;
  shape: "rect" | "circle";
}

const COLORS = ["#ff2e88", "#ffd60a", "#06d6a0", "#ff8c42", "#c77dff", "#ffffff"];

/**
 * Celebration confetti. Increment `trigger` to fire a burst
 * (e.g. when the verdict drops).
 */
export function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    for (let i = 0; i < 170; i++) {
      particlesRef.current.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.45,
        y: h * 0.32,
        vx: (Math.random() - 0.5) * 15,
        vy: -(7 + Math.random() * 11),
        size: 5 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        life: 0,
        maxLife: 130 + Math.random() * 70,
        shape: Math.random() < 0.45 ? "circle" : "rect",
      });
    }

    cancelAnimationFrame(rafRef.current);

    const step = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ps = particlesRef.current;
      for (const p of ps) {
        p.life += 1;
        p.vy += 0.26;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) continue;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      particlesRef.current = ps.filter((p) => p.life < p.maxLife && p.y < h + 60);
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50" />;
}
