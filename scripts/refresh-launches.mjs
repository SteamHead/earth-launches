#!/usr/bin/env node
/* Regenerates the bundled snapshot in index.html from Launch Library.
   Deterministic: fetch -> map -> rewrite. No AI, no judgement calls.
   Mapping mirrors tryLive() in index.html so live and snapshot data
   are the same shape; anything that changes here changes there too. */

import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=60&mode=normal';
const HTML = new URL('../index.html', import.meta.url).pathname;
const README = new URL('../README.md', import.meta.url).pathname;

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/* ---------- fetch, with a couple of retries for transient API hiccups ---------- */
async function fetchLaunches() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 20000);
      const r = await fetch(API, { signal: ac.signal, headers: { 'User-Agent': 'earth-launches-snapshot/1.0 (+https://github.com/SteamHead/earth-launches)' } });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j.results) || j.results.length === 0) throw new Error('empty results');
      return j.results;
    } catch (e) {
      console.error(`attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(res => setTimeout(res, attempt * 5000));
    }
  }
}

/* ---------- parse the existing curated SITES so we never clobber them ---------- */
function readSites(html) {
  const start = html.indexOf('const SITES = [');
  const end = html.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('could not locate SITES array');
  const body = html.slice(start + 'const SITES = ['.length, end);
  const sites = [];
  for (const line of body.split('\n')) {
    const m = line.match(/id:'([^']+)'.*?name:'([^']*)'.*?place:'([^']*)'.*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)/);
    if (m) sites.push({ id: m[1], name: m[2], place: m[3], lat: +m[4], lon: +m[5], raw: line });
  }
  if (!sites.length) throw new Error('parsed zero sites');
  return { sites, start, end };
}

/* ---------- map API rows to the page's launch shape ---------- */
function mapLaunches(results, sites) {
  const added = [];
  const out = [];
  for (const it of results) {
    const pad = it.pad || {}, loc = pad.location || {};
    const lat = parseFloat(pad.latitude ?? loc.latitude);
    const lon = parseFloat(pad.longitude ?? loc.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    let site = [...sites, ...added].find(s => Math.hypot(s.lat - lat, s.lon - lon) < 1.2);
    if (!site) {
      const base = (loc.name || 'Unlisted site').split(',')[0];
      site = {
        id: 'x' + (added.length + 1),
        name: base,
        place: loc.country || loc.name || '',
        lat: +lat.toFixed(3), lon: +lon.toFixed(3),
      };
      added.push(site);
    }

    const prec = ((it.net_precision && it.net_precision.name) || '').toLowerCase();
    const p = /month/.test(prec) ? 'month'
            : /quarter|year/.test(prec) ? 'quarter'
            : /day/.test(prec) ? 'day' : 'time';

    const desc = it.mission && it.mission.description;
    out.push({
      site: site.id,
      net: it.net,
      p,
      veh: (it.rocket && it.rocket.configuration && (it.rocket.configuration.full_name || it.rocket.configuration.name)) || 'Vehicle TBD',
      who: (it.launch_service_provider && it.launch_service_provider.name) || '—',
      mission: (it.mission && it.mission.name) || it.name || 'Payload TBD',
      orbit: (it.mission && it.mission.orbit && it.mission.orbit.name) || 'Not disclosed',
      status: (it.status && it.status.name) || '',
      brief: desc ? String(desc).split(/(?<=\.)\s/)[0] : 'No mission description has been published.',
    });
  }
  out.sort((a, b) => new Date(a.net) - new Date(b.net));
  return { launches: out, added };
}

/* ---------- render ---------- */
const q = s => JSON.stringify(String(s));

function renderLaunches(launches) {
  return launches.map(l =>
    `  {site:${q(l.site)}, net:${q(l.net)}, p:${q(l.p)}, veh:${q(l.veh)}, who:${q(l.who)},\n` +
    `   mission:${q(l.mission)}, orbit:${q(l.orbit)}, status:${q(l.status)},\n` +
    `   brief:${q(l.brief)}},`
  ).join('\n');
}

function renderNewSites(added) {
  return added.map(s =>
    `  {id:'${s.id}', name:${q(s.name)}, place:${q(s.place)}, lat:${s.lat}, lon:${s.lon}},`
  ).join('\n');
}

/* ---------- main ---------- */
const results = await fetchLaunches();
let html = readFileSync(HTML, 'utf8');
const { sites } = readSites(html);
const { launches, added } = mapLaunches(results, sites);

if (launches.length < 8) {
  console.error(`only ${launches.length} usable launches; refusing to write a thin snapshot`);
  process.exit(1);
}

// Replace the LAUNCHES array body.
const lStart = html.indexOf('const LAUNCHES = [');
const lEnd = html.indexOf('\n];', lStart);
if (lStart < 0 || lEnd < 0) throw new Error('could not locate LAUNCHES array');
html = html.slice(0, lStart) + 'const LAUNCHES = [\n' + renderLaunches(launches) + html.slice(lEnd);

// Append any newly discovered sites, leaving curated entries untouched.
if (added.length) {
  const { end: sEnd } = readSites(html);
  html = html.slice(0, sEnd) + '\n' + renderNewSites(added) + html.slice(sEnd);
  console.log(`added ${added.length} new site(s): ${added.map(s => s.name).join(', ')}`);
}

// Update the visible snapshot date chip.
const now = new Date();
const short = `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()].slice(0, 3)} ${now.getUTCFullYear()}`;
const long  = `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
html = html.replace(/(<b>Snapshot<\/b> · )\d{1,2} \w{3} \d{4}/, `$1${short}`);
writeFileSync(HTML, html);

// Update the README's provenance line so the stated date stays true.
const siteCount = new Set(launches.map(l => l.site)).size;
const last = launches[launches.length - 1].net.slice(0, 10);
const lastDate = new Date(last);
const through = `${MONTHS[lastDate.getUTCMonth()]} ${lastDate.getUTCFullYear()}`;
let readme = readFileSync(README, 'utf8');
readme = readme.replace(
  /on \*\*\d{1,2} \w+ \d{4}\*\*, covering \d+ spaceports and \d+ missions through [^.]+\./,
  `on **${long}**, covering ${siteCount} spaceports and ${launches.length} missions through ${through}.`
);
writeFileSync(README, readme);

console.log(`snapshot: ${launches.length} launches across ${siteCount} sites, through ${through}`);
