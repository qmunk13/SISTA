import { Siswa, Kelas } from '../types';
import { db } from '../data/db';

/**
 * Standard grade level names supported in the school ERP
 */
export const STANDARD_CLASS_LEVELS = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
  'Kelas 7',
  'Kelas 8',
  'Kelas 9',
  'Kelas 10',
  'Kelas 11',
  'Kelas 12',
  'Kelas 13 (Alumni / Lulus)'
];

/**
 * Resolves a student's active class string or ID for a given academic year.
 */
export function getSiswaClassForYear(s: Siswa, targetYear?: string): string {
  if (!s) return '';
  const currentActiveYear = localStorage.getItem('ERP_academic_year') || '2026/2027';

  if (targetYear && s.classHistory?.[targetYear]) {
    return s.classHistory[targetYear];
  }
  if (!targetYear) {
    if (s.classHistory?.[currentActiveYear]) {
      return s.classHistory[currentActiveYear];
    }
    return s.kelasId || s.kelas || '';
  }
  if (s.tahunAjaran === targetYear || targetYear === currentActiveYear) {
    return s.kelasId || s.kelas || '';
  }

  // Check history array if present
  if (s.riwayatAkademis && Array.isArray(s.riwayatAkademis)) {
    const matched = s.riwayatAkademis.find(r => r.tahunAjaran === targetYear);
    if (matched && matched.kelasId) {
      return matched.kelasId;
    }
  }

  return s.kelasId || s.kelas || '';
}

/**
 * Normalizes any student's class ID, class name, or history into a standard grade level ('Kelas 4' .. 'Kelas 12').
 */
export function getGradeLevelForStudent(s: Siswa, kelasList: Kelas[] = [], targetYear?: string): string {
  if (!s) return '';

  const activeClassStr = getSiswaClassForYear(s, targetYear);
  const classObj = kelasList.find(k => k.id === activeClassStr || k.nama === activeClassStr);
  
  const testString = `${activeClassStr} ${s.kelasId || ''} ${s.kelas || ''} ${classObj ? classObj.nama + ' ' + classObj.id : ''}`.toUpperCase().trim();

  if (/\b(13|L13|PL13|PL-13)\b/.test(testString) || testString.includes('KELAS 13') || testString.includes('ALUMNI') || testString.includes('LULUS')) return 'Kelas 13 (Alumni / Lulus)';
  if (/\b(12|C12|PC12|PC-12)\b/.test(testString) || testString.includes('KELAS 12')) return 'Kelas 12';
  if (/\b(11|C11|PC11|PC-11)\b/.test(testString) || testString.includes('KELAS 11')) return 'Kelas 11';
  if (/\b(10|C10|PC10|PC-10)\b/.test(testString) || testString.includes('KELAS 10')) return 'Kelas 10';
  if (/\b(9|B9|PB9|PB-9)\b/.test(testString) || testString.includes('KELAS 9')) return 'Kelas 9';
  if (/\b(8|B8|PB8|PB-8)\b/.test(testString) || testString.includes('KELAS 8')) return 'Kelas 8';
  if (/\b(7|B7|PB7|PB-7)\b/.test(testString) || testString.includes('KELAS 7')) return 'Kelas 7';
  if (/\b(6|A6|PA6|PA-6)\b/.test(testString) || testString.includes('KELAS 6')) return 'Kelas 6';
  if (/\b(5|A5|PA5|PA-5)\b/.test(testString) || testString.includes('KELAS 5')) return 'Kelas 5';
  if (/\b(4|A4|PA4|PA-4)\b/.test(testString) || testString.includes('KELAS 4')) return 'Kelas 4';
  if (/\b(3|A3|PA3|PA-3)\b/.test(testString) || testString.includes('KELAS 3')) return 'Kelas 3';
  if (/\b(2|A2|PA2|PA-2)\b/.test(testString) || testString.includes('KELAS 2')) return 'Kelas 2';
  if (/\b(1|A1|PA1|PA-1)\b/.test(testString) || testString.includes('KELAS 1')) return 'Kelas 1';

  return '';
}

/**
 * Calculates student statistics (Aktif, Tidak Aktif, Belum) for a given class level name ('Kelas 4' .. 'Kelas 12').
 */
