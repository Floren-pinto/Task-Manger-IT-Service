# Panduan Belajar — Memahami Proyek Ini dari Nol

Proyek ini dibangun sambil jalan, sehingga pengetahuannya tersebar di kode. Panduan ini
memberi **urutan membaca** dan **latihan** supaya pemahamannya utuh. Kerjakan berurutan;
tiap tahap kira-kira 1–2 sesi belajar.

Peta dokumen: [README.md](README.md).

---

## Tahap 0 — Jalankan & lihat dulu

1. `npm install` di root, siapkan `server/.env` dan `client/.env`, lalu `npm run dev`.
2. Login dengan beberapa akun berbeda role (minimal `MANAGER_DIVISION` dan `TECHNICIAN`).
3. Bandingkan: menu apa yang muncul? Task mana yang terlihat? Tombol apa yang hilang?
4. Buka `http://localhost:3000/api-docs` dan coba `GET /api/tasks` dengan token
   (ambil token dari DevTools → Application → Local Storage → `sb-...-auth-token` → `access_token`).

**Tujuan:** punya gambaran perilaku aplikasi sebelum membaca kodenya.

---

## Tahap 1 — Data dulu (database)

Baca: [erd.md](erd.md) → [`schema.prisma`](../server/prisma/schema.prisma).

- [ ] Gambar ulang ERD di kertas tanpa melihat (cukup tabel + garis relasi).
- [ ] Jelaskan dengan kata-kata sendiri: kenapa `task_assignments` dan `team_members` adalah tabel penghubung?
- [ ] Buka Supabase → Table Editor, cocokkan kolom dengan ERD.
- [ ] Jalankan di SQL Editor: jumlah task per status per divisi (`GROUP BY`).

---

## Tahap 2 — Aturan di database (RLS & trigger)

Baca: [database.md](database.md) → [RBAC.md](RBAC.md) →
[`04_tasks_policy.sql`](../server/supabase/sql/policies/04_tasks_policy.sql) →
[`01_trigger_functions.sql`](../server/supabase/sql/functions/01_trigger_functions.sql) →
[`03_task_status_functions.sql`](../server/supabase/sql/functions/03_task_status_functions.sql).

- [ ] Untuk role TECHNICIAN, tulis query SQL "biasa" yang hasilnya setara dengan policy SELECT `tasks`.
- [ ] Login sebagai STAFF, coba ubah judul task dari UI. Error apa yang muncul? Lacak: trigger → kode `P0001` → controller → `403`.
- [ ] Jelaskan kenapa `update_task_status` memakai `FOR UPDATE`.
- [ ] Ikuti satu notifikasi dari awal: assign teknisi → baris `task_assignments` → trigger → baris `notifications`.

---

## Tahap 3 — Server, ikuti satu request

Baca berurutan (ini rantai sebenarnya):

1. [`server/index.js`](../server/index.js) → [`src/app.js`](../server/src/app.js)
2. [`src/routes/index.js`](../server/src/routes/index.js)
3. [`middleware/auth.middleware.js`](../server/src/middleware/auth.middleware.js) → [`attachProfile.middleware.js`](../server/src/middleware/attachProfile.middleware.js)
4. [`routes/task.routes.js`](../server/src/routes/task.routes.js) → `listTasks` di [`task.controller.js`](../server/src/controllers/task.controller.js)
5. [`utils/ApiError.js`](../server/src/utils/ApiError.js), [`ApiResponse.js`](../server/src/utils/ApiResponse.js), [`asyncHandler.js`](../server/src/utils/asyncHandler.js), [`middleware/error.middleware.js`](../server/src/middleware/error.middleware.js)
6. [`config/supabase.js`](../server/src/config/supabase.js) — pahami 3 jenis client.

