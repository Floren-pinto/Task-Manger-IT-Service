# Rencana Implementasi Task Management v1

Dokumen ini adalah acuan urutan implementasi tahap per tahap untuk modul Task Management.
Update terakhir: 20 Oktober 2026

- Branch kerja: `feat/crud-task`
- Status: Fase 0 selesai, Fase 1 (Tahap 1.1-1.4) selesai, Tahap 2.1 berikutnya
- Prinsip: satu tahap -> implementasi -> verifikasi -> commit -> review -> lanjut

---

## Aturan Kerja

1. Implementasi dilakukan per tahap, tidak digabung.
2. Setiap tahap di-commit terpisah, tidak langsung push.
3. Gunakan style penulisan yang sama dengan file yang sudah ada.
4. RLS policy Supabase adalah layer utama RBAC.
5. Backend tidak menduplikasi pengecekan role. Backend cukup menangkap error dari database (contoh `PGRST116`, `P0001`, `42501`) lalu memetakan ke `ApiError`.
6. Perubahan aturan akses cukup dilakukan di RLS policy database.
7. Setelah setiap tahap: jalankan pengecekan syntax/lint, uji manual, lalu commit.

---

## Ringkasan Tahap

| Tahap | Deliverable | Status |
|---|---|---|
| 1.1 | `GET /api/divisions` | [x] Selesai (`bce3ba2`) |
| 1.2 | `PATCH /api/tasks/:taskId` + soft delete | [x] Selesai (`9a12135`) |
| 1.3 | Search/filter/sort/pagination `GET /api/tasks` | [x] Selesai (`4a40587`) |
| 1.4 | `GET /api/dashboard/summary` | [x] Selesai (`15701fd`) |
| 2.1 | Service & hook frontend | [ ] |
| 2.2 | Halaman `/tasks` + filter/pagination | [ ] |
| 2.3 | Dialog create task | [ ] |
| 2.4 | Edit + soft delete task | [ ] |
| 2.5 | Dashboard refactor + sentralisasi status | [ ] |
| 2.6 | Cleanup, lint, README, Swagger | [ ] |

---

## Fase 0 — Sudah Selesai

Catatan agar tidak dikerjakan ulang:

- `attachProfile` sudah mengambil dan memeriksa `deleted_at`.
- Notification `id` sudah terisi otomatis di Supabase.
- Signed URL attachment sudah dibuat:
  - `server/src/utils/attachmentUrl.js`
  - berlaku 1 hari (`60 * 60 * 24` detik)
  - response attachment memiliki `signed_url`
  - frontend memakai `signed_url`, fallback hanya untuk URL `http(s)`
- Assets boleh ditulis semua role sesuai keputusan desain; RLS menjadi penentu.
- Perubahan Fase 0 sudah di-commit terpisah sebagai `c9b181d fix task attachment`.

---

# Fase 1 — Backend

## Tahap 1.1 — Divisions endpoint

Status: [x] Selesai
Commit: `bce3ba2 feat(division): create division route and controller`

**File:**
- `server/src/controllers/division.controller.js`
- `server/src/routes/division.routes.js`
- `server/src/routes/index.js`

**Endpoint:**
```http
GET /api/divisions
```

**Perilaku:**
- Mengembalikan `id, name, description, created_at, updated_at`.
- Diurutkan berdasarkan `name`.
- Memakai `requireAuth` + `attachProfile`.
- Controller hanya menangkap error database lalu melempar `ApiError`.
- RLS `divisions` menentukan akses.

**Verifikasi:**
- `node --check` lolos.
- `GET /health` -> 200.
- `GET /api/divisions` tanpa token -> 401.

---

## Tahap 1.2 — Update task & soft delete

Status: [x] Selesai
Commit: `9a12135 feat(task): add task update and soft delete endpoint`

**File:**
- `server/src/controllers/task.controller.js`
- `server/src/routes/task.routes.js`

**Endpoint:**
```http
PATCH /api/tasks/:taskId
```

**Body yang didukung:**
```json
{
  "title": "...",
  "description": "...",
  "priority": "HIGH",
  "dueDate": "2026-10-30T00:00:00.000Z",
  "divisionId": "...",
  "clientId": "...",
  "assetId": "...",
  "deleted": true
}
```

**Aturan:**
- `status` tidak diterima di endpoint ini. Status tetap melalui:
  ```http
  PATCH /api/tasks/:taskId/status
  ```
  agar history dan notifikasi tercatat.
- `deleted: true` -> set `deleted_at = now()`.
- `deleted: false` -> set `deleted_at = null`.
- `dueDate: null` dan `assetId: null` boleh dipakai untuk mengosongkan field.
- Payload kosong -> 400.
- Task tidak ditemukan -> 404.
- Pelanggaran kolom oleh trigger database (`P0001`) dipetakan ke 403 dengan pesan yang jelas.
- Tidak ada pengecekan role di controller. RLS + trigger database yang menolak.

