/*
 * Total Star Meetup — GDBrowser client + localStorage cache.
 *
 * getProfile(name, { force }) resolves to { data: Profile, cached: boolean }
 * or rejects with a GDError whose .kind is 'notfound' | 'ratelimited' | 'network'.
 */
(function () {
  'use strict';

  var cfg = GDTSM.config;
  var API_BASE = cfg.API_BASE;
  var CACHE_TTL_MS = cfg.CACHE_TTL_MS;
  var PREFIX = cfg.STORAGE.profilePrefix;

  function GDError(kind, message) {
    this.name = 'GDError';
    this.kind = kind;
    this.message = message;
  }
  GDError.prototype = Object.create(Error.prototype);

  var notFound = function (name) { return new GDError('notfound', 'Player "' + name + '" was not found'); };
  var rateLimited = function () { return new GDError('ratelimited', 'GDBrowser is busy (rate limited) — give it a moment'); };
  var network = function () { return new GDError('network', 'Could not reach GDBrowser — check your connection'); };

  function keyFor(name) { return PREFIX + String(name).trim().toLowerCase(); }

  function readCache(name) {
    try {
      var raw = localStorage.getItem(keyFor(name));
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || typeof entry.ts !== 'number') return null;
      if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
      return entry.data;
    } catch (e) { return null; }
  }

  function writeCache(name, data) {
    try {
      var payload = JSON.stringify({ ts: Date.now(), data: data });
      localStorage.setItem(keyFor(name), payload);
      // Also store under the canonical username so an account-id or alias hits later.
      if (data && data.username) {
        var canon = PREFIX + String(data.username).trim().toLowerCase();
        if (canon !== keyFor(name)) localStorage.setItem(canon, payload);
      }
    } catch (e) { /* storage disabled or full — cache is best-effort */ }
  }

  function clearCache(name) {
    try { localStorage.removeItem(keyFor(name)); } catch (e) { /* ignore */ }
  }

  function fetchProfile(name) {
    var url = API_BASE + '/api/profile/' + encodeURIComponent(String(name).trim());
    return fetch(url, { headers: { Accept: 'application/json' } })
      .catch(function () { throw network(); })
      .then(function (res) {
        if (res.status === 429) throw rateLimited();
        return res.text().catch(function () { throw network(); }).then(function (text) {
          var body = (text || '').trim();
          // GDBrowser answers unknown players with a non-2xx, the string "-1", or an HTML page.
          if (!res.ok || body === '' || body === '-1' || body.charAt(0) === '<') throw notFound(name);
          try { return JSON.parse(body); }
          catch (e) { throw notFound(name); }
        });
      });
  }

  function getProfile(name, opts) {
    opts = opts || {};
    if (opts.force) {
      clearCache(name);
    } else {
      var cached = readCache(name);
      if (cached) return Promise.resolve({ data: cached, cached: true });
    }
    return fetchProfile(name).then(function (data) {
      writeCache(name, data);
      return { data: data, cached: false };
    });
  }

  GDTSM.api = {
    getProfile: getProfile,
    clearCache: clearCache,
    GDError: GDError,
  };
})();
