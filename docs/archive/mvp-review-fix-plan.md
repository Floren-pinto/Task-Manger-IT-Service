# Plan Perbaikan Hasil Review MVP

> Status: **disetujui, implementasi berjalan**. Tanggal review: 2026-10-28 · Basis kode: branch `fix/user-status-rls` (commit `155937c`).
>
> Progres:
> - Keputusan: K1 = a.
> - Fase 1 ✅ A1, A2, A3, A5, B10 (A3 ikut menambah cek role di `asset.controller.js`, pemetaan
>   `42501` di `createAsset`, dan tabel `assets`/`users` di `RBAC.md`). Tambahan: policy SELECT `users` mengizinkan
>   baris milik sendiri, dan policy UPDATE profil sendiri mewajibkan akun aktif (lihat catatan A1).
> - Fase 2 ✅ B1, B2, B3, C6, C7 (bagian client). Di-merge lewat PR #35.
> - Keputusan: K3 = a (perbaikan jam di client, tanpa migrasi `timestamptz`).
> - Fase 3 ✅ A6, B5, B9, B11 (storage error). Tambahan: server memvalidasi `fileType`;
>   helper `getErrorMessage()` di `utils/errorMessage.js`; refetch detail task tidak lagi
>   menutup drawer.
> - Fase 4 ✅ B4, B6, B7, B11 (pagination). B4 mencakup `parseDbDate()` di client,
>   `utils/dateTime.js` di server (batas hari WIB dikonversi ke UTC karena PostgreSQL
>   mengabaikan offset pada kolom `TIMESTAMP` tanpa zona), kolom export CSV dalam WIB, dan
>   `get_dashboard_summary()` memakai hari WIB (roadmap 3.7).
> - Fase 5–7 belum dikerjakan.

Dokumen ini berisi hasil review menyeluruh (server, SQL/RLS, client) setelah aplikasi mencapai MVP,
beserta alasan setiap perbaikan dan urutan implementasinya.

## Cara membaca

| Kolom | Arti |
|---|---|
| **Prioritas** | 🔴 Kritis (celah keamanan / data rusak) · 🟠 Tinggi (bug yang dialami user) · 🟡 Sedang · ⚪ Rendah (kerapian) |
| **SQL** | ✅ = butuh perubahan SQL yang dijalankan manual di Supabase SQL editor |
| **Roadmap** | Nomor item di [`docs/roadmap.md`](../roadmap.md) bila temuan sudah pernah dicatat |

Prinsip yang dipakai saat menilai: **browser memegang anon key + JWT user**, jadi semua aturan yang
hanya ada di Express bisa dilewati dengan memanggil Supabase langsung. RLS adalah pintu terakhir.

---

## 0. Keputusan yang perlu kamu ambil dulu

Beberapa perbaikan bergantung pada aturan bisnis yang belum tegas di dokumen. Pilihan yang
saya rekomendasikan ditandai **(rekomendasi)**.

| # | Pertanyaan | Pilihan |
|---|---|---|
| K1 | Apakah TECHNICIAN boleh membuat/mengubah/menghapus **asset**? Saat ini RLS `assets` mengizinkan semua role, sedangkan `clients` melarang TECHNICIAN. | a) Samakan dengan `clients`: TECHNICIAN hanya baca, STAFF tidak boleh arsip **(rekomendasi)** · b) Biarkan semua role boleh menulis, tapi tulis di `RBAC.md` |
| K2 | `MANAGER_DIVISION` melihat & mengubah task **semua divisi** atau **divisinya saja**? `RBAC.md` bertentangan sendiri ("pada divisinya" vs tabel "Semua"). | a) Biarkan semua divisi, perbaiki teks `RBAC.md` **(rekomendasi untuk MVP, perubahan kecil)** · b) Batasi per divisi (ubah 6+ policy) |
| K3 | Cara memperbaiki jam yang bergeser (lihat B4). | a) Perbaiki di client: anggap timestamp tanpa zona = UTC **(rekomendasi, tanpa ubah DB)** · b) Migrasi semua kolom ke `timestamptz` |
| K4 | Apakah "Allow new users to sign up" di Supabase Auth sudah dimatikan? (lihat A2) | Cek di Dashboard → Authentication → Sign In / Providers. Apa pun jawabannya, A2 tetap dikerjakan sebagai lapisan kedua. |

