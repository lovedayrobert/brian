import { toggleReaction } from "@/lib/collab";
import { fail, requireUser, setActor } from "../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { type, id, emoji } = (await req.json()) as { type?: "idea" | "swipe" | "task"; id?: string; emoji?: string };
    if (!type || !id || !emoji || !["idea", "swipe", "task"].includes(type)) throw new Error("Say what you're reacting to.");
    return Response.json({ reactions: await toggleReaction({ type, id }, emoji) });
  } catch (e) {
    return fail(e);
  }
}
