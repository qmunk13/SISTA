import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  Database, 
  FileCheck, 
  BookOpen, 
  GraduationCap, 
  CreditCard, 
  UserX, 
  Book, 
  Package, 
  FileText, 
  BarChart, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  History,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { User, Role } from '../types';
import { hasMenuAccess } from '../utils/permissionHelper';

interface SidebarProps {
  user: User;
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Sidebar({ 
  user, 
  collapsed, 
  onToggle, 
  activeTab, 
  onSelectTab, 
  onLogout,
  theme = 'dark',
  onToggleTheme
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [avatar, setAvatar] = useState(localStorage.getItem('ERP_avatar_' + user.username) || '');

  useEffect(() => {
    const handleAvatarChange = (e: any) => {
      if (e.detail.username === user.username) {
        setAvatar(e.detail.url);
      }
    };
    window.addEventListener('erp_avatar_changed', handleAvatarChange);
    return () => window.removeEventListener('erp_avatar_changed', handleAvatarChange);
  }, [user.username]);

  // Synchronized state for active sub-tabs in each module
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>(() => ({
    master: localStorage.getItem('erp_subtab_master') || 'dashboard',
    spmb: localStorage.getItem('erp_subtab_spmb') || 'dashboard',
    akademik: localStorage.getItem('erp_subtab_akademik') || 'dashboard',
    cbt: localStorage.getItem('erp_subtab_cbt') || 'dashboard',
    penugasan: localStorage.getItem('erp_subtab_penugasan') || 'daftar',
    keuangan: localStorage.getItem('erp_subtab_keuangan') || 'dashboard',
    bk: localStorage.getItem('erp_subtab_bk') || 'dashboard',
    perpustakaan: localStorage.getItem('erp_subtab_perpustakaan') || 'dashboard',
    inventaris: localStorage.getItem('erp_subtab_inventaris') || 'dashboard',
    dokumen: localStorage.getItem('erp_subtab_dokumen') || 'dashboard',
    laporan: localStorage.getItem('erp_subtab_laporan') || 'dashboard',
    riwayat: localStorage.getItem('erp_subtab_riwayat') || 'dashboard',
    pengaturan: localStorage.getItem('erp_subtab_pengaturan') || 'dashboard',
  }));

  // Track expanded menu parent sections (default is all collapsed/hidden)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync real-time subtab changes
  useEffect(() => {
    const handleSubTabChange = (e: CustomEvent) => {
      if (e.detail && e.detail.tab) {
        setActiveSubTabs(prev => ({
          ...prev,
          [e.detail.tab]: e.detail.subTab
        }));
      }
    };
    window.addEventListener('erp-subtab-change', handleSubTabChange as EventListener);
    return () => window.removeEventListener('erp-subtab-change', handleSubTabChange as EventListener);
  }, []);

  interface SubMenuItem {
    id: string;
    label: string;
    roles?: string[];
  }

  interface MenuItem {
    id: string;
    label: string;
    icon: any;
    subMenus?: SubMenuItem[];
  }

  // Blueprint Menu with subMenus definitions
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { 
      id: 'master', 
      label: 'Master Data', 
      icon: Database,
      subMenus: [
        { id: 'dashboard', label: 'Dashboard Master' },
        { id: 'siswa', label: 'Data Siswa' },
        { id: 'guru', label: 'Data Guru' },
        { id: 'ortu', label: 'Orang Tua' },
        { id: 'kelas', label: 'Kelas & Wali' },
        { id: 'jenjang', label: 'Jenjang Pendidikan' },
        { id: 'mapel', label: 'Mata Pelajaran' },
        { id: 'tahun_ajaran', label: 'Tahun Ajaran' },
        { id: 'hari_libur', label: 'Hari Libur' },
        { id: 'barang', label: 'Daftar Barang & Aset' },
        { id: 'dapodik_validasi', label: 'Validasi & Sinkronisasi Dapodik 2026' },
        { id: 'import_export', label: 'Impor & Ekspor' }
      ]
    },
    { 
      id: 'spmb', 
      label: 'SPMB', 
      icon: FileCheck,
      subMenus: [
        { id: 'dashboard', label: 'Dashboard SPMB' },
        { id: 'form', label: 'Formulir Pendaftaran' },
        { id: 'data', label: 'Data Pendaftar' },
        { id: 'upload', label: 'Unggah Berkas' },
        { id: 'verifikasi', label: 'Verifikasi' },
        { id: 'seleksi', label: 'Penyaringan Seleksi' },
        { id: 'pengumuman', label: 'Hasil Pengumuman' },
        { id: 'daftar_ulang', label: 'Daftar Ulang' },
        { id: 'pdkt', label: 'Kartu Orientasi' }
      ]
    },
    { 
      id: 'akademik', 
      label: 'Akademik', 
      icon: GraduationCap,
      subMenus: [
        { id: 'dashboard', label: 'Dashboard Akademik', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'SISWA', 'WALI_KELAS', 'ORANG_TUA'] },
        { id: 'kurikulum', label: 'Dashboard Kurikulum (Kemendikdasmen)', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'SISWA', 'WALI_KELAS', 'ORANG_TUA', 'WAKASEK_KURIKULUM'] },
        { id: 'jadwal', label: 'Jadwal Rombel', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'SISWA'] },
        { id: 'data_siswa_kelas', label: 'Data Siswa Kelas', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'WALI_KELAS'] },
        { id: 'agenda', label: 'Agenda Guru', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU'] },
        { id: 'absensi_siswa', label: user.role === 'ORANG_TUA' ? 'Absensi Anak' : 'Absensi Siswa', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'SISWA', 'ORANG_TUA'] },
        { id: 'absensi_guru', label: 'Absensi Guru', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU'] },
        { id: 'qr_scanner', label: 'QR Scanner Portal', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS'] },
        { id: 'input_nilai', label: user.role === 'ORANG_TUA' ? 'Nilai Formatif & Sumatif' : 'Penilaian Formatif & Sumatif', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'SISWA', 'ORANG_TUA'] },
        { id: 'rapor', label: 'Rapor Akhir', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'WALI_KELAS', 'SISWA'] },
        { id: 'ranking', label: 'Peringkat & Ranking', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR'] },
        { id: 'kenaikan', label: 'Kenaikan Kelas', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR'] }
      ]
    },
    { 
      id: 'cbt', 
      label: 'CBT/Ujian', 
      icon: BookOpen,
      subMenus: [
        { id: 'dashboard', label: 'CBT Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'jenis_ujian', label: 'Jenis Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'rapor', label: 'Rapor Pendidikan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'bank', label: 'Bank Soal', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
        { id: 'ujian', label: 'Jadwal Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'token', label: 'Token Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU'] },
        { id: 'proktor', label: 'Pengawasan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
        { id: 'hasil', label: 'Hasil Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'analisis', label: 'Analisis Nilai', roles: ['SUPERADMIN', 'ADMIN', 'GURU'] }
      ]
    },
    { 
      id: 'penugasan', 
      label: 'Penugasan', 
      icon: FileText,
      subMenus: [
        { id: 'dashboard', label: 'Dashboard Tugas', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
        { id: 'daftar', label: 'Daftar Tugas', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
        { id: 'hasil', label: 'Hasil Pengumpulan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] }
      ]
    },
    { 
      id: 'keuangan', 
      label: 'Keuangan', 
      icon: CreditCard,
      subMenus: [
        { id: 'dashboard', label: '1. Ringkasan & Kasir', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
        { id: 'biaya', label: '2. Tarif & Pos Biaya', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] },
        { id: 'tabungan', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? '3. Tabungan Saya' : '3. Tabungan Siswa', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
        { id: 'tagihan', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? '4. Tagihan Saya' : '4. Tagihan & Bayar Siswa', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
        { id: 'invoices', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? '5. Kwitansi Sah' : '5. Riwayat Kwitansi Sah', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
        { id: 'laporan', label: '6. Laporan & Neraca', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] },
        { id: 'kas', label: '7. Buku Kas & Pengeluaran', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] }
      ]
    },
    { 
      id: 'bk', 
      label: 'BK', 
      icon: UserX,
      subMenus: [
        { id: 'dashboard', label: 'BK Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
        { id: 'bimbingan', label: 'Konseling Siswa', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
        { id: 'pelanggaran', label: 'Catatan Pelanggaran', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
        { id: 'prestasi', label: 'Prestasi Siswa', roles: ['SUPERADMIN', 'ADMIN'] },
        { id: 'karir', label: 'Karir & Rekomendasi', roles: ['SUPERADMIN', 'ADMIN'] }
      ]
    },
    { 
      id: 'perpustakaan', 
      label: 'Perpustakaan', 
      icon: Book,
      subMenus: [
        { id: 'dashboard', label: 'Perpustakaan Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'PUSTAKAWAN', 'GURU', 'SISWA'] },
        { id: 'katalog', label: 'Katalog Buku', roles: ['SUPERADMIN', 'ADMIN', 'PUSTAKAWAN', 'GURU', 'SISWA'] },
        { id: 'peminjaman', label: 'Sirkulasi Peminjaman', roles: ['SUPERADMIN', 'ADMIN', 'PUSTAKAWAN'] },
        { id: 'denda', label: 'Pengembalian & Denda', roles: ['SUPERADMIN', 'ADMIN', 'PUSTAKAWAN'] }
      ]
    },
    { 
      id: 'inventaris', 
      label: 'Inventaris', 
      icon: Package,
      subMenus: [
        { id: 'dashboard', label: 'Inventaris Dashboard' },
        { id: 'lokasi_tab', label: 'Ruangan' },
        { id: 'mutasi', label: 'Mutasi & Pinjam' },
        { id: 'rusak', label: 'Kondisi & Rusak' }
      ]
    },
    { 
      id: 'dokumen', 
      label: 'Dokumen', 
      icon: FileText,
      subMenus: [
        { id: 'dashboard', label: 'Dokumen Dashboard' },
        { id: 'arsip', label: 'Arsip Digital' },
        { id: 'surat_masuk', label: 'Surat Masuk' },
        { id: 'surat_keluar', label: 'Surat Keluar' },
        { id: 'template', label: 'Template Surat' }
      ]
    },
    { 
      id: 'laporan', 
      label: 'Laporan', 
      icon: BarChart,
      subMenus: [
        { id: 'dashboard', label: 'Laporan Dashboard' },
        { id: 'ringkasan_bulanan', label: 'Ringkasan Bulanan' },
        { id: 'siswa', label: 'Lap. Data Siswa' },
        { id: 'akademik', label: 'Lap. Akademik' },
        { id: 'keuangan', label: 'Lap. Keuangan' },
        { id: 'bk', label: 'Lap. BK & Pelanggaran' },
        { id: 'inventaris', label: 'Lap. Sarpras (Aset)' }
      ]
    },
    { 
      id: 'riwayat', 
      label: 'Riwayat & Arsip', 
      icon: History,
      subMenus: [
        { id: 'dashboard', label: 'Dashboard Arsip' },
        { id: 'siswa', label: 'Riwayat Siswa' },
        { id: 'keuangan', label: 'Riwayat Keuangan' },
        { id: 'guru', label: 'Riwayat Guru & Staf' },
        { id: 'lainnya', label: 'Arsip & Log Lainnya' }
      ]
    },
    { 
      id: 'pengaturan', 
      label: (user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH' || user.role === 'YAYASAN' || user.roles?.includes('SUPERADMIN') || user.roles?.includes('ADMIN')) ? 'Pengaturan' : 'Profil Saya', 
      icon: Settings,
      subMenus: [
        { id: 'dashboard', label: 'Pengaturan Dashboard' },
        { id: 'role', label: 'Hak Akses & Role' },
        { id: 'database_integrasi', label: 'Database & Integrasi (Sync GAS)' },
        { id: 'konfigurasi', label: 'Konfigurasi Umum' },
        { id: 'tampilan', label: 'CMS Dashboard Publik' },
        { id: 'jadwal_kegiatan', label: 'Input Jadwal Kegiatan & Per Kelas' },
        { id: 'berita', label: 'Kelola Berita' },
        { id: 'kelola_konten', label: 'Media & Unduhan' },
        { id: 'formulir', label: 'Konfigurasi Formulir' },
        { id: 'backup', label: 'Backup & Restore (JSON)' }
      ]
    }
  ];

  // Filter based on user permissions matrix (supporting multi-role)
  const allowedItems = menuItems.filter(item => hasMenuAccess(user, item.id));

  // Handler when clicking sub-tab item
  const handleSubMenuClick = (parentId: string, subId: string) => {
    setActiveSubTabs(prev => ({
      ...prev,
      [parentId]: subId
    }));
    localStorage.setItem(`erp_subtab_${parentId}`, subId);
    onSelectTab(parentId);
    
    // Dispatch CustomEvent immediately for children to update reactively
    window.dispatchEvent(new CustomEvent('erp-subtab-change', {
      detail: { tab: parentId, subTab: subId }
    }));

    if (isMobile) {
      onToggle(); // Close sidebar on mobile select
    }
  };

  return (
    <motion.aside 
      animate={isMobile ? { width: 288, x: collapsed ? -288 : 0 } : { width: collapsed ? 80 : 288, x: 0 }}
      transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
      className={`bg-[#0F172A] text-slate-400 h-screen fixed top-0 left-0 z-50 flex flex-col p-4 shadow-xl border-r border-slate-800 overflow-hidden`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800 h-16 shrink-0 justify-between">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-display">
              KT
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-sm tracking-tight font-display">ERP ROMBEL</span>
              <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">KTCT Hub v1.0</span>
            </div>
          </div>
        )}
        {(collapsed && !isMobile) && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto font-display">
            KT
          </div>
        )}
        
        {/* Toggle / Close Button */}
        {isMobile ? (
          <button 
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-500"
            title="Tutup Menu"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        ) : (
          <button 
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-500"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* User Profile Box */}
      <div className={`bg-slate-800/40 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 mb-6 overflow-hidden shrink-0 ${(collapsed && !isMobile) ? 'justify-center bg-transparent border-transparent' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center shadow-inner uppercase shrink-0 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.name.charAt(0)
          )}
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-grow min-w-0">
            <h6 className="text-white font-bold text-xs truncate leading-snug">{user.name}</h6>
            <span className="inline-block text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase mt-0.5 tracking-wider">
              {user.role}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-grow overflow-y-auto space-y-1 scrollbar-hide py-2">
        <span className={`text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-3 pl-2 ${(collapsed && !isMobile) ? 'text-center' : ''}`}>
          {(collapsed && !isMobile) ? '•' : 'Main Navigation'}
        </span>
        <ul className="space-y-1 pl-0">
          {allowedItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            // Sub-menus filtering
            const subMenus = (item.subMenus || []).filter(sub => !sub.roles || sub.roles.includes(user.role));
            const currentSubActive = activeSubTabs[item.id] || (subMenus[0] ? subMenus[0].id : '');

            const isExpanded = !!expandedMenus[item.id];

            return (
              <li key={item.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    onSelectTab(item.id);
                    setExpandedMenus(prev => ({
                      ...prev,
                      [item.id]: !prev[item.id]
                    }));
                    if (isMobile && subMenus.length === 0) {
                      onToggle(); // Automatically close drawer after selecting tab on mobile
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600/15 text-blue-400 font-semibold shadow-sm' 
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  } ${(collapsed && !isMobile) ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-white text-slate-400'}`} />
                  {(!collapsed || isMobile) && (
                    <span className="text-[13px] tracking-wide font-medium">{item.label}</span>
                  )}
                  {(!collapsed || isMobile) && subMenus.length > 0 && (
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} />
                  )}
                </button>

                {/* Submenus rendering directly underneath the item */}
                {(!collapsed || isMobile) && subMenus.length > 0 && isExpanded && (
                  <motion.ul 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="ml-5 pl-3 border-l border-slate-800 mt-1 space-y-1 pb-2 overflow-hidden"
                  >
                    {subMenus.map(sub => {
                      const isSubActive = isActive && currentSubActive === sub.id;
                      return (
                        <li key={sub.id}>
                          <button
                            onClick={() => handleSubMenuClick(item.id, sub.id)}
                            className={`w-full text-left py-1 px-2.5 rounded-lg text-[11px] tracking-wide transition-all duration-150 block ${
                              isSubActive
                                ? 'text-blue-400 font-extrabold bg-blue-500/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full shrink-0 ${isSubActive ? 'bg-blue-400 animate-pulse scale-125' : 'bg-slate-700'}`}></span>
                              <span className="truncate">{sub.label}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Theme Toggle & Logout */}
      <div className="pt-4 border-t border-slate-800 shrink-0 space-y-1">
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-all ${(collapsed && !isMobile) ? 'justify-center' : ''}`}
            title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 shrink-0 text-slate-300" />
            ) : (
              <Sun className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            {(!collapsed || isMobile) && (
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 transition-all ${(collapsed && !isMobile) ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
          {(!collapsed || isMobile) && <span className="text-[11px] font-bold uppercase tracking-wider">Keluar</span>}
        </button>
      </div>
    </motion.aside>
  );
}
