'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Lightbulb, LoaderCircle, Sparkles, Target, TrendingUp, UserRound } from 'lucide-react';
import type { AIRecommendation, SkillProgress } from '../../../types';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useCareerStore } from '@/lib/store';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function SkillCard({ skill }: { skill: SkillProgress }) {
  const percentage = skill.requiredLevel > 0 ? clamp(skill.currentLevel / skill.requiredLevel * 100) : 100;
  const complete = skill.currentLevel >= skill.requiredLevel;
  return <div className="rounded-xl border border-[#e7eee9] p-4 transition hover:border-[#bfe8cf] hover:shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-[14px]">{skill.skillName}</div><div className="mt-1 text-xs text-[#8a978e]">{skill.category === 'hard' ? 'Hard skill' : 'Soft skill'}</div></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${complete ? 'bg-[#e7f8ef] text-[#068149]' : 'bg-[#f1f4f1] text-[#58685d]'}`}>{complete ? 'Цель достигнута' : `${skill.currentLevel} / ${skill.requiredLevel}`}</span></div>
    <div className="mt-5 progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: .8, ease: 'easeOut' }} /></div>
    <div className="mt-2 flex justify-between text-[11px] text-[#829087]"><span>Текущий уровень {skill.currentLevel}</span><span>Цель {skill.requiredLevel}</span></div>
  </div>;
}

function RecommendationCard({ recommendation, busy, onComplete }: { recommendation: AIRecommendation; busy: boolean; onComplete: (eventId: string) => void }) {
  return <article className="card overflow-hidden">
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf8f0] text-[#00a859]"><BookOpen size={21}/></div><span className="pill">#{recommendation.priority} приоритет</span></div>
      <h3 className="mt-4 text-[16px] font-extrabold leading-6">{recommendation.title}</h3><p className="mt-2 text-xs text-[#78867c]">Развивает: <span className="font-bold text-[#3b5c49]">{recommendation.targetSkillName}</span> · прогноз +{recommendation.predictedGain} ур.</p>
      <div className="mt-5 rounded-xl border border-[#dcefe3] bg-[#f5fbf7] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#18784b]"><Sparkles size={15}/> Почему это рекомендовано</div><p className="mt-2 text-[13px] leading-[1.65] text-[#536b5a]">{recommendation.reason}</p></div>
      <button className="btn-primary mt-5 w-full" onClick={() => onComplete(recommendation.eventId)} disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {busy ? 'Обновляем прогресс...' : 'Выполнить активность'}</button>
    </div>
  </article>;
}

export default function EmployeePage() {
  const profile = useCareerStore((state) => state.profile);
  const recommendations = useCareerStore((state) => state.recommendations);
  const setProfile = useCareerStore((state) => state.setProfile);
  const setRecommendations = useCareerStore((state) => state.setRecommendations);
  const updateProgress = useCareerStore((state) => state.updateProgress);
  const [employeeId, setEmployeeId] = useState('E0028');
  const [draftId, setDraftId] = useState('E0028');
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('id') || window.localStorage.getItem('careerQuestEmployeeId') || 'E0028';
      setEmployeeId(id);
      setDraftId(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(''); setNotice('');
      try {
        const [nextProfile, nextRecommendations] = await Promise.all([api.profile(employeeId), api.recommendations(employeeId)]);
        if (!cancelled) { setProfile(nextProfile); setRecommendations(nextRecommendations); }
      } catch (cause) { if (!cancelled) { setProfile(null); setRecommendations([]); setError(cause instanceof Error ? cause.message : 'Не удалось загрузить профиль'); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [employeeId, setProfile, setRecommendations]);

  function chooseEmployee() {
    const id = draftId.trim();
    if (!id || id === employeeId) return;
    window.localStorage.setItem('careerQuestEmployeeId', id);
    window.history.replaceState(null, '', `/employee?id=${encodeURIComponent(id)}`);
    setEmployeeId(id);
  }

  async function complete(eventId: string) {
    setBusyEvent(eventId); setError(''); setNotice('');
    try {
      const result = await api.complete({ employeeId, eventId });
      if (!result.success) throw new Error('Активность не удалось завершить');
      updateProgress(result.updatedSkills, result.newReadinessScore);
      setNotice('Активность выполнена. Прогресс обновлён.');
      const fresh = await api.recommendations(employeeId);
      setRecommendations(fresh);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обновить прогресс'); }
    finally { setBusyEvent(null); }
  }

  const hard = profile?.skills.filter((skill) => skill.category === 'hard') || [];
  const soft = profile?.skills.filter((skill) => skill.category === 'soft') || [];
  const completed = profile?.skills.filter((skill) => skill.currentLevel >= skill.requiredLevel).length || 0;
  const ready = clamp(profile?.readinessScore || 0);

  return <AppShell>
    <header className="topbar"><div><div className="eyebrow">КАРЬЕРНЫЙ МАРШРУТ</div><h1 className="page-title">Мой прогресс</h1><p className="muted text-sm">Ваш путь от текущих навыков к следующему грейду.</p></div><div className="flex items-end gap-2"><label className="text-xs font-bold text-[#718078]">ID сотрудника<input aria-label="ID сотрудника" className="input mt-1 w-[125px]" value={draftId} onChange={(event) => setDraftId(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') chooseEmployee(); }}/></label><button className="btn-secondary mb-[1px] h-[43px]" onClick={chooseEmployee}>Открыть <ArrowRight size={14}/></button></div></header>
    {error && <div role="alert" className="error-banner mb-5">{error}</div>}
    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#c7ebd6] bg-[#edf9f1] px-4 py-3 text-sm font-semibold text-[#087d48]"><Check size={16}/>{notice}</div>}
    {loading ? <div className="space-y-5"><div className="skeleton h-56"/><div className="grid-main"><div className="skeleton h-96"/><div className="skeleton h-96"/></div></div> : !profile ? <div className="card p-10 text-center"><CircleHelp className="mx-auto text-[#00a859]" size={32}/><h2 className="mt-4 text-lg font-bold">Профиль не найден</h2><p className="muted mt-2 text-sm">Проверьте ID сотрудника или загрузите датасет в разделе HR.</p></div> : <>
      <div className="card relative overflow-hidden p-6 md:p-8"><div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#e5f8ed] blur-3xl"/><div className="relative grid gap-8 md:grid-cols-[1fr_250px] md:items-center"><div><div className="pill"><UserRound size={13}/> ПРОФИЛЬ СОТРУДНИКА</div><h2 className="mt-5 text-[27px] font-extrabold tracking-tight">{profile.name}</h2><p className="mt-1 text-sm text-[#65756a]">{profile.role}</p><div className="mt-6 flex flex-wrap gap-3"><span className="rounded-lg bg-[#f2f5f2] px-3 py-2 text-xs font-bold text-[#485b4e]">{profile.currentGrade} <ArrowRight className="inline mx-1 text-[#00a859]" size={13}/> {profile.targetGrade}</span><span className="rounded-lg bg-[#f2f5f2] px-3 py-2 text-xs font-bold text-[#485b4e]"><Clock3 className="mr-1 inline" size={13}/> {profile.tenureMonths} мес. в компании</span></div><div className="mt-7 flex items-center gap-3 text-sm text-[#427957]"><TrendingUp size={17}/><span><b>{completed}</b> из {profile.skills.length} навыков на целевом уровне</span></div></div><div className="flex flex-col items-center rounded-2xl border border-[#e5eee8] bg-white/80 p-5"><div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#00a859 ${ready}%, #e7eee9 0)` }}><div className="grid h-[114px] w-[114px] place-items-center rounded-full bg-white"><div className="text-center"><motion.div key={ready} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[35px] font-extrabold tracking-tight">{ready}%</motion.div><div className="-mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7e8c80]">готовность</div></div></div></div><div className="mt-3 text-center text-xs text-[#738275]">к грейду {profile.targetGrade}</div></div></div></div>
      <div className="grid-main mt-6"><section className="card p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">КАРТА НАВЫКОВ</div><h2 className="section-title mt-1">Разрыв до следующего уровня</h2></div><div className="hidden rounded-xl bg-[#eaf8f0] p-3 text-[#00a859] sm:block"><Target size={21}/></div></div><div className="mt-6 space-y-7">{hard.length > 0 && <div><div className="mb-3 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#67786d]"><span>Профессиональные навыки</span><span>{hard.length}</span></div><div className="grid gap-3 sm:grid-cols-2">{hard.map((skill) => <SkillCard key={skill.skillId} skill={skill}/>)}</div></div>}{soft.length > 0 && <div><div className="mb-3 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#67786d]"><span>Гибкие навыки</span><span>{soft.length}</span></div><div className="grid gap-3 sm:grid-cols-2">{soft.map((skill) => <SkillCard key={skill.skillId} skill={skill}/>)}</div></div>}{profile.skills.length === 0 && <p className="muted text-sm">Навыки пока не загружены.</p>}</div></section><section><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow">ПОДСКАЗКИ AI</div><h2 className="section-title mt-1">Следующий шаг</h2></div><Sparkles size={20} className="text-[#00a859]"/></div><div className="space-y-4">{recommendations.length > 0 ? recommendations.map((recommendation) => <RecommendationCard key={recommendation.eventId} recommendation={recommendation} busy={busyEvent !== null} onComplete={complete}/>) : <div className="card p-7 text-center"><Award className="mx-auto text-[#00a859]" size={30}/><h3 className="mt-3 font-bold">Новых рекомендаций нет</h3><p className="muted mt-2 text-sm">Продолжайте развиваться — рекомендации появятся здесь.</p></div>}</div></section></div>
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#d8ecdf] bg-[#ecf8f0] p-5"><div className="rounded-lg bg-white p-2 text-[#00a859]"><Lightbulb size={18}/></div><div><div className="text-sm font-bold text-[#246943]">Каждый шаг приближает к цели</div><p className="mt-1 text-xs leading-5 text-[#5b7c66]">Отмечайте завершённые активности, чтобы видеть, как растёт готовность к новому грейду.</p></div><ChevronRight size={18} className="ml-auto shrink-0 text-[#75a987]"/></div>
    </>}
  </AppShell>;
}
