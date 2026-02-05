(function() {
  'use strict';

  const rawAllowlist = window.SRD_CONTENT_ALLOWLIST || {};
  const rawBlocklist = window.SRD_CONTENT_BLOCKLIST || {};

  const allowSets = Object.entries(rawAllowlist).reduce((acc, [type, values]) => {
    acc[type] = new Set(values);
    return acc;
  }, {});

  const blockSets = Object.entries(rawBlocklist).reduce((acc, [type, values]) => {
    acc[type] = new Set(values);
    return acc;
  }, {});

  /**
   * Merge additional allowlist entries from content packs into the filter.
   * @param {Object} packAllowlist - Object where keys are content types and values are Sets or Arrays of IDs
   */
  function mergePackAllowlist(packAllowlist) {
    if (!packAllowlist || typeof packAllowlist !== 'object') return;

    Object.entries(packAllowlist).forEach(([type, values]) => {
      if (!allowSets[type]) {
        allowSets[type] = new Set();
      }
      // Handle both Set and Array values
      const items = values instanceof Set ? values : (Array.isArray(values) ? values : []);
      items.forEach((id) => {
        if (id) allowSets[type].add(id);
      });
    });
  }

  /**
   * Reset the allowlist to base SRD values (removes pack additions).
   * Called when packs are disabled to restore SRD-only state.
   */
  function resetToBaseAllowlist() {
    // Clear all sets
    Object.keys(allowSets).forEach((type) => {
      allowSets[type].clear();
    });
    // Restore from base SRD allowlist
    Object.entries(rawAllowlist).forEach(([type, values]) => {
      allowSets[type] = new Set(values);
    });
  }

  function isAllowed(type, id) {
    if (!id) return true;
    const set = allowSets[type];
    if (!set) return true;
    return set.has(id);
  }

  function filterArray(type, items, idSelector = (item) => item?.id) {
    if (!Array.isArray(items) || !allowSets[type]) {
      return items;
    }
    return items.filter((item) => isAllowed(type, idSelector(item)));
  }

  function filterObject(type, obj, idSelector = (key) => key) {
    if (!obj || typeof obj !== 'object' || !allowSets[type]) {
      return obj;
    }
    Object.keys(obj).forEach((key) => {
      const id = idSelector(key, obj[key]);
      if (!isAllowed(type, id)) {
        delete obj[key];
      }
    });
    return obj;
  }

  window.SRDContentFilter = {
    isAllowed,
    filterArray,
    filterObject,
    mergePackAllowlist,
    resetToBaseAllowlist,
    allowlist: allowSets,
    blocklist: blockSets
  };
})();
