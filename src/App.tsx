import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Home, Database, ClipboardList, GraduationCap, Laptop, CheckSquare, 
  CreditCard, ShieldAlert, Package, FileText, BarChart, Archive, 
  Settings as SettingsIcon, Menu, X, LogOut, RefreshCw, Globe,
  LayoutGrid, Search, Shield, UserCheck, ArrowLeft,
  BookOpen, Smartphone, Trophy, Newspaper,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PublicPortal from './pages/PublicPortal';
import Footer from './components/Footer';

const MasterDataPage = lazy(() => import('./pages/MasterDataPage'));
const SpmbPage = lazy(() => import('./pages/SpmbPage'));
const AkademikPage = lazy(() => import('./pages/AkademikPage'));
const UjianCbtPage = lazy(() => import('./pages/UjianCbtPage'));
const PenugasanPage = lazy(() => import('./pages/PenugasanPage'));
const KeuanganPage = lazy(() => import('./pages/KeuanganPage'));
const BkPage = lazy(() => import('./pages/BkPage'));
const InventarisPage = lazy(() => import('./pages/InventarisPage'));
const DokumenSuratPage = lazy(() => import('./pages/DokumenSuratPage'));
const LaporanPage = lazy(() => import('./pages/LaporanPage'));
const RiwayatArsipPage = lazy(() => import('./pages/RiwayatArsipPage'));
const PengaturanPage = lazy(() => import('./pages/PengaturanPage'));
const PerpustakaanPage = lazy(() => import('./pages/PerpustakaanPage'));
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'));
const EkskulPage = lazy(() => import('./pages/EkskulPage'));
const MadingBeritaPage = lazy(() => import('./pages/MadingBeritaPage'));
const PortalSpmbApplicant = lazy(() => import('./pages/PortalSpmbApplicant'));
const PortalSiswa = lazy(() => import('./pages/PortalSiswa'));
const PortalOrangTua = lazy(() => import('./pages/PortalOrangTua'));
import { useStore } from './store';
import { fetchFromGAS } from './lib/api';
import { useActiveRole } from './lib/permissions';
import { ALL_32_ROLES } from './data/rolesData';
import { autoSyncEngine } from './data/autoSyncEngine';
import { syncCoreSpreadsheetData } from './utils/coreDataSync';

type TabType = 
  | 'dashboard' 
  | 'master-data' 
  | 'spmb' 
  | 'akademik' 
  | 'ujian-cbt' 
  | 'penugasan' 
  | 'keuangan' 
  | 'bk' 
  | 'inventaris' 
  | 'dokumen-surat' 
  | 'laporan' 
  | 'riwayat-arsip' 
  | 'pengaturan'
  | 'perpustakaan'
  | 'whatsapp'
  | 'ekskul'
  | 'mading-berita'
  | 'portal-publik';

