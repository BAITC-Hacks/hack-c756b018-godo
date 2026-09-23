'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Compass, Sparkles } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="flex items-center gap-3 px-1">
        <div className="brand-mark"><Compass size={25} strokeWidth={2.3} /></div>
        <div className="brand-text"><div className="text-[17px] font-extrabold tracking-tight">Career Quest</div><div className="text-[10px] tracking-[.15em] uppercase text-[#8bb19e]">Платформа развития</div></div>
      </div>
      <div className="sidebar-label mt-14 mb-3 px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#799b88]">Рабочее пространство</div>
      <nav className="mt-6 space-y-2">
        <Link href="/employee" className={`side-link ${pathname === '/employee' ? 'active' : ''}`}><BriefcaseBusiness size={18} /><span className="sidebar-label">Мой прогресс</span></Link>
        <Link href="/hr" className={`side-link ${pathname === '/hr' ? 'active' : ''}`}><ChartNoAxesCombined size={18} /><span className="sidebar-label">HR-аналитика</span></Link>
      </nav>
      <div className="sidebar-footer mt-auto rounded-2xl bg-[#ffffff0d] border border-[#ffffff12] p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a8592e] text-[#5be5a3]"><Sparkles size={17}/></div>
        <div className="text-sm font-bold">Рост начинается здесь</div>
        <p className="mt-2 text-xs leading-5 text-[#9bb8a8]">Понятный путь к следующему карьерному шагу.</p>
        <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#67dfa2]">Career Quest <ArrowUpRight size={13}/></div>
      </div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
