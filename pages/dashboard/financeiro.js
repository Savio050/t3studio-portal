import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import CRMLayout from '../../components/crm/Layout';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  Plus, X, Trash2, Edit2, Loader2, Filter,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Calendar, Tag, User, FileText, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtShort = (v) => {
  const n = Math.abs(v || 0);
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `R$${(n / 1_000).toFixed(1)}k`;
  return fmt(v);
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const TIPOS = ['Receita','Despesa'];
const STATUS_OPTS = ['Confirmado','Pendente','Cancelado'];
const CATEGORIAS_RECEITA = ['Projeto','Mensalidade','Consultoria','Bônus','Outros'];
const CATEGORIAS_DESPESA = ['Salários','Ferramentas','Marketing','Infraestrutura','Impostos','Freelancer','Outros'];

const FREQ_OPTS = [
  { label: 'Semanal',    value: 'semanal',    days: 7   },
  { label: 'Quinzenal',  value: 'quinzenal',  days: 14  },
  { label: 'Mensal',     value: 'mensal',     months: 1 },
  { label: 'Bimestral',  value: 'bimestral',  months: 2 },
  { label: 'Trimestral', value: 'trimestral', months: 3 },
  { label: 'Semestral',  value: 'semestral',  months: 6 },
  { label: 'Anual',      value: 'anual',      months: 12},
];

function offsetDate(dateStr, freq, times) {
  const d = new Date(dateStr + 'T12:00:00');
  const f = FREQ_OPTS.find(o => o.value === freq);
  if (!f) return dateStr;
  for (let i = 0; i < times; i++) {
    if (f.days)   d.setDate(d.getDate() + f.days);
    else          d.setMonth(d.getMonth() + f.months);
  }
  return d.toISOString().slice(0, 10);
}

const STATUS_META = {
  Confirmado: { icon: CheckCircle2, color: 'text-ok',   bg: 'bg-ok/10',   label: 'Confirmado' },
  Pendente:   { icon: Clock,        color: 'text-warn',  bg: 'bg-warn/10',  label: 'Pendente'   },
  Cancelado:  { icon: AlertCircle,  color: 'text-error', bg: 'bg-error/10', label: 'Cancelado'  },
};

const CATEGORIA_COLORS = [
  '#0071e3','#30d158','#ff9f0a','#bf5af2','#ff375f','#64d2ff','#ffd60a',
];

function getMonthKey(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // "YYYY-MM"
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const W = 520, H = 180, pad = { t: 16, b: 36, l: 52, r: 16 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const barW = Math.floor(iW / (data.length * 2 + 1));
  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesa]), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + iH * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y}
              stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end"
              className="fill-[#8e8e93]" style={{ fontSize: 9 }}>
              {fmtShort(maxVal * t)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const slot = iW / data.length;
        const cx = pad.l + i * slot + slot / 2;
        const rH = (d.receita / maxVal) * iH;
        const dH = (d.despesa / maxVal) * iH;
        const rX = cx - barW - 1;
        const dX = cx + 1;
        return (
          <g key={d.month}>
            {/* Receita bar */}
            <rect x={rX} y={pad.t + iH - rH} width={barW} height={rH}
              rx="3" fill="#30d158" opacity="0.85" />
            {/* Despesa bar */}
            <rect x={dX} y={pad.t + iH - dH} width={barW} height={dH}
              rx="3" fill="#ff375f" opacity="0.85" />
            {/* Month label */}
            <text x={cx} y={H - 4} textAnchor="middle"
              className="fill-[#8e8e93]" style={{ fontSize: 9 }}>
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ slices }) {
  const R = 54, r = 34, cx = 70, cy = 70;
  let angle = -Math.PI / 2;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

  const paths = slices.map((sl, i) => {
    const theta = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += theta;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const xi1 = cx + r * Math.cos(angle - theta);
    const yi1 = cy + r * Math.sin(angle - theta);
    const xi2 = cx + r * Math.cos(angle);
    const yi2 = cy + r * Math.sin(angle);
    const large = theta > Math.PI ? 1 : 0;
    return (
      <path key={sl.label}
        d={`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`}
        fill={CATEGORIA_COLORS[i % CATEGORIA_COLORS.length]}
        opacity="0.9"
      />
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-[120px] h-[120px] shrink-0 select-none">
        {paths}
        <circle cx={cx} cy={cy} r={r - 2} fill="white" />
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {slices.map((sl, i) => (
          <div key={sl.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: CATEGORIA_COLORS[i % CATEGORIA_COLORS.length] }} />
            <span className="text-[11px] text-ink-soft truncate">{sl.label}</span>
            <span className="text-[11px] font-semibold text-ink ml-auto pl-2 shrink-0">
              {Math.round((sl.value / slices.reduce((a, b) => a + b.value, 0)) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Area/Line Chart ───────────────────────────────────────────────────────
function AreaChart({ data }) {
  const W = 520, H = 110, pad = { t: 12, b: 28, l: 52, r: 12 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  if (!data.length) return null;

  const vals = data.map(d => d.saldo);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals, 1);
  const range = maxV - minV || 1;

  const pts = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * iW;
    const y = pad.t + iH - ((d.saldo - minV) / range) * iH;
    return [x, y];
  });

  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = [
    `M${pts[0][0]},${pad.t + iH}`,
    ...pts.map(p => `L${p[0]},${p[1]}`),
    `L${pts[pts.length - 1][0]},${pad.t + iH}`,
    'Z',
  ].join(' ');

  const zero = pts[0] ? pad.t + iH - ((0 - minV) / range) * iH : pad.t + iH;
  const isPos = minV >= 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPos ? '#30d158' : '#0071e3'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={isPos ? '#30d158' : '#0071e3'} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Zero line */}
      {!isPos && (
        <line x1={pad.l} x2={W - pad.r} y1={zero} y2={zero}
          stroke="rgba(0,0,0,0.12)" strokeWidth="1" strokeDasharray="4 3" />
      )}
      {/* Grid */}
      {[0, 0.5, 1].map(t => {
        const y = pad.t + iH * (1 - t);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y}
              stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <text x={pad.l - 5} y={y + 4} textAnchor="end"
              className="fill-[#8e8e93]" style={{ fontSize: 9 }}>
              {fmtShort(minV + range * t)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <polyline points={polyline} fill="none"
        stroke={isPos ? '#30d158' : '#0071e3'} strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3"
          fill={isPos ? '#30d158' : '#0071e3'} stroke="white" strokeWidth="1.5" />
      ))}
      {/* Month labels */}
      {data.map((d, i) => {
        const x = pad.l + (i / Math.max(data.length - 1, 1)) * iW;
        return (
          <text key={d.month} x={x} y={H - 4} textAnchor="middle"
            className="fill-[#8e8e93]" style={{ fontSize: 9 }}>
            {d.month}
          </text>
        );
      })}
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, tone, delta }) {
  const tones = {
    green:  { card: 'bg-surface', icon: 'text-[#30d158] bg-[#30d158]/10' },
    red:    { card: 'bg-surface', icon: 'text-[#ff375f] bg-[#ff375f]/10' },
    blue:   { card: 'bg-surface', icon: 'text-[#0071e3] bg-[#0071e3]/10' },
    purple: { card: 'bg-surface', icon: 'text-[#bf5af2] bg-[#bf5af2]/10' },
  };
  const t = tones[tone] || tones.blue;
  const isPos = delta >= 0;

  return (
    <div className={`${t.card} rounded-2xl p-4 border border-[rgba(0,0,0,0.06)] flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${t.icon} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold
            ${isPos ? 'text-[#30d158]' : 'text-[#ff375f]'}`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[22px] font-bold text-ink tracking-apple-tight leading-none">{value}</p>
        <p className="text-[12px] text-ink-soft font-medium mt-1">{label}</p>
        {sub && <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TxRow({ tx, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [del, setDel] = useState(false);
  const sm = STATUS_META[tx.status] || STATUS_META.Confirmado;
  const StatusIcon = sm.icon;
  const isReceita = tx.tipo === 'Receita';

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 3000); return; }
    setDel(true);
    await onDelete(tx.id);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/60 transition-colors group rounded-xl">
      {/* Type indicator */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isReceita ? 'bg-[#30d158]/10' : 'bg-[#ff375f]/10'}`}>
        {isReceita
          ? <ArrowUpRight className="w-4 h-4 text-[#30d158]" />
          : <ArrowDownRight className="w-4 h-4 text-[#ff375f]" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-ink truncate">{tx.nome}</p>
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sm.bg} ${sm.color}`}>
            {sm.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {tx.categoria && (
            <span className="text-[10px] text-ink-faint">{tx.categoria}</span>
          )}
          {tx.cliente && (
            <span className="text-[10px] text-ink-faint">· {tx.cliente}</span>
          )}
          {tx.responsavel && (
            <span className="text-[10px] text-ink-faint">· {tx.responsavel}</span>
          )}
          {tx.data && (
            <span className="text-[10px] text-ink-faint">
              · {new Date(tx.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <p className={`text-[14px] font-bold ${isReceita ? 'text-[#30d158]' : 'text-[#ff375f]'}`}>
          {isReceita ? '+' : '-'}{fmt(tx.valor)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <button onClick={() => onEdit(tx)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-faint
            hover:text-accent hover:bg-accent/10 transition-all duration-150 cursor-pointer">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDelete} disabled={del}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer
            ${confirm ? 'text-white bg-[#ff375f]' : 'text-ink-faint hover:text-[#ff375f] hover:bg-[#ff375f]/10'}`}>
          {del ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Transaction Modal ─────────────────────────────────────────────────────────
function TxModal({ tx, clients, team, onSave, onClose }) {
  const isEdit = !!tx?.id;
  const [saving,      setSaving]      = useState(false);
  const [progress,    setProgress]    = useState(null); // { done, total } during bulk create
  const [err,         setErr]         = useState('');
  const [recorrente,  setRecorrente]  = useState(false);
  const [recFreq,     setRecFreq]     = useState('mensal');
  const [recReps,     setRecReps]     = useState(3);
  const [form, setForm] = useState({
    nome:        tx?.nome        || '',
    tipo:        tx?.tipo        || 'Receita',
    categoria:   tx?.categoria   || '',
    valor:       tx?.valor       ? String(tx.valor) : '',
    data:        tx?.data        || new Date().toISOString().slice(0, 10),
    cliente:     tx?.cliente     || '',
    responsavel: tx?.responsavel || '',
    status:      tx?.status      || 'Confirmado',
    notas:       tx?.notas       || '',
  });

  const categorias = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Preview of recurring dates
  const recDates = useMemo(() => {
    if (!recorrente || !form.data) return [];
    const dates = [form.data];
    for (let i = 1; i < recReps; i++) {
      dates.push(offsetDate(dates[dates.length - 1], recFreq, 1));
    }
    return dates;
  }, [recorrente, form.data, recFreq, recReps]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErr('Descrição é obrigatória.'); return; }
    if (!form.valor || isNaN(Number(form.valor))) { setErr('Valor inválido.'); return; }
    setSaving(true); setErr('');

    try {
      const base = { ...form, valor: Number(form.valor) };

      // ── Edit: single PATCH ──────────────────────────────────────────────────
      if (isEdit) {
        const res = await fetch('/api/crm/finance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, id: tx.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
        onSave([data.transaction], true);
        return;
      }

      // ── Create: single or recurring ─────────────────────────────────────────
      const entries = recorrente
        ? recDates.map((date, i) => ({
            ...base,
            nome: recReps > 1 ? `${base.nome} (${i + 1}/${recReps})` : base.nome,
            data: date,
            notas: base.notas
              ? `${base.notas} · Recorrência ${i + 1}/${recReps}`
              : `Recorrência ${i + 1}/${recReps}`,
          }))
        : [base];

      const created = [];
      setProgress({ done: 0, total: entries.length });

      for (let i = 0; i < entries.length; i++) {
        const res = await fetch('/api/crm/finance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entries[i]),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro na entrada ${i + 1}.`);
        created.push(data.transaction);
        setProgress({ done: i + 1, total: entries.length });
      }

      onSave(created, false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const inputCls = `w-full px-3 py-2 text-[13px] bg-elevated border border-[rgba(0,0,0,0.12)]
    rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-accent
    focus:ring-2 focus:ring-accent/20 transition-all duration-150`;
  const labelCls = 'block text-[11px] font-semibold text-ink-soft mb-1';

  const submitLabel = isEdit
    ? 'Salvar alterações'
    : recorrente
      ? `Criar ${recReps} transações`
      : 'Adicionar';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-[17px] font-semibold text-ink">
            {isEdit ? 'Editar transação' : 'Nova transação'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint
              hover:text-ink hover:bg-elevated transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo toggle */}
          <div>
            <p className={labelCls}>Tipo</p>
            <div className="flex gap-2">
              {TIPOS.map(t => (
                <button key={t} type="button"
                  onClick={() => { set('tipo', t); set('categoria', ''); }}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer
                    ${form.tipo === t
                      ? t === 'Receita' ? 'bg-[#30d158] text-white' : 'bg-[#ff375f] text-white'
                      : 'bg-elevated text-ink-soft hover:bg-[rgba(0,0,0,0.06)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className={labelCls}>Descrição *</label>
            <input className={inputCls} placeholder="Ex: Mensalidade gestão de redes"
              value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (R$) *</label>
              <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                value={form.valor} onChange={e => set('valor', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Data inicial</label>
              <input className={inputCls} type="date"
                value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
          </div>

          {/* Categoria + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoria</label>
              <select className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="">Selecionar...</option>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Cliente + Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cliente</label>
              <select className={inputCls} value={form.cliente} onChange={e => set('cliente', e.target.value)}>
                <option value="">—</option>
                {clients.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsável</label>
              <select className={inputCls} value={form.responsavel} onChange={e => set('responsavel', e.target.value)}>
                <option value="">—</option>
                {team.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Observações opcionais..."
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          {/* ── Recorrência (only on new transactions) ─────────────────── */}
          {!isEdit && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
              {/* Toggle header */}
              <button type="button"
                onClick={() => setRecorrente(r => !r)}
                className="w-full flex items-center justify-between px-4 py-3
                  bg-elevated hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                    ${recorrente ? 'border-accent bg-accent' : 'border-[rgba(0,0,0,0.2)] bg-transparent'}`}>
                    {recorrente && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[13px] font-semibold text-ink">Transação recorrente</span>
                </div>
                <span className="text-[11px] text-ink-faint">
                  {recorrente ? 'Ativado' : 'Desativado'}
                </span>
              </button>

              {/* Recurrence options */}
              {recorrente && (
                <div className="px-4 pb-4 pt-3 space-y-3 bg-elevated">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Frequência</label>
                      <select className={inputCls} value={recFreq} onChange={e => setRecFreq(e.target.value)}>
                        {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Repetições</label>
                      <input className={inputCls} type="number" min="2" max="60"
                        value={recReps} onChange={e => setRecReps(Math.max(2, Math.min(60, Number(e.target.value))))} />
                    </div>
                  </div>

                  {/* Preview dates */}
                  {recDates.length > 0 && (
                    <div>
                      <p className={labelCls}>Datas geradas ({recDates.length})</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {recDates.slice(0, 12).map((d, i) => (
                          <span key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-accent/10 text-accent">
                            {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        ))}
                        {recDates.length > 12 && (
                          <span className="text-[10px] text-ink-faint px-1 py-0.5">
                            +{recDates.length - 12} mais
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-faint mt-1.5">
                        Total: {fmt(Number(form.valor || 0) * recReps)} em {recReps} parcelas de {fmt(Number(form.valor || 0))}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {err && <p className="text-[12px] text-[#ff375f] font-medium">{err}</p>}

          {/* Progress bar during bulk create */}
          {progress && (
            <div>
              <div className="flex justify-between text-[10px] text-ink-faint mb-1">
                <span>Criando transações...</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-elevated overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold
                bg-elevated text-ink-soft hover:bg-[rgba(0,0,0,0.06)] transition-all cursor-pointer
                disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white
                bg-accent hover:bg-accent/90 transition-all cursor-pointer flex items-center justify-center gap-2
                disabled:opacity-60">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [txs,      setTxs]      = useState([]);
  const [clients,  setClients]  = useState([]);
  const [team,     setTeam]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState('');
  const [modal,    setModal]    = useState(null); // null | 'new' | tx object
  const [filter,   setFilter]   = useState({ tipo: 'Todos', periodo: 'all', search: '' });
  const [sortDesc, setSortDesc] = useState(true);

  // ── Guard: admin only ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'administrador') {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  // Load data — only after session confirmed as admin
  useEffect(() => {
    if (status === 'loading' || session?.user?.role !== 'administrador') return;
    Promise.all([
      fetch('/api/crm/finance').then(r => r.json()),
      fetch('/api/crm/clients').then(r => r.json()).catch(() => ({})),
      fetch('/api/crm/equipe').then(r => r.json()).catch(() => ({})),
    ]).then(([fin, cli, eq]) => {
      setTxs(fin.transactions || []);
      setClients(cli.clients || []);
      setTeam(eq.members || []);
      setLoading(false);
    }).catch(e => {
      setErr(e.message);
      setLoading(false);
    });
  }, [session, status]);

  // Filter + sort
  const now = new Date();
  const filtered = useMemo(() => {
    let list = [...txs];
    if (filter.tipo !== 'Todos') list = list.filter(t => t.tipo === filter.tipo);
    if (filter.periodo !== 'all') {
      const cutoff = new Date();
      if (filter.periodo === '30d') cutoff.setDate(cutoff.getDate() - 30);
      if (filter.periodo === '90d') cutoff.setDate(cutoff.getDate() - 90);
      if (filter.periodo === 'year') cutoff.setMonth(0, 1);
      list = list.filter(t => t.data && new Date(t.data) >= cutoff);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(t =>
        t.nome.toLowerCase().includes(q) ||
        t.cliente?.toLowerCase().includes(q) ||
        t.categoria?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const da = a.data || '';
      const db = b.data || '';
      return sortDesc ? db.localeCompare(da) : da.localeCompare(db);
    });
    return list;
  }, [txs, filter, sortDesc]);

  // KPIs — confirmed only
  const confirmed = txs.filter(t => t.status !== 'Cancelado');
  const receita   = confirmed.filter(t => t.tipo === 'Receita').reduce((s, t) => s + t.valor, 0);
  const despesa   = confirmed.filter(t => t.tipo === 'Despesa').reduce((s, t) => s + t.valor, 0);
  const lucro     = receita - despesa;
  const margem    = receita > 0 ? (lucro / receita) * 100 : 0;

  // Bar chart data — last 6 months
  const barData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: MESES[d.getMonth()], key });
    }
    return months.map(({ month, key }) => {
      const mTxs = confirmed.filter(t => getMonthKey(t.data) === key);
      return {
        month,
        receita: mTxs.filter(t => t.tipo === 'Receita').reduce((s, t) => s + t.valor, 0),
        despesa: mTxs.filter(t => t.tipo === 'Despesa').reduce((s, t) => s + t.valor, 0),
      };
    });
  }, [txs]);

  // Area chart — cumulative cash flow
  const areaData = useMemo(() => {
    let acc = 0;
    return barData.map(d => {
      acc += d.receita - d.despesa;
      return { month: d.month, saldo: acc };
    });
  }, [barData]);

  // Donut — expense categories
  const catMap = useMemo(() => {
    const m = {};
    confirmed.filter(t => t.tipo === 'Despesa').forEach(t => {
      const c = t.categoria || 'Outros';
      m[c] = (m[c] || 0) + t.valor;
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [txs]);

  // Top clients by revenue
  const topClients = useMemo(() => {
    const m = {};
    confirmed.filter(t => t.tipo === 'Receita' && t.cliente).forEach(t => {
      m[t.cliente] = (m[t.cliente] || 0) + t.valor;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [txs]);

  const maxClientVal = topClients[0]?.[1] || 1;

  // Handlers
  const handleSave = useCallback((txList, isEdit) => {
    setTxs(prev => {
      if (isEdit && txList.length === 1) {
        return prev.map(t => t.id === txList[0].id ? txList[0] : t);
      }
      return [...txList, ...prev];
    });
    setModal(null);
  }, []);

  const handleDelete = useCallback(async (id) => {
    await fetch('/api/crm/finance', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTxs(prev => prev.filter(t => t.id !== id));
  }, []);

  if (status === 'loading' || (session && session.user?.role !== 'administrador')) {
    return (
      <CRMLayout title="Financeiro · T3 Studio">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#aeaeb2]" />
        </div>
      </CRMLayout>
    );
  }

  const notionConfigured = !err?.includes('NOTION_FINANCE_DB_ID');

  return (
    <CRMLayout title="Financeiro · T3 Studio">
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-ink tracking-apple-tight">Financeiro</h1>
            <p className="text-[14px] text-ink-soft mt-0.5">
              Controle de receitas, despesas e fluxo de caixa da agência
            </p>
          </div>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold
              text-white bg-accent hover:bg-accent/90 transition-all duration-150 cursor-pointer shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Setup notice */}
        {err?.includes('NOTION_FINANCE_DB_ID') && (
          <div className="bg-[#ff9f0a]/10 border border-[#ff9f0a]/30 rounded-2xl p-5">
            <p className="text-[14px] font-semibold text-[#ff9f0a] mb-1">Configuração necessária</p>
            <p className="text-[13px] text-ink-soft">
              Crie um banco de dados no Notion com os campos: <strong>Nome</strong> (título),{' '}
              <strong>Tipo</strong> (select: Receita/Despesa), <strong>Categoria</strong> (select),{' '}
              <strong>Valor</strong> (número), <strong>Data</strong> (data), <strong>Cliente</strong> (texto),{' '}
              <strong>Responsavel</strong> (texto), <strong>Status</strong> (select: Confirmado/Pendente/Cancelado),{' '}
              <strong>Notas</strong> (texto). Depois adicione <code>NOTION_FINANCE_DB_ID</code> no Vercel.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-ink-faint">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-[14px]">Carregando...</span>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard label="Receita total"    value={fmtShort(receita)} icon={TrendingUp}   tone="green"  sub={`${txs.filter(t=>t.tipo==='Receita').length} transações`} />
              <KPICard label="Despesas totais"  value={fmtShort(despesa)} icon={TrendingDown} tone="red"    sub={`${txs.filter(t=>t.tipo==='Despesa').length} transações`} />
              <KPICard label="Lucro líquido"    value={fmtShort(lucro)}   icon={DollarSign}   tone={lucro >= 0 ? 'green' : 'red'} sub="Receita - Despesas" />
              <KPICard label="Margem de lucro"  value={`${margem.toFixed(1)}%`} icon={Percent} tone="purple" sub="Sobre receita total" />
            </div>

            {/* ── Charts row ─────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-4">

              {/* Bar chart */}
              <div className="lg:col-span-2 bg-surface rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">Receita vs Despesas</h2>
                    <p className="text-[11px] text-ink-faint">Últimos 6 meses</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#30d158]" />Receita
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff375f]" />Despesa
                    </span>
                  </div>
                </div>
                <BarChart data={barData} />
              </div>

              {/* Donut */}
              <div className="bg-surface rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
                <h2 className="text-[15px] font-semibold text-ink mb-1">Despesas por categoria</h2>
                <p className="text-[11px] text-ink-faint mb-4">Distribuição atual</p>
                {catMap.length > 0
                  ? <DonutChart slices={catMap} />
                  : <p className="text-[13px] text-ink-faint py-8 text-center">Sem despesas registradas</p>
                }
              </div>
            </div>

            {/* ── Cash flow + Top clients ───────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Area chart */}
              <div className="lg:col-span-2 bg-surface rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
                <h2 className="text-[15px] font-semibold text-ink mb-1">Fluxo de caixa acumulado</h2>
                <p className="text-[11px] text-ink-faint mb-4">Saldo progressivo dos últimos 6 meses</p>
                <AreaChart data={areaData} />
              </div>

              {/* Top clients */}
              <div className="bg-surface rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
                <h2 className="text-[15px] font-semibold text-ink mb-1">Top clientes</h2>
                <p className="text-[11px] text-ink-faint mb-4">Por receita gerada</p>
                {topClients.length > 0 ? (
                  <div className="space-y-3">
                    {topClients.map(([nome, val]) => (
                      <div key={nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-ink truncate max-w-[120px]">{nome}</span>
                          <span className="text-[12px] font-bold text-[#30d158]">{fmtShort(val)}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-elevated overflow-hidden">
                          <div className="h-full rounded-full bg-[#30d158] transition-all duration-500"
                            style={{ width: `${(val / maxClientVal) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-faint py-8 text-center">Associe clientes às transações</p>
                )}
              </div>
            </div>

            {/* ── Transaction list ───────────────────────────────────── */}
            <div className="bg-surface rounded-2xl border border-[rgba(0,0,0,0.06)]">
              {/* List header + filters */}
              <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h2 className="text-[15px] font-semibold text-ink flex-1">Transações</h2>

                  {/* Search */}
                  <input
                    className="px-3 py-1.5 text-[12px] bg-elevated border border-[rgba(0,0,0,0.1)]
                      rounded-xl text-ink placeholder-ink-faint focus:outline-none focus:border-accent
                      focus:ring-2 focus:ring-accent/20 transition-all w-full sm:w-[180px]"
                    placeholder="Buscar..."
                    value={filter.search}
                    onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                  />

                  {/* Tipo filter */}
                  <div className="flex gap-1">
                    {['Todos','Receita','Despesa'].map(t => (
                      <button key={t} onClick={() => setFilter(f => ({ ...f, tipo: t }))}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                          ${filter.tipo === t
                            ? 'bg-accent text-white'
                            : 'bg-elevated text-ink-soft hover:bg-[rgba(0,0,0,0.06)]'}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Period filter */}
                  <select
                    className="px-3 py-1.5 text-[12px] bg-elevated border border-[rgba(0,0,0,0.1)]
                      rounded-xl text-ink focus:outline-none focus:border-accent transition-all cursor-pointer"
                    value={filter.periodo}
                    onChange={e => setFilter(f => ({ ...f, periodo: e.target.value }))}>
                    <option value="all">Todo período</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="year">Este ano</option>
                  </select>

                  {/* Sort */}
                  <button onClick={() => setSortDesc(d => !d)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                      bg-elevated text-ink-soft hover:bg-[rgba(0,0,0,0.06)] transition-all cursor-pointer">
                    {sortDesc ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    Data
                  </button>
                </div>

                {/* Summary row */}
                <div className="flex items-center gap-4 mt-3 text-[11px] text-ink-faint">
                  <span>{filtered.length} transação{filtered.length !== 1 ? 'ões' : ''}</span>
                  <span className="text-[#30d158] font-semibold">
                    +{fmt(filtered.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0))}
                  </span>
                  <span className="text-[#ff375f] font-semibold">
                    -{fmt(filtered.filter(t=>t.tipo==='Despesa').reduce((s,t)=>s+t.valor,0))}
                  </span>
                </div>
              </div>

              {/* List body */}
              <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-ink-faint">
                    <DollarSign className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-[14px] font-medium">Nenhuma transação encontrada</p>
                    <p className="text-[12px] mt-1">Adicione receitas e despesas para começar</p>
                    <button onClick={() => setModal('new')}
                      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold
                        text-white bg-accent hover:bg-accent/90 transition-all cursor-pointer">
                      <Plus className="w-3.5 h-3.5" /> Nova transação
                    </button>
                  </div>
                ) : (
                  filtered.map(tx => (
                    <TxRow key={tx.id} tx={tx}
                      onEdit={t => setModal(t)}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <TxModal
          tx={modal === 'new' ? null : modal}
          clients={clients}
          team={team}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </CRMLayout>
  );
}
