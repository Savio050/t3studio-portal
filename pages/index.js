import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Calendar, FileText, Check, X, Download, Clock, Film, Send, FolderKanban, Tag, Image as ImageIcon, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

// Paleta de Cores Baseada na Landing Page da T3 Studio
const STATUS_COLORS = {
  'Aprovado': 'text-[#00D670] bg-[#00D670]/10 border-[#00D670]/30',
  'Ajuste Solicitado': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Pendente': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Aguardando Aprovação': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Em Produção': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  'Concluído': 'text-slate-400 bg-slate-400/10 border-slate-400/30',
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

const renderTextWithLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#00D670] hover:text-[#00D670]/80 underline underline-offset-4 decoration-[#00D670]/30 transition-colors">
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
    <div className="mt-3 border-t border-[#15283A] pt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <Film className="w-4 h-4" /> <span>Ver Roteiro</span>
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-lg bg-[#010408]/50 border border-[#15283A] text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
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
    <div className="mt-2 p-4 rounded-xl bg-[#0A1622] border border-[#15283A] shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-32 shrink-0">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status:</span>
          </div>
          <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
        </div>
        {item.categoria && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#03090F] rounded-md border border-[#15283A] text-slate-300 text-[10px] font-semibold tracking-wide uppercase">
            <Tag className="w-3 h-3" /> {item.categoria}
          </div>
        )}
      </div>

      <div className="flex items-center mb-3">
        <div className="flex items-center gap-1.5 w-32 shrink-0 text-slate-500">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Gravação:</span>
        </div>
        <span className="text-slate-300 text-sm font-medium">{formatDate(item.dataGravacao)}</span>
      </div>

      <div className="flex items-start mb-4">
        <div className="flex items-center gap-1.5 w-32 shrink-0 text-slate-500 mt-0.5">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Projeto:</span>
        </div>
        <span className="text-white text-base font-medium leading-tight">{item.nome}</span>
      </div>
      
      <AccordionScript roteiro={item.roteiro} />
      
      {(status === 'Pendente' || status === 'Aguardando Aprovação') && (
        <div className="mt-4 pt-4 border-t border-[#15283A]">
          {!showInput ? (
            <div className="flex gap-2">
              <button onClick={() => onApprove('roteiro')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00D670] text-[#020A10] rounded-lg text-sm font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
                <Check className="w-4 h-4" /> Aprovar Roteiro
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent text-slate-300 border border-[#15283A] rounded-lg text-sm font-medium hover:bg-[#112333] transition-all">
                <X className="w-4 h-4" /> Pedir Ajuste
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-[#010408]/80 border border-amber-500/30 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="O que precisa ser ajustado no roteiro?"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject('roteiro', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-neutral-900 rounded-lg text-sm font-bold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar
                </button>
                <button onClick={() => setShowInput(false)} className="px-4 py-2 bg-transparent border border-[#15283A] text-slate-300 rounded-lg text-sm font-medium hover:bg-[#112333] transition-all">
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
    <div className="mt-4 p-4 rounded-xl bg-[#0A1622] border border-[#15283A] shadow-lg">
      <div className="flex gap-3 mb-4">
        <div className="flex-[2] flex flex-col gap-2">
          {embedUrl ? (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-[#15283A]">
              <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-[#03090F] border border-[#15283A] flex items-center justify-center">
              <span className="text-xs text-slate-600">Vídeo indisponível</span>
            </div>
          )}
          {item.linkFicheiro && (
            <a href={item.linkFicheiro} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#00D670] text-[#020A10] rounded-lg text-xs font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
              <Download className="w-3.5 h-3.5" /> Baixar Vídeo
            </a>
          )}
        </div>

        {item.linkCapa && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-full aspect-[9/16] rounded-lg overflow-hidden bg-black border border-[#15283A] relative pointer-events-none">
              <iframe src={getEmbedUrl(item.linkCapa)} className="w-full h-full absolute inset-0 border-0 pointer-events-none" style={{ transform: 'scale(1.05)' }}></iframe>
            </div>
            <a href={item.linkCapa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 w-full py-2 bg-transparent text-white border border-[#15283A] rounded-lg text-xs font-semibold hover:bg-[#112333] transition-all">
              <Download className="w-3.5 h-3.5" /> Capa
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 pt-3 border-t border-[#15283A]">
        <div className="flex items-center gap-2">
          <div className="w-24 shrink-0">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status:</span>
          </div>
          <div className={`px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>{status}</div>
        </div>
        {item.categoria && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#03090F] rounded-md border border-[#15283A] text-slate-300 text-[10px] font-semibold tracking-wide uppercase">
            <Tag className="w-3 h-3" /> {item.categoria}
          </div>
        )}
      </div>

      <div className="flex items-start mb-2">
        <div className="flex items-center gap-1.5 w-24 shrink-0 text-slate-500 mt-0.5">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Projeto:</span>
        </div>
        <h3 className="text-sm font-medium text-white leading-tight">{item.nome}</h3>
      </div>

      {(status === 'Aguardando Aprovação' || status === 'Pendente' || status === 'Ajuste Solicitado') && (
        <div className="mt-4 pt-3 border-t border-[#15283A]">
          <p className="text-xs text-slate-400 mb-3">Por favor, revise o vídeo acima. Caso necessite de alterações, utilize o botão de ajuste.</p>
          {!showInput ? (
            <div className="flex gap-2">
              <button onClick={() => onApprove('video')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00D670] text-[#020A10] rounded-lg text-sm font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
                <Check className="w-4 h-4" /> Aprovar Vídeo
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent text-slate-300 border border-[#15283A] rounded-lg text-sm font-medium hover:bg-[#112333] transition-all">
                <X className="w-4 h-4" /> Pedir Ajuste
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-[#010408]/80 border border-amber-500/30 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Descreva detalhadamente o que precisamos ajustar no vídeo..."
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject('video', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-neutral-900 rounded-lg text-sm font-bold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar Ajuste
                </button>
                <button onClick={() => setShowInput(false)} className="px-4 py-2 bg-transparent border border-[#15283A] text-slate-300 rounded-lg text-sm font-medium hover:bg-[#112333] transition-all">
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

// Helper para inteligência da aba de Planejamento
const getRoteiroStatusDisplay = (item) => {
  if (!item.roteiro) return <span className="text-slate-600 flex items-center gap-1"><FileText className="w-3 h-3"/> Sem Roteiro</span>;
  if (['Aprovado', 'Concluído'].includes(item.estadoRoteiro)) {
    return <span className="text-[#00D670]/90 flex items-center gap-1"><Check className="w-3 h-3"/> Roteiro Aprovado</span>;
  }
  if (item.estadoRoteiro === 'Ajuste Solicitado') {
    return <span className="text-amber-400/90 flex items-center gap-1"><X className="w-3 h-3"/> Ajuste Solicitado</span>;
  }
  return <span className="text-blue-400/90 flex items-center gap-1"><Clock className="w-3 h-3"/> Roteiro Pendente</span>;
};

function MonthGroup({ month, items }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="rounded-xl overflow-hidden border border-[#15283A] bg-[#0A1622] mb-4 shadow-lg">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-[#0D1C2A] hover:bg-[#112333] transition-colors px-4 py-3 border-b border-[#15283A] flex justify-between items-center"
      >
        <h3 className="text-sm font-semibold text-white tracking-wide">{month}</h3>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="flex flex-col">
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-3 p-4 bg-transparent border-b border-[#15283A] last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-white">{item.nome}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(item.dataGravacao)}</span>
                    {item.categoria && <span className="text-[10px] uppercase font-semibold text-slate-500 border border-[#15283A] px-1.5 py-0.5 rounded bg-[#03090F]">{item.categoria}</span>}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded border text-[10px] font-medium ${STATUS_COLORS[item.estado] || STATUS_COLORS['Pendente']}`}>{item.estado || 'Pendente'}</div>
              </div>
              <div className="flex gap-4 text-xs font-medium mt-1">
                {getRoteiroStatusDisplay(item)}
                {item.linkFicheiro ? <a href={item.linkFicheiro} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"><Film className="w-3 h-3"/> Vídeo</a> : <span className="text-slate-600 flex items-center gap-1"><Film className="w-3 h-3"/> Sem Vídeo</span>}
                {item.linkCapa && <a href={item.linkCapa} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Capa</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
        active 
        ? 'bg-[#00D670] text-[#020A10] border-[#00D670] shadow-[0_0_10px_rgba(0,214,112,0.2)]' 
        : 'bg-[#0D1C2A] text-slate-400 border-[#15283A] hover:bg-[#112333] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('planning');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roteiroFilter, setRoteiroFilter] = useState('Todos'); 
  const [videoFilter, setVideoFilter] = useState('Todos');

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

  let activeScripts = contents.filter(item => item.estadoRoteiro !== 'Concluído');
  let activeVideos = contents.filter(item => (item.linkFicheiro || item.linkCapa) && item.estado !== 'Concluído');

  if (roteiroFilter === 'Pendentes') {
    activeScripts = activeScripts.filter(item => ['Pendente', 'Aguardando Aprovação', 'Ajuste Solicitado'].includes(item.estadoRoteiro));
  } else if (roteiroFilter === 'Aprovados') {
    activeScripts = activeScripts.filter(item => item.estadoRoteiro === 'Aprovado');
  }

  if (videoFilter === 'Pendentes') {
    activeVideos = activeVideos.filter(item => ['Pendente', 'Aguardando Aprovação', 'Ajuste Solicitado', 'Em Produção'].includes(item.estado));
  } else if (videoFilter === 'Aprovados') {
    activeVideos = activeVideos.filter(item => item.estado === 'Aprovado');
  }

  const groupContentsByMonth = () => {
    const grouped = {};
    contents.forEach(item => {
      const monthLabel = item.mesRelativo || 'Sem mês definido';
      if (!grouped[monthLabel]) grouped[monthLabel] = [];
      grouped[monthLabel].push(item);
    });
    return grouped;
  };

  const groupedContents = groupContentsByMonth();

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#03090F] flex items-center justify-center ${plusJakarta.className}`}>
        <div className="flex items-center gap-2 text-[#00D670]">
          <Clock className="w-5 h-5 animate-spin" /> <span className="font-medium tracking-wide">Carregando Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#03090F] ${plusJakarta.className} selection:bg-[#00D670]/30 selection:text-white`}>
      <Head>
        <title>T3 Studio | Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-[#15283A] bg-[#03090F]/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">T3 Studio</h1>
          <p className="text-sm text-[#00D670] mt-0.5 font-medium tracking-wide">Portal de Acompanhamento</p>
        </div>
      </header>

      <nav className="sticky top-[73px] z-40 border-b border-[#15283A] bg-[#03090F]/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('planning')} className={`whitespace-nowrap flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'planning' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              Roteiros
            </button>
            <button onClick={() => setActiveTab('downloads')} className={`whitespace-nowrap flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'downloads' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              Vídeos
            </button>
            <button onClick={() => setActiveTab('calendar')} className={`whitespace-nowrap flex-1 px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'calendar' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              <FolderKanban className="w-4 h-4" /> Planejamento
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        
        {activeTab === 'planning' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 overflow-x-auto no-scrollbar">
              <Filter className="w-4 h-4 text-slate-500 shrink-0 mr-1" />
              <FilterPill active={roteiroFilter === 'Todos'} onClick={() => setRoteiroFilter('Todos')}>Todos</FilterPill>
              <FilterPill active={roteiroFilter === 'Pendentes'} onClick={() => setRoteiroFilter('Pendentes')}>Pendentes</FilterPill>
              <FilterPill active={roteiroFilter === 'Aprovados'} onClick={() => setRoteiroFilter('Aprovados')}>Aprovados</FilterPill>
            </div>

            {activeScripts.map(item => (
              <ContentCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {activeScripts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum roteiro encontrado para este filtro.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 overflow-x-auto no-scrollbar">
              <Filter className="w-4 h-4 text-slate-500 shrink-0 mr-1" />
              <FilterPill active={videoFilter === 'Todos'} onClick={() => setVideoFilter('Todos')}>Todos</FilterPill>
              <FilterPill active={videoFilter === 'Pendentes'} onClick={() => setVideoFilter('Pendentes')}>Pendentes</FilterPill>
              <FilterPill active={videoFilter === 'Aprovados'} onClick={() => setVideoFilter('Aprovados')}>Aprovados</FilterPill>
            </div>

            {activeVideos.map(item => (
              <DownloadCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {activeVideos.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum vídeo encontrado para este filtro.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-2">
            {Object.keys(groupedContents).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum conteúdo planejado ainda.</p>
              </div>
            ) : (
              Object.entries(groupedContents).map(([month, items]) => (
                <MonthGroup key={month} month={month} items={items} />
              ))
            )}
          </div>
        )}

      </main>
    </div>
  );
}
