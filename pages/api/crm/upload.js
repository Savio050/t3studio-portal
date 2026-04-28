import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Guard: check required env vars before creating client
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    return res.status(503).json({
      error: 'Upload não configurado. Adicione as variáveis R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_URL no Vercel.',
    });
  }

  const { filename, contentType, folder } = req.body || {};
  if (!filename || !contentType)
    return res.status(400).json({ error: 'filename e contentType são obrigatórios' });

  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  const ext    = filename.split('.').pop().toLowerCase();
  const prefix = folder === 'avatars' ? 'avatars' : 'media';
  const key    = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket:      R2_BUCKET_NAME,
      Key:         key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    const publicUrl    = `${R2_PUBLIC_URL}/${key}`;

    return res.status(200).json({ presignedUrl, publicUrl, key });
  } catch (err) {
    console.error('Upload presign error:', err?.message || err);
    return res.status(500).json({ error: `Falha ao gerar URL de upload: ${err?.message || err}` });
  }
}
