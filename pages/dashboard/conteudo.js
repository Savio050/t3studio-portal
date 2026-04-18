import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Film, X, Loader2, Clock, User, AlertTriangle,
  LayoutGrid, User2, CalendarDays, ChevronLeft, ChevronRight,
  Save, CheckCircle2, Plus, Trash2, Camera,
  Image, FileText, Palette, ExternalLink, Link2,
  ChevronDown, Upload, Video, Play,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MEMBERS   = ['Matheus', 'Sávio'];
const CLIENTS   = ['fastimoveis', 'mafro'];
const FORMATOS  = ['Reels', 'Carrossel', 'Stories', 'Post', 'Vídeo', 'TikTok', 'YouTube'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_PT = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];

const ESTADO_OPTIONS = [
  { value: 'não iniciado',         label: 'Não iniciado',      color: '#64748b' },
  { value: 'Em Produção',          label: 'Em Produção',       color: '#0ea5e9' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação', color: '#f59e0b' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado', color: '#f97316' },
  { value: 'Aprovado',             label: 'Aprovado',          color: '#10b981' },
  { value: 'Concluido',            label: 'Concluído',         color: '#64748b' },
];

const CONTEUDO_STATES = [
  { value: 'Não iniciada',         label: 'Não iniciada',      color: '#64748b' },
  { value: 'Em Produção',          label: 'Em criação',        color: '#a78bfa' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação', color: '#f59e0b' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado', color: '#f97316' },
  { value: 'Aprovado',             label: 'Aprovado',          color: '#10b981' },
  { value: 'Concluido',            label: 'Concluído',         color: '#64748b' },
];

const CLIENT_COLORS = {
  fastimoveis: { bg: 'rgba(244,63,94,0.15)',  text: '#fb7185', border: 'rgba(244,63,94,0.3)'  },
  mafro:       { bg: 'rgba(6,182,212,0.15)',  text: '#22d3ee', border: 'rgba(6,182,212,0.3)'  },
};

const FORMAT_COLORS = {
  Reels:     '#a78bfa', Carrossel: '#38bdf8', Stories: '#f472b6',
  Post:      '#34d399', Vídeo:     '#fb923c', TikTok:  '#f9a8d4',
  YouTube:   '#f87171',
};

const SECTION_STATUS = {
  aprovado:     { label: 'Aprovado',      color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  'em-aprovacao':{ label: 'Em Aprovação', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)'  },
  'em-producao': { label: 'Em Produção',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.3)'  },
  'em-criacao':  { label: 'Em Criação',   color: '#a78bfa', bg: 'rgba(124,58,237,0.15)',  border: 'rgba(124,58,237,0.3)'  },
  pendente:     { label: 'Pendente',      color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const nrm       = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const clientColor = n => CLIENT_COLORS[nrm(n).replace(/\s/g,'')] ||
  { bg:'rgba(255,255,255,0.06)', text:'rgba(255,255,255,0.45)', border:'rgba(255,255,255,0.1)' };
const fmtShort  = d => { if (!d) return null; const [,m,day] = d.split('-'); return `${day}/${m}`; };
const fmtFull   = d => { if (!d) return ''; const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
const isoDate   = d => d.toISOString().slice(0, 10);

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
    const mon = weekMonday(new Date(ds));
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
  const fmtColor  = FORMAT_COLORS[item.formato] || '#a78bfa';
  const st        = sectionStatus(item, 'tema');
  const stMeta    = SECTION_STATUS[st];
  const previewImg = item.linkCapa || (item.galeria ? item.galeria.split(',')[0]?.trim() : null);

  return (
    <button onClick={() => onClick(item)}
      className="w-full text-left rounded-lg p-1.5 transition-all duration-200 hover:brightness-125 cursor-pointer group overflow-hidden"
      style={{ background: `${fmtColor}10`, border: `1px solid ${fmtColor}20` }}>
      {/* Hover image preview — expands inline */}
      {previewImg && (
        <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300 ease-out">
          <img src={previewImg} alt="" className="w-full aspect-video object-cover rounded-md mb-1 block"
            style={{ border: `1px solid ${fmtColor}25` }}/>
        </div>
      )}
      <div className="flex items-center gap-1 mb-0.5">
        {item.formato && (
          <span className="text-[9px] font-bold truncate" style={{ color: fmtColor }}>{item.formato}</span>
        )}
        <div className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: stMeta?.color || '#64748b' }}/>
      </div>
      <p className="text-[10px] text-white/70 leading-tight line-clamp-2">{item.nome}</p>
    </button>
  );
}

// ── Card Carousel (Instagram-style) ──────────────────────────────────────────
function CardCarousel({ images, fmtColor, formato, postagem }) {
  const [idx, setIdx] = useState(0);
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  if (!images.length) return (
    <div className="w-full aspect-square flex items-center justify-center relative"
      style={{ background: `${fmtColor}0d` }}>
      <Film className="w-10 h-10 opacity-20" style={{ color: fmtColor }}/>
      {formato && (
        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background:`${fmtColor}25`, color:fmtColor, border:`1px solid ${fmtColor}40`, backdropFilter:'blur(4px)' }}>
          {formato}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative w-full aspect-square overflow-hidden group/car select-none"
      style={{ background: `${fmtColor}0d` }}>
      {/* Image */}
      <img src={images[idx]} alt="" className="w-full h-full object-cover transition-opacity duration-200"/>

      {/* Format badge */}
      {formato && (
        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
          style={{ background:`${fmtColor}25`, color:fmtColor, border:`1px solid ${fmtColor}40`, backdropFilter:'blur(4px)' }}>
          {formato}
        </span>
      )}
      {postagem && (
        <span className="absolute top-2 right-2 text-[10px] text-white/50 font-medium px-1.5 py-0.5 rounded-md z-10"
          style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
          {fmtShort(postagem)}
        </span>
      )}

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10
              opacity-0 group-hover/car:opacity-100 transition-opacity duration-150 cursor-pointer hover:scale-110"
            style={{ background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.15)' }}>
            <ChevronLeft className="w-4 h-4 text-white"/>
          </button>
          <button onClick={next}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10
              opacity-0 group-hover/car:opacity-100 transition-opacity duration-150 cursor-pointer hover:scale-110"
            style={{ background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.15)' }}>
            <ChevronRight className="w-4 h-4 text-white"/>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-200 cursor-pointer"
                style={{ width: i===idx?16:6, height:6, background: i===idx?'white':'rgba(255,255,255,0.45)' }}/>
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10"
            style={{ background:'rgba(0,0,0,0.55)', color:'rgba(255,255,255,0.7)' }}>
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
  const fmtColor  = FORMAT_COLORS[item.formato] || '#a78bfa';
  const tabs      = ['tema', 'conteudo', 'midia'];
  const isCar     = isCarouselFmt(item.formato);
  const carImages = isCar && item.galeria
    ? item.galeria.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  return (
    <button onClick={() => onClick(item)}
      className="text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-lg cursor-pointer group"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Cover / carousel */}
      {isCar ? (
        <CardCarousel images={carImages} fmtColor={fmtColor} formato={item.formato} postagem={item.postagem}/>
      ) : (
        <div className="w-full aspect-video flex items-center justify-center relative overflow-hidden"
          style={{ background: `${fmtColor}0d` }}>
          {item.linkCapa
            ? <img src={item.linkCapa} alt="" className="w-full h-full object-cover"/>
            : <Film className="w-10 h-10 opacity-20" style={{ color: fmtColor }}/>
          }
          {item.formato && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:`${fmtColor}25`, color:fmtColor, border:`1px solid ${fmtColor}40`, backdropFilter:'blur(4px)' }}>
              {item.formato}
            </span>
          )}
          {item.postagem && (
            <span className="absolute top-2 right-2 text-[10px] text-white/50 font-medium px-1.5 py-0.5 rounded-md"
              style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
              {fmtShort(item.postagem)}
            </span>
          )}
        </div>
      )}

      <div className="p-3">
        {/* Client + title */}
        {item.cliente && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1.5 inline-block"
            style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}>
            {item.cliente}
          </span>
        )}
        <p className="text-xs font-semibold text-white/85 leading-snug line-clamp-2 mb-3">{item.nome}</p>

        {/* Section status row */}
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(s => {
            const st   = sectionStatus(item, s);
            const meta = SECTION_STATUS[st];
            const labels = { tema: 'Tema', conteudo: 'Conteúdo', midia: 'Mídia' };
            return (
              <div key={s} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg"
                style={{ background: `${meta.color}0d` }}>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">{labels[s]}</span>
                <span className="text-[9px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
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

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"><ChevronLeft className="w-4 h-4"/></button>
        <span className="text-base font-bold text-white font-display min-w-[160px]">{MONTHS_PT[month]} {year}</span>
        <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"><ChevronRight className="w-4 h-4"/></button>
        <span className="text-[11px] text-white/30 ml-1">
          {items.filter(i => i.postagem || i.dataGravacao).length} postagens
        </span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_PT.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-white/20 uppercase tracking-wider py-1.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, current }, i) => {
          const ds       = isoDate(date);
          const dayItems = byDate[ds] || [];
          const isToday  = ds === todayStr;
          return (
            <div key={i} className="min-h-[90px] p-1.5 rounded-xl transition-all duration-150"
              style={{
                background: isToday ? 'rgba(124,58,237,0.07)' : current ? 'rgba(255,255,255,0.025)' : 'transparent',
                border: isToday ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(255,255,255,0.04)',
                opacity: current ? 1 : 0.4,
              }}>
              <div className={`text-[11px] font-bold mb-1.5 w-5 h-5 flex items-center justify-center rounded-full
                ${isToday ? 'bg-violet-600 text-white text-[10px]' : 'text-white/35'}`}>
                {date.getDate()}
              </div>
              {loading
                ? i < 7 && <div className="h-8 rounded-md animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}/>
                : (
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <MiniCard key={item.id} item={item} onClick={onSelect}/>
                    ))}
                    {dayItems.length > 3 && (
                      <button className="text-[9px] text-white/25 w-full text-center py-0.5 hover:text-white/50 cursor-pointer">
                        +{dayItems.length - 3} mais
                      </button>
                    )}
                  </div>
                )
              }
            </div>
          );
        })}
      </div>
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
        <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"><ChevronLeft className="w-4 h-4"/></button>
        <span className="text-base font-bold text-white font-display min-w-[160px]">{MONTHS_PT[month]} {year}</span>
        <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"><ChevronRight className="w-4 h-4"/></button>
        <span className="text-[11px] text-white/30">{items.length} conteúdos</span>
      </div>

      {loading ? (
        <div className="flex gap-4">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="min-w-[260px] flex-1 h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {monthWeeks.length === 0 && noDate.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <CalendarDays className="w-10 h-10 text-white/10 mb-3"/>
              <p className="text-sm text-white/30">Nenhum conteúdo em {MONTHS_PT[month]}</p>
            </div>
          )}
          {monthWeeks.map(({ monday, items: wi }) => {
            const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
            const isCurrent = todayD >= monday && todayD <= sun;
            return (
              <div key={isoDate(monday)} className="flex flex-col min-w-[240px] max-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>}
                    <p className={`text-xs font-bold ${isCurrent ? 'text-violet-300' : 'text-white/55'}`}>{weekLabel(monday)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: isCurrent ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', color: isCurrent ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                    {wi.length}
                  </span>
                </div>
                <div className="flex-1 rounded-xl p-2 space-y-1.5 min-h-[80px]"
                  style={{ background: isCurrent ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.025)', border: isCurrent ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                  {wi.sort((a,b) => (a.postagem||a.dataGravacao||'') > (b.postagem||b.dataGravacao||'') ? 1 : -1)
                     .map(item => <MiniCard key={item.id} item={item} onClick={onSelect}/>)}
                </div>
              </div>
            );
          })}
          {noDate.length > 0 && (
            <div className="flex flex-col min-w-[220px] max-w-[260px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-bold text-white/30">Sem data</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/25">{noDate.length}</span>
              </div>
              <div className="flex-1 rounded-xl p-2 space-y-1.5 min-h-[80px]"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
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
        ? [...Array(8)].map((_,i) => <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>)
        : items.length === 0
          ? (
            <div className="col-span-full flex flex-col items-center py-24">
              <Film className="w-10 h-10 text-white/10 mb-3"/>
              <p className="text-sm text-white/30">Nenhum conteúdo encontrado</p>
            </div>
          )
          : items.map(item => <FeedCard key={item.id} item={item} onClick={onSelect}/>)
      }
    </div>
  );
}

