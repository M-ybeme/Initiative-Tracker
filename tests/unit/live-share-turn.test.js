import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  handleTurnCredentialRequest,
  issueTurnServers,
  sanitizeTurnServers,
  isAllowedOrigin,
  TURN_CREDENTIAL_TTL_SECONDS,
} from '../../relay/turn-credentials.mjs';
import {
  resolveIceServers,
  parseTurnCredentials,
  turnCredentialsUrl,
  hasTurnServer,
  TURN_UNAVAILABLE_MESSAGE,
} from '../../js/modules/live-share/ice-config.js';
import { DEFAULT_ICE_SERVERS } from '../../js/modules/live-share/config.js';
import { DEV_ALLOWED_ORIGINS } from '../../relay/node-relay.mjs';

const ORIGINS = 'https://dnddmtoolbox.netlify.app,http://localhost:3000';
const SITE = 'https://dnddmtoolbox.netlify.app';

// The shape Cloudflare's generate-ice-servers endpoint returns (docs, 2026), port-53 URL included.
function cloudflareBody(username = 'cf-user-123', credential = 'cf-secret-credential') {
  return {
    iceServers: [
      { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
      {
        urls: [
          'turn:turn.cloudflare.com:3478?transport=udp',
          'turn:turn.cloudflare.com:53?transport=udp',
          'turn:turn.cloudflare.com:3478?transport=tcp',
          'turn:turn.cloudflare.com:80?transport=tcp',
          'turns:turn.cloudflare.com:5349?transport=tcp',
          'turns:turn.cloudflare.com:443?transport=tcp',
        ],
        username,
        credential,
      },
    ],
  };
}

function fakeFetch(status, body) {
  return vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'function' ? body() : body) }));
}

const CF_ENV = { TURN_KEY_ID: 'key-id-abc', TURN_KEY_API_TOKEN: 'super-secret-api-token' };

