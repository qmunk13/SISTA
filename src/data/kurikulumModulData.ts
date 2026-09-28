// Interface Type Definition untuk Kurikulum Modul dan Master Silabus
// Digunakan untuk data dinamis dari Google Spreadsheet (MASTER_SILABUS & KURIKULUM_MODUL)

export interface SubModulItem {
  id: string;
  subModulKe?: number;
  kodeSub?: string;
  judul?: string;
  statusSoal?: string;
  keterangan?: string;
  [key: string]: any;
}

export interface ModulKurikulum {
  id: string;
  noModul?: number | string;
  kodeModul?: string;
  judulModul?: string;
  kodeMapel?: string;
  NamaMapel?: string;
  Jenjang?: string;
  kelas?: number | string;
  semester?: string;
  Unit?: string;
  materiPokok?: string | string[];
  // Backwards compatibility aliases
  kode?: string;
  nama?: string;
  temaModul?: string;
  mapel?: string;
  mataPelajaran?: string;
  singkatanMapel?: string;
  singkatan?: string;
  tingkat?: number;
  tingkatKelas?: string;
  tingkatLabel?: string;
  paket?: 'A' | 'B' | 'C' | string;
  modulNo?: number | string;
  modulKe?: number;
  babUnit?: string;
  subBab?: any;
  subModulList?: SubModulItem[];
  [key: string]: any;
}

export type KurikulumModulItem = ModulKurikulum;

// 11 Kolom Standar Resmi KURIKULUM_MODUL
export const OFFICIAL_KURIKULUM_MODUL_COLUMNS = [
  'id',
  'noModul',
  'kodeModul',
  'judulModul',
  'kodeMapel',
  'NamaMapel',
  'Jenjang',
  'kelas',
  'semester',
  'Unit',
  'materiPokok'
] as const;

export interface KurikulumModulValidationResult {
  isValid: boolean;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  missingColumns: string[];
  errors: string[];
  validatedData: ModulKurikulum[];
}

/**
 * Validasi dan format satu baris data KURIKULUM_MODUL agar mematuhi skema 11 kolom
 */
export function validateKurikulumModulRow(row: any, index: number = 0): { isValid: boolean; row: ModulKurikulum; errors: string[] } {
  const errors: string[] = [];
  if (!row || typeof row !== 'object') {
    return {
      isValid: false,
      row: {
        id: `MOD-${index + 1}`,
        noModul: index + 1,
        kodeModul: '',
        judulModul: '',
        kodeMapel: '',
        NamaMapel: '',
        Jenjang: '',
        kelas: '',
        semester: '',
        Unit: '',
        materiPokok: ''
      },
      errors: [`Baris ke-${index + 1} tidak valid atau bukan objek data.`]
    };
  }

  // Normalisasi kolom sesuai 11 Header Resmi
  const id = String(row.id || `MOD-${index + 1}`).trim();
  const noModul = row.noModul !== undefined && row.noModul !== '' 
    ? (isNaN(Number(row.noModul)) ? String(row.noModul).trim() : Number(row.noModul))
    : (row.modulNo || index + 1);
  const kodeModul = String(row.kodeModul || row.kode || '').trim();
  const judulModul = String(row.judulModul || row.nama || row.temaModul || '').trim();
  const kodeMapel = String(row.kodeMapel || row.singkatan || row.singkatanMapel || '').trim();
  const NamaMapel = String(row.NamaMapel || row.mataPelajaran || row.mapel || '').trim();
  const Jenjang = String(row.Jenjang || row.paket || '').trim();
  const kelas = row.kelas !== undefined && row.kelas !== null ? String(row.kelas).trim() : '';
  const semester = String(row.semester || '').trim();
  const Unit = String(row.Unit || row.babUnit || '').trim();
  
  let materiPokokStr = '';
  if (Array.isArray(row.materiPokok)) {
    materiPokokStr = row.materiPokok.join(', ');
  } else if (row.materiPokok !== undefined && row.materiPokok !== null) {
    materiPokokStr = String(row.materiPokok).trim();
  }

  // Cek atribut penting
  if (!kodeModul && !judulModul && !NamaMapel) {
    errors.push(`Baris ke-${index + 1}: Data modul kosong (kodeModul, judulModul, dan NamaMapel tidak terisi).`);
  }

  const normalizedRow: ModulKurikulum = {
    id,
    noModul,
    kodeModul,
    judulModul,
    kodeMapel,
    NamaMapel,
    Jenjang,
    kelas,
    semester,
    Unit,
    materiPokok: materiPokokStr
  };

  return {
    isValid: errors.length === 0,
    row: normalizedRow,
    errors
  };
}

