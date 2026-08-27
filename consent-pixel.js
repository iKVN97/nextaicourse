/* ==========================================================================
   NEXT AI COURSE — Meta Pixel, gated behind explicit advertising-cookie
   consent. Included identically on every public marketing page (index,
   terms, privacy, refund, success, cancel) via <script src="consent-pixel.js"
   defer>. See privacy.html §2 for the customer-facing description of what
   this pixel does and when it runs.

   Behaviour:
   - No stored choice yet -> show a small accept/decline banner. Nothing
     from Meta loads until the visitor clicks "Accept".
   - Stored choice is "granted" -> load the pixel immediately, no banner.
   - Stored choice is "denied"  -> do nothing at all. No banner, no pixel.
   The choice is stored in localStorage so it persists across visits, not
   just the current tab/session — a returning visitor is never asked twice.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'nac_ad_consent'; // 'granted' | 'denied'
  var PIXEL_ID = '1047030424808416';

  function getStoredConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function storeConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private mode — choice just won't persist */ }
  }

  // The exact base pixel code Meta provides, unchanged — only the trigger
  // (an explicit "Accept" click, or a previously-stored "granted" choice)
  // is new. Fires fbq('track','PageView') exactly once per real page load,
  // the same as an unconditional install would.
  function loadPixel() {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');

    var img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.alt = '';
    img.src = 'https://www.facebook.com/tr?id=' + PIXEL_ID + '&ev=PageView&noscript=1';
    document.body.appendChild(img);
  }

  function showBanner() {
    var wrap = document.createElement('div');
    wrap.id = 'nacConsentBanner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Advertising cookie consent');
    wrap.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:#0E1013;color:#F2EDE3;border-top:1px solid rgba(240,235,225,0.17);' +
      'padding:1rem 1.2rem;font:14px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;' +
      'display:flex;flex-wrap:wrap;gap:.8rem 1.4rem;align-items:center;justify-content:space-between;';

    var text = document.createElement('p');
    text.style.cssText = 'margin:0;flex:1 1 18rem;min-width:0;';
    text.textContent = 'We use Meta Pixel for advertising measurement and conversion tracking. It only loads if you accept. ';
    var link = document.createElement('a');
    link.href = 'privacy.html';
    link.style.cssText = 'color:#C9A868;text-decoration:underline;text-underline-offset:2px;';
    link.textContent = 'Privacy Policy';
    text.appendChild(link);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:.6rem;flex:0 0 auto;';

    var declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText =
      'padding:.6rem 1.1rem;border-radius:5px;border:1px solid rgba(240,235,225,0.17);' +
      'background:transparent;color:#F2EDE3;font-size:.86rem;cursor:pointer;';

    var acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText =
      'padding:.6rem 1.1rem;border-radius:5px;border:none;' +
      'background:#C9A868;color:#141005;font-weight:700;font-size:.86rem;cursor:pointer;';

    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);
    wrap.appendChild(text);
    wrap.appendChild(actions);
    document.body.appendChild(wrap);

    acceptBtn.addEventListener('click', function () {
      storeConsent('granted');
      wrap.remove();
      loadPixel();
    });
    declineBtn.addEventListener('click', function () {
      storeConsent('denied');
      wrap.remove();
    });
  }

  function init() {
    var consent = getStoredConsent();
    if (consent === 'granted') {
      loadPixel();
    } else if (consent !== 'denied') {
      showBanner();
    }
    // consent === 'denied': do nothing — no banner, no pixel, ever, until
    // the visitor clears their browser storage.
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
