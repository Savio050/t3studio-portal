import { useState, useEffect, useRef } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Plus, CheckSquare, Circle, CheckCircle2, Clock, X,
  Loader2, User, Calendar, Tag, ChevronDown, Trash2,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUSES   = ['Pendente', 'Concluído'];
const MEMBERS    = ['Matheus', 'savio'];
const CLIENTS    = ['mafro', 'fast imoveis'];

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
function TaskCard({ task, onToggle, onDelete, toggling }) {
  const due      = task.dataEntrega ? relativeDate(task.dataEntrega) : null;
  const isDone   = task.status === 'Concluído';
  const members  = Array.isArray(task.responsavel) ? task.responsavel : (task.responsavel ? [task.responsavel] : []);

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
    </div>
  );
}

// ── New Task Modal ────────────────────────────────────────────────────────────
function NewTaskModal({ onClose, onCreate }) {
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

          {/* Responsável */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">
              Responsável
            </label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const active = responsavel.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleMember(m)}
                    className={`flex-1 py-2.5 rounded-apple text-sm font-medium cursor-pointer transition-all duration-150
                      ${active
                        ? 'bg-accent-soft text-accent-ink border border-accent/20'
                        : 'bg-elevated text-ink-soft border border-hairline hover:bg-surface hover:border-ink-faint'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">
              Cliente
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCliente('')}
                className={`px-3 py-2 rounded-apple text-xs font-medium cursor-pointer transition-all duration-150
                  ${!cliente
                    ? 'bg-accent-soft text-accent-ink border border-accent/20'
                    : 'bg-elevated text-ink-muted border border-hairline hover:bg-surface'}`}
              >
                Nenhum
              </button>
              {CLIENTS.map(c => {
                const active = cliente === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCliente(c)}
                    className={`flex-1 py-2 rounded-apple text-xs font-semibold cursor-pointer transition-all duration-150
                      ${active
                        ? 'bg-accent-soft text-accent-ink border border-accent/20'
                        : 'bg-elevated text-ink-muted border border-hairline hover:bg-surface'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

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

  const loadTasks = () => {
    setLoading(true);
    fetch('/api/crm/tasks')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

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

  const FilterChip = ({ value, current, onChange, label }) => {
    const active = current === value;
    return (
      <button
        onClick={() => onChange(active ? '' : value)}
        className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-all duration-150 cursor-pointer
          ${active
            ? 'bg-accent-soft text-accent-ink border border-accent/20'
            : 'bg-surface text-ink-soft border border-hairline hover:bg-elevated'}`}
      >
        {label}
      </button>
    );
  };

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
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <span className="t-small text-ink-muted font-medium mr-1">Filtrar</span>
          {MEMBERS.map(m => (
            <FilterChip key={m} value={m} current={filterMember} onChange={setFilterMember} label={m} />
          ))}
          <div className="w-px h-5 bg-hairline mx-1" />
          {CLIENTS.map(c => (
            <FilterChip key={c} value={c} current={filterClient} onChange={setFilterClient} label={c} />
          ))}
          {(filterMember || filterClient) && (
            <button
              onClick={() => { setFilterMember(''); setFilterClient(''); }}
              className="px-3 py-1.5 rounded-pill text-xs font-medium transition-all duration-150 cursor-pointer
                text-ink-muted hover:text-ink hover:bg-elevated"
            >
              Limpar filtros
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
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} toggling={toggling} />
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
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} toggling={toggling} />
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
        <NewTaskModal onClose={() => setShowModal(false)} onCreate={createTask} />
      )}
    </CRMLayout>
  );
}
