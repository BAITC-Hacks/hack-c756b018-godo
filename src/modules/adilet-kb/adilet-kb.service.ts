import { Injectable } from '@nestjs/common';
import type { AdiletArticleSource } from '../../common/interfaces/legal.interface';
import { ADILET_KB_ARTICLES } from './adilet-kb.data';

@Injectable()
export class AdiletKbService {
  findArticles(query: string): AdiletArticleSource[] {
    const keywords = this.tokenize(query);
    if (keywords.length === 0) {
      return [];
    }
    return ADILET_KB_ARTICLES.map((article) => {
      const haystack = this.tokenize(
        `${article.sourceName} ${article.articleNumber} ${article.title} ${article.contentSnippet} ${(article.keywords ?? []).join(' ')}`,
      );
      const matched = new Set<string>();
      for (const keyword of keywords) {
        if (haystack.some((word) => word.includes(keyword) || keyword.includes(word))) {
          matched.add(keyword);
        }
      }
      return {
        ...article,
        relevanceScore: matched.size,
      };
    })
      .filter((article) => (article.relevanceScore ?? 0) > 0)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, 5);
  }

  allArticles(): AdiletArticleSource[] {
    return ADILET_KB_ARTICLES;
  }

  private tokenize(text: string): string[] {
    return (text ?? '')
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[.,;:!?()«»"'№-]/g, ''))
      .filter((word) => word.length > 3);
  }
}
