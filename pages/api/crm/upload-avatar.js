/**
 * POST /api/crm/upload-avatar
 * Receives the image binary directly, uploads to R2 server-side (no CORS),
 * saves the public URL to the user's Notion profile, and returns { foto }.
 *
 * Client sends: fetch('/api/crm/upload-avatar', {
 *   method: 'POST',
 *   headers: { 'Content-Type': file.type },
 *   body: file,
 * });
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  // ── R2 env check ──────────────────────────────────────────────────────────
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    return res.status(503).json({ error: 'R2 não configurado. Adicione as variáveis R2_* no Vercel.' });
  }

  try {
    // ── Read body ────────────────────────────────────────────────────────────
    const buffer = await readBody(req);
    if (!buffer.length) return res.status(400).json({ error: 'Arquivo vazio.' });

    const contentType = req.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são aceitas.' });
    }

    // ── Upload to R2 (server-side, no CORS) ──────────────────────────────────
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const key = `avatars/${token.id || 'user'}-${Date.now()}.${ext}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    await s3.send(new PutObjectCommand({
      Bucket:      R2_BUCKET_NAME,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    // ── Save URL to Notion profile (if Notion users DB is configured) ────────
    const notionId = token.notionId || token.id;
    if (process.env.NOTION_USERS_DB_ID && notionId) {
      try {
        await notion.pages.update({
          page_id: notionId,
          properties: { 'Foto': { url: publicUrl } },
        });
      } catch (notionErr) {
        // Log but don't fail — return the URL even if Notion save fails
        console.error('Notion foto update error:', notionErr?.message);
      }
    }

    return res.status(200).json({ foto: publicUrl });
  } catch (err) {
    console.error('Avatar upload error:', err?.message || err);
    return res.status(500).json({ error: 'Erro ao fazer upload: ' + (err?.message || 'desconhecido') });
  }
}
