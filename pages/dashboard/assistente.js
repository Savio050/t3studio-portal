import { useState, useEffect, useRef, useCallback } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Bot, Send, Loader2, User, Sparkles,
  Plus, Film, CheckSquare, Search, Zap,
  Check, Copy, RotateCcw, ChevronRight,
  FilePlus, ListTodo, AlertCircle, Trash2, PenLine,
} from 'lucide-react';

// ── Action label helpers ──────────────────────────────────────────────────────
const ACTION_META = {
  list_content:   { icon: Search,   label: 'Consultou a esteira',       color: '#38bdf8' },
  create_content: { icon: FilePlus, label: 'Criou conteúdo',            color: '#34d399' },
  update_content: { icon: PenLine,  label: 'Atualizou conteúdo',        color: '#a78bfa' },
  delete_content: { icon: Trash2,   label: 'Removeu conteúdo',          color: '#f87171' },
  list_tasks:     { icon: ListTodo, label: 'Consultou tarefas',         color: '#38bdf8' },
  create_task:    { icon: CheckSquare, label: 'Criou tarefa',           color: '#34d399' },
};

// ── Quick suggestions ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Film,       label: 'Quais conteúdos estão pendentes?',           prompt: 'Quais conteúdos estão pendentes ou não iniciados?' },
  { icon: AlertCircle,label: 'O que está aguardando cliente?',              prompt: 'Liste os conteúdos que estão aguardando aprovação do cliente.' },
  { icon: CheckSquare,label: 'Resumo das tarefas abertas',                 prompt: 'Me dê um resumo das tarefas em aberto da equipe.' },
  { icon: Plus,       label: 'Criar um Reels para mafro',                  prompt: 'Crie um novo conteúdo Reels para o cliente mafro, responsável Sávio.' },
  { icon: Search,     label: 'Conteúdos de fastimoveis este mês',          prompt: 'Listar os conteúdos de fastimoveis para este mês.' },
  { icon: Zap,        label: 'O que devo fazer hoje?',                     prompt: 'Com base na esteira e tarefas, o que a equipe deveria priorizar hoje?' },
];

