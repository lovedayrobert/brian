import { logActivity } from "@/lib/activity";
import type { BrainNode, Campaign } from "@/lib/domain/types";
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
