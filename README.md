# AlgoTeren

React + FastAPI learning platform for competitive programming practice.

## Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Frontend

```bash
cd frontend
node_modules/.bin/vite
```

The frontend proxies `/api` and `/static` to the FastAPI server on port `8000`.

## Demo accounts

- `admin@algoteren.dev` / `Admin123!`
- `student@algoteren.dev` / `Student123!`