---

## A. Keamanan

### A1 🔴 User nonaktif/diarsip masih punya akses penuh lewat Supabase langsung — SQL ✅

- **Lokasi:** [`00_helper_functions.sql`](../../server/supabase/sql/functions/00_helper_functions.sql), dipakai semua policy.
- **Masalah:** `get_my_role()` dan `get_my_division()` tidak memeriksa `is_active` / `deleted_at`.
  Express memblokir user nonaktif lewat `attachProfile`, tetapi RLS tidak. Sejak perbaikan
  `fix/user-status-rls`, akun nonaktif juga tidak di-ban di Supabase Auth lagi, jadi user itu
  masih bisa login dan memakai JWT-nya untuk membaca/mengubah data langsung lewat REST, Realtime,
  dan Storage Supabase.
- **Kenapa penting:** menonaktifkan karyawan yang keluar seharusnya memutus akses. Saat ini hanya
  memutus akses lewat Express.
- **Perbaikan:**
  ```sql
  create or replace function get_my_role() returns text as $$
    select role::text from users
    where id = auth.uid()::text and is_active and deleted_at is null;
  $$ language sql stable security definer set search_path = public;
  ```
  Sama untuk `get_my_division()`. Karena semua policy membandingkan `get_my_role() = '...'`,
  nilai `NULL` otomatis menolak semua akses. `SUPER_ADMIN` tetap bisa mengelola user lain karena
  dia sendiri aktif.
- **Ikut diperbaiki:** tambahkan `set search_path = public` (lihat A5).
- **Catatan implementasi:** setelah perubahan ini user nonaktif tidak bisa membaca profilnya sendiri,
  sehingga `attachProfile` akan membalas 404, bukan 403. Karena itu policy SELECT `users` diberi
  `id = auth.uid()::text` (selalu boleh membaca baris sendiri), dan policy UPDATE profil sendiri
  ditambah `is_active` ([`09_users_policy.sql`](../../server/supabase/sql/policies/09_users_policy.sql)).

### A2 🔴 Siapa pun bisa mendaftar sendiri dan langsung jadi TECHNICIAN aktif — SQL ✅

- **Lokasi:** [`02_user_sync_functions.sql`](../../server/supabase/sql/functions/02_user_sync_functions.sql)
- **Masalah:** anon key ada di bundle client (memang publik). Bila sign-up publik di Supabase
  masih aktif (default-nya aktif), siapa pun bisa memanggil `supabase.auth.signUp()`. Trigger
  `handle_new_auth_user` lalu membuat profil `role = 'TECHNICIAN'`, `is_active = TRUE`.
  Dengan RLS sekarang, akun itu bisa membaca semua client, serta membuat/mengubah/mengarsip asset.
- **Kenapa penting:** orang luar bisa melihat data pelanggan dan merusak data asset.
- **Perbaikan:**
  1. Trigger membuat profil dengan `is_active = FALSE`. `createUser` di server sudah meng-update
     `is_active: true`, jadi alur SUPER_ADMIN tidak berubah.
  2. Matikan sign-up publik di Supabase Dashboard (K4), dan tulis langkah ini di README.

### A3 🟠 Hak tulis `assets` terlalu longgar — SQL ✅ (tergantung K1)

- **Lokasi:** [`03_assets_policy.sql`](../../server/supabase/sql/policies/03_assets_policy.sql),
  [`clientConstants.js`](../../client/src/constants/clientConstants.js) (`assetWriteRoles`).
- **Masalah:** policy INSERT/UPDATE `WITH CHECK (TRUE)`: TECHNICIAN dan STAFF bisa membuat, memindahkan
  ke client lain, mengarsip, dan memulihkan asset. Ini tidak konsisten dengan `clients`
  (TECHNICIAN tidak boleh menulis, STAFF tidak boleh mengarsip), dan `assets` tidak tercantum di `RBAC.md`.
