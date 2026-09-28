import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileQuestion, Plus, Search, X, Eye, Edit, Trash2, 
  Save, AlertTriangle, CheckCircle2, HelpCircle, 
  Layers, Sparkles, BookOpen, ListOrdered, Check, RefreshCw,
  ExternalLink, Folder, UploadCloud, DownloadCloud, Loader2,
  Calendar, Filter, Tag, Clock, CheckSquare, Zap, Sliders, Play
} from 'lucide-react';
import SimulasiUjianTab from './SimulasiUjianTab';
import Swal from 'sweetalert2';
import { SmartBobotModal } from './SmartBobotModal';
import { 
  calculateSmartWeight, 
  generateSmartWeights, 
  getSmartWeightExplanation,
  STANDARD_BOBOT_PRESETS 
} from '../../utils/smartBobotHelper';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { DEFAULT_APP_CONFIG } from '../../data/config';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import { pullSpecificSheetFromGas } from '../../utils/gasSync';
import { getAllClasses, matchClass, formatClassLabel, STANDARD_CLASSES, CLASSES } from '../../lib/utils';
import { getMasterClassDropdown } from '../../utils/masterDropdowns';
import { linkBankSoalToSession } from '../../utils/soalScheduleIntegration';
import { 
  createBankSoalPackageFromSilabus, 
  isDummyQuestion,
  isDummyBankSoalPackage,
  purgeDummySoalAndPackages,
  parseBulkQuestions,
  MAIN_SUBJECTS,
  COMPREHENSIVE_SUBJECTS,
  type BankSoalPackage
} from '../../data/soalGenerator';
import { MASTER_SILABUS_DATA } from '../../data/masterSilabusData';
import { JENIS_UJIAN_LIST, getJenisUjianBadge } from '../../utils/cbtExamTypes';
import { 
  saveQuestionDirect, 
  saveBulkQuestionsDirect, 
  deleteQuestionDirect,
  saveBankPackageDirect,
  saveAllBankPackagesDirect,
  deleteBankPackageDirect
} from '../../services/cbtQuestionDirectService';

const SUBJECT_PEDAGOGICAL_THEMES: Record<string, { tema: string; topik: string }> = {
  'pendidikan agama islam': {
    tema: 'Modul Pendidikan Agama Islam & Budi Pekerti',
    topik: 'Akidah Akhlak, Nilai Keimanan & Karakter Toleransi'
  },
  'bahasa arab': {
    tema: 'Modul Pembelajaran Bahasa Arab Terapan',
    topik: 'Kaidah Nahwu Shorof, Mufradat & Percakapan Tematik'
  },
  'pjok': {
    tema: 'Modul Pendidikan Jasmani Olahraga & Kesehatan',
    topik: 'Kebugaran Jasmani, Gerak Atletik & Pola Hidup Sehat'
  },
  'seni budaya': {
    tema: 'Modul Pembelajaran Seni Budaya Nusantara',
    topik: 'Apresiasi Karya Seni Rupa, Musik Tradisi & Tari Kreasi'
  },
  'prakarya dan kewirausahaan': {
    tema: 'Modul Prakarya & Kewirausahaan Mandiri',
    topik: 'Kerajinan Bahan Alam, Rekayasa & Produk Olahan Lokal'
  },
  'informatika': {
    tema: 'Modul Pembelajaran Informatika & Literasi Digital',
    topik: 'Berpikir Komputasional, Algoritma & Keamanan Data Siber'
  },
  'bahasa indonesia': {
    tema: 'Modul Bahasa Indonesia Berbasis Literasi',
    topik: 'Pemahaman Teks Informasi, Argumentasi & Struktur Bahasa'
  },
  'matematika': {
    tema: 'Modul Pembelajaran Matematika Kontekstual',
    topik: 'Operasi Hitung, Aljabar, Geometri & Penalaran Statistik'
  },
  'ipa / ipas': {
    tema: 'Modul Eksplorasi Sains Alam & Lingkungan',
    topik: 'Metode Ilmiah, Rantai Makanan & Keseimbangan Ekosistem'
  },
  'ips': {
    tema: 'Modul Dinamika Sosial & Kesejahteraan Masyarakat',
    topik: 'Peta Wilayah, Interaksi Sosial & Aktivitas Ekonomi Kreatif'
  },
  'pendidikan pancasila': {
    tema: 'Modul Penguatan Karakter Profil Pelajar Pancasila',
    topik: 'Pengamalan Nilai Sila Pancasila, Norma Hukum & Gotong Royong'
  },
  'bahasa inggris': {
    tema: 'English Contextual Communication Module',
    topik: 'Reading Comprehension, Functional Text & Grammar Usage'
  },
  'sejarah indonesia': {
    tema: 'Modul Jejak Sejarah & Peradaban Nusantara',
    topik: 'Perjuangan Kemerdekaan, Tokoh Pahlawan & Nilai Patriotisme'
  },
  'geografi': {
    tema: 'Modul Eksplorasi Geografi & Fenomena Bumi',
    topik: 'Analisis Spasial, Litosfer & Mitigasi Bencana Alam'
  },
  'ekonomi': {
    tema: 'Modul Literasi Ekonomi & Manajemen Keuangan',
    topik: 'Hukum Permintaan Penawaran, Lembaga Keuangan & APBN'
  },
  'sosiologi': {
    tema: 'Modul Sosiologi Terapan & Harmoni Sosial',
    topik: 'Struktur Sosial, Diferensiasi Kelompok & Resolusi Konflik'
  },
  'biologi': {
    tema: 'Modul Eksplorasi Biologi Sel & Keanekaragaman',
    topik: 'Struktur Sel, Sistem Organ Manusia & Genetika Makhluk Hidup'
  },
  'fisika': {
    tema: 'Modul Konsep Fisika Alam & Penerapan Mekanika',
    topik: 'Besaran Satuan, Hukum Newton, Usaha & Transformasi Energi'
  },
  'kimia': {
    tema: 'Modul Senyawa Kimia & Reaksi Kontekstual',
    topik: 'Tabel Periodik Unsur, Ikatan Kimia & Stoikiometri Larutan'
  },
  'bahasa daerah / muatan lokal': {
    tema: 'Modul Muatan Lokal Bahasa & Budaya Daerah',
    topik: 'Undak Usuk Bahasa, Kesenian Daerah & Unggah Ungguh Budaya'
  }
};

export interface BankSoalItem {
  id: string;
  BankSoalID?: string;
  mapel: string;
  Mapel?: string;
  kelas: string;
  Kelas?: string;
  kurikulum: string;
  Kurikulum?: string;
  jumlahSoal: number;
  JumlahSoal?: number;
  tipeSoal: string; // "20 Pilihan Ganda (Auto-Grading)"
  TipeSoal?: string;
  guru: string;
  Guru?: string;
  kesulitan: string; // "Mudah (30%), Sedang (50%), Sukar (20%)"
  Kesulitan?: string;
  status: 'Siap Digunakan' | 'Draf' | 'Sedang Ditelaah';
  Status?: string;
  updatedAt: string;
  UpdatedAt?: string;
  silabusNo?: number;
  SilabusNo?: number;
  silabusId?: string;
  SilabusID?: string;
  topik?: string;
  Topik?: string;
  temaModul?: string;
  TemaModul?: string;
  topikSubTugas?: string;
  TopikSubTugas?: string;
  kodeSubTugas?: string;
  KodeSubTugas?: string;
  jenisUjian?: string;
  JenisUjian?: string;
  jenisAsesmen?: string;
  JenisAsesmen?: string;
  durasi?: number;
  Durasi?: number;
  durasiMenit?: number;
  DurasiMenit?: number;
  tipeUjian?: string;
  kategoriUjian?: string;
  jenis?: string;
  Jenis?: string;
  semester?: string;
  Semester?: string;
  jadwalId?: string;
  sesiId?: string;
  ujianId?: string;
  token?: string;
  soalList?: Array<{
    id: number;
    pertanyaan: string;
    tipe: 'Pilihan Ganda' | 'Esai' | 'PG Kompleks';
    opsi?: { a: string; b: string; c: string; d: string; e?: string };
    kunci: string;
    bobot: number;
    pembahasan?: string;
  }>;
  SoalJSON?: string;
}

export function normalizeBankSoal(rawList: any[]): BankSoalItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((b: any, idx: number) => {
    const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
    const mapel = b.mapel || b.Mapel || 'Mata Pelajaran';
    const rawKelas = String(b.kelas || b.Kelas || '4');
    const kelas = rawKelas.replace(/[A-Za-z]/g, '').trim() || '4';
    const kurikulum = b.kurikulum || b.Kurikulum || 'Kurikulum Merdeka';
    const guru = b.guru || b.Guru || 'Tim Guru';
    const kesulitan = b.kesulitan || b.Kesulitan || 'Sedang';
    const status = (b.status || b.Status || 'Siap Digunakan') as any;
    const updatedAt = b.updatedAt || b.UpdatedAt || new Date().toISOString().slice(0, 10);

    let soalList: any[] = [];
    if (Array.isArray(b.soalList)) {
      soalList = b.soalList;
    } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
      try {
        soalList = JSON.parse(b.SoalJSON);
      } catch {
        soalList = [];
      }
    }

    // Buang butir soal dummy dari paket & normalisasi kunci
    soalList = (soalList || []).filter(s => !isDummyQuestion(s)).map((s, sIdx) => {
      return {
        ...s,
        id: s.id || s.NomorSoal || sIdx + 1,
        mapel: s.mapel || s.Mapel || mapel,
        Mapel: s.mapel || s.Mapel || mapel,
        MataPelajaran: s.MataPelajaran || s['Mata Pelajaran'] || s.mapel || s.Mapel || mapel,
        'Mata Pelajaran': s.MataPelajaran || s['Mata Pelajaran'] || s.mapel || s.Mapel || mapel,
        kelas: s.kelas || s.Kelas || kelas,
        Kelas: s.kelas || s.Kelas || kelas,
        jenjang: s.jenjang || s.Jenjang || (Number(kelas) <= 6 ? 'Paket A' : Number(kelas) <= 9 ? 'Paket B' : 'Paket C'),
        Jenjang: s.jenjang || s.Jenjang || (Number(kelas) <= 6 ? 'Paket A' : Number(kelas) <= 9 ? 'Paket B' : 'Paket C'),
        kunci: String(s.kunci || s.KunciJawaban || s.kunciJawaban || 'a').toLowerCase(),
        KunciJawaban: String(s.kunci || s.KunciJawaban || s.kunciJawaban || 'a').toLowerCase(),
        gambar: s.gambar || s.Gambar || s.gambarUrl || s.imageUrl || s.LinkGambar || s['Link Gambar'] || undefined,
        LinkGambar: s.gambar || s.Gambar || s.gambarUrl || s.imageUrl || s.LinkGambar || s['Link Gambar'] || undefined
      };
    });

    const jumlahSoal = Array.isArray(b.soalList) ? soalList.length : (soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 0));
    const tipeSoal = b.tipeSoal || b.TipeSoal || (jumlahSoal > 0 ? `${jumlahSoal} Pilihan Ganda` : 'Belum Ada Soal');

    const topik = b.topik || b.Topik || b.Bab || b.bab || b.SubBab || b.subBab || b.temaModul || b.topikSubTugas || b.judulSubModul || '';
    const temaModul = b.temaModul || b.TemaModul || b.Bab || b.bab || '';
    const topikSubTugas = b.topikSubTugas || b.TopikSubTugas || b.SubBab || b.subBab || topik;
    const kodeSubTugas = b.kodeSubTugas || b.KodeSubTugas || b.singkatanDanJudul || b.kode || '';
    const silabusNo = b.silabusNo !== undefined ? Number(b.silabusNo) : (b.SilabusNo !== undefined ? Number(b.SilabusNo) : (b.no !== undefined ? Number(b.no) : (b.No !== undefined ? Number(b.No) : undefined)));
    const silabusId = b.silabusId || b.SilabusID || b.silabusKey || undefined;

    const rawJenis = (b.jenisUjian || b.JenisUjian || b.tipeUjian || b.kategoriUjian || b.jenis || b.Jenis || '').trim();
    const idUpper = id.toUpperCase();
    const textDesc = `${b.temaModul || ''} ${b.topik || ''} ${b.tipeSoal || ''}`.toLowerCase();
    
    const is2210OrHarian = idUpper.includes('2210') || 
                           idUpper.includes('HARIAN') || 
                           idUpper.includes('-UH-') || 
                           idUpper.startsWith('UH-') ||
                           idUpper.endsWith('-UH') ||
                           textDesc.includes('2210') || 
                           textDesc.includes('harian') || 
                           textDesc.includes('ulangan harian') ||
                           b.silabusNo === 2210 || 
                           String(b.silabusNo) === '2210' ||
                           String(b.silabusId).includes('2210') ||
                           String(b.kodeSubTugas).includes('2210');

    let jenisUjian = rawJenis;
    if (is2210OrHarian) {
      jenisUjian = 'Sumatif Harian';
    } else if (!jenisUjian || jenisUjian === 'Sumatif Tengah Semester' || jenisUjian === 'Sumatif Tengah Semester (STS)') {
      // Check if ID is specifically a silabus row (e.g. 2210) or non-STS
      if (idUpper.includes('-STS-') || idUpper.includes('-STS')) {
        jenisUjian = 'Sumatif Tengah Semester (STS)';
      } else if (idUpper.includes('-SAS-') || idUpper.includes('-SAS')) {
        jenisUjian = 'Sumatif Akhir Semester (SAS)';
      } else if (idUpper.includes('-PAT-') || idUpper.includes('-SAT-')) {
        jenisUjian = 'Penilaian Akhir Tahun (PAT / SAT)';
      } else if (idUpper.includes('-HARIAN-') || idUpper.includes('-UH-')) {
        jenisUjian = 'Sumatif Harian';
      } else if (idUpper.includes('-FORMATIF-')) {
        jenisUjian = 'Asesmen Formatif Harian';
      } else if (idUpper.includes('-US-')) {
        jenisUjian = 'Ujian Sekolah (US)';
      } else if (idUpper.includes('-ANBK-')) {
        jenisUjian = 'Try Out Asesmen Nasional (ANBK)';
      } else if (textDesc.includes('sts') || textDesc.includes('tengah semester')) {
        jenisUjian = 'Sumatif Tengah Semester (STS)';
      } else if (textDesc.includes('sas') || textDesc.includes('akhir semester')) {
        jenisUjian = 'Sumatif Akhir Semester (SAS)';
      } else if (textDesc.includes('pat') || textDesc.includes('sat') || textDesc.includes('akhir tahun')) {
        jenisUjian = 'Penilaian Akhir Tahun (PAT / SAT)';
      } else if (textDesc.includes('sumatif harian') || textDesc.includes('ulangan harian') || textDesc.includes('harian')) {
        jenisUjian = 'Sumatif Harian';
      } else if (textDesc.includes('formatif')) {
        jenisUjian = 'Asesmen Formatif Harian';
      } else if (textDesc.includes('praktek') || textDesc.includes('vokasi')) {
        jenisUjian = 'Ujian Praktek & Vokasi';
      } else if (/^\d+$/.test(id.trim()) || idUpper.includes('SILABUS') || b.silabusNo) {
        // IDs like 2210 or silabus-derived questions are Sumatif Harian
        jenisUjian = 'Sumatif Harian';
      } else if (rawJenis) {
        jenisUjian = rawJenis;
      } else {
        jenisUjian = 'Sumatif Harian';
      }
    }

    // Prioritaskan durasi dari jadwal / sesi ujian jika paket terhubung ke sesi jadwal
    let linkedSessionDuration: number | null = null;
    try {
      const allSessions = (db.get('ujian_cbt') as any[]) || (db.get('cbt_ujian') as any[]) || [];
      const matchSesi = allSessions.find((s: any) => 
        s.bankSoalId === id || s.BankSoalID === id || s.id === b.jadwalId || s.id === b.sesiId || s.id === b.ujianId
      );
      if (matchSesi) {
        const rawDur = Number(matchSesi.durasi ?? matchSesi.durasiMenit ?? matchSesi.Durasi ?? matchSesi.DurasiMenit);
        if (!isNaN(rawDur) && rawDur > 0) {
          linkedSessionDuration = rawDur;
        }
      }
    } catch {
      // fallback
    }

    const explicitDurasi = Number(b.durasi ?? b.Durasi ?? b.durasiMenit ?? b.DurasiMenit);
    const durasi = (explicitDurasi > 0 ? explicitDurasi : null) || linkedSessionDuration || (jenisUjian.includes('STS') || jenisUjian.includes('SAS') || jenisUjian.includes('PAT') ? 90 : 60);
    const semester = b.semester || b.Semester || (idUpper.includes('-STS-') ? '1 (Ganjil)' : '1 (Ganjil)');
    const jadwalId = b.jadwalId || b.sesiId;
    const sesiId = b.sesiId || b.jadwalId;

    return {
      id,
      BankSoalID: id,
      mapel,
      Mapel: mapel,
      kelas,
      Kelas: kelas,
      kurikulum,
      Kurikulum: kurikulum,
      guru,
      Guru: guru,
      jumlahSoal,
      JumlahSoal: jumlahSoal,
      tipeSoal,
      TipeSoal: tipeSoal,
      kesulitan,
      Kesulitan: kesulitan,
      status,
      Status: status,
      updatedAt,
      UpdatedAt: updatedAt,
      topik,
      Topik: topik,
      temaModul,
      TemaModul: temaModul,
      topikSubTugas,
      TopikSubTugas: topikSubTugas,
      silabusNo,
      SilabusNo: silabusNo,
      silabusId,
      SilabusID: silabusId,
      kodeSubTugas,
      KodeSubTugas: kodeSubTugas,
      jenisUjian,
      JenisUjian: jenisUjian,
      jenisAsesmen: jenisUjian,
      JenisAsesmen: jenisUjian,
      durasi,
      Durasi: durasi,
      semester,
      Semester: semester,
      jadwalId,
      sesiId,
      soalList,
      SoalJSON: JSON.stringify(soalList)
    };
  });
}

