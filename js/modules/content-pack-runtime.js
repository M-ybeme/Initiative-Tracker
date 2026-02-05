/**
 * @typedef {Window & typeof globalThis & {
 *   LevelUpData?: {
 *     CLASS_DATA?: Record<string, unknown>;
 *     SUBCLASS_DATA?: Record<string, unknown>;
 *     FEATS?: Record<string, unknown>;
 *     BACKGROUND_DATA?: Record<string, unknown>;
 *     CLASS_EQUIPMENT_CHOICES?: Record<string, unknown>;
 *     DEFAULT_CLASS_EQUIPMENT?: Record<string, unknown>;
 *     RACE_DATA?: Record<string, unknown>;
 *     SUBRACE_DATA?: Record<string, unknown>;
 *     FIGHTING_STYLE_DATA?: Record<string, unknown>;
 *     PACT_BOON_DATA?: Record<string, unknown>;
 *     ELDRITCH_INVOCATION_DATA?: Record<string, unknown>;
 *     METAMAGIC_DATA?: Record<string, unknown>;
 *   };
 *   SRD_CONTENT_ALLOWLIST?: Record<string, string[]>;
 *   SPELLS_DATA?: Array<Record<string, unknown>>;
 *   SRDContentFilter?: {
 *     allowlist?: Record<string, Set<string>>;
 *   };
 * }} SRDWindow
 */

/** @type {SRDWindow | undefined} */
const runtimeWindow = typeof window !== 'undefined' ? /** @type {SRDWindow} */ (window) : undefined;

function safeClone(value) {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeStringArray(input) {
  if (!input && input !== 0) {
    return undefined;
  }
  const source = Array.isArray(input) ? input : [input];
  const entries = source
    .map((value) => (typeof value === 'string' ? value.trim() : String(value || '')).trim())
    .filter(Boolean);
  return entries.length ? entries : undefined;
}

function parseHitDieValue(raw) {
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const match = String(raw).match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function normalizeFeaturesMap(features = {}) {
  const normalized = {};
  Object.entries(features || {}).forEach(([level, entries]) => {
    const list = Array.isArray(entries) ? entries : [entries];
    const cleaned = list
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry || '')).trim())
      .filter(Boolean);
    const key = Number(level);
    const targetKey = Number.isFinite(key) ? key : level;
    normalized[targetKey] = cleaned;
  });
  return normalized;
}

function normalizeClassPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const normalized = safeClone(payload) || {};

  if (normalized.hitDice && normalized.hitDie == null) {
    const parsed = parseHitDieValue(normalized.hitDice);
    if (parsed) {
      normalized.hitDie = parsed;
    }
  } else if (typeof normalized.hitDie === 'string') {
    const parsed = parseHitDieValue(normalized.hitDie);
    if (parsed) {
      normalized.hitDie = parsed;
    }
  }
  delete normalized.hitDice;

  if (normalized.primaryAbility && !Array.isArray(normalized.primaryAbility)) {
    const abilities = normalizeStringArray(normalized.primaryAbility);
    if (abilities) {
      normalized.primaryAbility = abilities;
    }
  }

  if (normalized.featuresByLevel && !normalized.features) {
    normalized.features = normalizeFeaturesMap(normalized.featuresByLevel);
  }
  delete normalized.featuresByLevel;

  return normalized;
}

function normalizeSubclassPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const normalized = safeClone(payload) || {};
  if (normalized.featuresByLevel && !normalized.features) {
    normalized.features = normalizeFeaturesMap(normalized.featuresByLevel);
  } else if (normalized.features) {
    normalized.features = normalizeFeaturesMap(normalized.features);
  }
  delete normalized.featuresByLevel;
  if (!normalized.features || typeof normalized.features !== 'object') {
    normalized.features = {};
  }
  return normalized;
}

