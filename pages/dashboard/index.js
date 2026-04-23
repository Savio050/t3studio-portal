import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  CheckSquare, Film, Users, TrendingUp, AlertCircle,
  ChevronRight, ArrowUpRight, CheckCircle2, Calendar, Activity,
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
  if (diff < 0)   return `${Math.abs(diff)}d atraso`;
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
    'em produção': 'Produção',
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

const badgeClassFor = (s) => {
  const raw = (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (raw.includes('aguardando')) return 'badge badge-orange';
  if (raw === 'aprovado')         return 'badge badge-green';
  if (raw.includes('producao'))   return 'badge badge-blue';
  if (raw.includes('ajuste'))     return 'badge badge-orange';
  if (raw.includes('concluido'))  return 'badge badge-neutral';
  return 'badge badge-neutral';
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, href, loading }) {
  const card = (
    <div className="card card-interactive p-5 group h-full">
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: `${color}14`, color }}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-300 group-hover:text-ink-muted transition-colors" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-16 bg-elevated rounded-lg animate-pulse" />
          <div className="h-3.5 w-24 bg-elevated rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-[30px] font-semibold text-ink tabular tracking-apple-tight leading-none">
            {value ?? '—'}
          </p>
          <p className="text-[13px] text-ink-muted font-medium mt-2">{label}</p>
          {sub && <p className="text-[12px] mt-1 font-medium" style={{ color }}>{sub}</p>}
        </>
      )}
    </div>
  );

  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}

