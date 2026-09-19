/**
 * Harness that runs the REAL js/initiative.js (a classic, DOM-bound script) inside happy-dom, using
 * the real initiative.html body as the fixture. Bootstrap and Sortable are stubbed; nothing else is.
 *
 * The dice engine is loaded first, the way initiative.html loads /js/modules/dice-engine.js before
 * initiative.js.
 */
import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bodyHtml = (() => {
  const html = readFileSync(resolve(process.cwd(), 'initiative.html'), 'utf8');
  return html
    .slice(html.indexOf('<body'), html.lastIndexOf('</body>'))
    .replace(/^<body[^>]*>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
})();

export const alertCalls = [];

function installGlobals() {
  alertCalls.length = 0;
  const stub = () => ({ show() {}, hide() {}, dispose() {}, option() {} });
  const factory = () => ({ getOrCreateInstance: stub, getInstance: stub });
  globalThis.bootstrap = {
    Modal: factory(),
    Offcanvas: factory(),
    Tooltip: factory(),
    Toast: class {
      static getOrCreateInstance() { return stub(); }
      show() {}
      hide() {}
    }
  };
  globalThis.Sortable = class { option() {} };
  globalThis.RULES_DATA = [{ cat: 'Test', items: [] }];
  globalThis.SPELLS_DATA = [];
  window.alert = globalThis.alert = msg => alertCalls.push(msg);
  window.prompt = globalThis.prompt = () => '2';
  window.confirm = () => true;
}

// The script attaches listeners to `window` and `document`; record them so the previous instance can
// be detached, otherwise earlier instances keep reacting to later tests' events.
let trackerListeners = [];
function detachPreviousTracker() {
  trackerListeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
  trackerListeners = [];
}
async function importTracker() {
  const targets = [window, document];
  const ownDescriptors = targets.map(t => Object.getOwnPropertyDescriptor(t, 'addEventListener'));
  const originals = targets.map(t => t.addEventListener);
  targets.forEach((t, i) => {
    Object.defineProperty(t, 'addEventListener', {
      configurable: true,
      writable: true,
      value: function (type, fn, opts) {
        trackerListeners.push([t, type, fn, opts]);
        return originals[i].call(this, type, fn, opts);
      }
    });
  });
  try {
    await import('../../js/initiative.js');
  } finally {
    targets.forEach((t, i) => {
      if (ownDescriptors[i]) Object.defineProperty(t, 'addEventListener', ownDescriptors[i]);
      else delete t.addEventListener;
    });
  }
}

export function makeChar(id, name, initiative, extra = {}) {
  return {
    id, name, type: 'Enemy', initiative,
    currentHP: 20, maxHP: 20, tempHP: 0, ac: 12, notes: '',
    concentration: false, deathSaves: { s: 0, f: 0, stable: false },
    status: [], concDamagePending: 0,
    ...extra
  };
}

export async function loadTracker(characters = [], currentTurn = 0) {
  detachPreviousTracker();
  localStorage.clear();
  localStorage.setItem('initiativeHelpSeen', '1');
  localStorage.setItem(
    'initiativeTrackerData',
    JSON.stringify({ characters, currentTurn, combatRound: 1 })
  );
  document.body.innerHTML = bodyHtml;
  installGlobals();
  vi.resetModules();
  await import('../../js/modules/dice-engine.js'); // what <script src="/js/modules/dice-engine.js"> does
  await importTracker();
}
