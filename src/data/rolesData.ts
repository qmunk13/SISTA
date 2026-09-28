export interface ModulePermission {
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  approve?: boolean;
  customNote?: string;
}

export type TabKey =
  | 'dashboard'
  | 'master-data'
  | 'spmb'
  | 'akademik'
  | 'ujian-cbt'
  | 'penugasan'
  | 'keuangan'
  | 'bk'
  | 'inventaris'
  | 'dokumen-surat'
  | 'laporan'
  | 'riwayat-arsip'
  | 'pengaturan'
  | 'perpustakaan'
  | 'whatsapp'
  | 'ekskul'
  | 'mading-berita'
  | 'portal-publik';

export interface UserRoleItem {
  id: string; // e.g. 'RL-001'
  namaRole: string; // e.g. 'SUPERADMIN'
  deskripsi: string; // e.g. 'Super Administrator Sistem & Penuh Kontrol'
  level: number; // 1 s/d 6
  kategori: 'Sistem & IT' | 'Yayasan & Audit' | 'Pimpinan Sekolah' | 'Tata Usaha' | 'Keuangan' | 'Tenaga Pendidik' | 'Layanan Khusus' | 'Siswa & Publik';
  badgeColor: string;
  defaultLandingTab: TabKey;
  allowedTabs: TabKey[];
  generalActions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canApprove: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canBackup: boolean;
  };
  deskripsiAkses: string;
}

