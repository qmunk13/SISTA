import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { PeminjamanSarpras, BarangSarpras } from '../../data/sarprasSeed';
import { 
  Repeat, Search, Plus, X, Eye, CheckCircle2, AlertTriangle, 
  Printer, Download, Clock, User, Calendar, FileText, ArrowRightLeft, ShieldAlert
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

export default function MutasiPeminjamanSarprasTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PeminjamanSarpras | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<PeminjamanSarpras | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  const [pinjamList, setPinjamList] = useState<PeminjamanSarpras[]>(() => {
    return db.get<PeminjamanSarpras>('peminjaman_sarpras') || [];
  });

  const barangList = useMemo(() => db.get<BarangSarpras>('barang') || [], []);

  const saveToDb = (newList: PeminjamanSarpras[]) => {
    setPinjamList(newList);
    db.set('peminjaman_sarpras', newList);
  };

  // Form State for Add
  const [formData, setFormData] = useState<Partial<PeminjamanSarpras>>({
    noPeminjaman: `PINJ/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 900) + 100)}`,
    namaPeminjam: '',
    rolePeminjam: 'Guru',
    kelasAtauUnit: '',
    kontak: '',
    barangId: barangList[0]?.id || '',
    namaBarang: barangList[0]?.nama || '',
    jumlah: 1,
    tglPinjam: new Date().toISOString().split('T')[0],
    tglKembaliRencana: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    keperluan: '',
    petugas: ''
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return pinjamList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.noPeminjaman.toLowerCase().includes(q) ||
        item.namaPeminjam.toLowerCase().includes(q) ||
        item.namaBarang.toLowerCase().includes(q) ||
        item.kelasAtauUnit.toLowerCase().includes(q) ||
        item.keperluan.toLowerCase().includes(q);

      const matchStatus = !filterStatus || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [pinjamList, searchTerm, filterStatus]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPeminjam || !formData.barangId) {
      alert('Mohon lengkapi Nama Peminjam dan Barang!');
      return;
    }

    const selectedBarang = barangList.find(b => b.id === formData.barangId);

    const newItem: PeminjamanSarpras = {
      id: `PINJ-${Date.now()}`,
      noPeminjaman: formData.noPeminjaman || `PINJ-${Date.now()}`,
      namaPeminjam: formData.namaPeminjam || '',
      rolePeminjam: formData.rolePeminjam as any || 'Guru',
      kelasAtauUnit: formData.kelasAtauUnit || 'Umum',
      kontak: formData.kontak || '',
      barangId: formData.barangId || '',
      namaBarang: selectedBarang ? selectedBarang.nama : (formData.namaBarang || 'Barang Sarpras'),
      jumlah: Number(formData.jumlah) || 1,
      tglPinjam: formData.tglPinjam || new Date().toISOString().split('T')[0],
      tglKembaliRencana: formData.tglKembaliRencana || new Date().toISOString().split('T')[0],
      keperluan: formData.keperluan || 'Kegiatan Pembelajaran',
      status: 'Dipinjam',
      petugas: formData.petugas || 'Petugas Sarpras'
    };

    const updated = [newItem, ...pinjamList];
    saveToDb(updated);
    setIsAddModalOpen(false);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'TAMBAH',
      target: `Peminjaman Sarpras: ${newItem.noPeminjaman}`,
      rincian: `${newItem.namaPeminjam} meminjam ${newItem.jumlah} unit ${newItem.namaBarang} untuk keperluan ${newItem.keperluan}.`
    });

    setFormData({
      noPeminjaman: `PINJ/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 900) + 100)}`,
      namaPeminjam: '',
      rolePeminjam: 'Guru',
      kelasAtauUnit: '',
      kontak: '',
      barangId: barangList[0]?.id || '',
      namaBarang: barangList[0]?.nama || '',
      jumlah: 1,
      tglPinjam: new Date().toISOString().split('T')[0],
      tglKembaliRencana: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      keperluan: '',
      petugas: ''
    });
  };

  // Handle Mark Returned
  const handleConfirmReturn = () => {
    if (!returnModalItem) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updated = pinjamList.map(item => item.id === returnModalItem.id ? {
      ...item,
      status: 'Dikembalikan' as const,
      tglKembaliRealisasi: todayStr,
      catatanKondisi: returnNotes || 'Barang dikembalikan dalam kondisi lengkap dan baik.'
    } : item);

    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'VERIFIKASI',
      target: `Pengembalian Barang: ${returnModalItem.noPeminjaman}`,
      rincian: `Barang ${returnModalItem.namaBarang} telah dikembalikan oleh ${returnModalItem.namaPeminjam}. Catatan: ${returnNotes || 'Kondisi Baik'}.`
    });

    setReturnModalItem(null);
    setReturnNotes('');
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((p, idx) => ({
      No: idx + 1,
      'No Peminjaman': p.noPeminjaman,
      'Nama Peminjam': p.namaPeminjam,
      'Kategori Peminjam': p.rolePeminjam,
      'Kelas / Instansi': p.kelasAtauUnit,
      Kontak: p.kontak,
      'Barang Dipinjam': p.namaBarang,
      'Jumlah Unit': p.jumlah,
      'Tanggal Pinjam': p.tglPinjam,
      'Rencana Kembali': p.tglKembaliRencana,
      'Realisasi Kembali': p.tglKembaliRealisasi || '-',
      Status: p.status,
      'Keperluan Pinjam': p.keperluan,
      'Petugas Sarpras': p.petugas,
      'Catatan Kondisi': p.catatanKondisi || '-'
    }));

    exportToExcel(rows, `Data_Peminjaman_Sarpras_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EKSPOR',
      target: 'Ekspor Excel Peminjaman Sarpras',
      rincian: `Mengekspor ${filteredList.length} rekap riwayat peminjaman sarpras ke Excel.`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Repeat className="text-indigo-500" size={22} />
            Mutasi & Peminjaman Sarpras
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pencatatan sirkulasi peminjaman alat, LCD proyektor, sound system, laptop, verifikasi pengembalian, & riwayat mutasi antar ruang.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
          >
            <Download size={15} />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Pinjam Barang</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari no pinjam, nama peminjam, barang, keperluan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Semua Status Peminjaman</option>
            <option value="Dipinjam">Sedang Dipinjam</option>
            <option value="Dikembalikan">Sudah Dikembalikan</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
          </select>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">No & Tanggal Pinjam</th>
                <th className="py-3.5 px-4">Peminjam & Unit</th>
                <th className="py-3.5 px-4">Barang Dipinjam</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4">Batas / Realisasi Kembali</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Repeat size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Data Peminjaman</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60 block whitespace-nowrap">
                        {item.noPeminjaman}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Pinjam: {item.tglPinjam}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-indigo-700 transition">
                        {item.namaPeminjam}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {item.rolePeminjam} • {item.kelasAtauUnit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-800">
                        {item.namaBarang}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        Keperluan: {item.keperluan}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                        {item.jumlah} Unit
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-700">
                        Batas: {item.tglKembaliRencana}
                      </div>
                      {item.tglKembaliRealisasi && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          Kembali: {item.tglKembaliRealisasi}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        item.status === 'Dikembalikan'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'Dipinjam'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status === 'Dipinjam' && (
                          <button
                            onClick={() => {
                              setReturnModalItem(item);
                              setReturnNotes('');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1"
                            title="Proses Pengembalian Barang"
                          >
                            <CheckCircle2 size={12} />
                            <span>Kembali</span>
                          </button>
                        )}
                        <button
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                          title="Lihat Detail Peminjaman"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pengembalian Barang */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Verifikasi Pengembalian</h3>
              </div>
              <button onClick={() => setReturnModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="font-black text-slate-900">{returnModalItem.namaBarang}</div>
              <div className="text-slate-500">Peminjam: {returnModalItem.namaPeminjam} ({returnModalItem.kelasAtauUnit})</div>
              <div className="text-slate-500">Jumlah: {returnModalItem.jumlah} Unit</div>
            </div>

            <div>
              <label className="font-bold text-slate-700 text-xs block mb-1">
                Catatan Kondisi Barang Saat Pengembalian:
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Barang lengkap, kondisi prima, remote dan kabel tersimpan rapi..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnModalItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200"
              >
                Konfirmasi Dikembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pinjam */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Form Peminjaman Sarpras Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No Peminjaman</label>
                  <input
                    type="text"
                    required
                    value={formData.noPeminjaman}
                    onChange={(e) => setFormData({ ...formData, noPeminjaman: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Barang *</label>
                  <select
                    value={formData.barangId}
                    onChange={(e) => {
                      const sel = barangList.find(b => b.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        barangId: e.target.value,
                        namaBarang: sel ? sel.nama : ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {barangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama} ({b.jumlah} {b.satuan})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Peminjam *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama guru / siswa / ketua ekskul"
                    value={formData.namaPeminjam}
                    onChange={(e) => setFormData({ ...formData, namaPeminjam: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Peminjam</label>
                  <select
                    value={formData.rolePeminjam}
                    onChange={(e) => setFormData({ ...formData, rolePeminjam: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Siswa">Siswa</option>
                    <option value="Staf TU">Staf TU</option>
                    <option value="OSIS / Ekskul">OSIS / Ekskul</option>
                    <option value="Pihak Luar">Pihak Luar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit / Kelas</label>
                  <input
                    type="text"
                    placeholder="Kelas X-A / OSIS"
                    value={formData.kelasAtauUnit}
                    onChange={(e) => setFormData({ ...formData, kelasAtauUnit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No Kontak / WA</label>
                  <input
                    type="text"
                    placeholder="0812xxxx"
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Qty Pinjam</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tgl Pinjam</label>
                  <input
                    type="date"
                    value={formData.tglPinjam}
                    onChange={(e) => setFormData({ ...formData, tglPinjam: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tgl Rencana Kembali</label>
                  <input
                    type="date"
                    value={formData.tglKembaliRencana}
                    onChange={(e) => setFormData({ ...formData, tglKembaliRencana: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keperluan Peminjaman</label>
                <textarea
                  rows={2}
                  placeholder="Untuk kegiatan pembelajaran, pentas seni, upacara..."
                  value={formData.keperluan}
                  onChange={(e) => setFormData({ ...formData, keperluan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
                >
                  Simpan Transaksi Pinjam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Peminjaman */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Detail Peminjaman Sarpras</h3>
                <span className="font-mono text-xs text-indigo-700 font-bold">{detailItem.noPeminjaman}</span>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Peminjam</span>
                <span className="font-black text-slate-800">{detailItem.namaPeminjam}</span>
                <span className="text-[10px] text-slate-500 block">{detailItem.rolePeminjam} • {detailItem.kelasAtauUnit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Barang & Qty</span>
                <span className="font-black text-slate-800">{detailItem.namaBarang}</span>
                <span className="text-[10px] text-indigo-600 font-bold block">{detailItem.jumlah} Unit</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Rentang Tanggal</span>
                <span className="font-bold text-slate-800">{detailItem.tglPinjam} s/d {detailItem.tglKembaliRencana}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Status Terkini</span>
                <span className="font-black text-indigo-600">{detailItem.status}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Keperluan</span>
              <p className="text-slate-700 mt-1">{detailItem.keperluan}</p>
              {detailItem.catatanKondisi && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-emerald-700 font-medium">
                  <strong>Catatan Pengembalian:</strong> {detailItem.catatanKondisi}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                  logActivity({
                    modul: 'Sarpras & Aset',
                    aksi: 'CETAK',
                    target: `Bukti Peminjaman: ${detailItem.noPeminjaman}`,
                    rincian: `Mencetak bukti peminjaman barang ${detailItem.namaBarang} atas nama ${detailItem.namaPeminjam}.`
                  });
                }}
                className="px-4 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Bukti</span>
              </button>
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
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
