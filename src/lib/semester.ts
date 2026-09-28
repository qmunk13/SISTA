import { db } from '../data/db';

export interface SemesterEntity {
  id: string;
  code: string;
  name: string;
  tahunPelajaran: string;
  semesterType: 'Ganjil' | 'Genap';
  isActive: boolean;
  startDate: string;
  endDate: string;
  deskripsi?: string;
}

export const DEFAULT_SEMESTERS: SemesterEntity[] = [
  {
    id: 'SEM-2023-1',
    code: '2023/2024-1',
    name: '2023/2024 Ganjil',
    tahunPelajaran: '2023/2024',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2023-07-17',
    endDate: '2023-12-22',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2023/2024'
  },
  {
    id: 'SEM-2023-2',
    code: '2023/2024-2',
    name: '2023/2024 Genap',
    tahunPelajaran: '2023/2024',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2024-01-08',
    endDate: '2024-06-22',
    deskripsi: 'Semester Genap Tahun Ajaran 2023/2024'
  },
  {
    id: 'SEM-2024-1',
    code: '2024/2025-1',
    name: '2024/2025 Ganjil',
    tahunPelajaran: '2024/2025',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2024-07-15',
    endDate: '2024-12-20',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2024/2025'
  },
  {
    id: 'SEM-2024-2',
    code: '2024/2025-2',
    name: '2024/2025 Genap',
    tahunPelajaran: '2024/2025',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2025-01-06',
    endDate: '2025-06-21',
    deskripsi: 'Semester Genap Tahun Ajaran 2024/2025'
  },
  {
    id: 'SEM-2025-1',
    code: '2025/2026-1',
    name: '2025/2026 Ganjil',
    tahunPelajaran: '2025/2026',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2025-07-14',
    endDate: '2025-12-19',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2025/2026'
  },
  {
    id: 'SEM-2025-2',
    code: '2025/2026-2',
    name: '2025/2026 Genap',
    tahunPelajaran: '2025/2026',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2026-01-05',
    endDate: '2026-06-20',
    deskripsi: 'Semester Genap Tahun Ajaran 2025/2026'
  },
  {
    id: 'SEM-2026-1',
    code: '2026/2027-1',
    name: '2026/2027 Ganjil',
    tahunPelajaran: '2026/2027',
    semesterType: 'Ganjil',
    isActive: true,
    startDate: '2026-07-13',
    endDate: '2026-12-18',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2026/2027'
  },
  {
    id: 'SEM-2026-2',
    code: '2026/2027-2',
    name: '2026/2027 Genap',
    tahunPelajaran: '2026/2027',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2027-01-04',
    endDate: '2027-06-19',
    deskripsi: 'Semester Genap Tahun Ajaran 2026/2027'
  },
  {
    id: 'SEM-2027-1',
    code: '2027/2028-1',
    name: '2027/2028 Ganjil',
    tahunPelajaran: '2027/2028',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2027-07-12',
    endDate: '2027-12-17',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2027/2028'
  },
  {
    id: 'SEM-2027-2',
    code: '2027/2028-2',
    name: '2027/2028 Genap',
    tahunPelajaran: '2027/2028',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2028-01-03',
    endDate: '2028-06-17',
    deskripsi: 'Semester Genap Tahun Ajaran 2027/2028'
  },
  {
    id: 'SEM-2028-1',
    code: '2028/2029-1',
    name: '2028/2029 Ganjil',
    tahunPelajaran: '2028/2029',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2028-07-17',
    endDate: '2028-12-22',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2028/2029'
  },
  {
    id: 'SEM-2028-2',
    code: '2028/2029-2',
    name: '2028/2029 Genap',
    tahunPelajaran: '2028/2029',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2029-01-08',
    endDate: '2029-06-23',
    deskripsi: 'Semester Genap Tahun Ajaran 2028/2029'
  },
  {
    id: 'SEM-2029-1',
    code: '2029/2030-1',
    name: '2029/2030 Ganjil',
    tahunPelajaran: '2029/2030',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2029-07-16',
    endDate: '2029-12-21',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2029/2030'
  },
  {
    id: 'SEM-2029-2',
    code: '2029/2030-2',
    name: '2029/2030 Genap',
    tahunPelajaran: '2029/2030',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2030-01-07',
    endDate: '2030-06-22',
    deskripsi: 'Semester Genap Tahun Ajaran 2029/2030'
  },
  {
    id: 'SEM-2030-1',
    code: '2030/2031-1',
    name: '2030/2031 Ganjil',
    tahunPelajaran: '2030/2031',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2030-07-15',
    endDate: '2030-12-20',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2030/2031'
  },
  {
    id: 'SEM-2030-2',
    code: '2030/2031-2',
    name: '2030/2031 Genap',
    tahunPelajaran: '2030/2031',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2031-01-06',
    endDate: '2031-06-21',
    deskripsi: 'Semester Genap Tahun Ajaran 2030/2031'
  },
  {
    id: 'SEM-2031-1',
    code: '2031/2032-1',
    name: '2031/2032 Ganjil',
    tahunPelajaran: '2031/2032',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2031-07-14',
    endDate: '2031-12-19',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2031/2032'
  },
  {
    id: 'SEM-2031-2',
    code: '2031/2032-2',
    name: '2031/2032 Genap',
    tahunPelajaran: '2031/2032',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2032-01-05',
    endDate: '2032-06-19',
    deskripsi: 'Semester Genap Tahun Ajaran 2031/2032'
  },
  {
    id: 'SEM-2032-1',
    code: '2032/2033-1',
    name: '2032/2033 Ganjil',
    tahunPelajaran: '2032/2033',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2032-07-12',
    endDate: '2032-12-17',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2032/2033'
  },
  {
    id: 'SEM-2032-2',
    code: '2032/2033-2',
    name: '2032/2033 Genap',
    tahunPelajaran: '2032/2033',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2033-01-03',
    endDate: '2033-06-18',
    deskripsi: 'Semester Genap Tahun Ajaran 2032/2033'
  },
  {
    id: 'SEM-2033-1',
    code: '2033/2034-1',
    name: '2033/2034 Ganjil',
    tahunPelajaran: '2033/2034',
    semesterType: 'Ganjil',
    isActive: false,
    startDate: '2033-07-18',
    endDate: '2033-12-23',
    deskripsi: 'Semester Ganjil Tahun Ajaran 2033/2034'
  },
  {
    id: 'SEM-2033-2',
    code: '2033/2034-2',
    name: '2033/2034 Genap',
    tahunPelajaran: '2033/2034',
    semesterType: 'Genap',
    isActive: false,
    startDate: '2034-01-09',
    endDate: '2034-06-24',
    deskripsi: 'Semester Genap Tahun Ajaran 2033/2034'
  }
];

