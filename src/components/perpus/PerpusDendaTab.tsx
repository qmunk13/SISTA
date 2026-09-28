import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, Clock, Search, Filter, Printer, Receipt, AlertCircle, Sparkles } from 'lucide-react';
import { DendaRecord } from '../../types';
import { db } from '../../data/db';

export default function PerpusDendaTab() {
  const [dendas, setDendas] = useState<DendaRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [receiptDenda, setReceiptDenda] = useState<DendaRecord | null>(null);

  const loadDendas = () => {
    const list = db.get<DendaRecord>('perpustakaan_denda');
    setDendas(list);
  };

  useEffect(() => {
    loadDendas();
  }, []);

  const handlePayDenda = (item: DendaRecord) => {
    if (confirm(`Konfirmasi pembayaran denda Rp ${item.nominal.toLocaleString('id-ID')} untuk ${item.peminjamNama}?`)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const updatedList = dendas.map(d => {
        if (d.id === item.id) {
          return {
            ...d,
            status: 'Lunas' as const,
            tanggalBayar: todayStr,
            petugas: 'Siti Aminah, S.I.Pust.'
          };
        }
        return d;
      });

      db.set('perpustakaan_denda', updatedList);
      setDendas(updatedList);
      setReceiptDenda({
        ...item,
        status: 'Lunas',
        tanggalBayar: todayStr,
        petugas: 'Siti Aminah, S.I.Pust.'
      });
    }
  };

  const filteredDendas = dendas.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      d.peminjamNama.toLowerCase().includes(q) ||
      d.bukuJudul.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'Semua' || d.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalDendaNominal = dendas.reduce((acc, d) => acc + d.nominal, 0);
  const totalDendaLunas = dendas.filter(d => d.status === 'Lunas').reduce((acc, d) => acc + d.nominal, 0);
  const totalDendaBelumLunas = dendas.filter(d => d.status === 'Belum Lunas').reduce((acc, d) => acc + d.nominal, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Total Denda Terbit</span>
            <Receipt size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            Rp {totalDendaNominal.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Dari {dendas.length} transaksi terlambat</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Kas Diterima (Lunas)</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            Rp {totalDendaLunas.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">Telah disetor ke kas literasi</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Piutang Belum Lunas</span>
            <Clock size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">
            Rp {totalDendaBelumLunas.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-rose-700 font-medium">Menunggu pelunasan murid</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama peminjam, judul buku, no denda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="Semua">Semua Status</option>
            <option value="Belum Lunas">Belum Lunas</option>
            <option value="Lunas">Lunas (Selesai)</option>
          </select>
        </div>
      </div>

      {/* Denda Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">No. Denda & Tgl</th>
                <th className="py-3.5 px-4">Peminjam & Kelas</th>
                <th className="py-3.5 px-4">Buku Terlambat</th>
                <th className="py-3.5 px-4">Hari Terlambat</th>
                <th className="py-3.5 px-4">Nominal Denda</th>
                <th className="py-3.5 px-4">Status & Pembayaran</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDendas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada catatan denda keterlambatan
                  </td>
                </tr>
              ) : (
                filteredDendas.map((denda) => {
                  const isPaid = denda.status === 'Lunas';
                  return (
                    <tr key={denda.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className="text-amber-800 block">{denda.id}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{denda.tanggalDenda}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">{denda.peminjamNama}</span>
                        <span className="text-[10px] text-slate-500">Kelas: {denda.peminjamKelas || '-'}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 line-clamp-1 max-w-xs">
                        {denda.bukuJudul}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">
                        {denda.hariTerlambat} Hari
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm">
                        Rp {denda.nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${
                            isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {denda.status}
                          </span>
                          {isPaid && (
                            <p className="text-[10px] text-slate-400 font-mono">Tgl: {denda.tanggalBayar}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid ? (
                            <button
                              onClick={() => handlePayDenda(denda)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <DollarSign size={12} />
                              <span>Bayar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setReceiptDenda(denda)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                              title="Kuitansi Denda"
                            >
                              <Printer size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kuitansi Denda Modal */}
      {receiptDenda && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <Receipt size={24} />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                Kuitansi Pelunasan Denda
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">Pembayaran Sah</h3>
              <p className="text-xs font-mono font-bold text-slate-500">{receiptDenda.id}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Peminjam:</span>
                <strong className="text-slate-900">{receiptDenda.peminjamNama} ({receiptDenda.peminjamKelas})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buku:</span>
                <strong className="text-slate-900 text-right line-clamp-1">{receiptDenda.bukuJudul}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hari Terlambat:</span>
                <strong className="text-slate-900">{receiptDenda.hariTerlambat} Hari</strong>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">Nominal Lunas:</span>
                <strong className="text-emerald-700 font-mono text-sm font-black">
                  Rp {receiptDenda.nominal.toLocaleString('id-ID')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Bayar:</span>
                <strong className="font-mono">{receiptDenda.tanggalBayar}</strong>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Petugas:</span>
                <span>{receiptDenda.petugas || 'Siti Aminah, S.I.Pust.'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReceiptDenda(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
              >
                <Printer size={14} />
                <span>Cetak Kuitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