/**
 * Validasi skema kumpulan data KURIKULUM_MODUL sebelum sinkronisasi dijalankan
 */
export function validateKurikulumModulSchema(rawData: any): KurikulumModulValidationResult {
  if (!rawData) {
    return {
      isValid: true,
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      missingColumns: [],
      errors: [],
      validatedData: []
    };
  }

  const rows: any[] = Array.isArray(rawData) ? rawData : (typeof rawData === 'object' ? [rawData] : []);
  const errors: string[] = [];
  const validatedData: ModulKurikulum[] = [];
  let validRowsCount = 0;
  let invalidRowsCount = 0;

  // Cek kelengkapan kolom dari baris pertama sampel jika ada
  const missingColumns: string[] = [];
  if (rows.length > 0 && typeof rows[0] === 'object') {
    const sampleKeys = Object.keys(rows[0]).map(k => k.toLowerCase());
    for (const col of OFFICIAL_KURIKULUM_MODUL_COLUMNS) {
      const colLower = col.toLowerCase();
      // Match exact or known alias
      const hasCol = sampleKeys.includes(colLower) ||
        (col === 'kodeMapel' && (sampleKeys.includes('singkatan') || sampleKeys.includes('singkatanmapel'))) ||
        (col === 'NamaMapel' && (sampleKeys.includes('matapelajaran') || sampleKeys.includes('mapel'))) ||
        (col === 'Jenjang' && sampleKeys.includes('paket')) ||
        (col === 'Unit' && sampleKeys.includes('babunit'));
      if (!hasCol) {
        missingColumns.push(col);
      }
    }
  }

  rows.forEach((r, idx) => {
    const validation = validateKurikulumModulRow(r, idx);
    validatedData.push(validation.row);
    if (validation.isValid) {
      validRowsCount++;
    } else {
      invalidRowsCount++;
      errors.push(...validation.errors);
    }
  });

  return {
    isValid: invalidRowsCount === 0,
    totalRows: rows.length,
    validRowsCount,
    invalidRowsCount,
    missingColumns,
    errors,
    validatedData
  };
}

export interface MasterSilabusItem {
  id: string;
  no: number | string;
  kodeJenjang?: string;
  Jenjang?: 'A' | 'B' | 'C' | string;
  kelas?: number | string;
  semester?: 'SM-I' | 'SM-II' | string;
  kodeMapel?: string;
  NamaMapel?: string;
  noModul?: number | string;
  temaModul?: string;
  subKe?: string | number;
  kodeSubTugas?: string;
  topikSubTugas?: string;
  status?: string;
  keterangan?: string;

  // Backwards compatibility aliases
  kodePaket?: string;
  paket?: 'A' | 'B' | 'C' | string;
  mataPelajaran?: string;
  mapel?: string;
  singkatan?: string;
  sing?: string;
  noModulAngka?: number;
  modul?: number | string;
  modulNo?: number | string;
  namaModulBab?: string;
  namaModulLengkap?: string;
  babUnit?: string;
  noSubModul?: number;
  singkatanDanJudul?: string;
  judulSubModul?: string;
  subBab?: string | string[];
  statusSoal?: string;
  catatan?: string;
  alokasiWaktu?: string;
  deskripsiTugas?: string;
  fileUrl?: string;
  FileUrl?: string;
  pdfUrl?: string;
  PdfUrl?: string;
  fileName?: string;
  FileName?: string;
  directUrl?: string;
  driveId?: string;
  uploadedAt?: string;
  [key: string]: any;
}