export function getClassLevelStats(
  siswaList: Siswa[],
  levelName: string,
  kelasList: Kelas[] = [],
  targetYear?: string
): { aktif: number; tidakAktif: number; belum: number; total: number } {
  const filtered = (siswaList || []).filter(s => {
    if (!s) return false;
    const studentLevel = getGradeLevelForStudent(s, kelasList, targetYear);
    const statusUpper = (s.status || '').toUpperCase().trim();
    return studentLevel === levelName && statusUpper !== 'LULUS' && statusUpper !== 'KELUAR' && statusUpper !== 'PINDAH';
  });

  const aktif = filtered.filter(s => {
    const st = (s.status || '').toUpperCase().trim();
    return st === 'AKTIF';
  }).length;

  const tidakAktif = filtered.filter(s => {
    const st = (s.status || '').toUpperCase().trim();
    return st === 'TIDAK AKTIF' || st === 'NON AKTIF' || st === 'NONAKTIF' || st === 'NON_AKTIF';
  }).length;

  const belum = filtered.filter(s => {
    const st = (s.status || '').toUpperCase().trim();
    return st === 'BELUM' || st === 'BELUM AKTIF' || st === 'BELUM_AKTIF' || st === '';
  }).length;

  return { aktif, tidakAktif, belum, total: filtered.length };
}

/**
 * Updates student status and class/rombel in Data Siswa Kelas, ensuring automatic sync to Data Siswa Master.
 */
export function syncStudentClassAndStatusUpdate(
  studentIdentifier: string,
  updates: {
    nama?: string;
    kelasId?: string;
    kelasName?: string;
    status?: 'AKTIF' | 'TIDAK AKTIF' | 'BELUM' | 'PINDAH' | 'KELUAR' | 'LULUS';
    tahunAjaran?: string;
    keterangan?: string;
  },
  kelasList: Kelas[] = []
): Siswa[] {
  const currentSiswa = db.get<Siswa>('siswa') || [];

  const matchedKelas = kelasList.find(k => k.id === updates.kelasId || k.nama === updates.kelasId);
  const resolvedClassId = updates.kelasId || '';
  const resolvedClassName = updates.kelasName || (matchedKelas ? `Kelas ${matchedKelas.nama}` : (updates.kelasId ? `Kelas ${updates.kelasId}` : ''));

  const updatedSiswa = currentSiswa.map(s => {
    if (s.id === studentIdentifier || s.noPdkt === studentIdentifier || s.nisn === studentIdentifier) {
      const activeTA = updates.tahunAjaran || s.tahunAjaran || localStorage.getItem('ERP_academic_year') || '2026/2027';

      const updatedClassHistory = {
        ...(s.classHistory || {})
      };
      if (resolvedClassId) {
        updatedClassHistory[activeTA] = resolvedClassId;
      }

      let updatedRiwayat = s.riwayatAkademis ? [...s.riwayatAkademis] : [];
      if (activeTA) {
        const rIdx = updatedRiwayat.findIndex(r => r.tahunAjaran === activeTA);
        if (rIdx !== -1) {
          updatedRiwayat[rIdx] = {
            ...updatedRiwayat[rIdx],
            kelasId: resolvedClassId || updatedRiwayat[rIdx].kelasId,
            status: updates.status || updatedRiwayat[rIdx].status,
            keterangan: updates.keterangan !== undefined ? updates.keterangan : updatedRiwayat[rIdx].keterangan
          };
        } else {
          updatedRiwayat.push({
            tahunAjaran: activeTA,
            kelasId: resolvedClassId,
            status: updates.status || 'AKTIF',
            keterangan: updates.keterangan || 'Aktif Belajar'
          });
        }
      }

      return {
        ...s,
        ...(updates.nama ? { nama: updates.nama } : {}),
        // AUTOMATIC SYNC TO DATA SISWA MASTER STATUS AND ROMBEL
        ...(updates.status ? { status: updates.status } : {}),
        ...(resolvedClassId ? { kelasId: resolvedClassId } : {}),
        ...(resolvedClassName ? { kelas: resolvedClassName } : {}),
        ...(activeTA ? { tahunAjaran: activeTA } : {}),
        ...(updates.keterangan !== undefined ? { keterangan: updates.keterangan } : {}),
        classHistory: updatedClassHistory,
        riwayatAkademis: updatedRiwayat
      };
    }
    return s;
  });

  db.set('siswa', updatedSiswa);
  return updatedSiswa;
}