function captureBaseline() {
  if (!runtimeWindow) {
    return null;
  }
  const levelData = runtimeWindow.LevelUpData || {};
  return {
    allowlist: safeClone(runtimeWindow.SRD_CONTENT_ALLOWLIST || {}),
    spells: safeClone(runtimeWindow.SPELLS_DATA || []),
    classData: safeClone(levelData.CLASS_DATA || {}),
    subclassData: safeClone(levelData.SUBCLASS_DATA || {}),
    feats: safeClone(levelData.FEATS || {}),
    backgrounds: safeClone(levelData.BACKGROUND_DATA || {}),
    classEquipmentChoices: safeClone(levelData.CLASS_EQUIPMENT_CHOICES || {}),
    defaultClassEquipment: safeClone(levelData.DEFAULT_CLASS_EQUIPMENT || {}),
    raceData: safeClone(levelData.RACE_DATA || {}),
    subraceData: safeClone(levelData.SUBRACE_DATA || {}),
    fightingStyleData: safeClone(levelData.FIGHTING_STYLE_DATA || {}),
    pactBoonData: safeClone(levelData.PACT_BOON_DATA || {}),
    eldritchInvocationData: safeClone(levelData.ELDRITCH_INVOCATION_DATA || {}),
    metamagicData: safeClone(levelData.METAMAGIC_DATA || {})
  };
}

let baseline = null;

function shouldRefreshBaseline(snapshot) {
  if (!runtimeWindow) {
    return false;
  }
  if (!snapshot) {
    return true;
  }
  const spellsLoaded = Array.isArray(runtimeWindow.SPELLS_DATA) && runtimeWindow.SPELLS_DATA.length > 0;
  const snapshotEmpty = !Array.isArray(snapshot.spells) || snapshot.spells.length === 0;
  return spellsLoaded && snapshotEmpty;
}

function getBaselineSnapshot() {
  if (!baseline || shouldRefreshBaseline(baseline)) {
    baseline = captureBaseline();
  }
  return baseline;
}

function ensureAllowlistValue(buckets, type, value) {
  if (typeof value !== 'string') {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  if (!buckets[type]) {
    buckets[type] = new Set();
  }
  buckets[type].add(trimmed);
}

function addClassDerivativeAllowlists(buckets, classId) {
  if (typeof classId !== 'string') {
    return;
  }
  const trimmed = classId.trim();
  if (!trimmed) {
    return;
  }
  ensureAllowlistValue(buckets, 'class-starting-gold', `class-starting-gold:${trimmed}`);
  ensureAllowlistValue(buckets, 'class-equipment-choice', `class-equip-choice:${trimmed}`);
  ensureAllowlistValue(buckets, 'class-equipment-default', `class-equip-default:${trimmed}`);
}

function addRecordIdsToAllowlist(buckets, recordsByType = {}) {
  const addFromRecords = (type, afterAdd) => {
    (recordsByType[type] || []).forEach((record) => {
      if (record?.operation === 'remove') {
        return;
      }
      ensureAllowlistValue(buckets, type, record?.id);
      if (typeof afterAdd === 'function') {
        afterAdd(record);
      }
    });
  };
  addFromRecords('class', (record) => addClassDerivativeAllowlists(buckets, record?.id));
  [
    'subclass', 'feat', 'background', 'spell', 'race',
    'subrace', 'fighting-style', 'pact-boon', 'eldritch-invocation', 'metamagic'
  ].forEach((type) => addFromRecords(type));
}

function mergeAllowlists(base = {}, additions = {}, recordsByType = {}) {
  const merged = {};
  const addEntries = (source = {}) => {
    Object.entries(source).forEach(([type, values]) => {
      if (!Array.isArray(values)) {
        return;
      }
      values.forEach((value) => {
        ensureAllowlistValue(merged, type, value);
      });
    });
  };
  addEntries(base);
  addEntries(additions);
  addRecordIdsToAllowlist(merged, recordsByType);
  return Object.fromEntries(
    Object.entries(merged).map(([type, set]) => [type, Array.from(set)])
  );
}

function syncFilterAllowlist(allowlist) {
  if (!runtimeWindow) {
    return;
  }
  const filter = runtimeWindow.SRDContentFilter;
  if (!filter || !filter.allowlist) {
    return;
  }
  Object.values(filter.allowlist).forEach((set) => {
    if (set?.clear) {
      set.clear();
    }
  });
  Object.entries(allowlist).forEach(([type, values]) => {
    if (!Array.isArray(values)) {
      return;
    }
    if (!filter.allowlist[type]) {
      filter.allowlist[type] = new Set();
    }
    values.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        filter.allowlist[type].add(value.trim());
      }
    });
  });
}

