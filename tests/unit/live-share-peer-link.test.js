// PeerLink's failure classification (signaling vs ICE vs data channel) and negotiation handling,
// with a scripted stand-in for RTCPeerConnection. The real WebRTC path is covered end to end by
// tests/e2e/live-share-networking.spec.js.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PeerLink } from '../../js/modules/live-share/peer-link.js';

class FakeChannel {
  constructor(label) {
    this.label = label;
    this.readyState = 'connecting';
    this.sent = [];
  }
  send(text) {
    this.sent.push(text);
  }
  close() {
    this.readyState = 'closed';
  }
  open() {
    this.readyState = 'open';
    this.onopen && this.onopen();
  }
}

class FakePC {
  constructor(config) {
    this.config = config;
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.iceGatheringState = 'new';
    this.signalingState = 'stable';
    this.localDescription = null;
    this.remoteDescription = null;
    this.added = [];
    FakePC.last = this;
  }
  createDataChannel(label) {
    this.channel = new FakeChannel(label);
    return this.channel;
  }
  async createOffer() {
    return { type: 'offer', sdp: 'v=0 offer' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'v=0 answer' };
  }
  async setLocalDescription(d) {
    this.localDescription = d;
  }
  async setRemoteDescription(d) {
    if (d.sdp === 'reject') throw new Error('bad sdp');
    this.remoteDescription = d;
  }
  async addIceCandidate(c) {
    this.added.push(c);
  }
  async getStats() {
    return new Map();
  }
  close() {
    this.connectionState = 'closed';
  }
  setIce(state) {
    this.iceConnectionState = state;
    this.oniceconnectionstatechange && this.oniceconnectionstatechange();
  }
}

const cand = { kind: 'candidate', candidate: { candidate: 'candidate:1 1 udp 1 x 1 typ host', sdpMid: '0', sdpMLineIndex: 0 } };

function makeLink(role) {
  const sent = [];
  const link = new PeerLink({ role, sendSignal: (d) => sent.push(d), connectTimeoutMs: 5000, RTCPeerConnectionImpl: FakePC });
  const failures = [];
  link.on('failed', (f) => failures.push(f));
  return { link, sent, failures, pc: FakePC.last };
}

describe('PeerLink negotiation', () => {
  it('host creates the data channel and sends an offer', async () => {
    const { link, sent, pc } = makeLink('host');
    await link.start();
    expect(pc.channel.label).toBe('live-share');
    expect(sent).toEqual([{ kind: 'description', description: { type: 'offer', sdp: 'v=0 offer' } }]);
    link.close();
  });

  it('player answers an offer and applies candidates queued before it', async () => {
    const { link, sent, pc } = makeLink('player');
    await link.start();
    await link.handleSignal(cand); // arrives before the offer
    expect(pc.added).toEqual([]);
    await link.handleSignal({ kind: 'description', description: { type: 'offer', sdp: 'v=0 offer' } });
    expect(sent).toEqual([{ kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } }]);
    expect(pc.added).toEqual([cand.candidate]);
    link.close();
  });

  it('ignores malformed and unexpected signals without failing', async () => {
    const { link, failures } = makeLink('host');
    await link.start();
    await link.handleSignal({ kind: 'nonsense' });
    await link.handleSignal({ kind: 'description', description: { type: 'offer', sdp: 'v=0' } });
    expect(failures).toEqual([]);
    expect(link.diagnostics().lastProtocolError).toBeTruthy();
    link.close();
  });

  it('reports a rejected description as a negotiation failure', async () => {
    const { link, failures } = makeLink('player');
    await link.start();
    await link.handleSignal({ kind: 'description', description: { type: 'offer', sdp: 'reject' } });
    expect(failures[0].kind).toBe('negotiation');
  });
});

describe('PeerLink failure classification', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no answer through the relay -> signaling', async () => {
    const { link, failures } = makeLink('host');
    await link.start();
    vi.advanceTimersByTime(5000);
    expect(failures[0].kind).toBe('signaling');
    expect(link.closed).toBe(true);
  });

  it('player never receives an offer -> signaling', async () => {
    const { link, failures } = makeLink('player');
    await link.start();
    vi.advanceTimersByTime(5000);
    expect(failures[0].kind).toBe('signaling');
  });

  it('negotiated but ICE never connects -> ice', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    await link.handleSignal({ kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } });
    pc.iceConnectionState = 'checking';
    vi.advanceTimersByTime(5000);
    expect(failures[0].kind).toBe('ice');
  });

  it('ICE state "failed" -> ice, immediately', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    await link.handleSignal({ kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } });
    pc.setIce('failed');
    expect(failures[0].kind).toBe('ice');
  });

  it('ICE connected but the channel never opens -> datachannel', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    await link.handleSignal({ kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } });
    pc.setIce('connected');
    vi.advanceTimersByTime(5000);
    expect(failures[0].kind).toBe('datachannel');
  });

  it('channel closes before opening -> datachannel', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    pc.channel.onclose();
    expect(failures[0].kind).toBe('datachannel');
  });

  it('an opened channel cancels the timeout and a later close is not a failure', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    const closed = vi.fn();
    link.on('close', closed);
    pc.channel.open();
    vi.advanceTimersByTime(10000);
    expect(failures).toEqual([]);
    expect(link.send('x')).toBe(true);
    pc.channel.onclose();
    expect(failures).toEqual([]);
    expect(closed).toHaveBeenCalledTimes(1);
  });
});

