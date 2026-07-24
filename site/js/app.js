/*
 * Total Star Meetup — UI controller.
 * Holds the roster, fetches profiles sequentially (gentle on the API),
 * renders the scoreboard + player cards, and persists the roster.
 */
(function () {
  'use strict';

  var cfg = GDTSM.config;
  var api = GDTSM.api;
  var STATS = cfg.STATS;

  /* ---------- state ---------- */
  // roster: [{ key, input, status: 'loading'|'ok'|'notfound'|'error', error?, profile? }]
  var roster = [];
  var processing = false;

  /* ---------- tiny helpers ---------- */
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmt(n) {
    return Number(n).toLocaleString('en-US');
  }

  function norm(name) { return String(name).trim().toLowerCase(); }

  // GDBrowser returns colours as {r,g,b} objects (older data used [r,g,b] arrays) — accept both.
  function toRGB(c) {
    if (Array.isArray(c) && c.length >= 3) return [c[0], c[1], c[2]];
    if (c && typeof c === 'object' && typeof c.r === 'number') return [c.r, c.g, c.b];
    return null;
  }
  function rgb(color, fallback) {
    var a = toRGB(color);
    if (!a) return fallback;
    // Coerce to 0–255 integers so nothing from the API can leak into the inline style.
    var c = a.map(function (n) { n = Math.round(+n); return (n >= 0 && n <= 255) ? n : 0; });
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  function iconSvg(id, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
  }

  /* ---------- dom refs ---------- */
  var refs = {};

  /* ---------- persistence ---------- */
  function saveRoster() {
    try {
      var inputs = roster.map(function (e) { return e.input; });
      localStorage.setItem(cfg.STORAGE.roster, JSON.stringify(inputs));
    } catch (e) { /* ignore */ }
    updateUrl(); // keep the shareable URL in sync with the group
  }

  function loadSavedInputs() {
    try {
      var raw = localStorage.getItem(cfg.STORAGE.roster);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }

  /* ---------- share via URL ---------- */
  function getShareUrl() {
    var base = location.origin + location.pathname;
    if (!roster.length) return base;
    return base + '?players=' + roster.map(function (e) { return encodeURIComponent(e.input); }).join(',');
  }

  function parsePlayersFromUrl() {
    var m = location.search.match(/[?&]players=([^&]*)/);
    if (!m) return [];
    return m[1].split(',').map(function (s) {
      try { return decodeURIComponent(s.replace(/\+/g, '%20')).trim(); } catch (e) { return s.trim(); }
    }).filter(function (s) { return s.length > 0; });
  }

  function updateUrl() {
    try { window.history.replaceState(null, '', getShareUrl()); } catch (e) { /* history unavailable */ }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  var shareTimer = null;
  function share() {
    if (!roster.length) return;
    var url = getShareUrl();
    updateUrl();
    var label = refs.shareBtn.querySelector('.btn__label') || refs.shareBtn;
    copyText(url).then(function (ok) {
      if (ok) {
        label.textContent = 'Copied!';
        refs.shareBtn.classList.add('is-copied');
        announce('Share link copied to clipboard.');
        if (shareTimer) clearTimeout(shareTimer);
        shareTimer = setTimeout(function () {
          label.textContent = 'Share';
          refs.shareBtn.classList.remove('is-copied');
        }, 1600);
      } else {
        announce('Copy this share link: ' + url);
        window.prompt('Copy this share link:', url);
      }
    });
  }

  /* ---------- announcements (a11y live region) ---------- */
  function announce(msg) {
    if (refs.live) refs.live.textContent = msg;
  }

  /* ---------- add / remove ---------- */
  function parseNames(text) {
    return String(text)
      .split(/[\n,]+/)              // commas or new lines separate names
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function hasEntry(key) {
    for (var i = 0; i < roster.length; i++) if (roster[i].key === key) return true;
    return false;
  }

  function addNames(text) {
    var names = parseNames(text);
    var added = 0, dupes = 0;
    names.forEach(function (name) {
      var key = norm(name);
      if (hasEntry(key)) { dupes++; return; }
      roster.push({ key: key, input: name, status: 'loading' });
      added++;
    });
    if (added > 0) { render(); saveRoster(); processQueue(); }
    if (added === 0 && dupes > 0) announce('Already in the group.');
    else if (dupes > 0) announce('Added ' + added + ', skipped ' + dupes + ' already in the group.');
  }

  function removeEntry(key) {
    roster = roster.filter(function (e) { return e.key !== key; });
    render(); saveRoster();
    announce('Removed. ' + okCount() + ' players in the group.');
  }

  function clearAll() {
    if (!roster.length) return;
    roster = [];
    render(); saveRoster();
    announce('Group cleared.');
  }

  function refreshAll() {
    if (!roster.length) return;
    roster.forEach(function (e) { api.clearCache(e.input); e.status = 'loading'; e.error = null; e.profile = null; });
    render();
    processQueue(true);
    announce('Refreshing the group…');
  }

  /* ---------- sequential fetch queue ---------- */
  function processQueue(force) {
    if (processing) return;
    processing = true;

    var step = function () {
      var entry = null;
      for (var i = 0; i < roster.length; i++) {
        if (roster[i].status === 'loading') { entry = roster[i]; break; }
      }
      if (!entry) { processing = false; return; }

      api.getProfile(entry.input, { force: !!force }).then(function (result) {
        // Roster may have changed while awaiting.
        if (roster.indexOf(entry) === -1) return;
        var dup = findByAccount(result.data.accountID, entry);
        if (dup) {
          roster = roster.filter(function (e) { return e !== entry; });
          announce('"' + entry.input + '" is the same player as ' + (dup.profile.username || dup.input) + '.');
        } else {
          entry.status = 'ok';
          entry.profile = result.data;
        }
      }).catch(function (err) {
        if (roster.indexOf(entry) === -1) return;
        entry.status = (err && err.kind === 'notfound') ? 'notfound' : 'error';
        entry.error = (err && err.message) || 'Something went wrong';
      }).then(function () {
        render(); saveRoster();
        step(); // next in queue
      });
    };

    step();
  }

  function findByAccount(accountID, exclude) {
    if (accountID == null) return null;
    for (var i = 0; i < roster.length; i++) {
      var e = roster[i];
      if (e !== exclude && e.status === 'ok' && e.profile && e.profile.accountID === accountID) return e;
    }
    return null;
  }

  function okCount() {
    return roster.filter(function (e) { return e.status === 'ok'; }).length;
  }

  /* ---------- totals ---------- */
  function computeTotals() {
    var sums = {};
    STATS.forEach(function (s) { sums[s.key] = 0; });
    roster.forEach(function (e) {
      if (e.status !== 'ok' || !e.profile) return;
      STATS.forEach(function (s) {
        var v = e.profile[s.key];
        if (typeof v === 'number' && isFinite(v)) sums[s.key] += v;
      });
    });
    return sums;
  }

  // Display order: loaded players ranked by global rank (best first, unranked last),
  // ties broken by stars; still-loading / errored entries sink to the bottom.
  function statOf(p, k) { var v = p && p[k]; return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function rankKey(p) { var r = p && p.rank; return (typeof r === 'number' && r > 0) ? r : Infinity; }
  function orderedForDisplay() {
    return roster.slice().sort(function (a, b) {
      var aok = a.status === 'ok', bok = b.status === 'ok';
      if (aok !== bok) return aok ? -1 : 1;
      if (!aok) return 0;
      var ra = rankKey(a.profile), rb = rankKey(b.profile);
      if (ra !== rb) return ra < rb ? -1 : 1; // better global rank first (avoids Infinity−Infinity NaN)
      return statOf(b.profile, 'stars') - statOf(a.profile, 'stars'); // tie-break: more stars first
    });
  }

  /* ---------- rendering ---------- */
  function render() {
    renderTotals();
    renderRoster();
    renderMeta();
  }

  function renderMeta() {
    var loading = roster.filter(function (e) { return e.status === 'loading'; }).length;
    var n = okCount();
    refs.count.textContent = n === 1 ? '1 player' : n + ' players';
    refs.count.classList.toggle('is-loading', loading > 0);
    var busy = roster.length > 0;
    refs.clearBtn.disabled = !busy;
    refs.refreshBtn.disabled = !busy;
    refs.shareBtn.disabled = !busy;
    document.body.classList.toggle('has-players', roster.length > 0);
  }

  function renderTotals() {
    var sums = computeTotals();
    var frag = document.createDocumentFragment();
    STATS.forEach(function (s) {
      var tile = el('div', 'tile tile--' + s.cls);
      tile.innerHTML =
        iconSvg(s.icon, 'tile__icon') +
        '<span class="tile__value" data-key="' + s.key + '">' + fmt(sums[s.key]) + '</span>' +
        '<span class="tile__label">' + esc(s.label) + '</span>';
      frag.appendChild(tile);
    });
    refs.totals.innerHTML = '';
    refs.totals.appendChild(frag);
  }

  function renderRoster() {
    // Empty state
    if (roster.length === 0) {
      refs.roster.innerHTML = '';
      refs.empty.hidden = false;
      return;
    }
    refs.empty.hidden = true;

    var frag = document.createDocumentFragment();
    orderedForDisplay().forEach(function (e) {
      try { frag.appendChild(renderCard(e)); }
      catch (err) { /* one bad card must never stall the whole render / fetch queue */ }
    });
    refs.roster.innerHTML = '';
    refs.roster.appendChild(frag);

    // Upgrade each cube to the player's real GD icon (async; falls back to the CSS cube).
    if (GDTSM.cube) {
      var byKey = {};
      roster.forEach(function (e) { if (e.status === 'ok' && e.profile) byKey[e.key] = e.profile; });
      var cards = refs.roster.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var prof = byKey[cards[i].getAttribute('data-key')];
        var cubeEl = cards[i].querySelector('.cube');
        if (prof && cubeEl) GDTSM.cube.enhanceEl(cubeEl, prof);
      }
    }
  }

  function cube(profile) {
    // If the real GD cube is already rendered/cached, show it immediately (no flash on re-render).
    var real = GDTSM.cube && GDTSM.cube.cached(profile);
    if (real) return '<span class="cube cube--real"><img class="cube__img" alt="" src="' + real + '"></span>';

    var c1 = rgb(profile && profile.col1RGB, '#4dd0ff');
    var c2 = rgb(profile && profile.col2RGB, '#ffffff');
    var glow = profile && profile.glow ? ' is-glow' : '';
    return '<span class="cube' + glow + '" style="--c1:' + c1 + ';--c2:' + c2 + '">' +
             '<span class="cube__eye"></span><span class="cube__eye"></span>' +
           '</span>';
  }

  function renderCard(entry) {
    var card = el('div', 'card card--' + entry.status);
    card.setAttribute('data-key', entry.key);

    var remove = '<button class="card__remove" type="button" aria-label="Remove ' + esc(entry.input) + '">&times;</button>';

    if (entry.status === 'loading') {
      card.innerHTML = remove +
        '<div class="card__head">' +
          '<span class="cube is-loading"></span>' +
          '<div class="card__id"><span class="card__name">' + esc(entry.input) + '</span>' +
          '<span class="card__sub">looking up…</span></div>' +
        '</div>' +
        '<div class="card__spinner" aria-hidden="true"></div>';
      return card;
    }

    if (entry.status === 'notfound' || entry.status === 'error') {
      var msg = entry.status === 'notfound' ? 'Player not found' : (entry.error || 'Lookup failed');
      card.innerHTML = remove +
        '<div class="card__head">' +
          '<span class="cube is-error">?</span>' +
          '<div class="card__id"><span class="card__name">' + esc(entry.input) + '</span>' +
          '<span class="card__sub card__sub--error">' + esc(msg) + '</span></div>' +
        '</div>' +
        '<button class="btn btn--ghost card__retry" type="button">Try again</button>';
      return card;
    }

    // ok
    var p = entry.profile;
    var rankTxt = (typeof p.rank === 'number' && p.rank > 0) ? '#' + fmt(p.rank) + ' global' : 'Unranked';

    var chips = STATS.map(function (s) {
      var v = p[s.key];
      if (typeof v !== 'number' || !isFinite(v)) return '';
      return '<span class="chip chip--' + s.cls + '" title="' + esc(s.label) + '">' +
               iconSvg(s.icon, 'chip__icon') +
               '<span class="chip__value">' + fmt(v) + '</span>' +
             '</span>';
    }).join('');

    card.innerHTML = remove +
      '<div class="card__head">' +
        cube(p) +
        '<div class="card__id">' +
          '<a class="card__name" href="' + esc(cfg.API_BASE + '/u/' + encodeURIComponent(p.username || entry.input)) +
            '" target="_blank" rel="noopener" title="View ' + esc(p.username || entry.input) + ' on GDBrowser">' +
            esc(p.username || entry.input) + '</a>' +
          '<span class="card__sub">' + esc(rankTxt) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card__stats">' + chips + '</div>';
    return card;
  }

  /* ---------- empty-state examples ---------- */
  function renderExamples() {
    if (!refs.examples) return;
    refs.examples.innerHTML = cfg.EXAMPLES.map(function (name) {
      return '<button class="example" type="button" data-name="' + esc(name) + '">' + esc(name) + '</button>';
    }).join('');
  }

  /* ---------- events ---------- */
  function wire() {
    refs.form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var val = refs.input.value;
      refs.input.value = '';
      refs.input.focus();
      addNames(val);
    });

    refs.clearBtn.addEventListener('click', clearAll);
    refs.refreshBtn.addEventListener('click', refreshAll);
    refs.shareBtn.addEventListener('click', share);

    // Delegated clicks for dynamic content.
    document.addEventListener('click', function (ev) {
      var rm = ev.target.closest ? ev.target.closest('.card__remove') : null;
      if (rm) {
        var card = rm.closest('.card');
        if (card) removeEntry(card.getAttribute('data-key'));
        return;
      }
      var retry = ev.target.closest ? ev.target.closest('.card__retry') : null;
      if (retry) {
        var c = retry.closest('.card');
        if (c) {
          var key = c.getAttribute('data-key');
          roster.forEach(function (e) { if (e.key === key) { e.status = 'loading'; e.error = null; } });
          render(); processQueue(true);
        }
        return;
      }
      var ex = ev.target.closest ? ev.target.closest('.example') : null;
      if (ex) { addNames(ex.getAttribute('data-name')); refs.input.focus(); }
    });
  }

  /* ---------- boot ---------- */
  function init() {
    refs = {
      form: $('#add-form'),
      input: $('#username'),
      totals: $('#totals'),
      roster: $('#roster'),
      empty: $('#empty'),
      examples: $('#examples'),
      count: $('#player-count'),
      clearBtn: $('#clear-btn'),
      refreshBtn: $('#refresh-btn'),
      shareBtn: $('#share-btn'),
      live: $('#live'),
    };

    renderExamples();
    wire();

    // A shared ?players=… link wins over the locally saved group.
    var initial = parsePlayersFromUrl();
    if (!initial.length) initial = loadSavedInputs();
    if (initial.length) {
      initial.forEach(function (name) {
        var key = norm(name);
        if (!hasEntry(key)) roster.push({ key: key, input: name, status: 'loading' });
      });
      render();
      saveRoster(); // reconcile storage + URL with the group we loaded
      processQueue();
    } else {
      render();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposed for the smoke test.
  GDTSM.app = {
    addNames: addNames,
    clearAll: clearAll,
    computeTotals: computeTotals,
    getRoster: function () { return roster; },
  };
})();
