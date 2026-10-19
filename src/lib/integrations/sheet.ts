import { createHash, createSign } from "node:crypto";
import type { CalendarChannel, CalendarItem, CalendarStatus } from "@/lib/domain/types";

/**
 * The CRM calendar Google Sheet, read into Brian's calendar. Two ways in:
 *  - Private (recommended): share the sheet (view only) with a Google service
 *    account and set GOOGLE_SERVICE_ACCOUNT_JSON + CRM_SHEET_ID (+ CRM_SHEET_TAB).
 *  - Simple: CRM_SHEET_CSV_URL, a "Publish to web → CSV" link. Anyone with
 *    the link can read it, so only for sheets that hold nothing sensitive.
 * Columns are found by header name (Date, Campaign/Title, Channel, Owner,
 * Status, Social…); CRM_SHEET_COLUMNS overrides, e.g.
 * "date=Send date,title=Campaign name,social=Needs social". Dates are read as
 * day/month unless CRM_SHEET_DATE_ORDER=MDY. Brian only reads the sheet.
 */
export function sheetReady(): boolean {
  return !!process.env.CRM_SHEET_CSV_URL || (!!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.CRM_SHEET_ID);
}

async function serviceToken(): Promise<string> {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  const j = (await res.json()) as { access_token?: string; error_description?: string };
  if (!j.access_token) throw new Error(`Google sign-in for the sheet failed: ${j.error_description ?? res.status}`);
  return j.access_token;
}

async function readRows(): Promise<string[][]> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.CRM_SHEET_ID) {
    const range = encodeURIComponent(process.env.CRM_SHEET_TAB || "A:Z");
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.CRM_SHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`, {
      headers: { Authorization: `Bearer ${await serviceToken()}` },
      signal: AbortSignal.timeout(20_000),
    });
    const j = (await res.json()) as { values?: string[][]; error?: { message: string } };
    if (!res.ok) throw new Error(`Google Sheets: ${j.error?.message ?? res.status}. Is the sheet shared with the service account?`);
    return j.values ?? [];
  }
  const res = await fetch(process.env.CRM_SHEET_CSV_URL!, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`CRM sheet: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  if (cell || row.length) endRow();
  return rows;
}

const GUESS: Record<string, RegExp> = {
  date: /^(date|send date|launch date|day|go live|go-live|start date|when)$/i,
  title: /^(title|campaign|campaign name|name|subject|description|activity|what)$/i,
  channel: /^(channel|medium|type|platform)$/i,
  owner: /^(owner|assignee|who|responsible|manager)$/i,
  status: /^(status|state|stage)$/i,
  social: /social/i,
  notes: /^(notes|comments|details|brief)$/i,
};

function columns(header: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const override = Object.fromEntries((process.env.CRM_SHEET_COLUMNS ?? "").split(",").filter(Boolean).map((p) => p.split("=").map((x) => x.trim())));
  for (const key of Object.keys(GUESS)) {
    const name = override[key];
    const i = name ? header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase()) : header.findIndex((h) => GUESS[key].test(h.trim()));
    if (i >= 0) out[key] = i;
  }
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseDate(raw: string, now = new Date()): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return process.env.CRM_SHEET_DATE_ORDER === "MDY" ? ymd(y, a, b) : ymd(y, b, a);
  }
  m = s.match(/^(?:[a-z]+,?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*,?\s*(\d{4})?$/i) ?? null;
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (mo) return ymd(m[3] ? +m[3] : now.getUTCFullYear(), mo, +m[1]);
  }
  m = s.match(/^(?:[a-z]+,?\s+)?([a-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/i);
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    if (mo) return ymd(m[3] ? +m[3] : now.getUTCFullYear(), mo, +m[2]);
  }
  return null;
}

function ymd(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

function channelOf(v: string): CalendarChannel {
  const s = v.toLowerCase();
  if (/push/.test(s)) return "Push";
  if (/sms|text/.test(s)) return "SMS";
  if (/telegram/.test(s)) return "Telegram";
  if (/discord/.test(s)) return "Discord";
  if (/twitter|\bx\b/.test(s)) return "X";
  if (/tiktok/.test(s)) return "TikTok";
  if (/insta/.test(s)) return "Instagram";
  if (/web|site|banner|landing/.test(s)) return "Website";
  return "Email";
}

function statusOf(v: string): CalendarStatus {
  const s = v.toLowerCase();
  if (/done|sent|complete|finished/.test(s)) return "done";
  if (/live|running|active/.test(s)) return "live";
  if (/sched/.test(s)) return "scheduled";
  if (/progress|draft|building|wip/.test(s)) return "in-progress";
  if (/idea|tbc|tbd/.test(s)) return "idea";
  return "planned";
}

const truthy = (v: string) => /^(y|yes|true|x|✓|✔|needed|required|1)$/i.test(v.trim()) || /social/i.test(v);

/** Every dated row in the sheet, as calendar items. Rows without a readable date are reported, not guessed. */
export async function pullSheet(): Promise<{ items: CalendarItem[]; skipped: number; header: string[] }> {
  const rows = (await readRows()).filter((r) => r.some((c) => c.trim()));
  const headerAt = rows.findIndex((r) => r.some((c) => GUESS.date.test(c.trim())));
  if (headerAt < 0) throw new Error("Couldn't find a Date column in the CRM sheet. Set CRM_SHEET_COLUMNS, e.g. date=Send date,title=Campaign.");
  const header = rows[headerAt];
  const col = columns(header);
  if (col.title === undefined) throw new Error(`Couldn't find a title column. Headers are: ${header.join(", ")}`);
  const now = new Date().toISOString();
  let skipped = 0;
  const items: CalendarItem[] = [];
  for (const r of rows.slice(headerAt + 1)) {
    const date = parseDate(r[col.date] ?? "");
    const title = (r[col.title] ?? "").trim();
    if (!date || !title) {
      if (title) skipped++;
      continue;
    }
    const channelCell = col.channel !== undefined ? r[col.channel] ?? "" : "";
    items.push({
      id: `crm_${createHash("sha1").update(`${date}|${title}|${channelCell}`).digest("hex").slice(0, 16)}`,
      title,
      date,
      channel: channelOf(channelCell),
      type: "crm",
      status: col.status !== undefined ? statusOf(r[col.status] ?? "") : "planned",
      owner: col.owner !== undefined ? r[col.owner]?.trim() || undefined : undefined,
      notes: col.notes !== undefined ? r[col.notes]?.trim() || undefined : undefined,
      needsSocial: col.social !== undefined && col.social !== col.channel ? truthy(r[col.social] ?? "") : /social/i.test(channelCell),
      source: "crm-sheet",
      updatedAt: now,
    });
  }
  return { items, skipped, header };
}
