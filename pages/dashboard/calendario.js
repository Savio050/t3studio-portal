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

const CLIENT_COLORS = {
  'fastimoveis': { dot: '#fb7185', bg: 'rgba(244,63,94,0.15)', text: '#fb7185', border: 'rgba(244,63,94,0.3)' },
  'mafro':       { dot: '#22d3ee', bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
};

function getClientColor(nome) {
  const key = (nome || '').toLowerCase().replace(/\s+/g,'');
  return CLIENT_COLORS[key] || { dot: '#a78bfa', bg: 'rgba(124,58,237,0.15)', text: '#a78bfa', border: 'rgba(124,58,237,0.3)' };
}

const STATUS_DOT = {
  'aprovado':   '#10b981',
  'aguardando': '#f59e0b',
  'producao':   '#0ea5e9',
  'ajuste':     '#f97316',
  'default':    '#64748b',
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
  const fmt = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'rgba(13,22,37,0.99)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Postagens</p>
            <h2 className="text-base font-bold text-white font-display mt-0.5">
              {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
              text-white/40 hover:text-white hover:bg-white/[0.06]
              transition-all duration-150 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Posts list */}
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {posts.map(post => {
            const cl = getClientColor(post.cliente);
            const sdot = getStatusDot(post.estado);
            return (
              <div key={post.id} className="rounded-xl p-4"
                style={{ background: cl.bg, border: `1px solid ${cl.border}` }}>
                <p className="text-sm font-semibold text-white/90 leading-snug">{post.nome}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {post.cliente && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: cl.text, background: 'rgba(0,0,0,0.3)' }}>
                      {post.cliente}
                    </span>
                  )}
                  {post.formato && (
                    <span className="text-[10px] text-white/40">{post.formato}</span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sdot }} />
                    <span className="text-[10px] text-white/40">{post.estado || '—'}</span>
                  </div>
                </div>
                {post.responsavel && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <User className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] text-white/30">{post.responsavel}</span>
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
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { date, posts }

  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Map posts by date string "YYYY-MM-DD"
  const postsByDate = useMemo(() => {
    const map = {};
    content.forEach(item => {
      const d = item.postagem || item.dataGravacao;
      if (!d) return;
      const key = d.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [content]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
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
  const monthPosts = content.filter(c => (c.postagem || '').startsWith(monthPrefix));
  const monthByClient = {};
  monthPosts.forEach(p => {
    const c = (p.cliente || 'Outros').toLowerCase();
    monthByClient[c] = (monthByClient[c] || 0) + 1;
  });

  return (
    <CRMLayout title="Calendário — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Calendário de Postagens
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {monthPosts.length} postagem{monthPosts.length !== 1 ? 's' : ''} em {MONTHS_PT[month]}
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer
                text-white/50 hover:text-white hover:bg-white/[0.06]
                transition-all duration-150"
              aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[130px]">
              <p className="text-sm font-bold text-white font-display">
                {MONTHS_PT[month]} {year}
              </p>
            </div>
            <button onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer
                text-white/50 hover:text-white hover:bg-white/[0.06]
                transition-all duration-150"
              aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Client legend */}
        {Object.keys(monthByClient).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(monthByClient).map(([client, count]) => {
              const cl = getClientColor(client);
              return (
                <div key={client} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: cl.bg, border: `1px solid ${cl.border}`, color: cl.text }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: cl.dot }} />
                  {client} · {count}
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-bold text-white/25 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="grid grid-cols-7">
              {[...Array(35)].map((_,i) => (
                <div key={i} className="aspect-square p-1.5 border-r border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="w-full h-full rounded-lg animate-pulse bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (!day) return (
                  <div key={`empty-${idx}`} className="aspect-square border-r border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                );

                const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const posts = postsByDate[key] || [];
                const isToday = key === todayStr;
                const hasPosts = posts.length > 0;

                // Get distinct client colors for dots
                const clientDots = [...new Set(posts.map(p => (p.cliente||'').toLowerCase()))]
                  .slice(0, 3)
                  .map(c => getClientColor(c).dot);

                return (
                  <div key={day}
                    onClick={() => hasPosts && handleDayClick(day)}
                    className={`aspect-square border-r border-b p-1.5 flex flex-col
                      transition-all duration-150 relative
                      ${hasPosts ? 'cursor-pointer' : ''}
                    `}
                    style={{
                      borderColor: 'rgba(255,255,255,0.04)',
                      background: hasPosts ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}>

                    {/* Hover overlay */}
                    {hasPosts && (
                      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 rounded-sm pointer-events-none"
                        style={{ background: 'rgba(124,58,237,0.08)' }} />
                    )}

                    {/* Day number */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto
                      ${isToday
                        ? 'text-white'
                        : hasPosts
                          ? 'text-white/80'
                          : 'text-white/30'
                      }`}
                      style={isToday ? { background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' } : {}}>
                      {day}
                    </div>

                    {/* Post dots */}
                    {hasPosts && (
                      <div className="flex items-center justify-center gap-0.5 mt-1 flex-wrap">
                        {clientDots.map((color, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: color }} />
                        ))}
                        {posts.length > 3 && (
                          <span className="text-[8px] text-white/30 font-bold">+{posts.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming posts list */}
        <div className="mt-5 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold text-white/60 font-display mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Próximas postagens — {MONTHS_PT[month]}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : monthPosts.length > 0 ? (
            <div className="space-y-2">
              {monthPosts
                .filter(p => p.postagem)
                .sort((a,b) => new Date(a.postagem) - new Date(b.postagem))
                .map(post => {
                  const cl = getClientColor(post.cliente);
                  const sdot = getStatusDot(post.estado);
                  const [y,m,d] = (post.postagem||'').split('-');
                  const dateLabel = d && m ? `${d}/${m}` : '—';

                  return (
                    <div key={post.id} className="flex items-center gap-3 py-3 border-b last:border-0"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: cl.bg, color: cl.text }}>
                        {dateLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{post.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {post.formato && <span className="text-[10px] text-white/30">{post.formato}</span>}
                          {post.categoria && <span className="text-[10px] text-white/25">{post.categoria}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sdot }} />
                        <span className="text-[10px] text-white/35 font-medium hidden sm:block">
                          {post.estado || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Film className="w-8 h-8 text-white/10 mb-2" />
              <p className="text-sm text-white/30">Nenhuma postagem em {MONTHS_PT[month]}</p>
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
