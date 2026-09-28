import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../data/db';
import { Siswa, Guru, Kelas, Mapel, User, Jenjang, Barang, Biaya } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { restorePristineTsvStudents } from '../data/mockData';
import Keuangan from './Keuangan';
import Inventaris from './Inventaris';
import { KartuSiswaView } from './KartuSiswaView';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Upload, 
  RefreshCw, 
  GraduationCap, 
  Grid,
  FileText,
  Bookmark,
  Calendar,
  Contact,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Eye,
  Database,
  AlertCircle,
  QrCode,
  CreditCard
} from 'lucide-react';

// Dynamic metadata and schema guide helper for all 57+ ERP database tables
const getTableInfo = (key: string) => {
  const map: Record<string, { label: string; icon: string; cols: string[]; sample: string }> = {
    semua_tabel: {
      label: 'SEMUA TABEL DATABASE (Full Backup & Restore All 57+ Tables)',
      icon: '🌐',
      cols: ['{ "siswa": [...], "guru": [...], "kelas": [...], ... }'],
      sample: 'File Backup JSON Lengkap Seluruh Database (57+ Tabel)'
    },
    // 1. SETTING
    setting: {
      label: 'Setting / Pengaturan System',
      icon: '⚙️',
      cols: ['key', 'value'],
      sample: 'MAX_STUDENT_PER_CLASS\t32'
    },
    // 2. USERS
    users: {
      label: 'Users / Akun System',
      icon: '🔐',
      cols: ['id', 'username', 'email', 'password', 'role', 'name', 'status', 'passHash', 'nopdkt', 'mustChangePass', 'createdAt', 'updatedAt'],
      sample: 'USR-01\tadmin_sekolah\tadmin@rombel.com\tsecret123\tsuperadmin\tAdministrator ERP\tAKTIF\thash123\tPDKT-2026-001\tfalse\t2026-01-01\t2026-01-01'
    },
    // 3. ROLE
    role: {
      label: 'Role & Level Hak Akses',
      icon: '🛡️',
      cols: ['id', 'namaRole', 'deskripsi', 'level', 'createdAt'],
      sample: 'ROLE-GURU\tGuru Pengajar\tAkses e-Rapor dan CBT\t2\t2026-01-01'
    },
    // 4. MENU
    menu: {
      label: 'Menu System & Navigasi',
      icon: '📌',
      cols: ['idMenu', 'namaMenu', 'icon', 'route', 'parentMenu', 'urutan', 'aktif'],
      sample: 'MNU-01\tDashboard\tLayoutDashboard\t/dashboard\troot\t1\ttrue'
    },
    // 5. HAK_AKSES
    hak_akses: {
      label: 'Hak Akses Role & Menu',
      icon: '🔑',
      cols: ['id', 'role', 'menuId', 'dapatLihat', 'dapatTambah', 'dapatEdit', 'dapatHapus'],
      sample: 'HAK-01\tsuperadmin\tMNU-01\ttrue\ttrue\ttrue\ttrue'
    },
    // 6. LOGS
    logs: {
      label: 'Log Aktivitas System',
      icon: '📜',
      cols: ['LogID', 'ts', 'who', 'action', 'meta', 'Device'],
      sample: 'LOG-101\t2026-07-25 08:00\tadmin\tLOGIN\tInisiasi Sesi\tChrome Windows'
    },
    // 7. AUDIT_LOG
    audit_log: {
      label: 'Audit Log Keamanan',
      icon: '🕵️',
      cols: ['id', 'timestamp', 'username', 'role', 'action', 'detail', 'ipAddress'],
      sample: 'ADT-01\t2026-07-25 08:01\tadmin\tsuperadmin\tUPDATE_BIYA\tUbah nominal SPP\t192.168.1.1'
    },
    // 8. NOTIFIKASI
    notifikasi: {
      label: 'Log Notifikasi System',
      icon: '🔔',
      cols: ['idNotif', 'userId', 'judul', 'pesan', 'tipe', 'status', 'createdAt'],
      sample: 'NOTIF-01\tUSR-001\tTagihan SPP\tTagihan SPP Bulan Juli telah terbit.\tINFO\tUNREAD\t2026-07-25'
    },
    // 9. SISWA
    siswa: {
      label: 'Data Siswa (Aktif & Riwayat Complete)',
      icon: '👤',
      cols: [
        'nopdkt', 'Tahun Masuk', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Anak ke', 'Saudara', 'Agama', 'Golongan Darah', 'Tinggi Badan (cm)', 'Berat Badan (kg)', 'Prestasi', 'Hobi', 'Catatan Penting', 'Alamat', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi', 'Kode Pos', 'Jenis Tinggal', 'Alat Transportasi', 'Nomor HP Aktif', 'E-Mail', 'Asal Sekolah', 'SKHUN', 'Penerima KPS', 'No. KPS', 'Pas Foto', 'Nomor Kartu Keluarga', 'Nama Ayah', 'NIK Ayah', 'Tempat Lahir Ayah', 'Tanggal Lahir Ayah', 'Pendidikan Ayah', 'Pekerjaan Ayah', 'Penghasilan Ayah', 'Tlp. Ayah', 'Nama Ibu', 'NIK Ibu', 'Tempat Lahir Ibu', 'Tanggal Lahir Ibu', 'Pendidikan Ibu', 'Pekerjaan Ibu', 'Penghasilan Ibu', 'Tlp. Ibu', 'Nama Wali', 'Tempat Lahir Wali', 'Tanggal Lahir Wali', 'Pendidikan Wali', 'Pekerjaan Wali', 'Penghasilan Wali', 'Hubungan', 'Tlp. Wali', 'Akta Kelahiran', 'Kartu Keluarga', 'KTP / KIA', 'KTP Ayah', 'KTP Ibu', 'Ijazah', 'KTP Wali', 'Rapor', 'S. Pindah', 'Surat Keterangan Domisili dari RT, RW, & Kelurahan', 'Catatan Berkas', 'Status Terbaru', 'Kelas Saat ini'
      ],
      sample: 'PDKT-2026-001\t2026\t1234567890\tAhmad Dahlan\tL\tJakarta\t2008-05-12\t3171000111\t1\t2\tIslam\tO\t165\t55\tJuara 1 Sains\tMembaca\tToleransi Debu\tJl. Tambora No. 12\t01\t02\tTambora\tTambora\tJakarta Barat\tDKI Jakarta\t11210\tBersama Orang Tua\tSepeda Motor\t08123456789\tahmad@gmail.com\tSMPN 1\t95.5\tTidak\t-\thttps://photo.jpg\t317100999\tSubagyo\t317100222\tJakarta\t1975-01-01\tS1\tWiraswasta\t3000000\t0812999\tSiti\t317100333\tJakarta\t1978-02-02\tSMA\tIRT\t0\t0812888\t-\t-\t-\t-\t-\t-\t-\t-\tLengkap\tLengkap\tLengkap\tLengkap\tLengkap\tLengkap\t-\tLengkap\t-\tLengkap\tBerkas Terverifikasi\tAKTIF\t9A'
    },
    // 10. GURU
    guru: {
      label: 'Guru & Tenaga Pendidik',
      icon: '👨‍🏫',
      cols: ['GuruID', 'kelasId', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Email', 'Status', 'Foto', 'CreatedAt', 'UpdatedAt'],
      sample: 'GURU-01\t9A\tProf. Budiman\tL\tBandung\t1985-04-12\t3201000111\tbudiman@rombel.com\tAKTIF\thttps://photo.jpg\t2026-01-01\t2026-01-01'
    },
    // 11. ORANG_TUA
    orang_tua: {
      label: 'Data Orang Tua / Wali',
      icon: '👨‍👩‍👧',
      cols: ['idOrtu', 'No. PDKT', 'namaAyah', 'nikAyah', 'namaIbu', 'nikIbu', 'noHp', 'namawali', 'alamat'],
      sample: 'ORTU-001\tPDKT-2026-001\tRahmat Subagyo\t317100111222\tSiti Aminah\t317100333444\t08123456789\tSubagyo Wali\tJl. Tambora No. 12'
    },
    // 12. KELAS
    kelas: {
      label: 'Kelas & Rombongan Belajar',
      icon: '🏫',
      cols: ['id', 'nama', 'wali', 'aktif', 'jenjang', 'createdAt'],
      sample: '9A\tKelas IX-A\tProf. Budiman\tAKTIF\tPAKET B\t2026-01-01'
    },
    // 13. WEB_DOWNLOADS
    web_downloads: {
      label: 'Berkas Download Web Portal',
      icon: '📁',
      cols: ['id', 'judul', 'deskripsi', 'fileSize', 'fileType', 'fileUrl', 'tanggal'],
      sample: 'DWN-001\tBrosur Pendaftaran 2026\tBrosur resmi SPMB\t2.5 MB\tPDF\thttps://example.com/brosur.pdf\t2026-07-01'
    },
    // 14. WEB_GALLERY
    web_gallery: {
      label: 'Galeri Foto Web Portal',
      icon: '🖼️',
      cols: ['id', 'judul', 'imageUrl', 'deskripsi', 'tanggal'],
      sample: 'GAL-001\tUpacara Bendera Kemerdekaan\thttps://picsum.photos/800/600\tDokumentasi Upacara\t2026-08-17'
    },
    // 15. FORM_FIELDS
    form_fields: {
      label: 'Konfigurasi Form Custom',
      icon: '📝',
      cols: ['key', 'label', 'type', 'grid', 'required', 'show'],
      sample: 'nisn\tNISN Siswa\ttext\tcol-span-1\ttrue\ttrue'
    },
    // 16. WEB_CONFIG
    web_config: {
      label: 'Pengaturan Web Portal',
      icon: '🌐',
      cols: ['appName', 'judulSidebar', 'logoUrl', 'heroImageUrl', 'teksHero', 'heroBaris1', 'heroBaris2', 'heroSubteks', 'footerJudul', 'footerAlamat', 'footerTelepon', 'footerEmail', 'footerHakCipta', 'linkFb', 'linkIg', 'linkYt', 'pendaftaranStatus', 'alur1_judul', 'alur1_desc', 'alur2_judul', 'alur2_desc', 'alur3_judul', 'alur3_desc', 'alur4_judul', 'alur4_desc'],
      sample: 'PKBM Rombel KTCT\tERP System\t/logo.png\t/hero.jpg\tSelamat Datang\tSistem Terpadu\tRombel KTCT\tPendidikan Gratis\tRombel KTCT\tJl. Tambora\t021-123456\tinfo@ktct.sch.id\t2026 Rombel\thttps://fb.com\thttps://ig.com\thttps://yt.com\tDIBUKA\tIsi Form\tLengkapi Data\tUnggah Berkas\tFoto KK\tVerifikasi\tCek Status\tSelesai\tKonfirmasi'
    },
    // 17. JENJANG
    jenjang: {
      label: 'Jenjang Pendidikan',
      icon: '🎓',
      cols: ['JenjangID', 'NamaJenjang', 'Kode'],
      sample: 'JNJ-01\tPaket B / SMP\tPAKET_B'
    },
    // 18. MAPEL
    mapel: {
      label: 'Mata Pelajaran',
      icon: '📚',
      cols: ['MapelID', 'Kode', 'NamaMapel', 'KKM', 'GuruID'],
      sample: 'MAPEL-01\tFIS-9\tFisika Dasar\t75\tGURU-01'
    },
    // 19. TAHUN_AJARAN
    tahun_ajaran: {
      label: 'Tahun Ajaran',
      icon: '📅',
      cols: ['id_TA', 'namaTA', 'deskripsi', 'status'],
      sample: 'TA-2026\t2026/2027\tTahun Ajaran 2026/2027\tAKTIF'
    },
    // 20. SEMESTER
    semester: {
      label: 'Semester',
      icon: '🗓️',
      cols: ['SemesterID', 'nama_semester', 'tipe', 'status'],
      sample: 'SEM-1\tSemester Ganjil 2026\tGANJIL\tAKTIF'
    },
    // 21. HARI_LIBUR
    hari_libur: {
      label: 'Hari Libur Sekolah',
      icon: '🏖️',
      cols: ['Tanggal', 'Nama', 'Jenis'],
      sample: '2026-08-17\tHari Kemerdekaan RI\tNASIONAL'
    },
    // 22. JADWAL
    jadwal: {
      label: 'Jadwal Pelajaran / Ujian',
      icon: '🗓️',
      cols: ['NO_JADWAL', 'ID_JADWAL', 'ID_UJIAN', 'MAPEL', 'JENJANG', 'KELAS', 'TANGGAL', 'JAM_MULAI', 'JAM_SELESAI', 'DURASI', 'TOKEN', 'STATUS', 'TAHUN_AJARAN'],
      sample: '1\tJDW-01\tUJ-01\tFisika\tPAKET B\t9A\t2026-07-25\t08:00\t09:30\t90\tABC123\tAKTIF\t2026/2027'
    },
    // 23. AGENDA
    agenda: {
      label: 'Agenda / Kegiatan Sekolah',
      icon: '📜',
      cols: ['idAgenda', 'judul', 'kategori', 'tanggal', 'waktu', 'lokasi', 'keterangan'],
      sample: 'AGD-001\tRapat Wali Murid\tKEGIATAN_SEKOLAH\t2026-08-01\t09:00\tAula Utama\tPembahasan Program Sekolah'
    },
    // 24. NILAI
    nilai: {
      label: 'Nilai Tugas / UTS / UAS',
      icon: '📝',
      cols: ['idNilai', 'nopdkt', 'kelasId', 'mapelId', 'semester', 'tahunAjaran', 'nilaiTugas', 'nilaiUTS', 'nilaiUAS', 'nilaiAkhir'],
      sample: 'NIL-001\tPDKT-2026-001\t9A\tMAPEL-01\t1\t2026/2027\t85\t88\t90\t88'
    },
    // 25. RAPOR
    rapor: {
      label: 'Rapor Belajar Siswa',
      icon: '📊',
      cols: ['idRapor', 'nopdkt', 'kelasId', 'semester', 'tahunAjaran', 'rataRata', 'peringkat', 'catatanWali', 'statusRapor'],
      sample: 'RAP-001\tPDKT-2026-001\t9A\t1\t2026/2027\t88.5\t1\tPertahankan Prestasi!\tDISATUJKAN'
    },
    // 26. KENAIKAN_KELAS
    kenaikan_kelas: {
      label: 'Riwayat Kenaikan Kelas',
      icon: '📈',
      cols: ['id', 'nopdkt', 'kelasAsal', 'kelasTujuan', 'tahunAjaran', 'statusKenaikan', 'tanggal', 'catatan'],
      sample: 'KNK-001\tPDKT-2026-001\t8A\t9A\t2026/2027\tNAIK_KELAS\t2026-07-01\tSiswa Lulus Kenaikan'
    },
    // 27. KELULUSAN
    kelulusan: {
      label: 'Riwayat Kelulusan',
      icon: '🎓',
      cols: ['id', 'nopdkt', 'tahunLulus', 'noIjazah', 'statusKelulusan', 'tglLulus', 'catatan'],
      sample: 'LLS-001\tPDKT-2026-001\t2026\tDN-01/D-2026/0012\tLULUS\t2026-06-15\tTelah Memenuhi Syarat'
    },
    // 28. ABSENSI
    absensi: {
      label: 'Absensi Siswa (Scan QR)',
      icon: '⏱️',
      cols: ['id_Absensi', 'tanggal', 'nopdkt', 'kelasId', 'jamDatang', 'JamPulang', 'keterangan', 'status', 'latitude', 'longitude', 'jarakSekolah', 'buktiFoto', 'catatanIzin', 'longitude 2'],
      sample: 'ABS-001\t2026-07-25\tPDKT-2026-001\t9A\t06:55\t14:00\tTepat Waktu\tHADIR\t-6.1345\t106.8123\t25m\thttps://photo.jpg\t-\t106.8123'
    },
    // 29. ABSENSI_GURU
    absensi_guru: {
      label: 'Absensi Guru & Staf',
      icon: '⏱️',
      cols: ['id', 'guruId', 'tanggal', 'jamMasuk', 'jamKeluar', 'status', 'keterangan', 'buktiFoto'],
      sample: 'ABG-001\tGURU-01\t2026-07-25\t06:45\t15:00\tHADIR\tMengajar Tepat Waktu\thttps://photo.jpg'
    },
    // 30. QR_LOG
    qr_log: {
      label: 'Log Presensi QR Code',
      icon: '📱',
      cols: ['id', 'nopdkt', 'typeScan', 'timestamp', 'deviceInfo', 'status'],
      sample: 'QRL-01\tPDKT-2026-001\tIN\t2026-07-25 06:55\tScanner Gate 1\tVALID'
    },
    // 31. BANK_SOAL
    bank_soal: {
      label: 'Bank Soal CBT',
      icon: '❓',
      cols: ['idSoal', 'idUjian', 'mapel', 'jenjang', 'kelas', 'tipe', 'soal', 'gambar', 'a', 'b', 'c', 'd', 'kunci', 'bobot'],
      sample: 'SOL-01\tUJ-01\tFisika\tPAKET B\t9A\tPG\tBerapa kecepatan cahaya?\t-\t3x10^8 m/s\t3x10^6 m/s\t100 m/s\t10 m/s\tA\t2'
    },
    // 32. UJIAN
    ujian: {
      label: 'Jadwal Ujian Online',
      icon: '✍️',
      cols: ['idJadwal', 'idUjian', 'mapel', 'jenjang', 'kelas', 'tanggal', 'jamMulai', 'jamSelesai', 'durasi', 'token', 'status', 'tahunAjaran'],
      sample: 'JDW-01\tUJ-01\tFisika\tPAKET B\t9A\t2026-07-28\t08:00\t09:30\t90\tABC123\tAKTIF\t2026/2027'
    },
    // 33. LOG_UJIAN
    log_ujian: {
      label: 'Log Anti-Kecurangan Ujian',
      icon: '🕵️',
      cols: ['NO_LOG', 'NISN', 'NAMA_SISWA', 'JENJANG', 'KELAS', 'STATUS', 'Waktu', 'Pelanggaran', 'TOKEN', 'ID_JADWAL'],
      sample: '1\t1234567890\tAhmad Dahlan\tPAKET B\t9A\tWARNING\t08:22:10\tSwitch Tab Chrome\tABC123\tJDW-01'
    },
    // 34. TOKEN
    token: {
      label: 'Token Periodic Ujian',
      icon: '🔑',
      cols: ['TokenID', 'UjianID', 'Token', 'Aktif'],
      sample: 'TKN-01\tUJ-01\tABC123\ttrue'
    },
    // 35. DRAFT_JAWABAN
    draft_jawaban: {
      label: 'Draft Jawaban CBT Live',
      icon: '💾',
      cols: ['timestamp', 'examId', 'username', 'jawaban', 'sisaWaktu'],
      sample: '2026-07-28 08:30\tUJ-01\tahmad_siswa\t{"1":"A","2":"B"}\t3600'
    },
    // 36. HASIL_UJIAN
    hasil_ujian: {
      label: 'Hasil Ujian & Asesmen',
      icon: '🏆',
      cols: ['ID_HASIL', 'idAsesmen', 'ID_UJIAN', 'JENJANG', 'KELAS', 'MAPEL', 'NISN', 'NAMA_SISWA', 'NILAI', 'BENAR', 'SALAH', 'TOTAL_SOAL', 'PELANGGARAN', 'WAKTU_MULAI', 'STATUS', 'TAHUN_AJARAN', 'NILAI_AKHIR', 'WAKTU_SELESAI', 'DURASI', 'ID_JADWAL'],
      sample: 'HSL-01\tASM-01\tUJ-01\tPAKET B\t9A\tFisika\t1234567890\tAhmad Dahlan\t90\t18\t2\t20\t0\t08:00\tSELESAI\t2026/2027\t90\t09:15\t75\tJDW-01'
    },
    // 37. JENIS_UJIAN
    jenis_ujian: {
      label: 'Master Jenis Ujian & Asesmen',
      icon: '🏷️',
      cols: ['idAsesmen', 'kategori', 'jenisAsesmen', 'singkatan', 'jenjang', 'kelas', 'semester', 'status'],
      sample: 'ASM-01\tUTS\tUjian Tengah Semester\tUTS\tPAKET B\t9A\t1\tAKTIF'
    },
    // 38. TUGAS
    tugas: {
      label: 'Tugas Siswa',
      icon: '📌',
      cols: ['idTugas', 'mapel', 'judul', 'deskripsi', 'kelas', 'tanggalMulai', 'tanggalSelesai', 'durasi', 'tahunAjaran'],
      sample: 'TGS-01\tFisika\tMakalah Gelombang\tBuat rangkuman Hukum Newton\t9A\t2026-07-25\t2026-07-30\t5 Hari\t2026/2027'
    },
    // 39. HASIL_TUGAS
    hasil_tugas: {
      label: 'Pengumpulan Tugas Siswa',
      icon: '📝',
      cols: ['id', 'idTugas', 'mapel', 'kelas', 'nopdkt', 'nisn', 'namaSiswa', 'nilaiAkhir', 'jawabanEsai', 'status', 'tanggal', 'catatanGuru'],
      sample: 'HTG-01\tTGS-01\tFisika\t9A\tPDKT-2026-001\t1234567890\tAhmad Dahlan\t95\tRangkuman selesai\tTERKUMPUL\t2026-07-26\tSangat Baik'
    },
    // 40. ANALISIS_SOAL
    analisis_soal: {
      label: 'Analisis Kualitas Soal',
      icon: '📊',
      cols: ['idAnalis', 'idUjian', 'mapel', 'tingkatKesukaran', 'dayaPembeda', 'efektivitasPengecoh', 'statusSoal'],
      sample: 'ANL-01\tUJ-01\tFisika\tSEDANG\tBAIK\tEFEKTIF\tLAYAK_PAKAI'
    },
    // 41. SPMB_PENDAFTAR
    spmb_pendaftar: {
      label: 'SPMB Pendaftar Calon Siswa',
      icon: '📋',
      cols: ['kodePendaftaran', 'tanggalDaftar', 'status', 'nama', 'nisn', 'nik', 'nis', 'tempatLahir', 'tglLahir', 'jk', 'agama', 'golonganDarah', 'tinggiBadan', 'beratBadan', 'alamat', 'namaAyah', 'pekerjaanAyah', 'namaIbu', 'pekerjaanIbu', 'noHp', 'alamatOrtu', 'kelas', 'tahunMasuk', 'riwayatPendidikan', 'prestasi', 'hobi', 'catatanPenting', 'pasFoto', 'kk', 'akta', 'ktpKia', 'ktpOrtu', 'ijazah', 'rapor', 'domisili', 'catatanAdmin'],
      sample: 'REG-2026-001\t2026-07-01\tDITERIMA\tBudi Santoso\t3210001112\t3171000222\t1001\tJakarta\t2008-01-01\tL\tIslam\tO\t160\t50\tJl. Tambora\tSubagyo\tWiraswasta\tSiti\tIRT\t08199988877\tJl. Tambora\t9A\t2026\tSMPN 1\t-\t-\t-\thttps://photo.jpg\t-\t-\t-\t-\t-\t-\t-\tVerifikasi Lengkap'
    },
    // 42. BIAYA
    biaya: {
      label: 'Master Biaya & Tarif SPP',
      icon: '💵',
      cols: ['No', 'BiayaID', 'KodeBiaya', 'NamaBiaya', 'Kategori', 'Jenjang', 'Target_Kelas', 'KelasID', 'SiswaID', 'NamaSiswa', 'Nominal', 'Periode', 'Wajib', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
      sample: '1\tBIAYA_001\tA4_Modul24\tBuku Modul A4\tWAJIB\tPaket A\t4\tA4\t\t\t180000\t\tWajib\tAKTIF\tBuku Modul Pembelajaran Paket A Kelas 4 (2024)\t2024-01-01T00:00:00.000Z\t2026-09-09T12:42:46.264Z'
    },
    // 43. TAGIHAN
    tagihan: {
      label: 'Tagihan Biaya Siswa',
      icon: '🧾',
      cols: ['id', 'nopdkt', 'kelasId', 'biayaId', 'namaBiaya', 'nominal', 'periode', 'jatuhTempo', 'status', 'paidAt', 'paidBy', 'createdAt', 'paidAmount', 'remainingAmount', 'paymentType', 'namasiswa'],
      sample: 'TGH-001\tPDKT-2026-001\t9A\tBIA_SPP\tSPP Bulan Juli\t150000\t2026-07\t2026-07-31\tLUNAS\t2026-07-25\tAdmin\t2026-07-01\t150000\t0\tTUNAI\tAhmad Dahlan'
    },
    // 44. PEMBAYARAN
    pembayaran: {
      label: 'Riwayat Pembayaran SPP',
      icon: '💳',
      cols: ['id', 'tagihanId', 'nopdkt', 'kelasId', 'tglBayar', 'metode', 'jumlah', 'catatan', 'createdBy', 'createdAt', 'invoiceId', 'tagihanIds', 'namasiswa', 'Kode PDKT'],
      sample: 'BYR-001\tTGH-001\tPDKT-2026-001\t9A\t2026-07-25\tTUNAI\t150000\tLunas Juli\tBendahara\t2026-07-25\tINV-001\tTGH-001\tAhmad Dahlan\tPDKT-2026-001'
    },
    // 45. TABUNGAN
    tabungan: {
      label: 'Tabungan Siswa',
      icon: '🏦',
      cols: ['id', 'nopdkt', 'tanggal', 'jenis', 'nominal', 'catatan', 'createdBy', 'createdAt', 'namasiswa', 'inv'],
      sample: 'TBG-001\tPDKT-2026-001\t2026-07-25\tSETORAN\t50000\tSetoran Rutin\tBendahara\t2026-07-25\tAhmad Dahlan\tINV-TBG-01'
    },
    // 46. KAS
    kas: {
      label: 'Kas Masuk Operasional',
      icon: '📈',
      cols: ['KasID', 'Tanggal', 'Jenis', 'Nominal', 'Keterangan'],
      sample: 'KAS-001\t2026-07-25\tMASUK\t5000000\tDana Bantuan Operasional Sekolah'
    },
    // 47. PENGELUARAN
    pengeluaran: {
      label: 'Pengeluaran Kas Operasional',
      icon: '📉',
      cols: ['PengeluaranID', 'Tanggal', 'Kategori', 'Nominal', 'Keterangan'],
      sample: 'OUT-001\t2026-07-25\tATK_SEKOLAH\t350000\tPembelian Spidol & Kertas HVS'
    },
    // 48. INVOICE
    invoice: {
      label: 'Invoice Pembayaran',
      icon: '📄',
      cols: ['id', 'invoiceId', 'nopdkt', 'kelasId', 'tglBayar', 'metode', 'total', 'status', 'createdBy', 'createdAt', 'NAma Siswa'],
      sample: 'INV-001\tINV-2026-001\tPDKT-2026-001\t9A\t2026-07-25\tTRANSFER\t150000\tLUNAS\tBendahara\t2026-07-25\tAhmad Dahlan'
    },
    // 49. BIMBINGAN
    bimbingan: {
      label: 'Bimbingan Konseling (BK)',
      icon: '🤝',
      cols: ['id', 'No.PDKT', 'nama_siswa', 'kelasId', 'tanggal', 'jenis', 'topik', 'solusi', 'guruWali'],
      sample: 'BK-001\tPDKT-2026-001\tAhmad Dahlan\t9A\t2026-07-25\tKONSELING_KARIR\tPilihan SMA/SMK\tDiberikan Pengarahan Minat\tProf. Budiman'
    },
    // 50. PELANGGARAN
    pelanggaran: {
      label: 'Catatan Pelanggaran & Poin',
      icon: '⚠️',
      cols: ['ID_PELANGGARAN', 'ID_UJIAN', 'NISN', 'NAMA_SISWA', 'JENJANG', 'KELAS', 'PELANGGARAN', 'WAKTU', 'TOKEN', 'KETERANGAN'],
      sample: 'PLG-001\tUJ-01\t1234567890\tAhmad Dahlan\tPAKET B\t9A\tSwitch Tab Browser\t08:22\tABC123\tPoin Disiplin -5'
    },
    // 51. BARANG
    barang: {
      label: 'Inventaris Sarpras / Barang',
      icon: '🛠️',
      cols: ['id_barang', 'nama', 'kategori', 'jumlah', 'Lokasi', 'Kondisi'],
      sample: 'BRG-101\tProyektor Epson XI\tElektronik\t2\tRuang Kelas 9A\tBAIK'
    },
    // 52. PEMELIHARAAN
    pemeliharaan: {
      label: 'Pemeliharaan Sarpras',
      icon: '🔧',
      cols: ['idPemeliharaan', 'barangId', 'tanggal', 'jenisKerusakan', 'biaya', 'status', 'keterangan'],
      sample: 'MNT-001\tBRG-101\t2026-07-22\tLampu Redup\t150000\tSELESAI\tPerbaikan Servis Resmi'
    },
    // 53. PEMINJAMAN_BARANG
    peminjaman_barang: {
      label: 'Peminjaman Barang / Alat',
      icon: '📦',
      cols: ['id', 'siswaId', 'barangId', 'tglPinjam', 'tglKembali', 'tglDikembalikan', 'status'],
      sample: 'PBR-001\tPDKT-2026-001\tBRG-101\t2026-07-25\t2026-07-25\t2026-07-25\tDIKEMBALIKAN'
    },
    // 54. FILE
    file: {
      label: 'Penyimpanan Berkas Digital',
      icon: '💾',
      cols: ['idFile', 'namaFile', 'fileUrl', 'size', 'mimeType', 'uploadedBy', 'createdAt'],
      sample: 'FIL-01\tdokumen.pdf\thttps://drive.google.com/doc1\t1024 KB\tapplication/pdf\tAdmin\t2026-07-25'
    },
    // 55. ARSIP
    arsip: {
      label: 'Dokumen & Arsip Digital',
      icon: '🗄️',
      cols: ['idArsip', 'noDokumen', 'judulDokumen', 'kategori', 'tglDokumen', 'fileUrl', 'keterangan'],
      sample: 'ARS-2026-001\tSK-01/ROMBEL/2026\tSK Pengangkatan Guru 2026\tSURAT_KEPUTUSAN\t2026-07-01\thttps://drive.google.com/doc01\tArsip Utama Sekolah'
    },
    // 56. BACKUP
    backup: {
      label: 'Riwayat Backup System',
      icon: '📦',
      cols: ['idBackup', 'filename', 'fileUrl', 'size', 'createdAt', 'status'],
      sample: 'BKP-01\tBACKUP_2026_07.json\thttps://drive.google.com/bkp1\t15 MB\t2026-07-25\tSUCCESS'
    },
    // 57. MASTER_SISWA
    master_siswa: {
      label: 'Master Data Siswa (Tabel Utama)',
      icon: '👥',
      cols: ['nopdkt', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Nomor HP Aktif', 'Kelas Saat ini', 'Status Terbaru'],
      sample: 'PDKT-2026-001\t1234567890\tAhmad Dahlan\tL\tJakarta\t2008-05-12\t3171000111\t08123456789\t9A\tAKTIF'
    }
  };

  const item = map[key];
  if (item) {
    return {
      label: `${item.icon} ${item.label}`,
      cleanTitle: item.label,
      icon: item.icon,
      cols: item.cols,
      sample: item.sample,
      placeholder: `Contoh Format Kolom Excel / Google Sheets untuk Tabel [${item.label.toUpperCase()}]:\n` +
        item.cols.join('\t') + '\n' +
        item.sample + '\n\n' +
        `Catatan: Salin seluruh tabel termasuk baris judul kolom di baris pertama, lalu tempel di kotak ini.`
    };
  }

  // Fallback for any dynamic key
  const formattedName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    label: `📊 Tabel ${formattedName}`,
    cleanTitle: formattedName,
    icon: '📊',
    cols: ['id', 'nama', 'kategori', 'status', 'keterangan'],
    sample: `ID-001\tSampel ${formattedName}\tUmum\tAKTIF\tCatatan Data`,
    placeholder: `Contoh Format Kolom Excel / Google Sheets untuk Tabel [${formattedName.toUpperCase()}]:\n` +
      `id\tnama\tkategori\tstatus\tketerangan\n` +
      `ID-001\tData ${formattedName} 1\tUtama\tAKTIF\tCatatan Data\n\n` +
      `Catatan: Salin seluruh baris tabel dari Excel/Google Sheets termasuk judul kolom di baris pertama.`
  };
};

interface MasterDataProps {
  user?: any;
}

export default function MasterData({ user }: MasterDataProps = {}) {
  const [subTab, setSubTab] = useSubTab<'dashboard' | 'siswa' | 'guru' | 'ortu' | 'kelas' | 'jenjang' | 'mapel' | 'tahun_ajaran' | 'semester' | 'hari_libur' | 'referensi' | 'import_export' | 'biaya' | 'barang' | 'dapodik_validasi'>('master', 'dashboard');
  const [syncStep, setSyncStep] = useState(0); // 0 = idle, 1 = validating, 2 = syncing, 3 = success
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [activeValTab, setActiveValTab] = useState<'sekolah' | 'gtk' | 'siswa' | 'rombel' | 'sarpras'>('sekolah');
  const activeUser = user || (() => {
    const saved = localStorage.getItem('ERP_user');
    return saved ? JSON.parse(saved) : { role: 'SUPERADMIN', name: 'Operator' };
  })();
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [semesterList, setSemesterList] = useState<any[]>([]);
  const [hariLiburList, setHariLiburList] = useState<any[]>([]);
  const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
  const [ortuList, setOrtuList] = useState<any[]>([]);
  const [viewingKartuSiswa, setViewingKartuSiswa] = useState<Siswa | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedTahunMasuk, setSelectedTahunMasuk] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [selectedStatusGuru, setSelectedStatusGuru] = useState('');
  const [selectedStatusKelas, setSelectedStatusKelas] = useState('');
  const [selectedJenjangKelas, setSelectedJenjangKelas] = useState('');
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Copy-Paste Import States
  const [pasteText, setPasteText] = useState('');
  const [importTarget, setImportTarget] = useState<string>('siswa');
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [parsedSiswa, setParsedSiswa] = useState<any[]>([]);

  // Mapel Filter States
  const [selectedMapelJenjang, setSelectedMapelJenjang] = useState('');
  const [selectedMapelKelas, setSelectedMapelKelas] = useState('');
  const [mapelSearchQuery, setMapelSearchQuery] = useState('');

  // Count mapels per class dynamically
  const getMapelCountsByKelas = () => {
    const counts: Record<string, number> = {};
    for (let k = 4; k <= 12; k++) {
      counts[k.toString()] = 0;
    }
    mapelList.forEach(m => {
      if (m.kelas) {
        const kStr = m.kelas.toString();
        counts[kStr] = (counts[kStr] || 0) + 1;
      }
    });
    return counts;
  };
  const mapelCounts = getMapelCountsByKelas();

  // Filter mapel list
  const getFilteredMapel = () => {
    return mapelList.filter(m => {
      const matchesJenjang = selectedMapelJenjang ? m.jenjang === selectedMapelJenjang : true;
      const matchesKelas = selectedMapelKelas ? m.kelas === selectedMapelKelas : true;
      const matchesSearch = mapelSearchQuery ? (
        (m.nama || '').toLowerCase().includes(mapelSearchQuery.toLowerCase()) ||
        (m.id || '').toLowerCase().includes(mapelSearchQuery.toLowerCase())
      ) : true;
      return matchesJenjang && matchesKelas && matchesSearch;
    });
  };
  const filteredMapelList = getFilteredMapel();

  // Modal States
  const [isSiswaModalOpen, setIsSiswaModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  
  // Custom states to support 71 fields of Siswa
  const [siswaForm, setSiswaForm] = useState<Partial<Siswa>>({});
  const [formModalTab, setFormModalTab] = useState<'akademik' | 'alamat' | 'ortu' | 'berkas'>('akademik');

  // Guru Modal States
  const [isGuruModalOpen, setIsGuruModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [guruForm, setGuruForm] = useState<Partial<Guru>>({});
  const [selectedDetailGuru, setSelectedDetailGuru] = useState<Guru | null>(null);

  // Detail Modal
  const [selectedDetailSiswa, setSelectedDetailSiswa] = useState<Siswa | null>(null);

  // Mapel Modal States
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<Mapel | null>(null);
  const [mapelForm, setMapelForm] = useState<Partial<Mapel>>({
    id: '',
    nama: '',
    jenjang: 'PAKET C',
    kelas: '11',
    kkm: 75
  });

  const openAddMapelModal = () => {
    setEditingMapel(null);
    setMapelForm({
      id: '',
      nama: '',
      jenjang: 'PAKET C',
      kelas: '11',
      kkm: 75
    });
    setIsMapelModalOpen(true);
  };

  const openEditMapelModal = (m: Mapel) => {
    setEditingMapel(m);
    setMapelForm(m);
    setIsMapelModalOpen(true);
  };

  const handleMapelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapelForm.id) {
      Swal.fire('Validasi Gagal', 'Mohon lengkapi data wajib: Kode Mata Pelajaran.', 'error');
      return;
    }
    if (!mapelForm.nama) {
      Swal.fire('Validasi Gagal', 'Mohon lengkapi data wajib: Nama Mata Pelajaran.', 'error');
      return;
    }
    if (mapelForm.kkm === undefined || isNaN(Number(mapelForm.kkm))) {
      Swal.fire('Validasi Gagal', 'Mohon lengkapi data wajib: KKM yang valid.', 'error');
      return;
    }

    let finalJenjang = 'PAKET C';
    if (mapelForm.kelas) {
      const cls = mapelForm.kelas.toString();
      if (['4', '5', '6'].includes(cls)) finalJenjang = `PAKET A${cls}`;
      else if (['7', '8', '9'].includes(cls)) finalJenjang = `PAKET B${cls}`;
      else if (['10', '11', '12'].includes(cls)) finalJenjang = `PAKET C${cls}`;
    }

    const cleanFields = {
      ...mapelForm,
      kkm: Number(mapelForm.kkm),
      id: mapelForm.id.toUpperCase().trim(),
      jenjang: finalJenjang
    } as Mapel;

    if (editingMapel) {
      db.update<Mapel>('mapel', 'id', editingMapel.id, cleanFields);
      Swal.fire('Sukses', 'Mata pelajaran berhasil diperbarui.', 'success');
    } else {
      const existing = mapelList.find(m => m.id.toUpperCase() === cleanFields.id);
      if (existing) {
        Swal.fire('Validasi Gagal', `Kode Mapel "${cleanFields.id}" sudah digunakan oleh mata pelajaran "${existing.nama}".`, 'error');
        return;
      }
      db.insert<Mapel>('mapel', cleanFields);
      Swal.fire('Sukses', 'Mata pelajaran baru berhasil ditambahkan.', 'success');
    }

    setIsMapelModalOpen(false);
    setEditingMapel(null);
    loadAllData();
  };

  const handleDeleteMapel = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Mata Pelajaran?',
      text: `Apakah Anda yakin ingin menghapus mata pelajaran "${nama}" (${id})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<Mapel>('mapel', 'id', id);
        Swal.fire('Terhapus!', 'Mata pelajaran telah dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleEditJenjang = (item: Jenjang) => {
    Swal.fire({
      title: '✏️ Edit Jenjang Pendidikan',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">ID Kelas / Kode</label>
            <input id="swal-jenjang-id" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-slate-100" value="${item.idKelas}" disabled readonly>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Jenjang (cth: PAKET A4)</label>
            <input id="swal-jenjang-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" value="${item.jenjang}" required>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Kelas</label>
            <input id="swal-jenjang-kelas" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" value="${item.namaKelas}" required>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
            <select id="swal-jenjang-status" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="AKTIF" ${item.status === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
              <option value="NONAKTIF" ${item.status === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Keterangan</label>
            <input id="swal-jenjang-ket" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" value="${item.keterangan || ''}">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const namaVal = (document.getElementById('swal-jenjang-nama') as HTMLInputElement).value.trim();
        const kelasVal = (document.getElementById('swal-jenjang-kelas') as HTMLInputElement).value.trim();
        const statusVal = (document.getElementById('swal-jenjang-status') as HTMLSelectElement).value;
        const ketVal = (document.getElementById('swal-jenjang-ket') as HTMLInputElement).value.trim();
        
        if (!namaVal || !kelasVal) {
          Swal.showValidationMessage('Nama Jenjang dan Nama Kelas wajib diisi!');
          return false;
        }
        return { idKelas: item.idKelas, jenjang: namaVal, namaKelas: kelasVal, status: statusVal, keterangan: ketVal };
      }
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.update<Jenjang>('jenjang', 'idKelas', item.idKelas, res.value);
        Swal.fire('Sukses', 'Jenjang pendidikan berhasil diperbarui.', 'success');
        loadAllData();
      }
    });
  };

  const handleDeleteJenjang = (idKelas: string, name: string) => {
    Swal.fire({
      title: '⚠️ Konfirmasi Hapus',
      text: `Apakah Anda yakin ingin menghapus Jenjang "${name}" (${idKelas})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<Jenjang>('jenjang', 'idKelas', idKelas);
        Swal.fire('Terhapus!', 'Jenjang pendidikan telah dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleEditKelas = (item: Kelas) => {
    Swal.fire({
      title: '✏️ Edit Rombongan Belajar (Kelas)',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">ID Kelas / Kode</label>
            <input id="swal-kelas-id" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-slate-100" value="${item.id}" disabled readonly>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Jenjang Pendidikan</label>
            <select id="swal-kelas-jenjang" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="PAKET A" ${item.jenjang === 'PAKET A' ? 'selected' : ''}>PAKET A</option>
              <option value="PAKET B" ${item.jenjang === 'PAKET B' ? 'selected' : ''}>PAKET B</option>
              <option value="PAKET C" ${item.jenjang === 'PAKET C' ? 'selected' : ''}>PAKET C</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Rombel / Deskripsi</label>
            <input id="swal-kelas-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" value="${item.nama}" required>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Wali Kelas / Guru Pengampu</label>
            <input id="swal-kelas-wali" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" value="${item.wali || ''}">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status Rombel</label>
            <select id="swal-kelas-aktif" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="true" ${item.aktif !== false ? 'selected' : ''}>AKTIF</option>
              <option value="false" ${item.aktif === false ? 'selected' : ''}>NONAKTIF</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const namaVal = (document.getElementById('swal-kelas-nama') as HTMLInputElement).value.trim();
        const waliVal = (document.getElementById('swal-kelas-wali') as HTMLInputElement).value.trim();
        const jenjangVal = (document.getElementById('swal-kelas-jenjang') as HTMLSelectElement).value;
        const aktifVal = (document.getElementById('swal-kelas-aktif') as HTMLSelectElement).value === 'true';

        if (!namaVal) {
          Swal.showValidationMessage('Nama Kelas / Rombel wajib diisi!');
          return false;
        }
        return { ...item, nama: namaVal, wali: waliVal || 'Belum Ditentukan', jenjang: jenjangVal, aktif: aktifVal };
      }
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.update<Kelas>('kelas', 'id', item.id, res.value);
        Swal.fire('Sukses', 'Data kelas berhasil diperbarui.', 'success');
        loadAllData();
      }
    });
  };

  const handleDeleteKelas = (id: string, name: string) => {
    Swal.fire({
      title: '⚠️ Konfirmasi Hapus Kelas',
      text: `Apakah Anda yakin ingin menghapus Kelas / Rombel "${name}" (${id})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<Kelas>('kelas', 'id', id);
        Swal.fire('Terhapus!', 'Kelas berhasil dihapus.', 'success');
        loadAllData();
      }
    });
  };

  useEffect(() => {
    loadAllData();
    const handleSynced = () => {
      loadAllData();
    };
    window.addEventListener('erp-db-synced', handleSynced);
    return () => {
      window.removeEventListener('erp-db-synced', handleSynced);
    };
  }, [subTab]);

  const loadAllData = () => {
    setSiswaList(db.get<Siswa>('siswa'));
    setGuruList(db.get<Guru>('guru'));
    
    let loadedKelas = db.get<Kelas>('kelas') || [];
    const hasL13 = loadedKelas.some(k => k.id === 'L13' || k.id === '13' || (k.nama && k.nama.includes('13')));
    if (!hasL13) {
      loadedKelas = [
        ...loadedKelas,
        { id: 'L13', nama: '13 (Alumni/Lulus)', jenjang: 'PAKET C' }
      ];
    }
    setKelasList(loadedKelas);
    setMapelList(db.get<Mapel>('mapel'));
    setTahunAjaranList(db.get<any>('tahun_ajaran') || []);
    setSemesterList(db.get<any>('semester') || []);
    setHariLiburList(db.get<any>('hari_libur') || [
      { tgl: '25 Juli 2026', nama: 'Tahun Baru Hijriah 1448 H', tipe: 'Nasional' },
      { tgl: '17 Agustus 2026', nama: 'Hari Kemerdekaan Republik Indonesia Ke-81', tipe: 'Nasional' },
      { tgl: '14 September 2026', nama: 'Maulid Nabi Muhammad SAW', tipe: 'Nasional' }
    ]);
    setJenjangList(db.get<Jenjang>('jenjang') || []);
    const allUsers = db.get<any>('users') || [];
    const parents = allUsers.filter((u: any) => u && (u.role === 'ORANG_TUA' || u.role === 'ORTU'));
    setOrtuList(parents);
    setPage(1);
  };

  const handleAddTahunAjaran = () => {
    Swal.fire({
      title: '➕ Tambah Tahun Ajaran Akademik',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tahun Ajaran (cth: 2026/2027)</label>
            <input id="swal-ta-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="2026/2027" required>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Keterangan / Deskripsi</label>
            <input id="swal-ta-desc" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Rencana Penerimaan Siswa Baru">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
            <select id="swal-ta-status" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="NONAKTIF">NONAKTIF</option>
              <option value="AKTIF">AKTIF</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const taVal = (document.getElementById('swal-ta-nama') as HTMLInputElement).value.trim();
        const descVal = (document.getElementById('swal-ta-desc') as HTMLInputElement).value.trim();
        const statusVal = (document.getElementById('swal-ta-status') as HTMLSelectElement).value;
        
        if (!taVal) {
          Swal.showValidationMessage('Tahun Ajaran wajib diisi!');
          return false;
        }
        return { ta: taVal, desc: descVal, status: statusVal };
      }
    }).then((res: any) => {
      if (res.isConfirmed) {
        const current = db.get<any>('tahun_ajaran') || [];
        if (current.some((t: any) => t.ta === res.value.ta)) {
          Swal.fire('Validasi Gagal', `Tahun Ajaran "${res.value.ta}" sudah ada!`, 'error');
          return;
        }
        let updated = [...current];
        if (res.value.status === 'AKTIF') {
          updated = updated.map(u => ({ ...u, status: 'NONAKTIF' }));
        }
        updated.push(res.value);
        db.set('tahun_ajaran', updated);
        Swal.fire('Sukses', 'Tahun ajaran akademik berhasil ditambahkan.', 'success');
        loadAllData();
      }
    });
  };

  const handleToggleTahunAjaranStatus = (idx: number) => {
    const current = db.get<any>('tahun_ajaran') || [];
    if (idx >= 0 && idx < current.length) {
      const target = current[idx];
      const newStatus = target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
      let updated = [...current];
      if (newStatus === 'AKTIF') {
        updated = updated.map((u, i) => i === idx ? { ...u, status: 'AKTIF' } : { ...u, status: 'NONAKTIF' });
      } else {
        updated[idx] = { ...target, status: 'NONAKTIF' };
      }
      db.set('tahun_ajaran', updated);
      Swal.fire('Sukses', `Status Tahun Ajaran "${target.ta}" berhasil diubah menjadi ${newStatus}.`, 'success');
      loadAllData();
    }
  };

  const handleDeleteTahunAjaran = (idx: number) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data Tahun Ajaran ini akan dihapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const current = db.get<any>('tahun_ajaran') || [];
        if (idx >= 0 && idx < current.length) {
          const removed = current.splice(idx, 1);
          db.set('tahun_ajaran', current);
          Swal.fire('Terhapus!', `Tahun Ajaran "${removed[0].ta}" telah dihapus.`, 'success');
          loadAllData();
        }
      }
    });
  };

  const handleAddSemester = () => {
    Swal.fire({
      title: '➕ Tambah Siklus Semester',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Semester</label>
            <input id="swal-sem-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Semester Ganjil 2026/2027" required>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipe Semester</label>
            <select id="swal-sem-tipe" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="ODD">ODD (Ganjil)</option>
              <option value="EVEN">EVEN (Genap)</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
            <select id="swal-sem-status" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
              <option value="NONAKTIF">NONAKTIF</option>
              <option value="AKTIF">AKTIF</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const semVal = (document.getElementById('swal-sem-nama') as HTMLInputElement).value.trim();
        const tipeVal = (document.getElementById('swal-sem-tipe') as HTMLSelectElement).value;
        const statusVal = (document.getElementById('swal-sem-status') as HTMLSelectElement).value;
        
        if (!semVal) {
          Swal.showValidationMessage('Nama Semester wajib diisi!');
          return false;
        }
        return { sem: semVal, tipe: tipeVal, status: statusVal };
      }
    }).then((res: any) => {
      if (res.isConfirmed) {
        const current = db.get<any>('semester') || [];
        if (current.some((s: any) => s.sem === res.value.sem)) {
          Swal.fire('Validasi Gagal', `Semester "${res.value.sem}" sudah terdaftar!`, 'error');
          return;
        }
        let updated = [...current];
        if (res.value.status === 'AKTIF') {
          updated = updated.map(u => ({ ...u, status: 'NONAKTIF' }));
        }
        updated.push(res.value);
        db.set('semester', updated);
        Swal.fire('Sukses', 'Siklus semester berhasil ditambahkan.', 'success');
        loadAllData();
      }
    });
  };

  const handleToggleSemesterStatus = (idx: number) => {
    const current = db.get<any>('semester') || [];
    if (idx >= 0 && idx < current.length) {
      const target = current[idx];
      const newStatus = target.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
      let updated = [...current];
      if (newStatus === 'AKTIF') {
        updated = updated.map((u, i) => i === idx ? { ...u, status: 'AKTIF' } : { ...u, status: 'NONAKTIF' });
      } else {
        updated[idx] = { ...target, status: 'NONAKTIF' };
      }
      db.set('semester', updated);
      Swal.fire('Sukses', `Status Semester "${target.sem}" berhasil diubah menjadi ${newStatus}.`, 'success');
      loadAllData();
    }
  };

  const handleDeleteSemester = (idx: number) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data Semester ini akan dihapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const current = db.get<any>('semester') || [];
        if (idx >= 0 && idx < current.length) {
          const removed = current.splice(idx, 1);
          db.set('semester', current);
          Swal.fire('Terhapus!', `Semester "${removed[0].sem}" telah dihapus.`, 'success');
          loadAllData();
        }
      }
    });
  };

  const handleSiswaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Required fields validation
    if (!siswaForm.nama || !siswaForm.nisn || !siswaForm.tglLahir) {
      Swal.fire('Validasi Gagal', 'Mohon lengkapi data wajib bertanda (*): Nama, NISN, dan Tanggal Lahir.', 'error');
      return;
    }

    // 1. Tahun Masuk: Wajib Angka 4 digit
    if (siswaForm.tahunMasuk && !/^\d{4}$/.test(siswaForm.tahunMasuk.toString())) {
      Swal.fire('Validasi Gagal', 'Tahun Masuk harus berupa 4 digit angka (contoh: 2026).', 'error');
      return;
    }

    // 2. NISN: Wajib 10 digit angka
    if (!/^\d{10}$/.test(siswaForm.nisn)) {
      Swal.fire('Validasi Gagal', 'NISN wajib berupa 10 digit angka (tidak boleh kurang/lebih).', 'error');
      return;
    }

    // 3. NIK: Wajib 16 digit angka
    if (siswaForm.nik && !/^\d{16}$/.test(siswaForm.nik)) {
      Swal.fire('Validasi Gagal', 'NIK harus berupa 16 digit angka.', 'error');
      return;
    }

    // 4. Anak Ke / Saudara: Wajib Angka
    if (siswaForm.anakKe !== undefined && isNaN(Number(siswaForm.anakKe))) {
      Swal.fire('Validasi Gagal', 'Anak ke harus berupa angka.', 'error');
      return;
    }
    if (siswaForm.saudara !== undefined && isNaN(Number(siswaForm.saudara))) {
      Swal.fire('Validasi Gagal', 'Saudara harus berupa angka.', 'error');
      return;
    }

    // 5. Tinggi / Berat Badan: Wajib Angka (tanpa satuan)
    if (siswaForm.tinggiBadan !== undefined && isNaN(Number(siswaForm.tinggiBadan))) {
      Swal.fire('Validasi Gagal', 'Tinggi badan harus berupa angka saja (tanpa cm).', 'error');
      return;
    }
    if (siswaForm.beratBadan !== undefined && isNaN(Number(siswaForm.beratBadan))) {
      Swal.fire('Validasi Gagal', 'Berat badan harus berupa angka saja (tanpa kg).', 'error');
      return;
    }

    // 6. RT / RW: Wajib Angka (Maksimal 3 digit)
    if (siswaForm.rt && !/^\d{1,3}$/.test(siswaForm.rt)) {
      Swal.fire('Validasi Gagal', 'RT harus berupa angka (maksimal 3 digit).', 'error');
      return;
    }
    if (siswaForm.rw && !/^\d{1,3}$/.test(siswaForm.rw)) {
      Swal.fire('Validasi Gagal', 'RW harus berupa angka (maksimal 3 digit).', 'error');
      return;
    }

    // 7. Kode Pos: Wajib 5 digit angka
    if (siswaForm.kodePos && !/^\d{5}$/.test(siswaForm.kodePos)) {
      Swal.fire('Validasi Gagal', 'Kode Pos harus berupa 5 digit angka.', 'error');
      return;
    }

    // 8. Nomor HP: Wajib Angka diawali 08 / 62
    if (siswaForm.noHp && !/^(08|62)\d+$/.test(siswaForm.noHp)) {
      Swal.fire('Validasi Gagal', 'Nomor HP Aktif harus berupa angka dan diawali dengan 08 atau 62.', 'error');
      return;
    }

    // 9. Email: Format valid
    if (siswaForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siswaForm.email)) {
      Swal.fire('Validasi Gagal', 'Format E-Mail tidak valid (harus mengandung @ dan domain).', 'error');
      return;
    }

    // 10. No KK: Wajib 16 digit angka
    if (siswaForm.noKk && !/^\d{16}$/.test(siswaForm.noKk)) {
      Swal.fire('Validasi Gagal', 'Nomor Kartu Keluarga harus berupa 16 digit angka.', 'error');
      return;
    }

    // 11. NIK Orang Tua: Wajib 16 digit
    if (siswaForm.nikAyah && !/^\d{16}$/.test(siswaForm.nikAyah)) {
      Swal.fire('Validasi Gagal', 'NIK Ayah harus berupa 16 digit angka.', 'error');
      return;
    }
    if (siswaForm.nikIbu && !/^\d{16}$/.test(siswaForm.nikIbu)) {
      Swal.fire('Validasi Gagal', 'NIK Ibu harus berupa 16 digit angka.', 'error');
      return;
    }

    // 12. No Tlp Orang Tua: Wajib Angka
    if (siswaForm.tlpAyah && !/^\d+$/.test(siswaForm.tlpAyah)) {
      Swal.fire('Validasi Gagal', 'Tlp. Ayah harus berupa angka.', 'error');
      return;
    }
    if (siswaForm.tlpIbu && !/^\d+$/.test(siswaForm.tlpIbu)) {
      Swal.fire('Validasi Gagal', 'Tlp. Ibu harus berupa angka.', 'error');
      return;
    }
    if (siswaForm.tlpWali && !/^\d+$/.test(siswaForm.tlpWali)) {
      Swal.fire('Validasi Gagal', 'Tlp. Wali harus berupa angka.', 'error');
      return;
    }

    if (editingSiswa) {
      // Edit Student
      let finalNisn = siswaForm.nisn ? siswaForm.nisn.trim() : '';
      if (!finalNisn) {
        const rand = Math.floor(10000 + Math.random() * 90000);
        finalNisn = `99999${rand}`;
      }

      const matchedK = kelasList.find(k => k.id === siswaForm.kelasId || k.nama === siswaForm.kelasId);
      const kNama = matchedK ? (matchedK.nama ? `Kelas ${matchedK.nama.replace(/^Kelas\s+/i, '')}` : siswaForm.kelasId) : (siswaForm.kelasId || '');

      const updatedSiswa: Siswa = {
        ...editingSiswa,
        ...(siswaForm as Siswa),
        nisn: finalNisn,
        nis: siswaForm.noPdkt || '',
        kelas: kNama || editingSiswa.kelas,
        kelasSaatIni: kNama || editingSiswa.kelasSaatIni,
        status: getNormalizedStatus(siswaForm.status || editingSiswa.status),
        classHistory: {
          ...(editingSiswa.classHistory || {}),
          '2026/2027': siswaForm.kelasId || ''
        }
      };
      db.update<Siswa>('siswa', 'id', editingSiswa.id, updatedSiswa);
      window.dispatchEvent(new CustomEvent('erp-db-synced'));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'siswa' } }));
      Swal.fire('Sukses', 'Biodata siswa berhasil diperbarui.', 'success');
    } else {
      // Add Student
      let finalNisn = siswaForm.nisn ? siswaForm.nisn.trim() : '';
      if (!finalNisn) {
        const rand = Math.floor(10000 + Math.random() * 90000);
        finalNisn = `99999${rand}`;
      }

      const isRegistered = siswaList.some(s => s.nisn === finalNisn);
      if (isRegistered) {
        Swal.fire('Error', 'NISN ini sudah terdaftar dalam sistem.', 'error');
        return;
      }

      const matchedK = kelasList.find(k => k.id === siswaForm.kelasId || k.nama === siswaForm.kelasId);
      const kNama = matchedK ? (matchedK.nama ? `Kelas ${matchedK.nama.replace(/^Kelas\s+/i, '')}` : siswaForm.kelasId) : (siswaForm.kelasId || '');

      const newId = `SIS_${finalNisn}`;
      const newSiswa: Siswa = {
        ...(siswaForm as Siswa),
        id: newId,
        nisn: finalNisn,
        nis: siswaForm.noPdkt || '',
        kelas: kNama,
        kelasSaatIni: kNama,
        status: getNormalizedStatus(siswaForm.status || 'AKTIF'),
        classHistory: {
          '2026/2027': siswaForm.kelasId || ''
        }
      } as Siswa;

      db.insert<Siswa>('siswa', newSiswa);
      window.dispatchEvent(new CustomEvent('erp-db-synced'));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'siswa' } }));
      Swal.fire('Sukses', 'Siswa baru berhasil ditambahkan.', 'success');
    }

    setIsSiswaModalOpen(false);
    setEditingSiswa(null);
    loadAllData();
  };

  const handleDeleteSiswa = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Siswa?',
      text: `Apakah Anda yakin ingin menghapus data siswa "${nama}" secara permanen?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<Siswa>('siswa', 'id', id);
        Swal.fire('Terhapus!', 'Data siswa telah dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleDeleteOrtu = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Orang Tua?',
      text: `Apakah Anda yakin ingin menghapus data Orang Tua "${name}" secara permanen?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<any>('users', 'id', id);
        Swal.fire('Terhapus!', 'Data Orang Tua telah dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleResetOrtuDatabase = () => {
    Swal.fire({
      title: 'Hapus Semua Orang Tua?',
      text: 'Apakah Anda yakin ingin menghapus seluruh data Orang Tua dari database? Tindakan ini tidak dapat dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const allUsers = db.get<any>('users') || [];
        const filtered = allUsers.filter((u: any) => u && u.role !== 'ORANG_TUA' && u.role !== 'ORTU');
        db.set('users', filtered);
        Swal.fire('Berhasil!', 'Semua database Orang Tua telah dihapus bersih.', 'success');
        loadAllData();
      }
    });
  };

  const handleResetSiswaDatabase = () => {
    Swal.fire({
      title: '⚠️ Kosongkan Database Siswa?',
      text: 'Tindakan ini akan menghapus seluruh data siswa aktif/keluar/pindah beserta akun login siswa saat ini secara permanen untuk memulai dari database kosong.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kosongkan!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        restorePristineTsvStudents();
        Swal.fire({
          title: 'Database Dibersihkan!',
          text: 'Mengatur ulang data... Halaman akan dimuat ulang dengan database siswa kosong.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  const handleResetModule = (module: 'siswa' | 'guru' | 'mapel' | 'biaya' | 'buku' | 'barang') => {
    const moduleNames: Record<string, string> = {
      siswa: 'Data Siswa & Transaksi',
      guru: 'Data Guru & Penugasan',
      mapel: 'Data Mata Pelajaran & Kurikulum',
      biaya: 'Data Tarif Biaya & Keuangan',
      buku: 'Katalog Buku Perpustakaan',
      barang: 'Aset & Inventaris Barang'
    };

    Swal.fire({
      title: `⚠️ Bersihkan ${moduleNames[module]}?`,
      text: `Apakah Anda yakin ingin menghapus seluruh data simulasi ${moduleNames[module]} secara permanen? Data yang telah dihapus tidak dapat dipulihkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kosongkan!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        if (module === 'siswa') {
          db.set('siswa', []);
        } else if (module === 'guru') {
          db.set('guru', []);
          const usersList = db.get<User>('users');
          if (Array.isArray(usersList)) {
            const remaining = usersList.filter((u: any) => u.role !== 'GURU');
            db.set('users', remaining);
          }
        } else if (module === 'mapel') {
          db.set('mapel', []);
        } else if (module === 'biaya') {
          db.set('biaya', []);
        } else if (module === 'buku') {
          db.set('buku', []);
        } else if (module === 'barang') {
          db.set('barang', []);
        }

        Swal.fire({
          title: 'Berhasil Dibersihkan!',
          text: `${moduleNames[module]} telah dikosongkan. Halaman akan memuat ulang.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  const handleResetAllDatabase = () => {
    Swal.fire({
      title: '🔥 KOSONGKAN SELURUH DATABASE ERP?',
      html: `Tindakan ini akan <strong>menghapus seluruh data simulasi/sampel</strong> di semua modul secara permanen:<br>
             • Siswa, Orang Tua, & Riwayat<br>
             • Guru & Penugasan<br>
             • Mata Pelajaran & Kurikulum<br>
             • Tarif Keuangan & Tagihan<br>
             • Buku Perpustakaan & Inventaris Barang<br><br>
             <span class="text-rose-600 font-extrabold">Akun login Admin & Yayasan akan tetap dipertahankan untuk keamanan akses Anda.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Bersihkan Total!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        // Clear all operational tables via db
        const operationalKeys = [
          'siswa', 'guru', 'mapel', 'biaya', 'tagihan', 'pembayaran', 'tabungan',
          'spmb_pendaftar', 'log_ujian', 'hasil_ujian', 'hasil_tugas', 'absensi',
          'bimbingan', 'pelanggaran', 'buku', 'peminjaman_buku', 'barang', 'peminjaman_barang',
          'logs', 'ujian', 'soal', 'tugas'
        ];
        operationalKeys.forEach(k => db.set(k, []));

        // Keep admin users
        const existingUsers = db.get<User>('users');
        let currentAdminUsers: any[] = [];
        if (Array.isArray(existingUsers)) {
          currentAdminUsers = existingUsers.filter((u: any) => u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.role === 'YAYASAN');
        }
        if (currentAdminUsers.length === 0) {
          currentAdminUsers = [
            { id: 'USR_superadmin', username: 'admin', email: 'admin@rombel.sch.id', password: 'admin', role: 'SUPERADMIN', name: 'Super Administrator', status: 'AKTIF' }
          ];
        }
        db.set('users', currentAdminUsers);

        Swal.fire({
          title: 'Database Bersih Total!',
          text: 'Seluruh simulasi data pokok telah dibuang. Halaman akan memuat ulang.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  const handleRestoreSampleSiswa = () => {
    localStorage.removeItem('ERP_pristine_clean_mode');
    localStorage.removeItem('ERP_siswa_purged_all');
    localStorage.removeItem('ERP_siswa_manual_purge_requested_2026');
    // Clear other item states so they re-initialize
    localStorage.removeItem('ERP_siswa');
    localStorage.removeItem('ERP_guru');
    localStorage.removeItem('ERP_mapel');
    localStorage.removeItem('ERP_biaya');
    localStorage.removeItem('ERP_buku');
    localStorage.removeItem('ERP_barang');
    localStorage.removeItem('ERP_users');
    localStorage.removeItem('ERP_absensi');
    localStorage.removeItem('ERP_tabungan');
    localStorage.removeItem('ERP_tagihan');
    localStorage.removeItem('ERP_pembayaran');
    localStorage.removeItem('ERP_spmb_pendaftar');
    localStorage.removeItem('ERP_log_ujian');
    localStorage.removeItem('ERP_hasil_ujian');
    localStorage.removeItem('ERP_hasil_tugas');
    localStorage.removeItem('ERP_ujian');
    localStorage.removeItem('ERP_tugas');
    localStorage.removeItem('ERP_peminjaman_buku');
    localStorage.removeItem('ERP_peminjaman_barang');
    localStorage.removeItem('ERP_bimbingan');
    localStorage.removeItem('ERP_pelanggaran');
    localStorage.removeItem('ERP_logs');
    localStorage.removeItem('ERP_soal');
    
    Swal.fire({
      title: 'Memulihkan Data...',
      text: 'Mengaktifkan kembali sinkronisasi otomatis dan memuat ulang data siswa sampel.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    }).then(() => {
      window.location.reload();
    });
  };

  const handleDownloadTemplate = () => {
    const targetInfo = getTableInfo(importTarget);
    const wb = XLSX.utils.book_new();

    if (importTarget === 'semua_tabel') {
      const majorTables = ['siswa', 'guru', 'kelas', 'mapel', 'spmb_pendaftar', 'biaya', 'tagihan', 'buku', 'barang'];
      majorTables.forEach((tblKey) => {
        const info = getTableInfo(tblKey);
        const sampleVals = info.sample.includes('\t') ? info.sample.split('\t') : info.sample.split(',');
        const wsData = [info.cols, sampleVals];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, tblKey.toUpperCase().slice(0, 31));
      });
      XLSX.writeFile(wb, `Template_Impor_SEMUA_TABEL_DATABASE.xlsx`);
      Swal.fire({
        title: 'Template Excel Diunduh (.xlsx)',
        text: `File Template Excel Multi-Tabel (.xlsx) telah diunduh. Setiap sheet berisi header kolom resmi untuk masing-masing tabel database.`,
        icon: 'success'
      });
    } else {
      const sampleVals = targetInfo.sample.includes('\t') ? targetInfo.sample.split('\t') : targetInfo.sample.split(',');
      const wsData = [targetInfo.cols, sampleVals];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, importTarget.toUpperCase().slice(0, 31));
      XLSX.writeFile(wb, `Template_Impor_${importTarget.toUpperCase()}.xlsx`);
      Swal.fire({
        title: 'Template Excel Diunduh (.xlsx)',
        text: `File Template Excel (.xlsx) untuk tabel '${targetInfo.cleanTitle}' telah diunduh! Silakan buka di Microsoft Excel / Google Sheets, isi datanya, lalu salin-tempel ke kotak impor.`,
        icon: 'success'
      });
    }
  };

  const handleClearCurrentTable = () => {
    const targetInfo = getTableInfo(importTarget);
    if (importTarget === 'semua_tabel') {
      handleResetAllDatabase();
      return;
    }
    Swal.fire({
      title: `Kosongkan Tabel ${targetInfo.cleanTitle}?`,
      text: `Tindakan ini akan menghapus seluruh data pada tabel '${importTarget.toUpperCase()}'. Data akan menjadi kosong agar siap diisi data baru.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kosongkan Tabel Ini',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.set(importTarget, []);
        localStorage.setItem(`ERP_KTCT_${importTarget}`, JSON.stringify([]));
        localStorage.setItem(`ERP_${importTarget}`, JSON.stringify([]));
        setParsedSiswa([]);
        setPasteText('');
        Swal.fire('Tabel Dikosongkan', `Tabel '${targetInfo.cleanTitle}' telah dikosongkan.`, 'success');
      }
    });
  };

  const handleExportFullDatabaseExcel = () => {
    const allTables = [
      'setting', 'users', 'role', 'menu', 'hak_akses', 'logs', 'audit_log', 'notifikasi',
      'siswa', 'guru', 'orang_tua', 'kelas', 'web_downloads', 'web_gallery', 'form_fields', 'web_config',
      'jenjang', 'mapel', 'tahun_ajaran', 'semester', 'hari_libur', 'jadwal', 'agenda', 'nilai',
      'rapor', 'kenaikan_kelas', 'kelulusan', 'absensi', 'absensi_guru', 'qr_log', 'bank_soal', 'ujian',
      'log_ujian', 'token', 'draft_jawaban', 'hasil_ujian', 'jenis_ujian', 'tugas', 'hasil_tugas', 'analisis_soal',
      'spmb_pendaftar', 'biaya', 'tagihan', 'pembayaran', 'tabungan', 'kas', 'pengeluaran', 'invoice',
      'bimbingan', 'pelanggaran', 'barang', 'pemeliharaan', 'peminjaman_barang', 'file', 'arsip', 'backup', 'master_siswa'
    ];
    const wb = XLSX.utils.book_new();
    let addedSheets = 0;

    allTables.forEach((t) => {
      const data = db.get(t) || [];
      if (Array.isArray(data) && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        const sheetName = t.toUpperCase().slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        addedSheets++;
      } else {
        // Even if empty, export sheet with official header columns
        const info = getTableInfo(t);
        const ws = XLSX.utils.aoa_to_sheet([info.cols]);
        const sheetName = t.toUpperCase().slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        addedSheets++;
      }
    });

    const fileName = `FULL_DATABASE_57_TABEL_ERP_KTCT_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    Swal.fire({
      title: 'Database 57 Tabel Berhasil Diekspor ke Excel! 📊',
      text: `Berhasil mengekspor seluruh ${addedSheets} tabel database ke file Microsoft Excel (.xlsx) lengkap dengan sheet dan header kolom resmi. Anda dapat langsung membuka file ini di Microsoft Excel atau Google Sheets!`,
      icon: 'success'
    });
  };

  const handleExportFullDatabaseJson = () => {
    const allTables = [
      'setting', 'users', 'role', 'menu', 'hak_akses', 'logs', 'audit_log', 'notifikasi',
      'siswa', 'guru', 'orang_tua', 'kelas', 'web_downloads', 'web_gallery', 'form_fields', 'web_config',
      'jenjang', 'mapel', 'tahun_ajaran', 'semester', 'hari_libur', 'jadwal', 'agenda', 'nilai',
      'rapor', 'kenaikan_kelas', 'kelulusan', 'absensi', 'absensi_guru', 'qr_log', 'bank_soal', 'ujian',
      'log_ujian', 'token', 'draft_jawaban', 'hasil_ujian', 'jenis_ujian', 'tugas', 'hasil_tugas', 'analisis_soal',
      'spmb_pendaftar', 'biaya', 'tagihan', 'pembayaran', 'tabungan', 'kas', 'pengeluaran', 'invoice',
      'bimbingan', 'pelanggaran', 'barang', 'pemeliharaan', 'peminjaman_barang', 'file', 'arsip', 'backup', 'master_siswa'
    ];
    const fullBackup: Record<string, any> = {};
    allTables.forEach((t) => {
      fullBackup[t] = db.get(t) || [];
    });
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BACKUP_FULL_57_TABEL_ERP_KTCT_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire({
      title: 'Backup System (.json) Diunduh 📦',
      text: 'File .json ini berisi Cadangan Database 57 Tabel Sistem (Backup/Restore). Untuk membacanya: Buka dengan Notepad/Text Editor, atau gunakan file ini untuk Restore Database di opsi "SEMUA TABEL DATABASE".',
      icon: 'info'
    });
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      Swal.fire('Error', 'Silakan tempel (paste) data spreadsheet atau JSON Anda terlebih dahulu.', 'error');
      return;
    }

    if (importTarget === 'semua_tabel') {
      try {
        const fullJson = JSON.parse(pasteText);
        if (typeof fullJson === 'object' && fullJson !== null) {
          const keys = Object.keys(fullJson);
          if (keys.length > 0) {
            const summaryRows = keys.map((tName) => {
              const items = Array.isArray(fullJson[tName]) ? fullJson[tName] : [];
              return {
                id: tName,
                tabel: tName.toUpperCase(),
                jumlahBaris: `${items.length} Data`,
                contohKolom: items.length > 0 && typeof items[0] === 'object' ? Object.keys(items[0]).slice(0, 6).join(', ') : 'Tabel Kosong'
              };
            });
            setParsedSiswa(summaryRows);
            (window as any)._pendingFullJson = fullJson;
            Swal.fire({
              title: 'Backup Semua Tabel Terdeteksi!',
              text: `Berhasil membaca ${keys.length} tabel database (${keys.slice(0, 8).join(', ')}...). Klik 'Selesaikan Impor' untuk memperbarui semua tabel database.`,
              icon: 'success'
            });
            return;
          }
        }
      } catch (e) {
        Swal.fire('Format Tidak Sesuai', 'Untuk opsi "SEMUA TABEL DATABASE", silakan tempel (paste) data JSON Backup yang berisi struktur tabel database.', 'error');
        return;
      }
    }

    const lines = pasteText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      Swal.fire('Error', 'Data kosong atau tidak valid.', 'error');
      return;
    }

    const delimiter = pasteText.includes('\t') ? '\t' : (pasteText.includes(';') ? ';' : ',');
    const targetInfo = getTableInfo(importTarget);

    let headers: string[] = [];
    let dataLines: string[] = [];

    if (hasHeaderRow) {
      const firstLineCols = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      headers = firstLineCols.map(h => h.toLowerCase());
      dataLines = lines.slice(1);

      if (dataLines.length === 0) {
        headers = targetInfo.cols.map(c => c.toLowerCase());
        dataLines = lines;
      }
    } else {
      headers = targetInfo.cols.map(c => c.toLowerCase());
      dataLines = lines;
    }

    if (importTarget === 'siswa') {
      const colMap: Record<string, number> = {
        noPdkt: headers.findIndex(h => h === 'nopdkt' || h.includes('pdkt') || h.includes('pendaftaran') || h.includes('no. pdkt') || h.includes('no_pdkt')),
        tahunMasuk: headers.findIndex(h => h.includes('tahun masuk') || h.includes('thn masuk')),
        nisn: headers.findIndex(h => h.includes('nisn')),
        nama: headers.findIndex(h => h.includes('nama lengkap') || h.includes('nama_lengkap') || h.includes('nama siswa') || h.includes('nama')),
        jk: headers.findIndex(h => h.includes('jenis kelamin') || h.includes('jk') || h.includes('kelamin') || h.includes('gender') || h.includes('l/p')),
        tempatLahir: headers.findIndex(h => h.includes('tempat lahir')),
        tglLahir: headers.findIndex(h => h.includes('tanggal lahir') || h.includes('tgl lahir') || h.includes('tgl_lahir')),
        nik: headers.findIndex(h => h === 'nik' || h.includes('nik siswa')),
        alamat: headers.findIndex(h => h.includes('alamat')),
        noHp: headers.findIndex(h => h.includes('nomor hp') || h.includes('no. hp') || h.includes('hp') || h.includes('wa')),
        email: headers.findIndex(h => h.includes('e-mail') || h.includes('email')),
        namaAyah: headers.findIndex(h => h.includes('nama ayah')),
        namaIbu: headers.findIndex(h => h.includes('nama ibu')),
        status: headers.findIndex(h => h.includes('status terbaru') || h.includes('status') || h.includes('keaktifan')),
        kelasId: headers.findIndex(h => h.includes('kelas saat ini') || h.includes('kelas') || h.includes('rombel') || h.includes('id_kelas'))
      };

      // Exact index fallbacks matching user's official 72-column SISWA sheet
      if (colMap.nama === -1) colMap.nama = 3;
      if (colMap.noPdkt === -1) colMap.noPdkt = 0;
      if (colMap.tahunMasuk === -1) colMap.tahunMasuk = 1;
      if (colMap.nisn === -1) colMap.nisn = 2;
      if (colMap.jk === -1) colMap.jk = 4;
      if (colMap.tempatLahir === -1) colMap.tempatLahir = 5;
      if (colMap.tglLahir === -1) colMap.tglLahir = 6;
      if (colMap.nik === -1) colMap.nik = 7;
      if (colMap.alamat === -1) colMap.alamat = 17;
      if (colMap.noHp === -1) colMap.noHp = 27;
      if (colMap.email === -1) colMap.email = 28;
      if (colMap.namaAyah === -1) colMap.namaAyah = 35;
      if (colMap.namaIbu === -1) colMap.namaIbu = 43;
      if (colMap.status === -1) colMap.status = 70;
      if (colMap.kelasId === -1) colMap.kelasId = 71;

      // Check if header line is column title
      const isHeaderRow = (cols: string[]) => {
        const val = cols.join(' ').toLowerCase();
        return val.includes('nama') && val.includes('nisn') || val.includes('nopdkt') || val.includes('tahun masuk');
      };

      const startLineIdx = isHeaderRow(lines[0].split(delimiter)) ? 1 : 0;
      const dataLines = lines.slice(startLineIdx);
      const finalParsedStudents: any[] = [];

      dataLines.forEach((row, rowIdx) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 2) return;

        let rawNama = cols[colMap.nama] || cols[3] || cols[2] || cols[1] || '';
        if (!rawNama || rawNama.toLowerCase() === 'nama' || rawNama.toLowerCase() === 'nama lengkap' || rawNama.toUpperCase() === 'STATUS' || rawNama.toUpperCase() === 'NOPDKT') {
          return;
        }

        let rawPdkt = cols[colMap.noPdkt] || cols[0] || '';
        const genericValues = ['AKTIF', 'TIDAK AKTIF', 'BELUM', 'PINDAH', 'LULUS', 'KELUAR', 'STATUS', 'NOPDKT', 'PDKT'];
        if (!rawPdkt || genericValues.includes(rawPdkt.toUpperCase())) {
          rawPdkt = `PDKT-2026-${String(rowIdx + 1).padStart(3, '0')}`;
        }

        const rawNisn = cols[colMap.nisn] || cols[2] || cols[18] || '';
        const rawJkInput = cols[colMap.jk] || cols[4] || 'L';
        const rawJk: 'L' | 'P' = (rawJkInput.toUpperCase().startsWith('P') || rawJkInput.toLowerCase().includes('wanita') || rawJkInput.toLowerCase().includes('perempuan')) ? 'P' : 'L';
        const rawKelas = cols[colMap.kelasId] || cols[71] || cols[5] || 'C10';
        const rawTahunMasuk = parseInt(cols[colMap.tahunMasuk] || cols[1]) || 2026;
        const rawStatusInput = cols[colMap.status] || cols[70] || cols[0] || 'AKTIF';
        const rawStatus = ['AKTIF', 'TIDAK AKTIF', 'BELUM', 'PINDAH', 'LULUS', 'KELUAR'].includes(rawStatusInput.toUpperCase()) ? (rawStatusInput.toUpperCase() as any) : 'AKTIF';

        let rawTglLahir = cols[colMap.tglLahir] || cols[6] || '';
        if (rawTglLahir && rawTglLahir.includes('/')) {
          const parts = rawTglLahir.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            rawTglLahir = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        if (!rawTglLahir) rawTglLahir = '2012-01-01';

        finalParsedStudents.push({
          id: `SIS_${String(rowIdx + 1).padStart(3, '0')}`,
          noPdkt: rawPdkt,
          nis: rawPdkt,
          nisn: rawNisn || `008${Math.floor(1000000 + Math.random() * 9000000)}`,
          nama: rawNama,
          jk: rawJk,
          kelasId: rawKelas,
          tahunMasuk: rawTahunMasuk,
          tahunAjaran: `${rawTahunMasuk}/${rawTahunMasuk + 1}`,
          status: rawStatus,
          keterangan: rawStatus === 'AKTIF' ? 'Aktif Belajar' : rawStatus,
          tglLahir: rawTglLahir,
          tempatLahir: cols[colMap.tempatLahir] || cols[5] || 'JAKARTA',
          nik: cols[colMap.nik] || cols[7] || '',
          alamat: cols[colMap.alamat] || cols[17] || '',
          noHp: cols[colMap.noHp] || cols[27] || '',
          email: cols[colMap.email] || cols[28] || '',
          namaAyah: cols[colMap.namaAyah] || cols[35] || '',
          namaIbu: cols[colMap.namaIbu] || cols[43] || '',
          riwayatAkademis: [{
            tahunAjaran: `${rawTahunMasuk}/${rawTahunMasuk + 1}`,
            kelasId: rawKelas,
            status: rawStatus,
            keterangan: 'Aktif Belajar'
          }]
        });
      });

      if (finalParsedStudents.length === 0) {
        Swal.fire('Error', 'Tidak ada data baris yang valid untuk di-parsing. Pastikan format tabel memiliki kolom Nama Siswa.', 'error');
        return;
      }

      setParsedSiswa(finalParsedStudents);
      Swal.fire({
        title: 'Berhasil Membaca Data Impor',
        text: `Berhasil mem-parsing ${finalParsedStudents.length} data siswa dari file/spreadsheet Anda. Silakan periksa pratinjau tabel di bawah lalu klik 'Terapkan Impor Data'.`,
        icon: 'success',
        confirmButtonText: 'Sempurna, Tampilkan Pratinjau'
      });
      return;
    } else if (importTarget === 'guru') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('nip') || h.includes('id_guru') || h.includes('kode')),
        nip: headers.findIndex(h => h.includes('nip')),
        nama: headers.findIndex(h => h.includes('nama') || h.includes('lengkap')),
        mapel: headers.findIndex(h => h.includes('mapel') || h.includes('bidang') || h.includes('pelajaran')),
        kelasAjar: headers.findIndex(h => h.includes('kelas') || h.includes('ajar')),
        jk: headers.findIndex(h => h.includes('jk') || h.includes('kelamin') || h.includes('gender')),
        noHp: headers.findIndex(h => h.includes('hp') || h.includes('telepon') || h.includes('phone') || h.includes('wa')),
        email: headers.findIndex(h => h.includes('email')),
        status: headers.findIndex(h => h.includes('status'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawNama = cols[colMap.nama !== -1 ? colMap.nama : 1] || cols[0];
        if (!rawNama) return;

        const rawNip = colMap.nip !== -1 && cols[colMap.nip] ? cols[colMap.nip] : (colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : `GUR_${Math.floor(100000 + Math.random() * 900000)}`);
        const rawId = `GUR_${rawNip.replace(/[^A-Za-z0-9_-]/g, '')}`;
        const rawMapel = colMap.mapel !== -1 && cols[colMap.mapel] ? cols[colMap.mapel] : 'Fisika';
        const rawKelasAjar = colMap.kelasAjar !== -1 && cols[colMap.kelasAjar] ? cols[colMap.kelasAjar] : '';
        const jkInput = colMap.jk !== -1 && cols[colMap.jk] ? cols[colMap.jk] : 'L';
        const rawJk: 'L' | 'P' = (jkInput.toUpperCase().startsWith('P') || jkInput.toLowerCase().includes('wanita') || jkInput.toLowerCase().includes('perempuan')) ? 'P' : 'L';
        const rawNoHp = colMap.noHp !== -1 && cols[colMap.noHp] ? cols[colMap.noHp] : '';
        const rawEmail = colMap.email !== -1 && cols[colMap.email] ? cols[colMap.email] : `${rawNip}@rombel-ktct.sch.id`;
        const rawStatus = colMap.status !== -1 && cols[colMap.status] ? (cols[colMap.status].toUpperCase() === 'AKTIF' || cols[colMap.status].toUpperCase() === 'YA' ? 'AKTIF' : 'TIDAK AKTIF') : 'AKTIF';

        parsedRows.push({
          id: rawId,
          nip: rawNip,
          nama: rawNama,
          mapel: rawMapel,
          kelasAjar: rawKelasAjar,
          jk: rawJk,
          noHp: rawNoHp,
          email: rawEmail,
          status: rawStatus
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} guru dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');

    } else if (importTarget === 'kelas') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('kode') || h.includes('id_kelas')),
        nama: headers.findIndex(h => h.includes('nama') || h.includes('kelas') || h.includes('rombel')),
        wali: headers.findIndex(h => h.includes('wali') || h.includes('guru') || h.includes('pembimbing')),
        aktif: headers.findIndex(h => h.includes('aktif') || h.includes('status')),
        jenjang: headers.findIndex(h => h.includes('jenjang') || h.includes('paket') || h.includes('tingkat'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawNama = cols[colMap.nama !== -1 ? colMap.nama : 0] || '';
        if (!rawNama) return;

        const rawId = colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : rawNama.toUpperCase().replace(/\s+/g, '');
        const rawWali = colMap.wali !== -1 && cols[colMap.wali] ? cols[colMap.wali] : '';
        const rawAktif = colMap.aktif !== -1 && cols[colMap.aktif] ? (cols[colMap.aktif].toUpperCase() === 'AKTIF' || cols[colMap.aktif].toUpperCase() === 'YA' || cols[colMap.aktif] === '1') : true;
        const rawJenjang = colMap.jenjang !== -1 && cols[colMap.jenjang] ? cols[colMap.jenjang] : (['4', '5', '6'].some(c => rawNama.includes(c)) ? 'PAKET A' : ['7', '8', '9'].some(c => rawNama.includes(c)) ? 'PAKET B' : 'PAKET C');

        parsedRows.push({
          id: rawId,
          nama: rawNama,
          wali: rawWali,
          aktif: rawAktif,
          jenjang: rawJenjang
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} kelas dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');

    } else if (importTarget === 'mapel') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('kode') || h.includes('id_mapel')),
        nama: headers.findIndex(h => h.includes('nama') || h.includes('mapel') || h.includes('pelajaran')),
        kkm: headers.findIndex(h => h.includes('kkm') || h.includes('minimum') || h.includes('batas')),
        jenjang: headers.findIndex(h => h.includes('jenjang') || h.includes('paket')),
        kelas: headers.findIndex(h => h.includes('kelas') || h.includes('tingkat') || h.includes('rombel'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawNama = cols[colMap.nama !== -1 ? colMap.nama : 1] || cols[0];
        if (!rawNama) return;

        const rawId = colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : `MP_${rawNama.toUpperCase().replace(/\s+/g, '').substring(0, 10)}_${Math.floor(10 + Math.random() * 90)}`;
        const rawKkm = colMap.kkm !== -1 && cols[colMap.kkm] ? (parseInt(cols[colMap.kkm]) || 70) : 70;
        const rawKelas = colMap.kelas !== -1 && cols[colMap.kelas] ? cols[colMap.kelas] : '9';
        const rawJenjang = colMap.jenjang !== -1 && cols[colMap.jenjang] ? cols[colMap.jenjang] : (['4', '5', '6'].some(c => rawKelas.includes(c)) ? 'PAKET A' : ['7', '8', '9'].some(c => rawKelas.includes(c)) ? 'PAKET B' : 'PAKET C');

        parsedRows.push({
          id: rawId,
          nama: rawNama,
          kkm: rawKkm,
          jenjang: rawJenjang,
          kelas: rawKelas
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} mata pelajaran dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');

    } else if (importTarget === 'buku') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('kode') || h.includes('isbn')),
        judul: headers.findIndex(h => h.includes('judul') || h.includes('buku') || h.includes('nama')),
        pengarang: headers.findIndex(h => h.includes('pengarang') || h.includes('penulis') || h.includes('author')),
        kategori: headers.findIndex(h => h.includes('kategori') || h.includes('genre') || h.includes('tipe')),
        jumlah: headers.findIndex(h => h.includes('jumlah') || h.includes('stok') || h.includes('qty') || h.includes('total')),
        sisa: headers.findIndex(h => h.includes('sisa') || h.includes('tersedia')),
        tahun: headers.findIndex(h => h.includes('tahun') || h.includes('terbit'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawJudul = cols[colMap.judul !== -1 ? colMap.judul : 1] || cols[0];
        if (!rawJudul) return;

        const rawId = colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : `B-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawPengarang = colMap.pengarang !== -1 && cols[colMap.pengarang] ? cols[colMap.pengarang] : 'Tim Guru Rombel';
        const rawKategori = colMap.kategori !== -1 && cols[colMap.kategori] ? cols[colMap.kategori] : 'Modul Kurikulum';
        const rawJumlah = colMap.jumlah !== -1 && cols[colMap.jumlah] ? (parseInt(cols[colMap.jumlah]) || 10) : 10;
        const rawSisa = colMap.sisa !== -1 && cols[colMap.sisa] ? (parseInt(cols[colMap.sisa]) || rawJumlah) : rawJumlah;
        const rawTahun = colMap.tahun !== -1 && cols[colMap.tahun] ? cols[colMap.tahun] : '2025';

        parsedRows.push({
          id: rawId,
          judul: rawJudul,
          pengarang: rawPengarang,
          kategori: rawKategori,
          jumlah: rawJumlah,
          sisa: rawSisa,
          stok: rawJumlah,
          tahun: rawTahun
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} buku perpustakaan dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');

    } else if (importTarget === 'barang') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('kode') || h.includes('no')),
        nama: headers.findIndex(h => h.includes('nama') || h.includes('barang') || h.includes('item') || h.includes('sarana')),
        kategori: headers.findIndex(h => h.includes('kategori') || h.includes('tipe') || h.includes('jenis')),
        jumlah: headers.findIndex(h => h.includes('jumlah') || h.includes('stok') || h.includes('qty') || h.includes('volume')),
        status: headers.findIndex(h => h.includes('status') || h.includes('kondisi') || h.includes('keadaan'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawNama = cols[colMap.nama !== -1 ? colMap.nama : 1] || cols[0];
        if (!rawNama) return;

        const rawId = colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : `BRG-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawKategori = colMap.kategori !== -1 && cols[colMap.kategori] ? cols[colMap.kategori] : 'Aset Ruangan';
        const rawJumlah = colMap.jumlah !== -1 && cols[colMap.jumlah] ? (parseInt(cols[colMap.jumlah]) || 1) : 1;
        const statusVal = colMap.status !== -1 && cols[colMap.status] ? cols[colMap.status].toUpperCase() : 'BAIK';
        const rawStatus = statusVal.includes('RUSAK') ? 'RUSAK' : (statusVal.includes('PERBAIKAN') || statusVal.includes('DIPERBAIKI') ? 'DIPERBAIKI' : 'BAIK');

        parsedRows.push({
          id: rawId,
          nama: rawNama,
          kategori: rawKategori,
          jumlah: rawJumlah,
          status: rawStatus
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} inventaris barang dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');

    } else if (importTarget === 'biaya') {
      const colMap = {
        id: headers.findIndex(h => h === 'id' || h.includes('kode')),
        nama: headers.findIndex(h => h.includes('nama') || h.includes('biaya') || h.includes('tagihan') || h.includes('jenis')),
        nominal: headers.findIndex(h => h.includes('nominal') || h.includes('jumlah') || h.includes('biaya') || h.includes('tarif')),
        kelasId: headers.findIndex(h => h.includes('kelas') || h.includes('rombel')),
        aktif: headers.findIndex(h => h.includes('aktif') || h.includes('status'))
      };

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1) return;

        const rawNama = cols[colMap.nama !== -1 ? colMap.nama : 0] || '';
        if (!rawNama) return;

        const rawId = colMap.id !== -1 && cols[colMap.id] ? cols[colMap.id] : `BIA_${rawNama.toUpperCase().replace(/\s+/g, '').substring(0, 10)}_${Math.floor(10 + Math.random() * 90)}`;
        const rawNominal = colMap.nominal !== -1 && cols[colMap.nominal] ? (parseInt(cols[colMap.nominal].replace(/[^0-9]/g, '')) || 0) : 0;
        const rawKelasId = colMap.kelasId !== -1 && cols[colMap.kelasId] ? cols[colMap.kelasId] : 'Semua';
        const rawAktif = colMap.aktif !== -1 && cols[colMap.aktif] ? (cols[colMap.aktif].toUpperCase() === 'AKTIF' || cols[colMap.aktif].toUpperCase() === 'YA' || cols[colMap.aktif] === '1') : true;

        parsedRows.push({
          id: rawId,
          nama: rawNama,
          nominal: rawNominal,
          kelasId: rawKelasId,
          targetKelas: rawKelasId,
          aktif: rawAktif,
          prioritas: 'Menengah',
          tahunAjaran: '2026/2027'
        });
      });

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} jenis tagihan biaya dari spreadsheet. Silakan periksa tinjauan di bawah ini lalu klik tombol "Selesaikan Impor".`, 'success');
    } else {
      // Universal Generic Table Parser for all other 50+ ERP tables
      const cleanHeaders = headers.map(h => {
        return h.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'field';
      });

      const rows = lines.slice(1);
      const parsedRows: any[] = [];

      rows.forEach((row, rIdx) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 1 || cols.every(c => !c)) return;

        const rowObj: Record<string, any> = {};
        cleanHeaders.forEach((hKey, cIdx) => {
          rowObj[hKey] = cols[cIdx] !== undefined ? cols[cIdx] : '';
        });

        // Auto-assign primary key if missing
        if (!rowObj.id && !rowObj.noPdkt && !rowObj.kodePendaftaran && !rowObj.nisn && !rowObj.GuruID && !rowObj.MapelID) {
          rowObj.id = `${importTarget.toUpperCase()}_${Date.now()}_${rIdx + 1}`;
        }

        parsedRows.push(rowObj);
      });

      if (parsedRows.length === 0) {
        Swal.fire('Error', 'Tidak ada data baris yang dapat dibaca dari spreadsheet.', 'error');
        return;
      }

      setParsedSiswa(parsedRows);
      Swal.fire('Berhasil Membaca Data', `Berhasil mem-parsing ${parsedRows.length} data untuk tabel database '${importTarget.toUpperCase()}'. Silakan periksa tinjauan di bawah ini lalu klik 'Selesaikan Impor'.`, 'success');
    }
  };

  const handleFinalizeImport = () => {
    if (parsedSiswa.length === 0) {
      Swal.fire('Error', 'Tidak ada data hasil parsing untuk diimpor.', 'error');
      return;
    }

    if (importTarget === 'semua_tabel') {
      const fullJson = (window as any)._pendingFullJson;
      if (!fullJson) {
        Swal.fire('Error', 'Data JSON Backup Semua Tabel tidak ditemukan.', 'error');
        return;
      }
      Swal.fire({
        title: 'Konfirmasi Impor Semua Tabel Database',
        text: `Tindakan ini akan memperbarui dan menyinkronkan seluruh ${Object.keys(fullJson).length} tabel database Rombel KTCT dengan file JSON Backup Anda. Lanjutkan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Terapkan Ke Semua Tabel!',
        cancelButtonText: 'Batal'
      }).then((res: any) => {
        if (res.isConfirmed) {
          let count = 0;
          Object.keys(fullJson).forEach((k) => {
            if (Array.isArray(fullJson[k])) {
              db.set(k, fullJson[k]);
              localStorage.setItem(`ERP_KTCT_${k}`, JSON.stringify(fullJson[k]));
              localStorage.setItem(`ERP_${k}`, JSON.stringify(fullJson[k]));
              count++;
            }
          });
          Swal.fire('Semua Tabel Diperbarui', `Berhasil memperbarui ${count} tabel database secara keseluruhan!`, 'success')
            .then(() => window.location.reload());
        }
      });
      return;
    }

    const labels: Record<string, string> = {
      siswa: 'Siswa',
      guru: 'Guru',
      kelas: 'Kelas',
      mapel: 'Mata Pelajaran',
      buku: 'Buku Perpustakaan',
      barang: 'Inventaris Barang',
      biaya: 'Jenis Tagihan Biaya'
    };

    const targetLabel = labels[importTarget] || importTarget;

    Swal.fire({
      title: `Konfirmasi Impor Massal ${targetLabel}`,
      text: `Apakah Anda yakin ingin memasukkan ${parsedSiswa.length} data ${targetLabel} baru ke database? Data dengan ID/Primary Key yang sudah ada akan otomatis diperbarui (upsert).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Impor Sekarang!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        if (importTarget === 'siswa') {
          const currentSiswa = db.get<Siswa>('siswa') || [];
          const currentUsers = db.get<any>('users') || [];

          let addedCount = 0;
          let updatedCount = 0;

          const updatedSiswa = [...currentSiswa];
          const updatedUsers = [...currentUsers];

          parsedSiswa.forEach(newS => {
            const idx = updatedSiswa.findIndex(s => s.noPdkt === newS.noPdkt || s.id === newS.id);
            if (idx !== -1) {
              updatedSiswa[idx] = { ...updatedSiswa[idx], ...newS };
              updatedCount++;
            } else {
              updatedSiswa.push(newS);
              addedCount++;
            }

            // Automatically register student user account
            const uIdx = updatedUsers.findIndex(u => u.username === newS.noPdkt || u.id === `USR_${newS.noPdkt}`);
            const newUser = {
              id: `USR_${newS.noPdkt}`,
              username: newS.noPdkt,
              email: `${newS.noPdkt}@sisko.sch.id`,
              password: 'siswa123',
              role: 'SISWA',
              name: newS.nama,
              status: newS.status === 'AKTIF' ? 'AKTIF' : 'NONAKTIF',
              kelasId: newS.kelasId
            };

            if (uIdx !== -1) {
              updatedUsers[uIdx] = { ...updatedUsers[uIdx], ...newUser };
            } else {
              updatedUsers.push(newUser);
            }
          });

          db.set('siswa', updatedSiswa);
          db.set('users', updatedUsers);

          Swal.fire('Impor Sukses', `Impor data siswa berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}. Akun login siswa juga telah dibuat secara otomatis.`, 'success');

        } else if (importTarget === 'guru') {
          const currentGuru = db.get<Guru>('guru') || [];
          const currentUsers = db.get<any>('users') || [];

          let addedCount = 0;
          let updatedCount = 0;

          const updatedGuru = [...currentGuru];
          const updatedUsers = [...currentUsers];

          parsedSiswa.forEach(newG => {
            const idx = updatedGuru.findIndex(g => g.id === newG.id || (g.nip && g.nip === newG.nip));
            if (idx !== -1) {
              updatedGuru[idx] = { ...updatedGuru[idx], ...newG };
              updatedCount++;
            } else {
              updatedGuru.push(newG);
              addedCount++;
            }

            // Automatically register Guru user account
            const uIdx = updatedUsers.findIndex(u => u.username === newG.nip || u.id === `USR_${newG.nip}`);
            const newUser = {
              id: `USR_${newG.nip}`,
              username: newG.nip || `GUR_${Math.floor(1000 + Math.random() * 9000)}`,
              email: newG.email,
              password: 'guru123',
              role: 'GURU',
              name: newG.nama,
              status: newG.status === 'AKTIF' ? 'AKTIF' : 'NONAKTIF'
            };

            if (uIdx !== -1) {
              updatedUsers[uIdx] = { ...updatedUsers[uIdx], ...newUser };
            } else {
              updatedUsers.push(newUser);
            }
          });

          db.set('guru', updatedGuru);
          db.set('users', updatedUsers);

          Swal.fire('Impor Sukses', `Impor data guru berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}. Akun login guru juga telah dibuat secara otomatis.`, 'success');

        } else if (importTarget === 'kelas') {
          const currentKelas = db.get<Kelas>('kelas') || [];
          const updatedKelas = [...currentKelas];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newK => {
            const idx = updatedKelas.findIndex(k => k.id === newK.id || k.nama.toLowerCase() === newK.nama.toLowerCase());
            if (idx !== -1) {
              updatedKelas[idx] = { ...updatedKelas[idx], ...newK };
              updatedCount++;
            } else {
              updatedKelas.push(newK);
              addedCount++;
            }
          });

          db.set('kelas', updatedKelas);
          Swal.fire('Impor Sukses', `Impor kelas berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');

        } else if (importTarget === 'mapel') {
          const currentMapel = db.get<Mapel>('mapel') || [];
          const updatedMapel = [...currentMapel];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newM => {
            const idx = updatedMapel.findIndex(m => m.id === newM.id || (m.nama.toLowerCase() === newM.nama.toLowerCase() && m.kelas === newM.kelas));
            if (idx !== -1) {
              updatedMapel[idx] = { ...updatedMapel[idx], ...newM };
              updatedCount++;
            } else {
              updatedMapel.push(newM);
              addedCount++;
            }
          });

          db.set('mapel', updatedMapel);
          Swal.fire('Impor Sukses', `Impor mata pelajaran berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');

        } else if (importTarget === 'buku') {
          const currentBuku = db.get<any>('buku') || [];
          const updatedBuku = [...currentBuku];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newB => {
            const idx = updatedBuku.findIndex(b => b.id === newB.id || b.judul.toLowerCase() === newB.judul.toLowerCase());
            if (idx !== -1) {
              updatedBuku[idx] = { ...updatedBuku[idx], ...newB };
              updatedCount++;
            } else {
              updatedBuku.push(newB);
              addedCount++;
            }
          });

          db.set('buku', updatedBuku);
          Swal.fire('Impor Sukses', `Impor buku perpustakaan berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');

        } else if (importTarget === 'barang') {
          const currentBarang = db.get<Barang>('barang') || [];
          const updatedBarang = [...currentBarang];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newBr => {
            const idx = updatedBarang.findIndex(br => br.id === newBr.id || br.nama.toLowerCase() === newBr.nama.toLowerCase());
            if (idx !== -1) {
              updatedBarang[idx] = { ...updatedBarang[idx], ...newBr };
              updatedCount++;
            } else {
              updatedBarang.push(newBr);
              addedCount++;
            }
          });

          db.set('barang', updatedBarang);
          Swal.fire('Impor Sukses', `Impor inventaris barang berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');

        } else if (importTarget === 'biaya') {
          const currentBiaya = db.get<Biaya>('biaya') || [];
          const updatedBiaya = [...currentBiaya];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newBi => {
            const idx = updatedBiaya.findIndex(bi => bi.id === newBi.id || (bi.nama.toLowerCase() === newBi.nama.toLowerCase() && bi.kelasId === newBi.kelasId));
            if (idx !== -1) {
              updatedBiaya[idx] = { ...updatedBiaya[idx], ...newBi };
              updatedCount++;
            } else {
              updatedBiaya.push(newBi);
              addedCount++;
            }
          });

          db.set('biaya', updatedBiaya);
          Swal.fire('Impor Sukses', `Impor jenis tagihan biaya berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');
        } else {
          // Universal Generic Table Finisher for all other ERP tables
          const currentData = db.get<any>(importTarget) || [];
          const updatedData = [...currentData];

          let addedCount = 0;
          let updatedCount = 0;

          parsedSiswa.forEach(newItem => {
            const pkVal = newItem.id || newItem.noPdkt || newItem.kodePendaftaran || newItem.nisn || newItem.username || newItem.kode || newItem.biayaId || newItem.GuruID || newItem.MapelID;
            const idx = pkVal 
              ? updatedData.findIndex(item => 
                  item.id === pkVal || 
                  item.noPdkt === pkVal || 
                  item.kodePendaftaran === pkVal || 
                  item.nisn === pkVal || 
                  item.username === pkVal ||
                  item.kode === pkVal ||
                  item.biayaId === pkVal ||
                  item.GuruID === pkVal ||
                  item.MapelID === pkVal
                )
              : -1;

            if (idx !== -1) {
              updatedData[idx] = { ...updatedData[idx], ...newItem };
              updatedCount++;
            } else {
              updatedData.push(newItem);
              addedCount++;
            }
          });

          db.set(importTarget, updatedData);
          Swal.fire('Impor Sukses', `Impor data '${importTarget.toUpperCase()}' berhasil! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`, 'success');
        }

        setParsedSiswa([]);
        setPasteText('');
        loadAllData();
      }
    });
  };

  const openEditSiswaModal = (s: Siswa) => {
    setEditingSiswa(s);
    setSiswaForm(s);
    setFormModalTab('akademik');
    setIsSiswaModalOpen(true);
  };

  const openAddGuruModal = () => {
    setEditingGuru(null);
    setGuruForm({
      nip: '',
      nama: '',
      mapel: 'Fisika',
      kelasAjar: '12',
      jurusanAjar: 'IPA 1',
      jk: 'L',
      tempatLahir: '',
      tglLahir: '',
      nik: '',
      noHp: '',
      email: '',
      status: 'AKTIF',
      fotoUrl: ''
    });
    setIsGuruModalOpen(true);
  };

  const openEditGuruModal = (g: Guru) => {
    setEditingGuru(g);
    setGuruForm(g);
    setIsGuruModalOpen(true);
  };

  const handleGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guruForm.nama) {
      Swal.fire('Validasi Gagal', 'Mohon lengkapi data wajib: Nama Guru.', 'error');
      return;
    }

    if (guruForm.nik && !/^\d{16}$/.test(guruForm.nik)) {
      Swal.fire('Validasi Gagal', 'NIK Guru harus berupa 16 digit angka.', 'error');
      return;
    }

    if (guruForm.noHp && !/^(08|62)\d+$/.test(guruForm.noHp)) {
      Swal.fire('Validasi Gagal', 'Nomor Telepon harus berupa angka dan diawali dengan 08 atau 62.', 'error');
      return;
    }

    if (guruForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guruForm.email)) {
      Swal.fire('Validasi Gagal', 'Format E-Mail tidak valid (harus mengandung @ dan domain).', 'error');
      return;
    }

    const cleanFields = {
      ...guruForm,
      updatedAt: new Date().toISOString()
    };

    if (editingGuru) {
      const updatedGuru = {
        ...editingGuru,
        ...cleanFields
      } as Guru;
      db.update<Guru>('guru', 'id', editingGuru.id, updatedGuru);
      Swal.fire('Sukses', 'Biodata guru berhasil diperbarui.', 'success');
    } else {
      const cleanName = guruForm.nama.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const newId = `GUR_${cleanName}_${Date.now().toString().slice(-4)}`;
      const newGuru = {
        id: newId,
        ...cleanFields,
        createdAt: new Date().toISOString()
      } as Guru;

      db.insert<Guru>('guru', newGuru);
      Swal.fire('Sukses', 'Guru baru berhasil ditambahkan.', 'success');
    }

    setIsGuruModalOpen(false);
    setEditingGuru(null);
    loadAllData();
  };

  const handleDeleteGuru = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Guru?',
      text: `Apakah Anda yakin ingin menghapus data guru "${nama}" secara permanen?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete<Guru>('guru', 'id', id);
        Swal.fire('Terhapus!', 'Data guru telah dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const openAddSiswaModal = () => {
    const tsvSiswa = siswaList.filter(s => s.noPdkt && s.noPdkt.length <= 4 && !isNaN(Number(s.noPdkt)));
    const maxPdktNum = tsvSiswa.reduce((max, s) => {
      const num = parseInt(s.noPdkt, 10);
      return num > max ? num : max;
    }, 0);
    const nextPdkt = maxPdktNum > 0 ? String(maxPdktNum + 1).padStart(3, '0') : '001';

    setEditingSiswa(null);
    setSiswaForm({
      tahunMasuk: new Date().getFullYear(),
      status: 'AKTIF',
      noPdkt: nextPdkt,
      nisn: '',
      nama: '',
      jk: 'L',
      tglLahir: '',
      kelasId: '',
      penerimaKps: 'Tidak',
      agama: 'Islam',
      golonganDarah: 'Tidak Tahu',
      jenisTinggal: 'Bersama Orang Tua',
      alatTransportasi: 'Jalan Kaki',
      pendidikanAyah: 'SMA/SMK',
      pekerjaanAyah: 'Karyawan Swasta',
      penghasilanAyah: 'Rp 1 - 3 Juta',
      pendidikanIbu: 'SMA/SMK',
      pekerjaanIbu: 'Tidak Bekerja',
      penghasilanIbu: 'Tidak Berpenghasilan',
      pendidikanWali: 'SMA/SMK',
      pekerjaanWali: 'Tidak Bekerja',
      penghasilanWali: 'Tidak Berpenghasilan',
      hubunganWali: 'Lainnya',
      berkasAkta: 'Belum Mengumpulkan',
      berkasKk: 'Belum Mengumpulkan',
      berkasKtpKia: 'Belum Mengumpulkan',
      berkasKtpAyah: 'Belum Mengumpulkan',
      berkasKtpIbu: 'Belum Mengumpulkan',
      berkasIjazah: 'Belum Mengumpulkan',
      berkasKtpWali: 'Belum Mengumpulkan',
      berkasRapor: 'Belum Mengumpulkan',
      berkasSuratPindah: 'Belum Mengumpulkan',
      berkasDomisili: 'Belum Mengumpulkan',
    });
    setFormModalTab('akademik');
    setIsSiswaModalOpen(true);
  };

  // Filtering Helpers
  const getNormalizedStatus = (stRaw?: string): 'AKTIF' | 'TIDAK AKTIF' | 'BELUM' | 'PINDAH' | 'KELUAR' | 'LULUS' => {
    if (!stRaw) return 'AKTIF';
    const st = stRaw.toUpperCase().trim();
    if (st === 'AKTIF' || st.includes('DAPODIK AKTIF') || st.includes('BELAJAR AKTIF')) return 'AKTIF';
    if (st === 'TIDAK AKTIF' || st === 'NONAKTIF' || st === 'NON AKTIF' || st.includes('BELAJAR NONAKTIF')) return 'TIDAK AKTIF';
    if (st === 'BELUM' || st.includes('DAPODIK NONAKTIF')) return 'BELUM';
    if (st === 'PINDAH' || st.includes('PINDAH') || st.includes('MUTASI')) return 'PINDAH';
    if (st === 'KELUAR' || st.includes('KELUAR') || st.includes('DROP')) return 'KELUAR';
    if (st === 'LULUS' || st.includes('LULUS') || st.includes('ALUMNI')) return 'LULUS';
    return 'AKTIF';
  };

  const getStudentJenjang = (s: Partial<Siswa>, listKelas: Kelas[] = []): string => {
    const sAny = s as any;
    if (sAny.jenjang && typeof sAny.jenjang === 'string' && sAny.jenjang.trim()) {
      const sj = sAny.jenjang.toUpperCase().trim();
      if (sj.includes('PAKET A') || sj === 'A' || sj === 'PA') return 'PAKET A';
      if (sj.includes('PAKET B') || sj === 'B' || sj === 'PB') return 'PAKET B';
      if (sj.includes('PAKET C') || sj === 'C' || sj === 'PC') return 'PAKET C';
    }
    const kStr = (s.kelasId || s.kelas || s.kelasSaatIni || '').toUpperCase().trim();
    if (kStr.includes('PAKET A') || kStr.startsWith('PA') || kStr.startsWith('A') || kStr.includes('KELAS 4') || kStr.includes('KELAS 5') || kStr.includes('KELAS 6') || ['4', '5', '6'].some(num => kStr === num || kStr.endsWith(num))) return 'PAKET A';
    if (kStr.includes('PAKET B') || kStr.startsWith('PB') || kStr.startsWith('B') || kStr.includes('KELAS 7') || kStr.includes('KELAS 8') || kStr.includes('KELAS 9') || ['7', '8', '9'].some(num => kStr === num || kStr.endsWith(num))) return 'PAKET B';
    if (kStr.includes('PAKET C') || kStr.startsWith('PC') || kStr.startsWith('C') || kStr.includes('KELAS 10') || kStr.includes('KELAS 11') || kStr.includes('KELAS 12') || ['10', '11', '12'].some(num => kStr === num || kStr.endsWith(num))) return 'PAKET C';

    const foundClass = listKelas.find(k => (k.id && k.id.toUpperCase() === kStr) || (k.nama && k.nama.toUpperCase() === kStr));
    if (foundClass && foundClass.jenjang) {
      const fj = String(foundClass.jenjang).toUpperCase().trim();
      if (fj.includes('PAKET A')) return 'PAKET A';
      if (fj.includes('PAKET B')) return 'PAKET B';
      if (fj.includes('PAKET C')) return 'PAKET C';
    }
    return 'PAKET C';
  };

  const getFilteredSiswa = () => {
    const q = searchQuery.trim().toLowerCase();

    return siswaList.filter(s => {
      // 1. Search Query
      const matchesSearch = !q || 
        (s.nama || '').toLowerCase().includes(q) ||
        String(s.nisn || '').toLowerCase().includes(q) ||
        String(s.nis || '').toLowerCase().includes(q) ||
        (s.noPdkt || '').toLowerCase().includes(q) ||
        String(s.nik || '').toLowerCase().includes(q) ||
        (s.noHp || '').includes(q);

      // 2. Tahun Masuk
      const matchesTahunMasuk = !selectedTahunMasuk || 
        String(s.tahunMasuk || '') === String(selectedTahunMasuk) || 
        String(s.tahunAjaran || '').includes(selectedTahunMasuk);

      // 3. Status
      const normStatus = getNormalizedStatus(s.status);
      const matchesStatus = !selectedStatus || normStatus === selectedStatus.toUpperCase().trim();

      // 4. Rombel / Kelas
      let matchesKelas = true;
      if (selectedKelas) {
        const selK = selectedKelas.toUpperCase().trim();
        const kId = (s.kelasId || '').toUpperCase().trim();
        const kNama = (s.kelas || s.kelasSaatIni || '').toUpperCase().trim();

        const foundClass = kelasList.find(k => (k.id && k.id.toUpperCase() === selK) || (k.nama && k.nama.toUpperCase() === selK));
        const targetNama = foundClass ? (foundClass.nama || '').toUpperCase().trim() : '';

        const isTargetClassAlumni = selK === 'L13' || selK === '13' || selK.includes('13') || selK.includes('ALUMNI') || selK.includes('LULUS') || (targetNama && (targetNama.includes('13') || targetNama.includes('ALUMNI') || targetNama.includes('LULUS')));
        const isStudentAlumni = normStatus === 'LULUS' || (normStatus as string) === 'ALUMNI' || kId === 'L13' || kId === '13' || kNama.includes('13') || kNama.includes('ALUMNI') || kNama.includes('LULUS');

        if (isTargetClassAlumni) {
          matchesKelas = isStudentAlumni;
        } else {
          matchesKelas = 
            kId === selK || 
            kNama === selK ||
            (targetNama && (kNama.includes(targetNama) || kId.includes(targetNama))) ||
            kId.includes(selK) ||
            kNama.includes(selK) ||
            kId.replace(/^[ABC]/, '') === selK ||
            kId.replace(/^P[ABC]/, '') === selK;
        }
      }

      // 5. Jenjang
      const sJenjang = getStudentJenjang(s, kelasList);
      const matchesJenjang = !selectedJenjang || sJenjang.includes(selectedJenjang.toUpperCase().trim());

      return matchesSearch && matchesTahunMasuk && matchesStatus && matchesKelas && matchesJenjang;
    });
  };

  const filteredSiswa = getFilteredSiswa();
  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / limit));
  const validPage = Math.min(page, totalPages);
  const paginatedSiswa = filteredSiswa.slice((validPage - 1) * limit, validPage * limit);

  const getFilteredGuru = () => {
    return guruList.filter(g => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (g.nama || '').toLowerCase().includes(q) ||
             (g.nip || '').toLowerCase().includes(q) ||
             (g.mapel || '').toLowerCase().includes(q) ||
             (g.email || '').toLowerCase().includes(q) ||
             (g.nik || '').toLowerCase().includes(q);
      const matchesStatus = selectedStatusGuru ? g.status === selectedStatusGuru : true;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredGuru = getFilteredGuru();
  const paginatedGuru = filteredGuru.slice((page - 1) * limit, page * limit);
  const totalPagesGuru = Math.ceil(filteredGuru.length / limit);

  // Cross-component listener for Cetak Kartu QR
  useEffect(() => {
    const handleKartuNav = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail && (customEv.detail.view === 'kartu-siswa' || customEv.detail.subTab === 'kartu-siswa')) {
        setSubTab('siswa');
        if (customEv.detail.student) {
          setViewingKartuSiswa(customEv.detail.student);
        } else if (siswaList.length > 0) {
          setViewingKartuSiswa(siswaList[0]);
        }
      }
    };
    window.addEventListener('erp-subtab-change', handleKartuNav);
    return () => window.removeEventListener('erp-subtab-change', handleKartuNav);
  }, [siswaList]);

  if (viewingKartuSiswa) {
    return (
      <div className="space-y-4 animate-fade-in">
        <KartuSiswaView 
          currentUser={activeUser} 
          siswaParam={viewingKartuSiswa} 
          onBack={() => setViewingKartuSiswa(null)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        {[
          { id: 'dashboard', label: 'Dashboard Master' },
          { id: 'siswa', label: 'Siswa' },
          { id: 'guru', label: 'Guru' },
          { id: 'ortu', label: 'Orang Tua' },
          { id: 'kelas', label: 'Kelas' },
          { id: 'jenjang', label: 'Jenjang' },
          { id: 'mapel', label: 'Mata Pelajaran' },
          { id: 'tahun_ajaran', label: 'Tahun Ajaran & Semester' },
          { id: 'hari_libur', label: 'Hari Libur' },
          { id: 'biaya', label: 'Tarif Biaya Sekolah (Keuangan)' },
          { id: 'barang', label: 'Daftar Barang & Aset (Inventaris)' },
          { id: 'dapodik_validasi', label: 'Validasi & Sinkronisasi Dapodik 2026' },
          { id: 'referensi', label: 'Referensi' },
          { id: 'import_export', label: 'Import / Export' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-master-${tab.id}`}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all border shrink-0 ${
              subTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Data Container (SISKO Style) */}
      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
        {/* Header Tools */}
        <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">
              {subTab === 'dashboard' && 'Dashboard Master Data Pokok'}
              {subTab === 'siswa' && 'Direktori Siswa'}
              {subTab === 'guru' && 'Direktori Tenaga Pengajar'}
              {subTab === 'ortu' && 'Direktori Orang Tua / Wali'}
              {subTab === 'kelas' && 'Daftar Rombongan Belajar (Kelas)'}
              {subTab === 'jenjang' && 'Jenjang Pendidikan Terdaftar'}
              {subTab === 'mapel' && 'Mata Pelajaran Kurikulum'}
              {subTab === 'tahun_ajaran' && 'Tahun Ajaran & Siklus Semester'}
              {subTab === 'hari_libur' && 'Daftar Hari Libur & Cuti Bersama'}
              {subTab === 'biaya' && 'Parameter Tarif & Biaya Sekolah'}
              {subTab === 'barang' && 'Direktori Sarana Prasarana / Inventaris Barang'}
              {subTab === 'dapodik_validasi' && 'Sistem Validasi & Sinkronisasi Dapodik Rilis 2026'}
              {subTab === 'referensi' && 'Referensi Kode & Parameter'}
              {subTab === 'import_export' && 'Sinkronisasi Spreadsheet (Import/Export)'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {subTab === 'dashboard' ? 'Ringkasan statistik dan sebaran data pokok kependidikan.' : `Kelola seluruh master data ${subTab === 'tahun_ajaran' ? 'Tahun Ajaran & Semester' : subTab.replace('_', ' ')} secara terpadu.`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={loadAllData}
              className="p-2.5 bg-white border text-slate-600 rounded-xl hover:bg-slate-50 transition"
              title="Perbarui Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {subTab === 'siswa' && (
              <>
                <button 
                  onClick={() => setViewingKartuSiswa(siswaList[0] || null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
                  title="Buka Generator & CETAK Kartu Pelajar QR"
                >
                  <QrCode className="w-4 h-4" /> Cetak Kartu QR
                </button>
                <button 
                  onClick={openAddSiswaModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/10"
                >
                  <Plus className="w-4 h-4" /> Tambah Siswa
                </button>
              </>
            )}

            {subTab === 'mapel' && (
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 mr-2 max-w-full overflow-x-auto whitespace-nowrap">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide px-1 border-r">Rekap Mapel:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(k => {
                  let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (k >= 1 && k <= 6) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (k >= 7 && k <= 9) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  if (k >= 10 && k <= 12) badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                  if (k === 13) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  const count = mapelCounts[k.toString()] || 0;
                  return (
                    <span 
                      key={`mapel-rekap-${k}`} 
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${badgeColor}`}
                      title={k === 13 ? `Kelas 13 (Alumni/Lulus): ${count} Mata Pelajaran` : `Kelas ${k}: ${count} Mata Pelajaran`}
                    >
                      <span>{k === 13 ? 'K-13 (Alumni):' : `Kelas ${k}:`}</span>
                      <span className="bg-white/70 px-1 rounded font-mono text-[9px]">{count}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {subTab !== 'siswa' && subTab !== 'import_export' && subTab !== 'dashboard' && subTab !== 'tahun_ajaran' && subTab !== 'semester' && (
              <button 
                onClick={() => {
                  if (subTab === 'guru') {
                    openAddGuruModal();
                  } else if (subTab === 'mapel') {
                    openAddMapelModal();
                  } else if (subTab === 'kelas') {
                    Swal.fire({
                      title: '➕ Tambah Rombongan Belajar (Kelas)',
                      html: `
                        <div class="text-left space-y-3">
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">ID Rombel / Kode Kelas (cth: A4, B7, C10, C12)</label>
                            <input id="swal-kelas-id" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="C11" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Rombel / Deskripsi</label>
                            <input id="swal-kelas-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Kelas 11 Paket C Mandiri">
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Wali Kelas / Guru Pengampu</label>
                            <input id="swal-kelas-wali" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Budi Santoso, S.Pd.">
                          </div>
                        </div>
                      `,
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Simpan Kelas',
                      cancelButtonText: 'Batal',
                      preConfirm: () => {
                        const idVal = (document.getElementById('swal-kelas-id') as HTMLInputElement).value.trim().toUpperCase();
                        const namaVal = (document.getElementById('swal-kelas-nama') as HTMLInputElement).value.trim();
                        const waliVal = (document.getElementById('swal-kelas-wali') as HTMLInputElement).value.trim();
                        
                        if (!idVal) {
                          Swal.showValidationMessage('ID Kelas wajib diisi!');
                          return false;
                        }
                        return { id: idVal, nama: namaVal, wali: waliVal };
                      }
                    }).then((res: any) => {
                      if (res.isConfirmed) {
                        const newKelas: Kelas = {
                          id: res.value.id,
                          nama: res.value.nama || `Kelas ${res.value.id}`,
                          wali: res.value.wali || 'Belum Ditugaskan',
                          aktif: true,
                          jenjang: res.value.id.startsWith('A') || ['4','5','6'].includes(res.value.id.slice(-1)) 
                            ? 'PAKET A' 
                            : res.value.id.startsWith('B') || ['7','8','9'].includes(res.value.id.slice(-1))
                            ? 'PAKET B' 
                            : 'PAKET C'
                        };
                        const current = db.get<Kelas>('kelas') || [];
                        if (current.some(k => k.id === newKelas.id)) {
                          Swal.fire('Validasi Gagal', `Kelas dengan ID "${newKelas.id}" sudah ada!`, 'error');
                          return;
                        }
                        db.insert<Kelas>('kelas', newKelas);
                        Swal.fire('Sukses', 'Kelas baru berhasil ditambahkan.', 'success');
                        loadAllData();
                      }
                    });
                  } else if (subTab === 'hari_libur') {
                    Swal.fire({
                      title: '➕ Tambah Hari Libur / Cuti Bersama',
                      html: `
                        <div class="text-left space-y-3">
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tanggal Libur</label>
                            <input id="swal-libur-tgl" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="17 Agustus 2026" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Hari Libur</label>
                            <input id="swal-libur-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Hari Kemerdekaan RI" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipe Liburan</label>
                            <input id="swal-libur-tipe" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Nasional" value="Nasional">
                          </div>
                        </div>
                      `,
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Simpan',
                      cancelButtonText: 'Batal',
                      preConfirm: () => {
                        const tglVal = (document.getElementById('swal-libur-tgl') as HTMLInputElement).value.trim();
                        const namaVal = (document.getElementById('swal-libur-nama') as HTMLInputElement).value.trim();
                        const tipeVal = (document.getElementById('swal-libur-tipe') as HTMLInputElement).value.trim();
                        
                        if (!tglVal || !namaVal) {
                          Swal.showValidationMessage('Tanggal dan Nama Hari Libur wajib diisi!');
                          return false;
                        }
                        return { tgl: tglVal, nama: namaVal, tipe: tipeVal || 'Nasional' };
                      }
                    }).then((res: any) => {
                      if (res.isConfirmed) {
                        const current = db.get<any>('hari_libur') || [];
                        const updated = [...current, res.value];
                        db.set('hari_libur', updated);
                        Swal.fire('Sukses', 'Hari libur berhasil ditambahkan.', 'success');
                        loadAllData();
                      }
                    });
                  } else if (subTab === 'jenjang') {
                    Swal.fire({
                      title: '➕ Tambah Jenjang Pendidikan',
                      html: `
                        <div class="text-left space-y-3">
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">ID Kelas / Kode (cth: PA4, PB7)</label>
                            <input id="swal-jenjang-id" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="PA4" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Jenjang (cth: PAKET A4, PAKET B7)</label>
                            <input id="swal-jenjang-nama" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="PAKET A4" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Kelas (Angka cth: 4, 7, 10)</label>
                            <input id="swal-jenjang-kelas" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="4" required>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
                            <select id="swal-jenjang-status" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none bg-white">
                              <option value="AKTIF">AKTIF</option>
                              <option value="NONAKTIF">NONAKTIF</option>
                            </select>
                          </div>
                          <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Keterangan</label>
                            <input id="swal-jenjang-ket" class="w-full text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none" placeholder="Setara SD Kelas IV">
                          </div>
                        </div>
                      `,
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Simpan',
                      cancelButtonText: 'Batal',
                      preConfirm: () => {
                        const idVal = (document.getElementById('swal-jenjang-id') as HTMLInputElement).value.trim().toUpperCase();
                        const namaVal = (document.getElementById('swal-jenjang-nama') as HTMLInputElement).value.trim();
                        const kelasVal = (document.getElementById('swal-jenjang-kelas') as HTMLInputElement).value.trim();
                        const statusVal = (document.getElementById('swal-jenjang-status') as HTMLSelectElement).value;
                        const ketVal = (document.getElementById('swal-jenjang-ket') as HTMLInputElement).value.trim();
                        
                        if (!idVal || !namaVal || !kelasVal) {
                          Swal.showValidationMessage('ID Kelas, Nama Jenjang, dan Nama Kelas wajib diisi!');
                          return false;
                        }
                        return { idKelas: idVal, jenjang: namaVal, namaKelas: kelasVal, status: statusVal, keterangan: ketVal };
                      }
                    }).then((res: any) => {
                      if (res.isConfirmed) {
                        const current = db.get<Jenjang>('jenjang') || [];
                        if (current.some(j => j.idKelas === res.value.idKelas)) {
                          Swal.fire('Validasi Gagal', `Jenjang dengan ID Kelas "${res.value.idKelas}" sudah terdaftar!`, 'error');
                          return;
                        }
                        db.insert<Jenjang>('jenjang', res.value);
                        Swal.fire('Sukses', 'Jenjang pendidikan berhasil ditambahkan.', 'success');
                        loadAllData();
                      }
                    });
                  } else {
                    Swal.fire('Tambah Data', `Fitur tambah data ${subTab.replace('_', ' ')} akan membuka form input khusus.`, 'info');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/10"
              >
                <Plus className="w-4 h-4" /> Tambah {subTab.toUpperCase().replace('_', ' ')}
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        {subTab === 'siswa' && (
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Tampil</span>
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Tahun Masuk</span>
                <select 
                  value={selectedTahunMasuk} 
                  onChange={(e) => { setSelectedTahunMasuk(e.target.value); setPage(1); }}
                  className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Semua Tahun</option>
                  {(() => {
                    const yearsSet = new Set<string>();
                    siswaList.forEach(s => {
                      if (s.tahunMasuk) yearsSet.add(String(s.tahunMasuk));
                    });
                    ['2023', '2024', '2025', '2026'].forEach(y => yearsSet.add(y));
                    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
                  })().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Jenjang</span>
                <select 
                  value={selectedJenjang} 
                  onChange={(e) => { setSelectedJenjang(e.target.value); setPage(1); }}
                  className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Semua Jenjang</option>
                  <option value="PAKET A">PAKET A (SD)</option>
                  <option value="PAKET B">PAKET B (SMP)</option>
                  <option value="PAKET C">PAKET C (SMA)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                  className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Semua Status</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="TIDAK AKTIF">TIDAK AKTIF</option>
                  <option value="BELUM">BELUM</option>
                  <option value="PINDAH">PINDAH</option>
                  <option value="LULUS">LULUS</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Rombel</span>
                <select 
                  value={selectedKelas} 
                  onChange={(e) => { setSelectedKelas(e.target.value); setPage(1); }}
                  className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  <option value="">Semua Rombel</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>Kelas {k.nama} ({k.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                placeholder="Cari Nama / NISN..." 
              />
            </div>
          </div>
        )}

        {subTab === 'siswa' && (
          <div className="bg-slate-50 border-b p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px] font-bold">
            {(() => {
              const countAktif = siswaList.filter(s => getNormalizedStatus(s.status) === 'AKTIF').length;
              const countTidakAktif = siswaList.filter(s => getNormalizedStatus(s.status) === 'TIDAK AKTIF').length;
              const countBelum = siswaList.filter(s => getNormalizedStatus(s.status) === 'BELUM').length;
              const countPindah = siswaList.filter(s => getNormalizedStatus(s.status) === 'PINDAH').length;
              const countKeluar = siswaList.filter(s => getNormalizedStatus(s.status) === 'KELUAR').length;
              const countLulus = siswaList.filter(s => getNormalizedStatus(s.status) === 'LULUS').length;

              return (
                <>
                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'AKTIF' ? '' : 'AKTIF'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'AKTIF' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 flex-shrink-0 animate-pulse" />
                      <div>
                        <div className="text-emerald-800 font-black text-[10px]">AKTIF : {countAktif}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Dapodik & Belajar Aktif</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'TIDAK AKTIF' ? '' : 'TIDAK AKTIF'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'TIDAK AKTIF' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 flex-shrink-0" />
                      <div>
                        <div className="text-amber-800 font-black text-[10px]">TIDAK AKTIF : {countTidakAktif}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Dapodik Aktif / Belajar Nonaktif</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'BELUM' ? '' : 'BELUM'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'BELUM' ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-sky-500 border border-sky-300 flex-shrink-0" />
                      <div>
                        <div className="text-sky-800 font-black text-[10px]">BELUM : {countBelum}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Dapodik Nonaktif / Belajar Aktif</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'PINDAH' ? '' : 'PINDAH'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'PINDAH' ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-300 flex-shrink-0" />
                      <div>
                        <div className="text-purple-800 font-black text-[10px]">PINDAH : {countPindah}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Pindah ke sekolah lain</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'KELUAR' ? '' : 'KELUAR'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'KELUAR' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300 flex-shrink-0" />
                      <div>
                        <div className="text-rose-800 font-black text-[10px]">KELUAR : {countKeluar}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Keluar tanpa keterangan</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setSelectedStatus(selectedStatus === 'LULUS' ? '' : 'LULUS'); setPage(1); }}
                    className={`cursor-pointer transition flex items-center justify-between p-2.5 rounded-xl border shadow-sm ${
                      selectedStatus === 'LULUS' ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400' : 'bg-white border-slate-100 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-300 flex-shrink-0" />
                      <div>
                        <div className="text-indigo-800 font-black text-[10px]">LULUS : {countLulus}</div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight">Sudah Lulus (Alumni)</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {subTab === 'guru' && (
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Tampil</span>
              <select 
                value={limit} 
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="border bg-slate-50 rounded-lg p-2 text-xs font-bold"
              >
                <option value={10}>10 Baris</option>
                <option value={25}>25 Baris</option>
                <option value={50}>50 Baris</option>
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Cari Nama / NIP / Mapel / NIK / Email..." 
              />
            </div>
          </div>
        )}

        {subTab === 'mapel' && (
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-white animate-fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase">Filter:</span>
              
              <select 
                value={selectedMapelJenjang} 
                onChange={(e) => { setSelectedMapelJenjang(e.target.value); setSelectedMapelKelas(''); }}
                className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Semua Jenjang</option>
                <option value="PAKET A">PAKET A (SD)</option>
                <option value="PAKET B">PAKET B (SMP)</option>
                <option value="PAKET C">PAKET C (SMA)</option>
              </select>

              <select 
                value={selectedMapelKelas} 
                onChange={(e) => setSelectedMapelKelas(e.target.value)}
                className="border bg-slate-50 rounded-lg p-2 text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Semua Kelas</option>
                {(!selectedMapelJenjang || selectedMapelJenjang === 'PAKET A') && (
                  <>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </>
                )}
                {(!selectedMapelJenjang || selectedMapelJenjang === 'PAKET B') && (
                  <>
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </>
                )}
                {(!selectedMapelJenjang || selectedMapelJenjang === 'PAKET C') && (
                  <>
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                  </>
                )}
              </select>

              {(selectedMapelJenjang || selectedMapelKelas || mapelSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMapelJenjang('');
                    setSelectedMapelKelas('');
                    setMapelSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 text-[10px] bg-rose-50 text-rose-600 font-extrabold rounded-lg hover:bg-rose-100 transition border border-rose-200"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                value={mapelSearchQuery}
                onChange={(e) => setMapelSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Cari Kode / Nama Mapel..." 
              />
            </div>
          </div>
        )}

        {/* GRID DATATABLE SISKO */}
        {subTab === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-blue-500 tracking-wider">Total Siswa</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-blue-900">
                    {siswaList.filter(s => ['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(getNormalizedStatus(s.status))).length}
                  </span>
                  <span className="text-xs text-blue-500">Siswa</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  L: {siswaList.filter(s => ['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(getNormalizedStatus(s.status)) && s.jk === 'L').length} | P: {siswaList.filter(s => ['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(getNormalizedStatus(s.status)) && s.jk === 'P').length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-emerald-500 tracking-wider">Total Guru & Staff</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-900">{guruList.length}</span>
                  <span className="text-xs text-emerald-500">Pengajar</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">L: {guruList.filter(g => g.jk === 'L').length} | P: {guruList.filter(g => g.jk === 'P').length}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-purple-500 tracking-wider">Rombongan Belajar</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-purple-900">{kelasList.length}</span>
                  <span className="text-xs text-purple-500">Kelas</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Kapasitas rata-rata: {Math.round(siswaList.length / (kelasList.length || 1))} siswa/kelas</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Mata Pelajaran</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-amber-900">{mapelList.length}</span>
                  <span className="text-xs text-amber-500">Mapel</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Terintegrasi Kurikulum Merdeka</p>
              </div>
            </div>

            {/* Visual Charts & Quick Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Siswa per Kelas */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm">Distribusi Siswa per Rombel</h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Statistik</span>
                </div>
                <div className="space-y-3 pt-2">
                  {kelasList.map(k => {
                    const count = siswaList.filter(s => {
                      const isClassMatch = s.kelasId === k.id || s.kelas === k.nama || s.kelasSaatIni === k.nama || (k.id && (s.kelasId === k.id || s.kelas === k.id));
                      const normSt = getNormalizedStatus(s.status);
                      return isClassMatch && ['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(normSt);
                    }).length;
                    const maxCount = Math.max(...kelasList.map(kl => siswaList.filter(s => {
                      const isClassMatch = s.kelasId === kl.id || s.kelas === kl.nama || s.kelasSaatIni === kl.nama || (kl.id && (s.kelasId === kl.id || s.kelas === kl.id));
                      const normSt = getNormalizedStatus(s.status);
                      return isClassMatch && ['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(normSt);
                    }).length), 1);
                    const percentage = Math.round((count / maxCount) * 100);
                    return (
                      <div key={k.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Kelas {k.nama}</span>
                          <span>{count} Siswa</span>
                        </div>
                        <div className="w-full bg-slate-200/60 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Dokumen & Kelengkapan Berkas Siswa */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Verifikasi Dokumen Fisik</h4>
                <div className="space-y-4 pt-2">
                  {[
                    { label: 'Akta Kelahiran', total: siswaList.filter(s => s.berkasAkta === 'Lengkap').length },
                    { label: 'Kartu Keluarga (KK)', total: siswaList.filter(s => s.berkasKk === 'Lengkap').length },
                    { label: 'KTP Orang Tua', total: siswaList.filter(s => s.berkasKtpAyah === 'Lengkap' || s.berkasKtpIbu === 'Lengkap').length },
                    { label: 'Ijazah Kelulusan', total: siswaList.filter(s => s.berkasIjazah === 'Lengkap').length }
                  ].map((doc) => {
                    const percent = Math.round((doc.total / (siswaList.length || 1)) * 100);
                    return (
                      <div key={doc.label} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{doc.label}</span>
                          <span className="text-[10px] text-slate-400 block">{doc.total} dari {siswaList.length} siswa lengkap</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {subTab === 'siswa' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4 hidden sm:table-cell">NISN</th>
                  <th className="p-4 text-center">Kelas</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSiswa.map((s, idx) => {
                  const initial = s.nama.charAt(0).toUpperCase();
                  const fallbackAvatar = s.jk === 'P'
                    ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                  
                  return (
                    <tr key={s.id ? `siswa-${s.id}-${idx}` : `siswa-idx-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-slate-400">{(page - 1) * limit + idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                            {s.fotoUrl ? (
                              <img src={s.fotoUrl} alt={s.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <img src={fallbackAvatar} alt={s.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{s.nama}</span>
                            <span className="text-[10px] text-slate-400 font-bold block sm:hidden">NISN: {s.nisn} | No. PDKT: {s.noPdkt || s.id}</span>
                            <span className="text-[10px] text-slate-400 font-bold hidden sm:block">No. PDKT: <span className="font-mono text-slate-500">{s.noPdkt || s.id}</span></span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-600 hidden sm:table-cell">{s.nisn}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase font-mono">
                          {getNormalizedStatus(s.status) === 'LULUS' || s.kelasId === 'L13' || s.kelasId === '13' || (s.kelasId || '').toLowerCase().includes('alumni')
                            ? '13'
                            : (kelasList.find(k => k.id === s.kelasId)?.nama || s.kelasId || 'Belum Ada')}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">
                        {(() => {
                          const normSt = getNormalizedStatus(s.status);
                          let badgeStyle = 'bg-slate-50 text-slate-600 border border-slate-200';
                          let titleText = '';
                          if (normSt === 'AKTIF') {
                            badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                            titleText = 'Aktif Dapodik & Aktif Belajar';
                          } else if (normSt === 'TIDAK AKTIF') {
                            badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-200';
                            titleText = 'Aktif Dapodik, Tidak Aktif Belajar';
                          } else if (normSt === 'BELUM') {
                            badgeStyle = 'bg-sky-50 text-sky-700 border border-sky-200';
                            titleText = 'Tidak Aktif Dapodik, Aktif Belajar';
                          } else if (normSt === 'PINDAH') {
                            badgeStyle = 'bg-purple-50 text-purple-700 border border-purple-200';
                            titleText = 'Pindah ke sekolah lain';
                          } else if (normSt === 'KELUAR') {
                            badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-200';
                            titleText = 'Keluar tanpa keterangan';
                          } else if (normSt === 'LULUS') {
                            badgeStyle = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                            titleText = 'Sudah Lulus (Alumni)';
                          }
                          
                          return (
                            <span 
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block cursor-help ${badgeStyle}`} 
                              title={titleText}
                            >
                              {normSt}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => setViewingKartuSiswa(s)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                            title="Cetak Kartu Pelajar QR"
                          >
                            <QrCode className="w-3.5 h-3.5 text-indigo-100" />
                            <span>Cetak Kartu QR</span>
                          </button>
                          <button 
                            onClick={() => setSelectedDetailSiswa(s)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditSiswaModal(s)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSiswa(s.id, s.nama)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSiswa.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-slate-500 font-bold text-xs">Tidak ada data siswa yang sesuai dengan filter / pencarian.</p>
                        <button 
                          type="button"
                          onClick={() => { setSelectedTahunMasuk(''); setSelectedJenjang(''); setSelectedStatus(''); setSelectedKelas(''); setSearchQuery(''); setPage(1); }}
                          className="mt-1 px-3 py-1.5 bg-blue-600 text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 transition cursor-pointer"
                        >
                          Reset Semua Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'guru' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Guru</th>
                  <th className="p-4 hidden sm:table-cell">Jenis Kelamin</th>
                  <th className="p-4 hidden md:table-cell">Tempat, Tgl Lahir</th>
                  <th className="p-4 hidden lg:table-cell">NIK</th>
                  <th className="p-4 hidden md:table-cell">No. Telepon / Email</th>
                  <th className="p-4">Mapel / Kelas</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedGuru.map((g, idx) => {
                  const fallbackAvatar = g.jk === 'P'
                    ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                  
                  return (
                    <tr key={g.id ? `guru-${g.id}-${idx}` : `guru-idx-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-slate-400">{(page - 1) * limit + idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                            {g.fotoUrl ? (
                              <img src={g.fotoUrl} alt={g.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <img src={fallbackAvatar} alt={g.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{g.nama}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">
                              ID: {g.id} {g.nip ? `| NIP: ${g.nip}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400 block sm:hidden">
                              {g.jk === 'P' ? 'Perempuan' : 'Laki-laki'} | Telp: {g.noHp || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${g.jk === 'P' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                          {g.jk === 'P' ? 'Perempuan' : 'Laki-laki'}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600 hidden md:table-cell">
                        {g.tempatLahir ? `${g.tempatLahir}, ` : ''}{g.tglLahir || '-'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-500 hidden lg:table-cell">{g.nik || '-'}</td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="block font-mono font-semibold text-slate-700">{g.noHp || '-'}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">{g.email || '-'}</span>
                      </td>
                      <td className="p-4">
                        <span className="block font-bold text-blue-600">{g.mapel || '-'}</span>
                        {g.kelasAjar && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5">Kelas {g.kelasAjar}</span>}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                          g.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {g.status || 'AKTIF'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedDetailGuru(g)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditGuruModal(g)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteGuru(g.id, g.nama)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {subTab === 'kelas' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">ID Kelas</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Wali Kelas</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kelasList.map((k, idx) => (
                  <tr key={k.id ? `kelas-${k.id}-${idx}` : `kelas-idx-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-indigo-600">{k.id}</td>
                    <td className="p-4 font-bold text-slate-700">{k.jenjang || 'PAKET C'}</td>
                    <td className="p-4 font-extrabold text-slate-800 text-sm">{k.nama}</td>
                    <td className="p-4 font-semibold text-slate-600">{k.wali || 'Belum Ditentukan'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full font-bold ${
                        k.aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {k.aktif ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditKelas(k)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                          title="Edit Kelas"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKelas(k.id, k.nama)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === 'ortu' && (
            <div className="space-y-4">
              {ortuList.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/20 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-bold">Tidak ada data Orang Tua yang terdaftar di database.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                    <tr>
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4">Nama Wali</th>
                      <th className="p-4">Username / Akun</th>
                      <th className="p-4">Nama Siswa (Anak)</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ortuList.map((item, idx) => {
                      const child = siswaList.find(s => s.id === item.siswaIds || s.nisn === item.siswaIds || s.noPdkt === item.siswaIds);
                      return (
                        <tr key={item.id ? `ortu-${item.id}` : `ortu-idx-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-slate-800 text-sm">{item.name}</td>
                          <td className="p-4 font-mono text-indigo-600">{item.username}</td>
                          <td className="p-4 font-semibold text-blue-600">{child ? child.nama : (item.siswaIds || '-')}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteOrtu(item.id, item.name)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2.5 py-1.5 rounded-lg transition text-[10px]"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {subTab === 'jenjang' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">ID Kelas</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jenjangList.length > 0 ? (
                  jenjangList.map((item, idx) => (
                    <tr key={item.idKelas ? `jenjang-${item.idKelas}-${idx}` : `jenjang-idx-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-indigo-600">{item.idKelas}</td>
                      <td className="p-4 font-bold text-slate-700 text-sm">{item.jenjang}</td>
                      <td className="p-4 font-extrabold text-slate-800 text-sm">{item.namaKelas}</td>
                      <td className="p-4 font-medium text-slate-500 text-xs">{item.keterangan || '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full font-bold ${
                          item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{item.status}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditJenjang(item)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteJenjang(item.idKelas, item.jenjang)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">
                      KOSONG
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'mapel' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Kode Mapel</th>
                  <th className="p-4">Nama Mata Pelajaran</th>
                  <th className="p-4">Jenjang</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4 text-center">KKM</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMapelList.length > 0 ? (
                  filteredMapelList.map((m, idx) => (
                    <tr key={m.id ? `mapel-${m.id}-${idx}` : `mapel-idx-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-600">{m.id}</td>
                      <td className="p-4 font-bold text-slate-800 text-sm">
                        <div className="flex flex-col">
                          <span>{m.nama}</span>
                          {m.id.startsWith('KATAR') && (
                            <span className="text-[9px] text-amber-600 font-extrabold mt-0.5 tracking-wide uppercase">Muatan Karang Taruna (KATAR)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold">
                        {m.jenjang ? (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            m.jenjang.toUpperCase() === 'PAKET A' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            m.jenjang.toUpperCase() === 'PAKET B' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            m.jenjang.toUpperCase() === 'PAKET C' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {m.jenjang}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-600">
                        {m.kelas ? `Kelas ${m.kelas}` : <span className="text-slate-400 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600">{m.kkm || 70}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditMapelModal(m)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                            title="Edit Mata Pelajaran"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMapel(m.id, m.nama)}
                            className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition"
                            title="Hapus Mata Pelajaran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      📭 Tidak ada mata pelajaran yang cocok dengan filter / pencarian Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'tahun_ajaran' && (
            <div className="p-6 space-y-8 bg-slate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Panel 1: Tahun Ajaran */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Tahun Ajaran Akademik</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Daftar periode tahun ajaran aktif dan non-aktif.</p>
                    </div>
                    <button
                      onClick={handleAddTahunAjaran}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah TA
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 uppercase font-black text-slate-400 border-b">
                        <tr>
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">Tahun Ajaran</th>
                          <th className="p-3">Keterangan</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tahunAjaranList.map((item, idx) => (
                          <tr key={item.ta ? `ta-${item.ta}` : `ta-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{item.ta}</td>
                            <td className="p-3 text-slate-500">{item.desc || '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-150'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleTahunAjaranStatus(idx)}
                                  className="p-1 hover:bg-slate-100 text-blue-600 rounded transition"
                                  title="Ubah Status"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTahunAjaran(idx)}
                                  className="p-1 hover:bg-slate-100 text-rose-600 rounded transition"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Panel 2: Siklus Semester */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Siklus Semester</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Daftar semester akademik aktif dan non-aktif.</p>
                    </div>
                    <button
                      onClick={handleAddSemester}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Semester
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 uppercase font-black text-slate-400 border-b">
                        <tr>
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">Semester</th>
                          <th className="p-3">Tipe</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {semesterList.map((item, idx) => (
                          <tr key={item.sem ? `sem-${item.sem}` : `sem-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{item.sem}</td>
                            <td className="p-3 font-mono text-slate-500">{item.tipe}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-150'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleSemesterStatus(idx)}
                                  className="p-1 hover:bg-slate-100 text-blue-600 rounded transition"
                                  title="Ubah Status"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSemester(idx)}
                                  className="p-1 hover:bg-slate-100 text-rose-600 rounded transition"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === 'hari_libur' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal Libur</th>
                  <th className="p-4">Nama Hari Libur</th>
                  <th className="p-4">Tipe Liburan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hariLiburList.map((item, idx) => (
                  <tr key={item.tgl ? `libur-${item.tgl}-${idx}` : `libur-idx-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{item.tgl}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{item.nama}</td>
                    <td className="p-4"><span className="bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2.5 py-0.5 rounded-md">{item.tipe}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === 'referensi' && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Tabel referensi sistem untuk mempermudah validasi isian dropdown form.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50">
                  <h5 className="font-extrabold text-slate-700 text-xs uppercase border-b pb-1.5">Agama</h5>
                  <ul className="text-xs space-y-1 text-slate-600 font-semibold list-disc list-inside">
                    <li>Islam</li>
                    <li>Kristen Protestan</li>
                    <li>Katolik</li>
                    <li>Hindu</li>
                    <li>Buddha</li>
                    <li>Konghucu</li>
                  </ul>
                </div>
                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50">
                  <h5 className="font-extrabold text-slate-700 text-xs uppercase border-b pb-1.5">Pekerjaan Wali</h5>
                  <ul className="text-xs space-y-1 text-slate-600 font-semibold list-disc list-inside">
                    <li>PNS / TNI / POLRI</li>
                    <li>Karyawan Swasta</li>
                    <li>Wiraswasta / Pengusaha</li>
                    <li>Petani / Buruh</li>
                    <li>Tidak Bekerja / Ibu Rumah Tangga</li>
                  </ul>
                </div>
                <div className="border rounded-2xl p-4 space-y-2 bg-slate-50/50">
                  <h5 className="font-extrabold text-slate-700 text-xs uppercase border-b pb-1.5">Golongan Darah</h5>
                  <ul className="text-xs space-y-1 text-slate-600 font-semibold list-disc list-inside">
                    <li>A</li>
                    <li>B</li>
                    <li>AB</li>
                    <li>O</li>
                    <li>Tidak Tahu</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {subTab === 'import_export' && (() => {
            const targetInfo = getTableInfo(importTarget);
            return (
              <div className="p-8 space-y-6">
                {/* Target Selector Card */}
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-black text-blue-400 tracking-wider">MODUL CONFIGURATION & CONTROL</span>
                      <h4 className="text-lg font-extrabold tracking-tight mt-0.5">Pilih Tabel Database yang Ingin Diimpor</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Filter dan pilih tabel target dari 57+ tabel database terintegrasi di bawah ini.</p>
                    </div>
                    
                    <div className="w-full md:w-96 relative">
                      <select
                        value={importTarget}
                        onChange={(e) => {
                          setImportTarget(e.target.value);
                          setParsedSiswa([]);
                          setPasteText('');
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl text-xs font-black cursor-pointer outline-none border border-blue-400 shadow-lg shadow-blue-600/30 transition"
                      >
                        <optgroup label="🌐 SELURUH DATABASE SEKALIGUS">
                          <option value="semua_tabel">🌐 SEMUA TABEL DATABASE (Full Database Import / Export / Restore All 57 Tables)</option>
                        </optgroup>
                        <optgroup label="⚙️ System & Pengaturan (Tabel 1 - 8)">
                          <option value="setting">⚙️ Setting / Pengaturan System</option>
                          <option value="users">🔐 Users / Akun Pengguna System</option>
                          <option value="role">🛡️ Role & Level Hak Akses</option>
                          <option value="menu">📌 Menu System & Navigasi</option>
                          <option value="hak_akses">🔑 Hak Akses Role & Menu</option>
                          <option value="logs">📜 Log Aktivitas System</option>
                          <option value="audit_log">🕵️ Audit Log Keamanan</option>
                          <option value="notifikasi">🔔 Log Notifikasi System</option>
                        </optgroup>
                        <optgroup label="👤 Data Siswa, Guru & Portal (Tabel 9 - 16)">
                          <option value="siswa">👤 Data Siswa (Aktif & Riwayat Complete)</option>
                          <option value="guru">👨‍🏫 Guru & Tenaga Pendidik</option>
                          <option value="orang_tua">👨‍👩‍👧 Data Orang Tua / Wali</option>
                          <option value="kelas">🏫 Kelas & Rombongan Belajar</option>
                          <option value="web_downloads">📁 Berkas Download Web Portal</option>
                          <option value="web_gallery">🖼️ Galeri Foto Web Portal</option>
                          <option value="form_fields">📝 Konfigurasi Form Custom</option>
                          <option value="web_config">🌐 Pengaturan Web Portal</option>
                        </optgroup>
                        <optgroup label="📖 Akademik & Kehadiran (Tabel 17 - 30)">
                          <option value="jenjang">🎓 Jenjang Pendidikan</option>
                          <option value="mapel">📚 Mata Pelajaran</option>
                          <option value="tahun_ajaran">📅 Tahun Ajaran</option>
                          <option value="semester">🗓️ Semester</option>
                          <option value="hari_libur">🏖️ Hari Libur Sekolah</option>
                          <option value="jadwal">🗓️ Jadwal Pelajaran / Ujian</option>
                          <option value="agenda">📜 Agenda / Kegiatan Sekolah</option>
                          <option value="nilai">📝 Nilai Tugas / UTS / UAS</option>
                          <option value="rapor">📊 Rapor Belajar Siswa</option>
                          <option value="kenaikan_kelas">📈 Riwayat Kenaikan Kelas</option>
                          <option value="kelulusan">🎓 Riwayat Kelulusan</option>
                          <option value="absensi">⏱️ Absensi Siswa (Scan QR)</option>
                          <option value="absensi_guru">⏱️ Absensi Guru & Staf</option>
                          <option value="qr_log">📱 Log Presensi QR Code</option>
                        </optgroup>
                        <optgroup label="💻 CBT, Ujian & Asesmen (Tabel 31 - 40)">
                          <option value="bank_soal">❓ Bank Soal CBT</option>
                          <option value="ujian">✍️ Jadwal Ujian Online</option>
                          <option value="log_ujian">🕵️ Log Anti-Kecurangan Ujian</option>
                          <option value="token">🔑 Token Periodic Ujian</option>
                          <option value="draft_jawaban">💾 Draft Jawaban CBT Live</option>
                          <option value="hasil_ujian">🏆 Hasil Ujian & Asesmen</option>
                          <option value="jenis_ujian">🏷️ Master Jenis Ujian & Asesmen</option>
                          <option value="tugas">📌 Tugas Siswa</option>
                          <option value="hasil_tugas">📝 Pengumpulan Tugas Siswa</option>
                          <option value="analisis_soal">📊 Analisis Kualitas Soal</option>
                        </optgroup>
                        <optgroup label="💵 Keuangan, SPMB & Kas (Tabel 41 - 48)">
                          <option value="spmb_pendaftar">📋 SPMB Pendaftar Calon Siswa</option>
                          <option value="biaya">💵 Master Biaya & Tarif SPP</option>
                          <option value="tagihan">🧾 Tagihan Biaya Siswa</option>
                          <option value="pembayaran">💳 Riwayat Pembayaran SPP</option>
                          <option value="tabungan">🏦 Tabungan Siswa</option>
                          <option value="kas">📈 Kas Masuk Operasional</option>
                          <option value="pengeluaran">📉 Pengeluaran Kas Operasional</option>
                          <option value="invoice">📄 Invoice Pembayaran</option>
                        </optgroup>
                        <optgroup label="🤝 Kesiswaan, Sarpras, Berkas & Backup (Tabel 49 - 57)">
                          <option value="bimbingan">🤝 Bimbingan Konseling (BK)</option>
                          <option value="pelanggaran">⚠️ Catatan Pelanggaran & Poin</option>
                          <option value="barang">🛠️ Inventaris Sarpras / Barang</option>
                          <option value="pemeliharaan">🔧 Pemeliharaan Sarpras</option>
                          <option value="peminjaman_barang">📦 Peminjaman Barang / Alat</option>
                          <option value="file">💾 Penyimpanan Berkas Digital</option>
                          <option value="arsip">🗄️ Dokumen & Arsip Digital</option>
                          <option value="backup">📦 Riwayat Backup System</option>
                          <option value="master_siswa">👥 Master Data Siswa (Tabel Utama)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Operational Action Buttons Bar */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleExportFullDatabaseExcel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                        title="Buka langsung seluruh data 60+ tabel di Microsoft Excel"
                      >
                        <span>📊</span> Export Full Database Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportFullDatabaseJson}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                        title="File cadangan sistem (.json) untuk backup & restore"
                      >
                        <span>📦</span> Export Backup JSON System
                      </button>
                      <button
                        onClick={handleDownloadTemplate}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                        title="Download template spreadsheet .xlsx untuk diisi"
                      >
                        <span>📥</span> Download Template Excel ({targetInfo.cleanTitle})
                      </button>
                      <button
                        onClick={handleClearCurrentTable}
                        className="bg-amber-600/80 hover:bg-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-amber-500/30 shadow-sm"
                      >
                        <span>🗑️</span> Kosongkan Tabel {targetInfo.cleanTitle} Ini
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleResetAllDatabase}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <span>🧹</span> Bersihkan Semua Data Sampel Database (Reset All)
                      </button>
                      <button
                        onClick={handleRestoreSampleSiswa}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
                      >
                        <span>♻️</span> Pulihkan Data Sampel Default
                      </button>
                    </div>
                  </div>
                </div>

                {/* Header Info */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-3xl p-6 space-y-2">
                  <h4 className="font-extrabold text-blue-900 text-sm flex items-center gap-2">
                    <span>📋</span> Solusi Impor Salin-Tempel (Copy-Paste) - {targetInfo.cleanTitle}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    Cara termudah memasukkan database <span className="font-black text-blue-700">{targetInfo.cleanTitle}</span> secara massal! Anda cukup memblok tabel data di Excel atau Google Sheets, menyalinnya dengan <kbd className="bg-white border px-1.5 py-0.5 rounded text-[10px] font-mono shadow-sm">Ctrl+C</kbd>, lalu menempelkannya ke kotak teks di bawah ini. Sistem kami akan secara otomatis memetakan kolom-kolom penting dan memperbarui data otomatis jika ID utama sudah ada (upsert)!
                  </p>
                </div>

                {/* Importer Section */}
                <div className="space-y-4">
                  <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <span>{targetInfo.icon}</span> Tempel Data Tabel {targetInfo.cleanTitle} Di Sini
                      </label>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold self-start sm:self-auto border border-slate-200">
                        Kode Tabel Target: <code className="text-blue-600 font-mono font-bold uppercase">{importTarget}</code>
                      </span>
                    </div>

                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={targetInfo.placeholder}
                      rows={9}
                      className="w-full text-xs font-mono border bg-slate-50/50 rounded-2xl p-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                    />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-200 transition shrink-0">
                          <input
                            type="checkbox"
                            checked={hasHeaderRow}
                            onChange={(e) => setHasHeaderRow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Baris 1 Adalah Judul Kolom (Header)</span>
                        </label>

                        <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 border px-3 py-2 rounded-xl flex items-center gap-2 max-w-full overflow-x-auto">
                          <span className="shrink-0">💡 Header Disarankan:</span>
                          <code className="bg-white border text-blue-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0">
                            {targetInfo.cols.join(' \t ')}
                          </code>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 self-end md:self-auto">
                        {pasteText && (
                          <button
                            onClick={() => { setPasteText(''); setParsedSiswa([]); }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-xs transition"
                          >
                            Bersihkan Kotak
                          </button>
                        )}
                        <button
                          onClick={handleParsePaste}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                        >
                          <Upload className="w-4 h-4" /> Proses & Tinjau Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Parsed Rows Review Area */}
              {parsedSiswa.length > 0 && (
                <div className="bg-white border border-blue-200 rounded-3xl p-6 space-y-4 shadow-sm animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        🔍 Tinjauan Data Hasil Parsing ({parsedSiswa.length} Data {importTarget} Terdeteksi)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">Silakan periksa apakah pemetaan data di bawah ini sudah sesuai sebelum dimasukkan ke database utama.</p>
                    </div>
                    <button
                      onClick={handleFinalizeImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl text-xs transition shadow flex items-center gap-2 shrink-0"
                    >
                      <span>✅</span> Selesaikan Impor Ke Database ({parsedSiswa.length} {importTarget})
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    {importTarget === 'siswa' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">No. PDKT (ID)</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3 text-center">JK</th>
                            <th className="p-3">Kelas Terbaru</th>
                            <th className="p-3 text-center">Thn Ajaran Terbaru</th>
                            <th className="p-3 text-center">Siklus Riwayat</th>
                            <th className="p-3 text-center">Status Terbaru</th>
                            <th className="p-3">Keterangan (Analisis Cerdas)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.noPdkt ? `ps-${row.noPdkt}-${idx}` : `ps-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.noPdkt}</td>
                              <td className="p-3 font-bold text-slate-800">{row.nama}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${row.jk === 'L' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'}`}>
                                  {row.jk}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 font-black">{row.kelasId || '-'}</td>
                              <td className="p-3 text-center font-bold text-slate-600">{row.tahunAjaran || '-'}</td>
                              <td className="p-3 text-center">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] border border-blue-100">
                                  🔄 {row.riwayatAkademis ? row.riwayatAkademis.length : 1} Tahun
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                  row.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  row.keterangan?.includes('Naik') || row.keterangan?.includes('Lulus') || row.keterangan?.includes('Aktif')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  ✨ {row.keterangan || 'Aktif'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'guru' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">NIP (ID)</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3 text-center">JK</th>
                            <th className="p-3">Mata Pelajaran</th>
                            <th className="p-3">Kelas Ajar</th>
                            <th className="p-3">No HP</th>
                            <th className="p-3">Email</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.nip ? `pg-${row.nip}-${idx}` : `pg-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.nip}</td>
                              <td className="p-3 font-bold text-slate-800">{row.nama}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${row.jk === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                  {row.jk}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-600">{row.mapel}</td>
                              <td className="p-3 font-black text-slate-650">{row.kelasAjar || '-'}</td>
                              <td className="p-3 text-slate-500 font-mono">{row.noHp || '-'}</td>
                              <td className="p-3 text-slate-500 font-mono">{row.email || '-'}</td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-100">
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'kelas' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">ID Kelas</th>
                            <th className="p-3">Nama Kelas</th>
                            <th className="p-3">Wali Kelas</th>
                            <th className="p-3">Jenjang</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.id ? `pk-${row.id}-${idx}` : `pk-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.id}</td>
                              <td className="p-3 font-extrabold text-slate-850">{row.nama}</td>
                              <td className="p-3 text-slate-700 font-semibold">{row.wali || '-'}</td>
                              <td className="p-3 text-slate-500 font-mono">{row.jenjang}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${row.aktif ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {row.aktif ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'mapel' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">ID Mapel</th>
                            <th className="p-3">Nama Mapel</th>
                            <th className="p-3 text-center">KKM</th>
                            <th className="p-3">Jenjang</th>
                            <th className="p-3">Kelas / Rombel</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.id ? `pm-${row.id}-${idx}` : `pm-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.id}</td>
                              <td className="p-3 font-extrabold text-slate-850">{row.nama}</td>
                              <td className="p-3 text-center font-bold text-slate-700">{row.kkm}</td>
                              <td className="p-3 text-slate-500">{row.jenjang}</td>
                              <td className="p-3 font-black text-slate-600">Kelas {row.kelas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'buku' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">ID Buku</th>
                            <th className="p-3">Judul Buku</th>
                            <th className="p-3">Pengarang</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3 text-center">Stok Awal</th>
                            <th className="p-3 text-center">Tahun</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.id ? `pb-${row.id}-${idx}` : `pb-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.id}</td>
                              <td className="p-3 font-extrabold text-slate-850">{row.judul}</td>
                              <td className="p-3 text-slate-600">{row.pengarang}</td>
                              <td className="p-3 text-slate-500">{row.kategori}</td>
                              <td className="p-3 text-center font-bold text-slate-700">{row.stok}</td>
                              <td className="p-3 text-center text-slate-500">{row.tahun}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'barang' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">ID Barang</th>
                            <th className="p-3">Nama Barang</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3 text-center">Jumlah</th>
                            <th className="p-3 text-center">Kondisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.id ? `pbrg-${row.id}-${idx}` : `pbrg-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.id}</td>
                              <td className="p-3 font-extrabold text-slate-850">{row.nama}</td>
                              <td className="p-3 text-slate-500">{row.kategori}</td>
                              <td className="p-3 text-center font-bold text-slate-700">{row.jumlah}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                  row.status === 'BAIK' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importTarget === 'biaya' && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">ID Biaya</th>
                            <th className="p-3">Nama Tagihan</th>
                            <th className="p-3 text-right">Nominal</th>
                            <th className="p-3 text-center">Sasaran Kelas</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={row.id ? `pby-${row.id}-${idx}` : `pby-idx-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono font-bold text-blue-600">{row.id}</td>
                              <td className="p-3 font-extrabold text-slate-850">{row.nama}</td>
                              <td className="p-3 text-right font-black text-slate-800">Rp {row.nominal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-center text-slate-600 font-semibold">{row.kelasId}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${row.aktif ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {row.aktif ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {!['siswa', 'guru', 'kelas', 'mapel', 'buku', 'barang', 'biaya'].includes(importTarget) && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            {parsedSiswa.length > 0 && Object.keys(parsedSiswa[0]).map((key, kIdx) => (
                              <th key={`${key}-${kIdx}`} className="p-3 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedSiswa.map((row, idx) => (
                            <tr key={`gen-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              {Object.keys(row).map((key, kIdx) => (
                                <td key={`${key}-${kIdx}`} className="p-3 font-semibold text-slate-700 max-w-xs truncate">
                                  {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Alternative Multi-Sheet Excel (.xlsx) / CSV File Upload & Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="border border-dashed border-blue-300 hover:border-blue-500 rounded-3xl p-6 text-center space-y-4 transition-all bg-blue-50/20">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Unggah Spreadsheet / Berkas Excel Multi-Sheet (.xlsx, .xls, .csv, .tsv)</h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                      Dukung file Excel utuh hingga <b>50+ Sheet</b> secara otomatis! Sistem akan membaca seluruh tab (SISWA, GURU, KELAS, BIAYA, SPMB, dll) dalam 1 kali klik.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    id="excel-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

                      if (isExcel) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          try {
                            const buffer = evt.target?.result as ArrayBuffer;
                            const workbook = XLSX.read(buffer, { type: 'array' });
                            
                            const mapSheetKey = (raw: string) => {
                              const name = raw.trim().toUpperCase().replace(/\s+/g, '_');
                              if (name === 'SETTING' || name === 'SETTINGS') return 'setting';
                              if (name === 'USERS' || name === 'USER') return 'users';
                              if (name === 'ROLE') return 'role';
                              if (name === 'MENU') return 'menu';
                              if (name === 'HAK_AKSES') return 'hak_akses';
                              if (name === 'LOGS' || name === 'LOG') return 'logs';
                              if (name === 'AUDIT_LOG') return 'audit_log';
                              if (name === 'NOTIFIKASI') return 'notifikasi';
                              if (name.includes('SISWA')) return 'siswa';
                              if (name.includes('GURU')) return 'guru';
                              if (name.includes('ORANG_TUA') || name.includes('ORTU')) return 'ortu';
                              if (name.includes('KELAS')) return 'kelas';
                              if (name.includes('WEB_DOWNLOADS')) return 'web_downloads';
                              if (name.includes('WEB_GALLERY')) return 'web_gallery';
                              if (name.includes('FORM')) return 'form_fields';
                              if (name.includes('WEB_CONFIG')) return 'web_config';
                              if (name.includes('JENJANG')) return 'jenjang';
                              if (name.includes('MAPEL')) return 'mapel';
                              if (name.includes('TAHUN_AJARAN')) return 'tahun_ajaran';
                              if (name.includes('SEMESTER')) return 'semester';
                              if (name.includes('HARI_LIBUR')) return 'hari_libur';
                              if (name.includes('JADWAL')) return 'jadwal';
                              if (name.includes('AGENDA')) return 'agenda';
                              if (name.includes('NILAI')) return 'nilai';
                              if (name.includes('RAPOR')) return 'rapor';
                              if (name.includes('KENAIKAN_KELAS')) return 'kenaikan_kelas';
                              if (name.includes('KELULUSAN')) return 'kelulusan';
                              if (name.includes('ABSENSI_GURU')) return 'absensi_guru';
                              if (name.includes('ABSENSI')) return 'absensi';
                              if (name.includes('QR_LOG')) return 'qr_log';
                              if (name.includes('BANK_SOAL') || name.includes('SOAL')) return 'soal';
                              if (name.includes('UJIAN')) return 'ujian';
                              if (name.includes('LOG_UJIAN')) return 'log_ujian';
                              if (name.includes('TOKEN')) return 'token';
                              if (name.includes('DRAFT_JAWABAN')) return 'draft_jawaban';
                              if (name.includes('HASIL_UJIAN') || name.includes('HASIL')) return 'hasil_ujian';
                              if (name.includes('JENIS_UJIAN')) return 'jenis_ujian';
                              if (name.includes('HASIL_TUGAS')) return 'hasil_tugas';
                              if (name.includes('TUGAS')) return 'tugas';
                              if (name.includes('ANALISIS_SOAL')) return 'analisis_soal';
                              if (name.includes('SPMB') || name.includes('PENDAFTAR')) return 'spmb_pendaftar';
                              if (name.includes('BIAYA')) return 'biaya';
                              if (name.includes('TAGIHAN')) return 'tagihan';
                              if (name.includes('PEMBAYARAN')) return 'pembayaran';
                              if (name.includes('TABUNGAN')) return 'tabungan';
                              if (name.includes('PENGELUARAN')) return 'pengeluaran';
                              if (name.includes('KAS')) return 'kas';
                              if (name.includes('INVOICE')) return 'invoice';
                              if (name.includes('BIMBINGAN')) return 'bimbangan';
                              if (name.includes('PELANGGARAN')) return 'pelanggaran';
                              if (name.includes('PEMINJAMAN')) return 'peminjaman_barang';
                              if (name.includes('PEMELIHARAAN')) return 'pemeliharaan';
                              if (name.includes('BARANG')) return 'barang';
                              if (name.includes('FILE')) return 'file';
                              if (name.includes('ARSIP')) return 'arsip';
                              if (name.includes('BACKUP')) return 'backup';
                              if (name.includes('BUKU')) return 'buku';
                              return name.toLowerCase();
                            };

                            let totalRows = 0;
                            const details: { sheetName: string; rowsCount: number; key: string }[] = [];

                            workbook.SheetNames.forEach((sheetName) => {
                              const worksheet = workbook.Sheets[sheetName];
                              const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                              const dbKey = mapSheetKey(sheetName);
                              if (jsonRows) {
                                if (jsonRows.length > 0) {
                                  db.set(dbKey, jsonRows);
                                  totalRows += jsonRows.length;
                                }
                                details.push({ sheetName, rowsCount: jsonRows.length, key: dbKey });
                              }
                            });

                            if (details.length === 0) {
                              Swal.fire('File Kosong', 'Berkas Excel tidak memiliki sheet yang dapat dibaca.', 'warning');
                              return;
                            }

                            Swal.fire({
                              title: 'Impor Excel Multi-Sheet Berhasil! 🎉',
                              html: `
                                <div class="text-left text-xs font-semibold text-slate-700 space-y-3">
                                  <p class="font-bold text-slate-800">Berkas: <code class="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${file.name}</code></p>
                                  <p class="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                                    ✅ Total ${details.length} Sheet / Tabel & ${totalRows} Baris Data Berhasil Diimpor Ke Database ERP!
                                  </p>
                                  <p class="text-slate-500 text-[11px]">Rincian tabel yang berhasil disinkronkan:</p>
                                  <div class="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                                    ${details.map(d => `
                                      <div class="flex justify-between border-b border-slate-200/60 py-1 font-mono text-[11px]">
                                        <span class="font-bold text-slate-800">Sheet "${d.sheetName}"</span>
                                        <span class="text-blue-600 font-bold">${d.rowsCount} baris → [${d.key}]</span>
                                      </div>
                                    `).join('')}
                                  </div>
                                </div>
                              `,
                              icon: 'success'
                            }).then(() => {
                              window.location.reload();
                            });
                          } catch (err: any) {
                            Swal.fire('Gagal Membaca File Excel', err.message || 'Format berkas Excel tidak valid.', 'error');
                          }
                        };
                        reader.readAsArrayBuffer(file);
                      } else {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          if (text) {
                            setPasteText(text);
                            Swal.fire('File Dimuat', 'Berkas CSV/TSV berhasil dibaca ke dalam kotak teks. Klik "Proses & Tinjau Data" untuk mengimpor.', 'success');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <label htmlFor="excel-file-upload" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md">
                    📁 Pilih File Excel (.xlsx / .xls) / CSV / TSV
                  </label>
                </div>

                <div className="border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 bg-slate-50/30">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">Unduh Template & Database Rombel</h5>
                    <p className="text-xs text-slate-400 mt-1">Unduh seluruh master data terdaftar saat ini dalam berkas Excel (.xlsx) 50 Sheet utuh atau TSV.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => {
                      const workbook = XLSX.utils.book_new();
                      const allCollections = [
                        { name: 'SETTING', key: 'setting' },
                        { name: 'USERS', key: 'users' },
                        { name: 'ROLE', key: 'role' },
                        { name: 'MENU', key: 'menu' },
                        { name: 'HAK_AKSES', key: 'hak_akses' },
                        { name: 'LOGS', key: 'logs' },
                        { name: 'AUDIT_LOG', key: 'audit_log' },
                        { name: 'NOTIFIKASI', key: 'notifikasi' },
                        { name: 'SISWA', key: 'siswa' },
                        { name: 'GURU', key: 'guru' },
                        { name: 'ORANG_TUA', key: 'ortu' },
                        { name: 'KELAS', key: 'kelas' },
                        { name: 'WEB_DOWNLOADS', key: 'web_downloads' },
                        { name: 'WEB_GALLERY', key: 'web_gallery' },
                        { name: 'FORM_FIELDS', key: 'form_fields' },
                        { name: 'WEB_CONFIG', key: 'web_config' },
                        { name: 'JENJANG', key: 'jenjang' },
                        { name: 'MAPEL', key: 'mapel' },
                        { name: 'TAHUN_AJARAN', key: 'tahun_ajaran' },
                        { name: 'SEMESTER', key: 'semester' },
                        { name: 'HARI_LIBUR', key: 'hari_libur' },
                        { name: 'JADWAL', key: 'jadwal' },
                        { name: 'AGENDA', key: 'agenda' },
                        { name: 'NILAI', key: 'nilai' },
                        { name: 'RAPOR', key: 'rapor' },
                        { name: 'KENAIKAN_KELAS', key: 'kenaikan_kelas' },
                        { name: 'KELULUSAN', key: 'kelulusan' },
                        { name: 'ABSENSI', key: 'absensi' },
                        { name: 'ABSENSI_GURU', key: 'absensi_guru' },
                        { name: 'QR_LOG', key: 'qr_log' },
                        { name: 'BANK_SOAL', key: 'soal' },
                        { name: 'UJIAN', key: 'ujian' },
                        { name: 'LOG_UJIAN', key: 'log_ujian' },
                        { name: 'TOKEN', key: 'token' },
                        { name: 'DRAFT_JAWABAN', key: 'draft_jawaban' },
                        { name: 'HASIL_UJIAN', key: 'hasil_ujian' },
                        { name: 'JENIS_UJIAN', key: 'jenis_ujian' },
                        { name: 'TUGAS', key: 'tugas' },
                        { name: 'HASIL_TUGAS', key: 'hasil_tugas' },
                        { name: 'ANALISIS_SOAL', key: 'analisis_soal' },
                        { name: 'SPMB_PENDAFTAR', key: 'spmb_pendaftar' },
                        { name: 'BIAYA', key: 'biaya' },
                        { name: 'TAGIHAN', key: 'tagihan' },
                        { name: 'PEMBAYARAN', key: 'pembayaran' },
                        { name: 'TABUNGAN', key: 'tabungan' },
                        { name: 'KAS', key: 'kas' },
                        { name: 'PENGELUARAN', key: 'pengeluaran' },
                        { name: 'INVOICE', key: 'invoice' },
                        { name: 'BIMBINGAN', key: 'bimbangan' },
                        { name: 'PELANGGARAN', key: 'pelanggaran' },
                        { name: 'BARANG', key: 'barang' },
                        { name: 'PEMELIHARAAN', key: 'pemeliharaan' },
                        { name: 'PEMINJAMAN_BARANG', key: 'peminjaman_barang' },
                        { name: 'FILE', key: 'file' },
                        { name: 'ARSIP', key: 'arsip' },
                        { name: 'BACKUP', key: 'backup' }
                      ];

                      let count = 0;
                      allCollections.forEach(({ name, key }) => {
                        const data = db.get(key) || [];
                        const sheetData = data.length > 0 ? data : [{ info: 'Data belum terisi' }];
                        const worksheet = XLSX.utils.json_to_sheet(sheetData);
                        XLSX.utils.book_append_sheet(workbook, worksheet, name);
                        count++;
                      });

                      XLSX.writeFile(workbook, `Master_Database_Rombel_KTCT_56Sheets_${new Date().getFullYear()}.xlsx`);
                      Swal.fire('Ekspor Excel Berhasil!', `Unduh berkas Excel utuh dengan ${count} sheet berhasil.`, 'success');
                    }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow">
                      <Download className="w-4 h-4" /> Ekspor Full Excel (.xlsx)
                    </button>
                    <button onClick={() => {
                      let templateStr = '';
                      if (importTarget === 'siswa') {
                        templateStr = "No. PDKT\tNISN\tNama\tJK\tKelas\tTahun Masuk\nPDKT-2026-001\t1234567890\tAhmad Dahlan\tL\t9A\t2026\nPDKT-2026-002\t0987654321\tSiti Aisyah\tP\t9B\t2026";
                      } else if (importTarget === 'guru') {
                        templateStr = "NIP\tNama\tJenis Kelamin\tTempat Lahir\tTanggal Lahir\tNIK\tNo Telepon\tEmail\tMata Pelajaran\tKelas Ajar\tStatus\n19870101\tBudi Santoso, S.Pd.\tL\tJakarta\t1987-05-15\t3175010101870001\t081234567890\tbudi@rombel.sch.id\tMatematika\tKelas 7\tAKTIF";
                      } else if (importTarget === 'kelas') {
                        templateStr = "ID Kelas\tNama Kelas\tWali Kelas\tJenjang\tStatus\n9A\tKelas IX-A\tProf. Budiman\tPAKET B\tAKTIF";
                      } else if (importTarget === 'mapel') {
                        templateStr = "ID Mapel\tNama Mapel\tKKM\tKelas\tJenjang\nMAPEL-01\tFisika\t75\t9\tPAKET B";
                      } else if (importTarget === 'buku') {
                        templateStr = "ID Buku\tJudul Buku\tPengarang\tKategori\tJumlah\nB-101\tFisika Dasar IX\tTim Guru\tModul Kurikulum\t25";
                      } else if (importTarget === 'barang') {
                        templateStr = "ID Barang\tNama Barang\tKategori\tJumlah\tKondisi\nBRG-101\tProyektor Ruang A\tAset Ruangan\t1\tBAIK";
                      } else {
                        templateStr = "ID Biaya\tNama Tagihan\tNominal\tSasaran Kelas\tStatus\nBIA_SPP\tSPP Bulanan\t150000\tSemua\tAKTIF";
                      }

                      const dataStr = "data:text/tsv;charset=utf-8," + encodeURIComponent(templateStr);
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `template_impor_${importTarget}.tsv`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      Swal.fire('Unduh', `Template kosong ${importTarget} berhasil diunduh.`, 'success');
                    }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition">
                      Unduh Template TSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Area */}
              <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-rose-950/40 space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-black text-rose-500 tracking-wider">ENTERPRISE DATABASE CONTROL</span>
                  <h4 className="text-lg font-extrabold tracking-tight mt-0.5 flex items-center gap-2 text-rose-400">
                    <span>⚠️</span> Panel Kontrol Pembersihan & Reset Database ERP
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Gunakan panel ini untuk membuang seluruh data simulasi/sampel bawaan sebelum mengunggah database Excel / Google Sheets riil milik sekolah Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Siswa Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">1. Modul Siswa & Transaksi</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus data siswa aktif, riwayat, absensi, tabungan, tagihan, dan nilai.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('siswa')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Data Siswa
                    </button>
                  </div>

                  {/* Guru Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">2. Modul Guru & Penugasan</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus profil guru, jadwal mengajar, dan akun guru.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('guru')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Data Guru
                    </button>
                  </div>

                  {/* Mapel Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">3. Modul Mapel & Kurikulum</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus daftar mata pelajaran, KKM, dan data kurikulum.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('mapel')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Data Mapel
                    </button>
                  </div>

                  {/* Biaya Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">4. Modul Keuangan & SPP</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus master konfigurasi tarif biaya dan SPP bulanan.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('biaya')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Tarif Biaya
                    </button>
                  </div>

                  {/* Perpustakaan Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">5. Modul Buku & Perpustakaan</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus katalog buku dan data sirkulasi peminjaman buku.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('buku')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Katalog Buku
                    </button>
                  </div>

                  {/* Inventaris Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-200 uppercase">6. Modul Inventaris & Barang</h5>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Menghapus catatan aset sarpras dan peminjaman barang.</p>
                    </div>
                    <button
                      onClick={() => handleResetModule('barang')}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold py-2 rounded-xl text-[11px] transition"
                    >
                      Kosongkan Aset & Barang
                    </button>
                  </div>
                </div>

                {/* Global Wipe Actions */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/50 p-6 rounded-3xl">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-rose-500 uppercase flex items-center gap-1">
                      <span>🔥</span> Zona Bahaya: Pembersihan Total (Total Wipe)
                    </h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-2xl">
                      Menghapus seluruh data simulasi di atas sekaligus. Database akan kosong total dan siap menerima data riil sekolah Anda. Akun login Admin & Yayasan tidak akan terhapus.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {localStorage.getItem('ERP_siswa_purged_all') === 'true' && (
                      <button
                        onClick={handleRestoreSampleSiswa}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-[11px] transition shadow-md shadow-emerald-600/10"
                      >
                        🔄 Pulihkan Data Sampel Bawaan
                      </button>
                    )}
                    <button
                      onClick={handleResetAllDatabase}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 rounded-xl text-[11px] transition shadow-md shadow-rose-600/10"
                    >
                      🧹 Kosongkan Seluruh Database ERP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

          {subTab === 'biaya' && (
            <div className="p-6">
              <Keuangan user={activeUser} forceSubTab="biaya" />
            </div>
          )}

          {subTab === 'barang' && (
            <div className="p-6">
              <Inventaris forceSubTab="barang" />
            </div>
          )}

          {subTab === 'dapodik_validasi' && (() => {
            // Collect Real Diagnostics from the Database
            const allStudents = db.get<any>('siswa') || [];
            const activeStudents = allStudents.filter((s: any) => s.status === 'AKTIF');
            const allGurus = db.get<any>('guru') || [];
            const allKelas = db.get<any>('kelas') || [];
            const allBarangs = db.get<any>('barang') || [];
            const allFees = db.get<any>('biaya') || [];

            // Diagnostics List
            const studentErrors: { id: string; name: string; msg: string; type: 'danger' | 'warning' }[] = [];
            activeStudents.forEach((s: any) => {
              if (!s.nisn || String(s.nisn).trim() === '') {
                studentErrors.push({ id: s.id, name: s.nama, msg: 'NISN Kosong atau Tidak Valid', type: 'danger' });
              }
              if (!s.nik || String(s.nik).trim() === '') {
                studentErrors.push({ id: s.id, name: s.nama, msg: 'NIK belum dimasukkan', type: 'warning' });
              }
              if (!s.alamat || String(s.alamat).trim() === '') {
                studentErrors.push({ id: s.id, name: s.nama, msg: 'Alamat tempat tinggal belum diisi', type: 'warning' });
              }
            });

            const guruErrors: { id: string; name: string; msg: string; type: 'danger' | 'warning' }[] = [];
            allGurus.forEach((g: any) => {
              if (!g.nip || String(g.nip).trim() === '') {
                guruErrors.push({ id: g.id, name: g.nama, msg: 'NIP / NUPTK tidak terdaftar', type: 'warning' });
              }
              if (!g.email || String(g.email).trim() === '') {
                guruErrors.push({ id: g.id, name: g.nama, msg: 'Email GTK belum diverifikasi', type: 'warning' });
              }
            });

            const classErrors: { id: string; name: string; msg: string; type: 'danger' | 'warning' }[] = [];
            allKelas.forEach((k: any) => {
              if (!k.waliId || String(k.waliId).trim() === '') {
                classErrors.push({ id: k.id, name: k.nama, msg: 'Rombel belum memiliki Wali Kelas definitif', type: 'danger' });
              }
              if (!k.tingkat || k.tingkat === 0) {
                classErrors.push({ id: k.id, name: k.nama, msg: 'Tingkat kelas rombel tidak terdefinisi', type: 'danger' });
              }
            });

            const sarprasErrors: { id: string; name: string; msg: string; type: 'danger' | 'warning' }[] = [];
            allBarangs.forEach((b: any) => {
              if (b.kondisi === 'RUSAK' || b.kondisi === 'RUSAK BERAT') {
                sarprasErrors.push({ id: b.id, name: b.namaBarang, msg: `Kondisi aset tercatat ${b.kondisi} - Perlu pemeliharaan`, type: 'warning' });
              }
            });

            const schoolErrors: { name: string; msg: string; type: 'danger' | 'warning' }[] = [];
            if (allFees.length === 0) {
              schoolErrors.push({ name: 'Konfigurasi Biaya', msg: 'Daftar tarif biaya sekolah masih kosong', type: 'warning' });
            }

            const totalInvalids = studentErrors.filter(e => e.type === 'danger').length +
                                  guruErrors.filter(e => e.type === 'danger').length +
                                  classErrors.filter(e => e.type === 'danger').length +
                                  sarprasErrors.filter(e => e.type === 'danger').length +
                                  schoolErrors.filter(e => e.type === 'danger').length;

            const totalWarnings = studentErrors.filter(e => e.type === 'warning').length +
                                   guruErrors.filter(e => e.type === 'warning').length +
                                   classErrors.filter(e => e.type === 'warning').length +
                                   sarprasErrors.filter(e => e.type === 'warning').length +
                                   schoolErrors.filter(e => e.type === 'warning').length;

            const runSimulation = () => {
              if (totalInvalids > 0) {
                Swal.fire({
                  title: 'Sinkronisasi Ditolak!',
                  text: `Terdapat ${totalInvalids} data Invalid (berwarna merah). Silakan perbaiki data pokok tersebut terlebih dahulu sebelum melanjutkan proses sinkronisasi ke server pusat Dapodik 2026.`,
                  icon: 'error',
                  confirmButtonColor: '#e11d48'
                });
                return;
              }

              setSyncStep(2);
              setSyncProgress(0);
              setSyncLogs(['[SINKRONISASI] Memulai prosedur sinkronisasi data Dapodik rilis 2026...']);

              const steps = [
                { log: '[SINKRONISASI] Mengambil snapshot database lokal...', progress: 15 },
                { log: '[SINKRONISASI] Menghubungkan ke API Handshake Dapodik Pusat (https://dapo.kemdikbud.go.id)...', progress: 30 },
                { log: '[SINKRONISASI] Sinkronisasi data GTK (Pendidik dan Tenaga Kependidikan) sebanyak ' + allGurus.length + ' catatan...', progress: 45 },
                { log: '[SINKRONISASI] Sinkronisasi data Peserta Didik sebanyak ' + activeStudents.length + ' catatan...', progress: 65 },
                { log: '[SINKRONISASI] Sinkronisasi Rombongan Belajar & Kurikulum sebanyak ' + allKelas.length + ' rombel...', progress: 80 },
                { log: '[SINKRONISASI] Sinkronisasi Sarpras & Alat Inventaris sebanyak ' + allBarangs.length + ' aset...', progress: 95 },
                { log: '[SINKRONISASI] Mengunduh lembar berita acara konfirmasi sinkronisasi...', progress: 100 }
              ];

              steps.forEach((step, idx) => {
                setTimeout(() => {
                  setSyncProgress(step.progress);
                  setSyncLogs(prev => [...prev, step.log]);
                  if (idx === steps.length - 1) {
                    setTimeout(() => {
                      setSyncStep(3);
                      Swal.fire({
                        title: 'Sinkronisasi Berhasil!',
                        text: 'Seluruh data pokok kependidikan telah berhasil diunggah dan disinkronkan dengan server Dapodik Pusat Kemendikbudristek RI.',
                        icon: 'success',
                        confirmButtonColor: '#3b82f6'
                      });
                    }, 800);
                  }
                }, (idx + 1) * 1200);
              });
            };

            return (
              <div className="p-6 space-y-6">
                {/* Dapodik Header Summary */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="space-y-2 z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 font-extrabold text-[10px] rounded-full border border-blue-500/30">DAPODIK RI 2026</span>
                      <span className="text-[10px] font-bold text-emerald-400">• TERHUBUNG DENGAN SERVER PUSAT</span>
                    </div>
                    <h4 className="text-xl font-black">VALIDASI LOKAL & SINKRONISASI DATA POKOK</h4>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Gunakan fitur ini untuk memvalidasi kelayakan seluruh data pokok sekolah sebelum disubmit ke Kementerian Pendidikan RI secara berkala.
                    </p>
                  </div>
                  <button
                    onClick={runSimulation}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-102 shrink-0 z-10"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin-slow" /> SINKRONISASI DATA LOKAL
                  </button>
                  <div className="absolute right-0 bottom-0 opacity-10 translate-y-4">
                    <Database className="w-48 h-48 text-white" />
                  </div>
                </div>

                {syncStep === 2 && (
                  <div className="bg-slate-950 text-emerald-400 font-mono rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl animate-fade-in-up">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">PROSES TRANSMISI TRANSMIT-SYNC DAPODIK v2026</span>
                      <span className="font-extrabold">{syncProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${syncProgress}%` }}></div>
                    </div>
                    <div className="h-44 overflow-y-auto bg-slate-900 p-4 rounded-xl border border-slate-800 text-[11px] space-y-1.5 scrollbar-thin text-slate-300">
                      {syncLogs.map((log, idx) => (
                        <p key={idx} className={log.includes('Gagal') ? 'text-rose-400' : log.includes('Berhasil') ? 'text-emerald-400' : 'text-slate-300'}>
                          {log}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {syncStep === 3 && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-5 flex items-center gap-4 animate-fade-in-up">
                    <CheckCircle className="w-10 h-10 text-emerald-600 shrink-0" />
                    <div>
                      <h5 className="font-black text-sm">SINKRONISASI BERHASIL DISUBMIT!</h5>
                      <p className="text-xs text-emerald-600 mt-1">
                        Berita acara sinkronisasi No. <b>DAPO-99D3F-2026-{Math.floor(1000 + Math.random() * 9000)}</b> telah diterbitkan. Terakhir sinkronisasi: <b>Hari ini, pukul {new Date().toLocaleTimeString()} WIB</b>.
                      </p>
                    </div>
                    <button onClick={() => setSyncStep(0)} className="ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs">
                      Kembali ke Validasi
                    </button>
                  </div>
                )}

                {/* Grid stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 border rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-extrabold block">INVALID DATA</span>
                    <span className={`text-2xl font-black ${totalInvalids > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>{totalInvalids}</span>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-extrabold block">WARNING DATA</span>
                    <span className={`text-2xl font-black ${totalWarnings > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{totalWarnings}</span>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-extrabold block">PESERTA DIDIK</span>
                    <span className="text-2xl font-black text-slate-700">{activeStudents.length}</span>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-extrabold block">GTK / GURU</span>
                    <span className="text-2xl font-black text-slate-700">{allGurus.length}</span>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-slate-400 font-extrabold block">ROMBEL KELAS</span>
                    <span className="text-2xl font-black text-slate-700">{allKelas.length}</span>
                  </div>
                </div>

                {/* Validation Panels */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="flex border-b bg-slate-50 overflow-x-auto">
                    {[
                      { id: 'sekolah', label: 'Sekolah', errCount: schoolErrors.length },
                      { id: 'sarpras', label: 'Sarpras', errCount: sarprasErrors.length },
                      { id: 'gtk', label: 'GTK (Pendidik)', errCount: guruErrors.length },
                      { id: 'siswa', label: 'Peserta Didik', errCount: studentErrors.length },
                      { id: 'rombel', label: 'Rombel', errCount: classErrors.length }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveValTab(tab.id as any)}
                        className={`px-5 py-3.5 font-extrabold text-xs border-r shrink-0 transition-all flex items-center gap-2 ${
                          activeValTab === tab.id ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                        {tab.errCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full">
                            {tab.errCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {activeValTab === 'sekolah' && (
                      <div className="space-y-3">
                        <h5 className="font-extrabold text-xs text-slate-500 uppercase">Validasi Sekolah & Keuangan</h5>
                        {schoolErrors.length > 0 ? (
                          schoolErrors.map((err, idx) => (
                            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-3 text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-bold">[{err.name}]</span> {err.msg}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Seluruh data parameter sekolah & keuangan terisi dengan valid.
                          </p>
                        )}
                      </div>
                    )}

                    {activeValTab === 'sarpras' && (
                      <div className="space-y-3">
                        <h5 className="font-extrabold text-xs text-slate-500 uppercase">Validasi Sarana Prasarana & Aset</h5>
                        {sarprasErrors.length > 0 ? (
                          sarprasErrors.map((err, idx) => (
                            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-3 text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-bold">[{err.name}]</span> {err.msg}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Seluruh sarana prasarana sekolah tercatat dalam kondisi baik.
                          </p>
                        )}
                      </div>
                    )}

                    {activeValTab === 'gtk' && (
                      <div className="space-y-3">
                        <h5 className="font-extrabold text-xs text-slate-500 uppercase">Validasi Pendidik & Tenaga Kependidikan (GTK)</h5>
                        {guruErrors.length > 0 ? (
                          guruErrors.map((err, idx) => (
                            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-3 text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <div>
                                <span className="font-bold">[{err.name}]</span> {err.msg}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Seluruh data GTK terdaftar lengkap.
                          </p>
                        )}
                      </div>
                    )}

                    {activeValTab === 'siswa' && (
                      <div className="space-y-3">
                        <h5 className="font-extrabold text-xs text-slate-500 uppercase">Validasi Peserta Didik Aktif</h5>
                        {studentErrors.length > 0 ? (
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {studentErrors.map((err, idx) => (
                              <div key={idx} className={`p-3 rounded-xl flex items-center gap-3 text-xs border ${
                                err.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}>
                                <AlertCircle className={`w-4 h-4 shrink-0 ${err.type === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
                                <div>
                                  <span className="font-bold">{err.name}</span>: {err.msg}
                                </div>
                                <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  err.type === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {err.type === 'danger' ? 'INVALID' : 'WARNING'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Seluruh data peserta didik aktif telah lolos verifikasi validitas Dapodik.
                          </p>
                        )}
                      </div>
                    )}

                    {activeValTab === 'rombel' && (
                      <div className="space-y-3">
                        <h5 className="font-extrabold text-xs text-slate-500 uppercase">Validasi Rombongan Belajar (Kelas)</h5>
                        {classErrors.length > 0 ? (
                          classErrors.map((err, idx) => (
                            <div key={idx} className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs">
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              <div>
                                <span className="font-bold">[{err.name}]</span> {err.msg}
                              </div>
                              <span className="ml-auto px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded uppercase">
                                INVALID
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Seluruh rombongan belajar terisi dengan legal & valid.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Pagination (Sisko style) */}
        {subTab === 'siswa' && (
          <div className="p-4 border-t bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-slate-500">
              Menampilkan {filteredSiswa.length === 0 ? 0 : (page - 1) * limit + 1} s.d {Math.min(page * limit, filteredSiswa.length)} dari {filteredSiswa.length} data
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border rounded-xl hover:bg-slate-50 disabled:opacity-50 transition font-bold"
              >
                Sebelumnya
              </button>
              <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
                Halaman {page} dari {totalPages || 1}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border rounded-xl hover:bg-slate-50 disabled:opacity-50 transition font-bold"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {subTab === 'guru' && (
          <div className="p-4 border-t bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-slate-500">
              Menampilkan {filteredGuru.length === 0 ? 0 : (page - 1) * limit + 1} s.d {Math.min(page * limit, filteredGuru.length)} dari {filteredGuru.length} data
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border rounded-xl hover:bg-slate-50 disabled:opacity-50 transition font-bold"
              >
                Sebelumnya
              </button>
              <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
                Halaman {page} dari {totalPagesGuru || 1}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPagesGuru, p + 1))}
                disabled={page >= totalPagesGuru}
                className="px-3 py-1.5 bg-white border rounded-xl hover:bg-slate-50 disabled:opacity-50 transition font-bold"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL GURU MODAL */}
      {selectedDetailGuru && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex justify-between items-start shrink-0">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-white rounded-3xl overflow-hidden flex items-center justify-center shadow-inner border border-white/30 shrink-0">
                  {selectedDetailGuru.fotoUrl ? (
                    <img src={selectedDetailGuru.fotoUrl} alt={selectedDetailGuru.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <img 
                      src={selectedDetailGuru.jk === 'P'
                        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                      } 
                      alt={selectedDetailGuru.nama} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">{selectedDetailGuru.nama}</h3>
                  <p className="opacity-90 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span>GuruID: <b>{selectedDetailGuru.id}</b></span>
                    {selectedDetailGuru.nip && <span>NIP: <b>{selectedDetailGuru.nip}</b></span>}
                    <span className="bg-white/25 px-2.5 py-0.5 rounded text-xs font-bold uppercase">{selectedDetailGuru.status || 'AKTIF'}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailGuru(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Content Body */}
            <div className="p-8 overflow-y-auto space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Kepegawaian & Pengajaran */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">1. Profil Akademik & Pengajaran</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Mata Pelajaran Utama</span>
                      <span className="text-sm font-extrabold text-blue-700">{selectedDetailGuru.mapel || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Kelas Ajar</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedDetailGuru.kelasAjar ? `Kelas ${selectedDetailGuru.kelasAjar}` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Jurusan Ajar</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedDetailGuru.jurusanAjar || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">NIP</span>
                      <span className="text-sm font-mono font-extrabold text-slate-800">{selectedDetailGuru.nip || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Profil Pribadi */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">2. Informasi Pribadi & Identitas</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Jenis Kelamin</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedDetailGuru.jk === 'P' ? 'Perempuan' : 'Laki-laki'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">NIK (KTP)</span>
                      <span className="text-sm font-mono font-extrabold text-slate-800">{selectedDetailGuru.nik || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tempat Lahir</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedDetailGuru.tempatLahir || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tanggal Lahir</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedDetailGuru.tglLahir || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Hubungan & Kontak */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4 md:col-span-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">3. Informasi Kontak & Log Sistem</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Nomor Telepon / HP</span>
                      <span className="text-sm font-mono font-extrabold text-slate-800">{selectedDetailGuru.noHp || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">E-Mail</span>
                      <span className="text-sm font-mono font-extrabold text-slate-800">{selectedDetailGuru.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Terdaftar Pada</span>
                      <span className="text-xs font-semibold text-slate-500">{selectedDetailGuru.createdAt ? new Date(selectedDetailGuru.createdAt).toLocaleString('id-ID') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Terakhir Diperbarui</span>
                      <span className="text-xs font-semibold text-slate-500">{selectedDetailGuru.updatedAt ? new Date(selectedDetailGuru.updatedAt).toLocaleString('id-ID') : '-'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0 rounded-b-[2.5rem]">
              <button 
                onClick={() => setSelectedDetailGuru(null)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM INPUT GURU (TAMBAH / EDIT MODAL) */}
      {isGuruModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-extrabold">{editingGuru ? '✏️ Edit Biodata Pokok Guru' : '➕ Tambah Data Guru Baru'}</h3>
                <p className="text-xs opacity-85 mt-0.5">Lengkapi data pokok kepegawaian tenaga pendidik di bawah ini.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsGuruModalOpen(false)} 
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black transition text-white"
              >
                &times; Tutup
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleGuruSubmit} className="flex flex-col overflow-hidden grow">
              <div className="p-8 overflow-y-auto space-y-6">
                
                {/* Section 1: Identitas Kepegawaian */}
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">1. Profil Utama & Identitas Kepegawaian</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Data wajib divalidasi oleh dinas pendidikan dan tata usaha sekolah</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nama Lengkap Guru <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={guruForm.nama || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, nama: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Nama Lengkap beserta gelar akademik" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                      <select 
                        value={guruForm.jk || 'L'} 
                        onChange={(e) => setGuruForm({ ...guruForm, jk: e.target.value as 'L' | 'P' })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">NIP (Nomor Induk Pegawai)</label>
                      <input 
                        type="text" 
                        value={guruForm.nip || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, nip: e.target.value })} 
                        className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Contoh: 198503102011011002" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">NIK (Nomor Induk Kependudukan)</label>
                      <input 
                        type="text" 
                        maxLength={16} 
                        value={guruForm.nik || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, nik: e.target.value })} 
                        className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Wajib 16 digit angka" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Status Aktif <span className="text-red-500">*</span></label>
                      <select 
                        value={guruForm.status || 'AKTIF'} 
                        onChange={(e) => setGuruForm({ ...guruForm, status: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none"
                      >
                        <option value="AKTIF">Aktif Mengajar</option>
                        <option value="TIDAK AKTIF">Tidak Aktif / Cuti</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Tempat Tanggal Lahir & Kontak */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="border-l-4 border-emerald-500 pl-3">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">2. Tempat Lahir & Kontak</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Informasi kependudukan and sarana komunikasi dinas</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tempat Lahir</label>
                      <input 
                        type="text" 
                        value={guruForm.tempatLahir || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, tempatLahir: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Kota Lahir" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tanggal Lahir (DD/MM/YYYY)</label>
                      <input 
                        type="text" 
                        value={guruForm.tglLahir || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, tglLahir: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Format: DD/MM/YYYY" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">No. Telepon / HP</label>
                      <input 
                        type="text" 
                        value={guruForm.noHp || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, noHp: e.target.value })} 
                        className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Contoh: 08123456789" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Alamat Email Resmi</label>
                      <input 
                        type="email" 
                        value={guruForm.email || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, email: e.target.value })} 
                        className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="email@sekolah.sch.id" 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Bidang Ajar & Foto */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="border-l-4 border-purple-500 pl-3">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">3. Mata Pelajaran, Bidang Ajar & Media</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Penugasan pengajaran mata pelajaran kurikulum merdeka</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Mata Pelajaran Utama</label>
                      <select 
                        value={guruForm.mapel || 'Fisika'} 
                        onChange={(e) => setGuruForm({ ...guruForm, mapel: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none"
                      >
                        <option value="Fisika">Fisika</option>
                        <option value="Kimia">Kimia</option>
                        <option value="Biologi">Biologi</option>
                        <option value="Matematika">Matematika</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Sejarah">Sejarah</option>
                        <option value="Pendidikan Agama">Pendidikan Agama</option>
                        <option value="Penjasorkes">Penjasorkes</option>
                        <option value="Seni Budaya">Seni Budaya</option>
                        <option value="Informatika">Informatika</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Kelas Binaan / Ajar</label>
                      <input 
                        type="text" 
                        value={guruForm.kelasAjar || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, kelasAjar: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Contoh: 12" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Jurusan Ajar</label>
                      <input 
                        type="text" 
                        value={guruForm.jurusanAjar || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, jurusanAjar: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Contoh: IPA 1" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">URL Foto Profil Guru</label>
                      <input 
                        type="text" 
                        value={guruForm.fotoUrl || ''} 
                        onChange={(e) => setGuruForm({ ...guruForm, fotoUrl: e.target.value })} 
                        className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="https://images.unsplash.com/..." 
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsGuruModalOpen(false)} 
                  className="px-6 py-2.5 rounded-xl border text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  💾 Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (SISKO CRM STYLE) */}
      {selectedDetailSiswa && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-start shrink-0">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-white rounded-3xl overflow-hidden flex items-center justify-center shadow-inner border border-white/30 shrink-0">
                  {selectedDetailSiswa.fotoUrl ? (
                    <img src={selectedDetailSiswa.fotoUrl} alt={selectedDetailSiswa.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <img 
                      src={selectedDetailSiswa.jk === 'P'
                        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                      } 
                      alt={selectedDetailSiswa.nama} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">{selectedDetailSiswa.nama}</h3>
                  <p className="opacity-90 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span>No. PDKT: <b>{selectedDetailSiswa.noPdkt || '-'}</b></span>
                    <span>NISN: <b>{selectedDetailSiswa.nisn}</b></span>
                    <span className="bg-white/25 px-2.5 py-0.5 rounded text-xs font-bold uppercase">{selectedDetailSiswa.status}</span>
                    <span className="bg-blue-500 text-white border border-blue-400 px-2.5 py-0.5 rounded text-xs font-bold">
                      {kelasList.find(k => k.id === selectedDetailSiswa.kelasId)?.nama || selectedDetailSiswa.kelasId}
                    </span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailSiswa(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-white"
              >
                &times;
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-8 overflow-y-auto space-y-8 text-xs flex-1">
              {/* Grid 1: Akademik & Diri */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-blue-600 text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>📖</span> INFORMASI AKADEMIK & DATA DIRI
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Tahun Masuk</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.tahunMasuk || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Jenis Kelamin</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Tempat / Tanggal Lahir</span>
                    <span className="font-bold text-slate-800">
                      {selectedDetailSiswa.tempatLahir ? `${selectedDetailSiswa.tempatLahir}, ` : ''}{selectedDetailSiswa.tglLahir}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">NIK Siswa</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.nik || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Anak Ke / Jumlah Saudara</span>
                    <span className="font-bold text-slate-800">
                      Anak ke-{selectedDetailSiswa.anakKe || '-'} dari {selectedDetailSiswa.saudara || '-'} bersaudara
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Agama</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.agama || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Golongan Darah</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.golonganDarah || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Tinggi & Berat Badan</span>
                    <span className="font-bold text-slate-800">
                      {selectedDetailSiswa.tinggiBadan ? `${selectedDetailSiswa.tinggiBadan} cm` : '-'} / {selectedDetailSiswa.beratBadan ? `${selectedDetailSiswa.beratBadan} kg` : '-'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">No. HP Aktif</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.noHp || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Email Kontak</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.email || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Asal Sekolah</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.asalSekolah || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Nomor SKHUN</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.skhun || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Alamat & Tempat Tinggal */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-blue-600 text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>🏠</span> ALAMAT & TEMPAT TINGGAL
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border md:col-span-2">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Alamat Jalan Lengkap</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.alamat || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">RT / RW</span>
                    <span className="font-bold text-slate-800">RT {selectedDetailSiswa.rt || '-'} / RW {selectedDetailSiswa.rw || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Kode Pos</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.kodePos || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Kelurahan / Desa</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.kelurahan || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Kecamatan</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.kecamatan || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Kota / Kabupaten</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.kota || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Provinsi</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.provinsi || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Jenis Tempat Tinggal</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.jenisTinggal || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[9px]">Alat Transportasi</span>
                    <span className="font-bold text-slate-800">{selectedDetailSiswa.alatTransportasi || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Orang Tua & Wali */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-blue-600 text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>👥</span> ORANG TUA & WALI SISWA
                </h4>
                
                {/* Ayah & Ibu Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ayah */}
                  <div className="p-4 bg-slate-50/50 rounded-2xl border space-y-3">
                    <h5 className="font-extrabold text-blue-700 text-xs border-b pb-1.5 flex items-center gap-1">
                      <span>🧔</span> Data Kandung Ayah
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Nama Lengkap</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.namaAyah || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">NIK Ayah</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.nikAyah || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Lahir</span>
                        <span className="font-bold text-slate-800">
                          {selectedDetailSiswa.tempatLahirAyah ? `${selectedDetailSiswa.tempatLahirAyah}, ` : ''}{selectedDetailSiswa.tglLahirAyah || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pendidikan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pendidikanAyah || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pekerjaan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pekerjaanAyah || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Penghasilan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.penghasilanAyah || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Telepon Ayah</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.tlpAyah || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ibu */}
                  <div className="p-4 bg-slate-50/50 rounded-2xl border space-y-3">
                    <h5 className="font-extrabold text-blue-700 text-xs border-b pb-1.5 flex items-center gap-1">
                      <span>👩</span> Data Kandung Ibu
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Nama Lengkap</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.namaIbu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">NIK Ibu</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.nikIbu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Lahir</span>
                        <span className="font-bold text-slate-800">
                          {selectedDetailSiswa.tempatLahirIbu ? `${selectedDetailSiswa.tempatLahirIbu}, ` : ''}{selectedDetailSiswa.tglLahirIbu || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pendidikan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pendidikanIbu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pekerjaan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pekerjaanIbu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Penghasilan</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.penghasilanIbu || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Telepon Ibu</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.tlpIbu || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wali (Jika ada) */}
                  <div className="p-4 bg-slate-50/50 rounded-2xl border space-y-3 md:col-span-2">
                    <h5 className="font-extrabold text-blue-700 text-xs border-b pb-1.5 flex items-center gap-1">
                      <span>🤝</span> Wali Siswa & Kontak Pengganti
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Nama Wali</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.namaWali || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Hubungan Wali</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.hubunganWali || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Telepon Wali</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.tlpWali || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Lahir Wali</span>
                        <span className="font-bold text-slate-800">
                          {selectedDetailSiswa.tempatLahirWali ? `${selectedDetailSiswa.tempatLahirWali}, ` : ''}{selectedDetailSiswa.tglLahirWali || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pendidikan Wali</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pendidikanWali || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Pekerjaan Wali</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.pekerjaanWali || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block uppercase font-bold text-[8px]">Penghasilan Wali</span>
                        <span className="font-bold text-slate-800">{selectedDetailSiswa.penghasilanWali || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 4: Berkas & Dokumen Pendukung */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-blue-600 text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>📂</span> KELENGKAPAN ADMINISTRASI & BERKAS FISIK
                </h4>
                <div className="p-5 bg-slate-50 rounded-3xl border space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[8px] mb-0.5">Penerima KPS</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedDetailSiswa.penerimaKps === 'Ya' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {selectedDetailSiswa.penerimaKps || 'Tidak'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[8px] mb-0.5">Nomor KPS</span>
                      <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.noKps || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[8px] mb-0.5">Nomor KK</span>
                      <span className="font-bold text-slate-800 font-mono">{selectedDetailSiswa.noKk || '-'}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Status Berkas</span>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Akta Kelahiran', val: selectedDetailSiswa.berkasAkta },
                        { label: 'Kartu Keluarga', val: selectedDetailSiswa.berkasKk },
                        { label: 'KTP / KIA Siswa', val: selectedDetailSiswa.berkasKtpKia },
                        { label: 'KTP Ayah', val: selectedDetailSiswa.berkasKtpAyah },
                        { label: 'KTP Ibu', val: selectedDetailSiswa.berkasKtpIbu },
                        { label: 'Ijazah Kelulusan', val: selectedDetailSiswa.berkasIjazah },
                        { label: 'KTP Wali', val: selectedDetailSiswa.berkasKtpWali },
                        { label: 'Rapor Terakhir', val: selectedDetailSiswa.berkasRapor },
                        { label: 'Surat Pindah', val: selectedDetailSiswa.berkasSuratPindah },
                        { label: 'Surat Domisili', val: selectedDetailSiswa.berkasDomisili },
                      ].map((doc, idx) => (
                        <div key={idx} className="p-2.5 bg-white border rounded-xl flex flex-col justify-between">
                          <span className="font-bold text-slate-500 text-[9px] mb-1 leading-tight">{doc.label}</span>
                          <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded text-center ${
                            doc.val === 'Lengkap' ? 'bg-emerald-50 text-emerald-600' :
                            doc.val === 'Tidak Lengkap' ? 'bg-rose-50 text-rose-600' :
                            doc.val === 'Tidak Wajib' ? 'bg-slate-100 text-slate-400' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {doc.val || 'Belum Mengumpulkan'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
                    <div className="p-3 bg-white border rounded-2xl">
                      <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[8px]">Prestasi</span>
                      <span className="font-semibold text-slate-800">{selectedDetailSiswa.prestasi || '-'}</span>
                    </div>
                    <div className="p-3 bg-white border rounded-2xl">
                      <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[8px]">Hobi</span>
                      <span className="font-semibold text-slate-800">{selectedDetailSiswa.hobi || '-'}</span>
                    </div>
                    <div className="p-3 bg-white border rounded-2xl">
                      <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[8px]">Catatan Penting</span>
                      <span className="font-semibold text-slate-800 text-rose-600">{selectedDetailSiswa.catatanPenting || '-'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border rounded-2xl col-span-3">
                    <span className="text-slate-400 block mb-1 uppercase tracking-wider font-bold text-[8px]">Catatan Berkas Terdaftar</span>
                    <p className="font-semibold text-slate-700">{selectedDetailSiswa.catatanBerkas || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Grid 5: Riwayat Akademis & Kenaikan Kelas */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-blue-600 text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>📈</span> RIWAYAT KENAIKAN KELAS & TRANSISI AKADEMIS (LOGIKA CERDAS)
                </h4>
                {selectedDetailSiswa.riwayatAkademis && selectedDetailSiswa.riwayatAkademis.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-blue-100 ml-4 space-y-6">
                    {selectedDetailSiswa.riwayatAkademis.map((history, hIdx) => (
                      <div key={hIdx} className="relative">
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-sm" />
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2 hover:bg-slate-50 hover:shadow-sm transition">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <span className="font-black text-xs text-blue-950 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              Tahun Ajaran {history.tahunAjaran}
                            </span>
                            <div className="flex gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700">
                                Kelas {history.kelasId}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                history.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {history.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">Keterangan Transisi:</span>
                            <span className={`font-black text-[11px] px-2.5 py-0.5 rounded-full ${
                              history.keterangan?.includes('Naik') || history.keterangan?.includes('Lulus') || history.keterangan?.includes('Aktif')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              🌟 {history.keterangan || 'Aktif'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed rounded-3xl text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">
                    KOSONG
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
              <button 
                onClick={() => {
                  const s = selectedDetailSiswa;
                  setSelectedDetailSiswa(null);
                  openEditSiswaModal(s);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                ✏️ Edit Biodata
              </button>
              <button 
                onClick={() => setSelectedDetailSiswa(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                Tutup Biodata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SISWA ADD/EDIT MODAL (COMPREHENSIVE TABBED LAYOUT) */}
      {isSiswaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col max-h-[92vh] animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-50 border-b p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 text-base">
                  {editingSiswa ? `Edit Biodata: ${siswaForm.nama || ''}` : 'Tambah Siswa Baru'}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Lengkapi 71 indikator data pokok pendidikan sesuai model excel rombel</p>
              </div>
              <button 
                onClick={() => setIsSiswaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none p-2 rounded-xl transition"
              >
                &times;
              </button>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex bg-slate-100 border-b p-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
              {[
                { id: 'akademik', label: '📖 Akademik & Diri' },
                { id: 'alamat', label: '🏠 Alamat & Transportasi' },
                { id: 'ortu', label: '👥 Orang Tua / Wali' },
                { id: 'berkas', label: '📂 Berkas & Dokumen' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFormModalTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition shrink-0 ${
                    formModalTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Fields container */}
            <form onSubmit={handleSiswaSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Tab 1: Akademik & Diri */}
                {formModalTab === 'akademik' && (
                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-black text-slate-800 text-xs">Informasi Akademik & Data Dasar</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Data wajib pokok pendaftaran sekolah</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tahun Masuk <span className="text-red-500">*</span></label>
                        <input required type="number" min={2000} max={2100} value={siswaForm.tahunMasuk || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tahunMasuk: Number(e.target.value) })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Contoh: 2026" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">No. PDKT / Registrasi</label>
                        <input type="text" value={siswaForm.noPdkt || ''} onChange={(e) => setSiswaForm({ ...siswaForm, noPdkt: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kombinasi huruf/angka" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">NISN (10 Digit) <span className="text-red-500">*</span></label>
                        <input required type="text" maxLength={10} value={siswaForm.nisn || ''} onChange={(e) => setSiswaForm({ ...siswaForm, nisn: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Wajib 10 digit angka" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nama Lengkap Siswa <span className="text-red-500">*</span></label>
                        <input required type="text" value={siswaForm.nama || ''} onChange={(e) => setSiswaForm({ ...siswaForm, nama: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama lengkap tanpa gelar" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                        <select required value={siswaForm.jk || 'L'} onChange={(e) => setSiswaForm({ ...siswaForm, jk: e.target.value as any })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tempat Lahir</label>
                        <input type="text" value={siswaForm.tempatLahir || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tempatLahir: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kota/Kabupaten lahir" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tanggal Lahir <span className="text-red-500">*</span></label>
                        <input required type="date" value={siswaForm.tglLahir || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tglLahir: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">NIK Siswa (16 Digit)</label>
                        <input type="text" maxLength={16} value={siswaForm.nik || ''} onChange={(e) => setSiswaForm({ ...siswaForm, nik: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Wajib 16 digit angka" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Anak Ke</label>
                        <input type="number" value={siswaForm.anakKe || ''} onChange={(e) => setSiswaForm({ ...siswaForm, anakKe: Number(e.target.value) })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Anak ke-" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Jumlah Saudara</label>
                        <input type="number" value={siswaForm.saudara || ''} onChange={(e) => setSiswaForm({ ...siswaForm, saudara: Number(e.target.value) })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Total saudara kandung" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Agama</label>
                        <select value={siswaForm.agama || 'Islam'} onChange={(e) => setSiswaForm({ ...siswaForm, agama: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Khonghucu">Khonghucu</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Golongan Darah</label>
                        <select value={siswaForm.golonganDarah || 'Tidak Tahu'} onChange={(e) => setSiswaForm({ ...siswaForm, golonganDarah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="AB">AB</option>
                          <option value="O">O</option>
                          <option value="Tidak Tahu">Tidak Tahu</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Tinggi Badan (cm)</label>
                        <input type="number" value={siswaForm.tinggiBadan || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tinggiBadan: Number(e.target.value) })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka saja" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Berat Badan (kg)</label>
                        <input type="number" value={siswaForm.beratBadan || ''} onChange={(e) => setSiswaForm({ ...siswaForm, beratBadan: Number(e.target.value) })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka saja" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nomor HP Aktif <span className="text-red-500">*</span></label>
                        <input type="tel" value={siswaForm.noHp || ''} onChange={(e) => setSiswaForm({ ...siswaForm, noHp: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="08xxxxxxxx" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Email Kontak</label>
                        <input type="email" value={siswaForm.email || ''} onChange={(e) => setSiswaForm({ ...siswaForm, email: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Contoh: siswa@email.com" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Asal Sekolah (SMP/MTs)</label>
                        <input type="text" value={siswaForm.asalSekolah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, asalSekolah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama sekolah asal" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nomor Seri SKHUN</label>
                        <input type="text" value={siswaForm.skhun || ''} onChange={(e) => setSiswaForm({ ...siswaForm, skhun: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="SKHUN pendaftar" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Pas Foto Asli Siswa (Unggah Berkas / Link Gambar)</label>
                        <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border">
                          {siswaForm.fotoUrl && siswaForm.fotoUrl.trim() !== '' ? (
                            <img src={siswaForm.fotoUrl} alt="Pas Foto Siswa" className="w-12 h-14 object-cover rounded-xl border-2 border-blue-500 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-12 h-14 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-[9px] font-bold shrink-0 text-center leading-tight">
                              Belum Ada Foto
                            </div>
                          )}
                          <div className="flex-1 space-y-1.5">
                            <input type="text" value={siswaForm.fotoUrl || ''} onChange={(e) => setSiswaForm({ ...siswaForm, fotoUrl: e.target.value })} className="w-full text-xs font-mono font-bold border bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="https://... atau klik Unggah Berkas di sebelah" />
                            <label className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition shadow-sm">
                              <span>📸</span> Unggah Foto Asli Dari HP/Komputer
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      Swal.fire('Ukuran Terlalu Besar', 'Gunakan foto berukuran di bawah 2MB.', 'warning');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setSiswaForm({ ...siswaForm, fotoUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Status Rombel <span className="text-red-500">*</span></label>
                        <select required value={siswaForm.status || 'AKTIF'} onChange={(e) => setSiswaForm({ ...siswaForm, status: e.target.value as any })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="AKTIF">AKTIF (Aktif Dapodik & Belajar)</option>
                          <option value="TIDAK AKTIF">TIDAK AKTIF (Aktif Dapodik, Tidak Aktif Belajar)</option>
                          <option value="BELUM">BELUM (Tidak Aktif Dapodik, Aktif Belajar)</option>
                          <option value="PINDAH">PINDAH (Pindah Sekolah)</option>
                          <option value="LULUS">LULUS (Sudah Lulus / Alumni)</option>
                          <option value="KELUAR">KELUAR (Keluar tanpa keterangan)</option>
                        </select>
                        <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed font-medium">
                          <div className="font-bold text-slate-700 uppercase mb-1.5 text-[9px] tracking-wider">Pedoman Status Rombel:</div>
                          <ul className="space-y-1">
                            <li className="flex items-start gap-1.5"><span className="text-emerald-500 font-bold">● AKTIF</span>: Aktif Dapodik dan Aktif Belajar</li>
                            <li className="flex items-start gap-1.5"><span className="text-amber-500 font-bold">● TIDAK AKTIF</span>: Aktif Dapodik tapi Tidak Aktif Belajar</li>
                            <li className="flex items-start gap-1.5"><span className="text-sky-500 font-bold">● BELUM</span>: Tidak Aktif Dapodik tapi Aktif Belajar</li>
                            <li className="flex items-start gap-1.5"><span className="text-purple-500 font-bold">● PINDAH</span>: Pindah ke sekolah lain</li>
                            <li className="flex items-start gap-1.5"><span className="text-rose-500 font-bold">● KELUAR</span>: Keluar tanpa keterangan</li>
                            <li className="flex items-start gap-1.5"><span className="text-indigo-500 font-bold">● LULUS</span>: Sudah lulus (Alumni)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Alamat & Transport */}
                {formModalTab === 'alamat' && (
                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-black text-slate-800 text-xs">Alamat & Lokasi Tempat Tinggal</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Lengkapi koordinat wilayah kependudukan</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Alamat Lengkap (Jalan, Dusun, RT/RW)</label>
                        <textarea rows={2} value={siswaForm.alamat || ''} onChange={(e) => setSiswaForm({ ...siswaForm, alamat: e.target.value })} className="w-full text-xs font-semibold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Jl. Raya No. 10..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">RT (Maks 3 digit)</label>
                        <input type="text" maxLength={3} value={siswaForm.rt || ''} onChange={(e) => setSiswaForm({ ...siswaForm, rt: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka RT" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">RW (Maks 3 digit)</label>
                        <input type="text" maxLength={3} value={siswaForm.rw || ''} onChange={(e) => setSiswaForm({ ...siswaForm, rw: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka RW" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Kode Pos (5 Digit)</label>
                        <input type="text" maxLength={5} value={siswaForm.kodePos || ''} onChange={(e) => setSiswaForm({ ...siswaForm, kodePos: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Contoh: 12345" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Kelurahan / Desa</label>
                        <input type="text" value={siswaForm.kelurahan || ''} onChange={(e) => setSiswaForm({ ...siswaForm, kelurahan: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Kelurahan" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Kecamatan</label>
                        <input type="text" value={siswaForm.kecamatan || ''} onChange={(e) => setSiswaForm({ ...siswaForm, kecamatan: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Kecamatan" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Kota / Kabupaten</label>
                        <input type="text" value={siswaForm.kota || ''} onChange={(e) => setSiswaForm({ ...siswaForm, kota: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Kota/Kabupaten" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Provinsi</label>
                        <input type="text" value={siswaForm.provinsi || ''} onChange={(e) => setSiswaForm({ ...siswaForm, provinsi: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Provinsi" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Jenis Tinggal</label>
                        <select value={siswaForm.jenisTinggal || 'Bersama Orang Tua'} onChange={(e) => setSiswaForm({ ...siswaForm, jenisTinggal: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                          <option value="Wali">Wali</option>
                          <option value="Kos">Kos</option>
                          <option value="Asrama">Asrama</option>
                          <option value="Panti Asuhan">Panti Asuhan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Alat Transportasi</label>
                        <select value={siswaForm.alatTransportasi || 'Jalan Kaki'} onChange={(e) => setSiswaForm({ ...siswaForm, alatTransportasi: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="Jalan Kaki">Jalan Kaki</option>
                          <option value="Sepeda">Sepeda</option>
                          <option value="Sepeda Motor">Sepeda Motor</option>
                          <option value="Mobil Pribadi">Mobil Pribadi</option>
                          <option value="Angkutan Umum">Angkutan Umum</option>
                          <option value="Ojek Online">Ojek Online</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Orang Tua / Wali */}
                {formModalTab === 'ortu' && (
                  <div className="space-y-8">
                    {/* AYAH */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-3">
                        <h4 className="font-black text-slate-800 text-xs">A. Identitas Kandung Ayah</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Indikator data pokok ayah</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Ayah</label>
                          <input type="text" value={siswaForm.namaAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, namaAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Lengkap Ayah" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">NIK Ayah (16 Digit)</label>
                          <input type="text" maxLength={16} value={siswaForm.nikAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, nikAyah: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="16 digit angka" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tempat Lahir Ayah</label>
                          <input type="text" value={siswaForm.tempatLahirAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tempatLahirAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kota lahir" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tanggal Lahir Ayah</label>
                          <input type="date" value={siswaForm.tglLahirAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tglLahirAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pendidikan Ayah</label>
                          <select value={siswaForm.pendidikanAyah || 'SMA/SMK'} onChange={(e) => setSiswaForm({ ...siswaForm, pendidikanAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Sekolah">Tidak Sekolah</option>
                            <option value="SD">SD</option>
                            <option value="SMP">SMP</option>
                            <option value="SMA/SMK">SMA/SMK</option>
                            <option value="D1/D2/D3">D1/D2/D3</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pekerjaan Ayah (Bisa Ketik Manual)</label>
                          <input type="text" list="pekerjaan-options" value={siswaForm.pekerjaanAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, pekerjaanAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Pilih / ketik manual" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Penghasilan Ayah</label>
                          <select value={siswaForm.penghasilanAyah || 'Rp 1 - 3 Juta'} onChange={(e) => setSiswaForm({ ...siswaForm, penghasilanAyah: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                            <option value="< Rp 1 Juta">&lt; Rp 1 Juta</option>
                            <option value="Rp 1 - 3 Juta">Rp 1 - 3 Juta</option>
                            <option value="Rp 3 - 5 Juta">Rp 3 - 5 Juta</option>
                            <option value="Rp 5 - 10 Juta">Rp 5 - 10 Juta</option>
                            <option value="> Rp 10 Juta">&gt; Rp 10 Juta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">No. Tlp / HP Ayah</label>
                          <input type="text" value={siswaForm.tlpAyah || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tlpAyah: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka saja" />
                        </div>
                      </div>
                    </div>

                    {/* IBU */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="border-l-4 border-blue-500 pl-3">
                        <h4 className="font-black text-slate-800 text-xs">B. Identitas Kandung Ibu</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Indikator data pokok ibu</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Ibu</label>
                          <input type="text" value={siswaForm.namaIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, namaIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Lengkap Ibu" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">NIK Ibu (16 Digit)</label>
                          <input type="text" maxLength={16} value={siswaForm.nikIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, nikIbu: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="16 digit angka" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tempat Lahir Ibu</label>
                          <input type="text" value={siswaForm.tempatLahirIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tempatLahirIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kota lahir" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tanggal Lahir Ibu</label>
                          <input type="date" value={siswaForm.tglLahirIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tglLahirIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pendidikan Ibu</label>
                          <select value={siswaForm.pendidikanIbu || 'SMA/SMK'} onChange={(e) => setSiswaForm({ ...siswaForm, pendidikanIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Sekolah">Tidak Sekolah</option>
                            <option value="SD">SD</option>
                            <option value="SMP">SMP</option>
                            <option value="SMA/SMK">SMA/SMK</option>
                            <option value="D1/D2/D3">D1/D2/D3</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pekerjaan Ibu (Bisa Ketik Manual)</label>
                          <input type="text" list="pekerjaan-options" value={siswaForm.pekerjaanIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, pekerjaanIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Pilih / ketik manual" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Penghasilan Ibu</label>
                          <select value={siswaForm.penghasilanIbu || 'Tidak Berpenghasilan'} onChange={(e) => setSiswaForm({ ...siswaForm, penghasilanIbu: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                            <option value="< Rp 1 Juta">&lt; Rp 1 Juta</option>
                            <option value="Rp 1 - 3 Juta">Rp 1 - 3 Juta</option>
                            <option value="Rp 3 - 5 Juta">Rp 3 - 5 Juta</option>
                            <option value="Rp 5 - 10 Juta">Rp 5 - 10 Juta</option>
                            <option value="> Rp 10 Juta">&gt; Rp 10 Juta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">No. Tlp / HP Ibu</label>
                          <input type="text" value={siswaForm.tlpIbu || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tlpIbu: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka saja" />
                        </div>
                      </div>
                    </div>

                    {/* WALI */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="border-l-4 border-blue-500 pl-3">
                        <h4 className="font-black text-slate-800 text-xs">C. Identitas Wali (Kontak Alternatif)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Kontak pengganti jika orang tua berhalangan</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Wali</label>
                          <input type="text" value={siswaForm.namaWali || ''} onChange={(e) => setSiswaForm({ ...siswaForm, namaWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nama Lengkap Wali" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Hubungan Wali</label>
                          <select value={siswaForm.hubunganWali || 'Lainnya'} onChange={(e) => setSiswaForm({ ...siswaForm, hubunganWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Kakek/Nenek">Kakek/Nenek</option>
                            <option value="Paman/Bibi">Paman/Bibi</option>
                            <option value="Kakak Kandung">Kakak Kandung</option>
                            <option value="Orang Tua Angkat">Orang Tua Angkat</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tempat Lahir Wali</label>
                          <input type="text" value={siswaForm.tempatLahirWali || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tempatLahirWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kota lahir" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tanggal Lahir Wali</label>
                          <input type="date" value={siswaForm.tglLahirWali || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tglLahirWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pendidikan Wali</label>
                          <select value={siswaForm.pendidikanWali || 'SMA/SMK'} onChange={(e) => setSiswaForm({ ...siswaForm, pendidikanWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Sekolah">Tidak Sekolah</option>
                            <option value="SD">SD</option>
                            <option value="SMP">SMP</option>
                            <option value="SMA/SMK">SMA/SMK</option>
                            <option value="D1/D2/D3">D1/D2/D3</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pekerjaan Wali (Bisa Ketik Manual)</label>
                          <input type="text" list="pekerjaan-options" value={siswaForm.pekerjaanWali || ''} onChange={(e) => setSiswaForm({ ...siswaForm, pekerjaanWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Pilih / ketik manual" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Penghasilan Wali</label>
                          <select value={siswaForm.penghasilanWali || 'Tidak Berpenghasilan'} onChange={(e) => setSiswaForm({ ...siswaForm, penghasilanWali: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                            <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                            <option value="< Rp 1 Juta">&lt; Rp 1 Juta</option>
                            <option value="Rp 1 - 3 Juta">Rp 1 - 3 Juta</option>
                            <option value="Rp 3 - 5 Juta">Rp 3 - 5 Juta</option>
                            <option value="Rp 5 - 10 Juta">Rp 5 - 10 Juta</option>
                            <option value="> Rp 10 Juta">&gt; Rp 10 Juta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">No. Tlp / HP Wali</label>
                          <input type="text" value={siswaForm.tlpWali || ''} onChange={(e) => setSiswaForm({ ...siswaForm, tlpWali: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Angka saja" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Berkas & Dokumen */}
                {formModalTab === 'berkas' && (
                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-black text-slate-800 text-xs">Kelengkapan Administrasi Rombel</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pilih status verifikasi fisik untuk data arsip tata usaha</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Penerima KPS</label>
                        <select value={siswaForm.penerimaKps || 'Tidak'} onChange={(e) => setSiswaForm({ ...siswaForm, penerimaKps: e.target.value as any })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none">
                          <option value="Tidak">Tidak</option>
                          <option value="Ya">Ya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nomor KPS (Jika ada)</label>
                        <input type="text" value={siswaForm.noKps || ''} onChange={(e) => setSiswaForm({ ...siswaForm, noKps: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="No. KPS / KIP" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Nomor Kartu Keluarga (16 digit) <span className="text-red-500">*</span></label>
                        <input type="text" maxLength={16} value={siswaForm.noKk || ''} onChange={(e) => setSiswaForm({ ...siswaForm, noKk: e.target.value })} className="w-full text-xs font-mono font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Wajib 16 digit angka" />
                      </div>
                    </div>

                    {/* Status Dokumen */}
                    <div className="border-t pt-4 space-y-4">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Kelengkapan Dokumen Fisik</span>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                          { field: 'berkasAkta', label: 'Akta Kelahiran' },
                          { field: 'berkasKk', label: 'Kartu Keluarga' },
                          { field: 'berkasKtpKia', label: 'KTP / KIA Siswa' },
                          { field: 'berkasKtpAyah', label: 'KTP Ayah' },
                          { field: 'berkasKtpIbu', label: 'KTP Ibu' },
                          { field: 'berkasIjazah', label: 'Ijazah Kelulusan' },
                          { field: 'berkasKtpWali', label: 'KTP Wali' },
                          { field: 'berkasRapor', label: 'Buku Rapor' },
                          { field: 'berkasSuratPindah', label: 'Surat Keterangan Pindah' },
                          { field: 'berkasDomisili', label: 'Surat Keterangan Domisili' },
                        ].map((doc) => (
                          <div key={doc.field}>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{doc.label}</label>
                            <select value={(siswaForm as any)[doc.field] || 'Belum Mengumpulkan'} onChange={(e) => setSiswaForm({ ...siswaForm, [doc.field]: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none">
                              <option value="Lengkap">Lengkap</option>
                              <option value="Tidak Lengkap">Tidak Lengkap</option>
                              <option value="Belum Mengumpulkan">Belum Mengumpulkan</option>
                              <option value="Tidak Wajib">Tidak Wajib</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Prestasi Akademik / Non-Akademik</label>
                        <input type="text" value={siswaForm.prestasi || ''} onChange={(e) => setSiswaForm({ ...siswaForm, prestasi: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Contoh: Juara 1 Taekwondo Tingkat Kota" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Hobi / Minat Bakat</label>
                        <input type="text" value={siswaForm.hobi || ''} onChange={(e) => setSiswaForm({ ...siswaForm, hobi: e.target.value })} className="w-full text-xs font-bold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Contoh: Membaca, Bermain Catur" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Catatan Khusus / Penting Siswa</label>
                        <textarea rows={2} value={siswaForm.catatanPenting || ''} onChange={(e) => setSiswaForm({ ...siswaForm, catatanPenting: e.target.value })} className="w-full text-xs font-semibold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Catatan medis, alergi, atau catatan kedisiplinan khusus" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Catatan Kelengkapan Berkas</label>
                        <textarea rows={2} value={siswaForm.catatanBerkas || ''} onChange={(e) => setSiswaForm({ ...siswaForm, catatanBerkas: e.target.value })} className="w-full text-xs font-semibold border bg-slate-50/50 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Kekurangan akta akan dikumpulkan saat pendaftaran ulang gelombang II..." />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Datalist helper for pekerjaan (Bisa Ketik Manual) */}
              <datalist id="pekerjaan-options">
                <option value="Tidak Bekerja" />
                <option value="Ibu Rumah Tangga" />
                <option value="Karyawan Swasta" />
                <option value="Wiraswasta" />
                <option value="Buruh Harian Lepas" />
                <option value="Petani" />
                <option value="PNS / TNI / POLRI" />
                <option value="Dokter / Tenaga Medis" />
                <option value="Pedagang" />
              </datalist>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsSiswaModalOpen(false)} 
                  className="px-6 py-2.5 rounded-xl border text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  💾 Simpan Data Pokok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MATA PELAJARAN ADD/EDIT MODAL */}
      {isMapelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold">{editingMapel ? '✏️ Edit Mata Pelajaran' : '➕ Tambah Mata Pelajaran'}</h3>
                <p className="text-[10px] opacity-85 mt-0.5">Definisikan jenjang, kelas, dan KKM mata pelajaran kurikulum PKBM.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsMapelModalOpen(false)} 
                className="bg-white/10 hover:bg-white/20 w-8 h-8 flex items-center justify-center rounded-full text-sm font-black transition text-white"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleMapelSubmit} className="flex flex-col overflow-hidden grow">
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Kode Mapel <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingMapel}
                    value={mapelForm.id || ''} 
                    onChange={(e) => setMapelForm({ ...mapelForm, id: e.target.value })} 
                    className="w-full text-xs font-mono font-bold border bg-slate-50 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400" 
                    placeholder="Contoh: A4-PLBJ, KATAR-A4" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nama Mata Pelajaran <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={mapelForm.nama || ''} 
                    onChange={(e) => setMapelForm({ ...mapelForm, nama: e.target.value })} 
                    className="w-full text-xs font-bold border bg-slate-50 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="Contoh: Pendidikan Pancasila, Bahasa Inggris" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Jenjang <span className="text-red-500">*</span></label>
                    <select 
                      value={mapelForm.jenjang || 'PAKET C'} 
                      onChange={(e) => setMapelForm({ ...mapelForm, jenjang: e.target.value })}
                      className="w-full text-xs font-bold border bg-slate-50 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none"
                    >
                      <option value="PAKET A">PAKET A (SD)</option>
                      <option value="PAKET B">PAKET B (SMP)</option>
                      <option value="PAKET C">PAKET C (SMA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Kelas <span className="text-red-500">*</span></label>
                    <select 
                      value={mapelForm.kelas || '10'} 
                      onChange={(e) => setMapelForm({ ...mapelForm, kelas: e.target.value })}
                      className="w-full text-xs font-bold border bg-slate-50 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none"
                    >
                      <option value="4">Kelas 4</option>
                      <option value="5">Kelas 5</option>
                      <option value="6">Kelas 6</option>
                      <option value="7">Kelas 7</option>
                      <option value="8">Kelas 8</option>
                      <option value="9">Kelas 9</option>
                      <option value="10">Kelas 10</option>
                      <option value="11">Kelas 11</option>
                      <option value="12">Kelas 12</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">KKM (Kriteria Ketuntasan Minimal) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    max={100}
                    value={mapelForm.kkm || 75} 
                    onChange={(e) => setMapelForm({ ...mapelForm, kkm: Number(e.target.value) })} 
                    className="w-full text-xs font-bold border bg-slate-50 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none" 
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsMapelModalOpen(false)} 
                  className="px-4 py-2 rounded-xl border text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  💾 {editingMapel ? 'Simpan Perubahan' : 'Tambah Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Global SweetAlert declaration for alert notifications
declare const Swal: any;
export {};
