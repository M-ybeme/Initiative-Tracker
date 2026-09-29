/**
 * The ICE servers a Live Share peer connection uses: the fixed STUN list, plus TURN servers with
 * short-lived credentials fetched from the relay's `/turn-credentials` endpoint.
 *
 * TURN is a fallback, not a replacement: peer connections keep iceTransportPolicy "all", so ICE
 * still prefers a direct (host / srflx) path and only uses a relay candidate when nothing direct
 * works. If the credentials can't be fetched, the connection goes ahead STUN-only and the
 * diagnostics say "TURN unavailable; direct connections may still work."
 *
 * Credentials are held in memory for one connection attempt only: never stored, logged or shown.
 */
import { DEFAULT_ICE_SERVERS } from './config.js';

export const TURN_FETCH_TIMEOUT_MS = 5000;
export const TURN_UNAVAILABLE_MESSAGE = 'TURN unavailable; direct connections may still work.';

const MAX_SERVERS = 4;
const MAX_URLS = 12;
const MAX_FIELD_LENGTH = 512;

/** `wss://relay.example` -> `https://relay.example/turn-credentials` (ws:// -> http://). */
export function turnCredentialsUrl(relayUrl) {
  const url = new URL(relayUrl);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/turn-credentials`;
  url.search = '';
  url.hash = '';
  return url.href;
}

const isTurnUrl = (u) => typeof u === 'string' && u.length <= 256 && /^turns?:[^\s]+$/i.test(u);
const isField = (v) => typeof v === 'string' && v.length > 0 && v.length <= MAX_FIELD_LENGTH;

/**
 * Validate the endpoint's JSON (untrusted input, like everything from the network). Returns
 * `{ ok: true, servers }` with only well-formed TURN entries, or `{ ok: false, error }`.
 */
export function parseTurnCredentials(json) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.iceServers)) return { ok: false, error: 'malformed response' };
  const servers = [];
  for (const entry of json.iceServers.slice(0, MAX_SERVERS)) {
    if (!entry || typeof entry !== 'object') continue;
    const urls = [].concat(entry.urls).filter(isTurnUrl).slice(0, MAX_URLS);
    if (urls.length && isField(entry.username) && isField(entry.credential)) {
      servers.push({ urls, username: entry.username, credential: entry.credential });
    }
  }
  return servers.length ? { ok: true, servers } : { ok: false, error: 'no usable TURN servers' };
}

/** True when a list of ICE servers includes at least one TURN URL. */
export function hasTurnServer(iceServers) {
  return (iceServers || []).some((s) => [].concat(s && s.urls).some(isTurnUrl));
}

/**
 * Resolve the ICE servers for one connection. Never throws: any TURN problem falls back to STUN.
 * Returns `{ iceServers, turn: { configured, status, message } }`; `status` is one of
 *   available       TURN credentials fetched; the relay path is available if needed
 *   not-configured  the relay has no TURN source (typical for plain local development)
 *   unavailable     fetch failed, timed out, was refused or sent something unusable
 * `turn` never contains credentials, so it is safe to show in diagnostics.
 */
export async function resolveIceServers({ relayUrl, fetchImpl = globalThis.fetch, timeoutMs = TURN_FETCH_TIMEOUT_MS } = {}) {
  const stunOnly = (status, message) => ({ iceServers: DEFAULT_ICE_SERVERS, turn: { configured: false, status, message } });
  if (!relayUrl || typeof fetchImpl !== 'function') return stunOnly('unavailable', TURN_UNAVAILABLE_MESSAGE);

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(turnCredentialsUrl(relayUrl), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller ? controller.signal : undefined,
    });
    if (response.status === 503) return stunOnly('not-configured', 'TURN is not configured on this relay; direct connections only.');
    if (!response.ok) return stunOnly('unavailable', TURN_UNAVAILABLE_MESSAGE);
    const parsed = parseTurnCredentials(await response.json());
    if (!parsed.ok) return stunOnly('unavailable', TURN_UNAVAILABLE_MESSAGE);
    return {
      iceServers: [...DEFAULT_ICE_SERVERS, ...parsed.servers],
      turn: { configured: true, status: 'available', message: 'TURN relay available as a fallback.' },
    };
  } catch {
    return stunOnly('unavailable', TURN_UNAVAILABLE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}
