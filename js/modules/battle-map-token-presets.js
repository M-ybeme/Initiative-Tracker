/**
 * The Battle Map's built-in token images (2.3.30), with a stable id for each.
 *
 * One list for everyone who needs it:
 *   - battlemap.html builds its preset dropdown from it (a placed preset token stores `src` as its
 *     imgSrc, exactly as before);
 *   - the player-safe projection (battle-map-share-state.js) names a visible token's built-in image
 *     by `presetIdForSrc(imgSrc)` instead of sending any URL;
 *   - the Live Share player (battlemap-view.js, via live-share-dev.js) turns an id back into an
 *     image with `presetSrc(id)`. Only these same-origin paths can ever be loaded that way: an id
 *     that is not in this list is unknown and the token stays a marker. No URL from the wire is ever
 *     fetched.
 *
 * Ids are part of the Live Share wire format: never rename or reuse one (add new presets instead).
 *
 * Classic script like battle-map-share-state.js: publishes globalThis.BattleMapTokenPresets. The
 * player imports it for that side effect. If it is loaded twice the first instance wins.
 */
(function (root) {
  'use strict';
  if (root.BattleMapTokenPresets) return;

  const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // the wire format of a preset id
  const MAX_ID = 40;

  const player = (id, name, file) => ({ id: `player-${id}`, group: 'players', name, src: `/images/playerTokens/${file}` });
  const enemy = (id, name, file) => ({ id: `enemy-${id}`, group: 'enemies', name, src: `/images/enemyTokens/${file}` });

  const PRESETS = Object.freeze(
    [
      player('artificer', 'Artificer', 'PlayerArtificerToken.png'),
      player('barbarian', 'Barbarian', 'PlayerBarbarianToken.png'),
      player('bard', 'Bard', 'PlayerBardToken.png'),
      player('blood-hunter', 'Blood Hunter', 'PlayerBloodHunterToken.png'),
      player('cleric', 'Cleric', 'PlayerClericToken.png'),
      player('druid', 'Druid', 'PlayerDruidToken.png'),
      player('fighter', 'Fighter', 'PlayerFighterToken.png'),
      player('monk', 'Monk', 'PlayerMonkToken.png'),
      player('paladin', 'Paladin', 'PlayerPaladinToken.png'),
      player('ranger', 'Ranger', 'PlayerRangerToken.png'),
      player('rogue', 'Rogue', 'PlayerRogueToken.png'),
      player('sorcerer', 'Sorcerer', 'PlayerSorcererToken.png'),
      player('warlock', 'Warlock', 'PlayerWarlockToken.png'),
      player('wizard', 'Wizard', 'PlayerWizardToken.png'),
      enemy('aberration', 'Aberration', 'EnemyAberationToken.png'),
      enemy('beast', 'Beast', 'EnemyBeastToken.png'),
      enemy('celestial', 'Celestial', 'EnemyCelestialToken.png'),
      enemy('construct', 'Construct', 'EnemyConstructToken.png'),
      enemy('dragon', 'Dragon', 'EnemyDragonToken.png'),
      enemy('elemental', 'Elemental', 'EnemyElementalToken.png'),
      enemy('fey', 'Fey', 'EnemyFeyToken.png'),
      enemy('fiend', 'Fiend', 'EnemyFiendToken.png'),
      enemy('giant', 'Giant', 'EnemyGiantToken.png'),
      enemy('humanoid', 'Humanoid', 'EnemyHumanoidToken.png'),
      enemy('monstrosity', 'Monstrosity', 'EnemyMonstrosityToken.png'),
      enemy('ooze', 'Ooze', 'EnemyOozeToken.png'),
      enemy('plant', 'Plant', 'EnemyPlantToken.png'),
      enemy('undead', 'Undead', 'EnemyUndeadToken.png'),
    ].map(Object.freeze)
  );

  const byId = new Map(PRESETS.map((p) => [p.id, p]));
  const bySrc = new Map(PRESETS.map((p) => [p.src, p]));

  /** The preset id of a token image source, or null. Exact match on the stored path only. */
  function presetIdForSrc(src) {
    const p = typeof src === 'string' ? bySrc.get(src) : undefined;
    return p ? p.id : null;
  }

  /** The same-origin image path of a known preset id, or null for anything else. */
  function presetSrc(id) {
    const p = typeof id === 'string' ? byId.get(id) : undefined;
    return p ? p.src : null;
  }

  /** Whether `v` has the wire format of a preset id (known or not). */
  const isPresetIdFormat = (v) => typeof v === 'string' && v.length <= MAX_ID && ID.test(v);

  root.BattleMapTokenPresets = Object.freeze({ PRESETS, MAX_ID, presetIdForSrc, presetSrc, isPresetIdFormat });
})(globalThis);
