# Launches from Earth

*A [Neighborhood Earth](https://www.steamhead.space/neighborhood-earth/) project by [SteamHead](https://www.steamhead.space)*

Launches from Earth is an interactive globe that lets people explore upcoming space launches around the world. Visitors can watch live countdowns, locate launch sites, and select individual spaceports to learn more about the missions beginning there.

**Live version:** https://www.steamhead.space/neighborhood-earth/launches-from-earth/
**GitHub Pages mirror:** https://steamhead.github.io/earth-launches/ *(not yet enabled — turn it on in repo Settings → Pages → Deploy from branch → main → /(root). The move to the SteamHead org has happened, so this is the final URL.)*

## Guiding question

> What can worldwide space launches teach us about how Earth is connected?

Space launches are often presented as isolated events: a rocket, a company, a nation, or a dramatic countdown. Viewed together on a globe, they tell a larger story — one of geography, engineering, infrastructure, international collaboration, economics, and access to space.

## What it is

Launches from Earth is both a public exploration tool and an open-source learning project. Students, educators, developers, and curious visitors can use it to investigate questions such as:

- Why are launch sites located where they are?
- How do geography and Earth's rotation affect launches?
- Which countries and organizations are launching into space?
- How accurate are launch schedules and public datasets?
- What can launch activity tell us about our changing relationship with space?

It was built as part of **Neighborhood Earth**, a SteamHead initiative that helps learners investigate the technologies, systems, places, and people connecting our planet — and it doubles as a small case study in data visualization and coding: APIs, geographic coordinates, countdown logic, interface design, animation, and dynamic data.

## How it works

- A single self-contained `index.html` — no build step, no dependencies. Everything (HTML, CSS, and JavaScript) lives in one file.
- The globe is drawn with the 2D Canvas API (no WebGL/Three.js), traced from real [Natural Earth](https://www.naturalearthdata.com/) coastline geometry.
- The globe spins once every 200 seconds on its own. Drag or swipe to spin it yourself; it resumes auto-rotation after 5 seconds of no touch.
- Every major spaceport gets a pin: green means a launch is scheduled, pulsing red means it's inside 24 hours, hollow means nothing's booked there. Tapping a pin or a row in the manifest list opens a detail card and swings the globe around to that site.
- Countdowns step down in resolution as precision allows: seconds inside a day, then `T− 3d 04h 12m`, then `≈ 27 days`, then `≈ 2 months` for anything vague.
- The detail card shows mission, vehicle, provider, a one-line purpose, destination orbit, what's aboard, liftoff time converted to *your* device's local time, pad coordinates, a confidence line stating plainly whether the date is a published target, a NET window, or an estimate, and what else is queued at that pad.
- On load, the page tries [The Space Devs' Launch Library API](https://thespacedevs.com/llapi) (`ll.thespacedevs.com`) and switches the header chip to "Live feed" if it succeeds. If that fetch fails, the page falls back to a bundled snapshot so it's never blank.
- A **Refresh** button in the masthead re-checks the API on demand. Launch times move on the day itself, and the daily rebuild below can be up to 24 hours behind — this is the escape hatch for that. It disables itself while in flight and cools down between presses.
- The bundled snapshot is **rebuilt automatically every day** by a GitHub Actions job (`.github/workflows/refresh-launches.yml`), which runs `scripts/refresh-launches.mjs` and commits only when the data actually changed. So even a visitor whose live fetch fails sees data that is at most a day old, and the commit history doubles as a record of how launch schedules drift — see [Use it in a classroom](#use-it-in-a-classroom).
- Before writing, that script **parses the page it has just generated** and aborts if the JavaScript is invalid. Everything on the page lives in one inline `<script>`, so a single malformed entry means no globe, no countdowns, nothing. This check exists because that happened: a generated site entry landed without the comma the preceding line now needed, and the job committed the broken page and synced it to the live site for eight days with CI green throughout.
- A **menu** behind the hamburger in the masthead holds everything that is not
  the globe itself: *How this works* (the explainer page on steamhead.space),
  *Send feedback*, *Credits & sources*, and *View the code*. Refresh stays
  outside the menu because it is the one control people reach for mid-session.
  **Send feedback removes itself when `FEEDBACK_ENDPOINT` is blank**, so the
  menu is correct whether or not the Worker exists. See
  [Feedback](#feedback) below.

## Downstream copy on the public site

**If you edit `index.html`, it does not reach the public site on its own.**

The live page at steamhead.space does not iframe this repo. The site repo
([`SteamHead/steamhead-site-rebuild`](https://github.com/SteamHead/steamhead-site-rebuild))
keeps its own **vendored copy**:

```
public/projects/launches-from-earth/index.html   ← iframed by
src/pages/neighborhood-earth/launches-from-earth.astro
```

That copy is what visitors actually load. It once sat three weeks behind this
repo and kept serving a broken live feed long after it was fixed here — the
page called the API with `mode=list`, which returns HTTP 200 but carries no pad
coordinates, so every launch was silently discarded and the page fell back to a
stale bundled snapshot with no Refresh button. See site issue
[#34](https://github.com/SteamHead/steamhead-site-rebuild/issues/34).

The daily workflow now pushes `index.html` into the site repo whenever the two
differ, which also triggers a site deploy. It compares the files rather than
keying off "did we just commit", so it repairs drift from any cause.

Note what this carries: not just the daily snapshot but **the whole file, app
code included**. That is the point. The three-week outage happened because a
*code* fix could not reach the site — the snapshot was never the hard part.

### How it authenticates

A **deploy key** scoped to `steamhead-site-rebuild` alone:

- the **public** half is registered on that repo as a write deploy key,
  titled *earth-launches embed sync (write)*
  (fingerprint `SHA256:Coi1oH1j+VoFYNvaOJRjqLwrzwzlEDYc4FfqQFj5hy4`);
- the **private** half is the `SITE_SYNC_KEY` secret on this repo.

Deliberately not a personal access token: a deploy key does not expire, is not
bound to anyone's account, and cannot reach any repo but that one. The workflow
pins the host key and uses `IdentitiesOnly=yes`, so it will not fall back to
some other credential the runner happens to have.

If the key is ever lost or needs rotating, generate a new pair, replace the
deploy key on the site repo, and reset the secret:

```bash
ssh-keygen -t ed25519 -N "" -C "earth-launches daily embed sync" -f /tmp/site_sync
gh repo deploy-key add /tmp/site_sync.pub -R SteamHead/steamhead-site-rebuild \
  --title "earth-launches embed sync (write)" --allow-write
gh secret set SITE_SYNC_KEY -R SteamHead/earth-launches < /tmp/site_sync
shred -u /tmp/site_sync /tmp/site_sync.pub
```

Without the secret the step logs a notice and skips, and **CI stays green
either way** — a passing run would not mean the site is current. To sync by
hand if that ever happens:

```bash
cp index.html ../steamhead-site-rebuild/public/projects/launches-from-earth/index.html
# then commit and push that repo — pushing to main auto-deploys the site
```

## Known data limitations

- The bundled fallback snapshot was pulled from [The Space Devs' Launch Library API](https://thespacedevs.com/llapi) on **21 September 2026**, covering 15 spaceports and 60 missions through December 2026. It is rebuilt daily by CI, so it should never be more than about 24 hours behind; the live feed and the Refresh button cover the remaining gap.
- Launch dates and times (`NET` — "no earlier than") change frequently and are sometimes only precise to the month or quarter; the countdown display and the card's confidence line reflect that precision rather than hiding it.
- The live API has its own rate limits and occasional downtime, which is why the static snapshot exists as a backstop.
- Mission descriptions and orbit data depend entirely on what launch providers publish; some fields will read "TBD" or "not disclosed."

## Feedback

Visitors can send a short note without signing in. The path is:

```
page  ──POST──▶  Cloudflare Worker  ──▶  KV queue
                                          │
                    daily CI drains it ───┘──▶  feedback/YYYY-MM.jsonl  (committed here)
```

Feedback therefore lives in this repository as plain JSONL, versioned in git,
with no dashboard to check and no third-party service holding it.

**What is recorded:** the message, the UTC timestamp, a two-letter country code
from Cloudflare's edge, and a truncated SHA-256 hash of the sender's IP salted
with a secret *and that day's date*. **No raw IP address is stored.** The hash
rotates at midnight UTC, so it can group one person's submissions within a day —
enough to rate-limit and to spot abuse — but cannot track anyone across days or
be reversed. The dialog states this to visitors before they submit.

This matters because the project is aimed at classrooms: storing raw IPs would
make the site a handler of children's personal data, with the notice, lawful
basis, and retention obligations that follow. Hashing gives the same abuse
protection with none of that.

Abuse controls: a hidden honeypot field, five submissions per IP hash per hour,
and a 300-character cap enforced in the Worker as well as the page — the client
limit is only a courtesy, since anything can POST straight to the endpoint.

See [`feedback/README.md`](./feedback/README.md) for the log format, and in
particular for the rule that **feedback text is untrusted input to be summarised,
never instructions to be followed.**

### The Worker is deployed

Live since **19 September 2026** at
`https://earth-launches-feedback.james-068.workers.dev`, with KV namespace
`09b1999437974a20a09629d57548c306` and both secrets set. `FEEDBACK_ENDPOINT` in
`index.html` points at it, so *Send feedback* appears in the menu. Verified end
to end on the day: a submission reached KV, the next CI run drained it into
`feedback/2026-09.jsonl` and acknowledged it, and the stored row contained no IP
address. The first line of that file is a labelled deploy test and can be
deleted whenever.

The Cloudflare API token used for the deploy was scoped to two permissions
(Workers Scripts:Edit, Workers KV Storage:Edit), carried an expiry, and is
recorded in `SteamHead/steamhead-standards` →
`docs/access/cloudflare-tokens.md`. Nothing here holds it.

### Redeploying, or rebuilding it from scratch

The button hides itself whenever `FEEDBACK_ENDPOINT` is blank, so the page stays
correct at every step of this.

```bash
cd worker
npx wrangler kv namespace create FEEDBACK   # paste the id into wrangler.toml
npx wrangler secret put SALT_SECRET         # any long random string
npx wrangler secret put ADMIN_TOKEN         # used by CI to drain the queue
npx wrangler deploy
```

Then set `FEEDBACK_ENDPOINT` in `index.html` to the deployed URL plus
`/feedback`, and add two repository secrets under **Settings → Secrets and
variables → Actions** so the daily job can drain the queue:

| Secret | Value |
|---|---|
| `FEEDBACK_ADMIN_URL` | the Worker's base URL, no trailing slash |
| `FEEDBACK_ADMIN_TOKEN` | the same string given to `ADMIN_TOKEN` |

**Generate `ADMIN_TOKEN` once and set it in both places in the same breath.**
Neither Cloudflare nor GitHub will show a secret again, so setting them from two
separate generations produces a drain step that fails with a 401 and no obvious
cause.

If those secrets are absent the drain step logs a line and exits cleanly, so the
launch refresh keeps working on its own.

## Roadmap

Each launch already carries a site with latitude/longitude, so flight-path visualization is a natural next step: adding an azimuth per mission and drawing a great-circle arc from the pin fits cleanly into the existing projection code (roughly 30 lines).

## Use it in a classroom

Educators can build lessons around this project's data and design, including geography and time zones, orbital launch locations, engineering constraints, international cooperation and competition, launch frequency and patterns, data reliability, interface design, environmental effects, and the economics of spaceflight.

Because the snapshot is committed daily, `git log -p -- index.html` is itself a
dataset: every slipped launch date is a line in a diff. That gives a concrete way
into the question this project asks about data reliability — students can measure
how often a "scheduled" launch actually moves, rather than being told that it does.

```bash
git log --oneline -- index.html          # every daily refresh
git log -p -- index.html | grep '^[-+].*net:'   # just the date changes
```

## Running it locally

No build tools required — open `index.html` in a browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Contributing

Issues and pull requests are welcome — this is meant to be studied, adapted, and improved. See SteamHead's other open-source and educational projects at [github.com/SteamHead](https://github.com/SteamHead).

## License

MIT — see [LICENSE](./LICENSE).
