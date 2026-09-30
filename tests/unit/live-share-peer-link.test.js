// PeerLink's failure classification (signaling vs ICE vs data channel) and negotiation handling,
// with a scripted stand-in for RTCPeerConnection. The real WebRTC path is covered end to end by
// tests/e2e/live-share-networking.spec.js.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PeerLink, BUFFERED_LOW_WATER_BYTES } from '../../js/modules/live-share/peer-link.js';

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


describe('PeerLink ICE candidate lifecycle', () => {
  const localCandidate = (typ, n = 1) => ({ candidate: `candidate:${n} 1 udp 100 x.local 5000 typ ${typ}`, sdpMid: '0', sdpMLineIndex: 0 });
  const remote = (typ, n = 1) => ({ kind: 'candidate', candidate: { candidate: `candidate:${n} 1 udp 100 x 6000 typ ${typ}`, sdpMid: '0', sdpMLineIndex: 0 } });
  const offer = { kind: 'description', description: { type: 'offer', sdp: 'v=0 offer' } };

  it('counts and sends every local candidate, by type, and does not send the end-of-candidates marker', async () => {
    const { link, sent, pc } = makeLink('host');
    await link.start();
    sent.length = 0;
    pc.onicecandidate({ candidate: localCandidate('host', 1) });
    pc.onicecandidate({ candidate: localCandidate('host', 2) });
    pc.onicecandidate({ candidate: localCandidate('srflx', 3) });
    pc.onicecandidate({ candidate: null });
    expect(sent).toHaveLength(3);
    expect(sent.every((s) => s.kind === 'candidate')).toBe(true);
    expect(link.diagnostics().candidates).toMatchObject({
      localGenerated: 3,
      localSent: 3,
      localGatheringComplete: true,
      localTypes: { host: 2, srflx: 1 },
    });
    expect(link.failure).toBeNull();
    link.close();
  });

  it('does not count a candidate as sent when the relay refuses it', async () => {
    const link = new PeerLink({ role: 'host', sendSignal: () => false, RTCPeerConnectionImpl: FakePC });
    const pc = FakePC.last;
    pc.onicecandidate({ candidate: localCandidate('host') });
    expect(link.diagnostics().candidates).toMatchObject({ localGenerated: 1, localSent: 0 });
    expect(link.diagnostics().candidates.lastError).toMatch(/could not be sent/);
    link.close();
  });

  it('a browser that gathers no candidates fails at once as "no-candidates", not as a timeout', async () => {
    const { link, failures, pc } = makeLink('host');
    await link.start();
    pc.onicecandidate({ candidate: null });
    expect(failures).toHaveLength(1);
    expect(failures[0].kind).toBe('no-candidates');
    expect(failures[0].message).toMatch(/gathered no network candidates/);
    expect(link.closed).toBe(true);
  });

  it('gathering state "complete" with no candidates is also caught, and reported once', async () => {
    const { link, failures, pc } = makeLink('player');
    await link.start();
    pc.iceGatheringState = 'complete';
    pc.onicegatheringstatechange();
    pc.onicecandidate({ candidate: null });
    expect(failures.map((f) => f.kind)).toEqual(['no-candidates']);
    link.close();
  });

  it('queues candidates that arrive before the remote description and applies each exactly once after it', async () => {
    const { link, pc } = makeLink('player');
    await link.start();
    await link.handleSignal(remote('host', 1));
    await link.handleSignal(remote('srflx', 2));
    expect(pc.added).toEqual([]);
    expect(link.diagnostics().candidates).toMatchObject({ remoteReceived: 2, remoteQueued: 2, remoteApplied: 0, remotePending: 2 });

    await link.handleSignal(offer);
    expect(pc.added.map((c) => c.candidate)).toEqual([remote('host', 1).candidate.candidate, remote('srflx', 2).candidate.candidate]);
    expect(link.diagnostics().candidates).toMatchObject({ remoteApplied: 2, remotePending: 0 });

    await link.handleSignal(remote('srflx', 3)); // after the description: applied directly
    expect(pc.added).toHaveLength(3);
    expect(link.diagnostics().candidates).toMatchObject({
      remoteReceived: 3,
      remoteQueued: 2,
      remoteApplied: 3,
      remoteApplyErrors: 0,
      remotePending: 0,
      remoteTypes: { host: 1, srflx: 2 },
    });
    expect(link.diagnostics().remoteDescriptionSet).toBe(true);
    link.close();
  });

  it('a candidate arriving while setRemoteDescription is still in progress is queued and applied once', async () => {
    const { link, pc } = makeLink('player');
    await link.start();
    let finishSRD;
    pc.setRemoteDescription = (d) =>
      new Promise((resolve) => {
        finishSRD = () => {
          pc.remoteDescription = d;
          resolve();
        };
      });
    const describing = link.handleSignal(offer);
    await link.handleSignal(remote('srflx', 7)); // SRD has not finished yet
    expect(pc.added).toEqual([]);
    finishSRD();
    await describing;
    expect(pc.added.map((c) => c.candidate)).toEqual([remote('srflx', 7).candidate.candidate]);
    expect(link.diagnostics().candidates).toMatchObject({ remoteQueued: 1, remoteApplied: 1, remotePending: 0 });
    link.close();
  });

  it('counts an addIceCandidate failure, keeps its error, and carries on with the next candidate', async () => {
    const { link, pc, failures } = makeLink('player');
    await link.start();
    await link.handleSignal(offer);
    const realAdd = pc.addIceCandidate.bind(pc);
    pc.addIceCandidate = async (c) => {
      if (c.candidate.includes('typ host')) throw Object.assign(new Error('bad candidate'), { name: 'OperationError' });
      return realAdd(c);
    };
    await link.handleSignal(remote('host', 1));
    await link.handleSignal(remote('srflx', 2));
    expect(link.diagnostics().candidates).toMatchObject({ remoteReceived: 2, remoteApplied: 1, remoteApplyErrors: 1 });
    expect(link.diagnostics().candidates.lastError).toBe('addIceCandidate failed: OperationError: bad candidate');
    expect(failures).toEqual([]);
    link.close();
  });

  it('does not apply candidates after the link is closed', async () => {
    const { link, pc } = makeLink('player');
    await link.start();
    await link.handleSignal(offer);
    link.close();
    await link.handleSignal(remote('srflx'));
    expect(pc.added).toEqual([]);
  });

  describe('timeout message says which step of the candidate path stalled', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function answeredHost() {
      const made = makeLink('host');
      await made.link.start();
      made.pc.onicecandidate({ candidate: localCandidate('host') });
      await made.link.handleSignal({ kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } });
      return made;
    }

    it('no candidates received from the other side', async () => {
      const { failures } = await answeredHost();
      vi.advanceTimersByTime(5000);
      expect(failures[0].kind).toBe('ice');
      expect(failures[0].message).toMatch(/received no network candidates from the player/);
    });

    it('candidates received but none applied', async () => {
      const { link, pc, failures } = await answeredHost();
      pc.addIceCandidate = async () => {
        throw new Error('nope');
      };
      await link.handleSignal(remote('srflx'));
      vi.advanceTimersByTime(5000);
      expect(failures[0].message).toMatch(/received 1 candidates from the player but none could be applied \(addIceCandidate failed: Error: nope\)/);
    });

    it('candidates exchanged but ICE never connected: the network needs TURN', async () => {
      const { link, pc, failures } = await answeredHost();
      await link.handleSignal(remote('srflx'));
      pc.iceConnectionState = 'checking';
      vi.advanceTimersByTime(5000);
      expect(failures[0].kind).toBe('ice');
      expect(failures[0].message).toMatch(/candidates were exchanged.*\(ICE state: checking\).*TURN/);
    });
  });
});

