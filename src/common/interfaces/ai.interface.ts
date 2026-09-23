// Структурированные схемы JSON-ответов AI-ролей.
// Каждый ответ AI валидируется class-validator'ом (см. common/utils/validate-ai-json.ts).

export type AiRoleName =
  | 'fact-extractor'
  | 'question-generator'
  | 'evidence-analyzer'
  | 'legal-query-generator'
  | 'legal-analyzer'
  | 'action-planner'
  | 'draft-generator';

export enum FactCategory {
  USER_WORD = 'USER_WORD',
  EVIDENCE_BASED = 'EVIDENCE_BASED',
  AI_INTERPRETATION = 'AI_INTERPRETATION',
}

export enum Confidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum EvidenceStatus {
  NOT_ANALYZED = 'NOT_ANALYZED',
  LINKED_TO_FACTS = 'LINKED_TO_FACTS',
  NOT_RELEVANT = 'NOT_RELEVANT',
}

export interface ExtractedFact {
  text: string;
  category: FactCategory;
  confidence: Confidence;
}

export interface FactExtraction {
  facts: ExtractedFact[];
  missingInformation: string[];
  isEnoughForAnalysis: boolean;
  notes?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  purpose: string;
  answered: boolean;
  answer?: string;
}

export interface QuestionGeneration {
  questions: ClarifyingQuestion[];
}

export interface EvidenceAnalysisItem {
  evidenceId: string;
  status: EvidenceStatus;
  relevantFacts: string[];
  note: string;
}

export interface EvidenceAnalysis {
  analyses: EvidenceAnalysisItem[];
  limitations: string[];
}

export interface LegalQueryGeneration {
  queries: string[];
}

export interface LegalAnalysisExplanation {
  articleId: string;
  relevance: string;
  sourceBasis: string;
}

export interface LegalAnalysisAi {
  explanations: LegalAnalysisExplanation[];
  insufficientSources: boolean;
  disclaimer: string;
}

export interface ActionStep {
  order: number;
  title: string;
  description: string;
  optional: boolean;
}

export interface ActionPlan {
  steps: ActionStep[];
  caveats: string[];
}

export interface DraftGeneration {
  title: string;
  documentText: string;
  warnings: string[];
  placeholders: string[];
}

export interface AiAttachment {
  kind: 'image' | 'pdf';
  mimeType: string;
  base64: string;
  name: string;
}
