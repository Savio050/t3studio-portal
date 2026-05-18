import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import CRMLayout from '../../components/crm/Layout';
import {
  Target, Users, TrendingUp, Flame, Clock, Mail, Phone,
  X, Loader2, Search, ChevronRight, AlertCircle, CheckCircle2,
  ArrowUpRight, Settings, Copy, Check, ChevronDown,
  DollarSign, MessageCircle, BarChart3, Building2,
} from 'lucide-react';

// ── Constantes ─────────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'Novo',                label: 'Novos Leads',         color: '#0071e3', bg: 'rgba(0,113,227,0.06)'  },
  { id: 'Em Atendimento',      label: 'Em Atendimento',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
  { id: 'Negociação Avançada', label: 'Negociação Avançada', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  { id: 'Fechado',             label: 'Fechado',             color: '#30d158', bg: 'rgba(48,209,88,0.06)'  },
];

const EVENT_LABELS = {
  page_view:      { icon: '👁',  label: 'Visualizou página'    },
  form_submit:    { icon: '📋', label: 'Preencheu formulário'  },
  whatsapp_click: { icon: '💬', label: 'Clicou no WhatsApp'   },
  meta_lead:      { icon: '📢', label: 'Lead via Meta Ads'    },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d`;
  if (h > 0)  return `${h}h`;
  if (m > 0)  return `${m}min`;
  return 'agora';
}

function timeAgoLong(dateStr) {
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

function getTempConfig(temperatura) {
  if (temperatura === '🔥 Quente') return { label: 'Quente', from: '#ff6b35', to: '#ff3b30', pct: 85 };
  if (temperatura === '🌡️ Morno')  return { label: 'Morno',  from: '#ff9f0a', to: '#ff6b35', pct: 50 };
  return                                 { label: 'Frio',   from: '#5ac8fa', to: '#0071e3', pct: 18 };
}

// ── WhatsApp / Meta origin icon ────────────────────────────────────────────────
function OrigemIcon({ origem, size = 14 }) {
  if (origem === 'WhatsApp') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#25d366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.133 1.535 5.865L.057 23.85a.5.5 0 0 0 .61.61l6.083-1.594A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.877 9.877 0 0 1-5.034-1.376l-.36-.214-3.733.979.997-3.645-.235-.374A9.861 9.861 0 0 1 2.118 12C2.118 6.529 6.529 2.118 12 2.118S21.882 6.529 21.882 12 17.471 21.882 12 21.882z"/>
      </svg>
    );
  }
  if (origem === 'Meta Ads') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#0071e3">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    );
  }
  // Formulário / Orgânico
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#8e8e93', opacity: 0.6 }} />
  );
}

// ── Score / Temperatura Gradient Bar ──────────────────────────────────────────
function TempGradientBar({ score, temperatura }) {
  const cfg = getTempConfig(temperatura);
  const pct = Math.min((score / 200) * 100, 100);
  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(to right, ${cfg.from}, ${cfg.to})`,
        }}
      />
    </div>
  );
}

function ScoreBar({ score }) {
  const pct   = Math.min((score / 200) * 100, 100);
  const color = score >= 70 ? '#ff3b30' : score >= 30 ? '#ff9500' : '#0071e3';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold shrink-0" style={{ color }}>{score} pts</span>
    </div>
  );
}

