import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  Calendar, FileText, Check, X, Download, Clock, Film, Send,
  FolderKanban, Tag, Image as ImageIcon, ChevronDown, ChevronUp,
  Filter, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// ─── Status colour system ────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Aprovado':              'text-[#00D670] bg-[#00D670]/10 border-[#00D670]/30',
  'Ajuste Solicitado':     'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente':              'text-sky-400 bg-sky-400/10 border-sky-400/30',
  'Aguardando Aprovação':  'text-sky-400 bg-sky-400/10 border-sky-400/30',
  'Em Produção':           'text-violet-400 bg-violet-400/10 border-violet-400/30',
  'Concluído':             'text-slate-400 bg-slate-400/10 border-slate-400/30',
  'Não Iniciada':          'text-slate-500 bg-slate-500/10 border-slate-500/30',
  'Nao Iniciada':          'text-slate-500 bg-slate-500/10 border-slate-500/30',
};

const TOP_ACCENT = {
  'Aprovado':             'bg-gradient-to-r from-[#00D670]/40 via-[#00D670]/70 to-[#00D670]/40',
  'Ajuste Solicitado':    'bg-gradient-to-r from-amber-500/40 via-amber-400/70 to-amber-500/40',
  'Pendente':             'bg-gradient-to-r from-sky-500/40 via-sky-400/70 to-sky-500/40',
  'Aguardando Aprovação': 'bg-gradient-to-r from-sky-500/40 via-sky-400/70 to-sky-500/40',
  'Em Produção':          'bg-gradient-to-r from-violet-500/40 via-violet-400/70 to-violet-500/40',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('drive.google.com')) return url.replace(/\/view.*$/, '/preview');
  return url;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Não definida';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

const renderTextWithLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    part.match(urlRegex)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
           className="text-[#00D670] hover:text-[#00e079] underline underline-offset-2 transition-colors break-all">{part}</a>
      : part
  );
};

