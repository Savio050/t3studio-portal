import { useState, useEffect } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Film, Filter, ChevronDown, ExternalLink, X,
  CheckCircle2, AlertCircle, Clock, Edit3,
  Loader2, ArrowUpRight,
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'não iniciado':        { label: 'Não iniciado',       bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', dot: '#475569' },
  'não iniciada':        { label: 'Não iniciado',       bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', dot: '#475569' },
  'em produção':         { label: 'Em produção',        bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8', dot: '#0ea5e9' },
  'em producao':         { label: 'Em produção',        bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8', dot: '#0ea5e9' },
  'aguardando aprovação':{ label: 'Aguard. aprovação',  bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', dot: '#f59e0b' },
  'aguardando aprovacao':{ label: 'Aguard. aprovação',  bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', dot: '#f59e0b' },
  'ajuste solicitado':   { label: 'Ajuste solicitado',  bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', dot: '#f97316' },
  'aprovado':            { label: 'Aprovado',           bg: 'rgba(16,185,129,0.12)',  text: '#34d399', dot: '#10b981' },
  'concluido':           { label: 'Concluído',          bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', dot: '#64748b' },
  'concluído':           { label: 'Concluído',          bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', dot: '#64748b' },
};

const ROTEIRO_MAP = {
  'não iniciada':         { label: 'Não iniciado', color: '#64748b' },
  'nao iniciada':         { label: 'Não iniciado', color: '#64748b' },
  'em produção':          { label: 'Em produção',  color: '#0ea5e9' },
  'em producao':          { label: 'Em produção',  color: '#0ea5e9' },
  'aguardando aprovação': { label: '⚡ Aguardando', color: '#f59e0b' },
  'aguardando aprovacao': { label: '⚡ Aguardando', color: '#f59e0b' },
  'ajuste solicitado':    { label: 'Ajuste',        color: '#f97316' },
  'aprovado':             { label: '✓ Aprovado',    color: '#10b981' },
  'concluido':            { label: '✓ Concluído',   color: '#10b981' },
  'concluído':            { label: '✓ Concluído',   color: '#10b981' },
};

const FORMAT_ICONS = {
  'video curto': '🎬',
  'estático': '🖼️',
  'stories': '📱',
};

const CLIENT_COLORS = {
  'fastimoveis': { bg: 'rgba(244,63,94,0.12)', text: '#fb7185', border: 'rgba(244,63,94,0.25)' },
  'mafro':       { bg: 'rgba(6,182,212,0.12)', text: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
};

function getStatus(raw) {
  const key = (raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const [k, v] of Object.entries(STATUS_MAP)) {
    if (key.includes(k.replace(/[\u0300-\u036f]/g,''))) return v;
  }
  return { label: raw || '—', bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', dot: '#475569' };
}

function getRoteiroStatus(raw) {
  const key = (raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const [k, v] of Object.entries(ROTEIRO_MAP)) {
    if (key.includes(k.replace(/[\u0300-\u036f]/g,''))) return v;
  }
  return { label: raw || '—', color: '#64748b' };
}

const fmt = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// ── Content Card ─────────────────────────────────────────────────────────────
function ContentCard({ item, onUpdateStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const st = getStatus(item.estado);
  const rs = getRoteiroStatus(item.estadoRoteiro);
  const cl = CLIENT_COLORS[item.cliente?.toLowerCase()] || { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' };

  const NEXT_STATUSES = ['não iniciado', 'Em Produção', 'Aguardando Aprovação', 'Aprovado', 'Concluido'];

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    setMenuOpen(false);
    await onUpdateStatus(item.id, newStatus);
    setUpdating(false);
  };

  return (
    <article className="rounded-2xl p-4 transition-all duration-200 hover:translate-y-[-1px]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-2">{item.nome}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {item.cliente && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}>
                {item.cliente}
              </span>
            )}
            {item.formato && (
              <span className="text-[10px] text-white/30 font-medium">{item.formato}</span>
            )}
            {item.categoria && (
              <span className="text-[10px] text-white/25">{item.categoria}</span>
            )}
          </div>
        </div>

        {/* Status badge + update */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            disabled={updating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              cursor-pointer transition-all duration-150 hover:brightness-125"
            style={{ background: st.bg, color: st.text }}>
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : (
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.dot }} />
            )}
            <span className="hidden sm:inline">{st.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 rounded-xl py-1.5 min-w-[180px] shadow-xl"
              style={{ background: 'rgba(13,22,37,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {NEXT_STATUSES.map(s => {
                const sc = getStatus(s);
                return (
                  <button key={s} onClick={() => updateStatus(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium
                      hover:bg-white/[0.05] cursor-pointer transition-colors duration-100"
                    style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                    {sc.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-0.5">Gravação</p>
          <p className="text-xs text-white/60 font-medium">{fmt(item.dataGravacao)}</p>
        </div>
        <div className="px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-0.5">Postagem</p>
          <p className="text-xs text-white/60 font-medium">{fmt(item.postagem)}</p>
        </div>
      </div>

      {/* Roteiro status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Edit3 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <span className="text-[10px] text-white/30 font-medium">Roteiro:</span>
          <span className="text-[10px] font-semibold" style={{ color: rs.color }}>{rs.label}</span>
        </div>
        {item.responsavel && (
          <span className="text-[10px] text-white/30 font-medium">{item.responsavel}</span>
        )}
      </div>

      {/* Feedback */}
      {item.feedbackCliente && (
        <div className="mt-3 px-3 py-2 rounded-xl text-xs text-orange-300/80 leading-relaxed"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)' }}>
          <span className="font-semibold text-orange-400/80">Feedback: </span>
          {item.feedbackCliente}
        </div>
      )}
    </article>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Conteudo() {
  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterCliente, setFilterCliente] = useState('');
  const [filterMes,     setFilterMes]     = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCliente) params.set('cliente', filterCliente);
    if (filterMes)     params.set('mes', filterMes);
    fetch(`/api/crm/content?${params}`)
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterCliente, filterMes]);

  const updateStatus = async (id, newStatus) => {
    const res = await fetch('/api/crm/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado: newStatus }),
    });
    if (res.ok) {
      setContent(prev => prev.map(c => c.id === id ? { ...c, estado: newStatus } : c));
    }
  };

  // Extract available months from content
  const months = [...new Set(content.map(c => c.mesRelativo).filter(Boolean))];

  // Apply status filter client-side
  const displayed = content.filter(c => {
    if (!filterStatus) return true;
    const key = (c.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return key.includes(filterStatus.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
  });

  // Stats
  const byStatus = {
    produção:   content.filter(c => (c.estado||'').toLowerCase().includes('produ')).length,
    aguardando: content.filter(c => (c.estado||'').toLowerCase().includes('aguardando')).length,
    aprovado:   content.filter(c => (c.estado||'').toLowerCase() === 'aprovado').length,
    ajuste:     content.filter(c => (c.estado||'').toLowerCase().includes('ajuste')).length,
  };

  const STATUS_FILTERS = [
    { key: '',           label: 'Todos',           color: 'rgba(255,255,255,0.4)' },
    { key: 'aguardando', label: 'Aguardando',       color: '#fbbf24' },
    { key: 'produção',   label: 'Em produção',      color: '#38bdf8' },
    { key: 'aprovado',   label: 'Aprovado',         color: '#34d399' },
    { key: 'ajuste',     label: 'Ajuste',           color: '#fb923c' },
    { key: 'concluído',  label: 'Concluído',        color: '#94a3b8' },
  ];

  return (
    <CRMLayout title="Conteúdo — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
              <Film className="w-5 h-5 text-cyan-400" />
              Pipeline de Conteúdo
            </h1>
            <p className="text-sm text-white/40 mt-0.5">{content.length} conteúdos no total</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Em produção',     value: byStatus.produção,   color: '#0ea5e9' },
            { label: 'Aguard. aprovação',value: byStatus.aguardando, color: '#f59e0b' },
            { label: 'Aprovados',        value: byStatus.aprovado,   color: '#10b981' },
            { label: 'Com ajuste',       value: byStatus.ajuste,     color: '#f97316' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-4 py-3"
              style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
              <p className="text-xl font-bold font-display" style={{ color }}>{loading ? '—' : value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: `${color}aa` }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ key, label, color }) => (
              <button key={key || 'all'}
                onClick={() => setFilterStatus(key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
                style={{
                  background: filterStatus === key ? `${color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filterStatus === key ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                  color: filterStatus === key ? color : 'rgba(255,255,255,0.35)',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Separator */}
          {(months.length > 0) && (
            <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />
          )}

          {/* Month filter */}
          {months.map(m => (
            <button key={m}
              onClick={() => setFilterMes(filterMes === m ? '' : m)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
              style={{
                background: filterMes === m ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${filterMes === m ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: filterMes === m ? '#a78bfa' : 'rgba(255,255,255,0.35)',
              }}>
              {m}
            </button>
          ))}

          {/* Client filter */}
          {['fastimoveis', 'mafro'].map(c => {
            const cc = CLIENT_COLORS[c] || { text: '#fff' };
            return (
              <button key={c}
                onClick={() => setFilterCliente(filterCliente === c ? '' : c)}
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150"
                style={{
                  background: filterCliente === c ? `${cc.text}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filterCliente === c ? `${cc.text}40` : 'rgba(255,255,255,0.08)'}`,
                  color: filterCliente === c ? cc.text : 'rgba(255,255,255,0.35)',
                }}>
                {c}
              </button>
            );
          })}

          {(filterStatus || filterMes || filterCliente) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterMes(''); setFilterCliente(''); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/30 hover:text-white/60
                bg-white/5 border border-white/10 cursor-pointer transition-all duration-150
                flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        {/* Content grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map(item => (
              <ContentCard key={item.id} item={item} onUpdateStatus={updateStatus} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Film className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/40 font-medium">Nenhum conteúdo encontrado</p>
            <p className="text-sm text-white/20 mt-1">Ajuste os filtros para ver mais resultados</p>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
