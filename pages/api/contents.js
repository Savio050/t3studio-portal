import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'ID do Cliente',
        rich_text: {
          equals: clientId,
        },
      },
    });

    const contents = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        nome: props['Nome do Conteudo']?.title?.[0]?.plain_text || 'Sem titulo',
        dataGravacao: props['Data de Gravacao']?.date?.start || null,
        roteiro: props['Guiao / Roteiro']?.rich_text?.[0]?.plain_text || '',
        estado: props['Estado']?.select?.name || 'Pendente',
        linkFicheiro: props['Link do Ficheiro']?.url || null,
        feedbackCliente: props['Feedback do Cliente']?.rich_text?.[0]?.plain_text || '',
      };
    });

    const sorted = contents.sort((a, b) => {
      if (!a.dataGravacao) return 1;
      if (!b.dataGravacao) return -1;
      return new Date(a.dataGravacao) - new Date(b.dataGravacao);
    });

    return res.status(200).json({ contents: sorted });
  } catch (error) {
    console.error('Notion API error:', error);
    return res.status(500).json({ error: 'Failed to fetch contents', details: error.message });
  }
}
