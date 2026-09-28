import React, { useState, useMemo } from 'react';
import { 
  Shield, Check, X, Search, Filter, RefreshCw, UserCheck, Edit3, 
  Eye, Lock, Unlock, Sliders, CheckSquare, Sparkles, Layers,
  ChevronRight, Award, ShieldAlert, Zap, AlertCircle, ShieldCheck
} from 'lucide-react';
import { ALL_32_ROLES, UserRoleItem, TabKey } from '../data/rolesData';
import { useActiveRole, getAllRolesList, saveCustomRolesList } from '../lib/permissions';
import { 
  validateAll32RolesAccess, 
  checkAndNotifyRoleAccess, 
  autoRepairEmptyRoles 
} from '../lib/roleAccessValidator';
import HakAksesTsvExporter from './pengaturan/HakAksesTsvExporter';

export default function RoleAccessMatrix() {
  const { role: currentActiveRole, switchRole } = useActiveRole();
  const [rolesList, setRolesList] = useState<UserRoleItem[]>(getAllRolesList());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  // Modal State for Edit Permissions
  const [editingRole, setEditingRole] = useState<UserRoleItem | null>(null);
  const [viewingRole, setViewingRole] = useState<UserRoleItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Validasi Real-time 32 Role & Deteksi Akses Kosong
  const validationReport = useMemo(() => {
    return validateAll32RolesAccess(rolesList);
  }, [rolesList]);

  const allCategories = useMemo(() => {
    const cats = new Set(ALL_32_ROLES.map(r => r.kategori));
    return Array.from(cats);
  }, []);

  const allTabsList: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'master-data', label: 'Master Data' },
    { key: 'spmb', label: 'SPMB' },
    { key: 'akademik', label: 'Akademik' },
    { key: 'ujian-cbt', label: 'Ujian CBT' },
    { key: 'penugasan', label: 'Penugasan' },
    { key: 'keuangan', label: 'Keuangan' },
    { key: 'bk', label: 'BK & Disiplin' },
    { key: 'inventaris', label: 'Inventaris' },
    { key: 'dokumen-surat', label: 'Dokumen Surat' },
    { key: 'laporan', label: 'Laporan' },
    { key: 'riwayat-arsip', label: 'Buku Induk & Arsip' },
    { key: 'pengaturan', label: 'Pengaturan System' },
  ];

  const filteredRoles = useMemo(() => {
    return rolesList.filter(r => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        r.id.toLowerCase().includes(q) || 
        r.namaRole.toLowerCase().includes(q) || 
        r.deskripsi.toLowerCase().includes(q) ||
        r.kategori.toLowerCase().includes(q);
      
      const matchLevel = selectedLevel === 'all' || r.level.toString() === selectedLevel;
      const matchCategory = selectedCategory === 'all' || r.kategori === selectedCategory;

      return matchSearch && matchLevel && matchCategory;
    });
  }, [rolesList, searchTerm, selectedLevel, selectedCategory]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSimulateRole = (roleItem: UserRoleItem) => {
    switchRole(roleItem.id);
    showNotification(`Berhasil beralih role ke: ${roleItem.namaRole} (${roleItem.id})`);
  };

  const handleSaveEditedRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    
    const updated = rolesList.map(r => r.id === editingRole.id ? editingRole : r);
    setRolesList(updated);
    saveCustomRolesList(updated);
    
    if (currentActiveRole.id === editingRole.id) {
      switchRole(editingRole.id);
    }
    
    setEditingRole(null);
    showNotification(`Izin hak akses untuk ${editingRole.namaRole} berhasil diperbarui!`);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan seluruh 32 role dan matriks izin ke pengaturan standar awal?')) {
      setRolesList(ALL_32_ROLES);
      saveCustomRolesList(ALL_32_ROLES);
      showNotification('Seluruh konfigurasi 32 role telah direset ke default.');
    }
  };

  const handleRunValidation = async () => {
    await checkAndNotifyRoleAccess({
      silentIfValid: false,
      rolesList,
      onFixed: () => {
        setRolesList(getAllRolesList());
        showNotification('Hak akses role berhasil diperbaiki!');
      }
    });
  };

  const handleFixEmptyRoles = () => {
    const res = autoRepairEmptyRoles(validationReport.emptyAccessRoles.map(r => r.id));
    setRolesList(getAllRolesList());
    showNotification(`Berhasil memulihkan ${res.repairedCount} role ke konfigurasi standar awal!`);
  };

  const toggleTabInEditModal = (tabKey: TabKey) => {
    if (!editingRole) return;
    const exists = editingRole.allowedTabs.includes(tabKey);
    const updatedTabs = exists
      ? editingRole.allowedTabs.filter(t => t !== tabKey)
      : [...editingRole.allowedTabs, tabKey];
    
    setEditingRole({
      ...editingRole,
      allowedTabs: updatedTabs
    });
  };

  const toggleActionInEditModal = (actionKey: keyof UserRoleItem['generalActions']) => {
    if (!editingRole) return;
    setEditingRole({
      ...editingRole,
      generalActions: {
        ...editingRole.generalActions,
        [actionKey]: !editingRole.generalActions[actionKey]
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check size={16} />
          </div>
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Active Role Indicator Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-3xl border border-indigo-700/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0 shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                Sesi Aktif Saat Ini
              </span>
              <span className="text-[10px] uppercase font-mono font-bold text-amber-300">
                {currentActiveRole.id}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
              {currentActiveRole.namaRole} <span className="text-xs text-indigo-200 font-semibold">(Level {currentActiveRole.level})</span>
            </h2>
            <p className="text-xs text-indigo-200/90 font-medium line-clamp-1 mt-0.5">
              {currentActiveRole.deskripsi}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={handleRunValidation}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs border ${
              validationReport.isValid
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
                : 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-200 border-rose-400/40 animate-pulse'
            }`}
            title="Validasi Pemetaan Seluruh 32 Role & Deteksi Akses Kosong"
          >
            <ShieldCheck size={14} className={validationReport.isValid ? 'text-emerald-300' : 'text-rose-300'} />
            <span>Validasi 32 Hak Akses</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              validationReport.isValid 
                ? 'bg-emerald-500 text-white' 
                : 'bg-rose-600 text-white'
            }`}>
              {validationReport.isValid 
                ? '32/32 OK' 
                : `${validationReport.emptyAccessRoles.length} Kosong`}
            </span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
            title="Reset Pengaturan Role"
          >
            <RefreshCw size={13} />
            <span>Reset Standar</span>
          </button>
        </div>
      </div>

      {/* Alert Banner: Role Akses Kosong Ditemukan */}
      {!validationReport.isValid && (
        <div className="bg-rose-50 border-2 border-rose-300/80 p-5 rounded-3xl shadow-sm space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 tracking-tight flex items-center gap-2">
                  <span>Peringatan: {validationReport.emptyAccessRoles.length} Role Terdeteksi Memiliki Hak Akses Kosong!</span>
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 font-medium leading-relaxed">
                  Pengguna yang login dengan role di bawah ini tidak akan dapat membuka modul sekolah karena hak akses tab kosong atau seluruh izin bernilai non-aktif.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={handleFixEmptyRoles}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-rose-200"
              >
                <Sparkles size={14} />
                <span>Pulihkan Akses Standar</span>
              </button>
              <button
                onClick={handleRunValidation}
                className="px-3.5 py-2 bg-white border border-rose-200 text-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100/50 transition"
              >
                Rincian Masalah
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-rose-200">
            {validationReport.emptyAccessRoles.map(item => (
              <div key={item.id} className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{item.id}</span>
                  <span className="text-xs font-black text-slate-800 truncate">{item.namaRole}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 whitespace-nowrap">
                  0 Modul
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Komponen Ekspor & Salin Master Data HAK_AKSES Spreadsheet */}
      <HakAksesTsvExporter />

      {/* Filter & View Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari dari 32 Role (nama, kode RL-xxx, deskripsi, kategori)..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Level (1 - 6)</option>
            <option value="1">Level 1 - Super & Pimpinan Yayasan</option>
            <option value="2">Level 2 - Admin, Infra & Kepsek</option>
            <option value="3">Level 3 - Wakasek, KTU & Bendahara</option>
            <option value="4">Level 4 - Guru, Staf TU, Kasir & Sarpras</option>
            <option value="5">Level 5 - Siswa, Ortu & Alumni</option>
            <option value="6">Level 6 - Guest & Publik</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Kategori Peran</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* View Mode Toggle (Cards vs Matrix Table) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kartu (32 Role)
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'matrix' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Modul
            </button>
          </div>

          {/* Tombol Salin & Download 134 Baris Sheet HAK_AKSES */}
          <button
            type="button"
            onClick={() => {
              const rows = [
                'id\trole\tmenuId\tdapatLihat\tdapatTambah\tdapatEdit\tdapatHapus',
                'HA-001\tSUPERADMIN\tMN-01\tYA\tYA\tYA\tYA',
                'HA-002\tSUPERADMIN\tMN-02\tYA\tYA\tYA\tYA',
                'HA-003\tSUPERADMIN\tMN-03\tYA\tYA\tYA\tYA',
                'HA-004\tSUPERADMIN\tMN-04\tYA\tYA\tYA\tYA',
                'HA-005\tSUPERADMIN\tMN-05\tYA\tYA\tYA\tYA',
                'HA-006\tSUPERADMIN\tMN-06\tYA\tYA\tYA\tYA',
                'HA-007\tSUPERADMIN\tMN-07\tYA\tYA\tYA\tYA',
                'HA-008\tSUPERADMIN\tMN-08\tYA\tYA\tYA\tYA',
                'HA-009\tSUPERADMIN\tMN-09\tYA\tYA\tYA\tYA',
                'HA-010\tSUPERADMIN\tMN-10\tYA\tYA\tYA\tYA',
                'HA-011\tSUPERADMIN\tMN-11\tYA\tYA\tYA\tYA',
                'HA-012\tSUPERADMIN\tMN-12\tYA\tYA\tYA\tYA',
                'HA-013\tSUPERADMIN\tMN-13\tYA\tYA\tYA\tYA',
                'HA-014\tADMIN\tMN-ALL\tYA\tYA\tYA\tYA',
                'HA-015\tSYSTEM_ADMINISTRATOR\tMN-ALL\tYA\tYA\tYA\tYA',
                'HA-016\tDEVELOPER\tMN-ALL\tYA\tYA\tYA\tYA',
                'HA-017\tTECHNICAL_SUPPORT\tMN-ALL\tYA\tYA\tYA\tYA',
                'HA-018\tKETUA_YAYASAN\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-019\tKETUA_YAYASAN\tMN-02\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-020\tKETUA_YAYASAN\tMN-03\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-021\tKETUA_YAYASAN\tMN-04\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-022\tKETUA_YAYASAN\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-023\tKETUA_YAYASAN\tMN-10\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-024\tKETUA_YAYASAN\tMN-11\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-025\tKETUA_YAYASAN\tMN-12\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-026\tPENGURUS_YAYASAN\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-027\tPENGURUS_YAYASAN\tMN-02\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-028\tPENGURUS_YAYASAN\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-029\tPENGURUS_YAYASAN\tMN-11\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-030\tPENGAWAS_YAYASAN\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-031\tPENGAWAS_YAYASAN\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-032\tPENGAWAS_YAYASAN\tMN-11\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-033\tPENGAWAS_YAYASAN\tMN-12\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-034\tKEPALA_SEKOLAH\tMN-01\tYA\tYA\tYA\tTIDAK',
                'HA-035\tKEPALA_SEKOLAH\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-036\tKEPALA_SEKOLAH\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-037\tKEPALA_SEKOLAH\tMN-04\tYA\tYA\tYA\tTIDAK',
                'HA-038\tKEPALA_SEKOLAH\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-039\tKEPALA_SEKOLAH\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-040\tKEPALA_SEKOLAH\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-041\tKEPALA_SEKOLAH\tMN-12\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-042\tKEPALA_SEKOLAH\tMN-13\tYA\tYA\tYA\tTIDAK',
                'HA-043\tWAKASEK_KURIKULUM\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-044\tWAKASEK_KURIKULUM\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-045\tWAKASEK_KURIKULUM\tMN-04\tYA\tYA\tYA\tTIDAK',
                'HA-046\tWAKASEK_KURIKULUM\tMN-05\tYA\tYA\tYA\tTIDAK',
                'HA-047\tWAKASEK_KURIKULUM\tMN-06\tYA\tYA\tYA\tTIDAK',
                'HA-048\tWAKASEK_KURIKULUM\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-049\tWAKASEK_KESISWAAN\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-050\tWAKASEK_KESISWAAN\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-051\tWAKASEK_KESISWAAN\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-052\tWAKASEK_KESISWAAN\tMN-04\tYA\tYA\tYA\tTIDAK',
                'HA-053\tWAKASEK_KESISWAAN\tMN-08\tYA\tYA\tYA\tTIDAK',
                'HA-054\tWAKASEK_KESISWAAN\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-055\tWAKASEK_SARPRAS\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-056\tWAKASEK_SARPRAS\tMN-09\tYA\tYA\tYA\tTIDAK',
                'HA-057\tWAKASEK_SARPRAS\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-058\tWAKASEK_SARPRAS\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-059\tWAKASEK_HUMAS\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-060\tWAKASEK_HUMAS\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-061\tWAKASEK_HUMAS\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-062\tWAKASEK_HUMAS\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-063\tKTU\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-064\tKTU\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-065\tKTU\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-066\tKTU\tMN-07\tYA\tYA\tYA\tTIDAK',
                'HA-067\tKTU\tMN-09\tYA\tYA\tYA\tTIDAK',
                'HA-068\tKTU\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-069\tKTU\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-070\tOPERATOR\tMN-ALL\tYA\tYA\tYA\tYA',
                'HA-071\tTU\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-072\tTU\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-073\tTU\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-074\tTU\tMN-09\tYA\tYA\tYA\tTIDAK',
                'HA-075\tTU\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-076\tBENDAHARA\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-077\tBENDAHARA\tMN-02\tYA\tYA\tYA\tTIDAK',
                'HA-078\tBENDAHARA\tMN-07\tYA\tYA\tYA\tYA',
                'HA-079\tBENDAHARA\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-080\tKASIR\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-081\tKASIR\tMN-07\tYA\tYA\tYA\tTIDAK',
                'HA-082\tKASIR\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-083\tGURU\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-084\tGURU\tMN-04\tYA\tYA\tYA\tTIDAK',
                'HA-085\tGURU\tMN-05\tYA\tYA\tYA\tTIDAK',
                'HA-086\tGURU\tMN-06\tYA\tYA\tYA\tTIDAK',
                'HA-087\tGURU\tMN-08\tYA\tYA\tYA\tTIDAK',
                'HA-088\tGURU\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-089\tWALI_KELAS\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-090\tWALI_KELAS\tMN-04\tYA\tYA\tYA\tTIDAK',
                'HA-091\tWALI_KELAS\tMN-05\tYA\tYA\tYA\tTIDAK',
                'HA-092\tWALI_KELAS\tMN-06\tYA\tYA\tYA\tTIDAK',
                'HA-093\tWALI_KELAS\tMN-08\tYA\tYA\tYA\tTIDAK',
                'HA-094\tWALI_KELAS\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-095\tBK\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-096\tBK\tMN-04\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-097\tBK\tMN-08\tYA\tYA\tYA\tYA',
                'HA-098\tBK\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-099\tPUSTAKAWAN\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-100\tPUSTAKAWAN\tMN-09\tYA\tYA\tYA\tTIDAK',
                'HA-101\tPUSTAKAWAN\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-102\tPETUGAS_UKS\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-103\tPETUGAS_UKS\tMN-08\tYA\tYA\tYA\tTIDAK',
                'HA-104\tPETUGAS_UKS\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-105\tINVENTARIS\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-106\tINVENTARIS\tMN-09\tYA\tYA\tYA\tYA',
                'HA-107\tINVENTARIS\tMN-10\tYA\tYA\tYA\tTIDAK',
                'HA-108\tINVENTARIS\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-109\tADMIN_CBT\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-110\tADMIN_CBT\tMN-04\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-111\tADMIN_CBT\tMN-05\tYA\tYA\tYA\tYA',
                'HA-112\tADMIN_CBT\tMN-11\tYA\tYA\tYA\tTIDAK',
                'HA-113\tSISWA\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-114\tSISWA\tMN-04\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-115\tSISWA\tMN-05\tYA\tYA\tTIDAK\tTIDAK',
                'HA-116\tSISWA\tMN-06\tYA\tYA\tYA\tTIDAK',
                'HA-117\tSISWA\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-118\tSISWA\tMN-08\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-119\tORANG_TUA\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-120\tORANG_TUA\tMN-04\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-121\tORANG_TUA\tMN-07\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-122\tORANG_TUA\tMN-08\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-123\tALUMNI\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-124\tALUMNI\tMN-10\tYA\tYA\tTIDAK\tTIDAK',
                'HA-125\tALUMNI\tMN-12\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-126\tVENDOR\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-127\tVENDOR\tMN-09\tYA\tYA\tYA\tTIDAK',
                'HA-128\tVENDOR\tMN-10\tYA\tYA\tTIDAK\tTIDAK',
                'HA-129\tGUEST\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-130\tGUEST\tMN-03\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-131\tCALON_SISWA\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-132\tCALON_SISWA\tMN-03\tYA\tYA\tYA\tTIDAK',
                'HA-133\tORTU_CALON_SISWA\tMN-01\tYA\tTIDAK\tTIDAK\tTIDAK',
                'HA-134\tORTU_CALON_SISWA\tMN-03\tYA\tYA\tYA\tTIDAK',
              ];
              const tsvContent = rows.join('\n');
              navigator.clipboard.writeText(tsvContent).then(() => {
                showNotification('134 Baris HAK_AKSES berhasil disalin ke Clipboard! Tinggal Paste (Ctrl+V) di Google Sheets.');
              }).catch(() => {
                showNotification('Data HAK_AKSES disiapkan.');
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
            title="Klik untuk menyalin 134 baris tabel HAK_AKSES ke clipboard"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span>Salin 134 Baris TSV</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Menampilkan <strong className="text-slate-800">{filteredRoles.length}</strong> dari 32 Role Hak Akses</span>
          <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
            <Shield size={12} />
            Matriks Hak Akses & Perizinan Modul Terpadu
          </span>
        </div>
      </div>

      {/* RENDER VIEW 1: CARDS (32 ROLES) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((r) => {
            const isCurrent = currentActiveRole.id === r.id;
            return (
              <div 
                key={r.id}
                className={`bg-white rounded-3xl border p-5 flex flex-col justify-between transition-all duration-200 relative ${
                  isCurrent 
                    ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md' 
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Top Badge Info */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      {r.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {r.allowedTabs.length === 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 animate-pulse">
                          <AlertCircle size={10} />
                          Akses Kosong
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${r.badgeColor}`}>
                        Level {r.level}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {r.kategori}
                      </span>
                    </div>
                  </div>

                  {/* Role Name & Description */}
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center justify-between">
                    <span>{r.namaRole}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                        Aktif
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {r.deskripsi}
                  </p>

                  {/* Allowed Modules Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">Akses Modul:</span>
                      <span className={`font-semibold ${r.allowedTabs.length === 0 ? 'text-rose-600 font-black' : 'text-indigo-600'}`}>
                        {r.allowedTabs.length} Modul
                      </span>
                    </div>
                    {r.allowedTabs.length === 0 ? (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
                        <span>Role tidak memiliki akses modul apapun (Akses Kosong)</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.allowedTabs.slice(0, 6).map(t => (
                          <span key={t} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {t}
                          </span>
                        ))}
                        {r.allowedTabs.length > 6 && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                            +{r.allowedTabs.length - 6} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Permissions Mini Flags */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[10px] font-bold text-slate-600">
                    <div className={`p-1 rounded flex items-center gap-1 ${r.generalActions.canCreate ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                      {r.generalActions.canCreate ? <Check size={11} /> : <X size={11} />}
                      <span>Tambah</span>
                    </div>
                    <div className={`p-1 rounded flex items-center gap-1 ${r.generalActions.canEdit ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                      {r.generalActions.canEdit ? <Check size={11} /> : <X size={11} />}
                      <span>Ubah</span>
                    </div>
                    <div className={`p-1 rounded flex items-center gap-1 ${r.generalActions.canDelete ? 'text-rose-700 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>
                      {r.generalActions.canDelete ? <Check size={11} /> : <X size={11} />}
                      <span>Hapus</span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setViewingRole(r)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                  >
                    <Eye size={13} />
                    <span>Lihat Izin Role</span>
                  </button>

                  <button
                    onClick={() => setEditingRole({ ...r })}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    title="Ubah Hak Akses & Modul"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER VIEW 2: CROSS MATRIX TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm">Tabel Matriks Akses Silang (32 Role vs 14 Modul)</h3>
            <span className="text-[11px] text-slate-400">Scroll horizontal untuk melihat seluruh modul</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 max-h-[650px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black sticky top-0 z-20">
                <tr>
                  <th className="p-3 pl-4 sticky left-0 z-30 bg-slate-900 min-w-[200px]">Role / Jabatan</th>
                  <th className="p-3 text-center min-w-[70px]">Level</th>
                  {allTabsList.map(t => (
                    <th key={t.key} className="p-3 text-center min-w-[95px] whitespace-nowrap">
                      {t.label}
                    </th>
                  ))}
                  <th className="p-3 pr-4 text-center sticky right-0 z-30 bg-slate-900 min-w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRoles.map((r) => {
                  const isCurrent = currentActiveRole.id === r.id;
                  return (
                    <tr key={r.id} className={`hover:bg-indigo-50/40 transition ${isCurrent ? 'bg-indigo-50/70 font-bold' : ''}`}>
                      <td className={`p-3 pl-4 sticky left-0 z-10 ${isCurrent ? 'bg-indigo-50' : 'bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{r.id}</span>
                          <span className="font-bold text-slate-900 truncate">{r.namaRole}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block line-clamp-1">{r.deskripsi}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.badgeColor}`}>
                          L{r.level}
                        </span>
                      </td>
                      {allTabsList.map(t => {
                        const hasAccess = r.allowedTabs.includes(t.key) || r.level === 1;
                        return (
                          <td key={t.key} className="p-3 text-center">
                            {hasAccess ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800">
                                <Check size={14} />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-300">
                                <X size={12} />
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`p-3 pr-4 text-center sticky right-0 z-10 ${isCurrent ? 'bg-indigo-50' : 'bg-white'}`}>
                        <button
                          onClick={() => setViewingRole(r)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg transition"
                        >
                          {isCurrent ? 'Aktif' : 'Detail'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (VIEW) */}
      {viewingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{viewingRole.namaRole} ({viewingRole.id})</h3>
                  <p className="text-xs text-slate-500">Level {viewingRole.level} • {viewingRole.kategori}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingRole(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Deskripsi Peran:</span>
                <p className="font-medium text-slate-800 text-sm">{viewingRole.deskripsi}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Logika Akses & Otoritas:</span>
                <p className="font-medium text-slate-800">{viewingRole.deskripsiAkses}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Modul yang Diizinkan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingRole.allowedTabs.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                      ✓ {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Otoritas Operasi (CRUD):</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canCreate ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Buat Data Baru (Create)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canEdit ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Edit Data (Update)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canDelete ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Hapus Data (Delete)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canExport ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Cetak / Export Excel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canApprove ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Persetujuan (Approval)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {viewingRole.generalActions.canManageSettings ? <Check className="text-emerald-600" size={14} /> : <X className="text-rose-500" size={14} />}
                    <span>Akses Konfigurasi System</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end border-t border-slate-100">
              <button
                onClick={() => setViewingRole(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Ubah Izin Role: {editingRole.namaRole}</h3>
                  <p className="text-xs text-slate-500">Sesuaikan hak akses modul dan operasi CRUD untuk role ini</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingRole(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRole} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Deskripsi Peran</label>
                <input
                  type="text"
                  value={editingRole.deskripsi}
                  onChange={(e) => setEditingRole({ ...editingRole, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Toggle Allowed Tabs */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Modul yang Dapat Diakses</span>
                  <span className="text-indigo-600 font-bold">{editingRole.allowedTabs.length} Modul Terpilih</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allTabsList.map(tab => {
                    const isChecked = editingRole.allowedTabs.includes(tab.key);
                    return (
                      <button
                        type="button"
                        key={tab.key}
                        onClick={() => toggleTabInEditModal(tab.key)}
                        className={`p-2 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{tab.label}</span>
                        {isChecked && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {editingRole.allowedTabs.length === 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                    <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block text-rose-900">Perhatian: Hak Akses Modul Kosong!</span>
                      <span className="text-[11px] text-rose-700 font-medium">
                        Anda belum memilih satupun modul untuk role ini. Jika disimpan, pengguna dengan role {editingRole.namaRole} tidak akan dapat membuka halaman aplikasi.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle General Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Izin Operasi Sistem
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'canCreate', label: 'Tambah Data (Create)' },
                    { key: 'canEdit', label: 'Ubah Data (Edit)' },
                    { key: 'canDelete', label: 'Hapus Data (Delete)' },
                    { key: 'canExport', label: 'Cetak / Export Excel' },
                    { key: 'canApprove', label: 'Persetujuan / Approval' },
                    { key: 'canManageSettings', label: 'Konfigurasi Sistem' },
                  ].map(act => {
                    const isChecked = !!editingRole.generalActions[act.key as keyof UserRoleItem['generalActions']];
                    return (
                      <button
                        type="button"
                        key={act.key}
                        onClick={() => toggleActionInEditModal(act.key as keyof UserRoleItem['generalActions'])}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isChecked 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span>{act.label}</span>
                        {isChecked ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Simpan Perubahan Izin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
