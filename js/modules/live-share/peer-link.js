/**
 * Live Share peer link: one RTCPeerConnection + RTCDataChannel between the host and one player.
 *
 * The host creates the data channel and the offer; the player answers. Negotiation messages go
 * out through `sendSignal` (the relay) and come back through handleSignal(), with ICE candidates
 * trickled both ways and queued until the remote description is set.
 *
 * Failures are classified so the diagnostics can say what went wrong (planning doc §23):
 *   signaling    the other side never answered through the relay
 *   negotiation  an offer/answer/candidate was rejected by the browser
 *   ice          both sides negotiated, but no network path worked (often needs TURN, Milestone 8)
 *   datachannel  ICE connected but the data channel never opened (or closed before opening)
 *   no-candidates  this browser gathered no ICE candidates at all, so no connection is possible;
 *                  almost always a browser setting, extension or policy that blocks WebRTC
 *
 * The ICE candidate lifecycle is counted on both sides (generated -> sent -> received -> queued ->
 * applied), so a stalled connection shows which step stopped. Counts and candidate *types* only.
 *
 * Diagnostics contain connection states and candidate *types* only, never IP addresses.
 *
 * Events: open, message {data}, close, failed {kind, message}, diagnostics {snapshot}
 */
import { DEFAULT_ICE_SERVERS } from './config.js';
import { hasTurnServer } from './ice-config.js';
import { describeSignal, candidateSignal, parseSignalData } from './protocol.js';

export const DATA_CHANNEL_LABEL = 'live-share';

