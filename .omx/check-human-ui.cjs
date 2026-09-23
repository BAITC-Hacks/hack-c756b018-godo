const { chromium } = require('C:/Users/Magzhan/AppData/Local/npm-cache/_npx/3d55143a3497ce4a/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const skills = [
    { skillId: 's1', skillName: 'Проектирование систем', category: 'hard', currentLevel: 2, requiredLevel: 4 },
    { skillId: 's2', skillName: 'Python', category: 'hard', currentLevel: 3, requiredLevel: 4 },
    { skillId: 's3', skillName: 'Работа в команде', category: 'soft', currentLevel: 4, requiredLevel: 4 },
  ];
  const employee = { id: 'E0028', name: 'Алия Садыкова', role: 'Backend Engineer', currentGrade: 'Middle', targetGrade: 'Senior', tenureMonths: 32, readinessScore: 75, skills, hasRecommendations: true };
  let completed = false;
  let failRecommendations = false;
  let failHr = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path.endsWith('/recommendations')) {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      if (failRecommendations) return json({ message: 'Unavailable' }, 503);
      return json(completed ? [] : [{ eventId: 'e1', title: 'Как проектировать надёжные системы', targetSkillId: 's1', targetSkillName: 'Проектирование систем', predictedGain: 1, priority: 1, reason: 'Для Senior нужен уровень 4, сейчас — 2. Практический воркшоп поможет применить знания. Раньше вы завершали занятия такого формата.' }]);
    }
    if (path.endsWith('/activities/complete')) { completed = true; return json({ success: true, updatedSkills: skills.map((s) => s.skillId === 's1' ? { ...s, currentLevel: 3 } : s), newReadinessScore: 83 }); }
    if (path.endsWith('/hr/analytics')) return failHr ? json({}, 500) : json({ laggingSkills: [{ skillId: 's1', skillName: 'Проектирование систем', affectedEmployees: 12 }], employeesAtRisk: [{ ...employee, readinessScore: 45 }] });
    if (path.endsWith('/hr/employees')) return failHr ? json({}, 500) : json([{ ...employee, readinessScore: 45 }]);
    return json(employee);
  });
  fs.mkdirSync('.omx/ui-check', { recursive: true });
  await page.goto('http://localhost:3001/employee');
  await page.getByText('Здравствуйте, Алия Садыкова!').waitFor();
  await page.getByText('Подбираем подходящие шаги').waitFor();
  await page.getByRole('button', { name: 'Отметить как пройденное' }).waitFor();
  await page.screenshot({ path: '.omx/ui-check/employee-desktop.png', fullPage: true });
  failRecommendations = true;
  await page.getByRole('button', { name: 'Отметить как пройденное' }).click();
  await page.getByText(/Готово! Результат сохранён/).waitFor();
  await page.getByText('Результат сохранён, но новые рекомендации пока не загрузились. Попробуйте обновить их позже.').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Отметить как пройденное' }).count(), 0);
  await page.reload();
  await page.getByText('Не удалось подобрать шаги. Ваш профиль и прогресс доступны — попробуйте ещё раз чуть позже.').waitFor();
  assert.equal(await page.getByText('Здравствуйте, Алия Садыкова!').count(), 1);
  failRecommendations = false;
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).click();
  await page.getByText('Пока нет подходящих шагов').waitFor();
  await page.goto('http://localhost:3001/hr');
  await page.getByRole('link', { name: 'Профиль' }).waitFor();
  await page.screenshot({ path: '.omx/ui-check/hr-desktop.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Поиск сотрудников' }).fill('Несуществующее имя');
  await page.getByText('Никого не нашли. Попробуйте другое имя или выберите «Вся команда».').waitFor();
  await page.getByRole('textbox', { name: 'Поиск сотрудников' }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.omx/ui-check/hr-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'HR page overflows');
  completed = false;
  await page.goto('http://localhost:3001/employee');
  await page.getByRole('button', { name: 'Отметить как пройденное' }).waitFor();
  await page.screenshot({ path: '.omx/ui-check/employee-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Employee page overflows');
  failHr = true;
  await page.goto('http://localhost:3001/hr');
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).waitFor();
  assert.deepEqual(await page.locator('.metric').allTextContents(), ['—', '—', '—']);
  failHr = false;
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).click();
  await page.getByRole('link', { name: 'Профиль' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: independent profile loading, completion + recommendation failure, retry, empty state, HR search/retry, mobile overflow, no browser errors. API fixtures used; no database writes.');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
