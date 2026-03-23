import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { pageId, target, feedback } = req.body;
  if (!pageId || !feedback) return res.status(400).json({ error: 'pageId and feedback required' });

  const statusColumn = target === 'roteiro' ? 'EstadoRoteiro' : 'Estado';
  const feedbackColumn = target === 'roteiro' ? 'Feedback do Roteiro' : 'Feedback do Cliente';

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        [statusColumn]: { status: { name: 'Ajuste Solicitado' } },
        [feedbackColumn]: { rich_text: [{ text: { content: feedback } }] },
      },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
