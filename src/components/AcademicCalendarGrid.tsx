import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface AcademicCalendarGridProps {
  activeDaysList: string[]; // e.g. ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
}

// 0-indexed months
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Initial academic events for 2026/2027 Academic Year (0-indexed months)
const DEFAULT_ACADEMIC_EVENTS = [
  // Juli 2026 (Month 6)
  { id: 'ev_1', day: 13, month: 6, year: 2026, agenda: 'Hari Pertama Masuk Sekolah & Masa Pengenalan Lingkungan Sekolah (MPLS)', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' },
  { id: 'ev_2', day: 15, month: 6, year: 2026, agenda: 'Ujian Asesmen Diagnostik Fisika (Kelas 12)', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_3', day: 16, month: 6, year: 2026, agenda: 'Ujian Asesmen Diagnostik Matematika (Kelas 12)', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_4', day: 20, month: 6, year: 2026, agenda: 'Rapat Pleno Komite & Sosialisasi Program Sekolah Orang Tua', tipe: 'Rapat', warna: 'amber', colorClass: 'bg-amber-500 text-white' },
  { id: 'ev_5', day: 25, month: 6, year: 2026, agenda: 'Libur Nasional Tahun Baru Hijriah 1448 H', tipe: 'Libur', warna: 'emerald', colorClass: 'bg-emerald-500 text-white' },

  // Agustus 2026 (Month 7)
  { id: 'ev_6', day: 14, month: 7, year: 2026, agenda: 'Upacara Hari Pramuka & Kemah Blok Sekolah', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },
  { id: 'ev_7', day: 17, month: 7, year: 2026, agenda: 'Upacara HUT Kemerdekaan RI Ke-81', tipe: 'Libur', warna: 'emerald', colorClass: 'bg-emerald-500 text-white' },
  { id: 'ev_8', day: 18, month: 7, year: 2026, agenda: 'Pekan Lomba & Festival Seni Budaya Tambora', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },

  // September 2026 (Month 8)
  { id: 'ev_9', day: 14, month: 8, year: 2026, agenda: 'Penilaian Tengah Semester (PTS) Ganjil Hari 1', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_10', day: 18, month: 8, year: 2026, agenda: 'Penilaian Tengah Semester (PTS) Ganjil Hari Terakhir', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_11', day: 25, month: 8, year: 2026, agenda: 'Peringatan Maulid Nabi Muhammad SAW 1448 H', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },

  // Oktober 2026 (Month 9)
  { id: 'ev_12', day: 1, month: 9, year: 2026, agenda: 'Upacara Hari Kesaktian Pancasila', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },
  { id: 'ev_13', day: 10, month: 9, year: 2026, agenda: 'Pembagian Rapor Laporan Hasil PTS Ganjil', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' },
  { id: 'ev_14', day: 28, month: 9, year: 2026, agenda: 'Peringatan Hari Sumpah Pemuda & Bulan Bahasa', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },

  // November 2026 (Month 10)
  { id: 'ev_15', day: 10, month: 10, year: 2026, agenda: 'Upacara Hari Pahlawan & Ziarah Edukasi', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },
  { id: 'ev_16', day: 25, month: 10, year: 2026, agenda: 'Hari Guru Nasional & Apresiasi Pendidik Rombel', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },

  // Desember 2026 (Month 11)
  { id: 'ev_17', day: 7, month: 11, year: 2026, agenda: 'Asesmen Sumatif Akhir Semester (ASAS) Ganjil Mulai', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_18', day: 15, month: 11, year: 2026, agenda: 'Asesmen Sumatif Akhir Semester (ASAS) Ganjil Selesai', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_19', day: 18, month: 11, year: 2026, agenda: 'Penyerahan Rapor Semester Ganjil TA 2026/2027', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' },
  { id: 'ev_20', day: 21, month: 11, year: 2026, agenda: 'Libur Semester Ganjil & Hari Raya Natal', tipe: 'Libur', warna: 'emerald', colorClass: 'bg-emerald-500 text-white' },

  // Januari 2027 (Month 0)
  { id: 'ev_21', day: 4, month: 0, year: 2027, agenda: 'Hari Pertama Masuk Sekolah Semester Genap', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' },
  { id: 'ev_22', day: 16, month: 0, year: 2027, agenda: 'Peringatan Isra Miraj Nabi Muhammad SAW', tipe: 'Libur', warna: 'emerald', colorClass: 'bg-emerald-500 text-white' },

  // Februari 2027 (Month 1)
  { id: 'ev_23', day: 8, month: 1, year: 2027, agenda: 'Try Out CBT Ujian Sekolah Gelombang 1', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_24', day: 15, month: 1, year: 2027, agenda: 'Simulasi Asesmen Nasional Berbasis Komputer (ANBK)', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },

  // Maret 2027 (Month 2)
  { id: 'ev_25', day: 8, month: 2, year: 2027, agenda: 'Pesantren Kilat Ramadhan & Kajian Karakter Inklusif', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },
  { id: 'ev_26', day: 22, month: 2, year: 2027, agenda: 'Libur Awal Idul Fitri 1448 H', tipe: 'Libur', warna: 'emerald', colorClass: 'bg-emerald-500 text-white' },

  // April 2027 (Month 3)
  { id: 'ev_27', day: 5, month: 3, year: 2027, agenda: 'Masuk Kembali Sekolah Pasca Libur Idul Fitri & Halal Bihalal', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' },

  // Mei 2027 (Month 4)
  { id: 'ev_28', day: 2, month: 4, year: 2027, agenda: 'Upacara Hari Pendidikan Nasional (Hardiknas)', tipe: 'Kegiatan', warna: 'purple', colorClass: 'bg-purple-500 text-white' },
  { id: 'ev_29', day: 17, month: 4, year: 2027, agenda: 'Ujian Praktik & Pameran Karya Inovasi Siswa', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },

  // Juni 2027 (Month 5)
  { id: 'ev_30', day: 7, month: 5, year: 2027, agenda: 'Asesmen Akhir Semester (AAS) Genap Mulai', tipe: 'Ujian', warna: 'red', colorClass: 'bg-rose-500 text-white' },
  { id: 'ev_31', day: 15, month: 5, year: 2027, agenda: 'Rapat Pleno Dewan Guru Kenaikan Kelas & Kelulusan', tipe: 'Rapat', warna: 'amber', colorClass: 'bg-amber-500 text-white' },
  { id: 'ev_32', day: 19, month: 5, year: 2027, agenda: 'Wisuda Kelulusan & Penyerahan Rapor Semester Genap', tipe: 'Akademik', warna: 'blue', colorClass: 'bg-blue-500 text-white' }
];

export default function AcademicCalendarGrid({ activeDaysList }: AcademicCalendarGridProps) {
  // Set to July 2026 by default for academic start
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 14));
  const [selectedDay, setSelectedDay] = useState<number | null>(14);
  const [events, setEvents] = useState<any[]>(() => {
    const saved = localStorage.getItem('ERP_academic_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : DEFAULT_ACADEMIC_EVENTS;
      } catch (e) {
        return DEFAULT_ACADEMIC_EVENTS;
      }
    }
    return DEFAULT_ACADEMIC_EVENTS;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const saveEvents = (newEvents: any[]) => {
    setEvents(newEvents);
    localStorage.setItem('ERP_academic_events', JSON.stringify(newEvents));
  };

  const handleAddEvent = () => {
    const targetDay = selectedDay || 14;
    if (typeof Swal === 'undefined') return;

    Swal.fire({
      title: 'Tambah Agenda / Tandai Kalender',
      html: `
        <div class="text-left space-y-3 font-sans text-xs">
          <div>
            <label class="font-bold text-slate-700 block mb-1">Tanggal Dipilih</label>
            <input type="text" readonly value="${targetDay} ${INDONESIAN_MONTHS[month]} ${year}" class="w-full bg-slate-100 border rounded-lg p-2 font-mono font-bold text-slate-600" />
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">Nama Agenda / Kegiatan *</label>
            <input id="swal-input-agenda" type="text" placeholder="Contoh: Rapat Wali Murid / Mid Test" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">Kategori Tipe</label>
            <select id="swal-input-tipe" class="w-full border rounded-lg p-2 font-semibold text-slate-700">
              <option value="Akademik">Akademik</option>
              <option value="Ujian">Ujian / Evaluasi</option>
              <option value="Rapat">Rapat / Pertemuan</option>
              <option value="Libur">Libur / Non-Aktif</option>
              <option value="Kegiatan">Kegiatan Siswa</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">Warna Penanda</label>
            <select id="swal-input-warna" class="w-full border rounded-lg p-2 font-semibold text-slate-700">
              <option value="blue">Biru (Akademik)</option>
              <option value="red">Merah (Ujian / Penting)</option>
              <option value="amber">Kuning / Oranye (Rapat)</option>
              <option value="emerald">Hijau (Libur / Santai)</option>
              <option value="purple">Ungu (Kegiatan Khusus)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan Agenda',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const agenda = (document.getElementById('swal-input-agenda') as HTMLInputElement)?.value;
        const tipe = (document.getElementById('swal-input-tipe') as HTMLSelectElement)?.value;
        const warna = (document.getElementById('swal-input-warna') as HTMLSelectElement)?.value;

        if (!agenda || !agenda.trim()) {
          Swal.showValidationMessage('Nama agenda wajib diisi!');
          return false;
        }
        return { agenda, tipe, warna };
      }
    }).then((res: any) => {
      if (res.isConfirmed && res.value) {
        const newEv = {
          id: 'ev_' + Date.now(),
          day: targetDay,
          month: month,
          year: year,
          agenda: res.value.agenda,
          tipe: res.value.tipe,
          warna: res.value.warna,
          colorClass: res.value.warna === 'blue' ? 'bg-blue-500 text-white' :
                      res.value.warna === 'red' ? 'bg-rose-500 text-white' :
                      res.value.warna === 'amber' ? 'bg-amber-500 text-white' :
                      res.value.warna === 'emerald' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
        };
        const updated = [...events, newEv];
        saveEvents(updated);
        Swal.fire('Tersimpan!', 'Agenda akademik berhasil ditandai pada kalender.', 'success');
      }
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (typeof Swal === 'undefined') return;

    Swal.fire({
      title: 'Hapus Agenda?',
      text: 'Agenda ini akan dihapus dari kalender akademik.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updated = events.filter(e => e.id !== eventId);
        saveEvents(updated);
        Swal.fire('Terhapus', 'Agenda berhasil dihapus.', 'success');
      }
    });
  };

  // Days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // First day of current month (day of week index: 0 = Sunday, 1 = Monday...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Previous month navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const prevMonth = prev.getMonth() === 0 ? 11 : prev.getMonth() - 1;
      const prevYear = prev.getMonth() === 0 ? prev.getFullYear() - 1 : prev.getFullYear();
      return new Date(prevYear, prevMonth, 1);
    });
    setSelectedDay(null);
  };

  // Next month navigation
  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const nextMonth = prev.getMonth() === 11 ? 0 : prev.getMonth() + 1;
      const nextYear = prev.getMonth() === 11 ? prev.getFullYear() + 1 : prev.getFullYear();
      return new Date(nextYear, nextMonth, 1);
    });
    setSelectedDay(null);
  };

  // Check if a specific date is an active school day based on settings config
  const isSchoolDayActive = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    const dayName = DAY_NAMES_LONG[d.getDay()];
    return (activeDaysList || []).includes(dayName);
  };

  // Find events for specific day
  const getEventsForDay = (dayNum: number) => {
    return events.filter(e => e.day === dayNum && e.month === month && e.year === year);
  };

  // Generate calendar grid array
  const calendarCells = [];
  
  // Empty slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, isCurrentMonth: false });
  }

  // Active dates of the current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ day: i, isCurrentMonth: true });
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDayIsActive = selectedDay ? isSchoolDayActive(selectedDay) : false;

  const getDayOfWeekName = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    return DAY_NAMES_LONG[d.getDay()];
  };

  // Helper formatting helper
  const getFormattedDateLong = (dayNum: number) => {
    return `${dayNum} ${INDONESIAN_MONTHS[month]} ${year}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 dark:border-slate-800 border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6" id="academic-calendar-grid-card">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider font-display">Kalender Hari Aktif & Agenda</h4>
            <p className="text-[11px] text-slate-400">Visualisasi jadwal pembelajaran real-time</p>
          </div>
        </div>

        {/* Action Button & Month Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  title: 'Reset Kalender Akademik?',
                  text: 'Kembalikan seluruh agenda ke jadwal resmi Tahun Ajaran 2026/2027.',
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonText: 'Ya, Reset Kalender',
                  confirmButtonColor: '#2563eb',
                  cancelButtonText: 'Batal'
                }).then((res: any) => {
                  if (res.isConfirmed) {
                    saveEvents(DEFAULT_ACADEMIC_EVENTS);
                    setCurrentDate(new Date(2026, 6, 14));
                    setSelectedDay(14);
                    Swal.fire('Berhasil Reset', 'Kalender akademik 2026/2027 dipulihkan.', 'success');
                  }
                });
              }
            }}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            title="Reset Kalender ke Default"
          >
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleAddEvent}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tandai Agenda</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold font-mono px-2 text-slate-800 dark:text-slate-200">
              {INDONESIAN_MONTHS[month]} {year}
            </span>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Days header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES_SHORT.map((name, idx) => (
          <span 
            key={idx} 
            className={`text-[10px] font-extrabold uppercase py-1 tracking-wider ${
              idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-amber-500' : 'text-slate-400'
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell, idx) => {
          if (cell.day === null) {
            return (
              <div 
                key={`empty-${idx}`} 
                className="aspect-square bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/50 rounded-xl"
              />
            );
          }

          const dayNum = cell.day;
          const isActive = isSchoolDayActive(dayNum);
          const dayEvents = getEventsForDay(dayNum);
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDay === dayNum;
          const isToday = dayNum === 14 && month === 6 && year === 2026; // Highlight simulated today July 14, 2026

          // Design dynamic cell coloring
          let cellBg = 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
          if (isActive) {
            cellBg = 'bg-blue-50/40 dark:bg-blue-900/30 hover:bg-blue-50 border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-200';
          }
          if (isToday) {
            cellBg = 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-md shadow-indigo-600/10';
          }
          if (isSelected) {
            cellBg = 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-md shadow-emerald-600/10';
          }

          return (
            <motion.button
              key={`day-${dayNum}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(dayNum)}
              className={`relative aspect-square border rounded-xl flex flex-col items-center justify-center font-mono font-bold text-xs transition-all cursor-pointer ${cellBg}`}
              id={`calendar-cell-${dayNum}`}
            >
              <span>{dayNum}</span>

              {/* Indicators for Active/Rest Days */}
              {isActive && !isToday && !isSelected && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}

              {/* Event indicators */}
              {hasEvents && (
                <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                  isToday || isSelected ? 'bg-white' : 'bg-rose-500'
                }`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-lg bg-blue-500/15 border border-blue-200 inline-block"></span>
          <span>Hari Kerja Aktif</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block"></span>
          <span>Hari Kerja Libur/Non-aktif</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
          <span>Ada Kegiatan / Agenda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-lg bg-emerald-600 inline-block"></span>
          <span>Dipilih</span>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 space-y-3"
            id="calendar-details-panel"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Detail Tanggal: {getDayOfWeekName(selectedDay)}
              </span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                selectedDayIsActive 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' 
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              }`}>
                {selectedDayIsActive ? 'HARI KERJA AKTIF' : 'HARI LIBUR'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{getFormattedDateLong(selectedDay)}</h5>
              <button
                type="button"
                onClick={handleAddEvent}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Tandai Tanggal Ini
              </button>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-1 h-10 rounded-full shrink-0 ${
                        ev.warna === 'blue' ? 'bg-blue-500' :
                        ev.warna === 'red' ? 'bg-rose-500' :
                        ev.warna === 'amber' ? 'bg-amber-500' :
                        ev.warna === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
                      }`} />
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-tight">{ev.agenda}</p>
                        <span className="inline-block text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded mt-1.5">
                          {ev.tipe}
                        </span>
                      </div>
                    </div>
                    {ev.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Hapus Agenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Tidak ada agenda khusus atau kegiatan terjadwal pada hari ini. Pembelajaran berjalan normal sesuai jadwal pelajaran.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

declare const Swal: any;
