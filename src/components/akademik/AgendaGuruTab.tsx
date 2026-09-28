import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getAllClasses, matchClass, formatClassLabel, STANDARD_CLASSES, matchStatusActive, triggerPrint, getTodayDateString } from '../../lib/utils';
import { getSemestersList, getActiveSemester, SemesterEntity } from '../../lib/semester';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { exportToExcel } from '../../lib/excel';
import { 
  BookMarked, Plus, Filter, Search, Calendar, User, 
  Trash2, Edit2, Printer, CheckCircle2, X, Save, Clock,
  FileSpreadsheet, Users, Eye, Check, AlertCircle, ShieldCheck
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export interface AgendaStudentAttendance {
  studentId: string;
  nisn: string;
  name: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  catatan?: string;
}

export interface AgendaItem {
  id: string;
  tanggal: string;
  kelas: string;
  jamKe: string;
  mataPelajaran: string;
  guru: string;
  materiPokok: string;
  capaianTp: string;
  catatanSiswa: string;
  jumlahHadir: number;
  jumlahTidakHadir: number;
  daftarKehadiran?: AgendaStudentAttendance[];
  semester?: string;
  status: 'Terlaksana' | 'Tertunda' | 'Diganti';
}

const DEFAULT_MAPEL = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Seni Musik / Rupa / Tari / Teater',
  'Bahasa Inggris',
  'Informatika',
  'Muatan Lokal / Bahasa Daerah',
  'Bimbingan Konseling (BK)'
];