// ─── Toast system ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2.5 pointer-events-none w-[calc(100vw-2rem)] max-w-sm"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl
            animate-in slide-in-from-bottom-3 fade-in duration-300
            ${t.type === 'success' ? 'bg-[#00D670]/10 border-[#00D670]/30 text-[#00D670]'
            : t.type === 'warning'  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            :                         'bg-red-500/10 border-red-500/30 text-red-400'}`}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-semibold">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#0A1622] border border-[#15283A] p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-5 w-24 bg-[#15283A] rounded-full" />
        <div className="h-5 w-16 bg-[#15283A] rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-[#15283A] rounded-lg mb-3" />
      <div className="h-4 w-1/3 bg-[#15283A] rounded-md mb-4" />
      <div className="h-11 w-full bg-[#15283A] rounded-xl" />
    </div>
  );
}

function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 rounded-2xl bg-[#0A1622] border border-[#15283A] animate-pulse">
          <div className="h-7 w-10 bg-[#15283A] rounded mb-2" />
          <div className="h-3 w-full bg-[#15283A] rounded mb-2" />
          <div className="h-1 w-full bg-[#15283A] rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ contents }) {
  if (contents.length === 0) return null;

  const totalScripts  = contents.filter(c => c.roteiro).length;
  const approvedScripts = contents.filter(c => ['Aprovado', 'Concluído'].includes(c.estadoRoteiro)).length;
  const totalVideos   = contents.filter(c => c.linkFicheiro || c.linkCapa || c.linkCapa2).length;
  const approvedVideos = contents.filter(c => c.estado === 'Aprovado').length;
  const pendingActions = contents.filter(c =>
    ['Pendente', 'Aguardando Aprovação'].includes(c.estadoRoteiro) ||
    ['Pendente', 'Aguardando Aprovação'].includes(c.estado)
  ).length;

  const scriptPct = totalScripts  > 0 ? (approvedScripts  / totalScripts)  * 100 : 0;
  const videoPct  = totalVideos   > 0 ? (approvedVideos   / totalVideos)   * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6" aria-label="Resumo do portal">
      <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#0A1622] border border-[#15283A]">
        <span className="text-2xl font-black text-white tabular-nums">{approvedScripts}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Roteiros Aprovados</span>
        <div className="mt-1.5 h-1 rounded-full bg-[#15283A] overflow-hidden">
          <div className="h-full bg-[#00D670] rounded-full transition-all duration-500" style={{ width: `${scriptPct}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#0A1622] border border-[#15283A]">
        <span className="text-2xl font-black text-white tabular-nums">{approvedVideos}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Vídeos Aprovados</span>
        <div className="mt-1.5 h-1 rounded-full bg-[#15283A] overflow-hidden">
          <div className="h-full bg-[#00D670] rounded-full transition-all duration-500" style={{ width: `${videoPct}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[#0A1622] border border-[#15283A]">
        <span className={`text-2xl font-black tabular-nums ${pendingActions > 0 ? 'text-sky-400' : 'text-[#00D670]'}`}>
          {pendingActions}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
          {pendingActions > 0 ? 'Aguardando' : 'Em Dia'}
        </span>
        <span className="text-[10px] text-slate-600 leading-tight">
          {pendingActions > 0 ? 'sua aprovação' : 'tudo aprovado'}
        </span>
      </div>
    </div>
  );
}

// ─── Accordion for script text ────────────────────────────────────────────────
function AccordionScript({ roteiro }) {
  const [open, setOpen] = useState(false);
  if (!roteiro) return null;
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#03090F] border border-[#15283A]
          rounded-xl text-sm text-slate-300 hover:text-white hover:border-[#1e3a52]
          transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D670]"
      >
        <span className="flex items-center gap-2 font-semibold">
          <FileText className="w-4 h-4 text-[#00D670]" aria-hidden="true" />
          Ver Roteiro Completo
        </span>
        {open
          ? <ChevronUp  className="w-4 h-4 text-slate-500" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />}
      </button>
      {open && (
        <div className="mt-2 p-4 rounded-xl bg-[#03090F]/60 border border-[#15283A]/60
          text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {renderTextWithLinks(roteiro)}
        </div>
      )}
    </div>
  );
}

// ─── Content card (Roteiros) ──────────────────────────────────────────────────
function ContentCard({ item, onApprove, onReject }) {
  const status    = item.estadoRoteiro || 'Pendente';
  const colorCls  = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];
  const accentCls = TOP_ACCENT[status] || TOP_ACCENT['Pendente'];
  const isPending = status === 'Pendente' || status === 'Aguardando Aprovação';

  const [showInput, setShowInput] = useState(false);
  const [feedback,  setFeedback]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    await onApprove('roteiro');
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    await onReject('roteiro', feedback);
    setShowInput(false);
    setFeedback('');
    setSubmitting(false);
  };

  return (
    <article className="rounded-2xl bg-[#0A1622] border border-[#15283A] shadow-xl overflow-hidden
      transition-colors hover:border-[#1e3a52]">
      {/* Top accent line */}
      <div className={`h-[3px] w-full ${accentCls}`} aria-hidden="true" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black
            tracking-widest uppercase ${colorCls}`}>
            {status}
          </span>
          {item.categoria && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#03090F] rounded-full
              border border-[#15283A] text-slate-400 text-[10px] font-bold tracking-wider uppercase">
              <Tag className="w-2.5 h-2.5" aria-hidden="true" /> {item.categoria}
            </span>
          )}
        </div>

        {/* Title & date */}
        <h3 className="text-[17px] font-bold text-white leading-snug mb-2">{item.nome}</h3>
        {item.dataGravacao && (
          <p className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            {formatDate(item.dataGravacao)}
          </p>
        )}

        <AccordionScript roteiro={item.roteiro} />

        {/* Actions */}
        {isPending && (
          <div className="mt-5 pt-5 border-t border-[#15283A]">
            {!showInput ? (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  aria-label="Aprovar roteiro"
                  className="flex-1 flex items-center justify-center gap-2 py-3
                    bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold
                    hover:bg-[#00e679] active:scale-[0.98] transition-all
                    shadow-[0_0_20px_rgba(0,214,112,0.15)]
                    disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D670]"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" aria-hidden="true" />}
                  Aprovar
                </button>
                <button
                  onClick={() => setShowInput(true)}
                  disabled={submitting}
                  aria-label="Solicitar ajuste no roteiro"
                  className="flex-1 flex items-center justify-center gap-2 py-3
                    border border-[#15283A] text-slate-300 rounded-xl text-sm font-semibold
                    hover:bg-[#112333] hover:border-[#1e3a52] active:scale-[0.98] transition-all
                    disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <X className="w-4 h-4" aria-hidden="true" /> Ajustar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  autoFocus
                  rows={3}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Descreva o que precisa ser ajustado no roteiro..."
                  aria-label="Feedback sobre o roteiro"
                  className="w-full bg-[#010408] border border-amber-500/30 rounded-xl p-3.5
                    text-sm text-white placeholder-slate-600 resize-none
                    focus:outline-none focus:border-amber-400 transition-colors"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={!feedback.trim() || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3
                      bg-amber-500 text-neutral-900 rounded-xl text-sm font-bold
                      hover:bg-amber-400 active:scale-[0.98] transition-all
                      disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {submitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" aria-hidden="true" />}
                    Enviar Ajuste
                  </button>
                  <button
                    onClick={() => { setShowInput(false); setFeedback(''); }}
                    className="px-5 py-3 border border-[#15283A] text-slate-400 rounded-xl
                      text-sm font-medium hover:bg-[#112333] transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Download card (Vídeos) ───────────────────────────────────────────────────
function DownloadCard({ item, onApprove, onReject }) {
  const status    = item.estado || 'Pendente';
  const colorCls  = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];
  const accentCls = TOP_ACCENT[status] || TOP_ACCENT['Pendente'];
  const embedUrl  = getEmbedUrl(item.linkFicheiro);
  const isPending = ['Aguardando Aprovação', 'Pendente', 'Ajuste Solicitado'].includes(status);

  const [showInput,  setShowInput]  = useState(false);
  const [feedback,   setFeedback]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    await onApprove('video');
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    await onReject('video', feedback);
    setShowInput(false);
    setFeedback('');
    setSubmitting(false);
  };

  const hasCovers = item.linkCapa || item.linkCapa2;

  return (
    <article className="rounded-2xl bg-[#0A1622] border border-[#15283A] shadow-xl overflow-hidden
      transition-colors hover:border-[#1e3a52]">
      <div className={`h-[3px] w-full ${accentCls}`} aria-hidden="true" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black
            tracking-widest uppercase ${colorCls}`}>
            {status}
          </span>
          {item.categoria && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#03090F] rounded-full
              border border-[#15283A] text-slate-400 text-[10px] font-bold tracking-wider uppercase">
              <Tag className="w-2.5 h-2.5" aria-hidden="true" /> {item.categoria}
            </span>
          )}
        </div>

        <h3 className="text-[17px] font-bold text-white leading-snug mb-2">{item.nome}</h3>
        {item.dataGravacao && (
          <p className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-4">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            {formatDate(item.dataGravacao)}
          </p>
        )}

        {/* Media grid – vídeo + capas */}
        <div className={`flex gap-4 ${hasCovers ? 'flex-col md:flex-row' : ''}`}>
          {/* Vídeo */}
          <div className={`flex flex-col gap-3 ${hasCovers ? 'flex-[2]' : 'w-full'}`}>
            {embedUrl ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-[#15283A]">
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  title={`Vídeo: ${item.nome}`}
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-[#03090F] border border-[#15283A]/50
                flex flex-col items-center justify-center gap-2">
                <Film className="w-10 h-10 text-slate-700" aria-hidden="true" />
                <span className="text-xs text-slate-600 font-medium">Vídeo em produção</span>
              </div>
            )}
            {item.linkFicheiro && (
              <a
                href={item.linkFicheiro}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3
                  bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold
                  hover:bg-[#00e679] active:scale-[0.99] transition-all
                  shadow-[0_0_20px_rgba(0,214,112,0.15)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D670]"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Baixar Vídeo
              </a>
            )}
          </div>

          {/* Capas */}
          {hasCovers && (
            <div className="flex md:flex-col flex-row gap-3 flex-1">
              {item.linkCapa && (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-black
                    border border-[#15283A] relative pointer-events-none">
                    <iframe
                      src={getEmbedUrl(item.linkCapa)}
                      className="w-full h-full absolute inset-0 border-0"
                      title="Capa 1"
                      style={{ transform: 'scale(1.05)' }}
                    />
                  </div>
                  <a
                    href={item.linkCapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5
                      border border-[#15283A] text-slate-300 rounded-xl text-xs font-semibold
                      hover:bg-[#112333] transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Capa 1
                  </a>
                </div>
              )}
              {item.linkCapa2 && (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-black
                    border border-[#15283A] relative pointer-events-none">
                    <iframe
                      src={getEmbedUrl(item.linkCapa2)}
                      className="w-full h-full absolute inset-0 border-0"
                      title="Capa 2"
                      style={{ transform: 'scale(1.05)' }}
                    />
                  </div>
                  <a
                    href={item.linkCapa2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5
                      border border-[#15283A] text-slate-300 rounded-xl text-xs font-semibold
                      hover:bg-[#112333] transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Capa 2
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="mt-5 pt-5 border-t border-[#15283A]">
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Revise o vídeo acima e confirme sua aprovação ou solicite os ajustes necessários.
            </p>
            {!showInput ? (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  aria-label="Aprovar vídeo"
                  className="flex-1 flex items-center justify-center gap-2 py-3
                    bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold
                    hover:bg-[#00e679] active:scale-[0.98] transition-all
                    shadow-[0_0_20px_rgba(0,214,112,0.15)]
                    disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D670]"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" aria-hidden="true" />}
                  Aprovar Vídeo
                </button>
                <button
                  onClick={() => setShowInput(true)}
                  disabled={submitting}
                  aria-label="Solicitar ajuste no vídeo"
                  className="flex-1 flex items-center justify-center gap-2 py-3
                    border border-[#15283A] text-slate-300 rounded-xl text-sm font-semibold
                    hover:bg-[#112333] hover:border-[#1e3a52] active:scale-[0.98] transition-all
                    disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <X className="w-4 h-4" aria-hidden="true" /> Pedir Ajuste
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  autoFocus
                  rows={3}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Descreva detalhadamente o que precisa ser ajustado no vídeo..."
                  aria-label="Feedback sobre o vídeo"
                  className="w-full bg-[#010408] border border-amber-500/30 rounded-xl p-3.5
                    text-sm text-white placeholder-slate-600 resize-none
                    focus:outline-none focus:border-amber-400 transition-colors"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={!feedback.trim() || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3
                      bg-amber-500 text-neutral-900 rounded-xl text-sm font-bold
                      hover:bg-amber-400 active:scale-[0.98] transition-all
                      disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {submitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" aria-hidden="true" />}
                    Enviar Ajuste
                  </button>
                  <button
                    onClick={() => { setShowInput(false); setFeedback(''); }}
                    className="px-5 py-3 border border-[#15283A] text-slate-400 rounded-xl
                      text-sm font-medium hover:bg-[#112333] transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Planning helpers ─────────────────────────────────────────────────────────
function ScriptStatusBadge({ item }) {
  if (!item.roteiro)
    return <span className="text-slate-600 flex items-center gap-1"><FileText className="w-3 h-3" aria-hidden="true" /> Sem Roteiro</span>;
  if (['Aprovado', 'Concluído'].includes(item.estadoRoteiro))
    return <span className="text-[#00D670]/80 flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" /> Aprovado</span>;
  if (item.estadoRoteiro === 'Ajuste Solicitado')
    return <span className="text-amber-400/80 flex items-center gap-1"><X className="w-3 h-3" aria-hidden="true" /> Ajuste</span>;
  return <span className="text-sky-400/80 flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> Pendente</span>;
}

function MonthGroup({ month, items }) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = items.filter(i =>
    ['Pendente', 'Aguardando Aprovação'].includes(i.estadoRoteiro) ||
    ['Pendente', 'Aguardando Aprovação'].includes(i.estado)
  ).length;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#15283A] bg-[#0A1622] shadow-lg">
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full bg-[#0D1C2A] hover:bg-[#112333] transition-colors px-5 py-4
          flex justify-between items-center border-b border-[#15283A]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D670]"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-[15px] font-bold text-white tracking-wide">{month}</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400
              text-[10px] font-bold border border-sky-500/20">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-slate-600">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isOpen
          ? <ChevronUp   className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />}
      </button>

      {isOpen && (
        <ul>
          {items.map((item, idx) => (
            <li
              key={item.id}
              className={`flex flex-col gap-2 p-5 hover:bg-[#112333]/30 transition-colors
                ${idx < items.length - 1 ? 'border-b border-[#15283A]' : ''}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-white leading-snug truncate">{item.nome}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      {formatDate(item.dataGravacao)}
                    </span>
                    {item.categoria && (
                      <>
                        <span className="w-px h-3 bg-[#15283A]" aria-hidden="true" />
                        <span className="text-slate-400">{item.categoria}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-[10px]
                  font-bold uppercase tracking-wider ${STATUS_COLORS[item.estado] || STATUS_COLORS['Pendente']}`}>
                  {item.estado || 'Pendente'}
                </span>
              </div>

              {/* Quick-access links */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#15283A]/50 text-xs font-semibold">
                <ScriptStatusBadge item={item} />
                <span className="w-px h-3 bg-[#15283A]" aria-hidden="true" />
                {item.linkFicheiro
                  ? <a href={item.linkFicheiro} target="_blank" rel="noreferrer"
                       className="text-[#00D670]/80 hover:text-[#00D670] flex items-center gap-1 transition-colors">
                      <Film className="w-3 h-3" aria-hidden="true" /> Baixar Vídeo
                    </a>
                  : <span className="text-slate-600 flex items-center gap-1">
                      <Film className="w-3 h-3" aria-hidden="true" /> Sem Vídeo
                    </span>
                }
                {item.linkCapa && (
                  <><span className="w-px h-3 bg-[#15283A]" aria-hidden="true" />
                  <a href={item.linkCapa} target="_blank" rel="noreferrer"
                     className="text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                    <ImageIcon className="w-3 h-3" aria-hidden="true" /> Capa 1
                  </a></>
                )}
                {item.linkCapa2 && (
                  <><span className="w-px h-3 bg-[#15283A]" aria-hidden="true" />
                  <a href={item.linkCapa2} target="_blank" rel="noreferrer"
                     className="text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                    <ImageIcon className="w-3 h-3" aria-hidden="true" /> Capa 2
                  </a></>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border
        focus-visible:outline-none focus-visible:ring-2
        ${active
          ? 'bg-[#00D670] text-[#020A10] border-[#00D670] shadow-[0_0_15px_rgba(0,214,112,0.2)] focus-visible:ring-[#00D670]'
          : 'bg-[#0D1C2A] text-slate-400 border-[#15283A] hover:bg-[#112333] hover:text-white focus-visible:ring-slate-500'
        }`}
    >
      {children}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-20 flex flex-col items-center gap-4" role="status">
      <div className="w-16 h-16 rounded-2xl bg-[#0A1622] border border-[#15283A]
        flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-700" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-bold text-slate-400">{title}</p>
        <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { id } = router.query;

  const [activeTab,     setActiveTab]     = useState('planning');
  const [contents,      setContents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [noId,          setNoId]          = useState(false);
  const [roteiroFilter, setRoteiroFilter] = useState('Todos');
  const [videoFilter,   setVideoFilter]   = useState('Todos');
  const { toasts, addToast } = useToast();

  useEffect(() => {
    // Aguarda o router do Next.js terminar de hidratar a query string
    if (!router.isReady) return;

    // URL sem ?id= — exibe mensagem em vez de ficar no skeleton infinito
    if (!id) {
      setNoId(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/contents?id=${id}`)
      .then(r => r.json())
      .then(data => { setContents(data.contents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router.isReady, id]);

  const handleApprove = async (itemId, target) => {
    const res = await fetch('/api/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target }),
    });
    if (res.ok) {
      const key = target === 'roteiro' ? 'estadoRoteiro' : 'estado';
      setContents(prev => prev.map(c => c.id === itemId ? { ...c, [key]: 'Aprovado' } : c));
      addToast(
        target === 'roteiro' ? 'Roteiro aprovado com sucesso!' : 'Vídeo aprovado com sucesso!',
        'success'
      );
    } else {
      addToast('Erro ao aprovar. Tente novamente.', 'error');
    }
  };

  const handleReject = async (itemId, target, feedbackText) => {
    if (!feedbackText.trim()) return;
    const res = await fetch('/api/reject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target, feedback: feedbackText }),
    });
    if (res.ok) {
      const key = target === 'roteiro' ? 'estadoRoteiro' : 'estado';
      setContents(prev => prev.map(c => c.id === itemId ? { ...c, [key]: 'Ajuste Solicitado' } : c));
      addToast('Ajuste enviado! Nossa equipe foi notificada.', 'warning');
    } else {
      addToast('Erro ao enviar ajuste. Tente novamente.', 'error');
    }
  };

  // ── Derived lists ──
  const DONE_STATUSES = ['conclu', 'iniciada'];
  const isDone = (status = '') => DONE_STATUSES.some(s => status.toLowerCase().includes(s));

  let activeScripts = contents.filter(i => !isDone(i.estadoRoteiro));
  let activeVideos  = contents.filter(i =>
    (i.linkFicheiro || i.linkCapa || i.linkCapa2) && !isDone(i.estado)
  );

  const PENDING_S = ['Pendente', 'Aguardando Aprovação', 'Ajuste Solicitado'];
  const PENDING_V = [...PENDING_S, 'Em Produção'];

  if (roteiroFilter === 'Pendentes') activeScripts = activeScripts.filter(i => PENDING_S.includes(i.estadoRoteiro));
  if (roteiroFilter === 'Aprovados') activeScripts = activeScripts.filter(i => i.estadoRoteiro === 'Aprovado');
  if (videoFilter   === 'Pendentes') activeVideos  = activeVideos.filter(i => PENDING_V.includes(i.estado));
  if (videoFilter   === 'Aprovados') activeVideos  = activeVideos.filter(i => i.estado === 'Aprovado');

  const pendingScripts = contents.filter(i => ['Pendente', 'Aguardando Aprovação'].includes(i.estadoRoteiro)).length;
  const pendingVideos  = contents.filter(i =>
    (i.linkFicheiro || i.linkCapa || i.linkCapa2) &&
    ['Pendente', 'Aguardando Aprovação'].includes(i.estado)
  ).length;

  const groupedContents = contents.reduce((acc, item) => {
    const key = item.mesRelativo || 'Sem mês definido';
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});

  const TAB_CONFIG = [
    { key: 'planning',  label: 'Roteiros',      icon: FileText,    badge: pendingScripts },
    { key: 'downloads', label: 'Vídeos',         icon: Film,        badge: pendingVideos  },
    { key: 'calendar',  label: 'Planejamento',   icon: FolderKanban, badge: 0 },
  ];

  // ── Sem ID na URL ──
  if (noId) {
    return (
      <div className={`min-h-screen bg-[#03090F] flex flex-col items-center justify-center px-6 ${plusJakarta.className}`}>
        <Head>
          <title>T3 Studio | Portal do Cliente</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta name="theme-color" content="#03090F" />
        </Head>
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-2xl font-black text-white tracking-tight">T3</span>
            <span className="w-2 h-2 rounded-full bg-[#00D670]" aria-hidden="true" />
            <span className="text-slate-400 font-light text-lg">Studio</span>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[#0A1622] border border-[#15283A] flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-slate-700" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Link inválido</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Este link não contém um ID de cliente. Por favor, acesse o portal através do link fornecido pela T3 Studio.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className={`min-h-screen bg-[#03090F] ${plusJakarta.className}`}>
        <header className="border-b border-[#15283A] px-5 py-4 max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="h-7 w-20 bg-[#15283A] rounded-lg animate-pulse mb-1.5" />
            <div className="h-3 w-28 bg-[#15283A] rounded animate-pulse" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <StatsBarSkeleton />
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className={`min-h-screen bg-[#03090F] ${plusJakarta.className} selection:bg-[#00D670]/20 selection:text-white`}>
      <Head>
        <title>T3 Studio | Portal do Cliente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Portal de aprovação de conteúdos T3 Studio" />
        <meta name="theme-color" content="#03090F" />
      </Head>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#15283A] bg-[#03090F]/95 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-tight">T3</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D670] mb-0.5 shrink-0" aria-hidden="true" />
              <span className="text-slate-400 font-light text-base">Studio</span>
            </div>
            <p className="text-[10px] text-[#00D670]/70 font-bold tracking-widest uppercase mt-0.5">
              Portal do Cliente
            </p>
          </div>
          {id && (
            <div className="px-3 py-1.5 rounded-xl bg-[#0A1622] border border-[#15283A]" aria-label={`Cliente: ${id}`}>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{id}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <nav
        className="sticky top-[69px] z-40 border-b border-[#15283A] bg-[#03090F]/95 backdrop-blur-xl"
        role="tablist"
        aria-label="Seções do portal"
      >
        <div className="max-w-2xl mx-auto px-1">
          <div className="flex overflow-x-auto no-scrollbar">
            {TAB_CONFIG.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                aria-controls={`panel-${key}`}
                id={`tab-${key}`}
                onClick={() => setActiveTab(key)}
                className={`relative whitespace-nowrap flex-1 px-3 py-4 text-[13px] font-bold
                  transition-all border-b-2 flex items-center justify-center gap-2
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D670]
                  ${activeTab === key
                    ? 'text-[#00D670] border-[#00D670]'
                    : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
                {badge > 0 && (
                  <span
                    aria-label={`${badge} pendente${badge > 1 ? 's' : ''}`}
                    className="w-4 h-4 flex items-center justify-center rounded-full
                      bg-sky-500 text-white text-[9px] font-black"
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20" id="main-content">
        <StatsBar contents={contents} />

        {/* Roteiros */}
        <section
          id="panel-planning"
          role="tabpanel"
          aria-labelledby="tab-planning"
          hidden={activeTab !== 'planning'}
        >
          {activeTab === 'planning' && (
            <>
              <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
                <Filter className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                <FilterPill active={roteiroFilter === 'Todos'}    onClick={() => setRoteiroFilter('Todos')}>Todos</FilterPill>
                <FilterPill active={roteiroFilter === 'Pendentes'} onClick={() => setRoteiroFilter('Pendentes')}>Pendentes</FilterPill>
                <FilterPill active={roteiroFilter === 'Aprovados'} onClick={() => setRoteiroFilter('Aprovados')}>Aprovados</FilterPill>
              </div>
              <div className="space-y-4">
                {activeScripts.length > 0
                  ? activeScripts.map(item => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onApprove={t => handleApprove(item.id, t)}
                        onReject={(t, txt) => handleReject(item.id, t, txt)}
                      />
                    ))
                  : <EmptyState
                      icon={FileText}
                      title="Nenhum roteiro encontrado"
                      subtitle={roteiroFilter !== 'Todos'
                        ? 'Tente remover os filtros aplicados.'
                        : 'Seus roteiros aparecerão aqui quando estiverem prontos.'}
                    />
                }
              </div>
            </>
          )}
        </section>

        {/* Vídeos */}
        <section
          id="panel-downloads"
          role="tabpanel"
          aria-labelledby="tab-downloads"
          hidden={activeTab !== 'downloads'}
        >
          {activeTab === 'downloads' && (
            <>
              <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
                <Filter className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                <FilterPill active={videoFilter === 'Todos'}     onClick={() => setVideoFilter('Todos')}>Todos</FilterPill>
                <FilterPill active={videoFilter === 'Pendentes'} onClick={() => setVideoFilter('Pendentes')}>Pendentes</FilterPill>
                <FilterPill active={videoFilter === 'Aprovados'} onClick={() => setVideoFilter('Aprovados')}>Aprovados</FilterPill>
              </div>
              <div className="space-y-4">
                {activeVideos.length > 0
                  ? activeVideos.map(item => (
                      <DownloadCard
                        key={item.id}
                        item={item}
                        onApprove={t => handleApprove(item.id, t)}
                        onReject={(t, txt) => handleReject(item.id, t, txt)}
                      />
                    ))
                  : <EmptyState
                      icon={Film}
                      title="Nenhum vídeo encontrado"
                      subtitle={videoFilter !== 'Todos'
                        ? 'Tente remover os filtros aplicados.'
                        : 'Seus vídeos aparecerão aqui quando estiverem prontos.'}
                    />
                }
              </div>
            </>
          )}
        </section>

        {/* Planejamento */}
        <section
          id="panel-calendar"
          role="tabpanel"
          aria-labelledby="tab-calendar"
          hidden={activeTab !== 'calendar'}
        >
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              {Object.keys(groupedContents).length > 0
                ? Object.entries(groupedContents).map(([month, items]) => (
                    <MonthGroup key={month} month={month} items={items} />
                  ))
                : <EmptyState
                    icon={FolderKanban}
                    title="Nenhum conteúdo planejado"
                    subtitle="O planejamento do seu conteúdo aparecerá aqui."
                  />
              }
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#15283A] py-6">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="text-xs text-slate-700 font-medium">
            T3 Studio &copy; {new Date().getFullYear()} &mdash; Portal do Cliente
          </p>
        </div>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
