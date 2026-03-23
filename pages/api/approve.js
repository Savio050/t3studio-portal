import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { pageId, target } = req.body; // target será 'roteiro' ou 'video'
  if (!pageId) return res.status(400).json({ error: 'pageId is required' });

  const columnName = target === 'roteiro' ? 'EstadoRoteiro' : 'Estado';

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: { [columnName]: { status: { name: 'Aprovado' } } },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
