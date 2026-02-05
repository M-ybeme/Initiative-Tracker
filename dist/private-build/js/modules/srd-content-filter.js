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
    allowlist: allowSets,
    blocklist: blockSets
  };
})();
