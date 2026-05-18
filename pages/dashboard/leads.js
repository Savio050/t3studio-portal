import { useState, useEffect, useCallback, useMemo } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Target, Users, TrendingUp, Flame, Clock, Mail, Phone,
  ExternalLink, Plus, X, Loader2, Search, ChevronRight,
  AlertCircle, CheckCircle2, MoreHorizontal, ArrowUpRight,
} from 'lucide-react';

// ── Constantes ─────────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'Novo',               label: 'Novos Leads',          color: '#0071e3', bg: 'rgba(0,113,227,0.07)'  },
  { id: 'Em Atendimento',     label: 'Em Atendimento',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.07)' },
  { id: 'Negociação Avançada',label: 'Negociação Avançada',  color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
  { id: 'Fechado',            label: 'Fechado / Vendido',    color: '#30d158', bg: 'rgba(48,209,88,0.07)'  },
];

const TEMP_META = {
  '🔥 Quente': { bg: 'rgba(255,59,48,0.12)',  color: '#ff3b30', label: '🔥 Quente' },
  '🌡️ Morno':  { bg: 'rgba(255,149,0,0.12)',  color: '#ff9500', label: '🌡️ Morno'  },
  '❄️ Frio':   { bg: 'rgba(0,113,227,0.10)',  color: '#0071e3', label: '❄️ Frio'   },
};

const ORIGEM_META = {
  'Meta Ads':        { label: 'Meta Ads',       dot: '#0071e3' },
  'Formulário Site': { label: 'Form Site',      dot: '#30d158' },
  'WhatsApp':        { label: 'WhatsApp',       dot: '#25d366' },
  'Orgânico':        { label: 'Orgânico',       dot: '#8e8e93' },
};

