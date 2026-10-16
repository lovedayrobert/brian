import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Serves generated images and video from .data/generated. Files in /public are
 * only served if they existed at build time, so runtime output lives here.
 * Covered by the login proxy like every other route.
 */
const DIR = path.join(process.cwd(), ".data", "generated");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4" };

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Only plain file names: no paths, no traversal.
  if (!/^[\w.-]+$/.test(name) || name.includes("..")) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(DIR, name));
    return new Response(new Uint8Array(file), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
