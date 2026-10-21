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

type V = [number, number, number];
const norm = ([x, y, z]: V): V => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

/**
 * A point on the surface of a brain, from a direction. x is left-right, y is
 * down (screen space), z is front-back. Two hemispheres split by a fissure,
 * a flatter underside, a cerebellum at the back, and folds all over.
 */
function brainSurface(d: V): V {
  const [x, y, z] = norm(d);
  let r = 1;
  // The split between the hemispheres, deepest on top.
  r *= 1 - 0.18 * Math.exp(-((x / 0.1) ** 2)) * (y < 0.25 ? 1 : 0.15);
  // Folds (gyri), strongest on top and the sides.
  r *= 1 + 0.06 * Math.sin(14 * x + 6 * z + 2 * y) * Math.sin(12 * y + 5 * x - 3 * z) + 0.03 * Math.sin(25 * z + 9 * y);
  let px = x * r * 0.82;
  let py = y * r * (y > 0 ? 0.55 : 0.78);
  let pz = z * r * 1.18;
  // The front of the underside lifts (frontal lobe), the temporal lobe hangs below the middle.
  if (y > 0 && z > 0.35) py *= 1 - 0.45 * Math.min(1, (z - 0.35) / 0.5);
  if (y > 0.1 && z > -0.35 && z < 0.45) py += 0.16 * Math.sin(((z + 0.35) / 0.8) * Math.PI) * Math.min(1, (y - 0.1) / 0.4);
  // Cerebellum: a separate, finely folded lump tucked under the back.
  if (z < -0.35 && y > 0.15) {
    const k = Math.min(1, (-z - 0.35) / 0.35) * Math.min(1, (y - 0.15) / 0.35);
    py += 0.2 * k;
    pz += 0.1 * k;
    px *= 1 - 0.15 * k;
  }
  return [px, py, pz];
}

/** Where each kind of knowledge lives: audience truths up front, mechanics on top, industry at the back, examples low on the sides. */
const LOBES: Record<string, V> = {
  truth: [0, -0.35, 0.95],
  mechanic: [0, -1, -0.05],
  industry: [0, -0.15, -1],
  example: [1, 0.45, 0.15],
};

/** How much knowledge makes a fully formed brain. */
export const FULL_BRAIN = 40;

/**
 * Brian's brain as a slowly turning web of hairlines (after Bittensor's
 * network). Empty, it's a loose cloud; every piece of knowledge pulls the
 * cloud together, until at FULL_BRAIN pieces it's a fully formed brain.
 * What he knows is drawn dark, in its own lobe, wired into the tissue around
 * it; lines between pieces are real connections (learned from the same example).
 */
