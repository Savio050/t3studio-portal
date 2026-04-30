import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  Users, ExternalLink, ArrowUpRight, Film,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  Loader2, Plus, X, Trash2, Camera,
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

// ── Client Logo Avatar ────────────────────────────────────────────────────────
function ClientAvatar({ clientId, nome, logo, onLogoChange }) {
  const fileRef          = useRef(null);
  const [uploading,  setUploading]  = useState(false);
  const [localLogo,  setLocalLogo]  = useState(logo);
  const [imgErr,     setImgErr]     = useState(false);
  const initial = (nome || '??').slice(0, 2).toUpperCase();

  // Sync external logo changes (e.g. initial load)
  useEffect(() => { setLocalLogo(logo); setImgErr(false); }, [logo]);

  const canUpload = /^[0-9a-f-]{36}$/.test(clientId);
  const showPhoto = localLogo && !imgErr;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande (máx 5MB).'); return; }

    setUploading(true);
    try {
      const res = await fetch(`/api/crm/upload-client-logo?clientId=${encodeURIComponent(clientId)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar logo.');
      setLocalLogo(data.logo);
      setImgErr(false);
      onLogoChange?.(clientId, data.logo);
    } catch (err) {
      console.error('Logo upload error:', err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => canUpload && fileRef.current?.click()}
        title={canUpload ? 'Alterar logo' : undefined}
        disabled={uploading || !canUpload}
        className={`w-11 h-11 rounded-apple shrink-0 relative overflow-hidden
          ${canUpload ? 'group cursor-pointer' : 'cursor-default'}
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1`}>

        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={localLogo} alt={nome}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white brand-gradient shadow-apple-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : initial}
          </div>
        )}

        {canUpload && !uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-apple">
            <Camera className="w-4 h-4 text-white" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-apple">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
      </button>
    </>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onDelete, onLogoChange }) {
  const total      = client.totalContent;
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <ClientAvatar
            clientId={client.id}
            nome={client.nome}
            logo={client.logo}
            onLogoChange={onLogoChange}
          />
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
const FREQ_LABEL = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral',
  anual: 'Anual', quinzenal: 'Quinzenal', semanal: 'Semanal',
};

function NewClientModal({ onClose, onCreate }) {
  const [tab,           setTab]           = useState('dados');   // 'dados' | 'financeiro'
  const [nome,          setNome]          = useState('');
  const [descricao,     setDescricao]     = useState('');
  const [paginaCliente, setPaginaCliente] = useState('');
  // Financeiro
  const [temFinanceiro, setTemFinanceiro] = useState(false);
  const [finTipo,       setFinTipo]       = useState('Receita');
  const [finCategoria,  setFinCategoria]  = useState('Mensalidade');
  const [finValor,      setFinValor]      = useState('');
  const [finData,       setFinData]       = useState(new Date().toISOString().slice(0, 10));
  const [finStatus,     setFinStatus]     = useState('Confirmado');
  const [finRecorrente, setFinRecorrente] = useState(false);
  const [finFreq,       setFinFreq]       = useState('mensal');
  const [finReps,       setFinReps]       = useState(12);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  const inputCls = 'input';
  const labelCls = 'block text-xs font-medium text-ink-soft mb-2';

  const submit = async () => {
    if (!nome.trim() || saving) return;
    if (temFinanceiro && finValor && isNaN(Number(finValor))) {
      setError('Valor financeiro inválido.'); return;
    }
    setSaving(true); setError('');
    try {
      // 1. Create client
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao, paginaCliente }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

      // 2. Create financial transaction(s) if requested
      if (temFinanceiro && finValor && Number(finValor) > 0) {
        const clienteNome = nome.trim();
        const baseValor   = Number(finValor);

        if (finRecorrente && finReps > 1) {
          // Build date sequence
          const FREQ_MONTHS = { mensal:1, bimestral:2, trimestral:3, semestral:6, anual:12 };
          const FREQ_DAYS   = { semanal:7, quinzenal:14 };
          const dates = [finData];
          for (let i = 1; i < finReps; i++) {
            const prev = new Date(dates[dates.length - 1] + 'T12:00:00');
            if (FREQ_DAYS[finFreq])   prev.setDate(prev.getDate() + FREQ_DAYS[finFreq]);
            else                       prev.setMonth(prev.getMonth() + (FREQ_MONTHS[finFreq] || 1));
            dates.push(prev.toISOString().slice(0, 10));
          }
          for (let i = 0; i < dates.length; i++) {
            await fetch('/api/crm/finance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nome:      `${clienteNome} (${i + 1}/${finReps})`,
                tipo:      finTipo,
                categoria: finCategoria,
                valor:     baseValor,
                data:      dates[i],
                cliente:   clienteNome,
                status:    finStatus,
                notas:     `Recorrência ${i + 1}/${finReps} · ${FREQ_LABEL[finFreq] || finFreq}`,
              }),
            });
          }
        } else {
          await fetch('/api/crm/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome:      clienteNome,
              tipo:      finTipo,
              categoria: finCategoria,
              valor:     baseValor,
              data:      finData,
              cliente:   clienteNome,
              status:    finStatus,
            }),
          });
        }
      }

      onCreate(); onClose();
    } catch (e) {
      setError(e.message || 'Erro ao criar cliente. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-apple-xl flex flex-col overflow-hidden bg-surface shadow-apple-lg border border-hairline max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline shrink-0">
          <p className="t-title">Novo cliente</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline shrink-0">
          {[['dados', 'Dados'], ['financeiro', 'Financeiro']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition-all cursor-pointer
                ${tab === key
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-ink-soft hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">

          {/* ── Tab: Dados ── */}
          {tab === 'dados' && (
            <>
              <div>
                <label className={labelCls}>Nome <span className="text-err-ink">*</span></label>
                <input autoFocus type="text" value={nome} onChange={e => setNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setTab('financeiro')}
                  placeholder="Ex: Fast Imóveis"
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
                  placeholder="Breve descrição do cliente…"
                  className={`${inputCls} resize-none`}/>
              </div>
              <div>
                <label className={labelCls}>Página do cliente (URL)</label>
                <input type="url" value={paginaCliente} onChange={e => setPaginaCliente(e.target.value)}
                  placeholder="https://…"
                  className={inputCls}/>
              </div>
            </>
          )}

          {/* ── Tab: Financeiro ── */}
          {tab === 'financeiro' && (
            <>
              {/* Toggle financeiro */}
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
                <button type="button" onClick={() => setTemFinanceiro(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3
                    bg-elevated hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                      ${temFinanceiro ? 'border-accent bg-accent' : 'border-[rgba(0,0,0,0.2)]'}`}>
                      {temFinanceiro && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                    </div>
                    <span className="text-[13px] font-semibold text-ink">Adicionar lançamento financeiro</span>
                  </div>
                  <span className="text-[11px] text-ink-faint">{temFinanceiro ? 'Ativado' : 'Desativado'}</span>
                </button>

                {temFinanceiro && (
                  <div className="px-4 pb-4 pt-3 space-y-3 bg-canvas">
                    {/* Tipo */}
                    <div>
                      <label className={labelCls}>Tipo</label>
                      <div className="flex gap-2">
                        {['Receita','Despesa'].map(t => (
                          <button key={t} type="button" onClick={() => setFinTipo(t)}
                            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer
                              ${finTipo === t
                                ? t === 'Receita' ? 'bg-[#30d158] text-white' : 'bg-[#ff375f] text-white'
                                : 'bg-elevated text-ink-soft hover:bg-[rgba(0,0,0,0.06)]'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Valor + Data */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Valor (R$)</label>
                        <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                          value={finValor} onChange={e => setFinValor(e.target.value)}/>
                      </div>
                      <div>
                        <label className={labelCls}>Data</label>
                        <input className={inputCls} type="date"
                          value={finData} onChange={e => setFinData(e.target.value)}/>
                      </div>
                    </div>

                    {/* Categoria + Status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Categoria</label>
                        <select className={inputCls} value={finCategoria} onChange={e => setFinCategoria(e.target.value)}>
                          {(finTipo === 'Receita'
                            ? ['Projeto','Mensalidade','Consultoria','Bônus','Outros']
                            : ['Salários','Ferramentas','Marketing','Infraestrutura','Impostos','Freelancer','Outros']
                          ).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={finStatus} onChange={e => setFinStatus(e.target.value)}>
                          {['Confirmado','Pendente','Cancelado'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Recorrência */}
                    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
                      <button type="button" onClick={() => setFinRecorrente(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2.5
                          bg-elevated hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all
                            ${finRecorrente ? 'border-accent bg-accent' : 'border-[rgba(0,0,0,0.2)]'}`}>
                            {finRecorrente && <div className="w-1 h-1 rounded-full bg-white"/>}
                          </div>
                          <span className="text-[12px] font-semibold text-ink">Recorrente</span>
                        </div>
                        <span className="text-[10px] text-ink-faint">{finRecorrente ? 'Sim' : 'Não'}</span>
                      </button>

                      {finRecorrente && (
                        <div className="px-3 pb-3 pt-2 space-y-2 bg-canvas">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Frequência</label>
                              <select className={inputCls} value={finFreq} onChange={e => setFinFreq(e.target.value)}>
                                <option value="semanal">Semanal</option>
                                <option value="quinzenal">Quinzenal</option>
                                <option value="mensal">Mensal</option>
                                <option value="bimestral">Bimestral</option>
                                <option value="trimestral">Trimestral</option>
                                <option value="semestral">Semestral</option>
                                <option value="anual">Anual</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Repetições</label>
                              <input className={inputCls} type="number" min="2" max="60"
                                value={finReps} onChange={e => setFinReps(Math.max(2, Math.min(60, Number(e.target.value))))}/>
                            </div>
                          </div>
                          {finValor && Number(finValor) > 0 && (
                            <p className="text-[11px] text-ink-faint">
                              Total: <strong className="text-ink">
                                {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(finValor) * finReps)}
                              </strong> em {finReps}× de {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(finValor))} ({FREQ_LABEL[finFreq]})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-err-ink px-3 py-2 rounded-apple bg-err-soft">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline flex gap-3 bg-canvas shrink-0">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          {tab === 'dados' ? (
            <button onClick={() => nome.trim() && setTab('financeiro')}
              disabled={!nome.trim()}
              className="btn btn-primary flex-1 disabled:opacity-40">
              Próximo →
            </button>
          ) : (
            <button onClick={submit} disabled={!nome.trim() || saving}
              className="btn btn-primary flex-1 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
              {saving ? 'Criando…' : 'Criar cliente'}
            </button>
          )}
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

  const handleLogoChange = (clientId, logoUrl) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, logo: logoUrl } : c));
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
              <ClientCard key={client.id} client={client} onDelete={deleteClient} onLogoChange={handleLogoChange} />
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
