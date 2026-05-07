import { useState, useEffect, useMemo } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Plus, X, ExternalLink, Trash2, Loader2,
  Lightbulb, Link2, ChevronDown, Search,
} from 'lucide-react';

const FORMATOS = [
  'Reels', 'Stories', 'Post', 'Carrossel',
  'Vídeo Curto', 'YouTube', 'TikTok', 'Pinterest', 'Outro',
];

const CLIENTS = [
  'T3 Studio', 'Fast Imóveis', 'Mafro', 'Fortfer', 'Kalebe Martins',
];

// ── Platform helpers ──────────────────────────────────────────────────────────
function hostLabel(url) {
  if (!url) return 'Link';
  try {
    const h = new URL(url).hostname.replace('www.', '');
    if (h.includes('instagram'))                        return 'Instagram';
    if (h.includes('tiktok'))                           return 'TikTok';
    if (h.includes('youtube') || h.includes('youtu.be')) return 'YouTube';
    if (h.includes('pinterest'))                        return 'Pinterest';
    if (h.includes('twitter') || h.includes('x.com'))  return 'X / Twitter';
    if (h.includes('facebook'))                         return 'Facebook';
    if (h.includes('linkedin'))                         return 'LinkedIn';
    const part = h.split('.')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  } catch { return 'Ver link'; }
}

function platformColor(url) {
  if (!url) return '#6b7280';
  const u = (url || '').toLowerCase();
  if (u.includes('instagram'))                        return '#e1306c';
  if (u.includes('tiktok'))                           return '#010101';
  if (u.includes('youtube') || u.includes('youtu.be')) return '#ff0000';
  if (u.includes('pinterest'))                        return '#e60023';
  if (u.includes('twitter') || u.includes('x.com'))  return '#1da1f2';
  if (u.includes('facebook'))                         return '#1877f2';
  if (u.includes('linkedin'))                         return '#0a66c2';
  return '#0071e3';
}

/**
 * Tenta extrair um iframe embed a partir de uma URL de rede social.
 * Retorna { type, src, vertical } ou { type:'external' } quando não é possível embedar.
 */
function getEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace('www.', '');

    // ── YouTube ──────────────────────────────────────────────────────────────
    if (h.includes('youtube.com') || h.includes('youtu.be')) {
      let vid;
      if (h.includes('youtu.be'))              vid = u.pathname.slice(1).split('?')[0];
      else if (u.searchParams.get('v'))         vid = u.searchParams.get('v');
      else if (u.pathname.includes('/shorts/')) vid = u.pathname.split('/shorts/')[1].split('?')[0];
      else if (u.pathname.includes('/embed/'))  vid = u.pathname.split('/embed/')[1].split('?')[0];
      if (vid) return {
        type: 'iframe',
        src: `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`,
        vertical: false,
        platform: 'YouTube',
      };
    }

    // ── TikTok ───────────────────────────────────────────────────────────────
    if (h.includes('tiktok.com')) {
      const match = url.match(/\/video\/(\d+)/);
      if (match) return {
        type: 'iframe',
        src: `https://www.tiktok.com/embed/v2/${match[1]}`,
        vertical: true,
        platform: 'TikTok',
      };
    }

    // ── Instagram ────────────────────────────────────────────────────────────
    if (h.includes('instagram.com')) {
      const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (match) return {
        type: 'iframe',
        src: `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned/`,
        vertical: match[1] === 'reel',
        platform: 'Instagram',
      };
    }

    // ── Pinterest ────────────────────────────────────────────────────────────
    if (h.includes('pinterest.com')) {
      return { type: 'external', platform: 'Pinterest' };
    }

    return { type: 'external', platform: hostLabel(url) };
  } catch {
    return { type: 'external', platform: 'Link' };
  }
}

// ── Format badge colors ───────────────────────────────────────────────────────
const FORMAT_COLORS = {
  'Reels':       { bg: 'rgba(0,113,227,0.10)',   text: '#0071e3' },
  'Stories':     { bg: 'rgba(255,149,0,0.10)',   text: '#d97706' },
  'Post':        { bg: 'rgba(52,199,89,0.10)',   text: '#15803d' },
  'Carrossel':   { bg: 'rgba(139,92,246,0.10)',  text: '#7c3aed' },
  'Vídeo Curto': { bg: 'rgba(239,68,68,0.10)',   text: '#dc2626' },
  'YouTube':     { bg: 'rgba(255,0,0,0.10)',     text: '#ff0000' },
  'TikTok':      { bg: 'rgba(1,1,1,0.08)',       text: '#374151' },
  'Pinterest':   { bg: 'rgba(230,0,35,0.10)',    text: '#e60023' },
  'Outro':       { bg: 'rgba(142,142,147,0.10)', text: '#6b7280' },
};

