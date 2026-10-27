import { userFromRequest } from "@/lib/auth";
import { promoteToMain } from "@/lib/campaigns";
import { fail, requireUser, setActor } from "../../../../_util";

/** "Teach Brian too": copy a campaign's lesson into the main Brian. Free. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const n = await promoteToMain((await params).id, (await userFromRequest(req)) ?? "team");
    return Response.json({ id: n.id });
  } catch (e) {
    return fail(e);
  }
}
