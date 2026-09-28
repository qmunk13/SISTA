import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Returns YYYY-MM-DD string in local user timezone (WIB/WITA/WIT/device time)
 * Avoids the UTC offset bug where new Date().toISOString() shows yesterday during early morning hours.
 */
export function getLocalDateString(d: Date = new Date()): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    d = new Date();
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return getLocalDateString(new Date());
}

export const CLASSES: string[] = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];

export const STANDARD_CLASSES = [...CLASSES];

export const STATUSES = [
  "Aktif",       // ✅ Aktif : SISWA Aktif (terhitung aktif di semua aplikasi)
  "Tidak Aktif", // ⚠️ Tidak Aktif : Jarang Masuk (masih terhitung siswa aktif di semua aplikasi)
  "Belum",       // ⏳ Belum : Non-Dapodik (masih terhitung siswa aktif di semua aplikasi)
  "Pindah",      // 🚚 Pindah : Mutasi (hanya di Master Data, Mutasi, dan Keuangan)
  "Lulus",       // 🎓 Lulus : Alumni (hanya di Master Data, Alumni, dan Keuangan)
  "Keluar"       // 🚪 Keluar : Drop Out (hanya di Master Data, DO/Mutasi, dan Keuangan)
];

export function standardizeDate(value: any): string {
  if (value === null || value === undefined) return '';

  // 1. If value is a JavaScript Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    // If created as UTC midnight or near UTC midnight
    if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, '0');
      const d = String(value.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Otherwise use local date getters
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. If it's a number or numeric string (Excel serial number e.g. 43620)
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) && Number(value) > 1000 && Number(value) < 100000)
  ) {
    const num = Number(value);
    // Excel base epoch: Dec 30, 1899 (compensates for 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Math.round(num) * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  let str = String(value).trim();
  if (!str || str === '-') return '';

  // 3. String matches YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. 2019-06-04)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. String matches DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (Indonesian format e.g. 04/06/2019)
  const dmYMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    let year = dmYMatch[3];
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum > 30 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 5. Handle ISO timestamp string with T e.g. "2019-06-04T00:00:00.000Z"
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    const ymd = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
  }

  // 6. Fallback native date parsing
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    // fallback
  }

  return str;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const cleanDate = standardizeDate(dateString);
  if (!cleanDate) return String(dateString);

  try {
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      // Create local date object explicitly to avoid UTC timezone offset shifts
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Memformat jam operasional atau waktu pelaksanaan menjadi string 'HH:mm' (WIB).
 * Mengatasi artefak serialisasi Google Sheets / Excel di mana sel Jam/Waktu (contoh 19:30)
 * diekspor sebagai tanggal epoch spreadsheet: '1899-12-30T12:22:48.000Z'
 * (karena zona waktu Batavia/Jakarta pada tahun 1899 adalah UTC+07:07:12).
 */
export function formatClockTime(val: any, defaultTime = '00:00'): string {
  if (val === null || val === undefined) return defaultTime;
  const str = String(val).trim();
  if (!str || str === '-' || str === 'undefined' || str === 'null') return defaultTime;

  // 1. Jika sudah format HH:mm atau HH:mm:ss sederhana (contoh "19:30", "07:00", "19:30:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  // 2. Jika mengandung format ISO Date atau serial tanggal epoch 1899 dari Google Spreadsheet
  if (str.includes('T') || str.includes('Z') || str.includes('1899-')) {
    try {
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        const formatted = dt.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        if (formatted && formatted !== 'Invalid Date') {
          return formatted;
        }
      }
    } catch {}
  }

  // 3. Fallback pencocokan regex jam:menit
  const m = str.match(/(\d{1,2})[:.](\d{2})/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  }

  return defaultTime;
}

export function calculateAge(dobString: string | null | undefined): { years: number; months: number } | null {
  if (!dobString) return null;
  const cleanDate = standardizeDate(dobString);
  if (!cleanDate) return null;

  try {
    let birthDate: Date;
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      birthDate = new Date(year, month, day);
    } else {
      birthDate = new Date(cleanDate);
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months };
  } catch (e) {
    return null;
  }
}