- **Perbaikan (bila K1 = a):** salin pola policy `clients` ke `assets`, ubah `assetWriteRoles` di
  client, tambahkan tabel `assets` dan `users` ke `RBAC.md`.

### A4 🟡 Kolom "pembuat" bisa dipalsukan — SQL ✅ · Roadmap 1.1 (diperluas)

- **Lokasi:** `04_tasks_policy.sql`, `07_task_attachments_policy.sql`, `08_service_reports_policy.sql`, `06_task_status_history_policy.sql`.
- **Masalah:** policy INSERT tidak memeriksa `created_by_id` / `uploaded_by_id` / `user_id = auth.uid()`.
  Server mengisinya dengan benar, tetapi pemanggilan Supabase langsung bisa mengisi ID orang lain.
  Selain itu TECHNICIAN bisa `UPDATE tasks SET status = ...` langsung (kolom `status` diizinkan
  trigger), melewati RPC `update_task_status`, sehingga **tidak ada riwayat status dan notifikasi**.
- **Kenapa penting:** audit trail (siapa membuat laporan, siapa mengubah status) jadi tidak bisa dipercaya.
- **Perbaikan:**
  - Tambahkan `AND created_by_id = auth.uid()::text` (dan padanannya) di `WITH CHECK` keempat policy.
  - Policy `service_reports` juga cek `tasks.status = 'COMPLETED'` (roadmap 1.1).
  - Status hanya boleh berubah lewat RPC: ubah `update_task_status` menjadi `SECURITY DEFINER`
    (dengan pengecekan role/divisi di dalam fungsi), lalu keluarkan `status` dari kolom yang
    boleh diubah TECHNICIAN di trigger. *Ini perubahan paling besar di bagian A; bisa ditunda ke
    fase berikutnya bila terlalu berat.*

### A5 🟡 Fungsi `SECURITY DEFINER` tanpa `search_path` — SQL ✅

- **Lokasi:** `get_my_role`, `get_my_division`, `insert_notification_on_task_assignment`, `insert_notification_on_task_status_change`.
- **Masalah:** fungsi yang berjalan dengan hak pemilik tanpa `SET search_path` bisa dibajak dengan
  membuat objek bernama sama di schema lain. Supabase Database Linter menandai ini sebagai peringatan keamanan.
- **Perbaikan:** tambahkan `SET search_path = public` di keempat fungsi (dikerjakan bersama A1).

### A6 🟡 Endpoint upload lampiran bisa menghapus file yang bukan miliknya

- **Lokasi:** [`task.controller.js`](../../server/src/controllers/task.controller.js) `createTaskAttachment` (±baris 437–449).
- **Masalah:** bila `filePath` tidak cocok dengan `taskId`, server **menghapus file di `filePath`
  itu** sebelum menolak request. Manager bisa (sengaja atau karena bug client) menghapus file task lain
  dengan mengirim `filePath` milik task lain. Validasi juga hanya melihat segmen pertama, jadi path
  seperti `taskA/../taskB/x` lolos pengecekan server.
- **Perbaikan:** validasi format path dulu (`^<taskId>/[^/]+$`, tanpa `..`). Bila tidak valid,
  tolak dengan 400 **tanpa** menghapus apa pun. File hanya dihapus bila insert database gagal
  untuk path yang sudah valid.

### A7 ⚪ Hardening produksi · Roadmap 3.1

CORS masih terbuka (`app.js`), belum ada `helmet` dan rate limit, `/api-docs` tetap aktif di
production. Tidak mendesak untuk MVP lokal, tapi wajib sebelum deploy. Usul: matikan Swagger bila
`NODE_ENV === "production"`.

---

## B. Bug fungsional

### B1 🟠 User nonaktif yang login terjebak di dashboard kosong

