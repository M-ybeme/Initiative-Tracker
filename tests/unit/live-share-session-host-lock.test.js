// Live Share Milestone 5A.2: one session host per browser profile
// (js/modules/live-share/session-host-lock.js), against a small fake of the Web Locks API with the
// same semantics: exclusive, `ifAvailable` answers null when held, other requests queue in order, and
// a lock is held until the callback's promise settles.
import { describe, it, expect, vi } from 'vitest';
import { claimSessionHost, SESSION_HOST_LOCK } from '../../js/modules/live-share/session-host-lock.js';

function fakeLocks() {
  const held = new Map(); // name -> true
  const queues = new Map(); // name -> [grant]
  const grant = (name, cb) => {
    held.set(name, true);
    return Promise.resolve(cb({ name, mode: 'exclusive' })).finally(() => {
      held.delete(name);
      const next = (queues.get(name) || []).shift();
      if (next) next();
    });
  };
  return {
    request(name, options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
      if (!held.get(name)) return grant(name, cb);
      if (options.ifAvailable) return Promise.resolve(cb(null));
      return new Promise((resolve, reject) => {
        if (!queues.has(name)) queues.set(name, []);
        queues.get(name).push(() => grant(name, cb).then(resolve, reject));
      });
    },
    isHeld: (name) => !!held.get(name),
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('session host lock', () => {
  it('uses one fixed lock name', () => {
    expect(SESSION_HOST_LOCK).toBe('dmtoolbox.live-share.session-host');
  });

  it('the first page owns the session host and keeps the lock until it releases it', async () => {
    const locks = fakeLocks();
    const onOwned = vi.fn();
    const first = claimSessionHost({ locks, onOwned });
    await flush();
    expect(onOwned).toHaveBeenCalledWith({ takeover: false });
    expect(first.owned).toBe(true);
    expect(locks.isHeld(SESSION_HOST_LOCK)).toBe(true);
    first.release();
    await flush();
    expect(locks.isHeld(SESSION_HOST_LOCK)).toBe(false);
  });

  it('a second page is told Live Share is already running, owns nothing, and starts nothing', async () => {
    const locks = fakeLocks();
    claimSessionHost({ locks });
    await flush();
    const onOwned = vi.fn();
    const onBusy = vi.fn();
    const second = claimSessionHost({ locks, onOwned, onBusy });
    await flush();
    expect(onBusy).toHaveBeenCalledTimes(1);
    expect(onOwned).not.toHaveBeenCalled();
    expect(second.owned).toBe(false);
  });

  it('when the owner lets go, the waiting page becomes the owner (a takeover), never both at once', async () => {
    const locks = fakeLocks();
    const first = claimSessionHost({ locks });
    await flush();
    const onOwned = vi.fn();
    const second = claimSessionHost({ locks, onOwned });
    const third = claimSessionHost({ locks });
    await flush();
    expect(second.owned).toBe(false);
    first.release();
    await flush();
    expect(onOwned).toHaveBeenCalledWith({ takeover: true });
    expect(second.owned).toBe(true);
    expect(third.owned).toBe(false); // still queued behind the second
    expect([first, second, third].filter((c) => c.owned && c !== first)).toHaveLength(1);
  });

  it('fails closed without Web Locks: never owner', () => {
    const onUnsupported = vi.fn();
    const onOwned = vi.fn();
    const claim = claimSessionHost({ locks: undefined, onOwned, onUnsupported });
    expect(onUnsupported).toHaveBeenCalledTimes(1);
    expect(onOwned).not.toHaveBeenCalled();
    expect(claim.owned).toBe(false);
  });

  it('fails closed when the lock request itself fails', async () => {
    const onUnsupported = vi.fn();
    const onOwned = vi.fn();
    const claim = claimSessionHost({ locks: { request: () => Promise.reject(new Error('SecurityError')) }, onOwned, onUnsupported });
    await flush();
    expect(onUnsupported).toHaveBeenCalledTimes(1);
    expect(onOwned).not.toHaveBeenCalled();
    expect(claim.owned).toBe(false);
  });
});
