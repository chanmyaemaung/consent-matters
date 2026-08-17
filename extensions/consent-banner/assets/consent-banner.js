/*!
 * Consent Matters — consent banner & tracking gate.
 *
 * This script does NOT inject any tracking. Merchants add their own
 * pixels; Consent Matters blocks them until the visitor consents:
 *  - Shopify analytics & channel pixels: gated by Shopify's Customer
 *    Privacy API via setTrackingConsent.
 *  - Merchant-added Google tags: Google Consent Mode v2 defaults (denied)
 *    seeded before any gtag runs, granted on consent.
 *  - Merchant-added Meta Pixel: fbq consent revoke/grant.
 *
 * No cookies are read or written by this script. Silent by default —
 * add ?cm_debug=1 to any storefront URL for a console decision trace.
 */
(function () {
  'use strict';

  var DEBUG = window.location.href.indexOf('cm_debug') !== -1;
  function dbg() {
    if (DEBUG && window.console) {
      console.log.apply(
        console,
        ['[Consent Matters]'].concat([].slice.call(arguments))
      );
    }
  }

  var cfg = null;
  var priorConsent = {};
  var signalsSeeded = false;
  var styleInjected = false;
  var bannerEl = null;
  var modalEl = null;
  var reopenEl = null;

  // --- Blocking signals ---
  // Seeded before merchant tags can run; granted only after consent.

  function seedSignals() {
    if (signalsSeeded) return;
    signalsSeeded = true;
    // The liquid embed seeds synchronously before theme tags run; this
    // path only fires if that inline script was somehow absent.
    if (window.__cmSeeded) return;
    window.__cmSeeded = true;
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    });

    if (!window.fbq) {
      var fbqStub = (window.fbq = function () {
        fbqStub.callMethod
          ? fbqStub.callMethod.apply(fbqStub, arguments)
          : fbqStub.queue.push(arguments);
      });
      if (!window._fbq) window._fbq = fbqStub;
      fbqStub.push = fbqStub;
      fbqStub.loaded = true;
      fbqStub.version = '2.0';
      fbqStub.queue = [];
    }
    window.fbq('consent', 'revoke');
    dbg('blocking signals seeded (all denied)');
  }

  // consent values are 'yes' | 'no' | '' per category
  function applySignals(consent) {
    if (!signalsSeeded) return;
    var analytics = consent.analytics === 'yes';
    var marketing = consent.marketing === 'yes';
    dbg('applying signals', { analytics: analytics, marketing: marketing });
    window.gtag('consent', 'update', {
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      analytics_storage: analytics ? 'granted' : 'denied'
    });
    window.fbq('consent', marketing ? 'grant' : 'revoke');
  }

  var GRANTED_ALL = { marketing: 'yes', analytics: 'yes', preferences: 'yes' };

  // --- Shopify Customer Privacy API ---

  function whenPrivacyReady(cb) {
    if (window.Shopify && window.Shopify.customerPrivacy) {
      cb(window.Shopify.customerPrivacy);
      return;
    }
    if (window.Shopify && window.Shopify.loadFeatures) {
      window.Shopify.loadFeatures(
        [{ name: 'consent-tracking-api', version: '0.1' }],
        function (error) {
          if (!error && window.Shopify.customerPrivacy) {
            cb(window.Shopify.customerPrivacy);
          } else {
            // Fail closed: no banner, signals stay denied.
            dbg('customer privacy API failed to load', error);
          }
        }
      );
    } else {
      dbg('Shopify.loadFeatures unavailable — failing closed');
    }
  }

  function bannerRequired(customerPrivacy) {
    if (cfg.tm === 'all') return true;
    if (cfg.tm === 'custom') {
      var region = '';
      try {
        region = customerPrivacy.getRegion() || '';
      } catch (e) {
        /* fail safe */
      }
      var country = String(region).slice(0, 2).toUpperCase();
      var allowed = String(cfg.cc || '').split(',');
      dbg('custom targeting', { country: country, allowed: allowed });
      if (!country) return true;
      return allowed.indexOf(country) !== -1;
    }
    try {
      var fn =
        customerPrivacy.shouldShowBanner || customerPrivacy.shouldShowGDPRBanner;
      var required = fn ? !!fn.call(customerPrivacy) : true;
      dbg('auto targeting, shouldShowBanner()=', required);
      return required;
    } catch (e) {
      return true;
    }
  }

  function setConsent(customerPrivacy, values, done) {
    var payload = {
      marketing: !!values.marketing,
      analytics: !!values.analytics,
      preferences: !!values.preferences,
      // Respect Global Privacy Control: a recorded sale_of_data opt-out
      // (auto-set by GPC browsers) is never overridden by Accept.
      sale_of_data: !!values.marketing && priorConsent.sale_of_data !== 'no'
    };
    dbg('setTrackingConsent', payload);
    try {
      customerPrivacy.setTrackingConsent(payload, function () {
        applySignals({
          marketing: payload.marketing ? 'yes' : 'no',
          analytics: payload.analytics ? 'yes' : 'no'
        });
        done();
      });
    } catch (e) {
      dbg('setTrackingConsent threw', e);
      done();
    }
  }

  // --- UI ---

  function theme() {
    var bg = cfg.bg || '#ffffff';
    var tx = cfg.tx || '#202223';
    var bb = cfg.bb || '#111213';
    var bt = cfg.bt || '#ffffff';
    if (cfg.auto) {
      try {
        var s = getComputedStyle(document.body);
        var bodyBg = s.backgroundColor;
        bg =
          bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent'
            ? bodyBg
            : '#ffffff';
        tx = s.color || '#202223';
        bb = tx;
        bt = bg;
      } catch (e) {
        /* fail safe */
      }
    }
    return { bg: bg, tx: tx, bb: bb, bt: bt };
  }

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css =
      '.cm-root{position:fixed;z-index:2147483647;font:inherit;font-size:14px;line-height:1.5;box-shadow:0 4px 24px rgba(0,0,0,.18)}' +
      '.cm-bar-bottom{left:0;right:0;bottom:0}' +
      '.cm-bar-top{left:0;right:0;top:0}' +
      '.cm-card-left{left:16px;bottom:16px;max-width:380px;border-radius:12px}' +
      '.cm-card-right{right:16px;bottom:16px;max-width:380px;border-radius:12px}' +
      '.cm-inner{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:16px 20px}' +
      '.cm-card-left .cm-inner,.cm-card-right .cm-inner{flex-direction:column;align-items:stretch}' +
      '.cm-msg{margin:0;flex:1 1 240px}' +
      '.cm-card-left .cm-msg,.cm-card-right .cm-msg{flex:0 0 auto}' +
      '.cm-msg a{color:inherit;text-decoration:underline}' +
      '.cm-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
      '.cm-card-left .cm-actions,.cm-card-right .cm-actions{justify-content:flex-end}' +
      '.cm-root button,.cm-overlay button{font:inherit;font-size:14px;padding:9px 18px;border-radius:8px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;transition:opacity .12s ease}' +
      '.cm-root button:hover,.cm-overlay button:hover{opacity:.85}' +
      '.cm-root button.cm-accept,.cm-overlay button.cm-accept{border-color:transparent}' +
      '.cm-root button.cm-link,.cm-overlay button.cm-link{border:none;background:none;text-decoration:underline;padding:9px 6px;opacity:.85}' +
      '.cm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.cm-modal{max-width:440px;width:100%;border-radius:12px;padding:22px;font:inherit;font-size:14px;line-height:1.5;max-height:90vh;overflow:auto}' +
      '.cm-modal h2{margin:0 0 6px;font-size:17px}' +
      '.cm-modal p{margin:0 0 14px;opacity:.85}' +
      '.cm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(128,128,128,.25)}' +
      '.cm-row div{flex:1}' +
      '.cm-row strong{display:block;font-weight:600}' +
      '.cm-row span{opacity:.75;font-size:12.5px}' +
      '.cm-row input{width:20px;height:20px;accent-color:currentColor;cursor:pointer}' +
      '.cm-modal .cm-actions{margin-top:16px;justify-content:flex-end}' +
      '.cm-reopen{position:fixed;z-index:2147483646;left:16px;bottom:16px;display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;line-height:1;padding:9px 14px 9px 10px;border-radius:999px;cursor:pointer;border:1px solid rgba(128,128,128,.25);box-shadow:0 2px 12px rgba(0,0,0,.14);transition:transform .15s ease,box-shadow .15s ease;opacity:.92}' +
      '.cm-reopen:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.2);opacity:1}' +
      '.cm-reopen svg{width:15px;height:15px;flex:none}' +
      '@media (max-width:600px){.cm-inner{padding:14px}.cm-card-left,.cm-card-right{left:10px;right:10px;max-width:none}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function onBody(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Render merchant rich text into `target` keeping only an allowlist of
  // tags (second sanitize layer; the server already sanitized on save).
  var RICH_ALLOWED = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, P: 1, BR: 1, A: 1 };
  function renderRichText(target, html, fallback) {
    var doc;
    try {
      doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    } catch (e) {
      target.textContent = fallback;
      return;
    }
    var appended = false;
    function walk(node, parent) {
      var children = node.childNodes;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.nodeType === 3) {
          if (child.nodeValue) {
            parent.appendChild(document.createTextNode(child.nodeValue));
            appended = true;
          }
        } else if (child.nodeType === 1 && RICH_ALLOWED[child.tagName]) {
          var el = document.createElement(child.tagName.toLowerCase());
          if (child.tagName === 'A') {
            var href = child.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(href)) {
              walk(child, parent);
              continue;
            }
            el.setAttribute('href', href);
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener');
          }
          parent.appendChild(el);
          walk(child, el);
          appended = true;
        } else if (child.nodeType === 1) {
          // Disallowed element: keep its text, drop the tag
          walk(child, parent);
        }
      }
    }
    walk(doc.body, target);
    if (!appended) target.textContent = fallback;
  }

  function removeBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  function removeModal() {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    modalEl = null;
  }

  function showReopen(customerPrivacy) {
    if (!cfg.reopen || reopenEl) return;
    injectStyles();
    var t = theme();
    reopenEl = document.createElement('button');
    reopenEl.type = 'button';
    reopenEl.className = 'cm-reopen';
    // Static cookie glyph (no user content) + merchant label via textContent.
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute(
      'd',
      'M12 2a10 10 0 1 0 9.95 11a1 1 0 0 0-1.35-.9a3.5 3.5 0 0 1-4.7-4.7a1 1 0 0 0-.9-1.35A10 10 0 0 0 12 2Z'
    );
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    var dots = [
      [9, 9, 1.2],
      [8.5, 14.5, 1.2],
      [13.5, 13, 1.2]
    ];
    svg.appendChild(path);
    for (var i = 0; i < dots.length; i++) {
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', dots[i][0]);
      c.setAttribute('cy', dots[i][1]);
      c.setAttribute('r', dots[i][2]);
      c.setAttribute('fill', 'currentColor');
      svg.appendChild(c);
    }
    reopenEl.appendChild(svg);
    reopenEl.appendChild(
      document.createTextNode(cfg.rl || 'Cookie settings')
    );
    reopenEl.setAttribute('aria-label', cfg.rl || 'Cookie settings');
    reopenEl.style.background = t.bg;
    reopenEl.style.color = t.tx;
    reopenEl.addEventListener('click', function () {
      openModal(customerPrivacy);
    });
    onBody(function () {
      document.body.appendChild(reopenEl);
    });
  }

  function openModal(customerPrivacy) {
    if (modalEl) return;
    injectStyles();
    var t = theme();

    var current = {};
    try {
      current = customerPrivacy.currentVisitorConsent() || {};
    } catch (e) {
      /* fail safe */
    }

    modalEl = document.createElement('div');
    modalEl.className = 'cm-overlay';

    var modal = document.createElement('div');
    modal.className = 'cm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Privacy preferences');
    modal.style.background = t.bg;
    modal.style.color = t.tx;

    var title = document.createElement('h2');
    title.textContent = cfg.mt || 'Privacy preferences';
    modal.appendChild(title);

    var intro = document.createElement('p');
    renderRichText(
      intro,
      cfg.mi,
      'Choose which cookies you allow. Essential cookies are always on — the store cannot work without them.'
    );
    modal.appendChild(intro);

    function row(name, desc, checked, disabled) {
      var r = document.createElement('div');
      r.className = 'cm-row';
      var info = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = name;
      var span = document.createElement('span');
      span.textContent = desc;
      info.appendChild(strong);
      info.appendChild(span);
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.disabled = !!disabled;
      input.setAttribute('aria-label', name);
      r.appendChild(info);
      r.appendChild(input);
      modal.appendChild(r);
      return input;
    }

    row('Essential', 'Required for checkout, cart, and security.', true, true);
    var analyticsInput = row(
      'Analytics',
      'Helps the store understand how visitors use it.',
      current.analytics !== 'no'
    );
    var marketingInput = row(
      'Marketing',
      'Used for advertising and campaign measurement.',
      current.marketing !== 'no'
    );
    var prefsInput = row(
      'Personalization',
      'Remembers your choices, like language or region.',
      current.preferences !== 'no'
    );

    var actions = document.createElement('div');
    actions.className = 'cm-actions';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = cfg.sv || 'Save choices';

    var acceptAllBtn = document.createElement('button');
    acceptAllBtn.type = 'button';
    acceptAllBtn.className = 'cm-accept';
    acceptAllBtn.textContent = cfg.aa || 'Accept all';
    acceptAllBtn.style.background = t.bb;
    acceptAllBtn.style.color = t.bt;

    actions.appendChild(saveBtn);
    actions.appendChild(acceptAllBtn);
    modal.appendChild(actions);
    modalEl.appendChild(modal);

    function finish() {
      removeModal();
      removeBanner();
      showReopen(customerPrivacy);
    }

    saveBtn.addEventListener('click', function () {
      setConsent(
        customerPrivacy,
        {
          analytics: analyticsInput.checked,
          marketing: marketingInput.checked,
          preferences: prefsInput.checked
        },
        finish
      );
    });
    acceptAllBtn.addEventListener('click', function () {
      setConsent(
        customerPrivacy,
        { analytics: true, marketing: true, preferences: true },
        finish
      );
    });
    modalEl.addEventListener('click', function (event) {
      if (event.target === modalEl) removeModal();
    });

    onBody(function () {
      document.body.appendChild(modalEl);
      saveBtn.focus();
    });
  }

  function renderBanner(customerPrivacy) {
    if (bannerEl) return;
    injectStyles();
    var t = theme();
    var pos = cfg.pos || 'bar-bottom';

    bannerEl = document.createElement('div');
    bannerEl.className = 'cm-root cm-' + pos;
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-live', 'polite');
    bannerEl.setAttribute('aria-label', 'Cookie consent');
    bannerEl.style.background = t.bg;
    bannerEl.style.color = t.tx;

    var inner = document.createElement('div');
    inner.className = 'cm-inner';

    // Merchant rich text renders through the allowlist walker — raw
    // innerHTML is never used.
    var msg = document.createElement('p');
    msg.className = 'cm-msg';
    renderRichText(
      msg,
      cfg.msg,
      'We use cookies to improve your experience.'
    );
    if (cfg.link) {
      msg.appendChild(document.createTextNode(' '));
      var learn = document.createElement('a');
      learn.href = cfg.link;
      learn.textContent = 'Learn more';
      msg.appendChild(learn);
    }
    inner.appendChild(msg);

    var actions = document.createElement('div');
    actions.className = 'cm-actions';

    var prefsBtn = document.createElement('button');
    prefsBtn.type = 'button';
    prefsBtn.className = 'cm-link';
    prefsBtn.textContent = cfg.pf || 'Manage preferences';

    var declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.textContent = cfg.no || 'Decline';

    var acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'cm-accept';
    acceptBtn.textContent = cfg.ok || 'Accept';
    acceptBtn.style.background = t.bb;
    acceptBtn.style.color = t.bt;

    actions.appendChild(prefsBtn);
    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);
    inner.appendChild(actions);
    bannerEl.appendChild(inner);

    function finish() {
      removeBanner();
      showReopen(customerPrivacy);
    }

    acceptBtn.addEventListener('click', function () {
      setConsent(
        customerPrivacy,
        { analytics: true, marketing: true, preferences: true },
        finish
      );
    });
    declineBtn.addEventListener('click', function () {
      setConsent(
        customerPrivacy,
        { analytics: false, marketing: false, preferences: false },
        finish
      );
    });
    prefsBtn.addEventListener('click', function () {
      openModal(customerPrivacy);
    });

    onBody(function () {
      document.body.appendChild(bannerEl);
    });
    dbg('banner rendered', pos);
  }

  // --- Main flow ---

  function main(customerPrivacy) {
    var consent = {};
    try {
      consent = customerPrivacy.currentVisitorConsent() || {};
    } catch (e) {
      /* fail safe */
    }
    dbg('prior consent', consent);
    priorConsent = consent;

    // Merchant preview: always show the banner so layout and colors can
    // be checked regardless of the visitor's stored consent state.
    if (window.location.href.indexOf('cm_preview') !== -1) {
      dbg('preview mode — forcing banner');
      renderBanner(customerPrivacy);
      return;
    }

    // sale_of_data is deliberately excluded: Global Privacy Control
    // browsers make Shopify auto-record it as 'no', which must not count
    // as the visitor having answered the banner.
    var decided = false;
    var keys = ['marketing', 'analytics', 'preferences'];
    for (var i = 0; i < keys.length; i++) {
      var v = consent[keys[i]];
      if (v === 'yes' || v === 'no') decided = true;
    }

    if (decided) {
      dbg('visitor already decided — honoring stored choice');
      applySignals(consent);
      showReopen(customerPrivacy);
    } else if (bannerRequired(customerPrivacy)) {
      renderBanner(customerPrivacy);
    } else {
      // Consent not required in this region: let merchant tags run.
      // We never call setTrackingConsent without a visitor interaction.
      dbg('banner not required for this region — releasing signals');
      applySignals(GRANTED_ALL);
    }

    document.addEventListener('visitorConsentCollected', function () {
      dbg('visitorConsentCollected');
      try {
        applySignals(customerPrivacy.currentVisitorConsent() || {});
      } catch (e) {
        /* fail safe */
      }
    });
  }

  function start(config) {
    cfg = config;
    dbg('config loaded', cfg);
    whenPrivacyReady(main);
  }

  // --- Entry: inline metafield config, falling back to the app proxy ---

  var inline = null;
  var cfgEl = document.getElementById('cm-cfg');
  if (cfgEl) {
    try {
      inline = JSON.parse(cfgEl.textContent);
    } catch (e) {
      dbg('inline config failed to parse', e);
    }
  }

  if (inline && typeof inline.en !== 'undefined') {
    if (inline.en !== 1) {
      dbg('banner disabled in app settings');
      return;
    }
    seedSignals();
    start(inline);
  } else if (window.fetch) {
    // Config unknown: block first (privacy-safe), resolve via proxy.
    seedSignals();
    dbg('inline config empty — fetching from app proxy');
    window
      .fetch('/apps/consent-matters/config.json', {
        headers: { Accept: 'application/json' }
      })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (json) {
        if (json && json.en === 1) {
          dbg('proxy config received');
          start(json);
        } else {
          // App unconfigured or disabled: step aside so merchant tags
          // behave as if the app weren't installed.
          dbg('config unavailable or disabled — releasing signals');
          applySignals(GRANTED_ALL);
        }
      })
      .catch(function (error) {
        dbg('proxy fetch failed — releasing signals', error);
        applySignals(GRANTED_ALL);
      });
  }
})();