export function normalizeSemesterType(item: any): 'Ganjil' | 'Genap' {
  if (!item) return 'Ganjil';
  const sid = String(item.id || item.SemesterID || item.semesterId || '').trim();
  const code = String(item.code || item.Kode || '').trim();
  const rawSem = String(item.semesterType || item.Semester || item.semester || '').trim().toLowerCase();
  const rawNama = String(item.name || item.Nama || item.nama || '').trim().toLowerCase();

  // 1. Explicit ID/Code ending in -1 or -2 (e.g. SEM-2026-1 => Ganjil, SEM-2026-2 => Genap)
  if (sid.endsWith('-1') || code.endsWith('-1')) return 'Ganjil';
  if (sid.endsWith('-2') || code.endsWith('-2')) return 'Genap';

  // 2. Explicit Ganjil / 1 or Genap / 2
  if (rawSem === 'ganjil' || rawSem === '1' || rawSem === 'semester 1' || rawSem === 'sem 1' || rawSem === 'odd' || rawSem === 'sm-i') {
    return 'Ganjil';
  }
  if (rawSem === 'genap' || rawSem === '2' || rawSem === 'semester 2' || rawSem === 'sem 2' || rawSem === 'even' || rawSem === 'sm-ii') {
    return 'Genap';
  }

  // 3. Substring in name / label
  if (rawNama.includes('ganjil') || rawNama.includes('semester 1') || rawNama.includes('sem 1') || rawNama.includes('sm-i')) {
    return 'Ganjil';
  }
  if (rawNama.includes('genap') || rawNama.includes('semester 2') || rawNama.includes('sem 2') || rawNama.includes('sm-ii')) {
    return 'Genap';
  }

  return 'Ganjil';
}

