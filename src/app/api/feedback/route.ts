import { learnFromBehaviour, recordFeedback } from "@/lib/memory";
import { repo } from "@/lib/store";
import { fail, requireUser } from "../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { target, sentiment, reason, reject } = (await req.json()) as {
      target: { type: "idea" | "package"; id: string; label: string };
      sentiment: "up" | "down";
      reason?: string;
      reject?: boolean;
    };
    if (reject && target.type === "idea") {
      // Rejecting a card is feedback and a decision: it leaves the shortlist with your reason.
      await learnFromBehaviour({ type: "reject", ideaId: target.id, label: target.label, reason });
      await repo.update((d) => {
        const i = d.ideas.find((x) => x.id === target.id);
        if (i) {
          i.status = "killed";
          i.screening.critic.reasons.unshift(`Rejected by you${reason ? `: ${reason}` : ""}`);
        }
      });
    } else {
      await recordFeedback({ target, sentiment, reason });
    }
    return Response.json({ id: target.id });
  } catch (e) {
    return fail(e);
  }
}
