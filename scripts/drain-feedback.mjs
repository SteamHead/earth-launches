#!/usr/bin/env node
/* Pulls queued feedback out of the Worker's KV store and appends it to
   feedback/YYYY-MM.jsonl, then acknowledges so the Worker can delete it.
   Two-phase on purpose: nothing is deleted until it is committed here, so a
   failed CI run loses no feedback (it just arrives the next day).

   Env: FEEDBACK_ADMIN_URL   base URL of the Worker, no trailing slash
        FEEDBACK_ADMIN_TOKEN matching the Worker's ADMIN_TOKEN secret        */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const BASE  = process.env.FEEDBACK_ADMIN_URL;
const TOKEN = process.env.FEEDBACK_ADMIN_TOKEN;

if (!BASE || !TOKEN) {
  console.log('Feedback drain not configured (missing URL or token); skipping.');
  process.exit(0);
}

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const r = await fetch(`${BASE}/admin/list`, { headers: auth });
if (!r.ok) {
  console.error(`drain: list failed with HTTP ${r.status}`);
  process.exit(1);
}
const { entries } = await r.json();

if (!entries || entries.length === 0) {
  console.log('No new feedback.');
  process.exit(0);
}

// Group by the month the feedback arrived in, so files stay small and browsable.
const byMonth = new Map();
for (const e of entries) {
  const month = e.ts.slice(0, 7);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push({ ts: e.ts, text: e.text, country: e.country, ipHash: e.ipHash });
}

mkdirSync('feedback', { recursive: true });
for (const [month, rows] of byMonth) {
  const file = `feedback/${month}.jsonl`;
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const seen = new Set(existing.split('\n').filter(Boolean).map(l => {
    try { const o = JSON.parse(l); return o.ts + '|' + o.text; } catch { return ''; }
  }));
  const fresh = rows.filter(x => !seen.has(x.ts + '|' + x.text));
  if (!fresh.length) continue;
  const body = fresh.map(x => JSON.stringify(x)).join('\n') + '\n';
  writeFileSync(file, existing && !existing.endsWith('\n') ? existing + '\n' + body : existing + body);
  console.log(`${file}: +${fresh.length}`);
}

// Only now tell the Worker it may forget them.
const ack = await fetch(`${BASE}/admin/ack`, {
  method: 'POST', headers: auth,
  body: JSON.stringify({ keys: entries.map(e => e.key) }),
});
console.log(ack.ok ? `Acknowledged ${entries.length} entries.` : `WARNING: ack failed (HTTP ${ack.status}); they will reappear tomorrow.`);
