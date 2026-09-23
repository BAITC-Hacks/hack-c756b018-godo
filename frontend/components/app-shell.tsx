'use client';

import Link from 'next/link';
import { useState } from 'react';
import { type DemoRole, setDemoRole, useDemoRole } from '@/lib/demo-role';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import { ArrowLeft, BriefcaseBusiness, ChartNoAxesCombined, Compass, Leaf } from 'lucide-react';

export function AppShell({ children, role }: { children: React.ReactNode; role: 'EMPLOYEE' | 'HR' }) {
  const pathname = usePathname();
  const role = useDemoRole();
  const [roleError, setRoleError] = useState('');
  function changeRole(nextRole: DemoRole) {
    if (nextRole === role) return;
    try {
      setDemoRole(nextRole);
      window.location.assign(nextRole === 'hr' ? '/hr' : '/employee');
    } catch { setRoleError('Не удалось сохранить роль. Разрешите хранение данных сайта в браузере.'); }
  }
  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <a className="skip-link" href="#main-content">К содержимому</a>
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><Compass size={25} strokeWidth={2.3} /></div>
        <div className="brand-text"><div className="text-base font-semibold tracking-tight">Career Quest</div><div className="brand-caption">Платформа развития</div></div>
      </div>
      <div className="sidebar-label navigation-caption">Навигация</div>
      <nav aria-label="Основная навигация" className="sidebar-nav">
        <Link href="/employee" aria-label="Моё развитие" aria-current={pathname === '/employee' ? 'page' : undefined} className={`side-link ${pathname === '/employee' ? 'active' : ''}`}><BriefcaseBusiness size={18} /><span className="sidebar-label">Моё развитие</span></Link>
        {role === 'hr' && <Link href="/hr" aria-label="Развитие команды" aria-current={pathname === '/hr' ? 'page' : undefined} className={`side-link ${pathname === '/hr' ? 'active' : ''}`}><ChartNoAxesCombined size={18} /><span className="sidebar-label">Развитие команды</span></Link>}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-icon"><Leaf size={17}/></div>
        <div className="text-sm font-bold">В своём темпе</div>
        <p className="muted mt-2 text-xs leading-5">Не нужно делать всё сразу. Выберите один шаг, который сейчас вам подходит.</p>
      </div>
    </aside>
    <main id="main-content" tabIndex={-1} className="main">
      <div className="role-toolbar">
        <div><div className="text-sm font-bold">Режим просмотра</div><p className="muted text-xs">Демо · выберите, от чьего лица работать</p></div>
        <div role="group" aria-label="Роль пользователя" className="role-switch">
          <button type="button" aria-pressed={role === 'employee'} onClick={() => changeRole('employee')}><BriefcaseBusiness size={16}/>Сотрудник</button>
          <button type="button" aria-pressed={role === 'hr'} onClick={() => changeRole('hr')}><ChartNoAxesCombined size={16}/>HR</button>
        </div>
      </div>
      {roleError && <p role="alert" className="error-banner mb-4">{roleError}</p>}
      {pathname === '/hr' && role !== 'hr' ? <div className="card p-8"><h1 className="section-title">Обзор команды доступен HR</h1><p className="muted mt-2">Выберите роль HR в переключателе выше, чтобы открыть аналитику и загрузку данных.</p></div> : children}
    </main>
  </div></MotionConfig>;
}
