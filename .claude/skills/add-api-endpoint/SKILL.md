---
name: add-api-endpoint
description: Langkah menambah endpoint REST baru end-to-end di Task Manager (route, controller, swagger, api-contract, service + hook di client). Pakai saat user minta endpoint/fitur data baru.
---

# Menambah endpoint API

Ikuti urutan ini dan cocokkan gaya dengan file sejenis yang sudah ada (contoh acuan: fitur `clients`).

## Server

1. **Controller** — `server/src/controllers/<fitur>.controller.js`
   - `export const namaHandler = asyncHandler(async (req, res) => { ... })`
   - Query lewat `req.supabase` (RLS aktif). Jangan pakai Prisma atau `supabaseAdmin` kecuali memang operasi admin.
   - Validasi input → `throw new ApiError(400, "pesan Bahasa Indonesia")`; id → `isUuid()`.
   - List: `parsePaginationParams`, `sanitizeSearch` dari `utils/queryParams.js`; kembalikan `{ items, pagination }`.
   - Respons: `ok(res, data, message)` / `created(res, data, message)`.
2. **Route** — `server/src/routes/<fitur>.routes.js` (Router Express), lalu daftarkan di
   `server/src/routes/index.js` dengan `requireAuth, attachProfile` jika fitur baru.
3. **Swagger** — tambahkan path di `server/src/docs/swagger-ui.js` (bagian `paths`).
4. **Kontrak** — perbarui `docs/api-contract.md`.
5. **RLS** — jika butuh tabel/kolom/akses baru, tambah file SQL bernomor di `server/supabase/sql/policies/`
   dan beri tahu user untuk menjalankannya di Supabase SQL editor. Cek `docs/RBAC.md`.

## Client

6. **Service** — `client/src/services/<fitur>Service.js` memakai `api` dari `api/api.js`;
   ambil `response.data?.data` dan validasi bentuknya.
7. **Hook** — baca: `hooks/use<Fitur>.js` via `useApiData`; tulis: `hooks/use<Fitur>Mutations.js`,
   lalu panggil `emit<Fitur>Changed()` (buat di `utils/<fitur>Events.js` bila belum ada).
8. **UI** — komponen di `components/<fitur>/`, sediakan state loading/empty/error.

## Verifikasi

- `npm run lint -w client` dan `npm run build -w client`.
- Uji endpoint lewat `http://localhost:3000/api-docs` dengan token tiap role yang relevan.
