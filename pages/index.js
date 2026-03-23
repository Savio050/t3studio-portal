import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Calendar, FileText, Check, X, Download, Clock, Film, Image as ImageIcon } from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

const STATUS_COLORS = {
  'Aprovado': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Ajuste Solicitado': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Concluído': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

// Transforma link /view do Drive em /preview para o Iframe
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    return url.replace(/\/view.*$/, '/preview');
  }
  return url;
};

function AccordionScript({ roteiro }) {
  const [open, setOpen] = useState(false);
  if (!roteiro) return null;
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <Film className="w-4 h-4" />
        <span>Ver Roteiro</span>
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          {roteiro.split('\n').map((line, i) => (
            <p key={i} className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, onApprove, onReject }) {
  const status = item.estado || 'Pendente';
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];

  return (
    <div className="mt-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        <Calendar className="w-3.5 h-3.5" /> <span>{item.dataGravacao || 'Data não definida'}</span>
      </div>
      <div className="flex items-center gap-2 text-white text-sm font-medium mb-2">
        <FileText className="w-4 h-4 text-slate-400" /> <span>{item.nome}</span>
      </div>
      <AccordionScript roteiro={item.roteiro} />
      
      {status === 'Pendente' && (
        <div className="flex gap-2 mt-4">
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-all">
            <Check className="w-4 h-4" /> Aprovar
          </button>
          <button onClick={onReject} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg text-sm font-medium hover:bg-white/[0.08] transition-all">
            <X className="w-4 h-4" /> Ajustar
          </button>
        </div>
      )}
    </div>
  );
}

function DownloadCard({ item, onApprove, onReject }) {
  const status = item.estado || 'Pendente';
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS['Pendente'];
  const embedUrl = getEmbedUrl(item.linkFicheiro);

  return (
    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
      
      {/* Iframe / Video Player */}
      {embedUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black mb-4 border border-white/[0.05]">
          <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
        <h3 className="text-sm font-medium text-white ml-2">{item.nome}</h3>
      </div>

      {/* Botões de Revisão do Vídeo */}
      {(status !== 'Aprovado' && status !== 'Concluído') && (
        <div className="flex gap-2 mb-4 pb-4 border-b border-white/[0.08]">
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all">
            <Check className="w-3.5 h-3.5" /> Aprovar Vídeo
          </button>
          <button onClick={onReject} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-all">
            <X className="w-3.5 h-3.5" /> Pedir Ajuste
          </button>
        </div>
      )}

      {/* Área de Downloads */}
      <div className="flex flex-col gap-2">
        <a href={item.linkFicheiro} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-all">
          <Download className="w-4 h-4" /> Baixar Vídeo
        </a>
        {item.linkCapa && (
          <a href={item.linkCapa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg text-sm font-medium hover:bg-white/[0.08] transition-all">
            <ImageIcon className="w-4 h-4" /> Baixar Capa
          </a>
        )}
      </div>
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

  const handleApprove = async (itemId) => {
    await fetch('/api/approve', {
      method: 'PATCH', // Corrigido de POST para PATCH
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId }) // Corrigido de id para pageId
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, estado: 'Aprovado' } : c));
  };

  const handleReject = async (itemId) => {
    const feedback = window.prompt("O que precisa ser ajustado?");
    if (feedback === null) return; // Cancela se o cliente fechar a janela
    
    await fetch('/api/reject', {
      method: 'PATCH', // Corrigido de POST para PATCH
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: itemId, feedback: feedback || 'Ajuste solicitado pelo cliente' })
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, estado: 'Ajuste Solicitado' } : c));
  };

  const downloadItems = contents.filter(item => item.linkFicheiro);

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">T3 Studio</h1>
          <p className="text-sm text-slate-400 mt-0.5">Portal do Cliente</p>
        </div>
      </header>

      <nav className="sticky top-[73px] z-40 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('planning')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'planning' ? 'text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Planejamento
            </button>
            <button onClick={() => setActiveTab('downloads')} className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'downloads' ? 'text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Downloads
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
              <ContentCard key={item.id} item={item} onApprove={() => handleApprove(item.id)} onReject={() => handleReject(item.id)} />
            ))}
            {contents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum roteiro para aprovação.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-4">
            {downloadItems.map(item => (
              <DownloadCard key={item.id} item={item} onApprove={() => handleApprove(item.id)} onReject={() => handleReject(item.id)} />
            ))}
            {downloadItems.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum vídeo disponível para download ainda.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
