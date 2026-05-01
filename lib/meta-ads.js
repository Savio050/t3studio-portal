/**
 * lib/meta-ads.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente para a API de Marketing do Meta (Graph API v20.0).
 * Divide claramente as operações de LEITURA (seguras) das de ESCRITA (destrutivas).
 *
 * Variáveis de ambiente necessárias:
 *   META_ACCESS_TOKEN  — Token de Usuário do Sistema (Business Manager)
 *
 * Documentação: https://developers.facebook.com/docs/marketing-api
 */

const BASE_URL = 'https://graph.facebook.com/v20.0';

// Campos padrão retornados nas campanhas
const CAMPAIGN_FIELDS = [
  'id', 'name', 'status', 'effective_status',
  'objective', 'daily_budget', 'lifetime_budget',
  'start_time', 'stop_time', 'created_time',
].join(',');

// Campos padrão de métricas (insights)
const INSIGHTS_FIELDS = [
  'campaign_name', 'campaign_id',
  'impressions', 'clicks', 'spend',
  'ctr', 'cpc', 'cpp', 'reach', 'frequency', 'actions',
].join(',');

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Garante o formato act_XXXXXXXXX para IDs de conta
 */
function normalizeAccountId(id) {
  if (!id) throw new Error('ad_account_id é obrigatório.');
  return String(id).startsWith('act_') ? id : `act_${id}`;
}

/**
 * Realiza uma requisição GET à Graph API com tratamento de erros padronizado.
 */
async function metaGet(path, params = {}) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado no Vercel.');

  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set('access_token', token);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json();

  // A Graph API sempre retorna 200 mas coloca erros no campo "error"
  if (data.error) {
    const { message, code, error_subcode } = data.error;
    throw new Error(`Meta API (${code}${error_subcode ? `/${error_subcode}` : ''}): ${message}`);
  }
  return data;
}

/**
 * Realiza uma requisição POST à Graph API com tratamento de erros padronizado.
 */
async function metaPost(path, body = {}) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado no Vercel.');

  const url = `${BASE_URL}/${path}`;
  const form = new URLSearchParams({ access_token: token });
  Object.entries(body).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await res.json();

  if (data.error) {
    const { message, code, error_subcode } = data.error;
    throw new Error(`Meta API (${code}${error_subcode ? `/${error_subcode}` : ''}): ${message}`);
  }
  return data;
}

// ── OPERAÇÕES DE LEITURA (seguras — executadas imediatamente) ─────────────────

/**
 * Lista campanhas de uma conta de anúncios.
 * @param {string} adAccountId  — ID da conta (ex: act_123456789 ou 123456789)
 * @param {string} status       — 'ACTIVE' | 'PAUSED' | 'ALL'
 */
export async function listCampaigns(adAccountId, status = 'ALL') {
  const accountId = normalizeAccountId(adAccountId);
  const params = { fields: CAMPAIGN_FIELDS, limit: 50 };

  // O filtro de status é passado como JSON array
  if (status !== 'ALL') {
    params.effective_status = JSON.stringify([status]);
  }

  const data = await metaGet(`${accountId}/campaigns`, params);

  // Formata orçamento de centavos para reais
  return (data.data || []).map(c => ({
    ...c,
    daily_budget_brl: c.daily_budget ? (Number(c.daily_budget) / 100).toFixed(2) : null,
    lifetime_budget_brl: c.lifetime_budget ? (Number(c.lifetime_budget) / 100).toFixed(2) : null,
  }));
}

/**
 * Obtém métricas (insights) de uma campanha específica.
 * @param {string} campaignId  — ID da campanha
 * @param {string} datePreset  — 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'
 */
export async function getCampaignInsights(campaignId, datePreset = 'last_30d') {
  const data = await metaGet(`${campaignId}/insights`, {
    fields: INSIGHTS_FIELDS,
    date_preset: datePreset,
  });
  return data.data?.[0] || { message: 'Sem dados para o período.' };
}

/**
 * Obtém métricas de todas as campanhas de uma conta no nível de campanha.
 * @param {string} adAccountId
 * @param {string} datePreset
 */
export async function getAccountInsights(adAccountId, datePreset = 'last_30d') {
  const accountId = normalizeAccountId(adAccountId);
  const data = await metaGet(`${accountId}/insights`, {
    fields: INSIGHTS_FIELDS,
    date_preset: datePreset,
    level: 'campaign',
    limit: 50,
  });
  return data.data || [];
}

