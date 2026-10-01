// An in-memory RTCPeerConnection pair for Node integration tests (Node has no WebRTC). Two
// MemoryPCs are joined once an offer and its answer have crossed the (real) relay; the data channel
// then delivers text and binary messages in order, asynchronously, like the real one.
//
// `createMemoryWebRTC({ bytesPerMs })` optionally models a link of limited bandwidth: sent messages
// queue up (bufferedAmount grows), drain at that rate in order, and `bufferedamountlow` fires when
// the queue falls to bufferedAmountLowThreshold, as in a browser. Without it, delivery is immediate.
// With `oneMessagePerTask` (on a rate-limited link; without one every message already arrives in a
// task of its own), a drain delivers at most one message, dropping the rest of its budget, so
// consecutive messages always arrive in separate tasks (as with fine-grained timers): an ordering
// that otherwise depends on the platform's timer resolution happens every time.

export function createMemoryWebRTC({ bytesPerMs = null, oneMessagePerTask = false } = {}) {
  const offers = new Map(); // offer id -> player PC
  let nextOffer = 1;

  class MemoryChannel {
    constructor(label) {
      this.label = label;
      this.readyState = 'connecting';
      this.bufferedAmount = 0;
      this.bufferedAmountLowThreshold = 0;
      this.binaryType = 'arraybuffer';
      this.peer = null;
      this.sent = [];
      this.queue = [];
      this.timer = null;
    }
    send(data) {
      if (this.readyState !== 'open') throw new Error('InvalidStateError');
      this.sent.push(data);
      // A copy, as the network would deliver (the sender may reuse its buffer).
      const copy = typeof data === 'string' ? data : data instanceof ArrayBuffer ? data.slice(0) : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      if (bytesPerMs === null) {
        setTimeout(() => this.deliver(copy), 0);
        return;
      }
      const size = typeof data === 'string' ? data.length : copy.byteLength;
      this.queue.push({ data: copy, left: size });
      this.bufferedAmount += size;
      if (this.timer === null) {
        this.lastDrain = Date.now();
        this.timer = setInterval(() => this.drain(), 1);
      }
    }
    drain() {
      // By elapsed time, not per tick: timers fire far less often than every 1 ms on some systems.
      const now = Date.now();
      let budget = bytesPerMs * (now - this.lastDrain);
      this.lastDrain = now;
      while (this.queue.length && budget > 0) {
        const head = this.queue[0];
        const take = Math.min(head.left, budget);
        head.left -= take;
        budget -= take;
        const before = this.bufferedAmount;
        this.bufferedAmount -= take;
        if (head.left === 0) {
          this.queue.shift();
          this.deliver(head.data);
          if (oneMessagePerTask) budget = 0;
        }
        if (before > this.bufferedAmountLowThreshold && this.bufferedAmount <= this.bufferedAmountLowThreshold && this.onbufferedamountlow) this.onbufferedamountlow();
      }
      if (!this.queue.length) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
    deliver(data) {
      const peer = this.peer;
      if (peer && peer.readyState === 'open' && peer.onmessage) peer.onmessage({ data });
    }
    close() {
      if (this.readyState === 'closed') return;
      this.readyState = 'closed';
      if (this.timer !== null) clearInterval(this.timer);
      this.onclose && this.onclose();
      if (this.peer) this.peer.close();
    }
    open() {
      this.readyState = 'open';
      this.onopen && this.onopen();
    }
  }

  class MemoryPC {
    constructor() {
      this.connectionState = 'new';
      this.iceConnectionState = 'new';
      this.iceGatheringState = 'new';
      this.signalingState = 'stable';
      this.localDescription = null;
      this.remoteDescription = null;
    }
    createDataChannel(label) {
      this.channel = new MemoryChannel(label);
      return this.channel;
    }
    async createOffer() {
      this.offerId = `offer-${nextOffer++}`;
      return { type: 'offer', sdp: `v=0 ${this.offerId}` };
    }
    async createAnswer() {
      return { type: 'answer', sdp: `v=0 answer-to ${this.offerId}` };
    }
    async setLocalDescription(d) {
      this.localDescription = d;
    }
    async setRemoteDescription(d) {
      this.remoteDescription = d;
      const id = d.sdp.match(/offer-\d+/)[0];
      if (d.type === 'offer') {
        this.offerId = id;
        offers.set(id, this);
      } else {
        this.connect(offers.get(id));
      }
    }
    async addIceCandidate() {}
    async getStats() {
      return new Map();
    }
    close() {
      this.connectionState = 'closed';
    }
    // Host side, once the answer is in: the player's side of the channel appears, then both open.
    connect(player) {
      const mine = this.channel;
      const theirs = new MemoryChannel(mine.label);
      mine.peer = theirs;
      theirs.peer = mine;
      for (const pc of [this, player]) {
        pc.connectionState = pc.iceConnectionState = 'connected';
        pc.onconnectionstatechange && pc.onconnectionstatechange();
      }
      setTimeout(() => {
        player.ondatachannel({ channel: theirs });
        theirs.open();
        mine.open();
      }, 0);
    }
  }

  return { MemoryPC };
}

export async function until(check, timeoutMs = 3000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 5));
  }
}
