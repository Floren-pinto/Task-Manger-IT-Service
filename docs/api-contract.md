# API Contract — Task Manager IT Service

**Status:** DRAFT v0.2 (as-is, disinkronkan dengan implementasi) · 2026-10-21
**Sumber:** route, controller, middleware, util, serta schema/RLS/trigger SQL di repo.
**Cara pakai:** dokumen ini mencerminkan implementasi saat ini. Endpoint yang belum ada tetap ditandai 🔜 di Bagian 7.

**Legenda**

| Tanda | Arti |
|---|---|
| ✅ | Terimplementasi dan terverifikasi dari kode |
| ⚠️ | Perlu konfirmasi / keputusan bisnis |
| 🔜 | Belum diimplementasikan (desain ada di Bagian 7) |
| 🐞 | Inkonsistensi atau bug yang masih ada (detail di Bagian 8) |

---

## 0. Konvensi umum

**Base path:** `/api`

**Auth:** setiap request wajib membawa Supabase access token pada header `Authorization: Bearer <token>`. Token divalidasi lewat `supabaseAnon.auth.getUser(token)`, lalu query dijalankan dengan **user-scoped client** (`createUserClient(token)`), sehingga **RLS menentukan data yang terlihat/diubah**.

**Operational endpoints:** `GET /health` → `{ "status": "ok" }`; `GET /api-docs` → Swagger UI. Keduanya di luar envelope API.

**Middleware per mount:**

| Mount | requireAuth | attachProfile |
|---|---|---|
| `/auth` | ✓ | ✓ |
| `/users` | ✓ | ✓ |
| `/tasks` | ✓ | ✓ |
| `/notifications` | ✓ | ✓ |
| `/clients` | ✓ | ✓ |
| `/assets` | ✓ | ✓ |
| `/divisions` | ✓ | ✓ |
| `/dashboard` | ✓ | ✓ |
| `/service-history` | ✓ | ✓ |
| `/service-reports` | ✓ | ✓ |

`attachProfile` membaca tabel `users` dengan kolom `{ id, name, email, role, division_id, is_active, deleted_at }`. Jika profil tidak ditemukan → 404 `"profile not found or inaccesible"`; jika `is_active = false` atau `deleted_at` terisi → 403 `"Account is inactive"`.

**Envelope sukses**

```json
{ "success": true, "message": "…", "data": { } }
```

- `ok(res, data, message = "OK")` → HTTP **200**.
- `created(res, data, message = "Created")` → HTTP **201**.
- Delete sukses → `ok(res, null, message)` (body `data: null`).

**Envelope error**

```json
{ "success": false, "message": "…" }
```

- `ApiError` → `{ success: false, message }`; field tambahan `error` hanya dikirim pada **non-production** dan hanya jika `err.details` ada.
- Error tak terduga → HTTP 500 `{ success: false, message: "Internal server error" }`.
- Route tidak dikenal → HTTP 404 `{ success: false, message: "Not Found" }`.
- Error 5xx dicatat oleh global error handler; beberapa controller juga mencatat detail error Supabase sebelum melempar `ApiError`. Detail mentah tidak dikirim ke client di production.

**Pemetaan error yang dipakai controller**

| Sumber error | HTTP | Catatan |
|---|---|---|
| `PGRST116` (RLS memfilter baris / `.single()` tidak menemukan baris) | 404 | Beberapa endpoint memakai `.maybeSingle()` lalu cek `null` |
| `42501` (RLS menolak insert/update) | 403 | Tidak selalu dipetakan khusus; beberapa endpoint mengembalikan 500 |
| `P0001` (trigger menolak kolom) | 403 | Pesan trigger tidak diteruskan ke client |
| `23503` (FK invalid) | 400 | Pesan generik |
| `23505` (unique conflict) | 409 | Assign duplikat |
| `23502` (NOT NULL) | 400 | Update task |
| `22P02` / `22007` / `22008` | 400 | Enum / tanggal invalid |
| Validasi input | 400 | Pesan spesifik per endpoint |

**Konvensi data**

- ID: UUID; controller memakai `crypto.randomUUID()` untuk insert, SQL memakai `gen_random_uuid()`.
- **Request body: camelCase** (`dueDate`, `divisionId`, `serviceType`, `serialNumber`).
- **Response: snake_case untuk kolom** (`due_date`, `created_at`, `file_url`), **camelCase untuk alias relasi** (`createdBy`, `uploadedBy`) dan untuk key JSONB dashboard (`activeTasks`, `byStatus`, `byDivision`, `byTechnician`).
- Timestamp: string ISO 8601.
- Soft delete: `deleted_at` ada di `clients`, `assets`, `tasks`, dan `users`. Tidak ada endpoint `DELETE` untuk soft delete; gunakan `PATCH` dengan `deleted: true` (clients/assets/tasks).
- Pagination: query `page` (default 1), `limit` (default 20, maksimum 100). Response `pagination: { page, limit, total }`; khusus tasks menambahkan `totalPages`. Endpoint non-paginated: users, divisions, attachments.
- Search: clients/assets → `ilike` pada `name`; tasks → `ilike` pada `title` **atau** `id` (prefix `#` dibuang, karakter `,()%"` disanitasi).
- Boolean query di-parse global oleh `boolParser` untuk string `true`/`false` (berlaku untuk `includeDeleted`, `includeDeletedAssets`, `status`, `isRead`). Di Express 5 hasil parse disimpan sebagai own property `req.query` karena getter bawaan mem-parse ulang di setiap akses.
- Enum (dari `schema.prisma`):
  - `Role`: `SUPER_ADMIN | MANAGER_DIVISION | TECHNICIAN | STAFF`
  - `Priority`: `LOW | MEDIUM | HIGH | URGENT`
  - `TaskStatus`: `PENDING | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED`
  - `NotificationType`: `ASSIGNMENT | STATUS_CHANGE | DEADLINE_REMINDER`

---

## 1. Auth

Login/logout dilakukan **FE langsung ke Supabase Auth** (bukan endpoint Express).

### `GET /api/auth/me` ✅
- Role: semua yang terautentikasi dan profilnya lolos `attachProfile`
- 200: `data` = `req.profile` = `{ id, name, email, role, division_id, is_active, deleted_at }`, message `"Authenticated"`
- Error: 401 `"Missing or invalid authorization token"` (tanpa token) / `"Invalid token or expired token"`; 404 `"profile not found or inaccesible"`; 403 `"Account is inactive"`

---

## 2. Users ✅

### `GET /api/users`
- Akses: semua role terautentikasi, tetapi hasil dibatasi RLS `users`: SUPER_ADMIN melihat semua; MANAGER_DIVISION melihat semua user non-SUPER_ADMIN yang belum soft-deleted; STAFF melihat diri sendiri + TECHNICIAN; TECHNICIAN hanya dirinya sendiri.
- Query:
  - `search` → cari `name`/`email` (`ilike`); karakter `,()%"` disanitasi
  - `role` → `Role` (case-insensitive)
  - `division` → UUID, dipetakan ke `division_id`
  - `status` → boolean `is_active`; `status=true` aktif, `status=false` nonaktif
  - `includeDeleted=true` → ikut menampilkan user arsip (efektif untuk SUPER_ADMIN)
- 200: `data` = **array langsung** (tanpa pagination), urut `name` asc

```json
[{ "id": "", "name": "", "email": "", "role": "", "is_active": true,
   "division_id": "", "division": { "id": "", "name": "" },
   "deleted_at": null, "created_at": "", "updated_at": "" }]
```

- Temuan #26 (`testConnection`) dan #28 (`status=false` tidak memfilter) sudah diperbaiki.
- `GET` tetap terbuka untuk semua role agar form task bisa memuat daftar teknisi.

