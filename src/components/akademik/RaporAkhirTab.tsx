import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getActiveClasses, getAllClasses, matchClass, matchStatusActive, formatClassLabel, sortStudentsByStatusAndName, getStatusPriority, triggerPrint } from '../../lib/utils';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { getSemestersList, getActiveSemester, SemesterEntity } from '../../lib/semester';
import { exportToExcel } from '../../lib/excel';
import { 
  FileSpreadsheet, Printer, Search, Filter, Sparkles, 
  Award, CheckCircle2, UserCheck, BookOpen, Layers, Check, School, Calendar,
  ToggleLeft, ToggleRight, Calculator
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export interface SubjectGradeDetail {
  mapel: string;
  formatif: number | null;
  sts: number | null;
  sas: number | null;
  nilaiAkhir: number | null;
  predikat: 'A' | 'B' | 'C' | 'D' | '-';
  capaianKompetensi: string;
}

export default function RaporAkhirTab() {
  const { students, teachers, settings } = useStore();
  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const classesList = useMemo(() => {
    return getAllClasses(activeStudents);
  }, [activeStudents]);

  const semestersList = useMemo(() => getSemestersList(), []);
  const initialActiveSemester = useMemo(() => getActiveSemester(settings.tahunPelajaran), [settings.tahunPelajaran]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(initialActiveSemester.id);
  const [showDetailedScores, setShowDetailedScores] = useState<boolean>(true);

  useEffect(() => {
    const active = getActiveSemester(settings.tahunPelajaran);
    if (active && active.id) {
      setSelectedSemesterId(active.id);
    }
    const handleSemChange = (e: any) => {
      if (e.detail?.id) {
        setSelectedSemesterId(e.detail.id);
      }
    };
    window.addEventListener('academic-semester-changed', handleSemChange);
    return () => window.removeEventListener('academic-semester-changed', handleSemChange);
  }, [settings.tahunPelajaran, settings.semester]);

  const currentSemesterObj = useMemo(() => {
    return semestersList.find(s => s.id === selectedSemesterId) || initialActiveSemester;
  }, [semestersList, selectedSemesterId, initialActiveSemester]);

  const selectedSemester = currentSemesterObj.semesterType;
  const [selectedClass, setSelectedClass] = useState<string>(classesList[0] || '1');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  // Sync Mata Pelajaran with sheet MAPEL for the selected class
  const classMapelList = useMemo(() => {
    return getMapelNamesForClass(selectedClass);
  }, [selectedClass]);

  // Students in class sorted by Status: Aktif -> Tidak Aktif -> Belum (Excludes Pindah, Lulus, Keluar)
  const classStudents = useMemo(() => {
    if (!activeStudents) return [];
    const filtered = activeStudents.filter(s => {
      if (!s) return false;
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
  }, [activeStudents, selectedClass, statusFilter]);

  // Selected Student
  const currentStudent = useMemo(() => {
    return classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || activeStudents[0];
  }, [classStudents, selectedStudentId, activeStudents]);

  // Wali Kelas & Kepsek
  const waliKelas = useMemo(() => {
    return teachers.find(t => matchClass(t.class, selectedClass)) || teachers[0];
  }, [teachers, selectedClass]);

  const kepsek = useMemo(() => {
    return teachers.find(t => t.class === 'Kepala Sekolah' || (t.class && t.class.toLowerCase().includes('kepala'))) || {
      name: settings.headmasterName || 'Kepala Sekolah',
      nip: settings.headmasterNip || '-'
    };
  }, [teachers, settings]);

  const [dbRefreshKey, setDbRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setDbRefreshKey(prev => prev + 1);
    window.addEventListener('erp-db-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  // Stored grades map and master grades list
  const gradesMap = useMemo(() => {
    return (db.get('nilai_akademik_map') as any) || {};
  }, [dbRefreshKey]);

  const masterNilaiList = useMemo(() => {
    return (db.get('nilai') as any[]) || [];
  }, [dbRefreshKey]);

  const absensiList = useMemo(() => {
    return (db.get('absensi') as any[]) || [];
  }, [dbRefreshKey]);

  // Real attendance counts for a student
  const getStudentAbsence = (student: any) => {
    if (!student) return { sakit: 0, izin: 0, alpa: 0 };
    const sName = String(student.name || '').trim().toLowerCase();
    const records = absensiList.filter((a: any) => 
      a.studentId === student.id || 
      (student.nisn && a.nisn === student.nisn) || 
      (a.name && String(a.name).trim().toLowerCase() === sName)
    );
    const sakit = records.filter((a: any) => a.status === 'S' || a.status === 'Sakit').length;
    const izin = records.filter((a: any) => a.status === 'I' || a.status === 'Izin').length;
    const alpa = records.filter((a: any) => a.status === 'A' || a.status === 'Alpa' || a.status === 'Tanpa Keterangan').length;
    return { sakit, izin, alpa };
  };

  const studentAbsence = useMemo(() => {
    return getStudentAbsence(currentStudent);
  }, [absensiList, currentStudent]);

  // Comprehensive Grade Lookup (queries nilai_akademik_map + sheet NILAI + auto calculates Formatif & Sumatif)
  const getGradesForStudent = (student: any): SubjectGradeDetail[] => {
    if (!student) return [];

    return classMapelList.map((mapel) => {
      // 1. Try nilai_akademik_map keys
      const keyId = `${student.id}_${selectedSemester}_${mapel}`;
      const keyNisn = `${student.nisn || student.nis}_${selectedSemester}_${mapel}`;
      const keyName = `${student.name}_${selectedSemester}_${mapel}`;
      const mapSaved = gradesMap[keyId] || gradesMap[keyNisn] || gradesMap[keyName];

      // 2. Try master sheet NILAI
      const masterRecord = masterNilaiList.find((m: any) => {
        const matchS = m.SiswaID === student.id || (student.nisn && m.NISN === student.nisn) || (m.NamaSiswa && m.NamaSiswa.toLowerCase() === student.name?.toLowerCase());
        const matchM = m.Mapel === mapel || m.mataPelajaran === mapel;
        const matchSem = !m.Semester || m.Semester === selectedSemester;
        return matchS && matchM && matchSem;
      });

      // Extract Formatif (TP), STS, SAS, and NA
      let formatif: number | null = null;
      let sts: number | null = null;
      let sas: number | null = null;
      let na: number | null = null;
      let descTinggi = '';
      let descRendah = '';

      if (mapSaved) {
        if (typeof mapSaved.rataFormatif === 'number') formatif = mapSaved.rataFormatif;
        if (typeof mapSaved.sts === 'number') sts = mapSaved.sts;
        if (typeof mapSaved.sas === 'number') sas = mapSaved.sas;
        if (typeof mapSaved.nilaiAkhir === 'number') na = mapSaved.nilaiAkhir;
        descTinggi = mapSaved.deskripsiTinggi || '';
        descRendah = mapSaved.deskripsiRendah || '';
      }

      if (masterRecord) {
        if (formatif === null && typeof masterRecord.NilaiFormatif_TP === 'number') formatif = masterRecord.NilaiFormatif_TP;
        if (sts === null && typeof masterRecord.NilaiUTS_STS === 'number') sts = masterRecord.NilaiUTS_STS;
        if (sas === null && typeof masterRecord.NilaiUAS_SAS === 'number') sas = masterRecord.NilaiUAS_SAS;
        if (na === null && typeof (masterRecord.NilaiAkhir || masterRecord.NilaiAngka) === 'number') {
          na = masterRecord.NilaiAkhir || masterRecord.NilaiAngka;
        }
        if (!descTinggi && masterRecord.CapaianKompetensi) {
          descTinggi = masterRecord.CapaianKompetensi;
        }
      }

      // Automatic Kurikulum Merdeka NA calculation if formative or sumative present but NA missing
      if (na === null && (formatif !== null || sts !== null || sas !== null)) {
        const fVal = formatif ?? 75;
        const sVal = sts ?? fVal;
        const aVal = sas ?? fVal;
        // Formula: 40% Formatif + 30% STS + 30% SAS
        na = Math.round((fVal * 0.4) + (sVal * 0.3) + (aVal * 0.3));
      }

      // Predikat calculation
      let predikat: 'A' | 'B' | 'C' | 'D' | '-' = '-';
      if (na !== null) {
        if (na >= 90) predikat = 'A';
        else if (na >= 80) predikat = 'B';
        else if (na >= 70) predikat = 'C';
        else predikat = 'D';
      }

      // Capaian Kompetensi text
      let capaianKompetensi = `${descTinggi} ${descRendah}`.trim();
      if (!capaianKompetensi) {
        if (na !== null) {
          capaianKompetensi = na >= 80
            ? `Menunjukkan pemahaman yang sangat baik dalam memahami dan menerapkan capaian pembelajaran ${mapel}.`
            : na >= 70
            ? `Menunjukkan penguasaan materi ${mapel} yang memadai, perlu pendampingan pada tujuan pembelajaran tertentu.`
            : `Perlu peningkatan dan pendampingan remedial intensif pada materi kompetensi ${mapel}.`;
        } else {
          capaianKompetensi = `Menunjukkan partisipasi aktif dalam pembelajaran ${mapel} sesuai standar Kurikulum Merdeka.`;
        }
      }

      return {
        mapel,
        formatif,
        sts,
        sas,
        nilaiAkhir: na,
        predikat,
        capaianKompetensi
      };
    });
  };

  const studentGrades = useMemo(() => {
    return getGradesForStudent(currentStudent);
  }, [currentStudent, selectedSemester, gradesMap, masterNilaiList, classMapelList]);

  const gradedOnly = useMemo(() => {
    return studentGrades.filter(g => g.nilaiAkhir !== null && typeof g.nilaiAkhir === 'number');
  }, [studentGrades]);

  const averageScore = useMemo(() => {
    if (gradedOnly.length === 0) return null;
    const sum = gradedOnly.reduce((acc, curr) => acc + (curr.nilaiAkhir as number), 0);
    return Math.round(sum / gradedOnly.length);
  }, [gradedOnly]);

  const avgFormatif = useMemo(() => {
    const list = studentGrades.filter(g => g.formatif !== null);
    if (list.length === 0) return null;
    return Math.round(list.reduce((acc, curr) => acc + (curr.formatif as number), 0) / list.length);
  }, [studentGrades]);

  const avgSts = useMemo(() => {
    const list = studentGrades.filter(g => g.sts !== null);
    if (list.length === 0) return null;
    return Math.round(list.reduce((acc, curr) => acc + (curr.sts as number), 0) / list.length);
  }, [studentGrades]);

  const avgSas = useMemo(() => {
    const list = studentGrades.filter(g => g.sas !== null);
    if (list.length === 0) return null;
    return Math.round(list.reduce((acc, curr) => acc + (curr.sas as number), 0) / list.length);
  }, [studentGrades]);

  const handleExportLegerExcel = () => {
    if (classStudents.length === 0) {
      alert("Tidak ada siswa pada rombel ini.");
      return;
    }

    const rows = classStudents.map((s, idx) => {
      const sGrades = getGradesForStudent(s);
      const row: any = {
        No: idx + 1,
        'NIS / NISN': s.nisn || s.nis || '-',
        'Nama Lengkap': s.name,
        'Kelas': formatClassLabel(s.class, true),
        'Status': s.status || 'Aktif',
        'Semester': selectedSemester,
      };

      let totalNA = 0;
      let gradedCount = 0;

      sGrades.forEach(g => {
        row[`${g.mapel} (Formatif)`] = g.formatif !== null ? g.formatif : '';
        row[`${g.mapel} (STS)`] = g.sts !== null ? g.sts : '';
        row[`${g.mapel} (SAS)`] = g.sas !== null ? g.sas : '';
        row[`${g.mapel} (NA)`] = g.nilaiAkhir !== null ? g.nilaiAkhir : '';
        row[`${g.mapel} (Predikat)`] = g.predikat;

        if (typeof g.nilaiAkhir === 'number') {
          totalNA += g.nilaiAkhir;
          gradedCount++;
        }
      });

      row['Total Nilai Akhir'] = totalNA;
      row['Rata-Rata Rapor'] = gradedCount > 0 ? (totalNA / gradedCount).toFixed(1) : '-';

      // Absensi
      const studentAbs = absensiList.filter((a: any) => a.studentId === s.id);
      row['Sakit (S)'] = studentAbs.filter((a: any) => a.status === 'S' || a.status === 'Sakit').length;
      row['Izin (I)'] = studentAbs.filter((a: any) => a.status === 'I' || a.status === 'Izin').length;
      row['Alpa (A)'] = studentAbs.filter((a: any) => a.status === 'A' || a.status === 'Alpa' || a.status === 'Tanpa Keterangan').length;

      return row;
    });

    exportToExcel(rows, `Leger_Rapor_Formatif_Sumatif_${selectedClass}_${selectedSemester}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintBatch = () => {
    if (classStudents.length === 0) {
      alert("Tidak ada siswa pada rombel terpilih untuk dicetak.");
      return;
    }
    setIsBatchPrinting(true);
    setTimeout(() => {
      triggerPrint();
      const cleanup = () => {
        setIsBatchPrinting(false);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, 8000);
    }, 150);
  };

  const handlePrintSingle = () => {
    if (!currentStudent) {
      alert("Silakan pilih peserta didik yang akan dicetak rapornya.");
      return;
    }
    setIsBatchPrinting(false);
    setTimeout(() => {
      triggerPrint();
    }, 100);
  };

  const renderSingleReport = (student: any) => {
    const grades = getGradesForStudent(student);
    const validGrades = grades.filter(g => g.nilaiAkhir !== null && typeof g.nilaiAkhir === 'number');
    const avg = validGrades.length > 0 ? Math.round(validGrades.reduce((a, b) => a + (b.nilaiAkhir as number), 0) / validGrades.length) : null;
    const absence = getStudentAbsence(student);

    return (
      <div key={student.id} className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-slate-200 shadow-md space-y-6 text-slate-900 printable-card page-break-after">
        {/* Header Kop Resmi */}
        <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
            PEMERINTAH KABUPATEN / KOTA DINAS PENDIDIKAN
          </h3>
          <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
            {settings.schoolName || 'SISTEM INFORMASI AKADEMIK & RAPOR MERDEKA'}
          </h2>
          <p className="text-[11px] text-slate-600">
            {settings.schoolAddress || 'Jl. Pendidikan Nasional, Kompleks Pembelajaran'} | NPSN: {settings.schoolNpsn || '10293847'}
          </p>
          <div className="pt-2">
            <span className="px-4 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-black uppercase tracking-wider">
              LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR KURIKULUM MERDEKA)
            </span>
          </div>
        </div>

        {/* Student Identitas Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-b border-slate-200 pb-4 font-medium">
          <div className="flex">
            <span className="w-32 text-slate-500">Nama Peserta Didik</span>
            <span className="w-4 font-bold">:</span>
            <span className="font-black text-slate-900">{student.name}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500">Kelas / Rombel</span>
            <span className="w-4 font-bold">:</span>
            <span className="font-bold text-slate-900">{formatClassLabel(student.class, true)}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500">NIS / NISN</span>
            <span className="w-4 font-bold">:</span>
            <span className="font-mono text-slate-800">{student.nis || '-'} / {student.nisn || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500">Fase Kurikulum</span>
            <span className="w-4 font-bold">:</span>
            <span className="font-bold text-slate-800">
              {parseInt(student.class || '1') <= 2 ? 'Fase A' : parseInt(student.class || '1') <= 4 ? 'Fase B' : parseInt(student.class || '1') <= 6 ? 'Fase C' : parseInt(student.class || '1') <= 9 ? 'Fase D' : 'Fase E/F'}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500">Nama Sekolah</span>
            <span className="w-4 font-bold">:</span>
            <span className="text-slate-800">{settings.schoolName || 'SISTEM AKADEMIK MERDEKA'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500">Semester / Tahun</span>
            <span className="w-4 font-bold">:</span>
            <span className="font-bold text-indigo-900">{currentSemesterObj.name} / {currentSemesterObj.tahunPelajaran}</span>
          </div>
        </div>

        {/* Nilai & Capaian Belajar Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
              A. Laporan Capaian Kompetensi Intrakurikuler (Kalkulasi Formatif & Sumatif)
            </h4>
            <span className="text-[10px] font-mono text-slate-500 no-print">
              Bobot Kurikulum: Formatif 40% + Sumatif STS 30% + Sumatif SAS 30%
            </span>
          </div>
          
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                <th className="p-2 text-center w-8 border-r border-slate-300" rowSpan={2}>No</th>
                <th className="p-2 w-44 border-r border-slate-300" rowSpan={2}>Mata Pelajaran</th>
                {showDetailedScores && (
                  <>
                    <th className="p-1.5 text-center w-16 border-r border-slate-300" title="Rata-rata Nilai Formatif / Tugas">Formatif</th>
                    <th className="p-1.5 text-center w-14 border-r border-slate-300" title="Sumatif Tengah Semester">STS</th>
                    <th className="p-1.5 text-center w-14 border-r border-slate-300" title="Sumatif Akhir Semester">SAS</th>
                  </>
                )}
                <th className="p-2 text-center w-16 border-r border-slate-300" rowSpan={2}>Nilai Akhir</th>
                <th className="p-2 text-center w-12 border-r border-slate-300" rowSpan={2}>Predikat</th>
                <th className="p-2" rowSpan={2}>Capaian Kompetensi Pembelajaran</th>
              </tr>
              {showDetailedScores && (
                <tr className="bg-slate-50 text-[10px] text-slate-600 font-bold border-b border-slate-300">
                  <th className="p-1 text-center border-r border-slate-300">(TP 1-10)</th>
                  <th className="p-1 text-center border-r border-slate-300">(Mid)</th>
                  <th className="p-1 text-center border-r border-slate-300">(Akhir)</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {grades.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-2 text-center font-mono font-bold text-slate-600 border-r border-slate-300">{idx + 1}</td>
                  <td className="p-2 font-bold text-slate-900 border-r border-slate-300">{g.mapel}</td>
                  {showDetailedScores && (
                    <>
                      <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-300 bg-slate-50/40">
                        {g.formatif !== null ? g.formatif : '-'}
                      </td>
                      <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-300 bg-slate-50/40">
                        {g.sts !== null ? g.sts : '-'}
                      </td>
                      <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-300 bg-slate-50/40">
                        {g.sas !== null ? g.sas : '-'}
                      </td>
                    </>
                  )}
                  <td className="p-2 text-center font-mono font-black text-xs text-indigo-950 border-r border-slate-300 bg-indigo-50/40">
                    {g.nilaiAkhir !== null ? g.nilaiAkhir : '-'}
                  </td>
                  <td className="p-2 text-center font-bold text-xs border-r border-slate-300">
                    <span className={`px-1.5 py-0.5 rounded font-black ${
                      g.predikat === 'A' ? 'text-emerald-700' :
                      g.predikat === 'B' ? 'text-blue-700' :
                      g.predikat === 'C' ? 'text-amber-700' : 'text-slate-600'
                    }`}>
                      {g.predikat}
                    </span>
                  </td>
                  <td className="p-2 text-[10.5px] text-slate-700 leading-relaxed">
                    {g.capaianKompetensi}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                <td colSpan={2} className="p-2 text-right border-r border-slate-300">Rata-Rata Rapor:</td>
                {showDetailedScores && (
                  <>
                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-300">
                      {avgFormatif !== null ? avgFormatif : '-'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-300">
                      {avgSts !== null ? avgSts : '-'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-300">
                      {avgSas !== null ? avgSas : '-'}
                    </td>
                  </>
                )}
                <td className="p-2 text-center font-mono font-black text-xs text-indigo-900 border-r border-slate-300 bg-indigo-100/60">
                  {avg !== null ? avg : '-'}
                </td>
                <td className="p-2 text-center font-bold border-r border-slate-300">
                  {avg !== null ? (avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'D') : '-'}
                </td>
                <td className="p-2 text-[10.5px] text-slate-600">
                  {avg !== null 
                    ? (avg >= 85 ? 'Predikat Sangat Memuaskan (A) - Ketercapaian TP Optimum' : avg >= 75 ? 'Predikat Baik (B) - Ketercapaian TP Tuntas' : 'Perlu Pendampingan Tambahan')
                    : 'Belum ada kalkulasi rata-rata nilai'
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ekstrakurikuler & Presensi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
              B. Kegiatan Ekstrakurikuler
            </h4>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px]">
                  <th className="p-1.5 text-center w-8 border-r border-slate-300">No</th>
                  <th className="p-1.5 border-r border-slate-300">Kegiatan</th>
                  <th className="p-1.5 text-center w-16 border-r border-slate-300">Predikat</th>
                  <th className="p-1.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[10.5px]">
                <tr>
                  <td className="p-1.5 text-center border-r border-slate-300">1</td>
                  <td className="p-1.5 font-bold border-r border-slate-300">Praja Muda Karana (Pramuka)</td>
                  <td className="p-1.5 text-center font-bold text-emerald-700 border-r border-slate-300">Baik</td>
                  <td className="p-1.5 text-slate-600">Aktif mengikuti kegiatan rutin kepanduan</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
              C. Ketidakhadiran Siswa
            </h4>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <tbody className="divide-y divide-slate-200 text-[10.5px]">
                <tr>
                  <td className="p-1.5 font-medium border-r border-slate-300 w-36">Sakit (S)</td>
                  <td className="p-1.5 font-mono font-bold text-center w-16 border-r border-slate-300">{absence.sakit}</td>
                  <td className="p-1.5 text-slate-500">Hari</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-medium border-r border-slate-300">Izin (I)</td>
                  <td className="p-1.5 font-mono font-bold text-center w-16 border-r border-slate-300">{absence.izin}</td>
                  <td className="p-1.5 text-slate-500">Hari</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-medium border-r border-slate-300">Tanpa Keterangan (A)</td>
                  <td className="p-1.5 font-mono font-bold text-center w-16 border-r border-slate-300">{absence.alpa}</td>
                  <td className="p-1.5 text-slate-500">Hari</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Catatan Wali Kelas */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-300 space-y-1 text-xs">
          <span className="font-bold text-slate-800 block">Catatan Wali Kelas:</span>
          <p className="text-slate-700 italic">
            "Ananda {student.name} menunjukkan semangat belajar yang sangat baik, sikap santun, serta kemandirian dalam proses pembelajaran Kurikulum Merdeka. Pertahankan prestasimu!"
          </p>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-3 gap-4 pt-4 text-center text-xs">
          <div className="space-y-10">
            <p className="font-medium text-slate-600">Mengetahui,<br />Orang Tua / Wali Siswa</p>
            <div className="border-b border-slate-800 w-36 mx-auto"></div>
          </div>

          <div className="space-y-10">
            <p className="font-medium text-slate-600">
              {settings?.kota || settings?.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
              Wali {formatClassLabel(student.class, true)}
            </p>
            <div>
              <p className="font-bold text-slate-900 underline">{waliKelas?.name || 'Wali Kelas'}</p>
              <p className="font-mono text-[10px] text-slate-500">NIP. {waliKelas?.nip || '-'}</p>
            </div>
          </div>

          <div className="space-y-10">
            <p className="font-medium text-slate-600">
              Mengetahui,<br />Kepala Sekolah
            </p>
            <div>
              <p className="font-bold text-slate-900 underline">{kepsek?.name || settings.headmasterName || 'Kepala Sekolah'}</p>
              <p className="font-mono text-[10px] text-slate-500">NIP. {kepsek?.nip || settings.headmasterNip || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="printable-area" className="printable-container space-y-6 max-w-5xl mx-auto print:max-w-none print:w-full print:p-0 print:m-0 print:bg-white text-slate-900">
      {/* Control Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Laporan Rapor Belajar Siswa (Kurikulum Merdeka)</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                  <Calculator size={10} className="fill-emerald-600" /> Kalkulasi Otomatis Formatif & Sumatif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kalkulasi otomatis nilai tugas formatif (TP), sumatif tengah semester (STS), dan akhir semester (SAS) menjadi laporan rapor utuh.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowDetailedScores(!showDetailedScores)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                showDetailedScores ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
              title="Tampilkan rincian kolom Formatif dan Sumatif"
            >
              <Layers size={14} />
              <span>{showDetailedScores ? 'Rincian Nilai: Aktif' : 'Rincian: Ringkas'}</span>
            </button>
            <button
              onClick={handleExportLegerExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition active:scale-95 whitespace-nowrap shadow-xs"
              title="Ekspor Leger Nilai ke Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Ekspor Leger Excel</span>
            </button>
            <button
              onClick={handlePrintBatch}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition whitespace-nowrap"
            >
              <Printer size={15} />
              <span>Cetak 1 Kelas ({classStudents.length})</span>
            </button>
            <button
              onClick={handlePrintSingle}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-200 transition active:scale-95 whitespace-nowrap"
            >
              <Printer size={15} />
              <span>Cetak Rapor Ini</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <CustomDropdown
            id="rapor-select-semester"
            label="Semester & Tahun Ajaran"
            value={selectedSemesterId}
            onChange={(val) => setSelectedSemesterId(val)}
            options={semestersList.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.tahunPelajaran})`,
              badge: s.isActive ? '★ Aktif' : undefined
            }))}
            placeholder="Pilih Semester..."
          />

          <CustomDropdown
            id="rapor-select-class"
            label="Pilih Kelas / Rombel"
            value={selectedClass}
            onChange={(val) => {
              setSelectedClass(val);
              setSelectedStudentId('');
            }}
            options={[
              { value: 'ALL', label: '★ Semua Kelas / Rombel' },
              ...classesList.map(c => {
                const count = activeStudents.filter(s => matchClass(s.class, c)).length;
                return {
                  value: c,
                  label: formatClassLabel(c, true),
                  badge: `${count} Siswa`
                };
              })
            ]}
            placeholder="Pilih Kelas..."
            searchable={classesList.length > 5}
          />

          <CustomDropdown
            id="rapor-select-status"
            label="Status Keaktifan Siswa"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'Semua', label: `Semua Siswa Terdaftar (${activeStudents.length})` },
              { value: 'Aktif', label: '✅ 1. Aktif (SISWA Aktif)' },
              { value: 'Tidak Aktif', label: '⚠️ 2. Tidak Aktif (Jarang Masuk)' },
              { value: 'Belum', label: '⏳ 3. Belum (Non-Dapodik)' }
            ]}
            placeholder="Pilih Status..."
          />

          <CustomDropdown
            id="rapor-select-student"
            label="Pilih Peserta Didik"
            value={currentStudent?.id || ''}
            onChange={(val) => setSelectedStudentId(val)}
            options={classStudents.map(s => ({
              value: s.id,
              label: s.name,
              badge: s.nisn ? `NISN: ${s.nisn}` : undefined
            }))}
            placeholder="Pilih Siswa..."
            searchable={classStudents.length > 5}
          />
        </div>
      </div>

      {/* Official Printable Report Card View */}
      <div id="printable-area" className="printable-container printable-document print:w-full print:p-0 print:m-0">
        {isBatchPrinting ? (
          <div className="space-y-8 print:space-y-0">
            {classStudents.map(student => renderSingleReport(student))}
          </div>
        ) : currentStudent ? (
          renderSingleReport(currentStudent)
        ) : (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 no-print">
            <p>Tidak ada data siswa pada filter ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
