# Role-Based Access Control (RBAC) & Row Level Security (RLS) Specification

Dokumen ini mendefinisikan aturan hak akses database (Supabase Row Level Security) untuk aplikasi Task Manager IT Service.

---

## Ringkasan Peran (Roles)
1. **SUPER_ADMIN**: Memiliki akses penuh (Bypass RLS / Full Control) pada semua tabel dan kolom.
2. **MANAGER_DIVISION**: Mengelola tugas, tim, dan laporan di **semua divisi** (keputusan MVP; notifikasi perubahan status tetap hanya untuk manager divisi task).
3. **STAFF**: Mengelola data pelanggan, membuat tugas lintas divisi, serta mengatur prioritas/tenggat waktu.
4. **TECHNICIAN**: Menerima tugas, memperbarui status pekerjaan, dan mengunggah bukti kerja pada divisinya.

---

## Aturan Akses Tabel

### 1. `tasks`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | Semua kolom | Hard delete / Soft delete |
| **MANAGER_DIVISION** | Semua | ✓ | Semua kolom | Soft delete |
| **TECHNICIAN** | Divisinya | X | `description` (divisinya); `status` lewat RPC | X |
| **STAFF** | Semua (lintas divisi) | ✓ | `priority`, `dueDate` saja | X |

- INSERT wajib `created_by_id = auth.uid()` (pembuat tidak bisa dipalsukan).
- `status` **hanya** bisa diubah lewat RPC `update_task_status()` untuk semua role (trigger menolak `UPDATE` langsung), agar riwayat & notifikasi selalu tercatat. STAFF tidak boleh mengubah status.

---

### 2. `task_assignments`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Scope = `tasks` | ✓ | ✓ | ✓ |
| **MANAGER_DIVISION** | Scope = `tasks` | ✓ | ✓ | ✓ |
| **STAFF** | Scope = `tasks` | ✓ | ✓ | ✓ |
| **TECHNICIAN** | Scope = `tasks` | X | X | X |

---

### 3. `task_status_history` *(Log, Immutable)*
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Scope = `tasks` | via RPC | X | X |
| **MANAGER_DIVISION** | Scope = `tasks` | via RPC | X | X |
| **STAFF** | Scope = `tasks` | X | X | X |
| **TECHNICIAN** | Scope = `tasks` | via RPC | X | X |

Tidak ada policy INSERT: baris riwayat hanya ditulis `update_task_status()` (`SECURITY DEFINER`) dengan `user_id = auth.uid()`.

---

### 4. `task_attachments`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Scope = `tasks` | ✓ | ✓ | ✓ (semua) |
| **MANAGER_DIVISION** | Scope = `tasks` | ✓ | X | ✓ (semua) |
| **STAFF** | Scope = `tasks` | ✓ | X | X |
| **TECHNICIAN** | Scope = `tasks` | ✓ | X | ✓ (hanya milik sendiri — `uploadedBy = auth.uid()`) |

INSERT wajib `uploaded_by_id = auth.uid()`.

---

### 5. `notifications`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | Semua kolom | ✓ |
| **SEMUA ROLE** *(Lainnya)* | Milik sendiri saja | X (via trigger) | Kolom `isRead` saja, milik sendiri | X |

---

### 6. `service_reports` *(Immutable)*
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Scope = `tasks` | ✓ | ✓ | ✓ |
| **MANAGER_DIVISION** | Scope = `tasks` | ✓ | X | X |
| **STAFF** | Scope = `tasks` | X | X | X |
| **TECHNICIAN** | Scope = `tasks` | ✓ (divisinya) | X | X |

INSERT wajib `created_by_id = auth.uid()` dan task berstatus `COMPLETED` serta belum dihapus.
Saat ini belum ada policy UPDATE/DELETE untuk role mana pun (termasuk SUPER_ADMIN), jadi laporan
benar-benar immutable lewat API dan Supabase langsung.

---

### 7. `clients`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | ✓ | Hard delete / Soft delete |
| **MANAGER_DIVISION** | Semua | ✓ | ✓ | Soft delete |
| **STAFF** | Semua | ✓ | ✓ | X |
| **TECHNICIAN** | Semua | X | X | X |

---

### 7b. `assets` *(mengikuti `clients`)*
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua (termasuk arsip) | ✓ | ✓ | Soft delete / restore |
| **MANAGER_DIVISION** | Semua (termasuk arsip) | ✓ | ✓ | Soft delete / restore |
| **STAFF** | Aktif saja | ✓ | ✓ (asset aktif) | X |
| **TECHNICIAN** | Aktif saja | X | X | X |

---

### 8. `divisions`, `teams`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | ✓ | ✓ |
| **SEMUA ROLE** *(Lainnya)* | ✓ | X | X | X |

---

### 9. `users`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua (termasuk arsip) | via Auth (`POST /api/users`) | Semua kolom | Soft delete (`deleted_at`) |
| **MANAGER_DIVISION** | Diri sendiri + semua non-SUPER_ADMIN aktif | X | `name`, `email` milik sendiri | X |
| **STAFF** | Diri sendiri + TECHNICIAN aktif | X | `name`, `email` milik sendiri | X |
| **TECHNICIAN** | Diri sendiri | X | `name`, `email` milik sendiri | X |

User **nonaktif atau diarsip** tidak punya akses data apa pun: `get_my_role()` mengembalikan `NULL`,
sehingga semua policy menolaknya. Ia hanya bisa membaca baris profilnya sendiri.

---

## Catatan Implementasi Supabase RLS (Untuk Agent/Developer)
1. **Immutable Tables**: Pada tabel `task_status_history` dan `service_reports`, operasi `UPDATE` dan `DELETE` harus ditolak oleh RLS Policy untuk semua role selain `SUPER_ADMIN` guna menjaga integritas *audit trail*.
2. **Notification Triggers**: `INSERT` pada tabel `notifications` dijalankan otomatis oleh Database Triggers / Edge Functions saat terjadi perubah status tugas.
3. **Soft Delete**: Operasi `DELETE` pada `tasks` dan `clients` oleh `MANAGER_DIVISION` wajib mengubah kolom status/is_deleted (Soft Delete), bukan menghapus baris data secara permanen.