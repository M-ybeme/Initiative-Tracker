/**
 * Live Share host session: one room on the relay and one PeerLink per player who joins it.
 *
 * This is the host flow of the Milestone 0 prototype, without any page UI, so the prototype page
 * (js/live-share-dev.js) and the Battle Map (js/battlemap-live-share.js) share it. It moves no
 * session content itself: the page decides what to send when a player's link opens.
 *
 *   start()   generate a room id, register it with the relay; returns the room id
 *   end()     close the relay connection first (players hear "host ended the session"), then links
 *
 * Every player gets freshly fetched TURN credentials before its PeerLink is created; the player
 * sends nothing until the host's offer, so nothing is missed meanwhile.
 *
 * Events (on(type, fn)):
 *   state        {state}          signaling state
 *   ready                         the room is registered
 *   closed       {error}          the relay connection closed (error null after end())
 *   peer-joined  {peerId}         a player reached the room; its link is being prepared
 *   turn         {turn}           TURN availability for the connection being prepared (no credentials)
 *   peer-link    {peerId, link}   the player's PeerLink exists; subscribe, it starts right after
 *   peer-left    {peerId}         the player left the relay; its link is closed
 */
import { generateRoomId } from './room-id.js';
import { SignalingClient } from './signaling-client.js';
import { PeerLink } from './peer-link.js';
import { resolveIceServers } from './ice-config.js';

export class HostSession {
  constructor({
    relayUrl,
    linkOptions = {},
    resolveIce = () => resolveIceServers({ relayUrl }),
    createSignaling = (options) => new SignalingClient(options),
    createLink = (options) => new PeerLink(options),
  }) {
    this.relayUrl = relayUrl;
    this.linkOptions = linkOptions;
    this.resolveIce = resolveIce;
    this.createSignaling = createSignaling;
    this.createLink = createLink;
    this.signaling = null;
    this.roomId = null;
    this.peers = new Map(); // peerId -> { link }
    this.listeners = new Map();
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }

  emit(type, detail) {
    for (const fn of this.listeners.get(type) || []) fn(detail);
  }

  get active() {
    return !!this.signaling && this.signaling.state !== 'closed';
  }

  start() {
    if (this.active) throw new Error('HostSession already started');
    this.roomId = generateRoomId();
    const signaling = this.createSignaling({ relayUrl: this.relayUrl, roomId: this.roomId, role: 'host' });
    this.signaling = signaling;
    signaling.on('state', ({ state }) => this.emit('state', { state }));
    signaling.on('ready', () => this.emit('ready'));
    signaling.on('peer-joined', ({ peerId }) => this.addPeer(peerId));
    signaling.on('peer-left', ({ peerId }) => this.dropPeer(peerId));
    signaling.on('signal', ({ from, data }) => {
      const entry = this.peers.get(from);
      if (entry && entry.link) entry.link.handleSignal(data);
    });
    signaling.on('closed', ({ error }) => {
      if (error) for (const peerId of [...this.peers.keys()]) this.dropPeer(peerId);
      this.emit('closed', { error });
    });
    signaling.connect();
    return this.roomId;
  }

  async addPeer(peerId) {
    const entry = { link: null };
    this.peers.set(peerId, entry);
    this.emit('peer-joined', { peerId });
    const { iceServers, turn } = await this.resolveIce();
    this.emit('turn', { turn });
    const session = this.signaling;
    if (this.peers.get(peerId) !== entry || !session || session.state !== 'ready') return; // left or ended meanwhile
    const link = this.createLink({ role: 'host', sendSignal: (data) => session.sendSignal(data, peerId), iceServers, ...this.linkOptions });
    entry.link = link;
    this.emit('peer-link', { peerId, link });
    link.start();
  }

  dropPeer(peerId) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    this.peers.delete(peerId);
    if (entry.link) entry.link.close();
    this.emit('peer-left', { peerId });
  }

  end() {
    if (!this.signaling) return;
    // Close the relay first so players get "host ended the session" rather than a bare channel close.
    this.signaling.close();
    for (const peerId of [...this.peers.keys()]) this.dropPeer(peerId);
  }
}
