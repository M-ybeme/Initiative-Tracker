/**
 * Local Live Share signaling relay for development and Playwright tests.
 *
 * Same wire protocol and room logic as the deployed Cloudflare relay (both use room-core.mjs).
 *
 *   node relay/node-relay.mjs [--port 8787]
 *
 * GET /health answers "ok"; WebSocket upgrades go to /rooms/<roomId>?role=host|peer.
 * GET /turn-credentials is the same TURN credential endpoint as the Cloudflare relay
 * (turn-credentials.mjs). It reads TURN_KEY_ID/TURN_KEY_API_TOKEN (real Cloudflare TURN) or
 * DEV_TURN_URLS/DEV_TURN_USERNAME/DEV_TURN_CREDENTIAL (a local TURN server) from the environment;
 * with neither it answers 503 and browsers continue STUN-only. LIVE_SHARE_ALLOWED_ORIGINS overrides
 * the page origins it serves (default: the development origins in cloudflare/wrangler.toml).
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { RelayRoom, RELAY_LIMITS, parseRoomRequest } from './room-core.mjs';
import { handleTurnCredentialRequest } from './turn-credentials.mjs';

// The development origins of cloudflare/wrangler.toml's ALLOWED_ORIGINS (a unit test checks they agree).
export const DEV_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3100';

// `host` defaults to all interfaces (dual-stack), so both localhost/::1 and a phone on the same
// Wi-Fi can reach a development relay.
export function startRelay({
  port = 8787,
  host,
  limits = RELAY_LIMITS,
  turnEnv = process.env,
  allowedOrigins = process.env.LIVE_SHARE_ALLOWED_ORIGINS || DEV_ALLOWED_ORIGINS,
  fetchImpl = globalThis.fetch,
} = {}) {
  const rooms = new Map(); // roomId -> RelayRoom

  const server = http.createServer((req, res) => {
    const path = String(req.url || '').split('?')[0];
    if (path === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
      return res.end('ok');
    }
    if (path === '/turn-credentials') {
      handleTurnCredentialRequest({ method: req.method, origin: req.headers.origin }, turnEnv, {
        allowedOrigins,
        fetchImpl,
        log: (reason) => console.warn(`turn-credentials: ${reason}`),
      }).then(({ status, headers, body }) => res.writeHead(status, headers).end(body));
      return;
    }
    res.writeHead(404).end();
  });

  // maxPayload makes ws drop oversized frames itself (close 1009) before buffering them whole.
  const wss = new WebSocketServer({ noServer: true, maxPayload: limits.maxMessageBytes * 2 });

  server.on('upgrade', (req, socket, head) => {
    // Node removes its own socket error handler on upgrade; without one, a reset on this socket
    // would be an uncaught 'error' event and end the process.
    socket.on('error', () => socket.destroy());
    let parsed = null;
    try {
      parsed = parseRoomRequest(new URL(req.url, 'http://relay.local'));
    } catch {
      // A malformed request target (e.g. "GET http://[/") makes new URL() throw.
    }
    if (!parsed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      let room = rooms.get(parsed.roomId);
      if (!room) {
        room = new RelayRoom({ limits });
        rooms.set(parsed.roomId, room);
      }
      const conn = {
        send: (text) => ws.send(text),
        close: (code, reason) => ws.close(code, reason),
      };
      const cleanup = () => {
        room.leave(conn);
        if (room.isEmpty && rooms.get(parsed.roomId) === room) rooms.delete(parsed.roomId);
      };
      ws.on('message', (data, isBinary) => room.receive(conn, isBinary ? data : data.toString('utf8')));
      ws.on('close', cleanup);
      ws.on('error', cleanup);
      if (!room.join(conn, parsed.role) && room.isEmpty) rooms.delete(parsed.roomId);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      resolve({
        port: server.address().port,
        rooms,
        close: () =>
          new Promise((done) => {
            for (const client of wss.clients) client.terminate();
            wss.close();
            server.close(() => done());
          }),
      });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portArg = process.argv.indexOf('--port');
  const port = portArg > -1 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT) || 8787;
  startRelay({ port }).then(({ port: actual }) => {
    console.log(`Live Share relay listening on ws://localhost:${actual}`);
  });
}