function applyAllowlist(allowlist) {
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.SRD_CONTENT_ALLOWLIST = allowlist;
  syncFilterAllowlist(allowlist);
}

function normalizeSpellPayload(payload, fallbackId) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const normalized = { ...payload };
  if (!normalized.title && fallbackId) {
    normalized.title = fallbackId;
  }
  const castingTime = payload.casting_time ?? payload.castingTime ?? payload.casting;
  if (castingTime) {
    normalized.casting_time = castingTime;
  }
  if (!normalized.body) {
    normalized.body = payload.description || payload.summary || normalized.body;
  }
  if (Array.isArray(payload.classes)) {
    normalized.classes = payload.classes
      .map((cls) => (typeof cls === 'string' ? cls.trim() : cls))
      .filter(Boolean);
  }
  return normalized;
}

function applySpellRecords(records = [], spells = []) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    const index = spells.findIndex((spell) => (spell?.title || '').trim() === id);
    if (record.operation === 'remove') {
      if (index >= 0) {
        spells.splice(index, 1);
      }
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const normalized = normalizeSpellPayload(record.payload, id);
    if (!normalized) {
      return;
    }
    normalized.title = normalized.title?.trim() || id;
    if (index >= 0) {
      spells[index] = normalized;
    } else {
      spells.push(normalized);
    }
  });
}

function applyClassRecords(records = [], classData = {}, classEquipmentChoices = {}, defaultClassEquipment = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete classData[id];
      delete classEquipmentChoices[id];
      delete defaultClassEquipment[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const normalizedPayload = normalizeClassPayload(record.payload);
    if (!normalizedPayload) {
      return;
    }
    if (normalizedPayload.equipmentChoices) {
      classEquipmentChoices[id] = safeClone(normalizedPayload.equipmentChoices);
      delete normalizedPayload.equipmentChoices;
    }
    if (normalizedPayload.defaultEquipment) {
      defaultClassEquipment[id] = safeClone(normalizedPayload.defaultEquipment);
      delete normalizedPayload.defaultEquipment;
    }
    const existing = classData[id] || {};
    classData[id] = { ...existing, ...normalizedPayload };
  });
}

function ensureSubclassContainer(subclassData, className, payload) {
  if (!subclassData[className]) {
    subclassData[className] = {
      selectionLevel: typeof payload?.selectionLevel === 'number' ? payload.selectionLevel : 3,
      name: payload?.parentClass || `${className} Subclass`,
      options: {}
    };
  }
  if (!subclassData[className].options) {
    subclassData[className].options = {};
  }
}

function applySubclassRecords(records = [], subclassData = {}) {
  records.forEach((record) => {
    const id = record?.id;
    if (!id || !record.payload) {
      return;
    }
    const [className, ...rest] = id.split(':');
    const subclassName = rest.join(':').trim();
    const trimmedClass = className?.trim();
    if (!trimmedClass || !subclassName) {
      return;
    }
    const normalizedPayload = normalizeSubclassPayload(record.payload);
    if (!normalizedPayload) {
      return;
    }
    ensureSubclassContainer(subclassData, trimmedClass, normalizedPayload);
    const options = subclassData[trimmedClass].options;
    if (record.operation === 'remove') {
      delete options[subclassName];
      return;
    }
    const merged = { ...(options[subclassName] || {}), ...normalizedPayload };
    if (!merged.name) {
      merged.name = subclassName;
    }
    options[subclassName] = merged;
  });
}

function applyFeatRecords(records = [], feats = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete feats[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    feats[id] = record.payload;
  });
}

function normalizeBackgroundEquipmentItem(item) {
  if (!item) {
    return null;
  }
  if (typeof item === 'object') {
    return item;
  }
  if (typeof item !== 'string') {
    return null;
  }
  const trimmed = item.trim();
  if (!trimmed) {
    return null;
  }
  const qtyMatch = trimmed.match(/^(.*?)\s*x(\d+)\s*(?:\((.+)\))?$/i);
  if (qtyMatch) {
    const [, name, qty, notes] = qtyMatch;
    return {
      name: (name || '').trim() || trimmed,
      quantity: Number.parseInt(qty, 10) || 1,
      weight: null,
      notes: (notes || '').trim()
    };
  }
  const notesMatch = trimmed.match(/^(.*?)\s*\((.+)\)$/);
  if (notesMatch) {
    const [, name, notes] = notesMatch;
    return {
      name: (name || '').trim() || trimmed,
      quantity: 1,
      weight: null,
      notes: (notes || '').trim()
    };
  }
  return {
    name: trimmed,
    quantity: 1,
    weight: null,
    notes: ''
  };
}

function normalizeBackgroundPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  const normalized = { ...payload };
  if (Array.isArray(payload.equipment)) {
    normalized.equipment = payload.equipment
      .map(normalizeBackgroundEquipmentItem)
      .filter(Boolean);
  }
  return normalized;
}

function applyBackgroundRecords(records = [], backgrounds = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete backgrounds[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    backgrounds[id] = normalizeBackgroundPayload(record.payload);
  });
}

function applyRaceRecords(records = [], raceData = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete raceData[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    if (!payload.name) {
      payload.name = id;
    }
    raceData[id] = payload;
  });
}

function applySubraceRecords(records = [], subraceData = {}) {
  records.forEach((record) => {
    const id = record?.id;
    if (!id) {
      return;
    }
    // Subrace IDs use format "Race:Subrace Name"
    const [raceName, ...rest] = id.split(':');
    const subraceName = rest.join(':').trim();
    const trimmedRace = raceName?.trim();
    if (!trimmedRace || !subraceName) {
      return;
    }
    const key = `${trimmedRace}:${subraceName}`;
    if (record.operation === 'remove') {
      delete subraceData[key];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    // Ensure required fields
    if (!payload.name) {
      payload.name = subraceName;
    }
    if (!payload.race) {
      payload.race = trimmedRace;
    }
    subraceData[key] = payload;
  });
}

function applyFightingStyleRecords(records = [], fightingStyleData = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete fightingStyleData[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    if (!payload.name) {
      payload.name = id;
    }
    fightingStyleData[id] = payload;
  });
}

function applyPactBoonRecords(records = [], pactBoonData = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete pactBoonData[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    if (!payload.name) {
      payload.name = id;
    }
    pactBoonData[id] = payload;
  });
}

function applyEldritchInvocationRecords(records = [], eldritchInvocationData = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete eldritchInvocationData[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    if (!payload.name) {
      payload.name = id;
    }
    eldritchInvocationData[id] = payload;
  });
}

function applyMetamagicRecords(records = [], metamagicData = {}) {
  records.forEach((record) => {
    const id = record?.id?.trim();
    if (!id) {
      return;
    }
    if (record.operation === 'remove') {
      delete metamagicData[id];
      return;
    }
    if (!record.payload || typeof record.payload !== 'object') {
      return;
    }
    const payload = safeClone(record.payload);
    if (!payload.name) {
      payload.name = id;
    }
    metamagicData[id] = payload;
  });
}

function buildRuntimeData(baseSnapshot) {
  const source = baseSnapshot || {};
  return {
    spells: safeClone(source.spells || []),
    classData: safeClone(source.classData || {}),
    subclassData: safeClone(source.subclassData || {}),
    feats: safeClone(source.feats || {}),
    backgrounds: safeClone(source.backgrounds || {}),
    classEquipmentChoices: safeClone(source.classEquipmentChoices || {}),
    defaultClassEquipment: safeClone(source.defaultClassEquipment || {}),
    raceData: safeClone(source.raceData || {}),
    subraceData: safeClone(source.subraceData || {}),
    fightingStyleData: safeClone(source.fightingStyleData || {}),
    pactBoonData: safeClone(source.pactBoonData || {}),
    eldritchInvocationData: safeClone(source.eldritchInvocationData || {}),
    metamagicData: safeClone(source.metamagicData || {})
  };
}

function syncObject(target, source) {
  if (!target || typeof target !== 'object') {
    return;
  }
  Object.keys(target).forEach((key) => delete target[key]);
  Object.entries(source || {}).forEach(([key, value]) => {
    target[key] = value;
  });
}

