import { NextResponse, type NextRequest } from "next/server";
import { authMode, SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * First gate: every page and API route needs a valid session. Route handlers
 * check again (src/app/api/_util.ts), so a proxy misconfiguration can't open
 * the API. The ingest endpoint uses its own bearer token instead.
 */
const PUBLIC = ["/login", "/api/auth/login", "/api/ingest", "/api/health"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const mode = authMode();

  if (mode === "misconfigured") {
    return new NextResponse("Brian is locked: set BRIAN_USERS and BRIAN_SESSION_SECRET (32+ characters) to enable login.", { status: 503 });
  }

  // Cross-site POSTs are refused outright (CSRF), whatever the auth mode.
  if (req.method !== "GET" && req.method !== "HEAD" && !pathname.startsWith("/api/ingest")) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) {
      return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
    }
  }

  if (mode === "off-dev" || PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.BRIAN_SESSION_SECRET!);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