const EVENT_LABELS = {
  page_view:       { icon: '👁',  label: 'Visualizou a página' },
  form_submit:     { icon: '📋', label: 'Preencheu formulário' },
  whatsapp_click:  { icon: '💬', label: 'Clicou no WhatsApp'  },
  meta_lead:       { icon: '📢', label: 'Lead pelo Meta Ads'  },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d} dia${d > 1 ? 's' : ''} atrás`;
  if (h > 0)  return `${h}h atrás`;
  if (m > 0)  return `${m} min atrás`;
  return 'agora';
}

// ── Componentes de exibição ────────────────────────────────────────────────────
function TempBadge({ temp }) {
  const m = TEMP_META[temp] || TEMP_META['❄️ Frio'];
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-pill"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function OrigemDot({ origem }) {
  const m = ORIGEM_META[origem] || ORIGEM_META['Orgânico'];
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-ink-muted">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min((score / 200) * 100, 100);
  const color = score >= 70 ? '#ff3b30' : score >= 30 ? '#ff9500' : '#0071e3';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-elevated overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold shrink-0" style={{ color }}>{score} pts</span>
    </div>
  );
}

// ── Analytics Row ──────────────────────────────────────────────────────────────
function AnalyticsRow({ stats, loading }) {
  const cards = [
    { label: 'Total de Leads',  value: stats?.total    ?? '—', icon: Users,       tone: 'text-ink'          },
    { label: 'Leads Quentes',   value: stats?.quentes  ?? '—', icon: Flame,       tone: 'text-[#ff3b30]'    },
    { label: 'Taxa Quentes',    value: stats?.taxaQuente != null ? `${stats.taxaQuente}%` : '—',
                                                                icon: TrendingUp,  tone: 'text-[#ff9500]'    },
    { label: 'Novos Hoje',      value: stats?.novos    ?? '—', icon: Target,      tone: 'text-accent'       },
    { label: 'Fechados',        value: stats?.fechados ?? '—', icon: CheckCircle2,tone: 'text-ok-ink'       },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="card px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-apple flex items-center justify-center bg-elevated shrink-0">
            <Icon className={`w-4 h-4 ${tone}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-apple-tight text-ink">
              {loading ? '…' : value}
            </p>
            <p className="text-[10px] font-medium text-ink-muted leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lead Card ──────────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpen, onMove }) {
  const [moving, setMoving] = useState(false);
  const initial = (lead.nome || '??').slice(0, 2).toUpperCase();

  const moveNext = async (e) => {
    e.stopPropagation();
    const idx  = KANBAN_COLS.findIndex(c => c.id === lead.status);
    const next = KANBAN_COLS[idx + 1];
    if (!next || moving) return;
    setMoving(true);
    await onMove(lead.id, next.id);
    setMoving(false);
  };

  const isLast = KANBAN_COLS.findIndex(c => c.id === lead.status) >= KANBAN_COLS.length - 1;

  return (
    <article
      onClick={() => onOpen(lead)}
      className="bg-surface border border-hairline rounded-apple p-3.5 cursor-pointer
        hover:shadow-apple-sm hover:border-[rgba(0,0,0,0.12)] transition-all duration-150 select-none"
    >
      {/* Avatar + nome */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center
          text-[12px] font-bold text-white brand-gradient">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate leading-tight">{lead.nome}</p>
          <p className="text-[10px] text-ink-faint truncate mt-0.5">{lead.email || lead.telefone || '—'}</p>
        </div>
        {!isLast && (
          <button
            onClick={moveNext}
            disabled={moving}
            title="Avançar no funil"
            className="w-6 h-6 flex items-center justify-center rounded-apple shrink-0
              text-ink-faint hover:text-accent hover:bg-accent-soft transition-all cursor-pointer"
          >
            {moving
              ? <Loader2 className="w-3 h-3 animate-spin"/>
              : <ChevronRight className="w-3 h-3"/>
            }
          </button>
        )}
      </div>

      {/* Score bar */}
      <ScoreBar score={lead.score || 0} />

      {/* Badges */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <TempBadge temp={lead.temperatura} />
        {lead.origem && <OrigemDot origem={lead.origem} />}
      </div>

      {/* UTM Campaign */}
      {lead.utmCampaign && (
        <p className="text-[10px] text-ink-faint mt-1.5 truncate">
          📣 {lead.utmCampaign}
        </p>
      )}

      {/* Timestamp */}
      <p className="text-[10px] text-ink-faint mt-2">{timeAgo(lead.criadoEm)}</p>
    </article>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, leads, onOpen, onMove }) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[310px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-apple mb-3"
        style={{ background: col.bg }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
          <p className="text-[12px] font-semibold text-ink">{col.label}</p>
        </div>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: col.color + '22', color: col.color }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 flex-1">
        {leads.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[12px] text-ink-faint">Sem leads nesta etapa</p>
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpen} onMove={onMove} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onMove }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [moving,  setMoving]  = useState('');

  useEffect(() => {
    fetch(`/api/crm/leads?id=${lead.id}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lead.id]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleMove = async (status) => {
    setMoving(status);
    await onMove(lead.id, status);
    setMoving('');
  };

  const initial = (lead.nome || '??').slice(0, 2).toUpperCase();
  const colIdx  = KANBAN_COLS.findIndex(c => c.id === lead.status);
  const col     = KANBAN_COLS[colIdx] || KANBAN_COLS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-apple-xl flex flex-col overflow-hidden
        bg-surface shadow-apple-lg border border-hairline max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-start gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center
            text-[15px] font-bold text-white brand-gradient shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-ink">{lead.nome}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <TempBadge temp={lead.temperatura} />
              {lead.origem && <OrigemDot origem={lead.origem} />}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: col.color + '22', color: col.color }}>
                {lead.status}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted
              hover:text-ink hover:bg-elevated transition-all cursor-pointer shrink-0">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* Score + Infos */}
          <div className="px-6 py-4 border-b border-hairline space-y-3">
            <ScoreBar score={lead.score || 0} />
            <div className="grid grid-cols-2 gap-2.5 text-[12px]">
              {lead.email && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Mail className="w-3 h-3 shrink-0"/>
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.telefone && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Phone className="w-3 h-3 shrink-0"/>
                  <span>{lead.telefone}</span>
                </div>
              )}
              {lead.utmSource && (
                <div className="flex items-center gap-2 text-ink-muted col-span-2">
                  <Target className="w-3 h-3 shrink-0"/>
                  <span>
                    {lead.utmSource}
                    {lead.utmMedium   ? ` / ${lead.utmMedium}`   : ''}
                    {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ''}
                  </span>
                </div>
              )}
              {lead.pagina && (
                <div className="flex items-center gap-2 text-ink-muted col-span-2">
                  <ArrowUpRight className="w-3 h-3 shrink-0"/>
                  <span className="truncate">Converteu em: {lead.pagina}</span>
                </div>
              )}
            </div>
          </div>

          {/* Funil / mover */}
          <div className="px-6 py-4 border-b border-hairline">
            <p className="t-eyebrow mb-2.5">Mover no funil</p>
            <div className="flex gap-1.5 flex-wrap">
              {KANBAN_COLS.map(c => (
                <button key={c.id}
                  onClick={() => handleMove(c.id)}
                  disabled={!!moving || lead.status === c.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-semibold
                    transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  style={lead.status === c.id
                    ? { background: c.color + '22', color: c.color, border: `1px solid ${c.color}44` }
                    : { background: 'rgba(0,0,0,0.04)', color: '#6e6e73' }
                  }>
                  {moving === c.id
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin"/>
                    : <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  }
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline de eventos */}
          <div className="px-6 py-4">
            <p className="t-eyebrow mb-3">Linha do tempo</p>
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <Loader2 className="w-4 h-4 animate-spin"/>
                Carregando eventos…
              </div>
            ) : events.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="relative">
                {/* Linha vertical */}
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-hairline" />
                <div className="space-y-3">
                  {events.map((evt, i) => {
                    const meta = EVENT_LABELS[evt.tipo] || { icon: '📌', label: evt.tipo };
                    return (
                      <div key={evt.id || i} className="flex gap-3 items-start pl-2">
                        <div className="w-7 h-7 rounded-full bg-surface border border-hairline
                          flex items-center justify-center text-[13px] shrink-0 z-10">
                          {meta.icon}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-[12px] font-semibold text-ink">{meta.label}</p>
                          {evt.pagina && (
                            <p className="text-[11px] text-ink-muted mt-0.5 truncate">{evt.pagina}</p>
                          )}
                          {(evt.utmSource || evt.utmCampaign) && (
                            <p className="text-[10px] text-ink-faint mt-0.5">
                              {[evt.utmSource, evt.utmCampaign].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <p className="text-[10px] text-ink-faint mt-1">{timeAgo(evt.criadoEm)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function Leads() {
  const [leads,      setLeads]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [openLead,   setOpenLead]   = useState(null);
  const [error,      setError]      = useState('');

  const loadLeads = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/leads')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setLeads(d.leads || []);
        setStats(d.stats || null);
      })
      .catch(() => setError('Erro ao carregar leads.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const moveLeadStatus = useCallback(async (leadId, newStatus) => {
    const res = await fetch('/api/crm/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      // Atualiza o lead aberto se for o mesmo
      setOpenLead(prev => prev?.id === leadId ? { ...prev, status: newStatus } : prev);
    }
  }, []);

  // Filtra por busca
  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.nome?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.telefone?.includes(q) ||
      l.utmCampaign?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Agrupa por coluna do Kanban
  const grouped = useMemo(() => {
    const map = {};
    KANBAN_COLS.forEach(c => { map[c.id] = []; });
    filtered.forEach(l => {
      if (map[l.status]) map[l.status].push(l);
      else map['Novo'].push(l);
    });
    return map;
  }, [filtered]);

  return (
    <CRMLayout title="Leads — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="t-hero flex items-center gap-3">
              <Target className="w-7 h-7 text-accent" />
              Leads
            </h1>
            <p className="t-body text-ink-muted mt-1">
              {loading ? 'Carregando…' : `${stats?.total ?? 0} lead${(stats?.total ?? 0) !== 1 ? 's' : ''} rastreados`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar lead…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 w-48 text-[13px]"
              />
            </div>
            <button onClick={loadLeads} className="btn btn-secondary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-apple bg-err-soft text-err-ink text-[13px] mb-6">
            <AlertCircle className="w-4 h-4 shrink-0"/>
            {error}
          </div>
        )}

        {/* Analytics */}
        <AnalyticsRow stats={stats} loading={loading} />

        {/* Pixel de instalação — instrução rápida */}
        <div className="card px-5 py-4 mb-6 border border-dashed border-[rgba(0,0,0,0.1)] bg-canvas">
          <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
            Instalar o T3 Pixel no site do cliente
          </p>
          <pre className="text-[11px] text-ink-soft leading-relaxed whitespace-pre-wrap font-mono">
{`<script>
  window.T3_CLIENT_ID = 'nome-do-cliente';
  window.T3_API_URL   = '${typeof window !== 'undefined' ? window.location.origin : 'https://portal.t3studio.com.br'}';
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://portal.t3studio.com.br'}/t3-pixel.js" async></script>`}
          </pre>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLS.map(col => (
              <div key={col.id} className="min-w-[280px] max-w-[310px] shrink-0 space-y-2.5">
                <div className="h-10 rounded-apple bg-elevated animate-pulse" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 rounded-apple bg-elevated animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6">
            {KANBAN_COLS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                leads={grouped[col.id] || []}
                onOpen={setOpenLead}
                onMove={moveLeadStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lead detail modal */}
      {openLead && (
        <LeadModal
          lead={openLead}
          onClose={() => setOpenLead(null)}
          onMove={moveLeadStatus}
        />
      )}
    </CRMLayout>
  );
}