export const STANDARD_JENIS_UJIAN_LIST = JENIS_UJIAN_LIST.map(j => j.name);

export function getBankSoalJenisUjian(b: BankSoalItem, linkedSession?: any): string {
  const direct = (b.jenisAsesmen || b.JenisAsesmen || b.jenisUjian || b.JenisUjian || b.tipeUjian || b.kategoriUjian || b.jenis || b.Jenis || '').trim();
  const idStr = String(b.id || b.BankSoalID || '').trim();
  const idUpper = idStr.toUpperCase();
  const textDesc = `${b.temaModul || ''} ${b.topik || ''} ${b.tipeSoal || ''} ${b.kodeSubTugas || ''}`.toLowerCase();

  // 1. Explicit check for 2210 or Harian indicators (Priority 1)
  if (
    idUpper.includes('2210') ||
    idUpper.includes('HARIAN') ||
    idUpper.includes('-UH-') ||
    idUpper.startsWith('UH-') ||
    idUpper.endsWith('-UH') ||
    textDesc.includes('2210') ||
    textDesc.includes('harian') ||
    textDesc.includes('ulangan harian') ||
    b.silabusNo === 2210 ||
    String(b.silabusNo) === '2210' ||
    String(b.silabusId).includes('2210') ||
    String(b.kodeSubTugas).includes('2210')
  ) {
    return 'Sumatif Harian';
  }

  // 2. Direct custom value from item
  if (direct && direct !== 'Sumatif Tengah Semester (STS)' && direct !== 'Sumatif Tengah Semester') {
    const dLower = direct.toLowerCase();
    if (dLower.includes('sumatif harian') || dLower === 'uh' || dLower === 'harian') return 'Sumatif Harian';
    if (dLower === 'sts' || dLower.includes('tengah semester')) return 'Sumatif Tengah Semester (STS)';
    if (dLower === 'sas' || dLower.includes('akhir semester')) return 'Sumatif Akhir Semester (SAS)';
    if (dLower === 'pat' || dLower === 'sat' || dLower.includes('akhir tahun')) return 'Penilaian Akhir Tahun (PAT / SAT)';
    if (dLower === 'formatif' || dLower.includes('formatif')) return 'Asesmen Formatif Harian';
    if (dLower === 'us' || dLower.includes('sekolah')) return 'Ujian Sekolah (US)';
    if (dLower === 'anbk' || dLower.includes('asesmen nasional')) return 'Try Out Asesmen Nasional (ANBK)';
    if (dLower.includes('praktek') || dLower.includes('vokasi')) return 'Ujian Praktek & Vokasi';
    return direct;
  }

  // 3. Check ID tags
  if (idUpper.includes('-SAS-') || idUpper.includes('-SAS')) return 'Sumatif Akhir Semester (SAS)';
  if (idUpper.includes('-PAT-') || idUpper.includes('-SAT-')) return 'Penilaian Akhir Tahun (PAT / SAT)';
  if (idUpper.includes('-HARIAN-') || idUpper.includes('-UH-')) return 'Sumatif Harian';
  if (idUpper.includes('-FORMATIF-')) return 'Asesmen Formatif Harian';
  if (idUpper.includes('-US-')) return 'Ujian Sekolah (US)';
  if (idUpper.includes('-ANBK-')) return 'Try Out Asesmen Nasional (ANBK)';
  if (idUpper.includes('-STS-') || idUpper.includes('-STS')) return 'Sumatif Tengah Semester (STS)';

  // 4. Linked session
  const sessJenis = (linkedSession?.jenis || linkedSession?.jenisUjian || linkedSession?.tipe || '').trim();
  if (sessJenis) {
    const sLower = sessJenis.toLowerCase();
    if (sLower.includes('sumatif harian') || sLower === 'uh' || sLower === 'harian') return 'Sumatif Harian';
    if (sLower === 'sts' || sLower.includes('tengah semester')) return 'Sumatif Tengah Semester (STS)';
    if (sLower === 'sas' || sLower.includes('akhir semester')) return 'Sumatif Akhir Semester (SAS)';
    if (sLower === 'pat' || sLower === 'sat' || sLower.includes('akhir tahun')) return 'Penilaian Akhir Tahun (PAT / SAT)';
    if (sLower === 'formatif' || sLower.includes('formatif')) return 'Asesmen Formatif Harian';
    if (sLower === 'us' || sLower.includes('sekolah')) return 'Ujian Sekolah (US)';
    if (sLower === 'anbk' || sLower.includes('asesmen nasional')) return 'Try Out Asesmen Nasional (ANBK)';
    if (sLower.includes('praktek') || sLower.includes('vokasi')) return 'Ujian Praktek & Vokasi';
    return sessJenis;
  }

  // 5. Text description checks
  if (textDesc.includes('sas') || textDesc.includes('akhir semester')) return 'Sumatif Akhir Semester (SAS)';
  if (textDesc.includes('pat') || textDesc.includes('sat') || textDesc.includes('akhir tahun')) return 'Penilaian Akhir Tahun (PAT / SAT)';
  if (textDesc.includes('sumatif harian') || textDesc.includes('ulangan harian') || textDesc.includes('harian')) return 'Sumatif Harian';
  if (textDesc.includes('formatif')) return 'Asesmen Formatif Harian';
  if (textDesc.includes('praktek') || textDesc.includes('vokasi')) return 'Ujian Praktek & Vokasi';
  if (textDesc.includes('sts') || textDesc.includes('tengah semester')) return 'Sumatif Tengah Semester (STS)';

  if (/^\d+$/.test(idStr) || idUpper.includes('SILABUS') || b.silabusNo) {
    return 'Sumatif Harian';
  }

  return direct || 'Sumatif Tengah Semester (STS)';
}

export function getJenisUjianBadgeClass(jenis: string): { bg: string; text: string; border: string; label: string } {
  const j = (jenis || '').toLowerCase();
  if (j.includes('sumatif harian') || j.includes('harian') || j === 'uh') {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Sumatif Harian' };
  }
  if (j.includes('sts') || j.includes('tengah semester')) {
    return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', label: 'STS' };
  }
  if (j.includes('sas') || j.includes('akhir semester')) {
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'SAS' };
  }
  if (j.includes('pat') || j.includes('sat') || j.includes('akhir tahun')) {
    return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'PAT / SAT' };
  }
  if (j.includes('formatif')) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Formatif' };
  }
  if (j.includes('praktek') || j.includes('vokasi')) {
    return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Praktek' };
  }
  if (j.includes('sekolah') || j.includes('(us)')) {
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'US' };
  }
  if (j.includes('anbk') || j.includes('try out')) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'ANBK' };
  }
  return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Asesmen' };
}
interface BankSoalTabProps {
  onNavigateTab?: (tabId: string, context?: any) => void;
  initialFilterPackageId?: string;
}