describe('TURN credential endpoint (relay/turn-credentials.mjs, shared by both relays)', () => {
  it('mints Cloudflare credentials with the key secrets, a bounded TTL and no port 53', async () => {
    const fetchImpl = fakeFetch(201, cloudflareBody());
    const res = await handleTurnCredentialRequest({ method: 'GET', origin: SITE }, CF_ENV, { allowedOrigins: ORIGINS, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://rtc.live.cloudflare.com/v1/turn/keys/key-id-abc/credentials/generate-ice-servers');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer super-secret-api-token');
    expect(JSON.parse(init.body)).toEqual({ ttl: TURN_CREDENTIAL_TTL_SECONDS });
    expect(TURN_CREDENTIAL_TTL_SECONDS).toBeLessThanOrEqual(4 * 60 * 60);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(SITE);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = JSON.parse(res.body);
    expect(body.ttlSeconds).toBe(TURN_CREDENTIAL_TTL_SECONDS);
    expect(body.iceServers).toEqual([
      {
        urls: [
          'turn:turn.cloudflare.com:3478?transport=udp',
          'turn:turn.cloudflare.com:3478?transport=tcp',
          'turn:turn.cloudflare.com:80?transport=tcp',
          'turns:turn.cloudflare.com:5349?transport=tcp',
          'turns:turn.cloudflare.com:443?transport=tcp',
        ],
        username: 'cf-user-123',
        credential: 'cf-secret-credential',
      },
    ]);
  });

  it('never puts the TURN key or API token in any response', async () => {
    for (const fetchImpl of [fakeFetch(201, cloudflareBody()), fakeFetch(401, { error: 'bad token super-secret-api-token' }), vi.fn(async () => { throw new Error('super-secret-api-token'); })]) {
      const res = await handleTurnCredentialRequest({ method: 'GET', origin: SITE }, CF_ENV, { allowedOrigins: ORIGINS, fetchImpl, log: () => {} });
      expect(res.body).not.toContain('super-secret-api-token');
      expect(res.body).not.toContain('key-id-abc');
    }
  });

  it('refuses other origins and requests without an Origin, before contacting the provider', async () => {
    for (const origin of ['https://evil.example', 'https://dnddmtoolbox.netlify.app.evil.example', undefined, '']) {
      const fetchImpl = fakeFetch(201, cloudflareBody());
      const res = await handleTurnCredentialRequest({ method: 'GET', origin }, CF_ENV, { allowedOrigins: ORIGINS, fetchImpl });
      expect(res.status).toBe(403);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it('allows only GET', async () => {
    const fetchImpl = fakeFetch(201, cloudflareBody());
    const res = await handleTurnCredentialRequest({ method: 'POST', origin: SITE }, CF_ENV, { allowedOrigins: ORIGINS, fetchImpl });
    expect(res.status).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('answers 503 turn-not-configured when no secret is set', async () => {
    const res = await handleTurnCredentialRequest({ method: 'GET', origin: SITE }, {}, { allowedOrigins: ORIGINS, fetchImpl: fakeFetch(201, {}) });
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({ error: 'turn-not-configured' });
    expect(res.headers['access-control-allow-origin']).toBe(SITE); // readable, so the page can say why
  });

  it.each([
    ['a provider error status', fakeFetch(500, { errors: ['internal detail'] })],
    ['an unreachable provider', vi.fn(async () => { throw new Error('ENOTFOUND'); })],
    ['malformed provider JSON', fakeFetch(201, () => { throw new SyntaxError('bad json'); })],
    ['a response with no TURN entries', fakeFetch(201, { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] })],
  ])('answers 502 turn-unavailable, with no provider detail, for %s', async (_label, fetchImpl) => {
    const log = vi.fn();
    const res = await handleTurnCredentialRequest({ method: 'GET', origin: SITE }, CF_ENV, { allowedOrigins: ORIGINS, fetchImpl, log });
    expect(res.status).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'turn-unavailable' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).not.toContain('super-secret-api-token');
  });

  it('serves a fixed development TURN server from DEV_TURN_* when no Cloudflare key is set', async () => {
    const env = { DEV_TURN_URLS: 'turn:127.0.0.1:3479?transport=udp, turn:127.0.0.1:3479?transport=tcp', DEV_TURN_USERNAME: 'dev', DEV_TURN_CREDENTIAL: 'devpass' };
    expect(await issueTurnServers(env)).toEqual([
      { urls: ['turn:127.0.0.1:3479?transport=udp', 'turn:127.0.0.1:3479?transport=tcp'], username: 'dev', credential: 'devpass' },
    ]);
    // Cloudflare secrets take precedence when both are set.
    const fetchImpl = fakeFetch(201, cloudflareBody());
    await issueTurnServers({ ...env, ...CF_ENV }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('keeps only well-formed TURN entries', () => {
    expect(
      sanitizeTurnServers([
        { urls: 'turn:ok.example:3478', username: 'u', credential: 'c' },
        { urls: 'turn:no-credential.example:3478', username: 'u' },
        { urls: ['stun:stun.example:3478', 'https://x.example', 'turn:bad host:3478'], username: 'u', credential: 'c' },
        { urls: 'turn:long.example:3478', username: 'u', credential: 'x'.repeat(600) },
        null,
      ])
    ).toEqual([{ urls: ['turn:ok.example:3478'], username: 'u', credential: 'c' }]);
    expect(sanitizeTurnServers('nope')).toEqual([]);
  });

  it('matches origins exactly', () => {
    expect(isAllowedOrigin(SITE, ORIGINS)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000', ORIGINS)).toBe(true);
    expect(isAllowedOrigin('http://localhost:30000', ORIGINS)).toBe(false);
    expect(isAllowedOrigin(SITE, '')).toBe(false);
  });

  it("the Node relay's default origins are the development origins in wrangler.toml", () => {
    const toml = readFileSync('relay/cloudflare/wrangler.toml', 'utf8');
    const allowed = /ALLOWED_ORIGINS\s*=\s*"([^"]+)"/.exec(toml)[1].split(',');
    expect(DEV_ALLOWED_ORIGINS.split(',')).toEqual(allowed.filter((o) => o.startsWith('http://localhost')));
    // No TURN secret is configured in wrangler.toml; it must come from Wrangler secrets.
    expect(toml).not.toMatch(/TURN_KEY_ID|TURN_KEY_API_TOKEN/);
  });
});

describe('browser ICE server resolution (js/modules/live-share/ice-config.js)', () => {
  const RELAY = 'wss://relay.example.workers.dev';
  const TURN = { urls: ['turn:turn.example:3478?transport=udp', 'turns:turn.example:5349?transport=tcp'], username: 'u1', credential: 'c1' };

  it('derives the credential URL from the relay URL', () => {
    expect(turnCredentialsUrl('wss://relay.example.workers.dev')).toBe('https://relay.example.workers.dev/turn-credentials');
    expect(turnCredentialsUrl('ws://localhost:8788')).toBe('http://localhost:8788/turn-credentials');
  });

  it('adds TURN servers after the STUN list, fetching without cookies or caching', async () => {
    const fetchImpl = fakeFetch(200, { iceServers: [TURN], ttlSeconds: 14400 });
    const { iceServers, turn } = await resolveIceServers({ relayUrl: RELAY, fetchImpl });
    expect(iceServers).toEqual([...DEFAULT_ICE_SERVERS, TURN]);
    expect(turn).toEqual({ configured: true, status: 'available', message: 'TURN relay available as a fallback.' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://relay.example.workers.dev/turn-credentials');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', credentials: 'omit' });
    expect(JSON.stringify(turn)).not.toContain('c1'); // the status object never carries credentials
  });

  it('falls back to STUN only, as "not-configured", on a 503', async () => {
    const { iceServers, turn } = await resolveIceServers({ relayUrl: RELAY, fetchImpl: fakeFetch(503, { error: 'turn-not-configured' }) });
    expect(iceServers).toEqual(DEFAULT_ICE_SERVERS);
    expect(turn).toMatchObject({ configured: false, status: 'not-configured' });
  });

  it.each([
    ['a failed request', vi.fn(async () => { throw new TypeError('Failed to fetch'); })],
    ['an error status', fakeFetch(502, { error: 'turn-unavailable' })],
    ['a 403', fakeFetch(403, { error: 'origin-not-allowed' })],
    ['malformed JSON', fakeFetch(200, () => { throw new SyntaxError('bad'); })],
    ['a body without iceServers', fakeFetch(200, { hello: 'world' })],
    ['TURN entries without credentials', fakeFetch(200, { iceServers: [{ urls: TURN.urls }] })],
    ['non-TURN URLs only', fakeFetch(200, { iceServers: [{ urls: ['stun:x:3478', 'javascript:alert(1)'], username: 'u', credential: 'c' }] })],
  ])('falls back to STUN only, without throwing, on %s', async (_label, fetchImpl) => {
    const result = await resolveIceServers({ relayUrl: RELAY, fetchImpl });
    expect(result.iceServers).toEqual(DEFAULT_ICE_SERVERS);
    expect(result.turn).toEqual({ configured: false, status: 'unavailable', message: TURN_UNAVAILABLE_MESSAGE });
  });

  it('gives up after the timeout and continues STUN-only', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
      const pending = resolveIceServers({ relayUrl: RELAY, fetchImpl, timeoutMs: 5000 });
      await vi.advanceTimersByTimeAsync(5000);
      expect((await pending).turn.status).toBe('unavailable');
    } finally {
      vi.useRealTimers();
    }
  });

  it('validates the credential response shape', () => {
    expect(parseTurnCredentials({ iceServers: [TURN] })).toEqual({ ok: true, servers: [TURN] });
    expect(parseTurnCredentials(null).ok).toBe(false);
    expect(parseTurnCredentials({ iceServers: 'x' }).ok).toBe(false);
    expect(parseTurnCredentials({ iceServers: [{ ...TURN, credential: 5 }] }).ok).toBe(false);
  });

  it('tells whether a server list includes TURN', () => {
    expect(hasTurnServer(DEFAULT_ICE_SERVERS)).toBe(false);
    expect(hasTurnServer([...DEFAULT_ICE_SERVERS, TURN])).toBe(true);
    expect(hasTurnServer(undefined)).toBe(false);
  });
});
