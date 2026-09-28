# GEMINI CODING INSTRUCTIONS (PRODUCTION SYSTEM MIGRATION & REFACTORING)

This file persists strict engineering rules for the Gemini API and agent behaviors in Rombel KTCT ERP, aligned with the Technical Lead's decisions.

## 1. STRATEGIC ARCHITECTURE (3-PORTAL ROUTER)
The router in `src/App.tsx` handles three separate portals dynamically on the client side with durable session state:
- **`public`**: For guest visitors (No login required. Shows banner, profile, news, dynamic online registration form, and registration tracking status).
- **`spmb-applicant`**: For candidate registration & status verification (Login via registration code + NISN). Offers file upload, registration tracker, and real-time student/parent account provisioning upon confirming "Daftar Ulang".
- **`erp`**: For active stakeholders (Superadmin, Admin, Guru, Wali Kelas, Bendahara, BK, Perpustakaan, Siswa Aktif, Wali Murid). Runs role-based route permissions.

## 2. CODE CONSERVATION & REFACTORING SAFETY
- **Do not rewrite** existing business logic. Always read files (`view_file`) fully before editing (`edit_file` or `multi_edit_file`).
- **Do not delete** any helper functions, utils, database adapters, or components unless you have verified with absolute certainty that no direct or indirect trace dependency exists.
- Keep `MockDb` fully compatible with all existing tables and properties. It simulates the 60 sheets structure used in the production Google Spreadsheet.

## 3. UI/UX COPPER-CLAD STANDARD
- Always style components using Tailwind CSS utility classes.
- Standard components must utilize lightweight Glassmorphism (`bg-slate-900/60 backdrop-blur-md border border-slate-800`), responsive grids, standard typography (`Inter` or `Space Grotesk`), SweetAlert2 for notifications, and elegant skeleton loaders.
- Avoid using custom unrequested theme selections. Use the premium Cosmic Dark theme as the main uniform interface.

## 4. GRAPH DATA VISUALIZATION
- Render standard SaaS metrics using `recharts` for the primary admin/dashboard screen.
- Ensure the 12 key operasional widgets (Siswa, Guru, Kelas, Pendaftar, Hadir, Izin, Alpha, Tabungan, Tagihan, Pembayaran, Buku, Barang) and 3 specific charts (Grafik Kehadiran, Grafik Pembayaran, Grafik Nilai) are displayed gracefully.
