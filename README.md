# Launches from Earth

*A [Neighborhood Earth](https://www.steamhead.space/neighborhood-earth/) project by [SteamHead](https://www.steamhead.space)*

Launches from Earth is an interactive globe that lets people explore upcoming space launches around the world. Visitors can watch live countdowns, locate launch sites, and select individual spaceports to learn more about the missions beginning there.

**Live version:** https://www.steamhead.space/neighborhood-earth/launches-from-earth/
**GitHub Pages mirror:** https://boomtown001.github.io/earth-launches/ *(pending — enable in repo Settings → Pages → Deploy from branch → main → /(root); this repo will move to the SteamHead org, so this URL will change then too)*

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
- On load, the page tries [The Space Devs' Launch Library API](https://thespacedevs.com/llapi) (`ll.thespacedevs.com`) and switches the header chip to "Live feed" if it succeeds. That fetch is commonly blocked by CORS inside sandboxed previews, but works when the page is served from its own domain (as it is on steamhead.space and GitHub Pages) — so the live feed should stay current indefinitely there.
- If the live fetch fails or is unavailable, the page falls back to a bundled snapshot so it's never blank (see limitations below).

## Known data limitations

- The bundled fallback snapshot was pulled from [The Space Devs' Launch Library API](https://thespacedevs.com/llapi) on **23 August 2026**, covering 30 spaceports and 35 missions through mid-October 2026. It will drift out of date — the live feed (see above) is what keeps the page accurate day to day.
- Launch dates and times (`NET` — "no earlier than") change frequently and are sometimes only precise to the month or quarter; the countdown display and the card's confidence line reflect that precision rather than hiding it.
- The live API has its own rate limits and occasional downtime, which is why the static snapshot exists as a backstop.
- Mission descriptions and orbit data depend entirely on what launch providers publish; some fields will read "TBD" or "not disclosed."

## Roadmap

Each launch already carries a site with latitude/longitude, so flight-path visualization is a natural next step: adding an azimuth per mission and drawing a great-circle arc from the pin fits cleanly into the existing projection code (roughly 30 lines).

## Use it in a classroom

Educators can build lessons around this project's data and design, including geography and time zones, orbital launch locations, engineering constraints, international cooperation and competition, launch frequency and patterns, data reliability, interface design, environmental effects, and the economics of spaceflight.

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
