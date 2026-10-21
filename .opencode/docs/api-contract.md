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
| `/notifications` | ✓ | ✗ 🐞 |
| `/clients` | ✓ | ✓ |
| `/assets` | ✓ | ✓ |
| `/divisions` | ✓ | ✓ |
| `/dashboard` | ✓ | ✓ |

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
- Boolean query di-parse global oleh `boolParser` untuk string `true`/`false`.
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

## 2. Users

### `GET /api/users` ✅
- Visibility (RLS `users`): SUPER_ADMIN melihat semua; MANAGER_DIVISION melihat semua user non-SUPER_ADMIN yang belum soft-deleted; STAFF melihat diri sendiri + TECHNICIAN; TECHNICIAN hanya melihat dirinya sendiri.
- Query:
  - `role` → `Role`
  - `division` → UUID, dipetakan ke `division_id`
  - `status` → boolean `is_active` (hasil `boolParser`); `status=true` memfilter user aktif, tetapi `status=false` **tidak memfilter** karena kode memakai `if (status)` (temuan #28); nilai selain `true`/`false` dibandingkan apa adanya
- 200: `data` = **array langsung** (tanpa pagination), urut `name` asc

```json
[{ "id": "", "name": "", "email": "", "role": "", "is_active": true,
   "division_id": "", "deleted_at": null, "created_at": "", "updated_at": "" }]
```

- `users.deleted_at` sudah ada di schema dan ikut di-select.
- 🐞 `testConnection()` mengecek keberadaan network interface, bukan konektivitas internet; jika false → 500 `"the internet is offline"` (temuan #26).

🔜 `POST` dan `PATCH /api/users` (FR-03, Super Admin; hapus = soft delete lewat PATCH). Desain: Bagian 7.6.

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
| `technicianId` | uuid | pre-query `task_assignments.user_id`, lalu filter `tasks.id in (...)`; jika tidak ada assignment → list kosong |
| `dueFrom`, `dueTo` | tanggal / ISO | `YYYY-MM-DD` dinormalisasi ke awal/akhir hari UTC; filter `due_date` |
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
- Role: TECHNICIAN ditolak app layer (403); role lain mengikuti RLS insert (`role != TECHNICIAN`). Tidak ada pengecekan divisi MANAGER_DIVISION di app layer.
- Body:

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `title` | string | ✓ | |
| `description` | string | ✓ | |
| `divisionId` | uuid | ✓ | |
| `clientId` | uuid | ✓ | |
| `priority` | `Priority` | ✗ | default DB `MEDIUM` |
| `dueDate` | ISO string / null | ✗ | |
| `assetId` | uuid / null | ✗ | |

- `status` tidak dibaca dari body (default DB `PENDING`); `created_by_id` diambil dari token.
- 201: `data` = **baris `tasks` mentah** (snake_case, tanpa relasi), message `"Task created"`
- Error: 400 field wajib; 400 `"Invalid divisionId, clientId, or assetId"` (23503); 400 `"Invalid priority value"` (22P02 — juga bisa muncul untuk UUID malformed, temuan #29); 403 TECHNICIAN; 500.

### `GET /api/tasks/:taskId` ✅
- 200: `data` =

```json
{
  "id": "", "title": "", "description": "", "priority": "", "status": "",
  "due_date": null, "created_at": "", "updated_at": "", "deleted_at": null,
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
                    "updated_at": "", "snapshot_data": { }, "createdBy": { "id": "", "name": "", "email": "" } }]
}
```

- `asset` bisa `null` (task tanpa aset).
- `attachments[].signed_url` dibuat server dan berlaku 24 jam; `file_url` tetap path asli di Storage. Jika pembuatan signed URL gagal, `signed_url` bernilai `null`.
- Not found: query memakai `.maybeSingle()`, lalu controller mengembalikan 404 `"Task not found or accessible"`.
- `reports[].snapshot_data` masih ikut di embed (temuan #16).

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
- Alur: memanggil RPC `update_task_status(p_task_id, p_new_status)`. RPC memastikan task ada, status berbeda, lalu mengubah `tasks.status` dan menulis `task_status_history` dengan `auth.uid()`.
- Tidak ada matriks transisi status; semua status berbeda yang valid diterima (mis. `COMPLETED` → `IN_PROGRESS`).
- 200: `data` = **baris `tasks` mentah (`select *`)**, message `"Task status updated"`
- Error: 400 status sama / status invalid; 403 tidak diizinkan; 404 task tidak ditemukan; 500.
- Side effect: notifikasi `STATUS_CHANGE` untuk assignee, manager divisi, dan pelaku.

### `PATCH /api/tasks/:taskId` ✅
- Body parsial: `title`, `description`, `priority`, `dueDate`, `divisionId`, `clientId`, `assetId`, `deleted`.
- `status` selalu ditolak → 400 `"Use PATCH /api/tasks/:taskId/status to update task status"`.
- `deleted` harus boolean; `deleted: true` mengisi `deleted_at`, `false` mengosongkan.
- Minimal satu field; field tak dikenal diabaikan (jika semua tak dikenal → 400).
- `dueDate: null` dan `assetId: null` mengosongkan nilai.
- Otorisasi: **app layer tidak memeriksa role per field**; RLS + trigger `enforce_task_column_restrictions` yang menentukan:

| Role | Field yang diizinkan trigger |
|---|---|
| SUPER_ADMIN / MANAGER_DIVISION | semua kolom |
| STAFF | `priority`, `due_date`, `updated_at` |
| TECHNICIAN | `status`, `description`, `updated_at`; `status` ditolak app layer, jadi efektif `description` |

- RLS juga membatasi STAFF/TECHNICIAN ke task yang belum soft-deleted dan TECHNICIAN ke divisinya.
- `divisionId` **boleh diubah** oleh SUPER_ADMIN/MANAGER_DIVISION (berbeda dari desain awal D1).
- Tidak ada validasi bahwa `assetId` milik `clientId`; tidak ada larangan edit task `COMPLETED`/`CANCELLED`.
- 200: baris `tasks` mentah, message `"Task updated successfully"` atau `"Task deleted successfully"`.
- Error: 400 (body kosong, `deleted` bukan boolean, `status`, referensi invalid, NOT NULL, tanggal/priority invalid; 22P02 selalu dipetakan sebagai `"Invalid priority value"` meskipun penyebabnya UUID malformed, temuan #29); 403 (`P0001`/`42501`); 404 (`PGRST116`); 500.

### `GET /api/tasks/:taskId/attachments` ✅
- 200: `data` = **array langsung**, urut `uploaded_at` desc

```json
[{ "id": "", "file_url": "", "file_name": "", "file_type": "", "uploaded_at": "",
   "uploadedBy": { "id": "", "name": "", "email": "" }, "signed_url": "" }]
```

- `file_url` berisi **path di Storage**, bukan URL publik (bucket private). `signed_url` adalah URL siap pakai dari Supabase Storage dan berlaku 24 jam.

### `POST /api/tasks/:taskId/attachments` ✅
- Alur: FE upload ke Supabase Storage bucket `task_attachments` dengan path `{taskId}/{filename}` → FE kirim metadata ke endpoint ini.
- Batas bucket: 5 MB; MIME `image/png`, `image/webp`, `application/pdf` (aturan bucket, bukan validasi app).
- Body: `{ "filePath": "", "fileName": "", "fileType": "" }` — ketiganya wajib.
- Validasi: folder pertama `filePath` harus sama dengan `:taskId`; jika tidak cocok atau insert DB gagal, server menghapus file di Storage (compensating action).
- 201: `data` = `{ id, task_id, file_url, file_name, file_type, uploaded_at, uploaded_by_id, signed_url }`, message `"Task attachment created"`
- Role (RLS): SUPER_ADMIN, MANAGER_DIVISION, TECHNICIAN (divisi sendiri), STAFF.
- Error: 400; 403 (pesan 42501 masih salah konteks, temuan #21); 500.

### `DELETE /api/tasks/:taskId/attachments/:attachmentId` ✅
- Role (RLS): SUPER_ADMIN & MANAGER_DIVISION semua; TECHNICIAN hanya miliknya & divisi sendiri; STAFF tidak bisa.
- 200: `data: null`, message `"Task attachment deleted"`
- File di Storage ikut dihapus setelah baris DB terhapus; jika penghapusan file gagal, error hanya dicatat di server log.
- Error: 404 jika attachment tidak ditemukan; 500.

🔜 Belum ada: `DELETE /api/tasks/:taskId/assignments/:assignmentId` (unassign), endpoint service reports, `POST/PATCH /api/users`, teams, `GET /api/dashboard/technicians`, `GET /api/dashboard/trend`.

---

## 4. Notifications

Visibility: hanya milik sendiri (`user_id = auth.uid()`), **tanpa pengecualian SUPER_ADMIN**. Baris dibuat oleh trigger, bukan oleh API. Mount `/notifications` tidak memakai `attachProfile` (temuan #6).

### `GET /api/notifications` ✅
- Query: `page`, `limit`, `isRead` (boolean hasil `boolParser`).
- `isRead=true` → filter `is_read = true`; `isRead=false` **tidak memfilter** karena kode memakai `if (isRead)` (temuan #18); nilai truthy non-boolean → 400 `"Invalid isRead query parameter"`.
- 200: `data` = `{ notifications: [...], pagination: { page, limit, total } }` (tanpa `totalPages`)
- Field item (`select *`): `id, user_id, title, message, type, is_read, created_at, related_task_id`.

### `PATCH /api/notifications/:id` ✅
- Tanpa body; selalu menandai `is_read = true` (tidak bisa un-read: dibatasi RLS `WITH CHECK` + column grant).
- 200: `data` = `{ notification: {...} }` 🐞 (satu-satunya update yang membungkus objek)
- Error: 404 `"Notification not found"`; 500 `"Failed to update notification"`.

---

## 5. Clients

Visibility (RLS): TECHNICIAN & STAFF hanya baris aktif (`deleted_at IS NULL`); MANAGER_DIVISION & SUPER_ADMIN juga melihat soft-deleted.

### `GET /api/clients` ✅
- Query: `page`, `limit`, `search`
- 200: `data` = `{ clients: [...], pagination: { page, limit, total } }` (tanpa `totalPages`)
- Item: `{ id, name, contact, email, address, service_type, created_at, updated_at }` — **tanpa `deleted_at`** 🐞
- `search` hanya pada `name`; jika `search` diisi dan hasil kosong → 404 `"No clients found matching with the search criteria"`.
- Error query → 500 `"failed to fetch clients"`.
- 🐞 Pengecekan `data.length` dilakukan sebelum `error`; jika query gagal dan `data` null, proses bisa error (temuan #30).

### `GET /api/clients/:clientId` ✅
- 200: `data` = field di atas + `tasks: [{ id, title, description, priority, status, due_date, created_at, updated_at }]` + `assets: [{ id, name, description, created_at, updated_at }]`
- 🐞 Query memilih `assets.description`, sedangkan tabel `assets` tidak punya kolom itu (`id, name, serial_number, type, client_id, deleted_at, ...`) → endpoint berpotensi 500. Seharusnya `serial_number, type`.
- Not found: `.single()` → PGRST116 → 404 `"client not found"`.

### `POST /api/clients` ✅
- Role (RLS): semua kecuali TECHNICIAN.
- Body: `{ name, contact, email?, address, serviceType }`; `email` boleh `null`.
- 201: baris `clients` mentah, message `"Client created successfully"`.
- Error: 400 field wajib (pesan menyebut `email` wajib padahal opsional, temuan #27); 403 `"you are not allowed to create a new client"` (42501); 500.

### `PATCH /api/clients/:clientId` ✅
- Body parsial `{ name?, contact?, email?, address?, serviceType?, deleted? }`; minimal satu field.
- `deleted`: `true` = soft delete, `false` = restore. Hanya diterapkan jika bertipe boolean.
- Role: TECHNICIAN ditolak app layer (403); STAFF boleh update baris aktif tetapi **tidak boleh** `deleted: true` (403); MANAGER_DIVISION/SUPER_ADMIN boleh update dan soft delete/restore.
- RLS juga menolak STAFF/TECHNICIAN mengedit baris soft-deleted.
- 🐞 Kondisi email `email !== undefined || email !== null || email !== ""` selalu true; `email` selalu masuk payload dan tidak bisa dikosongkan sebagai satu-satunya perubahan (temuan #20).
- 200: baris `clients` mentah; message `"Client updated successfully"` / `"Client deleted successfully"`.
- Error: 400 tidak ada field; 403; 404 `"Client not found"` (PGRST116); 500.

---

## 6. Assets

Visibility/aksi: RLS `USING(TRUE)` untuk semua role. Asset soft-deleted **tetap terlihat** oleh semua role karena tidak ada filter `deleted_at`; perlu konfirmasi apakah ini memang disengaja (temuan #19).

### `GET /api/assets` ✅
- Query: `page`, `limit`, `search`
- 200: `data` = `{ assets: [...], pagination: { page, limit, total } }` (tanpa `totalPages`)
- Item: `{ id, name, serial_number, type, client: { id, name }, created_at, updated_at }` — **tanpa `deleted_at`** 🐞
- `search` hanya pada `name`; jika `search` diisi dan hasil kosong → 404 `"No assets found matching with the search criteria"`.
- Error query → 500 `"failed to fetch assets"`.
- 🐞 Pengecekan `data.length` juga dilakukan sebelum `error` (temuan #30).
- 🐞 Karena soft-deleted tetap terlihat dan `deleted_at` tidak dikembalikan, list dapat memuat asset terhapus tanpa penanda (temuan #19).

### `GET /api/assets/:assetId` ✅
- 200: field di atas + `tasks: [{ id, title, description, due_date, created_at, updated_at }]`
- Not found: `.single()` → PGRST116 → 404 `"asset not found"`; error lain → 500 `"failed to fetch asset detail"`.

### `POST /api/assets` ✅
- Body: `{ name, type, clientId, serialNumber? }` (`serialNumber` kosong → `null`).
- 201: baris `assets` mentah, message `"Asset created successfully"`.
- Error: 400 field wajib; 400 `"Invalid client ID"` (23503); 500.

### `PATCH /api/assets/:assetId` ✅
- Body parsial: `name`, `serialNumber` (`""` → `null`), `type`, `clientId`, `deleted` (boolean); minimal satu field.
- Semua role authenticated dapat mengubah/soft delete/restore sesuai RLS `USING(TRUE)`; app layer tidak membatasi role.
- 200: baris `assets` mentah, message `"Asset updated successfully"` / `"Asset deleted successfully"`.
- Error: 400 tidak ada field / `"Invalid client ID"` (23503); 404 `"Asset not found"` (PGRST116); 500.

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
| P4 | Middleware menolak `is_active = false` atau `deleted_at` terisi dengan 403 | ✅ Sebagian: `attachProfile` sudah menolak; `/notifications` belum memakai `attachProfile` | — |
| P5 | Policy `team_members` + izin MANAGER_DIVISION menulis `teams` divisinya sendiri (saat ini hanya SUPER_ADMIN) | 🔜 Belum | 7.7 |
| P6 | View/fungsi SQL `SECURITY INVOKER` untuk agregat | ✅ Sebagian: `get_dashboard_summary` sudah ada; agregat tim/workload dan dashboard tambahan belum | 7.7, 7.8 |
| P7 | (Opsional) kolom `tasks.completed_at`, diisi saat status menjadi `COMPLETED` | 🔜 Belum | 7.8 (D10), filter riwayat servis |

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

### 7.5 Service reports 🔜 🔒

Report bersifat **immutable** (RLS tidak punya policy UPDATE/DELETE). Koreksi = membuat report baru (D5).

#### `POST /api/tasks/:taskId/reports`

- Role (RLS insert): SUPER_ADMIN, MANAGER_DIVISION, TECHNICIAN (divisi task, task tidak soft-deleted). STAFF → 403. (D6: apakah TECHNICIAN harus tercatat di assignment)
- Body:

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `summary` | string | ✓ | ⚠️ batas panjang usulan: 2000 karakter |
| `actionTaken` | string | ✓ | idem |
| `notes` | string / `null` | ✗ | |

- `snapshotData` **tidak diterima dari client** (mengirimnya → 400). Server membuatnya saat report dibuat, supaya report tetap utuh walau data task/klien berubah kemudian.
- Aturan: task harus berstatus `COMPLETED` (D4) → selain itu 409.
- Isi `snapshot_data` (key snake_case, disimpan apa adanya):

```json
{
  "task": { "id": "", "title": "", "description": "", "priority": "", "status": "", "due_date": null, "created_at": "" },
  "division": { "id": "", "name": "" },
  "client": { "id": "", "name": "", "contact": "", "email": null, "address": "", "service_type": "" },
  "asset": { "id": "", "name": "", "serial_number": null, "type": "" },
  "technicians": [{ "id": "", "name": "", "email": "" }],
  "status_history": [{ "old_status": "", "new_status": "", "changed_at": "", "changed_by": { "id": "", "name": "" } }],
  "generated_at": ""
}
```

  (`asset` bernilai `null` bila task tanpa aset.)

- 201: `data` = `{ id, task_id, created_by_id, summary, action_taken, notes, snapshot_data, created_at, updated_at }`, message `"Service report created"`
- Error: 400 · 403 · 404 · 409

#### `GET /api/tasks/:taskId/reports`

- Role: yang dapat melihat task (RLS)
- 200: `data` = array, urut `created_at` desc, **tanpa `snapshot_data`**

```json
[{ "id": "", "summary": "", "action_taken": "", "notes": null, "created_at": "",
   "createdBy": { "id": "", "name": "", "email": "" } }]
```

#### `GET /api/tasks/:taskId/reports/:reportId`

- 200: `data` = report lengkap **termasuk `snapshot_data`** (dipakai untuk tampilan cetak). Report bukan milik `:taskId` → 404.

Catatan: embed `reports` di `GET /api/tasks/:taskId` saat ini ikut membawa `snapshot_data` (payload berat) → usul dihapus dari embed (temuan #16). Export PDF/CSV (FR-42) masuk fase lanjut; untuk MVP FE bisa merender dari `snapshot_data` dan mencetak dengan `window.print()`.

### 7.6 Users 🔜 🔒

#### Query `GET /api/users`

Status: endpoint sudah ada; kontrak aktual ada di **Bagian 2**. Implementasi memakai `role`, `division`, dan `status`; belum ada `divisionId`, `isActive`, `search`, atau `includeDeleted`.

Target pengembangan berikutnya (belum diimplementasikan): `search` (`name`/`email`) dan `includeDeleted` untuk SUPER_ADMIN. Tetap array tanpa pagination; tambahkan pagination bila jumlah user diperkirakan > ~100.

#### `POST /api/users` — hanya SUPER_ADMIN

- Body:

| Field | Tipe | Wajib | Catatan |
|---|---|---|---|
| `name` | string | ✓ | |
| `email` | string | ✓ | format email, unik |
| `password` | string | ✓ | min 8 karakter; **tidak pernah dikembalikan atau di-log** |
| `role` | `Role` | ✓ | |
| `divisionId` | uuid / `null` | ✓ untuk `TECHNICIAN` & `MANAGER_DIVISION` | `SUPER_ADMIN` & `STAFF`: boleh `null` |

- Alur 🔒:
  1. Validasi input; pastikan `divisionId` ada.
  2. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`.
  3. Insert ke `users` dengan `id` = id user Auth, `role`, `division_id`.
  4. Jika langkah 3 gagal → compensating: `supabaseAdmin.auth.admin.deleteUser(id)`; jika itu pun gagal, log dan kembalikan error aslinya.
- 201: `data` = `{ id, name, email, role, is_active, division_id, created_at, updated_at }`, message `"User created"`
- Error: 400 · 403 · 409 (email sudah terdaftar) · 500

#### `PATCH /api/users/:userId` — hanya SUPER_ADMIN

- Body parsial (minimal satu): `name`, `role`, `divisionId` (nullable), `isActive` (boolean), `deleted` (boolean).
- Email immutable (MVP). Reset password = alur FR-05 via Supabase (`resetPasswordForEmail` dari FE), bukan endpoint ini.
- Aturan 🔒:
  1. Mengubah **diri sendiri** pada `role`, `isActive`, atau `deleted` → 400 (cegah lockout).
  2. `role`/`divisionId` mengikuti aturan validasi `POST`.
  3. `divisionId` berubah sementara user punya task aktif (`PENDING`/`IN_PROGRESS`/`ON_HOLD`) → 409.
  4. `isActive: false` atau `deleted: true` → server juga menonaktifkan akun di Supabase Auth (`updateUserById` dengan ban). `deleted: true` mengisi `deleted_at` dan `is_active = false`. Restore (`deleted: false`) mengosongkan `deleted_at`; `isActive` harus diaktifkan eksplisit.
  5. Token lama tetap valid sampai kedaluwarsa, jadi pemutus akses yang sebenarnya adalah middleware P4.
- 200: `data` = profil user (field sama dengan `POST`), message `"User updated"`
- Error: 400 · 403 · 404 · 409

**Tidak ada `DELETE /api/users`.** Hapus permanen mustahil: `tasks.created_by_id`, `task_status_history.user_id`, `task_attachments.uploaded_by_id`, dan `service_reports.created_by_id` memakai `onDelete: Restrict`. Hapus = soft delete lewat `PATCH { deleted: true }` (D9).

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

**Riwayat servis (FR-40/41) tidak butuh endpoint baru:** gunakan `status=COMPLETED` + `clientId` / `divisionId` + rentang tanggal. `assetId` belum menjadi filter `GET /api/tasks`. Catatan: tabel `tasks` belum punya `completed_at`, sehingga rentang "tanggal selesai" memerlukan join ke `task_status_history` atau kolom baru (P7).

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
| 2 | Bentuk `data` tidak seragam: list ber-key (`tasks`, `clients`, `assets`, `notifications`) vs array langsung (`users`, `divisions`, attachments) vs update yang membungkus (`{ notification }`) vs key camelCase dashboard | 🐞 Masih | Setiap fitur butuh handling berbeda di FE; sulit membuat hook list generik. |
| 3 | Request camelCase, response snake_case, alias relasi camelCase | 🐞 Masih | FE harus mapping manual, rawan salah nama field. |
| 4 | `deleted_at` tidak dikembalikan di list/detail clients & assets | 🐞 Masih | FE tidak bisa menampilkan status "dihapus" atau tombol restore. |
| 5 | `getClientDetail` memilih `assets.description` (kolom tidak ada di schema) | 🐞 Masih | Endpoint berpotensi 500. Ganti ke `serial_number, type`. |
| 6 | `attachProfile` tidak dipasang di `/notifications` | 🐞 Masih | User nonaktif/soft-deleted masih bisa mengakses notifications selama token valid. `/assets` sudah dipasang. |
| 7 | `updateTaskStatus` mengembalikan `select *` | 🐞 Masih | Bentuk response berbeda dari list/detail. |
| 8 | Not-found: `.maybeSingle()` (task) vs `.single()` + PGRST116 (lainnya) | ✅ Sebagian | Task detail/update sudah 404 eksplisit; endpoint lain masih mengandalkan PGRST116 / `.single()`. |
| 9 | Envelope error | ✅ Selesai | `{ success:false, message }`; `error` hanya non-production jika ada `details`; detail DB tidak dikirim di production. |
| 10 | `users.deleted_at` dipilih tapi tidak ada di schema | ✅ Selesai | Kolom sudah ada di schema dan ikut di-select. |
| 11 | RLS `tasks` memberi MANAGER_DIVISION akses semua divisi | ⚠️ Masih | Berbeda dengan SRS ("laporan divisinya"); app layer juga tidak membatasi division. |
| 12 | Policy/trigger UPDATE `tasks` untuk TECHNICIAN | ✅ Selesai | Trigger mengizinkan `status`, `description`, `updated_at`; status via RPC. Update title oleh technician terverifikasi 403. |
| 13 | FK `onDelete: Restrict` ke `users` + `users.deleted_at` | ✅ Selesai | `users.deleted_at` ada; endpoint user admin/soft delete belum diimplementasikan. |
| 14 | Policy `team_members` tidak ada; policy `teams` hanya SUPER_ADMIN | 🐞 Masih | Fitur tim terblokir atau terbuka tanpa kontrol; perlu P5. |
| 15 | Pengecekan `is_active` | ✅ Sebagian | `attachProfile` menolak inactive/deleted; `/notifications` tidak memakai `attachProfile`. |
| 16 | `GET /api/tasks/:taskId` menyertakan `reports[].snapshot_data` | 🐞 Masih | Payload detail task membengkak. |
| 17 | `tasks` tidak punya `completed_at` | 🐞 Masih | Filter riwayat servis per tanggal selesai dan rata-rata waktu penyelesaian harus join `task_status_history`. |
| 18 | `GET /notifications?isRead=false` | 🐞 Baru | Kode `if (isRead)` membuat `false` tidak memfilter; hasilnya semua notifikasi. |
| 19 | Assets soft-deleted terlihat semua role | 🐞 Baru | RLS `USING(TRUE)` + `deleted_at` tidak di-select; list bisa memuat asset terhapus tanpa penanda. |
| 20 | `updateClient` email | 🐞 Baru | Kondisi `email !== undefined \|\| email !== null \|\| email !== ""` selalu true; email selalu masuk payload dan tidak bisa dikosongkan sebagai satu-satunya perubahan. |
| 21 | Pesan 42501 attachment | 🐞 Baru | `createTaskAttachment` mengembalikan `"you are not allowed to create a new client"` (salah konteks). |
| 22 | Dashboard summary untuk TECHNICIAN | ⚠️ Baru | Tidak ada penolakan 403 di app layer; technician mendapat data sesuai RLS. Perlu konfirmasi apakah sesuai SRS. |
| 23 | Dashboard shape vs desain awal | ✅ Terdokumentasi | Aktual memakai camelCase dan field `activeTasks`, `completedToday`, dll. (Bagian 6B), bukan `total/by_status/by_priority`. |
| 24 | `updateTask` tidak membatasi status task / validasi asset-client | 🐞/⚠️ Baru | Task `COMPLETED`/`CANCELLED` masih bisa diedit; `assetId` tidak divalidasi milik `clientId`; `divisionId` bisa diubah admin/manager. |
| 25 | `GET /users` parameter | ⚠️ Baru | Implementasi memakai `division`, `status`; desain awal memakai `divisionId`, `isActive`. FE harus mengikuti implementasi saat ini. |
| 26 | `testConnection` di `GET /users` | 🐞 Baru | Cek network interface, bukan internet; bisa 500 `"the internet is offline"` tanpa alasan yang tepat. |
| 27 | Pesan validasi `POST /clients` | 🐞 Baru | Pesan menyebut `email` wajib, padahal `email` opsional. |
| 28 | `GET /users?status=false` | 🐞 Baru | Kode `if (status)` membuat `false` tidak memfilter; daftar user nonaktif tidak bisa difilter dengan parameter ini. |
| 29 | Pemetaan `22P02` di create/update task | 🐞 Baru | Selalu dikembalikan sebagai `"Invalid priority value"`, padahal `22P02` juga bisa berarti UUID malformed pada `divisionId`/`clientId`/`assetId`. |
| 30 | `listClients`/`listAssets` cek `data.length` sebelum `error` | 🐞 Baru | Jika query gagal dan `data` bernilai `null`, pengecekan ini bisa melempar error yang tidak tertangani. |

---

## 9. Informasi / pekerjaan yang masih tersisa (⚠️)

**Sudah tidak diperlukan lagi** karena sudah ada di repo: util `ok`/`created`/`ApiError`, global error handler, parameter `listTasks`, body/RPC `updateTaskStatus`, validasi `assignTask`, key body attachment, filter `listUsers`, field `updateAsset`, format header auth, policy `users`, trigger `enforce_user_column_restrictions`, dan fungsi `update_task_status`.

Yang masih diperlukan:

1. Policy `team_members` + izin MANAGER_DIVISION menulis `teams` divisinya (P5).
2. Keputusan `tasks.completed_at` atau cara menghitung waktu selesai (P7).
3. Implementasi endpoint yang masih 🔜: users admin, unassign, service reports, teams, dashboard technicians/trend.
4. Konfirmasi apakah TECHNICIAN boleh mengakses dashboard summary (saat ini 200 dengan data RLS, bukan 403).
5. Konfirmasi apakah assets soft-deleted memang harus terlihat semua role (saat ini ya, tanpa `deleted_at` di response).
6. Perbaikan bug #4, #5, #6, #18, #19, #20, #21, #24, #26, #27, #28, #29, #30.
7. Keputusan bisnis D2–D11 (D1 saat ini sudah mengikuti implementasi: admin/manager boleh ubah division).

---

## 10. Changelog

| Versi | Tanggal | Perubahan |
|---|---|---|
| v0 | 2026-10-14 | Draft as-is dari kode yang ada |
| v0.1 | 2026-10-15 | Bagian 7 diganti desain lengkap (divisions, edit/soft delete task, unassign, reports, users, teams, dashboard, filter tasks); tambah prasyarat P1–P7, keputusan D1–D11, temuan #12–#17 |
| v0.2 | 2026-10-21 | Sinkronisasi dengan implementasi: envelope sukses/error, middleware mount, filter/response tasks, `PATCH /api/tasks/:taskId`, divisions, dashboard summary, query users, clients/assets, attachment signed URL; menambah temuan #18–#30 dan memperbarui daftar pekerjaan tersisa |
