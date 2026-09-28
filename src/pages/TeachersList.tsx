import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Teacher } from '../types';
import TablePagination from '../components/common/TablePagination';
import { 
  Search, Plus, Edit2, Trash2, X, Save, Filter, 
  GraduationCap, Phone, Mail, CheckCircle2, XCircle, Users,
  RefreshCw, UserCheck, Award,
  Laptop, Shield, Key, Sparkles,
  FileText, BookOpen, Briefcase, Upload, Image as ImageIcon, Check,
  Download, FileSpreadsheet, Eye, Printer, MapPin, Calendar, Clock
} from 'lucide-react';
import { generateId, cn, getAllClasses, getGoogleDriveDirectImageUrl, fileToBase64WithCompression } from '../lib/utils';
import { fetchFromGAS, fileToBase64, uploadFileToGAS } from '../lib/api';
import { exportTeachersToExcel, importTeachersFromExcel, downloadTeacherExcelTemplate } from '../lib/excel';
import CustomDropdown from '../components/common/CustomDropdown';

const TENDIK_PRESETS = [
  'Operator Sekolah',
  'Penjaga Sekolah',
  'Satpam / Keamanan',
  'Petugas Kebersihan',
  'Tenaga Administrasi (TU)',
  'Petugas Perpustakaan',
];

