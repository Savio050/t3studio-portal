import { useState, useEffect } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  Users, ExternalLink, ArrowUpRight, Film,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  Loader2, Plus, X, Trash2,
} from 'lucide-react';

// ── Stat mini ─────────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, value, label, tone = 'text-ink-soft' }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className={`w-3.5 h-3.5 ${tone}`} />
      <span className={`text-base font-semibold tracking-apple-tight ${tone}`}>{value}</span>
      <span className="text-[10px] text-ink-faint font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ approved, awaiting, inProd, total }) {
  if (!total) return null;
  const doneP = Math.round((approved / total) * 100);
  const waitP = Math.round((awaiting / total) * 100);
  const prodP = Math.round((inProd  / total) * 100);

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden flex gap-px bg-elevated">
      <div className="h-full transition-all duration-500 bg-ok"
        style={{ width: `${doneP}%` }} />
      <div className="h-full transition-all duration-500 bg-info"
        style={{ width: `${prodP}%` }} />
      <div className="h-full transition-all duration-500 bg-warn"
        style={{ width: `${waitP}%` }} />
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onDelete }) {
  const total      = client.totalContent;
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initial    = (client.nome || '??').slice(0, 2).toUpperCase();

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 3000); return; }
    setDeleting(true);
    await onDelete(client.id);
  };

  // Only allow delete if the client has a real Notion page ID (UUID format)
  const canDelete = /^[0-9a-f-]{36}$/.test(client.id);

  const donePct = total > 0 ? Math.round(((client.approved + client.done) / total) * 100) : 0;

  return (
    <article className="card card-interactive p-6 flex flex-col">
      {/* Header row: avatar + name + portal */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-apple flex items-center justify-center text-sm font-semibold text-white shrink-0 brand-gradient shadow-apple-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <h3 className="t-title capitalize truncate">{client.nome}</h3>
            {client.descricao && (
              <p className="t-small text-ink-muted mt-0.5 line-clamp-1">{client.descricao}</p>
            )}
          </div>
        </div>

        {client.idCliente && (
          <Link href={`/?id=${client.idCliente}`} target="_blank"
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-medium text-ink-soft hover:text-accent hairline hover:border-accent/40 transition-all">
            <ExternalLink className="w-3 h-3" />
            Portal
          </Link>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="t-eyebrow">Progresso</span>
          <span className="text-xs font-semibold text-ink tracking-apple-tight">{donePct}%</span>
        </div>
        <ProgressBar
          approved={client.approved + client.done}
          awaiting={client.awaitingApproval}
          inProd={client.inProduction}
          total={total}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-hairline">
        <MiniStat icon={Film}         value={total}                          label="Total"     tone="text-ink" />
        <MiniStat icon={Clock}        value={client.inProduction}            label="Produção"  tone="text-info-ink" />
        <MiniStat icon={AlertCircle}  value={client.awaitingApproval}        label="Pendentes" tone="text-warn-ink" />
        <MiniStat icon={CheckCircle2} value={client.approved + client.done}  label="Prontos"   tone="text-ok-ink" />
      </div>

      {/* CTA row */}
      <div className="mt-6 flex gap-2">
        <Link href={`/dashboard/conteudo?cliente=${encodeURIComponent(client.nome)}`}
          className="btn btn-primary flex-1">
          Ver conteúdo
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className={`btn ${confirm ? 'btn-danger' : 'btn-ghost'} disabled:opacity-40`}>
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : <Trash2 className="w-4 h-4"/>
            }
            {confirm && !deleting && <span>Confirmar</span>}
          </button>
        )}
      </div>
    </article>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'bg-elevated', iconBg: 'bg-surface', iconColor: 'text-ink-soft', valueColor: 'text-ink' },
    blue:    { bg: 'bg-accent-soft', iconBg: 'bg-white', iconColor: 'text-accent', valueColor: 'text-ink' },
    warn:    { bg: 'bg-warn-soft', iconBg: 'bg-white', iconColor: 'text-warn-ink', valueColor: 'text-ink' },
    ok:      { bg: 'bg-ok-soft', iconBg: 'bg-white', iconColor: 'text-ok-ink', valueColor: 'text-ink' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-apple ${t.bg}`}>
      <div className={`w-9 h-9 rounded-apple flex items-center justify-center ${t.iconBg} shadow-apple-sm`}>
        <Icon className={`w-4 h-4 ${t.iconColor}`} />
      </div>
      <div>
        <p className={`text-xl font-semibold tracking-apple-tight ${t.valueColor}`}>{value}</p>
        <p className="text-[11px] font-medium text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

// ── New Client Modal ──────────────────────────────────────────────────────────
function NewClientModal({ onClose, onCreate }) {
  const [nome,          setNome]          = useState('');
  const [descricao,     setDescricao]     = useState('');
  const [paginaCliente, setPaginaCliente] = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  const submit = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao, paginaCliente }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      onCreate(); onClose();
    } catch (e) {
      setError(e.message || 'Erro ao criar cliente. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full max-w-md rounded-apple-xl flex flex-col overflow-hidden bg-surface shadow-apple-lg border border-hairline">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <p className="t-title">Novo cliente</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-2">
              Nome <span className="text-err-ink">*</span>
            </label>
            <input autoFocus type="text" value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ex: Fast Imóveis"
              className="input"/>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-2">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              placeholder="Breve descrição do cliente…"
              className="input resize-none"/>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-2">Página do cliente (URL)</label>
            <input type="url" value={paginaCliente} onChange={e => setPaginaCliente(e.target.value)}
              placeholder="https://…"
              className="input"/>
          </div>

          {error && (
            <p className="text-xs text-err-ink px-3 py-2 rounded-apple bg-err-soft">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline flex gap-3 bg-canvas">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={submit} disabled={!nome.trim() || saving}
            className="btn btn-primary flex-1 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            {saving ? 'Criando…' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const loadClients = () => {
    setLoading(true);
    fetch('/api/crm/clients')
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const deleteClient = async (id) => {
    await fetch('/api/crm/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const totalContent   = clients.reduce((s, c) => s + c.totalContent, 0);
  const totalAwaiting  = clients.reduce((s, c) => s + c.awaitingApproval, 0);
  const totalApproved  = clients.reduce((s, c) => s + c.approved + c.done, 0);

  return (
    <CRMLayout title="Clientes — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="t-hero flex items-center gap-3">
              <Users className="w-7 h-7 text-accent" />
              Clientes
            </h1>
            <p className="t-body text-ink-muted mt-1">
              {loading ? 'Carregando…' : `${clients.length} cliente${clients.length !== 1 ? 's' : ''} ativo${clients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn btn-primary">
            <Plus className="w-4 h-4"/>
            Novo cliente
          </button>
        </div>

        {/* Summary */}
        {!loading && clients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <SummaryCard label="Conteúdos totais" value={totalContent}  tone="blue" icon={Film}          />
            <SummaryCard label="Aguardando"       value={totalAwaiting} tone="warn" icon={AlertCircle}  />
            <SummaryCard label="Prontos"          value={totalApproved} tone="ok"   icon={CheckCircle2} />
          </div>
        )}

        {/* Clients grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-apple-lg bg-elevated animate-pulse" />
            ))}
          </div>
        ) : clients.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {clients.map(client => (
              <ClientCard key={client.id} client={client} onDelete={deleteClient} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-apple-lg bg-elevated flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-ink-faint" />
            </div>
            <p className="t-title mb-1">Nenhum cliente ainda</p>
            <p className="t-body text-ink-muted mb-5">Cadastre seu primeiro cliente para começar.</p>
            <button onClick={() => setShowNew(true)} className="btn btn-primary">
              <Plus className="w-4 h-4"/>
              Novo cliente
            </button>
          </div>
        )}

        {/* Team section */}
        <div className="mt-10 card p-6">
          <h2 className="t-eyebrow mb-4 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            Equipe T3 Studio
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: 'Matheus', role: 'Criação',  dot: 'dot dot-purple' },
              { name: 'Sávio',   role: 'Produção', dot: 'dot dot-green'  },
            ].map(({ name, role, dot }) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3 rounded-apple bg-elevated">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white brand-gradient">
                  {name.slice(0,1)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink tracking-apple-tight">{name}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1.5">
                    <span className={dot} />
                    {role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNew && (
        <NewClientModal onClose={() => setShowNew(false)} onCreate={loadClients}/>
      )}
    </CRMLayout>
  );
}
