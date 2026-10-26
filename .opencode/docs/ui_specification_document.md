# UI Specification Document: IT Service Task Manager System

Dokumen spesifikasi UI/UX ini dibuat berdasarkan analisis visual desain Figma dan kebutuhan dokumen SRS (_Software Requirements Specification_). Spesifikasi ini dirancang khusus sebagai panduan implementasi antarmuka menggunakan **Vite + React + Tailwind CSS + Supabase**.

---

## 1. Global Tokens & Foundation Design System

### A. Palet Warna (Color System)

```javascript
// tailwind.config.js - Color Palette Extends
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0EA5E9", // Sky Blue (Action utama, tombol aktif, badge jaringan)
          dark: "#0284C7", // Deep Blue (Hover states, sidebar header)
          tint: "#F0F9FF", // Soft Blue (Background badge / highlight ring ringan)
        },
        accent: {
          orange: "#F97316", // Vibrant Orange (Urgent priority, warning state)
          orangeLight: "#FFF7ED", // Soft Orange Tint (Background badge urgent/warning)
        },
        slate: {
          bg: "#F8FAFC", // Main Page Background
          dark: "#0F172A", // Main Sidebar & Deep Dark Text
          border: "#E2E8F0", // Standard Card/Table 1px Border
          borderLight: "#F1F5F9", // Divider & Sub-borders
        },
        status: {
          baru: { bg: "#EFF6FF", text: "#2563EB" }, // Light Blue
          ditugaskan: { bg: "#F1F5F9", text: "#475569" }, // Gray
          dikerjakan: { bg: "#F0FDF4", text: "#16A34A" }, // Green
          pending: { bg: "#FFF7ED", text: "#EA580C" }, // Orange (Menunggu Sparepart)
          selesai: { bg: "#F8FAFC", text: "#94A3B8" }, // Muted Slate
        },
      },
    },
  },
};
```

### B. Tipografi & Aturan Spacing

- **Font Family:** `Inter`, `Plus Jakarta Sans`, atau `sans-serif` bersih.
- **Hirarki Tipografi:**
  - **H1 / Judul Layar Utama:** `text-2xl font-bold text-slate-900`
  - **H2 / Judul Kartu / Modal:** `text-lg font-semibold text-slate-800`
  - **H3 / Header Seksi:** `text-xs font-bold tracking-wider uppercase text-slate-400`
  - **Body Text / Deskripsi:** `text-sm font-normal text-slate-600 leading-relaxed`
  - **Meta / Caption Text:** `text-xs font-medium text-slate-400`
- **Standar Spacing & Layout:**
  - **Padding Card/Modal:** `p-5` hingga `p-6` (`20px - 24px`) untuk memberikan _ruang bernapas_ (_whitespace_) yang lega.
  - **Border Radius:** `rounded-xl` (`12px`) untuk Kartu/Modal, `rounded-lg` (`8px`) untuk Tombol/Input Field, `rounded-full` untuk Pill Badges.
  - **Elevation / Bayangan:** `shadow-sm` tipis (`0 1px 2px 0 rgb(0 0 0 / 0.05)`).

---

## 2. Desktop Views Specifications (Manager / Admin Dashboard)

### Component 1: Main Sidebar (`<Sidebar/>`)

- **Layout:** Flex Vertikal (`flex flex-col h-screen`), Fixed Width `w-64`, Background `#0F172A`.
- **Elemen:**
  - **App Brand:** Logo + Teks "IT Ops Center / TaskCore" (`text-white font-bold p-6 border-b border-slate-800`).
  - **Navigation Links:** Active link dengan background `#1E293B` + indikator aksen `primary` di sisi kiri. Menu item: Dashboard, Tasks & Tickets, Divisions (Network Admin, PC Repair), Clients, SLA Reports.
  - **User Profile (Bottom Pin):** Avatar Profil, Nama ("Sarah Jenkins"), Role ("Service Lead") dengan susunan `flex items-center gap-3 p-4 border-t border-slate-800 text-white`.

### Component 2: Manager Workspace Header & Metric Cards (`<DashboardHeader/>`)

- **Layout:** Top Header `flex justify-between items-center mb-6`, Metric Grid `grid grid-cols-3 gap-6 mb-6`.
- **Metric Cards:**
  1. **Active Tasks:** "42 Active", Subteks "+8% this week", Indikator dot biru (`#0EA5E9`).
  2. **Completed Today:** "18 Resolved", Subteks "Avg resolve time: 1.4 hours", Indikator dot hijau.
  3. **Staff Available:** "6 On Duty", Subteks "2 dispatch field engineers", Indikator dot orange (`#F97316`).
- **Gaya Kartu:** `bg-white p-5 rounded-xl border border-slate-200 shadow-sm`.

