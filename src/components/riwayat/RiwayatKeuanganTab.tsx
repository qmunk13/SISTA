import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { 
  DollarSign, Search, Filter, Download, Printer, Eye, 
  Calendar, CheckCircle2, ArrowUpRight, ArrowDownLeft, X, FileText
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';
import { triggerPrint } from '../../lib/utils';

interface TransaksiKeuanganHistoris {
  id: string;
  noTransaksi: string;
  tahunAjaran: string;
  semester: string;
  tanggal: string;
  kategori: 'Pemasukan' | 'Pengeluaran';
  jenis: string; // Iuran Pendidikan, BOS, DSP, Gaji GTK, Sarpras, Listrik & Internet, dsb
  namaSiswaOrVendor: string;
  kelasOrDepartemen: string;
  nominal: number;
  metode: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Virtual Account';
  petugas: string;
  keterangan: string;
}

export default function RiwayatKeuanganTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [detailItem, setDetailItem] = useState<TransaksiKeuanganHistoris | null>(null);

  // Initialize or fetch from DB
  const [transaksiList, setTransaksiList] = useState<TransaksiKeuanganHistoris[]>(() => {
    const fromDb = db.get<TransaksiKeuanganHistoris>('riwayat_keuangan_historis');
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const filteredList = useMemo(() => {
    return transaksiList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.noTransaksi.toLowerCase().includes(q) ||
        item.namaSiswaOrVendor.toLowerCase().includes(q) ||
        item.jenis.toLowerCase().includes(q) ||
        item.kelasOrDepartemen.toLowerCase().includes(q) ||
        item.petugas.toLowerCase().includes(q);

      const matchTahun = !filterTahun || item.tahunAjaran === filterTahun;
      const matchKat = !filterKategori || item.kategori === filterKategori;
      return matchSearch && matchTahun && matchKat;
    });
  }, [transaksiList, searchTerm, filterTahun, filterKategori]);

  const totalMasuk = useMemo(() => {
    return filteredList.filter(i => i.kategori === 'Pemasukan').reduce((acc, c) => acc + c.nominal, 0);
  }, [filteredList]);

  const totalKeluar = useMemo(() => {
    return filteredList.filter(i => i.kategori === 'Pengeluaran').reduce((acc, c) => acc + c.nominal, 0);
  }, [filteredList]);

  // Export to Excel
  const handleExport = () => {
    const rows = filteredList.map((r, idx) => ({
      No: idx + 1,
      'No Bukti / Kwitansi': r.noTransaksi,
      'Tahun Ajaran': r.tahunAjaran,
      Semester: r.semester,
      Tanggal: r.tanggal,
      Kategori: r.kategori,
      'Jenis Pembukuan': r.jenis,
      'Siswa / Pihak Ketiga': r.namaSiswaOrVendor,
      'Kelas / Departemen': r.kelasOrDepartemen,
      'Nominal (Rp)': r.nominal,
      Metode: r.metode,
      'Petugas Kasir': r.petugas,
      Keterangan: r.keterangan
    }));

    exportToExcel(rows, `Riwayat_Transaksi_Keuangan_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Keuangan',
      aksi: 'EKSPOR',
      target: 'Ekspor Riwayat Keuangan Historis',
      rincian: `Mengekspor ${filteredList.length} transaksi masa lalu ke format Excel.`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={22} />
            Arsip & Riwayat Transaksi Keuangan Masa Lalu
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Database rekam jejak pembayaran iuran biaya siswa, pencairan BOS, pengadaan belanja sarpras, & honorarium periode terdahulu.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
        >
          <Download size={15} />
          <span>Ekspor Jurnal Excel</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Penerimaan</span>
            <div className="text-xl font-black text-emerald-600 mt-1">
              Rp {totalMasuk.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-500">Pemasukan Iuran, DSP, & BOS</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pengeluaran</span>
            <div className="text-xl font-black text-rose-600 mt-1">
              Rp {totalKeluar.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-500">Belanja sarpras & gaji</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Selisih Kas Bersih</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              Rp {(totalMasuk - totalKeluar).toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-500">Saldo kumulatif arsip</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari kwitansi, siswa, jenis biaya, kasir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">Semua Tahun Ajaran</option>
            <option value="2024/2025">T.A 2024/2025</option>
            <option value="2023/2024">T.A 2023/2024</option>
            <option value="2022/2023">T.A 2022/2023</option>
          </select>

          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">Semua Arus Kas</option>
            <option value="Pemasukan">Pemasukan (Penerimaan)</option>
            <option value="Pengeluaran">Pengeluaran (Belanja/Beban)</option>
          </select>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">No Kwitansi / Tgl</th>
                <th className="py-3.5 px-4">T.A / Semester</th>
                <th className="py-3.5 px-4">Pihak / Siswa & Dept</th>
                <th className="py-3.5 px-4">Jenis Transaksi</th>
                <th className="py-3.5 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3.5 px-4 text-center">Arus</th>
                <th className="py-3.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <DollarSign size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Rekam Jejak Keuangan</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 block whitespace-nowrap">
                        {item.noTransaksi}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {item.tanggal} • {item.metode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {item.tahunAjaran}
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Sem. {item.semester}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-emerald-700 transition">
                        {item.namaSiswaOrVendor}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {item.kelasOrDepartemen} • Kasir: {item.petugas}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {item.jenis}
                      </span>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{item.keterangan}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-black text-sm ${
                        item.kategori === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.kategori === 'Pemasukan' ? '+' : '-'} Rp {item.nominal.toLocaleString('id-ID')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        item.kategori === 'Pemasukan'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition"
                        title="Lihat Bukti Kwitansi"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Bukti Kwitansi Historis */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="printable-area" className="printable-container bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 print:p-0 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Kwitansi Transaksi Digital</h3>
                <span className="font-mono text-xs text-emerald-700 font-bold">{detailItem.noTransaksi}</span>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer no-print">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Jumlah Pembayaran</span>
              <div className="text-2xl font-black text-emerald-800">
                Rp {detailItem.nominal.toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">{detailItem.kategori} • {detailItem.jenis}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Pihak / Siswa</span>
                <span className="font-black text-slate-800">{detailItem.namaSiswaOrVendor}</span>
                <span className="text-[10px] text-slate-500 block">{detailItem.kelasOrDepartemen}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Periode T.A</span>
                <span className="font-bold text-slate-800">{detailItem.tahunAjaran}</span>
                <span className="text-[10px] text-slate-500 block">Semester {detailItem.semester}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Tanggal & Metode</span>
                <span className="font-bold text-slate-800">{detailItem.tanggal}</span>
                <span className="text-[10px] text-slate-500 block">{detailItem.metode}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Petugas Validasi</span>
                <span className="font-black text-slate-800">{detailItem.petugas}</span>
                <span className="text-[10px] text-emerald-600 font-bold block">Status Terverifikasi</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Catatan / Uraian:</span>
              <p className="text-slate-700">{detailItem.keterangan}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 no-print">
              <button
                onClick={() => {
                  triggerPrint();
                  logActivity({
                    modul: 'Keuangan',
                    aksi: 'CETAK',
                    target: `Cetak Kwitansi ${detailItem.noTransaksi}`,
                    rincian: `Mencetak ulang slip kwitansi digital senilai Rp ${detailItem.nominal.toLocaleString('id-ID')}.`
                  });
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Cetak Ulang Slip</span>
              </button>
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