export function formatAge(dobString: string | null | undefined): string {
  const age = calculateAge(dobString);
  if (!age) return '-';
  return `${age.years} tahun ${age.months} bulan`;
}

export function extractGoogleDriveFileId(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  
  // Jika langsung berupa ID Google Drive murni (25+ karakter alphanumeric/dash/underscore)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(cleanUrl)) return cleanUrl;

  // Format /file/d/FILE_ID/
  const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Format /d/FILE_ID/
  const dMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  // Format ?id=FILE_ID atau &id=FILE_ID
  const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Format uc?export=view&id=FILE_ID
  const ucMatch = cleanUrl.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) return ucMatch[1];

  // Format open?id=FILE_ID
  const openMatch = cleanUrl.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  // Fallback: temukan token 25+ karakter jika bukan link folder spesifik
  if (!cleanUrl.includes('/folders/')) {
    const genericMatch = cleanUrl.match(/([a-zA-Z0-9_-]{25,})/);
    if (genericMatch && genericMatch[1]) return genericMatch[1];
  }

  return '';
}

export function getGoogleDriveDirectImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image') || cleanUrl.startsWith('blob:')) return cleanUrl;

  const id = extractGoogleDriveFileId(cleanUrl);
  if (id) {
    // lh3.googleusercontent.com/d/ID adalah CDN resmi Google yang bebas cookie pihak ketiga & bekerja sempurna dalam iframe
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return cleanUrl;
}

export function getGoogleDriveThumbnailUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image') || cleanUrl.startsWith('blob:')) return cleanUrl;

  const id = extractGoogleDriveFileId(cleanUrl);
  if (id) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w500`;
  }
  return cleanUrl;
}

export function normalizeClassName(className: string | null | undefined): string {
  if (!className) return '';
  const str = String(className).trim();
  if (str.toUpperCase() === 'NONE' || str.toUpperCase() === 'TANPA KELAS') return 'None';
  return str
    .toUpperCase()
    .replace(/\bKELAS\b/gi, '')
    .replace(/[-_]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export const PKBM_PACKAGES = [
  { id: 'PAKET_A', name: 'PAKET A (SD KELAS 4 - 6)', jenjang: 'SD / Paket A', classes: ['4', '5', '6'] },
  { id: 'PAKET_B', name: 'PAKET B (SMP KELAS 7 - 9)', jenjang: 'SMP / Paket B', classes: ['7', '8', '9'] },
  { id: 'PAKET_C', name: 'PAKET C (SMA KELAS 10 - 12)', jenjang: 'SMA / Paket C', classes: ['10', '11', '12'] },
];

export const DEFAULT_CLASSES = [...CLASSES];

export function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function getPaketNameByClass(className: string | null | undefined): string {
  const clean = normalizeClassName(className);
  if (['4', '5', '6'].includes(clean)) return 'SD / PAKET A';
  if (['7', '8', '9'].includes(clean)) return 'SMP / PAKET B';
  if (['10', '11', '12'].includes(clean)) return 'SMA / PAKET C';
  return '';
}

export function formatClassLabel(className: string | null | undefined, withPrefix: boolean = true): string {
  if (!className) return 'Tanpa Kelas';
  const str = String(className).trim();
  if (str === 'Semua' || str === 'Semua Kelas' || str === 'ALL') return 'Semua Kelas';
  const clean = normalizeClassName(className);
  if (!clean || clean === 'NONE' || clean === 'None' || clean === 'Tanpa Kelas') return 'Tanpa Kelas';
  return withPrefix ? `Kelas ${clean}` : clean;
}

export function matchClass(studentClass: string | number | null | undefined, targetClass: string | number | null | undefined): boolean {
  if (targetClass === null || targetClass === undefined) return true;
  const targetStr = String(targetClass).trim();
  if (!targetStr || targetStr === 'Semua' || targetStr === 'Semua Kelas' || targetStr === 'ALL' || targetStr === '') return true;
  if (studentClass === null || studentClass === undefined) return targetStr === 'None' || targetStr === 'Tanpa Kelas';
  
  const studentStr = String(studentClass).trim();
  const cleanStudent = normalizeClassName(studentStr);
  const cleanTarget = normalizeClassName(targetStr);
  if (cleanStudent === cleanTarget) return true;
  
  // Handle multiple classes separated by comma or semicolon in targetClass or studentClass
  if (targetStr.includes(',') || targetStr.includes(';')) {
    const list = targetStr.split(/[,;]/).map(c => normalizeClassName(c));
    if (list.includes(cleanStudent)) return true;
  }
  if (studentStr.includes(',') || studentStr.includes(';')) {
    const list = studentStr.split(/[,;]/).map(c => normalizeClassName(c));
    if (list.includes(cleanTarget)) return true;
  }
  
  // Grade-level matching: e.g. target is '4' or 'KELAS 4' while student is '4A', or vice-versa
  const studentDigit = cleanStudent.replace(/\D/g, '');
  const targetDigit = cleanTarget.replace(/\D/g, '');
  if (studentDigit && targetDigit && studentDigit === targetDigit) {
    if (/^\d+$/.test(cleanTarget) || /^\d+$/.test(cleanStudent)) return true;
    if (cleanTarget.startsWith(cleanStudent) || cleanStudent.startsWith(cleanTarget)) return true;
  }

  // Paket Kesetaraan matching (Paket A: Kls 4-6, Paket B: Kls 7-9, Paket C: Kls 10-12)
  const lowerTarget = targetStr.toLowerCase();
  const lowerStudent = studentStr.toLowerCase();
  if (lowerTarget.includes('paket a') && (lowerStudent.includes('paket a') || ['4', '5', '6'].includes(studentDigit))) return true;
  if (lowerTarget.includes('paket b') && (lowerStudent.includes('paket b') || ['7', '8', '9'].includes(studentDigit))) return true;
  if (lowerTarget.includes('paket c') && (lowerStudent.includes('paket c') || ['10', '11', '12'].includes(studentDigit))) return true;

  return false;
}

export function matchStatusActive(status: string | null | undefined): boolean {
  if (!status) return true; // Default aktif jika kosong (dianggap Belum / Aktif)
  const cleanStatus = String(status).trim().toLowerCase();
  
  // Status TIDAK AKTIF / NON-AKTIF (Dilarang masuk ke Akademik & Kurikulum, Status Yatim/Piatu, dan Ujian Online):
  if (
    cleanStatus.includes('tidak') || 
    cleanStatus.includes('nonaktif') || 
    cleanStatus.includes('non-aktif') ||
    cleanStatus.includes('non aktif') ||
    cleanStatus.includes('inactive') ||
    cleanStatus === 'belum' ||
    cleanStatus === 'pending'
  ) {
    return false;
  }

  // Status Non-Operasional / Arsip (KECUALI di Master Data, Mutasi/Alumni/DO, dan Keuangan):
  // 🚚 Pindah : Mutasi
  if (cleanStatus.includes('pindah') || cleanStatus.includes('mutasi')) return false;
  // 🎓 Lulus : Alumni
  if (cleanStatus.includes('lulus') || cleanStatus.includes('alumni')) return false;
  // 🚪 Keluar : Drop Out
  if (cleanStatus.includes('keluar') || cleanStatus.includes('do') || cleanStatus.includes('drop')) return false;

  return true;
}

export function matchStatusKenaikanKelas(status: string | null | undefined): boolean {
  if (!status) return true; // Siswa tanpa status tetap ada di kenaikan kelas
  const cleanStatus = String(status).trim().toLowerCase();

  // KECUALI di menu kenaikan kelas: tetap ada siswa yang berstatus TIDAK AKTIF dan BELUM!
  // Hanya mengecualikan siswa yang sudah mutasi/lulus/keluar (alumni / drop out):
  if (cleanStatus.includes('pindah') || cleanStatus.includes('mutasi')) return false;
  if (cleanStatus.includes('lulus') || cleanStatus.includes('alumni')) return false;
  if (cleanStatus.includes('keluar') || cleanStatus.includes('do') || cleanStatus.includes('drop')) return false;

  return true;
}

export function getStatusPriority(status: string | null | undefined): number {
  if (!status) return 3; // Belum / Non-Dapodik
  const s = String(status).trim().toLowerCase();
  
  // 1: ✅ Aktif : SISWA Aktif
  if (s === 'aktif' || s === 'active' || s === 'aktip') return 1;
  
  // 2: ⚠️ Tidak Aktif : Jarang Masuk (masih terhitung siswa aktif)
  if (s.includes('tidak') || s.includes('nonaktif') || s.includes('non-aktif') || s.includes('jarang')) return 2;
  
  // 3: ⏳ Belum : Non-Dapodik (masih terhitung siswa aktif)
  if (s.includes('belum') || s.includes('non-dapodik') || s.includes('nondapodik') || s.includes('pending') || s.includes('draft') || s.includes('calon') || s.includes('daftar')) return 3;
  
  // Status Non-Operasional (Hanya di Master Data & Keuangan):
  // 4: 🚚 Pindah : Mutasi
  if (s.includes('pindah') || s.includes('mutasi')) return 4;
  // 5: 🎓 Lulus : Alumni
  if (s.includes('lulus') || s.includes('alumni')) return 5;
  // 6: 🚪 Keluar : Drop Out
  if (s.includes('keluar') || s.includes('do') || s.includes('drop')) return 6;
  
  return 2;
}

export function getStatusDisplayInfo(status: string | null | undefined): {
  label: string;
  shortLabel: string;
  category: 'operasional' | 'arsip';
  description: string;
  badgeClass: string;
  icon: string;
} {
  const p = getStatusPriority(status);
  switch (p) {
    case 1:
      return {
        label: 'Aktif (SISWA Aktif)',
        shortLabel: 'Aktif',
        category: 'operasional',
        description: 'Siswa aktif terdaftar dan mengikuti pembelajaran penuh',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: '✅'
      };
    case 2:
      return {
        label: 'Tidak Aktif (Jarang Masuk)',
        shortLabel: 'Tidak Aktif',
        category: 'operasional',
        description: 'Jarang masuk / presensi rendah, masih terhitung siswa aktif',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: '⚠️'
      };
    case 3:
      return {
        label: 'Belum (Non-Dapodik)',
        shortLabel: 'Belum',
        category: 'operasional',
        description: 'Non-Dapodik / calon terdaftar, masih terhitung siswa aktif',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: '⏳'
      };
    case 4:
      return {
        label: 'Pindah (Mutasi)',
        shortLabel: 'Pindah',
        category: 'arsip',
        description: 'Mutasi pindah ke satuan pendidikan lain (hanya Master Data & Keuangan)',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: '🚚'
      };
    case 5:
      return {
        label: 'Lulus (Alumni)',
        shortLabel: 'Lulus',
        category: 'arsip',
        description: 'Alumni yang telah menyelesaikan pendidikan (hanya Master Data & Keuangan)',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: '🎓'
      };
    case 6:
      return {
        label: 'Keluar (Drop Out)',
        shortLabel: 'Keluar',
        category: 'arsip',
        description: 'Siswa putus sekolah / Drop Out (hanya Master Data & Keuangan)',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: '🚪'
      };
    default:
      return {
        label: 'Aktif',
        shortLabel: 'Aktif',
        category: 'operasional',
        description: 'Siswa Aktif',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: '✅'
      };
  }
}

export function sortStudentsByStatusAndName<T extends { name?: string; status?: string }>(studentsList: T[]): T[] {
  return [...studentsList].sort((a, b) => {
    const pA = getStatusPriority(a?.status);
    const pB = getStatusPriority(b?.status);
    if (pA !== pB) {
      return pA - pB; // 1: Aktif first, 2: Tidak Aktif second, 3: Belum third
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'id');
  });
}

export function getActiveClasses(students: any[]): string[] {
  const set = new Set<string>();

  // 1. Sumber Utama: Sheet KELAS dari LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const rawA = localStorage.getItem('erp_academic_classes');
      const rawB = localStorage.getItem('erp_rombel');
      const parsedA = rawA ? JSON.parse(rawA) : null;
      const parsedB = rawB ? JSON.parse(rawB) : null;
      const sheetClasses = (Array.isArray(parsedA) && parsedA.length > 0) ? parsedA : ((Array.isArray(parsedB) && parsedB.length > 0) ? parsedB : []);
      if (sheetClasses.length > 0) {
        sheetClasses.forEach((item: any) => {
          const isAktif = !item.status || String(item.status).toUpperCase() === 'AKTIF' || item.status === 'Aktif';
          if (isAktif) {
            const rawCls = item.cls || item.namaKelas || item.NamaKelas || item.kelas || item.Kelas;
            if (rawCls) {
              const clean = normalizeClassName(String(rawCls));
              if (clean && clean !== 'None' && clean !== 'NONE') set.add(clean);
            }
          }
        });
      }
    } catch {}
  }

  // 2. Sumber Kedua: Siswa Aktif terdaftar
  if (Array.isArray(students) && students.length > 0) {
    students.forEach(s => {
      if (s && matchStatusActive(s.status) && s.class) {
        const clean = normalizeClassName(s.class);
        if (clean && clean !== 'None' && clean !== 'NONE') set.add(clean);
      }
    });
  }

  // 3. Fallback jika Sheet KELAS dan Siswa kosong
  if (set.size === 0) {
    DEFAULT_CLASSES.forEach(c => set.add(c));
  }
  return sortClasses(Array.from(set));
}

export function getAllClasses(students: any[]): string[] {
  const set = new Set<string>();

  // 1. Sumber Utama: Sheet KELAS dari LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const rawA = localStorage.getItem('erp_academic_classes');
      const rawB = localStorage.getItem('erp_rombel');
      const parsedA = rawA ? JSON.parse(rawA) : null;
      const parsedB = rawB ? JSON.parse(rawB) : null;
      const sheetClasses = (Array.isArray(parsedA) && parsedA.length > 0) ? parsedA : ((Array.isArray(parsedB) && parsedB.length > 0) ? parsedB : []);
      if (sheetClasses.length > 0) {
        sheetClasses.forEach((item: any) => {
          const rawCls = item.cls || item.namaKelas || item.NamaKelas || item.kelas || item.Kelas;
          if (rawCls) {
            const clean = normalizeClassName(String(rawCls));
            if (clean && clean !== 'None' && clean !== 'NONE') set.add(clean);
          }
        });
      }
    } catch {}
  }

  // 2. Sumber Kedua: Semua Siswa terdaftar
  if (Array.isArray(students) && students.length > 0) {
    students.forEach(s => {
      if (s && s.class) {
        const clean = normalizeClassName(s.class);
        if (clean && clean !== 'None' && clean !== 'NONE') set.add(clean);
      }
    });
  }

  // 3. Fallback jika Sheet KELAS dan Siswa kosong
  if (set.size === 0) {
    DEFAULT_CLASSES.forEach(c => set.add(c));
  }
  return sortClasses(Array.from(set));
}

export function fileToBase64WithCompression(file: File, maxWidth: number = 400, maxHeight: number = 500, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// STATUS YATIM PIATU DEFINISI & HELPER
// Yatim: Bapak/Ayah sudah meninggal
// Piatu: Ibu sudah meninggal
// Yatim Piatu: Ayah dan Ibu keduanya sudah meninggal
// Lengkap: Kedua orang tua masih hidup
// -------------------------------------------------------------
export type YatimStatus = 'Lengkap' | 'Yatim' | 'Piatu' | 'Yatim Piatu';

export function getStudentStatusYatim(student?: any): YatimStatus {
  if (!student) return 'Lengkap';

  const rawStatusYatim = String(student.statusYatim || student.status_yatim || '').trim().toLowerCase();
  if (
    rawStatusYatim === 'yatim piatu' ||
    rawStatusYatim.includes('yatim piatu') ||
    rawStatusYatim.includes('yatimpiatu') ||
    rawStatusYatim.includes('yatim-piatu')
  ) {
    return 'Yatim Piatu';
  }
  if (rawStatusYatim === 'yatim') {
    return 'Yatim';
  }
  if (rawStatusYatim === 'piatu') {
    return 'Piatu';
  }
  if (rawStatusYatim === 'lengkap' || rawStatusYatim === 'bukan yatim' || rawStatusYatim === 'ada') {
    return 'Lengkap';
  }

  // Cek berdasarkan status hidup ayah dan status hidup ibu
  const sAyah = String(student.statusAyah || student.status_ayah || '').toLowerCase();
  const sIbu = String(student.statusIbu || student.status_ibu || '').toLowerCase();
  const nAyah = String(student.namaAyah || student.parentName || '').toLowerCase();
  const nIbu = String(student.namaIbu || '').toLowerCase();

  const ayahMeninggal = sAyah.includes('meninggal') || sAyah.includes('alm') || nAyah.includes('alm.') || nAyah.includes('(alm)');
  const ibuMeninggal = sIbu.includes('meninggal') || sIbu.includes('alm') || nIbu.includes('alm.') || nIbu.includes('almh') || nIbu.includes('(alm)');

  if (ayahMeninggal && ibuMeninggal) return 'Yatim Piatu';
  if (ayahMeninggal) return 'Yatim';
  if (ibuMeninggal) return 'Piatu';

  return 'Lengkap';
}

export function getYatimStatusInfo(status: YatimStatus | string) {
  const norm = String(status || '').trim().toLowerCase();
  if (norm.includes('yatim piatu') || norm.includes('yatimpiatu') || norm.includes('yatim-piatu')) {
    return {
      status: 'Yatim Piatu' as YatimStatus,
      label: 'Yatim Piatu',
      sublabel: 'Ayah & Ibu Meninggal',
      description: 'Ayah dan Ibu keduanya sudah meninggal dunia',
      badgeClass: 'bg-slate-900 text-white border-slate-950 shadow-xs',
      chipClass: 'bg-slate-800 text-white font-bold',
      lightBg: 'bg-slate-100 text-slate-900 border border-slate-300',
      pillClass: 'bg-slate-100 text-slate-800 border-slate-300',
      textColor: 'text-slate-900',
      icon: '🖤'
    };
  }
  if (norm === 'yatim' || norm.includes('yatim')) {
    return {
      status: 'Yatim' as YatimStatus,
      label: 'Yatim',
      sublabel: 'Ayah Meninggal',
      description: 'Bapak / Ayah sudah meninggal dunia',
      badgeClass: 'bg-purple-600 text-white border-purple-700 shadow-xs',
      chipClass: 'bg-purple-600 text-white font-bold',
      lightBg: 'bg-purple-50 text-purple-900 border border-purple-200',
      pillClass: 'bg-purple-50 text-purple-800 border-purple-200',
      textColor: 'text-purple-700',
      icon: '💜'
    };
  }
  if (norm === 'piatu' || norm.includes('piatu')) {
    return {
      status: 'Piatu' as YatimStatus,
      label: 'Piatu',
      sublabel: 'Ibu Meninggal',
      description: 'Ibu sudah meninggal dunia',
      badgeClass: 'bg-pink-600 text-white border-pink-700 shadow-xs',
      chipClass: 'bg-pink-600 text-white font-bold',
      lightBg: 'bg-pink-50 text-pink-900 border border-pink-200',
      pillClass: 'bg-pink-50 text-pink-800 border-pink-200',
      textColor: 'text-pink-700',
      icon: '🌸'
    };
  }
  return {
    status: 'Lengkap' as YatimStatus,
    label: 'Lengkap',
    sublabel: 'Orang Tua Masih Hidup',
    description: 'Kedua orang tua (Ayah & Ibu) masih hidup',
    badgeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
    chipClass: 'bg-emerald-600 text-white font-bold',
    lightBg: 'bg-emerald-50 text-emerald-900 border border-emerald-200',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textColor: 'text-emerald-700',
    icon: '🌿'
  };
}

/**
 * Safe cross-platform print trigger helper.
 * Handles iframe focus, micro-tick timing, and fallback.
 */
export function triggerPrint(): void {
  try {
    if (typeof window !== 'undefined') {
      window.focus();
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Window print error:", err);
        }
      }, 50);
    }
  } catch (e) {
    console.error("Failed to trigger print:", e);
  }
}



