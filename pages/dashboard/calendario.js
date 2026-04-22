import { useState, useEffect, useMemo } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Calendar, ChevronLeft, ChevronRight, X,
  Clock, Film, User,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// Apple-inspired semantic palette mapped per client key.
// Each entry maps to a small curated palette compatible with the design tokens.
const CLIENT_COLORS = {
  'fastimoveis': {
    dot: '#ff3b30',            // red
    chipBg: 'rgba(255,59,48,0.10)',
    chipText: '#c0271f',
    chipBorder: 'rgba(255,59,48,0.25)',
    badgeClass: 'badge badge-red',
  },
  'mafro': {
    dot: '#30b0c7',            // teal
    chipBg: 'rgba(48,176,199,0.12)',
    chipText: '#0b7f91',
    chipBorder: 'rgba(48,176,199,0.28)',
    badgeClass: 'badge badge-teal',
  },
};

const DEFAULT_CLIENT_COLOR = {
  dot: '#7d3fff',                // purple
  chipBg: 'rgba(125,63,255,0.10)',
  chipText: '#5a27c4',
  chipBorder: 'rgba(125,63,255,0.25)',
  badgeClass: 'badge badge-purple',
};

function getClientColor(nome) {
  const key = (nome || '').toLowerCase().replace(/\s+/g,'');
  return CLIENT_COLORS[key] || DEFAULT_CLIENT_COLOR;
}

// Apple semantic status colors
const STATUS_DOT = {
  'aprovado':   '#34c759', // green
  'aguardando': '#ff9500', // orange
  'producao':   '#0071e3', // accent blue
  'ajuste':     '#ff3b30', // red
  'default':    '#8e8e93', // neutral gray
};

