import { logActivity } from "@/lib/activity";
import type { BrainNode, Campaign, CampaignBrief } from "@/lib/domain/types";
import type { DB } from "@/lib/store";
import { newId, repo } from "@/lib/store";

/**
 * Campaigns (Rob, 27 Oct): the team creates a campaign ("Halloween"), looks at
 * history, and teaches its own mini Brian what they like. What a campaign's
 * Brian learns stays in that campaign, so Halloween lessons never leak into
 * Christmas or everyday ideas. The main Brian learns from the present day, and
 * only gets a campaign lesson when the team promotes it ("Teach Brian too").
 */

export function campaignById(db: Pick<DB, "campaigns">, id?: string): Campaign | undefined {
  return id ? db.campaigns?.find((c) => c.id === id) : undefined;
}

/** The campaign for a recurring moment, if the team has one ("Halloween 2024" → the Halloween campaign). */
export function campaignForMoment(db: Pick<DB, "campaigns">, moment?: string): Campaign | undefined {
  const m = moment?.replace(/\s*\b(19|20)\d{2}\b\s*/g, " ").trim().toLowerCase();
  return m ? db.campaigns?.find((c) => c.moment?.toLowerCase() === m || c.name.toLowerCase() === m) : undefined;
}

export async function createCampaign(input: { name: string; moment?: string; from?: string; to?: string; brief?: string; by: string }): Promise<Campaign> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Give the campaign a name.");
  const day = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const c: Campaign = {
    id: newId("cmp"),
    name,
    moment: input.moment?.trim().slice(0, 80) || undefined,
    from: day(input.from),
    to: day(input.to),
    brief: input.brief?.trim().slice(0, 2000) || undefined,
    createdBy: input.by,
    createdAt: new Date().toISOString(),
  };
  await repo.update((d) => {
    if ((d.campaigns ?? []).some((x) => x.name.toLowerCase() === name.toLowerCase())) throw new Error(`There's already a campaign called ${name}.`);
    d.campaigns = [c, ...(d.campaigns ?? [])];
    logActivity(d, { by: input.by, type: "learning.identity", text: `started the campaign “${name}”` });
  });
  return c;
}

export async function updateCampaign(id: string, patch: { brief?: string; from?: string; to?: string }): Promise<void> {
  await repo.update((d) => {
    const c = d.campaigns?.find((x) => x.id === id);
    if (!c) throw new Error("That campaign is gone.");
    if (patch.brief !== undefined) c.brief = patch.brief.trim().slice(0, 2000) || undefined;
    if (patch.from !== undefined) c.from = /^\d{4}-\d{2}-\d{2}$/.test(patch.from) ? patch.from : undefined;
    if (patch.to !== undefined) c.to = /^\d{4}-\d{2}-\d{2}$/.test(patch.to) ? patch.to : undefined;
  });
}

/**
 * Before campaigns, moment knowledge lived in "playbooks" (nodes with a moment).
 * Each moment becomes a campaign of the same name, and its knowledge and
 * examples move into it. Safe to run again: it only touches what isn't filed yet.
 */
export function moveMomentsIntoCampaigns(d: DB, now = new Date().toISOString(), makeId = () => newId("cmp")): number {
  let moved = 0;
  const ensure = (moment: string) => {
    let c = campaignForMoment(d, moment);
    if (!c) {
      c = { id: makeId(), name: moment, moment, createdBy: "brian", createdAt: now };
      d.campaigns = [...(d.campaigns ?? []), c];
    }
    return c;
  };
  for (const n of d.brain ?? []) {
    if (n.moment && !n.campaignId) {
      n.campaignId = ensure(n.moment).id;
      moved++;
    }
  }
  for (const s of d.swipes ?? []) {
    const m = s.event?.replace(/\s*\b(19|20)\d{2}\b\s*/g, " ").trim();
    if (m && !s.campaignId && (d.brain ?? []).some((n) => n.campaignId && n.evidence.some((e) => e.swipeId === s.id))) {
      s.campaignId = ensure(m).id;
      moved++;
    }
  }
  return moved;
}

/**
 * "Teach Brian too": copy a campaign lesson into the main Brian, because the team
 * says it's true beyond the campaign. The campaign keeps its own copy.
 */
