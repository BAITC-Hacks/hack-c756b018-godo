'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, Compass, Sparkles } from 'lucide-react';
import { setDemoRole } from '@/lib/demo-role';

export default function Home() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('E0028');

  function openEmployee() {
    const id = employeeId.trim();
    if (!id) return;
    setDemoRole('employee');
    window.localStorage.setItem('careerQuestEmployeeId', id);
    router.push(`/employee?id=${encodeURIComponent(id)}`);
  }

  return <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-12 md:px-10">
    <div className="mb-10 flex items-center gap-3">
      <div className="brand-mark"><Compass size={25}/></div>
      <div><div className="text-xl font-extrabold">Career Quest</div><div className="text-xs text-[#6a8172]">Навигатор развития Halyk Bank</div></div>
    </div>
    <div className="mb-9 max-w-3xl">
      <div className="eyebrow">ВЫБЕРИТЕ СВОЮ РОЛЬ</div>
      <h1 className="page-title mt-2">У каждого свой следующий шаг</h1>
      <p className="muted text-base">Сотрудник видит личную траекторию и объяснимые рекомендации. HR видит список команды, проседающие компетенции и участие в активностях.</p>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <section className="card flex flex-col p-7" aria-labelledby="employee-role-title">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#e6f7ec] text-[#008a4d]"><BriefcaseBusiness size={24}/></div>
        <h2 id="employee-role-title" className="section-title">Я сотрудник</h2>
        <p className="muted mt-2 text-sm">Откройте свой профиль, посмотрите разрывы до следующего грейда и выберите одну из 1–3 рекомендованных активностей.</p>
        <label className="mt-6 text-xs font-bold text-[#536a5a]">ID сотрудника из загруженного набора
          <input className="input mt-2 w-full" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') openEmployee(); }} placeholder="Например, E0028" aria-label="ID сотрудника"/>
        </label>
        <button className="btn-primary mt-4 w-full" disabled={!employeeId.trim()} onClick={openEmployee}>Открыть мои рекомендации <ArrowRight size={17}/></button>
        <p className="muted mt-3 text-xs">Для демоданных используйте E0028 или E0031.</p>
      </section>
      <section className="card flex flex-col p-7" aria-labelledby="hr-role-title">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#eef2fb] text-[#37618b]"><ChartNoAxesCombined size={24}/></div>
        <h2 id="hr-role-title" className="section-title">Я HR</h2>
        <p className="muted mt-2 text-sm">Посмотрите список сотрудников, пять самых больших разрывов по навыкам, людей без подходящего шага и участие по событиям.</p>
        <ul className="muted mt-6 space-y-2 text-sm">
          <li className="flex items-center gap-2"><Sparkles size={15} className="text-[#008a4d]"/> Поиск и фильтр по сотрудникам</li>
          <li className="flex items-center gap-2"><Sparkles size={15} className="text-[#008a4d]"/> Импорт проверочных профилей и истории</li>
          <li className="flex items-center gap-2"><Sparkles size={15} className="text-[#008a4d]"/> Профиль сотрудника только для просмотра</li>
        </ul>
        <button className="btn-secondary mt-auto w-full" onClick={() => { setDemoRole('hr'); router.push('/hr'); }}>Открыть HR-обзор <ArrowRight size={17}/></button>
      </section>
    </div>
    <p className="muted mt-7 text-xs">Выбор роли здесь демонстрационный: сервер проверяет заголовки роли и ID. Для реального банка требуется SSO.</p>
  </main>;
}
