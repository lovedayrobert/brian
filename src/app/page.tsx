import { BrainApp, type BrainView } from "@/components/brain/brain-app";
import { modelReady } from "@/lib/adapters/model";
import { health, strength } from "@/lib/brain";
import { personName } from "@/lib/people";
import { load } from "@/lib/queries";

export const metadata = { title: "Brian" };

/** Brian himself: teach him, see his brain, answer his questions. The team tools sit behind him. */
export default async function BrianPage() {
  const db = await load();
  const swipes = db.swipes ?? [];
  const title = (id: string) => swipes.find((s) => s.id === id)?.title ?? "An example that was removed";
  const view: BrainView = {
    ai: modelReady(),
    nodes: (db.brain ?? []).map((n) => ({
      id: n.id,
      kind: n.kind,
      text: n.text,
      detail: n.detail,
      brand: n.brand,
      gap: n.gap,
      strength: strength(n),
      health: health(n),
      evidence: n.evidence.map((e) => ({ swipeId: e.swipeId, title: title(e.swipeId), note: e.note, supports: e.supports })),
      team: n.team.map((t) => ({ by: personName(db, t.by), agree: t.agree, note: t.note, at: t.at })),
      liked: n.uses.filter((u) => u.verdict === "liked").length,
      rejected: n.uses.filter((u) => u.verdict === "rejected").length,
      used: n.uses.length,
    })),
    questions: (db.brainQuestions ?? []).filter((q) => !q.answer).map((q) => ({ id: q.id, text: q.text, nodeIds: q.nodeIds })),
    examples: swipes.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      platform: s.platform,
      author: s.author,
      why: s.why,
      lesson: s.breakdown?.lesson,
      notes: db.digests?.find((d) => d.swipeId === s.id)?.thinking ?? [],
      by: personName(db, s.addedBy),
      at: s.addedAt,
    })),
  };
  return <BrainApp view={view} />;
}
