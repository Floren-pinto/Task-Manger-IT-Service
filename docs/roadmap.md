# Status MVP & Roadmap Improvement

Penilaian per **27 Oktober 2026** berdasarkan kode di branch `main` dan [srs.md](srs.md).
Perbarui dokumen ini setiap kali satu item selesai.

---

## 1. Apakah sudah MVP?

**Ya — untuk kebutuhan "Must" inti, aplikasi sudah layak disebut MVP.** Alur utama bisnis sudah
jalan dari awal sampai akhir:

> Client dibuat → task dibuat & ditugaskan ke teknisi → teknisi mengubah status & mengunggah bukti →
> notifikasi terkirim real-time → task selesai → laporan servis immutable → riwayat servis & export CSV → dashboard.

Yang membuatnya lebih dari sekadar CRUD: otorisasi berbasis RLS, audit trail, snapshot laporan,
pembatasan kolom per role lewat trigger, dan realtime.

### Cakupan kebutuhan fungsional (SRS)

| FR | Kebutuhan | Prioritas | Status |
|---|---|:---:|:---:|
| FR-01 | Login email & password | Must | ✅ |
| FR-02, 04 | Role & RBAC | Must | ✅ |
| FR-03 | Kelola akun user | Must | ✅ |
| FR-05 | Reset password via email | Should | ⚠️ admin bisa kirim email reset, tetapi belum ada halaman "atur password baru" (link diarahkan ke `/login`) — perlu dicek |
| FR-06 | Log aktivitas login | Could | ❌ |
| FR-10 | Pengelompokan divisi | Must | ✅ (halaman `/divisions` masih placeholder) |
| FR-11 | Membentuk tim | Should | ❌ tabel ada, API/UI belum |
| FR-12 | Anggota tim + workload | **Must** | ⚠️ workload per teknisi ada di dashboard; tampilan per tim belum |
| FR-13 | Pindah divisi | Could | ✅ lewat edit user |
| FR-20, 21, 26, 27 | Buat, assign, kaitkan client/asset, cari & filter task | Must | ✅ |
| FR-22 | Status baku | Must | ✅ (status "Ditugaskan" tidak ada di enum — ditampilkan dari ada/tidaknya assignment) |
| FR-23 | Teknisi ubah status + lampiran | Must | ✅ |
| FR-24 | Kalender jadwal | Should | ❌ |
| FR-25 | Sub-tugas / checklist | Could | ❌ |
| FR-30 | Timeline perubahan status | Must | ✅ |
| FR-31 | Dashboard real-time | **Must** | ⚠️ realtime baru untuk notifikasi; dashboard perlu refresh |
| FR-32 | Notifikasi assign, status, **tenggat** | Should | ⚠️ tenggat (`DEADLINE_REMINDER`) belum |
| FR-40, 41 | Riwayat servis + filter | Must | ✅ |
| FR-42 | Export PDF/CSV | Should | ⚠️ CSV ✅, PDF ❌ |
| FR-50, 51 | Data client & asset | Must/Should | ✅ |
| FR-60 | Ringkasan per status/divisi/teknisi | Must | ✅ |
| FR-61 | Performa teknisi (rata-rata waktu selesai) | Should | ❌ (data `completed_at` sudah ada) |
| FR-62, 63 | Laporan periodik, grafik tren | Should/Could | ❌ |

Dua "Must" yang belum penuh: **FR-12** (tim) dan **FR-31** (dashboard realtime).

---

## 2. Roadmap

Diurutkan berdasarkan **nilai belajar + risiko**. Fase 1 sebaiknya dikerjakan sebelum menambah fitur baru,
karena fitur baru di atas fondasi yang belum diuji akan makin sulit dirawat.

### Fase 1 — Kokohkan fondasi (sebelum fitur baru)

