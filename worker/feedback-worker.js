/* Feedback intake for Launches from Earth.
 *
 * Privacy posture: we never store a raw IP. We store a truncated SHA-256 of
 * (ip + a secret + the UTC date). That is enough to rate-limit and to spot one
 * person submitting fifty times, but it is not a stable identifier — the daily
 * date component means yesterday's hash cannot be matched to today's. Country
 * comes from Cloudflare's edge and is coarse enough to be non-identifying.
 *
 * Bindings required:
 *   KV namespace  FEEDBACK
 *   Secret        SALT_SECRET   (any long random string)
 *   Secret        ADMIN_TOKEN   (used by the daily drain in CI)
 */

const MAX_CHARS   = 300;
const RATE_LIMIT  = 5;          // submissions per IP hash per window
const RATE_WINDOW = 60 * 60;    // one hour, in seconds
const RETAIN      = 60 * 60 * 24 * 30;  // KV entries self-expire after 30 days

const ALLOWED_ORIGINS = [
  'https://www.steamhead.space',
  'https://steamhead.space',
  'https://boomtown001.github.io',
  'https://steamhead.github.io',
];

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

async function hashIp(ip, secret) {
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}|${secret}|${day}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ch = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch });

    /* ---------------- admin: used by the daily CI drain ---------------- */
    if (url.pathname === '/admin/list' || url.pathname === '/admin/ack') {
      const token = request.headers.get('Authorization') || '';
      if (!env.ADMIN_TOKEN || token !== `Bearer ${env.ADMIN_TOKEN}`) {
        return json({ error: 'unauthorized' }, 401, {});
      }

      if (url.pathname === '/admin/list') {
        const listed = await env.FEEDBACK.list({ prefix: 'fb:', limit: 1000 });
        const entries = [];
        for (const k of listed.keys) {
          const v = await env.FEEDBACK.get(k.name);
          if (v) entries.push({ key: k.name, ...JSON.parse(v) });
        }
        entries.sort((a, b) => a.ts.localeCompare(b.ts));
        return json({ entries }, 200, {});
      }

      // ack: delete only what CI has confirmed it committed
      const { keys } = await request.json().catch(() => ({ keys: [] }));
      if (!Array.isArray(keys)) return json({ error: 'keys must be an array' }, 400, {});
      await Promise.all(keys.filter(k => typeof k === 'string' && k.startsWith('fb:'))
                            .map(k => env.FEEDBACK.delete(k)));
      return json({ deleted: keys.length }, 200, {});
    }

    /* ---------------- public: feedback submission ---------------- */
    if (url.pathname !== '/feedback' || request.method !== 'POST') {
      return json({ error: 'not found' }, 404, ch);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'malformed request' }, 400, ch); }

    // Honeypot: a real browser leaves this empty because it is visually hidden.
    // Answer 200 so bots believe they succeeded and do not adapt.
    if (body && typeof body.hp === 'string' && body.hp.trim() !== '') {
      return json({ ok: true }, 200, ch);
    }

    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) return json({ error: 'Feedback cannot be empty.' }, 400, ch);
    if (text.length > MAX_CHARS) {
      // Enforced here as well as in the page: the client limit is a courtesy,
      // and anything can POST straight to this endpoint.
      return json({ error: `Please keep it under ${MAX_CHARS} characters.` }, 400, ch);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const ipHash = await hashIp(ip, env.SALT_SECRET || 'unset-salt');

    const rateKey = `rl:${ipHash}`;
    const seen = parseInt(await env.FEEDBACK.get(rateKey) || '0', 10);
    if (seen >= RATE_LIMIT) {
      return json({ error: 'That is plenty for now — try again a bit later.' }, 429, ch);
    }
    await env.FEEDBACK.put(rateKey, String(seen + 1), { expirationTtl: RATE_WINDOW });

    const ts = new Date().toISOString();
    const key = `fb:${ts}:${crypto.randomUUID().slice(0, 8)}`;
    await env.FEEDBACK.put(key, JSON.stringify({
      ts,
      text,
      ipHash,
      country: request.cf?.country || '??',
    }), { expirationTtl: RETAIN });

    return json({ ok: true }, 200, ch);
  },
};
