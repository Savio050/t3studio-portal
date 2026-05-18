/**
 * lib/notion-leads.js
 * Camada de acesso ao Notion para Leads e Eventos de rastreamento.
 * Auto-cria as duas bases de dados na primeira execução.
 */
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ── Cache de IDs de DB (duração do processo serverless) ───────────────────────
let _leadsDbId  = process.env.NOTION_LEADS_DB_ID  || null;
let _eventsDbId = process.env.NOTION_EVENTS_DB_ID || null;

// ── Helpers de propriedades ───────────────────────────────────────────────────
export function getProp(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.map(b => b.plain_text).join('')     || '';
    case 'rich_text':    return prop.rich_text?.map(b => b.plain_text).join('') || '';
    case 'select':       return prop.select?.name                                || '';
    case 'number':       return prop.number                                      ?? null;
    case 'email':        return prop.email                                       || null;
    case 'phone_number': return prop.phone_number                                || null;
    case 'date':         return prop.date?.start                                 || null;
    case 'created_time': return prop.created_time                                || null;
    default:             return null;
  }
}

function rt(text) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000)
    chunks.push({ text: { content: String(text).slice(i, i + 2000) } });
  return chunks;
}

// Retorna o ID de uma página pai acessível pela integração
async function getParentPageId() {
  const res = await notion.search({
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  });
  if (!res.results.length) throw new Error(
    'A integração não tem acesso a nenhuma página no Notion. ' +
    'Compartilhe ao menos uma página com a integração T3 Studio.'
  );
  return res.results[0].id;
}

// ── Auto-criação: Leads DB ─────────────────────────────────────────────────────
export async function ensureLeadsDB() {
  if (_leadsDbId) {
    try { await notion.databases.retrieve({ database_id: _leadsDbId }); return _leadsDbId; }
    catch { _leadsDbId = null; }
  }

  // Busca existente
  const search = await notion.search({
    query: 'T3 Leads',
    filter: { value: 'database', property: 'object' },
    page_size: 5,
  });
  const found = search.results.find(r =>
    r.object === 'database' && (r.title?.[0]?.plain_text || '').trim() === 'T3 Leads'
  );
  if (found) { _leadsDbId = found.id; return _leadsDbId; }

  // Cria novo
  const parentId = await getParentPageId();
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentId },
    title: [{ type: 'text', text: { content: 'T3 Leads' } }],
    properties: {
      'Nome':               { title: {} },
      'Email':              { email: {} },
      'Telefone':           { phone_number: {} },
      'Score':              { number: { format: 'number' } },
      'Temperatura':        { select: { options: [
        { name: '🔥 Quente', color: 'red'    },
        { name: '🌡️ Morno',  color: 'orange' },
        { name: '❄️ Frio',   color: 'blue'   },
      ]}},
      'Status':             { select: { options: [
        { name: 'Novo',               color: 'blue'   },
        { name: 'Em Atendimento',     color: 'purple' },
        { name: 'Negociação Avançada',color: 'orange' },
        { name: 'Fechado',            color: 'green'  },
        { name: 'Perdido',            color: 'gray'   },
      ]}},
      'Origem':             { select: { options: [
        { name: 'Meta Ads',       color: 'blue'   },
        { name: 'Formulário Site',color: 'green'  },
        { name: 'WhatsApp',       color: 'green'  },
        { name: 'Orgânico',       color: 'gray'   },
      ]}},
      'Cliente':            { rich_text: {} },
      'Visitor ID':         { rich_text: {} },
      'UTM Source':         { rich_text: {} },
      'UTM Medium':         { rich_text: {} },
      'UTM Campaign':       { rich_text: {} },
      'UTM Content':        { rich_text: {} },
      'Página de Conversão':{ rich_text: {} },
    },
  });
  _leadsDbId = db.id;
  console.log('✅ T3 Leads DB criada. ID:', db.id);
  return _leadsDbId;
}

