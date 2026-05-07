import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import CRMLayout from '../../components/crm/Layout';
import {
  Users, ExternalLink, ArrowUpRight, Film,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  Loader2, Plus, X, Trash2, Camera, Pencil, Check,
  FileText, Key, Palette, AlignLeft,
} from 'lucide-react';

// ── Instagram SVG icon (inline — avoids lucide version issues) ────────────────
function IgIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor"/>
    </svg>
  );
}

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

// ── Instagram Panel ───────────────────────────────────────────────────────────
function InstagramPanel({ client, onClose }) {
  const [visible,      setVisible]      = useState(false);
  const [iframeState,  setIframeState]  = useState('loading'); // 'loading' | 'blocked'
  const timerRef  = useRef(null);
  const attemptRef = useRef(0);

  const handle = (client.instagram || '').replace(/^@/, '').trim();
  const igUrl  = `https://www.instagram.com/${handle}/`;

  // Slide-in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Instagram blocks iframes — after 3s assume it's blocked
  useEffect(() => {
    setIframeState('loading');
    timerRef.current = setTimeout(() => setIframeState('blocked'), 3000);
    return () => clearTimeout(timerRef.current);
  }, [attemptRef.current]); // eslint-disable-line

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []); // eslint-disable-line

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const retry = () => {
    clearTimeout(timerRef.current);
    attemptRef.current += 1;
    setIframeState('loading');
    timerRef.current = setTimeout(() => setIframeState('blocked'), 3000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col shadow-apple-xl"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fafafa',
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Instagram gradient header */}
        <div
          className="px-5 py-4 shrink-0 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #f09433 0%, #e6683c 22%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          }}
        >
          <div className="w-9 h-9 rounded-apple flex items-center justify-center bg-white/20 shrink-0">
            <IgIcon size={18} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[14px] leading-none tracking-tight">@{handle}</p>
            <p className="text-white/70 text-[11px] mt-0.5 truncate">{client.nome}</p>
          </div>
          <a
            href={igUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/20 hover:bg-white/30
              text-white text-[12px] font-semibold transition-all"
          >
            <ExternalLink className="w-3 h-3"/>
            Abrir
          </a>
          <button
            onClick={handleClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/70
              hover:text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Iframe attempt */}
          {iframeState === 'loading' && (
            <iframe
              key={attemptRef.current}
              src={igUrl}
              title={`Instagram de @${handle}`}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => { clearTimeout(timerRef.current); /* may still be blocked visually */ }}
              onError={() => { clearTimeout(timerRef.current); setIframeState('blocked'); }}
            />
          )}

          {/* Loading overlay */}
          {iframeState === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
              style={{ background: 'rgba(250,250,250,0.85)' }}>
              <Loader2 className="w-6 h-6 animate-spin text-[#c13584]"/>
              <p className="text-[13px] text-[#6e6e73]">Carregando perfil…</p>
            </div>
          )}

          {/* Blocked fallback */}
          {iframeState === 'blocked' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center bg-[#fafafa]">
              {/* Big gradient logo */}
              <div
                className="w-20 h-20 rounded-[22px] flex items-center justify-center shadow-apple"
                style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 22%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
              >
                <IgIcon size={36} className="text-white"/>
              </div>

              {/* Handle */}
              <div>
                <p className="text-[22px] font-bold text-[#1d1d1f] tracking-tight mb-1">@{handle}</p>
                <p className="text-[13px] text-[#6e6e73] leading-relaxed">
                  O Instagram bloqueia a visualização embutida por segurança.
                  <br/>Clique abaixo para ver o perfil diretamente.
                </p>
              </div>

              {/* Primary CTA */}
              <a
                href={igUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-pill text-[14px] font-bold text-white
                  shadow-apple transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' }}
              >
                <IgIcon size={16} className="text-white"/>
                Abrir no Instagram
              </a>

              <button
                onClick={retry}
                className="text-[12px] text-[#aeaeb2] hover:text-[#6e6e73] underline cursor-pointer transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onDelete, onLogoChange, onInstagram, onInstagramSave, onComercial }) {
  const total      = client.totalContent;
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingIg, setEditingIg] = useState(false);
  const [igInput,   setIgInput]   = useState(client.instagram || '');
  const [igSaving,  setIgSaving]  = useState(false);
  const igInputRef = useRef(null);

  // Keep igInput synced when parent updates client
  useEffect(() => { setIgInput(client.instagram || ''); }, [client.instagram]);

  const saveIg = async () => {
    if (igSaving) return;
    const val = igInput.trim().replace(/^@/, '');
    setIgSaving(true);
    try {
      await fetch('/api/crm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, instagram: val }),
      });
      onInstagramSave?.(client.id, val);
    } finally {
      setIgSaving(false);
      setEditingIg(false);
    }
  };

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

      {/* Instagram row */}
      <div className="mt-3 flex items-center gap-2 min-h-[22px]">
        {editingIg ? (
          <>
            <IgIcon size={12} className="text-[#c13584] shrink-0"/>
            <input
              ref={igInputRef}
              value={igInput}
              onChange={e => setIgInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveIg();
                if (e.key === 'Escape') { setEditingIg(false); setIgInput(client.instagram || ''); }
              }}
              placeholder="handle (sem @)"
              autoFocus
              className="flex-1 text-[12px] text-ink bg-transparent outline-none border-b border-accent pb-px placeholder-ink-faint"
            />
            <button onClick={saveIg} disabled={igSaving}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-ok text-white cursor-pointer shrink-0">
              {igSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Check className="w-2.5 h-2.5"/>}
            </button>
            <button onClick={() => { setEditingIg(false); setIgInput(client.instagram || ''); }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-elevated text-ink-muted cursor-pointer shrink-0">
              <X className="w-2.5 h-2.5"/>
            </button>
          </>
        ) : client.instagram ? (
          <>
            <IgIcon size={12} className="text-[#c13584] shrink-0"/>
            <button
              onClick={() => onInstagram(client)}
              className="text-[12px] font-medium text-[#c13584] hover:underline cursor-pointer"
            >
              @{client.instagram}
            </button>
            <button
              onClick={() => setEditingIg(true)}
              title="Editar handle"
              className="w-5 h-5 flex items-center justify-center rounded text-ink-faint hover:text-ink hover:bg-elevated transition-all cursor-pointer shrink-0"
            >
              <Pencil className="w-2.5 h-2.5"/>
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditingIg(true)}
            className="flex items-center gap-1 text-[11px] text-ink-faint hover:text-[#c13584] transition-colors cursor-pointer"
          >
            <IgIcon size={11} className="shrink-0"/>
            Adicionar Instagram
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="mt-5">
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
        {client.instagram && (
          <button
            onClick={() => onInstagram(client)}
            title="Ver perfil no Instagram"
            className="btn btn-ghost"
            style={{ color: '#c13584' }}
          >
            <IgIcon size={15}/>
          </button>
        )}
        <button
          onClick={() => onComercial(client)}
          title="Informações comerciais e contrato"
          className="btn btn-ghost relative"
        >
          <FileText className="w-4 h-4" />
          {(client.contratoLink || client.contratoInicio || client.logins || client.identidadeVisual) && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>
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
  const [instagram,     setInstagram]     = useState('');
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
        body: JSON.stringify({ nome, descricao, paginaCliente, instagram }),
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
              <div>
                <label className={labelCls} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IgIcon size={12} className="text-[#c13584]"/> Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-faint pointer-events-none">@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={e => setInstagram(e.target.value.replace(/^@/, ''))}
                    placeholder="handle"
                    className={`${inputCls} pl-7`}
                  />
                </div>
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

// ── Comercial Drawer ──────────────────────────────────────────────────────────
const COMERCIAL_TABS = [
  { id: 'contrato', label: 'Contrato',  icon: FileText  },
  { id: 'acesso',   label: 'Acesso',    icon: Key       },
  { id: 'visual',   label: 'Visual',    icon: Palette   },
  { id: 'notas',    label: 'Notas',     icon: AlignLeft },
];

function ClientComercialDrawer({ client, onClose, onSave }) {
  const [visible,          setVisible]          = useState(false);
  const [tab,              setTab]              = useState('contrato');
  const [contratoLink,     setContratoLink]     = useState(client.contratoLink     || '');
  const [contratoInicio,   setContratoInicio]   = useState(client.contratoInicio   || '');
  const [contratoFim,      setContratoFim]      = useState(client.contratoFim      || '');
  const [logins,           setLogins]           = useState(client.logins           || '');
  const [identidadeVisual, setIdentidadeVisual] = useState(client.identidadeVisual || '');
  const [notas,            setNotas]            = useState(client.notas            || '');
  const [saving,           setSaving]           = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [saveErr,          setSaveErr]          = useState('');

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []); // eslint-disable-line

  const handleClose = () => { setVisible(false); setTimeout(onClose, 260); };

  // Contract status derived from dates
  const today    = new Date(); today.setHours(0,0,0,0);
  const fimDate  = contratoFim    ? new Date(contratoFim    + 'T00:00:00') : null;
  const iniDate  = contratoInicio ? new Date(contratoInicio + 'T00:00:00') : null;
  let contratoStatus = null;
  if (fimDate) {
    const days = Math.ceil((fimDate - today) / 864e5);
    if (days < 0)      contratoStatus = { label: 'Expirado',          color: '#ff3b30' };
    else if (days < 31) contratoStatus = { label: `Vence em ${days}d`, color: '#ff9500' };
    else               contratoStatus = { label: 'Vigente',            color: '#30d158' };
  }
  const duracaoMeses = (iniDate && fimDate)
    ? Math.round((fimDate - iniDate) / (864e5 * 30)) : null;

  const save = async () => {
    if (saving) return;
    setSaving(true); setSaved(false); setSaveErr('');
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          contratoLink:     contratoLink.trim() || null,
          contratoInicio:   contratoInicio || null,
          contratoFim:      contratoFim    || null,
          logins,
          identidadeVisual,
          notas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setSaved(true);
      onSave?.({ ...client, contratoLink: contratoLink.trim() || null, contratoInicio, contratoFim, logins, identidadeVisual, notas });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveErr(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'input';
  const labelCls = 'block text-xs font-medium text-ink-soft mb-1.5';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col shadow-apple-xl bg-surface"
        style={{
          width: '100%', maxWidth: 480,
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-apple flex items-center justify-center bg-accent-soft shrink-0">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{client.nome}</p>
            <p className="text-[11px] text-ink-faint">Informações comerciais</p>
          </div>
          {contratoStatus && (
            <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-pill"
              style={{ background: contratoStatus.color + '22', color: contratoStatus.color }}>
              {contratoStatus.label}
            </span>
          )}
          <button onClick={handleClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-ink-muted
              hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline shrink-0 px-2">
          {COMERCIAL_TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold transition-all cursor-pointer
                  ${active
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-ink-soft hover:text-ink'}`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── Contrato ── */}
          {tab === 'contrato' && (
            <>
              <div>
                <label className={labelCls}>Documento do contrato (link)</label>
                <input type="url" value={contratoLink} onChange={e => setContratoLink(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Data de início</label>
                  <input type="date" value={contratoInicio} onChange={e => setContratoInicio(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data de término</label>
                  <input type="date" value={contratoFim} onChange={e => setContratoFim(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              {duracaoMeses !== null && (
                <div className="rounded-apple px-4 py-3 bg-elevated text-[12px] text-ink-soft">
                  Duração: <strong className="text-ink">{duracaoMeses} {duracaoMeses === 1 ? 'mês' : 'meses'}</strong>
                  {contratoStatus && (
                    <span className="ml-3 font-semibold" style={{ color: contratoStatus.color }}>
                      · {contratoStatus.label}
                    </span>
                  )}
                </div>
              )}
              {contratoLink && (
                <a href={contratoLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline">
                  <ExternalLink className="w-3 h-3" />
                  Abrir documento
                </a>
              )}
            </>
          )}

          {/* ── Acesso ── */}
          {tab === 'acesso' && (
            <>
              <p className="text-[12px] text-ink-faint leading-relaxed">
                Armazene logins e acessos do cliente. Visível apenas internamente.
              </p>
              <div>
                <label className={labelCls}>Logins e acessos</label>
                <textarea
                  value={logins}
                  onChange={e => setLogins(e.target.value)}
                  rows={14}
                  placeholder={'Meta Ads: user@email.com / senha\nGoogle Analytics: ...\nInstagram: ...\nSite (WordPress): admin / ...'}
                  className={`${inputCls} resize-none font-mono text-[12px] leading-relaxed`}
                />
              </div>
            </>
          )}

          {/* ── Visual ── */}
          {tab === 'visual' && (
            <>
              <p className="text-[12px] text-ink-faint leading-relaxed">
                Cores, fontes, guia de estilo e links para arquivos de identidade visual.
              </p>
              <div>
                <label className={labelCls}>Identidade visual</label>
                <textarea
                  value={identidadeVisual}
                  onChange={e => setIdentidadeVisual(e.target.value)}
                  rows={14}
                  placeholder={'Cores:\n  Primária: #1A1A1A\n  Secundária: #F0F0F0\n\nFontes:\n  Título: Inter Bold\n  Corpo: Inter Regular\n\nLinks:\n  Brand kit: https://drive.google.com/…'}
                  className={`${inputCls} resize-none font-mono text-[12px] leading-relaxed`}
                />
              </div>
            </>
          )}

          {/* ── Notas ── */}
          {tab === 'notas' && (
            <>
              <p className="text-[12px] text-ink-faint leading-relaxed">
                Observações gerais, histórico de negociações e informações adicionais.
              </p>
              <div>
                <label className={labelCls}>Notas</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={14}
                  placeholder="Observações gerais sobre o cliente…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-hairline shrink-0">
          {saveErr && (
            <p className="text-xs text-err-ink mb-3 px-3 py-2 rounded-apple bg-err-soft">{saveErr}</p>
          )}
          <button onClick={save} disabled={saving}
            className="btn btn-primary w-full disabled:opacity-40">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin"/> Salvando…</>
              : saved
              ? <><Check className="w-4 h-4"/> Salvo!</>
              : 'Salvar alterações'
            }
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Clientes() {
  const [clients,         setClients]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showNew,         setShowNew]         = useState(false);
  const [igClient,        setIgClient]        = useState(null);
  const [comercialClient, setComercialClient] = useState(null);

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

  const handleInstagramSave = useCallback((clientId, handle) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, instagram: handle } : c));
    setIgClient(prev => prev?.id === clientId ? { ...prev, instagram: handle } : prev);
  }, []);

  const handleComercialSave = useCallback((updated) => {
    setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setComercialClient(updated);
  }, []);

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
              <ClientCard
                key={client.id}
                client={client}
                onDelete={deleteClient}
                onLogoChange={handleLogoChange}
                onInstagram={setIgClient}
                onInstagramSave={handleInstagramSave}
                onComercial={setComercialClient}
              />
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

      {/* Instagram panel */}
      {igClient && (
        <InstagramPanel
          client={igClient}
          onClose={() => setIgClient(null)}
        />
      )}

      {/* Comercial drawer */}
      {comercialClient && (
        <ClientComercialDrawer
          client={comercialClient}
          onClose={() => setComercialClient(null)}
          onSave={handleComercialSave}
        />
      )}
    </CRMLayout>
  );
}
