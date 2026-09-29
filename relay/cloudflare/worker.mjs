/**
 * Deployed Live Share signaling relay: Cloudflare Worker + one Durable Object per room.
 *
 * The Worker validates the request and routes it to the room's Durable Object (named by room id);
 * the Durable Object holds that room's WebSockets and runs the shared room logic in
 * ../room-core.mjs, exactly as the local Node relay does.
 *
 * Milestone 0 keeps room state in memory and uses plain (non-hibernating) WebSockets: a room
 * lives only while its sockets are open, which is all signaling needs. Hibernation, room
 * lifetime/grace periods and connection-attempt limits are later milestones (7 and 8).
 *
 * `GET /turn-credentials` is a separate, stateless route (../turn-credentials.mjs): it mints
 * short-lived Cloudflare Realtime TURN credentials from the TURN_KEY_ID / TURN_KEY_API_TOKEN Wrangler
 * secrets. It never touches the Durable Objects, and TURN traffic itself never passes through here.
 */
import { RelayRoom, parseRoomRequest } from '../room-core.mjs';
import { handleTurnCredentialRequest, isAllowedOrigin } from '../turn-credentials.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok', { headers: { 'access-control-allow-origin': '*' } });
    }
    if (url.pathname === '/turn-credentials') {
      const { status, headers, body } = await handleTurnCredentialRequest(
        { method: request.method, origin: request.headers.get('Origin') },
        env,
        { allowedOrigins: env.ALLOWED_ORIGINS, log: (reason) => console.warn(`turn-credentials: ${reason}`) }
      );
      return new Response(body, { status, headers });
    }

    const parsed = parseRoomRequest(url);
    if (!parsed) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    if (!isAllowedOrigin(request.headers.get('Origin'), env.ALLOWED_ORIGINS)) {
      return new Response('Origin not allowed', { status: 403 });
    }

    const stub = env.ROOMS.get(env.ROOMS.idFromName(parsed.roomId));
    return stub.fetch(request);
  },
};

// isAllowedOrigin: browsers always send Origin on WebSocket upgrades and cross-origin fetches. This
// stops other websites from using the relay from their visitors' browsers; it is not
// authentication (non-browser clients can set it).

export class RelayRoomObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = new RelayRoom();
  }

  async fetch(request) {
    const parsed = parseRoomRequest(new URL(request.url));
    if (!parsed) return new Response('Not found', { status: 404 });

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const conn = {
      send: (text) => server.send(text),
      close: (code, reason) => server.close(code, reason),
    };
    const cleanup = () => this.room.leave(conn);
    server.addEventListener('message', (event) => this.room.receive(conn, event.data));
    server.addEventListener('close', () => {
      cleanup();
      // Complete the closing handshake (older compatibility dates do not reply automatically).
      try {
        server.close(1000, 'closed');
      } catch {}
    });
    server.addEventListener('error', cleanup);
    this.room.join(conn, parsed.role);

    return new Response(null, { status: 101, webSocket: client });
  }
}
