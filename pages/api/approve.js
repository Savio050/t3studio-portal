import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageId } = req.body;

  if (!pageId) {
    return res.status(400).json({ error: 'pageId is required' });
  }

  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Estado': {
          select: {
            name: 'Aprovado',
          },
        },
      },
    });

    return res.status(200).json({ success: true, message: 'Conteudo aprovado com sucesso' });
  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({ error: 'Failed to approve content', details: error.message });
  }
}
