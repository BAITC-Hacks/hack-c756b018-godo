// Источник нормы права из Adilet KB — единая структура для поиска, хранения в кейсе и выдачи на фронтенд.

export interface AdiletArticleSource {
  articleId: string; // например: "uk-rk-190", "gk-rk-953", "zozpp-rk-21"
  sourceName: string; // "Гражданский кодекс РК (Особенная часть)"
  articleNumber: string; // "Статья 953"
  title: string; // "Обязанность возвратить неосновательное обогащение"
  contentSnippet: string; // цитируемый фрагмент текста источника
  adiletUrl: string; // прямая ссылка на adilet.zan.kz
  relevanceScore?: number; // коэффициент совпадения при поиске
  keywords?: string[]; // ключевые слова для полнотекстового поиска по KB
}

// Результат LegalResearchService, сохраняется в Case.legalResearch
export interface LegalResearchResult {
  queries: string[];
  summary: string;
  citedSources: AdiletArticleSource[];
  recommendedStrategy: string;
  isMock: boolean;
  disclaimer: string;
  researchedAt: string;
}

// Разбор источников ролью LegalAnalyzer, сохраняется в Case.legalAnalysis
export interface LegalAnalysisExplanation {
  articleId: string;
  articleNumber: string;
  title: string;
  sourceName: string;
  relevance: string;
  sourceBasis: string;
  adiletUrl: string;
}

export interface LegalAnalysisResult {
  explanations: LegalAnalysisExplanation[];
  insufficientSources: boolean;
  citedSources: AdiletArticleSource[];
  disclaimer: string;
  isMock: boolean;
  analyzedAt: string;
}
