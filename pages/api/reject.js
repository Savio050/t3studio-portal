import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Detecta se o campo é "status" ou "select" e retorna o payload correto.
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
    const { pageId, target, feedback } = body;

    if (!pageId || !feedback) return res.status(400).json({ error: 'pageId and feedback required' });

    const statusColumn   = target === 'roteiro' ? 'EstadoRoteiro'       : 'Estado';
    const feedbackColumn = target === 'roteiro' ? 'Feedback do Roteiro' : 'Feedback do Cliente';

    // Detecta tipo e monta payload do status
    const statusPayload = await buildStatusPayload(pageId, statusColumn, 'Ajuste Solicitado');

    await notion.pages.update({
      page_id: pageId,
      properties: {
        ...statusPayload,
        [feedbackColumn]: {
          rich_text: [{ text: { content: feedback } }],
        },
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    const msg = error.body ? error.body.message : error.message;
    console.error('ERRO NOTION (reject):', msg);
    return res.status(500).json({ erro_no_notion: msg });
  }
}
