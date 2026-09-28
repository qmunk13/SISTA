import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { RuanganAset, BarangSarpras } from '../../data/sarprasSeed';
import { 
  Building2, Search, Plus, X, Eye, Edit, Trash2, Save, Download, 
  MapPin, Users, Package, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

export default function DenahRuanganAsetTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGedung, setFilterGedung] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<RuanganAset | null>(null);
  const [editItem, setEditItem] = useState<RuanganAset | null>(null);
  const [deleteItem, setDeleteItem] = useState<RuanganAset | null>(null);

  const [ruanganList, setRuanganList] = useState<RuanganAset[]>(() => {
    return db.get<RuanganAset>('ruangan_aset') || [];
  });

  const barangList = useMemo(() => db.get<BarangSarpras>('barang') || [], []);

  const saveToDb = (newList: RuanganAset[]) => {
    setRuanganList(newList);
    db.set('ruangan_aset', newList);
  };

  // Form State
  const [formData, setFormData] = useState<Partial<RuanganAset>>({
    kodeRuangan: `RNG-${String(Math.floor(Math.random() * 900) + 100)}`,
    namaRuangan: '',
    gedung: 'Gedung A',
    lantai: 1,
    luasM2: 64,
    kapasitas: 32,
    penanggungJawab: 'Staf Sarpras',
    kondisiRuangan: 'Baik',
    keterangan: ''
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return ruanganList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.namaRuangan.toLowerCase().includes(q) ||
        item.kodeRuangan.toLowerCase().includes(q) ||
        item.penanggungJawab.toLowerCase().includes(q) ||
        item.gedung.toLowerCase().includes(q);

      const matchGedung = !filterGedung || item.gedung === filterGedung;
      const matchKondisi = !filterKondisi || item.kondisiRuangan === filterKondisi;

      return matchSearch && matchGedung && matchKondisi;
    });
  }, [ruanganList, searchTerm, filterGedung, filterKondisi]);

  // Distinct Gedung
  const distinctGedung = useMemo(() => {
    const set = new Set<string>();
    ruanganList.forEach(r => {
      if (r.gedung) set.add(r.gedung);
    });
    return Array.from(set);
  }, [ruanganList]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaRuangan || !formData.kodeRuangan) {
      alert('Mohon isi Kode dan Nama Ruangan!');
      return;
    }

    const newItem: RuanganAset = {
      id: `RNG-${Date.now()}`,
      kodeRuangan: formData.kodeRuangan || `RNG-${Date.now()}`,
      namaRuangan: formData.namaRuangan || '',
      gedung: formData.gedung || 'Gedung Utama',
      lantai: Number(formData.lantai) || 1,
      luasM2: Number(formData.luasM2) || 64,
      kapasitas: Number(formData.kapasitas) || 30,
      penanggungJawab: formData.penanggungJawab || 'Petugas Sarpras',
      kondisiRuangan: formData.kondisiRuangan as any || 'Baik',
      totalItemAset: 0,
      keterangan: formData.keterangan || ''
    };

    const updated = [newItem, ...ruanganList];
    saveToDb(updated);
    setIsAddModalOpen(false);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'TAMBAH',
      target: `Ruangan Aset: ${newItem.namaRuangan} (${newItem.kodeRuangan})`,
      rincian: `Menambahkan ruangan baru: ${newItem.namaRuangan} di ${newItem.gedung} Lt.${newItem.lantai}.`
    });

    setFormData({
      kodeRuangan: `RNG-${String(Math.floor(Math.random() * 900) + 100)}`,
      namaRuangan: '',
      gedung: 'Gedung A',
      lantai: 1,
      luasM2: 64,
      kapasitas: 32,
      penanggungJawab: 'Staf Sarpras',
      kondisiRuangan: 'Baik',
      keterangan: ''
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const updated = ruanganList.map(item => item.id === editItem.id ? { 
      ...editItem,
      lantai: Number(editItem.lantai) || 1,
      luasM2: Number(editItem.luasM2) || 64,
      kapasitas: Number(editItem.kapasitas) || 30,
    } : item);

    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EDIT',
      target: `Ruangan Aset: ${editItem.namaRuangan} (${editItem.kodeRuangan})`,
      rincian: `Memperbarui profil ruangan ${editItem.namaRuangan}, PIC ${editItem.penanggungJawab}.`
    });

    setEditItem(null);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteItem) return;
    const updated = ruanganList.filter(item => item.id !== deleteItem.id);
    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'HAPUS',
      target: `Ruangan Aset: ${deleteItem.namaRuangan} (${deleteItem.kodeRuangan})`,
      rincian: `Menghapus ruangan ${deleteItem.namaRuangan} dari data denah sarpras.`
    });

    setDeleteItem(null);
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((r, idx) => ({
      No: idx + 1,
      'Kode Ruangan': r.kodeRuangan,
      'Nama Ruangan': r.namaRuangan,
      Gedung: r.gedung,
      Lantai: r.lantai,
      'Luas (m²)': r.luasM2,
      'Kapasitas (Orang)': r.kapasitas,
      'Penanggung Jawab': r.penanggungJawab,
      'Kondisi Fisik': r.kondisiRuangan,
      'Total Aset': r.totalItemAset,
      Keterangan: r.keterangan
    }));

    exportToExcel(rows, `Data_Ruangan_Sarpras_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EKSPOR',
      target: 'Ekspor Excel Denah Ruangan',
      rincian: `Mengekspor ${filteredList.length} data ruangan dan denah sarpras ke Excel.`
    });
  };

  // Items in selected room
  const itemsInRoom = useMemo(() => {
    if (!detailItem) return [];
    return barangList.filter(b => b.lokasi && (b.lokasi.includes(detailItem.namaRuangan) || b.lokasi.includes(detailItem.kodeRuangan)));
  }, [detailItem, barangList]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Building2 className="text-blue-500" size={22} />
            Denah & Manajemen Ruangan Aset
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar ruang kelas, laboratorium, perpustakaan, kantor, aula, kapasitas pemakaian, serta sebaran barang inventaris di dalamnya.
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Tambah Ruangan</span>
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
              placeholder="Cari kode ruangan, nama ruang, PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={filterGedung}
            onChange={(e) => setFilterGedung(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Gedung</option>
            {distinctGedung.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Kondisi Ruangan</option>
            <option value="Sangat Baik">Sangat Baik</option>
            <option value="Baik">Baik</option>
            <option value="Perlu Renovasi">Perlu Renovasi</option>
          </select>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Kode Ruangan</th>
                <th className="py-3.5 px-4">Nama Ruangan & Lokasi</th>
                <th className="py-3.5 px-4 text-center">Lantai / Gedung</th>
                <th className="py-3.5 px-4 text-center">Luas & Kapasitas</th>
                <th className="py-3.5 px-4">Penanggung Jawab</th>
                <th className="py-3.5 px-4 text-center">Kondisi Ruangan</th>
                <th className="py-3.5 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Ruangan Ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 block whitespace-nowrap">
                        {item.kodeRuangan}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-blue-700 transition">
                        {item.namaRuangan}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {item.keterangan || 'Fasilitas KBM & Operasional'}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800 block">
                        Lantai {item.lantai}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.gedung}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900 block">
                        {item.luasM2} m²
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Kapasitas: {item.kapasitas} orang
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.penanggungJawab}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        item.kondisiRuangan === 'Sangat Baik'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.kondisiRuangan === 'Baik'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.kondisiRuangan}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
                          title="Lihat Detail & Aset di Ruangan"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition"
                          title="Edit Ruangan"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                          title="Hapus Ruangan"
                        >
                          <Trash2 size={14} />
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

      {/* Modal Detail Ruangan & Barang di Dalamnya */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{detailItem.namaRuangan}</h3>
                  <span className="font-mono text-xs text-blue-700 font-bold">{detailItem.kodeRuangan}</span>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Gedung & Lantai</span>
                <span className="font-black text-slate-800">{detailItem.gedung} - Lt.{detailItem.lantai}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Luas & Kapasitas</span>
                <span className="font-black text-slate-800">{detailItem.luasM2} m² ({detailItem.kapasitas} orang)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Kondisi Ruang</span>
                <span className="font-black text-emerald-600">{detailItem.kondisiRuangan}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Penanggung Jawab</span>
                <span className="font-black text-slate-800">{detailItem.penanggungJawab}</span>
              </div>
            </div>

            {/* List Barang di Ruangan Ini */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Package size={14} className="text-orange-500" />
                Aset Sarpras di Ruangan Ini:
              </span>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 divide-y divide-slate-100 text-xs">
                {itemsInRoom.length === 0 ? (
                  <p className="p-3 text-center text-slate-400">Tidak ada aset terdaftar spesifik pada nama ruangan ini.</p>
                ) : (
                  itemsInRoom.map((b) => (
                    <div key={b.id} className="py-2 px-2 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{b.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400">{b.kode} • {b.kategori}</div>
                      </div>
                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 text-[11px]">
                        {b.jumlah} {b.satuan}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
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

      {/* Modal Tambah Ruangan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Tambah Ruangan Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Ruangan *</label>
                  <input
                    type="text"
                    required
                    value={formData.kodeRuangan}
                    onChange={(e) => setFormData({ ...formData, kodeRuangan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Gedung</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung A"
                    value={formData.gedung}
                    onChange={(e) => setFormData({ ...formData, gedung: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Ruangan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Laboratorium Multimedia & Podcast"
                  value={formData.namaRuangan}
                  onChange={(e) => setFormData({ ...formData, namaRuangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lantai</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.lantai}
                    onChange={(e) => setFormData({ ...formData, lantai: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Luas (m²)</label>
                  <input
                    type="number"
                    value={formData.luasM2}
                    onChange={(e) => setFormData({ ...formData, luasM2: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={formData.kapasitas}
                    onChange={(e) => setFormData({ ...formData, kapasitas: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab (PIC)</label>
                  <input
                    type="text"
                    value={formData.penanggungJawab}
                    onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kondisi Ruang</label>
                  <select
                    value={formData.kondisiRuangan}
                    onChange={(e) => setFormData({ ...formData, kondisiRuangan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Perlu Renovasi">Perlu Renovasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fasilitas & Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Kelistrikan, AC, jaringan internet..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
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
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                >
                  Simpan Ruangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Ruangan</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Ruangan</label>
                  <input
                    type="text"
                    required
                    value={editItem.kodeRuangan}
                    onChange={(e) => setEditItem({ ...editItem, kodeRuangan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Gedung</label>
                  <input
                    type="text"
                    value={editItem.gedung}
                    onChange={(e) => setEditItem({ ...editItem, gedung: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Ruangan</label>
                <input
                  type="text"
                  required
                  value={editItem.namaRuangan}
                  onChange={(e) => setEditItem({ ...editItem, namaRuangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lantai</label>
                  <input
                    type="number"
                    min={1}
                    value={editItem.lantai}
                    onChange={(e) => setEditItem({ ...editItem, lantai: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Luas (m²)</label>
                  <input
                    type="number"
                    value={editItem.luasM2}
                    onChange={(e) => setEditItem({ ...editItem, luasM2: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={editItem.kapasitas}
                    onChange={(e) => setEditItem({ ...editItem, kapasitas: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Hapus Ruangan?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus ruangan <strong>"{deleteItem.namaRuangan}"</strong> ({deleteItem.kodeRuangan})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
