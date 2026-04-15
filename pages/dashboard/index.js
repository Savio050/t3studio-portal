import { useState, useEffect } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  CheckSquare, Film, Users, TrendingUp, Clock, AlertCircle,
  ChevronRight, Loader2, ArrowUpRight, CheckCircle2,
  Zap, Calendar,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const relativeDate = (d) => {
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const date  = new Date(d); date.setHours(0,0,0,0);
  const diff  = Math.round((date - today) / 86400000);
  if (diff < 0)  return `${Math.abs(diff)}d atraso`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7)  return `${diff}d`;
  return fmt(d);
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const statusLabel = (s) => {
  const map = {
    'pendente': 'Pendente',
    'aguardando aprovação': 'Aguardando',
    'ajuste solicitado': 'Ajuste',
    'em produção': 'Em produção',
    'aprovado': 'Aprovado',
    'concluído': 'Concluído',
    'concluido': 'Concluído',
    'não iniciado': 'Não iniciado',
    'não iniciada': 'Não iniciado',
  };
  const key = (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const [k,v] of Object.entries(map)) {
    if (key.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return v;
  }
  return s || '';
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, href, loading }) {
  const card = (
    <div className="relative overflow-hidden rounded-2xl p-5 group cursor-pointer transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.03)' }} />

      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors duration-150" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-16 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-3.5 w-24 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white font-display tabular-nums">{value ?? '—'}</p>
          <p className="text-xs text-white/50 font-medium mt-1">{label}</p>
          {sub && <p className="text-[11px] mt-1" style={{ color: `${color}bb` }}>{sub}</p>}
        </>
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function TaskRow({ task }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = task.dataEntrega ? new Date(task.dataEntrega) : null;
  if (due) due.setHours(0,0,0,0);
  const overdue = due && due < today;
  const urgentSoon = due && !overdue && (due - today) / 86400000 <= 2;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        overdue ? 'bg-rose-500' : urgentSoon ? 'bg-amber-500' : 'bg-violet-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{task.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.cliente && (
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
              {task.cliente}
            </span>
          )}
          {task.responsavel?.length > 0 && (
            <span className="text-[10px] text-white/30">
              {Array.isArray(task.responsavel) ? task.responsavel.join(', ') : task.responsavel}
            </span>
          )}
        </div>
      </div>
      {task.dataEntrega && (
        <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full ${
          overdue
            ? 'bg-rose-500/15 text-rose-400'
            : urgentSoon
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-white/5 text-white/40'
        }`}>
          {relativeDate(task.dataEntrega)}
        </span>
      )}
    </div>
  );
}

function ContentRow({ item }) {
  const statusColors = {
    'aguardando': { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', dot: '#f59e0b' },
    'aprovado':   { bg: 'rgba(16,185,129,0.12)', text: '#34d399', dot: '#10b981' },
    'producao':   { bg: 'rgba(14,165,233,0.12)', text: '#38bdf8', dot: '#0ea5e9' },
    'ajuste':     { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', dot: '#f97316' },
    'concluido':  { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', dot: '#64748b' },
  };

  const raw = (item.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let colorKey = 'concluido';
  if (raw.includes('aguardando')) colorKey = 'aguardando';
  else if (raw === 'aprovado')    colorKey = 'aprovado';
  else if (raw.includes('producao') || raw.includes('produção')) colorKey = 'producao';
  else if (raw.includes('ajuste')) colorKey = 'ajuste';
  const c = statusColors[colorKey];

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{item.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.cliente && (
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
              {item.cliente}
            </span>
          )}
          {item.formato && (
            <span className="text-[10px] text-white/25">{item.formato}</span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded-full"
        style={{ background: c.bg, color: c.text }}>
        {statusLabel(item.estado)}
      </span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/crm/stats').then(r => r.json()),
      fetch('/api/crm/tasks').then(r => r.json()),
      fetch('/api/crm/content').then(r => r.json()),
    ]).then(([s, t, c]) => {
      setStats(s);
      setTasks(t.tasks || []);
      setContent(c.content || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Pending / upcoming tasks sorted by deadline
  const today = new Date(); today.setHours(0,0,0,0);
  const pendingTasks = tasks
    .filter(t => t.status !== 'Concluído')
    .sort((a, b) => {
      if (!a.dataEntrega) return 1;
      if (!b.dataEntrega) return -1;
      return new Date(a.dataEntrega) - new Date(b.dataEntrega);
    })
    .slice(0, 5);

  // Content awaiting approval
  const awaitingContent = content
    .filter(c => {
      const s = (c.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return s.includes('aguardando');
    })
    .slice(0, 5);

  const recentContent = content
    .filter(c => {
      const s = (c.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return !s.includes('aguardando');
    })
    .slice(0, 4);

  const statCards = [
    {
      icon: CheckSquare,
      label: 'Tarefas pendentes',
      value: stats?.tasks?.pending,
      sub: stats?.tasks?.overdue > 0 ? `${stats.tasks.overdue} atrasada${stats.tasks.overdue > 1 ? 's' : ''}` : null,
      color: '#7c3aed',
      href: '/dashboard/tarefas',
    },
    {
      icon: AlertCircle,
      label: 'Aguardando aprovação',
      value: stats?.content?.awaitingApproval,
      sub: stats?.content?.awaitingScript > 0 ? `+${stats.content.awaitingScript} roteiros` : null,
      color: '#f59e0b',
      href: '/dashboard/conteudo',
    },
    {
      icon: Film,
      label: 'Conteúdos este mês',
      value: stats?.content?.thisMonth,
      sub: `${stats?.content?.approved ?? '—'} aprovados`,
      color: '#06b6d4',
      href: '/dashboard/conteudo',
    },
    {
      icon: Users,
      label: 'Clientes ativos',
      value: stats?.clients?.total,
      sub: `${stats?.content?.total ?? '—'} conteúdos totais`,
      color: '#10b981',
      href: '/dashboard/clientes',
    },
  ];

  return (
    <CRMLayout title="Dashboard — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-6 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-violet-400 font-semibold tracking-wider uppercase">CRM Interno</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-display">
            {greeting()}, T3 Studio
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map((card, i) => (
            <StatCard key={i} {...card} loading={loading} />
          ))}
        </div>

        {/* ── Main content grid ── */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* ── Pending Tasks ── */}
          <div className="lg:col-span-3 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white font-display">Tarefas em aberto</h2>
                {stats?.tasks?.pending > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">
                    {stats.tasks.pending}
                  </span>
                )}
              </div>
              <Link href="/dashboard/tarefas"
                className="flex items-center gap-1 text-xs text-white/30 hover:text-violet-400
                  transition-colors duration-150 cursor-pointer">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_,i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pendingTasks.length > 0 ? (
              <div>
                {pendingTasks.map(task => <TaskRow key={task.id} task={task} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-sm font-medium text-white/40">Todas as tarefas concluídas!</p>
                <p className="text-xs text-white/20 mt-1">Nenhuma tarefa pendente.</p>
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Awaiting Approval */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-sm font-semibold text-white font-display">Aguardando aprovação</h2>
                </div>
                <Link href="/dashboard/conteudo"
                  className="text-xs text-white/30 hover:text-amber-400 transition-colors duration-150 cursor-pointer flex items-center gap-1">
                  Ver <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_,i) => (
                    <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : awaitingContent.length > 0 ? (
                <div>
                  {awaitingContent.map(item => <ContentRow key={item.id} item={item} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/40 mb-1.5" />
                  <p className="text-xs text-white/40">Nenhuma pendência</p>
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white font-display">Conteúdo recente</h2>
                </div>
                <Link href="/dashboard/conteudo"
                  className="text-xs text-white/30 hover:text-cyan-400 transition-colors duration-150 cursor-pointer flex items-center gap-1">
                  Ver <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i) => (
                    <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentContent.length > 0 ? (
                <div>
                  {recentContent.map(item => <ContentRow key={item.id} item={item} />)}
                </div>
              ) : (
                <p className="text-xs text-white/30 text-center py-6">Sem conteúdo recente</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Nova Tarefa',      href: '/dashboard/tarefas',    color: '#7c3aed', icon: CheckSquare },
            { label: 'Ver Conteúdo',     href: '/dashboard/conteudo',   color: '#f59e0b', icon: Film        },
            { label: 'Clientes',         href: '/dashboard/clientes',   color: '#10b981', icon: Users       },
            { label: 'Calendário',       href: '/dashboard/calendario', color: '#06b6d4', icon: Calendar    },
          ].map(({ label, href, color, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                text-white/60 hover:text-white transition-all duration-150 cursor-pointer group"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Icon className="w-4 h-4 shrink-0 transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              {label}
              <ChevronRight className="w-3 h-3 ml-auto text-white/15 group-hover:text-white/40 transition-colors duration-150" />
            </Link>
          ))}
        </div>
      </div>
    </CRMLayout>
  );
}
