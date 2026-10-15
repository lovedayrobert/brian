import { safeEqual } from "@/lib/auth";
import { mergeImported, parseIngest, toSignal } from "@/lib/ingest";
import { repo } from "@/lib/store";

/**
 * Push endpoint for external feeds (Brian Signal Format v1, docs/07-data-import.md).
 * Machine-to-machine: authenticated with a bearer token, not a login session.
 */
export async function POST(req: Request) {
  const token = process.env.BRIAN_INGEST_TOKEN;
  if (!token || token.length < 32) return Response.json({ error: "Ingest is disabled: set BRIAN_INGEST_TOKEN (32+ characters)." }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${token}`)) return Response.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.text();
  if (body.length > 20_000_000) return Response.json({ error: "Body too large (20 MB max)" }, { status: 413 });
  const { records, errors } = parseIngest(body);
  if (!records.length) return Response.json({ accepted: 0, errors }, { status: 400 });

  const now = new Date();
  const signals = records.map((r) => toSignal(r, now));
  await repo.update((d) => {
    d.imported = mergeImported(d.imported ?? [], signals, now);
  });
  return Response.json({ accepted: records.length, rejected: errors.length, errors: errors.slice(0, 50) });
}
