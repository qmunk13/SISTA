import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { InventarisBarang } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Trash2,
  Edit,
  FolderOpen,
  MapPin,
  GitBranch,
  ShieldAlert,
  Wrench
} from 'lucide-react';

interface InventarisProps {
  forceSubTab?: 'dashboard' | 'barang' | 'lokasi_tab' | 'mutasi' | 'rusak';
}

export default function Inventaris({ forceSubTab }: InventarisProps = {}) {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'barang' | 'lokasi_tab' | 'mutasi' | 'rusak'>('inventaris', forceSubTab || 'dashboard');
  const [barangList, setBarangList] = useState<InventarisBarang[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarang, setEditingBarang] = useState<InventarisBarang | null>(null);
  const [namaBarang, setNamaBarang] = useState('');
  const [kodeBarang, setKodeBarang] = useState('');
  const [kategori, setKategori] = useState('Elektronik');
  const [kondisi, setKondisi] = useState<'BAIK' | 'RUSAK' | 'PERBAIKAN'>('BAIK');
  const [jumlah, setJumlah] = useState<number>(1);
  const [lokasi, setLokasi] = useState('');

  // Mutasi logs
  const [mutasiList, setMutasiList] = useState<any[]>([
    { id: 'MTS_1', namaBarang: 'Proyektor Epson EB-X05', dari: 'Gudang Sarpras', ke: 'Kelas VII-A', peminjam: 'Ibu Endang', status: 'DIPINJAM' },
    { id: 'MTS_2', namaBarang: 'Laptop ASUS Core i5', dari: 'Lab Komputer', ke: 'Ruang Kepala Sekolah', peminjam: 'Pak Priyono', status: 'KEMBALI' }
  ]);

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => loadAllData();
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, [activeSubTab]);

  const loadAllData = () => {
    setBarangList(db.get<InventarisBarang>('inventaris_barang'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang || !kodeBarang || !lokasi || jumlah <= 0) {
      Swal.fire('Error', 'Harap isi seluruh field wajib bertanda (*)', 'error');
      return;
    }

    if (editingBarang) {
      db.update<InventarisBarang>('inventaris_barang', 'id', editingBarang.id, {
        namaBarang,
        kodeBarang,
        kategori,
        kondisi,
        jumlah,
        lokasi
      });
      Swal.fire('Sukses', 'Data inventaris berhasil diperbarui.', 'success');
    } else {
      const isRegistered = barangList.some(b => b.kodeBarang === kodeBarang);
      if (isRegistered) {
        Swal.fire('Error', 'Kode barang ini sudah terdaftar.', 'error');
        return;
      }

      const newBarang: InventarisBarang = {
        id: `INV_${Date.now().toString().slice(-4)}`,
        namaBarang,
        kodeBarang,
        kategori,
        kondisi,
        jumlah,
        lokasi,
        tglInput: new Date().toISOString().slice(0, 10)
      };

      db.insert<InventarisBarang>('inventaris_barang', newBarang);
      Swal.fire('Sukses', 'Barang baru berhasil ditambahkan.', 'success');
    }

    setIsModalOpen(false);
    setEditingBarang(null);
    loadAllData();
  };

  const openEditModal = (b: InventarisBarang) => {
    setEditingBarang(b);
    setNamaBarang(b.namaBarang);
    setKodeBarang(b.kodeBarang || '');
    setKategori(b.kategori);
    setKondisi((b.kondisi === 'RUSAK' || b.kondisi === 'PERBAIKAN') ? b.kondisi : 'BAIK');
    setJumlah(b.jumlah);
    setLokasi(b.lokasi);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingBarang(null);
    setNamaBarang('');
    setKodeBarang('');
    setKategori('Elektronik');
    setKondisi('BAIK');
    setJumlah(1);
    setLokasi('');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Barang?',
      text: 'Barang yang dihapus tidak dapat dipulihkan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.delete('inventaris_barang', 'id', id);
        Swal.fire('Terhapus', 'Barang berhasil dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleFixBarang = (id: string) => {
    db.update<InventarisBarang>('inventaris_barang', 'id', id, { kondisi: 'BAIK' });
    Swal.fire('Sukses', 'Kondisi barang telah diperbarui ke BAIK.', 'success');
    loadAllData();
  };

  const filteredBarang = barangList.filter(b => 
    b.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.lokasi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      {!forceSubTab && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          {[
            { id: 'dashboard', label: 'Inventaris Dashboard' },
            { id: 'lokasi_tab', label: 'Ruangan / Lokasi' },
            { id: 'mutasi', label: 'Mutasi / Pinjam' },
            { id: 'rusak', label: 'Kondisi / Rusak' }
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-inv-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all border shrink-0 ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Unit Aset</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">
                  {barangList.reduce((acc, b) => acc + b.jumlah, 0)} Unit
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Kondisi Baik</span>
                <h4 className="text-xl font-black text-emerald-600 mt-1">
                  {barangList.filter(b => b.kondisi === 'BAIK').reduce((acc, b) => acc + b.jumlah, 0)} Unit
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Aset Rusak</span>
                <h4 className="text-xl font-black text-rose-600 mt-1">
                  {barangList.filter(b => b.kondisi === 'RUSAK').reduce((acc, b) => acc + b.jumlah, 0)} Unit
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Wrench className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Dalam Perbaikan</span>
                <h4 className="text-xl font-black text-amber-500 mt-1">
                  {barangList.filter(b => b.kondisi === 'PERBAIKAN').reduce((acc, b) => acc + b.jumlah, 0)} Unit
                </h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="bg-white border p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Nilai Penyusutan Aset Rombel</h4>
              <p className="text-slate-500">Seluruh laptop, proyektor, dan AC laboratorium terdaftar mengalami depresiasi berkala 15% per tahun buku.</p>
              <div className="p-4 bg-slate-50 border rounded-2xl">
                <p className="font-bold text-slate-700">Estimasi Total Buku Sarpras:</p>
                <p className="text-sm font-black text-blue-600 font-mono mt-1">IDR 124,500,000</p>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Tambah Item Inventaris Baru</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">Masukkan aset sekolah, nomor barcode pabrikan, kategori barang, dan lokasi penempatan ruangan di Sisko.</p>
              </div>
              <button onClick={openAddModal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition">
                Daftarkan Aset Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'barang' && (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          {/* Header & Tools */}
          <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 w-full md:max-w-xs bg-white border px-3 py-2 rounded-xl text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari aset, kode, lokasi..." 
                className="bg-transparent border-none outline-none w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddModal}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Tambah Barang
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 hidden sm:table-cell">Kode Aset</th>
                  <th className="p-4">Nama Barang</th>
                  <th className="p-4 hidden md:table-cell">Kategori</th>
                  <th className="p-4 hidden sm:table-cell">Lokasi Ruang</th>
                  <th className="p-4 text-center">Stok</th>
                  <th className="p-4 text-center">Kondisi</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBarang.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600 hidden sm:table-cell">{b.kodeBarang}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{b.namaBarang}</p>
                        <p className="text-[10px] text-slate-400 font-mono sm:hidden mt-0.5">Kode: {b.kodeBarang} | Ruang: {b.lokasi}</p>
                        <p className="text-[10px] text-blue-500 font-bold md:hidden mt-0.5">{b.kategori}</p>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-blue-600 hidden md:table-cell">{b.kategori}</td>
                    <td className="p-4 text-slate-500 font-semibold hidden sm:table-cell">{b.lokasi}</td>
                    <td className="p-4 text-center font-bold text-slate-700">{b.jumlah}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        b.kondisi === 'BAIK' ? 'bg-emerald-50 text-emerald-700' : b.kondisi === 'PERBAIKAN' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>{b.kondisi}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEditModal(b)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'lokasi_tab' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Tata Ruang & Sarana Prasarana</h3>
            <p className="text-xs text-slate-400 mt-1">Daftar alokasi penyebaran inventaris per titik lokasi gedung sekolah terdaftar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { ruang: 'Laboratorium Komputer', items: '25 Unit PC, 2 Unit AC Split, 1 Proyektor', penanggungJawab: 'Pak Priyadi' },
              { ruang: 'Ruang Guru Utama', items: '5 Meja Kerja, 1 Mesin Foto Copy, 1 Lemari Arsip', penanggungJawab: 'Bu Enny' },
              { ruang: 'Gudang Sarpras', items: '10 Kursi Plastik Cadangan, 5 Sapu, 2 Tangga Lipat', penanggungJawab: 'Pak Agus' }
            ].map((r, idx) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-start">
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1"><MapPin className="w-4 h-4 text-blue-500" /> {r.ruang}</h5>
                  <p className="text-slate-600 font-semibold">{r.items}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Kepala Ruang: {r.penanggungJawab}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'mutasi' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-4 text-xs">
            <h4 className="font-black text-slate-800 text-sm uppercase">Pencatatan Mutasi & Peminjaman Barang</h4>
            <button onClick={() => {
              Swal.fire({
                title: 'Buat Mutasi Barang',
                html: `
                  <input id="swal-mts-brg" class="swal2-input" placeholder="Nama Barang">
                  <input id="swal-mts-dari" class="swal2-input" placeholder="Asal">
                  <input id="swal-mts-ke" class="swal2-input" placeholder="Tujuan">
                `,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                preConfirm: () => {
                  const brg = (document.getElementById('swal-mts-brg') as HTMLInputElement).value;
                  const dari = (document.getElementById('swal-mts-dari') as HTMLInputElement).value;
                  const ke = (document.getElementById('swal-mts-ke') as HTMLInputElement).value;
                  if (!brg || !dari || !ke) {
                    Swal.showValidationMessage('Seluruh isian wajib!');
                  }
                  return { brg, dari, ke };
                }
              }).then((result: any) => {
                if (result.isConfirmed) {
                  const newMts = {
                    id: `MTS_${Date.now()}`,
                    namaBarang: result.value.brg,
                    dari: result.value.dari,
                    ke: result.value.ke,
                    peminjam: 'Guru Pengampu',
                    status: 'DIPINJAM'
                  };
                  setMutasiList([newMts, ...mutasiList]);
                  Swal.fire('Sukses', 'Mutasi peminjaman barang dicatat.', 'success');
                }
              });
            }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> Mutasi Sarpras Baru
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Nama Aset</th>
                  <th className="p-4">Asal</th>
                  <th className="p-4">Tujuan Mutasi</th>
                  <th className="p-4">Peminjam / PJ</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mutasiList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-800 text-sm">{m.namaBarang}</td>
                    <td className="p-4 text-slate-500 font-semibold">{m.dari}</td>
                    <td className="p-4 font-bold text-blue-600">{m.ke}</td>
                    <td className="p-4 text-slate-600 font-semibold">{m.peminjam}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'KEMBALI' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 animate-pulse'
                      }`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'rusak' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50">
            <h4 className="font-black text-slate-800 text-sm uppercase">Aset Rusak & Log Perbaikan Teknis</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Kode Barang</th>
                  <th className="p-4">Nama Barang</th>
                  <th className="p-4">Kondisi Saat Ini</th>
                  <th className="p-4 text-center">Aksi Perbaikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {barangList.filter(b => b.kondisi !== 'BAIK').map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">{b.kodeBarang}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{b.namaBarang}</td>
                    <td className="p-4"><span className="bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{b.kondisi}</span></td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleFixBarang(b.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-[10px] shadow"
                      >
                        Selesai Servis & Tandai BAIK
                      </button>
                    </td>
                  </tr>
                ))}
                {barangList.filter(b => b.kondisi !== 'BAIK').length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic font-semibold">Seluruh aset rombel berada dalam kondisi prima (BAIK)!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative border animate-fade-in-up text-xs">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 mb-4 flex items-center gap-2">
              {editingBarang ? 'Edit Aset Sekolah' : 'Pendaftaran Aset Sarpras'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Barang *</label>
                <input required type="text" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Contoh: Proyektor Epson EB-X05" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kode Aset / Barcode *</label>
                  <input required type="text" value={kodeBarang} onChange={(e) => setKodeBarang(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Contoh: EPS-9988" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                  <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold">
                    <option value="Elektronik">Elektronik & Gadget</option>
                    <option value="Mebel">Mebel & Perabot Kelas</option>
                    <option value="Olahraga">Alat Olahraga</option>
                    <option value="Buku">Buku & Pustaka</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Unit *</label>
                  <input required type="number" value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-semibold">Kondisi</label>
                  <select value={kondisi} onChange={(e: any) => setKondisi(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold">
                    <option value="BAIK">Baik</option>
                    <option value="PERBAIKAN">Dalam Perbaikan</option>
                    <option value="RUSAK">Rusak Total</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Penempatan Gedung *</label>
                <input required type="text" value={lokasi} onChange={(e) => setLokasi(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Contoh: Lab Komputer Lt.2" />
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">Simpan Aset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

declare const Swal: any;
export {};
