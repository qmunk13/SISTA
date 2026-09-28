import * as XLSX from 'xlsx';
import { MASTER_TABLES_60, TableSchema } from './masterDatabase60';

export interface MenuDataStructureRow {
  no: number;
  sidebarMenu: string;
  idMenu: string;
  namaMenuModul: string;
  namaSheet: string;
  headerSheet: string;
  namaListTampilan: string;
  type: string;
  grid: string;
  keterangan: string;
  statusTampil: 'ya' | 'Tidak';
  icon: string;
  contohIsian: string;
}

export interface SidebarSummaryItem {
  no: number;
  sidebarName: string;
  totalTables: number;
  totalColumns: number;
  tablesList: string;
}

// Table configurations with accurate sidebar groupings matching 18 App Sidebars
export const TABLE_CONFIG: Record<string, { sidebar: string; namaMenu: string; icon: string; subUrutan: number }> = {
  // SIDEBAR 1: DASHBOARD UTAMA
  LOG: { sidebar: '1. Dashboard Utama', namaMenu: 'Log Aktivitas Pengguna Harian', icon: 'Activity', subUrutan: 1 },
  AUDIT_LOG: { sidebar: '1. Dashboard Utama', namaMenu: 'Audit Trail Riwayat Perubahan Data', icon: 'FileText', subUrutan: 2 },
  SESSIONS: { sidebar: '1. Dashboard Utama', namaMenu: 'Sesi Pengguna & Keamanan Login', icon: 'Shield', subUrutan: 3 },
  NOTIFIKASI: { sidebar: '1. Dashboard Utama', namaMenu: 'Pusat Notifikasi & Broadcast Sekolah', icon: 'Bell', subUrutan: 4 },

  // SIDEBAR 2: MASTER DATA
  SISWA: { sidebar: '2. Master Data', namaMenu: 'Buku Induk Biodata Siswa Dapodik 2027', icon: 'Users', subUrutan: 1 },
  ORANG_TUA: { sidebar: '2. Master Data', namaMenu: 'Data Detail Orang Tua / Wali Murid', icon: 'Heart', subUrutan: 2 },
  YATIM_PIATU: { sidebar: '2. Master Data', namaMenu: 'Data Siswa Yatim, Piatu & Afirmasi Bansos', icon: 'Award', subUrutan: 3 },
  REKAP_SISWA_KELURAHAN: { sidebar: '2. Master Data', namaMenu: 'Rekapitulasi Sebaran Siswa per Kelurahan & RW', icon: 'MapPin', subUrutan: 4 },
  PRESTASI_SISWA: { sidebar: '2. Master Data', namaMenu: 'Pencatatan Prestasi & Piagam Siswa', icon: 'Trophy', subUrutan: 5 },
  KENAIKAN_KELAS: { sidebar: '2. Master Data', namaMenu: 'Riwayat Kenaikan Tingkat & Mutasi Rombel', icon: 'TrendingUp', subUrutan: 6 },
  KELULUSAN: { sidebar: '2. Master Data', namaMenu: 'Penetapan Kelulusan Akhir & Nomor Ijazah', icon: 'GraduationCap', subUrutan: 7 },
  ALUMNI: { sidebar: '2. Master Data', namaMenu: 'Penelusuran Alumni & Tracer Study', icon: 'UserCheck', subUrutan: 8 },
  GURU: { sidebar: '2. Master Data', namaMenu: 'Buku Induk Tenaga Pendidik & Kependidikan (GTK)', icon: 'Briefcase', subUrutan: 9 },
  JABATAN_GTK: { sidebar: '2. Master Data', namaMenu: 'Struktur Penugasan & Jabatan GTK', icon: 'Layers', subUrutan: 10 },
  RIWAYAT_MENGAJAR: { sidebar: '2. Master Data', namaMenu: 'Riwayat Beban Jam Mengajar Guru', icon: 'Clock', subUrutan: 11 },

  // SIDEBAR 3: SPMB
  FORM_FIELDS: { sidebar: '13. Pengaturan', namaMenu: 'Form Builder Dinamis Seluruh Modul Aplikasi', icon: 'Sliders', subUrutan: 1 },
  SPMB_PENDAFTAR: { sidebar: '3. SPMB', namaMenu: 'Buku Registrasi Pendaftar Calon Siswa Baru', icon: 'UserPlus', subUrutan: 2 },
  SPMB_VERIFIKASI: { sidebar: '3. SPMB', namaMenu: 'Audit & Verifikasi Berkas Dokumen SPMB', icon: 'CheckCircle', subUrutan: 3 },
  SPMB_SELEKSI: { sidebar: '3. SPMB', namaMenu: 'Penilaian Ujian & Pembobotan Seleksi Masuk', icon: 'ClipboardCheck', subUrutan: 4 },
  SPMB_PENGUMUMAN: { sidebar: '3. SPMB', namaMenu: 'Publikasi Hasil Keputusan & SK Penerimaan', icon: 'Megaphone', subUrutan: 5 },
  SPMB_DAFTAR_ULANG: { sidebar: '3. SPMB', namaMenu: 'Registrasi Ulang & Penetapan Gugus MPLS', icon: 'BookmarkCheck', subUrutan: 6 },
  DAPODIK_VALIDASI: { sidebar: '3. SPMB', namaMenu: 'Audit Sinkronisasi & Residu Dapodik 2027', icon: 'ShieldCheck', subUrutan: 7 },

  // SIDEBAR 4: AKADEMIK
  TAHUN_AJARAN: { sidebar: '4. Akademik', namaMenu: 'Master Tahun Pelajaran Kalender Sekolah', icon: 'Calendar', subUrutan: 1 },
  SEMESTER: { sidebar: '4. Akademik', namaMenu: 'Master Semester Ajaran Berjalan', icon: 'Clock', subUrutan: 2 },
  JENJANG: { sidebar: '4. Akademik', namaMenu: 'Master Jenjang Pendidikan (Paket A/B/C/SD/SMP/SMA/SMK)', icon: 'Layers', subUrutan: 3 },
  KELAS: { sidebar: '4. Akademik', namaMenu: 'Master Rombongan Belajar (Rombel) & Tutor', icon: 'Home', subUrutan: 4 },
  MAPEL: { sidebar: '4. Akademik', namaMenu: 'Master Mata Pelajaran, Kurikulum & KKM', icon: 'BookOpen', subUrutan: 5 },
  HARI_LIBUR: { sidebar: '4. Akademik', namaMenu: 'Kalender Libur Pendidikan & Cuti Bersama', icon: 'CalendarX', subUrutan: 6 },
  JADWAL: { sidebar: '4. Akademik', namaMenu: 'Jadwal Pelajaran Mingguan & Ruangan KBM', icon: 'CalendarDays', subUrutan: 7 },
  AGENDA: { sidebar: '4. Akademik', namaMenu: 'Jurnal Agenda Harian Mengajar Guru di Kelas', icon: 'BookMarked', subUrutan: 8 },
  ABSENSI: { sidebar: '4. Akademik', namaMenu: 'Presensi Harian Siswa (QR Code & GPS Lokasi)', icon: 'QrCode', subUrutan: 9 },
  ABSENSI_GURU: { sidebar: '4. Akademik', namaMenu: 'Presensi Harian Kehadiran Guru & Staf GTK', icon: 'UserCheck', subUrutan: 10 },
  PERIZINAN: { sidebar: '4. Akademik', namaMenu: 'Perizinan & Dispensasi Terpadu (Siswa & Guru)', icon: 'FileCheck', subUrutan: 11 },
  IZIN_SAKIT_SISWA: { sidebar: '4. Akademik', namaMenu: 'Permohonan Izin & Sakit Siswa (Surat Dokter)', icon: 'FilePlus', subUrutan: 12 },
  IZIN_CUTI_GURU: { sidebar: '4. Akademik', namaMenu: 'Pengajuan Cuti & Izin Ketidakhadiran Guru', icon: 'FileText', subUrutan: 13 },
  REKAP_PRESENSI: { sidebar: '4. Akademik', namaMenu: 'Rekapitulasi Persentase Kehadiran Bulanan', icon: 'BarChart', subUrutan: 14 },
  QR_LOG: { sidebar: '4. Akademik', namaMenu: 'Log Pemindaian Barcode / QR Kartu Pelajar', icon: 'Scan', subUrutan: 15 },

  // SIDEBAR 5: UJIAN ONLINE
  BANK_SOAL: { sidebar: '5. Ujian Online', namaMenu: 'Bank Butir Soal Ujian & Bobot Penilaian', icon: 'FolderPlus', subUrutan: 1 },
  UJIAN: { sidebar: '5. Ujian Online', namaMenu: 'Jadwal Sesi Ujian CBT & Token Pengawas', icon: 'Clock', subUrutan: 2 },
  TOKEN: { sidebar: '5. Ujian Online', namaMenu: 'Token Sesi Ujian Online Aktif', icon: 'Key', subUrutan: 3 },
  SOAL: { sidebar: '5. Ujian Online', namaMenu: 'Distribusi Paket Butir Soal Ujian', icon: 'HelpCircle', subUrutan: 4 },
  JAWABAN: { sidebar: '5. Ujian Online', namaMenu: 'Lembar Jawaban Siswa & Kunci Pilihan Ganda', icon: 'CheckSquare', subUrutan: 5 },
  DRAFT_JAWABAN: { sidebar: '5. Ujian Online', namaMenu: 'Cadangan Realtime Jawaban Siswa (Anti-Hilang)', icon: 'Save', subUrutan: 6 },
  LOG_UJIAN: { sidebar: '5. Ujian Online', namaMenu: 'Log Pengawasan & Aktivitas Ujian Siswa', icon: 'AlertTriangle', subUrutan: 7 },
  HASIL_UJIAN: { sidebar: '5. Ujian Online', namaMenu: 'Rekapitulasi Nilai & Peringkat CBT', icon: 'Award', subUrutan: 8 },
  ANALISIS_SOAL: { sidebar: '5. Ujian Online', namaMenu: 'Analisis Butir Soal & Daya Pembeda', icon: 'TrendingUp', subUrutan: 9 },

  // SIDEBAR 6: PENUGASAN
  TUGAS: { sidebar: '6. Penugasan', namaMenu: 'Daftar Penugasan Online & PR Siswa', icon: 'Clipboard', subUrutan: 1 },
  PENGUMPULAN_TUGAS: { sidebar: '6. Penugasan', namaMenu: 'Pengumpulan & Penilaian Berkas Tugas Siswa', icon: 'CheckSquare', subUrutan: 2 },
  MATERI_DIGITAL: { sidebar: '6. Penugasan', namaMenu: 'Modul Ajar & Bahan Belajar Digital', icon: 'FileCode', subUrutan: 3 },
  CP_ATP: { sidebar: '6. Penugasan', namaMenu: 'Capaian & Alur Pembelajaran (CP/ATP)', icon: 'Target', subUrutan: 4 },
  NILAI: { sidebar: '6. Penugasan', namaMenu: 'Buku Nilai Asesmen Formatif & Sumatif', icon: 'Star', subUrutan: 5 },
  RAPOR: { sidebar: '6. Penugasan', namaMenu: 'Rekap Nilai Rapor & Catatan Wali Kelas', icon: 'FileSpreadsheet', subUrutan: 6 },
  MASTER_SILABUS: { sidebar: '6. Penugasan', namaMenu: 'Dataset Master Silabus Kurikulum Dokumen (15 Kolom)', icon: 'BookOpen', subUrutan: 7 },
  KURIKULUM_MODUL: { sidebar: '6. Penugasan', namaMenu: 'Data Master Modul Pembelajaran Kurikulum (11 Kolom)', icon: 'Layers', subUrutan: 8 },

  // SIDEBAR 7: KEUANGAN
  BIAYA: { sidebar: '7. Keuangan', namaMenu: 'Master Tarif Pos Biaya & SPP Sekolah', icon: 'Tag', subUrutan: 1 },
  TAGIHAN: { sidebar: '7. Keuangan', namaMenu: 'Daftar Tagihan Siswa & Jatuh Tempo', icon: 'CreditCard', subUrutan: 2 },
  PEMBAYARAN: { sidebar: '7. Keuangan', namaMenu: 'Kasir & Kuitansi Riwayat Pembayaran', icon: 'Receipt', subUrutan: 3 },
  INVOICE: { sidebar: '7. Keuangan', namaMenu: 'Faktur Tagihan Gabungan Siswa', icon: 'FileText', subUrutan: 4 },
  TABUNGAN: { sidebar: '7. Keuangan', namaMenu: 'Buku Rekening Tabungan Siswa', icon: 'PiggyBank', subUrutan: 5 },
  KAS: { sidebar: '7. Keuangan', namaMenu: 'Buku Kas Umum Operasional Sekolah', icon: 'DollarSign', subUrutan: 6 },
  PENGELUARAN: { sidebar: '7. Keuangan', namaMenu: 'Buku Pengeluaran & Belanja Operasional', icon: 'TrendingDown', subUrutan: 7 },
  JURNAL_UMUM: { sidebar: '7. Keuangan', namaMenu: 'Jurnal Akuntansi Umum Debit-Kredit', icon: 'Book', subUrutan: 8 },

  // SIDEBAR 8: BIMBINGAN KONSELING
  BIMBINGAN: { sidebar: '8. Bimbingan Konseling', namaMenu: 'Layanan Bimbingan Konseling Siswa', icon: 'Smile', subUrutan: 1 },
  PELANGGARAN: { sidebar: '8. Bimbingan Konseling', namaMenu: 'Catatan Pelanggaran Tata Tertib Siswa', icon: 'AlertOctagon', subUrutan: 2 },
  KARTU_POIN_SISWA: { sidebar: '8. Bimbingan Konseling', namaMenu: 'Kartu Akumulasi Poin Tata Tertib & Prestasi', icon: 'ShieldAlert', subUrutan: 3 },

  // SIDEBAR 9: INVENTARIS & ASET
  BARANG: { sidebar: '9. Inventaris & Aset', namaMenu: 'Master Aset Sarana & Prasarana Sekolah', icon: 'Package', subUrutan: 1 },
  PEMELIHARAAN: { sidebar: '9. Inventaris & Aset', namaMenu: 'Riwayat Servis & Pemeliharaan Barang', icon: 'Tool', subUrutan: 2 },
  PEMINJAMAN_BARANG: { sidebar: '9. Inventaris & Aset', namaMenu: 'Peminjaman Fasilitas & Alat Sekolah', icon: 'Truck', subUrutan: 3 },

  // SIDEBAR 10: DOKUMEN & SURAT
  SURAT_MASUK: { sidebar: '10. Dokumen & Surat', namaMenu: 'Buku Agenda Surat Masuk & Disposisi', icon: 'Inbox', subUrutan: 1 },
  SURAT_KELUAR: { sidebar: '10. Dokumen & Surat', namaMenu: 'Buku Agenda Nomor Surat Keluar Resmi', icon: 'Send', subUrutan: 2 },
  FILE: { sidebar: '10. Dokumen & Surat', namaMenu: 'Manajemen Berkas & Tautan Google Drive', icon: 'HardDrive', subUrutan: 3 },
  ARSIP: { sidebar: '10. Dokumen & Surat', namaMenu: 'Master Registrasi Arsip Dokumen Sekolah', icon: 'Archive', subUrutan: 4 },

  // SIDEBAR 12: E-PERPUSTAKAAN
  BUKU: { sidebar: '12. E-Perpustakaan', namaMenu: 'Katalog Buku Perpustakaan & Lokasi Rak', icon: 'Book', subUrutan: 1 },
  PEMINJAMAN: { sidebar: '12. E-Perpustakaan', namaMenu: 'Sirkulasi Peminjaman & Pengembalian Buku', icon: 'Bookmark', subUrutan: 2 },
  DENDA: { sidebar: '12. E-Perpustakaan', namaMenu: 'Catatan Denda Keterlambatan Pengembalian', icon: 'DollarSign', subUrutan: 3 },
  PENGUNJUNG_PERPUS: { sidebar: '12. E-Perpustakaan', namaMenu: 'Buku Tamu Presensi Pengunjung Perpustakaan', icon: 'Users', subUrutan: 4 },

  // SIDEBAR 13: WHATSAPP GATEWAY
  WA_LOG: { sidebar: '13. WhatsApp Gateway', namaMenu: 'Log Riwayat Notifikasi WhatsApp Gateway', icon: 'Smartphone', subUrutan: 1 },

  // SIDEBAR 14: EKSTRAKURIKULER & OSIS
  EKSKUL: { sidebar: '14. Ekstrakurikuler & OSIS', namaMenu: 'Master Kegiatan Ekstrakurikuler & Pembina', icon: 'Trophy', subUrutan: 1 },
  EKSKUL_ANGGOTA: { sidebar: '14. Ekstrakurikuler & OSIS', namaMenu: 'Data Anggota Ekskul & Penilaian Rapor', icon: 'Users', subUrutan: 2 },

  // SIDEBAR 15: MADING & BERITA
  MADING_BERITA: { sidebar: '15. Mading & Berita', namaMenu: 'Publikasi Berita, Agenda & Pengumuman Sekolah', icon: 'Newspaper', subUrutan: 1 },

  // SIDEBAR 16: PORTAL PUBLIK & WEB
  WEB_CONFIG: { sidebar: '16. Portal Publik & Web', namaMenu: 'Pengaturan Web Profil Sekolah & Banner Hero', icon: 'Globe', subUrutan: 1 },
  SUARA_KOMUNITAS: { sidebar: '16. Portal Publik & Web', namaMenu: 'Suara Komunitas, Aspirasi & Testimoni', icon: 'MessageSquare', subUrutan: 2 },

  // SIDEBAR 18: PENGATURAN SYSTEM
  SETTING: { sidebar: '18. Pengaturan System', namaMenu: 'Pengaturan Umum & Profil Sekolah', icon: 'Settings', subUrutan: 1 },
  REFERENSI: { sidebar: '18. Pengaturan System', namaMenu: 'Master Data Referensi Kode & Parameter', icon: 'Layers', subUrutan: 2 },
  USERS: { sidebar: '18. Pengaturan System', namaMenu: 'Manajemen Akun Pengguna & Kredensial Login', icon: 'Users', subUrutan: 3 },
  ROLE: { sidebar: '18. Pengaturan System', namaMenu: 'Definisi 32 Peran / Role Pengguna', icon: 'Shield', subUrutan: 4 },
  HAK_AKSES: { sidebar: '18. Pengaturan System', namaMenu: 'Matriks Perizinan Akses CRUD per Role', icon: 'Key', subUrutan: 5 },
  MENU: { sidebar: '18. Pengaturan System', namaMenu: 'Struktur Navigasi Modul & Menu Sistem', icon: 'Menu', subUrutan: 6 }
};