### Component 3: Filter & Action Bar (`<TaskFilterBar/>`)

- **Layout:** Flex row `flex items-center justify-between gap-4 mb-6`.
- **Seksi Kiri (Filter Tags):** Tag horizontal/pills. Tag aktif "Network Issue" (`bg-primary text-white rounded-lg px-3 py-1.5 text-sm`), tag non-aktif (`bg-slate-100 text-slate-600 hover:bg-slate-200`).
- **Seksi Kanan (Search & CTA):**
  - Search Bar: Input icon `search` + placeholder "TC-9023" (`border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-primary`).
  - Tombol CTA: `+ New Ticket` (`bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-dark`).

### Component 4: Task Table / Data Grid (`<TaskTable/>`)

- **Container:** `bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`.
- **Table Header:** `bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider py-3 px-4 text-left border-b border-slate-200`.
- **Kolom:** `Ticket ID`, `Task Title & Client`, `Assigned Tech`, `Division`, `Status`, `Priority`, `Due Within`.
- **Tampilan Row Highlight:** Row terintegrasi dengan warna tipis untuk prioritas urgent/terpilih (`bg-orange-50/40` atau `bg-slate-50`).
- **Representasi Badges:**
  - **Division Badge:** Network (`bg-sky-50 text-sky-600`), Software/PC Repair (`bg-slate-100 text-slate-600`).
  - **Priority Pill:** Urgent (`text-orange-600 font-bold flex items-center gap-1` dengan dot orange).

---

## 3. Desktop Overlay: Task Detail Drawer (`<TaskDetailDrawer/>`)

- **Layout:** Slide-over Drawer Sisi Kanan, Lebar `w-[480px]` hingga `w-[540px]`, Background `bg-white shadow-2xl h-full border-l border-slate-200`.
- **Seksi Utama:**
  1. **Header:** Ticket ID "TC-9023", Status Badge "Menunggu Sparepart" (`bg-orange-50 text-orange-600 border border-orange-200`), Tombol Tutup `X`.
  2. **Title & Description:** Judul H2 (`font-bold text-slate-900 text-xl`), Deskripsi detail pekerjaan (`text-slate-600 text-sm mt-2`).
  3. **Current Step Status (Stepper/Timeline):** Horizontal Stepper (`Baru -> Ditugaskan -> Dikerjakan -> Selesai`). Ring-icon aktif pada langkah "Dikerjakan" (`text-primary border-primary`).
  4. **Client & Asset Info Card:** Grid 2 Kolom (`Client Station` & `Equipment/Asset`), `bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs`.
  5. **Work Checklist:** List item dengan `Checkbox` (`accent-primary`). Item yang telah selesai menggunakan efek `line-through text-slate-400`.
  6. **Photo Evidence Grid:** Thumbnail gambar horizontal + Tombol Unggah `Add Photo` (`bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium`).
  7. **Activity Log & Notes:** Timeline log vertikal lengkap dengan timestamp (14:32, 11:15, 09:00) dan dot indikator biru.

---

## 4. Mobile Views Specifications (Field Technician App)

### Component 1: Mobile Header & Search (`<MobileHeader/>`)

- **Layout:** Top Header `px-4 pt-10 pb-4 bg-white sticky top-0 z-10 border-b border-slate-100`.
- **Elemen:**
  - Judul Aplikasi: "TechPortal FIELD HUB" (`font-bold text-lg`).
  - Icon Atas: Notification Bell (dengan indikator angka merah "3") & Avatar User.
  - Search Bar: Rounded full search input (`bg-slate-100 border-none rounded-xl px-4 py-2 text-sm`).
- **Quick Filter Tabs:** Pill tab horizontal yang dapat digeser:
  - Pill Terpilih: `Assigned to Me [x]` (`bg-primary text-white rounded-full px-4 py-1.5 text-xs font-semibold`).
  - Pill Non-aktif: `In Progress`, `Completed` (`bg-slate-100 text-slate-600 rounded-full px-4 py-1.5 text-xs`).

### Component 2: Mobile Task Cards (`<MobileTaskCard/>`)

- **Layout:** Vertical Stack, Card Container `bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4`.
- **Card Header:** Ticket ID (`TC-9023`) + Dual Badges: Priority Badge (`HIGH` - `bg-orange-50 text-orange-600`) & Status Badge (`Baru` - `bg-blue-50 text-blue-600`).
- **Card Body:**
  - Judul Tugas: `text-base font-bold text-slate-900 mb-1`.
  - Pelanggan & Lokasi: `text-xs text-slate-500 mb-2 flex items-center gap-1` ("PT. Indah Jaya • Gedung Rektorat Lt. 3").
  - Snippet Deskripsi: Teks terpotong 2 baris (`text-xs text-slate-600 line-clamp-2 mb-4`).
  - Tag Divisi: "Jaringan" / "Perbaikan Komputer" (`bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-md w-max`).