export function BrainMesh({ points, links, highlight, pulse, formation }: { points: MeshPoint[]; links: MeshLink[]; highlight?: string | null; pulse?: string[]; formation: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ highlight?: string | null; pulse: Set<string>; mx: number; my: number; target: number; shown: number }>({ pulse: new Set(), mx: 0, my: 0, target: -1, shown: 0 });
  // The animation loop reads these live, so hovering never restarts it.
  useEffect(() => {
    state.current.highlight = highlight;
    state.current.pulse = new Set(pulse ?? []);
    const t = Math.max(0, Math.min(1, formation));
    // First paint shows the brain as it is; later changes (learning something) animate.
    if (state.current.target < 0) state.current.shown = t;
    state.current.target = t;
  }, [highlight, pulse, formation]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Before it forms, each point drifts out from its place in the brain: a soft, unfocused cloud that
    // sharpens into the brain as Brian learns (lines stay local, so it never turns into a scribble).
    const loosen = (b: V, key: string): V => {
      const j: V = [hash(key, 21) - 0.5, hash(key, 22) - 0.5, hash(key, 23) - 0.5];
      const s = 1.15 + hash(key, 24) * 0.35;
      return [b[0] * s + j[0] * 0.55, b[1] * s * 1.2 + j[1] * 0.55, b[2] * s + j[2] * 0.55];
    };
    // Real knowledge: a spot on the brain, in its lobe, with a little spread.
    const home = new Map<string, { brain: V; loose: V }>();
    for (const p of points) {
      const c = LOBES[p.group] ?? LOBES.example;
      const side = p.group === "example" ? (hash(p.id, 9) > 0.5 ? 1 : -1) : 1;
      const d: V = [c[0] * side + (hash(p.id) - 0.5) * 1.5, c[1] + (hash(p.id, 7) - 0.5) * 0.7, c[2] + (hash(p.id, 3) - 0.5) * 0.7];
      const b = brainSurface(d);
      home.set(p.id, { brain: [b[0] * 0.97, b[1] * 0.97, b[2] * 0.97], loose: loosen(b, p.id) });
    }
    // The tissue: a dense field of faint points on the brain's surface, each with a loose starting place.
    const FIELD = 760;
    const tissue = Array.from({ length: FIELD }, (_, i) => {
      const y = 1 - (i / (FIELD - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const t = i * 2.39996;
      const b = brainSurface([rad * Math.cos(t), y, rad * Math.sin(t)]);
      return { brain: b, loose: loosen(b, `f${i}`) };
    });
    // Cerebellum (a finely folded lump under the back) and the brain stem below it.
    for (let i = 0; i < 150; i++) {
      const y = 1 - (i / 149) * 2;
      const rad = Math.sqrt(1 - y * y);
      const t = i * 2.39996;
      const fold = 1 + 0.06 * Math.sin(y * 22);
      const b: V = [rad * Math.cos(t) * 0.42 * fold, 0.5 + y * 0.2 * fold, -0.86 + rad * Math.sin(t) * 0.27 * fold];
      tissue.push({ brain: b, loose: loosen(b, `c${i}`) });
    }
    for (let i = 0; i < 36; i++) {
      const t = (i % 6) * ((Math.PI * 2) / 6);
      const k = Math.floor(i / 6) / 5;
      const b: V = [Math.cos(t) * 0.09, 0.5 + k * 0.42, -0.42 - k * 0.05 + Math.sin(t) * 0.09];
      tissue.push({ brain: b, loose: loosen(b, `s${i}`) });
    }
    const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const nearest = (p: V, k: number, skip = -1) =>
      tissue
        .map((f, i) => ({ i, d: dist(p, f.brain) }))
        .filter((x) => x.i !== skip)
        .sort((x, y) => x.d - y.d)
        .slice(0, k)
        .map((x) => x.i);
    const fieldLinks: [number, number][] = [];
    tissue.forEach((f, i) => {
      for (const j of nearest(f.brain, 4, i)) if (i < j) fieldLinks.push([i, j]);
      
    });
    const wired: [string, number][] = [];
    for (const p of points) for (const j of nearest(home.get(p.id)!.brain, 6 + Math.round(p.weight * 6))) wired.push([p.id, j]);
    const lobeLabels = [
      { text: "AUDIENCE", at: brainSurface(LOBES.truth) },
      { text: "SPREAD", at: brainSurface(LOBES.mechanic) },
      { text: "INDUSTRY", at: brainSurface(LOBES.industry) },
    ];

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
      const R = Math.min(w * 0.34, h * 0.5);
      const st = state.current;
      const { mx, my, highlight: hi, pulse: pu } = st;
      // Ease towards the target, so learning visibly pulls the brain together.
      if (st.target >= 0) st.shown += (st.target - st.shown) * 0.02;
      const f = st.shown < 0.5 ? 2 * st.shown * st.shown : 1 - (-2 * st.shown + 2) ** 2 / 2;
      const at = (h: { brain: V; loose: V }): V => [h.loose[0] + (h.brain[0] - h.loose[0]) * f, h.loose[1] + (h.brain[1] - h.loose[1]) * f, h.loose[2] + (h.brain[2] - h.loose[2]) * f];
      angle += 0.0016;
      // Mostly side-on, where a brain is most recognisable, swaying gently into 3D.
      const ry = -Math.PI / 2 + Math.sin(angle * 0.7) * 0.55 + mx * 0.5;
      const rx = -0.12 + my * 0.25;
      const project = ([x, y, z]: V) => {
        const x1 = x * Math.cos(ry) - z * Math.sin(ry);
        const z1 = x * Math.sin(ry) + z * Math.cos(ry);
        const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
        const s = 2.6 / (2.6 + z2);
        return { x: w / 2 + x1 * R * s, y: h / 2 + y1 * R * s, depth: (1 - z2) / 2, s };
      };

      const fp = tissue.map((t) => project(at(t)));
      ctx.lineWidth = 0.5;
      for (const [i, j] of fieldLinks) {
        const alpha = 0.02 + f * 0.05 + ((fp[i].depth + fp[j].depth) / 2) * (0.04 + f * 0.13);
        ctx.strokeStyle = `rgba(20,20,20,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(fp[i].x, fp[i].y);
        ctx.lineTo(fp[j].x, fp[j].y);
        ctx.stroke();
      }
      for (const q of fp) {
        ctx.fillStyle = `rgba(20,20,20,${0.08 + q.depth * (0.15 + f * 0.15)})`;
        ctx.fillRect(q.x - 0.5, q.y - 0.5, 1.2, 1.2);
      }
      if (f > 0.55) {
        ctx.font = "10px var(--font-fira), monospace";
        ctx.textAlign = "center";
        for (const l of lobeLabels) {
          const q = project(l.at);
          if (q.depth < 0.45) continue;
          ctx.fillStyle = `rgba(20,20,20,${(f - 0.55) * 1.2 * (q.depth - 0.4)})`;
          ctx.fillText(l.text, q.x, q.y - 14);
        }
      }
      const pos = new Map(points.map((p) => [p.id, at(home.get(p.id)!)]));
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
