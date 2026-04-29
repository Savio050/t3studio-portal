/**
 * /api/crm/finance — Financial transactions CRUD
 * Notion DB fields: Nome (title), Tipo (select), Categoria (select),
 * Valor (number), Data (date), Cliente (rich_text), Responsavel (rich_text),
 * Status (select), Notas (rich_text)
 */
import { Client } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId } from '../../../lib/notionId';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FINANCE_DB = sanitizeNotionId(process.env.NOTION_FINANCE_DB_ID);

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return prop.title?.[0]?.plain_text     || '';
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'select':    return prop.select?.name               || null;
    case 'number':    return prop.number                     ?? null;
    case 'date':      return prop.date?.start                || null;
    default:          return null;
  }
}

function mapTx(page) {
  return {
    id:          page.id,
    nome:        getProp(page.properties['Nome'])        || '',
    tipo:        getProp(page.properties['Tipo'])        || 'Despesa',
    categoria:   getProp(page.properties['Categoria'])   || 'Outros',
    valor:       getProp(page.properties['Valor'])       || 0,
    data:        getProp(page.properties['Data'])        || null,
    cliente:     getProp(page.properties['Cliente'])     || '',
    responsavel: getProp(page.properties['Responsavel']) || '',
    status:      getProp(page.properties['Status'])      || 'Confirmado',
    notas:       getProp(page.properties['Notas'])       || '',
  };
}

function buildProps({ nome, tipo, categoria, valor, data, cliente, responsavel, status, notas }) {
  const props = {};
  if (nome        !== undefined) props['Nome']        = { title:     [{ text: { content: String(nome || '') } }] };
  if (tipo        !== undefined) props['Tipo']        = { select:    { name: tipo        || 'Despesa' } };
  if (categoria   !== undefined) props['Categoria']   = { select:    { name: categoria   || 'Outros'  } };
  if (valor       !== undefined) props['Valor']       = { number:    Number(valor) || 0 };
  if (data        !== undefined) props['Data']        = { date:      data ? { start: data } : null };
  if (cliente     !== undefined) props['Cliente']     = { rich_text: [{ text: { content: String(cliente     || '') } }] };
  if (responsavel !== undefined) props['Responsavel'] = { rich_text: [{ text: { content: String(responsavel || '') } }] };
  if (status      !== undefined) props['Status']      = { select:    { name: status      || 'Confirmado' } };
  if (notas       !== undefined) props['Notas']       = { rich_text: [{ text: { content: String(notas       || '') } }] };
  return props;
}

export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  if (!FINANCE_DB) {
    return res.status(503).json({
      error: 'NOTION_FINANCE_DB_ID não configurado.',
      setup: 'Crie um banco Notion com os campos: Nome (título), Tipo (select), Categoria (select), Valor (número), Data (data), Cliente (texto), Responsavel (texto), Status (select), Notas (texto). Adicione a variável NOTION_FINANCE_DB_ID no Vercel.',
    });
  }

  // ── GET: list transactions ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const pages = [];
      let cursor;
      do {
        const r = await notion.databases.query({
          database_id: FINANCE_DB,
          sorts: [{ property: 'Data', direction: 'descending' }],
          ...(cursor ? { start_cursor: cursor } : {}),
          page_size: 100,
        });
        pages.push(...r.results);
        cursor = r.has_more ? r.next_cursor : null;
      } while (cursor);

      return res.status(200).json({ transactions: pages.map(mapTx) });
    } catch (err) {
      console.error('Finance GET error:', err?.message);
      return res.status(500).json({ error: 'Erro ao buscar transações: ' + (err?.message || '') });
    }
  }

  // ── POST: create transaction ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!body.valor)        return res.status(400).json({ error: 'Valor é obrigatório.' });

    try {
      const page = await notion.pages.create({
        parent: { database_id: FINANCE_DB },
        properties: buildProps(body),
      });
      return res.status(201).json({ transaction: mapTx(page) });
    } catch (err) {
      console.error('Finance POST error:', err?.message);
      return res.status(500).json({ error: 'Erro ao criar transação: ' + (err?.message || '') });
    }
  }

  // ── PATCH: update transaction ───────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    try {
      const page = await notion.pages.update({
        page_id: id,
        properties: buildProps(fields),
      });
      return res.status(200).json({ transaction: mapTx(page) });
    } catch (err) {
      console.error('Finance PATCH error:', err?.message);
      return res.status(500).json({ error: 'Erro ao atualizar transação: ' + (err?.message || '') });
    }
  }

  // ── DELETE: archive transaction ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    try {
      await notion.pages.update({ page_id: id, archived: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Finance DELETE error:', err?.message);
      return res.status(500).json({ error: 'Erro ao remover transação: ' + (err?.message || '') });
    }
  }

  return res.status(405).end();
}
