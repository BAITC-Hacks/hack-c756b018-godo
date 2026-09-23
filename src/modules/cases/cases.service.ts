import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { appConfig } from '../../config/app.config';
import type {
  AiAttachment,
  ClarifyingQuestion,
  EvidenceAnalysis,
  EvidenceStatus,
  FactExtraction,
  LegalAnalysisAi,
  LegalQueryGeneration,
  QuestionGeneration,
  ActionPlan,
} from '../../common/interfaces/ai.interface';
import { CaseState } from '../../common/interfaces/case.interface';
import type {
  AdiletArticleSource,
  LegalAnalysisExplanation,
  LegalAnalysisResult,
  LegalResearchResult,
} from '../../common/interfaces/legal.interface';
import { AiService } from '../ai/ai.service';
import { LegalResearchService } from '../legal/legal-research.service';
import {
  CaseAnswersDto,
  CaseMessageDto,
  CreateCaseDto,
} from './dto/case-dtos';
import { CaseEntity } from './entities/case.entity';
import { CaseMessageEntity } from './entities/case-message.entity';
import { EvidenceEntity } from '../evidence/entities/evidence.entity';

// Ограничение на число приложений (изображения/PDF) в одном запросе к AI.
const MAX_AI_ATTACHMENTS = 5;

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly casesRepository: Repository<CaseEntity>,
    @InjectRepository(CaseMessageEntity)
    private readonly messagesRepository: Repository<CaseMessageEntity>,
    @InjectRepository(EvidenceEntity)
    private readonly evidenceRepository: Repository<EvidenceEntity>,
    private readonly ai: AiService,
    private readonly legalResearchService: LegalResearchService,
  ) {}

  // ---------- Сценарий: создание и сбор информации ----------

  async create(dto: CreateCaseDto): Promise<CaseEntity> {
    const kase = this.casesRepository.create({
      state: CaseState.NEW,
      textDescription: dto.description,
      messages: [
        this.messagesRepository.create({ sender: 'user', text: dto.description }),
      ],
    });
    const saved = await this.casesRepository.save(kase);
    return this.runExtraction(saved.id);
  }

  async addMessage(id: string, dto: CaseMessageDto): Promise<CaseEntity> {
    const kase = await this.loadFull(id);
    this.assertState(
      kase,
      CaseState.COLLECTING_INFORMATION,
      'Дополнительные сообщения принимаются на этапе уточнения информации.',
    );
    await this.messagesRepository.save(
      this.messagesRepository.create({ caseId: id, sender: 'user', text: dto.text }),
    );
    return this.runExtraction(id);
  }

  async submitAnswers(id: string, dto: CaseAnswersDto): Promise<CaseEntity> {
    let kase = await this.loadFull(id);
    this.assertState(
      kase,
      CaseState.COLLECTING_INFORMATION,
      'Ответы принимаются на этапе уточнения информации.',
    );

    const questions = kase.questions ?? [];
    for (const answer of dto.answers ?? []) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Вопрос ${answer.questionId} не найден в кейсе ${id}`,
        );
      }
      question.answered = true;
      question.answer = answer.answer;
    }

    const answered = questions.filter((q) => q.answered && q.answer);
    if (answered.length > 0) {
      await this.messagesRepository.save(
        this.messagesRepository.create({
          caseId: id,
          sender: 'user',
          text: `Ответы на уточняющие вопросы:\n${answered
            .map((q) => `${q.question}\nОтвет: ${q.answer}`)
            .join('\n')}`,
        }),
      );
      kase = await this.loadFull(id);
      kase.questions = questions;
    }

    await this.refreshFacts(kase);
    kase.state = CaseState.COLLECTING_EVIDENCE;
    await this.casesRepository.save(kase);
    return this.loadFull(id);
  }

  // ---------- Сценарий: анализ, правовой поиск, план ----------

  async analyze(id: string): Promise<CaseEntity> {
    let kase = await this.loadFull(id);
    this.assertState(
      kase,
      CaseState.COLLECTING_EVIDENCE,
      'Анализ запускается после ответов на уточняющие вопросы (POST /cases/:id/answers).',
    );

    const facts = this.factTexts(kase);
    const evidence = kase.evidence ?? [];

    // 1. Анализ доказательств и связь с фактами
    if (evidence.length > 0) {
      const analysis = await this.ai.run<EvidenceAnalysis>(
        'evidence-analyzer',
        {
          facts,
          evidence: evidence.map((item) => ({
            id: item.id,
            originalName: item.originalName,
            mimeType: item.mimeType,
            kind: item.kind,
          })),
        },
        this.buildAttachments(evidence),
      );
      for (const item of evidence) {
        item.analysis =
          analysis.analyses.find((a) => a.evidenceId === item.id) ?? {
            evidenceId: item.id,
            status: 'NOT_ANALYZED' as EvidenceStatus,
            relevantFacts: [],
            note: 'Результат анализа для этого файла не получен.',
          };
      }
      await this.evidenceRepository.save(evidence);
    }

    kase.state = CaseState.ANALYZING;
    await this.casesRepository.save(kase);

    // 2. Генерация поисковых запросов
    const queryGeneration = await this.ai.run<LegalQueryGeneration>(
      'legal-query-generator',
      { facts },
    );

    // 3. Правовой поиск через LegalResearchService (Adilet KB)
    const research = await this.legalResearchService.research(
      queryGeneration.queries,
    );
    kase.legalResearch = research;
    kase.state = CaseState.LEGAL_RESEARCH;
    await this.casesRepository.save(kase);

    // 4. Разбор найденных источников (только по источникам, без выдумок)
    const analysisAi = await this.ai.run<LegalAnalysisAi>('legal-analyzer', {
      facts,
      sources: research.citedSources,
    });
    kase.legalAnalysis = this.buildLegalAnalysis(
      analysisAi,
      research.citedSources,
    );
    await this.casesRepository.save(kase);

    // 5. План действий
    const plan = await this.ai.run<ActionPlan>('action-planner', {
      facts,
      evidenceCount: evidence.length,
      explanations: (kase.legalAnalysis?.explanations ?? []).map((item) => ({
        articleId: item.articleId,
        relevance: item.relevance,
      })),
      recommendedStrategy: research.recommendedStrategy,
    });
    kase.actionPlan = plan;
    kase.state = CaseState.ACTION_PLAN_READY;
    await this.casesRepository.save(kase);

    return this.loadFull(id);
  }

  // ---------- Чтение ----------

  async findAll(): Promise<CaseEntity[]> {
    return this.casesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CaseEntity> {
    return this.loadFull(id);
  }

  async getFacts(id: string): Promise<Pick<CaseEntity, 'facts' | 'questions'>> {
    const kase = await this.loadFull(id);
    return { facts: kase.facts, questions: kase.questions };
  }

  async getLegal(
    id: string,
  ): Promise<Pick<CaseEntity, 'legalResearch' | 'legalAnalysis'>> {
    const kase = await this.loadFull(id);
    return { legalResearch: kase.legalResearch, legalAnalysis: kase.legalAnalysis };
  }

  async getActionPlan(id: string): Promise<Pick<CaseEntity, 'actionPlan'>> {
    const kase = await this.loadFull(id);
    return { actionPlan: kase.actionPlan };
  }

  // ---------- Внутреннее ----------

  private async loadFull(id: string): Promise<CaseEntity> {
    const found = await this.casesRepository.findOne({
      where: { id },
      relations: { messages: true, evidence: true, documents: true },
    });
    if (!found) {
      throw new NotFoundException(`Кейс ${id} не найден`);
    }
    return found;
  }

  private assertState(kase: CaseEntity, expected: CaseState, hint: string): void {
    if (kase.state !== expected) {
      throw new ConflictException(
        `Действие недоступно: кейс в состоянии ${kase.state}, ожидается ${expected}. ${hint}`,
      );
    }
  }

  private factTexts(kase: CaseEntity): string[] {
    return (kase.facts?.facts ?? []).map((fact) => fact.text);
  }

  private async runExtraction(id: string): Promise<CaseEntity> {
    const kase = await this.loadFull(id);
    await this.refreshFacts(kase);

    const generation = await this.ai.run<QuestionGeneration>(
      'question-generator',
      {
        facts: this.factTexts(kase),
        missingInformation: kase.facts?.missingInformation ?? [],
      },
    );
    kase.questions = generation.questions.map<ClarifyingQuestion>((q) => ({
      id: q.id,
      question: q.question,
      purpose: q.purpose,
      answered: q.answered ?? false,
      answer: q.answer,
    }));
    kase.state = CaseState.COLLECTING_INFORMATION;
    await this.casesRepository.save(kase);
    return this.loadFull(id);
  }

  private async refreshFacts(kase: CaseEntity): Promise<void> {
    const userText = (kase.messages ?? [])
      .map((message) => message.text)
      .join('\n');
    const extraction = await this.ai.run<FactExtraction>('fact-extractor', {
      userText,
    });
    kase.facts = extraction;
    await this.casesRepository.save(kase);
  }

  private buildLegalAnalysis(
    ai: LegalAnalysisAi,
    sources: AdiletArticleSource[],
  ): LegalAnalysisResult {
    const byId = new Map(sources.map((source) => [source.articleId, source]));
    const explanations: LegalAnalysisExplanation[] = [];
    for (const item of ai.explanations) {
      const source = byId.get(item.articleId);
      // AI сослался на источник, которого нет в результатах поиска, — отбрасываем.
      if (!source) {
        continue;
      }
      explanations.push({
        articleId: source.articleId,
        articleNumber: source.articleNumber,
        title: source.title,
        sourceName: source.sourceName,
        relevance: item.relevance,
        sourceBasis: item.sourceBasis,
        adiletUrl: source.adiletUrl,
      });
    }
    const usedIds = new Set(explanations.map((item) => item.articleId));
    return {
      explanations,
      insufficientSources: ai.insufficientSources || explanations.length === 0,
      citedSources: sources.filter((source) => usedIds.has(source.articleId)),
      disclaimer: ai.disclaimer,
      isMock: this.ai.providerName === 'mock',
      analyzedAt: new Date().toISOString(),
    };
  }

  private buildAttachments(evidence: EvidenceEntity[]): AiAttachment[] {
    const attachments: AiAttachment[] = [];
    for (const item of evidence) {
      if (item.kind !== 'image' && item.kind !== 'pdf') {
        continue; // аудио и прочее не передаём в модель
      }
      try {
        const base64 = readFileSync(
          join(appConfig.uploadDir, item.filename),
        ).toString('base64');
        attachments.push({
          kind: item.kind,
          mimeType: item.mimeType,
          base64,
          name: item.originalName,
        });
      } catch {
        // файл недоступен на диске — пропускаем, не ломая весь анализ
      }
      if (attachments.length >= MAX_AI_ATTACHMENTS) {
        break;
      }
    }
    return attachments;
  }
}
