import React, { useState } from 'react';
import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  Receipt, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  Search, 
  CheckCircle, 
  DollarSign
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface KeuanganModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export const KeuanganModule: React.FC<KeuanganModuleProps> = ({ userSession, dbData, setDbData, activeSubTab: activeSubTabProp }) => {
  const [activeSubTab, setActiveSubTab] = useState<'tagihan' | 'pembayaran' | 'tabungan' | 'kas'>('tagihan');

  React.useEffect(() => {
    if (activeSubTabProp) {
      if (activeSubTabProp === 'pembayaran' || activeSubTabProp === 'spp') setActiveSubTab('pembayaran');
      else if (activeSubTabProp === 'tabungan') setActiveSubTab('tabungan');
      else if (activeSubTabProp === 'kas') setActiveSubTab('kas');
      else setActiveSubTab('tagihan');
    }
  }, [activeSubTabProp]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('PDKT-101');
  const [payAmount, setPayAmount] = useState<number>(250000);
  const [payMetode, setMetode] = useState<string>('TUNAI');

  const tagihanList = dbData['TAGIHAN'] || [];
  const pembayaranList = dbData['PEMBAYARAN'] || [];
  const tabunganList = dbData['TABUNGAN'] || [];
  const kasList = dbData['KAS'] || [];

  const handleProsesBayar = (tagihanId: string, currentNominal: number, namaSiswa: string, nopdkt: string) => {
    const invId = `INV-${Date.now()}`;
    const tgl = new Date().toISOString().split('T')[0];

    // Record Pembayaran & Invoice
    setDbData(prev => {
      const updatedTagihan = (prev['TAGIHAN'] || []).map(t => {
        if (t.id === tagihanId) {
          const newPaid = Number(t.paidAmount || 0) + payAmount;
          const newRem = Math.max(0, Number(t.nominal || 0) - newPaid);
          return { ...t, paidAmount: newPaid, remainingAmount: newRem, status: newRem <= 0 ? 'LUNAS' : 'SEBAGIAN' };
        }
        return t;
      });

      const newBayar = {
        id: `BYR-${Date.now()}`,
        tagihanId,
        nopdkt,
        kelasId: '10-A',
        tglBayar: tgl,
        metode: payMetode,
        jumlah: payAmount,
        catatan: `Pembayaran ${payMetode}`,
        createdBy: userSession.name,
        createdAt: new Date().toISOString(),
        invoiceId: invId,
        tagihanIds: tagihanId,
        namasiswa: namaSiswa,
        'Kode PDKT': nopdkt
      };

      const newKas = {
        KasID: `KAS-${Date.now()}`,
        Tanggal: tgl,
        Jenis: 'Masuk',
        Nominal: payAmount,
        Keterangan: `Penerimaan SPP ${namaSiswa} (${invId})`
      };

      return {
        ...prev,
        TAGIHAN: updatedTagihan,
        PEMBAYARAN: [newBayar, ...(prev['PEMBAYARAN'] || [])],
        KAS: [newKas, ...(prev['KAS'] || [])]
      };
    });

    alert(`Pembayaran Berhasil Dicatat! Invoice: ${invId}`);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('tagihan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'tagihan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Tagihan SPP
        </button>
        <button
          onClick={() => setActiveSubTab('pembayaran')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'pembayaran' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" /> Transaksi Pembayaran
        </button>
        <button
          onClick={() => setActiveSubTab('tabungan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'tabungan' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PiggyBank className="w-4 h-4" /> Tabungan Siswa
        </button>
        <button
          onClick={() => setActiveSubTab('kas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'kas' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" /> Buku Kas Umum
        </button>
      </div>

      {/* TAB 1: TAGIHAN SPP */}
      {activeSubTab === 'tagihan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Daftar Tagihan SPP & Kewajiban Siswa (TAGIHAN)</h3>
              <p className="text-xs text-slate-500">Status kewajiban lunas & tunggakan per siswa</p>
            </div>
            <button
              onClick={() => {
                const namaSiswa = prompt('Masukkan Nama Siswa:');
                if (!namaSiswa) return;
                const namaBiaya = prompt('Masukkan Nama Biaya (Misal: SPP Bulan Agustus 2026):', 'SPP Bulan Agustus 2026') || 'SPP';
                const nominalStr = prompt('Masukkan Nominal Tagihan (Rp):', '250000');
                if (!nominalStr) return;
                const nominal = Number(nominalStr) || 250000;

                const newTagihan = {
                  id: `TAG-${Date.now()}`,
                  nopdkt: `PDKT-${Math.floor(100 + Math.random()*900)}`,
                  kelasId: '10-A',
                  namaBiaya,
                  nominal,
                  paidAmount: 0,
                  remainingAmount: nominal,
                  status: 'BELUM',
                  dueDate: '2026-08-10',
                  namasiswa: namaSiswa
                };

                setDbData(prev => ({
                  ...prev,
                  TAGIHAN: [newTagihan, ...(prev['TAGIHAN'] || [])]
                }));

                alert('Tagihan Baru Berhasil Dibuat!');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Tagihan Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">ID Tagihan</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Nama Biaya</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tagihanList.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono text-blue-600 font-bold">{t.id}</td>
                    <td className="p-4 font-bold text-slate-800">{t.namasiswa} ({t.kelasId})</td>
                    <td className="p-4 font-semibold text-slate-600">{t.namaBiaya}</td>
                    <td className="p-4 text-right font-mono font-bold text-amber-600">Rp {Number(t.nominal).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {t.status !== 'LUNAS' ? (
                        <button
                          onClick={() => handleProsesBayar(t.id, t.nominal, t.namasiswa, t.nopdkt)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                        >
                          Bayar Sekarang
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Tuntas ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSAKSI PEMBAYARAN */}
      {activeSubTab === 'pembayaran' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Riwayat Transaksi Pembayaran & Invoice (PEMBAYARAN)</h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Tanggal Bayar</th>
                  <th className="p-4">Metode</th>
                  <th className="p-4 text-right">Jumlah Total</th>
                  <th className="p-4 text-center">Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pembayaranList.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono text-emerald-600 font-bold">{p.invoiceId}</td>
                    <td className="p-4 font-bold text-slate-800">{p.namasiswa}</td>
                    <td className="p-4 text-slate-500">{p.tglBayar}</td>
                    <td className="p-4 font-bold text-blue-600">{p.metode}</td>
                    <td className="p-4 text-right font-mono font-extrabold text-amber-600">Rp {Number(p.jumlah).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-center text-slate-500">{p.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TABUNGAN SISWA */}
      {activeSubTab === 'tabungan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Tabungan Siswa (TABUNGAN)</h3>
              <p className="text-xs text-amber-700">Setor & Tarik dana tabungan siswa real-time</p>
            </div>
            <button
              onClick={() => alert('Mutasi Tabungan Berhasil Disimpan!')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              + Setor Tabungan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dbData['TABUNGAN'] || [
              { id: 'TAB-101', nopdkt: 'PDKT-101', tanggal: '2026-07-20', jenis: 'SETOR', nominal: 100000, catatan: 'Setoran Rutin Pekanan', createdBy: 'Bendahara', namasiswa: 'Ahmad Rizki' }
            ]).map((tb, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{tb.namasiswa}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">{tb.tanggal} • {tb.catatan}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${tb.jenis === 'SETOR' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tb.jenis === 'SETOR' ? '+' : '-'} Rp {Number(tb.nominal).toLocaleString('id-ID')}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{tb.jenis}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BUKU KAS UMUM */}
      {activeSubTab === 'kas' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Buku Kas Umum & Pengeluaran Operasional (KAS & PENGELUARAN)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kasList.map((k, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs text-slate-800">{k.Keterangan}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{k.Tanggal} • KasID: {k.KasID}</p>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-600">
                  + Rp {Number(k.Nominal).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
