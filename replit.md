# INSTAGRAMSCRAP

Scraper analitik akun Instagram menggunakan EnsembleData API. Mengambil profil + postingan terbaru, menghitung engagement rate dan growth potential, menyimpan ke PostgreSQL.

## Run & Operate

```bash
# Wajib: set PORT, DATABASE_URL, ENSEMBLEDATA_API_TOKEN di .env dulu
pnpm --filter @workspace/db run push            # push schema database (pertama kali)
pnpm --filter @workspace/api-server run dev     # jalankan server di PORT yang diset di .env
```

- `pnpm run typecheck` — typecheck semua package
- `pnpm run build` — build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod schemas dari OpenAPI spec

## Required Environment Variables

| Variable | Keterangan |
|----------|------------|
| `PORT` | Port server (wajib, contoh: `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ENSEMBLEDATA_API_TOKEN` | Token API EnsembleData |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Data source: EnsembleData `https://ensembledata.com/apis/instagram/...`

## Where things live

- `artifacts/api-server/src/lib/instagram.ts` — logic scraping + kalkulasi analitik
- `artifacts/api-server/src/routes/instagram.ts` — REST API routes
- `lib/db/src/schema/` — Drizzle schema (source of truth database)
- `lib/api-spec/openapi.yaml` — kontrak API (source of truth endpoints)

## Gotchas

- `PORT` wajib diisi di `.env` — server langsung crash tanpa variabel ini
- Token EnsembleData ada kuota harian; error `HTTP 495` = kuota habis, reset jam 00:00 UTC
- Endpoint `/instagram/user/posts` membutuhkan `user_id` (pk), bukan username — sudah ditangani otomatis oleh kode
- Base URL yang benar: `https://ensembledata.com/apis/instagram/` (bukan `/apis/ig/`)
