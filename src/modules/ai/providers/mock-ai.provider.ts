import { Injectable } from '@nestjs/common';
import { renderDraftTemplate } from '../../../common/templates/draft-templates';
import {
  Confidence,
  EvidenceStatus,
  FactCategory,
} from '../../../common/interfaces/ai.interface';
import { DocumentType } from '../../../common/interfaces/case.interface';
import type {
  AiCompleteRequest,
  AiProvider,
} from '../ai-provider.interface';

// Детерминированная заглушка AI: работает без ключей, ничего не выдумывает.
// Извлекает только то, что прямо сказано пользователем; анализ доказательств
// честно помечает как невыполненный; толкование норм сводит к тексту источника.

const MOCK_DISCLAIMER =
  'Работает заглушка AI (AI_PROVIDER=mock). Ответ сформирован детерминированными правилами, без языковой модели.';

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 5);
}

interface FactExtractorInput {
  userText: string;
}

interface QuestionGeneratorInput {
  facts: string[];
  missingInformation: string[];
}

interface EvidenceAnalyzerInput {
  facts: string[];
  evidence: { id: string; originalName: string; mimeType: string; kind: string }[];
}

interface LegalQueryGeneratorInput {
  facts: string[];
}

interface LegalAnalyzerInput {
  facts: string[];
  sources: {
    articleId: string;
    articleNumber: string;
    title: string;
    sourceName: string;
    contentSnippet: string;
    adiletUrl: string;
  }[];
}

interface ActionPlannerInput {
  facts: string[];
  evidenceCount: number;
  explanations: { articleId: string; relevance: string }[];
  recommendedStrategy: string;
}

interface DraftGeneratorInput {
  type: DocumentType;
  facts: string[];
  sources: {
    articleNumber: string;
    title: string;
    sourceName: string;
    adiletUrl: string;
  }[];
  actionSteps: string[];
  evidenceNames: string[];
}

const MISSING_INFO_CHECKS: {
  pattern: RegExp;
  missing: string;
}[] = [
  { pattern: /\d/, missing: 'Сумма оплаты (в тенге) — не указана' },
  {
    pattern: /\d{1,2}[.\/]\d{1,2}|январ|феврал|март|апрел|ма[ейя]|июн|июл|август|сентябр|октябр|ноябр|декабр|вчера|сегодня|на прошлой неделе|неделю назад|месяц назад/i,
    missing: 'Дата оплаты или заказа — не указана',
  },
  {
    pattern: /магазин|продавец|продавца|сайт|сайте|интернет-магазин|kaspi|wildberries|ozon|instagram|объявлен/i,
    missing: 'Наименование продавца/магазина (сайт, объявление) — не указано',
  },
  {
    pattern: /чек|квитанц|скрин.*(оплат|перевод)|подтверждени[ея] оплат| Kaspi/i,
    missing: 'Подтверждение оплаты (чек, квитанция, скриншот) — не упомянуто',
  },
  {
    pattern: /написал|звонил|позвонил|чат|whatsapp|telegram|ватсап|телеграм|сообщен/i,
    missing: 'Способ связи с продавцом и переписка — не описаны',
  },
];

const QUESTION_TEMPLATES: {
  pattern: RegExp;
  question: string;
  purpose: string;
}[] = [
  {
    pattern: /сумм/i,
    question: 'Какая сумма была оплачена? Укажите точную сумму в тенге.',
    purpose: 'Для указания размера требований в претензии и обращении',
  },
  {
    pattern: /дата|когда/i,
    question: 'Когда вы оплатили товар? Укажите дату оплаты.',
    purpose: 'Для установления сроков исполнения обязательства',
  },
  {
    pattern: /продавц|магазин|сайт/i,
    question:
      'У кого вы приобрели товар? Укажите наименование магазина, сайт или реквизиты продавца.',
    purpose: 'Для определения ответственного лица',
  },
  {
    pattern: /чек|квитанц|подтверждени/i,
    question:
      'Есть ли у вас подтверждение оплаты (чек, квитанция, скриншот платежа)?',
    purpose: 'Доказывание факта оплаты',
  },
  {
    pattern: /связ|переписк|ответ|написал/i,
    question:
      'Как вы связывались с продавцом? Есть ли скриншоты переписки или записи звонков?',
    purpose: 'Доказывание факта обращения и уклонения продавца',
  },
];

