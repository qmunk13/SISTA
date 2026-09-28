/**
 * Smart Academic Calendar Helper (Logika Pintar Tahun Ajaran & Semester Indonesia)
 *
 * Standar Pendidikan Indonesia:
 * - Tahun Ajaran (TA): Dimulai Juli (Bulan 7) s/d Juni (Bulan 6) tahun berikutnya.
 *   Contoh:
 *     - 2024-07 s/d 2025-06 => TA 2024/2025
 *     - 2025-07 s/d 2026-06 => TA 2025/2026
 *     - 2026-07 s/d 2027-06 => TA 2026/2027
 *
 * - Semester:
 *   - Semester 1 (Ganjil): Juli, Agustus, September, Oktober, November, Desember (Bulan 7-12)
 *   - Semester 2 (Genap): Januari, Februari, Maret, April, Mei, Juni (Bulan 1-6)
 */

export interface AcademicPeriodInfo {
  academicYear: string;       // e.g. "2025/2026"
  startYear: number;          // e.g. 2025
  endYear: number;            // e.g. 2026
  semester: 'Ganjil' | 'Genap';
  semesterNum: 1 | 2;
  month: number;              // 1-12
  year: number;               // calendar year e.g. 2026
  monthName: string;          // e.g. "Januari"
  fullLabel: string;          // e.g. "TA 2025/2026 • Semester 2 (Genap)"
  badgeLabel: string;         // e.g. "25/26 Gnp"
}

