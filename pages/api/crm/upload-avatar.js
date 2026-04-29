/**
 * POST /api/crm/upload-avatar
 * Uploads image to R2, saves URL to Notion foto field, returns { foto }.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client as NotionClient } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId, isValidNotionId } from '../../../lib/notionId';

export const config = {
  api: { bodyParser: false, responseLimit: '6mb' },
};

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const USERS_DB = sanitizeNotionId(process.env.NOTION_USERS_DB_ID);

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function resolveNotionPageId(token) {
  if (isValidNotionId(token.notionId)) return token.notionId;
  if (!USERS_DB || !token.email) return null;

  const email = token.email.toLowerCase().trim();

  // Try rich_text filter
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', rich_text: { equals: email } },
    });
    if (res.results.length > 0) return res.results[0].id;
  } catch {}

  // Try email-type filter
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', email: { equals: email } },
    });
    if (res.results.length > 0) return res.results[0].id;
  } catch {}

  // Full scan fallback
  try {
    const r = await notion.databases.query({ database_id: USERS_DB, page_size: 100 });
    const found = r.results.find(p => {
      const prop = p.properties['Email'];
      if (!prop) return false;
      const val = prop.type === 'email'
        ? (prop.email || '')
        : (prop.rich_text?.[0]?.plain_text || prop.title?.[0]?.plain_text || '');
      return val.toLowerCase().trim() === email;
    });
    return found?.id || null;
  } catch {}

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    return res.status(503).json({ error: 'R2 não configurado.' });
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
    const key = `avatars/${(token.email || 'user').replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`;

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
    if (USERS_DB) {
      const pageId = await resolveNotionPageId(token);
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
        console.warn('Avatar upload: no Notion page found for', token.email);
      }
    }

    return res.status(200).json({ foto: publicUrl });

  } catch (err) {
    console.error('Avatar upload error:', err?.message || err);
    return res.status(500).json({ error: 'Erro ao fazer upload: ' + (err?.message || 'desconhecido') });
  }
}
