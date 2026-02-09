# Fullstack Project (Next.js + FastAPI)

Базовый шаблон для фулстек-приложения с Next.js на фронтенде и FastAPI на бекенде.

## Структура проекта

- `frontend/` — Next.js приложение (App Router).
- `backend/` — FastAPI сервер.
- `CHANGELOG.md` — История изменений.

## Требования

- Python 3.10+
- Node.js 18+
- PostgreSQL

## Как запустить

### 1. Бекенд (FastAPI)

Перейдите в папку `backend`, настройте окружение и запустите сервер:

1. Создайте `.env` файл в папке `backend/`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/app_db
   SECRET_KEY=ваш_секретный_ключ
   ```
2. Установите зависимости и запустите:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

### 2. Фронтенд (Next.js)

Перейдите в папку `frontend`, установите зависимости и запустите dev-сервер:

```bash
cd frontend
npm install
npm run dev
```

## Функционал аутентификации

- **Регистрация**: `/register` — создание нового аккаунта.
- **Вход**: главная страница (`/`) — авторизация по имени пользователя и паролю.
- **Профиль**: после входа отображается имя пользователя и кнопка выхода.
- **Сессии**: токен сохраняется в `localStorage` и проверяется при загрузке страницы.

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
