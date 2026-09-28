// Daftar Lengkap Jenis Ujian CBT & Asesmen Terpadu
// Sesuai Kurikulum Merdeka & Kurikulum Nasional

export interface JenisUjianItem {
  id: string;
  name: string;
  shortName: string;
  category: 'sumatif' | 'formatif' | 'standar' | 'diagnostik' | 'remedial';
  color: string;
  badgeBg: string;
  badgeText: string;
  deskripsi: string;
}

export const JENIS_UJIAN_LIST: JenisUjianItem[] = [
  {
    id: 'Sumatif Tengah Semester (STS)',
    name: 'Sumatif Tengah Semester (STS)',
    shortName: 'STS',
    category: 'sumatif',
    color: 'cyan',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-800',
    deskripsi: 'Evaluasi capaian pembelajaran pertengahan semester'
  },
  {
    id: 'Sumatif Akhir Semester (SAS/ASAS)',
    name: 'Sumatif Akhir Semester (SAS / ASAS)',
    shortName: 'ASAS',
    category: 'sumatif',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    deskripsi: 'Asesmen komprehensif seluruh materi satu semester'
  },
  {
    id: 'Sumatif Akhir Tahun (SAT/ASAT)',
    name: 'Sumatif Akhir Tahun (SAT / ASAT)',
    shortName: 'SAT',
    category: 'sumatif',
    color: 'purple',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-800',
    deskripsi: 'Penilaian kenaikan kelas akhir tahun ajaran'
  },
  {
    id: 'Sumatif Harian',
    name: 'Sumatif Harian / Ulangan Harian',
    shortName: 'UH',
    category: 'formatif',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    deskripsi: 'Penilaian berkala per tujuan pembelajaran / bab'
  },
  {
    id: 'Praktek & Presentasi',
    name: 'Ujian Praktek & Keterampilan Vokasi',
    shortName: 'Praktek',
    category: 'sumatif',
    color: 'amber',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    deskripsi: 'Asesmen unjuk kerja, portofolio, dan keterampilan'
  },
  {
    id: 'Ujian Sekolah (US/AAJ)',
    name: 'Ujian Sekolah (US / Asesmen Akhir Jenjang)',
    shortName: 'US/AAJ',
    category: 'standar',
    color: 'rose',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-800',
    deskripsi: 'Ujian penentu kelulusan akhir jenjang sekolah'
  },
  {
    id: 'Tryout ANBK',
    name: 'Tryout ANBK (Literasi & Numerasi)',
    shortName: 'ANBK',
    category: 'standar',
    color: 'blue',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-800',
    deskripsi: 'Simulasi asesmen nasional literasi & numerasi berbasis komputer'
  },
  {
    id: 'Asesmen Diagnostik',
    name: 'Asesmen Diagnostik / Tes Kemampuan Awal',
    shortName: 'Diagnostik',
    category: 'diagnostik',
    color: 'teal',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-800',
    deskripsi: 'Pemetaan kemampuan awal siswa sebelum pembelajaran baru'
  },
  {
    id: 'Remedial & Susulan',
    name: 'Ujian Remedial & Susulan',
    shortName: 'Remedial',
    category: 'remedial',
    color: 'orange',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-800',
    deskripsi: 'Ujian perbaikan nilai atau susulan bagi siswa berhalangan'
  }
];

export function getJenisUjianBadge(jenisName?: string): JenisUjianItem {
  if (!jenisName) return JENIS_UJIAN_LIST[0];
  const query = jenisName.toLowerCase();
  
  const found = JENIS_UJIAN_LIST.find(j => 
    j.id.toLowerCase() === query ||
    j.name.toLowerCase().includes(query) ||
    j.shortName.toLowerCase() === query ||
    (query.includes('sts') && j.shortName === 'STS') ||
    (query.includes('asas') && j.shortName === 'ASAS') ||
    (query.includes('sat') && j.shortName === 'SAT') ||
    (query.includes('harian') && j.shortName === 'UH') ||
    (query.includes('praktek') && j.shortName === 'Praktek') ||
    (query.includes('sekolah') && j.shortName === 'US/AAJ') ||
    (query.includes('anbk') && j.shortName === 'ANBK') ||
    (query.includes('diagnostik') && j.shortName === 'Diagnostik') ||
    (query.includes('remedial') && j.shortName === 'Remedial')
  );

  return found || JENIS_UJIAN_LIST[0];
}
