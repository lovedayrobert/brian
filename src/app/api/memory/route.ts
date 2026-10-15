import { teach, type MemoryKind } from "@/lib/memory";
import { fail } from "../_util";

export async function POST(req: Request) {
  try {
    const { text, kind } = (await req.json()) as { text: string; kind?: MemoryKind };
    await teach(text, kind ?? "rule");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
