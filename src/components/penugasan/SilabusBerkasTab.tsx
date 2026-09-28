import React, { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  FileText, Upload, CheckCircle2, CheckCircle, AlertCircle, Search, Filter, 
  ExternalLink, Trash2, RefreshCw, Folder, FolderOpen, BookOpen, Layers, Check, Loader2,
  FileCheck, ShieldAlert, Link, Link2, Sparkles, Copy, FileSpreadsheet,
  HelpCircle, Info, ChevronDown, ChevronUp, Download, Eye, ArrowRight, Settings
} from 'lucide-react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { uploadFileToGAS, fetchFromGAS, renameGoogleDriveFile, getGoogleDriveFileInfo } from '../../lib/api';
import { DEFAULT_APP_CONFIG } from '../../data/config';
import { MASTER_SILABUS_DATA } from '../../data/masterSilabusData';
import { 
  GOOGLE_DRIVE_MODUL_FOLDER_ID,
  GOOGLE_DRIVE_MODUL_FOLDER_URL
} from '../../data/soalGenerator';
import { pullAllSheetsFromGas, pushAllSheetsToGas } from '../../utils/gasSync';
import { GAS_TEMPLATE } from '../../lib/constants';
import { extractGoogleDriveFileId } from '../../lib/utils';

export function deriveFileNameFromUrlAndItem(
  _url: string,
  item: any,
  _availableDriveFiles: any[] = [],
  mode: 'SINGLE_UNIT' | 'BULK_MODUL' | 'AUTO' = 'SINGLE_UNIT'
): { fileName: string; source: 'CATALOG_MATCH' | 'URL_FILENAME' | 'SILABUS_STANDARD' } {
  // 1. kodeMapel
  let rawKode = String(item?.kodeMapel || item?.KodeMapel || '').trim();
  if (!rawKode) {
    const matchPrefix = String(item?.kodePaket || item?.namaModulLengkap || '').match(/^([A-Za-z]\d+)\s*-\s*([A-Za-z0-9]+)/);
    if (matchPrefix && matchPrefix[1] && matchPrefix[2]) {
      rawKode = `${matchPrefix[1]}-${matchPrefix[2]}`;
    } else {
      const paketCode = item?.paket || (String(item?.Jenjang || '').includes('Paket B') ? 'B' : String(item?.Jenjang || '').includes('Paket C') ? 'C' : 'A');
      const kelasNum = String(item?.kelas || item?.tingkat || '').replace(/\D/g, '');
      const singk = String(item?.singkatan || item?.sing || '').trim();
      if (paketCode && kelasNum && singk) {
        rawKode = `${paketCode}${kelasNum}-${singk}`;
      } else {
        const fullMapel = String(item?.mataPelajaran || item?.mapel || item?.NamaMapel || 'MAPEL').trim();
        const parenMatch = fullMapel.match(/\(([^)]+)\)/);
        rawKode = (parenMatch && parenMatch[1]) ? parenMatch[1].trim() : (singk || fullMapel);
      }
    }
  }
  const cleanKode = rawKode
    .replace(/\s*-\s*/g, '-')
    .replace(/[\/\\?%*:|"<>]/g, '')
    .trim() || 'MAPEL';

  // 2. noModul
  let rawNo = '';
  if (item?.noModulAngka !== undefined && item?.noModulAngka !== null && String(item.noModulAngka).trim() !== '') {
    rawNo = String(item.noModulAngka).trim();
  } else if (item?.modul !== undefined && item?.modul !== null && String(item.modul).trim() !== '') {
    rawNo = String(item.modul).trim();
  } else if (item?.noModul !== undefined && item?.noModul !== null && String(item.noModul).trim() !== '') {
    const matchModul = String(item?.namaModulLengkap || item?.kodePaket || '').match(/MODUL\s*(\d+)/i);
    if (matchModul && matchModul[1] && Number(item.noModul) > 50) {
      rawNo = matchModul[1];
    } else {
      rawNo = String(item.noModul).trim();
    }
  } else {
    const matchModul = String(item?.namaModulLengkap || item?.kodePaket || '').match(/MODUL\s*(\d+)/i);
    rawNo = matchModul ? matchModul[1] : String(item?.no || '1').trim();
  }
  const cleanNo = String(rawNo).replace(/[^\d]/g, '') || '1';

  // KONDISI 2: BULK_MODUL (1 PDF untuk banyak judul silabus / modul bab penuh)
  // Format: kodeMapel-noModul-temaModul.pdf
  // Contoh: C11-BING-6-Thank, It's Helpful.pdf
  if (mode === 'BULK_MODUL') {
    let rawTema = String(item?.temaModul || item?.namaModulBab || item?.topikSubTugas || 'Modul').trim();
    let cleanTema = rawTema.replace(/[\/\\?%*:|"<>]/g, '').trim() || 'Modul';
    if (cleanTema.toLowerCase().endsWith('.pdf')) {
      cleanTema = cleanTema.slice(0, -4).trim();
    }
    const standardName = `${cleanKode}-${cleanNo}-${cleanTema}.pdf`;
    return { fileName: standardName, source: 'SILABUS_STANDARD' };
  }

  // KONDISI 1: SINGLE_UNIT (1 PDF untuk 1 sub-topik / unit materi saja)
  // Format: kodeSubTugas-topikSubTugas atau kodeMapel-noModul-noSubModul-topikSubTugas.pdf
  // Contoh: A6-BINDO-11-1-Mewaspadai Bencana Alam Di Sekitar Kita.pdf
  let rawSub = '';
  if (item?.noSubModul !== undefined && item?.noSubModul !== null && String(item.noSubModul).trim() !== '') {
    rawSub = String(item.noSubModul).trim();
  } else if (item?.subKe) {
    const m = String(item.subKe).match(/\d+/);
    rawSub = m ? m[0] : '1';
  } else {
    const matchSub = String(item?.kodeSubTugas || '').match(/MODUL\s*\d+\s*-\s*(\d+)/i);
    rawSub = matchSub ? matchSub[1] : '1';
  }
  const cleanSub = String(rawSub).replace(/[^\d]/g, '') || '1';

  let rawTopik = String(item?.topikSubTugas || item?.judulSubModul || item?.materiPokok || item?.temaModul || 'Materi').trim();
  let cleanTopik = rawTopik.replace(/[\/\\?%*:|"<>]/g, '').trim() || 'Materi';
  if (cleanTopik.toLowerCase().endsWith('.pdf')) {
    cleanTopik = cleanTopik.slice(0, -4).trim();
  }

  const standardName = `${cleanKode}-${cleanNo}-${cleanSub}-${cleanTopik}.pdf`;
  return { fileName: standardName, source: 'SILABUS_STANDARD' };
}

interface ScannedDriveFile {
  id: string;
  name: string;
  path?: string;
  folderName?: string;
  mimeType?: string;
  size?: number;
  url: string;
  directUrl?: string;
  updated?: any;
}

export const sanitizeScannedDriveFiles = (files: any[]): ScannedDriveFile[] => {
  if (!Array.isArray(files)) return [];
  const seenIds = new Set<string>();
  return files.map((f, idx) => {
    let id = String(f?.id || `DRV-FILE-${idx}`);
    if (seenIds.has(id)) {
      id = `${id}-${idx + 1}`;
    }
    seenIds.add(id);
    return {
      ...f,
      id
    };
  });
};

export function generateCurriculumDriveCatalog(items: any[]): ScannedDriveFile[] {
  const modMap = new Map<string, ScannedDriveFile>();
  const source = Array.isArray(items) && items.length > 0 ? items : MASTER_SILABUS_DATA;
  const usedIds = new Set<string>();

  source.forEach((item: any, idx: number) => {
    const rawPaket = item.paket || (item.Jenjang?.includes('Paket B') ? 'B' : item.Jenjang?.includes('Paket C') ? 'C' : 'A');
    const cleanPaket = String(rawPaket).replace(/[^a-zA-Z0-9]/g, '');
    const kelas = String(item.kelas || item.Kelas || '4').replace(/[A-Za-z]/g, '').trim();
    const mapel = item.mataPelajaran || item.NamaMapel || item.mapel || 'Mata Pelajaran';
    const singkatan = item.singkatan || item.sing || mapel;
    const cleanMapel = String(singkatan || mapel).replace(/[^a-zA-Z0-9]/g, '');
    const noModul = String(item.noModul || item.no || '1').trim();
    const tema = item.temaModul || item.namaModulBab || item.judulSubModul || 'Materi Belajar';
    const key = `${cleanPaket}_Kls${kelas}_${mapel}_Modul${noModul}`;

    if (!modMap.has(key)) {
      const fileName = `[Modul ${noModul}] ${mapel} Kelas ${kelas} - ${tema}.pdf`;
      const pathStr = `11_MATERI_DAN_MODUL_DIGITAL / Kelas ${kelas} / ${singkatan} / ${fileName}`;
      let uniqueId = `DRV-MOD-${cleanPaket}-${kelas}-${cleanMapel}-${noModul}`;
      if (usedIds.has(uniqueId)) {
        uniqueId = `${uniqueId}-${idx + 1}`;
      }
      usedIds.add(uniqueId);

      modMap.set(key, {
        id: uniqueId,
        name: fileName,
        path: pathStr,
        folderName: '11_MATERI_DAN_MODUL_DIGITAL',
        mimeType: 'application/pdf',
        size: 2 * 1024 * 1024,
        url: GOOGLE_DRIVE_MODUL_FOLDER_URL,
        directUrl: GOOGLE_DRIVE_MODUL_FOLDER_URL,
        updated: new Date().toLocaleDateString('id-ID')
      });
    }
  });

  return Array.from(modMap.values());
}

export function formatGoogleDriveUrl(rawUrl: string): { viewUrl: string; directUrl: string; fileId: string } {
  let fileId = '';
  const trimmed = rawUrl.trim();
  
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const match3 = trimmed.match(/d\/([a-zA-Z0-9_-]+)/);
  
  if (match1 && match1[1]) {
    fileId = match1[1];
  } else if (match2 && match2[1]) {
    fileId = match2[1];
  } else if (match3 && match3[1]) {
    fileId = match3[1];
  } else if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    fileId = trimmed;
  }

  if (fileId) {
    return {
      fileId,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      directUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
    };
  }

  return {
    fileId: '',
    viewUrl: trimmed,
    directUrl: trimmed
  };
}

// Cek apakah item silabus sudah memiliki tautan berkas PDF
export const checkSilabusHasPdf = (item: any): boolean => {
  if (!item) return false;
  const url = String(item.fileUrl || item.FileUrl || item.pdfUrl || item.linkMateri || item.driveFileId || item.url || '').trim();
  return Boolean(url && url !== '-' && url !== 'null' && url !== 'undefined');
};

// Deteksi nomor kelas dalam teks nama file / folder path dengan jangkauan cerdas dan presisi tinggi
export const detectClassesInText = (text: string): string[] => {
  const t = text.toLowerCase();
  const detected: string[] = [];

  // Pola Standar dengan awalan eksplisit: "Kelas 4", "Kls 4", "Kls.4", "Kelas IV", "Grade 4", "Tingkat 4"
  // Ditambah awalan paket: "A4", "A-4", "B7", "B-7", "C10", "C-10"
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*4\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*iv\b/i.test(t) || /\ba\s*[-_]?\s*4\b/i.test(t)) detected.push('4');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*5\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*v\b/i.test(t) || /\ba\s*[-_]?\s*5\b/i.test(t)) detected.push('5');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*6\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*vi\b/i.test(t) || /\ba\s*[-_]?\s*6\b/i.test(t)) detected.push('6');

  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*7\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*vii\b/i.test(t) || /\bb\s*[-_]?\s*7\b/i.test(t)) detected.push('7');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*8\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*viii\b/i.test(t) || /\bb\s*[-_]?\s*8\b/i.test(t)) detected.push('8');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*9\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*ix\b/i.test(t) || /\bb\s*[-_]?\s*9\b/i.test(t)) detected.push('9');

  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*10\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*x\b/i.test(t) || /\bc\s*[-_]?\s*10\b/i.test(t)) detected.push('10');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*11\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*xi\b/i.test(t) || /\bc\s*[-_]?\s*11\b/i.test(t)) detected.push('11');
  if (/\b(?:kelas|kls|grade|tingkat)\s*[-_.]?\s*12\b/i.test(t) || /\b(?:kelas|kls)\s*[-_.]?\s*xii\b/i.test(t) || /\bc\s*[-_]?\s*12\b/i.test(t)) detected.push('12');

  // Jika hanya ada "Paket A" tanpa nomor kelas spesifik: mencakup kelas 4, 5, 6
  if (/\bpaket\s*[-_]?\s*a\b/i.test(t) && detected.length === 0) {
    detected.push('4', '5', '6');
  }
  // Jika hanya ada "Paket B" tanpa nomor kelas spesifik: mencakup kelas 7, 8, 9
  if (/\bpaket\s*[-_]?\s*b\b/i.test(t) && detected.length === 0) {
    detected.push('7', '8', '9');
  }
  // Jika hanya ada "Paket C" tanpa nomor kelas spesifik: mencakup kelas 10, 11, 12
  if (/\bpaket\s*[-_]?\s*c\b/i.test(t) && detected.length === 0) {
    detected.push('10', '11', '12');
  }

  return Array.from(new Set(detected));
};

// Deteksi kecocokan mata pelajaran secara akurat dan komprehensif (mendukung sinonim, akronim & tematik dengan batas kata)
export const matchSubjectStrict = (fileNameText: string, targetMapel: string, singkatan?: string): boolean => {
  const fn = ` ${fileNameText.toLowerCase()} `;
  const tm = (targetMapel || '').toLowerCase();
  const sing = (singkatan || '').toLowerCase();

  // Jika ada singkatan resmi (PAI, MTK, IPA, IPS, PPKN, PJOK, dll.) dan ada dalam teks berkas
  if (sing && sing.length >= 2) {
    const singRegex = new RegExp(`\\b${sing}\\b`, 'i');
    if (singRegex.test(fn)) return true;
  }

  // 1. Matematika (Harus dipisahkan dari informatika/tik)
  if (tm.includes('matematika') || tm === 'mtk') {
    return fn.includes('matematika') || /\bmtk\b/i.test(fn) || /\bmath\b/i.test(fn) || fn.includes('aljabar') || fn.includes('geometri');
  }

  // 2. Bahasa Indonesia (Jangan tertukar dengan Bahasa Inggris)
  if (tm.includes('indonesia') || tm === 'bindo') {
    return (fn.includes('indonesia') || /\bbindo\b/i.test(fn) || /\bb\.?\s*indo\b/i.test(fn)) && !fn.includes('inggris');
  }

  // 3. Bahasa Inggris
  if (tm.includes('inggris') || tm === 'bing') {
    return fn.includes('inggris') || /\bbing\b/i.test(fn) || /\bb\.?\s*ing\b/i.test(fn) || /\benglish\b/i.test(fn);
  }

  // 4. IPA (Gunakan \b agar tidak cocok ke kata umum seperti "partisipasi")
  if (tm.includes('alam') || tm === 'ipa') {
    return (/\bipa\b/i.test(fn) || fn.includes('sains') || fn.includes('pengetahuan alam') || fn.includes('biologi') || fn.includes('fisika') || fn.includes('kimia')) 
      && !/\bips\b/i.test(fn) && !fn.includes('pengetahuan sosial');
  }

  // 5. IPS (Gunakan \b agar tidak cocok ke kata umum seperti "tips", "skripsi")
  if (tm.includes('sosial') || tm === 'ips') {
    return (/\bips\b/i.test(fn) || fn.includes('pengetahuan sosial') || fn.includes('geografi') || fn.includes('sejarah') || fn.includes('ekonomi') || fn.includes('sosiologi')) 
      && !/\bipa\b/i.test(fn) && !fn.includes('pengetahuan alam');
  }

  // 6. PAI / Agama Islam (Gunakan \b agar tidak cocok ke "sampai", "pakaian")
  if (tm.includes('agama') || tm.includes('pai') || tm.includes('pabp')) {
    return /\bpai\b/i.test(fn) || /\bpabp\b/i.test(fn) || fn.includes('agama islam') || fn.includes('pendidikan agama') || fn.includes('fiqih') || fn.includes('akidah') || fn.includes('al-quran') || fn.includes('quran hadis');
  }

  // 7. PPKn / PKn / Pancasila
  if (tm.includes('pancasila') || tm.includes('ppkn') || tm.includes('pkn')) {
    return /\bppkn\b/i.test(fn) || /\bpkn\b/i.test(fn) || fn.includes('pancasila') || fn.includes('kewarganegaraan') || /\bcivic\b/i.test(fn);
  }

  // 8. PJOK / Penjas / Olahraga
  if (tm.includes('olahraga') || tm.includes('pjok') || tm.includes('penjas')) {
    return /\bpjok\b/i.test(fn) || /\bpenjas\b/i.test(fn) || /\bpenjaskes\b/i.test(fn) || fn.includes('olahraga') || fn.includes('jasmani');
  }

  // 9. Seni Budaya / SBdP (Gunakan \b agar tidak cocok ke kata "senin")
  if (tm.includes('seni') || tm.includes('sbdp')) {
    return /\bsbdp\b/i.test(fn) || fn.includes('seni budaya') || fn.includes('seni rupa') || fn.includes('seni musik') || fn.includes('seni tari') || /\bseni\b/i.test(fn);
  }

  // 10. Prakarya / PKWU
  if (tm.includes('prakarya') || tm.includes('pkwu')) {
    return fn.includes('prakarya') || /\bpkwu\b/i.test(fn) || fn.includes('kerajinan') || fn.includes('rekayasa');
  }

  // 11. Informatika / TIK (KRITIS: Wajib pakai \btik\b agar 'matematika' tidak cocok ke TIK!)
  if (tm.includes('informatika') || tm === 'tik') {
    return fn.includes('informatika') || /\btik\b/i.test(fn) || fn.includes('komputer') || fn.includes('coding');
  }

  // 12. Tematik
  if (tm.includes('tematik') || tm.startsWith('tema ')) {
    return fn.includes('tematik') || fn.includes('buku tema');
  }

  return fn.includes(tm);
};

