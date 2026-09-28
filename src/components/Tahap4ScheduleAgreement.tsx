import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  User,
  GraduationCap,
  Lock,
  Sparkles,
  RefreshCw,
  Copy,
  Info
} from 'lucide-react';
import { StudySchedule, StudentProfile, WorkInfo } from '../types';

interface Tahap4ScheduleAgreementProps {
  profile: StudentProfile;
  work: WorkInfo;
  initialSchedule: StudySchedule | null;
  onSaveAndProceed: (schedule: StudySchedule) => void;
  onBackToStep3: () => void;
}

// Smart Grade Group Detector & Sunday Rules
export function getGradeLevelRules(kelasRaw?: string) {
  const k = String(kelasRaw || '').trim().toLowerCase();

  // Kelas 4, 5, 6 (Paket A / Setara SD)
  if (
    k === '4' || k === '5' || k === '6' ||
    k.includes('kelas 4') || k.includes('kelas 5') || k.includes('kelas 6') ||
    k.includes('paket a') || k.includes('sd') || k.includes('mi')
  ) {
    return {
      category: 'SD' as const,
      gradeTitle: 'Kelas 4, 5, 6 (Tingkat Dasar / Paket A)',
      isSundayFixed: true,
      sundayDefaultTime: 'Pagi (10:00 - 12:00 WIB)',
      sundayRuleDesc: 'Kelas 4, 5, 6 : Pagi 10:00 - 12:00',
      sundayOptions: ['Pagi (10:00 - 12:00 WIB)']
    };
  }

  // Kelas 7, 8, 9 (Paket B / Setara SMP)
  if (
    k === '7' || k === '8' || k === '9' ||
    k.includes('kelas 7') || k.includes('kelas 8') || k.includes('kelas 9') ||
    k.includes('paket b') || k.includes('smp') || k.includes('mts')
  ) {
    return {
      category: 'SMP' as const,
      gradeTitle: 'Kelas 7, 8, 9 (Tingkat Menengah / Paket B)',
      isSundayFixed: true,
      sundayDefaultTime: 'Siang (13:00 - 15:00 WIB)',
      sundayRuleDesc: 'Kelas 7, 8, 9 : Siang 13:00 - 15:00',
      sundayOptions: ['Siang (13:00 - 15:00 WIB)']
    };
  }

  // Kelas 10, 11, 12 (Paket C / Setara SMA / SMK / Lulus)
  return {
    category: 'SMA' as const,
    gradeTitle: 'Kelas 10, 11, 12 (Tingkat Atas / Paket C)',
    isSundayFixed: false,
    sundayDefaultTime: 'Sore (15:30 - 17:30 WIB)',
    sundayRuleDesc: 'Kelas 10, 11, 12 : Bisa Sore 15:30 - 17:30 atau Malam 19:00 - 21:00',
    sundayOptions: [
      'Sore (15:30 - 17:30 WIB)',
      'Malam (19:00 - 21:00 WIB)'
    ]
  };
}

