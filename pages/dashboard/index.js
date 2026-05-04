import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import CRMLayout from '../../components/crm/Layout';
import {
  CheckSquare, Film, Users, TrendingUp, AlertCircle,
  ChevronRight, ArrowUpRight, CheckCircle2, Calendar, Activity,
  Megaphone, Zap, BarChart3,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
};

const relativeDate = (d) => {
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const date  = new Date(d); date.setHours(0,0,0,0);
  const diff  = Math.round((date - today) / 86400000);
  if (diff < 0)   return `${Math.abs(diff)}d atraso`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7)  return `em ${diff}d`;
  return fmt(d);
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const nrm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

const badgeClassFor = (s) => {
  const raw = nrm(s);
  if (raw.includes('aguardando')) return 'badge badge-orange';
  if (raw === 'aprovado')         return 'badge badge-green';
  if (raw.includes('producao'))   return 'badge badge-blue';
  if (raw.includes('ajuste'))     return 'badge badge-orange';
  if (raw.includes('concluido'))  return 'badge badge-neutral';
  return 'badge badge-neutral';
};

const statusLabel = (s) => {
  const raw = nrm(s);
  if (raw.includes('aguardando')) return 'Aguardando';
  if (raw === 'aprovado')         return 'Aprovado';
  if (raw.includes('producao'))   return 'Produção';
  if (raw.includes('ajuste'))     return 'Ajuste';
  if (raw.includes('concluido'))  return 'Concluído';
  return s || '';
};