export class PeerLink {
  constructor({
    role,
    sendSignal,
    iceServers = DEFAULT_ICE_SERVERS,
    iceTransportPolicy = 'all',
    connectTimeoutMs = 20000,
    RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  }) {
    this.role = role; // 'host' | 'player'
    this.sendSignal = sendSignal;
    this.connectTimeoutMs = connectTimeoutMs;
    this.listeners = new Map();
    this.channel = null;
    this.pendingCandidates = [];
    this.closed = false;
    this.opened = false;
    this.failure = null;
    this.stage = 'new'; // new -> offered/answered -> connected
    this.turnConfigured = hasTurnServer(iceServers);
    this.candidateTypes = { local: null, remote: null, protocol: null, relayProtocol: null };
    this.candidates = {
      localGenerated: 0,
      localSent: 0,
      localGatheringComplete: false,
      localTypes: {}, // e.g. { host: 2, srflx: 2 }
      remoteReceived: 0,
      remoteQueued: 0,
      remoteApplied: 0,
      remoteApplyErrors: 0,
      remoteTypes: {},
      lastError: null,
    };

    this.pc = new RTCPeerConnectionImpl({ iceServers, iceTransportPolicy });
    this.pc.onicecandidate = (event) => this.onLocalCandidate(event.candidate);
    const report = () => this.emitDiagnostics();
    this.pc.onsignalingstatechange = report;
    this.pc.onicegatheringstatechange = () => {
      if (this.pc.iceGatheringState === 'complete') this.onGatheringComplete();
      report();
    };
    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'failed') {
        this.fail('ice', 'ICE failed: no network path between the two browsers worked. A TURN relay may be required on this network.');
      }
      report();
    };
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'connected') this.readSelectedCandidates();
      report();
    };
    if (role === 'player') {
      this.pc.ondatachannel = (event) => {
        if (event.channel.label === DATA_CHANNEL_LABEL && !this.channel) this.attachChannel(event.channel);
      };
    }
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }

  emit(type, detail) {
    for (const fn of this.listeners.get(type) || []) fn(detail);
  }

  onLocalCandidate(candidate) {
    // A null candidate (or, in some browsers, an empty string) marks the end of gathering. It is
    // not sent: the other side needs no end-of-candidates signal for a data channel.
    if (!candidate || !candidate.candidate) return this.onGatheringComplete();
    const c = this.candidates;
    c.localGenerated += 1;
    const type = candidateType(candidate.candidate);
    c.localTypes[type] = (c.localTypes[type] || 0) + 1;
    if (this.sendSignal(candidateSignal(candidate)) !== false) c.localSent += 1;
    else c.lastError = 'a local candidate could not be sent: the relay connection is not open';
    this.emitDiagnostics();
  }

  onGatheringComplete() {
    const c = this.candidates;
    if (c.localGatheringComplete || this.closed) return;
    c.localGatheringComplete = true;
    if (c.localGenerated === 0) {
      this.fail('no-candidates', 'This browser gathered no network candidates, so it cannot connect to anyone. WebRTC is being blocked here, usually by an extension (VPN or "WebRTC leak" protection), a privacy setting (e.g. Brave shields) or a managed policy.');
    }
    this.emitDiagnostics();
  }

  /** Begin negotiating. The host sends the offer; the player waits for it. */
  async start() {
    this.timer = setTimeout(() => this.onConnectTimeout(), this.connectTimeoutMs);
    if (this.role !== 'host') return;
    this.attachChannel(this.pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true }));
    try {
      await this.pc.setLocalDescription(await this.pc.createOffer());
      this.stage = 'offered';
      this.sendSignal(describeSignal(this.pc.localDescription));
    } catch (err) {
      this.fail('negotiation', `Could not create an offer: ${err && err.message}`);
    }
    this.emitDiagnostics();
  }

  /** Handle a negotiation payload relayed from the other side (untrusted). */
  async handleSignal(data) {
    if (this.closed) return;
    const parsed = parseSignalData(data);
    if (!parsed.ok) {
      this.lastProtocolError = parsed.error;
      this.emitDiagnostics();
      return;
    }
    const { signal } = parsed;
    try {
      if (signal.kind === 'description') {
        const expected = this.role === 'host' ? 'answer' : 'offer';
        if (signal.description.type !== expected) {
          this.lastProtocolError = `unexpected ${signal.description.type}`;
          return;
        }
        await this.pc.setRemoteDescription(signal.description);
        if (this.role === 'player') {
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          this.sendSignal(describeSignal(this.pc.localDescription));
        }
        this.stage = 'answered';
        const queued = this.pendingCandidates.splice(0);
        for (const candidate of queued) await this.addCandidate(candidate);
      } else {
        const c = this.candidates;
        c.remoteReceived += 1;
        const type = candidateType(signal.candidate.candidate);
        c.remoteTypes[type] = (c.remoteTypes[type] || 0) + 1;
        if (!this.pc.remoteDescription) {
          // Too early to apply; the description handler above flushes these exactly once.
          c.remoteQueued += 1;
          this.pendingCandidates.push(signal.candidate);
        } else {
          await this.addCandidate(signal.candidate);
        }
      }
    } catch (err) {
      this.fail('negotiation', `WebRTC negotiation failed: ${err && err.message}`);
    }
    this.emitDiagnostics();
  }

  async addCandidate(candidate) {
    if (this.closed) return;
    try {
      await this.pc.addIceCandidate(candidate);
      this.candidates.remoteApplied += 1;
    } catch (err) {
      // One unusable candidate is not fatal (ICE fails on its own if none work), but it is counted
      // and its error kept, never swallowed.
      this.candidates.remoteApplyErrors += 1;
      this.candidates.lastError = `addIceCandidate failed: ${(err && err.name) || 'Error'}: ${err && err.message}`;
    }
  }

  attachChannel(channel) {
    this.channel = channel;
    channel.onopen = () => {
      this.opened = true;
      this.stage = 'connected';
      clearTimeout(this.timer);
      this.emitDiagnostics();
      this.emit('open');
    };
    channel.onmessage = (event) => this.emit('message', { data: event.data });
    channel.onclose = () => {
      this.emitDiagnostics();
      if (!this.closed) {
        if (!this.opened) this.fail('datachannel', 'The data channel closed before it opened.');
        this.close();
      }
    };
  }

  send(text) {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    this.channel.send(text);
    return true;
  }

  onConnectTimeout() {
    if (this.opened || this.closed) return;
    const ice = this.pc.iceConnectionState;
    if (this.stage === 'new' || this.stage === 'offered') {
      const waitingFor = this.role === 'host' ? 'an answer from the player' : 'an offer from the host';
      this.fail('signaling', `Timed out waiting for ${waitingFor} through the relay.`);
    } else if (ice === 'connected' || ice === 'completed') {
      this.fail('datachannel', `ICE connected, but the data channel did not open within ${Math.round(this.connectTimeoutMs / 1000)}s.`);
    } else {
      const c = this.candidates;
      const other = this.role === 'host' ? 'player' : 'host';
      const secs = Math.round(this.connectTimeoutMs / 1000);
      let message;
      if (c.remoteReceived === 0) {
        message = `No connection within ${secs}s: received no network candidates from the ${other} (ICE state: ${ice}). The ${other}'s browser may be blocking WebRTC; its diagnostics will show 0 generated candidates.`;
      } else if (c.remoteApplied === 0) {
        message = `No connection within ${secs}s: received ${c.remoteReceived} candidates from the ${other} but none could be applied (${c.lastError || 'no error reported'}).`;
      } else {
        message = `Negotiation finished and candidates were exchanged, but no connection was made within ${secs}s (ICE state: ${ice}). A TURN relay may be required on this network.`;
      }
      this.fail('ice', message);
    }
  }

  fail(kind, message) {
    if (this.closed || this.failure) return;
    this.failure = { kind, message };
    this.emitDiagnostics();
    this.emit('failed', this.failure);
    this.close();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    try {
      if (this.channel) this.channel.close();
    } catch {}
    try {
      this.pc.close();
    } catch {}
    this.emitDiagnostics();
    this.emit('close');
  }

  async readSelectedCandidates() {
    try {
      const stats = await this.pc.getStats();
      let pair = null;
      stats.forEach((s) => {
        if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId);
      });
      if (!pair) {
        // Firefox does not report selectedCandidatePairId on the transport.
        stats.forEach((s) => {
          if (s.type === 'candidate-pair' && s.state === 'succeeded' && (s.selected || s.nominated)) pair = pair || s;
        });
      }
      if (!pair) return;
      const local = stats.get(pair.localCandidateId);
      const remote = stats.get(pair.remoteCandidateId);
      this.candidateTypes = {
        local: local ? local.candidateType : null,
        remote: remote ? remote.candidateType : null,
        protocol: local ? local.protocol : null,
        // For a relay candidate: how this browser reaches the TURN server (udp, tcp or tls).
        relayProtocol: local && local.candidateType === 'relay' ? local.relayProtocol || null : null,
      };
      this.emitDiagnostics();
    } catch {}
  }

  diagnostics() {
    const pc = this.pc;
    return {
      role: this.role,
      stage: this.stage,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState,
      dataChannelState: this.channel ? this.channel.readyState : 'none',
      localCandidateType: this.candidateTypes.local,
      remoteCandidateType: this.candidateTypes.remote,
      transportProtocol: this.candidateTypes.protocol,
      // From the selected candidate pair in getStats(), never from configuration alone.
      usingTurnRelay: this.candidateTypes.local === 'relay' || this.candidateTypes.remote === 'relay',
      turnConfigured: this.turnConfigured,
      turnTransport: this.candidateTypes.relayProtocol,
      remoteDescriptionSet: !!pc.remoteDescription,
      candidates: {
        ...this.candidates,
        localTypes: { ...this.candidates.localTypes },
        remoteTypes: { ...this.candidates.remoteTypes },
        remotePending: this.pendingCandidates.length,
      },
      failure: this.failure,
      lastProtocolError: this.lastProtocolError || null,
    };
  }

  emitDiagnostics() {
    this.emit('diagnostics', { snapshot: this.diagnostics() });
  }
}

/** The `typ` of an ICE candidate line (host / srflx / prflx / relay), without its address. */
export function candidateType(line) {
  const match = /\btyp (host|srflx|prflx|relay)\b/.exec(String(line));
  return match ? match[1] : 'unknown';
}
