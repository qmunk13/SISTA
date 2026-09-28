import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { 
  X, Printer, Download, Image as ImageIcon, FileText, 
  Send, Copy, Check, MessageSquare, AlertTriangle, 
  CheckCircle2, Users, HeartPulse, Clock, Sparkles, 
  ChevronRight, Phone, ShieldCheck, RefreshCw, Percent,
  Calendar, Star, Filter, Eye, GraduationCap, Layers
} from 'lucide-react';
import { formatClassLabel, triggerPrint } from '../../lib/utils';
import { StudentAttendanceStat } from './PersentaseAbsensiTab';
import StudentPhoto from './StudentPhoto';
import CustomDropdown from '../common/CustomDropdown';

export interface JenjangInfo {
  type: 'PAKET_A' | 'PAKET_B' | 'PAKET_C' | 'ALL';
  label: 'Paket A' | 'Paket B' | 'Paket C' | 'Semua Jenjang' | 'Paket A / B / C';
  colorName: 'merah' | 'biru' | 'kuning' | 'indigo';
  bannerBg: string;
  badgeBg: string;
  subtextColor: string;
  rateColor: string;
  pillColor: string;
}

export function detectJenjangFromStr(classStr: string): 'PAKET_A' | 'PAKET_B' | 'PAKET_C' | null {
  const str = String(classStr || '').trim().toUpperCase();
  if (!str) return null;

  // Explicit keywords
  if (str.includes('PAKET A') || str.includes('PAKET-A') || str.includes('PAKETA') || str.includes('SD') || str.includes('IBTIDAIYAH') || str.includes('MI')) {
    return 'PAKET_A';
  }
  if (str.includes('PAKET B') || str.includes('PAKET-B') || str.includes('PAKETB') || str.includes('SMP') || str.includes('MTS') || str.includes('TSANAWIYAH')) {
    return 'PAKET_B';
  }
  if (str.includes('PAKET C') || str.includes('PAKET-C') || str.includes('PAKETC') || str.includes('SMA') || str.includes('SMK') || str.includes('MA') || str.includes('ALIYAH')) {
    return 'PAKET_C';
  }

  // Roman numerals
  if (/^(IV|V|VI)($|[^A-Z0-9])/i.test(str)) return 'PAKET_A';
  if (/^(VII|VIII|IX)($|[^A-Z0-9])/i.test(str)) return 'PAKET_B';
  if (/^(X|XI|XII)($|[^A-Z0-9])/i.test(str)) return 'PAKET_C';

  // Numeric check (1-6 -> Paket A, 7-9 -> Paket B, 10-12 -> Paket C)
  const numMatch = str.match(/\b(1[0-2]|[1-9])\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 6) return 'PAKET_A';
    if (num >= 7 && num <= 9) return 'PAKET_B';
    if (num >= 10 && num <= 12) return 'PAKET_C';
  }

  // Start with numbers check like "9A", "7-B", "10 IPA"
  const startNumMatch = str.match(/^([0-9]+)/);
  if (startNumMatch) {
    const num = parseInt(startNumMatch[1], 10);
    if (num >= 1 && num <= 6) return 'PAKET_A';
    if (num >= 7 && num <= 9) return 'PAKET_B';
    if (num >= 10 && num <= 12) return 'PAKET_C';
  }

  return null;
}

export function getJenjangInfo(selectedClass: string, studentStats: StudentAttendanceStat[] = []): JenjangInfo {
  let detectedType: 'PAKET_A' | 'PAKET_B' | 'PAKET_C' | 'ALL' = 'ALL';

  if (selectedClass && selectedClass !== 'ALL' && selectedClass !== 'Semua' && selectedClass !== 'Semua Kelas') {
    const single = detectJenjangFromStr(selectedClass);
    if (single) detectedType = single;
  } else if (studentStats.length > 0) {
    const counts = { PAKET_A: 0, PAKET_B: 0, PAKET_C: 0 };
    studentStats.forEach(s => {
      const t = detectJenjangFromStr(s.class);
      if (t) counts[t]++;
    });
    if (counts.PAKET_A > 0 && counts.PAKET_B === 0 && counts.PAKET_C === 0) detectedType = 'PAKET_A';
    else if (counts.PAKET_B > 0 && counts.PAKET_A === 0 && counts.PAKET_C === 0) detectedType = 'PAKET_B';
    else if (counts.PAKET_C > 0 && counts.PAKET_A === 0 && counts.PAKET_B === 0) detectedType = 'PAKET_C';
    else if (counts.PAKET_A > counts.PAKET_B && counts.PAKET_A > counts.PAKET_C) detectedType = 'PAKET_A';
    else if (counts.PAKET_B > counts.PAKET_A && counts.PAKET_B > counts.PAKET_C) detectedType = 'PAKET_B';
    else if (counts.PAKET_C > counts.PAKET_A && counts.PAKET_C > counts.PAKET_B) detectedType = 'PAKET_C';
  }

  // PAKET A : MERAH
  if (detectedType === 'PAKET_A') {
    return {
      type: 'PAKET_A',
      label: 'Paket A',
      colorName: 'merah',
      bannerBg: 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white',
      badgeBg: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
      subtextColor: 'text-rose-100',
      rateColor: 'text-amber-300',
      pillColor: 'bg-rose-600/30 text-rose-200 border-rose-400/30'
    };
  }

  // PAKET B : BIRU
  if (detectedType === 'PAKET_B') {
    return {
      type: 'PAKET_B',
      label: 'Paket B',
      colorName: 'biru',
      bannerBg: 'bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white',
      badgeBg: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
      subtextColor: 'text-indigo-100',
      rateColor: 'text-emerald-300',
      pillColor: 'bg-blue-600/30 text-blue-200 border-blue-400/30'
    };
  }

  // PAKET C : KUNING / GOLD AMBER
  if (detectedType === 'PAKET_C') {
    return {
      type: 'PAKET_C',
      label: 'Paket C',
      colorName: 'kuning',
      bannerBg: 'bg-gradient-to-r from-amber-900 via-yellow-800 to-amber-950 text-white',
      badgeBg: 'bg-yellow-400/25 text-yellow-100 border-yellow-300/40',
      subtextColor: 'text-amber-100',
      rateColor: 'text-yellow-200',
      pillColor: 'bg-yellow-600/30 text-yellow-100 border-yellow-300/30'
    };
  }

  return {
    type: 'ALL',
    label: 'Semua Jenjang',
    colorName: 'indigo',
    bannerBg: 'bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-900 text-white',
    badgeBg: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/30',
    subtextColor: 'text-indigo-100',
    rateColor: 'text-emerald-400',
    pillColor: 'bg-indigo-600/30 text-indigo-200 border-indigo-400/30'
  };
}

