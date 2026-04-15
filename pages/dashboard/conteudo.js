import { useState, useEffect, useRef } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Film, ChevronDown, X, Edit3, Loader2,
  Clock, User, Tag, AlertTriangle, CheckCircle2,
  LayoutGrid, User2,
} from 'lucide-react';

// ── Normalizer ────────────────────────────────────────────────────────────────
const n = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// ── Kanban column definitions ─────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'nao-iniciado',
    label: 'Não Iniciado',
    sublabel: 'Backlog',
    color: '#64748b',
    glow: 'rgba(100,116,139,0.12)',
    icon: '○',
  },
  {
    id: 'roteirizacao',
    label: 'Em Roteirização',
    sublabel: 'Script em criação',
    color: '#a78bfa',
    glow: 'rgba(124,58,237,0.15)',
    icon: '✎',
  },
  {
    id: 'aguardando-cliente',
    label: 'Aguardando Cliente',
    sublabel: 'Aprovação pendente',
    color: '#fbbf24',
    glow: 'rgba(245,158,11,0.15)',
    icon: '⏳',
    urgent: true,
  },
  {
    id: 'em-producao',
    label: 'Em Produção',
    sublabel: 'Edição / Gravação',
    color: '#38bdf8',
    glow: 'rgba(14,165,233,0.15)',
    icon: '▶',
  },
  {
    id: 'concluido',
    label: 'Pronto',
    sublabel: 'Aprovado / Concluído',
    color: '#34d399',
    glow: 'rgba(16,185,129,0.12)',
    icon: '✓',
  },
];

// ── Classify item into a column ───────────────────────────────────────────────
function classifyItem(item) {
  const estado  = n(item.estado);
  const roteiro = n(item.estadoRoteiro);

  // 1. Pronto — highest priority
  if (estado === 'aprovado' || estado === 'concluido' || estado === 'concluido')
    return 'concluido';

  // 2. Aguardando cliente (any approval blockage)
  if (estado.includes('aguardando') || roteiro.includes('aguardando') ||
      estado.includes('ajuste')     || roteiro.includes('ajuste'))
    return 'aguardando-cliente';

  // 3. Em Produção de vídeo (roteiro ja aprovado, conteúdo sendo editado)
  if (estado.includes('producao') || estado.includes('produção'))
    return 'em-producao';

  // 4. Em Roteirização (roteiro ativo, vídeo ainda não iniciado)
  if (roteiro.includes('producao') || roteiro.includes('produção'))
    return 'roteirizacao';

  // 5. Default: backlog
  return 'nao-iniciado';
}

// ── Status options for the dropdown ──────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'não iniciado',        label: 'Não iniciado',      dot: '#64748b' },
  { value: 'Em Produção',         label: 'Em Produção',       dot: '#0ea5e9' },
  { value: 'Aguardando Aprovação',label: 'Aguard. Aprovação', dot: '#f59e0b' },
  { value: 'Aprovado',            label: 'Aprovado',          dot: '#10b981' },
  { value: 'Concluido',           label: 'Concluído',         dot: '#64748b' },
];

