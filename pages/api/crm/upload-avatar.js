/**
 * POST /api/crm/upload-avatar
 * Receives image binary, uploads to R2 server-side (no CORS),
 * saves the public URL to the user's Notion profile, returns { foto }.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client as NotionClient } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';

export const config = {
  api: { bodyParser: false, responseLimit: '6mb' },
};

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Notion page IDs are 32 hex chars (UUID). Anything else (email, "legacy-X") is invalid.
function isValidNotionId(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id);
}

// Find a user's Notion page by email (fallback when we don't have a page ID)
async function findNotionPageByEmail(email) {
  if (!process.env.NOTION_USERS_DB_ID || !email) return null;
  try {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_USERS_DB_ID,
      filter: { property: 'Email', rich_text: { equals: email.toLowerCase().trim() } },
    });
    return res.results[0]?.id || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    return res.status(503).json({ error: 'R2 não configurado. Adicione as variáveis R2_* no Vercel.' });
  }

  try {
    const buffer = await readBody(req);
    if (!buffer.length) return res.status(400).json({ error: 'Arquivo vazio.' });

    const contentType = req.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são aceitas.' });
    }

    // ── Upload to R2 ────────────────────────────────────────────────────────
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const key = `avatars/${(token.id || 'user').replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    // ── Save URL to Notion ──────────────────────────────────────────────────
    if (process.env.NOTION_USERS_DB_ID) {
      // Resolve the Notion page ID: prefer notionId from token, else look up by email
      let pageId = isValidNotionId(token.notionId) ? token.notionId : null;
      if (!pageId) pageId = await findNotionPageByEmail(token.email);

      if (pageId) {
        try {
          await notion.pages.update({
            page_id: pageId,
            properties: { 'foto': { url: publicUrl } },
          });
        } catch (err) {
          console.error('Notion foto update error:', err?.message);
        }
      } else {
        console.warn('Avatar upload: no Notion page found for user', token.email);
      }
    }

    return res.status(200).json({ foto: publicUrl });
  } catch (err) {
    console.error('Avatar upload error:', err?.message || err);
    return res.status(500).json({ error: 'Erro ao fazer upload: ' + (err?.message || 'desconhecido') });
  }
}
