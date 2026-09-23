import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseState } from '../../common/interfaces/case.interface';
import { CaseEntity } from '../cases/entities/case.entity';
import { EvidenceEntity, EvidenceKind } from './entities/evidence.entity';

function detectKind(mimeType: string): EvidenceKind {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'other';
}

@Injectable()
export class EvidenceService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly casesRepository: Repository<CaseEntity>,
    @InjectRepository(EvidenceEntity)
    private readonly evidenceRepository: Repository<EvidenceEntity>,
  ) {}

  async upload(
    caseId: string,
    files: Express.Multer.File[],
  ): Promise<EvidenceEntity[]> {
    const kase = await this.casesRepository.findOne({ where: { id: caseId } });
    if (!kase) {
      throw new NotFoundException(`Кейс ${caseId} не найден`);
    }
    if (kase.state !== CaseState.COLLECTING_EVIDENCE) {
      throw new ConflictException(
        `Доказательства загружаются в состоянии COLLECTING_EVIDENCE (текущее: ${kase.state}). Сначала отправьте ответы на вопросы: POST /cases/${caseId}/answers`,
      );
    }
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Не передано ни одного файла. Приложите файлы в поле "files" (multipart/form-data).',
      );
    }
    const entities = files.map((file) =>
      this.evidenceRepository.create({
        caseId,
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        kind: detectKind(file.mimetype),
      }),
    );
    return this.evidenceRepository.save(entities);
  }

  async list(caseId: string): Promise<EvidenceEntity[]> {
    const kase = await this.casesRepository.findOne({ where: { id: caseId } });
    if (!kase) {
      throw new NotFoundException(`Кейс ${caseId} не найден`);
    }
    return this.evidenceRepository.find({
      where: { caseId },
      order: { createdAt: 'ASC' },
    });
  }
}
