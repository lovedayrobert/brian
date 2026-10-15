import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Image adapter. Key visuals are routed to whichever model wins our quality
 * tests (brief §7). The prototype supports OpenAI's image API when a key is
 * set; without one, mockups use the code-built typographic key visual, which
 * is clearly labelled. Add other providers as new branches here.
 */
export interface ImageResult {
  url: string;
  model: string;
}

export function imageReady(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const GUARDRAILS =
  "No real people, no recognisable faces, no celebrities, no logos of other companies, no children or youthful characters, no text other than what is specified. Premium, high-contrast, editorial.";

export async function generateKeyVisual(prompt: string, id: string): Promise<ImageResult | null> {
  if (!imageReady()) return null;
  const model = process.env.IMAGE_MODEL || "gpt-image-1";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: `${prompt}\n\n${GUARDRAILS}`, size: "1536x1024", n: 1 }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Image generation failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const item = json.data[0];
  const file = `${id}.png`;
  const dir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(dir, { recursive: true });
  if (item.b64_json) await fs.writeFile(path.join(dir, file), Buffer.from(item.b64_json, "base64"));
  else if (item.url) await fs.writeFile(path.join(dir, file), Buffer.from(await (await fetch(item.url)).arrayBuffer()));
  else throw new Error("Image API returned no image");
  return { url: `/generated/${file}`, model };
}
