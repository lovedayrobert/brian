import { falReady, falVideo } from "@/lib/adapters/image/fal";
import { modelReady, ModelUnavailableError } from "@/lib/adapters/model";
import { runPackage } from "@/lib/pipeline/develop";
import type { Creative } from "@/lib/pipeline/package-schemas";
import { repo } from "@/lib/store";
import { fail, requireUser } from "../../../_util";

export const maxDuration = 900;

/** Redo the Art Director's visuals, or make a teaser clip on demand (paid, so never automatic). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const { teaser } = (await req.json().catch(() => ({}))) as { teaser?: boolean };
    const pkg = (await repo.read()).packages.find((p) => p.id === id);
    if (!pkg) throw new Error("Package not found");

    if (teaser) {
      if (!falReady()) throw new Error("Video needs FAL_KEY in .env.local.");
      const creative = pkg.sections.creative.content as Creative | undefined;
      if (!creative) throw new Error("The creative section isn't ready yet.");
      // Video models garble lettering, so captions are left for the edit; at most one short brand word in the scene.
      const prompt = `A ${creative.video.storyboard.length}-shot teaser. ${creative.video.storyboard.map((f) => `${f.shot}: ${f.visual}`).join(" Then ")} No captions, subtitles or on-screen text; at most one short brand word if it is physically part of the scene.`;
      const clip = await falVideo({ prompt, aspect: "9:16", name: `${id}-teaser`, subject: `teaser ${id}` });
      await repo.update((d) => {
        const p = d.packages.find((x) => x.id === id);
        const m = p?.sections.mockups.content as Record<string, unknown> | undefined;
        if (p && m) p.sections.mockups.content = { ...m, teaser: { url: clip.url, model: clip.model } };
      });
      return Response.json({ id });
    }

    if (!modelReady()) throw new ModelUnavailableError();
    await repo.update((d) => {
      const p = d.packages.find((x) => x.id === id);
      if (p) p.sections.mockups = { ...p.sections.mockups, status: "pending", error: undefined };
    });
    await runPackage(id, ["mockups"]);
    return Response.json({ id });
  } catch (e) {
    return fail(e);
  }
}
