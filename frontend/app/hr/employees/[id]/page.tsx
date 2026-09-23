'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CircleAlert, LoaderCircle, UserRound } from 'lucide-react';
import type { AIRecommendation, EmployeeProfile } from '../../../../../backend/types';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

export default function HrEmployeePage() {
  const parameters = useParams<{ id: string }>();
  const employeeId = parameters.id;
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState('');

  useEffect(() => {
    let active = true;
    api.hrProfile(employeeId).then((employee) => { if (active) setProfile(employee); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль'); })
      .finally(() => { if (active) setLoading(false); });
    api.recommendations(employeeId).then((items) => { if (active) setRecommendations(items.sort((a, b) => a.priority - b.priority)); })
      .catch((cause: unknown) => { if (active) setRecommendationsError(cause instanceof Error ? cause.message : 'Не удалось получить рекомендации'); })
      .finally(() => { if (active) setRecommendationsLoading(false); });
    return () => { active = false; };
  }, [employeeId]);

  const gaps = profile?.skills.filter((skill) => skill.requiredLevel > skill.currentLevel) ?? [];
  return <AppShell role="HR">
    <Link href="/hr" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#087f59]"><ArrowLeft size={16}/> К списку сотрудников</Link>
    {loading ? <div role="status" className="skeleton h-52"/> : error || !profile ? <div role="alert" className="error-banner">{error || 'Сотрудник не найден'}</div> : <>
      <header className="topbar"><div><div className="eyebrow">ПРОФИЛЬ СОТРУДНИКА · HR</div><h1 className="page-title">{profile.name}</h1><p className="muted text-sm">{profile.role} · {profile.id}</p></div><div className="pill"><UserRound size={15}/> Только просмотр</div></header>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="eyebrow">ТРАЕКТОРИЯ</div><div className="mt-3 text-lg font-extrabold">{profile.currentGrade} → {profile.targetGrade}</div><p className="muted mt-2 text-xs">{profile.tenureMonths} месяцев в компании</p></div>
        <div className="card p-5"><div className="eyebrow">ГОТОВНОСТЬ</div><div className="metric mt-3">{profile.readinessScore}%</div><p className="muted mt-2 text-xs">Доля закрытых требований следующего грейда</p></div>
        <div className="card p-5"><div className="eyebrow">НАВЫКИ С РАЗРЫВОМ</div><div className="metric mt-3">{gaps.length}</div><p className="muted mt-2 text-xs">Повод обсудить подходящие активности</p></div>
      </div>
      <section className="card mt-6 p-6"><div className="eyebrow">AI-РЕКОМЕНДАЦИИ</div><h2 className="section-title mt-1">Следующие шаги</h2><p className="muted mt-2 text-sm">Подбор учитывает грейд, разрывы навыков и историю участия. Отметить выполнение может только сотрудник.</p>
        {recommendationsLoading ? <p role="status" className="muted mt-4 flex items-center gap-2 text-sm"><LoaderCircle size={16} className="animate-spin"/> Подбираем шаги…</p> : recommendationsError ? <p role="alert" className="error-banner mt-4">{recommendationsError}</p> : recommendations.length ? <div className="mt-4 grid gap-3 lg:grid-cols-3">{recommendations.map((item) => <article key={item.eventId} className="rounded-xl border border-[#dcefe3] bg-[#f5fbf7] p-4"><div className="pill">Приоритет {item.priority}</div><h3 className="mt-3 font-bold">{item.title}</h3><p className="muted mt-1 text-xs">{item.targetSkillName} ({item.targetSkillId}) · прогноз +{item.predictedGain} ур.</p><p className="mt-3 text-sm leading-6">{item.reason}</p><p className="muted mt-2 text-xs">Событие: {item.eventId}</p></article>)}</div> : <p className="muted mt-4 text-sm">Подходящих шагов пока нет.</p>}
      </section>
      <div className="grid-main mt-6">
        <section className="card p-6"><h2 className="section-title">Навыки и требования</h2><div className="mt-4 space-y-3">{profile.skills.map((skill) => <div key={skill.skillId} className="rounded-xl border border-[#e7eee9] p-4"><div className="flex justify-between gap-3"><div><div className="font-bold">{skill.skillName}</div><div className="muted text-xs">{skill.category === 'soft' ? 'Гибкий навык' : 'Профессиональный навык'}</div></div><div className="text-sm font-extrabold">{skill.currentLevel} / {skill.requiredLevel}</div></div>{skill.requiredLevel > skill.currentLevel && <div className="mt-2 flex items-center gap-1 text-xs text-[#b76821]"><CircleAlert size={13}/> Разрыв {skill.requiredLevel - skill.currentLevel}</div>}</div>)}{profile.skills.length === 0 && <p className="muted text-sm">Навыки не загружены.</p>}</div></section>
        <section className="card p-6"><h2 className="section-title">История участия</h2><p className="muted mt-2 text-xs">Доступна HR для обсуждения добровольного развития.</p><div className="mt-4 space-y-3">{profile.history.map((item) => <div key={`${item.eventId}-${item.date}`} className="rounded-xl border border-[#e7eee9] p-3"><div className="flex justify-between gap-3"><span className="text-sm font-bold">{item.title}</span><span className="muted text-xs">{new Date(item.date).toLocaleDateString('ru-RU')}</span></div><div className="muted mt-1 text-xs">{item.status === 'completed' ? 'Завершено' : item.status === 'missed' ? 'Пропущено' : 'Отказ'}</div></div>)}{profile.history.length === 0 && <p className="muted text-sm">История пока пуста.</p>}</div></section>
      </div>
    </>}
  </AppShell>;
}
