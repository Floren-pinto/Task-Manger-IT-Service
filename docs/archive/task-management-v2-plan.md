# Rencana Implementasi Task Management v2

Dokumen ini adalah acuan implementasi empat sesi lanjutan setelah Task Management v1:

1. **Client Management**
2. **User Management**
3. **Notifikasi In-App**
4. **Riwayat Servis & Service Report**

Dokumen ini **hanya berisi rencana**. Tidak ada perubahan kode yang boleh dilakukan hanya karena membaca dokumen ini. Implementasi dilakukan setelah rencana disetujui.

- Branch dokumen: `docs/plan-impl`
- Baseline kode: `main` setelah merge v1 (PR #27; commit fitur terakhir `69fdab1`)
- Status: **Draft untuk review**
- Update terakhir: 21 Oktober 2026
- Dokumen terkait:
  - `docs/srs.md`
  - `docs/RBAC.md`
  - `docs/ui-spec.md`
  - `docs/api-contract.md`
  - `docs/archive/task-management-v1-plan.md`

---

## 1. Tujuan dan Ruang Lingkup

### 1.1 Tujuan

Menyelesaikan empat modul yang masih menjadi gap utama aplikasi:

| Modul             | Gap saat ini                                                             | Target                                                        |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Client Management | `/clients` masih `GenericPage`; backend client/assets punya beberapa bug | Halaman client + asset yang bisa dipakai operasional          |
| User Management   | Baru ada `GET /api/users`; belum ada create/update/deactivate            | Admin bisa mengelola akun sesuai RBAC                         |
| Notifikasi        | Backend ada, tetapi UI bell masih dummy; `isRead=false` tidak bekerja    | Notifikasi in-app nyata dan aman                              |
| Riwayat Servis    | Belum ada service report dan halaman riwayat                             | Riwayat servis per client/asset + service report + export CSV |

### 1.2 Yang termasuk

- Perbaikan bug backend yang menghalangi fitur.
- Endpoint baru dan update endpoint lama.
- Service layer, hook, halaman, komponen UI, route, dan navigasi.
- SQL policy/function/migration yang diperlukan.
- Dokumentasi kontrak API dan README.
- Verifikasi manual per role dan build/lint.

### 1.3 Yang tidak termasuk

- Teams, workload per tim, dan penugasan berbasis tim.
- Kalender servis dan sub-task/checklist.
- Realtime dashboard (FR-31) di luar notifikasi.
- Grafik tren dan laporan periodik (FR-62/FR-63).
- Portal pelanggan.
- Notifikasi deadline otomatis berbasis scheduler (`pg_cron`/Edge Function). UI tetap siap menerima tipe `DEADLINE_REMINDER`.
- Export PDF. Sesi ini hanya CSV; PDF dapat ditambahkan setelah alur CSV stabil.
- Hard delete user/client/asset/task.
- Perubahan framework, penambahan library UI, atau redesign global.

---

## 2. Prinsip Kerja Wajib

### 2.1 Aturan implementasi

1. Satu tahap = implementasi → verifikasi → commit. Jangan gabungkan beberapa tahap dalam satu commit.
2. Setiap sesi dikerjakan pada branch terpisah.
3. Jangan push atau merge ke `main` tanpa review eksplisit.
4. Ikuti struktur, nama file, gaya penulisan, dan kelas Tailwind yang sudah ada.
5. Gunakan `asyncHandler`, `ApiError`, `ok`, dan `created`; jangan membuat format respons baru.
6. Request body memakai **camelCase**; response database tetap **snake_case** kecuali alias relasi yang sudah ada.
7. Semua mutasi lewat Express API. Komponen frontend tidak boleh menulis langsung ke tabel Supabase, kecuali subscription Realtime yang bersifat read-only.
8. Jangan menampilkan error mentah dari database ke client. Log detail di server; kirim pesan generik.
9. Jangan menambahkan library baru tanpa persetujuan.
10. Jangan mengubah perilaku task v1 yang tidak terkait, kecuali disebutkan eksplisit di rencana ini.

### 2.2 Branch dan commit

Baseline: `main` yang sudah berisi v1.

Urutan branch yang disarankan:

```text
docs/plan-impl
  -> feat/client-management
  -> feat/user-management
  -> feat/notifications
  -> feat/service-history
```

Jika sesi berikutnya membutuhkan komponen bersama dari sesi sebelumnya:

- buat branch sesi berikutnya dari branch sesi sebelumnya yang sudah lolos review, atau
- gunakan branch integrasi `feat/v2` dan merge sesi ke sana setelah review.

Jangan merge ke `main` sebelum semua sesi lulus verifikasi.

Format commit:

```text
feat(client): ...
fix(client): ...
feat(user): ...
feat(notification): ...
feat(report): ...
chore(...): ...
docs(...): ...
```

### 2.3 Prinsip keamanan

| Layer    | Aturan                                                                     |
| -------- | -------------------------------------------------------------------------- |
| RLS      | Sumber kebenaran utama untuk SELECT/INSERT/UPDATE/DELETE                   |
| Trigger  | Sumber kebenaran untuk pembatasan kolom                                    |
| Express  | Validasi input, orkestrasi multi-tabel, dan guard untuk operasi privileged |
| Frontend | Hanya menyembunyikan aksi untuk UX; bukan pengaman utama                   |

Pengecualian penting:

- Operasi **Supabase Auth Admin** (`createUser`, ban/unban) memakai service role dan **melewati RLS**. Karena itu endpoint tersebut wajib memiliki guard `SUPER_ADMIN` di Express. Ini bukan duplikasi RLS, tetapi prasyarat karena service role tidak terkena RLS.
- Service role key tidak boleh dikirim ke frontend, tidak boleh muncul di response, dan tidak boleh dicetak ke log.

### 2.4 Prinsip UI

Ambil pola yang sudah ada di modul Tasks:

- Card: `rounded-xl border border-slate-200 bg-white shadow-sm`
- Warna aksi utama: `bg-[#0EA5E9] hover:bg-[#0284C7]`
- Input: `rounded-lg border border-slate-300 px-3 py-2 text-sm ... focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100`
- Dialog/drawer: overlay `fixed inset-0`, panel kanan `max-w-[540px]` atau `max-w-[560px]`, header/body/footer terpisah, tutup dengan Escape/backdrop, kunci scroll body.
- Tabel desktop + card mobile. Jangan hanya membuat tabel desktop.
- Loading memakai `Loading` atau `LoaderCircle`; error memakai panel rose + tombol “Coba lagi”; kosong memakai empty state yang jelas.
- Toast memakai `useToast()`.
- Ikon memakai `lucide-react`.
- Semua form memiliki label, pesan error per field, dan state disabled saat submit.

---

## 3. Kondisi Awal dan Temuan yang Relevan

### 3.1 Kondisi awal

- Backend task, client, asset, notification, division, dashboard sudah ada.
- Frontend sudah memiliki halaman login, dashboard, tasks list/detail, create/edit/soft delete task.
- `/clients`, `/divisions`, dan `/reports` masih `GenericPage`.
- `useUsers` sudah ada, tetapi belum race-safe dan belum dipakai untuk halaman user.
- Notifikasi baru tersedia di backend; bell di mobile masih memunculkan toast dummy.
- `service_reports` sudah ada di schema dan sudah di-embed di detail task, tetapi belum ada endpoint tulis/baca khusus.
- `tasks` belum memiliki `completed_at`.

### 3.2 Temuan yang harus diselesaikan

| Temuan                                                           | Diselesaikan di |
| ---------------------------------------------------------------- | --------------- |
| #4 `deleted_at` tidak dikembalikan di list/detail client & asset | Sesi 1          |
| #5 `getClientDetail` memilih `assets.description` yang tidak ada | Sesi 1          |
| #6 `/notifications` belum memakai `attachProfile`                | Sesi 3          |
| #16 detail task membawa `reports[].snapshot_data`                | Sesi 4          |
| #17 `tasks` belum punya `completed_at`                           | Sesi 4          |
| #18 `isRead=false` tidak memfilter                               | Sesi 3          |
| #19 asset soft-deleted terlihat semua role                       | Sesi 1          |
| #20 `updateClient` selalu mengirim `email`                       | Sesi 1          |
| #21 pesan 42501 attachment salah konteks                         | Sesi 1          |
| #26 `testConnection` di `GET /users`                             | Sesi 2          |
| #27 pesan validasi `POST /clients`                               | Sesi 1          |
| #28 `status=false` tidak memfilter user                          | Sesi 2          |
| #29 `22P02` selalu dipetakan ke priority                         | Sesi 1          |
| #30 cek `data.length` sebelum `error`                            | Sesi 1          |

---

## 4. Matriks RBAC Ringkas untuk Empat Sesi

| Fitur                      | SUPER_ADMIN   | MANAGER_DIVISION | STAFF                            | TECHNICIAN               |
| -------------------------- | ------------- | ---------------- | -------------------------------- | ------------------------ |
| Lihat clients              | Semua         | Semua            | Aktif                            | Aktif                    |
| Tambah/edit client         | Ya            | Ya               | Ya                               | Tidak                    |
| Soft delete/restore client | Ya            | Ya               | Tidak                            | Tidak                    |
| Lihat assets               | Semua         | Semua            | Aktif                            | Aktif                    |
| Tulis/soft delete asset    | Ya            | Ya               | Ya                               | Ya (sesuai RLS existing) |
| Lihat users                | Semua         | Non-SUPER_ADMIN  | Diri + TECHNICIAN                | Diri sendiri             |
| Kelola users               | Ya            | Tidak            | Tidak                            | Tidak                    |
| Lihat notifikasi           | Milik sendiri | Milik sendiri    | Milik sendiri                    | Milik sendiri            |
| Tandai notifikasi          | Milik sendiri | Milik sendiri    | Milik sendiri                    | Milik sendiri            |
| Buat service report        | Ya            | Ya               | Tidak                            | Ya, divisi task          |
| Lihat riwayat servis       | Semua         | Semua            | Semua task selesai yang terlihat | Divisi sendiri           |
| Export riwayat servis      | Ya            | Ya               | Ya                               | Ya, divisi sendiri       |

Catatan:

- Matriks di atas mengikuti `RBAC.md` dan policy saat ini.
- Untuk User Management, rencana ini memperketat policy `users` agar mutasi user hanya `SUPER_ADMIN`, kecuali self-update `name`/`email` bila fitur profil dipakai. Ini perubahan perilaku dan wajib direview.
- Assets mengikuti keputusan desain sebelumnya: semua authenticated boleh menulis. Jika product ingin TECHNICIAN read-only, ubah RLS dan UI bersamaan; jangan hanya menyembunyikan tombol.

---

## 5. Urutan Sesi dan Dependensi

```text
Sesi 1: Client Management
  -> dibutuhkan Sesi 4 (client/asset picker & filter riwayat)

Sesi 2: User Management
  -> independen, tetapi memakai shared UI dari Sesi 1

Sesi 3: Notifikasi
  -> independen, tetapi sebaiknya setelah Sesi 2 agar perubahan navigasi stabil

Sesi 4: Riwayat Servis
  -> membutuhkan Sesi 1 (client/asset)
  -> membutuhkan endpoint task dan service_reports
```

Kerjakan berurutan. Jangan memulai Sesi 4 sebelum Sesi 1 stabil karena halaman riwayat memakai client/asset filter dan detail client.

---

# Sesi 1 — Client Management

## 1.0 Ringkasan Sesi

Tujuan:

- Mengganti `/clients` dari `GenericPage` menjadi halaman operasional.
- Memperbaiki bug client/assets yang sudah tercatat.
- Menambahkan pengelolaan asset di dalam detail client.
- Menjaga semua akses tetap ditentukan RLS.

Definition of Done sesi:

- Client bisa dicari, dipaginasi, dibuat, diedit, dan di-soft-delete sesuai role.
- Asset bisa dilihat, dibuat, diedit, dan di-soft-delete dari detail client.
- Client/asset yang soft-deleted tidak muncul secara default.
- Task create dialog tetap bisa memuat asset dari client.
- `npm run lint` dan `npm run build` lulus.
- Tidak ada raw DB error yang tampil ke UI.

---

## Tahap 1.1 — Perbaikan backend client & asset

**Commit:** `fix(client): harden client and asset endpoints`

### File

- `server/src/controllers/client.controller.js`
- `server/src/controllers/asset.controller.js`
- `server/src/controllers/task.controller.js` (hanya mapping `42501` attachment)
- `server/src/routes/client.routes.js` (bila query baru perlu dokumentasi)
- `server/src/routes/asset.routes.js`
- `server/supabase/sql/policies/03_assets_policy.sql`
- `server/supabase/sql/policies/02_clients_policy.sql` (review saja; ubah bila perlu)

### Endpoint yang disentuh

```http
GET    /api/clients
GET    /api/clients/:clientId
POST   /api/clients
PATCH  /api/clients/:clientId

GET    /api/assets
GET    /api/assets/:assetId
POST   /api/assets
PATCH  /api/assets/:assetId
```

### Perubahan wajib

#### Validasi ID dan error `22P02`

- Validasi `clientId`/`assetId` dengan regex UUID sebelum query database.
- Jika tetap menerima `22P02`, map ke pesan kontekstual:
  - client → `400 "Invalid client ID"`;
  - asset → `400 "Invalid asset ID"`.
- Jangan pernah memakai pesan prioritas task untuk error client/asset.

#### `listClients`

- Tambahkan query `includeDeleted` (boolean dari `boolParser`).
- Default: `.is("deleted_at", null)`.
- Jika `includeDeleted=true`, jangan tambahkan filter; RLS tetap membatasi role yang boleh melihat baris terhapus.
- Tambahkan `totalPages` pada pagination.
- Perbaiki urutan pengecekan: cek `error` **sebelum** membaca `data.length`.
- Search kosong → `200` dengan array kosong, bukan `404`.
- Sanitasi search sebelum `ilike`: trim dan buang karakter `,()%"`.
- Sertakan `deleted_at` di response agar UI bisa menampilkan status arsip.

Response target:

```json
{
  "clients": [
    {
      "id": "...",
      "name": "...",
      "contact": "...",
      "email": null,
      "address": "...",
      "service_type": "...",
      "deleted_at": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### `getClientDetail`

- Ambil client dan asset dalam **dua query** agar filter asset deterministik:
  1. client tanpa embed `tasks`;
  2. asset `.eq("client_id", clientId).is("deleted_at", null)` secara default.
- Tambahkan query `includeDeletedAssets` (boolean, hanya efektif untuk admin/manager) bila client detail ingin menampilkan arsip.
- Ganti select asset yang salah:

```diff
- assets:assets(id, name, description, created_at, updated_at)
+ assets:assets(id, name, serial_number, type, deleted_at, created_at, updated_at)
```

- Hapus embed `tasks` dari response client detail. Riwayat task akan dilayani endpoint service history di Sesi 4.
- Sebelum menghapus, grep pemakaian `client.tasks`/`data.tasks` di frontend. Saat ini `TaskCreateDialog` hanya memakai `assets`, tetapi pastikan tidak ada pemakai lain.
- Pastikan asset yang soft-deleted tidak ikut lewat policy SELECT asset yang baru.
- Tetap gunakan `.single()` + `PGRST116` → `404` untuk client.
- Jangan mengirim detail error database ke client.

Response target:

```json
{
  "id": "...",
  "name": "...",
  "contact": "...",
  "email": null,
  "address": "...",
  "service_type": "...",
  "deleted_at": null,
  "created_at": "...",
  "updated_at": "...",
  "assets": [
    {
      "id": "...",
      "name": "...",
      "serial_number": null,
      "type": "...",
      "deleted_at": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### `createClient`

- Trim `name`, `contact`, `address`, `serviceType`.
- `email` opsional; kosong → `null`.
- Validasi field wajib: `name`, `contact`, `address`, `serviceType`.
- Perbaiki pesan validasi agar tidak menyebut `email` wajib.
- Validasi format email sederhana bila diisi.
- Map `42501` → `403 "You are not allowed to create a client"`.
- Jangan mengembalikan pesan mentah Supabase.

#### `updateClient`

- Perbaiki bug email:

```diff
- if (email !== undefined || email !== null || email !== "")
-   updatePayload.email = email;
+ if (email !== undefined) {
+   updatePayload.email =
+     typeof email === "string" && email.trim() === "" ? null : email;
+ }
```

- Trim semua string sebelum masuk payload.
- `deleted` hanya diproses jika boolean.
- Pertahankan validasi role yang sudah ada (TECHNICIAN tidak boleh update; STAFF tidak boleh delete). RLS tetap menjadi pengaman terakhir.
- Payload kosong → `400`.
- `PGRST116` → `404`.
- Map `42501` → `403` bila ada.

#### `listAssets`

- Tambahkan filter `clientId`.
- Tambahkan `includeDeleted`; default `.is("deleted_at", null)`.
- Tambahkan `totalPages`.
- Cek `error` sebelum `data.length`.
- Search kosong → `200` array kosong.
- Sertakan `deleted_at` dan `client: { id, name }`.
- Sanitasi search.

#### `getAssetDetail`

- Sertakan `deleted_at`, `client`, dan `tasks` yang masih relevan.
- Jangan menampilkan error DB mentah.

#### `createAsset`

- Trim `name`, `type`, `serialNumber`.
- `serialNumber` kosong → `null`.
- Validasi `clientId`.
- Map `23503` → `400 "Invalid client ID"`.

#### `updateAsset`

- Trim string.
- `serialNumber` kosong → `null`.
- Soft delete/restore tetap lewat `deleted`.
- Semua role authenticated boleh menulis sesuai RLS existing.
- Map `PGRST116` → `404`, `23503` → `400`.

### Perbaikan kecil lintas modul

- Di `server/src/controllers/task.controller.js`, pastikan error `42501` pada upload/hapus attachment dipetakan ke pesan attachment yang benar (mis. `403 "You are not allowed to upload attachments to this task"`), bukan pesan prioritas/status task.
- Jangan mengubah alur attachment lain.

### Perubahan policy asset

Policy SELECT asset saat ini `USING (TRUE)`, sehingga asset terhapus tetap terlihat. Ubah menjadi:

- `TECHNICIAN` dan `STAFF`: hanya `deleted_at IS NULL`.
- `SUPER_ADMIN` dan `MANAGER_DIVISION`: boleh melihat semua, termasuk yang terhapus.

Policy INSERT/UPDATE tetap `TRUE` sesuai keputusan desain “assets boleh ditulis semua role”.

### Keamanan

- Semua query memakai `req.supabase` (per-request client), bukan `supabaseAdmin`.
- `includeDeleted` bukan pengaman; RLS tetap menolak role yang tidak berhak.
- Jangan menambahkan pengecekan role baru untuk client/asset di controller selain yang sudah ada.
- Jangan mengembalikan `error.message`, `error.details`, atau `error.hint` ke response.

### Verifikasi

- `node --check` pada file yang diubah.
- `GET /api/clients` tanpa token → `401`.
- `GET /api/clients?search=tidak-ada` → `200` dengan array kosong.
- `GET /api/clients/:id` mengembalikan `assets.serial_number` dan `assets.type`, tanpa error.
- `PATCH /api/clients/:id` dengan `{ "email": null }` hanya mengubah email.
- `TECHNICIAN` gagal create/update client → `403`.
- `STAFF` gagal soft delete client → `403`.
- Asset soft-deleted tidak muncul di list/detail client untuk STAFF/TECHNICIAN.
- Asset soft-deleted masih terlihat untuk SUPER_ADMIN/MANAGER_DIVISION bila `includeDeleted=true`.
- Error `42501` pada attachment menampilkan pesan attachment, bukan pesan priority task.
- ID client/asset yang bukan UUID → `400` dengan pesan kontekstual, bukan `22P02` mentah.

---

## Tahap 1.2 — Data layer client & shared UI primitives

**Commit:** `feat(client): add client data layer and shared UI primitives`

### File baru

- `client/src/hooks/useClientDetail.js`
- `client/src/hooks/useClientMutations.js`
- `client/src/hooks/useAssetMutations.js`
- `client/src/hooks/useClientsChanged.js`
- `client/src/utils/clientEvents.js`
- `client/src/constants/clientConstants.js`
- `client/src/components/ui/ConfirmDialog.jsx`
- `client/src/components/ui/DataPagination.jsx`
- `client/src/components/ui/FormField.jsx` (opsional, bila ingin menghindari duplikasi `TaskFormField`)

### File yang diperluas

- `client/src/services/clientService.js`
- `client/src/services/assetService.js`
- `client/src/utils/formatters.js`

### Perubahan service

`clientService.js`:

```js
getClients(params); // sudah ada; pertahankan fallback 404 → empty page
getClientById(clientId); // sudah ada
createClient(payload);
updateClient(clientId, payload);
deleteClient(clientId); // PATCH { deleted: true }
restoreClient(clientId); // PATCH { deleted: false }
```

`assetService.js`:

```js
getAssets(params); // sudah ada
getAssetById(assetId);
createAsset(payload);
updateAsset(assetId, payload);
deleteAsset(assetId);
restoreAsset(assetId);
```

### Hook

- `useClientDetail(clientId)` memakai `useApiData` agar race-safe.
- `useClientMutations` mengembalikan `createClient`, `updateClient`, `deleteClient`, `restoreClient`, `submitting`, `error`.
- `useAssetMutations` mengembalikan `createAsset`, `updateAsset`, `deleteAsset`, `restoreAsset`, `submitting`, `error`.
- Setelah mutasi sukses:
  - panggil `emitClientsChanged()`;
  - tampilkan toast;
  - refetch list/detail.

`clientEvents.js` meniru `taskEvents.js`:

```js
const CLIENTS_CHANGED_EVENT = "task-manager:clients-changed";

export function emitClientsChanged() { ... }
export function subscribeClientsChanged(listener) { ... }
```

### Shared UI

- `ConfirmDialog`: judul, deskripsi, tombol batal, tombol konfirmasi, state loading, varian bahaya.
- `DataPagination`: mendukung `page`, `limit`, `total`, `totalPages`, `onPageChange`, `onLimitChange`, `loading`.
  - Refactor `TaskPagination` agar memakai `DataPagination` tanpa mengubah tampilan/perilaku.
- `FormField`: label, `htmlFor`, error, hint, children.
  - Bila dipakai, refactor `TaskFormControls` agar menjadi wrapper tipis, bukan menduplikasi style.

### Aturan

- Tidak ada pemanggilan `api` langsung dari komponen.
- Tidak ada penulisan langsung ke Supabase dari komponen.
- Pertahankan bentuk response apa adanya; jangan membuat normalizer global yang mengubah field task/client.

### Verifikasi

- `npm run lint`.
- `TaskPagination` masih berfungsi di `/tasks`.
- Tidak ada import melingkar antara `components/ui` dan `components/tasks`.

---

## Tahap 1.3 — Halaman `/clients` (list, search, pagination)

**Commit:** `feat(client): add clients page with search and pagination`

### File

- `client/src/pages/ClientsPage.jsx`
- `client/src/components/clients/ClientTable.jsx`
- `client/src/components/clients/ClientCardList.jsx`
- `client/src/components/clients/ClientFilterBar.jsx`
- `client/src/routes/AppRoutes.jsx`
- `client/src/constants/clientConstants.js`

### Route

Ganti:

```jsx
<Route
  path="/clients"
  element={
    <GenericPage
      title="Clients & Locations"
      description="Daftar klien, gedung, dan stasiun kerja"
    />
  }
/>
```

dengan:

```jsx
<Route path="/clients" element={<ClientsPage />} />
```

### UI

Header:

- Judul: `Clients & Locations`
- Deskripsi: `Kelola data pelanggan, kontak, lokasi, dan aset yang terdaftar.`
- Kanan: jumlah client + tombol `Tambah Client` bila role berhak.

Filter bar:

- Search nama client.
- Filter service type bila daftar tersedia.
- Toggle `Tampilkan arsip` hanya untuk SUPER_ADMIN/MANAGER_DIVISION.
- Reset filter.
- Tombol tambah client.

Tabel desktop:

| Kolom   | Isi                             |
| ------- | ------------------------------- |
| Client  | nama + email                    |
| Contact | contact                         |
| Service | service_type                    |
| Address | alamat, truncate                |
| Status  | badge aktif/arsip               |
| Updated | `formatDate(updated_at)`        |
| Aksi    | detail/edit/restore sesuai role |

Card mobile:

- Nama, service type, contact, alamat singkat, badge status, tombol detail.

State:

- Loading pertama: panel dengan spinner.
- Loading refetch: spinner kecil di header.
- Error: panel rose + `Coba lagi`.
- Empty: pesan berbeda untuk “belum ada data” vs “tidak cocok dengan filter”.

### Filter di URL

Gunakan `useSearchParams` seperti `TasksPage`:

- `search`
- `page`
- `limit`
- `includeDeleted` (hanya admin/manager)

Search memakai debounce `useDebouncedValue` 300–350 ms.

### Role UI

- `TECHNICIAN`: hanya lihat; tombol tambah/edit/delete client tidak tampil.
- `STAFF`: tambah/edit; tidak ada delete.
- `MANAGER_DIVISION`/`SUPER_ADMIN`: tambah/edit/delete/restore.
- Aksi asset mengikuti RLS existing.

### Verifikasi

- Refresh/back tidak menghilangkan filter.
- Pagination > 20 client bekerja.
- Mobile menampilkan card, desktop menampilkan tabel.
- Tidak ada tombol tambah untuk TECHNICIAN.
- `npm run lint` dan `npm run build`.

---

## Tahap 1.4 — Detail client, create, edit, soft delete

**Commit:** `feat(client): add client detail and mutations`

### File

- `client/src/components/clients/ClientDetailDrawer.jsx`
- `client/src/components/clients/ClientFormDialog.jsx`
- `client/src/components/clients/ClientActions.jsx` (opsional)
- `client/src/pages/ClientsPage.jsx`
- `client/src/routes/AppRoutes.jsx`

### Route detail

Tambahkan:

```jsx
<Route path="/clients/:clientId" element={<ClientDetailDrawer />} />
```

Gunakan pola background location seperti task detail agar list tetap terlihat di belakang drawer.

### Detail drawer

Isi:

- Header: nama client, service type, badge status.
- Kontak: contact, email, address.
- Metadata: created/updated.
- Section asset (Tahap 1.5).
- Tombol `Riwayat Servis` (placeholder di sesi ini; aktif di Sesi 4) yang mengarah ke `/service-history?clientId=...`.
- Tombol edit/delete/restore sesuai role.

### Form create/edit

Field:

| Field         | Wajib | Catatan          |
| ------------- | ----- | ---------------- |
| `name`        | Ya    | max 200 karakter |
| `contact`     | Ya    | telepon/WA       |
| `email`       | Tidak | kosong → `null`  |
| `address`     | Ya    | textarea         |
| `serviceType` | Ya    | select atau text |

Validasi:

- Field wajib tidak boleh kosong.
- Email bila diisi harus valid.
- Tampilkan error per field.
- Disable form saat submit.

### Delete/restore

- Delete memakai `ConfirmDialog`.
- Pesan: `Client akan diarsipkan. Data task dan riwayat servis tetap tersimpan.`
- Staff tidak melihat tombol delete.
- Admin/manager bisa restore dari filter arsip.
- Setelah sukses: toast, tutup drawer, emit event, refetch.

### Keamanan

- Jangan mengirim `deleted` dari form edit biasa.
- Jangan menampilkan tombol yang tidak diizinkan, tetapi tetap andalkan RLS.
- Jangan memakai `dangerouslySetInnerHTML`.

### Verifikasi

- Create client → muncul di list dan bisa dipilih di TaskCreateDialog.
- Edit email menjadi kosong → `email` menjadi `null`, field lain tidak berubah.
- Delete client → hilang dari list default; task lama tetap ada.
- Restore client → muncul lagi.
- Staff tidak bisa delete via UI maupun API.
- Technician tidak bisa create/edit via UI maupun API.

---

## Tahap 1.5 — Asset management di detail client

**Commit:** `feat(client): add asset management to client detail`

### File

- `client/src/components/clients/ClientAssetsSection.jsx`
- `client/src/components/clients/AssetFormDialog.jsx`
- `client/src/components/clients/AssetTable.jsx` (opsional; bisa inline)
- `client/src/services/assetService.js`
- `client/src/hooks/useAssetMutations.js`

### UI

Section `Assets`:

- Tombol `Tambah Aset`.
- List/table: nama, tipe, serial number, status, aksi.
- Empty: `Belum ada aset terdaftar untuk client ini.`
- Loading/error konsisten.

Form asset:

| Field          | Wajib |
| -------------- | ----- |
| `name`         | Ya    |
| `type`         | Ya    |
| `serialNumber` | Tidak |

`clientId` selalu dari client yang sedang dibuka; jangan menampilkan input client.

### Soft delete

- Delete/restore memakai `ConfirmDialog`.
- Asset yang dihapus tidak muncul secara default.
- Admin/manager bisa melihat arsip bila policy dan filter mendukung.

### Keamanan

- Semua role authenticated boleh menulis asset sesuai RLS existing.
- Jika product mengubah keputusan, ubah policy `03_assets_policy.sql` dan UI pada commit yang sama.
- Jangan memakai service role.

### Verifikasi

- Tambah asset → langsung muncul di detail dan di TaskCreateDialog.
- Edit serial number menjadi kosong → `null`.
- Soft delete → hilang dari picker task.
- Task yang sudah memakai asset tidak kehilangan relasi historis.
- `npm run lint` dan `npm run build`.

---

## Tahap 1.6 — Verifikasi sesi & dokumentasi

**Commit:** `chore(client): verify client management`

### Pekerjaan

- Uji manual matrix role:
  - SUPER_ADMIN: create/edit/delete/restore client + asset.
  - MANAGER_DIVISION: create/edit/delete/restore client + asset.
  - STAFF: create/edit client, tidak bisa delete client; asset sesuai RLS.
  - TECHNICIAN: read-only client; asset sesuai RLS.
- Uji TaskCreateDialog masih memuat asset.
- Uji filter arsip.
- Uji search kosong, pagination, dan error state.
- Update `docs/api-contract.md`:
  - response client/asset aktual;
  - `includeDeleted`;
  - `totalPages`;
  - perubahan `getClientDetail` (tanpa `tasks`);
  - temuan #4, #5, #19, #20, #27, #30 → selesai.
- Update `README.md`: Client Management menjadi `[x]` bila sudah stabil.
- Update Swagger bila endpoint berubah.

### Definition of Done

- Semua verifikasi lulus.
- Tidak ada error lint baru.
- Build sukses.
- Dokumentasi sesuai implementasi.

---

# Sesi 2 — User Management

## 2.0 Ringkasan Sesi

Tujuan:

- Menambahkan halaman `/users` khusus SUPER_ADMIN.
- Menambahkan create, edit, deactivate, restore, dan reset password.
- Memperbaiki bug filter user.
- Menjaga operasi Supabase Auth Admin tetap aman.

Definition of Done sesi:

- SUPER_ADMIN bisa membuat user baru dengan role/divisi.
- SUPER_ADMIN bisa mengubah role/divisi/status dan menonaktifkan user.
- User nonaktif/soft-deleted tidak bisa memakai API.
- Manager/Staff/Technician tidak bisa membuka halaman atau memanggil endpoint mutasi user.
- Tidak ada password yang dikembalikan atau di-log.
- `npm run lint` dan `npm run build` lulus.

---

## Tahap 2.1 — Security alignment & backend user admin

**Commit:** `feat(user): add user admin backend`

### File

- `server/src/controllers/user.controller.js`
- `server/src/routes/user.routes.js`
- `server/src/routes/index.js`
- `server/src/middleware/requireSuperAdmin.middleware.js` (baru, khusus operasi privileged)
- `server/supabase/sql/policies/09_users_policy.sql`
- `server/src/config/supabase.js` (review; tidak perlu diubah bila `supabaseAdmin` sudah ada)

### Endpoint

```http
GET    /api/users
GET    /api/users/:userId
POST   /api/users
PATCH  /api/users/:userId
```

`GET /api/users/:userId` opsional; tambahkan bila dibutuhkan drawer/detail. Jika tidak, edit memakai data list.
Reset password **tidak** dibuat sebagai endpoint backend pada rencana default; lihat catatan di bawah.

### `GET /api/users`

Query:

- `search` → `name` atau `email`.
- `role` → enum.
- `division` → `division_id`.
- `status` → boolean `is_active`.
- `includeDeleted` → boolean; hanya efektif untuk SUPER_ADMIN sesuai RLS.

Perbaikan:

- Hapus `testConnection()`. Jangan pernah mengembalikan `"the internet is offline"`.
- Perbaiki `if (status)` menjadi `if (typeof status === "boolean")`.
- Cek `error` sebelum memakai `data`.
- Sertakan `division:divisions(id, name)` agar UI tidak perlu mapping manual.
- Tetap mengembalikan **array langsung** agar `useUsers` dan filter teknisi di TasksPage tidak rusak.
- Urut `name` asc.

Response:

```json
[
  {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "TECHNICIAN",
    "is_active": true,
    "division_id": "...",
    "division": { "id": "...", "name": "Jaringan" },
    "deleted_at": null,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### `POST /api/users`

Hanya SUPER_ADMIN.

Body:

| Field        | Tipe      | Wajib                                  | Catatan                                               |
| ------------ | --------- | -------------------------------------- | ----------------------------------------------------- |
| `name`       | string    | Ya                                     | trim, max 200                                         |
| `email`      | string    | Ya                                     | format email, unik                                    |
| `password`   | string    | Ya                                     | min 8; tidak pernah dikembalikan/di-log               |
| `role`       | Role      | Ya                                     | `SUPER_ADMIN`/`MANAGER_DIVISION`/`STAFF`/`TECHNICIAN` |
| `divisionId` | uuid/null | Ya untuk TECHNICIAN & MANAGER_DIVISION | STAFF/SUPER_ADMIN boleh null                          |

Alur:

1. Validasi input dan `divisionId` (harus ada di tabel divisions).
2. Jika `supabaseAdmin` null → `503 "User admin is not configured"`.
3. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`.
4. Trigger `handle_new_auth_user` membuat baris `public.users` default TECHNICIAN.
5. Update baris `public.users` dengan `name`, `role`, `division_id` memakai `req.supabase` (SUPER_ADMIN lolos RLS). Jika policy/trigger menolak, jangan diam-diam beralih ke service role tanpa alasan yang dicatat.
6. Jika langkah 5 gagal → compensating `supabaseAdmin.auth.admin.deleteUser(id)`.
7. Jika compensating gagal → log detail server, kembalikan error generik.
8. Response `201` dengan profil user.

Error:

- `400` validasi.
- `403` bukan SUPER_ADMIN.
- `409` email sudah terdaftar.
- `503` service role belum dikonfigurasi.
- `500` error lain.

### `PATCH /api/users/:userId`

Hanya SUPER_ADMIN.

Body parsial (minimal satu):

- `name`
- `role`
- `divisionId` (nullable)
- `isActive` (boolean)
- `deleted` (boolean)

Aturan:

- Email immutable di MVP.
- Tidak boleh mengubah `role`, `isActive`, atau `deleted` milik sendiri.
- Tidak boleh menonaktifkan/menurunkan SUPER_ADMIN terakhir.
- `TECHNICIAN` dan `MANAGER_DIVISION` wajib punya `divisionId`.
- Perubahan `divisionId` saat user masih punya assignment aktif (`PENDING`, `IN_PROGRESS`, `ON_HOLD`) → `409`.
- `deleted: true`:
  - set `deleted_at = now()`;
  - set `is_active = false`;
  - ban/revoke sesi user di Supabase Auth.
- `deleted: false`:
  - set `deleted_at = null`;
  - `is_active` harus diaktifkan eksplisit;
  - unban user di Supabase Auth.
- `isActive: false` tanpa `deleted`: set inactive + ban.
- `isActive: true`: aktifkan + unban.
- `PATCH` tidak menghapus baris.

Contoh operasi Auth Admin (verifikasi terhadap versi SDK yang dipakai):

```js
// ban
await supabaseAdmin.auth.admin.updateUserById(userId, {
  ban_duration: "876000h",
});

// unban
await supabaseAdmin.auth.admin.updateUserById(userId, {
  ban_duration: "none",
});
```

Alur multi-write:

1. Fetch target dengan `req.supabase` (RLS).
2. Validasi.
3. Update `public.users`.
4. Update/ban/unban Supabase Auth memakai `supabaseAdmin`.
5. Jika langkah 4 gagal → rollback perubahan DB ke nilai lama; jika rollback gagal, log.

Response `200` dengan profil user.

### Reset password

Rencana default: **tidak membuat endpoint backend**.

- Frontend memanggil `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Hanya tombol di halaman user SUPER_ADMIN yang memicunya.
- Jangan pernah mengembalikan password/link mentah.
- Jangan menampilkan apakah email terdaftar; toast cukup generik.
- Backend tidak perlu tahu password baru.

### Perubahan policy users

Saat ini policy mengizinkan MANAGER_DIVISION mengubah `is_active` user di divisinya. Matriks RBAC menyatakan kelola user hanya SUPER_ADMIN. Rencana ini memperketat:

- SUPER_ADMIN: UPDATE semua kolom.
- Self: UPDATE `name`/`email` (tetap dibatasi trigger).
- MANAGER_DIVISION: tidak lagi mendapat UPDATE untuk user lain.

Perubahan ini **wajib direview** karena mengubah perilaku lama. Jika product tetap ingin manager bisa menonaktifkan staff divisinya, jangan terapkan perubahan policy; sebagai gantinya dokumentasikan pengecualian dan tetap sembunyikan halaman user dari manager.

### Keamanan

- Guard `SUPER_ADMIN` wajib untuk `POST`/`PATCH` karena memakai service role.
- Untuk `GET`, jangan menambahkan guard; RLS sudah membatasi.
- Jangan mengembalikan `password`, `email_confirm`, token, atau raw Supabase error.
- Jangan log body request yang berisi password.
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` hanya ada di environment server.

### Verifikasi

- `GET /api/users?status=false` mengembalikan user nonaktif.
- `GET /api/users?search=...` bekerja.
- Tanpa service role key → `POST /api/users` `503`, bukan crash.
- Manager/Staff/Technician → `403` pada `POST/PATCH`.
- Create user → bisa login, role/divisi benar.
- Duplicate email → `409`.
- Self role change → `400`.
- Deactivate → token lama tidak bisa mengakses endpoint yang memakai `attachProfile`.
- Restore → bisa login lagi.
- `node --check` semua file.

---

## Tahap 2.2 — Data layer user & admin guard

**Commit:** `feat(user): add user data layer and admin guard`

### File

- `client/src/services/userService.js`
- `client/src/hooks/useUsers.js` (refactor race-safe)
- `client/src/hooks/useUserMutations.js`
- `client/src/constants/userConstants.js`
- `client/src/routes/RouteGuards.jsx`
- `client/src/routes/AppRoutes.jsx`
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/MobileBottomNav.jsx`

### Service

```js
getUsers(params);
getUserById(userId); // opsional
createUser(payload);
updateUser(userId, payload);
```

`resetPassword(email)` memakai `supabase.auth.resetPasswordForEmail` di service auth atau user service, bukan API Express.

### Hook

- Refactor `useUsers` memakai `useApiData` agar request lama tidak menimpa request baru.
- `useUserMutations` mengembalikan `createUser`, `updateUser`, `submitting`, `error`.
- Setelah mutasi: toast + refetch.

### Admin guard UI

Tambahkan di `RouteGuards.jsx`:

```jsx
export function AdminRoute() {
  const { userProfile, loading } = useAuth();

  if (loading) return <Loading />;
  if (userProfile?.role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

Ini hanya UX guard. Keamanan sebenarnya tetap di backend + RLS.

### Navigasi

- Desktop: tampilkan `Users` hanya untuk SUPER_ADMIN.
- Mobile: tampilkan `Users` untuk SUPER_ADMIN; jika bottom nav maksimal 4 item, ganti `Divisions` dengan `Users` untuk role tersebut.
- Jangan menampilkan tautan user management ke role lain.

### Verifikasi

- `useUsers({ role: "TECHNICIAN" })` di TasksPage tetap mengembalikan array.
- Manager tidak melihat menu Users dan diarahkan ke dashboard bila membuka `/users`.
- `npm run lint`.

---

## Tahap 2.3 — Halaman `/users`

**Commit:** `feat(user): add users list page`

### File

- `client/src/pages/UsersPage.jsx`
- `client/src/components/users/UserTable.jsx`
- `client/src/components/users/UserCardList.jsx`
- `client/src/components/users/UserFilterBar.jsx`
- `client/src/routes/AppRoutes.jsx`

### Route

```jsx
<Route element={<AdminRoute />}>
  <Route path="/users" element={<UsersPage />} />
</Route>
```

### UI

Header:

- Judul: `User Management`
- Deskripsi: `Kelola akun, role, divisi, dan status aktif pengguna.`
- Tombol `Tambah Pengguna`.

Filter:

- Search nama/email.
- Role.
- Divisi.
- Status: semua/aktif/nonaktif.
- Toggle arsip (soft-deleted).

Tabel desktop:

| Kolom    | Isi                           |
| -------- | ----------------------------- |
| User     | nama + email                  |
| Role     | badge role                    |
| Division | nama divisi / `-`             |
| Status   | aktif / nonaktif / arsip      |
| Updated  | tanggal                       |
| Aksi     | edit, aktif/nonaktif, restore |

Card mobile:

- Nama, email, role, divisi, status, aksi.

State:

- Loading/error/empty konsisten.
- Error `403` → pesan akses ditolak.

### Verifikasi

- Hanya SUPER_ADMIN bisa melihat data sesuai RLS.
- Filter status nonaktif bekerja.
- Search dan filter role/divisi bisa digabung.
- Mobile menampilkan card.

---

## Tahap 2.4 — Dialog create user

**Commit:** `feat(user): add create user dialog`

### File

- `client/src/components/users/UserFormDialog.jsx`
- `client/src/components/users/UserCreateDialog.jsx` (opsional, bisa satu komponen dengan mode)
- `client/src/pages/UsersPage.jsx`

### Field

- `name`
- `email`
- `password` (show/hide; min 8)
- `role`
- `divisionId` (conditional)

Aturan UI:

- `TECHNICIAN`/`MANAGER_DIVISION` → divisi wajib.
- `STAFF`/`SUPER_ADMIN` → divisi opsional.
- Tampilkan helper: `Password sementara. Minta pengguna menggantinya setelah login.`
- Jangan menampilkan password setelah submit.
- Konfirmasi password opsional; jika ditambahkan, validasi harus sama.
- Setelah sukses: tutup dialog, toast, refetch.

### Keamanan

- Jangan menyimpan password di state global/context.
- Jangan mengirim password ke console.
- Jangan menampilkan password pada response API.

### Verifikasi

- Create tiap role.
- Divisi wajib untuk teknisi/manager.
- Email duplikat menampilkan pesan yang bisa dibaca.
- User baru bisa login dan muncul di list.
- `npm run build`.

---

## Tahap 2.5 — Edit, deactivate, restore, reset password

**Commit:** `feat(user): add edit deactivate and password reset`

### File

- `client/src/components/users/UserEditDialog.jsx`
- `client/src/components/users/UserStatusDialog.jsx` (opsional)
- `client/src/pages/UsersPage.jsx`
- `client/src/services/userService.js` atau `authService.js`

### Edit

Field:

- `name`
- `role`
- `divisionId`
- `isActive`
- Email read-only.

Aturan UI:

- Sembunyikan/disable perubahan role/status untuk diri sendiri.
- Tampilkan peringatan bila menonaktifkan SUPER_ADMIN terakhir.
- Perubahan divisi saat user punya task aktif akan ditolak backend; tampilkan toast.

### Deactivate/delete

- Gunakan `ConfirmDialog`.
- Teks: `User akan dinonaktifkan dan tidak bisa mengakses aplikasi. Data tugas dan riwayat tetap tersimpan.`
- `deleted: true` = arsip + nonaktif.
- `isActive: false` = nonaktif tanpa arsip.
- Restore = `deleted: false` + `isActive: true`.

### Reset password

- Tombol `Kirim Reset Password`.
- Panggil `supabase.auth.resetPasswordForEmail(user.email, { redirectTo: ... })`.
- Pastikan redirect URL terdaftar di Supabase Auth settings.
- Tampilkan toast sukses tanpa membocorkan apakah email terdaftar.
- Jangan membuat endpoint yang mengembalikan password sementara.

### Keamanan

- Backend tetap memvalidasi self-protection dan last-super-admin.
- Jangan mengandalkan disabled tombol saja.
- Jangan menampilkan token/reset link.

### Verifikasi

- Edit role/divisi berhasil dan tercermin di list.
- Nonaktifkan user → login/API ditolak.
- Restore → aktif kembali.
- Self-deactivate ditolak.
- Reset password mengirim email (uji dengan akun test).
- Manager tidak bisa mengakses halaman/endpoint.

---

## Tahap 2.6 — Verifikasi sesi & dokumentasi

**Commit:** `chore(user): verify user management`

### Pekerjaan

- Uji matrix role penuh.
- Uji service role key tidak ada.
- Uji duplicate email, email invalid, password pendek.
- Uji user nonaktif/arsip tidak bisa memakai API.
- Uji `GET /users?status=false`.
- Uji `GET /users` masih kompatibel dengan TasksPage.
- Update `api-contract.md`:
  - `GET /users` query/response aktual;
  - `POST/PATCH /users`;
  - policy users;
  - temuan #26, #28 selesai.
- Update `README.md`.
- Update Swagger.

### Definition of Done

- Semua verifikasi lulus.
- Tidak ada password/token di log.
- Build/lint lulus.
- Hanya SUPER_ADMIN yang bisa mengelola user.

---

# Sesi 3 — Notifikasi In-App

## 3.0 Ringkasan Sesi

Tujuan:

- Memperbaiki backend notifikasi.
- Menampilkan notifikasi nyata di desktop dan mobile.
- Menambahkan halaman `/notifications`.
- Menambahkan Realtime + fallback polling.

Definition of Done sesi:

- Bell menampilkan jumlah unread yang benar.
- User hanya bisa melihat/menandai notifikasinya sendiri.
- `isRead=false` bekerja.
- Tandai satu/semua notifikasi bekerja.
- Realtime memperbarui badge tanpa refresh.
- User nonaktif ditolak.
- `npm run lint` dan `npm run build` lulus.

---

## Tahap 3.1 — Perbaikan backend notifikasi

**Commit:** `fix(notification): harden notification backend`

### File

- `server/src/controllers/notification.controller.js`
- `server/src/routes/notification.routes.js`
- `server/src/routes/index.js`
- `server/supabase/sql/grants/00_notifications_grants.sql` (review)
- `server/supabase/sql/realtime/00_notifications_realtime.sql` (baru, lihat Tahap 3.2)

### Mount

Ubah:

```js
router.use("/notifications", requireAuth, notificationRoutes);
```

menjadi:

```js
router.use("/notifications", requireAuth, attachProfile, notificationRoutes);
```

Tujuan: user nonaktif/soft-deleted langsung `403`.

### `GET /api/notifications`

- Parse `isRead` dengan `typeof isRead === "boolean"`; jangan memakai `if (isRead)`.
- `isRead=false` harus menambahkan `.eq("is_read", false)`.
- Nilai selain boolean → `400`.
- Select field eksplisit, bukan `*`:
  - `id, user_id, title, message, type, is_read, created_at, related_task_id`.
- Tambahkan `totalPages`.
- Cek `error` sebelum response.
- Urut `created_at` desc.
- Jangan mengembalikan error mentah.

### `GET /api/notifications/unread-count`

- Route harus didefinisikan **sebelum** route `/:id` jika ada konflik.
- Hitung notifikasi `is_read = false` milik user.
- Response:

```json
{ "unreadCount": 3 }
```

- RLS tetap membatasi ke user sendiri.

### `PATCH /api/notifications/:id`

- Jangan mengakses `error.code` sebelum memastikan `error` ada.
- Gunakan `.update({ is_read: true }).eq("id", id).select().maybeSingle()`.
- Jika 0 baris → `404`.
- Jangan menerima `user_id` dari body.
- Jangan mengizinkan un-read.
- Response tetap `data: { notification }` agar kompatibel dengan kontrak lama.

### `PATCH /api/notifications/read-all`

- Definisikan **sebelum** `/:id`.
- Update semua notifikasi user yang `is_read = false`.
- Jangan menerima `userId` dari body.
- Gunakan `req.supabase` agar RLS berlaku; tambahkan `.eq("is_read", false)`.
- Response:

```json
{ "updated": 4 }
```

- Jika tidak ada data, tetap `200` dengan `updated: 0`.

### Keamanan

- Semua query memakai `req.supabase`, bukan `supabaseAdmin`.
- Notifikasi milik user lain harus `404`, bukan `403`.
- Jangan menambahkan query `user_id` dari client.
- Jangan mengirim notifikasi ke semua user dari endpoint.

### Verifikasi

- `GET /notifications?isRead=false` hanya unread.
- `GET /notifications?isRead=true` hanya read.
- `PATCH` notifikasi user lain → `404`.
- `read-all` hanya mengubah milik sendiri.
- User nonaktif → `403`.
- `node --check`.

---

## Tahap 3.2 — Data layer, Realtime, dan fallback polling

**Commit:** `feat(notification): add notification data layer and realtime`

### File

- `client/src/services/notificationService.js`
- `client/src/hooks/useNotifications.js`
- `client/src/hooks/useUnreadNotificationCount.js`
- `client/src/hooks/useNotificationRealtime.js`
- `client/src/utils/notificationEvents.js`
- `server/supabase/sql/realtime/00_notifications_realtime.sql`

### Service

```js
getNotifications(params);
getUnreadCount();
markNotificationRead(id);
markAllNotificationsRead();
```

### Hook list

`useNotifications(params)`:

- Memakai `useApiData`.
- Parameter: `page`, `limit`, `isRead`.
- Return: `notifications`, `pagination`, `loading`, `error`, `refetch`.

`useUnreadNotificationCount()`:

- Memanggil `getUnreadCount`.
- Refetch saat window focus.
- Refetch saat event lokal `notifications-changed`.
- Fallback polling setiap 60 detik.
- Jangan polling jika tab hidden.
- Bersihkan interval, event listener, dan channel saat unmount/logout.

### Realtime

Gunakan Supabase Realtime Postgres Changes:

```js
supabase
  .channel(`notifications:${userId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    () => {
      emitNotificationsChanged();
    },
  )
  .subscribe();
```

Aturan:

- Filter `user_id` adalah optimasi, bukan pengaman. RLS tetap pengaman.
- Unsubscribe saat logout/unmount.
- Jika Realtime error/closed, fallback polling tetap berjalan.
- Jangan subscribe ke seluruh tabel tanpa filter.
- Jangan menampilkan isi notifikasi dari payload realtime secara langsung; refetch dari API agar konsisten dengan RLS.

SQL prasyarat:

```sql
-- Jalankan manual di Supabase SQL Editor.
-- Cek dulu apakah tabel sudah ada di publication.
alter publication supabase_realtime add table notifications;
```

Bila tabel sudah terdaftar, jangan jalankan ulang; tangani error duplicate.

### Event lokal

`notificationEvents.js`:

- `emitNotificationsChanged()`
- `subscribeNotificationsChanged(listener)`

Event dipakai setelah mark read/mark all read agar badge dan list langsung sinkron tanpa menunggu Realtime.

### Verifikasi

- Dua sesi browser dengan user berbeda: notifikasi user A tidak muncul di user B.
- Assignment task baru memicu notifikasi di user yang di-assign.
- Mark read menurunkan badge.
- Realtime update tanpa refresh.
- Fallback polling tetap bekerja saat Realtime dimatikan.
- `npm run lint`.

---

## Tahap 3.3 — Notification menu (desktop & mobile)

**Commit:** `feat(notification): add notification menu`

### File

- `client/src/components/notifications/NotificationBell.jsx`
- `client/src/components/notifications/NotificationMenu.jsx`
- `client/src/components/notifications/NotificationItem.jsx`
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/MobileHeader.jsx`

### Perilaku

Bell:

- Menampilkan ikon `Bell`.
- Badge angka unread; `99+` bila lebih.
- `aria-label` dinamis: `Notifikasi, 3 belum dibaca`.
- Klik membuka menu.

Menu:

- Header: `Notifikasi` + tombol `Tandai semua dibaca`.
- List 5 notifikasi terbaru.
- Item: ikon berdasarkan tipe, judul, pesan ringkas, waktu relatif, dot unread.
- Klik item:
  1. mark read (optimistic + rollback bila gagal);
  2. `navigate(`/tasks/${related_task_id}`)` bila ada;
  3. tutup menu.
- Footer: `Lihat semua` → `/notifications`.
- Empty: `Belum ada notifikasi.`
- Error: pesan + `Coba lagi`.

Desktop:

- Bell ditempatkan di sidebar (brand/header atau footer profil).
- Menu dropdown `absolute`, lebar ±320px, shadow, border slate.

Mobile:

- Bell di `MobileHeader`.
- Menu bisa memakai panel fixed di bawah header atau full-width dropdown.
- Pastikan tidak tertutup bottom nav.

Aksesibilitas:

- `aria-expanded`, `aria-haspopup`, `role="menu"`.
- Escape menutup.
- Klik di luar menutup.
- Fokus kembali ke bell setelah menutup.

### Hapus dummy

Hapus:

```js
onClick={() => toast.info('Tidak ada notifikasi baru.')}
```

dan dot merah statis. Ganti dengan data nyata.

### Verifikasi

- Badge akurat.
- Menu bisa dibuka/tutup dengan keyboard.
- Mobile tidak overflow.
- Mark read dari menu bekerja.
- Notifikasi tanpa `related_task_id` tidak error saat diklik.

---

## Tahap 3.4 — Halaman `/notifications`

**Commit:** `feat(notification): add notifications page`

### File

- `client/src/pages/NotificationsPage.jsx`
- `client/src/routes/AppRoutes.jsx`

### Route

```jsx
<Route path="/notifications" element={<NotificationsPage />} />
```

### UI

Header:

- Judul `Notifications`
- Deskripsi `Riwayat penugasan dan perubahan status tugas Anda.`
- Tombol `Tandai semua dibaca`.

Tabs:

- `Semua`
- `Belum dibaca`

List:

- Item card dengan ikon tipe, judul, pesan, waktu, status read.
- Klik item menandai read dan membuka task terkait.
- Pagination.
- Loading/error/empty.

Filter di URL:

- `page`
- `limit`
- `isRead` (`true`/`false`); tab “Semua” menghapus parameter.

### Verifikasi

- Tab unread hanya menampilkan unread.
- Pagination bekerja.
- Mark all read mengurangi badge menjadi 0.
- Refresh mempertahankan tab.
- `npm run build`.

---

## Tahap 3.5 — Verifikasi sesi & dokumentasi

**Commit:** `chore(notification): verify notifications`

### Pekerjaan

- Uji RLS dengan dua user.
- Uji `read-all` dan `PATCH` lintas user.
- Uji user nonaktif.
- Uji Realtime on/off.
- Uji mobile/desktop.
- Update `api-contract.md`:
  - mount `attachProfile`;
  - `isRead=false`;
  - `unread-count`;
  - `read-all`;
  - `totalPages`;
  - temuan #6, #18 selesai.
- Update `README.md`: Notification menjadi `[x]` bila UI selesai.
- Catat bahwa deadline reminder scheduler belum termasuk.

### Definition of Done

- Semua verifikasi lulus.
- Tidak ada kebocoran notifikasi antar user.
- Build/lint lulus.

---

# Sesi 4 — Riwayat Servis & Service Report

## 4.0 Ringkasan Sesi

Tujuan:

- Menambahkan service report immutable.
- Menambahkan riwayat servis per client/asset.
- Menambahkan filter, pencarian, pagination, detail, dan export CSV.
- Menambahkan timestamp penyelesaian yang akurat.

Definition of Done sesi:

- Service report hanya bisa dibuat untuk task `COMPLETED` oleh role yang berhak.
- Snapshot dibuat server, bukan dari client.
- Riwayat servis menampilkan task selesai sesuai RLS.
- Client/asset/divisi/teknisi/tanggal bisa difilter.
- Export CSV menghormati filter dan RLS.
- Task detail tidak lagi membawa `snapshot_data` di embed.
- `npm run lint` dan `npm run build` lulus.

---

## Tahap 4.1 — `completed_at` dan fondasi service report

**Commit:** `feat(report): add completed timestamp and report foundation`

### File

- `server/prisma/schema.prisma`
- `server/prisma/migrations/<timestamp>_add_tasks_completed_at/migration.sql`
- `server/supabase/sql/functions/01_trigger_functions.sql` (derivasi `completed_at`)
- `server/src/controllers/task.controller.js` (select `completed_at`)
- `server/supabase/sql/migrations/00_add_tasks_completed_at.sql` (opsional, untuk SQL Editor)
- `server/supabase/sql/functions/03_task_status_functions.sql` (review; hanya ubah bila diperlukan)

### Schema

Tambahkan ke model `Task`:

```prisma
completedAt DateTime? @map("completed_at")
```

Tambahkan index:

```prisma
@@index([completedAt])
```

### SQL

```sql
alter table tasks
  add column if not exists completed_at timestamp(3);

create index if not exists tasks_completed_at_idx
  on tasks (completed_at);

-- Backfill: ambil perubahan status COMPLETED terakhir.
update tasks t
set completed_at = h.changed_at
from (
  select distinct on (task_id)
    task_id,
    changed_at
  from task_status_history
  where new_status = 'COMPLETED'
  order by task_id, changed_at desc
) h
where t.id = h.task_id
  and t.status = 'COMPLETED'
  and t.completed_at is null;
```

Jalankan manual di Supabase SQL Editor. Jangan mengandalkan `prisma migrate` untuk remote Supabase tanpa konfirmasi.

### Update `completed_at` secara aman

Jangan hanya menambahkan `completed_at` ke daftar kolom yang boleh diubah TECHNICIAN. Itu membuka celah manipulasi timestamp lewat request langsung.

Gunakan aturan berikut:

1. `completed_at` **diturunkan dari status**, bukan dari input client.
2. Nilai dari client selalu diabaikan/ditimpa.
3. Trigger kolom tetap membatasi kolom lain.

Rekomendasi implementasi:

- Tambahkan derivasi di awal `enforce_task_column_restrictions()` (BEFORE UPDATE), sebelum perbandingan kolom:

```sql
-- Selalu timpa nilai dari client, termasuk saat status tidak berubah.
NEW.completed_at := CASE
  WHEN NEW.status = 'COMPLETED'
       AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN now()
  WHEN NEW.status <> 'COMPLETED' THEN NULL
  ELSE OLD.completed_at
END;
```

- Kecualikan `completed_at` dari perbandingan `to_jsonb(OLD.*) - allowed_columns` karena kolom ini diturunkan oleh trigger, bukan oleh user.
- Pastikan `updateTask`/`updateStatusTask` di aplikasi tidak pernah menerima `completed_at` dari body.
- Alternatif yang setara: trigger `BEFORE UPDATE` terpisah yang dijamin berjalan sebelum trigger restriksi kolom, lalu kecualikan `completed_at` dari perbandingan. Jangan memakai trigger yang berjalan setelah restriksi.

Dengan cara ini:

- `PENDING` → `IN_PROGRESS` → `completed_at = null`.
- `COMPLETED` → `completed_at = now()`.
- Keluar dari `COMPLETED` atau masuk `CANCELLED` → `completed_at = null`.
- Percobaan client mengirim `completed_at` tidak berpengaruh.

### Task detail

Tambahkan `completed_at` ke select `getTaskDetail`. Jangan mengubah bentuk lain.

### Verifikasi

- Task baru `PENDING` → `completed_at = null`.
- Ubah ke `COMPLETED` → terisi.
- Ubah keluar dari `COMPLETED` → null.
- Backfill mengisi task lama.
- Task detail menampilkan `completed_at`.
- `node --check`, `npm run lint`.

---

## Tahap 4.2 — Endpoint service report per task

**Commit:** `feat(report): add task service report endpoints`

### File

- `server/src/controllers/serviceReport.controller.js`
- `server/src/utils/serviceReportSnapshot.js`
- `server/src/routes/serviceReport.routes.js`
- `server/src/routes/task.routes.js`
- `server/src/routes/index.js`

### Endpoint

```http
POST /api/tasks/:taskId/reports
GET  /api/tasks/:taskId/reports
GET  /api/tasks/:taskId/reports/:reportId
```

### Body create

| Field         | Tipe        | Wajib | Batas |
| ------------- | ----------- | ----- | ----- |
| `summary`     | string      | Ya    | 2000  |
| `actionTaken` | string      | Ya    | 2000  |
| `notes`       | string/null | Tidak | 2000  |

- `snapshotData` dari client → `400`.
- `summary`/`actionTaken` di-trim.
- Jangan menerima `createdById` dari body; ambil dari `req.profile.id`.

### Aturan bisnis

- Task harus bisa dibaca user (RLS) → jika tidak, `404`.
- Task harus `COMPLETED` → selain itu `409 "Service report can only be created for completed tasks"`.
- Report immutable: tidak ada `PATCH`/`DELETE`.
- Banyak report per task diperbolehkan; koreksi = report baru.

### Snapshot server-side

`serviceReportSnapshot.js` membangun:

```json
{
  "task": {
    "id": "",
    "title": "",
    "description": "",
    "priority": "",
    "status": "",
    "due_date": null,
    "created_at": ""
  },
  "division": { "id": "", "name": "" },
  "client": {
    "id": "",
    "name": "",
    "contact": "",
    "email": null,
    "address": "",
    "service_type": ""
  },
  "asset": {
    "id": "",
    "name": "",
    "serial_number": null,
    "type": ""
  },
  "technicians": [{ "id": "", "name": "", "email": "" }],
  "status_history": [
    {
      "old_status": "",
      "new_status": "",
      "changed_at": "",
      "changed_by": { "id": "", "name": "" }
    }
  ],
  "generated_at": ""
}
```

- `asset` = `null` bila task tanpa asset.
- Gunakan data yang dibaca dengan `req.supabase`, sehingga snapshot hanya berisi data yang boleh dilihat user.
- Jangan menerima snapshot dari client.

### Response

`POST`:

```json
{
  "id": "...",
  "task_id": "...",
  "created_by_id": "...",
  "summary": "...",
  "action_taken": "...",
  "notes": null,
  "snapshot_data": {},
  "created_at": "...",
  "updated_at": "..."
}
```

`GET /tasks/:taskId/reports`:

- Array, urut `created_at` desc.
- **Tanpa** `snapshot_data`.
- Sertakan `createdBy: { id, name, email }`.

`GET /tasks/:taskId/reports/:reportId`:

- Report lengkap termasuk `snapshot_data`.
- Jika report bukan milik task → `404`.

### Keamanan

- Insert bergantung pada policy `service_reports`:
  - SUPER_ADMIN, MANAGER_DIVISION;
  - TECHNICIAN hanya jika task satu divisi dan tidak deleted;
  - STAFF ditolak.
- Map `42501` → `403`.
- Jangan memakai service role.
- Jangan mengirim snapshot ke role yang tidak boleh melihat task.

### Verifikasi

- Staff create → `403`.
- Technician beda divisi → `403/404` sesuai RLS.
- Technician divisi sama → `201`.
- Task belum `COMPLETED` → `409`.
- `snapshotData` di body → `400`.
- Snapshot berisi data task saat report dibuat; perubahan task setelahnya tidak mengubah snapshot.
- Report tidak bisa diedit/dihapus.
- `node --check`.

---

## Tahap 4.3 — Endpoint riwayat servis & export CSV

**Commit:** `feat(report): add service history endpoints and csv export`

### File

- `server/src/controllers/serviceHistory.controller.js` (baru)
- `server/src/controllers/serviceReport.controller.js` (tambah detail report global)
- `server/src/routes/serviceHistory.routes.js` (baru)
- `server/src/routes/serviceReport.routes.js`
- `server/src/routes/index.js`
- `server/src/utils/csv.js` (baru)

### Endpoint

```http
GET /api/service-history
GET /api/service-history/export
GET /api/service-reports/:reportId
```

- `GET /api/service-history` adalah daftar **task selesai** (bukan daftar report).
- `report` bersifat opsional; task selesai tanpa report tetap tampil di riwayat.
- Detail report tetap memakai `GET /api/service-reports/:reportId`.
- Nested report tetap memakai endpoint Tahap 4.2.
- Daftarkan `/export` sebelum route `/:reportId` bila berada di router yang sama.

### `GET /api/service-history`

Query:

- `search` → task title, task id, client name.
- `clientId`
- `assetId`
- `divisionId`
- `technicianId`
- `completedFrom` (YYYY-MM-DD)
- `completedTo` (YYYY-MM-DD)
- `page` (default 1)
- `limit` (default 20, max 100)
- `sortBy=completed_at` (default)
- `sortOrder=desc|asc`

Aturan:

- Hanya task `status = COMPLETED`.
- Hanya task `deleted_at IS NULL`.
- Gunakan `completed_at` untuk filter tanggal.
- RLS task tetap berlaku.
- Search client: cari client id yang namanya cocok, lalu gabungkan dengan search title; sanitasi input.
- Technician filter: cari `task_assignments.user_id`, lalu `.in("id", taskIds)`; jika kosong, return empty page.
- Jangan memakai `select *`.

Response:

```json
{
  "history": [
    {
      "task": {
        "id": "...",
        "title": "...",
        "description": "...",
        "status": "COMPLETED",
        "priority": "HIGH",
        "due_date": null,
        "completed_at": "..."
      },
      "report": {
        "id": "...",
        "summary": "...",
        "action_taken": "...",
        "notes": null,
        "created_at": "...",
        "created_by_id": "..."
      },
      "client": {
        "id": "...",
        "name": "...",
        "contact": "...",
        "email": null,
        "address": "...",
        "service_type": "..."
      },
      "asset": {
        "id": "...",
        "name": "...",
        "serial_number": null,
        "type": "..."
      },
      "division": { "id": "...", "name": "..." },
      "technicians": [{ "id": "...", "name": "...", "email": "..." }]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- `report` = `null` bila task belum punya service report.
- Karena satu task boleh punya beberapa report, tampilkan **report terbaru** (`created_at` desc) di list. Semua report tetap terlihat di detail task.
- `asset` = `null` bila task tanpa asset.
- Jangan sertakan `snapshot_data` di list; snapshot hanya di detail report.
- Implementasi aman: query task lebih dulu, kumpulkan `task_id`, lalu query `service_reports` untuk ID tersebut dan pilih report terbaru per task di controller. Jangan mengandalkan nested embed yang tidak mendukung limit per parent.

### `GET /api/service-reports/:reportId`

- Report lengkap termasuk `snapshot_data`.
- Report harus bisa dibaca user (RLS).
- `404` bila tidak ada/tidak accessible.

### `GET /api/service-history/export`

- Query sama dengan list, tanpa `page`/`limit`.
- Batas maksimum 5000 baris.
- `Content-Type: text/csv; charset=utf-8`.
- `Content-Disposition: attachment; filename="service-history-YYYYMMDD.csv"`.
- Kolom:
  - Task ID
  - Title
  - Client
  - Asset
  - Division
  - Technicians
  - Completed At
  - Priority
  - Summary
  - Action Taken
  - Notes
- Escape `"` → `""`, bungkus field dengan `"`.
- Cegah CSV formula injection: jika sel diawali `=`, `+`, `-`, `@`, tab, atau CR, prefix dengan `'`.
- Jangan mengirim error JSON di response CSV; jika gagal, `500` JSON sebelum header dikirim.

### Keamanan

- Staff boleh melihat dan export task selesai yang terlihat RLS.
- Technician hanya divisi sendiri.
- Jangan memakai service role.
- Jangan membocorkan snapshot ke user yang tidak bisa melihat task.
- Jangan izinkan `limit` tak terbatas.

### Verifikasi

- Riwayat hanya task `COMPLETED`, bukan `CANCELLED`.
- Task selesai tanpa report tetap muncul dengan `report: null`.
- Filter client/asset/divisi/teknisi/tanggal bekerja.
- Search client name bekerja.
- Pagination benar.
- Export menghormati filter dan RLS.
- CSV bisa dibuka di Excel dan karakter khusus aman.
- `node --check`.

---

## Tahap 4.4 — UI service report di task detail

**Commit:** `feat(report): add task report UI`

### File

- `client/src/services/serviceReportService.js`
- `client/src/hooks/useTaskReports.js`
- `client/src/hooks/useServiceReport.js`
- `client/src/components/tasks/TaskReportsSection.jsx`
- `client/src/components/tasks/TaskReportDialog.jsx`
- `client/src/components/tasks/TaskReportDetailDialog.jsx`
- `client/src/pages/TaskDetailPage.jsx`
- `server/src/controllers/task.controller.js` (hapus `snapshot_data` dari embed reports)

### Backend change

Di `getTaskDetail`, ubah embed:

```diff
- reports:service_reports (
-   id, summary, action_taken, notes, created_at, updated_at, snapshot_data,
-   createdBy:users!service_reports_created_by_id_fkey (id, name, email)
- )
+ reports:service_reports (
+   id, summary, action_taken, notes, created_at, updated_at,
+   createdBy:users!service_reports_created_by_id_fkey (id, name, email)
+ )
```

Detail snapshot diambil lewat endpoint nested saat user membuka report.

### UI section

Tambahkan section `Laporan Servis` setelah activity log atau sebelum checklist:

- List report: summary, action taken, created by, date.
- Empty: `Belum ada laporan servis.`
- Tombol `Buat Laporan` bila:
  - role MANAGER_DIVISION/SUPER_ADMIN/TECHNICIAN;
  - task `COMPLETED`;
  - user bisa melihat task.
- Staff tidak melihat tombol.

### Dialog create

Field:

- Summary (textarea)
- Action taken (textarea)
- Notes (textarea, optional)

Validasi:

- Summary/action taken wajib.
- Max length sesuai backend.
- Jangan mengirim snapshot.
- Setelah sukses: toast, refetch task/report, emit `emitTasksChanged()`.

### Detail/print

- Klik report → fetch `GET /tasks/:taskId/reports/:reportId`.
- Tampilkan snapshot: task, client, asset, division, technicians, status history.
- Tombol `Cetak` memakai `window.print()`.
- Jangan render HTML dari data; React text escaping cukup.
- Sediakan print stylesheet sederhana atau modal print-friendly.

### Verifikasi

- Task `PENDING` tidak menampilkan tombol create.
- Staff tidak melihat tombol.
- Technician divisi lain tidak bisa create.
- Report baru muncul di list.
- Detail report menampilkan snapshot.
- Task detail tidak lagi membawa `snapshot_data` (cek network payload).
- `npm run lint`, `npm run build`.

---

## Tahap 4.5 — Halaman `/service-history`

**Commit:** `feat(report): add service history page`

### File

- `client/src/pages/ServiceHistoryPage.jsx`
- `client/src/components/history/ServiceHistoryTable.jsx`
- `client/src/components/history/ServiceHistoryCardList.jsx`
- `client/src/components/history/ServiceHistoryFilterBar.jsx`
- `client/src/components/history/ServiceHistoryDetailDialog.jsx`
- `client/src/services/serviceHistoryService.js`
- `client/src/services/serviceReportService.js`
- `client/src/hooks/useServiceHistory.js`
- `client/src/routes/AppRoutes.jsx`
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/MobileBottomNav.jsx`
- `client/src/components/clients/ClientDetailDrawer.jsx`

### Service

`serviceHistoryService.js`:

```js
getServiceHistory(params);
exportServiceHistory(params); // responseType: "blob"
```

`serviceReportService.js`:

```js
getTaskReports(taskId);
createTaskReport(taskId, payload);
getTaskReport(taskId, reportId);
getServiceReport(reportId);
```

### Route

- Tambahkan `/service-history`.
- Ubah `/reports` menjadi redirect ke `/service-history` atau ganti isinya dengan `ServiceHistoryPage`, sesuai keputusan product.
- Rekomendasi: `/reports` redirect ke `/service-history`; label sidebar menjadi `Service History`; SLA Reports tetap future work.

### UI

Header:

- Judul `Service History`
- Deskripsi `Riwayat tugas selesai, laporan servis, dan bukti pekerjaan.`
- Tombol `Export CSV`.

Filter:

- Search task/client.
- Client picker (reuse `ClientPicker`).
- Asset select (dependent on client; pakai detail client).
- Division.
- Technician.
- Completed from/to.
- Reset filter.

Tabel desktop:

| Kolom       | Isi                              |
| ----------- | -------------------------------- |
| Task        | ID + title                       |
| Client      | name                             |
| Asset       | name/type                        |
| Division    | name                             |
| Technicians | names                            |
| Completed   | `completed_at`                   |
| Report      | badge ada/tidak                  |
| Aksi        | lihat tiket, lihat report, cetak |

Card mobile:

- Title, client, completed date, status report, tombol detail.

Detail:

- Klik baris → `ServiceHistoryDetailDialog` atau navigasi ke `/tasks/:id`.
- `Lihat Report` membuka snapshot report.
- `Cetak` memakai `window.print()`.

Export:

- Panggil `GET /service-history/export` dengan filter aktif.
- Gunakan `responseType: "blob"`.
- Download file dari `Content-Disposition`.
- Tampilkan toast sukses/gagal.

Integrasi:

- Client detail drawer: tombol `Riwayat Servis` → `/service-history?clientId=...`.
- Asset row (bila ada): tombol riwayat → `/service-history?assetId=...`.

### URL state

Gunakan `useSearchParams` untuk semua filter agar refresh/back tidak hilang.

### Verifikasi

- Hanya task completed yang muncul.
- Filter client/asset/divisi/teknisi/tanggal bekerja.
- Pagination dan search bekerja.
- Export CSV sesuai filter.
- Technician hanya melihat divisi sendiri.
- Staff bisa melihat dan export.
- Mobile card tampil benar.
- `npm run build`.

---

## Tahap 4.6 — Verifikasi sesi & dokumentasi

**Commit:** `chore(report): verify service history`

### Pekerjaan

- Uji end-to-end:
  1. Task dibuat.
  2. Assign teknisi.
  3. Status → `COMPLETED`.
  4. Technician membuat service report.
  5. Report muncul di task detail.
  6. Task muncul di service history.
  7. Filter client/asset/tanggal.
  8. Export CSV.
  9. Cetak report.
- Uji role:
  - Staff tidak bisa create report.
  - Technician divisi lain tidak bisa create.
  - Manager/Super Admin bisa.
  - Technician hanya melihat riwayat divisinya.
- Uji `completed_at` saat status berubah keluar/masuk COMPLETED.
- Uji snapshot tidak berubah setelah client/asset diedit.
- Uji task tanpa report tetap muncul di history.
- Uji CSV injection (`=cmd`, `+`, `-`, `@`).
- Update `api-contract.md`:
  - `completed_at`;
  - service report endpoints;
  - service history endpoints;
  - export CSV;
  - temuan #16, #17 selesai.
- Update `README.md`: Service Reports menjadi `[x]`.
- Update Swagger.
- Catat bahwa PDF dan SLA report belum termasuk.

### Definition of Done

- Semua verifikasi lulus.
- Build/lint lulus.
- Dokumentasi sesuai implementasi.

---

# 6. Regression Checklist Lintas Sesi

Jalankan setelah setiap sesi dan sekali lagi sebelum merge ke `main`.

## 6.1 Backend

- [ ] `GET /health` → `200`.
- [ ] Semua endpoint tanpa token → `401`.
- [ ] User nonaktif/soft-deleted → `403` pada endpoint yang memakai `attachProfile`.
- [ ] Request invalid → `400` dengan pesan yang bisa dibaca.
- [ ] Resource tidak ditemukan/tidak accessible → `404`.
- [ ] Role tidak berhak → `403` atau `404` sesuai aturan RLS.
- [ ] Tidak ada `error.message` database mentah di response production.
- [ ] `node --check` semua file yang diubah.
- [ ] Tidak ada service role key di response/log.

## 6.2 Frontend

- [ ] `npm run lint`.
- [ ] `npm run build`.
- [ ] Login/logout.
- [ ] Dashboard summary dan 5 task terbaru.
- [ ] Tasks list, filter, pagination, create, detail, edit, status, assign, attachment.
- [ ] Client list/detail/create/edit/delete/asset.
- [ ] User list/create/edit/deactivate/reset.
- [ ] Notification badge/menu/page/mark read.
- [ ] Service history/filter/export/report.
- [ ] Mobile 375px: tabel berubah menjadi card, tidak overflow.
- [ ] Dialog bisa ditutup dengan Escape/backdrop.
- [ ] Toast sukses/gagal muncul.
- [ ] Error state punya tombol `Coba lagi`.

## 6.3 Security

- [ ] Technician tidak bisa create/update/delete client.
- [ ] Staff tidak bisa delete client.
- [ ] Staff tidak bisa create service report.
- [ ] Technician hanya melihat task/riwayat divisinya.
- [ ] Manager tidak bisa mengelola user (setelah policy diperketat).
- [ ] Notifikasi hanya milik sendiri.
- [ ] `read-all` tidak menyentuh user lain.
- [ ] Export CSV tidak membocorkan data di luar RLS.
- [ ] Tidak ada `dangerouslySetInnerHTML` pada data user.
- [ ] Tidak ada password/token di console/log.

---

# 7. Keputusan yang Perlu Dikonfirmasi Sebelum Implementasi

| #   | Keputusan                                       | Default rencana        | Dampak                                                                      |
| --- | ----------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| K1  | User management hanya SUPER_ADMIN?              | Ya                     | Perlu memperketat policy users; manager kehilangan akses update `is_active` |
| K2  | Assets tetap bisa ditulis semua role?           | Ya, ikuti RLS existing | Technician bisa menambah/edit asset                                         |
| K3  | Service report boleh lebih dari satu per task?  | Ya, immutable          | Koreksi dilakukan dengan report baru                                        |
| K4  | Service report hanya untuk task COMPLETED?      | Ya                     | Task ON_HOLD/CANCELLED tidak bisa report                                    |
| K5  | `/reports` diganti menjadi Service History?     | Ya, redirect           | SLA Reports menjadi future work                                             |
| K6  | Client detail tidak lagi mengembalikan `tasks`? | Ya                     | Riwayat memakai endpoint service history                                    |
| K7  | Deadline reminder otomatis?                     | Tidak termasuk         | Butuh scheduler terpisah                                                    |
| K8  | Export PDF?                                     | Tidak termasuk         | CSV dulu                                                                    |
| K9  | Hard delete user?                               | Tidak                  | Soft delete + ban Auth                                                      |
| K10 | `completed_at` ditambahkan?                     | Ya                     | Perlu migration + backfill                                                  |

Jika ada keputusan yang berbeda, ubah dokumen ini sebelum implementasi dimulai.

---

# 8. Risiko dan Mitigasi

| Risiko                                             | Mitigasi                                                      |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Perubahan policy users memblokir manager           | Review manual; siapkan rollback SQL                           |
| Service role key tidak tersedia                    | Endpoint create/ban mengembalikan `503`, bukan crash          |
| Realtime publication belum aktif                   | Fallback polling 60 detik + dokumentasi SQL                   |
| Backfill `completed_at` salah                      | Ambil history COMPLETED terakhir; verifikasi count            |
| Snapshot report membocorkan data                   | Dibuat dari query RLS; jangan terima dari client              |
| CSV injection                                      | Prefix formula characters; escape quote                       |
| Client detail berubah dan merusak TaskCreateDialog | Pastikan `assets` tetap ada; uji create task                  |
| `useUsers` berubah dan merusak filter teknisi      | Pertahankan response array; uji TasksPage                     |
| Perubahan navigasi mobile                          | Uji 375px dan role SUPER_ADMIN/non-admin                      |
| Duplikasi UI                                       | Gunakan shared `DataPagination`, `ConfirmDialog`, `FormField` |

---

# 9. Urutan Commit Ringkas

## Sesi 1

1. `fix(client): harden client and asset endpoints`
2. `feat(client): add client data layer and shared UI primitives`
3. `feat(client): add clients page with search and pagination`
4. `feat(client): add client detail and mutations`
5. `feat(client): add asset management to client detail`
6. `chore(client): verify client management`

## Sesi 2

1. `feat(user): add user admin backend`
2. `feat(user): add user data layer and admin guard`
3. `feat(user): add users list page`
4. `feat(user): add create user dialog`
5. `feat(user): add edit deactivate and password reset`
6. `chore(user): verify user management`

## Sesi 3

1. `fix(notification): harden notification backend`
2. `feat(notification): add notification data layer and realtime`
3. `feat(notification): add notification menu`
4. `feat(notification): add notifications page`
5. `chore(notification): verify notifications`

## Sesi 4

1. `feat(report): add completed timestamp and report foundation`
2. `feat(report): add task service report endpoints`
3. `feat(report): add service history endpoints and csv export`
4. `feat(report): add task report UI`
5. `feat(report): add service history page`
6. `chore(report): verify service history`

---

# 10. Checklist Final Sebelum Merge ke `main`

- [ ] Semua commit sesi sudah direview.
- [ ] Semua tes manual role lulus.
- [ ] `npm run lint` client lulus.
- [ ] `npm run build` client lulus.
- [ ] `node --check` file server yang berubah lulus.
- [ ] SQL policy/function/migration sudah dijalankan di Supabase dan dicatat.
- [ ] `api-contract.md` sudah diperbarui.
- [ ] `README.md` sudah diperbarui.
- [ ] Tidak ada secret di diff.
- [ ] Tidak ada file `.env` yang ikut ter-commit.
- [ ] Tidak ada perubahan di luar scope empat sesi.
- [ ] Tidak ada push/merge ke `main` tanpa persetujuan.

---

# 11. Changelog

| Versi | Tanggal    | Perubahan                                                                                                                                  |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0   | 2026-10-21 | Rencana awal empat sesi: client management, user management, notifikasi, riwayat servis; stage, RBAC, UI, keamanan, verifikasi, dan commit |
