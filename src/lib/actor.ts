import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who is doing what. API routes call setActor(req) once after the sign-in
 * check; everything that runs for that request (idea runs, memory, the
 * activity log, AI spend) can then ask currentActor() without passing a user
 * through every function. Background work started by a request keeps its actor.
 */
const storage = new AsyncLocalStorage<string>();
const byRequest = new WeakMap<Request, string>();

export function rememberActor(req: Request, user: string) {
  byRequest.set(req, user);
}

/** Call synchronously in the route handler, right after the sign-in check. */
export function setActor(req: Request) {
  const user = byRequest.get(req);
  if (user) storage.enterWith(user);
}

export function runAs<T>(user: string, fn: () => T): T {
  return storage.run(user, fn);
}

export function currentActor(): string | undefined {
  return storage.getStore();
}
