import * as z from "zod/v4";
import { callStructured } from "@/lib/adapters/model";
import type { BrandId, Moment } from "@/lib/domain/types";
import type { SpecialDay } from "@/lib/calendar/days";
import { newId, repo } from "@/lib/store";
import { memoryForRun } from "@/lib/memory";
import { ACCURACY_RULES, brandVoiceContext, qualityBarContext } from "./context";
import { ensureLiveBrand, liveBrandContext } from "@/lib/brand/live-brand";
import { STYLE_RULES } from "@/lib/brand/style";

/**
 * Rapid Response (brief §5k). Minutes, not days: three one-sentence takes on a
 * breaking moment, then post-ready copy for the approved take. Nothing is
 * ever posted automatically.
 */
const TakesOut = z.object({
  takes: z.array(
    z.object({
      take: z.string().describe("The reactive idea in one sentence"),
      format: z.string().describe("The native format: meme template, quote-post, reply, fake-receipt, etc."),
      edge: z.enum(["safe", "spicy", "wild"]),
      redLine: z.object({ pass: z.boolean(), note: z.string() }),
      riskNote: z.string().describe("What could go wrong, who might be offended, whether it touches a real person or sensitive topic"),
    }),
  ),
});

const AssetsOut = z.object({
  x: z.object({ post: z.string(), altVariant: z.string() }),
  instagramFeed: z.object({ visual: z.string(), caption: z.string() }),
  instagramStory: z.object({ frames: z.array(z.string()) }),
  tiktok: z.object({ hook: z.string(), beats: z.array(z.string()), caption: z.string() }),
  telegram: z.string(),
  discord: z.string(),
  postingTime: z.string().describe("Recommended posting time and why"),
  visualDirection: z.string(),
  riskNote: z.string(),
});

export type Takes = z.infer<typeof TakesOut>["takes"];
export type RapidAssets = z.infer<typeof AssetsOut>;

export interface RapidResponse {
  id: string;
  momentId: string;
  /** For calendar days, which aren't in the swept moments: the moment as it was */
  moment?: Moment;
  brandId: BrandId;
  takes: Takes;
  chosen: number | null;
  assets: RapidAssets | null;
  createdAt: string;
}

function system(brandId: BrandId, memory = "", live = "") {
  return [
    memory,
    "You are Rapid Response at Brian. A meme is dead in three days and a breaking moment in hours. You write native, fast, funny reactions that sound like the brand's social team, never like an ad. You understand the joke before you use it. Never offers or messages to famous people: talk about them, not to them.",
    brandVoiceContext(brandId),
    live,
    STYLE_RULES,
    qualityBarContext(),
    ACCURACY_RULES,
  ].join("\n\n");
}

export async function reactToMoment(momentId: string, brandId: BrandId): Promise<RapidResponse> {
  const db = await repo.read();
  const m = db.moments.find((x) => x.id === momentId);
  if (!m) throw new Error("Moment not found");
  if (m.sensitivity === "blocked") throw new Error(`Blocked by the red-line filter: ${m.sensitivityReason ?? "sensitive topic"}`);
  const out = await callStructured({
    agent: "rapidResponse",
    subject: m.title,
    schema: TakesOut,
    system: system(brandId, await memoryForRun(brandId, `reacting to ${m.title}`), liveBrandContext(await ensureLiveBrand())),
    prompt: `<moment>\n${m.title}\n${m.description}\nSources:\n${(m.sources ?? []).map((s) => `- [${s.outlet}] ${s.title} ${s.url}`).join("\n")}\n</moment>\n\nGive exactly three reactive takes.`,
  });
  const rr: RapidResponse = {
    id: newId("rr"),
    momentId,
    brandId,
    takes: out.takes.slice(0, 3),
    chosen: null,
    assets: null,
    createdAt: new Date().toISOString(),
  };
  await repo.update((d) => {
    d.rapid = [rr, ...(d.rapid ?? [])];
  });
  return rr;
}

export async function buildRapidAssets(rapidId: string, takeIndex: number): Promise<RapidResponse> {
  const db = await repo.read();
  const rr = db.rapid.find((r) => r.id === rapidId);
  if (!rr) throw new Error("Rapid response not found");
  const m = db.moments.find((x) => x.id === rr.momentId) ?? rr.moment;
  const take = rr.takes[takeIndex];
  if (!take) throw new Error("That take doesn't exist.");
  // Enforced here, not just hidden in the UI.
  if (!take.redLine.pass) throw new Error(`This take failed its red-line check and can't be built: ${take.redLine.note}`);
  if (m?.sensitivity === "blocked") throw new Error("This moment is blocked by the red-line filter.");
  const assets = await callStructured({
    agent: "rapidResponse",
    subject: take.take,
    schema: AssetsOut,
    system: system(rr.brandId, await memoryForRun(rr.brandId, `writing assets for ${take.take}`), liveBrandContext(await ensureLiveBrand())),
    prompt: `<moment>\n${m?.title}\n${m?.description}\n</moment>\n<approved_take>\n${take.take}\nFormat: ${take.format}\n</approved_take>\n\nWrite post-ready assets for every channel, in the moment's real format and our voice. Include 18+ where the platform format allows.`,
  });
  await repo.update((d) => {
    const r = d.rapid.find((x) => x.id === rapidId);
    if (r) {
      r.chosen = takeIndex;
      r.assets = assets;
    }
  });
  return { ...rr, chosen: takeIndex, assets };
}

/** Post ideas for a calendar day (Bitcoin Pizza Day, Halloween…): three takes, one cheap call. */
export async function ideasForDay(day: SpecialDay, brandId: BrandId, steer?: string): Promise<RapidResponse> {
  const moment: Moment = {
    id: day.id,
    kind: "calendar",
    title: day.title,
    date: `${day.date}T00:00:00Z`,
    category: "culture",
    description: day.why,
    sensitivity: "clear",
  };
  const out = await callStructured({
    agent: "rapidResponse",
    subject: `${day.title} (${day.date})`,
    schema: TakesOut,
    system: system(brandId, await memoryForRun(brandId, `posts for ${day.title}`), liveBrandContext(await ensureLiveBrand())),
    prompt: `<day date="${day.date}">\n${day.title}\n${day.why}${day.check ? `\nDate note: ${day.check}` : ""}\n</day>\n${steer ? `<steer>${steer}</steer>\n` : ""}\nGive exactly three ideas for what Cashy does on this day. Each is a post or a small real act the social team can make, specific to this day, not a generic greeting. Never "Happy ${day.title}!" energy.`,
  });
  const rr: RapidResponse = { id: newId("rr"), momentId: day.id, moment, brandId, takes: out.takes.slice(0, 3), chosen: null, assets: null, createdAt: new Date().toISOString() };
  await repo.update((d) => {
    d.rapid = [rr, ...(d.rapid ?? [])];
  });
  return rr;
}
