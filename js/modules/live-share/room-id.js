/**
 * Live Share room ids and join links.
 *
 * A room id is 128 random bits encoded as base64url, so rooms cannot be guessed or enumerated
 * (planning doc §10). The id travels in the URL fragment (`#room=...`), which browsers never
 * send in the page's HTTP request, so it stays out of the static host's logs.
 *
 * ROOM_ID_PATTERN must match relay/room-core.mjs; tests/unit/live-share-relay.test.js checks it.
 */

export const ROOM_ID_BYTES = 16;
export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export function generateRoomId(cryptoObj = globalThis.crypto) {
  const bytes = new Uint8Array(ROOM_ID_BYTES);
  cryptoObj.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isValidRoomId(id) {
  return typeof id === 'string' && ROOM_ID_PATTERN.test(id);
}

/** The join link for a room: same page and query, room id in the fragment. */
export function buildJoinUrl(pageHref, roomId) {
  const url = new URL(pageHref);
  url.hash = `room=${roomId}`;
  return url.href;
}

/** Room id from a `#room=...` fragment, or null when absent or malformed. */
export function readRoomIdFromHash(hash) {
  const id = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('room');
  return isValidRoomId(id) ? id : null;
}
