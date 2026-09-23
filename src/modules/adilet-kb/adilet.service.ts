import { Injectable } from '@nestjs/common';
import type { LegalArticle } from '../../common/interfaces/case.interface';

// ЗАГЛУШКА: статические статьи — заменить на интеграцию с adilet.gov.kz / LLM.
const ARTICLES: LegalArticle[] = [
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
      'Покупатель вправе предъявить требования, связанные с недостатками товара (работы, услуги), продавцу в течение гарантийного срока.',
  },
];

@Injectable()
export class AdiletService {
  searchArticles(query: string): LegalArticle[] {
    const normalized = (query ?? '').toLowerCase().trim();
    if (!normalized) {
      return ARTICLES;
    }
    const keywords = normalized
      .split(/\s+/)
      .map((word) => word.replace(/[.,;:!?()«»"'-]/g, ''))
      .filter((word) => word.length > 2);
    if (keywords.length === 0) {
      return ARTICLES;
    }
    return ARTICLES.filter((article) => {
      const haystack =
        `${article.code} ${article.title} ${article.summary}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    });
  }
}