export function getCleanClassDisplay(selectedClass: string | null | undefined): string {
  if (!selectedClass || selectedClass === 'ALL' || selectedClass === 'Semua' || selectedClass === 'Semua Kelas') {
    return 'Semua Kelas';
  }
  return formatClassLabel(selectedClass, false);
}

export interface A4PageChunk {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  students: StudentAttendanceStat[];
  startIndex: number;
}

export type PaperSize = 'F4' | 'A4';
export type PageCapacityOption = '22' | '20' | '25' | '30' | 'auto';

export function paginateStudents(
  students: StudentAttendanceStat[],
  capacity: PageCapacityOption = '22',
  paperSize: PaperSize = 'F4',
  isInfografis: boolean = false
): A4PageChunk[] {
  const total = students.length;
  if (total === 0) {
    return [{
      pageNumber: 1,
      totalPages: 1,
      isFirstPage: true,
      isLastPage: true,
      students: [],
      startIndex: 0
    }];
  }

  // If a fixed capacity is selected (e.g. 22, 20, 25, 30 students per page)
  if (capacity !== 'auto') {
    const perPage = parseInt(capacity, 10) || 22;
    const pages: StudentAttendanceStat[][] = [];
    for (let i = 0; i < total; i += perPage) {
      pages.push(students.slice(i, i + perPage));
    }
    const totalPages = pages.length;
    let runningIndex = 0;
    return pages.map((pageStudents, idx) => {
      const startIdx = runningIndex;
      runningIndex += pageStudents.length;
      return {
        pageNumber: idx + 1,
        totalPages,
        isFirstPage: idx === 0,
        isLastPage: idx === totalPages - 1,
        students: pageStudents,
        startIndex: startIdx
      };
    });
  }

  // If 'auto' is selected:
  const isF4 = paperSize === 'F4';

  if (isInfografis) {
    const singleMax = isF4 ? 14 : 10;
    const firstPageMax = isF4 ? 16 : 12;
    const middlePageMax = isF4 ? 20 : 16;
    const lastPageMin = isF4 ? 4 : 3;

    if (total <= singleMax) {
      return [{
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        students: students,
        startIndex: 0
      }];
    }

    const pages: StudentAttendanceStat[][] = [];
    let currentIndex = 0;
    let remaining = total;

    while (remaining > 0) {
      const isFirst = pages.length === 0;
      if (isFirst) {
        if (remaining <= singleMax) {
          pages.push(students.slice(currentIndex, currentIndex + remaining));
          currentIndex += remaining;
          remaining = 0;
        } else {
          let take = Math.min(firstPageMax, remaining);
          const left = remaining - take;
          if (left > 0 && left < lastPageMin) {
            take = Math.max(isF4 ? 10 : 8, take - (lastPageMin - left));
          }
          pages.push(students.slice(currentIndex, currentIndex + take));
          currentIndex += take;
          remaining -= take;
        }
      } else {
        if (remaining <= (isF4 ? 12 : 9)) {
          pages.push(students.slice(currentIndex, currentIndex + remaining));
          currentIndex += remaining;
          remaining = 0;
        } else {
          let take = Math.min(middlePageMax, remaining);
          const left = remaining - take;
          if (left > 0 && left < lastPageMin) {
            take = Math.max(isF4 ? 12 : 9, take - (lastPageMin - left));
          }
          pages.push(students.slice(currentIndex, currentIndex + take));
          currentIndex += take;
          remaining -= take;
        }
      }
    }

    const totalPages = pages.length;
    let runningIndex = 0;
    return pages.map((pageStudents, idx) => {
      const startIdx = runningIndex;
      runningIndex += pageStudents.length;
      return {
        pageNumber: idx + 1,
        totalPages,
        isFirstPage: idx === 0,
        isLastPage: idx === totalPages - 1,
        students: pageStudents,
        startIndex: startIdx
      };
    });
  } else {
    // Buku Presensi (Formal Table)
    const singleMax = isF4 ? 24 : 20;
    const firstPageMax = isF4 ? 26 : 22;
    const middlePageMax = isF4 ? 30 : 26;
    const lastPageThreshold = isF4 ? 22 : 18;

    if (total <= singleMax) {
      return [{
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        students: students,
        startIndex: 0
      }];
    }

    const pages: StudentAttendanceStat[][] = [];
    let currentIndex = 0;
    let remaining = total;

    while (remaining > 0) {
      const isFirst = pages.length === 0;
      if (isFirst) {
        if (remaining <= singleMax) {
          pages.push(students.slice(currentIndex, currentIndex + remaining));
          currentIndex += remaining;
          remaining = 0;
        } else {
          let take = Math.min(firstPageMax, remaining);
          const left = remaining - take;
          if (left > 0 && left < 6) {
            take = Math.max(isF4 ? 18 : 16, take - (6 - left));
          }
          pages.push(students.slice(currentIndex, currentIndex + take));
          currentIndex += take;
          remaining -= take;
        }
      } else {
        if (remaining <= lastPageThreshold) {
          pages.push(students.slice(currentIndex, currentIndex + remaining));
          currentIndex += remaining;
          remaining = 0;
        } else {
          let take = Math.min(middlePageMax, remaining);
          const left = remaining - take;
          if (left > 0 && left < 6) {
            take = Math.max(isF4 ? 20 : 18, take - (6 - left));
          }
          pages.push(students.slice(currentIndex, currentIndex + take));
          currentIndex += take;
          remaining -= take;
        }
      }
    }

    const totalPages = pages.length;
    let runningIndex = 0;
    return pages.map((pageStudents, idx) => {
      const startIdx = runningIndex;
      runningIndex += pageStudents.length;
      return {
        pageNumber: idx + 1,
        totalPages,
        isFirstPage: idx === 0,
        isLastPage: idx === totalPages - 1,
        students: pageStudents,
        startIndex: startIdx
      };
    });
  }
}

// Backward compatibility helpers
export function paginateStudentsForInfografisA4(students: StudentAttendanceStat[]): A4PageChunk[] {
  return paginateStudents(students, '22', 'F4', true);
}

export function paginateStudentsForA4(students: StudentAttendanceStat[]): A4PageChunk[] {
  return paginateStudents(students, '22', 'F4', false);
}

interface CetakPersentaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: string;
  rangeDisplayLabel: string;
  manualDays: number;
  studentStats: StudentAttendanceStat[];
  summaryMetrics: {
    totalStudents: number;
    totalEffectiveDays: number;
    avgPercentage: number;
    totalHadir: number;
    totalSakit: number;
    totalIzin: number;
    totalAlpa: number;
    totalTerlambat: number;
    sangatBaikCount: number;
    baikCount: number;
    cukupCount: number;
    perluPerhatianCount: number;
  };
  waliKelas: any;
  kepsek: any;
  settings: any;
}