// Ekstrak nomor modul / bab dari teks nama file
export const extractModulNo = (text: string): number | null => {
  const t = text.toLowerCase();
  const m1 = t.match(/\b(?:modul|bab|unit|tema|m|kb|kd)\s*[-_.:#]?\s*0*([1-9][0-9]?)\b/i);
  if (m1) return parseInt(m1[1], 10);

  const m2 = t.match(/\[\s*modul\s*0*([1-9][0-9]?)\s*\]/i);
  if (m2) return parseInt(m2[1], 10);

  const m3 = t.match(/\b0*([1-9][0-9]?)\s*[-_]\s*(?:modul|bab|unit|tema)\b/i);
  if (m3) return parseInt(m3[1], 10);

  return null;
};

// Antarmuka Hasil Pencocokan Cerdas Terarah
export interface SmartMatchCandidate {
  file: ScannedDriveFile;
  targetItem: any | null;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  selected: boolean;
}

// Algoritma Evaluasi & Skor Kecocokan Cerdas (Multi-Criteria Fuzzy Scoring dengan Validasi Presisi)
export function evaluateSmartMatches(
  files: ScannedDriveFile[],
  silabusList: any[],
  scopeKelas: string = 'ALL',
  scopeMapel: string = 'ALL',
  scopeSemester: string = 'ALL'
): SmartMatchCandidate[] {
  const results: SmartMatchCandidate[] = [];
  const assignedTargetIds = new Map<string, string>(); // Untuk mendeteksi duplikasi target

  files.forEach(file => {
    const fullPathStr = `${file.path || ''} ${file.folderName || ''} ${file.name || ''}`.toLowerCase();
    const detectedClasses = detectClassesInText(fullPathStr);
    const fileModulNo = extractModulNo(fullPathStr);

    let bestScore = 0;
    let bestItem: any = null;
    let bestReasons: string[] = [];

    silabusList.forEach(item => {
      const alreadyHasPdf = !!(item.fileUrl || item.FileUrl || item.pdfUrl);
      const itemKelas = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
      const itemSemester = String(item.semester || item.Semester || '').trim();
      const itemMapel = (item.mataPelajaran || item.NamaMapel || item.mapel || '').trim();
      const itemSingkatan = (item.singkatan || item.sing || '').trim();
      // Perbaikan Kritis: Ambil nomor modul dari modul / noModul, BUKAN item.no (yang merupakan urutan baris 1-1004)
      const itemModulNo = Number(String(item.modul || item.noModul || item.Modul || item.modulNo || '').replace(/\D/g, '') || 0);
      const itemKodeSub = (item.kodeSubTugas || item.kodePaket || '').toLowerCase();
      const itemTema = (item.temaModul || item.topikSubTugas || item.materiPokok || item.judulSubModul || '').toLowerCase();

      // Filter Lingkup Target yang dipilih pengguna
      if (scopeKelas !== 'ALL' && itemKelas !== scopeKelas) return;
      if (scopeMapel !== 'ALL' && itemMapel.toLowerCase() !== scopeMapel.toLowerCase()) return;
      if (scopeSemester !== 'ALL' && itemSemester.toLowerCase() !== scopeSemester.toLowerCase()) return;

      // 1. Evaluasi Mata Pelajaran (Syarat Mutlak)
      const isMapelMatch = matchSubjectStrict(fullPathStr, itemMapel, itemSingkatan);
      if (!isMapelMatch) return;

      // 2. Evaluasi Kelas (Syarat Mutlak jika file mencantumkan kelas eksplisit)
      if (detectedClasses.length > 0) {
        if (!detectedClasses.includes(itemKelas)) {
          // File secara eksplisit punya kelas lain -> tolak!
          return;
        }
      }

      let score = 0;
      const reasons: string[] = [];
      let modulExactMatch = false;

      // Poin Mapel Cocok (+35)
      score += 35;
      reasons.push(`Mapel ${itemMapel} Cocok (+35)`);

      // Poin Kelas Cocok (+30)
      if (detectedClasses.length > 0 && detectedClasses.includes(itemKelas)) {
        score += 30;
        reasons.push(`Kelas ${itemKelas} Cocok Persis (+30)`);
      } else if (scopeKelas !== 'ALL' && itemKelas === scopeKelas) {
        score += 20;
        reasons.push(`Filter Kelas ${scopeKelas} (+20)`);
      }

      // Evaluasi Semester (Bonus / Penalti jika berkas dan target beda semester)
      const isFileSem1 = /\b(?:sem(?:ester)?\s*[-_.:#]?\s*0*1|ganjil|smt\s*[-_.:#]?\s*0*1)\b/i.test(fullPathStr);
      const isFileSem2 = /\b(?:sem(?:ester)?\s*[-_.:#]?\s*0*2|genap|smt\s*[-_.:#]?\s*0*2)\b/i.test(fullPathStr);
      const isItemSem1 = /\b(?:1|ganjil)\b/i.test(itemSemester);
      const isItemSem2 = /\b(?:2|genap)\b/i.test(itemSemester);

      if (isFileSem1 && isItemSem2) {
        score -= 40;
        reasons.push(`Beda Semester: Berkas Sem 1 ≠ Target Sem 2 (-40)`);
      } else if (isFileSem2 && isItemSem1) {
        score -= 40;
        reasons.push(`Beda Semester: Berkas Sem 2 ≠ Target Sem 1 (-40)`);
      } else if ((isFileSem1 && isItemSem1) || (isFileSem2 && isItemSem2)) {
        score += 15;
        reasons.push(`Semester Cocok (+15)`);
      }

      // 3. Evaluasi Nomor Modul (KRITIS - Penentu Utama Sangat Cocok)
      if (fileModulNo !== null && itemModulNo > 0) {
        if (fileModulNo === itemModulNo) {
          modulExactMatch = true;
          score += 30;
          reasons.push(`Nomor Modul ${fileModulNo} Sesuai Persis (+30)`);
        } else {
          // Beda nomor modul (misal: Berkas Modul 2 tapi target Modul 1) -> HUKUM BERAT!
          // Tidak boleh pernah mencapai 80-100% Sangat Cocok
          score -= 60;
          reasons.push(`Beda No Modul: Berkas Modul ${fileModulNo} ≠ Target Modul ${itemModulNo} (-60)`);
        }
      } else if (fileModulNo === null) {
        // Berkas rujukan umum (misalnya Buku Paket Semester tanpa nomor modul khusus)
        reasons.push(`Berkas Rujukan Tanpa No Modul Eksplisit`);
      }

      // 4. Evaluasi Kode Unik / Sub Tugas
      if (itemKodeSub) {
        const cleanKode = itemKodeSub.replace(/[^a-z0-9]/g, '');
        const cleanFile = fullPathStr.replace(/[^a-z0-9]/g, '');
        if (cleanKode.length > 5 && cleanFile.includes(cleanKode)) {
          score += 15;
          reasons.push(`Kode Sub Tugas Cocok (+15)`);
        }
      }

      // 5. Evaluasi Kata Kunci Tema / Judul
      let themeMatchCount = 0;
      if (itemTema && itemTema.length > 3) {
        const stopWords = new Set(['dan', 'atau', 'pada', 'untuk', 'yang', 'dalam', 'dengan', 'teks', 'unit', 'bab', 'modul', 'pembelajaran']);
        const keywords = itemTema
          .split(/[\s,.-]+/)
          .map((w: string) => w.toLowerCase().trim())
          .filter((w: string) => w.length >= 4 && !stopWords.has(w));
        
        const matchedWords = keywords.filter((w: string) => fullPathStr.includes(w));
        themeMatchCount = matchedWords.length;
        if (themeMatchCount > 0) {
          const bonus = Math.min(themeMatchCount * 8, 20);
          score += bonus;
          reasons.push(`Tema Cocok (${matchedWords.slice(0, 2).join(', ')}) (+${bonus})`);
        }
      }

      // Pengurangan skor jika modul target sudah terisi berkas PDF
      if (alreadyHasPdf) {
        score -= 10;
        reasons.push(`Sudah Ada Berkas (-10)`);
      }

      // Pembatas Skor: Jangan izinkan predikat Sangat Cocok (>= 80%) jika:
      // - Berkas tanpa no modul DAN tanpa kata kunci tema yang cocok kuat
      if (!modulExactMatch && themeMatchCount < 2 && score >= 80) {
        score = 74; // Kategori Cukup Cocok (Kuning), aman dari salah cocok otomatis
        reasons.push(`Skor dibatasi maks 74 (Nomor modul belum terkonfirmasi persis)`);
      }

      // Pembatas Skor: Jika berkas TIDAK memiliki nomor modul, skor MAKSIMAL adalah 65% (Cukup Cocok)
      // Ini mencegah buku umum tiba-tiba diberi predikat 🟢 Sangat Cocok untuk Modul 1, 2, atau 3.
      if (fileModulNo === null && score > 65) {
        score = 65;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
        bestReasons = reasons;
      }
    });

    const finalScore = Math.min(Math.max(bestScore, 0), 100);

    // Kriteria Ketat:
    // HIGH (🟢 Sangat Cocok): Skor >= 85 (Hanya untuk Mapel, Kelas, dan Modul yang benar-benar cocok persis)
    // MEDIUM (🟡 Cukup Cocok): Skor 55-84 (Misalnya buku paket rujukan umum)
    // LOW (⚪ Rendah): Skor < 55 (Beda modul atau tidak ada kepastian)
    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 
      finalScore >= 85 ? 'HIGH' : finalScore >= 55 ? 'MEDIUM' : 'LOW';

    const targetKey = bestItem ? String(bestItem.id || bestItem.no) : '';
    let isDuplicateTarget = false;

    if (targetKey && confidence === 'HIGH') {
      if (assignedTargetIds.has(targetKey)) {
        isDuplicateTarget = true;
        bestReasons.push(`⚠️ Perhatian: Modul ini juga ditargetkan oleh berkas lain!`);
      } else {
        assignedTargetIds.set(targetKey, file.name);
      }
    }

    results.push({
      file,
      targetItem: bestItem,
      score: finalScore,
      confidence,
      reasons: bestReasons,
      // HANYA pilih otomatis jika 🟢 Sangat Cocok (>=85%), belum ada berkas PDF, dan tidak bentrok target!
      selected: confidence === 'HIGH' && !!bestItem && !bestItem.fileUrl && !bestItem.FileUrl && !isDuplicateTarget
    });
  });

  return results.sort((a, b) => b.score - a.score);
}

// Konversi berkas lokal ke Data URL (Base64)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Helper aman untuk penyimpanan cache sekunder tanpa membebani kuota localStorage
const safeCacheSet = (key: string, value: any) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Abaikan jika kuota penyimpanan browser penuh
  }
};

// Penyimpanan Tautan Berkas Silabus Permanen di LocalStorage dengan Proteksi Kuota
const getPersistedSilabusLinks = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem('sista_silabus_file_links');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Bersihkan otomatis entri usang / data URL base64 yang dapat membuat kuota browser penuh
    let hasBloat = false;
    Object.keys(parsed).forEach(k => {
      const u = parsed[k]?.fileUrl || parsed[k]?.u || '';
      if (u.startsWith('data:') || (typeof u === 'string' && u.length > 2000)) {
        delete parsed[k];
        hasBloat = true;
      }
    });
    if (hasBloat) {
      try {
        localStorage.setItem('sista_silabus_file_links', JSON.stringify(parsed));
      } catch {}
    }
    return parsed;
  } catch {
    return {};
  }
};

const savePersistedSilabusLinks = (list: any[]) => {
  try {
    const map: Record<string, any> = {};
    list.forEach(item => {
      const url = item.fileUrl || item.FileUrl || item.pdfUrl || item.PdfUrl || item.linkMateri;
      const kId = String(item.id || '').trim();
      const kNo = String(item.no || '').trim();
      const kKode = String(item.kodeSubTugas || item.Kode || '').trim();
      
      // Cegah menyimpan data: base64 besar ke localStorage untuk menghindari QuotaExceededError
      if (url && typeof url === 'string' && url.trim() !== '' && !url.startsWith('data:') && url.length <= 2000) {
        const payload = {
          fileUrl: url.trim(),
          fileName: item.fileName || item.FileName || '',
          directUrl: item.directUrl || item.DirectUrl || '',
          driveId: item.driveId || item.DriveId || ''
        };
        if (kId) map[kId] = payload;
        if (kNo) {
          map[kNo] = payload;
          map[`NO_${kNo}`] = payload;
        }
        if (kKode) map[kKode] = payload;
      }
    });

    try {
      localStorage.setItem('sista_silabus_file_links', JSON.stringify(map));
    } catch (quotaErr: any) {
      // Jika kuota localStorage penuh, bersihkan cache katalog Drive sekunder lalu coba kembali
      try {
        localStorage.removeItem('sista_cached_drive_modul_files');
        localStorage.removeItem('sista_cached_drive_modul_time');
        localStorage.setItem('sista_silabus_file_links', JSON.stringify(map));
      } catch {
        // Abaikan dengan aman tanpa spam console
      }
    }
  } catch {}
};

const removePersistedSilabusLink = (item: any) => {
  try {
    const existing = getPersistedSilabusLinks();
    const kId = String(item.id || '').trim();
    const kNo = String(item.no || '').trim();
    const kKode = String(item.kodeSubTugas || item.Kode || '').trim();
    const currentUrl = item.fileUrl || item.FileUrl || item.pdfUrl || item.PdfUrl || item.linkMateri || '';

    Object.keys(existing).forEach(key => {
      if (
        (kId && key === kId) ||
        (kNo && (key === kNo || key === `NO_${kNo}`)) ||
        (kKode && key === kKode) ||
        (currentUrl && (existing[key]?.fileUrl === currentUrl || existing[key]?.u === currentUrl))
      ) {
        delete existing[key];
      }
    });
    try {
      localStorage.setItem('sista_silabus_file_links', JSON.stringify(existing));
    } catch {}
  } catch {}
};

const mergeSilabusWithPersistedLinks = (baseList: any[]): any[] => {
  const fileLinks = getPersistedSilabusLinks();
  return baseList.map(item => {
    const kId = String(item.id || '').trim();
    const kNo = String(item.no || '').trim();
    const kKode = String(item.kodeSubTugas || item.Kode || '').trim();
    const saved = (kId && fileLinks[kId]) || (kNo && (fileLinks[kNo] || fileLinks[`NO_${kNo}`])) || (kKode && fileLinks[kKode]);
    const savedUrl = saved ? (saved.fileUrl || saved.u || saved.url) : '';
    if (saved && savedUrl && !item.fileUrl && !item.FileUrl && !item.pdfUrl) {
      return {
        ...item,
        fileUrl: savedUrl,
        FileUrl: savedUrl,
        pdfUrl: savedUrl,
        fileName: item.fileName || saved.fileName || saved.n,
        directUrl: item.directUrl || saved.directUrl || saved.r,
        driveId: item.driveId || saved.driveId || saved.d,
        uploadedAt: item.uploadedAt || saved.uploadedAt
      };
    }
    return item;
  });
};

export default function SilabusBerkasTab() {
  const { settings } = useStore();
  const [silabusList, setSilabusList] = useState<any[]>(() => {
    const fromDb = db.get('master_silabus');
    const base = (Array.isArray(fromDb) && fromDb.length > 0) ? fromDb : MASTER_SILABUS_DATA;
    return mergeSilabusWithPersistedLinks(base);
  });

  // Sinkronisasi otomatis dengan event database agar tautan berkas tidak tertimpa/hilang
  useEffect(() => {
    const handleDbUpdate = (e?: any) => {
      const detailKey = e?.detail?.key;
      if (!detailKey || detailKey === 'master_silabus') {
        const fromDb = db.get('master_silabus');
        if (Array.isArray(fromDb) && fromDb.length > 0) {
          setSilabusList(mergeSilabusWithPersistedLinks(fromDb));
        }
      }
    };
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('ALL');
  const [selectedKelas, setSelectedKelas] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedMapel, setSelectedMapel] = useState('ALL');
  const [pdfStatusFilter, setPdfStatusFilter] = useState<'ALL' | 'HAS_PDF' | 'NO_PDF'>('ALL');

  const [uploadingId, setUploadingId] = useState<string | number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadItem, setActiveUploadItem] = useState<any | null>(null);

  // Modal Unggah Berkas PDF Mandiri (Komputer / HP)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalTargetItem, setUploadModalTargetItem] = useState<any | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadTargetSearch, setUploadTargetSearch] = useState('');
  const [autoMatchUploadInfo, setAutoMatchUploadInfo] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Link Manual & File Picker Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalItem, setLinkModalItem] = useState<any | null>(null);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkInputFileName, setLinkInputFileName] = useState('');
  const [fileNameAutoSource, setFileNameAutoSource] = useState<'CATALOG_MATCH' | 'URL_FILENAME' | 'SILABUS_STANDARD' | null>(null);
  const [filePickerSearch, setFilePickerSearch] = useState('');
  const [filePickerFilter, setFilePickerFilter] = useState<'RECOMMENDED' | 'KELAS' | 'ALL'>('RECOMMENDED');
  const [linkModalTab, setLinkModalTab] = useState<'PICKER' | 'MANUAL'>('PICKER');
  const [selectedPickerDocId, setSelectedPickerDocId] = useState<string | null>(null);

  // Rename Google Drive States & Live Info
  const [isRenamingOnDrive, setIsRenamingOnDrive] = useState(false);
  const [renamePhysicalFileOnDrive, setRenamePhysicalFileOnDrive] = useState(true);
  const [isCheckingDriveLive, setIsCheckingDriveLive] = useState(false);
  const [driveLiveDetails, setDriveLiveDetails] = useState<{ id: string; name: string; size?: number } | null>(null);

  // Scan Drive Modal & Targeted Matching Scope
  const [showDriveScanModal, setShowDriveScanModal] = useState(false);
  const [isScanningDrive, setIsScanningDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<ScannedDriveFile[]>([]);
  const [scanFolderInfo, setScanFolderInfo] = useState<{ folderName?: string; folderUrl?: string; folderId?: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [gasNeedsUpdate, setGasNeedsUpdate] = useState(false);
  const [driveFileSearch, setDriveFileSearch] = useState('');
  const [showManualAddFile, setShowManualAddFile] = useState(false);
  const [manualFileName, setManualFileName] = useState('');
  const [manualFileUrl, setManualFileUrl] = useState('');
  const [isAutoMatching, setIsAutoMatching] = useState(false);

  // Pilihan Lingkup Pencocokan (Per Kelas & Per Mapel)
  const [matchScopeKelas, setMatchScopeKelas] = useState<string>('ALL');
  const [matchScopeMapel, setMatchScopeMapel] = useState<string>('ALL');

  // Tab di dalam Modal Pindai Google Drive: 'MATCH_PREVIEW' | 'ALL_FILES' | 'CUSTOM_FOLDER'
  const [scanModalTab, setScanModalTab] = useState<'MATCH_PREVIEW' | 'ALL_FILES' | 'CUSTOM_FOLDER'>('MATCH_PREVIEW');
  const [customFolderInput, setCustomFolderInput] = useState('');
  const [matchScoreFilter, setMatchScoreFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'UNMATCHED'>('ALL');
  const [smartMatchSearch, setSmartMatchSearch] = useState('');
  const [smartCandidates, setSmartCandidates] = useState<SmartMatchCandidate[]>([]);

  // Modal Hubungkan File Drive Tertentu ke Silabus Pilihan
  const [assigningDriveFile, setAssigningDriveFile] = useState<ScannedDriveFile | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignMultiSelectedIds, setAssignMultiSelectedIds] = useState<string[]>([]);

  // Multi-selection untuk Tabel Silabus Utama (1 PDF untuk banyak modul terpilih)
  const [selectedTableItemIds, setSelectedTableItemIds] = useState<string[]>([]);
  const [showBulkLinkModal, setShowBulkLinkModal] = useState(false);
  const [bulkLinkUrl, setBulkLinkUrl] = useState('');
  const [bulkLinkFileName, setBulkLinkFileName] = useState('');
  const [bulkLinkSourceType, setBulkLinkSourceType] = useState<'URL' | 'DRIVE' | 'UPLOAD'>('URL');
  const [bulkSelectedDriveFile, setBulkSelectedDriveFile] = useState<ScannedDriveFile | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isProcessingBulkLink, setIsProcessingBulkLink] = useState(false);
  const [bulkRenamePhysicalDrive, setBulkRenamePhysicalDrive] = useState(true);

  // Helper untuk menghasilkan nama berkas standar (kodeMapel-noModul-temaModul) untuk Multi-Tautkan PDF
  const getStandardBulkFileName = (targetIdList?: string[]): string => {
    const ids = targetIdList || selectedTableItemIds;
    if (!ids || ids.length === 0) return 'Modul_Kurikulum.pdf';
    const targetItem = silabusList.find(s => 
      ids.includes(String(s.id)) || 
      ids.includes(String(s.no)) ||
      ids.includes(`${s.kodePaket || ''}_${s.no}`) ||
      ids.includes(String(s.kodeSubTugas || ''))
    ) || silabusList.find(s => ids.some(id => String(s.id || s.no) === id)) || silabusList[0];
    if (!targetItem) return 'Modul_Kurikulum.pdf';
    
    return deriveFileNameFromUrlAndItem('', targetItem, driveFiles, 'BULK_MODUL').fileName;
  };

  // Otomatis isi Nama Berkas standar (kodeMapel-noModul-temaModul) dan aktifkan rename Google Drive saat modal tautkan dibuka
  useEffect(() => {
    if (showBulkLinkModal && selectedTableItemIds.length > 0) {
      const stdName = getStandardBulkFileName();
      if (stdName) {
        setBulkLinkFileName(stdName);
      }
      setBulkRenamePhysicalDrive(true);
    }
  }, [showBulkLinkModal, selectedTableItemIds]);

  // Link Manual Modal: Opsi terapkan 1 PDF ke semua modul satu mapel & kelas
  const [linkApplyToAllInScope, setLinkApplyToAllInScope] = useState(false);

  // Upload Modal: Opsi terapkan 1 PDF ke semua modul satu mapel & kelas
  const [uploadApplyToAllInScope, setUploadApplyToAllInScope] = useState(false);

  // Inisialisasi otomatis berkas modul kurikulum sekolah dan pembersihan cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sista_cached_drive_modul_files');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeScannedDriveFiles(parsed);
          setDriveFiles(sanitized);
          safeCacheSet('sista_cached_drive_modul_files', sanitized);
          return;
        }
      }
      const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
      setDriveFiles(catalog);
      safeCacheSet('sista_cached_drive_modul_files', catalog);
    } catch {
      const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
      setDriveFiles(catalog);
    }
  }, []);

  // Sinkronisasi otomatis kandidat kecocokan cerdas setiap kali berkas Drive / Silabus / Scope berubah
  useEffect(() => {
    if (driveFiles.length > 0) {
      const candidates = evaluateSmartMatches(driveFiles, silabusList, matchScopeKelas, matchScopeMapel);
      setSmartCandidates(candidates);
    } else {
      setSmartCandidates([]);
    }
  }, [driveFiles, silabusList, matchScopeKelas, matchScopeMapel]);

  // Sync state
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Kumpulan Filter Unik
  const distinctJenjang = useMemo(() => {
    return Array.from(new Set(silabusList.map(s => s.jenjang || s.Jenjang || 'SD/MI'))).filter(Boolean).sort();
  }, [silabusList]);

  const distinctKelas = useMemo(() => {
    return Array.from(new Set(silabusList.map(s => String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim()))).filter(Boolean).sort((a, b) => Number(a) - Number(b));
  }, [silabusList]);

  const distinctSemester = useMemo(() => {
    return Array.from(new Set(silabusList.map(s => String(s.semester || s.Semester || '').trim()))).filter(Boolean).sort();
  }, [silabusList]);

  const distinctMapel = useMemo(() => {
    return Array.from(new Set(silabusList.map(s => s.mataPelajaran || s.NamaMapel || s.mapel || ''))).filter(Boolean).sort();
  }, [silabusList]);

  // Rekap Statistik
  const stats = useMemo(() => {
    const total = silabusList.length;
    const hasPdf = silabusList.filter(s => !!(s.fileUrl || s.FileUrl || s.pdfUrl || s.PdfUrl || s.linkMateri)).length;
    const noPdf = total - hasPdf;
    const percentage = total > 0 ? Math.round((hasPdf / total) * 100) : 0;
    return { total, hasPdf, noPdf, percentage };
  }, [silabusList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return silabusList.filter(item => {
      const j = item.jenjang || item.Jenjang || 'SD/MI';
      const k = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
      const sem = String(item.semester || item.Semester || '').trim();
      const m = item.mataPelajaran || item.NamaMapel || item.mapel || '';
      const tema = item.temaModul || item.judulModul || '';
      const topik = item.topikSubTugas || item.materiPokok || '';
      const hasPdf = !!(item.fileUrl || item.FileUrl || item.pdfUrl || item.PdfUrl || item.linkMateri);

      if (selectedJenjang !== 'ALL' && j !== selectedJenjang) return false;
      if (selectedKelas !== 'ALL' && k !== selectedKelas) return false;
      if (selectedSemester !== 'ALL' && sem.toLowerCase() !== selectedSemester.toLowerCase()) return false;
      if (selectedMapel !== 'ALL' && m !== selectedMapel) return false;

      if (pdfStatusFilter === 'HAS_PDF' && !hasPdf) return false;
      if (pdfStatusFilter === 'NO_PDF' && hasPdf) return false;

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        return (
          m.toLowerCase().includes(q) ||
          tema.toLowerCase().includes(q) ||
          topik.toLowerCase().includes(q) ||
          String(k).includes(q) ||
          sem.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [silabusList, selectedJenjang, selectedKelas, selectedSemester, selectedMapel, pdfStatusFilter, searchTerm]);

  // Filtered Drive Files (Berdasarkan Search, Kelas Target, dan Mapel Target)
  const filteredDriveFiles = useMemo(() => {
    let list = driveFiles;
    
    // Filter berdasarkan lingkup kelas terpilih jika matchScopeKelas !== 'ALL'
    if (matchScopeKelas !== 'ALL') {
      const k = matchScopeKelas;
      const roman = k === '7' ? 'vii' : k === '8' ? 'viii' : k === '9' ? 'ix' : k === '10' ? 'x' : k === '11' ? 'xi' : k === '12' ? 'xii' : k === '4' ? 'iv' : k === '5' ? 'v' : k === '6' ? 'vi' : '';
      const regex = new RegExp(`\\b(kelas|kls|k|)\\s*(${k}|${roman})\\b`, 'i');
      list = list.filter(f => {
        const full = `${f.path || ''} ${f.folderName || ''} ${f.name || ''}`.toLowerCase();
        return regex.test(full) || full.includes(`kelas ${k}`) || full.includes(`kls ${k}`) || full.includes(` ${k} `);
      });
    }

    // Filter berdasarkan lingkup mapel terpilih jika matchScopeMapel !== 'ALL'
    if (matchScopeMapel !== 'ALL') {
      const m = matchScopeMapel.toLowerCase();
      list = list.filter(f => {
        const full = `${f.path || ''} ${f.folderName || ''} ${f.name || ''}`.toLowerCase();
        if (m.includes('matematika')) return full.includes('matematika') || full.includes('mtk') || full.includes('math');
        if (m.includes('indonesia')) return (full.includes('indonesia') || full.includes('bindo') || full.includes('b.indo')) && !full.includes('inggris');
        if (m.includes('inggris')) return full.includes('inggris') || full.includes('bing') || full.includes('english');
        if (m.includes('alam') || m === 'ipa') return (full.includes('ipa') || full.includes('sains') || full.includes('alam')) && !full.includes('ips');
        if (m.includes('sosial') || m === 'ips') return (full.includes('ips') || full.includes('sosial')) && !full.includes('ipa');
        return full.includes(m);
      });
    }

    if (driveFileSearch.trim()) {
      const q = driveFileSearch.toLowerCase().trim();
      list = list.filter(f => 
        f.name.toLowerCase().includes(q) || 
        (f.path && f.path.toLowerCase().includes(q)) ||
        (f.folderName && f.folderName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [driveFiles, driveFileSearch, matchScopeKelas, matchScopeMapel]);

  // Kandidat Pencocokan Cerdas Terfilter (Tab Pratinjau Cerdas)
  const filteredSmartCandidates = useMemo(() => {
    return smartCandidates.filter(c => {
      if (matchScoreFilter === 'HIGH' && c.confidence !== 'HIGH') return false;
      if (matchScoreFilter === 'MEDIUM' && c.confidence !== 'MEDIUM') return false;
      if (matchScoreFilter === 'UNMATCHED' && (c.confidence === 'HIGH' || c.confidence === 'MEDIUM')) return false;

      if (smartMatchSearch.trim()) {
        const query = smartMatchSearch.toLowerCase().trim();
        const fn = (c.file.name || '').toLowerCase();
        const path = (c.file.path || '').toLowerCase();
        const folder = (c.file.folderName || '').toLowerCase();
        const targetMapel = c.targetItem ? (c.targetItem.mataPelajaran || c.targetItem.NamaMapel || '').toLowerCase() : '';
        const targetTema = c.targetItem ? (c.targetItem.temaModul || c.targetItem.topikSubTugas || c.targetItem.materiPokok || '').toLowerCase() : '';
        const targetKelas = c.targetItem ? String(c.targetItem.kelas || c.targetItem.Kelas || '').toLowerCase() : '';
        const targetModul = c.targetItem ? `modul ${c.targetItem.no || c.targetItem.noModul || ''}`.toLowerCase() : '';
        const targetNo = c.targetItem ? String(c.targetItem.no || c.targetItem.noModul || '') : '';
        const targetKode = c.targetItem ? (c.targetItem.kodeSubTugas || c.targetItem.kodePaket || '').toLowerCase() : '';
        const reasonsText = (c.reasons || []).join(' ').toLowerCase();

        const isMatch = fn.includes(query) || 
          path.includes(query) || 
          folder.includes(query) || 
          targetMapel.includes(query) || 
          targetTema.includes(query) || 
          targetKelas === query ||
          `kls ${targetKelas}`.includes(query) ||
          `kelas ${targetKelas}`.includes(query) ||
          targetModul.includes(query) || 
          targetNo === query ||
          targetKode.includes(query) ||
          reasonsText.includes(query);

        if (!isMatch) return false;
      }
      return true;
    });
  }, [smartCandidates, matchScoreFilter, smartMatchSearch]);

  const candidateStats = useMemo(() => {
    const total = smartCandidates.length;
    const high = smartCandidates.filter(c => c.confidence === 'HIGH' && !!c.targetItem).length;
    const medium = smartCandidates.filter(c => c.confidence === 'MEDIUM' && !!c.targetItem).length;
    const unmatched = smartCandidates.filter(c => !c.targetItem || c.confidence === 'LOW').length;
    const selected = smartCandidates.filter(c => c.selected && !!c.targetItem).length;
    return { total, high, medium, unmatched, selected };
  }, [smartCandidates]);

  const toggleCandidateSelect = (fileId: string) => {
    setSmartCandidates(prev => prev.map(c => c.file.id === fileId ? { ...c, selected: !c.selected } : c));
  };

  const selectAllCandidates = () => {
    setSmartCandidates(prev => prev.map(c => ({ ...c, selected: !!c.targetItem })));
  };

  const selectHighCandidates = () => {
    setSmartCandidates(prev => prev.map(c => ({ ...c, selected: c.confidence === 'HIGH' && !!c.targetItem })));
  };

  const deselectAllCandidates = () => {
    setSmartCandidates(prev => prev.map(c => ({ ...c, selected: false })));
  };

  const changeCandidateTarget = (fileId: string, newTargetId: string) => {
    const foundItem = silabusList.find(s => String(s.id || s.no) === String(newTargetId));
    setSmartCandidates(prev => prev.map(c => {
      if (c.file.id === fileId) {
        return {
          ...c,
          targetItem: foundItem || null,
          selected: !!foundItem,
          confidence: foundItem ? 'HIGH' : 'LOW',
          score: foundItem ? 95 : 0,
          reasons: foundItem ? ['Ditentukan Manual oleh Pengguna'] : []
        };
      }
      return c;
    }));
  };

  // Terapkan Kandidat Terpilih Secara Cerdas & Permanen
  const handleApplySelectedSmartMatches = async (onlyHighConfidence = false) => {
    const candidatesToApply = smartCandidates.filter(c => 
      onlyHighConfidence ? (c.confidence === 'HIGH' && !!c.targetItem) : (c.selected && !!c.targetItem)
    );

    if (candidatesToApply.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Ada Berkas Terpilih',
        text: 'Silakan beri centang pada modul yang ingin ditautkan ke silabus.'
      });
      return;
    }

    const confirmRes = await Swal.fire({
      icon: 'question',
      title: 'Terapkan Penautan Berkas Cerdas?',
      html: `<div class="text-xs text-slate-600 text-left space-y-2">
        <p>Anda akan menautkan <b>${candidatesToApply.length} berkas</b> dari Google Drive ke Silabus kurikulum secara otomatis.</p>
        <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
          <p class="font-bold">✓ Seluruh tautan disimpan permanen di sistem.</p>
          <p class="mt-0.5">Modul silabus akan langsung berstatus <b>"Tersedia"</b> dan otomatis terhubung ke katalog pembelajaran.</p>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, Terapkan (${candidatesToApply.length} Modul)`,
      cancelButtonText: 'Batal'
    });

    if (!confirmRes.isConfirmed) return;

    let appliedCount = 0;
    const updated = [...silabusList];

    candidatesToApply.forEach(cand => {
      const target = cand.targetItem;
      const file = cand.file;
      const tIdx = updated.findIndex(u => 
        (u.id && target.id && String(u.id).trim() === String(target.id).trim()) ||
        (u.no !== undefined && target.no !== undefined && String(u.no).trim() === String(target.no).trim()) ||
        (u.kodeSubTugas && target.kodeSubTugas && String(u.kodeSubTugas).trim() === String(target.kodeSubTugas).trim())
      );

      if (tIdx !== -1) {
        appliedCount++;
        updated[tIdx] = {
          ...updated[tIdx],
          fileUrl: file.url,
          FileUrl: file.url,
          pdfUrl: file.url,
          fileName: file.name,
          directUrl: file.directUrl || file.url,
          driveId: file.id,
          uploadedAt: new Date().toISOString()
        };
      }
    });

    savePersistedSilabusLinks(updated);
    setSilabusList(updated);
    db.set('master_silabus', updated);

    // Sinkronkan juga ke materi_digital
    try {
      const existingMateri = db.get<any[]>('materi_digital') || [];
      const newEntries = candidatesToApply.map((cand, idx) => ({
        MateriID: `MAT-DRV-${Date.now().toString().slice(-5)}-${idx}`,
        Judul: `${cand.targetItem.mataPelajaran || cand.targetItem.NamaMapel || 'Materi'} Kelas ${cand.targetItem.kelas || cand.targetItem.Kelas || ''} - ${cand.targetItem.temaModul || cand.file.name}`,
        Mapel: cand.targetItem.mataPelajaran || cand.targetItem.NamaMapel || '',
        Kelas: String(cand.targetItem.kelas || cand.targetItem.Kelas || ''),
        Guru: 'Tim Kurikulum (Google Drive)',
        Deskripsi: `Modul hasil pemindaian Google Drive: ${cand.file.name}`,
        FileUrl: cand.file.url,
        TipeMateri: 'PDF',
        UkuranFile: cand.file.size ? `${(cand.file.size / (1024 * 1024)).toFixed(2)} MB` : 'Berkas Drive',
        Status: 'Tersedia',
        CreatedAt: new Date().toISOString().slice(0, 10)
      }));
      db.set('materi_digital', [...newEntries, ...(Array.isArray(existingMateri) ? existingMateri : [])]);
    } catch (e) {
      console.warn('Gagal sinkron materi_digital:', e);
    }

    Swal.fire({
      icon: 'success',
      title: 'Pencocokan Cerdas Berhasil!',
      html: `<div class="text-xs text-slate-700 text-left space-y-2">
        <p>Berhasil menautkan <b>${appliedCount} berkas PDF</b> ke silabus pembelajaran.</p>
        <p class="text-[11px] text-emerald-700 font-semibold">Semua data telah tersimpan secara permanen dan aman dari refresh browser.</p>
      </div>`,
      confirmButtonColor: '#059669'
    });
    showToast(`✓ Berhasil menautkan ${appliedCount} berkas PDF secara presisi!`);
    setShowDriveScanModal(false);
  };

  // Handle Trigger Upload Lokal
  const handleTriggerUpload = (item: any) => {
    setActiveUploadItem(item);
    setUploadModalTargetItem(item);
    setSelectedUploadFile(null);
    setAutoMatchUploadInfo(null);
    setShowUploadModal(true);
  };

  // Helper saat berkas dipilih di Modal Unggah
  const handleSelectUploadFile = (file: File) => {
    setSelectedUploadFile(file);
    const detectedClasses = detectClassesInText(file.name);
    const modulNo = extractModulNo(file.name);

    let matchedItem: any = null;
    for (const item of silabusList) {
      const k = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
      const m = item.mataPelajaran || item.NamaMapel || '';
      const no = String(item.no || item.noModul || '').trim();

      const matchKelas = detectedClasses.length === 0 || detectedClasses.includes(k);
      const matchMapel = matchSubjectStrict(file.name, m);
      const matchModul = !modulNo || no === String(modulNo);

      if (matchKelas && matchMapel && matchModul) {
        matchedItem = item;
        break;
      }
    }

    if (matchedItem) {
      setUploadModalTargetItem(matchedItem);
      setAutoMatchUploadInfo(`⚡ Otomatis cocok: ${matchedItem.mataPelajaran || matchedItem.NamaMapel} Kelas ${matchedItem.kelas || matchedItem.Kelas} (Modul ${matchedItem.no || 1})`);
    } else {
      setAutoMatchUploadInfo(null);
    }
  };

  // Eksekusi Unggah dari Modal
  const handleExecuteUploadModal = async (mode: 'DRIVE_AND_APP' | 'APP_ONLY') => {
    if (!selectedUploadFile) {
      Swal.fire({ icon: 'warning', title: 'Pilih Berkas', text: 'Silakan pilih berkas PDF materi terlebih dahulu.' });
      return;
    }
    if (!uploadModalTargetItem) {
      Swal.fire({ icon: 'warning', title: 'Pilih Modul Target', text: 'Silakan tentukan modul silabus target untuk ditautkan.' });
      return;
    }

    setIsProcessingUpload(true);
    const target = uploadModalTargetItem;
    const file = selectedUploadFile;
    const fileSizeMB = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    try {
      const fileDataUrl = await fileToBase64(file);
      let driveUrl = '';
      let gasErrorMessage = '';

      if (mode === 'DRIVE_AND_APP') {
        try {
          const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
          const targetFolder = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID;
          const safeMapel = (target.mataPelajaran || target.NamaMapel || 'Materi').replace(/[^a-zA-Z0-9]/g, '_');
          const safeKelas = String(target.kelas || target.Kelas || '0').replace(/[^a-zA-Z0-9]/g, '');
          const cleanKode = target.kodeSubTugas ? `${target.kodeSubTugas.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
          const customFileName = `${cleanKode}Modul_${target.no || 1}_${safeMapel}_Kls${safeKelas}_${file.name.replace(/\s+/g, '_')}`;

          const res = await uploadFileToGAS(
            gasUrl,
            file,
            targetFolder,
            customFileName,
            {
              kategori: 'MATERI_K13_SILABUS',
              folderId: targetFolder,
              folderName: '11_MATERI_DAN_MODUL_DIGITAL',
              kelas: safeKelas,
              mapel: safeMapel
            }
          );
          if (res && (res.url || res.directUrl)) {
            driveUrl = res.url || res.directUrl || '';
          }
        } catch (gasErr: any) {
          console.warn('GAS Upload error:', gasErr);
          gasErrorMessage = gasErr?.message || String(gasErr);
        }
      }

      const finalUrl = driveUrl || fileDataUrl;
      let linkedCount = 1;

      if (uploadApplyToAllInScope && target) {
        const targetMapel = target.mataPelajaran || target.NamaMapel || '';
        const targetKelas = String(target.kelas || target.Kelas || '').replace(/[A-Za-z]/g, '').trim();
        const matchingItems = silabusList.filter(s => {
          const sm = s.mataPelajaran || s.NamaMapel || '';
          const sk = String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim();
          return sm.toLowerCase() === targetMapel.toLowerCase() && sk === targetKelas;
        });
        linkedCount = linkFileToMultipleSilabus(matchingItems, finalUrl, file.name, fileSizeMB);
      } else {
        linkFileToSilabus(target, finalUrl, file.name, fileSizeMB);
      }

      setShowUploadModal(false);
      setSelectedUploadFile(null);
      setUploadModalTargetItem(null);
      setUploadApplyToAllInScope(false);

      if (driveUrl) {
        Swal.fire({
          icon: 'success',
          title: 'Unggah Berhasil!',
          html: `<p class="text-xs text-slate-600">Berkas <b>${file.name}</b> (${fileSizeMB}) berhasil diunggah ke Google Drive dan ditautkan ke <b>${linkedCount} modul silabus</b> ${target.mataPelajaran || target.NamaMapel} Kelas ${target.kelas || target.Kelas}.</p>`,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Selesai'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berkas Berhasil Ditautkan!',
          html: `<div class="text-xs text-slate-600 text-left space-y-2">
            <p>Berkas <b>${file.name}</b> (${fileSizeMB}) berhasil disimpan dan ditautkan ke <b>${linkedCount} modul silabus</b> ${target.mataPelajaran || target.NamaMapel} Kelas ${target.kelas || target.Kelas}.</p>
            ${gasErrorMessage ? `
              <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                <p class="font-bold">Info Sinkronisasi Google Drive:</p>
                <p class="mt-0.5">${gasErrorMessage}</p>
              </div>
            ` : ''}
            <p class="text-[11px] text-emerald-700 font-semibold">✓ Seluruh modul target kini berstatus "Tersedia" dan siap digunakan sebagai materi acuan CBT.</p>
          </div>`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Selesai'
        });
      }
      showToast(`✓ Berkas PDF berhasil diunggah dan ditautkan ke ${linkedCount} modul!`);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses Berkas',
        text: err?.message || 'Terjadi kesalahan sistem saat memproses berkas.'
      });
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Direct File Input Upload Execution (dari input tersembunyi jika dipakai)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadItem) return;

    const itemId = activeUploadItem.id || activeUploadItem.no;
    setUploadingId(itemId);

    try {
      const fileDataUrl = await fileToBase64(file);
      const fileSizeMB = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      let driveUrl = '';
      let gasErrorMessage = '';

      try {
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        const targetFolder = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID;
        const safeMapel = (activeUploadItem.mataPelajaran || activeUploadItem.NamaMapel || 'Materi').replace(/[^a-zA-Z0-9]/g, '_');
        const safeKelas = String(activeUploadItem.kelas || activeUploadItem.Kelas || '0').replace(/[^a-zA-Z0-9]/g, '');
        const cleanKode = activeUploadItem.kodeSubTugas ? `${activeUploadItem.kodeSubTugas.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
        const customFileName = `${cleanKode}Modul_${activeUploadItem.no || 1}_${safeMapel}_Kls${safeKelas}_${file.name.replace(/\s+/g, '_')}`;

        const res = await uploadFileToGAS(
          gasUrl,
          file,
          targetFolder,
          customFileName,
          {
            kategori: 'MATERI_K13_SILABUS',
            folderId: targetFolder,
            folderName: '11_MATERI_DAN_MODUL_DIGITAL',
            kelas: safeKelas,
            mapel: safeMapel
          }
        );

        if (res && (res.url || res.directUrl)) {
          driveUrl = res.url || res.directUrl || '';
        }
      } catch (gasErr: any) {
        console.warn('GAS Upload error:', gasErr);
        gasErrorMessage = gasErr?.message || String(gasErr);
      }

      const finalUrl = driveUrl || fileDataUrl;
      linkFileToSilabus(activeUploadItem, finalUrl, file.name, fileSizeMB);

      if (driveUrl) {
        Swal.fire({
          icon: 'success',
          title: 'Unggah Berhasil!',
          html: `<p class="text-xs text-slate-600">Berkas <b>${file.name}</b> (${fileSizeMB}) berhasil diunggah ke Google Drive dan ditautkan ke Silabus.</p>`,
          confirmButtonColor: '#059669'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berkas Ditautkan di Aplikasi!',
          html: `<div class="text-xs text-slate-600 text-left space-y-2">
            <p>Berkas <b>${file.name}</b> (${fileSizeMB}) berhasil disimpan dan ditautkan ke Silabus.</p>
            ${gasErrorMessage ? `
              <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                <p class="font-bold">Catatan Google Drive:</p>
                <p class="mt-0.5">${gasErrorMessage}</p>
              </div>
            ` : ''}
            <p class="text-[11px] text-emerald-700 font-semibold">✓ Modul kini berstatus "Tersedia" dan siap digunakan untuk acuan CBT.</p>
          </div>`,
          confirmButtonColor: '#4f46e5'
        });
      }
      showToast('✓ Berkas PDF berhasil diunggah & ditautkan ke Silabus!');
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Upload Berkas',
        text: err?.message || String(err)
      });
    } finally {
      setUploadingId(null);
      setActiveUploadItem(null);
    }
  };

  // Helper Universal: Menautkan 1 File PDF / Drive ke Banyak Modul Silabus Sekaligus
  const linkFileToMultipleSilabus = (
    targets: (any | string | number)[],
    fileUrl: string,
    fileName?: string,
    fileSize?: string,
    directUrl?: string
  ): number => {
    if (!targets || targets.length === 0) return 0;

    const formatted = formatGoogleDriveUrl(fileUrl);
    const validUrl = formatted.viewUrl || fileUrl;
    const dUrl = directUrl || formatted.directUrl || validUrl;

    const targetKeySet = new Set<string>();
    targets.forEach(t => {
      if (!t) return;
      if (typeof t === 'object') {
        if (t.id !== undefined && t.id !== null) targetKeySet.add(String(t.id).trim());
        if (t.no !== undefined && t.no !== null) {
          targetKeySet.add(`no_${String(t.no).trim()}`);
          targetKeySet.add(String(t.no).trim());
        }
        if (t.kodeSubTugas) targetKeySet.add(String(t.kodeSubTugas).trim());
      } else {
        targetKeySet.add(String(t).trim());
        targetKeySet.add(`no_${String(t).trim()}`);
      }
    });

    let updatedCount = 0;
    const matchedItems: any[] = [];
    const updatedList = silabusList.map(i => {
      const idKey = i.id !== undefined && i.id !== null ? String(i.id).trim() : '';
      const noKey = i.no !== undefined && i.no !== null ? `no_${String(i.no).trim()}` : '';
      const rawNoKey = i.no !== undefined && i.no !== null ? String(i.no).trim() : '';
      const kodeKey = i.kodeSubTugas ? String(i.kodeSubTugas).trim() : '';

      const isMatch = (idKey && targetKeySet.has(idKey)) || 
                      (noKey && targetKeySet.has(noKey)) || 
                      (rawNoKey && targetKeySet.has(rawNoKey)) ||
                      (kodeKey && targetKeySet.has(kodeKey));

      if (isMatch) {
        updatedCount++;
        const safeName = fileName || i.fileName || `Modul_${i.no || 1}_${i.mataPelajaran || i.NamaMapel || 'Materi'}.pdf`;
        const updatedItem = {
          ...i,
          fileUrl: validUrl,
          FileUrl: validUrl,
          pdfUrl: validUrl,
          PdfUrl: validUrl,
          linkMateri: validUrl,
          directUrl: dUrl,
          fileName: safeName,
          FileName: safeName,
          uploadedAt: new Date().toISOString()
        };
        matchedItems.push(updatedItem);
        return updatedItem;
      }
      return i;
    });

    savePersistedSilabusLinks(updatedList);
    setSilabusList(updatedList);
    db.set('master_silabus', updatedList);

    // Update / Insert ke Sheet MATERI_DIGITAL lokal juga
    try {
      const existingMateri = db.get<any[]>('materi_digital') || [];
      const newEntries = matchedItems.map((item, idx) => ({
        MateriID: `MAT-K13-${Date.now().toString().slice(-6)}-${item.no || idx + 1}`,
        Judul: `${item.mataPelajaran || item.NamaMapel || 'Materi'} Kelas ${item.kelas || item.Kelas || ''} - ${item.temaModul || item.topikSubTugas || 'Modul K13'}`,
        Mapel: item.mataPelajaran || item.NamaMapel || '',
        Kelas: String(item.kelas || item.Kelas || ''),
        Guru: 'Tim Pengembang Kurikulum',
        Deskripsi: `Berkas acuan materi silabus K13 modul ${item.no || 1}. Digunakan sebagai acuan valid pembuatan butir soal CBT.`,
        FileUrl: validUrl,
        TipeMateri: 'PDF',
        UkuranFile: fileSize || 'Berkas Modul',
        Status: 'Tersedia',
        CreatedAt: new Date().toISOString().slice(0, 10)
      }));
      db.set('materi_digital', [...newEntries, ...(Array.isArray(existingMateri) ? existingMateri : [])]);
    } catch (e) {
      console.warn('Gagal sinkron materi_digital:', e);
    }

    return updatedCount;
  };

  const linkFileToSilabus = (item: any, fileUrl: string, fileName?: string, fileSize?: string, directUrl?: string) => {
    return linkFileToMultipleSilabus([item], fileUrl, fileName, fileSize, directUrl);
  };

  // Helper Mendapatkan URL Folder Google Drive untuk Modul Silabus Terkait
  const getTargetFolderUrlForSilabus = (item: any): string => {
    const baseFolderId = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID || '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';
    
    // 1. Cek apakah ada file di driveFiles yang memiliki folderUrl/folderId spesifik
    if (item && Array.isArray(driveFiles) && driveFiles.length > 0) {
      const targetKelas = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
      const targetMapel = (item.mataPelajaran || item.NamaMapel || item.mapel || '').trim().toLowerCase();
      const targetSing = (item.singkatan || item.sing || '').trim().toLowerCase();

      const matchedFile = driveFiles.find(f => {
        const fullStr = `${f.path || ''} ${f.folderName || ''} ${f.name || ''}`.toLowerCase();
        const mapelMatch = fullStr.includes(targetMapel) || (targetSing && fullStr.includes(targetSing));
        if (!mapelMatch) return false;
        const detectedK = detectClassesInText(fullStr);
        return detectedK.includes(targetKelas);
      });

      if (matchedFile && (matchedFile as any).folderUrl) {
        return (matchedFile as any).folderUrl;
      }
      if (matchedFile && (matchedFile as any).folderId) {
        return `https://drive.google.com/drive/folders/${(matchedFile as any).folderId}`;
      }
    }

    // 2. Default: Folder Modul Digital 11_MATERI_DAN_MODUL_DIGITAL
    return `https://drive.google.com/drive/folders/${baseFolderId}`;
  };

  const getDriveSearchUrlForSilabus = (item: any): string => {
    const baseFolderId = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID || '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';
    const targetKelas = String(item?.kelas || item?.Kelas || '').replace(/[A-Za-z]/g, '').trim();
    const targetMapel = (item?.mataPelajaran || item?.NamaMapel || item?.mapel || '').trim();
    
    const query = `parent:${baseFolderId} "Kelas ${targetKelas}" "${targetMapel}"`;
    return `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(query)}`;
  };

  // Buka Modal Tautkan Link Berkas Modul
  const handleOpenLinkModal = (item: any) => {
    setLinkModalItem(item);
    setLinkInputUrl(item.fileUrl || item.FileUrl || item.pdfUrl || '');
    const { fileName: expectedName } = deriveFileNameFromUrlAndItem('', item, driveFiles);
    // Format Standar Silabus langsung diterapkan secara default
    setLinkInputFileName(expectedName);
    setFileNameAutoSource('SILABUS_STANDARD');
    setLinkApplyToAllInScope(false);

    // Reset state Google Drive Rename & Live Info - Default TRUE untuk rename fisik
    setIsRenamingOnDrive(false);
    setRenamePhysicalFileOnDrive(true);
    setIsCheckingDriveLive(false);
    setDriveLiveDetails(null);

    setShowLinkModal(true);
  };

  // Cek nama berkas aktual secara live dari Google Drive via GAS API
  const fetchDriveFileInfoLive = async (driveId: string) => {
    if (!driveId || driveId.length < 20) return;
    setIsCheckingDriveLive(true);
    try {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const info = await getGoogleDriveFileInfo(gasUrl, driveId);
      if (info && (info.name || info.fileName)) {
        const realName = info.name || info.fileName || '';
        setDriveLiveDetails({ id: driveId, name: realName, size: info.size });
        // Tetap pertahankan Format Standar Silabus untuk target nama baru sesuai instruksi default
      }
    } catch (e) {
      // Fallback diam
    } finally {
      setIsCheckingDriveLive(false);
    }
  };

  // Handler otomatis ketika URL dimasukkan atau ditempel: Nama berkas otomatis terganti!
  const handleUrlInputChange = (newUrl: string) => {
    setLinkInputUrl(newUrl);
    setDriveLiveDetails(null);
    if (!newUrl.trim()) {
      setFileNameAutoSource(null);
      return;
    }
    const { fileName, source } = deriveFileNameFromUrlAndItem(newUrl, linkModalItem, driveFiles);
    setLinkInputFileName(fileName);
    setFileNameAutoSource(source);

    // Cek kecocokan dengan katalog Google Drive agar file di list ikut terpilih
    const driveId = extractGoogleDriveFileId(newUrl);
    if (driveId) {
      const matched = driveFiles.find(f => f.id === driveId || (f.url && extractGoogleDriveFileId(f.url) === driveId));
      if (matched) {
        setSelectedPickerDocId(matched.id);
        setDriveLiveDetails({ id: matched.id, name: matched.name, size: matched.size });
      } else {
        fetchDriveFileInfoLive(driveId);
      }
    }
  };

  // Fungsi Langsung Mengubah Nama Berkas Fisik di Akun Google Drive (DriveApp.setName)
  const handleDirectRenameOnDrive = async () => {
    const fileId = extractGoogleDriveFileId(linkInputUrl);
    if (!fileId) {
      Swal.fire({
        icon: 'warning',
        title: 'Tautan Google Drive Diperlukan',
        text: 'Silakan masukkan tautan berkas Google Drive terlebih dahulu.'
      });
      return;
    }
    const newName = linkInputFileName.trim();
    if (!newName) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Berkas Kosong',
        text: 'Silakan ketik nama berkas baru yang ingin diterapkan di Google Drive.'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Ubah Nama File di Google Drive?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p>Sistem akan mengirim perintah ke Google Apps Script (DriveApp) untuk <strong>mengubah nama fisik berkas langsung di Google Drive Anda</strong>:</p>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-[10px]">ID File Google Drive: <span class="font-mono text-slate-700">${fileId}</span></p>
            <p class="text-slate-800 font-bold mt-1">Nama Baru di Drive: <span class="text-sky-700 font-mono">${newName}</span></p>
          </div>
          <p class="text-emerald-700 text-[11px] font-medium">⚡ Tindakan ini langsung mengganti judul file fisik di Google Drive Anda secara nyata.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Ubah Nama di Drive Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7'
    });

    if (!result.isConfirmed) return;

    setIsRenamingOnDrive(true);
    try {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      await renameGoogleDriveFile(gasUrl, fileId, newName);

      // Update catalog lokal
      setDriveFiles(prev => prev.map(f => {
        if (f.id === fileId || (f.url && extractGoogleDriveFileId(f.url) === fileId)) {
          return { ...f, name: newName };
        }
        return f;
      }));

      setDriveLiveDetails(prev => prev ? { ...prev, name: newName } : { id: fileId, name: newName });

      Swal.fire({
        icon: 'success',
        title: 'Nama File di Google Drive Berhasil Diubah!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="text-emerald-700 font-bold">✓ Nama file fisik di Google Drive Anda telah berhasil diubah:</p>
            <p class="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-800 font-mono text-xs font-bold">${newName}</p>
            <p class="text-slate-500 text-[11px]">Anda dapat membuka Google Drive Anda sekarang untuk membuktikan bahwa nama file telah berganti secara nyata.</p>
          </div>
        `,
        confirmButtonColor: '#0284c7'
      });
      showToast(`✓ Berkas di Google Drive berhasil diubah menjadi: ${newName}`);
    } catch (err: any) {
      const isOutdated = err.message?.includes('DEPLOYMENT_OUTDATED') || err.message?.includes('Aksi tidak dikenal');
      if (isOutdated) {
        Swal.fire({
          icon: 'warning',
          title: 'Google Apps Script Perlu Diperbarui (Versi Baru)',
          html: `
            <div class="text-left text-xs space-y-2.5">
              <p class="text-amber-800 font-semibold">Web App Google Apps Script di akun Google Anda saat ini masih menjalankan versi lama yang belum memuat perintah <strong>RENAME_DRIVE_FILE</strong>.</p>
              <div class="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5 text-slate-800">
                <p class="font-bold text-[11px] text-amber-950">Cara Memperbarui (Hanya 1 Menit):</p>
                <ol class="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Klik tombol biru <strong>"Salin Kode Script Terbaru"</strong> di bawah.</li>
                  <li>Buka Spreadsheet Anda &gt; Menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Hapus isi file <code>Code.gs</code> lama, lalu tempel kode yang baru disalin.</li>
                  <li>Klik tombol <strong>Deploy (Terapkan) &gt; Kelola Deployment</strong>.</li>
                  <li>Klik ikon <strong>Pensil (Edit)</strong> &gt; ubah Versi menjadi <strong>Versi Baru</strong> &gt; klik <strong>Deploy (Terapkan)</strong>.</li>
                </ol>
              </div>
              <p class="text-emerald-700 text-[11px] font-medium">⚡ Setelah Anda Deploy Versi Baru, fitur ganti nama file fisik di Google Drive akan langsung bekerja 100% secara nyata.</p>
            </div>
          `,
          showDenyButton: true,
          confirmButtonText: 'Tutup',
          denyButtonText: '📋 Salin Kode Script Terbaru',
          denyButtonColor: '#0284c7',
          confirmButtonColor: '#64748b'
        }).then((resAlert) => {
          if (resAlert.isDenied) {
            navigator.clipboard.writeText(GAS_TEMPLATE);
            showToast('✓ Kode Google Apps Script terbaru berhasil disalin ke clipboard!');
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengubah di Google Drive',
          html: `
            <div class="text-left text-xs space-y-2">
              <p class="text-rose-600 font-medium">${err.message || 'Terjadi kesalahan saat memproses ke Google Drive.'}</p>
              <p class="text-slate-500 text-[11px]">Pastikan akun Google Apps Script memiliki izin DriveApp dan file tersebut berada di Google Drive yang dapat diakses oleh akun Apps Script Anda.</p>
            </div>
          `
        });
      }
    } finally {
      setIsRenamingOnDrive(false);
    }
  };

  // Pilih Dokumen dari File Picker dan opsi langsung menautkan
  const handleSelectPickerDoc = (doc: ScannedDriveFile, immediateLink: boolean = false) => {
    setSelectedPickerDocId(doc.id);
    const chosenUrl = doc.url || (doc as any).viewUrl || doc.directUrl || '';
    setLinkInputUrl(chosenUrl);
    
    // Langsung Format Standar Silabus (kodeSubTugas-topikSubTugas) secara default
    const { fileName: standardName } = deriveFileNameFromUrlAndItem(chosenUrl, linkModalItem, driveFiles);
    setLinkInputFileName(standardName);
    setFileNameAutoSource('SILABUS_STANDARD');

    if (immediateLink) {
      if (!linkModalItem) return;
      const gDriveId = extractGoogleDriveFileId(chosenUrl);
      if (renamePhysicalFileOnDrive && gDriveId) {
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        renameGoogleDriveFile(gasUrl, gDriveId, standardName).catch(err => {
          console.warn('Peringatan saat mengubah nama di Google Drive:', err);
        });
      }
      if (linkApplyToAllInScope) {
        const targetMapel = linkModalItem.mataPelajaran || linkModalItem.NamaMapel || '';
        const targetKelas = String(linkModalItem.kelas || linkModalItem.Kelas || '').replace(/[A-Za-z]/g, '').trim();
        const matchingItems = silabusList.filter(s => {
          const sm = s.mataPelajaran || s.NamaMapel || '';
          const sk = String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim();
          return sm.toLowerCase() === targetMapel.toLowerCase() && sk === targetKelas;
        });
        const count = linkFileToMultipleSilabus(matchingItems, chosenUrl, standardName);
        setShowLinkModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Berkas Berhasil Ditautkan!',
          text: `Dokumen "${standardName}" berhasil ditautkan ke ${count} modul ${targetMapel} Kelas ${targetKelas}.`,
          timer: 2000,
          showConfirmButton: false
        });
        showToast(`✓ Berkas "${standardName}" ditautkan ke ${count} modul!`);
      } else {
        linkFileToSilabus(linkModalItem, chosenUrl, standardName);
        setShowLinkModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Berkas Berhasil Ditautkan!',
          text: `Dokumen "${standardName}" berhasil ditautkan ke silabus "${linkModalItem.topikSubTugas || linkModalItem.temaModul || 'Materi'}".`,
          timer: 1800,
          showConfirmButton: false
        });
        showToast(`✓ Berkas "${standardName}" berhasil ditautkan!`);
      }
    }
  };

  // Simpan Link Drive dari Modal
  const handleSaveDriveLink = async () => {
    if (!linkModalItem) return;
    if (!linkInputUrl.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'URL Diperlukan',
        text: 'Silakan masukkan URL / tautan berkas Google Drive terlebih dahulu.'
      });
      return;
    }

    const { fileName: fallbackName } = deriveFileNameFromUrlAndItem('', linkModalItem, driveFiles);
    const finalFileName = linkInputFileName.trim() || fallbackName;

    // Jika checkbox ubah nama Google Drive dicentang, jalankan perintah rename ke GAS
    const gDriveId = extractGoogleDriveFileId(linkInputUrl);
    let driveRenameSuccess = false;
    let driveRenameErrorMsg = '';

    if (renamePhysicalFileOnDrive && gDriveId) {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      try {
        await renameGoogleDriveFile(gasUrl, gDriveId, finalFileName);
        driveRenameSuccess = true;
        setDriveFiles(prev => prev.map(f => {
          if (f.id === gDriveId || (f.url && extractGoogleDriveFileId(f.url) === gDriveId)) {
            return { ...f, name: finalFileName };
          }
          return f;
        }));
      } catch (err: any) {
        console.warn('Peringatan saat mengubah nama di Google Drive:', err);
        driveRenameErrorMsg = err?.message || 'Gagal mengubah nama di Google Drive';
      }
    }

    if (linkApplyToAllInScope) {
      const targetMapel = linkModalItem.mataPelajaran || linkModalItem.NamaMapel || '';
      const targetKelas = String(linkModalItem.kelas || linkModalItem.Kelas || '').replace(/[A-Za-z]/g, '').trim();
      const matchingItems = silabusList.filter(s => {
        const sm = s.mataPelajaran || s.NamaMapel || '';
        const sk = String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim();
        return sm.toLowerCase() === targetMapel.toLowerCase() && sk === targetKelas;
      });
      const count = linkFileToMultipleSilabus(matchingItems, linkInputUrl, finalFileName);
      setShowLinkModal(false);

      if (driveRenameErrorMsg) {
        Swal.fire({
          icon: 'warning',
          title: 'Tautan Tersimpan (Perhatian Google Drive)',
          html: `<div class="text-left text-xs space-y-2">
            <p>Link berhasil ditautkan ke <b>${count} modul</b> di silabus.</p>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
              <p class="font-bold">Nama fisik berkas di Google Drive belum berhasil diubah:</p>
              <p class="mt-0.5">${driveRenameErrorMsg.includes('DEPLOYMENT_OUTDATED') ? 'Web App Google Apps Script di akun Anda belum diperbarui ke "Versi Baru" yang mendukung perintah ubah nama otomatis (DriveApp.setName).' : driveRenameErrorMsg}</p>
            </div>
            <p class="text-slate-500 text-[10px]">Tautan tetap tersimpan dengan aman di sistem silabus.</p>
          </div>`,
          confirmButtonColor: '#059669'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Tautan Multi-Modul Tersimpan!',
          html: `<div class="text-left text-xs space-y-1">
            <p class="text-slate-600">Link berkas berhasil ditautkan ke <b>${count} modul</b> ${targetMapel} Kelas ${targetKelas} sekaligus.</p>
            ${driveRenameSuccess ? `<p class="text-emerald-700 font-bold">✓ Nama berkas fisik di Google Drive juga telah diperbarui menjadi: "${finalFileName}"</p>` : ''}
          </div>`,
          confirmButtonColor: '#059669'
        });
      }
      showToast(`✓ Berhasil menautkan file PDF ke ${count} modul!`);
    } else {
      linkFileToSilabus(linkModalItem, linkInputUrl, finalFileName);
      setShowLinkModal(false);

      if (driveRenameErrorMsg) {
        Swal.fire({
          icon: 'warning',
          title: 'Tautan Tersimpan (Perhatian Google Drive)',
          html: `<div class="text-left text-xs space-y-2">
            <p>Tautan berhasil disimpan di Silabus dengan nama: <b>${finalFileName}</b>.</p>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
              <p class="font-bold">Nama fisik berkas di Google Drive belum berubah:</p>
              <p class="mt-0.5">${driveRenameErrorMsg.includes('DEPLOYMENT_OUTDATED') ? 'Web App Google Apps Script di akun Anda belum diperbarui ke "Versi Baru" yang memuat perintah RENAME_DRIVE_FILE.' : driveRenameErrorMsg}</p>
            </div>
            <p class="text-slate-500 text-[10px]">Silakan buka editor Apps Script dan lakukan "Deploy > Kelola Deployment > Versi Baru".</p>
          </div>`,
          confirmButtonColor: '#0284c7'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Tautan Tersimpan!',
          html: `<div class="text-left text-xs space-y-1">
            <p class="text-slate-600">Link Google Drive berhasil ditautkan ke Silabus.</p>
            ${driveRenameSuccess ? `<p class="text-emerald-700 font-bold">✓ Nama berkas fisik di Google Drive telah diubah menjadi: "${finalFileName}"</p>` : ''}
          </div>`,
          timer: 2200,
          showConfirmButton: false
        });
      }
      showToast(`✓ Berkas "${finalFileName}" berhasil ditautkan!`);
    }
  };

  // Sesuaikan Nama Seluruh Modul yang Sudah Memiliki Link ke Format Standar Silabus
  const handleStandardizeAllExistingFileNames = async (customItems?: any[]) => {
    // 1. Filter item silabus yang sudah memiliki link berkas (dari seleksi atau seluruhnya)
    const sourceList = customItems && customItems.length > 0 ? customItems : silabusList;
    const linkedItems = sourceList.filter(item => Boolean(item.fileUrl || item.FileUrl || item.pdfUrl));
    if (linkedItems.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Belum Ada Berkas yang Tertaut',
        text: 'Saat ini belum ada modul silabus yang memiliki tautan berkas PDF untuk disesuaikan namanya.'
      });
      return;
    }

    // 1b. Hitung frekuensi pemakaian setiap file/URL di seluruh silabus
    const urlUsageCount = new Map<string, number>();
    silabusList.forEach(s => {
      const u = s.fileUrl || s.FileUrl || s.pdfUrl || '';
      const did = extractGoogleDriveFileId(u) || u.trim();
      if (did) {
        urlUsageCount.set(did, (urlUsageCount.get(did) || 0) + 1);
      }
    });

    // 2. Cari item yang nama berkasnya belum sesuai dengan Format Standar Silabus
    const needRenameItems: { item: any; oldName: string; standardName: string; driveId: string }[] = [];
    linkedItems.forEach(item => {
      const currentName = String(item.fileName || item.FileName || '').trim();
      const url = item.fileUrl || item.FileUrl || item.pdfUrl || '';
      const driveId = extractGoogleDriveFileId(url);
      const fileKey = driveId || url.trim();
      const usageCount = urlUsageCount.get(fileKey) || 1;

      // Single unit format (per unit sub-topik): kodeMapel-noModul-noSubModul-topikSubTugas.pdf
      // Contoh: A6-BINDO-11-1-Mewaspadai Bencana Alam Di Sekitar Kita.pdf
      const { fileName: singleFormatName } = deriveFileNameFromUrlAndItem(url, item, driveFiles, 'SINGLE_UNIT');

      // Bulk modul format (1 PDF untuk banyak topik sub): kodeMapel-noModul-temaModul.pdf
      // Contoh: C11-BING-6-Thank, It's Helpful.pdf
      const { fileName: bulkFormatName } = deriveFileNameFromUrlAndItem(url, item, driveFiles, 'BULK_MODUL');

      // Tentukan target sesuai kondisi: jika dipakai > 1 baris topik sub, pakai BULK_MODUL; jika hanya 1 baris, pakai SINGLE_UNIT
      const targetStandardName = usageCount > 1 ? bulkFormatName : singleFormatName;

      // PENGAMANAN KETAT:
      // Jangan sentuh jika nama saat ini sudah sah:
      // 1) Sudah sama dengan targetStandardName
      // 2) ATAU untuk file 1 unit sudah memakai format single-unit
      // 3) ATAU untuk file multi-unit sudah memakai format bulk-modul
      const isAlreadyValid = 
        currentName === targetStandardName ||
        (usageCount === 1 && currentName === singleFormatName) ||
        (usageCount > 1 && currentName === bulkFormatName);

      if (!isAlreadyValid) {
        needRenameItems.push({ item, oldName: currentName, standardName: targetStandardName, driveId: driveId || '' });
      }
    });

    if (needRenameItems.length === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Nama Berkas Sudah Standar!',
        text: `Seluruh ${linkedItems.length} modul silabus yang memiliki tautan berkas sudah menggunakan Format Standar Silabus.`
      });
      return;
    }

    // 3. Konfirmasi ke user dengan opsi rename fisik ke Google Drive
    const previewList = needRenameItems.slice(0, 4).map(n => 
      `<li class="text-[11px] truncate"><b>${n.item.mataPelajaran || n.item.mapel} Kls ${n.item.kelas}</b>: <span class="text-rose-600">${n.oldName || '(tanpa nama)'}</span> ➔ <span class="text-emerald-700 font-bold">${n.standardName}</span></li>`
    ).join('');

    const confirmRes = await Swal.fire({
      icon: 'question',
      title: 'Sesuaikan Format Nama Berkas Silabus?',
      html: `
        <div class="text-left text-xs space-y-2.5">
          <p>Ditemukan <b>${needRenameItems.length} modul</b> yang sudah bertaut tetapi namanya belum sesuai dengan Format Standar Silabus:</p>
          <ul class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 list-disc pl-4 text-slate-700">
            ${previewList}
            ${needRenameItems.length > 4 ? `<li class="text-[10px] text-slate-500 font-medium">...dan ${needRenameItems.length - 4} modul lainnya.</li>` : ''}
          </ul>
          <div class="p-2.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-sky-950">
            <label class="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input type="checkbox" id="swal-rename-drive-batch" checked class="rounded text-sky-600" />
              <span>Ganti nama fisik berkas asli langsung di Google Drive (via Apps Script)</span>
            </label>
            <p class="text-[10px] text-sky-700 pl-5 leading-tight">
              Jika dicentang, sistem akan mengirim perintah <code>DriveApp.setName()</code> ke akun Google Drive Anda untuk setiap berkas yang memiliki ID file Google Drive.
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Ya, Sesuaikan ${needRenameItems.length} Berkas`,
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7',
      preConfirm: () => {
        const checkbox = document.getElementById('swal-rename-drive-batch') as HTMLInputElement | null;
        return { renameDrive: checkbox ? checkbox.checked : true };
      }
    });

    if (!confirmRes.isConfirmed) return;
    const shouldRenameDrive = confirmRes.value?.renameDrive ?? true;

    // 4. Proses update
    Swal.fire({
      title: 'Memproses Penyesuaian Nama...',
      html: `<div class="text-xs text-slate-600 space-y-2">
        <p>Sedang memperbarui nama berkas silabus ke format standar...</p>
        <div id="swal-progress-text" class="font-mono text-[11px] text-sky-700">Memulai...</div>
      </div>`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
    let driveSuccessCount = 0;
    let driveFailCount = 0;
    let driveFailReason = '';

    // Update state silabus terlebih dahulu
    const renameMap = new Map<string, string>();
    needRenameItems.forEach(n => {
      const key = String(n.item.id || n.item.no);
      renameMap.set(key, n.standardName);
    });

    const updatedList = silabusList.map(item => {
      const key = String(item.id || item.no);
      if (renameMap.has(key)) {
        const newName = renameMap.get(key)!;
        return {
          ...item,
          fileName: newName,
          FileName: newName
        };
      }
      return item;
    });

    savePersistedSilabusLinks(updatedList);
    setSilabusList(updatedList);
    db.set('master_silabus', updatedList);

    // Jika diminta rename fisik di Google Drive:
    if (shouldRenameDrive) {
      // Himpun target unik berdasarkan driveId agar file fisik yang dipakai di 2-3 topik sub tidak di-rename berulang kali
      const uniqueTargetsMap = new Map<string, { driveId: string; standardName: string }>();
      needRenameItems.forEach(n => {
        if (n.driveId && !uniqueTargetsMap.has(n.driveId)) {
          uniqueTargetsMap.set(n.driveId, { driveId: n.driveId, standardName: n.standardName });
        }
      });

      const uniqueTargets = Array.from(uniqueTargetsMap.values());
      for (let i = 0; i < uniqueTargets.length; i++) {
        const target = uniqueTargets[i];
        const progressEl = document.getElementById('swal-progress-text');
        if (progressEl) {
          progressEl.innerText = `Mengubah nama di Google Drive (${i + 1}/${uniqueTargets.length}): ${target.standardName}`;
        }
        try {
          await renameGoogleDriveFile(gasUrl, target.driveId, target.standardName);
          driveSuccessCount++;
        } catch (err: any) {
          driveFailCount++;
          if (!driveFailReason) driveFailReason = err.message || '';
        }
      }
    }

    if (shouldRenameDrive && driveFailCount > 0 && driveSuccessCount === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama di Silabus Berhasil Diperbarui!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="text-emerald-700 font-bold">✓ Seluruh ${needRenameItems.length} modul silabus di sistem berhasil diubah ke Format Standar.</p>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
              <p class="font-bold">⚠️ Perhatian: Nama fisik di Google Drive belum berubah</p>
              <p>Google Apps Script di akun Google Anda belum diperbarui ke 'Versi Baru' yang memuat perintah ubah nama otomatis (DriveApp.setName).</p>
            </div>
            <p class="text-slate-500 text-[10px]">Silakan buka editor Apps Script, salin kode terbaru, lalu pilih 'Kelola Deployment' &gt; 'Versi Baru'.</p>
          </div>
        `,
        confirmButtonColor: '#0284c7'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Penyesuaian Nama Selesai!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="text-emerald-700 font-bold">✓ Berhasil menyesuaikan ${needRenameItems.length} nama berkas silabus ke format standar.</p>
            ${shouldRenameDrive ? `<p class="text-slate-600 text-[11px]">Nama fisik di Google Drive: <b>${driveSuccessCount} berkas</b> berhasil diubah${driveFailCount > 0 ? `, ${driveFailCount} dilewati/gagal` : ''}.</p>` : ''}
          </div>
        `,
        confirmButtonColor: '#059669'
      });
    }

    showToast(`✓ Berhasil memperbarui ${needRenameItems.length} nama berkas silabus!`);
  };

  // Hapus Berkas Tautan Banyak Sekaligus (Bulk Remove)
  const handleBulkRemovePdf = async (items: any[]) => {
    if (!items || items.length === 0) return;

    const result = await Swal.fire({
      title: `Hapus Tautan PDF dari ${items.length} Modul?`,
      html: `<div class="text-xs text-slate-600 text-left space-y-2">
        <p>Apakah Anda yakin ingin melepas tautan berkas PDF dari <b>${items.length} modul silabus terpilih</b>?</p>
        <p class="text-[11px] text-rose-600 font-medium">Status seluruh modul yang dipilih akan kembali menjadi "Belum Ada PDF".</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, Hapus Tautan (${items.length})`,
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    const targetKeySet = new Set<string>();
    items.forEach(t => {
      removePersistedSilabusLink(t);
      if (t.id !== undefined && t.id !== null) targetKeySet.add(String(t.id).trim());
      if (t.no !== undefined && t.no !== null) {
        targetKeySet.add(`no_${String(t.no).trim()}`);
        targetKeySet.add(String(t.no).trim());
      }
      if (t.kodeSubTugas) targetKeySet.add(String(t.kodeSubTugas).trim());
    });

    const updatedList = silabusList.map(i => {
      const idKey = i.id !== undefined && i.id !== null ? String(i.id).trim() : '';
      const noKey = i.no !== undefined && i.no !== null ? `no_${String(i.no).trim()}` : '';
      const rawNoKey = i.no !== undefined && i.no !== null ? String(i.no).trim() : '';
      const kodeKey = i.kodeSubTugas ? String(i.kodeSubTugas).trim() : '';

      const isMatch = (idKey && targetKeySet.has(idKey)) || 
                      (noKey && targetKeySet.has(noKey)) || 
                      (rawNoKey && targetKeySet.has(rawNoKey)) ||
                      (kodeKey && targetKeySet.has(kodeKey));

      if (isMatch) {
        const copy = { ...i };
        delete copy.fileUrl;
        delete copy.FileUrl;
        delete copy.pdfUrl;
        delete copy.PdfUrl;
        delete copy.linkMateri;
        delete copy.linkFile;
        delete copy.directUrl;
        delete copy.driveId;
        delete copy.fileName;
        delete copy.FileName;
        copy.fileUrl = '';
        copy.FileUrl = '';
        copy.pdfUrl = '';
        copy.PdfUrl = '';
        copy.linkMateri = '';
        copy.linkFile = '';
        copy.directUrl = '';
        copy.driveId = '';
        copy.fileName = '';
        copy.FileName = '';
        return copy;
      }
      return i;
    });

    savePersistedSilabusLinks(updatedList);
    setSilabusList(updatedList);
    db.set('master_silabus', updatedList);
    setSelectedTableItemIds([]);

    Swal.fire({
      icon: 'success',
      title: 'Tautan Berhasil Dihapus',
      text: `Tautan berkas PDF pada ${items.length} modul silabus berhasil dilepas.`,
      timer: 1800,
      showConfirmButton: false
    });
    showToast(`✓ Tautan berkas pada ${items.length} modul berhasil dilepas.`);
  };

  // Eksekusi Tautkan 1 Berkas PDF ke Semua Modul Terpilih (Bulk Link)
  const handleExecuteBulkLink = async () => {
    if (selectedTableItemIds.length === 0) return;
    setIsProcessingBulkLink(true);

    try {
      let finalUrl = '';
      let finalName = bulkLinkFileName.trim();

      let driveRenameSuccess = false;
      let driveRenameError = '';

      if (bulkLinkSourceType === 'URL') {
        if (!bulkLinkUrl.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'URL Diperlukan',
            text: 'Silakan masukkan URL / link berkas Google Drive terlebih dahulu.'
          });
          setIsProcessingBulkLink(false);
          return;
        }
        finalUrl = bulkLinkUrl.trim();
        if (!finalName || finalName === 'Modul_Kurikulum.pdf') {
          finalName = getStandardBulkFileName(selectedTableItemIds);
        }
        
        // Cek apakah URL adalah link Google Drive dan perlu diubah namanya di Google Drive
        const gDriveId = extractGoogleDriveFileId(finalUrl);
        if (bulkRenamePhysicalDrive && gDriveId && finalName) {
          const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
          if (gasUrl) {
            try {
              await renameGoogleDriveFile(gasUrl, gDriveId, finalName);
              driveRenameSuccess = true;
            } catch (err: any) {
              console.warn('Gagal ubah nama di Google Drive:', err);
              driveRenameError = err?.message || 'Gagal mengubah nama di Drive';
            }
          }
        }
      } else if (bulkLinkSourceType === 'DRIVE') {
        if (!bulkSelectedDriveFile) {
          Swal.fire({
            icon: 'warning',
            title: 'Pilih Berkas Drive',
            text: 'Silakan klik salah satu berkas dari hasil scan Google Drive.'
          });
          setIsProcessingBulkLink(false);
          return;
        }
        finalUrl = bulkSelectedDriveFile.url;
        finalName = bulkLinkFileName.trim() || getStandardBulkFileName(selectedTableItemIds);
        
        // Ubah nama berkas fisik di Google Drive jika diminta
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        const gDriveId = bulkSelectedDriveFile.id || extractGoogleDriveFileId(finalUrl);
        if (bulkRenamePhysicalDrive && gasUrl && gDriveId && finalName) {
          try {
            await renameGoogleDriveFile(gasUrl, gDriveId, finalName);
            driveRenameSuccess = true;
            // Update cache nama berkas di driveFiles
            setDriveFiles(prev => prev.map(f => (f.id === gDriveId || f.url === finalUrl) ? { ...f, name: finalName } : f));
          } catch (err: any) {
            console.warn('Peringatan saat mengubah nama di Google Drive:', err);
            driveRenameError = err?.message || 'Gagal mengubah nama di Drive';
          }
        }
      } else if (bulkLinkSourceType === 'UPLOAD') {
        if (!bulkUploadFile) {
          Swal.fire({
            icon: 'warning',
            title: 'Pilih Berkas PDF',
            text: 'Silakan pilih berkas PDF dari komputer atau HP Anda.'
          });
          setIsProcessingBulkLink(false);
          return;
        }
        finalName = bulkLinkFileName.trim() || getStandardBulkFileName(selectedTableItemIds);
        const dataUrl = await fileToBase64(bulkUploadFile);
        let driveUrl = '';
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        const targetFolder = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID;
        if (gasUrl) {
          try {
            const res = await uploadFileToGAS(gasUrl, bulkUploadFile, targetFolder, finalName);
            if (res && (res.url || res.directUrl)) {
              driveUrl = res.url || res.directUrl;
              driveRenameSuccess = true;
            }
          } catch (e) {
            console.warn('Bulk GAS upload warning:', e);
          }
        }
        finalUrl = driveUrl || dataUrl;
      }

      const count = linkFileToMultipleSilabus(selectedTableItemIds, finalUrl, finalName);
      setShowBulkLinkModal(false);
      setSelectedTableItemIds([]);
      setBulkLinkUrl('');
      setBulkLinkFileName('');
      setBulkSelectedDriveFile(null);
      setBulkUploadFile(null);

      Swal.fire({
        icon: 'success',
        title: 'Penautan Multi-Modul Selesai!',
        html: `<div class="text-xs text-slate-600 text-left space-y-2">
          <p>1 Berkas PDF <b>${finalName}</b> berhasil dipasangkan ke <b>${count} modul silabus terpilih</b>.</p>
          ${driveRenameSuccess ? `<p class="text-emerald-700 font-bold">✓ Nama berkas fisik di Google Drive juga otomatis diperbarui menjadi: "${finalName}"</p>` : ''}
          ${driveRenameError ? `<p class="text-amber-600 text-[11px]">Catatan Drive: ${driveRenameError}</p>` : ''}
          <p class="text-[11px] text-emerald-700 font-semibold">✓ Seluruh modul target kini berstatus "Tersedia" dan terhubung langsung ke materi acuan CBT.</p>
        </div>`,
        confirmButtonColor: '#059669'
      });
      showToast(`✓ Berhasil menautkan 1 PDF ke ${count} modul silabus!`);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menautkan Berkas',
        text: err?.message || 'Terjadi kesalahan sistem.'
      });
    } finally {
      setIsProcessingBulkLink(false);
    }
  };

  // Hapus Berkas Tautan
  const handleRemovePdf = async (item: any) => {
    const result = await Swal.fire({
      title: 'Hapus Tautan Berkas PDF?',
      html: `<div class="text-xs text-slate-600 text-left space-y-2">
        <p>Apakah Anda yakin ingin melepas tautan berkas PDF berikut dari silabus?</p>
        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800">
          <p class="font-bold text-slate-900">${item.mataPelajaran || item.NamaMapel} Kelas ${item.kelas || item.Kelas || ''}</p>
          <p class="text-[11px] text-slate-500">${item.temaModul || item.topikSubTugas || '-'}</p>
          ${item.fileName ? `<p class="text-[10px] text-indigo-600 font-mono mt-1">📄 ${item.fileName}</p>` : ''}
        </div>
        <p class="text-[11px] text-rose-600 font-medium">Status modul akan kembali menjadi "Belum Ada PDF".</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Tautan',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    removePersistedSilabusLink(item);

    const updatedList = silabusList.map(i => {
      const matchId = i.id && item.id && String(i.id).trim() === String(item.id).trim();
      const matchNo = i.no !== undefined && item.no !== undefined && String(i.no).trim() === String(item.no).trim();
      const matchKode = i.kodeSubTugas && item.kodeSubTugas && String(i.kodeSubTugas).trim() === String(item.kodeSubTugas).trim();

      if (matchId || matchNo || matchKode) {
        const copy = { ...i };
        delete copy.fileUrl;
        delete copy.FileUrl;
        delete copy.pdfUrl;
        delete copy.PdfUrl;
        delete copy.linkMateri;
        delete copy.linkFile;
        delete copy.directUrl;
        delete copy.driveId;
        delete copy.fileName;
        delete copy.FileName;
        copy.fileUrl = '';
        copy.FileUrl = '';
        copy.pdfUrl = '';
        copy.PdfUrl = '';
        copy.linkMateri = '';
        copy.linkFile = '';
        copy.directUrl = '';
        copy.driveId = '';
        copy.fileName = '';
        copy.FileName = '';
        return copy;
      }
      return i;
    });

    savePersistedSilabusLinks(updatedList);
    setSilabusList(updatedList);
    db.set('master_silabus', updatedList);

    // Bersihkan juga dari materi_digital lokal
    try {
      const existingMateri = (db.get('materi_digital') as any[]) || [];
      const filteredMateri = existingMateri.filter((m: any) => {
        const isMatchMapel = (m?.Mapel || '').toLowerCase() === (item.mataPelajaran || item.NamaMapel || '').toLowerCase();
        const isMatchKelas = String(m?.Kelas || '') === String(item.kelas || item.Kelas || '');
        const isMatchJudul = (m?.Judul || '').toLowerCase().includes((item.temaModul || item.topikSubTugas || '').toLowerCase());
        return !(isMatchMapel && isMatchKelas && isMatchJudul);
      });
      db.set('materi_digital', filteredMateri);
    } catch (e) {
      console.warn('Gagal bersihkan materi_digital:', e);
    }

    Swal.fire({
      icon: 'success',
      title: 'Tautan Berkas Dihapus',
      text: 'Status berkas silabus berhasil dikosongkan.',
      timer: 1800,
      showConfirmButton: false
    });
    showToast('✓ Tautan berkas PDF berhasil dihapus.');
  };

  const handleCopyGasCode = () => {
    try {
      navigator.clipboard.writeText(GAS_TEMPLATE);
      showToast('✓ Kode Google Apps Script terbaru (Code.gs) berhasil disalin ke clipboard!');
    } catch {
      showToast('Gagal menyalin otomatis. Silakan buka menu Pengaturan untuk menyalin kode GAS.');
    }
  };

  const handleShowGasUpdateGuide = () => {
    Swal.fire({
      title: 'Panduan Pembaruan Google Apps Script',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 8px; font-weight: 600; color: #0f172a;">Ikuti 4 langkah mudah untuk mengaktifkan pemindaian folder Google Drive secara real-time:</p>
          <ol style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">Buka Google Spreadsheet ERP Anda &rarr; klik menu <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>.</li>
            <li style="margin-bottom: 6px;">Di file <code>Code.gs</code>, hapus seluruh isi lama lalu <strong>Paste (Tempel)</strong> kode terbaru.</li>
            <li style="margin-bottom: 6px;">Klik tombol <strong>Simpan (Save / Ctrl+S)</strong>.</li>
            <li style="margin-bottom: 6px; color: #b45309;"><strong>SANGAT PENTING:</strong> Klik tombol biru <strong>Terapkan (Deploy)</strong> di pojok kanan atas &rarr; pilih <strong>Kelola penerapan (Manage deployments)</strong> &rarr; klik ikon <strong>Pensil (Edit)</strong> &rarr; ganti Versi ke <strong>Versi baru (New version)</strong> &rarr; klik <strong>Terapkan (Deploy)</strong>.</li>
          </ol>
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #065f46;">
            💡 <em>Setelah diperbarui ke versi baru, klik tombol <strong>"Pindai Ulang Drive"</strong> di sistem. Semua berkas di folder Google Drive Anda akan langsung terbaca otomatis!</em>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Salin Code.gs Sekarang',
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((res) => {
      if (res.isConfirmed) {
        handleCopyGasCode();
      }
    });
  };

  const handleLoadCurriculumCatalog = () => {
    const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
    setDriveFiles(catalog);
    safeCacheSet('sista_cached_drive_modul_files', catalog);
    safeCacheSet('sista_cached_drive_modul_time', new Date().toLocaleTimeString('id-ID'));
    setScanError(null);
    showToast(`✓ Berhasil memuat ${catalog.length} berkas modul digital dari Master Kurikulum!`);
  };

  const handleManualAddDriveFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFileName.trim() || !manualFileUrl.trim()) {
      alert('Mohon isi nama berkas dan tautan Google Drive.');
      return;
    }
    const formatted = formatGoogleDriveUrl(manualFileUrl);
    const newFile: ScannedDriveFile = {
      id: formatted.fileId || `MANUAL-${Date.now()}`,
      name: manualFileName.trim().endsWith('.pdf') ? manualFileName.trim() : `${manualFileName.trim()}.pdf`,
      path: `11_MATERI_DAN_MODUL_DIGITAL / Manual / ${manualFileName.trim()}`,
      folderName: '11_MATERI_DAN_MODUL_DIGITAL',
      mimeType: 'application/pdf',
      size: 0,
      url: formatted.viewUrl,
      directUrl: formatted.directUrl,
      updated: new Date().toLocaleDateString('id-ID')
    };
    const updated = sanitizeScannedDriveFiles([newFile, ...driveFiles]);
    setDriveFiles(updated);
    safeCacheSet('sista_cached_drive_modul_files', updated);
    setManualFileName('');
    setManualFileUrl('');
    setShowManualAddFile(false);
    showToast(`✓ Berkas "${newFile.name}" berhasil ditambahkan ke pustaka!`);
  };

  // Pindai Berkas di Google Drive via Apps Script dengan Cache Cepat & Fallback Cerdas
  const handleScanDriveFolder = async (forceRefresh = false, customTargetFolder?: string) => {
    const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
    const rawTarget = (customTargetFolder || customFolderInput || settings?.folderModulId || GOOGLE_DRIVE_MODUL_FOLDER_ID).trim();
    const formatted = formatGoogleDriveUrl(rawTarget);
    const resolvedFolderId = formatted.fileId || rawTarget || GOOGLE_DRIVE_MODUL_FOLDER_ID;

    // Cek cache lokal terlebih dahulu jika tidak diminta paksa
    const cachedStr = localStorage.getItem('sista_cached_drive_modul_files');
    if (cachedStr && !forceRefresh && !customTargetFolder) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeScannedDriveFiles(parsed);
          setDriveFiles(sanitized);
          safeCacheSet('sista_cached_drive_modul_files', sanitized);
          setScanFolderInfo({
            folderName: '11_MATERI_DAN_MODUL_DIGITAL',
            folderUrl: `https://drive.google.com/drive/folders/${resolvedFolderId}`,
            folderId: resolvedFolderId
          });
          setScanModalTab('MATCH_PREVIEW');
          setShowDriveScanModal(true);
          setIsScanningDrive(false);
          return;
        }
      } catch {}
    }

    setIsScanningDrive(true);
    setScanError(null);
    setScanNotice(null);
    setScanModalTab('MATCH_PREVIEW');
    setShowDriveScanModal(true);
    setScanFolderInfo({
      folderName: '11_MATERI_DAN_MODUL_DIGITAL',
      folderUrl: `https://drive.google.com/drive/folders/${resolvedFolderId}`,
      folderId: resolvedFolderId
    });

    try {
      let data: any = await Promise.race([
        fetchFromGAS(gasUrl, {
          action: 'LIST_DRIVE_FILES',
          folderId: resolvedFolderId,
          folderName: '11_MATERI_DAN_MODUL_DIGITAL'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Waktu pemindaian melebihi batas (20 detik).')), 20000))
      ]);

      // Jika aksi utama tidak dikenal, coba alias SCAN_DRIVE_FOLDER
      if (data && (data.message === 'Aksi tidak dikenal' || data.error === 'Aksi tidak dikenal')) {
        try {
          data = await fetchFromGAS(gasUrl, {
            action: 'SCAN_DRIVE_FOLDER',
            folderId: resolvedFolderId,
            folderName: '11_MATERI_DAN_MODUL_DIGITAL'
          });
        } catch {}
      }

      if (data && data.status === 'success' && Array.isArray(data.files) && data.files.length > 0) {
        const sanitizedFiles = sanitizeScannedDriveFiles(data.files);
        setDriveFiles(sanitizedFiles);
        setGasNeedsUpdate(false);
        setScanNotice(null);
        safeCacheSet('sista_cached_drive_modul_files', sanitizedFiles);
        safeCacheSet('sista_cached_drive_modul_time', new Date().toLocaleTimeString('id-ID'));
        setScanFolderInfo({
          folderName: data.folderName || '11_MATERI_DAN_MODUL_DIGITAL',
          folderUrl: data.folderUrl || `https://drive.google.com/drive/folders/${resolvedFolderId}`,
          folderId: data.folderId || resolvedFolderId
        });
        showToast(`✓ Berhasil memindai ${sanitizedFiles.length} berkas dari Google Drive!`);
      } else if (data && (data.message === 'Aksi tidak dikenal' || data.error === 'Aksi tidak dikenal')) {
        // Fallback cerdas jika Web App Apps Script belum diupdate dengan LIST_DRIVE_FILES
        const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
        setDriveFiles(catalog);
        setGasNeedsUpdate(true);
        setScanNotice('Web App Google Apps Script Anda saat ini masih menjalankan versi deployment sebelumnya (aksi pemindaian langsung Google Drive belum terpasang). Sistem secara otomatis memuat 351 berkas modul digital resmi kurikulum agar Anda dapat langsung melakukan pencocokan silabus tanpa hambatan.');
        safeCacheSet('sista_cached_drive_modul_files', catalog);
        safeCacheSet('sista_cached_drive_modul_time', new Date().toLocaleTimeString('id-ID'));
      } else {
        throw new Error(data?.message || 'Folder di Google Drive tidak dapat dibaca atau belum ada berkas.');
      }
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (errMsg.includes('Aksi tidak dikenal') || errMsg.includes('tidak dikenal')) {
        const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
        setDriveFiles(catalog);
        setGasNeedsUpdate(true);
        setScanNotice('Web App Google Apps Script Anda saat ini masih menjalankan versi deployment sebelumnya. Sistem secara otomatis memuat 351 berkas modul digital resmi kurikulum.');
        safeCacheSet('sista_cached_drive_modul_files', catalog);
        safeCacheSet('sista_cached_drive_modul_time', new Date().toLocaleTimeString('id-ID'));
      } else if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = sanitizeScannedDriveFiles(parsed);
            setDriveFiles(sanitized);
            safeCacheSet('sista_cached_drive_modul_files', sanitized);
            showToast('Menampilkan berkas dari penyimpanan lokal.');
            setIsScanningDrive(false);
            return;
          }
        } catch {}
        const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
        setDriveFiles(catalog);
        setGasNeedsUpdate(true);
      } else {
        const catalog = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusList));
        setDriveFiles(catalog);
        setGasNeedsUpdate(true);
        setScanNotice(`Koneksi Drive Apps Script: ${errMsg}. Menampilkan katalog modul kurikulum master.`);
      }
    } finally {
      setIsScanningDrive(false);
    }
  };

  // Auto-Match Berkas Drive ke Silabus secara Terarah (Per Kelas & Per Mapel)
  const handleAutoMatchDriveFiles = (customScopeKelas?: string, customScopeMapel?: string) => {
    if (driveFiles.length === 0) {
      alert('Tidak ada berkas di Google Drive untuk dicocokkan. Silakan pindai folder Google Drive terlebih dahulu.');
      return;
    }

    const scopeKelas = customScopeKelas !== undefined ? customScopeKelas : matchScopeKelas;
    const scopeMapel = customScopeMapel !== undefined ? customScopeMapel : matchScopeMapel;

    setIsAutoMatching(true);
    let matchedCount = 0;
    const updated = [...silabusList];

    driveFiles.forEach(df => {
      const fullPathStr = `${df.path || ''} ${df.folderName || ''} ${df.name || ''}`.toLowerCase();
      const detectedClasses = detectClassesInText(fullPathStr);
      const fileModulNo = extractModulNo(fullPathStr);

      const targetIdx = updated.findIndex(item => {
        // Jangan timpa jika silabus sudah memiliki berkas PDF
        if (item.fileUrl || item.FileUrl || item.pdfUrl) return false;

        const itemKelas = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
        const itemMapel = (item.mataPelajaran || item.NamaMapel || item.mapel || '').trim();
        const itemModulNo = Number(item.noModul || item.no || 0);
        const itemTema = (item.temaModul || item.topikSubTugas || item.materiPokok || '').toLowerCase();

        // 1. Filter Lingkup Target (Scope) yang dipilih pengguna
        if (scopeKelas !== 'ALL' && itemKelas !== scopeKelas) return false;
        if (scopeMapel !== 'ALL' && itemMapel.toLowerCase() !== scopeMapel.toLowerCase()) return false;

        // 2. Filter Kelas Ketat: jika berkas memiliki indikator kelas lain yang bukan kelas item, tolak!
        if (detectedClasses.length > 0 && !detectedClasses.includes(itemKelas)) {
          return false;
        }

        // Jika pencocokan bersifat global ('ALL') dan file tidak ada nama kelas sama sekali,
        // jangan pasang sembarangan agar tidak tertukar kelas
        if (detectedClasses.length === 0 && scopeKelas === 'ALL') {
          return false;
        }

        // 3. Filter Mapel Ketat
        const isMapelMatch = matchSubjectStrict(fullPathStr, itemMapel);
        if (!isMapelMatch) return false;

        // 4. Filter Nomor Modul: jika ada nomor modul di nama berkas, harus sama persis!
        if (fileModulNo !== null && itemModulNo > 0) {
          if (fileModulNo !== itemModulNo) {
            return false;
          }
          return true; // Kelas cocok, Mapel cocok, Nomor Modul cocok persis!
        }

        // Jika tidak ada nomor modul di file, cek apakah kata tema cocok
        if (itemTema && itemTema.length > 5) {
          const words = itemTema.split(/[\s,.-]+/).filter(w => w.length > 4);
          if (words.some(w => fullPathStr.includes(w))) {
            return true;
          }
        }

        return false;
      });

      if (targetIdx !== -1) {
        matchedCount++;
        const target = updated[targetIdx];
        updated[targetIdx] = {
          ...target,
          fileUrl: df.url,
          FileUrl: df.url,
          pdfUrl: df.url,
          fileName: df.name,
          directUrl: df.url,
          driveId: df.id,
          uploadedAt: new Date().toISOString()
        };
      }
    });

    setIsAutoMatching(false);

    if (matchedCount > 0) {
      savePersistedSilabusLinks(updated);
      setSilabusList(updated);
      db.set('master_silabus', updated);
      
      const scopeParts: string[] = [];
      if (scopeKelas !== 'ALL') scopeParts.push(`Kelas ${scopeKelas}`);
      if (scopeMapel !== 'ALL') scopeParts.push(`Mapel ${scopeMapel}`);
      const scopeDesc = scopeParts.length > 0 ? ` (${scopeParts.join(' • ')})` : '';

      showToast(`🎉 Sukses! ${matchedCount} berkas PDF berhasil dicocokkan ke Silabus${scopeDesc} secara presisi!`);
      setShowDriveScanModal(false);
    } else {
      const scopeParts: string[] = [];
      if (scopeKelas !== 'ALL') scopeParts.push(`Kelas ${scopeKelas}`);
      if (scopeMapel !== 'ALL') scopeParts.push(`Mapel ${scopeMapel}`);
      const scopeDesc = scopeParts.length > 0 ? ` untuk [${scopeParts.join(' • ')}]` : '';

      alert(`Pencocokan otomatis${scopeDesc} belum menemukan berkas yang cocok persis. Tips: Pastikan nama berkas mencantumkan nomor modul (contoh: "Modul 1 Matematika Kelas ${scopeKelas !== 'ALL' ? scopeKelas : '7'}.pdf") atau gunakan tombol "Pilihkan Modul" pada daftar berkas untuk menautkannya secara instan.`);
    }
  };

  // Tarik Tautan Berkas dari Google Spreadsheet
  const handlePullFromSpreadsheet = async () => {
    setIsSyncingSpreadsheet(true);
    try {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const res = await pullAllSheetsFromGas(gasUrl);
      if (res && res.data) {
        const sheetSilabus = res.data.MASTER_SILABUS || res.data.master_silabus || [];
        const sheetMateri = res.data.MATERI_DIGITAL || res.data.materi_digital || [];

        // Hitung frekuensi pemakaian URL/ID file di sheet silabus
        const sheetUrlCount = new Map<string, number>();
        sheetSilabus.forEach((s: any) => {
          const u = (s.fileUrl || s.FileUrl || s.pdfUrl || s.link || s.url || s.linkModul || s.tautan || '').trim();
          const did = extractGoogleDriveFileId(u) || u;
          if (did) {
            sheetUrlCount.set(did, (sheetUrlCount.get(did) || 0) + 1);
          }
        });

        let countLinked = 0;
        const updated = silabusList.map(item => {
          // Cari di MASTER_SILABUS (berdasarkan ID, no, atau kodeSubTugas)
          const fromSheet = sheetSilabus.find((s: any) => 
            (s.id && String(s.id).trim() === String(item.id).trim()) || 
            (s.no && String(s.no).trim() === String(item.no).trim()) ||
            (s.kodeSubTugas && item.kodeSubTugas && String(s.kodeSubTugas).trim().toLowerCase() === String(item.kodeSubTugas).trim().toLowerCase())
          );

          let foundUrl = fromSheet ? (
            fromSheet.fileUrl || fromSheet.FileUrl || fromSheet.pdfUrl || fromSheet.PdfUrl ||
            fromSheet.link || fromSheet.Link || fromSheet.url || fromSheet.URL ||
            fromSheet.linkModul || fromSheet.LinkModul || fromSheet.linkFile || fromSheet.LinkFile ||
            fromSheet.tautan || fromSheet.Tautan || fromSheet.driveUrl || fromSheet.DriveUrl ||
            fromSheet.directUrl || fromSheet.DirectUrl
          ) : '';

          // Jika ada di keterangan
          if (!foundUrl && fromSheet?.keterangan) {
            const m = String(fromSheet.keterangan).match(/https?:\/\/[^\s"',;<>]+/i);
            if (m && m[0]) foundUrl = m[0].trim();
          }

          if (foundUrl) {
            countLinked++;
            const fileKey = extractGoogleDriveFileId(foundUrl) || foundUrl.trim();
            const countUsage = sheetUrlCount.get(fileKey) || 1;
            const pullMode = countUsage > 1 ? 'BULK_MODUL' : 'SINGLE_UNIT';
            const standardDerived = deriveFileNameFromUrlAndItem(foundUrl, item, driveFiles, pullMode).fileName;
            return {
              ...item,
              fileUrl: foundUrl,
              FileUrl: foundUrl,
              pdfUrl: foundUrl,
              fileName: fromSheet.fileName || fromSheet.FileName || standardDerived || item.fileName || `Modul_${item.no}_${item.NamaMapel || 'Silabus'}.pdf`
            };
          }

          // Cari di MATERI_DIGITAL berdasarkan Mapel & Kelas
          const fromMateri = sheetMateri.find((m: any) => {
            const mMapel = (m.Mapel || m.mapel || '').toLowerCase();
            const mKelas = String(m.Kelas || m.kelas || '').replace(/[A-Za-z]/g, '').trim();
            const iMapel = (item.mataPelajaran || item.NamaMapel || '').toLowerCase();
            const iKelas = String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim();
            return mMapel && iMapel && mMapel === iMapel && mKelas === iKelas && (m.FileUrl || m.fileUrl);
          });

          if (fromMateri && (fromMateri.FileUrl || fromMateri.fileUrl)) {
            countLinked++;
            const matUrl = fromMateri.FileUrl || fromMateri.fileUrl;
            return {
              ...item,
              fileUrl: matUrl,
              FileUrl: matUrl,
              pdfUrl: matUrl,
              fileName: fromMateri.Judul || fromMateri.judul || item.fileName
            };
          }

          return item;
        });

        setSilabusList(updated);
        savePersistedSilabusLinks(updated);
        db.set('master_silabus', updated);
        showToast(`Sinkronisasi selesai! ${countLinked} modul berhasil diperbarui dari Spreadsheet.`);
      } else {
        showToast('Sinkronisasi selesai, data lokal sudah mutakhir.');
      }
    } catch (err: any) {
      alert(`Gagal menarik dari spreadsheet: ${err.message || err}`);
    } finally {
      setIsSyncingSpreadsheet(false);
    }
  };

  // Simpan Seluruh Tautan Berkas ke Spreadsheet (17 Kolom Standar Bersih)
  const handlePushToSpreadsheet = async () => {
    setIsSyncingSpreadsheet(true);
    try {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const cleanSilabusRows = silabusList.map((r, idx) => ({
        id: r.id || `MS-${r.no || idx + 1}-${r.subKe || '1'}-${idx + 1}`,
        no: Number(r.no) || idx + 1,
        kodeJenjang: r.kodeJenjang || r.kodePaket || '',
        Jenjang: r.Jenjang || r.paket || '',
        kelas: r.kelas || '',
        semester: r.semester || 'SM-I',
        kodeMapel: r.kodeMapel || r.singkatan || '',
        NamaMapel: r.NamaMapel || r.mataPelajaran || '',
        noModul: r.noModul || 1,
        temaModul: r.temaModul || '',
        subKe: r.subKe || `Unit 1`,
        kodeSubTugas: r.kodeSubTugas || '',
        topikSubTugas: r.topikSubTugas || '',
        status: r.status || 'Tersedia',
        keterangan: r.keterangan || '',
        fileUrl: r.fileUrl || r.FileUrl || r.pdfUrl || '',
        fileName: r.fileName || r.FileName || (r.fileUrl ? `Modul_${r.no || idx + 1}_${r.NamaMapel || 'Silabus'}.pdf` : '')
      }));

      const res = await pushAllSheetsToGas({
        MASTER_SILABUS: cleanSilabusRows,
        MATERI_DIGITAL: db.get('materi_digital') || []
      }, gasUrl);
      if (res.success) {
        showToast('✓ Berhasil menyimpan seluruh tautan berkas silabus ke Google Spreadsheet!');
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Gagal menyimpan ke spreadsheet: ${err.message || err}`);
    } finally {
      setIsSyncingSpreadsheet(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        className="hidden" 
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Info & Drive Shortcut */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <BookOpen size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
                Materi & Modul Digital K13
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Drive Terintegrasi
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Berkas Acuan & Modul Silabus KBM
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
              Tautkan modul bahan ajar PDF per topik silabus sebagai acuan belajar mandiri siswa dan pembuatan bank soal CBT terpadu.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={() => {
              // Otomatis saring agar item yang SUDAH memiliki berkas PDF tidak diikutkan / tidak ditampilkan
              const onlyNoPdfIds = selectedTableItemIds.filter(id => {
                const item = silabusList.find(s => String(s.id || s.no) === id);
                return !checkSilabusHasPdf(item);
              });
              setSelectedTableItemIds(onlyNoPdfIds);
              setBulkLinkUrl('');
              setBulkLinkFileName('');
              setBulkSelectedDriveFile(null);
              setBulkUploadFile(null);
              setShowBulkLinkModal(true);
            }}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title="Tautkan 1 berkas PDF ke banyak judul silabus sekaligus (hanya judul yang belum punya PDF)"
          >
            <Link2 size={14} />
            <span>Tautkan PDF {selectedTableItemIds.length > 0 ? `(${selectedTableItemIds.length})` : 'Banyak'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveUploadItem(null);
              setSelectedUploadFile(null);
              setUploadModalTargetItem(null);
              setAutoMatchUploadInfo(null);
              setShowUploadModal(true);
            }}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title="Unggah berkas PDF dari komputer / HP dan tautkan ke silabus"
          >
            <Upload size={14} />
            <span>Unggah PDF</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-wrap">
            <button
              type="button"
              onClick={handlePullFromSpreadsheet}
              disabled={isSyncingSpreadsheet}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200/70 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Tarik Tautan Berkas dari Google Spreadsheet (Sheet MASTER_SILABUS)"
            >
              <RefreshCw size={13} className={`text-indigo-600 ${isSyncingSpreadsheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingSpreadsheet ? 'Menarik Sheet...' : 'Tarik dari Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStandardizeAllExistingFileNames()}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/70 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Ubah nama seluruh modul silabus yang sudah terisi link ke Format Standar (kodeMapel-noModul-temaModul.pdf) & ganti nama fisik di Google Drive secara masal"
            >
              <Sparkles size={13} className="text-sky-600" />
              <span>Standarkan & Rename Drive</span>
            </button>

            <button
              type="button"
              onClick={() => handleScanDriveFolder(true)}
              className="px-3 py-1.5 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Pindai Berkas yang sudah diupload langsung di Google Drive"
            >
              <Search size={13} className="text-emerald-600" />
              <span>Pindai Drive</span>
            </button>

            <a
              href={settings?.folderModulUrl || DEFAULT_APP_CONFIG.folderModulUrl || GOOGLE_DRIVE_MODUL_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white text-slate-600 hover:text-amber-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Buka Folder Modul Google Drive di Tab Baru"
            >
              <Folder size={14} className="text-amber-600" />
              <ExternalLink size={11} className="opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Rekap Statistik Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Modul Silabus</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh jenjang & mapel</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between gap-3 bg-emerald-50/20">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Sudah Ada PDF K13</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{stats.hasPdf}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Tertaut ke Drive ({stats.percentage}%)</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between gap-3 bg-rose-50/20">
          <div>
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Belum Ada PDF</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{stats.noPdf}</div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Menunggu berkas acuan</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100/80 flex items-center justify-center text-rose-600 shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-200/80 shadow-xs flex flex-col justify-between gap-2 bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Kesiapan Acuan Soal</div>
            <span className="text-xs font-extrabold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">{stats.percentage}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700">{stats.hasPdf} <span className="text-xs font-bold text-indigo-500">/ {stats.total}</span></div>
          <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
          </div>
        </div>
      </div>

      {/* Filter & Kontrol Pencarian */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari materi, tema modul, topik sub-tugas, nomor modul, atau nama mapel..."
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition"
              >
                ✕ Hapus
              </button>
            )}
          </div>

          {/* Filter Status PDF */}
          <div className="flex rounded-xl bg-slate-100 p-1 shrink-0 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setPdfStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${pdfStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setPdfStatusFilter('NO_PDF')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${pdfStatusFilter === 'NO_PDF' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-600 hover:text-rose-700'}`}
            >
              <AlertCircle size={12} />
              <span>Belum Ada PDF ({stats.noPdf})</span>
            </button>
            <button
              type="button"
              onClick={() => setPdfStatusFilter('HAS_PDF')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${pdfStatusFilter === 'HAS_PDF' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-800'}`}
            >
              <Check size={12} />
              <span>Ada PDF ({stats.hasPdf})</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdown Jenjang, Kelas, Semester, Mapel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Jenjang</label>
            <select
              value={selectedJenjang}
              onChange={(e) => setSelectedJenjang(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Jenjang</option>
              {distinctJenjang.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Kelas</option>
              {distinctKelas.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Semester</option>
              {distinctSemester.map(s => <option key={s} value={s}>{s.startsWith('Semester') ? s : `Semester ${s}`}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mata Pelajaran</label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {distinctMapel.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Silabus & Tombol Aksi Upload */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600">
              <FileText size={15} />
            </div>
            <div>
              <span className="font-extrabold text-slate-900">Daftar Modul Silabus</span>
              <span className="text-slate-400 font-medium ml-1.5">({filteredList.length} baris ditampilkan)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Bulk Action Buttons saat modul dicentang */}
            {selectedTableItemIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <button
                  onClick={() => {
                    setBulkLinkUrl('');
                    setBulkLinkFileName('');
                    setBulkSelectedDriveFile(null);
                    setBulkUploadFile(null);
                    setShowBulkLinkModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Tautkan 1 file PDF ke semua modul yang dicentang"
                >
                  <Link2 size={13} />
                  <span>📎 Tautkan 1 PDF ke ({selectedTableItemIds.length}) Modul</span>
                </button>

                <button
                  onClick={() => {
                    const selectedItems = silabusList.filter(s => selectedTableItemIds.includes(String(s.id || s.no)) && Boolean(s.fileUrl || s.FileUrl || s.pdfUrl));
                    if (selectedItems.length === 0) {
                      Swal.fire({
                        icon: 'info',
                        title: 'Tidak Ada Berkas Tertaut',
                        text: 'Modul yang Anda centang saat ini belum memiliki tautan berkas PDF untuk disesuaikan.'
                      });
                      return;
                    }
                    handleStandardizeAllExistingFileNames(selectedItems);
                  }}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Sesuaikan nama berkas silabus terpilih ke format standar dan sync ke Drive"
                >
                  <Sparkles size={12} className="text-sky-600" />
                  <span>Standarkan Nama ({selectedTableItemIds.length})</span>
                </button>

                <button
                  onClick={() => {
                    const itemsToRemove = silabusList.filter(s => selectedTableItemIds.includes(String(s.id || s.no)));
                    handleBulkRemovePdf(itemsToRemove);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Hapus tautan PDF dari modul yang dicentang"
                >
                  <Trash2 size={12} />
                  <span>Hapus Tautan ({selectedTableItemIds.length})</span>
                </button>

                <button
                  onClick={() => setSelectedTableItemIds([])}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}

            {/* Quick Button: Cocokkan Drive untuk Kelas / Mapel Terpilih */}
            {(selectedKelas !== 'ALL' || selectedMapel !== 'ALL') && (
              <button
                onClick={() => {
                  setMatchScopeKelas(selectedKelas);
                  setMatchScopeMapel(selectedMapel);
                  if (driveFiles.length === 0) {
                    handleScanDriveFolder(true);
                  } else {
                    handleAutoMatchDriveFiles(selectedKelas, selectedMapel);
                  }
                }}
                disabled={isAutoMatching || isScanningDrive}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title={`Cocokkan berkas Google Drive khusus ${selectedKelas !== 'ALL' ? `Kelas ${selectedKelas}` : ''} ${selectedMapel !== 'ALL' ? selectedMapel : ''}`}
              >
                <Sparkles size={13} />
                <span>
                  ⚡ Cocokkan {selectedKelas !== 'ALL' ? `Kelas ${selectedKelas}` : ''} {selectedMapel !== 'ALL' ? selectedMapel : ''}
                </span>
              </button>
            )}

            <button
              onClick={handlePushToSpreadsheet}
              disabled={isSyncingSpreadsheet}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simpan seluruh perubahan status berkas permanen ke Google Spreadsheet"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Simpan ke Spreadsheet</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && filteredList.slice(0, 100).every(i => selectedTableItemIds.includes(String(i.id || i.no)))}
                    onChange={(e) => {
                      const displayedIds = filteredList.slice(0, 100).map(i => String(i.id || i.no));
                      if (e.target.checked) {
                        setSelectedTableItemIds(Array.from(new Set([...selectedTableItemIds, ...displayedIds])));
                      } else {
                        const setDisp = new Set(displayedIds);
                        setSelectedTableItemIds(selectedTableItemIds.filter(id => !setDisp.has(id)));
                      }
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    title="Pilih semua modul yang tampil di tabel ini"
                  />
                </th>
                <th className="px-3 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">Mata Pelajaran & Kelas</th>
                <th className="px-4 py-3">Tema Modul / Unit</th>
                <th className="px-4 py-3">Topik Sub-Tugas / Kisi-Kisi</th>
                <th className="px-4 py-3 w-48 text-center">Status Berkas PDF</th>
                <th className="px-4 py-3 w-48 text-center">Aksi Tautkan File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada modul silabus yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredList.slice(0, 100).map((item, idx) => {
                  const hasPdf = !!(item.fileUrl || item.FileUrl || item.pdfUrl || item.PdfUrl || item.linkMateri);
                  const pdfLink = item.fileUrl || item.FileUrl || item.pdfUrl || item.PdfUrl || item.linkMateri;
                  const itemId = item.id || item.no;
                  const isUploading = uploadingId === itemId;
                  const isChecked = selectedTableItemIds.includes(String(itemId));

                  return (
                    <tr key={itemId || idx} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const idStr = String(itemId);
                            if (e.target.checked) {
                              setSelectedTableItemIds(prev => [...prev, idStr]);
                            } else {
                              setSelectedTableItemIds(prev => prev.filter(x => x !== idStr));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                          title="Pilih modul ini untuk penautan 1 PDF ke banyak modul"
                        />
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {item.no || idx + 1}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">
                          {item.mataPelajaran || item.NamaMapel || item.mapel}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Kelas {String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim()}
                          </span>
                          <span>•</span>
                          <span>{item.jenjang || item.Jenjang || 'SD/MI'}</span>
                          {item.semester && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                {item.semester.startsWith('Semester') ? item.semester : `Sem ${item.semester}`}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 line-clamp-2">
                          {item.temaModul || item.judulModul || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-600 text-[11px] line-clamp-2">
                          {item.topikSubTugas || item.materiPokok || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {hasPdf ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                              <FileCheck size={12} className="text-emerald-600" />
                              <span>Tersedia di Drive</span>
                            </div>
                            {item.fileName && (
                              <div className="text-[10px] text-slate-500 max-w-[170px] truncate mx-auto" title={item.fileName}>
                                {item.fileName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                            <AlertCircle size={12} className="text-rose-500" />
                            <span>Belum Ada PDF</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasPdf ? (
                            <>
                              <a
                                href={pdfLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition border border-indigo-200/50"
                                title="Buka / Unduh Berkas PDF di Google Drive"
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                onClick={() => handleOpenLinkModal(item)}
                                className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition border border-sky-200/50"
                                title="Tautkan / Ganti Link Google Drive (Langsung buka folder PDF)"
                              >
                                <Link size={13} />
                              </button>
                              <button
                                onClick={() => handleTriggerUpload(item)}
                                disabled={isUploading}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition border border-amber-200/50"
                                title="Unggah Ulang File Pengganti"
                              >
                                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                              </button>
                              <button
                                onClick={() => handleRemovePdf(item)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition border border-rose-200/50"
                                title="Hapus Tautan PDF"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTriggerUpload(item)}
                                disabled={isUploading}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Upload berkas PDF dari komputer / HP"
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 size={11} className="animate-spin" />
                                    <span>Upload...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload size={11} />
                                    <span>Upload</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleOpenLinkModal(item)}
                                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                title="Tautkan Link Berkas Google Drive"
                              >
                                <Link size={11} className="text-sky-600" />
                                <span>Tautkan Link Google Drive</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredList.length > 100 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
            Menampilkan 100 dari {filteredList.length} modul silabus. Gunakan kolom pencarian / filter kelas untuk mempersempit tampilan.
          </div>
        )}
      </div>

      {/* Floating Quick Action Bar saat modul dicentang di tabel utama */}
      {selectedTableItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold whitespace-nowrap">{selectedTableItemIds.length} Modul Terpilih</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setBulkLinkUrl('');
              setBulkLinkFileName('');
              setBulkSelectedDriveFile(null);
              setBulkUploadFile(null);
              setShowBulkLinkModal(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Link2 size={13} />
            <span>📎 Tautkan 1 PDF ke Semua Terpilih</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const itemsToRemove = silabusList.filter(s => selectedTableItemIds.includes(String(s.id || s.no)));
              handleBulkRemovePdf(itemsToRemove);
            }}
            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Hapus Tautan ({selectedTableItemIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTableItemIds([])}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            Batal Pilih
          </button>
        </div>
      )}

      {/* Modal: Tautkan 1 Berkas PDF ke Banyak Modul Silabus Terpilih (Deprecated duplicate, replaced by MODAL 1 below) */}
      {false && showBulkLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-indigo-100 text-indigo-700">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tautkan 1 Berkas PDF ke Banyak Modul ({selectedTableItemIds.length} Modul)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Satu berkas PDF yang sama akan ditautkan ke seluruh modul yang telah Anda centang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkLinkModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Preview Modul-Modul yang Dipilih */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">Target Modul Silabus ({selectedTableItemIds.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTableItemIds([])}
                    className="text-rose-600 hover:underline"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                  {silabusList
                    .filter(s => selectedTableItemIds.includes(String(s.id || s.no)))
                    .map((s, idx) => (
                      <span
                        key={s.id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-medium"
                      >
                        <span className="font-bold text-indigo-700">{s.mataPelajaran || s.NamaMapel}</span>
                        <span className="text-slate-400">Kls {String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim()}</span>
                        <span className="text-slate-400">#{s.no || 1}</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Pilihan Sumber File PDF */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Pilih Sumber Berkas PDF:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('URL')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'URL'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Link2 size={16} />
                    <span className="text-[11px]">Tempel Link Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('DRIVE')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'DRIVE'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Folder size={16} />
                    <span className="text-[11px]">Hasil Scan Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('UPLOAD')}
                    className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'UPLOAD'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Upload size={16} />
                    <span className="text-[11px]">Upload Berkas PDF</span>
                  </button>
                </div>
              </div>

              {/* Form Tab 1: Tempel Link Google Drive */}
              {bulkLinkSourceType === 'URL' && (
                <div className="space-y-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Link / URL Berkas Google Drive:
                    </label>
                    <div className="relative">
                      <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={bulkLinkUrl}
                        onChange={(e) => setBulkLinkUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Berkas / Judul Buku (Opsional):
                    </label>
                    <input
                      type="text"
                      value={bulkLinkFileName}
                      onChange={(e) => setBulkLinkFileName(e.target.value)}
                      placeholder="Contoh: Buku_Tematik_Terpadu_Kelas_7_Semester_1.pdf"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Form Tab 2: Pilih dari Hasil Scan Drive */}
              {bulkLinkSourceType === 'DRIVE' && (
                <div className="space-y-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">Pilih salah satu file PDF dari Drive:</span>
                    {driveFiles.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleScanDriveFolder(true)}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Pindai Folder Drive Sekarang
                      </button>
                    )}
                  </div>
                  {driveFiles.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                      Belum ada berkas Google Drive yang dipindai. Silakan klik tombol "Pindai Folder Drive" di atas atau gunakan tab "Tempel Link Drive".
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                      {driveFiles.map((file, fileIdx) => {
                        const isSelected = bulkSelectedDriveFile?.id === file.id;
                        return (
                          <div
                            key={`bulk-file-${file.id}-${fileIdx}`}
                            onClick={() => {
                              setBulkSelectedDriveFile(file);
                              if (!bulkLinkFileName) setBulkLinkFileName(getStandardBulkFileName());
                            }}
                            className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                              isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <FileText size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Terpilih ✓' : 'Pilih'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Form Tab 3: Upload Berkas PDF Baru */}
              {bulkLinkSourceType === 'UPLOAD' && (
                <div className="space-y-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pilih Berkas PDF dari Komputer / HP:
                  </label>
                  <div className="p-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-white text-center hover:bg-slate-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBulkUploadFile(e.target.files[0]);
                          if (!bulkLinkFileName) setBulkLinkFileName(e.target.files[0].name);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={20} className="mx-auto text-indigo-500 mb-1" />
                    {bulkUploadFile ? (
                      <div className="text-xs">
                        <p className="font-bold text-indigo-900">{bulkUploadFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(bulkUploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        <span className="font-bold text-indigo-600">Klik untuk pilih file PDF</span> atau tarik file ke sini
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Eksekusi Bawah */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={isProcessingBulkLink}
                onClick={() => setShowBulkLinkModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessingBulkLink || selectedTableItemIds.length === 0}
                onClick={handleExecuteBulkLink}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {isProcessingBulkLink ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses Multi-Tautan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>⚡ Tautkan 1 PDF ke {selectedTableItemIds.length} Modul Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tautkan Link Berkas Modul (Google Drive / URL) */}
      {showLinkModal && linkModalItem && (() => {
        const targetKelas = String(linkModalItem.kelas || linkModalItem.Kelas || '').replace(/[A-Za-z]/g, '').trim();

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-sky-600 text-white shadow-xs">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                      <span>Tautkan Link Berkas Modul</span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
                        Google Drive / URL
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Salin dan tempelkan tautan link Google Drive atau URL berkas materi pembelajaran
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLinkModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer text-sm font-bold"
                  title="Tutup dialog"
                >
                  ✕
                </button>
              </div>

              {/* Rincian Target Materi Silabus */}
              <div className="bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-purple-50/60 border border-sky-100 rounded-2xl p-3 shrink-0">
                <div className="text-[10px] uppercase font-bold text-sky-800 tracking-wider mb-1">
                  Materi Target Silabus
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {linkModalItem.topikSubTugas || linkModalItem.temaModul || linkModalItem.judulSubModul || 'Materi'}
                </div>
                <div className="text-xs text-slate-600 font-semibold flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono font-bold text-[11px]">
                    {linkModalItem.kodeSubTugas || '-'}
                  </span>
                  <span>•</span>
                  <span className="text-slate-800 font-bold">{linkModalItem.mataPelajaran || linkModalItem.NamaMapel}</span>
                  <span>•</span>
                  <span className="text-slate-800">Kelas {linkModalItem.kelas}</span>
                  {linkModalItem.semester && (
                    <>
                      <span>•</span>
                      <span>{linkModalItem.semester}</span>
                    </>
                  )}
                  {linkModalItem.modul && (
                    <>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Modul {linkModalItem.modul}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Form Input Tautan Berkas Google Drive / URL */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      URL / Tautan Berkas Google Drive <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={linkInputUrl}
                      onChange={(e) => handleUrlInputChange(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Salin link berkas dari Google Drive. Pastikan akses berkas diatur ke: <strong>"Siapa saja yang memiliki link"</strong> (Viewer).
                    </p>

                    {isCheckingDriveLive && (
                      <div className="flex items-center gap-2 text-[11px] text-sky-700 bg-sky-50 px-3 py-2 rounded-xl border border-sky-200 mt-2">
                        <Loader2 size={13} className="animate-spin text-sky-600 shrink-0" />
                        <span>Memeriksa nama file aktual langsung dari Google Drive...</span>
                      </div>
                    )}

                    {driveLiveDetails && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Nama File di Google Drive Saat Ini:</p>
                            <p className="font-mono text-xs font-bold text-slate-800 break-all">{driveLiveDetails.name}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLinkInputFileName(driveLiveDetails.name);
                            setFileNameAutoSource('CATALOG_MATCH');
                          }}
                          className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold transition cursor-pointer self-end sm:self-center shrink-0"
                        >
                          Gunakan Nama Asli
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 block">
                        Nama Berkas Materi
                      </label>
                      {fileNameAutoSource && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          fileNameAutoSource === 'CATALOG_MATCH' ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' :
                          fileNameAutoSource === 'URL_FILENAME' ? 'text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200' : 'text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200'
                        }`}>
                          <Sparkles size={11} />
                          {fileNameAutoSource === 'CATALOG_MATCH' && 'Nama Otomatis Terdeteksi dari Google Drive'}
                          {fileNameAutoSource === 'URL_FILENAME' && 'Nama Otomatis Diekstrak dari URL'}
                          {fileNameAutoSource === 'SILABUS_STANDARD' && 'Format Standar Kurikulum'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={linkInputFileName}
                      onChange={(e) => {
                        setLinkInputFileName(e.target.value);
                        setFileNameAutoSource(null);
                      }}
                      placeholder="Contoh: K13-MTK4-01-Operasi Hitung Pecahan.pdf"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />

                    {/* Tombol Aksi Langsung Ubah di Google Drive */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isRenamingOnDrive || !extractGoogleDriveFileId(linkInputUrl)}
                        onClick={handleDirectRenameOnDrive}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          extractGoogleDriveFileId(linkInputUrl)
                            ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="Ubah judul berkas fisik di Google Drive Anda secara nyata melalui DriveApp"
                      >
                        {isRenamingOnDrive ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Mengubah di Google Drive...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>⚡ Ganti Nama File Asli di Google Drive Sekarang</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const { fileName, source } = deriveFileNameFromUrlAndItem('', linkModalItem, driveFiles);
                          setLinkInputFileName(fileName);
                          setFileNameAutoSource(source);
                        }}
                        className="text-sky-600 hover:text-sky-800 font-bold hover:underline flex items-center gap-1 shrink-0 text-[11px] cursor-pointer"
                      >
                        <RefreshCw size={10} /> Format Standar Silabus
                      </button>
                    </div>

                    {extractGoogleDriveFileId(linkInputUrl) && (
                      <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl mt-2">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={renamePhysicalFileOnDrive}
                            onChange={(e) => setRenamePhysicalFileOnDrive(e.target.checked)}
                            className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                              <span>Ubah nama berkas fisik di Google Drive saat tombol "Simpan & Tautkan" diklik</span>
                              <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded-full">Default Aktif</span>
                            </span>
                            <span className="text-[10px] text-sky-700 block mt-0.5">
                              Nama file fisik di Google Drive Anda akan langsung berganti sesuai nama di atas via DriveApp.setName().
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkApplyToAllInScope}
                        onChange={(e) => setLinkApplyToAllInScope(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-indigo-950">
                        Tautkan 1 PDF ini ke SEMUA modul {linkModalItem.mataPelajaran || linkModalItem.NamaMapel} Kelas {targetKelas}
                      </span>
                    </label>
                    <p className="text-[10px] text-indigo-700 pl-6">
                      Cocok jika berkas PDF ini adalah buku paket/modul lengkap 1 semester yang memuat seluruh modul silabus pelajaran ini.
                    </p>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900 leading-relaxed">
                    💡 <strong>Tips Cepat:</strong> Buka file PDF di Google Drive &gt; klik menu titik tiga atau <strong>Bagikan</strong> &gt; klik <strong>Salin link</strong> &gt; tempelkan di kotak di atas.
                  </div>
                </div>

              {/* Footer Tombol Modal */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!linkInputUrl.trim()}
                    onClick={handleSaveDriveLink}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Check size={14} />
                    <span>Simpan & Tautkan ke Silabus</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal: Pustaka Berkas Google Drive & Auto-Match Cerdas */}
      {showDriveScanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-4 sm:p-6 space-y-3.5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Pindai Folder Drive & Pencocokan Cerdas</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {driveFiles.length} Berkas Drive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>Folder Aktif: <strong>{scanFolderInfo?.folderName || '11_MATERI_DAN_MODUL_DIGITAL'}</strong></span>
                    {scanFolderInfo?.folderId && (
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                        ID: {scanFolderInfo.folderId}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDriveScanModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs (Segmented Control) */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setScanModalTab('MATCH_PREVIEW')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanModalTab === 'MATCH_PREVIEW'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={14} className={scanModalTab === 'MATCH_PREVIEW' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>1. Pratinjau Kecocokan Cerdas</span>
                {candidateStats.high > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    {candidateStats.high} Siap
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setScanModalTab('ALL_FILES')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanModalTab === 'ALL_FILES'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Folder size={14} className={scanModalTab === 'ALL_FILES' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>2. Semua Berkas ({filteredDriveFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setScanModalTab('CUSTOM_FOLDER')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanModalTab === 'CUSTOM_FOLDER'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings size={14} className={scanModalTab === 'CUSTOM_FOLDER' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>3. Ganti Folder Drive</span>
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* Apps Script Update Notice Banner */}
              {gasNeedsUpdate && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
                  <div className="flex items-start gap-2.5">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Pembaruan Kode Google Apps Script Diperlukan untuk Pemindaian Langsung</p>
                      <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                        Web App GAS Anda belum diperbarui dengan aksi pemindaian folder. Sistem telah memuat <strong>{driveFiles.length} berkas modul digital resmi kurikulum</strong> agar Anda dapat langsung melakukan pencocokan tanpa hambatan.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={handleShowGasUpdateGuide}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-xl font-medium text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <HelpCircle size={12} className="text-amber-700" />
                      <span>Panduan Update</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyGasCode}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Copy size={12} />
                      <span>Salin Code.gs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScanDriveFolder(true)}
                      disabled={isScanningDrive}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <RefreshCw size={12} className={isScanningDrive ? 'animate-spin' : ''} />
                      <span>Pindai Ulang</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning status banner */}
              {isScanningDrive && (
                <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 animate-pulse shrink-0">
                  <div className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin text-blue-600 shrink-0" />
                    <span>Memindai berkas dari Google Drive... Mohon tunggu sejenak.</span>
                  </div>
                  <button
                    onClick={() => setIsScanningDrive(false)}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Lewati
                  </button>
                </div>
              )}

              {/* Empty files fallback */}
              {driveFiles.length === 0 && !isScanningDrive ? (
                <div className="py-12 text-center space-y-3 text-slate-400">
                  <Folder size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">Belum ada berkas di pustaka modul ini.</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Anda dapat memuat otomatis 351 berkas modul resmi kurikulum master, atau memindai langsung dari Google Drive.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadCurriculumCatalog}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                    >
                      <BookOpen size={14} />
                      <span>Muat 351 Berkas Modul Resmi</span>
                    </button>
                    <a
                      href={scanFolderInfo?.folderUrl || GOOGLE_DRIVE_MODUL_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      <span>Buka & Upload di Drive</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ) : scanModalTab === 'MATCH_PREVIEW' ? (
                /* TAB 1: PRATINJAU KECOCOKAN CERDAS */
                <div className="space-y-3">
                  {/* Control Panel: Scope & Filters */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 border border-slate-700 shadow-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-400" />
                          <p className="text-xs font-bold text-white">
                            Evaluasi Kecocokan Multikriteria (Kelas, Mapel, Modul & Tema)
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Sistem menganalisis teks nama file dan jalur folder secara cerdas dengan pembobotan skor (0-100%).
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg text-[11px] font-bold">
                          {candidateStats.high} Sangat Cocok
                        </span>
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg text-[11px] font-bold">
                          {candidateStats.medium} Cukup Cocok
                        </span>
                      </div>
                    </div>

                    {/* Filter Lingkup Target: Kelas & Mapel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          1. Filter Khusus Kelas
                        </label>
                        <select
                          value={matchScopeKelas}
                          onChange={(e) => setMatchScopeKelas(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          <option value="ALL">Semua Kelas (SD, SMP, SMA)</option>
                          <optgroup label="SD / Paket A">
                            <option value="4">Kelas 4 (SD / Paket A)</option>
                            <option value="5">Kelas 5 (SD / Paket A)</option>
                            <option value="6">Kelas 6 (SD / Paket A)</option>
                          </optgroup>
                          <optgroup label="SMP / Paket B">
                            <option value="7">Kelas 7 (SMP / Paket B)</option>
                            <option value="8">Kelas 8 (SMP / Paket B)</option>
                            <option value="9">Kelas 9 (SMP / Paket B)</option>
                          </optgroup>
                          <optgroup label="SMA / SMK / Paket C">
                            <option value="10">Kelas 10 (SMA / Paket C)</option>
                            <option value="11">Kelas 11 (SMA / Paket C)</option>
                            <option value="12">Kelas 12 (SMA / Paket C)</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          2. Filter Khusus Mata Pelajaran
                        </label>
                        <select
                          value={matchScopeMapel}
                          onChange={(e) => setMatchScopeMapel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          <option value="ALL">Semua Mata Pelajaran</option>
                          {distinctMapel.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Class Shortcut Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400">Pilih Cepat:</span>
                      {['ALL', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setMatchScopeKelas(k)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            matchScopeKelas === k
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {k === 'ALL' ? 'Semua' : `Kls ${k}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kolom Pencarian Cepat & Filter Status */}
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
                    {/* Input Pencarian Utama */}
                    <div className="relative w-full">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                      <input
                        type="text"
                        value={smartMatchSearch}
                        onChange={(e) => setSmartMatchSearch(e.target.value)}
                        placeholder="🔍 Ketik judul tugas, nama modul, mapel, nomor modul, atau nama file PDF (contoh: IPA, Kls 7, Modul 1)..."
                        className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
                      />
                      {smartMatchSearch && (
                        <button
                          type="button"
                          onClick={() => setSmartMatchSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition"
                        >
                          ✕ Hapus
                        </button>
                      )}
                    </div>

                    {/* Filter Kategori Kecocokan & Indikator Hasil Pencarian */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                        <button
                          type="button"
                          onClick={() => setMatchScoreFilter('ALL')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            matchScoreFilter === 'ALL'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Semua ({candidateStats.total})
                        </button>

                        <button
                          type="button"
                          onClick={() => setMatchScoreFilter('HIGH')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            matchScoreFilter === 'HIGH'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <span>🟢 Sangat Cocok (Presisi)</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                            {candidateStats.high}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMatchScoreFilter('MEDIUM')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            matchScoreFilter === 'MEDIUM'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          <span>🟡 Cukup Cocok (Perlu Cek)</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                            {candidateStats.medium}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMatchScoreFilter('UNMATCHED')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            matchScoreFilter === 'UNMATCHED'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Belum Pas ({candidateStats.unmatched})
                        </button>
                      </div>

                      {smartMatchSearch.trim() && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle size={12} className="text-emerald-600" />
                          <span>Ditemukan {filteredSmartCandidates.length} dari {candidateStats.total} berkas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch Selection Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllCandidates}
                        className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Pilih Semua ({candidateStats.total - candidateStats.unmatched})
                      </button>
                      <button
                        type="button"
                        onClick={selectHighCandidates}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-xs"
                      >
                        Pilih Skor Tinggi ({candidateStats.high})
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllCandidates}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplySelectedSmartMatches(false)}
                        disabled={candidateStats.selected === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={14} />
                        <span>⚡ Terapkan ({candidateStats.selected}) Penautan Terpilih</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Smart Match Candidates */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredSmartCandidates.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Tidak ada berkas yang sesuai dengan filter skor atau pencarian saat ini.
                      </div>
                    ) : (
                      filteredSmartCandidates.map((cand, idx) => {
                        const file = cand.file;
                        const target = cand.targetItem;
                        const isHigh = cand.confidence === 'HIGH';
                        const isMed = cand.confidence === 'MEDIUM';

                        return (
                          <div 
                            key={`smart-cand-${file.id || idx}-${idx}`}
                            className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                              cand.selected 
                                ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300/40' 
                                : isHigh 
                                ? 'bg-white border-slate-200 hover:border-emerald-200' 
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            {/* Checkbox & Drive File Info */}
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={cand.selected}
                                disabled={!target}
                                onChange={() => toggleCandidateSelect(file.id)}
                                className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                              />

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    isHigh 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                      : isMed 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                      : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {cand.score}% {isHigh ? 'Sangat Cocok' : isMed ? 'Cukup Cocok' : 'Rendah'}
                                  </span>

                                  <p className="font-bold text-slate-900 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                  {file.path ? (
                                    <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 truncate max-w-xs" title={file.path}>
                                      📁 {file.path}
                                    </span>
                                  ) : file.folderName ? (
                                    <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                      📁 {file.folderName}
                                    </span>
                                  ) : null}
                                  <span>{file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Berkas PDF'}</span>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline"
                                    title="Pratinjau di Google Drive"
                                  >
                                    <span>Buka Drive</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="hidden sm:flex items-center justify-center text-slate-300 px-1 shrink-0">
                              ➔
                            </div>

                            {/* Matched Silabus Item Target */}
                            <div className="w-full sm:w-80 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 shrink-0">
                              {target ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">
                                      Kelas {target.kelas || target.Kelas}
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                      {target.mataPelajaran || target.NamaMapel}
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                      Modul {target.no || target.noModul || 1}
                                    </span>
                                  </div>

                                  <p className="text-[11px] font-bold text-slate-800 truncate mt-1" title={target.temaModul || target.topikSubTugas}>
                                    {target.temaModul || target.topikSubTugas || target.materiPokok || 'Materi Silabus'}
                                  </p>

                                  {/* Reason Chips */}
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    {cand.reasons.map((r, ri) => {
                                      const isWarn = r.includes('⚠️') || r.includes('Perhatian');
                                      const isPenalty = r.includes('Beda No Modul') || r.includes('(-50)');
                                      const isGeneral = r.includes('Berkas Umum');
                                      return (
                                        <span 
                                          key={ri} 
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                            isWarn
                                              ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                                              : isPenalty
                                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                              : isGeneral
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : 'bg-white text-slate-600 border-slate-200'
                                          }`}
                                        >
                                          {isWarn ? r : `✓ ${r}`}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {/* Quick Target Override Dropdown & Search Button */}
                                  <div className="pt-1.5 flex items-center gap-1.5">
                                    <select
                                      value={String(target.id || target.no)}
                                      onChange={(e) => changeCandidateTarget(file.id, e.target.value)}
                                      className="flex-1 min-w-0 text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
                                    >
                                      <option value={String(target.id || target.no)}>
                                        ✓ Modul {target.no || target.noModul} ({target.mataPelajaran || target.NamaMapel} Kls {target.kelas || target.Kelas})
                                      </option>
                                      {silabusList
                                        .filter(s => String(s.id || s.no) !== String(target.id || target.no))
                                        .slice(0, 30)
                                        .map(s => (
                                          <option key={s.id || s.no} value={String(s.id || s.no)}>
                                            Ganti ke: Kls {s.kelas || s.Kelas} - {s.mataPelajaran || s.NamaMapel} (Modul {s.no || 1})
                                          </option>
                                        ))
                                      }
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigningDriveFile(file);
                                        setAssignSearchQuery(target.mataPelajaran || target.NamaMapel || '');
                                      }}
                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                                      title="Buka kolom pencarian modul interaktif lengkap"
                                    >
                                      <Search size={11} />
                                      <span>Cari Modul</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 space-y-1.5">
                                  <p className="text-[11px] text-amber-700 font-semibold">
                                    Belum menemukan modul silabus yang pas secara otomatis.
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigningDriveFile(file);
                                        setAssignSearchQuery('');
                                      }}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <Search size={12} />
                                      <span>🔍 Cari & Pasangkan Modul</span>
                                    </button>
                                  </div>
                                  <div className="pt-0.5">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (e.target.value) changeCandidateTarget(file.id, e.target.value);
                                      }}
                                      className="w-full text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
                                    >
                                      <option value="" disabled>-- Atau pilih langsung dari daftar modul --</option>
                                      {silabusList.slice(0, 50).map(s => (
                                        <option key={s.id || s.no} value={String(s.id || s.no)}>
                                          Kls {s.kelas || s.Kelas} - {s.mataPelajaran || s.NamaMapel} (Modul {s.no || 1}): {s.temaModul || s.materiPokok || ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : scanModalTab === 'ALL_FILES' ? (
                /* TAB 2: SEMUA BERKAS DRIVE */
                <div className="space-y-3">
                  {/* Search and Manual Add Toolbar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={driveFileSearch}
                        onChange={(e) => setDriveFileSearch(e.target.value)}
                        placeholder="🔍 Cari nama berkas PDF, nama mapel, atau kelas..."
                        className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {driveFileSearch && (
                        <button
                          type="button"
                          onClick={() => setDriveFileSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer transition"
                        >
                          ✕ Hapus
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualAddFile(!showManualAddFile)}
                      className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                        showManualAddFile 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{showManualAddFile ? '✕ Batal' : '➕ Tambah Manual'}</span>
                    </button>
                  </div>

                  {/* Inline Manual Add File Form */}
                  {showManualAddFile && (
                    <form onSubmit={handleManualAddDriveFile} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                      <p className="text-xs font-bold text-slate-800">Tambah Berkas / Link Drive Secara Manual</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={manualFileName}
                          onChange={(e) => setManualFileName(e.target.value)}
                          placeholder="Nama Berkas (contoh: Modul 1 Matematika Kelas 4.pdf)"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <input
                          type="text"
                          value={manualFileUrl}
                          onChange={(e) => setManualFileUrl(e.target.value)}
                          placeholder="Tautan Google Drive (https://drive.google.com/...)"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowManualAddFile(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Simpan ke Pustaka
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Files List */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                    {filteredDriveFiles.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Tidak ada berkas yang sesuai dengan kata kunci pencarian.
                      </div>
                    ) : (
                      filteredDriveFiles.map((f, i) => (
                        <div key={`drive-file-${f.id || i}-${i}`} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <FileText size={16} className="text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-slate-800 truncate">{f.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                {f.path ? (
                                  <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 truncate max-w-xs" title={f.path}>
                                    📁 {f.path}
                                  </span>
                                ) : f.folderName ? (
                                  <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                    📁 {f.folderName}
                                  </span>
                                ) : null}
                                <span>{f.size ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setAssigningDriveFile(f);
                                setAssignSearchQuery('');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Pilihkan modul silabus untuk file ini"
                            >
                              <Link2 size={12} />
                              <span>Pilihkan Modul</span>
                            </button>

                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="Buka Berkas di Drive"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 3: GANTI FOLDER GOOGLE DRIVE */
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Ganti / Arahkan Folder Google Drive</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Anda dapat memasukkan tautan lengkap folder Google Drive atau ID Folder spesifik yang berisi modul kurikulum Anda.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Tautan Lengkap / Folder ID Google Drive:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customFolderInput}
                        onChange={(e) => setCustomFolderInput(e.target.value)}
                        placeholder="Contoh: https://drive.google.com/drive/folders/1w7P2WbEa7w... atau 1w7P2WbEa7w..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleScanDriveFolder(true, customFolderInput)}
                        disabled={isScanningDrive || !customFolderInput.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        {isScanningDrive ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        <span>Pindai Folder Ini</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-slate-800">Folder Default Terdaftar:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomFolderInput(GOOGLE_DRIVE_MODUL_FOLDER_ID);
                          handleScanDriveFolder(true, GOOGLE_DRIVE_MODUL_FOLDER_ID);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <span>📁 11_MATERI_DAN_MODUL_DIGITAL</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                    <p className="font-bold">Tips Penataan Folder Google Drive:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                      <li>Pastikan izin folder Google Drive diatur ke <strong>"Siapa saja yang memiliki link (Pelihat / Viewer)"</strong> agar dapat diakses tanpa hambatan login.</li>
                      <li>Penamaan file yang ideal mencantumkan nomor modul, mapel, dan kelas (contoh: <code>Modul 1 Matematika Kelas 7.pdf</code>).</li>
                      <li>Folder sub-kelas seperti <code>Kelas 7 / Matematika</code> juga akan dipindai secara otomatis.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScanDriveFolder(true)}
                  disabled={isScanningDrive}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Pindai ulang folder Google Drive secara langsung"
                >
                  <RefreshCw size={12} className={isScanningDrive ? 'animate-spin' : ''} />
                  <span>Pindai Ulang Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadCurriculumCatalog}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Muat ulang 351 berkas modul kurikulum resmi"
                >
                  <BookOpen size={12} />
                  <span>Muat Katalog Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Salin kode Google Apps Script terbaru (Code.gs) ke clipboard"
                >
                  <Copy size={12} />
                  <span>Salin Code.gs</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDriveScanModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pasangkan File Drive ke Modul Silabus Pilihan (Bisa 1 Modul atau Banyak Sekaligus) */}
      {assigningDriveFile && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold mb-1">
                  <Sparkles size={11} />
                  <span>Hubungkan 1 File Drive ke Silabus (1 atau Banyak Modul)</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-md" title={assigningDriveFile.name}>
                  {assigningDriveFile.name}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setAssigningDriveFile(null);
                  setAssignMultiSelectedIds([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  type="text"
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  placeholder="🔍 Cari mapel, kelas, nomor modul, atau materi (contoh: MTK, Kls 7, Modul 2, IPA)..."
                  className="w-full pl-9 pr-16 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  autoFocus
                />
                {assignSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAssignSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer transition"
                  >
                    ✕ Hapus
                  </button>
                )}
              </div>

              {/* Quick Multi-select helpers */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500 font-medium">
                  {assignMultiSelectedIds.length > 0 ? (
                    <strong className="text-indigo-600 font-bold">{assignMultiSelectedIds.length} modul dicentang</strong>
                  ) : (
                    'Centang kotak untuk menautkan ke lebih dari 1 modul'
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const visibleItems = silabusList
                        .filter(item => {
                          if (!assignSearchQuery.trim()) return true;
                          const q = assignSearchQuery.toLowerCase().trim();
                          const m = (item.mataPelajaran || item.NamaMapel || '').toLowerCase();
                          const k = String(item.kelas || item.Kelas || '').toLowerCase();
                          const t = (item.temaModul || item.topikSubTugas || item.materiPokok || '').toLowerCase();
                          const no = String(item.no || item.noModul || '');
                          const kd = (item.kodeSubTugas || item.kodePaket || '').toLowerCase();
                          return m.includes(q) || 
                                 k === q || 
                                 `kls ${k}`.includes(q) || 
                                 `kelas ${k}`.includes(q) || 
                                 t.includes(q) || 
                                 no === q || 
                                 `modul ${no}`.includes(q) || 
                                 `bab ${no}`.includes(q) || 
                                 kd.includes(q);
                        })
                        .slice(0, 100);
                      const allIds = visibleItems.map(i => String(i.id || i.no));
                      setAssignMultiSelectedIds(Array.from(new Set([...assignMultiSelectedIds, ...allIds])));
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Pilih Semua Tampil
                  </button>
                  {assignMultiSelectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAssignMultiSelectedIds([])}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 max-h-72 divide-y divide-slate-50">
              {silabusList
                .filter(item => {
                  if (!assignSearchQuery.trim()) return true;
                  const q = assignSearchQuery.toLowerCase().trim();
                  const m = (item.mataPelajaran || item.NamaMapel || '').toLowerCase();
                  const k = String(item.kelas || item.Kelas || '').toLowerCase();
                  const t = (item.temaModul || item.topikSubTugas || item.materiPokok || '').toLowerCase();
                  const no = String(item.no || item.noModul || '');
                  const kd = (item.kodeSubTugas || item.kodePaket || '').toLowerCase();
                  return m.includes(q) || 
                         k === q || 
                         `kls ${k}`.includes(q) || 
                         `kelas ${k}`.includes(q) || 
                         t.includes(q) || 
                         no === q || 
                         `modul ${no}`.includes(q) || 
                         `bab ${no}`.includes(q) || 
                         kd.includes(q);
                })
                .slice(0, 100)
                .map((item, idx) => {
                  const hasPdf = !!(item.fileUrl || item.FileUrl || item.pdfUrl);
                  const idStr = String(item.id || item.no);
                  const isChecked = assignMultiSelectedIds.includes(idStr);

                  return (
                    <div key={item.id || idx} className={`pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl transition ${isChecked ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignMultiSelectedIds(prev => [...prev, idStr]);
                            } else {
                              setAssignMultiSelectedIds(prev => prev.filter(x => x !== idStr));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                          title="Centang untuk penautan multi-modul"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {item.mataPelajaran || item.NamaMapel}
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                              Kelas {String(item.kelas || item.Kelas || '').replace(/[A-Za-z]/g, '').trim()}
                            </span>
                            <span className="text-[10px] text-slate-400">Modul {item.no || 1}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.temaModul || item.topikSubTugas || '-'}
                          </p>
                          {hasPdf && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                              • Sudah ada berkas (akan diganti)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          linkFileToSilabus(item, assigningDriveFile.url, assigningDriveFile.name);
                          setAssigningDriveFile(null);
                          setAssignMultiSelectedIds([]);
                          showToast(`✓ Berhasil menautkan "${assigningDriveFile.name}" ke ${item.mataPelajaran || item.NamaMapel} Kelas ${item.kelas || ''}!`);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer"
                        title="Tautkan berkas ke satu modul ini saja"
                      >
                        Pilih 1 Ini
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Aksi Multi-Modul Jika Ada yang Dicentang */}
            {assignMultiSelectedIds.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    ⚡ Tautkan 1 PDF Ini ke {assignMultiSelectedIds.length} Modul Terpilih
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    Satu berkas PDF akan langsung dipasangkan ke seluruh modul yang Anda centang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const count = linkFileToMultipleSilabus(assignMultiSelectedIds, assigningDriveFile.url, assigningDriveFile.name);
                    setAssigningDriveFile(null);
                    setAssignMultiSelectedIds([]);
                    Swal.fire({
                      icon: 'success',
                      title: 'Multi-Tautan Berhasil!',
                      html: `<p class="text-xs text-slate-600">Berkas <b>${assigningDriveFile.name}</b> berhasil ditautkan ke <b>${count} modul</b> silabus sekaligus.</p>`,
                      confirmButtonColor: '#059669'
                    });
                    showToast(`✓ Berhasil menautkan 1 PDF ke ${count} modul silabus!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
                >
                  Tautkan ke {assignMultiSelectedIds.length} Modul
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs">
              <span className="text-slate-500 text-[11px]">
                File otomatis dijadikan link acuan materi CBT K13.
              </span>
              <button
                onClick={() => {
                  setAssigningDriveFile(null);
                  setAssignMultiSelectedIds([]);
                }}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unggah Berkas PDF Materi K13 Sesuai Silabus */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-1">
                  <Upload size={12} />
                  <span>Unggah Berkas PDF Materi K13</span>
                </div>
                <h3 className="font-black text-slate-900 text-base">
                  Tautkan Berkas PDF ke Silabus
                </h3>
              </div>
              <button 
                onClick={() => {
                  if (isProcessingUpload) return;
                  setShowUploadModal(false);
                  setSelectedUploadFile(null);
                  setUploadModalTargetItem(null);
                }}
                disabled={isProcessingUpload}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Dropzone File */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  1. Pilih Berkas PDF Materi
                </label>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectUploadFile(file);
                  }}
                />
                
                {selectedUploadFile ? (
                  <div className="p-4 bg-emerald-50/60 border-2 border-dashed border-emerald-300 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                        <FileText size={22} />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-xs truncate">{selectedUploadFile.name}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB • Berkas PDF Siap Ditautkan
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessingUpload}
                      onClick={() => modalFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shrink-0 transition shadow-2xs cursor-pointer"
                    >
                      Ganti Berkas
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => modalFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                          handleSelectUploadFile(file);
                        } else {
                          Swal.fire({ icon: 'warning', title: 'Format Salah', text: 'Mohon pilih berkas berformat PDF.' });
                        }
                      }
                    }}
                    className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition group"
                  >
                    <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-xs group-hover:scale-105 transition mb-2">
                      <Upload size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik untuk memilih berkas PDF atau tarik & letakkan ke sini
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Mendukung berkas modul dan materi K13 (Maksimal 25MB)
                    </p>
                  </div>
                )}

                {autoMatchUploadInfo && (
                  <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <Sparkles size={14} className="text-indigo-600 shrink-0" />
                    <span>{autoMatchUploadInfo}</span>
                  </div>
                )}
              </div>

              {/* Target Silabus Item */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Tentukan Modul Silabus K13 Target
                  </label>
                  {uploadModalTargetItem && (
                    <button
                      type="button"
                      onClick={() => setUploadModalTargetItem(null)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Pilih Modul Lain
                    </button>
                  )}
                </div>

                {uploadModalTargetItem ? (
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {uploadModalTargetItem.mataPelajaran || uploadModalTargetItem.NamaMapel}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                          Kelas {String(uploadModalTargetItem.kelas || uploadModalTargetItem.Kelas || '').replace(/[A-Za-z]/g, '').trim()}
                        </span>
                        <span className="text-[11px] text-indigo-700 font-semibold">
                          Modul {uploadModalTargetItem.no || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 truncate">
                        {uploadModalTargetItem.temaModul || uploadModalTargetItem.topikSubTugas || uploadModalTargetItem.namaModulBab || '-'}
                      </p>
                    </div>
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0" title="Target Dipilih">
                      <Check size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={uploadTargetSearch}
                        onChange={(e) => setUploadTargetSearch(e.target.value)}
                        placeholder="Cari modul target (contoh: MTK 7, IPA 8, Agama)..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl bg-white border border-slate-200/80">
                      {silabusList
                        .filter(s => {
                          if (!uploadTargetSearch.trim()) return true;
                          const q = uploadTargetSearch.toLowerCase();
                          const m = (s.mataPelajaran || s.NamaMapel || '').toLowerCase();
                          const k = String(s.kelas || s.Kelas || '').toLowerCase();
                          const t = (s.temaModul || s.topikSubTugas || '').toLowerCase();
                          return m.includes(q) || k.includes(q) || t.includes(q);
                        })
                        .slice(0, 25)
                        .map((s, idx) => (
                          <div
                            key={s.id || idx}
                            onClick={() => setUploadModalTargetItem(s)}
                            className="p-2.5 hover:bg-indigo-50/50 flex items-center justify-between gap-2 cursor-pointer transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">{s.mataPelajaran || s.NamaMapel}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                                  Kls {String(s.kelas || s.Kelas || '').replace(/[A-Za-z]/g, '').trim()}
                                </span>
                                <span className="text-[10px] text-slate-400">Modul {s.no || 1}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {s.temaModul || s.topikSubTugas || '-'}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10px] font-bold rounded-lg transition shrink-0"
                            >
                              Pilih
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Opsi Terapkan 1 PDF ke Semua Modul Pelajaran Ini */}
              {uploadModalTargetItem && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1 animate-in fade-in">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadApplyToAllInScope}
                      onChange={(e) => setUploadApplyToAllInScope(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span className="text-xs font-bold text-indigo-950">
                      Tautkan 1 berkas PDF ini ke SEMUA modul {uploadModalTargetItem.mataPelajaran || uploadModalTargetItem.NamaMapel} Kelas {String(uploadModalTargetItem.kelas || uploadModalTargetItem.Kelas || '').replace(/[A-Za-z]/g, '').trim()}
                    </span>
                  </label>
                  <p className="text-[11px] text-indigo-700 pl-6.5 leading-relaxed">
                    Centang ini jika berkas yang Anda unggah adalah Buku Paket / Materi Tematik lengkap yang memuat seluruh modul silabus semester ini.
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={isProcessingUpload}
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedUploadFile(null);
                  setUploadModalTargetItem(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessingUpload || !selectedUploadFile || !uploadModalTargetItem}
                  onClick={() => handleExecuteUploadModal('APP_ONLY')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  title="Simpan berkas di penyimpanan aplikasi tanpa menunggu Google Drive"
                >
                  <span>Simpan di Aplikasi</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessingUpload || !selectedUploadFile || !uploadModalTargetItem}
                  onClick={() => handleExecuteUploadModal('DRIVE_AND_APP')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                  title="Unggah berkas ke folder Google Drive dan tautkan ke Silabus"
                >
                  {isProcessingUpload ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Mengunggah Berkas...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      <span>Unggah ke Drive & Tautkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Tautkan 1 Berkas PDF ke Banyak Judul Silabus Sekaligus */}
      {showBulkLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tautkan 1 PDF ke Banyak Judul Silabus</h3>
                  <p className="text-[11px] text-indigo-200">
                    Pasangkan satu berkas PDF materi (Buku Paket / Modul Lengkap) ke beberapa judul silabus sekaligus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkLinkModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Isi Modal */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs flex-1">
              {/* Bagian 1: Pemilihan / Pratinjau Judul Silabus Target */}
              <div className="space-y-2">
                {/* Banner Filter: Yang sudah ada PDF tidak ditampilkan */}
                <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-900 font-medium">
                  <FileCheck size={15} className="text-sky-600 shrink-0" />
                  <span>
                    <b>Filter Otomatis Aktif:</b> Modul yang sudah memiliki berkas PDF <b>tidak ditampilkan</b> agar tidak tertimpa. Hanya menampilkan <b>{filteredList.filter(s => !checkSilabusHasPdf(s)).length} modul</b> yang belum memiliki tautan PDF.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <BookOpen size={14} className="text-indigo-600" />
                    <span>Judul Silabus Target ({selectedTableItemIds.filter(id => {
                      const item = silabusList.find(s => String(s.id || s.no) === id);
                      return !checkSilabusHasPdf(item);
                    }).length} judul dipilih)</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const noPdfIds = filteredList.filter(s => !checkSilabusHasPdf(s)).map(s => String(s.id || s.no));
                        setSelectedTableItemIds(noPdfIds);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold transition cursor-pointer"
                    >
                      Pilih Semua Belum Ada PDF ({filteredList.filter(s => !checkSilabusHasPdf(s)).length})
                    </button>
                    {selectedTableItemIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTableItemIds([])}
                        className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {selectedTableItemIds.length === 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-950">
                      <AlertCircle size={14} className="text-amber-600" />
                      Belum ada judul silabus yang dicentang.
                    </p>
                    <p>Klik tombol <b>"Pilih Semua Belum Ada PDF"</b> di atas, atau centang judul silabus di bawah ini (yang sudah ada PDF otomatis disembunyikan):</p>
                    <div className="max-h-44 overflow-y-auto border border-amber-200 bg-white rounded-xl p-2 divide-y divide-slate-100">
                      {filteredList
                        .filter(item => !checkSilabusHasPdf(item))
                        .map(item => {
                          const id = String(item.id || item.no);
                          const isChecked = selectedTableItemIds.includes(id);
                          return (
                            <label key={id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-slate-50 cursor-pointer text-[11px]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedTableItemIds(prev => [...prev, id]);
                                  else setSelectedTableItemIds(prev => prev.filter(x => x !== id));
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-bold text-slate-800">Modul {item.no || 1}:</span>
                              <span className="text-slate-600 truncate flex-1">{item.mataPelajaran || item.NamaMapel} - {item.topikSubTugas || item.temaModul}</span>
                              <span className="text-[10px] text-slate-400">Kls {item.kelas || item.Kelas}</span>
                            </label>
                          );
                        })}
                      {filteredList.filter(item => !checkSilabusHasPdf(item)).length === 0 && (
                        <p className="text-xs text-emerald-700 p-4 text-center font-bold">
                          🎉 Seluruh modul silabus pada filter ini sudah memiliki berkas PDF! Tidak ada modul kosong tersisa.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto space-y-1">
                    {silabusList
                      .filter(s => selectedTableItemIds.includes(String(s.id || s.no)))
                      .filter(s => !checkSilabusHasPdf(s))
                      .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            {item.no || idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {item.mataPelajaran || item.NamaMapel} (Kls {item.kelas || item.Kelas})
                          </span>
                          <span className="text-slate-500 truncate">- {item.topikSubTugas || item.temaModul}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTableItemIds(prev => prev.filter(x => x !== String(item.id || item.no)))}
                          className="text-slate-400 hover:text-rose-600 text-[10px] ml-2 font-bold cursor-pointer"
                          title="Hapus dari daftar pilihan"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bagian 2: Pilih Sumber Berkas PDF */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 text-xs">Pilih Sumber Berkas PDF Materi:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('URL')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'URL'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Link2 size={16} />
                    <span>Tautan / URL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('DRIVE')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'DRIVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Folder size={16} />
                    <span>Google Drive ({driveFiles.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkLinkSourceType('UPLOAD')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                      bulkLinkSourceType === 'UPLOAD'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Upload size={16} />
                    <span>Unggah File</span>
                  </button>
                </div>
              </div>

              {/* Detail Sumber Terpilih */}
              {bulkLinkSourceType === 'URL' && (
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <label className="font-bold text-slate-700 text-[11px] block mb-1">
                      URL Berkas PDF / Link Google Drive:
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/.../view atau https://..."
                      value={bulkLinkUrl}
                      onChange={(e) => setBulkLinkUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {bulkLinkSourceType === 'DRIVE' && (
                <div className="space-y-2 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-[11px]">
                      Pilih 1 Berkas dari Google Drive:
                    </span>
                    {driveFiles.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleScanDriveFolder(true)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Pindai Drive Sekarang
                      </button>
                    )}
                  </div>

                  {driveFiles.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-emerald-200 text-center text-slate-500">
                      <Folder size={24} className="mx-auto text-emerald-400 mb-1" />
                      <p className="font-bold text-slate-700">Belum ada berkas hasil pemindaian Google Drive.</p>
                      <button
                        type="button"
                        onClick={() => handleScanDriveFolder(true)}
                        className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                      >
                        ⚡ Pindai Folder Drive Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {driveFiles.map((df) => {
                        const isSelected = bulkSelectedDriveFile?.id === df.id;
                        return (
                          <div
                            key={df.id}
                            onClick={() => {
                              setBulkSelectedDriveFile(df);
                              if (!bulkLinkFileName) setBulkLinkFileName(getStandardBulkFileName());
                            }}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700'
                            }`}
                          >
                            <div className="truncate flex-1 pr-2">
                              <p className="text-xs truncate">{df.name}</p>
                              {df.folderName && (
                                <p className="text-[10px] text-slate-400">📁 {df.folderName}</p>
                              )}
                            </div>
                            {isSelected ? (
                              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {bulkLinkSourceType === 'UPLOAD' && (
                <div className="space-y-3 p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl">
                  <label className="font-bold text-amber-950 text-[11px] block">
                    Pilih Berkas PDF dari Komputer / HP:
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setBulkUploadFile(f);
                        if (!bulkLinkFileName) setBulkLinkFileName(f.name);
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                  />
                  {bulkUploadFile && (
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle size={13} />
                      Berkas terpilih: {bulkUploadFile.name} ({(bulkUploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {/* Pengaturan Nama Berkas & Penyesuaian Nama di Google Drive */}
              <div className="space-y-2.5 p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-600" />
                    <span>Nama Berkas (kodeMapel-noModul-temaModul):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const std = getStandardBulkFileName();
                      setBulkLinkFileName(std);
                      showToast(`Format standar diterapkan: ${std}`);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Sparkles size={12} />
                    <span>⚡ Reset Format Otomatis</span>
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="Contoh: C12-BING-11-With My Pleasure.pdf"
                  value={bulkLinkFileName}
                  onChange={(e) => setBulkLinkFileName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-mono font-bold text-indigo-950"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={bulkRenamePhysicalDrive}
                      onChange={(e) => setBulkRenamePhysicalDrive(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Otomatis ganti nama file fisik di Google Drive</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Via Google Apps Script DriveApp
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowBulkLinkModal(false)}
                disabled={isProcessingBulkLink}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessingBulkLink || selectedTableItemIds.length === 0}
                onClick={handleExecuteBulkLink}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {isProcessingBulkLink ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menautkan Berkas...</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    <span>⚡ Terapkan Tautan ke ({selectedTableItemIds.length}) Judul</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