export const MONTH_NAMES_ID = [
  '',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_NAMES_SHORT = [
  '',
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Parsing string tanggal / periode seperti:
 * "2026-01-31", "2026-01", "2025/2026", "2024-07"
 */
export function parseDateOrPeriod(dateStr?: string | null): { year: number; month: number } {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  const str = String(dateStr).trim();

  // If already in TA format like "2024/2025"
  if (str.includes('/')) {
    const parts = str.split('/');
    const y1 = parseInt(parts[0], 10);
    if (!isNaN(y1)) return { year: y1, month: 7 }; // default to start of TA (July)
  }

  // Format YYYY-MM or YYYY-MM-DD or YYYY.MM
  const match = str.match(/^(\d{4})[-/. ](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  // Only Year "2025"
  const matchYearOnly = str.match(/^(\d{4})$/);
  if (matchYearOnly) {
    const y = parseInt(matchYearOnly[1], 10);
    return { year: y, month: 7 };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Mendapatkan Tahun Ajaran (contoh: "2025/2026") dari tanggal / periode
 */
export function getAcademicYear(dateStr?: string | null): string {
  const { year, month } = parseDateOrPeriod(dateStr);
  // Bulan 7-12 masuk ke startYear = year
  // Bulan 1-6 masuk ke startYear = year - 1
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

/**
 * Mendapatkan Semester ('Ganjil' | 'Genap') dari tanggal / periode
 */
export function getSemester(dateStr?: string | null): 'Ganjil' | 'Genap' {
  const { month } = parseDateOrPeriod(dateStr);
  return month >= 7 ? 'Ganjil' : 'Genap';
}

/**
 * Mendapatkan Nomor Semester (1 untuk Ganjil, 2 untuk Genap)
 */
export function getSemesterNum(dateStr?: string | null): 1 | 2 {
  const { month } = parseDateOrPeriod(dateStr);
  return month >= 7 ? 1 : 2;
}

/**
 * Mendapatkan Detail Lengkap Periode Akademik secara Cerdas
 */
export function getAcademicPeriodInfo(dateStr?: string | null): AcademicPeriodInfo {
  const { year, month } = parseDateOrPeriod(dateStr);
  const isGanjil = month >= 7;
  const startYear = isGanjil ? year : year - 1;
  const endYear = startYear + 1;
  const academicYear = `${startYear}/${endYear}`;
  const semester: 'Ganjil' | 'Genap' = isGanjil ? 'Ganjil' : 'Genap';
  const semesterNum: 1 | 2 = isGanjil ? 1 : 2;
  const monthName = MONTH_NAMES_ID[month] || '';

  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(endYear).slice(-2);
  const badgeLabel = `TA ${shortStart}/${shortEnd} • ${semester === 'Ganjil' ? 'Ganjil (S1)' : 'Genap (S2)'}`;

  return {
    academicYear,
    startYear,
    endYear,
    semester,
    semesterNum,
    month,
    year,
    monthName,
    fullLabel: `TA ${academicYear} • Sem ${semesterNum} (${semester})`,
    badgeLabel
  };
}

/**
 * Mengecek apakah tanggal/periode cocok dengan filter TA & Semester.
 * Mendukung explicitTA (misal dari kolom Sheet TahunAjaran) dan explicitSemester
 * sebagai fallback atau prioritas agar data transaksi terbaru tidak tersembunyi
 * akibat perbedaan format tanggal vs label akademik di spreadsheet.
 */
export function matchAcademicFilter(
  dateOrPeriodStr: string | null | undefined,
  targetTA?: string,
  targetSemester?: string, // 'SEMUA' | '1' | '2' | 'Ganjil' | 'Genap'
  targetMonth?: number, // 1-12
  explicitTA?: string | null,
  explicitSemester?: string | null
): boolean {
  // Filter Tahun Ajaran
  if (targetTA && targetTA !== 'SEMUA' && targetTA !== '') {
    const cleanTarget = targetTA.trim();
    let matchesTA = false;

    // 1. Cek dari explicit TahunAjaran (kolom Sheet TahunAjaran jika tersedia)
    if (explicitTA) {
      const cleanExp = explicitTA.trim();
      if (cleanExp === cleanTarget || cleanExp.includes(cleanTarget) || cleanTarget.includes(cleanExp)) {
        matchesTA = true;
      }
    }

    // 2. Cek dari tanggal/periode jika belum cocok
    if (!matchesTA && dateOrPeriodStr) {
      const info = getAcademicPeriodInfo(dateOrPeriodStr);
      if (info.academicYear === cleanTarget || info.academicYear.includes(cleanTarget) || cleanTarget.includes(info.academicYear)) {
        matchesTA = true;
      }
    }

    // Jika targetTA diisi tapi tidak cocok sama sekali, return false
    if (!matchesTA) {
      return false;
    }
  }

  // Filter Semester
  if (targetSemester && targetSemester !== 'SEMUA' && targetSemester !== '') {
    let matchesSem = false;

    // 1. Cek dari explicit Semester jika ada
    if (explicitSemester) {
      const cleanExpSem = explicitSemester.trim().toLowerCase();
      if (targetSemester === '1' || targetSemester === 'Ganjil') {
        if (cleanExpSem.includes('1') || cleanExpSem.includes('ganjil')) matchesSem = true;
      } else if (targetSemester === '2' || targetSemester === 'Genap') {
        if (cleanExpSem.includes('2') || cleanExpSem.includes('genap')) matchesSem = true;
      }
    }

    // 2. Cek dari tanggal/periode jika belum cocok
    if (!matchesSem && dateOrPeriodStr) {
      const info = getAcademicPeriodInfo(dateOrPeriodStr);
      if (targetSemester === '1' || targetSemester === 'Ganjil') {
        if (info.semesterNum === 1) matchesSem = true;
      } else if (targetSemester === '2' || targetSemester === 'Genap') {
        if (info.semesterNum === 2) matchesSem = true;
      }
    }

    if (!matchesSem) {
      return false;
    }
  }

  // Filter Bulan (1-12)
  if (targetMonth && targetMonth > 0 && dateOrPeriodStr) {
    const info = getAcademicPeriodInfo(dateOrPeriodStr);
    if (info.month !== targetMonth) return false;
  }

  return true;
}

/**
 * Ekstraksi seluruh Tahun Ajaran yang ada di data
 */
export function extractAvailableAcademicYears(
  dateStrings: (string | undefined | null)[],
  explicitTAs?: (string | undefined | null)[]
): string[] {
  const set = new Set<string>();

  // Always include academic years starting from 2023/2024 onwards
  set.add('2023/2024');
  set.add('2024/2025');
  set.add('2025/2026');
  set.add('2026/2027');
  set.add('2027/2028');

  dateStrings.forEach(str => {
    if (str) {
      const ta = getAcademicYear(str);
      if (ta) set.add(ta);
    }
  });

  if (explicitTAs && explicitTAs.length > 0) {
    explicitTAs.forEach(ta => {
      if (ta && typeof ta === 'string') {
        const trimmed = ta.trim();
        if (trimmed && /^\d{4}\/\d{4}$/.test(trimmed)) {
          set.add(trimmed);
        }
      }
    });
  }

  return Array.from(set).sort().reverse();
}
