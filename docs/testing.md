# Testing

Ada dua jenis test otomatis. Keduanya memakai [Vitest](https://vitest.dev).

| Jenis | Perintah | Butuh database? | Menguji |
|---|---|---|---|
| Unit test | `npm test` (root) | Tidak | Helper murni: validasi input, pagination & search, zona waktu, CSV, path lampiran (server); `parseDbDate`, nama file aman, pesan error (client) |
| Integration test | `npm run test:integration` (root) | Ya, **project Supabase khusus test** | API sungguhan + RLS + trigger + RPC per role |

## Kenapa integration test penting di proyek ini

Aturan akses yang paling penting ada di database (RLS, trigger, RPC), bukan di JavaScript. Unit test
dengan Supabase tiruan (mock) tidak menyentuh RLS, jadi bisa lolos padahal di database aslinya
STAFF masih bisa mengarsip asset. Integration test login sebagai tiap role dan memanggil API **serta**
Supabase langsung (seperti yang bisa dilakukan siapa pun yang memegang anon key), lalu memastikan
hasilnya sesuai [RBAC.md](RBAC.md).

## Unit test

```bash
npm test
```

- Server: `server/tests/unit/*.test.js`
- Client: `client/src/**/*.test.js` (di sebelah file yang dites)

Tidak butuh `.env`. Tambahkan test baru setiap kali membuat helper murni (fungsi tanpa akses
database/network).

## Integration test

### 1. Siapkan project Supabase test (sekali saja)

> **Jangan pakai project production.** Test membuat client, asset, task, laporan, dan akun
> sementara. Data uji di-soft delete setelah test, tetapi barisnya tetap ada.

1. Buat project Supabase baru (free tier cukup).
2. Buat skema dan jalankan SQL sesuai [database.md §2](database.md#2-urutan-menjalankan-sql-di-database-baru).
   Untuk langkah `prisma migrate deploy`, arahkan Prisma ke project test lewat `LOCAL_DB_URL`
   (connection string dari Supabase → Project Settings → Database):

   ```bash
   cd server
   LOCAL_DB_URL="<connection string project test>" npx prisma migrate deploy
   ```

3. Buat minimal satu divisi (SQL editor project test):

   ```sql
   insert into divisions (id, name, description, created_at, updated_at)
   values (gen_random_uuid()::text, 'Jaringan', 'Divisi uji', now(), now());
   ```

4. Buat empat akun di Authentication → Users → *Add user* (centang auto confirm), lalu atur
   role-nya. Akun baru dibuat nonaktif oleh trigger, jadi aktifkan sekaligus:

   ```sql
   update users set role = 'SUPER_ADMIN', is_active = true, division_id = null
   where email = 'admin@test.local';

   update users set role = 'MANAGER_DIVISION', is_active = true,
     division_id = (select id from divisions where name = 'Jaringan')
   where email = 'manager@test.local';

   update users set role = 'STAFF', is_active = true, division_id = null
   where email = 'staff@test.local';

   update users set role = 'TECHNICIAN', is_active = true,
     division_id = (select id from divisions where name = 'Jaringan')
   where email = 'teknisi@test.local';
   ```

   TECHNICIAN wajib punya divisi. MANAGER_DIVISION sebaiknya di divisi yang sama agar test
   notifikasi status ikut berjalan (kalau beda divisi, test itu dilewati).

### 2. Isi `server/.env.test`

Salin [`server/tests/integration/env.test.example`](../server/tests/integration/env.test.example)
menjadi `server/.env.test` (sudah di-ignore git) lalu isi URL, anon key, dan akun di atas.

Pengaman yang sudah ada di [`testEnv.js`](../server/tests/integration/testEnv.js):

- Test hanya berjalan bila `TEST_TARGET_IS_TEST_PROJECT=yes`; bila file/variabel belum lengkap,
  seluruh integration test **dilewati** (bukan gagal).
- Test **menolak berjalan** bila `SUPABASE_PROJECT_URL` di `.env.test` sama dengan di `server/.env`.
- Semua variabel Supabase diambil dari `.env.test`; nilai dari `server/.env` tidak pernah ikut terpakai.
- `SUPABASE_SERVICE_ROLE_KEY` opsional: tanpa itu skenario akun nonaktif (butuh `POST /api/users`) dilewati.

### 3. Jalankan

```bash
npm run test:integration
```

Yang diuji (lihat `server/tests/integration/`):

| File | Skenario |
|---|---|
| `rbac.test.js` | Request tanpa token ditolak · STAFF membuat client/asset · validasi field kosong · TECHNICIAN tidak bisa membuat asset (API & RLS langsung) · STAFF tidak bisa mengarsip asset, MANAGER bisa · TECHNICIAN tidak bisa membuat task · asset harus milik client task · `created_by_id` tidak bisa dipalsukan · assignment + notifikasi · STAFF tidak bisa mengubah status · status lewat RPC, status sama ditolak · `UPDATE status` langsung & riwayat palsu ditolak · laporan hanya untuk task `COMPLETED` · riwayat atas nama teknisi · notifikasi status tidak ke pelaku, ke manager divisi · laporan dengan pembuat palsu ditolak · filter teknisi di riwayat servis & export |
| `inactiveAccount.test.js` | Akun dari SUPER_ADMIN langsung aktif · setelah dinonaktifkan: `/auth/me` 403 dan query langsung ke `clients`, `assets`, `tasks`, `divisions` mengembalikan 0 baris |

## Yang belum diotomasi

Perilaku yang hanya terlihat di browser masih dicek manual (atau nanti dengan Playwright):
refresh `/users`, dialog konfirmasi, tombol hapus lampiran di layar sentuh, alur email reset
password, dan tampilan jam lokal.
