# Database — RLS, Function, Trigger, Storage

Pendamping [erd.md](erd.md). ERD menjelaskan **bentuk** data; dokumen ini menjelaskan
**aturan dan perilaku** yang hidup di dalam PostgreSQL (Supabase).

Di proyek ini banyak logika bisnis penting justru ada di database, bukan di Express.
Memahami folder [`server/supabase/sql/`](../server/supabase/sql/) adalah kunci memahami proyek ini.

---

## 1. Dua alat, dua tugas: Prisma vs SQL Supabase

| | Prisma (`server/prisma/`) | SQL Supabase (`server/supabase/sql/`) |
|---|---|---|
| Untuk apa | Mendefinisikan **tabel, kolom, relasi, enum, index** | Mendefinisikan **RLS policy, function, trigger, grant, storage policy, realtime** |
| Dijalankan | `prisma migrate` (CLI) | **Manual** copy-paste ke Supabase SQL Editor |
| Dipakai saat runtime? | **Tidak** (hanya tooling/seed) | Ya, otomatis oleh PostgreSQL |

Prisma tidak mengenal RLS dan trigger, jadi bagian itu ditulis manual dalam SQL.
Route/controller **tidak** memakai Prisma karena Prisma terhubung sebagai user database
yang mem-bypass RLS — semua query user harus lewat Supabase client agar RLS berlaku.

---

## 2. Urutan menjalankan SQL di database baru

Kalau membuat project Supabase baru dari nol:

1. `prisma migrate deploy` → membuat tabel & enum.
2. `functions/00_helper_functions.sql` → `get_my_role()`, `get_my_division()` (dipakai semua policy).
3. `functions/01` s/d `05`.
4. `triggers/00` s/d `04`.
5. Aktifkan RLS pada setiap tabel (`ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;`), lalu
   `policies/00` s/d `09`.
6. `grants/00_notifications_grants.sql`.
7. Buat bucket Storage `task_attachments` (private), lalu `storage policy/00_task_attachments_policy.sql`.
8. `realtime/00_notifications_realtime.sql`.
9. File di `migrations/` hanya untuk database lama yang perlu disusul (contoh: kolom `completed_at`).

> Prefix nomor (`00_`, `01_`) = urutan. Function harus ada sebelum trigger/policy yang memanggilnya.

---

## 3. RLS (Row Level Security) — konsep inti

**RLS** = aturan di level tabel yang menentukan **baris mana** yang boleh dibaca/diubah oleh user
yang sedang login. Database tahu siapa user-nya dari JWT yang dikirim (`auth.uid()`).

```sql
-- policies/04_tasks_policy.sql (disederhanakan)
CREATE POLICY "..." ON tasks FOR SELECT TO authenticated
USING (
    get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
    OR (get_my_role() = 'STAFF' AND deleted_at IS NULL)
    OR (get_my_role() = 'TECHNICIAN' AND division_id = get_my_division() AND deleted_at IS NULL)
);
```

Artinya: saat teknisi menjalankan `SELECT * FROM tasks`, PostgreSQL diam-diam menambahkan
`WHERE division_id = <divisi teknisi> AND deleted_at IS NULL`. Kode Express **tidak perlu**
menulis filter itu — dan tidak bisa lupa.

| Klausa | Kapan dicek |
|---|---|
| `USING (...)` | Baris mana yang **terlihat** (SELECT) / boleh **disentuh** (UPDATE, DELETE) |
| `WITH CHECK (...)` | Baris hasil INSERT/UPDATE harus **memenuhi** syarat ini |

Akibat penting: data yang tidak boleh dilihat **tidak error**, tapi **tidak muncul**. Karena itu
banyak controller mengembalikan `404 "not found or accessible"` — task-nya mungkin ada, tetapi
tidak terlihat oleh user tersebut.

### Helper `get_my_role()` dan `get_my_division()`

Keduanya `SECURITY DEFINER`: berjalan dengan hak pembuat function sehingga bisa membaca tabel
`users` tanpa terhalang RLS `users` sendiri (menghindari rekursi policy). Keduanya juga memakai
`SET search_path = public` agar tidak bisa dibajak lewat objek bernama sama di schema lain.

