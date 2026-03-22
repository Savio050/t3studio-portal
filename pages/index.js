import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const STATUS_COLORS = {
  'Aprovado': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Ajuste Solicitado': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Concluido': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
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
        <span>{open ? '\u25BC' : '\u25B6'}</span>
        <span>Ver Guiao / Roteiro</span>
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {roteiro}
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, onApprove, onReject }) {
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [localStatus, setLocalStatus] = useState(item.estado);

  const handleApprove = async () => {
    setLoadingApprove(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: item.id }),
      });
      if (res.ok) {
        setLocalStatus('Aprovado');
        onApprove && onApprove(item.id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingApprove(false);
  };

  const handleReject = async () => {
    if (!feedback.trim()) return;
    setLoadingReject(true);
    try {
      const res = await fetch('/api/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: item.id, feedback }),
      });
      if (res.ok) {
        setLocalStatus('Ajuste Solicitado');
        setShowFeedback(false);
        setFeedback('');
        onReject && onReject(item.id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingReject(false);
  };

  const statusColor = STATUS_COLORS[localStatus] || STATUS_COLORS['Pendente'];
  const isFinalized = localStatus === 'Aprovado' || localStatus === 'Ajuste Solicitado';

  return (
    <div className="relative pl-6">
      <div className="absolute left-0 top-4 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 z-10" />
      <div className="absolute left-1.5 top-4 bottom-0 w-px bg-slate-700" />
      <div className="glass rounded-2xl p-4 mb-4 ml-2">
        {item.dataGravacao && (
          <div className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">
            {new Date(item.dataGravacao + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-100 text-base leading-snug flex-1">{item.nome}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusColor}`}>
            {localStatus}
          </span>
        </div>
        <AccordionScript roteiro={item.roteiro} />
        {!isFinalized && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={handleApprove}
              disabled={loadingApprove}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95 disabled:opacity-50"
            >
              {loadingApprove ? 'Aprovando...' : '\u2705 Aprovar'}
            </button>
            {!showFeedback ? (
              <button
                onClick={() => setShowFeedback(true)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95"
              >
                \u270D\uFE0F Solicitar Ajuste
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Descreva o ajuste necessario..."
                  rows={3}
                  className="w-full bg-slate-800/70 border border-slate-600/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={loadingReject || !feedback.trim()}
                    className="flex-1 py-2 px-3 rounded-xl font-semibold text-sm bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {loadingReject ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button
                    onClick={() => { setShowFeedback(false); setFeedback(''); }}
                    className="py-2 px-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-600/50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {isFinalized && localStatus === 'Ajuste Solicitado' && item.feedbackCliente && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-300">Feedback: {item.feedbackCliente}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadCard({ item }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">
          \uD83C\uDFA5
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 text-sm leading-snug truncate">{item.nome}</h3>
          {item.dataGravacao && (
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(item.dataGravacao + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
      <a
        href={item.linkFicheiro}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2.5 px-4 text-center rounded-xl font-semibold text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 active:scale-95 transition-all"
      >
        \u2B07\uFE0F Baixar Video
      </a>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('planning');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.id;
    if (id) {
      setClientId(id);
      fetchContents(id);
    } else {
      setLoading(false);
      setError('Nenhum cliente identificado. Acesse com ?id=seu-id');
    }
  }, [router.isReady, router.query.id]);

  const fetchContents = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contents?clientId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok) {
        setContents(data.contents);
      } else {
        setError(data.error || 'Erro ao carregar conteudos');
      }
    } catch (e) {
      setError('Erro de conexao. Tente novamente.');
    }
    setLoading(false);
  };

  const planningItems = contents;
  const downloadItems = contents.filter(c => c.linkFicheiro);

  return (
    <>
      <Head>
        <title>T3 Studio | Portal do Cliente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div
        className="min-h-screen"
        style={{
          background: 'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 50%, #0a0f1e 100%)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  T3 <span className="text-blue-400">Studio</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {clientId ? `Portal • ${clientId}` : 'Portal do Cliente'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">T3</span>
              </div>
            </div>
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('planning')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'planning'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Planejamento
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'downloads'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Downloads
                {downloadItems.length > 0 && (
                  <span className="ml-1.5 bg-blue-500/30 text-blue-300 text-xs px-1.5 py-0.5 rounded-full">
                    {downloadItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">Carregando seus conteudos...</p>
            </div>
          )}

          {error && !loading && (
            <div className="glass rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">\uD83D\uDCCB</div>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && activeTab === 'planning' && (
            <div>
              {planningItems.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="text-3xl mb-3">\uD83D\uDCC5</div>
                  <p className="text-slate-300 font-medium">Nenhum conteudo encontrado</p>
                  <p className="text-slate-500 text-sm mt-1">Novos conteudos aparecerao aqui quando forem adicionados.</p>
                </div>
              ) : (
                <div className="relative">
                  {planningItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onApprove={() => {}}
                      onReject={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'downloads' && (
            <div>
              {downloadItems.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="text-3xl mb-3">\uD83D\uDCE5</div>
                  <p className="text-slate-300 font-medium">Nenhum video disponivel</p>
                  <p className="text-slate-500 text-sm mt-1">Os videos ficam disponiveis aqui apos a producao.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {downloadItems.map((item) => (
                    <DownloadCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="max-w-md mx-auto px-4 pb-8 pt-4 text-center">
          <p className="text-xs text-slate-600">T3 Studio &copy; {new Date().getFullYear()} &bull; Portal Exclusivo</p>
        </footer>
      </div>
    </>
  );
}