- **Lokasi:** [`AuthContext.jsx`](../../client/src/contexts/AuthContext.jsx), [`api.js`](../../client/src/api/api.js).
- **Masalah:** login ke Supabase berhasil, lalu `/auth/me` membalas 403 `"Account is inactive"`.
  `userProfile` jadi `null`, tetapi `isAuthenticated` tetap `true`, jadi user masuk dashboard dan
  setiap request gagal. Interceptor hanya menangani 401. Sejak ban Auth dihapus, kasus ini pasti terjadi.
- **Perbaikan:** di `loadUserProfile`, bila respons 403 → `signOut()` dan kembalikan pesan
  "Akun Anda tidak aktif. Hubungi administrator." ke `LoginPage`. `signIn` mengembalikan
  `success: false` dalam kasus itu.

### B2 🟠 Refresh halaman `/users` melempar SUPER_ADMIN ke dashboard (perlu dikonfirmasi di browser)

- **Lokasi:** `AuthContext.jsx` baris 73–79, [`RouteGuards.jsx`](../../client/src/routes/RouteGuards.jsx).
- **Masalah:** `onAuthStateChange` memancarkan event `INITIAL_SESSION` saat subscribe dan langsung
  `setLoading(false)` sebelum `/auth/me` selesai. `AdminRoute` melihat `loading = false` dan
  `userProfile = null`, lalu redirect ke `/dashboard`. Efek samping: `/auth/me` dipanggil dua kali saat
  aplikasi dibuka. `ProtectedRoute` juga tidak menunggu `loading`, jadi refresh halaman sempat
  dialihkan ke `/login` lalu balik lagi (dan query string seperti filter hilang karena hanya
  `pathname` yang disimpan).
- **Perbaikan:** buat satu sumber status: `loading` baru `false` setelah profil selesai dimuat;
  abaikan `INITIAL_SESSION` (sudah ditangani `initializeAuth`); `ProtectedRoute` menampilkan
  `<Loading />` selama `loading`; simpan `pathname + search` saat redirect. Hapus `setLoading` dari
  nilai context (tidak dipakai dari luar).

### B3 🟠 Tombol "Reset password" mengirim email, tapi tidak ada halaman untuk membuat password baru · Roadmap 2.4

- **Lokasi:** `UsersPage.jsx` (±baris 162), `userService.js` `resetPassword`.
- **Masalah:** link di email membuat user login dan diarahkan ke `/login`, lalu `PublicRoute` langsung
  memindahkannya ke dashboard. User tidak pernah diminta mengisi password baru. Fitur yang
  terlihat di UI tidak bekerja.
- **Perbaikan:** halaman `/reset-password` yang mendengarkan event `PASSWORD_RECOVERY` lalu
  memanggil `supabase.auth.updateUser({ password })`; `redirectTo` diarahkan ke halaman itu.

### B4 🟠 Jam yang ditampilkan kemungkinan bergeser 7–9 jam (perlu dikonfirmasi) — tergantung K3

- **Lokasi:** semua kolom waktu bertipe `TIMESTAMP(3)` **tanpa** zona waktu (migrasi Prisma);
  [`formatters.js`](../../client/src/utils/formatters.js) `formatDate` / `formatRelativeTime`.
- **Masalah:** database menyimpan waktu UTC tanpa penanda zona, lalu PostgREST mengirim string seperti
  `2026-10-28T03:00:00.123` (tanpa `Z`). `new Date()` di browser membacanya sebagai **waktu lokal**,
  sehingga task yang dibuat pukul 10:00 WIB tampil 03:00, dan "5 menit lalu" tampil "7 jam lalu".
  Cara cek: buat task baru dan lihat jam "dibuat" di activity log.
- **Perbaikan (K3 = a):** helper `parseDbDate(value)` di `formatters.js` yang menambahkan `Z` bila
  string tidak punya offset; pakai di semua formatter. Filter tanggal di server (`normalizeDateBound`,
  `completedFrom/To`) juga diseragamkan agar memakai batas hari WIB (`+07:00`), bukan UTC.
  Termasuk roadmap 3.7 (`current_date` di dashboard).