function factExtractor(input: FactExtractorInput): unknown {
  const userText = (input.userText ?? '').trim();
  const sentences = splitSentences(userText);
  const facts = sentences.map((text) => ({
    text,
    category: FactCategory.USER_WORD,
    confidence: Confidence.MEDIUM,
  }));

  const lower = userText.toLowerCase();
  const missingInformation = MISSING_INFO_CHECKS.filter(
    (check) => !check.pattern.test(lower),
  ).map((check) => check.missing);

  const hasAmount = /\d/.test(userText);
  const hasSeller = MISSING_INFO_CHECKS[2].pattern.test(lower);
  const isEnoughForAnalysis = facts.length > 0 && hasAmount && hasSeller;

  return {
    facts:
      facts.length > 0
        ? facts
        : userText.length > 0
          ? [
              {
                text: userText,
                category: FactCategory.USER_WORD,
                confidence: Confidence.MEDIUM,
              },
            ]
          : [],
    missingInformation,
    isEnoughForAnalysis,
    notes: MOCK_DISCLAIMER,
  };
}

function questionGenerator(input: QuestionGeneratorInput): unknown {
  const questions = input.missingInformation
    .slice(0, 3)
    .map((missing, index) => {
      const template = QUESTION_TEMPLATES.find((candidate) =>
        candidate.pattern.test(missing),
      );
      return {
        id: `q${index + 1}`,
        question: template
          ? template.question
          : `Уточните, пожалуйста: ${missing.toLowerCase()}`,
        purpose: template
          ? template.purpose
          : 'Для более точного подбора норм и составления документа',
      };
    });
  return { questions };
}

function evidenceAnalyzer(input: EvidenceAnalyzerInput): unknown {
  return {
    analyses: input.evidence.map((item) => ({
      evidenceId: item.id,
      status: EvidenceStatus.NOT_ANALYZED,
      relevantFacts: [],
      note: `Файл «${item.originalName}» зарегистрирован. Содержимое не анализировалось: AI-провайдер не настроен, связь с фактами не устанавливалась.`,
    })),
    limitations: [
      'Содержимое файлов не анализировалось (mock-режим).',
      'Для реального анализа доказательств задайте AI_PROVIDER=anthropic и ANTHROPIC_API_KEY.',
      'Аудиозаписи требуют отдельной транскрипции и не передаются в анализ.',
    ],
  };
}

function legalQueryGenerator(input: LegalQueryGeneratorInput): unknown {
  const factsText = input.facts.join(' ').toLowerCase();
  const queries: string[] = [];
  if (
    /перестал отвечать|исчез|не отправил|не доставил|не получил|предоплат|оплатил.*(товар|заказ)/.test(
      factsText,
    )
  ) {
    queries.push('возврат предоплаты за непоставленный товар');
    queries.push('неосновательное обогащение возврат денежных средств');
    queries.push('мошенничество продавец не отправил товар');
  }
  if (
    /некачественн|брак|неисправн|дефект|ненадлежащего качества/.test(factsText)
  ) {
    queries.push('недостатки товара возврат денежных средств потребитель');
    queries.push('защита прав потребителей сроки удовлетворения требований');
  }
  if (queries.length === 0) {
    queries.push('защита прав потребителей возврат денежных средств');
    queries.push('обязанность возвратить неосновательное обогащение');
  }
  return { queries: queries.slice(0, 5) };
}

function legalAnalyzer(input: LegalAnalyzerInput): unknown {
  return {
    explanations: input.sources.map((source) => ({
      articleId: source.articleId,
      relevance: `Найденный источник — ${source.sourceName}, ${source.articleNumber} «${source.title}» — тематически соответствует запросам по вашему делу. Как именно норма применяется к вашей ситуации, нужно проверять по тексту источника; точное толкование станет доступно после подключения AI-провайдера.`,
      sourceBasis: source.contentSnippet,
    })),
    insufficientSources: input.sources.length === 0,
    disclaimer:
      'Разбор основан исключительно на найденных источниках локальной базы Adilet KB (mock-режим). Не является юридической консультацией.',
  };
}

