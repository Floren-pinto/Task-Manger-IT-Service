# Tech Stack — Teknologi & Konsep yang Dipakai

Untuk setiap teknologi: **apa itu**, **dipakai untuk apa di proyek ini**, **di mana melihatnya**,
dan **konsep yang perlu dikuasai**. Gunakan sebagai daftar periksa belajar.

---

## Frontend (`client/`)

### React 19
- **Apa:** library untuk membangun UI dari komponen.
- **Di proyek ini:** seluruh tampilan. Komponen fungsi + hooks, tanpa class component.
- **Lihat:** [`client/src/pages/TasksPage.jsx`](../client/src/pages/TasksPage.jsx), [`client/src/hooks/useApiData.js`](../client/src/hooks/useApiData.js)
- **Konsep wajib:** props vs state · `useState`, `useEffect`, `useCallback`, `useRef`, `useContext` ·
  custom hook · *lifting state up* · rendering list dengan `key` · controlled form ·
  StrictMode (efek dijalankan dua kali saat dev).

### Vite 8
- **Apa:** dev server & bundler. Hot reload cepat; `vite build` menghasilkan file statis di `dist/`.
- **Lihat:** [`client/vite.config.js`](../client/vite.config.js)
- **Konsep:** variabel env harus berawalan `VITE_` agar terbaca di browser (dan karena itu **jangan** isi rahasia).

### Tailwind CSS 4
- **Apa:** CSS lewat class utilitas (`flex gap-2 text-sm`).
- **Di proyek ini:** semua styling; responsif dengan prefix `md:` / `lg:` (tabel desktop, card mobile).
- **Konsep:** mobile-first breakpoint, design token di [`ui-spec.md`](ui-spec.md).

### React Router 7
- **Apa:** routing sisi client (URL → halaman tanpa reload).
- **Lihat:** [`routes/AppRoutes.jsx`](../client/src/routes/AppRoutes.jsx), [`routes/RouteGuards.jsx`](../client/src/routes/RouteGuards.jsx)
- **Konsep:** nested route + `<Outlet/>` · layout route · route guard · `useParams`, `useNavigate` ·
  `location.state` (dipakai untuk modal-route `backgroundLocation`).

### axios
- **Apa:** HTTP client.
- **Lihat:** [`api/api.js`](../client/src/api/api.js)
- **Konsep:** instance dengan `baseURL` · **interceptor** request (tempel token) & response (tangani 401).

### supabase-js (di browser)
- Login (`signInWithPassword`), menyimpan & memperbarui session, upload Storage, Realtime.
- **Lihat:** [`services/supabaseClient.js`](../client/src/services/supabaseClient.js), [`contexts/AuthContext.jsx`](../client/src/contexts/AuthContext.jsx)

### lucide-react · oxlint
- Ikon SVG sebagai komponen React · linter cepat (`npm run lint -w client`).

---

## Backend (`server/`)

### Node.js + ES Modules
- `"type": "module"` → pakai `import/export`, bukan `require`. Ekstensi `.js` wajib ditulis di import.
- `node --watch` merestart server saat file berubah.

### Express 5
- **Apa:** framework HTTP minimalis berbasis middleware.
- **Lihat:** [`src/app.js`](../server/src/app.js), [`src/routes/index.js`](../server/src/routes/index.js)
- **Konsep wajib:** `req`/`res`/`next` · urutan middleware · `Router` · error middleware (4 argumen) ·
  `req.params`, `req.query`, `req.body`.
- **Khusus Express 5:** error dari fungsi `async` sudah diteruskan otomatis ke error handler, dan
  `req.query` adalah getter (alasan `boolParser` memakai `Object.defineProperty`). `asyncHandler`
  tetap dipakai agar konsisten.

### Swagger (swagger-jsdoc + swagger-ui-express)
- Dokumentasi API interaktif di `http://localhost:3000/api-docs`. Bisa mencoba endpoint dengan token.
- **Lihat:** [`src/docs/swagger-ui.js`](../server/src/docs/swagger-ui.js)