### B5 🟠 Upload gagal untuk nama file dengan karakter tertentu

- **Lokasi:** [`useTaskMutations.js`](../../client/src/hooks/useTaskMutations.js) baris 51.
- **Masalah:** nama file asli dipakai mentah di path Storage (`${Date.now()}-${file.name}`).
  Supabase Storage menolak key dengan karakter non-ASCII atau beberapa simbol (mis. `#`, `?`, `%`, huruf
  beraksen, emoji) dengan error "Invalid key". Server juga tidak memvalidasi ukuran dan tipe file:
  validasi hanya di browser.
- **Perbaikan:** slugify nama file untuk path (nama asli tetap disimpan di `file_name`); atur
  "allowed MIME types" dan "file size limit" di pengaturan bucket `task_attachments` agar batas
  5 MB/JPEG/PNG/WEBP/PDF juga ditegakkan oleh Supabase.

### B6 🟡 Task bisa memakai asset milik client lain

- **Lokasi:** `task.controller.js` `createTask` & `updateTask`; `asset.controller.js` `updateAsset`.
- **Masalah:** server tidak memeriksa bahwa `assetId` milik `clientId`. Memindahkan asset ke client
  lain juga tidak memeriksa task yang sudah memakainya. Akibatnya riwayat servis dan laporan bisa
  menampilkan pasangan client–asset yang salah.
- **Perbaikan:** di create/update task, bila ada `assetId`, ambil asset dan cek `client_id` sama.
  Di `updateAsset`, tolak pindah client (409) bila asset sudah dipakai task.

### B7 🟡 `updated_at` tidak pernah berubah untuk clients, assets, divisions, service_reports — SQL ✅ · Roadmap 1.6 (sebagian)

- **Lokasi:** [`04_updated_at_triggers.sql`](../../server/supabase/sql/triggers/04_updated_at_triggers.sql).
- **Masalah:** `@updatedAt` di Prisma hanya bekerja bila update lewat Prisma. Aplikasi meng-update
  lewat Supabase, dan trigger `set_updated_at` hanya dipasang di `tasks` dan `users` (yang untuk
  `users` pun salah nama: `set_tasks_updated_at`).
- **Perbaikan:** tambahkan trigger untuk `clients`, `assets`, `divisions`, `teams`; ganti nama trigger
  `users` menjadi `set_users_updated_at`.

### B8 🟡 Export CSV & filter teknisi rusak saat data banyak

- **Lokasi:** `serviceHistory.controller.js` `fetchLatestReports` dan filter `technicianId`;
  `task.controller.js` `listTasks` (filter `technicianId`).
- **Masalah:** daftar ID dikirim lewat URL (`.in("task_id", [...])`). Export mengizinkan 5000 baris,
  jadi URL bisa mencapai ~185 KB, jauh di atas batas panjang URL gateway Supabase. Export akan gagal
  dengan error 500 begitu riwayat mencapai beberapa ratus task. Export juga memotong diam-diam di
  5000 baris.
- **Perbaikan:** ganti filter teknisi dengan embed `!inner`
  (`assignments:task_assignments!inner(user_id)` + `.eq("assignments.user_id", id)`); ambil report
  dalam potongan (mis. 200 ID per request); tambahkan header/catatan bila hasil export terpotong.

### B9 🟡 Masalah UX di detail task

- **Lokasi:** [`TaskDetailPage.jsx`](../../client/src/pages/TaskDetailPage.jsx), [`TaskAttachmentsSection.jsx`](../../client/src/components/tasks/TaskAttachmentsSection.jsx).
- **Masalah & alasan:**
  1. Hapus lampiran tanpa konfirmasi (padahal ada `ConfirmDialog`). Satu klik salah langsung menghapus bukti kerja.
  2. Tombol hapus tampil untuk semua role (STAFF selalu kena 403) dan hanya muncul saat hover
     (`opacity-0 group-hover`), jadi **tidak bisa diakses di HP**.
  3. Toast error memakai `err.message`, jadi user melihat "Request failed with status code 403",
     bukan pesan dari server.
  4. Setelah ubah status, data task tidak di-refetch: activity log/riwayat tidak menampilkan
     perubahan sampai halaman dibuka ulang.
