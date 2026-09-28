import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { PerawatanSarpras, BarangSarpras } from '../../data/sarprasSeed';
import { 
  Wrench, Search, Plus, X, Eye, Edit, Trash2, CheckCircle2, 
  AlertTriangle, Download, DollarSign, User, Calendar, Clock, ArrowUpRight
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

export default function PerawatanKondisiRusakTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PerawatanSarpras | null>(null);
  const [updateModalItem, setUpdateModalItem] = useState<PerawatanSarpras | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'Diajukan' | 'Sedang Dikerjakan' | 'Selesai' | 'Dihapuskan / Afkir'>('Selesai');
  const [updateResult, setUpdateResult] = useState('');

  const [rawatList, setRawatList] = useState<PerawatanSarpras[]>(() => {
    return db.get<PerawatanSarpras>('perawatan_sarpras') || [];
  });

  const barangList = useMemo(() => db.get<BarangSarpras>('barang') || [], []);

  const saveToDb = (newList: PerawatanSarpras[]) => {
    setRawatList(newList);
    db.set('perawatan_sarpras', newList);
  };

  // Form State for Add
  const [formData, setFormData] = useState<Partial<PerawatanSarpras>>({
    noTiket: `MNT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 900) + 100)}`,
    barangId: barangList[0]?.id || '',
    namaBarang: barangList[0]?.nama || '',
    kodeBarang: barangList[0]?.kode || '',
    lokasi: barangList[0]?.lokasi || 'Lab Komputer 1',
    tglLapor: new Date().toISOString().split('T')[0],
    pelapor: 'Staf Pengajar / Petugas Lab',
    deskripsiKerusakan: '',
    tingkatKerusakan: 'Sedang',
    tindakanPerbaikan: '',
    teknisiVendor: 'Teknisi Internal / Vendor Mitra',
    estimasiBiaya: 250000
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return rawatList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.noTiket.toLowerCase().includes(q) ||
        item.namaBarang.toLowerCase().includes(q) ||
        item.kodeBarang.toLowerCase().includes(q) ||
        item.pelapor.toLowerCase().includes(q) ||
        item.deskripsiKerusakan.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q);

      const matchStatus = !filterStatus || item.status === filterStatus;
      const matchTingkat = !filterTingkat || item.tingkatKerusakan === filterTingkat;
      return matchSearch && matchStatus && matchTingkat;
    });
  }, [rawatList, searchTerm, filterStatus, filterTingkat]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaBarang || !formData.deskripsiKerusakan) {
      alert('Mohon lengkapi Nama Barang dan Deskripsi Kerusakan!');
      return;
    }

    const selectedBarang = barangList.find(b => b.id === formData.barangId);

    const newItem: PerawatanSarpras = {
      id: `MNT-${Date.now()}`,
      noTiket: formData.noTiket || `MNT-${Date.now()}`,
      barangId: formData.barangId || '',
      namaBarang: selectedBarang ? selectedBarang.nama : (formData.namaBarang || 'Barang Sarpras'),
      kodeBarang: selectedBarang ? selectedBarang.kode : (formData.kodeBarang || 'AST-001'),
      lokasi: selectedBarang ? selectedBarang.lokasi : (formData.lokasi || 'Ruang'),
      tglLapor: formData.tglLapor || new Date().toISOString().split('T')[0],
      pelapor: formData.pelapor || 'Petugas Sarpras',
      deskripsiKerusakan: formData.deskripsiKerusakan || '',
      tingkatKerusakan: formData.tingkatKerusakan as any || 'Sedang',
      tindakanPerbaikan: formData.tindakanPerbaikan || 'Pemeriksaan dan perbaikan komponen',
      teknisiVendor: formData.teknisiVendor || 'Teknisi',
      estimasiBiaya: Number(formData.estimasiBiaya) || 0,
      status: 'Diajukan'
    };

    const updated = [newItem, ...rawatList];
    saveToDb(updated);
    setIsAddModalOpen(false);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'TAMBAH',
      target: `Tiket Perawatan: ${newItem.noTiket}`,
      rincian: `Pengajuan perbaikan barang ${newItem.namaBarang} (${newItem.kodeBarang}) tingkat kerusakan ${newItem.tingkatKerusakan}.`
    });

    setFormData({
      noTiket: `MNT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 900) + 100)}`,
      barangId: barangList[0]?.id || '',
      namaBarang: barangList[0]?.nama || '',
      kodeBarang: barangList[0]?.kode || '',
      lokasi: barangList[0]?.lokasi || 'Lab Komputer 1',
      tglLapor: new Date().toISOString().split('T')[0],
      pelapor: 'Staf Pengajar / Petugas Lab',
      deskripsiKerusakan: '',
      tingkatKerusakan: 'Sedang',
      tindakanPerbaikan: '',
      teknisiVendor: 'Teknisi Internal / Vendor Mitra',
      estimasiBiaya: 250000
    });
  };

  // Handle Update Status
  const handleConfirmUpdateStatus = () => {
    if (!updateModalItem) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updated = rawatList.map(item => item.id === updateModalItem.id ? {
      ...item,
      status: updateStatus,
      tglSelesai: updateStatus === 'Selesai' ? todayStr : item.tglSelesai,
      keteranganHasil: updateResult || item.keteranganHasil
    } : item);

    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EDIT',
      target: `Update Perawatan: ${updateModalItem.noTiket}`,
      rincian: `Status tiket perbaikan ${updateModalItem.namaBarang} diubah menjadi "${updateStatus}".`
    });

    setUpdateModalItem(null);
    setUpdateResult('');
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((r, idx) => ({
      No: idx + 1,
      'No Tiket': r.noTiket,
      'Kode Barang': r.kodeBarang,
      'Nama Barang': r.namaBarang,
      Lokasi: r.lokasi,
      'Tanggal Lapor': r.tglLapor,
      Pelapor: r.pelapor,
      'Deskripsi Kerusakan': r.deskripsiKerusakan,
      'Tingkat Kerusakan': r.tingkatKerusakan,
      'Tindakan Perbaikan': r.tindakanPerbaikan,
      'Teknisi / Vendor': r.teknisiVendor,
      'Estimasi Biaya (Rp)': r.estimasiBiaya,
      Status: r.status,
      'Tanggal Selesai': r.tglSelesai || '-',
      'Hasil Perbaikan': r.keteranganHasil || '-'
    }));

    exportToExcel(rows, `Data_Perawatan_Sarpras_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EKSPOR',
      target: 'Ekspor Excel Perawatan Sarpras',
      rincian: `Mengekspor ${filteredList.length} rekaman tiket perbaikan dan perawatan sarpras.`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Wrench className="text-rose-500" size={22} />
            Perawatan & Penanganan Kondisi Rusak Sarpras
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manajemen tiket servis AC, LCD proyektor, komputer lab, furnitur rusak, estimasi biaya teknisi, serta riwayat penghapusan aset (afkir).
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Lapor Kerusakan</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari no tiket, barang, teknisi, kerusakan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="">Semua Status Pengerjaan</option>
            <option value="Diajukan">Diajukan</option>
            <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
            <option value="Selesai">Selesai</option>
            <option value="Dihapuskan / Afkir">Dihapuskan / Afkir</option>
          </select>

          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="">Semua Tingkat Kerusakan</option>
            <option value="Ringan">Kerusakan Ringan</option>
            <option value="Sedang">Kerusakan Sedang</option>
            <option value="Berat">Kerusakan Berat</option>
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
                <th className="py-3.5 px-4">No Tiket / Tgl</th>
                <th className="py-3.5 px-4">Barang & Lokasi</th>
                <th className="py-3.5 px-4">Deskripsi Kerusakan</th>
                <th className="py-3.5 px-4 text-center">Tingkat</th>
                <th className="py-3.5 px-4">Teknisi & Biaya (Rp)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Wrench size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Tiket Perawatan</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/60 block whitespace-nowrap">
                        {item.noTiket}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Lapor: {item.tglLapor}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-rose-700 transition">
                        {item.namaBarang}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {item.kodeBarang} • {item.lokasi}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-800 font-medium line-clamp-2">
                        {item.deskripsiKerusakan}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Pelapor: {item.pelapor}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        item.tingkatKerusakan === 'Ringan'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.tingkatKerusakan === 'Sedang'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.tingkatKerusakan}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {item.teknisiVendor}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        Rp {(item.estimasiBiaya || 0).toLocaleString('id-ID')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        item.status === 'Selesai'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'Sedang Dikerjakan'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                          : item.status === 'Diajukan'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setUpdateModalItem(item);
                            setUpdateStatus(item.status);
                            setUpdateResult(item.keteranganHasil || '');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition flex items-center gap-1"
                          title="Perbarui Status Servis"
                        >
                          <Edit size={12} />
                          <span>Status</span>
                        </button>
                        <button
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                          title="Lihat Detail Tiket"
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

      {/* Modal Update Status Servis */}
      {updateModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Update Status Perbaikan</h3>
              <button onClick={() => setUpdateModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="font-black text-slate-900">{updateModalItem.namaBarang}</div>
              <div className="text-slate-500 font-mono">{updateModalItem.noTiket} • {updateModalItem.kodeBarang}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Status Baru:</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="Diajukan">Diajukan (Menunggu Konfirmasi)</option>
                  <option value="Sedang Dikerjakan">Sedang Dikerjakan (Dalam Proses Servis)</option>
                  <option value="Selesai">Selesai (Aset Siap Digunakan Kembali)</option>
                  <option value="Dihapuskan / Afkir">Dihapuskan / Afkir (Rusak Permanen)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Hasil Pengerjaan / Teknisi:</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan komponen yang diganti, hasil tes operasional..."
                  value={updateResult}
                  onChange={(e) => setUpdateResult(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setUpdateModalItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmUpdateStatus}
                className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200"
              >
                Simpan Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Tiket Lapor Kerusakan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Lapor Kerusakan & Servis Sarpras</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No Tiket Perawatan</label>
                  <input
                    type="text"
                    required
                    value={formData.noTiket}
                    onChange={(e) => setFormData({ ...formData, noTiket: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Barang Rusak *</label>
                  <select
                    value={formData.barangId}
                    onChange={(e) => {
                      const sel = barangList.find(b => b.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        barangId: e.target.value,
                        namaBarang: sel ? sel.nama : '',
                        kodeBarang: sel ? sel.kode : '',
                        lokasi: sel ? sel.lokasi : ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {barangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama} ({b.kode})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pelapor / Guru</label>
                  <input
                    type="text"
                    value={formData.pelapor}
                    onChange={(e) => setFormData({ ...formData, pelapor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat Kerusakan</label>
                  <select
                    value={formData.tingkatKerusakan}
                    onChange={(e) => setFormData({ ...formData, tingkatKerusakan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Ringan">Ringan (Masih bisa digunakan sementara)</option>
                    <option value="Sedang">Sedang (Perlu servis teknisi)</option>
                    <option value="Berat">Berat (Mati total / Rusak parah)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rincian Gejala & Kerusakan *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Layar proyektor bergaris dan berkedip, tidak muncul output HDMI..."
                  value={formData.deskripsiKerusakan}
                  onChange={(e) => setFormData({ ...formData, deskripsiKerusakan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teknisi / Vendor Servis</label>
                  <input
                    type="text"
                    placeholder="Nama teknisi / CV vendor rekanan"
                    value={formData.teknisiVendor}
                    onChange={(e) => setFormData({ ...formData, teknisiVendor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    value={formData.estimasiBiaya}
                    onChange={(e) => setFormData({ ...formData, estimasiBiaya: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
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
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-200"
                >
                  Ajukan Tiket Perbaikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Tiket */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Detail Perawatan Sarpras</h3>
                <span className="font-mono text-xs text-rose-700 font-bold">{detailItem.noTiket}</span>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Nama Barang</span>
                <span className="font-black text-slate-800">{detailItem.namaBarang}</span>
                <span className="text-[10px] text-slate-500 font-mono">{detailItem.kodeBarang}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Lokasi & Pelapor</span>
                <span className="font-bold text-slate-800">{detailItem.lokasi}</span>
                <span className="text-[10px] text-slate-500">Oleh: {detailItem.pelapor}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Tingkat & Status</span>
                <span className="font-black text-rose-600">{detailItem.tingkatKerusakan}</span>
                <span className="text-[10px] text-slate-600 block">{detailItem.status}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Biaya & Teknisi</span>
                <span className="font-black text-emerald-600">Rp {(detailItem.estimasiBiaya || 0).toLocaleString('id-ID')}</span>
                <span className="text-[10px] text-slate-500 block">{detailItem.teknisiVendor}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Deskripsi Kerusakan</span>
                <p className="text-slate-700 mt-0.5">{detailItem.deskripsiKerusakan}</p>
              </div>
              {detailItem.keteranganHasil && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Hasil Perbaikan</span>
                  <p className="text-emerald-700 font-medium mt-0.5">{detailItem.keteranganHasil}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
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