export const Tahap4ScheduleAgreement: React.FC<Tahap4ScheduleAgreementProps> = ({
  profile,
  work,
  initialSchedule,
  onSaveAndProceed,
  onBackToStep3,
}) => {
  const currentKelas =
    profile.KelasSaatini ||
    profile.kelasSaatIni ||
    profile.kelasRombel ||
    profile.kelas ||
    profile.tingkat ||
    'Rombel Karang Taruna';

  const gradeRule = getGradeLevelRules(currentKelas);

  // Exactly 3 days selection
  const [customDays, setCustomDays] = useState<string[]>(() => {
    if (initialSchedule?.hariBelajar && initialSchedule.hariBelajar.length > 0) {
      return initialSchedule.hariBelajar.slice(0, 3);
    }
    return ['Senin', 'Rabu', 'Jumat'];
  });

  // State for per-day time selection (Record<day, time>)
  const [dayTimes, setDayTimes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const defaultWeekday = 'Malam (19:00 - 21:00 WIB)';
    const initialDays = initialSchedule?.hariBelajar || ['Senin', 'Rabu', 'Jumat'];

    // If initialSchedule has jadwalPerHari, use it
    if (initialSchedule?.jadwalPerHari) {
      Object.assign(initial, initialSchedule.jadwalPerHari);
    }

    initialDays.forEach((d) => {
      if (!initial[d]) {
        if (d === 'Minggu') {
          initial[d] = gradeRule.sundayDefaultTime;
        } else {
          initial[d] = initialSchedule?.jamBelajar?.includes('WIB') && !initialSchedule.jamBelajar.includes(';')
            ? initialSchedule.jamBelajar
            : defaultWeekday;
        }
      }
    });

    return initial;
  });

  const [customTimeModes, setCustomTimeModes] = useState<Record<string, boolean>>({});
  const [customTimeInputs, setCustomTimeInputs] = useState<Record<string, string>>({});

  const [agreement3x, setAgreement3x] = useState(
    initialSchedule?.persetujuan3xSeminggu ?? true
  );
  const [notes, setNotes] = useState(initialSchedule?.catatanKomitmen || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [swapCandidate, setSwapCandidate] = useState<string | null>(null);

  const daysOfWeek = [
    { key: 'Senin', label: 'Senin', desc: 'Awal Pekan' },
    { key: 'Selasa', label: 'Selasa', desc: 'Hari Kerja' },
    { key: 'Rabu', label: 'Rabu', desc: 'Tengah Pekan' },
    { key: 'Kamis', label: 'Kamis', desc: 'Hari Kerja' },
    { key: 'Jumat', label: 'Jumat', desc: 'Jelang Akhir Pekan' },
    { key: 'Sabtu', label: 'Sabtu', desc: 'Akhir Pekan' },
    { key: 'Minggu', label: 'Minggu', desc: 'Jadwal Khusus Rombel' },
  ];

  const standardWeekdayPresets = [
    { id: 'pagi', label: 'Pagi (10:00 - 12:00 WIB)', tag: 'Pagi' },
    { id: 'siang', label: 'Siang (13:00 - 15:00 WIB)', tag: 'Siang' },
    { id: 'sore', label: 'Sore (15:30 - 17:30 WIB)', tag: 'Sore' },
    { id: 'malam', label: 'Malam (19:00 - 21:00 WIB)', tag: 'Malam' },
  ];

  // Smart day toggle with strict max 3 constraint
  const toggleDay = (day: string) => {
    setValidationError(null);
    setSwapCandidate(null);

    if (customDays.includes(day)) {
      if (customDays.length <= 1) {
        setValidationError('Anda wajib memiliki jadwal belajar. Minimal harus ada hari yang dipilih.');
        return;
      }
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      // Trying to add day
      if (customDays.length >= 3) {
        // TIDAK BISA MEMILIH 4 HARI! PAKAI LOGIKA PINTAR
        setSwapCandidate(day);
        setValidationError(
          `Batas kuota belajar adalah tepat 3 hari (${customDays.join(', ')}). Tidak bisa memilih 4 hari. Silakan klik hari yang ingin ditukar di bawah, atau batalkan salah satu hari terlebih dahulu.`
        );
        return;
      }

      const newDays = [...customDays, day];
      setCustomDays(newDays);

      // Auto-assign default time if not present
      setDayTimes((prev) => {
        if (prev[day]) return prev;
        const timeVal = day === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)';
        return { ...prev, [day]: timeVal };
      });
    }
  };

  // Smart swap helper
  const handleSwapDay = (oldDay: string, newDay: string) => {
    const updated = customDays.map((d) => (d === oldDay ? newDay : d));
    setCustomDays(updated);
    setSwapCandidate(null);
    setValidationError(null);

    setDayTimes((prev) => {
      if (prev[newDay]) return prev;
      const timeVal = newDay === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)';
      return { ...prev, [newDay]: timeVal };
    });
  };

  const handleSelectExact3Days = (days: string[]) => {
    setCustomDays(days);
    setSwapCandidate(null);
    setValidationError(null);

    setDayTimes((prev) => {
      const next = { ...prev };
      days.forEach((d) => {
        if (!next[d]) {
          next[d] = d === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)';
        }
      });
      return next;
    });
  };

  // Set time for a specific day
  const setTimeForDay = (day: string, timeVal: string) => {
    setDayTimes((prev) => ({
      ...prev,
      [day]: timeVal,
    }));
    setValidationError(null);
  };

  // Copy weekday time to all selected weekdays
  const applyTimeFirstWeekdayToAll = (sourceDay: string) => {
    const sourceTime = dayTimes[sourceDay] || 'Malam (19:00 - 21:00 WIB)';
    setDayTimes((prev) => {
      const next = { ...prev };
      customDays.forEach((d) => {
        if (d !== 'Minggu') {
          next[d] = sourceTime;
        }
      });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (customDays.length !== 3) {
      setValidationError(`Wajib memilih tepat 3 (tiga) hari belajar. Saat ini Anda memilih ${customDays.length} hari.`);
      return;
    }

    // Verify each selected day has a time
    for (const d of customDays) {
      const finalTime = dayTimes[d] || (d === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)');

      if (!finalTime || !finalTime.trim()) {
        setValidationError(`Mohon tentukan jam belajar untuk hari ${d}.`);
        return;
      }
    }

    if (!agreement3x) {
      setValidationError('Anda wajib menyetujui pernyataan kesanggupan belajar 3x seminggu untuk melanjutkan.');
      return;
    }

    // Compile times into formatted string
    const finalDayTimes: Record<string, string> = {};
    customDays.forEach((d) => {
      finalDayTimes[d] = dayTimes[d] || (d === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)');
    });

    const timesArray = customDays.map((d) => finalDayTimes[d]);
    const allSameTime = timesArray.every((t) => t === timesArray[0]);

    const finalJamBelajar = allSameTime
      ? timesArray[0]
      : customDays.map((d) => `${d}: ${finalDayTimes[d]}`).join('; ');

    const scheduleData: StudySchedule = {
      paketOpsi: `Jadwal 3 Hari (${customDays.join(', ')})`,
      hariBelajar: customDays,
      jamBelajar: finalJamBelajar,
      jadwalPerHari: finalDayTimes,
      persetujuan3xSeminggu: agreement3x,
      catatanKomitmen: notes,
    };

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);

    onSaveAndProceed(scheduleData);
  };

  return (
    <div id="tahap4-schedule-container" className="space-y-6 sm:space-y-8 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-3xl p-5 sm:p-8 shadow-2xl shadow-indigo-950/60 border border-indigo-500/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-950/90 to-indigo-900/90 border border-blue-400/40 text-blue-300 text-xs font-black px-3.5 py-1 rounded-full shadow-lg">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span className="uppercase tracking-wider">Tahap 4: Kesepakatan Jadwal Belajar</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
            Pilih 3 Hari & Jam Belajar Masing-Masing Hari
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Tentukan <strong>tepat 3 hari belajar</strong> dan jam sesi tatap muka untuk masing-masing hari. Khusus Hari Minggu, jam belajar otomatis disesuaikan dengan tingkat kelas Rombel Karang Taruna.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Error Notification / Smart Swap Alert */}
        {validationError && (
          <div className="bg-rose-950/90 border-2 border-rose-500/70 text-rose-200 p-4 sm:p-5 rounded-2xl text-xs sm:text-sm shadow-xl animate-shake space-y-3">
            <div className="flex items-start gap-3.5">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold mb-0.5">Pemberitahuan Pilihan Hari:</strong>
                <span>{validationError}</span>
              </div>
            </div>

            {/* Smart Swap Buttons when user tries to select 4th day */}
            {swapCandidate && customDays.length === 3 && (
              <div className="pt-2 border-t border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  Tukar hari langsung dengan <strong>{swapCandidate}</strong>:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {customDays.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSwapDay(d, swapCandidate)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 font-black text-xs transition cursor-pointer shadow-md active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ganti {d} ➜ {swapCandidate}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ringkasan Siswa & Info Kelas */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-600/30 border border-blue-400/40 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Siswa & Kelas:</span>
                </div>
                <h3 className="font-black text-white text-base sm:text-xl font-['Outfit',sans-serif] tracking-tight">
                  {profile.namaLengkap}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                  <span>
                    No. PDKT: <strong className="text-yellow-300 font-mono">{profile.nopdkt || profile.idNumber}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    NISN: <strong className="text-slate-200 font-mono">{profile.nisn || profile.NISN || '-'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Info Kelas & Status Kerja */}
            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 text-blue-200 border border-blue-500/40 font-bold shadow-md">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>KELAS: <strong className="text-white font-black">{currentKelas}</strong></span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-slate-300 border border-slate-700 font-medium">
                <span className="text-slate-400">Status:</span>
                <strong className={work.statusBekerja === 'Aktif' ? 'text-emerald-400 font-bold' : 'text-yellow-300 font-bold'}>
                  {work.statusBekerja === 'Aktif' ? `Bekerja (${work.namaTempatKerja})` : 'Belum Bekerja'}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-indigo-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Ketentuan Rombel: <strong>Wajib tepat 3 hari belajar</strong> (maksimal 3 hari, tidak bisa 4 hari).</span>
            </div>
            <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
              customDays.length === 3
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-yellow-500 text-slate-950'
            }`}>
              {customDays.length} / 3 Hari Terpilih
            </span>
          </div>
        </div>

        {/* SECTION 1: PILIH LANGSUNG 3 HARI BELAJAR & TENTUKAN JAMNYA */}
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl p-5 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-yellow-400" />
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
                  Pilih 3 Hari Belajar & Tentukan Jamnya Langsung
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Pilih hari belajar satu per satu dan langsung tentukan jam belajarnya pada hari tersebut. <strong>Jam belajar ada kemungkinan berbeda untuk tiap harinya</strong> sesuai ketersediaan waktu Anda.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400 mr-1">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => handleSelectExact3Days(['Senin', 'Rabu', 'Jumat'])}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-yellow-300 border border-slate-700 transition cursor-pointer"
              >
                Sen-Rab-Jum
              </button>
              <button
                type="button"
                onClick={() => handleSelectExact3Days(['Selasa', 'Kamis', 'Sabtu'])}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-yellow-300 border border-slate-700 transition cursor-pointer"
              >
                Sel-Kam-Sab
              </button>
              <button
                type="button"
                onClick={() => handleSelectExact3Days(['Jumat', 'Sabtu', 'Minggu'])}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-yellow-300 border border-slate-700 transition cursor-pointer"
              >
                Weekend (Jum-Sab-Min)
              </button>

              {customDays.filter((d) => d !== 'Minggu').length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstWeekday = customDays.find((d) => d !== 'Minggu') || customDays[0];
                    applyTimeFirstWeekdayToAll(firstWeekday);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 text-[11px] font-bold transition cursor-pointer shadow-xs"
                  title="Samakan jam hari kerja jika ingin jam seragam"
                >
                  <Copy className="w-3 h-3" />
                  <span>Samakan Jam</span>
                </button>
              )}
            </div>
          </div>

          {/* Day Status Alert */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm ${
            customDays.length === 3
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              {customDays.length === 3 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div>
                <span className="font-bold block">
                  {customDays.length === 3
                    ? `✓ Tepat 3 Hari Belajar Terpilih: ${customDays.join(' • ')}`
                    : `⚠️ Anda memilih ${customDays.length} hari (${customDays.join(', ') || 'Belum ada'}). Wajib tepat 3 hari.`}
                </span>
                <span className="text-xs text-slate-300">
                  {customDays.length === 3
                    ? 'Ketentuan 3 hari belajar terpenuhi. Tentukan atau ubah jam tatap muka masing-masing hari langsung di kartu hari bawah.'
                    : 'Pilih hari belajar dan langsung tentukan jam belajarnya pada hari tersebut.'}
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-xs px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0 self-start sm:self-auto">
              {customDays.length} / 3 Hari Terpilih
            </span>
          </div>

          {/* DAFTAR 7 HARI DENGAN PEMILIHAN JAM LANGSUNG PADA HARI TERKAIT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daysOfWeek.map((dayItem) => {
              const isDaySelected = customDays.includes(dayItem.key);
              const isSunday = dayItem.key === 'Minggu';
              const currentDayTime = dayTimes[dayItem.key] || (isSunday ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)');
              const isCustomMode = customTimeModes[dayItem.key] || false;
              const dayIndex = isDaySelected ? customDays.indexOf(dayItem.key) + 1 : null;

              if (isDaySelected) {
                // KARTU HARI YANG TERPILIH - LANGSUNG MENAMPILKAN DAN MENENTUKAN JAM HARI TERSEBUT
                return (
                  <div
                    key={dayItem.key}
                    id={`day-card-${dayItem.key.toLowerCase()}`}
                    className="rounded-2xl border-2 border-yellow-400/90 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 p-4 sm:p-5 shadow-xl shadow-yellow-500/10 ring-1 ring-yellow-400/30 flex flex-col justify-between space-y-4 transition-all"
                  >
                    {/* Header Hari Terpilih */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                            #{dayIndex}
                          </span>
                          <div>
                            <h4 className="font-black text-white text-base sm:text-lg flex items-center gap-1.5">
                              <span>Hari {dayItem.label}</span>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">({dayItem.desc})</span>
                            </h4>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleDay(dayItem.key)}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800/60 transition cursor-pointer active:scale-95"
                          title="Batalkan hari ini"
                        >
                          ✕ Batal
                        </button>
                      </div>

                      {isSunday && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-500/40 text-[10px] font-black">
                          <span>Jadwal Khusus Tingkat {gradeRule.category}</span>
                        </div>
                      )}
                    </div>

                    {/* PILIHAN JAM LANGSUNG UNTUK HARI INI */}
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Tentukan Jam Belajar {dayItem.label}:</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono italic"></span>
                      </div>

                      {isSunday ? (
                        /* KETENTUAN KHUSUS HARI MINGGU */
                        gradeRule.isSundayFixed ? (
                          <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                              <Lock className="w-3.5 h-3.5" />
                              <span>{gradeRule.sundayDefaultTime}</span>
                            </div>
                            <p className="text-[11px] text-slate-300">
                              {gradeRule.sundayRuleDesc}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {gradeRule.sundayOptions.map((opt) => {
                              const isOptSelected = currentDayTime === opt;
                              return (
                                <button
                                  type="button"
                                  key={opt}
                                  onClick={() => setTimeForDay(dayItem.key, opt)}
                                  className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                                    isOptSelected
                                      ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow font-black ring-2 ring-yellow-400/40'
                                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <span className="text-[10px] uppercase font-bold">{opt.includes('Sore') ? 'Sesi Sore' : 'Sesi Malam'}</span>
                                  <span className="text-xs font-bold leading-tight">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        /* PILIHAN PRESET JAM HARI KERJA / SABTU */
                        <div className="grid grid-cols-2 gap-2">
                          {standardWeekdayPresets.map((preset) => {
                            const isPresetSelected = currentDayTime === preset.label;
                            return (
                              <button
                                type="button"
                                key={preset.id}
                                id={`btn-time-${dayItem.key.toLowerCase()}-${preset.id}`}
                                onClick={() => setTimeForDay(dayItem.key, preset.label)}
                                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                                  isPresetSelected
                                    ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md font-black ring-2 ring-yellow-400/40'
                                    : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    isPresetSelected ? 'bg-slate-950 text-yellow-400' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {preset.tag}
                                  </span>
                                  {isPresetSelected && (
                                    <span className="text-[10px] font-black text-slate-950">✓</span>
                                  )}
                                </div>
                                <span className="text-xs font-bold leading-tight">
                                  {preset.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Jam Hari Terkait */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Jam Terpilih:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-black text-xs font-mono">
                        {currentDayTime}
                      </span>
                    </div>
                  </div>
                );
              }

              // KARTU HARI YANG BELUM DIPILIH (STANDBY)
              return (
                <div
                  key={dayItem.key}
                  id={`day-card-${dayItem.key.toLowerCase()}`}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-5 hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-300 text-base sm:text-lg">Hari {dayItem.label}</h4>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md">
                        {dayItem.desc}
                      </span>
                    </div>
                    {dayItem.key === 'Minggu' && (
                      <span className="text-[10px] font-black uppercase text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30 inline-block">
                        Khusus Rombel
                      </span>
                    )}
                    <p className="text-xs text-slate-500">
                      Klik tombol di bawah untuk memilih hari ini dan langsung tentukan jam belajarnya.
                    </p>
                  </div>

                  {customDays.length < 3 ? (
                    <button
                      type="button"
                      id={`btn-select-day-${dayItem.key.toLowerCase()}`}
                      onClick={() => toggleDay(dayItem.key)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-300 border border-slate-700 hover:border-yellow-400/50 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span>+ Pilih Hari {dayItem.label} & Tentukan Jam</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleDay(dayItem.key)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tukar Hari dengan {dayItem.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* RINGKASAN LANGSUNG 3 HARI BELAJAR DENGAN JAM MASING-MASING */}
          <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-black uppercase text-slate-200 tracking-wider">
                  Ringkasan Kesepakatan 3 Hari & Jam Masing-Masing Hari:
                </span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                customDays.length === 3
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {customDays.length === 3 ? '✓ 3 Hari Siap Disimpan' : `${customDays.length} / 3 Hari Terpilih`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {customDays.map((d, i) => (
                <div key={d} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold uppercase">Hari ke-{i + 1}</span>
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  </div>
                  <strong className="text-white text-base font-bold">{d}</strong>
                  <span className="text-xs text-emerald-300 font-semibold font-mono">
                    {dayTimes[d] || (d === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: CATATAN PENYESUAIAN */}
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl p-5 sm:p-8 space-y-3">
          <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
            2. Catatan Tambahan / Penyesuaian Jadwal (Opsional)
          </label>
          <input
            id="input-catatan-jadwal"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Jika ada lembur mendadak, saya akan memberi kabar ke tutor sebelum jam belajar dimulai."
            className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950 text-white text-xs sm:text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
          />
        </div>

        {/* SECTION 3: KOTAK PERNYATAAN & KESANGGUPAN */}
        <div className="bg-slate-950/90 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-inner space-y-3">
          <label className="flex items-start gap-3.5 cursor-pointer">
            <input
              id="checkbox-agreement-3x"
              type="checkbox"
              checked={agreement3x}
              onChange={(e) => {
                setAgreement3x(e.target.checked);
                if (e.target.checked) setValidationError(null);
              }}
              className="w-5 h-5 rounded-lg border-slate-700 bg-slate-900 text-yellow-500 focus:ring-yellow-400 mt-0.5 cursor-pointer shrink-0"
            />
            <div className="text-xs sm:text-sm text-slate-200">
              <strong className="font-bold text-white block mb-1">
                3. Pernyataan Kesanggupan Mengikuti Jadwal Belajar 3x Seminggu (Wajib Disetujui):
              </strong>
              <p className="text-slate-300 leading-relaxed text-xs">
                Dengan ini saya menyatakan sanggup dan berkomitmen penuh untuk hadir belajar tepat waktu pada{' '}
                <strong className="text-yellow-300">
                  {customDays.length === 3 ? customDays.join(', ') : '3 hari yang dipilih'}
                </strong>{' '}
                dengan rincian jam belajar masing-masing hari yang telah saya tentukan secara sadar dan disiplin.
              </p>
            </div>
          </label>
        </div>

        {/* Ringkasan Akhir Kesepakatan Jadwal */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-blue-300 tracking-wider block">
              Ringkasan Jadwal Kesepakatan:
            </span>
            <div className="text-white font-bold text-xs sm:text-sm flex flex-col gap-1">
              {customDays.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                  <strong className="text-yellow-300">{d}:</strong>
                  <span className="text-slate-200">
                    {customTimeModes[d] && customTimeInputs[d]?.trim()
                      ? customTimeInputs[d]
                      : dayTimes[d] || (d === 'Minggu' ? gradeRule.sundayDefaultTime : 'Malam (19:00 - 21:00 WIB)')}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-400 block pt-1">
              Siswa: <strong>{profile.namaLengkap}</strong> | Kelas: <strong>{currentKelas}</strong>
            </span>
          </div>

          <div className="shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs ${
              customDays.length === 3 && agreement3x
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{customDays.length === 3 && agreement3x ? 'Jadwal Siap Disimpan' : 'Pilih Tepat 3 Hari'}</span>
            </span>
          </div>
        </div>

        {/* Navigasi Tombol */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            id="btn-back-step-3"
            onClick={onBackToStep3}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs sm:text-sm transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke 3. Jadwal Pekerjaan</span>
          </button>

          <button
            type="submit"
            id="btn-confirm-step-4"
            disabled={!agreement3x || customDays.length !== 3}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black px-8 py-4 rounded-2xl text-xs sm:text-sm transition shadow-xl shadow-emerald-600/30 cursor-pointer border border-emerald-400/40"
          >
            <span>Simpan & Lanjut ke 5. Final Pernyataan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

