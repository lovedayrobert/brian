# 7. Importing data (Brian Signal Format v1)

Any feed that already runs elsewhere (X, Exa, Google Trends history, Telegram, anything else) gets into Brian through one format. Brian doesn't need to know how the data was collected.

## Format

JSON Lines: one JSON object per line, UTF-8. A JSON array of the same objects also works.

| Field | Required | Type | Notes |
|---|---|---|---|
| `source` | yes | string | Lowercase letters, numbers, dashes. e.g. `x`, `exa`, `google-trends`, `telegram` |
| `id` | yes | string | Unique within the source. Re-sending the same `source` + `id` updates the record |
| `url` | yes | URL | Link to the original (post, message, article, explore page). Agents may only cite URLs Brian holds, so this matters |
| `title` | yes | string ≤ 500 | Headline, or the post or message text |
| `text` | no | string ≤ 5,000 | Full text or description |
| `author` | no | string | Handle, channel or outlet |
| `published_at` | no | ISO 8601 with offset | e.g. `2026-10-15T10:00:00Z`. Records older than 14 days drop out |
| `metrics` | no | object of numbers | Any counts: `views`, `likes`, `reposts`, `replies`, `members`, `volume`, … |
| `primary_metric` | no | string | Which metric Brian should show and rank by |
| `series` | no | array of `{date, value}` | Daily history, oldest or newest first (`date` as `YYYY-MM-DD`). A record with a series becomes a **trend** with a lifecycle stage; without one it is treated like an **article** and clustered into Live moments |
| `topics` | no | array of strings | Hashtags, channel tags, categories |
| `image_url` | no | URL | Thumbnail |
| `related` | no | array of `{title, url, outlet}` | Supporting links, e.g. the news behind a search spike |

### Examples, one per line

```json
{"source":"x","id":"1846000000000000001","url":"https://x.com/someone/status/1846000000000000001","title":"Kick streamer gets max-win capped live and loses it on stream","author":"@clipaccount","published_at":"2026-10-15T09:12:00Z","metrics":{"views":412000,"reposts":3100,"replies":880},"primary_metric":"views","topics":["kick","casino"]}
{"source":"exa","id":"https://example.com/story","url":"https://example.com/story","title":"Crypto casino streamers face new sponsorship rules","text":"First paragraph of the article…","author":"Example News","published_at":"2026-10-15T07:00:00Z"}
{"source":"google-trends","id":"gta-6-us","url":"https://trends.google.com/trends/explore?geo=US&q=gta%206","title":"gta 6","metrics":{"interest":100},"series":[{"date":"2026-10-13","value":61},{"date":"2026-10-14","value":78},{"date":"2026-10-15","value":100}],"topics":["US"]}
{"source":"telegram","id":"cryptocasinochat:55123","url":"https://t.me/cryptocasinochat/55123","title":"Anyone else get their withdrawal frozen this week?","author":"Crypto Casino Chat","published_at":"2026-10-15T11:40:00Z","metrics":{"views":5400,"replies":212},"primary_metric":"views"}
```

## Two ways to send it

**1. Push (recommended for live feeds)**

```bash
curl -X POST https://<brian-host>/api/ingest \
  -H "Authorization: Bearer $BRIAN_INGEST_TOKEN" \
  --data-binary @batch.jsonl
```

- Up to 5,000 records and 20 MB per request; send as often as you like
- The response says how many were accepted and lists bad lines with line numbers; good lines are kept even if others fail
- `BRIAN_INGEST_TOKEN` is set on the Brian server (32+ characters) and shared with the feed owner. It is separate from user logins

**2. Drop files (simplest for batches)**

Put `.jsonl` files in the `inbox` folder inside Brian's data directory (`.data/inbox/` locally, or `$BRIAN_DATA_DIR/inbox/` on a server). The next sweep imports them and moves them to `inbox/processed/`.

## What Brian does with it

- Records appear as sources named `ext:<source>` (e.g. `ext:x`) in Live, Trends and evidence lists
- Records with a `series` are staged by the lifecycle model like any other trend
- Records without a series are clustered with news into Live moments and ranked by talkability; more independent sources on one story ranks it higher
- Every agent can cite the record's `url`; nothing else from the record is treated as fact unless it's in the text

## Notes for feed owners

- Send what you're permitted to share under each platform's terms
- Don't include personal data Brian doesn't need (private messages, phone numbers, emails). Public posts, public channels and aggregate counts are what it uses
- Prefer one record per post or message; Brian does the clustering
