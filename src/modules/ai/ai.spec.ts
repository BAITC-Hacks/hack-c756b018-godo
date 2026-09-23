import { AdiletKbService } from '../adilet-kb/adilet-kb.service';
import { ADILET_KB_ARTICLES } from '../adilet-kb/adilet-kb.data';
import { DocumentType } from '../../common/interfaces/case.interface';
import { AiValidationError, extractJson } from '../../common/utils/validate-ai-json';
import type { AiCompleteRequest } from './ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { AI_ROLES } from './ai-roles';
import { parseAndValidateAiJson } from '../../common/utils/validate-ai-json';

const provider = new MockAiProvider();

async function runRole(role: keyof typeof AI_ROLES, input: unknown) {
  const request: AiCompleteRequest = {
    role,
    system: AI_ROLES[role].system,
    input,
  };
  const raw = await provider.complete(request);
  return parseAndValidateAiJson(role, AI_ROLES[role].dto, raw);
}

describe('validate-ai-json', () => {
  it('извлекает JSON из чистого ответа, fenced-блока и текста с пояснениями', () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Вот ответ:\n{"a": 1}\nСпасибо!')).toEqual({ a: 1 });
  });

  it('бросает ошибку на ответе без JSON', () => {
    expect(() => extractJson('никакого json тут нет')).toThrow();
  });

  it('бросает AiValidationError при неверной схеме', () => {
    const raw = JSON.stringify({ facts: [{ text: 'x', category: 'UNKNOWN', confidence: 'HIGH' }] });
    expect(() =>
      parseAndValidateAiJson('fact-extractor', AI_ROLES['fact-extractor'].dto, raw),
    ).toThrow(AiValidationError);
  });
});

describe('MockAiProvider — роли', () => {
  const userText =
    'Оплатил телефон 45000 тенге 15 сентября в интернет-магазине example.kz через Kaspi. Продавец не отправил товар и перестал отвечать на сообщения.';

  it('fact-extractor извлекает только слова пользователя и пропуски информации', async () => {
    const result = await runRole('fact-extractor', { userText });
    expect(result.facts.length).toBeGreaterThanOrEqual(2);
    for (const fact of result.facts) {
      expect(fact.category).toBe('USER_WORD');
      expect(userText).toContain(fact.text);
    }
    // сумма, дата и продавец присутствуют в тексте — не должны попасть в пропуски
    expect(result.missingInformation.join(' ')).not.toContain('Сумма оплаты');
    expect(result.missingInformation.join(' ')).not.toContain('Дата');
  });

  it('fact-extractor помечает недостающую информацию при скудном тексте', async () => {
    const result = await runRole('fact-extractor', {
      userText: 'Купил телефон, продавец пропал.',
    });
    expect(result.missingInformation.length).toBeGreaterThan(0);
    expect(result.isEnoughForAnalysis).toBe(false);
  });

  it('question-generator даёт не более 3 вопросов', async () => {
    const result = await runRole('question-generator', {
      facts: ['Купил телефон'],
      missingInformation: [
        'Сумма оплаты (в тенге) — не указана',
        'Дата оплаты или заказа — не указана',
        'Наименование продавца/магазина (сайт, объявление) — не указано',
        'Подтверждение оплаты (чек, квитанция, скриншот) — не упомянуто',
      ],
    });
    expect(result.questions.length).toBe(3);
    expect(result.questions[0].id).toBe('q1');
  });

  it('evidence-analyzer в mock-режиме честно помечает файлы как неанализированные', async () => {
    const result = await runRole('evidence-analyzer', {
      facts: ['Оплатил телефон'],
      evidence: [{ id: 'e1', originalName: 'check.png', mimeType: 'image/png', kind: 'image' }],
    });
    expect(result.analyses[0].status).toBe('NOT_ANALYZED');
    expect(result.analyses[0].relevantFacts).toEqual([]);
    expect(result.limitations.join(' ')).toContain('mock');
  });

  it('legal-query-generator строит запросы по признакам сценария', async () => {
    const result = await runRole('legal-query-generator', {
      facts: ['Продавец не отправил товар и перестал отвечать'],
    });
    expect(result.queries.length).toBeGreaterThan(0);
    expect(result.queries.join(' ')).toContain('предоплат');
  });

  it('legal-analyzer опирается только на переданные источники', async () => {
    const source = ADILET_KB_ARTICLES[1];
    const result = await runRole('legal-analyzer', { facts: ['оплатил товар'], sources: [source] });
    expect(result.explanations.length).toBe(1);
    expect(result.explanations[0].articleId).toBe(source.articleId);
    expect(result.explanations[0].sourceBasis).toBe(source.contentSnippet);
  });

  it('action-planner содержит шаги и оговорки без гарантий результата', async () => {
    const result = await runRole('action-planner', {
      facts: ['Продавец не отправил товар'],
      evidenceCount: 1,
      explanations: [],
      recommendedStrategy: '',
    });
    expect(result.steps.length).toBeGreaterThan(2);
    expect(result.caveats.join(' ')).toContain('не является юридической консультацией');
  });

  it('draft-generator собирает черновик из переданных фактов и источников', async () => {
    const result = await runRole('draft-generator', {
      type: DocumentType.EOTINISH,
      facts: ['Оплатил телефон 45000 тенге'],
      sources: [
        {
          articleNumber: 'Статья 953',
          title: 'Обязанность возвратить неосновательное обогащение',
          sourceName: 'Гражданский кодекс РК (Особенная часть)',
          adiletUrl: 'https://adilet.zan.kz/rus/docs/K990000409_',
        },
      ],
      actionSteps: ['Направьте претензию'],
      evidenceNames: ['check.png'],
    });
    expect(result.documentText).toContain('Статья 953');
    expect(result.documentText).toContain('Оплатил телефон');
    expect(result.documentText).toContain('adilet.zan.kz');
    expect(result.warnings.join(' ')).toContain('проверки');
  });
});

describe('AdiletKbService', () => {
  const service = new AdiletKbService();

  it('находит релевантные статьи по запросу', () => {
    const found = service.findArticles('возврат предоплаты за непоставленный товар');
    expect(found.length).toBeGreaterThan(0);
    const ids = found.map((article) => article.articleId);
    expect(ids).toContain('gk-rk-953');
  });

  it('находит статью о мошенничестве', () => {
    const found = service.findArticles('мошенничество продавец исчез');
    expect(found.map((article) => article.articleId)).toContain('uk-rk-190');
  });

  it('возвращает пустой результат для пустого запроса', () => {
    expect(service.findArticles('')).toEqual([]);
  });

  it('все статьи KB имеют ссылку на adilet.zan.kz', () => {
    for (const article of ADILET_KB_ARTICLES) {
      expect(article.adiletUrl).toMatch(/^https:\/\/adilet\.zan\.kz\//);
      expect(article.contentSnippet.length).toBeGreaterThan(20);
    }
  });
});
