"use client";

import { useEffect, useRef } from "react";

export interface MeshPoint {
  id: string;
  /** 0-1: how much Brian trusts it; sets the point size */
  weight: number;
  group: string;
}

export interface MeshLink {
  a: string;
  b: string;
  /** 0-1: how strong the connection is */
  w: number;
}

/** A stable pseudo-random number in [0, 1) from a string, so the brain keeps its shape between visits. */
function hash(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Brian's brain as a slowly turning web of thin lines (after Bittensor's
 * network). Every point is something he knows or an example he learned from;
 * every line is a real connection between them. Each group of knowledge sits in
 * its own part of the sphere, so it clusters as it grows. Faint lines join
 * neighbours in the same group so the shape reads as one mind.
 */
export function BrainMesh({ points, links, highlight, pulse }: { points: MeshPoint[]; links: MeshLink[]; highlight?: string | null; pulse?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ highlight?: string | null; pulse: Set<string>; mx: number; my: number }>({ pulse: new Set(), mx: 0, my: 0 });
  // The animation loop reads these live, so hovering never restarts it.
  useEffect(() => {
    state.current.highlight = highlight;
    state.current.pulse = new Set(pulse ?? []);
  }, [highlight, pulse]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const groups = [...new Set(points.map((p) => p.group))].sort();
    // Each group gets a cap of the sphere; points scatter inside it.
    const centres = groups.map((_, i) => {
      const theta = (i / Math.max(1, groups.length)) * Math.PI * 2;
      return { theta, phi: Math.PI / 2 + (i % 2 ? 0.35 : -0.35) };
    });
    const pos = new Map<string, [number, number, number]>();
    for (const p of points) {
      const c = centres[groups.indexOf(p.group)];
      const t = c.theta + (hash(p.id) - 0.5) * 1.9;
      const f = c.phi + (hash(p.id, 7) - 0.5) * 1.5;
      const r = 0.78 + hash(p.id, 3) * 0.22;
      pos.set(p.id, [r * Math.sin(f) * Math.cos(t), r * Math.cos(f), r * Math.sin(f) * Math.sin(t)]);
    }
    // The field: a dense web of faint points and lines, the brain's capacity. What Brian knows is drawn
    // dark on top of it and wired into the part of the field around it, so the brain visibly darkens as he learns.
    const FIELD = 320;
    const field = Array.from({ length: FIELD }, (_, i) => {
      const y = 1 - (i / (FIELD - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const t = i * 2.39996;
      const r = 0.92 + hash(String(i), 11) * 0.08;
      return [rad * Math.cos(t) * r, y * r, rad * Math.sin(t) * r] as [number, number, number];
    });
    const dist = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const nearest = (p: [number, number, number], k: number, skip = -1) =>
      field
        .map((f, i) => ({ i, d: dist(p, f) }))
        .filter((x) => x.i !== skip)
        .sort((x, y) => x.d - y.d)
        .slice(0, k)
        .map((x) => x.i);
    const fieldLinks: [number, number][] = [];
    field.forEach((f, i) => {
      for (const j of nearest(f, 5, i)) if (i < j) fieldLinks.push([i, j]);
      // A few long chords give it the woven, Bittensor look.
      if (i % 7 === 0) fieldLinks.push([i, Math.floor(hash(String(i), 5) * FIELD)]);
    });
    const wired: [string, number][] = [];
    for (const p of points) for (const j of nearest(pos.get(p.id)!, 6 + Math.round(p.weight * 6))) wired.push([p.id, j]);

    let raf = 0;
    let angle = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.42;
      const { mx, my, highlight: hi, pulse: pu } = state.current;
      angle += 0.0016;
      const ry = angle + mx * 0.4;
      const rx = -0.25 + my * 0.25;
      const project = ([x, y, z]: [number, number, number]) => {
        const x1 = x * Math.cos(ry) - z * Math.sin(ry);
        const z1 = x * Math.sin(ry) + z * Math.cos(ry);
        const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
        const s = 2.6 / (2.6 + z2);
        return { x: w / 2 + x1 * R * s, y: h / 2 + y1 * R * s, depth: (1 - z2) / 2, s };
      };

      const fp = field.map(project);
      ctx.lineWidth = 0.5;
      for (const [i, j] of fieldLinks) {
        const alpha = 0.035 + ((fp[i].depth + fp[j].depth) / 2) * 0.09;
        ctx.strokeStyle = `rgba(20,20,20,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(fp[i].x, fp[i].y);
        ctx.lineTo(fp[j].x, fp[j].y);
        ctx.stroke();
      }
      for (const q of fp) {
        ctx.fillStyle = `rgba(20,20,20,${0.08 + q.depth * 0.18})`;
        ctx.fillRect(q.x - 0.5, q.y - 0.5, 1.2, 1.2);
      }
      for (const [id, j] of wired) {
        const a = pos.get(id);
        if (!a) continue;
        const pa = project(a);
        const on = hi === id || pu.has(id);
        ctx.strokeStyle = `rgba(20,20,20,${on ? 0.6 : 0.12 + pa.depth * 0.22})`;
        ctx.lineWidth = on ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(fp[j].x, fp[j].y);
        ctx.stroke();
      }
      const line = (l: MeshLink, base: number) => {
        const a = pos.get(l.a);
        const b = pos.get(l.b);
        if (!a || !b) return;
        const pa = project(a);
        const pb = project(b);
        const on = hi && (l.a === hi || l.b === hi);
        const lit = pu.has(l.a) || pu.has(l.b);
        const alpha = on ? 0.85 : lit ? 0.5 : base * (0.35 + 0.65 * ((pa.depth + pb.depth) / 2));
        ctx.strokeStyle = `rgba(20,20,20,${alpha})`;
        ctx.lineWidth = on ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      };
      for (const l of links) line(l, 0.25 + l.w * 0.5);
      for (const p of points) {
        const q = project(pos.get(p.id)!);
        const on = hi === p.id || pu.has(p.id);
        const size = (1.6 + p.weight * 3.4) * q.s * (on ? 1.6 : 1);
        ctx.fillStyle = `rgba(20,20,20,${on ? 1 : 0.35 + q.depth * 0.6})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, size, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
          ctx.strokeStyle = "rgba(20,20,20,0.5)";
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.arc(q.x, q.y, size + 6 + Math.sin(angle * 40) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      draw();
      cancelAnimationFrame(raf);
    } else raf = requestAnimationFrame(draw);
    const onMove = (e: MouseEvent) => {
      state.current.mx = e.clientX / window.innerWidth - 0.5;
      state.current.my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [points, links]);

  return <canvas ref={ref} className="block h-full w-full" aria-label="Brian's brain: everything he knows, and how it connects" role="img" />;
}
