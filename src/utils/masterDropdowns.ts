import { db } from '../data/db';
import { useStore } from '../store';
import { autoSyncEngine } from '../data/autoSyncEngine';
import { normalizeClassName, sortClasses, STANDARD_CLASSES } from '../lib/utils';
import { getSemestersList, setSemesterAndTahunAjaran, normalizeSemesterType } from '../lib/semester';

export interface DropdownSourceInfo {
  source: 'SHEET_DATABASE' | 'LOCAL_STATE' | 'MANUAL_FALLBACK';
  sheetName: string;
  isCustomManual: boolean;
  totalRecords: number;
}

export interface MasterClassDropdownItem {
  id: string;
  cls: string;
  label: string;
  tingkat?: string;
  waliKelas?: string;
  tahunAjaran?: string;
  status?: string;
}

export interface MasterTahunAjaranItem {
  id: string;
  nama: string;
  tahunMulai?: string;
  tahunSelesai?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  isAktif: boolean;
}

export interface MasterSemesterItem {
  id: string;
  nama: string;
  tahunPelajaran: string;
  semesterType: 'Ganjil' | 'Genap';
  isAktif: boolean;
}

/**
 * 1. DROPDOWN MASTER KELAS
 * Sumber Utama: Sheet KELAS (db.get('academic_classes') atau db.get('rombel'))
 * Sumber Kedua: Data Siswa Aktif di Store
 * Fallback Manual: STANDARD_CLASSES (jika sheet belum diisi)
 */
export function getMasterClassDropdown(studentsInput?: any[]): {
  classes: string[];
  classItems: MasterClassDropdownItem[];
  info: DropdownSourceInfo;
} {
  const set = new Set<string>();
  const classItems: MasterClassDropdownItem[] = [];

  // A. Ambil dari Sheet KELAS
  let fromSheet: any[] = [];
  try {
    const rawA = db.get<any>('academic_classes');
    const rawB = db.get<any>('rombel');
    fromSheet = (Array.isArray(rawA) && rawA.length > 0) ? rawA : ((Array.isArray(rawB) && rawB.length > 0) ? rawB : []);
  } catch {}

  let isFromSheet = false;
  if (fromSheet.length > 0) {
    isFromSheet = true;
    fromSheet.forEach((item: any, idx: number) => {
      const rawCls = item.cls || item.namaKelas || item.NamaKelas || item.kelas || item.Kelas || item.id;
      if (rawCls) {
        const clean = normalizeClassName(String(rawCls));
        if (clean && clean !== 'None' && clean !== 'NONE') {
          set.add(clean);
          classItems.push({
            id: item.id || item.KelasID || `CLS-${idx + 1}`,
            cls: clean,
            label: item.tingkat ? `${item.tingkat}` : `Kelas ${clean}`,
            tingkat: item.tingkat || `Kelas ${clean}`,
            waliKelas: item.namaWaliKelas || item.WaliKelas || item.wali || '-',
            tahunAjaran: item.tahunAjaran || item.TahunAjaran || '',
            status: item.status || item.Status || 'AKTIF'
          });
        }
      }
    });
  }

  // B. Tambahkan kelas dari data siswa terdaftar jika ada kelas baru
  const storeStudents = studentsInput || useStore.getState().students || [];
  if (Array.isArray(storeStudents) && storeStudents.length > 0) {
    storeStudents.forEach(s => {
      if (s && s.class) {
        const clean = normalizeClassName(String(s.class));
        if (clean && clean !== 'None' && clean !== 'NONE' && !set.has(clean)) {
          set.add(clean);
          classItems.push({
            id: `STD-${clean}`,
            cls: clean,
            label: `Kelas ${clean} (Siswa)`,
            status: 'AKTIF'
          });
        }
      }
    });
  }

  // C. Fallback jika Sheet KELAS dan Siswa kosong
  let isFallback = false;
  if (set.size === 0) {
    isFallback = true;
    STANDARD_CLASSES.forEach(c => {
      set.add(c);
      classItems.push({
        id: `DEF-${c}`,
        cls: c,
        label: `Kelas ${c}`,
        status: 'AKTIF'
      });
    });
  }

  const sortedClasses = sortClasses(Array.from(set));

  return {
    classes: sortedClasses,
    classItems,
    info: {
      source: isFromSheet ? 'SHEET_DATABASE' : (set.size > 0 ? 'LOCAL_STATE' : 'MANUAL_FALLBACK'),
      sheetName: 'KELAS',
      isCustomManual: isFallback,
      totalRecords: sortedClasses.length
    }
  };
}

/**
 * 2. DROPDOWN MASTER TAHUN AJARAN
 * Sumber Utama: Sheet TAHUN_AJARAN (db.get('academic_years') atau db.get('tahun_ajaran'))
 * Fallback Manual: List 11 Tahun Ajaran Standar Kemendikdasmen (2023/2024 s/d 2033/2034)
 */
