# 8. Team tool: calendar, Linear, CRM sheet, Google sign-in, model setup

Everything below is built and switched on by setting variables in Railway (or `.env.local` locally). Nothing needs code changes.

## How the app is organised

Four spaces plus Settings, and nothing else in the sidebar (see the product rule in `CLAUDE.md`):

- **Home**: what to do today: due and overdue tasks, ideas waiting, the room in three lines, special days coming up.
- **Radar**: what's happening: The room (Pulse), Breaking, Trends, Rivals.
- **Ideas**: Brian's ideas, Get ideas, Inspiration. Packages and mockups open from their idea.
- **Calendar**: Linear tasks, the CRM sheet, special days, ideas for any day.
- **Settings**: coverage and cost, sources, brand, models, what Brian has learned, accuracy, results.

## Working together

- **Accounts:** everyone signs in with their BitStarz Google account (or a password until Google is set up). Brian matches each person to their Linear account by email.
- **Who did what:** ideas show who asked for them and from what spark or post; tasks show who created them in Brian; Memory shows who taught each rule; Settings → Team shows each person's AI spend this month.
- **Reactions** 🔥 👍 👎 😂 on ideas and Inspiration posts. *To review* sorts by the team's reactions (🔥 counts double, 👎 counts against), and 🔥 / 👍 / 👎 also count as feedback Brian learns from.
- **Comments** with @mentions on ideas, Inspiration posts and calendar tasks. On Linear tasks the comment goes onto the Linear issue (signed "Name (via Brian)", because Brian posts with one Linear key). Mentions show under *For you* on the person's Home.
- **Your view:** Home has *Mine / Team*; the calendar has *Mine*. Calendar filters and display settings are saved to your account and follow you across devices.
- **Team activity:** *What the team did* on Home: ideas made and approved, comments, reactions, calendar changes, rules taught.
- **Roles:** everyone can react, comment, get ideas, approve and plan. Only admins (`BRIAN_ADMINS`, comma-separated emails or login names; default `rob,marko,rob.loveday@bitstarz.com`) can teach or edit Memory and import reviews. Add Marko's Google email to `BRIAN_ADMINS` once he signs in with Google.

## Marketing calendar (`/calendar`)

- **Views:** month, week, agenda, board (by status). Keyboard: `t` today, `←/→` move, `c` new task, `/` search, `m w a b` views, `u` tasks with no date, `Esc` closes.
- **Tasks:** create from any day (double-click, the `+`, or *New task*), with every field: title, description, due date, status, team, assignee, priority, project, estimate, labels, channel and type. Drag a card to another day to reschedule it; drag on the board to change status; drag from the *No due date* tray to schedule it.
- **Filters:** team, project, label, status, assignee, channel, source (Linear, Brian, CRM sheet), special-day type, and *CRM needing social*. Filters and display settings are remembered per person.
- **Special days** are filled in automatically: holidays, crypto anniversaries (Bitcoin Pizza Day, Genesis Block, whitepaper day…), internet and gaming days, Black Friday, Friday the 13ths, Super Bowl, Kentucky Derby, GTA 6. Add more in `src/lib/calendar/days.ts`.
- **Brian inside the calendar:** open any day for *Post ideas* (three ideas, about $0.10), *A bigger move* (the full engine, about $0.75) or *Plan it myself*. Every idea has *Add as task*, which opens the editor filled in. On any idea page, *Add to calendar* does the same.

## Results (Calendar → Results)

