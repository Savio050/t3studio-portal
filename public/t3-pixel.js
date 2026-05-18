/**
 * T3 Pixel — Script de Rastreamento de Leads
 * Versão: 1.0.0
 *
 * Instalação:
 *   1. Defina as variáveis de configuração ANTES de carregar o script:
 *      <script>
 *        window.T3_CLIENT_ID = 'nome-do-cliente';  // ex: 'fastimoveis'
 *        window.T3_API_URL   = 'https://portal.t3studio.com.br';
 *      </script>
 *      <script src="https://portal.t3studio.com.br/t3-pixel.js" async></script>
 *
 *   2. Para rastrear formulários automaticamente, não é necessária nenhuma
 *      configuração adicional — o script intercepta todos os <form> da página.
 *
 *   3. Para disparar eventos manualmente:
 *      window.t3track('whatsapp_click', { nome: 'João', telefone: '65999...' });
 */
(function () {
  'use strict';

  var CFG = {
    clientId:  window.T3_CLIENT_ID || 'desconhecido',
    apiUrl:    (window.T3_API_URL || '').replace(/\/$/, ''),
    endpoint:  '/api/tracking/event',
    sessionKey: 't3_utms',
    visitorKey: 't3_visitor_id',
    debug:      window.T3_DEBUG === true,
  };

  if (!CFG.apiUrl) {
    console.warn('[T3 Pixel] T3_API_URL não definido. O rastreamento não funcionará.');
    return;
  }

  // ── Geração de Visitor ID ──────────────────────────────────────────────────
  function getVisitorId() {
    try {
      var id = localStorage.getItem(CFG.visitorKey);
      if (id) return id;
      id = 't3_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
      localStorage.setItem(CFG.visitorKey, id);
      return id;
    } catch (e) {
      return 't3_' + Math.random().toString(36).slice(2);
    }
  }

  // ── Captura de UTMs ────────────────────────────────────────────────────────
  function captureUTMs() {
    try {
      var params = new URLSearchParams(window.location.search);
      var utms = {
        utm_source:   params.get('utm_source')   || '',
        utm_medium:   params.get('utm_medium')   || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content:  params.get('utm_content')  || '',
      };
      // Salva UTMs apenas se vieram da URL (não sobrescreve sessão existente)
      var existing = JSON.parse(sessionStorage.getItem(CFG.sessionKey) || 'null');
      if (utms.utm_source && !existing) {
        sessionStorage.setItem(CFG.sessionKey, JSON.stringify(utms));
        return utms;
      }
      return existing || utms;
    } catch (e) {
      return {};
    }
  }

  function getStoredUTMs() {
    try {
      return JSON.parse(sessionStorage.getItem(CFG.sessionKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  // ── Envio de evento ────────────────────────────────────────────────────────
  var pendingEvents = [];
  var isSending = false;

  function flushEvents() {
    if (isSending || !pendingEvents.length) return;
    isSending = true;
    var evt = pendingEvents.shift();
    fetch(CFG.apiUrl + CFG.endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(evt),
      keepalive: true,
    })
    .then(function () {
      if (CFG.debug) console.log('[T3 Pixel] Enviado:', evt.type);
    })
    .catch(function (e) {
      if (CFG.debug) console.warn('[T3 Pixel] Falha ao enviar:', e);
    })
    .finally(function () {
      isSending = false;
      if (pendingEvents.length) setTimeout(flushEvents, 200);
    });
  }

  function sendEvent(type, extra) {
    var utms = getStoredUTMs();
    var payload = Object.assign({
      visitorId:   getVisitorId(),
      clientId:    CFG.clientId,
      type:        type,
      page:        window.location.pathname,
      utmSource:   utms.utm_source   || '',
      utmMedium:   utms.utm_medium   || '',
      utmCampaign: utms.utm_campaign || '',
      utmContent:  utms.utm_content  || '',
    }, extra || {});

    pendingEvents.push(payload);
    flushEvents();
  }

  // API pública para disparo manual
  window.t3track = sendEvent;

  // ── Extrai texto de entrada em formulários ─────────────────────────────────
  function extractFormData(form) {
    var data = { nome: '', email: '', telefone: '' };
    var inputs = form.querySelectorAll('input, select, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var el    = inputs[i];
      var name  = (el.name || el.id || el.placeholder || '').toLowerCase();
      var value = (el.value || '').trim();
      if (!value) continue;

      if (/email|e-mail/.test(name))                    data.email    = value;
      else if (/tel|phone|celular|whatsapp/.test(name)) data.telefone = value;
      else if (/nome|name|full/.test(name))             data.nome     = value;
    }
    return data;
  }

  // ── Rastreamento de formulários ────────────────────────────────────────────
  function attachFormListeners() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form._t3tracked) return;
      form._t3tracked = true;

      form.addEventListener('submit', function (e) {
        var fd = extractFormData(form);
        sendEvent('form_submit', fd);
      }, { passive: true });
    });
  }

  // ── Rastreamento de cliques em WhatsApp ───────────────────────────────────
  function attachWhatsAppListeners() {
    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(function (el) {
      if (el._t3tracked) return;
      el._t3tracked = true;

      el.addEventListener('click', function () {
        // Tenta extrair telefone da URL do WhatsApp
        var href = el.href || '';
        var match = href.match(/wa\.me\/(\d+)|whatsapp\.com\/send\?phone=(\d+)/);
        var telefone = match ? (match[1] || match[2] || '') : '';
        sendEvent('whatsapp_click', { telefone: telefone });
      }, { passive: true });
    });
  }

  // ── Observa novos elementos adicionados via JS (SPAs, popups) ─────────────
  var domObserver = new MutationObserver(function () {
    attachFormListeners();
    attachWhatsAppListeners();
  });

  // ── Inicialização ──────────────────────────────────────────────────────────
  function init() {
    captureUTMs();

    // Dispara page_view apenas em páginas estratégicas ou com UTMs
    var utms = getStoredUTMs();
    var path = window.location.pathname;
    var hasUTM = utms.utm_source;
    var strategic = /preco|precos|orcamento|contato|imovel|produto|servico|pacote|plano/i.test(path);

    if (hasUTM || strategic) {
      sendEvent('page_view', {});
    }

    attachFormListeners();
    attachWhatsAppListeners();

    domObserver.observe(document.body, { childList: true, subtree: true });

    if (CFG.debug) {
      console.log('[T3 Pixel] Iniciado. ClientID:', CFG.clientId, '| VisitorID:', getVisitorId());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
