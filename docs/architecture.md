# Arsitektur Aplikasi

Gambaran besar bagaimana bagian-bagian Task Manager bekerja sama: dari klik di browser sampai
baris di database dan kembali lagi.

Dokumen terkait: [erd.md](erd.md) (struktur data) · [database.md](database.md) (RLS & trigger) ·
[tech-stack.md](tech-stack.md) (teknologi) · [api-contract.md](api-contract.md) (daftar endpoint).

---

## 1. Gambaran besar

```mermaid
flowchart LR
    subgraph Browser["Browser — client/ (React + Vite)"]
        UI[Pages & Components]
        H[Hooks]
        S[Services axios]
        SB[supabase-js<br/>login · upload · realtime]
    end

    subgraph Server["server/ (Express 5)"]
        MW[Middleware<br/>requireAuth · attachProfile]
        C[Controllers]
    end

    subgraph Supabase["Supabase (cloud)"]
        AUTH[Auth<br/>JWT]
        PG[(PostgreSQL<br/>RLS · trigger · RPC)]
        ST[Storage<br/>task_attachments]
        RT[Realtime]
    end

    UI --> H --> S -->|HTTP + Bearer JWT| MW --> C -->|supabase-js + JWT user| PG
    SB -->|email/password| AUTH
    SB -->|upload file| ST
    RT -->|event notifications| SB
    PG --> RT
```

Ada **dua jalur** dari browser ke Supabase:

1. **Lewat Express** (`/api/...`) — untuk semua baca/tulis data bisnis. Express memberi validasi,
   pesan error yang rapi, dan menggabungkan beberapa query.
2. **Langsung** dengan `supabase-js` — hanya untuk hal yang memang lebih cocok langsung:
   login (Auth), upload file besar (Storage), dan langganan event (Realtime).

Di kedua jalur, **JWT user selalu ikut**, sehingga RLS di PostgreSQL berlaku sama.

### Kenapa ada Express kalau Supabase sudah punya REST API?

Pertanyaan bagus untuk dipahami. Express di sini berfungsi sebagai:
- tempat validasi input & aturan bisnis (contoh: laporan hanya untuk task `COMPLETED`),
- penerjemah error database menjadi pesan & status HTTP yang jelas,
- tempat operasi yang butuh **service role key** rahasia (membuat akun user) — kunci ini tidak boleh ada di browser,
- tempat logika yang menggabungkan banyak query (snapshot laporan, export CSV, signed URL).

