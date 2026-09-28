/**
 * Master Referensi Lengkap Jenis Ujian CBT & Asesmen Pendidikan Nasional & Kurikulum Merdeka
 * Sesuai Permendikbudristek & Kurikulum Operasional Satuan Pendidikan (KOSP)
 */

export interface JenisUjianItem {
  id: string;
  nama: string;
  alias: string[];
  kategori: 'Sumatif' | 'Formatif' | 'Nasional' | 'Sekolah' | 'Khusus' | 'Diagnostik';
  keterangan: string;
  durasiStandarMenit: number;
  badgeBg: string;
  badgeText: string;
  isOfficialSchedule: boolean; // Masuk ke Jadwal & Sesi Ujian CBT resmi
  isAssignment: boolean; // Masuk ke Penugasan KBM jika dibuat
}

export const JENIS_UJIAN_LENGKAP: JenisUjianItem[] = [
  {
    id: 'STS',
    nama: 'Sumatif Tengah Semester (STS) / UTS',
    alias: ['STS', 'UTS', 'Sumatif Tengah Semester', 'STS (Tengah Semester)'],
    kategori: 'Sumatif',
    keterangan: 'Asesmen sumatif tengah semester untuk mengukur capaian pembelajaran 3 bulan pertama.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'SAS',
    nama: 'Sumatif Akhir Semester (SAS / ASAS) / UAS',
    alias: ['SAS', 'ASAS', 'UAS', 'Sumatif Akhir Semester', 'ASAS (Akhir Semester)'],
    kategori: 'Sumatif',
    keterangan: 'Asesmen sumatif akhir semester ganjil untuk pelaporan capaian hasil belajar di Rapor.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'SAT',
    nama: 'Sumatif Akhir Tahun (SAT / ASAT) / UKK',
    alias: ['SAT', 'ASAT', 'UKK', 'PAT', 'Sumatif Akhir Tahun', 'Kenaikan Kelas'],
    kategori: 'Sumatif',
    keterangan: 'Asesmen sumatif akhir tahun genap sebagai penentu ketercapaian kenaikan kelas.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'UH',
    nama: 'Ulangan Harian / Asesmen Formatif (UH)',
    alias: ['UH', 'Formatif', 'Ulangan Harian', 'Sumatif Harian', 'Asesmen Formatif'],
    kategori: 'Formatif',
    keterangan: 'Uji pemahaman materi per bab/tujuan pembelajaran per kelas yang tersinkron ke Penugasan KBM.',
    durasiStandarMenit: 60,
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    isOfficialSchedule: true,
    isAssignment: true
  },
  {
    id: 'ANBK',
    nama: 'Asesmen Nasional Berbasis Komputer (ANBK)',
    alias: ['ANBK', 'AKM', 'Asesmen Nasional', 'Survei Karakter'],
    kategori: 'Nasional',
    keterangan: 'Evaluasi mutu pendidikan nasional mencakup AKM Literasi, Numerasi, & Survei Lingkungan Belajar.',
    durasiStandarMenit: 120,
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'TO_ANBK',
    nama: 'Try Out Asesmen Nasional (TO ANBK)',
    alias: ['TO ANBK', 'Tryout ANBK', 'Simulasi ANBK', 'Gladi ANBK'],
    kategori: 'Nasional',
    keterangan: 'Uji coba instrumen soal AKM Literasi & Numerasi persiapan ANBK resmi Kemendikbud.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-violet-50 border-violet-200',
    badgeText: 'text-violet-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'TO_US',
    nama: 'Try Out Ujian Sekolah (TO US)',
    alias: ['TO US', 'Tryout US', 'Pra US', 'Simulasi Ujian Sekolah'],
    kategori: 'Sekolah',
    keterangan: 'Latihan menyeluruh butir soal standar kelulusan untuk siswa tingkat akhir.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'ABM',
    nama: 'Asesmen Bakat Minat (ABM)',
    alias: ['ABM', 'Asesmen Bakat Minat', 'Tes Minat Bakat'],
    kategori: 'Khusus',
    keterangan: 'Pemetaan potensi, minat akademik, kecenderungan karir, dan vokasi peserta didik.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-pink-50 border-pink-200',
    badgeText: 'text-pink-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'US',
    nama: 'Ujian Sekolah / Kelulusan (US / USP)',
    alias: ['US', 'USP', 'Ujian Sekolah', 'Ujian Kelulusan', 'Ujian Satuan Pendidikan'],
    kategori: 'Sekolah',
    keterangan: 'Asesmen komprehensif penentu kelulusan siswa jenjang SD/Paket A, SMP/Paket B, SMA/Paket C.',
    durasiStandarMenit: 120,
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'PRAKTEK',
    nama: 'Ujian Praktek & Vokasi (Keterampilan)',
    alias: ['Praktek', 'Ujian Praktek', 'Vokasi', 'Ujian Praktik'],
    kategori: 'Khusus',
    keterangan: 'Penilaian unjuk kerja, portofolio, praktikum laboratorium, dan keterampilan vokasi.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'REMEDIAL',
    nama: 'Remedial & Ujian Perbaikan',
    alias: ['Remedial', 'Ujian Remedial', 'Perbaikan Nilai'],
    kategori: 'Formatif',
    keterangan: 'Asesmen ulangan bagi peserta didik yang belum mencapai kriteria ketuntasan (KKTP).',
    durasiStandarMenit: 60,
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-700',
    isOfficialSchedule: true,
    isAssignment: true
  },
  {
    id: 'PENGAYAAN',
    nama: 'Pengayaan & Ujian Akselerasi',
    alias: ['Pengayaan', 'Akselerasi', 'Ujian Pengayaan'],
    kategori: 'Formatif',
    keterangan: 'Tantangan asesmen tingkat lanjut (HOTS) bagi peserta didik dengan capaian tinggi.',
    durasiStandarMenit: 60,
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-700',
    isOfficialSchedule: true,
    isAssignment: true
  },
  {
    id: 'DIAGNOSTIK',
    nama: 'Asesmen Diagnostik Awal Pembelajaran',
    alias: ['Diagnostik', 'Asesmen Diagnostik', 'Tes Awal', 'Pre-test'],
    kategori: 'Diagnostik',
    keterangan: 'Pemetaan kesiapan kognitif dan non-kognitif siswa sebelum materi diajarkan.',
    durasiStandarMenit: 45,
    badgeBg: 'bg-lime-50 border-lime-200',
    badgeText: 'text-lime-700',
    isOfficialSchedule: true,
    isAssignment: false
  },
  {
    id: 'SIMULASI',
    nama: 'Simulasi CBT & Gladi Bersih',
    alias: ['Simulasi', 'Gladi Bersih', 'Uji Coba CBT'],
    kategori: 'Khusus',
    keterangan: 'Pengenalan antarmuka CBT, pengujian token, dan kesiapan infrastruktur perangkat.',
    durasiStandarMenit: 45,
    badgeBg: 'bg-slate-100 border-slate-300',
    badgeText: 'text-slate-700',
    isOfficialSchedule: true,
    isAssignment: false
  }
];

export const JENIS_UJIAN_NAMES = JENIS_UJIAN_LENGKAP.map(j => j.nama);

/**
 * Mencari item Jenis Ujian berdasarkan string pencarian (id, nama, alias)
 */
export function findJenisUjian(val: string): JenisUjianItem {
  if (!val) return JENIS_UJIAN_LENGKAP[0];
  const cleaned = val.trim().toLowerCase();
  
  const found = JENIS_UJIAN_LENGKAP.find(j => 
    j.id.toLowerCase() === cleaned ||
    j.nama.toLowerCase() === cleaned ||
    j.alias.some(a => a.toLowerCase() === cleaned || cleaned.includes(a.toLowerCase()))
  );

  return found || {
    id: 'CUSTOM',
    nama: val,
    alias: [val],
    kategori: 'Sumatif',
    keterangan: 'Asesmen pembelajaran kustom.',
    durasiStandarMenit: 90,
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-800',
    isOfficialSchedule: true,
    isAssignment: false
  };
}
