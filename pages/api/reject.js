import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageId, feedback } = req.body;

  if (!pageId || !feedback) {
    return res.status(400).json({ error: 'pageId and feedback are required' });
  }

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Estado': {
          select: {
            name: 'Ajuste Solicitado',
          },
        },
        'Feedback do Cliente': {
          rich_text: [
            {
              text: {
                content: feedback,
              },
            },
          ],
        },
      },
    });

    return res.status(200).json({ success: true, message: 'Ajuste solicitado com sucesso' });
  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({ error: 'Failed to request adjustment', details: error.message });
  }
}
