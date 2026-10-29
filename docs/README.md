# Dokumentasi Task Manager

Mulai dari sini. Urutan di bawah adalah urutan baca yang disarankan untuk memahami proyek.

## Untuk belajar & memahami

| Dokumen | Isi |
|---|---|
| [learning-guide.md](learning-guide.md) | **Mulai di sini.** Urutan membaca kode per tahap + latihan |
| [architecture.md](architecture.md) | Gambaran sistem, alur request, auth, upload, realtime, struktur folder |
| [erd.md](erd.md) | Diagram relasi tabel + kamus data |
| [database.md](database.md) | RLS, trigger, function/RPC, storage, realtime, kode error PostgreSQL |
| [tech-stack.md](tech-stack.md) | Teknologi yang dipakai, untuk apa, dan konsep yang perlu dikuasai |
| [testing.md](testing.md) | Unit test & integration test (API + RLS per role), cara menyiapkan project Supabase test |
| [roadmap.md](roadmap.md) | Status MVP terhadap SRS + rencana improvement |

## Spesifikasi (acuan saat membangun fitur)

| Dokumen | Isi |
|---|---|
| [srs.md](srs.md) | Kebutuhan fungsional (FR-xx) & non-fungsional |
| [RBAC.md](RBAC.md) | Hak akses per role per tabel |
| [api-contract.md](api-contract.md) | Kontrak endpoint REST |
| [ui-spec.md](ui-spec.md) | Design token & spesifikasi komponen UI |
| `plans/` | Rencana fitur yang sedang dikerjakan |
| `archive/` | Rencana lama yang sudah selesai |

## Diagram

Diagram ditulis dengan **Mermaid** di dalam Markdown. Tampil otomatis di GitHub; di VS Code pasang
ekstensi *Markdown Preview Mermaid Support* lalu buka preview (`Ctrl+Shift+V`).

## Menjaga dokumen tetap benar

Dokumen ini ditulis setelah kode ada, jadi bisa tertinggal. Aturannya:
- Ubah skema/SQL → perbarui `erd.md` / `database.md`.
- Tambah endpoint → perbarui `api-contract.md` (dan Swagger).
- Selesaikan item roadmap → centang di `roadmap.md`.