| # | Item | Kenapa | Pelajaran |
|---|---|---|---|
| 1.1 | ✅ **Pindahkan aturan bisnis penting ke database.** Policy INSERT `service_reports` cek `tasks.status = 'COMPLETED'` dan `created_by_id = auth.uid()`; policy INSERT `task_status_history` cek `user_id = auth.uid()` (atau cabut INSERT langsung dan jadikan RPC `SECURITY DEFINER`). | Browser memegang anon key + JWT, jadi aturan yang hanya ada di Express bisa dilewati (lihat [database.md §10](database.md#10-catatan-penting-express-bukan-satu-satunya-pintu)). | Keamanan berlapis, threat modeling |
| 1.2 | ⚠️ (Vitest: unit test helper + integration test API/RLS per role sudah ada, lihat [testing.md](testing.md); CI belum) **Test otomatis.** Mulai dari test RLS (login sebagai tiap role, pastikan baris yang terlihat benar) lalu test endpoint dengan Vitest + Supertest. | Belum ada test sama sekali; setiap perubahan policy berisiko diam-diam membuka/menutup akses. | Testing, CI |
| 1.3 | **Validasi input dengan skema** (contoh: zod) di controller. | Validasi saat ini manual dan tidak seragam antar controller. | Schema validation |
| 1.4 | **Aturan transisi status.** Saat ini semua perpindahan boleh (mis. `CANCELLED` → `IN_PROGRESS`, `COMPLETED` → `PENDING`). Tentukan state machine dan tegakkan di `update_task_status`. | Integritas data riwayat & laporan. | State machine |
| 1.5 | **Pesan error berbahasa Indonesia.** Server mengirim pesan Inggris dan client menampilkannya apa adanya (`err.response.data.message`). Pilih: server berbahasa Indonesia, atau server kirim `code` dan client memetakan ke teks. | Aturan proyek: teks UI Bahasa Indonesia. | Error contract, i18n |
| 1.6 | ⚠️ (sanitize, pagination, dan nama trigger sudah; tinggal cabang MANAGER) **Rapikan duplikasi kecil.** `listTasks` punya `sanitizeSearch` & hitung pagination sendiri padahal ada `utils/queryParams.js`; trigger `updated_at` di tabel `users` bernama `set_tasks_updated_at`; cabang `MANAGER_DIVISION` di `enforce_user_column_restrictions` sudah tidak terjangkau karena policy. | Kode lebih mudah dibaca. | Refactoring |
| 1.7 | **README instalasi** + `.env.example` di `server/` dan `client/` (tanpa nilai rahasia) + urutan SQL ([database.md §2](database.md#2-urutan-menjalankan-sql-di-database-baru)). | Orang lain (atau kamu 6 bulan lagi) bisa menjalankan proyek dari nol. | Dokumentasi |

### Fase 2 — Lengkapi "Must" & "Should" yang tersisa

| # | Item | FR |
|---|---|---|
| 2.1 | Unassign teknisi (`DELETE /api/tasks/:taskId/assignments/:assignmentId`) | FR-21 |
| 2.2 | Halaman Divisions + Teams (API & UI, workload per anggota) | FR-11, FR-12 |
| 2.3 | Dashboard realtime: langganan perubahan `tasks` lalu `refetch` ringkasan | FR-31 |
| 2.4 | Halaman "atur password baru" (event `PASSWORD_RECOVERY` Supabase) + link "Lupa password" di login | FR-05 |
| 2.5 | Pengingat tenggat: job terjadwal (`pg_cron` di Supabase) yang membuat notifikasi `DEADLINE_REMINDER` | FR-32 |
| 2.6 | Laporan performa teknisi: jumlah selesai & rata-rata `completed_at - created_at` | FR-61 |
| 2.7 | Export PDF laporan servis | FR-42 |

### Fase 3 — Siap produksi (deployment)

| # | Item |
|---|---|
| 3.1 | CORS allowlist (sudah ada `TODO` di `app.js`), `helmet`, rate limiting di endpoint login/umum |
| 3.2 | Logger terstruktur (pino) menggantikan `console.error` |
| 3.3 | Deploy: client ke Vercel/Netlify, server ke Render/Railway/Fly, dengan env terpisah dev/prod |
| 3.4 | CI di GitHub Actions: lint + build + test pada setiap PR |
| 3.5 | Migrasi SQL Supabase yang terkelola (Supabase CLI `supabase/migrations`) menggantikan copy-paste manual |
| 3.6 | Pembersihan berkala file Storage yang tidak punya baris `task_attachments` |
| 3.7 | ✅ (dashboard, filter tanggal, export CSV, dan tampilan client memakai WIB) Perhatikan zona waktu: `current_date` di `get_dashboard_summary()` memakai zona waktu database (UTC), sehingga "selesai hari ini"/"overdue" bisa bergeser untuk WIB/WITA |

### Fase 4 — Pengembangan lanjutan (opsional, untuk belajar hal baru)

- Kalender kunjungan (FR-24) dan checklist per task (FR-25).
- Grafik tren task masuk vs selesai (FR-63) — latihan library chart.
- Portal status untuk pelanggan dengan tautan terbatas (FR-33) — latihan token akses terbatas.
- Sparepart & biaya per servis (FR-43) — latihan desain tabel baru di ERD.
- Migrasi ke TypeScript bertahap, atau React Query untuk caching data — bandingkan dengan pola `useApiData` + event bus sekarang.

---

## 3. Rekomendasi langkah berikutnya

Kerjakan **1.1 → 1.2 → 2.1** lebih dulu:

- **1.1** paling berdampak pada keamanan dan memperdalam pemahaman RLS.
- **1.2** membuat semua perubahan setelahnya lebih aman — mulai kecil, satu file test per tabel.
- **2.1** fitur kecil yang menyentuh semua lapisan; latihan yang bagus untuk memastikan kamu bisa
  membangun fitur sendiri dari ujung ke ujung (lihat [learning-guide.md Tahap 6](learning-guide.md#tahap-6--bangun-sesuatu-sendiri)).