// ── Auto-criação: Eventos DB ───────────────────────────────────────────────────
export async function ensureEventsDB() {
  if (_eventsDbId) {
    try { await notion.databases.retrieve({ database_id: _eventsDbId }); return _eventsDbId; }
    catch { _eventsDbId = null; }
  }

  const search = await notion.search({
    query: 'T3 Eventos de Rastreamento',
    filter: { value: 'database', property: 'object' },
    page_size: 5,
  });
  const found = search.results.find(r =>
    r.object === 'database' &&
    (r.title?.[0]?.plain_text || '').trim() === 'T3 Eventos de Rastreamento'
  );
  if (found) { _eventsDbId = found.id; return _eventsDbId; }

  const parentId = await getParentPageId();
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentId },
    title: [{ type: 'text', text: { content: 'T3 Eventos de Rastreamento' } }],
    properties: {
      'Evento':       { title: {} },
      'Lead ID':      { rich_text: {} },
      'Visitor ID':   { rich_text: {} },
      'Tipo':         { select: { options: [
        { name: 'page_view',      color: 'blue'   },
        { name: 'form_submit',    color: 'green'  },
        { name: 'whatsapp_click', color: 'green'  },
        { name: 'meta_lead',      color: 'orange' },
      ]}},
      'Página':       { rich_text: {} },
      'Cliente':      { rich_text: {} },
      'UTM Source':   { rich_text: {} },
      'UTM Campaign': { rich_text: {} },
      'Dados':        { rich_text: {} },
    },
  });
  _eventsDbId = db.id;
  console.log('✅ T3 Eventos DB criada. ID:', db.id);
  return _eventsDbId;
}

// ── Leads: criar ou atualizar ─────────────────────────────────────────────────
export async function findLeadByEmail(email) {
  if (!email) return null;
  const dbId = await ensureLeadsDB();
  try {
    const res = await notion.databases.query({
      database_id: dbId,
      filter: { property: 'Email', email: { equals: email.toLowerCase() } },
      page_size: 1,
    });
    return res.results[0] || null;
  } catch { return null; }
}

export async function findLeadByVisitorId(visitorId) {
  if (!visitorId) return null;
  const dbId = await ensureLeadsDB();
  try {
    const res = await notion.databases.query({
      database_id: dbId,
      filter: {
        property: 'Visitor ID',
        rich_text: { equals: visitorId },
      },
      page_size: 1,
    });
    return res.results[0] || null;
  } catch { return null; }
}

/**
 * Cria um novo lead no Notion.
 * @param {{ nome, email, telefone, score, temperatura, status, origem, clienteId,
 *           visitorId, utmSource, utmMedium, utmCampaign, utmContent, pagina }} data
 */
export async function createLead(data) {
  const dbId = await ensureLeadsDB();
  const props = {
    'Nome':        { title: [{ text: { content: (data.nome || 'Lead Anônimo').slice(0, 200) } }] },
    'Score':       { number: data.score ?? 0 },
    'Temperatura': { select: { name: data.temperatura || '❄️ Frio' } },
    'Status':      { select: { name: data.status || 'Novo' } },
  };
  if (data.email)      props['Email']               = { email: data.email.toLowerCase() };
  if (data.telefone)   props['Telefone']            = { phone_number: data.telefone };
  if (data.origem)     props['Origem']              = { select: { name: data.origem } };
  if (data.clienteId)  props['Cliente']             = { rich_text: rt(data.clienteId) };
  if (data.visitorId)  props['Visitor ID']          = { rich_text: rt(data.visitorId) };
  if (data.utmSource)  props['UTM Source']          = { rich_text: rt(data.utmSource) };
  if (data.utmMedium)  props['UTM Medium']          = { rich_text: rt(data.utmMedium) };
  if (data.utmCampaign)props['UTM Campaign']        = { rich_text: rt(data.utmCampaign) };
  if (data.utmContent) props['UTM Content']         = { rich_text: rt(data.utmContent) };
  if (data.pagina)     props['Página de Conversão'] = { rich_text: rt(data.pagina) };

  return notion.pages.create({ parent: { database_id: dbId }, properties: props });
}

/**
 * Atualiza score, temperatura e opcionalmente status de um lead.
 */
export async function updateLeadScore(leadId, { score, temperatura, status }) {
  const props = {
    'Score':       { number: score },
    'Temperatura': { select: { name: temperatura } },
  };
  if (status) props['Status'] = { select: { name: status } };
  return notion.pages.update({ page_id: leadId, properties: props });
}

/**
 * Atualiza o status de Kanban de um lead.
 */
export async function updateLeadStatus(leadId, status) {
  return notion.pages.update({
    page_id: leadId,
    properties: { 'Status': { select: { name: status } } },
  });
}

/**
 * Renomeia um lead.
 */
