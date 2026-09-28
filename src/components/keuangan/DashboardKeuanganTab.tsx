import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../data/db';
import { KeuanganTagihan, KeuanganInvoice, KeuanganTabungan } from '../../data/keuanganSeed';
import { 
  normalizeTabunganRow, 
  deduplicateTabunganList,
  deduplicateTagihanList,
  deduplicatePembayaranList,
  normalizeTagihanRow,
  normalizePembayaranRow
} from '../../lib/keuanganNormalizers';
import { syncCoreSpreadsheetData } from '../../utils/coreDataSync';
import { CreditCard, Receipt, Wallet, BarChart3, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle, Layers, DollarSign } from 'lucide-react';

function getValidArray(...keys: string[]): any[] {
  for (const k of keys) {
    const val = db.get<any>(k);
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

interface DashboardKeuanganTabProps {
  onNavigateTab: (tabId: string) => void;
}

export default function DashboardKeuanganTab({ onNavigateTab }: DashboardKeuanganTabProps) {
  const [tagihanList, setTagihanList] = useState<KeuanganTagihan[]>(() => {
    const raw = getValidArray('keuangan_tagihan', 'TAGIHAN', 'tagihan');
    const normalized = raw.map((r: any, idx: number) => normalizeTagihanRow(r, idx));
    return deduplicateTagihanList(normalized);
  });

  const [invoiceList, setInvoiceList] = useState<KeuanganInvoice[]>(() => {
    const raw = getValidArray('keuangan_invoices', 'keuangan_pembayaran', 'PEMBAYARAN', 'INVOICE');
    const normalized = raw.map((r: any, idx: number) => normalizePembayaranRow(r, idx));
    return deduplicatePembayaranList(normalized);
  });

  const [tabunganList, setTabunganList] = useState<KeuanganTabungan[]>(() => {
    const raw = getValidArray('keuangan_tabungan', 'TABUNGAN', 'tabungan');
    const normalized = raw.map((r: any, idx: number) => normalizeTabunganRow(r, idx));
    return deduplicateTabunganList(normalized);
  });

  useEffect(() => {
    const refreshAll = () => {
      const rawTag = getValidArray('keuangan_tagihan', 'TAGIHAN', 'tagihan');
      const normTag = rawTag.map((r: any, idx: number) => normalizeTagihanRow(r, idx));
      setTagihanList(deduplicateTagihanList(normTag));

      const rawInv = getValidArray('keuangan_invoices', 'keuangan_pembayaran', 'PEMBAYARAN', 'INVOICE');
      const normInv = rawInv.map((r: any, idx: number) => normalizePembayaranRow(r, idx));
      setInvoiceList(deduplicatePembayaranList(normInv));

      const rawTab = getValidArray('keuangan_tabungan', 'TABUNGAN', 'tabungan');
      const normTab = rawTab.map((r: any, idx: number) => normalizeTabunganRow(r, idx));
      setTabunganList(deduplicateTabunganList(normTab));
    };

    const handleClear = () => {
      setTagihanList([]);
      setInvoiceList([]);
      setTabunganList([]);
    };
    window.addEventListener('erp-db-updated', refreshAll);
    window.addEventListener('erp-db-synced', refreshAll);
    window.addEventListener('erp-keuangan-cleared', handleClear);

    // Initial check: jika data kosong, sinkronkan dari Google Spreadsheet
    const checkTag = getValidArray('keuangan_tagihan', 'TAGIHAN');
    const checkTab = getValidArray('keuangan_tabungan', 'TABUNGAN');
    if (checkTag.length === 0 || checkTab.length === 0) {
      syncCoreSpreadsheetData().then(refreshAll).catch(() => {});
    }

    const timer1 = setTimeout(refreshAll, 60);
    const timer2 = setTimeout(refreshAll, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('erp-db-updated', refreshAll);
      window.removeEventListener('erp-db-synced', refreshAll);
      window.removeEventListener('erp-keuangan-cleared', handleClear);
    };
  }, []);

  // 1. Total Tabungan Siswa (Net SETOR - TARIK)
  const totalTabungan = useMemo(() => {
    return tabunganList.reduce((acc, t: any) => {
      const nom = Number(t.nominal || t.debit || t.kredit || t.Debit || t.Kredit || 0) || 0;
      const rawJ = String(t.jenis || t.jenisTransaksi || t.Jenis || t.JenisTransaksi || '').toUpperCase();
      const isTarik = rawJ.includes('TARIK') || (Number(t.kredit || t.Kredit || 0) > 0 && Number(t.debit || t.Debit || 0) === 0);
      if (isTarik) return acc - nom;
      return acc + nom;
    }, 0);
  }, [tabunganList]);

  // 2. Total Tagihan (Nilai Bruto sebelum potongan)
  const totalTagihan = useMemo(() => {
    return tagihanList.reduce((acc, t) => acc + (Number(t.totalTagihan || t.nominalAsli || t.nominal) || 0), 0);
  }, [tagihanList]);

  // 3. Sudah Bayar (Total Pembayaran Masuk)
  const totalPembayaran = useMemo(() => {
    return invoiceList.reduce((acc, inv) => acc + (Number(inv.total ?? inv.nominal ?? 0) || 0), 0);
  }, [invoiceList]);

  // 4. Sisa Tunggakan (Sisa tagihan yang belum lunas)
  const sisaTunggakan = useMemo(() => {
    return tagihanList
      .filter(t => t.status !== 'LUNAS')
      .reduce((acc, t) => acc + (Number(t.sisaTagihan ?? (t.totalTagihan || t.nominal)) || 0), 0);
  }, [tagihanList]);

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  const cards = [
    { 
      label: 'Total Tabungan Siswa', 
      value: fmtRp(totalTabungan), 
      color: 'text-emerald-700 bg-emerald-50/80 border-emerald-200', 
      icon: '💰', 
      tab: 'tabungan',
      sub: `${tabunganList.length} Transaksi Tabungan`
    },
    { 
      label: 'Total Tagihan Siswa (Bruto)', 
      value: fmtRp(totalTagihan), 
      color: 'text-amber-700 bg-amber-50/80 border-amber-200', 
      icon: '🗒️', 
      tab: 'tagihan',
      sub: `${tagihanList.length} Item Tagihan Siswa`
    },
    { 
      label: 'Total Pembayaran Masuk', 
      value: fmtRp(totalPembayaran), 
      color: 'text-blue-800 bg-blue-50/80 border-blue-200', 
      icon: '💳', 
      tab: 'invoices',
      sub: `${invoiceList.length} Kwitansi Pembayaran`
    },
    { 
      label: 'Sisa Tunggakan Belum Lunas', 
      value: fmtRp(sisaTunggakan), 
      color: 'text-rose-700 bg-rose-50/80 border-rose-200', 
      icon: '⚠️', 
      tab: 'tagihan',
      sub: `${tagihanList.filter(t => t.status !== 'LUNAS').length} Tagihan Belum Lunas`
    },
  ];

  // Percentage paid
  const persentaseBayar = totalTagihan > 0 ? Math.min(100, Math.round((totalPembayaran / totalTagihan) * 100)) : 0;

  // Recent invoices
  const recentInvoices = useMemo(() => {
    return [...invoiceList].reverse().slice(0, 5);
  }, [invoiceList]);

  // Recent tabungan
  const recentTabungan = useMemo(() => {
    return [...tabunganList].reverse().slice(0, 5);
  }, [tabunganList]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4 Top Summary Cards (💰 Total Tabungan, 🗒️ Total Tagihan, 💳 Sudah Bayar, ⚠️ Sisa Tunggakan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            onClick={() => onNavigateTab(card.tab)}
            className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98 ${card.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{card.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/70 px-2.5 py-1 rounded-full border border-current/20">
                {card.label}
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
                {card.value}
              </div>
              <div className="text-xs font-semibold opacity-75 mt-1">
                {card.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Realisasi Keuangan & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Realisasi Progress Bar Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Realisasi Pembayaran Tagihan
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Perbandingan total penerimaan kas vs sisa tunggakan berjalan
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-blue-700">
                {persentaseBayar}%
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tercapai</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${persentaseBayar}%` }} 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            />
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Ditagihkan</div>
              <div className="text-sm font-black font-mono text-slate-800 mt-0.5">{fmtRp(totalTagihan)}</div>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Sudah Diterima</div>
              <div className="text-sm font-black font-mono text-emerald-700 mt-0.5">{fmtRp(totalPembayaran)}</div>
            </div>
            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Sisa Tunggakan</div>
              <div className="text-sm font-black font-mono text-rose-700 mt-0.5">{fmtRp(sisaTunggakan)}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Aksi Cepat Keuangan
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pintasan transaksi dan penagihan kasir
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => onNavigateTab('biaya')}
              className="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <Layers size={18} className="text-indigo-600" />
              <span>2. Tarif & Biaya</span>
            </button>
            <button
              onClick={() => onNavigateTab('tabungan')}
              className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <Wallet size={18} className="text-amber-600" />
              <span>3. Tabungan Siswa</span>
            </button>
            <button
              onClick={() => onNavigateTab('tagihan')}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <CreditCard size={18} className="text-emerald-600" />
              <span>4. Tagihan & Kasir</span>
            </button>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <Receipt size={18} className="text-blue-600" />
              <span>5. Kwitansi Sah</span>
            </button>
            <button
              onClick={() => onNavigateTab('laporan')}
              className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200/80 text-purple-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <BarChart3 size={18} className="text-purple-600" />
              <span>6. Laporan & Neraca</span>
            </button>
            <button
              onClick={() => onNavigateTab('kas')}
              className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-800 font-black text-xs transition flex flex-col items-center text-center gap-1.5 active:scale-95"
            >
              <DollarSign size={18} className="text-rose-600" />
              <span>7. Buku Kas & Biaya</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Sistem Kasir Terbuka</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* Dual Recent Transactions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Riwayat Pembayaran Terbaru
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Belum ada transaksi pembayaran.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{inv.namaSiswa}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.invoiceId} • {inv.tglBayar}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black font-mono text-emerald-700">{fmtRp(inv.total)}</div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {inv.metode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Savings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Mutasi Tabungan Terkini
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('tabungan')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
            >
              Buku Tabungan &rarr;
            </button>
          </div>

          {recentTabungan.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Belum ada mutasi tabungan siswa.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTabungan.map((tab) => (
                <div key={tab.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      tab.jenis === 'SETOR' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {tab.jenis === 'SETOR' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{tab.namaSiswa}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tab.tanggal} • {tab.catatan || tab.jenis}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black font-mono ${tab.jenis === 'SETOR' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tab.jenis === 'SETOR' ? '+' : '-'}{fmtRp(tab.nominal)}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      tab.jenis === 'SETOR' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {tab.jenis}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
