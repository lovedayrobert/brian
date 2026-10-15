import { promises as fs } from "node:fs";
import path from "node:path";
import { chargeExternal } from "@/lib/adapters/model";

/**
 * fal.ai: one key for image and video models. Model ids and per-call prices
 * are config, so models can be swapped as better ones ship:
 *   FAL_KEY, FAL_IMAGE_MODEL, FAL_IMAGE_COST_USD, FAL_VIDEO_MODEL, FAL_VIDEO_COST_USD
 * Results are downloaded and stored locally because fal URLs expire.
 */
export type Aspect = "16:9" | "1:1" | "9:16" | "4:5";

export function falReady(): boolean {
  return !!process.env.FAL_KEY;
}

const IMAGE_MODEL = () => process.env.FAL_IMAGE_MODEL || "fal-ai/flux-pro/v1.1-ultra";
const VIDEO_MODEL = () => process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v2.1/standard/text-to-video";
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && v ? Number(v) : d);

const SIZE: Record<Aspect, string> = { "16:9": "landscape_16_9", "1:1": "square_hd", "9:16": "portrait_16_9", "4:5": "portrait_4_3" };

const GUARDRAILS =
  "No real people's faces, no celebrities, no children or youthful-looking people, no other companies' logos, no readable text unless specified. Photographic or artistic quality, striking, shareable.";

async function falFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(300_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`fal.ai ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

async function save(url: string, name: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(dir, { recursive: true });
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Couldn't download generated file (${res.status})`);
  await fs.writeFile(path.join(dir, name), Buffer.from(await res.arrayBuffer()));
  return `/generated/${name}`;
}

export async function falImage(opts: { prompt: string; aspect: Aspect; name: string; subject?: string }): Promise<{ url: string; model: string }> {
  if (!falReady()) throw new Error("FAL_KEY is not set");
  const model = IMAGE_MODEL();
  return chargeExternal({ agent: "artDirector", model, subject: opts.subject, costUsd: num(process.env.FAL_IMAGE_COST_USD, 0.08) }, async () => {
    const out = await falFetch<{ images?: { url: string }[] }>(`https://fal.run/${model}`, {
      method: "POST",
      body: JSON.stringify({ prompt: `${opts.prompt}\n\n${GUARDRAILS}`, aspect_ratio: opts.aspect, image_size: SIZE[opts.aspect], num_images: 1, enable_safety_checker: true }),
    });
    const src = out.images?.[0]?.url;
    if (!src) throw new Error("fal.ai returned no image");
    return { url: await save(src, `${opts.name}.jpg`), model };
  });
}

/** Video runs on fal's queue: submit, poll, fetch. Used on demand only. */
export async function falVideo(opts: { prompt: string; aspect: Aspect; name: string; subject?: string }): Promise<{ url: string; model: string }> {
  if (!falReady()) throw new Error("FAL_KEY is not set");
  const model = VIDEO_MODEL();
  return chargeExternal({ agent: "artDirector", model, subject: opts.subject, costUsd: num(process.env.FAL_VIDEO_COST_USD, 1.5) }, async () => {
    const job = await falFetch<{ status_url: string; response_url: string }>(`https://queue.fal.run/${model}`, {
      method: "POST",
      body: JSON.stringify({ prompt: `${opts.prompt}\n\n${GUARDRAILS}`, aspect_ratio: opts.aspect, duration: "5" }),
    });
    const deadline = Date.now() + 15 * 60_000;
    for (;;) {
      const st = await falFetch<{ status: string }>(job.status_url);
      if (st.status === "COMPLETED") break;
      if (st.status === "FAILED" || st.status === "ERROR") throw new Error("fal.ai video generation failed");
      if (Date.now() > deadline) throw new Error("fal.ai video took longer than 15 minutes");
      await new Promise((r) => setTimeout(r, 5_000));
    }
    const out = await falFetch<{ video?: { url: string } }>(job.response_url);
    if (!out.video?.url) throw new Error("fal.ai returned no video");
    return { url: await save(out.video.url, `${opts.name}.mp4`), model };
  });
}
