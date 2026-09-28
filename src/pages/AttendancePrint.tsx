import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../data/db';
import { matchClass, matchStatusActive, getActiveClasses, getAllClasses, formatClassLabel, sortStudentsByStatusAndName, getStatusPriority, triggerPrint, standardizeDate } from '../lib/utils';
import { getMapelNamesForClass } from '../lib/academicSubjects';
import { exportToExcel } from '../lib/excel';
import { 
  Printer, Filter, Calendar as CalendarIcon, FileSpreadsheet, 
  Award, FileText, BookOpen, Layers, CheckSquare, UserCheck, School,
  Sparkles, CheckCircle2, Zap, Percent
} from 'lucide-react';
import InputAbsensiKelasTab from '../components/akademik/InputAbsensiKelasTab';
import PersentaseAbsensiTab from '../components/akademik/PersentaseAbsensiTab';
import CustomDropdown, { DropdownOption } from '../components/common/CustomDropdown';

export default function AttendancePrint() {
  const { students, teachers, settings } = useStore();
  const activeClasses = useMemo(() => getActiveClasses(students), [students]);
  const allClasses = useMemo(() => getAllClasses(students), [students]);

  const [printTab, setPrintTab] = useState<'input-harian' | 'persentase' | 'hadir' | 'nilai' | 'administrasi'>('hadir');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [calendarMode, setCalendarMode] = useState<'sunday-only' | 'all' | 'mon-sat' | 'mon-fri' | 'custom-filled'>('custom-filled');

  const kepsek = useMemo(() => {
    return teachers.find(t => t && (t.class === 'Kepala Sekolah' || (t.class && String(t.class).toLowerCase().includes('kepala')))) || {
      name: settings.headmasterName || 'Kepala Sekolah',
      nip: settings.headmasterNip || '-'
    };
  }, [teachers, settings]);

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
  
  useEffect(() => {
    if (allClasses.length > 0 && selectedClass !== 'ALL' && !allClasses.includes(selectedClass)) {
      setSelectedClass(allClasses[0]);
    }
  }, [allClasses, selectedClass]);

  // Attendance state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Grade ledger state - Sync with sheet MAPEL
  const mapelList = useMemo(() => {
    return getMapelNamesForClass(selectedClass);
  }, [selectedClass]);

  const [selectedSubject, setSelectedSubject] = useState<string>(mapelList[0] || 'Bahasa Indonesia');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(() => {
    return (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil';
  });
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(settings.tahunPelajaran || '2026/2027');

  // Read all attendance records from database to populate Buku Presensi Bulanan
  const [absensiList, setAbsensiList] = useState<any[]>(() => {
    return (db.get('absensi') as any[]) || [];
  });

  useEffect(() => {
    const load = () => {
      setAbsensiList((db.get('absensi') as any[]) || []);
    };
    load();
    const handleDbUpdate = (e: any) => {
      if (!e.detail?.key || e.detail.key === 'absensi' || e.detail.key === 'perizinan_siswa' || e.detail.key === 'recent_qr_scans') {
        load();
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('focus', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('focus', load);
      window.removeEventListener('storage', load);
    };
  }, [printTab, selectedMonth, selectedYear]);

  // Index attendance for fast O(1) lookup
  const absensiMap = useMemo(() => {
    const map = new Map<string, any>();
    absensiList.forEach(a => {
      const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl;
      const aDate = standardizeDate(rawDate) || rawDate;
      const aStudentId = a.studentId || a.SiswaID || a.siswaId || a.id;
      const aNisn = a.nisn || a.NISN;
      const aNis = a.nopdkt || a.nis || a.NIS;
      const aName = a.name || a.NamaSiswa || a.namaSiswa || a.nama;

      if (aDate) {
        if (aStudentId) {
          map.set(`${String(aStudentId).trim()}_${aDate}`, a);
          map.set(`${String(aStudentId).trim().toLowerCase()}_${aDate}`, a);
        }
        if (aNisn) {
          map.set(`${String(aNisn).trim()}_${aDate}`, a);
        }
        if (aNis) {
          map.set(`${String(aNis).trim()}_${aDate}`, a);
        }
        if (aName) {
          map.set(`${String(aName).trim().toLowerCase()}_${aDate}`, a);
        }
        if (rawDate && rawDate !== aDate) {
          if (aStudentId) map.set(`${String(aStudentId).trim()}_${rawDate}`, a);
          if (aNisn) map.set(`${String(aNisn).trim()}_${rawDate}`, a);
          if (aName) map.set(`${String(aName).trim().toLowerCase()}_${rawDate}`, a);
        }
      }
    });
    return map;
  }, [absensiList]);

  useEffect(() => {
    if (mapelList.length > 0 && !mapelList.includes(selectedSubject)) {
      setSelectedSubject(mapelList[0]);
    }
  }, [mapelList, selectedSubject]);

  useEffect(() => {
    if (settings.tahunPelajaran) {
      setSelectedAcademicYear(settings.tahunPelajaran);
    }
    if (settings.semester) {
      setSelectedSemester((settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil');
    }
    const handleSemChange = (e: any) => {
      if (e.detail?.semesterType) {
        setSelectedSemester(e.detail.semesterType);
      }
      if (e.detail?.tahunPelajaran) {
        setSelectedAcademicYear(e.detail.tahunPelajaran);
      }
    };
    window.addEventListener('academic-semester-changed', handleSemChange);
    return () => window.removeEventListener('academic-semester-changed', handleSemChange);
  }, [settings.tahunPelajaran, settings.semester]);

  // Administrasi Sub-tab
  const [adminSection, setAdminSection] = useState<'cover' | 'rekap' | 'jurnal'>('cover');

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const dayShortNames = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

  // Filtered and sorted students: Aktif -> Tidak Aktif -> Belum (Excluding Pindah, Lulus, Keluar)
  const classStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    const filtered = students.filter(s => {
      if (!s) return false;
      
      // Strict rule: Pindah, Lulus, Keluar are non-operational and excluded from attendance/grading
      if (!matchStatusActive(s.status)) return false;

      const isClass = selectedClass === 'ALL' || !selectedClass ? true : matchClass(s.class, selectedClass);
      
      let isStatus = true;
      if (statusFilter !== 'Semua') {
        const priority = getStatusPriority(s.status);
        if (statusFilter === 'Aktif') isStatus = priority === 1;
        else if (statusFilter === 'Tidak Aktif') isStatus = priority === 2;
        else if (statusFilter === 'Belum') isStatus = priority === 3;
        else isStatus = String(s.status || '').toLowerCase().includes(statusFilter.toLowerCase());
      }

      return isClass && isStatus;
    });

    return sortStudentsByStatusAndName(filtered);
  }, [students, selectedClass, statusFilter]);

  const countL = useMemo(() => classStudents.filter(s => s.gender === 'L').length, [classStudents]);
  const countP = useMemo(() => classStudents.filter(s => s.gender === 'P').length, [classStudents]);

  const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  
  // Day columns based on calendar mode (Default: Sesuai Absensi yang Terisi / Sunday / All)
  const dayColumns = useMemo(() => {
    const list: { day: number; dayOfWeek: number; isSunday: boolean; isFriday: boolean; isSaturday: boolean; labelTitle: string; labelSub: string }[] = [];
    let sundayCount = 0;

    if (calendarMode === 'custom-filled') {
      const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-`;
      const activeDaysInMonth = new Set<number>();

      absensiList.forEach(a => {
        const aDate = a?.date || a?.Tanggal || a?.tanggal;
        const aStatus = String(a?.status || a?.Status || a?.statusLabel || '').trim().toUpperCase();
        if (aDate && aDate.startsWith(monthPrefix) && aStatus && aStatus !== '-') {
          const dayNum = parseInt(aDate.split('-')[2], 10);
          if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= totalDaysInMonth) {
            const aStudentId = a.studentId || a.SiswaID || a.siswaId || a.id;
            const aNisn = a.nisn || a.NISN;
            const aName = a.name || a.NamaSiswa || a.namaSiswa;
            const matchesClass = selectedClass === 'ALL' || !selectedClass || classStudents.some(s => 
              s.id === aStudentId || 
              (aNisn && (s.nisn === aNisn || (s as any).NISN === aNisn)) ||
              (aName && s.name && String(aName).trim().toLowerCase() === String(s.name).trim().toLowerCase())
            );
            if (matchesClass) {
              activeDaysInMonth.add(dayNum);
            }
          }
        }
      });

      const sortedDays = Array.from(activeDaysInMonth).sort((a, b) => a - b);
      if (sortedDays.length > 0) {
        sortedDays.forEach(d => {
          const dateObj = new Date(selectedYear, selectedMonth, d);
          const dayOfWeek = dateObj.getDay();
          const isSunday = dayOfWeek === 0;
          const isFriday = dayOfWeek === 5;
          const isSaturday = dayOfWeek === 6;
          list.push({
            day: d,
            dayOfWeek,
            isSunday,
            isFriday,
            isSaturday,
            labelTitle: `Tgl ${d}`,
            labelSub: dayShortNames[dayOfWeek]
          });
        });
        return list;
      }
      // If no attendance filled yet in this month, fallback to weekdays
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateObj = new Date(selectedYear, selectedMonth, d);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek !== 0) {
          list.push({ day: d, dayOfWeek, isSunday: false, isFriday: dayOfWeek === 5, isSaturday: dayOfWeek === 6, labelTitle: String(d), labelSub: dayShortNames[dayOfWeek] });
        }
      }
      return list;
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday
      const isSunday = dayOfWeek === 0;
      const isFriday = dayOfWeek === 5;
      const isSaturday = dayOfWeek === 6;

      if (calendarMode === 'sunday-only') {
        if (isSunday) {
          sundayCount++;
          list.push({ 
            day: d, 
            dayOfWeek, 
            isSunday: true, 
            isFriday: false, 
            isSaturday: false,
            labelTitle: `Minggu ${sundayCount}`,
            labelSub: `Tgl ${d}`
          });
        }
      } else if (calendarMode === 'mon-fri') {
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          list.push({ day: d, dayOfWeek, isSunday: false, isFriday, isSaturday: false, labelTitle: String(d), labelSub: dayShortNames[dayOfWeek] });
        }
      } else if (calendarMode === 'mon-sat') {
        if (dayOfWeek !== 0) {
          list.push({ day: d, dayOfWeek, isSunday: false, isFriday, isSaturday, labelTitle: String(d), labelSub: dayShortNames[dayOfWeek] });
        }
      } else {
        // all days
        list.push({ day: d, dayOfWeek, isSunday, isFriday, isSaturday, labelTitle: String(d), labelSub: dayShortNames[dayOfWeek] });
      }
    }
    return list;
  }, [selectedYear, selectedMonth, totalDaysInMonth, calendarMode, absensiList, selectedClass, classStudents]);

  const handlePrint = () => {
    triggerPrint();
  };

  const handleExportExcel = () => {
    if (classStudents.length === 0) {
      alert("Tidak ada siswa pada kelas ini.");
      return;
    }

    const classLabel = selectedClass === 'ALL' ? 'Semua_Kelas' : `Kelas_${selectedClass}`;

    if (printTab === 'hadir') {
      const rows = classStudents.map((s, idx) => {
        let studentH = 0;
        let studentS = 0;
        let studentI = 0;
        let studentA = 0;

        const row: any = {
          No: idx + 1,
          'NISN': s.nisn || (s as any).NISN || '-',
          'NIS (No. PDKT)': s.nopdkt || s.nis || '-',
          'Nama Siswa': s.name,
          'L/P': s.gender || '-',
          'Status': s.status || 'Aktif',
          'Kelas': formatClassLabel(s.class, true),
          'Bulan': months[selectedMonth],
          'Tahun': selectedYear,
        };
        dayColumns.forEach(item => {
          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
          const rec = absensiMap.get(`${s.id}_${dateStr}`) || 
                      absensiMap.get(`${s.nisn}_${dateStr}`) || 
                      absensiMap.get(`${(s as any).NISN}_${dateStr}`) || 
                      absensiMap.get(`${String(s.name).trim().toLowerCase()}_${dateStr}`);
          let status = '';
          if (rec && rec.status) {
            const raw = String(rec.status).trim().toUpperCase();
            if (raw.startsWith('H')) { status = 'H'; studentH++; }
            else if (raw.startsWith('S')) { status = 'S'; studentS++; }
            else if (raw.startsWith('I')) { status = 'I'; studentI++; }
            else if (raw.startsWith('A')) { status = 'A'; studentA++; }
            else if (raw.startsWith('T')) { status = 'T'; studentH++; }
          }
          row[`${item.labelTitle} (${item.labelSub})`] = status;
        });
        const totalColDays = dayColumns.length;
        const studentPct = totalColDays > 0 ? (studentH / totalColDays) * 100 : 0;

        row['Hadir (H)'] = studentH;
        row['Sakit (S)'] = studentS;
        row['Izin (I)'] = studentI;
        row['Alpa (A)'] = studentA;
        row['% Kehadiran'] = `${studentPct.toFixed(1)}%`;
        return row;
      });
      exportToExcel(rows, `Presensi_Siswa_${classLabel}_${months[selectedMonth]}_${selectedYear}.xlsx`);
    } else if (printTab === 'nilai') {
      const rows = classStudents.map((s, idx) => ({
        No: idx + 1,
        'NISN': s.nisn || (s as any).NISN || '-',
        'NIS (No. PDKT)': s.nopdkt || s.nis || '-',
        'Nama Siswa': s.name,
        'L/P': s.gender || '-',
        'Status': s.status || 'Aktif',
        'Kelas': formatClassLabel(s.class, true),
        'Mata Pelajaran': selectedSubject,
        'Semester': selectedSemester,
        'Tahun Ajaran': selectedAcademicYear,
        'TP 1': '',
        'TP 2': '',
        'TP 3': '',
        'TP 4': '',
        'Rata-Rata Formatif': '',
        'STS': '',
        'SAS': '',
        'Nilai Akhir (NA)': '',
        'Predikat': ''
      }));
      exportToExcel(rows, `Format_Nilai_${selectedSubject.replace(/[^a-zA-Z0-9]/g, '_')}_${classLabel}_${selectedSemester}.xlsx`);
    } else {
      const rows = classStudents.map((s, idx) => ({
        No: idx + 1,
        'Nama Siswa': s.name,
        'NISN': s.nisn || (s as any).NISN || '-',
        'NIS (No. PDKT)': s.nopdkt || s.nis || '-',
        'L/P': s.gender || '-',
        'Status': s.status || 'Aktif',
        'Kelas': formatClassLabel(s.class, true),
        'Tempat Lahir': s.birthPlace || (s as any).tempatLahir || '-',
        'Tanggal Lahir': s.birthDate || (s as any).tanggalLahir || '-',
        'Nama Orang Tua / Wali': s.fatherName || (s as any).namaAyah || (s as any).NamaIbu || (s as any).namaIbu || s.guardianName || '-',
        'No HP': s.phone || (s as any).noHp || '-',
        'Alamat': s.address || (s as any).alamat || '-'
      }));
      exportToExcel(rows, `Administrasi_Siswa_${classLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Cetak & Administrasi Kelas</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm">
            Cetak Daftar Hadir (dengan penandaan otomatis Hari Minggu/Libur), Format Penilaian Guru, dan Rekap Administrasi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs gap-1">
          <button
            onClick={() => setPrintTab('persentase')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              printTab === 'persentase'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <Percent size={16} />
            Rekap Persentase (%) & Rentang Tanggal
          </button>
          <button
            onClick={() => setPrintTab('input-harian')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              printTab === 'input-harian'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
          >
            <Zap size={16} />
            Input Presensi Harian (H/S/I/A)
          </button>
          <button
            onClick={() => setPrintTab('hadir')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              printTab === 'hadir'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-50'
            }`}
          >
            <CalendarIcon size={16} />
            Buku Presensi Bulanan
          </button>
          <button
            onClick={() => setPrintTab('nilai')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              printTab === 'nilai'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-50'
            }`}
          >
            <Award size={16} />
            Daftar Nilai
          </button>
          <button
            onClick={() => setPrintTab('administrasi')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              printTab === 'administrasi'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={16} />
            Administrasi Kelas
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {printTab === 'persentase' ? (
        <PersentaseAbsensiTab />
      ) : printTab === 'input-harian' ? (
        <InputAbsensiKelasTab />
      ) : (
        <>
          {/* Control Filter Bar (No Print) */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs no-print space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 w-full">
              {/* Class Filter */}
              <CustomDropdown
                id="attendance-print-class"
                label="Pilih Kelas / Rombel:"
                value={selectedClass}
                onChange={(val) => setSelectedClass(val)}
                options={[
                  { value: 'ALL', label: `★ Semua Kelas (${students.filter(s => matchStatusActive(s.status)).length} Siswa)` },
                  ...allClasses.map(c => {
                    const count = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
                    return {
                      value: c,
                      label: `${formatClassLabel(c, true)} (${count} Siswa)`
                    };
                  })
                ]}
                placeholder="Pilih Kelas..."
                searchable={allClasses.length > 5}
              />

              {/* Status Filter */}
              <CustomDropdown
                id="attendance-print-status"
                label="Status Keaktifan:"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'Semua', label: `Semua Siswa Aktif (${students.filter(s => matchStatusActive(s.status) && (selectedClass === 'ALL' || !selectedClass ? true : matchClass(s.class, selectedClass))).length})` },
                  { value: 'Aktif', label: '✅ 1. Aktif (SISWA Aktif)' },
                  { value: 'Belum', label: '⏳ 2. Belum (Non-Dapodik)' }
                ]}
                placeholder="Pilih Status..."
              />

              {/* Dynamic Filter Controls Based on Tab */}
              {printTab === 'hadir' && (
                <>
                  <CustomDropdown
                    id="attendance-print-month"
                    label="Bulan Presensi:"
                    value={String(selectedMonth)}
                    onChange={(val) => setSelectedMonth(Number(val))}
                    options={months.map((m, idx) => ({ value: String(idx), label: m }))}
                    placeholder="Pilih Bulan..."
                  />

                  <CustomDropdown
                    id="attendance-print-year"
                    label="Tahun Presensi:"
                    value={String(selectedYear)}
                    onChange={(val) => setSelectedYear(Number(val))}
                    options={years.map(y => ({ value: String(y), label: String(y) }))}
                    placeholder="Pilih Tahun..."
                  />

                  <CustomDropdown
                    id="attendance-print-calendar-mode"
                    label="Format Kalender:"
                    value={calendarMode}
                    onChange={(val) => setCalendarMode(val as any)}
                    options={[
                      { value: 'custom-filled', label: '📌 Sesuai Absensi yang Terisi (Ada H/S/I/A)' },
                      { value: 'sunday-only', label: 'Hanya Hari Minggu Saja' },
                      { value: 'all', label: 'Semua Hari (Tgl 1 - Akhir)' },
                      { value: 'mon-sat', label: 'Hari Kerja: Senin - Sabtu' },
                      { value: 'mon-fri', label: 'Hari Kerja: Senin - Jumat' }
                    ]}
                    placeholder="Pilih Format Kalender..."
                  />
                </>
              )}

              {printTab === 'nilai' && (
                <>
                  <CustomDropdown
                    id="attendance-print-mapel"
                    label="Mata Pelajaran (Sheet MAPEL):"
                    className="col-span-1 sm:col-span-2"
                    value={selectedSubject}
                    onChange={(val) => setSelectedSubject(val)}
                    options={mapelList.map(s => ({ value: s, label: s }))}
                    placeholder="Pilih Mapel..."
                    searchable={mapelList.length > 5}
                  />

                  <CustomDropdown
                    id="attendance-print-semester"
                    label="Semester:"
                    value={selectedSemester}
                    onChange={(val) => setSelectedSemester(val as any)}
                    options={[
                      { value: 'Ganjil', label: 'Semester Ganjil' },
                      { value: 'Genap', label: 'Semester Genap' }
                    ]}
                    placeholder="Pilih Semester..."
                  />
                </>
              )}

          {printTab === 'administrasi' && (
            <div className="relative col-span-1 sm:col-span-3 flex items-end gap-2">
              <button 
                onClick={() => setAdminSection('cover')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs border transition ${
                  adminSection === 'cover' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cover & Pengesahan
              </button>
              <button 
                onClick={() => setAdminSection('rekap')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs border transition ${
                  adminSection === 'rekap' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Daftar & Rekap Siswa
              </button>
              <button 
                onClick={() => setAdminSection('jurnal')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs border transition ${
                  adminSection === 'jurnal' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Jurnal Mengajar
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons & Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Urutan siswa: <strong className="text-emerald-700">Aktif ({classStudents.filter(s => getStatusPriority(s.status) === 1).length})</strong> &rarr; <strong className="text-amber-700">Tidak Aktif ({classStudents.filter(s => getStatusPriority(s.status) === 2).length})</strong> &rarr; <strong className="text-blue-700">Belum ({classStudents.filter(s => getStatusPriority(s.status) === 3).length})</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExportExcel} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet size={15} /> Ekspor Excel
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Printer size={15} /> Cetak Dokumen
            </button>
          </div>
        </div>
      </div>

      {classStudents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center no-print">
           <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <h3 className="text-base font-black text-slate-700">Tidak ada data siswa pada filter ini</h3>
           <p className="text-xs text-slate-400 mt-1">Silakan sesuaikan pilihan kelas atau filter status keaktifan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-x-auto p-4 sm:p-6 print:shadow-none print:border-none print:p-0 print:overflow-visible">
          
          {/* TAB 1: CETAK DAFTAR HADIR */}
          {printTab === 'hadir' && (
            <div className="printable-container print-single-page min-w-[950px] print:min-w-0">
              <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2 print:pb-1">
                <h1 className="text-xl print:text-base font-black uppercase mb-0.5 tracking-tight">DAFTAR HADIR SISWA</h1>
                <h2 className="text-xs print:text-[9pt] font-bold text-slate-800">
                  {(settings.schoolName || settings.appName || 'SISTEM INFORMASI AKADEMIK').toUpperCase()} &nbsp;|&nbsp; KELAS: {selectedClass === 'ALL' ? 'SEMUA KELAS / ROMBEL' : formatClassLabel(selectedClass, true).toUpperCase()} &nbsp;|&nbsp; BULAN: {months[selectedMonth].toUpperCase()} {selectedYear}
                </h2>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-black print-table font-sans">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-7">No</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-24">NISN</th>
                    <th rowSpan={2} className="border border-black p-1 font-bold text-[10px] print:text-[8pt]">Nama Lengkap</th>
                    {selectedClass === 'ALL' && (
                      <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-14">Kelas</th>
                    )}
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-7">L/P</th>
                    <th colSpan={dayColumns.length} className="border border-black p-0.5 text-center font-bold text-[10px] print:text-[8pt] bg-slate-50 print:bg-transparent">
                      {calendarMode === 'sunday-only' ? `Pertemuan Hari Minggu (${months[selectedMonth]} ${selectedYear})` : `Tanggal & Hari (${months[selectedMonth]} ${selectedYear})`}
                    </th>
                    <th colSpan={5} className="border border-black p-0.5 text-center font-bold text-[10px] print:text-[8pt] w-24">Rekap</th>
                  </tr>
                  <tr>
                    {dayColumns.map((item, idx) => (
                      <th 
                        key={idx} 
                        className={`border border-black p-1 text-center text-[9px] print:text-[7pt] font-bold ${item.isSunday ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-900'}`}
                      >
                        <div className="leading-tight font-black">{item.labelTitle}</div>
                        <div className="text-[8px] print:text-[6.5pt] font-medium text-slate-500">
                          {item.labelSub}
                        </div>
                      </th>
                    ))}
                    <th className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-black text-emerald-800 bg-emerald-50/50 w-5" title="Hadir">H</th>
                    <th className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-black text-amber-800 bg-amber-50/50 w-5" title="Sakit">S</th>
                    <th className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-black text-blue-800 bg-blue-50/50 w-5" title="Izin">I</th>
                    <th className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-black text-rose-800 bg-rose-50/50 w-5" title="Alpa">A</th>
                    <th className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-black text-indigo-900 bg-indigo-50/60 w-8" title="Persentase Kehadiran (%)">%</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => {
                    let studentH = 0;
                    let studentS = 0;
                    let studentI = 0;
                    let studentA = 0;
                    let studentT = 0;

                    const dayStatuses = dayColumns.map(item => {
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                      const rec = absensiMap.get(`${s.id}_${dateStr}`) || 
                                  absensiMap.get(`${s.nisn}_${dateStr}`) || 
                                  absensiMap.get(`${(s as any).NISN}_${dateStr}`) || 
                                  absensiMap.get(`${String(s.name).trim().toLowerCase()}_${dateStr}`);
                      
                      let statusLetter = '';
                      if (rec && rec.status) {
                        const raw = String(rec.status).trim().toUpperCase();
                        if (raw.startsWith('H')) {
                          statusLetter = 'H';
                          studentH++;
                        } else if (raw.startsWith('S')) {
                          statusLetter = 'S';
                          studentS++;
                        } else if (raw.startsWith('I')) {
                          statusLetter = 'I';
                          studentI++;
                        } else if (raw.startsWith('A')) {
                          statusLetter = 'A';
                          studentA++;
                        } else if (raw.startsWith('T')) {
                          statusLetter = 'T';
                          studentT++;
                          studentH++; // Terlambat tetap hadir
                        }
                      }
                      return { item, statusLetter };
                    });

                    return (
                      <tr key={s.id || idx} className="h-6.5 hover:bg-slate-50 transition-colors">
                        <td className="border border-black p-0.5 text-center font-mono font-medium text-[9.5px] print:text-[7.5pt]">{idx + 1}</td>
                        <td className="border border-black p-0.5 text-center font-mono text-[9px] print:text-[7pt] leading-tight font-medium text-slate-800">
                          {s.nisn || (s as any).NISN || s.nis || '-'}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 font-bold uppercase tracking-tight text-[10px] print:text-[8pt] text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                          <span>{s.name}</span>
                        </td>
                        {selectedClass === 'ALL' && (
                          <td className="border border-black p-0.5 text-center text-[9px] print:text-[7pt] font-bold text-slate-700">
                            {formatClassLabel(s.class, true)}
                          </td>
                        )}
                        <td className="border border-black p-0.5 text-center font-medium text-[9.5px] print:text-[7.5pt]">{s.gender || 'L'}</td>
                        {dayStatuses.map(({ item, statusLetter }, colIdx) => (
                          <td 
                            key={colIdx} 
                            className={`border border-black p-0 text-center font-bold text-[9.5px] print:text-[7.5pt] ${
                              item.isSunday ? 'bg-slate-100 print:bg-transparent text-slate-400' :
                              statusLetter === 'H' ? 'text-emerald-700 font-black bg-emerald-50/20' :
                              statusLetter === 'S' ? 'text-amber-700 font-black bg-amber-50/40' :
                              statusLetter === 'I' ? 'text-blue-700 font-black bg-blue-50/40' :
                              statusLetter === 'A' ? 'text-rose-700 font-black bg-rose-50/40' :
                              statusLetter === 'T' ? 'text-purple-700 font-black bg-purple-50/40' : 'bg-white'
                            }`}
                          >
                            {statusLetter}
                          </td>
                        ))}
                        <td className="border border-black p-0.5 text-center font-black text-[9.5px] print:text-[7.5pt] text-emerald-800 bg-emerald-50/20">{studentH || '-'}</td>
                        <td className="border border-black p-0.5 text-center font-bold text-[9.5px] print:text-[7.5pt] text-amber-800 bg-amber-50/20">{studentS || '-'}</td>
                        <td className="border border-black p-0.5 text-center font-bold text-[9.5px] print:text-[7.5pt] text-blue-800 bg-blue-50/20">{studentI || '-'}</td>
                        <td className="border border-black p-0.5 text-center font-bold text-[9.5px] print:text-[7.5pt] text-rose-800 bg-rose-50/20">{studentA || '-'}</td>
                        <td className="border border-black p-0.5 text-center font-black text-[9px] print:text-[7pt] text-indigo-900 bg-indigo-50/30">
                          {dayColumns.length > 0 ? `${((studentH / dayColumns.length) * 100).toFixed(1)}%` : '0%'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend & Signatures */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 text-[10px] print:text-[7.5pt] text-slate-600 font-medium">
                <div>
                  <span>Keterangan: <strong>H</strong> = Hadir, <strong>S</strong> = Sakit, <strong>I</strong> = Izin, <strong>A</strong> = Alpa / Tanpa Keterangan</span>
                </div>
                <div>
                  <span>Total Siswa: <strong>{classStudents.length} Anak</strong> ({countL} Laki-laki / {countP} Perempuan)</span>
                </div>
              </div>

              <div className="flex justify-between mt-6 print:mt-4 px-6 text-xs print:text-[8pt]">
                <div className="text-center">
                  <p className="mb-12 print:mb-8">Mengetahui,<br/>Kepala Sekolah / Pimpinan</p>
                  <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                  <p>NIP. {kepsek?.nip || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="mb-12 print:mb-8">{settings.kota || settings.city || 'Jakarta'}, {months[selectedMonth]} {selectedYear}<br/>{selectedClass === 'ALL' ? 'Koordinator Presensi' : `Guru Kelas / Wali Kelas ${formatClassLabel(selectedClass, true)}`}</p>
                  <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                  <p>NIP. {waliKelas?.nip || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CETAK DAFTAR NILAI */}
          {printTab === 'nilai' && (
            <div className="printable-container print-single-page min-w-[900px] print:min-w-0">
              <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2 print:pb-1">
                <h1 className="text-xl print:text-base font-black uppercase mb-0.5 tracking-tight">DAFTAR FORMAT PENILAIAN SISWA</h1>
                <h2 className="text-xs print:text-[9pt] font-bold text-slate-800 uppercase">
                  MATA PELAJARAN: {selectedSubject} &nbsp;|&nbsp; KELAS: {selectedClass === 'ALL' ? 'SEMUA KELAS / ROMBEL' : formatClassLabel(selectedClass, true).toUpperCase()} &nbsp;|&nbsp; SEMESTER {selectedSemester.toUpperCase()} T.A {selectedAcademicYear}
                </h2>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-black print-table font-sans">
                <thead>
                  <tr className="bg-slate-100 print:bg-transparent">
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-8">No</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-24">NISN</th>
                    <th rowSpan={2} className="border border-black p-1 font-bold text-[10px] print:text-[8pt]">Nama Lengkap</th>
                    {selectedClass === 'ALL' && (
                      <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-14">Kelas</th>
                    )}
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-9">L/P</th>
                    <th colSpan={5} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt]">Nilai Formatif (TP)</th>
                    <th colSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt]">Sumatif</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-14">Nilai Akhir</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold text-[10px] print:text-[8pt] w-14">Predikat</th>
                  </tr>
                  <tr className="bg-slate-50 print:bg-transparent text-[9px] print:text-[7pt]">
                    <th className="border border-black p-1 text-center w-11">TP 1</th>
                    <th className="border border-black p-1 text-center w-11">TP 2</th>
                    <th className="border border-black p-1 text-center w-11">TP 3</th>
                    <th className="border border-black p-1 text-center w-11">TP 4</th>
                    <th className="border border-black p-1 text-center w-12 font-bold">Rata2</th>
                    <th className="border border-black p-1 text-center w-12">STS</th>
                    <th className="border border-black p-1 text-center w-12">SAS</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => {
                    return (
                      <tr key={s.id || idx} className="h-6.5">
                        <td className="border border-black p-1 text-center font-mono font-medium text-[9.5px] print:text-[7.5pt]">{idx + 1}</td>
                        <td className="border border-black p-1 text-center text-[9px] print:text-[7pt] font-mono leading-tight font-medium text-slate-800">
                          {s.nisn || (s as any).NISN || s.nis || '-'}
                        </td>
                        <td className="border border-black px-1.5 py-1 font-bold uppercase tracking-tight text-[10px] print:text-[8pt] text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                          <span>{s.name}</span>
                        </td>
                        {selectedClass === 'ALL' && (
                          <td className="border border-black p-1 text-center text-[9px] print:text-[7pt] font-bold text-slate-700">
                            {formatClassLabel(s.class, true)}
                          </td>
                        )}
                        <td className="border border-black p-1 text-center font-medium text-[9.5px] print:text-[7.5pt]">{s.gender || 'L'}</td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1 bg-slate-50/50 print:bg-transparent"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1 bg-slate-50/50 print:bg-transparent"></td>
                        <td className="border border-black p-1"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between mt-6 print:mt-4 px-6 text-xs print:text-[8pt]">
                <div className="text-center">
                  <p className="mb-12 print:mb-8">Mengetahui,<br/>Kepala Sekolah / Pimpinan</p>
                  <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                  <p>NIP. {kepsek?.nip || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="mb-12 print:mb-8">{settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Guru Pengampu / {selectedClass === 'ALL' ? 'Wali Kelas' : `Wali Kelas ${formatClassLabel(selectedClass, true)}`}</p>
                  <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                  <p>NIP. {waliKelas?.nip || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADMINISTRASI KELAS */}
          {printTab === 'administrasi' && (
            <div className="printable-container min-w-[750px] print:min-w-0">
              
              {/* SECTION A: COVER & PENGESAHAN */}
              {adminSection === 'cover' && (
                <div className="border-4 border-double border-indigo-950 p-8 sm:p-12 text-center my-4 print:my-0 rounded-3xl print:rounded-none max-w-2xl mx-auto print:max-w-none print:border-black">
                  <div className="my-6">
                    {settings.schoolLogoUrl ? (
                      <img src={settings.schoolLogoUrl} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <School className="w-20 h-20 text-indigo-900 mx-auto mb-4 print:text-black" />
                    )}
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-indigo-950 print:text-black mb-2">
                      BERKAS ADMINISTRASI {formatClassLabel(selectedClass, true).toUpperCase()}
                    </h1>
                    <p className="text-lg font-bold text-slate-700 print:text-black uppercase tracking-wider">
                      {settings.schoolName || settings.appName || 'SISTEM INFORMASI AKADEMIK'}
                    </p>
                    <p className="text-sm font-semibold text-slate-500 print:text-black mt-1">
                      TAHUN PELAJARAN {selectedAcademicYear}
                    </p>
                  </div>

                  <div className="my-10 py-6 border-y-2 border-dashed border-indigo-200 print:border-black text-left max-w-md mx-auto space-y-2.5 text-sm font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-600 print:text-black">Satuan Pendidikan:</span>
                      <span className="font-bold text-slate-900 print:text-black">{settings.schoolName || settings.appName || 'SISTEM INFORMASI AKADEMIK'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 print:text-black">Kelas / Rombel:</span>
                      <span className="font-bold text-slate-900 print:text-black">{formatClassLabel(selectedClass, true)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 print:text-black">Wali Kelas:</span>
                      <span className="font-bold text-slate-900 print:text-black">{waliKelas?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 print:text-black">NIP Wali Kelas:</span>
                      <span className="font-mono font-bold text-slate-900 print:text-black">{waliKelas?.nip || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 print:text-black">Jumlah Murid:</span>
                      <span className="font-bold text-slate-900 print:text-black">{classStudents.length} Siswa ({countL} L / {countP} P)</span>
                    </div>
                  </div>

                  <div className="flex justify-between mt-12 px-6 text-xs text-center">
                    <div>
                      <p className="mb-14">Mengetahui,<br/>Kepala Sekolah / Pimpinan</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-14">{settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Wali Kelas {formatClassLabel(selectedClass, true)}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: REKAPITULASI & DAFTAR SISWA */}
              {adminSection === 'rekap' && (
                <div className="space-y-6">
                  <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2">
                    <h1 className="text-xl print:text-base font-black uppercase mb-0.5 tracking-tight">REKAPITULASI & DAFTAR SISWA {formatClassLabel(selectedClass, true).toUpperCase()}</h1>
                    <h2 className="text-xs print:text-[9pt] font-bold text-slate-800">
                      JUMLAH TOTAL: {classStudents.length} SISWA (LAKI-LAKI: {countL} | PEREMPUAN: {countP}) &bull; T.A {selectedAcademicYear}
                    </h2>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-black print-table font-sans">
                    <thead>
                      <tr className="bg-slate-100 print:bg-transparent">
                        <th className="border border-black p-1.5 text-center font-bold text-[10px] print:text-[8pt] w-8">No</th>
                        <th className="border border-black p-1.5 text-center font-bold text-[10px] print:text-[8pt] w-24">NISN</th>
                        <th className="border border-black p-1.5 text-center font-bold text-[10px] print:text-[8pt] w-20">NIS</th>
                        <th className="border border-black p-1.5 font-bold text-[10px] print:text-[8pt]">Nama Lengkap</th>
                        <th className="border border-black p-1.5 text-center font-bold text-[10px] print:text-[8pt] w-10">L/P</th>
                        <th className="border border-black p-1.5 font-bold text-[10px] print:text-[8pt] w-36">Tempat, Tgl Lahir</th>
                        <th className="border border-black p-1.5 font-bold text-[10px] print:text-[8pt] w-32">Orang Tua / Wali</th>
                        <th className="border border-black p-1.5 font-bold text-[10px] print:text-[8pt] w-24">Status</th>
                        <th className="border border-black p-1.5 font-bold text-[10px] print:text-[8pt]">Alamat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, idx) => (
                        <tr key={s.id || idx} className="h-6.5">
                          <td className="border border-black p-1 text-center font-mono font-medium text-[9.5px] print:text-[7.5pt]">{idx + 1}</td>
                          <td className="border border-black p-1 text-center font-mono text-[9px] print:text-[7pt] leading-tight font-medium">
                            {s.nisn || (s as any).NISN || '-'}
                          </td>
                          <td className="border border-black p-1 text-center font-mono text-[9px] print:text-[7pt] leading-tight text-slate-600">
                            {s.nopdkt || s.nis || '-'}
                          </td>
                          <td className="border border-black px-1.5 py-1 font-bold uppercase tracking-tight text-[10px] print:text-[8pt] text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {s.name}
                          </td>
                          <td className="border border-black p-1 text-center font-medium text-[9.5px] print:text-[7.5pt]">{s.gender || 'L'}</td>
                          <td className="border border-black p-1 text-[9.5px] print:text-[7.5pt]">
                            {s.birthPlace || (s as any).tempatLahir ? `${s.birthPlace || (s as any).tempatLahir}, ` : ''}{s.birthDate || (s as any).tanggalLahir || '-'}
                          </td>
                          <td className="border border-black p-1 text-[9.5px] print:text-[7.5pt]">
                            {s.fatherName || (s as any).namaAyah || (s as any).NamaIbu || (s as any).namaIbu || s.guardianName || '-'}
                          </td>
                          <td className="border border-black p-1 text-[9px] print:text-[7pt] font-semibold text-center">
                            {s.status || 'Aktif'}
                          </td>
                          <td className="border border-black p-1 text-[9.5px] print:text-[7.5pt] truncate max-w-xs">{s.address || (s as any).alamat || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between mt-8 px-6 text-xs text-center">
                    <div>
                      <p className="mb-14">Mengetahui,<br/>Kepala Sekolah / Pimpinan</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-14">{settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Wali Kelas {formatClassLabel(selectedClass, true)}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: JURNAL / AGENDA HARIAN MENGAJAR */}
              {adminSection === 'jurnal' && (
                <div className="space-y-6">
                  <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2">
                    <h1 className="text-xl print:text-base font-black uppercase mb-0.5 tracking-tight">JURNAL AGENDA HARIAN MENGAJAR GURU</h1>
                    <h2 className="text-xs print:text-[9pt] font-bold text-slate-800">
                      KELAS: {formatClassLabel(selectedClass, true).toUpperCase()} &nbsp;|&nbsp; SEMESTER: {selectedSemester.toUpperCase()} &nbsp;|&nbsp; TAHUN AJARAN: {selectedAcademicYear}
                    </h2>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-black print-table font-sans">
                    <thead>
                      <tr className="bg-slate-100 print:bg-transparent text-center font-bold text-[10px] print:text-[8pt]">
                        <th className="border border-black p-1.5 w-8">No</th>
                        <th className="border border-black p-1.5 w-28">Hari / Tanggal</th>
                        <th className="border border-black p-1.5 w-32">Mata Pelajaran</th>
                        <th className="border border-black p-1.5 w-48">Materi / Tujuan Pembelajaran</th>
                        <th className="border border-black p-1.5">Kegiatan Pembelajaran & Catatan</th>
                        <th className="border border-black p-1.5 w-20">Absensi (S/I/A)</th>
                        <th className="border border-black p-1.5 w-20">Paraf Guru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({length: 12}).map((_, idx) => (
                        <tr key={idx} className="h-10">
                          <td className="border border-black p-1 text-center font-medium font-mono text-[9.5px] print:text-[7.5pt]">{idx + 1}</td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between mt-8 px-6 text-xs text-center">
                    <div>
                      <p className="mb-14">Mengetahui,<br/>Kepala Sekolah / Pimpinan</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-14">{settings.kota || settings.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Guru Kelas {formatClassLabel(selectedClass, true)}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}
      </>
      )}
    </div>
  );
}
