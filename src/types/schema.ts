export const AVAILABLE_ROLES = [
  { id: 'SUPERADMIN', label: 'Super Admin' },
  { id: 'ADMIN', label: 'Administrator' },
  { id: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
  { id: 'DEVELOPER', label: 'Developer' },
  { id: 'TECHNICAL_SUPPORT', label: 'Technical Support' },
  { id: 'KETUA_YAYASAN', label: 'Ketua Yayasan' },
  { id: 'PENGURUS_YAYASAN', label: 'Pengurus Yayasan' },
  { id: 'PENGAWAS_YAYASAN', label: 'Pengawas Yayasan' },
  { id: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
  { id: 'WAKASEK_KURIKULUM', label: 'Wakasek Kurikulum' },
  { id: 'WAKASEK_KESISWAAN', label: 'Wakasek Kesiswaan' },
  { id: 'WAKASEK_SARPRAS', label: 'Wakasek Sarpras' },
  { id: 'WAKASEK_HUMAS', label: 'Wakasek Humas' },
  { id: 'KTU', label: 'KTU' },
  { id: 'OPERATOR', label: 'Operator' },
  { id: 'TU', label: 'TU' },
  { id: 'BENDAHARA', label: 'Bendahara' },
  { id: 'KASIR', label: 'Kasir' },
  { id: 'GURU', label: 'Guru' },
  { id: 'WALI_KELAS', label: 'Wali Kelas' },
  { id: 'BK', label: 'BK' },
  { id: 'PUSTAKAWAN', label: 'Pustakawan' },
  { id: 'PETUGAS_UKS', label: 'Petugas UKS' },
  { id: 'INVENTARIS', label: 'Inventaris' },
  { id: 'ADMIN_CBT', label: 'Admin CBT' },
  { id: 'SISWA', label: 'Siswa' },
  { id: 'ORANG_TUA', label: 'Orang Tua' },
  { id: 'ALUMNI', label: 'Alumni' },
  { id: 'VENDOR', label: 'Vendor' },
  { id: 'GUEST', label: 'Guest (Pengunjung)' },
  { id: 'CALON_SISWA', label: 'Calon Siswa' },
  { id: 'ORTU_CALON_SISWA', label: 'Orang Tua Calon Siswa' }
];

export const AVAILABLE_PERMISSIONS = [
  { id: 'view', label: 'View (Melihat Data)' },
  { id: 'create', label: 'Create (Menambah Data)' },
  { id: 'edit', label: 'Edit (Mengubah Data)' },
  { id: 'delete', label: 'Delete (Menghapus Data)' },
  { id: 'approve', label: 'Approve (Menyetujui)' },
  { id: 'reject', label: 'Reject (Menolak)' },
  { id: 'verify', label: 'Verify (Verifikasi)' },
  { id: 'import', label: 'Import Excel/CSV' },
  { id: 'export', label: 'Export PDF/Excel' },
  { id: 'print', label: 'Print (Cetak)' },
  { id: 'upload', label: 'Upload Berkas' },
  { id: 'download', label: 'Download Berkas' },
  { id: 'backup', label: 'Backup Database' },
  { id: 'restore', label: 'Restore Database' },
  { id: 'setting', label: 'Mengubah Setting' },
  { id: 'manage_user', label: 'Manage User' },
  { id: 'manage_role', label: 'Manage Role' },
  { id: 'manage_menu', label: 'Manage Menu' },
  { id: 'manage_permission', label: 'Manage Hak Akses' },
  { id: 'audit_log', label: 'Audit Log' },
  { id: 'api_access', label: 'API Access' },
  { id: 'developer_mode', label: 'Developer Mode' }
];

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'SYSTEM_ADMINISTRATOR'
  | 'DEVELOPER'
  | 'TECHNICAL_SUPPORT'
  | 'KETUA_YAYASAN'
  | 'PENGURUS_YAYASAN'
  | 'PENGAWAS_YAYASAN'
  | 'KEPALA_SEKOLAH'
  | 'WAKASEK_KURIKULUM'
  | 'WAKASEK_KESISWAAN'
  | 'WAKASEK_SARPRAS'
  | 'WAKASEK_HUMAS'
  | 'KTU'
  | 'OPERATOR'
  | 'TU'
  | 'BENDAHARA'
  | 'KASIR'
  | 'GURU'
  | 'WALI_KELAS'
  | 'BK'
  | 'PUSTAKAWAN'
  | 'PETUGAS_UKS'
  | 'INVENTARIS'
  | 'ADMIN_CBT'
  | 'SISWA'
  | 'ORANG_TUA'
  | 'ORTU'
  | 'WAKEL'
  | 'ALUMNI'
  | 'VENDOR'
  | 'GUEST'
  | 'CALON_SISWA'
  | 'ORTU_CALON_SISWA'
  | string;

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: Role;
  nopdkt?: string;
  kelasId?: string;
  email?: string;
}

export interface SheetSchemaDef {
  number: number;
  name: string;
  headers: string[];
  description: string;
  category: string;
}

export interface TableRowData {
  [key: string]: any;
}

export type PortalMode = 'PUBLIC' | 'CALON_SISWA' | 'SISTA_ERP';

export type PublicTab =
  | 'home'
  | 'profil'
  | 'berita'
  | 'spmb'
  | 'cek'
  | 'akademik'
  | 'digital'
  | 'prestasi_galeri'
  | 'literasi'
  | 'alumni'
  | 'download'
  | 'faq_hubungi';

export type CalonSiswaTab =
  | 'login'
  | 'upload'
  | 'konfirmasi';

export type ErpTab =
  | 'dashboard'
  | 'master_data'
  | 'spmb_erp'
  | 'akademik_erp'
  | 'cbt_erp'
  | 'penugasan'
  | 'keuangan_erp'
  | 'bk_erp'
  | 'inventory_erp'
  | 'dokumen_erp'
  | 'laporan_erp'
  | 'riwayat_erp'
  | 'pengaturan_erp'
  | 'gas_code';

export type ActiveTab = ErpTab;

export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  themeMode: 'light' | 'dark';
  dyslexiaFont: boolean;
  colorFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  lang: 'id' | 'en';
  ttsActive: boolean;
}
