import { modelReady, ModelUnavailableError } from "@/lib/adapters/model";
import { runPackage, startPackage } from "@/lib/pipeline/develop";
import { fail, requireUser } from "../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    if (!modelReady()) throw new ModelUnavailableError();
    const { ideaId } = (await req.json()) as { ideaId: string };
    const pkg = await startPackage(ideaId);
    // Runs in the background; the package page polls for progress.
    // Hosted builds move this onto the job queue (Trigger.dev).
    void runPackage(pkg.id);
    return Response.json({ id: pkg.id });
  } catch (e) {
    return fail(e);
  }
}
