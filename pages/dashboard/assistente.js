import { useState, useEffect, useRef, useCallback } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Bot, Send, Loader2, User, Sparkles,
  Plus, Film, CheckSquare, Search, Zap,
  Check, Copy, RotateCcw, ChevronRight,
  FilePlus, ListTodo, AlertCircle, Trash2, PenLine,
  BarChart2, DollarSign, TrendingUp, Users, FileText,
} from 'lucide-react';

// ── Action label helpers ──────────────────────────────────────────────────────
const ACTION_META = {
  list_content:         { icon: Search,      label: 'Consultou a esteira',       tone: 'blue'   },
  create_content:       { icon: FilePlus,    label: 'Criou conteúdo',            tone: 'green'  },
  update_content:       { icon: PenLine,     label: 'Atualizou conteúdo',        tone: 'purple' },
  delete_content:       { icon: Trash2,      label: 'Removeu conteúdo',          tone: 'red'    },
  list_tasks:           { icon: ListTodo,    label: 'Consultou tarefas',         tone: 'blue'   },
  create_task:          { icon: CheckSquare, label: 'Criou tarefa',              tone: 'green'  },
  list_clients:         { icon: Users,       label: 'Consultou clientes',        tone: 'blue'   },
  list_finance:         { icon: TrendingUp,  label: 'Consultou financeiro',      tone: 'blue'   },
  create_finance_entry: { icon: DollarSign,  label: 'Criou transação',           tone: 'green'  },
  list_script_prompts:  { icon: FileText,    label: 'Buscou instruções',         tone: 'purple' },
  read_script_prompt:   { icon: FileText,    label: 'Leu guia de roteiro',       tone: 'purple' },
};

const TOOL_THINKING_LABEL = {
  list_content:         'Consultando esteira de conteúdo…',
  create_content:       'Criando conteúdo…',
  update_content:       'Atualizando conteúdo…',
  delete_content:       'Removendo conteúdo…',
  list_tasks:           'Consultando tarefas…',
  create_task:          'Criando tarefa…',
  list_clients:         'Buscando clientes…',
  list_finance:         'Consultando dados financeiros…',
  create_finance_entry: 'Registrando transação…',
  list_script_prompts:  'Buscando guias de roteiro…',
  read_script_prompt:   'Lendo instruções de roteiro…',
};