function syncArray(target, source) {
  if (!Array.isArray(source)) {
    source = [];
  }
  if (!Array.isArray(target)) {
    if (runtimeWindow) {
      runtimeWindow.SPELLS_DATA = source.slice();
    }
    return;
  }
  target.length = 0;
  target.push(...source);
}

function applyRuntimeData(nextData) {
  if (!runtimeWindow) {
    return;
  }
  syncArray(runtimeWindow.SPELLS_DATA, nextData.spells);
  const levelData = runtimeWindow.LevelUpData || {};
  if (!levelData.CLASS_DATA) {
    levelData.CLASS_DATA = {};
  }
  if (!levelData.SUBCLASS_DATA) {
    levelData.SUBCLASS_DATA = {};
  }
  if (!levelData.FEATS) {
    levelData.FEATS = {};
  }
  if (!levelData.BACKGROUND_DATA) {
    levelData.BACKGROUND_DATA = {};
  }
  if (!levelData.CLASS_EQUIPMENT_CHOICES) {
    levelData.CLASS_EQUIPMENT_CHOICES = {};
  }
  if (!levelData.DEFAULT_CLASS_EQUIPMENT) {
    levelData.DEFAULT_CLASS_EQUIPMENT = {};
  }
  if (!levelData.RACE_DATA) {
    levelData.RACE_DATA = {};
  }
  if (!levelData.SUBRACE_DATA) {
    levelData.SUBRACE_DATA = {};
  }
  if (!levelData.FIGHTING_STYLE_DATA) {
    levelData.FIGHTING_STYLE_DATA = {};
  }
  if (!levelData.PACT_BOON_DATA) {
    levelData.PACT_BOON_DATA = {};
  }
  if (!levelData.ELDRITCH_INVOCATION_DATA) {
    levelData.ELDRITCH_INVOCATION_DATA = {};
  }
  if (!levelData.METAMAGIC_DATA) {
    levelData.METAMAGIC_DATA = {};
  }
  syncObject(levelData.CLASS_DATA, nextData.classData);
  syncObject(levelData.SUBCLASS_DATA, nextData.subclassData);
  syncObject(levelData.FEATS, nextData.feats);
  syncObject(levelData.BACKGROUND_DATA, nextData.backgrounds);
  syncObject(levelData.CLASS_EQUIPMENT_CHOICES, nextData.classEquipmentChoices);
  syncObject(levelData.DEFAULT_CLASS_EQUIPMENT, nextData.defaultClassEquipment);
  syncObject(levelData.RACE_DATA, nextData.raceData);
  syncObject(levelData.SUBRACE_DATA, nextData.subraceData);
  syncObject(levelData.FIGHTING_STYLE_DATA, nextData.fightingStyleData);
  syncObject(levelData.PACT_BOON_DATA, nextData.pactBoonData);
  syncObject(levelData.ELDRITCH_INVOCATION_DATA, nextData.eldritchInvocationData);
  syncObject(levelData.METAMAGIC_DATA, nextData.metamagicData);
}

function applyRecords(baseSnapshot, recordsByType = {}) {
  const runtime = buildRuntimeData(baseSnapshot);
  applySpellRecords(recordsByType.spell, runtime.spells);
  applyClassRecords(recordsByType.class, runtime.classData, runtime.classEquipmentChoices, runtime.defaultClassEquipment);
  applySubclassRecords(recordsByType.subclass, runtime.subclassData);
  applyFeatRecords(recordsByType.feat, runtime.feats);
  applyBackgroundRecords(recordsByType.background, runtime.backgrounds);
  applyRaceRecords(recordsByType.race, runtime.raceData);
  applySubraceRecords(recordsByType.subrace, runtime.subraceData);
  applyFightingStyleRecords(recordsByType['fighting-style'], runtime.fightingStyleData);
  applyPactBoonRecords(recordsByType['pact-boon'], runtime.pactBoonData);
  applyEldritchInvocationRecords(recordsByType['eldritch-invocation'], runtime.eldritchInvocationData);
  applyMetamagicRecords(recordsByType.metamagic, runtime.metamagicData);
  applyRuntimeData(runtime);
}

/**
 * Apply records directly to the current window data without rebuilding from baseline.
 * Used after SRD filtering to add homebrew content to already-filtered data.
 */
