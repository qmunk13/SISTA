import { db } from '../data/db';
import { matchClass } from './utils';
import { MASTER_SILABUS_DATA } from '../data/masterSilabusData';

export interface MapelRecord {
  id?: string;
  mapelId?: string;
  kode?: string;
  nama?: string;
  namaMapel?: string;
  kategori?: string;
  kkm?: number;
  guruId?: string;
  guruPengampu?: string;
  guru?: string;
  jenjang?: string;
  kelas?: string;
  kelompok?: string;
  fase?: string;
  bebanJp?: number;
  jp?: number;
  status?: string;
}

// Standar Katalog Mata Pelajaran Kurikulum Merdeka & Kesetaraan (Paket A, B, C)
const DEFAULT_MAPEL_CATALOG: MapelRecord[] = [
  // Paket A (Kelas 4, 5, 6)
  { id: 'MPL-01', kode: 'PABP', nama: 'Pendidikan Agama dan Budi Pekerti', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-02', kode: 'PPKN', nama: 'Pendidikan Pancasila / Kewarganegaraan', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-03', kode: 'IND', nama: 'Bahasa Indonesia', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-04', kode: 'MTK', nama: 'Matematika', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-05', kode: 'PJOK', nama: 'Pendidikan Jasmani Olahraga dan Kesehatan', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-06', kode: 'SBD', nama: 'Seni Budaya', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-07', kode: 'ING', nama: 'Bahasa Inggris', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-08', kode: 'PLBJ', nama: 'Pendidikan Lingkungan dan Budaya Jakarta', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-09', kode: 'BT', nama: 'Baca Tulis', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-10', kode: 'PRAK', nama: 'Ujian Praktek', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },
  { id: 'MPL-11', kode: 'VOK', nama: 'Ujian Vokasi', kelas: '4,5,6', jenjang: 'Paket A', kkm: 75 },

  // Paket B (Kelas 7, 8, 9)
  { id: 'MPL-12', kode: 'PABP-B', nama: 'Pendidikan Agama dan Budi Pekerti', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-13', kode: 'PPKN-B', nama: 'Pendidikan Pancasila / Kewarganegaraan', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-14', kode: 'IND-B', nama: 'Bahasa Indonesia', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-15', kode: 'MTK-B', nama: 'Matematika', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-16', kode: 'IPA-B', nama: 'Ilmu Pengetahuan Alam', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-17', kode: 'IPS-B', nama: 'Ilmu Pengetahuan Sosial', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-18', kode: 'ING-B', nama: 'Bahasa Inggris', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-19', kode: 'PJOK-B', nama: 'Pendidikan Jasmani Olahraga dan Kesehatan', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-20', kode: 'TIK-B', nama: 'Teknologi Informasi dan Komunikasi', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-21', kode: 'PRA-B', nama: 'Prakarya', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-22', kode: 'PBD-B', nama: 'Pemberdayaan', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-23', kode: 'SBD-B', nama: 'Seni Budaya', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-24', kode: 'PRAK-B', nama: 'Ujian Praktek', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },
  { id: 'MPL-25', kode: 'VOK-B', nama: 'Ujian Vokasi', kelas: '7,8,9', jenjang: 'Paket B', kkm: 75 },

  // Paket C (Kelas 10, 11, 12)
  { id: 'MPL-26', kode: 'PABP-C', nama: 'Pendidikan Agama dan Budi Pekerti', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-27', kode: 'PPKN-C', nama: 'Pendidikan Pancasila / Kewarganegaraan', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-28', kode: 'IND-C', nama: 'Bahasa Indonesia', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-29', kode: 'ING-C', nama: 'Bahasa Inggris', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-30', kode: 'MTK-C', nama: 'Matematika', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-31', kode: 'IPA-C', nama: 'Ilmu Pengetahuan Alam', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-32', kode: 'IPS-C', nama: 'Ilmu Pengetahuan Sosial', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-33', kode: 'SEJ-C', nama: 'Sejarah', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-34', kode: 'SEJI-C', nama: 'Sejarah Indonesia', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-35', kode: 'GEO-C', nama: 'Geografi', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-36', kode: 'EKO-C', nama: 'Ekonomi', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-37', kode: 'SOS-C', nama: 'Sosiologi', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-38', kode: 'TIK-C', nama: 'Teknologi Informasi dan Komunikasi', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-39', kode: 'PJOK-C', nama: 'Pendidikan Jasmani Olahraga dan Kesehatan', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-40', kode: 'SBD-C', nama: 'Seni Budaya', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-41', kode: 'PBD-C', nama: 'Pemberdayaan', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-42', kode: 'PRAK-C', nama: 'Ujian Praktek', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
  { id: 'MPL-43', kode: 'VOK-C', nama: 'Ujian Vokasi', kelas: '10,11,12', jenjang: 'Paket C', kkm: 75 },
];

/**
 * Mengambil seluruh data Mata Pelajaran dari penyimpanan lokal, silabus master, maupun fallback standar
 */
export function getAllMasterMapel(): MapelRecord[] {
  const mapelMap = new Map<string, MapelRecord>();

  // 1. Masukkan default master catalog terlebih dahulu sebagai fondasi
  DEFAULT_MAPEL_CATALOG.forEach(m => {
    const key = m.nama!.toLowerCase();
    const existing = mapelMap.get(key);
    if (!existing) {
      mapelMap.set(key, { ...m });
    } else {
      // Gabungkan daftar kelas jika mata pelajaran diajarkan di multi-jenjang
      const classSet = new Set([
        ...(existing.kelas || '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean),
        ...(m.kelas || '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
      ]);
      existing.kelas = Array.from(classSet).join(',');
    }
  });

  // 2. Ambil dari master_silabus jika ada
  try {
    const silabusList = (db.get('master_silabus') as any[]) || MASTER_SILABUS_DATA || [];
    if (Array.isArray(silabusList)) {
      silabusList.forEach((s: any) => {
        const name = String(s.mataPelajaran || s.mapel || s.NamaMapel || '').trim();
        if (name) {
          const key = name.toLowerCase();
          const existing = mapelMap.get(key);
          const kelasStr = String(s.kelas || s.Kelas || '');
          if (!existing) {
            mapelMap.set(key, {
              id: `MPL-SIL-${mapelMap.size + 1}`,
              nama: name,
              kelas: kelasStr,
              jenjang: s.jenjang || s.Jenjang || 'Umum',
              kkm: 75
            });
          } else if (kelasStr && existing.kelas && !existing.kelas.includes(kelasStr)) {
            existing.kelas += `,${kelasStr}`;
          }
        }
      });
    }
  } catch (e) {
    console.warn("Gagal membaca master_silabus:", e);
  }

  // 3. Timpa/lengkapi dari sheet MAPEL di DB jika ada
  try {
    const fromMapel = (db.get('mapel') as any[]) || (db.get('MAPEL') as any[]) || (db.get('academic_subjects') as any[]) || [];
    if (Array.isArray(fromMapel) && fromMapel.length > 0) {
      fromMapel.forEach((m: any) => {
        const name = String(m.nama || m.namaMapel || m.NamaMapel || m.Nama || '').trim();
        if (name) {
          const key = name.toLowerCase();
          const existing = mapelMap.get(key);
          mapelMap.set(key, {
            ...(existing || {}),
            ...m,
            nama: name
          });
        }
      });
    }
  } catch (e) {
    console.warn("Gagal membaca db mapel:", e);
  }

  return Array.from(mapelMap.values());
}

/**
 * Mengambil daftar nama mata pelajaran unik yang sesuai dengan kelas/rombel yang dipilih.
 * Menjamin tidak pernah kosong (never empty).
 */
export function getMapelNamesForClass(selectedClass?: string): string[] {
  const all = getAllMasterMapel();

  if (!selectedClass || selectedClass === 'ALL' || selectedClass === 'Semua') {
    const allNames = Array.from(new Set(
      all.map(m => String(m.nama || m.namaMapel || '').trim()).filter(Boolean)
    ));
    return allNames.length > 0 ? allNames : DEFAULT_MAPEL_CATALOG.map(m => m.nama!);
  }

  // Ambil angka tingkat kelas (misal '4', '4A' -> '4')
  const cleanGradeNum = selectedClass.replace(/[^\d]/g, '').trim();

  const matched = all.filter(m => {
    const mClass = String(m.kelas || '');
    if (!mClass || mClass === '-' || mClass.toLowerCase() === 'semua') return true;

    // Cek matchClass util
    if (matchClass(mClass, selectedClass)) return true;

    // Cek jika angka kelas tertera dalam string daftar kelas (misal "4,5,6" include "4")
    if (cleanGradeNum) {
      const parts = mClass.split(/[,;\s/]+/).map(p => p.replace(/[^\d]/g, '').trim());
      if (parts.includes(cleanGradeNum)) return true;
    }

    return false;
  });

  const matchedNames = Array.from(new Set(
    (matched.length > 0 ? matched : all)
      .map(m => String(m.nama || m.namaMapel || '').trim())
      .filter(Boolean)
  ));

  return matchedNames.length > 0 ? matchedNames : DEFAULT_MAPEL_CATALOG.map(m => m.nama!);
}

/**
 * Membandingkan dua nama/kode mata pelajaran secara cerdas & toleran (loose match).
 * Mampu mengenali singkatan seperti IPS vs Ilmu Pengetahuan Sosial, PAI vs Pendidikan Agama Islam, dll.
 */
export function matchSubjectLoose(subj1?: string, subj2?: string): boolean {
  if (!subj1 || !subj2) return false;
  const s1 = String(subj1).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const s2 = String(subj2).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const aliasGroups: string[][] = [
    ['pabp', 'pai', 'pendidikanagama', 'pendidikanagamadanbudipekerti', 'agamadanbudipekerti', 'pendidikanagamaislam', 'agamaislam', 'budipekerti'],
    ['ppkn', 'pendidikanpancasila', 'pendidikanpancasilakewarganegaraan', 'pancasila', 'kewarganegaraan', 'pkn'],
    ['ind', 'bahasaindonesia', 'indonesia', 'bind', 'bina'],
    ['mtk', 'matematika', 'math', 'matematik'],
    ['ipa', 'ilmupengetahuanalam', 'ipas', 'ilmupengetahuanalamdansosial'],
    ['ips', 'ilmupengetahuansosial'],
    ['ing', 'bahasainggris', 'inggris', 'bing', 'english'],
    ['pjok', 'penjas', 'pendidikanjasmani', 'pendidikanjasmaniolahragadankesehatan', 'olahraga', 'penjaskes', 'jasmani'],
    ['sbd', 'seni', 'senibudaya', 'senirupa', 'senimusik', 'senitari', 'seniteater'],
    ['plbj', 'pendidikanlingkungandanbudayajakarta', 'lingkunganbudayajakarta'],
    ['bt', 'bacatulis', 'bacaantulis', 'calistung', 'literasi'],
    ['tik', 'teknologiinformasidankomunikasi', 'inf', 'informatika', 'komputer', 'koding', 'ai'],
    ['prak', 'ujianpraktek', 'ujianpraktik', 'praktek', 'praktik'],
    ['vok', 'ujianvokasi', 'vokasi', 'keterampilanvokasional', 'kewirausahaan'],
    ['sej', 'sejarah', 'sejarahindonesia', 'seji'],
    ['geo', 'geografi'],
    ['eko', 'ekonomi'],
    ['sos', 'sosiologi'],
    ['pbd', 'pemberdayaan'],
    ['pra', 'prakarya'],
    ['mulok', 'muatanlokal', 'bahasadaerah']
  ];

  for (const group of aliasGroups) {
    const m1 = group.some(alias => s1 === alias || s1.includes(alias) || alias.includes(s1));
    const m2 = group.some(alias => s2 === alias || s2.includes(alias) || alias.includes(s2));
    if (m1 && m2) return true;
  }
  return false;
}