- **Perbaikan:** pakai `ConfirmDialog`; `canDeleteAttachment` per role (SUPER_ADMIN/MANAGER, atau
  TECHNICIAN untuk file sendiri); tombol selalu terlihat di layar sentuh; helper
  `getErrorMessage(err)` bersama; panggil `refetch()` setelah status berhasil.

### B10 ⚪ Notifikasi "status berubah" juga dikirim ke orang yang mengubahnya — SQL ✅

- **Lokasi:** `insert_notification_on_task_status_change` (`UNION SELECT NEW.user_id`).
- **Masalah:** teknisi yang mengubah status menerima notifikasi atas tindakannya sendiri. Manager
  yang nonaktif juga tetap menerima notifikasi.
- **Perbaikan:** buang `NEW.user_id` dari daftar penerima (atau `WHERE user_id <> NEW.user_id`) dan
  filter `is_active AND deleted_at IS NULL` untuk manager.

### B11 ⚪ Lain-lain kecil

- `parsePaginationParams` menerima `page=1.5` → offset pecahan. Pakai `Math.floor`.
- `storage.remove()` mengembalikan `{ error }`, tidak melempar. `try/catch` di `createTaskAttachment`
  & `deleteTaskAttachment` tidak pernah menangkap kegagalan, jadi file yatim tidak tercatat di log.
- `NotificationBell` dirender di `Sidebar` dan `MobileHeader` sekaligus, sehingga polling & refetch unread
  count berjalan dua kali. Angkat `useUnreadNotificationCount` ke `DashboardLayout` lalu kirim sebagai prop.
- Status task boleh pindah ke mana saja dan teknisi bisa ditugaskan ke task `COMPLETED`/`CANCELLED`
  (roadmap 1.4, state machine status).

---

## C. Inkonsistensi kode

Tidak berbahaya, tetapi membuat kode lebih sulit dipelajari dan memicu bug serupa di masa depan.