function applyRecordsToCurrentData(recordsByType = {}) {
  if (!runtimeWindow) {
    return;
  }
  const levelData = runtimeWindow.LevelUpData || {};

  // Apply spell records directly to current SPELLS_DATA
  if (Array.isArray(runtimeWindow.SPELLS_DATA)) {
    applySpellRecords(recordsByType.spell, runtimeWindow.SPELLS_DATA);
  }

  // Apply class records directly to current LevelUpData structures
  if (levelData.CLASS_DATA) {
    // Ensure equipment structures exist and are synced
    if (!levelData.CLASS_EQUIPMENT_CHOICES) {
      levelData.CLASS_EQUIPMENT_CHOICES = {};
    }
    if (!levelData.DEFAULT_CLASS_EQUIPMENT) {
      levelData.DEFAULT_CLASS_EQUIPMENT = {};
    }
    applyClassRecords(recordsByType.class, levelData.CLASS_DATA, levelData.CLASS_EQUIPMENT_CHOICES, levelData.DEFAULT_CLASS_EQUIPMENT);
  }

  if (levelData.SUBCLASS_DATA) {
    applySubclassRecords(recordsByType.subclass, levelData.SUBCLASS_DATA);
  }

  if (levelData.FEATS) {
    applyFeatRecords(recordsByType.feat, levelData.FEATS);
  }

  if (levelData.BACKGROUND_DATA) {
    applyBackgroundRecords(recordsByType.background, levelData.BACKGROUND_DATA);
  }

  if (levelData.RACE_DATA) {
    applyRaceRecords(recordsByType.race, levelData.RACE_DATA);
  }

  if (levelData.SUBRACE_DATA) {
    applySubraceRecords(recordsByType.subrace, levelData.SUBRACE_DATA);
  }

  if (levelData.FIGHTING_STYLE_DATA) {
    applyFightingStyleRecords(recordsByType['fighting-style'], levelData.FIGHTING_STYLE_DATA);
  }

  if (levelData.PACT_BOON_DATA) {
    applyPactBoonRecords(recordsByType['pact-boon'], levelData.PACT_BOON_DATA);
  }

  if (levelData.ELDRITCH_INVOCATION_DATA) {
    applyEldritchInvocationRecords(recordsByType['eldritch-invocation'], levelData.ELDRITCH_INVOCATION_DATA);
  }

  if (levelData.METAMAGIC_DATA) {
    applyMetamagicRecords(recordsByType.metamagic, levelData.METAMAGIC_DATA);
  }
}

function dispatchPacksEvent(detail) {
  if (!runtimeWindow || typeof runtimeWindow.dispatchEvent !== 'function') {
    return;
  }
  runtimeWindow.dispatchEvent(new CustomEvent('dmtoolbox:packs-applied', { detail }));
}

export function initContentPackRuntime(manager) {
  if (!runtimeWindow || !manager?.subscribe) {
    return;
  }
  const base = getBaselineSnapshot();
  if (!base) {
    return;
  }

  // Store the current context so we can re-apply records after SRD filtering
  let currentContext = {};
  let currentMergedAllowlist = {};

  const handleUpdate = (context = {}) => {
    currentContext = context;
    currentMergedAllowlist = mergeAllowlists(base.allowlist, context.allowlist, context.recordsByType);
    applyAllowlist(currentMergedAllowlist);
    applyRecords(base, context.recordsByType || {});
    dispatchPacksEvent({ allowlist: currentMergedAllowlist, context });
  };

  // Listen for SRD filtering completion and re-apply records
  // This is needed because site.js restores from backups on packs-applied,
  // which wipes out the homebrew content we just added
  runtimeWindow.addEventListener('dmtoolbox:srd-filtered', () => {
    if (!currentContext.recordsByType || Object.keys(currentContext.recordsByType).length === 0) {
      return;
    }
    // Re-apply records directly to the current (already filtered) window data
    applyRecordsToCurrentData(currentContext.recordsByType);
    // Signal that pack content is now fully applied - triggers cache invalidation
    runtimeWindow.dispatchEvent(new CustomEvent('dmtoolbox:packs-ready'));
  });

  manager.subscribe((payload) => {
    handleUpdate(payload?.context || {});
  }, { immediate: true });
}

export default initContentPackRuntime;
