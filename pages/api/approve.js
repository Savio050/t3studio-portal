import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Cria o payload correto para atualizar uma propriedade de status no Notion,
 * detectando automaticamente se o campo é do tipo "status" ou "select".
 */
async function buildStatusPayload(pageId, columnName, value) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const prop = page.properties[columnName];

  if (!prop) throw new Error(`Campo "${columnName}" não encontrado na página do Notion`);

  if (prop.type === 'status') return { [columnName]: { status: { name: value } } };
  if (prop.type === 'select') return { [columnName]: { select: { name: value } } };

  throw new Error(`Tipo de campo "${prop.type}" não suportado para "${columnName}"`);
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { pageId, target } = body;

    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    const columnName = target === 'roteiro' ? 'EstadoRoteiro' : 'Estado';
    const properties = await buildStatusPayload(pageId, columnName, 'Aprovado');

    await notion.pages.update({ page_id: pageId, properties });

    return res.status(200).json({ success: true });
  } catch (error) {
    const msg = error.body ? error.body.message : error.message;
    console.error('ERRO NOTION (approve):', msg);
    return res.status(500).json({ erro_no_notion: msg });
  }
}
