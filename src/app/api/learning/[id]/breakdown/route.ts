import { breakDown } from "@/lib/learning";
import { fail, requireUser, setActor } from "../../../_util";

export const maxDuration = 120;

/** Ask Brian to explain an example (again). About $0.03. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    await breakDown((await params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
