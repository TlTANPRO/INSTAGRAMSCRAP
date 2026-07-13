# INSTAGRAMSCRAP

Scraper analitik akun Instagram menggunakan [EnsembleData API](https://ensembledata.com).  
Mengambil profil + postingan terbaru, menghitung engagement rate, hashtag teratas, growth potential, dan menyimpan hasilnya ke PostgreSQL.

> 📖 **Panduan lengkap, token EnsembleData, dan troubleshooting** →  
> [github.com/TlTANPRO/TITANPRO](https://github.com/TlTANPRO/TITANPRO)

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/TlTANPRO/INSTAGRAMSCRAP.git
cd INSTAGRAMSCRAP
pnpm install
```

### 2. Buat file `.env`

```env
# Wajib — server crash jika tidak diisi
PORT=5000

# Wajib — koneksi PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/instagramscrap

# Wajib — token EnsembleData (cek token aktif di repo TITANPRO)
ENSEMBLEDATA_API_TOKEN=F79tRykPWKcq0qQL
```

### 3. Push schema database

```bash
pnpm --filter @workspace/db run push
```

### 4. Jalankan server

```bash
pnpm --filter @workspace/api-server run dev
# Server berjalan di http://localhost:5000
```

### 5. Verifikasi server

```bash
curl http://localhost:5000/api/healthz
# {"status":"ok"}
```

### 6. Scraping pertama

```bash
curl -X POST http://localhost:5000/api/instagram/analyses \
  -H "Content-Type: application/json" \
  -d '{"input": "nike"}'
```

---

## Endpoint API

| Method | Path | Keterangan |
|--------|------|------------|
| `GET`  | `/api/healthz` | Status server |
| `POST` | `/api/instagram/analyses` | Mulai analisis akun baru |
| `GET`  | `/api/instagram/analyses` | Daftar semua analisis |
| `GET`  | `/api/instagram/analyses/:id` | Detail satu analisis |
| `DELETE` | `/api/instagram/analyses/:id` | Hapus analisis |

**Format input yang diterima:**
```
"nike"
"@nike"
"https://www.instagram.com/nike/"
"https://www.instagram.com/nike/?hl=id"
```

---

## Stack

- **Runtime:** Node.js 24, TypeScript, pnpm workspaces
- **API:** Express 5
- **Database:** PostgreSQL + Drizzle ORM
- **Data source:** EnsembleData `/apis/instagram/user/info` + `/apis/instagram/user/posts`

## Struktur

```
artifacts/api-server/       ← Backend Express 5
  src/lib/instagram.ts      ← Logic scraping + analitik
  src/routes/instagram.ts   ← REST endpoints
lib/db/                     ← Drizzle schema + PostgreSQL
```
