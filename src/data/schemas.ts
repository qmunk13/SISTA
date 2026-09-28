import { SheetSchemaDef } from '../types/schema';
import { MASTER_TABLES_60 } from './masterDatabase60';
import { SEED_CLASSES, SEED_MAPEL, SEED_TAHUN_AJARAN, SEED_SEMESTER, SEED_HARI_LIBUR, SEED_TARIF_BIAYA, SEED_JENJANG } from './seedMasterData';
import { OFFICIAL_CP_ATP_DATA } from './cpAtpData';

export const OFFICIAL_88_SCHEMAS: SheetSchemaDef[] = MASTER_TABLES_60.map((table, index) => ({
  number: index + 1,
  name: table.name,
  category: table.category,
  description: table.description,
  headers: [...table.headers]
}));

export const OFFICIAL_84_SCHEMAS = OFFICIAL_88_SCHEMAS;
export const OFFICIAL_82_SCHEMAS = OFFICIAL_88_SCHEMAS;
export const OFFICIAL_56_SCHEMAS = OFFICIAL_88_SCHEMAS;

export const INITIAL_SAMPLE_DATA: Record<string, any[]> = {
  SETTING: [
    { key: 'appName', value: 'E-Sekolah Terpadu 56' },
    { key: 'tahunAjaranAktif', value: '2026/2027' },
    { key: 'semesterAktif', value: 'Ganjil' },
    { key: 'instansiNama', value: 'Karang Taruna Kecamatan Tambora' }
  ],
  ROLE: [
    { RoleID: 'RL-001', NamaRole: 'SUPERADMIN', Kategori: 'IT & Sistem', Keterangan: 'Super Administrator Sistem & Penuh Kontrol', JumlahUser: 1, Aktif: 'YA', id: 'RL-001', namaRole: 'SUPERADMIN', deskripsi: 'Super Administrator Sistem & Penuh Kontrol', level: '1', createdAt: '2026-01-01' },
    { RoleID: 'RL-002', NamaRole: 'ADMIN', Kategori: 'IT & Sistem', Keterangan: 'Administrator Aplikasi & Manajemen Sistem', JumlahUser: 1, Aktif: 'YA', id: 'RL-002', namaRole: 'ADMIN', deskripsi: 'Administrator Aplikasi & Manajemen Sistem', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-003', NamaRole: 'SYSTEM_ADMINISTRATOR', Kategori: 'IT & Sistem', Keterangan: 'Pengelola Infrastruktur & Server Database', JumlahUser: 1, Aktif: 'YA', id: 'RL-003', namaRole: 'SYSTEM_ADMINISTRATOR', deskripsi: 'Pengelola Infrastruktur & Server Database', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-004', NamaRole: 'DEVELOPER', Kategori: 'IT & Sistem', Keterangan: 'Pengembang Aplikasi & Kode Web Script', JumlahUser: 1, Aktif: 'YA', id: 'RL-004', namaRole: 'DEVELOPER', deskripsi: 'Pengembang Aplikasi & Kode Web Script', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-005', NamaRole: 'TECHNICAL_SUPPORT', Kategori: 'IT & Sistem', Keterangan: 'Dukungan Teknis Perangkat & Aplikasi', JumlahUser: 1, Aktif: 'YA', id: 'RL-005', namaRole: 'TECHNICAL_SUPPORT', deskripsi: 'Dukungan Teknis Perangkat & Aplikasi', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-006', NamaRole: 'KETUA_YAYASAN', Kategori: 'Yayasan & Pimpinan', Keterangan: 'Pimpinan Tertinggi Yayasan Pendidikan', JumlahUser: 1, Aktif: 'YA', id: 'RL-006', namaRole: 'KETUA_YAYASAN', deskripsi: 'Pimpinan Tertinggi Yayasan Pendidikan', level: '1', createdAt: '2026-01-01' },
    { RoleID: 'RL-007', NamaRole: 'PENGURUS_YAYASAN', Kategori: 'Yayasan & Pimpinan', Keterangan: 'Pengurus Harian & Manajemen Yayasan', JumlahUser: 1, Aktif: 'YA', id: 'RL-007', namaRole: 'PENGURUS_YAYASAN', deskripsi: 'Pengurus Harian & Manajemen Yayasan', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-008', NamaRole: 'PENGAWAS_YAYASAN', Kategori: 'Yayasan & Pimpinan', Keterangan: 'Tim Audit & Pengawas Internal Yayasan', JumlahUser: 1, Aktif: 'YA', id: 'RL-008', namaRole: 'PENGAWAS_YAYASAN', deskripsi: 'Tim Audit & Pengawas Internal Yayasan', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-009', NamaRole: 'KEPALA_SEKOLAH', Kategori: 'Yayasan & Pimpinan', Keterangan: 'Pimpinan Unit Sekolah & Penanggung Jawab', JumlahUser: 1, Aktif: 'YA', id: 'RL-009', namaRole: 'KEPALA_SEKOLAH', deskripsi: 'Pimpinan Unit Sekolah & Penanggung Jawab', level: '2', createdAt: '2026-01-01' },
    { RoleID: 'RL-010', NamaRole: 'WAKASEK_KURIKULUM', Kategori: 'Pimpinan Sekolah', Keterangan: 'Wakil Kepala Sekolah Bidang Kurikulum', JumlahUser: 1, Aktif: 'YA', id: 'RL-010', namaRole: 'WAKASEK_KURIKULUM', deskripsi: 'Wakil Kepala Sekolah Bidang Kurikulum', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-011', NamaRole: 'WAKASEK_KESISWAAN', Kategori: 'Pimpinan Sekolah', Keterangan: 'Wakil Kepala Sekolah Bidang Kesiswaan', JumlahUser: 1, Aktif: 'YA', id: 'RL-011', namaRole: 'WAKASEK_KESISWAAN', deskripsi: 'Wakil Kepala Sekolah Bidang Kesiswaan', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-012', NamaRole: 'WAKASEK_SARPRAS', Kategori: 'Pimpinan Sekolah', Keterangan: 'Wakil Kepala Sekolah Sarana & Prasarana', JumlahUser: 1, Aktif: 'YA', id: 'RL-012', namaRole: 'WAKASEK_SARPRAS', deskripsi: 'Wakil Kepala Sekolah Sarana & Prasarana', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-013', NamaRole: 'WAKASEK_HUMAS', Kategori: 'Pimpinan Sekolah', Keterangan: 'Wakil Kepala Sekolah Hubungan Masyarakat', JumlahUser: 1, Aktif: 'YA', id: 'RL-013', namaRole: 'WAKASEK_HUMAS', deskripsi: 'Wakil Kepala Sekolah Hubungan Masyarakat', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-014', NamaRole: 'KTU', Kategori: 'Tata Usaha & Keuangan', Keterangan: 'Kepala Tata Usaha (Administrasi Utama)', JumlahUser: 1, Aktif: 'YA', id: 'RL-014', namaRole: 'KTU', deskripsi: 'Kepala Tata Usaha (Administrasi Utama)', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-015', NamaRole: 'OPERATOR', Kategori: 'Tata Usaha & Keuangan', Keterangan: 'Operator DAPODIK & Entri Master Data', JumlahUser: 1, Aktif: 'YA', id: 'RL-015', namaRole: 'OPERATOR', deskripsi: 'Operator DAPODIK & Entri Master Data', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-016', NamaRole: 'TU', Kategori: 'Tata Usaha & Keuangan', Keterangan: 'Staf Tata Usaha & Surat Menyurat', JumlahUser: 1, Aktif: 'YA', id: 'RL-016', namaRole: 'TU', deskripsi: 'Staf Tata Usaha & Surat Menyurat', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-017', NamaRole: 'BENDAHARA', Kategori: 'Tata Usaha & Keuangan', Keterangan: 'Bendahara Sekolah & Pengelola Keuangan', JumlahUser: 1, Aktif: 'YA', id: 'RL-017', namaRole: 'BENDAHARA', deskripsi: 'Bendahara Sekolah & Pengelola Keuangan', level: '3', createdAt: '2026-01-01' },
    { RoleID: 'RL-018', NamaRole: 'KASIR', Kategori: 'Tata Usaha & Keuangan', Keterangan: 'Petugas Loket Pembayaran & Tagihan Siswa', JumlahUser: 1, Aktif: 'YA', id: 'RL-018', namaRole: 'KASIR', deskripsi: 'Petugas Loket Pembayaran & Tagihan Siswa', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-019', NamaRole: 'GURU', Kategori: 'Akademik & Pengajar', Keterangan: 'Tenaga Pendidik & Pengajar Matapelajaran', JumlahUser: 1, Aktif: 'YA', id: 'RL-019', namaRole: 'GURU', deskripsi: 'Tenaga Pendidik & Pengajar Matapelajaran', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-020', NamaRole: 'WALI_KELAS', Kategori: 'Akademik & Pengajar', Keterangan: 'Pembimbing & Penanggung Jawab Kelas', JumlahUser: 1, Aktif: 'YA', id: 'RL-020', namaRole: 'WALI_KELAS', deskripsi: 'Pembimbing & Penanggung Jawab Kelas', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-021', NamaRole: 'BK', Kategori: 'Staf & Layanan Khusus', Keterangan: 'Guru Bimbingan Konseling & Kedisiplinan', JumlahUser: 1, Aktif: 'YA', id: 'RL-021', namaRole: 'BK', deskripsi: 'Guru Bimbingan Konseling & Kedisiplinan', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-022', NamaRole: 'PUSTAKAWAN', Kategori: 'Staf & Layanan Khusus', Keterangan: 'Pengelola Perpustakaan & Literasi', JumlahUser: 1, Aktif: 'YA', id: 'RL-022', namaRole: 'PUSTAKAWAN', deskripsi: 'Pengelola Perpustakaan & Literasi', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-023', NamaRole: 'PETUGAS_UKS', Kategori: 'Staf & Layanan Khusus', Keterangan: 'Pengelola Kesehatan Sekolah & UKS', JumlahUser: 1, Aktif: 'YA', id: 'RL-023', namaRole: 'PETUGAS_UKS', deskripsi: 'Pengelola Kesehatan Sekolah & UKS', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-024', NamaRole: 'INVENTARIS', Kategori: 'Staf & Layanan Khusus', Keterangan: 'Petugas Aset & Logistik Barang', JumlahUser: 1, Aktif: 'YA', id: 'RL-024', namaRole: 'INVENTARIS', deskripsi: 'Petugas Aset & Logistik Barang', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-025', NamaRole: 'ADMIN_CBT', Kategori: 'Staf & Layanan Khusus', Keterangan: 'Proktor & Administrator Ujian CBT', JumlahUser: 1, Aktif: 'YA', id: 'RL-025', namaRole: 'ADMIN_CBT', deskripsi: 'Proktor & Administrator Ujian CBT', level: '4', createdAt: '2026-01-01' },
    { RoleID: 'RL-026', NamaRole: 'SISWA', Kategori: 'Siswa & Wali Murid', Keterangan: 'Peserta Didik Aktif Sekolah', JumlahUser: 1, Aktif: 'YA', id: 'RL-026', namaRole: 'SISWA', deskripsi: 'Peserta Didik Aktif Sekolah', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-027', NamaRole: 'ORANG_TUA', Kategori: 'Siswa & Wali Murid', Keterangan: 'Orang Tua / Wali Murid Siswa', JumlahUser: 1, Aktif: 'YA', id: 'RL-027', namaRole: 'ORANG_TUA', deskripsi: 'Orang Tua / Wali Murid Siswa', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-028', NamaRole: 'CALON_SISWA', Kategori: 'Siswa & Wali Murid', Keterangan: 'Pendaftar PPDB / SPMB Baru', JumlahUser: 1, Aktif: 'YA', id: 'RL-028', namaRole: 'CALON_SISWA', deskripsi: 'Pendaftar PPDB / SPMB Baru', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-029', NamaRole: 'ORTU_CALON_SISWA', Kategori: 'Siswa & Wali Murid', Keterangan: 'Orang Tua / Wali Calon Pendaftar', JumlahUser: 1, Aktif: 'YA', id: 'RL-029', namaRole: 'ORTU_CALON_SISWA', deskripsi: 'Orang Tua / Wali Calon Pendaftar', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-030', NamaRole: 'ALUMNI', Kategori: 'Publik & Eksternal', Keterangan: 'Lulusan & Peserta Alumni Sekolah', JumlahUser: 1, Aktif: 'YA', id: 'RL-030', namaRole: 'ALUMNI', deskripsi: 'Lulusan & Peserta Alumni Sekolah', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-031', NamaRole: 'VENDOR', Kategori: 'Publik & Eksternal', Keterangan: 'Mitra Penyedia & Rekanan Sekolah', JumlahUser: 1, Aktif: 'YA', id: 'RL-031', namaRole: 'VENDOR', deskripsi: 'Mitra Penyedia & Rekanan Sekolah', level: '5', createdAt: '2026-01-01' },
    { RoleID: 'RL-032', NamaRole: 'GUEST', Kategori: 'Publik & Eksternal', Keterangan: 'Pengunjung Umum / Akses Publik', JumlahUser: 1, Aktif: 'YA', id: 'RL-032', namaRole: 'GUEST', deskripsi: 'Pengunjung Umum / Akses Publik', level: '6', createdAt: '2026-01-01' }
  ],
  USERS: [
    { UserID: 'USR_001', Username: 'superadmin', Password: 'admin123', RoleID: 'RL-001', Nama: 'Super Administrator Utama', NIP_NISN: '198001012005011001', Email: 'kkmtambora@gmail.com', NoHP: '081234567890', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_002', Username: 'admin', Password: 'admin123', RoleID: 'RL-002', Nama: 'Administrator Sistem', NIP_NISN: '198502152010011002', Email: 'admin.pkbmtambora@gmail.com', NoHP: '081234567891', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_003', Username: 'kepala', Password: 'kepala123', RoleID: 'RL-009', Nama: 'Kepala Sekolah PKBM', NIP_NISN: '197505102000031001', Email: 'kepala.pkbmtambora@gmail.com', NoHP: '081122334455', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_004', Username: 'kurikulum', Password: 'kuri123', RoleID: 'RL-010', Nama: 'Wakasek Kurikulum', NIP_NISN: '198203122008011003', Email: 'kurikulum.pkbmtambora@gmail.com', NoHP: '081288776655', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_005', Username: 'operator', Password: 'ops123', RoleID: 'RL-015', Nama: 'Operator DAPODIK', NIP_NISN: '199008202015021001', Email: 'operator.dapodik@gmail.com', NoHP: '081399887766', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_006', Username: 'bendahara', Password: 'keu123', RoleID: 'RL-017', Nama: 'Bendahara Sekolah', NIP_NISN: '198811252012012001', Email: 'keuangan.pkbmtambora@gmail.com', NoHP: '081377889900', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_007', Username: 'ridwan', Password: 'guru123', RoleID: 'RL-019', Nama: 'Ridwan Ghozali, S.Pd', NIP_NISN: '3173042607930007', Email: 'ghozali.theredsliverpool.ridwa@gmail.com', NoHP: '085724713261', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_008', Username: 'andara', Password: 'guru123', RoleID: 'RL-020', Nama: 'Nur Andara Sari, S.Pd', NIP_NISN: '3173046412900003', Email: 'nurandarasari12@gmail.com', NoHP: '081380969165', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_009', Username: 'tegar', Password: 'guru123', RoleID: 'RL-019', Nama: 'Tegar Asjrullah, S.Pd', NIP_NISN: '3173041611980005', Email: 'tegartogar16@gmail.com', NoHP: '087776124309', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_010', Username: 'wilmar', Password: 'guru123', RoleID: 'RL-019', Nama: 'Mohamad Wilmar Zakaria, S.Pd', NIP_NISN: '3173042711801002', Email: 'zakariawilmar03@gmail.com', NoHP: '087891192303', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_011', Username: 'cbtproktor', Password: 'cbt123', RoleID: 'RL-025', Nama: 'Proktor CBT & Ujian', NIP_NISN: '199204182018011002', Email: 'proktor.cbt@gmail.com', NoHP: '085811223344', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' },
    { UserID: 'USR_012', Username: 'bk_konseling', Password: 'bk123', RoleID: 'RL-021', Nama: 'Guru Bimbingan Konseling', NIP_NISN: '199106222016022001', Email: 'bk.pkbmtambora@gmail.com', NoHP: '089512345678', Status: 'Aktif', LastLogin: '2026-08-27 08:00', Token: '', CreatedAt: '2026-01-01', UpdatedAt: '2026-08-27' }
  ],
  SISWA: [],
  GURU: [],
  KELAS: SEED_CLASSES,
  ABSENSI: [],
  BIAYA: SEED_TARIF_BIAYA,
  TAGIHAN: [],
  BANK_SOAL: [],
  UJIAN: [],
  SPMB_PENDAFTAR: [],
  MENU: [
    { MenuID: 'MN-01', ParentID: 'ROOT', NamaMenu: 'Dashboard Utama', Icon: 'LayoutDashboard', URL: '/dashboard', Urutan: 1, Status: 'AKTIF', idMenu: 'MN-01', namaMenu: 'Dashboard Utama', icon: 'LayoutDashboard', route: '/dashboard', parentMenu: 'ROOT', urutan: 1, aktif: 'YA' },
    { MenuID: 'MN-02', ParentID: 'ROOT', NamaMenu: 'Master Data', Icon: 'Database', URL: '/master-data', Urutan: 2, Status: 'AKTIF', idMenu: 'MN-02', namaMenu: 'Master Data', icon: 'Database', route: '/master-data', parentMenu: 'ROOT', urutan: 2, aktif: 'YA' },
    { MenuID: 'MN-03', ParentID: 'ROOT', NamaMenu: 'SPMB / PPDB Online', Icon: 'UserPlus', URL: '/spmb', Urutan: 3, Status: 'AKTIF', idMenu: 'MN-03', namaMenu: 'SPMB / PPDB Online', icon: 'UserPlus', route: '/spmb', parentMenu: 'ROOT', urutan: 3, aktif: 'YA' },
    { MenuID: 'MN-04', ParentID: 'ROOT', NamaMenu: 'Akademik & Presensi', Icon: 'GraduationCap', URL: '/akademik', Urutan: 4, Status: 'AKTIF', idMenu: 'MN-04', namaMenu: 'Akademik & Presensi', icon: 'GraduationCap', route: '/akademik', parentMenu: 'ROOT', urutan: 4, aktif: 'YA' },
    { MenuID: 'MN-05', ParentID: 'ROOT', NamaMenu: 'Ujian Online CBT', Icon: 'Laptop', URL: '/cbt', Urutan: 5, Status: 'AKTIF', idMenu: 'MN-05', namaMenu: 'Ujian Online CBT', icon: 'Laptop', route: '/cbt', parentMenu: 'ROOT', urutan: 5, aktif: 'YA' },
    { MenuID: 'MN-06', ParentID: 'ROOT', NamaMenu: 'Penugasan Siswa', Icon: 'FileCheck', URL: '/penugasan', Urutan: 6, Status: 'AKTIF', idMenu: 'MN-06', namaMenu: 'Penugasan Siswa', icon: 'FileCheck', route: '/penugasan', parentMenu: 'ROOT', urutan: 6, aktif: 'YA' },
    { MenuID: 'MN-07', ParentID: 'ROOT', NamaMenu: 'Keuangan & Tagihan', Icon: 'CreditCard', URL: '/keuangan', Urutan: 7, Status: 'AKTIF', idMenu: 'MN-07', namaMenu: 'Keuangan & Tagihan', icon: 'CreditCard', route: '/keuangan', parentMenu: 'ROOT', urutan: 7, aktif: 'YA' },
    { MenuID: 'MN-08', ParentID: 'ROOT', NamaMenu: 'Bimbingan Konseling', Icon: 'HeartHandshake', URL: '/bk', Urutan: 8, Status: 'AKTIF', idMenu: 'MN-08', namaMenu: 'Bimbingan Konseling', icon: 'HeartHandshake', route: '/bk', parentMenu: 'ROOT', urutan: 8, aktif: 'YA' },
    { MenuID: 'MN-09', ParentID: 'ROOT', NamaMenu: 'Inventory & Aset', Icon: 'Package', URL: '/inventory', Urutan: 9, Status: 'AKTIF', idMenu: 'MN-09', namaMenu: 'Inventory & Aset', icon: 'Package', route: '/inventory', parentMenu: 'ROOT', urutan: 9, aktif: 'YA' },
    { MenuID: 'MN-10', ParentID: 'ROOT', NamaMenu: 'Dokumen & Surat', Icon: 'FolderKanban', URL: '/dokumen', Urutan: 10, Status: 'AKTIF', idMenu: 'MN-10', namaMenu: 'Dokumen & Surat', icon: 'FolderKanban', route: '/dokumen', parentMenu: 'ROOT', urutan: 10, aktif: 'YA' },
    { MenuID: 'MN-11', ParentID: 'ROOT', NamaMenu: 'Laporan & Analytics', Icon: 'BarChart3', URL: '/laporan', Urutan: 11, Status: 'AKTIF', idMenu: 'MN-11', namaMenu: 'Laporan & Analytics', icon: 'BarChart3', route: '/laporan', parentMenu: 'ROOT', urutan: 11, aktif: 'YA' },
    { MenuID: 'MN-12', ParentID: 'ROOT', NamaMenu: 'Riwayat Audit Log', Icon: 'History', URL: '/riwayat', Urutan: 12, Status: 'AKTIF', idMenu: 'MN-12', namaMenu: 'Riwayat Audit Log', icon: 'History', route: '/riwayat', parentMenu: 'ROOT', urutan: 12, aktif: 'YA' },
    { MenuID: 'MN-13', ParentID: 'ROOT', NamaMenu: 'Pengaturan System', Icon: 'Settings', URL: '/pengaturan', Urutan: 13, Status: 'AKTIF', idMenu: 'MN-13', namaMenu: 'Pengaturan System', icon: 'Settings', route: '/pengaturan', parentMenu: 'ROOT', urutan: 13, aktif: 'YA' }
  ],
  HAK_AKSES: [
    // 1. SUPERADMIN (All 13 Menus)
    { id: 'HA-001', role: 'SUPERADMIN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-002', role: 'SUPERADMIN', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-003', role: 'SUPERADMIN', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-004', role: 'SUPERADMIN', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-005', role: 'SUPERADMIN', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-006', role: 'SUPERADMIN', menuId: 'MN-06', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-007', role: 'SUPERADMIN', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-008', role: 'SUPERADMIN', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-009', role: 'SUPERADMIN', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-010', role: 'SUPERADMIN', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-011', role: 'SUPERADMIN', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-012', role: 'SUPERADMIN', menuId: 'MN-12', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-013', role: 'SUPERADMIN', menuId: 'MN-13', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },

    // 2. ADMIN
    { id: 'HA-014', role: 'ADMIN', menuId: 'MN-ALL', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    // 3. SYSTEM_ADMINISTRATOR
    { id: 'HA-015', role: 'SYSTEM_ADMINISTRATOR', menuId: 'MN-ALL', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    // 4. DEVELOPER
    { id: 'HA-016', role: 'DEVELOPER', menuId: 'MN-ALL', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    // 5. TECHNICAL_SUPPORT
    { id: 'HA-017', role: 'TECHNICAL_SUPPORT', menuId: 'MN-ALL', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },

    // 6. KETUA_YAYASAN
    { id: 'HA-018', role: 'KETUA_YAYASAN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-019', role: 'KETUA_YAYASAN', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-020', role: 'KETUA_YAYASAN', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-021', role: 'KETUA_YAYASAN', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-022', role: 'KETUA_YAYASAN', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-023', role: 'KETUA_YAYASAN', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-024', role: 'KETUA_YAYASAN', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-025', role: 'KETUA_YAYASAN', menuId: 'MN-12', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 7. PENGURUS_YAYASAN
    { id: 'HA-026', role: 'PENGURUS_YAYASAN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-027', role: 'PENGURUS_YAYASAN', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-028', role: 'PENGURUS_YAYASAN', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-029', role: 'PENGURUS_YAYASAN', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 8. PENGAWAS_YAYASAN
    { id: 'HA-030', role: 'PENGAWAS_YAYASAN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-031', role: 'PENGAWAS_YAYASAN', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-032', role: 'PENGAWAS_YAYASAN', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-033', role: 'PENGAWAS_YAYASAN', menuId: 'MN-12', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 9. KEPALA_SEKOLAH
    { id: 'HA-034', role: 'KEPALA_SEKOLAH', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-035', role: 'KEPALA_SEKOLAH', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-036', role: 'KEPALA_SEKOLAH', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-037', role: 'KEPALA_SEKOLAH', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-038', role: 'KEPALA_SEKOLAH', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-039', role: 'KEPALA_SEKOLAH', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-040', role: 'KEPALA_SEKOLAH', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-041', role: 'KEPALA_SEKOLAH', menuId: 'MN-12', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-042', role: 'KEPALA_SEKOLAH', menuId: 'MN-13', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 10. WAKASEK_KURIKULUM
    { id: 'HA-043', role: 'WAKASEK_KURIKULUM', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-044', role: 'WAKASEK_KURIKULUM', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-045', role: 'WAKASEK_KURIKULUM', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-046', role: 'WAKASEK_KURIKULUM', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-047', role: 'WAKASEK_KURIKULUM', menuId: 'MN-06', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-048', role: 'WAKASEK_KURIKULUM', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 11. WAKASEK_KESISWAAN
    { id: 'HA-049', role: 'WAKASEK_KESISWAAN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-050', role: 'WAKASEK_KESISWAAN', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-051', role: 'WAKASEK_KESISWAAN', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-052', role: 'WAKASEK_KESISWAAN', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-053', role: 'WAKASEK_KESISWAAN', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-054', role: 'WAKASEK_KESISWAAN', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 12. WAKASEK_SARPRAS
    { id: 'HA-055', role: 'WAKASEK_SARPRAS', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-056', role: 'WAKASEK_SARPRAS', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-057', role: 'WAKASEK_SARPRAS', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-058', role: 'WAKASEK_SARPRAS', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 13. WAKASEK_HUMAS
    { id: 'HA-059', role: 'WAKASEK_HUMAS', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-060', role: 'WAKASEK_HUMAS', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-061', role: 'WAKASEK_HUMAS', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-062', role: 'WAKASEK_HUMAS', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 14. KTU
    { id: 'HA-063', role: 'KTU', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-064', role: 'KTU', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-065', role: 'KTU', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-066', role: 'KTU', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-067', role: 'KTU', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-068', role: 'KTU', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-069', role: 'KTU', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 15. OPERATOR
    { id: 'HA-070', role: 'OPERATOR', menuId: 'MN-ALL', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },

    // 16. TU
    { id: 'HA-071', role: 'TU', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-072', role: 'TU', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-073', role: 'TU', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-074', role: 'TU', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-075', role: 'TU', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 17. BENDAHARA
    { id: 'HA-076', role: 'BENDAHARA', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-077', role: 'BENDAHARA', menuId: 'MN-02', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-078', role: 'BENDAHARA', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-079', role: 'BENDAHARA', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 18. KASIR
    { id: 'HA-080', role: 'KASIR', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-081', role: 'KASIR', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-082', role: 'KASIR', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 19. GURU
    { id: 'HA-083', role: 'GURU', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-084', role: 'GURU', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-085', role: 'GURU', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-086', role: 'GURU', menuId: 'MN-06', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-087', role: 'GURU', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-088', role: 'GURU', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 20. WALI_KELAS
    { id: 'HA-089', role: 'WALI_KELAS', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-090', role: 'WALI_KELAS', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-091', role: 'WALI_KELAS', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-092', role: 'WALI_KELAS', menuId: 'MN-06', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-093', role: 'WALI_KELAS', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-094', role: 'WALI_KELAS', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 21. BK
    { id: 'HA-095', role: 'BK', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-096', role: 'BK', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-097', role: 'BK', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-098', role: 'BK', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 22. PUSTAKAWAN
    { id: 'HA-099', role: 'PUSTAKAWAN', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-100', role: 'PUSTAKAWAN', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-101', role: 'PUSTAKAWAN', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 23. PETUGAS_UKS
    { id: 'HA-102', role: 'PETUGAS_UKS', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-103', role: 'PETUGAS_UKS', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-104', role: 'PETUGAS_UKS', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 24. INVENTARIS
    { id: 'HA-105', role: 'INVENTARIS', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-106', role: 'INVENTARIS', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-107', role: 'INVENTARIS', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-108', role: 'INVENTARIS', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 25. ADMIN_CBT
    { id: 'HA-109', role: 'ADMIN_CBT', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-110', role: 'ADMIN_CBT', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-111', role: 'ADMIN_CBT', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'YA' },
    { id: 'HA-112', role: 'ADMIN_CBT', menuId: 'MN-11', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 26. SISWA
    { id: 'HA-113', role: 'SISWA', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-114', role: 'SISWA', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-115', role: 'SISWA', menuId: 'MN-05', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-116', role: 'SISWA', menuId: 'MN-06', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-117', role: 'SISWA', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-118', role: 'SISWA', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 27. ORANG_TUA
    { id: 'HA-119', role: 'ORANG_TUA', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-120', role: 'ORANG_TUA', menuId: 'MN-04', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-121', role: 'ORANG_TUA', menuId: 'MN-07', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-122', role: 'ORANG_TUA', menuId: 'MN-08', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 28. ALUMNI
    { id: 'HA-123', role: 'ALUMNI', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-124', role: 'ALUMNI', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-125', role: 'ALUMNI', menuId: 'MN-12', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 29. VENDOR
    { id: 'HA-126', role: 'VENDOR', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-127', role: 'VENDOR', menuId: 'MN-09', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },
    { id: 'HA-128', role: 'VENDOR', menuId: 'MN-10', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 30. GUEST
    { id: 'HA-129', role: 'GUEST', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-130', role: 'GUEST', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },

    // 31. CALON_SISWA
    { id: 'HA-131', role: 'CALON_SISWA', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-132', role: 'CALON_SISWA', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' },

    // 32. ORTU_CALON_SISWA
    { id: 'HA-133', role: 'ORTU_CALON_SISWA', menuId: 'MN-01', dapatLihat: 'YA', dapatTambah: 'TIDAK', dapatEdit: 'TIDAK', dapatHapus: 'TIDAK' },
    { id: 'HA-134', role: 'ORTU_CALON_SISWA', menuId: 'MN-03', dapatLihat: 'YA', dapatTambah: 'YA', dapatEdit: 'YA', dapatHapus: 'TIDAK' }
  ],
  LOGS: [],
  AUDIT_LOG: [],
  NOTIFIKASI: [],
  WEB_DOWNLOADS: [],
  WEB_GALLERY: [],
  FORM_FIELDS: [
    { key: 'nama', label: 'Nama Lengkap Pendaftar', type: 'text', grid: '6', required: 'YA', show: 'YA', options: '', modul: 'SPMB', formId: 'pendaftaran_spmb', placeholder: 'Masukkan nama lengkap', urutan: 1, keterangan: 'Sesuai akta kelahiran' },
    { key: 'nisn', label: 'NISN (10 Digit)', type: 'text', grid: '6', required: 'YA', show: 'YA', options: '', modul: 'SPMB', formId: 'pendaftaran_spmb', placeholder: '0012345678', urutan: 2, keterangan: 'Nomor Induk Siswa Nasional resmi' },
    { key: 'nik', label: 'NIK KTP / KIA (16 Digit)', type: 'text', grid: '6', required: 'YA', show: 'YA', options: '', modul: 'SPMB', formId: 'pendaftaran_spmb', placeholder: '3171xxxxxxxxxxxx', urutan: 3, keterangan: 'NIK sesuai Kartu Keluarga' },
    { key: 'jk', label: 'Jenis Kelamin', type: 'select', grid: '6', required: 'YA', show: 'YA', options: 'Laki-laki, Perempuan', modul: 'SPMB', formId: 'pendaftaran_spmb', placeholder: 'Pilih jenis kelamin', urutan: 4, keterangan: 'Jenis kelamin pendaftar' },
    { key: 'noHp', label: 'Nomor WhatsApp Aktif', type: 'text', grid: '6', required: 'YA', show: 'YA', options: '', modul: 'SPMB', formId: 'pendaftaran_spmb', placeholder: '0812xxxxxxxx', urutan: 5, keterangan: 'Untuk notifikasi SPMB & info sekolah' },
    { key: 'riwayatPenyakit', label: 'Riwayat Alergi / Penyakit', type: 'textarea', grid: '12', required: 'TIDAK', show: 'YA', options: '', modul: 'SISWA', formId: 'biodata_siswa', placeholder: 'Tulis alergi atau kondisi kesehatan khusus', urutan: 6, keterangan: 'Catatan rekam medis darurat sekolah' },
    { key: 'ukuranBaju', label: 'Ukuran Seragam Sekolah', type: 'dropdown', grid: '6', required: 'YA', show: 'YA', options: 'S, M, L, XL, XXL, Custom', modul: 'SISWA', formId: 'biodata_siswa', placeholder: 'Pilih ukuran', urutan: 7, keterangan: 'Untuk pesanan atribut seragam' },
    { key: 'nomorRekening', label: 'Nomor Rekening Bank Guru', type: 'text', grid: '6', required: 'TIDAK', show: 'YA', options: '', modul: 'GURU', formId: 'profil_guru', placeholder: 'Nomor rekening payroll', urutan: 8, keterangan: 'Untuk transfer insentif / honor' },
    { key: 'namaBank', label: 'Nama Bank Penerima', type: 'dropdown', grid: '6', required: 'TIDAK', show: 'YA', options: 'BCA, Mandiri, BNI, BRI, BSI, Bank DKI', modul: 'GURU', formId: 'profil_guru', placeholder: 'Pilih Bank', urutan: 9, keterangan: 'Bank buku tabungan guru' },
    { key: 'metodeBayarPilihan', label: 'Metode Pembayaran Pilihan', type: 'dropdown', grid: '6', required: 'YA', show: 'YA', options: 'Transfer Bank, QRIS, Tunai di Kasir', modul: 'KEUANGAN', formId: 'pembayaran_spp', placeholder: 'Pilih metode', urutan: 10, keterangan: 'Preferensi bayar wali murid' },
    { key: 'nomorSeriBarang', label: 'Nomor Seri Pabrik (SN)', type: 'text', grid: '6', required: 'TIDAK', show: 'YA', options: '', modul: 'SARPRAS', formId: 'inventaris_barang', placeholder: 'Serial Number resmi', urutan: 11, keterangan: 'Nomor seri fisik barang aset' },
    { key: 'rekomendasiBK', label: 'Rekomendasi Bimbingan Konseling', type: 'textarea', grid: '12', required: 'TIDAK', show: 'YA', options: '', modul: 'BK', formId: 'konseling_siswa', placeholder: 'Catatan rekomendasi konselor', urutan: 12, keterangan: 'Tindak lanjut bimbingan belajar/karir' }
  ],
  WEB_CONFIG: [
    { appName: 'SISTA ROMBEL 56', judulSidebar: 'E-Sekolah Terpadu', logoUrl: '', heroImageUrl: '', teksHero: 'Selamat Datang di Portal Resmi Sekolah Terpadu', heroBaris1: 'Pendidikan Berkualitas', heroBaris2: 'Berkarakter & Berprestasi', heroSubteks: 'Mewujudkan Generasi Unggul Berteknologi', footerJudul: 'SISTA ROMBEL 56', footerAlamat: 'Jl. Laksa II No.12, RT.012 RW.002, Jakarta Barat', footerTelepon: '021-5551234', footerEmail: 'info@rombel.sch.id', footerHakCipta: '© 2026 SISTA ROMBEL 56. All rights reserved.', linkFb: '#', linkIg: '#', linkYt: '#', pendaftaranStatus: 'BUKA', alur1_judul: 'Isi Formulir', alur1_desc: 'Lengkapi 36 kolom biodata pendaftar', alur2_judul: 'Unggah Berkas', alur2_desc: 'Upload KK, Akta, KTP, dan Ijazah', alur3_judul: 'Verifikasi', alur3_desc: 'Panitia mengecek keabsahan dokumen', alur4_judul: 'Pengumuman', alur4_desc: 'Cek status kelulusan secara online' }
  ],
  JENJANG: SEED_JENJANG,
  MAPEL: SEED_MAPEL,
  TAHUN_AJARAN: SEED_TAHUN_AJARAN,
  SEMESTER: SEED_SEMESTER,
  HARI_LIBUR: SEED_HARI_LIBUR,
  JADWAL: [],
  AGENDA: [],
  CP_ATP: OFFICIAL_CP_ATP_DATA,
  NILAI: [],
  RAPOR: [],
  KENAIKAN_KELAS: [],
  KELULUSAN: [],
  ABSENSI_GURU: [],
  QR_LOG: [],
  LOG_UJIAN: [],
  TOKEN: [],
  DRAFT_JAWABAN: [],
  HASIL_UJIAN: [],
  JENIS_UJIAN: [],
  TUGAS: [],
  HASIL_TUGAS: [],
  MASTER_SILABUS: [],
  KURIKULUM_MODUL: [],
  ANALISIS_SOAL: [],
  TABUNGAN: [],
  KAS: [],
  PENGELUARAN: [],
  INVOICE: [],
  BIMBINGAN: [],
  PELANGGARAN: [],
  BARANG: [],
  PEMELIHARAAN: [],
  PEMINJAMAN_BARANG: [],
  FILE: [],
  ARSIP: [],
  BACKUP: [],
  SUARA_KOMUNITAS: []
};