export default function CetakPersentaseModal({
  isOpen,
  onClose,
  selectedClass,
  rangeDisplayLabel,
  manualDays,
  studentStats,
  summaryMetrics,
  waliKelas,
  kepsek,
  settings
}: CetakPersentaseModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'whatsapp' | 'parents'>('preview');
  const [paperSize, setPaperSize] = useState<PaperSize>('F4');
  const [pageCapacity, setPageCapacity] = useState<PageCapacityOption>('22');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [parentFilter, setParentFilter] = useState<'ALL' | 'ATTENTION' | 'PERFECT'>('ALL');
  const [customNote, setCustomNote] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'infografis' | 'buku-presensi'>('infografis');

  const docRef = useRef<HTMLDivElement>(null);
  const bukuPresensiPdfRef = useRef<HTMLDivElement>(null);

  // Smart Jenjang Detection & Clean Class Number
  const jenjangInfo = useMemo(() => getJenjangInfo(selectedClass, studentStats), [selectedClass, studentStats]);
  const cleanClassNumber = useMemo(() => getCleanClassDisplay(selectedClass), [selectedClass]);

  // Dynamic Multi-Page Chunks (Supports F4 / A4 and custom capacity like 22 students per page)
  const a4Pages = useMemo(() => paginateStudents(studentStats, pageCapacity, paperSize, false), [studentStats, pageCapacity, paperSize]);
  const infografisA4Pages = useMemo(() => paginateStudents(studentStats, pageCapacity, paperSize, true), [studentStats, pageCapacity, paperSize]);

  // Filter students for WhatsApp parents tab
  const filteredParentStudents = useMemo(() => {
    if (parentFilter === 'PERFECT') {
      return studentStats.filter(s => s.percentage === 100);
    }
    if (parentFilter === 'ATTENTION') {
      return studentStats.filter(s => s.percentage < 85 || s.alpa > 0);
    }
    return studentStats;
  }, [studentStats, parentFilter]);

  // WhatsApp Group Message
  const waGroupMessage = useMemo(() => {
    const school = settings.namaSekolah || settings.schoolName || settings.appName || 'Sekolah';
    const semLabel = settings.semester ? `Semester ${settings.semester}` : 'Semester Ganjil';
    const tpLabel = settings.tahunPelajaran || '2026/2027';
    const waliName = waliKelas?.name || 'Wali Kelas';
    const headName = settings.headmasterName || (kepsek as any)?.name || 'Kepala Sekolah';

    let text = `📊 *LAPORAN REKAPITULASI & PERSENTASE KEHADIRAN*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏫 *${school.toUpperCase()}*\n`;
    text += `🎓 *Jenjang:* ${jenjangInfo.label}\n`;
    text += `👥 *Kelas / Tingkat:* ${cleanClassNumber}\n`;
    text += `📚 *Tahun Ajaran:* ${tpLabel} (${semLabel})\n`;
    text += `📅 *Periode:* ${rangeDisplayLabel}\n`;
    text += `👨‍🏫 *Wali Kelas:* ${waliName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📈 *RINGKASAN PERFORMA KEHADIRAN:*\n`;
    text += `• Total Siswa: *${summaryMetrics.totalStudents} Siswa*\n`;
    text += `• Rata-rata Kehadiran Kelas: *${summaryMetrics.avgPercentage}%*\n`;
    text += `• 🟢 Predikat Sangat Baik (≥95%): *${summaryMetrics.sangatBaikCount} Siswa*\n`;
    text += `• 🔵 Predikat Baik (85-94%): *${summaryMetrics.baikCount} Siswa*\n`;
    text += `• 🟡 Predikat Cukup (75-84%): *${summaryMetrics.cukupCount} Siswa*\n`;
    text += `• 🔴 Perlu Perhatian (<75%): *${summaryMetrics.perluPerhatianCount} Siswa*\n\n`;

    text += `📋 *TOTAL AKUMULASI KETIDAKHADIRAN:*\n`;
    text += `• Sakit (S): *${summaryMetrics.totalSakit} Hari*\n`;
    text += `• Izin (I): *${summaryMetrics.totalIzin} Hari*\n`;
    text += `• Alpa / Tanpa Ket (A): *${summaryMetrics.totalAlpa} Hari*\n`;
    text += `• Terlambat (T): *${summaryMetrics.totalTerlambat} Kali*\n\n`;

    // 100% attendance students appreciation
    const perfectStudents = studentStats.filter(s => s.percentage === 100);
    if (perfectStudents.length > 0) {
      text += `⭐ *APRESIASI SISWA KEHADIRAN 100% (SEMPURNA):*\n`;
      perfectStudents.forEach((s, i) => {
        text += `${i + 1}. *${s.name}* (100% Hadir)\n`;
      });
      text += `\n`;
    }

    // Attention students
    const attentionStudents = studentStats.filter(s => s.percentage < 75 || s.alpa >= 2);
    if (attentionStudents.length > 0) {
      text += `⚠️ *PERHATIAN KHUSUS KEHADIRAN SISWA:*\n`;
      attentionStudents.forEach((s, i) => {
        text += `${i + 1}. *${s.name}* (${s.percentage}% - S:${s.sakit}, I:${s.izin}, A:${s.alpa})\n`;
      });
      text += `\n`;
    }

    // Complete ranking by attendance
    if (studentStats.length > 0) {
      text += `📋 *DAFTAR LENGKAP PERSENTASE KEHADIRAN SISWA:*\n`;
      studentStats.forEach((s, i) => {
        const icon = s.percentage >= 95 ? '🟢' : s.percentage >= 85 ? '🔵' : s.percentage >= 75 ? '🟡' : '🔴';
        const statusLabel = s.status && s.status.toLowerCase() !== 'aktif' ? ` [${s.status}]` : '';
        text += `${i + 1}. ${icon} *${s.name}*${statusLabel} — *${s.percentage}%* (H:${s.hadir}, S:${s.sakit}, I:${s.izin}, A:${s.alpa})\n`;
      });
      text += `\n`;
    }

    if (customNote.trim()) {
      text += `📝 *Catatan Wali Kelas:*\n${customNote.trim()}\n\n`;
    }

    text += `📢 *Pemberitahuan Orang Tua/Wali:*\n`;
    text += `Diharapkan kerja sama Bapak/Ibu wali murid untuk terus memotivasi dan memantau kedisiplinan belajar putra/putri kita. Jika ada kendala kehadiran atau perizinan sakit, mohon segera berkabar kepada wali kelas.\n\n`;
    text += `_Laporan resmi diterbitkan oleh Tim Akademik ${school}_`;

    return text;
  }, [settings, selectedClass, cleanClassNumber, jenjangInfo, rangeDisplayLabel, waliKelas, kepsek, summaryMetrics, studentStats, customNote]);

  // Generate Image (PNG) with html2canvas (Supports Multi-Page Infografis Sheets in F4 / A4)
  const handleDownloadImage = async () => {
    if (!docRef.current) return;
    try {
      setIsGeneratingImage(true);
      const sheetElements = docRef.current.querySelectorAll<HTMLElement>('.infografis-a4-sheet');
      
      const cleanClassName = (cleanClassNumber === 'Semua Kelas' ? 'Semua' : cleanClassNumber).replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      if (!sheetElements || sheetElements.length === 0) {
        const canvas = await html2canvas(docRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `Infografis_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_${dateStr}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const totalSheets = sheetElements.length;

      for (let i = 0; i < totalSheets; i++) {
        const sheet = sheetElements[i];
        const canvas = await html2canvas(sheet, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        if (totalSheets === 1) {
          link.download = `Infografis_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_${dateStr}.png`;
        } else {
          link.download = `Infografis_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_Gambar_${i + 1}_dari_${totalSheets}_${dateStr}.png`;
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay between multiple image downloads
        if (totalSheets > 1 && i < totalSheets - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Gagal membuat gambar PNG. Anda dapat menggunakan opsi Unduh PDF.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate Multi-Page PDF with jsPDF + html2canvas (Supports F4 / Folio 215x330mm & A4 210x297mm)
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const isF4 = paperSize === 'F4';
      const pdfFormat: any = isF4 ? [215, 330] : 'a4';
      const pdfWidth = isF4 ? 215 : 210;
      const pdfHeight = isF4 ? 330 : 297;

      if (previewMode === 'infografis') {
        const sheetElements = docRef.current?.querySelectorAll<HTMLElement>('.infografis-a4-sheet');
        const cleanClassName = (cleanClassNumber === 'Semua Kelas' ? 'Semua' : cleanClassNumber).replace(/\s+/g, '_');

        if (!sheetElements || sheetElements.length === 0) {
          if (!docRef.current) return;
          const canvas = await html2canvas(docRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: pdfFormat
          });

          const calcHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, calcHeight));
          pdf.save(`Infografis_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.pdf`);
          return;
        }

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: pdfFormat
        });

        for (let i = 0; i < sheetElements.length; i++) {
          const sheet = sheetElements[i];
          const canvas = await html2canvas(sheet, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) {
            pdf.addPage(pdfFormat, 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`Infografis_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        const pageElements = bukuPresensiPdfRef.current?.querySelectorAll<HTMLElement>('.print-a4-sheet');
        if (!pageElements || pageElements.length === 0) {
          alert('Tidak ada halaman untuk dicetak.');
          return;
        }

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: pdfFormat
        });

        for (let i = 0; i < pageElements.length; i++) {
          const sheet = pageElements[i];
          const canvas = await html2canvas(sheet, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) {
            pdf.addPage(pdfFormat, 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        const cleanClassName = (cleanClassNumber === 'Semua Kelas' ? 'Semua' : cleanClassNumber).replace(/\s+/g, '_');
        pdf.save(`Buku_Presensi_${paperSize}_${jenjangInfo.label.replace(/\s+/g, '_')}_Kelas_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal membuat PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print direct
  const handlePrintDoc = () => {
    if (previewMode !== 'buku-presensi') {
      setPreviewMode('buku-presensi');
      setTimeout(() => {
        triggerPrint();
      }, 150);
    } else {
      triggerPrint();
    }
  };

  // Copy WhatsApp Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(waGroupMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Send to Class WA Group
  const handleOpenWhatsAppGroup = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waGroupMessage)}`, '_blank');
  };

  // Send individual WhatsApp to parent
  const handleSendParentWhatsApp = (stat: StudentAttendanceStat) => {
    let cleanPhone = stat.parentPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    if (!cleanPhone || cleanPhone.length < 8) {
      alert(`Nomor telepon orang tua untuk ${stat.name} belum valid.`);
      return;
    }

    const schoolName = settings.namaSekolah || settings.schoolName || 'Sekolah';
    const message = `Yth. Bapak/Ibu Wali dari *${stat.name}*,

Berikut adalah Laporan Rekapitulasi Presensi & Kehadiran:
🎓 *Jenjang:* ${jenjangInfo.label}
👥 *Kelas / Tingkat:* ${formatClassLabel(stat.class, false)}
📅 *Periode:* ${rangeDisplayLabel}

📊 *Rincian Kehadiran:*
- Hadir: *${stat.hadir} Hari*
- Sakit: *${stat.sakit} Hari*
- Izin: *${stat.izin} Hari*
- Alpa (Tanpa Keterangan): *${stat.alpa} Hari*
- Terlambat: *${stat.terlambat} Kali*

📈 *Persentase Kehadiran: ${stat.percentage}% (${stat.predicate})*

Terima kasih atas perhatian dan kerja sama dalam mendampingi kedisiplinan putra/putri kita.
Hormat kami,
Wali Kelas: ${waliKelas?.name || 'Wali Kelas'}
${schoolName}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
      
      {/* Dynamic Print Stylesheet for Multi-page F4 / A4 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${paperSize === 'F4' ? '215mm 330mm portrait' : 'A4 portrait'};
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-a4-sheet, .infografis-a4-sheet {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            min-height: ${paperSize === 'F4' ? '314mm' : '275mm'} !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 0 10mm 0 !important;
            padding: 4mm 6mm !important;
            background: white !important;
          }
          .print-a4-sheet:last-child, .infografis-a4-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th, .print-table td {
            border: 1px solid black !important;
          }
        }
      `}} />

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] print:shadow-none print:border-none print:m-0 print:p-0 print:max-h-none print:overflow-visible print:w-full print:block">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <Percent size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Laporan Resmi {paperSize}
                </span>
                <span className="text-xs text-indigo-200 font-bold">{rangeDisplayLabel}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Cetak & Bagikan Rekap Persentase Kehadiran ({cleanClassNumber === 'Semua Kelas' ? 'Semua Kelas' : `${jenjangInfo.label} - Kelas ${cleanClassNumber}`})
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 no-print overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <FileText size={15} />
              <span>📄 Pratinjau Dokumen Cetak</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare size={15} />
              <span>💬 Kirim WhatsApp Grup Kelas</span>
            </button>
            <button
              onClick={() => setActiveTab('parents')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'parents'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Users size={15} />
              <span>👨‍👩‍👧 Kontak Orang Tua</span>
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleDownloadImage}
                disabled={isGeneratingImage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <ImageIcon size={14} />
                <span>{isGeneratingImage ? 'Memproses...' : (infografisA4Pages.length > 1 ? `Unduh Semua Gambar (${infografisA4Pages.length} PNG)` : 'Unduh Gambar (PNG)')}</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? 'Memproses...' : `Unduh PDF (${paperSize})`}</span>
              </button>
              <button
                onClick={handlePrintDoc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak ({paperSize})</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:m-0 print:overflow-visible print:block">
          
          {/* TAB 1: PREVIEW DOKUMEN CETAK */}
          {activeTab === 'preview' && (
            <div className="max-w-4xl mx-auto space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
              
              {/* Preview Format, Paper Size & Capacity Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('infografis')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition cursor-pointer text-xs ${
                        previewMode === 'infografis' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <ImageIcon size={14} />
                      <span>🖼️ Infografis Gambar (WA)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('buku-presensi')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition cursor-pointer text-xs ${
                        previewMode === 'buku-presensi' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <FileText size={14} />
                      <span>📑 Format Buku Presensi (PDF / Cetak)</span>
                    </button>
                  </div>

                  {/* Paper Size Selector */}
                  <div className="w-48">
                    <CustomDropdown
                      id="cetak-modal-paper-size"
                      value={paperSize}
                      onChange={(val) => setPaperSize(val as PaperSize)}
                      options={[
                        { value: 'F4', label: '📄 F4 / Folio (215 x 330 mm)' },
                        { value: 'A4', label: '📄 A4 (210 x 297 mm)' }
                      ]}
                      placeholder="Ukuran Kertas"
                      buttonClassName="!py-1.5 !px-2.5 !bg-slate-50 !border-slate-200 text-xs font-black text-indigo-950"
                    />
                  </div>

                  {/* Students Per Page Selector */}
                  <div className="w-56">
                    <CustomDropdown
                      id="cetak-modal-page-capacity"
                      value={pageCapacity}
                      onChange={(val) => setPageCapacity(val as PageCapacityOption)}
                      options={[
                        { value: '22', label: '22 Siswa / Hal (Standar)' },
                        { value: '20', label: '20 Siswa / Hal' },
                        { value: '25', label: '25 Siswa / Hal' },
                        { value: '30', label: '30 Siswa / Hal' },
                        { value: 'auto', label: 'Otomatis (Sesuai Kertas)' }
                      ]}
                      placeholder="Kapasitas Siswa"
                      buttonClassName="!py-1.5 !px-2.5 !bg-slate-50 !border-slate-200 text-xs font-black text-indigo-950"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium italic">
                    {previewMode === 'infografis' 
                      ? `Format Infografis (${infografisA4Pages.length} Lembar ${paperSize}) • Siap Bagikan ke WhatsApp`
                      : `Format resmi Buku Presensi (${a4Pages.length} Halaman ${paperSize}) • Khusus PDF & Cetak Fisik`
                    }
                  </span>
                </div>
              </div>

              {/* MODE 1: FORMAT MODERN INFOGRAFIS (UNTUK GAMBAR PNG WA - PAGINATED LEMBAR F4 / A4 PORTRAIT) */}
              <div 
                ref={docRef}
                className={`space-y-6 print:space-y-0 ${
                  previewMode === 'infografis' ? 'block' : 'fixed -left-[9999px] top-0 w-[1000px] pointer-events-none opacity-100 z-[-100]'
                }`}
              >
                {infografisA4Pages.map((pageChunk) => (
                  <div
                    key={`infografis-sheet-${pageChunk.pageNumber}`}
                    className={`infografis-a4-sheet bg-white w-full ${paperSize === 'F4' ? 'max-w-[215mm] min-h-[330mm]' : 'max-w-[210mm] min-h-[297mm]'} mx-auto p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 text-slate-900 font-sans flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:rounded-none`}
                  >
                    <div>
                      {/* Header Banner Modern (Dinamis Warna Sesuai Paket A=Merah, Paket B=Biru, Paket C=Kuning) */}
                      {pageChunk.isFirstPage ? (
                        <div className={`${jenjangInfo.bannerBg} p-5 sm:p-6 rounded-2xl mb-4 shadow-sm flex items-center justify-between gap-4 transition-colors`}>
                          <div className="flex items-center gap-4">
                            {settings.logoUrl || settings.schoolLogoUrl ? (
                              <img 
                                src={settings.logoUrl || settings.schoolLogoUrl} 
                                alt="Logo Sekolah" 
                                className="w-13 h-13 object-contain rounded-xl bg-white/10 p-1 flex-shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xs flex-shrink-0">
                                LOGO
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${jenjangInfo.badgeBg}`}>
                                  REKAP PERSENTASE KEHADIRAN
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${jenjangInfo.pillColor}`}>
                                  {jenjangInfo.label}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white border border-white/30">
                                  Gambar {pageChunk.pageNumber} dari {pageChunk.totalPages}
                                </span>
                              </div>
                              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                                {settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL'}
                              </h2>
                              <p className={`text-xs ${jenjangInfo.subtextColor} mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5`}>
                                <span>Jenjang: <strong className="text-white">{jenjangInfo.label}</strong></span>
                                <span>•</span>
                                <span>Kelas: <strong className="text-white">{cleanClassNumber}</strong></span>
                                <span>•</span>
                                <span>Periode: <strong className="text-white">{rangeDisplayLabel}</strong></span>
                                <span>•</span>
                                <span>Tahun Ajaran: <strong className="text-white">{settings.tahunPelajaran || '2026/2027'} ({settings.semester ? (String(settings.semester).toLowerCase().includes('semester') ? settings.semester : `Semester ${settings.semester}`) : 'Semester Ganjil'})</strong></span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right hidden sm:block flex-shrink-0">
                            <div className={`text-3xl font-black ${jenjangInfo.rateColor}`}>{summaryMetrics.avgPercentage}%</div>
                            <div className={`text-[10px] ${jenjangInfo.subtextColor} font-bold uppercase`}>Rata-Rata Kehadiran</div>
                          </div>
                        </div>
                      ) : (
                        <div className={`${jenjangInfo.bannerBg} px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl mb-4 shadow-sm flex items-center justify-between gap-3 transition-colors`}>
                          <div className="flex items-center gap-3">
                            {settings.logoUrl || settings.schoolLogoUrl ? (
                              <img 
                                src={settings.logoUrl || settings.schoolLogoUrl} 
                                alt="Logo Sekolah" 
                                className="w-9 h-9 object-contain rounded-lg bg-white/10 p-0.5 flex-shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white uppercase">
                                  {settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL'}
                                </span>
                                <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${jenjangInfo.pillColor}`}>
                                  {jenjangInfo.label}
                                </span>
                                <span className="text-[10px] text-white/80 font-bold">
                                  • Lanjutan Rekapitulasi Presensi
                                </span>
                              </div>
                              <div className={`text-[10.5px] ${jenjangInfo.subtextColor} flex items-center gap-2 flex-wrap mt-0.5`}>
                                <span>Kelas: <strong className="text-white">{cleanClassNumber}</strong></span>
                                <span>•</span>
                                <span>Periode: <strong className="text-white">{rangeDisplayLabel}</strong></span>
                                <span>•</span>
                                <span>Tahun Ajaran: <strong className="text-white">{settings.tahunPelajaran || '2026/2027'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white/20 text-white border border-white/30">
                              Gambar {pageChunk.pageNumber} dari {pageChunk.totalPages}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tabel Dokumen Infografis */}
                      <div className="overflow-hidden border border-slate-200 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                              <th className="py-2 px-3 text-center w-10">NO</th>
                              <th className="py-2 px-4">NAMA SISWA & FOTO</th>
                              <th className="py-2 px-4 text-center min-w-[180px]">PERSENTASE KEHADIRAN</th>
                              <th className="py-2 px-3 text-center w-28">PREDIKAT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {pageChunk.students.map((stat, idx) => {
                              const globalIdx = pageChunk.startIndex + idx;
                              return (
                                <tr key={stat.studentId || globalIdx} className="hover:bg-slate-50/80 transition-colors">
                                  {/* NO */}
                                  <td className="py-2 px-3 text-center font-bold text-slate-400 text-xs">
                                    {globalIdx + 1}
                                  </td>

                                  {/* NAMA SISWA & FOTO */}
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-3">
                                      <StudentPhoto
                                        student={{ name: stat.name, gender: stat.gender }}
                                        photoUrl={stat.photo}
                                        size="sm"
                                        className="ring-1.5 ring-slate-200 shadow-2xs flex-shrink-0"
                                        showBadge={stat.percentage === 100}
                                        badgeText="★"
                                        badgeColor="bg-amber-500"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                                          <span>{stat.name}</span>
                                          <span className="text-[11px] text-slate-400 font-bold">({stat.gender})</span>
                                          {stat.percentage === 100 && (
                                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-black border border-amber-300">
                                              100% Sempurna
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.2">
                                          NISN: {stat.nisn || '-'} • NIS: {stat.nis || '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* PERSENTASE KEHADIRAN (PROGRESS BAR) */}
                                  <td className="py-2 px-4">
                                    <div className="space-y-1 max-w-xs mx-auto">
                                      <div className="flex items-center justify-between text-xs font-black">
                                        <span className={`text-xs sm:text-sm font-black ${
                                          stat.percentage >= 95 ? 'text-emerald-700' :
                                          stat.percentage >= 85 ? 'text-blue-700' :
                                          stat.percentage >= 75 ? 'text-amber-700' : 'text-rose-700'
                                        }`}>
                                          {stat.percentage}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            stat.percentage >= 95 ? 'bg-emerald-500' :
                                            stat.percentage >= 85 ? 'bg-blue-500' :
                                            stat.percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${Math.min(100, stat.percentage)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* PREDIKAT */}
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${stat.predicateColor}`}>
                                      {stat.predicate}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {pageChunk.isLastPage && (
                            <tfoot className="bg-slate-100 font-black text-slate-800 border-t border-slate-300 text-xs">
                              <tr>
                                <td colSpan={2} className="py-2.5 px-4 text-right uppercase text-[11px]">
                                  Rata-Rata Seluruhnya:
                                </td>
                                <td className="py-2.5 px-4 text-center text-emerald-800 font-black text-xs sm:text-sm">
                                  Rata-rata: {summaryMetrics.avgPercentage}%
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-700">
                                  {summaryMetrics.avgPercentage >= 95 ? 'Sangat Baik' : summaryMetrics.avgPercentage >= 85 ? 'Baik' : summaryMetrics.avgPercentage >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* STATISTIK RINGKAS & KOLOM TANDA TANGAN RESMI DI HALAMAN TERAKHIR */}
                      {pageChunk.isLastPage && (
                        <div className="mt-4 space-y-3">
                          {/* Mini summary badges */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Siswa</div>
                              <div className="font-black text-slate-800 text-sm">{summaryMetrics.totalStudents} Siswa</div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Rata-Rata Kelas</div>
                              <div className="font-black text-emerald-800 text-sm">{summaryMetrics.avgPercentage}%</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
                              <div className="text-[10px] text-blue-600 font-bold uppercase">Sangat Baik (≥95%)</div>
                              <div className="font-black text-blue-800 text-sm">{summaryMetrics.sangatBaikCount} Siswa</div>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2">
                              <div className="text-[10px] text-rose-600 font-bold uppercase">Perlu Perhatian</div>
                              <div className="font-black text-rose-800 text-sm">{summaryMetrics.perluPerhatianCount} Siswa</div>
                            </div>
                          </div>

                          {/* Keterangan Akumulasi Ketidakhadiran */}
                          <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 gap-1">
                            <span><strong>Akumulasi Ketidakhadiran:</strong> Sakit (S): <strong>{summaryMetrics.totalSakit}</strong> • Izin (I): <strong>{summaryMetrics.totalIzin}</strong> • Alpa (A): <strong>{summaryMetrics.totalAlpa}</strong> • Terlambat: <strong>{summaryMetrics.totalTerlambat}</strong></span>
                            <span>Predikat Kelas: <strong className="text-emerald-700">{summaryMetrics.avgPercentage >= 95 ? 'Sangat Baik' : summaryMetrics.avgPercentage >= 85 ? 'Baik' : summaryMetrics.avgPercentage >= 75 ? 'Cukup' : 'Perlu Perhatian'}</strong></span>
                          </div>

                          {/* Kolom Tanda Tangan Resmi */}
                          <div className="flex justify-between mt-4 px-6 text-[10px] text-black">
                            <div className="text-center">
                              <p className="mb-14 leading-relaxed">
                                Mengetahui,<br/>
                                Kepala Sekolah / Pimpinan
                              </p>
                              <p className="font-bold underline uppercase">
                                {settings.headmasterName || (kepsek as any)?.name || '_________________________'}
                              </p>
                              <p>NIP. {settings.headmasterNip || (kepsek as any)?.nip || '-'}</p>
                            </div>

                            <div className="text-center">
                              <p className="mb-14 leading-relaxed">
                                {settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                                {selectedClass === 'ALL' ? 'Koordinator Presensi' : `Guru / Wali Kelas ${cleanClassNumber}`}
                              </p>
                              <p className="font-bold underline uppercase">
                                {waliKelas?.name || '_________________________'}
                              </p>
                              <p>NIP. {waliKelas?.nip || '-'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Modern Setiap Lembar Gambar */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10.5px] text-slate-500">
                      <span>Dicetak otomatis dari Sistem Rombel & Akademik • {settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL'}</span>
                      {!pageChunk.isLastPage && (
                        <span className="font-bold text-indigo-600 italic text-[10px]">
                          * Bersambung ke Gambar {pageChunk.pageNumber + 1}...
                        </span>
                      )}
                      <span className="font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        Gambar {pageChunk.pageNumber} dari {pageChunk.totalPages}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* MODE 2: FORMAT RESMI BUKU PRESENSI BULANAN STANDAR F4 / A4 (MULTI-PAGE PAGINATED) */}
              <div 
                id="printable-area"
                ref={bukuPresensiPdfRef}
                className={`printable-container printable-document print-area print:w-full print:m-0 print:p-0 space-y-6 ${
                  previewMode === 'buku-presensi' ? 'block' : 'fixed -left-[9999px] top-0 w-[1000px] pointer-events-none opacity-100 z-[-100]'
                }`}
                data-printable="true"
              >
                {a4Pages.map((pageChunk) => (
                  <div
                    key={`a4-page-${pageChunk.pageNumber}`}
                    className={`print-a4-sheet bg-white w-full ${paperSize === 'F4' ? 'max-w-[215mm] min-h-[330mm]' : 'max-w-[210mm] min-h-[297mm]'} mx-auto p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 text-slate-900 font-sans flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:rounded-none`}
                  >
                    <div>
                      {/* HEADER HALAMAN */}
                      {pageChunk.isFirstPage ? (
                        /* Kop Surat Resmi Buku Presensi (Page 1) */
                        <div className="text-center border-b-2 border-black pb-2 mb-3">
                          <div className="flex items-center justify-center gap-4 mb-1">
                            {settings.logoUrl || settings.schoolLogoUrl ? (
                              <img 
                                src={settings.logoUrl || settings.schoolLogoUrl} 
                                alt="Logo Sekolah" 
                                className="w-12 h-12 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <div className="text-center">
                              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black leading-tight">
                                {settings.namaSekolah || settings.schoolName || 'SISTEM INFORMASI AKADEMIK & ROMBEL'}
                              </h1>
                              {settings.alamat || settings.schoolAddress ? (
                                <p className="text-[10px] text-slate-700 font-medium">
                                  {settings.alamat || settings.schoolAddress}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <h2 className="text-sm font-black uppercase tracking-wide text-black mt-1">
                            BUKU REKAPITULASI & PERSENTASE KEHADIRAN SISWA
                          </h2>
                          <div className="text-[10px] font-bold text-slate-800 flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span>JENJANG: <strong>{jenjangInfo.label.toUpperCase()}</strong></span>
                            <span>•</span>
                            <span>KELAS: <strong>{cleanClassNumber.toUpperCase()}</strong></span>
                            <span>•</span>
                            <span>PERIODE: <strong>{rangeDisplayLabel}</strong></span>
                            <span>•</span>
                            <span>TAHUN AJARAN: <strong>{settings.tahunPelajaran || '2026/2027'} ({settings.semester ? (String(settings.semester).toLowerCase().includes('semester') ? settings.semester : `Semester ${settings.semester}`) : 'Semester Ganjil'})</strong></span>
                          </div>
                        </div>
                      ) : (
                        /* Sub-Header Ringkas (Halaman 2, 3, dst.) */
                        <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-3 text-[10px] font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="uppercase font-black text-black">{settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL'}</span>
                            <span>•</span>
                            <span className="text-slate-700">Lanjutan Buku Rekapitulasi Presensi Siswa</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9.5px]">
                            <span>Jenjang: <strong>{jenjangInfo.label}</strong></span>
                            <span>•</span>
                            <span>Kelas: <strong>{cleanClassNumber}</strong></span>
                            <span>•</span>
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-black text-black">
                              Halaman {pageChunk.pageNumber} dari {pageChunk.totalPages}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tabel Standar Formal Buku Presensi Bulanan */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-black text-xs font-sans print-table">
                          <thead>
                            <tr className="bg-slate-100 text-black">
                              <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-7">NO</th>
                              <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-24">NISN</th>
                              <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-16">NIS</th>
                              <th rowSpan={2} className="border border-black px-2 py-1 font-bold text-[10px]">NAMA LENGKAP SISWA</th>
                              {selectedClass === 'ALL' && (
                                <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-14">KELAS</th>
                              )}
                              <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-7">L/P</th>
                              <th colSpan={5} className="border border-black p-1 text-center font-bold text-[10px] bg-slate-200">
                                REKAPITULASI KEHADIRAN (HARI)
                              </th>
                              <th rowSpan={2} className="border border-black p-1 text-center font-black text-[10px] bg-indigo-50 w-20">
                                PERSENTASE (%)
                              </th>
                              <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] w-24">
                                PREDIKAT
                              </th>
                            </tr>
                            <tr className="bg-slate-50 text-[9px] font-bold text-black">
                              <th className="border border-black p-0.5 text-center w-8 bg-emerald-50 text-emerald-800" title="Hadir">H</th>
                              <th className="border border-black p-0.5 text-center w-8 bg-amber-50 text-amber-800" title="Sakit">S</th>
                              <th className="border border-black p-0.5 text-center w-8 bg-blue-50 text-blue-800" title="Izin">I</th>
                              <th className="border border-black p-0.5 text-center w-8 bg-rose-50 text-rose-800" title="Alpa">A</th>
                              <th className="border border-black p-0.5 text-center w-8 bg-purple-50 text-purple-800" title="Terlambat">T</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageChunk.students.map((stat, idx) => {
                              const globalIndex = pageChunk.startIndex + idx + 1;
                              return (
                                <tr key={stat.studentId || globalIndex} className="h-6.5 hover:bg-slate-50/60">
                                  <td className="border border-black p-0.5 text-center font-mono font-medium text-[9.5px]">
                                    {globalIndex}
                                  </td>
                                  <td className="border border-black p-0.5 text-center font-mono text-[9px] text-slate-800">
                                    {stat.nisn || '-'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center font-mono text-[9px] text-slate-800">
                                    {stat.nis || '-'}
                                  </td>
                                  <td className="border border-black px-1.5 py-0.5 font-bold uppercase text-[9.5px] text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                                    {stat.name}
                                  </td>
                                  {selectedClass === 'ALL' && (
                                    <td className="border border-black p-0.5 text-center text-[9px] font-bold text-slate-700">
                                      {stat.class}
                                    </td>
                                  )}
                                  <td className="border border-black p-0.5 text-center font-medium text-[9.5px]">
                                    {stat.gender || 'L'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center font-bold text-emerald-800 bg-emerald-50/20 text-[9.5px]">
                                    {stat.hadir}
                                  </td>
                                  <td className="border border-black p-0.5 text-center text-amber-800 bg-amber-50/20 text-[9.5px]">
                                    {stat.sakit || '-'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center text-blue-800 bg-blue-50/20 text-[9.5px]">
                                    {stat.izin || '-'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center text-rose-800 bg-rose-50/20 text-[9.5px]">
                                    {stat.alpa || '-'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center text-purple-800 bg-purple-50/20 text-[9.5px]">
                                    {stat.terlambat || '-'}
                                  </td>
                                  <td className="border border-black p-0.5 text-center font-black bg-indigo-50/40 text-[10px] text-indigo-950">
                                    {stat.percentage}%
                                  </td>
                                  <td className="border border-black p-0.5 text-center text-[9px] font-bold text-slate-800">
                                    {stat.predicate}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* TFOOT HANYA DI HALAMAN TERAKHIR */}
                          {pageChunk.isLastPage && (
                            <tfoot className="bg-slate-100 font-bold border-t border-black text-[9.5px] text-black">
                              <tr>
                                <td colSpan={selectedClass === 'ALL' ? 6 : 5} className="border border-black px-2 py-1 text-right uppercase font-black">
                                  Total Seluruhnya & Rata-rata:
                                </td>
                                <td className="border border-black p-0.5 text-center font-black text-emerald-800">{summaryMetrics.totalHadir}</td>
                                <td className="border border-black p-0.5 text-center font-black text-amber-800">{summaryMetrics.totalSakit}</td>
                                <td className="border border-black p-0.5 text-center font-black text-blue-800">{summaryMetrics.totalIzin}</td>
                                <td className="border border-black p-0.5 text-center font-black text-rose-800">{summaryMetrics.totalAlpa}</td>
                                <td className="border border-black p-0.5 text-center font-black text-purple-800">{summaryMetrics.totalTerlambat}</td>
                                <td className="border border-black p-0.5 text-center font-black text-indigo-950 bg-indigo-50 text-[10px]">
                                  {summaryMetrics.avgPercentage}%
                                </td>
                                <td className="border border-black p-0.5 text-center text-[9px] font-black">
                                  {summaryMetrics.avgPercentage >= 95 ? 'Sangat Baik' : summaryMetrics.avgPercentage >= 85 ? 'Baik' : summaryMetrics.avgPercentage >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* KETERANGAN & TANDA TANGAN HANYA DI HALAMAN TERAKHIR */}
                      {pageChunk.isLastPage && (
                        <>
                          {/* Keterangan & Stat Summary */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 text-[9.5px] text-slate-700 font-medium gap-2">
                            <div>
                              <span><strong>Keterangan:</strong> <strong>H</strong> = Hadir, <strong>S</strong> = Sakit, <strong>I</strong> = Izin, <strong>A</strong> = Alpa / Tanpa Keterangan, <strong>T</strong> = Terlambat</span>
                            </div>
                            <div>
                              <span>Total Siswa: <strong>{studentStats.length} Siswa</strong> ({studentStats.filter(s => s.gender === 'L').length} Laki-laki / {studentStats.filter(s => s.gender === 'P').length} Perempuan)</span>
                            </div>
                          </div>

                          {/* Titik Tanda Tangan Resmi (Kepala Sekolah & Wali Kelas) */}
                          <div className="flex justify-between mt-6 px-6 text-[10px] text-black">
                            <div className="text-center">
                              <p className="mb-14 leading-relaxed">
                                Mengetahui,<br/>
                                Kepala Sekolah / Pimpinan
                              </p>
                              <p className="font-bold underline uppercase">
                                {settings.headmasterName || (kepsek as any)?.name || '_________________________'}
                              </p>
                              <p>NIP. {settings.headmasterNip || (kepsek as any)?.nip || '-'}</p>
                            </div>

                            <div className="text-center">
                              <p className="mb-14 leading-relaxed">
                                {settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                                {selectedClass === 'ALL' ? 'Koordinator Presensi' : `Guru / Wali Kelas ${cleanClassNumber}`}
                              </p>
                              <p className="font-bold underline uppercase">
                                {waliKelas?.name || '_________________________'}
                              </p>
                              <p>NIP. {waliKelas?.nip || '-'}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* FOOTER HALAMAN A4 */}
                    <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                      <span>Dicetak otomatis dari Sistem Rombel & Akademik</span>
                      {!pageChunk.isLastPage && (
                        <span className="font-bold text-indigo-700 italic">
                          * Bersambung ke Halaman {pageChunk.pageNumber + 1}...
                        </span>
                      )}
                      <span className="font-bold text-slate-700">
                        Halaman {pageChunk.pageNumber} dari {pageChunk.totalPages}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP GRUP KELAS */}
          {activeTab === 'whatsapp' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                    <MessageSquare size={18} />
                    <span>Pesan Format WhatsApp Rekap Persentase Kelas</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    Siap Kirim
                  </span>
                </div>
                <p className="text-xs text-emerald-700">
                  Format pesan di bawah sudah terstruktur rapi dengan statistik lengkap, apresiasi siswa kehadiran 100%, dan rincian evaluasi kedisiplinan.
                </p>
              </div>

              {/* Editable Catatan Tambahan */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-700 block">
                  Tambahkan Catatan Khusus Wali Kelas (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Contoh: Bagi siswa dengan tingkat kehadiran di bawah 80% akan diadakan bimbingan wali kelas pada hari Senin..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Message Box */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Pratinjau Pesan WhatsApp</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer active:scale-95"
                    >
                      {copiedSuccess ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedSuccess ? 'Tersalin!' : 'Salin Teks'}</span>
                    </button>
                    <button
                      onClick={handleOpenWhatsAppGroup}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <Send size={14} />
                      <span>Buka WhatsApp Sekarang</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-96 overflow-y-auto bg-slate-50/50">
                  {waGroupMessage}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KONTAK ORANG TUA */}
          {activeTab === 'parents' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-700">Filter Siswa:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setParentFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        parentFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Semua ({studentStats.length})
                    </button>
                    <button
                      onClick={() => setParentFilter('ATTENTION')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        parentFilter === 'ATTENTION' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Perlu Perhatian (&lt;85% / Alpa)
                    </button>
                    <button
                      onClick={() => setParentFilter('PERFECT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        parentFilter === 'PERFECT' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ⭐ 100% Sempurna
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Parents Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 text-center w-12">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-3 text-center">Persentase</th>
                      <th className="py-3 px-3 text-center">Rekap (S/I/A/T)</th>
                      <th className="py-3 px-4">Kontak Orang Tua</th>
                      <th className="py-3 px-4 text-right">Kirim Pesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParentStudents.map((s, idx) => (
                      <tr key={s.studentId || idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900 text-xs">{s.name}</div>
                          <div className="text-[10px] text-slate-400">NISN: {s.nisn} • {s.class}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                            s.percentage >= 95 ? 'bg-emerald-100 text-emerald-800' :
                            s.percentage >= 85 ? 'bg-blue-100 text-blue-800' :
                            s.percentage >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px]">
                          <span className="text-amber-700">S:{s.sakit}</span> • <span className="text-blue-700">I:{s.izin}</span> • <span className="text-rose-700">A:{s.alpa}</span> • <span className="text-orange-700">T:{s.terlambat}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {s.parentPhone && s.parentPhone !== '-' ? s.parentPhone : <span className="text-slate-400 italic">Belum diisi</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSendParentWhatsApp(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
                          >
                            <Send size={13} />
                            <span>Kirim Rekap WA</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
