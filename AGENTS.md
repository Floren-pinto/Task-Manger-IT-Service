# AGENTS.md — Task Manager (IT Service)

Aturan bersama untuk semua AI agent (Claude Code, OpenCode). Ini proyek belajar full-stack:
jelaskan keputusan penting secara singkat, utamakan kode yang mudah dibaca daripada yang "pintar".

## Stack

- **client/** — React 19 + Vite 8 + Tailwind 4, React Router 7, axios, lucide-react. JavaScript (JSX), bukan TypeScript.
- **server/** — Express 5 (ESM), Supabase JS client, Swagger UI di `/api-docs`.
- **Database** — PostgreSQL di Supabase. Otorisasi data lewat **RLS** (`server/supabase/sql/`).
- **Prisma** — hanya untuk tooling/migrasi/seed (`server/prisma/`, `server/db.js`). **Jangan** dipakai di route/controller.
- Monorepo npm workspaces (`client`, `server`).

## Perintah

```bash
npm install              # dari root
npm run dev              # server + client bersamaan
npm run dev:server       # node --watch, port 3000
npm run dev:client       # vite, port 5173
npm run lint -w client   # oxlint
npm run build -w client  # cek build
npm test                 # unit test server + client (Vitest, tanpa database)
npm run test:integration # API + RLS per role ke project Supabase TEST (server/.env.test)
```

Setelah mengubah kode, jalankan `npm test`; untuk client juga `lint` dan `build`. Helper murni baru
→ tambahkan unit test. Perubahan RLS/trigger/RPC atau endpoint → tambahkan/ubah integration test
di `server/tests/integration/` (panduan: `docs/testing.md`).
Env: `server/.env` (`SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`, opsional `SUPABASE_SERVICE_ROLE_KEY`),
`server/.env.test` (project Supabase khusus test), dan `client/.env` (`VITE_*`).
**Jangan pernah membaca, mencetak, atau meng-commit file `.env` / `.env.*`.**

## Arsitektur server

Alur: `src/routes/index.js` → `requireAuth` → `attachProfile` → `*.routes.js` → `*.controller.js`.

- `requireAuth` memverifikasi JWT Supabase dan membuat `req.supabase` (client dengan token user → RLS aktif).
- `attachProfile` mengisi `req.profile` (`role`, `division_id`, ...).
- Query data user **selalu** lewat `req.supabase`. `supabaseAdmin` (service role) hanya untuk operasi
  admin yang memang tidak bisa lewat RLS (contoh: membuat akun Auth).
- Bungkus handler dengan `asyncHandler`, lempar error dengan `new ApiError(status, message)`,
  respons sukses lewat `ok()` / `created()` dari `utils/ApiResponse.js` → `{ success, message, data }`.
- Pagination/search: pakai helper di `utils/queryParams.js`.
- Endpoint baru → tambahkan juga dokumentasinya di `src/docs/swagger-ui.js` dan `docs/api-contract.md`.

## Arsitektur client

`services/*Service.js` (axios via `api/api.js`) → `hooks/use*.js` (umumnya lewat `useApiData`) →
`components/<fitur>/` → `pages/` → `routes/AppRoutes.jsx` (guard di `RouteGuards.jsx`).

- Mutasi ada di `hooks/use*Mutations.js`; setelah berhasil, panggil `emit*Changed()` dari `utils/*Events.js`
  agar list lain refresh.
- Konstanta label/status di `constants/`, format tanggal/angka di `utils/formatters.js`.
- Komponen umum: `components/ui/` (`ConfirmDialog`, `FormField`, `DataPagination`). Pakai ulang sebelum membuat baru.
- Setiap halaman wajib punya state loading, empty, dan error. Layout responsif: tabel di desktop, card list di mobile.
- Teks UI dan pesan error dalam **Bahasa Indonesia**.

## Role & akses

Role: `SUPER_ADMIN`, `MANAGER_DIVISION`, `STAFF`, `TECHNICIAN`. Detail per tabel ada di `docs/RBAC.md`.
RLS adalah sumber kebenaran; pengecekan role di server/client hanya untuk UX dan pesan error yang jelas.

## Database / SQL

- SQL Supabase ada di `server/supabase/sql/{functions,policies,triggers,grants,realtime,migrations}`,
  diberi prefix nomor urut (`05_...sql`).
- Kalau mengubah/menambah SQL, **sebutkan di akhir jawaban file mana yang harus dijalankan manual di Supabase SQL editor**.
- Perubahan skema Prisma → `server/prisma/schema.prisma` + migrasi baru; jangan edit migrasi lama.

## Dokumen (baca hanya jika relevan)

| File | Kapan dibaca |
|---|---|
| `docs/README.md` | Indeks semua dokumen |
| `docs/erd.md`, `docs/database.md` | Menyentuh skema, relasi, RLS, trigger, function |
| `docs/architecture.md` | Perlu gambaran alur request/auth/upload/realtime |
| `docs/roadmap.md` | Memilih pekerjaan berikutnya; centang item yang selesai |
| `docs/srs.md` | Kebutuhan fungsional (FR-xx), scope fitur |
| `docs/RBAC.md` | Menyentuh hak akses, RLS, policy |
| `docs/api-contract.md` | Menambah/mengubah endpoint |
| `docs/ui-spec.md` | Membuat/mengubah halaman atau komponen |
| `docs/archive/` | Rencana lama yang sudah selesai — jangan diikuti kecuali diminta |

Rencana fitur baru tulis di `docs/plans/<fitur>.md` agar agent lain bisa melanjutkan.

## Git

- Jangan kerja langsung di `main`. Branch: `feat/<fitur>`, `fix/<topik>`, `chore/<topik>`, `docs/<topik>`.
- Commit: Conventional Commits dengan scope, contoh `feat(report): add service history page`.
- Commit/push hanya jika diminta.
