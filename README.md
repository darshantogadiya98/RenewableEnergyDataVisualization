# Full‑Stack Energy Dashboard Boilerplate

This starter repo pairs **React 19 + Vite + TypeScript** with **FastAPI (Python 3.12)** and Postgres, wrapped in Docker‑Compose for a zero‑friction spin‑up.

## 🔥 Quick Start (Local)

```bash
git clone <this‑repo>.git
cd fullstack_boilerplate
cp .env.example .env      # edit secrets if desired
docker compose up --build
```

- Front‑end: <http://localhost:3000>
- Swagger / ReDoc API docs: <http://localhost:8000/docs>

> **Prereqs:** Docker ≥ 24 and Docker Compose plugin.

## 🧩 Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query, Recharts |
| API | FastAPI, Pydantic v3, SQLAlchemy 2 (async) |
| Auth | JWT (15 min access, 7‑day refresh) w/ python‑jose & bcrypt |
| DB | PostgreSQL 16 (via Docker) |
| Dev Ops | Dockerfiles + docker‑compose, .env configuration |

## 🗂️ Folder Structure

```
repo/
├─ backend/
│  ├─ app/                 # FastAPI source
│  └─ requirements.txt
├─ frontend/               # React/Vite SPA
├─ docker-compose.yml
└─ .env.example
```

## 🚀 Next Steps

1. Add TimescaleDB or migrate DB to AWS RDS for production.
2. Wire Grafana/Prometheus for metrics.
3. Set up CI/CD (GitHub Actions) to build & push multi‑arch images.