export default function AgendaGuruTab() {
  const { students, teachers, settings } = useStore();
  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const classesList = useMemo(() => {
    return Array.from(new Set([...getAllClasses(activeStudents), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);

  const semestersList = useMemo(() => getSemestersList(), []);
  const initialActiveSemester = useMemo(() => getActiveSemester(settings.tahunPelajaran), [settings.tahunPelajaran]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(() => initialActiveSemester?.id || 'SEM-2026-1');

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
    return semestersList.find(s => s.id === selectedSemesterId) || initialActiveSemester || {
      id: 'SEM-2026-1',
      code: '2026/2027-1',
      name: 'Semester 1 (Ganjil)',
      tahunPelajaran: settings.tahunPelajaran || '2026/2027',
      semesterType: ((settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Genap' | 'Ganjil'),
      isActive: true,
      startDate: '2026-07-13',
      endDate: '2026-12-19'
    };
  }, [semestersList, selectedSemesterId, initialActiveSemester, settings.tahunPelajaran, settings.semester]);

  const selectedSemester = currentSemesterObj?.semesterType || 'Ganjil';
  const semesterDisplayName = currentSemesterObj?.name || (currentSemesterObj?.semesterType ? `Semester ${currentSemesterObj.semesterType}` : 'Semester 1 (Ganjil)');
  const semesterTahunAjar = currentSemesterObj?.tahunPelajaran || settings?.tahunPelajaran || '2026/2027';
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Persisted Agenda List
  const [agendaList, setAgendaList] = useState<AgendaItem[]>(() => {
    const saved = db.get('agenda_guru');
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [];
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewDetailItem, setViewDetailItem] = useState<AgendaItem | null>(null);
  const [syncToDailyAbsensi, setSyncToDailyAbsensi] = useState(true);

  const [formData, setFormData] = useState<Partial<AgendaItem>>({
    tanggal: getTodayDateString(),
    kelas: classesList[0] || '1',
    jamKe: '1 - 2 (07:30 - 09:00)',
    mataPelajaran: DEFAULT_MAPEL[0],
    guru: teachers[0]?.name || 'Guru Pengampu',
    materiPokok: '',
    capaianTp: '',
    catatanSiswa: '',
    jumlahHadir: 0,
    jumlahTidakHadir: 0,
    semester: 'Ganjil',
    status: 'Terlaksana'
  });

  // Student Attendance list for the currently edited Agenda KBM
  const [studentAttendances, setStudentAttendances] = useState<AgendaStudentAttendance[]>([]);

  // When class changes in form or modal opens, prepare student attendance list
  const studentsInFormClass = useMemo(() => {
    const targetClass = formData.kelas || classesList[0] || '1';
    return activeStudents.filter(s => matchClass(s.class, targetClass));
  }, [activeStudents, formData.kelas, classesList]);

  // Available mapel for form class
  const formMapelOptions = useMemo(() => {
    const classMapels = getMapelNamesForClass(formData.kelas || '1');
    return Array.from(new Set([...classMapels, ...DEFAULT_MAPEL]));
  }, [formData.kelas]);

  const saveAgendaToDb = (newList: AgendaItem[]) => {
    setAgendaList(newList);
    db.set('agenda_guru', newList);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'agenda_guru' } }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const targetClass = selectedClass || classesList[0] || '1';
    const classSts = activeStudents.filter(s => matchClass(s.class, targetClass));
    
    // Auto populate students with default 'Hadir'
    const initialAttendance: AgendaStudentAttendance[] = classSts.map(s => ({
      studentId: s.id,
      nisn: s.nisn || s.nis || '-',
      name: s.name,
      status: 'Hadir',
      catatan: ''
    }));

    setStudentAttendances(initialAttendance);
    setFormData({
      tanggal: getTodayDateString(),
      kelas: targetClass,
      jamKe: '1 - 2 (07:30 - 09:00)',
      mataPelajaran: DEFAULT_MAPEL[0],
      guru: teachers[0]?.name || 'Guru Pengampu',
      materiPokok: '',
      capaianTp: '',
      catatanSiswa: '',
      jumlahHadir: initialAttendance.length,
      jumlahTidakHadir: 0,
      semester: selectedSemester,
      status: 'Terlaksana'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    
    if (item.daftarKehadiran && item.daftarKehadiran.length > 0) {
      setStudentAttendances(item.daftarKehadiran);
    } else {
      const classSts = activeStudents.filter(s => matchClass(s.class, item.kelas));
      const initialAttendance: AgendaStudentAttendance[] = classSts.map(s => ({
        studentId: s.id,
        nisn: s.nisn || s.nis || '-',
        name: s.name,
        status: 'Hadir',
        catatan: ''
      }));
      setStudentAttendances(initialAttendance);
    }
    setModalOpen(true);
  };

  // When class changes in modal form, re-initialize student list if needed
  const handleFormClassChange = (newClass: string) => {
    const classSts = activeStudents.filter(s => matchClass(s.class, newClass));
    const initialAttendance: AgendaStudentAttendance[] = classSts.map(s => ({
      studentId: s.id,
      nisn: s.nisn || s.nis || '-',
      name: s.name,
      status: 'Hadir',
      catatan: ''
    }));
    setStudentAttendances(initialAttendance);
    setFormData(prev => ({
      ...prev,
      kelas: newClass,
      jumlahHadir: initialAttendance.length,
      jumlahTidakHadir: 0
    }));
  };

  // Toggle student status
  const updateStudentStatus = (studentId: string, newStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    const updated = studentAttendances.map(st => st.studentId === studentId ? { ...st, status: newStatus } : st);
    setStudentAttendances(updated);

    const hadirCount = updated.filter(st => st.status === 'Hadir').length;
    const tidakHadirCount = updated.length - hadirCount;
    setFormData(prev => ({ ...prev, jumlahHadir: hadirCount, jumlahTidakHadir: tidakHadirCount }));
  };

  const handleMarkAllHadir = () => {
    const updated = studentAttendances.map(st => ({ ...st, status: 'Hadir' as const }));
    setStudentAttendances(updated);
    setFormData(prev => ({ ...prev, jumlahHadir: updated.length, jumlahTidakHadir: 0 }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus catatan Jurnal KBM ini?')) {
      const updated = agendaList.filter(a => a.id !== id);
      saveAgendaToDb(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materiPokok || !formData.mataPelajaran) {
      alert('Mohon isi mata pelajaran dan materi pokok.');
      return;
    }

    const hadirCount = studentAttendances.filter(s => s.status === 'Hadir').length;
    const tidakHadirCount = studentAttendances.length - hadirCount;

    const savedItem: AgendaItem = {
      id: editingId || `ag-${Date.now()}`,
      tanggal: formData.tanggal || getTodayDateString(),
      kelas: formData.kelas || '1',
      jamKe: formData.jamKe || '1 - 2',
      mataPelajaran: formData.mataPelajaran || DEFAULT_MAPEL[0],
      guru: formData.guru || teachers[0]?.name || 'Guru Pengampu',
      materiPokok: formData.materiPokok || '',
      capaianTp: formData.capaianTp || '',
      catatanSiswa: formData.catatanSiswa || '',
      jumlahHadir: hadirCount,
      jumlahTidakHadir: tidakHadirCount,
      daftarKehadiran: studentAttendances,
      semester: selectedSemester,
      status: (formData.status as any) || 'Terlaksana'
    };

    if (editingId) {
      const updated = agendaList.map(a => (a.id === editingId ? savedItem : a));
      saveAgendaToDb(updated);
    } else {
      saveAgendaToDb([savedItem, ...agendaList]);
    }

    // Optional sync to sheet ABSENSI
    if (syncToDailyAbsensi && studentAttendances.length > 0) {
      try {
        const currentAbsensi = (db.get('absensi') as any[]) || [];
        const dateStr = savedItem.tanggal;
        let modified = [...currentAbsensi];

        studentAttendances.forEach(st => {
          const idx = modified.findIndex(a => 
            (a.studentId === st.studentId || (st.nisn && a.nisn === st.nisn)) &&
            a.date === dateStr
          );
          const statusShort = st.status === 'Hadir' ? 'H' : st.status === 'Sakit' ? 'S' : st.status === 'Izin' ? 'I' : 'A';
          const record = {
            id: idx >= 0 ? modified[idx].id : `abs-${st.studentId}-${dateStr}`,
            studentId: st.studentId,
            nisn: st.nisn,
            name: st.name,
            class: savedItem.kelas,
            date: dateStr,
            time: '07:30',
            status: statusShort,
            statusLabel: st.status,
            note: `Jurnal KBM: ${savedItem.mataPelajaran} (${savedItem.jamKe})`,
            type: 'Masuk',
            method: 'Agenda Guru KBM'
          };
          if (idx >= 0) {
            modified[idx] = { ...modified[idx], ...record };
          } else {
            modified.push(record);
          }
        });

        db.set('absensi', modified);
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'absensi' } }));
      } catch (err) {
        console.warn('Sync to absensi failed:', err);
      }
    }

    setModalOpen(false);
  };

  const filteredAgenda = useMemo(() => {
    return agendaList.filter(item => {
      const matchSem = !item.semester || item.semester === selectedSemester;
      const matchCls = selectedClass ? matchClass(item.kelas, selectedClass) : true;
      const matchMpl = selectedMapel === 'Semua' ? true : item.mataPelajaran === selectedMapel;
      const matchSrch = searchTerm
        ? item.materiPokok.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.guru.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.capaianTp.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchSem && matchCls && matchMpl && matchSrch;
    });
  }, [agendaList, selectedSemester, selectedClass, selectedMapel, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPertemuan = filteredAgenda.length;
    const terlaksana = filteredAgenda.filter(a => a.status === 'Terlaksana').length;
    const totalSiswaHadir = filteredAgenda.reduce((acc, a) => acc + (a.jumlahHadir || 0), 0);
    return { totalPertemuan, terlaksana, totalSiswaHadir };
  }, [filteredAgenda]);

  const handleExportExcel = () => {
    if (filteredAgenda.length === 0) {
      alert("Tidak ada data agenda guru untuk diekspor.");
      return;
    }
    const rows = filteredAgenda.map((item, idx) => ({
      No: idx + 1,
      'Tanggal': item.tanggal,
      'Kelas': `Kelas ${item.kelas}`,
      'Jam Ke': item.jamKe,
      'Mata Pelajaran': item.mataPelajaran,
      'Guru Pengampu': item.guru,
      'Materi Pokok / TP': item.materiPokok,
      'Capaian Kompetensi / TP': item.capaianTp,
      'Jumlah Hadir': item.jumlahHadir,
      'Jumlah Tidak Hadir': item.jumlahTidakHadir,
      'Catatan Kasus / Siswa': item.catatanSiswa || '-',
      'Status KBM': item.status
    }));
    exportToExcel(rows, `Jurnal_Agenda_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="printable-area" className="printable-container space-y-6 print:p-0 print:m-0 print:space-y-4 print:w-full print:bg-white text-slate-900">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <BookMarked size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Agenda & Jurnal Mengajar Guru (KBM)</h2>
              <p className="text-xs text-slate-500 font-medium">
                Pencatatan realisasi materi, ketercapaian TP, catatan kelas, dan presensi siswa per pertemuan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition border border-emerald-200"
              title="Export ke Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              title="Cetak Jurnal & Agenda KBM"
            >
              <Printer size={15} />
              <span>Cetak Jurnal KBM</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-200 transition active:scale-95 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>+ Tambah Agenda & Presensi KBM</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Total Pertemuan KBM</span>
              <span className="text-xl font-black text-amber-950">{stats.totalPertemuan} Agenda</span>
            </div>
            <BookMarked size={24} className="text-amber-500 opacity-60" />
          </div>
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">KBM Terlaksana</span>
              <span className="text-xl font-black text-emerald-950">{stats.terlaksana} Sesi</span>
            </div>
            <CheckCircle2 size={24} className="text-emerald-500 opacity-60" />
          </div>
          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Kehadiran Siswa</span>
              <span className="text-xl font-black text-indigo-950">{stats.totalSiswaHadir} Siswa</span>
            </div>
            <Users size={24} className="text-indigo-500 opacity-60" />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <CustomDropdown
            id="agenda-select-semester"
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
            id="agenda-select-class"
            label="Filter Kelas"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            options={[
              { value: '', label: 'Semua Kelas' },
              ...classesList.map(c => ({
                value: c,
                label: formatClassLabel(c, true)
              }))
            ]}
            placeholder="Pilih Kelas..."
            searchable={classesList.length > 5}
          />

          <CustomDropdown
            id="agenda-select-mapel"
            label="Filter Mata Pelajaran"
            value={selectedMapel}
            onChange={(val) => setSelectedMapel(val)}
            options={[
              { value: 'Semua', label: 'Semua Mata Pelajaran' },
              ...DEFAULT_MAPEL.map(m => ({ value: m, label: m }))
            ]}
            placeholder="Pilih Mapel..."
            searchable
          />

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Cari Materi / Guru / TP</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik kata kunci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Jam Ke</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5">Guru Pengampu</th>
                <th className="p-3.5">Materi Pokok & TP</th>
                <th className="p-3.5 text-center">Presensi Siswa</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAgenda.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Belum ada agenda KBM yang tercatat untuk filter ini. Klik tombol <b>+ Tambah Agenda</b> di atas.
                  </td>
                </tr>
              ) : (
                filteredAgenda.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{item.tanggal}</td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[11px]">
                        Kelas {item.kelas}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-600 whitespace-nowrap">{item.jamKe}</td>
                    <td className="p-3.5 font-bold text-slate-900">{item.mataPelajaran}</td>
                    <td className="p-3.5 text-slate-700">{item.guru}</td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{item.materiPokok}</div>
                      {item.capaianTp && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          TP: {item.capaianTp}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setViewDetailItem(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                        title="Lihat Daftar Kehadiran Siswa Pertemuan Ini"
                      >
                        <span className="text-emerald-700 font-black">{item.jumlahHadir} H</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-rose-600 font-bold">{item.jumlahTidakHadir} TH</span>
                        <Eye size={12} className="text-slate-500" />
                      </button>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.status === 'Terlaksana' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'Tertunda' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition"
                          title="Edit Agenda KBM"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition"
                          title="Hapus Agenda KBM"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Sheet (Hidden on screen, visible during window.print) */}
      <div className="hidden print:block print-sheet space-y-4">
        <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h2>
          <h1 className="text-base font-black uppercase">{settings.schoolName || 'SISTEM INFORMASI AKADEMIK & KURIKULUM'}</h1>
          <p className="text-[9pt] text-gray-700">{settings.schoolAddress || '-'}</p>
          <div className="border-t border-black mt-2 pt-1">
            <h3 className="text-xs font-black uppercase underline">
              JURNAL & AGENDA HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)
            </h3>
            <p className="text-[8pt] text-gray-600">
              SEMESTER: {(semesterDisplayName || 'SEMESTER 1 (GANJIL)').toUpperCase()} ({semesterTahunAjar}) {selectedClass ? `• KELAS: ${formatClassLabel(selectedClass, true)}` : '• SEMUA ROMBEL'}
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-black print-table text-[8.5pt]">
          <thead>
            <tr className="bg-slate-200 text-black uppercase font-bold text-center">
              <th className="border border-black p-1 w-7">No</th>
              <th className="border border-black p-1 w-20">Tanggal</th>
              <th className="border border-black p-1 w-12">Kelas</th>
              <th className="border border-black p-1 w-16">Jam Ke</th>
              <th className="border border-black p-1 w-28">Mata Pelajaran</th>
              <th className="border border-black p-1 w-28">Guru Pengampu</th>
              <th className="border border-black p-1">Materi Pokok & TP</th>
              <th className="border border-black p-1 w-14">Hadir / Absen</th>
              <th className="border border-black p-1 w-24">Catatan</th>
              <th className="border border-black p-1 w-14">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgenda.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-black p-4 text-center italic text-gray-500">
                  Tidak ada catatan agenda KBM pada filter terpilih.
                </td>
              </tr>
            ) : (
              filteredAgenda.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-mono">{item.tanggal}</td>
                  <td className="border border-black p-1 text-center font-bold">{formatClassLabel(item.kelas, true)}</td>
                  <td className="border border-black p-1 text-center text-[7.5pt]">{item.jamKe}</td>
                  <td className="border border-black p-1 font-semibold">{item.mataPelajaran}</td>
                  <td className="border border-black p-1">{item.guru}</td>
                  <td className="border border-black p-1">
                    <div className="font-bold">{item.materiPokok}</div>
                    {item.capaianTp && <div className="text-[7.5pt] italic text-gray-700">TP: {item.capaianTp}</div>}
                  </td>
                  <td className="border border-black p-1 text-center font-mono text-[8pt]">
                    {item.jumlahHadir} / {item.jumlahTidakHadir}
                  </td>
                  <td className="border border-black p-1 text-[7.5pt]">{item.catatanSiswa || '-'}</td>
                  <td className="border border-black p-1 text-center font-bold text-[7.5pt]">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-center pt-4 text-xs">
          <div>
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            <p className="mt-10 font-bold">Guru Pengampu / Piket</p>
            <p>................................................</p>
          </div>
          <div className="text-right">
            <p>Mengetahui,</p>
            <p className="mt-10 font-bold">{settings.headmasterName || 'Kepala Sekolah'}</p>
            <p>NIP. {settings.headmasterNip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Detail Kehadiran Siswa */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Rekap Kehadiran Siswa Pertemuan KBM
                </h3>
                <p className="text-xs text-slate-500">
                  {viewDetailItem.mataPelajaran} • Kelas {viewDetailItem.kelas} ({viewDetailItem.tanggal})
                </p>
              </div>
              <button 
                onClick={() => setViewDetailItem(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hadir</span>
                <span className="text-base font-black text-emerald-950">
                  {viewDetailItem.daftarKehadiran ? viewDetailItem.daftarKehadiran.filter(s => s.status === 'Hadir').length : viewDetailItem.jumlahHadir}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Sakit</span>
                <span className="text-base font-black text-blue-950">
                  {viewDetailItem.daftarKehadiran ? viewDetailItem.daftarKehadiran.filter(s => s.status === 'Sakit').length : 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Izin</span>
                <span className="text-base font-black text-amber-950">
                  {viewDetailItem.daftarKehadiran ? viewDetailItem.daftarKehadiran.filter(s => s.status === 'Izin').length : 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Alpa</span>
                <span className="text-base font-black text-rose-950">
                  {viewDetailItem.daftarKehadiran ? viewDetailItem.daftarKehadiran.filter(s => s.status === 'Alpa').length : 0}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5">NISN</th>
                    <th className="p-2.5">Nama Siswa</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!viewDetailItem.daftarKehadiran || viewDetailItem.daftarKehadiran.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        Detail siswa belum dicatat secara individual. (Jumlah Hadir: {viewDetailItem.jumlahHadir})
                      </td>
                    </tr>
                  ) : (
                    viewDetailItem.daftarKehadiran.map((st, idx) => (
                      <tr key={st.studentId || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-600">{st.nisn}</td>
                        <td className="p-2.5 font-bold text-slate-900">{st.name}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            st.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                            st.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                            st.status === 'Izin' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailItem(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit with Integrated Attendance Checklist */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <BookMarked size={16} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {editingId ? 'Edit Jurnal Agenda Guru' : 'Tambah Jurnal Harian & Presensi KBM'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Isi catatan pembelajaran dan cek kehadiran siswa kelas pada pertemuan ini.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal KBM</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kelas / Rombel</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => handleFormClassChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {classesList.map(c => <option key={c} value={c}>{formatClassLabel(c, true)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Ke-</label>
                  <input
                    type="text"
                    placeholder="1 - 2 (07:30 - 09:00)"
                    value={formData.jamKe}
                    onChange={(e) => setFormData({ ...formData, jamKe: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
                  <select
                    value={formData.mataPelajaran}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {formMapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Guru Pengampu</label>
                  <input
                    type="text"
                    list="guru-options"
                    value={formData.guru}
                    onChange={(e) => setFormData({ ...formData, guru: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                  <datalist id="guru-options">
                    {teachers.map((t, idx) => <option key={t.id ? `ag-t-${t.id}-${idx}` : `ag-t-${idx}`} value={t.name} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Materi Pokok / Bab Pembelajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Operasi Penjumlahan Bilangan Cacah 1-20"
                  value={formData.materiPokok}
                  onChange={(e) => setFormData({ ...formData, materiPokok: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tujuan Pembelajaran (TP) / Capaian</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi TP yang dicapai siswa pada pertemuan ini..."
                  value={formData.capaianTp}
                  onChange={(e) => setFormData({ ...formData, capaianTp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              {/* Integrated Student Attendance Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-600" />
                      Presensi Siswa Kelas {formData.kelas} Pada Pertemuan Ini
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Total: {studentAttendances.length} Siswa | Hadir: <span className="font-bold text-emerald-700">{formData.jumlahHadir}</span> | Tidak Hadir: <span className="font-bold text-rose-700">{formData.jumlahTidakHadir}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllHadir}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition"
                    >
                      ✓ Semua Hadir
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2 w-8 text-center">No</th>
                        <th className="p-2">Nama Siswa</th>
                        <th className="p-2 text-center w-48">Status Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {studentAttendances.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400">
                            Tidak ada siswa terdaftar pada kelas ini.
                          </td>
                        </tr>
                      ) : (
                        studentAttendances.map((st, idx) => (
                          <tr key={st.studentId || idx} className="hover:bg-slate-50/70">
                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-semibold text-slate-800 truncate max-w-[160px]">
                              {st.name}
                            </td>
                            <td className="p-2 text-center">
                              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px]">
                                {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStudentStatus(st.studentId, status)}
                                    className={`px-2 py-0.5 rounded-md font-bold transition ${
                                      st.status === status
                                        ? status === 'Hadir' ? 'bg-emerald-600 text-white' :
                                          status === 'Sakit' ? 'bg-blue-600 text-white' :
                                          status === 'Izin' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {status.charAt(0)}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={syncToDailyAbsensi}
                    onChange={(e) => setSyncToDailyAbsensi(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">
                    Otomatis sinkronkan status kehadiran siswa di atas ke buku <b>Sheet ABSENSI</b>
                  </span>
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Refleksi & Kejadian Khusus</label>
                <textarea
                  rows={2}
                  placeholder="Respon siswa, remedial spontan, atau kendala pembelajaran..."
                  value={formData.catatanSiswa}
                  onChange={(e) => setFormData({ ...formData, catatanSiswa: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status KBM</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Terlaksana">Terlaksana</option>
                    <option value="Tertunda">Tertunda</option>
                    <option value="Diganti">Diganti</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semester</label>
                  <input
                    type="text"
                    value={selectedSemester}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-amber-200"
                >
                  <Save size={14} />
                  <span>Simpan Jurnal & Presensi KBM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
