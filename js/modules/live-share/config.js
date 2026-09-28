/**
 * Where the Live Share client finds the signaling relay and STUN servers.
 */

// Set after the first `wrangler deploy` of relay/cloudflare (see relay/README.md).
export const PRODUCTION_RELAY_URL = '';

export const LOCAL_RELAY_URL = 'ws://localhost:8787';

// STUN only lets each browser learn its public address; no traffic flows through it. It does
// reveal the browser's IP address to the STUN provider, like any WebRTC call. TURN (relayed
// traffic for networks that block direct connections) arrives in Milestone 8.
export const DEFAULT_ICE_SERVERS = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Relay URL for this page. On a local page (localhost, 127.0.0.1, [::1]) an explicit
 * `?relay=ws(s)://...` wins (development override, carried into join links because they keep the
 * page's query), else the local relay. Any other origin always uses the deployed relay and
 * ignores `?relay=`: otherwise a crafted link to the real site could send all signaling, SDP
 * included, through a relay of the link author's choosing. Returns null when none is configured.
 */
export function resolveRelayUrl(location) {
  if (!LOCAL_HOSTS.has(location.hostname)) return PRODUCTION_RELAY_URL || null;
  return parseRelayOverride(new URLSearchParams(location.search).get('relay')) || LOCAL_RELAY_URL;
}

/** A well-formed ws:// or wss:// URL without its trailing slashes, or null. Never throws. */
function parseRelayOverride(value) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if ((url.protocol !== 'ws:' && url.protocol !== 'wss:') || !url.hostname) return null;
  return value.trim().replace(/\/+$/, '');
}