export async function updateLeadName(leadId, nome) {
  return notion.pages.update({
    page_id: leadId,
    properties: {
      'Nome': { title: [{ text: { content: (nome || 'Lead Anônimo').slice(0, 200) } }] },
    },
  });
}

/**
 * Arquiva (exclui) um lead no Notion.
 */
export async function deleteLead(leadId) {
  return notion.pages.update({ page_id: leadId, archived: true });
}

// ── Eventos: criar e listar ───────────────────────────────────────────────────
/**
 * Registra um evento de rastreamento.
 */
export async function logEvent(data) {
  const dbId = await ensureEventsDB();
  const titulo = `${data.tipo || 'evento'} · ${(data.pagina || '/').slice(0, 50)}`;
  const props = {
    'Evento':     { title: [{ text: { content: titulo.slice(0, 200) } }] },
    'Visitor ID': { rich_text: rt(data.visitorId || '') },
    'Tipo':       { select: { name: data.tipo || 'page_view' } },
  };
  if (data.leadId)      props['Lead ID']      = { rich_text: rt(data.leadId) };
  if (data.pagina)      props['Página']       = { rich_text: rt(data.pagina) };
  if (data.clienteId)   props['Cliente']      = { rich_text: rt(data.clienteId) };
  if (data.utmSource)   props['UTM Source']   = { rich_text: rt(data.utmSource) };
  if (data.utmCampaign) props['UTM Campaign'] = { rich_text: rt(data.utmCampaign) };
  if (data.dados)       props['Dados']        = { rich_text: rt(
    typeof data.dados === 'string' ? data.dados : JSON.stringify(data.dados)
  )};
  return notion.pages.create({ parent: { database_id: dbId }, properties: props });
}

/**
 * Busca eventos de um lead (por leadId ou visitorId).
 */
export async function getLeadEvents(leadId, visitorId, limit = 30) {
  const dbId = await ensureEventsDB();
  const filters = [];
  if (leadId)    filters.push({ property: 'Lead ID',    rich_text: { equals: leadId } });
  if (visitorId) filters.push({ property: 'Visitor ID', rich_text: { equals: visitorId } });
  if (!filters.length) return [];

  try {
    const res = await notion.databases.query({
      database_id: dbId,
      filter: filters.length === 1 ? filters[0] : { or: filters },
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: limit,
    });
    return res.results.map(p => ({
      id:          p.id,
      tipo:        getProp(p.properties['Tipo'])       || 'page_view',
      pagina:      getProp(p.properties['Página'])     || '',
      utmSource:   getProp(p.properties['UTM Source']) || '',
      utmCampaign: getProp(p.properties['UTM Campaign']) || '',
      dados:       getProp(p.properties['Dados'])      || '',
      criadoEm:    p.created_time,
    }));
  } catch { return []; }
}

// ── Leads: listar para o dashboard ────────────────────────────────────────────
export async function queryLeads({ clienteId, status, temperatura } = {}) {
  const dbId = await ensureLeadsDB();
  const filters = [];
  if (clienteId)   filters.push({ property: 'Cliente',      rich_text: { equals: clienteId } });
  if (status)      filters.push({ property: 'Status',       select: { equals: status } });
  if (temperatura) filters.push({ property: 'Temperatura',  select: { equals: temperatura } });

  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      ...(filters.length ? { filter: filters.length === 1 ? filters[0] : { and: filters } } : {}),
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);

  return pages.map(p => ({
    id:          p.id,
    nome:        getProp(p.properties['Nome'])               || 'Lead Anônimo',
    email:       getProp(p.properties['Email'])              || '',
    telefone:    getProp(p.properties['Telefone'])           || '',
    score:       getProp(p.properties['Score'])              ?? 0,
    temperatura: getProp(p.properties['Temperatura'])        || '❄️ Frio',
    status:      getProp(p.properties['Status'])             || 'Novo',
    origem:      getProp(p.properties['Origem'])             || '',
    cliente:     getProp(p.properties['Cliente'])            || '',
    visitorId:   getProp(p.properties['Visitor ID'])         || '',
    utmSource:   getProp(p.properties['UTM Source'])         || '',
    utmMedium:   getProp(p.properties['UTM Medium'])         || '',
    utmCampaign: getProp(p.properties['UTM Campaign'])       || '',
    pagina:      getProp(p.properties['Página de Conversão'])|| '',
    criadoEm:    p.created_time,
  }));
}