### `POST /api/users` — hanya SUPER_ADMIN
- Body: `name` (wajib), `email` (wajib, unik), `password` (wajib, min 8 karakter), `role` (wajib), `divisionId` (wajib untuk `TECHNICIAN`/`MANAGER_DIVISION`; boleh `null` untuk `SUPER_ADMIN`/`STAFF`).
- Alur: validasi → cek divisi → `auth.admin.createUser({ email, password, email_confirm: true })` → update profil `users` (trigger `handle_new_auth_user` membuat baris default `TECHNICIAN` dengan `is_active = false`; langkah update ini yang mengaktifkannya).
- Kompensasi: jika update profil gagal → `auth.admin.deleteUser(id)`. Password tidak pernah dikembalikan atau di-log.
- 201: `data` = profil user (bentuk sama dengan `GET`), message `"User created successfully"`.
- Error: 400 · 403 (bukan SUPER_ADMIN) · 409 (email terdaftar) · 500 · 503 (service role key belum dikonfigurasi).

### `PATCH /api/users/:userId` — hanya SUPER_ADMIN
- Body parsial (minimal satu): `name`, `role`, `divisionId` (nullable), `isActive` (boolean), `deleted` (boolean). `email` immutable → 400.
- Aturan:
  1. `role`/`divisionId` mengikuti validasi `POST`.
  2. Mengubah `role`, `isActive`, atau `deleted` milik sendiri → 400.
  3. Menonaktifkan/menurunkan SUPER_ADMIN aktif terakhir → 409.
  4. `divisionId` berubah sementara user masih punya task aktif (`PENDING`/`IN_PROGRESS`/`ON_HOLD`) → 409.
  5. Status cukup diubah di tabel `users` lewat `req.supabase` (RLS mengizinkan SUPER_ADMIN; tidak memakai service role). User dengan `is_active=false` atau `deleted_at` terisi ditolak `attachProfile` (403 `"Account is inactive"`) di setiap request API. `deleted: true` mengisi `deleted_at` + `is_active=false`. Restore (`deleted: false`) mengosongkan `deleted_at`; aktifkan eksplisit dengan `isActive: true`.
  6. `42501`/trigger → 403; `PGRST116` → 404.
- 200: `data` = profil user, message `"User updated successfully"`.
- Error: 400 · 403 · 404 · 409 · 500.

**Tidak ada `DELETE /api/users`.** Hapus permanen mustahil karena relasi `onDelete: Restrict`; hapus = soft delete lewat `PATCH { deleted: true }` (D9).

**Policy SQL:** `server/supabase/sql/policies/09_users_policy.sql` — UPDATE hanya SUPER_ADMIN atau profil sendiri (`name`/`email` dibatasi trigger); MANAGER_DIVISION tidak lagi bisa mengubah `is_active`.

---

## 3. Tasks

### `GET /api/tasks` ✅
- Visibility (RLS): SUPER_ADMIN & MANAGER_DIVISION semua baris (termasuk soft-deleted); STAFF semua yang `deleted_at IS NULL`; TECHNICIAN hanya divisinya dan `deleted_at IS NULL`.
- Query:

| Query | Tipe | Catatan |
|---|---|---|
| `page`, `limit` | int | default 1 / 20; limit maksimum 100 |
| `status` | `TaskStatus` | satu nilai, `.eq` |
| `priority` | `Priority` | satu nilai, `.eq` |
| `divisionId`, `clientId` | uuid | |
| `technicianId` | uuid | bukan UUID → 400; difilter dengan embed `task_assignments!inner` (tanpa daftar ID di URL), daftar `assignments` tetap berisi semua teknisi |
| `dueFrom`, `dueTo` | tanggal / ISO | `YYYY-MM-DD` dibaca sebagai hari WIB lalu dikonversi ke UTC (kolom DB menyimpan UTC tanpa zona); filter `due_date` |
| `search` | string | `ilike` pada `title` atau `id`; prefix `#` dibuang; karakter `,()%"` disanitasi |
| `sortBy` | `due_date` \| lainnya | hanya `due_date` yang dikenali; selain itu `created_at` |
| `sortOrder` | `asc` \| lainnya | `asc` → ascending; selain itu descending |
| `includeDeleted` | boolean | `true` → tidak menambahkan `deleted_at IS NULL`; baris tetap dibatasi RLS |

- 200: `data` = `{ tasks: [...], pagination: { page, limit, total, totalPages } }`
- Item `tasks[]`:

```json
{ "id": "", "title": "", "description": "", "priority": "", "status": "",
  "due_date": null, "created_at": "", "updated_at": "",
  "client": { "id": "", "name": "" },
  "division": { "id": "", "name": "" },
  "assignments": [{ "user": { "id": "", "name": "" } }] }
```

- Error: 400 `"Invalid filter value"` / `"Invalid date filter"`; 500 `"Failed to fetch tasks"`.

### `POST /api/tasks` ✅
- Role: TECHNICIAN ditolak app layer (403); role lain mengikuti RLS insert (SUPER_ADMIN, MANAGER_DIVISION, STAFF, dan `created_by_id = auth.uid()`). Tidak ada pengecekan divisi MANAGER_DIVISION di app layer.
- Body:

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `title` | string | ✓ | di-`trim`, maks 200 |
| `description` | string | ✓ | di-`trim`, maks 5000 |
| `divisionId` | uuid | ✓ | bukan UUID → 400 |
| `clientId` | uuid | ✓ | bukan UUID → 400 |
| `priority` | `Priority` | ✗ | `LOW`/`MEDIUM`/`HIGH`/`URGENT`, selain itu 400; default DB `MEDIUM` |
| `dueDate` | ISO string / null | ✗ | |
| `assetId` | uuid / null | ✗ | |

