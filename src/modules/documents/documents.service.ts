import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../../common/interfaces/case.interface';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { DocumentResponseDto } from './dto/generate-document.dto';
import { CaseEntity } from '../cases/entities/case.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(CaseEntity)
    private readonly casesRepository: Repository<CaseEntity>,
  ) {}

  async generate(dto: GenerateDocumentDto): Promise<DocumentResponseDto> {
    const found = await this.casesRepository.findOne({
      where: { id: dto.caseId },
    });
    if (!found) {
      throw new NotFoundException(`Кейс ${dto.caseId} не найден`);
    }

    const type = dto.type ?? DocumentType.EOTINISH;
    const { title, documentText } =
      type === DocumentType.ROVD
        ? this.renderRovd(found)
        : this.renderEotinish(found);

    return { caseId: found.id, type, title, documentText };
  }

  private renderEotinish(kase: CaseEntity): { title: string; documentText: string } {
    const lines = [
      'Обращение через Единую систему рассмотрения обращений (eOtinish.gov.kz)',
      '',
      'ТЕМА: Нарушение прав потребителя / возможное мошенничество',
      '',
      'Текст обращения:',
      kase.textDescription ?? '(описание ситуации — см. факты ниже)',
      '',
      'Установленные обстоятельства:',
      ...this.numbered(kase.facts ?? []),
      '',
      'Применимые нормы законодательства РК:',
      ...this.articles(kase.legalArticles ?? []),
      '',
      'Прошу:',
      '1. Рассмотреть настоящее обращение по существу;',
      '2. Провести проверку изложенных фактов;',
      '3. Принять меры по восстановлению моих нарушенных прав и сообщить о результатах.',
      '',
      'Приложения: чеки, скриншоты, аудиозаписи (добавляются вручную).',
      '',
      'Дата: ' + new Date().toLocaleDateString('ru-RU'),
      'Заявитель: ____________________ (Ф.И.О., подпись)',
    ];
    return {
      title: 'Обращение в eOtinish (черновик)',
      documentText: lines.join('\n'),
    };
  }

  private renderRovd(kase: CaseEntity): { title: string; documentText: string } {
    const lines = [
      'Начальнику РОВД ____________________',
      '(наименование отдела полиции)',
      'от ____________________',
      '(Ф.И.О. заявителя, адрес, телефон — заполнить)',
      '',
      'ЗАЯВЛЕНИЕ',
      '',
      kase.textDescription ?? '(описание ситуации)',
      '',
      'Установленные обстоятельства:',
      ...this.numbered(kase.facts ?? []),
      '',
      'Применимые нормы законодательства РК:',
      ...this.articles(kase.legalArticles ?? []),
      '',
      'На основании изложенного прошу:',
      '1. Зарегистрировать настоящее заявление в Едином реестре досудебных расследований;',
      '2. Провести досудебное расследование по изложенным фактам;',
      '3. Привлечь виновных лиц к ответственности, предусмотренной законодательством РК;',
      '4. Уведомить меня о принятом решении.',
      '',
      'Приложения: чеки, скриншоты, аудиозаписи (добавляются вручную).',
      '',
      'Дата: ' + new Date().toLocaleDateString('ru-RU'),
      'Подпись: ____________________',
    ];
    return {
      title: 'Заявление в РОВД (черновик)',
      documentText: lines.join('\n'),
    };
  }

  private numbered(items: string[]): string[] {
    return items.map((item, index) => `${index + 1}. ${item}`);
  }

  private articles(list: { code: string; title: string; summary: string }[]): string[] {
    return list.map(
      (article) => `- ${article.code} «${article.title}» — ${article.summary}`,
    );
  }
}