// ── Cálculo de próxima data comemorativa ──────────────────────────────────────
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function dKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function getNthWeekday(y, m, wd, n) {
  const first = new Date(y, m, 1);
  return new Date(y, m, 1 + ((wd - first.getDay() + 7) % 7) + (n-1)*7);
}
function getLastWeekday(y, m, wd) {
  const last = new Date(y, m+1, 0);
  return new Date(y, m, last.getDate() - ((last.getDay()-wd+7)%7));
}
function getEaster(year) {
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m2=Math.floor((a+11*h+22*l)/451);
  const mo=Math.floor((h+l-7*m2+114)/31);
  return new Date(year,mo-1,((h+l-7*m2+114)%31)+1);
}
function buildHolidayMap(year) {
  const easter = getEaster(year);
  const map = {};
  const add = (d,name) => { const k=dKey(d); if(!map[k]) map[k]=name; };
  add(new Date(year,0,1),'Ano Novo'); add(new Date(year,0,6),'Dia de Reis');
  add(new Date(year,1,14),'Dia da Amizade');
  add(addDays(easter,-48),'Carnaval'); add(addDays(easter,-47),'Carnaval');
  add(addDays(easter,-2),'Sexta-Feira Santa'); add(easter,'Páscoa');
  add(new Date(year,2,8),'Dia da Mulher'); add(new Date(year,2,15),'Dia do Consumidor');
  add(new Date(year,3,1),'Dia da Mentira'); add(new Date(year,3,7),'Dia da Saúde');
  add(new Date(year,3,19),'Povos Indígenas'); add(new Date(year,3,21),'Tiradentes');
  add(new Date(year,3,22),'Dia da Terra'); add(new Date(year,3,23),'Dia do Livro');
  add(new Date(year,4,1),'Dia do Trabalho');
  add(getNthWeekday(year,4,0,2),'Dia das Mães');
  add(new Date(year,4,13),'Abolição da Escravatura');
  add(addDays(easter,60),'Corpus Christi');
  add(new Date(year,5,5),'Dia do Meio Ambiente'); add(new Date(year,5,12),'Dia dos Namorados');
  add(new Date(year,5,21),'Início do Inverno'); add(new Date(year,5,24),'São João');
  add(new Date(year,5,28),'Orgulho LGBTQIA+');
  add(new Date(year,6,7),'Dia do Chocolate'); add(new Date(year,6,13),'Dia do Rock');
  add(new Date(year,6,20),'Dia do Amigo'); add(new Date(year,6,26),'Dia dos Avós');
  add(getNthWeekday(year,7,0,2),'Dia dos Pais');
  add(new Date(year,7,19),'Dia da Fotografia'); add(new Date(year,7,22),'Dia do Folclore');
  add(new Date(year,8,7),'Independência do Brasil'); add(new Date(year,8,15),'Dia do Cliente');
  add(new Date(year,8,22),'Início da Primavera');
  add(new Date(year,9,1),'Dia do Idoso'); add(new Date(year,9,4),'Dia dos Animais');
  add(new Date(year,9,12),'Nossa Sra. Aparecida / Dia das Crianças');
  add(new Date(year,9,15),'Dia do Professor'); add(new Date(year,9,31),'Halloween');
  add(new Date(year,10,2),'Finados'); add(new Date(year,10,15),'Proclamação da República');
  add(new Date(year,10,20),'Consciência Negra');
  add(getLastWeekday(year,10,5),'Black Friday');
  add(new Date(year,11,1),'Combate à AIDS'); add(new Date(year,11,25),'Natal');
  add(new Date(year,11,31),'Réveillon');
  return map;
}
function getNextHoliday() {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = dKey(today);
  const years = [today.getFullYear(), today.getFullYear()+1];
  let entries = [];
  years.forEach(y => {
    const map = buildHolidayMap(y);
    Object.entries(map).forEach(([k,name]) => {
      if (k >= todayKey) entries.push({ key: k, name });
    });
  });
  entries.sort((a,b) => a.key.localeCompare(b.key));
  if (!entries.length) return null;
  const next = entries[0];
  const date = new Date(next.key+'T00:00:00');
  const diff = Math.round((date-today)/86400000);
  return { name: next.name, date: next.key, diff };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, subColor, color, href, loading, progress }) {
  const inner = (
    <div className="group relative overflow-hidden rounded-apple-lg bg-surface border border-hairline p-5
      hover:shadow-apple-sm transition-all duration-200 h-full flex flex-col">

      {/* Background glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: color }} />

      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, color }}>
          <Icon className="w-[17px] h-[17px]" strokeWidth={2.2} />
        </div>
        {href && <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink-muted transition-colors" />}
      </div>

      {loading ? (
        <div className="space-y-2 flex-1">
          <div className="h-8 w-14 bg-elevated rounded-lg animate-pulse" />
          <div className="h-3 w-20 bg-elevated rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-[32px] font-semibold text-ink tracking-tight leading-none tabular">
            {value ?? '—'}
          </p>
          <p className="text-[12px] text-ink-muted font-medium mt-1.5 leading-snug">{label}</p>
          {sub && (
            <p className="text-[11px] font-semibold mt-1" style={{ color: subColor || color }}>{sub}</p>
          )}
          {progress != null && (
            <div className="mt-3 h-1 rounded-full bg-elevated overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress,100)}%`, background: color }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function TaskRow({ task }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = task.dataEntrega ? (() => { const d=new Date(task.dataEntrega); d.setHours(0,0,0,0); return d; })() : null;
  const overdue    = due && due < today;
  const urgentSoon = due && !overdue && (due-today)/86400000 <= 2;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-hairline last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${overdue?'bg-err':urgentSoon?'bg-warn':'bg-accent'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{task.nome}</p>
        {(task.cliente || task.responsavel?.length > 0) && (
          <p className="text-[11px] text-ink-faint mt-0.5">
            {[task.cliente, Array.isArray(task.responsavel)?task.responsavel.join(', '):task.responsavel].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {task.dataEntrega && (
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          overdue?'bg-err/10 text-err':urgentSoon?'bg-warn/10 text-warn':'bg-elevated text-ink-muted'}`}>
          {relativeDate(task.dataEntrega)}
        </span>
      )}
    </div>
  );
}

function ContentRow({ item }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-hairline last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{item.nome}</p>
        <p className="text-[11px] text-ink-faint mt-0.5">
          {[item.cliente, item.formato].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className={`${badgeClassFor(item.estado)} shrink-0 text-[10px]`}>
        {statusLabel(item.estado)}
      </span>
    </div>
  );
}

function PostRow({ item }) {
  const [y,m,d] = (item.postagem||'').split('-');
  const diff = Math.round((new Date(item.postagem)-new Date().setHours(0,0,0,0))/86400000);
  const isToday = diff === 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-hairline last:border-0">
      <div className={`w-8 h-8 rounded-apple flex items-center justify-center shrink-0 text-[10px] font-bold border ${
        isToday ? 'bg-accent text-white border-accent' : 'bg-elevated text-ink-soft border-hairline'}`}>
        {d && m ? `${d}/${m}` : '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{item.nome}</p>
        <p className="text-[11px] text-ink-faint mt-0.5">
          {[item.cliente, item.plataforma||item.formato].filter(Boolean).join(' · ')}
        </p>
      </div>
      {isToday && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">Hoje</span>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'T3 Studio';
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

  // ── Derived data ──────────────────────────────────────────────────────────
  const pendingTasks = useMemo(() =>
    tasks.filter(t => t.status !== 'Concluído')
      .sort((a,b) => { if(!a.dataEntrega) return 1; if(!b.dataEntrega) return -1; return new Date(a.dataEntrega)-new Date(b.dataEntrega); })
      .slice(0, 6)
  , [tasks]);

  const awaitingContent = useMemo(() =>
    content.filter(c => nrm(c.estado).includes('aguardando')).slice(0, 5)
  , [content]);

  // Posts scheduled in the next 7 days
  const weekPosts = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const in7   = new Date(today); in7.setDate(in7.getDate()+7);
    return content
      .filter(c => {
        if (!c.postagem) return false;
        const d = new Date(c.postagem); d.setHours(0,0,0,0);
        return d >= today && d <= in7;
      })
      .sort((a,b) => new Date(a.postagem)-new Date(b.postagem))
      .slice(0, 5);
  }, [content]);

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const pipeline = useMemo(() => {
    const stages = [
      { key:'producao', label:'Em produção',    color:'#0071e3' },
      { key:'aguardando', label:'Aguardando',    color:'#ff9500' },
      { key:'aprovado', label:'Aprovado',        color:'#34c759' },
      { key:'concluido', label:'Concluído',      color:'#8e8e93' },
    ];
    return stages.map(s => ({
      ...s,
      count: content.filter(c => {
        const raw = nrm(c.estado);
        if (s.key==='producao')  return raw.includes('producao');
        if (s.key==='aguardando') return raw.includes('aguardando');
        if (s.key==='aprovado')  return raw==='aprovado';
        if (s.key==='concluido') return raw.includes('concluido')||raw.includes('postado');
        return false;
      }).length,
    }));
  }, [content]);

  // ── Team capacity ─────────────────────────────────────────────────────────
  const MEMBERS = ['Matheus', 'Sávio'];
  const CAPACITY_MAX = 30;
  const MEMBER_COLORS = {
    Matheus: { bg:'#7c3aed', initials:'MA' },
    Sávio:   { bg:'#0284c7', initials:'SA' },
  };
  const zone = (pts) => {
    if (pts>=25) return { color:'#ff3b30', label:'Sobrecarregado' };
    if (pts>=15) return { color:'#ff9500', label:'Ocupado' };
    return         { color:'#34c759', label:'Disponível' };
  };
  const capacity = useMemo(() => {
    const map = {}; MEMBERS.forEach(m => { map[m]=0; });
    content.filter(c => !nrm(c.estado).includes('concluido')).forEach(c => {
      const pts = parseInt(c.pontos)||1;
      const resp = (c.responsavel||'').trim();
      if (map[resp]!==undefined) map[resp]+=pts;
    });
    return map;
  }, [content]);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const total = pipeline.reduce((s,p) => s+p.count, 0) || 1;
  const statCards = [
    { icon:CheckSquare, label:'Tarefas pendentes',    value:stats?.tasks?.pending,
      sub: stats?.tasks?.overdue>0 ? `${stats.tasks.overdue} atrasada${stats.tasks.overdue>1?'s':''}` : '✓ Nenhuma atrasada',
      subColor: stats?.tasks?.overdue>0 ? '#ff3b30' : '#34c759',
      color:'#0071e3', href:'/dashboard/tarefas' },
    { icon:Film, label:'Em produção agora',            value:stats?.content?.inProduction,
      sub: `de ${stats?.content?.total??'—'} no total`, color:'#af52de', href:'/dashboard/conteudo' },
    { icon:AlertCircle, label:'Aguardando aprovação',  value:stats?.content?.awaitingApproval,
      sub: stats?.content?.awaitingScript>0?`+${stats.content.awaitingScript} roteiros`:null,
      color:'#ff9500', href:'/dashboard/conteudo' },
    { icon:Calendar, label:'Posts este mês',           value:stats?.content?.thisMonth,
      sub:`${stats?.content?.approved??'—'} aprovados`, color:'#28cd41', href:'/dashboard/conteudo',
      progress: stats?.content ? Math.round((stats.content.approved/Math.max(stats.content.thisMonth,1))*100) : null },
  ];

  return (
    <CRMLayout title="Dashboard — T3 Studio">
      <div className="px-5 lg:px-10 py-8 lg:py-10 max-w-[1240px] mx-auto">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="t-eyebrow text-accent mb-1">CRM Interno</p>
            <h1 className="t-hero leading-none">
              {greeting()},{' '}
              <span className="text-ink">{firstName}</span>
            </h1>
            <p className="text-[13px] text-ink-muted mt-1.5 capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((card, i) => (
            <StatCard key={i} {...card} loading={loading} />
          ))}
        </div>

        {/* ── PIPELINE ───────────────────────────────────────────────────── */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" strokeWidth={2} />
              <p className="t-eyebrow">Pipeline de Conteúdo</p>
            </div>
            <Link href="/dashboard/conteudo"
              className="text-[12px] text-accent hover:text-accent font-medium flex items-center gap-0.5">
              Ver tudo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="h-12 bg-elevated rounded-apple animate-pulse" />
          ) : (
            <>
              {/* Stage bars */}
              <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-4">
                {pipeline.map(s => (
                  <div key={s.key} style={{ flex: Math.max(s.count,0.3), background: s.color }}
                    className="transition-all duration-700 first:rounded-l-full last:rounded-r-full" />
                ))}
              </div>
              {/* Stage labels */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pipeline.map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <div>
                      <p className="text-[18px] font-bold text-ink leading-none tabular">{s.count}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5 mb-6">

          {/* Tarefas em aberto */}
          <div className="lg:col-span-1">
            <div className="card p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#0071e318]">
                    <CheckSquare className="w-3.5 h-3.5 text-[#0071e3]" strokeWidth={2} />
                  </div>
                  <h2 className="text-[14px] font-semibold text-ink">Tarefas em aberto</h2>
                  {stats?.tasks?.pending > 0 && (
                    <span className="badge badge-neutral tabular text-[10px]">{stats.tasks.pending}</span>
                  )}
                </div>
                <Link href="/dashboard/tarefas"
                  className="text-[12px] text-accent font-medium flex items-center gap-0.5 hover:text-accent">
                  Ver <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-elevated rounded-apple animate-pulse"/>)}
                </div>
              ) : pendingTasks.length > 0 ? (
                pendingTasks.map(t => <TaskRow key={t.id} task={t} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-ok/10 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 text-ok" />
                  </div>
                  <p className="text-[13px] font-medium text-ink">Tudo em dia!</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">Nenhuma tarefa pendente</p>
                </div>
              )}
            </div>
          </div>

          {/* Postagens da semana */}
          <div className="lg:col-span-1">
            <div className="card p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#28cd4118]">
                    <Calendar className="w-3.5 h-3.5 text-[#28cd41]" strokeWidth={2} />
                  </div>
                  <h2 className="text-[14px] font-semibold text-ink">Posts desta semana</h2>
                  {weekPosts.length > 0 && (
                    <span className="badge badge-neutral tabular text-[10px]">{weekPosts.length}</span>
                  )}
                </div>
                <Link href="/dashboard/conteudo"
                  className="text-[12px] text-accent font-medium flex items-center gap-0.5 hover:text-accent">
                  Ver <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i) => <div key={i} className="h-11 bg-elevated rounded-apple animate-pulse"/>)}
                </div>
              ) : weekPosts.length > 0 ? (
                weekPosts.map(item => <PostRow key={item.id} item={item} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-8 h-8 text-ink-faint mb-2" />
                  <p className="text-[13px] text-ink-muted">Nenhum post nos próximos 7 dias</p>
                </div>
              )}
            </div>
          </div>

          {/* Aguardando aprovação */}
          <div className="lg:col-span-1">
            <div className="card p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#ff950018]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ff9500]" strokeWidth={2} />
                  </div>
                  <h2 className="text-[14px] font-semibold text-ink">Aguardando aprovação</h2>
                  {awaitingContent.length > 0 && (
                    <span className="badge badge-orange tabular text-[10px]">{stats?.content?.awaitingApproval}</span>
                  )}
                </div>
                <Link href="/dashboard/conteudo"
                  className="text-[12px] text-accent font-medium flex items-center gap-0.5 hover:text-accent">
                  Ver <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-elevated rounded-apple animate-pulse"/>)}
                </div>
              ) : awaitingContent.length > 0 ? (
                awaitingContent.map(item => <ContentRow key={item.id} item={item} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-ok mb-2" />
                  <p className="text-[13px] text-ink-muted">Nada aguardando aprovação</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: Capacidade + Quick Actions ──────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Capacidade da Equipe */}
          <div className="lg:col-span-2">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-accent" strokeWidth={2} />
                <h2 className="text-[14px] font-semibold text-ink">Capacidade da Equipe</h2>
              </div>
              {loading ? (
                <div className="space-y-5">
                  {[...Array(2)].map((_,i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-32 bg-elevated rounded animate-pulse" />
                      <div className="h-2 w-full bg-elevated rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-5">
                    {MEMBERS.map(member => {
                      const pts = capacity[member] ?? 0;
                      const pct = Math.min(pts/CAPACITY_MAX,1)*100;
                      const { color, label } = zone(pts);
                      const av = MEMBER_COLORS[member];
                      // Items this member has in progress
                      const items = content.filter(c =>
                        !nrm(c.estado).includes('concluido') &&
                        (c.responsavel||'').trim() === member
                      );
                      return (
                        <div key={member}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                              style={{ background: av?.bg??'#888' }}>
                              {av?.initials??member.slice(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[13px] font-medium text-ink">{member}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] text-ink-muted tabular">{pts}/{CAPACITY_MAX} pts</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ color, background:`${color}18` }}>{label}</span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width:`${pct}%`, background:color }} />
                              </div>
                              {/* items preview */}
                              {items.length > 0 && (
                                <p className="text-[10px] text-ink-faint mt-1 truncate">
                                  {items.slice(0,3).map(i=>i.nome).join(' · ')}
                                  {items.length>3 && ` +${items.length-3}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-ink-faint mt-4 pt-4 border-t border-hairline">
                    1pt = Post · 2pts = Carrossel · 3pts = Vídeo · 4pts = Edição · 5pts = Hero
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Atalhos */}
          <div className="lg:col-span-1">
            <div className="card p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-accent" strokeWidth={2} />
                <h2 className="text-[14px] font-semibold text-ink">Atalhos</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label:'Tarefas',     sub:'Gerencie o backlog',   href:'/dashboard/tarefas',    color:'#0071e3', icon:CheckSquare },
                  { label:'Conteúdo',    sub:'Pipeline de posts',    href:'/dashboard/conteudo',   color:'#af52de', icon:Film        },
                  { label:'Campanhas',   sub:'Meta Ads',             href:'/dashboard/campanhas',  color:'#ff6b35', icon:Megaphone   },
                  { label:'Clientes',    sub:'Gestão de contas',     href:'/dashboard/clientes',   color:'#28cd41', icon:Users       },
                  { label:'Calendário',  sub:'Datas e feriados',     href:'/dashboard/calendario', color:'#5856d6', icon:Calendar    },
                ].map(({ label, sub, href, color, icon: Icon }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-apple hover:bg-elevated transition-all duration-150 group">
                    <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                      style={{ background:`${color}15`, color }}>
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink">{label}</p>
                      <p className="text-[11px] text-ink-faint">{sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink-muted transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </CRMLayout>
  );
}
