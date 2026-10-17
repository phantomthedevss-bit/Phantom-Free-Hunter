# 👻 Phantom Free Hunter

Aggressively hunts the internet for free stuff — games, software, courses, AI tools,
giveaways, digital assets, student offers, and cloud credits — and pushes alerts
straight to your Telegram. Nigeria-tagged 🇳🇬, worldwide coverage.

- **Hosting:** Vercel (serverless functions)
- **Scheduler:** GitHub Actions (free, runs every 5 minutes)
- **Dedup store:** Upstash Redis (free tier)
- **Alerts:** Telegram Bot API

---

## How it actually works (read this first)

Two free platforms are stitched together because neither does the whole job alone:

1. **Vercel** hosts the `/api/hunt` function that does the real work: fetch sources,
   filter junk/expired/duplicates, send Telegram messages. Vercel's own free
   ("Hobby") cron only runs **once a day**, which doesn't match "every 5 minutes."
2. **GitHub Actions** provides a free cron scheduler. A workflow calls your Vercel
   `/api/hunt` URL every 5 minutes. GitHub's scheduled workflows are **best-effort**
   — under load they can slip by 10–30+ minutes. There is no 100%-free platform that
   guarantees exact 5-minute precision forever; this is the closest you get at $0.
3. **Upstash Redis** remembers which deals you've already been alerted about, so
   re-running every 5 minutes doesn't spam you with the same deal repeatedly.
4. **Telegram** is just the messenger — your bot DMs you when something new and
   legit shows up.

### Sources used (all legitimate, first-party or widely-used public feeds)

| Category | Sources |
|---|---|
| 🎮 Games | Epic Games Store official free-games API (NG-aware), itch.io free games RSS, r/GameDeals, r/FreeGameFindings |
| 💻 Software | Product Hunt feed, Hacker News (hnrss.org), r/opensource, r/FreeSoftwareForPC |
| 🎓 Courses | freeCodeCamp RSS, r/freecourses, r/FreeCoursesEveryday |
| 🤖 AI tools | Product Hunt (AI-filtered), Hacker News (AI-filtered), r/FreeAITools |
| 🎁 Samples/giveaways | r/freebies, r/Free_Samples, r/giveaways, **TechBuild Africa** (Nigeria/Africa tech news) |
| 🎨 Digital assets | itch.io game-assets RSS, Product Hunt (asset-filtered), r/FreeIcons, r/graphic_design |
| 🧑‍🎓 Student offers | Curated list (GitHub Student Pack, Azure for Students, JetBrains, Canva Edu, etc.) — resurfaced monthly |
| ☁️ Cloud credits | Curated list (GCP, AWS, Azure, Oracle Always-Free, Cloudflare, Fly.io) — resurfaced monthly |

**Why student offers / cloud credits are "curated" instead of live-scraped:** these
programs don't publish RSS/JSON feeds and rarely change week to week. Faking a feed
for them would mean either scraping fragile JS-rendered pages (breaks constantly) or
inventing data. Instead they're a verified list that resurfaces once a month per
offer, so you get reminded without spam. **Edit `lib/sources/studentOffers.js` and
`lib/sources/cloudCredits.js` to add more as you find them.**

**Reddit sources:** Reddit's `.rss` endpoints are public and commonly used for this
exact purpose. They're included, but Reddit does rate-limit and occasionally block
generic bot traffic — the code treats every source as disposable, so if Reddit is
slow/blocked on a given run, every other source still works normally and nothing
crashes.

### Filtering

Every raw item goes through a pipeline (`lib/util/pipeline.js`) before it can reach
Telegram:
1. **Malformed check** — must have a real title and a valid `http(s)://` URL.
2. **Expired filter** — text cues ("expired", "ended", "no longer available") or a
   known expiry date in the past get dropped.
3. **Nigeria tagging** — items mentioning Nigeria/Africa/Naira/Lagos get a 🇳🇬 tag
   and are sorted to the top; items explicitly marked "US only" / "not available in
   Nigeria" etc. are tagged and sorted to the bottom (not hard-deleted, since you
   asked for worldwide coverage too).
4. **In-run dedup** — if two sources both surface the same URL in one run, only one
   message is sent.
5. **Cross-run dedup (Redis)** — every deal gets a stable hash ID. Once sent, that ID
   is stored in Upstash with a 14-day TTL (configurable), so it won't be re-alerted
   even across hundreds of 5-minute runs.

---

## Deployment — step by step

### 1. Create your Telegram bot

1. Open Telegram, message **@BotFather**.
2. Send `/newbot`, follow the prompts, name it whatever you like (e.g.
   `PhantomFreeHunterBot`).
3. BotFather gives you a token like `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
   Save it — this is `TELEGRAM_BOT_TOKEN`.
4. Send your new bot **any message** (e.g. "hi") so it can message you back.
5. In your browser, visit (replacing `<TOKEN>`):
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
6. Find `"chat":{"id":123456789,...}` in the response — that number is your
   `TELEGRAM_CHAT_ID`.

### 2. Create a free Upstash Redis database

1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free).
2. Create a new Redis database (any region close to you, e.g. a US or EU region —
   doesn't need to be in Nigeria).
3. On the database page, copy:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

### 3. Generate your cron secret

Run this locally (or use any password generator) to get a long random string:
```bash
openssl rand -hex 32
```
Save this — it's `CRON_SECRET`. It stops strangers from calling your endpoint.

### 4. Push this project to GitHub

```bash
cd phantom-free-hunter
git init
git add .
git commit -m "Initial commit: Phantom Free Hunter"
gh repo create phantom-free-hunter --private --source=. --push
# (or create a repo on github.com and `git remote add origin ... && git push`)
```

### 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo you
   just pushed.
2. Before deploying, add Environment Variables (Settings → Environment Variables),
   or add them right in the import screen:

   | Key | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | from step 1 |
   | `TELEGRAM_CHAT_ID` | from step 1 |
   | `UPSTASH_REDIS_REST_URL` | from step 2 |
   | `UPSTASH_REDIS_REST_TOKEN` | from step 2 |
   | `CRON_SECRET` | from step 3 |

3. Click **Deploy**.
4. Once deployed, copy your production URL, e.g. `https://phantom-free-hunter.vercel.app`.
   Your hunt endpoint is:
   `https://phantom-free-hunter.vercel.app/api/hunt`

