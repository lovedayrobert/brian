import { createHash } from "node:crypto";
import { googleToken } from "./google";
import type { CalendarChannel, CalendarItem, CalendarStatus } from "@/lib/domain/types";

/**
 * The CRM calendar Google Sheet, read into Brian's calendar. Three ways in:
 *  - CRM_SHEET_ID alone: the sheet's "anyone with the link can view" sharing.
 *    Brian reads every month tab ("OCTOBER 2026") from last month to three
 *    months ahead.
 *  - Private: also set GOOGLE_SERVICE_ACCOUNT_JSON and share the sheet (view
 *    only) with that service account; link sharing can then be switched off.
 *  - CRM_SHEET_CSV_URL: a single published CSV.
 * Rows without a date belong to the date above. When the sheet has an "SM"
 * (social media) column, only rows ticked in it are pulled in: those are the
 * CRM sends that need social media input.
 * Columns are found by header name (Date, Campaign/Title, Channel, Owner,
 * Status, Social…); CRM_SHEET_COLUMNS overrides, e.g.
 * "date=Send date,title=Campaign name,social=Needs social". Dates are read as
 * day/month unless CRM_SHEET_DATE_ORDER=MDY. Brian only reads the sheet.
 */
export function sheetReady(): boolean {
  return !!process.env.CRM_SHEET_CSV_URL || !!process.env.CRM_SHEET_ID;
}

const serviceToken = () => googleToken("https://www.googleapis.com/auth/spreadsheets.readonly");

const MONTH_TAB = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i;
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Month tabs from last month to three months ahead; every tab if none are named by month. */
export function pickTabs(names: string[], now = new Date()): string[] {
  const months = names.flatMap((n) => {
    const m = n.trim().match(MONTH_TAB);
    return m ? [{ n, idx: Number(m[2]) * 12 + MONTH_NAMES.indexOf(m[1].toLowerCase()) }] : [];
  });
  if (!months.length) return names;
  const cur = now.getUTCFullYear() * 12 + now.getUTCMonth();
  return months.filter((m) => m.idx >= cur - 1 && m.idx <= cur + 3).map((m) => m.n);
}

