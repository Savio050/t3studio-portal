import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  Calendar, FileText, Check, Film, Send, FolderKanban,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Loader2, MoreHorizontal, Image as ImageIcon,
} from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// ─── Status colour (text only – sobre fundo branco do card) ──────────────────
const STATUS_TEXT = {
  'Aprovado':             'text-green-500',
  'Ajuste Solicitado':    'text-amber-500',
  'Pendente':             'text-sky-500',
  'Aguardando Aprovação': 'text-teal-500',
  'Em Produção':          'text-violet-500',
  'Concluído':            'text-green-500',
  'Não Iniciada':         'text-slate-400',
  'Nao Iniciada':         'text-slate-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('drive.google.com')) return url.replace(/\/view.*$/, '/preview');
  return url;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2
        pointer-events-none w-[calc(100vw-2rem)] max-w-sm"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border
            animate-in slide-in-from-bottom-3 fade-in duration-300
            ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
              : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle  className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-semibold">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="px-5 py-4 flex justify-between">
        <div className="space-y-2">
          <div className="h-5 w-44 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>
      <div className="px-4 pb-4 flex gap-3">
        <div className="flex-[2] aspect-video bg-gray-200 rounded-xl" />
        <div className="flex-1 flex gap-2">
          <div className="flex-1 aspect-[9/16] bg-gray-100 rounded-xl" />
          <div className="flex-1 aspect-[9/16] bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="px-4 pb-5 flex gap-3">
        <div className="flex-1 h-12 bg-green-100 rounded-xl" />
        <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Download Card ────────────────────────────────────────────────────────────
function DownloadCard({ item, onApprove, onReject }) {
  const status      = item.estado || 'Pendente';
  const statusColor = STATUS_TEXT[status] || 'text-slate-500';
  const embedUrl    = getEmbedUrl(item.linkFicheiro);
  const isApproved  = status === 'Aprovado' || status === 'Concluído';
  const isPending   = status === 'Aguardando Aprovação' || status === 'Pendente';
  const isAdjust    = status === 'Ajuste Solicitado';
  const hasCovers   = item.linkCapa || item.linkCapa2;

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

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">

      {/* ── Card header ── */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-snug">
            {item.nome}
          </h3>
          <div className="flex items-center flex-wrap gap-3 mt-1.5">
            {item.dataGravacao && (
              <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                {formatDate(item.dataGravacao)}
              </span>
            )}
            {item.categoria && (
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {item.categoria}
              </span>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-[11px] font-black uppercase tracking-wider ${statusColor}`}>
          {status}
        </span>
      </div>

      {/* ── Media grid ── */}
      <div className="px-4 pb-4 flex gap-3">

        {/* Video – flex 2 */}
        <div className={`flex flex-col gap-2 ${hasCovers ? 'flex-[2]' : 'w-full'}`}>
          {embedUrl ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                title={`Vídeo: ${item.nome}`}
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-gray-100 flex flex-col
              items-center justify-center gap-2">
              <Film className="w-10 h-10 text-gray-300" aria-hidden="true" />
              <span className="text-xs text-gray-400 font-medium">Vídeo em produção</span>
            </div>
          )}
          {/* BAIXAR vídeo – aparece após aprovação */}
          {isApproved && item.linkFicheiro && (
            <a
              href={item.linkFicheiro}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center py-3 rounded-xl
                bg-green-500 hover:bg-green-600 text-white
                text-sm font-black uppercase tracking-widest
                active:scale-[0.98] transition-all"
            >
              BAIXAR
            </a>
          )}
        </div>

        {/* Capas – flex 1 */}
        {hasCovers && (
          <div className="flex-1 flex gap-2">
            {item.linkCapa && (
              <div className="flex-1 flex flex-col gap-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  CAPA 1
                </p>
                <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-900
                  relative pointer-events-none">
                  <iframe
                    src={getEmbedUrl(item.linkCapa)}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Capa 1"
                    style={{ transform: 'scale(1.05)' }}
                  />
                </div>
                {isApproved && (
                  <a
                    href={item.linkCapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center py-2.5 rounded-xl
                      border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
                      text-xs font-black uppercase tracking-widest
                      active:scale-[0.98] transition-all"
                  >
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
                  <iframe
                    src={getEmbedUrl(item.linkCapa2)}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Capa 2"
                    style={{ transform: 'scale(1.05)' }}
                  />
                </div>
                {isApproved && (
                  <a
                    href={item.linkCapa2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center py-2.5 rounded-xl
                      border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
                      text-xs font-black uppercase tracking-widest
                      active:scale-[0.98] transition-all"
                  >
                    BAIXAR
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ações ── */}
      {(isPending || isAdjust) && (
        <div className="px-4 pb-5">
          {/* Aguardando ajuste – informativo */}
          {isAdjust && !showInput && (
            <div className="py-3 px-4 rounded-xl bg-amber-50 border border-amber-200
              text-amber-700 text-sm font-semibold text-center">
              Ajuste solicitado — aguardando retorno da equipe
            </div>
          )}

          {/* Botões primários */}
          {isPending && !showInput && (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={submitting}
                aria-label="Aprovar vídeo"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                  bg-green-500 hover:bg-green-600 text-white
                  text-sm font-black uppercase tracking-widest
                  active:scale-[0.98] transition-all disabled:opacity-60
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Check className="w-4 h-4" aria-hidden="true" />}
                APROVAR
              </button>
              <button
                onClick={() => setShowInput(true)}
                disabled={submitting}
                aria-label="Pedir ajuste no vídeo"
                className="flex-1 flex items-center justify-center py-3.5 rounded-xl
                  border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-800
                  text-sm font-black uppercase tracking-widest
                  active:scale-[0.98] transition-all disabled:opacity-60
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                PEDIR AJUSTE
              </button>
            </div>
          )}

          {/* Formulário de ajuste */}
          {showInput && (
            <div className="flex flex-col gap-3">
              <textarea
                autoFocus
                rows={4}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="ESCREVA DETALHADAMENTE O QUE PRECISA SER AJUSTADO NO PROJETO"
                aria-label="Descrição do ajuste solicitado"
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm text-gray-700
                  placeholder-gray-300 font-medium resize-none
                  focus:outline-none focus:border-gray-400 transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={!feedback.trim() || submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                    bg-[#0d2440] hover:bg-[#0f2d52] text-white
                    text-sm font-black uppercase tracking-widest
                    active:scale-[0.98] transition-all disabled:opacity-50
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" aria-hidden="true" />}
                  ENVIAR AJUSTE
                </button>
                <button
                  onClick={() => { setShowInput(false); setFeedback(''); }}
                  className="flex-1 flex items-center justify-center py-3.5 rounded-xl
                    border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700
                    text-sm font-black uppercase tracking-widest
                    active:scale-[0.98] transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Planning tab – meses em acordeão (cards brancos) ─────────────────────────
function MonthGroup({ month, items }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full px-5 py-4 flex justify-between items-center
          hover:bg-gray-50 transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{month}</h3>
          <span className="text-xs text-gray-400 font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isOpen
          ? <ChevronUp   className="w-4 h-4 text-gray-400" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />}
      </button>

      {isOpen && (
        <ul className="border-t border-gray-100">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className={`px-5 py-4 ${idx < items.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 leading-snug">{item.nome}</h4>
                  <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                    {item.dataGravacao && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {formatDate(item.dataGravacao)}
                      </span>
                    )}
                    {item.categoria && (
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {item.categoria}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-[11px] font-black uppercase tracking-wider
                  ${STATUS_TEXT[item.estado] || 'text-slate-400'}`}>
                  {item.estado || 'Pendente'}
                </span>
              </div>

              {/* Quick-access links */}
              {(item.linkFicheiro || item.linkCapa || item.linkCapa2 || item.roteiro) && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold pt-3 border-t border-gray-100">
                  {item.roteiro && (
                    <span className={`flex items-center gap-1 ${
                      item.estadoRoteiro === 'Aprovado' ? 'text-green-500' : 'text-sky-500'}`}>
                      <FileText className="w-3 h-3" aria-hidden="true" />
                      Roteiro {item.estadoRoteiro === 'Aprovado' ? 'Aprovado' : 'Pendente'}
                    </span>
                  )}
                  {item.linkFicheiro && (
                    <a
                      href={item.linkFicheiro}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                    >
                      <Film className="w-3 h-3" aria-hidden="true" /> Vídeo
                    </a>
                  )}
                  {item.linkCapa && (
                    <a
                      href={item.linkCapa}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" aria-hidden="true" /> Capa 1
                    </a>
                  )}
                  {item.linkCapa2 && (
                    <a
                      href={item.linkCapa2}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" aria-hidden="true" /> Capa 2
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center" role="status">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10
        flex items-center justify-center">
        <Icon className="w-8 h-8 text-white/20" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-bold text-white/50">{title}</p>
        <p className="text-sm text-white/25 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { id }  = router.query;

  const [activeTab, setActiveTab] = useState('downloads');
  const [contents,  setContents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [noId,      setNoId]      = useState(false);
  const { toasts, addToast } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    if (!id) { setNoId(true); setLoading(false); return; }
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
      setContents(prev => prev.map(c =>
        c.id === itemId ? { ...c, [key]: 'Aprovado' } : c
      ));
      addToast(target === 'roteiro' ? 'Roteiro aprovado!' : 'Vídeo aprovado!', 'success');
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
      setContents(prev => prev.map(c =>
        c.id === itemId ? { ...c, [key]: 'Ajuste Solicitado' } : c
      ));
      addToast('Ajuste enviado! Nossa equipe foi notificada.', 'warning');
    } else {
      addToast('Erro ao enviar ajuste. Tente novamente.', 'error');
    }
  };

  // Itens que possuem ao menos um link de mídia
  const downloadItems = contents.filter(i =>
    i.linkFicheiro || i.linkCapa || i.linkCapa2
  );

  // Agrupamento por mês para o planning
  const groupedContents = contents.reduce((acc, item) => {
    const key = item.mesRelativo || 'Sem mês definido';
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});

  // ── Sem ID na URL ──
  if (noId) {
    return (
      <div className={`min-h-screen bg-[#071928] flex flex-col items-center justify-center px-6 ${plusJakarta.className}`}>
        <Head>
          <title>T3 Studio | Portal do Cliente</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta name="theme-color" content="#071928" />
        </Head>
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-1">T3 STUDIO</h1>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mb-10">Portal do Cliente</p>
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10
            flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white/20" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-white/70 mb-2">Link inválido</h2>
          <p className="text-sm text-white/35 leading-relaxed">
            Por favor, acesse o portal através do link fornecido pela T3 Studio.
          </p>
        </div>
      </div>
    );
  }

  // ── Carregando ──
  if (loading) {
    return (
      <div className={`min-h-screen bg-[#071928] ${plusJakarta.className}`}>
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="w-8 h-8" />
          <div className="text-center">
            <div className="h-5 w-24 bg-white/10 rounded animate-pulse mx-auto mb-1.5" />
            <div className="h-3 w-28 bg-white/5 rounded animate-pulse mx-auto" />
          </div>
          <div className="w-8 h-8" />
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-10 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // ── Portal ──
  return (
    <div className={`min-h-screen bg-[#071928] ${plusJakarta.className}`}>
      <Head>
        <title>T3 Studio | Portal do Cliente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Portal de aprovação de conteúdos T3 Studio" />
        <meta name="theme-color" content="#071928" />
      </Head>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#071928]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Hamburger */}
          <button
            aria-label="Menu"
            className="w-8 h-8 flex flex-col gap-[5px] items-start justify-center
              opacity-60 hover:opacity-100 transition-opacity
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-3.5 h-[2px] bg-white rounded-full" />
          </button>

          {/* Logotipo central */}
          <div className="text-center select-none">
            <p className="text-[17px] font-black text-white uppercase tracking-[0.22em]">
              T3 STUDIO
            </p>
            <p className="text-[9px] font-bold text-white/35 uppercase tracking-[0.28em] mt-0.5">
              Portal do Cliente
            </p>
          </div>

          {/* Dots menu */}
          <button
            aria-label="Mais opções"
            className="w-8 h-8 flex items-center justify-center
              opacity-60 hover:opacity-100 transition-opacity
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <MoreHorizontal className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav
        className="sticky top-[65px] z-40 bg-[#071928]/95 backdrop-blur-xl border-b border-white/5"
        role="tablist"
        aria-label="Seções do portal"
      >
        <div className="max-w-3xl mx-auto flex">
          {[
            { key: 'planning',  label: 'Planejamento' },
            { key: 'downloads', label: 'Downloads'    },
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.18em]
                border-b-2 transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30
                ${activeTab === key
                  ? 'text-white border-white'
                  : 'text-white/30 border-transparent hover:text-white/60'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Conteúdo ── */}
      <main className="max-w-3xl mx-auto px-4 py-5 pb-20">

        {/* Downloads */}
        <section
          id="panel-downloads"
          role="tabpanel"
          aria-labelledby="tab-downloads"
          hidden={activeTab !== 'downloads'}
        >
          {activeTab === 'downloads' && (
            <div className="space-y-4">
              {downloadItems.length > 0
                ? downloadItems.map(item => (
                    <DownloadCard
                      key={item.id}
                      item={item}
                      onApprove={t => handleApprove(item.id, t)}
                      onReject={(t, txt) => handleReject(item.id, t, txt)}
                    />
                  ))
                : <EmptyState
                    icon={Film}
                    title="Nenhum vídeo disponível"
                    subtitle="Seus vídeos aparecerão aqui quando estiverem prontos."
                  />
              }
            </div>
          )}
        </section>

        {/* Planejamento */}
        <section
          id="panel-planning"
          role="tabpanel"
          aria-labelledby="tab-planning"
          hidden={activeTab !== 'planning'}
        >
          {activeTab === 'planning' && (
            <div className="space-y-4">
              {Object.keys(groupedContents).length > 0
                ? Object.entries(groupedContents).map(([month, items]) => (
                    <MonthGroup key={month} month={month} items={items} />
                  ))
                : <EmptyState
                    icon={FolderKanban}
                    title="Nenhum planejamento disponível"
                    subtitle="O planejamento do seu conteúdo aparecerá aqui."
                  />
              }
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 text-center">
        <p className="text-xs text-white/15 font-medium uppercase tracking-widest">
          T3 Studio &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