function App() {
  const { isAuthenticated, logout, settings, setSettings, students, setStudents, setTeachers, lastSyncedAt, isSyncingGlobal, setLastSyncedAt, setIsSyncingGlobal } = useStore();
  const { role: currentRole, switchRole, canAccess } = useActiveRole();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAllAppsSheetOpen, setIsAllAppsSheetOpen] = useState(false);
  const [mobileMenuSearch, setMobileMenuSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ERP_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isWideMode, setIsWideMode] = useState(() => {
    try {
      return localStorage.getItem('ERP_wide_mode') !== 'false';
    } catch {
      return true;
    }
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unauthView, setUnauthView] = useState<'portal' | 'login'>('portal');
  const [portalMode, setPortalMode] = useState<'public' | 'spmb-applicant' | 'erp'>(() => {
    try {
      const saved = sessionStorage.getItem('ERP_active_portal');
      if (saved === 'spmb-applicant' || saved === 'public' || saved === 'erp') return saved as any;
    } catch {}
    return 'public';
  });
  const [selectedApplicantRegCode, setSelectedApplicantRegCode] = useState<string>('');

  useEffect(() => {
    try {
      sessionStorage.setItem('ERP_active_portal', portalMode);
    } catch {}
  }, [portalMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ERP_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {}
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('ERP_wide_mode', String(isWideMode));
    } catch {}
  }, [isWideMode]);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setIsAllAppsSheetOpen(false);
    // Instant focus & scroll to the very top of page
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Ensure scroll to top whenever activeTab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Load settings from server on mount & Initialize AutoSync Engine
  useEffect(() => {
    let isMounted = true;

    const loadServerSettings = async (retryCount = 0) => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const serverSettings = await response.json();
          if (isMounted && serverSettings && serverSettings.scriptUrl) {
            setSettings({
              ...useStore.getState().settings,
              ...serverSettings
            });
          }
        }
      } catch (e: any) {
        // Server endpoint may briefly be starting or unreachable; retry quietly up to 2 times
        if (retryCount < 2) {
          setTimeout(() => {
            if (isMounted) {
              loadServerSettings(retryCount + 1);
            }
          }, 1500 * (retryCount + 1));
        } else {
          // Graceful fallback to default/local settings without throwing an error
          console.info("Using local configuration settings (server settings sync deferred).");
        }
      }
    };

    loadServerSettings();

    // Start autoSyncEngine to monitor all database mutations
    autoSyncEngine.init();

    // Immediately fetch core real data from Google Spreadsheet (SISWA 409, PEMBAYARAN 423, TABUNGAN, BIAYA)
    syncCoreSpreadsheetData().catch(() => {});

    // Listen for autoSyncEngine events
    const handleAutoSyncUpdate = (e: any) => {
      if (e.detail) {
        const { state, lastSyncedAt: syncedTime } = e.detail;
        if (state === 'syncing') {
          setIsSyncingGlobal(true);
        } else {
          setIsSyncingGlobal(false);
          if (syncedTime) {
            setLastSyncedAt(syncedTime);
          }
        }
      }
    };

    window.addEventListener('erp-auto-sync-status', handleAutoSyncUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('erp-auto-sync-status', handleAutoSyncUpdate);
    };
  }, [setSettings, setIsSyncingGlobal, setLastSyncedAt]);

  // Initial background sync check on login
  useEffect(() => {
    if (!isAuthenticated) return;

    // Fast sync core spreadsheet data upon login
    syncCoreSpreadsheetData().catch(() => {});

    if (!autoSyncEngine.isEnabled()) return;

    // Single graceful pull check on authentication without high-frequency duplicate polling
    const timer = setTimeout(() => {
      autoSyncEngine.pullAndApplyAllSheets({ silent: true }).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, settings.scriptUrl]);

  // Auto-switch tab if current tab is not accessible for the active role
  useEffect(() => {
    if (isAuthenticated) {
      if (currentRole.id === 'RL-026' || currentRole.id === 'RL-027') {
        return;
      }
      if (!canAccess(activeTab)) {
        const targetTab = (currentRole.defaultLandingTab && canAccess(currentRole.defaultLandingTab as TabType))
          ? (currentRole.defaultLandingTab as TabType)
          : ((currentRole.allowedTabs.find(t => canAccess(t as TabType)) || 'dashboard') as TabType);
        setActiveTab(targetTab);
      }
    }
  }, [currentRole.id, isAuthenticated]);

  // Three-Portal Router Resolution
  if (portalMode === 'spmb-applicant') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm font-semibold">Memuat Portal SPMB...</div>}>
        <PortalSpmbApplicant
          initialRegCode={selectedApplicantRegCode}
          onBackToPublic={() => setPortalMode('public')}
          onOpenErpLogin={() => {
            setPortalMode('erp');
            setUnauthView('login');
          }}
        />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    if (unauthView === 'login' || portalMode === 'erp') {
      return (
        <Login 
          onOpenPublicPortal={() => {
            setPortalMode('public');
            setUnauthView('portal');
          }} 
        />
      );
    }
    return (
      <PublicPortal 
        onOpenLogin={() => {
          setPortalMode('erp');
          setUnauthView('login');
        }} 
        onOpenSpmbPortal={(regCode) => {
          setSelectedApplicantRegCode(regCode || '');
          setPortalMode('spmb-applicant');
        }}
        onLogin={() => {
          useStore.getState().login();
          setPortalMode('erp');
        }}
      />
    );
  }

  const displayName = (settings.schoolName && !String(settings.schoolName).toLowerCase().includes('citapen'))
    ? settings.schoolName 
    : ((settings.appName && !String(settings.appName).toLowerCase().includes('citapen')) ? settings.appName : 'ROMBEL TAMBORA');

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    try {
      sessionStorage.removeItem('portal_active_student_id');
      sessionStorage.removeItem('current_auth_student_id');
      sessionStorage.removeItem('portal_parent_student_id');
      sessionStorage.removeItem('authenticated_user');
      sessionStorage.removeItem('current_user_session');
    } catch {}
    setTimeout(() => {
      setIsLoggingOut(false);
      logout();
    }, 1000);
  };

  const renderLogoutConfirmModal = () => (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 text-center space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <LogOut size={28} />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Konfirmasi Keluar</h3>
          <p className="text-slate-500 text-xs mt-1">Apakah Anda yakin ingin keluar dari aplikasi dan mengakhiri sesi?</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={() => setShowLogoutConfirm(false)}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={handleConfirmLogout}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );

  // DEDICATED STUDENT PORTAL VIEW (ROLE RL-026) - Clean & uncluttered without admin sidebar
  if (currentRole.id === 'RL-026') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        {isLoggingOut && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-sky-400 border-t-sky-600 rounded-full animate-spin mb-4" />
            <p className="text-sky-200 font-bold text-sm">Sedang keluar dari sesi siswa...</p>
          </div>
        )}

        {/* Student Top App Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              {settings.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <GraduationCap className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white truncate">
                  {displayName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full">
                  Portal Siswa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Rombongan Belajar Karang Taruna Tambora • TP {settings.tahunPelajaran || '2026/2027'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-500/30 cursor-pointer"
              title="Keluar Sesi Siswa"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Student Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {(() => {
            const authStudentId = typeof window !== 'undefined' && window.sessionStorage
              ? (sessionStorage.getItem('portal_active_student_id') || sessionStorage.getItem('current_auth_student_id') || undefined)
              : undefined;
            return <PortalSiswa studentOverrideId={authStudentId} isLockedStudent={true} onLogout={handleLogout} />;
          })()}
        </main>

        {/* Logout Confirm */}
        {showLogoutConfirm && renderLogoutConfirmModal()}
      </div>
    );
  }

  // DEDICATED PARENT PORTAL VIEW (ROLE RL-027) - Clean & uncluttered
  if (currentRole.id === 'RL-027') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
        {isLoggingOut && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-amber-600 rounded-full animate-spin mb-4" />
            <p className="text-amber-200 font-bold text-sm">Sedang keluar dari sesi orang tua...</p>
          </div>
        )}

        {/* Parent Top App Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-600 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              {settings.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <UserCheck className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white truncate">
                  {displayName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  Portal Wali Murid
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Monitoring Prestasi & Administrasi Siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-500/30 cursor-pointer"
              title="Keluar Sesi Orang Tua"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Parent Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <PortalOrangTua isLockedParent={true} onLogout={handleLogout} />
        </main>

        {/* Logout Confirm */}
        {showLogoutConfirm && renderLogoutConfirmModal()}
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: Home, color: 'text-blue-500', activeBg: 'bg-blue-600 text-white', iconBg: 'bg-blue-50 text-blue-600' },
    { id: 'master-data', label: 'Master Data', icon: Database, color: 'text-indigo-500', activeBg: 'bg-indigo-600 text-white', iconBg: 'bg-indigo-50 text-indigo-600' },
    { id: 'spmb', label: 'SPMB', icon: ClipboardList, color: 'text-amber-500', activeBg: 'bg-amber-600 text-white', iconBg: 'bg-amber-50 text-amber-600' },
    { id: 'akademik', label: 'Akademik', icon: GraduationCap, color: 'text-purple-500', activeBg: 'bg-purple-600 text-white', iconBg: 'bg-purple-50 text-purple-600' },
    { id: 'ujian-cbt', label: 'Ujian Online', icon: Laptop, color: 'text-cyan-500', activeBg: 'bg-cyan-600 text-white', iconBg: 'bg-cyan-50 text-cyan-600' },
    { id: 'penugasan', label: 'Penugasan', icon: CheckSquare, color: 'text-rose-500', activeBg: 'bg-rose-600 text-white', iconBg: 'bg-rose-50 text-rose-600' },
    { id: 'keuangan', label: 'Keuangan', icon: CreditCard, color: 'text-emerald-500', activeBg: 'bg-emerald-600 text-white', iconBg: 'bg-emerald-50 text-emerald-600' },
    { id: 'bk', label: 'Bimbingan Konseling', icon: ShieldAlert, color: 'text-red-500', activeBg: 'bg-red-600 text-white', iconBg: 'bg-red-50 text-red-600' },
    { id: 'inventaris', label: 'Inventaris & Aset', icon: Package, color: 'text-orange-500', activeBg: 'bg-orange-600 text-white', iconBg: 'bg-orange-50 text-orange-600' },
    { id: 'dokumen-surat', label: 'Dokumen & Surat', icon: FileText, color: 'text-sky-500', activeBg: 'bg-sky-600 text-white', iconBg: 'bg-sky-50 text-sky-600' },
    { id: 'laporan', label: 'Pusat Laporan & Ekspor', icon: BarChart, color: 'text-teal-500', activeBg: 'bg-teal-600 text-white', iconBg: 'bg-teal-50 text-teal-600' },
    { id: 'perpustakaan', label: 'E-Perpustakaan', icon: BookOpen, color: 'text-indigo-500', activeBg: 'bg-indigo-600 text-white', iconBg: 'bg-indigo-50 text-indigo-600' },
    { id: 'whatsapp', label: 'WhatsApp Gateway', icon: Smartphone, color: 'text-emerald-500', activeBg: 'bg-emerald-600 text-white', iconBg: 'bg-emerald-50 text-emerald-600' },
    { id: 'ekskul', label: 'Ekstrakurikuler & OSIS', icon: Trophy, color: 'text-amber-500', activeBg: 'bg-amber-600 text-white', iconBg: 'bg-amber-50 text-amber-600' },
    { id: 'mading-berita', label: 'Mading & Berita', icon: Newspaper, color: 'text-rose-500', activeBg: 'bg-rose-600 text-white', iconBg: 'bg-rose-50 text-rose-600' },
    { id: 'portal-publik', label: 'Portal Publik & Web', icon: Globe, color: 'text-sky-500', activeBg: 'bg-sky-600 text-white', iconBg: 'bg-sky-50 text-sky-600' },
    { id: 'riwayat-arsip', label: 'Riwayat & Arsip', icon: Archive, color: 'text-violet-500', activeBg: 'bg-violet-600 text-white', iconBg: 'bg-violet-50 text-violet-600' },
    { id: 'pengaturan', label: 'Pengaturan System', icon: SettingsIcon, color: 'text-slate-500', activeBg: 'bg-slate-800 text-white', iconBg: 'bg-slate-100 text-slate-700' },
  ] as const;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/50 flex flex-col md:flex-row font-sans text-slate-800">
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-900 font-medium">Sedang keluar...</p>
        </div>
      )}
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in transition-opacity"
        />
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-indigo-700 text-white p-3.5 px-4 flex justify-between items-center z-40 shadow-md sticky top-0 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          {settings.schoolLogoUrl ? (
            <img src={settings.schoolLogoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-cover bg-white flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Home size={16} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-black text-sm tracking-tight truncate">{displayName}</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-100/90 font-medium">
              <span>TP {settings.tahunPelajaran || '2026/2027'}</span>
              {lastSyncedAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-emerald-200">
                    <RefreshCw size={9} className={cn(isSyncingGlobal && "animate-spin")} />
                    <span>{lastSyncedAt}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div 
            className="px-2.5 py-1.5 bg-white/20 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs select-none"
            title={`Role Akun: ${currentRole.namaRole}`}
          >
            <Shield size={13} />
            <span className="truncate max-w-[90px]">{currentRole.namaRole}</span>
          </div>
          <button 
            onClick={() => setIsAllAppsSheetOpen(true)} 
            className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Buka Semua Menu"
          >
            <LayoutGrid size={15} />
            <span className="text-[11px]">Menu</span>
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition"
            title="Menu Sidebar"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Active Module Bar & Dropdown Selector (No Horizontal Scroll Needed) */}
      <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 py-2.5 z-30 shadow-2xs sticky top-[53px] no-print">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <select
              value={activeTab}
              onChange={(e) => navigateToTab(e.target.value as TabType)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            {(() => {
              const currentTabObj = tabs.find(t => t.id === activeTab);
              const CurrentIcon = currentTabObj?.icon || LayoutGrid;
              return (
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                  <CurrentIcon size={16} />
                </div>
              );
            })()}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          <button
            onClick={() => setIsAllAppsSheetOpen(true)}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
            title="Buka Grid Semua Menu"
          >
            <LayoutGrid size={15} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Floating Toggle Button Desktop */}
      {!isMobileMenuOpen && isSidebarCollapsed && (
        <button 
          onClick={() => setIsSidebarCollapsed(false)} 
          className="hidden md:flex fixed top-6 left-6 z-[45] p-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg text-indigo-600 hover:bg-indigo-50 transition"
          title="Tampilkan Sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Navigation */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white/95 md:bg-white/70 backdrop-blur-2xl border-r border-slate-200/80 shadow-2xl p-5 flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 no-print flex-shrink-0 overflow-hidden",
        isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-0 md:p-0 md:border-r-0 md:opacity-0" : "md:w-64 md:opacity-100"
      )}>
        <div className="mb-4 hidden md:flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
              {settings.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <Home className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base tracking-tight text-slate-900 truncate">{displayName}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 self-start mt-0.5">
                TP {settings.tahunPelajaran || '2026/2027'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(true)} 
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
            title="Sembunyikan Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Active Role Quick Card (Desktop Sidebar) */}
        <div className="mb-4 p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-2xs font-bold">
              <Shield size={14} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-black text-xs text-indigo-950 truncate">{currentRole.namaRole}</span>
                <span className="text-[9px] font-extrabold bg-indigo-200/80 text-indigo-800 px-1.5 py-0.2 rounded-md">
                  L{currentRole.level}
                </span>
              </div>
              <p className="text-[9px] text-slate-500 truncate">{currentRole.kategori}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 hidden md:block">Modul Utama</div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasAccess = canAccess(tab.id as TabType);

            return (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id as TabType)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all text-left font-bold text-xs active:scale-95 duration-150 group",
                  isActive 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                    : hasAccess 
                      ? "text-slate-700 hover:bg-slate-100/90 hover:text-slate-950"
                      : "text-slate-400 hover:bg-slate-50 opacity-60"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "bg-white/20 text-white" : tab.iconBg
                )}>
                  <Icon size={15} />
                </div>
                <span className="truncate flex-1">{tab.label}</span>
                {!hasAccess && (
                  <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-normal">
                    Kunci
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Status & Logout */}
        <div className="mt-auto pt-3 border-t border-slate-200/80 space-y-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all text-left font-bold text-xs text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </div>

      {/* Main Content Render */}
      <div ref={mainContentRef} className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-28 md:pb-8 h-full scroll-smooth flex flex-col">
        {/* Desktop Quick Header & Viewport Controls */}
        <div className="hidden md:flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200/90 shadow-2xs transition flex items-center gap-2 text-xs font-bold active:scale-95 cursor-pointer"
              title={isSidebarCollapsed ? "Buka Sidebar Menu" : "Sembunyikan Sidebar untuk Memperluas Ruang Kerja"}
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen size={16} className="text-indigo-600" />
                  <span>Buka Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftClose size={16} className="text-slate-500" />
                  <span>Perluas Layar (Tutup Sidebar)</span>
                </>
              )}
            </button>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-400">Modul</span>
              <span className="text-slate-300">/</span>
              <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                {tabs.find(t => t.id === activeTab)?.label || activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedApplicantRegCode('');
                setPortalMode('spmb-applicant');
              }}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Buka Portal Calon Siswa (SPMB)"
            >
              <GraduationCap size={13} className="text-amber-500" />
              <span>Portal SPMB</span>
            </button>

            <button
              onClick={() => navigateToTab('portal-publik')}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Lihat Tampilan Portal Publik Web"
            >
              <Globe size={13} />
              <span>Portal Publik</span>
            </button>

            <button
              onClick={() => setIsWideMode(!isWideMode)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer",
                isWideMode 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
              title={isWideMode ? "Kembali ke batas lebar standar (1280px)" : "Aktifkan tampilan lebar penuh (100% monitor)"}
            >
              {isWideMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isWideMode ? "Layar Lebar Penuh (Aktif)" : "Mode Standar"}</span>
            </button>

            <div
              className="px-2.5 py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs select-none"
              title={`Role Akun: ${currentRole.namaRole}`}
            >
              <Shield size={13} />
              <span>{currentRole.namaRole}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className={cn("w-full transition-all duration-150", !isWideMode && "max-w-7xl mx-auto")}
          >
            {!canAccess(activeTab) ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm max-w-xl mx-auto text-center space-y-6 my-10 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
                  <Shield size={32} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-amber-700 bg-amber-100/70 uppercase px-3 py-1 rounded-full border border-amber-200">
                    Otorisasi Hak Akses RBAC
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">Akses Modul Dibatasi</h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                    Role aktif Anda saat ini <strong className="text-slate-800 font-bold">{currentRole.namaRole} (Level {currentRole.level})</strong> tidak memiliki izin untuk membuka modul <strong className="text-indigo-600 font-mono">[{activeTab}]</strong>.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
                  <p className="text-slate-600 font-semibold text-[11px]">Modul yang diizinkan untuk jabatan Anda:</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {currentRole.allowedTabs.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  <button
                    onClick={() => navigateToTab(currentRole.defaultLandingTab as TabType)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Kembali ke {currentRole.defaultLandingTab}
                  </button>
                </div>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-4 animate-pulse">
                    <div className="h-7 w-56 bg-slate-200 rounded-xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="h-24 bg-slate-100 rounded-2xl" />
                      <div className="h-24 bg-slate-100 rounded-2xl" />
                      <div className="h-24 bg-slate-100 rounded-2xl" />
                    </div>
                    <div className="h-64 bg-slate-100 rounded-2xl" />
                  </div>
                }
              >
                {currentRole.id === 'RL-026' ? (
                  <PortalSiswa isLockedStudent={true} onLogout={logout} />
                ) : currentRole.id === 'RL-027' ? (
                  <PortalOrangTua isLockedParent={true} onLogout={logout} />
                ) : (
                  <>
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'master-data' && <MasterDataPage />}
                    {activeTab === 'spmb' && <SpmbPage />}
                    {activeTab === 'akademik' && <AkademikPage />}
                    {activeTab === 'ujian-cbt' && <UjianCbtPage />}
                    {activeTab === 'penugasan' && <PenugasanPage />}
                    {activeTab === 'keuangan' && <KeuanganPage />}
                    {activeTab === 'bk' && <BkPage />}
                    {activeTab === 'inventaris' && <InventarisPage />}
                    {activeTab === 'dokumen-surat' && <DokumenSuratPage />}
                    {activeTab === 'laporan' && <LaporanPage />}
                    {activeTab === 'perpustakaan' && <PerpustakaanPage />}
                    {activeTab === 'whatsapp' && <WhatsAppPage />}
                    {activeTab === 'ekskul' && <EkskulPage />}
                    {activeTab === 'mading-berita' && <MadingBeritaPage />}
                    {activeTab === 'portal-publik' && (
                      <PublicPortal 
                        onOpenLogin={() => {}} 
                        onLogin={() => {}} 
                        isAdminView={true} 
                        onOpenSpmbPortal={(regCode) => {
                          setSelectedApplicantRegCode(regCode || '');
                          setPortalMode('spmb-applicant');
                        }}
                        onBackToDashboard={() => setActiveTab('dashboard')} 
                      />
                    )}
                    {activeTab === 'riwayat-arsip' && <RiwayatArsipPage />}
                    {activeTab === 'pengaturan' && <PengaturanPage />}
                  </>
                )}
                <Footer />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Ergonomic Thumb Access - No Sliding Needed) */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 py-1.5 flex items-center justify-around no-print">
        {/* 1. Dashboard */}
        <button
          onClick={() => navigateToTab('dashboard')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90",
            activeTab === 'dashboard' ? "text-blue-600 font-extrabold" : "text-slate-500 font-medium hover:text-slate-800"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            activeTab === 'dashboard' ? "bg-blue-100/90 text-blue-700 shadow-xs" : "text-slate-500"
          )}>
            <Home size={18} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">Beranda</span>
        </button>

        {/* 2. Master Data */}
        <button
          onClick={() => navigateToTab('master-data')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90",
            activeTab === 'master-data' ? "text-indigo-600 font-extrabold" : "text-slate-500 font-medium hover:text-slate-800"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            activeTab === 'master-data' ? "bg-indigo-100/90 text-indigo-700 shadow-xs" : "text-slate-500"
          )}>
            <Database size={18} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">Data</span>
        </button>

        {/* 3. SPMB */}
        <button
          onClick={() => navigateToTab('spmb')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 relative",
            activeTab === 'spmb' ? "text-amber-600 font-extrabold" : "text-slate-500 font-medium hover:text-slate-800"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            activeTab === 'spmb' ? "bg-amber-100/90 text-amber-700 shadow-xs" : "text-slate-500"
          )}>
            <ClipboardList size={18} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">SPMB</span>
        </button>

        {/* 4. Akademik */}
        <button
          onClick={() => navigateToTab('akademik')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90",
            activeTab === 'akademik' ? "text-purple-600 font-extrabold" : "text-slate-500 font-medium hover:text-slate-800"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            activeTab === 'akademik' ? "bg-purple-100/90 text-purple-700 shadow-xs" : "text-slate-500"
          )}>
            <GraduationCap size={18} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">Akademik</span>
        </button>

        {/* 5. Semua Menu (App Launcher Bottom Sheet) */}
        <button
          onClick={() => setIsAllAppsSheetOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90",
            isAllAppsSheetOpen ? "text-slate-900 font-extrabold" : "text-slate-600 font-medium hover:text-slate-900"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            isAllAppsSheetOpen ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-700"
          )}>
            <LayoutGrid size={17} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">Semua</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM SHEET "SEMUA MENU & MODUL" (App Drawer Grid)               */}
      {/* ========================================================================= */}
      {isAllAppsSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div 
            className="flex-1 w-full"
            onClick={() => setIsAllAppsSheetOpen(false)}
          />
          <div className="bg-white rounded-t-[32px] p-5 pb-8 shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 flex-shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Semua Menu & Modul</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Pilih modul untuk berpindah seketika</p>
                </div>
              </div>
              <button
                onClick={() => setIsAllAppsSheetOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Search inside Menu Sheet */}
            <div className="relative mb-3 flex-shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu / modul..."
                value={mobileMenuSearch}
                onChange={(e) => setMobileMenuSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {mobileMenuSearch && (
                <button onClick={() => setMobileMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* App Grid Launcher (3 Columns on Mobile) */}
            <div className="overflow-y-auto flex-1 pr-1 grid grid-cols-3 gap-2.5 py-1">
              {tabs
                .filter(tab => {
                  const q = String(mobileMenuSearch || '').toLowerCase();
                  return String(tab.label || '').toLowerCase().includes(q);
                })
                .map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        navigateToTab(tab.id as TabType);
                        setMobileMenuSearch('');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group active:scale-95 duration-100",
                        isActive 
                          ? "bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-xs ring-2 ring-indigo-300" 
                          : "bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/80 text-slate-800"
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 shadow-2xs transition-transform group-hover:scale-105",
                        isActive ? "bg-indigo-600 text-white" : tab.iconBg
                      )}>
                        <Icon size={20} />
                      </div>
                      <span className="text-[11px] font-bold tracking-tight leading-tight line-clamp-2">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Quick Actions Footer inside Sheet */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Sistem Terhubung</span>
              </div>

              <button
                onClick={() => {
                  setIsAllAppsSheetOpen(false);
                  handleLogout();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5 border border-rose-200/70"
              >
                <LogOut size={13} />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && renderLogoutConfirmModal()}
    </div>
  );
}

export default App;
