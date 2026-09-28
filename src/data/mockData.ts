import {
  User,
  Siswa,
  Guru,
  OrangTua,
  Kelas,
  Mapel,
  SPMBPendaftar,
  Ujian,
  Soal,
  HasilUjian,
  Tugas,
  HasilTugas,
  Absensi,
  Biaya,
  Tagihan,
  Pembayaran,
  Tabungan,
  Barang,
  PeminjamanBarang,
  Bimbingan,
  Pelanggaran,
  LogAktivitas,
  WebConfig,
  WebGalleryItem,
  WebDownloadItem,
  FormFieldConfig,
  LogUjian,
  Jenjang,
  HariLibur,
  AgendaGuru,
  NilaiSiswa,
  Invoice,
  DokumenArsip,
  JenisUjian
} from '../types';

// Requested students data list
export const requestedStudentsData: any[] = [];

// ==========================================
// 57 SHEET PRODUCTION DATABASE STRUCTURE
// ==========================================

// 1. SETTING (Columns: key, value)
export const initialSetting: any[] = [
  { key: 'SISTEM_NAMA', value: 'ERP Rombel KTCT' },
  { key: 'SISTEM_VERSI', value: 'v2.5.0' },
  { key: 'TAHUN_AJARAN_AKTIF', value: '2026/2027' },
  { key: 'SEMESTER_AKTIF', value: 'Ganjil' }
];

// 2. USERS (Columns: id, username, email, password, role, name, status, passHash, nopdkt, mustChangePass, createdAt, updatedAt)
const baseUsers: User[] = [
  { id: 'USR_superadmin', username: 'superadmin', email: 'superadmin@sisko.sch.id', password: 'admin123', role: 'SUPERADMIN', name: 'Super Admin', status: 'AKTIF' },
  { id: 'USR_admin', username: 'admin', email: 'admin@sisko.sch.id', password: 'admin123', role: 'ADMIN', name: 'Administrator', status: 'AKTIF' }
];
export const initialUsers: User[] = baseUsers;

// 3. ROLE (Columns: id, namaRole, deskripsi, level, createdAt)
export const initialRole: any[] = [
  { id: 'ROL_1', namaRole: 'SUPERADMIN', deskripsi: 'Akses Penuh Sistem', level: 1, createdAt: '2026-01-01' },
  { id: 'ROL_2', namaRole: 'ADMIN', deskripsi: 'Administrator Operasional', level: 2, createdAt: '2026-01-01' }
];

// 4. MENU (Columns: idMenu, namaMenu, icon, route, parentMenu, urutan, aktif)
export const initialMenu: any[] = [];

// 5. HAK_AKSES (Columns: id, role, menuId, dapatLihat, dapatTambah, dapatEdit, dapatHapus)
export const initialHakAkses: any[] = [];

// 6. LOGS (Columns: LogID, ts, who, action, meta, Device)
export const initialLogs: LogAktivitas[] = [];

// 7. AUDIT_LOG (Columns: id, timestamp, username, role, action, detail, ipAddress)
export const initialAuditLog: LogAktivitas[] = [];

// 8. NOTIFIKASI (Columns: idNotif, userId, judul, pesan, tipe, status, createdAt)
export const initialNotifikasi: any[] = [];

// 9. SISWA (Columns: nopdkt, Tahun Masuk, NISN, Nama Lengkap, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, NIK, Anak ke, Saudara, Agama, Golongan Darah, Tinggi Badan (cm), Berat Badan (kg), Prestasi, Hobi, Catatan Penting, Alamat, RT, RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos, Jenis Tinggal, Alat Transportasi, Nomor HP Aktif, E-Mail, Asal Sekolah, SKHUN, Penerima KPS, No. KPS, Pas Foto, Nomor Kartu Keluarga, Nama Ayah, NIK Ayah, Tempat Lahir Ayah, Tanggal Lahir Ayah, Pendidikan Ayah, Pekerjaan Ayah, Penghasilan Ayah, Tlp. Ayah, Nama Ibu, NIK Ibu, Tempat Lahir Ibu, Tanggal Lahir Ibu, Pendidikan Ibu, Pekerjaan Ibu, Penghasilan Ibu, Tlp. Ibu, Nama Wali, Tempat Lahir Wali, Tanggal Lahir Wali, Pendidikan Wali, Pekerjaan Wali, Penghasilan Wali, Hubungan, Tlp. Wali, Akta Kelahiran, Kartu Keluarga, KTP / KIA, KTP Ayah, KTP Ibu, Ijazah, KTP Wali, Rapor, S. Pindah, Surat Keterangan Domisili dari RT, RW, & Kelurahan, Catatan Berkas, Status Terbaru, Kelas Saat ini)
export const initialSiswa: Siswa[] = [];

