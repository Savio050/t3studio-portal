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