**Definition of done per role:**
- Staff dapat update `priority` dan `dueDate`; field lain ditolak database.
- Technician dapat update `description`; status tetap melalui endpoint status.
- Manager/Super Admin dapat update semua field dan soft delete.
- Task yang sudah di-soft-delete tidak muncul di list default.

**Verifikasi:**
- Uji matrix role Manager, Staff, Technician.
- Uji payload kosong, task tidak ditemukan, dan field terlarang.
- Pastikan soft delete tidak menghapus baris secara permanen.

---

## Tahap 1.3 — List task dengan server-side query

Status: [x] Selesai
Commit: `4a40587 feat(task): add server-side task query`

**File:**
- `server/src/controllers/task.controller.js`
- opsional helper baru: `server/src/utils/taskQuery.js`

**Endpoint:**
```http
GET /api/tasks
  ?search=
  &status=
  &priority=
  &divisionId=
  &clientId=
  &technicianId=
  &dueFrom=
  &dueTo=
  &sortBy=created_at|due_date
  &sortOrder=asc|desc
  &page=1
  &limit=20
  &includeDeleted=false
```

**Perilaku:**
- `search` minimal untuk `title` dan prefix `id`.
- Frontend menghapus karakter `#` sebelum mengirim search.
- `technicianId` dicari melalui `task_assignments`, lalu task difilter dengan `.in("id", taskIds)`.
- Default hanya menampilkan task dengan `deleted_at IS NULL`.
- `includeDeleted=true` hanya berlaku untuk `SUPER_ADMIN` dan `MANAGER_DIVISION`; role lain tetap difilter.
- Sorting awal: `created_at` dan `due_date`.
- Response pagination:
  ```json
  {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
  ```

**Definition of done:**
- Task lebih dari 20 bisa diakses halaman berikutnya.
- Filter status, priority, division, client, technician, dan tanggal bisa digabung.
- Search dan sort bekerja di server.
- Task soft-deleted tidak muncul secara default.

**Verifikasi:**
- Uji pagination, kombinasi filter, search, dan sort.
- Uji role yang tidak boleh melihat deleted task.

---

## Tahap 1.4 — Dashboard summary

Status: [x] Selesai
Commit: `15701fd feat(dashboard): add dashboard summary endpoint`
Catatan deploy: jalankan `server/supabase/sql/functions/05_dashboard_functions.sql` di Supabase SQL editor sebelum memakai endpoint.

**File:**
- `server/supabase/sql/functions/05_dashboard_functions.sql`
- `server/src/controllers/dashboard.controller.js`
- `server/src/routes/dashboard.routes.js`
- `server/src/routes/index.js`

**Endpoint:**
```http
GET /api/dashboard/summary
```

**Response:**
```json
{
  "activeTasks": 12,
  "completedToday": 3,
  "overdue": 2,
  "unassigned": 4,
  "byStatus": {
    "PENDING": 5,
    "IN_PROGRESS": 3
  },
  "byDivision": [
    { "id": "...", "name": "Jaringan", "total": 7 }
  ],
  "byTechnician": [
    { "id": "...", "name": "Budi", "total": 3, "completed": 1 }
  ]
}
```

**Catatan penting:**
- Gunakan SQL RPC `get_dashboard_summary()` dengan `SECURITY INVOKER`, bukan `SECURITY DEFINER`, agar RLS tetap berlaku.
- Tambahkan:
  ```sql
  GRANT EXECUTE ON FUNCTION get_dashboard_summary() TO authenticated;
  ```
- Jangan menghitung metrik dari 20 task pertama.
- Jika ingin persis mengikuti matrix SRS (teknisi tidak boleh melihat dashboard), guard role perlu ditambahkan di route karena RLS hanya membatasi baris, bukan akses endpoint. Default saat ini: teknisi melihat ringkasan sesuai scope RLS.

**Definition of done:**
- Angka summary sesuai data dan scope role.
- Endpoint mengembalikan data dalam satu request.
- RLS tetap berlaku.

---

# Fase 2 — Frontend

## Tahap 2.1 — Data layer

Status: [x] Selesai
Target commit: `feat(client): add task data services and hooks`

**Service baru:**
- `client/src/services/divisionService.js`
- `client/src/services/clientService.js`
- `client/src/services/assetService.js`
- `client/src/services/dashboardService.js`

**Perluas:**
- `client/src/services/taskService.js`
  - `getTasks(params)`
  - `createTask(payload)`
  - `updateTask(taskId, payload)`

**Hook baru:**
- `useDivisions`
- `useClients`
- `useAssets`
- `useTasks(params)`
- `useDashboardSummary`

**Definition of done:**
- `useTasks` mengirim filter/page/sort ke API.
- Loading, error, dan request race ditangani.
- Tidak ada lagi pemanggilan `getTasks()` tanpa parameter untuk daftar utama.

---

## Tahap 2.2 — Halaman `/tasks`

Status: [x] Selesai
Target commit: `feat(task): add tasks page with filters and pagination`