### dotenv
- Membaca `server/.env` ke `process.env`. [`config/env.js`](../server/src/config/env.js) memvalidasi
  variabel wajib saat server menyala (*fail fast*).

---

## Database & BaaS

### PostgreSQL
- Database relasional. **Konsep wajib:** primary/foreign key · JOIN · index · transaksi ·
  enum · `jsonb` · constraint `UNIQUE` · `ON DELETE CASCADE/RESTRICT/SET NULL` · normalisasi vs denormalisasi.

### Supabase
"Backend-as-a-Service" di atas PostgreSQL. Yang dipakai:

| Fitur | Untuk | Dokumen |
|---|---|---|
| **Auth** | Login email/password, JWT | [architecture.md §4](architecture.md#4-alur-autentikasi-login-sampai-request-pertama) |
| **PostgREST** | API otomatis untuk tabel (dipakai oleh `supabase-js` `.from()`) | — |
| **RLS** | Otorisasi per baris | [database.md §3](database.md#3-rls-row-level-security--konsep-inti) |
| **Storage** | File lampiran | [database.md §7](database.md#7-storage-file-lampiran) |
| **Realtime** | Notifikasi langsung | [database.md §8](database.md#8-realtime) |

**Query builder `supabase-js`** — kenali polanya:

```js
const { data, error, count } = await req.supabase
  .from("tasks")
  .select("id, title, client:clients(id, name)", { count: "exact" }) // embed relasi via FK
  .eq("status", "PENDING")       // WHERE status = 'PENDING'
  .is("deleted_at", null)        // WHERE deleted_at IS NULL
  .or("title.ilike.%abc%,id.ilike.%abc%")
  .order("created_at", { ascending: false })
  .range(0, 19);                 // LIMIT 20 OFFSET 0
```

Supabase **tidak melempar exception** — selalu cek `error`.

### Prisma 7
- ORM; di proyek ini **hanya** untuk mendefinisikan skema dan membuat migrasi.
- **Lihat:** [`server/prisma/schema.prisma`](../server/prisma/schema.prisma), [`server/db.js`](../server/db.js)
- **Konsep:** model, relasi, `@map`/`@@map` (nama di kode vs di DB), migrasi berurutan
  (jangan edit migrasi lama).

---

## Konsep lintas teknologi

| Konsep | Penjelasan singkat | Di mana terlihat |
|---|---|---|
| **JWT** | Token bertanda tangan berisi identitas user; dikirim di header `Authorization: Bearer` | `auth.middleware.js` |
| **RBAC** | Hak akses berdasarkan role | [RBAC.md](RBAC.md) |
| **Soft delete** | Tandai `deleted_at`, jangan hapus baris | `tasks`, `clients`, `assets`, `users` |
| **Audit trail / immutable log** | Data yang hanya boleh ditambah, tidak diubah | `task_status_history`, `service_reports` |
| **Snapshot / denormalisasi** | Simpan salinan data agar laporan tidak berubah | `service_reports.snapshot_data` |
| **Pagination offset** | `page` & `limit` → `range(from, to)` | `utils/queryParams.js` |
| **Debounce** | Tunda pencarian sampai user berhenti mengetik | `hooks/useDebouncedValue.js` |
| **Race condition di UI** | Respons lama menimpa yang baru | `requestId` di `useApiData.js` |
| **Defense in depth** | Pengecekan berlapis: UI → Express → RLS | Seluruh proyek |
| **Monorepo / workspaces** | Dua paket dalam satu repo, satu `npm install` | `package.json` root |
| **Conventional Commits** | `feat(scope): pesan` | riwayat git |

---

## Urutan belajar yang disarankan

1. JavaScript modern (async/await, destructuring, modules) → 2. React dasar + hooks →
3. HTTP & REST (method, status code, header) → 4. Express → 5. SQL & PostgreSQL →
6. Supabase Auth + RLS → 7. Arsitektur berlapis & pola proyek ini → 8. Testing & deployment.

Panduan membaca kode langkah demi langkah ada di [learning-guide.md](learning-guide.md).