Tetapi **otorisasi** (siapa boleh melihat apa) tetap diserahkan ke RLS. Lihat
[database.md §10](database.md#10-catatan-penting-express-bukan-satu-satunya-pintu) untuk
konsekuensinya.

---

## 2. Struktur folder

```
Task-Manager/
├── package.json              # npm workspaces: client + server, script "dev" menjalankan keduanya
├── client/                   # Frontend (port 5173)
│   └── src/
│       ├── main.jsx, App.jsx # Entry: BrowserRouter → AuthProvider → ToastProvider → AppRoutes
│       ├── api/api.js        # Instance axios + interceptor (pasang JWT, tangani 401)
│       ├── services/         # 1 file per resource, hanya memanggil API (tanpa state)
│       ├── hooks/            # State + loading/error; use*Mutations untuk aksi tulis
│       ├── contexts/         # AuthContext (session & profil), ToastContext
│       ├── components/<fitur>/  # UI per fitur; components/ui/ = komponen umum
│       ├── pages/            # Satu file per halaman/route
│       ├── layouts/          # DashboardLayout (sidebar), PublicLayout (login)
│       ├── routes/           # AppRoutes + RouteGuards (Protected/Public/Admin)
│       ├── constants/        # Label & pilihan enum (Bahasa Indonesia)
│       └── utils/            # formatter, event bus (*Events.js), env
├── server/                   # Backend (port 3000)
│   ├── index.js              # Menyalakan server
│   ├── src/
│   │   ├── app.js            # Susunan middleware global
│   │   ├── config/           # env.js (baca .env), supabase.js (3 jenis client)
│   │   ├── middleware/       # auth, attachProfile, error, requireSuperAdmin, queryBoolean
│   │   ├── routes/           # Peta URL → controller
│   │   ├── controllers/      # Logika tiap endpoint
│   │   ├── utils/            # ApiError, ApiResponse, asyncHandler, queryParams, csv, ...
│   │   └── docs/swagger-ui.js   # Dokumentasi API di /api-docs
│   ├── prisma/               # schema.prisma + migrasi (tooling saja)
│   └── supabase/sql/         # RLS, function, trigger, grant, storage, realtime
└── docs/                     # Dokumentasi (kamu di sini)
```

---

## 3. Arsitektur server (berlapis)

```mermaid
flowchart TB
    R[Request HTTP] --> G["app.js<br/>cors · express.json · boolParser"]
    G --> IDX["routes/index.js<br/>/api/tasks, /api/clients, ..."]
    IDX --> A["requireAuth<br/>verifikasi JWT → req.user, req.supabase"]
    A --> P["attachProfile<br/>ambil baris users → req.profile"]
    P --> RT["task.routes.js<br/>GET / → listTasks"]
    RT --> CT["task.controller.js<br/>validasi → query req.supabase → ok()"]
    CT -->|sukses| RES["{ success: true, message, data }"]
    CT -->|throw ApiError| EH["error.middleware.js"]
    EH --> ERR["{ success: false, message }"]
```

### Tanggung jawab tiap lapisan

| Lapisan | File contoh | Tugas | Tidak boleh |
|---|---|---|---|
| Route | `routes/task.routes.js` | Memetakan method+URL ke fungsi | Berisi logika |
| Middleware | `middleware/auth.middleware.js` | Pekerjaan yang sama untuk banyak route | — |
| Controller | `controllers/task.controller.js` | Validasi input, panggil database, bentuk respons | Pakai Prisma / `supabaseAdmin` sembarangan |
| Utils | `utils/ApiResponse.js` | Fungsi kecil yang dipakai ulang | — |

### Tiga jenis Supabase client (`config/supabase.js`)

| Client | Kunci | RLS | Dipakai untuk |
|---|---|---|---|
| `supabaseAnon` | anon key | — | Hanya memverifikasi JWT (`auth.getUser`) |
| `createUserClient(token)` → `req.supabase` | anon key + JWT user | **Aktif** | **Semua query data user** |
| `supabaseAdmin` | service role key | **Di-bypass** | Hanya admin Auth: buat/hapus akun, ubah password |

### Pola penanganan error

```js
export const createTask = asyncHandler(async (req, res) => {   // 1. asyncHandler menangkap error async
  if (!title) throw new ApiError(400, "title is required");     // 2. lempar ApiError
  const { data, error } = await req.supabase.from("tasks").insert(...);
  if (error?.code === "23503") throw new ApiError(400, "Invalid clientId"); // 3. terjemahkan kode PG
  return created(res, data, "Task created");                    // 4. respons seragam
});
```

`errorHandler` di akhir rantai mengubah `ApiError` menjadi JSON. Error lain (bug) → `500` dan
dicetak ke console.

---

## 4. Alur autentikasi (login sampai request pertama)

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React (AuthContext)
    participant AU as Supabase Auth
    participant BE as Express
    participant DB as PostgreSQL

    U->>FE: isi email + password
    FE->>AU: signInWithPassword()
    AU-->>FE: session { access_token (JWT), refresh_token }
    Note over FE: supabase-js simpan session di localStorage
    FE->>BE: GET /api/auth/me<br/>Authorization: Bearer JWT
    BE->>AU: auth.getUser(JWT) — requireAuth
    AU-->>BE: user valid
    BE->>DB: SELECT users WHERE id = user.id — attachProfile (RLS aktif)
    DB-->>BE: { role, division_id, is_active }
    BE-->>FE: profil
    Note over FE: userProfile.role dipakai untuk<br/>menampilkan/menyembunyikan menu (UX saja)
```

- Interceptor di [`api/api.js`](../client/src/api/api.js) menempelkan JWT ke **setiap** request axios.
- Jika server membalas `401`, interceptor logout dan mengarahkan ke `/login`.
- `RouteGuards.jsx` mencegah halaman terlindungi dibuka tanpa session; `AdminRoute` khusus `SUPER_ADMIN`.
  Ini hanya kenyamanan UI — keamanan sebenarnya tetap di server & RLS.

---

## 5. Alur upload lampiran

```mermaid
sequenceDiagram
    participant FE as Browser
    participant ST as Supabase Storage
    participant BE as Express
    participant DB as PostgreSQL

    FE->>FE: validasi ukuran ≤ 5MB & tipe file
    FE->>ST: upload "<taskId>/<timestamp>-nama.pdf" (storage policy cek akses task)
    ST-->>FE: OK
    FE->>BE: POST /api/tasks/:taskId/attachments { filePath, fileName, fileType }
    BE->>BE: cek folder filePath == taskId
    BE->>DB: INSERT task_attachments (RLS)
    alt gagal
        BE->>ST: hapus file (cegah file yatim)
        BE-->>FE: 4xx/5xx
    else berhasil
        BE->>ST: buat signed URL
        BE-->>FE: 201 + attachment
    end
```

Kenapa upload langsung ke Storage, bukan lewat Express? Supaya file besar tidak membebani server
Node dan tidak perlu library upload (multer). Trade-off-nya: ada dua langkah yang harus
dibersihkan bila langkah kedua gagal.

---

## 6. Alur ubah status → notifikasi realtime

```mermaid
sequenceDiagram
    actor T as Teknisi
    participant FE as Browser Teknisi
    participant BE as Express
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant FM as Browser Manager

    T->>FE: pilih status "Selesai"
    FE->>BE: PATCH /api/tasks/:id/status { newStatus: "COMPLETED" }
    BE->>DB: rpc update_task_status()
    DB->>DB: UPDATE tasks (trigger isi completed_at)
    DB->>DB: INSERT task_status_history
    DB->>DB: trigger → INSERT notifications (manager, teknisi)
    DB-->>BE: OK
    BE-->>FE: task terbaru
    FE->>FE: emitTasksChanged() → list lain refresh
    DB-->>RT: perubahan tabel notifications
    RT-->>FM: event (hanya baris milik manager, karena RLS)
    FM->>BE: GET /api/notifications/unread-count
    Note over FM: badge bell bertambah
```

---

## 7. Arsitektur client (alur data)

```mermaid
flowchart LR
    P["pages/TasksPage.jsx"] --> HK["hooks/useTasks.js"]
    HK --> AD["hooks/useApiData.js<br/>data · loading · error · refetch"]
    AD --> SV["services/taskService.js<br/>api.get('/tasks')"]
    SV --> AX["api/api.js (axios)"]
    P --> CM["components/tasks/TaskTable.jsx<br/>components/tasks/TaskCardList.jsx"]
    MU["hooks/useTaskMutations.js"] -->|setelah sukses| EV["utils/taskEvents.js<br/>emitTasksChanged()"]
    EV -.->|window event| HK2["useTasksChanged(refetch)"]
```

| Lapisan | Tugas | Contoh |
|---|---|---|
| **Service** | Satu fungsi = satu endpoint. Tidak punya state. Mengambil `response.data.data`. | `getTasks(params)` |
| **Hook** | Menyimpan state, loading, error. Umumnya membungkus `useApiData`. | `useTasks(params)` |
| **Mutation hook** | Aksi tulis (create/update/delete) + pesan error Indonesia. | `useTaskMutations()` |
| **Component** | Tampilan. Menerima data lewat props. | `TaskTable`, `TaskCardList` |
| **Page** | Merangkai hook + komponen, mengatur filter & dialog. | `TasksPage` |

### `useApiData` — hook generik

Menyimpan `data/loading/error`, mengambil ulang saat `params` berubah, dan memakai `requestId`
untuk membuang respons lama (mencegah *race condition*: hasil request lambat menimpa hasil yang lebih baru).

### Event bus sederhana (`utils/*Events.js`)

Setelah mutasi berhasil, panggil `emitTasksChanged()`. Komponen lain yang memakai
`useTasksChanged(refetch)` akan memuat ulang. Ini pengganti ringan library seperti React Query
atau Redux — cukup untuk skala proyek ini.

### Modal sebagai route (`backgroundLocation`)

`/tasks/:id` dan `/clients/:clientId` bisa tampil sebagai drawer di atas halaman list. Saat link
dibuka dengan `state.backgroundLocation`, `AppRoutes` merender halaman lama di belakang dan
detail di depan. URL tetap bisa dibagikan.

---

## 8. Format respons API

Semua endpoint JSON memakai bentuk yang sama ([`ApiResponse.js`](../server/src/utils/ApiResponse.js)):

```json
{ "success": true, "message": "OK", "data": { "tasks": [], "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } } }
```

```json
{ "success": false, "message": "Task not found or accessible" }
```

Daftar endpoint lengkap: [api-contract.md](api-contract.md) dan Swagger di `http://localhost:3000/api-docs`.
