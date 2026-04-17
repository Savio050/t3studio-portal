import { useState, useEffect } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  Users, ExternalLink, ArrowUpRight, Film,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  Loader2, Plus, X,
} from 'lucide-react';

// ── Client colors ─────────────────────────────────────────────────────────────
const CLIENT_PALETTES = {
  'fastimoveis': {
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)',
    glow: 'rgba(244,63,94,0.15)',
    border: 'rgba(244,63,94,0.2)',
    accent: '#fb7185',
    initial: 'FI',
  },
  'mafro': {
    gradient: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
    glow: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.2)',
    accent: '#22d3ee',
    initial: 'MF',
  },
};

function getPalette(nome) {
  const key = nome?.toLowerCase().replace(/\s+/g,'');
  return CLIENT_PALETTES[key] || {
    gradient: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    glow: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.2)',
    accent: '#a78bfa',
    initial: (nome || '??').slice(0, 2).toUpperCase(),
  };
}

// ── Stat mini ─────────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="w-3.5 h-3.5 mb-0.5" style={{ color: `${color}90` }} />
      <span className="text-base font-bold font-display" style={{ color }}>{value}</span>
      <span className="text-[10px] text-white/30 font-medium text-center leading-tight">{label}</span>
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
    <div className="w-full h-1.5 rounded-full overflow-hidden flex gap-px"
      style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-l-full transition-all duration-500"
        style={{ width: `${doneP}%`, background: '#10b981' }} />
      <div className="h-full transition-all duration-500"
        style={{ width: `${prodP}%`, background: '#0ea5e9' }} />
      <div className="h-full rounded-r-full transition-all duration-500"
        style={{ width: `${waitP}%`, background: '#f59e0b' }} />
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client }) {
  const palette = getPalette(client.nome);
  const total   = client.totalContent;

  return (
    <article className="rounded-2xl overflow-hidden transition-all duration-200 hover:translate-y-[-2px] hover:shadow-card-hover"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${palette.border}`,
        boxShadow: `0 4px 24px ${palette.glow}`,
      }}>

      {/* Top banner */}
      <div className="h-20 relative"
        style={{ background: palette.gradient }}>
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Avatar */}
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
            style={{
              background: 'rgba(7,13,27,0.8)',
              backdropFilter: 'blur(8px)',
              border: `2px solid ${palette.border}`,
            }}>
            {palette.initial}
          </div>
        </div>

        {/* Portal link */}
        {client.idCliente && (
          <Link href={`/?id=${client.idCliente}`} target="_blank"
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
              text-[10px] font-bold uppercase tracking-wider text-white/80
              hover:text-white transition-all duration-150 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
            <ExternalLink className="w-2.5 h-2.5" />
            Portal
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="pt-8 px-5 pb-5">
        <h3 className="text-base font-bold text-white font-display capitalize">{client.nome}</h3>
        {client.categoria && (
          <p className="text-xs text-white/35 font-medium mt-0.5 capitalize">{client.categoria}</p>
        )}

        {/* Progress */}
        <div className="mt-4 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Progresso do conteúdo</span>
            <span className="text-[10px] font-bold" style={{ color: palette.accent }}>
              {total > 0 ? Math.round(((client.approved + client.done) / total) * 100) : 0}%
            </span>
          </div>
          <ProgressBar
            approved={client.approved + client.done}
            awaiting={client.awaitingApproval}
            inProd={client.inProduction}
            total={total}
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <MiniStat icon={Film}          value={total}                    label="Total"      color="rgba(255,255,255,0.5)" />
          <MiniStat icon={Clock}         value={client.inProduction}      label="Produção"   color="#0ea5e9" />
          <MiniStat icon={AlertCircle}   value={client.awaitingApproval}  label="Pendentes"  color="#f59e0b" />
          <MiniStat icon={CheckCircle2}  value={client.approved + client.done} label="Prontos" color="#10b981" />
        </div>

        {/* CTA */}
        <Link href={`/dashboard/conteudo?cliente=${encodeURIComponent(client.nome)}`}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-xs font-semibold cursor-pointer transition-all duration-150
            hover:brightness-110 active:scale-[0.98]"
          style={{
            background: `${palette.glow}`,
            border: `1px solid ${palette.border}`,
            color: palette.accent,
          }}>
          Ver conteúdo
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold font-display" style={{ color }}>{value}</p>
        <p className="text-[11px] font-medium" style={{ color: `${color}80` }}>{label}</p>
      </div>
    </div>
  );
}

// ── New Client Modal ──────────────────────────────────────────────────────────
function NewClientModal({ onClose, onCreate }) {
  const [nome,      setNome]      = useState('');
  const [categoria, setCategoria] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const CATEGORIAS = ['Imobiliária', 'Moda', 'Gastronomia', 'Saúde', 'Tecnologia', 'Educação', 'Varejo', 'Outro'];

  const submit = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, categoria }),
      });
      if (!res.ok) throw new Error();
      onCreate(); onClose();
    } catch {
      setError('Erro ao criar cliente. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        style={{ background:'rgba(9,16,30,0.98)', backdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <p className="text-base font-bold text-white font-display">Novo cliente</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Nome <span className="text-rose-400">*</span>
            </label>
            <input autoFocus type="text" value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ex: Fast Imóveis"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-violet-500/40"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}/>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(cat => {
                const active = categoria === cat;
                return (
                  <button key={cat} type="button" onClick={() => setCategoria(active ? '' : cat)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                    }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 px-3 py-2 rounded-xl"
              style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all"
            style={{ border:'1px solid rgba(255,255,255,0.08)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!nome.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all disabled:opacity-40 hover:brightness-110"
            style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
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

  const totalContent   = clients.reduce((s, c) => s + c.totalContent, 0);
  const totalAwaiting  = clients.reduce((s, c) => s + c.awaitingApproval, 0);
  const totalApproved  = clients.reduce((s, c) => s + c.approved + c.done, 0);

  return (
    <CRMLayout title="Clientes — T3 Studio CRM">
      <div className="px-5 lg:px-8 py-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Clientes
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {loading ? '...' : `${clients.length} cliente${clients.length !== 1 ? 's' : ''} ativo${clients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:'linear-gradient(135deg,#7c3aed,#0e7490)', border:'1px solid rgba(124,58,237,0.4)' }}>
            <Plus className="w-3.5 h-3.5"/>
            Novo cliente
          </button>
        </div>

        {/* Summary */}
        {!loading && clients.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard label="Conteúdos totais"  value={totalContent}  color="#7c3aed" icon={Film}          />
            <SummaryCard label="Aguardando"         value={totalAwaiting} color="#f59e0b" icon={AlertCircle}  />
            <SummaryCard label="Prontos"            value={totalApproved} color="#10b981" icon={CheckCircle2} />
          </div>
        )}

        {/* Clients grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : clients.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {clients.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/40 font-medium">Nenhum cliente encontrado</p>
          </div>
        )}

        {/* Team section */}
        <div className="mt-8 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold text-white/70 font-display mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Equipe T3 Studio
          </h2>
          <div className="flex gap-4">
            {[
              { name: 'Matheus', role: 'Criação', color: '#a78bfa', bg: 'rgba(124,58,237,0.15)' },
              { name: 'Sávio',   role: 'Produção', color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)' },
            ].map(({ name, role, color, bg }) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1"
                style={{ background: bg, border: `1px solid ${color}25` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: `${color}30` }}>
                  {name.slice(0,1)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color }}>{name}</p>
                  <p className="text-xs text-white/30">{role}</p>
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
