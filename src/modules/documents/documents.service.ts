import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseState, DocumentType } from '../../common/interfaces/case.interface';
import type { DraftGeneration } from '../../common/interfaces/ai.interface';
import { AiService } from '../ai/ai.service';
import { CaseEntity } from '../cases/entities/case.entity';
import { CaseDocumentEntity } from './entities/case-document.entity';
import {
  DocumentResponseDto,
  GenerateDraftDto,
  PatchDraftDto,
} from './dto/document-dtos';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly casesRepository: Repository<CaseEntity>,
    @InjectRepository(CaseDocumentEntity)
    private readonly documentsRepository: Repository<CaseDocumentEntity>,
    private readonly ai: AiService,
  ) {}

  async generateDraft(
    caseId: string,
    dto: GenerateDraftDto,
  ): Promise<DocumentResponseDto> {
    const kase = await this.loadCase(caseId);
    if (kase.state !== CaseState.ACTION_PLAN_READY) {
      throw new ConflictException(
        `Черновик формируется после анализа кейса (POST /cases/${caseId}/analyze). Текущее состояние: ${kase.state}`,
      );
    }

    const type = dto.type ?? DocumentType.EOTINISH;
    const explanationSources = (kase.legalAnalysis?.explanations ?? []).map(
      (item) => ({
        articleNumber: item.articleNumber,
        title: item.title,
        sourceName: item.sourceName,
        adiletUrl: item.adiletUrl,
      }),
    );
    const researchSources = (kase.legalResearch?.citedSources ?? []).map(
      (source) => ({
        articleNumber: source.articleNumber,
        title: source.title,
        sourceName: source.sourceName,
        adiletUrl: source.adiletUrl,
      }),
    );

    const draft = await this.ai.run<DraftGeneration>('draft-generator', {
      type,
      facts: (kase.facts?.facts ?? []).map((fact) => fact.text),
      sources: explanationSources.length > 0 ? explanationSources : researchSources,
      actionSteps: (kase.actionPlan?.steps ?? []).map(
        (step) => `${step.title} — ${step.description}`,
      ),
      evidenceNames: (kase.evidence ?? []).map((item) => item.originalName),
    });

    const version =
      (await this.documentsRepository.count({ where: { caseId } })) + 1;
    const document = await this.documentsRepository.save(
      this.documentsRepository.create({
        caseId,
        type,
        title: draft.title,
        documentText: draft.documentText,
        version,
        isAiGenerated: this.ai.providerName === 'mock',
        isEditedByUser: false,
      }),
    );

    kase.state = CaseState.DRAFT_READY;
    await this.casesRepository.save(kase);

    return this.toDto(document, draft);
  }

  async getDraft(caseId: string): Promise<DocumentResponseDto> {
    await this.assertCaseExists(caseId);
    const document = await this.latestDraft(caseId);
    if (!document) {
      throw new NotFoundException(
        `Черновик для кейса ${caseId} ещё не создан. Выполните POST /cases/${caseId}/draft`,
      );
    }
    return this.toDto(document);
  }

  async patchDraft(
    caseId: string,
    dto: PatchDraftDto,
  ): Promise<DocumentResponseDto> {
    const kase = await this.loadCase(caseId);
    if (kase.state !== CaseState.DRAFT_READY) {
      throw new ConflictException(
        `Редактирование доступно в состоянии DRAFT_READY (текущее: ${kase.state}).`,
      );
    }
    const document = await this.latestDraft(caseId);
    if (!document) {
      throw new NotFoundException(
        `Черновик для кейса ${caseId} ещё не создан. Выполните POST /cases/${caseId}/draft`,
      );
    }
    document.documentText = dto.documentText;
    document.isEditedByUser = true;
    const saved = await this.documentsRepository.save(document);
    return this.toDto(saved);
  }

  // ---------- Внутреннее ----------

  private async loadCase(caseId: string): Promise<CaseEntity> {
    const found = await this.casesRepository.findOne({
      where: { id: caseId },
      relations: { evidence: true },
    });
    if (!found) {
      throw new NotFoundException(`Кейс ${caseId} не найден`);
    }
    return found;
  }

  private async assertCaseExists(caseId: string): Promise<void> {
    const found = await this.casesRepository.findOne({ where: { id: caseId } });
    if (!found) {
      throw new NotFoundException(`Кейс ${caseId} не найден`);
    }
  }

  private latestDraft(caseId: string): Promise<CaseDocumentEntity | null> {
    return this.documentsRepository.findOne({
      where: { caseId },
      order: { version: 'DESC' },
    });
  }

  private toDto(
    document: CaseDocumentEntity,
    draft?: DraftGeneration,
  ): DocumentResponseDto {
    return {
      id: document.id,
      caseId: document.caseId,
      type: document.type,
      title: document.title,
      documentText: document.documentText,
      version: document.version,
      isEditedByUser: document.isEditedByUser,
      placeholders: draft?.placeholders,
      warnings: draft?.warnings,
      updatedAt: document.updatedAt,
    };
  }
}
