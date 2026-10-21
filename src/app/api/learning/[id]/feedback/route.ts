import { userFromRequest } from "@/lib/auth";
import { giveFeedback } from "@/lib/learning";
import { fail, requireUser, setActor } from "../../../_util";

export const maxDuration = 120;

/** Right, partly or wrong, with a note. A note makes Brian rewrite his explanation (about $0.03). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { verdict, note } = (await req.json()) as { verdict?: string; note?: string };
    if (verdict !== "right" && verdict !== "partly" && verdict !== "wrong") throw new Error("Pick right, partly or wrong.");
    await giveFeedback((await params).id, verdict, note, (await userFromRequest(req)) ?? "team");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