function getSavedSettingsSafe(): { tahunPelajaran: string; semester: 'Ganjil' | 'Genap' } {
  try {
    const raw = db.getSingle<any>('settings');
    if (raw && (raw.tahunPelajaran || raw.semester)) {
      const tp = (raw.tahunPelajaran || '2026/2027').trim();
      return {
        tahunPelajaran: tp === '2025/2026' ? '2026/2027' : tp,
        semester: (raw.semester === 'Genap' ? 'Genap' : 'Ganjil')
      };
    }
  } catch {}
  try {
    const local = localStorage.getItem('sista_settings');
    if (local) {
      const parsed = JSON.parse(local);
      const tp = (parsed.tahunPelajaran || '2026/2027').trim();
      return {
        tahunPelajaran: tp === '2025/2026' ? '2026/2027' : tp,
        semester: (parsed.semester === 'Genap' ? 'Genap' : 'Ganjil')
      };
    }
  } catch {}
  return { tahunPelajaran: '2026/2027', semester: 'Ganjil' };
}

export function deduplicateSemesters(items: SemesterEntity[]): SemesterEntity[] {
  const seenId = new Set<string>();
  const seenKey = new Set<string>();
  const result: SemesterEntity[] = [];

  for (const item of items) {
    if (!item) continue;
    const tp = (item.tahunPelajaran || (item as any).tahunAjaran || '2026/2027').trim();
    const semType = normalizeSemesterType(item);
    const sid = item.id || `SEM-${tp.split('/')[0] || '2026'}-${semType === 'Ganjil' ? '1' : '2'}`;
    const compoundKey = `${tp}-${semType}`;

    if (seenId.has(sid) || seenKey.has(compoundKey)) {
      // If duplicate is active, ensure existing record retains active state
      if (item.isActive) {
        const existing = result.find(r => r.id === sid || `${(r.tahunPelajaran || '').trim()}-${r.semesterType}` === compoundKey);
        if (existing) existing.isActive = true;
      }
      continue;
    }

    seenId.add(sid);
    seenKey.add(compoundKey);
    result.push({
      ...item,
      id: sid,
      code: `${tp}-${semType === 'Ganjil' ? '1' : '2'}`,
      name: `${tp} ${semType}`,
      tahunPelajaran: tp,
      semesterType: semType
    });
  }

  return result;
}

export function getSemestersList(): SemesterEntity[] {
  const stored = db.get<SemesterEntity>('semester');
  let list: SemesterEntity[];
  if (stored && Array.isArray(stored) && stored.length > 0) {
    // If stored contains active semester, ensure 2026/2027 is present
    const has2026 = stored.some(s => (s.tahunPelajaran || (s as any).tahunAjaran) === '2026/2027');
    if (!has2026) {
      list = deduplicateSemesters([...stored, ...DEFAULT_SEMESTERS]);
    } else {
      list = deduplicateSemesters(stored);
    }
  } else {
    list = deduplicateSemesters(DEFAULT_SEMESTERS);
  }

  // Ensure active semester integrity matches saved settings (default: 2026/2027 Ganjil)
  const savedSettings = getSavedSettingsSafe();
  const currentTP = savedSettings.tahunPelajaran;
  const currentSem = savedSettings.semester;

  const hasMatchingActive = list.some(s => s.tahunPelajaran === currentTP && s.semesterType === currentSem && s.isActive);
  if (!hasMatchingActive) {
    list = list.map(s => {
      const isTarget = s.tahunPelajaran === currentTP && s.semesterType === currentSem;
      return {
        ...s,
        isActive: isTarget ? true : (s.tahunPelajaran === currentTP ? false : s.isActive)
      };
    });
  }

  // Ensure persistent DB is cleaned and synchronized
  db.set('semester', list);
  db.set('academic_semesters', list);

  return list;
}

