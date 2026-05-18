/**
 * GET  /api/crm/leads          — Lista leads para o dashboard Kanban
 * PATCH /api/crm/leads         — Atualiza status (Kanban drag)
 * GET  /api/crm/leads?id=X     — Busca lead + timeline de eventos
 */
import { getToken } from 'next-auth/jwt';
import {
  queryLeads,
  getLeadEvents,
  updateLeadStatus,
} from '../../../lib/notion-leads';

export default async function handler(req, res) {
  // Autenticação obrigatória
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  // ── GET: Lista leads ou detalhe de um lead ────────────────────────────────
  if (req.method === 'GET') {
    const { id, clientId, status, temperatura } = req.query;

    try {
      // Detalhe: lead + timeline de eventos
      if (id) {
        const events = await getLeadEvents(id, null, 50);
        return res.status(200).json({ events });
      }

      // Lista com filtros opcionais
      const leads = await queryLeads({ clienteId: clientId, status, temperatura });

      // Calcula stats
      const total       = leads.length;
      const quentes     = leads.filter(l => l.temperatura === '🔥 Quente').length;
      const mornos      = leads.filter(l => l.temperatura === '🌡️ Morno').length;
      const taxaQuente  = total > 0 ? Math.round((quentes / total) * 100) : 0;
      const novos       = leads.filter(l => l.status === 'Novo').length;
      const fechados    = leads.filter(l => l.status === 'Fechado').length;

      return res.status(200).json({
        leads,
        stats: { total, quentes, mornos, taxaQuente, novos, fechados },
      });
    } catch (err) {
      console.error('leads GET error:', err?.message);
      return res.status(500).json({ error: err?.message || 'Erro ao buscar leads.' });
    }
  }

  // ── PATCH: Atualiza status no Kanban ─────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'id e status são obrigatórios.' });

    const allowed = ['Novo', 'Em Atendimento', 'Negociação Avançada', 'Fechado', 'Perdido'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido.' });

    try {
      await updateLeadStatus(id, status);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('leads PATCH error:', err?.message);
      return res.status(500).json({ error: err?.message || 'Erro ao atualizar lead.' });
    }
  }

  return res.status(405).end();
}