/** Each relevant tab as rows of cells. */
async function readTables(): Promise<{ tab: string; rows: string[][] }[]> {
  const id = process.env.CRM_SHEET_ID;
  if (id && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const token = await serviceToken();
    const meta = (await (await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { sheets?: { properties: { title: string } }[]; error?: { message: string } };
    if (!meta.sheets) throw new Error(`Google Sheets: ${meta.error?.message ?? "no access"}. Is the sheet shared with the service account?`);
    const tabs = process.env.CRM_SHEET_TAB ? [process.env.CRM_SHEET_TAB] : pickTabs(meta.sheets.map((x) => x.properties.title));
    return Promise.all(
      tabs.map(async (tab) => {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`'${tab}'!A:Z`)}?valueRenderOption=FORMATTED_VALUE`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
        const j = (await res.json()) as { values?: string[][] };
        return { tab, rows: j.values ?? [] };
      }),
    );
  }
  if (id) {
    // Link-shared sheet: the tab list comes from the sheet's own HTML view, each tab as CSV.
    const html = await (await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`, { signal: AbortSignal.timeout(20_000) })).text();
    const all = [...html.matchAll(/\{name: "([^"]+)", pageUrl: "[^"]*gid=(\d+)/g)].map((m) => ({ name: m[1].replace(/\\u0026/g, "&"), gid: m[2] }));
    if (!all.length) throw new Error("Couldn't read the CRM sheet. Is it shared as 'anyone with the link can view'?");
    const wanted = new Set(process.env.CRM_SHEET_TAB ? [process.env.CRM_SHEET_TAB] : pickTabs(all.map((t) => t.name)));
    return Promise.all(
      all
        .filter((t) => wanted.has(t.name))
        .map(async (t) => {
          const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${t.gid}`, { signal: AbortSignal.timeout(20_000) });
          if (!res.ok) throw new Error(`CRM sheet tab ${t.name}: HTTP ${res.status}`);
          return { tab: t.name, rows: parseCsv(await res.text()) };
        }),
    );
  }
  const res = await fetch(process.env.CRM_SHEET_CSV_URL!, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`CRM sheet: HTTP ${res.status}`);
  return [{ tab: "CSV", rows: parseCsv(await res.text()) }];
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
  title: /^(title|campaign|campaign name|name|subject|activity|what)$/i,
  channel: /^(channel|medium|type|platform)$/i,
  owner: /^(owner|assignee|who|responsible|manager)$/i,
  status: /^(status|state|stage)$/i,
  social: /^(sm|social|social media|needs social)$/i,
  notes: /^(notes|comments|details|brief)$/i,
  description: /^(description|details|brief)$/i,
  game: /^(game|games)$/i,
  segment: /^(segment|target|target group|audience)$/i,
  events: /^(events?|world)$/i,
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


/** Rows from one tab as calendar items. Exported for tests. */
export function rowsToItems(rows: string[][], tab: string, now = new Date().toISOString()): { items: CalendarItem[]; skipped: number } {
  const clean = rows.filter((r) => r.some((c) => c.trim()));
  const headerAt = clean.findIndex((r) => r.some((c) => GUESS.date.test(c.trim())));
  if (headerAt < 0) return { items: [], skipped: 0 };
  const header = clean[headerAt].map((h) => h.trim());
  const col = columns(header);
  const at = (r: string[], k: string) => (col[k] !== undefined ? (r[col[k]] ?? "").trim() : "");
  // Columns between the segment and SM columns are channel ticks (NL, Onsite, Push, Blog, AFF).
  const channelCols = header.map((h, i) => ({ h, i })).filter(({ h }) => /^(nl|newsletter|email|onsite|push|blog|aff|affiliates?|sms|sm)$/i.test(h));
  const onlySocial = col.social !== undefined && process.env.CRM_SHEET_ALL_ROWS !== "1";
  let date: string | null = null;
  let skipped = 0;
  const items: CalendarItem[] = [];
  for (const r of clean.slice(headerAt + 1)) {
    const d = parseDate(at(r, "date"));
    if (d) date = d;
    else if (at(r, "date")) {
      skipped++;
      continue;
    }
    const social = col.social !== undefined && !!at(r, "social");
    if (onlySocial && !social) continue;
    const description = at(r, "description");
    const title = at(r, "title") || description.split("\n")[0].trim() || at(r, "events") || "Untitled CRM send (no name in the sheet)";
    if (!date) {
      skipped++;
      continue;
    }
    const channels = channelCols.filter(({ i }) => (r[i] ?? "").trim()).map(({ h }) => h);
    const notes = [
      description && description !== title ? description : "",
      at(r, "game") ? `**Game:** ${at(r, "game")}` : "",
      at(r, "segment") ? `**Segment:** ${at(r, "segment")}` : "",
      channels.length ? `**Channels:** ${channels.join(", ")}` : "",
      `From the CRM sheet (${tab}).`,
    ]
      .filter(Boolean)
      .join("\n\n");
    items.push({
      id: `crm_${createHash("sha1").update(`${tab}|${date}|${title}|${description.slice(0, 80)}`).digest("hex").slice(0, 16)}`,
      title,
      date,
      channel: social ? "Other" : channelOf(at(r, "channel")),
      type: "crm",
      status: col.status !== undefined ? statusOf(at(r, "status")) : "planned",
      owner: at(r, "owner") || undefined,
      notes,
      needsSocial: social,
      source: "crm-sheet",
      updatedAt: now,
    });
  }
  return { items, skipped };
}

/** Every relevant row in the sheet, as calendar items. */
export async function pullSheet(): Promise<{ items: CalendarItem[]; skipped: number; tabs: string[] }> {
  const tables = await readTables();
  let skipped = 0;
  const items: CalendarItem[] = [];
  for (const t of tables) {
    const r = rowsToItems(t.rows, t.tab);
    items.push(...r.items);
    skipped += r.skipped;
  }
  if (!tables.some((t) => t.rows.some((r) => r.some((c) => GUESS.date.test(c.trim()))))) {
    throw new Error("Couldn't find a Date column in the CRM sheet. Set CRM_SHEET_COLUMNS, e.g. date=Send date,title=Campaign.");
  }
  return { items, skipped, tabs: tables.map((t) => t.tab) };
}
