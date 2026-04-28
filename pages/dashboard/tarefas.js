import { useState, useEffect, useRef } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Plus, CheckSquare, Circle, CheckCircle2, Clock, X,
  Loader2, User, Calendar, Tag, ChevronDown, Trash2,
  StickyNote, Check,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUSES   = ['Pendente', 'Concluído'];

// ── SelectField ───────────────────────────────────────────────────────────────
function SelectField({ label, value, options, onChange, placeholder = 'Selecionar…' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const selected = options.find(o => o.value?.toLowerCase() === (value || '').toLowerCase());

  return (
    <div ref={ref} className="relative">
      {label && <label className="block t-eyebrow text-ink-muted mb-1.5">{label}</label>}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-apple
          bg-elevated border border-hairline text-[13px] font-medium text-left
          hover:border-accent/40 transition-all cursor-pointer">
        <span className={`truncate ${selected ? 'text-ink' : 'text-ink-faint'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-faint shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-1 rounded-apple-lg
          bg-surface border border-hairline shadow-apple-md overflow-hidden">
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center px-3 py-2 text-[12px] text-ink-faint hover:bg-elevated cursor-pointer transition-colors">
            Limpar seleção
          </button>
          <div className="h-px bg-hairline mx-2" />
          {options.map(opt => {
            const active = opt.value?.toLowerCase() === (value || '').toLowerCase();
            return (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left cursor-pointer transition-colors
                  ${active ? 'bg-accent/8 text-accent font-semibold' : 'hover:bg-elevated text-ink'}`}>
                <span className="flex-1">{opt.label}</span>
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  'Pendente':  { badge: 'badge badge-orange', dot: 'dot dot-orange' },
  'Concluído': { badge: 'badge badge-green',  dot: 'dot dot-green'  },
};

const CLIENT_BADGE = {
  'mafro':        'badge badge-teal',
  'fast imoveis': 'badge badge-red',
};

const MEMBER_BADGE = {
  'Matheus': 'badge badge-purple',
  'savio':   'badge badge-green',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const relativeDate = (d) => {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const date  = new Date(d); date.setHours(0,0,0,0);
  const diff  = Math.round((date - today) / 86400000);
  if (diff < -1) return { label: `${Math.abs(diff)}d atrasado`, urgent: true };
  if (diff === -1) return { label: 'Ontem', urgent: true };
  if (diff === 0)  return { label: 'Hoje', urgent: true };
  if (diff === 1)  return { label: 'Amanhã', urgent: false, warn: true };
  if (diff <= 7)   return { label: `${diff} dias`, urgent: false, warn: diff <= 2 };
  return { label: fmt(d), urgent: false, warn: false };
};

// ── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onUpdateNote, toggling }) {
  const due      = task.dataEntrega ? relativeDate(task.dataEntrega) : null;
  const isDone   = task.status === 'Concluído';
  const members  = Array.isArray(task.responsavel) ? task.responsavel : (task.responsavel ? [task.responsavel] : []);

  const [noteText,   setNoteText]   = useState(task.notas || '');
  const [editing,    setEditing]    = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const textareaRef = useRef(null);

  const openNote = () => {
    setEditing(true);
    setTimeout(() => { textareaRef.current?.focus(); }, 0);
  };

  const handleNoteBlur = async () => {
    setEditing(false);
    if (noteText === (task.notas || '')) return;
    setSavingNote(true);
    await onUpdateNote(task.id, noteText);
    setSavingNote(false);
  };

  const dueBadgeClass = due
    ? (due.urgent && !isDone
        ? 'badge badge-red'
        : due.warn && !isDone
          ? 'badge badge-orange'
          : 'badge badge-neutral')
    : '';

  return (
    <div
      className={`group rounded-apple-lg bg-surface border border-hairline px-4 py-3.5 transition-all duration-200
        hover:shadow-apple-sm ${isDone ? 'opacity-60' : ''}
        ${due?.urgent && !isDone ? 'border-err/30' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Toggle checkbox — Reminders.app style */}
        <button
          onClick={() => onToggle(task)}
          disabled={toggling === task.id}
          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
          className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center
            cursor-pointer transition-all duration-200 hover:scale-110 disabled:opacity-60
            ${isDone
              ? 'bg-ok border-ok'
              : 'border-ink-faint hover:border-accent'}`}
        >
          {toggling === task.id
            ? <Loader2 className="w-3 h-3 text-ink-muted animate-spin" />
            : isDone
              ? <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              : null
          }
        </button>

        {/* Task name */}
        <p className={`flex-1 text-[15px] leading-snug tracking-apple-snug transition-all duration-200
          ${isDone ? 'line-through text-ink-muted' : 'text-ink font-medium'}`}>
          {task.nome}
        </p>

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Excluir tarefa"
          className="w-7 h-7 flex items-center justify-center rounded-apple
            text-ink-faint hover:text-err hover:bg-err/10
            opacity-0 group-hover:opacity-100
            transition-all duration-150 cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Meta row */}
      {(task.cliente || members.length > 0 || task.dataEntrega) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pl-8">
          {task.cliente && (
            <span className={`${CLIENT_BADGE[task.cliente] || 'badge badge-neutral'} inline-flex items-center gap-1`}>
              <Tag className="w-2.5 h-2.5" />
              {task.cliente}
            </span>
          )}
          {members.map(m => (
            <span key={m} className={`${MEMBER_BADGE[m] || 'badge badge-neutral'} inline-flex items-center gap-1`}>
              <User className="w-2.5 h-2.5" />
              {m}
            </span>
          ))}
          {due && (
            <span className={`${dueBadgeClass} inline-flex items-center gap-1`}>
              <Clock className="w-2.5 h-2.5" />
              {due.label}
            </span>
          )}
        </div>
      )}

      {/* Notes section */}
      <div className="mt-2.5 pl-8">
        {editing ? (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onBlur={handleNoteBlur}
              rows={3}
              placeholder="Escreva uma nota sobre o andamento..."
              className="w-full text-xs text-ink leading-relaxed resize-none rounded-apple
                px-2.5 py-2 bg-elevated border border-accent/30
                focus:outline-none focus:border-accent/50 focus:bg-surface
                placeholder:text-ink-faint transition-all duration-150"
            />
          </div>
        ) : noteText ? (
          <button
            onClick={openNote}
            className="w-full text-left group/note flex items-start gap-1.5
              rounded-apple px-2.5 py-1.5 -mx-2.5
              hover:bg-elevated transition-all duration-150"
          >
            <StickyNote className="w-3 h-3 text-ink-faint shrink-0 mt-0.5" />
            <span className="text-xs text-ink-soft leading-relaxed line-clamp-3 flex-1">
              {noteText}
            </span>
            {savingNote && <Loader2 className="w-3 h-3 text-ink-faint animate-spin shrink-0 mt-0.5" />}
          </button>
        ) : (
          <button
            onClick={openNote}
            className="flex items-center gap-1 text-[11px] text-ink-faint
              hover:text-ink-muted transition-colors duration-150 cursor-pointer
              opacity-0 group-hover:opacity-100"
          >
            <StickyNote className="w-3 h-3" />
            Adicionar nota
          </button>
        )}
      </div>
    </div>
  );
}

