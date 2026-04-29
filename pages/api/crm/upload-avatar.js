/**
 * POST /api/crm/upload-avatar
 * Uploads image to R2, saves URL to Notion, returns { foto, notionSaved, debug }.
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

// Inline page lookup with full diagnostics returned to caller
async function resolveNotionPageId(token) {
  const log = [];

  log.push(`notionId no token: ${token.notionId || 'null/undefined'}`);
  log.push(`email no token: ${token.email}`);
  log.push(`USERS_DB: ${USERS_DB || 'não configurado'}`);

  // 1. Use notionId from JWT if it's a valid UUID
  if (isValidNotionId(token.notionId)) {
    log.push(`Usando notionId direto do token: ${token.notionId}`);
    return { pageId: token.notionId, log };
  }

  if (!USERS_DB) {
    log.push('USERS_DB não configurado — abortando busca');
    return { pageId: null, log };
  }

  const email = (token.email || '').toLowerCase().trim();
  if (!email) {
    log.push('Email não disponível no token');
    return { pageId: null, log };
  }

  // 2. rich_text filter
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', rich_text: { equals: email } },
    });
    log.push(`rich_text filter: ${res.results.length} resultado(s)`);
    if (res.results.length > 0) return { pageId: res.results[0].id, log };
  } catch (e) {
    log.push(`rich_text filter erro: ${e.message}`);
  }

  // 3. email-type filter
  try {
    const res = await notion.databases.query({
      database_id: USERS_DB,
      filter: { property: 'Email', email: { equals: email } },
    });
    log.push(`email filter: ${res.results.length} resultado(s)`);
    if (res.results.length > 0) return { pageId: res.results[0].id, log };
  } catch (e) {
    log.push(`email filter erro: ${e.message}`);
  }

  // 4. Full scan + match in JS
  try {
    const pages = [];
    const r = await notion.databases.query({ database_id: USERS_DB, page_size: 100 });
    pages.push(...r.results);
    log.push(`Full scan: ${pages.length} página(s) retornada(s)`);

    const found = pages.find(p => {
      const prop = p.properties['Email'];
      if (!prop) return false;
      const val = prop.type === 'email'
        ? (prop.email || '')
        : (prop.rich_text?.[0]?.plain_text || prop.title?.[0]?.plain_text || '');
      return val.toLowerCase().trim() === email;
    });

    if (found) {
      log.push(`Página encontrada via full scan: ${found.id}`);
      return { pageId: found.id, log };
    }

    // Log all emails found for comparison
    const emails = pages.map(p => {
      const prop = p.properties['Email'];
      if (!prop) return '[sem Email]';
      return prop.type === 'email'
        ? prop.email
        : (prop.rich_text?.[0]?.plain_text || '[vazio]');
    });
    log.push(`Emails na DB: ${emails.join(', ')}`);
    log.push(`Nenhuma página encontrada para: "${email}"`);
  } catch (e) {
    log.push(`Full scan erro: ${e.message}`);
  }

  return { pageId: null, log };
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
    let debug = [];

    if (USERS_DB) {
      const { pageId, log } = await resolveNotionPageId(token);
      debug = log;

      if (!pageId) {
        notionError = 'Página não encontrada';
      } else {
        try {
          await notion.pages.update({
            page_id: pageId,
            properties: { 'foto': { url: publicUrl } },
          });
          notionSaved = true;
          debug.push(`Foto salva com sucesso na página ${pageId}`);
        } catch (err) {
          notionError = err?.message || 'Erro ao atualizar página';
          debug.push(`Erro ao salvar: ${notionError}`);
          console.error('Notion foto update error:', notionError);
        }
      }
    }

    return res.status(200).json({ foto: publicUrl, notionSaved, notionError, debug });

  } catch (err) {
    console.error('Avatar upload error:', err?.message || err);
    return res.status(500).json({ error: 'Erro ao fazer upload: ' + (err?.message || 'desconhecido') });
  }
}
