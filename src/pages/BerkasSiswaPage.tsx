import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import TablePagination from '../components/common/TablePagination';
import { 
  cn, 
  matchClass, 
  getAllClasses, 
  formatClassLabel, 
  STANDARD_CLASSES,
  getGoogleDriveDirectImageUrl
} from '../lib/utils';
import { 
  FolderOpen, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Download, 
  Eye, 
  X, 
  Printer, 
  User, 
  FileCheck, 
  FileText, 
  CloudUpload,
  Sparkles, 
  Layers, 
  ShieldCheck, 
  LayoutGrid, 
  ListFilter, 
  Check, 
  TrendingUp,
  FileSpreadsheet,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { exportToExcel } from '../lib/excel';
import CustomDropdown from '../components/common/CustomDropdown';

// Re-export core rules and helpers for other components (e.g. StudentsList.tsx)
export { 
  STUDENT_DOC_CONFIGS, 
  isAyahDeceased, 
  isIbuDeceased, 
  isGrade7To12, 
  getStudentDocRequirement, 
  getStudentDocValue, 
  getStudentCompleteness 
} from '../lib/berkasRules';
export type { DocItemConfig } from '../lib/berkasRules';

import { 
  STUDENT_DOC_CONFIGS, 
  getStudentCompleteness, 
  getStudentDocRequirement, 
  getStudentDocValue,
  isAyahDeceased,
  isIbuDeceased,
  isGrade7To12
} from '../lib/berkasRules';

import BerkasStudentCard from '../components/berkas/BerkasStudentCard';
import BerkasModalVault from '../components/berkas/BerkasModalVault';
import BerkasPreviewModal from '../components/berkas/BerkasPreviewModal';

export default function BerkasSiswaPage() {
  const { students } = useStore();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTahunMasuk, setFilterTahunMasuk] = useState('');
  const [filterStatus, setFilterStatus] = useState<'incomplete' | 'all' | 'complete'>('incomplete');
  const [filterStudentStatus, setFilterStudentStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'percent-asc' | 'percent-desc' | 'class'>('percent-asc');

  // View Mode: Bento Grid vs Table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; studentName: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterTahunMasuk, filterStatus, filterStudentStatus, sortBy, viewMode]);

  // Available classes
  const availableClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(students), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Available entry years
  const availableTahunMasuk = useMemo(() => {
    const yearsSet = new Set<string>();
    students.forEach((s: any) => {
      const raw = String(s.tahunMasuk || s['TahunMasuk'] || s['ThnMasuk'] || s['tahun_masuk'] || '').trim();
      if (raw && raw !== '-' && raw !== 'null' && raw !== 'undefined') {
        const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
        if (match) yearsSet.add(match[1]);
        else yearsSet.add(raw);
      }
    });
    [2027, 2026, 2025, 2024, 2023].forEach(y => yearsSet.add(String(y)));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Status Siswa filter
      if (filterStudentStatus !== 'ALL') {
        const st = String(student.status || 'Aktif').toLowerCase().trim();
        if (filterStudentStatus === 'Aktif') {
          if (st.includes('tidak') || st === 'nonaktif' || st.includes('belum') || st === 'pindah' || st === 'lulus' || st === 'keluar') return false;
        } else if (filterStudentStatus === 'Tidak Aktif') {
          if (!st.includes('tidak') && st !== 'nonaktif') return false;
        } else if (filterStudentStatus === 'Belum') {
          if (!st.includes('belum') && !st.includes('pending')) return false;
        } else if (filterStudentStatus === 'Pindah') {
          if (st !== 'pindah' && !st.includes('mutasi')) return false;
        } else if (filterStudentStatus === 'Lulus') {
          if (st !== 'lulus') return false;
        } else if (filterStudentStatus === 'Keluar') {
          if (st !== 'keluar' && !st.includes('do')) return false;
        }
      }

      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        student.name.toLowerCase().includes(search) ||
        (student.nis && student.nis.toLowerCase().includes(search)) ||
        (student.nisn && student.nisn.toLowerCase().includes(search)) ||
        (student.parentName && student.parentName.toLowerCase().includes(search));

      // Class
      const matchesClass = filterClass ? matchClass(student.class, filterClass) : true;

      // Tahun Masuk
      const rawYr = String(student.tahunMasuk || student.TahunMasuk || (student as any)['ThnMasuk'] || (student as any)['tahun_masuk'] || '').trim();
      const matchYr = rawYr.match(/\b(20\d{2}|19\d{2})\b/);
      const normalizedYr = matchYr ? matchYr[1] : rawYr;
      const matchesTahun = !filterTahunMasuk || normalizedYr === filterTahunMasuk;

      // Completeness Status
      const stats = getStudentCompleteness(student);
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'complete' ? stats.isComplete :
        !stats.isComplete;

      return matchesSearch && matchesClass && matchesTahun && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'percent-asc') {
        return getStudentCompleteness(a).percent - getStudentCompleteness(b).percent;
      }
      if (sortBy === 'percent-desc') {
        return getStudentCompleteness(b).percent - getStudentCompleteness(a).percent;
      }
      if (sortBy === 'class') {
        return (a.class || '').localeCompare(b.class || '', undefined, { numeric: true });
      }
      return 0;
    });
  }, [students, filterStudentStatus, searchTerm, filterClass, filterTahunMasuk, filterStatus, sortBy]);

  // Overall Statistics
  const totalStudents = students.length;
  const completeCount = useMemo(() => students.filter(s => getStudentCompleteness(s).isComplete).length, [students]);
  const incompleteCount = totalStudents - completeCount;
  const overallPercentage = totalStudents > 0 ? Math.round((completeCount / totalStudents) * 100) : 0;
  const totalUploadedDocs = useMemo(() => students.reduce((acc, s) => acc + getStudentCompleteness(s).uploadedCount, 0), [students]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredStudents, safePage, pageSize]);

  // Export to Excel
  const handleExportRecap = () => {
    const dataToExport = filteredStudents.map((s, idx) => {
      const stats = getStudentCompleteness(s);
      return {
        'No': idx + 1,
        'NIS': s.nis || '-',
        'NISN': s.nisn || '-',
        'Nama Siswa': s.name,
        'Kelas': s.class || '-',
        'Status Berkas (Cerdas)': stats.isComplete ? 'LENGKAP' : 'BELUM LENGKAP',
        'Kelengkapan Wajib (%)': `${stats.percent}%`,
        'Wajib Terunggah': `${stats.requiredUploaded}/${stats.requiredTotal}`,
        'Total Berkas': `${stats.uploadedCount}/${stats.totalPossible}`,
        '1. Pas Foto (3x4)': getStudentDocValue(s, 'fotoUrl') ? 'ADA' : 'BELUM',
        '2. Akta Kelahiran': getStudentDocValue(s, 'aktaKelahiranUrl') ? 'ADA' : 'BELUM',
        '3. Kartu Keluarga': getStudentDocValue(s, 'kartuKeluargaUrl') ? 'ADA' : 'BELUM',
        '4. KIA / KTP Anak': getStudentDocValue(s, 'kiaUrl') ? 'ADA' : 'BELUM',
        '5. KTP Ayah': getStudentDocValue(s, 'ktpAyahUrl') ? 'ADA' : isAyahDeceased(s) ? 'ALMARHUM (TIDAK WAJIB)' : 'BELUM',
        '6. KTP Ibu': getStudentDocValue(s, 'ktpIbuUrl') ? 'ADA' : isIbuDeceased(s) ? 'ALMARHUMAH (TIDAK WAJIB)' : 'BELUM',
        '7. Ijazah / SKL': getStudentDocValue(s, 'ijazahUrl') ? 'ADA' : isGrade7To12(s.class) ? 'BELUM (WAJIB)' : 'BELUM (SD/OPSIONAL)',
        '8. KTP Wali': getStudentDocValue(s, 'ktpWaliUrl') ? 'ADA' : (isAyahDeceased(s) || isIbuDeceased(s)) ? 'BELUM (WAJIB)' : 'TIDAK WAJIB',
        '9. Buku Rapor': getStudentDocValue(s, 'raporUrl') ? 'ADA' : 'BELUM',
        '10. Surat Pindah': getStudentDocValue(s, 'suratPindahUrl') ? 'ADA' : 'BELUM',
        '11. Surat Keterangan': getStudentDocValue(s, 'suKetUrl') ? 'ADA' : 'BELUM',
        '12. Surat Domisili': getStudentDocValue(s, 'suratDomisiliUrl') ? 'ADA' : 'BELUM',
        '13. Form Pendaftaran': getStudentDocValue(s, 'formPendaftaranUrl') ? 'ADA' : 'BELUM',
        '14. Surat Pernyataan': getStudentDocValue(s, 'suratPernyataanUrl') ? 'ADA' : 'BELUM',
        '15. Surat Kesanggupan': getStudentDocValue(s, 'suratKesanggupanUrl') ? 'ADA' : 'BELUM',
        '16. Berkas Lainnya': getStudentDocValue(s, 'berkasLainnyaUrl') ? 'ADA' : 'BELUM',
        'Berkas Tambahan (Custom)': Array.isArray(s.customDocs) && s.customDocs.length > 0 
          ? s.customDocs.map(c => c.name).join(', ') 
          : '-'
      };
    });

    exportToExcel(dataToExport, `Rekap_Berkas_Dokumen_Siswa_${filterClass || 'Semua_Kelas'}_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Berkas Siswa');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 animate-in fade-in duration-300">
      {/* 1. HERO HEADER WITH HEALTH GAUGE & ACTIONS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-7 rounded-3xl border border-slate-700/80 shadow-xl">
        {/* Glow Effects */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-amber-500/20">
              <FolderOpen size={28} className="text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Berkas Dokumen Siswa - Berkas Resmi
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1">
                  <Sparkles size={11} className="text-emerald-400" />
                  <span>Logika Cerdas Aktif</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Manajemen digital berkas resmi siswa (16 Jenis Dokumen & Berkas Tambahan) dengan validasi otomatis kondisi keluarga dan jenjang kelas.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-inner">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                  viewMode === 'grid' ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
                )}
                title="Tampilan Galeri Kartu Siswa"
              >
                <LayoutGrid size={14} />
                <span>Kartu Visual</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                  viewMode === 'table' ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
                )}
                title="Tampilan Tabel Matriks Dokumen"
              >
                <ListFilter size={14} />
                <span>Tabel Matriks</span>
              </button>
            </div>

            <button
              onClick={handleExportRecap}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
              title="Download Rekap Kelengkapan Berkas Excel"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS & ANALYTICS BENTO CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Incomplete Card (Interactive) */}
        <div 
          onClick={() => setFilterStatus('incomplete')}
          className={cn(
            "p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-98 relative overflow-hidden flex flex-col justify-between",
            filterStatus === 'incomplete' 
              ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400" 
              : "bg-white text-slate-800 border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/20"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider", filterStatus === 'incomplete' ? "text-amber-100" : "text-amber-700")}>
              Kurang Berkas Wajib
            </span>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs", filterStatus === 'incomplete' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700")}>
              <AlertCircle size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              <span>{incompleteCount}</span>
              <span className={cn("text-xs sm:text-sm font-bold ml-1.5", filterStatus === 'incomplete' ? "text-amber-100" : "text-slate-400")}>
                Siswa
              </span>
            </div>
            <p className={cn("text-[11px] mt-1 font-medium truncate", filterStatus === 'incomplete' ? "text-amber-100" : "text-slate-500")}>
              Prioritas dilengkapi segera
            </p>
          </div>
        </div>

        {/* Complete Card (Interactive) */}
        <div 
          onClick={() => setFilterStatus('complete')}
          className={cn(
            "p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-98 relative overflow-hidden flex flex-col justify-between",
            filterStatus === 'complete' 
              ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400" 
              : "bg-white text-slate-800 border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/20"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider", filterStatus === 'complete' ? "text-emerald-100" : "text-emerald-700")}>
              Lengkap Cerdas
            </span>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs", filterStatus === 'complete' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              <span>{completeCount}</span>
              <span className={cn("text-xs sm:text-sm font-bold ml-1.5", filterStatus === 'complete' ? "text-emerald-100" : "text-slate-400")}>
                ({overallPercentage}%)
              </span>
            </div>
            <p className={cn("text-[11px] mt-1 font-medium truncate", filterStatus === 'complete' ? "text-emerald-100" : "text-slate-500")}>
              Semua berkas wajib terpenuhi
            </p>
          </div>
        </div>

        {/* Total Students Card (Interactive) */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={cn(
            "p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-98 relative overflow-hidden flex flex-col justify-between",
            filterStatus === 'all' 
              ? "bg-gradient-to-br from-indigo-600 to-slate-800 text-white border-indigo-600 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400" 
              : "bg-white text-slate-800 border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/20"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider", filterStatus === 'all' ? "text-indigo-100" : "text-slate-600")}>
              Semua Siswa
            </span>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs", filterStatus === 'all' ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700")}>
              <User size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              <span>{totalStudents}</span>
              <span className={cn("text-xs sm:text-sm font-bold ml-1.5", filterStatus === 'all' ? "text-indigo-100" : "text-slate-400")}>
                Terdaftar
              </span>
            </div>
            <p className={cn("text-[11px] mt-1 font-medium truncate", filterStatus === 'all' ? "text-indigo-100" : "text-slate-500")}>
              Total keseluruhan siswa aktif
            </p>
          </div>
        </div>

        {/* Total Uploaded Documents */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-600">
              Dokumen Terarsip
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <FileCheck size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              <span>{totalUploadedDocs}</span>
              <span className="text-xs sm:text-sm text-slate-400 font-bold ml-1.5">Berkas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
              Tersimpan aman di Google Drive
            </p>
          </div>
        </div>
      </div>

      {/* 3. SMART LOGIC GUIDELINES BANNER */}
      <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 p-4 sm:p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Pedoman Validasi Berkas Cerdas & Kondisi Keluarga
              </h3>
              <p className="text-[11px] text-slate-600">
                Sistem secara otomatis menyesuaikan syarat berkas wajib sesuai jenjang kelas & status orang tua
              </p>
            </div>
          </div>
          <span className="text-[10px] px-3 py-1 rounded-full bg-white text-slate-800 font-extrabold border border-amber-200 shadow-2xs">
            16 Berkas Resmi Sistem
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-2 rounded-2xl border border-emerald-100 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-slate-700"><strong>Pas Foto, Akta, KK:</strong> Wajib Semua Siswa</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-2 rounded-2xl border border-sky-100 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0" />
            <span className="text-slate-700"><strong>KTP Ayah & Ibu:</strong> Wajib jika Masih Hidup</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-2 rounded-2xl border border-purple-100 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
            <span className="text-slate-700"><strong>Ijazah:</strong> Wajib Kelas 7-12 (SD Opsional)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-2 rounded-2xl border border-indigo-100 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="text-slate-700"><strong>KTP Wali:</strong> Wajib jika Ortu Meninggal</span>
          </div>
        </div>
      </div>

      {/* 4. FILTER, SEARCH & SORT CONTROL BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, NISN, atau nama wali..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters Suite */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Siswa Filter */}
            <div className="w-44">
              <CustomDropdown
                id="berkas-filter-status"
                value={filterStudentStatus}
                onChange={(val) => setFilterStudentStatus(val)}
                options={[
                  { value: 'ALL', label: 'Status: Semua' },
                  { value: 'Aktif', label: 'Aktif', badge: 'Aktif' },
                  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
                  { value: 'Belum', label: 'Belum' },
                  { value: 'Pindah', label: 'Pindah' },
                  { value: 'Lulus', label: 'Lulus' },
                  { value: 'Keluar', label: 'Keluar' }
                ]}
                placeholder="Status: Semua"
              />
            </div>

            {/* Rombel Class Filter */}
            <div className="w-48">
              <CustomDropdown
                id="berkas-filter-class"
                value={filterClass}
                onChange={(val) => setFilterClass(val)}
                options={[
                  { value: '', label: `Kelas: Semua (${availableClasses.length} Rombel)` },
                  ...availableClasses.map(c => ({
                    value: c,
                    label: formatClassLabel(c, true)
                  }))
                ]}
                placeholder="Pilih Kelas..."
                searchable
              />
            </div>

            {/* Tahun Masuk Filter */}
            <div className="w-44">
              <CustomDropdown
                id="berkas-filter-tahun-masuk"
                value={filterTahunMasuk}
                onChange={(val) => setFilterTahunMasuk(val)}
                options={[
                  { value: '', label: 'Angkatan: Semua' },
                  ...availableTahunMasuk.map(y => ({
                    value: y,
                    label: `Tahun ${y}`
                  }))
                ]}
                placeholder="Angkatan: Semua"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-56">
              <CustomDropdown
                id="berkas-filter-sort"
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'percent-asc', label: 'Kelengkapan Rendah (Prioritas)' },
                  { value: 'percent-desc', label: 'Kelengkapan Tinggi' },
                  { value: 'name-asc', label: 'Nama Siswa (A - Z)' },
                  { value: 'name-desc', label: 'Nama Siswa (Z - A)' },
                  { value: 'class', label: 'Kelas' }
                ]}
                placeholder="Urutkan..."
                icon={<ArrowUpDown size={14} />}
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Status Tabs */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus('incomplete')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
                filterStatus === 'incomplete' 
                  ? "bg-amber-500 text-slate-950 font-black shadow-xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <AlertCircle size={13} />
              <span>Kurang Berkas Wajib ({incompleteCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('complete')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
                filterStatus === 'complete' 
                  ? "bg-emerald-600 text-white font-black shadow-xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <CheckCircle2 size={13} />
              <span>Lengkap Cerdas ({completeCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
                filterStatus === 'all' 
                  ? "bg-indigo-600 text-white font-black shadow-xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Layers size={13} />
              <span>Semua Siswa ({totalStudents})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-800 font-bold">{filteredStudents.length}</strong> siswa
          </div>
        </div>
      </div>

      {/* 5. MAIN CONTENT DISPLAY: BENTO GRID VIEW OR TABLE VIEW */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              {filterStatus === 'incomplete' 
                ? 'Luar Biasa! Semua Berkas Siswa Lengkap' 
                : 'Tidak ada data siswa ditemukan'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {filterStatus === 'incomplete' 
                ? 'Tidak ada siswa dengan kekurangan berkas wajib pada filter saat ini. Anda dapat beralih ke tab "Semua Siswa" untuk melihat seluruh arsip.' 
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter kelas/status di atas.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* BENTO GRID / CARD GALLERY VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {paginatedStudents.map((student) => (
              <BerkasStudentCard
                key={student.id}
                student={student}
                onOpenVault={setSelectedStudent}
                onPreviewDoc={setPreviewDoc}
              />
            ))}
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="siswa"
          />
        </div>
      ) : (
        /* SPREADSHEET MATRIX TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div className="text-xs font-bold text-slate-700">
              Daftar <span className="text-amber-600 font-extrabold">{filteredStudents.length}</span> Siswa
              {filterClass ? ` di ${formatClassLabel(filterClass, true)}` : ''}
            </div>
            <div className="text-xs text-slate-400">
              Klik chip dokumen untuk preview atau klik Kelola untuk upload
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5 w-12 text-center">No</th>
                  <th className="p-3.5 min-w-[220px]">Profil Siswa</th>
                  <th className="p-3.5 text-center w-24">Kelas</th>
                  <th className="p-3.5 text-center min-w-[160px]">Status Kelengkapan</th>
                  <th className="p-3.5 min-w-[360px]">Matriks 16 Dokumen Resmi & Tambahan</th>
                  <th className="p-3.5 pr-5 text-right w-36">Aksi Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((student, idx) => {
                  const stats = getStudentCompleteness(student);
                  const itemIndex = (safePage - 1) * pageSize + idx + 1;
                  const customDocsList = Array.isArray(student.customDocs) ? student.customDocs : [];
                  const photoUrl = getStudentDocValue(student, 'fotoUrl') || student.fotoUrl || student.pasFoto || (student as any).PasFoto || (student as any).foto;

                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-amber-50/20 transition-colors group"
                    >
                      <td className="p-3.5 pl-5 text-center text-slate-400 font-semibold">{itemIndex}</td>
                      
                      {/* Student Profile Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs relative">
                            <span className="text-xs font-black">{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                            {photoUrl && (
                              <img 
                                src={getGoogleDriveDirectImageUrl(photoUrl)} 
                                alt={student.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => { 
                                  const imgEl = e.currentTarget;
                                  const driveId = photoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
                                  if (driveId && !imgEl.dataset.retried) {
                                    imgEl.dataset.retried = 'true';
                                    imgEl.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
                                  } else {
                                    imgEl.style.display = 'none';
                                  }
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{student.name}</span>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.2 rounded font-black",
                                student.gender === 'L' ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                              )}>
                                {student.gender === 'L' ? 'L' : 'P'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>NIS: {student.nis || '-'}</span>
                              <span>•</span>
                              <span>NISN: {student.nisn || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs">
                          {formatClassLabel(student.class, true)}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {stats.isComplete ? (
                            <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Lengkap</span>
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                              <AlertCircle size={13} className="text-amber-600" />
                              <span>Kurang ({stats.requiredUploaded}/{stats.requiredTotal} Wajib)</span>
                            </span>
                          )}
                          
                          {/* Progress bar */}
                          <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden mt-0.5">
                            <div 
                              className={cn("h-full transition-all rounded-full", stats.isComplete ? "bg-emerald-500" : "bg-amber-500")}
                              style={{ width: `${stats.percent}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {stats.uploadedCount} dari {stats.totalPossible} berkas
                          </span>
                        </div>
                      </td>

                      {/* Document Matrix Chips */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5 items-center max-w-[420px]">
                          {STUDENT_DOC_CONFIGS.map(doc => {
                            const val = getStudentDocValue(student, doc.key);
                            const isPresent = Boolean(val && val.trim() !== '');
                            const req = getStudentDocRequirement(String(doc.key), student);

                            return (
                              <button
                                key={doc.key}
                                onClick={() => {
                                  if (isPresent) {
                                    setPreviewDoc({ title: doc.label, url: val, studentName: student.name });
                                  } else {
                                    setSelectedStudent(student);
                                  }
                                }}
                                title={`${doc.label}: ${isPresent ? 'Sudah Ada (Klik lihat)' : req.ruleLabel + ' - ' + req.reason}`}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 active:scale-95",
                                  isPresent
                                    ? cn(doc.badgeBg, doc.badgeText, doc.badgeBorder, "hover:shadow-xs")
                                    : req.required
                                      ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-extrabold"
                                      : "bg-slate-50 text-slate-400 border-slate-200/80 hover:bg-slate-100 opacity-60"
                                )}
                              >
                                {isPresent ? (
                                  <Check size={11} className="stroke-[3] text-emerald-600" />
                                ) : (
                                  <span className={cn("w-1.5 h-1.5 rounded-full", req.required ? "bg-amber-500" : "bg-slate-300")} />
                                )}
                                <span>{doc.shortLabel}</span>
                              </button>
                            );
                          })}

                          {/* Custom Docs Chips */}
                          {customDocsList.map(cd => (
                            <button
                              key={cd.id}
                              onClick={() => setPreviewDoc({ title: cd.name, url: cd.url, studentName: student.name })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 transition"
                              title={`Berkas Lainnya: ${cd.name}`}
                            >
                              <FileText size={10} className="text-purple-600" />
                              <span className="truncate max-w-[80px]">{cd.name}</span>
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 border shadow-2xs inline-flex items-center gap-1.5",
                            stats.isComplete 
                              ? "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200" 
                              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600 shadow-amber-500/20"
                          )}
                        >
                          <CloudUpload size={14} />
                          <span>Kelola Berkas</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="siswa"
          />
        </div>
      )}

      {/* 6. MODAL: DIGITAL DOCUMENT VAULT */}
      {selectedStudent && (
        <BerkasModalVault
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onPreviewDoc={setPreviewDoc}
        />
      )}

      {/* 7. MODAL: PREVIEW LIGHTBOX */}
      {previewDoc && (
        <BerkasPreviewModal
          previewDoc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
