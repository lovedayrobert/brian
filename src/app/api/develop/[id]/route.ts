import { repo } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = (await repo.read()).packages.find((p) => p.id === id);
  if (!pkg) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(pkg);
}

/** Retry any sections that errored. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { runPackage, SECTION_ORDER } = await import("@/lib/pipeline/develop");
  const failed: string[] = [];
  await repo.update((d) => {
    const p = d.packages.find((x) => x.id === id);
    if (!p) return;
    for (const k of SECTION_ORDER) if (p.sections[k].status === "error") {
      p.sections[k] = { ...p.sections[k], status: "pending", error: undefined };
      failed.push(k);
    }
  });
  void runPackage(id);
  return Response.json({ id, retrying: failed });
}
