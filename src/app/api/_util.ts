import { ModelUnavailableError } from "@/lib/adapters/model";

export function fail(e: unknown, status = 400) {
  const err = e as Error;
  return Response.json({ error: err.message }, { status: e instanceof ModelUnavailableError ? 503 : status });
}
