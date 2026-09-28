export interface TableSchema {
  id: number;
  name: string;
  category: string;
  description: string;
  headers: string[];
  primaryKey: string;
  sidebarId?: string;
  sidebarName?: string;
  menuName?: string;
  icon?: string;
}

const _RAW_MASTER_TABLES: TableSchema[] = [
  // =========================================================================
  // SIDEBAR 1: DASHBOARD UTAMA (1-3)
  // =========================================================================
  {
    id: 1,
    name: "LOG",
    category: "1. Dashboard Utama",
    description: "Catatan riwayat aktivitas harian pengguna di seluruh modul sistem",
    primaryKey: "LogID",
    headers: ["LogID", "UserID", "Username", "Tanggal", "Aktivitas", "Modul", "IP", "Device", "Browser", "CreatedAt"]
  },
  {
    id: 2,
    name: "AUDIT_LOG",
    category: "1. Dashboard Utama",
    description: "Audit trail riwayat perubahan data (nilai sebelum dan sesudah diedit)",
    primaryKey: "AuditID",
    headers: ["AuditID", "UserID", "Username", "Tabel", "RecordID", "Field", "ValueLama", "ValueBaru", "Tanggal", "CreatedAt"]
  },
  {
    id: 3,
    name: "SESSIONS",
    category: "1. Dashboard Utama",
    description: "Sesi login aktif pengguna, masa kedaluwarsa sesi, dan perangkat login",
    primaryKey: "SessionID",
    headers: ["SessionID", "UserID", "Username", "Token", "IPAddress", "Device", "LoginAt", "ExpiredAt", "Status"]
  },
  {
    id: 4,
    name: "NOTIFIKASI",
    category: "1. Dashboard Utama",
    description: "Pusat notifikasi pengumuman, broadcast sekolah, dan peringatan tugas/ujian",
    primaryKey: "NotifID",
    headers: ["NotifID", "UserID", "Judul", "Pesan", "Tipe", "Link", "IsRead", "DibacaPada", "CreatedAt"]
  },

  // =========================================================================
  // SIDEBAR 2: MASTER DATA (4-13)
  // =========================================================================
  {
    id: 4,
    name: "SISWA",
    category: "2. Master Data",
    description: "Biodata Buku Induk Siswa Lengkap (74 kolom standar Dapodik 2027 & dokumen digital)",
    primaryKey: "NoPDKT",
    headers: [
      "NoPDKT", "TahunMasuk", "NISN", "NamaLengkap", "JenisKelamin", "TempatLahir", "TanggalLahir", 
      "NIK", "AnakKe", "Saudara", "Agama", "GolonganDarah", "TinggiBadan", "BeratBadan", 
      "Prestasi", "Hobi", "CatatanPenting", "Alamat", "RT", "RW", "Kelurahan", "Kecamatan", "Kota", 
      "Provinsi", "KodePos", "JenisTinggal", "AlatTransportasi", "NomorHP", "Email", "AsalSekolah", 
      "SKHUN", "PenerimaKPS", "PasFoto", "NomorKartuKeluarga", "NamaAyah", "NIKAyah", "TempatLahirAyah", 
      "TanggalLahirAyah", "PendidikanAyah", "PekerjaanAyah", "PenghasilanAyah", "TeleponAyah", "StatusAyah", "NamaIbu", 
      "NIKIbu", "TempatLahirIbu", "TanggalLahirIbu", "PendidikanIbu", "PekerjaanIbu", "PenghasilanIbu", 
      "TeleponIbu", "StatusIbu", "StatusYatim", "NamaWali", "TempatLahirWali", "TanggalLahirWali", "PendidikanWali", "PekerjaanWali", 
      "PenghasilanWali", "Hubungan", "TeleponWali", "AktaKelahiran", "KartuKeluarga", "KIA", "KTPAyah", 
      "KTPIbu", "Ijazah", "KTPWali", "Rapor", "SuratPindah", "SuratKeterangan", "SuratDomisili", "Status", "KelasSaatIni"
    ]
  },
  {
    id: 5,
    name: "ORANG_TUA",
    category: "2. Master Data",
    description: "Data detail orang tua / wali murid per siswa",
    primaryKey: "OrtuID",
    headers: ["OrtuID", "SiswaID", "NamaSiswa", "NISN", "Hubungan", "Nama", "NIK", "TempatLahir", "TanggalLahir", "Pendidikan", "Pekerjaan", "Penghasilan", "NoHP", "Alamat", "StatusHidup", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 6,
    name: "YATIM_PIATU",
    category: "2. Master Data",
    description: "Data khusus siswa Yatim, Piatu, Yatim Piatu, dan status bantuan sosial (KPS/PIP)",
    primaryKey: "YatimID",
    headers: ["YatimID", "NoPDKT", "NISN", "NamaSiswa", "Kelas", "StatusYatim", "NamaAyah", "StatusAyah", "NamaIbu", "StatusIbu", "NamaWali", "NoHPWali", "Alamat", "PenerimaKPS_PIP", "Keterangan", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 7,
    name: "REKAP_SISWA_KELURAHAN",
    category: "2. Master Data",
    description: "Rekapitulasi Sebaran Domisili Siswa per Kelurahan & RW se-Kecamatan Tambora (Nama, RW, Kelurahan, Kelas, Status)",
    primaryKey: "RekapKelurahanID",
    headers: ["RekapKelurahanID", "NamaSiswa", "NISN", "RW", "RT", "Kelurahan", "Kecamatan", "Kota", "Kelas", "Status", "JenisKelamin", "Alamat", "NamaAyah", "NamaIbu", "NoHP", "StatusYatim", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 8,
    name: "PRESTASI_SISWA",
    category: "2. Master Data",
    description: "Pencatatan prestasi lomba, kejuaraan akademik/non-akademik dan piagam penghargaan",
    primaryKey: "PrestasiID",
    headers: ["PrestasiID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "NamaPrestasi", "Bidang", "Tingkat", "Peringkat", "Tahun", "Penyelenggara", "NoSertifikat", "SertifikatUrl", "PoinReward", "Status", "CreatedAt"]
  },
  {
    id: 8,
    name: "KENAIKAN_KELAS",
    category: "2. Master Data",
    description: "Riwayat proses kenaikan tingkat siswa tahunan dan mutasi rombel",
    primaryKey: "KenaikanID",
    headers: ["KenaikanID", "SiswaID", "NISN", "NamaSiswa", "KelasAsal", "KelasTujuan", "TahunAjaran", "Semester", "StatusKenaikan", "CatatanKeputusan", "TanggalProses", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 9,
    name: "KELULUSAN",
    category: "2. Master Data",
    description: "Data kelulusan akhir, nomor SKL, nilai akhir ujian dan ijazah siswa",
    primaryKey: "KelulusanID",
    headers: ["KelulusanID", "SiswaID", "NISN", "NamaSiswa", "KelasTerakhir", "TahunLulus", "NomorSKL", "NomorIjazah", "NilaiAkhir", "Predikat", "StatusKelulusan", "Keterangan", "TanggalLulus", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 10,
    name: "ALUMNI",
    category: "2. Master Data",
    description: "Data penelusuran lulusan dan tracer study alumni siswa",
    primaryKey: "NISN",
    headers: ["AlumniID", "Nama", "NISN", "JenisKelamin", "KelasTerakhir", "TahunLulus", "StatusLanjut", "NamaKampus_Instansi", "Jurusan_Pekerjaan", "Kontak", "Email", "Alamat", "CreatedAt"]
  },
  {
    id: 11,
    name: "GURU",
    category: "2. Master Data",
    description: "Biodata Tenaga Pendidik & Kependidikan (GTK / Guru & Staf), NIP, NUPTK & berkas",
    primaryKey: "GuruID",
    headers: [
      "GuruID", "NIK", "NIP", "NUPTK", "Nama", "Gelar", "JenisKelamin", "TempatLahir", "TanggalLahir", 
      "Agama", "Alamat", "NoHP", "Email", "Jabatan", "WaliKelas", "StatusKepegawaian", "Pendidikan", "Jurusan", "TMT", "Status", "Foto", "CreatedAt", "UpdatedAt"
    ]
  },
  {
    id: 12,
    name: "JABATAN_GTK",
    category: "2. Master Data",
    description: "Daftar struktur penugasan dan jabatan GTK (Kepsek, Waka, Bendahara, Wali Kelas)",
    primaryKey: "JabatanID",
    headers: ["JabatanID", "NamaJabatan", "TugasUtama", "Eselon_Tingkat", "BebanJam", "Keterangan", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 13,
    name: "RIWAYAT_MENGAJAR",
    category: "2. Master Data",
    description: "Riwayat beban jam mengajar guru per tahun pelajaran dan semester",
    primaryKey: "RiwayatID",
    headers: ["RiwayatID", "GuruID", "NamaGuru", "TahunAjaran", "Semester", "Mapel", "Kelas", "JumlahJam", "StatusSK", "NoSKMengajar", "CreatedAt"]
  },

  // =========================================================================
  // SIDEBAR 3: SPMB (14-20)
  // =========================================================================
  {
    id: 14,
    name: "FORM_FIELDS",
    category: "13. PENGATURAN",
    description: "Konfigurasi formulir dinamis & custom fields untuk seluruh modul aplikasi (SPMB, Siswa, Guru, Keuangan, Sarpras, BK, Surat, dll.)",
    primaryKey: "key",
    headers: ["key", "label", "type", "grid", "required", "show", "options", "modul", "formId", "placeholder", "urutan", "keterangan"]
  },
  {
    id: 15,
    name: "SPMB_PENDAFTAR",
    category: "3. SPMB",
    description: "Data registrasi pendaftar calon siswa baru (No Registrasi, Nama, NISN, Jalur, Berkas)",
    primaryKey: "NoRegistrasi",
    headers: ["NoRegistrasi", "NamaCalonSiswa", "NISN", "NIK", "JenisKelamin", "TempatLahir", "TanggalLahir", "Agama", "Alamat", "NamaAyah", "NamaIbu", "Kontak", "JalurMasuk", "AsalSekolah", "StatusBerkas", "SkorSeleksi", "HasilKeputusan", "NoPDKT", "KelompokMPLS", "StatusDaftarUlang", "UkuranSeragam", "TanggalDaftar", "CreatedAt"]
  },
  {
    id: 16,
    name: "SPMB_VERIFIKASI",
    category: "3. SPMB",
    description: "Audit dan verifikasi keabsahan dokumen berkas fisik/digital pendaftar SPMB",
    primaryKey: "NoRegistrasi",
    headers: ["VerifikasiID", "NoRegistrasi", "NamaCalonSiswa", "NISN", "StatusBerkas", "AktaKelahiran", "KartuKeluarga", "Ijazah", "KTPOrtu", "PasFoto", "SuratPernyataan", "CatatanVerifikasi", "Verifikator", "TanggalVerifikasi"]
  },
  {
    id: 17,
    name: "SPMB_SELEKSI",
    category: "3. SPMB",
    description: "Rekap penilaian, ujian seleksi, skor pembobotan, dan ranking calon siswa SPMB",
    primaryKey: "NoRegistrasi",
    headers: ["SeleksiID", "NoRegistrasi", "NamaCalonSiswa", "NISN", "JalurMasuk", "NilaiAkademik", "NilaiWawancara", "NilaiPrestasi", "NilaiTesTulis", "SkorSeleksi", "Ranking", "Rekomendasi", "StatusSeleksi"]
  },
  {
    id: 18,
    name: "SPMB_PENGUMUMAN",
    category: "3. SPMB",
    description: "Hasil pengumuman kelulusan, penetapan SK resmi, dan status penerimaan calon siswa",
    primaryKey: "NoRegistrasi",
    headers: ["PengumumanID", "NoRegistrasi", "NamaCalonSiswa", "NISN", "JalurMasuk", "SkorSeleksi", "HasilKeputusan", "NomorSK", "TanggalPengumuman", "CatatanKelulusan"]
  },
  {
    id: 19,
    name: "SPMB_DAFTAR_ULANG",
    category: "3. SPMB",
    description: "Registrasi ulang calon siswa diterima, alokasi No PDKT, dan pembagian gugus/kelompok MPLS",
    primaryKey: "NoRegistrasi",
    headers: ["DaftarUlangID", "NoRegistrasi", "NamaCalonSiswa", "NISN", "NoPDKT", "KelasDiterima", "KelompokMPLS", "StatusDaftarUlang", "TanggalDaftarUlang", "UkuranSeragam", "PembayaranAwal", "Catatan"]
  },
  {
    id: 20,
    name: "DAPODIK_VALIDASI",
    category: "3. SPMB",
    description: "Data sinkronisasi dan audit validasi Dapodik 2027 (NISN, NIK, No KK, Ibu Kandung, Tanggal Lahir)",
    primaryKey: "ValidasiID",
    headers: ["ValidasiID", "SiswaID", "NISN", "NIK", "NoKK", "NamaSiswa", "NamaIbuKandung", "TanggalLahir", "StatusDapodik", "CatatanInvalid", "TglValidasi", "UpdatedAt", "TahunAjaran", "Buktiterdaftar"]
  },

  // =========================================================================
  // SIDEBAR 4: AKADEMIK (21-34)
  // =========================================================================
  {
    id: 21,
    name: "TAHUN_AJARAN",
    category: "4. Akademik",
    description: "Tahun pelajaran kalender akademik (contoh: 2026/2027)",
    primaryKey: "TAID",
    headers: ["TAID", "Nama", "TahunMulai", "TahunSelesai", "TanggalMulai", "TanggalSelesai", "Aktif"]
  },
  {
    id: 22,
    name: "SEMESTER",
    category: "4. Akademik",
    description: "Semester berjalan (Ganjil / Genap)",
    primaryKey: "SemesterID",
    headers: ["SemesterID", "Nama", "TahunAjaranID", "TahunPelajaran", "Semester", "TanggalMulai", "TanggalSelesai", "Aktif"]
  },
  {
    id: 23,
    name: "JENJANG",
    category: "4. Akademik",
    description: "Jenjang pendidikan (Paket A, Paket B, Paket C, SD, SMP, SMA, SMK)",
    primaryKey: "JenjangID",
    headers: ["JenjangID", "Kode", "NamaJenjang", "TingkatAwal", "TingkatTengah", "TingkatAkhir", "Keterangan", "Aktif"]
  },
  {
    id: 24,
    name: "KELAS",
    category: "4. Akademik",
    description: "Rombongan belajar kelas, tingkat, ruangan, wali kelas, dan tutor",
    primaryKey: "KelasID",
    headers: ["KelasID", "NamaKelas", "JenjangID", "Tingkat", "WaliKelasID", "NamaWaliKelas", "NamaTutor", "Ruangan", "Kapasitas", "TahunAjaran", "Status"]
  },
  {
    id: 25,
    name: "MAPEL",
    category: "4. Akademik",
    description: "Mata pelajaran, kelompok kurikulum, jenjang, kelas, guru pengampu, dan KKM",
    primaryKey: "MapelID",
    headers: ["MapelID", "Kode", "NamaMapel", "Kategori", "KKM", "GuruID", "GuruPengampu", "Jenjang", "Kelas", "Kelompok", "Fase", "BebanJP", "Status"]
  },
  {
    id: 26,
    name: "HARI_LIBUR",
    category: "4. Akademik",
    description: "Kalender hari libur nasional dan cuti bersama pendidikan",
    primaryKey: "HariLiburID",
    headers: ["HariLiburID", "Tanggal", "TanggalSelesai", "Nama", "Jenis", "TahunAjaran", "Keterangan"]
  },
  {
    id: 27,
    name: "JADWAL",
    category: "4. Akademik",
    description: "Jadwal pelajaran mingguan per kelas dan jam mengajar guru",
    primaryKey: "JadwalID",
    headers: ["JadwalID", "Hari", "JamMulai", "JamSelesai", "KelasID", "NamaKelas", "MapelID", "NamaMapel", "GuruID", "NamaGuru", "Ruangan", "TAID", "SemesterID", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 28,
    name: "AGENDA",
    category: "4. Akademik",
    description: "Jurnal agenda mengajar guru harian di kelas",
    primaryKey: "AgendaID",
    headers: ["AgendaID", "Tanggal", "GuruID", "NamaGuru", "MapelID", "NamaMapel", "KelasID", "NamaKelas", "JamKe", "MateriPokok", "KegiatanPembelajaran", "KehadiranSiswa", "Hambatan", "TindakLanjut", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 29,
    name: "ABSENSI",
    category: "4. Akademik",
    description: "Presensi harian siswa (masuk/pulang, GPS lokasi, dan QR scan kartu pelajar)",
    primaryKey: "AbsenID",
    headers: ["AbsenID", "Tanggal", "SiswaID", "NISN", "NamaSiswa", "KelasID", "NamaKelas", "JamMasuk", "JamPulang", "Status", "Keterangan", "Lokasi", "Latitude", "Longitude", "QRCode", "PetugasID", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 30,
    name: "ABSENSI_GURU",
    category: "4. Akademik",
    description: "Presensi kehadiran harian guru dan staf tenaga kependidikan",
    primaryKey: "AbsenGuruID",
    headers: ["AbsenGuruID", "Tanggal", "GuruID", "NIP", "NamaGuru", "JamMasuk", "JamPulang", "Status", "Lokasi", "Latitude", "Longitude", "Keterangan", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 31,
    name: "PERIZINAN",
    category: "4. Akademik",
    description: "Data pengajuan perizinan dan dispensasi ketidakhadiran terintegrasi",
    primaryKey: "IzinID",
    headers: ["IzinID", "Tanggal", "TipePengaju", "SiswaID", "NISN", "NamaSiswa", "Kelas", "GuruID", "NIP", "NamaGuru", "JenisIzin", "Keterangan", "TanggalMulai", "TanggalSelesai", "BuktiSuratUrl", "StatusPersetujuan", "DisetujuiOleh", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 32,
    name: "IZIN_SAKIT_SISWA",
    category: "4. Akademik",
    description: "Permohonan surat izin / sakit siswa beserta lampiran dokumen surat dokter",
    primaryKey: "IzinID",
    headers: ["IzinID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "TanggalMulai", "TanggalSelesai", "JenisIzin", "Alasan", "BuktiSuratUrl", "StatusPersetujuan", "DisetujuiOleh", "Catatan", "CreatedAt"]
  },
  {
    id: 33,
    name: "IZIN_CUTI_GURU",
    category: "4. Akademik",
    description: "Pengajuan izin cuti, dinas luar, dan ketidakhadiran guru/staf",
    primaryKey: "CutiID",
    headers: ["CutiID", "GuruID", "NIP", "NamaGuru", "TanggalMulai", "TanggalSelesai", "JenisCuti", "Alasan", "LampiranUrl", "StatusPersetujuan", "DisetujuiOleh", "Catatan", "CreatedAt"]
  },
  {
    id: 34,
    name: "REKAP_PRESENSI",
    category: "4. Akademik",
    description: "Rekapitulasi persentase kehadiran bulanan siswa per kelas",
    primaryKey: "RekapID",
    headers: ["RekapID", "PeriodeBulan", "TahunAjaran", "Semester", "Kelas", "SiswaID", "NISN", "NamaSiswa", "Hadir", "Izin", "Sakit", "Alpa", "Terlambat", "PersentaseHadir"]
  },
  {
    id: 35,
    name: "QR_LOG",
    category: "4. Akademik",
    description: "Log pemindaian barcode / QR kartu pelajar siswa",
    primaryKey: "QRLogID",
    headers: ["QRLogID", "Tanggal", "Waktu", "UserID", "NISN_NIP", "NamaPengguna", "Peran", "QRCode", "TipeScan", "Latitude", "Longitude", "Device", "Browser", "Status", "Keterangan", "CreatedAt"]
  },

  // =========================================================================
  // SIDEBAR 5: UJIAN ONLINE (36-44)
  // =========================================================================
  {
    id: 36,
    name: "BANK_SOAL",
    category: "5. Ujian Online",
    description: "Bank paket butir soal pedagogis pilihan ganda terstruktur dengan jenis asesmen, durasi, kunci jawaban, dan pembahasan rasional",
    primaryKey: "BankSoalID",
    headers: ["BankSoalID", "Mapel", "Kelas", "Kurikulum", "JenisAsesmen", "Durasi", "Guru", "JumlahSoal", "TipeSoal", "Kesulitan", "FolderDriveGambar", "Status", "SoalJSON", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 37,
    name: "UJIAN",
    category: "5. Ujian Online",
    description: "Jadwal sesi ujian CBT, durasi pengerjaan, acak soal, dan token pengawas",
    primaryKey: "UjianID",
    headers: ["UjianID", "BankSoalID", "NamaUjian", "Mapel", "Kelas", "JenisUjian", "Tanggal", "JamMulai", "JamSelesai", "Durasi", "Peserta", "Proktor", "JumlahSoal", "AcakSoal", "AcakOpsi", "TampilkanNilai", "Token", "Status", "NilaiRataRata", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 38,
    name: "TOKEN",
    category: "5. Ujian Online",
    description: "Daftar token ujian aktif & masa kedaluwarsa sesi tes",
    primaryKey: "TokenID",
    headers: ["TokenID", "UjianID", "NamaUjian", "Kelas", "Token", "Tanggal", "JamMulai", "JamSelesai", "DurasiMenit", "Status", "CreatedAt"]
  },
  {
    id: 39,
    name: "SOAL",
    category: "5. Ujian Online",
    description: "Distribusi butir soal per paket ujian lengkap dengan mata pelajaran, kelas, jenjang, nomor soal, pertanyaan, pilihan ganda A-E, kunci jawaban, pembahasan rasional, bobot penilaian",
    primaryKey: "DetailSoalID",
    headers: ["DetailSoalID", "UjianID", "BankSoalID", "MataPelajaran", "Kelas", "Jenjang", "NomorSoal", "Pertanyaan", "LinkGambar", "GambarIlustrasiUrl", "FolderDriveGambar", "KategoriIlustrasi", "TipeSoal", "PilihanA", "PilihanB", "PilihanC", "PilihanD", "PilihanE", "KunciJawaban", "PembahasanRasional", "Bobot", "CreatedAt"]
  },
  {
    id: 40,
    name: "JAWABAN",
    category: "5. Ujian Online",
    description: "Lembar jawaban pilihan dan essay siswa saat tes online",
    primaryKey: "JawabanID",
    headers: ["JawabanID", "UjianID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "BankSoalID", "NomorSoal", "JawabanSiswa", "KunciJawaban", "IsCorrect", "Nilai", "Tanggal", "CreatedAt"]
  },
  {
    id: 41,
    name: "DRAFT_JAWABAN",
    category: "5. Ujian Online",
    description: "Backup sementara jawaban tes siswa secara realtime anti-hilang",
    primaryKey: "DraftID",
    headers: ["DraftID", "UjianID", "SiswaID", "NISN", "Username", "JawabanJSON", "SisaWaktu", "LastSync", "Timestamp"]
  },
  {
    id: 42,
    name: "LOG_UJIAN",
    category: "5. Ujian Online",
    description: "Catatan riwayat interaksi dan pengerjaan tes online per sesi siswa",
    primaryKey: "LogUjianID",
    headers: ["LogUjianID", "UjianID", "SiswaID", "NISN", "NamaSiswa", "Jenjang", "Kelas", "Waktu", "Aktivitas", "Pelanggaran", "Token", "IPAddress", "Status"]
  },
  {
    id: 43,
    name: "HASIL_UJIAN",
    category: "5. Ujian Online",
    description: "Rekapitulasi skor, jumlah benar/salah, dan peringkat nilai CBT",
    primaryKey: "HasilUjianID",
    headers: ["HasilUjianID", "UjianID", "NamaUjian", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Benar", "Salah", "TotalSoal", "Nilai", "Ranking", "StatusTuntas", "WaktuSelesai", "CreatedAt"]
  },
  {
    id: 44,
    name: "ANALISIS_SOAL",
    category: "5. Ujian Online",
    description: "Analisis butir soal CBT (tingkat kesukaran, daya pembeda, validitas, dan efektivitas pengecoh)",
    primaryKey: "AnalisisID",
    headers: ["AnalisisID", "UjianID", "BankSoalID", "SoalID", "NomorSoal", "TingkatKesukaran", "DayaPembeda", "StatusSoal", "KunciJawaban", "JumlahPeserta", "BenarA", "BenarB", "BenarC", "BenarD", "BenarE", "Rekomendasi", "CreatedAt", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 6: PENUGASAN (43-48)
  // =========================================================================
  {
    id: 43,
    name: "TUGAS",
    category: "6. Penugasan",
    description: "Data penugasan online, pekerjaan rumah (PR), dan instruksi tugas siswa",
    primaryKey: "TugasID",
    headers: ["TugasID", "Judul", "Mapel", "Kelas", "Guru", "Tenggat", "Kategori", "Petunjuk", "Kumpul", "TotalSiswa", "Status", "NilaiRataRata", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 44,
    name: "PENGUMPULAN_TUGAS",
    category: "6. Penugasan",
    description: "Data pengumpulan berkas/jawaban tugas siswa beserta penilaian guru",
    primaryKey: "PengumpulanID",
    headers: ["PengumpulanID", "TugasID", "JudulTugas", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Status", "Nilai", "CatatanGuru", "FileUrl", "WaktuKumpul", "CreatedAt"]
  },
  {
    id: 45,
    name: "MATERI_DIGITAL",
    category: "6. Penugasan",
    description: "Buku digital, modul ajar, video edukasi, dan materi e-learning siswa",
    primaryKey: "MateriID",
    headers: ["MateriID", "Judul", "Mapel", "Kelas", "Guru", "Deskripsi", "FileUrl", "TipeMateri", "UkuranFile", "Status", "CreatedAt"]
  },
  {
    id: 46,
    name: "CP_ATP",
    category: "6. Penugasan",
    description: "Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP) Kurikulum Merdeka",
    primaryKey: "CpaID",
    headers: ["CpaID", "Mapel", "Fase", "Elemen", "CapaianPembelajaran", "TujuanPembelajaran", "AlurTujuan", "Kelas", "Semester"]
  },
  {
    id: 47,
    name: "NILAI",
    category: "6. Penugasan",
    description: "Buku induk penilaian komprehensif memisahkan nilai Penugasan KBM, Ujian CBT, Formatif TP, Sumatif STS & SAS dengan status ketuntasan dan keterangan otomatis",
    primaryKey: "NilaiID",
    headers: [
      "NilaiID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Mapel", "Guru", "Semester", "TahunAjaran",
      "TipePenilaian", "SumberNilai", "JudulPenilaian", "NilaiAngka", "NilaiFormatif_TP", "NilaiUTS_STS", "NilaiUAS_SAS", "NilaiAkhir",
      "KKM", "Predikat", "CapaianKompetensi", "StatusTuntas", "Keterangan", "TanggalPenilaian", "CreatedAt", "UpdatedAt"
    ]
  },
  {
    id: 48,
    name: "RAPOR",
    category: "6. Penugasan",
    description: "Rekap nilai akhir rapor siswa, ranking, dan catatan wali kelas",
    primaryKey: "RaporID",
    headers: ["RaporID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Semester", "TahunAjaran", "NilaiRataRata", "Ranking", "StatusKenaikan", "CatatanWaliKelas", "TanggalRapor", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 49,
    name: "MASTER_SILABUS",
    category: "6. Penugasan",
    description: "Dataset Master Silabus Dokumen Kurikulum (Kesetaraan Paket A, B, C / Merdeka)",
    primaryKey: "id",
    headers: [
      "id",
      "no",
      "kodeJenjang",
      "Jenjang",
      "kelas",
      "semester",
      "kodeMapel",
      "NamaMapel",
      "noModul",
      "temaModul",
      "subKe",
      "kodeSubTugas",
      "topikSubTugas",
      "status",
      "keterangan",
      "fileUrl",
      "fileName"
    ]
  },
  {
    id: 50,
    name: "KURIKULUM_MODUL",
    category: "6. Penugasan",
    description: "Data Master Modul Pembelajaran Kurikulum Kesetaraan (Paket A, B, C)",
    primaryKey: "id",
    headers: [
      "id",
      "noModul",
      "kodeModul",
      "judulModul",
      "kodeMapel",
      "NamaMapel",
      "Jenjang",
      "kelas",
      "semester",
      "Unit",
      "materiPokok"
    ]
  },

  // =========================================================================
  // SIDEBAR 7: KEUANGAN (49-56)
  // =========================================================================
  {
    id: 51,
    name: "BIAYA",
    category: "7. Keuangan",
    description: "Master tarif jenis biaya sekolah (Iuran, DSP, seragam, kegiatan)",
    primaryKey: "BiayaID",
    headers: ["No", "BiayaID", "KodeBiaya", "NamaBiaya", "Kategori", "Jenjang", "Target_Kelas", "KelasID", "SiswaID", "NamaSiswa", "Nominal", "Periode", "Wajib", "Status", "Keterangan", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 52,
    name: "TAGIHAN",
    category: "7. Keuangan",
    description: "Daftar tagihan bulanan siswa, pos biaya, jatuh tempo, dan tunggakan",
    primaryKey: "TagihanID",
    headers: ["TagihanID", "NoPDKT", "NamaSiswa", "Kelas", "KodeBiaya", "NamaBiaya", "TahunAjaran", "Semester", "TanggalTagihan", "JatuhTempo", "Nominal", "Diskon", "TotalTagihan", "TanggalBayar", "TotalBayar", "SisaTagihan", "Status", "Keterangan"]
  },
  {
    id: 53,
    name: "PEMBAYARAN",
    category: "7. Keuangan",
    description: "Kuitansi riwayat transaksi pembayaran kasir dari wali murid",
    primaryKey: "PembayaranID",
    headers: ["PembayaranID", "TagihanID", "InvoiceID", "SiswaID", "NamaSiswa", "Kelas", "Tanggal", "MetodePembayaran", "Nominal", "Status", "Catatan"]
  },
  {
    id: 54,
    name: "INVOICE",
    category: "7. Keuangan",
    description: "Faktur tagihan gabungan per siswa untuk periode tertentu",
    primaryKey: "InvoiceID",
    headers: ["InvoiceID", "PembayaranID", "TagihanID", "SiswaID", "NamaSiswa", "Kelas", "Tanggal", "MetodePembayaran", "Total", "Status", "Catatan"]
  },
  {
    id: 55,
    name: "TABUNGAN",
    category: "7. Keuangan",
    description: "Buku rekening tabungan siswa (setoran, penarikan & saldo)",
    primaryKey: "TabunganID",
    headers: ["No", "TabunganID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Tanggal", "Jenis", "Debit", "Kredit", "SaldoSebelumnya", "SaldoAkhir", "PetugasID", "Keterangan", "Status", "CreatedAt"]
  },
  {
    id: 56,
    name: "KAS",
    category: "7. Keuangan",
    description: "Buku kas umum sekolah (pemasukan & arus kas operasional)",
    primaryKey: "KasID",
    headers: ["KasID", "Tanggal", "Kategori", "Jenis", "Masuk", "Keluar", "Nominal", "Keterangan", "Petugas", "Referensi", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 57,
    name: "PENGELUARAN",
    category: "7. Keuangan",
    description: "Pengeluaran operasional sekolah dan bukti kuitansi belanja",
    primaryKey: "PengeluaranID",
    headers: ["PengeluaranID", "Tanggal", "Kategori", "NamaPengeluaran", "Nominal", "Penerima", "MetodePembayaran", "BuktiUrl", "PetugasID", "Keterangan", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 58,
    name: "JURNAL_UMUM",
    category: "7. Keuangan",
    description: "Jurnal akuntansi debit-kredit kode akun keuangan sekolah",
    primaryKey: "JurnalID",
    headers: ["JurnalID", "Tanggal", "KodeAkun", "NamaAkun", "Keterangan", "Debit", "Kredit", "Referensi", "UserID", "CreatedAt", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 8: BIMBINGAN KONSELING (57-59)
  // =========================================================================
  {
    id: 59,
    name: "BIMBINGAN",
    category: "8. Bimbingan Konseling",
    description: "Layanan konseling, solusi masalah, dan tindak lanjut siswa",
    primaryKey: "BimbinganID",
    headers: ["BimbinganID", "Tanggal", "Waktu", "SiswaID", "NISN", "NamaSiswa", "Kelas", "GuruBKID", "Konselor", "JenisBimbingan", "PokokMasalah", "Urgensi", "HasilTindakLanjut", "Status", "CatatanRahasia", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 60,
    name: "PELANGGARAN",
    category: "8. Bimbingan Konseling",
    description: "Catatan pelanggaran tata tertib dan sistem poin siswa",
    primaryKey: "PelanggaranID",
    headers: ["PelanggaranID", "Tanggal", "Jam", "SiswaID", "NISN", "NamaSiswa", "Kelas", "Klasifikasi", "BentukPelanggaran", "Poin", "Sanksi", "PetugasPelapor", "Status", "TindakLanjutOrtu", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 61,
    name: "KARTU_POIN_SISWA",
    category: "8. Bimbingan Konseling",
    description: "Rekapitulasi akumulasi poin pelanggaran dan poin prestasi per siswa",
    primaryKey: "KartuID",
    headers: ["KartuID", "SiswaID", "NISN", "NamaSiswa", "Kelas", "TotalPoinPelanggaran", "TotalPoinPrestasi", "PoinBersih", "StatusPeringatan", "RekomendasiTindakan", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 9: INVENTARIS & ASET (60-62)
  // =========================================================================
  {
    id: 62,
    name: "BARANG",
    category: "9. Inventaris & Aset",
    description: "Daftar aset sarana prasarana sekolah, lokasi ruangan, dan kondisi fisik",
    primaryKey: "BarangID",
    headers: ["BarangID", "KodeBarang", "NamaBarang", "Kategori", "KlasifikasiKib", "Jumlah", "Satuan", "Lokasi", "Kondisi", "SumberDana", "TahunPerolehan", "HargaPerolehan", "PenanggungJawab", "Spesifikasi", "QRCode", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 63,
    name: "PEMELIHARAAN",
    category: "9. Inventaris & Aset",
    description: "Riwayat servis, perbaikan aset, dan biaya pemeliharaan barang",
    primaryKey: "PemeliharaanID",
    headers: ["PemeliharaanID", "NoTiket", "BarangID", "KodeBarang", "NamaBarang", "Lokasi", "TglLapor", "Pelapor", "DeskripsiKerusakan", "TingkatKerusakan", "TindakanPerbaikan", "TeknisiVendor", "EstimasiBiaya", "Status", "TglSelesai", "KeteranganHasil", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 64,
    name: "PEMINJAMAN_BARANG",
    category: "9. Inventaris & Aset",
    description: "Peminjaman sarana (proyektor, laptop, ruang, tenda, sound system)",
    primaryKey: "PeminjamanBarangID",
    headers: ["PeminjamanBarangID", "NoPeminjaman", "NamaPeminjam", "RolePeminjam", "KelasAtauUnit", "Kontak", "BarangID", "NamaBarang", "Jumlah", "TglPinjam", "TglKembaliRencana", "TglKembaliRealisasi", "Keperluan", "Status", "Petugas", "CatatanKondisi", "CreatedAt", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 10: DOKUMEN & SURAT (63-66)
  // =========================================================================
  {
    id: 65,
    name: "SURAT_MASUK",
    category: "10. Dokumen & Surat",
    description: "Registrasi buku agenda persuratan masuk dan disposisi kepala sekolah",
    primaryKey: "SuratMasukID",
    headers: ["SuratMasukID", "NoAgenda", "NoSuratAsal", "TanggalSurat", "TanggalDiterima", "Pengirim", "KategoriPengirim", "Perihal", "Sifat", "StatusDisposisi", "InstruksiDisposisi", "DiteruskanKepada", "TenggatWaktu", "CatatanKepsek", "LampiranNama", "LampiranUrl", "PenerimaBerkas", "CreatedAt"]
  },
  {
    id: 66,
    name: "SURAT_KELUAR",
    category: "10. Dokumen & Surat",
    description: "Registrasi buku agenda nomor surat keluar dan dokumen arsip resmi sekolah",
    primaryKey: "SuratKeluarID",
    headers: ["SuratKeluarID", "NoSurat", "KodeKlasifikasi", "TanggalSurat", "JenisSurat", "Penerima", "AlamatPenerima", "Perihal", "IsiSurat", "Penandatangan", "JabatanPenandatangan", "Status", "SiswaID", "NamaSiswa", "NISN", "Kelas", "Keperluan", "Tembusan", "CreatedAt"]
  },
  {
    id: 67,
    name: "FILE",
    category: "10. Dokumen & Surat",
    description: "Master tautan berkas file Google Drive, ukuran, dan modul pemilik",
    primaryKey: "FileID",
    headers: ["FileID", "Kategori", "Modul", "NamaFile", "NamaAsli", "URL", "Ukuran", "TipeFile", "UploadBy", "TanggalUpload", "Status", "Keterangan", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 68,
    name: "ARSIP",
    category: "10. Dokumen & Surat",
    description: "Registrasi arsip surat masuk/keluar dan dokumen penting sekolah",
    primaryKey: "ArsipID",
    headers: ["ArsipID", "NomorDokumen", "JudulDokumen", "Kategori", "TahunAjaran", "TahunTerbit", "FormatFile", "UkuranFile", "FileUrl", "Pengunggah", "TingkatAkses", "Deskripsi", "Tags", "Status", "Keterangan", "CreatedAt", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 12: E-PERPUSTAKAAN (67-70)
  // =========================================================================
  {
    id: 69,
    name: "BUKU",
    category: "12. E-Perpustakaan",
    description: "Katalog buku perpustakaan, ISBN, lokasi rak penyimpanan, dan stok buku",
    primaryKey: "BukuID",
    headers: ["BukuID", "KodeBuku", "ISBN", "Judul", "Pengarang", "Penerbit", "TahunTerbit", "Kategori", "LokasiRak", "StokTotal", "StokTersedia", "Deskripsi", "CoverUrl", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 70,
    name: "PEMINJAMAN",
    category: "12. E-Perpustakaan",
    description: "Sirkulasi peminjaman dan pengembalian buku perpustakaan siswa & guru",
    primaryKey: "PeminjamanID",
    headers: ["PeminjamanID", "KodePeminjaman", "BukuID", "JudulBuku", "PeminjamID", "NamaPeminjam", "TipePeminjam", "KelasOrDepartemen", "TanggalPinjam", "TenggatKembali", "TanggalKembali", "Status", "Denda", "Catatan", "PetugasID", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 71,
    name: "DENDA",
    category: "12. E-Perpustakaan",
    description: "Catatan denda keterlambatan / penggantian buku hilang & rusak",
    primaryKey: "DendaID",
    headers: ["DendaID", "PeminjamanID", "KodePeminjaman", "NamaPeminjam", "JudulBuku", "Tanggal", "Nominal", "Status", "TanggalBayar", "PetugasID", "Keterangan", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 72,
    name: "PENGUNJUNG_PERPUS",
    category: "12. E-Perpustakaan",
    description: "Buku tamu dan pencatatan presensi pengunjung perpustakaan",
    primaryKey: "PengunjungID",
    headers: ["PengunjungID", "Tanggal", "UserID", "NISN_NIP", "Nama", "Peran", "KelasOrUnit", "Keperluan", "WaktuMasuk", "WaktuKeluar", "CreatedAt"]
  },

  // =========================================================================
  // SIDEBAR 13: WHATSAPP GATEWAY (71)
  // =========================================================================
  {
    id: 73,
    name: "WA_LOG",
    category: "13. WhatsApp Gateway",
    description: "Log riwayat pengiriman notifikasi WhatsApp Gateway ke wali murid dan guru",
    primaryKey: "IDPesan",
    headers: ["IDPesan", "Kategori", "NamaPenerima", "PeranPenerima", "NomorWhatsApp", "IsiPesan", "Status", "WaktuKirim", "Pengirim"]
  },

  // =========================================================================
  // SIDEBAR 14: EKSTRAKURIKULER & OSIS (72-73)
  // =========================================================================
  {
    id: 74,
    name: "EKSKUL",
    category: "14. Ekstrakurikuler & OSIS",
    description: "Master kegiatan ekstrakurikuler, pembina, kuota, dan jadwal latihan mingguan",
    primaryKey: "KodeEkskul",
    headers: ["KodeEkskul", "NamaEkskul", "Kategori", "NamaPembina", "HariLatihan", "WaktuLatihan", "TempatLatihan", "Kuota", "Deskripsi", "Status", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 75,
    name: "EKSKUL_ANGGOTA",
    category: "14. Ekstrakurikuler & OSIS",
    description: "Daftar keanggotaan siswa di ekstrakurikuler, jabatan, dan rekap penilaian rapor",
    primaryKey: "NIS",
    headers: ["KodeEkskul", "NamaEkskul", "SiswaID", "NIS", "NamaSiswa", "Kelas", "Jabatan", "TanggalBergabung", "NilaiRapor", "Keterangan", "Status", "CreatedAt", "UpdatedAt"]
  },

  // =========================================================================
  // SIDEBAR 15: MADING & BERITA (74)
  // =========================================================================
  {
    id: 76,
    name: "MADING_BERITA",
    category: "15. Mading & Berita",
    description: "Publikasi berita prestasi, mading digital, agenda sekolah, dan pengumuman daring",
    primaryKey: "IDMading",
    headers: ["IDMading", "Judul", "Kategori", "Konten", "Penulis", "PeranPenulis", "TanggalPublikasi", "Status", "Prioritas", "TargetAudiens", "GambarUrl", "LampiranUrl", "CreatedAt"]
  },

  // =========================================================================
  // SIDEBAR 16: PORTAL PUBLIK & WEB (75-76)
  // =========================================================================
  {
    id: 77,
    name: "WEB_CONFIG",
    category: "16. Portal Publik & Web",
    description: "Pengaturan konten web, landing page portal, branding, kontak & alur pendaftaran",
    primaryKey: "appName",
    headers: ["appName", "subJudulNavbar", "judulSidebar", "logoUrl", "heroImageUrl", "teksHero", "heroBaris1", "heroBaris2", "heroSubteks", "footerJudul", "footerAlamat", "footerTelepon", "footerEmail", "footerHakCipta", "linkFb", "linkIg", "linkYt", "linkTg", "pendaftaranStatus", "runningText", "alur1_judul", "alur1_desc", "alur2_judul", "alur2_desc", "alur3_judul", "alur3_desc", "alur4_judul", "alur4_desc", "visi", "misi"]
  },
  {
    id: 78,
    name: "SUARA_KOMUNITAS",
    category: "16. Portal Publik & Web",
    description: "Suara Komunitas Rombel, testimoni, masukan, dan harapan alumni/ortu/masyarakat",
    primaryKey: "id",
    headers: ["id", "nama", "peran", "teks", "status", "tanggal", "createdAt"]
  },

  // =========================================================================
  // SIDEBAR 18: PENGATURAN SYSTEM (79-84)
  // =========================================================================
  {
    id: 79,
    name: "SETTING",
    category: "18. Pengaturan System",
    description: "Pengaturan umum aplikasi, identitas sekolah, dan preferensi sistem",
    primaryKey: "Key",
    headers: ["Key", "Value", "Deskripsi", "Kategori", "UpdatedAt"]
  },
  {
    id: 80,
    name: "REFERENSI",
    category: "18. Pengaturan System",
    description: "Data referensi master kode (agama, status, jenis dokumen, dll)",
    primaryKey: "Kode",
    headers: ["Kategori", "Kode", "Nama", "Urutan", "Keterangan", "Aktif"]
  },
  {
    id: 81,
    name: "USERS",
    category: "18. Pengaturan System",
    description: "Akun login pengguna (Admin, Kepala Sekolah, Guru, Staf, Siswa, Wali Murid)",
    primaryKey: "UserID",
    headers: ["UserID", "Username", "Password", "RoleID", "Nama", "NIP_NISN", "Email", "NoHP", "Status", "LastLogin", "Token", "CreatedAt", "UpdatedAt"]
  },
  {
    id: 82,
    name: "ROLE",
    category: "18. Pengaturan System",
    description: "Definisi tingkatan hak akses / peran dalam sistem (32 role)",
    primaryKey: "RoleID",
    headers: ["RoleID", "NamaRole", "Kategori", "Keterangan", "JumlahUser", "Aktif"]
  },
  {
    id: 83,
    name: "HAK_AKSES",
    category: "18. Pengaturan System",
    description: "Matriks perizinan Create, Read, Update, Delete, Approve, Export, Import per Role",
    primaryKey: "HakAksesID",
    headers: ["HakAksesID", "RoleID", "MenuID", "Create", "Read", "Update", "Delete", "Approve", "Export", "Import"]
  },
  {
    id: 84,
    name: "MENU",
    category: "18. Pengaturan System",
    description: "Struktur navigasi modul dan susunan menu sistem",
    primaryKey: "MenuID",
    headers: ["MenuID", "ParentID", "NamaMenu", "Icon", "URL", "Urutan", "Status"]
  }
];

export const MASTER_TABLES_60: TableSchema[] = _RAW_MASTER_TABLES.map((t, idx) => ({
  ...t,
  id: idx + 1
}));

export const MASTER_TABLES_88 = MASTER_TABLES_60;
export const MASTER_TABLES_84 = MASTER_TABLES_60;
export const MASTER_TABLES_82 = MASTER_TABLES_60;
export const MASTER_TABLES_78 = MASTER_TABLES_60;