Keduanya mengembalikan `NULL` untuk user yang **nonaktif atau diarsip**, sehingga setiap policy
yang membandingkan `get_my_role() = '...'` otomatis menolak user itu, walaupun JWT-nya masih
berlaku. Satu-satunya pengecualian: policy SELECT `users` mengizinkan user membaca baris miliknya
sendiri, agar `attachProfile` bisa membalas 403 `"Account is inactive"`.

Akun Auth baru dibuat trigger `handle_new_auth_user` dengan `is_active = FALSE`; `POST /api/users`
yang mengaktifkannya. Jadi pendaftaran mandiri lewat anon key tidak mendapat akses data. Tetap
matikan "Allow new users to sign up" di Supabase Dashboard.

### Pola "scope = tasks"

Tabel anak (`task_assignments`, `task_status_history`, `task_attachments`, `service_reports`) tidak
punya `division_id`. Policy-nya memakai `EXISTS (SELECT 1 FROM tasks WHERE tasks.id = ... AND <aturan task>)`
— "kamu boleh lihat lampiran kalau kamu boleh lihat task-nya".

Matriks hak akses lengkap per tabel: [RBAC.md](RBAC.md).

---

## 4. Trigger — pembatasan kolom

RLS bekerja per **baris**, tidak per **kolom**. Untuk aturan "STAFF hanya boleh ubah `priority`
dan `due_date`" dipakai trigger `BEFORE UPDATE`:

```sql
-- functions/01_trigger_functions.sql (inti)
IF get_my_role() = 'STAFF'
AND to_jsonb(OLD.*) - allowed_columns_staff <> to_jsonb(NEW.*) - allowed_columns_staff THEN
    RAISE EXCEPTION 'STAFF only update priority and due_date of the task';
END IF;
```

Triknya: ubah baris lama & baru menjadi JSON, buang kolom yang diizinkan, lalu bandingkan.
Kalau masih ada perbedaan → ada kolom terlarang yang diubah → tolak. Error ini sampai ke Express
sebagai kode `P0001` dan diterjemahkan menjadi `403`.

| Trigger | Tabel / waktu | Fungsi |
|---|---|---|
| `enforce_task_column_restrictions` | `tasks` BEFORE UPDATE | Batasi kolom per role + isi `completed_at` otomatis |
| `enforce_user_column_restrictions` | `users` BEFORE UPDATE | User biasa hanya boleh ubah `name`/`email` miliknya |
| `on_auth_user_created` | `auth.users` AFTER INSERT | Buat baris `public.users` (role default `TECHNICIAN`) |
| `insert_notification_on_task_assignment` | `task_assignments` AFTER INSERT | Notifikasi `ASSIGNMENT` ke teknisi |
| `insert_notification_on_task_status_change` | `task_status_history` AFTER INSERT | Notifikasi `STATUS_CHANGE` ke teknisi yang ditugaskan + manager divisi + pengubah |
| `set_tasks_updated_at` | `tasks`, `users` BEFORE UPDATE | Perbarui `updated_at` |

Function notifikasi memakai `SECURITY DEFINER` karena user biasa tidak punya izin INSERT ke
`notifications` — hanya trigger yang boleh.

---

## 5. Function / RPC

RPC = function PostgreSQL yang dipanggil dari aplikasi: `req.supabase.rpc("nama", { args })`.

### `update_task_status(p_task_id, p_new_status)`

Kenapa status tidak diubah dengan `UPDATE` biasa? Karena ada **dua** penulisan yang harus terjadi
bersamaan: ubah `tasks.status` **dan** tambah baris `task_status_history`. Di dalam satu function,
keduanya berada dalam **satu transaksi** — kalau salah satu gagal, dua-duanya batal.

```
SELECT status ... FOR UPDATE   ← kunci baris, cegah dua orang mengubah bersamaan
IF sama → RAISE 'SAME_STATUS'
UPDATE tasks SET status = ...
INSERT INTO task_status_history (...)
   └─ trigger → INSERT notifications
```