export default function BankSoalTab({ onNavigateTab, initialFilterPackageId }: BankSoalTabProps = {}) {
  const { teachers, students, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialFilterPackageId || '');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [filterJadwal, setFilterJadwal] = useState<'all' | 'sudah' | 'belum' | ''>('');
  const [filterJenisUjian, setFilterJenisUjian] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sandboxPackage, setSandboxPackage] = useState<any | null>(null);

  useEffect(() => {
    if (initialFilterPackageId) {
      setSearchTerm(initialFilterPackageId);
    }
  }, [initialFilterPackageId]);

  // Persisted Bank Soal List from DB with reactive trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleDbChange = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('erp-db-updated', handleDbChange);
    window.addEventListener('storage', handleDbChange);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbChange);
      window.removeEventListener('storage', handleDbChange);
    };
  }, []);

  const [bankSoalList, setBankSoalList] = useState<BankSoalItem[]>(() => {
    const saved = db.get('cbt_bank_soal') || db.get('cbt_questions') || [];
    const nonDummy = (Array.isArray(saved) ? saved : []).filter(p => !isDummyBankSoalPackage(p));
    return normalizeBankSoal(nonDummy);
  });

  // Re-read and normalize when refresh triggered (tanpa auto-seed dummy)
  useEffect(() => {
    const saved = db.get('cbt_bank_soal') || db.get('cbt_questions') || [];
    const raw = Array.isArray(saved) ? saved : [];
    const nonDummy = raw.filter(p => !isDummyBankSoalPackage(p));
    const list = normalizeBankSoal(nonDummy);
    setBankSoalList(list);

    // Sinkronkan previewModal jika sedang terbuka agar butir soal yang baru dihapus tidak kembali
    setPreviewModal(prevModal => {
      if (!prevModal) return null;
      const targetId = prevModal.id;
      const targetBankId = prevModal.BankSoalID;
      const matched = list.find(b => 
        (b.id && (b.id === targetId || b.id === targetBankId)) ||
        (b.BankSoalID && (b.BankSoalID === targetId || b.BankSoalID === targetBankId))
      );
      return matched || prevModal;
    });
  }, [refreshTrigger]);

  const silabusRows = useMemo(() => {
    const raw = db.get('master_silabus') || [];
    return Array.isArray(raw) ? raw : [];
  }, [refreshTrigger]);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const autoSaveTimerRef = useRef<any>(null);

  const triggerAutoSaveToSpreadsheet = (list: BankSoalItem[]) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveAllBankPackagesDirect(list);
        if (res.success) {
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          setLastAutoSaveTime(timeStr);
          setAutoSaveStatus('saved');
        } else {
          setAutoSaveStatus('error');
        }
      } catch (err) {
        console.warn('[BankSoal] Auto-save background error:', err);
        setAutoSaveStatus('error');
      }
    }, 1200);
  };

  const saveToDb = (list: BankSoalItem[]) => {
    const normalized = normalizeBankSoal(list);
    setBankSoalList(normalized);
    db.set('cbt_bank_soal', normalized);
    db.set('BANK_SOAL', normalized);
    db.set('bank_soal', normalized);
    db.set('cbt_questions', normalized);

    // Extract individual question rows with canonical schema for sheet SOAL & cbt_exam_questions
    const individualQuestions: any[] = [];
    normalized.forEach((pkg) => {
      if (Array.isArray(pkg.soalList)) {
        pkg.soalList.forEach((q, qIdx) => {
          const nomor = Number(q.id || qIdx + 1);
          const detailId = `SOAL-${pkg.id}-${nomor}`;
          const mapelName = pkg.mapel || (q as any).mapel || 'Mata Pelajaran';
          const kelasName = String(pkg.kelas || (q as any).kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
          const jenjangName = (pkg as any).jenjang || (Number(kelasName) <= 6 ? 'Paket A' : Number(kelasName) <= 9 ? 'Paket B' : 'Paket C');

          individualQuestions.push({
            id: detailId,
            DetailSoalID: detailId,
            ujianId: pkg.id,
            UjianID: pkg.id,
            bankSoalId: pkg.id,
            BankSoalID: pkg.id,
            mapel: mapelName,
            Mapel: mapelName,
            MataPelajaran: mapelName,
            'Mata Pelajaran': mapelName,
            kelas: kelasName,
            Kelas: kelasName,
            jenjang: jenjangName,
            Jenjang: jenjangName,
            nomor: nomor,
            Nomor: nomor,
            NomorSoal: nomor,
            pertanyaan: q.pertanyaan,
            Pertanyaan: q.pertanyaan,
            soal: q.pertanyaan,
            Soal: q.pertanyaan,
            tipe: q.tipe || 'Pilihan Ganda',
            TipeSoal: q.tipe || 'Pilihan Ganda',
            opsiA: q.opsi?.a || (q as any).opsiA || (q as any).PilihanA || '',
            PilihanA: q.opsi?.a || (q as any).opsiA || (q as any).PilihanA || '',
            opsiB: q.opsi?.b || (q as any).opsiB || (q as any).PilihanB || '',
            PilihanB: q.opsi?.b || (q as any).opsiB || (q as any).PilihanB || '',
            opsiC: q.opsi?.c || (q as any).opsiC || (q as any).PilihanC || '',
            PilihanC: q.opsi?.c || (q as any).opsiC || (q as any).PilihanC || '',
            opsiD: q.opsi?.d || (q as any).opsiD || (q as any).PilihanD || '',
            PilihanD: q.opsi?.d || (q as any).opsiD || (q as any).PilihanD || '',
            opsiE: q.opsi?.e || (q as any).opsiE || (q as any).PilihanE || '',
            PilihanE: q.opsi?.e || (q as any).opsiE || (q as any).PilihanE || '',
            kunci: String(q.kunci || (q as any).KunciJawaban || 'a').toLowerCase(),
            KunciJawaban: String(q.kunci || (q as any).KunciJawaban || 'a').toLowerCase(),
            bobot: q.bobot || 5,
            Bobot: q.bobot || 5,
            pembahasan: q.pembahasan || (q as any).pembahasanRasional || '',
            PembahasanRasional: q.pembahasan || (q as any).pembahasanRasional || '',
            createdAt: pkg.updatedAt || new Date().toISOString()
          });
        });
      }
    });
    db.set('cbt_exam_questions', individualQuestions);
    db.set('soal', individualQuestions);
    db.set('SOAL', individualQuestions);

    // Otomatis sinkronkan status 'Tersedia' pada silabus master jika paket ini merujuk silabus (misal 2210)
    const existingSilabus = db.get('master_silabus');
    if (Array.isArray(existingSilabus) && existingSilabus.length > 0) {
      let changed = false;
      const updatedSilabus = existingSilabus.map((s: any) => {
        const sNo = String(s.no || s.silabusNo || '');
        const sId = String(s.id || '');
        const isMatched = normalized.some(p => 
          (sNo && (p.id.includes(sNo) || String(p.silabusNo) === sNo)) ||
          (sId && (p.id.includes(sId) || p.silabusId === sId)) ||
          (p.topik && s.topikSubTugas && p.topik.toLowerCase().includes(s.topikSubTugas.toLowerCase()))
        );
        if (isMatched && s.statusSoal !== 'Tersedia') {
          changed = true;
          return { ...s, statusSoal: 'Tersedia' };
        }
        return s;
      });
      if (changed) {
        db.set('master_silabus', updatedSilabus);
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'master_silabus' } }));
      }
    }

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions' } }));

    // Otomatis simpan langsung ke Google Spreadsheet di latar belakang (Sheet BANK_SOAL & SOAL)
    triggerAutoSaveToSpreadsheet(normalized);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [isPushingSheets, setIsPushingSheets] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Buang seluruh butir soal dummy dan paket template
  const handlePurgeDummySoal = async () => {
    if (!window.confirm('Buang semua butir soal dummy dan paket template dari Bank Soal dan Google Sheets?')) {
      return;
    }

    setIsPurging(true);
    showToast('Sedang membuang seluruh soal dan paket dummy...');
    try {
      const saved = db.get('cbt_bank_soal') || db.get('cbt_questions') || [];
      const raw = Array.isArray(saved) ? saved : [];
      const { cleanedPackages, removedCount } = purgeDummySoalAndPackages(raw);

      saveToDb(cleanedPackages);

      // Bersihkan juga tabel 'soal' dan 'cbt_exam_questions'
      const rawSoal = db.get('soal') || [];
      const cleanSoal = (Array.isArray(rawSoal) ? rawSoal : []).filter((s: any) => !isDummyQuestion(s));
      db.set('soal', cleanSoal);
      db.set('cbt_exam_questions', cleanSoal);

      // Simpan langsung perubahan pembersihan ke Google Spreadsheet (Sheet BANK_SOAL dan Sheet SOAL)
      const pushRes = await saveAllBankPackagesDirect(cleanedPackages);
      if (pushRes.success) {
        showToast(`✅ Berhasil membuang ${removedCount} soal/paket dummy! Data Bank Soal & Google Sheet kini bersih.`);
      } else {
        showToast(`✅ ${removedCount} butir/paket dummy dibuang dari aplikasi lokal.`);
      }
    } catch (err: any) {
      showToast('⚠️ Gagal membersihkan: ' + (err?.message || err));
    } finally {
      setIsPurging(false);
    }
  };

  // Push all bank soal packages and questions directly to Sheet BANK_SOAL & SOAL
  const handlePushBankSoalToSheets = async () => {
    setIsPushingSheets(true);
    showToast('Sedang mengirim & menyimpan data langsung ke Google Spreadsheet (Sheet BANK_SOAL & SOAL)...');
    try {
      const currentList = bankSoalList;
      saveToDb(currentList);

      const pushRes = await saveAllBankPackagesDirect(currentList);
      if (pushRes.success) {
        let totalQ = 0;
        currentList.forEach(p => { totalQ += (p.soalList?.length || 0); });
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastAutoSaveTime(timeStr);
        setAutoSaveStatus('saved');
        showToast(`✅ Berhasil! ${pushRes.savedPkgCount ?? currentList.length} paket Bank Soal (${pushRes.savedQCount ?? totalQ} butir soal) telah tersimpan di SHEET BANK_SOAL dan SHEET SOAL.`);
      } else {
        showToast(`⚠️ ${pushRes.message || 'Gagal menyimpan ke Spreadsheet'}`);
      }
    } catch (err: any) {
      showToast('⚠️ Gagal menyinkronkan: ' + (err?.message || err));
    } finally {
      setIsPushingSheets(false);
    }
  };

  const [isPullingSheets, setIsPullingSheets] = useState(false);

  // Pull all bank soal packages and questions directly from Sheet BANK_SOAL & SOAL
  const handlePullBankSoalFromSheets = async () => {
    setIsPullingSheets(true);
    showToast('Sedang menarik data dari Google Spreadsheet (Sheet BANK_SOAL & SOAL)...');
    try {
      // 1. Ambil data dari sheet BANK_SOAL dan sheet SOAL
      const [resBank, resSoal] = await Promise.all([
        pullSpecificSheetFromGas('BANK_SOAL'),
        pullSpecificSheetFromGas('SOAL')
      ]);

      const rawBankList = (resBank.success && Array.isArray(resBank.data)) ? resBank.data : [];
      const rawSoalList = (resSoal.success && Array.isArray(resSoal.data)) ? resSoal.data : [];

      if (rawBankList.length === 0 && rawSoalList.length === 0) {
        setBankSoalList([]);
        db.set('cbt_bank_soal', [], { skipPush: true });
        db.set('BANK_SOAL', [], { skipPush: true });
        db.set('bank_soal', [], { skipPush: true });
        db.set('cbt_questions', [], { skipPush: true });
        db.set('cbt_exam_questions', [], { skipPush: true });
        db.set('soal', [], { skipPush: true });
        db.set('SOAL', [], { skipPush: true });
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal', skipPush: true } }));
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions', skipPush: true } }));

        Swal.fire({
          title: 'Sheet BANK_SOAL & SOAL Kosong',
          html: '<p class="text-xs text-slate-600">Sheet <code>BANK_SOAL</code> dan <code>SOAL</code> di Google Spreadsheet tidak memiliki baris data (kosong).<br/>Tampilan Bank Soal di aplikasi kini telah disinkronkan menjadi <b>bersih / kosong</b> sesuai isi Spreadsheet.</p>',
          icon: 'info',
          confirmButtonColor: '#4f46e5'
        });
        showToast('✓ Bank Soal diselaraskan dengan Spreadsheet (0 paket).');
        return;
      }

      // Kelompokkan butir soal per BankSoalID dari sheet SOAL
      const questionsByBankId = new Map<string, any[]>();
      rawSoalList.forEach((s: any) => {
        const bId = String(s.BankSoalID || s.bankSoalId || s.UjianID || s.ujianId || '').trim();
        if (bId) {
          if (!questionsByBankId.has(bId)) questionsByBankId.set(bId, []);
          questionsByBankId.get(bId)!.push({
            id: Number(s.NomorSoal || s.nomor || questionsByBankId.get(bId)!.length + 1),
            pertanyaan: s.Pertanyaan || s.pertanyaan || s.soal || '-',
            tipe: s.TipeSoal || s.tipe || 'Pilihan Ganda',
            opsi: {
              a: s.PilihanA || s.opsiA || s.opsi?.a || s.a || '',
              b: s.PilihanB || s.opsiB || s.opsi?.b || s.b || '',
              c: s.PilihanC || s.opsiC || s.opsi?.c || s.c || '',
              d: s.PilihanD || s.opsiD || s.opsi?.d || s.d || '',
              e: s.PilihanE || s.opsiE || s.opsi?.e || s.e || ''
            },
            kunci: String(s.KunciJawaban || s.kunci || s.Kunci || 'a').toLowerCase(),
            bobot: Number(s.Bobot || s.bobot || 5),
            pembahasan: s.PembahasanRasional || s.Pembahasan || s.pembahasan || ''
          });
        }
      });

      // Susun list paket
      let compiledPackages: any[] = [];

      if (rawBankList.length > 0) {
        compiledPackages = rawBankList.map((b: any, idx: number) => {
          const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
          let soalList: any[] = [];
          if (Array.isArray(b.soalList)) {
            soalList = b.soalList;
          } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
            try {
              soalList = JSON.parse(b.SoalJSON);
            } catch {
              soalList = [];
            }
          }
          if (soalList.length === 0 && questionsByBankId.has(id)) {
            soalList = questionsByBankId.get(id) || [];
          }

          soalList = (soalList || []).filter(s => !isDummyQuestion(s));

          return {
            id,
            BankSoalID: id,
            mapel: b.mapel || b.Mapel || 'Mata Pelajaran',
            kelas: String(b.kelas || b.Kelas || '4'),
            kurikulum: b.kurikulum || b.Kurikulum || 'Kurikulum Merdeka',
            guru: b.guru || b.Guru || 'Tim Guru',
            jumlahSoal: soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 0),
            tipeSoal: b.tipeSoal || b.TipeSoal || `${soalList.length} Pilihan Ganda`,
            kesulitan: b.kesulitan || b.Kesulitan || 'Sedang',
            status: b.status || b.Status || 'Siap Digunakan',
            updatedAt: b.updatedAt || b.UpdatedAt || new Date().toISOString().slice(0, 10),
            topik: b.topik || b.Topik || b.Bab || '',
            temaModul: b.temaModul || b.TemaModul || '',
            topikSubTugas: b.topikSubTugas || b.TopikSubTugas || '',
            kodeSubTugas: b.kodeSubTugas || b.KodeSubTugas || '',
            soalList,
            SoalJSON: JSON.stringify(soalList)
          };
        });
      } else {
        // Jika BANK_SOAL kosong tetapi SOAL ada, kelompokkan paket dari SOAL
        questionsByBankId.forEach((qList, bankId) => {
          compiledPackages.push({
            id: bankId,
            BankSoalID: bankId,
            mapel: 'Mata Pelajaran',
            kelas: '4',
            kurikulum: 'Kurikulum Merdeka',
            guru: 'Tim Guru',
            jumlahSoal: qList.length,
            tipeSoal: `${qList.length} Pilihan Ganda`,
            kesulitan: 'Sedang',
            status: 'Siap Digunakan',
            updatedAt: new Date().toISOString().slice(0, 10),
            topik: `Paket ${bankId}`,
            soalList: qList,
            SoalJSON: JSON.stringify(qList)
          });
        });
      }

      const normalized = normalizeBankSoal(compiledPackages.filter(p => !isDummyBankSoalPackage(p)));
      saveToDb(normalized);
      setBankSoalList(normalized);

      let totalQ = 0;
      normalized.forEach(p => { totalQ += (p.soalList?.length || 0); });

      Swal.fire({
        title: 'Berhasil Menarik dari Spreadsheet!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-600">
            <p>✅ Berhasil menarik <b>${normalized.length} paket Bank Soal</b> dari Sheet <code>BANK_SOAL</code>.</p>
            <p>✅ Berhasil memuat <b>${totalQ} butir soal pilihan ganda/isian</b> dari Sheet <code>SOAL</code>.</p>
            <p class="text-emerald-700 font-semibold mt-2">Data Bank Soal di aplikasi kini telah tersinkronisasi sempurna dengan Google Spreadsheet.</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });
      showToast(`✅ Berhasil menarik ${normalized.length} paket Bank Soal (${totalQ} butir soal) dari Sheets!`);
    } catch (err: any) {
      console.error('Pull Bank Soal error:', err);
      Swal.fire({
        title: 'Gagal Menarik dari Spreadsheet',
        text: err?.message || 'Terjadi kesalahan saat membaca data dari Google Spreadsheet.',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
      showToast('⚠️ Gagal menarik: ' + (err?.message || err));
    } finally {
      setIsPullingSheets(false);
    }
  };

  const [isTwoWaySyncing, setIsTwoWaySyncing] = useState(false);
  const [lastTwoWaySyncTime, setLastTwoWaySyncTime] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));

  // Full Two-Way Synchronization (Google Sheets ↔ Aplikasi ERP)
  const handleTwoWaySync = async () => {
    setIsTwoWaySyncing(true);
    showToast('🔄 Memulai Sinkronisasi Dua Arah (Google Sheets ↔ Aplikasi ERP)...');

    try {
      // 1. ARAH 1: Simpan data lokal langsung ke Google Spreadsheet (Sheet BANK_SOAL & SOAL)
      showToast('⏳ Arah 1: Menyelaraskan seluruh paket lokal ke Sheet BANK_SOAL & SOAL...');
      await saveAllBankPackagesDirect(bankSoalList);

      // 2. ARAH 2: Tarik seluruh data terbaru dari Google Spreadsheet ke aplikasi
      showToast('⏳ Arah 2: Mengambil pembaruan terkini dari Sheet BANK_SOAL & SOAL...');
      const [resBank, resSoal] = await Promise.all([
        pullSpecificSheetFromGas('BANK_SOAL'),
        pullSpecificSheetFromGas('SOAL')
      ]);

      const rawBankList = (resBank.success && Array.isArray(resBank.data)) ? resBank.data : [];
      const rawSoalList = (resSoal.success && Array.isArray(resSoal.data)) ? resSoal.data : [];

      // Kelompokkan butir soal per BankSoalID dari sheet SOAL
      const questionsByBankId = new Map<string, any[]>();
      rawSoalList.forEach((s: any) => {
        const bId = String(s.BankSoalID || s.bankSoalId || s.UjianID || s.ujianId || '').trim();
        if (bId) {
          if (!questionsByBankId.has(bId)) questionsByBankId.set(bId, []);
          questionsByBankId.get(bId)!.push({
            id: Number(s.NomorSoal || s.nomor || questionsByBankId.get(bId)!.length + 1),
            pertanyaan: s.Pertanyaan || s.pertanyaan || s.soal || '-',
            tipe: s.TipeSoal || s.tipe || 'Pilihan Ganda',
            opsi: {
              a: s.PilihanA || s.opsiA || s.opsi?.a || s.a || '',
              b: s.PilihanB || s.opsiB || s.opsi?.b || s.b || '',
              c: s.PilihanC || s.opsiC || s.opsi?.c || s.c || '',
              d: s.PilihanD || s.opsiD || s.opsi?.d || s.d || '',
              e: s.PilihanE || s.opsiE || s.opsi?.e || s.e || ''
            },
            kunci: String(s.KunciJawaban || s.kunci || s.Kunci || 'a').toLowerCase(),
            bobot: Number(s.Bobot || s.bobot || 5),
            pembahasan: s.PembahasanRasional || s.Pembahasan || s.pembahasan || ''
          });
        }
      });

      let compiledPackages: any[] = [];
      if (rawBankList.length > 0) {
        compiledPackages = rawBankList.map((b: any, idx: number) => {
          const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
          let soalList: any[] = [];
          if (Array.isArray(b.soalList)) {
            soalList = b.soalList;
          } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
            try {
              soalList = JSON.parse(b.SoalJSON);
            } catch {
              soalList = [];
            }
          }
          if (soalList.length === 0 && questionsByBankId.has(id)) {
            soalList = questionsByBankId.get(id) || [];
          }
          soalList = (soalList || []).filter(s => !isDummyQuestion(s));

          return {
            id,
            BankSoalID: id,
            mapel: b.mapel || b.Mapel || 'Mata Pelajaran',
            kelas: String(b.kelas || b.Kelas || '4'),
            kurikulum: b.kurikulum || b.Kurikulum || 'Kurikulum Merdeka',
            guru: b.guru || b.Guru || 'Tim Guru',
            jumlahSoal: soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 0),
            tipeSoal: b.tipeSoal || b.TipeSoal || `${soalList.length} Pilihan Ganda`,
            kesulitan: b.kesulitan || b.Kesulitan || 'Sedang',
            status: b.status || b.Status || 'Siap Digunakan',
            updatedAt: b.updatedAt || b.UpdatedAt || new Date().toISOString().slice(0, 10),
            topik: b.topik || b.Topik || b.Bab || '',
            temaModul: b.temaModul || b.TemaModul || '',
            topikSubTugas: b.topikSubTugas || b.TopikSubTugas || '',
            kodeSubTugas: b.kodeSubTugas || b.KodeSubTugas || '',
            soalList,
            SoalJSON: JSON.stringify(soalList)
          };
        });
      } else if (questionsByBankId.size > 0) {
        questionsByBankId.forEach((qList, bankId) => {
          compiledPackages.push({
            id: bankId,
            BankSoalID: bankId,
            mapel: 'Mata Pelajaran',
            kelas: '4',
            kurikulum: 'Kurikulum Merdeka',
            guru: 'Tim Guru',
            jumlahSoal: qList.length,
            tipeSoal: `${qList.length} Pilihan Ganda`,
            kesulitan: 'Sedang',
            status: 'Siap Digunakan',
            updatedAt: new Date().toISOString().slice(0, 10),
            topik: `Paket ${bankId}`,
            soalList: qList,
            SoalJSON: JSON.stringify(qList)
          });
        });
      }

      const normalized = normalizeBankSoal(compiledPackages.filter(p => !isDummyBankSoalPackage(p)));
      saveToDb(normalized);
      setBankSoalList(normalized);

      const timeNow = new Date().toLocaleTimeString('id-ID');
      setLastTwoWaySyncTime(timeNow);

      let totalQ = 0;
      normalized.forEach(p => { totalQ += (p.soalList?.length || 0); });

      Swal.fire({
        title: 'Sinkronisasi 2 Arah Berhasil! 🔄',
        html: `
          <div class="text-left text-xs space-y-2.5 text-slate-700">
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <p class="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>✅ Arah 1 (Aplikasi ➔ Google Sheets):</span>
              </p>
              <p class="text-emerald-800">Seluruh paket Bank Soal & butir soal lokal telah diverifikasi & diselaraskan ke Sheet <code>BANK_SOAL</code> dan <code>SOAL</code>.</p>
            </div>
            <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
              <p class="font-bold text-indigo-900 flex items-center gap-1.5">
                <span>✅ Arah 2 (Google Sheets ➔ Aplikasi):</span>
              </p>
              <p class="text-indigo-800">Berhasil memuat <b>${normalized.length} paket Bank Soal</b> dan <b>${totalQ} butir soal</b> langsung dari Google Spreadsheet.</p>
            </div>
            <p class="text-slate-500 text-[11px] text-center pt-1 font-semibold">Waktu sinkronisasi: ${timeNow} WIB • Status: 100% Selaras</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Selesai'
      });
      showToast(`✅ Sinkronisasi 2 arah tuntas! ${normalized.length} paket & ${totalQ} butir soal sinkron.`);
    } catch (err: any) {
      console.error('Two-way sync error:', err);
      Swal.fire({
        title: 'Gagal Sinkronisasi Dua Arah',
        text: err?.message || 'Terjadi kendala saat menyinkronkan data dengan Google Sheets.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsTwoWaySyncing(false);
    }
  };

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<BankSoalItem | null>(null);
  const [previewModal, setPreviewModal] = useState<BankSoalItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  
  // Checkbox Selection States for Marking and Bulk Deleting
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([]);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [integrateScheduleModal, setIntegrateScheduleModal] = useState<BankSoalItem | null>(null);
  const [scheduleSearchSession, setScheduleSearchSession] = useState('');

  // New Question in Preview Modal
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionKey, setNewQuestionKey] = useState<'a' | 'b' | 'c' | 'd' | 'e'>('a');
  const [newOpsiA, setNewOpsiA] = useState('');
  const [newOpsiB, setNewOpsiB] = useState('');
  const [newOpsiC, setNewOpsiC] = useState('');
  const [newOpsiD, setNewOpsiD] = useState('');
  const [newOpsiE, setNewOpsiE] = useState('');
  const [newPembahasan, setNewPembahasan] = useState('');
  const [newBobot, setNewBobot] = useState(5);
  const [smartBobotModalOpen, setSmartBobotModalOpen] = useState(false);

  // Perhitungan total bobot pada modal preview butir soal saat ini
  const previewTotalBobot = useMemo(() => {
    if (!previewModal || !previewModal.soalList) return 0;
    return previewModal.soalList.reduce((acc, q) => acc + (Number(q.bobot) || 5), 0);
  }, [previewModal]);

  // Bulk Paste & Package Creation Mode States
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [activeQuestionTab, setActiveQuestionTab] = useState<'single' | 'bulk'>('single');
  const [packageCreationMode, setPackageCreationMode] = useState<'manual' | 'silabus'>('manual');
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const availableClasses = useMemo(() => {
    const list = getMasterClassDropdown(students).classes;
    return list.length > 0 ? list : CLASSES;
  }, [students]);

  // Exam Sessions & Schedule Mapping for Status Terjadwal
  const examSessions = useMemo(() => {
    const rawUjian = db.get('ujian_cbt') || db.get('cbt_exams') || [];
    const rawSchedules = db.get('cbt_schedules') || db.get('jadwal_ujian') || [];
    const list1 = Array.isArray(rawUjian) ? rawUjian : [];
    const list2 = Array.isArray(rawSchedules) ? rawSchedules : [];
    
    const combined = new Map<string, any>();
    [...list1, ...list2].forEach((s: any) => {
      if (s && (s.id || s.UjianID || s.JadwalID)) {
        const key = s.id || s.UjianID || s.JadwalID;
        combined.set(key, { ...combined.get(key), ...s });
      }
    });
    return Array.from(combined.values());
  }, [refreshTrigger]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, any>();
    examSessions.forEach((sesi: any) => {
      const bankId = sesi.bankSoalId || sesi.BankSoalID;
      if (bankId) {
        map.set(String(bankId).trim(), sesi);
      }
      if (sesi.id) {
        const impliedId = `BNK-STS-${sesi.id.replace(/^SES-/, '')}`;
        if (!map.has(impliedId)) {
          map.set(impliedId, sesi);
        }
      }
    });
    return map;
  }, [examSessions]);

  const getLinkedSessionForBank = (b: BankSoalItem) => {
    const bId = String(b.id || '').trim();
    const bAltId = String(b.BankSoalID || '').trim();
    if (bId && scheduleMap.has(bId)) return scheduleMap.get(bId);
    if (bAltId && scheduleMap.has(bAltId)) return scheduleMap.get(bAltId);
    if (b.jadwalId) {
      const found = examSessions.find((u: any) => u.id === b.jadwalId || u.JadwalID === b.jadwalId);
      if (found) return found;
    }
    if (b.sesiId) {
      const found = examSessions.find((u: any) => u.id === b.sesiId);
      if (found) return found;
    }
    return null;
  };

  const scheduleStats = useMemo(() => {
    let scheduled = 0;
    let unscheduled = 0;
    bankSoalList.forEach(b => {
      if (getLinkedSessionForBank(b)) {
        scheduled++;
      } else {
        unscheduled++;
      }
    });
    return { scheduled, unscheduled, total: bankSoalList.length };
  }, [bankSoalList, scheduleMap, examSessions]);

  // Statistik Kategori Jenis Ujian untuk Pembedaan Soal Antar Ulangan
  const jenisUjianStats = useMemo(() => {
    const stats: Record<string, number> = {
      'Sumatif Harian': 0,
      'Sumatif Tengah Semester (STS)': 0,
      'Sumatif Akhir Semester (SAS)': 0,
      'Penilaian Akhir Tahun (PAT / SAT)': 0,
      'Ujian Sekolah (US)': 0,
      'Try Out Asesmen Nasional (ANBK)': 0,
      'Asesmen Formatif Harian': 0,
      'Asesmen Diagnostik': 0
    };
    bankSoalList.forEach(b => {
      const s = getLinkedSessionForBank(b);
      const j = getBankSoalJenisUjian(b, s);
      const jLower = j.toLowerCase();
      if (jLower.includes('sumatif harian') || jLower === 'uh' || (jLower.includes('harian') && !jLower.includes('formatif'))) {
        stats['Sumatif Harian']++;
      } else if (jLower.includes('sts') || jLower.includes('tengah')) {
        stats['Sumatif Tengah Semester (STS)']++;
      } else if (jLower.includes('sas') || jLower.includes('akhir semester')) {
        stats['Sumatif Akhir Semester (SAS)']++;
      } else if (jLower.includes('pat') || jLower.includes('sat') || jLower.includes('akhir tahun')) {
        stats['Penilaian Akhir Tahun (PAT / SAT)']++;
      } else if (jLower.includes('sekolah') || jLower.includes('(us)') || jLower === 'us') {
        stats['Ujian Sekolah (US)']++;
      } else if (jLower.includes('anbk') || jLower.includes('nasional')) {
        stats['Try Out Asesmen Nasional (ANBK)']++;
      } else if (jLower.includes('formatif')) {
        stats['Asesmen Formatif Harian']++;
      } else if (jLower.includes('diagnostik')) {
        stats['Asesmen Diagnostik']++;
      }
    });
    return stats;
  }, [bankSoalList, scheduleMap, examSessions]);

  const previewLinkedSession = useMemo(() => {
    return previewModal ? getLinkedSessionForBank(previewModal) : null;
  }, [previewModal, scheduleMap, examSessions]);

  const previewJenisUjian = useMemo(() => {
    return previewModal ? getBankSoalJenisUjian(previewModal, previewLinkedSession) : '';
  }, [previewModal, previewLinkedSession]);

  const previewBadge = useMemo(() => {
    return getJenisUjianBadgeClass(previewJenisUjian);
  }, [previewJenisUjian]);

  const availableMapelList = useMemo(() => {
    const set = new Set<string>();
    bankSoalList.forEach(b => {
      const m = (b.mapel || b.Mapel || '').trim();
      if (m) set.add(m);
    });
    const dbMapel = db.get('mapel') || db.get('MAPEL') || db.get('master_mapel') || [];
    if (Array.isArray(dbMapel)) {
      dbMapel.forEach((m: any) => {
        const name = String(m.nama || m.Nama || m.namaMapel || m.NamaMapel || m.mapel || m.Mapel || '').trim();
        if (name) set.add(name);
      });
    }
    COMPREHENSIVE_SUBJECTS.forEach(s => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [bankSoalList]);

  const availableJenisUjianList = useMemo(() => {
    const set = new Set<string>(STANDARD_JENIS_UJIAN_LIST);
    bankSoalList.forEach(b => {
      const s = getLinkedSessionForBank(b);
      const j = getBankSoalJenisUjian(b, s);
      if (j && typeof j === 'string') set.add(j.trim());
    });
    return Array.from(set);
  }, [bankSoalList, scheduleMap, examSessions]);

  const isAnyFilterActive = Boolean(
    searchTerm || filterKelas || filterStatus || filterMapel || (filterJadwal && filterJadwal !== 'all') || filterJenisUjian
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterKelas('');
    setFilterStatus('');
    setFilterMapel('');
    setFilterJadwal('');
    setFilterJenisUjian('');
  };

  // Form State for creating new bank
  const [formState, setFormState] = useState<Partial<BankSoalItem>>({
    id: `BNK-${Math.floor(1000 + Math.random() * 9000)}`,
    mapel: '',
    kelas: '4',
    kurikulum: 'Kurikulum Merdeka',
    jenisUjian: 'Sumatif Tengah Semester (STS)',
    jumlahSoal: 20,
    tipeSoal: '20 Pilihan Ganda (Auto-Grading)',
    guru: '',
    kesulitan: 'Sedang (50%)',
    status: 'Siap Digunakan'
  });

  const filteredList = useMemo(() => {
    return bankSoalList.filter((b) => {
      const q = searchTerm.toLowerCase();
      const mapel = String(b.mapel || b.Mapel || '').toLowerCase();
      const kelas = String(b.kelas || b.Kelas || '').toLowerCase();
      const id = String(b.id || b.BankSoalID || '').toLowerCase();
      const guru = String(b.guru || b.Guru || '').toLowerCase();
      const topik = String(b.topik || b.Topik || b.temaModul || '').toLowerCase();

      const matchesQ = !searchTerm || mapel.includes(q) || kelas.includes(q) || id.includes(q) || guru.includes(q) || topik.includes(q);
      const matchesKelas = !filterKelas || matchClass(b.kelas || b.Kelas, filterKelas);
      const matchesStatus = !filterStatus || (b.status || b.Status) === filterStatus;

      // 1. FILTER MATA PELAJARAN
      const matchesMapel = !filterMapel || mapel === filterMapel.toLowerCase() || mapel.includes(filterMapel.toLowerCase());

      // 2. FILTER SUDAH DIJADWALKAN ATAU BELUM
      const linkedSession = getLinkedSessionForBank(b);
      const isScheduled = Boolean(linkedSession);
      const matchesJadwal = 
        !filterJadwal || 
        filterJadwal === 'all' || 
        (filterJadwal === 'sudah' && isScheduled) || 
        (filterJadwal === 'belum' && !isScheduled);

      // 3. FILTER JENIS UJIANNYA APA
      const bJenisUjian = getBankSoalJenisUjian(b, linkedSession);
      const matchesJenisUjian = !filterJenisUjian || 
        bJenisUjian.toLowerCase().includes(filterJenisUjian.toLowerCase()) || 
        filterJenisUjian.toLowerCase().includes(bJenisUjian.toLowerCase());

      return matchesQ && matchesKelas && matchesStatus && matchesMapel && matchesJadwal && matchesJenisUjian;
    });
  }, [bankSoalList, searchTerm, filterKelas, filterStatus, filterMapel, filterJadwal, filterJenisUjian, examSessions, scheduleMap]);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawK = String(formState.kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
    const finalSoalList = formState.soalList && formState.soalList.length > 0
      ? formState.soalList
      : [];

    const newItem: BankSoalItem = {
      id: formState.id || `BNK-${Math.floor(1000 + Math.random() * 9000)}`,
      BankSoalID: formState.id || `BNK-${Math.floor(1000 + Math.random() * 9000)}`,
      mapel: formState.mapel || 'Mata Pelajaran',
      Mapel: formState.mapel || 'Mata Pelajaran',
      kelas: rawK,
      Kelas: rawK,
      kurikulum: formState.kurikulum || 'Kurikulum Merdeka',
      Kurikulum: formState.kurikulum || 'Kurikulum Merdeka',
      jenisUjian: formState.jenisUjian || 'Sumatif Tengah Semester (STS)',
      JenisUjian: formState.jenisUjian || 'Sumatif Tengah Semester (STS)',
      semester: formState.semester || '1 (Ganjil)',
      Semester: formState.semester || '1 (Ganjil)',
      jumlahSoal: finalSoalList.length,
      JumlahSoal: finalSoalList.length,
      tipeSoal: formState.tipeSoal || `${finalSoalList.length} Pilihan Ganda (Auto-Grading)`,
      TipeSoal: formState.tipeSoal || `${finalSoalList.length} Pilihan Ganda (Auto-Grading)`,
      guru: formState.guru || teachers[0]?.name || 'Tim Guru',
      Guru: formState.guru || teachers[0]?.name || 'Tim Guru',
      kesulitan: formState.kesulitan || 'Proporsional',
      Kesulitan: formState.kesulitan || 'Proporsional',
      status: (formState.status as any) || 'Siap Digunakan',
      Status: (formState.status as any) || 'Siap Digunakan',
      updatedAt: new Date().toISOString().slice(0, 10),
      UpdatedAt: new Date().toISOString().slice(0, 10),
      silabusNo: formState.silabusNo,
      kodeSubTugas: formState.kodeSubTugas,
      soalList: finalSoalList,
      SoalJSON: JSON.stringify(finalSoalList)
    };

    const updated = [newItem, ...bankSoalList];
    saveToDb(updated);
    setCreateModalOpen(false);
    showToast(`⏳ Menyimpan Paket "${newItem.mapel}" langsung ke Sheet BANK_SOAL & SOAL...`);

    try {
      const syncRes = await saveBankPackageDirect(newItem);
      if (syncRes.success) {
        showToast(`✅ Paket Bank Soal "${newItem.mapel}" berhasil disimpan langsung ke Sheet BANK_SOAL & SOAL!`);
      } else {
        showToast(`✅ Paket Bank Soal "${newItem.mapel}" tersimpan di aplikasi! Auto-save latar belakang aktif.`);
      }
    } catch {
      showToast(`✅ Paket Bank Soal "${newItem.mapel}" tersimpan di aplikasi!`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    const updated = bankSoalList.map(b => b.id === editModal.id ? { 
      ...b, 
      ...editModal,
      jumlahSoal: Number(editModal.jumlahSoal) || b.jumlahSoal,
      updatedAt: new Date().toISOString().slice(0, 10)
    } : b);
    saveToDb(updated);
    setEditModal(null);
    showToast(`⏳ Memperbarui Paket "${editModal.mapel}" ke Sheet BANK_SOAL...`);

    const updatedItem = updated.find(b => b.id === editModal.id);
    if (updatedItem) {
      try {
        await saveBankPackageDirect(updatedItem);
        showToast(`✅ Perubahan Paket "${editModal.mapel}" berhasil disimpan ke Sheet BANK_SOAL & SOAL!`);
      } catch {}
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const deletedName = deleteModal.name;
    const targetPkg = bankSoalList.find(b => b.id === deleteModal.id);
    const updated = bankSoalList.filter(b => b.id !== deleteModal.id);
    saveToDb(updated);
    setDeleteModal(null);
    setSelectedBankIds(prev => prev.filter(id => id !== deleteModal.id));
    showToast(`⏳ Menghapus paket dari Sheet BANK_SOAL...`);

    if (targetPkg) {
      try {
        await deleteBankPackageDirect(targetPkg);
        showToast(`✅ Paket "${deletedName}" berhasil dihapus dari aplikasi & Sheet BANK_SOAL.`);
      } catch {}
    }
  };

  // Checkbox Selection & Bulk Delete Helpers
  const selectedBankPackages = useMemo(() => {
    const set = new Set(selectedBankIds);
    return bankSoalList.filter(b => set.has(b.id));
  }, [bankSoalList, selectedBankIds]);

  const selectedBankTotalQuestions = useMemo(() => {
    return selectedBankPackages.reduce((acc, curr) => acc + (Number(curr.jumlahSoal) || (curr.soalList || []).length), 0);
  }, [selectedBankPackages]);

  const handleToggleSelectBank = (id: string) => {
    setSelectedBankIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllBanks = () => {
    const visibleIds = filteredList.map(b => b.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedBankIds.includes(id));
    if (allSelected) {
      setSelectedBankIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedBankIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedBankIds([]);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedBankIds.length === 0) return;
    const count = selectedBankIds.length;
    const deleteSet = new Set(selectedBankIds);
    const pkgsToDelete = bankSoalList.filter(b => deleteSet.has(b.id));
    const updated = bankSoalList.filter(b => !deleteSet.has(b.id));
    saveToDb(updated);
    setSelectedBankIds([]);
    setBulkDeleteModalOpen(false);
    showToast(`⏳ Menghapus & menyinkronkan ${count} paket bank soal ke Sheet BANK_SOAL...`);

    try {
      for (const p of pkgsToDelete) {
        await deleteBankPackageDirect(p);
      }
      showToast(`✅ Berhasil menghapus ${count} paket bank soal terpilih dari Spreadsheet.`);
    } catch {}
  };

  // Question Checkbox Selection & Deletion Helpers (inside Preview Modal)
  const handleToggleSelectQuestion = (qIndex: number) => {
    setSelectedQuestionIndices(prev => 
      prev.includes(qIndex) ? prev.filter(i => i !== qIndex) : [...prev, qIndex]
    );
  };

  const handleToggleSelectAllQuestions = () => {
    if (!previewModal || !previewModal.soalList) return;
    const allIndices = previewModal.soalList.map((_, idx) => idx);
    const allSelected = allIndices.length > 0 && allIndices.every(idx => selectedQuestionIndices.includes(idx));
    if (allSelected) {
      setSelectedQuestionIndices([]);
    } else {
      setSelectedQuestionIndices(allIndices);
    }
  };

  const handleDeleteSelectedQuestions = async () => {
    if (!previewModal || selectedQuestionIndices.length === 0) return;
    const count = selectedQuestionIndices.length;
    const delSet = new Set(selectedQuestionIndices);
    const remaining = (previewModal.soalList || [])
      .filter((_, idx) => !delSet.has(idx))
      .map((q, newIdx) => ({
        ...q,
        id: newIdx + 1,
        NomorSoal: newIdx + 1
      }));

    const nowIso = new Date().toISOString();
    const updatedBank = {
      ...previewModal,
      jumlahSoal: remaining.length,
      JumlahSoal: remaining.length,
      soalList: remaining,
      SoalJSON: JSON.stringify(remaining),
      updatedAt: nowIso,
      UpdatedAt: nowIso
    };

    const targetId = previewModal.id;
    const targetBankId = previewModal.BankSoalID;

    const updatedList = bankSoalList.map(b => {
      const isMatch = (b.id && (b.id === targetId || b.id === targetBankId)) ||
                      (b.BankSoalID && (b.BankSoalID === targetId || b.BankSoalID === targetBankId));
      return isMatch ? updatedBank : b;
    });

    saveToDb(updatedList);
    setPreviewModal(updatedBank);
    setSelectedQuestionIndices([]);
    showToast(`✅ Berhasil menghapus ${count} butir soal dari paket.`);
    try {
      for (const idx of Array.from(delSet)) {
        const targetQ = (previewModal.soalList || [])[idx];
        const qDetailId = (targetQ as any)?.DetailSoalID || `SOAL-${previewModal.BankSoalID || previewModal.id}-${idx + 1}`;
        await deleteQuestionDirect(updatedBank, qDetailId);
      }
    } catch {}
  };

  const handleDeleteSingleQuestion = async (qIndex: number) => {
    if (!previewModal) return;
    const remaining = (previewModal.soalList || [])
      .filter((_, idx) => idx !== qIndex)
      .map((q, newIdx) => ({
        ...q,
        id: newIdx + 1,
        NomorSoal: newIdx + 1
      }));

    const nowIso = new Date().toISOString();
    const updatedBank = {
      ...previewModal,
      jumlahSoal: remaining.length,
      JumlahSoal: remaining.length,
      soalList: remaining,
      SoalJSON: JSON.stringify(remaining),
      updatedAt: nowIso,
      UpdatedAt: nowIso
    };

    const targetId = previewModal.id;
    const targetBankId = previewModal.BankSoalID;

    const updatedList = bankSoalList.map(b => {
      const isMatch = (b.id && (b.id === targetId || b.id === targetBankId)) ||
                      (b.BankSoalID && (b.BankSoalID === targetId || b.BankSoalID === targetBankId));
      return isMatch ? updatedBank : b;
    });

    saveToDb(updatedList);
    setPreviewModal(updatedBank);
    setSelectedQuestionIndices(prev => prev.filter(i => i !== qIndex).map(i => i > qIndex ? i - 1 : i));
    showToast(`✅ Butir soal nomor ${qIndex + 1} berhasil dihapus.`);
    try {
      const targetQ = (previewModal.soalList || [])[qIndex];
      const qDetailId = (targetQ as any)?.DetailSoalID || `SOAL-${previewModal.BankSoalID || previewModal.id}-${qIndex + 1}`;
      await deleteQuestionDirect(updatedBank, qDetailId);
    } catch {}
  };

  // Clear all packages and questions from local DB & Google Sheets
  const handleClearAllBankSoal = async () => {
    setIsClearingAll(true);
    showToast('Sedang menghapus & mengosongkan seluruh paket Bank Soal...');
    try {
      localStorage.setItem('bank_soal_purged_user_request_8_160', 'true');
      setBankSoalList([]);
      db.set('cbt_bank_soal', []);
      db.set('BANK_SOAL', []);
      db.set('bank_soal', []);
      db.set('cbt_questions', []);
      db.set('cbt_exam_questions', []);
      db.set('soal', []);
      db.set('SOAL', []);
      setClearAllModalOpen(false);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions' } }));

      const pushRes = await autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL'], { forceTruncate: true });
      if (pushRes.success) {
        showToast('✅ Berhasil mengosongkan seluruh paket Bank Soal dan disinkronkan ke Google Sheets!');
      } else {
        showToast('✅ Seluruh paket Bank Soal lokal berhasil dihapus bersih (0 Paket / 0 Soal).');
      }
    } catch (err: any) {
      showToast('⚠️ Gagal mengosongkan Bank Soal: ' + (err?.message || err));
    } finally {
      setIsClearingAll(false);
    }
  };

  // Add Question to open bank modal
  const handleAddQuestionToBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewModal || !newQuestionText.trim()) return;

    const currentQuestions = previewModal.soalList || [];
    const newQ = {
      id: currentQuestions.length + 1,
      pertanyaan: newQuestionText,
      tipe: 'Pilihan Ganda' as const,
      pembahasan: newPembahasan.trim(),
      opsi: {
        a: newOpsiA || 'Pilihan A',
        b: newOpsiB || 'Pilihan B',
        c: newOpsiC || 'Pilihan C',
        d: newOpsiD || 'Pilihan D',
        ...(newOpsiE.trim() ? { e: newOpsiE.trim() } : {})
      },
      kunci: newQuestionKey,
      bobot: Number(newBobot) || 5
    };

    const updatedBank = {
      ...previewModal,
      jumlahSoal: currentQuestions.length + 1,
      soalList: [...currentQuestions, newQ]
    };

    const updatedList = bankSoalList.map(b => b.id === previewModal.id ? updatedBank : b);
    saveToDb(updatedList);
    setPreviewModal(updatedBank);

    // Reset inputs
    setNewQuestionText('');
    setNewOpsiA('');
    setNewOpsiB('');
    setNewOpsiC('');
    setNewOpsiD('');
    setNewOpsiE('');
    setNewPembahasan('');
    setNewBobot(5);
    setNewQuestionKey('a');

    showToast(`⏳ Menyimpan butir soal langsung ke Google Spreadsheet...`);
    try {
      const saveRes = await saveQuestionDirect(updatedBank, newQ, false);
      if (saveRes.success) {
        showToast(`✅ Butir soal nomor ${newQ.id} berhasil tersimpan langsung di Google Spreadsheet!`);
      } else {
        showToast(`⚠️ Butir soal tersimpan lokal (${saveRes.message || 'Antrean sinkronisasi aktif'})`);
      }
    } catch {
      showToast(`⚠️ Butir soal tersimpan lokal.`);
    }
  };

  // Penerapan bobot nilai cerdas otomatis ke seluruh butir soal paket
  const handleApplySmartWeights = async (weights: number[], summary: string) => {
    if (!previewModal) return;
    const currentQuestions = previewModal.soalList || [];
    if (currentQuestions.length === 0) {
      showToast('⚠️ Tidak ada butir soal dalam paket ini untuk diatur bobotnya.');
      return;
    }

    const updatedQuestions = currentQuestions.map((q, idx) => {
      const assignedWeight = weights[idx] !== undefined ? weights[idx] : (weights[weights.length - 1] || 5);
      return {
        ...q,
        bobot: assignedWeight,
        Bobot: assignedWeight
      };
    });

    const updatedBank = {
      ...previewModal,
      soalList: updatedQuestions,
      SoalJSON: JSON.stringify(updatedQuestions)
    };

    const updatedList = bankSoalList.map(b => b.id === previewModal.id ? updatedBank : b);
    saveToDb(updatedList);
    setPreviewModal(updatedBank);

    showToast(`⏳ Menyimpan bobot nilai cerdas ke Sheet BANK_SOAL & SOAL...`);
    try {
      await saveBankPackageDirect(updatedBank);
      Swal.fire({
        icon: 'success',
        title: 'Bobot Cerdas Berhasil Diterapkan!',
        html: `<div class="text-xs text-slate-600 text-left space-y-2">
          <p>Berhasil menerapkan bobot nilai cerdas pada <b>${updatedQuestions.length} butir soal</b> paket <b>${previewModal.mapel}</b>.</p>
          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold">
            ${summary}
          </div>
          <p class="text-slate-500">Perubahan bobot telah disimpan ke database dan disinkronkan secara langsung ke Sheet <code>BANK_SOAL</code> dan <code>SOAL</code>.</p>
        </div>`,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Bagus, Mengerti'
      });
    } catch (err: any) {
      showToast(`✅ Bobot berhasil diterapkan di aplikasi (${err?.message || ''})`);
    }
  };

  const handleAddBulkQuestionsToBank = async () => {
    if (!previewModal) return;
    if (!bulkPasteText.trim()) {
      showToast('⚠️ Tempelkan teks butir-butir soal terlebih dahulu.');
      return;
    }

    const parsed = parseBulkQuestions(bulkPasteText, 5);
    if (parsed.length === 0) {
      Swal.fire({
        title: 'Format Belum Terdeteksi',
        html: `<div class="text-xs text-slate-600 text-left space-y-2">
          <p>Sistem belum dapat mengenali butiran soal dari teks yang Anda tempelkan.</p>
          <p class="font-bold text-slate-800">Pastikan format teks mengikuti pola:</p>
          <pre class="p-2.5 bg-slate-100 rounded-lg text-[11px] font-mono text-slate-800 whitespace-pre-wrap">1. Pertanyaan soal nomor satu...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: A
Pembahasan: Uraian alasan (opsional)

2. Pertanyaan soal nomor dua...
A. Pilihan A
B. Pilihan B
C. Pilihan C
D. Pilihan D
Kunci: B</pre>
        </div>`,
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const currentQuestions = previewModal.soalList || [];
    const reindexedNewQuestions = parsed.map((q, idx) => ({
      ...q,
      id: currentQuestions.length + idx + 1
    }));

    const updatedQuestions = [...currentQuestions, ...reindexedNewQuestions];
    const updatedBank = {
      ...previewModal,
      jumlahSoal: updatedQuestions.length,
      JumlahSoal: updatedQuestions.length,
      soalList: updatedQuestions,
      SoalJSON: JSON.stringify(updatedQuestions)
    };

    const updatedList = bankSoalList.map(b => b.id === previewModal.id ? updatedBank : b);
    saveToDb(updatedList);
    setPreviewModal(updatedBank);
    setBulkPasteText('');
    setActiveQuestionTab('single');

    showToast(`⏳ Menyimpan ${parsed.length} butir soal langsung ke Google Spreadsheet...`);
    try {
      const bulkRes = await saveBulkQuestionsDirect(updatedBank, reindexedNewQuestions);
      if (bulkRes.success) {
        showToast(`✅ ${parsed.length} butir soal berhasil tersimpan langsung di Google Spreadsheet!`);
      } else {
        showToast(`⚠️ Butir soal tersimpan lokal (${bulkRes.message || 'Antrean aktif'})`);
      }
    } catch {
      showToast(`⚠️ Butir soal tersimpan lokal.`);
    }

    Swal.fire({
      title: 'Soal Berhasil Dibundel ke Paket!',
      html: `<p class="text-xs text-slate-700">Berhasil memproses dan menambahkan <b>${parsed.length} butir soal</b> ke dalam Paket <b>${previewModal.mapel}</b>.<br/>Total butir soal sekarang: <b>${updatedQuestions.length} soal</b>.<br/>Semua butir tersimpan dan disinkronkan ke Sheet <code>BANK_SOAL</code> & <code>SOAL</code>.</p>`,
      icon: 'success',
      confirmButtonColor: '#4f46e5'
    });
  };

  const handleClearAllQuestionsInPackage = async () => {
    if (!previewModal) return;
    const currentCount = (previewModal.soalList || []).length;
    if (currentCount === 0) {
      showToast('Paket soal ini sudah dalam kondisi kosong.');
      return;
    }

    const confirmRes = await Swal.fire({
      title: 'Kosongkan Butir Soal?',
      html: `<p class="text-xs text-slate-600">Apakah Anda yakin ingin menghapus seluruh <b>${currentCount} butir soal</b> di dalam Paket <b>${previewModal.mapel}</b> ini?<br/>Paket akan tetap ada dengan status kosong (0 butir soal), siap Anda isi dengan butiran soal buatan sendiri.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kosongkan Semua',
      cancelButtonText: 'Batal'
    });

    if (!confirmRes.isConfirmed) return;

    const updatedBank = {
      ...previewModal,
      jumlahSoal: 0,
      JumlahSoal: 0,
      soalList: [],
      SoalJSON: '[]'
    };

    const updatedList = bankSoalList.map(b => b.id === previewModal.id ? updatedBank : b);
    saveToDb(updatedList);
    setPreviewModal(updatedBank);
    setSelectedQuestionIndices([]);

    showToast(`⏳ Mengosongkan butir soal di Sheet SOAL & BANK_SOAL...`);
    try {
      await autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL']);
      showToast(`✅ Seluruh butir soal pada paket "${previewModal.mapel}" berhasil dikosongkan.`);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Quick Action */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileQuestion size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900">Manajemen Bank Soal & Kisi-Kisi</h2>
          </div>
          <p className="text-xs text-slate-500">
            Kumpulan paket soal pilihan ganda, isian, dan uraian terstandar Kurikulum Merdeka untuk asesmen harian & semester.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setClearAllModalOpen(true)}
            disabled={bankSoalList.length === 0 || isClearingAll || isPurging || isPushingSheets}
            className={`px-4 py-2.5 ${bankSoalList.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer text-white'} rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap`}
            title="Hapus dan kosongkan seluruh paket Bank Soal yang tersedia"
          >
            <Trash2 size={15} />
            <span>Hapus Semua Paket ({bankSoalList.length})</span>
          </button>

          <button
            onClick={handlePurgeDummySoal}
            disabled={isPurging || isPushingSheets}
            className={`px-4 py-2.5 ${isPurging ? 'bg-rose-800 opacity-80 cursor-wait' : 'bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer'} text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap`}
            title="Buang seluruh butir soal dummy dan paket template dari Bank Soal dan Google Sheets"
          >
            <Trash2 size={15} className={isPurging ? 'animate-spin' : ''} />
            <span>{isPurging ? 'Membuang Dummy...' : 'Buang Soal Dummy'}</span>
          </button>

          <button
            onClick={handleTwoWaySync}
            disabled={isTwoWaySyncing || isPullingSheets || isPushingSheets || isPurging}
            className={`px-4 py-2.5 ${isTwoWaySyncing ? 'bg-emerald-800 opacity-90 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'} text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap`}
            title="Sinkronisasi Dua Arah: Selaraskan data bolak-balik antara Aplikasi ERP KTCT dan Google Spreadsheet (Sheet BANK_SOAL & SOAL)"
          >
            <RefreshCw size={15} className={isTwoWaySyncing ? 'animate-spin' : ''} />
            <span>{isTwoWaySyncing ? 'Menyinkronkan 2 Arah...' : 'Sinkronisasi 2 Arah'}</span>
          </button>

          <button
            onClick={handlePushBankSoalToSheets}
            disabled={isPushingSheets || isPurging || isTwoWaySyncing}
            className={`px-4 py-2.5 ${isPushingSheets ? 'bg-indigo-800 opacity-80 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer'} text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap`}
            title="Kirim dan simpan seluruh paket Bank Soal dan butir soal ke Google Spreadsheet (Sheet BANK_SOAL dan Sheet SOAL)"
          >
            <UploadCloud size={15} className={isPushingSheets ? 'animate-bounce' : ''} />
            <span>{isPushingSheets ? 'Menyimpan ke Sheets...' : 'Simpan ke Sheet BANK_SOAL & SOAL'}</span>
          </button>

          <button
            onClick={handlePullBankSoalFromSheets}
            disabled={isPullingSheets || isPushingSheets || isPurging || isTwoWaySyncing}
            className={`px-4 py-2.5 ${isPullingSheets ? 'bg-teal-800 opacity-80 cursor-wait' : 'bg-teal-600 hover:bg-teal-700 active:scale-95 cursor-pointer'} text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap`}
            title="Tarik seluruh paket Bank Soal dan butir soal langsung dari Google Spreadsheet (Sheet BANK_SOAL dan Sheet SOAL)"
          >
            <DownloadCloud size={15} className={isPullingSheets ? 'animate-bounce' : ''} />
            <span>{isPullingSheets ? 'Menarik dari Sheets...' : 'Tarik dari Sheet BANK_SOAL & SOAL'}</span>
          </button>

          <button
            onClick={() => setGuideModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 whitespace-nowrap cursor-pointer"
            title="Panduan Lengkap: Cara Menyusun dan Menjadikan Butiran Soal Menjadi Paket Soal"
          >
            <HelpCircle size={16} />
            <span>Panduan Paket Soal</span>
          </button>

          <button
            onClick={() => {
              setPackageCreationMode('manual');
              setFormState({
                id: `BNK-${Math.floor(1000 + Math.random() * 9000)}`,
                mapel: '',
                kelas: '4',
                kurikulum: 'Kurikulum Merdeka',
                jumlahSoal: 0,
                tipeSoal: 'Pilihan Ganda',
                guru: teachers[0]?.name || 'Guru Mata Pelajaran',
                kesulitan: 'Sedang',
                status: 'Siap Digunakan',
                soalList: []
              });
              setCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus size={16} />
            <span>Buat Paket Bank Soal</span>
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bidirectional Sync Status & Control Bar */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-3xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <RefreshCw size={19} className={isTwoWaySyncing ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-900 text-sm">Sinkronisasi 2 Arah Aktif</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Google Sheets ↔ Aplikasi ERP KTCT
              </span>
              {autoSaveStatus === 'saving' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300 flex items-center gap-1.5 animate-pulse shadow-2xs">
                  <RefreshCw size={10} className="animate-spin text-amber-600" />
                  Menyimpan otomatis ke Sheet...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Tersimpan Otomatis ({lastAutoSaveTime} WIB)
                </span>
              )}
            </div>
            <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
              <span className="font-semibold text-emerald-900">Arah 1 (Aplikasi ➔ Spreadsheet):</span> Butir & paket soal tersimpan seketika ke Sheet <code>SOAL</code> & <code>BANK_SOAL</code>. | <span className="font-semibold text-indigo-900">Arah 2 (Spreadsheet ➔ Aplikasi):</span> Tarik pembaruan spreadsheet ke aplikasi kapan pun.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Sinkron: <span className="font-bold text-slate-700">{lastTwoWaySyncTime} WIB</span>
          </span>
          <button
            onClick={handleTwoWaySync}
            disabled={isTwoWaySyncing || isPullingSheets || isPushingSheets || isPurging}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Jalankan sinkronisasi bolak-balik: tarik data sheet & selaraskan seluruh paket lokal"
          >
            <RefreshCw size={13} className={isTwoWaySyncing ? 'animate-spin' : ''} />
            <span>{isTwoWaySyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari mata pelajaran, topik modul, kode bank, guru pembuat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. FILTER MATA PELAJARAN */}
            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className={`px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                filterMapel ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Semua Mata Pelajaran ({availableMapelList.length})</option>
              {availableMapelList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* 2. FILTER SUDAH DIJADWALKAN ATAU BELUM */}
            <select
              value={filterJadwal}
              onChange={(e) => setFilterJadwal(e.target.value as any)}
              className={`px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                filterJadwal 
                  ? filterJadwal === 'sudah' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-amber-50 border-amber-300 text-amber-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Semua Status Jadwal</option>
              <option value="sudah">✅ Sudah Terjadwal ({scheduleStats.scheduled})</option>
              <option value="belum">⏳ Belum Terjadwal ({scheduleStats.unscheduled})</option>
            </select>

            {/* 3. FILTER JENIS UJIANNYA APA */}
            <select
              value={filterJenisUjian}
              onChange={(e) => setFilterJenisUjian(e.target.value)}
              className={`px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                filterJenisUjian ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Semua Jenis Ujian</option>
              {availableJenisUjianList.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            {/* FILTER KELAS */}
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className={`px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                filterKelas ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
              ))}
            </select>

            {/* FILTER STATUS VERIFIKASI */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Semua Status</option>
              <option value="Siap Digunakan">Siap Digunakan</option>
              <option value="Sedang Ditelaah">Sedang Ditelaah</option>
              <option value="Draf">Draf</option>
            </select>

            {/* RESET FILTER BUTTON */}
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Reset seluruh penyaringan"
              >
                <X size={13} />
                <span>Reset Filter</span>
              </button>
            )}

            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              {filteredList.length} / {bankSoalList.length} Paket
            </span>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Filter size={12} className="text-slate-400" />
              <span>Filter Cepat:</span>
            </span>

            {/* Jadwal Quick Chips */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFilterJadwal('')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  !filterJadwal ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua ({bankSoalList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterJadwal('sudah')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterJadwal === 'sudah' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <CheckCircle2 size={10} />
                <span>Terjadwal ({scheduleStats.scheduled})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterJadwal('belum')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterJadwal === 'belum' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock size={10} />
                <span>Belum Terjadwal ({scheduleStats.unscheduled})</span>
              </button>
            </div>

            {/* Jenis Ujian Quick Chips dengan Pembedaan Kategori Ulangan */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              <span className="text-[10px] text-slate-400 font-bold ml-1 shrink-0">Kategori Ulangan:</span>
              {[
                { key: 'Sumatif Harian', label: 'Sumatif Harian' },
                { key: 'Sumatif Tengah Semester (STS)', label: 'STS' },
                { key: 'Sumatif Akhir Semester (SAS)', label: 'SAS / ASAS' },
                { key: 'Penilaian Akhir Tahun (PAT / SAT)', label: 'PAT/SAT' },
                { key: 'Ujian Sekolah (US)', label: 'Ujian Sekolah (US)' },
                { key: 'Try Out Asesmen Nasional (ANBK)', label: 'ANBK' },
                { key: 'Asesmen Formatif Harian', label: 'Formatif' },
                { key: 'Asesmen Diagnostik', label: 'Diagnostik' }
              ].map(t => {
                const isSel = filterJenisUjian === t.key;
                const count = jenisUjianStats[t.key] || 0;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterJenisUjian(isSel ? '' : t.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer border flex items-center gap-1 shrink-0 ${
                      isSel 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={`Saring butir soal khusus ${t.label} (Tersedia ${count} paket)`}
                  >
                    <span>{t.label}</span>
                    <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono ${isSel ? 'bg-purple-800 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {filterMapel && <span className="font-bold text-indigo-700 mr-2">Mapel: {filterMapel}</span>}
            {filterJenisUjian && <span className="font-bold text-purple-700 mr-2">Jenis: {filterJenisUjian}</span>}
            {filterJadwal && (
              <span className={`font-bold mr-2 ${filterJadwal === 'sudah' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {filterJadwal === 'sudah' ? '✓ Sudah Terjadwal' : '⏳ Belum Terjadwal'}
              </span>
            )}
          </div>
        </div>

        {/* Bulk Delete Selection Bar */}
        {selectedBankIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-50/90 border border-rose-200 rounded-2xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                <CheckSquare size={16} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-rose-950">
                    {selectedBankIds.length} Paket Soal Ditandai
                  </span>
                  <span className="px-2 py-0.5 bg-rose-200/70 text-rose-900 rounded-md text-[10px] font-bold">
                    Total {selectedBankTotalQuestions} Butir Soal
                  </span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Paket yang diceklis siap dihapus sekaligus dari sistem dan disinkronkan ke Google Sheets.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <X size={13} />
                <span>Batal Pilih</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 size={13} />
                <span>Hapus {selectedBankIds.length} Paket Terpilih</span>
              </button>
            </div>
          </div>
        )}

        {/* Bank Soal Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua paket bank soal"
                    checked={
                      filteredList.length > 0 &&
                      filteredList.every(b => selectedBankIds.includes(b.id))
                    }
                    onChange={handleToggleSelectAllBanks}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer transition accent-rose-600"
                    title="Cek lis semua paket yang tampil"
                  />
                </th>
                <th className="p-3.5">Mata Pelajaran & Topik</th>
                <th className="p-3.5">Kelas / Fase</th>
                <th className="p-3.5 text-center">Jenis Asesmen</th>
                <th className="p-3.5 text-center">Durasi</th>
                <th className="p-3.5 text-center">Status Jadwal CBT</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <FileQuestion size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Paket Soal Sesuai Filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAnyFilterActive 
                        ? 'Coba ubah atau reset filter mata pelajaran, jenis ujian, atau status jadwal.' 
                        : 'Buat paket bank soal baru dengan menekan tombol di atas.'}
                    </p>
                    {isAnyFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition"
                      >
                        <RefreshCw size={12} />
                        <span>Tampilkan Semua Paket Soal</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredList.map((b) => {
                  const linkedSession = getLinkedSessionForBank(b);
                  const isScheduled = Boolean(linkedSession);
                  const jenisUjian = getBankSoalJenisUjian(b, linkedSession);
                  const badgeInfo = getJenisUjianBadgeClass(jenisUjian);
                  const isSelected = selectedBankIds.includes(b.id);
                  const durasi = Number(b.durasi || b.Durasi || b.durasiMenit || (linkedSession?.durasiMenit || linkedSession?.durasi)) || 60;

                  return (
                    <tr 
                      key={b.id} 
                      className={`transition ${
                        isSelected 
                          ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3.5 pl-4 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Tandai paket ${b.id} untuk dihapus`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectBank(b.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer transition accent-rose-600"
                          title="Tandai untuk menghapus"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{b.mapel}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">({b.id})</span>
                        </div>
                        {b.topik && (
                          <div className="text-[11px] text-slate-600 truncate max-w-[260px] mt-0.5" title={b.topik}>
                            {b.topik}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {b.guru && <span>Penyusun: {b.guru} • </span>}Diperbarui: {b.updatedAt}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">{formatClassLabel(b.kelas, true)}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] border ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border} shadow-2xs whitespace-nowrap`}>
                          {jenisUjian}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 text-xs">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1 whitespace-nowrap text-slate-700">
                          <Clock size={12} className="text-slate-500" />
                          <span>{durasi} Menit</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isScheduled ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Sudah Terjadwal</span>
                            </span>
                            {linkedSession && (
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={`Sesi: ${linkedSession.judul || linkedSession.namaUjian || linkedSession.id}`}>
                                {linkedSession.tanggal || linkedSession.id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                              <Clock size={11} className="text-slate-400" />
                              <span>Belum Terjadwal</span>
                            </span>
                            <button
                              onClick={() => setIntegrateScheduleModal(b)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                            >
                              + Jadwalkan
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          b.status === 'Siap Digunakan'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : b.status === 'Sedang Ditelaah'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPreviewModal(b)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-2xs"
                            title="Lihat & Kelola Butir Soal"
                          >
                            <BookOpen size={13} />
                            <span>Butir Soal</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onNavigateTab) {
                                onNavigateTab('simulasi', { package: b, bankId: b.id, sesiId: b.ujianId, token: b.token });
                              } else {
                                setSandboxPackage(b);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Mulai Uji Coba CBT dengan paket soal ini"
                          >
                            <Play size={13} className="text-emerald-600 fill-emerald-500" />
                            <span className="hidden xl:inline">Uji Coba</span>
                          </button>
                          <button
                            onClick={() => {
                              if (isScheduled && onNavigateTab && b.ujianId) {
                                onNavigateTab('jadwal-ujian', { sesiId: b.ujianId });
                              } else {
                                setIntegrateScheduleModal(b);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-2xs ${
                              isScheduled 
                                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title={isScheduled ? 'Lihat Sesi Ujian di Jadwal CBT' : 'Hubungkan Paket Ini ke Jadwal Ujian CBT'}
                          >
                            <Calendar size={13} />
                            <span className="hidden xl:inline">{isScheduled ? 'Jadwal' : 'Jadwalkan'}</span>
                          </button>
                          <button
                            onClick={() => setEditModal({ ...b })}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs transition"
                            title="Edit Metadata"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ id: b.id, name: `${b.mapel} (${b.kelas})` })}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition"
                            title="Hapus Bank Soal"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LIHAT & KELOLA BUTIR SOAL */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">
                      Butir Soal: {previewModal.mapel} ({previewModal.kelas})
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${previewBadge.bg} ${previewBadge.text} ${previewBadge.border}`}>
                      {previewBadge.label} • {previewJenisUjian}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">Kode Bank: {previewModal.id} • Kategori: {previewJenisUjian}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxPackage(previewModal)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Uji coba kerjakan paket soal ini di Simulator CBT (Hanya simulasi dummy/sandbox, tidak disimpan ke spreadsheet)"
                >
                  <Play size={13} className="fill-white" />
                  <span className="hidden sm:inline">Uji Coba Simulasi</span>
                </button>
                <button 
                  onClick={() => setPreviewModal(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List of Questions */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  {(previewModal.soalList || []).length > 0 && (
                    <label 
                      className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 shadow-2xs transition shrink-0" 
                      title="Tandai / Cek lis semua butir soal"
                    >
                      <input 
                        type="checkbox" 
                        checked={
                          (previewModal.soalList || []).length > 0 && 
                          selectedQuestionIndices.length === (previewModal.soalList || []).length
                        } 
                        onChange={handleToggleSelectAllQuestions} 
                        className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600" 
                      />
                      <span>Pilih Semua ({selectedQuestionIndices.length}/{(previewModal.soalList || []).length})</span>
                    </label>
                  )}
                  <div>
                    <span className="font-bold text-slate-700 block">Daftar Pertanyaan & Kunci Jawaban</span>
                    <span className="text-[10px] text-slate-500">Dilengkapi kunci jawaban dan pembahasan rasional</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setSmartBobotModalOpen(true)}
                    disabled={(previewModal.soalList || []).length === 0}
                    className={`px-2.5 py-1 ${(previewModal.soalList || []).length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white cursor-pointer shadow-xs'} rounded-lg text-[10px] font-bold flex items-center gap-1 transition`}
                    title="Buka Fitur Cerdas untuk Menghitung & Mengatur Bobot Nilai Otomatis"
                  >
                    <Zap size={12} className="text-amber-300 fill-amber-300" />
                    <span>Atur Bobot Cerdas</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllQuestionsInPackage}
                    disabled={(previewModal.soalList || []).length === 0}
                    className={`px-2.5 py-1 ${(previewModal.soalList || []).length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-100 hover:bg-rose-200 text-rose-900 cursor-pointer'} rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs`}
                    title="Kosongkan seluruh butir soal di dalam paket ini (kembali ke 0 butir)"
                  >
                    <Trash2 size={12} className="text-rose-600" />
                    <span>Kosongkan Soal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrateScheduleModal(previewModal)}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Hubungkan Paket Ini ke Sesi Jadwal Ujian CBT"
                  >
                    <Calendar size={12} className="text-emerald-700" />
                    <span>Hubungkan ke Jadwal</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md whitespace-nowrap">
                      {(previewModal.soalList || []).length} Soal
                    </span>
                    {(previewModal.soalList || []).length > 0 && (
                      <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] flex items-center gap-1 whitespace-nowrap border ${
                        Math.round(previewTotalBobot) === 100 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        <span>Bobot: {previewTotalBobot.toFixed(1).replace('.0', '')}/100</span>
                        {Math.round(previewTotalBobot) === 100 ? (
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={11} className="text-amber-600" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Peringatan & Rekomendasi Bobot Cerdas */}
              {(previewModal.soalList || []).length > 0 && Math.round(previewTotalBobot) !== 100 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap size={15} className="fill-amber-500 text-amber-500" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Akumulasi bobot paket ini saat ini {previewTotalBobot.toFixed(1).replace('.0', '')} Poin (Belum pas 100 Poin).
                      </span>
                      <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                        💡 Rekomendasi Cerdas: {getSmartWeightExplanation((previewModal.soalList || []).length, 100)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmartBobotModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Zap size={13} className="text-amber-300 fill-amber-300" />
                    <span>Atur Bobot Cerdas</span>
                  </button>
                </div>
              )}

              {/* Bar Hapus Butir Soal Terpilih jika ada yang diceklis */}
              {selectedQuestionIndices.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <CheckSquare size={15} className="text-rose-600" />
                    <span>{selectedQuestionIndices.length} butir soal ditandai untuk dihapus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionIndices([])}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedQuestions}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Hapus {selectedQuestionIndices.length} Soal Terpilih</span>
                    </button>
                  </div>
                </div>
              )}

              {(previewModal.soalList || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <HelpCircle size={28} className="mx-auto text-slate-300 mb-1.5" />
                  <p className="font-bold text-slate-600">Belum Ada Butir Soal Terinput</p>
                  <p className="text-[11px] text-slate-400">Gunakan formulir di bawah untuk menambahkan pertanyaan baru.</p>
                </div>
              ) : (
                previewModal.soalList?.map((q, idx) => {
                  const isQSelected = selectedQuestionIndices.includes(idx);
                  return (
                  <div 
                    key={q.id || idx} 
                    className={`p-4 rounded-2xl bg-white border shadow-xs space-y-3 transition ${
                      isQSelected ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer" title="Cek lis butir soal ini untuk dihapus">
                          <input
                            type="checkbox"
                            checked={isQSelected}
                            onChange={() => handleToggleSelectQuestion(idx)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer accent-rose-600"
                          />
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </label>
                        {/* Pembeda Jenis Ulangan untuk setiap butir soal */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${previewBadge.bg} ${previewBadge.text} ${previewBadge.border}`}>
                          {previewJenisUjian}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                          {q.tipe}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-bold">
                          Bobot: {Number(q.bobot) || 5} Poin
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleQuestion(idx)}
                          className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                          title="Hapus butir soal nomor ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="font-bold text-slate-900 text-sm leading-relaxed">
                      {q.pertanyaan}
                    </p>

                    {q.opsi && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {Object.entries(q.opsi).map(([key, optText]) => {
                          const isCorrect = q.kunci.toLowerCase() === key.toLowerCase();
                          return (
                            <div 
                              key={key} 
                              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                                isCorrect 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black uppercase ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {key}
                              </span>
                              <span className="flex-1">{optText}</span>
                              {isCorrect && <Check size={14} className="text-emerald-600 font-bold" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })
              )}

              {/* Tab Selector: Input Satu Soal vs Tempel Massal (Bulk Paste) */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <h4 className="font-black text-slate-900 text-xs">Tambah Butir Soal ke Paket Ini</h4>
                  </div>
                  <div className="flex p-1 bg-white border border-indigo-200 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveQuestionTab('single')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeQuestionTab === 'single'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Plus size={13} />
                      <span>Input Satu Soal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQuestionTab('bulk')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeQuestionTab === 'bulk'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud size={13} />
                      <span>Tempel Sekaligus (Bulk Paste)</span>
                    </button>
                  </div>
                </div>

                {activeQuestionTab === 'single' ? (
                  <form onSubmit={handleAddQuestionToBank} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Teks Pertanyaan / Stimulus Pedagogis
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Tuliskan teks pertanyaan soal..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Bobot Poin Soal
                        </label>
                        <span className="text-[10px] text-indigo-600 font-bold">
                          💡 Rekomendasi Cerdas:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.01"
                          value={newBobot}
                          onChange={(e) => setNewBobot(Number(e.target.value) || 5)}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                        />
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setNewBobot(calculateSmartWeight((previewModal.soalList || []).length + 1, 100))}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Sesuaikan otomatis agar total poin paket genap 100"
                          >
                            Otomatis ({calculateSmartWeight((previewModal.soalList || []).length + 1, 100)} Poin)
                          </button>
                          {[
                            { n: 10, w: 10 },
                            { n: 20, w: 5 },
                            { n: 25, w: 4 },
                            { n: 30, w: 3.33 },
                            { n: 40, w: 2.5 },
                            { n: 50, w: 2 }
                          ].map(p => (
                            <button
                              key={p.n}
                              type="button"
                              onClick={() => setNewBobot(p.w)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                newBobot === p.w 
                                  ? 'bg-indigo-600 text-white font-bold' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                              title={`${p.n} soal total skor 100`}
                            >
                              {p.n} Soal: {p.w}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opsi A</span>
                        <input
                          type="text"
                          placeholder="Teks pilihan A"
                          value={newOpsiA}
                          onChange={(e) => setNewOpsiA(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opsi B</span>
                        <input
                          type="text"
                          placeholder="Teks pilihan B"
                          value={newOpsiB}
                          onChange={(e) => setNewOpsiB(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opsi C</span>
                        <input
                          type="text"
                          placeholder="Teks pilihan C"
                          value={newOpsiC}
                          onChange={(e) => setNewOpsiC(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opsi D</span>
                        <input
                          type="text"
                          placeholder="Teks pilihan D"
                          value={newOpsiD}
                          onChange={(e) => setNewOpsiD(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Opsi E (SMA/SMK)</span>
                        <input
                          type="text"
                          placeholder="Teks pilihan E (opsional jika SD/SMP)"
                          value={newOpsiE}
                          onChange={(e) => setNewOpsiE(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Kunci Penjelasan / Pembahasan Rasional
                      </label>
                      <input
                        type="text"
                        placeholder="Uraian pembahasan mengapa kunci jawaban tersebut benar..."
                        value={newPembahasan}
                        onChange={(e) => setNewPembahasan(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Kunci Jawaban Benar:</span>
                        <select
                          value={newQuestionKey}
                          onChange={(e) => setNewQuestionKey(e.target.value as any)}
                          className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-indigo-700"
                        >
                          <option value="a">A</option>
                          <option value="b">B</option>
                          <option value="c">C</option>
                          <option value="d">D</option>
                          <option value="e">E</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Simpan Butir Soal</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-3 bg-white border border-indigo-200/80 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-600" />
                        Cara Menjadikan Butiran Soal Menjadi Paket Sekaligus:
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Cukup tempelkan teks butir-butir soal yang sudah Anda ketik dari Microsoft Word, Google Docs, atau Notepad ke kotak di bawah. Sistem akan otomatis mendeteksi pertanyaan, opsi A-D/E, kunci jawaban, dan pembahasan.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Tempel Teks Butir Soal di Sini:
                        </label>
                        {bulkPasteText.trim() && (
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            Terdeteksi: {parseBulkQuestions(bulkPasteText, 5).length} Butir Soal
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={7}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={`Contoh format:\n1. Siapakah proklamator kemerdekaan Republik Indonesia?\nA. Ir. Soekarno dan Drs. Moh. Hatta\nB. Ki Hajar Dewantara\nC. Jenderal Soedirman\nD. B.J. Habibie\nKunci: A\nPembahasan: Ir. Soekarno dan Drs. Moh. Hatta membacakan proklamasi 17 Agustus 1945.\n\n2. Lambang negara Indonesia adalah...\nA. Garuda Pancasila\nB. Bendera Merah Putih\nC. Pohon Beringin\nD. Monas\nKunci: A`}
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setBulkPasteText('')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Bersihkan Kolom
                      </button>

                      <button
                        type="button"
                        onClick={handleAddBulkQuestionsToBank}
                        disabled={!bulkPasteText.trim()}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                          bulkPasteText.trim()
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <UploadCloud size={15} />
                        <span>Konversi & Bundel Menjadi Paket ({parseBulkQuestions(bulkPasteText, 5).length} Soal)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setPreviewModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Tampilan Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FITUR CERDAS ATUR BOBOT NILAI */}
      {smartBobotModalOpen && previewModal && (
        <SmartBobotModal
          isOpen={smartBobotModalOpen}
          onClose={() => setSmartBobotModalOpen(false)}
          currentPackageTitle={`${previewModal.mapel} (${formatClassLabel(previewModal.kelas, true)})`}
          currentPackageId={previewModal.id}
          currentQuestionCount={(previewModal.soalList || []).length}
          currentQuestions={previewModal.soalList || []}
          onApplyWeights={handleApplySmartWeights}
        />
      )}

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileQuestion size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Buat Paket Bank Soal Baru</h3>
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBank} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Info Wadah Paket Soal Manual Bersih */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <Check size={15} className="text-emerald-600" />
                  Wadah Paket Soal Asli Guru (Tanpa Soal Otomatis)
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Paket akan dibuat dalam keadaan bersih. Anda dapat memasukkan butir-butir soal resmi Anda sendiri—baik satu per satu atau langsung ditempel (bulk paste) dari naskah dokumen Anda.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={formState.mapel}
                  onChange={(e) => setFormState({ ...formState, mapel: e.target.value })}
                  placeholder="Misal: Pendidikan Pancasila, Bahasa Indonesia, IPAS"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas / Tingkat</label>
                  <select
                    value={formState.kelas}
                    onChange={(e) => setFormState({ ...formState, kelas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kurikulum</label>
                  <select
                    value={formState.kurikulum}
                    onChange={(e) => setFormState({ ...formState, kurikulum: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                    <option value="Kurikulum 2013">Kurikulum 2013</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Target Jumlah Soal</label>
                  <input
                    type="number"
                    value={formState.jumlahSoal}
                    onChange={(e) => setFormState({ ...formState, jumlahSoal: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Komposisi Bentuk Soal</label>
                  <input
                    type="text"
                    value={formState.tipeSoal}
                    onChange={(e) => setFormState({ ...formState, tipeSoal: e.target.value })}
                    placeholder="25 PG, 5 Esai"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Guru Penyusun / Penelaah</label>
                <select
                  value={formState.guru}
                  onChange={(e) => setFormState({ ...formState, guru: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {teachers.map((t, idx) => (
                    <option key={t.id ? `bs-t-${t.id}-${idx}` : `bs-t-${idx}`} value={t.name}>{t.name} ({t.nip || 'Guru'})</option>
                  ))}
                  <option value="Tim MGMP / KKG">Tim MGMP / KKG Sekolah</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Paket Bank Soal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Edit Bank Soal: {editModal.mapel}</h3>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mata Pelajaran</label>
                <input
                  type="text"
                  value={editModal.mapel}
                  onChange={(e) => setEditModal({ ...editModal, mapel: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas</label>
                  <select
                    value={editModal.kelas || ''}
                    onChange={(e) => setEditModal({ ...editModal, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status</label>
                  <select
                    value={editModal.status}
                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Siap Digunakan">Siap Digunakan</option>
                    <option value="Sedang Ditelaah">Sedang Ditelaah</option>
                    <option value="Draf">Draf</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jenis Ujian / Asesmen</label>
                  <select
                    value={editModal.jenisUjian || 'Sumatif Tengah Semester (STS)'}
                    onChange={(e) => setEditModal({ ...editModal, jenisUjian: e.target.value, JenisUjian: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {STANDARD_JENIS_UJIAN_LIST.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Semester</label>
                  <select
                    value={editModal.semester || '1 (Ganjil)'}
                    onChange={(e) => setEditModal({ ...editModal, semester: e.target.value, Semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="1 (Ganjil)">Semester 1 (Ganjil)</option>
                    <option value="2 (Genap)">Semester 2 (Genap)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jumlah Soal</label>
                  <input
                    type="number"
                    value={editModal.jumlahSoal}
                    onChange={(e) => setEditModal({ ...editModal, jumlahSoal: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Guru Penyusun</label>
                  <input
                    type="text"
                    value={editModal.guru}
                    onChange={(e) => setEditModal({ ...editModal, guru: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Paket Bank Soal</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus paket bank soal <strong className="text-slate-800">"{deleteModal.name}"</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Hapus {selectedBankIds.length} Paket Bank Soal Terpilih?
              </h3>
              <p className="text-xs text-slate-500">
                Tindakan ini akan menghapus paket terpilih beserta total <strong className="text-slate-800">{selectedBankTotalQuestions} butir soal</strong> di dalamnya secara permanen dan menyinkronkan ke Google Sheets.
              </p>
            </div>

            {/* List of packages to delete */}
            <div className="max-h-48 overflow-y-auto rounded-2xl bg-slate-50 p-3 border border-slate-200/80 space-y-2 text-xs">
              {selectedBankPackages.map(b => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900">{b.mapel} ({b.kelas})</div>
                    <div className="text-[10px] text-slate-400 font-mono">Kode: {b.id}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px] border border-rose-100">
                    {b.jumlahSoal || (b.soalList || []).length} Soal
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus {selectedBankIds.length} Paket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {clearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">Hapus Semua Paket Bank Soal</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus dan mengosongkan seluruh <strong className="text-rose-600">{bankSoalList.length} Paket</strong> Bank Soal ({bankSoalList.reduce((acc, curr) => acc + (Number(curr.jumlahSoal) || curr.soalList?.length || 0), 0)} butir soal)?
              </p>
              <p className="text-[11px] text-slate-400">
                Tindakan ini akan mengosongkan seluruh butir soal dari aplikasi dan memperbarui Sheet <code>BANK_SOAL</code> & <code>SOAL</code> di Google Spreadsheet.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setClearAllModalOpen(false)}
                disabled={isClearingAll}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllBankSoal}
                disabled={isClearingAll}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={14} className={isClearingAll ? 'animate-spin' : ''} />
                <span>{isClearingAll ? 'Menghapus...' : 'Ya, Hapus Semua'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATE WITH CBT EXAM SCHEDULE MODAL */}
      {integrateScheduleModal && (() => {
        const rawUjian = (db.get('ujian_cbt') as any[]) || [];
        const normMapel = String(integrateScheduleModal.mapel).toLowerCase();
        const normKelas = String(integrateScheduleModal.kelas).replace(/[A-Za-z]/g, '').trim();

        // Matching sessions in ujian_cbt
        const matchingSessions = rawUjian.filter((u: any) => {
          const uMapel = String(u.mapel || '').toLowerCase();
          const uKelas = String(u.kelas || '').replace(/[A-Za-z]/g, '').trim();
          return uMapel.includes(normMapel) || normMapel.includes(uMapel) || (normKelas && uKelas === normKelas);
        });

        const otherSessions = rawUjian.filter((u: any) => !matchingSessions.includes(u));

        const handleConnectToSession = async (sesiId: string) => {
          const ok = linkBankSoalToSession(integrateScheduleModal.id, sesiId);
          if (ok) {
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Dihubungkan!',
              text: `Paket soal "${integrateScheduleModal.mapel}" berhasil disambungkan ke jadwal sesi ${sesiId}. Siswa dapat langsung mengerjakan soal pada sesi ini.`,
              timer: 3000,
              showConfirmButton: false
            });
            setIntegrateScheduleModal(null);
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Gagal Menghubungkan',
              text: 'Gagal menghubungkan paket soal ke sesi jadwal yang dipilih.'
            });
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Hubungkan Paket Soal ke Jadwal Ujian CBT
                    </h3>
                    <p className="text-xs text-slate-500">
                      Paket: <span className="font-bold text-slate-700">{integrateScheduleModal.mapel}</span> (Kelas {integrateScheduleModal.kelas}) • {integrateScheduleModal.soalList?.length || integrateScheduleModal.jumlahSoal || 20} Butir Soal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIntegrateScheduleModal(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Info Card */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl text-emerald-900">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">
                        Pilih Sesi Ujian di Bawah untuk Mengaktifkan Soal Bagi Siswa
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Ketika dihubungkan, token ujian dari sesi tersebut akan secara otomatis memuat {integrateScheduleModal.soalList?.length || 20} butir soal pilihan ganda dari paket ini saat siswa menekan &apos;Mulai Ujian&apos;.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sesi yang Cocok (Rekomendasi) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-600" />
                      Sesi Ujian yang Sesuai ({matchingSessions.length} Sesi Terdeteksi)
                    </h4>
                    <span className="text-[10px] text-slate-400">Mapel & Kelas Sesuai</span>
                  </div>

                  {matchingSessions.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                      <p className="font-medium text-slate-600">Tidak ada sesi otomatis yang cocok dengan mapel & kelas ini.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Anda dapat memilih sesi lain di daftar bawah.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {matchingSessions.map((sesi: any) => {
                        const isAlreadyLinked = sesi.bankSoalId === integrateScheduleModal.id;
                        const hasOtherLink = sesi.bankSoalId && sesi.bankSoalId !== integrateScheduleModal.id;

                        return (
                          <div 
                            key={sesi.id} 
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                              isAlreadyLinked
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-xs truncate">
                                  {sesi.mapel}
                                </span>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                                  {sesi.kelas}
                                </span>
                                {isAlreadyLinked && (
                                  <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[9px] rounded-full">
                                    Sedang Terhubung
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{sesi.tglDisplay || sesi.tgl}</span>
                                <span>•</span>
                                <span className="font-mono text-cyan-700 font-bold">Token: {sesi.token}</span>
                                {hasOtherLink && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-600 font-medium">Terhubung ke: {sesi.bankSoalId}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleConnectToSession(sesi.id)}
                              disabled={isAlreadyLinked}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs shrink-0 flex items-center gap-1 ${
                                isAlreadyLinked
                                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isAlreadyLinked ? (
                                <>
                                  <Check size={13} />
                                  <span>Terhubung</span>
                                </>
                              ) : (
                                <span>Hubungkan Sesi Ini</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pilih dari Sesi Lain */}
                {otherSessions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="font-bold text-slate-800 text-xs block">
                      Atau Pilih Sesi Jadwal Ujian Lainnya ({otherSessions.length} Sesi):
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="selectOtherSession"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        defaultValue=""
                      >
                        <option value="" disabled>-- Pilih Sesi Ujian --</option>
                        {otherSessions.map((u: any) => (
                          <option key={`other-${u.id}`} value={u.id}>
                            [{u.id}] {u.mapel} - {u.kelas} ({u.tglDisplay || u.tgl}) | Token: {u.token}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('selectOtherSession') as HTMLSelectElement;
                          if (el && el.value) {
                            handleConnectToSession(el.value);
                          } else {
                            showToast('Silakan pilih sesi terlebih dahulu');
                          }
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition shrink-0"
                      >
                        Hubungkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIntegrateScheduleModal(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PANDUAN LENGKAP: CARA MENJADIKAN BUTIRAN SOAL MENJADI PAKET SOAL */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Panduan: Menjadikan Butiran Soal Menjadi Paket Bank Soal</h3>
                  <p className="text-xs text-slate-500">Langkah mudah mengelola soal buatan sendiri tanpa dummy atau auto-generate</p>
                </div>
              </div>
              <button 
                onClick={() => setGuideModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* Step 1 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-900 font-black text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                  <h4>Buat Paket Wadah Bank Soal</h4>
                </div>
                <p className="pl-8 text-slate-600">
                  Klik tombol <strong>+ Buat Paket Bank Soal</strong> di pojok kanan atas. Pilih mode <strong>Input Soal Sendiri (Paket Kosong)</strong>, isi nama Mata Pelajaran, tingkat Kelas, dan nama Guru Pengampu. Paket baru akan tersimpan dalam keadaan bersih (0 butir soal).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                  <h4>Memasukkan Butiran Soal ke Dalam Paket</h4>
                </div>
                <p className="pl-8 text-slate-600 mb-2">
                  Buka paket yang baru dibuat dengan menekan tombol <strong>Detail & Kelola Butir Soal</strong>. Anda memiliki 2 metode:
                </p>

                <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1">
                    <span className="font-bold text-indigo-900 block flex items-center gap-1">
                      <UploadCloud size={14} className="text-indigo-600" />
                      Metode A: Tempel Sekaligus (Paling Cepat)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Pilih tab <strong>Tempel Sekaligus (Bulk Paste)</strong>. Salin seluruh naskah soal Anda dari Word/Notepad lalu tempel ke kotak. Sistem membaca nomor soal, opsi A-D, dan kunci jawaban secara instan!
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1">
                    <span className="font-bold text-indigo-900 block flex items-center gap-1">
                      <Plus size={14} className="text-indigo-600" />
                      Metode B: Ketik Satu per Satu
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Pilih tab <strong>Input Satu Soal</strong>. Masukkan teks pertanyaan, opsi jawaban A-D/E, tentukan kunci jawaban, lalu klik <strong>Simpan Butir Soal</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                  <h4>Hubungkan Paket ke Jadwal Ujian CBT Siswa</h4>
                </div>
                <p className="pl-8 text-slate-600">
                  Di dalam modal paket, klik tombol hijau <strong>Hubungkan ke Jadwal</strong>. Pilih sesi ujian yang sedang aktif atau yang akan datang. Siswa yang login dan memasukkan Token Ujian di portal CBT akan otomatis mengerjakan butiran soal dari paket ini.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
                  <h4>Penyimpanan Aman ke Google Spreadsheet</h4>
                </div>
                <p className="pl-8 text-slate-600">
                  Semua paket dan butiran soal yang Anda buat tersimpan di database lokal browser dan otomatis disinkronkan ke Sheet <strong>BANK_SOAL</strong> dan Sheet <strong>SOAL</strong> di Google Spreadsheet Anda tanpa perantara pihak ketiga.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 italic">
                * Anda juga dapat mengosongkan soal atau menghapus soal yang tidak sesuai kapan saja.
              </span>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SIMULASI CBT SANDBOX (UJI COBA TANPA SIMPAN KE DATABASE / GOOGLE SHEETS) */}
      {sandboxPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Play size={18} className="fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">Uji Coba Simulator CBT (Sandbox)</h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold">
                      Hanya Uji Coba / Dummy
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Mengerjakan butir soal paket <b>{sandboxPackage.mapel || sandboxPackage.judul}</b> dalam mode sandbox. Hasil tidak akan disimpan ke Spreadsheet sekolah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSandboxPackage(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                title="Tutup simulator"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1">
              <SimulasiUjianTab 
                initialPackage={sandboxPackage}
                onClose={() => setSandboxPackage(null)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
