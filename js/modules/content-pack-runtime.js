/**
 * @typedef {Window & typeof globalThis & {
 *   LevelUpData?: {
 *     CLASS_DATA?: Record<string, unknown>;
 *     SUBCLASS_DATA?: Record<string, unknown>;
 *     FEATS?: Record<string, unknown>;
 *     BACKGROUND_DATA?: Record<string, unknown>;
 *     CLASS_EQUIPMENT_CHOICES?: Record<string, unknown>;
 *     DEFAULT_CLASS_EQUIPMENT?: Record<string, unknown>;
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
    defaultClassEquipment: safeClone(levelData.DEFAULT_CLASS_EQUIPMENT || {})
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
  ['subclass', 'feat', 'background', 'spell'].forEach((type) => addFromRecords(type));
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

function buildRuntimeData(baseSnapshot) {
  const source = baseSnapshot || {};
  return {
    spells: safeClone(source.spells || []),
    classData: safeClone(source.classData || {}),
    subclassData: safeClone(source.subclassData || {}),
    feats: safeClone(source.feats || {}),
    backgrounds: safeClone(source.backgrounds || {}),
    classEquipmentChoices: safeClone(source.classEquipmentChoices || {}),
    defaultClassEquipment: safeClone(source.defaultClassEquipment || {})
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
  syncObject(levelData.CLASS_DATA, nextData.classData);
  syncObject(levelData.SUBCLASS_DATA, nextData.subclassData);
  syncObject(levelData.FEATS, nextData.feats);
  syncObject(levelData.BACKGROUND_DATA, nextData.backgrounds);
  syncObject(levelData.CLASS_EQUIPMENT_CHOICES, nextData.classEquipmentChoices);
  syncObject(levelData.DEFAULT_CLASS_EQUIPMENT, nextData.defaultClassEquipment);
}

function applyRecords(baseSnapshot, recordsByType = {}) {
  const runtime = buildRuntimeData(baseSnapshot);
  applySpellRecords(recordsByType.spell, runtime.spells);
  applyClassRecords(recordsByType.class, runtime.classData, runtime.classEquipmentChoices, runtime.defaultClassEquipment);
  applySubclassRecords(recordsByType.subclass, runtime.subclassData);
  applyFeatRecords(recordsByType.feat, runtime.feats);
  applyBackgroundRecords(recordsByType.background, runtime.backgrounds);
  applyRuntimeData(runtime);
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

  const handleUpdate = (context = {}) => {
    const mergedAllowlist = mergeAllowlists(base.allowlist, context.allowlist, context.recordsByType);
    applyAllowlist(mergedAllowlist);
    applyRecords(base, context.recordsByType || {});
    dispatchPacksEvent({ allowlist: mergedAllowlist, context });
  };

  manager.subscribe((payload) => {
    handleUpdate(payload?.context || {});
  }, { immediate: true });
}

export default initContentPackRuntime;
