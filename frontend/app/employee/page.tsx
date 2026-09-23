'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, CircleHelp, Clock3, LoaderCircle, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { AIRecommendation, EmployeeProfile, SkillProgress } from '../../../backend/types';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
<<<<<<< HEAD

function SkillCard({ skill }: { skill: SkillProgress }) {
  const percentage = skill.requiredLevel > 0 ? Math.min(100, skill.currentLevel / skill.requiredLevel * 100) : 0;
  const complete = skill.requiredLevel > 0 && skill.currentLevel >= skill.requiredLevel;
  return <div className="rounded-xl border border-[#e7eee9] p-4">
    <div className="flex justify-between gap-3"><div><div className="text-sm font-bold">{skill.skillName}</div><div className="muted mt-1 text-xs">{skill.category === 'soft' ? 'Гибкий навык' : 'Профессиональный навык'}</div></div><span className="text-xs font-bold">{skill.currentLevel} / {skill.requiredLevel}</span></div>
    <div className="progress-track mt-4"><div className="progress-fill" style={{ width: `${percentage}%` }}/></div>
    <div className="muted mt-2 text-xs">{complete ? 'Цель достигнута' : `До цели: ${Math.max(0, skill.requiredLevel - skill.currentLevel)} ур.`}</div>
  </div>;
}

