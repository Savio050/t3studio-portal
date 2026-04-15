import { useState, useEffect, useRef, useCallback } from 'react';
import CRMLayout from '../../components/crm/Layout';
import {
  Film, ChevronDown, X, Edit3, Loader2, Clock, User,
  AlertTriangle, LayoutGrid, User2, CalendarDays,
  ChevronLeft, ChevronRight, Save, PenLine, CheckCircle2,
  Plus, Trash2,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MEMBERS  = ['Matheus', 'Sávio'];
const CLIENTS  = ['fastimoveis', 'mafro'];

const ROTEIRO_STATES = [
  { value: 'Não iniciada',         label: 'Não iniciada',         color: '#64748b' },
  { value: 'Em Produção',          label: 'Em criação',           color: '#a78bfa' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação',    color: '#f59e0b' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado',    color: '#f97316' },
  { value: 'Aprovado',             label: 'Aprovado',             color: '#10b981' },
  { value: 'Concluido',            label: 'Concluído',            color: '#64748b' },
];

const STATUS_OPTIONS = [
  { value: 'não iniciado',         label: 'Não iniciado',         dot: '#64748b' },
  { value: 'Em Produção',          label: 'Em Produção',          dot: '#0ea5e9' },
  { value: 'Aguardando Aprovação', label: 'Aguard. aprovação',    dot: '#f59e0b' },
  { value: 'Ajuste Solicitado',    label: 'Ajuste solicitado',    dot: '#f97316' },
  { value: 'Aprovado',             label: 'Aprovado',             dot: '#10b981' },
  { value: 'Concluido',            label: 'Concluído',            dot: '#64748b' },
];

const COLUMNS = [
  { id: 'nao-iniciado',      label: 'Não Iniciado',      sublabel: 'Backlog',             color: '#64748b', glow: 'rgba(100,116,139,0.10)' },
  { id: 'roteirizacao',      label: 'Em Roteirização',   sublabel: 'Script em criação',   color: '#a78bfa', glow: 'rgba(124,58,237,0.12)'  },
  { id: 'aguardando-cliente',label: 'Aguardando Cliente',sublabel: 'Aprovação pendente',  color: '#fbbf24', glow: 'rgba(245,158,11,0.12)',  urgent: true },
  { id: 'em-producao',       label: 'Em Produção',       sublabel: 'Edição / Gravação',   color: '#38bdf8', glow: 'rgba(14,165,233,0.12)'  },
  { id: 'concluido',         label: 'Pronto',            sublabel: 'Aprovado / Concluído',color: '#34d399', glow: 'rgba(16,185,129,0.10)'  },
];

const CLIENT_COLORS = {
  'fastimoveis': { bg: 'rgba(244,63,94,0.15)', text: '#fb7185', border: 'rgba(244,63,94,0.3)'  },
  'mafro':       { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)'  },
};

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const nrm = (s) => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const clientColor = (nome) =>
  CLIENT_COLORS[nrm(nome).replace(/\s/g,'')] ||
  { bg:'rgba(255,255,255,0.06)', text:'rgba(255,255,255,0.45)', border:'rgba(255,255,255,0.1)' };

const fmtShort = (d) => {
  if (!d) return null;
  const [,m,day] = d.split('-');
  return `${day}/${m}`;
};
const fmtFull = (d) => {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function classifyItem(item) {
  const e = nrm(item.estado);
  const r = nrm(item.estadoRoteiro);
  if (e === 'aprovado' || e === 'concluido')                                       return 'concluido';
  if (e.includes('aguardando')||r.includes('aguardando')||e.includes('ajuste')||r.includes('ajuste')) return 'aguardando-cliente';
  if (e.includes('producao')||e.includes('produção'))                              return 'em-producao';
  if (r.includes('producao')||r.includes('produção'))                             return 'roteirizacao';
  return 'nao-iniciado';
}

// Monday of the week containing `date`
function weekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
}

function groupByWeek(items) {
  const map = {};
  const noDate = [];
  items.forEach(item => {
    const dateStr = item.postagem || item.dataGravacao;
    if (!dateStr) { noDate.push(item); return; }
    const mon = weekMonday(new Date(dateStr));
    const key = mon.toISOString().slice(0,10);
    if (!map[key]) map[key] = { monday: mon, items: [] };
    map[key].items.push(item);
  });
  const weeks = Object.values(map).sort((a,b) => a.monday - b.monday);
  return { weeks, noDate };
}

function weekLabel(monday) {
  const sun = new Date(monday);
  sun.setDate(monday.getDate() + 6);
  const d1 = monday.getDate();
  const d2 = sun.getDate();
  const m1 = MONTHS_PT[monday.getMonth()].slice(0,3);
  const m2 = MONTHS_PT[sun.getMonth()].slice(0,3);
  if (monday.getMonth() === sun.getMonth())
    return `${d1}–${d2} ${m1}`;
  return `${d1} ${m1} – ${d2} ${m2}`;
}

// ── Inline status dropdown ────────────────────────────────────────────────────
function StatusDropdown({ item, onUpdate }) {
  const [open,setBusy2] = useState(false);
  const [busy,setBusy]  = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setBusy2(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = STATUS_OPTIONS.find(o => nrm(o.value) === nrm(item.estado)) || STATUS_OPTIONS[0];
  const update = async (val) => {
    setBusy2(false); setBusy(true);
    await onUpdate(item.id, { estado: val });
    setBusy(false);
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setBusy2(v=>!v)} disabled={busy}
        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer transition-all duration-150 hover:brightness-125"
        style={{ background:`${cur.dot}18`, color:cur.dot, border:`1px solid ${cur.dot}30` }}>
        {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <div className="w-1.5 h-1.5 rounded-full" style={{background:cur.dot}}/>}
        <span className="hidden sm:inline">{cur.label}</span>
        <ChevronDown className="w-2.5 h-2.5"/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 rounded-xl py-1 w-44 shadow-2xl"
          style={{background:'rgba(10,18,35,0.99)',border:'1px solid rgba(255,255,255,0.1)'}}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => update(o.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-white/[0.05] cursor-pointer"
              style={{color: nrm(o.value)===nrm(item.estado) ? o.dot : 'rgba(255,255,255,0.65)'}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:o.dot}}/>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Content Card (shared between Kanban + Weekly) ─────────────────────────────
function ContentCard({ item, onUpdate, onEdit }) {
  const cl    = clientColor(item.cliente);
  const isAjuste = nrm(item.estado).includes('ajuste') || nrm(item.estadoRoteiro).includes('ajuste');
  const roteiroState = ROTEIRO_STATES.find(s => nrm(s.value) === nrm(item.estadoRoteiro));

  return (
    <article
      className="rounded-xl p-3 transition-all duration-200 group cursor-default"
      style={{
        background:'rgba(255,255,255,0.045)',
        border: isAjuste ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.07)',
      }}>

      {/* Ajuste strip */}
      {isAjuste && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-orange-400"
          style={{background:'rgba(249,115,22,0.12)',border:'1px solid rgba(249,115,22,0.2)'}}>
          <AlertTriangle className="w-3 h-3 shrink-0"/> Ajuste solicitado
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-xs font-semibold text-white/90 leading-snug line-clamp-2 flex-1">
          {item.nome}
        </p>
        {/* Edit button */}
        <button
          onClick={() => onEdit(item)}
          aria-label="Editar conteúdo"
          className="ml-1 w-6 h-6 flex items-center justify-center rounded-lg shrink-0
            text-white/15 hover:text-violet-400 hover:bg-violet-500/15
            opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer">
          <PenLine className="w-3 h-3"/>
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        {item.cliente && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
            style={{background:cl.bg, color:cl.text, border:`1px solid ${cl.border}`}}>
            {item.cliente}
          </span>
        )}
        {item.formato && (
          <span className="text-[9px] text-white/30 font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04]">
            {item.formato}
          </span>
        )}
        {roteiroState && nrm(roteiroState.value) !== 'nao iniciada' && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{background:`${roteiroState.color}15`, color:roteiroState.color, border:`1px solid ${roteiroState.color}30`}}>
            <Edit3 className="w-2 h-2"/> {roteiroState.label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.responsavel && (
            <span className="flex items-center gap-1 text-[10px] text-white/30 font-medium truncate">
              <User className="w-2.5 h-2.5 shrink-0"/> {item.responsavel}
            </span>
          )}
          {(item.postagem || item.dataGravacao) && (
            <span className="flex items-center gap-1 text-[10px] text-white/25 font-medium shrink-0">
              <Clock className="w-2.5 h-2.5 shrink-0"/> {fmtShort(item.postagem||item.dataGravacao)}
            </span>
          )}
        </div>
        <StatusDropdown item={item} onUpdate={onUpdate}/>
      </div>

      {item.feedbackCliente && (
        <div className="mt-2 px-2 py-1.5 rounded-lg text-[10px] text-orange-300/80 leading-snug"
          style={{background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.15)'}}>
          {item.feedbackCliente.slice(0,80)}{item.feedbackCliente.length>80?'…':''}
        </div>
      )}
    </article>
  );
}

const FORMATOS = ['Reels', 'Carrossel', 'Stories', 'Post', 'Vídeo', 'TikTok', 'YouTube'];

// ── New Content Modal ─────────────────────────────────────────────────────────
function NewContentModal({ onClose, onCreate }) {
  const [nome,         setNome]         = useState('');
  const [cliente,      setCliente]      = useState('');
  const [formato,      setFormato]      = useState('');
  const [responsavel,  setResponsavel]  = useState('');
  const [postagem,     setPostagem]     = useState('');
  const [dataGravacao, setDataGravacao] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const canSave = nome.trim().length > 0;

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/crm/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cliente, formato, responsavel, postagem: postagem||undefined, dataGravacao: dataGravacao||undefined }),
      });
      if (!res.ok) throw new Error('Erro ao criar');
      const { content } = await res.json();
      onCreate(content);
      onClose();
    } catch {
      setError('Não foi possível criar o conteúdo. Tente novamente.');
      setSaving(false);
    }
  };

  const memberColors = {
    'Matheus': { bg:'rgba(124,58,237,0.2)', text:'#a78bfa', border:'rgba(124,58,237,0.4)' },
    'Sávio':   { bg:'rgba(16,185,129,0.2)',  text:'#6ee7b7', border:'rgba(16,185,129,0.4)' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{
          background:'rgba(9,16,30,0.98)',
          backdropFilter:'blur(32px)',
          border:'1px solid rgba(255,255,255,0.1)',
          boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
          maxHeight:'90vh',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{borderColor:'rgba(255,255,255,0.07)'}}>
          <div>
            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-0.5">Novo conteúdo</p>
            <p className="text-base font-bold text-white font-display">Adicionar à esteira</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
              text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-150 cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Nome do conteúdo <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ex: Vídeo de lançamento novembro"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder-white/20
                outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-500/40"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Projeto / Cliente
            </label>
            <div className="flex gap-2">
              {CLIENTS.map(c => {
                const cc = CLIENT_COLORS[c] || {};
                const active = cliente === c;
                return (
                  <button key={c} type="button"
                    onClick={() => setCliente(active ? '' : c)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150"
                    style={{
                      background: active ? cc.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? cc.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? cc.text : 'rgba(255,255,255,0.35)',
                    }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formato */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Formato
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map(f => {
                const active = formato === f;
                return (
                  <button key={f} type="button"
                    onClick={() => setFormato(active ? '' : f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      background: active ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#38bdf8' : 'rgba(255,255,255,0.35)',
                    }}>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Responsável
            </label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const c = memberColors[m] || {};
                const active = responsavel === m;
                return (
                  <button key={m} type="button"
                    onClick={() => setResponsavel(active ? '' : m)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      background: active ? c.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? c.text : 'rgba(255,255,255,0.35)',
                    }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                Data de gravação
              </label>
              <input
                type="date"
                value={dataGravacao}
                onChange={e => setDataGravacao(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/80
                  outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-500/30"
                style={{
                  background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  colorScheme:'dark',
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                Data de postagem
              </label>
              <input
                type="date"
                value={postagem}
                onChange={e => setPostagem(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/80
                  outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-500/30"
                style={{
                  background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  colorScheme:'dark',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium px-3 py-2 rounded-xl"
              style={{background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)'}}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3"
          style={{borderColor:'rgba(255,255,255,0.07)'}}>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150
              text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
            style={{border:'1px solid rgba(255,255,255,0.08)'}}>
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSave || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              text-sm font-bold text-white cursor-pointer transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{background:'linear-gradient(135deg, #7c3aed, #5b21b6)'}}>
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : <Plus className="w-4 h-4"/>
            }
            {saving ? 'Criando…' : 'Criar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Panel (slide-in) ─────────────────────────────────────────────────────
function EditPanel({ item, onSave, onDelete, onClose }) {
  const [nome,          setNome]          = useState(item.nome);
  const [responsavel,   setResponsavel]   = useState(item.responsavel || '');
  const [estadoRoteiro, setEstadoRoteiro] = useState(item.estadoRoteiro || '');
  const [roteiro,       setRoteiro]       = useState(item.roteiro || '');
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const dirty = nome !== item.nome ||
    responsavel   !== (item.responsavel   || '') ||
    estadoRoteiro !== (item.estadoRoteiro || '') ||
    roteiro       !== (item.roteiro       || '');

  const save = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    await onSave(item.id, { nome, responsavel, estadoRoteiro, roteiro });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(item.id);
    onClose();
  };

  const rsCur = ROTEIRO_STATES.find(s => nrm(s.value) === nrm(estadoRoteiro)) || ROTEIRO_STATES[0];
  const cl    = clientColor(item.cliente);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>

      {/* Panel */}
      <div className="relative w-full max-w-md flex flex-col h-full animate-slide-in-right"
        style={{
          background:'rgba(9,16,30,0.98)',
          backdropFilter:'blur(32px)',
          borderLeft:'1px solid rgba(255,255,255,0.1)',
          boxShadow:'-24px 0 60px rgba(0,0,0,0.5)',
        }}>

        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{borderColor:'rgba(255,255,255,0.07)'}}>
          <div>
            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-0.5">Editar conteúdo</p>
            <div className="flex items-center gap-2">
              {item.cliente && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{background:cl.bg, color:cl.text, border:`1px solid ${cl.border}`}}>
                  {item.cliente}
                </span>
              )}
              {item.formato && (
                <span className="text-[10px] text-white/30">{item.formato}</span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
              text-white/40 hover:text-white hover:bg-white/[0.06]
              transition-all duration-150 cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Nome do conteúdo
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white
                outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-500/40"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Responsável
            </label>
            <div className="flex gap-2">
              {MEMBERS.map(m => {
                const colors = {
                  'Matheus': { bg:'rgba(124,58,237,0.2)', text:'#a78bfa', border:'rgba(124,58,237,0.4)' },
                  'Sávio':   { bg:'rgba(16,185,129,0.2)', text:'#6ee7b7', border:'rgba(16,185,129,0.4)' },
                };
                const c = colors[m] || {};
                const active = nrm(responsavel) === nrm(m);
                return (
                  <button key={m} type="button"
                    onClick={() => setResponsavel(active ? '' : m)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      background: active ? c.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.08)'}`,
                      color: active ? c.text : 'rgba(255,255,255,0.35)',
                    }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado do Roteiro */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Estado do Roteiro
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROTEIRO_STATES.map(s => {
                const active = nrm(estadoRoteiro) === nrm(s.value);
                return (
                  <button key={s.value} type="button"
                    onClick={() => setEstadoRoteiro(s.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold
                      cursor-pointer transition-all duration-150 text-left"
                    style={{
                      background: active ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? `${s.color}50` : 'rgba(255,255,255,0.08)'}`,
                      color: active ? s.color : 'rgba(255,255,255,0.35)',
                    }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: active ? s.color : 'rgba(255,255,255,0.15)'}}/>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roteiro / Script */}
          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Edit3 className="w-3 h-3"/> Roteiro
            </label>
            <textarea
              value={roteiro}
              onChange={e => setRoteiro(e.target.value)}
              rows={10}
              placeholder="Escreva o roteiro do conteúdo aqui..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/20
                font-medium resize-none outline-none transition-all duration-150
                focus:ring-2 focus:ring-violet-500/40 leading-relaxed"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}
            />
            <p className="text-[10px] text-white/20 mt-1.5 text-right">
              {roteiro.length} caracteres
            </p>
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3">
            {item.dataGravacao && (
              <div className="px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.03)'}}>
                <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-0.5">Gravação</p>
                <p className="text-xs text-white/60 font-medium">{fmtFull(item.dataGravacao)}</p>
              </div>
            )}
            {item.postagem && (
              <div className="px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.03)'}}>
                <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-0.5">Postagem</p>
                <p className="text-xs text-white/60 font-medium">{fmtFull(item.postagem)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Save footer */}
        <div className="px-5 py-4 border-t space-y-2" style={{borderColor:'rgba(255,255,255,0.07)'}}>
          <button
            onClick={save}
            disabled={!dirty || saving || !nome.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              text-sm font-bold text-white cursor-pointer
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
              hover:brightness-110 active:scale-[0.98]"
            style={{background: saved ? 'rgba(16,185,129,0.8)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)'}}>
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : saved
                ? <CheckCircle2 className="w-4 h-4"/>
                : <Save className="w-4 h-4"/>
            }
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar alterações'}
          </button>
          {!dirty && (
            <p className="text-center text-[10px] text-white/20">Nenhuma alteração pendente</p>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-xs font-bold cursor-pointer transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            style={{
              background: confirmDelete ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${confirmDelete ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: confirmDelete ? '#fb7185' : 'rgba(255,255,255,0.25)',
            }}>
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
              : <Trash2 className="w-3.5 h-3.5"/>
            }
            {deleting ? 'Removendo…' : confirmDelete ? 'Confirmar exclusão' : 'Remover conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, items, onUpdate, onEdit, loading }) {
  return (
    <div className="flex flex-col min-w-[260px] lg:min-w-0 lg:flex-1" style={{maxWidth:'320px'}}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{background:col.color}}/>
          <div>
            <p className="text-xs font-bold text-white/80">{col.label}</p>
            <p className="text-[10px] text-white/30">{col.sublabel}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{background: items.length>0 ? `${col.color}18`:'rgba(255,255,255,0.05)', color: items.length>0 ? col.color:'rgba(255,255,255,0.2)'}}>
          {loading ? '—' : items.length}
        </span>
      </div>
      <div className="flex-1 rounded-xl p-2 space-y-2 min-h-[120px]"
        style={{background:col.glow, border:`1px solid ${col.color}15`}}>
        {loading
          ? [...Array(2)].map((_,i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{background:'rgba(255,255,255,0.05)'}}/>)
          : items.length > 0
            ? items.map(item => <ContentCard key={item.id} item={item} onUpdate={onUpdate} onEdit={onEdit}/>)
            : <div className="flex items-center justify-center py-8"><p className="text-[11px] text-white/15 font-medium">Nenhum item</p></div>
        }
      </div>
    </div>
  );
}

// ── Weekly board ──────────────────────────────────────────────────────────────
function WeeklyBoard({ items, onUpdate, onEdit, loading, year, month, onPrevMonth, onNextMonth }) {
  const { weeks, noDate } = groupByWeek(items);

  // Filter to show only weeks touching the current month
  const monthWeeks = weeks.filter(({ monday }) => {
    const sun = new Date(monday); sun.setDate(monday.getDate()+6);
    return monday.getMonth() === month || sun.getMonth() === month ||
           monday.getFullYear() === year;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Month nav */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <button onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer
            text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-150">
          <ChevronLeft className="w-4 h-4"/>
        </button>
        <span className="text-sm font-bold text-white font-display">
          {MONTHS_PT[month]} {year}
        </span>
        <button onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer
            text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-150">
          <ChevronRight className="w-4 h-4"/>
        </button>
        <span className="ml-2 text-[11px] text-white/30">{items.length} conteúdos</span>
      </div>

      {/* Week columns */}
      {loading ? (
        <div className="flex gap-4">
          {[...Array(3)].map((_,i) => (
            <div key={i} className="min-w-[260px] flex-1 h-48 rounded-2xl animate-pulse"
              style={{background:'rgba(255,255,255,0.04)'}}/>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{minWidth:`${(monthWeeks.length + (noDate.length?1:0)) * 280}px`}}>
          {monthWeeks.length === 0 && noDate.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <CalendarDays className="w-10 h-10 text-white/10 mb-3"/>
              <p className="text-sm text-white/30">Nenhum conteúdo em {MONTHS_PT[month]}</p>
            </div>
          )}

          {monthWeeks.map(({ monday, items: weekItems }) => {
            const sun = new Date(monday); sun.setDate(monday.getDate()+6);
            const label = weekLabel(monday);
            const isCurrentWeek = (() => {
              const now = new Date(); now.setHours(0,0,0,0);
              return now >= monday && now <= sun;
            })();

            return (
              <div key={monday.toISOString()} className="flex flex-col min-w-[260px] max-w-[300px] flex-1">
                {/* Week header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    {isCurrentWeek && (
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
                    )}
                    <p className={`text-xs font-bold ${isCurrentWeek ? 'text-violet-300' : 'text-white/60'}`}>
                      {label}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: isCurrentWeek ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                      color: isCurrentWeek ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                    }}>
                    {weekItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 rounded-xl p-2 space-y-2 min-h-[100px]"
                  style={{
                    background: isCurrentWeek ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.03)',
                    border: isCurrentWeek ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {weekItems
                    .sort((a,b) => (a.postagem||a.dataGravacao||'') > (b.postagem||b.dataGravacao||'') ? 1 : -1)
                    .map(item => (
                      <ContentCard key={item.id} item={item} onUpdate={onUpdate} onEdit={onEdit}/>
                    ))
                  }
                </div>
              </div>
            );
          })}

          {/* No date column */}
          {noDate.length > 0 && (
            <div className="flex flex-col min-w-[260px] max-w-[280px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-bold text-white/35">Sem data</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/25">
                  {noDate.length}
                </span>
              </div>
              <div className="flex-1 rounded-xl p-2 space-y-2 min-h-[100px]"
                style={{background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.07)'}}>
                {noDate.map(item => (
                  <ContentCard key={item.id} item={item} onUpdate={onUpdate} onEdit={onEdit}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Conteudo() {
  const today = new Date();
  const [content,       setContent]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState('semanas'); // 'kanban' | 'semanas'
  const [memberView,    setMemberView]    = useState('geral');   // 'geral' | 'minhas'
  const [filterCliente, setFilterCliente] = useState('');
  const [editItem,      setEditItem]      = useState(null);
  const [showNew,       setShowNew]       = useState(false);
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch('/api/crm/content')
      .then(r => r.json())
      .then(d => { setContent(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Create a new content item
  const createItem = useCallback((newContent) => {
    setContent(prev => [newContent, ...prev]);
  }, []);

  // Delete (archive) a content item
  const deleteItem = useCallback(async (id) => {
    await fetch('/api/crm/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setContent(prev => prev.filter(c => c.id !== id));
  }, []);

  // Update any field(s) on a content item
  const updateItem = useCallback(async (id, fields) => {
    const res = await fetch('/api/crm/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    if (res.ok) {
      const { content: updated } = await res.json();
      setContent(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      // Also refresh editItem if open
      if (editItem?.id === id) setEditItem(prev => prev ? { ...prev, ...updated } : null);
    }
  }, [editItem]);

  // ── Filter pipeline ──
  const filtered = content.filter(item => {
    if (memberView === 'minhas') {
      const r = nrm(item.responsavel);
      if (!r.includes('savio')) return false;
    }
    if (filterCliente) {
      if (nrm(item.cliente).replace(/\s/g,'') !== nrm(filterCliente).replace(/\s/g,'')) return false;
    }
    return true;
  });

  // Kanban distribution
  const columnItems = {};
  COLUMNS.forEach(col => { columnItems[col.id] = []; });
  filtered.forEach(item => { columnItems[classifyItem(item)].push(item); });

  // Weekly filter: only items in calYear/calMonth window (postagem or gravacao)
  const weeklyItems = filtered.filter(item => {
    const d = item.postagem || item.dataGravacao;
    if (!d) return true; // no-date items always show
    const itemDate = new Date(d);
    // Show items within ±1 month to include cross-week items
    return Math.abs((itemDate.getFullYear() - calYear) * 12 + (itemDate.getMonth() - calMonth)) <= 1;
  });

  const urgentes = columnItems['aguardando-cliente']?.length ?? 0;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); }
    else setCalMonth(m => m-1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); }
    else setCalMonth(m => m+1);
  };

  return (
    <CRMLayout title="Conteúdo — T3 Studio CRM">
      <div className="flex flex-col" style={{minHeight:'calc(100vh - 56px)'}}>

        {/* ── Top bar ── */}
        <div className="px-5 lg:px-8 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400"/>
                Esteira de Conteúdo
              </h1>
              <p className="text-xs text-white/35 mt-0.5">
                {loading ? '…' : `${content.length} conteúdos`}
                {urgentes > 0 && (
                  <span className="ml-2 text-amber-400 font-semibold">· {urgentes} aguardando cliente</span>
                )}
              </p>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 shrink-0">
              {/* New content button */}
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                  text-white cursor-pointer transition-all duration-150
                  hover:brightness-110 active:scale-[0.97]"
                style={{background:'linear-gradient(135deg, #7c3aed, #0e7490)', border:'1px solid rgba(124,58,237,0.4)'}}>
                <Plus className="w-3.5 h-3.5"/>
                <span className="hidden sm:inline">Novo</span>
              </button>
              {/* Member toggle */}
              <div className="flex items-center rounded-xl p-1"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                {[
                  { key:'geral',  label:'Geral',   icon: LayoutGrid },
                  { key:'minhas', label:'Minhas',   icon: User2      },
                ].map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setMemberView(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      background: memberView===key ? 'rgba(124,58,237,0.25)' : 'transparent',
                      color:      memberView===key ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                      border:     memberView===key ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
                    }}>
                    <Icon className="w-3 h-3"/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-xl p-1"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                {[
                  { key:'semanas', label:'Semanas', icon: CalendarDays },
                  { key:'kanban',  label:'Kanban',  icon: LayoutGrid   },
                ].map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setView(key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      background: view===key ? 'rgba(14,165,233,0.2)' : 'transparent',
                      color:      view===key ? '#38bdf8' : 'rgba(255,255,255,0.35)',
                      border:     view===key ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                    }}>
                    <Icon className="w-3 h-3"/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Client filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Projeto:</span>
            <button onClick={() => setFilterCliente('')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
              style={{
                background: !filterCliente ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${!filterCliente ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                color: !filterCliente ? 'white' : 'rgba(255,255,255,0.3)',
              }}>
              Todos
            </button>
            {CLIENTS.map(c => {
              const cc = CLIENT_COLORS[c] || { text:'#fff', bg:'rgba(255,255,255,0.1)', border:'rgba(255,255,255,0.2)' };
              const active = nrm(filterCliente).replace(/\s/g,'') === nrm(c).replace(/\s/g,'');
              return (
                <button key={c} onClick={() => setFilterCliente(active ? '' : c)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150"
                  style={{
                    background: active ? cc.bg : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? cc.border : 'rgba(255,255,255,0.07)'}`,
                    color: active ? cc.text : 'rgba(255,255,255,0.3)',
                  }}>
                  {c}
                </button>
              );
            })}

            {(memberView==='minhas' || filterCliente) && (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 font-semibold px-2 py-1 rounded-full"
                style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.2)'}}>
                {[memberView==='minhas'&&'Sávio', filterCliente].filter(Boolean).join(' · ')}
                <button onClick={() => { setMemberView('geral'); setFilterCliente(''); }}
                  className="ml-0.5 cursor-pointer hover:text-white transition-colors">
                  <X className="w-3 h-3"/>
                </button>
              </span>
            )}
          </div>
        </div>

        {/* ── Board area ── */}
        <div className="flex-1 overflow-x-auto px-5 lg:px-8 pb-8">
          {view === 'kanban' ? (
            <div className="flex gap-4 pb-4" style={{minWidth:`${COLUMNS.length * 280}px`}}>
              {COLUMNS.map(col => (
                <KanbanColumn key={col.id} col={col}
                  items={columnItems[col.id] || []}
                  onUpdate={(id, fields) => updateItem(id, fields)}
                  onEdit={setEditItem}
                  loading={loading}
                />
              ))}
            </div>
          ) : (
            <WeeklyBoard
              items={weeklyItems}
              onUpdate={(id, fields) => updateItem(id, fields)}
              onEdit={setEditItem}
              loading={loading}
              year={calYear}
              month={calMonth}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />
          )}
        </div>
      </div>

      {/* ── Edit Panel ── */}
      {editItem && (
        <EditPanel
          item={editItem}
          onSave={async (id, fields) => { await updateItem(id, fields); }}
          onDelete={deleteItem}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* ── New Content Modal ── */}
      {showNew && (
        <NewContentModal
          onClose={() => setShowNew(false)}
          onCreate={createItem}
        />
      )}
    </CRMLayout>
  );
}
