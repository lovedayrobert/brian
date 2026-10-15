import { buildRapidAssets } from "@/lib/pipeline/rapid";
import { fail, requireUser } from "../../../_util";

export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const { take } = (await req.json()) as { take: number };
    const rr = await buildRapidAssets(id, take);
    return Response.json({ id: rr.id });
  } catch (e) {
    return fail(e);
  }
}
