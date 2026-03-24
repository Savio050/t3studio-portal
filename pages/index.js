import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Calendar, FileText, Check, X, Download, Clock, Film, Send, ImageIcon } from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

const STATUS_COLORS = {
  'Aprovado': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Ajuste Solicitado': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Aguardando Aprovação': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Em Produção': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  'Concluído': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

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

// Função para identificar links no texto e deixá-los clicáveis
const renderTextWithLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-colors">
          {part}
        </a>
      );
    }
    return part;
  });
};

function AccordionScript({ roteiro }) {
  const [open, setOpen] = useState(false);
  if (!roteiro) return null;
  return (
    <div className="mt-3 border-t border-white/[0.05] pt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <Film className="w-4 h-4" /> <span>Ver Roteiro</span>
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-lg bg-black/40 border border-white/[0.05] text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {renderTextWithLinks(roteiro)}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, onApprove, onReject }) {
  const status = item.estadoRoteiro || 'Pendente';
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];
  const [showInput, setShowInput] = useState(false);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="mt-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status:</span>
        <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider w-14">Data de Gravação:</span>
        <div className="flex items-center gap-1.5 text-slate-300 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" /> <span>{formatDate(item.dataGravacao)}</span>
        </div>
      </div>
      <div className="flex items-start gap-2 mb-3">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider w-14 mt-0.5">Projeto:</span>
        <div className="flex items-center gap-1.5 text-white text-base font-medium">
          <FileText className="w-4 h-4 text-slate-400" /> <span>{item.nome}</span>
        </div>
      </div>
      
      <AccordionScript roteiro={item.roteiro} />
      
      {(status === 'Pendente' || status === 'Aguardando Aprovação') && (
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          {!showInput ? (
            <div className="flex gap-2">
              <button onClick={() => onApprove('roteiro')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all">
                <Check className="w-4 h-4" /> Aprovar Roteiro
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-all">
                <X className="w-4 h-4" /> Pedir Ajuste
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-black/50 border border-amber-500/30 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="O que precisa ser ajustado no roteiro?"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject('roteiro', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-neutral-900 rounded-lg text-sm font-semibold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar Ajuste
                </button>
                <button onClick={() => setShowInput(false)} className="px-4 py-2 bg-white/[0.05] text-slate-300 rounded-lg text-sm font-medium hover:bg-white/[0.1] transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadCard({ item, onApprove, onReject }) {
  const status = item.estado || 'Pendente';
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];
  const embedUrl = getEmbedUrl(item.linkFicheiro);
  const [showInput, setShowInput] = useState(false);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
      
      {/* Container Lado a Lado: Vídeo e Capa */}
      <div className="flex gap-3 mb-4">
        {/* Esquerda: Vídeo */}
        <div className="flex-[2] flex flex-col gap-2">
          {embedUrl ? (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-white/[0.05]">
              <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
              <span className="text-xs text-slate-500">Vídeo indisponível</span>
            </div>
          )}
          {item.linkFicheiro && (
            <a href={item.linkFicheiro} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 bg-neutral-100 text-neutral-900 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-all">
              <Download className="w-3.5 h-3.5" /> Baixar Vídeo
            </a>
          )}
        </div>

        {/* Direita: Capa Vertical */}
        {item.linkCapa && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-full aspect-[9/16] rounded-lg overflow-hidden bg-black border border-white/[0.05] relative pointer-events-none">
              <iframe src={getEmbedUrl(item.linkCapa)} className="w-full h-full absolute inset-0 border-0 pointer-events-none" style={{ transform: 'scale(1.05)' }}></iframe>
            </div>
            <a href={item.linkCapa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/[0.05] text-white border border-white/[0.1] rounded-lg text-xs font-semibold hover:bg-white/[0.1] transition-all">
              <Download className="w-3.5 h-3.5" /> Capa
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 pt-3 border-t border-white/[0.05]">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status:</span>
        <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
      </div>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider w-14 mt-0.5">Projeto:</span>
        <h3 className="text-sm font-medium text-white leading-tight">{item.nome}</h3>
      </div>

      {(status === 'Aguardando Aprovação' || status === 'Pendente') && (
        <div className="mt-4">
          {!showInput ? (
            <div className="flex gap-2">
              <button onClick={() => onApprove('video')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all">
                <Check className="w-4 h-4" /> Aprovar Vídeo
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-all">
                <X className="w-4 h-4" /> Pedir Ajuste
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-black/50 border border-amber-500/30 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="O que precisamos ajustar no vídeo?"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject('video', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-neutral-900 rounded-lg text-sm font-semibold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar Ajuste
                </button>
                <button onClick={() => setShowInput(false)} className="px-4 py-2 bg-white/[0.05] text-slate-300 rounded-lg text-sm font-medium hover:bg-white/[0.1] transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('planning');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contents?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setContents(data.contents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleApprove = async (itemId, target) => {
    await fetch('/api/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target })
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, [target === 'roteiro' ? 'estadoRoteiro' : 'estado']: 'Aprovado' } : c));
  };

  const handleReject = async (itemId, target, feedbackText) => {
    if (!feedbackText.trim()) return;
    await fetch('/api/reject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, target, feedback: feedbackText })
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, [target === 'roteiro' ? 'estadoRoteiro' : 'estado']: 'Ajuste Solicitado' } : c));
  };

  const downloadItems = contents.filter(item => item.linkFicheiro || item.linkCapa);

  if (loading) {
    return (
      <div className={`min-h-screen bg-neutral-950 flex items-center justify-center ${plusJakarta.className}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-5 h-5 animate-spin" /> <span>Carregando Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-950 ${plusJakarta.className}`}>
      <Head>
        <title>T3 Studio | Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">T3 Studio</h1>
          <p className="text-sm text-slate-400 mt-0.5">Portal de Aprovações</p>
        </div>
      </header>

      <nav className="sticky top-[73px] z-40 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('planning')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'planning' ? 'text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Roteiros
            </button>
            <button onClick={() => setActiveTab('downloads')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'downloads' ? 'text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Vídeos
              {downloadItems.length > 0 && (
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{downloadItems.length}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'planning' && (
          <div className="space-y-4">
            {contents.map(item => (
              <ContentCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {contents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum projeto encontrado.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-4">
            {downloadItems.map(item => (
              <DownloadCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {downloadItems.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum vídeo disponível ainda.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