// ── New Content Modal ─────────────────────────────────────────────────────────
function NewContentModal({ onClose, onCreate }) {
  const [nome,         setNome]         = useState('');
  const [cliente,      setCliente]      = useState('');
  const [formato,      setFormato]      = useState('');
  const [responsavel,  setResponsavel]  = useState('');
  const [postagem,     setPostagem]     = useState('');
  const [dataGravacao, setDataGravacao] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const memberColors = {
    Matheus: { bg:'rgba(124,58,237,0.2)', text:'#a78bfa', border:'rgba(124,58,237,0.4)' },
    Sávio:   { bg:'rgba(16,185,129,0.2)', text:'#6ee7b7', border:'rgba(16,185,129,0.4)' },
  };

  const submit = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/crm/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cliente, formato, responsavel, postagem: postagem||undefined, dataGravacao: dataGravacao||undefined }),
      });
      if (!res.ok) throw new Error();
      const { content } = await res.json();
      onCreate(content); onClose();
    } catch { setError('Erro ao criar. Tente novamente.'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{ background:'rgba(9,16,30,0.98)', backdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)', maxHeight:'90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <p className="text-base font-bold text-white font-display">Novo conteúdo</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Nome <span className="text-rose-400">*</span></label>
            <input autoFocus type="text" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()}
              placeholder="Ex: Reels lançamento novembro"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-violet-500/40"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}/>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Cliente</label>
            <div className="flex gap-2">
              {CLIENTS.map(c => {
                const cc = CLIENT_COLORS[c] || {}; const active = cliente === c;
                return <button key={c} type="button" onClick={() => setCliente(active ? '' : c)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  style={{ background: active ? cc.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? cc.border : 'rgba(255,255,255,0.08)'}`, color: active ? cc.text : 'rgba(255,255,255,0.35)' }}>
                  {c}
                </button>;
              })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Formato</label>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map(f => {
                const active = formato === f; const fc = FORMAT_COLORS[f] || '#a78bfa';
                return <button key={f} type="button" onClick={() => setFormato(active ? '' : f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  style={{ background: active ? `${fc}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? `${fc}40` : 'rgba(255,255,255,0.08)'}`, color: active ? fc : 'rgba(255,255,255,0.35)' }}>
                  {f}
                </button>;
              })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Responsável</label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const c = memberColors[m] || {}; const active = responsavel === m;
                return <button key={m} type="button" onClick={() => setResponsavel(active ? '' : m)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                  style={{ background: active ? c.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.08)'}`, color: active ? c.text : 'rgba(255,255,255,0.35)' }}>
                  {m}
                </button>;
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['Gravação', dataGravacao, setDataGravacao], ['Postagem', postagem, setPostagem]].map(([lbl, val, set]) => (
              <div key={lbl}>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">{lbl}</label>
                <input type="date" value={val} onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white/80 outline-none focus:ring-2 focus:ring-violet-500/30"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', colorScheme:'dark' }}/>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-rose-400 px-3 py-2 rounded-xl" style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)' }}>{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all" style={{ border:'1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={submit} disabled={!nome.trim()||saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white cursor-pointer transition-all disabled:opacity-40 hover:brightness-110"
            style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
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
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 hover:brightness-125 active:scale-[0.98]"
        style={{ background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.4)' }}>
        {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> {prog || 'Enviando…'}</> : <><Upload className="w-3.5 h-3.5"/> {label}</>}
      </button>
      {err && (
        <p className="text-[11px] text-rose-400 mt-1.5 px-2 py-1.5 rounded-lg leading-snug"
          style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)' }}>
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

// ── Detail Panel — vertical layout (tabs left, content right) ────────────────
function DetailPanel({ item, onSave, onDelete, onClose, availableClients = CLIENTS }) {
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
  const [galeriaList, setGaleriaList] = useState(() =>
    item.galeria ? item.galeria.split(',').map(u => u.trim()).filter(Boolean) : []
  );
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  useEffect(() => {
    setNome(item.nome); setFormato(item.formato||''); setCliente(item.cliente||'');
    setPlataforma(item.plataforma||''); setResponsavel(item.responsavel||'');
    setEstado(item.estado||''); setEstadoR(item.estadoRoteiro||'');
    setConteudo(item.conteudo||''); setPostagem(item.postagem||'');
    setGravacao(item.dataGravacao||''); setLinkDrive(item.linkDrive||'');
    setGaleriaList(item.galeria ? item.galeria.split(',').map(u => u.trim()).filter(Boolean) : []);
    setTab('tema');
  }, [item.id]);

  const dirty = nome !== item.nome || formato !== (item.formato||'') ||
    cliente !== (item.cliente||'') || plataforma !== (item.plataforma||'') ||
    responsavel !== (item.responsavel||'') ||
    estado !== (item.estado||'') || estadoR !== (item.estadoRoteiro||'') ||
    conteudo !== (item.conteudo||'') || postagem !== (item.postagem||'') ||
    gravacao !== (item.dataGravacao||'') || linkDrive !== (item.linkDrive||'');

  const save = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    await onSave(item.id, { nome, formato: formato||undefined, cliente: cliente||undefined, plataforma: plataforma||undefined, responsavel, estado, estadoRoteiro: estadoR, conteudo, postagem: postagem||undefined, dataGravacao: gravacao||undefined, linkDrive: linkDrive||undefined });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const saveMedia = (fields) => onSave(item.id, fields);

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
    Matheus: { bg:'rgba(124,58,237,0.2)', text:'#a78bfa', border:'rgba(124,58,237,0.4)' },
    Sávio:   { bg:'rgba(16,185,129,0.2)', text:'#6ee7b7', border:'rgba(16,185,129,0.4)' },
  };

  const TABS = [
    { id:'tema',     label:'Tema',     icon: Palette,  section:'tema'     },
    { id:'conteudo', label:'Conteúdo', icon: FileText,  section:'conteudo' },
    { id:'midia',    label:'Mídia',    icon: Image,     section:'midia'    },
  ];

  // ── Tab content renderers ──────────────────────────────────────────────────
  const renderTema = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Título</label>
        <input type="text" value={nome} onChange={e => setNome(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/40"
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}/>
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Cliente</label>
        <div className="flex flex-wrap gap-1.5">
          {availableClients.map(c => {
            const cc = CLIENT_COLORS[c] || {}; const active = nrm(cliente) === nrm(c);
            return (
              <button key={c} type="button" onClick={() => setCliente(active ? '' : c)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                style={{ background:active?cc.bg:'rgba(255,255,255,0.04)', border:`1px solid ${active?cc.border:'rgba(255,255,255,0.08)'}`, color:active?cc.text:'rgba(255,255,255,0.35)' }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formato */}
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Formato</label>
        <div className="flex flex-wrap gap-1.5">
          {FORMATOS.map(f => {
            const fc = FORMAT_COLORS[f] || '#a78bfa'; const active = nrm(formato) === nrm(f);
            return (
              <button key={f} type="button" onClick={() => setFormato(active ? '' : f)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                style={{ background:active?`${fc}20`:'rgba(255,255,255,0.04)', border:`1px solid ${active?`${fc}40`:'rgba(255,255,255,0.08)'}`, color:active?fc:'rgba(255,255,255,0.35)' }}>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plataforma */}
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Plataforma</label>
        <div className="flex flex-wrap gap-1.5">
          {['Instagram','TikTok','YouTube','WhatsApp','Facebook','LinkedIn','Pinterest'].map(p => {
            const PLAT_COLORS = {
              Instagram:'#e1306c', TikTok:'#69c9d0', YouTube:'#ff0000',
              WhatsApp:'#25d366', Facebook:'#1877f2', LinkedIn:'#0a66c2', Pinterest:'#e60023',
            };
            const pc = PLAT_COLORS[p] || '#a78bfa';
            const active = nrm(plataforma) === nrm(p);
            return (
              <button key={p} type="button" onClick={() => setPlataforma(active ? '' : p)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                style={{ background:active?`${pc}20`:'rgba(255,255,255,0.04)', border:`1px solid ${active?`${pc}45`:'rgba(255,255,255,0.08)'}`, color:active?pc:'rgba(255,255,255,0.35)' }}>
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Responsável</label>
        <div className="flex gap-2">
          {MEMBERS.map(m => {
            const c = memberColors[m]||{}; const active = nrm(responsavel)===nrm(m);
            return <button key={m} type="button" onClick={() => setResponsavel(active?'':m)}
              className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              style={{ background: active?c.bg:'rgba(255,255,255,0.04)', border:`1px solid ${active?c.border:'rgba(255,255,255,0.08)'}`, color: active?c.text:'rgba(255,255,255,0.35)' }}>
              {m}
            </button>;
          })}
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Estado</label>
        <div className="grid grid-cols-2 gap-1.5">
          {ESTADO_OPTIONS.map(s => {
            const active = nrm(estado)===nrm(s.value);
            return <button key={s.value} type="button" onClick={() => setEstado(s.value)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all text-left"
              style={{ background: active?`${s.color}20`:'rgba(255,255,255,0.04)', border:`1px solid ${active?`${s.color}40`:'rgba(255,255,255,0.07)'}`, color: active?s.color:'rgba(255,255,255,0.35)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active?s.color:'rgba(255,255,255,0.15)' }}/>
              {s.label}
            </button>;
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['Gravação', gravacao, setGravacao], ['Postagem', postagem, setPostagem]].map(([lbl,val,set]) => (
          <div key={lbl}>
            <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">{lbl}</label>
            <input type="date" value={val} onChange={e => set(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl text-xs text-white/80 outline-none focus:ring-2 focus:ring-violet-500/30"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', colorScheme:'dark' }}/>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConteudo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Estado</label>
        <div className="grid grid-cols-2 gap-1.5">
          {CONTEUDO_STATES.map(s => {
            const active = nrm(estadoR)===nrm(s.value);
            return <button key={s.value} type="button" onClick={() => setEstadoR(s.value)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all text-left"
              style={{ background: active?`${s.color}20`:'rgba(255,255,255,0.04)', border:`1px solid ${active?`${s.color}40`:'rgba(255,255,255,0.07)'}`, color: active?s.color:'rgba(255,255,255,0.35)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active?s.color:'rgba(255,255,255,0.15)' }}/>
              {s.label}
            </button>;
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Roteiro</label>
        <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={11}
          placeholder="Escreva o conteúdo ou roteiro aqui..."
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white/85 placeholder-white/20 font-medium resize-none outline-none focus:ring-2 focus:ring-violet-500/40 leading-relaxed"
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}/>
        <p className="text-[10px] text-white/20 mt-1 text-right">{conteudo.length} chars</p>
      </div>
      {item.feedbackRoteiro && (
        <div className="px-3 py-2.5 rounded-xl" style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase tracking-wider mb-1">Feedback</p>
          <p className="text-xs text-amber-300/80 leading-relaxed">{item.feedbackRoteiro}</p>
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
          <div className="rounded-xl overflow-hidden aspect-video bg-black"
            style={{ border:'1px solid rgba(255,255,255,0.08)' }}>
            {item.linkFicheiro.includes('drive.google.com')
              ? <iframe src={item.linkFicheiro.replace(/\/view.*$/,'/preview')} className="w-full h-full border-0" allow="autoplay; fullscreen"/>
              : <video src={item.linkFicheiro} controls playsInline className="w-full h-full object-contain"/>
            }
          </div>
        ) : (
          <div className="rounded-xl aspect-video flex flex-col items-center justify-center gap-2"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)' }}>
            <Video className="w-8 h-8 text-white/15"/>
            <p className="text-xs text-white/25">Nenhum vídeo enviado</p>
          </div>
        )}
        <UploadZone label="Upload vídeo" accept="video/*"
          onUpload={url => saveMedia({ linkFicheiro: url })}/>
        {/* Capa */}
        <div className="pt-1">
          <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Capa / Thumbnail</label>
          {item.linkCapa && (
            <div className="mb-2 rounded-xl overflow-hidden aspect-video"
              style={{ border:'1px solid rgba(255,255,255,0.08)' }}>
              <img src={item.linkCapa} alt="Capa" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; }}/>
            </div>
          )}
          <UploadZone label="Upload capa" accept="image/*"
            onUpload={url => saveMedia({ linkCapa: url })}/>
        </div>
        {/* Drive */}
        <div>
          <label className="block text-[11px] font-bold text-white/35 uppercase tracking-wider mb-1.5">Link Drive (download alta)</label>
          <input type="url" value={linkDrive} onChange={e => setLinkDrive(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="w-full px-3 py-2 rounded-xl text-xs text-white/70 placeholder-white/20 outline-none focus:ring-2 focus:ring-violet-500/30"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}/>
        </div>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-xl" style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)' }}>
            <p className="text-[10px] text-orange-400/60 font-bold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-orange-300/80 leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );

    if (isCar) return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-white/35 uppercase tracking-wider">
            Imagens do Carrossel
          </label>
          <span className="text-[10px] text-white/25">{galeriaList.length} imagens</span>
        </div>
        {galeriaList.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {galeriaList.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group"
                style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
                <img src={url} alt={`Slide ${i+1}`} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center">
                  <button onClick={() => removeGalleryImage(i)}
                    className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ background:'rgba(244,63,94,0.9)' }}>
                    <X className="w-3 h-3 text-white"/>
                  </button>
                </div>
                <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-white/70">{i+1}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl aspect-square flex flex-col items-center justify-center gap-2"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)' }}>
            <Image className="w-8 h-8 text-white/15"/>
            <p className="text-xs text-white/25">Nenhuma imagem adicionada</p>
          </div>
        )}
        <UploadZone label="Adicionar imagens" accept="image/*" multiple
          onUpload={urls => addGalleryImages(Array.isArray(urls) ? urls : [urls])}/>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-xl" style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)' }}>
            <p className="text-[10px] text-orange-400/60 font-bold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-orange-300/80 leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );

    // STORIES / ESTÁTICO / POST
    return (
      <div className="space-y-3">
        {item.linkCapa ? (
          <div className="rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', minHeight:'180px' }}>
            <img src={item.linkCapa} alt="Imagem"
              className="w-full object-contain rounded-xl"
              style={{ maxHeight:'360px' }}
              onError={e => { e.target.style.display='none'; }}/>
          </div>
        ) : (
          <div className="rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)', minHeight:'180px' }}>
            <Image className="w-8 h-8 text-white/15"/>
            <p className="text-xs text-white/25">Nenhuma imagem enviada</p>
          </div>
        )}
        <UploadZone label="Upload imagem" accept="image/*"
          onUpload={url => saveMedia({ linkCapa: url })}/>
        {item.feedbackCliente && (
          <div className="px-3 py-2.5 rounded-xl" style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)' }}>
            <p className="text-[10px] text-orange-400/60 font-bold uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-orange-300/80 leading-relaxed">{item.feedbackCliente}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ background:'rgba(9,16,30,0.98)', backdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.7)', maxHeight:'92vh', maxWidth:'560px' }}>

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 pr-8">
            {(cliente || item.cliente) && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background:cl.bg, color:cl.text, border:`1px solid ${cl.border}` }}>
                {cliente || item.cliente}
              </span>
            )}
            {(formato || item.formato) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: FORMAT_COLORS[formato||item.formato]||'#a78bfa', background: `${FORMAT_COLORS[formato||item.formato]||'#a78bfa'}15`, border:`1px solid ${FORMAT_COLORS[formato||item.formato]||'#a78bfa'}25` }}>
                {formato || item.formato}
              </span>
            )}
            {responsavel && (
              <span className="text-[10px] text-white/40 flex items-center gap-1 ml-1">
                <User className="w-3 h-3"/> {responsavel}
              </span>
            )}
          </div>
          {/* Title */}
          <h3 className="text-sm font-bold text-white leading-snug mb-1.5 pr-8">{item.nome}</h3>
          {/* Date */}
          {(item.postagem || item.dataGravacao) && (
            <div className="flex items-center gap-3">
              {item.postagem && (
                <span className="flex items-center gap-1 text-[11px] text-white/30">
                  <Clock className="w-3 h-3"/> {fmtFull(item.postagem)}
                </span>
              )}
              {item.dataGravacao && (
                <span className="flex items-center gap-1 text-[11px] text-white/30">
                  <Camera className="w-3 h-3"/> {fmtFull(item.dataGravacao)}
                </span>
              )}
            </div>
          )}
          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* ── Body: left tabs + right content ── */}
        <div className="flex flex-1 overflow-hidden" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>

          {/* Left: vertical tab list */}
          <div className="flex flex-col gap-1.5 p-3 shrink-0 w-[130px]"
            style={{ borderRight:'1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(t => {
              const st      = sectionStatus(item, t.section);
              const meta    = SECTION_STATUS[st];
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl cursor-pointer transition-all duration-150 w-full"
                  style={{
                    background: isActive ? meta.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? meta.border : 'rgba(255,255,255,0.05)'}`,
                  }}>
                  <t.icon className="w-4 h-4"
                    style={{ color: isActive ? meta.color : 'rgba(255,255,255,0.25)' }}/>
                  <span className="text-[11px] font-bold leading-none"
                    style={{ color: isActive ? meta.color : 'rgba(255,255,255,0.45)' }}>
                    {t.label}
                  </span>
                  <span className="text-[9px] font-semibold leading-none"
                    style={{ color: isActive ? meta.color : 'rgba(255,255,255,0.2)' }}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'tema'     && renderTema()}
            {tab === 'conteudo' && renderConteudo()}
            {tab === 'midia'    && renderMidia()}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2.5 px-4 py-3 shrink-0"
          style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={handleDelete} disabled={deleting}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all disabled:opacity-40"
            style={{ background: confirmDel?'rgba(244,63,94,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${confirmDel?'rgba(244,63,94,0.35)':'rgba(255,255,255,0.1)'}`, color: confirmDel?'#fb7185':'rgba(255,255,255,0.5)' }}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
            {deleting ? 'Removendo…' : confirmDel ? 'confirmar' : 'excluir'}
          </button>
          <button onClick={save} disabled={!dirty||saving||!nome.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ background: saved ? 'rgba(16,185,129,0.85)' : 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : saved ? <CheckCircle2 className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Conteudo() {
  const now = new Date();
  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState('mensal');  // mensal | semanal | feed
  const [memberView,    setMemberView]    = useState('geral');
  const [filterCliente,   setFilterCliente]   = useState('');
  const [filterPlataforma, setFilterPlataforma] = useState('');
  const [selectedItem,    setSelectedItem]    = useState(null);
  const [showNew,       setShowNew]       = useState(false);
  const [calMonth,      setCalMonth]      = useState(now.getMonth());
  const [calYear,       setCalYear]       = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
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
    }
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

  // Filter pipeline
  const filtered = content.filter(item => {
    if (memberView === 'minhas' && !nrm(item.responsavel).includes('savio')) return false;
    if (filterCliente && nrm(item.cliente).replace(/\s/g,'') !== nrm(filterCliente).replace(/\s/g,'')) return false;
    if (filterPlataforma) {
      const platforms = (item.plataforma||'').split(',').map(p => nrm(p).trim());
      if (!platforms.includes(nrm(filterPlataforma))) return false;
    }
    return true;
  });

  // Monthly: only items in exact cal month
  const monthItems = filtered.filter(item => {
    const d = item.postagem || item.dataGravacao;
    if (!d) return false;
    const dt = new Date(d);
    return dt.getFullYear() === calYear && dt.getMonth() === calMonth;
  });

  // Weekly: ±1 month window
  const weeklyItems = filtered.filter(item => {
    const d = item.postagem || item.dataGravacao;
    if (!d) return true;
    const dt = new Date(d);
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
      <div className="flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="px-5 lg:px-8 pt-6 pb-4 shrink-0 border-b" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400"/> Esteira de Conteúdo
              </h1>
              <p className="text-xs text-white/35 mt-0.5">
                {loading ? '…' : `${content.length} conteúdos`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* New */}
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background:'linear-gradient(135deg,#7c3aed,#0e7490)', border:'1px solid rgba(124,58,237,0.4)' }}>
                <Plus className="w-3.5 h-3.5"/>
                <span className="hidden sm:inline">Novo</span>
              </button>

              {/* Member toggle */}
              <div className="flex items-center rounded-xl p-1" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                {[{key:'geral',label:'Geral',icon:LayoutGrid},{key:'minhas',label:'Minhas',icon:User2}].map(({key,label,icon:Icon}) => (
                  <button key={key} onClick={() => setMemberView(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{ background: memberView===key?'rgba(124,58,237,0.25)':'transparent', color: memberView===key?'#a78bfa':'rgba(255,255,255,0.35)', border: memberView===key?'1px solid rgba(124,58,237,0.35)':'1px solid transparent' }}>
                    <Icon className="w-3 h-3"/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-xl p-1" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                {VIEWS.map(({key,label,icon:Icon}) => (
                  <button key={key} onClick={() => setView(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{ background: view===key?'rgba(14,165,233,0.2)':'transparent', color: view===key?'#38bdf8':'rgba(255,255,255,0.35)', border: view===key?'1px solid rgba(14,165,233,0.3)':'1px solid transparent' }}>
                    <Icon className="w-3 h-3"/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Alternating filter list ── */}
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>

            {/* Row 1 — Cliente */}
            <div className="flex items-center" style={{ borderBottom: availablePlatforms.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none"
                style={{ borderRight:'1px solid rgba(255,255,255,0.06)', minWidth:100 }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'rgba(167,139,250,0.6)' }}/>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Cliente</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1" style={{ scrollbarWidth:'none' }}>
                {[{ key:'', label:'Todos', cc:{} }, ...availableClients.map(c => ({ key:c, label:c, cc: CLIENT_COLORS[c]||{} }))].map(({ key, label, cc }) => {
                  const active = nrm(filterCliente).replace(/\s/g,'') === nrm(key).replace(/\s/g,'');
                  return (
                    <button key={key||'todos'} onClick={() => setFilterCliente(active && key ? '' : key)}
                      className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? (key ? cc.bg : 'rgba(255,255,255,0.14)') : 'transparent',
                        border: `1px solid ${active ? (key ? cc.border : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.08)'}`,
                        color: active ? (key ? cc.text : 'white') : 'rgba(255,255,255,0.35)',
                        boxShadow: active && key ? `0 0 12px ${cc.border}` : 'none',
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {filterCliente && (
                <button onClick={() => setFilterCliente('')}
                  className="shrink-0 mr-3 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer text-white/30 hover:text-white transition-colors"
                  style={{ background:'rgba(255,255,255,0.06)' }}>
                  <X className="w-3 h-3"/>
                </button>
              )}
            </div>

            {/* Row 2 — Plataforma (always visible; shows placeholder if no data) */}
            <div className="flex items-center">
              <div className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none"
                style={{ borderRight:'1px solid rgba(255,255,255,0.06)', minWidth:100 }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'rgba(34,211,238,0.5)' }}/>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Plataforma</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1" style={{ scrollbarWidth:'none' }}>
                {availablePlatforms.length === 0 ? (
                  <span className="text-[10px] text-white/18 italic">Nenhuma plataforma cadastrada no Notion</span>
                ) : (
                  [{ key:'', label:'Todas' }, ...availablePlatforms.map(p => ({ key:p, label:p }))].map(({ key, label }) => {
                    const active = nrm(filterPlataforma) === nrm(key);
                    return (
                      <button key={key||'todas'} onClick={() => setFilterPlataforma(active && key ? '' : key)}
                        className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all duration-150 active:scale-95"
                        style={{
                          background: active ? (key ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.12)') : 'transparent',
                          border: `1px solid ${active ? (key ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.22)') : 'rgba(255,255,255,0.08)'}`,
                          color: active ? (key ? '#22d3ee' : 'white') : 'rgba(255,255,255,0.35)',
                          boxShadow: active && key ? '0 0 10px rgba(34,211,238,0.15)' : 'none',
                        }}>
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
              {filterPlataforma && (
                <button onClick={() => setFilterPlataforma('')}
                  className="shrink-0 mr-3 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer text-white/30 hover:text-white transition-colors"
                  style={{ background:'rgba(255,255,255,0.06)' }}>
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
          availableClients={availableClients}/>
      )}

      {showNew && (
        <NewContentModal onClose={() => setShowNew(false)} onCreate={createItem}/>
      )}
    </CRMLayout>
  );
}