// 10. GURU (Columns: GuruID, kelasId, Nama Lengkap, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, NIK, Email, Status, Foto, CreatedAt, UpdatedAt)
export const initialGuru: Guru[] = [];

// 11. ORANG_TUA (Columns: idOrtu, No. PDKT, namaAyah, nikAyah, namaIbu, nikIbu, noHp, namawali, alamat)
export const initialOrangTua: OrangTua[] = [];

// 12. KELAS (Columns: id, nama, wali, aktif, createdAt, jenjang)
export const initialKelas: Kelas[] = [];

// 13. WEB_DOWNLOADS (Columns: id, judul, deskripsi, fileSize, fileType, fileUrl, tanggal)
export const initialWebDownloads: WebDownloadItem[] = [];

// 14. WEB_GALLERY (Columns: id, judul, imageUrl, deskripsi, tanggal)
export const initialWebGallery: WebGalleryItem[] = [];

// 15. FORM_FIELDS (Columns: key, label, type, grid, required, show)
export const initialFormFields: FormFieldConfig[] = [
  // A. DATA DIRI SISWA
  { key: 'nama', label: 'Nama Lengkap Calon Siswa', type: 'text', grid: 12, required: true, show: true },
  { key: 'namaPanggilan', label: 'Nama Panggilan', type: 'text', grid: 6, required: false, show: true },
  { key: 'nisn', label: 'NISN (Nomor Induk Siswa Nasional)', type: 'text', grid: 6, required: false, show: true },
  { key: 'nik', label: 'NIK / No. KTP / KIA', type: 'text', grid: 6, required: true, show: true },
  { key: 'noAkta', label: 'Nomor Registrasi Akta Kelahiran', type: 'text', grid: 6, required: false, show: true },
  { key: 'noKk', label: 'Nomor Kartu Keluarga (KK)', type: 'text', grid: 6, required: true, show: true },
  { key: 'jenisKelamin', label: 'Jenis Kelamin', type: 'dropdown', options: 'Laki-laki, Perempuan', grid: 6, required: true, show: true },
  { key: 'tempatLahir', label: 'Tempat Lahir', type: 'text', grid: 6, required: true, show: true },
  { key: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', grid: 6, required: true, show: true },
  { key: 'agama', label: 'Agama & Kepercayaan', type: 'dropdown', options: 'Islam, Kristen Protestan, Katolik, Hindu, Buddha, Khonghucu, Lainnya', grid: 6, required: true, show: true },
  { key: 'kewarganegaraan', label: 'Kewarganegaraan', type: 'dropdown', options: 'WNI, WNA', grid: 6, required: true, show: true },
  { key: 'anakKe', label: 'Anak Ke-', type: 'number', grid: 6, required: false, show: true },
  { key: 'jumlahSaudara', label: 'Jumlah Saudara Kandung', type: 'number', grid: 6, required: false, show: true },
  { key: 'golonganDarah', label: 'Golongan Darah', type: 'dropdown', options: 'A, B, AB, O, Tidak Tahu', grid: 6, required: false, show: true },
  { key: 'tinggiBadan', label: 'Tinggi Badan (cm)', type: 'number', grid: 6, required: false, show: true },
  { key: 'beratBadan', label: 'Berat Badan (kg)', type: 'number', grid: 6, required: false, show: true },
  { key: 'prestasi', label: 'Prestasi / Bintang Pelajar', type: 'text', grid: 6, required: false, show: true },
  { key: 'hobi', label: 'Hobi / Kegemaran', type: 'text', grid: 6, required: false, show: true },
  { key: 'citaCita', label: 'Cita-Cita Masa Depan', type: 'text', grid: 6, required: false, show: true },
  { key: 'riwayatPenyakit', label: 'Riwayat Penyakit / Kesehatan', type: 'textarea', grid: 12, required: false, show: true },
  { key: 'catatanPenting', label: 'Catatan Khusus / Perhatian Spesial', type: 'textarea', grid: 12, required: false, show: true },

  // B. ALAMAT & DOMISILI SISWA
  { key: 'alamat', label: 'Alamat Lengkap Tempat Tinggal', type: 'textarea', grid: 12, required: true, show: true },
  { key: 'rt', label: 'RT (Rukun Tetangga)', type: 'text', grid: 6, required: false, show: true },
  { key: 'rw', label: 'RW (Rukun Warga)', type: 'text', grid: 6, required: false, show: true },
  { key: 'kelurahan', label: 'Desa / Kelurahan', type: 'text', grid: 6, required: false, show: true },
  { key: 'kecamatan', label: 'Kecamatan', type: 'text', grid: 6, required: false, show: true },
  { key: 'kota', label: 'Kabupaten / Kota', type: 'text', grid: 6, required: false, show: true },
  { key: 'provinsi', label: 'Provinsi', type: 'text', grid: 6, required: false, show: true },
  { key: 'kodePos', label: 'Kode Pos', type: 'text', grid: 6, required: false, show: true },
  { key: 'jenisTinggal', label: 'Jenis Tempat Tinggal', type: 'dropdown', options: 'Bersama Orang Tua, Bersama Wali, Kos / Kontrak, Asrama / Pesantren, Panti Asuhan, Lainnya', grid: 6, required: false, show: true },
  { key: 'jarakSekolah', label: 'Jarak ke Sekolah', type: 'dropdown', options: 'Kurang dari 1 km, 1 - 3 km, 3 - 5 km, Lebih dari 5 km', grid: 6, required: false, show: true },
  { key: 'transportasi', label: 'Moda Transportasi Utama', type: 'dropdown', options: 'Jalan Kaki, Sepeda Motor, Mobil, Angkutan Umum, Ojek Online, Jemputan Sekolah, Lainnya', grid: 6, required: false, show: true },

  // C. AKADEMIK & SEKOLAH ASAL
  { key: 'targetKelas', label: 'Pilihan Program / Kelas Target', type: 'text', grid: 6, required: true, show: true },
  { key: 'tahunMasuk', label: 'Tahun Masuk / Pendaftaran', type: 'number', grid: 6, required: true, show: true },
  { key: 'sekolahAsal', label: 'Nama Sekolah / MDTA Asal', type: 'text', grid: 12, required: false, show: true },
  { key: 'noSkhun', label: 'Nomor Ijazah / SKHUN / SKL', type: 'text', grid: 6, required: false, show: true },
  { key: 'riwayatPendidikan', label: 'Riwayat Pendidikan Sebelumnya', type: 'textarea', grid: 12, required: false, show: true },
  { key: 'penerimaKps', label: 'Penerima Kartu Bantuan (KPS/KIP/PKH)', type: 'dropdown', options: 'Ya, Tidak', grid: 6, required: false, show: true },
  { key: 'noKps', label: 'Nomor Kartu Bantuan (KIP / PKH / KKS / KJP)', type: 'text', grid: 6, required: false, show: true },

  // D. DATA AYAH KANDUNG
  { key: 'namaAyah', label: 'Nama Lengkap Ayah Kandung', type: 'text', grid: 6, required: true, show: true },
  { key: 'nikAyah', label: 'NIK Ayah Kandung', type: 'text', grid: 6, required: false, show: true },
  { key: 'tempatLahirAyah', label: 'Tempat Lahir Ayah', type: 'text', grid: 6, required: false, show: true },
  { key: 'tanggalLahirAyah', label: 'Tanggal Lahir / Tahun Lahir Ayah', type: 'text', grid: 6, required: false, show: true },
  { key: 'pendidikanAyah', label: 'Pendidikan Terakhir Ayah', type: 'dropdown', options: 'SD / Sederajat, SMP / Sederajat, SMA / SMK / Sederajat, D1 / D2 / D3, S1 / D4, S2, S3, Tidak Sekolah', grid: 6, required: false, show: true },
  { key: 'pekerjaanAyah', label: 'Pekerjaan Utama Ayah', type: 'dropdown', options: 'PNS/TNI/Polri, Karyawan Swasta, Wiraswasta, Buruh/Petani, Tidak Bekerja, Lainnya', grid: 6, required: false, show: true },
  { key: 'penghasilanAyah', label: 'Penghasilan Bulanan Ayah', type: 'dropdown', options: 'Kurang dari Rp 1.000.000, Rp 1.000.000 - Rp 3.000.000, Rp 3.000.000 - Rp 5.000.000, Rp 5.000.000 - Rp 10.000.000, Lebih dari Rp 10.000.000', grid: 6, required: false, show: true },
  { key: 'tlpAyah', label: 'No. HP / WhatsApp Ayah', type: 'text', grid: 6, required: false, show: true },

  // E. DATA IBU KANDUNG
  { key: 'namaIbu', label: 'Nama Lengkap Ibu Kandung', type: 'text', grid: 6, required: true, show: true },
  { key: 'nikIbu', label: 'NIK Ibu Kandung', type: 'text', grid: 6, required: false, show: true },
  { key: 'tempatLahirIbu', label: 'Tempat Lahir Ibu', type: 'text', grid: 6, required: false, show: true },
  { key: 'tanggalLahirIbu', label: 'Tanggal Lahir / Tahun Lahir Ibu', type: 'text', grid: 6, required: false, show: true },
  { key: 'pendidikanIbu', label: 'Pendidikan Terakhir Ibu', type: 'dropdown', options: 'SD / Sederajat, SMP / Sederajat, SMA / SMK / Sederajat, D1 / D2 / D3, S1 / D4, S2, S3, Tidak Sekolah', grid: 6, required: false, show: true },
  { key: 'pekerjaanIbu', label: 'Pekerjaan Utama Ibu', type: 'dropdown', options: 'Ibu Rumah Tangga, PNS/TNI/Polri, Karyawan Swasta, Wiraswasta, Buruh/Petani, Lainnya', grid: 6, required: false, show: true },
  { key: 'penghasilanIbu', label: 'Penghasilan Bulanan Ibu', type: 'dropdown', options: 'Tidak Berpenghasilan, Kurang dari Rp 1.000.000, Rp 1.000.000 - Rp 3.000.000, Rp 3.000.000 - Rp 5.000.000, Lebih dari Rp 5.000.000', grid: 6, required: false, show: true },
  { key: 'tlpIbu', label: 'No. HP / WhatsApp Ibu', type: 'text', grid: 6, required: false, show: true },

  // F. DATA WALI & KONTAK DARURAT
  { key: 'namaWali', label: 'Nama Lengkap Wali (Jika Ada)', type: 'text', grid: 6, required: false, show: true },
  { key: 'nikWali', label: 'NIK Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'tempatLahirWali', label: 'Tempat Lahir Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'tanggalLahirWali', label: 'Tanggal Lahir Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'pendidikanWali', label: 'Pendidikan Terakhir Wali', type: 'dropdown', options: 'SD / Sederajat, SMP / Sederajat, SMA / SMK / Sederajat, D1 / D2 / D3, S1 / D4, S2, S3, Tidak Sekolah', grid: 6, required: false, show: true },
  { key: 'pekerjaanWali', label: 'Pekerjaan Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'penghasilanWali', label: 'Penghasilan Bulanan Wali', type: 'dropdown', options: 'Tidak Berpenghasilan, Kurang dari Rp 1.000.000, Rp 1.000.000 - Rp 3.000.000, Rp 3.000.000 - Rp 5.000.000, Lebih dari Rp 5.000.000', grid: 6, required: false, show: true },
  { key: 'hubunganWali', label: 'Hubungan Keluarga Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'tlpWali', label: 'No. HP / WhatsApp Wali', type: 'text', grid: 6, required: false, show: true },
  { key: 'noHp', label: 'No. WhatsApp Utama / Kontak Orang Tua', type: 'number', grid: 6, required: true, show: true },
  { key: 'alamatOrtu', label: 'Alamat Orang Tua / Wali', type: 'textarea', grid: 12, required: false, show: true },

  // G. BERKAS PENDUKUNG DIGITAL (UPLOAD)
  { key: 'pasFoto', label: 'Pas Foto Terbaru Calon Siswa', type: 'file', grid: 12, required: true, show: true },
  { key: 'kartuKeluarga', label: 'Scan Kartu Keluarga (KK)', type: 'file', grid: 12, required: true, show: true },
  { key: 'aktaKelahiran', label: 'Scan Akta Kelahiran', type: 'file', grid: 12, required: true, show: true },
  { key: 'ktpKia', label: 'Scan KTP / KIA Calon Siswa', type: 'file', grid: 12, required: false, show: true },
  { key: 'ktpAyah', label: 'Scan KTP Ayah Kandung', type: 'file', grid: 12, required: false, show: true },
  { key: 'ktpIbu', label: 'Scan KTP Ibu Kandung', type: 'file', grid: 12, required: false, show: true },
  { key: 'ktpWali', label: 'Scan KTP Wali', type: 'file', grid: 12, required: false, show: true },
  { key: 'ijazahSkl', label: 'Scan Ijazah / SKL Sekolah Asal', type: 'file', grid: 12, required: true, show: true },
  { key: 'rapor', label: 'Scan Rapor Terakhir', type: 'file', grid: 12, required: false, show: true },
  { key: 'suratPindah', label: 'Surat Keterangan Pindah (Siswa Mutasi)', type: 'file', grid: 12, required: false, show: true },
  { key: 'suratDomisili', label: 'Surat Keterangan Domisili RT/RW/Kelurahan', type: 'file', grid: 12, required: false, show: true }
];

// 16. WEB_CONFIG
export const initialWebConfig: WebConfig = {
  appName: "ROMBEL KTCT TAMBORA",
  judulSidebar: "SPMB Rombel",
  logoUrl: "/logo_rombel.svg",
  profileImageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600",
  kepalaSekolahImageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
  beritaImageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500",
  heroImageUrl: "https://lh3.googleusercontent.com/d/12ni-mZVyfQauGxLR7IqyWMA_oAv5qPJX",
  teksHero: "Penerimaan Peserta Didik Baru (PPDB 2026/2027)",
  heroBaris1: "Pendidikan Inklusif &",
  heroBaris2: "Berkualitas Di Tambora",
  heroSubteks: "Pusat Pendidikan Inklusif Terpadu Karang Taruna Kecamatan Tambora (Mazas). Mewujudkan kesetaraan akses pendidikan unggul, pengembangan potensi karakter, serta keterampilan digital generasi muda secara berkelanjutan.",
  footerJudul: "ROMBEL KTCT TAMBORA",
  footerAlamat: "Gedung Sasana Krida Karang Taruna , Jl. Laksa II No.12, RT.012 RW.002, Jakarta Barat",
  footerTelepon: "0851-4180-9991",
  footerEmail: "info@rombelktct.sch.id",
  footerHakCipta: "© 2026 Rombongan Belajar Karang Taruna Kecamatan Tambora. Hak Cipta Dilindungi.",
  linkFb: "https://facebook.com/rombelktct",
  linkIg: "https://instagram.com/rombelktct",
  linkYt: "https://youtube.com/rombelktct",
  linkTg: "https://t.me/rombelktct",
  pendaftaranStatus: "dibuka",
  runningText: "🔥 PENDAFTARAN PESERTA DIDIK BARU (PPDB) ROMBEL KTCT TAMBORA TAHUN AJARAN 2026/2027 TELAH DIBUKA! PROGRAM PENDIDIKAN BERBASIS MASYARAKAT (MAZAS). DAFTAR SEKARANG JUGA!",
  alur1_judul: "Isi Formulir",
  alur1_desc: "Isi biodata lengkap Anda secara online dengan mudah.",
  alur2_judul: "Upload Berkas",
  alur2_desc: "Unggah berkas persyaratan wajib seperti KK, Ijazah, dan Pas Foto.",
  alur3_judul: "Verifikasi",
  alur3_desc: "Tim panitia melakukan seleksi dan verifikasi kelayakan dokumen.",
  alur4_judul: "Pengumuman",
  alur4_desc: "Cek pengumuman kelulusan Anda secara transparan di portal ini.",
  visi: "Mewujudkan lembaga pendidikan Mazas yang inklusif dan berkualitas unggul untuk mencetak generasi muda Kecamatan Tambora yang mandiri, berkarakter mulia, cerdas, berdaya saing tinggi, dan berjiwa kepemimpinan.",
  misi: "1. Menyelenggarakan kegiatan belajar mengajar secara holistik, terpadu, dan berorientasi pada kompetensi industri abad ke-21.\n2. Menanamkan nilai-nilai religiusitas, akhlak mulia, disiplin, dan tanggung jawab sosial melalui program pembiasaan ibadah harian.\n3. Menyediakan akses pendidikan Mazas bagi masyarakat dengan dukungan penuh Karang Taruna Tambora.\n4. Membangun kemitraan strategis dengan dunia usaha, perguruan tinggi, dan instansi pemerintahan untuk penyaluran lulusan."
};

// 17. JENJANG (Columns: JenjangID, NamaJenjang, Kode)
export const initialJenjang: Jenjang[] = [
  { idKelas: 'PA4', jenjang: 'PAKET A', namaKelas: 'Kelas 4', status: 'AKTIF', keterangan: 'Setara SD Kelas IV' },
  { idKelas: 'PA5', jenjang: 'PAKET A', namaKelas: 'Kelas 5', status: 'AKTIF', keterangan: 'Setara SD Kelas V' },
  { idKelas: 'PA6', jenjang: 'PAKET A', namaKelas: 'Kelas 6', status: 'AKTIF', keterangan: 'Setara SD Kelas VI' },
  { idKelas: 'PB7', jenjang: 'PAKET B', namaKelas: 'Kelas 7', status: 'AKTIF', keterangan: 'Setara SMP Kelas VII' },
  { idKelas: 'PB8', jenjang: 'PAKET B', namaKelas: 'Kelas 8', status: 'AKTIF', keterangan: 'Setara SMP Kelas VIII' },
  { idKelas: 'PB9', jenjang: 'PAKET B', namaKelas: 'Kelas 9', status: 'AKTIF', keterangan: 'Setara SMP Kelas IX' },
  { idKelas: 'PC10', jenjang: 'PAKET C', namaKelas: 'Kelas 10', status: 'AKTIF', keterangan: 'Setara SMA Kelas X' },
  { idKelas: 'PC11', jenjang: 'PAKET C', namaKelas: 'Kelas 11', status: 'AKTIF', keterangan: 'Setara SMA Kelas XI' },
  { idKelas: 'PC12', jenjang: 'PAKET C', namaKelas: 'Kelas 12', status: 'AKTIF', keterangan: 'Setara SMA Kelas XII' }
];

// 18. MAPEL (Columns: MapelID, Kode, NamaMapel, KKM, GuruID)
export const initialMapel: Mapel[] = [
  { id: 'MPL-001', nama: 'Ujian Praktek', kkm: 75, jenjang: 'Semua Jenjang' },
  { id: 'MPL-002', nama: 'Ujian Vokasi', kkm: 75, jenjang: 'Semua Jenjang' },
  { id: 'MPL-003', nama: 'Pendidikan Agama dan Budi Pekerti', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-004', nama: 'Pendidikan Pancasila / Kewarganegaraan', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-005', nama: 'Bahasa Indonesia', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-006', nama: 'Matematika', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-007', nama: 'Ilmu Pengetahuan Alam', kkm: 75, jenjang: 'Paket B, C' },
  { id: 'MPL-008', nama: 'Ilmu Pengetahuan Sosial', kkm: 75, jenjang: 'Paket B, C' },
  { id: 'MPL-009', nama: 'Pendidikan Jasmani Olahraga dan Kesehatan', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-010', nama: 'Seni Budaya', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-011', nama: 'Bahasa Inggris', kkm: 75, jenjang: 'Paket A, B, C' },
  { id: 'MPL-012', nama: 'Pendidikan Lingkungan dan Budaya Jakarta', kkm: 75, jenjang: 'Paket A' },
  { id: 'MPL-013', nama: 'Baca Tulis', kkm: 75, jenjang: 'Paket A' },
  { id: 'MPL-014', nama: 'Teknologi Informasi dan Komunikasi', kkm: 75, jenjang: 'Paket B, C' }
];

// 19. TAHUN_AJARAN (Columns: id_TA, namaTA, deskripsi, status)
export const initialTahunAjaran: any[] = [
  { id: 'TA-2026', ta: '2026/2027', desc: 'Tahun Ajaran Aktif 2026/2027', status: 'AKTIF' },
  { id: 'TA-2025', ta: '2025/2026', desc: 'Tahun Ajaran 2025/2026', status: 'NONAKTIF' },
  { id: 'TA-2024', ta: '2024/2025', desc: 'Tahun Ajaran 2024/2025', status: 'NONAKTIF' },
  { id: 'TA-2023', ta: '2023/2024', desc: 'Tahun Ajaran 2023/2024', status: 'NONAKTIF' }
];

// 20. SEMESTER (Columns: SemesterID, nama_semester, tipe, status)
export const initialSemester: any[] = [
  { id: 'SEM-1', sem: 'Semester Ganjil 2026/2027', tipe: 'ODD', status: 'AKTIF' },
  { id: 'SEM-2', sem: 'Semester Genap 2026/2027', tipe: 'EVEN', status: 'NONAKTIF' },
  { id: 'SEM-3', sem: 'Semester Ganjil 2025/2026', tipe: 'ODD', status: 'NONAKTIF' },
  { id: 'SEM-4', sem: 'Semester Genap 2025/2026', tipe: 'EVEN', status: 'NONAKTIF' }
];

// 21. HARI_LIBUR (Columns: Tanggal, Nama, Jenis)
export const initialHariLibur: HariLibur[] = [];

// 22. JADWAL (Columns: NO_JADWAL, ID_JADWAL, ID_UJIAN, MAPEL, JENJANG, KELAS, TANGGAL, JAM_MULAI, JAM_SELESAI, DURASI, TOKEN, STATUS, TAHUN_AJARAN)
export const initialJadwal: any[] = [];

// 23. AGENDA (Columns: idAgenda, judul, kategori, tanggal, waktu, lokasi, keterangan)
export const initialAgenda: AgendaGuru[] = [];

// 24. NILAI (Columns: idNilai, nopdkt, kelasId, mapelId, semester, tahunAjaran, nilaiTugas, nilaiUTS, nilaiUAS, nilaiAkhir)
export const initialNilai: NilaiSiswa[] = [];

// 25. RAPOR (Columns: idRapor, nopdkt, kelasId, semester, tahunAjaran, rataRata, peringkat, catatanWali, statusRapor)
export const initialRapor: any[] = [];

// 26. KENAIKAN_KELAS (Columns: id, nopdkt, kelasAsal, kelasTujuan, tahunAjaran, statusKenaikan, tanggal, catatan)
export const initialKenaikanKelas: any[] = [];

// 27. KELULUSAN (Columns: id, nopdkt, tahunLulus, noIjazah, statusKelulusan, tglLulus, catatan)
export const initialKelulusan: any[] = [];

// 28. ABSENSI (Columns: id_Absensi, tanggal, nopdkt, kelasId, jamDatang, JamPulang, keterangan, status, latitude, longitude, jarakSekolah, buktiFoto, catatanIzin, longitude 2)
export const initialAbsensi: Absensi[] = [];

// 29. ABSENSI_GURU (Columns: id, guruId, tanggal, jamMasuk, jamKeluar, status, keterangan, buktiFoto)
export const initialAbsensiGuru: any[] = [];

// 30. QR_LOG (Columns: id, nopdkt, typeScan, timestamp, deviceInfo, status)
export const initialQrLog: any[] = [];

// 31. BANK_SOAL (Columns: idSoal, idUjian, mapel, jenjang, kelas, tipe, soal, gambar, a, b, c, d, kunci, bobot)
export const initialBankSoal: Soal[] = [];

// 32. UJIAN (Columns: idJadwal, idUjian, mapel, jenjang, kelas, tanggal, jamMulai, jamSelesai, durasi, token, status, tahunAjaran)
export const initialUjian: Ujian[] = [];

// 33. LOG_UJIAN (Columns: NO_LOG, NISN, NAMA_SISWA, JENJANG, KELAS, STATUS, Waktu, Pelanggaran, TOKEN, ID_JADWAL)
export const initialLogUjianList: LogUjian[] = [];

// 34. TOKEN (Columns: TokenID, UjianID, Token, Aktif)
export const initialToken: any[] = [];

// 35. DRAFT_JAWABAN (Columns: timestamp, examId, username, jawaban, sisaWaktu)
export const initialDraftJawaban: any[] = [];

// 36. HASIL_UJIAN (Columns: ID_HASIL, idAsesmen, ID_UJIAN, JENJANG, KELAS, MAPEL, NISN, NAMA_SISWA, NILAI, BENAR, SALAH, TOTAL_SOAL, PELANGGARAN, WAKTU_MULAI, STATUS, TAHUN_AJARAN, NILAI_AKHIR, WAKTU_SELESAI, DURASI, ID_JADWAL)
export const initialHasilUjian: HasilUjian[] = [];

// 37. JENIS_UJIAN (Columns: idAsesmen, kategori, jenisAsesmen, singkatan, jenjang, kelas, semester, status)
export const initialJenisUjian: JenisUjian[] = [];

// 38. TUGAS (Columns: idTugas, mapel, judul, deskripsi, kelas, tanggalMulai, tanggalSelesai, durasi, tahunAjaran)
export const initialTugas: Tugas[] = [];

// 39. HASIL_TUGAS (Columns: id, idTugas, mapel, kelas, nopdkt, nisn, namaSiswa, nilaiAkhir, jawabanEsai, status, tanggal, catatanGuru)
export const initialHasilTugas: HasilTugas[] = [];

// 40. ANALISIS_SOAL (Columns: idAnalis, idUjian, mapel, tingkatKesukaran, dayaPembeda, efektivitasPengecoh, statusSoal)
export const initialAnalisisSoal: any[] = [];

// 41. SPMB_PENDAFTAR (Columns: kodePendaftaran, tanggalDaftar, status, nama, nisn, nik, nis, tempatLahir, tglLahir, jk, agama, golonganDarah, tinggiBadan, beratBadan, alamat, namaAyah, pekerjaanAyah, namaIbu, pekerjaanIbu, noHp, alamatOrtu, kelas, tahunMasuk, riwayatPendidikan, prestasi, hobi, catatanPenting, pasFoto, kk, akta, ktpKia, ktpOrtu, ijazah, rapor, domisili, catatanAdmin)
export const initialSPMBPendaftar: SPMBPendaftar[] = [];

// 42. BIAYA (Columns: No, BiayaID, KodeBiaya, NamaBiaya, Kategori, Jenjang, Target_Kelas, KelasID, SiswaID, NamaSiswa, Nominal, Periode, Wajib, Status, Keterangan, CreatedAt, UpdatedAt)
export const initialBiaya: Biaya[] = [];

// 43. TAGIHAN (Columns: id, nopdkt, kelasId, biayaId, namaBiaya, nominal, periode, jatuhTempo, status, paidAt, paidBy, createdAt, paidAmount, remainingAmount, paymentType, namasiswa)
export const initialTagihan: Tagihan[] = [];

// 44. PEMBAYARAN (Columns: id, tagihanId, nopdkt, kelasId, tglBayar, metode, jumlah, catatan, createdBy, createdAt, invoiceId, tagihanIds, namasiswa, Kode PDKT)
export const initialPembayaran: Pembayaran[] = [];

// 45. TABUNGAN (Columns: id, nopdkt, tanggal, jenis, nominal, catatan, createdBy, createdAt, namasiswa, inv)
export const initialTabungan: Tabungan[] = [];

// 46. KAS (Columns: KasID, Tanggal, Jenis, Nominal, Keterangan)
export const initialKas: any[] = [];

// 47. PENGELUARAN (Columns: PengeluaranID, Tanggal, Kategori, Nominal, Keterangan)
export const initialPengeluaran: any[] = [];

// 48. INVOICE (Columns: id, invoiceId, nopdkt, kelasId, tglBayar, metode, total, status, createdBy, createdAt, NAma Siswa)
export const initialInvoice: Invoice[] = [];

// 49. BIMBINGAN (Columns: id, No.PDKT, nama_siswa, kelasId, tanggal, jenis, topik, solusi, guruWali)
export const initialBimbingan: Bimbingan[] = [];

// 50. PELANGGARAN (Columns: ID_PELANGGARAN, ID_UJIAN, NISN, NAMA_SISWA, JENJANG, KELAS, PELANGGARAN, WAKTU, TOKEN, KETERANGAN)
export const initialPelanggaran: Pelanggaran[] = [];

// 51. BARANG (Columns: id_barang, nama, kategori, jumlah, Lokasi, Kondisi)
export const initialBarang: Barang[] = [];

// 52. PEMELIHARAAN (Columns: idPemeliharaan, barangId, tanggal, jenisKerusakan, biaya, status, keterangan)
export const initialPemeliharaan: any[] = [];

// 53. PEMINJAMAN_BARANG (Columns: id, siswaId, barangId, tglPinjam, tglKembali, tglDikembalikan, status)
export const initialPeminjamanBarang: PeminjamanBarang[] = [];

// 54. FILE (Columns: idFile, namaFile, fileUrl, size, mimeType, uploadedBy, createdAt)
export const initialFile: any[] = [];

// 55. ARSIP (Columns: idArsip, noDokumen, judulDokumen, kategori, tglDokumen, fileUrl, keterangan)
export const initialArsip: DokumenArsip[] = [];

// 56. BACKUP (Columns: idBackup, filename, fileUrl, size, createdAt, status)
export const initialBackup: any[] = [];

// 57. RIWAYAT_SISWA (Columns: TAHUN MASUK, NO PDKT, NAMA LENGKAP, JENIS KELAMIN, NISN, KELAS, STATUS, TAHUN AJARAN, KETERANGAN)
export const initialRiwayatSiswa: any[] = [];

// ==========================================
// BACKWARD COMPATIBILITY FALLBACK ALIASES
// (For legacy app modules referencing old exports)
// ==========================================
export const initialSoal: Soal[] = initialBankSoal;
export const initialMasterSiswa: Siswa[] = initialSiswa;
export const initialAbsensiSholat: any[] = [];
export const initialBuku: any[] = [];
export const initialPeminjamanBuku: any[] = [];
export const initialKeuanganConfig: any[] = [];

// ==========================================
// HELPER TSV PARSERS & LOCAL DB UTILS
// ==========================================
export function parseTSVSoal(tsv: string): Soal[] {
  const lines = tsv.trim().split('\n');
  if (lines.length <= 1) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map((line, idx) => {
    const vals = line.split('\t').map(v => v.trim());
    const obj: any = { idSoal: `SOAL_${idx + 1}` };
    headers.forEach((h, i) => {
      if (vals[i] !== undefined) obj[h] = vals[i];
    });
    return obj as Soal;
  });
}

export function parseTSVLogUjian(tsv: string): LogUjian[] {
  const lines = tsv.trim().split('\n');
  if (lines.length <= 1) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map((line, idx) => {
    const vals = line.split('\t').map(v => v.trim());
    const obj: any = { NO_LOG: idx + 1 };
    headers.forEach((h, i) => {
      if (vals[i] !== undefined) obj[h] = vals[i];
    });
    return obj as LogUjian;
  });
}

export function restorePristineTsvStudents() {
  // In-memory purge/reset handled directly via db.ts purgeAllData
}

export function initLocalDatabaseIfEmpty() {
  // Database tables are kept strictly in memory and remote database (Google Apps Script).
  // No operational tables are written to browser localStorage.
}

// Storage service compatibility constants
export const INITIAL_USERS = initialUsers;
export const INITIAL_STUDENTS = initialSiswa;
export const INITIAL_SCHEDULES: any[] = [];
export const INITIAL_QUESTIONS: any[] = [];
export const INITIAL_SUBMISSIONS: any[] = [];
export const INITIAL_VIOLATIONS: any[] = [];
export const INITIAL_NOTIFICATIONS: any[] = [];