function RecommendationCard({ recommendation, busy, onComplete }: { recommendation: AIRecommendation; busy: boolean; onComplete: (eventId: string) => void }) {
  return <article className="card p-5">
    <div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf8f0] text-[#008a4d]"><BookOpen size={20}/></div><span className="pill">{recommendation.priority === 1 ? 'Рекомендуем начать здесь' : `Вариант ${recommendation.priority}`}</span></div>
    <h3 className="mt-4 text-lg font-extrabold">{recommendation.title}</h3>
    <p className="muted mt-1 text-xs">{recommendation.targetSkillName} · прогноз +{recommendation.predictedGain} ур.</p>
    <div className="mt-4 rounded-xl border border-[#dcefe3] bg-[#f5fbf7] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#18784b]"><Sparkles size={15}/> Почему этот шаг</div><p className="mt-2 text-sm leading-6 text-[#536b5a]">{recommendation.reason}</p></div>
    <button className="btn-primary mt-4 w-full" disabled={busy} onClick={() => onComplete(recommendation.eventId)}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {busy ? 'Сохраняем…' : 'Отметить как пройденное'}</button>
=======
import { useCareerStore } from '@/lib/store';
import { getDemoRole, useDemoRole } from '@/lib/demo-role';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function SkillCard({ skill }: { skill: SkillProgress }) {
  const percentage = skill.requiredLevel > 0 ? clamp(skill.currentLevel / skill.requiredLevel * 100) : 100;
  const complete = skill.currentLevel >= skill.requiredLevel;
  return <div className="rounded-xl border border-[#e2e8f8] p-4 transition hover:border-[#bfe8cf] hover:shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-[14px]">{skill.skillName}</div><div className="mt-1 text-xs text-[#6e7a6e]">{skill.category === 'hard' ? 'Профессиональный навык' : 'Навык взаимодействия'}</div></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${complete ? 'bg-[#f0f3ff] text-[#068149]' : 'bg-[#f1f4f1] text-[#58685d]'}`}>{complete ? 'Цель достигнута' : `${skill.currentLevel} / ${skill.requiredLevel}`}</span></div>
    <div className="mt-5 progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: .8, ease: 'easeOut' }} /></div>
    <div className="mt-2 flex justify-between text-[11px] text-[#6e7a6e]"><span>Текущий уровень {skill.currentLevel}</span><span>Цель {skill.requiredLevel}</span></div>
  </div>;
}

function RecommendationCard({ recommendation, busy, saving, onComplete }: { recommendation: AIRecommendation; busy: boolean; saving: boolean; onComplete: (eventId: string) => void }) {
  const role = useDemoRole();
  return <article className="card overflow-hidden">
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f3ff] text-[#006b32]"><BookOpen size={21}/></div><span className="pill">{recommendation.priority === 1 ? 'Можно начать здесь' : 'Ещё один вариант'}</span></div>
      <h3 className="mt-4 text-[16px] font-semibold leading-6">{recommendation.title}</h3><p className="mt-2 text-xs text-[#56615c]">Развивает: <span className="font-bold text-[#3b5c49]">{recommendation.targetSkillName}</span> · прогноз +{recommendation.predictedGain} ур.</p>
      <div className="mt-5 rounded-xl border border-[#e2e8f8] bg-[#f0f3ff] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#18784b]"><Sparkles size={15}/> Почему этот шаг подходит вам</div><p className="mt-2 text-[13px] leading-[1.65] text-[#536b5a]">{recommendation.reason}</p></div>
      {role === 'employee' ? <><button className="btn-primary mt-5 w-full" onClick={() => onComplete(recommendation.eventId)} disabled={busy}>{saving ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {saving ? 'Сохраняем результат…' : 'Отметить как пройденное'}</button>
      <p className="muted mt-2 text-center text-xs">Уже прошли? Отметьте — пересчитаем прогресс.</p></> : <p className="muted mt-5 text-sm">Режим HR: прохождение отмечает сам сотрудник.</p>}
    </div>
>>>>>>> c7a3d14e677c716e4a4f22faac9b3f79dd93fe28
  </article>;
}

export default function EmployeePage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState('E0028');
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [recommendationsError, setRecommendationsError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('id') || window.localStorage.getItem('careerQuestEmployeeId') || 'E0028';
      setEmployeeId(id);
      setDraftId(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setProfileLoading(true);
      setRecommendationsLoading(true);
      setProfile(null);
      setRecommendations([]);
      setProfileError('');
      setRecommendationsError('');
      api.profile(employeeId).then((result) => { if (active) setProfile(result); })
        .catch((cause: unknown) => { if (active) setProfileError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль'); })
        .finally(() => { if (active) setProfileLoading(false); });
      api.recommendations(employeeId).then((result) => { if (active) setRecommendations(result); })
        .catch((cause: unknown) => { if (active) setRecommendationsError(cause instanceof Error ? cause.message : 'Не удалось подобрать шаги'); })
        .finally(() => { if (active) setRecommendationsLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [employeeId, reload]);

  function chooseEmployee() {
    const id = draftId.trim();
    if (!id || busyEvent) return;
    window.localStorage.setItem('careerQuestEmployeeId', id);
    window.history.replaceState(null, '', `/employee?id=${encodeURIComponent(id)}`);
    if (id === employeeId) setReload((current) => current + 1);
    else setEmployeeId(id);
    setNotice('');
  }

<<<<<<< HEAD
  async function completeEvent(eventId: string) {
    if (!employeeId) return;
    setBusyEvent(eventId);
    setNotice('');
=======
  async function complete(eventId: string) {
    if (getDemoRole() !== 'employee') return;
    setBusyEvent(eventId); setError(''); setNotice('');
>>>>>>> c7a3d14e677c716e4a4f22faac9b3f79dd93fe28
    try {
      const result = await api.complete({ employeeId, eventId });
      const [updatedProfile, updatedRecommendations] = await Promise.all([api.profile(employeeId), api.recommendations(employeeId)]);
      setProfile(updatedProfile);
      setRecommendations(updatedRecommendations);
      setNotice(`Активность учтена. Готовность к ${updatedProfile.targetGrade}: ${result.newReadinessScore}%.`);
      setRecommendationsError('');
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : 'Не удалось обновить прогресс');
      setReload((current) => current + 1);
    } finally { setBusyEvent(null); }
  }

  const incompleteData = profile?.dataStatus && (!profile.dataStatus.hasEmployeeSkills || !profile.dataStatus.hasTargetRequirements || !profile.dataStatus.hasEvents);
  const ready = Math.max(0, Math.min(100, profile?.readinessScore ?? 0));
  const completedSkills = profile?.skills.filter((skill) => skill.requiredLevel > 0 && skill.currentLevel >= skill.requiredLevel).length ?? 0;

  return <AppShell role="EMPLOYEE">
    <header className="topbar"><div><div className="eyebrow">ЛИЧНЫЙ МАРШРУТ</div><h1 className="page-title">Моё развитие</h1><p className="muted text-sm">Что даст следующий шаг и как он приблизит к цели.</p></div><details className="profile-switcher"><summary>Демо: выбрать ID сотрудника</summary><div className="mt-3 flex gap-2"><input className="input w-32" aria-label="ID сотрудника" value={draftId} onChange={(event) => setDraftId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') chooseEmployee(); }}/><button className="btn-secondary" disabled={!draftId.trim() || busyEvent !== null} onClick={chooseEmployee}>Открыть</button></div></details></header>
    {notice && <div role="status" className="mb-5 rounded-xl border border-[#c7ebd6] bg-[#edf9f1] px-4 py-3 text-sm font-bold text-[#087d48]">{notice}</div>}
    {profileLoading ? <div role="status" className="skeleton h-52"/> : profileError && !profile ? <div role="alert" className="error-banner">{profileError} <button className="ml-2 underline" onClick={() => setReload((current) => current + 1)}>Повторить</button></div> : profile && <>
      <section className="card profile-hero p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-6"><div><div className="pill">ВАША ОТПРАВНАЯ ТОЧКА</div><h2 className="mt-4 text-2xl font-extrabold">{profile.name}</h2><p className="muted text-sm">{profile.role} · {profile.id}</p><div className="mt-4 text-sm font-bold">{profile.currentGrade} <ArrowRight className="mx-1 inline text-[#008a4d]" size={15}/> {profile.targetGrade}</div><p className="muted mt-2 text-xs"><Clock3 className="mr-1 inline" size={14}/>{profile.tenureMonths} месяцев в компании</p></div><div className="min-w-48 rounded-2xl bg-white p-5 text-center"><div className="text-4xl font-extrabold">{ready}%</div><div className="muted mt-1 text-xs">готовность к {profile.targetGrade}</div><div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${ready}%` }}/></div><div className="muted mt-2 text-xs">{completedSkills} из {profile.skills.length} навыков на цели</div></div></div></section>
      {incompleteData && <div role="alert" className="error-banner mt-5">Для профиля {profile.id} не хватает данных: {!profile.dataStatus?.hasEmployeeSkills ? 'навыков сотрудника; ' : ''}{!profile.dataStatus?.hasTargetRequirements ? 'требований следующего грейда; ' : ''}{!profile.dataStatus?.hasEvents ? 'активностей; ' : ''}обратитесь к HR для загрузки полного набора.</div>}
      <section className="mt-7" aria-labelledby="recommendations-title"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow">С УЧЁТОМ ВАШЕГО ОПЫТА</div><h2 id="recommendations-title" className="section-title mt-1">Рекомендованный следующий шаг</h2><p className="muted mt-1 text-sm">1–3 активности с объяснением грейда, разрыва навыков и истории участия.</p></div><Sparkles size={22} className="text-[#008a4d]"/></div>
        {recommendationsLoading ? <div role="status" className="card p-6"><LoaderCircle size={20} className="animate-spin text-[#008a4d]"/><p className="muted mt-2 text-sm">Подбираем подходящие шаги…</p></div> : recommendationsError ? <div role="alert" className="error-banner">{recommendationsError} <button className="ml-2 underline" onClick={() => setReload((current) => current + 1)}>Повторить</button></div> : recommendations.length ? <div className="grid gap-4 lg:grid-cols-3">{recommendations.map((recommendation) => <RecommendationCard key={recommendation.eventId} recommendation={recommendation} busy={busyEvent !== null} onComplete={completeEvent}/>)}</div> : <div className="card p-6"><CircleHelp size={22} className="text-[#008a4d]"/><h3 className="mt-3 font-bold">Подходящих шагов пока нет</h3><p className="muted mt-1 text-sm">Все доступные активности уже пройдены или не подходят с учётом цели и истории. Обсудите другой формат развития с HR.</p></div>}
      </section>
      <div className="grid-main mt-7"><section className="card p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">КАРТА НАВЫКОВ</div><h2 className="section-title mt-1">Прогресс к следующему грейду</h2></div><Target size={21} className="text-[#008a4d]"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{profile.skills.map((skill) => <SkillCard key={skill.skillId} skill={skill}/>)}</div>{profile.skills.length === 0 && <p className="muted mt-4 text-sm">Навыки пока не загружены.</p>}</section>
        <section className="card p-6"><div className="eyebrow">ИСТОРИЯ УЧАСТИЯ</div><h2 className="section-title mt-1">Активности</h2><div className="mt-4 space-y-2">{profile.history.slice(0, 10).map((item) => <div key={`${item.eventId}-${item.date}`} className="rounded-xl border border-[#e7eee9] p-3"><div className="flex justify-between gap-3"><span className="text-sm font-bold">{item.title}</span><span className="muted text-xs">{new Date(item.date).toLocaleDateString('ru-RU')}</span></div><div className="muted mt-1 text-xs">{item.status === 'completed' ? 'Завершено' : item.status === 'missed' ? 'Пропущено' : 'Отказ'}</div></div>)}{profile.history.length === 0 && <p className="muted text-sm">История пока пуста.</p>}</div></section></div>
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#d8ecdf] bg-[#ecf8f0] p-5"><TrendingUp size={18} className="mt-1 text-[#008a4d]"/><p className="text-xs leading-5 text-[#5b7c66]">Прогресс показывает долю выполненных требований. Он не является оценкой вашей работы; решение о повышении обсуждается с руководителем.</p></div>
    </>}
  </AppShell>;
}
