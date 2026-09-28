import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  DollarSign
} from 'lucide-react';
import { Tabungan, Tagihan, Pembayaran, Siswa } from '../../types';

interface TabunganModuleProps {
  siswaList: Siswa[];
  tabunganList: Tabungan[];
  tagihanList: Tagihan[];
  pembayaranList: Pembayaran[];
  onAddTabungan: (tabungan: Tabungan) => void;
  onAddPembayaran: (pembayaran: Pembayaran) => void;
}

export const TabunganModule: React.FC<TabunganModuleProps> = ({
  siswaList,
  tabunganList,
  tagihanList,
  pembayaranList,
  onAddTabungan,
  onAddPembayaran
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tabungan' | 'tagihan' | 'kasir'>('tabungan');

  // Form Tabungan
  const [selectedSiswaID, setSelectedSiswaID] = useState<string>('SIS-001');
  const [jenisMutasi, setJenisMutasi] = useState<'SETOR' | 'TARIK'>('SETOR');
  const [nominalMutasi, setNominalMutasi] = useState<number>(100000);
  const [keteranganMutasi, setKeteranganMutasi] = useState<string>('Setoran Rutin Siswa');

  const handleProcessTabungan = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominalMutasi <= 0) return;

    // Calculate current saldo
    const prevTabungan = tabunganList.filter((t) => t.SiswaID === selectedSiswaID);
    const lastSaldo = prevTabungan.length > 0 ? prevTabungan[prevTabungan.length - 1].Saldo : 0;

    let newSaldo = lastSaldo;
    if (jenisMutasi === 'SETOR') {
      newSaldo += nominalMutasi;
    } else {
      if (lastSaldo < nominalMutasi) {
        alert('Saldo tabungan siswa tidak mencukupi untuk penarikan!');
        return;
      }
      newSaldo -= nominalMutasi;
    }

    const newTab: Tabungan = {
      TabunganID: 'TAB-' + Math.floor(1000 + Math.random() * 9000),
      SiswaID: selectedSiswaID,
      Tanggal: new Date().toISOString().substring(0, 10),
      JenisTransaksi: jenisMutasi,
      Debit: jenisMutasi === 'SETOR' ? nominalMutasi : 0,
      Kredit: jenisMutasi === 'TARIK' ? nominalMutasi : 0,
      Saldo: newSaldo,
      PetugasID: 'BENDAHARA',
      Keterangan: keteranganMutasi,
      Status: 'BERHASIL'
    };

    onAddTabungan(newTab);
    alert('Transaksi Tabungan Berhasil! Saldo Baru: Rp ' + newSaldo.toLocaleString('id-ID'));
  };

  const totalTabunganSemua = tabunganList.reduce((acc, t) => acc + (t.Debit - t.Kredit), 0);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('tabungan')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'tabungan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tabungan Siswa
          </button>
          <button
            onClick={() => setActiveSubTab('tagihan')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'tagihan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tagihan SPP & Kewajiban
          </button>
          <button
            onClick={() => setActiveSubTab('kasir')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'kasir'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Kwitansi & Kasir Pembayaran
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
          Total Saldo: <strong className="text-indigo-700 font-bold">Rp {totalTabunganSemua.toLocaleString('id-ID')}</strong>
        </div>
      </div>

      {activeSubTab === 'tabungan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Buku Mutasi Tabungan Siswa</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Siswa ID</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3 text-right">Debit (Setor)</th>
                    <th className="p-3 text-right">Kredit (Tarik)</th>
                    <th className="p-3 text-right">Saldo Akhir</th>
                    <th className="p-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tabunganList.map((t) => (
                    <tr key={t.TabunganID} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-500">{t.Tanggal}</td>
                      <td className="p-3 font-bold text-slate-800">{t.SiswaID}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            t.JenisTransaksi === 'SETOR'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {t.JenisTransaksi}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {t.Debit > 0 ? 'Rp ' + t.Debit.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {t.Kredit > 0 ? 'Rp ' + t.Kredit.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        Rp {t.Saldo.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-slate-500">{t.Keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Transaksi */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" /> Transaksi Tabungan
            </h3>

            <form onSubmit={handleProcessTabungan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Pilih Siswa</label>
                <select
                  value={selectedSiswaID}
                  onChange={(e) => setSelectedSiswaID(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                >
                  {siswaList.map((s) => (
                    <option key={s.SiswaID} value={s.SiswaID}>
                      {s.NamaLengkap} ({s.KelasID})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJenisMutasi('SETOR')}
                    className={`p-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      jenisMutasi === 'SETOR'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Setoran
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisMutasi('TARIK')}
                    className={`p-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                      jenisMutasi === 'TARIK'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Penarikan
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Nominal (Rupiah)</label>
                <input
                  type="number"
                  min="1000"
                  step="any"
                  value={nominalMutasi}
                  onChange={(e) => setNominalMutasi(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Keterangan Catatan</label>
                <input
                  type="text"
                  value={keteranganMutasi}
                  onChange={(e) => setKeteranganMutasi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition mt-2"
              >
                Proses Transaksi Mutasi
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'tagihan' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Daftar Tagihan & SPP Siswa</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Siswa ID</th>
                  <th className="p-3">Biaya ID</th>
                  <th className="p-3">Jatuh Tempo</th>
                  <th className="p-3 text-right">Total Tagihan</th>
                  <th className="p-3 text-right">Total Bayar</th>
                  <th className="p-3 text-right">Sisa Tagihan</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tagihanList.map((tg) => (
                  <tr key={tg.TagihanID} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-700">{tg.InvoiceID}</td>
                    <td className="p-3 font-bold text-slate-800">{tg.SiswaID}</td>
                    <td className="p-3 text-slate-600 font-semibold">{tg.BiayaID}</td>
                    <td className="p-3 font-mono text-slate-500">{tg.TanggalJatuhTempo}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      Rp {tg.TotalTagihan.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      Rp {tg.TotalBayar.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      Rp {tg.SisaTagihan.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold ${
                          tg.Status === 'LUNAS'
                            ? 'bg-emerald-100 text-emerald-700'
                            : tg.Status === 'SEBAGIAN'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {tg.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'kasir' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Riwayat Pembayaran & Kwitansi Resmi</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Pembayaran ID</th>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Siswa ID</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3 text-right">Nominal Bayar</th>
                  <th className="p-3">Metode</th>
                  <th className="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pembayaranList.map((p) => (
                  <tr key={p.PembayaranID} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-700">{p.PembayaranID}</td>
                    <td className="p-3 font-mono">{p.InvoiceID}</td>
                    <td className="p-3 font-bold text-slate-800">{p.SiswaID}</td>
                    <td className="p-3 font-mono text-slate-500">{p.Tanggal}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600">
                      Rp {p.Nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 font-bold text-teal-700">{p.MetodePembayaran}</td>
                    <td className="p-3 text-slate-500">{p.Keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
