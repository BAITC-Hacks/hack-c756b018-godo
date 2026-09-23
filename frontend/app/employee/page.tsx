'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, CheckCircle2, CircleHelp, Clock3, LoaderCircle, Medal, RotateCcw, Sparkles, Star, Target, TrendingUp, Trophy } from 'lucide-react';
import type { AIRecommendation, EmployeeProfile, SkillProgress } from '../../../backend/types';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { getDemoRole, useDemoRole } from '@/lib/demo-role';

const durationByEvent: Record<string, string> = {
  EV_SYSTEM: '2 часа',
  EV_PYTHON: '4 часа',
  EV_SPEAK: '1 час',
};

function SkillCard({ skill, selected, gain }: { skill: SkillProgress; selected: boolean; gain: number }) {
  const required = Math.max(1, skill.requiredLevel);
  const current = Math.min(100, skill.currentLevel / required * 100);
  const projected = Math.min(100, (skill.currentLevel + gain) / required * 100);
  const gap = Math.max(0, skill.requiredLevel - skill.currentLevel);
  return <div className={`skill-row ${selected ? 'skill-row-selected' : ''}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-bold">{skill.skillName}</div><div className="muted text-xs">{skill.category === 'soft' ? 'Гибкий навык' : 'Профессиональный навык'}</div></div><span className="skill-levels">{skill.currentLevel} <ArrowRight size={13}/> {skill.requiredLevel}</span></div>
    <div className="skill-scale mt-4" role="img" aria-label={`${skill.skillName}: сейчас ${skill.currentLevel}, требуется ${skill.requiredLevel}${gain ? `, прогноз после активности ${skill.currentLevel + gain}` : ''}`}><motion.div className="skill-scale-current" initial={false} animate={{ width: `${current}%` }} transition={{ duration: .55 }}/>{selected && gain > 0 && <motion.div className="skill-scale-preview" initial={{ left: `${current}%`, width: 0 }} animate={{ left: `${current}%`, width: `${Math.max(0, projected - current)}%` }} transition={{ duration: .55 }}/>}</div>
    <div className="mt-2 flex justify-between gap-2 text-xs"><span className={gap ? 'text-[#a5651b]' : 'text-[#087d48]'}>{gap ? `Осталось ${gap} ур.` : 'Цель достигнута'}</span>{selected && gain > 0 && <span className="font-bold text-[#087d48]">Прогноз +{gain} ур.</span>}</div>
  </div>;
}

function RecommendationCard({ recommendation, selected, busy, onSelect, onComplete }: { recommendation: AIRecommendation; selected: boolean; busy: boolean; onSelect: () => void; onComplete: (eventId: string) => void }) {
  const role = useDemoRole();
  return <article className={`recommendation-card ${selected ? 'recommendation-card-selected' : ''}`}>
    <div className="flex items-start justify-between gap-3"><div className="recommendation-icon"><BookOpen size={20}/></div><span className="pill">{recommendation.priority === 1 ? 'Лучший следующий шаг' : `Вариант ${recommendation.priority}`}</span></div>
    <h3 className="mt-4 text-lg font-bold leading-6">{recommendation.title}</h3>
    <div className="muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{durationByEvent[recommendation.eventId] ?? 'Длительность уточняется'}</span><span className="inline-flex items-center gap-1"><TrendingUp size={14}/>+{recommendation.predictedGain} ур.</span></div>
    <div className="mt-4 text-xs font-bold text-[#087d48]">Развивает: {recommendation.targetSkillName}</div>
    <p className="muted mt-2 min-h-16 text-sm leading-6">{recommendation.reason}</p>
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={selected ? 'btn-primary' : 'btn-secondary'} aria-pressed={selected} onClick={onSelect}>Посмотреть результат <ArrowRight size={15}/></button>{role === 'employee' && <button type="button" className="btn-secondary" disabled={busy} onClick={() => onComplete(recommendation.eventId)}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {busy ? 'Сохраняем…' : 'Отметить выполненным'}</button>}</div>
  </article>;
}

function ProgressRewards({ history }: { history: EmployeeProfile['history'] }) {
  const completed = history.filter((item) => item.status.toLowerCase() === 'completed').length;
  const points = completed * 100;
  const level = Math.floor(completed / 3) + 1;
  const towardNextLevel = completed % 3;
  const badges = [
    { goal: 1, title: 'Первый шаг', icon: Star },
    { goal: 3, title: 'На пути к цели', icon: Medal },
    { goal: 5, title: 'Исследователь', icon: Trophy },
  ];
  return <section className="card mt-6 p-6" aria-labelledby="rewards-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">ВАШ РИТМ</div><h2 id="rewards-title" className="section-title mt-1">Достижения</h2><p className="muted mt-1 text-sm">За завершённую активность — 100 очков. Только ваш личный прогресс.</p></div><div className="rounded-xl bg-[#eaf8f0] px-4 py-2 text-sm font-bold text-[#087d48]">Уровень {level} · {points} очков</div></div>
    <div className="mt-5 flex justify-between gap-3 text-xs font-bold"><span>До уровня {level + 1}</span><span>{3 - towardNextLevel} {3 - towardNextLevel === 1 ? 'активность' : 'активности'}</span></div><div className="progress-track mt-2" role="progressbar" aria-label={`Прогресс до уровня ${level + 1}`} aria-valuenow={towardNextLevel} aria-valuemin={0} aria-valuemax={3}><motion.div className="progress-fill" initial={false} animate={{ width: `${towardNextLevel / 3 * 100}%` }}/></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{badges.map(({ goal, title, icon: Icon }) => <div key={goal} className={`reward-badge ${completed >= goal ? 'reward-badge-earned' : ''}`}><div className="reward-badge-icon"><Icon size={18}/></div><div><div className="text-sm font-bold">{title}</div><div className="muted text-xs">{completed >= goal ? 'Получено' : `${goal} завершённых активностей`}</div></div></div>)}</div>
  </section>;
}

export default function EmployeePage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState('E0028');
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [recommendationsError, setRecommendationsError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('id') || window.localStorage.getItem('careerQuestEmployeeId') || 'E0028';
      setEmployeeId(id); setDraftId(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setProfileLoading(true); setRecommendationsLoading(true);
      setProfile(null); setRecommendations([]); setSelectedEventId(null);
      setProfileError(''); setRecommendationsError('');
      api.profile(employeeId).then((result) => { if (active) setProfile(result); })
        .catch((cause: unknown) => { if (active) setProfileError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль'); })
        .finally(() => { if (active) setProfileLoading(false); });
      api.recommendations(employeeId).then((result) => { if (active) setRecommendations(result.sort((a, b) => a.priority - b.priority).slice(0, 3)); })
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
    setNotice(''); setActionError('');
  }

  async function completeEvent(eventId: string) {
    if (!employeeId || busyEvent || getDemoRole() !== 'employee') return;
    setBusyEvent(eventId); setNotice(''); setActionError('');
    try {
      const result = await api.complete({ employeeId, eventId });
      setNotice(`Активность учтена. Готовность к ${profile?.targetGrade ?? 'следующему грейду'}: ${result.newReadinessScore}%.`);
      setSelectedEventId(null);
      const [updatedProfile, updatedRecommendations] = await Promise.allSettled([api.profile(employeeId), api.recommendations(employeeId)]);
      if (updatedProfile.status === 'fulfilled') setProfile(updatedProfile.value);
      if (updatedRecommendations.status === 'fulfilled') {
        setRecommendations(updatedRecommendations.value.sort((a, b) => a.priority - b.priority).slice(0, 3));
        setRecommendationsError('');
      } else {
        setRecommendations([]);
        setRecommendationsError('Активность сохранена, но рекомендации не обновились.');
      }
      if (updatedProfile.status === 'rejected') setActionError('Активность сохранена, но профиль не обновился. Обновите данные.');
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Не удалось обновить прогресс'); }
    finally { setBusyEvent(null); }
  }

  const selected = recommendations.find((item) => item.eventId === selectedEventId);
  const targetSkill = selected && profile?.skills.find((skill) => skill.skillId === selected.targetSkillId);
  const projectedLevel = targetSkill && selected ? Math.min(5, targetSkill.currentLevel + selected.predictedGain) : null;
  const ready = Math.max(0, Math.min(100, profile?.readinessScore ?? 0));
  const completedSkills = profile?.skills.filter((skill) => skill.requiredLevel > 0 && skill.currentLevel >= skill.requiredLevel).length ?? 0;
  const gaps = profile?.skills.filter((skill) => skill.requiredLevel > skill.currentLevel) ?? [];
  const completedHistory = profile?.history.filter((item) => item.status.toLowerCase() === 'completed').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) ?? [];
  const incompleteData = profile?.dataStatus && (!profile.dataStatus.hasEmployeeSkills || !profile.dataStatus.hasTargetRequirements || !profile.dataStatus.hasEvents);

  return <AppShell role="EMPLOYEE">
    <header className="topbar"><div><div className="eyebrow">ЛИЧНЫЙ МАРШРУТ</div><h1 className="page-title">Моё развитие</h1><p className="muted text-sm">Понятный путь к следующему шагу в карьере.</p></div><details className="profile-switcher"><summary>Выбрать ID сотрудника</summary><div className="mt-3 flex gap-2"><input className="input w-32" aria-label="ID сотрудника" value={draftId} onChange={(event) => setDraftId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') chooseEmployee(); }}/><button className="btn-secondary" disabled={!draftId.trim() || busyEvent !== null} onClick={chooseEmployee}>Открыть</button></div></details></header>
    {notice && <div role="status" className="success-banner mb-5"><Check size={17}/>{notice}</div>}
    {actionError && <div role="alert" className="error-banner mb-5">{actionError} <button className="ml-2 underline" onClick={() => { setActionError(''); setReload((current) => current + 1); }}>Обновить данные</button></div>}
    {profileLoading ? <div role="status" className="space-y-4" aria-label="Загружаем профиль"><div className="skeleton h-56"/><div className="skeleton h-32"/></div> : profileError && !profile ? <div role="alert" className="error-banner">{profileError} <button className="ml-2 underline" onClick={() => setReload((current) => current + 1)}>Повторить</button></div> : profile && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
      <section className="card profile-hero p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-6"><div><div className="pill">ВАША ОТПРАВНАЯ ТОЧКА</div><h2 className="mt-4 text-2xl font-bold">Здравствуйте, {profile.name.split(' ')[0]}!</h2><p className="muted mt-1 text-sm">{profile.role} · {profile.id} · {profile.tenureMonths} мес. в команде</p><div className="mt-5 flex items-center gap-2 text-sm font-bold"><span className="grade-chip">{profile.currentGrade}</span><ArrowRight className="text-[#008a4d]" size={17}/><span className="grade-chip grade-chip-target">{profile.targetGrade}</span></div><p className="muted mt-3 text-sm">{gaps.length ? `Следующая цель — развить ${gaps.slice(0, 2).map((skill) => skill.skillName).join(' и ')}.` : 'Требования к навыкам выполнены. Обсудите следующий шаг с руководителем.'}</p></div><div className="readiness-meter"><div className="text-4xl font-bold tabular-nums">{ready}%</div><div className="muted mt-1 text-xs">готовность к {profile.targetGrade}</div><div className="progress-track mt-3"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${ready}%` }} transition={{ duration: .8 }}/></div><div className="muted mt-2 text-xs">{completedSkills} из {profile.skills.length} навыков на цели</div></div></div></section>
      {incompleteData && <div role="alert" className="error-banner mt-5">Для профиля {profile.id} не хватает данных: {!profile.dataStatus?.hasEmployeeSkills ? 'навыков сотрудника; ' : ''}{!profile.dataStatus?.hasTargetRequirements ? 'требований следующего грейда; ' : ''}{!profile.dataStatus?.hasEvents ? 'активностей; ' : ''}обратитесь к HR для загрузки полного набора.</div>}
      <section className="card mt-6 p-6 md:p-7" aria-labelledby="trajectory-title"><div className="flex items-start justify-between gap-3"><div><div className="eyebrow">КАРЬЕРНАЯ ТРАЕКТОРИЯ</div><h2 id="trajectory-title" className="section-title mt-1">От текущего грейда к следующему</h2></div><Target size={21} className="text-[#087d48]"/></div><div className="trajectory mt-6"><div className="trajectory-step"><span className="trajectory-number">01</span><div className="text-sm font-bold">Сейчас · {profile.currentGrade}</div><p className="muted mt-1 text-xs">Ваш опыт и текущие навыки</p></div><div className="trajectory-step"><span className="trajectory-number">02</span><div className="text-sm font-bold">Следующий шаг</div><p className="muted mt-1 text-xs">{selected ? selected.title : gaps.length ? `Навыки для развития: ${gaps.length}` : 'Выберите активность ниже'}</p></div><div className="trajectory-step"><span className="trajectory-number">03</span><div className="text-sm font-bold">Цель · {profile.targetGrade}</div><p className="muted mt-1 text-xs">Требования следующего грейда</p></div></div>{selected && <motion.div key={selected.eventId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="forecast-panel mt-5"><div className="flex items-center gap-2 text-sm font-bold text-[#087d48]"><Sparkles size={16}/> Прогноз после «{selected.title}»</div><p className="mt-2 text-sm">{targetSkill ? <>{targetSkill.skillName}: <strong>{targetSkill.currentLevel} → {projectedLevel}</strong> из {targetSkill.requiredLevel} для {profile.targetGrade}.</> : <>Активность развивает {selected.targetSkillName} на +{selected.predictedGain} ур. Данные навыка появятся после обновления профиля.</>}</p><p className="muted mt-1 text-xs">Это прогноз, фактический результат обновится после завершения активности.</p></motion.div>}</section>
      <section className="mt-7" aria-labelledby="recommendations-title"><div className="mb-4 flex items-center justify-between gap-4"><div><div className="eyebrow">С УЧЁТОМ ВАШЕГО ОПЫТА</div><h2 id="recommendations-title" className="section-title mt-1">Ваш следующий шаг</h2><p className="muted mt-1 text-sm">Выберите активность, чтобы увидеть её влияние на траекторию и навыки.</p></div><Sparkles size={22} className="shrink-0 text-[#087d48]"/></div>{recommendationsLoading ? <div role="status" className="card p-6"><LoaderCircle size={20} className="animate-spin text-[#087d48]"/><p className="muted mt-2 text-sm">Анализируем навыки, грейд и историю участия…</p></div> : recommendationsError ? <div role="alert" className="error-banner">{recommendationsError} <button className="ml-2 inline-flex items-center gap-1 underline" onClick={() => setReload((current) => current + 1)}><RotateCcw size={13}/> Повторить</button></div> : recommendations.length ? <div className="grid gap-4 lg:grid-cols-3">{recommendations.map((recommendation) => <RecommendationCard key={recommendation.eventId} recommendation={recommendation} selected={selectedEventId === recommendation.eventId} busy={busyEvent !== null} onSelect={() => setSelectedEventId(recommendation.eventId)} onComplete={completeEvent}/>)}</div> : <div className="card p-6"><CircleHelp size={22} className="text-[#087d48]"/><h3 className="mt-3 font-bold">Подходящих активностей пока нет</h3><p className="muted mt-1 text-sm">Все доступные активности уже пройдены или не подходят с учётом цели и истории. Обсудите другой формат развития с HR.</p></div>}</section>
      <div className="grid-main mt-7"><section className="card p-6"><div className="eyebrow">КАРТА НАВЫКОВ</div><h2 className="section-title mt-1">Сейчас → требуется</h2><p className="muted mt-1 text-xs">Зелёная часть — текущий уровень, светлая — прогноз выбранной активности.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{profile.skills.map((skill) => <SkillCard key={skill.skillId} skill={skill} selected={selected?.targetSkillId === skill.skillId} gain={selected?.targetSkillId === skill.skillId ? selected.predictedGain : 0}/>)}</div>{profile.skills.length === 0 && <p className="muted mt-4 text-sm">Навыки пока не загружены.</p>}</section><section className="card p-6"><div className="eyebrow">ИСТОРИЯ УЧАСТИЯ</div><h2 className="section-title mt-1">Завершённые активности</h2><div className="timeline mt-5">{completedHistory.map((item) => <div key={`${item.eventId}-${item.date}`} className="timeline-item"><div className="text-sm font-bold">{item.title}</div><div className="muted mt-1 text-xs">{new Date(item.date).toLocaleDateString('ru-RU')} · завершено</div></div>)}{completedHistory.length === 0 && <p className="muted text-sm">Завершённых активностей пока нет. Выберите первый шаг выше.</p>}</div></section></div>
      <ProgressRewards history={profile.history}/>
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#d8ecdf] bg-[#ecf8f0] p-5"><TrendingUp size={18} className="mt-1 shrink-0 text-[#087d48]"/><p className="text-xs leading-5 text-[#4f6c59]">Прогресс показывает долю выполненных требований. Он не является оценкой вашей работы; решение о повышении обсуждается с руководителем.</p></div>
    </motion.div>}
  </AppShell>;
}