function getStatusDot(estado) {
  const s = (estado||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (s === 'aprovado')                     return STATUS_DOT.aprovado;
  if (s.includes('aguardando'))             return STATUS_DOT.aguardando;
  if (s.includes('producao') || s.includes('produção')) return STATUS_DOT.producao;
  if (s.includes('ajuste'))                 return STATUS_DOT.ajuste;
  return STATUS_DOT.default;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// ── Day Posts Modal ───────────────────────────────────────────────────────────
function DayModal({ date, posts, onClose }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-apple-xl overflow-hidden animate-slide-up bg-surface border border-hairline shadow-apple-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <p className="t-eyebrow">Postagens</p>
            <h2 className="t-title mt-1 text-ink tracking-apple-tight">
              {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all duration-150 cursor-pointer"
            aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Posts list */}
        <div className="p-4 space-y-2.5 max-h-80 overflow-y-auto">
          {posts.map(post => {
            const cl = getClientColor(post.cliente);
            const sdot = getStatusDot(post.estado);
            return (
              <div key={post.id}
                className="rounded-apple p-4 border border-hairline bg-elevated/60">
                <p className="text-sm font-semibold text-ink leading-snug">{post.nome}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {post.cliente && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: cl.chipText, background: cl.chipBg, border: `1px solid ${cl.chipBorder}` }}>
                      {post.cliente}
                    </span>
                  )}
                  {post.formato && (
                    <span className="text-[11px] text-ink-muted">{post.formato}</span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sdot }} />
                    <span className="text-[11px] text-ink-muted">{post.estado || '—'}</span>
                  </div>
                </div>
                {post.responsavel && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <User className="w-3 h-3 text-ink-faint" />
                    <span className="text-[11px] text-ink-muted">{post.responsavel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Calendario() {
  const today = new Date();
  const [year,            setYear]            = useState(today.getFullYear());
  const [month,           setMonth]           = useState(today.getMonth());
  const [content,         setContent]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selected,        setSelected]        = useState(null);
  const [filterCliente,   setFilterCliente]   = useState('');
  const [filterPlataforma, setFilterPlataforma] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Dynamic filter options
  const availableClients = useMemo(() => (
    [...new Set(content.map(c => (c.cliente||'').toLowerCase().replace(/\s+/g,'')).filter(Boolean))]
  ), [content]);

  const availablePlatforms = useMemo(() => {
    const set = new Set();
    content.forEach(c => {
      if (c.plataforma) c.plataforma.split(',').forEach(p => { const t = p.trim(); if (t) set.add(t); });
    });
    return [...set].sort();
  }, [content]);

  // Filtered content
  const filteredContent = useMemo(() => content.filter(item => {
    if (filterCliente) {
      const k = (item.cliente||'').toLowerCase().replace(/\s+/g,'');
      if (k !== filterCliente) return false;
    }
    if (filterPlataforma) {
      const platforms = (item.plataforma||'').split(',').map(p => p.trim().toLowerCase());
      if (!platforms.includes(filterPlataforma.toLowerCase())) return false;
    }
    return true;
  }), [content, filterCliente, filterPlataforma]);

  const nrm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

  // Map posts by date string "YYYY-MM-DD"
  const postsByDate = useMemo(() => {
    const map = {};
    filteredContent.forEach(item => {
      const d = item.postagem || item.dataGravacao;
      if (!d) return;
      const key = d.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [filteredContent]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDay     = getFirstDayOfMonth(year, month);
  const todayStr     = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Calendar grid: leading empty cells + days
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleDayClick = (day) => {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const posts = postsByDate[key] || [];
    if (posts.length > 0) {
      setSelected({ date: new Date(year, month, day), posts });
    }
  };

  // Month stats
  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthPosts = filteredContent.filter(c => (c.postagem || '').startsWith(monthPrefix));
  const monthByClient = {};
  monthPosts.forEach(p => {
    const c = (p.cliente || 'Outros').toLowerCase().replace(/\s+/g,'');
    monthByClient[c] = (monthByClient[c] || 0) + 1;
  });

  return (
    <CRMLayout title="Calendário — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
          <div>
            <p className="t-eyebrow flex items-center gap-1.5">
              <span className="dot dot-blue" />
              Calendário
            </p>
            <h1 className="t-hero text-ink tracking-apple-tight mt-1 flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-accent" />
              {MONTHS_PT[month]} <span className="text-ink-muted font-normal">{year}</span>
            </h1>
            <p className="t-small text-ink-muted mt-1">
              {monthPosts.length} postagem{monthPosts.length !== 1 ? 's' : ''} em {MONTHS_PT[month]}
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button onClick={goToToday}
              className="btn btn-secondary btn-sm">
              Hoje
            </button>
            <div className="flex items-center gap-1 p-1 rounded-apple bg-elevated border border-hairline">
              <button onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-ink-soft hover:text-ink hover:bg-surface transition-all duration-150"
                aria-label="Mês anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-ink-soft hover:text-ink hover:bg-surface transition-all duration-150"
                aria-label="Próximo mês">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Alternating filter list ── */}
        <div className="rounded-apple-lg overflow-hidden mb-5 bg-surface border border-hairline shadow-apple-sm">

          {/* Row 1 — Cliente */}
          <div className="flex items-center border-b border-hairline">
            <div className="shrink-0 px-4 py-3 flex items-center gap-1.5 select-none border-r border-hairline" style={{ minWidth: 120 }}>
              <span className="dot dot-blue" />
              <span className="t-eyebrow">Cliente</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1" style={{ scrollbarWidth:'none' }}>
              {[{ key:'', label:'Todos' }, ...availableClients.map(c => ({ key:c, label:c }))].map(({ key, label }) => {
                const active = filterCliente === key;
                const cl = key ? getClientColor(key) : null;
                return (
                  <button key={key||'todos'}
                    onClick={() => setFilterCliente(active && key ? '' : key)}
                    className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-apple-snug cursor-pointer transition-all duration-150 active:scale-[0.97] border"
                    style={
                      active && key
                        ? { background: cl.chipBg, color: cl.chipText, borderColor: cl.chipBorder }
                        : active
                          ? { background: 'rgba(0,113,227,0.10)', color: '#0071e3', borderColor: 'rgba(0,113,227,0.28)' }
                          : { background: '#fff', color: '#6e6e73', borderColor: 'rgba(0,0,0,0.08)' }
                    }>
                    {label}
                  </button>
                );
              })}
            </div>
            {filterCliente && (
              <button onClick={() => setFilterCliente('')}
                className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-surface border border-hairline transition-colors">
                <X className="w-3 h-3"/>
              </button>
            )}
          </div>

          {/* Row 2 — Plataforma */}
          <div className="flex items-center">
            <div className="shrink-0 px-4 py-3 flex items-center gap-1.5 select-none border-r border-hairline" style={{ minWidth: 120 }}>
              <span className="dot dot-purple" />
              <span className="t-eyebrow">Plataforma</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1" style={{ scrollbarWidth:'none' }}>
              {availablePlatforms.length === 0 ? (
                <span className="text-[11px] text-ink-faint italic">Nenhuma plataforma cadastrada no Notion</span>
              ) : (
                [{ key:'', label:'Todas' }, ...availablePlatforms.map(p => ({ key:p, label:p }))].map(({ key, label }) => {
                  const active = filterPlataforma.toLowerCase() === key.toLowerCase();
                  return (
                    <button key={key||'todas'}
                      onClick={() => setFilterPlataforma(active && key ? '' : key)}
                      className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold tracking-apple-snug cursor-pointer transition-all duration-150 active:scale-[0.97] border"
                      style={
                        active
                          ? { background: 'rgba(125,63,255,0.10)', color: '#5a27c4', borderColor: 'rgba(125,63,255,0.28)' }
                          : { background: '#fff', color: '#6e6e73', borderColor: 'rgba(0,0,0,0.08)' }
                      }>
                      {label}
                    </button>
                  );
                })
              )}
            </div>
            {filterPlataforma && (
              <button onClick={() => setFilterPlataforma('')}
                className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-surface border border-hairline transition-colors">
                <X className="w-3 h-3"/>
              </button>
            )}
          </div>
        </div>

        {/* Client legend */}
        {Object.keys(monthByClient).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(monthByClient).map(([client, count]) => {
              const cl = getClientColor(client);
              return (
                <div key={client}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: cl.chipBg, borderColor: cl.chipBorder, color: cl.chipText }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cl.dot }} />
                  {client} · {count}
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        <div className="rounded-apple-lg overflow-hidden bg-surface border border-hairline shadow-apple-sm">

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-hairline bg-elevated/60">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-ink-muted uppercase tracking-apple-snug">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="grid grid-cols-7">
              {[...Array(35)].map((_,i) => (
                <div key={i} className="aspect-square p-2 border-r border-b border-hairline">
                  <div className="w-full h-full rounded-md animate-pulse bg-elevated" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (!day) return (
                  <div key={`empty-${idx}`} className="aspect-square border-r border-b border-hairline bg-elevated/30" />
                );

                const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const posts = postsByDate[key] || [];
                const isToday = key === todayStr;
                const hasPosts = posts.length > 0;

                // Find first post with an image for hover preview
                const previewImg = posts.find(p => p.linkCapa)?.linkCapa ||
                  posts.find(p => p.galeria)?.galeria?.split(',')[0]?.trim() || null;

                return (
                  <div key={day}
                    onClick={() => hasPosts && handleDayClick(day)}
                    className={`aspect-square border-r border-b border-hairline p-1.5 flex flex-col transition-all duration-150 relative group
                      ${hasPosts ? 'cursor-pointer hover:bg-elevated/70' : ''}
                      ${isToday ? 'bg-accent-soft/60' : ''}
                    `}>

                    {/* Day number */}
                    <div className="flex justify-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold
                        ${isToday ? 'bg-accent text-white' : hasPosts ? 'text-ink' : 'text-ink-muted'}`}>
                        {day}
                      </div>
                    </div>

                    {/* Post chips */}
                    {hasPosts && (
                      <div className="flex flex-col gap-0.5 mt-1 px-0.5">
                        {posts.slice(0, 2).map((p) => {
                          const cl = getClientColor(p.cliente);
                          return (
                            <div key={p.id}
                              className="truncate text-[9px] leading-[1.2] font-semibold rounded-[4px] px-1 py-[2px] border"
                              style={{ background: cl.chipBg, color: cl.chipText, borderColor: cl.chipBorder }}
                              title={p.nome}>
                              {p.nome}
                            </div>
                          );
                        })}
                        {posts.length > 2 && (
                          <span className="text-[9px] text-ink-muted font-semibold px-1">
                            +{posts.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hover image preview — inline expand */}
                    {hasPosts && previewImg && (
                      <div className="max-h-0 group-hover:max-h-16 overflow-hidden transition-all duration-300 ease-out mt-1">
                        <img src={previewImg} alt=""
                          className="w-full aspect-video object-cover rounded-md block border border-hairline"/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming posts list */}
        <div className="mt-6 card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="t-title text-ink tracking-apple-tight">
              Próximas postagens
            </h2>
            <span className="t-small text-ink-muted">· {MONTHS_PT[month]}</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-elevated rounded-apple animate-pulse" />)}
            </div>
          ) : monthPosts.length > 0 ? (
            <div className="divide-y divide-hairline">
              {monthPosts
                .filter(p => p.postagem)
                .sort((a,b) => new Date(a.postagem) - new Date(b.postagem))
                .map(post => {
                  const cl = getClientColor(post.cliente);
                  const sdot = getStatusDot(post.estado);
                  const [y,m,d] = (post.postagem||'').split('-');
                  const dateLabel = d && m ? `${d}/${m}` : '—';

                  const rowPreview = post.linkCapa || post.galeria?.split(',')[0]?.trim() || null;
                  return (
                    <div key={post.id}
                      className="flex items-center gap-3 py-3 group cursor-default">
                      {/* Date badge / thumbnail flip on hover */}
                      {rowPreview ? (
                        <div className="relative shrink-0 w-10 h-10">
                          <div className="w-10 h-10 rounded-apple flex items-center justify-center text-[11px] font-semibold border
                            group-hover:opacity-0 transition-opacity duration-200 absolute inset-0"
                            style={{ background: cl.chipBg, color: cl.chipText, borderColor: cl.chipBorder }}>
                            {dateLabel}
                          </div>
                          <div className="w-10 h-10 rounded-apple overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 border border-hairline">
                            <img src={rowPreview} alt="" className="w-full h-full object-cover"/>
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-apple flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                          style={{ background: cl.chipBg, color: cl.chipText, borderColor: cl.chipBorder }}>
                          {dateLabel}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{post.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {post.cliente && (
                            <span className="text-[11px] text-ink-muted">{post.cliente}</span>
                          )}
                          {post.formato && <span className="text-[11px] text-ink-faint">· {post.formato}</span>}
                          {post.categoria && <span className="text-[11px] text-ink-faint">· {post.categoria}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sdot }} />
                        <span className="text-[11px] text-ink-muted font-medium hidden sm:block">
                          {post.estado || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <Film className="w-8 h-8 text-ink-faint mb-2" />
              <p className="text-sm text-ink-muted">Nenhuma postagem em {MONTHS_PT[month]}</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DayModal
          date={selected.date}
          posts={selected.posts}
          onClose={() => setSelected(null)}
        />
      )}
    </CRMLayout>
  );
}
