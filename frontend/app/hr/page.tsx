'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Check, CircleAlert, CloudUpload, FileJson2, Filter, LoaderCircle, Search, UploadCloud, Users, X } from 'lucide-react';
import type { AIRecommendation, HrAnalytics, HrEmployeeSummary } from '../../../backend/types';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { getDemoRole, useDemoRole } from '@/lib/demo-role';

type FilterValue = 'all' | 'risk' | 'none';
type DatasetKey = 'employees' | 'events' | 'skills' | 'history';
type Datasets = Partial<Record<DatasetKey, unknown[]>>;
type HrEmployeeWithDepartment = HrEmployeeSummary & { department?: string };

function explainImportError(cause: unknown, files: Datasets): string {
  const message = cause instanceof Error ? cause.message : 'Не удалось загрузить датасет';
  const match = /history\[(\d+)\] refers to unknown employee or event/.exec(message);
  if (!match) return message;
  const index = Number(match[1]);
  const row = files.history?.[index];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return message;
  const values = row as Record<string, unknown>;
  return `Строка CSV ${index + 2}: сотрудник ${String(values.employee_id ?? values.employeeId ?? '—')} или активность ${String(values.event_id ?? values.eventId ?? '—')} не найдены. Добавьте соответствующие записи в employees.json и events.json.`;
}

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const input = content.replace(/^\uFEFF/, '');
  const delimiter = input.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV содержит незакрытую кавычку');
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  const headers = (rows.shift() || []).map((value) => value.trim());
  if (!['employee_id', 'event_id', 'status'].every((key) => headers.includes(key))) {
    throw new Error('CSV должен содержать столбцы employee_id, event_id и status');
  }
  if (new Set(headers).size !== headers.length) throw new Error('CSV содержит повторяющиеся названия столбцов');
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Строка CSV ${index + 2}: неверное число столбцов`);
    const result = Object.fromEntries(headers.map((key, position) => [key, values[position].trim()]));
    if (!result.employee_id || !result.event_id || !result.status) throw new Error(`Строка CSV ${index + 2}: нужны employee_id, event_id и status`);
    return result;
  });
}

function DatasetUploader({ onClose, onSuccess }: { onClose: () => void; onSuccess: (employeeIds: string[]) => void }) {
  const [files, setFiles] = useState<Datasets>({});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const receiveFiles = useCallback(async (incoming: FileList | File[]) => {
    setError('');
    const next: Datasets = {};
    try {
      for (const file of Array.from(incoming)) {
        const name = file.name.toLowerCase();
        const key = (['employees', 'events', 'skills', 'history'] as DatasetKey[]).find((part) => name.includes(part));
        if (!key || !(name.endsWith('.json') || (key === 'history' && name.endsWith('.csv')))) throw new Error(`Нужен JSON-файл или activity_history.csv: ${file.name}`);
        const parsed: unknown = name.endsWith('.csv') ? parseCsv(await file.text()) : JSON.parse(await file.text());
        const data = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[key] : null;
        if (!Array.isArray(data)) throw new Error(`Файл ${file.name} должен содержать JSON-массив`);
        next[key] = data;
      }
      setFiles((current) => ({ ...current, ...next }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось прочитать файлы'); }
  }, []);
  const hasData = Object.values(files).some((items) => items.length > 0);
  async function submit() {
    if (!hasData) return;
    setBusy(true); setError('');
    try {
      await api.importDataset({ employees: files.employees || [], events: files.events || [], skills: files.skills || [], history: files.history || [] });
      const identifiers = [...(files.history || []), ...(files.employees || [])].flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const row = item as Record<string, unknown>;
        const id = row.employee_id ?? row.employeeId ?? row.id;
        return typeof id === 'string' && id.trim() ? [id.trim()] : [];
      });
      onSuccess([...new Set(identifiers)]); onClose();
    } catch (cause) { setError(explainImportError(cause, files)); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c2419]/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="upload-title" className="card w-full max-w-[540px] p-6 md:p-8"><div className="flex items-start justify-between"><div><div className="eyebrow">ДАННЫЕ КОМАНДЫ</div><h2 id="upload-title" className="mt-1 text-2xl font-extrabold tracking-tight">Добавить данные</h2><p className="muted mt-2 text-sm">Добавьте профили, активности или историю участия. Файлы можно загружать по отдельности.</p></div><button aria-label="Закрыть" className="rounded-lg p-2 hover:bg-[#f2f5f2]" onClick={onClose}><X size={19}/></button></div>
    <div className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-[#00a859] bg-[#effaf3]' : 'border-[#cbded2] bg-[#f8fbf9]'}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void receiveFiles(event.dataTransfer.files); }}><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e5f6eb] text-[#00a859]"><CloudUpload size={24}/></div><p className="mt-4 text-sm font-bold">Перетащите JSON и activity_history.csv сюда</p><p className="muted mt-1 text-xs">или выберите файлы с компьютера</p><label className="btn-secondary mt-4 cursor-pointer">Выбрать файлы<input className="sr-only" type="file" accept=".json,.csv,application/json,text/csv" multiple onChange={(event) => { if (event.target.files) void receiveFiles(event.target.files); event.target.value = ''; }}/></label></div>
    <div className="mt-5 grid grid-cols-2 gap-2">{(['employees', 'events', 'skills', 'history'] as DatasetKey[]).map((key) => <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${files[key] ? 'bg-[#eaf8f0] text-[#087c47]' : 'bg-[#f3f5f3] text-[#809087]'}`}>{files[key] ? <Check size={14}/> : <FileJson2 size={14}/>} {key === 'history' ? 'activity_history.csv' : `${key}.json`} <span className="ml-auto">{files[key]?.length ?? 'опц.'}</span></div>)}</div>
    <p className="muted mt-4 text-xs leading-5">Можно загрузить один файл: например, activity_history.csv к уже существующим сотрудникам и событиям. Для первой загрузки добавьте также профили, навыки и активности.</p>
    {error && <div role="alert" className="error-banner mt-4">{error}</div>}
    <div className="mt-6 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Отмена</button><button className="btn-primary" disabled={!hasData || busy} onClick={() => void submit()}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <UploadCloud size={16}/>} Загрузить данные</button></div>
  </div></div>;
}