`SECURITY INVOKER` = berjalan dengan hak user pemanggil, jadi RLS & trigger kolom tetap berlaku.

### `get_dashboard_summary()`

Menghitung semua angka dashboard (per status, per divisi, per teknisi, overdue, unassigned) dalam
satu query dan mengembalikan JSON. Karena `SECURITY INVOKER`, angka otomatis mengikuti scope role:
teknisi hanya menghitung task divisinya.

---

## 6. Grant (izin kolom)

`grants/00_notifications_grants.sql`:

```sql
REVOKE UPDATE ON notifications FROM authenticated;
GRANT UPDATE (is_read) ON notifications TO authenticated;
```

Cara lain membatasi kolom selain trigger: izin di level kolom. User hanya bisa mengubah `is_read`.
Ini lebih sederhana daripada trigger — cocok jika aturannya sama untuk semua role.

---

## 7. Storage (file lampiran)

- Bucket `task_attachments` (private). Path file: `<task_id>/<timestamp>-<nama_file>`.
- Policy di `storage.objects` membaca folder pertama (`storage.foldername(name))[1]` = `task_id`)
  lalu memakai aturan yang sama dengan tabel `tasks`.
- Alur upload (lihat [architecture.md](architecture.md#5-alur-upload-lampiran)): browser upload
  langsung ke Storage → lalu memanggil API untuk menyimpan metadata. Jika simpan metadata gagal,
  server menghapus file agar tidak jadi "file yatim".
- Saat membaca, server membuat **signed URL** (berlaku sementara) — file tidak pernah publik.

---

## 8. Realtime

`realtime/00_notifications_realtime.sql` memasukkan tabel `notifications` ke publikasi
`supabase_realtime`. Browser berlangganan perubahan
([`useNotificationRealtime.js`](../client/src/hooks/useNotificationRealtime.js)); RLS tetap
berlaku sehingga user hanya menerima event miliknya. Saat event masuk, UI **mengambil ulang** data
lewat API (payload event tidak dipakai langsung). Ada juga polling sebagai cadangan.

---

## 9. Kode error PostgreSQL yang sering muncul

Controller menerjemahkan kode ini menjadi status HTTP:

| Kode | Arti | HTTP |
|---|---|---|
| `23505` | Unique violation (contoh: teknisi sudah di-assign) | 409 |
| `23503` | Foreign key tidak valid (ID tidak ada) | 400 |
| `23502` | Kolom wajib bernilai null | 400 |
| `22P02` | Format nilai salah (enum/UUID tidak valid) | 400 |
| `22007` / `22008` | Format tanggal salah | 400 |
| `42501` | Ditolak RLS / tidak punya izin | 403 |
| `P0001` | `RAISE EXCEPTION` dari trigger/function | 403/400 |
| `PGRST116` | (PostgREST) `.single()` tidak menemukan baris | 404 |

---

## 10. Catatan penting: Express bukan satu-satunya pintu

Browser memegang `SUPABASE_ANON_KEY` + JWT user (dipakai untuk login, upload, realtime). Artinya
user yang paham teknis **bisa memanggil database langsung** lewat Supabase REST API tanpa melewati
Express. Yang melindungi data saat itu **hanya RLS, trigger, dan grant**.

Konsekuensinya, validasi yang hanya ada di controller bisa dilewati. Contoh nyata di proyek ini:

| Aturan | Dicek di Express | Dicek di DB |
|---|---|---|
| Assignee harus teknisi aktif di divisi yang sama | ✓ | ✓ (policy `task_assignments`) — **bagus** |
| Service report hanya untuk task `COMPLETED` | ✓ | ✗ |
| `snapshot_data` dibuat server | ✓ | ✗ |
| `created_by_id` = user yang login | ✓ (diisi server) | ✗ |
| Riwayat status hanya dibuat lewat RPC | ✓ | ✗ (teknisi bisa INSERT langsung) |

Ini dibahas sebagai prioritas di [roadmap.md](roadmap.md). Prinsip yang bisa dibawa ke proyek lain:
**aturan keamanan & integritas data harus ada di lapisan yang tidak bisa dilewati.**
