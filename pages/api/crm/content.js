import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const CONTENT_DB = process.env.NOTION_CONTENT_DB_ID || '329f7ecb-bb9b-8018-b303-f2175c7cbb21';

function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || '';
    case 'select':       return prop.select?.name || '';
    case 'multi_select': return prop.multi_select?.map(i => i.name).join(', ') || '';
    case 'status':       return prop.status?.name || '';
    case 'date':         return prop.date?.start || null;
    case 'url':          return prop.url || null;
    case 'formula':      return prop.formula?.string || prop.formula?.number || null;
    default:             return null;
  }
}

async function queryAll(dbId) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'Postagem', direction: 'ascending' }],
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

function mapContent(page) {
  const p = page.properties;
  return {
    id:               page.id,
    nome:             getProp(p['Nome'])               || 'Sem título',
    cliente:          getProp(p['Cliente'])             || '',
    formato:          getProp(p['Formato'])             || '',
    categoria:        getProp(p['Categoria'])           || '',
    responsavel:      getProp(p['responsável'])         || '',
    dataGravacao:     getProp(p['Data de Gravação'])    || null,
    postagem:         getProp(p['Postagem'])            || null,
    mesRelativo:      getProp(p['Relativo ao mês de']) || '',
    conteudo:         getProp(p['Roteiro'])              || '',
    estadoRoteiro:    getProp(p['EstadoRoteiro'])       || '',
    estado:           getProp(p['Estado'])              || '',
    feedbackRoteiro:  getProp(p['Feedback do Roteiro']) || '',
    feedbackCliente:  getProp(p['Feedback do Cliente']) || '',
    linkFicheiro:     getProp(p['Link do Ficheiro'])    || null,
    linkCapa:         getProp(p['Link da Capa'])        || null,
    linkCapa2:        getProp(p['linkcapa2'])           || null,
    galeria:          getProp(p['Galeria'])             || '',
    linkDrive:        getProp(p['Link Drive'])          || null,
    idCliente:        getProp(p['ID do Cliente'])       || '',
    portalLink:       getProp(p['FórmulaLink Portal do Cliente']) || null,
    plataforma:       getProp(p['Plataforma']) || '',
  };
}

export default async function handler(req, res) {
  // ── POST: create new content item ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nome, cliente, formato, responsavel, postagem, dataGravacao, mesRelativo } = req.body || {};
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    try {
      const properties = {
        'Nome': { title: [{ text: { content: nome.trim() } }] },
      };
      if (cliente)       properties['Cliente']              = { select: { name: cliente } };
      if (formato)       properties['Formato']              = { select: { name: formato } };
      if (responsavel)   properties['responsável']          = { select: { name: responsavel } };
      if (postagem)      properties['Postagem']             = { date: { start: postagem } };
      if (dataGravacao)  properties['Data de Gravação']     = { date: { start: dataGravacao } };
      if (mesRelativo)   properties['Relativo ao mês de']  = { rich_text: [{ text: { content: mesRelativo } }] };

      const page = await notion.pages.create({
        parent: { database_id: CONTENT_DB },
        properties,
      });
      return res.status(201).json({ content: mapContent(page) });
    } catch (err) {
      console.error('Content POST error:', err);
      return res.status(500).json({ error: 'Failed to create content' });
    }
  }

  // ── DELETE: archive content item ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    try {
      await notion.pages.update({ page_id: id, archived: true });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Content DELETE error:', err);
      return res.status(500).json({ error: 'Failed to delete content' });
    }
  }

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { cliente, mes } = req.query;
    try {
      let pages = await queryAll(CONTENT_DB);

      // Filter by client
      if (cliente) {
        pages = pages.filter(p => {
          const c = getProp(p.properties['Cliente']) || '';
          return c.toLowerCase() === cliente.toLowerCase();
        });
      }

      // Filter by month label
      if (mes) {
        pages = pages.filter(p => {
          const m = getProp(p.properties['Relativo ao mês de']) || '';
          return m.toLowerCase().includes(mes.toLowerCase());
        });
      }

      return res.status(200).json({ content: pages.map(mapContent) });
    } catch (err) {
      console.error('Content GET error:', err);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  }

  // ── PATCH: update any editable field ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const {
      id, estado, estadoRoteiro, feedbackCliente, feedbackRoteiro,
      postagem, responsavel, nome, conteudo, galeria, linkDrive,
      linkFicheiro, linkCapa, plataforma,
    } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

    try {
      const properties = {};
      if (estado)                    properties['Estado']              = { select: { name: estado } };
      if (estadoRoteiro)             properties['EstadoRoteiro']       = { status: { name: estadoRoteiro } };
      if (feedbackCliente)           properties['Feedback do Cliente'] = { rich_text: [{ text: { content: feedbackCliente } }] };
      if (feedbackRoteiro)           properties['Feedback do Roteiro'] = { rich_text: [{ text: { content: feedbackRoteiro } }] };
      if (postagem)                  properties['Postagem']            = { date: { start: postagem } };
      if (responsavel)               properties['responsável']         = { select: { name: responsavel } };
      if (nome?.trim())              properties['Nome']                = { title: [{ text: { content: nome.trim() } }] };
      if (conteudo !== undefined)     properties['Roteiro']             = { rich_text: [{ text: { content: conteudo } }] };
      if (galeria !== undefined)     properties['Galeria']             = { rich_text: [{ text: { content: galeria } }] };
      if (linkDrive !== undefined)   properties['Link Drive']          = { url: linkDrive || null };
      if (linkFicheiro !== undefined) properties['Link do Ficheiro']   = { url: linkFicheiro || null };
      if (linkCapa !== undefined)     properties['Link da Capa']       = { url: linkCapa || null };
      if (plataforma !== undefined)   properties['Plataforma']         = { select: plataforma ? { name: plataforma } : null };

      const page = await notion.pages.update({ page_id: id, properties });
      return res.status(200).json({ content: mapContent(page) });
    } catch (err) {
      console.error('Content PATCH error:', err);
      return res.status(500).json({ error: 'Failed to update content' });
    }
  }

  return res.status(405).end();
}
