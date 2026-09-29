/**
 * Live Share TURN credentials: the relay's `GET /turn-credentials` endpoint.
 *
 * TURN is a separate service from signaling. The TURN servers (Cloudflare Realtime TURN in
 * production) relay the browsers' encrypted WebRTC packets when no direct path works; this endpoint
 * only hands a browser short-lived credentials for them. It never sees WebRTC traffic, rooms or
 * game data, and shares nothing with the room code in room-core.mjs.
 *
 * Both runtimes use this file unchanged (relay/cloudflare/worker.mjs and relay/node-relay.mjs).
 *
 * Credential sources, first match wins (all are server-side environment values, never in the page):
 *   TURN_KEY_ID + TURN_KEY_API_TOKEN      Cloudflare Realtime TURN: the long-term key stays here and
 *                                         each request mints credentials that expire after
 *                                         TURN_CREDENTIAL_TTL_SECONDS (Wrangler secrets in production)
 *   DEV_TURN_URLS + DEV_TURN_USERNAME     a fixed local/test TURN server (comma-separated turn: URLs),
 *     + DEV_TURN_CREDENTIAL               e.g. the one Playwright starts; for development only
 *   neither                               503 turn-not-configured: browsers continue STUN-only
 *
 * Responses never include provider error details, and nothing here logs a secret or a credential.
 */

// Long enough for a play session: TURN servers check the credentials again whenever a browser
// refreshes its relay allocation, so a session that outlives them loses its relayed path.
export const TURN_CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;

const CLOUDFLARE_TURN_API = 'https://rtc.live.cloudflare.com/v1/turn/keys';
const MAX_URLS = 12;
const MAX_FIELD_LENGTH = 512;

// Browsers block port 53, so a TURN URL on it only times out (Cloudflare's own advice is to drop it).
const isUsableTurnUrl = (url) =>
  typeof url === 'string' && url.length <= 256 && /^turns?:[^\s:/?#]+(:\d+)?(\?transport=(udp|tcp))?$/i.test(url) && !/:53(\?|$)/.test(url);

export function isAllowedOrigin(origin, allowed) {
  if (!origin) return false;
  return String(allowed || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

/**
 * Keep only well-formed TURN entries (turn:/turns: URLs with a username and credential). STUN
 * entries are dropped: the page has its own STUN list, and TURN is all this endpoint is for.
 */
export function sanitizeTurnServers(list) {
  if (!Array.isArray(list)) return [];
  const servers = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const urls = [].concat(entry.urls).filter(isUsableTurnUrl).slice(0, MAX_URLS);
    const { username, credential } = entry;
    const validField = (v) => typeof v === 'string' && v.length > 0 && v.length <= MAX_FIELD_LENGTH;
    if (urls.length && validField(username) && validField(credential)) servers.push({ urls, username, credential });
  }
  return servers;
}

class TurnProviderError extends Error {}

/** TURN servers with fresh credentials, or null when no source is configured. */
export async function issueTurnServers(env, { fetchImpl = globalThis.fetch, ttlSeconds = TURN_CREDENTIAL_TTL_SECONDS } = {}) {
  if (env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) {
    let response;
    try {
      response = await fetchImpl(`${CLOUDFLARE_TURN_API}/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: ttlSeconds }),
      });
    } catch {
      throw new TurnProviderError('TURN provider unreachable');
    }
    if (!response.ok) throw new TurnProviderError(`TURN provider answered ${response.status}`);
    let json;
    try {
      json = await response.json();
    } catch {
      throw new TurnProviderError('TURN provider sent malformed JSON');
    }
    const servers = sanitizeTurnServers(json && json.iceServers);
    if (!servers.length) throw new TurnProviderError('TURN provider sent no usable TURN servers');
    return servers;
  }
  if (env.DEV_TURN_URLS && env.DEV_TURN_USERNAME && env.DEV_TURN_CREDENTIAL) {
    const servers = sanitizeTurnServers([
      { urls: String(env.DEV_TURN_URLS).split(',').map((u) => u.trim()), username: env.DEV_TURN_USERNAME, credential: env.DEV_TURN_CREDENTIAL },
    ]);
    return servers.length ? servers : null;
  }
  return null;
}

/**
 * Handle `GET /turn-credentials`. `request` is `{ method, origin }`; returns `{ status, headers, body }`
 * for the runtime to send. `log` receives a short reason on provider failures (never secrets).
 */
export async function handleTurnCredentialRequest(request, env, { allowedOrigins, fetchImpl, now = () => Date.now(), log = () => {} } = {}) {
  const { method, origin } = request;
  const baseHeaders = { 'content-type': 'application/json', 'cache-control': 'no-store', vary: 'Origin' };
  const reply = (status, payload, cors) => ({
    status,
    headers: cors ? { ...baseHeaders, 'access-control-allow-origin': origin } : baseHeaders,
    body: JSON.stringify(payload),
  });

  // Only pages of the Live Share site may ask (anti-abuse, not authentication: see relay/README.md).
  if (!isAllowedOrigin(origin, allowedOrigins)) return reply(403, { error: 'origin-not-allowed' }, false);
  if (method !== 'GET') return reply(405, { error: 'method-not-allowed' }, true);

  let servers;
  try {
    servers = await issueTurnServers(env, { fetchImpl });
  } catch (err) {
    log(err instanceof TurnProviderError ? err.message : 'TURN credential request failed');
    return reply(502, { error: 'turn-unavailable' }, true);
  }
  if (!servers) return reply(503, { error: 'turn-not-configured' }, true);
  const ttlSeconds = env.TURN_KEY_ID ? TURN_CREDENTIAL_TTL_SECONDS : null;
  return reply(200, { iceServers: servers, ttlSeconds, issuedAt: new Date(now()).toISOString() }, true);
}
