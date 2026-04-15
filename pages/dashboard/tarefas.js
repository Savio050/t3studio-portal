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
  'Pendente':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', dot: 'bg-amber-500' },
  'Concluído': { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)', dot: 'bg-emerald-500' },
};

const CLIENT_COLORS = {
  'mafro':       { bg: 'rgba(6,182,212,0.12)',  text: '#22d3ee',  border: 'rgba(6,182,212,0.25)'  },
  'fast imoveis':{ bg: 'rgba(244,63,94,0.12)',  text: '#fb7185',  border: 'rgba(244,63,94,0.25)'  },
};

const MEMBER_COLORS = {
  'Matheus': { bg: 'rgba(124,58,237,0.15)', text: '#a78bfa' },
  'savio':   { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
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
  const client   = CLIENT_COLORS[task.cliente] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.15)' };
  const members  = Array.isArray(task.responsavel) ? task.responsavel : (task.responsavel ? [task.responsavel] : []);

  return (
    <div className={`rounded-2xl p-4 transition-all duration-200 group ${isDone ? 'opacity-60' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${due?.urgent && !isDone ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
      }}>

      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Toggle checkbox */}
        <button
          onClick={() => onToggle(task)}
          disabled={toggling === task.id}
          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
          className="mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center
            cursor-pointer transition-all duration-200 hover:scale-110 disabled:opacity-60"
          style={{
            borderColor: isDone ? '#10b981' : 'rgba(255,255,255,0.2)',
            background: isDone ? 'rgba(16,185,129,0.15)' : 'transparent',
          }}>
          {toggling === task.id
            ? <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
            : isDone
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : null
          }
        </button>

        {/* Task name */}
        <p className={`flex-1 text-sm font-medium leading-snug transition-all duration-200
          ${isDone ? 'line-through text-white/30' : 'text-white/90'}`}>
          {task.nome}
        </p>

        {/* Delete */}
        <button onClick={() => onDelete(task.id)}
          aria-label="Excluir tarefa"
          className="w-6 h-6 flex items-center justify-center rounded-lg
            text-white/15 hover:text-rose-400 hover:bg-rose-500/10
            opacity-0 group-hover:opacity-100
            transition-all duration-150 cursor-pointer shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Meta row */}
      {(task.cliente || members.length > 0 || task.dataEntrega) && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pl-8">
          {task.cliente && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: client.bg, color: client.text, border: `1px solid ${client.border}` }}>
              <Tag className="w-2.5 h-2.5" />
              {task.cliente}
            </span>
          )}
          {members.map(m => {
            const mc = MEMBER_COLORS[m] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' };
            return (
              <span key={m} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: mc.bg, color: mc.text }}>
                <User className="w-2.5 h-2.5" />
                {m}
              </span>
            );
          })}
          {due && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
              ${due.urgent && !isDone
                ? 'bg-rose-500/15 text-rose-400'
                : due.warn && !isDone
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-white/5 text-white/30'
              }`}>
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'rgba(13,22,37,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white font-display">Nova Tarefa</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
              text-white/40 hover:text-white hover:bg-white/[0.06]
              transition-all duration-150 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
              Tarefa *
            </label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Criar roteiro do Reels..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20
                font-medium transition-all duration-150 outline-none
                focus:ring-2 focus:ring-violet-500/50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
              Responsável
            </label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const mc = MEMBER_COLORS[m] || {};
                const active = responsavel.includes(m);
                return (
                  <button type="button" key={m}
                    onClick={() => toggleMember(m)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                      transition-all duration-150"
                    style={{
                      background: active ? mc.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? (mc.bg || 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.08)'}`,
                      color: active ? mc.text : 'rgba(255,255,255,0.4)',
                    }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
              Cliente
            </label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setCliente('')}
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150"
                style={{
                  background: !cliente ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: !cliente ? 'white' : 'rgba(255,255,255,0.3)',
                }}>
                Nenhum
              </button>
              {CLIENTS.map(c => {
                const cc = CLIENT_COLORS[c] || {};
                const active = cliente === c;
                return (
                  <button type="button" key={c}
                    onClick={() => setCliente(c)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer
                      transition-all duration-150"
                    style={{
                      background: active ? cc.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? cc.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? cc.text : 'rgba(255,255,255,0.3)',
                    }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data de entrega */}
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wider">
              Data de entrega
            </label>
            <input
              type="date"
              value={dataEntrega}
              onChange={e => setDataEntrega(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white font-medium
                transition-all duration-150 outline-none
                focus:ring-2 focus:ring-violet-500/50 [color-scheme:dark]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Submit */}
          <button type="submit" disabled={!nome.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              text-sm font-bold text-white cursor-pointer
              transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
              hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
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
    // Archive (Notion doesn't hard-delete, so we just remove from local state)
    setTasks(prev => prev.filter(t => t.id !== id));
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

  const FilterChip = ({ value, current, onChange, label, color }) => (
    <button
      onClick={() => onChange(current === value ? '' : value)}
      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer"
      style={{
        background: current === value ? (color + '20') : 'rgba(255,255,255,0.05)',
        border: `1px solid ${current === value ? (color + '40') : 'rgba(255,255,255,0.08)'}`,
        color: current === value ? color : 'rgba(255,255,255,0.4)',
      }}>
      {label}
    </button>
  );

  return (
    <CRMLayout title="Tarefas — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-violet-400" />
              Tarefas
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {pending.length} pendente{pending.length !== 1 ? 's' : ''} · {done.length} concluída{done.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-white cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-white/30 font-medium py-1.5 self-center">Filtrar:</span>
          {MEMBERS.map(m => {
            const mc = MEMBER_COLORS[m] || { bg: '#fff', text: '#fff' };
            return (
              <FilterChip key={m} value={m} current={filterMember} onChange={setFilterMember}
                label={m} color={mc.text} />
            );
          })}
          <div className="w-px h-6 self-center" style={{ background: 'rgba(255,255,255,0.08)' }} />
          {CLIENTS.map(c => {
            const cc = CLIENT_COLORS[c] || { text: '#fff' };
            return (
              <FilterChip key={c} value={c} current={filterClient} onChange={setFilterClient}
                label={c} color={cc.text} />
            );
          })}
          {(filterMember || filterClient) && (
            <button onClick={() => { setFilterMember(''); setFilterClient(''); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer
                bg-white/5 border border-white/10 text-white/30 hover:text-white/60">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div className="grid lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, col) => (
              <div key={col} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-5 w-28 bg-white/10 rounded-lg animate-pulse mb-4" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Pendente */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-sm font-semibold text-white/70">Pendente</h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">
                  {pending.length}
                </span>
              </div>
              <div className="space-y-3">
                {pending.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} toggling={toggling} />
                ))}
                {pending.length === 0 && (
                  <div className="rounded-2xl p-8 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                    <p className="text-sm text-white/30 font-medium">Tudo em dia!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Concluído */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-white/70">Concluído</h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                  {done.length}
                </span>
              </div>
              <div className="space-y-3">
                {done.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} toggling={toggling} />
                ))}
                {done.length === 0 && (
                  <div className="rounded-2xl p-8 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <Circle className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30 font-medium">Nenhuma tarefa concluída</p>
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
