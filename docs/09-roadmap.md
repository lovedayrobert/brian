# 9. Roadmap: making Brian the marketing team's daily tool

Built so far: discovery (Live, Pulse, Trends), idea engine 4 with the audience panel, the swipe file and sparks, campaign packages with visuals, the marketing calendar on Linear, the CRM sheet, Google sign-in.

## Next, in rough order of value

1. **Daily brief in Slack.** Each morning: the room in three lines (from the Pulse), today's and tomorrow's special days with one idea each, what's due, and what's overdue in Linear. One click to open the day in Brian.
2. **Approval flow.** Draft → review → approved → scheduled, with who approved what. Comments on tasks synced to Linear comments. Legal or compliance sign-off as a step for anything flagged by Red Lines.
3. **Content library on each task.** Upload or generate the asset (image, video, copy variants) on the task itself, with versions. Brian's mockups attach automatically when an idea becomes a task.
4. **Publishing hand-off.** Export a scheduled post to the scheduler the team uses (Buffer, Hootsuite, Typefully for X) with copy and asset, without Brian ever posting by itself.
5. **Results back on the calendar.** After a post goes out, pull its views, likes and reposts (X, TikTok, YouTube) onto the task, and feed what worked into Brian's Memory so ideas get better.
6. **Campaign timelines.** Group tasks into a campaign (a Linear project) and see it as a timeline with phases and dependencies; Brian's packages become a campaign in one click.
7. **Competitor watch on the calendar.** When Stake, Shuffle, Rollbit and co. run something, it appears as a marker on the day it happened, with a link, so the team sees the landscape next to its own plan.
8. **Capacity view.** Who has what this week, by person and channel; warns when a day is overloaded or a channel has gone quiet.
9. **Recurring slots.** "Every Friday: degen meme", "first Monday: CRM newsletter", created as Linear issues automatically.
10. **Brief generator.** From any task: a one-page brief for a designer, editor or creator (goal, hook, references from the swipe file, deliverables, deadline), sent to Linear or Slack.
11. **Creator CRM.** Streamers, clippers and meme pages the team works with: rates, contact, past results, and which ideas suit them.
12. **Swipe file from anywhere.** A browser button and a Slack shortcut to drop a link into the swipe file without opening Brian.
13. **Market and timezone awareness.** Mark which markets each task targets, show local posting times, and flag when a special day isn't relevant in a market.
14. **Spend and budget per campaign.** Track paid amounts (creators, ads, production) against the plan, next to AI spend.

## Housekeeping

- Run on Marko's Max or Team plan credits (an API key from that Console organisation) instead of a personal key.
- Rotate the API keys pasted in chat earlier.
- Move from the JSON file to Postgres (schema already in `supabase/migrations/`) once more than a handful of people use Brian daily.
