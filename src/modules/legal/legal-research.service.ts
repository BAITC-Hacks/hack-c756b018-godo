import { Injectable } from '@nestjs/common';
import type {
  AdiletArticleSource,
  LegalResearchResult,
} from '../../common/interfaces/legal.interface';
import { aiConfig } from '../../config/ai.config';
import { AdiletKbService } from '../adilet-kb/adilet-kb.service';

const KB_DISCLAIMER =
  'Источники найдены в локальной базе Adilet KB. Перед использованием сверьтесь с актуальной редакцией нормы на официальном портале adilet.zan.kz. Информация не является юридической консультацией.';

// Отдельная абстракция доступа к законодательству РК.
// MVP: делегирует поиск в локальную базу AdiletKbService.
// Позже (LEGAL_SOURCE) сюда подключается реальная интеграция с adilet.zan.kz
// или внешний векторный индекс — без изменений в остальных модулях.
@Injectable()
export class LegalResearchService {
  constructor(private readonly adiletKbService: AdiletKbService) {}

  async searchAdiletSources(query: string): Promise<AdiletArticleSource[]> {
    return this.adiletKbService.findArticles(query);
  }

  async research(queries: string[]): Promise<LegalResearchResult> {
    const uniqueQueries = [...new Set(queries.filter((q) => q.trim().length > 0))];

    const byId = new Map<string, AdiletArticleSource>();
    for (const query of uniqueQueries) {
      for (const source of await this.searchAdiletSources(query)) {
        const existing = byId.get(source.articleId);
        if (!existing) {
          byId.set(source.articleId, source);
        } else {
          existing.relevanceScore =
            (existing.relevanceScore ?? 0) + (source.relevanceScore ?? 0);
        }
      }
    }

    const citedSources = [...byId.values()].sort(
      (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
    );

    return {
      queries: uniqueQueries,
      summary:
        citedSources.length > 0
          ? `По запросам найдено ${citedSources.length} источников законодательства РК: ${citedSources
              .map((source) => `${source.articleNumber} (${source.sourceName})`)
              .join('; ')}.`
          : 'По заданным запросам релевантных источников в базе не найдено. Информация недостаточна — уточните описание ситуации или проверьте применимые нормы вручную на adilet.zan.kz.',
      citedSources,
      recommendedStrategy: '',
      isMock: aiConfig.legalSource === 'mock-kb',
      disclaimer: KB_DISCLAIMER,
      researchedAt: new Date().toISOString(),
    };
  }
}