// ── Markdown-lite renderer (bold, code, lists) ────────────────────────────────
function RenderMarkdown({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
          }
          // Inline code: `code`
          return part.split(/(`[^`]+`)/g).map((chunk, k) => {
            if (chunk.startsWith('`') && chunk.endsWith('`')) {
              return (
                <code key={k} className="px-1 py-0.5 rounded text-[11px] font-mono text-cyan-300"
                  style={{background:'rgba(6,182,212,0.15)'}}>
                  {chunk.slice(1,-1)}
                </code>
              );
            }
            return chunk;
          });
        });

        // Bullet list
        if (/^[\-\*•]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400 mt-0.5 shrink-0">·</span>
              <span>{parts}</span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const [num, ...rest] = line.split(/\.\s(.+)/);
          const restParts = rest.join('. ').split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-semibold text-white">{part.slice(2,-2)}</strong>
              : part
          );
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400/60 shrink-0 tabular-nums">{num}.</span>
              <span>{restParts}</span>
            </div>
          );
        }
        // Heading (## or ###)
        if (/^#{2,3}\s/.test(line)) {
          const headText = line.replace(/^#{2,3}\s/, '');
          return <p key={i} className="font-bold text-white mt-2">{headText}</p>;
        }
        // Empty line
        if (!line.trim()) return <div key={i} className="h-1"/>;
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

// ── Action pill ───────────────────────────────────────────────────────────────
function ActionPill({ action }) {
  const meta = ACTION_META[action.type] || { icon: Zap, label: action.type, color: '#a78bfa' };
  const Icon = meta.icon;
  const label = action.message ? `${meta.label}: ${action.message}` : meta.label;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{
        background: action.success ? `${meta.color}12` : 'rgba(248,113,113,0.12)',
        border: `1px solid ${action.success ? `${meta.color}25` : 'rgba(248,113,113,0.25)'}`,
        color: action.success ? meta.color : '#f87171',
      }}>
      <Icon className="w-3 h-3 shrink-0"/>
      {label.length > 60 ? label.slice(0, 57) + '…' : label}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onRetry }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
        ${isUser
          ? 'bg-white/[0.08] border border-white/[0.08]'
          : isError
            ? 'bg-red-500/20 border border-red-500/30'
            : 'border border-violet-500/30'
        }`}
        style={!isUser && !isError ? { background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)' } : {}}>
        {isUser
          ? <User className="w-4 h-4 text-white/60"/>
          : isError
            ? <AlertCircle className="w-4 h-4 text-red-400"/>
            : <Bot className="w-4 h-4 text-white"/>
        }
      </div>

      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Action pills */}
        {msg.actions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.actions.map((a, i) => <ActionPill key={i} action={a}/>)}
          </div>
        )}

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'rounded-tr-sm text-white/90'
            : isError
              ? 'rounded-tl-sm text-red-300'
              : 'rounded-tl-sm text-white/85'
          }`}
          style={{
            background: isUser
              ? 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(14,116,144,0.25))'
              : isError
                ? 'rgba(248,113,113,0.1)'
                : 'rgba(255,255,255,0.06)',
            border: isUser
              ? '1px solid rgba(124,58,237,0.3)'
              : isError
                ? '1px solid rgba(248,113,113,0.2)'
                : '1px solid rgba(255,255,255,0.08)',
          }}>
          {isUser || isError
            ? <p className="whitespace-pre-wrap">{msg.content}</p>
            : <RenderMarkdown text={msg.content}/>
          }
        </div>

        {/* Toolbar (copy + retry) */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button onClick={copy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer
                text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-150">
              {copied ? <Check className="w-3 h-3 text-green-400"/> : <Copy className="w-3 h-3"/>}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            {isError && onRetry && (
              <button onClick={onRetry}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer
                  text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-150">
                <RotateCcw className="w-3 h-3"/> Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ thinkingLabel }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)', border: '1px solid rgba(124,58,237,0.3)' }}>
        <Bot className="w-4 h-4 text-white"/>
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex flex-col gap-2"
        style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)'}}>
        {thinkingLabel && (
          <p className="text-[10px] font-medium text-violet-400/70">{thinkingLabel}</p>
        )}
        <div className="flex items-center gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)' }}>
          <Bot className="w-8 h-8 text-white"/>
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>
          <Sparkles className="w-2.5 h-2.5 text-white"/>
        </div>
      </div>

      <h2 className="text-lg font-bold text-white font-display mb-1">Assistente T3 Studio</h2>
      <p className="text-sm text-white/40 text-center max-w-xs mb-8 leading-relaxed">
        Gerencio sua esteira de conteúdo e tarefas com linguagem natural. Pergunte qualquer coisa ou use uma sugestão abaixo.
      </p>

      {/* Capability badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          { icon: Film,       label: 'Gerenciar conteúdos' },
          { icon: CheckSquare,label: 'Criar tarefas'       },
          { icon: Search,     label: 'Consultar esteira'   },
          { icon: PenLine,    label: 'Editar em massa'     },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/50"
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <Icon className="w-3 h-3 text-violet-400"/>
            {label}
          </div>
        ))}
      </div>

      {/* Suggestions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
          <button key={label} onClick={() => onSelect(prompt)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-medium
              cursor-pointer transition-all duration-150 hover:brightness-125 group/sug"
            style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.55)',
            }}>
            <Icon className="w-4 h-4 text-violet-400 shrink-0"/>
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 text-white/20 opacity-0 group-hover/sug:opacity-100 transition-opacity"/>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Assistente() {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [thinkLabel,  setThinkLabel]  = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);
    setThinkLabel('Pensando…');

    try {
      const res = await fetch('/api/crm/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const { reply, actions } = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        actions: actions || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: err.message || 'Não consegui processar sua mensagem. Verifique se a GEMINI_API_KEY está configurada.',
      }]);
    } finally {
      setLoading(false);
      setThinkLabel('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, messages, loading]);

  const retry = useCallback(() => {
    // Re-send last user message
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      setMessages(prev => prev.slice(0, -1)); // remove last error
      sendMessage(lastUser.content);
    }
  }, [messages, sendMessage]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <CRMLayout title="Assistente — T3 Studio CRM">
      <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)', maxHeight: '100dvh' }}>

        {/* ── Header ── */}
        <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)' }}>
                <Bot className="w-5 h-5 text-white"/>
              </div>
              <div>
                <h1 className="text-base font-bold text-white font-display flex items-center gap-2">
                  Assistente Virtual
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{background:'rgba(52,211,153,0.15)',border:'1px solid rgba(52,211,153,0.3)',color:'#34d399'}}>
                    Gemini 2.5 Flash
                  </span>
                </h1>
                <p className="text-[11px] text-white/30 mt-0.5">
                  Gerencia sua esteira com linguagem natural
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer
                  text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-150"
                style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                <RotateCcw className="w-3 h-3"/>
                Nova conversa
              </button>
            )}
          </div>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-8 py-6">
          {messages.length === 0 ? (
            <EmptyState onSelect={sendMessage}/>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  onRetry={msg.role === 'error' ? retry : null}
                />
              ))}
              {loading && <TypingIndicator thinkingLabel={thinkLabel}/>}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 px-5 lg:px-8 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-3xl mx-auto">
            {/* Quick chips when there are messages */}
            {messages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                {SUGGESTIONS.slice(0, 4).map(({ label, prompt }) => (
                  <button key={label} onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer
                      transition-all duration-150 disabled:opacity-40
                      text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  rows={1}
                  placeholder="Pergunte qualquer coisa… ex: Crie um Reels para mafro esta semana"
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm font-medium text-white
                    placeholder-white/20 resize-none outline-none transition-all duration-150
                    focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 leading-relaxed"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                />
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 flex items-center justify-center rounded-2xl
                  text-white cursor-pointer transition-all duration-200 shrink-0
                  disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin"/>
                  : <Send className="w-4 h-4"/>
                }
              </button>
            </div>

            <p className="text-[10px] text-white/15 mt-2 text-center">
              Enter para enviar · Shift+Enter para nova linha · Powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