**File:**
- `client/src/pages/TasksPage.jsx`
- `client/src/routes/AppRoutes.jsx`
- `client/src/components/tasks/TaskTable.jsx`
- `client/src/components/tasks/TaskCardList.jsx`
- `client/src/components/tasks/TaskFilterBar.jsx`
- `client/src/components/tasks/TaskPagination.jsx`

**Isi:**
- Ganti `GenericPage` pada route `/tasks`.
- Filter disimpan di URL (`useSearchParams`).
- Search, status, priority, division, technician, date range, sort.
- Pagination prev/next dan info total.
- Tabel desktop dan card mobile.
- Tombol `+ Add Ticket` hanya untuk Manager/Super Admin/Staff.

**Definition of done:**
- Refresh/back tidak menghilangkan filter.
- Pagination lebih dari 20 task bekerja.
- Tampilan desktop dan mobile menampilkan data yang benar.

---

## Tahap 2.3 — Create task

Status: [x] Selesai
Target commit: `feat(task): add create task dialog`

**File:**
- `client/src/components/tasks/TaskCreateDialog.jsx`
- `client/src/pages/TasksPage.jsx`
- `client/src/pages/DashboardPage.jsx`

**Field:**
- title
- description
- division (dari `GET /divisions`)
- client (searchable, dari `GET /clients`)
- asset opsional (difilter berdasarkan client)
- priority
- due date

**Definition of done:**
- Manager/Staff dapat membuat task dari UI.
- Technician tidak melihat tombol dan tetap ditolak backend/RLS.
- Setelah sukses: toast, tutup dialog, daftar ter-refresh.
- Validasi required field dan error ditampilkan.

---

## Tahap 2.4 — Edit & soft delete

Status: [x] Selesai
Target commit: `feat(task): add edit and delete task actions`

**File:**
- `client/src/components/tasks/TaskEditDialog.jsx`
- `client/src/pages/TaskDetailPage.jsx`
- `client/src/components/tasks/TaskHeader.jsx`

**Aturan UI:**
- Staff: hanya priority dan due date.
- Technician: hanya description.
- Manager/Super Admin: field lengkap + soft delete.
- Konfirmasi sebelum delete.

**Definition of done:**
- Perubahan tersimpan dan detail ter-refresh.
- Soft-deleted task hilang dari list.
- Error dari trigger database muncul sebagai toast yang bisa dibaca.

---

## Tahap 2.5 — Dashboard refactor

Status: [x] Selesai
Target commit: `refactor(dashboard): use summary endpoint and centralize status metadata`

**File:**
- `client/src/pages/DashboardPage.jsx`
- `client/src/constants/taskConstants.js`

**Perubahan:**
- Metrik dari `GET /dashboard/summary`.
- Tampilkan 5 task terbaru + tombol "Lihat semua" ke `/tasks`.
- Search dashboard mengarah ke `/tasks?search=...`.
- Hapus perhitungan `activeTasks`/`completedToday` dari 20 task.
- Sentralisasi label dan warna status:
  - `PENDING` -> "Baru"
  - `IN_PROGRESS` -> "Dikerjakan"
  - `ON_HOLD` -> "Menunggu Sparepart"
  - `COMPLETED` -> "Selesai"
  - `CANCELLED` -> "Dibatalkan"
- Hapus `ASSIGNED` dari pilihan status, atau jadikan kondisi UI saja.
- Hapus duplikasi map status di `DashboardPage.jsx`.

**Definition of done:**
- Angka dashboard sama dengan total database sesuai scope role.
- Tidak ada lagi batas 20 task.
- Label status konsisten di dashboard, list, dan detail.

---

## Tahap 2.6 — Cleanup & verifikasi

Status: [x] Selesai
Target commit: `chore: cleanup, docs, and verification`

**Pekerjaan:**
- Hapus `TaskContext` jika sudah tidak dipakai; sesuaikan `client/src/App.jsx`.
- Jalankan `npm run lint` di client.
- Uji manual per role: Manager, Staff, Technician.
- Update Swagger untuk endpoint baru.
- Update `README.md`:
  - Task Management v1 selesai.
  - Client Management tetap In Progress.
- Opsional: tambah contoh request di `server/dev_only/api_test.http`.

**Definition of done:**
- Lint bersih selain warning lama yang sudah diketahui.
- Semua endpoint baru terdokumentasi.
- README sesuai kondisi aktual.

---

## Checkpoint Setiap Tahap

1. Implementasi satu tahap saja.
2. Backend: `node --check` untuk file yang diubah.
3. Frontend: `npm run lint` di folder `client`.
4. Uji manual sesuai definition of done.
5. Commit terpisah, jangan push.
6. Berhenti dan minta review sebelum tahap berikutnya.

---

## Catatan Commit

Contoh pesan commit yang direncanakan:

```text
feat(division): create division route and controller
feat(task): add task update and soft delete endpoint
feat(task): add server-side task query
feat(dashboard): add dashboard summary endpoint
feat(client): add task data services and hooks
feat(task): add tasks page with filters and pagination
feat(task): add create task dialog
feat(task): add edit and delete task actions
refactor(dashboard): use summary endpoint and centralize status metadata
chore: cleanup, docs, and verification
```
