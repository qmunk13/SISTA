export type Gender = 'L' | 'P';
export type StudentStatus = 'AKTIF' | 'TIDAK AKTIF' | 'BELUM' | 'PINDAH' | 'KELUAR' | 'LULUS' | 'DROP_OUT' | 'MENINGGAL' | 'Aktif' | 'Nonaktif' | string;
export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
export type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'Menunggu' | string;
export type Role = string;

export interface Rombel {
  id: string;
  name?: string;
  nama?: string;
  gradeLevel?: number;
  jenjang?: string | number;
  walikelasId?: string;
  walikelasName?: string;
  homeroomTeacher?: string;
  academicYear?: string;
  quota?: number;
  [key: string]: any;
}

export interface Subject {
  id: string;
  code?: string;
  name?: string;
  nama?: string;
  category?: string;
  kkm: number;
  teacherName?: string;
  [key: string]: any;
}

export interface OrangTua {
  id: string;
  nama: string;
  siswaId: string;
  namaSiswa?: string;
  hubungan?: string;
  noHp?: string;
  pekerjaan?: string;
  alamat?: string;
  [key: string]: any;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  time?: string;
  note?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  subjectId: string;
  semester: 'Ganjil' | 'Genap';
  academicYear: string;
  nilaiTugas: number;
  nilaiUTS: number;
  nilaiUAS: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  catatan?: string;
}

export interface BehaviorRecord {
  id: string;
  studentId: string;
  type: 'Prestasi' | 'Pelanggaran';
  category?: string;
  reporter?: string;
  points: number;
  description: string;
  date: string;
}

export interface FeePayment {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  status: PaymentStatus;
  paymentDate?: string;
  invoiceNo?: string;
}

export interface ScheduleItem {
  id: string;
  rombelId: string;
  subjectId: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface SchoolInfo {
  name: string;
  address: string;
  city: string;
  province: string;
  npsn: string;
  phone: string;
  email: string;
  academicYear: string;
  semesterActive: string;
}

export interface Student {
  id?: string;
  SiswaID?: string;
  nis?: string; // NIS di Rombel KTCT Tambora adalah nopdkt (No. PDKT)
  nopdkt?: string; // Nomor PDKT (Primary Key & NIS)
  noPdkt?: string;
  NoPDKT?: string;
  NIS?: string;
  nisn?: string;
  nik?: string;
  name?: string;
  nama?: string;
  class?: string; // 1A-6C / KelasSaatini
  kelas?: string;
  gender?: Gender | string;
  jenisKelamin?: Gender | string;
  pob?: string; // Tempat Lahir
  dob?: string;  // Tanggal Lahir (YYYY-MM-DD)
  tanggalLahir?: string;
  
  // Data Dapodik & Tambahan Siswa
  tahunMasuk?: string | number;
  TahunMasuk?: string | number;
  tahunAjaran?: string;
  tglLahir?: string;
  jk?: string;
  kelasId?: string;
  anakKe?: string | number;
  saudara?: string | number;
  agama?: string;
  golonganDarah?: string;
  tinggiBadan?: string | number;
  beratBadan?: string | number;
  prestasi?: string;
  hobi?: string;
  catatanPenting?: string;
  
  // Alamat & Domisili
  address?: string;
  alamat?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  provinsi?: string;
  kodePos?: string;
  jenisTinggal?: string;
  alatTransportasi?: string;
  noHp?: string;
  phone?: string;
  email?: string;
  
  // Sekolah & Kelulusan
  sekolahAsal?: string;
  skhun?: string;
  penerimaKps?: string;
  sekolahTujuan?: string;
  tanggalMutasi?: string;
  ijazahNo?: string;
  status?: StudentStatus;

  // Status Bekerja & Pembagian Kelompok Belajar (3x Pertemuan per Minggu)
  statusBekerja?: 'Aktif Bekerja' | 'Tidak Bekerja' | string;
  kelompokBelajar?: 'Aktif Bekerja' | 'Tidak Bekerja' | string; // 'Aktif Bekerja' = Shift Malam, 'Tidak Bekerja' = Shift Siang
  pekerjaanSiswa?: string;
  namaTempatKerja?: string;
  jamKerjaMulai?: string;
  jamKerjaSelesai?: string;
  suratKeteranganKerjaUrl?: string; // Bukti surat keterangan kerja / ID Card / Slip Gaji / Surat Pernyataan
  statusVerifikasiKerja?: 'Terverifikasi' | 'Menunggu Verifikasi' | 'Belum Ada Bukti' | 'Ditolak' | string;
  catatanVerifikasiKerja?: string;

  // Konfirmasi & Dispensasi Validasi Dapodik (Duplikasi Sah / Kasus Khusus)
  approvedDuplicateNisn?: boolean;
  approvedDuplicateNik?: boolean;
  dapodikNotes?: string;

  // Data Orang Tua / Wali
  parentName?: string;
  parentPhone?: string;
  fatherName?: string;
  NamaIbu?: string;
  fatherJob?: string;
  motherJob?: string;
  noKk?: string;
  namaAyah?: string;
  nikAyah?: string;
  tempatLahirAyah?: string;
  tanggalLahirAyah?: string;
  pendidikanAyah?: string;
  pekerjaanAyah?: string;
  penghasilanAyah?: string;
  tlpAyah?: string;
  statusAyah?: 'Masih Hidup' | 'Meninggal' | string;

