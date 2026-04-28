import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import CRMLayout from '../../components/crm/Layout';
import {
  UserPlus, Shield, User, MoreHorizontal, Trash2,
  ChevronUp, ChevronDown, KeyRound, X, Check, Loader2,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const isAdmin = (role || '').toLowerCase() === 'administrador';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
      ${isAdmin
        ? 'bg-[rgba(0,113,227,0.10)] text-[#0071e3]'
        : 'bg-[rgba(0,0,0,0.05)] text-[#6e6e73]'}`}>
      {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {isAdmin ? 'Admin' : 'Participante'}
    </span>
  );
}

function StatusDot({ ativo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium
      ${ativo ? 'text-[#30d158]' : 'text-[#aeaeb2]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-[#30d158]' : 'bg-[#aeaeb2]'}`} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#0a84ff,#0055d4)',
  'linear-gradient(135deg,#30d158,#248a3d)',
  'linear-gradient(135deg,#ff9f0a,#c93400)',
  'linear-gradient(135deg,#bf5af2,#6e3aad)',
  'linear-gradient(135deg,#ff375f,#c0002a)',
];
function avatarColor(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ user, currentUserId, onToggleRole, onToggleActive, onDelete, onResetPassword }) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);
  const isSelf            = user.id === currentUserId;
  const isAdmin           = user.cargo === 'administrador';

  useEffect(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#aeaeb2]
          hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.05)] transition-all duration-150 cursor-pointer">
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 bg-white rounded-xl shadow-xl border border-[rgba(0,0,0,0.08)]
          py-1 animate-fade-in">

          {/* Promote / Demote */}
          <button
            disabled={isSelf}
            onClick={() => { onToggleRole(user); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#1d1d1f]
              hover:bg-[rgba(0,0,0,0.04)] disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors cursor-pointer">
            {isAdmin
              ? <><ChevronDown className="w-4 h-4 text-[#ff9f0a]" /> Rebaixar para Participante</>
              : <><ChevronUp   className="w-4 h-4 text-[#0071e3]" /> Promover a Administrador</>}
          </button>

          {/* Activate / Deactivate */}
          <button
            disabled={isSelf}
            onClick={() => { onToggleActive(user); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#1d1d1f]
              hover:bg-[rgba(0,0,0,0.04)] disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors cursor-pointer">
            {user.ativo
              ? <><X className="w-4 h-4 text-[#ff3b30]" /> Desativar acesso</>
              : <><Check className="w-4 h-4 text-[#30d158]" /> Reativar acesso</>}
          </button>

          {/* Reset password */}
          <button
            onClick={() => { onResetPassword(user); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#1d1d1f]
              hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer">
            <KeyRound className="w-4 h-4 text-[#6e6e73]" />
            Redefinir senha
          </button>

          <div className="my-1 mx-3 border-t border-[rgba(0,0,0,0.06)]" />

          {/* Delete */}
          <button
            disabled={isSelf}
            onClick={() => { onDelete(user); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#ff3b30]
              hover:bg-[rgba(255,59,48,0.06)] disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
            Remover usuário
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSave }) {
  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [cargo,    setCargo]    = useState('participante');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!nome.trim() || !email.trim() || !password.trim()) {
      setErr('Todos os campos são obrigatórios.'); return;
    }
    setLoading(true);
    const res = await fetch('/api/crm/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome: nome.trim(), email: email.trim(), password, cargo }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || 'Erro ao criar usuário.'); return; }
    onSave(data.user);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Novo usuário</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
              text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.05)]
              transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo"
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]
                transition-all duration-150" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@t3studio.com.br"
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]
                transition-all duration-150" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Senha inicial</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]
                transition-all duration-150" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Cargo</label>
            <div className="flex gap-2">
              {['participante','administrador'].map(r => (
                <button key={r} type="button" onClick={() => setCargo(r)}
                  className={`flex-1 py-2 rounded-[10px] text-[13px] font-medium border
                    transition-all duration-150 cursor-pointer capitalize
                    ${cargo === r
                      ? 'bg-[rgba(0,113,227,0.08)] border-[#0071e3] text-[#0071e3]'
                      : 'border-[rgba(0,0,0,0.10)] text-[#6e6e73] hover:border-[rgba(0,0,0,0.20)]'}`}>
                  {r === 'administrador' ? 'Administrador' : 'Participante'}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <p className="text-[13px] text-[#ff3b30] bg-[#fff1f0] rounded-[8px] px-3 py-2">{err}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] text-[14px] font-medium text-[#6e6e73]
                border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.22)]
                transition-all cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-[10px] text-[14px] font-semibold text-white
                disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all"
              style={{ background: 'linear-gradient(135deg,#0a84ff,#0055d4)' }}>
              {loading ? 'Criando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSave }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!password.trim())         { setErr('Insira a nova senha.'); return; }
    if (password !== confirm)     { setErr('As senhas não coincidem.'); return; }
    if (password.length < 6)      { setErr('Senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    const res = await fetch('/api/crm/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: user.id, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || 'Erro.'); return; }
    onSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Redefinir senha</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
              text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.05)]
              transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[13px] text-[#6e6e73] mb-5">
          Nova senha para <span className="font-medium text-[#1d1d1f]">{user.nome}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nova senha"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
              text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
              focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)] transition-all" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmar senha"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
              text-[14px] bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
              focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.15)] transition-all" />
          {err && <p className="text-[13px] text-[#ff3b30] bg-[#fff1f0] rounded-[8px] px-3 py-2">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] text-[14px] font-medium text-[#6e6e73]
                border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.22)]
                transition-all cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-[10px] text-[14px] font-semibold text-white
                disabled:opacity-60 cursor-pointer transition-all"
              style={{ background: 'linear-gradient(135deg,#0a84ff,#0055d4)' }}>
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users,          setUsers]         = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [showAdd,        setShowAdd]       = useState(false);
  const [resetUser,      setResetUser]     = useState(null);
  const [toast,          setToast]         = useState('');
  const [notionReady,    setNotionReady]   = useState(true);

  // ── Guard: admin only ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'administrador') {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  // ── Fetch users ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.role !== 'administrador') return;
    fetch('/api/crm/users')
      .then(r => r.json())
      .then(d => {
        if (d.error?.includes('NOTION_USERS_DB_ID')) { setNotionReady(false); }
        else { setUsers(d.users || []); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleToggleRole(user) {
    const newCargo = user.cargo === 'administrador' ? 'participante' : 'administrador';
    const res = await fetch('/api/crm/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: user.id, cargo: newCargo }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, cargo: newCargo } : u));
      showToast(`${user.nome} agora é ${newCargo === 'administrador' ? 'Administrador' : 'Participante'}.`);
    }
  }

  async function handleToggleActive(user) {
    const newAtivo = !user.ativo;
    const res = await fetch('/api/crm/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: user.id, ativo: newAtivo }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ativo: newAtivo } : u));
      showToast(`${user.nome} foi ${newAtivo ? 'reativado' : 'desativado'}.`);
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Remover ${user.nome}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch('/api/crm/users', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: user.id }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`${user.nome} foi removido.`);
    }
  }

  if (status === 'loading' || (session && session.user?.role !== 'administrador')) {
    return <CRMLayout title="Usuários · T3 Studio"><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#aeaeb2]" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title="Usuários · T3 Studio">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">Usuários</h1>
            <p className="text-[14px] text-[#6e6e73] mt-0.5">Gerencie o acesso ao CRM interno</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold text-white
              transition-all active:scale-[0.97] cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#0a84ff,#0055d4)' }}>
            <UserPlus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {/* Notion not configured warning */}
        {!notionReady && (
          <div className="mb-6 p-4 rounded-xl bg-[#fff9f0] border border-[#ff9f0a]/30">
            <p className="text-[13px] font-semibold text-[#c93400] mb-1">Configure a base de usuários no Notion</p>
            <p className="text-[13px] text-[#6e6e73]">
              Adicione a variável de ambiente <code className="bg-[rgba(0,0,0,0.06)] px-1.5 py-0.5 rounded text-[12px] font-mono">NOTION_USERS_DB_ID</code> com o ID da base de dados de usuários no Vercel.
              Veja as instruções de configuração para criar a base corretamente.
            </p>
          </div>
        )}

        {/* Users list */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-[#aeaeb2]" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(0,113,227,0.08)] flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-[#0071e3]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1d1d1f] mb-1">Nenhum usuário cadastrado</p>
              <p className="text-[13px] text-[#6e6e73]">Adicione o primeiro usuário para começar.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[rgba(0,0,0,0.05)]">
              {users.map((user, idx) => (
                <li key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[rgba(0,0,0,0.015)] transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-[13px] font-bold text-white"
                    style={{ background: user.foto ? 'transparent' : avatarColor(user.id) }}>
                    {user.foto
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={user.foto} alt={user.nome} className="w-full h-full object-cover" />
                      : getInitials(user.nome)
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[#1d1d1f]">{user.nome}</span>
                      <RoleBadge role={user.cargo} />
                      {user.source === 'legacy' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                          bg-[rgba(255,149,0,0.10)] text-[#c93400] uppercase tracking-wide"
                          title="Usuário definido em AUTH_USERS. Para gerenciar, adicione-o via botão Adicionar.">
                          ENV
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#aeaeb2] mt-0.5">{user.email}</p>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block">
                    <StatusDot ativo={user.ativo} />
                  </div>

                  {/* Actions */}
                  <ActionMenu
                    user={user}
                    currentUserId={session?.user?.id}
                    onToggleRole={handleToggleRole}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onResetPassword={u => setResetUser(u)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-[12px] text-[#aeaeb2]">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#0071e3]" /> Administrador — acesso total + gerenciamento de usuários</span>
          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Participante — acesso ao CRM sem painel de usuários</span>
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSave={user => { setUsers(prev => [...prev, user]); setShowAdd(false); showToast(`${user.nome} foi adicionado.`); }}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSave={() => { setResetUser(null); showToast('Senha redefinida com sucesso.'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100]
          bg-[#1d1d1f] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl
          whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}
    </CRMLayout>
  );
}
