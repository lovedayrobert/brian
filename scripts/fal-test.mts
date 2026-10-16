// Checks fal.ai: one image, then (with --video) one short clip. Both are charged against the spend cap.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { falImage, falReady, falVideo } from "@/lib/adapters/image/fal";

if (!falReady()) {
  console.log("FAL_KEY is not set in .env.local");
  process.exit(1);
}
const t0 = Date.now();
try {
  const img = await falImage({
    prompt: "Underwater documentary photograph: an old gutted casino slot machine on a sandy sea floor, covered in young coral and anemones, small tropical fish swimming through the reels, shafts of sunlight from the surface, wide angle, National Geographic style",
    aspect: "1:1",
    name: "fal-test-image",
    subject: "fal test",
  });
  console.log(`image ok: ${img.url} (${img.model}) in ${Math.round((Date.now() - t0) / 1000)}s`);
} catch (e) {
  console.log("image failed:", (e as Error).message);
}
if (process.argv.includes("--video")) {
  const t1 = Date.now();
  try {
    const v = await falVideo({ prompt: "Slow underwater dolly shot past an old slot machine overgrown with coral as fish swim through it, sunlight rays", aspect: "9:16", name: "fal-test-video", subject: "fal test" });
    console.log(`video ok: ${v.url} (${v.model}) in ${Math.round((Date.now() - t1) / 1000)}s`);
  } catch (e) {
    console.log("video failed:", (e as Error).message);
  }
}