export type SilabusItemRow = MasterSilabusItem;

// 15+2 Kolom Standar Resmi MASTER_SILABUS (Mendukung Kolom Tautan Berkas & Nama Berkas)
export const OFFICIAL_MASTER_SILABUS_COLUMNS = [
  'id',
  'no',
  'kodeJenjang',
  'Jenjang',
  'kelas',
  'semester',
  'kodeMapel',
  'NamaMapel',
  'noModul',
  'temaModul',
  'subKe',
  'kodeSubTugas',
  'topikSubTugas',
  'status',
  'keterangan',
  'fileUrl',
  'fileName'
] as const;

export interface MasterSilabusValidationResult {
  isValid: boolean;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  missingColumns: string[];
  errors: string[];
  validatedData: MasterSilabusItem[];
}

/**
 * Validasi dan format satu baris data MASTER_SILABUS agar mematuhi skema standar
 * Mendukung deteksi tautan berkas otomatis dari berbagai nama kolom Google Sheets
 */
export function validateMasterSilabusRow(row: any, index: number = 0): { isValid: boolean; row: MasterSilabusItem; errors: string[] } {
  const errors: string[] = [];
  if (!row || typeof row !== 'object') {
    return {
      isValid: false,
      row: {
        id: `MS-${index + 1}-1-${index + 1}`,
        no: index + 1,
        kodeJenjang: '',
        Jenjang: '',
        kelas: '',
        semester: 'SM-I',
        kodeMapel: '',
        NamaMapel: '',
        noModul: 1,
        temaModul: '',
        subKe: 'Unit 1',
        kodeSubTugas: '',
        topikSubTugas: '',
        status: 'Tersedia',
        keterangan: '',
        fileUrl: '',
        fileName: ''
      },
      errors: [`Baris ke-${index + 1} tidak valid atau bukan objek data.`]
    };
  }

  // Normalisasi kolom sesuai Header Resmi
  const no = row.no !== undefined && row.no !== ''
    ? (isNaN(Number(row.no)) ? String(row.no).trim() : Number(row.no))
    : index + 1;
  const subKe = row.subKe !== undefined && row.subKe !== ''
    ? String(row.subKe).trim()
    : `Unit ${row.noSubModul || 1}`;
  const id = String(row.id || `MS-${no}-${subKe}-${index + 1}`).trim();
  const kodeJenjang = String(row.kodeJenjang || row.kodePaket || row.namaModulLengkap || '').trim();
  const kelas = row.kelas !== undefined && row.kelas !== null ? String(row.kelas).trim() : '';
  const Jenjang = String(row.Jenjang || row.paket || (['4', '5', '6'].includes(kelas) ? 'A' : ['7', '8', '9'].includes(kelas) ? 'B' : ['10', '11', '12'].includes(kelas) ? 'C' : '')).trim();
  const semester = String(row.semester || 'SM-I').trim();
  const kodeMapel = String(row.kodeMapel || row.singkatan || row.sing || '').trim();
  const NamaMapel = String(row.NamaMapel || row.mataPelajaran || row.mapel || '').trim();
  const noModul = row.noModul !== undefined && row.noModul !== ''
    ? (isNaN(Number(row.noModul)) ? String(row.noModul).trim() : Number(row.noModul))
    : (row.modul || row.modulNo || row.noModulAngka || 1);
  const temaModul = String(row.temaModul || row.namaModulBab || row.babUnit || '').trim();
  const kodeSubTugas = String(row.kodeSubTugas || row.singkatanDanJudul || '').trim();
  const topikSubTugas = String(row.topikSubTugas || row.judulSubModul || '').trim();
  const status = String(row.status || row.statusSoal || 'Tersedia').trim();
  const keterangan = String(row.keterangan || row.catatan || '').trim();

  // Deteksi tautan file dari berbagai kemungkinan alias header Google Sheets
  let fileUrl = String(
    row.fileUrl || row.FileUrl || row.pdfUrl || row.PdfUrl || row.linkMateri || 
    row.link || row.Link || row.url || row.URL || row.linkModul || row.LinkModul || 
    row.linkFile || row.LinkFile || row.linkBerkas || row.LinkBerkas || row.tautan || row.Tautan || 
    row.berkas || row.Berkas || row.driveUrl || row.DriveUrl || row.file || row.File || ''
  ).trim();

  // Jika belum ada URL langsung, periksa apakah kolom keterangan menyertakan tautan URL/Google Drive
  if (!fileUrl && keterangan) {
    const urlMatch = keterangan.match(/https?:\/\/[^\s"',;<>]+/i);
    if (urlMatch && urlMatch[0]) {
      fileUrl = urlMatch[0].trim();
    }
  }

  // Deteksi nama berkas dari berbagai variasi alias
  let fileName = String(
    row.fileName || row.FileName || row.namaBerkas || row.NamaBerkas || 
    row.namaFile || row.NamaFile || row.judulFile || row.JudulFile || ''
  ).trim();

  let directUrl = String(row.directUrl || row.DirectUrl || '').trim();
  let driveId = String(row.driveId || row.DriveId || '').trim();
  let uploadedAt = String(row.uploadedAt || '').trim();

  // Fallback ke cache persisten lokal (LocalStorage) jika pada baris ini tautan belum ada
  if (!fileUrl && typeof window !== 'undefined') {
    try {
      const persisted = localStorage.getItem('sista_silabus_file_links');
      if (persisted) {
        const linkMap = JSON.parse(persisted);
        const kId = id;
        const kNo = String(no);
        const kKode = kodeSubTugas;
        const saved = (kId && linkMap[kId]) || (kNo && (linkMap[kNo] || linkMap[`NO_${kNo}`])) || (kKode && linkMap[kKode]);
        const sUrl = saved ? (saved.fileUrl || saved.u || saved.url) : '';
        if (saved && sUrl) {
          fileUrl = String(sUrl).trim();
          if (!fileName && (saved.fileName || saved.n)) fileName = saved.fileName || saved.n;
          if (!directUrl && (saved.directUrl || saved.r)) directUrl = saved.directUrl || saved.r;
          if (!driveId && (saved.driveId || saved.d)) driveId = saved.driveId || saved.d;
          if (!uploadedAt && saved.uploadedAt) uploadedAt = saved.uploadedAt;
        }
      }
    } catch {
      // Abaikan bila SSR / storage error
    }
  }

  // Format Google Drive direct link jika URL mengarah ke drive.google.com
  if (fileUrl && fileUrl.includes('drive.google.com')) {
    const match1 = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const match2 = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const match3 = fileUrl.match(/d\/([a-zA-Z0-9_-]+)/);
    const foundId = (match1 && match1[1]) || (match2 && match2[1]) || (match3 && match3[1]);
    if (foundId) {
      if (!driveId) driveId = foundId;
      if (!directUrl) directUrl = `https://drive.google.com/uc?export=download&id=${foundId}`;
    }
  }

  if (!topikSubTugas && !NamaMapel && !kodeSubTugas) {
    errors.push(`Baris ke-${index + 1}: Data silabus kosong (topikSubTugas, NamaMapel, dan kodeSubTugas tidak terisi).`);
  }

  const normalizedRow: MasterSilabusItem = {
    id,
    no,
    kodeJenjang,
    Jenjang,
    kelas,
    semester,
    kodeMapel,
    NamaMapel,
    noModul,
    temaModul,
    subKe,
    kodeSubTugas,
    topikSubTugas,
    status,
    keterangan,
    fileUrl,
    FileUrl: fileUrl,
    pdfUrl: fileUrl,
    fileName: fileName || (fileUrl ? `Modul_${no}_${NamaMapel || 'Silabus'}.pdf` : ''),
    directUrl: directUrl || fileUrl,
    driveId,
    uploadedAt: uploadedAt || (fileUrl ? new Date().toISOString() : ''),
    // Alias backwards compatibility
    kodePaket: kodeJenjang,
    paket: Jenjang,
    mataPelajaran: NamaMapel,
    mapel: NamaMapel,
    singkatan: kodeMapel,
    sing: kodeMapel,
    modul: noModul
  };

  return {
    isValid: errors.length === 0,
    row: normalizedRow,
    errors
  };
}

/**
 * Validasi skema kumpulan data MASTER_SILABUS sebelum sinkronisasi dijalankan
 */
export function validateMasterSilabusSchema(rawData: any): MasterSilabusValidationResult {
  if (!rawData) {
    return {
      isValid: true,
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      missingColumns: [],
      errors: [],
      validatedData: []
    };
  }

  const rows: any[] = Array.isArray(rawData) ? rawData : (typeof rawData === 'object' ? [rawData] : []);
  const errors: string[] = [];
  const validatedData: MasterSilabusItem[] = [];
  let validRowsCount = 0;
  let invalidRowsCount = 0;

  const missingColumns: string[] = [];
  if (rows.length > 0 && typeof rows[0] === 'object') {
    const sampleKeys = Object.keys(rows[0]).map(k => k.toLowerCase());
    for (const col of OFFICIAL_MASTER_SILABUS_COLUMNS) {
      const colLower = col.toLowerCase();
      const hasCol = sampleKeys.includes(colLower) ||
        (col === 'kodeJenjang' && (sampleKeys.includes('kodepaket') || sampleKeys.includes('namamodullengkap'))) ||
        (col === 'Jenjang' && sampleKeys.includes('paket')) ||
        (col === 'kodeMapel' && (sampleKeys.includes('singkatan') || sampleKeys.includes('sing'))) ||
        (col === 'NamaMapel' && (sampleKeys.includes('matapelajaran') || sampleKeys.includes('mapel'))) ||
        (col === 'noModul' && (sampleKeys.includes('modul') || sampleKeys.includes('modulno'))) ||
        (col === 'temaModul' && (sampleKeys.includes('namamodulbab') || sampleKeys.includes('babunit'))) ||
        (col === 'topikSubTugas' && sampleKeys.includes('judulsubmodul')) ||
        (col === 'status' && sampleKeys.includes('statussoal')) ||
        (col === 'fileUrl' && (sampleKeys.includes('link') || sampleKeys.includes('url') || sampleKeys.includes('linkmodul') || sampleKeys.includes('linkfile') || sampleKeys.includes('tautan') || sampleKeys.includes('pdfurl') || sampleKeys.includes('pdf'))) ||
        (col === 'fileName' && (sampleKeys.includes('namaberkas') || sampleKeys.includes('namafile') || sampleKeys.includes('judulfile')));
      if (!hasCol && col !== 'fileUrl' && col !== 'fileName') {
        missingColumns.push(col);
      }
    }
  }

  rows.forEach((r, idx) => {
    const validation = validateMasterSilabusRow(r, idx);
    validatedData.push(validation.row);
    if (validation.isValid) {
      validRowsCount++;
    } else {
      invalidRowsCount++;
      errors.push(...validation.errors);
    }
  });

  return {
    isValid: invalidRowsCount === 0,
    totalRows: rows.length,
    validRowsCount,
    invalidRowsCount,
    missingColumns,
    errors,
    validatedData
  };
}
