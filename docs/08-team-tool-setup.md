# 8. Team tool: calendar, Linear, CRM sheet, Google sign-in, model setup

Everything below is built and switched on by setting variables in Railway (or `.env.local` locally). Nothing needs code changes.

## How the app is organised

Six spaces plus Settings, and nothing else in the sidebar (see the product rule in `CLAUDE.md`):

- **Home**: what to do today: due and overdue tasks, ideas waiting, the room in three lines, special days coming up.
- **Learning**: What worked (link a campaign; Brian explains why, you say if he got it), Cashy's identity (built from those), Rules (Memory).
- **Radar**: what's happening: The room (Pulse), Breaking, Trends, Rivals.
- **Ideas**: Brian's ideas, Get ideas. Packages and mockups open from their idea.
- **Calendar**: Linear tasks, the CRM sheet and special days (these two always show, whatever the filters), ideas for any day.
- **Results**: how what we published did, by post, idea and channel, plus the website.
- **Settings**: coverage and cost, sources, brand, models, what Brian has learned, accuracy.

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

## Results (its own space in the sidebar)

- **Published:** on any calendar task, paste the link to each post once it's out. Brian reads X and Telegram posts by itself (YouTube too with `YOUTUBE_API_KEY`) when added and again at about 1 hour, 24 hours and 7 days, and every day for the first month. Instagram, TikTok and Discord numbers are entered on the task until their access is connected. On Linear tasks the post link is also attached to the issue.
- **Our channels:** `BRIAN_CHANNELS` (default `telegram:playcashy,x:playcashy`). Brian records followers twice a day, and picks up every Telegram channel post by itself (views at 1 hour, 24 hours, 7 days), so nobody pastes those. X posts still need their link pasted until an X feed is connected.
- **Tracking links:** every task has a campaign name and a link per channel (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`). Use those links in posts, newsletters and creator briefs so GA4 can tie visits and sign-ups to the task. The default destination is `https://cashy.com` (`NEXT_PUBLIC_BRIAN_DEFAULT_LINK` changes it).
- **Results page:** posts tracked, views, engagements, website visits and key events from them; top posts; a table by task and idea with Brian's prediction alongside; what works by channel, type of idea and day (once there are 3+ posts per group); and the website from GA4: sessions, users, key events, top sources, every campaign, top blog pages.

**AI budget.** `BRIAN_BUDGET_USD` from `BRIAN_BUDGET_SINCE` (YYYY-MM-DD) is a hard total: no AI call runs if it would pass it, on top of `BRIAN_DAILY_CAP_USD`. The sidebar shows what's left. Local copies of Brian keep their own ledger, so give them a separate small budget and keep the two under the credit you bought.

**X as a Radar source (the important part)**
- **Free:** X trending topics every hour (US, UK, worldwide; `X_TREND_REGIONS`) from trends24.in, the strongest 40 per country (`X_TRENDS_PER_REGION`), each with an hourly curve so the lifecycle model stages it. They appear in Trends and feed the Pulse.
- **Paid, on a strict budget, topics first:** with `X_BEARER_TOKEN`, each pull (every `X_PULL_HOURS`, default 12) reads the most engaged posts, from anyone, on: (1) what's hot right now: the Pulse's villain, main character and top subjects, then the strongest X trends; (2) one standing topic group in rotation (`X_WATCH_TOPICS`, default `streamers:Adin Ross,xQc,Kai Cenat,IShowSpeed,Trainwreck|streaming drama:Kick streamer,Twitch ban,banned on stream|degen betting:parlay,bad beat,slot stream|crypto culture:memecoin,rug pull,rugged|gaming:GTA 6,GTA VI`); (3) two accounts that post about things, in rotation (`X_WATCHLISTS`, default `drama:DramaAlert,Dexerto,FearedBuck,JakeSucky,StreamerBans|crypto:WatcherGuru,zachxbt,lookonchain|sports:BleacherReport,barstoolsports,ActionNetworkHQ|viral:NoContextHumans,knowyourmeme,DailyLoud`). People are topics, not accounts: what's said about them matters, not their own posts. Rivals: what people say to and about them (`X_RIVALS`), every `X_RIVALS_EVERY_DAYS` (default 3). Posts with almost no engagement (under `X_MIN_LIKES`, default 20, and under 5,000 views) are dropped. Anniversary filler is excluded in the query.
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

## Model setup

| Mode | Invents | Judges (audience panel) | Typical cost per idea run | Worst case the cap reserves |
|---|---|---|---|---|
| Default | Opus 5.5 | Opus 5.5 | about $0.65 | about $2.70 |
| `BRIAN_QUALITY=max` (on) | Fable 5.1 **and** GPT-6 Astra, in parallel, 10 ideas each | Opus 5.5, all 20 together | about $2 | about $4.60 |

- Each idea shows which model invented it ("by Fable", "by GPT-6 Astra"), so the team can see which one earns its keep.
- Astra needs `OPENAI_API_KEY`; `BRIAN_CHECKER_MODEL` overrides the model (default `gpt-6-astra`), priced for the cap at `OPENAI_PRICE_IN` / `OPENAI_PRICE_OUT` (default $10 / $50 per million tokens). If one inventor fails, the run continues with the other.
- With a $5 daily cap, the live site can start one max-quality run a day.
- Marko's original planner (Fable picks angles, Astra checks the plan) and Astra's second opinion are still in the code, switched off: `BRIAN_PLANNER=1`, `BRIAN_SECOND_OPINION=1`.
- Any single agent can be pointed at another model with `BRIAN_MODEL_<AGENT>`.

## Inspiration (`/ideas/inspiration`)

Paste any post the team finds clever and say why. Brian reads the latest 15 every time it invents, to learn the team's taste. *Riff on this* starts ideas from one. *Get ideas → Start from your own idea* takes a half-idea or "they did this, could we do something like it?".

## Brian on his own (BRIAN_AUTO=1)

Switched on 20 Oct 2026 at Rob's request, so nobody has to press anything for Brian to look for ideas (`src/lib/autopilot.ts`):

- **Every 3 hours** (`BRIAN_AUTO_SWEEP_HOURS`): a sweep. Free sources, X reads inside their own monthly budget, and a Haiku tidy-up (about half a cent).
- **Each morning from 07:00 UTC** (`BRIAN_AUTO_HOUR`): a fresh sweep, then one Pulse (Sonnet).
- **Then, only if something in the room scores 8/10 or more for feeling and has an opening**: one idea run on Opus alone (about $0.70), whatever `BRIAN_QUALITY` says. Fable and Astra stay for runs people start. Zero ideas is a fine result: no ideas beats bad ideas.
- At most one Pulse and one idea run a day; the daily and total spend caps still apply to every call. Home shows what Brian did under The room; Settings → Models says it's on.

## Learning (the most important space)

Added 21 Oct 2026 after the meeting with Marko: Brian was inventing from what he saw on the internet, not from what the team thinks a successful campaign is.

1. **Link something that worked** (ours, a rival's, anyone's, old or new) in Learning. Say why you rate it if you can, and tag the event it was made for (Halloween, World Cup…). Brian reads the link for free (X through fxtwitter, TikTok and YouTube titles, article text) and explains it with Opus: what happened, the feeling, why people shared it, why the brand got the credit, what it rode, the one lesson, and what never to copy. About $0.03.
2. **Tell him if he got it**: Yes / Partly / No. Partly or No asks what he missed; your words become the truth and he rewrites it (about $0.03). Brian can't watch videos, so say what happens in one.
3. **Cashy's identity** is rebuilt from every explanation and correction on demand (about $0.10): who Cashy is as a marketer, what the team loves, the lessons, what doesn't work.
4. **Every idea run starts from it**, before the room. Ideas for a special day (Get ideas next to "Coming up" in Learning, or from the calendar) put examples tagged with that event first, so Halloween ideas start from Halloween campaigns that worked.

## Look back: what did a brand do on a day?

On Brian's screen, under Teach: pick a brand's X handle, a moment (Halloween, Black Friday, GTA 6 launch…) and a year, or your own dates. Brian lists their posts from around it, best first, and you tick the ones that worked to teach them to him in one go (about $0.04 each).

X's own API can't search old posts on pay-per-use (7 days only), and a brand's timeline only reaches its last 3,200 posts (Stake's doesn't reach Halloween 2025). So Brian tries, in order:

1. **TwitterAPI.io** (`TWITTERAPI_IO_KEY`): X's whole history by account and dates, about $0.15 per 1,000 posts. Not connected until someone makes an account and adds credit.
2. **X timeline**: the brand's recent posts, $0.005 each from the X budget, at most 40 a look.
3. **Wayback Machine** (free): archived copies of the brand's tweet pages, filtered to the exact dates using the time inside every tweet id; fxtwitter fills in words and numbers. Coverage varies, and it rate-limits.
4. Always: **Search this on X**, the exact search as a link, free for anyone logged in.

We don't scrape X with logged-in accounts (Playwright and similar): it breaks X's terms and gets the account locked.

## Always true vs playbooks for moments

Brian keeps two kinds of memory apart, so a seasonal lesson never leaks into a normal day:

- **Always true**: audience truths and mechanics that hold any day of the year.
- **Playbooks for moments** (Halloween, Christmas, Super Bowl…): what the audience wants around it, what brands did and the gap they left, and the clichés everyone repeats.

When you teach him a post made for a moment (anything taught from "Find a brand's old posts" is tagged with its moment), he files the lesson underneath it as always true, and the moment-only parts in that moment's playbook. Ideas for a normal day use only what's always true; ideas for a moment also use its playbook, and an idea that is one of its clichés is dead. Moment knowledge doesn't fade between years.

## What else was happening that week

In "Find a brand's old posts", next to the brand's posts, Brian shows what the world was paying attention to in the same dates (Marko, 27 Oct 2026), so a post is read in its moment:

- **Brian's read of the week**: two or three sentences (Haiku, about $0.002).
- **What people were reading**: Wikipedia's most-read pages across those days (free).
- **The news**: Wikipedia's daily "Current events" digest, ranked by what people were reading and by what our audience talks about (free).
- **Biggest on X**: anyone's posts with 100K+ likes, at most two per account (TwitterAPI.io, about $0.009).
- **Reddit**: top posts in our audience's communities (Arctic Shift archive, free).

TikTok, Instagram and Google Trends don't publish what was trending on a past day, so they aren't included. Results are cached per date window, so looking again is free. When you teach a post from those dates, the week goes with it and Brian judges its timing against it.

## Campaigns: a Brian per campaign

Since 27 Oct 2026 (Rob), learning is foldered by campaign, replacing the "playbooks for moments" (which were moved into campaigns automatically).

- **The main Brian** (home screen) learns from the present day: what's true on any day. Everyday ideas use only him.
- **Campaigns** ("Halloween", "GTA 6 launch"…) each have their own Brian. Start one from Brian's page with New campaign; name it after a recurring moment and it follows that moment every year, with its past years one click away. Inside a campaign: **Teach it** (from brands' old posts around the moment, with what else was happening that week, or from a link), **What it's learned** (what the audience wants, what everyone does to avoid, what brands did and the gap), and **Ideas** (built from the campaign's Brian plus the main Brian's instincts, aimed at the campaign's next moment; about $0.70–1.50 a run).
- **Nothing leaks.** What a campaign's Brian learns can't strengthen the main Brian or another campaign, even if it tries to link to them. Ideas for a special day automatically use that moment's campaign, if there is one.
- **Teach Brian too**: on any campaign lesson that's true beyond the campaign, copies it into the main Brian. The campaign keeps its own copy. The team decides what generalises, not Brian.

## Research history

Every look-back is saved (`db.looks`, last 300). In a campaign's "Teach it" tab, **Your research** lists the looks for that campaign (and any look at the same moment run elsewhere); clicking one reopens it for free, with its week panel. Running the exact same look again (same brand, dates, words and route) reuses the saved one for free; "Refresh" re-reads it if you want the latest numbers.
