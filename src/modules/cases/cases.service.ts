import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CaseAnalysis } from '../../common/interfaces/case.interface';
import { AdiletService } from '../adilet-kb/adilet.service';
import { AnalyzeCaseDto } from './dto/analyze-case.dto';
import { CaseResponseDto } from './dto/case-response.dto';
import { CaseEntity } from './entities/case.entity';

// ЗАГЛУШКА: фиксированный ответ вместо реального AI-анализа.
const MOCK_ANALYSIS: CaseAnalysis = {
  facts: [
    'Пользователь приобрёл товар ненадлежащего качества',
    'Продавец отказался вернуть денежные средства',
    'Имеются доказательства покупки и переписки с продавцом',
  ],
  legalArticles: [
    {
      code: 'Ст. 190 УК РК',
      title: 'Мошенничество',
      summary:
        'Хищение чужого имущества или приобретение права на чужое имущество путём обмана или злоупотребления доверием.',
    },
    {
      code: 'Ст. 953 ГК РК',
      title: 'Защита прав потребителя',
      summary:
        'Покупатель вправе предъявить требования, связанные с недостатками товара, в течение гарантийного срока.',
    },
  ],
  evidenceProvided: ['Скриншот переписки с продавцом (заглушка)'],
  evidenceMissing: [
    'Чек или иной документ, подтверждающий оплату',
    'Письменная претензия, направленная продавцу',
  ],
  nextSteps: [
    'Составить письменную претензию продавцу',
    'Собрать чеки, скриншоты и переписку',
    'При отказе — обратиться в Комитет по защите прав потребителей (eOtinish) или в суд',
  ],
};

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly casesRepository: Repository<CaseEntity>,
    private readonly adiletService: AdiletService,
  ) {}

  async analyze(
    dto: AnalyzeCaseDto,
    files: Express.Multer.File[],
  ): Promise<CaseResponseDto> {
    const mock = MOCK_ANALYSIS;
    const matched = this.adiletService.searchArticles(
      dto.textDescription ?? '',
    );
    const legalArticles =
      matched.length > 0 ? matched : mock.legalArticles;

    const saved = await this.casesRepository.save(
      this.casesRepository.create({
        textDescription: dto.textDescription ?? null,
        facts: mock.facts,
        legalArticles,
        nextSteps: mock.nextSteps,
      }),
    );

    return {
      id: saved.id,
      textDescription: saved.textDescription,
      facts: saved.facts,
      legalArticles: saved.legalArticles,
      evidenceProvided: files.length
        ? files.map((file) => file.originalname)
        : mock.evidenceProvided,
      evidenceMissing: mock.evidenceMissing,
      nextSteps: saved.nextSteps,
      createdAt: saved.createdAt,
    };
  }

  async findAll(): Promise<CaseEntity[]> {
    return this.casesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CaseEntity> {
    const found = await this.casesRepository.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Кейс ${id} не найден`);
    }
    return found;
  }
}