Pendamping: [architecture.md §3](architecture.md#3-arsitektur-server-berlapis).

- [ ] Tambahkan `console.log(req.profile)` sementara di `listTasks`, panggil dari UI, lihat hasilnya. (Hapus lagi.)
- [ ] Panggil `GET /api/tasks` tanpa header Authorization lewat Swagger/curl. Middleware mana yang menolak?
- [ ] Baca `createTaskReport` di [`serviceReport.controller.js`](../server/src/controllers/serviceReport.controller.js): daftar semua validasinya.
- [ ] Baca `createUser` di [`user.controller.js`](../server/src/controllers/user.controller.js): kenapa harus `supabaseAdmin`? Apa yang terjadi bila langkah kedua gagal?

---

## Tahap 4 — Client, ikuti satu halaman

Baca berurutan:

1. [`main.jsx`](../client/src/main.jsx) → [`App.jsx`](../client/src/App.jsx) → [`contexts/AuthContext.jsx`](../client/src/contexts/AuthContext.jsx)
2. [`routes/AppRoutes.jsx`](../client/src/routes/AppRoutes.jsx) → [`RouteGuards.jsx`](../client/src/routes/RouteGuards.jsx) → [`layouts/DashboardLayout.jsx`](../client/src/layouts/DashboardLayout.jsx)
3. [`pages/TasksPage.jsx`](../client/src/pages/TasksPage.jsx)
4. [`hooks/useTasks.js`](../client/src/hooks/useTasks.js) → [`useApiData.js`](../client/src/hooks/useApiData.js) → [`services/taskService.js`](../client/src/services/taskService.js) → [`api/api.js`](../client/src/api/api.js)
5. [`components/tasks/TaskTable.jsx`](../client/src/components/tasks/TaskTable.jsx) & [`TaskCardList.jsx`](../client/src/components/tasks/TaskCardList.jsx)
6. Mutasi: [`hooks/useTaskMutations.js`](../client/src/hooks/useTaskMutations.js) → [`utils/taskEvents.js`](../client/src/utils/taskEvents.js)

Pendamping: [architecture.md §7](architecture.md#7-arsitektur-client-alur-data).

- [ ] Buka DevTools → Network, ganti filter di halaman Tasks. Cocokkan query string dengan `req.query` di server.
- [ ] Jelaskan apa yang terjadi di `useApiData` bila user mengganti filter dua kali dengan cepat.
- [ ] Temukan di mana state loading, empty, dan error ditampilkan di `TasksPage`.
- [ ] Kecilkan lebar browser: komponen mana yang menggantikan tabel?

---

## Tahap 5 — Satu fitur utuh, ujung ke ujung

Pilih **Service Report** dan telusuri semua lapisannya, lalu isi tabel ini sendiri:

| Lapisan    | File                                             | Apa yang dilakukan |
| ---------- | ------------------------------------------------ | ------------------ |
| Tabel      | `service_reports`                                | ...                |
| Policy     | `08_service_reports_policy.sql`                  | ...                |
| Route      | `serviceReport.routes.js`                        | ...                |
| Controller | `serviceReport.controller.js`                    | ...                |
| Util       | `serviceReportSnapshot.js`                       | ...                |
| Service    | `serviceReportService.js`                        | ...                |
| Hook       | `useTaskReports.js`, `useServiceReport.js`       | ...                |
| Komponen   | `TaskReportsSection.jsx`, `TaskReportDialog.jsx` | ...                |

Ulangi untuk **Notifikasi** (termasuk Realtime) — ini fitur yang paling banyak melibatkan database.

---

## Tahap 6 — Bangun sesuatu sendiri

Belajar paling efektif adalah membuat fitur kecil mengikuti pola yang sama. Saran urut dari mudah:

1. **Unassign teknisi** — `DELETE /api/tasks/:taskId/assignments/:assignmentId` (sudah direncanakan di api-contract §7.4).
   Menyentuh: policy DELETE, route, controller, swagger, service, hook, tombol di `TaskAssignmentsSection`.
2. **Halaman Divisions** — saat ini masih `GenericPage`. Tampilkan divisi + jumlah anggota + jumlah task aktif.
3. **Teams** (FR-11/12) — tabel sudah ada, API & UI belum.

Gunakan skill `add-api-endpoint` atau ikuti langkah di [AGENTS.md](../AGENTS.md). Tulis rencana di
`docs/plans/<fitur>.md` sebelum mulai.

---

## Pertanyaan pemahaman (jawab tanpa melihat kode)

1. Apa beda `req.user` dan `req.profile`?
2. Kenapa route/controller tidak boleh memakai Prisma?
3. Apa yang terjadi jika teknisi divisi A membuka URL `/tasks/<id task divisi B>`? Lapisan mana yang menolak dan responsnya apa?
4. Kenapa upload file langsung ke Storage, bukan lewat Express?
5. Kalau besok ada role baru `AUDITOR` (hanya baca semua), file mana saja yang harus diubah?
6. Apa risiko menaruh `SUPABASE_SERVICE_ROLE_KEY` di `client/.env`?
7. Kenapa `service_reports` menyimpan snapshot, padahal datanya bisa di-JOIN?

Jika ada yang belum bisa dijawab, kembali ke tahap terkait.
