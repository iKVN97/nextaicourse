/* ==========================================================================
   NEXT AI COURSE — first-party operational analytics.

   Independent of Meta Pixel (consent-pixel.js) and the advertising-cookie
   consent it's gated behind — see privacy.html §02. This script never
   loads any third-party resource, never sends data anywhere except this
   site's own Cloudflare Worker backend (POST /api/track, same-origin),
   and is never used for advertising or shared with any ad network.

   Identifiers:
   - Session id: sessionStorage, rolling 30-minute inactivity timeout —
     effectively gone once the tab is closed or the visitor goes quiet.
   - Visitor id: localStorage, so repeat visits within ~180 days count as
     the same visitor — the id then rotates to a fresh random value. No
     fingerprinting: this is a plain random id, not derived from anything
     about the browser or device.

   Every send is wrapped so a failure (blocked request, private-mode
   storage, network hiccup) can never break the page — see send()'s
   try/catch and the empty .catch() on the fetch fallback.
   ========================================================================== */
(function () {
  'use strict';

  var TRACK_ENDPOINT = '/api/track';
  var VISITOR_KEY = 'nac_vid';
  var VISITOR_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
  var SESSION_KEY = 'nac_sid';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var j = 0; j < 16; j++) hex.push(('0' + bytes[j].toString(16)).slice(-2));
    return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' + hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10, 16).join('');
  }

  function getVisitorId() {
    try {
      var raw = localStorage.getItem(VISITOR_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.id && data.exp > Date.now()) return data.id;
      }
    } catch (e) { /* private mode — fall through to a fresh, unpersisted id */ }
    var id = uuid();
    try { localStorage.setItem(VISITOR_KEY, JSON.stringify({ id: id, exp: Date.now() + VISITOR_TTL_MS })); } catch (e) {}
    return id;
  }

  function getSessionId() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.id && data.exp > Date.now()) {
          data.exp = Date.now() + SESSION_TIMEOUT_MS;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
          return data.id;
        }
      }
    } catch (e) {}
    var id = uuid();
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, exp: Date.now() + SESSION_TIMEOUT_MS })); } catch (e) {}
    return id;
  }

  function detectDevice() {
    var ua = navigator.userAgent || '';
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (/Mobi|Android/i.test(ua) || w < 768) return 'mobile';
    if (/Tablet|iPad/i.test(ua) || w < 1024) return 'tablet';
    return 'desktop';
  }

  function detectBrowser() {
    var ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'edge';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'chrome';
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'safari';
    return 'other';
  }

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  function getUtm() {
    var out = {};
    try {
      var params = new URLSearchParams(location.search);
      UTM_KEYS.forEach(function (k) {
        var v = params.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {}
    return out;
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();

  window.nacAnalytics = { visitorId: visitorId, sessionId: sessionId };

  function send(type, extra) {
    try {
      var payload = { type: type, visitorId: visitorId, sessionId: sessionId, path: location.pathname, referrer: document.referrer || '', device: detectDevice(), browser: detectBrowser() };
      var utm = getUtm();
      for (var k in utm) { if (utm.hasOwnProperty(k)) payload[k] = utm[k]; }
      if (extra) { for (var k2 in extra) { if (extra.hasOwnProperty(k2)) payload[k2] = extra[k2]; } }

      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(TRACK_ENDPOINT, blob);
      } else {
        fetch(TRACK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      }
    } catch (e) { /* analytics must never break the site */ }
  }

  window.nacTrack = send;

  send('page_view');
})();
