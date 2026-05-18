/**
 * lib/scoring-engine.js
 * Motor de Lead Scoring — cálculo isolado no servidor.
 * Sem efeitos colaterais, sem chamadas de rede — apenas lógica pura.
 */

// ── Pontos por tipo de evento ─────────────────────────────────────────────────
const EVENT_SCORES = {
  meta_lead:       40, // Lead nativo do Meta Ads
  form_submit:     40, // Formulário de contato/orçamento no site
  whatsapp_click:  25, // Clique em botão de WhatsApp
  page_view:       10, // Visualização de página estratégica (ver isStrategicPage)
};

// ── Pontos por origem de tráfego ──────────────────────────────────────────────
const SOURCE_SCORES = {
  paid:     30, // Tráfego pago identificado (cpc, paid, meta, google, instagram)
  social:   15, // Redes sociais orgânicas
  referral: 10, // Indicação / referral
  organic:  10, // Busca orgânica
  direct:   15, // Acesso direto (alto intento)
  whatsapp: 30, // WhatsApp direto (alta conversão)
};

// ── Páginas estratégicas ──────────────────────────────────────────────────────
// Palavras-chave que indicam intenção de compra
const STRATEGIC_KEYWORDS = [
  'preco', 'precos', 'pricing', 'plano', 'planos',
  'orcamento', 'contato', 'contact', 'fale',
  'imovel', 'imoveis', 'apartamento', 'casa', 'lote',
  'produto', 'produtos', 'servico', 'servicos',
  'pacote', 'pacotes', 'assinar', 'contratar',
];

/**
 * Verifica se uma URL/caminho é uma página estratégica (alta intenção).
 */
export function isStrategicPage(path = '') {
  const p = path.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return STRATEGIC_KEYWORDS.some(kw => p.includes(kw));
}

/**
 * Determina os pontos da origem de tráfego a partir de UTM source/medium.
 */
function scoreSource(utmSource = '', utmMedium = '') {
  const src = (utmSource + ' ' + utmMedium).toLowerCase();

  if (/cpc|paid|meta|instagram|facebook|google|tiktok/.test(src)) return SOURCE_SCORES.paid;
  if (/whatsapp/.test(src))                                         return SOURCE_SCORES.whatsapp;
  if (/social|instagram|twitter|youtube/.test(src))                 return SOURCE_SCORES.social;
  if (/referral|indica/.test(src))                                  return SOURCE_SCORES.referral;
  if (/organic|seo/.test(src))                                      return SOURCE_SCORES.organic;
  if (!utmSource || utmSource === 'direct')                         return SOURCE_SCORES.direct;
  return SOURCE_SCORES.organic;
}

/**
 * Calcula o score total com base no lead e seus eventos históricos.
 *
 * @param {{ utmSource?: string, utmMedium?: string }} lead
 * @param {Array<{ tipo: string, pagina?: string }>} events
 * @returns {number} pontuação total (máx 200)
 */
export function calculateScore(lead = {}, events = []) {
  let score = 0;

  // Pontos pela origem
  score += scoreSource(lead.utmSource || '', lead.utmMedium || '');

  // Pontos pelos eventos
  for (const evt of events) {
    const tipo = (evt.tipo || evt.type || '').toLowerCase();

    if (tipo === 'page_view') {
      // Só pontua se for página estratégica
      if (isStrategicPage(evt.pagina || evt.page || '')) {
        score += EVENT_SCORES.page_view;
      }
    } else if (EVENT_SCORES[tipo] !== undefined) {
      score += EVENT_SCORES[tipo];
    }
  }

  return Math.min(score, 200);
}

/**
 * Retorna a temperatura legível com base na pontuação.
 *
 * @param {number} score
 * @returns {string}
 */
export function getTemperature(score) {
  if (score >= 70) return '🔥 Quente';
  if (score >= 30) return '🌡️ Morno';
  return '❄️ Frio';
}

/**
 * Avalia um lead e retorna { score, temperatura }.
 * Função principal chamada pelas API routes.
 */
export function scoreLead(lead = {}, events = []) {
  const score       = calculateScore(lead, events);
  const temperatura = getTemperature(score);
  return { score, temperatura };
}