// ── New Task Modal ────────────────────────────────────────────────────────────
function NewTaskModal({ onClose, onCreate, clientsList = [], membersList = [] }) {
  const [nome, setNome] = useState('');
  const [responsavel, setResponsavel] = useState([]);
  const [cliente, setCliente] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMember = (m) =>
    setResponsavel(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    await onCreate({ nome, responsavel, cliente, dataEntrega: dataEntrega || undefined });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-apple-xl bg-surface p-6 animate-slide-up shadow-apple-lg border border-hairline">

        <div className="flex items-center justify-between mb-6">
          <h2 className="t-title tracking-apple-tight text-ink">Nova Tarefa</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple
              text-ink-muted hover:text-ink hover:bg-elevated
              transition-all duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">
              Tarefa
            </label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Criar roteiro do Reels..."
              className="input w-full"
            />
          </div>

          {/* Responsável — multi-toggle */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Responsável</label>
            <div className="flex flex-wrap gap-2">
              {(membersList.length ? membersList : ['Matheus', 'Sávio']).map(m => {
                const active = responsavel.includes(m);
                return (
                  <button type="button" key={m} onClick={() => toggleMember(m)}
                    className={`px-4 py-2 rounded-apple text-sm font-medium cursor-pointer transition-all duration-150
                      ${active
                        ? 'bg-accent-soft text-accent-ink border border-accent/20'
                        : 'bg-elevated text-ink-soft border border-hairline hover:bg-surface hover:border-ink-faint'}`}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cliente — dropdown */}
          <SelectField
            label="Cliente"
            value={cliente}
            onChange={setCliente}
            placeholder="Nenhum cliente"
            options={clientsList.map(c => ({ value: c.nome, label: c.nome }))}
          />

          {/* Data de entrega */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">
              Data de entrega
            </label>
            <input
              type="date"
              value={dataEntrega}
              onChange={e => setDataEntrega(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!nome.trim() || saving}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar Tarefa
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Tarefas() {
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [filterMember, setFilterMember] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clientsList,  setClientsList]  = useState([]);
  const [membersList,  setMembersList]  = useState([]);

  const loadTasks = () => {
    setLoading(true);
    fetch('/api/crm/tasks')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
    // Fetch clients and team members for filters/modal
    fetch('/api/crm/clients')
      .then(r => r.json())
      .then(d => setClientsList(d.clients || []))
      .catch(() => {});
    fetch('/api/crm/team')
      .then(r => r.json())
      .then(d => setMembersList((d.members || []).map(m => m.nome).filter(Boolean)))
      .catch(() => {});
  }, []);

  const toggle = async (task) => {
    const next = task.status === 'Concluído' ? 'Pendente' : 'Concluído';
    setToggling(task.id);
    const res = await fetch('/api/crm/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: next }),
    });
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    }
    setToggling(null);
  };

  const deleteTask = async (id) => {
    // Optimistic removal from UI
    setTasks(prev => prev.filter(t => t.id !== id));
    // Archive in Notion
    await fetch('/api/crm/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const createTask = async (data) => {
    const res = await fetch('/api/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks(prev => [task, ...prev]);
    }
  };

  const updateNote = async (id, notas) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notas } : t));
    await fetch('/api/crm/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notas }),
    });
  };

  // Filter
  const filtered = tasks.filter(t => {
    const members = Array.isArray(t.responsavel) ? t.responsavel : [t.responsavel];
    if (filterMember && !members.some(m => m?.toLowerCase() === filterMember.toLowerCase())) return false;
    if (filterClient && t.cliente?.toLowerCase() !== filterClient.toLowerCase()) return false;
    return true;
  });

  const pending  = filtered.filter(t => t.status !== 'Concluído')
    .sort((a,b) => {
      if (!a.dataEntrega) return 1;
      if (!b.dataEntrega) return -1;
      return new Date(a.dataEntrega) - new Date(b.dataEntrega);
    });
  const done = filtered.filter(t => t.status === 'Concluído');


  return (
    <CRMLayout title="Tarefas — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="t-hero tracking-apple-tight text-ink flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-accent" strokeWidth={2} />
              Tarefas
            </h1>
            <p className="t-body text-ink-muted mt-1">
              {pending.length} pendente{pending.length !== 1 ? 's' : ''} · {done.length} concluída{done.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 items-end">
          <div className="w-48">
            <SelectField
              label="Responsável"
              value={filterMember}
              onChange={setFilterMember}
              placeholder="Todos"
              options={(membersList.length ? membersList : ['Matheus', 'Sávio'])
                .map(m => ({ value: m, label: m }))}
            />
          </div>
          <div className="w-48">
            <SelectField
              label="Cliente"
              value={filterClient}
              onChange={setFilterClient}
              placeholder="Todos os clientes"
              options={clientsList.map(c => ({ value: c.nome, label: c.nome }))}
            />
          </div>
          {(filterMember || filterClient) && (
            <button
              onClick={() => { setFilterMember(''); setFilterClient(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-apple text-xs font-medium
                text-ink-muted hover:text-ink hover:bg-elevated border border-hairline
                transition-all cursor-pointer mb-0.5">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, col) => (
              <div key={col} className="space-y-3">
                <div className="h-5 w-28 bg-elevated rounded-apple animate-pulse mb-4" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface border border-hairline rounded-apple-lg animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pendente */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="dot dot-orange" />
                <h2 className="t-eyebrow text-ink-soft">Pendente</h2>
                <span className="badge badge-orange">
                  {pending.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {pending.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} onUpdateNote={updateNote} toggling={toggling} />
                ))}
                {pending.length === 0 && (
                  <div className="rounded-apple-lg p-10 text-center bg-surface border border-dashed border-hairline">
                    <CheckCircle2 className="w-8 h-8 text-ok/50 mx-auto mb-2.5" strokeWidth={1.5} />
                    <p className="t-body text-ink-muted font-medium">Tudo em dia</p>
                  </div>
                )}
              </div>
            </div>

            {/* Concluído */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="dot dot-green" />
                <h2 className="t-eyebrow text-ink-soft">Concluído</h2>
                <span className="badge badge-green">
                  {done.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {done.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} onUpdateNote={updateNote} toggling={toggling} />
                ))}
                {done.length === 0 && (
                  <div className="rounded-apple-lg p-10 text-center bg-surface border border-dashed border-hairline">
                    <Circle className="w-8 h-8 text-ink-faint mx-auto mb-2.5" strokeWidth={1.5} />
                    <p className="t-body text-ink-muted font-medium">Nenhuma tarefa concluída</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewTaskModal onClose={() => setShowModal(false)} onCreate={createTask} clientsList={clientsList} membersList={membersList} />
      )}
    </CRMLayout>
  );
}
