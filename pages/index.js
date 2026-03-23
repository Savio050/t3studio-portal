import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Calendar, FileText, Check, X, Download, Clock, Film } from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

const STATUS_COLORS = {
  'Aprovado': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Ajuste Solicitado': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Concluído': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

function AccordionScript({ roteiro }) {
  const [open, setOpen] = useState(false);

  if (!roteiro) return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
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
    <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
      <div className="flex items-center gap-2 mb-2">
        <div className={`px-2 py-0.5 rounded-md border text-xs font-medium ${colorClass}`}>
          {status}
        </div>
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        <Calendar className="w-3 h-3" />
        <span>{item.dataGravacao}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <FileText className="w-3 h-3" />
        <span>{item.nome}</span>
      </div>
      <AccordionScript roteiro={item.roteiro} />
      {status === 'Pendente' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-xs font-medium hover:bg-neutral-200 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aprovar</span>
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg text-xs font-medium hover:bg-white/[0.05] transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rejeitar</span>
          </button>
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

  const handleApprove = async (itemId) => {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId })
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, status: 'Aprovado' } : c));
  };

  const handleReject = async (itemId) => {
    await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId })
    });
    setContents(prev => prev.map(c => c.id === itemId ? { ...c, status: 'Ajuste Solicitado' } : c));
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-neutral-950 flex items-center justify-center ${plusJakarta.className}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-950 ${plusJakarta.className}`}>
      <Head>
        <title>T3 Studio Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">T3 Studio</h1>
          <p className="text-sm text-slate-400 mt-0.5">Portal de Aprovação</p>
        </div>
      </header>

      <nav className="sticky top-[73px] z-40 border-b border-white/[0.08] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === 'planning'
                  ? 'text-white border-b-2 border-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Planejamento
            </button>
            <button
              onClick={() => setActiveTab('downloads')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === 'downloads'
                  ? 'text-white border-b-2 border-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Downloads
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'planning' && (
          <div className="space-y-4">
            {contents.map(item => (
              <ContentCard
                key={item.id}
                item={item}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
              />
            ))}
            {contents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum conteúdo disponível</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="grid gap-3">
            <a
              href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.08] transition-all">
                <Download className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Arquivos do Projeto</h3>
                <p className="text-xs text-slate-400 mt-0.5">Acesse o Google Drive</p>
              </div>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
