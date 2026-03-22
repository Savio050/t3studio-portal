import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1,
    });

    if (response.results.length === 0) {
      return res.status(200).json({ message: 'No pages found', properties: [] });
    }

    const page = response.results[0];
    const propNames = Object.keys(page.properties).map(key => ({
      name: key,
      type: page.properties[key].type,
    }));

    return res.status(200).json({ properties: propNames });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
