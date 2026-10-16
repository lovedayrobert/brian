/** Liveness check for the host. Public, reveals nothing. */
export function GET() {
  return Response.json({ ok: true });
}
