/**
 * POST /api/tracking/event
 * Endpoint de ingestão do t3-pixel.js.
 * Recebe eventos de visitantes anônimos e leads identificados.
 *
 * Segurança:
 *  - Rate limit por IP: 120 req/min por instância serverless
 *  - Validação de payload com tamanho máximo
 *  - CORS aberto (necessário para sites de clientes em domínios diferentes)
 */
import { scoreLead } from '../../../lib/scoring-engine';
import {
  ensureLeadsDB, ensureEventsDB,
  findLeadByEmail, findLeadByVisitorId,
  createLead, updateLeadScore, logEvent,
  getLeadEvents,
} from '../../../lib/notion-leads';

export const config = { maxDuration: 30 };

// ── Rate limiting por IP (instância-local) ────────────────────────────────────
const RL_WINDOW_MS = 60_000;
const RL_MAX       = 120;
const rlMap        = new Map(); // ip → { count, resetAt }

function checkRateLimit(ip) {
  const now  = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).end();

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Muitas requisições. Tente novamente.' });

  // Valida tamanho do payload (10KB max)
  const rawBody = JSON.stringify(req.body || {});
  if (rawBody.length > 10_240) return res.status(413).json({ error: 'Payload muito grande.' });

  const {
    visitorId,
    clientId,
    type,             // 'page_view' | 'form_submit' | 'whatsapp_click'
    page,
    utmSource, utmMedium, utmCampaign, utmContent,
    nome, email, telefone,
  } = req.body || {};

  // Campos obrigatórios mínimos
  if (!visitorId || !type) {
    return res.status(400).json({ error: 'visitorId e type são obrigatórios.' });
  }

  // Sanitização básica
  const safeStr  = s => (typeof s === 'string' ? s.slice(0, 500) : '');
  const safeType = ['page_view', 'form_submit', 'whatsapp_click'].includes(type) ? type : 'page_view';

  // Monta dados base do evento
  const eventData = {
    tipo:        safeType,
    visitorId:   safeStr(visitorId),
    clienteId:   safeStr(clientId),
    pagina:      safeStr(page),
    utmSource:   safeStr(utmSource),
    utmCampaign: safeStr(utmCampaign),
  };

  try {
    // Garante que os DBs existem (lazy init)
    await Promise.all([ensureLeadsDB(), ensureEventsDB()]);

    const hasContact = email?.trim() || telefone?.trim();

    if (hasContact || safeType !== 'page_view') {
      // ── Evento com identificação → criar/atualizar lead ───────────────────
      let leadPage = null;

      // 1. Tenta encontrar lead existente por email
      if (email?.trim()) {
        leadPage = await findLeadByEmail(email.trim());
      }
      // 2. Ou por visitor_id
      if (!leadPage && visitorId) {
        leadPage = await findLeadByVisitorId(visitorId);
      }

      // 3. Determina a origem
      const origem = safeType === 'whatsapp_click' ? 'WhatsApp'
        : safeType === 'form_submit'               ? 'Formulário Site'
        : 'Orgânico';

      // 4. Recupera eventos anteriores deste visitor para calcular score
      const previousEvents = leadPage
        ? await getLeadEvents(leadPage.id, safeStr(visitorId))
        : await getLeadEvents(null, safeStr(visitorId));

      const allEvents = [...previousEvents, { tipo: safeType, pagina: safeStr(page) }];

      const leadData = {
        utmSource:   safeStr(utmSource),
        utmMedium:   safeStr(utmMedium),
        utmCampaign: safeStr(utmCampaign),
        utmContent:  safeStr(utmContent),
        origem,
      };
      const { score, temperatura } = scoreLead(leadData, allEvents);

      if (!leadPage) {
        // Cria novo lead
        leadPage = await createLead({
          nome:        safeStr(nome) || 'Lead Anônimo',
          email:       email?.trim().toLowerCase(),
          telefone:    safeStr(telefone),
          score,
          temperatura,
          status:      'Novo',
          origem,
          clienteId:   safeStr(clientId),
          visitorId:   safeStr(visitorId),
          utmSource:   safeStr(utmSource),
          utmMedium:   safeStr(utmMedium),
          utmCampaign: safeStr(utmCampaign),
          utmContent:  safeStr(utmContent),
          pagina:      safeStr(page),
        });
      } else {
        // Atualiza score do lead existente
        await updateLeadScore(leadPage.id, { score, temperatura });
      }

      // Registra o evento com o leadId vinculado
      await logEvent({ ...eventData, leadId: leadPage.id });
      return res.status(200).json({ ok: true, leadId: leadPage.id, score, temperatura });

    } else {
      // ── Evento anônimo (page_view) → apenas loga ──────────────────────────
      await logEvent(eventData);
      return res.status(200).json({ ok: true });
    }

  } catch (err) {
    console.error('tracking/event error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Erro interno.' });
  }
}
