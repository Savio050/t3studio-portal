/**
 * /api/crm/meta-campaigns
 * ──────────────────────────────────────────────────────────────────────────────
 * GET  — lista campanhas da conta + insights do período
 * POST — executa ação de escrita aprovada pelo usuário (status / budget)
 *
 * Variáveis de ambiente necessárias:
 *   META_ACCESS_TOKEN    — token da API do Meta Ads
 *   META_AD_ACCOUNT_ID   — ID da conta de anúncios (ex: act_123456789)
 */
import { getToken } from 'next-auth/jwt';
import {
  listCampaigns,
  getAccountInsights,
  updateCampaignBudget,
  updateCampaignStatus,
} from '../../../lib/meta-ads';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // ── Autenticação ─────────────────────────────────────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  // ── Verifica configuração ────────────────────────────────────────────────────
  const accountId = process.env.META_AD_ACCOUNT_ID;
  if (!accountId) {
    return res.status(400).json({
      error: 'META_AD_ACCOUNT_ID não configurado.',
      missingConfig: true,
      hint: 'Adicione a variável META_AD_ACCOUNT_ID no painel do Vercel (ex: act_123456789).',
    });
  }

  // ── GET: busca campanhas + insights ──────────────────────────────────────────
  if (req.method === 'GET') {
    const { status = 'ALL', date_preset = 'last_30d' } = req.query;
    try {
      const [campaigns, insights] = await Promise.all([
        listCampaigns(accountId, status),
        getAccountInsights(accountId, date_preset).catch(() => []),
      ]);

      // Monta mapa de insights por campaign_id para merge eficiente
      const insightMap = {};
      insights.forEach(i => { if (i.campaign_id) insightMap[i.campaign_id] = i; });

      const merged = campaigns.map(c => ({
        ...c,
        insights: insightMap[c.id] || null,
      }));

      return res.status(200).json({ campaigns: merged, account_id: accountId });
    } catch (err) {
      console.error('meta-campaigns GET error:', err?.message);
      return res.status(500).json({ error: err?.message || 'Erro ao buscar campanhas do Meta Ads.' });
    }
  }

  // ── POST: executa ação de escrita (aprovada pelo usuário no frontend) ─────────
  if (req.method === 'POST') {
    const { action, campaign_id, daily_budget, status } = req.body || {};

    if (!action)      return res.status(400).json({ error: 'action é obrigatório.' });
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id é obrigatório.' });

    try {
      let result;

      if (action === 'update_budget') {
        if (daily_budget == null) return res.status(400).json({ error: 'daily_budget é obrigatório.' });
        result = await updateCampaignBudget(campaign_id, Number(daily_budget));

      } else if (action === 'update_status') {
        if (!status) return res.status(400).json({ error: 'status é obrigatório.' });
        result = await updateCampaignStatus(campaign_id, status);

      } else {
        return res.status(400).json({ error: `Ação desconhecida: "${action}".` });
      }

      return res.status(200).json({ ok: true, result });
    } catch (err) {
      console.error('meta-campaigns POST error:', err?.message);
      return res.status(500).json({ error: err?.message || 'Erro ao executar ação no Meta Ads.' });
    }
  }

  return res.status(405).end();
}