export default function TeachersList() {
  const { teachers, students, settings, addTeacher, updateTeacher, deleteTeacher, setLoading, setIsSyncingGlobal, setLastSyncedAt } = useStore();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [classFilter, setClassFilter] = useState('Semua');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, classFilter]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  
  // Form state
  const [nip, setNip] = useState('');
  const [nik, setNik] = useState('');
  const [nuptk, setNuptk] = useState('');
  const [name, setName] = useState('');
  const [gelar, setGelar] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [agama, setAgama] = useState('Islam');
  const [alamat, setAlamat] = useState('');
  const [assignedClass, setAssignedClass] = useState('None');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pendidikan, setPendidikan] = useState('S1');
  const [jurusan, setJurusan] = useState('');
  const [statusKepegawaian, setStatusKepegawaian] = useState('Tetap');
  const [tmt, setTmt] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formError, setFormError] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      // Process file into standard Base64 Data URL (compressed for lightweight spreadsheet storage)
      const base64Data = await fileToBase64WithCompression(file, 400, 500, 0.85);
      setFotoUrl(base64Data);

      // If Google Apps Script cloud sync is connected, also trigger background upload
      if (settings.scriptUrl) {
        try {
          const teacherNip = nip || nuptk || nik || 'GTK';
          const cleanTName = (name || 'Guru').trim();
          const customFilename = `${teacherNip ? '[' + teacherNip + ']_' : ''}PASFOTO_${cleanTName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
          const uploadedUrl = await uploadFileToGAS(
            settings.scriptUrl,
            file,
            settings.folderId || 'BERKAS_SISWA_MASTER',
            customFilename,
            {
              modul: 'GURU_GTK',
              nip: teacherNip,
              teacherName: cleanTName,
              subFolder: `[${teacherNip}] ${cleanTName}`,
              kategori: 'FOTO_GTK'
            }
          );
          if (uploadedUrl && (uploadedUrl.url || uploadedUrl.directUrl)) {
            setFotoUrl(uploadedUrl.url || uploadedUrl.directUrl || '');
          }
        } catch (gasErr) {
          console.warn("Cloud Drive upload skipped, using Base64 local/spreadsheet data:", gasErr);
        }
      }
    } catch (err: any) {
      console.error("Gagal mengunggah foto profil:", err);
      alert("Gagal mengunggah foto. Pastikan file berupa gambar (JPG/PNG).");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleExportExcel = () => {
    if (teachers.length === 0) {
      alert("Belum ada data guru / GTK untuk diekspor.");
      return;
    }
    exportTeachersToExcel(filteredTeachers.length > 0 ? filteredTeachers : teachers, `Data_Guru_GTK_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      const parsed = await importTeachersFromExcel(file);
      if (parsed.length === 0) {
        alert("Tidak ada data guru/GTK valid yang ditemukan dalam file Excel tersebut.");
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      const currentTeachers = [...useStore.getState().teachers];

      parsed.forEach(p => {
        if (!p.name) return;
        const pNameLower = String(p.name || '').toLowerCase();
        const existingIdx = currentTeachers.findIndex(t => 
          (p.nip && t.nip && t.nip === p.nip) || 
          (p.nik && t.nik && t.nik === p.nik) || 
          (String(t.name || '').toLowerCase() === pNameLower)
        );

        if (existingIdx !== -1) {
          currentTeachers[existingIdx] = {
            ...currentTeachers[existingIdx],
            ...p,
            updatedAt: new Date().toISOString()
          } as Teacher;
          updatedCount++;
        } else {
          currentTeachers.push({
            id: p.id || crypto.randomUUID(),
            nip: p.nip || '',
            nik: p.nik || '',
            nuptk: p.nuptk || '',
            name: p.name,
            gelar: p.gelar || '',
            gender: p.gender || 'L',
            tempatLahir: p.tempatLahir || '',
            tanggalLahir: p.tanggalLahir || '',
            agama: p.agama || 'Islam',
            alamat: p.alamat || '',
            class: p.class || 'None',
            phone: p.phone || '',
            email: p.email || '',
            pendidikan: p.pendidikan || 'S1',
            jurusan: p.jurusan || '',
            statusKepegawaian: p.statusKepegawaian || 'Tetap',
            tmt: p.tmt || '',
            fotoUrl: p.fotoUrl || '',
            status: p.status || 'Aktif',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          addedCount++;
        }
      });

      useStore.setState({ teachers: currentTeachers });
      await triggerSync(currentTeachers);
      alert(`Berhasil mengimpor data GTK! Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`);
    } catch (err: any) {
      console.error("Gagal mengimpor Excel GTK:", err);
      alert(`Gagal mengimpor file: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'nip' | 'class'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // List of available classes derived from real-time student data
  const classesList = useMemo(() => {
    return getAllClasses(students);
  }, [students]);

  const isTendikRole = (role: string) => {
    const rLower = String(role || '').toLowerCase();
    if (!role || role === 'None' || role === 'Kepala Sekolah' || rLower.includes('kepala')) return false;
    if (classesList.includes(role) || /^[1-6][A-Z]?$/i.test(role.trim())) return false;
    return true;
  };

  // Sync to sheets immediately when data is changed
  const triggerSync = async (updatedTeachers: Teacher[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: useStore.getState().students,
        teachers: updatedTeachers,
        spreadsheetId: settings.spreadsheetId
      });
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e: any) {
      console.error("Auto sync GTK failed:", e);
      throw e;
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setNip('');
    setNik('');
    setNuptk('');
    setName('');
    setGelar('');
    setGender('L');
    setTempatLahir('');
    setTanggalLahir('');
    setAgama('Islam');
    setAlamat('');
    setAssignedClass('None');
    setIsCustomRole(false);
    setCustomRoleInput('');
    setPhone('');
    setEmail('');
    setPendidikan('S1');
    setJurusan('');
    setStatusKepegawaian('Tetap');
    setTmt('');
    setFotoUrl('');
    setStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setNip(t.nip || '');
    setNik(t.nik || '');
    setNuptk(t.nuptk || '');
    setName(t.name || '');
    setGelar(t.gelar || '');
    setGender(t.gender === 'P' ? 'P' : 'L');
    setTempatLahir(t.tempatLahir || '');
    setTanggalLahir(t.tanggalLahir || '');
    setAgama(t.agama || 'Islam');
    setAlamat(t.alamat || '');
    setPhone(t.phone || '');
    setEmail(t.email || '');
    setPendidikan(t.pendidikan || 'S1');
    setJurusan(t.jurusan || '');
    setStatusKepegawaian(t.statusKepegawaian || 'Tetap');
    setTmt(t.tmt || '');
    setFotoUrl(t.fotoUrl || '');
    setStatus(t.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif');

    const isPresetOption = t.class === 'Kepala Sekolah' || t.class === 'None' || classesList.includes(t.class) || TENDIK_PRESETS.includes(t.class);
    if (isPresetOption) {
      setAssignedClass(t.class);
      setIsCustomRole(false);
      setCustomRoleInput('');
    } else {
      setAssignedClass('CUSTOM');
      setIsCustomRole(true);
      setCustomRoleInput(t.class || '');
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Mohon isi Nama Lengkap Guru / GTK!');
      return;
    }

    const finalRole = isCustomRole ? (customRoleInput.trim() || 'Tenaga Kependidikan') : assignedClass;

    let nextTeachers: Teacher[] = [];
    if (editingTeacher) {
      const updated: Partial<Teacher> = {
        nip: nip.trim() || undefined,
        nik: nik.trim() || undefined,
        nuptk: nuptk.trim() || undefined,
        name: trimmedName,
        gelar: gelar.trim() || undefined,
        gender,
        tempatLahir,
        tanggalLahir,
        agama,
        alamat,
        class: finalRole,
        phone,
        email,
        pendidikan,
        jurusan,
        statusKepegawaian,
        tmt,
        fotoUrl,
        status,
        updatedAt: new Date().toISOString()
      };
      updateTeacher(editingTeacher.id, updated);
      const currentTeachers = useStore.getState().teachers;
      nextTeachers = currentTeachers.map(t => {
        const isMatch = t.id === editingTeacher.id || (t.nip && updated.nip && String(t.nip).trim() === String(updated.nip).trim());
        return isMatch ? { ...t, ...updated } : t;
      });
    } else {
      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        nip: nip.trim() || undefined,
        nik: nik.trim() || undefined,
        nuptk: nuptk.trim() || undefined,
        name: trimmedName,
        gelar: gelar.trim() || undefined,
        gender,
        tempatLahir,
        tanggalLahir,
        agama,
        alamat,
        class: finalRole,
        phone,
        email,
        pendidikan,
        jurusan,
        statusKepegawaian,
        tmt,
        fotoUrl,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addTeacher(newTeacher);
      nextTeachers = [...useStore.getState().teachers, newTeacher];
    }
    
    setIsModalOpen(false);
    if (settings.scriptUrl) {
      setSaveSuccessMsg(`Menyimpan "${trimmedName}" ke Google Sheets...`);
      try {
        await triggerSync(nextTeachers);
        setSaveSuccessMsg(`✅ Data GTK "${trimmedName}" berhasil disimpan ke Google Sheets!`);
      } catch (err: any) {
        setSaveSuccessMsg(`⚠️ Tersimpan di aplikasi, gagal sinkron ke Spreadsheet: ${err?.message || ''}`);
      }
    } else {
      setSaveSuccessMsg(`Data GTK "${trimmedName}" berhasil disimpan!`);
    }
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pegawai/guru "${name}"?`)) {
      const remaining = teachers.filter(t => t.id !== id && t.nip !== id);
      deleteTeacher(id);
      if (settings.scriptUrl) {
        try {
          await triggerSync(remaining);
          setSaveSuccessMsg(`Data GTK "${name}" berhasil dihapus dari Google Sheets.`);
          setTimeout(() => setSaveSuccessMsg(''), 4000);
        } catch (e: any) {
          setSaveSuccessMsg(`⚠️ Terhapus di aplikasi, gagal hapus di Sheet: ${e?.message || ''}`);
          setTimeout(() => setSaveSuccessMsg(''), 5000);
        }
      }
    }
  };

  // Filter & Search logic
  const filteredTeachers = useMemo(() => {
    const sTerm = String(searchTerm || '').toLowerCase();
    return teachers.filter(t => {
      if (!t) return false;
      const tClassLower = String(t.class || '').toLowerCase();
      const matchesSearch = 
        String(t.name || '').toLowerCase().includes(sTerm) || 
        String(t.nip || '').includes(searchTerm) || 
        (t.email && String(t.email).toLowerCase().includes(sTerm)) ||
        (t.class && tClassLower.includes(sTerm));
      
      const matchesStatus = statusFilter === 'Semua' || t.status === statusFilter;
      
      let matchesClass = true;
      if (classFilter === 'Kepala Sekolah') {
        matchesClass = t.class === 'Kepala Sekolah' || tClassLower.includes('kepala');
      } else if (classFilter === 'Guru') {
        matchesClass = !isTendikRole(t.class);
      } else if (classFilter === 'Wali Kelas') {
        matchesClass = t.class !== 'None' && t.class !== 'Kepala Sekolah' && !tClassLower.includes('kepala') && !isTendikRole(t.class);
      } else if (classFilter === 'None') {
        matchesClass = t.class === 'None';
      } else if (classFilter === 'Tendik') {
        matchesClass = isTendikRole(t.class);
      } else if (classFilter !== 'Semua') {
        matchesClass = t.class === classFilter;
      }
      
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [teachers, searchTerm, statusFilter, classFilter, classesList]);

  // Sort logic
  const sortedTeachers = useMemo(() => {
    return [...filteredTeachers].sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'class') {
        aVal = a.class === 'None' ? 'ZZZ' : a.class;
        bVal = b.class === 'None' ? 'ZZZ' : b.class;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTeachers, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedTeachers.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTeachers = useMemo(() => {
    return sortedTeachers.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [sortedTeachers, safePage, pageSize]);

  const toggleSort = (field: 'name' | 'nip' | 'class') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderRoleBadge = (role: string) => {
    const rLower = String(role || '').toLowerCase();
    if (!role || role === 'None') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck size={13} className="text-blue-500" />
          Guru Mapel
        </span>
      );
    }
    if (role === 'Kepala Sekolah' || rLower.includes('kepala')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
          <Award size={13} className="text-amber-600" />
          Kepala Sekolah
        </span>
      );
    }
    if (rLower.includes('operator')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Laptop size={13} className="text-purple-600" />
          {role}
        </span>
      );
    }
    if (rLower.includes('penjaga')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Key size={13} className="text-orange-600" />
          {role}
        </span>
      );
    }
    if (rLower.includes('satpam') || rLower.includes('keamanan')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
          <Shield size={13} className="text-slate-600" />
          {role}
        </span>
      );
    }
    if (rLower.includes('bersih') || rLower.includes('kebersihan')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Sparkles size={13} className="text-emerald-600" />
          {role}
        </span>
      );
    }
    if (rLower.includes('administrasi') || rLower.includes('tu') || rLower.includes('tata usaha')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
          <FileText size={13} className="text-cyan-600" />
          {role}
        </span>
      );
    }
    if (rLower.includes('perpus') || rLower.includes('pustaka')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
          <BookOpen size={13} className="text-teal-600" />
          {role}
        </span>
      );
    }
    if (classesList.includes(role) || /^[1-6][A-Z]?$/i.test(role)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
          <GraduationCap size={13} className="text-indigo-600" />
          Wali Kelas {role}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">
        <Briefcase size={13} className="text-violet-600" />
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>✅ {saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900 flex items-center gap-3">
            <GraduationCap className="text-indigo-600" size={32} />
            Data Guru & Tenaga Kependidikan (GTK)
          </h2>
          <p className="text-gray-500 mt-1 font-medium">Kelola data seluruh pendidik (Guru) dan tenaga kependidikan (Operator, Penjaga, Satpam, Kebersihan, TU).</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button 
            onClick={handleOpenAddModal}
            className="btn flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 duration-150 text-xs sm:text-sm font-bold w-full sm:w-auto"
          >
            <Plus size={16} />
            <span className="truncate">Tambah GTK</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Pegawai / GTK</p>
            <p className="text-xl font-black text-indigo-950">{teachers.length} <span className="text-xs font-normal text-gray-500">Orang</span></p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Guru / Pengajar</p>
            <p className="text-xl font-black text-amber-700">
              {teachers.filter(t => !isTendikRole(t.class)).length} <span className="text-xs font-normal text-gray-500">Orang</span>
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tenaga Kependidikan</p>
            <p className="text-xl font-black text-purple-700">
              {teachers.filter(t => isTendikRole(t.class)).length} <span className="text-xs font-normal text-gray-500">Staff</span>
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Status Aktif</p>
            <p className="text-xl font-black text-emerald-700">
              {teachers.filter(t => t.status === 'Aktif').length} <span className="text-xs font-normal text-gray-500">Orang</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari NIK, nama, atau jabatan..." 
              className="input pl-11 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full">
            <CustomDropdown
              id="teachers-filter-status"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'Semua', label: 'Semua Status' },
                { value: 'Aktif', label: 'Aktif', badge: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' }
              ]}
              placeholder="Semua Status"
              icon={<Filter size={15} />}
            />
          </div>

          {/* Class / Jabatan Filter */}
          <div className="w-full">
            <CustomDropdown
              id="teachers-filter-class"
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              options={[
                { value: 'Semua', label: 'Semua Jabatan / Tugas' },
                { value: 'Kepala Sekolah', label: '⭐ Kepala Sekolah' },
                { value: 'Guru', label: '📘 Semua Pendidik / Guru' },
                { value: 'Wali Kelas', label: '🏫 Semua Wali Kelas' },
                { value: 'None', label: 'Guru Mapel' },
                { value: 'Tendik', label: '💼 Semua Tenaga Kependidikan' },
                ...TENDIK_PRESETS.map((preset) => ({
                  value: preset,
                  label: `— ${preset}`
                })),
                ...classesList.map((c) => ({
                  value: c,
                  label: `— Wali Kelas ${c}`
                }))
              ]}
              placeholder="Semua Jabatan / Tugas"
              icon={<GraduationCap size={15} />}
              searchable
            />
          </div>

        </div>
      </div>

      {/* Teachers List Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-indigo-100">
            <thead>
              <tr className="border-b border-indigo-100 bg-indigo-50/40 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <th className="p-4 text-center w-12 border border-indigo-100">No</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('nip')}>
                  NIK {sortBy === 'nip' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('name')}>
                  Nama Lengkap {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">L/P</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('class')}>
                  Jabatan / Penugasan {sortBy === 'class' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">Kontak</th>
                <th className="p-4 text-center border border-indigo-100">Status</th>
                <th className="p-4 text-center w-28 border border-indigo-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50 text-sm">
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-medium border border-indigo-100">
                    Tidak ada data guru atau tenaga kependidikan yang ditemukan
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((t, idx) => {
                  const itemIndex = (safePage - 1) * pageSize + idx + 1;
                  return (
                  <tr key={t.id ? `teacher-${t.id}-${idx}` : `teacher-${t.nik || t.nip || idx}-${idx}`} className="hover:bg-white/40 transition">
                    <td className="p-4 text-center font-semibold text-gray-400 border border-indigo-100">{itemIndex}</td>
                    <td className="p-4 font-mono font-medium text-gray-700 border border-indigo-100">{t.nik || t.nip || '-'}</td>
                    <td className="p-4 font-bold text-gray-900 border border-indigo-100">{t.name}</td>
                    <td className="p-4 text-gray-600 border border-indigo-100 font-bold text-center">
                      {t.gender}
                    </td>
                    <td className="p-4 border border-indigo-100">
                      {renderRoleBadge(t.class)}
                    </td>
                    <td className="p-4 space-y-1 text-xs border border-indigo-100">
                      {t.phone && (
                        <div className="flex items-center gap-1 text-gray-600 font-medium">
                          <Phone size={12} className="text-indigo-400" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Mail size={12} className="text-indigo-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                      {!t.phone && !t.email && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.status === 'Aktif' ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <div className="flex justify-center items-center gap-1.5">
                        <button 
                          onClick={() => setViewingTeacher(t)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          title="Lihat Detail Profil GTK"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Data GTK"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Data GTK"
                        >
                          <Trash2 size={16} />
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

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={sortedTeachers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="guru & staf GTK"
        />
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">{editingTeacher ? 'Edit Data Pegawai / GTK' : 'Tambah GTK Baru'}</h3>
                  <p className="text-xs text-indigo-100">Sesuai Format Master Database Sheet GURU & Dapodik</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    ⚠️ {formError}
                  </span>
                  <button type="button" onClick={() => setFormError('')} className="text-rose-400 hover:text-rose-600 p-1">✕</button>
                </div>
              )}
              
              {/* Section 1: Identitas Pegawai */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-indigo-600" />
                  Identitas Pokok Pegawai
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">NIK (16 Digit)</label>
                    <input 
                      type="text" 
                      className="input font-mono text-xs" 
                      placeholder="31730..." 
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">NIP (Opsional)</label>
                    <input 
                      type="text" 
                      className="input font-mono text-xs" 
                      placeholder="1980..." 
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">NUPTK (Opsional)</label>
                    <input 
                      type="text" 
                      className="input font-mono text-xs" 
                      placeholder="16 Digit NUPTK" 
                      value={nuptk}
                      onChange={(e) => setNuptk(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      className="input font-bold text-xs" 
                      placeholder="Contoh: Muhammad Yusuf" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Gelar Akademik</label>
                    <input 
                      type="text" 
                      className="input text-xs" 
                      placeholder="S.Pd. / M.Pd." 
                      value={gelar}
                      onChange={(e) => setGelar(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <CustomDropdown
                      id="modal-teacher-gender"
                      label="Jenis Kelamin"
                      value={gender}
                      onChange={(val) => setGender(val as any)}
                      options={[
                        { value: 'L', label: 'Laki-laki (L)' },
                        { value: 'P', label: 'Perempuan (P)' }
                      ]}
                      placeholder="Pilih Gender"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Tempat Lahir</label>
                    <input 
                      type="text" 
                      className="input text-xs" 
                      placeholder="Jakarta" 
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Tanggal Lahir</label>
                    <input 
                      type="date" 
                      className="input text-xs" 
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <CustomDropdown
                      id="modal-teacher-agama"
                      label="Agama"
                      value={agama}
                      onChange={(val) => setAgama(val)}
                      options={[
                        { value: 'Islam', label: 'Islam' },
                        { value: 'Kristen', label: 'Kristen' },
                        { value: 'Katolik', label: 'Katolik' },
                        { value: 'Hindu', label: 'Hindu' },
                        { value: 'Buddha', label: 'Buddha' },
                        { value: 'Konghucu', label: 'Konghucu' }
                      ]}
                      placeholder="Pilih Agama"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Alamat Domisili</label>
                    <input 
                      type="text" 
                      className="input text-xs" 
                      placeholder="Jl. Tambora No..." 
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Penugasan & Kepegawaian */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-600" />
                  Jabatan, Tugas & Kepegawaian
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <CustomDropdown
                      id="modal-teacher-role"
                      label="Jabatan / Penugasan *"
                      value={isCustomRole ? 'CUSTOM' : assignedClass}
                      onChange={(val) => {
                        if (val === 'CUSTOM') {
                          setIsCustomRole(true);
                        } else {
                          setIsCustomRole(false);
                          setAssignedClass(val);
                        }
                      }}
                      options={[
                        { value: 'Kepala Sekolah', label: '⭐ Kepala Sekolah' },
                        { value: 'None', label: '📘 Guru Mapel (Pengajar)' },
                        ...classesList.map((c) => ({
                          value: c,
                          label: `🏫 Wali Kelas ${c}`
                        })),
                        ...TENDIK_PRESETS.map((preset) => ({
                          value: preset,
                          label: preset
                        })),
                        { value: 'CUSTOM', label: '✏️ Jabatan / Tugas Lainnya...' }
                      ]}
                      placeholder="Pilih Jabatan"
                      searchable
                    />
                  </div>

                  <div>
                    <CustomDropdown
                      id="modal-teacher-kepegawaian"
                      label="Status Kepegawaian"
                      value={statusKepegawaian}
                      onChange={(val) => setStatusKepegawaian(val)}
                      options={[
                        { value: 'Tetap', label: 'Guru / Pegawai Tetap Yayasan' },
                        { value: 'Honorer', label: 'Honorer / Kontrak' },
                        { value: 'GTT', label: 'GTT (Guru Tidak Tetap)' },
                        { value: 'GTY', label: 'GTY (Guru Tetap Yayasan)' },
                        { value: 'PNS', label: 'PNS Diperbantukan' },
                        { value: 'PPPK', label: 'PPPK' }
                      ]}
                      placeholder="Pilih Status Kepegawaian"
                    />
                  </div>
                </div>

                {isCustomRole && (
                  <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                    <label className="label text-amber-900 font-bold text-xs">Ketik Nama Jabatan / Tugas</label>
                    <input 
                      type="text" 
                      className="input bg-white font-bold text-xs" 
                      placeholder="Contoh: Pembina Pramuka / Teknisi Lab"
                      value={customRoleInput}
                      onChange={(e) => setCustomRoleInput(e.target.value)}
                      required={isCustomRole}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <CustomDropdown
                      id="modal-teacher-pendidikan"
                      label="Pendidikan Terakhir"
                      value={pendidikan}
                      onChange={(val) => setPendidikan(val)}
                      options={[
                        { value: 'SMA/SMK', label: 'SMA / SMK' },
                        { value: 'D3', label: 'Diploma 3 (D3)' },
                        { value: 'S1', label: 'Sarjana (S1)' },
                        { value: 'S2', label: 'Magister (S2)' },
                        { value: 'S3', label: 'Doktor (S3)' }
                      ]}
                      placeholder="Pendidikan"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Jurusan / Program Studi</label>
                    <input 
                      type="text" 
                      className="input text-xs" 
                      placeholder="Pendidikan Matematika / TI" 
                      value={jurusan}
                      onChange={(e) => setJurusan(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">TMT (Tgl Mulai Tugas)</label>
                    <input 
                      type="date" 
                      className="input text-xs" 
                      value={tmt}
                      onChange={(e) => setTmt(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Kontak & Media Foto */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={14} className="text-indigo-600" />
                  Kontak, Foto Profil & Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">No. Telepon / WhatsApp</label>
                    <input 
                      type="tel" 
                      className="input text-xs" 
                      placeholder="08123456789" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Email</label>
                    <input 
                      type="email" 
                      className="input text-xs" 
                      placeholder="nama@sekolah.sch.id" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label text-xs">Foto Profil / Pasfoto GTK</label>
                  <input 
                    type="file" 
                    ref={photoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative flex-shrink-0 shadow-2xs">
                      {fotoUrl ? (
                        <img 
                          src={getGoogleDriveDirectImageUrl(fotoUrl)} 
                          alt="Foto Profil" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-slate-400" />
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
                        >
                          <Upload size={13} />
                          <span>{fotoUrl ? 'Ganti Foto' : 'Upload Pasfoto'}</span>
                        </button>
                        {fotoUrl && (
                          <button
                            type="button"
                            onClick={() => setFotoUrl('')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Format gambar: JPG, JPEG, atau PNG (Maks. 5MB).
                      </p>
                    </div>

                    <div className="w-40">
                      <CustomDropdown
                        id="modal-teacher-status"
                        label="Status Keaktifan"
                        value={status}
                        onChange={(val) => setStatus(val as any)}
                        options={[
                          { value: 'Aktif', label: 'Aktif', badge: 'Aktif' },
                          { value: 'Nonaktif', label: 'Nonaktif' }
                        ]}
                        placeholder="Status"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-semibold text-sm transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Save size={16} />
                  <span>Simpan Data GTK</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detail Profil GTK */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <UserCheck size={22} className="text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    Detail Lengkap Profil GTK
                  </h3>
                  <p className="text-xs text-indigo-200">
                    {viewingTeacher.name} {viewingTeacher.gelar ? `(${viewingTeacher.gelar})` : ''} • {viewingTeacher.class || 'GTK'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTeacher(null)}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-20 h-24 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 relative">
                {viewingTeacher.fotoUrl ? (
                  <img 
                    src={getGoogleDriveDirectImageUrl(viewingTeacher.fotoUrl)} 
                    alt={viewingTeacher.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-black text-indigo-300">{viewingTeacher.name[0]}</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-xl font-extrabold text-slate-900">{viewingTeacher.name}</h4>
                  {viewingTeacher.gelar && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-lg">{viewingTeacher.gelar}</span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    {viewingTeacher.class || 'GTK / Staff'}
                  </span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold",
                    viewingTeacher.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  )}>
                    {viewingTeacher.status || 'Aktif'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500">
                  NIP: <strong>{viewingTeacher.nip || '-'}</strong> | NIK: <strong>{viewingTeacher.nik || '-'}</strong> | NUPTK: <strong>{viewingTeacher.nuptk || '-'}</strong>
                </p>
                <p className="text-xs text-slate-600">
                  {viewingTeacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {viewingTeacher.tempatLahir ? `${viewingTeacher.tempatLahir}, ` : ''}{viewingTeacher.tanggalLahir || '-'} • Agama: {viewingTeacher.agama || 'Islam'}
                </p>
              </div>
            </div>

            {/* Profile Detail Grid */}
            <div className="px-6 py-2 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                    <Briefcase size={14} className="text-indigo-600" /> Kepegawaian & Penugasan
                  </h5>
                  <p><strong className="text-slate-500">Status Pegawai:</strong> {viewingTeacher.statusPegawai || 'GTY / Tetap Yayasan'}</p>
                  <p><strong className="text-slate-500">Mata Pelajaran:</strong> {viewingTeacher.mapel || viewingTeacher.subject || '-'}</p>
                  <p><strong className="text-slate-500">Tugas / Jabatan:</strong> {viewingTeacher.class || 'Pendidik / Tutor'}</p>
                  <p><strong className="text-slate-500">Pendidikan Terakhir:</strong> {viewingTeacher.pendidikanTerakhir || viewingTeacher.pendidikan || 'S1'}</p>
                  <p><strong className="text-slate-500">Tanggal Mulai Tugas:</strong> {viewingTeacher.tanggalMasuk || '-'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                    <Phone size={14} className="text-indigo-600" /> Kontak & Alamat
                  </h5>
                  <p><strong className="text-slate-500">No. HP / WhatsApp:</strong> {viewingTeacher.phone || '-'}</p>
                  <p><strong className="text-slate-500">Email:</strong> {viewingTeacher.email || '-'}</p>
                  <p><strong className="text-slate-500">Alamat Rumah:</strong> {viewingTeacher.alamat || '-'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const t = viewingTeacher;
                  setViewingTeacher(null);
                  handleDelete(t.id, t.name);
                }}
                className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200 shadow-sm cursor-pointer"
              >
                <Trash2 size={14} /> Hapus GTK
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = viewingTeacher;
                    setViewingTeacher(null);
                    handleOpenEditModal(t);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Edit2 size={14} /> Edit Data GTK
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTeacher(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

