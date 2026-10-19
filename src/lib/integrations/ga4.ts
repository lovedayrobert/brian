import { googleToken, serviceAccountReady } from "./google";

/**
 * Google Analytics 4 (Data API). Needs GA4_PROPERTY_ID and the service account
 * (GOOGLE_SERVICE_ACCOUNT_JSON) added as a Viewer on the property. Sessions,
 * users and key events (GA4's name for conversions, such as sign-ups) by
 * day, by campaign (utm_campaign), by source / medium, and blog pages.
 * Results are cached for an hour.
 */
export function ga4Ready(): boolean {
  return serviceAccountReady() && !!process.env.GA4_PROPERTY_ID;
}

interface Row {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

async function report(body: object): Promise<Row[]> {
  const token = await googleToken("https://www.googleapis.com/auth/analytics.readonly");
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await res.json()) as { rows?: Row[]; error?: { message: string } };
  if (!res.ok) throw new Error(`GA4: ${j.error?.message ?? res.status}. Is the service account a Viewer on the property?`);
  return j.rows ?? [];
}

export interface Ga4Summary {
  days: number;
  totals: { sessions: number; users: number; newUsers: number; keyEvents: number };
  daily: { date: string; sessions: number; keyEvents: number }[];
  campaigns: { campaign: string; sessions: number; users: number; keyEvents: number }[];
  sources: { source: string; sessions: number; keyEvents: number }[];
  blog: { path: string; views: number; users: number }[];
  at: string;
}

const cache = new Map<number, Ga4Summary>();
const num = (v?: string) => Number(v ?? 0) || 0;

export async function ga4Summary(days = 28): Promise<Ga4Summary> {
  const hit = cache.get(days);
  if (hit && Date.now() - new Date(hit.at).getTime() < 3_600_000) return hit;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];
  const metrics = (...m: string[]) => m.map((name) => ({ name }));
  const blogPath = process.env.GA4_BLOG_PATH || "/articles";
  const [daily, campaigns, sources, blog] = await Promise.all([
    report({ dateRanges, dimensions: [{ name: "date" }], metrics: metrics("sessions", "totalUsers", "newUsers", "keyEvents"), orderBys: [{ dimension: { dimensionName: "date" } }] }),
    report({ dateRanges, dimensions: [{ name: "sessionCampaignName" }], metrics: metrics("sessions", "totalUsers", "keyEvents"), orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 100 }),
    report({ dateRanges, dimensions: [{ name: "sessionSourceMedium" }], metrics: metrics("sessions", "keyEvents"), orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 15 }),
    report({
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: metrics("screenPageViews", "totalUsers"),
      dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: blogPath } } },
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 15,
    }),
  ]);
  const summary: Ga4Summary = {
    days,
    totals: daily.reduce(
      (t, r) => ({ sessions: t.sessions + num(r.metricValues[0].value), users: t.users + num(r.metricValues[1].value), newUsers: t.newUsers + num(r.metricValues[2].value), keyEvents: t.keyEvents + num(r.metricValues[3].value) }),
      { sessions: 0, users: 0, newUsers: 0, keyEvents: 0 },
    ),
    daily: daily.map((r) => {
      const d = r.dimensionValues[0].value;
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, sessions: num(r.metricValues[0].value), keyEvents: num(r.metricValues[3].value) };
    }),
    campaigns: campaigns
      .map((r) => ({ campaign: r.dimensionValues[0].value, sessions: num(r.metricValues[0].value), users: num(r.metricValues[1].value), keyEvents: num(r.metricValues[2].value) }))
      .filter((c) => c.campaign && !c.campaign.startsWith("(")),
    sources: sources.map((r) => ({ source: r.dimensionValues[0].value, sessions: num(r.metricValues[0].value), keyEvents: num(r.metricValues[1].value) })),
    blog: blog.map((r) => ({ path: r.dimensionValues[0].value, views: num(r.metricValues[0].value), users: num(r.metricValues[1].value) })),
    at: new Date().toISOString(),
  };
  cache.set(days, summary);
  return summary;
}