// Comprehensive Indonesian UI Field Labels Dictionary across all 88 tables
const KNOWN_FIELD_LABELS: Record<string, string> = {
  // Primary Keys & IDs
  nopdkt: 'Nomor Induk Siswa (No PDKT)',
  no_pdkt: 'Nomor Induk Siswa (No PDKT)',
  nisn: 'Nomor Induk Siswa Nasional (NISN)',
  nik: 'Nomor Induk Kependudukan (NIK)',
  nuptk: 'Nomor Unik Pendidik & Tenaga Kependidikan (NUPTK)',
  nip: 'Nomor Induk Pegawai (NIP)',
  nis: 'Nomor Induk Siswa (NIS)',
  tahunmasuk: 'Tahun Masuk Angkatan',
  namalengkap: 'Nama Lengkap Siswa',
  namasiswa: 'Nama Lengkap Siswa',
  jeniskelamin: 'Jenis Kelamin (L/P)',
  tempatlahir: 'Tempat Lahir',
  tanggallahir: 'Tanggal Lahir (YYYY-MM-DD)',
  anakke: 'Anak Ke- (Urutan Kelahiran)',
  saudara: 'Jumlah Saudara Kandung',
  agama: 'Agama / Kepercayaan',
  golongandarah: 'Golongan Darah (A/B/AB/O)',
  tinggibadancm: 'Tinggi Badan (cm)',
  beratbadankg: 'Berat Badan (kg)',
  prestasi: 'Catatan Prestasi & Piagam',
  hobi: 'Hobi & Minat Bakat Siswa',
  catatanpenting: 'Catatan Khusus / Kesehatan',
  alamat: 'Alamat Tempat Tinggal Lengkap',
  rt: 'Rukun Tetangga (RT)',
  rw: 'Rukun Warga (RW)',
  kelurahan: 'Kelurahan / Desa',
  kecamatan: 'Kecamatan',
  kota: 'Kota / Kabupaten',
  provinsi: 'Provinsi',
  kodepos: 'Kode Pos',
  jenistinggal: 'Jenis Tempat Tinggal (Bersama Ortu / Asrama / Kost)',
  alattransportasi: 'Transportasi ke Sekolah (Jalan Kaki / Motor / Angkutan)',
  nomorhp: 'Nomor HP / WhatsApp Aktif',
  email: 'Alamat Email',
  asalsekolah: 'Nama Asal Sekolah / Madrasah',
  skhun: 'Nomor Seri SKHUN / Ijazah Sebelumnya',
  penerimakps: 'Penerima Bantuan Sosial (KPS / PIP / KIP)',
  pasfoto: 'Pas Foto Resmi Siswa (URL Drive)',
  nomorkartukeluarga: 'Nomor Kartu Keluarga (16 Digit)',
  namaayah: 'Nama Lengkap Ayah Kandung',
  nikayah: 'NIK Ayah Kandung (16 Digit)',
  tempatlahirayah: 'Tempat Lahir Ayah',
  tanggallahirayah: 'Tanggal Lahir Ayah (YYYY-MM-DD)',
  pendidikanayah: 'Pendidikan Terakhir Ayah',
  pekerjaanayah: 'Pekerjaan Utama Ayah',
  penghasilanayah: 'Penghasilan Bulanan Ayah (Rp)',
  tlpayah: 'Nomor Telepon / WhatsApp Ayah',
  statusayah: 'Status Ayah (Masih Hidup / Wafat)',
  namaibu: 'Nama Lengkap Ibu Kandung',
  nikibu: 'NIK Ibu Kandung (16 Digit)',
  tempatlahiribu: 'Tempat Lahir Ibu',
  tanggallahiribu: 'Tanggal Lahir Ibu (YYYY-MM-DD)',
  pendidikanibu: 'Pendidikan Terakhir Ibu',
  pekerjaanibu: 'Pekerjaan Utama Ibu',
  penghasilanibu: 'Penghasilan Bulanan Ibu (Rp)',
  tlpibu: 'Nomor Telepon / WhatsApp Ibu',
  statusibu: 'Status Ibu (Masih Hidup / Wafat)',
  statusyatim: 'Status Yatim / Piatu (Lengkap / Yatim / Piatu / Yatim Piatu)',
  namawali: 'Nama Lengkap Wali Murid',
  tempatlahirwali: 'Tempat Lahir Wali Murid',
  tgllahirwali: 'Tanggal Lahir Wali Murid (YYYY-MM-DD)',
  pendidikanwali: 'Pendidikan Terakhir Wali Murid',
  pekerjaanwali: 'Pekerjaan Wali Murid',
  penghasilanwali: 'Penghasilan Bulanan Wali Murid (Rp)',
  hubungan: 'Hubungan Kekerabatan Wali',
  tlpwali: 'Nomor Telepon / WhatsApp Wali',
  aktakelahiran: 'Berkas Akta Kelahiran (URL Drive)',
  kartukeluarga: 'Berkas Kartu Keluarga (URL Drive)',
  kia: 'Kartu Identitas Anak / KIA (URL Drive)',
  ktpayah: 'KTP Ayah Kandung (URL Drive)',
  ktpibu: 'KTP Ibu Kandung (URL Drive)',
  ijazah: 'Ijazah Pendidikan Terakhir (URL Drive)',
  ktpwali: 'KTP Wali Murid (URL Drive)',
  rapor: 'Buku Rapor / Lembar Nilai (URL Drive)',
  spindah: 'Surat Keterangan Pindah Sekolah (URL Drive)',
  suket: 'Surat Keterangan Lainnya (URL Drive)',
  sdomisili: 'Surat Keterangan Domisili (URL Drive)',
  status: 'Status Keaktifan Data',
  kelassaatini: 'Kelas / Rombel Siswa Saat Ini',
  createdat: 'Waktu Dibuat Sistem (ISO)',
  updatedat: 'Waktu Terakhir Diperbarui (ISO)',
  password: 'Kata Sandi / Password Hash Terenkripsi',
  token: 'Token Autentikasi Sesi',

  // Log & Audit
  logid: 'ID Log Aktivitas',
  userid: 'ID Pengguna / Akun',
  username: 'Username Pengguna',
  aktivitas: 'Deskripsi Aktivitas Pengguna',
  modul: 'Nama Modul Sistem',
  ip: 'Alamat IP Pengguna',
  device: 'Perangkat / Device',
  browser: 'Web Browser',
  auditid: 'ID Audit Trail',
  tabel: 'Nama Tabel Terkait',
  recordid: 'ID Record yang Diubah',
  field: 'Nama Kolom / Field',
  valuelama: 'Nilai Sebelum Perubahan',
  valuebaru: 'Nilai Sesudah Perubahan',
  sessionid: 'ID Sesi Login',
  ipaddress: 'Alamat IP Komputer',
  loginat: 'Waktu Login (ISO)',
  expiredat: 'Waktu Sesi Berakhir (ISO)',

  // Ortu & Yatim
  ortuid: 'ID Orang Tua / Wali',
  status_hidup: 'Status Hidup (Masih Hidup / Wafat)',
  statushidup: 'Status Hidup (Masih Hidup / Wafat)',
  yatimid: 'ID Data Yatim Piatu',
  penerimakps_pip: 'Penerima Bantuan PIP / KPS / KIP',
  penerimakpspip: 'Penerima Bantuan PIP / KPS / KIP',
  nohpwali: 'Nomor HP / WhatsApp Wali',

  // Prestasi, Kenaikan, Kelulusan, Alumni
  prestasiid: 'ID Prestasi Siswa',
  namaprestasi: 'Nama Kejuaraan / Prestasi',
  bidang: 'Bidang Prestasi (Akademik / Seni / Olahraga)',
  tingkat: 'Tingkat Prestasi (Sekolah / Kota / Provinsi / Nasional)',
  peringkat: 'Juara / Peringkat (Juara 1 / 2 / 3 / Harapan)',
  tahun: 'Tahun Perolehan Prestasi',
  penyelenggara: 'Lembaga / Instansi Penyelenggara',
  nosertifikat: 'Nomor Piagam / Sertifikat',
  sertifikaturl: 'Tautan Sertifikat (URL Drive)',
  poinreward: 'Poin Reward Prestasi',
  kenaikanid: 'ID Riwayat Kenaikan Kelas',
  kelasasal: 'Kelas Asal',
  kelastujuan: 'Kelas Tujuan / Baru',
  tahunajaran: 'Tahun Pelajaran (2026/2027)',
  semester: 'Semester (Ganjil / Genap)',
  statuskenaikan: 'Status Keputusan Kenaikan',
  catatankeputusan: 'Catatan Rapat Dewan Guru',
  tanggalproses: 'Tanggal Penetapan Kenaikan',
  kelulusanid: 'ID Data Kelulusan',
  kelasterakhir: 'Kelas Terakhir Siswa',
  tahunlulus: 'Tahun Kelulusan',
  nomorskl: 'Nomor Surat Keterangan Lulus (SKL)',
  nomorijazah: 'Nomor Seri Ijazah Resmi',
  nilaiakhir: 'Nilai Akhir Rata-rata Kelulusan',
  predikat: 'Predikat Kelulusan (Sangat Baik / Baik)',
  statuskelulusan: 'Status Kelulusan (Lulus / Tidak Lulus)',
  tanggallulus: 'Tanggal Kelulusan Resmi',
  alumniid: 'ID Data Alumni Siswa',
  statuslanjut: 'Status Lanjut Studi / Bekerja / Usaha',
  namakampus_instansi: 'Nama Kampus / Tempat Kerja',
  jurusan_pekerjaan: 'Program Studi / Posisi Jabatan',
  kontak: 'Nomor Kontak / WhatsApp',

  // Guru & GTK
  guruid: 'ID Guru / Tenaga Pendidik',
  gelar: 'Gelar Kesarjanaan (S.Pd, M.Pd, dll)',
  jabatan: 'Jabatan Utama Guru / Staf',
  walikelas: 'Tugas Tambahan Wali Kelas',
  statuskepegawaian: 'Status Kepegawaian (PNS / P3K / GTT / GTY)',
  pendidikan: 'Pendidikan Terakhir',
  jurusan: 'Jurusan Pendidikan Terakhir',
  tmt: 'Tanggal Mulai Tugas / TMT (YYYY-MM-DD)',
  foto: 'Pas Foto Resmi Guru (URL Drive)',
  jabatanid: 'ID Master Jabatan GTK',
  namajabatan: 'Nama Jabatan / Penugasan',
  tugasutama: 'Uraian Tugas Utama Jabatan',
  eselon_tingkat: 'Tingkatan Eselon / Struktural',
  bebanjam: 'Beban Jam Wajib (JP)',
  riwayatid: 'ID Riwayat Mengajar',
  namaguru: 'Nama Lengkap Guru Pengampu',
  mapel: 'Mata Pelajaran yang Diampu',
  kelas: 'Rombel / Kelas yang Diajar',
  jumlahjam: 'Alokasi Beban Jam Mengajar (JP)',
  statussk: 'Status SK Mengajar',
  noskmengajar: 'Nomor SK Pembagian Tugas Mengajar',

  // SPMB
  key: 'Kunci Variabel Form',
  label: 'Label Form Pendaftaran',
  type: 'Tipe Input Formulir',
  grid: 'Lebar Grid Kolom Form',
  required: 'Wajib Diisi (1 / 0)',
  show: 'Tampilkan di Form (1 / 0)',
  options: 'Opsi Pilihan Dropdown',
  noregistrasi: 'Nomor Registrasi Calon Siswa',
  noreg: 'Nomor Registrasi Calon Siswa',
  noregister: 'Nomor Registrasi Calon Siswa',
  noregstrasi: 'Nomor Registrasi Calon Siswa',
  namacalonsiswa: 'Nama Lengkap Calon Siswa',
  jalurmasuk: 'Jalur Pendaftaran (Zonasi / Prestasi / Afirmasi / Reguler)',
  statusberkas: 'Status Berkas Pendaftaran (Lengkap / Belum Lengkap / Ditolak)',
  skorseleksi: 'Nilai / Skor Akhir Seleksi',
  hasilkeputusan: 'Hasil Keputusan SPMB (Diterima / Cadangan / Tidak Diterima)',
  kelompokmpls: 'Gugus / Kelompok Masa Pengenalan Lingkungan Sekolah',
  statusdaftarulang: 'Status Daftar Ulang (Sudah / Belum)',
  ukuranseragam: 'Ukuran Seragam Sekolah (S / M / L / XL / XXL)',
  tanggaldaftar: 'Tanggal Pendaftaran',
  verifikasiid: 'ID Verifikasi Berkas',
  ktportu: 'KTP Orang Tua (URL Drive)',
  suratpernyataan: 'Surat Pernyataan Calon Siswa (URL Drive)',
  catatanverifikasi: 'Catatan Verifikasi Panitia',
  verifikator: 'Nama Petugas Verifikator',
  tanggalverifikasi: 'Tanggal Verifikasi Berkas',
  seleksiid: 'ID Seleksi Masuk SPMB',
  nilaiakademik: 'Nilai Rata-rata Rapor / Akademik',
  nilaiwawancara: 'Skor Ujian Wawancara',
  nilaiprestasi: 'Skor Tambahan Sertifikat Prestasi',
  nilaitestulis: 'Skor Ujian Tertulis / CBT Masuk',
  ranking: 'Peringkat / Ranking Seleksi',
  rekomendasi: 'Rekomendasi Peminatan / Jurusan',
  statusseleksi: 'Status Kelolosan Seleksi',
  pengumumanid: 'ID Pengumuman Kelulusan',
  nomorsk: 'Nomor Surat Keputusan Penerimaan',
  tanggalpengumuman: 'Tanggal Pengumuman Kelulusan',
  catatankelulusan: 'Catatan Pengumuman Kelulusan',
  daftarulangid: 'ID Bukti Daftar Ulang',
  kelasditerima: 'Kelas / Rombel yang Ditetapkan',
  tanggaldaftarulang: 'Tanggal Pelaksanaan Daftar Ulang',
  pembayaranawal: 'Uang Pangkal / Biaya Awal Masuk (Rp)',
  validasiid: 'ID Validasi Dapodik',
  namaibukandung: 'Nama Ibu Kandung Sesuai Akta',
  statusdapodik: 'Status Validasi Dapodik (Valid / Residu / Belum Terdata)',
  catataninvalid: 'Rincian Residu / Kesalahan Data',
  tglvalidasi: 'Tanggal Terakhir Validasi Data',
  buktiterdaftar: 'Bukti / Keterangan Terdaftar Dapodik & Verval PD',

  // Akademik
  taid: 'ID Master Tahun Ajaran',
  nama: 'Nama Data / Parameter',
  tahunmulai: 'Tahun Mulai Kalender',
  tahunselesai: 'Tahun Selesai Kalender',
  tanggalmulai: 'Tanggal Mulai Periode (YYYY-MM-DD)',
  tanggalselesai: 'Tanggal Selesai Periode (YYYY-MM-DD)',
  aktif: 'Status Aktif (1 / 0)',
  semesterid: 'ID Master Semester',
  tahunajaranid: 'ID Tahun Ajaran Terkait',
  tahunpelajaran: 'Tahun Pelajaran Kalender',
  jenjangid: 'ID Master Jenjang',
  kode: 'Kode Singkatan Parameter',
  namajenjang: 'Nama Jenjang Pendidikan',
  tingkatawal: 'Tingkat Kelas Awal',
  tingkatakhir: 'Tingkat Kelas Akhir',
  kelasid: 'ID Master Rombel Kelas',
  namakelas: 'Nama Rombongan Belajar / Kelas',
  walikelasid: 'ID Guru Wali Kelas',
  namawalikelas: 'Nama Lengkap Guru Wali Kelas',
  namatutor: 'Nama Guru Tutor Pendamping',
  ruangan: 'Nama Ruang Kelas / Gedung',
  kapasitas: 'Daya Tampung Maksimal Siswa',
  mapelid: 'ID Master Mata Pelajaran',
  namamapel: 'Nama Lengkap Mata Pelajaran',
  kategori: 'Kategori / Kelompok Muatan',
  kkm: 'Kriteria Ketuntasan Minimal (KKM)',
  gurupengampu: 'Nama Guru Pengajar Utama',
  kelompok: 'Kelompok Mapel (Wajib / Pilihan / Mulok)',
  fase: 'Fase Kurikulum Merdeka (A/B/C/D/E/F)',
  bebanjp: 'Beban Jam Pelajaran per Minggu (JP)',
  hariliburid: 'ID Kalender Hari Libur',
  jenis: 'Jenis / Klasifikasi Data',
  jadwalid: 'ID Jadwal Pelajaran',
  hari: 'Hari Pelajaran (Senin s/d Sabtu)',
  jammulai: 'Jam Mulai KBM (HH:mm)',
  jamselesai: 'Jam Selesai KBM (HH:mm)',
  agendaid: 'ID Jurnal Agenda Mengajar',
  jamke: 'Jam Pelajaran Ke- (contoh: 1-2)',
  materipokok: 'Pokok Bahasan / Materi Esensial',
  kegiatanpembelajaran: 'Uraian Aktivitas Belajar Mengajar',
  kehadiransiswa: 'Catatan Kehadiran Siswa di Kelas',
  hambatan: 'Hambatan & Kendala KBM',
  tindaklanjut: 'Rencana Tindak Lanjut Perbaikan',
  absenid: 'ID Presensi Harian Siswa',
  jammasuk: 'Jam Rekam Presensi Masuk (HH:mm)',
  jampulang: 'Jam Rekam Presensi Pulang (HH:mm)',
  lokasi: 'Nama Lokasi / Titik Presensi',
  latitude: 'Koordinat Garis Lintang (Latitude GPS)',
  longitude: 'Koordinat Garis Bujur (Longitude GPS)',
  qrcode: 'Kode QR Presensi Kartu Pelajar',
  petugasid: 'ID Petugas / Guru Pencatat',
  absenguruid: 'ID Presensi Harian Guru',
  izinid: 'ID Permohonan Izin Siswa',
  jenisizin: 'Kategori Izin (Sakit / Izin Acara / Dispensasi)',
  alasan: 'Uraian Alasan Ketidakhadiran',
  buktisuraturl: 'Tautan Surat Keterangan Dokter (URL Drive)',
  statuspersetujuan: 'Status Persetujuan (Disetujui / Ditolak / Menunggu)',
  disetujuioleh: 'Nama Pejabat yang Menyetujui',
  catatan: 'Catatan / Keterangan Tambahan',
  cutiid: 'ID Pengajuan Cuti Guru',
  jeniscuti: 'Kategori Cuti (Tahunan / Sakit / Melahirkan / Dinas Luar)',
  lampiranurl: 'Tautan Berkas Pendukung Cuti (URL Drive)',
  rekapid: 'ID Rekapitulasi Presensi',
  periodebulan: 'Periode Bulan Rekap (contoh: Agustus 2026)',
  hadir: 'Total Hari Hadir',
  izin: 'Total Hari Izin',
  sakit: 'Total Hari Sakit',
  alpa: 'Total Hari Tanpa Keterangan (Alpa)',
  terlambat: 'Total Frekuensi Keterlambatan',
  persentasehadir: 'Persentase Tingkat Kehadiran (%)',
  qrlogid: 'ID Log Pemindaian Barcode',
  waktu: 'Waktu Presensi Dilakukan (ISO)',
  nisn_nip: 'Nomor Identitas Siswa / Guru (NISN/NIP)',
  namapengguna: 'Nama Lengkap Pengguna',
  peran: 'Peran Pengguna (Siswa / Guru / Staf)',
  tipescan: 'Jenis Scan (Masuk / Pulang / Kartu)',

  // Ujian Online CBT
  banksoalid: 'ID Bank Butir Soal',
  kurikulum: 'Jenis Kurikulum (Kurikulum Merdeka / K13)',
  guru: 'Nama Guru Pembuat Soal',
  jumlahsoal: 'Total Butir Soal',
  tipesoal: 'Bentuk Soal (Pilihan Ganda / Essay / Campuran)',
  kesulitan: 'Tingkat Kesulitan (Mudah / Sedang / Sulit / HOTS)',
  soaljson: 'Data Butir Soal Format JSON',
  ujianid: 'ID Jadwal Ujian CBT',
  namaujian: 'Nama Ujian / Asesmen',
  jenisujian: 'Jenis Asesmen (PTS / PAS / PAT / Sumatif)',
  durasi: 'Durasi Pengerjaan Ujian (Menit)',
  peserta: 'Target Jumlah Peserta Ujian',
  proktor: 'Nama Proktor / Pengawas Ujian',
  acaksoal: 'Acak Urutan Butir Soal (Ya / Tidak)',
  acakopsi: 'Acak Urutan Pilihan Jawaban (Ya / Tidak)',
  tampilkannilai: 'Tampilkan Skor Nilai Langsung ke Siswa (Ya / Tidak)',
  nilairatarata: 'Nilai Rata-rata Peserta Ujian',
  tokenid: 'ID Token Sesi Ujian',
  durasimenit: 'Alokasi Waktu Ujian (Menit)',
  detailsoalid: 'ID Butir Soal Ujian',
  nomorsoal: 'Nomor Urut Soal',
  pertanyaan: 'Teks Pertanyaan Butir Soal',
  linkgambar: 'Tautan / URL Gambar Ilustrasi Soal',
  gambarilustrasiurl: 'Tautan / URL Gambar Ilustrasi Soal',
  pilihana: 'Teks Pilihan Jawaban A',
  pilihanb: 'Teks Pilihan Jawaban B',
  pilihanc: 'Teks Pilihan Jawaban C',
  pilihand: 'Teks Pilihan Jawaban D',
  pilihane: 'Teks Pilihan Jawaban E',
  kuncijawaban: 'Kunci Jawaban Benar (A/B/C/D/E)',
  bobot: 'Bobot Nilai per Butir Soal',
  jawabanid: 'ID Lembar Jawaban Siswa',
  jawabansiswa: 'Jawaban yang Dipilih Siswa',
  iscorrect: 'Status Jawaban Benar (1 / 0)',
  nilai: 'Nilai / Skor Hasil Penilaian',
  draftid: 'ID Cadangan Jawaban Realtime',
  jawabajson: 'Data Pilihan Jawaban Sementara (JSON)',
  jawabansoaljson: 'Data Pilihan Jawaban Sementara (JSON)',
  sisawaktu: 'Sisa Waktu Ujian Siswa (Detik)',
  lastsync: 'Waktu Sinkronisasi Terakhir (ISO)',
  timestamp: 'Penanda Waktu Sistem (ISO)',
  logujianid: 'ID Log Monitoring Ujian',
  pelanggaran: 'Catatan Pelanggaran / Pindah Tab Browser',
  hasilujianid: 'ID Rekapitulasi Hasil Ujian CBT',
  benar: 'Jumlah Jawaban Benar',
  salah: 'Jumlah Jawaban Salah',
  totalsoal: 'Total Soal yang Dikerjakan',
  statustuntas: 'Status Ketuntasan Nilai (Tuntas / Belum Tuntas)',
  waktuselesai: 'Waktu Penyelesaian Ujian (ISO)',

  // Penugasan
  tugasid: 'ID Penugasan Siswa',
  judul: 'Judul Tugas / Materi / Berita',
  tenggat: 'Batas Akhir Waktu Pengumpulan Tugas (YYYY-MM-DD)',
  petunjuk: 'Instruksi / Petunjuk Pengerjaan Tugas',
  kumpul: 'Jumlah Siswa yang Mengumpulkan Tugas',
  totalsiswa: 'Jumlah Seluruh Siswa di Kelas',
  pengumpulanid: 'ID Berkas Pengumpulan Tugas',
  judultugas: 'Nama Tugas yang Dikerjakan',
  catatanguru: 'Umpan Balik / Catatan Guru atas Tugas',
  fileurl: 'Tautan Berkas Lampiran Dokumen (URL Drive)',
  waktukumpul: 'Waktu Pengumpulan Tugas (ISO)',
  materiid: 'ID Bahan Belajar Digital',
  deskripsi: 'Uraian Deskripsi Rincian Data',
  tipemateri: 'Format Berkas (PDF / Video / PPT / Link)',
  ukuranfile: 'Ukuran Berkas Digital',
  cpaid: 'ID Capaian & Alur Pembelajaran',
  elemen: 'Elemen Capaian Mata Pelajaran',
  capaianpembelajaran: 'Deskripsi Capaian Pembelajaran (CP)',
  tujuanpembelajaran: 'Tujuan Pembelajaran (TP)',
  alurtujuan: 'Alur Tujuan Pembelajaran (ATP)',
  nilaiid: 'ID Buku Nilai Siswa',
  nilaitugas: 'Nilai Rata-rata Tugas & Formatif',
  nilaiuts: 'Nilai Ujian Tengah Semester (PTS)',
  nilaiuas: 'Nilai Ujian Akhir Semester (PAS/PAT)',
  capaiankompetensi: 'Deskripsi Narasi Capaian Kompetensi Rapor',
  tanggalinput: 'Tanggal Nilai Dimasukkan Guru',
  raporid: 'ID Lembar Rapor Siswa',
  catatanwalikelas: 'Catatan Pesan Pembinaan Wali Kelas',
  tanggalrapor: 'Tanggal Pembagian Buku Rapor',

  // Master Silabus & Kurikulum Modul (15 Kolom & 11 Kolom)
  kodejenjang: 'Kode Jenjang Pendidikan / Paket Kesetaraan (PA/PB/PC/Merdeka)',
  kodepaket: 'Kode Paket Kesetaraan (PA/PB/PC/Merdeka)',
  jenjang: 'Jenjang Pendidikan / Program Paket (A / B / C)',
  kodemapel: 'Kode / Singkatan Mata Pelajaran',
  nomodul: 'Nomor Urut Modul Pembelajaran',
  temamodul: 'Tema / Judul Modul Pembelajaran',
  subke: 'Nomor / Urutan Sub-Modul / Unit (contoh: Unit 1)',
  kodesubtugas: 'Kode Unik Sub-Tugas Silabus',
  topiksubtugas: 'Topik / Uraian Sub-Tugas Capaian Silabus',
  kodemodul: 'Kode Modul Pembelajaran Resmi',
  judulmodul: 'Judul Lengkap Modul Pembelajaran',
  unit: 'Unit / Bab Modul Pembelajaran',
  babunit: 'Bab / Unit Modul Pembelajaran',
  subbab: 'Sub-Bab / Pokok Bahasan Modul',

  // Keuangan
  biayaid: 'ID Master Tarif Pos Biaya',
  kodebiaya: 'Kode Master Pos Biaya',
  namabiaya: 'Nama Pos Biaya / Iuran',
  target_kelas: 'Sasaran Kelas Biaya',
  nominal: 'Besaran Nominal Biaya (Rp)',
  periode: 'Periode Tagihan (Bulanan / Semester / Tahunan)',
  wajib: 'Sifat Biaya (Wajib / Sukarela)',
  tagihanid: 'ID Tagihan Siswa',
  invoiceid: 'ID Faktur Tagihan Siswa',
  kelasnama: 'Nama Rombel Kelas Siswa',
  nominalasli: 'Nominal Awal Tagihan (Rp)',
  diskon: 'Potongan Diskon / Beasiswa (Rp)',
  denda: 'Denda Keterlambatan (Rp)',
  totaltagihan: 'Total Kewajiban Tagihan (Rp)',
  totalbayar: 'Total Pembayaran Diterima (Rp)',
  paidamount: 'Jumlah yang Telah Dibayar (Rp)',
  sisatagihan: 'Sisa Tagihan yang Belum Lunas (Rp)',
  jatuhtempo: 'Tanggal Jatuh Tempo Tagihan (YYYY-MM-DD)',
  tanggaltagihan: 'Tanggal Terbit Tagihan (YYYY-MM-DD)',
  tanggaljatuhtempo: 'Tanggal Batas Akhir Pembayaran (YYYY-MM-DD)',
  paidat: 'Waktu Pelunasan Pembayaran (ISO)',
  paidby: 'Nama Pihak Penyetor / Pembayar',
  paymenttype: 'Jenis Pembayaran (Tunai / Transfer / QRIS)',
  pembayaranid: 'ID Kuitansi Pembayaran Kasir',
  tglbayar: 'Tanggal Transaksi Kasir',
  total: 'Total Nominal Transaksi (Rp)',
  metodepembayaran: 'Metode Pembayaran (Tunai / Transfer / VA)',
  metode: 'Metode Pembayaran',
  noreferensi: 'Nomor Bukti Transfer / Resi',
  bank: 'Nama Bank Tujuan / Rekening',
  createdby: 'Petugas Kasir Pembuat Kuitansi',
  nomorinvoice: 'Nomor Seri Faktur Invoice Resmi',
  grandtotal: 'Total Akhir Pembayaran Invoice (Rp)',
  tanggalbayar: 'Tanggal Pelunasan Invoice (YYYY-MM-DD)',
  metodebayar: 'Cara Pembayaran yang Dipilih',
  tabunganid: 'ID Rekening Tabungan Siswa',
  tgltransaksi: 'Tanggal Setor / Tarik Tabungan',
  jenistransaksi: 'Jenis Transaksi (Setor / Tarik)',
  debit: 'Nominal Setoran Tabungan (Rp)',
  kredit: 'Nominal Penarikan Tabungan (Rp)',
  saldosebelumnya: 'Saldo Sebelum Transaksi (Rp)',
  saldosetelahnya: 'Saldo Setelah Transaksi (Rp)',
  saldoakhir: 'Saldo Akhir Rekening Tabungan (Rp)',
  kasid: 'ID Buku Kas Operasional',
  pengeluaranid: 'ID Transaksi Pengeluaran Sekolah',
  namapengeluaran: 'Nama Belanja Operasional Sekolah',
  penerima: 'Pihak Penerima Pembayaran',
  jurnalid: 'ID Jurnal Akuntansi Umum',
  kodeakun: 'Kode Rekening Akun (COA)',
  namaakun: 'Nama Akun Buku Besar',
  referensi: 'Nomor Bukti Transaksi Akuntansi',

  // Bimbingan Konseling
  bimbinganid: 'ID Layanan Konseling Siswa',
  gurubkid: 'ID Guru Konselor BK',
  konselor: 'Nama Guru BK / Konselor',
  jenisbimbingan: 'Kategori Layanan BK (Pribadi / Sosial / Belajar / Karier)',
  pokokmasalah: 'Uraian Pokok Masalah Siswa',
  urgensi: 'Tingkat Urgensi Kasus (Tinggi / Sedang / Rendah)',
  hasiltindaklanjut: 'Solusi & Rencana Tindak Lanjut Layanan',
  catatanrahasia: 'Catatan Khusus Konseling (Rahasia)',
  pelanggaranid: 'ID Catatan Pelanggaran Siswa',
  jam: 'Jam Kejadian Pelanggaran',
  klasifikasi: 'Klasifikasi Derajat Pelanggaran (Ringan / Sedang / Berat)',
  bentukpelanggaran: 'Uraian Bentuk Pelanggaran Tata Tertib',
  poin: 'Besaran Poin Pelanggaran',
  sanksi: 'Tindakan Sanksi Disiplin yang Diberikan',
  petugaspelapor: 'Nama Guru / Staf yang Melaporkan',
  tindaklanjutortu: 'Pemanggilan Orang Tua / Tindak Lanjut',
  kartuid: 'ID Kartu Akumulasi Poin Siswa',
  totalpoinpelanggaran: 'Total Akumulasi Poin Pelanggaran',
  totalpoinprestasi: 'Total Akumulasi Poin Penghargaan Prestasi',
  poinbersih: 'Poin Bersih Kedisiplinan Siswa',
  statusperingatan: 'Status Surat Peringatan (Aman / SP 1 / SP 2 / SP 3)',
  rekomendasitindakan: 'Saran Tindakan Pembinaan Lanjutan',

  // Sarpras & Inventaris
  barangid: 'ID Sarana & Aset Barang',
  kodebarang: 'Kode Inventaris Barang Sekolah',
  namabarang: 'Nama Aset / Peralatan Sekolah',
  klasifikasikib: 'Klasifikasi KIB (Tanah / Gedung / Alat / Lainnya)',
  satuan: 'Satuan Ukur (Unit / Pcs / Set / Buah / Lembar)',
  kondisi: 'Kondisi Fisik Barang (Baik / Rusak Ringan / Rusak Berat)',
  sumberdana: 'Sumber Dana Pengadaan (BOS / Yayasan / Hibah)',
  tahunperolehan: 'Tahun Pengadaan Aset Barang',
  hargaperolehan: 'Harga Beli / Nilai Aset Awal (Rp)',
  penanggungjawab: 'Penanggung Jawab Ruangan / Aset',
  spesifikasi: 'Uraian Spesifikasi Teknis & Merk Barang',
  pemeliharaanid: 'ID Tiket Servis Pemeliharaan',
  notiket: 'Nomor Tiket Laporan Kerusakan',
  tgllapor: 'Tanggal Pelaporan Kerusakan',
  pelapor: 'Nama Guru / Staf Pelapor',
  deskripsikerusakan: 'Uraian Rincian Kerusakan Barang',
  tingkatkerusakan: 'Derajat Kerusakan (Ringan / Sedang / Berat)',
  tindakanperbaikan: 'Langkah Perbaikan yang Dilakukan',
  teknisivendor: 'Nama Teknisi / Bengkel Rekanan',
  estimasibiaya: 'Estimasi / Realisasi Biaya Servis (Rp)',
  tglselesai: 'Tanggal Selesai Diperbaiki',
  keteranganhasil: 'Evaluasi Kondisi Pasca Servis',
  peminjamanbarangid: 'ID Peminjaman Sarana Sekolah',
  nopeminjaman: 'Nomor Surat Peminjaman Fasilitas',
  namapeminjam: 'Nama Peminjam Fasilitas',
  rolepeminjam: 'Peran Peminjam (Guru / Siswa / Unit)',
  kelasatauunit: 'Kelas / Unit Kerja Peminjam',
  tglpinjam: 'Tanggal Peminjaman Barang',
  tglkembalirencana: 'Rencana Tanggal Pengembalian',
  tglkembalirealisasi: 'Realisasi Tanggal Barang Dikembalikan',
  keperluan: 'Alasan & Tujuan Penggunaan Fasilitas',
  petugas: 'Nama Petugas Logistik yang Melayani',
  catatankondisi: 'Kondisi Barang Saat Dipinjam / Dikembalikan',

  // Persuratan
  suratmasukid: 'ID Agenda Surat Masuk',
  noagenda: 'Nomor Urut Agenda Masuk',
  nosuratasal: 'Nomor Surat dari Lembaga Pengirim',
  tanggalsurat: 'Tanggal yang Tertera pada Surat (YYYY-MM-DD)',
  tanggalditerima: 'Tanggal Surat Diterima di TU (YYYY-MM-DD)',
  pengirim: 'Nama Lembaga / Pihak Pengirim Surat',
  kategoripengirim: 'Kategori Asal (Dinas / Yayasan / Swasta)',
  perihal: 'Perihal Pokok Isi Surat',
  sifat: 'Sifat Surat (Biasa / Penting / Rahasia / Segera)',
  statusdisposisi: 'Status Disposisi Kepala Sekolah',
  instruksidisposisi: 'Instruksi Arahan Tindak Lanjut Kepala Sekolah',
  diteruskankepada: 'Nama Guru / Staf Penerima Disposisi',
  tenggatwaktu: 'Batas Waktu Penyelesaian Disposisi',
  catatankepsek: 'Catatan Tambahan Kepala Sekolah',
  lampirannama: 'Nama Berkas Dokumen Lampiran',
  penerimaberkas: 'Petugas Tata Usaha Penerima Berkas',
  suratkeluarid: 'ID Agenda Surat Keluar',
  nosurat: 'Nomor Surat Keluar Resmi Sekolah',
  kodeklasifikasi: 'Kode Klasifikasi Persuratan Dinas',
  jenissurat: 'Jenis Surat Resmi (Keterangan / Undangan / Tugas)',
  alamatpenerima: 'Alamat Lengkap Instansi Tujuan',
  isisurat: 'Ringkasan Isi Surat Keluar',
  penandatangan: 'Pejabat Penandatangan Surat Resmi',
  jabatanpenandatangan: 'Jabatan Penandatangan (Kepala Sekolah)',
  tembusan: 'Pihak Penerima Tembusan Surat',
  fileid: 'ID Master Berkas Google Drive',
  namafile: 'Nama Dokumen Berkas',
  namaasli: 'Nama Asli File Saat Diunggah',
  url: 'Tautan Akses File (URL Drive)',
  ukuran: 'Ukuran File Digital (KB / MB)',
  tipefile: 'Format Dokumen (PDF, DOCX, XLSX, JPG)',
  uploadby: 'Nama Pengguna Pengunggah Berkas',
  tanggalupload: 'Tanggal dan Waktu Berkas Diunggah',
  arsipid: 'ID Master Registrasi Arsip',
  nomordokumen: 'Nomor Seri Dokumen Arsip',
  juduldokumen: 'Judul Lengkap Dokumen yang Diarsipkan',
  tahunterbit: 'Tahun Dokumen Diterbitkan',
  formatfile: 'Format Ekstensi Berkas Arsip',
  pengunggah: 'Petugas Pengarsip Berkas',
  tingkatakses: 'Otoritas Akses (Publik / Internal / Rahasia)',
  tags: 'Kata Kunci Pencarian Arsip',

  // E-Perpustakaan
  bukuid: 'ID Katalog Buku Perpustakaan',
  kodebuku: 'Kode Barcode Buku Perpustakaan',
  isbn: 'Nomor ISBN Buku (13 Digit)',
  pengarang: 'Nama Penulis / Pengarang Buku',
  penerbit: 'Nama Penerbit Buku',
  lokasirak: 'Nomor / Nama Rak Penyimpanan Buku',
  stoktotal: 'Jumlah Total Koleksi Buku Fisik',
  stoktersedia: 'Jumlah Eksemplar Buku Tersedia Dipinjam',
  coverurl: 'Tautan Gambar Sampul Buku (URL Drive)',
  peminjamanid: 'ID Sirkulasi Peminjaman Buku',
  kodepeminjaman: 'Nomor Transaksi Peminjaman Buku',
  judulbuku: 'Judul Buku yang Dipinjam',
  peminjamid: 'ID Kartu Anggota Peminjam',
  tipepeminjam: 'Tipe Anggota (Siswa / Guru / Staf)',
  kelasordepartemen: 'Rombel / Unit Kerja Peminjam',
  tanggalpinjam: 'Tanggal Peminjaman Buku (YYYY-MM-DD)',
  tenggatkembali: 'Batas Akhir Pengembalian Buku (YYYY-MM-DD)',
  tanggalkembali: 'Tanggal Pengembalian Rencana (YYYY-MM-DD)',
  tanggalpengembalian: 'Tanggal Aktual Buku Dikembalikan (YYYY-MM-DD)',
  dendaid: 'ID Transaksi Denda Perpustakaan',
  pengunjungid: 'ID Presensi Buku Tamu Perpustakaan',
  kelasorunit: 'Kelas / Unit Pengunjung Perpustakaan',
  waktumasuk: 'Jam Masuk Perpustakaan (HH:mm)',
  waktukeluar: 'Jam Selesai Kunjungan (HH:mm)',

  // WhatsApp Gateway
  idpesan: 'ID Log Pengiriman WhatsApp',
  namapenerima: 'Nama Kontak Penerima Pesan WA',
  peranpenerima: 'Peran Penerima (Wali Murid / Guru / Siswa)',
  nomorwhatsapp: 'Nomor WhatsApp Tujuan (08xxx)',
  isipesan: 'Teks Notifikasi WhatsApp Gateway',
  waktukirim: 'Waktu Pesan Terkirim (ISO)',

  // Ekskul & OSIS
  kodeekskul: 'Kode Unik Ekstrakurikuler',
  namaekskul: 'Nama Kegiatan Ekstrakurikuler',
  namapembina: 'Nama Guru Pembina Ekskul',
  harilatihan: 'Hari Jadwal Latihan Mingguan',
  waktulatihan: 'Jam Latihan Ekskul (HH:mm - HH:mm)',
  tempatlatihan: 'Lokasi / Sarana Latihan',
  kuota: 'Daya Tampung Maksimal Peserta Ekskul',
  nilairapor: 'Predikat Nilai Ekskul di Rapor (A / B / C)',
  tanggalbergabung: 'Tanggal Siswa Mendaftar Ekskul (YYYY-MM-DD)',

  // Mading & Berita
  idmading: 'ID Publikasi Berita / Mading',
  konten: 'Isi Berita / Artikel Mading Digital',
  penulis: 'Nama Penulis Berita / Artikel',
  peranpenulis: 'Status Penulis (Siswa / Guru / Humas)',
  tanggalpublikasi: 'Tanggal Berita Dipublikasikan (YYYY-MM-DD)',
  prioritas: 'Tingkat Prioritas (Utama / Penting / Biasa)',
  targetaudiens: 'Target Pembaca (Semua / Siswa / Guru / Publik)',
  gambarurl: 'Tautan Gambar Utama Berita (URL Drive)',

  // Web & Profil
  appname: 'Nama Aplikasi Sistem Sekolah',
  subjudulnavbar: 'Subjudul Navbar Sistem',
  judulsidebar: 'Judul Header Menu Sidebar',
  logourl: 'Tautan Gambar Logo Utama (URL Drive)',
  heroimageurl: 'Tautan Banner Hero Utama (URL Drive)',
  tekshero: 'Judul Slogan Hero Banner',
  herobaris1: 'Teks Hero Baris 1',
  herobaris2: 'Teks Hero Baris 2',
  herosubteks: 'Deskripsi / Subteks Banner Hero',
  footerjudul: 'Nama Sekolah di Bagian Footer Web',
  footeralamat: 'Alamat Lengkap Sekolah di Footer',
  footertelepon: 'Nomor Telepon Kontak Sekolah',
  footeremail: 'Alamat Email Resmi Sekolah',
  footerhakcipta: 'Teks Hak Cipta / Copyright Footer',
  linkfb: 'Tautan Halaman Facebook Sekolah',
  linkig: 'Tautan Akun Instagram Sekolah',
  linkyt: 'Tautan Kanal YouTube Sekolah',
  linktg: 'Tautan Saluran Telegram Sekolah',
  pendaftaranstatus: 'Status Buka Pendaftaran Online (Buka / Tutup)',
  runningtext: 'Teks Berjalan Pengumuman Penting',
  alur1_judul: 'Judul Langkah 1 Alur SPMB',
  alur1_desc: 'Uraian Langkah 1 Alur SPMB',
  alur2_judul: 'Judul Langkah 2 Alur SPMB',
  alur2_desc: 'Uraian Langkah 2 Alur SPMB',
  alur3_judul: 'Judul Langkah 3 Alur SPMB',
  alur3_desc: 'Uraian Langkah 3 Alur SPMB',
  alur4_judul: 'Judul Langkah 4 Alur SPMB',
  alur4_desc: 'Uraian Langkah 4 Alur SPMB',
  visi: 'Visi Lembaga Pendidikan',
  misi: 'Misi Lembaga Pendidikan',
  id: 'ID Rekord Suara Komunitas',
  teks: 'Uraian Aspirasi, Masukan, atau Testimoni',

  // Setting & RBAC
  value: 'Nilai Pengaturan Konfigurasi',
  urutan: 'Urutan Nomor Tampilan',
  roleid: 'ID Tingkatan Peran / Hak Akses',
  namarole: 'Nama Peran Pengguna (32 Role)',
  jumlahuser: 'Jumlah Akun dengan Role Tersebut',
  hakaksesid: 'ID Matriks Perizinan Menu',
  menuid: 'ID Modul Navigasi Menu',
  create: 'Izin Tambah Data Baru (1 / 0)',
  read: 'Izin Lihat Data (1 / 0)',
  update: 'Izin Ubah / Edit Data (1 / 0)',
  delete: 'Izin Hapus Data (1 / 0)',
  approve: 'Izin Persetujuan Data (1 / 0)',
  export: 'Izin Unduh / Ekspor Excel (1 / 0)',
  import: 'Izin Unggah / Impor Data (1 / 0)',
  parentid: 'ID Menu Induk (Hierarki)',
  namamenu: 'Nama Tampilan Menu Navigasi',
  icon: 'Nama Ikon Lucide React'
};