- **Action CTA Button:**
  - Tombol Full Width: `Update Status` (`w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm shadow-sm active:bg-primary-dark`).

### Component 3: Mobile Task Detail Screen (`<MobileTaskDetailScreen/>`)

- **Layout:** Single column mobile view dengan Sticky Bottom Action Bar.
- **Seksi:** Konten serupa dengan Drawer Desktop (Judul, Stepper, Client Station, Asset ID, Work Checklist, Photo Evidence Grid, Activity Log).
- **Bottom Action Bar:** Container melayang `fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg`.
  - Tombol CTA: `Update Status & Complete` (`w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm`).

### Component 4: Mobile Bottom Navigation Bar (`<MobileBottomNav/>`)

- **Layout:** `fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-6 flex justify-between items-center z-20`.
- **Nav Items:** `My Tasks` (Active - `#0EA5E9`), `Schedule`, `Map`, `Profile`. Masing-masing dilengkapi SVG icon dan teks `text-[10px] font-medium`.

---

## 5. Desktop View: Create Task Page (`/task/new`)

Spesifikasi antarmuka lengkap halaman pembuatan tiket/tugas baru (_Create Task_) untuk peran Manager / Admin Dashboard berbasis layout 2 kolom.

### A. Header & Page Navigation (`<CreateTaskHeader/>`)

- **Breadcrumb:** `Tasks > Create New Task` (`text-xs text-slate-400 font-medium mb-1`).
- **Title:** `Create New Service Ticket` (`text-2xl font-bold text-slate-900`).
- **Status Badges & Actions (Top Right):**
  - **Autosave Status:** Pill badge hijau dengan indikator dot aktif (`bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5`).
  - **Cancel Button:** `bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg border border-slate-200 text-sm shadow-sm transition-colors`.
  - **Save Task Button:** `bg-primary hover:bg-primary-dark text-white font-medium px-5 py-2 rounded-lg text-sm shadow-sm transition-colors`.

---

### B. Main Content Layout Container

- **Layout Structure:** Grid 2 Kolom dengan proporsi `grid grid-cols-12 gap-6 items-start`.
  - **Seksi Kiri (Task Information Form):** Column Span 8 (`col-span-8`).
  - **Seksi Kanan (Routing & Assignment Sidebar):** Column Span 4 (`col-span-4`).

---

### C. Seksi Kiri: Task Information Form (`<TaskInfoForm/>`)

Container utama berupa kartu: `bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6`.

1. **Card Header:**
   - Title: `Task Information` (`text-lg font-bold text-slate-900`).
   - Subtitle: `Describe the service issue clearly so the assigned technician can act without delay.` (`text-xs text-slate-500 mt-0.5`).
   - Required Indicator: `* Required` (`text-xs text-slate-400 float-right`).

2. **Title Input Field (`title`):**
   - Label: `Title *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Character Counter: `0 / 120` (`text-xs text-slate-400 float-right`).
   - Input Control: `w-full px-3.5 py-2.5 rounded-lg border border-primary ring-2 ring-primary/20 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none flex justify-between items-center`.
   - Helper Text: `Use a specific symptom and location. Avoid internal shorthand.` (`text-xs text-slate-400 mt-1`).

3. **Description Rich Text Area (`description`):**
   - Label: `Description *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Helper Label: `Supports rich text` (`text-xs text-slate-400 float-right`).
   - Toolbar Controls: Baris tombol format ringan (`bg-slate-50 border border-slate-200 border-b-0 rounded-t-lg p-2 flex gap-2 text-xs font-medium text-slate-600`).
     - Option Pills: `Bold`, `Italic`, `Bullet list`, `Attach file`.
   - Textarea Area: `w-full p-3.5 rounded-b-lg border border-slate-200 bg-slate-50/30 text-sm text-slate-900 placeholder:text-slate-400 min-h-[140px] focus:outline-none focus:border-primary`.
   - Character Counter (Bottom): `0 / 4,000` (`text-xs text-slate-400 text-right mt-1`).

4. **Associated Assets / Equipment Selection (`asset`):**
   - Label: `Associated Assets / Equipment` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Counter Tag: `Optional • 2 selected` (`text-xs text-slate-400 float-right`).
   - Selected Asset Pills Container: Flex row dengan gap `flex flex-wrap gap-2 mb-2`.
     - Asset Pill: `bg-primary text-white rounded-lg px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm`. Menggunakan ikon silang (`X`) untuk menghapus.
   - Search Input: `w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20`.
   - Helper Text: `Linking equipment adds ownership, warranty, location, and service history to the ticket.` (`text-xs text-slate-400 mt-1`).

