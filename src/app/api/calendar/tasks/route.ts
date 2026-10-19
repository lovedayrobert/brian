import { userFromRequest } from "@/lib/auth";
import { createTask, type TaskInput } from "@/lib/calendar/service";
import { fail, requireUser } from "../../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const task = await createTask((await req.json()) as TaskInput, (await userFromRequest(req)) ?? "team");
    return Response.json({ task });
  } catch (e) {
    return fail(e);
  }
}
