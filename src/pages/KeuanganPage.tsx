import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, CreditCard, Receipt, Wallet, BarChart3, Layers, Trash2, CheckCircle2,
  DollarSign, RefreshCw, AlertCircle, X, Sparkles
} from 'lucide-react';
import { useStore } from '../store';
import { db } from '../data/db';
import { initKeuanganDefaultData, purgeAllKeuanganData } from '../data/keuanganSeed';
import { pullFinanceSheetsFromGas } from '../data/autoSyncEngine';
import {
  normalizeTagihanRow,
  normalizePembayaranRow,
  normalizeTabunganRow,
  deduplicateTagihanList,
  deduplicatePembayaranList,
  deduplicateTabunganList
} from '../lib/keuanganNormalizers';

// Sub Tabs Components
import DashboardKeuanganTab from '../components/keuangan/DashboardKeuanganTab';
import MasterBiayaTab from '../components/keuangan/MasterBiayaTab';
import TagihanTunggakanTab from '../components/keuangan/TagihanTunggakanTab';
import PembayaranInvoiceTab from '../components/keuangan/PembayaranInvoiceTab';
import TabunganSiswaTab from '../components/keuangan/TabunganSiswaTab';
import BukuKasTab from '../components/keuangan/BukuKasTab';
import LaporanKeuanganTab from '../components/keuangan/LaporanKeuanganTab';

// Modals
import KwitansiInvoiceModal from '../components/keuangan/KwitansiInvoiceModal';
import LaporanPdfModal from '../components/keuangan/LaporanPdfModal';
import DetailSiswaKeuanganModal from '../components/keuangan/DetailSiswaKeuanganModal';

