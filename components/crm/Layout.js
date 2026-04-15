import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  LayoutDashboard, CheckSquare, Film, Users, Calendar,
  ExternalLink, Menu, X, ChevronRight, Bell,
  Sparkles, Bot,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/dashboard/tarefas',     icon: CheckSquare,     label: 'Tarefas'    },
  { href: '/dashboard/conteudo',    icon: Film,            label: 'Conteúdo'   },
  { href: '/dashboard/clientes',    icon: Users,           label: 'Clientes'   },
  { href: '/dashboard/calendario',  icon: Calendar,        label: 'Calendário' },
  { href: '/dashboard/assistente',  icon: Bot,             label: 'Assistente', highlight: true },
];

function NavItem({ href, icon: Icon, label, active, onClick, highlight }) {
  if (highlight) {
    return (
      <Link href={href} onClick={onClick}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-150 cursor-pointer select-none"
        style={{
          background: active
            ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(8,145,178,0.2))'
            : 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(8,145,178,0.08))',
          border: active
            ? '1px solid rgba(124,58,237,0.4)'
            : '1px solid rgba(124,58,237,0.2)',
          color: active ? 'white' : 'rgba(167,139,250,0.85)',
          boxShadow: active ? '0 0 20px rgba(124,58,237,0.2)' : 'none',
        }}>
        <Icon className="w-4 h-4 shrink-0 text-violet-400"/>
        <span>{label}</span>
        {active
          ? <ChevronRight className="w-3 h-3 ml-auto text-violet-400/60"/>
          : <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{background:'rgba(124,58,237,0.25)',color:'#a78bfa',border:'1px solid rgba(124,58,237,0.3)'}}>
              IA
            </span>
        }
      </Link>
    );
  }
  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 cursor-pointer select-none
        ${active
          ? 'text-white bg-violet-600/20 border border-violet-500/25 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
          : 'text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-transparent'
        }`}>
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-400' : ''}`} />
      <span>{label}</span>
      {active && <ChevronRight className="w-3 h-3 ml-auto text-violet-400/60" />}
    </Link>
  );
}

function MobileNavItem({ href, icon: Icon, label, active, highlight }) {
  return (
    <Link href={href}
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-semibold
        transition-all duration-150 cursor-pointer select-none min-w-[52px]
        ${active ? 'text-violet-400' : highlight ? 'text-violet-400/70' : 'text-white/40 hover:text-white/70'}`}>
      <Icon className={`w-5 h-5 ${active ? 'text-violet-400' : highlight ? 'text-violet-400/70' : ''}`} />
      {label}
    </Link>
  );
}

export default function CRMLayout({ children, title = 'T3 Studio CRM' }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = router.pathname;

  const isActive = (href) =>
    href === '/dashboard' ? currentPath === href : currentPath.startsWith(href);

  const pageTitle = NAV.find(n => isActive(n.href))?.label ?? 'Dashboard';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#070d1b" />
      </Head>

      <div className="min-h-screen font-sans" style={{ background: '#070d1b' }}>
        {/* Aurora background */}
        <div className="fixed inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 15% 20%, rgba(124,58,237,0.07) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 80%, rgba(6,182,212,0.05) 0%, transparent 55%)
            `
          }} />

        {/* ── Desktop Sidebar ── */}
        <aside className="fixed left-0 top-0 bottom-0 w-56 hidden lg:flex flex-col z-30"
          style={{
            background: 'rgba(7,13,27,0.95)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>

          {/* Logo */}
          <div className="px-4 pt-6 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide font-display">T3 Studio</p>
                <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">CRM Interno</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 mb-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </nav>

          {/* Divider */}
          <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Portal link */}
          <div className="p-3">
            <Link href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium
                text-white/30 hover:text-white/60 border border-transparent
                hover:bg-white/[0.04] transition-all duration-150 cursor-pointer">
              <ExternalLink className="w-4 h-4 shrink-0" />
              Portal do Cliente
            </Link>
          </div>

          {/* User */}
          <div className="p-3 pb-5">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                S
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate">T3 Studio</p>
                <p className="text-[10px] text-white/30 truncate">atendimento@t3studio.com.br</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Mobile Header ── */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3"
          style={{
            background: 'rgba(7,13,27,0.95)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 flex items-center justify-center rounded-xl
              text-white/50 hover:text-white hover:bg-white/[0.06]
              transition-all duration-150 cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white font-display">{pageTitle}</span>
          </div>
          <button aria-label="Notificações"
            className="w-9 h-9 flex items-center justify-center rounded-xl
              text-white/50 hover:text-white hover:bg-white/[0.06]
              transition-all duration-150 cursor-pointer">
            <Bell className="w-4 h-4" />
          </button>
        </header>

        {/* ── Mobile Sidebar Overlay ── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
              style={{
                background: 'rgba(7,13,27,0.98)',
                backdropFilter: 'blur(32px)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}>
              <div className="px-4 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-display">T3 Studio</p>
                    <p className="text-[10px] text-white/30 tracking-widest uppercase">CRM</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl
                    text-white/40 hover:text-white hover:bg-white/[0.06]
                    transition-all duration-150 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mx-4 mb-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <nav className="flex-1 px-3 space-y-1">
                {NAV.map(item => (
                  <NavItem key={item.href} {...item}
                    active={isActive(item.href)}
                    onClick={() => setSidebarOpen(false)} />
                ))}
              </nav>
              <div className="p-3 pb-8">
                <Link href="/" onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs
                    text-white/30 hover:text-white/60 transition-all duration-150">
                  <ExternalLink className="w-4 h-4" />
                  Portal do Cliente
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="lg:ml-56 min-h-screen">
          <div className="pt-14 lg:pt-0 pb-20 lg:pb-0">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pb-safe"
          style={{
            background: 'rgba(7,13,27,0.97)',
            backdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '8px',
            paddingBottom: '12px',
          }}>
          {NAV.map(item => (
            <MobileNavItem key={item.href} {...item} active={isActive(item.href)} highlight={item.highlight} />
          ))}
        </nav>
      </div>
    </>
  );
}
