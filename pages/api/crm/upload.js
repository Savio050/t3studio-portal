import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { filename, contentType } = req.body || {};
  if (!filename || !contentType)
    return res.status(400).json({ error: 'filename e contentType são obrigatórios' });

  const ext = filename.split('.').pop().toLowerCase();
  const key = `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME,
      Key:         key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    const publicUrl    = `${process.env.R2_PUBLIC_URL}/${key}`;

    return res.status(200).json({ presignedUrl, publicUrl, key });
  } catch (err) {
    console.error('Upload presign error:', err?.message || err);
    return res.status(500).json({ error: 'Falha ao gerar URL de upload' });
  }
}
