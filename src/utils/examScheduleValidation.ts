/**
 * Validasi Jadwal Ujian CBT Berdasarkan Hari, Tanggal, dan Jam Pelaksanaan
 * Menjamin butir soal hanya dibuka ketika hari dan tanggalnya sesuai dengan jadwal.
 */

import { formatClockTime } from '../lib/utils';

export interface ExamScheduleInfo {
  isOpen: boolean;
  status: 'active' | 'upcoming' | 'ended';
  statusLabel: string;
  badgeClass: string;
  reason: string;
  detailedMessage: string;
  scheduledTimeText: string;
  canStart: boolean;
}

export function validateExamSchedule(exam: any, isTeacherOrAdmin = false): ExamScheduleInfo {
  if (!exam) {
    return {
      isOpen: false,
      status: 'upcoming',
      statusLabel: 'Jadwal Tidak Ditemukan',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      reason: 'Data sesi ujian tidak lengkap.',
      detailedMessage: 'Silakan hubungi administrator CBT.',
      scheduledTimeText: '-',
      canStart: false
    };
  }

  const jamMulaiStr = formatClockTime(exam.jamMulai || exam.JamMulai, '19:30');
  const jamSelesaiStr = formatClockTime(exam.jamSelesai || exam.JamSelesai, '22:00');

  // 1. Jika sesi secara eksplisit dibuka oleh Proktor / Guru dengan status 'Berlangsung'
  const explicitStatus = String(exam.status || exam.Status || '').trim().toLowerCase();
  if (explicitStatus === 'berlangsung') {
    return {
      isOpen: true,
      status: 'active',
      statusLabel: '🟢 Ujian Sedang Berlangsung',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      reason: 'Sesi ujian telah diaktifkan oleh proktor / guru.',
      detailedMessage: 'Sesi ujian CBT telah dibuka dan dapat dikerjakan sekarang.',
      scheduledTimeText: `${exam.tglDisplay || exam.tgl || ''} (${jamMulaiStr} - ${jamSelesaiStr} WIB)`,
      canStart: true
    };
  }

  // 2. Jika guru / proktor / superadmin sedang memantau atau menguji di panel CBT
  if (isTeacherOrAdmin) {
    return {
      isOpen: true,
      status: 'active',
      statusLabel: 'Mode Guru / Proktor',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      reason: 'Akses penuh guru & pengawas ujian.',
      detailedMessage: 'Anda masuk dalam mode pengawas/guru.',
      scheduledTimeText: `${exam.tglDisplay || exam.tgl || ''} (${jamMulaiStr} - ${jamSelesaiStr} WIB)`,
      canStart: true
    };
  }

  // 3. Hitung waktu lokal saat ini
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDate = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${currentYear}-${currentMonth}-${currentDate}`;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  // 4. Ekstraksi tanggal jadwal ujian
  let examDateStr = '';
  const rawTgl = String(exam.tgl || exam.tanggal || exam.Tanggal || exam.tenggat || '').trim();
  const dateMatch = rawTgl.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    examDateStr = dateMatch[0];
  } else {
    // Jika format tglDisplay seperti '28 Sep 2026' atau '01 Okt 2026'
    const displayMatch = String(exam.tglDisplay || rawTgl).match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (displayMatch) {
      const day = displayMatch[1].padStart(2, '0');
      const monStr = displayMatch[2].toLowerCase();
      const yr = displayMatch[3];
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
        jun: '06', jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10',
        nov: '11', des: '12', dec: '12'
      };
      if (monthMap[monStr]) {
        examDateStr = `${yr}-${monthMap[monStr]}-${day}`;
      }
    }
  }

  const parseTime = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const cleanTime = formatClockTime(timeStr, '');
    const m = cleanTime.match(/(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  const startMin = parseTime(jamMulaiStr);
  const endMin = parseTime(jamSelesaiStr) || (startMin + 150);

  const hariPrefix = exam.hari ? `${exam.hari}, ` : '';
  const tglFormatted = exam.tglDisplay || examDateStr || 'Jadwal Ditentukan';
  const scheduledText = `${hariPrefix}${tglFormatted} pukul ${jamMulaiStr} - ${jamSelesaiStr} WIB`;

  // Jika tidak ada data tanggal sama sekali pada sesi, biarkan terbuka jika status Aktif
  if (!examDateStr) {
    return {
      isOpen: true,
      status: 'active',
      statusLabel: '🟢 Sesi Terbuka',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      reason: 'Jadwal terbuka tanpa batasan tanggal.',
      detailedMessage: 'Sesi ujian dapat dikerjakan saat ini.',
      scheduledTimeText: scheduledText,
      canStart: true
    };
  }

  // 5. Evaluasi Hari & Tanggal Pelaksanaan
  if (examDateStr > todayDateStr) {
    // Belum hari dan tanggalnya (di masa mendatang)
    return {
      isOpen: false,
      status: 'upcoming',
      statusLabel: `🔒 Terkunci (Sesuai Jadwal)`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      reason: `Soal baru dibuka ketika hari dan tanggalnya sesuai dengan jadwal.`,
      detailedMessage: `Soal ujian baru dapat dibuka ketika hari dan tanggalnya sesuai dengan jadwal pelaksanaan: ${scheduledText}. Harap menunggu hingga hari dan waktu pelaksanaan dimulai.`,
      scheduledTimeText: scheduledText,
      canStart: false
    };
  } else if (examDateStr < todayDateStr) {
    // Tanggal pelaksanaan sudah lewat di masa lalu
    return {
      isOpen: false,
      status: 'ended',
      statusLabel: `Masa Ujian Selesai`,
      badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
      reason: `Jadwal pelaksanaan ujian telah selesai.`,
      detailedMessage: `Masa pelaksanaan ujian pada ${scheduledText} telah berakhir. Silakan hubungi proktor bila Anda memerlukan ujian susulan.`,
      scheduledTimeText: scheduledText,
      canStart: false
    };
  } else {
    // HARI INI TEPAT SESUAI JADWAL!
    // Periksa jam mulai dan selesai
    if (currentMinutesNow < startMin) {
      return {
        isOpen: false,
        status: 'upcoming',
        statusLabel: `🔒 Dibuka Pukul ${jamMulaiStr} WIB`,
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
        reason: `Hari ini adalah hari ujian, soal akan dibuka tepat pada jam pelaksanaan.`,
        detailedMessage: `Hari ini adalah jadwal pelaksanaan ujian Anda! Soal akan otomatis dibuka pada pukul ${jamMulaiStr} WIB (${scheduledText}).`,
        scheduledTimeText: scheduledText,
        canStart: false
      };
    } else if (currentMinutesNow > endMin) {
      return {
        isOpen: false,
        status: 'ended',
        statusLabel: `Waktu Sesi Berakhir`,
        badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
        reason: `Waktu sesi ujian untuk hari ini telah berakhir.`,
        detailedMessage: `Waktu pelaksanaan sesi ujian hari ini telah berakhir pada pukul ${jamSelesaiStr} WIB.`,
        scheduledTimeText: scheduledText,
        canStart: false
      };
    } else {
      // Sedang di dalam jendela jam ujian hari ini!
      return {
        isOpen: true,
        status: 'active',
        statusLabel: `🟢 Dibuka (Hari Ini)`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        reason: `Sesi ujian sedang berlangsung sesuai jadwal hari ini.`,
        detailedMessage: `Sesi ujian sedang berlangsung saat ini (${scheduledText}). Silakan masukkan token dan mulai kerjakan.`,
        scheduledTimeText: scheduledText,
        canStart: true
      };
    }
  }
}
