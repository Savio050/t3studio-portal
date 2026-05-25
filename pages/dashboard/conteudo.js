import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import CRMLayout from '../../components/crm/Layout';
import {
  Film, X, Loader2, Clock, User, AlertTriangle,
  LayoutGrid, User2, CalendarDays, ChevronLeft, ChevronRight,
  Save, CheckCircle2, Check, Plus, Trash2, Camera,
  Image, FileText, Palette, ExternalLink, Link2,
  ChevronDown, Upload, Video, Play, MessageSquare,
  Share2, Download, Search,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MEMBERS   = ['Matheus', 'Sávio'];
const FORMATOS  = ['Carrossel', 'Stories', 'Post', 'Vídeo curto', 'Estático'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_PT = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];

// ── Dynamic client color palette (deterministic by name) ─────────────────────
const COLOR_PALETTE = [
  { bg:'rgba(244,63,94,0.12)',   text:'#e11d48', border:'rgba(244,63,94,0.28)'  },
  { bg:'rgba(14,165,233,0.12)',  text:'#0284c7', border:'rgba(14,165,233,0.28)' },
  { bg:'rgba(139,92,246,0.12)',  text:'#7c3aed', border:'rgba(139,92,246,0.28)' },
  { bg:'rgba(34,197,94,0.12)',   text:'#15803d', border:'rgba(34,197,94,0.28)'  },
  { bg:'rgba(249,115,22,0.12)',  text:'#c2410c', border:'rgba(249,115,22,0.28)' },
  { bg:'rgba(236,72,153,0.12)',  text:'#be185d', border:'rgba(236,72,153,0.28)' },
  { bg:'rgba(20,184,166,0.12)',  text:'#0f766e', border:'rgba(20,184,166,0.28)' },
  { bg:'rgba(234,179,8,0.12)',   text:'#a16207', border:'rgba(234,179,8,0.28)'  },
];

const ESTADO_OPTIONS = [
  { value: 'não iniciado',         label: 'Não iniciado',      color: '#8e8e93' },
  { value: 'Em Produção',          label: 'Em Produção',       color: '#0071e3' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação', color: '#ff9500' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado', color: '#ff9500' },
  { value: 'Aprovado',             label: 'Aprovado',          color: '#34c759' },
  { value: 'Concluido',            label: 'Concluído',         color: '#8e8e93' },
];

const CONTEUDO_STATES = [
  { value: 'Não iniciada',         label: 'Não iniciada',      color: '#8e8e93' },
  { value: 'Em Produção',          label: 'Em criação',        color: '#0071e3' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação', color: '#ff9500' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado', color: '#ff9500' },
  { value: 'Aprovado',             label: 'Aprovado',          color: '#34c759' },
  { value: 'Concluido',            label: 'Concluído',         color: '#8e8e93' },
];

// Legacy static map kept for backwards compat (now supplemented by dynamic palette)
const CLIENT_COLORS = {};


const FORMAT_COLORS = {
  Reels:     '#8b5cf6', Carrossel: '#0ea5e9', Stories: '#ec4899',
  Post:      '#10b981', Vídeo:     '#f97316', TikTok:  '#f472b6',
  YouTube:   '#ef4444',
};

const PLAT_COLORS = {
  Instagram:'#e1306c', TikTok:'#69c9d0', YouTube:'#ff0000',
  WhatsApp:'#25d366', Facebook:'#1877f2', LinkedIn:'#0a66c2', Pinterest:'#e60023',
};

const SECTION_STATUS = {
  aprovado:      { label: 'Aprovado',     color: '#34c759', bg: 'rgba(52,199,89,0.10)',   border: 'rgba(52,199,89,0.28)'  },
  'em-aprovacao':{ label: 'Em Aprovação', color: '#ff9500', bg: 'rgba(255,149,0,0.10)',   border: 'rgba(255,149,0,0.28)'  },
  'em-producao': { label: 'Em Produção',  color: '#0071e3', bg: 'rgba(0,113,227,0.10)',   border: 'rgba(0,113,227,0.26)'  },
  'em-criacao':  { label: 'Em Criação',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.26)' },
  pendente:      { label: 'Pendente',     color: '#8e8e93', bg: 'rgba(142,142,147,0.08)', border: 'rgba(142,142,147,0.22)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const nrm       = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
function clientColor(name) {
  const k = nrm(name || '').replace(/\s/g,'');
  if (!k) return { bg:'rgba(0,0,0,0.04)', text:'#6b7280', border:'rgba(0,0,0,0.08)' };
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) & 0xffff;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}
const fmtShort  = d => { if (!d) return null; const [,m,day] = d.split('-'); return `${day}/${m}`; };
const fmtFull   = d => { if (!d) return ''; const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
const isoDate   = d => d.toISOString().slice(0, 10);
// Parseia 'YYYY-MM-DD' como data LOCAL (evita bug de UTC que muda o dia em UTC-3)
const parseLocalDate = ds => { if (!ds) return null; const [y,m,d] = ds.split('-').map(Number); return new Date(y, m-1, d); };

const isSlaBreached = (item) => {
  if (!item.lastEditedTime) return false;
  const n = (item.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (n.includes('concluido') || n.includes('postado') || n === 'aprovado') return false;
  return (Date.now() - new Date(item.lastEditedTime)) / 3_600_000 > 48;
};

function sectionStatus(item, section) {
  const e = nrm(item.estado);
  const r = nrm(item.estadoRoteiro);
  if (section === 'tema') {
    if (e === 'aprovado' || e === 'concluido')                                         return 'aprovado';
    if (e.includes('aguardando') || e.includes('ajuste'))                              return 'em-aprovacao';
    if (e.includes('producao') || e.includes('produção'))                              return 'em-producao';
    return 'pendente';
  }
  if (section === 'conteudo') {
    if (r === 'aprovado' || r === 'concluido')                                         return 'aprovado';
    if (r.includes('aguardando') || r.includes('ajuste'))                              return 'em-aprovacao';
    if (r.includes('producao') || r.includes('produção'))                              return 'em-criacao';
    return 'pendente';
  }
  if (section === 'midia') {
    if (item.linkFicheiro || item.linkCapa || item.galeria)                            return 'aprovado';
    return 'pendente';
  }
}

function buildCalendar(year, month) {
  const first      = new Date(year, month, 1);
  const last       = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0
  const days = [];
  for (let i = 0; i < startOffset; i++)
    days.push({ date: new Date(year, month, 1 - startOffset + i), current: false });
  for (let i = 1; i <= last.getDate(); i++)
    days.push({ date: new Date(year, month, i), current: true });
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++)
    days.push({ date: new Date(year, month + 1, i), current: false });
  return days;
}

function weekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
}

function groupByWeek(items) {
  const map = {}, noDate = [];
  items.forEach(item => {
    const ds = item.postagem || item.dataGravacao;
    if (!ds) { noDate.push(item); return; }
    const mon = weekMonday(parseLocalDate(ds));
    const key = isoDate(mon);
    if (!map[key]) map[key] = { monday: mon, items: [] };
    map[key].items.push(item);
  });
  return { weeks: Object.values(map).sort((a,b) => a.monday - b.monday), noDate };
}

function weekLabel(monday) {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  const d1 = monday.getDate(), d2 = sun.getDate();
  const m1 = MONTHS_PT[monday.getMonth()].slice(0,3);
  const m2 = MONTHS_PT[sun.getMonth()].slice(0,3);
  return monday.getMonth() === sun.getMonth() ? `${d1}–${d2} ${m1}` : `${d1} ${m1} – ${d2} ${m2}`;
}

// ── Section status badge ──────────────────────────────────────────────────────
function SectionBadge({ status }) {
  const m = SECTION_STATUS[status] || SECTION_STATUS.pendente;
  return (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

// ── Mini card (Monthly & Weekly) ──────────────────────────────────────────────
function MiniCard({ item, onClick }) {
  const fmtColor  = FORMAT_COLORS[item.formato] || '#8b5cf6';
  const st        = sectionStatus(item, 'tema');
  const stMeta    = SECTION_STATUS[st];
  const previewImg = item.linkCapa || (item.galeria ? item.galeria.split(',')[0]?.trim() : null);

  return (
    <button onClick={() => onClick(item)}
      className="w-full text-left rounded-apple-lg p-1.5 transition-all duration-200 cursor-pointer group overflow-hidden bg-white hover:shadow-apple-sm hover:-translate-y-[1px]"
      style={{ border: `1px solid ${fmtColor}22` }}>
      {/* Hover image preview — expands inline */}
      {previewImg && (
        <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300 ease-out">
          <img src={previewImg} alt="" className="w-full aspect-video object-cover rounded-md mb-1 block"
            style={{ border: `1px solid ${fmtColor}20` }}/>
        </div>
      )}
      <div className="flex items-center gap-1 mb-0.5">
        {item.formato && (
          <span className="text-[9px] font-semibold truncate tracking-apple-snug" style={{ color: fmtColor }}>{item.formato}</span>
        )}
        <div className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: stMeta?.color || '#8e8e93' }}/>
        {isSlaBreached(item) && <span title="Parado há +48h" className="text-[#ff9500]">⚠</span>}
      </div>
      <p className="text-[10px] text-ink-soft leading-tight line-clamp-2 font-medium">{item.nome}</p>
    </button>
  );
}

// ── Card Carousel (Instagram-style) ──────────────────────────────────────────
function CardCarousel({ images, fmtColor, formato, postagem }) {
  const [idx, setIdx] = useState(0);
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  if (!images.length) return (
    <div className="w-full aspect-square flex items-center justify-center relative bg-elevated">
      <Film className="w-10 h-10 opacity-30" style={{ color: fmtColor }}/>
      {formato && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-pill"
          style={{ background:'rgba(255,255,255,0.9)', color:fmtColor, border:`1px solid ${fmtColor}30`, backdropFilter:'blur(8px)' }}>
          {formato}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative w-full aspect-square overflow-hidden group/car select-none bg-elevated">
      {/* Image */}
      <img src={images[idx]} alt="" className="w-full h-full object-cover transition-opacity duration-200"/>

      {/* Format badge */}
      {formato && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-pill z-10"
          style={{ background:'rgba(255,255,255,0.92)', color:fmtColor, border:`1px solid ${fmtColor}30`, backdropFilter:'blur(8px)' }}>
          {formato}
        </span>
      )}
      {postagem && images.length <= 1 && (
        <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md z-10"
          style={{ background:'rgba(255,255,255,0.92)', color:'#1d1d1f', backdropFilter:'blur(8px)' }}>
          {fmtShort(postagem)}
        </span>
      )}

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10
              opacity-0 group-hover/car:opacity-100 transition-all duration-150 cursor-pointer hover:scale-110 bg-white/90 backdrop-blur shadow-apple-sm hover:shadow-apple">
            <ChevronLeft className="w-4 h-4 text-ink"/>
          </button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10
              opacity-0 group-hover/car:opacity-100 transition-all duration-150 cursor-pointer hover:scale-110 bg-white/90 backdrop-blur shadow-apple-sm hover:shadow-apple">
            <ChevronRight className="w-4 h-4 text-ink"/>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-200 cursor-pointer"
                style={{ width: i===idx?16:6, height:6, background: i===idx?'white':'rgba(255,255,255,0.5)', boxShadow: i===idx?'0 1px 2px rgba(0,0,0,0.2)':'none' }}/>
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md z-10"
            style={{ background:'rgba(255,255,255,0.92)', color:'#1d1d1f', backdropFilter:'blur(8px)' }}>
            {idx+1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ item, onClick }) {
  const cl        = clientColor(item.cliente);
  const fmtColor  = FORMAT_COLORS[item.formato] || '#8b5cf6';
  const tabs      = ['tema', 'conteudo', 'midia'];
  const isCar     = isCarouselFmt(item.formato);
  const carImages = isCar && item.galeria
    ? item.galeria.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  return (
    <button onClick={() => onClick(item)}
      className="text-left rounded-apple-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group bg-surface border border-hairline shadow-apple-sm hover:shadow-apple-md">

      {/* Cover / carousel */}
      {isCar ? (
        <CardCarousel images={carImages} fmtColor={fmtColor} formato={item.formato} postagem={item.postagem}/>
      ) : (
        <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden bg-elevated">
          {item.linkCapa
            ? <img src={item.linkCapa} alt="" className="w-full h-full object-cover"/>
            : <Film className="w-10 h-10 opacity-30" style={{ color: fmtColor }}/>
          }
          {item.formato && (
            <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-pill"
              style={{ background:'rgba(255,255,255,0.92)', color:fmtColor, border:`1px solid ${fmtColor}30`, backdropFilter:'blur(8px)' }}>
              {item.formato}
            </span>
          )}
          {item.postagem && (
            <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background:'rgba(255,255,255,0.92)', color:'#1d1d1f', backdropFilter:'blur(8px)' }}>
              {fmtShort(item.postagem)}
            </span>
          )}
        </div>
      )}

      <div className="p-3">
        {/* Client + title */}
        {item.cliente && (
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1.5 inline-block"
            style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}>
            {item.cliente}
          </span>
        )}
        <p className="text-[13px] font-semibold text-ink leading-snug line-clamp-2 mb-3 tracking-apple-snug">{item.nome}</p>
        {isSlaBreached(item) && (
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3 h-3 text-[#ff9500]" />
            <span className="text-[10px] font-semibold text-[#ff9500]">Parado há +48h</span>
          </div>
        )}

        {/* Section status row */}
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(s => {
            const st   = sectionStatus(item, s);
            const meta = SECTION_STATUS[st];
            const labels = { tema: 'Tema', conteudo: 'Conteúdo', midia: 'Mídia' };
            return (
              <div key={s} className="flex flex-col items-center gap-0.5 py-1.5 rounded-apple"
                style={{ background: meta.bg }}>
                <span className="text-[8px] font-semibold text-ink-faint uppercase tracking-wider">{labels[s]}</span>
                <span className="text-[9px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}

// ── Day items modal (shows all items for a single day) ────────────────────────
function DayItemsModal({ date, items, onSelect, onClose }) {
  const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full max-w-sm rounded-apple-2xl overflow-hidden bg-surface border border-hairline shadow-apple-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <p className="t-eyebrow text-ink-muted">{items.length} conteúdos</p>
            <h3 className="text-[15px] font-semibold text-ink capitalize mt-0.5 tracking-apple-tight">{label}</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* List */}
        <div className="p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
          {items.map(item => (
            <button key={item.id} onClick={() => { onClose(); onSelect(item); }}
              className="w-full text-left rounded-apple-lg p-3 cursor-pointer transition-all bg-surface border border-hairline hover:bg-elevated hover:shadow-apple-sm">
              <div className="flex items-center gap-2 mb-1">
                {item.formato && (
                  <span className="text-[9px] font-semibold" style={{ color: FORMAT_COLORS[item.formato]||'#8b5cf6' }}>
                    {item.formato}
                  </span>
                )}
                {item.cliente && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider ml-auto"
                    style={{ color: clientColor(item.cliente).text }}>
                    {item.cliente}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-ink leading-snug">{item.nome}</p>
              {item.responsavel && (
                <p className="text-[11px] text-ink-muted mt-1">{item.responsavel}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Monthly view ──────────────────────────────────────────────────────────────
function MonthlyView({ items, onSelect, loading, year, month, onPrev, onNext }) {
  const days     = buildCalendar(year, month);
  const byDate   = {};
  items.forEach(item => {
    const d = item.postagem || item.dataGravacao;
    if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(item); }
  });
  const todayStr = isoDate(new Date());
  const [dayModal, setDayModal] = useState(null); // { date, items }

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onPrev} className="w-9 h-9 flex items-center justify-center rounded-apple cursor-pointer text-ink-muted hover:text-ink hover:bg-elevated transition-all"><ChevronLeft className="w-4 h-4"/></button>
        <span className="t-title text-ink min-w-[160px]">{MONTHS_PT[month]} {year}</span>
        <button onClick={onNext} className="w-9 h-9 flex items-center justify-center rounded-apple cursor-pointer text-ink-muted hover:text-ink hover:bg-elevated transition-all"><ChevronRight className="w-4 h-4"/></button>
        <span className="t-small text-ink-muted ml-1">
          {items.filter(i => i.postagem || i.dataGravacao).length} postagens
        </span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_PT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-ink-faint uppercase tracking-wider py-1.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, current }, i) => {
          const ds       = isoDate(date);
          const dayItems = byDate[ds] || [];
          const isToday  = ds === todayStr;
          const PREVIEW  = 2; // cards shown before "ver todos"
          return (
            <div key={i} className="min-h-[96px] p-1.5 rounded-apple-lg transition-all duration-150"
              style={{
                background: isToday ? 'rgba(0,113,227,0.06)' : current ? '#ffffff' : 'transparent',
                border: isToday ? '1px solid rgba(0,113,227,0.28)' : `1px solid ${current ? 'rgba(0,0,0,0.05)' : 'transparent'}`,
                opacity: current ? 1 : 0.5,
              }}>
              <div className={`text-[11px] font-semibold mb-1.5 w-5 h-5 flex items-center justify-center rounded-full
                ${isToday ? 'bg-accent text-white text-[10px]' : 'text-ink-muted'}`}>
                {date.getDate()}
              </div>
              {loading
                ? i < 7 && <div className="h-8 rounded-md animate-pulse bg-elevated"/>
                : (
                  <div className="space-y-1">
                    {dayItems.slice(0, PREVIEW).map(item => (
                      <MiniCard key={item.id} item={item} onClick={onSelect}/>
                    ))}
                    {dayItems.length > PREVIEW && (
                      <button
                        onClick={() => setDayModal({ date, items: dayItems })}
                        className="text-[10px] font-semibold w-full text-center py-1 rounded-pill cursor-pointer transition-all bg-accent-soft text-accent-ink hover:bg-accent hover:text-white">
                        +{dayItems.length - PREVIEW} mais
                      </button>
                    )}
                  </div>
                )
              }
            </div>
          );
        })}
      </div>

      {dayModal && (
        <DayItemsModal
          date={dayModal.date}
          items={dayModal.items}
          onSelect={onSelect}
          onClose={() => setDayModal(null)}
        />
      )}
    </div>
  );
}

// ── Weekly view ───────────────────────────────────────────────────────────────
function WeeklyView({ items, onSelect, loading, year, month, onPrev, onNext }) {
  const { weeks, noDate } = groupByWeek(items);
  const monthWeeks = weeks.filter(({ monday }) => {
    const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
    return monday.getMonth() === month || sun.getMonth() === month;
  });
  const todayD = new Date(); todayD.setHours(0,0,0,0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onPrev} className="w-9 h-9 flex items-center justify-center rounded-apple cursor-pointer text-ink-muted hover:text-ink hover:bg-elevated transition-all"><ChevronLeft className="w-4 h-4"/></button>
        <span className="t-title text-ink min-w-[160px]">{MONTHS_PT[month]} {year}</span>
        <button onClick={onNext} className="w-9 h-9 flex items-center justify-center rounded-apple cursor-pointer text-ink-muted hover:text-ink hover:bg-elevated transition-all"><ChevronRight className="w-4 h-4"/></button>
        <span className="t-small text-ink-muted">{items.length} conteúdos</span>
      </div>

      {loading ? (
        <div className="flex gap-4">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="min-w-[260px] flex-1 h-48 rounded-apple-xl animate-pulse bg-elevated"/>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {monthWeeks.length === 0 && noDate.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <CalendarDays className="w-10 h-10 text-ink-faint mb-3"/>
              <p className="t-body text-ink-muted">Nenhum conteúdo em {MONTHS_PT[month]}</p>
            </div>
          )}
          {monthWeeks.map(({ monday, items: wi }) => {
            const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
            const isCurrent = todayD >= monday && todayD <= sun;
            return (
              <div key={isoDate(monday)} className="flex flex-col min-w-[240px] max-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"/>}
                    <p className={`text-[12px] font-semibold ${isCurrent ? 'text-accent' : 'text-ink-soft'}`}>{weekLabel(monday)}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill"
                    style={{ background: isCurrent ? 'rgba(0,113,227,0.12)' : 'rgba(0,0,0,0.04)', color: isCurrent ? '#0071e3' : '#6b7280' }}>
                    {wi.length}
                  </span>
                </div>
                <div className="flex-1 rounded-apple-lg p-2 space-y-1.5 min-h-[80px]"
                  style={{ background: isCurrent ? 'rgba(0,113,227,0.04)' : '#f5f5f7', border: isCurrent ? '1px solid rgba(0,113,227,0.22)' : '1px solid rgba(0,0,0,0.05)' }}>
                  {wi.sort((a,b) => (a.postagem||a.dataGravacao||'') > (b.postagem||b.dataGravacao||'') ? 1 : -1)
                     .map(item => <MiniCard key={item.id} item={item} onClick={onSelect}/>)}
                </div>
              </div>
            );
          })}
          {noDate.length > 0 && (
            <div className="flex flex-col min-w-[220px] max-w-[260px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[12px] font-semibold text-ink-muted">Sem data</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill bg-elevated text-ink-muted">{noDate.length}</span>
              </div>
              <div className="flex-1 rounded-apple-lg p-2 space-y-1.5 min-h-[80px] bg-elevated border border-dashed border-hairline">
                {noDate.map(item => <MiniCard key={item.id} item={item} onClick={onSelect}/>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Feed view ─────────────────────────────────────────────────────────────────
function FeedView({ items, onSelect, loading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {loading
        ? [...Array(8)].map((_,i) => <div key={i} className="h-52 rounded-apple-xl animate-pulse bg-elevated"/>)
        : items.length === 0
          ? (
            <div className="col-span-full flex flex-col items-center py-24">
              <Film className="w-10 h-10 text-ink-faint mb-3"/>
              <p className="t-body text-ink-muted">Nenhum conteúdo encontrado</p>
            </div>
          )
          : items.map(item => <FeedCard key={item.id} item={item} onClick={onSelect}/>)
      }
    </div>
  );
}

// ── New Content Modal ─────────────────────────────────────────────────────────
function NewContentModal({ onClose, onCreate, clientsList = [] }) {
  // build clientIds map from list
  const clientIds = {};
  clientsList.forEach(c => {
    if (c.idCliente) clientIds[nrm(c.nome).replace(/\s/g,'')] = c.idCliente;
  });
  const [nome,         setNome]         = useState('');
  const [cliente,      setCliente]      = useState('');
  const [formato,      setFormato]      = useState('');
  const [responsavel,  setResponsavel]  = useState('');
  const [postagem,     setPostagem]     = useState('');
  const [dataGravacao, setDataGravacao] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const memberColors = {
    Matheus: { bg:'rgba(139,92,246,0.12)', text:'#7c3aed', border:'rgba(139,92,246,0.3)' },
    Sávio:   { bg:'rgba(52,199,89,0.12)',  text:'#15803d', border:'rgba(52,199,89,0.3)' },
  };

  const submit = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true); setError('');
    try {
      // Look up the client's portal ID so the item appears in the client portal
      const idCliente = clientIds[(cliente||'').toLowerCase().replace(/\s+/g, '')] || '';
      const res = await fetch('/api/crm/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, cliente, formato, responsavel,
          postagem: postagem||undefined,
          dataGravacao: dataGravacao||undefined,
          idCliente: idCliente||undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { content } = await res.json();
      onCreate(content); onClose();
    } catch { setError('Erro ao criar. Tente novamente.'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-apple-2xl flex flex-col overflow-hidden bg-surface border border-hairline shadow-apple-xl" style={{ maxHeight:'90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <p className="t-title text-ink">Novo conteúdo</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Nome <span className="text-err">*</span></label>
            <input autoFocus type="text" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()}
              placeholder="Ex: Reels lançamento novembro"
              className="input"/>
          </div>
          <SelectField
            label="Cliente"
            value={cliente}
            onChange={setCliente}
            placeholder="Selecionar cliente…"
            options={clientsList.map(c => ({ value: c.nome, label: c.nome }))}
          />
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Formato</label>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map(f => {
                const active = formato === f; const fc = FORMAT_COLORS[f] || '#8b5cf6';
                return <button key={f} type="button" onClick={() => setFormato(active ? '' : f)}
                  className="px-3 py-1.5 rounded-apple text-xs font-semibold cursor-pointer transition-all"
                  style={{ background: active ? `${fc}18` : '#f5f5f7', border: `1px solid ${active ? `${fc}40` : 'rgba(0,0,0,0.06)'}`, color: active ? fc : '#6b7280' }}>
                  {f}
                </button>;
              })}
            </div>
          </div>
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Responsável</label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const c = memberColors[m] || {}; const active = responsavel === m;
                return <button key={m} type="button" onClick={() => setResponsavel(active ? '' : m)}
                  className="flex-1 py-2.5 rounded-apple text-sm font-semibold cursor-pointer transition-all"
                  style={{ background: active ? c.bg : '#f5f5f7', border: `1px solid ${active ? c.border : 'rgba(0,0,0,0.06)'}`, color: active ? c.text : '#6b7280' }}>
                  {m}
                </button>;
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['Gravação', dataGravacao, setDataGravacao], ['Postagem', postagem, setPostagem]].map(([lbl, val, set]) => (
              <div key={lbl}>
                <label className="block t-eyebrow text-ink-muted mb-2">{lbl}</label>
                <input type="date" value={val} onChange={e => set(e.target.value)} className="input"/>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-err px-3 py-2 rounded-apple bg-err-soft border border-err/20">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-hairline flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button onClick={submit} disabled={!nome.trim()||saving} className="btn btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            {saving ? 'Criando…' : 'Criar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upload zone (presigned R2) ────────────────────────────────────────────────
function UploadZone({ label, accept, multiple = false, onUpload }) {
  const inputRef   = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const [prog, setProg] = useState('');

  const handleFiles = async (files) => {
    if (!files?.length || busy) return;
    setBusy(true); setErr(''); setProg('');
    try {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (files.length > 1) setProg(`Enviando ${i + 1}/${files.length}…`);
        else setProg('Gerando URL…');

        // Step 1: get presigned URL
        let r;
        try {
          r = await fetch('/api/crm/upload', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ filename: file.name, contentType: file.type }),
          });
        } catch {
          throw new Error('Sem conexão com o servidor. Verifique sua internet.');
        }

        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Servidor retornou ${r.status}`);
        }

        const { presignedUrl, publicUrl } = await r.json();
        setProg(files.length > 1 ? `Enviando arquivo ${i + 1}/${files.length}…` : 'Enviando arquivo…');

        // Step 2: PUT directly to R2
        let up;
        try {
          up = await fetch(presignedUrl, {
            method:  'PUT',
            body:    file,
            headers: { 'Content-Type': file.type },
          });
        } catch {
          throw new Error('Falha ao enviar para o servidor de mídia. Verifique as configurações R2.');
        }

        if (!up.ok) throw new Error(`Upload falhou (${up.status})`);
        results.push(publicUrl);
      }
      onUpload(multiple ? results : results[0]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false); setProg('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={e => handleFiles([...e.target.files])} />
      <button onClick={() => inputRef.current?.click()} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-apple text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 bg-elevated hover:bg-muted-200 text-ink-soft border border-dashed border-hairline hover:border-accent/30">
        {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> {prog || 'Enviando…'}</> : <><Upload className="w-3.5 h-3.5"/> {label}</>}
      </button>
      {err && (
        <p className="text-[11px] text-err mt-1.5 px-2 py-1.5 rounded-apple leading-snug bg-err-soft border border-err/20">
          {err}
        </p>
      )}
    </div>
  );
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtNorm(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function isVideoFmt(formato) {
  const f = fmtNorm(formato);
  return ['video', 'reels', 'reel', 'tiktok', 'youtube'].some(k => f.includes(k));
}
function isCarouselFmt(formato) {
  return fmtNorm(formato).includes('carrossel');
}

// ── Reusable collapsible select ───────────────────────────────────────────────
function SelectField({ label, value, options, onChange, placeholder = 'Selecionar…', colorDot = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const selected = options.find(o => nrm(String(o.value)) === nrm(String(value)));

  return (
    <div ref={ref} className="relative">
      {label && <label className="block t-eyebrow text-ink-muted mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-apple
          bg-elevated border border-hairline text-[13px] font-medium text-left
          hover:border-[rgba(0,113,227,0.3)] transition-all cursor-pointer">
        <span className="flex items-center gap-2 min-w-0">
          {colorDot && selected?.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.color }}/>
          )}
          <span className={`truncate ${selected ? 'text-ink' : 'text-ink-faint'}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-faint shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-1 rounded-apple-lg
          bg-surface border border-hairline shadow-apple-md overflow-hidden">
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center px-3 py-2 text-[12px] text-ink-faint
              hover:bg-elevated cursor-pointer transition-colors">
            Limpar seleção
          </button>
          <div className="hairline mx-2"/>
          {options.map(opt => {
            const active = nrm(String(opt.value)) === nrm(String(value));
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left
                  cursor-pointer transition-colors
                  ${active ? 'bg-accent/8 text-accent font-semibold' : 'hover:bg-elevated text-ink'}`}>
                {colorDot && opt.color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? opt.color : opt.color + '99' }}/>
                )}
                <span className="flex-1">{opt.label}</span>
                {opt.desc && <span className="text-[10px] text-ink-faint">{opt.desc}</span>}
                {active && <Check className="w-3.5 h-3.5 shrink-0"/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Detail Panel — vertical layout (tabs left, content right) ────────────────
function DetailPanel({ item, onSave, onDelete, onClose, clientsList = [] }) {
  const availableClients = clientsList.map(c => c.nome);
  const [tab,         setTab]         = useState('tema');
  const [nome,        setNome]        = useState(item.nome);
  const [formato,     setFormato]     = useState(item.formato || '');
  const [cliente,     setCliente]     = useState(item.cliente || '');
  const [plataforma,  setPlataforma]  = useState(item.plataforma || '');
  const [responsavel, setResponsavel] = useState(item.responsavel || '');
  const [estado,      setEstado]      = useState(item.estado || '');
  const [estadoR,     setEstadoR]     = useState(item.estadoRoteiro || '');
  const [conteudo,    setConteudo]    = useState(item.conteudo || '');
  const [postagem,    setPostagem]    = useState(item.postagem || '');
  const [gravacao,    setGravacao]    = useState(item.dataGravacao || '');
  const [linkDrive,   setLinkDrive]   = useState(item.linkDrive || '');
  const [pontos,      setPontos]      = useState(item.pontos || '');
  const [galeriaList, setGaleriaList] = useState(() =>
    item.galeria ? item.galeria.split(',').map(u => u.trim()).filter(Boolean) : []
  );
  const [saving,            setSaving]           = useState(false);
  const [saved,             setSaved]            = useState(false);
  const [saveError,         setSaveError]        = useState('');
  const [confirmDel,        setConfirmDel]       = useState(false);
  const [deleting,          setDeleting]         = useState(false);
  const [generatingScript,  setGeneratingScript] = useState(false);
  const [scriptError,       setScriptError]      = useState('');
  const [mediaError,        setMediaError]       = useState('');

  const generateScript = async () => {
    if (generatingScript) return;
    setGeneratingScript(true);
    setScriptError('');
    try {
      // 1. Fetch instruction file from prompts folder
      const clienteVal  = (cliente || item.cliente || '').trim();
      const formatoVal  = (formato || item.formato || '').trim();
      const temaVal     = (nome    || item.nome    || '').trim();
      const qs = new URLSearchParams({ cliente: clienteVal, formato: formatoVal, tema: temaVal });
      const promptRes = await fetch(`/api/crm/prompts?${qs}`);
      const promptData = await promptRes.json();

      // Build the generation message — include instructions if found
      let userMessage = `Gere um roteiro profissional com base nos seguintes dados:\n\n`;
      userMessage += `- Cliente: ${clienteVal || '(não definido)'}\n`;
      userMessage += `- Formato: ${formatoVal || '(não definido)'}\n`;
      userMessage += `- Tema: ${temaVal}\n`;
      if (plataforma || item.plataforma) userMessage += `- Plataforma: ${plataforma || item.plataforma}\n`;
      if (conteudo?.trim()) userMessage += `\nRasunho existente (expanda ou melhore):\n${conteudo.trim()}\n`;

      if (promptData.content) {
        userMessage += `\nInstruções de estilo e estrutura para este cliente/formato/tema:\n\n${promptData.content}`;
        if (promptData.type && promptData.type !== 'exact') {
          userMessage += `\n\n(Arquivo mais próximo encontrado: ${promptData.path}. Adapte ao tema específico acima.)`;
        }
      } else {
        userMessage += `\n\nGere um roteiro profissional, bem estruturado, com gancho, desenvolvimento e call to action claro.`;
      }

      // 2. Send to AI assistant
      const aiRes = await fetch('/api/crm/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok || aiData.error) throw new Error(aiData.error || 'Erro ao gerar roteiro');

      setConteudo(aiData.reply || '');
    } catch (e) {
      setScriptError(e.message || 'Erro ao gerar roteiro com IA');
    } finally {
      setGeneratingScript(false);
    }
  };

  useEffect(() => {
    setNome(item.nome); setFormato(item.formato||''); setCliente(item.cliente||'');
    setPlataforma(item.plataforma||''); setResponsavel(item.responsavel||'');
    setEstado(item.estado||''); setEstadoR(item.estadoRoteiro||'');
    setConteudo(item.conteudo||''); setPostagem(item.postagem||'');
    setGravacao(item.dataGravacao||''); setLinkDrive(item.linkDrive||'');
    setGaleriaList(item.galeria ? item.galeria.split(',').map(u => u.trim()).filter(Boolean) : []);
    setPontos(item.pontos||'');
    setTab('tema');
  }, [item.id]);

  const dirty = nome !== item.nome || formato !== (item.formato||'') ||
    cliente !== (item.cliente||'') || plataforma !== (item.plataforma||'') ||
    responsavel !== (item.responsavel||'') ||
    estado !== (item.estado||'') || estadoR !== (item.estadoRoteiro||'') ||
    conteudo !== (item.conteudo||'') || postagem !== (item.postagem||'') ||
    gravacao !== (item.dataGravacao||'') || linkDrive !== (item.linkDrive||'') || pontos !== (item.pontos||'');

  const save = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true); setSaveError('');
    try {
      await onSave(item.id, { nome, formato: formato||undefined, cliente: cliente||undefined, plataforma: plataforma||undefined, responsavel, estado, estadoRoteiro: estadoR, conteudo, postagem: postagem||undefined, dataGravacao: gravacao||undefined, linkDrive: linkDrive||undefined, pontos: pontos||undefined });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async (fields) => {
    setMediaError('');
    try {
      await onSave(item.id, fields);
    } catch (e) {
      setMediaError(e?.message || 'Erro ao salvar mídia. Verifique se o campo existe no Notion.');
    }
  };

  const addGalleryImages = async (urls) => {
    const next = [...galeriaList, ...urls];
    setGaleriaList(next);
    await saveMedia({ galeria: next.join(',') });
  };

  const removeGalleryImage = async (idx) => {
    const next = galeriaList.filter((_, i) => i !== idx);
    setGaleriaList(next);
    await saveMedia({ galeria: next.join(',') });
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true); await onDelete(item.id); onClose();
  };

  const cl = clientColor(cliente || item.cliente);
  const memberColors = {
    Matheus: { bg:'rgba(139,92,246,0.12)', text:'#7c3aed', border:'rgba(139,92,246,0.3)' },
    Sávio:   { bg:'rgba(52,199,89,0.12)',  text:'#15803d', border:'rgba(52,199,89,0.3)' },
  };

  const TABS = [
    { id:'tema',     label:'Tema',     icon: Palette,       section:'tema'     },
    { id:'conteudo', label:'Conteúdo', icon: FileText,       section:'conteudo' },
    { id:'midia',    label:'Mídia',    icon: Image,          section:'midia'    },
    { id:'feedback', label:'Feedback', icon: MessageSquare,  section:'feedback' },
  ];

  // ── Tab content renderers ──────────────────────────────────────────────────
  const renderTema = () => (
    <div className="space-y-4">
      <div>
        <label className="block t-eyebrow text-ink-muted mb-1.5">Título</label>
        <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input"/>
      </div>

      {/* Cliente */}
      <SelectField
        label="Cliente"
        value={cliente}
        onChange={setCliente}
        placeholder="Sem cliente"
        options={availableClients.map(c => ({
          value: c,
          label: c.charAt(0).toUpperCase() + c.slice(1),
        }))}
      />

      {/* Formato */}
      <SelectField
        label="Formato"
        value={formato}
        onChange={setFormato}
        placeholder="Sem formato"
        options={FORMATOS.map(f => ({ value: f, label: f }))}
      />

      {/* Plataforma */}
      <SelectField
        label="Plataforma"
        value={plataforma}
        onChange={setPlataforma}
        placeholder="Sem plataforma"
        options={['Instagram','TikTok','YouTube','WhatsApp','Facebook','LinkedIn','Pinterest'].map(p => ({ value: p, label: p }))}
      />

      <SelectField
        label="Responsável"
        value={responsavel}
        onChange={setResponsavel}
        placeholder="Sem responsável"
        options={MEMBERS.map(m => ({ value: m, label: m }))}
      />
      <SelectField
        label="Estado"
        value={estado}
        onChange={setEstado}
        placeholder="Sem estado"
        colorDot
        options={ESTADO_OPTIONS.map(s => ({ value: s.value, label: s.label, color: s.color }))}
      />
      {/* Pontos de Esforço */}
      <SelectField
        label="Pontos de Esforço"
        value={pontos}
        onChange={setPontos}
        placeholder="Não definido"
        options={[
          { value: '1 pt',   label: '1 pt',   desc: 'Post / Story' },
          { value: '2 pts',  label: '2 pts',  desc: 'Carrossel' },
          { value: '3 pts',  label: '3 pts',  desc: 'Vídeo Básico' },
          { value: '4 pts',  label: '4 pts',  desc: 'Edição Elaborada' },
          { value: '5 pts',  label: '5 pts',  desc: 'Hero / Superprodução' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        {[['Gravação', gravacao, setGravacao], ['Postagem', postagem, setPostagem]].map(([lbl,val,set]) => (
          <div key={lbl}>
            <label className="block t-eyebrow text-ink-muted mb-1.5">{lbl}</label>
            <input type="date" value={val} onChange={e => set(e.target.value)} className="input"/>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConteudo = () => (
    <div className="space-y-4">
      <SelectField
        label="Estado do Roteiro"
        value={estadoR}
        onChange={setEstadoR}
        placeholder="Sem estado"
        colorDot
        options={CONTEUDO_STATES.map(s => ({ value: s.value, label: s.label, color: s.color }))}
      />
      <div className="flex-1 flex flex-col">
        {/* Roteiro header + AI button */}
        <div className="flex items-center justify-between mb-1.5">
          <label className="t-eyebrow text-ink-muted">Roteiro</label>
          <button
            type="button"
            onClick={generateScript}
            disabled={generatingScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-semibold
              transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: generatingScript ? 'rgba(175,82,222,0.08)' : 'rgba(175,82,222,0.10)',
              border: '1px solid rgba(175,82,222,0.28)',
              color: '#7c3aed',
            }}>
            {generatingScript ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin"/>
                Gerando…
              </>
            ) : (
              <>
                {/* sparkle icon inline */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
                Gerar com IA
              </>
            )}
          </button>
        </div>
        <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={11}
          placeholder="Escreva o conteúdo ou roteiro aqui… ou clique em &quot;Gerar com IA&quot; ✨"
          className="input leading-relaxed resize-none"/>
        <div className="flex items-center justify-between mt-1">
          {scriptError ? (
            <p className="text-[10px] text-err font-medium">{scriptError}</p>
          ) : (
            <p className="text-[10px] text-ink-faint">
              {generatingScript ? 'A IA está lendo as instruções e gerando o roteiro…' : ''}
            </p>
          )}
          <p className="text-[10px] text-ink-faint ml-auto">{conteudo.length} chars</p>
        </div>
      </div>
      {item.feedbackRoteiro && (
        <div className="px-3 py-2.5 rounded-apple bg-warn-soft border border-warn/20">
          <p className="text-[10px] text-warn-ink font-semibold uppercase tracking-wider mb-1">Feedback</p>
          <p className="text-xs text-warn-ink leading-relaxed">{item.feedbackRoteiro}</p>
        </div>
      )}
    </div>
  );

  const renderMidia = () => {
    const isVid = isVideoFmt(item.formato);
    const isCar = isCarouselFmt(item.formato);

    if (isVid) return (
      <div className="space-y-3">
        {/* Preview vídeo */}
        {item.linkFicheiro ? (
          <div className="rounded-apple-lg overflow-hidden aspect-video bg-black border border-hairline">
            {item.linkFicheiro.includes('drive.google.com')
              ? <iframe src={item.linkFicheiro.replace(/\/view.*$/,'/preview')} className="w-full h-full border-0" allow="autoplay; fullscreen"/>
              : <video src={item.linkFicheiro} controls playsInline className="w-full h-full object-contain"/>
            }
          </div>
        ) : (
          <div className="rounded-apple-lg aspect-video flex flex-col items-center justify-center gap-2 bg-elevated border border-dashed border-hairline">
            <Video className="w-8 h-8 text-ink-faint"/>
            <p className="text-xs text-ink-muted">Nenhum vídeo enviado</p>
          </div>
        )}
        <UploadZone label="Upload vídeo" accept="video/*"
          onUpload={url => saveMedia({ linkFicheiro: url })}/>
        {/* Capas */}
        <div className="pt-1 space-y-2">
          <label className="block t-eyebrow text-ink-muted">Capas / Thumbnails</label>
          {/* Capa 1 */}
          <div>
            <p className="text-[10px] text-ink-faint font-semibold uppercase tracking-wider mb-1">Capa 1</p>
            {item.linkCapa && (
              <div className="mb-1.5 rounded-apple overflow-hidden aspect-video border border-hairline">
                <img src={item.linkCapa} alt="Capa 1" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display='none'; }}/>
              </div>
            )}
            <UploadZone label="Upload capa 1" accept="image/*"
              onUpload={url => saveMedia({ linkCapa: url })}/>
          </div>
          {/* Capa 2 */}
          <div>
            <p className="text-[10px] text-ink-faint font-semibold uppercase tracking-wider mb-1">Capa 2</p>
            {item.linkCapa2 && (
              <div className="mb-1.5 rounded-apple overflow-hidden aspect-video border border-hairline">
                <img src={item.linkCapa2} alt="Capa 2" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display='none'; }}/>
              </div>
            )}
            <UploadZone label="Upload capa 2" accept="image/*"
              onUpload={url => saveMedia({ linkCapa2: url })}/>
          </div>
          {/* Capa 3 */}
          <div>
            <p className="text-[10px] text-ink-faint font-semibold uppercase tracking-wider mb-1">Capa 3</p>
            {item.linkCapa3 && (
              <div className="mb-1.5 rounded-apple overflow-hidden aspect-video border border-hairline">
                <img src={item.linkCapa3} alt="Capa 3" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display='none'; }}/>
              </div>
            )}
            <UploadZone label="Upload capa 3" accept="image/*"
              onUpload={url => saveMedia({ linkCapa3: url })}/>
          </div>
          {mediaError && (
            <p className="text-[11px] text-err px-3 py-2 rounded-apple bg-err-soft border border-err/20 mt-1">
              ⚠ {mediaError}
            </p>
          )}
        </div>
        {/* Drive */}
        <div>
          <label className="block t-eyebrow text-ink-muted mb-1.5">Link Drive (download alta qualidade)</label>
          <input type="url" value={linkDrive} onChange={e => setLinkDrive(e.target.value)}
            placeholder="https://drive.google.com/…" className="input"/>
        </div>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-apple bg-warn-soft border border-warn/20">
            <p className="text-[10px] text-warn-ink font-semibold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-warn-ink leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );

    if (isCar) return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="t-eyebrow text-ink-muted">
            Imagens do Carrossel
          </label>
          <span className="text-[10px] text-ink-faint">{galeriaList.length} imagens</span>
        </div>
        {galeriaList.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {galeriaList.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-apple overflow-hidden group border border-hairline">
                <img src={url} alt={`Slide ${i+1}`} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <button onClick={() => removeGalleryImage(i)}
                    className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-err">
                    <X className="w-3 h-3 text-white"/>
                  </button>
                </div>
                <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-white drop-shadow">{i+1}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-apple-lg aspect-square flex flex-col items-center justify-center gap-2 bg-elevated border border-dashed border-hairline">
            <Image className="w-8 h-8 text-ink-faint"/>
            <p className="text-xs text-ink-muted">Nenhuma imagem adicionada</p>
          </div>
        )}
        <UploadZone label="Adicionar imagens" accept="image/*" multiple
          onUpload={urls => addGalleryImages(Array.isArray(urls) ? urls : [urls])}/>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-apple bg-warn-soft border border-warn/20">
            <p className="text-[10px] text-warn-ink font-semibold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-warn-ink leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );

    // STORIES / ESTÁTICO / POST
    return (
      <div className="space-y-3">
        {item.linkCapa ? (
          <div className="rounded-apple-lg overflow-hidden flex items-center justify-center bg-elevated border border-hairline" style={{ minHeight:'180px' }}>
            <img src={item.linkCapa} alt="Imagem"
              className="w-full object-contain rounded-apple-lg"
              style={{ maxHeight:'360px' }}
              onError={e => { e.target.style.display='none'; }}/>
          </div>
        ) : (
          <div className="rounded-apple-lg flex flex-col items-center justify-center gap-2 bg-elevated border border-dashed border-hairline" style={{ minHeight:'180px' }}>
            <Image className="w-8 h-8 text-ink-faint"/>
            <p className="text-xs text-ink-muted">Nenhuma imagem enviada</p>
          </div>
        )}
        <UploadZone label="Upload imagem" accept="image/*"
          onUpload={url => saveMedia({ linkCapa: url })}/>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-apple bg-warn-soft border border-warn/20">
            <p className="text-[10px] text-warn-ink font-semibold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-warn-ink leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );
  };

  // ── Feedback do cliente ────────────────────────────────────────────────────
  const renderFeedback = () => (
    <div className="space-y-4">
      {item.feedbackCliente ? (
        <>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warn shrink-0" />
            <p className="text-[11px] font-semibold text-warn-ink uppercase tracking-wider">
              Comentário do cliente
            </p>
          </div>
          <div className="px-4 py-3.5 rounded-apple-lg bg-warn-soft border border-warn/25">
            <p className="text-[13px] text-warn-ink leading-relaxed whitespace-pre-wrap">
              {item.feedbackCliente}
            </p>
          </div>
          <p className="text-[10px] text-ink-faint">
            Enviado pelo portal de aprovação do cliente.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-ink-faint" />
          </div>
          <p className="text-[13px] font-medium text-ink-muted">Nenhum feedback ainda</p>
          <p className="text-[11px] text-ink-faint max-w-[200px]">
            O cliente ainda não deixou comentários no portal de aprovação.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full flex flex-col rounded-apple-2xl overflow-hidden bg-surface border border-hairline shadow-apple-xl"
        style={{ maxHeight:'92vh', maxWidth:'580px' }}>

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 shrink-0 relative">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 pr-8 flex-wrap">
            {(cliente || item.cliente) && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-pill"
                style={{ background:cl.bg, color:cl.text, border:`1px solid ${cl.border}` }}>
                {cliente || item.cliente}
              </span>
            )}
            {(formato || item.formato) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill"
                style={{ color: FORMAT_COLORS[formato||item.formato]||'#8b5cf6', background: `${FORMAT_COLORS[formato||item.formato]||'#8b5cf6'}14`, border:`1px solid ${FORMAT_COLORS[formato||item.formato]||'#8b5cf6'}30` }}>
                {formato || item.formato}
              </span>
            )}
            {plataforma && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill"
                style={{ color: PLAT_COLORS[plataforma]||'#8b5cf6', background: `${PLAT_COLORS[plataforma]||'#8b5cf6'}14`, border:`1px solid ${PLAT_COLORS[plataforma]||'#8b5cf6'}30` }}>
                {plataforma}
              </span>
            )}
            {responsavel && (
              <span className="text-[11px] text-ink-muted flex items-center gap-1 ml-1">
                <User className="w-3 h-3"/> {responsavel}
              </span>
            )}
          </div>
          {/* Title */}
          <h3 className="t-title text-ink leading-snug mb-1.5 pr-8">{item.nome}</h3>
          {/* Date */}
          {(item.postagem || item.dataGravacao) && (
            <div className="flex items-center gap-3">
              {item.postagem && (
                <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <Clock className="w-3 h-3"/> {fmtFull(item.postagem)}
                </span>
              )}
              {item.dataGravacao && (
                <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <Camera className="w-3 h-3"/> {fmtFull(item.dataGravacao)}
                </span>
              )}
            </div>
          )}
          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* ── Body: left tabs + right content ── */}
        <div className="flex flex-1 overflow-hidden border-t border-hairline">

          {/* Left: vertical tab list */}
          <div className="flex flex-col gap-1.5 p-3 shrink-0 w-[130px] border-r border-hairline bg-elevated/50">
            {TABS.map(t => {
              const isFeedbackTab = t.id === 'feedback';
              const hasFeedback   = isFeedbackTab && !!item.feedbackCliente;
              const st   = isFeedbackTab ? (hasFeedback ? 'warn' : 'neutral') : sectionStatus(item, t.section);
              const meta = isFeedbackTab
                ? (hasFeedback
                    ? { color:'#d97706', border:'rgba(217,119,6,0.3)', label:'Novo' }
                    : { color:'#6b7280', border:'rgba(0,0,0,0.08)',    label:'Vazio' })
                : SECTION_STATUS[st];
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-apple-lg cursor-pointer transition-all duration-150 w-full"
                  style={{
                    background: isActive ? '#ffffff' : 'transparent',
                    border: `1px solid ${isActive ? meta.border : 'transparent'}`,
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  }}>
                  {/* Badge ponto laranja quando há feedback não lido */}
                  {hasFeedback && !isActive && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-warn" />
                  )}
                  <t.icon className="w-4 h-4"
                    style={{ color: isActive ? meta.color : '#6b7280' }}/>
                  <span className="text-[11px] font-semibold leading-none"
                    style={{ color: isActive ? meta.color : '#374151' }}>
                    {t.label}
                  </span>
                  <span className="text-[9px] font-medium leading-none"
                    style={{ color: isActive ? meta.color : '#9ca3af' }}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 bg-surface">
            {tab === 'tema'     && renderTema()}
            {tab === 'conteudo' && renderConteudo()}
            {tab === 'midia'    && renderMidia()}
            {tab === 'feedback' && renderFeedback()}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2.5 px-4 py-3 shrink-0 border-t border-hairline bg-elevated/50">
          <button onClick={handleDelete} disabled={deleting}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className={`btn ${confirmDel ? 'btn-danger' : 'btn-secondary'}`}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
            {deleting ? 'Removendo…' : confirmDel ? 'confirmar' : 'excluir'}
          </button>
          <button onClick={save} disabled={!dirty||saving||!nome.trim()}
            className={`btn flex-1 ${saved ? 'btn-primary' : 'btn-primary'}`}
            style={saved ? { background:'#34c759' } : undefined}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : saved ? <CheckCircle2 className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'salvar'}
          </button>
        </div>
        {saveError && (
          <p className="text-xs text-red-500 mt-1 px-1">{saveError}</p>
        )}
      </div>
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
function normalizeFormato(f) {
  const fn = fmtNorm(f);
  if (fn.includes('carrossel'))                                  return 'Carrossel';
  if (fn.includes('video') || fn.includes('reels') || fn.includes('tiktok') || fn.includes('youtube')) return 'Vídeo Curto';
  if (fn.includes('stories') || fn.includes('story'))           return 'Stories';
  if (fn.includes('post') || fn.includes('estatico') || fn.includes('estático')) return 'Post Estático';
  return f || '—';
}

function csvCell(val) {
  return '"' + String(val ?? '').replace(/"/g, '""') + '"';
}

function downloadCSV(rows, filename) {
  const bom  = '﻿'; // UTF-8 BOM for Excel to read accents correctly
  const body = rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ onClose, content, availableClients, availablePlatforms }) {
  const [cliente,   setCliente]   = useState('');
  const [plat,      setPlat]      = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const preview = useMemo(() => {
    return content.filter(item => {
      if (cliente && nrm(item.cliente).replace(/\s/g,'') !== nrm(cliente).replace(/\s/g,'')) return false;
      if (plat) {
        const plats = (item.plataforma || '').split(',').map(p => nrm(p.trim()));
        if (!plats.includes(nrm(plat))) return false;
      }
      const ds = item.postagem || item.dataGravacao;
      if (dateFrom && ds && ds < dateFrom) return false;
      if (dateTo   && ds && ds > dateTo)   return false;
      return true;
    });
  }, [content, cliente, plat, dateFrom, dateTo]);

  const handleExport = () => {
    const header = ['Data de Postagem', 'Nome do Conteúdo', 'Formato', 'Comentários / Sugestões'];
    const rows   = preview.map(item => [
      item.postagem ? fmtFull(item.postagem) : (item.dataGravacao ? `Grav. ${fmtFull(item.dataGravacao)}` : ''),
      item.nome || '',
      normalizeFormato(item.formato),
      item.feedbackCliente || '',
    ]);

    const clientePart = cliente ? nrm(cliente).replace(/\s/g,'-') : 'todos';
    const datePart    = dateFrom ? `${dateFrom}_${dateTo || 'atual'}` : 'completo';
    downloadCSV([header, ...rows], `planejamento-${clientePart}-${datePart}.csv`);
    onClose();
  };

  const inputCls = 'w-full px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-surface text-[13px] text-ink focus:outline-none focus:border-accent transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[20px] bg-surface border border-[rgba(0,0,0,0.08)] shadow-apple-xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">Exportar planejamento</p>
            <p className="text-[12px] text-ink-muted mt-0.5">Gera uma planilha .csv pronta para Excel</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-5 space-y-4">

          {/* Cliente */}
          <div>
            <label className="block text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-1.5">
              Cliente
            </label>
            <SelectField
              value={cliente}
              onChange={setCliente}
              placeholder="Todos os clientes"
              options={availableClients.map(c => ({ value: c, label: c }))}
            />
          </div>

          {/* Período */}
          <div>
            <label className="block text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-1.5">
              Período (data de postagem)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-ink-faint mb-1">De</p>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className="text-[10px] text-ink-faint mb-1">Até</p>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Plataforma */}
          <div>
            <label className="block text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-1.5">
              Plataforma
            </label>
            <SelectField
              value={plat}
              onChange={setPlat}
              placeholder="Todas as plataformas"
              options={availablePlatforms.map(p => ({ value: p, label: p }))}
            />
          </div>

          {/* Preview count */}
          <div className="rounded-[12px] bg-[rgba(0,113,227,0.05)] border border-[rgba(0,113,227,0.12)] px-4 py-3">
            <p className="text-[13px] text-ink">
              <span className="font-bold text-accent">{preview.length}</span>
              {' '}conteúdo{preview.length !== 1 ? 's' : ''} serão exportados
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Colunas: Data · Nome · Formato · Comentários/Sugestões
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2.5">
          <button onClick={onClose}
            className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={preview.length === 0}
            className="btn btn-primary flex-1 disabled:opacity-40">
            <Download className="w-4 h-4" />
            Baixar planilha
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Conteudo() {
  const router = useRouter();
  const now = new Date();
  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState('mensal');  // mensal | semanal | feed
  const [memberView,    setMemberView]    = useState('geral');
  const [filterCliente,   setFilterCliente]   = useState('');
  const [filterPlataforma, setFilterPlataforma] = useState('');
  const [filterSearch,    setFilterSearch]    = useState('');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const [selectedItem,    setSelectedItem]    = useState(null);
  const [showNew,       setShowNew]       = useState(false);
  const [showExport,    setShowExport]    = useState(false);
  const [calMonth,      setCalMonth]      = useState(now.getMonth());
  const [calYear,       setCalYear]       = useState(now.getFullYear());
  // Full client list from API [{nome, idCliente, ...}]
  const [clientsList,   setClientsList]   = useState([]);

  // Pre-populate filter from ?cliente= query param (e.g. from Clientes page)
  useEffect(() => {
    if (!router.isReady) return;
    const qCliente = router.query.cliente;
    if (qCliente) setFilterCliente(String(qCliente));
  }, [router.isReady, router.query.cliente]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/crm/content').then(r => r.json()),
      fetch('/api/crm/clients').then(r => r.json()).catch(() => ({ clients: [] })),
    ]).then(([contentData, clientsData]) => {
      setContent(contentData.content || []);
      setClientsList(clientsData.clients || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const createItem = useCallback(c => setContent(prev => [c, ...prev]), []);

  const deleteItem = useCallback(async id => {
    await fetch('/api/crm/content', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    setContent(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateItem = useCallback(async (id, fields) => {
    const res = await fetch('/api/crm/content', {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, ...fields }),
    });
    if (res.ok) {
      const { content: updated } = await res.json();
      setContent(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      setSelectedItem(prev => prev?.id === id ? { ...prev, ...updated } : prev);
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro ao salvar (${res.status})`);
    }
  }, []);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handler = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Dynamic filter options — API list first, fall back to names found in content
  const availableClients = useMemo(() => {
    if (clientsList.length > 0) return clientsList.map(c => c.nome).filter(Boolean);
    return [...new Set(content.map(c => c.cliente).filter(Boolean))];
  }, [clientsList, content]);

  const availablePlatforms = useMemo(() => {
    const set = new Set();
    content.forEach(c => {
      if (c.plataforma) c.plataforma.split(',').forEach(p => { const t = p.trim(); if (t) set.add(t); });
    });
    return [...set].sort();
  }, [content]);

  // Sugestões de busca: nomes que contêm o texto digitado (máx 8)
  const searchSuggestions = useMemo(() => {
    const q = nrm(searchQuery);
    if (!q || q.length < 2) return [];
    return content
      .map(c => c.nome).filter(Boolean)
      .filter((n, i, arr) => arr.indexOf(n) === i) // unique
      .filter(n => nrm(n).includes(q))
      .slice(0, 8);
  }, [content, searchQuery]);

  // Aplica a busca ao confirmar (Enter ou clique na sugestão)
  const applySearch = val => {
    setFilterSearch(val);
    setSearchQuery(val);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setFilterSearch('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Filter pipeline
  const filtered = content.filter(item => {
    if (memberView === 'minhas' && !nrm(item.responsavel).includes('savio')) return false;
    if (filterCliente && nrm(item.cliente).replace(/\s/g,'') !== nrm(filterCliente).replace(/\s/g,'')) return false;
    if (filterPlataforma) {
      const platforms = (item.plataforma||'').split(',').map(p => nrm(p).trim());
      if (!platforms.includes(nrm(filterPlataforma))) return false;
    }
    if (filterSearch && !nrm(item.nome).includes(nrm(filterSearch))) return false;
    return true;
  });

  // Monthly: only items in exact cal month
  const monthItems = filtered.filter(item => {
    const d = item.postagem || item.dataGravacao;
    if (!d) return false;
    const dt = parseLocalDate(d);
    return dt.getFullYear() === calYear && dt.getMonth() === calMonth;
  });

  // Weekly: ±1 month window
  const weeklyItems = filtered.filter(item => {
    const d = item.postagem || item.dataGravacao;
    if (!d) return true;
    const dt = parseLocalDate(d);
    return Math.abs((dt.getFullYear() - calYear)*12 + (dt.getMonth() - calMonth)) <= 1;
  });

  const prevMonth = () => { if (calMonth===0) { setCalMonth(11); setCalYear(y=>y-1); } else setCalMonth(m=>m-1); };
  const nextMonth = () => { if (calMonth===11) { setCalMonth(0); setCalYear(y=>y+1); } else setCalMonth(m=>m+1); };

  const VIEWS = [
    { key:'mensal',  label:'Mensal',  icon: CalendarDays },
    { key:'semanal', label:'Semanal', icon: LayoutGrid   },
    { key:'feed',    label:'Feed',    icon: Film         },
  ];

  return (
    <CRMLayout title="Conteúdo — T3 Studio CRM">
      <div className="flex flex-col min-h-screen bg-canvas">

        {/* Top bar */}
        <div className="px-5 lg:px-8 pt-6 pb-4 shrink-0 border-b border-hairline bg-surface/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h1 className="t-title-lg text-ink flex items-center gap-2">
                <Film className="w-5 h-5 text-accent"/> Esteira de Conteúdo
              </h1>
              <p className="t-small text-ink-muted mt-0.5">
                {loading ? '…' : `${content.length} conteúdos`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Export */}
              <button
                onClick={() => setShowExport(true)}
                title="Exportar planejamento"
                className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.1)]
                  bg-surface text-ink-muted hover:text-ink hover:border-[rgba(0,0,0,0.2)]
                  transition-all cursor-pointer">
                <Share2 className="w-4 h-4" />
              </button>

              {/* New */}
              <button onClick={() => setShowNew(true)} className="btn btn-primary btn-sm">
                <Plus className="w-3.5 h-3.5"/>
                <span className="hidden sm:inline">Novo</span>
              </button>

              {/* Member toggle — segmented control */}
              <div className="flex items-center bg-elevated rounded-pill p-1">
                {[{key:'geral',label:'Geral',icon:LayoutGrid},{key:'minhas',label:'Minhas',icon:User2}].map(({key,label,icon:Icon}) => {
                  const active = memberView===key;
                  return (
                    <button key={key} onClick={() => setMemberView(key)}
                      className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer
                        ${active ? 'bg-white shadow-apple-sm text-ink' : 'text-ink-muted hover:text-ink'}`}>
                      <Icon className="w-3 h-3"/>
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* View toggle — segmented control */}
              <div className="flex items-center bg-elevated rounded-pill p-1">
                {VIEWS.map(({key,label,icon:Icon}) => {
                  const active = view===key;
                  return (
                    <button key={key} onClick={() => setView(key)}
                      className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer
                        ${active ? 'bg-white shadow-apple-sm text-ink' : 'text-ink-muted hover:text-ink'}`}>
                      <Icon className="w-3 h-3"/>
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Alternating filter list ── */}
          <div className="rounded-apple-xl border border-hairline bg-surface">

            {/* Row 1 — Cliente (expandable dropdown) */}
            <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none border-r border-hairline" style={{ minWidth:110 }}>
                <div className="w-1.5 h-1.5 rounded-full bg-accent"/>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Cliente</span>
              </div>
              <div className="flex-1 px-3 py-2">
                <SelectField
                  value={filterCliente}
                  onChange={setFilterCliente}
                  placeholder="Todos os clientes"
                  options={availableClients.map(c => {
                    const cc = clientColor(c);
                    return { value: c, label: c, color: cc.text };
                  })}
                  colorDot={true}
                />
              </div>
              {filterCliente && (
                <button onClick={() => setFilterCliente('')}
                  className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-muted-200 transition-colors">
                  <X className="w-3 h-3"/>
                </button>
              )}
            </div>

            {/* Row 2 — Plataforma */}
            <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none border-r border-hairline" style={{ minWidth:110 }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#8b5cf6' }}/>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Plataforma</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1" style={{ scrollbarWidth:'none' }}>
                {availablePlatforms.length === 0 ? (
                  <span className="text-[11px] text-ink-faint italic">Nenhuma plataforma cadastrada no Notion</span>
                ) : (
                  [{ key:'', label:'Todas' }, ...availablePlatforms.map(p => ({ key:p, label:p }))].map(({ key, label }) => {
                    const active = nrm(filterPlataforma) === nrm(key);
                    const pc = PLAT_COLORS[label] || '#8b5cf6';
                    return (
                      <button key={key||'todas'} onClick={() => setFilterPlataforma(active && key ? '' : key)}
                        className="shrink-0 px-3 py-1 rounded-pill text-[11px] font-semibold cursor-pointer transition-all duration-150 active:scale-95"
                        style={{
                          background: active ? (key ? `${pc}14` : '#1d1d1f') : '#f5f5f7',
                          border: `1px solid ${active ? (key ? `${pc}40` : '#1d1d1f') : 'rgba(0,0,0,0.06)'}`,
                          color: active ? (key ? pc : 'white') : '#6b7280',
                        }}>
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
              {filterPlataforma && (
                <button onClick={() => setFilterPlataforma('')}
                  className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-muted-200 transition-colors">
                  <X className="w-3 h-3"/>
                </button>
              )}
            </div>

            {/* Row 3 — Busca por nome */}
            <div className="flex items-center">
              <div className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none border-r border-hairline" style={{ minWidth:110 }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#10b981' }}/>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Busca</span>
              </div>
              <div className="flex-1 px-3 py-2 relative" ref={searchRef}>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 w-3.5 h-3.5 text-ink-faint pointer-events-none"/>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); if (!e.target.value) setFilterSearch(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') applySearch(searchQuery); if (e.key === 'Escape') { setShowSuggestions(false); } }}
                    onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                    placeholder="Buscar conteúdo pelo nome…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-[8px] border border-transparent bg-elevated text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/40 focus:bg-white transition-all"
                  />
                  {filterSearch && (
                    <span className="absolute right-2.5 flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md pointer-events-none">
                      ativo
                    </span>
                  )}
                </div>

                {/* Dropdown de sugestões */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[12px] bg-white border border-[rgba(0,0,0,0.1)] shadow-apple-xl overflow-hidden">
                    {searchSuggestions.map((sug, i) => {
                      const q = nrm(searchQuery);
                      const idx = nrm(sug).indexOf(q);
                      const before = sug.slice(0, idx);
                      const match  = sug.slice(idx, idx + searchQuery.length);
                      const after  = sug.slice(idx + searchQuery.length);
                      return (
                        <button
                          key={i}
                          onMouseDown={e => { e.preventDefault(); applySearch(sug); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-elevated transition-colors cursor-pointer group"
                          style={{ borderBottom: i < searchSuggestions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                          <Search className="w-3 h-3 text-ink-faint shrink-0 group-hover:text-accent transition-colors"/>
                          <span className="text-[13px] text-ink truncate">
                            {before}
                            <span className="font-semibold text-accent">{match}</span>
                            {after}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {filterSearch && (
                <button onClick={clearSearch}
                  className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-muted-200 transition-colors">
                  <X className="w-3 h-3"/>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Board area */}
        <div className="flex-1 overflow-x-auto px-5 lg:px-8 py-6">
          {view === 'mensal' && (
            <MonthlyView items={monthItems} onSelect={setSelectedItem} loading={loading}
              year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth}/>
          )}
          {view === 'semanal' && (
            <WeeklyView items={weeklyItems} onSelect={setSelectedItem} loading={loading}
              year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth}/>
          )}
          {view === 'feed' && (
            <FeedView items={filtered} onSelect={setSelectedItem} loading={loading}/>
          )}
        </div>
      </div>

      {selectedItem && (
        <DetailPanel item={selectedItem}
          onSave={async (id, fields) => { await updateItem(id, fields); }}
          onDelete={deleteItem}
          onClose={() => setSelectedItem(null)}
          clientsList={clientsList}/>
      )}

      {showNew && (
        <NewContentModal onClose={() => setShowNew(false)} onCreate={createItem} clientsList={clientsList}/>
      )}

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          content={content}
          availableClients={availableClients}
          availablePlatforms={availablePlatforms}
        />
      )}
    </CRMLayout>
  );
}