function TaskRow({ task }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = task.dataEntrega ? new Date(task.dataEntrega) : null;
  if (due) due.setHours(0,0,0,0);
  const overdue    = due && due < today;
  const urgentSoon = due && !overdue && (due - today) / 86400000 <= 2;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0 group">
      <div className={`dot shrink-0 ${overdue ? 'dot-red' : urgentSoon ? 'dot-orange' : 'dot-blue'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate leading-snug">{task.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.cliente && (
            <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide">
              {task.cliente}
            </span>
          )}
          {task.responsavel?.length > 0 && (
            <>
              <span className="text-[11px] text-ink-faint">·</span>
              <span className="text-[11px] text-ink-muted">
                {Array.isArray(task.responsavel) ? task.responsavel.join(', ') : task.responsavel}
              </span>
            </>
          )}
        </div>
      </div>
      {task.dataEntrega && (
        <span className={`shrink-0 ${
          overdue ? 'badge badge-red' : urgentSoon ? 'badge badge-orange' : 'badge badge-neutral'
        }`}>
          {relativeDate(task.dataEntrega)}
        </span>
      )}
    </div>
  );
}

function ContentRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate leading-snug">{item.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.cliente && (
            <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide">
              {item.cliente}
            </span>
          )}
          {item.formato && (
            <>
              <span className="text-[11px] text-ink-faint">·</span>
              <span className="text-[11px] text-ink-muted">{item.formato}</span>
            </>
          )}
        </div>
      </div>
      <span className={`${badgeClassFor(item.estado)} shrink-0`}>
        {statusLabel(item.estado)}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, count, href, hrefLabel = 'Ver', children }) {
  return (
    <section className="card p-6">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: `${iconColor}14`, color: iconColor }}>
              <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
          )}
          <h2 className="text-[16px] font-semibold text-ink tracking-apple-snug">{title}</h2>
          {count != null && count > 0 && (
            <span className="badge badge-neutral tabular">{count}</span>
          )}
        </div>
        {href && (
          <Link href={href}
            className="flex items-center gap-0.5 text-[13px] text-accent hover:text-accent-hover font-medium transition-colors">
            {hrefLabel}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </header>
      {children}
    </section>
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

  const pendingTasks = tasks
    .filter(t => t.status !== 'Concluído')
    .sort((a, b) => {
      if (!a.dataEntrega) return 1;
      if (!b.dataEntrega) return -1;
      return new Date(a.dataEntrega) - new Date(b.dataEntrega);
    })
    .slice(0, 5);

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

  // ── Team Capacity ────────────────────────────────────────────────────────
  const MEMBERS = ['Matheus', 'Sávio'];
  const CAPACITY_MAX = 30;

  const MEMBER_COLORS = {
    'Matheus': { bg: '#7c3aed', initials: 'MA' },
    'Sávio':   { bg: '#0284c7', initials: 'SA' },
  };

  const isInProgress = (item) => {
    const s = (item.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return !s.includes('concluido') && !s.includes('postado');
  };

  const zone = (pts) => {
    if (pts >= 25) return { color: '#ff3b30', label: 'Sobrecarregado', bg: 'rgba(255,59,48,0.08)' };
    if (pts >= 15) return { color: '#ff9500', label: 'Ocupado',        bg: 'rgba(255,149,0,0.08)' };
    return           { color: '#34c759', label: 'Disponível',      bg: 'rgba(52,199,89,0.08)' };
  };

  const capacity = useMemo(() => {
    const map = {};
    MEMBERS.forEach(m => { map[m] = 0; });
    content.filter(isInProgress).forEach(c => {
      const pts = parseInt(c.pontos) || 1;
      const resp = (c.responsavel || '').trim();
      if (map[resp] !== undefined) map[resp] += pts;
    });
    return map;
  }, [content]);

  const statCards = [
    {
      icon: CheckSquare,
      label: 'Tarefas pendentes',
      value: stats?.tasks?.pending,
      sub: stats?.tasks?.overdue > 0 ? `${stats.tasks.overdue} atrasada${stats.tasks.overdue > 1 ? 's' : ''}` : null,
      color: '#0071e3',
      href: '/dashboard/tarefas',
    },
    {
      icon: AlertCircle,
      label: 'Aguardando aprovação',
      value: stats?.content?.awaitingApproval,
      sub: stats?.content?.awaitingScript > 0 ? `+${stats.content.awaitingScript} roteiros` : null,
      color: '#ff9500',
      href: '/dashboard/conteudo',
    },
    {
      icon: Film,
      label: 'Conteúdos este mês',
      value: stats?.content?.thisMonth,
      sub: `${stats?.content?.approved ?? '—'} aprovados`,
      color: '#af52de',
      href: '/dashboard/conteudo',
    },
    {
      icon: Users,
      label: 'Clientes ativos',
      value: stats?.clients?.total,
      sub: `${stats?.content?.total ?? '—'} conteúdos totais`,
      color: '#28cd41',
      href: '/dashboard/clientes',
    },
  ];

  return (
    <CRMLayout title="Dashboard — T3 Studio">
      <div className="px-5 lg:px-10 py-8 lg:py-10 max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-10 animate-slide-up">
          <p className="t-eyebrow mb-2 text-accent">CRM Interno</p>
          <h1 className="t-hero">
            {greeting()}, T3 Studio
          </h1>
          <p className="text-[15px] text-ink-muted mt-2">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <StatCard key={i} {...card} loading={loading} />
          ))}
        </div>

        {/* ── Main content grid ── */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Pending Tasks */}
          <div className="lg:col-span-3">
            <SectionCard
              title="Tarefas em aberto"
              icon={CheckSquare}
              iconColor="#0071e3"
              count={stats?.tasks?.pending}
              href="/dashboard/tarefas"
              hrefLabel="Ver todas">

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_,i) => (
                    <div key={i} className="h-12 bg-elevated rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pendingTasks.length > 0 ? (
                <div>
                  {pendingTasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-ok-soft flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-ok" />
                  </div>
                  <p className="text-[14px] font-medium text-ink">Tudo em dia!</p>
                  <p className="text-[13px] text-ink-faint mt-0.5">Nenhuma tarefa pendente.</p>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-5">

            <SectionCard
              title="Aguardando aprovação"
              icon={AlertCircle}
              iconColor="#ff9500"
              href="/dashboard/conteudo">

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_,i) => (
                    <div key={i} className="h-10 bg-elevated rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : awaitingContent.length > 0 ? (
                <div>
                  {awaitingContent.map(item => <ContentRow key={item.id} item={item} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-5 h-5 text-ok mb-1.5" />
                  <p className="text-[13px] text-ink-muted">Nenhuma pendência</p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Conteúdo recente"
              icon={TrendingUp}
              iconColor="#af52de"
              href="/dashboard/conteudo">

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_,i) => (
                    <div key={i} className="h-10 bg-elevated rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentContent.length > 0 ? (
                <div>
                  {recentContent.map(item => <ContentRow key={item.id} item={item} />)}
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint text-center py-6">Sem conteúdo recente</p>
              )}
            </SectionCard>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="mt-8">
          <p className="t-eyebrow mb-3">Atalhos</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Nova Tarefa',     href: '/dashboard/tarefas',    color: '#0071e3', icon: CheckSquare },
              { label: 'Ver Conteúdo',    href: '/dashboard/conteudo',   color: '#ff9500', icon: Film        },
              { label: 'Clientes',        href: '/dashboard/clientes',   color: '#28cd41', icon: Users       },
              { label: 'Calendário',      href: '/dashboard/calendario', color: '#af52de', icon: Calendar    },
            ].map(({ label, href, color, icon: Icon }) => (
              <Link key={href} href={href}
                className="card card-interactive flex items-center gap-3 px-4 py-3.5 group">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: `${color}14`, color }}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-medium text-ink flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-muted-300 group-hover:text-ink-muted transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Capacidade da Equipe ── */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-accent" strokeWidth={2} />
            <p className="t-eyebrow">Capacidade da Equipe</p>
          </div>

          <div className="card p-6">
            {loading ? (
              <div className="space-y-5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-elevated rounded animate-pulse" />
                    <div className="h-3 w-full bg-elevated rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  {MEMBERS.map((member) => {
                    const pts = capacity[member] ?? 0;
                    const pct = Math.min(pts / CAPACITY_MAX, 1) * 100;
                    const { color, label, bg } = zone(pts);
                    const avatar = MEMBER_COLORS[member];

                    return (
                      <div key={member}>
                        <div className="flex items-center gap-3 mb-2">
                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold tracking-wide"
                            style={{ background: avatar?.bg ?? '#888' }}>
                            {avatar?.initials ?? member.slice(0, 2).toUpperCase()}
                          </div>

                          {/* Name + pts */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[14px] font-medium text-ink">{member}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-ink-muted tabular">{pts} pts</span>
                                <span
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ color, background: bg }}>
                                  {label}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <p className="text-[11px] text-ink-faint mt-5 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                  1pt = Post &nbsp;·&nbsp; 2pts = Carrossel &nbsp;·&nbsp; 3pts = Vídeo &nbsp;·&nbsp; 4pts = Edição &nbsp;·&nbsp; 5pts = Hero
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