export function getActiveSemester(preferredTahun?: string, preferredSemester?: 'Ganjil' | 'Genap'): SemesterEntity {
  const list = getSemestersList();
  const savedSettings = getSavedSettingsSafe();
  const targetTP = (preferredTahun || savedSettings.tahunPelajaran || '2026/2027').trim();
  const targetSem = (preferredSemester || savedSettings.semester || 'Ganjil') === 'Genap' ? 'Genap' : 'Ganjil';

  // 1. Exact match target tahun and semester
  const match = list.find(s => s.tahunPelajaran === targetTP && s.semesterType === targetSem);
  if (match) {
    if (!match.isActive) {
      match.isActive = true;
    }
    return match;
  }

  // 2. Active semester in target year
  const yearActive = list.find(s => s.tahunPelajaran === targetTP && s.isActive);
  if (yearActive) return yearActive;

  // 3. Fallback to first in target year
  const firstInYear = list.find(s => s.tahunPelajaran === targetTP);
  if (firstInYear) return firstInYear;

  // 4. Fallback to 2026/2027 Ganjil
  const default2026 = list.find(s => s.tahunPelajaran === '2026/2027' && s.semesterType === 'Ganjil');
  if (default2026) return default2026;

  return list[0] || DEFAULT_SEMESTERS[6];
}

export function setActiveSemesterInDb(semesterId: string): SemesterEntity[] {
  const list = getSemestersList();
  const updated = list.map(s => ({
    ...s,
    isActive: s.id === semesterId
  }));
  const deduplicated = deduplicateSemesters(updated);
  db.set('semester', deduplicated);
  db.set('academic_semesters', deduplicated);
  
  const active = deduplicated.find(s => s.isActive);
  if (typeof window !== 'undefined' && active) {
    window.dispatchEvent(new CustomEvent('academic-semester-changed', { detail: active }));
  }
  return deduplicated;
}

export function setSemesterAndTahunAjaran(tahunPelajaran: string, semesterType: 'Ganjil' | 'Genap'): SemesterEntity {
  const list = getSemestersList();
  const cleanTP = (tahunPelajaran || '2026/2027').trim();
  const semNum = semesterType === 'Ganjil' ? '1' : '2';
  const yearPrefix = cleanTP.split('/')[0] || '2026';
  const targetId = `SEM-${yearPrefix}-${semNum}`;
  
  let target = list.find(s => 
    (s.tahunPelajaran === cleanTP && s.semesterType === semesterType) ||
    s.id === targetId ||
    s.code === `${cleanTP}-${semNum}`
  );
  
  if (!target) {
    const startYear = parseInt(yearPrefix, 10) || 2026;
    const endYear = startYear + 1;
    
    target = {
      id: targetId,
      code: `${cleanTP}-${semNum}`,
      name: `Semester ${semNum} (${semesterType})`,
      tahunPelajaran: cleanTP,
      semesterType,
      isActive: true,
      startDate: semesterType === 'Ganjil' ? `${startYear}-07-13` : `${endYear}-01-04`,
      endDate: semesterType === 'Ganjil' ? `${startYear}-12-19` : `${endYear}-06-19`,
      deskripsi: `Semester ${semesterType} Tahun Ajaran ${cleanTP}`
    };
    list.push(target);
  } else {
    target.isActive = true;
    target.semesterType = semesterType;
    target.tahunPelajaran = cleanTP;
  }
  
  const deduplicated = deduplicateSemesters(list);
  const updated = deduplicated.map(s => ({
    ...s,
    isActive: s.id === target!.id || (s.tahunPelajaran === cleanTP && s.semesterType === semesterType)
  }));
  
  db.set('semester', updated);
  db.set('academic_semesters', updated);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('academic-semester-changed', { detail: target }));
  }
  return target;
}

export function saveSemesterInDb(semester: SemesterEntity): SemesterEntity[] {
  const list = getSemestersList();
  const index = list.findIndex(s => s.id === semester.id);
  let updated: SemesterEntity[];
  if (index !== -1) {
    updated = list.map(s => (s.id === semester.id ? semester : s));
  } else {
    updated = [...list, semester];
  }
  const deduplicated = deduplicateSemesters(updated);
  db.set('semester', deduplicated);
  db.set('academic_semesters', deduplicated);
  return deduplicated;
}
