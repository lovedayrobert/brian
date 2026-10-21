import { userFromRequest } from "@/lib/auth";
import { answerQuestion } from "@/lib/brain";
import { fail, requireUser, setActor } from "../../../_util";

/** Answer one of Brian's questions. Free. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { text } = (await req.json()) as { text?: string };
    await answerQuestion((await params).id, text ?? "", (await userFromRequest(req)) ?? "team");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
