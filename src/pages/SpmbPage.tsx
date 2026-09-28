import React, { useState, useMemo, useRef } from 'react';
import { 
  ClipboardList, UserPlus, CheckCircle2, 
  Search, Printer, Award, UserCheck, ShieldCheck,
  X, Eye, Check, Clock, Edit, Trash2, Save, AlertTriangle,
  FileSpreadsheet, Plus, Download, Filter, RefreshCw, Sparkles,
  QrCode, School, User, Layers, Calendar, CheckSquare
} from 'lucide-react';
import { db } from '../data/db';
import { useStore } from '../store';
import { exportToExcel } from '../lib/excel';
import { cn, triggerPrint } from '../lib/utils';
import CustomDropdown from '../components/common/CustomDropdown';

export default function SpmbPage() {
  const { settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'pendaftar' | 'verifikasi' | 'seleksi' | 'pengumuman' | 'daftar-ulang' | 'kartu'>('dashboard');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJalur, setFilterJalur] = useState('');
  const [filterGugus, setFilterGugus] = useState('');

  // Modals for Actions
  const [viewDetailModal, setViewDetailModal] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [addModal, setAddModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [singlePrintCard, setSinglePrintCard] = useState<any | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);

  const subTabs = [
    { id: 'dashboard', label: 'Dashboard SPMB', icon: ClipboardList },
    { id: 'pendaftar', label: 'Data Pendaftar', icon: UserPlus },
    { id: 'verifikasi', label: 'Verifikasi Berkas', icon: ShieldCheck },
    { id: 'seleksi', label: 'Penyaringan Seleksi', icon: CheckCircle2 },
    { id: 'pengumuman', label: 'Hasil Pengumuman', icon: Award },
    { id: 'daftar-ulang', label: 'Daftar Ulang', icon: UserCheck },
    { id: 'kartu', label: 'Kartu Peserta MPLS', icon: Printer },
  ];

  const handleSubTabChange = (tabId: any) => {
    setActiveSubTab(tabId);
    setSearchTerm('');
    setFilterStatus('');
    setFilterJalur('');
    setFilterGugus('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Initial & persistent list state
  const [pendaftarList, setPendaftarList] = useState<any[]>(() => {
    const fromDb = (db.get('spmb_pendaftar') as any[]) || [];
    return fromDb;
  });

  const savePendaftarList = (newList: any[]) => {
    setPendaftarList(newList);
    db.set('spmb_pendaftar', newList);
  };

  // Filtered List
  const filteredPendaftar = useMemo(() => {
    return pendaftarList.filter((p: any) => {
      const q = searchTerm.toLowerCase();
      const nama = String(p.nama || p.namaCalonSiswa || '').toLowerCase();
      const id = String(p.id || p.noRegistrasi || '').toLowerCase();
      const nisn = String(p.nisn || '').toLowerCase();
      const pdkt = String(p.pdkt || p.noPDKT || '').toLowerCase();
      const gugus = String(p.gugus || p.kelompokMPLS || '').toLowerCase();

      const matchesQ = !searchTerm || nama.includes(q) || id.includes(q) || nisn.includes(q) || pdkt.includes(q);
      const matchesStatus = !filterStatus || p.status === filterStatus || p.berkas === filterStatus || p.hasilKeputusan === filterStatus;
      const matchesJalur = !filterJalur || p.jalur === filterJalur || p.jalurMasuk === filterJalur;
      const matchesGugus = !filterGugus || p.gugus === filterGugus || p.kelompokMPLS === filterGugus;

      return matchesQ && matchesStatus && matchesJalur && matchesGugus;
    });
  }, [pendaftarList, searchTerm, filterStatus, filterJalur, filterGugus]);

  // Statistics
  const totalPendaftar = pendaftarList.length;
  const berkasLengkap = pendaftarList.filter((p: any) => (p.berkas || p.statusBerkas) === 'Lengkap').length;
  const lulusSeleksi = pendaftarList.filter((p: any) => (p.status || p.hasilKeputusan) === 'Lulus').length;
  const daftarUlang = pendaftarList.filter((p: any) => (p.statusDaftarUlang === 'Sudah' || (p.pdkt && p.pdkt !== '-'))).length;

  // Handlers for Add, Edit, Delete
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModal) return;
    const newItem = {
      id: addModal.id || `REG-${Date.now().toString().slice(-5)}`,
      noRegistrasi: addModal.id || `REG-${Date.now().toString().slice(-5)}`,
      nama: addModal.nama || 'Calon Siswa Baru',
      namaCalonSiswa: addModal.nama || 'Calon Siswa Baru',
      nisn: addModal.nisn || '',
      jk: addModal.jk || 'L',
      jenisKelamin: addModal.jk || 'L',
      jalur: addModal.jalur || 'Zonasi',
      jalurMasuk: addModal.jalur || 'Zonasi',
      berkas: addModal.berkas || 'Lengkap',
      statusBerkas: addModal.berkas || 'Lengkap',
      skor: Number(addModal.skor) || 80,
      skorSeleksi: Number(addModal.skor) || 80,
      status: addModal.status || 'Proses',
      hasilKeputusan: addModal.status || 'Proses',
      pdkt: addModal.pdkt || '-',
      noPDKT: addModal.pdkt || '-',
      gugus: addModal.gugus || 'Gugus 1 - Merpati',
      kelompokMPLS: addModal.gugus || 'Gugus 1 - Merpati',
      statusDaftarUlang: addModal.statusDaftarUlang || 'Belum',
      seragam: addModal.seragam || 'M',
      nilaiAkademik: Number(addModal.nilaiAkademik) || 80,
      nilaiWawancara: Number(addModal.nilaiWawancara) || 85,
      nilaiPrestasi: Number(addModal.nilaiPrestasi) || 0,
      akta: addModal.akta ?? true,
      kk: addModal.kk ?? true,
      ijazah: addModal.ijazah ?? true,
      ktpOrtu: addModal.ktpOrtu ?? true,
      kontak: addModal.kontak || '',
      asalSekolah: addModal.asalSekolah || '',
      alamat: addModal.alamat || '',
      tanggalDaftar: new Date().toISOString().slice(0, 10),
      nomorSK: `421.2/SK-SPMB/${new Date().getFullYear()}`
    };

    savePendaftarList([newItem, ...pendaftarList]);
    setAddModal(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    const updated = pendaftarList.map(p => {
      if (p.id === editModal.id || p.noRegistrasi === editModal.id) {
        return {
          ...p,
          ...editModal,
          namaCalonSiswa: editModal.nama || p.namaCalonSiswa,
          jalurMasuk: editModal.jalur || p.jalurMasuk,
          statusBerkas: editModal.berkas || p.statusBerkas,
          skorSeleksi: Number(editModal.skor) || p.skorSeleksi,
          hasilKeputusan: editModal.status || p.hasilKeputusan,
          noPDKT: editModal.pdkt || p.noPDKT,
          kelompokMPLS: editModal.gugus || p.kelompokMPLS
        };
      }
      return p;
    });
    savePendaftarList(updated);
    setEditModal(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const updated = pendaftarList.filter(p => p.id !== deleteModal.id && p.noRegistrasi !== deleteModal.id);
    savePendaftarList(updated);
    setDeleteModal(null);
  };

  // Export Excel Handler
  const handleExportSPMB = (sheetTitle: string) => {
    const dataToExport = filteredPendaftar.map((p, idx) => ({
      'No': idx + 1,
      'No Registrasi': p.id || p.noRegistrasi || '-',
      'Nama Calon Siswa': p.nama || p.namaCalonSiswa,
      'NISN': p.nisn || '-',
      'Jenis Kelamin': (p.jk || p.jenisKelamin) === 'L' ? 'Laki-laki' : 'Perempuan',
      'Jalur Masuk': p.jalur || p.jalurMasuk || 'Zonasi',
      'Status Berkas': p.berkas || p.statusBerkas || 'Lengkap',
      'Nilai Akademik': p.nilaiAkademik || 80,
      'Nilai Wawancara': p.nilaiWawancara || 85,
      'Nilai Prestasi': p.nilaiPrestasi || 0,
      'Skor Seleksi': p.skor || p.skorSeleksi || 80,
      'Hasil Keputusan': p.status || p.hasilKeputusan || 'Proses',
      'No PDKT': p.pdkt || p.noPDKT || '-',
      'Gugus MPLS': p.gugus || p.kelompokMPLS || '-',
      'Status Daftar Ulang': p.statusDaftarUlang || (p.pdkt && p.pdkt !== '-' ? 'Sudah' : 'Belum'),
      'Ukuran Seragam': p.seragam || 'M',
      'Asal Sekolah': p.asalSekolah || '-',
      'Kontak HP/WA': p.kontak || '-',
      'Alamat': p.alamat || '-'
    }));

    exportToExcel(dataToExport, `SPMB_${sheetTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`, sheetTitle);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/95 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shadow-2xs flex-shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              SPMB - Penerimaan Murid Baru
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manajemen registrasi pendaftar, audit berkas, penyaringan seleksi, pengumuman SK, daftar ulang, dan cetak kartu MPLS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeSubTab !== 'dashboard' && activeSubTab !== 'kartu' && (
            <button
              onClick={() => handleExportSPMB(activeSubTab.toUpperCase())}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              <FileSpreadsheet size={14} />
              <span>Ekspor Excel</span>
            </button>
          )}

          {activeSubTab === 'pendaftar' && (
            <button
              onClick={() => setAddModal({
                id: `REG-${Date.now().toString().slice(-5)}`,
                nama: '',
                nisn: '',
                jk: 'L',
                jalur: 'Zonasi',
                berkas: 'Lengkap',
                skor: 85,
                status: 'Proses',
                pdkt: '-',
                gugus: 'Gugus 1 - Merpati',
                kontak: '',
                asalSekolah: '',
                alamat: ''
              })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Tambah Pendaftar</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="spmb-mobile-subnav"
          label="PILIH SUB-MENU SPMB:"
          value={activeSubTab}
          onChange={(val) => handleSubTabChange(val as any)}
          options={subTabs.map(t => ({
            value: t.id,
            label: t.label
          }))}
          placeholder="Pilih Sub-Menu"
        />
      </div>

      {/* Sub Tabs Desktop */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-200 ring-2 ring-amber-600'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-amber-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBTAB DASHBOARD (NO TABLE AT ALL - JUST METRICS, STATS, & WORKFLOW) */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => handleSubTabChange('pendaftar')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
            >
              <div className="flex justify-between items-center text-amber-600">
                <span className="text-xs font-bold text-slate-500">1. Total Pendaftar</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus size={18} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{totalPendaftar} <span className="text-xs text-slate-400 font-medium">Calon Siswa</span></div>
              <p className="text-[11px] text-amber-700 font-bold group-hover:underline flex items-center gap-1">
                <span>Buka Data Pendaftar</span> &rarr;
              </p>
            </div>

            <div 
              onClick={() => handleSubTabChange('verifikasi')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
            >
              <div className="flex justify-between items-center text-indigo-600">
                <span className="text-xs font-bold text-slate-500">2. Berkas Lengkap</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="text-3xl font-black text-indigo-600">{berkasLengkap} <span className="text-xs text-slate-400 font-medium">Dokumen Valid</span></div>
              <p className="text-[11px] text-indigo-700 font-bold group-hover:underline flex items-center gap-1">
                <span>Verifikasi Dokumen</span> &rarr;
              </p>
            </div>

            <div 
              onClick={() => handleSubTabChange('seleksi')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-md transition group"
            >
              <div className="flex justify-between items-center text-emerald-600">
                <span className="text-xs font-bold text-slate-500">3. Lulus Seleksi</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">{lulusSeleksi} <span className="text-xs text-slate-400 font-medium">Siswa Diterima</span></div>
              <p className="text-[11px] text-emerald-700 font-bold group-hover:underline flex items-center gap-1">
                <span>Cek Hasil Seleksi</span> &rarr;
              </p>
            </div>

            <div 
              onClick={() => handleSubTabChange('daftar-ulang')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-purple-400 hover:shadow-md transition group"
            >
              <div className="flex justify-between items-center text-purple-600">
                <span className="text-xs font-bold text-slate-500">4. Daftar Ulang & PDKT</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck size={18} />
                </div>
              </div>
              <div className="text-3xl font-black text-purple-600">{daftarUlang} <span className="text-xs text-slate-400 font-medium">Siap MPLS</span></div>
              <p className="text-[11px] text-purple-700 font-bold group-hover:underline flex items-center gap-1">
                <span>Alokasi No. PDKT</span> &rarr;
              </p>
            </div>
          </div>

          {/* Workflow & Jalur Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SPMB Pipeline Flow */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Alur Penerimaan Peserta Didik Baru</h3>
                  <p className="text-xs text-slate-500">Tahapan seleksi dan jadwal pelaksanaan SPMB 2026/2027</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-xs">
                  TA 2026/2027
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center">1</div>
                  <div className="font-bold text-xs text-slate-900">Pendaftaran</div>
                  <div className="text-[11px] text-slate-500">Pengisian biodata & upload berkas online/offline</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center">2</div>
                  <div className="font-bold text-xs text-slate-900">Verifikasi</div>
                  <div className="text-[11px] text-slate-500">Pemeriksaan fisik Akte, KK, KTP Ortu, & Ijazah</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center">3</div>
                  <div className="font-bold text-xs text-slate-900">Seleksi & SK</div>
                  <div className="text-[11px] text-slate-500">Skoring pembobotan & penetapan SK kelulusan</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-500 text-white font-black text-xs flex items-center justify-center">4</div>
                  <div className="font-bold text-xs text-slate-900">MPLS & PDKT</div>
                  <div className="text-[11px] text-slate-500">Daftar ulang, seragam, & cetak kartu peserta MPLS</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Sparkles size={16} />
                  <span>Aksi Cepat Panitia SPMB</span>
                </div>
                <h3 className="font-extrabold text-base">Cetak Kartu & Dokumen SPMB</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cetak kartu peserta MPLS satuan maupun kolektif per gugus kelas secara instan.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleSubTabChange('kartu')}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Printer size={15} />
                  <span>Buka Pusat Cetak Kartu MPLS</span>
                </button>
                <button
                  onClick={() => handleSubTabChange('pendaftar')}
                  className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border border-white/10"
                >
                  <UserPlus size={15} />
                  <span>Input Pendaftar Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUBTAB DATA PENDAFTAR */}
      {/* ========================================================================= */}
      {activeSubTab === 'pendaftar' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama calon siswa, No Registrasi, NISN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="w-48">
                <CustomDropdown
                  id="spmb-filter-jalur"
                  value={filterJalur}
                  onChange={(val) => setFilterJalur(val)}
                  options={[
                    { value: '', label: 'Semua Jalur Pendaftaran' },
                    { value: 'Zonasi', label: 'Zonasi' },
                    { value: 'Prestasi', label: 'Prestasi' },
                    { value: 'Afirmasi', label: 'Afirmasi' },
                    { value: 'Perpindahan', label: 'Perpindahan' }
                  ]}
                  placeholder="Semua Jalur"
                />
              </div>

              <div className="w-48">
                <CustomDropdown
                  id="spmb-filter-status"
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  options={[
                    { value: '', label: 'Semua Status Keputusan' },
                    { value: 'Lulus', label: 'Lulus Diterima', badge: 'Lulus' },
                    { value: 'Cadangan', label: 'Cadangan' },
                    { value: 'Proses', label: 'Sedang Diproses' },
                    { value: 'Tidak Lulus', label: 'Tidak Lulus' }
                  ]}
                  placeholder="Semua Status"
                />
              </div>
            </div>

            <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              {filteredPendaftar.length} Calon Siswa Terdaftar
            </span>
          </div>

          {/* Table Data Pendaftar */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">No Registrasi</th>
                  <th className="p-3.5">Nama Calon Siswa</th>
                  <th className="p-3.5">NISN / JK</th>
                  <th className="p-3.5">Jalur Masuk</th>
                  <th className="p-3.5 text-center">Status Berkas</th>
                  <th className="p-3.5 text-center">Skor Seleksi</th>
                  <th className="p-3.5 text-center">Hasil Keputusan</th>
                  <th className="p-3.5 text-center">No PDKT</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPendaftar.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400">
                      <p className="font-bold text-slate-600 text-sm">Belum Ada Data Pendaftar</p>
                      <p className="text-xs text-slate-400 mt-0.5">Klik tombol "Tambah Pendaftar" di atas untuk menambahkan calon siswa baru.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPendaftar.map((p: any, idx: number) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono font-bold text-amber-700">{p.id || p.noRegistrasi}</td>
                      <td className="p-3.5 font-bold text-slate-900 text-sm">
                        <div>{p.nama || p.namaCalonSiswa}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{p.asalSekolah || p.kontak || '-'}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-700">{p.nisn || '-'}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">{p.jk || p.jenisKelamin || 'L'}</span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">{p.jalur || p.jalurMasuk}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          (p.berkas || p.statusBerkas) === 'Lengkap' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {(p.berkas || p.statusBerkas) === 'Lengkap' ? <Check size={11} /> : <Clock size={11} />}
                          <span>{p.berkas || p.statusBerkas || 'Lengkap'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-black text-indigo-700">{p.skor || p.skorSeleksi || 80} Poin</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          (p.status || p.hasilKeputusan) === 'Lulus' ? 'bg-emerald-600 text-white' :
                          (p.status || p.hasilKeputusan) === 'Cadangan' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {p.status || p.hasilKeputusan || 'Proses'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {(p.pdkt || p.noPDKT) && (p.pdkt || p.noPDKT) !== '-' ? (
                          <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            {p.pdkt || p.noPDKT}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewDetailModal({
                              'No. Registrasi': p.id || p.noRegistrasi,
                              'Nama Calon Siswa': p.nama || p.namaCalonSiswa,
                              'NISN': p.nisn || '-',
                              'Jenis Kelamin': (p.jk || p.jenisKelamin) === 'L' ? 'Laki-laki' : 'Perempuan',
                              'Jalur Masuk': p.jalur || p.jalurMasuk,
                              'Status Berkas': p.berkas || p.statusBerkas,
                              'Skor Seleksi': `${p.skor || p.skorSeleksi} Poin`,
                              'Hasil Keputusan': p.status || p.hasilKeputusan,
                              'Nomor PDKT': p.pdkt || p.noPDKT || '-',
                              'Gugus MPLS': p.gugus || p.kelompokMPLS || '-',
                              'Asal Sekolah': p.asalSekolah || '-',
                              'No HP / Kontak': p.kontak || '-'
                            })}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Lihat Detail"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Lihat</span>
                          </button>
                          <button
                            onClick={() => setEditModal({ ...p })}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Edit Data"
                          >
                            <Edit size={12} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal({ id: p.id || p.noRegistrasi, name: p.nama || p.namaCalonSiswa })}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Hapus Data"
                          >
                            <Trash2 size={12} />
                            <span className="hidden sm:inline">Hapus</span>
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
      )}

      {/* ========================================================================= */}
      {/* 3. SUBTAB VERIFIKASI BERKAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'verifikasi' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari berkas calon siswa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div className="w-52">
                <CustomDropdown
                  id="spmb-verifikasi-filter-status"
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  options={[
                    { value: '', label: 'Semua Status Berkas' },
                    { value: 'Lengkap', label: 'Lengkap', badge: 'Lengkap' },
                    { value: 'Perlu Revisi', label: 'Perlu Revisi' },
                    { value: 'Belum Lengkap', label: 'Belum Lengkap' }
                  ]}
                  placeholder="Status Berkas"
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
              Audit Verifikasi Dokumen Calon Siswa
            </span>
          </div>

          {/* Table Verifikasi Berkas */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">No Registrasi</th>
                  <th className="p-3.5">Nama Calon Siswa</th>
                  <th className="p-3.5">NISN</th>
                  <th className="p-3.5 text-center">Akta Kelahiran</th>
                  <th className="p-3.5 text-center">Kartu Keluarga</th>
                  <th className="p-3.5 text-center">Ijazah / SKL</th>
                  <th className="p-3.5 text-center">KTP Ortu</th>
                  <th className="p-3.5 text-center">Status Berkas</th>
                  <th className="p-3.5 pr-4 text-center">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPendaftar.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-indigo-700">{p.id || p.noRegistrasi}</td>
                    <td className="p-3.5 font-bold text-slate-900">{p.nama || p.namaCalonSiswa}</td>
                    <td className="p-3.5 font-mono">{p.nisn || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">✓ Ada</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">✓ Ada</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">✓ Ada</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">✓ Ada</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        (p.berkas || p.statusBerkas) === 'Lengkap' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.berkas || p.statusBerkas || 'Lengkap'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <button
                        onClick={() => setEditModal({ ...p })}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs"
                      >
                        Ubah Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBTAB PENYARINGAN SELEKSI */}
      {/* ========================================================================= */}
      {activeSubTab === 'seleksi' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari seleksi calon siswa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Perhitungan Pembobotan Skor & Ranking
            </span>
          </div>

          {/* Table Seleksi */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">No Registrasi</th>
                  <th className="p-3.5">Nama Calon Siswa</th>
                  <th className="p-3.5">Jalur</th>
                  <th className="p-3.5 text-center">Tes Akademik</th>
                  <th className="p-3.5 text-center">Wawancara</th>
                  <th className="p-3.5 text-center">Prestasi</th>
                  <th className="p-3.5 text-center">Total Skor</th>
                  <th className="p-3.5 text-center">Rekomendasi</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPendaftar.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-indigo-700">{p.id || p.noRegistrasi}</td>
                    <td className="p-3.5 font-bold text-slate-900">{p.nama || p.namaCalonSiswa}</td>
                    <td className="p-3.5 font-semibold text-slate-700">{p.jalur || p.jalurMasuk}</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{p.nilaiAkademik || 80}</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{p.nilaiWawancara || 85}</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{p.nilaiPrestasi || 0}</td>
                    <td className="p-3.5 text-center font-black text-indigo-700 text-sm">{p.skor || p.skorSeleksi || 80}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Direkomendasikan
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <button
                        onClick={() => setEditModal({ ...p })}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition"
                      >
                        Input Nilai
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUBTAB HASIL PENGUMUMAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'pengumuman' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari pengumuman kelulusan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              Penetapan SK Resmi Penerimaan Siswa Baru
            </span>
          </div>

          {/* Table Pengumuman */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">No Registrasi</th>
                  <th className="p-3.5">Nama Calon Siswa</th>
                  <th className="p-3.5">NISN / JK</th>
                  <th className="p-3.5">Jalur</th>
                  <th className="p-3.5 text-center">Total Skor</th>
                  <th className="p-3.5 text-center">Hasil Keputusan</th>
                  <th className="p-3.5">Nomor SK Penetapan</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPendaftar.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-amber-700">{p.id || p.noRegistrasi}</td>
                    <td className="p-3.5 font-bold text-slate-900">{p.nama || p.namaCalonSiswa}</td>
                    <td className="p-3.5 font-mono">{p.nisn || '-'} ({p.jk || p.jenisKelamin || 'L'})</td>
                    <td className="p-3.5 font-semibold">{p.jalur || p.jalurMasuk}</td>
                    <td className="p-3.5 text-center font-black text-indigo-700">{p.skor || p.skorSeleksi || 80}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        (p.status || p.hasilKeputusan) === 'Lulus' ? 'bg-emerald-600 text-white' :
                        (p.status || p.hasilKeputusan) === 'Cadangan' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status || p.hasilKeputusan || 'Lulus'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{p.nomorSK || `421.2/SK-SPMB/${new Date().getFullYear()}`}</td>
                    <td className="p-3.5 pr-4 text-center">
                      <button
                        onClick={() => setEditModal({ ...p })}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition"
                      >
                        Ubah Keputusan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUBTAB DAFTAR ULANG */}
      {/* ========================================================================= */}
      {activeSubTab === 'daftar-ulang' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari No PDKT atau nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              Alokasi No. PDKT & Gugus MPLS
            </span>
          </div>

          {/* Table Daftar Ulang */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">No Registrasi</th>
                  <th className="p-3.5">Nama Calon Siswa</th>
                  <th className="p-3.5">NISN</th>
                  <th className="p-3.5 text-center">Nomor PDKT</th>
                  <th className="p-3.5">Gugus / Kelompok MPLS</th>
                  <th className="p-3.5 text-center">Status Daftar Ulang</th>
                  <th className="p-3.5 text-center">Ukuran Seragam</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPendaftar.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-slate-700">{p.id || p.noRegistrasi}</td>
                    <td className="p-3.5 font-bold text-slate-900">{p.nama || p.namaCalonSiswa}</td>
                    <td className="p-3.5 font-mono">{p.nisn || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        {p.pdkt || p.noPDKT || `PDKT-2026-${(idx+1).toString().padStart(3, '0')}`}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{p.gugus || p.kelompokMPLS || 'Gugus 1 - Merpati'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Sudah Daftar Ulang
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-700">{p.seragam || 'M'}</td>
                    <td className="p-3.5 pr-4 text-center">
                      <button
                        onClick={() => setEditModal({ ...p })}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[11px] transition"
                      >
                        Alokasi Gugus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUBTAB KARTU PESERTA MPLS (CETAK SATUAN & KOLEKTIF DENGAN FILTER KELAS/GUGUS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'kartu' && (
        <div className="space-y-6">
          {/* Controller & Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Printer size={18} className="text-amber-600" />
                  <span>Pusat Cetak Kartu Peserta MPLS 2026/2027</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Cetak kartu peserta MPLS secara satuan (individu) atau sekaligus (batch/kolektif) dengan filter kelas & gugus.
                </p>
              </div>

              {/* Action Buttons for Batch Printing */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button 
                  onClick={() => {
                    const allIds = filteredPendaftar.map((p: any, idx: number) => String(p.id || idx));
                    if (selectedCardIds.length === filteredPendaftar.length) {
                      setSelectedCardIds([]);
                    } else {
                      setSelectedCardIds(allIds);
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} className={selectedCardIds.length === filteredPendaftar.length && filteredPendaftar.length > 0 ? "text-amber-600" : "text-slate-400"} />
                  <span>{selectedCardIds.length === filteredPendaftar.length && filteredPendaftar.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                </button>

                {selectedCardIds.length > 0 && (
                  <button 
                    onClick={() => setBatchPrintModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200 transition active:scale-95 whitespace-nowrap animate-in fade-in"
                  >
                    <Printer size={15} />
                    <span>Cetak Batch Terpilih ({selectedCardIds.length} Siswa)</span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setSelectedCardIds(filteredPendaftar.map((p: any, idx: number) => String(p.id || idx)));
                    setBatchPrintModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 whitespace-nowrap"
                >
                  <Printer size={15} />
                  <span>Cetak Sekaligus ({filteredPendaftar.length})</span>
                </button>
              </div>
            </div>

            {/* Filter Bar for Cards */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama calon siswa, No PDKT, NISN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="w-56">
                <CustomDropdown
                  id="spmb-kartu-filter-gugus"
                  value={filterGugus}
                  onChange={(val) => setFilterGugus(val)}
                  options={[
                    { value: '', label: 'Semua Gugus / Kelas MPLS' },
                    { value: 'Gugus 1 - Merpati', label: 'Gugus 1 - Merpati' },
                    { value: 'Gugus 2 - Garuda', label: 'Gugus 2 - Garuda' },
                    { value: 'Gugus 3 - Rajawali', label: 'Gugus 3 - Rajawali' },
                    { value: 'Gugus 4 - Cendrawasih', label: 'Gugus 4 - Cendrawasih' },
                    { value: 'Kelas 1A', label: 'Kelas 1A' },
                    { value: 'Kelas 1B', label: 'Kelas 1B' },
                    { value: 'Kelas 1C', label: 'Kelas 1C' }
                  ]}
                  placeholder="Gugus / Kelas"
                />
              </div>

              <div className="w-48">
                <CustomDropdown
                  id="spmb-kartu-filter-jalur"
                  value={filterJalur}
                  onChange={(val) => setFilterJalur(val)}
                  options={[
                    { value: '', label: 'Semua Jalur Masuk' },
                    { value: 'Zonasi', label: 'Jalur Zonasi' },
                    { value: 'Prestasi', label: 'Jalur Prestasi' },
                    { value: 'Afirmasi', label: 'Jalur Afirmasi' },
                    { value: 'Perpindahan', label: 'Jalur Perpindahan' }
                  ]}
                  placeholder="Jalur Masuk"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPendaftar.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                <Printer size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-base">Tidak Ada Kartu Peserta MPLS</p>
                <p className="text-xs text-slate-400 mt-1">Silakan sesuaikan filter atau tambahkan data pendaftar baru terlebih dahulu.</p>
              </div>
            ) : (
              filteredPendaftar.map((p: any, idx: number) => {
                const cardId = String(p.id || idx);
                const isSelected = selectedCardIds.includes(cardId);
                const pdktNumber = p.pdkt || p.noPDKT || `PDKT-2026-${(idx+1).toString().padStart(3, '0')}`;
                const gugusName = p.gugus || p.kelompokMPLS || 'Gugus 1 - Merpati';
                const namaSiswa = p.nama || p.namaCalonSiswa || 'Nama Calon Siswa';

                return (
                  <div 
                    key={cardId}
                    className={cn(
                      "bg-white rounded-3xl border-2 shadow-xs overflow-hidden flex flex-col justify-between transition-all",
                      isSelected ? "border-amber-500 ring-2 ring-amber-400/40 shadow-md" : "border-slate-200/90 hover:border-amber-300"
                    )}
                  >
                    {/* Top Header Card */}
                    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-3.5 relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
                            } else {
                              setSelectedCardIds([...selectedCardIds, cardId]);
                            }
                          }}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
                        />
                        <div>
                          <div className="text-[10px] tracking-wider uppercase font-bold text-amber-200">
                            {settings.schoolName || 'SD NEGERI CONTOH'}
                          </div>
                          <div className="text-xs font-black tracking-wide">
                            KARTU PESERTA MPLS
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[9px] font-black tracking-wider">
                        2026/2027
                      </span>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 space-y-3.5 flex-1">
                      <div className="flex items-center gap-3">
                        {/* Student Avatar / Photo */}
                        <div className="w-14 h-16 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-600 font-black text-lg overflow-hidden">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt={namaSiswa} className="w-full h-full object-cover" />
                          ) : (
                            namaSiswa.charAt(0)
                          )}
                        </div>

                        {/* Student Main Info */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h4 className="font-black text-slate-900 text-sm truncate">{namaSiswa}</h4>
                          <div className="text-[11px] font-mono text-indigo-700 font-bold">
                            NISN: {p.nisn || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Jalur: <strong className="text-slate-700">{p.jalur || p.jalurMasuk || 'Zonasi'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Detail Badges */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">No. PDKT / MPLS:</span>
                          <span className="font-mono font-black text-purple-700">{pdktNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Gugus / Kelompok:</span>
                          <span className="font-bold text-slate-800 truncate block">{gugusName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>No. Reg: {p.id || p.noRegistrasi}</span>
                        <span className="text-emerald-700 font-bold">✓ Terdaftar Resmi</span>
                      </div>
                    </div>

                    {/* Single Print Button */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 no-print">
                      <button
                        onClick={() => setSinglePrintCard({ ...p, pdktNumber, gugusName, namaSiswa })}
                        className="w-full py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                      >
                        <Printer size={13} />
                        <span>Cetak Kartu Satuan</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE CARD PRINT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {singlePrintCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-amber-600" />
                <h3 className="text-base font-black text-slate-900">Cetak Kartu Satuan (Individu)</h3>
              </div>
              <button 
                onClick={() => setSinglePrintCard(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Card Box */}
            <div id="printable-area" className="printable-container p-5 rounded-3xl border-2 border-amber-500 bg-white space-y-4 shadow-sm text-slate-900 print:p-0 print:border-none print:shadow-none">
              <div className="text-center border-b-2 border-amber-500 pb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  {settings.schoolName || 'ROMBEL TAMBORA'}
                </div>
                <div className="text-sm font-black text-slate-900">KARTU PESERTA MPLS 2026/2027</div>
                <div className="text-[10px] text-slate-500">Masa Pengenalan Lingkungan Belajar (MPLS)</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-20 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 font-black text-2xl overflow-hidden flex-shrink-0">
                  {singlePrintCard.fotoUrl ? (
                    <img src={singlePrintCard.fotoUrl} alt={singlePrintCard.namaSiswa} className="w-full h-full object-cover" />
                  ) : (
                    singlePrintCard.namaSiswa.charAt(0)
                  )}
                </div>
                <div className="space-y-1 text-xs flex-1 min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">{singlePrintCard.namaSiswa}</div>
                  <div className="text-slate-600">NISN: <strong className="font-mono text-indigo-700">{singlePrintCard.nisn || '-'}</strong></div>
                  <div className="text-slate-600">No. PDKT: <strong className="font-mono text-purple-700">{singlePrintCard.pdktNumber}</strong></div>
                  <div className="text-slate-600">Gugus / Kelas: <strong className="text-slate-800">{singlePrintCard.gugusName}</strong></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                <div>
                  <span className="text-slate-400 block">Jalur Masuk:</span>
                  <span className="font-bold text-slate-800">{singlePrintCard.jalur || singlePrintCard.jalurMasuk || 'Zonasi'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Tanda Tangan Panitia:</span>
                  <span className="font-serif italic text-slate-700 block mt-2">( Panitia SPMB )</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => setSinglePrintCard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
              <button
                onClick={triggerPrint}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Printer size={14} />
                <span>Cetak Kartu Satuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH CARD PRINT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {batchPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between no-print">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Printer size={18} className="text-amber-600" />
                  <span>Pratinjau Cetak Sekaligus (Batch) Kartu Peserta MPLS</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {selectedCardIds.length} kartu siap cetak ke format kertas A4 dengan garis potong rapi.
                </p>
              </div>
              <button 
                onClick={() => setBatchPrintModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Batch Grid */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 print:bg-white print:p-0">
              <div id="printable-area" className="printable-container grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none">
                {filteredPendaftar
                  .filter((p: any, idx: number) => selectedCardIds.includes(String(p.id || idx)))
                  .map((p: any, idx: number) => {
                    const pdktNumber = p.pdkt || p.noPDKT || `PDKT-2026-${(idx+1).toString().padStart(3, '0')}`;
                    const gugusName = p.gugus || p.kelompokMPLS || 'Gugus 1 - Merpati';
                    const namaSiswa = p.nama || p.namaCalonSiswa || 'Nama Calon Siswa';

                    return (
                      <div 
                        key={p.id || idx}
                        className="p-4 rounded-2xl border-2 border-dashed border-amber-400 bg-white space-y-3 page-break-inside-avoid relative"
                      >
                        <div className="text-center border-b border-amber-200 pb-1.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                            {settings.schoolName || 'ROMBEL TAMBORA'}
                          </div>
                          <div className="text-xs font-black text-slate-900">KARTU PESERTA MPLS 2026/2027</div>
                          <div className="text-[9px] text-slate-500">Masa Pengenalan Lingkungan Belajar (MPLS)</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-12 h-14 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 font-black text-lg overflow-hidden flex-shrink-0">
                            {p.fotoUrl ? (
                              <img src={p.fotoUrl} alt={namaSiswa} className="w-full h-full object-cover" />
                            ) : (
                              namaSiswa.charAt(0)
                            )}
                          </div>
                          <div className="space-y-0.5 text-[11px] flex-1 min-w-0">
                            <div className="font-black text-slate-900 truncate">{namaSiswa}</div>
                            <div className="text-slate-600 text-[10px]">NISN: <span className="font-mono font-bold text-indigo-700">{p.nisn || '-'}</span></div>
                            <div className="text-slate-600 text-[10px]">No. PDKT: <span className="font-mono font-bold text-purple-700">{pdktNumber}</span></div>
                            <div className="text-slate-600 text-[10px]">Gugus / Kelas: <span className="font-bold text-slate-800">{gugusName}</span></div>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px]">
                          <div>
                            <span className="text-slate-400 block">Jalur: {p.jalur || p.jalurMasuk || 'Zonasi'}</span>
                          </div>
                          <div className="text-right italic text-slate-500">
                            ( Panitia SPMB )
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-3xl no-print">
              <span className="text-xs text-slate-500 font-medium">
                Total {selectedCardIds.length} kartu akan dicetak sekaligus.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBatchPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  onClick={triggerPrint}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Batch Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAIL MODAL (LIHAT) */}
      {/* ========================================================================= */}
      {viewDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Detail Pendaftar SPMB</h3>
              </div>
              <button 
                onClick={() => setViewDetailModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {Object.entries(viewDetailModal).map(([key, value]) => (
                <div key={key} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-slate-500">{key}</span>
                  <span className="font-extrabold text-slate-900 text-right">{String(value)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Tampilan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / CREATE MODAL */}
      {/* ========================================================================= */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Tambah Pendaftar Calon Siswa</h3>
              </div>
              <button 
                onClick={() => setAddModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Calon Siswa</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap..."
                  value={addModal.nama || ''}
                  onChange={(e) => setAddModal({ ...addModal, nama: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">NISN (10 Digit)</label>
                  <input
                    type="text"
                    placeholder="0012345678"
                    value={addModal.nisn || ''}
                    onChange={(e) => setAddModal({ ...addModal, nisn: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-add-jk"
                    label="JENIS KELAMIN"
                    value={addModal.jk || 'L'}
                    onChange={(val) => setAddModal({ ...addModal, jk: val })}
                    options={[
                      { value: 'L', label: 'Laki-laki (L)' },
                      { value: 'P', label: 'Perempuan (P)' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-add-jalur"
                    label="JALUR MASUK"
                    value={addModal.jalur || 'Zonasi'}
                    onChange={(val) => setAddModal({ ...addModal, jalur: val })}
                    options={[
                      { value: 'Zonasi', label: 'Zonasi' },
                      { value: 'Prestasi', label: 'Prestasi' },
                      { value: 'Afirmasi', label: 'Afirmasi' },
                      { value: 'Perpindahan', label: 'Perpindahan' }
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-add-gugus"
                    label="GUGUS MPLS"
                    value={addModal.gugus || 'Gugus 1 - Merpati'}
                    onChange={(val) => setAddModal({ ...addModal, gugus: val })}
                    options={[
                      { value: 'Gugus 1 - Merpati', label: 'Gugus 1 - Merpati' },
                      { value: 'Gugus 2 - Garuda', label: 'Gugus 2 - Garuda' },
                      { value: 'Gugus 3 - Rajawali', label: 'Gugus 3 - Rajawali' },
                      { value: 'Gugus 4 - Cendrawasih', label: 'Gugus 4 - Cendrawasih' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Asal Sekolah</label>
                  <input
                    type="text"
                    placeholder="TK / PAUD Asal"
                    value={addModal.asalSekolah || ''}
                    onChange={(e) => setAddModal({ ...addModal, asalSekolah: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kontak HP/WA</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={addModal.kontak || ''}
                    onChange={(e) => setAddModal({ ...addModal, kontak: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL */}
      {/* ========================================================================= */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Edit Pendaftar: {editModal.nama || editModal.namaCalonSiswa}</h3>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Calon Siswa</label>
                <input
                  type="text"
                  value={editModal.nama || editModal.namaCalonSiswa || ''}
                  onChange={(e) => setEditModal({ ...editModal, nama: e.target.value, namaCalonSiswa: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">NISN</label>
                  <input
                    type="text"
                    value={editModal.nisn || ''}
                    onChange={(e) => setEditModal({ ...editModal, nisn: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">No. PDKT MPLS</label>
                  <input
                    type="text"
                    value={editModal.pdkt || editModal.noPDKT || ''}
                    onChange={(e) => setEditModal({ ...editModal, pdkt: e.target.value, noPDKT: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-edit-jalur"
                    label="JALUR MASUK"
                    value={editModal.jalur || editModal.jalurMasuk || 'Zonasi'}
                    onChange={(val) => setEditModal({ ...editModal, jalur: val, jalurMasuk: val })}
                    options={[
                      { value: 'Zonasi', label: 'Zonasi' },
                      { value: 'Prestasi', label: 'Prestasi' },
                      { value: 'Afirmasi', label: 'Afirmasi' },
                      { value: 'Perpindahan', label: 'Perpindahan' }
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-edit-gugus"
                    label="GUGUS MPLS"
                    value={editModal.gugus || editModal.kelompokMPLS || 'Gugus 1 - Merpati'}
                    onChange={(val) => setEditModal({ ...editModal, gugus: val, kelompokMPLS: val })}
                    options={[
                      { value: 'Gugus 1 - Merpati', label: 'Gugus 1 - Merpati' },
                      { value: 'Gugus 2 - Garuda', label: 'Gugus 2 - Garuda' },
                      { value: 'Gugus 3 - Rajawali', label: 'Gugus 3 - Rajawali' },
                      { value: 'Gugus 4 - Cendrawasih', label: 'Gugus 4 - Cendrawasih' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-edit-berkas"
                    label="STATUS BERKAS"
                    value={editModal.berkas || editModal.statusBerkas || 'Lengkap'}
                    onChange={(val) => setEditModal({ ...editModal, berkas: val, statusBerkas: val })}
                    options={[
                      { value: 'Lengkap', label: 'Lengkap', badge: 'Lengkap' },
                      { value: 'Perlu Revisi', label: 'Perlu Revisi' },
                      { value: 'Belum Lengkap', label: 'Belum Lengkap' }
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-edit-status"
                    label="HASIL KEPUTUSAN"
                    value={editModal.status || editModal.hasilKeputusan || 'Proses'}
                    onChange={(val) => setEditModal({ ...editModal, status: val, hasilKeputusan: val })}
                    options={[
                      { value: 'Lulus', label: 'Lulus Diterima', badge: 'Lulus' },
                      { value: 'Cadangan', label: 'Cadangan' },
                      { value: 'Proses', label: 'Sedang Diproses' },
                      { value: 'Tidak Lulus', label: 'Tidak Lulus' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Skor Seleksi (0-100)</label>
                  <input
                    type="number"
                    value={editModal.skor || editModal.skorSeleksi || 80}
                    onChange={(e) => setEditModal({ ...editModal, skor: Number(e.target.value), skorSeleksi: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <CustomDropdown
                    id="spmb-edit-seragam"
                    label="UKURAN SERAGAM"
                    value={editModal.seragam || 'M'}
                    onChange={(val) => setEditModal({ ...editModal, seragam: val })}
                    options={[
                      { value: 'S', label: 'S (Small)' },
                      { value: 'M', label: 'M (Medium)' },
                      { value: 'L', label: 'L (Large)' },
                      { value: 'XL', label: 'XL (Extra Large)' },
                      { value: 'XXL', label: 'XXL' }
                    ]}
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Data Pendaftar SPMB</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data calon siswa <strong className="text-slate-800">"{deleteModal.name}"</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
