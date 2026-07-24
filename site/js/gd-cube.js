/*
 * Total Star Meetup — real GD cube renderer.
 *
 * Loads each player's actual cube sprite layers from GDColon's GDBrowser repo
 * (GitHub raw serves them with permissive CORS), tints them to the player's real
 * colours on a <canvas>, and composites them in GDBrowser's exact layer order.
 * If an icon isn't available as individual layers (e.g. 2.2 spritesheet-only icons)
 * or anything fails, it resolves to null and the CSS cube stays in place.
 */
(function () {
  'use strict';

  var BASE = (GDTSM.config && GDTSM.config.ICON_BASE) ||
    'https://raw.githubusercontent.com/GDColon/GDBrowser/master/iconkit/icons/';
  var OFFSETS = GDTSM.cubeOffsets || {};

  var urlCache = {}; // key -> dataURL string | null (known unavailable)
  var pending = {};  // key -> Promise<string|null>
  var imgCache = {}; // layer url -> Promise<Image|null>

  function pad(n) { n = Math.floor(+n) || 0; return n < 10 ? '0' + n : '' + n; }
  function clamp(n) { n = Math.round(+n); return isNaN(n) ? 0 : n < 0 ? 0 : n > 255 ? 255 : n; }
  function isBlack(c) { return c[0] === 0 && c[1] === 0 && c[2] === 0; }

  function normColor(a, fb) {
    if (!Array.isArray(a) || a.length < 3) return fb;
    return [clamp(a[0]), clamp(a[1]), clamp(a[2])];
  }
  // GDBrowser's getGlowColor: glow uses colour 2, or colour 1 if 2 is black, or white if both are.
  function glowColor(c1, c2) { var g = !isBlack(c2) ? c2 : c1; return isBlack(g) ? [255, 255, 255] : g; }

  function key(p) {
    return [p.icon, (p.col1RGB || []).join('.'), (p.col2RGB || []).join('.'), p.glow ? 1 : 0].join('|');
  }
  function off(name) { return OFFSETS[name] || [0, 0]; }

  function loadImg(url) {
    if (imgCache[url]) return imgCache[url];
    imgCache[url] = new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous'; // raw sends Access-Control-Allow-Origin: * → canvas stays clean
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
    return imgCache[url];
  }

  // Tint a greyscale layer to rgb while preserving its shading and alpha.
  function tint(img, rgb) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);                 // grey + alpha
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    x.fillRect(0, 0, w, h);                 // colour × grey (alpha now opaque everywhere)
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(img, 0, 0);                 // clip alpha back to the layer's shape
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  function cached(profile) {
    if (!profile || !(profile.icon > 0)) return null;
    var v = urlCache[key(profile)];
    return typeof v === 'string' ? v : null;
  }

  function render(profile) {
    if (!profile || !(profile.icon > 0)) return Promise.resolve(null);
    var k = key(profile);
    if (k in urlCache) return Promise.resolve(urlCache[k]);
    if (pending[k]) return pending[k];

    var id = pad(profile.icon);
    var c1 = normColor(profile.col1RGB, [149, 255, 0]);
    var c2 = normColor(profile.col2RGB, [255, 255, 255]);
    var names = {
      glow: 'player_' + id + '_glow_001.png',
      col2: 'player_' + id + '_2_001.png',
      col1: 'player_' + id + '_001.png',
      extra: 'player_' + id + '_extra_001.png',
    };

    pending[k] = Promise.all([
      loadImg(BASE + names.col1),
      loadImg(BASE + names.col2),
      loadImg(BASE + names.extra),
      profile.glow ? loadImg(BASE + names.glow) : Promise.resolve(null),
    ]).then(function (imgs) {
      var col1 = imgs[0], col2 = imgs[1], extra = imgs[2], glow = imgs[3];
      if (!col1) { urlCache[k] = null; return null; } // not an individual-layer icon → keep CSS cube

      // Back → front, matching GDBrowser: glow, colour 2, colour 1, white detail.
      var layers = [];
      if (glow) layers.push({ img: glow, name: names.glow, col: glowColor(c1, c2) });
      if (col2) layers.push({ img: col2, name: names.col2, col: c2 });
      layers.push({ img: col1, name: names.col1, col: c1 });
      if (extra) layers.push({ img: extra, name: names.extra, col: [255, 255, 255] });

      // Canvas large enough to hold every centred + offset layer.
      var half = 0;
      layers.forEach(function (L) {
        var o = off(L.name);
        half = Math.max(half, L.img.naturalWidth / 2 + Math.abs(o[0]), L.img.naturalHeight / 2 + Math.abs(o[1]));
      });
      var size = Math.ceil(half * 2) + 4, cx = size / 2, cy = size / 2;
      var canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext('2d');

      layers.forEach(function (L) {
        var o = off(L.name), w = L.img.naturalWidth, h = L.img.naturalHeight;
        // anchor 0.5 + spriteOffset (y inverted), exactly like the icon kit
        ctx.drawImage(tint(L.img, L.col), cx - w / 2 + o[0], cy - h / 2 - o[1]);
      });

      var url;
      try { url = canvas.toDataURL('image/png'); } catch (e) { url = null; }
      urlCache[k] = url || null;
      return urlCache[k];
    }).catch(function () { urlCache[k] = null; return null; });

    return pending[k];
  }

  function applyImg(el, url) {
    if (!el || el.getAttribute('data-cube-url') === url) return;
    el.setAttribute('data-cube-url', url);
    el.classList.add('cube--real');
    el.classList.remove('is-glow');
    el.innerHTML = '<img class="cube__img" alt="" src="' + url + '">';
  }

  // Upgrade a `.cube` element to the real rendered icon when possible.
  function enhanceEl(el, profile) {
    if (!el || !profile || !(profile.icon > 0)) return;
    var hit = cached(profile);
    if (hit) { applyImg(el, hit); return; }
    if (urlCache[key(profile)] === null) return; // known unavailable → keep CSS cube
    render(profile).then(function (url) { if (url) applyImg(el, url); });
  }

  GDTSM.cube = { render: render, cached: cached, enhanceEl: enhanceEl };
})();
