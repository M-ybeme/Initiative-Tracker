/**
 * Live Share Milestone 5A.2: only one session host per browser profile.
 *
 * The session host page (live-share.html) owns the room and every player connection
 * (docs/live-share-session-host-architecture.md §5.1, §5.2). Two such pages in one browser must never
 * both own a room, so ownership is an exclusive Web Lock (navigator.locks), which the browser holds
 * for the page until it is released or the page goes away (closed, reloaded, crashed).
 *
 *   claimSessionHost({ onOwned, onBusy, onUnsupported })
 *     onOwned({ takeover })  this page is the session host. `takeover` is true when it waited because
 *                            another tab owned the lock, and got it when that tab let go.
 *     onBusy()               another tab owns it now. This page waits in the lock's queue; it does
 *                            not start anything, and becomes the owner only when the lock is free.
 *     onUnsupported(error)   no Web Locks here: fail closed, never act as an owner.
 *   Returns { owned, release() }. release() gives the lock up (not needed on unload: the browser
 *   frees it with the page).
 *
 * Holding the lock is only the right to start a room; it starts nothing by itself.
 */
export const SESSION_HOST_LOCK = 'dmtoolbox.live-share.session-host';

export function claimSessionHost({
  onOwned = () => {},
  onBusy = () => {},
  onUnsupported = () => {},
  locks = typeof navigator !== 'undefined' ? navigator.locks : undefined,
  name = SESSION_HOST_LOCK,
} = {}) {
  let owned = false;
  let release = () => {};
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const own = (takeover) => {
    owned = true;
    onOwned({ takeover });
    return held; // the lock stays held until release() (or the page goes away)
  };

  if (!locks || typeof locks.request !== 'function') {
    onUnsupported(new Error('Web Locks are not available in this browser'));
    return { get owned() { return false; }, release() {} };
  }

  locks
    .request(name, { ifAvailable: true }, (lock) => {
      if (lock) return own(false);
      onBusy();
      // Wait for the current owner to let go; then this page may host (it still starts nothing).
      locks.request(name, () => own(true)).catch((err) => onUnsupported(err));
      return undefined;
    })
    .catch((err) => onUnsupported(err));

  return {
    get owned() {
      return owned;
    },
    release: () => release(),
  };
}
