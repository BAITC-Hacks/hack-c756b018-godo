import { DocumentType } from '../interfaces/case.interface';

export interface DraftTemplateSource {
  articleNumber: string;
  title: string;
  sourceName: string;
  adiletUrl: string;
}

export interface DraftTemplateInput {
  type: DocumentType;
  facts: string[];
  sources: DraftTemplateSource[];
  actionSteps: string[];
  evidenceNames: string[];
}

export interface RenderedDraft {
  title: string;
  documentText: string;
  placeholders: string[];
}

const COMMON_PLACEHOLDERS = [
  '[Ф.И.О. заявителя]',
  '[адрес заявителя]',
  '[телефон заявителя]',
  '[наименование продавца / магазина]',
  '[дата оплаты]',
  '[сумма оплаты]',
  '[дата]',
];

function numberedList(items: string[]): string[] {
  return items.map((item, index) => `${index + 1}. ${item}`);
}

function sourceLines(sources: DraftTemplateSource[]): string[] {
  if (sources.length === 0) {
    return ['(источники не найдены — проверьте применимые нормы на adilet.zan.kz)'];
  }
  return sources.map(
    (source) =>
      `- ${source.sourceName}, ${source.articleNumber} «${source.title}» — ${source.adiletUrl}`,
  );
}

function attachmentsLine(evidenceNames: string[]): string {
  if (evidenceNames.length === 0) {
    return 'Приложения: [приложить чек, скриншоты переписки и другие доказательства вручную].';
  }
  return `Приложения (${evidenceNames.length}): ${evidenceNames.join(', ')} — проверить и приложить вручную.`;
}

export function renderDraftTemplate(input: DraftTemplateInput): RenderedDraft {
  const facts =
    input.facts.length > 0
      ? numberedList(input.facts)
      : ['[описание ситуации — заполните]'];
  const sources = sourceLines(input.sources);

  if (input.type === DocumentType.ROVD) {
    const lines = [
      'Начальнику [наименование отдела полиции] РОВД',
      'от [Ф.И.О. заявителя], проживающего(ей) по адресу: [адрес заявителя],',
      'тел.: [телефон заявителя]',
      '',
      'ЗАЯВЛЕНИЕ',
      '',
      '[Дата], я, [Ф.И.О. заявителя], оплатил(а) товар «[наименование товара]» у [наименование продавца / магазина] на сумму [сумма оплаты].',
      '',
      'Установленные обстоятельства (со слов заявителя):',
      ...facts,
      '',
      'Соотносимые нормы законодательства РК (по результатам поиска в базе Adilet KB):',
      ...sources,
      '',
      'На основании изложенного прошу:',
      '1. Зарегистрировать настоящее заявление в Едином реестре досудебных расследований;',
      '2. Провести досудебное расследование по изложенным фактам;',
      '3. Уведомить меня о принятом решении.',
      '',
      attachmentsLine(input.evidenceNames),
      '',
      'Дата: [дата]',
      'Подпись: ____________________',
    ];
    return {
      title: 'Заявление в РОВД (черновик)',
      documentText: lines.join('\n'),
      placeholders: [
        '[наименование отдела полиции]',
        '[наименование товара]',
        ...COMMON_PLACEHOLDERS,
      ],
    };
  }

  const lines = [
    'Обращение через Единую систему рассмотрения обращений (eOtinish.gov.kz)',
    '',
    'ТЕМА: [тема обращения — например: невозврат оплаты за непоставленный товар]',
    '',
    'Текст обращения:',
    '[Ф.И.О. заявителя], [дата] произвел(а) оплату товара у [наименование продавца / магазина] в размере [сумма оплаты].',
    '',
    'Установленные обстоятельства (со слов заявителя):',
    ...facts,
    '',
    'Соотносимые нормы законодательства РК (по результатам поиска в базе Adilet KB):',
    ...sources,
    '',
    'Прошу:',
    '1. Рассмотреть настоящее обращение по существу;',
    '2. Провести проверку изложенных фактов;',
    '3. Принять меры по восстановлению моих прав и сообщить о результатах.',
    '',
    ...(input.actionSteps.length > 0
      ? ['План действий заявителя (для справки):', ...numberedList(input.actionSteps), '']
      : []),
    attachmentsLine(input.evidenceNames),
    '',
    'Дата: [дата]',
    'Заявитель: ____________________ (Ф.И.О., подпись)',
  ];
  return {
    title: 'Обращение в eOtinish (черновик)',
    documentText: lines.join('\n'),
    placeholders: ['[тема обращения — например: невозврат оплаты за непоставленный товар]', ...COMMON_PLACEHOLDERS],
  };
}
