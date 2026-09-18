/* On Mange Quoi — consentement cookies + Google Analytics (GA4)
   Plausible Analytics (sans cookies) reste toujours actif, indépendamment de ce script.
   Google Analytics n'est chargé qu'après consentement explicite (RGPD/CNIL). */
(function () {
  "use strict";

  var GA_ID = "G-4K1X7KMKWE";
  var STORAGE_KEY = "omq_consent_analytics";

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  function getConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* localStorage indisponible (navigation privée...) : on ne bloque pas l'affichage */
    }
  }

  function injectStyles() {
    if (document.getElementById("omq-consent-style")) return;
    var css = [
      "#omq-consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;",
      "background:#FAF7F2;border-top:1px solid #E8E1D3;",
      "font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;",
      "box-shadow:0 -4px 24px rgba(20,17,13,0.12);}",
      "#omq-consent-banner .omq-inner{max-width:960px;margin:0 auto;padding:1.1rem 1.25rem;",
      "display:flex;flex-wrap:wrap;align-items:center;gap:1rem;}",
      "#omq-consent-banner p{flex:1 1 320px;margin:0;font-size:0.92rem;line-height:1.5;color:#14110D;}",
      "#omq-consent-banner a{color:#1B4332;text-decoration:underline;}",
      "#omq-consent-banner .omq-actions{display:flex;gap:0.6rem;flex-wrap:wrap;}",
      "#omq-consent-banner button{font-family:inherit;font-size:0.88rem;font-weight:600;",
      "padding:0.6rem 1.1rem;border-radius:8px;cursor:pointer;border:1.5px solid #1B4332;",
      "line-height:1.2;}",
      "#omq-consent-banner .omq-accept{background:#1B4332;color:#FAF7F2;}",
      "#omq-consent-banner .omq-refuse{background:transparent;color:#1B4332;}",
      "#omq-consent-manage{position:fixed;left:14px;bottom:14px;z-index:9998;",
      "font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;font-size:0.72rem;",
      "color:#6B6359;background:#FAF7F2;border:1px solid #E8E1D3;border-radius:6px;",
      "padding:0.3rem 0.6rem;cursor:pointer;opacity:0.85;}",
      "#omq-consent-manage:hover{opacity:1;}",
      "@media (max-width:560px){#omq-consent-banner .omq-inner{flex-direction:column;",
      "align-items:stretch;}#omq-consent-banner .omq-actions{justify-content:stretch;}",
      "#omq-consent-banner button{flex:1;}}"
    ].join("");
    var style = document.createElement("style");
    style.id = "omq-consent-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showBanner() {
    injectStyles();
    if (document.getElementById("omq-consent-banner")) return;
    var el = document.createElement("div");
    el.id = "omq-consent-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Consentement cookies");
    el.innerHTML =
      '<div class="omq-inner">' +
      "<p>On mange quoi ? utilise Google Analytics pour mieux comprendre la fréquentation du site (statistiques anonymisées). " +
      'Vous pouvez accepter ou refuser à tout moment. <a href="/politique-confidentialite.html">En savoir plus</a>.</p>' +
      '<div class="omq-actions">' +
      '<button type="button" class="omq-refuse">Refuser</button>' +
      '<button type="button" class="omq-accept">Accepter</button>' +
      "</div></div>";
    document.body.appendChild(el);

    el.querySelector(".omq-accept").addEventListener("click", function () {
      setConsent("granted");
      loadGA();
      el.remove();
    });
    el.querySelector(".omq-refuse").addEventListener("click", function () {
      setConsent("denied");
      el.remove();
    });
  }

  function showManageLink() {
    if (document.getElementById("omq-consent-manage")) return;
    var btn = document.createElement("button");
    btn.id = "omq-consent-manage";
    btn.type = "button";
    btn.textContent = "Gérer les cookies";
    btn.addEventListener("click", function () {
      var existing = document.getElementById("omq-consent-banner");
      if (existing) existing.remove();
      showBanner();
    });
    document.body.appendChild(btn);
  }

  function init() {
    var consent = getConsent();
    if (consent === "granted") {
      loadGA();
    } else if (consent !== "denied") {
      showBanner();
    }
    showManageLink();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
