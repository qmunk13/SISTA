import React, { useState } from 'react';
import { 
  Boxes, 
  Wrench, 
  FolderArchive, 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface InventoryModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ userSession, dbData, setDbData, activeSubTab }) => {
  const [activeTab, setActiveTab] = useState<'barang' | 'peminjaman' | 'arsip'>('barang');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'peminjaman' || activeSubTab === 'pemeliharaan') setActiveTab('peminjaman');
      else if (activeSubTab === 'arsip_sarpras') setActiveTab('arsip');
      else setActiveTab('barang');
    }
  }, [activeSubTab]);

  const barangList = dbData['BARANG'] || [
    { id_barang: 'BRG-001', nama: 'Proyektor Epson EB-X400', kategori: 'Elektronik', jumlah: 12, Lokasi: 'Lab Komputer 1', Kondisi: 'Sangat Baik' },
    { id_barang: 'BRG-002', nama: 'Sound System Portable Active', kategori: 'Elektronik', jumlah: 4, Lokasi: 'Ruang Aula', Kondisi: 'Baik' },
    { id_barang: 'BRG-003', nama: 'Kamera Scanner Barcode / QR', kategori: 'Perangkat CBT', jumlah: 10, Lokasi: 'Ruang Panitia', Kondisi: 'Baik' }
  ];

  const peminjamanList = dbData['PEMINJAMAN_BARANG'] || [
    { id: 'PJM-001', siswaId: 'PDKT-101', barangId: 'BRG-001', tglPinjam: '2026-07-25', tglKembali: '2026-07-26', tglDikembalikan: '2026-07-26', status: 'Selesai' }
  ];

  const arsipList = dbData['ARSIP'] || [
    { idArsip: 'ARS-001', noDokumen: 'DOC/2026/071', judulDokumen: 'SK Penetapan Panitia ASAS 2026', kategori: 'Kedinasan', tglDokumen: '2026-07-01', fileUrl: '#', keterangan: 'Arsip Kurikulum' }
  ];

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('barang')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'barang' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" /> Inventaris Barang
        </button>
        <button
          onClick={() => setActiveTab('peminjaman')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'peminjaman' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" /> Log Peminjaman
        </button>
        <button
          onClick={() => setActiveTab('arsip')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'arsip' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderArchive className="w-4 h-4" /> Arsip Dokumen Sekolah
        </button>
      </div>

      {/* TAB 1: INVENTARIS BARANG */}
      {activeTab === 'barang' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Inventaris Aset & Barang Sekolah (BARANG)</h3>
              <p className="text-xs text-slate-500">Pencatatan sarana prasarana sekolah</p>
            </div>
            <button
              onClick={() => {
                const nama = prompt('Masukkan Nama Barang / Aset:');
                if (!nama) return;
                const kategori = prompt('Kategori (Elektronik, Olahraga, KBM, dll):', 'Elektronik') || 'Umum';
                const jumlahStr = prompt('Jumlah Unit:', '5');
                const lokasi = prompt('Lokasi Storage / Ruangan:', 'Ruang Lab') || 'Gudang';

                const newBarang = {
                  id_barang: `BRG-${Math.floor(100 + Math.random()*900)}`,
                  nama,
                  kategori,
                  jumlah: Number(jumlahStr) || 1,
                  Lokasi: lokasi,
                  Kondisi: 'Sangat Baik'
                };

                setDbData(prev => ({
                  ...prev,
                  BARANG: [newBarang, ...(prev['BARANG'] || [])]
                }));

                alert('Barang Baru Berhasil Ditambahkan ke Inventaris!');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Barang</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">ID Barang</th>
                  <th className="p-4">Nama Aset / Barang</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4 text-center">Jumlah</th>
                  <th className="p-4">Lokasi Storage</th>
                  <th className="p-4 text-center">Kondisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {barangList.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono text-blue-600 font-bold">{b.id_barang}</td>
                    <td className="p-4 font-bold text-slate-800">{b.nama}</td>
                    <td className="p-4 text-slate-600">{b.kategori}</td>
                    <td className="p-4 text-center font-mono font-bold text-amber-600">{b.jumlah} Unit</td>
                    <td className="p-4 text-slate-500">{b.Lokasi}</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {b.Kondisi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LOG PEMINJAMAN */}
      {activeTab === 'peminjaman' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Log Peminjaman Fasilitas & Alat (PEMINJAMAN_BARANG)</h3>

          <div className="space-y-3">
            {peminjamanList.map((p, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs text-slate-800">ID Peminjaman: {p.id} • Barang: {p.barangId}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Peminjam: {p.siswaId} • Tgl Pinjam: {p.tglPinjam}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ARSIP DOKUMEN */}
      {activeTab === 'arsip' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Manajemen Arsip Dokumen Sekolah (ARSIP)</h3>

          <div className="space-y-3">
            {arsipList.map((a, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800">{a.judulDokumen}</p>
                    <p className="text-[10px] text-slate-500 font-mono">No: {a.noDokumen} • {a.kategori} • {a.tglDokumen}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  TERARSIP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
