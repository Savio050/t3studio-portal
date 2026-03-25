import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Calendar, FileText, Check, X, Download, Clock, Film, Send, FolderKanban, Tag, Image as ImageIcon, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

// Paleta de Cores T3 Studio
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
    <div className="w-full mt-4">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between px-4 py-3 bg-[#03090F] border border-[#15283A] rounded-xl text-sm text-slate-300 hover:text-white hover:border-slate-700 transition-all"
      >
        <div className="flex items-center gap-2 font-medium">
          <FileText className="w-4 h-4 text-[#00D670]" /> <span>Ver Roteiro</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <div className="mt-2 p-4 rounded-xl bg-[#03090F]/50 border border-[#15283A]/50 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap shadow-inner">
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
    <div className="mt-4 p-5 rounded-2xl bg-[#0A1622] border border-[#15283A] shadow-lg relative overflow-hidden">
      
      {/* Topo: Pílulas de Status e Categoria */}
      <div className="flex justify-between items-start mb-4">
        <div className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase ${colorClass}`}>
          {status}
        </div>
        {item.categoria && (
          <div className="px-3 py-1 bg-[#03090F] rounded-full border border-[#15283A] text-slate-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-inner">
            <Tag className="w-3 h-3" /> {item.categoria}
          </div>
        )}
      </div>

      {/* Meio: Informações Principais */}
      <div className="mb-2">
        <h3 className="text-xl font-bold text-white leading-snug mb-2">{item.nome}</h3>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <Calendar className="w-4 h-4" /> {formatDate(item.dataGravacao)}
        </div>
      </div>
      
      {/* Roteiro */}
      <AccordionScript roteiro={item.roteiro} />
      
      {/* Ações */}
      {(status === 'Pendente' || status === 'Aguardando Aprovação') && (
        <div className="mt-5 pt-5 border-t border-[#15283A]">
          {!showInput ? (
            <div className="flex gap-3">
              <button onClick={() => onApprove('roteiro')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
                <Check className="w-4 h-4" /> Aprovar
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent text-slate-300 border border-[#15283A] rounded-xl text-sm font-medium hover:bg-[#112333] transition-all">
                <X className="w-4 h-4" /> Ajustar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-[#010408]/80 border border-amber-500/30 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="O que precisa ser ajustado no roteiro?"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => { onReject('roteiro', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-neutral-900 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar
                </button>
                <button onClick={() => setShowInput(false)} className="px-5 py-2.5 bg-transparent border border-[#15283A] text-slate-300 rounded-xl text-sm font-medium hover:bg-[#112333] transition-all">
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
    <div className="mt-4 p-5 rounded-2xl bg-[#0A1622] border border-[#15283A] shadow-lg relative overflow-hidden">
      
      {/* Topo: Pílulas */}
      <div className="flex justify-between items-start mb-4">
        <div className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase ${colorClass}`}>
          {status}
        </div>
        {item.categoria && (
          <div className="px-3 py-1 bg-[#03090F] rounded-full border border-[#15283A] text-slate-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-inner">
            <Tag className="w-3 h-3" /> {item.categoria}
          </div>
        )}
      </div>

      {/* Título */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white leading-snug mb-2">{item.nome}</h3>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <Calendar className="w-4 h-4" /> {formatDate(item.dataGravacao)}
        </div>
      </div>

      {/* Mídia */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 flex flex-col gap-3">
          {embedUrl ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-[#15283A]">
              <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-[#03090F] border border-[#15283A] flex items-center justify-center">
              <span className="text-sm text-slate-600 font-medium">Vídeo indisponível</span>
            </div>
          )}
          {item.linkFicheiro && (
            <a href={item.linkFicheiro} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
              <Download className="w-4 h-4" /> Baixar Vídeo
            </a>
          )}
        </div>

        {item.linkCapa && (
          <div className="w-full sm:w-1/3 flex flex-col gap-3">
            <div className="w-full aspect-[9/16] rounded-xl overflow-hidden bg-black border border-[#15283A] relative pointer-events-none">
              <iframe src={getEmbedUrl(item.linkCapa)} className="w-full h-full absolute inset-0 border-0 pointer-events-none" style={{ transform: 'scale(1.05)' }}></iframe>
            </div>
            <a href={item.linkCapa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-transparent text-white border border-[#15283A] rounded-xl text-sm font-semibold hover:bg-[#112333] transition-all">
              <Download className="w-4 h-4" /> Baixar Capa
            </a>
          </div>
        )}
      </div>

      {/* Ações */}
      {(status === 'Aguardando Aprovação' || status === 'Pendente' || status === 'Ajuste Solicitado') && (
        <div className="mt-5 pt-5 border-t border-[#15283A]">
          <p className="text-sm text-slate-400 mb-4 font-medium">Por favor, revise o vídeo acima. Caso necessite de alterações, utilize o botão de ajuste.</p>
          {!showInput ? (
            <div className="flex gap-3">
              <button onClick={() => onApprove('video')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00D670] text-[#020A10] rounded-xl text-sm font-bold hover:bg-[#00e679] transition-all shadow-[0_0_15px_rgba(0,214,112,0.15)]">
                <Check className="w-4 h-4" /> Aprovar Vídeo
              </button>
              <button onClick={() => setShowInput(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent text-slate-300 border border-[#15283A] rounded-xl text-sm font-medium hover:bg-[#112333] transition-all">
                <X className="w-4 h-4" /> Pedir Ajuste
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <textarea 
                className="w-full bg-[#010408]/80 border border-amber-500/30 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Descreva detalhadamente o que precisamos ajustar no vídeo..."
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => { onReject('video', feedback); setShowInput(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-neutral-900 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all">
                  <Send className="w-4 h-4" /> Enviar Ajuste
                </button>
                <button onClick={() => setShowInput(false)} className="px-5 py-2.5 bg-transparent border border-[#15283A] text-slate-300 rounded-xl text-sm font-medium hover:bg-[#112333] transition-all">
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
  if (!item.roteiro) return <span className="text-slate-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Sem Roteiro</span>;
  if (['Aprovado', 'Concluído'].includes(item.estadoRoteiro)) {
    return <span className="text-[#00D670]/90 flex items-center gap-1.5"><Check className="w-3.5 h-3.5"/> Roteiro Aprovado</span>;
  }
  if (item.estadoRoteiro === 'Ajuste Solicitado') {
    return <span className="text-amber-400/90 flex items-center gap-1.5"><X className="w-3.5 h-3.5"/> Ajuste de Roteiro</span>;
  }
  return <span className="text-blue-400/90 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Roteiro Pendente</span>;
};

function MonthGroup({ month, items }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="rounded-2xl overflow-hidden border border-[#15283A] bg-[#0A1622] mb-4 shadow-lg">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-[#0D1C2A] hover:bg-[#112333] transition-colors px-5 py-4 border-b border-[#15283A] flex justify-between items-center"
      >
        <h3 className="text-[15px] font-bold text-white tracking-wide">{month}</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="flex flex-col">
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-2 p-5 bg-transparent border-b border-[#15283A] last:border-0 hover:bg-[#112333]/30 transition-colors">
              
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white mb-2 leading-tight">{item.nome}</h4>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {formatDate(item.dataGravacao)}</span>
                    {item.categoria && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className="text-slate-300">{item.categoria}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[item.estado] || STATUS_COLORS['Pendente']}`}>
                  {item.estado || 'Pendente'}
                </div>
              </div>

              {/* Links de Mídia */}
              <div className="flex flex-wrap items-center gap-4 mt-2 pt-3 border-t border-[#15283A]/50 text-xs font-semibold">
                {getRoteiroStatusDisplay(item)}
                
                <span className="w-[1px] h-3 bg-[#15283A]"></span>
                
                {item.linkFicheiro ? (
                  <a href={item.linkFicheiro} target="_blank" rel="noreferrer" className="text-[#00D670] hover:text-[#00e679] flex items-center gap-1.5 transition-colors">
                    <Film className="w-3.5 h-3.5"/> Baixar Vídeo
                  </a>
                ) : (
                  <span className="text-slate-600 flex items-center gap-1.5"><Film className="w-3.5 h-3.5"/> Sem Vídeo</span>
                )}
                
                {item.linkCapa && (
                  <>
                    <span className="w-[1px] h-3 bg-[#15283A]"></span>
                    <a href={item.linkCapa} target="_blank" rel="noreferrer" className="text-white hover:text-slate-300 flex items-center gap-1.5 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5"/> Baixar Capa
                    </a>
                  </>
                )}
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
      className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
        active 
        ? 'bg-[#00D670] text-[#020A10] border-[#00D670] shadow-[0_0_15px_rgba(0,214,112,0.2)]' 
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
        <div className="flex items-center gap-3 text-[#00D670]">
          <Clock className="w-6 h-6 animate-spin" /> <span className="text-lg font-bold tracking-wide">Carregando Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#03090F] ${plusJakarta.className} selection:bg-[#00D670]/30 selection:text-white pb-10`}>
      <Head>
        <title>T3 Studio | Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="sticky top-0 z-50 border-b border-[#15283A] bg-[#03090F]/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-5">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">T3 Studio</h1>
          <p className="text-sm text-[#00D670] mt-1 font-bold tracking-wide">Portal de Acompanhamento</p>
        </div>
      </header>

      <nav className="sticky top-[89px] z-40 border-b border-[#15283A] bg-[#03090F]/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-2">
          <div className="flex overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('planning')} className={`whitespace-nowrap flex-1 px-4 py-4 text-[15px] font-bold transition-all border-b-2 ${activeTab === 'planning' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              Roteiros
            </button>
            <button onClick={() => setActiveTab('downloads')} className={`whitespace-nowrap flex-1 px-4 py-4 text-[15px] font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'downloads' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              Vídeos
            </button>
            <button onClick={() => setActiveTab('calendar')} className={`whitespace-nowrap flex-1 px-4 py-4 text-[15px] font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'calendar' ? 'text-[#00D670] border-[#00D670]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              <FolderKanban className="w-4 h-4" /> Planejamento
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        
        {activeTab === 'planning' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 mb-2 pb-2 overflow-x-auto no-scrollbar">
              <Filter className="w-5 h-5 text-slate-500 shrink-0 mr-1" />
              <FilterPill active={roteiroFilter === 'Todos'} onClick={() => setRoteiroFilter('Todos')}>Todos</FilterPill>
              <FilterPill active={roteiroFilter === 'Pendentes'} onClick={() => setRoteiroFilter('Pendentes')}>Pendentes</FilterPill>
              <FilterPill active={roteiroFilter === 'Aprovados'} onClick={() => setRoteiroFilter('Aprovados')}>Aprovados</FilterPill>
            </div>

            {activeScripts.map(item => (
              <ContentCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {activeScripts.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum roteiro encontrado para este filtro.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 mb-2 pb-2 overflow-x-auto no-scrollbar">
              <Filter className="w-5 h-5 text-slate-500 shrink-0 mr-1" />
              <FilterPill active={videoFilter === 'Todos'} onClick={() => setVideoFilter('Todos')}>Todos</FilterPill>
              <FilterPill active={videoFilter === 'Pendentes'} onClick={() => setVideoFilter('Pendentes')}>Pendentes</FilterPill>
              <FilterPill active={videoFilter === 'Aprovados'} onClick={() => setVideoFilter('Aprovados')}>Aprovados</FilterPill>
            </div>

            {activeVideos.map(item => (
              <DownloadCard key={item.id} item={item} onApprove={(target) => handleApprove(item.id, target)} onReject={(target, text) => handleReject(item.id, target, text)} />
            ))}
            {activeVideos.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum vídeo encontrado para este filtro.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {Object.keys(groupedContents).length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum conteúdo planejado ainda.</p>
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
