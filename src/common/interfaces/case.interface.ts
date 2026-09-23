export interface LegalArticle {
  code: string;
  title: string;
  summary: string;
}

export interface CaseAnalysis {
  facts: string[];
  legalArticles: LegalArticle[];
  evidenceProvided: string[];
  evidenceMissing: string[];
  nextSteps: string[];
}

export enum DocumentType {
  EOTINISH = 'eOtinish',
  ROVD = 'rovd',
}
