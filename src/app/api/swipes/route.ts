import { userFromRequest } from "@/lib/auth";
import { addSwipe } from "@/lib/swipe";
import { fail, requireUser } from "../_util";

/** Add a post to the team swipe file. Reading the link is free (no AI). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { url, why, title } = (await req.json()) as { url?: string; why?: string; title?: string };
    const s = await addSwipe({ url: url ?? "", why: why ?? "", title, by: (await userFromRequest(req)) ?? "team" });
    return Response.json({ id: s.id });
  } catch (e) {
    return fail(e);
  }
}