### 6. Test the endpoint manually before wiring up the scheduler

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://phantom-free-hunter.vercel.app/api/hunt"
```

You should get a JSON response like:
```json
{ "ok": true, "categoriesRun": [...], "stats": { "raw": 40, "new": 12, ... }, "sent": 12 }
```
...and within a few seconds, Telegram messages should start arriving. If `sent` is 0
with `new: 0`, that's correct behavior on a second call (everything was already
marked seen) — try adding `?categories=games` and check your phone.

If you get a 401, double check the `Authorization` header matches `CRON_SECRET`
exactly. If you get a 500 mentioning Redis or Telegram, re-check those env vars in
Vercel's dashboard and redeploy.

### 7. Wire up the 5-minute scheduler (GitHub Actions)

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.
2. Add two secrets:
   - `HUNT_URL` = `https://phantom-free-hunter.vercel.app/api/hunt` (your real URL)
   - `CRON_SECRET` = the same value you put in Vercel
3. The workflow file is already in the repo at `.github/workflows/hunt.yml` — once
   those secrets exist, it starts running automatically every 5 minutes.
4. To verify it's firing: go to the **Actions** tab in GitHub, you should see
   "Phantom Free Hunter - 5min scan" runs appearing. You can also click
   **Run workflow** to trigger one manually right now instead of waiting.

That's it — it's live. Leave it running; new finds will hit your Telegram as they
appear, old ones won't repeat.

---

## Local testing (before or after deploy)

```bash
npm install
cp .env.example .env
# fill in .env with your real values
node scripts/test-local.js              # dry run, all categories, no sends
node scripts/test-local.js games,ai     # dry run, specific categories only
node scripts/test-local.js --send       # real run: writes to Redis + sends Telegram
```

## Checking bot health anytime

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://phantom-free-hunter.vercel.app/api/status"
```

## Tuning

- **Change categories:** set `HUNT_CATEGORIES` in Vercel env vars, e.g.
  `games,ai,student` to only hunt those. Leave blank for all.
- **Change how long "seen" items stay deduped:** `SEEN_TTL_DAYS` (default 14).
- **Add more sources:** each category lives in its own file under `lib/sources/`.
  Add a new fetcher function following the existing pattern (return an array of
  `{ id, title, url, category, source, summary, expiresAt }` objects using
  `makeId()` from `lib/util/deal.js` for the id) and wire it into that file's
  exported `fetch*` function.
- **Add more curated student/cloud offers:** edit the arrays directly in
  `lib/sources/studentOffers.js` / `lib/sources/cloudCredits.js`.
- **Message volume cap:** `sendDealAlerts` in `lib/util/telegram.js` caps each run
  at 25 messages to respect Telegram's rate limits; the rest aren't lost, they're
  just still "unseen" and will go out on the next run(s).

## Project structure

```
phantom-free-hunter/
├── api/
│   ├── hunt.js            # main endpoint — called every 5 min by GitHub Actions
│   └── status.js          # health check endpoint
├── lib/
│   ├── sources/
│   │   ├── index.js       # registry of all category hunters
│   │   ├── games.js
│   │   ├── software.js
│   │   ├── courses.js
│   │   ├── aiTools.js
│   │   ├── samplesGiveaways.js
│   │   ├── digitalAssets.js
│   │   ├── studentOffers.js   # curated, monthly resurfacing
│   │   └── cloudCredits.js    # curated, monthly resurfacing
│   └── util/
│       ├── deal.js        # shared deal shape, id hashing, expiry/NG tagging
│       ├── fetchFeed.js    # resilient RSS/JSON fetch helpers
│       ├── pipeline.js     # filter + dedup pipeline
│       ├── store.js        # Upstash Redis dedup + stats
│       └── telegram.js     # message formatting + sending
├── scripts/
│   └── test-local.js      # local dry-run / manual test script
├── .github/workflows/
│   └── hunt.yml            # the 5-minute GitHub Actions cron
├── .env.example
├── vercel.json
└── package.json
```

## Honest limitations

- **Not truly real-time every 5 minutes.** GitHub Actions cron is best-effort; expect
  occasional delays, especially during GitHub-wide high load.
- **Reddit can rate-limit or block generic scrapers.** The code is written so this
  never crashes the whole run, but if Reddit sources go quiet for a while, that's why.
- **Student offers / cloud credits are not live-scraped** — they're a verified,
  manually-maintained list that resurfaces monthly. Review and refresh them every
  so often as programs change.
- **"Legitimate sources only"** means official first-party feeds/APIs and well-known
  public RSS feeds. Nothing here scrapes behind logins, bypasses paywalls, or touches
  sites that block automated access.
