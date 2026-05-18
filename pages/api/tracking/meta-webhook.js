/**
 * GET  /api/tracking/meta-webhook — Verificação de handshake do Meta
 * POST /api/tracking/meta-webhook — Recebimento de leads nativos do Meta Lead Ads
 *
 * Setup no Meta Business Manager:
 *  1. Acesse: Business Manager → Webhooks → Adicionar produto → Lead Ads
 *  2. URL do Callback: https://portal.t3studio.com.br/api/tracking/meta-webhook?client=NOME_CLIENTE
 *  3. Token de Verificação: valor de META_VERIFY_TOKEN no .env
 *  4. Selecionar campo: "leadgen"
 *
 * Variáveis de ambiente necessárias:
 *  META_VERIFY_TOKEN  — token que você define (ex: "t3studio2024")
 *  META_ACCESS_TOKEN  — Page Access Token de longa duração do Meta
 */
import { scoreLead } from '../../../lib/scoring-engine';
import {
  ensureLeadsDB, ensureEventsDB,
  findLeadByEmail, createLead, updateLeadScore, logEvent,
} from '../../../lib/notion-leads';

export const config = { maxDuration: 30 };

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

// ── Busca dados do lead no Graph API ─────────────────────────────────────────
async function fetchMetaLead(leadgenId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado.');

  const res = await fetch(
    `${META_GRAPH_URL}/${leadgenId}?fields=field_data,created_time,ad_id,campaign_id,form_id&access_token=${token}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph API error ${res.status}`);
  }
  return res.json();
}

// Extrai campos do array field_data do Meta
function extractField(fieldData = [], names = []) {
  for (const name of names) {
    const field = fieldData.find(f => f.name === name);
    if (field?.values?.[0]) return field.values[0];
  }
  return '';
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // ── GET: Verificação de token (handshake Meta) ────────────────────────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      console.log('✅ Meta webhook verificado com sucesso.');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Token de verificação inválido.' });
  }

  // ── POST: Recebimento de leads ────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).end();

  const clientId = req.query.client || '';

  let body;
  try { body = req.body || {}; } catch { body = {}; }

  // Confirma imediatamente para o Meta (evita retentativas)
  res.status(200).json({ ok: true });

  // Processa em background (sem bloquear a resposta)
  setImmediate(async () => {
    try {
      if (body.object !== 'page') return;
      await Promise.all([ensureLeadsDB(), ensureEventsDB()]);

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'leadgen') continue;

          const { leadgen_id, ad_id, campaign_id } = change.value || {};
          if (!leadgen_id) continue;

          // Busca dados reais do lead via Graph API
          const metaLead  = await fetchMetaLead(leadgen_id).catch(e => {
            console.error('Meta Graph API error:', e.message); return null;
          });
          if (!metaLead) continue;

          const fields    = metaLead.field_data || [];
          const nome      = extractField(fields, ['full_name', 'name', 'first_name']);
          const email     = extractField(fields, ['email']);
          const telefone  = extractField(fields, ['phone_number', 'phone', 'telefone']);

          // Verifica se lead já existe
          let leadPage = email ? await findLeadByEmail(email) : null;

          const leadData = { utmSource: 'meta', utmMedium: 'cpc', utmCampaign: campaign_id || '' };
          const eventos  = [{ tipo: 'meta_lead' }];
          const { score, temperatura } = scoreLead(leadData, eventos);

          if (!leadPage) {
            leadPage = await createLead({
              nome:        nome || 'Lead Meta',
              email:       email?.toLowerCase(),
              telefone,
              score,
              temperatura,
              status:      'Novo',
              origem:      'Meta Ads',
              clienteId:   clientId,
              utmSource:   'meta',
              utmMedium:   'cpc',
              utmCampaign: campaign_id || '',
            });
          } else {
            await updateLeadScore(leadPage.id, { score, temperatura });
          }

          await logEvent({
            tipo:        'meta_lead',
            leadId:      leadPage.id,
            clienteId:   clientId,
            utmSource:   'meta',
            utmCampaign: campaign_id || '',
            dados:       JSON.stringify({ leadgen_id, ad_id, campaign_id }),
          });

          console.log(`✅ Lead Meta processado: ${nome || email} | Score: ${score}`);
        }
      }
    } catch (err) {
      console.error('meta-webhook processing error:', err?.message || err);
    }
  });
}
