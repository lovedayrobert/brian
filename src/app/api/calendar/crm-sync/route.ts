import { syncCrm } from "@/lib/calendar/service";
import { sheetReady } from "@/lib/integrations/sheet";
import { fail, requireUser } from "../../_util";

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    if (!sheetReady()) throw new Error("The CRM sheet isn't connected yet.");
    const s = await syncCrm();
    if (!s.ok) throw new Error(s.error);
    return Response.json(s);
  } catch (e) {
    return fail(e);
  }
}
