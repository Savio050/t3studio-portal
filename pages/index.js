import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  Calendar, FileText, Check, Film, Send,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Loader2, MoreHorizontal, AlertTriangle, Clock, Download,
  Image as ImageIcon,
} from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const NAVY = '#071928';
const NAVY_DARK = '#0d2440';

// ─── Meses em PT-BR para parse ────────────────────────────────────────────────
const MONTH_KEYS = [
  'janeiro','fevereiro','março','marco','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];
const MONTH_CANONICAL = {
  'janeiro':'Janeiro','fevereiro':'Fevereiro','março':'Março','marco':'Março',
  'abril':'Abril','maio':'Maio','junho':'Junho','julho':'Julho',
  'agosto':'Agosto','setembro':'Setembro','outubro':'Outubro',
  'novembro':'Novembro','dezembro':'Dezembro',
};
const MONTH_ORDER = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

/**
 * Extrai mês (capitalizado) e ano (string "20xx") de qualquer combinação:
 * "abril 2026", "Abril/2026", "04/2026", "2026", "abril", null, etc.
 * Fallback do ano vem de dataGravacao "2026-04-02".
 */
function parseMonthYear(mesRelativo, dataGravacao) {
  const raw  = (mesRelativo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const str  = raw.replace(/[^a-z0-9\s]/g, ' ').trim();

  // Ano: 4 dígitos começando com 19 ou 20
  const yearMatch = str.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : (dataGravacao ? dataGravacao.split('-')[0] : null);

  // Mês: nome por extenso
  let month = null;
  for (const key of MONTH_KEYS) {
    const norm = key.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (str.includes(norm)) { month = MONTH_CANONICAL[key]; break; }
  }

  // Fallback mês numérico (ex: "04")
  if (!month && dataGravacao) {
    const mm = parseInt(dataGravacao.split('-')[1], 10);
    if (mm >= 1 && mm <= 12) month = MONTH_ORDER[mm - 1];
  }

  return { month, year };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('drive.google.com')) return url.replace(/\/view.*$/, '/preview');
  return url;
};

const fmt = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return d && m && y ? `${d}/${m}/${y}` : dateStr;
};

const renderLinks = (text) => {
  if (!text) return null;
  return text.split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer"
           className="text-blue-600 underline break-all hover:text-blue-700">{p}</a>
      : p
  );
};

// ─── Responsabilidade do roteiro (quem precisa agir?) ─────────────────────────
function getScriptStatus(estadoRoteiro) {
  // normaliza para comparação segura
  const raw = (estadoRoteiro || '').trim();
  const s   = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  if (!s || s === 'pendente' && !raw) // nenhum valor
    return { label: 'Em criação pela T3', color: 'text-slate-400', urgent: false };
  if (['nao iniciada','nao iniciado'].includes(s))
    return { label: 'Em criação pela T3', color: 'text-slate-400', urgent: false };
  if (s === 'em producao' || s === 'em produção')
    return { label: 'Em criação pela T3', color: 'text-slate-400', urgent: false };
  if (['aguardando aprovacao','aguardado aprovacao','aguardando aprovação','aguardado aprovação','pendente'].includes(s))
    return { label: 'Ação Necessária', color: 'text-orange-500', urgent: true };
  if (s.includes('ajuste') || s.includes('alteracao') || s.includes('alteração'))
    return { label: 'Ajuste em andamento', color: 'text-sky-500', urgent: false };
  // fallback para qualquer valor desconhecido que não seja aprovado/concluído
  return { label: raw, color: 'text-slate-400', urgent: false };
}

// Checa se um item de vídeo está aguardando aprovação (aceita variações ortográficas)
function isAwaitingApproval(estado) {
  const s = (estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return (
    s.includes('aguardando') ||
    s.includes('aguardado')  ||
    s === 'pendente aprovacao' ||
    (s.includes('aprovac') && s.includes('pendente'))
  );
}

// Checa se item está "encerrado" (aprovado ou concluído)
function isDone(val) {
  const s = (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return s === 'aprovado' || s === 'concluido' || s === 'concluído';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4200);
  }, []);
  return { toasts, add };
}

function Toasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
      flex flex-col gap-2 pointer-events-none w-[calc(100vw-2rem)] max-w-xs">
      {toasts.map(t => (
        <div key={t.id} role="status"
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border
            animate-in slide-in-from-bottom-3 fade-in duration-300 text-sm font-semibold
            ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
              : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}>
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle  className="w-4 h-4 shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse mb-4">
      <div className="px-5 py-4 flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-28 bg-gray-100 rounded ml-4" />
      </div>
      <div className="px-4 pb-4 space-y-3">
        <div className="h-11 w-full bg-gray-100 rounded-xl" />
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-green-100 rounded-xl" />
          <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Card header compartilhado ────────────────────────────────────────────────
function CardHead({ nome, dataGravacao, categoria, statusLabel, statusColor }) {
  return (
    <div className="px-5 pt-5 pb-3 flex justify-between items-start gap-4">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-snug">
          {nome}
        </h3>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          {dataGravacao && (
            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {fmt(dataGravacao)}
            </span>
          )}
          {categoria && (
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {categoria}
            </span>
          )}
        </div>
      </div>
      <span className={`shrink-0 text-[11px] font-black uppercase tracking-wider leading-none mt-0.5 ${statusColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}

// ─── Roteiro accordion ────────────────────────────────────────────────────────
function Roteiro({ roteiro, label = 'Ver Roteiro' }) {
  const [open, setOpen] = useState(false);
  if (!roteiro) return null;
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3
          bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600
          hover:bg-gray-100 hover:border-gray-300 cursor-pointer
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <span className="flex items-center gap-2 font-semibold">
          <FileText className="w-4 h-4 text-gray-400" aria-hidden="true" />
          {label}
        </span>
        {open
          ? <ChevronUp   className="w-4 h-4 text-gray-400" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />}
      </button>
      {open && (
        <div className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-200
          text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {renderLinks(roteiro)}
        </div>
      )}
    </div>
  );
}

// ─── Grid de mídia compartilhado ──────────────────────────────────────────────
function MediaGrid({ item, showDownload = false }) {
  const embedUrl  = getEmbedUrl(item.linkFicheiro);
  const hasCovers = item.linkCapa || item.linkCapa2;

  return (
    <div className="px-4 pb-4 flex gap-3">
      {/* Vídeo */}
      <div className={`flex flex-col gap-2 ${hasCovers ? 'flex-[2]' : 'w-full'}`}>
        {embedUrl ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
            <iframe src={embedUrl} className="w-full h-full border-0"
              allow="autoplay; fullscreen" title={`Vídeo: ${item.nome}`} />
          </div>
        ) : (
          <div className="w-full aspect-video rounded-xl bg-gray-100
            flex flex-col items-center justify-center gap-2">
            <Film className="w-10 h-10 text-gray-300" aria-hidden="true" />
            <span className="text-xs text-gray-400 font-medium">Vídeo em produção</span>
          </div>
        )}
        {showDownload && item.linkFicheiro && (
          <a href={item.linkFicheiro} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center py-3 rounded-xl cursor-pointer
              bg-green-500 hover:bg-green-600 text-white
              text-sm font-black uppercase tracking-widest
              active:scale-[0.98] transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
            BAIXAR
          </a>
        )}
      </div>

      {/* Capas */}
      {hasCovers && (
        <div className="flex-1 flex gap-2">
          {item.linkCapa && (
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                CAPA 1
              </p>
              <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-900
                relative pointer-events-none">
                <iframe src={getEmbedUrl(item.linkCapa)}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Capa 1" style={{ transform: 'scale(1.05)' }} />
              </div>
              {showDownload && (
                <a href={item.linkCapa} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center py-2.5 rounded-xl cursor-pointer
                    border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
                    text-xs font-black uppercase tracking-widest
                    active:scale-[0.98] transition-all duration-150">
                  BAIXAR
                </a>
              )}
            </div>
          )}
          {item.linkCapa2 && (
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                CAPA 2
              </p>
              <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-900
                relative pointer-events-none">
                <iframe src={getEmbedUrl(item.linkCapa2)}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Capa 2" style={{ transform: 'scale(1.05)' }} />
              </div>
              {showDownload && (
                <a href={item.linkCapa2} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center py-2.5 rounded-xl cursor-pointer
                    border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
                    text-xs font-black uppercase tracking-widest
                    active:scale-[0.98] transition-all duration-150">
                  BAIXAR
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Botões de ação (aprovação + feedback) ────────────────────────────────────
function ActionButtons({ onApprove, onReject, approveLabel, submitting }) {
  const [showForm, setShowForm] = useState(false);
  const [text,     setText]     = useState('');

  const doReject = async () => {
    if (!text.trim()) return;
    await onReject(text);
    setShowForm(false);
    setText('');
  };

  if (showForm) return (
    <div className="flex flex-col gap-3">
      <textarea
        autoFocus rows={4} value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Descreva detalhadamente o que precisa ser alterado..."
        className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm text-gray-700
          placeholder-gray-300 font-medium resize-none
          focus:outline-none focus:border-orange-300 transition-colors duration-150"
      />
      <div className="flex gap-3">
        <button onClick={doReject} disabled={!text.trim() || submitting}
          className="flex-1 flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-xl
            cursor-pointer bg-[#0d2440] hover:bg-[#0f2d52] text-white
            text-sm font-black uppercase tracking-widest
            active:scale-[0.98] transition-all duration-150 disabled:opacity-50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar
        </button>
        <button onClick={() => { setShowForm(false); setText(''); }}
          className="flex-1 flex items-center justify-center min-h-[44px] py-3 rounded-xl
            cursor-pointer border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
            text-sm font-black uppercase tracking-widest
            active:scale-[0.98] transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-3">
      <button onClick={onApprove} disabled={submitting}
        className="flex-1 flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-xl
          cursor-pointer bg-green-500 hover:bg-green-600 text-white
          text-sm font-black uppercase tracking-widest
          shadow-[0_4px_20px_rgba(34,197,94,0.3)]
          active:scale-[0.98] transition-all duration-150 disabled:opacity-60
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
        {submitting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Check    className="w-4 h-4" aria-hidden="true" />}
        {approveLabel}
      </button>
      <button onClick={() => setShowForm(true)} disabled={submitting}
        className="flex-1 flex items-center justify-center min-h-[44px] py-3 rounded-xl
          cursor-pointer border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-800
          text-sm font-black uppercase tracking-widest
          active:scale-[0.98] transition-all duration-150 disabled:opacity-60
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
        Sugerir Alteração
      </button>
    </div>
  );
}

// ─── Dropdown filtro (mês ou ano) ─────────────────────────────────────────────
function FilterDropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = value != null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full border
          text-sm font-bold whitespace-nowrap cursor-pointer
          transition-all duration-150 min-h-[40px]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${active
            ? 'bg-[#0d2440] text-white border-[#0d2440] focus-visible:ring-[#0d2440]'
            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-800 focus-visible:ring-gray-400'
          }`}
      >
        <span>{value ?? placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-2xl
            shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100
            py-1.5 min-w-[150px] max-h-60 overflow-y-auto"
        >
          {/* Opção limpar — só aparece se há seleção */}
          {active && (
            <button
              role="option"
              aria-selected={false}
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-xs text-gray-400 font-bold uppercase
                tracking-widest hover:bg-gray-50 transition-colors duration-100 cursor-pointer
                border-b border-gray-100 mb-1"
            >
              Limpar seleção
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-100
                cursor-pointer hover:bg-gray-50
                ${value === opt
                  ? 'font-black text-[#0d2440] bg-gray-50'
                  : 'font-medium text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center" role="status">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10
        flex items-center justify-center">
        <Icon className="w-8 h-8 text-white/20" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-bold text-white/50">{title}</p>
        <p className="text-sm text-white/25 mt-1 max-w-xs mx-auto">{sub}</p>
      </div>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ApprovalCard({ item, onApprove, onReject }) {
  const st           = getScriptStatus(item.estadoRoteiro);
  const [busy, setBusy] = useState(false);

  const approve = async () => { setBusy(true); await onApprove('roteiro'); setBusy(false); };
  const reject  = async (txt) => { setBusy(true); await onReject('roteiro', txt); setBusy(false); };

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {st.urgent && (
        <div className="h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />
      )}
      <CardHead
        nome={item.nome}
        dataGravacao={item.dataGravacao}
        categoria={item.categoria}
        statusLabel={st.label}
        statusColor={st.color}
      />
      <div className="px-5 pb-5">
        {item.roteiro
          ? <Roteiro roteiro={item.roteiro} />
          : (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3.5
              bg-slate-50 border border-slate-100 rounded-xl">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <p className="text-xs text-slate-400 font-semibold">
                Roteiro sendo preparado pela equipe T3 Studio
              </p>
            </div>
          )
        }

        {st.urgent && (
          <ActionButtons
            onApprove={approve}
            onReject={reject}
            approveLabel="Aprovar Roteiro"
            submitting={busy}
          />
        )}

        {!st.urgent && (
          <div className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border text-xs font-semibold
            ${item.estadoRoteiro === 'Ajuste Solicitado'
              ? 'bg-sky-50 border-sky-100 text-sky-600'
              : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            {item.estadoRoteiro === 'Ajuste Solicitado'
              ? <><AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sua sugestão foi recebida — a equipe T3 está revisando.</>
              : <><Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  A equipe T3 está escrevendo seu roteiro. Você será avisado quando estiver pronto.</>
            }
          </div>
        )}
      </div>
    </article>
  );
}

function ReviewCard({ item, onApprove, onReject }) {
  const [busy, setBusy] = useState(false);
  const approve = async () => { setBusy(true); await onApprove('video'); setBusy(false); };
  const reject  = async (txt) => { setBusy(true); await onReject('video', txt); setBusy(false); };

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />
      <CardHead
        nome={item.nome}
        dataGravacao={item.dataGravacao}
        categoria={item.categoria}
        statusLabel="Ação Necessária"
        statusColor="text-orange-500"
      />
      <MediaGrid item={item} showDownload={false} />
      <div className="px-4 pb-5">
        <ActionButtons
          onApprove={approve}
          onReject={reject}
          approveLabel="Aprovar Vídeo"
          submitting={busy}
        />
      </div>
    </article>
  );
}

function DownloadCard({ item }) {
  const label = isDone(item.estado) && item.estado.toLowerCase().includes('conclu')
    ? 'Concluído' : 'Aprovado';

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <CardHead
        nome={item.nome}
        dataGravacao={item.dataGravacao}
        categoria={item.categoria}
        statusLabel={label}
        statusColor="text-green-500"
      />
      <MediaGrid item={item} showDownload={true} />
      {/* Roteiro — sempre exibido se existir */}
      {item.roteiro && (
        <div className="px-4 pb-5">
          <Roteiro roteiro={item.roteiro} label="Ver Roteiro do Projeto" />
        </div>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { id } = router.query;

  const [tab,      setTab]      = useState('downloads');
  const [contents, setContents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [noId,     setNoId]     = useState(false);
  // Filtros Downloads
  const [selMonth, setSelMonth] = useState(null);
  const [selYear,  setSelYear]  = useState(null);
  const { toasts, add } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    if (!id) { setNoId(true); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/contents?id=${id}`)
      .then(r => r.json())
      .then(d => { setContents(d.contents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router.isReady, id]);

  // ── Mutations ──
  const approve = async (itemId, target) => {
    const res = await fetch('/api/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target }),
    });
    if (res.ok) {
      const key = target === 'roteiro' ? 'estadoRoteiro' : 'estado';
      setContents(p => p.map(c => c.id === itemId ? { ...c, [key]: 'Aprovado' } : c));
      add(target === 'roteiro' ? 'Roteiro aprovado!' : 'Vídeo aprovado!', 'success');
    } else add('Erro ao aprovar. Tente novamente.', 'error');
  };

  const reject = async (itemId, target, txt) => {
    if (!txt.trim()) return;
    const res = await fetch('/api/reject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target, feedback: txt }),
    });
    if (res.ok) {
      const key = target === 'roteiro' ? 'estadoRoteiro' : 'estado';
      setContents(p => p.map(c => c.id === itemId ? { ...c, [key]: 'Ajuste Solicitado' } : c));
      add('Sugestão recebida! A equipe T3 foi notificada.', 'warning');
    } else add('Erro ao enviar. Tente novamente.', 'error');
  };

  // ── Dados das abas ──────────────────────────────────────────────────────────

  // APROVAÇÃO: exibe APENAS roteiros com EstadoRoteiro = "Aguardando Aprovação"
  const approvalItems = contents.filter(item =>
    isAwaitingApproval(item.estadoRoteiro)
  );

  // REVISÃO: aceita variações de "aguardando/aguardado aprovação" + tem mídia
  const reviewItems = contents.filter(item =>
    isAwaitingApproval(item.estado) &&
    (item.linkFicheiro || item.linkCapa || item.linkCapa2)
  );

  // DOWNLOADS: aprovados/concluídos com mídia
  const allApproved = contents.filter(item =>
    isDone(item.estado) &&
    (item.linkFicheiro || item.linkCapa || item.linkCapa2)
  );

  // Parse mês/ano de cada item para os filtros
  const parsedItems = allApproved.map(item => ({
    ...item,
    _parsed: parseMonthYear(item.mesRelativo, item.dataGravacao),
  }));

  // Lista de meses disponíveis (ordem calendário)
  const availMonths = MONTH_ORDER.filter(m =>
    parsedItems.some(i => i._parsed.month === m)
  );

  // Lista de anos disponíveis (mais recente primeiro)
  const availYears = [...new Set(
    parsedItems.map(i => i._parsed.year).filter(Boolean)
  )].sort((a, b) => Number(b) - Number(a));

  // Aplicar filtro
  const downloadItems = parsedItems.filter(item => {
    const mOk = !selMonth || item._parsed.month === selMonth;
    const yOk = !selYear  || item._parsed.year  === selYear;
    return mOk && yOk;
  });

  // Badges urgência
  const approvalBadge = approvalItems.filter(i => getScriptStatus(i.estadoRoteiro).urgent).length;
  const reviewBadge   = reviewItems.length;

  const TABS = [
    { key: 'approval',  label: 'Aprovação', badge: approvalBadge },
    { key: 'review',    label: 'Revisão',   badge: reviewBadge   },
    { key: 'downloads', label: 'Downloads', badge: 0             },
  ];

  // ── Sem ID ──
  if (noId) return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${plusJakarta.className}`}
      style={{ background: NAVY }}>
      <Head>
        <title>T3 Studio | Portal do Cliente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content={NAVY} />
      </Head>
      <div className="text-center max-w-sm">
        <p className="text-xl font-black text-white uppercase tracking-[0.22em] mb-0.5">T3 STUDIO</p>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.28em] mb-10">Portal do Cliente</p>
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10
          flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-white/20" />
        </div>
        <h1 className="text-base font-bold text-white/70 mb-2">Link inválido</h1>
        <p className="text-sm text-white/35 leading-relaxed">
          Acesse o portal pelo link fornecido pela T3 Studio.
        </p>
      </div>
    </div>
  );

  // ── Carregando ──
  if (loading) return (
    <div className={`min-h-screen ${plusJakarta.className}`} style={{ background: NAVY }}>
      <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="w-8 h-8" />
        <div className="text-center">
          <div className="h-5 w-24 bg-white/10 rounded animate-pulse mx-auto mb-1.5" />
          <div className="h-3 w-28 bg-white/5  rounded animate-pulse mx-auto" />
        </div>
        <div className="w-8 h-8" />
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-10 space-y-4">
        <Skeleton /><Skeleton />
      </div>
    </div>
  );

  // ── Portal ──
  return (
    <div className={`min-h-screen ${plusJakarta.className}`} style={{ background: NAVY }}>
      <Head>
        <title>T3 Studio | Portal do Cliente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Portal de conteúdo T3 Studio" />
        <meta name="theme-color" content={NAVY} />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5"
        style={{ background: `${NAVY}f2` }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button aria-label="Menu"
            className="w-10 h-10 flex flex-col gap-[5px] items-start justify-center
              opacity-60 hover:opacity-100 transition-opacity cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-3.5 h-[2px] bg-white rounded-full" />
          </button>

          <div className="text-center select-none">
            <p className="text-[17px] font-black text-white uppercase tracking-[0.22em]">T3 STUDIO</p>
            <p className="text-[9px] font-bold text-white/35 uppercase tracking-[0.28em] mt-0.5">
              Portal do Cliente
            </p>
          </div>

          <button aria-label="Mais opções"
            className="w-10 h-10 flex items-center justify-center
              opacity-60 hover:opacity-100 transition-opacity cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <MoreHorizontal className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-[65px] z-40 backdrop-blur-xl border-b border-white/5"
        style={{ background: `${NAVY}f2` }}
        role="tablist" aria-label="Seções do portal">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map(({ key, label, badge }) => (
            <button key={key} role="tab"
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`relative flex-1 py-4 min-h-[52px] text-xs font-black uppercase
                tracking-[0.15em] border-b-2 cursor-pointer
                flex items-center justify-center gap-2 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30
                ${tab === key
                  ? 'text-white border-white'
                  : 'text-white/30 border-transparent hover:text-white/60'}`}
            >
              {label}
              {badge > 0 && (
                <span aria-label={`${badge} pendente${badge > 1 ? 's' : ''}`}
                  className="w-[18px] h-[18px] rounded-full bg-orange-500 text-white
                    text-[9px] font-black flex items-center justify-center shrink-0">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 pt-5 pb-24">

        {/* APROVAÇÃO */}
        <section id="panel-approval" role="tabpanel" aria-labelledby="tab-approval"
          hidden={tab !== 'approval'}>
          {tab === 'approval' && (
            <div className="space-y-4">
              {approvalItems.length > 0
                ? approvalItems.map(item => (
                    <ApprovalCard key={item.id} item={item}
                      onApprove={t => approve(item.id, t)}
                      onReject={(t, txt) => reject(item.id, t, txt)} />
                  ))
                : <Empty icon={FileText}
                    title="Nenhum roteiro pendente"
                    sub="Todos os roteiros foram aprovados. A equipe T3 já está produzindo seu conteúdo." />
              }
            </div>
          )}
        </section>

        {/* REVISÃO */}
        <section id="panel-review" role="tabpanel" aria-labelledby="tab-review"
          hidden={tab !== 'review'}>
          {tab === 'review' && (
            <div className="space-y-4">
              {reviewItems.length > 0
                ? reviewItems.map(item => (
                    <ReviewCard key={item.id} item={item}
                      onApprove={t => approve(item.id, t)}
                      onReject={(t, txt) => reject(item.id, t, txt)} />
                  ))
                : <Empty icon={Film}
                    title="Nenhum vídeo aguardando revisão"
                    sub="Quando um vídeo estiver pronto para sua aprovação, ele aparecerá aqui." />
              }
            </div>
          )}
        </section>

        {/* DOWNLOADS */}
        <section id="panel-downloads" role="tabpanel" aria-labelledby="tab-downloads"
          hidden={tab !== 'downloads'}>
          {tab === 'downloads' && (
            <>
              {/* Filtros de período */}
              {(availMonths.length > 0 || availYears.length > 0) && (
                <div className="flex items-center gap-3 mb-5 flex-wrap"
                  role="group" aria-label="Filtrar por período">
                  {availMonths.length > 0 && (
                    <FilterDropdown
                      value={selMonth}
                      options={availMonths}
                      onChange={setSelMonth}
                      placeholder="Selecione um mês"
                    />
                  )}
                  {availYears.length > 0 && (
                    <FilterDropdown
                      value={selYear}
                      options={availYears}
                      onChange={setSelYear}
                      placeholder="Selecione um ano"
                    />
                  )}
                </div>
              )}

              <div className="space-y-4">
                {downloadItems.length > 0
                  ? downloadItems.map(item => <DownloadCard key={item.id} item={item} />)
                  : <Empty icon={Download}
                      title={selMonth || selYear
                        ? 'Nenhum vídeo neste período'
                        : 'Nenhum vídeo aprovado ainda'}
                      sub={selMonth || selYear
                        ? 'Selecione outro período ou remova os filtros.'
                        : 'Vídeos aprovados aparecerão aqui para download.'} />
                }
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-white/15 font-medium uppercase tracking-widest">
          T3 Studio &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <Toasts toasts={toasts} />
    </div>
  );
}