- **Published:** on any calendar task, paste the link to each post once it's out. Brian reads X and Telegram posts by itself (YouTube too with `YOUTUBE_API_KEY`) when added and again at about 1 hour, 24 hours and 7 days, and every day for the first month. Instagram, TikTok and Discord numbers are entered on the task until their access is connected. On Linear tasks the post link is also attached to the issue.
- **Our channels:** `BRIAN_CHANNELS` (default `telegram:playcashy,x:playcashy`). Brian records followers twice a day, and picks up every Telegram channel post by itself (views at 1 hour, 24 hours, 7 days), so nobody pastes those. X posts still need their link pasted until an X feed is connected.
- **Tracking links:** every task has a campaign name and a link per channel (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`). Use those links in posts, newsletters and creator briefs so GA4 can tie visits and sign-ups to the task. The default destination is `https://cashy.com` (`NEXT_PUBLIC_BRIAN_DEFAULT_LINK` changes it).
- **Results tab:** posts tracked, views, engagements, website visits and key events from them; top posts; a table by task and idea with Brian's prediction alongside; what works by channel, type of idea and day (once there are 3+ posts per group); and the website from GA4: sessions, users, key events, top sources, every campaign, top blog pages.

**AI budget.** `BRIAN_BUDGET_USD` from `BRIAN_BUDGET_SINCE` (YYYY-MM-DD) is a hard total: no AI call runs if it would pass it, on top of `BRIAN_DAILY_CAP_USD`. The sidebar shows what's left. Local copies of Brian keep their own ledger, so give them a separate small budget and keep the two under the credit you bought.

**X as a Radar source (the important part)**
- **Free:** X trending topics every hour (US, UK, worldwide; `X_TREND_REGIONS`) from trends24.in, the strongest 40 per country (`X_TRENDS_PER_REGION`), each with an hourly curve so the lifecycle model stages it. They appear in Trends and feed the Pulse.
- **Paid, on a strict budget:** with `X_BEARER_TOKEN`, each pull (every `X_PULL_HOURS`, default 12) reads the top 10 posts on up to three topics (the Pulse's villain and main character, then the most relevant X trends) and 10 recent posts from one watchlist in rotation. Watchlists: `X_WATCHLISTS`, e.g. `rivals:Stake,Roobet,rollbitcom|drama:DramaAlert,Dexerto|streamers:adinross,xQc`; check the handles. Posts feed Breaking, Trends and, first of all, the Pulse.
- **Budget:** `X_MONTHLY_BUDGET_USD` (default $9) is split evenly across the days of the month and each read is counted at `X_PRICE_PER_POST` (default $0.005), so a day can't spend more than its share (about $0.29). Set a matching spending limit in X's developer portal too.
- Our own @PlayCashy posts through the API are off (`X_TRACK_OWN=1` turns them on); pasted links on tasks are read free.

**Connecting X (our own account only)**
1. Signed in as @PlayCashy, go to developer.x.com → sign up for a developer account → create a Project and an App.
2. In the app's settings → User authentication settings: **Read** only (Brian never posts).
3. Keys and tokens: copy the **API Key and Secret**, and generate the **Access Token and Secret** for @PlayCashy.
4. In the developer portal, add credit and **set a monthly spending limit** (e.g. $10).
5. In Railway set `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`. Optional `X_MAX_READS_PER_MONTH` (default 1,000 post reads: at most $5 a month at X's standard rate).

Brian then reads @PlayCashy's latest 20 posts once a day (about 600 reads a month), with impressions and link clicks for posts under 30 days old, and adds them to Results automatically.

**Connecting GA4**
1. Google Cloud console → create (or pick) a project → APIs & Services → Library → enable **Google Analytics Data API**.
2. IAM & Admin → Service accounts → create one called `brian-reader` (no roles) → Keys → Add key → JSON. If your Workspace blocks key creation, IT needs to allow it for this project.
3. In GA4: Admin → Property access management → add the service account's email as **Viewer**.
4. GA4 Admin → Property details: copy the **Property ID** (a number).
5. In Railway set `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the whole key file) and `GA4_PROPERTY_ID`. `GA4_BLOG_PATH` defaults to `/articles`.
6. In GA4 make sure sign-ups (and first deposits, if tracked) are marked as **key events**, so "key events" in Brian means sign-ups.

The same service account can also read the CRM sheet privately and, later, Search Console.

## Linear

| Variable | What |
|---|---|
| `LINEAR_API_KEY` | Linear → Settings → Security & access → Personal API keys. Brian acts as the person whose key it is. |
| `LINEAR_TEAM` | Default team for new tasks, by key, e.g. `SMCA` |

With the key set, every task created or edited in the calendar is a real Linear issue, and Linear issues with a due date (all teams, filterable) show in the calendar. Archive in Brian archives in Linear. Brian keeps only what Linear has no field for: the channel and the idea or special day a task came from. Without the key, tasks are saved in Brian with the same fields.

## CRM calendar (Google Sheet)

Connected: `CRM_SHEET_ID` is the CRM calendar sheet. Brian reads the month tabs (e.g. `OCTOBER 2026`) from last month to three months ahead, every 30 minutes, and never writes to the sheet.

- **Only rows ticked in the `SM` column come in.** Those are the CRM sends that need social media input. They show in the calendar with an orange outline, and stay visible whatever Linear filters you use. Set `CRM_SHEET_ALL_ROWS=1` to bring in every row instead.
- Rows without a date belong to the date above (as in the sheet). A ticked row with no name shows as "Untitled CRM send" so it gets named in the sheet.
- Each item carries the description, game, segment and which channels are ticked (NL, Onsite, Push, Blog, AFF, SM).
- Today Brian reads the sheet through its "anyone with the link can view" sharing. To lock it down, create a Google service account, share the sheet with it (Viewer), set `GOOGLE_SERVICE_ACCOUNT_JSON`, then switch off link sharing.
- Other layouts: `CRM_SHEET_COLUMNS` maps headers (e.g. `date=Send date,title=Campaign name,social=Social`), `CRM_SHEET_TAB` reads one tab, `CRM_SHEET_CSV_URL` reads a single published CSV.

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
