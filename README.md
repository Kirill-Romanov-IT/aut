# Fullstack Project (Next.js + FastAPI)

Базовый шаблон для фулстек-приложения с Next.js на фронтенде и FastAPI на бекенде.

## Структура проекта

- `frontend/` — Next.js приложение (App Router).
- `backend/` — FastAPI сервер.
- `CHANGELOG.md` — История изменений.

## Как запустить

### 1. Бекенд (FastAPI)

Перейдите в папку `backend`, создайте виртуальное окружение и запустите сервер:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Для Mac/Linux
# venv\Scripts\activate  # Для Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Бекенд будет доступен по адресу [http://127.0.0.1:8000](http://127.0.0.1:8000).

### 2. Фронтенд (Next.js)

Перейдите в папку `frontend`, установите зависимости и запустите dev-сервер:

```bash
cd frontend
npm install
npm run dev
```

Фронтенд будет доступен по адресу [http://localhost:3000](http://localhost:3000).

## Тестирование

### 1. Бекенд

```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest
```

### 2. Фронтенд

```bash
cd frontend
npm test
```

## Тестирование интеграции

На главной странице фронтенда есть кнопка **"Протестировать связку фронтенда и бэкэнда"**. При нажатии она отправляет запрос на `http://127.0.0.1:8000/health` и выводит ответ в консоль браузера.
