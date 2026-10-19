# 8. Team tool: calendar, Linear, CRM sheet, Google sign-in, model setup

Everything below is built and switched on by setting variables in Railway (or `.env.local` locally). Nothing needs code changes.

## How the app is organised

Four spaces plus Settings, and nothing else in the sidebar (see the product rule in `CLAUDE.md`):

- **Home**: what to do today: due and overdue tasks, ideas waiting, the room in three lines, special days coming up.
- **Radar**: what's happening: The room (Pulse), Breaking, Trends, Rivals.
- **Ideas**: Brian's ideas, Get ideas, Inspiration. Packages and mockups open from their idea.
- **Calendar**: Linear tasks, the CRM sheet, special days, ideas for any day.
- **Settings**: coverage and cost, sources, brand, models, what Brian has learned, accuracy, results.

## Marketing calendar (`/calendar`)

- **Views:** month, week, agenda, board (by status). Keyboard: `t` today, `←/→` move, `c` new task, `/` search, `m w a b` views, `u` tasks with no date, `Esc` closes.
- **Tasks:** create from any day (double-click, the `+`, or *New task*), with every field: title, description, due date, status, team, assignee, priority, project, estimate, labels, channel and type. Drag a card to another day to reschedule it; drag on the board to change status; drag from the *No due date* tray to schedule it.
- **Filters:** team, project, label, status, assignee, channel, source (Linear, Brian, CRM sheet), special-day type, and *CRM needing social*. Filters and display settings are remembered per person.
- **Special days** are filled in automatically: holidays, crypto anniversaries (Bitcoin Pizza Day, Genesis Block, whitepaper day…), internet and gaming days, Black Friday, Friday the 13ths, Super Bowl, Kentucky Derby, GTA 6. Add more in `src/lib/calendar/days.ts`.
- **Brian inside the calendar:** open any day for *Post ideas* (three ideas, about $0.10), *A bigger move* (the full engine, about $0.75) or *Plan it myself*. Every idea has *Add as task*, which opens the editor filled in. On any idea page, *Add to calendar* does the same.

## Linear

| Variable | What |
|---|---|
| `LINEAR_API_KEY` | Linear → Settings → Security & access → Personal API keys. Brian acts as the person whose key it is. |
| `LINEAR_TEAM` | Default team for new tasks, by key, e.g. `SMCA` |

With the key set, every task created or edited in the calendar is a real Linear issue, and Linear issues with a due date (all teams, filterable) show in the calendar. Archive in Brian archives in Linear. Brian keeps only what Linear has no field for: the channel and the idea or special day a task came from. Without the key, tasks are saved in Brian with the same fields.

## CRM calendar (Google Sheet)

Brian reads the sheet every 30 minutes and never writes to it. CRM rows show in orange; rows marked as needing social are outlined and have their own filter.

**Private sheet (recommended):**
1. In Google Cloud, create a service account (no roles needed) and a JSON key for it.
2. Share the CRM sheet with the service account's email, *Viewer* only.
3. Set `GOOGLE_SERVICE_ACCOUNT_JSON` (the whole JSON), `CRM_SHEET_ID` (the long id in the sheet's URL) and, if the calendar isn't the first tab, `CRM_SHEET_TAB` (e.g. `CRM Calendar!A:Z`).

**Simple (only for non-sensitive sheets):** `CRM_SHEET_CSV_URL`, a *File → Share → Publish to web → CSV* link. Anyone with that link can read the sheet.

Columns are found by header (Date, Campaign/Title, Channel, Owner, Status, a column with "social" in its name, Notes). If the headers are different, set `CRM_SHEET_COLUMNS`, e.g. `date=Send date,title=Campaign name,social=Social needed`. Dates are read day-first (`03/11/2026` = 3 November) unless `CRM_SHEET_DATE_ORDER=MDY`.

## Google sign-in (BitStarz accounts only)

1. Google Cloud console → APIs & Services → Credentials → *Create OAuth client ID* → Web application. Set the consent screen to *Internal* (Workspace) so only BitStarz accounts can even see it.
2. Authorised redirect URI: `https://brian-production.up.railway.app/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BRIAN_PUBLIC_URL=https://brian-production.up.railway.app`.
4. Optional: `BRIAN_ALLOWED_DOMAINS` (default `bitstarz.com`; comma-separate several).

Only verified Google accounts whose email **and** Workspace domain are on the list get in, so personal Gmail is refused. Once Google is set, passwords stop working unless `BRIAN_ALLOW_PASSWORDS=1`.

## Model setup (Marko's suggestion)

| Mode | Plans | Writes | Checks | Cost per idea run |
|---|---|---|---|---|
| Default | (Opus thinks it through) | Opus 5.5 | Opus 5.5 panel | ~$0.75 |
| `BRIAN_QUALITY=max` | Fable 5.1, checked by GPT-6 Astra | Opus 5.5 | Fable 5.1 panel, then a GPT-6 Astra second opinion; both must pass | ~$1.50–2 |

- GPT-6 Astra needs `OPENAI_API_KEY`. `BRIAN_CHECKER_MODEL` overrides the model name (default `gpt-6-astra`); `OPENAI_PRICE_IN` / `OPENAI_PRICE_OUT` set its price for the spend cap (default $10 / $50 per million tokens).
- Any single agent can be pointed at another model with `BRIAN_MODEL_<AGENT>`, e.g. `BRIAN_MODEL_CRITIC=claude-fable-5-1`.
- Every model, including GPT, counts against the same hard spend cap.

## Inspiration (`/ideas/inspiration`)

Paste any post the team finds clever and say why. Brian reads the latest 15 every time it invents, to learn the team's taste. *Riff on this* starts ideas from one. *Get ideas → Start from your own idea* takes a half-idea or "they did this, could we do something like it?".