- `status` tidak dibaca dari body (default DB `PENDING`); `created_by_id` diambil dari token.
- 201: `data` = baris `tasks` (kolom `TASK_ROW_COLUMNS`, tanpa relasi), message `"Task created"`
- `assetId` (bila diisi) harus milik `clientId` dan tidak diarsip.
- Error: 400 field wajib; 400 `"Asset does not belong to the selected client"` / `"Asset is archived"` / `"Invalid assetId"`; 400 `"Invalid divisionId, clientId, or assetId"` (23503); 400 `"Invalid divisionId"`/`"Invalid clientId"`/priority/teks (validasi app, temuan #29 selesai); 403 TECHNICIAN / `42501`; 500.

### `GET /api/tasks/:taskId` ✅
- 200: `data` =

```json
{
  "id": "", "title": "", "description": "", "priority": "", "status": "",
  "due_date": null, "completed_at": null, "created_at": "", "updated_at": "", "deleted_at": null,
  "createdBy":  { "id": "", "name": "", "email": "" },
  "division":   { "id": "", "name": "" },
  "client":     { "id": "", "name": "", "contact": "", "email": "", "address": "", "service_type": "" },
  "asset":      { "id": "", "name": "", "serial_number": "", "type": "" },
  "assignments": [{ "id": "", "assigned_at": "", "user": { "id": "", "name": "", "email": "" } }],
  "attachments": [{ "id": "", "file_url": "", "file_name": "", "file_type": "", "uploaded_at": "",
                    "uploadedBy": { "id": "", "name": "", "email": "" },
                    "signed_url": "" }],
  "histories":   [{ "id": "", "old_status": "", "new_status": "", "changed_at": "",
                    "user": { "id": "", "name": "", "email": "" } }],
  "reports":     [{ "id": "", "summary": "", "action_taken": "", "notes": null, "created_at": "",
                    "updated_at": "", "createdBy": { "id": "", "name": "", "email": "" } }]
}
```

- `asset` bisa `null` (task tanpa aset).
- `attachments[].signed_url` dibuat server dan berlaku 24 jam; `file_url` tetap path asli di Storage. Jika pembuatan signed URL gagal, `signed_url` bernilai `null`.
- Not found: query memakai `.maybeSingle()`, lalu controller mengembalikan 404 `"Task not found or accessible"`.
- `completed_at` diturunkan dari status oleh trigger `enforce_task_column_restrictions` (terisi saat masuk `COMPLETED`, `null` saat keluar); nilai dari client selalu ditimpa.
- `reports[]` tidak lagi membawa `snapshot_data`; snapshot diambil lewat `GET /api/tasks/:taskId/reports/:reportId`.

### `POST /api/tasks/:taskId/assignments` ✅
- Role: TECHNICIAN ditolak app layer (403); SUPER_ADMIN, MANAGER_DIVISION, STAFF mengikuti RLS.
- Body: `{ "userId": "uuid" }`
- Validasi app layer:
  - task harus ada dan accessible → 404; task soft-deleted → 400
  - assignee harus ada → 404; role harus TECHNICIAN → 400
  - assignee harus satu divisi dengan task → 400
  - assignee harus aktif dan tidak soft-deleted → 400
- 201: `data` = `{ id, task_id, user_id, assigned_at }`, message `"Task assigned"`
- Error: 409 `"This user is already assigned to this task"`; 400; 404; 403; 500.
- Side effect: trigger DB membuat notifikasi `ASSIGNMENT` untuk user tersebut.

### `PATCH /api/tasks/:taskId/status` ✅
- Role: STAFF ditolak app layer (403); SUPER_ADMIN, MANAGER_DIVISION, dan TECHNICIAN (divisi sendiri) dapat mengubah status.
- Body: `{ "newStatus": TaskStatus }` — **bukan** `status`.
- Alur: memanggil RPC `update_task_status(p_task_id, p_new_status)` (`SECURITY DEFINER`). RPC memeriksa role (STAFF/nonaktif → `42501`), memastikan task terlihat (TECHNICIAN: divisi sendiri & tidak dihapus; selain itu `P0002`), status berbeda (`22023`), lalu mengubah `tasks.status` dan menulis `task_status_history` dengan `auth.uid()`.
- **Status hanya bisa berubah lewat RPC ini**: trigger `enforce_task_column_restrictions` menolak `UPDATE tasks SET status` langsung untuk semua role, dan `task_status_history` tidak punya policy INSERT, sehingga riwayat & notifikasi selalu tercatat.
- Server memetakan kode error (bukan isi pesan): `P0002` → 404, `22023` → 400, `22P02` → 400, `42501` → 403.
- Tidak ada matriks transisi status; semua status berbeda yang valid diterima (mis. `COMPLETED` → `IN_PROGRESS`).
- 200: `data` = baris `tasks` (kolom `TASK_ROW_COLUMNS`: `id, title, description, priority, status, due_date, completed_at, division_id, client_id, asset_id, created_by_id, created_at, updated_at, deleted_at`), message `"Task status updated"`
- Error: 400 status sama / status invalid; 403 tidak diizinkan; 404 task tidak ditemukan; 500.
- Side effect: notifikasi `STATUS_CHANGE` untuk assignee dan manager divisi yang aktif, kecuali pelaku perubahan.

### `PATCH /api/tasks/:taskId` ✅
- Body parsial: `title`, `description`, `priority`, `dueDate`, `divisionId`, `clientId`, `assetId`, `deleted`.
- `status` selalu ditolak → 400 `"Use PATCH /api/tasks/:taskId/status to update task status"`.
- `deleted` harus boolean; `deleted: true` mengisi `deleted_at`, `false` mengosongkan.
- Minimal satu field; field tak dikenal diabaikan (jika semua tak dikenal → 400).
- `dueDate: null` dan `assetId: null` mengosongkan nilai.
- Validasi sama dengan `POST`: `title`/`description` bila dikirim tidak boleh kosong (maks 200/5000), `priority` harus enum, `divisionId`/`clientId`/`assetId` harus UUID.
- Otorisasi: **app layer tidak memeriksa role per field**; RLS + trigger `enforce_task_column_restrictions` yang menentukan:

| Role | Field yang diizinkan trigger |
|---|---|
| SUPER_ADMIN / MANAGER_DIVISION | semua kolom |
| STAFF | `priority`, `due_date`, `updated_at` |
| TECHNICIAN | `description`, `updated_at` (perubahan `status` hanya lewat RPC `update_task_status`, untuk semua role) |

- RLS juga membatasi STAFF/TECHNICIAN ke task yang belum soft-deleted dan TECHNICIAN ke divisinya.
- `divisionId` **boleh diubah** oleh SUPER_ADMIN/MANAGER_DIVISION (berbeda dari desain awal D1).
- Bila `clientId` atau `assetId` dikirim, pasangan akhirnya (digabung dengan nilai task saat ini) divalidasi: asset harus milik client → 400 `"Asset does not belong to the selected client"`. Asset baru yang diarsip ditolak; asset lama yang kemudian diarsip boleh dipertahankan.
- Tidak ada larangan edit task `COMPLETED`/`CANCELLED`.
- 200: baris `tasks` (kolom `TASK_ROW_COLUMNS`), message `"Task updated successfully"` atau `"Task deleted successfully"`.
- Error: 400 (body kosong, validasi field, `status`, referensi invalid, NOT NULL, tanggal invalid, sisa 22P02 → `"Invalid field value"`); 403 (`P0001`/`42501`); 404 (`PGRST116`); 500.

### `GET /api/tasks/:taskId/attachments` ✅
- 200: `data` = **array langsung**, urut `uploaded_at` desc

```json
[{ "id": "", "file_url": "", "file_name": "", "file_type": "", "uploaded_at": "",
   "uploadedBy": { "id": "", "name": "", "email": "" }, "signed_url": "" }]
```

- `file_url` berisi **path di Storage**, bukan URL publik (bucket private). `signed_url` adalah URL siap pakai dari Supabase Storage dan berlaku 24 jam.

### `POST /api/tasks/:taskId/attachments` ✅
- Alur: FE upload ke Supabase Storage bucket `task_attachments` dengan path `{taskId}/{filename}` → FE kirim metadata ke endpoint ini.
- Batas bucket (atur di Supabase Storage → bucket `task_attachments`): 5 MB; MIME `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. FE menyusun nama file aman untuk path (`{timestamp}-{slug}.{ext}`); nama asli disimpan di `file_name`.
- Body: `{ "filePath": "", "fileName": "", "fileType": "" }` — ketiganya wajib.
- Validasi:
  - `filePath` harus tepat `{taskId}/{namaFile}` (satu folder, tanpa `..`/backslash) → bila tidak, 400 `"filePath does not match"` **tanpa** menghapus file apa pun (path itu bisa milik task lain).
  - `fileType` harus JPEG/PNG/WEBP/PDF → bila tidak, 400 dan file di path valid tadi dihapus.
  - Insert DB gagal → file di path valid dihapus (compensating action).
- 201: `data` = `{ id, task_id, file_url, file_name, file_type, uploaded_at, uploaded_by_id, signed_url }`, message `"Task attachment created"`
- Role (RLS): SUPER_ADMIN, MANAGER_DIVISION, TECHNICIAN (divisi sendiri), STAFF.
- Error: 400; 403 (pesan 42501 masih salah konteks, temuan #21); 500.

### `DELETE /api/tasks/:taskId/attachments/:attachmentId` ✅
- Role (RLS): SUPER_ADMIN & MANAGER_DIVISION semua; TECHNICIAN hanya miliknya & divisi sendiri; STAFF tidak bisa.
- 200: `data: null`, message `"Task attachment deleted"`
- File di Storage ikut dihapus setelah baris DB terhapus; jika penghapusan file gagal, error hanya dicatat di server log.
- Error: 404 jika attachment tidak ditemukan; 500.

🔜 Belum ada: `DELETE /api/tasks/:taskId/assignments/:assignmentId` (unassign), teams, `GET /api/dashboard/technicians`, `GET /api/dashboard/trend`.

---

## 4. Notifications

Visibility: hanya milik sendiri (`user_id = auth.uid()`), **tanpa pengecualian SUPER_ADMIN**. Baris dibuat oleh trigger (`ASSIGNMENT`, `STATUS_CHANGE`), bukan oleh API. Semua query memakai `req.supabase` sehingga RLS berlaku. Mount `/notifications` memakai `requireAuth` + `attachProfile`: user nonaktif/soft-deleted → 403 `"Account is inactive"`.

Realtime: frontend berlangganan Supabase Realtime (Postgres Changes) pada tabel `notifications` dengan filter `user_id=eq.<id>` hanya sebagai pemicu refetch lewat API; fallback polling 60 detik bila Realtime tidak aktif. Prasyarat SQL: `server/supabase/sql/realtime/00_notifications_realtime.sql` (jalankan manual di Supabase SQL Editor).

Belum termasuk: notifikasi `DEADLINE_REMINDER` otomatis (butuh scheduler `pg_cron`/Edge Function). UI sudah siap menampilkan tipe tersebut.

### `GET /api/notifications` ✅
- Query: `page`, `limit`, `isRead` (`true`/`false`, di-parse eksplisit di controller).
- `isRead=true` → hanya dibaca; `isRead=false` → hanya belum dibaca; tanpa `isRead` → semua. Nilai lain → 400 `"isRead must be true or false"`.
- Urut `created_at` desc.
- 200: `data` = `{ notifications: [...], pagination: { page, limit, total, totalPages } }`
- Field item: `id, user_id, title, message, type, is_read, created_at, related_task_id`.
- Error: 500 `"Failed to fetch notifications"`.

### `GET /api/notifications/unread-count` ✅
- Menghitung notifikasi `is_read = false` milik sendiri (RLS).
- 200: `data` = `{ unreadCount: 3 }`
- Error: 500 `"Failed to fetch unread notification count"`.

### `PATCH /api/notifications/read-all` ✅
- Tanpa body; tidak menerima `userId`. Hanya baris `is_read = false` milik user yang login yang diubah.
- 200: `data` = `{ updated: 4 }` (`0` bila tidak ada yang belum dibaca).
- Error: 500 `"Failed to update notifications"`.

### `PATCH /api/notifications/:id` ✅
- Tanpa body; selalu menandai `is_read = true` (tidak bisa un-read: dibatasi RLS `WITH CHECK` + column grant).
- `id` bukan UUID → 400 `"Invalid notification ID"`.
- 200: `data` = objek notifikasi langsung (seragam dengan endpoint update lain).
- Error: 404 `"Notification not found"` (termasuk notifikasi milik user lain); 500 `"Failed to update notification"`.

---

## 5. Clients

Visibility (RLS): TECHNICIAN & STAFF hanya baris aktif (`deleted_at IS NULL`); MANAGER_DIVISION & SUPER_ADMIN juga melihat soft-deleted.

### `GET /api/clients` ✅
- Query: `page`, `limit`, `search`, `includeDeleted`
- `includeDeleted=true` menghapus filter `deleted_at`; RLS tetap membatasi role yang benar-benar boleh melihat baris arsip.
- `search` hanya pada `name`, di-`trim` dan dibersihkan dari karakter `,()%"` sebelum `ilike`.
- `search` tanpa hasil → `200` dengan `clients: []` dan `total: 0` (bukan 404).
- 200: `data` = `{ clients: [...], pagination: { page, limit, total, totalPages } }`
- Item: `{ id, name, contact, email, address, service_type, deleted_at, created_at, updated_at }`
- Error query → 500 `"Failed to fetch clients"`; filter tidak valid → 400 `"Invalid filter value"`.

### `GET /api/clients/:clientId` ✅
- Query: `includeDeletedAssets` (boolean); hanya efektif untuk SUPER_ADMIN/MANAGER_DIVISION. RLS asset tetap menjadi pengaman.
- Client dan asset diambil dalam dua query terpisah. Asset default hanya `deleted_at IS NULL`.
- 200: `data` = `{ id, name, contact, email, address, service_type, deleted_at, created_at, updated_at, assets: [{ id, name, serial_number, type, deleted_at, created_at, updated_at }] }`
- Embed `tasks` **dihapus** dari response; riwayat task akan dilayani endpoint service history.
- `clientId` bukan UUID → 400 `"Invalid client ID"`.
- Not found: `.single()` → PGRST116 → 404 `"Client not found"`.

### `POST /api/clients` ✅
- Role (RLS): semua kecuali TECHNICIAN.
- Body: `{ name, contact, email?, address, serviceType }`; semua string di-`trim`; `email` opsional dan kosong → `null`.
- Field wajib (maks panjang): `name` (200), `contact` (100), `address` (500), `serviceType` (100); `email` (254) bila diisi harus valid.
- 201: baris `clients` (kolom `CLIENT_COLUMNS`), message `"Client created successfully"`.
- Error: 400 validasi (`"<field> is required"`, `"<field> must be at most N characters"`, `"email must be a valid email address"`); 403 `"You are not allowed to create a client"` (42501); 500.

### `PATCH /api/clients/:clientId` ✅
- Body parsial `{ name?, contact?, email?, address?, serviceType?, deleted? }`; minimal satu field; semua string di-`trim`.
- `email` hanya masuk payload bila dikirim (`email !== undefined`); `""`/spasi → `null` (temuan #20 selesai).
- Field yang dikirim divalidasi seperti `POST`: string kosong untuk field wajib → 400 (sebelumnya diam-diam diabaikan).
- `deleted`: `true` = soft delete, `false` = restore; bukan boolean → 400.
- Role: TECHNICIAN ditolak app layer (403); STAFF boleh update baris aktif tetapi **tidak boleh** `deleted: true` (403); MANAGER_DIVISION/SUPER_ADMIN boleh update dan soft delete/restore.
- RLS juga menolak STAFF/TECHNICIAN mengedit baris soft-deleted.
- `clientId` bukan UUID → 400 `"Invalid client ID"`.
- 200: baris `clients` (kolom `CLIENT_COLUMNS`); message `"Client updated successfully"` / `"Client deleted successfully"` / `"Client restored successfully"`.
- Error: 400 tidak ada field; 403 `"You are not allowed to update this client"` (42501); 404 `"Client not found"` (PGRST116); 500.

---

## 6. Assets

Visibility (RLS, diperbarui): STAFF & TECHNICIAN hanya melihat asset aktif (`deleted_at IS NULL`); SUPER_ADMIN & MANAGER_DIVISION boleh melihat asset arsip. Hak tulis mengikuti `clients`: TECHNICIAN hanya baca, STAFF tidak boleh arsip/pulihkan.

### `GET /api/assets` ✅
- Query: `page`, `limit`, `search`, `clientId`, `includeDeleted`
- `clientId` bukan UUID → 400 `"Invalid client ID"`; `includeDeleted=true` menghapus filter `deleted_at`.
- `search` hanya pada `name`, disanitasi; tanpa hasil → `200` dengan `assets: []`.
- 200: `data` = `{ assets: [...], pagination: { page, limit, total, totalPages } }`
- Item: `{ id, name, serial_number, type, deleted_at, client: { id, name }, created_at, updated_at }`
- Error query → 500 `"Failed to fetch assets"`.

### `GET /api/assets/:assetId` ✅
- 200: `{ id, name, serial_number, type, deleted_at, client: { id, name }, created_at, updated_at, tasks: [{ id, title, description, due_date, created_at, updated_at }] }`
- `assetId` bukan UUID → 400 `"Invalid asset ID"`.
- Not found: `.single()` → PGRST116 → 404 `"Asset not found"`; error lain → 500 `"Failed to fetch asset detail"`.

### `POST /api/assets` ✅
- Body: `{ name, type, clientId, serialNumber? }`; string di-`trim`; `name` maks 200, `type` maks 100, `serialNumber` maks 100 (kosong → `null`).
- `clientId` wajib dan harus UUID → 400 `"Invalid client ID"`.
- Role: TECHNICIAN → 403 (app layer + RLS).
- 201: baris `assets` (kolom `ASSET_COLUMNS`), message `"Asset created successfully"`.
- Error: 400 field wajib; 400 `"Invalid client ID"` (23503); 403 TECHNICIAN / `42501`; 500.

### `PATCH /api/assets/:assetId` ✅
- Body parsial: `name`, `serialNumber` (`""` → `null`), `type`, `clientId`, `deleted` (boolean); minimal satu field. Field wajib yang dikirim kosong, `clientId` bukan UUID, atau `deleted` bukan boolean → 400.
- Role: TECHNICIAN → 403; STAFF mengirim `deleted` → 403 (tidak boleh arsip/pulihkan); SUPER_ADMIN & MANAGER_DIVISION semua.
- `assetId`/`clientId` bukan UUID → 400 `"Invalid asset ID"` / `"Invalid client ID"`.
- Pindah ke client lain ditolak 409 bila asset sudah dipakai task (task lama akan menunjuk asset milik client lain).
- 200: baris `assets` (kolom `ASSET_COLUMNS`), message `"Asset updated successfully"` / `"Asset deleted successfully"` / `"Asset restored successfully"`.
- Error: 400 tidak ada field / `"Invalid client ID"` (23503); 403 role / `"You are not allowed to update this asset"` (42501); 404 `"Asset not found"` (PGRST116); 409 asset sudah dipakai task; 500.

### Policy `03_assets_policy.sql` ✅
```sql
-- SELECT: aktif untuk semua role; baris arsip hanya admin/manager
deleted_at IS NULL OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
```
- INSERT: SUPER_ADMIN, MANAGER_DIVISION, STAFF. UPDATE: STAFF hanya asset aktif dan tidak boleh mengisi `deleted_at`; SUPER_ADMIN/MANAGER_DIVISION semua (mengikuti `clients`).
- File memakai `DROP POLICY IF EXISTS` agar aman dijalankan ulang di Supabase SQL Editor.

---

## 6A. Divisions ✅

### `GET /api/divisions` ✅
- Role: semua authenticated (RLS select `true`); mount memakai `requireAuth` + `attachProfile`.
- Tanpa pagination; urut `name` asc.
- 200: `data` = array langsung:

```json
[{ "id": "", "name": "", "description": null, "created_at": "", "updated_at": "" }]
```

- Error: 500 `"failed to fetch divisions"`.
- Endpoint tulis belum ada; RLS hanya mengizinkan SUPER_ADMIN untuk aksi tulis.

---

## 6B. Dashboard ✅

### `GET /api/dashboard/summary` ✅
- Role: semua authenticated yang lolos `attachProfile`. **Tidak ada penolakan 403 untuk TECHNICIAN di app layer**; data mengikuti RLS sehingga TECHNICIAN hanya melihat task divisinya (temuan #22).
- Memanggil RPC `get_dashboard_summary()` (`SECURITY INVOKER`, hanya task `deleted_at IS NULL`).
- Tidak menerima query filter (`divisionId`, `dateFrom`, `dateTo` belum didukung).
- 200: `data` =

```json
{
  "activeTasks": 0,
  "completedToday": 0,
  "overdue": 0,
  "unassigned": 0,
  "byStatus": { "PENDING": 0, "IN_PROGRESS": 0 },
  "byDivision": [{ "id": "", "name": "", "total": 0 }],
  "byTechnician": [{ "id": "", "name": "", "total": 0, "completed": 0 }]
}
```

- `activeTasks` = task dengan status selain `COMPLETED`/`CANCELLED`.
- `completedToday` = jumlah task distinct yang memiliki history `COMPLETED` pada hari ini.
- `overdue` = `due_date < current_date` dan status masih aktif.
- `unassigned` = task aktif tanpa baris `task_assignments`.
- `byStatus` hanya memuat status yang ada (tidak dijamin lengkap semua enum).
- `byDivision` memuat semua divisi, termasuk yang totalnya 0.
- `byTechnician` hanya memuat TECHNICIAN yang memiliki assignment.
- Error: 500 `"Failed to fetch dashboard summary"`; detail RPC dicatat di server log.
- 🔜 `GET /api/dashboard/technicians` dan `GET /api/dashboard/trend` belum ada.

---

## 7. Endpoint terencana & catatan implementasi

Bagian ini mempertahankan desain endpoint yang belum ada. Endpoint yang sudah diimplementasikan setelah v0.1 dipindahkan ke kontrak aktual: divisions (Bagian 6A), dashboard summary (Bagian 6B), dan `PATCH /api/tasks/:taskId` (Bagian 3).

Semua desain di bagian ini **mengikuti konvensi as-is** (envelope `{ success, message, data }`, request camelCase, response snake_case, list ber-key + `pagination`). Bentuk body error mengikuti Bagian 0.

Bagian bertanda 🔒 menyangkut keamanan/aturan bisnis inti dan **wajib direview manual** sebelum dan sesudah implementasi.

### 7.0 Konvensi tambahan untuk endpoint baru

- `DELETE` = hapus permanen (baris join/lampiran). Soft delete = `PATCH` dengan `deleted: boolean` (pola yang sama dengan clients).
- Pengecekan role **berlapis**: app layer (403 yang jelas) + RLS/trigger sebagai pengaman terakhir. Baris yang disembunyikan RLS = **404**, bukan 403.
- Query list: key berulang menjadi array (`?status=A&status=B`); angka dan boolean selalu di-parse eksplisit (nilai query selalu string).
- Mutasi yang butuh lebih dari satu penulisan (user, report) dibungkus satu fungsi service dengan **compensating action** bila langkah kedua gagal (pola yang sama dengan attachments).
- Setelah `.update()` / `.insert()` / `.delete()` selalu `.select()` agar data kembali; pada `delete`, cek jumlah baris untuk membedakan 404.

### 7.1 Prasyarat (DB / middleware) sebelum slice terkait

| # | Prasyarat | Status | Dibutuhkan oleh |
|---|---|---|---|
| P1 | Policy/trigger UPDATE `tasks` untuk TECHNICIAN | ✅ Selesai: trigger mengizinkan `status`, `description`, `updated_at`; status diubah lewat RPC `update_task_status` | — |
| P2 | Kolom `users.deleted_at` | ✅ Selesai: sudah ada di schema | — |
| P3 | `supabaseAdmin` client (service role key, **server-only**, di `.env`, tidak pernah ke FE) | ✅ Tersedia (`supabaseAdmin` bernilai `null` bila key tidak diisi) | 7.6 |
| P4 | Middleware menolak `is_active = false` atau `deleted_at` terisi dengan 403 | ✅ Selesai: `attachProfile` dipasang di semua mount, termasuk `/notifications` | — |
| P5 | Policy `team_members` + izin MANAGER_DIVISION menulis `teams` divisinya sendiri (saat ini hanya SUPER_ADMIN) | 🔜 Belum | 7.7 |
| P6 | View/fungsi SQL `SECURITY INVOKER` untuk agregat | ✅ Sebagian: `get_dashboard_summary` sudah ada; agregat tim/workload dan dashboard tambahan belum | 7.7, 7.8 |
| P7 | Kolom `tasks.completed_at`, diisi saat status menjadi `COMPLETED` | ✅ Selesai: `server/supabase/sql/migrations/00_add_tasks_completed_at.sql` (+ backfill) dan derivasi di trigger | — |

### 7.2 `GET /api/divisions` ✅

Sudah diimplementasikan. Kontrak aktual ada di **Bagian 6A**. Tidak ada endpoint tulis.

### 7.3 `PATCH /api/tasks/:taskId` ✅

Sudah diimplementasikan. Kontrak aktual ada di **Bagian 3**.

Perbedaan penting dari desain awal:
- `divisionId` **boleh diubah** oleh SUPER_ADMIN/MANAGER_DIVISION; tidak immutable.
- Pembatasan field dilakukan oleh trigger/RLS, bukan app layer; pesan error ke client generik.
- Tidak ada validasi `assetId` harus milik `clientId`.
- Tidak ada larangan edit task `COMPLETED`/`CANCELLED`.
- Field tak dikenal diabaikan, bukan otomatis 400.

### 7.4 `DELETE /api/tasks/:taskId/assignments/:assignmentId` 🔜

- Role (RLS delete): SUPER_ADMIN, MANAGER_DIVISION, STAFF (task tidak soft-deleted). TECHNICIAN → 403.
- `:assignmentId` = `task_assignments.id` (sudah ada di `assignments[]` pada detail task).
- Aturan: assignment harus milik `:taskId`, jika tidak → 404. Task `COMPLETED`/`CANCELLED` → 409 (D3).
- Implementasi: `.delete().eq("id", assignmentId).eq("task_id", taskId).select()`; hasil 0 baris → 404 (Supabase tidak error pada delete 0 baris).
- 200: `data: null`, message `"Task unassigned"`
- Side effect: tidak ada notifikasi (enum `NotificationType` tidak punya tipe unassign).

### 7.5 Service reports & riwayat servis ✅ 🔒

Report bersifat **immutable** (RLS tidak punya policy UPDATE/DELETE, dan tidak ada endpoint `PATCH`/`DELETE`). Koreksi = membuat report baru (D5). Satu task boleh punya banyak report.

#### `POST /api/tasks/:taskId/reports` ✅

- Role (RLS insert): SUPER_ADMIN, MANAGER_DIVISION, TECHNICIAN (divisi task, task tidak soft-deleted). STAFF → 403 (`42501` dipetakan ke 403 `"You are not allowed to create a service report for this task"`).
- Body:

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `summary` | string | ✓ | di-trim, maks 2000 karakter |
| `actionTaken` | string | ✓ | di-trim, maks 2000 karakter |
| `notes` | string / `null` | ✗ | maks 2000 karakter; string kosong → `null` |

- `snapshotData`/`snapshot_data` dari client → 400 `"snapshotData is generated by the server"`. `created_by_id` diambil dari `req.profile.id`, bukan dari body.
- Aturan: task tidak terlihat (RLS) atau soft-deleted → 404 `"Task not found or accessible"`; status selain `COMPLETED` → 409 `"Service report can only be created for completed tasks"` (D4).
- `snapshot_data` dibangun server dari query `req.supabase` (`server/src/utils/serviceReportSnapshot.js`), sehingga hanya berisi data yang boleh dilihat pembuat report. Contoh: karena RLS `users`, report buatan TECHNICIAN hanya memuat teknisi yang terlihat olehnya (dirinya sendiri).

```json
{
  "task": { "id": "", "title": "", "description": "", "priority": "", "status": "", "due_date": null, "completed_at": "", "created_at": "" },
  "division": { "id": "", "name": "" },
  "client": { "id": "", "name": "", "contact": "", "email": null, "address": "", "service_type": "" },
  "asset": { "id": "", "name": "", "serial_number": null, "type": "" },
  "technicians": [{ "id": "", "name": "", "email": "" }],
  "status_history": [{ "old_status": "", "new_status": "", "changed_at": "", "changed_by": { "id": "", "name": "" } }],
  "generated_at": ""
}
```

  (`asset` bernilai `null` bila task tanpa aset; `status_history` urut `changed_at` asc.)

- 201: `data` = `{ id, task_id, created_by_id, summary, action_taken, notes, snapshot_data, created_at, updated_at, createdBy }`, message `"Service report created"`
- Error: 400 · 403 · 404 · 409 · 500

#### `GET /api/tasks/:taskId/reports` ✅

- Role: yang dapat melihat task (RLS). Task tidak terlihat → 404.
- 200: `data` = array, urut `created_at` desc, **tanpa `snapshot_data`**

```json
[{ "id": "", "task_id": "", "created_by_id": "", "summary": "", "action_taken": "", "notes": null,
   "created_at": "", "updated_at": "", "createdBy": { "id": "", "name": "", "email": "" } }]
```

#### `GET /api/tasks/:taskId/reports/:reportId` ✅

- 200: `data` = report lengkap **termasuk `snapshot_data`** dan `createdBy` (dipakai untuk tampilan cetak). `reportId` bukan UUID → 400; report tidak ada/bukan milik `:taskId`/tidak terlihat → 404.

#### `GET /api/service-reports/:reportId` ✅

- Sama dengan endpoint nested di atas tanpa `taskId`. Mount `/service-reports` memakai `requireAuth` + `attachProfile`.

#### `GET /api/service-history` ✅

Daftar **task selesai** (bukan daftar report). Mount `/service-history` memakai `requireAuth` + `attachProfile`; RLS `tasks` membatasi hasil (TECHNICIAN hanya divisinya).

- Query: `search` (judul, ID task, atau nama client), `clientId`, `assetId`, `divisionId` (UUID; selain itu → 400), `technicianId` (UUID; difilter dengan embed `!inner`), `completedFrom`/`completedTo` (`YYYY-MM-DD`, hari WIB; format salah atau from > to → 400), `page` (default 1), `limit` (default 20, maks 100), `sortOrder=desc|asc` (berdasarkan `completed_at`, default `desc`).
- Hanya `status = COMPLETED` dan `deleted_at IS NULL`; filter tanggal memakai `completed_at`.
- `report` = report **terbaru** task tersebut (tanpa `snapshot_data`) atau `null` bila belum ada; task tanpa report tetap tampil.
- 200:

```json
{
  "history": [{
    "task": { "id": "", "title": "", "description": "", "status": "COMPLETED", "priority": "", "due_date": null, "completed_at": "" },
    "report": { "id": "", "summary": "", "action_taken": "", "notes": null, "created_at": "", "created_by_id": "" },
    "client": { "id": "", "name": "", "contact": "", "email": null, "address": "", "service_type": "" },
    "asset": { "id": "", "name": "", "serial_number": null, "type": "" },
    "division": { "id": "", "name": "" },
    "technicians": [{ "id": "", "name": "", "email": "" }]
  }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

#### `GET /api/service-history/export` ✅

- Query sama dengan list tanpa `page`/`limit`; maksimal 5000 baris.
- 200: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="service-history-YYYYMMDD.csv"` (header ini diekspos lewat CORS `exposedHeaders`).
- Maksimal 5000 baris. Header `X-Export-Total` (jumlah baris yang cocok) dan `X-Export-Truncated` (`true` bila hasil dipotong) ikut diekspos; FE menampilkan peringatan bila terpotong. Report terbaru diambil per 200 task agar URL tidak melewati batas gateway.
- Kolom: Task ID, Title, Client, Asset, Division, Technicians, Completed At (WIB, `YYYY-MM-DD HH:mm:ss`), Priority, Summary, Action Taken, Notes (report terbaru).
- Setiap sel dibungkus `"` dengan `"` di-escape menjadi `""`; sel yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi prefix `'` (cegah formula injection). File diawali BOM UTF-8 agar terbaca benar di Excel.
- Error validasi/DB dikirim sebagai JSON sebelum header CSV dikirim.

Belum termasuk: export PDF dan SLA report (halaman `/reports` dialihkan ke `/service-history`).

### 7.6 Users ✅ 🔒

Kontrak aktual ada di **Bagian 2**. Ringkasan keputusan implementasi:

- `POST /api/users` dan `PATCH /api/users/:userId` hanya SUPER_ADMIN (`requireSuperAdmin`); `GET /api/users` tetap untuk semua role dengan pembatasan RLS.
- Create memakai Supabase Auth Admin + kompensasi `deleteUser` bila update profil gagal. Tanpa `SUPABASE_SERVICE_ROLE_KEY`, create mengembalikan **503**. Update/arsip/nonaktif tidak butuh service role (cukup RLS SUPER_ADMIN).
- PATCH menolak perubahan role/status milik sendiri, menolak menonaktifkan SUPER_ADMIN aktif terakhir, dan menolak pindah divisi bila user masih punya task aktif.
- Email immutable pada MVP. Reset password = `resetPasswordForEmail` dari FE (FR-05), bukan endpoint ini. Tautan email mengarah ke halaman `/reset-password` (harus terdaftar di Supabase → Authentication → URL Configuration → Redirect URLs).
- `users` UPDATE policy dipersempit ke SUPER_ADMIN atau profil sendiri; MANAGER_DIVISION tidak lagi bisa mengubah user lain (termasuk `is_active`).
- Tidak ada `DELETE /api/users`; hapus = soft delete `PATCH { deleted: true }` (D9).

### 7.7 Teams & members 🔜

Catatan: tabel `tasks` tidak punya relasi ke `teams`, jadi tim hanyalah pengelompokan; menghapus tim atau anggota tidak berdampak ke task.

#### `GET /api/teams`
- Role: semua (RLS select `true`). Query: `divisionId?`.
- 200: `data` = array (tanpa pagination)

```json
[{ "id": "", "name": "", "division": { "id": "", "name": "" }, "members_count": 0,
   "created_at": "", "updated_at": "" }]
```

#### `GET /api/teams/:teamId` (FR-12)
- 200: `data` =

```json
{ "id": "", "name": "", "division": { "id": "", "name": "" }, "created_at": "", "updated_at": "",
  "members": [{
    "id": "", "joined_at": "",
    "user": { "id": "", "name": "", "email": "", "role": "", "is_active": true },
    "workload": { "pending": 0, "in_progress": 0, "on_hold": 0, "total_active": 0 }
  }] }
```

- `members[].id` = `team_members.id` (dipakai untuk menghapus anggota).
- `workload` = jumlah task (tidak soft-deleted) yang di-assign ke user pada status tersebut. Dihitung lewat view/fungsi SQL (P6), bukan N query dari Node. Hitungan mengikuti visibilitas RLS pemanggil.

#### `POST /api/teams`
- Role: SUPER_ADMIN (semua divisi), MANAGER_DIVISION (divisinya sendiri, P5/D11); lainnya 403.
- Body: `{ name, divisionId }` · 201: baris `teams`, message `"Team created"`
- Catatan: nama tim tidak dibuat unik di schema.

#### `PATCH /api/teams/:teamId`
- Role sama dengan `POST`. Body: `{ name }` (divisi tim immutable). 200: baris `teams`.

#### `DELETE /api/teams/:teamId`
- Role sama dengan `POST`. Hapus permanen; `team_members` ikut terhapus (cascade). 200: `data: null`.

#### `POST /api/teams/:teamId/members`
- Role sama dengan `POST /teams`.
- Body: `{ "userId": "uuid" }`
- Aturan (D7): user berrole `TECHNICIAN`, aktif, tidak soft-deleted, dan `division_id` sama dengan divisi tim → selain itu 400. Duplikat (unique `team_id, user_id`) → 409.
- 201: `data` = `{ id, team_id, user_id, joined_at }`, message `"Team member added"`

#### `DELETE /api/teams/:teamId/members/:memberId`
- Role sama. `:memberId` = `team_members.id`; bukan anggota tim ini → 404. 200: `data: null`.

### 7.8 Dashboard & laporan 🔜

`GET /api/dashboard/summary` ✅ sudah diimplementasikan (Bagian 6B). Endpoint berikut belum ada.

- Role: desain SRS menyebut SUPER_ADMIN, MANAGER_DIVISION, STAFF; TECHNICIAN → 403. Summary saat ini **tidak menolak TECHNICIAN di app layer** (temuan #22), jadi keputusan ini masih perlu dikonfirmasi.
- Seluruh angka mengikuti visibilitas RLS. Task soft-deleted tidak dihitung.
- Query umum yang direncanakan: `divisionId?`, `dateFrom?`, `dateTo?` (tanggal ISO). Summary saat ini belum menerima query filter.
- Agregasi dilakukan di database lewat view/fungsi `SECURITY INVOKER` (P6).

#### `GET /api/dashboard/technicians` (FR-60, FR-61)

```json
[{ "user": { "id": "", "name": "" }, "division_id": "", "active_tasks": 0,
   "completed_in_range": 0, "avg_completion_hours": null }]
```

- `avg_completion_hours` = `null` bila belum ada task selesai. Definisi waktu penyelesaian: D10. `dateFrom`/`dateTo` memfilter waktu selesai.

#### `GET /api/dashboard/trend` (FR-63, fase lanjut)
- Query: `granularity=week|month`, `dateFrom`, `dateTo`
- 200: `data` = `[{ "period": "2026-10-05", "created": 0, "completed": 0 }]`

Pembaruan real-time (FR-31) tidak butuh endpoint baru: FE subscribe Supabase Realtime pada `tasks` lalu memuat ulang `summary` (⚠️ pastikan Realtime aktif untuk tabel tersebut).

### 7.9 `GET /api/tasks` ✅

Sudah diimplementasikan. Kontrak aktual ada di **Bagian 3**.

Perbedaan dari usulan awal: parameter aktual adalah `technicianId` (bukan `assigneeId`), `sortOrder` (bukan `order`), `sortBy` hanya `due_date` atau default `created_at`, dan `status`/`priority` hanya menerima satu nilai. Belum ada `assetType`, `createdFrom`, `createdTo`. `includeDeleted=true` tetap dibatasi RLS.

**Riwayat servis (FR-40/41):** memakai `GET /api/service-history` (Bagian 7.5) dengan filter client, asset, divisi, teknisi, dan rentang `completed_at`.

### 7.10 Keputusan bisnis yang perlu kamu putuskan 🔒

Kolom **Default** adalah yang dipakai dalam desain di atas. Ubah kolom **Keputusan** bila berbeda.

| ID | Pertanyaan | Default | Alternatif | Keputusan |
|---|---|---|---|---|
| D1 | `divisionId` task boleh diubah setelah dibuat? | Tidak (immutable) | Boleh jika belum ada assignment | Implementasi saat ini: **boleh** untuk SUPER_ADMIN/MANAGER_DIVISION (trigger), app layer tidak memblokir |
| D2 | Task `COMPLETED`/`CANCELLED` boleh diedit? | Tidak, kecuali `deleted` | Boleh edit `description` | Implementasi saat ini: **tidak dibatasi**; task berstatus apa pun dapat diedit sesuai izin kolom |
| D3 | Unassign saat task `COMPLETED`/`CANCELLED`? | Ditolak (409) | Boleh | |
| D4 | Kapan service report boleh dibuat? | Hanya status `COMPLETED` | Juga `ON_HOLD` / kapan saja | |
| D5 | Banyak report per task? | Boleh (immutable; koreksi = report baru) | Satu report per task | |
| D6 | TECHNICIAN yang membuat report harus ter-assign? | Tidak, cukup satu divisi (ikut RLS) | Wajib ada di `task_assignments` | |
| D7 | Siapa yang boleh jadi anggota tim? | `TECHNICIAN` satu divisi dengan tim | Semua role non-admin | |
| D8 | Cara membuat user | Admin set password sementara | Invite via email | |
| D9 | Hapus user | Soft delete saja (FK `Restrict`) | — | |
| D10 | Definisi waktu penyelesaian (FR-61) | `tasks.created_at` → saat `COMPLETED` | `IN_PROGRESS` pertama → `COMPLETED`; atau kolom `completed_at` (P7) | |
| D11 | MANAGER_DIVISION dibatasi divisinya sendiri? | Ya, di app layer untuk endpoint baru | Ikuti RLS saat ini (semua divisi, temuan #11) | |

### 7.11 Urutan implementasi usulan (vertical slice)

| Slice | Isi | Prasyarat | Membuka di FE |
|---|---|---|---|
| S1 | `GET /divisions`, filter `GET /users` | — | Form create task, dropdown assign teknisi |
| S2 | `PATCH /tasks/:taskId`, `DELETE` assignment, filter `GET /tasks` | P1 | Menu Tasks lengkap (edit, hapus, filter, search) |
| S3 | Service reports | P1 | Laporan servis + tampilan cetak |
| S4 | Users admin | P2, P3, P4 | Halaman kelola pengguna |
| S5 | Teams & workload | P5, P6 | Halaman tim & beban kerja |
| S6 | Dashboard | P6 (P7 opsional) | Dashboard & laporan performa |

Status per v0.2: S1 sebagian (divisions ✅, filter users sebagian), S2 sebagian (`PATCH` task ✅, filter ✅, unassign 🔜), S3 🔜, S4 🔜, S5 🔜, S6 sebagian (summary ✅, technicians/trend 🔜).

---

## 8. Temuan & keputusan yang perlu diambil

Status: **Masih** = perlu tindakan; **Selesai** = sudah sesuai implementasi; **Sebagian** = sebagian endpoint sudah benar.

| # | Temuan | Status | Dampak / catatan |
|---|---|---|---|
| 1 | `ok()`/`created()` status code | ✅ Selesai | `ok` = 200, `created` = 201. |
| 2 | Bentuk `data` tidak seragam: list ber-key (`tasks`, `clients`, `assets`, `notifications`) vs array langsung (`users`, `divisions`, attachments) vs key camelCase dashboard | 🐞 Sebagian (update `{ notification }` sudah diseragamkan) | Setiap fitur butuh handling berbeda di FE; sulit membuat hook list generik. |
| 3 | Request camelCase, response snake_case, alias relasi camelCase | 🐞 Masih | FE harus mapping manual, rawan salah nama field. |
| 4 | `deleted_at` tidak dikembalikan di list/detail clients & assets | 🐞 Masih | FE tidak bisa menampilkan status "dihapus" atau tombol restore. |
| 5 | `getClientDetail` memilih `assets.description` (kolom tidak ada di schema) | 🐞 Masih | Endpoint berpotensi 500. Ganti ke `serial_number, type`. |
| 6 | `attachProfile` tidak dipasang di `/notifications` | ✅ Selesai | Mount `/notifications` memakai `requireAuth` + `attachProfile`; user nonaktif/soft-deleted → 403. |
| 7 | `updateTaskStatus` mengembalikan `select *` | 🐞 Masih | Bentuk response berbeda dari list/detail. |
| 8 | Not-found: `.maybeSingle()` (task) vs `.single()` + PGRST116 (lainnya) | ✅ Sebagian | Task detail/update sudah 404 eksplisit; endpoint lain masih mengandalkan PGRST116 / `.single()`. |
| 9 | Envelope error | ✅ Selesai | `{ success:false, message }`; `error` hanya non-production jika ada `details`; detail DB tidak dikirim di production. |
| 10 | `users.deleted_at` dipilih tapi tidak ada di schema | ✅ Selesai | Kolom sudah ada di schema dan ikut di-select. |
| 11 | RLS `tasks` memberi MANAGER_DIVISION akses semua divisi | ⚠️ Masih | Berbeda dengan SRS ("laporan divisinya"); app layer juga tidak membatasi division. |
| 12 | Policy/trigger UPDATE `tasks` untuk TECHNICIAN | ✅ Selesai | Trigger mengizinkan `status`, `description`, `updated_at`; status via RPC. Update title oleh technician terverifikasi 403. |
| 13 | FK `onDelete: Restrict` ke `users` + `users.deleted_at` | ✅ Selesai | `users.deleted_at` ada; endpoint user admin/soft delete belum diimplementasikan. |
| 14 | Policy `team_members` tidak ada; policy `teams` hanya SUPER_ADMIN | 🐞 Masih | Fitur tim terblokir atau terbuka tanpa kontrol; perlu P5. |
| 15 | Pengecekan `is_active` | ✅ Selesai | `attachProfile` menolak inactive/deleted di semua mount, termasuk `/notifications`. |
| 16 | `GET /api/tasks/:taskId` menyertakan `reports[].snapshot_data` | ✅ Selesai | Embed `reports` tanpa `snapshot_data`; snapshot lewat endpoint detail report. |
| 17 | `tasks` tidak punya `completed_at` | ✅ Selesai | Kolom `completed_at` + index; diturunkan dari status oleh trigger; backfill dari `task_status_history`. |
| 18 | `GET /notifications?isRead=false` | ✅ Selesai | `isRead` di-parse eksplisit (`true`/`false`); `false` memfilter `is_read = false`. |
| 19 | Assets soft-deleted terlihat semua role | 🐞 Baru | RLS `USING(TRUE)` + `deleted_at` tidak di-select; list bisa memuat asset terhapus tanpa penanda. |
| 20 | `updateClient` email | 🐞 Baru | Kondisi `email !== undefined \|\| email !== null \|\| email !== ""` selalu true; email selalu masuk payload dan tidak bisa dikosongkan sebagai satu-satunya perubahan. |
| 21 | Pesan 42501 attachment | 🐞 Baru | `createTaskAttachment` mengembalikan `"you are not allowed to create a new client"` (salah konteks). |
| 22 | Dashboard summary untuk TECHNICIAN | ⚠️ Baru | Tidak ada penolakan 403 di app layer; technician mendapat data sesuai RLS. Perlu konfirmasi apakah sesuai SRS. |
| 23 | Dashboard shape vs desain awal | ✅ Terdokumentasi | Aktual memakai camelCase dan field `activeTasks`, `completedToday`, dll. (Bagian 6B), bukan `total/by_status/by_priority`. |
| 24 | `updateTask` tidak membatasi status task / validasi asset-client | 🐞/⚠️ Baru | Task `COMPLETED`/`CANCELLED` masih bisa diedit; `assetId` tidak divalidasi milik `clientId`; `divisionId` bisa diubah admin/manager. |
| 25 | `GET /users` parameter | ⚠️ Baru | Implementasi memakai `division`, `status`; desain awal memakai `divisionId`, `isActive`. FE harus mengikuti implementasi saat ini. |
| 26 | `testConnection` di `GET /users` | 🐞 Baru | Cek network interface, bukan internet; bisa 500 `"the internet is offline"` tanpa alasan yang tepat. |
| 27 | Pesan validasi `POST /clients` | 🐞 Baru | Pesan menyebut `email` wajib, padahal `email` opsional. |
| 28 | `GET /users?status=false` | ✅ Selesai | Controller memakai `typeof status === "boolean"` dan `boolParser` kini benar-benar mengubah `"false"` menjadi boolean di Express 5. |
| 29 | Pemetaan `22P02` di create/update task | 🐞 Baru | Selalu dikembalikan sebagai `"Invalid priority value"`, padahal `22P02` juga bisa berarti UUID malformed pada `divisionId`/`clientId`/`assetId`. |
| 30 | `listClients`/`listAssets` cek `data.length` sebelum `error` | 🐞 Baru | Jika query gagal dan `data` bernilai `null`, pengecekan ini bisa melempar error yang tidak tertangani. |

---

## 9. Informasi / pekerjaan yang masih tersisa (⚠️)

**Sudah tidak diperlukan lagi** karena sudah ada di repo: util `ok`/`created`/`ApiError`, global error handler, parameter `listTasks`, body/RPC `updateTaskStatus`, validasi `assignTask`, key body attachment, filter `listUsers`, field `updateAsset`, format header auth, policy `users`, trigger `enforce_user_column_restrictions`, dan fungsi `update_task_status`.

Yang masih diperlukan:

1. Policy `team_members` + izin MANAGER_DIVISION menulis `teams` divisinya (P5).
2. Implementasi endpoint yang masih 🔜: unassign, teams, dashboard technicians/trend.
3. Konfirmasi apakah TECHNICIAN boleh mengakses dashboard summary (saat ini 200 dengan data RLS, bukan 403).
4. Konfirmasi apakah assets soft-deleted memang harus terlihat semua role (saat ini ya, tanpa `deleted_at` di response).
5. Perbaikan bug #4, #5, #19, #20, #21, #24, #26, #27, #29, #30.
6. Keputusan bisnis D2–D11 (D1 saat ini sudah mengikuti implementasi: admin/manager boleh ubah division).

---

## 10. Changelog

| Versi | Tanggal | Perubahan |
|---|---|---|
| v0 | 2026-10-14 | Draft as-is dari kode yang ada |
| v0.1 | 2026-10-15 | Bagian 7 diganti desain lengkap (divisions, edit/soft delete task, unassign, reports, users, teams, dashboard, filter tasks); tambah prasyarat P1–P7, keputusan D1–D11, temuan #12–#17 |
| v0.2 | 2026-10-21 | Sinkronisasi dengan implementasi: envelope sukses/error, middleware mount, filter/response tasks, `PATCH /api/tasks/:taskId`, divisions, dashboard summary, query users, clients/assets, attachment signed URL; menambah temuan #18–#30 dan memperbarui daftar pekerjaan tersisa |
| v0.3 | 2026-10-27 | Notifikasi in-app (Sesi 3): mount `/notifications` memakai `attachProfile`, filter `isRead=false`, `totalPages`, endpoint `unread-count` dan `read-all`, catatan Realtime; `boolParser` diperbaiki untuk Express 5 (filter `includeDeleted`/`status` kembali bekerja); temuan #6, #15, #18, #28 selesai |
| v0.4 | 2026-10-27 | Riwayat servis (Sesi 4): `tasks.completed_at`, endpoint service report per task dan global, `GET /api/service-history` + export CSV, embed `reports` tanpa `snapshot_data`; P7, temuan #16, #17 selesai |
