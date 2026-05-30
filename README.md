# AlgoTeren Platform

A full-stack competitive programming and olympiad training platform for the NIS Binary club.

## Stack

- React + TypeScript + Vite
- Tailwind CSS with a white and emerald product theme
- Express API with in-memory seed data
- Mock judging backend and Polygon package import simulation

## Run locally

```bash
npm install
npm run dev:api
npm run dev
```

The frontend runs on `http://127.0.0.1:5183` and proxies API calls to `http://127.0.0.1:8791`.

## API

- `GET /api/health`
- `GET /api/bootstrap`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/submissions`
- `GET /api/leaderboard`
- `POST /api/polygon/import`
- `POST /api/polygon/webhook`

The Polygon endpoints accept a JSON package with `problemXml`, `statements`, `tests`, and optional `checker` fields, parse the metadata, and add the generated problem to the active task bank.