// ── Idea Detail Modal ─────────────────────────────────────────────────────────
function IdeaDetailModal({ idea, onClose, onDelete }) {
  const embed   = useMemo(() => getEmbed(idea.link), [idea.link]);
  const fmtClr  = FORMAT_COLORS[idea.formato] || { bg: 'rgba(142,142,147,0.10)', text: '#6b7280' };
  const plColor = platformColor(idea.link);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  // Fechar com Esc
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await fetch('/api/crm/ideas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idea.id }),
      });
      onDelete(idea.id);
      onClose();
    } catch { setDeleting(false); setConfirm(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full bg-surface rounded-apple-2xl border border-hairline shadow-apple-xl
        flex flex-col animate-fade-in overflow-hidden"
        style={{ maxWidth: embed?.vertical ? '420px' : '620px', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-hairline shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {idea.formato && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: fmtClr.bg, color: fmtClr.text }}>
                  {idea.formato}
                </span>
              )}
              {idea.cliente && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-elevated text-ink-muted">
                  {idea.cliente}
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold text-ink leading-snug">{idea.nome}</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-faint
              hover:text-ink hover:bg-elevated transition-all cursor-pointer shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body (scrollável) ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Embed */}
          {embed?.type === 'iframe' ? (
            <div className={`w-full bg-black overflow-hidden ${embed.vertical ? '' : ''}`}
              style={{
                aspectRatio: embed.vertical ? '9/16' : '16/9',
                maxHeight:   embed.vertical ? '520px' : '350px',
              }}>
              <iframe
                src={embed.src}
                title={idea.nome}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : idea.link ? (
            /* Plataforma sem embed — botão estilizado com a cor da plataforma */
            <div className="flex flex-col items-center justify-center py-10 px-5 gap-3 bg-elevated/50">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: `${plColor}18` }}>
                <Link2 className="w-7 h-7" style={{ color: plColor }} />
              </div>
              <p className="text-[13px] text-ink-muted text-center">
                Embed não disponível para {hostLabel(idea.link)}.
              </p>
              <a href={idea.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-apple-lg
                  text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: plColor }}>
                <ExternalLink className="w-4 h-4" />
                Abrir no {hostLabel(idea.link)}
              </a>
            </div>
          ) : null}

          {/* Detalhes */}
          <div className="px-5 py-4 space-y-4">
            {/* Link direto */}
            {idea.link && (
              <div>
                <p className="t-eyebrow text-ink-muted mb-1.5">Link de inspiração</p>
                <a href={idea.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline"
                  style={{ color: plColor }}>
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[400px]">{idea.link}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                </a>
              </div>
            )}

            {/* Comentário */}
            {idea.comentario && (
              <div>
                <p className="t-eyebrow text-ink-muted mb-1.5">Comentário</p>
                <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap
                  bg-elevated px-3.5 py-3 rounded-apple-lg border border-hairline">
                  {idea.comentario}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-hairline bg-elevated/50 shrink-0">
          <button onClick={handleDelete} disabled={deleting}
            onBlur={() => setTimeout(() => setConfirm(false), 200)}
            className={`btn ${confirm ? 'btn-danger' : 'btn-secondary'} gap-1.5`}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? 'Excluindo…' : confirm ? 'Confirmar exclusão' : 'Excluir'}
          </button>

          {idea.link && (
            <a href={idea.link} target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary gap-1.5 ml-auto">
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir original
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Idea Modal ────────────────────────────────────────────────────────────
function NewIdeaModal({ onClose, onCreated }) {
  const [nome,       setNome]       = useState('');
  const [cliente,    setCliente]    = useState('');
  const [formato,    setFormato]    = useState('');
  const [link,       setLink]       = useState('');
  const [comentario, setComentario] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const submit = async () => {
    if (!nome.trim()) { setError('Título é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/crm/ideas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nome, cliente, formato, link, comentario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      onCreated(data.idea);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const detectedPlatform = link ? hostLabel(link) : null;
  const detectedColor    = link ? platformColor(link) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-surface rounded-apple-2xl border border-hairline shadow-apple-xl overflow-hidden animate-fade-in">

        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[7px] bg-[rgba(0,113,227,0.10)] flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-accent" />
            </div>
            <h2 className="text-[15px] font-semibold text-ink">Nova ideia</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-faint hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>

          <div>
            <label className="block t-eyebrow text-ink-muted mb-1.5">Título *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Trend de transição para Reels"
              className="input" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block t-eyebrow text-ink-muted mb-1.5">Formato</label>
              <div className="relative">
                <select value={formato} onChange={e => setFormato(e.target.value)}
                  className="input appearance-none pr-8">
                  <option value="">Sem formato</option>
                  {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block t-eyebrow text-ink-muted mb-1.5">Cliente</label>
              <div className="relative">
                <select value={cliente} onChange={e => setCliente(e.target.value)}
                  className="input appearance-none pr-8">
                  <option value="">Sem cliente</option>
                  {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block t-eyebrow text-ink-muted mb-1.5">Link de inspiração</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
              <input type="url" value={link} onChange={e => setLink(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="input pl-8"
              />
            </div>
            {detectedPlatform && detectedPlatform !== 'Ver link' && (
              <p className="text-[11px] mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: detectedColor }} />
                <span className="font-semibold" style={{ color: detectedColor }}>{detectedPlatform}</span>
                <span className="text-ink-faint">detectado — embed disponível ao abrir o card</span>
              </p>
            )}
          </div>

          <div>
            <label className="block t-eyebrow text-ink-muted mb-1.5">Comentário</label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Anotações, ideias de adaptação, o que chamou atenção..."
              rows={3} className="input resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-err font-medium bg-err/8 px-3 py-2 rounded-apple border border-err/20">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-3.5 border-t border-hairline bg-elevated/50">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={submit} disabled={saving || !nome.trim()} className="btn btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Salvando…' : 'Salvar ideia'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Idea Card ─────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onOpen, onDelete }) {
  const [deleting,   setDeleting]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      await fetch('/api/crm/ideas', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: idea.id }),
      });
      onDelete(idea.id);
    } catch { setDeleting(false); setConfirmDel(false); }
  };

  const embed  = useMemo(() => getEmbed(idea.link), [idea.link]);
  const fmt    = FORMAT_COLORS[idea.formato] || { bg: 'rgba(142,142,147,0.10)', text: '#6b7280' };
  const plColor = platformColor(idea.link);

  return (
    <div
      onClick={onOpen}
      className="group bg-surface rounded-apple-lg border border-hairline p-4
        hover:shadow-apple-sm hover:border-accent/30 transition-all duration-200
        relative cursor-pointer select-none">

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
        className={`absolute top-3 right-3 h-6 flex items-center justify-center rounded-lg
          transition-all cursor-pointer text-[10px] font-semibold px-2
          opacity-0 group-hover:opacity-100
          ${confirmDel
            ? 'bg-err text-white opacity-100'
            : 'text-ink-faint hover:text-err hover:bg-err/10'}`}>
        {deleting
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : confirmDel ? 'confirmar' : <Trash2 className="w-3 h-3" />}
      </button>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap pr-8">
        {idea.formato && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: fmt.bg, color: fmt.text }}>
            {idea.formato}
          </span>
        )}
        {idea.cliente && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-elevated text-ink-muted">
            {idea.cliente}
          </span>
        )}
        {/* Indicador de embed disponível */}
        {embed?.type === 'iframe' && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${plColor}15`, color: plColor }}>
            ▶ {embed.platform}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-[14px] font-semibold text-ink leading-snug mb-2.5 group-hover:text-accent transition-colors">
        {idea.nome}
      </p>

      {/* Link */}
      {idea.link && (
        <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold mb-2.5"
          style={{ color: plColor }}>
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          {hostLabel(idea.link)}
        </div>
      )}

      {/* Comentário */}
      {idea.comentario && (
        <p className="text-[12px] text-ink-muted leading-relaxed whitespace-pre-wrap
          border-t border-hairline pt-2.5 mt-0.5 line-clamp-3">
          {idea.comentario}
        </p>
      )}

      {/* Hint clique */}
      <p className="text-[10px] text-ink-faint mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Clique para ver detalhes
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IdeiaBoard() {
  const [ideas,     setIdeas]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [openIdea,  setOpenIdea]  = useState(null);
  const [fmtFilter, setFmtFilter] = useState('');
  const [cliFilter, setCliFilter] = useState('');
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    fetch('/api/crm/ideas')
      .then(r => r.json())
      .then(d => { setIdeas(d.ideas || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const usedClients = useMemo(() =>
    [...new Set(ideas.map(i => i.cliente).filter(Boolean))].sort()
  , [ideas]);

  const usedFormats = useMemo(() =>
    [...new Set(ideas.map(i => i.formato).filter(Boolean))].sort()
  , [ideas]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ideas.filter(i => {
      if (fmtFilter && i.formato !== fmtFilter) return false;
      if (cliFilter && i.cliente !== cliFilter) return false;
      if (q && !i.nome.toLowerCase().includes(q) && !i.comentario.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ideas, fmtFilter, cliFilter, search]);

  const col1 = filtered.filter((_, i) => i % 2 === 0);
  const col2 = filtered.filter((_, i) => i % 2 === 1);

  const handleDelete = id => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (openIdea?.id === id) setOpenIdea(null);
  };
  const handleCreated = idea => { setIdeas(prev => [idea, ...prev]); setShowNew(false); };

  return (
    <CRMLayout title="Quadro de Ideias — T3 Studio">
      <div className="px-5 lg:px-10 py-8 lg:py-10 max-w-[1240px] mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[28px] font-bold text-ink tracking-tight leading-tight">
              Quadro de ideias
            </h1>
            <p className="text-[13px] text-ink-muted mt-0.5">
              Referências e inspirações de conteúdo
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn btn-primary gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            nova ideia
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-surface border border-hairline rounded-apple
                focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink placeholder:text-ink-faint"
            />
          </div>

          <div className="relative">
            <select value={fmtFilter} onChange={e => setFmtFilter(e.target.value)}
              className="appearance-none bg-surface border border-hairline rounded-apple
                px-3 pr-7 py-2 text-[13px] text-ink font-medium
                focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer">
              <option value="">Todos os formatos</option>
              {(usedFormats.length ? usedFormats : FORMATOS).map(f =>
                <option key={f} value={f}>{f}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
          </div>

          <div className="relative">
            <select value={cliFilter} onChange={e => setCliFilter(e.target.value)}
              className="appearance-none bg-surface border border-hairline rounded-apple
                px-3 pr-7 py-2 text-[13px] text-ink font-medium
                focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer">
              <option value="">Todos os clientes</option>
              {(usedClients.length ? usedClients : CLIENTS).map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
          </div>

          {(fmtFilter || cliFilter || search) && (
            <button onClick={() => { setFmtFilter(''); setCliFilter(''); setSearch(''); }}
              className="text-[12px] text-accent font-medium hover:underline">
              Limpar
            </button>
          )}

          <span className="text-[12px] text-ink-faint ml-auto tabular">
            {filtered.length} ideia{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-elevated rounded-apple-lg animate-pulse"
                style={{ height: `${120 + (i % 3) * 30}px` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-ink-faint" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-ink">
                {search || fmtFilter || cliFilter ? 'Nenhuma ideia encontrada' : 'Nenhuma ideia ainda'}
              </p>
              <p className="text-[13px] text-ink-muted mt-1 max-w-[260px]">
                {search || fmtFilter || cliFilter
                  ? 'Tente outros filtros ou limpe a busca.'
                  : 'Clique em "+ nova ideia" para começar a salvar referências.'}
              </p>
            </div>
            {!search && !fmtFilter && !cliFilter && (
              <button onClick={() => setShowNew(true)} className="btn btn-primary gap-1.5 mt-1">
                <Plus className="w-4 h-4" /> nova ideia
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              {col1.map(idea => (
                <IdeaCard key={idea.id} idea={idea}
                  onOpen={() => setOpenIdea(idea)}
                  onDelete={handleDelete} />
              ))}
            </div>
            <div className="space-y-4">
              {col2.map(idea => (
                <IdeaCard key={idea.id} idea={idea}
                  onOpen={() => setOpenIdea(idea)}
                  onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showNew && (
        <NewIdeaModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
      {openIdea && (
        <IdeaDetailModal
          idea={openIdea}
          onClose={() => setOpenIdea(null)}
          onDelete={handleDelete}
        />
      )}
    </CRMLayout>
  );
}
