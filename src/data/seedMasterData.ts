// Data Master Seeding: Mapel, Tahun Ajaran, Semester, Hari Libur & Pos Biaya
// Murni Kosong (Empty Default) - Mengambil Sepenuhnya dari Google Spreadsheet

export interface MasterMapelItem {
  id: string;
  mapelId: string;
  kode: string;
  nama: string;
  namaMapel: string;
  kkm: number;
  guruId: string;
  kelompok: string;
  status: string;
  jenjang: string;
  kelas: string;
  guruPengampu: string;
  guru: string;
  jp: number;
  bebanJp: number;
  kategori?: string;
  fase?: string;
}

export interface MasterTahunAjaranItem {
  id: string;
  taId: string;
  tahun: string;
  nama: string;
  tahunAjaran: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  status: string;
  aktif: string;
  deskripsi: string;
  kurikulum: string;
  semester?: string;
  rentang?: string;
  rentangWaktu?: string;
  periode?: string;
  [key: string]: any;
}

export interface MasterSemesterItem {
  id: string;
  semesterId: string;
  nama: string;
  taId: string;
  tahunPelajaran: string;
  tahunAjaran?: string;
  semester: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  aktif: string;
  status?: string;
  tipe: 'ODD' | 'EVEN' | string;
  [key: string]: any;
}

export interface MasterHariLiburItem {
  id: string;
  hariLiburId: string;
  tanggal: string;
  tanggalSelesai: string;
  nama: string;
  agenda?: string;
  jenis: string;
  tahunAjaran: string;
  keterangan: string;
  hari?: string;
}

export interface MasterJenjangItem {
  id: string;
  jenjangId: string;
  kode: string;
  namaJenjang: string;
  nama?: string;
  tingkatAwal: string;
  tingkatTengah?: string;
  tingkatAkhir: string;
  keterangan: string;
  aktif: string;
  status?: string;
}

// Master Jenjang - Murni kosong diambil dari Sheet JENJANG
export const SEED_JENJANG: MasterJenjangItem[] = [];

export interface MasterTarifBiayaItem {
  id: string;
  biayaId: string;
  kode: string;
  kodeBiaya: string;
  namaPos: string;
  namaBiaya: string;
  kategori: string;
  jenjang: string;
  target_Kelas: string;
  kelas: string;
  kelasId: string;
  nominal: number;
  periode: string;
  frekuensi: string;
  wajib: string;
  status: string;
  keterangan: string;
  jurusanId?: string;
}

export interface MasterClassItem {
  id: string;
  kelasId: string;
  cls: string;
  namaKelas: string;
  jenjangId: string;
  tingkat: string;
  waliKelasId: string;
  namaWaliKelas: string;
  namatutor: string;
  wali: string;
  ruangan: string;
  kapasitas: number;
  tahunAjaran: string;
  status: string;
}

// Master Kelas - Murni kosong diambil dari Sheet KELAS di Google Spreadsheet
export const SEED_CLASSES: MasterClassItem[] = [];