export async function promoteToMain(nodeId: string, by: string): Promise<BrainNode> {
  let made: BrainNode | undefined;
  await repo.update((d) => {
    const n = d.brain?.find((x) => x.id === nodeId);
    if (!n?.campaignId) throw new Error("That's already part of the main Brian.");
    const c = campaignById(d, n.campaignId);
    const now = new Date().toISOString();
    if (d.brain!.some((x) => !x.campaignId && x.text === n.text)) throw new Error("The main Brian already knows this.");
    made = {
      ...n,
      id: newId("bn"),
      campaignId: undefined,
      moment: undefined,
      team: [{ by, at: now, agree: true, note: `Promoted from the ${c?.name ?? "a"} campaign: true beyond it` }],
      uses: [],
      createdAt: now,
      updatedAt: now,
    };
    d.brain!.push(made);
    logActivity(d, { by, type: "learning.feedback", text: `taught the main Brian a lesson from ${c?.name ?? "a campaign"}: “${n.text.slice(0, 80)}”` });
  });
  return made!;
}

/** The journey every campaign goes through. */
export const STEPS = ["brief", "research", "ideas", "plan", "report"] as const;
export type Step = (typeof STEPS)[number];

/** Where a campaign is: the first step that isn't done yet. */
export function currentStep(c: Campaign, counts: { learned: number; liked: number }): Step {
  if (!c.briefing?.agreedAt) return "brief";
  if (counts.learned < 3) return "research";
  if (counts.liked < 1) return "ideas";
  return "plan";
}

/** Save the team's answers as they go. */
export async function saveBriefing(id: string, patch: Partial<CampaignBrief> & { brief?: string; from?: string; to?: string }): Promise<Campaign> {
  let out: Campaign | undefined;
  const text = (s?: string, n = 600) => (s === undefined ? undefined : s.trim().slice(0, n) || undefined);
  const list = (xs?: string[]) => (xs === undefined ? undefined : xs.map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 12));
  await repo.update((d) => {
    const c = d.campaigns?.find((x) => x.id === id);
    if (!c) throw new Error("That campaign is gone.");
    const b: CampaignBrief = { goals: [], audience: [], channels: [], ...(c.briefing ?? {}) };
    if (patch.goals) b.goals = list(patch.goals)!;
    if (patch.audience) b.audience = list(patch.audience)!;
    if (patch.channels) b.channels = list(patch.channels)!;
    if (patch.goalNote !== undefined) b.goalNote = text(patch.goalNote);
    if (patch.angle !== undefined) b.angle = text(patch.angle, 1000);
    if (patch.musts !== undefined) b.musts = text(patch.musts);
    if (patch.nogos !== undefined) b.nogos = text(patch.nogos);
    if (patch.agreedAt !== undefined) b.agreedAt = patch.agreedAt || undefined;
    c.briefing = b;
    if (patch.brief !== undefined) c.brief = text(patch.brief, 2000);
    if (patch.from !== undefined) c.from = /^\d{4}-\d{2}-\d{2}$/.test(patch.from) ? patch.from : undefined;
    if (patch.to !== undefined) c.to = /^\d{4}-\d{2}-\d{2}$/.test(patch.to) ? patch.to : undefined;
    out = { ...c };
  });
  return out!;
}

/** Brian writes the brief back in one paragraph, so the team can check he's understood (Sonnet, about $0.01). */
export async function writeBrief(id: string): Promise<string> {
  const db = await repo.read();
  const c = campaignById(db, id);
  if (!c) throw new Error("That campaign is gone.");
  const b = c.briefing ?? { goals: [], audience: [], channels: [] };
  const { callStructured } = await import("@/lib/adapters/model");
  const z = await import("zod/v4");
  const out = await callStructured({
    agent: "analyst",
    subject: `${c.name} brief`,
    maxTokens: 1200,
    schema: z.object({ brief: z.string().describe("One paragraph, 3-5 sentences, plain words, written as Brian to the team") }),
    system:
      "You are Brian, Cashy's marketing brain (Cashy is a crypto casino). The team has answered a short brief for a campaign. Write it back in one tight paragraph so they can check you've understood: what it's for, who it's for, what it's around and the angle, where it runs and when, and the lines it mustn't cross. Plain words, no hype, no bullet points, nothing they didn't say.",
    prompt: [
      `Campaign: ${c.name}${c.moment ? ` (every ${c.moment})` : ""}${c.from ? `, ${c.from}${c.to ? ` to ${c.to}` : ""}` : ""}`,
      `Goal: ${[...b.goals, b.goalNote].filter(Boolean).join("; ") || "not said"}`,
      `Audience: ${b.audience.join(", ") || "not said"}`,
      `What it's around / the angle: ${b.angle || "not said"}`,
      `Channels: ${b.channels.join(", ") || "not said"}`,
      `Must-haves: ${b.musts || "none"}`,
      `No-gos: ${b.nogos || "none"}`,
    ].join("\n"),
  });
  await saveBriefing(id, { brief: out.brief });
  return out.brief;
}