// ── OPERAÇÕES DE ESCRITA (destrutivas — exigem aprovação humana) ──────────────

/**
 * ⚠️  AÇÃO DESTRUTIVA — Altera o orçamento diário de uma campanha.
 * A Meta Ads API aceita o orçamento em CENTAVOS (R$50,00 → 5000).
 * @param {string} campaignId   — ID da campanha
 * @param {number} dailyBudget  — Orçamento em REAIS (ex: 50.00)
 */
export async function updateCampaignBudget(campaignId, dailyBudget) {
  const centavos = Math.round(Number(dailyBudget) * 100);
  if (centavos < 100) throw new Error('Orçamento mínimo é R$ 1,00/dia (100 centavos).');
  return metaPost(campaignId, { daily_budget: centavos });
}

/**
 * ⚠️  AÇÃO DESTRUTIVA — Pausa ou ativa uma campanha.
 * @param {string} campaignId  — ID da campanha
 * @param {string} status      — 'ACTIVE' | 'PAUSED'
 */
export async function updateCampaignStatus(campaignId, status) {
  const validStatuses = ['ACTIVE', 'PAUSED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Status inválido. Use: ${validStatuses.join(' ou ')}.`);
  }
  return metaPost(campaignId, { status });
}

/**
 * ⚠️  AÇÃO DESTRUTIVA — Cria uma nova campanha (inicia PAUSADA por segurança).
 * @param {string} adAccountId
 * @param {object} params       — { name, objective, dailyBudget?, status? }
 */
export async function createCampaign(adAccountId, { name, objective, dailyBudget, status = 'PAUSED' }) {
  const accountId = normalizeAccountId(adAccountId);

  const body = {
    name,
    objective,
    status,                       // SEMPRE inicia pausada por segurança
    special_ad_categories: '[]',  // Array JSON obrigatório
  };

  if (dailyBudget) {
    body.daily_budget = Math.round(Number(dailyBudget) * 100);
  }

  return metaPost(`${accountId}/campaigns`, body);
}

// ── Descrições legíveis para o ApprovalCard ───────────────────────────────────

/**
 * Gera um objeto de descrição humanizada para o card de aprovação.
 * Chamado pelo backend antes de devolver o pendingAction ao frontend.
 */
export function buildActionDescription(tool, args) {
  const fmt = (v) => v !== undefined && v !== null ? String(v) : '—';

  switch (tool) {
    case 'update_meta_budget':
      return {
        title:   'Alterar Orçamento de Campanha',
        warning: 'Esta ação irá alterar o orçamento diário real de uma campanha ativa no Meta Ads. Os gastos mudarão imediatamente.',
        params: [
          { label: 'ID da Campanha',        value: fmt(args.campaign_id)  },
          { label: 'Novo orçamento diário', value: `R$ ${Number(args.daily_budget).toFixed(2)}/dia` },
        ],
      };

    case 'update_meta_status':
      return {
        title:   args.status === 'PAUSED' ? 'Pausar Campanha' : 'Ativar Campanha',
        warning: args.status === 'PAUSED'
          ? 'Esta ação irá PAUSAR a campanha — os anúncios deixarão de ser veiculados imediatamente.'
          : 'Esta ação irá ATIVAR a campanha — os anúncios começarão a ser veiculados e o orçamento será consumido.',
        params: [
          { label: 'ID da Campanha', value: fmt(args.campaign_id)                          },
          { label: 'Novo status',    value: args.status === 'PAUSED' ? '⏸ Pausada' : '▶ Ativa' },
        ],
      };

    case 'create_meta_campaign':
      return {
        title:   'Criar Nova Campanha',
        warning: 'Esta ação irá criar uma nova campanha no Meta Ads. A campanha iniciará PAUSADA e precisará ser ativada manualmente.',
        params: [
          { label: 'Nome',              value: fmt(args.name)          },
          { label: 'Objetivo',          value: fmt(args.objective)     },
          { label: 'Conta (account)',   value: fmt(args.ad_account_id) },
          { label: 'Orçamento diário',  value: args.daily_budget ? `R$ ${Number(args.daily_budget).toFixed(2)}/dia` : 'Não definido' },
        ],
      };

    default:
      return {
        title:   tool,
        warning: 'Ação no Meta Ads que requer confirmação.',
        params:  Object.entries(args).map(([k, v]) => ({ label: k, value: fmt(v) })),
      };
  }
}