// ── Analytics Row — boutique redesign ─────────────────────────────────────────
function AnalyticsRow({ stats, loading, adsSpend }) {
  const cards = [
    {
      label: 'Total de Leads',
      value: stats?.total ?? 0,
      sub: 'leads rastreados',
      icon: Users,
      accent: '#0071e3',
    },
    {
      label: 'Leads Quentes',
      value: stats?.quentes ?? 0,
      sub: `${stats?.taxaQuente ?? 0}% do total`,
      icon: Flame,
      accent: '#ff3b30',
    },
    {
      label: 'Novos Leads',
      value: stats?.novos ?? 0,
      sub: 'sem atendimento',
      icon: Target,
      accent: '#8b5cf6',
    },
    {
      label: 'Fechados',
      value: stats?.fechados ?? 0,
      sub: 'conversões',
      icon: CheckCircle2,
      accent: '#30d158',
    },
    {
      label: 'Invest. em Ads',
      value: adsSpend != null ? `R$ ${adsSpend.toLocaleString('pt-BR')}` : '—',
      sub: 'últimos 30 dias',
      icon: DollarSign,
      accent: '#ff9500',
      muted: adsSpend == null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {cards.map(({ label, value, sub, icon: Icon, accent, muted }) => (
        <div key={label}
          className="rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-surface px-4 py-3.5 relative overflow-hidden">
          {/* accent strip */}
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
            style={{ background: accent, opacity: muted ? 0.3 : 1 }} />
          <div className="pl-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest">{label}</p>
              <Icon className="w-3.5 h-3.5" style={{ color: accent, opacity: muted ? 0.4 : 0.7 }} />
            </div>
            <p className="text-[24px] font-light tracking-tight text-ink leading-none mb-0.5"
              style={{ opacity: muted ? 0.35 : 1 }}>
              {loading ? '·' : value}
            </p>
            <p className="text-[10px] text-ink-faint">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lead Card — redesenho ──────────────────────────────────────────────────────
function LeadCard({ lead, onOpen, onMove }) {
  const [moving, setMoving] = useState(false);
  const initial  = (lead.nome || '??').slice(0, 2).toUpperCase();
  const tempCfg  = getTempConfig(lead.temperatura);
  const waitTime = timeAgo(lead.criadoEm);

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
      className="bg-surface border border-[rgba(0,0,0,0.06)] rounded-[14px] p-3.5 cursor-pointer
        hover:shadow-apple-sm hover:border-[rgba(0,0,0,0.1)] transition-all duration-150 select-none">

      {/* Gradient temperature indicator */}
      <TempGradientBar score={lead.score || 0} temperatura={lead.temperatura} />

      {/* Avatar + nome */}
      <div className="flex items-start gap-2.5 mt-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center
          text-[11px] font-bold text-white brand-gradient">
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
            className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0
              text-ink-faint hover:text-accent hover:bg-accent-soft transition-all cursor-pointer"
          >
            {moving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Meta row: score + origem + wait */}
      <div className="flex items-center justify-between gap-2">
        {/* Temperatura label + origem icon */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
            style={{
              background: `linear-gradient(135deg, ${tempCfg.from}18, ${tempCfg.to}18)`,
              color: tempCfg.to,
            }}>
            {tempCfg.label}
          </span>
          {lead.origem && (
            <span className="flex items-center gap-1 text-[10px] text-ink-faint">
              <OrigemIcon origem={lead.origem} size={11} />
            </span>
          )}
        </div>

        {/* Wait time */}
        {waitTime && (
          <span className="flex items-center gap-1 text-[10px] text-ink-faint shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {waitTime}
          </span>
        )}
      </div>

      {/* Score bar */}
      <div className="mt-2">
        <ScoreBar score={lead.score || 0} />
      </div>

      {/* UTM Campaign */}
      {lead.utmCampaign && (
        <p className="text-[10px] text-ink-faint mt-1.5 truncate">📣 {lead.utmCampaign}</p>
      )}
    </article>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, leads, onOpen, onMove }) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[310px] shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] mb-3"
        style={{ background: col.bg }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
          <p className="text-[12px] font-semibold text-ink">{col.label}</p>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: col.color + '22', color: col.color }}>
          {leads.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {leads.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[12px] text-ink-faint">Sem leads</p>
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

// ── Agency Overview Table ─────────────────────────────────────────────────────
function AgencyOverview({ leads, loading, onSelectClient }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rows = useMemo(() => {
    const map = {};
    leads.forEach(l => {
      const c = l.cliente || 'Desconhecido';
      if (!map[c]) map[c] = { leads: [], today: 0, scores: [], quentes: 0 };
      map[c].leads.push(l);
      map[c].scores.push(l.score || 0);
      if (new Date(l.criadoEm) >= today) map[c].today++;
      if (l.temperatura === '🔥 Quente') map[c].quentes++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        total: d.leads.length,
        today: d.today,
        quentes: d.quentes,
        avgScore: d.scores.length
          ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length)
          : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads, today]);

  if (loading) {
    return (
      <div className="rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-surface overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 border-b border-[rgba(0,0,0,0.04)] animate-pulse bg-elevated last:border-0" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-surface px-6 py-12 text-center">
        <Building2 className="w-8 h-8 text-ink-faint mx-auto mb-3" />
        <p className="text-[14px] font-medium text-ink-soft">Nenhum cliente com leads ainda</p>
        <p className="text-[12px] text-ink-faint mt-1">Instale o T3 Pixel nos sites dos clientes para começar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-surface overflow-hidden">
      {/* Cabeçalho */}
      <div className="grid grid-cols-[1fr_80px_80px_80px_80px_44px] gap-0 px-5 py-3
        border-b border-[rgba(0,0,0,0.06)] bg-[rgba(0,0,0,0.015)]">
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest">Cliente</p>
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest text-right">Total</p>
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest text-right">Hoje</p>
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest text-right">Quentes</p>
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest text-right">Score Méd.</p>
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest text-right">Ads</p>
      </div>

      {rows.map((row, i) => {
        const tempColor = row.avgScore >= 70 ? '#ff3b30' : row.avgScore >= 30 ? '#ff9500' : '#0071e3';
        return (
          <button
            key={row.name}
            onClick={() => onSelectClient(row.name)}
            className="w-full grid grid-cols-[1fr_80px_80px_80px_80px_44px] gap-0 px-5 py-3.5
              border-b border-[rgba(0,0,0,0.04)] last:border-0
              hover:bg-[rgba(0,113,227,0.03)] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center
                text-[10px] font-bold text-ink-soft uppercase shrink-0">
                {row.name.slice(0, 2)}
              </div>
              <span className="text-[13px] font-medium text-ink truncate">{row.name}</span>
            </div>
            <p className="text-[13px] font-semibold text-ink text-right self-center">{row.total}</p>
            <p className="text-[13px] text-right self-center" style={{ color: row.today > 0 ? '#30d158' : '#8e8e93' }}>
              {row.today > 0 ? `+${row.today}` : '—'}
            </p>
            <p className="text-[13px] text-right self-center" style={{ color: row.quentes > 0 ? '#ff3b30' : '#8e8e93' }}>
              {row.quentes > 0 ? `🔥 ${row.quentes}` : '—'}
            </p>
            <p className="text-[13px] font-semibold text-right self-center" style={{ color: tempColor }}>
              {row.avgScore}
            </p>
            <p className="text-[11px] text-ink-faint text-right self-center">—</p>
          </button>
        );
      })}
    </div>
  );
}

// ── Client Selector Dropdown ──────────────────────────────────────────────────
function ClientSelector({ selected, options, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.1)]
          bg-surface text-[13px] font-medium text-ink hover:border-[rgba(0,0,0,0.2)]
          transition-all cursor-pointer min-w-[180px]">
        <Building2 className="w-3.5 h-3.5 text-ink-faint shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected || 'Todos os clientes'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[220px] rounded-[12px]
            bg-surface border border-[rgba(0,0,0,0.1)] shadow-apple-lg overflow-hidden py-1">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left
                hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer
                ${!selected ? 'font-semibold text-accent' : 'text-ink'}`}>
              <BarChart3 className="w-3.5 h-3.5 shrink-0 opacity-60" />
              Todos os clientes
            </button>
            {options.length > 0 && (
              <div className="mx-3 my-1 h-px bg-[rgba(0,0,0,0.06)]" />
            )}
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left
                  hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer
                  ${selected === opt ? 'font-semibold text-accent' : 'text-ink'}`}>
                <div className="w-5 h-5 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center
                  text-[9px] font-bold text-ink-soft uppercase shrink-0">
                  {opt.slice(0, 2)}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pixel Setup Modal ─────────────────────────────────────────────────────────
function PixelSetupModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal.t3studio.com.br';

  const snippet = `<script>
  window.T3_CLIENT_ID = 'nome-do-cliente';
  window.T3_API_URL   = '${origin}';
</script>
<script src="${origin}/t3-pixel.js" async></script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[20px] bg-surface border border-[rgba(0,0,0,0.08)]
        shadow-apple-lg overflow-hidden">

        <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">Instalar T3 Pixel</p>
            <p className="text-[12px] text-ink-muted mt-0.5">Adicione no &lt;head&gt; do site do cliente</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted
              hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-[12px] bg-[#1c1c1e] relative overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-[10px] text-[#8e8e93] font-mono">HTML</p>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1
                  rounded-[6px] transition-all cursor-pointer"
                style={{
                  background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.08)',
                  color: copied ? '#30d158' : '#ebebf5',
                }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="text-[12px] text-[#ebebf5] leading-relaxed whitespace-pre-wrap font-mono px-4 pb-4">
              {snippet}
            </pre>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest">Dicas</p>
            {[
              'Troque nome-do-cliente pelo ID único do cliente (ex: fastimoveis)',
              'O pixel rastreia page_view, form_submit e cliques em WhatsApp automaticamente',
              'Para eventos manuais: window.t3track("whatsapp_click", { nome, telefone })',
            ].map((tip, i) => (
              <p key={i} className="text-[12px] text-ink-muted flex gap-2">
                <span className="shrink-0 text-ink-faint">{i + 1}.</span>
                {tip}
              </p>
            ))}
          </div>
        </div>
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

  const initial  = (lead.nome || '??').slice(0, 2).toUpperCase();
  const colIdx   = KANBAN_COLS.findIndex(c => c.id === lead.status);
  const col      = KANBAN_COLS[colIdx] || KANBAN_COLS[0];
  const tempCfg  = getTempConfig(lead.temperatura);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[20px] flex flex-col overflow-hidden
        bg-surface shadow-apple-lg border border-[rgba(0,0,0,0.08)] max-h-[90vh]">

        {/* Gradient temp strip */}
        <div className="h-[3px] w-full"
          style={{ background: `linear-gradient(to right, ${tempCfg.from}, ${tempCfg.to})` }} />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.06)] flex items-start gap-4 shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center
            text-[14px] font-bold text-white brand-gradient shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-ink">{lead.nome}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                style={{
                  background: `linear-gradient(135deg, ${tempCfg.from}22, ${tempCfg.to}22)`,
                  color: tempCfg.to,
                }}>
                {lead.temperatura}
              </span>
              {lead.origem && (
                <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <OrigemIcon origem={lead.origem} size={12} />
                  {lead.origem}
                </span>
              )}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: col.color + '18', color: col.color }}>
                {lead.status}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted
              hover:text-ink hover:bg-elevated transition-all cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* Score + Infos */}
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] space-y-3">
            <ScoreBar score={lead.score || 0} />
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {lead.email && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.telefone && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{lead.telefone}</span>
                </div>
              )}
              {lead.utmSource && (
                <div className="flex items-center gap-2 text-ink-muted col-span-2">
                  <Target className="w-3 h-3 shrink-0" />
                  <span>
                    {lead.utmSource}
                    {lead.utmMedium   ? ` / ${lead.utmMedium}`   : ''}
                    {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ''}
                  </span>
                </div>
              )}
              {lead.pagina && (
                <div className="flex items-center gap-2 text-ink-muted col-span-2">
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">Converteu em: {lead.pagina}</span>
                </div>
              )}
              {lead.cliente && (
                <div className="flex items-center gap-2 text-ink-muted col-span-2">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">Cliente: {lead.cliente}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-ink-muted col-span-2">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Entrou {timeAgoLong(lead.criadoEm)}</span>
              </div>
            </div>
          </div>

          {/* Mover no funil */}
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-2.5">
              Mover no funil
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {KANBAN_COLS.map(c => (
                <button key={c.id}
                  onClick={() => handleMove(c.id)}
                  disabled={!!moving || lead.status === c.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold
                    transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  style={lead.status === c.id
                    ? { background: c.color + '18', color: c.color, border: `1px solid ${c.color}40` }
                    : { background: 'rgba(0,0,0,0.04)', color: '#6e6e73', border: '1px solid transparent' }
                  }>
                  {moving === c.id
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  }
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline de eventos */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-3">
              Linha do tempo
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando eventos…
              </div>
            ) : events.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Nenhum evento registrado.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[rgba(0,0,0,0.06)]" />
                <div className="space-y-3">
                  {events.map((evt, i) => {
                    const meta = EVENT_LABELS[evt.tipo] || { icon: '📌', label: evt.tipo };
                    return (
                      <div key={evt.id || i} className="flex gap-3 items-start pl-2">
                        <div className="w-7 h-7 rounded-full bg-surface border border-[rgba(0,0,0,0.08)]
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
                          <p className="text-[10px] text-ink-faint mt-1">{timeAgoLong(evt.criadoEm)}</p>
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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'administrador';

  const [leads,       setLeads]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [openLead,    setOpenLead]    = useState(null);
  const [error,       setError]       = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // null = todos (agency view)
  const [pixelModal,  setPixelModal]  = useState(false);

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
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: leadId, status: newStatus }),
    });
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      setOpenLead(prev => prev?.id === leadId ? { ...prev, status: newStatus } : prev);
    }
  }, []);

  // Clientes únicos presentes nos leads
  const clientOptions = useMemo(() => {
    const set = new Set(leads.map(l => l.cliente).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  // Filtra por cliente selecionado + busca textual
  const filtered = useMemo(() => {
    let list = leads;
    // Filtro de cliente — não-admin não vê selector mas os dados não têm filtro extra por agora
    if (isAdmin && selectedClient) {
      list = list.filter(l => l.cliente === selectedClient);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.nome?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.telefone?.includes(q) ||
        l.utmCampaign?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, search, selectedClient, isAdmin]);

  // Stats filtrados
  const filteredStats = useMemo(() => {
    if (!isAdmin || !selectedClient) return stats;
    const total    = filtered.length;
    const quentes  = filtered.filter(l => l.temperatura === '🔥 Quente').length;
    const mornos   = filtered.filter(l => l.temperatura === '🌡️ Morno').length;
    const novos    = filtered.filter(l => l.status === 'Novo').length;
    const fechados = filtered.filter(l => l.status === 'Fechado').length;
    const taxaQuente = total > 0 ? Math.round((quentes / total) * 100) : 0;
    return { total, quentes, mornos, novos, fechados, taxaQuente };
  }, [filtered, stats, isAdmin, selectedClient]);

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

  // Visão agência: sem cliente selecionado + admin
  const isAgencyView = isAdmin && !selectedClient;

  return (
    <CRMLayout title="Leads — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-[1400px] mx-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="t-hero flex items-center gap-2.5">
              <Target className="w-6 h-6 text-accent" />
              Leads
            </h1>
            <p className="t-body text-ink-muted mt-0.5">
              {isAgencyView
                ? `${clientOptions.length} cliente${clientOptions.length !== 1 ? 's' : ''} · ${leads.length} leads`
                : loading ? 'Carregando…' : `${filteredStats?.total ?? 0} lead${(filteredStats?.total ?? 0) !== 1 ? 's' : ''}`
              }
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            {!isAgencyView && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar lead…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-8 w-44 text-[13px]"
                />
              </div>
            )}

            {/* Client selector — apenas admin */}
            {isAdmin && (
              <ClientSelector
                selected={selectedClient}
                options={clientOptions}
                onChange={setSelectedClient}
              />
            )}

            {/* Pixel setup */}
            <button
              onClick={() => setPixelModal(true)}
              title="Configurar T3 Pixel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.1)]
                bg-surface text-[12px] font-medium text-ink-muted hover:text-ink
                hover:border-[rgba(0,0,0,0.2)] transition-all cursor-pointer">
              <Settings className="w-3.5 h-3.5" />
              Pixel
            </button>

            <button onClick={loadLeads}
              className="btn btn-secondary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] bg-err-soft text-err-ink text-[13px] mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Analytics */}
        {!isAgencyView && (
          <AnalyticsRow stats={filteredStats} loading={loading} adsSpend={null} />
        )}

        {/* ── Conteúdo principal ──────────────────────────────────── */}
        {isAgencyView ? (
          /* Visão Agência: tabela comparativa */
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest">
                Visão geral — todos os clientes
              </p>
              <p className="text-[11px] text-ink-faint">
                Clique em um cliente para ver seus leads
              </p>
            </div>
            <AgencyOverview
              leads={leads}
              loading={loading}
              onSelectClient={setSelectedClient}
            />
          </div>
        ) : loading ? (
          /* Kanban skeleton */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLS.map(col => (
              <div key={col.id} className="min-w-[280px] max-w-[310px] shrink-0 space-y-2.5">
                <div className="h-10 rounded-[10px] bg-elevated animate-pulse" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 rounded-[14px] bg-elevated animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* Kanban Board */
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

      {/* Pixel setup modal */}
      {pixelModal && (
        <PixelSetupModal onClose={() => setPixelModal(false)} />
      )}
    </CRMLayout>
  );
}
