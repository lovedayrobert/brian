import { currentActor } from "@/lib/actor";
import { addComment, commentsFor } from "@/lib/collab";
import { addIssueComment, issueComments, linearReady } from "@/lib/integrations/linear";
import { personName } from "@/lib/people";
import { repo } from "@/lib/store";
import { fail, requireUser, setActor } from "../_util";

type Target = { type: "idea" | "swipe" | "task"; id: string };

function target(u: URL | Record<string, unknown>): Target {
  const type = (u instanceof URL ? u.searchParams.get("type") : u.type) as Target["type"];
  const id = (u instanceof URL ? u.searchParams.get("id") : u.id) as string;
  if (!["idea", "swipe", "task"].includes(type) || !id) throw new Error("Say what the comment is on.");
  return { type, id };
}

/** Comments on Linear tasks live in Linear; everything else lives in Brian. */
const onLinear = (t: Target) => t.type === "task" && t.id.startsWith("lin_");

export async function GET(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const t = target(new URL(req.url));
    if (onLinear(t)) {
      if (!linearReady()) return Response.json({ comments: [], linear: false });
      const list = await issueComments(t.id.slice(4));
      return Response.json({ linear: true, comments: list.map((c) => ({ id: c.id, by: "", name: c.user?.name ?? "Linear", at: c.createdAt, text: c.body, mentions: [] })) });
    }
    return Response.json({ comments: commentsFor(await repo.read(), t) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const t = target(body);
    const text = String(body.text ?? "").trim();
    if (onLinear(t)) {
      if (!linearReady()) throw new Error("Linear isn't connected.");
      // Brian posts with one Linear key, so the author's name goes in the comment itself.
      const who = personName(await repo.read(), currentActor());
      const c = await addIssueComment(t.id.slice(4), `**${who}** (via Brian): ${text}`);
      await addComment(t, text, c.id); // also on the team's activity feed and for @mentions
      return Response.json({ comment: { id: c.id, by: currentActor(), name: who, at: c.createdAt, text, mentions: [] } });
    }
    const c = await addComment(t, text);
    return Response.json({ comment: { ...c, name: personName(await repo.read(), c.by) } });
  } catch (e) {
    return fail(e);
  }
}