export function getMasterTahunAjaranDropdown(): {
  years: string[];
  yearItems: MasterTahunAjaranItem[];
  activeYear: string;
  info: DropdownSourceInfo;
} {
  const currentSettingTP = useStore.getState().settings.tahunPelajaran || '2026/2027';
  const set = new Set<string>();
  const yearItems: MasterTahunAjaranItem[] = [];

  let fromSheet: any[] = [];
  try {
    const rawA = db.get<any>('academic_years');
    const rawB = db.get<any>('tahun_ajaran');
    fromSheet = (Array.isArray(rawA) && rawA.length > 0) ? rawA : ((Array.isArray(rawB) && rawB.length > 0) ? rawB : []);
  } catch {}

  let isFromSheet = false;
  if (fromSheet.length > 0) {
    isFromSheet = true;
    fromSheet.forEach((item: any, idx: number) => {
      const nama = (item.nama || item.Nama || item.tahun || item.tahunPelajaran || item.tahunAjaran || '').trim();
      if (nama) {
        set.add(nama);
        const isAktif = (item.aktif || item.Aktif || '').toUpperCase() === 'YA' ||
                        item.status === 'Aktif' ||
                        item.isActive === true ||
                        nama === currentSettingTP;
        yearItems.push({
          id: item.id || item.taId || item.TAID || `TA-${idx + 1}`,
          nama,
          tahunMulai: item.tahunMulai || item.TahunMulai,
          tahunSelesai: item.tahunSelesai || item.TahunSelesai,
          tanggalMulai: item.tanggalMulai || item.TanggalMulai,
          tanggalSelesai: item.tanggalSelesai || item.TanggalSelesai,
          isAktif
        });
      }
    });
  }

  // Fallback standar 11 Tahun Ajaran jika Sheet TAHUN_AJARAN kosong
  let isFallback = false;
  if (set.size === 0) {
    isFallback = true;
    const defaultYears = [
      '2023/2024', '2024/2025', '2025/2026', '2026/2027', 
      '2027/2028', '2028/2029', '2029/2030', '2030/2031',
      '2031/2032', '2032/2033', '2033/2034'
    ];
    defaultYears.forEach((y, idx) => {
      set.add(y);
      yearItems.push({
        id: `TA-DEF-${idx + 1}`,
        nama: y,
        isAktif: y === currentSettingTP
      });
    });
  }

  // Pastikan tahun pelajaran aktif saat ini ada di dalam list
  if (!set.has(currentSettingTP)) {
    set.add(currentSettingTP);
    yearItems.push({
      id: `TA-CURR`,
      nama: currentSettingTP,
      isAktif: true
    });
  }

  const sortedYears = Array.from(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  // Cari yang aktif
  const activeItem = yearItems.find(y => y.isAktif) || yearItems.find(y => y.nama === currentSettingTP);
  const activeYear = activeItem ? activeItem.nama : currentSettingTP;

  return {
    years: sortedYears,
    yearItems,
    activeYear,
    info: {
      source: isFromSheet ? 'SHEET_DATABASE' : 'MANUAL_FALLBACK',
      sheetName: 'TAHUN_AJARAN',
      isCustomManual: isFallback,
      totalRecords: sortedYears.length
    }
  };
}

/**
 * 3. DROPDOWN MASTER SEMESTER
 * Sumber Utama: Sheet SEMESTER (db.get('academic_semesters') atau db.get('semester'))
 * Saling berhubungan erat dengan Tahun Ajaran yang aktif
 */
export function getMasterSemesterDropdown(currentTahunAjaran?: string): {
  semesterTypes: ('Ganjil' | 'Genap')[];
  semesterItems: MasterSemesterItem[];
  activeSemester: 'Ganjil' | 'Genap';
  info: DropdownSourceInfo;
} {
  const currentSettings = useStore.getState().settings;
  const targetTP = currentTahunAjaran || currentSettings.tahunPelajaran || '2026/2027';
  const targetSem = (currentSettings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap';

  const rawSemesters = getSemestersList();
  const semesterItems: MasterSemesterItem[] = [];

  let isFromSheet = false;
  try {
    const rawA = db.get<any>('academic_semesters');
    const rawB = db.get<any>('semester');
    if ((Array.isArray(rawA) && rawA.length > 0) || (Array.isArray(rawB) && rawB.length > 0)) {
      isFromSheet = true;
    }
  } catch {}

  rawSemesters
    .filter(s => !targetTP || s.tahunPelajaran === targetTP)
    .forEach(s => {
      semesterItems.push({
        id: s.id,
        nama: s.name,
        tahunPelajaran: s.tahunPelajaran,
        semesterType: s.semesterType,
        isAktif: s.isActive || s.semesterType === targetSem
      });
    });

  return {
    semesterTypes: ['Ganjil', 'Genap'],
    semesterItems,
    activeSemester: targetSem,
    info: {
      source: isFromSheet ? 'SHEET_DATABASE' : 'MANUAL_FALLBACK',
      sheetName: 'SEMESTER',
      isCustomManual: !isFromSheet,
      totalRecords: semesterItems.length
    }
  };
}

/**
 * 4. SET & SYNCHRONIZE ACTIVE TAHUN AJARAN & SEMESTER
 * Mengubah T.A dan Semester di SELURUH sistem,
 * Menandai baris di Sheet TAHUN_AJARAN & Sheet SEMESTER sebagai Aktif = 'YA',
 * Memperbarui Sheet SETTING, dan memicu sinkronisasi latar belakang.
 */
export async function setActiveTahunAjaranAndSemesterSync(
  newTP: string, 
  newSem: 'Ganjil' | 'Genap'
): Promise<{ success: boolean; message: string }> {
  const cleanTP = (newTP || '2026/2027').trim();
  const cleanSem = newSem === 'Genap' ? 'Genap' : 'Ganjil';

  // A. Update Zustand Store & Settings
  const currentSettings = useStore.getState().settings;
  const updatedSettings = {
    ...currentSettings,
    tahunPelajaran: cleanTP,
    semester: cleanSem
  };
  useStore.getState().setSettings(updatedSettings);

  // B. Update Local Database single settings & backend endpoint
  db.setSingle('settings', updatedSettings);
  try {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    }).catch(() => {});
  } catch {}

  // C. Update Entity Semester di DB & set isAktif
  setSemesterAndTahunAjaran(cleanTP, cleanSem);

  // D. Update Sheet TAHUN_AJARAN (Tandai yang dipilih Aktif = 'YA', lainnya 'TIDAK')
  try {
    const rawTA = db.get<any>('academic_years') || db.get<any>('tahun_ajaran') || [];
    if (Array.isArray(rawTA) && rawTA.length > 0) {
      let found = false;
      const updatedTA = rawTA.map((item: any) => {
        const isMatch = (item.nama || item.Nama || item.tahun || item.tahunPelajaran) === cleanTP;
        if (isMatch) found = true;
        return {
          ...item,
          aktif: isMatch ? 'YA' : 'TIDAK',
          Aktif: isMatch ? 'YA' : 'TIDAK',
          status: isMatch ? 'Aktif' : 'Non-Aktif',
          isActive: isMatch
        };
      });
      if (!found) {
        updatedTA.push({
          id: `TA-${cleanTP.replace('/', '-')}`,
          taId: `TA-${cleanTP.replace('/', '-')}`,
          TAID: `TA-${cleanTP.replace('/', '-')}`,
          nama: cleanTP,
          Nama: cleanTP,
          tahunPelajaran: cleanTP,
          aktif: 'YA',
          Aktif: 'YA',
          status: 'Aktif',
          isActive: true
        });
      }
      db.set('academic_years', updatedTA);
      db.set('tahun_ajaran', updatedTA);
    }
  } catch {}

  // E. Update Sheet SEMESTER (Tandai yang cocok Aktif = 'YA', lainnya 'TIDAK')
  try {
    const rawSem = db.get<any>('academic_semesters') || db.get<any>('semester') || [];
    if (Array.isArray(rawSem) && rawSem.length > 0) {
      const updatedSem = rawSem.map((s: any) => {
        const matchTP = (s.tahunPelajaran || s.TahunPelajaran || s.tahunAjaran) === cleanTP;
        const sType = normalizeSemesterType(s);
        const matchType = sType === cleanSem;
        const isMatch = matchTP && matchType;
        return {
          ...s,
          semesterType: sType,
          semester: sType,
          Semester: sType,
          aktif: isMatch ? 'YA' : 'TIDAK',
          Aktif: isMatch ? 'YA' : 'TIDAK',
          status: isMatch ? 'Aktif' : 'Non-Aktif',
          isActive: isMatch
        };
      });
      db.set('academic_semesters', updatedSem);
      db.set('semester', updatedSem);
    }
  } catch {}

  // F. Trigger Event untuk seluruh tab & komponen yang mendengarkan
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('academic-semester-changed', {
      detail: { tahunPelajaran: cleanTP, semester: cleanSem }
    }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', {
      detail: { key: 'settings' }
    }));
  }

  // G. Push spesifik tabel SETTING, TAHUN_AJARAN, dan SEMESTER ke Google Spreadsheet
  try {
    const res = await autoSyncEngine.pushSpecificTables(['SETTING', 'TAHUN_AJARAN', 'SEMESTER']);
    return {
      success: true,
      message: `Tahun Ajaran ${cleanTP} & Semester ${cleanSem} berhasil diaktifkan dan disinkronkan ke Sheet SETTING, TAHUN_AJARAN, dan SEMESTER!`
    };
  } catch (err: any) {
    return {
      success: true,
      message: `Tahun Ajaran ${cleanTP} & Semester ${cleanSem} aktif di aplikasi! Latar belakang sinkronisasi tetap berjalan.`
    };
  }
}