5. **Attachments Dropzone Container (`attachments`):**
   - Label: `Attachments` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Tag: `Optional` (`text-xs text-slate-400 float-right`).
   - Dropzone Box: `border-2 border-dashed border-sky-200 bg-sky-50/30 hover:bg-sky-50/60 transition-colors rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center`.
   - Icon: Cloud upload icon warna `primary` (`#0EA5E9`).
   - Text CTA: `Upload Photo Evidence or File` (`text-sm font-bold text-slate-800 mb-1`).
   - Drag Text: `Drag and drop here, or ` + Link: `browse files` (`text-xs text-primary font-medium hover:underline`).
   - Format Rules: `PNG, JPG, PDF, DOCX or ZIP - Up to 20 MB per file` (`text-[11px] text-slate-400 mt-1`).

---

### D. Seksi Kanan: Routing & Assignment Sidebar (`<RoutingAssignmentSidebar/>`)

Container utama samping berupa kartu utuh: `bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5`.

1. **Card Header:**
   - Title: `Routing & Assignment` (`text-lg font-bold text-slate-900`).
   - Subtitle: `Configure the division, priority, due date, client, and technician assignments for this ticket.` (`text-xs text-slate-500 mt-0.5`).

2. **Division Selection (`division`):**
   - Label: `Division *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Select Dropdown: `w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 flex justify-between items-center`.
   - Helper Text: `Routes to the Network Admin queue.` (`text-[11px] text-slate-400 mt-1`).

3. **Priority Segmented Control (`priority`):**
   - Label: `Priority *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Segmented Control Layout: `grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200`.
   - Options:
     - `Low`: `bg-transparent text-slate-600 font-medium py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-200/50`. (Dot indikator abu-abu).
     - `Medium`: `bg-white text-slate-800 font-semibold py-1.5 text-xs rounded-lg shadow-2xs flex items-center justify-center gap-1.5`. (Dot indikator biru `#0EA5E9`).
     - `High / Urgent`: `bg-transparent text-slate-600 font-medium py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-200/50`. (Dot indikator oranye `#F97316`).
   - Helper Text: `Medium is the default routing priority for this division.` (`text-[11px] text-slate-400 mt-1`).

4. **Due Date Picker (`due_date`):**
   - Label: `Due Date *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Input Control: `w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 flex justify-between items-center cursor-pointer`.
   - Selected Value: Calendar Icon + `Oct 02, 2026 • 5:00 PM`.
   - Helper Text: `4 business-hour resolution target • 24x7 coverage.` (`text-[11px] text-slate-400 mt-1`).

5. **Client Selection with Quick Action (`client`):**
   - Label: `Client *` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Search Input & Action Row: `flex items-center gap-2`.
     - Search Input: `flex-1 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400`.
     - Add Client Button: `bg-primary hover:bg-primary-dark text-white font-medium text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-colors shadow-2xs`.
   - Helper Text: `Search by organization, location, or contact.` (`text-[11px] text-slate-400 mt-1`).

6. **Assign Technicians Selection (`assign to technician`):**
   - Label: `Assign Technicians` (`text-xs font-bold text-slate-700 uppercase tracking-wider`).
   - Search Dropdown Input: `w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 flex justify-between items-center`.
   - Helper Text: `Search by name, specialty, or availability.` (`text-[11px] text-slate-400 mt-1`).

7. **Assigned Technicians Interactive Table (`<AssignedTechniciansTable/>`):**
   - Header Label: `Assigned Technicians` (`text-xs font-bold text-slate-700 uppercase tracking-wider mt-3 mb-1 block`).
   - Table Container: `w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs`.
   - Table Header Row: `bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-3 text-left grid grid-cols-12 items-center`.
     - Column Spans: `Avatar (col-span-2)`, `Name (col-span-4)`, `Specialty (col-span-4)`, `Remove (col-span-2 text-right)`.
   - Row Items Layout: `grid grid-cols-12 items-center px-3 py-2 border-b border-slate-100 last:border-none hover:bg-slate-50/50 transition-colors`.
   - Row Elements:
     - **Avatar:** Badge inisial terstruktur (`w-7 h-7 rounded-md font-bold text-[10px] flex items-center justify-center`). Contoh: `HW` (`bg-sky-100 text-sky-700`), `AR` (`bg-sky-100 text-sky-700`).
     - **Name:** `text-xs font-bold text-slate-800 truncate`. (Contoh: "Hassan W.", "Ahmad Rizky").
     - **Specialty Badge:** `text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md w-max`. (Contoh: "Network Engineer", "Software Support").
     - **Remove Action Button:** Tombol silang merah halus (`text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors justify-self-end cursor-pointer`).
