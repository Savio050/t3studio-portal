/**
 * Sanitize a Notion ID or URL to a clean UUID.
 * Handles cases where the full Notion URL was pasted (with ?v=... view params).
 */
export function sanitizeNotionId(raw) {
  if (!raw) return null;
  const clean = raw.split('?')[0].split('#')[0].trim();
  const match = clean.match(/([0-9a-f]{32})/i);
  if (match) {
    const id = match[1];
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
  }
  return clean;
}

/** Notion page IDs are UUIDs. Emails, "legacy-X", etc. are invalid. */
export function isValidNotionId(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id);
}

/**
 * Find a Notion page ID by user email.
 * Tries rich_text filter, then email filter, then full-scan fallback.
 * Returns null if not found.
 */
export async function findNotionPageByEmail(notion, dbId, email) {
  if (!dbId || !email) return null;
  const emailClean = email.toLowerCase().trim();

  // 1. Try rich_text filter
  try {
    const res = await notion.databases.query({
      database_id: dbId,
      filter: { property: 'Email', rich_text: { equals: emailClean } },
    });
    if (res.results.length > 0) return res.results[0].id;
  } catch {}

  // 2. Try email-type filter
  try {
    const res = await notion.databases.query({
      database_id: dbId,
      filter: { property: 'Email', email: { equals: emailClean } },
    });
    if (res.results.length > 0) return res.results[0].id;
  } catch {}

  // 3. Full scan fallback — fetch all and match in JS
  try {
    const pages = [];
    let cursor;
    do {
      const r = await notion.databases.query({
        database_id: dbId,
        ...(cursor ? { start_cursor: cursor } : {}),
        page_size: 100,
      });
      pages.push(...r.results);
      cursor = r.has_more ? r.next_cursor : null;
    } while (cursor);

    const found = pages.find(p => {
      const prop = p.properties['Email'];
      if (!prop) return false;
      const val = prop.type === 'email'
        ? (prop.email || '')
        : (prop.rich_text?.[0]?.plain_text || prop.title?.[0]?.plain_text || '');
      return val.toLowerCase().trim() === emailClean;
    });
    return found?.id || null;
  } catch {}

  return null;
}
