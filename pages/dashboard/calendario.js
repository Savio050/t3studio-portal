import { useState, useEffect, useRef, useCallback } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Calendar, ChevronLeft, ChevronRight, StickyNote, X, Loader2, Trash2,
} from 'lucide-react';

// ── Constantes ────────────────────────────────────────────────────────────────
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const NOTES_KEY = 'crm-calendar-notes-v1';

// ── Helpers de data ───────────────────────────────────────────────────────────
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

// ── Cálculo da Páscoa (algoritmo Meeus/Jones/Butcher) ─────────────────────────
function getEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Retorna o N-ésimo dia da semana de um mês (ex: 2º domingo de maio)
// weekday: 0=Dom … 6=Sáb  |  n: 1-based
function getNthWeekday(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  const firstWd = first.getDay();
  const day = 1 + ((weekday - firstWd + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, day);
}

// Último dia da semana do mês (ex: última sexta de novembro = Black Friday)
function getLastWeekday(year, month, weekday) {
  const last = new Date(year, month + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - diff);
}

// ── Feriados e Datas Comemorativas Brasileiras ────────────────────────────────
// Fontes: amper.ag · reportei.com · futuraim.com.br · serasaexperian.com.br
// · infomoney.com.br · blog.feriados.com.br  (verificado maio/2026)
//
// Tipos:
//   'national'      – feriado nacional (vermelho)
//   'carnival'      – carnaval (roxo)
//   'commemorative' – data comemorativa geral (laranja)
//   'awareness'     – campanha de saúde / mês colorido (verde-azulado)
//   'special'       – evento especial do ano (verde)
function getBrazilianHolidays(year) {
  const easter = getEaster(year);
  const map = {};

  const add = (d, name, type = 'national') => {
    const k = dateKey(d);
    if (map[k]) map[k] = { name: `${map[k].name} / ${name}`, type: map[k].type };
    else map[k] = { name, type };
  };

  // ══ FERIADOS NACIONAIS FIXOS ═══════════════════════════════════════════════
  add(new Date(year,  0,  1), 'Ano Novo');
  add(new Date(year,  3, 21), 'Tiradentes');
  add(new Date(year,  4,  1), 'Dia do Trabalho');
  add(new Date(year,  8,  7), 'Independência do Brasil');
  add(new Date(year,  9, 12), 'Nossa Sra. Aparecida');
  add(new Date(year, 10,  2), 'Finados');
  add(new Date(year, 10, 15), 'Proclamação da República');
  add(new Date(year, 10, 20), 'Consciência Negra');
  add(new Date(year, 11, 25), 'Natal');

  // ══ FERIADOS MÓVEIS (PÁSCOA) ════════════════════════════════════════════════
  add(addDays(easter, -48), 'Segunda de Carnaval',  'carnival');
  add(addDays(easter, -47), 'Terça de Carnaval',    'carnival');
  add(addDays(easter, -46), 'Quarta de Cinzas',     'carnival');
  add(addDays(easter,  -2), 'Sexta-Feira Santa');
  add(easter,               'Páscoa');
  add(addDays(easter,  60), 'Corpus Christi');

  // ══ DATAS DINÂMICAS (N-ésimo dia da semana) ═════════════════════════════════
  add(getNthWeekday(year, 4, 0, 2), 'Dia das Mães',   'commemorative'); // 2º dom/mai
  add(getNthWeekday(year, 7, 0, 2), 'Dia dos Pais',   'commemorative'); // 2º dom/ago
  // Black Friday = última sexta de novembro; Cyber Monday = 3 dias depois
  const blackFriday = getLastWeekday(year, 10, 5);
  add(blackFriday,               'Black Friday',  'commemorative');
  add(addDays(blackFriday, 3),   'Cyber Monday',  'commemorative');

  // ══ JANEIRO ═════════════════════════════════════════════════════════════════
  add(new Date(year,  0,  6), 'Dia de Reis',                       'commemorative');
  add(new Date(year,  0,  8), 'Dia do Fotógrafo',                  'commemorative');
  add(new Date(year,  0, 25), 'Aniversário de São Paulo',          'commemorative');
  add(new Date(year,  0, 30), 'Dia da Saudade',                    'commemorative');

  // ══ FEVEREIRO ═══════════════════════════════════════════════════════════════
  add(new Date(year,  1,  4), 'Dia Mundial do Câncer',             'awareness');
  add(new Date(year,  1, 14), 'Dia da Amizade / Valentine\'s Day', 'commemorative');

  // ══ MARÇO ═══════════════════════════════════════════════════════════════════
  add(new Date(year,  2,  8), 'Dia Internacional da Mulher',       'commemorative');
  add(new Date(year,  2, 15), 'Dia do Consumidor',                 'commemorative');
  add(new Date(year,  2, 20), 'Início do Outono',                  'commemorative');
  add(new Date(year,  2, 21), 'Dia da Síndrome de Down',           'awareness');
  add(new Date(year,  2, 22), 'Dia Mundial da Água',               'awareness');

  // ══ ABRIL ═══════════════════════════════════════════════════════════════════
  add(new Date(year,  3,  1), 'Dia da Mentira',                    'commemorative');
  add(new Date(year,  3,  7), 'Dia Mundial da Saúde',              'awareness');
  add(new Date(year,  3, 19), 'Dia dos Povos Indígenas',           'commemorative');
  add(new Date(year,  3, 22), 'Dia da Terra / Descobrimento do Brasil', 'commemorative');
  add(new Date(year,  3, 23), 'Dia Mundial do Livro',              'commemorative');

  // ══ MAIO ════════════════════════════════════════════════════════════════════
  add(new Date(year,  4,  8), 'Dia do Profissional de Marketing',  'commemorative');
  add(new Date(year,  4, 13), 'Abolição da Escravatura',           'commemorative');
  add(new Date(year,  4, 15), 'Dia Internacional da Família',      'commemorative');
  add(new Date(year,  4, 17), 'Dia contra Homofobia',              'awareness');
  add(new Date(year,  4, 22), 'Dia do Abraço',                     'commemorative');
  add(new Date(year,  4, 24), 'Dia Nacional do Café',              'commemorative');

  // ══ JUNHO ═══════════════════════════════════════════════════════════════════
  add(new Date(year,  5,  1), 'Dia da Imprensa',                   'commemorative');
  add(new Date(year,  5,  5), 'Dia Mundial do Meio Ambiente',      'awareness');
  add(new Date(year,  5, 12), 'Dia dos Namorados',                 'commemorative');
  add(new Date(year,  5, 13), 'Dia de Santo Antônio',              'commemorative');
  add(new Date(year,  5, 14), 'Dia Mundial do Doador de Sangue',   'awareness');
  add(new Date(year,  5, 21), 'Início do Inverno',                 'commemorative');
  add(new Date(year,  5, 24), 'Dia de São João',                   'commemorative');
  add(new Date(year,  5, 28), 'Dia do Orgulho LGBTQIA+',          'commemorative');

  // ══ JULHO ═══════════════════════════════════════════════════════════════════
  add(new Date(year,  6,  7), 'Dia Mundial do Chocolate',          'commemorative');
  add(new Date(year,  6, 10), 'Dia da Pizza',                      'commemorative');
  add(new Date(year,  6, 13), 'Dia do Rock',                       'commemorative');
  add(new Date(year,  6, 15), 'Dia dos Homens',                    'commemorative');
  add(new Date(year,  6, 20), 'Dia do Amigo',                      'commemorative');
  add(new Date(year,  6, 25), 'Dia do Escritor',                   'commemorative');
  add(new Date(year,  6, 26), 'Dia dos Avós',                      'commemorative');
  add(new Date(year,  6, 28), 'Dia do Agricultor',                 'commemorative');

  // ══ AGOSTO ══════════════════════════════════════════════════════════════════
  add(new Date(year,  7,  5), 'Dia Nacional da Saúde',             'awareness');
  add(new Date(year,  7, 11), 'Dia do Estudante / Dia do Advogado','commemorative');
  add(new Date(year,  7, 19), 'Dia Mundial da Fotografia',         'commemorative');
  add(new Date(year,  7, 22), 'Dia do Folclore',                   'commemorative');
  add(new Date(year,  7, 27), 'Dia do Psicólogo',                  'commemorative');

  // ══ SETEMBRO ════════════════════════════════════════════════════════════════
  add(new Date(year,  8,  5), 'Dia da Amazônia',                   'awareness');
  add(new Date(year,  8, 15), 'Dia do Cliente',                    'commemorative');
  add(new Date(year,  8, 21), 'Dia da Árvore',                     'commemorative');
  add(new Date(year,  8, 22), 'Início da Primavera',               'commemorative');
  add(new Date(year,  8, 25), 'Dia Nacional do Trânsito',          'commemorative');
  add(new Date(year,  8, 27), 'Dia Mundial do Turismo',            'commemorative');

  // ══ OUTUBRO ═════════════════════════════════════════════════════════════════
  add(new Date(year,  9,  1), 'Dia do Idoso',                      'commemorative');
  add(new Date(year,  9,  4), 'Dia Mundial dos Animais',           'commemorative');
  add(new Date(year,  9, 12), 'Dia das Crianças',                  'commemorative');
  add(new Date(year,  9, 15), 'Dia do Professor',                  'commemorative');
  add(new Date(year,  9, 16), 'Dia Mundial da Alimentação',        'awareness');
  add(new Date(year,  9, 29), 'Dia Nacional do Livro',             'commemorative');
  add(new Date(year,  9, 31), 'Halloween',                         'commemorative');

  // ══ NOVEMBRO ════════════════════════════════════════════════════════════════
  add(new Date(year, 10,  1), 'Dia de Todos os Santos',            'commemorative');
  add(new Date(year, 10, 14), 'Dia Mundial do Diabetes',           'awareness');

  // ══ DEZEMBRO ════════════════════════════════════════════════════════════════
  add(new Date(year, 11,  1), 'Dia Mundial de Combate à AIDS',     'awareness');
  add(new Date(year, 11,  8), 'N. Sra. da Conceição',              'commemorative');
  add(new Date(year, 11, 21), 'Início do Verão',                   'commemorative');
  add(new Date(year, 11, 24), 'Véspera de Natal',                  'commemorative');
  add(new Date(year, 11, 31), 'Réveillon',                         'commemorative');

  // ══ EVENTOS ESPECIAIS 2026 ═══════════════════════════════════════════════════
  if (year === 2026) {
    add(new Date(2026,  5, 11), '⚽ Início Copa do Mundo',         'special');
    add(new Date(2026,  6, 19), '⚽ Final Copa do Mundo',          'special');
    add(new Date(2026,  9,  4), '🗳️ Eleições — 1º Turno',         'special');
    add(new Date(2026,  9, 25), '🗳️ Eleições — 2º Turno',         'special');
  }

  // ══ MESES DE CONSCIENTIZAÇÃO (marcados no 1º do mês) ═════════════════════════
  // Apenas adicionados se ainda não houver feriado naquele dia
  const awarenessMonths = [
    [0,  'Janeiro Branco (saúde mental)'],
    [0,  'Janeiro Roxo (hanseníase)'],
    [1,  'Fevereiro Laranja (leucemia)'],
    [3,  'Abril Azul (autismo)'],
    [6,  'Julho Amarelo (hepatites virais)'],
    [7,  'Agosto Dourado (amamentação)'],
    [8,  'Setembro Amarelo (prevenção ao suicídio)'],
    [9,  'Outubro Rosa (câncer de mama)'],
    [10, 'Novembro Azul (câncer de próstata)'],
  ];
  awarenessMonths.forEach(([m, name]) => {
    const k = dateKey(new Date(year, m, 1));
    if (!map[k]) add(new Date(year, m, 1), name, 'awareness');
    else {
      // Adiciona info do mês de conscientização na sidebar separadamente
      map[`awareness-${m}-${year}`] = { name, type: 'awareness', sidebarOnly: true, month: m };
    }
  });

  return map;
}

// ── Modal de nota ─────────────────────────────────────────────────────────────
function DayNoteModal({ date, note, holiday, onSave, onClose }) {
  const [text, setText] = useState(note || '');
  const ref = useRef(null);

  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);

  const handleSave = useCallback(() => {
    onSave(dateKey(date), text.trim());
    onClose();
  }, [date, text, onSave, onClose]);

  const handleKeyDown = e => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  };

  const HOLIDAY_COLORS = {
    national:      { bg: 'rgba(255,59,48,0.10)',  text: '#c0271f',  border: 'rgba(255,59,48,0.25)' },
    carnival:      { bg: 'rgba(125,63,255,0.10)', text: '#5a27c4',  border: 'rgba(125,63,255,0.25)' },
    commemorative: { bg: 'rgba(255,149,0,0.10)',  text: '#b35a00',  border: 'rgba(255,149,0,0.25)' },
    awareness:     { bg: 'rgba(0,199,190,0.10)',  text: '#007873',  border: 'rgba(0,199,190,0.25)' },
    special:       { bg: 'rgba(52,199,89,0.10)',  text: '#1a7a35',  border: 'rgba(52,199,89,0.25)' },
  };
  const hc = holiday ? HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.national : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-apple-xl overflow-hidden animate-slide-up bg-surface border border-hairline shadow-apple-md">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-hairline">
          <div>
            <p className="t-eyebrow flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" />
              Nota do dia
            </p>
            <h2 className="t-title mt-1 text-ink tracking-apple-tight capitalize">
              {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {holiday && (
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ background: hc.bg, color: hc.text, borderColor: hc.border }}>
                🎉 {holiday.name}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="p-4">
          <textarea
            ref={ref}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="Escreva uma nota para este dia…"
            className="w-full text-sm text-ink leading-relaxed resize-none rounded-apple px-3 py-2.5 bg-elevated border border-hairline focus:outline-none focus:border-accent/50 focus:bg-surface placeholder:text-ink-faint transition-all duration-150"
          />
          <p className="text-[11px] text-ink-faint mt-1.5">⌘/Ctrl+Enter para salvar · Esc para fechar</p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {note && (
            <button onClick={() => { onSave(dateKey(date), ''); onClose(); }}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-err hover:text-err">
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary btn-sm">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Calendario() {
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [notes, setNotes] = useState({});          // { 'YYYY-MM-DD': 'texto' }
  const [modal, setModal] = useState(null);         // { date, key } | null

  // Carrega notas do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
  }, []);

  // Feriados do ano atual exibido
  const holidays = getBrazilianHolidays(year);

  // Salva nota
  const saveNote = useCallback((key, text) => {
    setNotes(prev => {
      const next = { ...prev };
      if (text) next[key] = text;
      else delete next[key];
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const todayStr    = dateKey(today);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Feriados do mês para o resumo lateral (exclui chaves sidebarOnly)
  const monthHolidays = Object.entries(holidays)
    .filter(([k, v]) => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}-`) && !v.sidebarOnly)
    .sort(([a],[b]) => a.localeCompare(b));

  // Meses de conscientização do mês atual
  const awarenessThisMonth = Object.values(holidays)
    .filter(v => v.sidebarOnly && v.month === month);

  // Notas do mês
  const monthNotes = Object.entries(notes)
    .filter(([k]) => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}-`))
    .sort(([a],[b]) => a.localeCompare(b));

  const HOLIDAY_COLORS = {
    national:      { dot: '#ff3b30', bg: 'rgba(255,59,48,0.08)',  text: '#c0271f',  border: 'rgba(255,59,48,0.20)' },
    carnival:      { dot: '#7d3fff', bg: 'rgba(125,63,255,0.08)', text: '#5a27c4',  border: 'rgba(125,63,255,0.20)' },
    commemorative: { dot: '#ff9500', bg: 'rgba(255,149,0,0.08)',  text: '#b35a00',  border: 'rgba(255,149,0,0.20)' },
    awareness:     { dot: '#00c7be', bg: 'rgba(0,199,190,0.08)',  text: '#007873',  border: 'rgba(0,199,190,0.20)' },
    special:       { dot: '#34c759', bg: 'rgba(52,199,89,0.10)',  text: '#1a7a35',  border: 'rgba(52,199,89,0.22)' },
  };

  return (
    <CRMLayout title="Calendário — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
          <div>
            <p className="t-eyebrow flex items-center gap-1.5">
              <span className="dot dot-blue" />
              Calendário
            </p>
            <h1 className="t-hero text-ink tracking-apple-tight mt-1 flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-accent" />
              {MONTHS_PT[month]}{' '}
              <span className="text-ink-muted font-normal">{year}</span>
            </h1>
            <p className="t-small text-ink-muted mt-1">
              {monthHolidays.length} feriado{monthHolidays.length !== 1 ? 's' : ''}
              {monthNotes.length > 0 && ` · ${monthNotes.length} nota${monthNotes.length !== 1 ? 's' : ''}`}
              {' '}em {MONTHS_PT[month]}
            </p>
          </div>

          {/* Navegação */}
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="btn btn-secondary btn-sm">Hoje</button>
            <div className="flex items-center gap-1 p-1 rounded-apple bg-elevated border border-hairline">
              <button onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-ink-soft hover:text-ink hover:bg-surface transition-all duration-150">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-ink-soft hover:text-ink hover:bg-surface transition-all duration-150">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Layout calendário + sidebar */}
        <div className="flex gap-5 flex-col lg:flex-row">

          {/* ── Calendário ─────────────────────────────────────────────────── */}
          <div className="flex-1 rounded-apple-lg overflow-hidden bg-surface border border-hairline shadow-apple-sm">

            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 border-b border-hairline bg-elevated/60">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-ink-muted uppercase tracking-apple-snug">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (!day) return (
                  <div key={`e${idx}`}
                    className="border-r border-b border-hairline bg-elevated/20"
                    style={{ aspectRatio: '1/1' }} />
                );

                const key      = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isToday  = key === todayStr;
                const holiday  = holidays[key]?.sidebarOnly ? null : holidays[key]; // não mostrar sidebarOnly no grid
                const note     = notes[key];
                const hc       = holiday ? HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.national : null;
                const isSun    = new Date(year, month, day).getDay() === 0;
                const isSat    = new Date(year, month, day).getDay() === 6;

                return (
                  <div key={day}
                    onClick={() => setModal({ date: new Date(year, month, day), key })}
                    className={`border-r border-b border-hairline p-1.5 flex flex-col cursor-pointer
                      transition-all duration-150 hover:bg-elevated/60 group relative`}
                    style={{
                      aspectRatio: '1/1',
                      background: holiday ? hc.bg : undefined,
                    }}>

                    {/* Número do dia */}
                    <div className="flex justify-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all
                        ${isToday
                          ? 'bg-accent text-white'
                          : isSun || (holiday && holiday.type !== 'commemorative')
                            ? 'text-err font-bold'
                            : isSat
                              ? 'text-ink-soft'
                              : 'text-ink'
                        }`}>
                        {day}
                      </div>
                    </div>

                    {/* Nome do feriado */}
                    {holiday && (
                      <div className="mt-0.5 px-0.5 hidden sm:block">
                        <span className="text-[8px] leading-tight font-semibold block truncate"
                          style={{ color: hc.text }}>
                          {holiday.name}
                        </span>
                      </div>
                    )}

                    {/* Indicador de nota */}
                    {note && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      </div>
                    )}

                    {/* Botão adicionar nota ao hover */}
                    {!note && (
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <StickyNote className="w-3 h-3 text-ink-faint" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <div className="lg:w-64 flex flex-col gap-4">

            {/* Legenda */}
            <div className="card">
              <p className="t-eyebrow mb-3">Legenda</p>
              <div className="space-y-2">
                {[
                  { type: 'national',      label: 'Feriado nacional' },
                  { type: 'carnival',      label: 'Carnaval' },
                  { type: 'commemorative', label: 'Data comemorativa' },
                  { type: 'awareness',     label: 'Campanha de saúde' },
                  { type: 'special',       label: 'Evento especial' },
                ].map(({ type, label }) => {
                  const c = HOLIDAY_COLORS[type];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.dot }} />
                      <span className="text-xs text-ink-soft">{label}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400" />
                  <span className="text-xs text-ink-soft">Nota adicionada</span>
                </div>
              </div>
            </div>

            {/* Meses de conscientização */}
            {awarenessThisMonth.length > 0 && (
              <div className="card">
                <p className="t-eyebrow mb-3">🎗️ Meses de {MONTHS_PT[month]}</p>
                <div className="space-y-1.5">
                  {awarenessThisMonth.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-apple border"
                      style={{ background: HOLIDAY_COLORS.awareness.bg, borderColor: HOLIDAY_COLORS.awareness.border }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: HOLIDAY_COLORS.awareness.dot }} />
                      <span className="text-[11px] font-medium" style={{ color: HOLIDAY_COLORS.awareness.text }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feriados do mês */}
            {monthHolidays.length > 0 && (
              <div className="card">
                <p className="t-eyebrow mb-3">Feriados de {MONTHS_PT[month]}</p>
                <div className="space-y-1.5">
                  {monthHolidays.map(([k, h]) => {
                    const hc = HOLIDAY_COLORS[h.type] || HOLIDAY_COLORS.national;
                    const day = parseInt(k.split('-')[2]);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-apple flex items-center justify-center text-[11px] font-bold shrink-0 border"
                          style={{ background: hc.bg, color: hc.text, borderColor: hc.border }}>
                          {day}
                        </div>
                        <span className="text-xs text-ink-soft leading-snug">{h.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notas do mês */}
            {monthNotes.length > 0 && (
              <div className="card">
                <p className="t-eyebrow mb-3">Notas de {MONTHS_PT[month]}</p>
                <div className="space-y-2">
                  {monthNotes.map(([k, text]) => {
                    const day = parseInt(k.split('-')[2]);
                    return (
                      <button key={k}
                        onClick={() => setModal({ date: new Date(year, month, day), key: k })}
                        className="w-full text-left rounded-apple px-2.5 py-2 bg-elevated hover:bg-surface border border-hairline transition-all duration-150 group">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-ink-soft">
                            {new Date(year, month, day).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft leading-relaxed line-clamp-2">{text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de nota */}
      {modal && (
        <DayNoteModal
          date={modal.date}
          note={notes[modal.key] || ''}
          holiday={holidays[modal.key] || null}
          onSave={saveNote}
          onClose={() => setModal(null)}
        />
      )}
    </CRMLayout>
  );
}