// Master Mata Pelajaran - Standard Resmi Kurikulum Merdeka & Kesetaraan Rombel KTCT
export const SEED_MAPEL: MasterMapelItem[] = [
  // 1. Ujian Praktek (Ditambahkan di Sheet MAPEL)
  {
    id: 'MPL-001',
    mapelId: 'MPL-001',
    kode: 'PRAK',
    nama: 'Ujian Praktek',
    namaMapel: 'Ujian Praktek',
    kkm: 75,
    guruId: 'GR_001',
    kelompok: 'Praktik',
    kategori: 'Praktik',
    status: 'AKTIF',
    jenjang: 'Semua Jenjang',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Tim Penguji & Guru Kelas',
    guru: 'Tim Penguji & Guru Kelas',
    jp: 2,
    bebanJp: 2
  },
  // 2. Ujian Vokasi (Ditambahkan di Sheet MAPEL)
  {
    id: 'MPL-002',
    mapelId: 'MPL-002',
    kode: 'VOK',
    nama: 'Ujian Vokasi',
    namaMapel: 'Ujian Vokasi',
    kkm: 75,
    guruId: 'GR_002',
    kelompok: 'Vokasional',
    kategori: 'Vokasional',
    status: 'AKTIF',
    jenjang: 'Semua Jenjang',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Instruktur Vokasi & Keterampilan',
    guru: 'Instruktur Vokasi & Keterampilan',
    jp: 2,
    bebanJp: 2
  },
  // 3. Pendidikan Agama dan Budi Pekerti (Resmi)
  {
    id: 'MPL-003',
    mapelId: 'MPL-003',
    kode: 'PABP',
    nama: 'Pendidikan Agama dan Budi Pekerti',
    namaMapel: 'Pendidikan Agama dan Budi Pekerti',
    kkm: 75,
    guruId: 'GR_003',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Agama',
    guru: 'Guru Agama',
    jp: 2,
    bebanJp: 2
  },
  // 4. Pendidikan Pancasila / Kewarganegaraan (Resmi)
  {
    id: 'MPL-004',
    mapelId: 'MPL-004',
    kode: 'PPKN',
    nama: 'Pendidikan Pancasila / Kewarganegaraan',
    namaMapel: 'Pendidikan Pancasila / Kewarganegaraan',
    kkm: 75,
    guruId: 'GR_004',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru PPKN',
    guru: 'Guru PPKN',
    jp: 2,
    bebanJp: 2
  },
  // 5. Bahasa Indonesia
  {
    id: 'MPL-005',
    mapelId: 'MPL-005',
    kode: 'IND',
    nama: 'Bahasa Indonesia',
    namaMapel: 'Bahasa Indonesia',
    kkm: 75,
    guruId: 'GR_005',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Bahasa Indonesia',
    guru: 'Guru Bahasa Indonesia',
    jp: 2,
    bebanJp: 2
  },
  // 6. Matematika
  {
    id: 'MPL-006',
    mapelId: 'MPL-006',
    kode: 'MTK',
    nama: 'Matematika',
    namaMapel: 'Matematika',
    kkm: 75,
    guruId: 'GR_006',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Matematika',
    guru: 'Guru Matematika',
    jp: 2,
    bebanJp: 2
  },
  // 7. Ilmu Pengetahuan Alam (IPA Resmi)
  {
    id: 'MPL-007',
    mapelId: 'MPL-007',
    kode: 'IPA',
    nama: 'Ilmu Pengetahuan Alam',
    namaMapel: 'Ilmu Pengetahuan Alam',
    kkm: 75,
    guruId: 'GR_007',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket B, C',
    kelas: '7,8,9,10,11,12',
    guruPengampu: 'Guru IPA',
    guru: 'Guru IPA',
    jp: 2,
    bebanJp: 2
  },
  // 8. Ilmu Pengetahuan Sosial (IPS Resmi)
  {
    id: 'MPL-008',
    mapelId: 'MPL-008',
    kode: 'IPS',
    nama: 'Ilmu Pengetahuan Sosial',
    namaMapel: 'Ilmu Pengetahuan Sosial',
    kkm: 75,
    guruId: 'GR_008',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket B, C',
    kelas: '7,8,9,10,11,12',
    guruPengampu: 'Guru IPS',
    guru: 'Guru IPS',
    jp: 2,
    bebanJp: 2
  },
  // 9. Pendidikan Jasmani Olahraga dan Kesehatan (PJOK Resmi)
  {
    id: 'MPL-009',
    mapelId: 'MPL-009',
    kode: 'PJOK',
    nama: 'Pendidikan Jasmani Olahraga dan Kesehatan',
    namaMapel: 'Pendidikan Jasmani Olahraga dan Kesehatan',
    kkm: 75,
    guruId: 'GR_009',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Penjas',
    guru: 'Guru Penjas',
    jp: 2,
    bebanJp: 2
  },
  // 10. Seni Budaya
  {
    id: 'MPL-010',
    mapelId: 'MPL-010',
    kode: 'SBD',
    nama: 'Seni Budaya',
    namaMapel: 'Seni Budaya',
    kkm: 75,
    guruId: 'GR_010',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Seni',
    guru: 'Guru Seni',
    jp: 2,
    bebanJp: 2
  },
  // 11. Bahasa Inggris
  {
    id: 'MPL-011',
    mapelId: 'MPL-011',
    kode: 'ING',
    nama: 'Bahasa Inggris',
    namaMapel: 'Bahasa Inggris',
    kkm: 75,
    guruId: 'GR_011',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket A, B, C',
    kelas: '4,5,6,7,8,9,10,11,12',
    guruPengampu: 'Guru Bahasa Inggris',
    guru: 'Guru Bahasa Inggris',
    jp: 2,
    bebanJp: 2
  },
  // 12. Pendidikan Lingkungan dan Budaya Jakarta (PLBJ Resmi)
  {
    id: 'MPL-012',
    mapelId: 'MPL-012',
    kode: 'PLBJ',
    nama: 'Pendidikan Lingkungan dan Budaya Jakarta',
    namaMapel: 'Pendidikan Lingkungan dan Budaya Jakarta',
    kkm: 75,
    guruId: 'GR_012',
    kelompok: 'Muatan Lokal',
    kategori: 'Muatan Lokal',
    status: 'AKTIF',
    jenjang: 'Paket A',
    kelas: '4,5,6',
    guruPengampu: 'Guru PLBJ',
    guru: 'Guru PLBJ',
    jp: 2,
    bebanJp: 2
  },
  // 13. Baca Tulis (Ditambahkan HANYA untuk Kelas 4, 5 dan 6)
  {
    id: 'MPL-013',
    mapelId: 'MPL-013',
    kode: 'BT',
    nama: 'Baca Tulis',
    namaMapel: 'Baca Tulis',
    kkm: 75,
    guruId: 'GR_013',
    kelompok: 'Muatan Lokal',
    kategori: 'Muatan Lokal',
    status: 'AKTIF',
    jenjang: 'Paket A',
    kelas: '4,5,6',
    guruPengampu: 'Guru Literasi & Kelas',
    guru: 'Guru Literasi & Kelas',
    jp: 2,
    bebanJp: 2
  },
  // 14. Teknologi Informasi dan Komunikasi (TIK Resmi)
  {
    id: 'MPL-014',
    mapelId: 'MPL-014',
    kode: 'TIK',
    nama: 'Teknologi Informasi dan Komunikasi',
    namaMapel: 'Teknologi Informasi dan Komunikasi',
    kkm: 75,
    guruId: 'GR_014',
    kelompok: 'Pilihan Khusus',
    kategori: 'Pilihan Khusus',
    status: 'AKTIF',
    jenjang: 'Paket B, C',
    kelas: '7,8,9,10,11,12',
    guruPengampu: 'Guru TIK & Komputer',
    guru: 'Guru TIK & Komputer',
    jp: 2,
    bebanJp: 2
  },
  // 15. Sejarah (Paket C)
  {
    id: 'MPL-015',
    mapelId: 'MPL-015',
    kode: 'SEJ',
    nama: 'Sejarah',
    namaMapel: 'Sejarah',
    kkm: 75,
    guruId: 'GR_015',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket C',
    kelas: '10,11,12',
    guruPengampu: 'Guru Sejarah',
    guru: 'Guru Sejarah',
    jp: 2,
    bebanJp: 2
  },
  // 16. Geografi (Paket C)
  {
    id: 'MPL-016',
    mapelId: 'MPL-016',
    kode: 'GEO',
    nama: 'Geografi',
    namaMapel: 'Geografi',
    kkm: 75,
    guruId: 'GR_016',
    kelompok: 'Pilihan Khusus',
    kategori: 'Pilihan Khusus',
    status: 'AKTIF',
    jenjang: 'Paket C',
    kelas: '10,11,12',
    guruPengampu: 'Guru Geografi',
    guru: 'Guru Geografi',
    jp: 2,
    bebanJp: 2
  },
  // 17. Ekonomi (Paket C)
  {
    id: 'MPL-017',
    mapelId: 'MPL-017',
    kode: 'EKO',
    nama: 'Ekonomi',
    namaMapel: 'Ekonomi',
    kkm: 75,
    guruId: 'GR_017',
    kelompok: 'Pilihan Khusus',
    kategori: 'Pilihan Khusus',
    status: 'AKTIF',
    jenjang: 'Paket C',
    kelas: '10,11,12',
    guruPengampu: 'Guru Ekonomi',
    guru: 'Guru Ekonomi',
    jp: 2,
    bebanJp: 2
  },
  // 18. Sosiologi (Paket C)
  {
    id: 'MPL-018',
    mapelId: 'MPL-018',
    kode: 'SOS',
    nama: 'Sosiologi',
    namaMapel: 'Sosiologi',
    kkm: 75,
    guruId: 'GR_018',
    kelompok: 'Pilihan Khusus',
    kategori: 'Pilihan Khusus',
    status: 'AKTIF',
    jenjang: 'Paket C',
    kelas: '10,11,12',
    guruPengampu: 'Guru Sosiologi',
    guru: 'Guru Sosiologi',
    jp: 2,
    bebanJp: 2
  },
  // 19. Pemberdayaan (Paket B & C)
  {
    id: 'MPL-019',
    mapelId: 'MPL-019',
    kode: 'PBD',
    nama: 'Pemberdayaan',
    namaMapel: 'Pemberdayaan',
    kkm: 75,
    guruId: 'GR_019',
    kelompok: 'Wajib Khusus',
    kategori: 'Wajib Khusus',
    status: 'AKTIF',
    jenjang: 'Paket B, C',
    kelas: '7,8,9,10,11,12',
    guruPengampu: 'Guru Pemberdayaan',
    guru: 'Guru Pemberdayaan',
    jp: 2,
    bebanJp: 2
  },
  // 20. Prakarya (Paket B)
  {
    id: 'MPL-020',
    mapelId: 'MPL-020',
    kode: 'PRA',
    nama: 'Prakarya',
    namaMapel: 'Prakarya',
    kkm: 75,
    guruId: 'GR_020',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket B',
    kelas: '7,8,9',
    guruPengampu: 'Guru Prakarya',
    guru: 'Guru Prakarya',
    jp: 2,
    bebanJp: 2
  },
  // 21. Sejarah Indonesia (Paket C)
  {
    id: 'MPL-021',
    mapelId: 'MPL-021',
    kode: 'SEJI',
    nama: 'Sejarah Indonesia',
    namaMapel: 'Sejarah Indonesia',
    kkm: 75,
    guruId: 'GR_021',
    kelompok: 'Wajib',
    kategori: 'Wajib Nasional',
    status: 'AKTIF',
    jenjang: 'Paket C',
    kelas: '10,11,12',
    guruPengampu: 'Guru Sejarah Indonesia',
    guru: 'Guru Sejarah Indonesia',
    jp: 2,
    bebanJp: 2
  }
];

// Master Tahun Ajaran - Murni kosong diambil dari Sheet TAHUN_AJARAN
export const SEED_TAHUN_AJARAN: MasterTahunAjaranItem[] = [];

// Master Semester - Murni kosong diambil dari Sheet SEMESTER
export const SEED_SEMESTER: MasterSemesterItem[] = [];

// Master Hari Libur - Murni kosong diambil dari Sheet HARI_LIBUR
export const SEED_HARI_LIBUR: MasterHariLiburItem[] = [];

// Master Pos Biaya - Kosong (dikelola secara eksklusif di modul Keuangan)
export const SEED_TARIF_BIAYA: MasterTarifBiayaItem[] = [];

