'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import { ArrowLeft, BriefcaseBusiness, ChartNoAxesCombined, Compass, Leaf } from 'lucide-react';

export function AppShell({ children, role }: { children: React.ReactNode; role: 'EMPLOYEE' | 'HR' }) {
  const pathname = usePathname();
  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <a className="skip-link" href="#main-content">К содержимому</a>
    <aside className="sidebar">
      <div className="flex items-center gap-3 px-1">
        <div className="brand-mark"><Compass size={25} strokeWidth={2.3} /></div>
        <div className="brand-text"><div className="text-[17px] font-extrabold tracking-tight">Career Quest</div><div className="text-[10px] tracking-[.15em] uppercase text-[#8bb19e]">Платформа развития</div></div>
      </div>
      <div className="sidebar-label mt-14 mb-3 px-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#799b88]">{role === 'HR' ? 'Роль: HR' : 'Роль: сотрудник'}</div>
      <nav aria-label="Основная навигация" className="mt-6 space-y-2">
        {role === 'EMPLOYEE' ? <Link href="/employee" aria-label="Моё развитие" aria-current={pathname === '/employee' ? 'page' : undefined} className={`side-link ${pathname === '/employee' ? 'active' : ''}`}><BriefcaseBusiness size={18} /><span className="sidebar-label">Моё развитие</span></Link> : <Link href="/hr" aria-label="Развитие команды" aria-current={pathname.startsWith('/hr') ? 'page' : undefined} className={`side-link ${pathname.startsWith('/hr') ? 'active' : ''}`}><ChartNoAxesCombined size={18} /><span className="sidebar-label">Развитие команды</span></Link>}
        <Link href="/" aria-label="Выбор роли" className="side-link"><ArrowLeft size={18}/><span className="sidebar-label">Сменить роль</span></Link>
      </nav>
      <div className="sidebar-footer mt-auto rounded-2xl bg-[#ffffff0d] border border-[#ffffff12] p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a8592e] text-[#5be5a3]"><Leaf size={17}/></div>
        <div className="text-sm font-bold">В своём темпе</div>
        <p className="mt-2 text-xs leading-5 text-[#9bb8a8]">Не нужно делать всё сразу. Выберите один шаг, который сейчас вам подходит.</p>
      </div>
    </aside>
    <main id="main-content" tabIndex={-1} className="main">{children}</main>
  </div></MotionConfig>;
}