| # | Temuan | Lokasi | Perbaikan |
|---|---|---|---|
| C1 | Tiga versi `sanitizeSearch` dengan aturan berbeda (yang satu membuang `*`, yang lain tidak; satu membuang `#` di depan) | `utils/queryParams.js`, `task.controller.js`, `serviceHistory.controller.js` | Satu fungsi di `queryParams.js` dengan opsi `stripHash`; `*` dan `\` selalu dibuang (wildcard PostgREST) |
| C2 | `listTasks` menghitung pagination sendiri (roadmap 1.6) | `task.controller.js` baris 46–49 | Pakai `parsePaginationParams` |
| C3 | Validasi tidak seragam: `updateClient`/`updateAsset` diam-diam mengabaikan `name: ""` dan `deleted: "yes"`, sedangkan `updateUser`/`updateTask` membalas 400. `createTask`/`updateTask` tidak membatasi panjang teks | client, asset, task controller | Samakan aturan: string kosong → 400, `deleted` non-boolean → 400, batas panjang (mis. 200 untuk nama/judul). Zod (roadmap 1.3) bisa menyusul |
| C4 | Pemetaan error tidak lengkap: `createAsset` tidak memetakan `42501` (jadi 500), `createTask` tidak memetakan `42501`, `updateTaskStatus` mencocokkan isi pesan (`includes("only update")`) | asset, task controller | Lengkapi pemetaan; di SQL pakai `RAISE EXCEPTION ... USING ERRCODE` agar server mencocokkan kode, bukan teks |
| C5 | Bentuk respons berbeda: `PATCH /notifications/:id` membungkus `{ notification }`, endpoint lain mengembalikan objek langsung; create/update memakai `.select()` (semua kolom) sementara list memakai daftar kolom | notification, client, asset, task controller | Kembalikan objek langsung; pakai konstanta kolom yang sama. Update `api-contract.md`, swagger, dan `notificationService.js` |
| C6 | Cara membaca role disalin di 6 tempat (`typeof userProfile?.role === "string" ? ...toUpperCase() : ""`) | `DashboardPage`, `ClientsPage`, `TasksPage`, `TaskDetailPage`, `TaskEditDialog`, `ClientDetailDrawer` | Sediakan `role` di `AuthContext` (atau hook `useRole()`) |
| C7 | Kode mati / tidak terpakai: import `requireAuth` & `ApiError` di `auth.routes.js`; `VITE_API_HEALTH` diwajibkan tapi tidak dipakai; fallback `process.env` di `env.js` client; `clientService.getClients` mengubah 404 menjadi daftar kosong | `auth.routes.js`, `client/src/utils/env.js`, `clientService.js` | Hapus |
| C8 | Pesan error server berbahasa Inggris, padahal aturan proyek mengharuskan Bahasa Indonesia (roadmap 1.5) | semua controller | Putuskan pendekatan di roadmap 1.5; tidak termasuk plan ini kecuali kamu minta |
| C9 | Dokumen `RBAC.md` tidak memuat tabel `users` dan `assets`, dan aturan MANAGER bertentangan sendiri | `docs/RBAC.md` | Perbarui setelah K1 & K2 diputuskan |

---

## D. Urutan implementasi

Dipecah per branch/PR kecil agar mudah di-review. Setiap fase: `npm run lint -w client` dan
`npm run build -w client`, lalu cek manual di browser.

| Fase | Branch | Isi | SQL? |
|---|---|---|---|
| 1 | `fix/rls-hardening` | A1, A2, A5, B10 (+ A3 bila K1 = a) | ✅ |
| 2 | `fix/auth-flow` | B1, B2, B3, C6, C7 (bagian client) | — |
| 3 | `fix/task-attachments` | A6, B5, B9, B11 (storage error) | — (pengaturan bucket di dashboard) |
| 4 | `fix/data-integrity` | B4, B6, B7, B11 (pagination) | ✅ (B7) |
| 5 | `fix/service-history-scale` | B8 | — |
| 6 | `refactor/api-consistency` | C1–C5, C7 (server), C9, dokumentasi swagger & api-contract | — |
| 7 (opsional) | `fix/audit-trail` | A4 (termasuk status hanya lewat RPC) | ✅ |

Fase 1 dan 2 sebaiknya digabung sebelum demo/deploy, karena **A1 + B1 bersama-sama** membuat
penonaktifan akun benar-benar bekerja dari ujung ke ujung.

### File SQL yang akan berubah (dijalankan manual di Supabase SQL editor)

| Fase | File |
|---|---|
| 1 | `functions/00_helper_functions.sql`, `functions/01_trigger_functions.sql`, `functions/02_user_sync_functions.sql`, `policies/09_users_policy.sql`, `policies/03_assets_policy.sql` (bila K1 = a) |
| 4 | `triggers/04_updated_at_triggers.sql` (drop trigger lama + buat ulang), `functions/05_dashboard_functions.sql` (hari WIB) |
| 7 | `policies/04`, `06`, `07`, `08`, `functions/03_task_status_functions.sql`, `functions/01_trigger_functions.sql` |

### Checklist verifikasi manual

- [ ] User dinonaktifkan → tidak bisa login ke aplikasi (pesan jelas di halaman login) **dan**
      query Supabase langsung dengan JWT-nya mengembalikan 0 baris.
- [ ] `supabase.auth.signUp()` dari console browser → profil baru `is_active = false`, tidak bisa mengakses data.
- [ ] Refresh `/users` sebagai SUPER_ADMIN tetap di `/users`.
- [ ] Reset password dari halaman Users → email → halaman password baru → login dengan password baru.
- [ ] Jam "dibuat" task baru sesuai jam lokal.
- [ ] Upload `Foto Kerusakan #1 (é).jpg` berhasil.
- [ ] Export riwayat servis dengan ≥ 500 task berhasil.
- [ ] Hapus lampiran meminta konfirmasi; tombol hapus tidak muncul untuk STAFF; terlihat di layar HP.
