/**
 * POST /api/crm/upload-avatar
 * Uploads image to R2, saves URL to Notion, returns { foto, notionSaved, notionError }.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client as NotionClient } from '@notionhq/client';
import { getToken } from 'next-auth/jwt';
import { sanitizeNotionId, isValidNotionId, findNotionPageByEmail } from '../../../lib/notionId';

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
    let notionSaved = false;
    let notionError = null;

    if (USERS_DB) {
      try {
        const pageId = isValidNotionId(token.notionId)
          ? token.notionId
          : await findNotionPageByEmail(notion, USERS_DB, token.email);

        if (!pageId) {
          notionError = `Página não encontrada para ${token.email}`;
        } else {
          await notion.pages.update({
            page_id: pageId,
            properties: { 'foto': { url: publicUrl } },
          });
          notionSaved = true;
        }
      } catch (err) {
        notionError = err?.message || 'Erro desconhecido';
        console.error('Notion foto update error:', notionError);
      }
    }

    // Always return the URL even if Notion save failed (client will retry via PATCH /profile)
    return res.status(200).json({ foto: publicUrl, notionSaved, notionError });

  } catch (err) {
    console.error('Avatar upload error:', err?.message || err);
    return res.status(500).json({ error: 'Erro ao fazer upload: ' + (err?.message || 'desconhecido') });
  }
}
