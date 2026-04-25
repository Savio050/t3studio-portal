/**
 * /api/download?url=<encoded-url>
 *
 * Proxy that fetches a remote file (e.g. R2 cover image) server-side
 * and returns it with Content-Disposition: attachment so the browser
 * downloads it immediately instead of opening it in a new tab.
 *
 * Only usable by the client portal — no auth needed for public assets.
 */
export const config = { api: { responseLimit: '25mb' } };

export default async function handler(req, res) {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ error: 'url is required' });

  let decoded;
  try { decoded = decodeURIComponent(raw); } catch {
    return res.status(400).json({ error: 'invalid url encoding' });
  }

  // Basic sanity check — must be a real http(s) URL
  if (!/^https?:\/\//i.test(decoded)) {
    return res.status(400).json({ error: 'only http(s) URLs are allowed' });
  }

  try {
    const upstream = await fetch(decoded);
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream returned ${upstream.status}` });
    }

    // Derive a clean filename from the URL path
    const pathname  = (() => { try { return new URL(decoded).pathname; } catch { return '/file'; } })();
    const rawName   = pathname.split('/').pop() || 'download';
    // Decode %xx sequences in the filename itself
    const filename  = (() => { try { return decodeURIComponent(rawName); } catch { return rawName; } })();

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Download proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
}