export default function KeuanganPage() {
  const { students } = useStore();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('erp_subtab_keuangan');
    const valid = ['dashboard', 'biaya', 'tabungan', 'tagihan', 'invoices', 'laporan', 'kas'];
    if (saved && valid.includes(saved)) return saved;
    if (saved === 'bayar') return 'tagihan';
    if (saved === 'riwayat') return 'invoices';
    if (saved === 'jurnal' || saved === 'pengeluaran') return 'kas';
    return 'dashboard';
  });

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem('erp_subtab_keuangan', tabId);
    window.dispatchEvent(new CustomEvent('erp-subtab-change', {
      detail: { tab: 'keuangan', subTab: tabId }
    }));
  };

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState(false);
  const [isPullingAll, setIsPullingAll] = useState(false);
  const [pullFeedback, setPullFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Triggers
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const [pdfReportFilter, setPdfReportFilter] = useState<any | null>(null);
  const [detailSiswaId, setDetailSiswaId] = useState<string | null>(null);

  const hasAutoPulledRef = useRef(false);

  // Safe initialization on mount without destructive data wipe
  useEffect(() => {
    if (!hasAutoPulledRef.current) {
      hasAutoPulledRef.current = true;
      pullFinanceSheetsFromGas().then(res => {
        if (res && res.success) {
          setRefreshKey(prev => prev + 1);
        }
      }).catch(() => {});
    }

    const handleCleared = () => {
      setRefreshKey(prev => prev + 1);
    };

    const handleSubTabChange = (e: any) => {
      if (e.detail?.tab === 'keuangan' && e.detail?.subTab) {
        setActiveTab(e.detail.subTab);
      }
    };

    window.addEventListener('erp-keuangan-cleared', handleCleared);
    window.addEventListener('erp-subtab-change', handleSubTabChange);
    return () => {
      window.removeEventListener('erp-keuangan-cleared', handleCleared);
      window.removeEventListener('erp-subtab-change', handleSubTabChange);
    };
  }, [students]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handlePullAllFinanceFromGas = async () => {
    setIsPullingAll(true);
    setPullFeedback(null);
    try {
      const res = await pullFinanceSheetsFromGas();
      if (res.success) {
        setRefreshKey(prev => prev + 1);
        setPullFeedback({
          type: 'success',
          message: `Berhasil sinkron dari Google Spreadsheet: ${res.counts.biaya} tarif/pos biaya, ${res.counts.tagihan} tagihan, ${res.counts.pembayaran} riwayat pembayaran, dan ${res.counts.tabungan} tabungan siswa!`
        });
      } else {
        setPullFeedback({
          type: 'error',
          message: res.message || 'Gagal menarik data sheet keuangan dari Google Apps Script.'
        });
      }
    } catch (err: any) {
      setPullFeedback({
        type: 'error',
        message: 'Kendala jaringan saat menarik data: ' + (err.message || String(err))
      });
    } finally {
      setIsPullingAll(false);
    }
  };

  // Self-healing: if duplicates are present in memory/storage, deduplicate and sanitize immediately on mount
  useEffect(() => {
    let changed = false;
    const rawTag = (db.get('keuangan_tagihan') || db.get('TAGIHAN') || []) as any[];
    if (rawTag.length > 0) {
      const normTag = rawTag.map((r, i) => normalizeTagihanRow(r, i));
      const dedupedTag = deduplicateTagihanList(normTag);
      if (dedupedTag.length < rawTag.length) {
        db.set('keuangan_tagihan', dedupedTag, { skipPush: true });
        db.set('TAGIHAN', dedupedTag, { skipPush: true });
        changed = true;
      }
    }

    const rawInv = (db.get('keuangan_invoices') || db.get('keuangan_pembayaran') || db.get('PEMBAYARAN') || []) as any[];
    if (rawInv.length > 0) {
      const normInv = rawInv.map((r, i) => normalizePembayaranRow(r, i));
      const dedupedInv = deduplicatePembayaranList(normInv);
      if (dedupedInv.length < rawInv.length) {
        db.set('keuangan_invoices', dedupedInv, { skipPush: true });
        db.set('keuangan_pembayaran', dedupedInv, { skipPush: true });
        db.set('PEMBAYARAN', dedupedInv, { skipPush: true });
        changed = true;
      }
    }

    const rawTab = (db.get('keuangan_tabungan') || db.get('TABUNGAN') || []) as any[];
    if (rawTab.length > 0) {
      const normTab = rawTab.map((r, i) => normalizeTabunganRow(r, i));
      const dedupedTab = deduplicateTabunganList(normTab);
      if (dedupedTab.length < rawTab.length) {
        db.set('keuangan_tabungan', dedupedTab, { skipPush: true });
        db.set('TABUNGAN', dedupedTab, { skipPush: true });
        changed = true;
      }
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all', skipPush: true } }));
      setRefreshKey(prev => prev + 1);
    }
  }, []);

  const handleCleanDuplicates = () => {
    const rawTag = (db.get('keuangan_tagihan') || db.get('TAGIHAN') || []) as any[];
    const normTag = rawTag.map((r, i) => normalizeTagihanRow(r, i));
    const dedupedTag = deduplicateTagihanList(normTag);
    db.set('keuangan_tagihan', dedupedTag, { skipPush: true });
    db.set('TAGIHAN', dedupedTag, { skipPush: true });

    const rawInv = (db.get('keuangan_invoices') || db.get('keuangan_pembayaran') || db.get('PEMBAYARAN') || []) as any[];
    const normInv = rawInv.map((r, i) => normalizePembayaranRow(r, i));
    const dedupedInv = deduplicatePembayaranList(normInv);
    db.set('keuangan_invoices', dedupedInv, { skipPush: true });
    db.set('keuangan_pembayaran', dedupedInv, { skipPush: true });
    db.set('PEMBAYARAN', dedupedInv, { skipPush: true });

    const rawTab = (db.get('keuangan_tabungan') || db.get('TABUNGAN') || []) as any[];
    const normTab = rawTab.map((r, i) => normalizeTabunganRow(r, i));
    const dedupedTab = deduplicateTabunganList(normTab);
    db.set('keuangan_tabungan', dedupedTab, { skipPush: true });
    db.set('TABUNGAN', dedupedTab, { skipPush: true });

    const dupTagRemoved = rawTag.length - dedupedTag.length;
    const dupInvRemoved = rawInv.length - dedupedInv.length;
    const dupTabRemoved = rawTab.length - dedupedTab.length;

    setRefreshKey(prev => prev + 1);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all', skipPush: true } }));

    setPullFeedback({
      type: 'success',
      message: `✓ Selesai membersihkan duplikasi! Tabungan: ${dedupedTab.length} data (${dupTabRemoved > 0 ? `${dupTabRemoved} duplikat dibuang` : 'sudah rapi'}), Tagihan: ${dedupedTag.length} data (${dupTagRemoved > 0 ? `${dupTagRemoved} duplikat dibuang` : 'sudah rapi'}), Kwitansi: ${dedupedInv.length} data.`
    });
  };

  const handleClearAllKeuangan = () => {
    purgeAllKeuanganData();
    setShowClearConfirm(false);
    setClearSuccessMsg(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setClearSuccessMsg(false), 3500);
  };

  // Real-time live statistics for navigation badges (Data Tagihan, Kwitansi Sah, Tabungan Saldo)
  const liveStats = useMemo(() => {
    const rawTagihan = (db.get('keuangan_tagihan') || db.get('TAGIHAN') || []) as any[];
    const rawInvoices = (db.get('keuangan_invoices') || db.get('keuangan_pembayaran') || db.get('PEMBAYARAN') || []) as any[];
    const rawTabungan = (db.get('keuangan_tabungan') || db.get('TABUNGAN') || []) as any[];

    const cleanTagihan = deduplicateTagihanList(rawTagihan.map((r, i) => normalizeTagihanRow(r, i)));
    const cleanInvoices = deduplicatePembayaranList(rawInvoices.map((r, i) => normalizePembayaranRow(r, i)));
    const cleanTabungan = deduplicateTabunganList(rawTabungan.map((r, i) => normalizeTabunganRow(r, i)));

    const tagihanCount = cleanTagihan.length;
    const tagihanNominal = cleanTagihan.reduce((acc, t: any) => acc + (Number(t.totalTagihan || t.nominal || t.jumlah || 0) || 0), 0);

    const invoiceCount = cleanInvoices.length;
    const invoiceNominal = cleanInvoices.reduce((acc, inv: any) => acc + (Number(inv.nominal || inv.total || inv.totalBayar || 0) || 0), 0);

    let setorTotal = 0;
    let tarikTotal = 0;
    cleanTabungan.forEach((t: any) => {
      const nom = Number(t.nominal || t.debit || t.kredit || t.Debit || t.Kredit || 0) || 0;
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR' || (t.debit > 0 && (!t.kredit || t.kredit === 0));
      if (isSetor) setorTotal += nom;
      else tarikTotal += nom;
    });
    const tabunganSaldo = setorTotal - tarikTotal;

    return {
      tagihanCount,
      tagihanNominal,
      invoiceCount,
      invoiceNominal,
      tabunganCount: cleanTabungan.length,
      tabunganSaldo,
    };
  }, [refreshKey]);

  // 7 Sub-tabs Keuangan sesuai struktur arsitektur:
  // 1. Ringkasan & Kasir
  // 2. Tarif & Pos Biaya
  // 3. Tabungan Siswa
  // 4. Tagihan & Bayar Siswa
  // 5. Riwayat Kwitansi Sah
  // 6. Laporan & Neraca
  // 7. Buku Kas & Pengeluaran
  const navTabs = [
    { id: 'dashboard', label: '1. Ringkasan & Kasir', icon: LayoutDashboard },
    { id: 'biaya', label: '2. Tarif & Pos Biaya', icon: Layers },
    { 
      id: 'tabungan', 
      label: '3. Tabungan Siswa', 
      icon: Wallet,
      badge: liveStats.tabunganCount > 0 ? `${liveStats.tabunganCount} data • Saldo: Rp ${liveStats.tabunganSaldo.toLocaleString('id-ID')}` : undefined 
    },
    { 
      id: 'tagihan', 
      label: '4. Tagihan & Bayar Siswa', 
      icon: CreditCard,
      badge: liveStats.tagihanCount > 0 ? `${liveStats.tagihanCount} data • Rp ${liveStats.tagihanNominal.toLocaleString('id-ID')}` : undefined 
    },
    { 
      id: 'invoices', 
      label: '5. Riwayat Kwitansi Sah', 
      icon: Receipt,
      badge: liveStats.invoiceCount > 0 ? `${liveStats.invoiceCount} data • Rp ${liveStats.invoiceNominal.toLocaleString('id-ID')}` : undefined 
    },
    { id: 'laporan', label: '6. Laporan & Neraca', icon: BarChart3 },
    { id: 'kas', label: '7. Buku Kas & Pengeluaran', icon: DollarSign },
  ];

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs flex-shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Sistem Keuangan & Kasir Sah
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola tagihan iuran, kasir penerimaan pembayaran, mutasi tabungan, buku kas operasional, dan laporan neraca.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clearSuccessMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>Data Keuangan Bersih!</span>
            </div>
          )}
          <button
            onClick={handleCleanDuplicates}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition active:scale-95"
            title="Bersihkan duplikasi data Tabungan, Tagihan, dan Kwitansi"
          >
            <Sparkles size={13} className="text-amber-600" />
            <span>Bersihkan Duplikasi</span>
          </button>
          <button
            onClick={handlePullAllFinanceFromGas}
            disabled={isPullingAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
            title="Tarik 4 sheet keuangan (BIAYA, TAGIHAN, PEMBAYARAN, TABUNGAN) langsung dari Google Spreadsheet"
          >
            <RefreshCw size={13} className={isPullingAll ? 'animate-spin' : ''} />
            <span>{isPullingAll ? 'Menyinkronkan...' : 'Sinkron Semua dari Spreadsheet'}</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition active:scale-95"
            title="Reset data transaksi keuangan lokal"
          >
            <Trash2 size={13} />
            <span>Reset Data Lokal</span>
          </button>
        </div>
      </div>

      {/* Sync All Feedback Banner */}
      {pullFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in ${
          pullFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {pullFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{pullFeedback.message}</span>
          </div>
          <button onClick={() => setPullFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Konfirmasi Kosongkan Data</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin mengosongkan seluruh data transaksi keuangan lokal (Tagihan, Pembayaran/Invoice, Tabungan Siswa, dan Kas Operasional)?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleClearAllKeuangan}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Ya, Bersihkan Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1 overflow-x-auto">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 whitespace-nowrap active:scale-98 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors ${
                  isActive 
                    ? 'bg-slate-800 text-emerald-300 border-slate-700' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Renderer - 7 Modul Keuangan */}
      <div key={refreshKey}>
        {/* 1. Ringkasan & Kasir */}
        {activeTab === 'dashboard' && (
          <DashboardKeuanganTab onNavigateTab={(tab) => handleSelectTab(tab)} />
        )}

        {/* 2. Tarif & Pos Biaya */}
        {activeTab === 'biaya' && (
          <MasterBiayaTab />
        )}

        {/* 3. Tabungan Siswa */}
        {activeTab === 'tabungan' && (
          <TabunganSiswaTab />
        )}

        {/* 4. Tagihan & Bayar Siswa */}
        {activeTab === 'tagihan' && (
          <TagihanTunggakanTab
            onPrintInvoice={(invId) => setPrintInvoiceId(invId)}
            onRefreshAll={handleRefresh}
          />
        )}

        {/* 5. Riwayat Kwitansi Sah */}
        {activeTab === 'invoices' && (
          <PembayaranInvoiceTab
            onPrintInvoice={(invId) => setPrintInvoiceId(invId)}
          />
        )}

        {/* 6. Laporan & Neraca */}
        {activeTab === 'laporan' && (
          <LaporanKeuanganTab
            onOpenPdfReport={(filterState) => setPdfReportFilter(filterState)}
            onOpenStudentDetail={(sId) => setDetailSiswaId(sId)}
          />
        )}

        {/* 7. Buku Kas & Pengeluaran */}
        {activeTab === 'kas' && (
          <BukuKasTab />
        )}
      </div>

      {/* Global Modals */}
      {printInvoiceId && (
        <KwitansiInvoiceModal
          invoiceId={printInvoiceId}
          onClose={() => setPrintInvoiceId(null)}
        />
      )}

      {pdfReportFilter && (
        <LaporanPdfModal
          filterState={pdfReportFilter}
          onClose={() => setPdfReportFilter(null)}
        />
      )}

      {detailSiswaId && (
        <DetailSiswaKeuanganModal
          siswaId={detailSiswaId}
          onClose={() => setDetailSiswaId(null)}
          onPrintInvoice={(invId) => setPrintInvoiceId(invId)}
        />
      )}
    </div>
  );
}
