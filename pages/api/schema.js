import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    if (response.results.length === 0) {
      return res.status(200).json({ 
        message: 'Database vazio',
        count: 0 
      });
    }

    // Pega o primeiro registro para mostrar o schema
    const firstPage = response.results[0];
    const properties = firstPage.properties;
    
    // Lista todas as propriedades disponíveis
    const propertyNames = Object.keys(properties);
    
    // Mostra detalhes de cada propriedade
    const propertyDetails = {};
    propertyNames.forEach(name => {
      propertyDetails[name] = {
        type: properties[name].type,
        id: properties[name].id
      };
    });

    return res.status(200).json({
      totalRecords: response.results.length,
      propertyNames,
      propertyDetails,
      sampleRecord: {
        id: firstPage.id,
        properties: Object.fromEntries(
          propertyNames.map(name => [
            name,
            JSON.stringify(properties[name])
          ])
        )
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
