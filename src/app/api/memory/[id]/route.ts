import { editMemory } from "@/lib/memory";
import { fail } from "../../_util";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await editMemory(id, (await req.json()) as { text?: string; active?: boolean; forget?: boolean });
    return Response.json({ id });
  } catch (e) {
    return fail(e);
  }
}
