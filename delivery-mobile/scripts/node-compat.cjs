/**
 * Polyfills de compatibilidad de Node.js 22+ para entornos con Node.js 20.x
 * (URL.parse, Promise.withResolvers, Object.groupBy, Map.groupBy y util.styleText).
 */
const util = require('node:util');

if (typeof URL !== 'undefined' && typeof URL.parse !== 'function') {
  URL.parse = function parseUrl(url, base) {
    try {
      return base !== undefined ? new URL(String(url), base) : new URL(String(url));
    } catch {
      return null;
    }
  };
}

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof Object.groupBy !== 'function') {
  Object.groupBy = function groupBy(items, callbackFn) {
    const obj = Object.create(null);
    let k = 0;
    for (const value of items) {
      const key = PropertyKey(callbackFn(value, k++));
      if (key in obj) {
        obj[key].push(value);
      } else {
        obj[key] = [value];
      }
    }
    return obj;
  };
}

function PropertyKey(val) {
  return typeof val === 'symbol' ? val : String(val);
}

if (typeof Map.groupBy !== 'function') {
  Map.groupBy = function groupBy(items, callbackFn) {
    const map = new Map();
    let k = 0;
    for (const value of items) {
      const key = callbackFn(value, k++);
      const list = map.get(key);
      if (list) {
        list.push(value);
      } else {
        map.set(key, [value]);
      }
    }
    return map;
  };
}

if (typeof util.styleText !== 'function') {
  util.styleText = function styleText(_format, text) {
    return String(text);
  };
}

if (typeof util.parseEnv !== 'function') {
  util.parseEnv = function parseEnv(content) {
    const result = Object.create(null);
    const lines = String(content).split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const cleaned = line.startsWith('export ') ? line.slice(7).trim() : line;
      const eqIdx = cleaned.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = cleaned.slice(0, eqIdx).trim();
      let val = cleaned.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      } else {
        const hashIdx = val.indexOf(' #');
        if (hashIdx >= 0) val = val.slice(0, hashIdx).trim();
      }
      result[key] = val;
    }
    return result;
  };
}
