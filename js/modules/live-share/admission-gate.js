/**
 * Live Share Milestone 5B.1: what the session host may send to, and accept from, a peer, by its
 * admission state (planning doc §7, §11, §22: "a connected but not-yet-admitted player receives only
 * admission state, never map state, background, other assets or pings").
 *
 * A WebRTC connection is not authorization. One central policy, deny by default, that every sender
 * asks before it sends (5B.2 wires it into the snapshot sender, the asset sender and the admission
 * messages; nothing in the product uses it yet). A type the policy doesn't list is refused for
 * everyone, so a new message type is unsendable until it is placed here on purpose.
 *
 *   peer state     'unadmitted'  connected, not (or no longer) admitted
 *                  'admitted'    holds a seat
 *
 *   host -> peer   unadmitted: admission-state, join-result, session-ended
 *                  admitted:   join-result, session-state, session-ended, surface-snapshot,
 *                              asset-meta, asset-abort, asset-chunk (binary)
 *   peer -> host   unadmitted: join-request, rejoin-request, leave
 *                  admitted:   asset-request, leave
 */

export const PEER_STATES = Object.freeze(['unadmitted', 'admitted']);

const SEND = Object.freeze({
  unadmitted: new Set(['admission-state', 'join-result', 'session-ended']),
  admitted: new Set(['join-result', 'session-state', 'session-ended', 'surface-snapshot', 'asset-meta', 'asset-abort', 'asset-chunk']),
});
const ACCEPT = Object.freeze({
  unadmitted: new Set(['join-request', 'rejoin-request', 'leave']),
  admitted: new Set(['asset-request', 'leave']),
});

/** Whether the host may send a message of `type` (an asset chunk is 'asset-chunk') to a peer in `state`. */
export function maySend(state, type) {
  const allowed = Object.prototype.hasOwnProperty.call(SEND, state) ? SEND[state] : null;
  return !!allowed && typeof type === 'string' && allowed.has(type);
}

/** Whether the host acts on a (validated) message of `type` from a peer in `state`. */
export function mayAccept(state, type) {
  const allowed = Object.prototype.hasOwnProperty.call(ACCEPT, state) ? ACCEPT[state] : null;
  return !!allowed && typeof type === 'string' && allowed.has(type);
}
