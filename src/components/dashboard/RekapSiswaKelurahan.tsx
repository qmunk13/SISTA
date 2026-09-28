import React, { useState, useMemo } from 'react';
import { Student } from '../../types';
import StudentPhoto, { resolveStudentPhoto } from '../akademik/StudentPhoto';
import { matchStatusActive } from '../../lib/utils';
import { 
  MapPin, Search, Download, Printer, 
  ChevronDown, ChevronLeft, ChevronRight, RefreshCw, 
  AlertCircle, Phone, X, ZoomIn, Building2, Users, CheckCircle2,
  ExternalLink, Maximize2, UserCheck, ShieldCheck
} from 'lucide-react';

interface RekapSiswaKelurahanProps {
  students: Student[];
}

// Helper untuk membersihkan tulisan Kelurahan murni sesuai teks aslinya dari Google Spreadsheet
export function formatKelurahanName(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'Belum Terdata';
  const clean = raw.trim();
  if (!clean || clean === '-' || clean === 'undefined' || clean === 'null') return 'Belum Terdata';
  
  // Kembalikan teks asli murni dari Google Spreadsheet tanpa mengubah huruf kapital/kecil
  return clean;
}

export default function RekapSiswaKelurahan({ students }: RekapSiswaKelurahanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelurahan, setSelectedKelurahan] = useState('ALL');
  const [selectedRw, setSelectedRw] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortField, setSortField] = useState<'name' | 'rt' | 'rw' | 'kelurahan' | 'class' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal Preview Foto Besar
  const [previewPhotoStudent, setPreviewPhotoStudent] = useState<any | null>(null);

  // Normalisasi data siswa murni mengikuti tulisan di kolom Sheet (HANYA SISWA AKTIF)
  const normalizedStudents = useMemo(() => {
    return (students || [])
      .filter(s => matchStatusActive(s?.status || (s as any)?.Status || (s as any)?.statusTerbaru))
      .map((s, idx) => {
      const rawAddress = String(s.address || (s as any).Alamat || (s as any).alamat || '').trim();
      let rawKel = String(s.kelurahan || (s as any).Kelurahan || (s as any).kel || (s as any).Desa || (s as any).desa || '').trim();
      let rw = String(s.rw || (s as any).RW || '').trim();
      let rt = String(s.rt || (s as any).RT || '').trim();

      // Kelurahan murni mengikuti tulisan kolom Sheet
      const kelurahan = formatKelurahanName(rawKel);

      // RT murni dari kolom Sheet (hanya angka/isi nilai murni, tanpa tulisan RT)
      if (!rt && rawAddress) {
        const matchRt = rawAddress.match(/RT[\s.:]*0?([0-9]+)/i);
        if (matchRt && matchRt[1]) {
          rt = String(matchRt[1]).padStart(2, '0');
        }
      }
      if (rt) {
        const cleanRt = rt.replace(/^RT[\s.:]*/i, '').trim();
        rt = cleanRt || rt;
      }
      if (!rt) rt = '-';

      // RW murni dari kolom Sheet (hanya angka/isi nilai murni, tanpa tulisan RW)
      if (!rw && rawAddress) {
        const matchRw = rawAddress.match(/RW[\s.:]*0?([0-9]+)/i);
        if (matchRw && matchRw[1]) {
          rw = String(matchRw[1]).padStart(2, '0');
        }
      }
      if (rw) {
        const cleanRw = rw.replace(/^RW[\s.:]*/i, '').trim();
        rw = cleanRw || rw;
      }
      if (!rw) rw = '-';

      const studentName = String(s.name || (s as any).NamaLengkap || (s as any).Nama || (s as any).nama || `Siswa ${idx + 1}`).trim();
      const studentClass = String(s.class || (s as any).KelasSaatini || (s as any).Kelas || (s as any).kelas || (s as any).rombel || '1A').trim();
      
      // Status siswa
      let studentStatus = String(s.status || (s as any).Status || 'Aktif').trim();
      if (!studentStatus || studentStatus.toLowerCase() === 'belum') studentStatus = 'Aktif';

      const studentGender = String(s.gender || (s as any).JenisKelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
      
      // Nomor Telepon murni dari kolom Sheet
      const studentPhone = String(
        s.noHp || 
        s.phone || 
        (s as any).NomorHP || 
        (s as any).NoHP || 
        (s as any).tlpAyah || 
        (s as any).tlpIbu || 
        (s as any).tlpWali || 
        (s as any).telepon || 
        '-'
      ).trim();

      return {
        id: s.id || `S-${idx + 1}`,
        raw: s,
        name: studentName,
        nisn: String(s.nisn || (s as any).NISN || s.nis || (s as any).nopdkt || '-'),
        nik: String(s.nik || (s as any).NIK || '-'),
        gender: studentGender,
        rt,
        rw,
        kelurahan,
        class: studentClass,
        status: studentStatus,
        phone: studentPhone
      };
    });
  }, [students]);

  // Daftar Kelurahan unik yang DINAMIS murni dari data siswa yang ada di Sheet (selain yang belum terisi)
  const uniqueKelurahan = useMemo(() => {
    const set = new Set<string>();
    normalizedStudents.forEach(s => {
      if (s.kelurahan && s.kelurahan !== '-' && s.kelurahan !== 'Belum Terdata') {
        set.add(s.kelurahan);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [normalizedStudents]);

  // Jumlah siswa yang belum terisi kelurahan di Sheet
  const unfilledCount = useMemo(() => {
    return normalizedStudents.filter(s => s.kelurahan === 'Belum Terdata').length;
  }, [normalizedStudents]);

  // Hitung jumlah siswa per kelurahan murni
  const kelurahanCounts = useMemo(() => {
    const map: Record<string, number> = {};
    uniqueKelurahan.forEach(k => { map[k] = 0; });
    normalizedStudents.forEach(s => {
      map[s.kelurahan] = (map[s.kelurahan] || 0) + 1;
    });
    return map;
  }, [normalizedStudents, uniqueKelurahan]);

  // Daftar RW unik dinamis
  const uniqueRw = useMemo(() => {
    const set = new Set<string>();
    normalizedStudents.forEach(s => {
      if (s.rw && s.rw !== '-') set.add(s.rw);
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10);
      return numA - numB;
    });
  }, [normalizedStudents]);

  // Daftar Kelas unik dinamis
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    normalizedStudents.forEach(s => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [normalizedStudents]);

  // Filter Siswa
  const filteredStudents = useMemo(() => {
    return normalizedStudents.filter(s => {
      // 1. Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(term);
        const matchNisn = s.nisn.toLowerCase().includes(term);
        const matchNik = s.nik.toLowerCase().includes(term);
        const matchRt = s.rt.toLowerCase().includes(term);
        const matchRw = s.rw.toLowerCase().includes(term);
        const matchKel = s.kelurahan.toLowerCase().includes(term);
        const matchClass = s.class.toLowerCase().includes(term);
        const matchStatus = s.status.toLowerCase().includes(term);
        const matchPhone = s.phone.toLowerCase().includes(term);
        if (!matchName && !matchNisn && !matchNik && !matchRt && !matchRw && !matchKel && !matchClass && !matchStatus && !matchPhone) {
          return false;
        }
      }

      // 2. Kelurahan filter (melalui klik kotak kelurahan atau pilihan filter)
      if (selectedKelurahan !== 'ALL' && s.kelurahan.toLowerCase() !== selectedKelurahan.toLowerCase()) {
        return false;
      }

      // 3. RW filter
      if (selectedRw !== 'ALL' && s.rw !== selectedRw) {
        return false;
      }

      // 4. Class filter
      if (selectedClass !== 'ALL' && s.class !== selectedClass) {
        return false;
      }

      // 5. Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus.toUpperCase() === 'AKTIF') {
          const st = s.status.toLowerCase();
          if (st !== 'aktif' && st !== 'active' && st !== 'belum' && st !== '') return false;
        } else if (s.status.toUpperCase() !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'rt') {
        const numA = parseInt(a.rt.replace(/[^0-9]/g, '') || '0', 10);
        const numB = parseInt(b.rt.replace(/[^0-9]/g, '') || '0', 10);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      if (sortField === 'rw') {
        const numA = parseInt(a.rw.replace(/[^0-9]/g, '') || '0', 10);
        const numB = parseInt(b.rw.replace(/[^0-9]/g, '') || '0', 10);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [normalizedStudents, searchTerm, selectedKelurahan, selectedRw, selectedClass, selectedStatus, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['No', 'Nama Siswa', 'NISN', 'NIK', 'Jenis Kelamin', 'Kelurahan', 'RT', 'RW', 'Kelas', 'Status', 'Nomor Telepon'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `'${s.nisn}`,
      `'${s.nik}`,
      s.gender === 'P' ? 'Perempuan' : 'Laki-Laki',
      `"${s.kelurahan}"`,
      `"${s.rt}"`,
      `"${s.rw}"`,
      `"${s.class}"`,
      `"${s.status}"`,
      `'${s.phone}`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Siswa_Aktif_Kelurahan_${selectedKelurahan === 'ALL' ? 'Semua' : selectedKelurahan}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field: 'name' | 'rt' | 'rw' | 'kelurahan' | 'class' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedKelurahan('ALL');
    setSelectedRw('ALL');
    setSelectedClass('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  const handleSelectKelurahanCard = (kel: string) => {
    setSelectedKelurahan(kel);
    setCurrentPage(1);
  };

  // Badge Status
  const renderStatusBadge = (status: string) => {
    const sLow = (status || '').toLowerCase().trim();
    if (sLow === 'aktif' || sLow === 'active' || sLow === 'belum' || sLow === '') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Aktif
        </span>
      );
    }
    if (sLow.includes('lulus')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Lulus
        </span>
      );
    }
    if (sLow.includes('pindah') || sLow.includes('mutasi')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Pindah
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        {status || 'Keluar'}
      </span>
    );
  };

  return (
    <div id="rekap-siswa-kelurahan" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header Utama & Aksi */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Rekap Siswa per Kelurahan
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Siswa Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar persebaran siswa aktif per Kelurahan berdasarkan data kolom Sheet. Klik kotak kelurahan untuk memfilter.
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Ekspor & Cetak */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Download CSV"
          >
            <Download size={15} />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Cetak Rekap"
          >
            <Printer size={15} />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* KOTAK-KOTAK SEMUA KELURAHAN (INTERACTIVE CARDS GRID DARI DATA SHEET) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <MapPin size={14} className="text-indigo-600" />
            <span>Pilih Kelurahan ({uniqueKelurahan.length} Kelurahan Terdata di Sheet)</span>
          </label>
          <span className="text-xs text-slate-500 font-medium">
            Filter Aktif: <strong className="text-indigo-600 font-bold">{selectedKelurahan === 'ALL' ? 'Semua Kelurahan' : (selectedKelurahan === 'Belum Terdata' ? '⚠️ Belum Terisi di Sheet' : selectedKelurahan)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Kotak SEMUA KELURAHAN */}
          <button
            type="button"
            onClick={() => handleSelectKelurahanCard('ALL')}
            className={`p-3 rounded-xl border text-left transition-all duration-150 relative cursor-pointer ${
              selectedKelurahan === 'ALL'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-600/30'
                : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black truncate block ${selectedKelurahan === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
                Semua Kelurahan
              </span>
              {selectedKelurahan === 'ALL' && (
                <CheckCircle2 size={14} className="text-white flex-shrink-0" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-xl font-black font-mono ${selectedKelurahan === 'ALL' ? 'text-white' : 'text-indigo-600'}`}>
                {normalizedStudents.length}
              </span>
              <span className={`text-[11px] font-medium ${selectedKelurahan === 'ALL' ? 'text-indigo-100' : 'text-slate-500'}`}>
                Siswa Aktif
              </span>
            </div>
          </button>

          {/* Kotak PERINGATAN: BELUM TERISI KELURAHAN (Hanya muncul jika ada data belum terisi di Sheet, otomatis hilang jika terisi semua) */}
          {unfilledCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectKelurahanCard('Belum Terdata')}
              className={`p-3 rounded-xl border text-left transition-all duration-150 relative cursor-pointer ${
                selectedKelurahan === 'Belum Terdata'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200 ring-2 ring-amber-500/40'
                  : 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black truncate flex items-center gap-1 ${
                  selectedKelurahan === 'Belum Terdata' ? 'text-white' : 'text-amber-800'
                }`}>
                  <AlertCircle size={13} className={selectedKelurahan === 'Belum Terdata' ? 'text-white' : 'text-amber-600'} />
                  <span>Belum Terisi</span>
                </span>
                {selectedKelurahan === 'Belum Terdata' && (
                  <CheckCircle2 size={14} className="text-white flex-shrink-0" />
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-xl font-black font-mono ${
                  selectedKelurahan === 'Belum Terdata' ? 'text-white' : 'text-amber-700'
                }`}>
                  {unfilledCount}
                </span>
                <span className={`text-[11px] font-bold ${
                  selectedKelurahan === 'Belum Terdata' ? 'text-amber-100' : 'text-amber-700/80'
                }`}>
                  Perlu Diisi
                </span>
              </div>
            </button>
          )}

          {/* Kotak Setiap Kelurahan Berdasarkan Data Murni Sheet */}
          {uniqueKelurahan.map((kel) => {
            const count = kelurahanCounts[kel] || 0;
            const isSelected = selectedKelurahan === kel;

            return (
              <button
                key={kel}
                type="button"
                onClick={() => handleSelectKelurahanCard(kel)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 relative cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-600/30'
                    : count > 0 
                      ? 'bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-200 text-slate-800 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold truncate block ${isSelected ? 'text-white' : 'text-slate-900'}`} title={kel}>
                    {kel}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={14} className="text-white flex-shrink-0" />
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-xl font-black font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {count}
                  </span>
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Siswa Aktif
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & PENCARIAN TAMBAHAN */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Pencarian */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, No. HP, RT, RW..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter RW */}
          <div>
            <select
              value={selectedRw}
              onChange={(e) => {
                setSelectedRw(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">Semua RW ({uniqueRw.length})</option>
              {uniqueRw.map(rw => (
                <option key={rw} value={rw}>RW {rw}</option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Info Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-indigo-600" />
            <span>
              Menampilkan <b>{filteredStudents.length}</b> siswa aktif {selectedKelurahan !== 'ALL' ? `di Kelurahan ${selectedKelurahan}` : 'keseluruhan'}
            </span>
          </div>

          {(searchTerm || selectedKelurahan !== 'ALL' || selectedRw !== 'ALL' || selectedClass !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Reset & Tampilkan Semua Kelurahan</span>
            </button>
          )}
        </div>
      </div>

      {/* TABEL UTAMA: FOTO BESAR, NAMA, KELURAHAN, RT, RW, KELAS, STATUS, NO TELEPON */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-3 text-center w-12">No</th>
              <th className="px-3 py-3 text-center w-24">Foto Siswa</th>
              <th 
                onClick={() => handleSort('name')}
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Nama Lengkap Siswa</span>
                  <ChevronDown size={12} className={sortField === 'name' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('kelurahan')}
                className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Kelurahan</span>
                  <ChevronDown size={12} className={sortField === 'kelurahan' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('rt')}
                className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition text-center w-16"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>RT</span>
                  <ChevronDown size={12} className={sortField === 'rt' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('rw')}
                className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition text-center w-16"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>RW</span>
                  <ChevronDown size={12} className={sortField === 'rw' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('class')}
                className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition text-center w-20"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Kelas</span>
                  <ChevronDown size={12} className={sortField === 'class' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition text-center w-24"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <ChevronDown size={12} className={sortField === 'status' ? 'text-indigo-600' : 'text-slate-400 opacity-40'} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">Tidak ada data siswa yang cocok</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau pilih kelurahan lainnya</p>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s, idx) => {
                const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/90 transition group">
                    {/* No */}
                    <td className="px-3 py-3 text-center font-mono text-slate-400 font-bold text-xs">
                      {globalIdx}
                    </td>

                    {/* Foto Siswa (Besar & Jelas + Klik untuk perbesar) */}
                    <td className="px-3 py-3 text-center">
                      <div 
                        onClick={() => setPreviewPhotoStudent(s)}
                        className="inline-block relative cursor-pointer group/photo"
                        title="Klik untuk memperbesar foto siswa"
                      >
                        <StudentPhoto 
                          student={s.raw} 
                          name={s.name} 
                          gender={s.gender} 
                          size="xl"
                          showBadge={true}
                          className="w-16 h-16 ring-2 ring-slate-200 group-hover/photo:ring-indigo-500 group-hover/photo:scale-105 transition-all duration-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/35 rounded-full opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition text-white">
                          <ZoomIn size={18} />
                        </div>
                      </div>
                    </td>

                    {/* Nama Siswa */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition">
                        {s.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono mt-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                          NISN: {s.nisn}
                        </span>
                        <span>•</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${s.gender === 'P' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                          {s.gender === 'P' ? 'Perempuan (P)' : 'Laki-Laki (L)'}
                        </span>
                      </div>
                    </td>

                    {/* Kelurahan */}
                    <td className="px-3 py-3">
                      {s.kelurahan === 'Belum Terdata' ? (
                        <span className="font-bold text-amber-800 text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                          <AlertCircle size={12} className="text-amber-600 shrink-0" />
                          Belum Terisi di Sheet
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 text-xs bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 inline-block">
                          {s.kelurahan}
                        </span>
                      )}
                    </td>

                    {/* RT (Sebelum RW) */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-100">
                        {s.rt}
                      </span>
                    </td>

                    {/* RW */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-100">
                        {s.rw}
                      </span>
                    </td>

                    {/* Kelas */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100">
                        {s.class}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      {renderStatusBadge(s.status)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tampilkan per halaman:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>Halaman {currentPage} dari {totalPages}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = Math.min(totalPages - 4, currentPage - 2) + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL POPUP PREVIEW FOTO BESAR */}
      {previewPhotoStudent && (() => {
        const photoDirectUrl = resolveStudentPhoto(previewPhotoStudent.raw);
        const cleanPhoneForWa = previewPhotoStudent.phone.replace(/[^0-9]/g, '');

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-slate-100 my-auto text-center animate-in zoom-in-95 duration-200">
              
              {/* Header Modal */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-left">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserCheck size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Pas Foto Resmi Siswa
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Ukuran Asli & Biodata Lengkap Siswa
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewPhotoStudent(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FOTO BESAR & JELAS (ASPECT RATIO PAS FOTO 3x4 DENGAN BORDER MEWAH) */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-3xl bg-slate-100 border-4 border-white shadow-xl ring-2 ring-indigo-100 overflow-hidden relative flex items-center justify-center group/card">
                  {photoDirectUrl ? (
                    <img 
                      src={photoDirectUrl} 
                      alt={previewPhotoStudent.name}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <StudentPhoto 
                      student={previewPhotoStudent.raw} 
                      name={previewPhotoStudent.name} 
                      gender={previewPhotoStudent.gender} 
                      size="4xl"
                      shape="portrait"
                      className="w-full h-full"
                    />
                  )}

                  {/* Badge Gender di atas Foto */}
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black shadow-md ${
                    previewPhotoStudent.gender === 'P' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-indigo-600 text-white'
                  }`}>
                    {previewPhotoStudent.gender === 'P' ? 'Perempuan (P)' : 'Laki-Laki (L)'}
                  </span>
                </div>

                {/* Tombol Buka Tab Baru / Full Resolution jika ada foto */}
                {photoDirectUrl && (
                  <a
                    href={photoDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition border border-indigo-200/80 shadow-2xs"
                  >
                    <ExternalLink size={13} />
                    <span>Buka Foto Resolusi Penuh di Tab Baru</span>
                  </a>
                )}
              </div>

              {/* Identitas Ringkas Siswa */}
              <div className="space-y-2 pt-1 text-left bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div className="text-center pb-2 border-b border-slate-200/60">
                  <h4 className="text-lg font-black text-slate-900 leading-tight">
                    {previewPhotoStudent.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    NISN: <strong className="text-slate-800">{previewPhotoStudent.nisn}</strong> • NIK: <strong className="text-slate-800">{previewPhotoStudent.nik}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Kelas</span>
                    <span className="font-black text-purple-700 text-sm">Kelas {previewPhotoStudent.class}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Kelurahan</span>
                    <span className="font-black text-slate-800 text-xs truncate block" title={previewPhotoStudent.kelurahan}>
                      {previewPhotoStudent.kelurahan}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">RT / RW</span>
                    <span className="font-bold text-indigo-700 text-xs">{previewPhotoStudent.rt} / {previewPhotoStudent.rw}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <span className="font-bold text-emerald-700 text-xs">{previewPhotoStudent.status}</span>
                  </div>
                </div>

                {/* Kontak HP / WA Siswa */}
                {previewPhotoStudent.phone && previewPhotoStudent.phone !== '-' && (
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Phone size={13} className="text-emerald-600" />
                      <span className="font-bold">{previewPhotoStudent.phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a 
                        href={`tel:${previewPhotoStudent.phone}`}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition"
                      >
                        Telepon
                      </a>
                      {cleanPhoneForWa.length >= 9 && (
                        <a 
                          href={`https://wa.me/${cleanPhoneForWa.startsWith('0') ? '62' + cleanPhoneForWa.slice(1) : cleanPhoneForWa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tombol Tutup */}
              <button
                onClick={() => setPreviewPhotoStudent(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition cursor-pointer shadow-md"
              >
                Tutup Detail Foto
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
