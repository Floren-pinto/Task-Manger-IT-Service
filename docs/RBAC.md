# Role-Based Access Control (RBAC) & Row Level Security (RLS) Specification

Dokumen ini mendefinisikan aturan hak akses database (Supabase Row Level Security) untuk aplikasi Task Manager IT Service.

---

## Ringkasan Peran (Roles)
1. **SUPER_ADMIN**: Memiliki akses penuh (Bypass RLS / Full Control) pada semua tabel dan kolom.
2. **MANAGER_DIVISION**: Mengelola tugas, tim, dan laporan pada divisinya.
3. **STAFF**: Mengelola data pelanggan, membuat tugas lintas divisi, serta mengatur prioritas/tenggat waktu.
4. **TECHNICIAN**: Menerima tugas, memperbarui status pekerjaan, dan mengunggah bukti kerja pada divisinya.

---

## Aturan Akses Tabel

### 1. `tasks`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | Semua kolom | Hard delete / Soft delete |
| **MANAGER_DIVISION** | Semua | ✓ | Semua kolom | Soft delete |
| **TECHNICIAN** | Divisinya | X | `status`, `description` (divisinya) | X |
| **STAFF** | Semua (lintas divisi) | ✓ | `priority`, `dueDate` saja | X |

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
| **SUPER_ADMIN** | Scope = `tasks` | ✓ | ✓ | ✓ |
| **MANAGER_DIVISION** | Scope = `tasks` | ✓ | X | X |
| **STAFF** | Scope = `tasks` | X | X | X |
| **TECHNICIAN** | Scope = `tasks` | ✓ | X | X |

---

### 4. `task_attachments`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Scope = `tasks` | ✓ | ✓ | ✓ (semua) |
| **MANAGER_DIVISION** | Scope = `tasks` | ✓ | X | ✓ (semua) |
| **STAFF** | Scope = `tasks` | ✓ | X | X |
| **TECHNICIAN** | Scope = `tasks` | ✓ | X | ✓ (hanya milik sendiri — `uploadedBy = auth.uid()`) |

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
| **TECHNICIAN** | Scope = `tasks` | ✓ | X | X |

---

### 7. `clients`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | ✓ | Hard delete / Soft delete |
| **MANAGER_DIVISION** | Semua | ✓ | ✓ | Soft delete |
| **STAFF** | Semua | ✓ | ✓ | X |
| **TECHNICIAN** | Semua | X | X | X |

---

### 8. `divisions`, `teams`
| Role | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Semua | ✓ | ✓ | ✓ |
| **SEMUA ROLE** *(Lainnya)* | ✓ | X | X | X |

---

## Catatan Implementasi Supabase RLS (Untuk Agent/Developer)
1. **Immutable Tables**: Pada tabel `task_status_history` dan `service_reports`, operasi `UPDATE` dan `DELETE` harus ditolak oleh RLS Policy untuk semua role selain `SUPER_ADMIN` guna menjaga integritas *audit trail*.
2. **Notification Triggers**: `INSERT` pada tabel `notifications` dijalankan otomatis oleh Database Triggers / Edge Functions saat terjadi perubah status tugas.
3. **Soft Delete**: Operasi `DELETE` pada `tasks` dan `clients` oleh `MANAGER_DIVISION` wajib mengubah kolom status/is_deleted (Soft Delete), bukan menghapus baris data secara permanen.