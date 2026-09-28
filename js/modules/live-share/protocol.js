/**
 * Live Share message validation.
 *
 * Everything that arrives from the relay or over a data channel came from another browser and
 * is untrusted (planning doc §22): it is size-checked, parsed and validated against a known
 * shape before use, and unknown types are rejected. Text is only ever rendered with textContent.
 *
 * Milestone 0 has one data-channel message, `hello`. Later milestones add their types here.
 */

export const PROTOCOL_VERSION = 0;
export const MAX_CHANNEL_MESSAGE_BYTES = 16 * 1024;
export const MAX_HELLO_TEXT_LENGTH = 200;
const MAX_SDP_LENGTH = 12 * 1024;
const MAX_CANDIDATE_LENGTH = 1024;

const byteLength = (text) => new TextEncoder().encode(text).length;
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function parseJson(raw, maxBytes) {
  if (typeof raw !== 'string') return { ok: false, error: 'not a text message' };
  if (byteLength(raw) > maxBytes) return { ok: false, error: 'message too large' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'malformed JSON' };
  }
}

// ---- Relay frames (relay -> client) ---------------------------------------------------------

const RELAY_FRAME_TYPES = new Set(['registered', 'welcome', 'peer-joined', 'peer-left', 'signal', 'host-left', 'error']);

export function parseRelayFrame(raw) {
  const parsed = parseJson(raw, 64 * 1024);
  if (!parsed.ok) return parsed;
  const msg = parsed.value;
  if (!isPlainObject(msg) || !RELAY_FRAME_TYPES.has(msg.type)) return { ok: false, error: 'unknown relay frame' };
  if ((msg.type === 'welcome' || msg.type === 'peer-joined' || msg.type === 'peer-left') && !isPeerId(msg.peerId)) {
    return { ok: false, error: 'relay frame without a valid peerId' };
  }
  if (msg.type === 'signal' && (typeof msg.from !== 'string' || !isPlainObject(msg.data))) {
    return { ok: false, error: 'malformed signal frame' };
  }
  return { ok: true, message: msg };
}

function isPeerId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// ---- WebRTC negotiation payloads (the opaque `data` of a relay signal) ---------------------

export function describeSignal(description) {
  return { kind: 'description', description: { type: description.type, sdp: description.sdp } };
}

export function candidateSignal(candidate) {
  // `candidate: null` would mean end-of-candidates; callers simply don't send it.
  return {
    kind: 'candidate',
    candidate: {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid ?? null,
      sdpMLineIndex: candidate.sdpMLineIndex ?? null,
    },
  };
}

export function parseSignalData(data) {
  if (!isPlainObject(data)) return { ok: false, error: 'signal is not an object' };
  if (data.kind === 'description') {
    const d = data.description;
    if (!isPlainObject(d) || (d.type !== 'offer' && d.type !== 'answer')) return { ok: false, error: 'bad description type' };
    if (typeof d.sdp !== 'string' || d.sdp.length > MAX_SDP_LENGTH) return { ok: false, error: 'bad sdp' };
    return { ok: true, signal: { kind: 'description', description: { type: d.type, sdp: d.sdp } } };
  }
  if (data.kind === 'candidate') {
    const c = data.candidate;
    if (!isPlainObject(c) || typeof c.candidate !== 'string' || c.candidate.length > MAX_CANDIDATE_LENGTH) {
      return { ok: false, error: 'bad candidate' };
    }
    const sdpMid = typeof c.sdpMid === 'string' && c.sdpMid.length <= 64 ? c.sdpMid : null;
    const sdpMLineIndex = Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 64 ? c.sdpMLineIndex : null;
    if (sdpMid === null && sdpMLineIndex === null) return { ok: false, error: 'candidate without sdpMid or sdpMLineIndex' };
    return { ok: true, signal: { kind: 'candidate', candidate: { candidate: c.candidate, sdpMid, sdpMLineIndex } } };
  }
  return { ok: false, error: 'unknown signal kind' };
}

// ---- Data-channel messages (host <-> player) ------------------------------------------------

export function encodeHello(text = 'hello') {
  return JSON.stringify({ v: PROTOCOL_VERSION, type: 'hello', text: String(text).slice(0, MAX_HELLO_TEXT_LENGTH) });
}

export function parseChannelMessage(raw) {
  const parsed = parseJson(raw, MAX_CHANNEL_MESSAGE_BYTES);
  if (!parsed.ok) return parsed;
  const msg = parsed.value;
  if (!isPlainObject(msg)) return { ok: false, error: 'message is not an object' };
  if (msg.v !== PROTOCOL_VERSION) return { ok: false, error: `unsupported protocol version ${JSON.stringify(msg.v)}` };
  if (msg.type === 'hello') {
    if (typeof msg.text !== 'string' || msg.text.length > MAX_HELLO_TEXT_LENGTH) return { ok: false, error: 'bad hello text' };
    return { ok: true, message: { type: 'hello', text: msg.text } };
  }
  return { ok: false, error: 'unknown message type' };
}
