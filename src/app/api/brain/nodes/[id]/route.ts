import { userFromRequest } from "@/lib/auth";
import { judgeNode } from "@/lib/brain";
import { fail, requireUser, setActor } from "../../../_util";

/** Agree or disagree with one thing Brian believes. Free. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { agree, note } = (await req.json()) as { agree?: boolean; note?: string };
    await judgeNode((await params).id, agree !== false, note, (await userFromRequest(req)) ?? "team");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
