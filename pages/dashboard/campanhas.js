import { useState, useEffect, useCallback, useRef } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Megaphone, Plus, X, Loader2, Save, Trash2, CheckCircle2,
  Target, DollarSign, Users, Zap, Tag, User,
  Bot, Send, ChevronDown, ShieldAlert, Check, RotateCcw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const CLIENTS = ['fastimoveis', 'mafro'];
const MEMBERS = ['Matheus', 'Sávio'];

const CLIENT_COLORS = {
  fastimoveis: { bg: 'rgba(244,63,94,0.12)',  text: '#e11d48', border: 'rgba(244,63,94,0.28)' },
  mafro:       { bg: 'rgba(14,165,233,0.12)', text: '#0284c7', border: 'rgba(14,165,233,0.28)' },
};

const MEMBER_COLORS = {
  Matheus: { bg: 'rgba(139,92,246,0.12)', text: '#7c3aed', border: 'rgba(139,92,246,0.30)' },
  Sávio:   { bg: 'rgba(52,199,89,0.12)',  text: '#15803d', border: 'rgba(52,199,89,0.30)'  },
};

const ESTADOS = [
  { value: 'Rascunho',             label: 'Rascunho',          color: '#8e8e93' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação', color: '#ff9500' },
  { value: 'Aprovado',             label: 'Aprovado',          color: '#34c759' },
  { value: 'Em Execução',          label: 'Em Execução',       color: '#0071e3' },
  { value: 'Concluído',            label: 'Concluído',         color: '#8e8e93' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const nrm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function clientColor(name) {
  return CLIENT_COLORS[nrm(name).replace(/\s/g, '')] ||
    { bg: 'rgba(0,0,0,0.04)', text: '#6b7280', border: 'rgba(0,0,0,0.08)' };
}

function estadoMeta(value) {
  return ESTADOS.find(e => nrm(e.value) === nrm(value)) || ESTADOS[0];
}

function parseBriefing(text = '') {
  const extract = key => {
    const m = text.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
    return m ? m[1].trim() : '';
  };
  return {
    objetivo: extract('OBJETIVO'),
    verba:    extract('VERBA'),
    publico:  extract('PÚBLICO-ALVO'),
    ganchos:  extract('GANCHOS'),
  };
}

function formatBriefing({ objetivo, verba, publico, ganchos }) {
  return [
    objetivo ? `OBJETIVO: ${objetivo}` : '',
    verba    ? `VERBA: ${verba}`       : '',
    publico  ? `PÚBLICO-ALVO: ${publico}` : '',
    ganchos  ? `GANCHOS: ${ganchos}`   : '',
  ].filter(Boolean).join('\n');
}

// ── Estado badge ──────────────────────────────────────────────────────────────
function EstadoBadge({ value }) {
  const meta = estadoMeta(value);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold"
      style={{
        background: `${meta.color}14`,
        color: meta.color,
        border: `1px solid ${meta.color}35`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

// ── Briefing field row ────────────────────────────────────────────────────────
function BriefingRow({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint block leading-none mb-0.5">
          {label}
        </span>
        <span className="text-[11px] text-ink-soft leading-snug line-clamp-2 block">{value}</span>
      </div>
    </div>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────
function CampaignCard({ item, onClick }) {
  const cl = clientColor(item.cliente);
  const briefing = parseBriefing(item.conteudo);
  const hasBriefing = briefing.objetivo || briefing.verba || briefing.publico || briefing.ganchos;

  return (
    <button
      onClick={() => onClick(item)}
      className="w-full text-left rounded-apple-xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer bg-surface border border-hairline shadow-apple-sm hover:shadow-apple"
    >
      {/* Client + estado row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {item.cliente ? (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}
          >
            {item.cliente}
          </span>
        ) : (
          <span />
        )}
        <EstadoBadge value={item.estado || 'Rascunho'} />
      </div>

      {/* Title */}
      <p className="text-[14px] font-semibold text-ink leading-snug mb-2 tracking-apple-snug line-clamp-2">
        {item.nome}
      </p>

      {/* Responsável */}
      {item.responsavel && (
        <div className="flex items-center gap-1 mb-3">
          <User className="w-3 h-3 text-ink-faint" />
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: (MEMBER_COLORS[item.responsavel] || {}).bg || 'rgba(0,0,0,0.04)',
              color:      (MEMBER_COLORS[item.responsavel] || {}).text || '#6b7280',
              border:     `1px solid ${(MEMBER_COLORS[item.responsavel] || {}).border || 'rgba(0,0,0,0.08)'}`,
            }}
          >
            {item.responsavel}
          </span>
        </div>
      )}

      {/* Briefing preview */}
      {hasBriefing ? (
        <div className="space-y-1.5 pt-3 border-t border-hairline">
          <BriefingRow icon={Target}     label="Objetivo"     value={briefing.objetivo} color="#0071e3" />
          <BriefingRow icon={DollarSign} label="Verba"        value={briefing.verba}    color="#34c759" />
          <BriefingRow icon={Users}      label="Público-alvo" value={briefing.publico}  color="#ff9500" />
          <BriefingRow icon={Zap}        label="Ganchos"      value={briefing.ganchos}  color="#8b5cf6" />
        </div>
      ) : (
        <div className="pt-3 border-t border-hairline">
          <p className="text-[11px] text-ink-faint italic">Briefing não preenchido</p>
        </div>
      )}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-apple-xl p-4 bg-surface border border-hairline shadow-apple-sm animate-pulse">
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-4 w-20 rounded-md bg-elevated" />
        <div className="h-4 w-24 rounded-pill bg-elevated" />
      </div>
      <div className="h-5 w-3/4 rounded-md bg-elevated mb-2" />
      <div className="h-3 w-16 rounded-md bg-elevated mb-3" />
      <div className="pt-3 border-t border-hairline space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-3 rounded-md bg-elevated" style={{ width: `${70 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── New Campaign Modal ────────────────────────────────────────────────────────
function NewCampaignModal({ onClose, onCreate }) {
  const [nome,       setNome]       = useState('');
  const [cliente,    setCliente]    = useState('');
  const [responsavel,setResponsavel]= useState('');
  const [objetivo,   setObjetivo]   = useState('');
  const [verba,      setVerba]      = useState('');
  const [publico,    setPublico]    = useState('');
  const [ganchos,    setGanchos]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const submit = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/crm/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          cliente,
          formato: 'Campanha',
          responsavel,
          estado: 'Rascunho',
          conteudo: formatBriefing({ objetivo, verba, publico, ganchos }),
        }),
      });
      if (!res.ok) throw new Error();
      const { content } = await res.json();
      onCreate(content);
      onClose();
    } catch {
      setError('Erro ao criar campanha. Tente novamente.');
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-apple-2xl flex flex-col overflow-hidden bg-surface border border-hairline shadow-apple-xl"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline shrink-0">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" />
            <p className="t-title text-ink">Nova Campanha</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Nome */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">
              Nome <span className="text-err">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ex: Campanha Fim de Safra — Mafro"
              className="input"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Cliente</label>
            <div className="flex gap-2">
              {CLIENTS.map(c => {
                const cc = CLIENT_COLORS[c] || {};
                const active = cliente === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCliente(active ? '' : c)}
                    className="flex-1 py-2.5 rounded-apple text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
                    style={{
                      background: active ? cc.bg : '#f5f5f7',
                      border: `1px solid ${active ? cc.border : 'rgba(0,0,0,0.06)'}`,
                      color: active ? cc.text : '#6b7280',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block t-eyebrow text-ink-muted mb-2">Responsável</label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const mc = MEMBER_COLORS[m] || {};
                const active = responsavel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setResponsavel(active ? '' : m)}
                    className="flex-1 py-2.5 rounded-apple text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background: active ? mc.bg : '#f5f5f7',
                      border: `1px solid ${active ? mc.border : 'rgba(0,0,0,0.06)'}`,
                      color: active ? mc.text : '#6b7280',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-hairline pt-4">
            <p className="t-eyebrow text-ink-muted mb-4">Briefing</p>

            {/* Objetivo */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                  <Target className="w-3 h-3 text-accent" /> Objetivo
                </label>
                <textarea
                  value={objetivo}
                  onChange={e => setObjetivo(e.target.value)}
                  rows={2}
                  placeholder="Ex: Gerar mensagens de WhatsApp para venda de trator"
                  className="input resize-none"
                />
              </div>

              {/* Verba */}
              <div>
                <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                  <DollarSign className="w-3 h-3" style={{ color: '#34c759' }} /> Verba
                </label>
                <input
                  type="text"
                  value={verba}
                  onChange={e => setVerba(e.target.value)}
                  placeholder="R$ 0,00/semana"
                  className="input"
                />
              </div>

              {/* Público-alvo */}
              <div>
                <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                  <Users className="w-3 h-3" style={{ color: '#ff9500' }} /> Público-alvo
                </label>
                <textarea
                  value={publico}
                  onChange={e => setPublico(e.target.value)}
                  rows={2}
                  placeholder="Ex: Produtores rurais de 35-60 anos, Mato Grosso"
                  className="input resize-none"
                />
              </div>

              {/* Ganchos */}
              <div>
                <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                  <Zap className="w-3 h-3" style={{ color: '#8b5cf6' }} /> Ganchos
                </label>
                <textarea
                  value={ganchos}
                  onChange={e => setGanchos(e.target.value)}
                  rows={2}
                  placeholder="Principais ângulos e hooks…"
                  className="input resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-err px-3 py-2 rounded-apple bg-err-soft border border-err/20">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline flex gap-3 shrink-0">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!nome.trim() || saving}
            className="btn btn-primary flex-1"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Criando…' : 'Criar Campanha'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Panel (slide-in) ─────────────────────────────────────────────────
function CampaignPanel({ item, onSave, onDelete, onClose }) {
  const [tab,        setTab]        = useState('briefing');
  const [nome,       setNome]       = useState(item.nome || '');
  const [cliente,    setCliente]    = useState(item.cliente || '');
  const [responsavel,setResponsavel]= useState(item.responsavel || '');
  const [estado,     setEstado]     = useState(item.estado || 'Rascunho');
  const [dataInicio, setDataInicio] = useState(item.dataInicio || '');
  const [objetivo,   setObjetivo]   = useState('');
  const [verba,      setVerba]      = useState('');
  const [publico,    setPublico]    = useState('');
  const [ganchos,    setGanchos]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [visible,    setVisible]    = useState(false);

  // Parse briefing on item change
  useEffect(() => {
    const b = parseBriefing(item.conteudo);
    setNome(item.nome || '');
    setCliente(item.cliente || '');
    setResponsavel(item.responsavel || '');
    setEstado(item.estado || 'Rascunho');
    setDataInicio(item.dataInicio || '');
    setObjetivo(b.objetivo);
    setVerba(b.verba);
    setPublico(b.publico);
    setGanchos(b.ganchos);
    setTab('briefing');
    setConfirmDel(false);
  }, [item.id]);

  // Slide-in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const dirty =
    nome !== (item.nome || '') ||
    cliente !== (item.cliente || '') ||
    responsavel !== (item.responsavel || '') ||
    estado !== (item.estado || 'Rascunho') ||
    dataInicio !== (item.dataInicio || '') ||
    formatBriefing({ objetivo, verba, publico, ganchos }) !== (item.conteudo || '');

  const save = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    await onSave(item.id, {
      nome,
      cliente: cliente || undefined,
      responsavel: responsavel || undefined,
      estado,
      dataInicio: dataInicio || undefined,
      conteudo: formatBriefing({ objetivo, verba, publico, ganchos }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    await onDelete(item.id);
    handleClose();
  };

  const cl = clientColor(cliente || item.cliente);

  const TABS = [
    { id: 'briefing', label: 'Briefing' },
    { id: 'status',   label: 'Status'   },
  ];

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
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-surface border-l border-hairline shadow-apple-xl"
        style={{
          width: '100%',
          maxWidth: 520,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0 border-b border-hairline">
          <div className="flex items-start gap-3 pr-9">
            <div className="flex-1 min-w-0">
              {/* Client badge */}
              {(cliente || item.cliente) && (
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1.5 inline-block"
                  style={{ background: cl.bg, color: cl.text, border: `1px solid ${cl.border}` }}
                >
                  {cliente || item.cliente}
                </span>
              )}
              <h3 className="t-title text-ink leading-snug">{item.nome}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <EstadoBadge value={estado} />
                {responsavel && (
                  <span className="text-[11px] text-ink-muted flex items-center gap-1">
                    <User className="w-3 h-3" /> {responsavel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-apple text-ink-muted hover:text-ink hover:bg-elevated transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 bg-elevated rounded-apple-lg p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-apple text-[12px] font-semibold cursor-pointer transition-all duration-150 ${
                  tab === t.id
                    ? 'bg-white text-ink shadow-apple-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === 'briefing' && (
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block t-eyebrow text-ink-muted mb-1.5">
                  Nome <span className="text-err">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="input"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block t-eyebrow text-ink-muted mb-1.5">Cliente</label>
                <div className="flex gap-2">
                  {CLIENTS.map(c => {
                    const cc = CLIENT_COLORS[c] || {};
                    const active = nrm(cliente) === nrm(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCliente(active ? '' : c)}
                        className="flex-1 py-2.5 rounded-apple text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
                        style={{
                          background: active ? cc.bg : '#f5f5f7',
                          border: `1px solid ${active ? cc.border : 'rgba(0,0,0,0.06)'}`,
                          color: active ? cc.text : '#6b7280',
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label className="block t-eyebrow text-ink-muted mb-1.5">Responsável</label>
                <div className="flex gap-2">
                  {MEMBERS.map(m => {
                    const mc = MEMBER_COLORS[m] || {};
                    const active = nrm(responsavel) === nrm(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setResponsavel(active ? '' : m)}
                        className="flex-1 py-2.5 rounded-apple text-sm font-semibold cursor-pointer transition-all"
                        style={{
                          background: active ? mc.bg : '#f5f5f7',
                          border: `1px solid ${active ? mc.border : 'rgba(0,0,0,0.06)'}`,
                          color: active ? mc.text : '#6b7280',
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-hairline pt-4">
                <p className="t-eyebrow text-ink-muted mb-4">Briefing</p>
                <div className="space-y-4">
                  {/* Objetivo */}
                  <div>
                    <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                      <Target className="w-3 h-3 text-accent" /> Objetivo
                    </label>
                    <textarea
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value)}
                      rows={3}
                      placeholder="Ex: Gerar mensagens de WhatsApp para venda de trator"
                      className="input resize-none leading-relaxed"
                    />
                  </div>

                  {/* Verba */}
                  <div>
                    <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                      <DollarSign className="w-3 h-3" style={{ color: '#34c759' }} /> Verba
                    </label>
                    <input
                      type="text"
                      value={verba}
                      onChange={e => setVerba(e.target.value)}
                      placeholder="R$ 0,00/semana"
                      className="input"
                    />
                  </div>

                  {/* Público-alvo */}
                  <div>
                    <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                      <Users className="w-3 h-3" style={{ color: '#ff9500' }} /> Público-alvo
                    </label>
                    <textarea
                      value={publico}
                      onChange={e => setPublico(e.target.value)}
                      rows={3}
                      placeholder="Ex: Produtores rurais de 35-60 anos, Mato Grosso"
                      className="input resize-none leading-relaxed"
                    />
                  </div>

                  {/* Ganchos */}
                  <div>
                    <label className="flex items-center gap-1.5 t-eyebrow text-ink-muted mb-1.5">
                      <Zap className="w-3 h-3" style={{ color: '#8b5cf6' }} /> Ganchos
                    </label>
                    <textarea
                      value={ganchos}
                      onChange={e => setGanchos(e.target.value)}
                      rows={3}
                      placeholder="Principais ângulos e hooks…"
                      className="input resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'status' && (
            <div className="space-y-5">
              {/* Estado grid */}
              <div>
                <label className="block t-eyebrow text-ink-muted mb-3">Estado</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ESTADOS.map(s => {
                    const active = nrm(estado) === nrm(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setEstado(s.value)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-apple text-[12px] font-semibold cursor-pointer transition-all text-left"
                        style={{
                          background: active ? `${s.color}14` : '#f5f5f7',
                          border: `1px solid ${active ? `${s.color}40` : 'rgba(0,0,0,0.06)'}`,
                          color: active ? s.color : '#6b7280',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: active ? s.color : 'rgba(0,0,0,0.18)' }}
                        />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data de início */}
              <div>
                <label className="block t-eyebrow text-ink-muted mb-1.5">Data de início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4 shrink-0 border-t border-hairline bg-elevated/50">
          <button
            onClick={handleDelete}
            disabled={deleting}
            onBlur={() => setTimeout(() => setConfirmDel(false), 200)}
            className={`btn ${confirmDel ? 'btn-danger' : 'btn-secondary'}`}
          >
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? 'Removendo…' : confirmDel ? 'confirmar' : 'excluir'}
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving || !nome.trim()}
            className="btn btn-primary flex-1"
            style={saved ? { background: '#34c759' } : undefined}
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
                ? <CheckCircle2 className="w-4 h-4" />
                : <Save className="w-4 h-4" />}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'salvar'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Mini Chat Drawer ──────────────────────────────────────────────────────────
function MiniChat({ campaigns, onClose }) {
  const GREETING = {
    role: 'assistant',
    content: 'Olá! Estou aqui enquanto você analisa as campanhas. Posso consultar métricas do Meta Ads, sugerir ajustes de verba, pausar campanhas ou criar novas. Como posso ajudar?',
  };

  const [messages,      setMessages]      = useState([GREETING]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [approving,     setApproving]     = useState(false);
  const [visible,       setVisible]       = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingAction]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 240);
  };

  const send = useCallback(async (txt) => {
    const text = (txt || input).trim();
    if (!text || loading) return;
    setPendingAction(null);
    setInput('');
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch('/api/crm/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      if (data.pendingAction) {
        setPendingAction(data.pendingAction);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'error', content: e.message }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [input, messages, loading]);

  const approve = useCallback(async () => {
    if (!pendingAction || approving) return;
    setApproving(true);
    try {
      const res = await fetch('/api/crm/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, pendingAction: { ...pendingAction, approved: true } }),
      });
      const data = await res.json();
      setPendingAction(null);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || '✅ Ação executada.' }]);
    } catch (e) {
      setPendingAction(null);
      setMessages(prev => [...prev, { role: 'error', content: e.message }]);
    } finally {
      setApproving(false);
    }
  }, [pendingAction, approving, messages]);

  const cancel = useCallback(() => {
    const title = pendingAction?.description?.title || 'Ação';
    setPendingAction(null);
    setMessages(prev => [...prev, { role: 'assistant', content: `❌ **${title}** cancelada. Nenhuma alteração foi feita.` }]);
  }, [pendingAction]);

  // Quick suggestions for campaigns context
  const QUICK = [
    'Liste as campanhas ativas',
    'Ver métricas do Meta Ads',
    'Pausar uma campanha',
  ];

  function MsgBubble({ msg }) {
    const isUser  = msg.role === 'user';
    const isError = msg.role === 'error';
    // Mini markdown: bold only
    const renderText = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
        : p
    );
    return (
      <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
            ${isError ? 'bg-red-100' : 'bg-gradient-to-br from-[#0a84ff] to-[#0055d4]'}`}>
            <Bot className="w-3 h-3 text-white"/>
          </div>
        )}
        <div className={`px-3 py-2 rounded-[12px] text-[13px] leading-relaxed max-w-[82%] whitespace-pre-wrap
          ${isUser  ? 'bg-[rgba(0,113,227,0.10)] text-[#0055d4]' :
            isError ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-white text-[#1d1d1f] border border-[rgba(0,0,0,0.07)] shadow-sm'}`}>
          {msg.content.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>{renderText(line)}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[45] flex flex-col bg-[#f5f5f7] rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[rgba(0,0,0,0.08)]"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
        right: 16,
        width: 'min(390px, calc(100vw - 32px))',
        height: 'min(520px, 65vh)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.24s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[rgba(0,0,0,0.07)] bg-white rounded-t-[20px] shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#0055d4] flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">Assistente IA</p>
          <p className="text-[10px] text-[#aeaeb2]">Campanhas · Gemini 2.5 Flash</p>
        </div>
        <button onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#aeaeb2]
            hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.06)] transition-all cursor-pointer">
          <ChevronDown className="w-4 h-4"/>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((m, i) => <MsgBubble key={i} msg={m}/>)}

        {/* Approval card */}
        {pendingAction && (
          <div className="rounded-[14px] border-2 border-amber-200 bg-amber-50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 border-b border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700"/>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Confirmação — Meta Ads</p>
            </div>
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-[12px] font-semibold text-[#1d1d1f]">{pendingAction.description?.title}</p>
              <p className="text-[11px] text-amber-700 leading-snug">{pendingAction.description?.warning}</p>
              <div className="rounded-[8px] bg-white border border-amber-100 overflow-hidden">
                {(pendingAction.description?.params || []).map((p, i) => (
                  <div key={i} className={`flex gap-2 px-2.5 py-1.5 ${i > 0 ? 'border-t border-amber-50' : ''}`}>
                    <span className="text-[10px] text-[#aeaeb2] font-medium w-24 shrink-0">{p.label}</span>
                    <span className="text-[11px] font-semibold text-[#1d1d1f] break-all">{p.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-0.5">
                <button onClick={cancel} disabled={approving}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold text-[#6e6e73]
                    border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f7] transition-all cursor-pointer">
                  Cancelar
                </button>
                <button onClick={approve} disabled={approving}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-bold text-white
                    bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  {approving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
                  Aprovar
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#0055d4] flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-white"/>
            </div>
            <div className="flex items-center gap-1 bg-white border border-[rgba(0,0,0,0.07)] shadow-sm px-3 py-2 rounded-[12px]">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#aeaeb2] animate-bounce"
                  style={{ animationDelay: `${i*150}ms`, animationDuration: '900ms' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick suggestions (only before user sends first message) */}
      {messages.length === 1 && !loading && (
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="shrink-0 px-2.5 py-1.5 rounded-[10px] text-[11px] font-medium
                bg-white border border-[rgba(0,0,0,0.08)] text-[#6e6e73]
                hover:text-[#1d1d1f] hover:border-[rgba(0,0,0,0.18)] transition-all cursor-pointer whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-white rounded-[14px] border border-[rgba(0,0,0,0.10)] px-3 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
            rows={1}
            placeholder="Pergunte sobre as campanhas…"
            className="flex-1 text-[13px] text-[#1d1d1f] placeholder-[#aeaeb2] resize-none outline-none bg-transparent leading-relaxed disabled:opacity-50"
            style={{ maxHeight: 80, overflowY: 'auto' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer
              bg-[#0071e3] hover:bg-[#0055d4] text-white transition-all
              disabled:opacity-30 disabled:cursor-not-allowed active:scale-90">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Campanhas() {
  const [campaigns,     setCampaigns]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterEstado,  setFilterEstado]  = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [showNew,       setShowNew]       = useState(false);
  const [showChat,      setShowChat]      = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => {
        const all = d.content || [];
        setCampaigns(all.filter(c => nrm(c.formato) === 'campanha'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const createCampaign = useCallback(c => {
    setCampaigns(prev => [c, ...prev]);
  }, []);

  const updateCampaign = useCallback(async (id, fields) => {
    // Optimistic update
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    setSelectedItem(prev => prev?.id === id ? { ...prev, ...fields } : prev);

    try {
      const res = await fetch('/api/crm/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      if (res.ok) {
        const { content: updated } = await res.json();
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
        setSelectedItem(prev => prev?.id === id ? { ...prev, ...updated } : prev);
      }
    } catch {
      // silently fail — optimistic update stays
    }
  }, []);

  const deleteCampaign = useCallback(async id => {
    await fetch('/api/crm/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setSelectedItem(null);
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = campaigns.filter(c => {
    if (filterEstado  && nrm(c.estado)   !== nrm(filterEstado))  return false;
    if (filterCliente && nrm(c.cliente).replace(/\s/g,'') !== nrm(filterCliente).replace(/\s/g,'')) return false;
    return true;
  });

  // Estado counts for filter chips
  const estadoCounts = ESTADOS.reduce((acc, e) => {
    acc[e.value] = campaigns.filter(c => nrm(c.estado) === nrm(e.value)).length;
    return acc;
  }, {});

  return (
    <CRMLayout title="Campanhas — T3 Studio CRM">
      <div className="flex flex-col min-h-screen bg-canvas">

        {/* ── Top bar ── */}
        <div className="px-5 lg:px-8 pt-6 pb-4 shrink-0 border-b border-hairline bg-surface/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h1 className="t-title-lg text-ink flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-accent" />
                Campanhas
              </h1>
              <p className="t-small text-ink-muted mt-0.5">
                {loading ? '…' : `${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <button onClick={() => setShowNew(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Nova Campanha
            </button>
          </div>

          {/* ── Filters ── */}
          <div className="rounded-apple-xl overflow-hidden border border-hairline bg-surface">

            {/* Row 1 — Estado */}
            <div className="flex items-center border-b border-hairline">
              <div
                className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none border-r border-hairline"
                style={{ minWidth: 100 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                  Estado
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {/* All */}
                <button
                  onClick={() => setFilterEstado('')}
                  className="shrink-0 px-3 py-1 rounded-pill text-[11px] font-semibold cursor-pointer transition-all duration-150 active:scale-95"
                  style={{
                    background: !filterEstado ? '#1d1d1f' : '#f5f5f7',
                    border: `1px solid ${!filterEstado ? '#1d1d1f' : 'rgba(0,0,0,0.06)'}`,
                    color: !filterEstado ? 'white' : '#6b7280',
                  }}
                >
                  Todos
                </button>
                {ESTADOS.map(e => {
                  const active = nrm(filterEstado) === nrm(e.value);
                  const count = estadoCounts[e.value] || 0;
                  return (
                    <button
                      key={e.value}
                      onClick={() => setFilterEstado(active ? '' : e.value)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-semibold cursor-pointer transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? `${e.color}14` : '#f5f5f7',
                        border: `1px solid ${active ? `${e.color}40` : 'rgba(0,0,0,0.06)'}`,
                        color: active ? e.color : '#6b7280',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: active ? e.color : 'rgba(0,0,0,0.2)' }}
                      />
                      {e.label}
                      {count > 0 && (
                        <span
                          className="text-[9px] px-1 rounded-sm font-bold"
                          style={{
                            background: active ? `${e.color}22` : 'rgba(0,0,0,0.06)',
                            color: active ? e.color : '#9ca3af',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filterEstado && (
                <button
                  onClick={() => setFilterEstado('')}
                  className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-muted-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Row 2 — Cliente */}
            <div className="flex items-center">
              <div
                className="shrink-0 px-4 py-2.5 flex items-center gap-1.5 select-none border-r border-hairline"
                style={{ minWidth: 100 }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#8b5cf6' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                  Cliente
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto flex-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <button
                  onClick={() => setFilterCliente('')}
                  className="shrink-0 px-3 py-1 rounded-pill text-[11px] font-semibold cursor-pointer transition-all duration-150 active:scale-95"
                  style={{
                    background: !filterCliente ? '#1d1d1f' : '#f5f5f7',
                    border: `1px solid ${!filterCliente ? '#1d1d1f' : 'rgba(0,0,0,0.06)'}`,
                    color: !filterCliente ? 'white' : '#6b7280',
                  }}
                >
                  Todos
                </button>
                {CLIENTS.map(c => {
                  const cc = CLIENT_COLORS[c] || {};
                  const active = nrm(filterCliente).replace(/\s/g,'') === nrm(c).replace(/\s/g,'');
                  return (
                    <button
                      key={c}
                      onClick={() => setFilterCliente(active ? '' : c)}
                      className="shrink-0 px-3 py-1 rounded-pill text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? cc.bg : '#f5f5f7',
                        border: `1px solid ${active ? cc.border : 'rgba(0,0,0,0.06)'}`,
                        color: active ? cc.text : '#6b7280',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {filterCliente && (
                <button
                  onClick={() => setFilterCliente('')}
                  className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-ink-muted hover:text-ink bg-elevated hover:bg-muted-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="flex-1 px-5 lg:px-8 py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div
                className="w-16 h-16 rounded-apple-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.16)' }}
              >
                <Megaphone className="w-8 h-8 text-accent opacity-50" />
              </div>
              <p className="t-title text-ink-muted mb-1">
                {filterEstado || filterCliente
                  ? 'Nenhuma campanha corresponde ao filtro'
                  : 'Nenhuma campanha cadastrada'}
              </p>
              <p className="t-small text-ink-faint mb-6">
                {filterEstado || filterCliente
                  ? 'Tente remover os filtros para ver todas as campanhas.'
                  : 'Comece criando a primeira campanha da equipe.'}
              </p>
              {!filterEstado && !filterCliente && (
                <button onClick={() => setShowNew(true)} className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  Nova Campanha
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <CampaignCard key={c.id} item={c} onClick={setSelectedItem} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign panel ── */}
      {selectedItem && (
        <CampaignPanel
          item={selectedItem}
          onSave={updateCampaign}
          onDelete={deleteCampaign}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* ── New campaign modal ── */}
      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreate={createCampaign}
        />
      )}

      {/* ── Floating AI chat button ── */}
      <button
        onClick={() => setShowChat(v => !v)}
        aria-label="Abrir assistente IA"
        className="fixed z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          right: 20,
          background: showChat
            ? 'linear-gradient(135deg, #636366 0%, #3a3a3c 100%)'
            : 'linear-gradient(135deg, #0a84ff 0%, #0055d4 100%)',
          boxShadow: showChat
            ? '0 4px 20px rgba(0,0,0,0.25)'
            : '0 4px 20px rgba(0,113,227,0.45)',
        }}
      >
        {showChat
          ? <ChevronDown className="w-5 h-5"/>
          : <Bot className="w-5 h-5"/>}
      </button>

      {/* ── Mini chat drawer ── */}
      {showChat && (
        <MiniChat campaigns={campaigns} onClose={() => setShowChat(false)}/>
      )}
    </CRMLayout>
  );
}
