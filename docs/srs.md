# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## TASK MANAGER FOR IT SERVICE
**Sistem Manajemen Tugas untuk Perusahaan Penyedia Jasa**  
*Divisi Jaringan & Divisi Perbaikan Komputer*

---

### Informasi Dokumen

| Parameter | Detail |
| :--- | :--- |
| **Nomor Dokumen** | SRS-TM-IT-001 |
| **Versi** | 1.0 |
| **Tanggal** | 17 Agustus 2026 |
| **Disusun oleh** | Senior Developer & Project Architect |
| **Status** | Draft untuk Review |
| **Teknologi** | Vite, React, Express, Supabase |

---

## Daftar Isi
1. [Pendahuluan](#1-pendahuluan)
   - 1.1 [Tujuan Dokumen](#11-tujuan-dokumen)
   - 1.2 [Ruang Lingkup Produk](#12-ruang-lingkup-produk)
   - 1.3 [Definisi, Akronim, dan Singkatan](#13-definisi-akronim-dan-singkatan)
   - 1.4 [Referensi](#14-referensi)
   - 1.5 [Ikhtisar Dokumen](#15-ikhtisar-dokumen)
2. [Deskripsi Umum](#2-deskripsi-umum)
   - 2.1 [Perspektif Produk](#21-perspektif-produk)
   - 2.2 [Fungsi Produk (Ringkasan)](#22-fungsi-produk-ringkasan)
   - 2.3 [Karakteristik Pengguna](#23-karakteristik-pengguna)
   - 2.4 [Batasan (Constraints)](#24-batasan-constraints)
   - 2.5 [Asumsi dan Ketergantungan](#25-asumsi-dan-ketergantungan)
3. [Kebutuhan Fungsional (Functional Requirements)](#3-kebutuhan-fungsional-functional-requirements)
   - 3.1 [Manajemen Pengguna & Autentikasi](#31-manajemen-pengguna--autentikasi)
   - 3.2 [Manajemen Divisi & Tim](#32-manajemen-divisi--tim)
   - 3.3 [Manajemen Tugas (Task Management)](#33-manajemen-tugas-task-management)
   - 3.4 [Transparansi Status & Notifikasi](#34-transparansi-status--notifikasi)
   - 3.5 [Riwayat Servis (Service History)](#35-riwayat-servis-service-history)
   - 3.6 [Manajemen Pelanggan (Client Management)](#36-manajemen-pelanggan-client-management)
   - 3.7 [Dashboard & Pelaporan](#37-dashboard--pelaporan)
4. [Kebutuhan Non-Fungsional (Non-Functional Requirements)](#4-kebutuhan-non-fungsional-non-functional-requirements)
5. [Arsitektur & Teknologi Sistem](#5-arsitektur--teknologi-sistem)
   - 5.1 [Gambaran Arsitektur](#51-gambaran-arsitektur)
   - 5.2 [Komponen Teknologi](#52-komponen-teknologi)
   - 5.3 [Lingkungan Deployment](#53-lingkungan-deployment)
6. [Model Data (Entitas Utama)](#6-model-data-entitas-utama)
7. [Daftar Fitur Aplikasi](#7-daftar-fitur-aplikasi)
   - 7.1 [Modul Pengguna & Keamanan](#71-modul-pengguna--keamanan)
   - 7.2 [Modul Tugas](#72-modul-tugas)
   - 7.3 [Modul Tim & Divisi](#73-modul-tim--divisi)
   - 7.4 [Modul Pelanggan & Riwayat Servis](#74-modul-pelanggan--riwayat-servis)
   - 7.5 [Modul Dashboard & Laporan](#75-modul-dashboard--laporan)
   - 7.6 [Modul Notifikasi](#76-modul-notifikasi)
8. [Kebutuhan Lain (Other Requirements)](#8-kebutuhan-lain-other-requirements)
9. [Lampiran - Matriks Hak Akses (Role Matrix)](#9-lampiran--matriks-hak-akses-role-matrix)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini bertujuan untuk mendefinisikan kebutuhan perangkat lunak (Software Requirements Specification) untuk aplikasi **Task Manager** yang digunakan oleh perusahaan penyedia jasa IT dengan dua divisi utama, yaitu **Divisi Jaringan** dan **Divisi Perbaikan Komputer**. Dokumen ini menjadi acuan bagi tim pengembang, project architect, dan pemangku kepentingan dalam proses perancangan, pengembangan, dan pengujian sistem.

### 1.2 Ruang Lingkup Produk
Task Manager for IT Service adalah aplikasi berbasis web yang digunakan untuk:
- Mengelola dan mendistribusikan tugas servis ke teknisi di dua divisi (Jaringan dan Perbaikan Komputer).
- Memberikan transparansi status pekerjaan secara real-time kepada manajemen maupun teknisi.
- Menyimpan riwayat servis setiap pelanggan/aset sebagai basis data historis.
- Mendukung manajemen tim, beban kerja, dan performa teknisi.
- Menyediakan dashboard dan pelaporan untuk pengambilan keputusan manajerial.

*Catatan:* Sistem tidak mencakup modul akuntansi/keuangan penuh (invoicing, payroll), namun dapat diintegrasikan pada tahap pengembangan lanjutan.

### 1.3 Definisi, Akronim, dan Singkatan

| Istilah | Definisi |
| :--- | :--- |
| **SRS** | Software Requirements Specification |
| **FR** | Functional Requirement (Kebutuhan Fungsional) |
| **NFR** | Non-Functional Requirement (Kebutuhan Non-Fungsional) |
| **RLS** | Row Level Security - mekanisme keamanan tingkat baris pada database Supabase |
| **Teknisi** | Anggota tim divisi Jaringan atau Perbaikan Komputer yang mengerjakan tugas lapangan |
| **SLA** | Service Level Agreement - kesepakatan tingkat layanan dengan pelanggan |
| **Realtime** | Pembaruan data secara langsung tanpa perlu memuat ulang halaman |

### 1.4 Referensi
- Dokumentasi resmi Vite - [https://vitejs.dev](https://vitejs.dev)
- Dokumentasi resmi React - [https://react.dev](https://react.dev)
- Dokumentasi resmi Express.js - [https://expressjs.com](https://expressjs.com)
- Dokumentasi resmi Supabase - [https://supabase.com/docs](https://supabase.com/docs)
- Standar IEEE 830 sebagai kerangka acuan format SRS

### 1.5 Ikhtisar Dokumen
Bagian 2 menjelaskan gambaran umum produk. Bagian 3 memuat kebutuhan fungsional per modul. Bagian 4 memuat kebutuhan non-fungsional. Bagian 5 menjelaskan arsitektur teknologi. Bagian 6 memuat model data. Bagian 7 merangkum daftar fitur aplikasi secara menyeluruh. Bagian 8 memuat kebutuhan lain-lain, dan Bagian 9 memuat lampiran matriks peran.

---

## 2. Deskripsi Umum

### 2.1 Perspektif Produk
Task Manager for IT Service merupakan sistem baru yang dikembangkan secara mandiri (bukan turunan sistem lain) untuk menggantikan proses pencatatan tugas manual (spreadsheet/WhatsApp) menjadi sistem terpusat berbasis web. Sistem terdiri dari aplikasi frontend (Single Page Application) dan backend API yang terhubung ke layanan basis data serta autentikasi Supabase.

### 2.2 Fungsi Produk (Ringkasan)
- Pembuatan, penugasan, dan pelacakan tugas servis.
- Manajemen status tugas secara transparan dan real-time.
- Pencatatan dan pencarian riwayat servis pelanggan.
- Manajemen tim, divisi, dan beban kerja teknisi.
- Dashboard analitik dan pelaporan performa.

### 2.3 Karakteristik Pengguna

| Peran | Deskripsi |
| :--- | :--- |
| **Super Admin** | Mengelola seluruh konfigurasi sistem, pengguna, dan hak akses. |
| **Manager Divisi** | Membuat & menugaskan tugas, memantau tim, dan melihat laporan divisinya. |
| **Teknisi** | Menerima tugas, memperbarui status pekerjaan, dan mengunggah bukti pekerjaan. |
| **Staf Admin/CS** | Mengelola data pelanggan, menjadwalkan permintaan servis, dan berkomunikasi dengan pelanggan. |

### 2.4 Batasan (Constraints)
- Sistem wajib dibangun menggunakan Vite + React (frontend), Express.js (backend/API), dan Supabase (database, autentikasi, storage, realtime).
- Aplikasi harus dapat diakses melalui browser desktop maupun mobile.
- Anggaran dan jadwal pengembangan mengikuti kesepakatan proyek internal perusahaan.

### 2.5 Asumsi dan Ketergantungan
- Pengguna memiliki koneksi internet yang stabil saat menggunakan sistem.
- Layanan Supabase tersedia dan digunakan sebagai Backend-as-a-Service utama.
- Perusahaan menyediakan data awal pengguna, divisi, dan pelanggan untuk proses migrasi/setup.

---

## 3. Kebutuhan Fungsional (Functional Requirements)

*Prioritas diukur menggunakan skala MoSCoW: Must (wajib ada), Should (sebaiknya ada), Could (nilai tambah).*

### 3.1 Manajemen Pengguna & Autentikasi

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-01** | Sistem menyediakan login menggunakan email & password melalui Supabase Auth. | Must |
| **FR-02** | Sistem mendukung role pengguna: Super Admin, Manager Divisi, Teknisi, dan Staf Admin/CS. | Must |
| **FR-03** | Admin dapat menambah, mengedit, menonaktifkan, dan menghapus akun pengguna. | Must |
| **FR-04** | Sistem membatasi akses fitur berdasarkan role (Role-Based Access Control). | Must |
| **FR-05** | Pengguna dapat melakukan reset password via email. | Should |
| **FR-06** | Sistem mencatat log aktivitas login (audit trail sederhana). | Could |

### 3.2 Manajemen Divisi & Tim

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-10** | Sistem mendukung pengelompokan pengguna ke dalam dua divisi: Jaringan dan Perbaikan Komputer. | Must |
| **FR-11** | Manager dapat membentuk tim/regu kerja lintas anggota dalam satu divisi. | Should |
| **FR-12** | Sistem menampilkan daftar anggota tim beserta beban tugas (workload) masing-masing. | Must |
| **FR-13** | Admin dapat memindahkan anggota antar divisi. | Could |

### 3.3 Manajemen Tugas (Task Management)

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-20** | Admin/Manager dapat membuat tugas baru dengan judul, deskripsi, divisi, prioritas, tenggat waktu, dan lokasi/lampiran. | Must |
| **FR-21** | Tugas dapat ditetapkan (assign) ke satu atau beberapa teknisi. | Must |
| **FR-22** | Sistem menyediakan status tugas baku: Baru, Ditugaskan, Dikerjakan, Menunggu Sparepart, Selesai, Dibatalkan. | Must |
| **FR-23** | Teknisi dapat mengubah status tugas dan menambahkan catatan progres beserta foto/lampiran. | Must |
| **FR-24** | Sistem mendukung penjadwalan tugas (kalender kunjungan/service). | Should |
| **FR-25** | Sistem mendukung sub-tugas atau checklist langkah kerja per tugas. | Could |
| **FR-26** | Tugas dapat dikaitkan dengan data pelanggan (client) dan aset terkait. | Must |
| **FR-27** | Sistem mendukung pencarian dan filter tugas (status, divisi, teknisi, tanggal, prioritas). | Must |

### 3.4 Transparansi Status & Notifikasi

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-30** | Setiap perubahan status tugas tercatat dengan waktu dan nama pengguna yang mengubah (timeline log). | Must |
| **FR-31** | Dashboard menampilkan status tugas secara real-time menggunakan Supabase Realtime. | Must |
| **FR-32** | Sistem mengirim notifikasi in-app saat tugas ditugaskan, status berubah, atau mendekati tenggat waktu. | Should |
| **FR-33** | Pelanggan (opsional) dapat melihat status pekerjaan miliknya melalui tautan/portal terbatas. | Could |

### 3.5 Riwayat Servis (Service History)

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-40** | Sistem menyimpan riwayat lengkap seluruh tugas yang telah selesai per pelanggan/aset. | Must |
| **FR-41** | Riwayat servis dapat difilter berdasarkan pelanggan, jenis perangkat, divisi, dan rentang tanggal. | Must |
| **FR-42** | Sistem dapat mengekspor riwayat servis ke format PDF/CSV untuk keperluan laporan ke pelanggan. | Should |
| **FR-43** | Riwayat mencatat sparepart/komponen yang digunakan dan biaya (jika ada modul biaya). | Could |

### 3.6 Manajemen Pelanggan (Client Management)

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-50** | Sistem menyimpan data pelanggan: nama, kontak, alamat, dan jenis layanan berlangganan. | Must |
| **FR-51** | Sistem menyimpan data aset pelanggan (perangkat jaringan, komputer/PC) yang pernah ditangani. | Should |
| **FR-52** | Sistem menampilkan riwayat kontrak/SLA per pelanggan (jika berlaku). | Could |

### 3.7 Dashboard & Pelaporan

| ID | Deskripsi Kebutuhan | Prioritas |
| :--- | :--- | :---: |
| **FR-60** | Dashboard menampilkan ringkasan jumlah tugas per status, per divisi, dan per teknisi. | Must |
| **FR-61** | Sistem menyediakan laporan performa teknisi (jumlah tugas selesai, rata-rata waktu penyelesaian). | Should |
| **FR-62** | Sistem menyediakan laporan periodik (mingguan/bulanan) yang dapat diunduh. | Should |
| **FR-63** | Manager dapat melihat grafik tren jumlah tugas masuk vs selesai. | Could |

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

| Kategori | Deskripsi Kebutuhan |
| :--- | :--- |
| **Performa** | Waktu muat halaman utama < 2 detik pada koneksi standar; API merespons < 500ms untuk operasi umum. |
| **Keamanan** | Autentikasi & otorisasi via Supabase Auth (JWT); Row Level Security (RLS) aktif di seluruh tabel sensitif; data dienkripsi in-transit (HTTPS/TLS). |
| **Skalabilitas** | Arsitektur backend Express bersifat stateless agar mudah di-scale horizontal; database Supabase (PostgreSQL) mendukung pertumbuhan data multi-tahun. |
| **Ketersediaan (Availability)** | Target uptime sistem minimal 99% di luar jadwal maintenance. |
| **Usability** | Antarmuka responsif (mobile-friendly) karena teknisi lapangan mengakses dari perangkat mobile. |
| **Maintainability** | Kode terstruktur modular (React component-based, Express layered architecture) dan terdokumentasi. |
| **Portabilitas** | Frontend berbasis Vite dapat di-build sebagai PWA agar dapat diakses offline-first (opsional). |
| **Auditability** | Seluruh perubahan data tugas & status memiliki jejak audit (siapa, kapan, apa). |
| **Kompatibilitas Browser** | Mendukung browser modern: Chrome, Edge, Firefox, Safari versi dua tahun terakhir. |
| **Backup & Recovery** | Backup database otomatis harian (memanfaatkan fitur backup Supabase) dengan retensi minimal 30 hari. |

---

## 5. Arsitektur & Teknologi Sistem

### 5.1 Gambaran Arsitektur
Sistem menggunakan arsitektur client-server tiga lapis (three-tier):
1. **Frontend (Presentation Layer):** Single Page Application dibangun dengan React dan di-bundle menggunakan Vite untuk proses build & development yang cepat.
2. **Backend (Application Layer):** REST API dibangun dengan Express.js yang menangani logika bisnis, validasi, dan orkestrasi permintaan antara frontend dan Supabase.
3. **Data Layer:** Supabase menyediakan PostgreSQL sebagai basis data utama, modul Auth untuk autentikasi, Storage untuk lampiran/foto, dan Realtime untuk pembaruan status secara langsung.

### 5.2 Komponen Teknologi

| Komponen | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Build Tool & Dev Server** | Vite | Bundling cepat dan hot-reload saat pengembangan frontend. |
| **Frontend Framework** | React | Membangun antarmuka pengguna berbasis komponen. |
| **Backend Framework** | Express.js (Node.js) | Menyediakan REST API dan logika bisnis aplikasi. |
| **Database** | Supabase (PostgreSQL) | Menyimpan seluruh data transaksional dan master data. |
| **Autentikasi** | Supabase Auth | Mengelola login, sesi, dan token JWT pengguna. |
| **Realtime** | Supabase Realtime | Sinkronisasi status tugas secara langsung ke seluruh klien. |
| **Penyimpanan File** | Supabase Storage | Menyimpan lampiran foto/bukti pekerjaan. |

### 5.3 Lingkungan Deployment
- **Frontend:** Hasil build Vite dapat di-deploy pada layanan static hosting (misal: Vercel, Netlify) atau server internal perusahaan.
- **Backend:** Express dijalankan sebagai layanan Node.js terpisah (misal: VPS, container, atau platform PaaS).
- **Supabase:** Digunakan sebagai layanan terkelola (*managed service*) untuk database, auth, dan storage.

---

## 6. Model Data (Entitas Utama)

Berikut entitas utama yang menjadi dasar perancangan skema database pada Supabase (PostgreSQL):

| Entitas / Tabel | Deskripsi |
| :--- | :--- |
| `users` | Data pengguna sistem: nama, email, role, divisi, status aktif. |
| `divisions` | Master data divisi: Jaringan, Perbaikan Komputer. |
| `teams` | Pengelompokan anggota tim kerja dalam satu divisi. |
| `clients` | Data pelanggan: nama, kontak, alamat, jenis layanan. |
| `assets` | Perangkat/aset milik pelanggan yang ditangani (PC, router, dsb.). |
| `tasks` | Data tugas: judul, deskripsi, divisi, prioritas, tenggat, `client_id`, `asset_id`. |
| `task_assignments` | Relasi tugas dengan teknisi yang ditugaskan. |
| `task_status_history` | Log perubahan status tugas beserta waktu & pelaku perubahan. |
| `task_attachments` | File/foto lampiran yang diunggah terkait pekerjaan. |
| `notifications` | Notifikasi in-app untuk pengguna terkait perubahan tugas. |
| `service_reports` | Ringkasan laporan servis untuk diekspor/dicetak. |

---

## 7. Daftar Fitur Aplikasi

### 7.1 Modul Pengguna & Keamanan
- Login & manajemen sesi (Supabase Auth)
- Manajemen role & hak akses (RBAC)
- Reset password
- Log aktivitas pengguna

### 7.2 Modul Tugas
- Pembuatan & penugasan tugas
- Tracking status tugas real-time
- Checklist/sub-tugas pekerjaan
- Lampiran foto/dokumen bukti kerja
- Filter & pencarian tugas lanjutan
- Penjadwalan kunjungan servis (kalender)

### 7.3 Modul Tim & Divisi
- Pengelompokan pengguna per divisi (Jaringan / Perbaikan Komputer)
- Pembentukan tim kerja
- Pemantauan beban kerja (*workload*) teknisi

### 7.4 Modul Pelanggan & Riwayat Servis
- Data master pelanggan & aset
- Riwayat servis per pelanggan/aset
- Ekspor riwayat ke PDF/CSV
- Portal status terbatas untuk pelanggan (opsional)

### 7.5 Modul Dashboard & Laporan
- Dashboard ringkasan status tugas
- Laporan performa teknisi
- Laporan periodik yang dapat diunduh
- Grafik tren tugas masuk vs selesai

### 7.6 Modul Notifikasi
- Notifikasi in-app real-time
- Notifikasi tenggat waktu tugas

---

## 8. Kebutuhan Lain (Other Requirements)

- **Legalitas & Kepatuhan Data:** Data pelanggan dikelola sesuai kebijakan privasi internal perusahaan.
- **Backup & Recovery:** Backup otomatis harian dengan retensi minimal 30 hari melalui fasilitas Supabase.
- **Dokumentasi:** Tersedia dokumentasi teknis (API) dan manual pengguna (*user guide*).
- **Pelatihan:** Sesi onboarding/pelatihan singkat bagi teknisi dan admin sebelum *go-live*.
- **Skalabilitas Masa Depan:** Struktur data dan API dirancang agar mudah ditambahkan modul baru (misal: *invoicing*, inventaris *sparepart*) di iterasi berikutnya.

---

## 9. Lampiran – Matriks Hak Akses (Role Matrix)

| Fitur | Super Admin | Manager Divisi | Teknisi | Staf Admin/CS |
| :--- | :---: | :---: | :---: | :---: |
| **Kelola Pengguna** | $\checkmark$ | $\text{X}$ | $\text{X}$ | $\text{X}$ |
| **Buat/Assign Tugas** | $\checkmark$ | $\checkmark$ | $\text{X}$ | $\checkmark$ |
| **Ubah Status Tugas Sendiri** | $\checkmark$ | $\checkmark$ | $\checkmark$ | $\text{X}$ |
| **Lihat Semua Tugas Divisi** | $\checkmark$ | $\checkmark$ | $\text{X}$ | $\checkmark$ |
| **Lihat Dashboard & Laporan** | $\checkmark$ | $\checkmark$ | $\text{X}$ | $\checkmark$ |
| **Kelola Data Pelanggan** | $\checkmark$ | $\checkmark$ | $\text{X}$ | $\checkmark$ |
| **Ekspor Riwayat Servis** | $\checkmark$ | $\checkmark$ | $\text{X}$ | $\checkmark$ |

**Keterangan:**  
$\checkmark$ = Memiliki akses  
$\text{X}$ = Tidak memiliki akses

---
*--- Akhir Dokumen SRS ---*