import { saveBriefing, writeBrief } from "@/lib/campaigns";
import { fail, requireUser, setActor } from "../../../_util";

export const maxDuration = 60;

/** Save the team's brief answers as they go. Free. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    return Response.json(await saveBriefing((await params).id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

/** Brian writes the brief back in one paragraph. About $0.01. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    return Response.json({ brief: await writeBrief((await params).id) });
  } catch (e) {
    return fail(e);
  }
}
