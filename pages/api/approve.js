import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Garante que o servidor entenda o pedido, independente de como chegue
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { pageId, target } = body;

    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    const columnName = target === 'roteiro' ? 'EstadoRoteiro' : 'Estado';

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [columnName]: {
          status: { name: 'Aprovado' }
        }
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    // Captura o erro exato que o Notion devolver
    const errorMessage = error.body ? error.body.message : error.message;
    console.error("ERRO NOTION:", errorMessage);
    return res.status(500).json({ erro_no_notion: errorMessage });
  }
}