describe('PeerLink selected candidate pair and TURN use', () => {
  const TURN = { urls: ['turn:turn.example:3478?transport=udp'], username: 'u', credential: 'c' };

  // getStats() as Chrome reports it: the transport names the selected pair.
  function chromeStats(localType, remoteType, { relayProtocol = 'udp', protocol = 'udp' } = {}) {
    return new Map([
      ['T1', { type: 'transport', selectedCandidatePairId: 'P1' }],
      ['P1', { type: 'candidate-pair', localCandidateId: 'L1', remoteCandidateId: 'R1', state: 'succeeded' }],
      ['L1', { type: 'local-candidate', candidateType: localType, protocol, relayProtocol: localType === 'relay' ? relayProtocol : undefined, address: '203.0.113.7' }],
      ['R1', { type: 'remote-candidate', candidateType: remoteType, protocol, address: '198.51.100.9' }],
    ]);
  }

  // Firefox: no selectedCandidatePairId; the pair itself is marked selected.
  function firefoxStats(localType, remoteType) {
    return new Map([
      ['P0', { type: 'candidate-pair', localCandidateId: 'L0', remoteCandidateId: 'R0', state: 'failed' }],
      ['P1', { type: 'candidate-pair', localCandidateId: 'L1', remoteCandidateId: 'R1', state: 'succeeded', selected: true }],
      ['L0', { type: 'local-candidate', candidateType: 'relay', protocol: 'udp' }],
      ['R0', { type: 'remote-candidate', candidateType: 'relay', protocol: 'udp' }],
      ['L1', { type: 'local-candidate', candidateType: localType, protocol: 'udp' }],
      ['R1', { type: 'remote-candidate', candidateType: remoteType, protocol: 'udp' }],
    ]);
  }

  async function connectedWith(stats, iceServers) {
    const link = new PeerLink({ role: 'host', sendSignal: () => true, RTCPeerConnectionImpl: FakePC, ...(iceServers ? { iceServers } : {}) });
    const pc = FakePC.last;
    pc.getStats = async () => stats;
    pc.connectionState = 'connected';
    pc.onconnectionstatechange();
    await new Promise((r) => setTimeout(r, 0));
    const snapshot = link.diagnostics();
    link.close();
    return snapshot;
  }

  it.each([
    ['host', 'host', false],
    ['srflx', 'srflx', false],
    ['prflx', 'srflx', false],
    ['host', 'prflx', false],
    ['relay', 'srflx', true],
    ['srflx', 'relay', true],
    ['relay', 'relay', true],
  ])('local %s / remote %s -> usingTurnRelay %s', async (local, remote, relayed) => {
    const d = await connectedWith(chromeStats(local, remote), [TURN]);
    expect(d).toMatchObject({ localCandidateType: local, remoteCandidateType: remote, usingTurnRelay: relayed, turnConfigured: true });
    expect(d.turnTransport).toBe(local === 'relay' ? 'udp' : null);
  });

  it('reports how this browser reaches the TURN server (tcp / tls)', async () => {
    expect((await connectedWith(chromeStats('relay', 'host', { relayProtocol: 'tls' }), [TURN])).turnTransport).toBe('tls');
    expect((await connectedWith(chromeStats('relay', 'host', { relayProtocol: 'tcp' }), [TURN])).turnTransport).toBe('tcp');
  });

  it("uses Firefox's selected pair, not a failed relay pair", async () => {
    expect(await connectedWith(firefoxStats('host', 'srflx'), [TURN])).toMatchObject({ localCandidateType: 'host', remoteCandidateType: 'srflx', usingTurnRelay: false });
  });

  it('TURN being configured does not make usingTurnRelay true; no stats means unknown, not relayed', async () => {
    const d = await connectedWith(new Map(), [TURN]);
    expect(d).toMatchObject({ turnConfigured: true, usingTurnRelay: false, localCandidateType: null });
  });

  it('turnConfigured is false with STUN-only servers', async () => {
    expect((await connectedWith(chromeStats('host', 'host'))).turnConfigured).toBe(false);
  });

  it('keeps addresses and credentials out of the diagnostics', async () => {
    const text = JSON.stringify(await connectedWith(chromeStats('relay', 'relay'), [TURN]));
    expect(text).not.toMatch(/203\.0\.113\.7|198\.51\.100\.9/);
    expect(text).not.toContain('"c"');
    expect(text).not.toContain('credential');
  });

  it('passes the ICE servers and policy to RTCPeerConnection, defaulting to "all" (direct paths preferred)', () => {
    const link = new PeerLink({ role: 'host', sendSignal: () => true, RTCPeerConnectionImpl: FakePC, iceServers: [TURN] });
    expect(FakePC.last.config).toEqual({ iceServers: [TURN], iceTransportPolicy: 'all' });
    link.close();
  });
});

