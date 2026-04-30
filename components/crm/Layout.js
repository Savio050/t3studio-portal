import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, CheckSquare, Film, Users, Calendar,
  Menu, X, Bot, Search, LogOut, Megaphone,
  ShieldCheck, Camera, Loader2, Users2, TrendingUp, AlignLeft,
} from 'lucide-react';

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/dashboard/tarefas',     icon: CheckSquare,     label: 'Tarefas'    },
  { href: '/dashboard/conteudo',    icon: Film,            label: 'Conteúdo'   },
  { href: '/dashboard/campanhas',   icon: Megaphone,       label: 'Campanhas'  },
  { href: '/dashboard/clientes',    icon: Users,           label: 'Clientes'   },
  { href: '/dashboard/calendario',  icon: Calendar,        label: 'Calendário' },
  { href: '/dashboard/equipe',      icon: Users2,          label: 'Equipe'     },
  { href: '/dashboard/assistente',    icon: Bot,       label: 'Assistente',   highlight: true },
  { href: '/dashboard/teleprompter', icon: AlignLeft, label: 'Teleprompter' },
];

const ADMIN_NAV = [
  { href: '/dashboard/financeiro', icon: TrendingUp,  label: 'Financeiro'            },
  { href: '/dashboard/usuarios',   icon: ShieldCheck, label: 'Configurações avançadas' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return 'T3';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Nav Items ─────────────────────────────────────────────────────────────────
function NavItem({ href, icon: Icon, label, active, onClick, highlight }) {
  return (
    <Link href={href} onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 px-3 py-2 rounded-[10px] text-[14px]
        transition-all duration-200 ease-apple select-none
        ${active
          ? 'bg-[rgba(0,113,227,0.08)] text-accent font-semibold'
          : 'text-ink-soft hover:text-ink hover:bg-[rgba(0,0,0,0.04)] font-medium'}`}>
      <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors
        ${active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-soft'}`} />
      <span className="flex-1">{label}</span>
      {highlight && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide
          ${active ? 'bg-accent text-white' : 'bg-accent-soft text-accent-ink'}`}>
          IA
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ href, icon: Icon, label, active }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-medium
        transition-all duration-150 cursor-pointer select-none min-w-[44px]">
      <Icon className={`w-[22px] h-[22px] transition-colors ${active ? 'text-accent' : 'text-ink-faint'}`} />
      <span className={active ? 'text-accent font-semibold' : 'text-ink-muted'}>{label}</span>
    </Link>
  );
}

// ── Avatar with photo upload ──────────────────────────────────────────────────
function UserAvatar({ name, foto, size = 'sm', onUpload, uploading }) {
  const initials   = getInitials(name);
  const [err, setErr] = useState(false);
  const showPhoto  = foto && !err;
  const dim        = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSz     = size === 'sm' ? 'text-[12px]' : 'text-[14px]';

  return (
    <button
      type="button"
      onClick={onUpload}
      title="Alterar foto de perfil"
      disabled={uploading}
      className={`${dim} rounded-full shrink-0 relative group cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1
        overflow-hidden`}>

      {/* Photo or initials */}
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <div className={`w-full h-full flex items-center justify-center
          ${textSz} font-semibold text-white brand-gradient`}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : initials}
        </div>
      )}

      {/* Camera overlay on hover */}
      {!uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </button>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function CRMLayout({ children, title = 'T3 Studio' }) {
  const router    = useRouter();
  const { data: session } = useSession();
  const fileRef   = useRef(null);

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [userFoto,     setUserFoto]     = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]    = useState('');

  const userName    = session?.user?.name  || 'T3 Studio';
  const userEmail   = session?.user?.email || '';
  const currentPath = router.pathname;
  const isAdmin     = session?.user?.role === 'administrador';

  const isActive  = (href) =>
    href === '/dashboard' ? currentPath === href : currentPath.startsWith(href);
  const pageTitle = [...NAV, ...ADMIN_NAV].find(n => isActive(n.href))?.label ?? 'Dashboard';

  // Fetch own profile photo on mount
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/crm/profile')
      .then(r => r.json())
      .then(d => { if (d.profile?.foto) setUserFoto(d.profile.foto); })
      .catch(() => {});
  }, [session]);

  // Photo upload flow — server-side to avoid R2 CORS issues
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr('Selecione uma imagem.'); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadErr('Imagem muito grande (máx 5MB).'); return; }

    setUploading(true);
    setUploadErr('');

    try {
      // Step 1: upload to R2 (server-side, no CORS)
      const res = await fetch('/api/crm/upload-avatar', {
        method:  'POST',
        headers: { 'Content-Type': file.type },
        body:    file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar foto.');

      const fotoUrl = data.foto;
      setUserFoto(fotoUrl);

      // Log full diagnostic if Notion save failed
      if (!data.notionSaved) {
        console.warn('Avatar upload: Notion save failed. Debug:', data.debug);
      }
    } catch (err) {
      setUploadErr(err.message || 'Erro ao enviar foto.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Shared nav sections render
  function renderNav(onItemClick) {
    return (
      <>
        <p className="px-3 pt-2 pb-1.5 t-eyebrow text-[10px]">Trabalho</p>
        {NAV.slice(0, 7).map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onItemClick} />
        ))}

        <p className="px-3 pt-5 pb-1.5 t-eyebrow text-[10px]">Ferramentas</p>
        {NAV.slice(7).map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onItemClick} />
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-5 pb-1.5 t-eyebrow text-[10px]">Administração</p>
            {ADMIN_NAV.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onItemClick} />
            ))}
          </>
        )}
      </>
    );
  }

  // Shared user card render
  function renderUserCard() {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-elevated border border-[rgba(0,0,0,0.05)]">
        {/* Clickable avatar */}
        <UserAvatar
          name={userName}
          foto={userFoto}
          uploading={uploading}
          onUpload={() => fileRef.current?.click()}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-ink truncate">{userName}</p>
            {isAdmin && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                bg-[rgba(0,113,227,0.10)] text-[#0071e3] uppercase tracking-wide">
                Admin
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-faint truncate">{userEmail}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sair"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-faint
            hover:text-[#ff3b30] hover:bg-[rgba(255,59,48,0.08)]
            transition-all duration-150 cursor-pointer shrink-0">
          <LogOut className="w-[15px] h-[15px]" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#fbfbfd" />
      </Head>

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload error toast */}
      {uploadErr && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[200]
          bg-[#ff3b30] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl
          whitespace-nowrap animate-fade-in">
          {uploadErr}
          <button onClick={() => setUploadErr('')} className="ml-3 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      <div className="min-h-screen bg-canvas text-ink antialiased">

        {/* ── Desktop Sidebar ──────────────────────────────────────── */}
        <aside className="fixed left-0 top-0 bottom-0 w-[232px] hidden lg:flex flex-col z-30 glass-sidebar">

          {/* Brand */}
          <div className="px-5 pt-6 pb-5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div>
                <p className="text-[15px] font-semibold text-ink tracking-apple-snug">T3 Studio</p>
                <p className="text-[11px] text-ink-faint font-medium tracking-wide">CRM Interno</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {renderNav()}
          </nav>

          {/* User card */}
          <div className="p-3 pb-5">
            {renderUserCard()}
          </div>
        </aside>

        {/* ── Mobile Top Bar ───────────────────────────────────────── */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-[52px] flex items-center px-3 gap-2 glass-nav">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"
            className="w-9 h-9 flex items-center justify-center rounded-[10px]
              text-ink-muted hover:text-ink hover:bg-[rgba(0,0,0,0.05)]
              transition-all duration-150 cursor-pointer">
            <Menu className="w-[20px] h-[20px]" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[15px] font-semibold text-ink tracking-apple-snug">{pageTitle}</span>
          </div>
          <button aria-label="Buscar"
            className="w-9 h-9 flex items-center justify-center rounded-[10px]
              text-ink-muted hover:text-ink hover:bg-[rgba(0,0,0,0.05)]
              transition-all duration-150 cursor-pointer">
            <Search className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* ── Mobile Sidebar Drawer ─────────────────────────────────── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[276px] flex flex-col bg-white animate-slide-up">
              <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">T3 Studio</p>
                    <p className="text-[11px] text-ink-faint">CRM</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px]
                    text-ink-muted hover:text-ink hover:bg-[rgba(0,0,0,0.05)]
                    transition-all duration-150 cursor-pointer">
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
              <div className="mx-4 mb-3 hairline" />

              <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {renderNav(() => setSidebarOpen(false))}
              </nav>

              {/* Mobile user card */}
              <div className="px-3 pt-3 pb-2 border-t border-[rgba(0,0,0,0.06)]">
                {renderUserCard()}
              </div>

            </aside>
          </div>
        )}

        {/* ── Main ─────────────────────────────────────────────────── */}
        <main className="lg:ml-[232px] min-h-screen">
          <div className="pt-[52px] lg:pt-0 pb-[80px] lg:pb-0">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ─────────────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around
          px-1 pb-safe pt-2 glass-nav"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none' }}>
          {NAV.slice(0, 6).map(item => (
            <MobileNavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>
    </>
  );
}
