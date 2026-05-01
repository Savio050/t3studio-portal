import { useState, useEffect, useRef, useCallback } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Play, Pause, Plus, Minus, RotateCcw, Pencil,
  X, Underline, ChevronLeft, ChevronRight, Loader2, AlignLeft,
} from 'lucide-react';

// ── Restart icon (inline SVG) ─────────────────────────────────────────────────
function RestartIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// ── Mirror icon (inline SVG — não depende da versão do lucide) ────────────────
function MirrorIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M4 7l4 5-4 5M20 7l-4 5 4 5" />
    </svg>
  );
}

// ── Teleprompter view (fullscreen) ────────────────────────────────────────────
function PrompterView({ text, initialFontSize, initialSpeed, onExit, onEdit }) {
  const [playing,   setPlaying]   = useState(false);
  const [speed,     setSpeed]     = useState(initialSpeed);
  const [fontSize,  setFontSize]  = useState(initialFontSize);
  const [rotated,   setRotated]   = useState(false);
  const [mirrored,  setMirrored]  = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);

  const scrollRef = useRef(null);
  const rafRef    = useRef(null);
  const accRef    = useRef(0);

  function handleRestart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    accRef.current = 0;
    setActiveIdx(-1);
    setPlaying(false);
  }

  const lines = text.split('\n');

  // ── RAF scroll loop ─────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    accRef.current += speed * 0.25;
    const whole = Math.floor(accRef.current);
    if (whole >= 1) {
      el.scrollTop += whole;
      accRef.current -= whole;
    }

    // Highlight active line at 35% from top
    const focusY = el.scrollTop + el.clientHeight * 0.35;
    const paras = el.querySelectorAll('[data-line]');
    let found = -1;
    paras.forEach((p, i) => {
      if (p.offsetTop <= focusY && focusY < p.offsetTop + p.offsetHeight) found = i;
    });
    setActiveIdx(found);

    rafRef.current = requestAnimationFrame(tick);
  }, [speed]);

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]);

  // Hide scrollbar globally while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Transform applied to the text area only
  const transforms = [];
  if (rotated)  transforms.push('rotate(180deg)');
  if (mirrored) transforms.push('scaleX(-1)');
  const textTransform = transforms.join(' ') || 'none';

  function CtrlBtn({ onClick, title, active, children, primary }) {
    return (
      <button
        onClick={onClick}
        title={title}
        className={`w-10 h-10 flex items-center justify-center rounded-xl
          transition-all duration-150 active:scale-95 cursor-pointer
          ${primary
            ? 'bg-white text-black hover:bg-white/90'
            : active
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex select-none">

      {/* ── Scrollable text ─────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={() => setPlaying(v => !v)}
      >
        <style>{`#tp-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div
          className="min-h-full px-6 md:px-16"
          style={{ paddingTop: '45vh', paddingBottom: '60vh', transform: textTransform, transformOrigin: 'center center' }}
        >
          {lines.map((line, i) => (
            line.trim() === ''
              ? <div key={i} data-line={i} style={{ height: `${fontSize * 0.8}px` }} />
              : (
                <p
                  key={i}
                  data-line={i}
                  className="leading-tight transition-colors duration-200"
                  style={{
                    fontSize:    `${fontSize}px`,
                    marginBottom: `${fontSize * 0.5}px`,
                    color: highlight
                      ? (activeIdx === i ? '#ffffff' : 'rgba(255,255,255,0.28)')
                      : '#ffffff',
                    fontWeight:  highlight && activeIdx === i ? '700' : '500',
                    fontFamily:  'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {line}
                </p>
              )
          ))}
        </div>
      </div>

      {/* ── Controls panel ──────────────────────────────────────────── */}
      <div className="flex items-stretch shrink-0" onClick={e => e.stopPropagation()}>

        {/* Toggle arrow */}
        <button
          onClick={() => setShowPanel(v => !v)}
          className="self-center w-5 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
        >
          {showPanel
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />}
        </button>

        {showPanel && (
          <div className="flex flex-col items-center gap-2 py-5 px-3 bg-white/[0.06] border-l border-white/10">

            {/* Exit */}
            <CtrlBtn onClick={onExit} title="Sair do teleprompter">
              <X className="w-5 h-5" />
            </CtrlBtn>

            <div className="w-6 border-t border-white/10 my-1" />

            {/* Play / Pause */}
            <CtrlBtn onClick={() => setPlaying(v => !v)} title={playing ? 'Pausar' : 'Iniciar'} primary>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </CtrlBtn>

            {/* Restart */}
            <CtrlBtn onClick={handleRestart} title="Recomeçar do início">
              <RestartIcon />
            </CtrlBtn>

            <div className="w-6 border-t border-white/10 my-1" />

            {/* Speed */}
            <span className="text-white/30 text-[9px] uppercase tracking-widest">Vel</span>
            <CtrlBtn onClick={() => setSpeed(v => Math.min(10, v + 1))} title="Aumentar velocidade">
              <Plus className="w-4 h-4" />
            </CtrlBtn>
            <span className="text-white font-bold text-[14px] w-8 text-center">{speed}</span>
            <CtrlBtn onClick={() => setSpeed(v => Math.max(1, v - 1))} title="Diminuir velocidade">
              <Minus className="w-4 h-4" />
            </CtrlBtn>

            <div className="w-6 border-t border-white/10 my-1" />

            {/* Font size */}
            <span className="text-white/30 text-[9px] uppercase tracking-widest">A</span>
            <CtrlBtn onClick={() => setFontSize(v => Math.min(120, v + 4))} title="Aumentar fonte">
              <Plus className="w-4 h-4" />
            </CtrlBtn>
            <span className="text-white font-bold text-[14px] w-8 text-center">{fontSize}</span>
            <CtrlBtn onClick={() => setFontSize(v => Math.max(20, v - 4))} title="Diminuir fonte">
              <Minus className="w-4 h-4" />
            </CtrlBtn>

            <div className="w-6 border-t border-white/10 my-1" />

            {/* Rotate 180° */}
            <CtrlBtn onClick={() => setRotated(v => !v)} title="Rotacionar 180°" active={rotated}>
              <RotateCcw className="w-5 h-5" />
            </CtrlBtn>

            {/* Mirror */}
            <CtrlBtn onClick={() => setMirrored(v => !v)} title="Inverter espelho" active={mirrored}>
              <MirrorIcon />
            </CtrlBtn>

            {/* Highlight */}
            <CtrlBtn onClick={() => setHighlight(v => !v)} title="Destacar linha ativa" active={highlight}>
              <Underline className="w-5 h-5" />
            </CtrlBtn>

            <div className="w-6 border-t border-white/10 my-1" />

            {/* Edit text */}
            <CtrlBtn onClick={onEdit} title="Editar texto">
              <Pencil className="w-5 h-5" />
            </CtrlBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeleprompterPage() {
  const [title,     setTitle]     = useState('');
  const [text,      setText]      = useState('');
  const [fontSize,  setFontSize]  = useState(56);
  const [speed,     setSpeed]     = useState(3);
  const [prompter,  setPrompter]  = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Persist in localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tp_script') || '{}');
      if (saved.title) setTitle(saved.title);
      if (saved.text)  setText(saved.text);
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (saved.speed)    setSpeed(saved.speed);
    } catch {}
  }, []);

  function handleSave() {
    localStorage.setItem('tp_script', JSON.stringify({ title, text, fontSize, speed }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleStart() {
    if (!text.trim()) return;
    handleSave();
    setPrompter(true);
  }

  // Live font preview (max 4 lines)
  const previewLines = text.split('\n').filter(l => l.trim()).slice(0, 4);

  return (
    <>
      {prompter && (
        <PrompterView
          text={text}
          initialFontSize={fontSize}
          initialSpeed={speed}
          onExit={() => setPrompter(false)}
          onEdit={() => setPrompter(false)}
        />
      )}

      <CRMLayout title="Teleprompter · T3 Studio">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">Teleprompter</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">Escreva, ajuste e leia seu roteiro em tela cheia</p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold
                border border-[rgba(0,0,0,0.12)] text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.03)]
                transition-all cursor-pointer"
            >
              {saved ? '✓ Salvo' : 'Salvar'}
            </button>
          </div>

          <div className="space-y-5">

            {/* Title */}
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Título</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Reels Mafro — Restrições de Tráfego"
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                  text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                  focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]
                  transition-all duration-150"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Conteúdo</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Cole ou escreva o roteiro aqui.\n\nCada parágrafo vazio vira uma pausa na leitura."}
                rows={14}
                className="w-full px-3.5 py-3 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                  text-[15px] leading-relaxed bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                  focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]
                  resize-y transition-all duration-150 font-[system-ui]"
              />
              <p className="text-[11px] text-[#aeaeb2] mt-1.5">
                {text.trim().split(/\s+/).filter(Boolean).length} palavras
                · {text.trim().split('\n').filter(l => l.trim()).length} parágrafos
              </p>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-4">

              {/* Font size */}
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <p className="text-[12px] font-semibold text-[#6e6e73] mb-3 uppercase tracking-wide">Tamanho da fonte</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontSize(v => Math.max(20, v - 4))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                      bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.09)]
                      text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-[22px] font-bold text-[#1d1d1f]">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(v => Math.min(120, v + 4))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                      bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.09)]
                      text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* Scale indicator */}
                <div className="mt-2 h-1 rounded-full bg-[rgba(0,0,0,0.06)]">
                  <div className="h-1 rounded-full bg-[#0071e3] transition-all"
                    style={{ width: `${((fontSize - 20) / 100) * 100}%` }} />
                </div>
              </div>

              {/* Scroll speed */}
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <p className="text-[12px] font-semibold text-[#6e6e73] mb-3 uppercase tracking-wide">Velocidade de rolagem</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSpeed(v => Math.max(1, v - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                      bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.09)]
                      text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-[22px] font-bold text-[#1d1d1f]">{speed}</span>
                  <button
                    onClick={() => setSpeed(v => Math.min(10, v + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                      bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.09)]
                      text-[#1d1d1f] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 h-1 rounded-full bg-[rgba(0,0,0,0.06)]">
                  <div className="h-1 rounded-full bg-[#30d158] transition-all"
                    style={{ width: `${((speed - 1) / 9) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Preview */}
            {text.trim() && (
              <div className="rounded-xl overflow-hidden border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#1d1d1f]">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Pré-visualização</p>
                  <p className="text-[11px] text-white/30">{fontSize}px</p>
                </div>
                <div className="bg-black px-6 py-5 min-h-[120px]">
                  {previewLines.map((line, i) => (
                    <p key={i}
                      className="leading-tight mb-3 text-white/80 font-medium"
                      style={{ fontSize: `${Math.min(fontSize, 40)}px`, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {line}
                    </p>
                  ))}
                  {text.split('\n').filter(l => l.trim()).length > 4 && (
                    <p className="text-white/20 text-[13px] mt-1">
                      + {text.split('\n').filter(l => l.trim()).length - 4} parágrafos...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={!text.trim()}
              className="w-full py-4 rounded-[14px] text-[16px] font-bold text-white
                flex items-center justify-center gap-3
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all active:scale-[0.98] cursor-pointer"
              style={{ background: text.trim() ? 'linear-gradient(135deg, #1d1d1f, #3a3a3c)' : '#aeaeb2' }}
            >
              <Play className="w-5 h-5" />
              Iniciar Teleprompter
            </button>

            {/* Tips */}
            <div className="rounded-xl bg-[rgba(0,113,227,0.05)] border border-[rgba(0,113,227,0.12)] px-4 py-3.5">
              <p className="text-[12px] font-semibold text-[#0071e3] mb-2">Dicas de uso</p>
              <ul className="space-y-1 text-[12px] text-[#6e6e73]">
                <li>• <b>Toque na tela</b> para pausar/retomar a rolagem</li>
                <li>• Use <b>linhas em branco</b> no texto para criar pausas visuais</li>
                <li>• <b>Rotacionar</b> vira o texto 180° — útil para gravações com câmera ao contrário</li>
                <li>• <b>Inverter espelho</b> reflete horizontalmente — para uso com vidro de teleprompter</li>
                <li>• O texto <b>destaca a linha</b> que está sendo lida automaticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </CRMLayout>
    </>
  );
}
