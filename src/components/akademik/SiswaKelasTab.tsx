import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getActiveClasses, getAllClasses, matchClass, matchStatusActive, formatClassLabel, sortStudentsByStatusAndName, getStatusPriority, triggerPrint, generateId } from '../../lib/utils';
import { exportToExcel } from '../../lib/excel';
import { fetchFromGAS } from '../../lib/api';
import { generateDapodikValidasiRows } from '../../lib/dapodikValidator';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import StudentPhoto from './StudentPhoto';
import { Student } from '../../types';
import { DEFAULT_APP_CONFIG } from '../../data/config';
import { 
  Users, Search, Filter, Printer, UserCheck, School, 
  Phone, Mail, CheckCircle2, ChevronRight, Award, ShieldCheck,
  FileSpreadsheet, Sparkles, AlertCircle, RefreshCw, Eye, Edit3, X, Save,
  Plus, Trash2, Check, AlertTriangle, Image as ImageIcon, MapPin,
  Briefcase, Sun, Moon
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';
import VerifikasiKerjaModal, { getStudentEffectiveGroup } from './VerifikasiKerjaModal';

export default function SiswaKelasTab() {
  const { students, setStudents, teachers, settings, updateStudent, addStudent, deleteStudent, setIsSyncingGlobal, setLastSyncedAt } = useStore();
  
  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const classesList = useMemo(() => {
    return getAllClasses(activeStudents);
  }, [activeStudents]);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'Semua' | 'L' | 'P'>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [shiftFilter, setShiftFilter] = useState<'Semua' | 'Aktif Bekerja' | 'Tidak Bekerja'>('Semua');

  // Selected student for detail / edit modal / verification modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [verifyingStudent, setVerifyingStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    class: selectedClass || '10',
    nis: '',
    nisn: '',
    nik: '',
    gender: 'L' as 'L' | 'P',
    status: 'Aktif',
    phone: '',
    birthPlace: '',
    birthDate: '',
    fatherName: '',
    motherName: '',
    guardianName: '',
    kelurahan: '',
    address: '',
    fotoUrl: ''
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtered students with strict priority sorting: Aktif -> Tidak Aktif -> Belum (Excludes Pindah, Lulus, Keluar)
  const classStudents = useMemo(() => {
    if (!activeStudents || activeStudents.length === 0) return [];
    
    const filtered = activeStudents.filter(s => {
      // 1. Class filter
      const isClass = selectedClass ? matchClass(s.class, selectedClass) : true;
      
      // 2. Gender filter
      const isGender = genderFilter === 'Semua' ? true : s.gender === genderFilter;
      
      // 3. Status filter
      let isStatus = true;
      if (statusFilter !== 'Semua') {
        const priority = getStatusPriority(s.status);
        if (statusFilter === 'Aktif') isStatus = priority === 1;
        else if (statusFilter === 'Tidak Aktif') isStatus = priority === 2;
        else if (statusFilter === 'Belum') isStatus = priority === 3;
        else isStatus = String(s.status || '').toLowerCase().includes(statusFilter.toLowerCase());
      }
      
      // 4. Search filter
      const isSearch = searchTerm 
        ? (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.nis && String(s.nis).includes(searchTerm)) ||
          (s.nisn && String(s.nisn).includes(searchTerm)) ||
          (s.nik && String(s.nik).includes(searchTerm)) ||
          (s.kelurahan && s.kelurahan.toLowerCase().includes(searchTerm.toLowerCase())) ||
          ((s as any).desa && String((s as any).desa).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.motherName && s.motherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          ((s as any).namaIbu && String((s as any).namaIbu).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;

      // 5. Shift / Kelompok Belajar filter
      let isShift = true;
      if (shiftFilter !== 'Semua') {
        const eff = getStudentEffectiveGroup(s);
        isShift = eff.group === shiftFilter;
      }

      return isClass && isGender && isStatus && isSearch && isShift;
    });

    return sortStudentsByStatusAndName(filtered);
  }, [activeStudents, selectedClass, genderFilter, statusFilter, searchTerm, shiftFilter]);

  // Wali Kelas for selected class
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

  const totalAllStudentsInClass = useMemo(() => {
    return activeStudents.filter(s => selectedClass ? matchClass(s.class, selectedClass) : true).length;
  }, [activeStudents, selectedClass]);

  const countAktif = useMemo(() => {
    return classStudents.filter(s => getStatusPriority(s.status) === 1).length;
  }, [classStudents]);

  const countTidakAktif = useMemo(() => {
    return classStudents.filter(s => getStatusPriority(s.status) === 2).length;
  }, [classStudents]);

  const countBelum = useMemo(() => {
    return classStudents.filter(s => getStatusPriority(s.status) === 3).length;
  }, [classStudents]);

  const countL = useMemo(() => classStudents.filter(s => s.gender === 'L').length, [classStudents]);
  const countP = useMemo(() => classStudents.filter(s => s.gender === 'P').length, [classStudents]);

  // Save Edit Student (Otomatis mengubah Sheet SISWA, DAPODIK, ORANG TUA, YATIM)
  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.class) {
      alert("Nama dan kelas wajib diisi.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const ibuVal = editFormData.motherName || editFormData.namaIbu || (editFormData as any).NamaIbu || selectedStudent.motherName || (selectedStudent as any).namaIbu || '';
      const kelurahanVal = editFormData.kelurahan || (editFormData as any).desa || selectedStudent.kelurahan || '';
      const fotoVal = editFormData.fotoUrl || editFormData.pasFoto || selectedStudent.fotoUrl || '';

      const updatedStudent: Student = { 
        ...selectedStudent, 
        ...editFormData,
        motherName: ibuVal,
        namaIbu: ibuVal,
        NamaIbu: ibuVal,
        kelurahan: kelurahanVal,
        desa: kelurahanVal,
        fotoUrl: fotoVal,
        pasFoto: fotoVal,
        updatedAt: new Date().toISOString()
      };

      const updatedList = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
      setStudents(updatedList);
      db.set('students', updatedList);
      
      if (updateStudent) {
        updateStudent(selectedStudent.id, updatedStudent);
      }

      // Generate DAPODIK rows
      const standardDapodikRows = generateDapodikValidasiRows(updatedList, settings.academicYear || (settings as any).tahunPelajaran || '2026/2027');
      db.set('dapodik_validations', standardDapodikRows);

      // AutoSync dispatch
      autoSyncEngine.queueDbKey('students');

      const targetGasUrl = settings.scriptUrl || (settings as any).gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const targetSpreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

      if (targetGasUrl) {
        setIsSyncingGlobal(true);
        // 1. Sync Sheet SISWA
        await fetchFromGAS(targetGasUrl, {
          action: 'sync',
          data: updatedList,
          teachers: useStore.getState().teachers,
          spreadsheetId: targetSpreadsheetId
        });

        // 2. Sync Sheet DAPODIK_VALIDASI
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'syncData',
            table: 'DAPODIK_VALIDASI',
            forceWipeEmpty: updatedList.length === 0,
            data: standardDapodikRows,
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Dapodik sync warning:", e);
        }

        // 3. Auto Populate Sheet ORANG TUA & YATIM PIATU
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'AUTO_POPULATE_ORTU_YATIM',
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Auto populate ortu & yatim warning:", e);
        }

        setLastSyncedAt(new Date().toISOString());
        setIsSyncingGlobal(false);
      }

      setSelectedStudent(updatedStudent);
      setIsEditing(false);
      setSyncFeedback({ type: 'success', message: `Data siswa ${updatedStudent.name} berhasil diperbarui dan disinkronkan ke Sheet SISWA, DAPODIK, & ORANG TUA!` });
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      console.error("Error saving student edit:", err);
      setSyncFeedback({ type: 'error', message: `Gagal memperbarui: ${err.message || 'Terjadi kesalahan'}` });
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Add Student (Otomatis menambahkan ke Sheet SISWA, DAPODIK, ORANG TUA, YATIM)
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.class) {
      alert("Nama siswa dan kelas wajib diisi!");
      return;
    }

    setIsSyncing(true);
    try {
      const newStudent: Student = {
        id: generateId(),
        nis: addFormData.nis || '',
        nisn: addFormData.nisn || '',
        nik: addFormData.nik || '',
        name: addFormData.name,
        class: addFormData.class,
        gender: addFormData.gender as 'L' | 'P',
        pob: addFormData.birthPlace || '',
        dob: addFormData.birthDate || '',
        kelurahan: addFormData.kelurahan || '',
        desa: addFormData.kelurahan || '',
        address: addFormData.address || addFormData.kelurahan || '',
        phone: addFormData.phone || '',
        status: (addFormData.status as any) || 'Aktif',
        fatherName: addFormData.fatherName || '',
        motherName: addFormData.motherName || '',
        namaIbu: addFormData.motherName || '',
        NamaIbu: addFormData.motherName || '',
        guardianName: addFormData.guardianName || '',
        parentName: addFormData.fatherName || addFormData.motherName || addFormData.guardianName || 'Orang Tua',
        fotoUrl: addFormData.fotoUrl || '',
        pasFoto: addFormData.fotoUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedList = [newStudent, ...students];
      setStudents(updatedList);
      db.set('students', updatedList);

      if (addStudent) {
        addStudent(newStudent);
      }

      // DAPODIK rows
      const standardDapodikRows = generateDapodikValidasiRows(updatedList, settings.academicYear || (settings as any).tahunPelajaran || '2026/2027');
      db.set('dapodik_validations', standardDapodikRows);

      // AutoSync dispatch
      autoSyncEngine.queueDbKey('students');

      const targetGasUrl = settings.scriptUrl || (settings as any).gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const targetSpreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

      if (targetGasUrl) {
        setIsSyncingGlobal(true);
        // 1. Sync SISWA
        await fetchFromGAS(targetGasUrl, {
          action: 'sync',
          data: updatedList,
          teachers: useStore.getState().teachers,
          spreadsheetId: targetSpreadsheetId
        });

        // 2. Sync DAPODIK_VALIDASI
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'syncData',
            table: 'DAPODIK_VALIDASI',
            forceWipeEmpty: updatedList.length === 0,
            data: standardDapodikRows,
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Dapodik sync warning:", e);
        }

        // 3. Auto Populate ORANG TUA & YATIM
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'AUTO_POPULATE_ORTU_YATIM',
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Auto populate ortu & yatim warning:", e);
        }

        setLastSyncedAt(new Date().toISOString());
        setIsSyncingGlobal(false);
      }

      setIsAddModalOpen(false);
      setAddFormData({
        name: '',
        class: selectedClass || '10',
        nis: '',
        nisn: '',
        nik: '',
        gender: 'L',
        status: 'Aktif',
        phone: '',
        birthPlace: '',
        birthDate: '',
        fatherName: '',
        motherName: '',
        guardianName: '',
        kelurahan: '',
        address: '',
        fotoUrl: ''
      });
      setSyncFeedback({ type: 'success', message: `Siswa baru ${newStudent.name} berhasil ditambahkan ke Sheet SISWA!` });
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      console.error("Error adding new student:", err);
      setSyncFeedback({ type: 'error', message: `Gagal menambah siswa: ${err.message || 'Terjadi kesalahan'}` });
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete Student (Otomatis menghapus dari Sheet SISWA, DAPODIK, ORANG TUA, YATIM)
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    setIsSyncing(true);
    try {
      const studentId = deleteModal.id;
      const studentName = deleteModal.name;
      
      if (deleteStudent) {
        deleteStudent(studentId);
      }

      const remainingStudents = useStore.getState().students.filter(s => s.id !== studentId && s.nis !== studentId);
      setStudents(remainingStudents);
      db.set('students', remainingStudents);

      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
        setIsEditing(false);
      }

      // Update DAPODIK
      const standardDapodikRows = generateDapodikValidasiRows(remainingStudents, settings.academicYear || (settings as any).tahunPelajaran || '2026/2027');
      db.set('dapodik_validations', standardDapodikRows);

      // AutoSync dispatch
      autoSyncEngine.queueDbKey('students');

      const targetGasUrl = settings.scriptUrl || (settings as any).gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      const targetSpreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

      if (targetGasUrl) {
        setIsSyncingGlobal(true);
        // 1. Sync SISWA
        await fetchFromGAS(targetGasUrl, {
          action: 'sync',
          data: remainingStudents,
          teachers: useStore.getState().teachers,
          spreadsheetId: targetSpreadsheetId
        });

        // 2. Sync DAPODIK_VALIDASI
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'syncData',
            table: 'DAPODIK_VALIDASI',
            forceWipeEmpty: remainingStudents.length === 0,
            data: standardDapodikRows,
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Dapodik sync warning:", e);
        }

        // 3. Auto Populate ORANG TUA & YATIM
        try {
          await fetchFromGAS(targetGasUrl, {
            action: 'AUTO_POPULATE_ORTU_YATIM',
            spreadsheetId: targetSpreadsheetId
          });
        } catch (e) {
          console.warn("Auto populate ortu & yatim warning:", e);
        }

        setLastSyncedAt(new Date().toISOString());
        setIsSyncingGlobal(false);
      }

      setDeleteModal(null);
      setSyncFeedback({ type: 'success', message: `Data siswa ${studentName} berhasil dihapus dari Sheet SISWA!` });
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      console.error("Error deleting student:", err);
      setSyncFeedback({ type: 'error', message: `Gagal menghapus: ${err.message || 'Terjadi kesalahan'}` });
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    if (classStudents.length === 0) {
      alert("Tidak ada data siswa pada rombel ini.");
      return;
    }

    const rows = classStudents.map((s, idx) => ({
      No: idx + 1,
      'Foto': s.fotoUrl || (s as any).pasFoto || (s as any).Foto || '-',
      'Nama Siswa': s.name,
      'NISN': s.nisn || '-',
      'NIS': s.nis || '-',
      'Kelas': formatClassLabel(s.class, true),
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : s.gender || '-',
      'Tempat Lahir': s.birthPlace || (s as any).tempatLahir || (s as any).pob || '-',
      'Tanggal Lahir': s.birthDate || (s as any).tanggalLahir || (s as any).dob || '-',
      'Nama Ibu': s.motherName || (s as any).namaIbu || (s as any).NamaIbu || '-',
      'Nama Ayah': s.fatherName || (s as any).namaAyah || '-',
      'Kelurahan': s.kelurahan || (s as any).desa || (s as any).Kelurahan || '-',
      'Alamat': s.address || (s as any).alamat || '-',
      'Status': s.status || 'Belum Aktif'
    }));

    exportToExcel(rows, `Roster_Siswa_${selectedClass ? formatClassLabel(selectedClass, true).replace(/\s+/g, '_') : 'Semua_Rombel'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    triggerPrint();
  };

  return (
    <div id="printable-area" className="printable-container space-y-6 print:p-0 print:m-0 print:space-y-4 print:w-full print:bg-white text-slate-900">
      {/* Toast Feedback */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in ${
          syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-rose-600" />}
            <span>{syncFeedback.message}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100/80">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Roster Data Siswa Per Rombel</h2>
              <p className="text-xs text-slate-500 font-medium">
                Sinkronisasi data peserta didik (Aktif, Tidak Aktif, Belum), rasio gender, dan penanggung jawab kelas / wali kelas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setAddFormData({
                  name: '',
                  class: selectedClass || '10',
                  nis: '',
                  nisn: '',
                  nik: '',
                  gender: 'L',
                  status: 'Aktif',
                  phone: '',
                  birthPlace: '',
                  birthDate: '',
                  fatherName: '',
                  motherName: '',
                  guardianName: '',
                  kelurahan: '',
                  address: '',
                  fotoUrl: ''
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Siswa</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Roster</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <CustomDropdown
            id="siswa-select-class"
            label="Pilih Rombel"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            options={[
              { value: '', label: `Semua Rombel (${activeStudents.length} Siswa)` },
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
            id="siswa-select-status"
            label="Filter Status Siswa"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'Semua', label: 'Semua Status (Aktif & Belum)' },
              { value: 'Aktif', label: 'Status Aktif (Prioritas 1)' },
              { value: 'Tidak Aktif', label: 'Status Tidak Aktif (Prioritas 2)' },
              { value: 'Belum', label: 'Status Belum (Prioritas 3)' }
            ]}
            placeholder="Pilih Status..."
          />

          <CustomDropdown
            id="siswa-select-gender"
            label="Filter Jenis Kelamin"
            value={genderFilter}
            onChange={(val) => setGenderFilter(val as any)}
            options={[
              { value: 'Semua', label: 'Semua Gender (L & P)' },
              { value: 'L', label: 'Laki-laki (L)' },
              { value: 'P', label: 'Perempuan (P)' }
            ]}
            placeholder="Pilih Gender..."
          />

          <CustomDropdown
            id="siswa-select-shift"
            label="Filter Kelompok / Shift"
            value={shiftFilter}
            onChange={(val) => setShiftFilter(val as any)}
            options={[
              { value: 'Semua', label: 'Semua Shift Belajar' },
              { value: 'Aktif Bekerja', label: 'Shift Malam (Sen, Rab, Min)' },
              { value: 'Tidak Bekerja', label: 'Shift Siang (Sen, Kam, Min)' }
            ]}
            placeholder="Pilih Shift..."
          />

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Cari Siswa / NIS / Alamat:</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama, NISN, NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Class Overview Cards & Wali Kelas info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {/* Wali Kelas Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <School size={22} />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Wali Kelas / Guru Pembina</span>
            <h4 className="font-extrabold text-slate-900 text-sm truncate">
              {waliKelas ? waliKelas.name : selectedClass ? 'Belum Ditetapkan' : 'Pilih Rombel Khusus'}
            </h4>
            <p className="text-xs text-slate-500 truncate">
              {waliKelas ? `NIP. ${waliKelas.nip || '-'} • ${waliKelas.phone || '-'}` : selectedClass ? 'Atur di Menu Guru & Tendik' : `${classesList.length} Rombel Tersedia`}
            </p>
          </div>
        </div>

        {/* Total & Gender ratio */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Peserta Didik</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{classStudents.length} <span className="text-xs font-normal text-slate-400">Siswa</span></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-center px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Laki-laki</span>
              <span className="text-sm font-black text-blue-900">{countL}</span>
            </div>
            <div className="text-center px-3 py-1.5 bg-pink-50 rounded-xl border border-pink-100">
              <span className="text-[10px] font-bold text-pink-700 uppercase block">Perempuan</span>
              <span className="text-sm font-black text-pink-900">{countP}</span>
            </div>
          </div>
        </div>

        {/* Status Ratio Priority Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status Keaktifan</span>
            <p className="text-xs text-slate-400 mt-0.5">Prioritas: Aktif &rarr; Tdk Aktif &rarr; Belum</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-center" title="Siswa Aktif (Prioritas 1)">
              {countAktif} Aktif
            </span>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-center" title="Siswa Tidak Aktif (Prioritas 2)">
              {countTidakAktif} Nonaktif
            </span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-center" title="Siswa Belum Aktif (Prioritas 3)">
              {countBelum} Belum
            </span>
          </div>
        </div>
      </div>

      {/* Main Student List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header for print only */}
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-xl font-bold uppercase">{settings.schoolName || 'SMK NEGERI CONTOH'}</h1>
          <h2 className="text-sm font-semibold">DAFTAR ROSTER PESERTA DIDIK ROMBEL {selectedClass ? formatClassLabel(selectedClass, true).toUpperCase() : 'SEMUA KELAS'}</h2>
          <p className="text-xs text-slate-500">Tahun Pelajaran {settings.tahunPelajaran || '2026/2027'} • Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200 print:bg-slate-200 print:text-black">
              <tr>
                <th className="p-2.5 pl-4 text-center w-10">No</th>
                <th className="p-2.5 text-center w-14">Foto</th>
                <th className="p-2.5 text-center w-24">NIS / NISN</th>
                <th className="p-2.5">Nama Peserta Didik</th>
                <th className="p-2.5 text-center w-12">JK</th>
                <th className="p-2.5 w-20">Kelas</th>
                <th className="p-2.5">Tempat, Tanggal Lahir</th>
                <th className="p-2.5">Nama Ibu</th>
                <th className="p-2.5">Kelurahan</th>
                <th className="p-2.5 text-center w-36">Kelompok / Shift</th>
                <th className="p-2.5 text-center w-24">Status</th>
                <th className="p-2.5 text-center pr-4 w-28 print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 print:divide-slate-300">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Siswa di {selectedClass ? formatClassLabel(selectedClass, true) : 'Rombel Ini'}</p>
                    <p className="text-xs text-slate-400">Silakan ubah filter kelas atau tambahkan data siswa di menu Data Siswa.</p>
                  </td>
                </tr>
              ) : (
                classStudents.map((s, idx) => {
                  const statusPriority = getStatusPriority(s.status);
                  const rawStatus = s.status || 'Belum Aktif';
                  const studentPhoto = s.fotoUrl || (s as any).pasFoto || (s as any).Foto;
                  const ibuName = s.motherName || (s as any).namaIbu || (s as any).NamaIbu || '-';
                  const kelurahanName = s.kelurahan || (s as any).desa || (s as any).Kelurahan || (s.address || (s as any).alamat || '-');
                  
                  return (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 pl-4 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 text-center">
                        <StudentPhoto
                          fotoUrl={studentPhoto}
                          name={s.name}
                          size="sm"
                          className="mx-auto shadow-xs border border-slate-200"
                        />
                      </td>
                      <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                        <div>{s.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">{s.nisn || '-'}</div>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="uppercase tracking-tight text-xs">{s.name}</div>
                        {s.nik && <div className="text-[10px] text-slate-400 font-normal font-mono"> {s.nik}</div>}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          s.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}>
                          {s.gender || 'L'}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-indigo-700">
                        {formatClassLabel(s.class, true)}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {s.birthPlace || (s as any).tempatLahir ? `${s.birthPlace || (s as any).tempatLahir}, ` : ''}{s.birthDate || (s as any).tanggalLahir || '-'}
                      </td>
                      <td className="p-2.5 text-slate-800 font-semibold">
                        <div>{ibuName}</div>
                      </td>
                      <td className="p-2.5 text-slate-700">
                        <div className="truncate max-w-[140px] font-medium" title={kelurahanName}>{kelurahanName}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        {(() => {
                          const eff = getStudentEffectiveGroup(s);
                          return (
                            <button
                              type="button"
                              onClick={() => setVerifyingStudent(s)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer hover:opacity-85 transition border ${
                                eff.group === 'Aktif Bekerja'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                                  : eff.statusLabel === 'Menunggu Verifikasi Bukti'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                              }`}
                              title="Klik untuk verifikasi bukti kerja dan tentukan kelompok shift belajar"
                            >
                              {eff.group === 'Aktif Bekerja' ? <Moon size={11} className="text-indigo-600" /> : <Sun size={11} className="text-blue-600" />}
                              <span>{eff.group === 'Aktif Bekerja' ? 'Shift Malam' : 'Shift Siang'}</span>
                              {eff.isVerified && <CheckCircle2 size={11} className="text-emerald-600" />}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border inline-block ${
                          statusPriority === 1 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : statusPriority === 2
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                          {rawStatus}
                        </span>
                      </td>
                      <td className="p-2.5 text-center pr-4 print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setIsEditing(false);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Lihat Profil Siswa"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setEditFormData({ ...s });
                              setIsEditing(true);
                            }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Edit Data Siswa"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteModal({ id: s.id, name: s.name });
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Hapus Siswa"
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

        {/* Footer info for print */}
        <div className="hidden print:flex justify-between items-center mt-8 p-4 text-xs">
          <div>
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            <p className="mt-8 font-bold">Wali Kelas: {waliKelas ? waliKelas.name : '.........................'}</p>
          </div>
          <div className="text-right">
            <p>Mengetahui,</p>
            <p className="mt-8 font-bold">{settings.headmasterName || 'Kepala Sekolah'}</p>
            <p>NIP. {settings.headmasterNip || '-'}</p>
          </div>
        </div>
      </div>

      {/* MODAL: Detail & Edit Siswa */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {isEditing ? 'Edit Data Peserta Didik' : 'Profil Lengkap Peserta Didik'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.name} • {formatClassLabel(selectedStudent.class, true)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setIsEditing(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-2 overflow-y-auto space-y-4 text-xs">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-3">
                  {/* Foto Section */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
                    <StudentPhoto
                      fotoUrl={editFormData.fotoUrl || editFormData.pasFoto}
                      name={editFormData.name || selectedStudent.name}
                      size="lg"
                      className="border-2 border-indigo-200 shadow-xs"
                    />
                    <div className="flex-1 space-y-1">
                      <label className="font-bold text-slate-700 block">Link Foto Siswa (URL / Pas Foto)</label>
                      <input
                        type="text"
                        value={editFormData.fotoUrl || editFormData.pasFoto || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, fotoUrl: e.target.value, pasFoto: e.target.value })}
                        placeholder="https://... atau Google Drive link foto"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                      <p className="text-[10px] text-slate-400">Masukkan link URL gambar atau foto ID siswa</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Rombel *</label>
                      <input
                        type="text"
                        value={editFormData.class || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, class: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NIS</label>
                      <input
                        type="text"
                        value={editFormData.nis || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nis: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NISN</label>
                      <input
                        type="text"
                        value={editFormData.nisn || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nisn: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NIK</label>
                      <input
                        type="text"
                        value={editFormData.nik || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nik: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Jenis Kelamin</label>
                      <select
                        value={editFormData.gender || 'L'}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Status Keaktifan</label>
                      <select
                        value={editFormData.status || 'Aktif'}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                        <option value="Belum Aktif">Belum Aktif</option>
                        <option value="Mutasi / Pindah">Mutasi / Pindah</option>
                        <option value="Lulus">Lulus</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={editFormData.birthPlace || editFormData.tempatLahir || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, birthPlace: e.target.value, tempatLahir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={editFormData.birthDate || editFormData.tanggalLahir || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nama Ibu Kandung</label>
                      <input
                        type="text"
                        value={editFormData.motherName || editFormData.namaIbu || (editFormData as any).NamaIbu || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value, namaIbu: e.target.value, NamaIbu: e.target.value })}
                        placeholder="Nama Ibu Kandung"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kelurahan / Desa</label>
                      <input
                        type="text"
                        value={editFormData.kelurahan || (editFormData as any).desa || (editFormData as any).Kelurahan || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, kelurahan: e.target.value, desa: e.target.value, Kelurahan: e.target.value })}
                        placeholder="Nama Kelurahan / Desa"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      value={editFormData.address || editFormData.alamat || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value, alamat: e.target.value })}
                      placeholder="RT/RW, Dusun, Kecamatan, Kabupaten/Kota"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                /* Readonly View */
                <div className="space-y-4">
                  {/* Highlight box with photo */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <StudentPhoto
                        fotoUrl={selectedStudent.fotoUrl || (selectedStudent as any).pasFoto || (selectedStudent as any).Foto}
                        name={selectedStudent.name}
                        size="lg"
                        className="border-2 border-white shadow-md ring-2 ring-indigo-200"
                      />
                      <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase">{selectedStudent.name}</h4>
                        <p className="text-slate-500 text-xs">
                          Rombel: <strong className="text-indigo-700"> {formatClassLabel(selectedStudent.class, true)}</strong> • JK: <strong className="text-slate-800">{selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</strong>
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-black text-xs border shrink-0 ${
                      getStatusPriority(selectedStudent.status) === 1
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : getStatusPriority(selectedStudent.status) === 2
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {selectedStudent.status || 'Aktif'}
                    </span>
                  </div>

                  {/* Identity Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">NIS</span>
                      <span className="font-extrabold text-slate-800 font-mono text-sm">{selectedStudent.nis || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">NISN</span>
                      <span className="font-extrabold text-slate-800 font-mono text-sm">{selectedStudent.nisn || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">NIK</span>
                      <span className="font-extrabold text-slate-800 font-mono text-sm">{selectedStudent.nik || '-'}</span>
                    </div>
                  </div>

                  {/* Biodata Table */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Tempat, Tanggal Lahir:</span>
                      <span className="font-bold text-slate-800">
                        {selectedStudent.birthPlace || (selectedStudent as any).tempatLahir || '-'}, {selectedStudent.birthDate || (selectedStudent as any).tanggalLahir || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Nama Ibu:</span>
                      <span className="font-bold text-indigo-900">
                        {selectedStudent.motherName || (selectedStudent as any).namaIbu || (selectedStudent as any).NamaIbu || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">Kelurahan / Desa:</span>
                      <span className="font-bold text-slate-800">
                        {selectedStudent.kelurahan || (selectedStudent as any).desa || (selectedStudent as any).Kelurahan || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alamat Tempat Tinggal:</span>
                      <span className="font-bold text-slate-800 text-right max-w-xs">
                        {selectedStudent.address || (selectedStudent as any).alamat || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Batal Edit
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} /> {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormData({ ...selectedStudent });
                        setIsEditing(true);
                      }}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit Data Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModal({ id: selectedStudent.id, name: selectedStudent.name });
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 size={14} /> Hapus Siswa
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Siswa Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <Plus size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Tambah Peserta Didik Baru
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Tambahkan data siswa ke rombel dan sinkronkan ke Google Sheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 overflow-y-auto space-y-3 text-xs flex-1">
                {/* Foto Section */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
                  <StudentPhoto
                    fotoUrl={addFormData.fotoUrl}
                    name={addFormData.name || 'Siswa'}
                    size="lg"
                    className="border-2 border-indigo-200 shadow-xs"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="font-bold text-slate-700 block">Link Foto Siswa (URL / Pas Foto)</label>
                    <input
                      type="text"
                      value={addFormData.fotoUrl}
                      onChange={(e) => setAddFormData({ ...addFormData, fotoUrl: e.target.value })}
                      placeholder="https://... atau Google Drive link foto"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">Masukkan link URL foto pas foto siswa (opsional)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Siswa *</label>
                    <input
                      type="text"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      placeholder="Contoh: Ahmad Fauzi"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Rombel *</label>
                    <input
                      type="text"
                      value={addFormData.class}
                      onChange={(e) => setAddFormData({ ...addFormData, class: e.target.value })}
                      placeholder="Contoh: 10 TKJ A"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NIS</label>
                    <input
                      type="text"
                      value={addFormData.nis}
                      onChange={(e) => setAddFormData({ ...addFormData, nis: e.target.value })}
                      placeholder="Nomor Induk"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NISN</label>
                    <input
                      type="text"
                      value={addFormData.nisn}
                      onChange={(e) => setAddFormData({ ...addFormData, nisn: e.target.value })}
                      placeholder="NISN Nasional"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NIK</label>
                    <input
                      type="text"
                      value={addFormData.nik}
                      onChange={(e) => setAddFormData({ ...addFormData, nik: e.target.value })}
                      placeholder="NIK Kependudukan"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jenis Kelamin</label>
                    <select
                      value={addFormData.gender}
                      onChange={(e) => setAddFormData({ ...addFormData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status Keaktifan</label>
                    <select
                      value={addFormData.status}
                      onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                      <option value="Belum Aktif">Belum Aktif</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={addFormData.birthPlace}
                      onChange={(e) => setAddFormData({ ...addFormData, birthPlace: e.target.value })}
                      placeholder="Kota Lahir"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={addFormData.birthDate}
                      onChange={(e) => setAddFormData({ ...addFormData, birthDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      value={addFormData.motherName}
                      onChange={(e) => setAddFormData({ ...addFormData, motherName: e.target.value })}
                      placeholder="Nama Ibu"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kelurahan / Desa</label>
                    <input
                      type="text"
                      value={addFormData.kelurahan}
                      onChange={(e) => setAddFormData({ ...addFormData, kelurahan: e.target.value })}
                      placeholder="Nama Kelurahan / Desa"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alamat Tempat Tinggal</label>
                  <textarea
                    rows={2}
                    value={addFormData.address}
                    onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                    placeholder="Alamat lengkap siswa..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {isSyncing ? 'Menyimpan...' : 'Simpan Siswa Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Siswa */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">Hapus Data Peserta Didik?</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus data siswa <strong className="text-rose-600">{deleteModal.name}</strong>? Data akan dihapus dari aplikasi dan disinkronkan ke Spreadsheet.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? 'Menghapus...' : 'Ya, Hapus Data'}
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
        onSaved={() => {
          setVerifyingStudent(null);
        }}
      />
    </div>
  );
}
