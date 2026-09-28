import React, { useMemo } from 'react';
import { db } from '../../data/db';
import { BarangSarpras, RuanganAset, PeminjamanSarpras, PerawatanSarpras } from '../../data/sarprasSeed';
import { 
  Package, Building2, Repeat, Wrench, CheckCircle2, AlertTriangle, 
  ArrowUpRight, Clock, ShieldCheck, QrCode, Layers, DollarSign
} from 'lucide-react';

interface InventarisDashboardTabProps {
  onNavigateTab: (tabId: string) => void;
}

export default function InventarisDashboardTab({ onNavigateTab }: InventarisDashboardTabProps) {
  const barangList = useMemo(() => db.get<BarangSarpras>('barang') || [], []);
  const ruanganList = useMemo(() => db.get<RuanganAset>('ruangan_aset') || [], []);
  const pinjamList = useMemo(() => db.get<PeminjamanSarpras>('peminjaman_sarpras') || [], []);
  const rawatList = useMemo(() => db.get<PerawatanSarpras>('perawatan_sarpras') || [], []);

  // Stats
  const totalUnit = useMemo(() => {
    return barangList.reduce((acc, b) => acc + (Number(b.jumlah) || 1), 0);
  }, [barangList]);

  const totalNilaiAset = useMemo(() => {
    return barangList.reduce((acc, b) => acc + ((Number(b.hargaPerolehan) || 0) * (Number(b.jumlah) || 1)), 0);
  }, [barangList]);

  const baikCount = useMemo(() => {
    return barangList.filter(b => b.kondisi === 'Baik' || !b.kondisi).length;
  }, [barangList]);

  const rusakCount = useMemo(() => {
    return barangList.filter(b => b.kondisi && b.kondisi !== 'Baik').length;
  }, [barangList]);

  const activePinjamCount = useMemo(() => {
    return pinjamList.filter(p => p.status === 'Dipinjam' || p.status === 'Menunggu Persetujuan').length;
  }, [pinjamList]);

  const activeRawatCount = useMemo(() => {
    return rawatList.filter(r => r.status === 'Diajukan' || r.status === 'Sedang Dikerjakan').length;
  }, [rawatList]);

  // KIB Distribution
  const kibBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    barangList.forEach(b => {
      const kib = b.klasifikasiKib || 'KIB B (Peralatan & Mesin)';
      counts[kib] = (counts[kib] || 0) + (Number(b.jumlah) || 1);
    });
    return counts;
  }, [barangList]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Barang */}
        <div 
          onClick={() => onNavigateTab('daftar-barang')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-orange-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Barang & Aset</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {totalUnit.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">Unit ({barangList.length} Item)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-emerald-600 font-bold">✓ {baikCount} Kondisi Baik</span>
            <span className="text-orange-600 font-bold flex items-center">Lihat Tabel <ArrowUpRight size={12} /></span>
          </div>
        </div>

        {/* Total Ruangan */}
        <div 
          onClick={() => onNavigateTab('denah-ruangan')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Ruangan & Lokasi Aset</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {ruanganList.length} <span className="text-xs font-bold text-slate-400">Ruang Terdata</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Lab, Kelas, Kantor, Aula</span>
            <span className="text-blue-600 font-bold flex items-center">Denah <ArrowUpRight size={12} /></span>
          </div>
        </div>

        {/* Peminjaman Aktif */}
        <div 
          onClick={() => onNavigateTab('mutasi-pinjam')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Peminjaman Berlangsung</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <Repeat size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600">
            {activePinjamCount} <span className="text-xs font-bold text-slate-400">Sedang Dipinjam</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sound, Proyektor, TV</span>
            <span className="text-indigo-600 font-bold flex items-center">Pinjam <ArrowUpRight size={12} /></span>
          </div>
        </div>

        {/* Perawatan & Servis */}
        <div 
          onClick={() => onNavigateTab('perawatan-rusak')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tiket Perbaikan Sarpras</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Wrench size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {activeRawatCount} <span className="text-xs font-bold text-slate-400">Dalam Servis</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{rusakCount} item rusak fisik</span>
            <span className="text-rose-600 font-bold flex items-center">Servis <ArrowUpRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* Nilai Valuasi & Ringkasan KIB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Valuasi Aset Box */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Total Valuasi Inventaris</span>
            <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
              AUDIT 2026
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              Rp {totalNilaiAset.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              Akumulasi nilai perolehan seluruh sarana prasarana, IT, perabot, dan laboratorium.
            </p>
          </div>
          <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Aset Kondisi Prima</span>
              <span className="font-black text-emerald-400">
                {barangList.length > 0 ? `${Math.round((baikCount / barangList.length) * 100)}%` : '100%'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Sumber Dana Terbesar</span>
              <span className="font-black text-indigo-300">Dana BOS & Yayasan</span>
            </div>
          </div>
        </div>

        {/* Klasifikasi KIB & Distribusi Aset */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="text-orange-500" size={18} />
              Klasifikasi Kartu Inventaris Barang (KIB A s/d KIB F)
            </h3>
            <button 
              onClick={() => onNavigateTab('daftar-barang')}
              className="text-xs text-orange-600 hover:text-orange-700 font-bold"
            >
              Lihat Detail Tabel →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(kibBreakdown).map(([kibName, count], idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-800 block">{kibName}</span>
                  <span className="text-[11px] text-slate-500">Tercatat di sistem aset</span>
                </div>
                <span className="text-sm font-black text-indigo-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  {count} Unit
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900">Akses Cepat Pengelolaan Sarana Prasarana:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('daftar-barang')}
            className="p-4 rounded-2xl bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200 text-left transition group active:scale-95"
          >
            <Package className="text-orange-600 mb-2 group-hover:scale-110 transition" size={22} />
            <div className="font-black text-xs text-slate-900">Daftar Barang & Aset</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Katalog KIB, label QR, & mutasi</p>
          </button>

          <button
            onClick={() => onNavigateTab('denah-ruangan')}
            className="p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 text-left transition group active:scale-95"
          >
            <Building2 className="text-blue-600 mb-2 group-hover:scale-110 transition" size={22} />
            <div className="font-black text-xs text-slate-900">Denah & Ruangan</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Distribusi aset per ruang kelas</p>
          </button>

          <button
            onClick={() => onNavigateTab('mutasi-pinjam')}
            className="p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 text-left transition group active:scale-95"
          >
            <Repeat className="text-indigo-600 mb-2 group-hover:scale-110 transition" size={22} />
            <div className="font-black text-xs text-slate-900">Form Peminjaman</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Peminjaman alat & proyektor</p>
          </button>

          <button
            onClick={() => onNavigateTab('perawatan-rusak')}
            className="p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 text-left transition group active:scale-95"
          >
            <Wrench className="text-rose-600 mb-2 group-hover:scale-110 transition" size={22} />
            <div className="font-black text-xs text-slate-900">Lapor Perbaikan</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Tiket service AC & kerusakan</p>
          </button>
        </div>
      </div>
    </div>
  );
}