describe('PeerLink sending and backpressure (Milestone 2)', () => {
  async function openHost() {
    const { link, pc } = makeLink('host');
    await link.start();
    pc.channel.open();
    return { link, channel: pc.channel };
  }

  it('sends only on an open channel', async () => {
    const { link, pc } = makeLink('host');
    await link.start();
    expect(link.send('early')).toBe(false);
    pc.channel.open();
    expect(link.send('now')).toBe(true);
    expect(pc.channel.sent).toEqual(['now']);
    link.close();
  });

  it('reports a send the channel refuses as not sent, instead of throwing', async () => {
    const { link, channel } = await openHost();
    channel.send = () => {
      throw new Error('OperationError: message too large');
    };
    expect(link.send('x')).toBe(false);
    link.close();
  });

  it('exposes the buffered amount and emits drain when the channel falls to the low-water mark', async () => {
    const { link, channel } = await openHost();
    expect(channel.bufferedAmountLowThreshold).toBe(BUFFERED_LOW_WATER_BYTES);
    channel.bufferedAmount = 300000;
    expect(link.bufferedAmount()).toBe(300000);
    const drained = vi.fn();
    link.on('drain', drained);
    channel.onbufferedamountlow();
    expect(drained).toHaveBeenCalledTimes(1);
    link.off('drain', drained);
    channel.onbufferedamountlow();
    expect(drained).toHaveBeenCalledTimes(1);
    link.close();
    expect(link.bufferedAmount()).toBe(0);
  });
});
