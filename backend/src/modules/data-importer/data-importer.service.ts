import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity, ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';

type InputRecord = Record<string, unknown>;
export interface DatasetInput { employees?: unknown[]; events?: unknown[]; skills?: unknown[]; history?: unknown[] }

function record(value: unknown, label: string): InputRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new BadRequestException(`${label}: expected object`);
  return value as InputRecord;
}
function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label}: expected non-empty string`);
  return value.trim();
}
function numberValue(value: unknown, label: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new BadRequestException(`${label}: expected integer from ${minimum} to ${maximum}`);
  return parsed;
}
function optionalString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function parseCsv(csv: string): InputRecord[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const input = csv.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(field); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index++;
      row.push(field); if (row.some((value) => value.trim())) rows.push(row);
      row = []; field = '';
    } else field += character;
  }
  if (quoted) throw new BadRequestException('CSV has an unclosed quote');
  row.push(field); if (row.some((value) => value.trim())) rows.push(row);
  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  for (const required of ['employee_id', 'event_id', 'status']) if (!headers.includes(required)) throw new BadRequestException(`CSV missing ${required}`);
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new BadRequestException(`CSV row ${index + 2} has wrong column count`);
    return Object.fromEntries(headers.map((header, position) => [header, values[position].trim()]));
  });
}

@Injectable()
export class DataImporterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataImporterService.name);
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    const [employees, events, requirements] = await Promise.all([
      this.dataSource.getRepository(EmployeeEntity).count(),
      this.dataSource.getRepository(EventEntity).count(),
      this.dataSource.getRepository(SkillRequirementEntity).count(),
    ]);
    if (employees || events || requirements) return;
    try {
      await this.importFromFiles();
      this.logger.log('Demo dataset loaded into empty Career Quest storage');
    } catch (error) {
      this.logger.warn(`Automatic import skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async importFromFiles() {
    const directory = resolve(process.env.DATA_DIR || 'data');
    let employees: unknown[], events: unknown[], skills: unknown[], history: InputRecord[];
    try {
      const contents = await Promise.all(['employees.json', 'events.json', 'skills.json', 'activity_history.csv'].map((name) => readFile(resolve(directory, name), 'utf8')));
      employees = JSON.parse(contents[0]) as unknown[];
      events = JSON.parse(contents[1]) as unknown[];
      skills = JSON.parse(contents[2]) as unknown[];
      history = parseCsv(contents[3]);
    } catch (error) { throw new BadRequestException(`Cannot read dataset from ${directory}: ${error instanceof Error ? error.message : String(error)}`); }
    return this.importDataset({ employees, events, skills, history }, true);
  }

  async importDataset(input: DatasetInput, replaceExisting = false) {
    for (const [name, values] of Object.entries(input)) if (values !== undefined && !Array.isArray(values)) throw new BadRequestException(`${name} must be an array`);
    const employees = (input.employees ?? []).map((value, index) => {
      const source = record(value, `employees[${index}]`);
      const rawSkills = record(source.skills ?? {}, `employees[${index}].skills`);
      const skills: Record<string, number> = {};
      for (const [skillId, level] of Object.entries(rawSkills)) skills[skillId] = numberValue(level, `${skillId} level`, 0, 5);
      const currentGrade = stringValue(source.currentGrade ?? source.grade, 'currentGrade');
      const nextGrade = currentGrade.toLowerCase() === 'junior' ? 'Middle' : currentGrade.toLowerCase() === 'middle' ? 'Senior' : currentGrade;
      return { id: stringValue(source.employee_id ?? source.id, 'employee id'), name: optionalString(source.name) ?? stringValue(source.employee_id ?? source.id, 'employee id'), role: stringValue(source.role, 'role'), currentGrade, targetGrade: optionalString(source.targetGrade ?? source.target_grade) ?? nextGrade, tenureMonths: numberValue(source.tenureMonths ?? source.tenure_months ?? 0, 'tenureMonths', 0, 1200), skills };
    });
    const events = (input.events ?? []).map((value, index) => {
      const source = record(value, `events[${index}]`);
      const developed = Array.isArray(source.skills_developed) ? source.skills_developed[0] : undefined;
      const development = developed === undefined ? {} : record(developed, 'skills_developed[0]');
      const rawAudience = source.audience ?? source.targetAudience ?? source.target_audience ?? [];
      if (!Array.isArray(rawAudience)) throw new BadRequestException('event audience must be an array');
      return { id: stringValue(source.id ?? source.event_id, 'event id'), title: stringValue(source.title, 'event title'), targetSkillId: stringValue(source.targetSkillId ?? source.target_skill_id ?? development.skill_id ?? development.skillId, 'targetSkillId'), gain: numberValue(source.gain ?? development.gain, 'gain', 1, 5), maxLevel: numberValue(source.maxLevel ?? source.max_level ?? development.max_level ?? development.maxLevel ?? 5, 'maxLevel', 1, 5), audience: rawAudience.map((item) => stringValue(item, 'audience item')), type: optionalString(source.type) ?? 'activity' };
    });
    const skills = (input.skills ?? []).map((value, index) => {
      const source = record(value, `skills[${index}]`);
      return { skillId: stringValue(source.skillId ?? source.skill_id ?? source.id, 'skill id'), name: stringValue(source.name, 'skill name'), category: optionalString(source.category) ?? 'hard', requirementsByGrade: record(source.requirementsByGrade ?? source.requirements_by_grade ?? source.grade_requirements ?? source.requirements ?? source.levels ?? {}, 'requirements') };
    });
    return this.dataSource.transaction(async (manager) => {
      const employeeRepository = manager.getRepository(EmployeeEntity);
      const eventRepository = manager.getRepository(EventEntity);
      const skillRepository = manager.getRepository(SkillRequirementEntity);
      const historyRepository = manager.getRepository(ActivityHistoryEntity);
      if (replaceExisting) {
        await historyRepository.clear(); await employeeRepository.clear(); await eventRepository.clear(); await skillRepository.clear();
      }
      if (skills.length) await skillRepository.save(skills);
      if (events.length) await eventRepository.save(events);
      if (employees.length) await employeeRepository.save(employees);
      const [knownEmployees, knownEvents] = await Promise.all([employeeRepository.find({ select: ['id'] }), eventRepository.find({ select: ['id', 'targetSkillId'] })]);
      const employeeIds = new Set(knownEmployees.map((employee) => employee.id));
      const eventById = new Map(knownEvents.map((event) => [event.id, event]));
      const history = (input.history ?? []).map((value, index) => {
        const source = record(value, `history[${index}]`);
        const employeeId = stringValue(source.employeeId ?? source.employee_id, 'history employeeId');
        const eventId = stringValue(source.eventId ?? source.event_id, 'history eventId');
        const event = eventById.get(eventId);
        if (!employeeIds.has(employeeId) || !event) throw new BadRequestException(`history[${index}] refers to unknown employee or event`);
        const rawStatus = stringValue(source.status, 'history status').toUpperCase();
        const status = rawStatus === 'SKIPPED' ? ActivityHistoryStatus.MISSED : rawStatus as ActivityHistoryStatus;
        if (!Object.values(ActivityHistoryStatus).includes(status)) throw new BadRequestException(`history[${index}] has invalid status`);
        const date = source.date ? new Date(stringValue(source.date, 'history date')) : new Date();
        if (Number.isNaN(date.getTime())) throw new BadRequestException(`history[${index}] has invalid date`);
        return historyRepository.create({ employeeId, eventId, skillId: optionalString(source.skillId ?? source.skill_id) ?? event.targetSkillId, status, date });
      });
      if (replaceExisting) { if (history.length) await historyRepository.save(history); }
      else {
        const existing = await historyRepository.find();
        const key = (entry: ActivityHistoryEntity) => `${entry.employeeId}|${entry.eventId}|${entry.skillId}|${entry.status}|${entry.date.toISOString()}`;
        const known = new Set(existing.map(key));
        const additions = history.filter((entry) => { const identifier = key(entry); if (known.has(identifier)) return false; known.add(identifier); return true; });
        if (additions.length) await historyRepository.save(additions);
      }
      this.logger.log(`Imported employees=${employees.length} events=${events.length} skills=${skills.length} history=${history.length} replace=${replaceExisting}`);
      return { success: true, message: 'Dataset imported', counts: { employees: employees.length, events: events.length, skills: skills.length, history: history.length } };
    });
  }
}