function ImportedRecommendations({ ids, selectedId, onSelect, items, loading, error }: { ids: string[]; selectedId: string; onSelect: (id: string) => void; items: AIRecommendation[]; loading: boolean; error: string }) {
  if (!ids.length) return null;
  return <section className="card mb-6 p-6" aria-labelledby="imported-recommendations-title">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">ПОСЛЕ ЗАГРУЗКИ CSV</div><h2 id="imported-recommendations-title" className="section-title mt-1">AI-рекомендации сотруднику</h2><p className="muted mt-2 text-sm">Выберите сотрудника из файла. Рекомендации учитывают загруженную историю.</p></div><label className="text-xs font-bold">Сотрудник<select className="input mt-2 block min-w-36" value={selectedId} onChange={(event) => onSelect(event.target.value)}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label></div>
    {loading ? <p role="status" className="muted mt-5 flex items-center gap-2 text-sm"><LoaderCircle size={16} className="animate-spin"/> Запрашиваем AI-рекомендации…</p> : error ? <p role="alert" className="error-banner mt-5">{error}</p> : items.length ? <div className="mt-5 grid gap-4 lg:grid-cols-3">{items.map((recommendation) => <article key={recommendation.eventId} className="rounded-xl border border-[#dcefe3] bg-[#f5fbf7] p-5"><div className="pill">Приоритет {recommendation.priority}</div><h3 className="mt-3 text-lg font-extrabold">{recommendation.title}</h3><p className="muted mt-1 text-xs">{recommendation.targetSkillName} ({recommendation.targetSkillId}) · прогноз +{recommendation.predictedGain} ур.</p><p className="mt-4 text-sm leading-6">{recommendation.reason}</p><div className="muted mt-3 text-xs">Событие: {recommendation.eventId}</div></article>)}</div> : <p className="muted mt-5 text-sm">Для этого сотрудника нет подходящих рекомендаций. Проверьте навыки, требования грейда и события.</p>}
    <Link href={`/hr/employees/${encodeURIComponent(selectedId)}`} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#008c4b]">Открыть профиль сотрудника <ArrowRight size={15}/></Link>
  </section>;
}

