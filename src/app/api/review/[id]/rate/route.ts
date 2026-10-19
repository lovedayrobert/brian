import { userFromRequest } from "@/lib/auth";
import { rate } from "@/lib/review";
import { fail, requireUser , setActor } from "../../../_util";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { id } = await params;
    const { itemId, verdict, note } = (await req.json()) as { itemId: string; verdict: "run" | "skip"; note?: string };
    if (verdict !== "run" && verdict !== "skip") throw new Error("Verdict must be run or skip");
    await rate(id, itemId, verdict, (await userFromRequest(req)) ?? "unknown", note);
    return Response.json({ id });
  } catch (e) {
    return fail(e);
  }
}
