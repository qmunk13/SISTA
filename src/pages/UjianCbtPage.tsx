import React, { useState, useMemo, useEffect } from 'react';
import { 
  Laptop, Award, FileQuestion, Calendar, Key, 
  Eye, CheckCircle2, RefreshCw, CloudDownload, Check, Play
} from 'lucide-react';
import { db } from '../data/db';
import { useStore } from '../store';
import { deduplicateUjianSessions } from '../utils/cbtScheduleSync';
import { pullCbtDataFromGoogleSheets, syncAndLinkAllSessionsAndBankSoal } from '../utils/cbtGoogleSheetService';
import CbtDashboardTab from '../components/cbt/CbtDashboardTab';
import JadwalUjianTab from '../components/cbt/JadwalUjianTab';
import BankSoalTab from '../components/cbt/BankSoalTab';
import TokenUjianTab from '../components/cbt/TokenUjianTab';
import ProktorPengawasanTab from '../components/cbt/ProktorPengawasanTab';
import HasilUjianTab from '../components/cbt/HasilUjianTab';
import RaporPendidikanTab from '../components/cbt/RaporPendidikanTab';
import SimulasiUjianTab from '../components/cbt/SimulasiUjianTab';
import Swal from 'sweetalert2';

export default function UjianCbtPage() {
  const { teachers } = useStore();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [navContext, setNavContext] = useState<any>(null);
  const [isPullingGoogleSheets, setIsPullingGoogleSheets] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>('');

  const subTabs = [
    { id: 'dashboard', label: 'CBT Dashboard', icon: Laptop },
    { id: 'simulasi', label: 'Simulasi Mengerjakan Soal', icon: Play },
    { id: 'jadwal-ujian', label: 'Jadwal & Sesi Ujian', icon: Calendar },
    { id: 'bank-soal', label: 'Bank Soal', icon: FileQuestion },
    { id: 'token-ujian', label: 'Token Ujian', icon: Key },
    { id: 'proktor', label: 'Pengawasan (Proktor)', icon: Eye },
    { id: 'hasil-ujian', label: 'Hasil Ujian', icon: CheckCircle2 },
    { id: 'rapor-pendidikan', label: 'Rapor Pendidikan', icon: Award },
  ];

  const handleSubTabChange = (tabId: string, context?: any) => {
    if (context !== undefined) {
      setNavContext(context);
    }
    setActiveSubTab(tabId);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Ujian List Persistence from db - SOURCED PURELY FROM GOOGLE SPREADSHEET (NO LOCAL DUMMY OVERRIDE)
  const [ujianList, setUjianList] = useState<any[]>(() => {
    const fromDb = db.get('ujian_cbt');
    const existing = Array.isArray(fromDb) && fromDb.length > 0 ? fromDb : [];
    return deduplicateUjianSessions(existing);
  });

  const [dbRefresh, setDbRefresh] = useState(0);

  // Manual Trigger to Pull Fresh CBT Data from Google Spreadsheet
  const handlePullCbtData = async (silent: boolean = false) => {
    setIsPullingGoogleSheets(true);
    try {
      const res = await pullCbtDataFromGoogleSheets();
      const updatedUjian = db.get('ujian_cbt') || [];
      const deduped = deduplicateUjianSessions(Array.isArray(updatedUjian) ? updatedUjian : []);
      setUjianList(deduped);
      setDbRefresh(prev => prev + 1);
      setLastSyncedLabel(new Date().toLocaleTimeString('id-ID'));

      if (!silent) {
        Swal.fire({
          title: 'Data CBT Tersinkron dari Google Sheet!',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-600">
              <p>✅ <b>${res.totalUjian} Sesi Ujian</b> dari Sheet <code>UJIAN</code> (100% Terhubung Bank Soal)</p>
              <p>✅ <b>${res.totalToken} Token Ujian</b> dari Sheet <code>TOKEN</code></p>
              <p>✅ <b>${res.totalBankSoal} Paket Bank Soal</b> dari Sheet <code>BANK_SOAL</code></p>
              <p>✅ <b>${res.totalSoal} Butir Soal</b> dari Sheet <code>SOAL</code></p>
              <p>✅ <b>${res.totalHasil} Hasil Ujian</b> dari Sheet <code>HASIL_UJIAN</code></p>
              <p>✅ <b>${res.totalRapor || 0} Indikator Mutu</b> dari Sheet <code>RAPOR_PENDIDIKAN</code></p>
              <p class="text-emerald-700 font-bold mt-2">Seluruh jadwal sesi kini telah terintegrasi 1-ke-1 dengan paket butir soal resminya.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#0891b2'
        });
      }
    } catch (err: any) {
      console.error('Error pull CBT data:', err);
      if (!silent) {
        Swal.fire({
          title: 'Gagal Menarik Data CBT',
          text: err?.message || 'Pastikan koneksi Google Apps Script atau Spreadsheet aktif.',
          icon: 'error',
          confirmButtonColor: '#0891b2'
        });
      }
    } finally {
      setIsPullingGoogleSheets(false);
    }
  };

  useEffect(() => {
    // 1. Eksekusi penautan 1-ke-1 otomatis terlebih dahulu dari data lokal yang ada
    try {
      const linkResult = syncAndLinkAllSessionsAndBankSoal();
      if (linkResult && linkResult.ujian && linkResult.ujian.length > 0) {
        setUjianList(linkResult.ujian);
      }
    } catch (e) {
      console.warn('Initial CBT link error:', e);
    }

    // 2. Tarik data resmi CBT dari Google Spreadsheet
    handlePullCbtData(true);

    const handleDbChange = () => {
      const raw = db.get('ujian_cbt');
      if (Array.isArray(raw)) {
        setUjianList(deduplicateUjianSessions(raw));
      }
      setDbRefresh(prev => prev + 1);
    };

    window.addEventListener('erp-db-updated', handleDbChange);
    window.addEventListener('storage', handleDbChange);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbChange);
      window.removeEventListener('storage', handleDbChange);
    };
  }, []);

  const saveUjianDb = (list: any[]) => {
    setUjianList(list);
    db.set('ujian_cbt', list);
    db.set('cbt_exams', list);
  };

  // Bank Soal list for dashboard summary count from db
  const bankSoalList = useMemo(() => {
    const fromDb = db.get('cbt_bank_soal');
    return Array.isArray(fromDb) ? fromDb : [];
  }, [activeSubTab, dbRefresh]);

  // Dynamic token active
  const tokenActive = useMemo(() => {
    const tokens = db.get('cbt_token_history');
    const active = Array.isArray(tokens) ? tokens.find((t: any) => t.status === 'Aktif') : null;
    return active?.token || '-';
  }, [activeSubTab, dbRefresh]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title Header with Google Sheets Live Sync Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100/80 shadow-2xs shrink-0">
            <Laptop size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Ujian Online (CBT & Asesmen)
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Google Sheets
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Seluruh jadwal sesi, token, bank butir soal, proktor, hasil, & rapor tersinkron murni ke Google Spreadsheet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => handlePullCbtData(false)}
            disabled={isPullingGoogleSheets}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border border-slate-300/80 transition flex items-center gap-2 shadow-2xs disabled:opacity-50 active:scale-95"
            title="Tarik pembaruan data UJIAN, TOKEN, SOAL, HASIL langsung dari Google Spreadsheet"
          >
            <RefreshCw size={14} className={isPullingGoogleSheets ? 'animate-spin text-cyan-600' : 'text-slate-600'} />
            <span>{isPullingGoogleSheets ? 'Menarik Sheet...' : 'Tarik dari Google Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs no-print">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Pilih Sub-Menu CBT:
        </label>
        <div className="relative">
          <select
            value={activeSubTab}
            onChange={(e) => handleSubTabChange(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 appearance-none transition"
          >
            {subTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* Desktop Sub Tabs Navigation */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-print">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-cyan-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER DEDICATED SUB-TAB VIEWS */}
      {activeSubTab === 'dashboard' && (
        <CbtDashboardTab 
          onNavigateTab={handleSubTabChange}
          ujianList={ujianList}
          bankSoalList={bankSoalList}
          tokenActive={tokenActive}
        />
      )}

      {activeSubTab === 'simulasi' && (
        <SimulasiUjianTab 
          onBackToDashboard={() => handleSubTabChange('dashboard')}
        />
      )}

      {activeSubTab === 'jadwal-ujian' && (
        <JadwalUjianTab 
          ujianList={ujianList}
          setUjianList={setUjianList}
          onSaveDb={saveUjianDb}
        />
      )}

      {activeSubTab === 'bank-soal' && (
        <BankSoalTab />
      )}

      {activeSubTab === 'token-ujian' && (
        <TokenUjianTab />
      )}

      {activeSubTab === 'proktor' && (
        <ProktorPengawasanTab />
      )}

      {activeSubTab === 'hasil-ujian' && (
        <HasilUjianTab />
      )}

      {activeSubTab === 'rapor-pendidikan' && (
        <RaporPendidikanTab />
      )}
    </div>
  );
}