export default function HrPage() {
  const role = useDemoRole();
  const [analytics, setAnalytics] = useState<HrAnalytics | null>(null);
  const [employees, setEmployees] = useState<HrEmployeeWithDepartment[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [importVersion, setImportVersion] = useState(0);

  const load = useCallback(async () => {
    if (getDemoRole() !== 'hr') return;
    setLoading(true); setError('');
    try { const [nextAnalytics, nextEmployees] = await Promise.all([api.analytics(), api.employees()]); setAnalytics(nextAnalytics); setEmployees(nextEmployees); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить аналитику'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, role]);
  useEffect(() => {
    if (!selectedId || role !== 'hr') return;
    let active = true;
    const timer = window.setTimeout(() => {
      setRecommendationsLoading(true);
      setRecommendations([]);
      setRecommendationsError('');
      api.recommendations(selectedId).then((items) => { if (active) setRecommendations(items.sort((a, b) => a.priority - b.priority)); })
        .catch((cause: unknown) => { if (active) setRecommendationsError(cause instanceof Error ? cause.message : 'Не удалось получить рекомендации'); })
        .finally(() => { if (active) setRecommendationsLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selectedId, role, importVersion]);
  const atRisk = employees.filter((employee) => employee.readinessScore < 60).length;
  const withoutRecommendations = employees.filter((employee) => !employee.hasRecommendations).length;
  const roles = useMemo(() => [...new Set(employees.map((employee) => employee.role))].sort(), [employees]);
  const grades = useMemo(() => [...new Set(employees.map((employee) => employee.currentGrade))].sort(), [employees]);
  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department?.trim() || 'Не указано'))].sort(), [employees]);
  const visible = useMemo(() => employees.filter((employee) =>
    (filter === 'all' || (filter === 'risk' ? employee.readinessScore < 60 : !employee.hasRecommendations)) &&
    (!roleFilter || employee.role === roleFilter) &&
    (!gradeFilter || employee.currentGrade === gradeFilter) &&
    (!departmentFilter || (employee.department?.trim() || 'Не указано') === departmentFilter) &&
    `${employee.name} ${employee.role} ${employee.id}`.toLowerCase().includes(query.toLowerCase())
  ), [employees, filter, roleFilter, gradeFilter, departmentFilter, query]);
  const maxGap = Math.max(1, ...(analytics?.laggingSkills.map((skill) => skill.totalGap) || []));

  return <AppShell role="HR"><header className="topbar"><div><div className="eyebrow">ОБЗОР КОМАНДЫ</div><h1 className="page-title">Развитие команды</h1><p className="muted text-sm">Кому нужна поддержка и какое обучение будет полезно.</p></div><button className="btn-primary" onClick={() => setShowUpload(true)}><UploadCloud size={17}/> Добавить данные</button></header>
    {error && <div role="alert" className="error-banner mb-5 flex flex-wrap items-center justify-between gap-3"><span>Не удалось обновить обзор команды. Попробуйте ещё раз через несколько секунд.</span><button className="btn-secondary" disabled={loading} onClick={() => void load()}>Попробовать ещё раз</button></div>}{notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#c7ebd6] bg-[#edf9f1] px-4 py-3 text-sm font-semibold text-[#087d48]"><Check size={16}/>{notice}</div>}
    <ImportedRecommendations ids={importedIds} selectedId={selectedId} onSelect={setSelectedId} items={recommendations} loading={recommendationsLoading} error={recommendationsError}/>
    <div className="grid gap-4 sm:grid-cols-3"><div className="card p-5"><div className="flex justify-between"><span className="text-xs font-bold text-[#7b8b80]">В команде</span><Users size={17} className="text-[#00a859]"/></div><div className="metric mt-4">{loading || !analytics ? '—' : employees.length}</div><p className="muted mt-2 text-xs">сотрудников в загруженных данных</p></div><div className="card p-5"><div className="flex justify-between"><span className="text-xs font-bold text-[#7b8b80]">Нужна поддержка</span><CircleAlert size={17} className="text-[#df8b35]"/></div><div className="metric mt-4">{loading || !analytics ? '—' : atRisk}</div><p className="muted mt-2 text-xs">выполнено менее 60% требований к навыкам</p></div><div className="card p-5"><div className="flex justify-between"><span className="text-xs font-bold text-[#7b8b80]">Нет подходящих активностей</span><BarChart3 size={17} className="text-[#718e79]"/></div><div className="metric mt-4">{loading || !analytics ? '—' : withoutRecommendations}</div><p className="muted mt-2 text-xs">стоит обсудить варианты развития</p></div></div>
    <div className="grid-main mt-6"><section className="card p-6"><div className="flex justify-between gap-3"><div><div className="eyebrow">ЧЕМ ПОМОЧЬ КОМАНДЕ</div><h2 className="section-title mt-1">Где пригодится обучение</h2></div><BarChart3 size={20} className="text-[#00a859]"/></div><p className="muted mt-2 text-xs">Суммарный разрыв до следующего грейда по каждому навыку</p><div className="mt-7 space-y-5">{analytics?.laggingSkills.length ? analytics.laggingSkills.slice(0, 5).map((skill, index) => <div key={skill.skillId}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="font-bold">{skill.skillName}</span><span className="font-extrabold text-[#188d51]">{skill.totalGap} ур. · {skill.affectedEmployees} чел.</span></div><div className="progress-track h-[11px]"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${skill.totalGap / maxGap * 100}%` }} transition={{ duration: .8, delay: index * .07 }}/></div></div>) : <div className="rounded-xl bg-[#f6f8f6] p-6 text-center text-sm text-[#7d8b80]">{loading ? 'Загружаем аналитику...' : 'Пока нет данных о навыках, которым нужно уделить внимание.'}</div>}</div></section><div className="card flex flex-col justify-between overflow-hidden"><div className="p-6"><div className="eyebrow">ФОКУС КОМАНДЫ</div><h2 className="section-title mt-1">С кем обсудить следующий шаг</h2><p className="muted mt-3 text-sm leading-6">Готовность к грейду — не оценка работы. Обсудите цели, нагрузку и подходящий формат обучения.</p><div className="mt-6 space-y-3">{(analytics?.employeesAtRisk || []).filter((employee) => employee.readinessScore < 60).slice(0, 3).map((employee) => <Link href={`/hr/employees/${encodeURIComponent(employee.id)}`} key={employee.id} className="flex items-center gap-3 rounded-xl border border-[#e8eee9] p-3 transition hover:bg-[#f1f7f3]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eff5f0] text-xs font-extrabold text-[#317651]">{employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{employee.name}</div><div className="truncate text-[11px] text-[#849286]">{employee.role}</div></div><span className="text-sm font-extrabold text-[#df8b35]">{employee.readinessScore}%</span></Link>)}</div></div><div className="flex items-center gap-2 border-t border-[#eaf0ec] bg-[#f6faf7] px-6 py-4 text-xs font-bold text-[#258652]"><Filter size={15}/> Начните с разговора о целях, а не с процентов</div></div></div>
    <section className="card mt-6 p-6"><div className="eyebrow">НУЖЕН ДРУГОЙ ФОРМАТ РАЗВИТИЯ</div><h2 className="section-title mt-1">Сотрудники без рекомендованного шага</h2><p className="muted mt-2 text-sm">Для них текущий каталог не дал подходящего события с учётом требований и истории участия.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{analytics?.withoutRecommendations.map((employee) => <Link key={employee.id} href={`/hr/employees/${encodeURIComponent(employee.id)}`} className="flex items-center justify-between rounded-xl border border-[#e7eee9] p-3 text-sm font-bold hover:bg-[#f6faf7]"><span>{employee.name} <span className="muted text-xs">{employee.id}</span></span><ArrowRight size={15}/></Link>)}{!loading && analytics?.withoutRecommendations.length === 0 && <p className="muted text-sm">У всех сотрудников есть подходящий следующий шаг.</p>}</div></section>
    <section className="card mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><div className="eyebrow">СПИСОК СОТРУДНИКОВ</div><h2 className="section-title mt-1">Команда</h2></div><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a988d]"/><input className="input w-[220px] pl-9 text-sm" aria-label="Поиск сотрудников" placeholder="Имя, роль или ID" value={query} onChange={(event) => setQuery(event.target.value)}/></div></div>
      <div className="flex flex-wrap gap-3 border-t border-[#e8eee9] bg-[#f8fbf8] px-6 py-4">
        <label className="text-xs font-bold">Статус<select className="input mt-1 block min-w-44 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as FilterValue)}><option value="all">Вся команда</option><option value="risk">Нужна поддержка</option><option value="none">Нет подходящего шага</option></select></label>
        <label className="text-xs font-bold">Роль<select className="input mt-1 block min-w-44 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Все роли</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="text-xs font-bold">Грейд<select className="input mt-1 block min-w-36 text-sm" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option value="">Все грейды</option>{grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
        <label className="text-xs font-bold">Подразделение<select className="input mt-1 block min-w-44 text-sm" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="">Все подразделения</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-y border-[#e8eee9] bg-[#f8faf8] text-[11px] font-extrabold uppercase tracking-[.11em] text-[#849185]"><tr><th className="px-6 py-3">Сотрудник</th><th className="px-6 py-3">Роль и грейд</th><th className="px-6 py-3">Готовность</th><th className="px-6 py-3">Статус</th><th className="px-6 py-3"/></tr></thead><tbody>{visible.map((employee) => <tr key={employee.id} className="border-b border-[#edf1ee] transition hover:bg-[#f9fbf9]"><td className="px-6 py-4"><div className="text-sm font-bold">{employee.name}</div><div className="mt-1 text-[11px] text-[#8c988e]">{employee.id}</div></td><td className="px-6 py-4"><div className="text-xs font-semibold">{employee.role}</div><div className="mt-1 text-[11px] text-[#89958a]">{employee.currentGrade} → {employee.targetGrade}</div></td><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="progress-track w-20" role="img" aria-label={`Готовность ${employee.readinessScore}%`}><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, employee.readinessScore))}%` }}/></div><span className="text-xs font-extrabold">{employee.readinessScore}%</span></div></td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${!employee.hasRecommendations || employee.readinessScore < 60 ? 'bg-[#fff2e5] text-[#b76821]' : 'bg-[#eaf8f0] text-[#0b8450]'}`}>{!employee.hasRecommendations ? 'Нет рекомендованного шага' : employee.readinessScore < 60 ? 'Нужна поддержка' : 'На пути к цели'}</span></td><td className="px-6 py-4"><Link href={`/hr/employees/${encodeURIComponent(employee.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#008c4b] hover:underline">Профиль HR <ArrowRight size={13}/></Link></td></tr>)}</tbody></table>{!loading && visible.length === 0 && <div className="p-10 text-center text-sm text-[#849187]">Никого не нашли. Измените поиск или фильтры.</div>}{loading && <div className="p-10 text-center text-sm text-[#849187]">Загружаем сотрудников...</div>}</div><div className="border-t border-[#edf1ee] px-6 py-4 text-xs text-[#829084]">Показано: {visible.length} из {employees.length}</div>
    </section>
    <section className="card mt-6 p-6"><div className="eyebrow">УЧАСТИЕ</div><h2 className="section-title mt-1">Активности команды</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{analytics?.participationByActivity.map((item) => <div key={item.eventId} className="rounded-xl border border-[#e7eee9] p-3"><div className="text-sm font-bold">{item.title}</div><div className="muted mt-1 text-xs">Завершено: {item.completed} · Пропущено: {item.skipped} · Отказов: {item.refused}</div></div>)}</div></section>
    {showUpload && <DatasetUploader onClose={() => setShowUpload(false)} onSuccess={(ids) => { setImportedIds(ids); setSelectedId(ids[0] || ''); setImportVersion((value) => value + 1); setNotice(ids.length ? 'Данные добавлены. Запрашиваем рекомендации для сотрудников из файла.' : 'Данные добавлены. Выберите сотрудника из списка, чтобы посмотреть рекомендации.'); void load(); }}/>}</AppShell>;
}
