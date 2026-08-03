# Launches from Earth

*A [Neighborhood Earth](https://www.steamhead.space/neighborhood-earth/) project by [SteamHead](https://www.steamhead.space)*

Launches from Earth is an interactive globe that lets people explore upcoming space launches around the world. Visitors can watch live countdowns, locate launch sites, and select individual spaceports to learn more about the missions beginning there.

**Live version:** https://www.steamhead.space/neighborhood-earth/launches-from-earth/
**GitHub Pages mirror:** https://steamhead.github.io/launches-from-earth/

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
- The globe is drawn with the 2D Canvas API (no WebGL/Three.js).
- Launch data is pulled live from [The Space Devs' Launch Library API](https://thespacedevs.com/llapi) (`ll.thespacedevs.com`). If the live fetch fails or times out, the page falls back to a bundled snapshot of upcoming launches so it's never blank.
- Launch sites are matched to coordinates and rendered on the globe with live countdowns; selecting a site opens a detail card with mission, vehicle, and provider information.

## Known data limitations

- Launch dates and times (`NET` — "no earlier than") change frequently and are sometimes only precise to the month or quarter; the countdown display reflects that precision.
- The live API has rate limits and occasional downtime, which is why a static snapshot ships as a fallback — that snapshot will drift out of date over time.
- Mission descriptions and orbit data depend entirely on what launch providers publish; some fields will read "TBD" or "not disclosed."

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