function formatHeaderToLabel(header: string, sheet: string): string {
  const cleanKey = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (KNOWN_FIELD_LABELS[cleanKey]) {
    return KNOWN_FIELD_LABELS[cleanKey];
  }

  // Handle specific suffixes & prefixes
  if (header.endsWith('ID') || header.endsWith('Id')) {
    const base = header.replace(/ID|Id$/g, '');
    return `Kode Identifikasi Unik (${base} ID)`;
  }
  if (header.includes('Url') || header.includes('URL')) {
    const base = header.replace(/Url|URL/g, '');
    return `Tautan Dokumen / File ${base} (URL Drive)`;
  }

  // Convert CamelCase or snake_case to Space Separated Words
  const spaced = header
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Intelligent metadata resolver for any column across 88 sheets
 */
function resolveHeaderMetadata(table: TableSchema, header: string): {
  type: string;
  grid: string;
  keterangan: string;
  contohIsian: string;
  statusTampil: 'ya' | 'Tidak';
} {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sheet = table.name.toUpperCase();

  let type = 'Text (String)';
  let grid = 'col-span-6 (1/2 Lebar)';
  let keterangan = `Input data ${formatHeaderToLabel(header, sheet)} pada tabel ${table.name}`;
  let contohIsian = 'Contoh Isian Data';
  let statusTampil: 'ya' | 'Tidak' = 'ya';

  // 1. Passwords & Tokens (Internal / Hidden)
  if (h.includes('password') || h === 'token' || h === 'refreshtoken' || h === 'apisecret') {
    type = 'Password / Hash (Teks Terenkripsi)';
    grid = 'col-span-6 (1/2 Lebar)';
    keterangan = 'Kredensial keamanan rahasia yang dienkripsi sistem (Bcrypt hash)';
    contohIsian = '$2a$12$eXamPLeHasHeDsTrInG12345';
    statusTampil = 'Tidak';
    return { type, grid, keterangan, contohIsian, statusTampil };
  }

  // 2. Primary Keys & Identifiers
  if (header === table.primaryKey || h.endsWith('id') || h === 'kode' || h === 'key' || h === 'nopdkt') {
    type = 'Text (Primary Key / Kode Unik)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = `Kode identifikasi unik (Primary Key) untuk record tabel ${table.name}`;
    if (h === 'nopdkt') {
      contohIsian = '2026-001';
    } else if (h.includes('user')) {
      contohIsian = 'USR_001';
    } else if (h.includes('guru')) {
      contohIsian = 'GR_001';
    } else if (h.includes('siswa')) {
      contohIsian = 'SIS_2026_001';
    } else if (h.includes('kelas')) {
      contohIsian = 'KLS_XRPL1';
    } else if (h.includes('mapel')) {
      contohIsian = 'MP_MAT01';
    } else if (h.includes('tagihan')) {
      contohIsian = 'TGH_202608_001';
    } else if (h.includes('bayar') || h.includes('pembayaran')) {
      contohIsian = 'BYR_20260822_001';
    } else if (h.includes('buku')) {
      contohIsian = 'BK_TIK_001';
    } else if (h.includes('barang')) {
      contohIsian = 'BRG_LAB_001';
    } else {
      contohIsian = `${table.name.slice(0, 3)}_001`;
    }
  }

  // 3. Official Numbers (NISN, NIK, NUPTK, NIP, NPSN, KK)
  else if (h.includes('nisn')) {
    type = 'Number (10 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Induk Siswa Nasional 10 digit resmi terdaftar di Kemdikbud';
    contohIsian = '0081234567';
  } else if (h.includes('nik')) {
    type = 'Number (16 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Induk Kependudukan 16 digit sesuai Kartu Keluarga / KTP';
    contohIsian = '3171012304080001';
  } else if (h.includes('nuptk')) {
    type = 'Number (16 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Unik Pendidik & Tenaga Kependidikan (16 digit) resmi Kemdikbud';
    contohIsian = '9834752648291043';
  } else if (h.includes('nip')) {
    type = 'Text (18 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Induk Pegawai PNS/P3K atau NIK Pegawai Yayasan';
    contohIsian = '198503152010011005';
  } else if (h === 'npsn') {
    type = 'Number (8 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Pokok Sekolah Nasional resmi Kemdikbud (8 digit)';
    contohIsian = '20101234';
  } else if (h.includes('kartukeluarga') || h.includes('nokk')) {
    type = 'Number (16 Digit)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Kartu Keluarga (16 digit) sesuai lembar KK asli Dukcapil';
    contohIsian = '3171010101200005';
  } else if (h.includes('isbn')) {
    type = 'Text (ISBN-13)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor Standar Buku Internasional (ISBN) 13 digit';
    contohIsian = '978-602-8519-93-8';
  }

  // 4. Dates & Timestamps
  else if (h.includes('tanggal') || h.includes('tgl') || h.includes('tenggat') || h.includes('tmt') || h.includes('date') || h === 'createdat' || h === 'updatedat' || h === 'lastlogin') {
    if (h === 'createdat' || h === 'updatedat' || h === 'lastlogin' || h.includes('waktu')) {
      type = 'DateTime (ISO Timestamp)';
      grid = 'col-span-4 (1/3 Lebar)';
      keterangan = 'Waktu pencatatan sistem otomatis format ISO (YYYY-MM-DD HH:mm:ss)';
      contohIsian = '2026-08-23 10:30:00';
    } else if (h.includes('lahir')) {
      type = 'Date (YYYY-MM-DD)';
      grid = 'col-span-4 (1/3 Lebar)';
      keterangan = 'Tanggal lahir valid format YYYY-MM-DD sesuai akta kelahiran';
      contohIsian = '2010-05-14';
    } else if (h.includes('tenggat') || h.includes('tempo')) {
      type = 'Date (YYYY-MM-DD)';
      grid = 'col-span-4 (1/3 Lebar)';
      keterangan = 'Batas akhir tenggat pembayaran / penyerahan tugas (YYYY-MM-DD)';
      contohIsian = '2026-09-10';
    } else {
      type = 'Date (YYYY-MM-DD)';
      grid = 'col-span-4 (1/3 Lebar)';
      keterangan = 'Tanggal transaksi / kegiatan format YYYY-MM-DD';
      contohIsian = '2026-08-23';
    }
  }

  // 5. Currency & Financial Numbers
  else if (h.includes('nominal') || h.includes('biaya') || h.includes('tagihan') || h.includes('bayar') || h.includes('tarif') || h.includes('debit') || h.includes('kredit') || h.includes('saldo') || h.includes('denda') || h.includes('gaji') || h.includes('harga') || h.includes('totalkas') || h.includes('penghasilan') || h.includes('uang')) {
    type = 'Currency (Rupiah)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Besaran nominal nilai uang dalam satuan Rupiah (angka bulat murni)';
    if (h.includes('penghasilan')) {
      contohIsian = '4500000';
    } else if (h.includes('denda')) {
      contohIsian = '5000';
    } else {
      contohIsian = '250000';
    }
  }

  // 6. Cloud Drive Files, Photos & URLs
  else if (h.includes('foto') || h.includes('url') || h.includes('file') || h.includes('sertifikat') || h.includes('bukti') || h.includes('ijazah') || h.includes('rapor') || h.includes('akta') || h.includes('kartu') || h.includes('kia') || h.includes('ktp') || h.includes('lampiran') || h.includes('dokumen') || h.includes('pdf') || h.includes('link') || h.includes('spindah') || h.includes('suket') || h.includes('sdomisili')) {
    type = 'File URL / Cloud Drive';
    grid = 'col-span-6 (1/2 Lebar)';
    keterangan = 'Tautan URL file dokumen resmi yang tersimpan di Google Drive / Cloud Storage';
    contohIsian = 'https://drive.google.com/file/d/1a2b3c4d5e6f/view';
  }

  // 7. Phone Numbers & WhatsApp
  else if (h === 'hp' || h === 'nohp' || h === 'telepon' || h === 'telp' || h === 'notelp' || h === 'wa' || h === 'nowa' || h === 'whatsapp' || h === 'phone' || h === 'kontak' || h.endsWith('telepon') || h.endsWith('nohp') || h.endsWith('notelp') || h.endsWith('nowa')) {
    type = 'Phone / WhatsApp';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Nomor telepon / WhatsApp aktif diawali angka 08 (10-13 digit)';
    contohIsian = '081234567890';
  }

  // 8. Email Addresses
  else if (h.includes('email') || h.includes('mail')) {
    type = 'Email';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Alamat surel aktif format user@domain.com';
    contohIsian = 'siswa.sekolah@gmail.com';
  }

  // 9. Dropdown Selects / Enums / Flags
  else if (h === 'jeniskelamin' || h === 'jk') {
    type = 'Select (L / P)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Pilihan jenis kelamin: L (Laki-laki) atau P (Perempuan)';
    contohIsian = 'L';
  } else if (h === 'agama') {
    type = 'Select (Dropdown)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Pilihan agama: Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu';
    contohIsian = 'Islam';
  } else if (h.includes('golongandarah') || h === 'goldarah') {
    type = 'Select (Dropdown)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Golongan darah: A, B, AB, O, atau Tidak Tahu';
    contohIsian = 'O';
  } else if (h === 'statussiswa' || (sheet === 'SISWA' && h === 'status')) {
    type = 'Select (Status Siswa)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Status siswa: AKTIF, TIDAK AKTIF, PINDAH, KELUAR, LULUS, DROP_OUT, MENINGGAL';
    contohIsian = 'AKTIF';
  } else if (h === 'status' || h.endsWith('status')) {
    type = 'Select (Status)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Status record: Aktif, Non-Aktif, Lunas, Pending, Selesai';
    contohIsian = 'Aktif';
  } else if (h === 'semester') {
    type = 'Select (Dropdown)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Pilihan semester ajaran: Ganjil atau Genap';
    contohIsian = 'Ganjil';
  } else if (h === 'jenjang' || h === 'jenjangpendidikan' || (sheet === 'JENJANG' && (h === 'nama' || h === 'namajenjang'))) {
    type = 'Select (Jenjang Pendidikan)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Pilihan jenjang pendidikan: Paket A, Paket B, Paket C, SD, SMP, SMA, SMK';
    contohIsian = 'Paket A';
  } else if (h === 'hari' || h === 'harijadwal') {
    type = 'Select (Hari)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Pilihan hari jadwal: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu';
    contohIsian = 'Senin';
  } else if (h === 'kategoribiaya' || (sheet === 'BIAYA' && (h === 'kategori' || h === 'kategoripos'))) {
    type = 'Select (Kategori Biaya)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Kategori pos biaya: Iuran, Uang Pangkal, Seragam, Gedung, Kegiatan, Ujian, Lain-lain';
    contohIsian = 'Iuran';
  } else if (h === 'kelassaatini' || (sheet === 'SISWA' && (h === 'kelas' || h === 'idkelas' || h === 'kelasid'))) {
    type = 'Select (Master KELAS)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Mengambil otomatis dari master KELAS (contoh: 4, 5, 6, 7, 8, 9, 10, 11, 12, X RPL 1)';
    contohIsian = '4';
  } else if (h.includes('role')) {
    type = 'Select (32 Hak Akses)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Peran hak akses pengguna (Admin, Kepala Sekolah, Guru Mapel, Bendahara, Siswa, Wali Murid, dll)';
    contohIsian = 'Guru Mapel';
  } else if (h === 'statusyatim' || h.includes('yatim') || h.includes('piatu')) {
    type = 'Select (Status Yatim / Piatu)';
    grid = 'col-span-4 (1/3 Lebar)';
    keterangan = 'Pilihan status: Lengkap, Yatim, Piatu, Yatim Piatu';
    contohIsian = 'Lengkap';
  } else if (h === 'penerimakps' || h.includes('afirmasi')) {
    type = 'Select (Ya / Tidak)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Status afirmasi / penerima bansos KPS / KIP / PIP: Ya atau Tidak';
    contohIsian = 'Ya';
  } else if (h === 'create' || h === 'read' || h === 'update' || h === 'delete' || h === 'approve' || h === 'export' || h === 'import' || h === 'aktif') {
    type = 'Boolean / Switch (1 / 0)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Status izin akses atau keaktifan fitur: 1 (Diizinkan / Aktif) atau 0 (Dilarang)';
    contohIsian = '1';
  }

  // 10. Long Textarea, Address, Descriptions
  else if (h.includes('alamat') || h.includes('catatan') || h.includes('deskripsi') || h.includes('konten') || h.includes('keterangan') || h.includes('pesan') || h.includes('solusi') || h.includes('tindaklanjut') || h.includes('uraian') || h.includes('materi') || h.includes('disposisi') || h.includes('jawaban') || h.includes('soal') || h.includes('teks')) {
    type = 'Textarea (Teks Panjang)';
    grid = 'col-span-12 (Full Width)';
    keterangan = 'Uraian teks lengkap dan terperinci tanpa batasan karakter';
    contohIsian = h.includes('alamat') 
      ? 'Jl. Raya Tambora No. 45 RT 03 RW 02, Jakarta Barat' 
      : (h.includes('soal') ? 'Jelaskan prinsip kerja dari protokol HTTP dan HTTPS!' : 'Catatan lengkap tindak lanjut kegiatan operasional sekolah.');
  }

  // 11. Numeric / Measurements / Scores
  else if (h === 'rt' || h === 'rw' || h === 'anakke' || h === 'saudara' || h === 'tingkat' || h === 'kkm' || h === 'bobot' || h === 'sks' || h === 'kodepos' || h === 'jumlah' || h === 'stok' || h === 'skor' || h === 'nilai' || h === 'poin') {
    type = 'Number (Angka Numerik)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Nilai numerik pengukuran, skor, bobot atau urutan';
    if (h === 'kodepos') contohIsian = '11220';
    else if (h === 'kkm' || h === 'nilai' || h === 'skor') contohIsian = '85';
    else if (h === 'poin') contohIsian = '10';
    else if (h === 'jumlah' || h === 'stok') contohIsian = '30';
    else contohIsian = '1';
  } else if (h.includes('tinggibadan') || h.includes('beratbadan')) {
    type = 'Number (Satuan cm/kg)';
    grid = 'col-span-3 (1/4 Lebar)';
    keterangan = 'Pengukuran fisik siswa dalam satuan standar cm / kg';
    contohIsian = h.includes('tinggi') ? '160' : '50';
  }

  // 12. Standard Text Inputs
  else {
    type = 'Text (String)';
    grid = 'col-span-6 (1/2 Lebar)';
    keterangan = `Input data ${formatHeaderToLabel(header, sheet)}`;
    if (h.includes('nama')) {
      contohIsian = 'Ahmad Fauzi Pratama';
    } else if (h.includes('judul')) {
      contohIsian = 'Peringatan Hari Guru Nasional';
    } else if (h.includes('kelas') || h.includes('rombel')) {
      contohIsian = 'X RPL 1';
    } else if (h.includes('mapel')) {
      contohIsian = 'Pemrograman Web & Perangkat Bergerak';
    } else if (h.includes('tahun') || h.includes('angkatan')) {
      contohIsian = '2026/2027';
    } else if (h.includes('kota') || h.includes('kabupaten')) {
      contohIsian = 'Jakarta Barat';
    } else if (h.includes('provinsi')) {
      contohIsian = 'DKI Jakarta';
    } else if (h.includes('tempatlahir')) {
      contohIsian = 'Jakarta';
    } else if (h.includes('pekerjaan')) {
      contohIsian = 'Wiraswasta / Karyawan Swasta';
    } else if (h.includes('pendidikan')) {
      contohIsian = 'S1 / Sarjana';
    } else {
      contohIsian = `${formatHeaderToLabel(header, sheet)} Sample`;
    }
  }

  return { type, grid, keterangan, contohIsian, statusTampil };
}

/**
 * Generate complete detailed rows mapped from all 88 master database tables,
 * strictly ordered by the 18 sidebar menus in the application.
 */
export function getAll888DetailedMappingRows(): MenuDataStructureRow[] {
  const rows: MenuDataStructureRow[] = [];
  let globalIndex = 1;

  // Iterate tables in the order they exist in MASTER_TABLES_60 (which is now strictly ordered by Sidebar 1 to 18)
  MASTER_TABLES_60.forEach((table, tIdx) => {
    const config = TABLE_CONFIG[table.name] || {
      sidebar: table.category,
      namaMenu: table.description.split(',')[0].split('(')[0].trim() || table.name,
      icon: 'Database',
      subUrutan: tIdx + 1
    };

    // Extract sidebar order number (e.g. "2" from "2. Master Data")
    const sidebarNum = config.sidebar.split('.')[0].trim();
    const tableSubNum = (config.subUrutan < 10 ? `0${config.subUrutan}` : `${config.subUrutan}`);

    table.headers.forEach((header, hIdx) => {
      const meta = resolveHeaderMetadata(table, header);
      const colNum = (hIdx + 1 < 10 ? `0${hIdx + 1}` : `${hIdx + 1}`);
      const idMenu = `${sidebarNum}.${tableSubNum}.${colNum}`;
      const namaListTampilan = formatHeaderToLabel(header, table.name);

      rows.push({
        no: globalIndex++,
        sidebarMenu: config.sidebar,
        idMenu: idMenu,
        namaMenuModul: config.namaMenu,
        namaSheet: table.name,
        headerSheet: header,
        namaListTampilan: namaListTampilan,
        type: meta.type,
        grid: meta.grid,
        keterangan: meta.keterangan,
        statusTampil: meta.statusTampil,
        icon: config.icon,
        contohIsian: meta.contohIsian
      });
    });
  });

  return rows;
}

/**
 * Generate Sidebar Summary Statistics (18 Sidebars)
 */
export function getSidebarSummary(): SidebarSummaryItem[] {
  const detailedRows = getAll888DetailedMappingRows();
  const summaryMap = new Map<string, { tables: Set<string>; columns: number }>();

  // Extract unique sidebars in exact order of occurrence
  detailedRows.forEach(row => {
    if (!summaryMap.has(row.sidebarMenu)) {
      summaryMap.set(row.sidebarMenu, { tables: new Set<string>(), columns: 0 });
    }
    const cur = summaryMap.get(row.sidebarMenu)!;
    cur.tables.add(row.namaSheet);
    cur.columns++;
  });

  const result: SidebarSummaryItem[] = [];
  let no = 1;
  summaryMap.forEach((val, sidebar) => {
    result.push({
      no: no++,
      sidebarName: sidebar,
      totalTables: val.tables.size,
      totalColumns: val.columns,
      tablesList: Array.from(val.tables).join(', ')
    });
  });

  return result;
}

/**
 * Export Complete Master Data Structure as styled XLSX Workbook
 */
export function exportMenuDataStructureToExcel(): void {
  const detailedRows = getAll888DetailedMappingRows();
  const sidebarSummary = getSidebarSummary();

  const formattedDetailedRows = detailedRows.map(r => ({
    'No': r.no,
    'Sidebar Menu': r.sidebarMenu,
    'ID Menu (Kode Urut)': r.idMenu,
    'Nama Menu / Fitur Modul': r.namaMenuModul,
    'Nama Sheet Database': r.namaSheet,
    'Header Kolom Sheet': r.headerSheet,
    'Nama List / Label Tampilan': r.namaListTampilan,
    'Tipe Data & Validasi': r.type,
    'Tata Letak Grid': r.grid,
    'Keterangan & Petunjuk Pengisian': r.keterangan,
    'Status Tampil di Form': r.statusTampil,
    'Ikon Menu': r.icon,
    'Contoh Isian Data': r.contohIsian
  }));

  const formattedSummary = sidebarSummary.map(s => ({
    'No': s.no,
    'Nama Sidebar Menu': s.sidebarName,
    'Jumlah Tabel Sheet': s.totalTables,
    'Total Kolom / Field': s.totalColumns,
    'Daftar Tabel Sheet': s.tablesList
  }));

  const formatted88Sheets = MASTER_TABLES_60.map((table, idx) => {
    const config = TABLE_CONFIG[table.name] || {
      sidebar: table.category,
      namaMenu: table.name,
      icon: 'Database',
      subUrutan: idx + 1
    };
    return {
      'No': idx + 1,
      'Sidebar Menu': config.sidebar,
      'Nama Sheet': table.name,
      'Nama Menu / Fitur Modul': config.namaMenu,
      'Primary Key': table.primaryKey,
      'Jumlah Kolom': table.headers.length,
      'Deskripsi & Peruntukan': table.description,
      'Daftar Lengkap Header Kolom': table.headers.join(', ')
    };
  });

  const wb = XLSX.utils.book_new();

  const wsDetailed = XLSX.utils.json_to_sheet(formattedDetailedRows);
  const wsSheets = XLSX.utils.json_to_sheet(formatted88Sheets);
  const wsSummary = XLSX.utils.json_to_sheet(formattedSummary);

  wsDetailed['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 18 },
    { wch: 42 },
    { wch: 22 },
    { wch: 25 },
    { wch: 38 },
    { wch: 28 },
    { wch: 22 },
    { wch: 55 },
    { wch: 12 },
    { wch: 16 },
    { wch: 35 }
  ];

  wsSheets['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 22 },
    { wch: 42 },
    { wch: 20 },
    { wch: 14 },
    { wch: 55 },
    { wch: 100 }
  ];

  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 80 }
  ];

  XLSX.utils.book_append_sheet(wb, wsDetailed, 'STRUKTUR_LENGKAP_FIELD');
  XLSX.utils.book_append_sheet(wb, wsSheets, 'DAFTAR_88_SHEET_DATABASE');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'REKAP_18_SIDEBAR_MENU');

  XLSX.writeFile(wb, 'STRUKTUR_LENGKAP_88_SHEET_DATABASE_SIMS.xlsx');
}

export const downloadMenuStructureExcel = exportMenuDataStructureToExcel;
