import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, CheckSquare, Film, Users, Calendar,
  ExternalLink, Menu, X, Bot, Search, LogOut, Megaphone,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/dashboard/tarefas',     icon: CheckSquare,     label: 'Tarefas'    },
  { href: '/dashboard/conteudo',    icon: Film,            label: 'Conteúdo'   },
  { href: '/dashboard/campanhas',   icon: Megaphone,       label: 'Campanhas'  },
  { href: '/dashboard/clientes',    icon: Users,           label: 'Clientes'   },
  { href: '/dashboard/calendario',  icon: Calendar,        label: 'Calendário' },
  { href: '/dashboard/assistente',  icon: Bot,             label: 'Assistente', highlight: true },
];

function NavItem({ href, icon: Icon, label, active, onClick, highlight }) {
  return (
    <Link href={href} onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 px-3 py-2 rounded-[10px] text-[14px]
        transition-all duration-200 ease-apple select-none
        ${active
          ? 'bg-[rgba(0,113,227,0.08)] text-accent font-semibold'
          : 'text-ink-soft hover:text-ink hover:bg-[rgba(0,0,0,0.04)] font-medium'
        }`}>
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
    <Link href={href}
      aria-current={active ? 'page' : undefined}
      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium
        transition-all duration-150 cursor-pointer select-none min-w-[56px]">
      <Icon className={`w-[22px] h-[22px] transition-colors ${active ? 'text-accent' : 'text-ink-faint'}`} />
      <span className={active ? 'text-accent font-semibold' : 'text-ink-muted'}>{label}</span>
    </Link>
  );
}

function Logo({ size = 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className={`${s} rounded-[9px] brand-gradient flex items-center justify-center shrink-0`}>
      <svg className={`${iconSize} text-white`} viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M7 7v13M17 7v13M4 20h16"/>
      </svg>
    </div>
  );
}

function getInitials(name) {
  if (!name) return 'T3';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CRMLayout({ children, title = 'T3 Studio' }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userName  = session?.user?.name  || 'T3 Studio';
  const userEmail = session?.user?.email || '';
  const initials  = getInitials(userName);
  const currentPath = router.pathname;

  const isActive = (href) =>
    href === '/dashboard' ? currentPath === href : currentPath.startsWith(href);
  const pageTitle = NAV.find(n => isActive(n.href))?.label ?? 'Dashboard';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#fbfbfd" />
      </Head>

      <div className="min-h-screen bg-canvas text-ink antialiased">

        {/* ── Desktop Sidebar ────────────────────────────────────── */}
        <aside className="fixed left-0 top-0 bottom-0 w-[232px] hidden lg:flex flex-col z-30 glass-sidebar">

          {/* Brand */}
          <div className="px-5 pt-6 pb-5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <Logo />
              <div>
                <p className="text-[15px] font-semibold text-ink tracking-apple-snug">T3 Studio</p>
                <p className="text-[11px] text-ink-faint font-medium tracking-wide">CRM Interno</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            <p className="px-3 pt-2 pb-1.5 t-eyebrow text-[10px]">Trabalho</p>
            {NAV.slice(0, 6).map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}

            <p className="px-3 pt-5 pb-1.5 t-eyebrow text-[10px]">Ferramentas</p>
            {NAV.slice(6).map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-3 space-y-1">
            <Link href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] text-ink-muted
                hover:text-ink hover:bg-[rgba(0,0,0,0.04)] transition-all duration-150 cursor-pointer">
              <ExternalLink className="w-[16px] h-[16px] shrink-0" />
              Portal do Cliente
            </Link>
          </div>

          {/* User card */}
          <div className="p-3 pb-5">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-elevated border border-[rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold text-white brand-gradient">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink truncate">{userName}</p>
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
          </div>
        </aside>

        {/* ── Mobile Top Bar ─────────────────────────────────────── */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-[52px] flex items-center px-3 gap-2 glass-nav">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 flex items-center justify-center rounded-[10px]
              text-ink-muted hover:text-ink hover:bg-[rgba(0,0,0,0.05)]
              transition-all duration-150 cursor-pointer">
            <Menu className="w-[20px] h-[20px]" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Logo size="sm" />
            <span className="text-[15px] font-semibold text-ink tracking-apple-snug">{pageTitle}</span>
          </div>
          <button aria-label="Buscar"
            className="w-9 h-9 flex items-center justify-center rounded-[10px]
              text-ink-muted hover:text-ink hover:bg-[rgba(0,0,0,0.05)]
              transition-all duration-150 cursor-pointer">
            <Search className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* ── Mobile Sidebar Drawer ──────────────────────────────── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[276px] flex flex-col bg-white animate-slide-up">
              <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Logo />
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
                <p className="px-3 pt-1 pb-1.5 t-eyebrow text-[10px]">Trabalho</p>
                {NAV.slice(0, 6).map(item => (
                  <NavItem key={item.href} {...item}
                    active={isActive(item.href)}
                    onClick={() => setSidebarOpen(false)} />
                ))}
                <p className="px-3 pt-4 pb-1.5 t-eyebrow text-[10px]">Ferramentas</p>
                {NAV.slice(6).map(item => (
                  <NavItem key={item.href} {...item}
                    active={isActive(item.href)}
                    onClick={() => setSidebarOpen(false)} />
                ))}
              </nav>
              <div className="p-3 pb-8">
                <Link href="/" onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px]
                    text-ink-muted hover:text-ink transition-all duration-150">
                  <ExternalLink className="w-[16px] h-[16px]" />
                  Portal do Cliente
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="lg:ml-[232px] min-h-screen">
          <div className="pt-[52px] lg:pt-0 pb-[80px] lg:pb-0">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ──────────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pb-safe pt-2 glass-nav" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none' }}>
          {NAV.map(item => (
            <MobileNavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>
    </>
  );
}