function actionPlanner(input: ActionPlannerInput): unknown {
  const factsText = input.facts.join(' ').toLowerCase();
  const steps: {
    order: number;
    title: string;
    description: string;
    optional: boolean;
  }[] = [
    {
      order: 1,
      title: 'Проверьте и дополните доказательства',
      description:
        'Убедитесь, что у вас есть: подтверждение оплаты (чек, квитанция, скриншот платежа), переписка с продавцом, реквизиты продавца/магазина. Загрузите недостающее в приложение.',
      optional: false,
    },
    {
      order: 2,
      title: 'Направьте продавцу письменную претензию',
      description:
        'Изложите обстоятельства (дата и сумма оплаты, что товар не получен), приложите подтверждение оплаты и предъявите требование вернуть денежные средства, указав разумный срок для ответа. Сохраните подтверждение отправки.',
      optional: false,
    },
    {
      order: 3,
      title: 'Если продавец отказал или не ответил — обращение через eOtinish',
      description:
        'Подайте обращение в уполномоченный орган по защите прав потребителей через портал eOtinish.gov.kz, приложив доказательства. Черновик обращения можно сгенерировать в приложении.',
      optional: false,
    },
  ];
  if (
    /перестал отвечать|исчез|мошенн|не отправил/.test(factsText) ||
    input.evidenceCount === 0
  ) {
    steps.push({
      order: steps.length + 1,
      title: 'При признаках мошенничества — заявление в полицию',
      description:
        'Если есть признаки обмана (продавец исчез после оплаты, магазин недоступен), вы вправе подать заявление в РОВД. Решение о наличии признаков уголовного правонарушения принимают органы дознания.',
      optional: true,
    });
  }
  steps.push({
    order: steps.length + 1,
    title: 'Обращение в суд',
    description:
      'Если досудебные способы не дали результата, вы можете обратиться в суд с иском о взыскании уплаченной суммы. Оцените целесообразность с учётом суммы спора и судебных расходов; при необходимости обратитесь к адвокату.',
    optional: true,
  });

  return {
    steps,
    caveats: [
      'План носит информационный характер и не является юридической консультацией.',
      'План не гарантирует положительный результат — исход зависит от обстоятельств дела и решений уполномоченных органов.',
      MOCK_DISCLAIMER,
    ],
  };
}

function draftGenerator(input: DraftGeneratorInput): unknown {
  const rendered = renderDraftTemplate({
    type: input.type ?? DocumentType.EOTINISH,
    facts: input.facts ?? [],
    sources: input.sources ?? [],
    actionSteps: input.actionSteps ?? [],
    evidenceNames: input.evidenceNames ?? [],
  });
  return {
    title: rendered.title,
    documentText: rendered.documentText,
    warnings: [
      'Черновик сформирован автоматически и требует обязательной проверки и редактирования пользователем перед отправкой.',
      'Заполните все поля-плейсхолдеры в квадратных скобках.',
      'Приложения (чеки, скриншоты) прикрепляются вручную при отправке обращения.',
      MOCK_DISCLAIMER,
    ],
    placeholders: rendered.placeholders,
  };
}

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async complete(request: AiCompleteRequest): Promise<string> {
    const input = (request.input ?? {}) as Record<string, unknown>;
    let result: unknown;
    switch (request.role) {
      case 'fact-extractor':
        result = factExtractor(input as unknown as FactExtractorInput);
        break;
      case 'question-generator':
        result = questionGenerator(
          input as unknown as QuestionGeneratorInput,
        );
        break;
      case 'evidence-analyzer':
        result = evidenceAnalyzer(input as unknown as EvidenceAnalyzerInput);
        break;
      case 'legal-query-generator':
        result = legalQueryGenerator(
          input as unknown as LegalQueryGeneratorInput,
        );
        break;
      case 'legal-analyzer':
        result = legalAnalyzer(input as unknown as LegalAnalyzerInput);
        break;
      case 'action-planner':
        result = actionPlanner(input as unknown as ActionPlannerInput);
        break;
      case 'draft-generator':
        result = draftGenerator(input as unknown as DraftGeneratorInput);
        break;
      default:
        throw new Error(`Неизвестная AI-роль: ${request.role}`);
    }
    return JSON.stringify(result);
  }
}
