import { teach, type MemoryKind } from "@/lib/memory";
import { fail, requireAdmin , setActor } from "../_util";

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { text, kind } = (await req.json()) as { text: string; kind?: MemoryKind };
    await teach(text, kind ?? "rule");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