// ── Quick suggestions ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: BarChart2,   label: 'Briefing diário',                   prompt: 'Analise o estado atual de toda a esteira de conteúdo e das tarefas abertas. Identifique gargalos, conteúdos parados, e gere um resumo executivo com o que a equipe precisa priorizar hoje. Seja específico com nomes de clientes e conteúdos.' },
  { icon: Film,        label: 'Conteúdos pendentes',               prompt: 'Quais conteúdos estão pendentes ou não iniciados?' },
  { icon: AlertCircle, label: 'Aguardando aprovação do cliente',   prompt: 'Liste os conteúdos que estão aguardando aprovação do cliente.' },
  { icon: CheckSquare, label: 'Resumo das tarefas abertas',        prompt: 'Me dê um resumo das tarefas em aberto da equipe.' },
  { icon: TrendingUp,  label: 'Resumo financeiro do mês',         prompt: 'Me dê um resumo financeiro do mês atual: receitas, despesas e lucro.' },
  { icon: Zap,         label: 'O que priorizar hoje?',             prompt: 'Com base na esteira, tarefas e financeiro, o que a equipe deveria priorizar hoje?' },
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
            return <strong key={j} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
          }
          // Inline code: `code`
          return part.split(/(`[^`]+`)/g).map((chunk, k) => {
            if (chunk.startsWith('`') && chunk.endsWith('`')) {
              return (
                <code key={k} className="px-1.5 py-0.5 rounded-md text-[12px] font-mono bg-elevated text-accent border border-hairline">
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
              <span className="text-ink-muted mt-0.5 shrink-0">·</span>
              <span>{parts}</span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const [num, ...rest] = line.split(/\.\s(.+)/);
          const restParts = rest.join('. ').split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="font-semibold text-ink">{part.slice(2,-2)}</strong>
              : part
          );
          return (
            <div key={i} className="flex gap-2">
              <span className="text-ink-muted shrink-0 tabular-nums">{num}.</span>
              <span>{restParts}</span>
            </div>
          );
        }
        // Heading (## or ###)
        if (/^#{2,3}\s/.test(line)) {
          const headText = line.replace(/^#{2,3}\s/, '');
          return <p key={i} className="font-semibold text-ink mt-2">{headText}</p>;
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
  const meta = ACTION_META[action.type] || { icon: Zap, label: action.type, tone: 'neutral' };
  const Icon = meta.icon;
  const label = action.message ? `${meta.label}: ${action.message}` : meta.label;
  const toneClass = !action.success
    ? 'badge badge-red'
    : `badge badge-${meta.tone}`;

  return (
    <div className={`${toneClass} inline-flex items-center gap-1.5`}>
      <Icon className="w-3 h-3 shrink-0"/>
      <span>{label.length > 60 ? label.slice(0, 57) + '…' : label}</span>
    </div>
  );
}

// ── Assistant avatar ──────────────────────────────────────────────────────────
function AssistantAvatar({ size = 'md' }) {
  const dims = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-14 h-14' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-4 h-4';
  return (
    <div className={`${dims} brand-gradient rounded-full flex items-center justify-center shrink-0 shadow-apple-sm`}>
      <Bot className={`${iconSize} text-white`}/>
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
      {isUser ? (
        <div className="w-8 h-8 rounded-full bg-elevated border border-hairline flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-ink-muted"/>
        </div>
      ) : isError ? (
        <div className="w-8 h-8 rounded-full bg-err-soft border border-hairline flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-err-ink"/>
        </div>
      ) : (
        <div className="mt-0.5">
          <AssistantAvatar/>
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Action pills */}
        {msg.actions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.actions.map((a, i) => <ActionPill key={i} action={a}/>)}
          </div>
        )}

        {/* Bubble */}
        <div
          className={
            isUser
              ? 'px-4 py-2.5 rounded-apple-lg text-[15px] leading-relaxed bg-accent-soft text-accent-ink'
              : isError
                ? 'px-4 py-3 rounded-apple-lg text-[15px] leading-relaxed bg-err-soft text-err-ink border border-hairline'
                : 'px-4 py-3 rounded-apple-lg text-[15px] leading-relaxed bg-white text-ink border border-hairline shadow-apple-sm'
          }
        >
          {isUser || isError
            ? <p className="whitespace-pre-wrap">{msg.content}</p>
            : <RenderMarkdown text={msg.content}/>
          }
        </div>

        {/* Toolbar (copy + retry) */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button onClick={copy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer
                text-ink-muted hover:text-ink hover:bg-elevated transition-all duration-150">
              {copied ? <Check className="w-3 h-3 text-ok-ink"/> : <Copy className="w-3 h-3"/>}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            {isError && onRetry && (
              <button onClick={onRetry}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer
                  text-ink-muted hover:text-ink hover:bg-elevated transition-all duration-150">
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
      <div className="mt-0.5">
        <AssistantAvatar/>
      </div>
      <div className="px-4 py-3 rounded-apple-lg bg-white border border-hairline shadow-apple-sm flex flex-col gap-2">
        {thinkingLabel && (
          <p className="text-[11px] font-medium text-ink-muted">{thinkingLabel}</p>
        )}
        <div className="flex items-center gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-bounce"
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
        <AssistantAvatar size="lg"/>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white border border-hairline shadow-apple-sm">
          <Sparkles className="w-2.5 h-2.5 text-accent"/>
        </div>
      </div>

      <h2 className="t-title text-ink mb-1.5">Assistente T3 Studio</h2>
      <p className="t-body text-ink-soft text-center max-w-md mb-8 leading-relaxed">
        Gerencio sua esteira de conteúdo e tarefas com linguagem natural. Pergunte qualquer coisa ou use uma sugestão abaixo.
      </p>

      {/* Capability badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          { icon: Film,       label: 'Gerenciar conteúdos' },
          { icon: CheckSquare,label: 'Criar tarefas'       },
          { icon: TrendingUp, label: 'Controle financeiro' },
          { icon: Users,      label: 'Consultar clientes'  },
          { icon: Search,     label: 'Consultar esteira'   },
          { icon: PenLine,    label: 'Gerar roteiros'      },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium text-ink-soft bg-elevated border border-hairline">
            <Icon className="w-3.5 h-3.5 text-accent"/>
            {label}
          </div>
        ))}
      </div>

      {/* Suggestions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
          <button key={label} onClick={() => onSelect(prompt)}
            className="card-interactive flex items-center gap-3 px-4 py-3 text-left group/sug">
            <div className="w-8 h-8 rounded-apple bg-accent-soft flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-accent"/>
            </div>
            <span className="flex-1 text-sm font-medium text-ink">{label}</span>
            <ChevronRight className="w-4 h-4 text-ink-faint opacity-0 group-hover/sug:opacity-100 transition-opacity"/>
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

    // Simulate dynamic thinking label via polling trick
    let thinkTimeout;
    const updateThinkLabel = (labels) => {
      if (!labels?.length) return;
      labels.forEach((label, i) => {
        thinkTimeout = setTimeout(() => {
          setThinkLabel(TOOL_THINKING_LABEL[label] || 'Processando…');
        }, i * 800);
      });
    };

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

      const { reply, actions, toolLabels } = await res.json();
      updateThinkLabel(toolLabels);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        actions: actions || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: err.message || 'Não consegui processar sua mensagem. Verifique se a GEMINI_API_KEY está configurada no Vercel.',
      }]);
    } finally {
      clearTimeout(thinkTimeout);
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
      <div className="flex flex-col bg-canvas" style={{ height: 'calc(100vh - 0px)', maxHeight: '100dvh' }}>

        {/* ── Header ── */}
        <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 border-b border-hairline bg-surface/80 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <AssistantAvatar/>
              <div>
                <h1 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                  Assistente Virtual
                  <span className="badge badge-green">
                    <span className="dot dot-green"/> Gemini 2.5 Flash
                  </span>
                </h1>
                <p className="t-small text-ink-muted mt-0.5">
                  Gerencia sua esteira com linguagem natural
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="btn btn-ghost">
                <RotateCcw className="w-3.5 h-3.5"/>
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
        <div className="shrink-0 px-5 lg:px-8 py-4 border-t border-hairline bg-surface/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            {/* Quick chips when there are messages */}
            {messages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                {SUGGESTIONS.slice(0, 4).map(({ label, prompt }) => (
                  <button key={label} onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="shrink-0 px-3 py-1.5 rounded-pill text-[12px] font-medium cursor-pointer
                      transition-all duration-150 disabled:opacity-40
                      text-ink-soft hover:text-ink bg-elevated hover:bg-white border border-hairline">
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            <div className="flex items-end gap-2.5">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  rows={1}
                  placeholder="Pergunte qualquer coisa… ex: Crie um Reels para mafro esta semana"
                  className="w-full px-4 py-3 pr-4 rounded-apple-lg text-[15px] text-ink
                    placeholder:text-ink-faint resize-none outline-none transition-all duration-150
                    bg-white border border-hairline
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                    disabled:opacity-50 leading-relaxed shadow-apple-sm"
                  style={{
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
                className="w-11 h-11 flex items-center justify-center rounded-full
                  bg-accent hover:bg-accent-hover text-white cursor-pointer
                  transition-all duration-200 shrink-0 shadow-apple
                  disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin"/>
                  : <Send className="w-4 h-4"/>
                }
              </button>
            </div>

            <p className="text-[11px] text-ink-faint mt-2.5 text-center">
              Enter para enviar · Shift+Enter para nova linha · Powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
