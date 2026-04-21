import path from 'path';
import fs from 'fs';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { cliente, formato, tema } = req.query;

  // ── Read a specific prompt file ───────────────────────────────────────────
  if (cliente && formato && tema) {
    const clienteSlug = slugify(cliente);
    const formatoSlug = slugify(formato);
    const temaSlug    = slugify(tema);

    const filePath = path.join(PROMPTS_DIR, clienteSlug, formatoSlug, `${temaSlug}.txt`);
    const fallbackFormatoPath = path.join(PROMPTS_DIR, clienteSlug, formatoSlug, 'geral.txt');
    const fallbackClientePath = path.join(PROMPTS_DIR, clienteSlug, '_instrucoes-gerais.txt');

    // Try specific → geral in same format folder → client general instructions
    let chosenPath = null;
    let chosenType = null;
    if (fs.existsSync(filePath)) {
      chosenPath = filePath; chosenType = 'exact';
    } else if (fs.existsSync(fallbackFormatoPath)) {
      chosenPath = fallbackFormatoPath; chosenType = 'fallback_formato';
    } else if (fs.existsSync(fallbackClientePath)) {
      chosenPath = fallbackClientePath; chosenType = 'fallback_cliente';
    }

    if (!chosenPath) {
      return res.status(404).json({
        error: `Nenhum arquivo de instrução encontrado para: ${clienteSlug}/${formatoSlug}/${temaSlug}`,
        tried: [filePath, fallbackFormatoPath, fallbackClientePath].map(p => p.replace(PROMPTS_DIR, '')),
        available: listAvailablePrompts(),
      });
    }

    const content = fs.readFileSync(chosenPath, 'utf-8');
    return res.status(200).json({ content, type: chosenType, path: chosenPath.replace(PROMPTS_DIR, '') });
  }

  // ── List available prompts ────────────────────────────────────────────────
  return res.status(200).json({ prompts: listAvailablePrompts() });
}

function listAvailablePrompts() {
  const result = {};
  const clients = listDir(PROMPTS_DIR).filter(f => !f.startsWith('.'));
  for (const client of clients) {
    const clientPath = path.join(PROMPTS_DIR, client);
    if (!fs.statSync(clientPath).isDirectory()) continue;
    result[client] = {};
    const formats = listDir(clientPath).filter(f => !f.startsWith('_') && !f.startsWith('.'));
    for (const format of formats) {
      const formatPath = path.join(clientPath, format);
      if (!fs.statSync(formatPath).isDirectory()) continue;
      const files = listDir(formatPath).filter(f => f.endsWith('.txt'));
      result[client][format] = files.map(f => f.replace('.txt', ''));
    }
  }
  return result;
}