// ── Client palette ────────────────────────────────────────────────────────────
const CLIENT_COLORS = {
  'fastimoveis': { bg: 'rgba(244,63,94,0.15)', text: '#fb7185', border: 'rgba(244,63,94,0.3)' },
  'mafro':       { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
};
function clientColor(nome) {
  return CLIENT_COLORS[n(nome)?.replace(/\s/g,'')] ||
    { bg: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.12)' };
}

// ── Format date ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return null;
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

// ── Roteiro badge ─────────────────────────────────────────────────────────────
function RoteiroBadge({ estadoRoteiro }) {
  const r = n(estadoRoteiro);
  if (!r || r === 'nao iniciada' || r === 'nao iniciado') return null;
  let label, color;
  if (r.includes('aguardando'))              { label = 'Rot. aguardando'; color = '#f59e0b'; }
  else if (r.includes('ajuste'))             { label = 'Rot. ajuste';     color = '#f97316'; }
  else if (r.includes('producao') || r.includes('produção')) { label = 'Rot. em criação'; color = '#a78bfa'; }
  else if (r === 'aprovado' || r === 'concluido') { label = 'Rot. ✓';         color = '#10b981'; }
  else return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      <Edit3 className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ── Status dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ item, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const current = STATUS_OPTIONS.find(o => n(o.value) === n(item.estado)) || STATUS_OPTIONS[0];

  const update = async (val) => {
    setOpen(false);
    setBusy(true);
    await onUpdate(item.id, val);
    setBusy(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} disabled={busy}
        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer
          transition-all duration-150 hover:brightness-125"
        style={{ background: `${current.dot}18`, color: current.dot, border: `1px solid ${current.dot}30` }}>
        {busy
          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
          : <div className="w-1.5 h-1.5 rounded-full" style={{ background: current.dot }} />
        }
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 rounded-xl py-1 w-44 shadow-2xl"
          style={{ background: 'rgba(10,18,35,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => update(o.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium
                hover:bg-white/[0.05] cursor-pointer transition-colors duration-100"
              style={{ color: n(o.value) === n(item.estado) ? o.dot : 'rgba(255,255,255,0.65)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({ item, col, onUpdate }) {
  const cl     = clientColor(item.cliente);
  const hasAjuste = n(item.estado).includes('ajuste') || n(item.estadoRoteiro).includes('ajuste');
  const postDate  = fmtDate(item.postagem);
  const gravDate  = fmtDate(item.dataGravacao);

  return (
    <article
      className="rounded-xl p-3 transition-all duration-200 hover:translate-y-[-1px] cursor-default"
      style={{
        background: 'rgba(255,255,255,0.045)',
        border: hasAjuste
          ? '1px solid rgba(249,115,22,0.35)'
          : `1px solid rgba(255,255,255,0.07)`,
        boxShadow: hasAjuste ? '0 0 0 1px rgba(249,115,22,0.15)' : 'none',
      }}>

      {/* Ajuste alert strip */}
      {hasAjuste && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-orange-400"
          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Ajuste solicitado
        </div>
      )}

      {/* Title */}
      <p className="text-xs font-semibold text-white/90 leading-snug line-clamp-2 mb-2">
        {item.nome}
      </p>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        {item.cliente && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
            style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}>
            {item.cliente}
          </span>
        )}
        {item.formato && (
          <span className="text-[9px] text-white/30 font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04]">
            {item.formato}
          </span>
        )}
        <RoteiroBadge estadoRoteiro={item.estadoRoteiro} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.responsavel && (
            <span className="flex items-center gap-1 text-[10px] text-white/30 font-medium truncate">
              <User className="w-2.5 h-2.5 shrink-0" />
              {item.responsavel}
            </span>
          )}
          {(postDate || gravDate) && (
            <span className="flex items-center gap-1 text-[10px] text-white/25 font-medium shrink-0">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              {postDate || gravDate}
            </span>
          )}
        </div>
        <StatusDropdown item={item} onUpdate={onUpdate} />
      </div>

      {/* Feedback pill */}
      {item.feedbackCliente && (
        <div className="mt-2 px-2 py-1.5 rounded-lg text-[10px] text-orange-300/80 leading-snug"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
          {item.feedbackCliente.slice(0, 80)}{item.feedbackCliente.length > 80 ? '…' : ''}
        </div>
      )}
    </article>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, items, onUpdate, loading }) {
  return (
    <div className="flex flex-col min-w-[260px] lg:min-w-0 lg:flex-1"
      style={{ maxWidth: '320px' }}>

      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
          <div>
            <p className="text-xs font-bold text-white/80">{col.label}</p>
            <p className="text-[10px] text-white/30">{col.sublabel}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: items.length > 0 ? `${col.color}18` : 'rgba(255,255,255,0.05)',
            color: items.length > 0 ? col.color : 'rgba(255,255,255,0.2)',
          }}>
          {loading ? '—' : items.length}
        </span>
      </div>

      {/* Column drop zone */}
      <div className="flex-1 rounded-xl p-2 space-y-2 min-h-[120px]"
        style={{
          background: `${col.glow}`,
          border: `1px solid ${col.color}15`,
        }}>
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))
        ) : items.length > 0 ? (
          items.map(item => (
            <KanbanCard key={item.id} item={item} col={col} onUpdate={onUpdate} />
          ))
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] text-white/15 font-medium">Nenhum item</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Conteudo() {
  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState('geral');   // 'geral' | 'minhas'
  const [filterCliente, setFilterCliente] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  // ── Filter pipeline ──────────────────────────────────────────────────────
  const filtered = content.filter(item => {
    // View toggle: "Minhas Tarefas" = only Sávio
    if (view === 'minhas') {
      const resp = n(item.responsavel);
      if (!resp.includes('savio') && !resp.includes('sávio')) return false;
    }
    // Client filter
    if (filterCliente) {
      if (n(item.cliente).replace(/\s/g,'') !== n(filterCliente).replace(/\s/g,'')) return false;
    }
    return true;
  });

  // ── Distribute into columns ──────────────────────────────────────────────
  const columnItems = {};
  COLUMNS.forEach(col => { columnItems[col.id] = []; });
  filtered.forEach(item => {
    const colId = classifyItem(item);
    columnItems[colId].push(item);
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const total     = content.length;
  const urgentes  = columnItems['aguardando-cliente']?.length ?? 0;
  const concluido = columnItems['concluido']?.length ?? 0;

  const CLIENTS = ['fastimoveis', 'mafro'];

  return (
    <CRMLayout title="Conteúdo — T3 Studio CRM">
      <div className="flex flex-col h-screen lg:h-auto overflow-hidden">

        {/* ── Top bar ── */}
        <div className="px-5 lg:px-8 pt-6 pb-4 shrink-0">

          {/* Header row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400" />
                Esteira de Conteúdo
              </h1>
              <p className="text-xs text-white/35 mt-0.5">
                {loading ? '…' : `${total} conteúdos`}
                {urgentes > 0 && (
                  <span className="ml-2 text-amber-400 font-semibold">
                    · {urgentes} aguardando cliente
                  </span>
                )}
              </p>
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-xl p-1 shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { key: 'geral',  label: 'Visão Geral', icon: LayoutGrid },
                { key: 'minhas', label: 'Minhas Tarefas', icon: User2   },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key}
                  onClick={() => setView(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                    cursor-pointer transition-all duration-150"
                  style={{
                    background: view === key ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color: view === key ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                    border: view === key ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Client filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Projeto:</span>
            <button
              onClick={() => setFilterCliente('')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
              style={{
                background: !filterCliente ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${!filterCliente ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                color: !filterCliente ? 'white' : 'rgba(255,255,255,0.3)',
              }}>
              Todos
            </button>
            {CLIENTS.map(c => {
              const cc = CLIENT_COLORS[c] || { text: '#fff', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)' };
              const active = n(filterCliente).replace(/\s/g,'') === n(c).replace(/\s/g,'');
              return (
                <button key={c}
                  onClick={() => setFilterCliente(active ? '' : c)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer
                    transition-all duration-150"
                  style={{
                    background: active ? cc.bg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? cc.border : 'rgba(255,255,255,0.07)'}`,
                    color: active ? cc.text : 'rgba(255,255,255,0.3)',
                  }}>
                  {c}
                </button>
              );
            })}

            {/* Active filter indicator */}
            {(view === 'minhas' || filterCliente) && (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 font-semibold px-2 py-1 rounded-full"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                {[view === 'minhas' && 'Sávio', filterCliente].filter(Boolean).join(' · ')}
                <button onClick={() => { setView('geral'); setFilterCliente(''); }}
                  className="ml-0.5 cursor-pointer hover:text-white transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* ── Kanban board ── */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 lg:px-8 pb-6">
          <div className="flex gap-4 h-full"
            style={{ minWidth: `${COLUMNS.length * 280}px` }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                items={columnItems[col.id] || []}
                onUpdate={updateStatus}
                loading={loading}
              />
            ))}
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