export const ALL_32_ROLES: UserRoleItem[] = [
  // 1. SISTEM & IT (LEVEL 1-3)
  {
    id: 'RL-001',
    namaRole: 'SUPERADMIN',
    deskripsi: 'Super Administrator Sistem & Penuh Kontrol',
    level: 1,
    kategori: 'Sistem & IT',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'master-data', 'spmb', 'akademik', 'ujian-cbt',
      'penugasan', 'keuangan', 'bk', 'inventaris', 'dokumen-surat',
      'laporan', 'riwayat-arsip', 'pengaturan', 'perpustakaan', 'whatsapp', 'ekskul', 'mading-berita', 'portal-publik'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: true, canManageUsers: true, canManageSettings: true, canBackup: true
    },
    deskripsiAkses: 'Akses penuh tanpa batas ke seluruh modul aplikasi, manajemen database, integrasi sistem, konfigurasi RBAC, & log audit lengkap.'
  },
  {
    id: 'RL-002',
    namaRole: 'ADMIN',
    deskripsi: 'Administrator Aplikasi & Manajemen Sistem',
    level: 2,
    kategori: 'Sistem & IT',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'master-data', 'spmb', 'akademik', 'ujian-cbt',
      'penugasan', 'keuangan', 'bk', 'inventaris', 'dokumen-surat',
      'laporan', 'riwayat-arsip', 'pengaturan', 'perpustakaan', 'whatsapp', 'ekskul', 'mading-berita', 'portal-publik'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: true, canManageUsers: true, canManageSettings: true, canBackup: false
    },
    deskripsiAkses: 'Pengelolaan operasional seluruh modul data, akun staf, sinkronisasi Google Sheets, cetak laporan eksekutif.'
  },
  {
    id: 'RL-003',
    namaRole: 'SYSTEM_ADMINISTRATOR',
    deskripsi: 'Pengelola Infrastruktur & Server Database',
    level: 2,
    kategori: 'Sistem & IT',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultLandingTab: 'pengaturan',
    allowedTabs: [
      'dashboard', 'master-data', 'inventaris', 'riwayat-arsip', 'pengaturan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: false, canManageUsers: true, canManageSettings: true, canBackup: true
    },
    deskripsiAkses: 'Fokus pada keandalan seluruh tabel master database, sinkronisasi API/GAS, backup/restore data, dan inventaris server IT.'
  },
  {
    id: 'RL-004',
    namaRole: 'DEVELOPER',
    deskripsi: 'Pengembang Aplikasi & Kode Web Script',
    level: 2,
    kategori: 'Sistem & IT',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    defaultLandingTab: 'pengaturan',
    allowedTabs: [
      'dashboard', 'master-data', 'dokumen-surat', 'riwayat-arsip', 'pengaturan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: true, canBackup: true
    },
    deskripsiAkses: 'Pengaturan CMS Portal, debugging skrip integrasi, pengujian form SPMB dinamis, dan penyesuaian skema database.'
  },
  {
    id: 'RL-005',
    namaRole: 'TECHNICAL_SUPPORT',
    deskripsi: 'Dukungan Teknis Perangkat & Aplikasi',
    level: 3,
    kategori: 'Sistem & IT',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'ujian-cbt', 'master-data', 'inventaris', 'pengaturan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pendampingan kendala teknis ujian CBT online, bantuan verifikasi data siswa/guru, dan pemeliharaan perangkat sarpras.'
  },

  // 2. YAYASAN & AUDIT (LEVEL 1-2)
  {
    id: 'RL-006',
    namaRole: 'KETUA_YAYASAN',
    deskripsi: 'Pimpinan Tertinggi Yayasan Pendidikan',
    level: 1,
    kategori: 'Yayasan & Audit',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'keuangan', 'laporan', 'master-data', 'inventaris', 'dokumen-surat', 'riwayat-arsip'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Tinjauan strategis eksekutif: rekapitulasi keuangan, persetujuan anggaran besar, audit inventaris aset yayasan, dan SK yayasan.'
  },
  {
    id: 'RL-007',
    namaRole: 'PENGURUS_YAYASAN',
    deskripsi: 'Pengurus Harian & Manajemen Yayasan',
    level: 2,
    kategori: 'Yayasan & Audit',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'keuangan', 'laporan', 'master-data', 'spmb', 'inventaris', 'dokumen-surat'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pengawasan operasional harian sekolah, rekapitulasi penerimaan SPMB, data kepegawaian guru/GTK, dan anggaran kas.'
  },
  {
    id: 'RL-008',
    namaRole: 'PENGAWAS_YAYASAN',
    deskripsi: 'Tim Audit & Pengawas Internal Yayasan',
    level: 2,
    kategori: 'Yayasan & Audit',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    defaultLandingTab: 'laporan',
    allowedTabs: [
      'dashboard', 'laporan', 'keuangan', 'riwayat-arsip', 'akademik', 'inventaris', 'dokumen-surat'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Audit data finansial, verifikasi kepatuhan kurikulum/akademik, validasi buku induk arsip, dan ekspor data pengawasan.'
  },

  // 3. PIMPINAN SEKOLAH & WAKASEK (LEVEL 2-3)
  {
    id: 'RL-009',
    namaRole: 'KEPALA_SEKOLAH',
    deskripsi: 'Pimpinan Unit Sekolah & Penanggung Jawab',
    level: 2,
    kategori: 'Pimpinan Sekolah',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'master-data', 'spmb', 'akademik', 'ujian-cbt', 'penugasan',
      'keuangan', 'bk', 'inventaris', 'dokumen-surat', 'laporan', 'riwayat-arsip'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Otoritas tertinggi unit sekolah: pengesahan rapor, penerimaan siswa SPMB, persetujuan mutasi, surat keputusan, dan monitoring nilai.'
  },
  {
    id: 'RL-010',
    namaRole: 'WAKASEK_KURIKULUM',
    deskripsi: 'Wakil Kepala Sekolah Bidang Kurikulum',
    level: 3,
    kategori: 'Pimpinan Sekolah',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    defaultLandingTab: 'akademik',
    allowedTabs: [
      'dashboard', 'akademik', 'penugasan', 'ujian-cbt', 'master-data', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Perumusan struktur kurikulum, jadwal pelajaran, pembagian tugas mengajar, bank soal ujian, dan leger nilai raport.'
  },
  {
    id: 'RL-011',
    namaRole: 'WAKASEK_KESISWAAN',
    deskripsi: 'Wakil Kepala Sekolah Bidang Kesiswaan',
    level: 3,
    kategori: 'Pimpinan Sekolah',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLandingTab: 'spmb',
    allowedTabs: [
      'dashboard', 'spmb', 'bk', 'master-data', 'akademik', 'penugasan', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Koordinator penerimaan siswa baru SPMB, pembinaan kedisiplinan BK, prestasi lomba kesiswaan, dan ekstrakurikuler.'
  },
  {
    id: 'RL-012',
    namaRole: 'WAKASEK_SARPRAS',
    deskripsi: 'Wakil Kepala Sekolah Sarana & Prasarana',
    level: 3,
    kategori: 'Pimpinan Sekolah',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    defaultLandingTab: 'inventaris',
    allowedTabs: [
      'dashboard', 'inventaris', 'dokumen-surat', 'laporan', 'master-data'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Perencanaan pengadaan aset sekolah, perawatan sarana prasarana, persetujuan peminjaman ruangan/fasilitas, dan audit fisik.'
  },
  {
    id: 'RL-013',
    namaRole: 'WAKASEK_HUMAS',
    deskripsi: 'Wakil Kepala Sekolah Hubungan Masyarakat',
    level: 3,
    kategori: 'Pimpinan Sekolah',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    defaultLandingTab: 'dokumen-surat',
    allowedTabs: [
      'dashboard', 'dokumen-surat', 'spmb', 'laporan', 'pengaturan', 'master-data'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pengelolaan publikasi berita/prestasi, surat kemitraan eksternal, promosi SPMB, dan jejaring alumni.'
  },

  // 4. TATA USAHA & ADMINISTRASI (LEVEL 3-4)
  {
    id: 'RL-014',
    namaRole: 'KTU',
    deskripsi: 'Kepala Tata Usaha (Administrasi Utama)',
    level: 3,
    kategori: 'Tata Usaha',
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
    defaultLandingTab: 'dokumen-surat',
    allowedTabs: [
      'dashboard', 'master-data', 'dokumen-surat', 'spmb', 'riwayat-arsip', 'laporan', 'keuangan', 'inventaris'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Koordinasi tata usaha: penomoran surat dinas, legalisir, arsip buku induk, verifikasi berkas SPMB, dan pengawasan staf TU.'
  },
  {
    id: 'RL-015',
    namaRole: 'OPERATOR',
    deskripsi: 'Operator DAPODIK & Entri Master Data',
    level: 4,
    kategori: 'Tata Usaha',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultLandingTab: 'master-data',
    allowedTabs: [
      'dashboard', 'master-data', 'spmb', 'riwayat-arsip', 'laporan', 'pengaturan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Entri & pemutakhiran data induk siswa/guru/rombel Dapodik, sinkronisasi Google Spreadsheet, dan ekspor data pokok.'
  },
  {
    id: 'RL-016',
    namaRole: 'TU',
    deskripsi: 'Staf Tata Usaha & Surat Menyurat',
    level: 4,
    kategori: 'Tata Usaha',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    defaultLandingTab: 'dokumen-surat',
    allowedTabs: [
      'dashboard', 'dokumen-surat', 'master-data', 'riwayat-arsip', 'spmb'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Penerbitan surat keterangan aktif/pindah, agenda surat masuk & keluar, pengarsipan berkas siswa, dan cetak dokumen resmi.'
  },

  // 5. KEUANGAN & KASIR (LEVEL 3-4)
  {
    id: 'RL-017',
    namaRole: 'BENDAHARA',
    deskripsi: 'Bendahara Sekolah & Pengelola Keuangan',
    level: 3,
    kategori: 'Keuangan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultLandingTab: 'keuangan',
    allowedTabs: [
      'dashboard', 'keuangan', 'laporan', 'master-data', 'dokumen-surat'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Manajemen pos tarif iuran, buku kas masuk/keluar, penggajian staf, laporan neraca keuangan, dan rekonsiliasi pembayaran.'
  },
  {
    id: 'RL-018',
    namaRole: 'KASIR',
    deskripsi: 'Petugas Loket Pembayaran & Tagihan',
    level: 4,
    kategori: 'Keuangan',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    defaultLandingTab: 'keuangan',
    allowedTabs: [
      'dashboard', 'keuangan'
    ],
    generalActions: {
      canCreate: true, canEdit: false, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Loket penerimaan kasir iuran/uang kegiatan, cetak kuitansi bukti bayar, dan rekapitulasi setoran kas harian.'
  },

  // 6. TENAGA PENDIDIK & PEMBINA (LEVEL 4)
  {
    id: 'RL-019',
    namaRole: 'GURU',
    deskripsi: 'Tenaga Pendidik & Pengajar Matapelajaran',
    level: 4,
    kategori: 'Tenaga Pendidik',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    defaultLandingTab: 'akademik',
    allowedTabs: [
      'dashboard', 'akademik', 'penugasan', 'ujian-cbt', 'bk', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Input nilai formatif/sumatif, presensi harian mengajar, buat materi tugas siswa, dan buat bank soal ujian CBT.'
  },
  {
    id: 'RL-020',
    namaRole: 'WALI_KELAS',
    deskripsi: 'Pembimbing & Penanggung Jawab Kelas',
    level: 4,
    kategori: 'Tenaga Pendidik',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    defaultLandingTab: 'akademik',
    allowedTabs: [
      'dashboard', 'akademik', 'master-data', 'penugasan', 'bk', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Rekap kehadiran rombel binaan, input catatan karakter & ekstrakurikuler, cetak buku raport siswa, dan rekomendasi kenaikan kelas.'
  },
  {
    id: 'RL-021',
    namaRole: 'BK',
    deskripsi: 'Guru Bimbingan Konseling & Kedisiplinan',
    level: 4,
    kategori: 'Tenaga Pendidik',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    defaultLandingTab: 'bk',
    allowedTabs: [
      'dashboard', 'bk', 'master-data', 'akademik', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pencatatan sesi konseling ramah anak, poin pelanggaran & pembinaan, rekap kejuaraan prestasi siswa, dan rekomendasi karir/SMP.'
  },
  {
    id: 'RL-025',
    namaRole: 'ADMIN_CBT',
    deskripsi: 'Proktor & Administrator Ujian CBT',
    level: 4,
    kategori: 'Tenaga Pendidik',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    defaultLandingTab: 'ujian-cbt',
    allowedTabs: [
      'dashboard', 'ujian-cbt', 'akademik', 'master-data'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: true, canExport: true,
      canApprove: true, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Rilis token ujian CBT, atur sesi ujian, monitor peserta realtime, reset login peserta ujian, dan unduh analisis butir soal.'
  },

  // 7. LAYANAN KHUSUS & SARPRAS (LEVEL 4)
  {
    id: 'RL-022',
    namaRole: 'PUSTAKAWAN',
    deskripsi: 'Pengelola Perpustakaan & Literasi',
    level: 4,
    kategori: 'Layanan Khusus',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultLandingTab: 'perpustakaan',
    allowedTabs: [
      'dashboard', 'perpustakaan', 'inventaris', 'master-data'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Katalogisasi buku perpustakaan, sirkulasi peminjaman/pengembalian buku paket, dan rekap minat literasi siswa.'
  },
  {
    id: 'RL-023',
    namaRole: 'PETUGAS_UKS',
    deskripsi: 'Pengelola Kesehatan Sekolah & UKS',
    level: 4,
    kategori: 'Layanan Khusus',
    badgeColor: 'bg-red-100 text-red-700 border-red-200',
    defaultLandingTab: 'bk',
    allowedTabs: [
      'dashboard', 'bk', 'master-data', 'inventaris'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pencatatan riwayat kesehatan siswa, inventaris obat/alat medis UKS, dan penanganan siswa berhalangan sakit.'
  },
  {
    id: 'RL-024',
    namaRole: 'INVENTARIS',
    deskripsi: 'Petugas Aset & Logistik Barang',
    level: 4,
    kategori: 'Layanan Khusus',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    defaultLandingTab: 'inventaris',
    allowedTabs: [
      'dashboard', 'inventaris', 'master-data', 'laporan'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Labelisasi barcode aset, cek kondisi kelayakan sarpras, mutasi penempatan barang antar ruangan, dan kartu inventaris.'
  },

  // 8. SISWA, ORANG TUA & PUBLIK (LEVEL 5-6)
  {
    id: 'RL-026',
    namaRole: 'SISWA',
    deskripsi: 'Peserta Didik Aktif Sekolah',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    defaultLandingTab: 'akademik',
    allowedTabs: [
      'dashboard', 'akademik', 'ujian-cbt', 'penugasan', 'keuangan', 'bk'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Kerjakan ujian CBT, kumpulkan tugas guru, lihat jadwal pelajaran, cek nilai/raport pribadi, cek status tagihan biaya, dan lihat poin prestasi.'
  },
  {
    id: 'RL-027',
    namaRole: 'ORANG_TUA',
    deskripsi: 'Orang Tua / Wali Murid Siswa',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'akademik', 'keuangan', 'bk', 'penugasan'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pantau kehadiran absensi anak, lihat nilai raport anak, riwayat kuitansi pembayaran biaya pendidikan, dan catatan bimbingan guru.'
  },
  {
    id: 'RL-028',
    namaRole: 'CALON_SISWA',
    deskripsi: 'Pendaftar PPDB / SPMB Baru',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultLandingTab: 'spmb',
    allowedTabs: [
      'spmb'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pengisian formulir pendaftaran PPDB, upload berkas digital (Akta/KK), cetak kartu pendaftaran, dan cek hasil pengumuman kelulusan seleksi.'
  },
  {
    id: 'RL-029',
    namaRole: 'ORTU_CALON_SISWA',
    deskripsi: 'Orang Tua / Wali Calon Pendaftar',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    defaultLandingTab: 'spmb',
    allowedTabs: [
      'spmb'
    ],
    generalActions: {
      canCreate: true, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Lengkapi biodata orang tua calon siswa baru dan pantau status verifikasi berkas admisi SPMB.'
  },
  {
    id: 'RL-030',
    namaRole: 'ALUMNI',
    deskripsi: 'Lulusan & Peserta Alumni Sekolah',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    defaultLandingTab: 'riwayat-arsip',
    allowedTabs: [
      'riwayat-arsip', 'master-data'
    ],
    generalActions: {
      canCreate: false, canEdit: true, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Pengisian kuisioner tracer study karir/kuliah, permohonan legalisir ijazah online, dan arsip kenangan kelulusan.'
  },
  {
    id: 'RL-031',
    namaRole: 'VENDOR',
    deskripsi: 'Mitra Penyedia & Rekanan Sekolah',
    level: 5,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    defaultLandingTab: 'inventaris',
    allowedTabs: [
      'inventaris', 'dokumen-surat'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: true,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Akses terbatas untuk konfirmasi pengiriman barang pengadaan sarpras dan surat pesanan resmi.'
  },
  {
    id: 'RL-032',
    namaRole: 'GUEST',
    deskripsi: 'Pengunjung Umum / Akses Publik',
    level: 6,
    kategori: 'Siswa & Publik',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
    defaultLandingTab: 'dashboard',
    allowedTabs: [
      'dashboard', 'spmb'
    ],
    generalActions: {
      canCreate: false, canEdit: false, canDelete: false, canExport: false,
      canApprove: false, canManageUsers: false, canManageSettings: false, canBackup: false
    },
    deskripsiAkses: 'Melihat profil umum sekolah, berita publik, agenda terbuka, info pendaftaran SPMB, dan galeri kegiatan.'
  }
];

export const getRoleById = (id: string): UserRoleItem => {
  return ALL_32_ROLES.find(r => r.id === id) || ALL_32_ROLES[0];
};

export const getRoleByName = (name: string): UserRoleItem => {
  const clean = name.trim().toUpperCase();
  return ALL_32_ROLES.find(r => r.namaRole === clean) || ALL_32_ROLES[0];
};
