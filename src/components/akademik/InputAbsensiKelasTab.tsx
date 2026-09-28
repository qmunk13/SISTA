import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  matchClass, matchStatusActive, getActiveClasses, getAllClasses, 
  formatClassLabel, sortStudentsByStatusAndName, triggerPrint,
  getTodayDateString, getLocalDateString, standardizeDate
} from '../../lib/utils';
import { 
  CheckCircle2, AlertCircle, Clock, XCircle, FileText, 
  Users, Calendar, CheckCheck, RefreshCw, Save, Printer, 
  FileSpreadsheet, MessageSquare, Search, Filter, Sparkles,
  ChevronRight, ArrowRight, UserCheck, ShieldCheck, HeartPulse,
  Info, HelpCircle, Send, Image as ImageIcon, AlertTriangle, Trash2,
  Briefcase, Sun, Moon
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import StudentPhoto from './StudentPhoto';
import BeritaAcaraModal from './BeritaAcaraModal';
import CustomDropdown from '../common/CustomDropdown';
import VerifikasiKerjaModal, { getStudentEffectiveGroup } from './VerifikasiKerjaModal';

export type AttendanceItemStatus = 'H' | 'S' | 'I' | 'A' | 'T' | '';

interface StudentAttendanceState {
  status: AttendanceItemStatus;
  note: string;
  time?: string;
}

interface StudentDetailItem {
  id: string;
  name: string;
  nisn?: string;
  gender?: string;
  note?: string;
  isAuto?: boolean;
}

interface SaveReviewModalState {
  isOpen: boolean;
  date: string;
  formattedDate: string;
  className: string;
  isAlreadySaved: boolean;
  existingCount: number;
  hadirList: StudentDetailItem[];
  sakitList: StudentDetailItem[];
  izinList: StudentDetailItem[];
  alpaList: StudentDetailItem[];
  terlambatList: StudentDetailItem[];
  total: number;
}

export default function InputAbsensiKelasTab() {
  const { students, teachers, settings } = useStore();
  const activeClasses = useMemo(() => getActiveClasses(students), [students]);
  const allClasses = useMemo(() => getAllClasses(students), [students]);

  // Memoized class dropdown options with fast pre-indexed count
  const classDropdownOptions = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const s of students) {
      if (matchStatusActive(s.status) && s.class) {
        for (const c of allClasses) {
          if (matchClass(s.class, c)) {
            countMap.set(c, (countMap.get(c) || 0) + 1);
            break;
          }
        }
      }
    }

    return allClasses.map(c => {
      const count = countMap.get(c) || 0;
      return {
        value: c,
        label: formatClassLabel(c, true),
        badge: `${count} Siswa`
      };
    });
  }, [allClasses, students]);

  // Default to first class if available
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return activeClasses.length > 0 ? activeClasses[0] : (allClasses[0] || '1A');
  });

  // Selected date (Default today in local timezone: YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getTodayDateString();
  });

  // Shift filter for 3-Day Attendance Scheme & Verification Modal
  const [shiftFilter, setShiftFilter] = useState<'Semua' | 'Aktif Bekerja' | 'Tidak Bekerja'>('Semua');
  const [verifyingStudent, setVerifyingStudent] = useState<any | null>(null);

  // Smart 3-Day Shift Scheduling Intelligence
  const dayInfo = useMemo(() => {
    if (!selectedDate) return { dayName: '', isOfficialDay: false, scheduledShift: 'Semua' as const, note: '', badge: '' };
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[dateObj.getDay()] || '';

    if (dayName === 'Senin') {
      return {
        dayName,
        isOfficialDay: true,
        scheduledShift: 'Semua' as const,
        note: 'Hari Senin: KBM Wajib Semua Kelompok (Sesi Siang untuk Tidak Bekerja & Sesi Malam untuk Aktif Bekerja).',
        badge: 'Semua Siswa Terjadwal'
      };
    }
    if (dayName === 'Rabu') {
      return {
        dayName,
        isOfficialDay: true,
        scheduledShift: 'Aktif Bekerja' as const,
        note: 'Hari Rabu: Sesi Khusus Kelompok Aktif Bekerja (Shift Malam: 19:30). Siswa kelompok Tidak Bekerja tidak terjadwal hadir & bebas alpa.',
        badge: 'Khusus Shift Malam (Aktif Bekerja)'
      };
    }
    if (dayName === 'Kamis') {
      return {
        dayName,
        isOfficialDay: true,
        scheduledShift: 'Tidak Bekerja' as const,
        note: 'Hari Kamis: Sesi Khusus Kelompok Tidak Bekerja (Shift Siang: 13:00 / 15:30). Siswa kelompok Aktif Bekerja tidak terjadwal hadir & bebas alpa.',
        badge: 'Khusus Shift Siang (Tidak Bekerja)'
      };
    }
    if (dayName === 'Minggu') {
      return {
        dayName,
        isOfficialDay: true,
        scheduledShift: 'Semua' as const,
        note: 'Hari Minggu: Sesi Tatap Muka Bersama. Wajib dihadiri oleh seluruh siswa baik Aktif Bekerja maupun Tidak Bekerja.',
        badge: 'Tatap Muka Wajib Bersama'
      };
    }
    return {
      dayName,
      isOfficialDay: false,
      scheduledShift: 'Semua' as const,
      note: `Hari ${dayName}: Bukan jadwal KBM wajib mingguan (Hari Belajar Mandiri / Tutorial / Ekskul).`,
      badge: 'Belajar Mandiri / Ekskul'
    };
  }, [selectedDate]);

  const [sessionName, setSessionName] = useState<string>('Presensi Pagi (Harian)');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [showBeritaAcaraModal, setShowBeritaAcaraModal] = useState<boolean>(false);
  const [saveReviewModal, setSaveReviewModal] = useState<SaveReviewModalState | null>(null);
  const [saveConfirmationModal, setSaveConfirmationModal] = useState<{
    isOpen: boolean;
    date: string;
    formattedDate: string;
    className: string;
    summary: {
      total: number;
      hadir: number;
      sakit: number;
      izin: number;
      alpa: number;
      terlambat: number;
      autoAlpaCount: number;
    };
  } | null>(null);

  // Homeroom teacher (Wali Kelas)
  const waliKelas = useMemo(() => {
    if (!selectedClass) return null;
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

  // Filter students in selected class (Active only)
  const classStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    const filtered = students.filter(s => {
      if (!s) return false;
      if (!matchStatusActive(s.status)) return false;
      return matchClass(s.class, selectedClass);
    });
    return sortStudentsByStatusAndName(filtered);
  }, [students, selectedClass]);

  // Attendance state map: { [studentId]: { status: 'H'|'S'|'I'|'A'|'T'|'', note: string, time: string } }
  const [attendanceMap, setAttendanceMap] = useState<Record<string, StudentAttendanceState>>({});
  const [autoFillRemainingAlpa, setAutoFillRemainingAlpa] = useState<boolean>(true);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const prevClassDateRef = React.useRef<string>('');

  // Load existing attendance from db when date or class changes
  const loadAttendanceFromDb = React.useCallback(() => {
    const existingAbsensi = (db.get('absensi') as any[]) || [];
    const newMap: Record<string, StudentAttendanceState> = {};
    const stdSelectedDate = standardizeDate(selectedDate) || selectedDate;

    let hasAnyExistingSavedRecord = false;

    classStudents.forEach(s => {
      const sId = String(s.id).trim();
      const sNisn = s.nisn ? String(s.nisn).trim() : '';
      const sNis = s.nis ? String(s.nis).trim() : '';
      const sName = String(s.name || '').trim().toLowerCase();

      // Find matching record for this student and this date
      const rec = existingAbsensi.find((a: any) => {
        const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl;
        const stdDate = standardizeDate(rawDate) || rawDate;
        const isDateMatch = (stdDate === stdSelectedDate || rawDate === selectedDate);
        if (!isDateMatch) return false;

        const aId = String(a.studentId || a.SiswaID || a.id || '').trim();
        const aNisn = a.nisn ? String(a.nisn).trim() : '';
        const aNis = a.nis ? String(a.nis).trim() : '';
        const aName = String(a.name || a.NamaSiswa || a.nama || '').trim().toLowerCase();

        return (aId && aId === sId) ||
               (sNisn && aNisn === sNisn) ||
               (sNis && aNis === sNis) ||
               (sName && aName === sName);
      });

      if (rec && rec.status) {
        hasAnyExistingSavedRecord = true;
        let st: AttendanceItemStatus = '';
        const rawSt = String(rec.status).trim().toUpperCase();
        if (rawSt.startsWith('H')) st = 'H';
        else if (rawSt.startsWith('S')) st = 'S';
        else if (rawSt.startsWith('I')) st = 'I';
        else if (rawSt.startsWith('A')) st = 'A';
        else if (rawSt.startsWith('T')) st = 'T';
        else st = '';

        newMap[s.id] = {
          status: st,
          note: rec.note || rec.keterangan || '',
          time: rec.time || ''
        };
      } else {
        newMap[s.id] = {
          status: '',
          note: '',
          time: ''
        };
      }
    });

    setAttendanceMap(newMap);
    setIsDirty(false);
    if (hasAnyExistingSavedRecord) {
      setLastSavedTime('Tersimpan di Database');
    } else {
      setLastSavedTime('');
    }
  }, [selectedDate, selectedClass, classStudents]);

  const loadAttendanceFromDbRef = useRef(loadAttendanceFromDb);
  loadAttendanceFromDbRef.current = loadAttendanceFromDb;

  // Handle initial load and reload when class/date changes
  useEffect(() => {
    const currentKey = `${selectedClass}_${selectedDate}_${classStudents.length}`;
    if (prevClassDateRef.current !== currentKey) {
      prevClassDateRef.current = currentKey;
      loadAttendanceFromDbRef.current();
    }
  }, [selectedClass, selectedDate, classStudents.length]);

  // Listen to external DB updates only if user is NOT currently editing (drafting)
  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (isDirty) return; // Do not overwrite user's in-progress uncommitted clicks
      if (!e.detail?.key || e.detail.key === 'absensi' || e.detail.key === 'recent_qr_scans') {
        loadAttendanceFromDbRef.current();
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
    };
  }, [isDirty]);

  // Update attendance of a specific student (Draft state in UI only, saved only upon clicking Simpan Presensi)
  const handleSetStudentStatus = (studentId: string, targetStatus: AttendanceItemStatus) => {
    const existing = attendanceMap[studentId] || { status: '', note: '', time: '' };
    const newStatus: AttendanceItemStatus = existing.status === targetStatus ? '' : targetStatus;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...existing,
        status: newStatus,
        time: newStatus ? (existing.time || nowTime) : ''
      }
    }));
    setIsDirty(true);
  };

  // Quick Action: Mark all students in class as Hadir (H)
  const handleSetAllHadir = () => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updatedMap: Record<string, StudentAttendanceState> = {};
    classStudents.forEach(s => {
      const existing = attendanceMap[s.id] || { status: '', note: '', time: '' };
      updatedMap[s.id] = {
        ...existing,
        status: 'H',
        time: existing.time || nowTime
      };
    });
    setAttendanceMap(updatedMap);
    setIsDirty(true);
  };

  // Quick Action: Set all unfilled/remaining students as Alpa (A) with Smart Shift Protection
  const handleSetRemainingAlpa = () => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updatedMap: Record<string, StudentAttendanceState> = {};
    classStudents.forEach(s => {
      const existing = attendanceMap[s.id] || { status: '', note: '', time: '' };
      const eff = getStudentEffectiveGroup(s);

      // Proteksi Shift: Jika hari Rabu, siswa kelompok Tidak Bekerja TIDAK dialpakan.
      // Jika hari Kamis, siswa kelompok Aktif Bekerja TIDAK dialpakan.
      if (dayInfo.scheduledShift !== 'Semua' && eff.group !== dayInfo.scheduledShift) {
        updatedMap[s.id] = { ...existing };
        return;
      }

      if (!existing.status) {
        updatedMap[s.id] = {
          ...existing,
          status: 'A',
          time: nowTime
        };
      } else {
        updatedMap[s.id] = { ...existing };
      }
    });
    setAttendanceMap(updatedMap);
    setIsDirty(true);
  };

  // Quick Action: Set all students in class as Alpa (A)
  const handleSetAllAlpa = () => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updatedMap: Record<string, StudentAttendanceState> = {};
    classStudents.forEach(s => {
      const existing = attendanceMap[s.id] || { status: '', note: '', time: '' };
      updatedMap[s.id] = {
        ...existing,
        status: 'A',
        time: existing.time || nowTime
      };
    });
    setAttendanceMap(updatedMap);
    setIsDirty(true);
  };

  // Quick Action: Reset all statuses back to blank/unfilled (in UI draft)
  const handleResetAll = () => {
    const updatedMap: Record<string, StudentAttendanceState> = {};
    classStudents.forEach(s => {
      updatedMap[s.id] = {
        status: '',
        note: '',
        time: ''
      };
    });
    setAttendanceMap(updatedMap);
    setIsDirty(true);
    setSaveSuccessMsg('Pilihan presensi telah dikosongkan. Klik "Simpan Presensi Kelas" jika ingin memperbarui database.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Quick Action: Permanently Delete / Wipe Attendance for this Selected Date and Class
  const handleDeleteDateAttendance = () => {
    if (classStudents.length === 0) {
      alert('Tidak ada siswa di kelas ini.');
      return;
    }

    const dateObj = new Date(selectedDate);
    const formattedDateIndo = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : selectedDate;
    const classLabel = formatClassLabel(selectedClass, true);

    const isConfirmed = window.confirm(
      `🗑️ HAPUS PRESENSI:\n\nApakah Anda yakin ingin MENGHAPUS SELURUH data absensi ${classLabel} pada ${formattedDateIndo}?\n\nSemua catatan kehadiran kelas ini pada tanggal tersebut akan dihapus dari sistem dan disinkronkan ke Google Sheets.`
    );

    if (!isConfirmed) return;

    try {
      const allAbsensi = (db.get('absensi') as any[]) || [];
      const studentIds = new Set(classStudents.map(s => String(s.id).toLowerCase()));
      const studentNisns = new Set(classStudents.map(s => String(s.nisn || (s as any).NISN || '').trim()).filter(Boolean));
      const studentNames = new Set(classStudents.map(s => String(s.name || '').trim().toLowerCase()));

      const filtered = allAbsensi.filter(a => {
        const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl || '';
        const aDate = standardizeDate(rawDate) || rawDate;
        if (aDate !== selectedDate) return true;

        const aId = String(a.studentId || a.SiswaID || a.siswaId || a.id || '').trim().toLowerCase();
        const aNisn = String(a.nisn || a.NISN || '').trim();
        const aName = String(a.name || a.NamaSiswa || a.nama || '').trim().toLowerCase();

        const isMatchStudent = studentIds.has(aId) || (aNisn && studentNisns.has(aNisn)) || studentNames.has(aName);
        return !isMatchStudent;
      });

      db.set('absensi', filtered);
      db.set('attendances', filtered);

      // Reset state in UI
      const updatedMap: Record<string, StudentAttendanceState> = {};
      classStudents.forEach(s => {
        updatedMap[s.id] = { status: '', note: '', time: '' };
      });
      setAttendanceMap(updatedMap);
      setIsDirty(false);
      setLastSavedTime(null);

      setSaveSuccessMsg(`🗑️ Data presensi ${classLabel} pada ${formattedDateIndo} berhasil dihapus.`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Gagal menghapus data presensi: ' + (err?.message || 'Error'));
    }
  };

  // Update note of a specific student (Draft state)
  const handleSetStudentNote = (studentId: string, note: string) => {
    const updated = {
      ...attendanceMap,
      [studentId]: {
        ...(attendanceMap[studentId] || { status: '', time: '' }),
        note
      }
    };
    setAttendanceMap(updated);
    setIsDirty(true);
  };

  // Open the Review & Confirmation Modal when clicking "Simpan Presensi" / "Simpan Presensi Kelas"
  const handleInitiateSave = () => {
    if (classStudents.length === 0) {
      alert('Tidak ada siswa aktif terdaftar di kelas ini.');
      return;
    }

    const allAbsensi = (db.get('absensi') as any[]) || [];
    const stdSelectedDate = standardizeDate(selectedDate) || selectedDate;
    const studentIdsInClass = new Set(classStudents.map(s => String(s.id).trim()));

    // Check if records already exist for this class & date in database
    const existingRecords = allAbsensi.filter((a: any) => {
      const rawDate = a.date || a.Tanggal || a.tanggal || a.tgl;
      const aStdDate = standardizeDate(rawDate) || rawDate;
      const isThisDate = (aStdDate === stdSelectedDate || rawDate === selectedDate);
      const isThisClass = studentIdsInClass.has(String(a.studentId || a.SiswaID || a.id).trim()) ||
                          (a.class && matchClass(a.class, selectedClass));
      return isThisDate && isThisClass;
    });

    const isAlreadySaved = existingRecords.length > 0;

    const hadirList: StudentDetailItem[] = [];
    const sakitList: StudentDetailItem[] = [];
    const izinList: StudentDetailItem[] = [];
    const alpaList: StudentDetailItem[] = [];
    const terlambatList: StudentDetailItem[] = [];

    classStudents.forEach(s => {
      const data = attendanceMap[s.id] || { status: '', note: '', time: '' };
      const item: StudentDetailItem = {
        id: s.id,
        name: s.name,
        nisn: s.nisn || (s as any).NISN || s.nis || '-',
        gender: s.gender || 'L',
        note: data.note || '',
        isAuto: !data.status
      };

      if (data.status === 'H') hadirList.push(item);
      else if (data.status === 'S') sakitList.push(item);
      else if (data.status === 'I') izinList.push(item);
      else if (data.status === 'T') terlambatList.push(item);
      else alpaList.push(item); // empty or 'A' is Alpa
    });

    const dateObj = new Date(selectedDate);
    const formattedDateIndo = !isNaN(dateObj.getTime()) 
      ? dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : selectedDate;

    setSaveReviewModal({
      isOpen: true,
      date: selectedDate,
      formattedDate: formattedDateIndo,
      className: formatClassLabel(selectedClass, true),
      isAlreadySaved,
      existingCount: existingRecords.length,
      hadirList,
      sakitList,
      izinList,
      alpaList,
      terlambatList,
      total: classStudents.length
    });
  };

  // Confirm and commit save to database
  const handleConfirmExecuteSave = () => {
    saveAttendanceToDb(attendanceMap, true);
    setSaveReviewModal(null);
  };

  // Save current attendance map to persistent db
  const saveAttendanceToDb = (
    currentMap: Record<string, StudentAttendanceState>, 
    showModal: boolean = false, 
    customMessage?: string
  ) => {
    try {
      const allAbsensi = (db.get('absensi') as any[]) || [];
      
      // Filter out records for this class & date, then append new ones
      const studentIdsInClass = new Set(classStudents.map(s => s.id));
      const filteredOtherAbsensi = allAbsensi.filter((a: any) => {
        const isThisClassStudent = studentIdsInClass.has(a.studentId);
        const isThisDate = a.date === selectedDate;
        return !(isThisClassStudent && isThisDate);
      });

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // When saving explicitly or finalizing: any student with no status ('') is automatically marked as 'A' (Alpa)
      let autoAlpaCount = 0;
      let hadirCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = 0;
      let terlambatCount = 0;

      const finalizedMap: Record<string, StudentAttendanceState> = { ...currentMap };

      const newRecords = classStudents.map(s => {
        const data = currentMap[s.id] || { status: '', note: '', time: '' };
        
        // Auto-Alpa rule: yang tidak di-klik apa-apa berarti Alpa (A)
        // Proteksi Jadwal 3x Seminggu:
        // Jika hari Rabu, siswa kelompok Tidak Bekerja yang kosong TIDAK dialpakan.
        // Jika hari Kamis, siswa kelompok Aktif Bekerja yang kosong TIDAK dialpakan.
        const eff = getStudentEffectiveGroup(s);
        let effectiveStatus: AttendanceItemStatus = data.status;
        if (!effectiveStatus) {
          if (dayInfo.scheduledShift !== 'Semua' && eff.group !== dayInfo.scheduledShift) {
            effectiveStatus = ''; // Bebas jadwal hari ini, bukan alpa
          } else {
            effectiveStatus = 'A';
            autoAlpaCount++;
          }
        }

        finalizedMap[s.id] = {
          ...data,
          status: effectiveStatus,
          time: data.time || nowTime
        };

        let fullStatusLabel = 'Alpa (Tanpa Keterangan)';
        if (effectiveStatus === 'H') { fullStatusLabel = 'Hadir'; hadirCount++; }
        else if (effectiveStatus === 'S') { fullStatusLabel = 'Sakit'; sakitCount++; }
        else if (effectiveStatus === 'I') { fullStatusLabel = 'Izin'; izinCount++; }
        else if (effectiveStatus === 'A') { fullStatusLabel = 'Alpa (Tanpa Keterangan)'; alpaCount++; }
        else if (effectiveStatus === 'T') { fullStatusLabel = 'Terlambat'; terlambatCount++; }

        return {
          id: `abs-${s.id}-${selectedDate}`,
          studentId: s.id,
          nisn: s.nisn || (s as any).NISN || s.nis || '-',
          name: s.name,
          class: s.class || selectedClass,
          date: selectedDate,
          time: finalizedMap[s.id]?.time || nowTime,
          status: effectiveStatus || '-',
          statusLabel: effectiveStatus ? fullStatusLabel : 'Bukan Jadwal Shift',
          note: data.note || (effectiveStatus === 'A' && data.status === '' ? 'Otomatis Alpa (Tidak ada input)' : (effectiveStatus === '' ? 'Bebas KBM Shift' : '')),
          session: sessionName,
          method: 'Input Per Kelas',
          recordedBy: waliKelas?.name || 'Wali Kelas',
          updatedAt: new Date().toISOString()
        };
      });

      const updatedAll = [...newRecords, ...filteredOtherAbsensi];
      db.set('absensi', updatedAll);
      setAttendanceMap(finalizedMap);
      setIsDirty(false);
      const saveTimestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(`Tersimpan (${saveTimestamp})`);

      const dateObj = new Date(selectedDate);
      const formattedDateIndo = !isNaN(dateObj.getTime()) 
        ? dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : selectedDate;

      if (showModal) {
        setSaveConfirmationModal({
          isOpen: true,
          date: selectedDate,
          formattedDate: formattedDateIndo,
          className: formatClassLabel(selectedClass, true),
          summary: {
            total: classStudents.length,
            hadir: hadirCount,
            sakit: sakitCount,
            izin: izinCount,
            alpa: alpaCount,
            terlambat: terlambatCount,
            autoAlpaCount
          }
        });
      } else {
        setSaveSuccessMsg(customMessage || `Presensi ${formatClassLabel(selectedClass)} tanggal ${formattedDateIndo} tersimpan!`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error('Save attendance error:', e);
    }
  };

  // Summary counts
  const summary = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let terlambat = 0;
    let belumDiisi = 0;

    const targetList = shiftFilter === 'Semua' 
      ? classStudents 
      : classStudents.filter(s => getStudentEffectiveGroup(s).group === shiftFilter);

    targetList.forEach(s => {
      const st = attendanceMap[s.id]?.status || '';
      if (st === 'H') hadir++;
      else if (st === 'S') sakit++;
      else if (st === 'I') izin++;
      else if (st === 'A') alpa++;
      else if (st === 'T') terlambat++;
      else belumDiisi++;
    });

    const total = targetList.length;
    const sudahDiisi = total - belumDiisi;
    const hadirPercentage = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;

    return { total, hadir, sakit, izin, alpa, terlambat, belumDiisi, sudahDiisi, hadirPercentage };
  }, [classStudents, shiftFilter, attendanceMap]);

  // Filtered displayed students by search and shift
  const displayedStudents = useMemo(() => {
    let list = classStudents;
    if (shiftFilter !== 'Semua') {
      list = list.filter(s => getStudentEffectiveGroup(s).group === shiftFilter);
    }
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.includes(q)) ||
      (s.nis && s.nis.includes(q))
    );
  }, [classStudents, shiftFilter, searchFilter]);

  // Export Daily Excel
  const handleExportDailyExcel = () => {
    if (classStudents.length === 0) {
      alert('Tidak ada siswa di kelas ini.');
      return;
    }

    const rows = classStudents.map((s, idx) => {
      const data = attendanceMap[s.id] || { status: '', note: '', time: '' };
      const statusMapName: Record<string, string> = {
        H: 'Hadir (H)',
        S: 'Sakit (S)',
        I: 'Izin (I)',
        A: 'Alpa (A)',
        T: 'Terlambat (T)',
        '': 'Belum Diisi'
      };

      return {
        No: idx + 1,
        'NISN': s.nisn || (s as any).NISN || '-',
        'NIS': s.nis || '-',
        'Nama Siswa': s.name,
        'L/P': s.gender || 'L',
        'Kelas': formatClassLabel(s.class, true),
        'Tanggal': selectedDate,
        'Sesi': sessionName,
        'Status Presensi': statusMapName[data.status] || 'Belum Diisi',
        'Keterangan / Alasan': data.note || '-',
        'Wali Kelas': waliKelas?.name || '-'
      };
    });

    exportToExcel(rows, `Presensi_Harian_${formatClassLabel(selectedClass, false)}_${selectedDate}.xlsx`);
  };

  // WhatsApp helper to notify parents
  const sendWhatsAppNotification = (student: any) => {
    const parentPhone = student.parentPhone || student.phone || student.noHp || (student as any).tlpAyah || (student as any).tlpIbu || '';
    const cleanPhone = String(parentPhone).replace(/\D/g, '');
    if (!cleanPhone) {
      alert(`Nomor telepon orang tua / wali untuk ${student.name} belum terisi.`);
      return;
    }

    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);
    const data = attendanceMap[student.id] || { status: '', note: '' };
    
    let statusText = 'Belum dicatat / Belum absen';
    if (data.status === 'H') statusText = 'Hadir di sekolah';
    else if (data.status === 'S') statusText = `Sakit${data.note ? ` (${data.note})` : ''}`;
    else if (data.status === 'I') statusText = `Izin${data.note ? ` (${data.note})` : ''}`;
    else if (data.status === 'A') statusText = 'Alpa (Belum Ada Keterangan)';
    else if (data.status === 'T') statusText = 'Terlambat Masuk Kelas';

    const message = `Yth. Bapak/Ibu Orang Tua/Wali dari *${student.name}* (Kelas ${formatClassLabel(student.class, false)}),\n\nKami menginformasikan bahwa pada hari ini (${selectedDate}), ananda tercatat: *${statusText}*.\n\nDemikian pemberitahuan dari pihak sekolah (${settings.schoolName || settings.appName || 'Sekolah'}). Terima kasih.`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Date presets
  const setDateToday = () => setSelectedDate(getTodayDateString());
  const setDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Alert */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={20} className="text-emerald-100 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-black">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden no-print">
        <div className="absolute right-0 top-0 w-80 h-full bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-xl text-indigo-100 text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={13} className="text-amber-300" /> Input Presensi Harian Cepat (Per-Kelas)
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tinggal Klik: Hadir, Sakit, Izin, Alpa
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-2xl font-medium">
              ⚡ <strong>Sangat Ringkas:</strong> Cukup klik siswa yang <strong>Hadir (H)</strong>, <strong>Sakit (S)</strong>, atau <strong>Izin (I)</strong>. Siswa yang <strong>tidak diklik apa-apa otomatis dicatat sebagai Alpa (A)</strong> saat disimpan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleInitiateSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
              title="Simpan data presensi kelas ke database"
            >
              <Save size={16} />
              <span>Simpan Presensi Kelas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Class, Date, Session Filter */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Class Selector */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              1. Pilih Kelas / Rombel:
            </label>
            <CustomDropdown
              id="absensi-select-class"
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={classDropdownOptions}
              searchable={classDropdownOptions.length > 5}
            />
          </div>

          {/* Date Picker & Quick Presets */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              2. Tanggal Presensi:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={setDateToday}
                className={`px-2.5 py-2 rounded-xl text-[10px] font-black uppercase transition ${
                  selectedDate === getTodayDateString()
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Pilih Hari Ini"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setDateYesterday}
                className="px-2 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                title="Pilih Kemarin"
              >
                Kemarin
              </button>
            </div>
          </div>

          {/* Sesi / Jam KBM */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-600" />
              3. Sesi / Jam KBM:
            </label>
            <CustomDropdown
              id="absensi-select-session"
              value={sessionName}
              onChange={(val) => setSessionName(val)}
              options={[
                { value: 'Presensi Pagi (Harian)', label: 'Presensi Pagi (Harian Penuh)' },
                { value: 'Jam Pelajaran 1 - 2 (Pagi)', label: 'Jam Pelajaran 1 - 2 (Pagi)' },
                { value: 'Jam Pelajaran 3 - 4 (Siang)', label: 'Jam Pelajaran 3 - 4 (Siang)' },
                { value: 'Jam Pelajaran 5 - 6 (Sore)', label: 'Jam Pelajaran 5 - 6 (Sore)' },
                { value: 'Presensi Kepulangan', label: 'Presensi Kepulangan (Sore)' }
              ]}
            />
          </div>

          {/* Search Student Filter */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Search size={14} className="text-indigo-600" />
              4. Cari Nama Siswa:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Ketik nama / NISN..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchFilter && (
                <button 
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Smart 3-Day Shift Scheduling Indicator & Shift Switcher */}
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition ${
          dayInfo.dayName === 'Rabu'
            ? 'bg-indigo-950/5 border-indigo-200 text-indigo-900'
            : dayInfo.dayName === 'Kamis'
            ? 'bg-blue-950/5 border-blue-200 text-blue-900'
            : dayInfo.dayName === 'Minggu'
            ? 'bg-amber-950/5 border-amber-200 text-amber-900'
            : dayInfo.dayName === 'Senin'
            ? 'bg-emerald-950/5 border-emerald-200 text-emerald-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
              dayInfo.dayName === 'Rabu'
                ? 'bg-indigo-600 text-white'
                : dayInfo.dayName === 'Kamis'
                ? 'bg-blue-600 text-white'
                : dayInfo.dayName === 'Minggu'
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {dayInfo.scheduledShift === 'Aktif Bekerja' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm">
                  {dayInfo.dayName ? `Sesi Hari ${dayInfo.dayName}` : 'Jadwal Rombel'}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  dayInfo.isOfficialDay ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {dayInfo.badge}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 font-medium leading-relaxed">
                {dayInfo.note}
              </p>
            </div>
          </div>

          {/* Shift Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setShiftFilter('Semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                shiftFilter === 'Semua' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({classStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('Aktif Bekerja')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                shiftFilter === 'Aktif Bekerja' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-indigo-50'
              }`}
            >
              <Moon size={12} />
              <span>Shift Malam ({classStudents.filter(s => getStudentEffectiveGroup(s).group === 'Aktif Bekerja').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('Tidak Bekerja')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                shiftFilter === 'Tidak Bekerja' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-blue-50'
              }`}
            >
              <Sun size={12} />
              <span>Shift Siang ({classStudents.filter(s => getStudentEffectiveGroup(s).group === 'Tidak Bekerja').length})</span>
            </button>
          </div>
        </div>

        {/* Info, Wali Kelas, Quick Actions & Auto-Save Bar */}
        <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Wali Kelas:</span>
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-black text-xs border border-indigo-100">
                {waliKelas?.name || 'Belum Ditentukan'} {waliKelas?.nip ? `(NIP: ${waliKelas.nip})` : ''}
              </span>
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Draft (Belum Disimpan)
                </span>
              ) : lastSavedTime ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {lastSavedTime}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportDailyExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                <FileSpreadsheet size={14} /> Ekspor Excel
              </button>
              <button
                type="button"
                onClick={() => setShowBeritaAcaraModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition shadow-xs cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak Berita Acara & WA</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Auto-Alpa Mode Bar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <label 
                htmlFor="auto-alpa-toggle"
                className="inline-flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
              >
                <input
                  id="auto-alpa-toggle"
                  type="checkbox"
                  checked={autoFillRemainingAlpa}
                  onChange={(e) => setAutoFillRemainingAlpa(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" />
                  Otomatis Sisa Kosong Jadi Alpa (A) saat Disimpan
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                  autoFillRemainingAlpa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {autoFillRemainingAlpa ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </label>
            </div>

            {/* Quick Fill Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Isi Cepat:</span>
              <button
                type="button"
                onClick={handleSetAllHadir}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-[11px] rounded-xl border border-emerald-300 transition cursor-pointer active:scale-95"
                title="Tandai semua siswa sebagai Hadir"
              >
                <CheckCircle2 size={13} />
                <span>Semua Hadir (H)</span>
              </button>

              <button
                type="button"
                onClick={handleSetRemainingAlpa}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-[11px] rounded-xl border border-rose-300 transition cursor-pointer active:scale-95"
                title="Tandai semua siswa yang belum diisi sebagai Alpa"
              >
                <XCircle size={13} />
                <span>Sisa Jadi Alpa (A)</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllAlpa}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-xl border border-rose-200 transition cursor-pointer active:scale-95"
                title="Tandai semua siswa sebagai Alpa"
              >
                <span>Semua Alpa (A)</span>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-xl transition cursor-pointer active:scale-95 ml-auto sm:ml-0"
                title="Kosongkan status pilihan presensi di layar ini"
              >
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteDateAttendance}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                title="Hapus data presensi kelas ini pada tanggal terpilih dari database dan Google Sheets"
              >
                <Trash2 size={12} />
                <span>Hapus Data Tgl Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Attendance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 no-print">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Siswa</span>
            <Users size={15} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{summary.total}</span>
            <span className="text-[10px] text-slate-400 font-bold">anak</span>
          </div>
        </div>

        {/* Belum Diisi / Kosong */}
        <div className={`p-3.5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          summary.belumDiisi > 0 
            ? 'bg-slate-100/90 border-slate-300 ring-2 ring-indigo-400/30' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-600 uppercase">⚪ Belum Diisi</span>
            <HelpCircle size={15} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-700">{summary.belumDiisi}</span>
            <span className="text-[10px] text-slate-400 font-bold">anak</span>
          </div>
        </div>

        {/* Hadir */}
        <div className="bg-emerald-50/70 p-3.5 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-700 uppercase">🟢 Hadir (H)</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{summary.hadir}</span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
              {summary.hadirPercentage}%
            </span>
          </div>
        </div>

        {/* Sakit */}
        <div className="bg-amber-50/70 p-3.5 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-700 uppercase">🟡 Sakit (S)</span>
            <HeartPulse size={15} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-800">{summary.sakit}</span>
            <span className="text-[10px] text-amber-600 font-bold">anak</span>
          </div>
        </div>

        {/* Izin */}
        <div className="bg-blue-50/70 p-3.5 rounded-3xl border border-blue-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-blue-700 uppercase">🔵 Izin (I)</span>
            <FileText size={15} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-800">{summary.izin}</span>
            <span className="text-[10px] text-blue-600 font-bold">anak</span>
          </div>
        </div>

        {/* Alpa */}
        <div className="bg-rose-50/70 p-3.5 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-rose-700 uppercase">🔴 Alpa (A)</span>
            <XCircle size={15} className="text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-800">{summary.alpa}</span>
            <span className="text-[10px] text-rose-600 font-bold">anak</span>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-orange-50/70 p-3.5 rounded-3xl border border-orange-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-orange-700 uppercase">🟠 Telat (T)</span>
            <Clock size={15} className="text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-orange-800">{summary.terlambat}</span>
            <span className="text-[10px] text-orange-600 font-bold">anak</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Checklist Table */}
      {displayedStudents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-700">Tidak ada siswa ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1">
            Silakan pilih kelas lain atau periksa kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Table Header Info */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  Daftar Presensi: {formatClassLabel(selectedClass, true)}
                </span>
                <span className="bg-indigo-100 text-indigo-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  {displayedStudents.length} Siswa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanggal: <strong className="text-slate-800">{selectedDate}</strong> &bull; Klik salah satu tombol status <strong className="text-emerald-700">H</strong>, <strong className="text-amber-700">S</strong>, <strong className="text-blue-700">I</strong>, <strong className="text-rose-700">A</strong>, atau <strong className="text-orange-700">T</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Petunjuk:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                H = Hadir
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                S = Sakit
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                I = Izin
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                A = Alpa
              </span>
            </div>
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 min-w-[220px]">Nama Siswa & Foto</th>
                  <th className="py-3 px-3 text-center w-16">L/P</th>
                  <th className="py-3 px-4 min-w-[320px] text-center">Status Kehadiran (Tinggal Klik)</th>
                  <th className="py-3 px-4 min-w-[200px]">Catatan / Keterangan</th>
                  <th className="py-3 px-3 text-center w-24 no-print">Notif WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {displayedStudents.map((student, idx) => {
                  const item = attendanceMap[student.id] || { status: '', note: '', time: '' };
                  const currentStatus = item.status;

                  return (
                    <tr 
                      key={student.id || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        currentStatus === 'S' ? 'bg-amber-50/30' :
                        currentStatus === 'I' ? 'bg-blue-50/30' :
                        currentStatus === 'A' ? 'bg-rose-50/30' :
                        currentStatus === 'T' ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Nama & Foto */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <StudentPhoto student={student} size="md" />
                          <div>
                            {(() => {
                              const eff = getStudentEffectiveGroup(student);
                              const isNotScheduledToday = dayInfo.scheduledShift !== 'Semua' && eff.group !== dayInfo.scheduledShift;

                              return (
                                <>
                                  <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>{student.name}</span>
                                    {isNotScheduledToday && (
                                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                        Bukan Jadwal Hari Ini
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                    <span>NISN: {student.nisn || (student as any).NISN || '-'}</span>
                                    <span>&bull;</span>
                                    <span>NIS: {student.nis || '-'}</span>
                                  </div>
                                  {/* Interactive Shift & Verification Badge */}
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setVerifyingStudent(student)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer hover:opacity-85 transition border ${
                                        eff.group === 'Aktif Bekerja'
                                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                                          : eff.statusLabel === 'Menunggu Verifikasi Bukti'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                      }`}
                                      title="Klik untuk verifikasi surat/bukti bekerja dan atur shift belajar"
                                    >
                                      {eff.group === 'Aktif Bekerja' ? <Moon size={10} className="text-indigo-600" /> : <Sun size={10} className="text-blue-600" />}
                                      <span>{eff.scheduleLabel}</span>
                                      {eff.isVerified && <CheckCircle2 size={10} className="text-emerald-600" />}
                                      <span className="text-[9px] underline ml-0.5 text-slate-500">Verifikasi</span>
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                          student.gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {student.gender || 'L'}
                        </span>
                      </td>

                      {/* Interactive Buttons (H, S, I, A, T) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          {/* HADIR (H) */}
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'H')}
                            className={`flex-1 max-w-[70px] py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                              currentStatus === 'H'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-1 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title="Tandai Hadir"
                          >
                            <CheckCircle2 size={14} className={currentStatus === 'H' ? 'text-white' : 'text-slate-400'} />
                            <span>H</span>
                          </button>

                          {/* SAKIT (S) */}
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'S')}
                            className={`flex-1 max-w-[70px] py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                              currentStatus === 'S'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-500 ring-offset-1 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                            title="Tandai Sakit"
                          >
                            <HeartPulse size={14} className={currentStatus === 'S' ? 'text-white' : 'text-slate-400'} />
                            <span>S</span>
                          </button>

                          {/* IZIN (I) */}
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'I')}
                            className={`flex-1 max-w-[70px] py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                              currentStatus === 'I'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-600 ring-offset-1 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-800'
                            }`}
                            title="Tandai Izin"
                          >
                            <FileText size={14} className={currentStatus === 'I' ? 'text-white' : 'text-slate-400'} />
                            <span>I</span>
                          </button>

                          {/* ALPA (A) */}
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'A')}
                            className={`flex-1 max-w-[70px] py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                              currentStatus === 'A'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-600 ring-offset-1 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                            }`}
                            title="Tandai Alpa / Tanpa Keterangan"
                          >
                            <XCircle size={14} className={currentStatus === 'A' ? 'text-white' : 'text-slate-400'} />
                            <span>A</span>
                          </button>

                          {/* TERLAMBAT (T) */}
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'T')}
                            className={`flex-1 max-w-[70px] py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                              currentStatus === 'T'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-200 ring-2 ring-orange-500 ring-offset-1 scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-800'
                            }`}
                            title="Tandai Terlambat"
                          >
                            <Clock size={14} className={currentStatus === 'T' ? 'text-white' : 'text-slate-400'} />
                            <span>T</span>
                          </button>
                        </div>
                      </td>

                      {/* Catatan / Keterangan */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => handleSetStudentNote(student.id, e.target.value)}
                          placeholder={
                            currentStatus === 'S' ? 'Alasan sakit (contoh: Demam)...' :
                            currentStatus === 'I' ? 'Alasan izin (contoh: Acara keluarga)...' :
                            currentStatus === 'A' ? 'Tanpa surat keterangan' :
                            currentStatus === 'T' ? 'Menit terlambat...' : 'Catatan opsional...'
                          }
                          className={`w-full px-3 py-1.5 rounded-xl text-xs border transition ${
                            currentStatus !== 'H' 
                              ? 'bg-white border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 focus:bg-white'
                          }`}
                        />
                      </td>

                      {/* Notifikasi WhatsApp */}
                      <td className="py-3.5 px-3 text-center no-print">
                        <button
                          type="button"
                          onClick={() => sendWhatsAppNotification(student)}
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            currentStatus !== 'H'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-300'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          title={`Kirim pemberitahuan WA ke orang tua ${student.name}`}
                        >
                          <Send size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Save Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-slate-500 font-medium">
              💡 <em>Tips:</em> Klik langsung tombol <strong>H</strong>, <strong>S</strong>, atau <strong>I</strong> pada setiap siswa. Siswa tanpa klik otomatis tercatat Alpa saat disimpan.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleInitiateSave}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Save size={16} />
                <span>Simpan Presensi Kelas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Berita Acara Presensi Harian (Appears on Print) */}
      <div className="hidden print:block printable-container text-black font-sans text-xs">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-base font-black uppercase tracking-tight">BERITA ACARA & DAFTAR PRESENSI HARIAN KELAS</h1>
          <h2 className="text-xs font-bold text-slate-900 mt-0.5">
            {(settings.schoolName || settings.appName || 'SEKOLAH').toUpperCase()} &bull; TAHUN PELAJARAN {settings.tahunPelajaran || '2026/2027'}
          </h2>
          <div className="text-[11px] font-semibold text-slate-700 mt-1 flex justify-center gap-6">
            <span><strong>Kelas / Rombel:</strong> {formatClassLabel(selectedClass, true)}</span>
            <span><strong>Hari / Tanggal:</strong> {selectedDate}</span>
            <span><strong>Sesi:</strong> {sessionName}</span>
          </div>
        </div>

        {/* Summary Table */}
        <div className="mb-4 flex justify-between items-center text-xs">
          <div><strong>Total Siswa Terdaftar:</strong> {summary.total} Siswa</div>
          <div><strong>Hadir (H):</strong> {summary.hadir} ({summary.hadirPercentage}%)</div>
          <div><strong>Sakit (S):</strong> {summary.sakit}</div>
          <div><strong>Izin (I):</strong> {summary.izin}</div>
          <div><strong>Alpa (A):</strong> {summary.alpa}</div>
          <div><strong>Terlambat (T):</strong> {summary.terlambat}</div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-1 text-center w-8 font-bold">No</th>
              <th className="border border-black p-1 text-center w-24 font-bold">NISN</th>
              <th className="border border-black p-1 text-left font-bold">Nama Siswa</th>
              <th className="border border-black p-1 text-center w-10 font-bold">L/P</th>
              <th className="border border-black p-1 text-center w-16 font-bold">Status</th>
              <th className="border border-black p-1 text-left font-bold">Keterangan / Alasan</th>
            </tr>
          </thead>
          <tbody>
            {classStudents.map((s, idx) => {
              const item = attendanceMap[s.id] || { status: 'H', note: '' };
              const statusName: Record<string, string> = { H: 'HADIR', S: 'SAKIT', I: 'IZIN', A: 'ALPA', T: 'TERLAMBAT' };
              return (
                <tr key={s.id || idx}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-mono">{s.nisn || (s as any).NISN || s.nis || '-'}</td>
                  <td className="border border-black p-1 font-bold uppercase">{s.name}</td>
                  <td className="border border-black p-1 text-center">{s.gender || 'L'}</td>
                  <td className="border border-black p-1 text-center font-black">{statusName[item.status] || 'HADIR'}</td>
                  <td className="border border-black p-1">{item.note || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature Area */}
        <div className="mt-8 grid grid-cols-2 text-center text-xs break-inside-avoid">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-black underline">{kepsek?.name || settings.headmasterName || 'Kepala Sekolah'}</p>
            <p className="text-[10px]">NIP: {kepsek?.nip || settings.headmasterNip || '-'}</p>
          </div>
          <div>
            <p>Dibuat Pada: {selectedDate}</p>
            <p className="font-bold">Wali Kelas {formatClassLabel(selectedClass, false)}</p>
            <div className="h-16"></div>
            <p className="font-black underline">{waliKelas?.name || 'Wali Kelas'}</p>
            <p className="text-[10px]">NIP: {waliKelas?.nip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Berita Acara & WhatsApp Modal */}
      <BeritaAcaraModal
        isOpen={showBeritaAcaraModal}
        onClose={() => setShowBeritaAcaraModal(false)}
        selectedClass={selectedClass}
        selectedDate={selectedDate}
        sessionName={sessionName}
        classStudents={classStudents}
        attendanceMap={attendanceMap}
        summary={summary}
        waliKelas={waliKelas}
        kepsek={kepsek}
        settings={settings}
      />

      {/* Pop-up Modal 1: Tinjau & Konfirmasi Simpan Presensi (Menampilkan Siswa Hadir, Izin, Sakit & Opsi Timpa) */}
      {saveReviewModal && saveReviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header Icon & Title */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  saveReviewModal.isAlreadySaved 
                    ? 'bg-amber-100 border border-amber-200 text-amber-700' 
                    : 'bg-indigo-100 border border-indigo-200 text-indigo-700'
                }`}>
                  {saveReviewModal.isAlreadySaved ? (
                    <AlertTriangle size={26} className="stroke-[2.5]" />
                  ) : (
                    <Save size={26} className="stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border ${
                      saveReviewModal.isAlreadySaved 
                        ? 'bg-amber-100 text-amber-800 border-amber-200' 
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    }`}>
                      {saveReviewModal.isAlreadySaved ? 'PERINGATAN: DATA SUDAH ADA' : 'KONFIRMASI PRESENSI'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {saveReviewModal.className}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-snug">
                    {saveReviewModal.isAlreadySaved 
                      ? 'Timpa Data Presensi Sebelumnya?' 
                      : 'Konfirmasi Simpan Data Presensi'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tanggal: <strong className="text-slate-800">{saveReviewModal.formattedDate}</strong> &bull; Total Siswa: <strong className="text-slate-800">{saveReviewModal.total} Siswa</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaveReviewModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Overwrite Alert Banner if already saved */}
            {saveReviewModal.isAlreadySaved ? (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300/80 text-xs text-amber-950 flex items-start gap-3 flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-black text-amber-900 text-sm">
                    Data Presensi Kelas Ini Sudah Pernah Disimpan!
                  </div>
                  <p className="leading-relaxed">
                    Sistem mendeteksi ada <strong>{saveReviewModal.existingCount} data presensi</strong> untuk kelas <strong>{saveReviewModal.className}</strong> pada tanggal <strong>{saveReviewModal.formattedDate}</strong>.
                  </p>
                  <p className="font-bold text-amber-900">
                    Menyimpan kembali sekarang akan <u>MENIMPA (OVERWRITE)</u> data sebelumnya dengan daftar kehadiran di bawah ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5 flex-shrink-0">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  Silakan periksa kembali daftar siswa yang <strong>Hadir</strong>, <strong>Izin</strong>, <strong>Sakit</strong>, dan <strong>Alpa</strong> sebelum disimpan ke database.
                </div>
              </div>
            )}

            {/* Student Lists Breakdown (Scrollable) */}
            <div className="space-y-3 overflow-y-auto max-h-[45vh] pr-1">
              {/* 1. HADIR LIST */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                      1. Siswa Hadir (H)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-black text-xs">
                    {saveReviewModal.hadirList.length} Siswa
                  </span>
                </div>
                {saveReviewModal.hadirList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {saveReviewModal.hadirList.map((s, idx) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-2xs">
                        <span className="text-emerald-500 font-bold text-[10px]">{idx + 1}.</span>
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700/70 italic">Tidak ada siswa berstatus Hadir.</p>
                )}
              </div>

              {/* 2. SAKIT LIST */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wide">
                      2. Siswa Sakit (S)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-black text-xs">
                    {saveReviewModal.sakitList.length} Siswa
                  </span>
                </div>
                {saveReviewModal.sakitList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {saveReviewModal.sakitList.map((s, idx) => (
                      <div key={s.id} className="p-2 bg-white rounded-xl border border-amber-200 text-xs shadow-2xs">
                        <div className="font-bold text-amber-950 flex items-center gap-1.5">
                          <span className="text-amber-600 font-black text-[10px]">{idx + 1}.</span>
                          {s.name}
                        </div>
                        {s.note ? (
                          <div className="text-[11px] text-amber-800 mt-0.5 italic">
                            Keterangan: &ldquo;{s.note}&rdquo;
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Surat / Keterangan belum diisi</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700/70 italic">Tidak ada siswa berstatus Sakit.</p>
                )}
              </div>

              {/* 3. IZIN LIST */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-xs font-black text-blue-900 uppercase tracking-wide">
                      3. Siswa Izin (I)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-black text-xs">
                    {saveReviewModal.izinList.length} Siswa
                  </span>
                </div>
                {saveReviewModal.izinList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {saveReviewModal.izinList.map((s, idx) => (
                      <div key={s.id} className="p-2 bg-white rounded-xl border border-blue-200 text-xs shadow-2xs">
                        <div className="font-bold text-blue-950 flex items-center gap-1.5">
                          <span className="text-blue-600 font-black text-[10px]">{idx + 1}.</span>
                          {s.name}
                        </div>
                        {s.note ? (
                          <div className="text-[11px] text-blue-800 mt-0.5 italic">
                            Alasan: &ldquo;{s.note}&rdquo;
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Alasan izin belum dicatat</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700/70 italic">Tidak ada siswa berstatus Izin.</p>
                )}
              </div>

              {/* 4. ALPA / TANPA KETERANGAN */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-black text-rose-900 uppercase tracking-wide">
                      4. Siswa Alpa / Belum Dipresensi (A)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-200/80 text-rose-900 font-black text-xs">
                    {saveReviewModal.alpaList.length} Siswa
                  </span>
                </div>
                {saveReviewModal.alpaList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {saveReviewModal.alpaList.map((s, idx) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-900 text-xs font-semibold shadow-2xs">
                        <span className="text-rose-500 font-bold text-[10px]">{idx + 1}.</span>
                        {s.name}
                        {s.isAuto && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 font-bold">
                            Otomatis
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-rose-700/70 italic">Tidak ada siswa berstatus Alpa.</p>
                )}
              </div>

              {/* 5. TERLAMBAT LIST (IF ANY) */}
              {saveReviewModal.terlambatList.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span className="text-xs font-black text-orange-900 uppercase tracking-wide">
                        5. Siswa Terlambat (T)
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-200/80 text-orange-900 font-black text-xs">
                      {saveReviewModal.terlambatList.length} Siswa
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {saveReviewModal.terlambatList.map((s, idx) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-orange-200 text-orange-900 text-xs font-semibold shadow-2xs">
                        <span className="text-orange-500 font-bold text-[10px]">{idx + 1}.</span>
                        {s.name}
                        {s.note && <span className="text-slate-500 text-[10px]">({s.note})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSaveReviewModal(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer"
              >
                Batal / Periksa Kembali
              </button>

              <button
                type="button"
                onClick={handleConfirmExecuteSave}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition active:scale-95 cursor-pointer ${
                  saveReviewModal.isAlreadySaved
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {saveReviewModal.isAlreadySaved ? (
                  <>
                    <RefreshCw size={16} />
                    <span>Ya, Timpa Data & Simpan Presensi</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Ya, Simpan Presensi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Modal: Absensi Tanggal ... Telah Disimpan */}
      {saveConfirmationModal && saveConfirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-xs">
                  <CheckCircle2 size={30} className="stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    BERHASIL DISIMPAN
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-snug">
                    Absensi Tanggal {saveConfirmationModal.formattedDate} Telah Disimpan!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Kelas: <strong className="text-slate-800">{saveConfirmationModal.className}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaveConfirmationModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Auto Alpa Notice */}
            {saveConfirmationModal.summary.autoAlpaCount > 0 && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Mode Ringkas Diterapkan:</span> Sebanyak <strong>{saveConfirmationModal.summary.autoAlpaCount} siswa</strong> yang tidak diklik apa-apa otomatis dicatat sebagai <strong>Alpa (A)</strong>.
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-700 uppercase block">Hadir</span>
                <span className="text-lg font-black text-emerald-900">{saveConfirmationModal.summary.hadir}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-black text-amber-700 uppercase block">Sakit</span>
                <span className="text-lg font-black text-amber-900">{saveConfirmationModal.summary.sakit}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-black text-blue-700 uppercase block">Izin</span>
                <span className="text-lg font-black text-blue-900">{saveConfirmationModal.summary.izin}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-black text-rose-700 uppercase block">Alpa</span>
                <span className="text-lg font-black text-rose-900">{saveConfirmationModal.summary.alpa}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200">
                <span className="text-[10px] font-black text-orange-700 uppercase block">Telat</span>
                <span className="text-lg font-black text-orange-900">{saveConfirmationModal.summary.terlambat}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={() => {
                  setSaveConfirmationModal(null);
                  setShowBeritaAcaraModal(true);
                }}
                className="w-full sm:flex-1 py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-2xl border border-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Send size={15} />
                <span>Kirim Berita Acara (WA)</span>
              </button>

              <button
                onClick={() => setSaveConfirmationModal(null)}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCheck size={16} />
                <span>Selesai / Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Verifikasi Status Bekerja & Shift Modal */}
      <VerifikasiKerjaModal
        isOpen={Boolean(verifyingStudent)}
        student={verifyingStudent}
        onClose={() => setVerifyingStudent(null)}
        onSaved={(updated) => {
          setVerifyingStudent(null);
          setSaveSuccessMsg(`Status kerja & shift ${updated.name} berhasil diperbarui.`);
          setTimeout(() => setSaveSuccessMsg(null), 3000);
        }}
      />
    </div>
  );
}
