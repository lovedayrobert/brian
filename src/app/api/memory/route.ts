import { teach, type MemoryKind } from "@/lib/memory";
import { fail, requireUser } from "../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { text, kind } = (await req.json()) as { text: string; kind?: MemoryKind };
    await teach(text, kind ?? "rule");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