  namaIbu?: string;
  nikIbu?: string;
  tempatLahirIbu?: string;
  tanggalLahirIbu?: string;
  pendidikanIbu?: string;
  pekerjaanIbu?: string;
  penghasilanIbu?: string;
  tlpIbu?: string;
  statusIbu?: 'Masih Hidup' | 'Meninggal' | string;

  statusYatim?: 'Lengkap' | 'Yatim' | 'Piatu' | 'Yatim Piatu' | string;

  namaWali?: string;
  tempatLahirWali?: string;
  tglLahirWali?: string;
  pendidikanWali?: string;
  pekerjaanWali?: string;
  penghasilanWali?: string;
  hubunganWali?: string;
  tlpWali?: string;

  // Link Berkas Digital Google Drive (Berkas Resmi & Berkas Tambahan)
  fotoUrl?: string;          // 1. Pas Foto Siswa (3x4 / 4x6)
  pasFoto?: string;          // alias
  aktaKelahiranUrl?: string; // 2. Akta Kelahiran
  akteUrl?: string;          // alias
  kartuKeluargaUrl?: string; // 3. Kartu Keluarga (KK)
  kkUrl?: string;            // alias
  kiaUrl?: string;           // 4. KIA / KTP Anak
  ktpAnakUrl?: string;       // alias
  ktpAyahUrl?: string;       // 5. KTP Ayah Kandung
  ktpIbuUrl?: string;        // 6. KTP Ibu Kandung
  ijazahUrl?: string;        // 7. Ijazah / SKL
  ktpWaliUrl?: string;       // 8. KTP Wali Murid
  raporUrl?: string;         // 9. Buku Rapor / Nilai
  rapotUrl?: string;         // alias
  suratPindahUrl?: string;   // 10. Surat Pindah / Mutasi
  suKetUrl?: string;         // 11. Surat Keterangan (SuKet)
  dokumenLainUrl?: string;   // alias
  dokumenLainName?: string;
  suratDomisiliUrl?: string; // 12. Surat Domisili / KIP / Lainnya
  kipUrl?: string;
  formPendaftaranUrl?: string; // 13. Form Pendaftaran / Formulir Siswa
  formUrl?: string;            // alias
  suratPernyataanUrl?: string; // 14. Surat Pernyataan (S.Pernyataan)
  sPernyataanUrl?: string;     // alias
  pernyataanUrl?: string;      // alias
  suratKesanggupanUrl?: string; // 15. Surat Kesanggupan (S.Kesanggupan)
  sKesanggupanUrl?: string;     // alias
  kesanggupanUrl?: string;      // alias
  berkasLainnyaUrl?: string;   // Berkas lainnya url
  berkasLainnyaName?: string;  // Berkas lainnya name
  customDocs?: Array<{
    id: string;
    name: string;
    url: string;
    uploadDate?: string;
    category?: string;
    fileType?: string;
  }>;
  berkasUrl?: string;

  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type PendaftarSPMB = Pendaftar;

export interface Teacher {
  id: string;
  nip?: string;
  nik?: string;
  nuptk?: string;
  name?: string;
  nama?: string;
  username?: string;
  gelar?: string;
  gender?: 'L' | 'P' | string;
  jenisKelamin?: 'L' | 'P' | string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  alamat?: string;
  class?: string; // Walikelas kelas berapa, e.g. "1A", "None", atau Jabatan
  kelas?: string;
  phone?: string;
  noHp?: string;
  email?: string;
  pendidikan?: string;
  jurusan?: string;
  jabatan?: string;
  waliKelas?: string;
  statusKepegawaian?: string;
  tmt?: string;
  status?: 'Aktif' | 'Nonaktif' | string;
  fotoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Settings {
  scriptUrl?: string;
  gasUrl?: string;
  spreadsheetId?: string;
  folderId?: string;
  folderSiswaId?: string;
  appName?: string;
  adminUsername?: string;
  adminPassword?: string;
  schoolLogoUrl?: string;
  logoUrl?: string;
  tahunPelajaran?: string;
  semester?: string;
  schoolName?: string;
  namaSekolah?: string;
  schoolPrincipal?: string;
  schoolPrincipalNip?: string;
  npsn?: string;
  alamat?: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  kodePos?: string;
  telepon?: string;
  kontak?: string;
  email?: string;
  website?: string;
  kepalaSekolah?: string;
  nipKepalaSekolah?: string;
  [key: string]: any;
}

export interface AppState {
  isAuthenticated: boolean;
  students: Student[];
  teachers: Teacher[];
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  updateStudentsBulk: (updates: {id: string, data: Partial<Student>}[]) => void;
  deleteStudent: (id: string) => void;
  setTeachers: (teachers: Teacher[]) => void;
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  setSettings: (settings: Settings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  lastSyncedAt?: string | null;
  isSyncingGlobal?: boolean;
  setLastSyncedAt: (time: string | null) => void;
  setIsSyncingGlobal: (syncing: boolean) => void;
  clearAllData: () => void;
  user?: User | any;
}

export interface Jurusan {
  id?: string;
  JurusanID: string;
  NamaJurusan: string;
  Kode?: string;
  Keterangan?: string;
  [key: string]: any;
}

export interface SPMBPendaftar {
  id?: string;
  PendaftarID?: string;
  NoPendaftaran?: string;
  kodePendaftaran?: string;
  nama?: string;
  Nama?: string;
  nisn?: string;
  NISN?: string;
  nik?: string;
  NIK?: string;
  jk?: string;
  JK?: string;
  tglLahir?: string;
  TanggalLahir?: string;
  TempatLahir?: string;
  status?: 'Pending' | 'Diterima' | 'Ditolak' | 'Perbaikan' | 'Tidak Diterima' | string;
  Status?: 'Pending' | 'Diterima' | 'Ditolak' | 'Perbaikan' | 'Tidak Diterima' | string;
  tanggalDaftar?: string;
  TanggalDaftar?: string;
  agama?: string;
  Agama?: string;
  alamat?: string;
  Alamat?: string;
  namaAyah?: string;
  NamaAyah?: string;
  namaIbu?: string;
  NamaIbu?: string;
  noHp?: string;
  NoHP?: string;
  Email?: string;
  email?: string;
  Program?: string;
  Jalur?: string;
  AsalSekolah?: string;
  fileUrls?: Record<string, string>;
  [key: string]: any;
}

export interface WebConfig {
  appName?: string;
  subJudulNavbar?: string;
  judulSidebar?: string;
  logoUrl?: string;
  profileImageUrl?: string;
  kepalaSekolahImageUrl?: string;
  beritaImageUrl?: string;
  heroImageUrl?: string;
  teksHero?: string;
  heroBaris1?: string;
  heroBaris2?: string;
  heroSubteks?: string;
  footerJudul?: string;
  footerAlamat?: string;
  footerTelepon?: string;
  footerEmail?: string;
  footerHakCipta?: string;
  linkFb?: string;
  linkIg?: string;
  linkYt?: string;
  linkTg?: string;
  pendaftaranStatus?: 'dibuka' | 'ditutup' | 'buka' | 'tutup' | string;
  runningText?: string;
  alur1_judul?: string;
  alur1_desc?: string;
  alur2_judul?: string;
  alur2_desc?: string;
  alur3_judul?: string;
  alur3_desc?: string;
  alur4_judul?: string;
  alur4_desc?: string;
  visi?: string;
  misi?: string;
  [key: string]: any;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'file' | 'textarea' | string;
  options?: string;
  show: boolean;
  required: boolean;
  grid?: string | number;
  modul?: string; // e.g. 'SPMB' | 'SISWA' | 'GURU' | 'KEUANGAN' | 'SARPRAS' | 'BK' | 'SURAT' | 'SEMUA';
  formId?: string; // e.g. 'pendaftaran' | 'biodata' | 'custom';
  placeholder?: string;
  urutan?: number;
  keterangan?: string;
}

export type Siswa = Student;

// 1. Perpustakaan Digital (E-Perpus)
export interface BookItem {
  id: string;
  kodeBuku: string;
  isbn?: string;
  judul: string;
  pengarang?: string;
  penulis?: string;
  penerbit?: string;
  tahunTerbit: string | number;
  kategori: 'Buku Paket/Pelajaran' | 'Referensi/Kamus' | 'Novel/Fiksi' | 'Ensiklopedia' | 'Karya Ilmiah' | 'Majalah' | 'Lainnya' | string;
  lokasiRak?: string;
  rak?: string;
  halaman?: number;
  jumlah?: number;
  stok?: number;
  stokTotal?: number;
  stokTersedia?: number;
  deskripsi?: string;
  coverUrl?: string;
  pdfUrl?: string;
  bahasa?: string;
  status?: 'Tersedia' | 'Dipinjam' | 'Habis' | 'Perbaikan' | string;
  createdAt?: string;
}

export interface BookLoan {
  id: string;
  kodePeminjaman?: string;
  bukuId?: string;
  bukuJudul?: string;
  kodeBuku?: string;
  judulBuku?: string;
  peminjamId?: string;
  namaPeminjam?: string;
  peminjamNama?: string;
  tipePeminjam?: 'Siswa' | 'Guru' | 'Staf' | string;
  peminjamType?: 'Siswa' | 'Guru' | 'Staf' | string;
  kelasOrDepartemen?: string;
  peminjamKelas?: string;
  tanggalPinjam: string;
  tenggatKembali?: string;
  tanggalKembaliRencana?: string;
  tanggalKembali?: string;
  status: 'Dipinjam' | 'Kembali' | 'Terlambat' | 'Hilang' | string;
  statusDenda?: string;
  denda?: number;
  catatan?: string;
  petugas?: string;
  createdAt?: string;
}

export type BookLoanItem = BookLoan;

export interface DendaRecord {
  id: string;
  loanId?: string;
  peminjamanId?: string;
  namaPeminjam?: string;
  peminjamNama?: string;
  peminjamKelas?: string;
  judulBuku?: string;
  bukuJudul?: string;
  nominal: number;
  status: 'Lunas' | 'Belum Lunas' | string;
  tanggal?: string;
  tanggalDenda?: string;
  tanggalBayar?: string;
  hariTerlambat?: number;
  petugas?: string;
  keterangan?: string;
}

// 2. Notifikasi WhatsApp Gateway
export interface WhatsAppMessage {
  id: string;
  kategori: 'Presensi' | 'Tagihan' | 'Pengumuman' | 'Akademik' | 'SPMB' | 'Darurat' | 'Lainnya';
  penerimaNama: string;
  penerimaRole: 'Orang Tua' | 'Siswa' | 'Guru' | 'Semua';
  nomorHp: string;
  isiPesan: string;
  status: 'Draft' | 'Terkirim' | 'Gagal';
  waktuKirim: string;
  pengirim?: string;
}

export interface WaTemplate {
  id: string;
  nama?: string;
  namaTemplate?: string;
  kategori: string;
  template?: string;
  pesan?: string;
  variabelTersedia?: string[];
  deskripsi?: string;
}

export interface WaMessageLog {
  id: string;
  waktu: string;
  nomor?: string;
  penerimaNomor?: string;
  namaPenerima?: string;
  penerimaNama?: string;
  penerimaPeran?: string;
  pesan: string;
  status: 'Terkirim' | 'Gagal' | 'Pending' | string;
  kategori?: string;
  petugas?: string;
}

// 3. Ekstrakurikuler & OSIS
export interface EkskulItem {
  id: string;
  kodeEkskul?: string;
  nama: string;
  kategori: 'Wajib' | 'Pilihan' | 'Keolahragaan' | 'Kesenian & Budaya' | 'Keagamaan' | 'Sains & Teknologi' | 'Kepemimpinan/OSIS' | 'Kepemimpinan' | 'Olahraga' | 'Seni & Budaya' | string;
  pembinaId?: string;
  namaPembina?: string;
  pembinaNama?: string;
  pembinaNip?: string;
  pelatihNama?: string;
  pelatihKontak?: string;
  hariLatihan?: string;
  waktuLatihan?: string;
  jamMulai?: string;
  jamSelesai?: string;
  tempatLatihan?: string;
  lokasi?: string;
  kuota?: number;
  kuotaMaksimal?: number;
  jumlahAnggota?: number;
  deskripsi?: string;
  status: 'Aktif' | 'Nonaktif' | string;
  fotoUrl?: string;
}

export interface EkskulMember {
  id: string;
  ekskulId: string;
  namaEkskul?: string;
  ekskulNama?: string;
  studentId?: string;
  siswaId?: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  jabatan: 'Ketua' | 'Wakil Ketua' | 'Sekretaris' | 'Bendahara' | 'Anggota' | 'Anggota Utama' | string;
  tanggalGabung?: string;
  tanggalBergabung?: string;
  status?: string;
  nilai?: 'A' | 'B' | 'C' | 'D' | string;
  keterangan?: string;
}

export interface EkskulPresensi {
  id: string;
  ekskulId: string;
  tanggal: string;
  materi?: string;
  materiKegiatan?: string;
  instruktur?: string;
  kehadiran?: { studentId: string; status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' }[];
  rekapKehadiran?: any;
}

export interface EkskulNilai {
  id: string;
  studentId?: string;
  siswaId?: string;
  namaSiswa?: string;
  kelas?: string;
  ekskulId: string;
  ekskulNama?: string;
  nilai?: string;
  predikat?: string;
  keterangan?: string;
  deskripsi?: string;
  deskripsiCapaian?: string;
  semester?: string;
  tahunAjaran?: string;
  tanggalInput?: string;
}

export type EkskulNilaiRapor = EkskulNilai;

export interface OsisMember {
  id: string;
  studentId?: string;
  siswaId?: string;
  namaSiswa: string;
  nis?: string;
  nisn?: string;
  kelas: string;
  divisi?: string;
  departemen?: string;
  jabatan?: string;
  posisi?: string;
  fotoUrl?: string;
  tugasUtama?: string;
  periode: string;
}

export type OsisPengurus = OsisMember;

export interface OsisProker {
  id: string;
  namaProker?: string;
  namaProgram?: string;
  divisi?: string;
  departemen?: string;
  tanggalPelaksanaan?: string;
  waktuPelaksanaan?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  targetSasaran?: string;
  deskripsi?: string;
  status: 'Rencana' | 'Berjalan' | 'Selesai' | 'Batal' | 'Sedang Berjalan' | 'Perencanaan' | string;
  anggaran: number;
  penanggungJawab?: string;
}

// 4. Mading & Berita Digital Sekolah
export interface MadingItem {
  id: string;
  judul: string;
  kategori: 'Pengumuman' | 'Berita' | 'Prestasi' | 'Agenda' | 'Artikel Siswa' | 'Karya Seni' | string;
  konten: string;
  penulis: string;
  peranPenulis: 'Admin' | 'Guru' | 'OSIS' | 'Siswa' | string;
  tanggal: string;
  status: 'Publish' | 'Draft' | string;
  prioritas?: 'Normal' | 'Penting' | 'Urgent' | string;
  gambarUrl?: string;
  fotoUrl?: string;
  lampiranUrl?: string;
  targetAudiens?: 'Semua' | 'Siswa' | 'Orang Tua' | 'Guru' | 'Publik' | string;
}

export interface MadingPost {
  id: string;
  judul: string;
  kategori: string;
  konten: string;
  ringkasan?: string;
  penulis?: string;
  penulisNama?: string;
  penulisKelas?: string;
  penulisPeran?: string;
  kelas?: string;
  kelasAtauPeran?: string;
  tanggal?: string;
  tanggalTerbit?: string;
  status?: 'Publish' | 'Draft' | string;
  likes?: number;
  sukaCount?: number;
  komentarCount?: number;
  tags?: string[];
  fotoUrl?: string;
  lampiranUrl?: string;
}

export interface MadingPengumuman {
  id: string;
  nomorSurat?: string;
  judul: string;
  tanggal: string;
  targetAudiens?: string;
  sasaran?: string;
  sifat?: 'Biasa' | 'Penting' | 'Rahasia' | 'Segera' | string;
  prioritas?: 'Normal' | 'Penting' | 'Urgent' | 'Biasa' | string;
  isiRingkas?: string;
  konten?: string;
  filePdfUrl?: string;
  lampiranUrl?: string;
  penulis?: string;
  penandatangan?: string;
  jabatanPenandatangan?: string;
  status?: 'Aktif' | 'Arsip' | string;
}

export interface MadingAgenda {
  id: string;
  judul?: string;
  judulKegiatan?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  waktu?: string;
  lokasi: string;
  penanggungJawab?: string;
  kategori: string;
  deskripsi?: string;
  status: 'Rencana' | 'Berlangsung' | 'Selesai' | string;
}

export type StudentProfile = Record<string, any>;
export type WorkInfo = Record<string, any>;
export type StudySchedule = Record<string, any>;
export type StatementDoc = Record<string, any>;
export type FullSubmission = Record<string, any>;
export type StepNumber = number;
export interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot' | 'assistant' | string;
  text: string;
  timestamp?: string | number;
  [key: string]: any;
}

// 5. DAPODIK_VALIDASI Data Structure (14 Standard Columns)
export interface DapodikValidationRecord {
  id?: string;
  ValidasiID: string;
  SiswaID: string;
  NISN: string;
  NIK: string;
  NoKK: string;
  NamaSiswa: string;
  NamaIbuKandung: string;
  TanggalLahir: string;
  StatusDapodik: 'Valid' | 'Residu' | 'Belum Terdata' | 'Siap Sinkron' | 'Peringatan' | string;
  CatatanInvalid: string;
  TglValidasi: string;
  UpdatedAt: string;
  TahunAjaran: string;
  Buktiterdaftar: string;
}

// ==========================================
// UNIFIED ERP & EXTENDED COMPATIBILITY TYPES
// ==========================================
export type UserRole = Role;
export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  role: Role | string;
  name: string;
  status?: 'AKTIF' | 'NONAKTIF' | string;
  passHash?: string;
  nopdkt?: string;
  mustChangePass?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type Guru = Teacher;
export type Kelas = Rombel;
export type Mapel = Subject;
export type MataPelajaran = Subject;

export interface KelasItem {
  id: string;
  nama: string;
  wali?: string;
  aktif?: boolean;
  createdAt?: string;
  jenjang?: string;
  [key: string]: any;
}

export interface AbsensiRecord {
  id: string;
  tanggal: string;
  siswaId?: string;
  nama?: string;
  kelas?: string;
  nisn?: string;
  jamDatang?: string;
  jamMasuk?: string;
  jamPulang?: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | string;
  keterangan?: string;
  alasan?: string;
  buktiFotoUrl?: string;
  jenisIzin?: string;
  statusPersetujuan?: string;
  [key: string]: any;
}

export interface DailyReportSummary {
  tanggal: string;
  totalHadir?: number;
  totalIzin?: number;
  totalSakit?: number;
  totalAlpa?: number;
  persentaseKehadiran?: number;
  totalSiswa?: number;
  izin?: number;
  alpa?: number;
  sakit?: number;
  hadir?: number;
  terlambatCount?: number;
  pulangCepatCount?: number;
  aiInsight?: string;
  kelasSummary?: any;
  [key: string]: any;
}

export interface PengajuanIzin {
  id: string;
  siswaId?: string;
  namaSiswa?: string;
  nama?: string;
  nisn?: string;
  kelas?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  tanggalPengajuan?: string;
  tanggal?: string;
  jenis?: 'Sakit' | 'Izin' | string;
  jenisIzin?: string;
  alasan?: string;
  buktiUrl?: string;
  buktiFotoUrl?: string;
  status?: 'Menunggu' | 'Disetujui' | 'Ditolak' | string;
  statusPersetujuan?: string;
  disetujuiOleh?: string;
  catatanPersetujuan?: string;
  createdAt?: string;
  [key: string]: any;
}

export type SchoolConfig = Settings;
export type Pendaftar = SPMBPendaftar;
export type AbsensiSiswa = AttendanceRecord;
export type SoalCBT = Soal;
export type JadwalUjian = Ujian;
export type BimbinganBK = Bimbingan;
export type PelanggaranBK = Pelanggaran;
export type Buku = BukuPerpus;
export type Holiday = HariLibur;

export interface InventarisBarang {
  id: string;
  kodeBarang?: string;
  namaBarang: string;
  kategori: string;
  kondisi: 'BAIK' | 'RUSAK' | 'PERBAIKAN' | string;
  jumlah: number;
  lokasi: string;
  tanggalInput?: string;
  [key: string]: any;
}

export interface BukuPerpus {
  id: string;
  kodeBuku: string;
  judul: string;
  pengarang: string;
  penerbit: string;
  tahunTerbit: string;
  isbn?: string;
  kategori: string;
  stok: number;
  tersedia: number;
  lokasiRak?: string;
  deskripsi?: string;
  coverUrl?: string;
  [key: string]: any;
}

export interface PeminjamanBuku {
  id: string;
  peminjamId: string;
  namaPeminjam: string;
  tipePeminjam: 'SISWA' | 'GURU' | string;
  bukuId: string;
  judulBuku: string;
  tglPinjam: string;
  tglJatuhTempo: string;
  tglKembali?: string;
  status: 'DIPINJAM' | 'KEMBALI' | 'TERLAMBAT' | string;
  denda?: number;
  catatan?: string;
  [key: string]: any;
}

export interface BarangInventaris {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  kondisi: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | string;
  lokasi: string;
  jumlah: number;
  satuan: string;
  tglPengadaan?: string;
  sumberDana?: string;
  keterangan?: string;
  [key: string]: any;
}

export interface AuditLog {
  id?: string;
  LogID?: string;
  timestamp?: string;
  ts?: string;
  username?: string;
  user?: string;
  who?: string;
  role?: string;
  action?: string;
  detail?: string;
  meta?: any;
  Device?: string;
  ipAddress?: string;
  [key: string]: any;
}

export interface WebGalleryItem {
  id: string;
  judul: string;
  imageUrl: string;
  deskripsi?: string;
  tanggal?: string;
}

export interface WebDownloadItem {
  id: string;
  judul: string;
  deskripsi?: string;
  fileSize?: string;
  fileType?: string;
  fileUrl: string;
  tanggal?: string;
}

export interface Jenjang {
  idKelas: string;
  jenjang: string;
  namaKelas: string;
  status: string;
  keterangan?: string;
}

export interface HariLibur {
  id?: string;
  tanggal: string;
  nama?: string;
  jenis?: string;
  keterangan?: string;
  [key: string]: any;
}

export interface AgendaGuru {
  id?: string;
  idAgenda?: string;
  guruId?: string;
  namaGuru?: string;
  judul: string;
  kategori?: string;
  tanggal: string;
  waktu?: string;
  lokasi?: string;
  keterangan?: string;
}

export interface NilaiSiswa {
  idNilai?: string;
  id?: string;
  nopdkt?: string;
  nisn?: string;
  nis?: string;
  siswaId?: string;
  namaSiswa?: string;
  nama?: string;
  kelasId?: string;
  kelas?: string;
  mapelId?: string;
  mapel?: string;
  guru?: string;
  semester?: string;
  tahunAjaran?: string;
  // Formatif TP
  tp1_1?: number | string;
  tp1_2?: number | string;
  tp2_1?: number | string;
  tp2_2?: number | string;
  tp3_1?: number | string;
  tp3_2?: number | string;
  tp4_1?: number | string;
  tp4_2?: number | string;
  tp5_1?: number | string;
  tp5_2?: number | string;
  rataFormatif?: number;
  // Sumatif LM
  lm1?: number | string;
  lm2?: number | string;
  lm3?: number | string;
  lm4?: number | string;
  lm5?: number | string;
  rataLm?: number;
  // Sumatif STS & SAS
  sts?: number | string;
  sas?: number | string;
  nilaiTugas?: number;
  nilaiUTS?: number;
  nilaiUAS?: number;
  nilaiAkhir?: number;
  kkm?: number;
  predikat?: string;
  statusTuntas?: string;
  capaianKompetensi?: string;
  tanggalPenilaian?: string;
  keterangan?: string;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoiceId?: string;
  nopdkt?: string;
  kelasId?: string;
  tglBayar?: string;
  metode?: string;
  total?: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface DokumenArsip {
  idArsip?: string;
  id?: string;
  noDokumen?: string;
  judulDokumen: string;
  kategori: string;
  tglDokumen?: string;
  fileUrl: string;
  keterangan?: string;
  uploadedBy?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface JenisUjian {
  idAsesmen: string;
  kategori: string;
  jenisAsesmen: string;
  singkatan: string;
  jenjang?: string;
  kelas?: string;
  semester?: string;
  status: string;
  tahunAjaran?: string;
  [key: string]: any;
}

export interface Ujian {
  idJadwal?: string;
  idUjian: string;
  namaUjian?: string;
  mapel: string;
  jenjang?: string;
  kelas: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: number;
  durasiMenit?: number;
  token: string;
  status: 'Draft' | 'Terjadwal' | 'Berlangsung' | 'Selesai' | 'Aktif' | string;
  tahunAjaran?: string;
  jumlahSoal?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface Soal {
  idSoal?: string;
  id?: string | number;
  idUjian?: string;
  BankSoalID?: string;
  DetailSoalID?: string;
  mapel?: string;
  Mapel?: string;
  MataPelajaran?: string;
  'Mata Pelajaran'?: string;
  jenjang?: string;
  Jenjang?: string;
  kelas?: string;
  Kelas?: string;
  tipe?: string;
  TipeSoal?: string;
  soal?: string;
  Pertanyaan?: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  PilihanA?: string;
  PilihanB?: string;
  PilihanC?: string;
  PilihanD?: string;
  PilihanE?: string;
  kunci?: string;
  kunciJawaban?: string;
  KunciJawaban?: string;
  bobot?: number;
  Bobot?: number;
  pembahasan?: string;
  PembahasanRasional?: string;
  [key: string]: any;
}

export type BankSoal = Soal;

export interface HasilUjian {
  id?: string;
  ID_HASIL?: string;
  HasilUjianID?: string;
  idAsesmen?: string;
  ID_UJIAN?: string;
  UjianID?: string;
  NamaUjian?: string;
  JENJANG?: string;
  KELAS?: string;
  Kelas?: string;
  MAPEL?: string;
  NISN?: string;
  NAMA_SISWA?: string;
  NamaSiswa?: string;
  SiswaID?: string;
  NILAI?: number;
  Nilai?: number;
  BENAR?: number;
  Benar?: number;
  SALAH?: number;
  Salah?: number;
  TOTAL_SOAL?: number;
  TotalSoal?: number;
  PELANGGARAN?: number;
  WAKTU_MULAI?: string;
  WAKTU_SELESAI?: string;
  STATUS?: string;
  StatusTuntas?: string;
  TAHUN_AJARAN?: string;
  NILAI_AKHIR?: number;
  DURASI?: number;
  ID_JADWAL?: string;
  CreatedAt?: string;
  [key: string]: any;
}

export interface LogUjian {
  id?: string;
  NO_LOG?: number;
  NISN?: string;
  nisn?: string;
  NAMA_SISWA?: string;
  namaSiswa?: string;
  JENJANG?: string;
  jenjang?: string;
  KELAS?: string;
  kelas?: string;
  STATUS?: string;
  status?: string;
  Waktu?: string;
  waktu?: string;
  Pelanggaran?: string | number;
  pelanggaran?: string | number;
  TOKEN?: string;
  token?: string;
  ID_JADWAL?: string;
  idJadwal?: string;
  detail?: string;
  [key: string]: any;
}

export interface Tugas {
  id?: string;
  idTugas: string;
  mapel: string;
  judul: string;
  deskripsi: string;
  kelas: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  durasi?: number;
  tahunAjaran?: string;
  [key: string]: any;
}

export interface HasilTugas {
  id?: string;
  idTugas: string;
  mapel: string;
  kelas: string;
  nopdkt?: string;
  nisn?: string;
  namaSiswa: string;
  nilaiAkhir?: number;
  jawabanEsai?: string;
  status: string;
  tanggal: string;
  catatanGuru?: string;
  [key: string]: any;
}

export interface Absensi {
  id?: string;
  id_Absensi?: string;
  AbsenID?: string;
  tanggal?: string;
  Tanggal?: string;
  nopdkt?: string;
  SiswaID?: string;
  siswaId?: string;
  kelasId?: string;
  KelasID?: string;
  jamDatang?: string;
  JamMasuk?: string;
  JamPulang?: string;
  jamPulang?: string;
  keterangan?: string;
  Keterangan?: string;
  status?: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA' | 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | string;
  Status?: string;
  Lokasi?: string;
  latitude?: number;
  longitude?: number;
  jarakSekolah?: number;
  buktiFoto?: string;
  catatanIzin?: string;
  [key: string]: any;
}

export interface AbsensiSholat {
  id?: string;
  SholatID?: string;
  Tanggal: string;
  SiswaID: string;
  KelasID?: string;
  JenisSholat: 'Dzuhur' | 'Ashar' | 'Dhuha' | string;
  Status: 'Berjamaah' | 'Munfarid' | 'Berhalangan' | string;
  Keterangan?: string;
  [key: string]: any;
}

export interface Nilai {
  id?: string;
  NilaiID?: string;
  SiswaID: string;
  MapelID: string;
  GuruID?: string;
  KelasID: string;
  SemesterID?: string;
  TahunAjaranID?: string;
  JenisNilai?: string;
  Nilai: number;
  KKM?: number;
  Predikat?: string;
  Deskripsi?: string;
  TanggalInput?: string;
  [key: string]: any;
}

export interface Biaya {
  No?: number;
  BiayaID?: string;
  KodeBiaya?: string;
  NamaBiaya?: string;
  Kategori?: string;
  Jenjang?: string;
  Target_Kelas?: string;
  KelasID?: string;
  SiswaID?: string;
  NamaSiswa?: string;
  Nominal?: number;
  Periode?: string;
  Wajib?: string;
  Status?: string;
  Keterangan?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  // Backward compatibility aliases
  id?: string;
  biayaId?: string;
  nama?: string;
  nominal?: number;
  kelasId?: string;
  aktif?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface Tagihan {
  id: string;
  nopdkt: string;
  kelasId: string;
  biayaId?: string;
  namaBiaya: string;
  nominal: number;
  periode: string;
  jatuhTempo: string;
  status: 'LUNAS' | 'BELUM LUNAS' | 'SEBAGIAN' | string;
  paidAt?: string;
  paidBy?: string;
  createdAt?: string;
  paidAmount?: number;
  remainingAmount?: number;
  paymentType?: string;
  namasiswa?: string;
  [key: string]: any;
}

export interface Pembayaran {
  id: string;
  tagihanId?: string;
  nopdkt: string;
  kelasId?: string;
  tglBayar: string;
  metode: string;
  jumlah: number;
  catatan?: string;
  createdBy?: string;
  createdAt?: string;
  invoiceId?: string;
  tagihanIds?: string[];
  namasiswa?: string;
  [key: string]: any;
}

export interface Tabungan {
  id?: string;
  TabunganID?: string;
  nopdkt?: string;
  SiswaID?: string;
  tanggal?: string;
  Tanggal?: string;
  jenis?: 'SETOR' | 'TARIK' | string;
  JenisTransaksi?: 'SETOR' | 'TARIK' | string;
  nominal?: number;
  Debit?: number;
  Kredit?: number;
  Saldo?: number;
  catatan?: string;
  Keterangan?: string;
  createdBy?: string;
  PetugasID?: string;
  createdAt?: string;
  namasiswa?: string;
  inv?: string;
  status?: string;
  Status?: string;
  [key: string]: any;
}

export interface Barang {
  id?: string;
  id_barang: string;
  nama: string;
  kategori: string;
  jumlah: number;
  Lokasi: string;
  Kondisi: string;
  [key: string]: any;
}

export interface PeminjamanBarang {
  id: string;
  siswaId?: string;
  barangId: string;
  tglPinjam: string;
  tglKembali?: string;
  tglDikembalikan?: string;
  status: string;
  [key: string]: any;
}

export interface Bimbingan {
  id: string;
  'No.PDKT'?: string;
  nopdkt?: string;
  nama_siswa?: string;
  namaSiswa?: string;
  siswaId?: string;
  kelasId: string;
  tanggal: string;
  jenis: string;
  topik: string;
  solusi: string;
  guruWali?: string;
  [key: string]: any;
}

export interface Pelanggaran {
  id?: string;
  ID_PELANGGARAN?: string;
  ID_UJIAN?: string;
  NISN?: string;
  NAMA_SISWA?: string;
  JENJANG?: string;
  KELAS?: string;
  PELANGGARAN?: string;
  WAKTU?: string;
  TOKEN?: string;
  KETERANGAN?: string;
  poin?: number;
  siswaId?: string;
  kelasId?: string;
  tanggal?: string;
  namaPelanggaran?: string;
  catatan?: string;
  [key: string]: any;
}

export interface LogAktivitas {
  id?: string;
  LogID?: string;
  ts?: string;
  who?: string;
  action?: string;
  meta?: string;
  Device?: string;
  timestamp?: string;
  username?: string;
  role?: string;
  detail?: string;
  ipAddress?: string;
  [key: string]: any;
}

export type JenjangType = 'Paket A' | 'Paket B' | 'Paket C' | string;

export interface UserAccount {
  idUser?: string;
  id?: string;
  username: string;
  nama?: string;
  name?: string;
  role: Role | string;
  email?: string;
  nisnAnak?: string;
  avatar?: string;
  lastLogin?: string;
  status?: string;
  [key: string]: any;
}

export interface QuestionItem {
  idSoal: string;
  idUjian?: string;
  nomorSoal?: number;
  pertanyaan?: string;
  soal?: string;
  pilihanA?: string;
  pilihanB?: string;
  pilihanC?: string;
  pilihanD?: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  kunciJawaban?: string;
  kunci?: string;
  pembahasan?: string;
  gambarUrl?: string;
  gambar?: string;
  bobot?: number;
  status?: string;
  mapel?: string;
  jenjang?: string;
  kelas?: string;
  tipe?: string;
  [key: string]: any;
}

export interface ExamSchedule {
  idJadwal: string;
  idUjian: string;
  mapel: string;
  jenjang: string;
  kelas: string;
  namaKelas?: string;
  tanggal: string;
  tglDisplay?: string;
  hari?: string;
  jamMulai?: string;
  jamSelesai?: string;
  jam?: string;
  durasi: number;
  token?: string;
  status: string;
  tahunAjaran?: string;
  pengawas?: string;
  ruangan?: string;
  semester?: string;
  kategori?: string;
  kategoriBelajar?: string;
  bankSoalId?: string;
  soal?: string;
  statusSoal?: string;
  instruksi?: string;
  [key: string]: any;
}

export interface ExamSubmission {
  idHasil: string;
  idUjian?: string;
  idJadwal?: string;
  nisn: string;
  namaSiswa: string;
  jenjang: string;
  kelas: string;
  mapel: string;
  nilaiMentah: number;
  jmlBenar: number;
  jmlSalah: number;
  totalSoal: number;
  pelanggaran: number;
  nilaiAkhir: number;
  status: string;
  durasiPengerjaan?: string;
  waktuSelesai?: string;
  tahunAjaran?: string;
  jawaban?: Record<number, string>;
  detailSoal?: any[];
  [key: string]: any;
}

export interface ViolationRecord {
  idPelanggaran?: string;
  waktu?: string;
  nisn?: string;
  namaSiswa?: string;
  jenjang?: string;
  kelas?: string;
  pelanggaran?: string;
  token?: string;
  keterangan?: string;
  poin?: number;
  [key: string]: any;
}

export interface NotificationItem {
  id: string;
  judul: string;
  pesan: string;
  tipe: 'INFO' | 'JADWAL' | 'PERINGATAN' | 'NILAI' | string;
  waktu: string;
  dibaca: boolean;
  targetRole?: 'ALL' | 'SISWA' | 'ORANG_TUA' | string;
  [key: string]: any;
}

export interface IndividualStatAnalysis {
  nisn?: string;
  nama?: string;
  kelas?: string;
  totalUjianDiikuti?: number;
  rataRataNilai: number;
  rataRataMentah?: number;
  totalPelanggaran?: number;
  integritasScore: number;
  statusKelulusan?: string;
  kekuatan?: string[];
  areaPerbaikan?: string[];
  rekomendasi: string[];
  mapelBreakdown?: any[];
  riwayatPerkembangan?: any[];
  totalUjian?: number;
  lulusCount?: number;
  remedialCount?: number;
  [key: string]: any;
}
