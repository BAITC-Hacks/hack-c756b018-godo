# API-контракт Career Quest

## Общие правила
- Формат: JSON, `Content-Type: application/json`
- Базовый URL: `http://localhost:3000` (или переменная окружения на фронте)
- Ошибки — единый формат:
```json
{ "statusCode": 404, "message": "Employee not found" }
```

---

## 1. Список сотрудников
```
GET /employees
```
**Ответ 200:**
```json
[
  { "employee_id": "E0028", "role": "Backend Engineer", "grade": "Middle", "tenure_months": 52 }
]
```

---

## 2. Профиль сотрудника (страница сотрудника)
```
GET /employees/:id
```
**Ответ 200:**
```json
{
  "employee_id": "E0028",
  "role": "Backend Engineer",
  "grade": "Middle",
  "tenure_months": 52,
  "skills": { "SK_PYTHON": 3, "SK_SYSTEM_DESIGN": 2, "SK_PUBLIC_SPEAKING": 2 },
  "completed_activities": [
    { "event_id": "EV_PYTHON_ADVANCED", "title": "Advanced Python практикум", "date": "2025-03-01" }
  ],
  "skill_gaps_to_next_grade": [
    { "skill_id": "SK_SYSTEM_DESIGN", "skill_name": "System Design", "current_level": 2, "required_level": 4, "gap": 2 }
  ]
}
```
**404** — если `employee_id` не найден.

---

## 3. AI-рекомендация следующего шага
```
GET /employees/:id/recommendations
```
**Ответ 200:**
```json
{
  "employee_id": "E0028",
  "grade": "Middle",
  "skill_gaps": [ /* как выше */ ],
  "recommendations": [
    {
      "event_id": "EV_SYS_DESIGN_WORKSHOP",
      "title": "Воркшоп: System Design для Senior",
      "type": "training",
      "voluntary": true,
      "score": 20.0,
      "factors": ["System Design: 2 при требуемых 4 для следующего грейда; активность закрывает до 4"],
      "explanation": "Человеко-читаемый текст от LLM, объясняющий выбор"
    }
  ]
}
```
Массив `recommendations` — от 1 до 3 элементов. Может быть **пустым** (сотруднику нечего рекомендовать) — фронт должен это обработать, а не падать.

**Важно для фронта:** `factors` — сырые причины (для отладки/деталей), `explanation` — готовый текст для показа пользователю. Показывайте `explanation`, `factors` можно спрятать под "подробнее".

---

## 4. Отметить активность выполненной
```
POST /employees/:id/activities/:eventId/complete
```
Без тела запроса.

**Ответ 200:**
```json
{
  "status": "ok",
  "updated_skills": { "SK_PYTHON": 3, "SK_SYSTEM_DESIGN": 3, "SK_PUBLIC_SPEAKING": 2 }
}
```
После этого вызова фронт должен перезапросить `/employees/:id` и `/employees/:id/recommendations` — прогресс и список рекомендаций могут измениться.

**404** — если сотрудник или активность не найдены.

---

## 5. HR — проседающие навыки
```
GET /hr/skill-gaps
```
**Ответ 200:**
```json
[
  { "skill_id": "SK_SYSTEM_DESIGN", "skill_name": "System Design", "employees_affected": 47, "avg_gap": 1.8 }
]
```
Отсортировано по `employees_affected` (убыв.) — для графика/таблицы на дашборде.

---

## 6. HR — у кого нет рекомендации
```
GET /hr/no-recommendation
```
**Ответ 200:**
```json
{ "count": 5, "employee_ids": ["E0091", "E0102", "..."] }
```

---

## 7. HR — участие по активностям
```
GET /hr/participation
```
**Ответ 200:**
```json
[
  {
    "event_id": "EV_PUBLIC_SPEAKING_CLUB",
    "title": "Клуб публичных выступлений",
    "completed": 12, "skipped": 30, "declined": 8, "total": 50,
    "completion_rate": 0.24
  }
]
```

---

## 8. Загрузка проверочных профилей (для демо жюри)
```
POST /dataset/load
```
**Тело запроса:**
```json
{
  "employees": [ /* массив employees.json */ ],
  "history": [ /* массив activity_history.csv в виде JSON-объектов */ ]
}
```
**Ответ 200:**
```json
{ "status": "ok", "employees": 3, "history": 12, "events": 40, "skills": 60 }
```
Эта кнопка/форма должна быть в UI (скорее всего скрыто в HR-разделе или отдельная страница «Демо-режим») — жюри на защите грузит сюда свои тестовые профили.

---

## Что важно фронту знать заранее
1. **`recommendations` может быть пустым массивом** — не строить UI, который ломается на этом.
2. **`skills` — объект с произвольными ключами** (`SK_XXX`) — не хардкодить список навыков на фронте, брать динамически.
3. **Ошибки сети от LLM фронт не увидит** — бэк сам фолбэчится, `explanation` всегда придёт заполненным текстом, даже если OpenAI недоступен.
4. После `POST .../complete` — обязательно рефетчить профиль, бэк не пушит обновления сам (нет вебсокетов).

Скинуть это другу как .md-файл, или хватит текстом в чат?