/**
 * Live Share Milestone 5B.1: a bounded attempt limiter for admission (planning doc §9, §22: "the DM's
 * browser throttles repeated failures, per connection and overall").
 *
 * Fixed windows per key: a key may record at most `limit` attempts per `windowMs`; after that,
 * allowed(key) is false until its window ends. Time comes from `now()` (no timers; a clock that went
 * backwards ends the window rather than stretching it), and the
 * number of tracked keys is capped (`maxKeys`): when full, the key whose window started first is
 * forgotten, so a flood of fresh keys (new peer ids) cannot grow memory. The global limiter is the
 * same thing with one key, which is what stops a flood of fresh keys from getting unlimited tries.
 *
 * Host-side session protection only: relay-side limits are Milestone 8.
 */

export function createAttemptLimiter({ limit, windowMs, maxKeys = 64, now = () => Date.now() }) {
  if (!(Number.isSafeInteger(limit) && limit >= 1 && windowMs > 0 && Number.isSafeInteger(maxKeys) && maxKeys >= 1)) {
    throw new Error('bad limiter configuration');
  }
  const windows = new Map(); // key -> { start, count }

  const current = (key) => {
    const w = windows.get(key);
    const t = now();
    if (w && (t - w.start >= windowMs || t < w.start)) {
      windows.delete(key);
      return null;
    }
    return w || null;
  };

  return {
    /** Whether `key` may make another attempt now. */
    allowed(key) {
      const w = current(key);
      return !w || w.count < limit;
    },
    /** Count one attempt for `key`. */
    record(key) {
      let w = current(key);
      if (!w) {
        if (windows.size >= maxKeys) {
          let oldest = null;
          for (const [k, v] of windows) if (!oldest || v.start < oldest[1].start) oldest = [k, v];
          windows.delete(oldest[0]);
        }
        w = { start: now(), count: 0 };
        windows.set(key, w);
      }
      w.count += 1;
    },
    clear() {
      windows.clear();
    },
    get size() {
      return windows.size;
    },
  };
}
