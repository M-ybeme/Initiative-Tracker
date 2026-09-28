/**
 * Local Live Share signaling relay for development and Playwright tests.
 *
 * Same wire protocol and room logic as the deployed Cloudflare relay (both use room-core.mjs).
 *
 *   node relay/node-relay.mjs [--port 8787]
 *
 * GET /health answers "ok"; WebSocket upgrades go to /rooms/<roomId>?role=host|peer.
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { RelayRoom, RELAY_LIMITS, parseRoomRequest } from './room-core.mjs';

// `host` defaults to all interfaces (dual-stack), so both localhost/::1 and a phone on the same
// Wi-Fi can reach a development relay.
export function startRelay({ port = 8787, host, limits = RELAY_LIMITS } = {}) {
  const rooms = new Map(); // roomId -> RelayRoom

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
      return res.end('ok');
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portArg = process.argv.indexOf('--port');
  const port = portArg > -1 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT) || 8787;
  startRelay({ port }).then(({ port: actual }) => {
    console.log(`Live Share relay listening on ws://localhost:${actual}`);
  });
}
