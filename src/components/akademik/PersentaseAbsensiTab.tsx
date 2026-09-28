import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  matchClass, matchStatusActive, getActiveClasses, getAllClasses, 
  formatClassLabel, sortStudentsByStatusAndName, getStatusPriority, triggerPrint,
  getTodayDateString, getLocalDateString, standardizeDate
} from '../../lib/utils';
import { exportToExcel } from '../../lib/excel';
import { 
  Percent, Calendar, Users, Filter, Search, Download, Printer,
  TrendingUp, Award, AlertTriangle, CheckCircle2, XCircle, 
  Clock, HeartPulse, FileSpreadsheet, Send, ChevronRight,
  Eye, RefreshCw, BarChart3, PieChart as PieChartIcon, ArrowUpDown,
  Sparkles, CalendarRange, Info, X, CalendarCheck, CheckSquare, SlidersHorizontal,
  Briefcase, Sun, Moon
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import StudentPhoto, { resolveStudentPhoto } from './StudentPhoto';
import CetakPersentaseModal, { getJenjangInfo, getCleanClassDisplay } from './CetakPersentaseModal';
import CustomDropdown from '../common/CustomDropdown';
import { getStudentEffectiveGroup } from './VerifikasiKerjaModal';

export interface StudentAttendanceStat {
  studentId: string;
  nisn: string;
  nis: string;
  name: string;
  status?: string;
  photo?: string;
  class: string;
  gender: string;
  parentPhone: string;
  totalDays: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  terlambat: number;
  percentage: number;
  standardPercentage?: number;
  smartPercentage?: number;
  predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perhatian';
  predicateColor: string;
  dailyRecords: Array<{
    date: string;
    status: 'H' | 'S' | 'I' | 'A' | 'T' | 'Libur' | '-';
    note?: string;
    time?: string;
  }>;
}

export default function PersentaseAbsensiTab() {
  const { students, teachers, settings } = useStore();
  const activeClasses = useMemo(() => getActiveClasses(students), [students]);
  const allClasses = useMemo(() => getAllClasses(students), [students]);

  // View Filter Mode: 'range' (Rentang Tanggal) or 'monthly' (Per Bulan)
  const [filterMode, setFilterMode] = useState<'range' | 'monthly'>('range');

  // Selected Class ('ALL' or specific class like '1A', '2B')
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return activeClasses.length > 0 ? activeClasses[0] : (allClasses[0] || '1A');
  });

  // Monthly mode states
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Date range mode states (Default: Current month from 1st to today or end of month)
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return getTodayDateString();
  });

  // Manual Effective Days (Diisi Manual oleh Guru - Default 4 Hari)
  const [manualDays, setManualDaysState] = useState<number>(() => {
    const saved = db.get<number>('kbm_effective_days' as any);
    if (typeof saved === 'number' && saved > 0) return saved;
    if (Array.isArray(saved) && typeof saved[0] === 'number' && saved[0] > 0) return saved[0];
    return 4;
  });

  const setManualDays = (val: number | ((prev: number) => number)) => {
    setManualDaysState(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      const cleanVal = Math.max(1, Math.min(365, nextVal));
      try {
        db.set('kbm_effective_days', cleanVal);
      } catch (e) {
        // ignore
      }
      return cleanVal;
    });
  };
  const [calcMode, setCalcMode] = useState<'standard' | 'smart'>(() => {
    const saved = db.get('calc_attendance_mode' as any) as unknown;
    return saved === 'smart' ? 'smart' : 'standard';
  });

  const handleSetCalcMode = (mode: 'standard' | 'smart') => {
    setCalcMode(mode);
    try {
      db.set('calc_attendance_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  const [studentOverrides, setStudentOverrides] = useState<Record<string, { hadir?: number; sakit?: number; izin?: number; alpa?: number; terlambat?: number }>>({});
  const [isEditingData, setIsEditingData] = useState<boolean>(false);

  // Search & Filter & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [predicateFilter, setPredicateFilter] = useState<string>('ALL');
  const [shiftFilter, setShiftFilter] = useState<'Semua' | 'Aktif Bekerja' | 'Tidak Bekerja'>('Semua');
  const [sortBy, setSortBy] = useState<'percentage-desc' | 'percentage-asc' | 'name-asc' | 'alpa-desc' | 'status-first'>('percentage-desc');
  const [ignoreSundays, setIgnoreSundays] = useState<boolean>(false);

  // Modal for Cetak Persentase (Official PDF/PNG and WhatsApp Sharing)
  const [isCetakModalOpen, setIsCetakModalOpen] = useState<boolean>(false);

  // Selected student for detail popup modal
  const [detailStudent, setDetailStudent] = useState<StudentAttendanceStat | null>(null);

  // Refresh trigger on local edits or erp database updates
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (!e.detail?.key || e.detail.key === 'absensi' || e.detail.key === 'perizinan_siswa' || e.detail.key === 'kbm_effective_days' || e.detail.key === 'recent_qr_scans') {
        setRefreshKey(prev => prev + 1);
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('focus', () => setRefreshKey(prev => prev + 1));
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('focus', () => setRefreshKey(prev => prev + 1));
    };
  }, []);

  // Homeroom teacher (Wali Kelas)
  const waliKelas = useMemo(() => {
    if (selectedClass === 'ALL' || !selectedClass) return null;
    return teachers.find(t => {
      if (!t) return false;
      return matchClass(t.class, selectedClass) || 
             matchClass((t as any).waliKelas, selectedClass) || 
             matchClass((t as any).kelasWali, selectedClass) || 
             matchClass((t as any).rombel, selectedClass);
    });
  }, [teachers, selectedClass]);

  const kepsek = useMemo(() => {
    return teachers.find(t => t && (t.class === 'Kepala Sekolah' || (t.class && String(t.class).toLowerCase().includes('kepala')))) || {
      name: settings.headmasterName || 'Kepala Sekolah',
      nip: settings.headmasterNip || '-'
    };
  }, [teachers, settings]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Helper: Quick preset dates
  const handleApplyPreset = (preset: 'this-month' | 'last-month' | 'last-7' | 'last-30' | 'sem-1' | 'sem-2') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'this-month') {
      setFilterMode('range');
      setStartDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
      setEndDate(getTodayDateString());
    } else if (preset === 'last-month') {
      setFilterMode('range');
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      const lastDay = new Date(prevY, prevM + 1, 0).getDate();
      setStartDate(`${prevY}-${String(prevM + 1).padStart(2, '0')}-01`);
      setEndDate(`${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last-7') {
      setFilterMode('range');
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setStartDate(getLocalDateString(d7));
      setEndDate(getTodayDateString());
    } else if (preset === 'last-30') {
      setFilterMode('range');
      const d30 = new Date();
      d30.setDate(d30.getDate() - 29);
      setStartDate(getLocalDateString(d30));
      setEndDate(getTodayDateString());
    } else if (preset === 'sem-1') {
      setFilterMode('range');
      setStartDate(`${y}-07-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === 'sem-2') {
      setFilterMode('range');
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-06-30`);
    }
  };

  // Determine active effective date list based on filter mode
  const effectiveDates = useMemo(() => {
    const dates: string[] = [];
    const allAbsensi = (db.get('absensi') as any[]) || [];
    const datesWithAttendance = new Set<string>();
    allAbsensi.forEach(a => {
      const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl;
      const stdDate = standardizeDate(rawDate) || rawDate;
      if (stdDate) datesWithAttendance.add(stdDate);
      if (rawDate) datesWithAttendance.add(rawDate);
    });

    if (filterMode === 'monthly') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(selectedYear, selectedMonth, day);
        const dayOfWeek = d.getDay(); // 0 is Sunday
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // If Sunday, only skip if ignoreSundays is true AND there is no recorded attendance for that Sunday
        if (ignoreSundays && dayOfWeek === 0 && !datesWithAttendance.has(dateStr)) continue;
        dates.push(dateStr);
      }
    } else {
      // Range mode
      if (!startDate || !endDate) return [];
      const [sY, sM, sD] = startDate.split('-').map(Number);
      const [eY, eM, eD] = endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);

      if (start > end) return [];

      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = getLocalDateString(current);
        if (!ignoreSundays || dayOfWeek !== 0 || datesWithAttendance.has(dateStr)) {
          dates.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }, [filterMode, selectedMonth, selectedYear, startDate, endDate, ignoreSundays, refreshKey]);

  // Formatted date label for header/reports (Lengkap tanpa singkatan)
  const rangeDisplayLabel = useMemo(() => {
    if (filterMode === 'monthly') {
      return `Bulan ${monthNames[selectedMonth]} ${selectedYear}`;
    }
    if (!startDate || !endDate) return 'Rentang Tanggal';
    
    const formatIndonesianFullDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const startFormatted = formatIndonesianFullDate(startDate);
    const endFormatted = formatIndonesianFullDate(endDate);
    return `${startFormatted} s/d ${endFormatted}`;
  }, [filterMode, selectedMonth, selectedYear, startDate, endDate]);

  // Filter students based on selected class
  const targetStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    let list = students.filter(s => s && matchStatusActive(s.status));
    if (selectedClass !== 'ALL') {
      list = list.filter(s => matchClass(s.class, selectedClass));
    }
    return sortStudentsByStatusAndName(list);
  }, [students, selectedClass]);

  // Calculate stats for each student in the given date range & manual effective days
  const studentStats = useMemo(() => {
    const allAbsensi = (db.get('absensi') as any[]) || [];
    
    // Count distinct dates that have filled attendance for active students in this class/range
    const filledDatesSet = new Set<string>();
    allAbsensi.forEach(a => {
      const aDate = a.date || a.Tanggal || a.tanggal || a.tgl;
      const aStatus = String(a.status || a.Status || a.statusLabel || '').trim().toUpperCase();
      if (aDate && aStatus && aStatus !== '-') {
        filledDatesSet.add(aDate);
      }
    });

    const totalEffectiveDays = Math.max(1, Number(manualDays) || 1);

    // Pre-index attendance with normalized dates & multiple identifiers
    const absensiIndex = new Map<string, any>();
    allAbsensi.forEach(a => {
      const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl;
      const stdDate = standardizeDate(rawDate) || rawDate;
      const aStudentId = a.studentId || a.SiswaID || a.siswaId || a.id;
      const aNisn = a.nisn || a.NISN;
      const aNis = a.nis || a.NIS;
      const aName = a.name || a.NamaSiswa || a.namaSiswa || a.nama;

      const keys: string[] = [];
      if (aStudentId) {
        keys.push(`${String(aStudentId).trim()}`);
        keys.push(`${String(aStudentId).trim().toLowerCase()}`);
      }
      if (aNisn) {
        keys.push(`${String(aNisn).trim()}`);
      }
      if (aNis) {
        keys.push(`${String(aNis).trim()}`);
      }
      if (aName) {
        keys.push(`${String(aName).trim().toLowerCase()}`);
      }

      keys.forEach(k => {
        if (stdDate) absensiIndex.set(`${k}_${stdDate}`, a);
        if (rawDate) absensiIndex.set(`${k}_${rawDate}`, a);
      });
    });

    const results: StudentAttendanceStat[] = targetStudents.map(student => {
      let rawHadir = 0;
      let rawSakit = 0;
      let rawIzin = 0;
      let rawAlpa = 0;
      let rawTerlambat = 0;

      const dailyRecords: Array<{
        date: string;
        status: 'H' | 'S' | 'I' | 'A' | 'T' | 'Libur' | '-';
        note?: string;
        time?: string;
      }> = [];

      const studentNameKey = String(student.name || '').trim().toLowerCase();
      const studentIdKey = String(student.id || '').trim();
      const studentNisnKey = student.nisn ? String(student.nisn).trim() : '';
      const studentNisKey = student.nis ? String(student.nis).trim() : '';

      effectiveDates.forEach(dateStr => {
        const stdDateStr = standardizeDate(dateStr) || dateStr;
        const rec = absensiIndex.get(`${studentIdKey}_${stdDateStr}`) || 
                    absensiIndex.get(`${studentIdKey.toLowerCase()}_${stdDateStr}`) ||
                    (studentNisnKey ? absensiIndex.get(`${studentNisnKey}_${stdDateStr}`) : null) ||
                    (studentNisKey ? absensiIndex.get(`${studentNisKey}_${stdDateStr}`) : null) ||
                    absensiIndex.get(`${studentNameKey}_${stdDateStr}`) ||
                    absensiIndex.get(`${studentIdKey}_${dateStr}`) ||
                    (studentNisnKey ? absensiIndex.get(`${studentNisnKey}_${dateStr}`) : null) ||
                    absensiIndex.get(`${studentNameKey}_${dateStr}`);

        if (rec) {
          const rawStatus = String(rec.status || rec.Status || rec.statusLabel || '').trim().toUpperCase();
          const recNote = rec.note || rec.Keterangan || rec.keterangan || '';
          const recTime = rec.time || rec.JamMasuk || rec.jamMasuk || '';

          if (rawStatus.startsWith('S') || rawStatus === 'SAKIT') {
            rawSakit++;
            dailyRecords.push({ date: dateStr, status: 'S', note: recNote, time: recTime });
          } else if (rawStatus.startsWith('I') || rawStatus === 'IZIN') {
            rawIzin++;
            dailyRecords.push({ date: dateStr, status: 'I', note: recNote, time: recTime });
          } else if (rawStatus.startsWith('A') || rawStatus === 'ALPA') {
            rawAlpa++;
            dailyRecords.push({ date: dateStr, status: 'A', note: recNote, time: recTime });
          } else if (rawStatus.startsWith('T') || rawStatus === 'TERLAMBAT') {
            rawTerlambat++;
            dailyRecords.push({ date: dateStr, status: 'T', note: recNote, time: recTime });
          } else if (rawStatus.startsWith('H') || rawStatus === 'HADIR') {
            rawHadir++;
            dailyRecords.push({ date: dateStr, status: 'H', note: recNote, time: recTime });
          } else {
            dailyRecords.push({ date: dateStr, status: '-', note: 'Belum Diisi' });
          }
        } else {
          // Tanggal belum diinput presensi oleh guru -> Ditandai '-' (Bukan Hadir!)
          dailyRecords.push({ date: dateStr, status: '-', note: 'Belum Diinput' });
        }
      });

      // Apply individual student overrides if any (User edit langsung pada tabel)
      const override = studentOverrides[student.id] || {};
      const hadir = override.hadir !== undefined ? override.hadir : rawHadir;
      const sakit = override.sakit !== undefined ? override.sakit : rawSakit;
      const izin = override.izin !== undefined ? override.izin : rawIzin;
      const alpa = override.alpa !== undefined ? override.alpa : rawAlpa;
      const terlambat = override.terlambat !== undefined ? override.terlambat : rawTerlambat;

      // 1. Rumus Standar (Presensi Murni Kemdikbud): (Hadir + Terlambat) / Hari Efektif * 100%
      const totalAttended = hadir + terlambat;
      const standardPercentage = totalEffectiveDays > 0 
        ? Math.min(100, Math.round((totalAttended / totalEffectiveDays) * 1000) / 10) 
        : 0;

      // 2. Rumus Logika Pintar (Bobot Dispensasi Keaktifan):
      // Hadir: 1.0 (100%) | Sakit: 0.8 (80%) | Izin: 0.6 (60%) | Terlambat: 0.9 (90%) | Alpa: 0.0 (0%)
      const smartWeightedScore = (hadir * 1.0) + (sakit * 0.8) + (izin * 0.6) + (terlambat * 0.9);
      const smartPercentage = totalEffectiveDays > 0
        ? Math.min(100, Math.max(0, Math.round((smartWeightedScore / totalEffectiveDays) * 1000) / 10))
        : 0;

      const percentage = calcMode === 'smart' ? smartPercentage : standardPercentage;

      let predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perhatian' = 'Sangat Baik';
      let predicateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

      if (percentage >= 95) {
        predicate = 'Sangat Baik';
        predicateColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      } else if (percentage >= 85) {
        predicate = 'Baik';
        predicateColor = 'text-blue-700 bg-blue-50 border-blue-200';
      } else if (percentage >= 75) {
        predicate = 'Cukup';
        predicateColor = 'text-amber-700 bg-amber-50 border-amber-200';
      } else {
        predicate = 'Perlu Perhatian';
        predicateColor = 'text-rose-700 bg-rose-50 border-rose-200';
      }

      return {
        studentId: student.id,
        nisn: student.nisn || (student as any).NISN || student.nis || '-',
        nis: student.nis || (student as any).NIS || '-',
        name: student.name,
        status: student.status || 'Aktif',
        photo: resolveStudentPhoto(student),
        class: student.class || selectedClass,
        gender: student.gender || 'L',
        parentPhone: student.parentPhone || student.teleponOrtu || (student as any).noHp || '-',
        totalDays: totalEffectiveDays,
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
        percentage,
        standardPercentage,
        smartPercentage,
        predicate,
        predicateColor,
        dailyRecords
      };
    });

    return results;
  }, [targetStudents, effectiveDates, selectedClass, refreshKey, manualDays, studentOverrides, calcMode]);

  // Filtered & Sorted student list (Aktif -> Tidak Aktif -> Belum)
  const filteredSortedStudents = useMemo(() => {
    let result = [...studentStats];

    if (shiftFilter !== 'Semua') {
      result = result.filter(s => {
        const origStudent = students.find(st => st.id === s.studentId);
        if (!origStudent) return true;
        const eff = getStudentEffectiveGroup(origStudent);
        return eff.group === shiftFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.nisn.includes(q) || 
        s.nis.includes(q) ||
        (s.status && s.status.toLowerCase().includes(q))
      );
    }

    if (predicateFilter !== 'ALL') {
      result = result.filter(s => s.predicate === predicateFilter);
    }

    result.sort((a, b) => {
      // 1. Urutkan Sesuai Pilihan Pengguna
      if (sortBy === 'percentage-desc') {
        // Utama: Persentase Paling Tinggi (100% -> 0%)
        if (Math.abs(b.percentage - a.percentage) > 0.001) {
          return b.percentage - a.percentage;
        }
        // Kedua: Jika persentase sama, urutkan Status: Aktif (1) -> Tidak Aktif (2) -> Belum (3)
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) {
          return pA - pB;
        }
        // Ketiga: Nama Siswa (A - Z)
        return a.name.localeCompare(b.name, 'id');
      } else if (sortBy === 'status-first') {
        // Utama: Status Aktif (1) -> Tidak Aktif (2) -> Belum (3)
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) {
          return pA - pB;
        }
        // Kedua: Persentase Tertinggi
        if (Math.abs(b.percentage - a.percentage) > 0.001) {
          return b.percentage - a.percentage;
        }
        return a.name.localeCompare(b.name, 'id');
      } else if (sortBy === 'percentage-asc') {
        if (Math.abs(a.percentage - b.percentage) > 0.001) {
          return a.percentage - b.percentage;
        }
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) {
          return pA - pB;
        }
        return a.name.localeCompare(b.name, 'id');
      } else if (sortBy === 'name-asc') {
        const nameComp = a.name.localeCompare(b.name, 'id');
        if (nameComp !== 0) return nameComp;
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pA - pB;
        return b.percentage - a.percentage;
      } else if (sortBy === 'alpa-desc') {
        if (b.alpa !== a.alpa) return b.alpa - a.alpa;
        if (Math.abs(b.percentage - a.percentage) > 0.001) return b.percentage - a.percentage;
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name, 'id');
      }

      return b.percentage - a.percentage || a.name.localeCompare(b.name, 'id');
    });

    return result;
  }, [studentStats, searchQuery, predicateFilter, sortBy, shiftFilter, students]);

  // Overall Class Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalStudents = studentStats.length;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        avgPercentage: 0,
        totalHadir: 0,
        totalSakit: 0,
        totalIzin: 0,
        totalAlpa: 0,
        totalTerlambat: 0,
        perfectStudentsCount: 0,
        warningStudentsCount: 0,
        sangatBaikCount: 0,
        baikCount: 0,
        cukupCount: 0,
        perluPerhatianCount: 0,
        totalEffectiveDays: Math.max(1, Number(manualDays) || 1)
      };
    }

    let sumPercentage = 0;
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalTerlambat = 0;
    let perfectStudentsCount = 0;
    let warningStudentsCount = 0;
    let sangatBaikCount = 0;
    let baikCount = 0;
    let cukupCount = 0;
    let perluPerhatianCount = 0;

    studentStats.forEach(s => {
      sumPercentage += s.percentage;
      totalHadir += s.hadir;
      totalSakit += s.sakit;
      totalIzin += s.izin;
      totalAlpa += s.alpa;
      totalTerlambat += s.terlambat;
      if (s.percentage === 100) perfectStudentsCount++;
      if (s.predicate === 'Sangat Baik') sangatBaikCount++;
      else if (s.predicate === 'Baik') baikCount++;
      else if (s.predicate === 'Cukup') cukupCount++;
      else perluPerhatianCount++;
      if (s.predicate === 'Perlu Perhatian' || s.alpa >= 3) warningStudentsCount++;
    });

    const avgPercentage = Math.round((sumPercentage / totalStudents) * 10) / 10;

    return {
      totalStudents,
      avgPercentage,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpa,
      totalTerlambat,
      perfectStudentsCount,
      warningStudentsCount,
      sangatBaikCount,
      baikCount,
      cukupCount,
      perluPerhatianCount,
      totalEffectiveDays: Math.max(1, Number(manualDays) || 1)
    };
  }, [studentStats, manualDays]);

  // Handler for student absence count override (Edit Langsung)
  const handleUpdateStudentOverride = (studentId: string, field: 'hadir' | 'sakit' | 'izin' | 'alpa' | 'terlambat', delta: number) => {
    setStudentOverrides(prev => {
      const current = prev[studentId] || {};
      const currentVal = current[field] !== undefined 
        ? current[field]! 
        : (studentStats.find(s => s.studentId === studentId)?.[field] || 0);
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: newVal
        }
      };
    });
  };

  const handleSetStudentOverrideDirect = (studentId: string, field: 'hadir' | 'sakit' | 'izin' | 'alpa' | 'terlambat', val: number) => {
    setStudentOverrides(prev => {
      const current = prev[studentId] || {};
      const newVal = Math.max(0, val);
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: newVal
        }
      };
    });
  };

  const handleResetOverrides = () => {
    if (window.confirm('Reset semua editan nilai manual S/I/A kembali ke catatan presensi asli?')) {
      setStudentOverrides({});
    }
  };

  // Chart Data: Status Pie Distribution
  const pieChartData = useMemo(() => {
    const { totalHadir, totalSakit, totalIzin, totalAlpa, totalTerlambat } = summaryMetrics;
    const total = totalHadir + totalSakit + totalIzin + totalAlpa + totalTerlambat;
    if (total === 0) return [];

    return [
      { name: 'Hadir (H)', value: totalHadir, color: '#10b981' },
      { name: 'Sakit (S)', value: totalSakit, color: '#f59e0b' },
      { name: 'Izin (I)', value: totalIzin, color: '#3b82f6' },
      { name: 'Alpa (A)', value: totalAlpa, color: '#ef4444' },
      { name: 'Terlambat (T)', value: totalTerlambat, color: '#f97316' },
    ].filter(d => d.value > 0);
  }, [summaryMetrics]);

  // Chart Data: Predicate Distribution
  const predicateChartData = useMemo(() => {
    const counts = {
      'Sangat Baik (≥95%)': 0,
      'Baik (85-94%)': 0,
      'Cukup (75-84%)': 0,
      'Perlu Perhatian (<75%)': 0
    };

    studentStats.forEach(s => {
      if (s.predicate === 'Sangat Baik') counts['Sangat Baik (≥95%)']++;
      else if (s.predicate === 'Baik') counts['Baik (85-94%)']++;
      else if (s.predicate === 'Cukup') counts['Cukup (75-84%)']++;
      else counts['Perlu Perhatian (<75%)']++;
    });

    return [
      { category: 'Sangat Baik (≥95%)', count: counts['Sangat Baik (≥95%)'], fill: '#10b981' },
      { category: 'Baik (85-94%)', count: counts['Baik (85-94%)'], fill: '#3b82f6' },
      { category: 'Cukup (75-84%)', count: counts['Cukup (75-84%)'], fill: '#f59e0b' },
      { category: 'Perhatian (<75%)', count: counts['Perlu Perhatian (<75%)'], fill: '#ef4444' },
    ];
  }, [studentStats]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredSortedStudents.map((s, idx) => ({
      'No': idx + 1,
      'Status': s.status || 'Aktif',
      'NISN': s.nisn,
      'NIS': s.nis,
      'Nama Siswa': s.name,
      'Kelas': s.class,
      'L/P': s.gender,
      'Hari Efektif': s.totalDays,
      'Hadir (H)': s.hadir,
      'Sakit (S)': s.sakit,
      'Izin (I)': s.izin,
      'Alpa (A)': s.alpa,
      'Terlambat (T)': s.terlambat,
      'Persentase Kehadiran (%)': `${s.percentage}%`,
      'Predikat': s.predicate
    }));

    const filename = `Rekap_Persentase_Absensi_${selectedClass}_${filterMode === 'monthly' ? monthNames[selectedMonth] : 'Rentang'}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(exportRows, filename);
  };

  // WhatsApp Message Generator
  const handleSendWhatsApp = (stat: StudentAttendanceStat) => {
    let cleanPhone = stat.parentPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    if (!cleanPhone || cleanPhone.length < 8) {
      alert(`Nomor telepon orang tua untuk ${stat.name} belum valid.`);
      return;
    }

    const schoolName = settings.namaSekolah || settings.schoolName || 'Sekolah';
    const jenjang = getJenjangInfo(stat.class, [stat]);
    const message = `Yth. Bapak/Ibu Wali dari *${stat.name}*,

Berikut adalah Laporan Rekapitulasi Presensi & Kehadiran:
🎓 *Jenjang:* ${jenjang.label}
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

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Control Center (No-Print) */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide">
              <Percent size={14} className="text-emerald-400" />
              <span>Smart Analytics & Percentage Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Persentase & Analisis Kehadiran Siswa
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Pantau persentase kehadiran per-bulan maupun rentang tanggal kustom dengan visualisasi modern, predikat performa siswa, komparasi data, serta cetak laporan resmi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} />
              <span>Muat Ulang</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
            >
              <Download size={14} />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={() => setIsCetakModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition shadow-lg shadow-indigo-950/40 cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Cetak Laporan Resmi (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Control Dashboard (No-Print) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 no-print">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Class Filter Selector */}
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold">
              <Users size={18} />
            </div>
            <div className="flex-1">
              <CustomDropdown
                id="persentase-select-class"
                label="Pilih Kelas / Rombel"
                value={selectedClass}
                onChange={(val) => setSelectedClass(val)}
                options={[
                  { value: 'ALL', label: 'Semua Kelas (Akumulasi Sekolah)' },
                  ...allClasses.map(cls => ({
                    value: cls,
                    label: formatClassLabel(cls)
                  }))
                ]}
                placeholder="Pilih Kelas..."
                searchable={allClasses.length > 5}
              />
            </div>
          </div>

          {/* Mode Switcher: Rentang Tanggal vs Bulanan */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setFilterMode('range')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                filterMode === 'range' 
                  ? 'bg-white text-indigo-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange size={14} />
              Rentang Tanggal (Bebas)
            </button>
            <button
              onClick={() => setFilterMode('monthly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                filterMode === 'monthly' 
                  ? 'bg-white text-indigo-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar size={14} />
              Pilihan Bulan (Jan - Des)
            </button>
          </div>
        </div>

        {/* Date Controls & Presets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {filterMode === 'range' ? (
            <>
              {/* Start Date */}
              <div className="md:col-span-3">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                  Dari Tanggal:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="md:col-span-3">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                  Sampai Tanggal:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Presets */}
              <div className="md:col-span-6 flex flex-wrap items-center gap-1.5 pt-2 md:pt-4">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Shortcut:</span>
                <button
                  onClick={() => handleApplyPreset('this-month')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button
                  onClick={() => handleApplyPreset('last-month')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  Bulan Lalu
                </button>
                <button
                  onClick={() => handleApplyPreset('last-7')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => handleApplyPreset('last-30')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  30 Hari Terakhir
                </button>
                <button
                  onClick={() => handleApplyPreset('sem-1')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  Semester Ganjil
                </button>
                <button
                  onClick={() => handleApplyPreset('sem-2')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                >
                  Semester Genap
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Select Month */}
              <div className="md:col-span-4">
                <CustomDropdown
                  id="persentase-select-month"
                  label="Pilih Bulan"
                  value={String(selectedMonth)}
                  onChange={(val) => setSelectedMonth(Number(val))}
                  options={monthNames.map((m, idx) => ({
                    value: String(idx),
                    label: m
                  }))}
                  placeholder="Pilih Bulan..."
                />
              </div>

              {/* Select Year */}
              <div className="md:col-span-3">
                <CustomDropdown
                  id="persentase-select-year"
                  label="Pilih Tahun"
                  value={String(selectedYear)}
                  onChange={(val) => setSelectedYear(Number(val))}
                  options={[2024, 2025, 2026, 2027, 2028].map(y => ({
                    value: String(y),
                    label: String(y)
                  }))}
                  placeholder="Pilih Tahun..."
                />
              </div>

              <div className="md:col-span-5 flex items-center gap-2 pt-2 md:pt-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ignoreSundays}
                    onChange={(e) => setIgnoreSundays(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Abaikan Hari Minggu dalam perhitungan kalender</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Dedicated Manual Effective Days (Hari Efektif KBM Diisi Manual) */}
        <div className="mt-4 p-4.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-emerald-50/70 rounded-2xl border border-indigo-200/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                Manual Input
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <CalendarCheck size={16} className="text-indigo-600" />
                Jumlah Hari Efektif KBM (Bisa Anda Isi Bebas):
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Ketik angka hari efektif secara manual di bawah ini. Persentase kehadiran seluruh siswa akan langsung dihitung otomatis berdasarkan angka ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Direct Number Input with +/- */}
            <div className="flex items-center bg-white rounded-2xl border-2 border-indigo-400/80 shadow-xs p-1">
              <button
                type="button"
                onClick={() => setManualDays(d => Math.max(1, d - 1))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Kurangi 1 Hari"
              >
                -
              </button>
              <div className="px-2 flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={manualDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setManualDays(isNaN(val) ? 1 : Math.max(1, Math.min(365, val)));
                  }}
                  className="w-14 text-center font-black text-base text-indigo-900 border-none bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-500">Hari</span>
              </div>
              <button
                type="button"
                onClick={() => setManualDays(d => Math.min(365, d + 1))}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Tambah 1 Hari"
              >
                +
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">Pilihan:</span>
              {[
                { val: 12, label: '12 H : 3x/Mg KTCT' },
                { val: 4, label: '4 H : DEPAULT' },
                { val: 18, label: '18 H' },
                { val: 20, label: '20 H' },
                { val: 22, label: '22 H' },
                { val: 24, label: '24 H' },
                { val: 25, label: '25 H' },
                { val: 26, label: '26 H' },
              ].map(({ val: daysNum, label }) => (
                <button
                  key={daysNum}
                  type="button"
                  onClick={() => setManualDays(daysNum)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                    manualDays === daysNum
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setManualDays(Math.max(1, effectiveDates.length))}
                title="Gunakan hitungan tanggal kalender"
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={11} />
                <span>Kalender ({effectiveDates.length} H)</span>
              </button>
            </div>

            {/* Mode Logika Perhitungan Persentase */}
            <div className="flex items-center bg-white p-1 rounded-2xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] font-black text-slate-500 uppercase px-2 hidden sm:inline">Metode:</span>
              <button
                type="button"
                onClick={() => handleSetCalcMode('standard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  calcMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
                }`}
                title="Presensi Murni Kemdikbud: Hadir / Hari Efektif * 100%"
              >
                <span>📐 Standar (Murni)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetCalcMode('smart')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  calcMode === 'smart'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Logika Pintar Bobot Dispensasi: H(100%) + S(80%) + I(60%) + T(90%) + A(0%)"
              >
                <span>🧠 Logika Pintar (Bobot S/I)</span>
              </button>
            </div>

            {/* Tombol Cetak Persentase */}
            <button
              type="button"
              onClick={() => setIsCetakModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer ml-auto lg:ml-2"
              title="Buka Dokumen Resmi Persentase & Bagikan ke WhatsApp"
            >
              <Printer size={16} />
              <span>Cetak Persentase</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Highlight Metrics Cards (No-Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Rata-rata Kehadiran % */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              Rata-Rata Kehadiran
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {summaryMetrics.avgPercentage}%
            </div>
            <p className="text-emerald-100 text-xs font-medium mt-1">
              {summaryMetrics.avgPercentage >= 90 ? 'Performa Kelas Sangat Prima' : 'Perlu Peningkatan Disiplin'}
            </p>
          </div>
          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, summaryMetrics.avgPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Hari Efektif & Total Siswa */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Hari Efektif & Siswa
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {summaryMetrics.totalEffectiveDays} <span className="text-sm font-bold text-slate-400">Hari</span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Total {studentStats.length} Siswa Terdaftar di {selectedClass === 'ALL' ? 'Semua Kelas' : formatClassLabel(selectedClass)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-100 font-bold text-slate-600">
            <span className="text-emerald-600">Hadir: {summaryMetrics.totalHadir}</span>
            <span className="text-rose-600">Alpa: {summaryMetrics.totalAlpa}</span>
          </div>
        </div>

        {/* Card 3: Siswa 100% Kehadiran (Tanpa Absen) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Presensi Sempurna 100%
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-600">
              {summaryMetrics.perfectStudentsCount} <span className="text-sm font-bold text-slate-400">Siswa</span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Rajin masuk penuh tanpa pernah izin/sakit/alpa
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl font-bold">
            <Sparkles size={13} />
            <span>Kandidat Penghargaan Disiplin</span>
          </div>
        </div>

        {/* Card 4: Siswa Butuh Perhatian / Warning */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Butuh Perhatian Khusus
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-600">
              {summaryMetrics.warningStudentsCount} <span className="text-sm font-bold text-slate-400">Siswa</span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Kehadiran &lt; 75% atau memiliki Alpa ≥ 3 hari
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl font-bold">
            <HeartPulse size={13} />
            <span>Perlu Konseling / Panggilan Ortu</span>
          </div>
        </div>
      </div>

      {/* Modern Visual Charts Row (No-Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Chart 1: Predicate Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Distribusi Predikat Kehadiran Siswa</h3>
                <p className="text-[11px] text-slate-500">Klasifikasi performa absensi seluruh siswa kelas</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predicateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Siswa`, 'Jumlah']} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {predicateChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status Breakdown Pie */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <PieChartIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Komposisi Status Presensi</h3>
              <p className="text-[11px] text-slate-500">Perbandingan H, S, I, A, T</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} kali`, 'Total']} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs py-8">
                Belum ada data presensi
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Percentage Table (Interactive & Printable) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden printable-container">
        
        {/* Printable Official Header (Only shown during printing) */}
        <div className="hidden print:block p-6 border-b-4 border-double border-slate-900 text-center space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              {settings.logoUrl || settings.schoolLogoUrl ? (
                <img src={settings.logoUrl || settings.schoolLogoUrl} alt="Logo" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-xs">LOGO</div>
              )}
            </div>
            <div className="flex-1 text-center">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                PEMERINTAH {settings.kabupaten ? `KABUPATEN / KOTA ${settings.kabupaten.toUpperCase()}` : 'DAERAH KHUSUS IBUKOTA'}
              </h5>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h4>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SATUAN PENDIDIKAN FORMAL'}
              </h3>
              <p className="text-[10px] text-slate-600">
                {settings.alamat || 'Jl. Pendidikan No. 128'} {settings.desa ? `, ${settings.desa}` : ''} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupaten ? `, ${settings.kabupaten}` : ''}
              </p>
              <p className="text-[9px] text-slate-500">
                NPSN: {settings.npsn || '20108976'} • Telp: {settings.telepon || settings.kontak || '-'} • Email: {settings.email || 'info@sekolah.sch.id'}
              </p>
            </div>
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl border border-slate-300 flex flex-col items-center justify-center text-slate-700">
                <Percent size={18} />
                <span className="text-[7px] font-black uppercase">REKAP</span>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-slate-200 text-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 underline">
              LAPORAN REKAPITULASI & PERSENTASE KEHADIRAN SISWA
            </h3>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              Kelas: {selectedClass === 'ALL' ? 'Semua Kelas' : formatClassLabel(selectedClass)} • Periode: {rangeDisplayLabel} • Hari Efektif: {summaryMetrics.totalEffectiveDays} Hari
            </p>
          </div>
        </div>

        {/* Logic & Formula Guidance Box (No-Print) */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/80 border-b border-indigo-100 p-4 sm:p-5 no-print">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">i</span>
                <h4 className="font-black text-xs sm:text-sm text-indigo-950">
                  Transparansi Rumus Persentase ({calcMode === 'smart' ? '🧠 Mode Logika Pintar / Dispensasi' : '📐 Mode Standar Presensi Murni'})
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {calcMode === 'standard' ? (
                  <>
                    <strong>Rumus Presensi Murni:</strong> <code className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono font-bold text-indigo-900">(Hadir / {manualDays} Hari Efektif) × 100%</code>.
                    <span className="block mt-1 text-[11px] text-slate-500">
                      💡 <strong>Kenapa ada 75%?</strong> Jika Hari Efektif diatur <strong>4 Hari</strong>, saat siswa tidak masuk 1 hari (Hadir = 3 Hari), perhitungannya adalah <strong>3 ÷ 4 = 75.0%</strong>. Untuk persentase bulanan standar, pilih preset <strong>20 H</strong> atau <strong>24 H</strong>, atau aktifkan <strong>Mode Logika Pintar</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Rumus Bobot Pintar:</strong> <code className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold text-emerald-900">(H×100% + S×80% + I×60% + T×90% + A×0%) / {manualDays} Hari</code>.
                    <span className="block mt-1 text-[11px] text-slate-500">
                      ✨ <strong>Menghargai Siswa Sakit/Izin Resmi:</strong> Siswa sakit berizin dokter tetap dihargai bobot 80%, sehingga siswa yang 1 hari sakit saat hari efektif 4 hari memperoleh <strong>95%</strong> (bukan anjlok 75%).
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold bg-white/90 p-2 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">🟢 H: Hadir</span>
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">🟡 S: Sakit</span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">🔵 I: Izin</span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">🔴 A: Alpa</span>
            </div>
          </div>
        </div>

        {/* Table Controls (No-Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Predicate Filter */}
            <div className="min-w-[190px]">
              <CustomDropdown
                id="persentase-filter-predicate"
                value={predicateFilter}
                onChange={(val) => setPredicateFilter(val)}
                options={[
                  { value: 'ALL', label: 'Semua Predikat' },
                  { value: 'Sangat Baik', label: '🟢 Sangat Baik (≥95%)' },
                  { value: 'Baik', label: '🔵 Baik (85-94%)' },
                  { value: 'Cukup', label: '🟡 Cukup (75-84%)' },
                  { value: 'Perlu Perhatian', label: '🔴 Perlu Perhatian (<75%)' }
                ]}
                placeholder="Filter Predikat..."
              />
            </div>

            {/* Sort Filter */}
            <div className="min-w-[210px]">
              <CustomDropdown
                id="persentase-filter-sort"
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'percentage-desc', label: 'Urut: % Tertinggi + Status' },
                  { value: 'status-first', label: 'Urut: Status + % Tertinggi' },
                  { value: 'name-asc', label: 'Urut: Nama Siswa (A - Z)' },
                  { value: 'percentage-asc', label: 'Urut: % Terendah' },
                  { value: 'alpa-desc', label: 'Urut: Alpa Terbanyak' }
                ]}
                placeholder="Urutkan Siswa..."
              />
            </div>

            {/* Shift Filter */}
            <div className="min-w-[190px]">
              <CustomDropdown
                id="persentase-filter-shift"
                value={shiftFilter}
                onChange={(val) => setShiftFilter(val as any)}
                options={[
                  { value: 'Semua', label: 'Semua Shift Belajar' },
                  { value: 'Aktif Bekerja', label: 'Shift Malam (Aktif Bekerja)' },
                  { value: 'Tidak Bekerja', label: 'Shift Siang (Tidak Bekerja)' }
                ]}
                placeholder="Filter Shift..."
              />
            </div>

            {/* Toggle Inline Manual Edit S/I/A */}
            <button
              type="button"
              onClick={() => setIsEditingData(!isEditingData)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                isEditingData
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CheckSquare size={14} />
              <span>{isEditingData ? 'Selesai Edit Data Siswa' : 'Edit Angka S/I/A Siswa'}</span>
            </button>

            {Object.keys(studentOverrides).length > 0 && (
              <button
                type="button"
                onClick={handleResetOverrides}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Reset Nilai Manual
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500">
            Menampilkan <strong className="text-slate-900">{filteredSortedStudents.length}</strong> dari {studentStats.length} Siswa
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-3 text-center w-10">No</th>
                <th className="py-3.5 px-4">Nama Siswa & Foto</th>
                <th className="py-3.5 px-2 text-center w-16">Kelas</th>
                <th className="py-3.5 px-2 text-center w-16 text-emerald-700 bg-emerald-50/50" title="Hadir (Masuk KBM)">🟢 H</th>
                <th className="py-3.5 px-2 text-center w-20 text-amber-700 bg-amber-50/50" title="Sakit">🟡 S</th>
                <th className="py-3.5 px-2 text-center w-20 text-blue-700 bg-blue-50/50" title="Izin">🔵 I</th>
                <th className="py-3.5 px-2 text-center w-20 text-rose-700 bg-rose-50/50" title="Alpa (Tanpa Keterangan)">🔴 A</th>
                <th className="py-3.5 px-4 text-center min-w-[200px]">Persentase Kehadiran (%)</th>
                <th className="py-3.5 px-3 text-center w-28">Predikat</th>
                <th className="py-3.5 px-3 text-right w-20 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Percent size={32} className="mx-auto text-slate-300" />
                      <p className="font-bold text-slate-600">Tidak ada data siswa ditemukan</p>
                      <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau sesuaikan pilihan kelas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSortedStudents.map((stat, index) => (
                  <tr 
                    key={stat.studentId}
                    className="hover:bg-indigo-50/40 transition-colors group"
                  >
                    {/* No */}
                    <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">
                      {index + 1}
                    </td>

                    {/* Nama Siswa & Foto */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3.5">
                        <StudentPhoto
                          student={{ name: stat.name, gender: stat.gender }}
                          photoUrl={stat.photo}
                          size="md"
                          className="ring-2 ring-slate-200 shadow-sm"
                          showBadge={stat.percentage === 100}
                          badgeText="★"
                          badgeColor="bg-amber-500"
                        />
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                            <span className="truncate">{stat.name}</span>
                            <span className="text-xs text-slate-400 font-bold">({stat.gender})</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              getStatusPriority(stat.status) === 1
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : getStatusPriority(stat.status) === 2
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {stat.status || 'Aktif'}
                            </span>
                            {stat.percentage === 100 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black border border-amber-300 no-print">
                                100% Sempurna
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>NISN: {stat.nisn || '-'} • NIS: {stat.nis || '-'}</span>
                            {(() => {
                              const orig = students.find(st => st.id === stat.studentId);
                              if (!orig) return null;
                              const eff = getStudentEffectiveGroup(orig);
                              return (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                                  eff.group === 'Aktif Bekerja'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}>
                                  {eff.group === 'Aktif Bekerja' ? <Moon size={9} /> : <Sun size={9} />}
                                  <span>{eff.scheduleLabel}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kelas */}
                    <td className="py-3.5 px-2 text-center font-bold text-slate-700 text-xs">
                      {stat.class}
                    </td>

                    {/* Hadir (H) */}
                    <td className="py-3 px-2 text-center text-xs bg-emerald-50/20">
                      {isEditingData ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'hadir', -1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >-</button>
                          <input
                            type="number"
                            min="0"
                            value={stat.hadir}
                            onChange={(e) => handleSetStudentOverrideDirect(stat.studentId, 'hadir', parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-black text-xs border border-emerald-300 rounded p-0.5 bg-white text-emerald-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'hadir', 1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >+</button>
                        </div>
                      ) : (
                        <span className={`font-black ${stat.hadir > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {stat.hadir}
                        </span>
                      )}
                    </td>

                    {/* Sakit (S) */}
                    <td className="py-3 px-2 text-center text-xs bg-amber-50/20">
                      {isEditingData ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'sakit', -1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >-</button>
                          <input
                            type="number"
                            min="0"
                            value={stat.sakit}
                            onChange={(e) => handleSetStudentOverrideDirect(stat.studentId, 'sakit', parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-black text-xs border border-amber-300 rounded p-0.5 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'sakit', 1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >+</button>
                        </div>
                      ) : (
                        <span className={`font-bold ${stat.sakit > 0 ? 'text-amber-700 font-black' : 'text-slate-400'}`}>
                          {stat.sakit}
                        </span>
                      )}
                    </td>

                    {/* Izin (I) */}
                    <td className="py-3 px-2 text-center text-xs bg-blue-50/20">
                      {isEditingData ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'izin', -1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >-</button>
                          <input
                            type="number"
                            min="0"
                            value={stat.izin}
                            onChange={(e) => handleSetStudentOverrideDirect(stat.studentId, 'izin', parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-black text-xs border border-blue-300 rounded p-0.5 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'izin', 1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >+</button>
                        </div>
                      ) : (
                        <span className={`font-bold ${stat.izin > 0 ? 'text-blue-700 font-black' : 'text-slate-400'}`}>
                          {stat.izin}
                        </span>
                      )}
                    </td>

                    {/* Alpa (A) */}
                    <td className="py-3 px-2 text-center text-xs bg-rose-50/20">
                      {isEditingData ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'alpa', -1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >-</button>
                          <input
                            type="number"
                            min="0"
                            value={stat.alpa}
                            onChange={(e) => handleSetStudentOverrideDirect(stat.studentId, 'alpa', parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-black text-xs border border-rose-300 rounded p-0.5 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentOverride(stat.studentId, 'alpa', 1)}
                            className="w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                          >+</button>
                        </div>
                      ) : (
                        <span className={`font-bold ${stat.alpa > 0 ? 'text-rose-700 font-black' : 'text-slate-400'}`}>
                          {stat.alpa}
                        </span>
                      )}
                    </td>

                    {/* Persentase Kehadiran Bar */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5 max-w-xs mx-auto">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className={`text-sm font-black ${
                            stat.percentage >= 95 ? 'text-emerald-700' :
                            stat.percentage >= 85 ? 'text-blue-700' :
                            stat.percentage >= 75 ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {stat.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
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

                    {/* Predikat */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${stat.predicateColor}`}>
                        {stat.predicate}
                      </span>
                    </td>

                    {/* Actions (No-Print) */}
                    <td className="py-3 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailStudent(stat)}
                          title="Lihat Rincian Harian"
                          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(stat)}
                          title="Kirim Rekap WA ke Orang Tua"
                          className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Send size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredSortedStudents.length > 0 && (
              <tfoot className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3.5 px-4 text-right uppercase text-[11px]">
                    Total & Rata-Rata ({summaryMetrics.totalStudents} Siswa • {manualDays} Hari Efektif):
                  </td>
                  <td className="py-3.5 px-2 text-center text-xs font-black text-emerald-800 bg-emerald-100/50">
                    {summaryMetrics.totalHadir}
                  </td>
                  <td className="py-3.5 px-2 text-center text-xs font-black text-amber-800 bg-amber-100/50">
                    {summaryMetrics.totalSakit}
                  </td>
                  <td className="py-3.5 px-2 text-center text-xs font-black text-blue-800 bg-blue-100/50">
                    {summaryMetrics.totalIzin}
                  </td>
                  <td className="py-3.5 px-2 text-center text-xs font-black text-rose-800 bg-rose-100/50">
                    {summaryMetrics.totalAlpa}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base font-black text-emerald-800">
                        {summaryMetrics.avgPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="text-[10px] font-black text-slate-700">
                      {summaryMetrics.avgPercentage >= 95 ? 'Sangat Baik' : summaryMetrics.avgPercentage >= 85 ? 'Baik' : summaryMetrics.avgPercentage >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                    </span>
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Printable Signatures Block (Only shown during printing) */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-10 pb-4 px-8 text-xs font-serif">
          <div className="text-center space-y-1">
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-bold text-slate-900">Kepala Sekolah</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-sans">
                [TTE VALID]
              </span>
            </div>
            <p className="font-black text-slate-900 underline">{settings.headmasterName || (kepsek as any)?.name || 'Kepala Sekolah'}</p>
            <p className="text-[10px] text-slate-600 font-mono">NIP. {settings.headmasterNip || (kepsek as any)?.nip || '-'}</p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-slate-500">{settings.kabupaten || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold text-slate-900">Wali Kelas {selectedClass === 'ALL' ? '' : formatClassLabel(selectedClass)}</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-indigo-700 border border-indigo-300 px-2 py-0.5 rounded-full font-sans">
                [TTE VALID]
              </span>
            </div>
            <p className="font-black text-slate-900 underline">{waliKelas?.name || 'Wali Kelas'}</p>
            <p className="text-[10px] text-slate-600 font-mono">NIP. {waliKelas?.nip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Detail Histori Presensi Siswa */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <StudentPhoto
                  student={{ name: detailStudent.name, gender: detailStudent.gender }}
                  photoUrl={detailStudent.photo}
                  size="lg"
                  className="rounded-2xl shadow-sm"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Histori Presensi: {detailStudent.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kelas: {detailStudent.class} • NISN: {detailStudent.nisn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Student Metric Highlights */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-black uppercase text-emerald-800 block">Persentase</span>
                <span className="text-xl font-black text-emerald-700">{detailStudent.percentage}%</span>
                <span className="text-[9px] font-bold text-emerald-600 block">{detailStudent.predicate}</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase text-indigo-800 block">Total Hadir</span>
                <span className="text-xl font-black text-indigo-700">{detailStudent.hadir}</span>
                <span className="text-[9px] font-bold text-indigo-600 block">dari {detailStudent.totalDays} hari</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <span className="text-[10px] font-black uppercase text-rose-800 block">S / I / A</span>
                <span className="text-xl font-black text-rose-700">
                  {detailStudent.sakit + detailStudent.izin + detailStudent.alpa}
                </span>
                <span className="text-[9px] font-bold text-rose-600 block">
                  S:{detailStudent.sakit} I:{detailStudent.izin} A:{detailStudent.alpa}
                </span>
              </div>
            </div>

            {/* Step-by-step Math Explanation */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Rincian Perhitungan Matematika:</span>
                <span className="font-mono text-indigo-700 font-black">
                  {calcMode === 'standard' ? 'Presensi Murni' : 'Logika Pintar (Bobot)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                {calcMode === 'standard' ? (
                  <>
                    = ({detailStudent.hadir} Hadir ÷ {detailStudent.totalDays} Hari Efektif) × 100% = <strong>{detailStudent.percentage}%</strong>
                  </>
                ) : (
                  <>
                    = (({detailStudent.hadir}×1.0) + ({detailStudent.sakit}×0.8) + ({detailStudent.izin}×0.6) + ({detailStudent.alpa}×0.0)) ÷ {detailStudent.totalDays} = <strong>{detailStudent.percentage}%</strong>
                  </>
                )}
              </p>
            </div>

            {/* Date-by-date list */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                Catatan Harian Dalam Periode ({rangeDisplayLabel}):
              </span>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {detailStudent.dailyRecords.map((rec, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">
                        {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      {rec.note && (
                        <span className="text-[10px] text-slate-500 italic bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {rec.note}
                        </span>
                      )}
                    </div>
                    <div>
                      {rec.status === 'H' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Hadir
                        </span>
                      )}
                      {rec.status === 'S' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          Sakit
                        </span>
                      )}
                      {rec.status === 'I' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                          Izin
                        </span>
                      )}
                      {rec.status === 'A' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          Alpa
                        </span>
                      )}
                      {rec.status === 'T' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">
                          Terlambat
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSendWhatsApp(detailStudent)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <Send size={14} />
                <span>Kirim Rekap WA ke Ortu</span>
              </button>
              <button
                onClick={() => setDetailStudent(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cetak Persentase Official Modal with PNG / PDF export & WA broadcast */}
      <CetakPersentaseModal
        isOpen={isCetakModalOpen}
        onClose={() => setIsCetakModalOpen(false)}
        selectedClass={selectedClass}
        rangeDisplayLabel={rangeDisplayLabel}
        manualDays={manualDays}
        studentStats={filteredSortedStudents}
        summaryMetrics={summaryMetrics}
        waliKelas={waliKelas}
        kepsek={kepsek}
        settings={settings}
      />
    </div>
  );
}
