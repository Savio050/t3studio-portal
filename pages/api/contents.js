import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

function getPropertyValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || '';
    case 'title': return prop.title?.[0]?.plain_text || '';
    case 'number': return String(prop.number ?? '');
    case 'select': return prop.select?.name || '';
    case 'date': return prop.date?.start || null;
    case 'url': return prop.url || null;
    default: return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = req.query.clientId || req.query.id;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId or id is required' });
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const allPages = response.results;

    const filtered = allPages.filter((page) => {
      const props = page.properties;
      const idProp = props['ID do Cliente'];
      if (!idProp) return false;
      const val = getPropertyValue(idProp);
      return val && val.toLowerCase() === clientId.toLowerCase();
    });

    const contents = filtered.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        nome: getPropertyValue(props['Nome']) || 'Sem titulo',
        dataGravacao: getPropertyValue(props['Data de Gravação']),
        roteiro: getPropertyValue(props['Roteiro']) || '',
        estado: getPropertyValue(props['Estado']) || 'Pendente',
        linkFicheiro: getPropertyValue(props['Link do Ficheiro']),
        feedbackCliente: getPropertyValue(props['Feedback do Cliente']) || '',
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
