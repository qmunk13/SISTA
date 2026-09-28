import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { BarangSarpras, RuanganAset } from '../../data/sarprasSeed';
import { 
  Package, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Download, 
  QrCode, Printer, CheckCircle2, AlertTriangle, Building2, Tag, Layers, RefreshCw
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

export default function DaftarBarangSarprasTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('');
  const [filterKib, setFilterKib] = useState('');
  const [filterRuangan, setFilterRuangan] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<BarangSarpras | null>(null);
  const [editItem, setEditItem] = useState<BarangSarpras | null>(null);
  const [deleteItem, setDeleteItem] = useState<BarangSarpras | null>(null);
  const [qrModalItem, setQrModalItem] = useState<BarangSarpras | null>(null);

  const ruanganList = useMemo(() => db.get<RuanganAset>('ruangan_aset') || [], []);

  const [dataList, setDataList] = useState<BarangSarpras[]>(() => {
    return db.get<BarangSarpras>('barang') || [];
  });

  const saveToDb = (newList: BarangSarpras[]) => {
    setDataList(newList);
    db.set('barang', newList);
  };

  // Form State for Add
  const [formData, setFormData] = useState<Partial<BarangSarpras>>({
    kode: `AST-${String(Math.floor(Math.random() * 900) + 100)}`,
    nama: '',
    kategori: 'Elektronik & IT',
    klasifikasiKib: 'KIB B (Peralatan & Mesin)',
    jumlah: 1,
    satuan: 'Unit',
    lokasi: ruanganList[0]?.namaRuangan || 'Ruang Kelas X-A',
    kondisi: 'Baik',
    sumberDana: 'Dana BOS',
    tahunPerolehan: '2026',
    hargaPerolehan: 0,
    penanggungJawab: '',
    spesifikasi: '',
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.nama.toLowerCase().includes(q) ||
        item.kode.toLowerCase().includes(q) ||
        (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
        (item.penanggungJawab && item.penanggungJawab.toLowerCase().includes(q)) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(q));

      const matchCat = !filterKategori || item.kategori === filterKategori;
      const matchKondisi = !filterKondisi || item.kondisi === filterKondisi;
      const matchKib = !filterKib || item.klasifikasiKib === filterKib;
      const matchRuang = !filterRuangan || item.lokasi === filterRuangan;

      return matchSearch && matchCat && matchKondisi && matchKib && matchRuang;
    });
  }, [dataList, searchTerm, filterKategori, filterKondisi, filterKib, filterRuangan]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.kode) {
      alert('Mohon isi Kode dan Nama Barang!');
      return;
    }

    const newItem: BarangSarpras = {
      id: `AST-${Date.now()}`,
      kode: formData.kode || `AST-${Date.now()}`,
      nama: formData.nama || '',
      kategori: formData.kategori as any || 'Elektronik & IT',
      klasifikasiKib: formData.klasifikasiKib as any || 'KIB B (Peralatan & Mesin)',
      jumlah: Number(formData.jumlah) || 1,
      satuan: formData.satuan as any || 'Unit',
      lokasi: formData.lokasi || 'Ruang Kelas',
      kondisi: formData.kondisi as any || 'Baik',
      sumberDana: formData.sumberDana as any || 'Dana BOS',
      tahunPerolehan: formData.tahunPerolehan || '2026',
      hargaPerolehan: Number(formData.hargaPerolehan) || 0,
      penanggungJawab: formData.penanggungJawab || 'Petugas Sarpras',
      spesifikasi: formData.spesifikasi || '',
      qrCode: `QR-${formData.kode || Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newItem, ...dataList];
    saveToDb(updated);
    setIsAddModalOpen(false);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'TAMBAH',
      target: `Barang Sarpras: ${newItem.nama} (${newItem.kode})`,
      rincian: `Menambahkan item sarpras baru: ${newItem.nama} sejumlah ${newItem.jumlah} ${newItem.satuan} di ${newItem.lokasi}.`
    });

    setFormData({
      kode: `AST-${String(Math.floor(Math.random() * 900) + 100)}`,
      nama: '',
      kategori: 'Elektronik & IT',
      klasifikasiKib: 'KIB B (Peralatan & Mesin)',
      jumlah: 1,
      satuan: 'Unit',
      lokasi: ruanganList[0]?.namaRuangan || 'Ruang Kelas X-A',
      kondisi: 'Baik',
      sumberDana: 'Dana BOS',
      tahunPerolehan: '2026',
      hargaPerolehan: 0,
      penanggungJawab: '',
      spesifikasi: '',
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const updated = dataList.map(item => item.id === editItem.id ? { 
      ...editItem, 
      jumlah: Number(editItem.jumlah) || 1,
      hargaPerolehan: Number(editItem.hargaPerolehan) || 0,
      updatedAt: new Date().toISOString().split('T')[0] 
    } : item);
    
    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EDIT',
      target: `Barang Sarpras: ${editItem.nama} (${editItem.kode})`,
      rincian: `Memperbarui data sarpras: ${editItem.nama}, lokasi ${editItem.lokasi}, kondisi ${editItem.kondisi}.`
    });

    setEditItem(null);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteItem) return;
    const updated = dataList.filter(item => item.id !== deleteItem.id);
    saveToDb(updated);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'HAPUS',
      target: `Barang Sarpras: ${deleteItem.nama} (${deleteItem.kode})`,
      rincian: `Menghapus item sarpras ${deleteItem.nama} dari basis data inventaris sekolah.`
    });

    setDeleteItem(null);
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      'Kode Aset': item.kode,
      'Nama Barang': item.nama,
      Kategori: item.kategori,
      'Klasifikasi KIB': item.klasifikasiKib,
      'Jumlah Unit': item.jumlah,
      Satuan: item.satuan,
      'Lokasi Penempatan': item.lokasi,
      'Kondisi Fisik': item.kondisi,
      'Sumber Dana': item.sumberDana,
      'Tahun Perolehan': item.tahunPerolehan,
      'Harga Perolehan (Rp)': item.hargaPerolehan,
      'Total Nilai (Rp)': (item.hargaPerolehan || 0) * (item.jumlah || 1),
      'Penanggung Jawab': item.penanggungJawab,
      Spesifikasi: item.spesifikasi || '-'
    }));

    exportToExcel(rows, `Daftar_Inventaris_Sarpras_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Sarpras & Aset',
      aksi: 'EKSPOR',
      target: 'Ekspor Excel Inventaris Sarpras',
      rincian: `Mengekspor ${filteredList.length} data barang sarpras ke format Excel.`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package className="text-orange-500" size={22} />
            Daftar Barang & Inventaris Sarpras
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Buku induk aset, katalog barang KIB A s/d F, kode identitas barcode/QR, dan pemantauan kondisi.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
            title="Export Excel"
          >
            <Download size={15} />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Tambah Barang Aset</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari kode aset, nama barang, PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Kategori Filter */}
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="">Semua Kategori</option>
            <option value="Elektronik & IT">Elektronik & IT</option>
            <option value="Mebel & Perabot">Mebel & Perabot</option>
            <option value="Laboratorium">Laboratorium</option>
            <option value="Olahraga & Seni">Olahraga & Seni</option>
            <option value="Perpustakaan">Perpustakaan</option>
            <option value="Kendaraan & Logistik">Kendaraan & Logistik</option>
            <option value="Peralatan Umum">Peralatan Umum</option>
          </select>

          {/* KIB Filter */}
          <select
            value={filterKib}
            onChange={(e) => setFilterKib(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="">Semua KIB (A s/d F)</option>
            <option value="KIB A (Tanah)">KIB A (Tanah)</option>
            <option value="KIB B (Peralatan & Mesin)">KIB B (Peralatan & Mesin)</option>
            <option value="KIB C (Gedung & Bangunan)">KIB C (Gedung & Bangunan)</option>
            <option value="KIB D (Jalan/Jaringan)">KIB D (Jalan/Jaringan)</option>
            <option value="KIB E (Aset Tetap Lainnya)">KIB E (Aset Tetap Lainnya)</option>
            <option value="KIB F (Konstruksi)">KIB F (Konstruksi)</option>
          </select>

          {/* Kondisi Filter */}
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            <option value="">Semua Kondisi Fisik</option>
            <option value="Baik">Kondisi Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari total <strong>{dataList.length}</strong> aset barang</span>
          {(searchTerm || filterKategori || filterKondisi || filterKib || filterRuangan) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKategori('');
                setFilterKondisi('');
                setFilterKib('');
                setFilterRuangan('');
              }}
              className="text-orange-600 hover:text-orange-700 font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Kode Aset</th>
                <th className="py-3.5 px-4">Nama Barang & Spesifikasi</th>
                <th className="py-3.5 px-4">Kategori & KIB</th>
                <th className="py-3.5 px-4 text-center">Qty / Satuan</th>
                <th className="py-3.5 px-4">Lokasi Ruang</th>
                <th className="py-3.5 px-4 text-right">Nilai Satuan (Rp)</th>
                <th className="py-3.5 px-4 text-center">Kondisi</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Barang Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba ubah kriteria pencarian atau tambahkan aset baru.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Kode Aset */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/60 block whitespace-nowrap">
                        {item.kode}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.tahunPerolehan} • {item.sumberDana}</span>
                    </td>

                    {/* Nama & Spesifikasi */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-black text-slate-900 group-hover:text-orange-700 transition">
                        {item.nama}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {item.spesifikasi || 'Spesifikasi standar operasional sekolah.'}
                      </p>
                    </td>

                    {/* Kategori & KIB */}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 block w-fit whitespace-nowrap">
                        {item.kategori}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {item.klasifikasiKib}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {item.jumlah} {item.satuan}
                      </span>
                    </td>

                    {/* Lokasi */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400" />
                        <span className="truncate max-w-[140px]">{item.lokasi}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                        PIC: {item.penanggungJawab}
                      </div>
                    </td>

                    {/* Nilai */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900">
                        Rp {(item.hargaPerolehan || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tot: Rp {((item.hargaPerolehan || 0) * (item.jumlah || 1)).toLocaleString('id-ID')}
                      </div>
                    </td>

                    {/* Kondisi */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        item.kondisi === 'Baik' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : item.kondisi === 'Rusak Ringan'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.kondisi}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setQrModalItem(item)}
                          className="p-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition"
                          title="Cetak Label Barcode / QR"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                          title="Detail Aset"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition"
                          title="Edit Aset"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                          title="Hapus Aset"
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

      {/* Modal Tambah Barang */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Tambah Barang Sarpras Baru</h3>
                  <p className="text-xs text-slate-400">Registrasi aset inventaris sekolah</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Aset *</label>
                  <input
                    type="text"
                    required
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Barang</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="Elektronik & IT">Elektronik & IT</option>
                    <option value="Mebel & Perabot">Mebel & Perabot</option>
                    <option value="Laboratorium">Laboratorium</option>
                    <option value="Olahraga & Seni">Olahraga & Seni</option>
                    <option value="Perpustakaan">Perpustakaan</option>
                    <option value="Kendaraan & Logistik">Kendaraan & Logistik</option>
                    <option value="Peralatan Umum">Peralatan Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Barang Sarpras *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Proyektor Infocus IN114v 3800 Lumens"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Klasifikasi KIB</label>
                  <select
                    value={formData.klasifikasiKib}
                    onChange={(e) => setFormData({ ...formData, klasifikasiKib: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="KIB A (Tanah)">KIB A (Tanah)</option>
                    <option value="KIB B (Peralatan & Mesin)">KIB B (Peralatan & Mesin)</option>
                    <option value="KIB C (Gedung & Bangunan)">KIB C (Gedung & Bangunan)</option>
                    <option value="KIB D (Jalan/Jaringan)">KIB D (Jalan/Jaringan)</option>
                    <option value="KIB E (Aset Tetap Lainnya)">KIB E (Aset Tetap Lainnya)</option>
                    <option value="KIB F (Konstruksi)">KIB F (Konstruksi)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Unit *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                  <select
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="Unit">Unit</option>
                    <option value="Set">Set</option>
                    <option value="Buah">Buah</option>
                    <option value="Pak">Pak</option>
                    <option value="Ruang">Ruang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi / Ruangan Penempatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lab Komputer 1"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kondisi Fisik</label>
                  <select
                    value={formData.kondisi}
                    onChange={(e) => setFormData({ ...formData, kondisi: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="Baik">Baik (Siap Pakai)</option>
                    <option value="Rusak Ringan">Rusak Ringan (Perlu Servis)</option>
                    <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sumber Dana</label>
                  <select
                    value={formData.sumberDana}
                    onChange={(e) => setFormData({ ...formData, sumberDana: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="Dana BOS">Dana BOS</option>
                    <option value="Yayasan">Yayasan</option>
                    <option value="BOP Daerah">BOP Daerah</option>
                    <option value="Hibah / Donasi">Hibah / Donasi</option>
                    <option value="Swadana">Swadana</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tahun Perolehan</label>
                  <input
                    type="text"
                    value={formData.tahunPerolehan}
                    onChange={(e) => setFormData({ ...formData, tahunPerolehan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={formData.hargaPerolehan}
                    onChange={(e) => setFormData({ ...formData, hargaPerolehan: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  placeholder="Nama guru / staf penanggung jawab"
                  value={formData.penanggungJawab}
                  onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Spesifikasi / Keterangan Teknis</label>
                <textarea
                  rows={2}
                  placeholder="Spesifikasi merek, tipe, nomor seri, kelengkapan..."
                  value={formData.spesifikasi}
                  onChange={(e) => setFormData({ ...formData, spesifikasi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-md shadow-orange-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Aset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{detailItem.nama}</h3>
                  <span className="font-mono text-xs text-orange-700 font-bold">{detailItem.kode}</span>
                </div>
              </div>
              <button 
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Kategori</span>
                <span className="font-black text-slate-800">{detailItem.kategori}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Klasifikasi KIB</span>
                <span className="font-black text-slate-800">{detailItem.klasifikasiKib}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Jumlah Unit</span>
                <span className="font-black text-slate-800">{detailItem.jumlah} {detailItem.satuan}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Kondisi Fisik</span>
                <span className="font-black text-emerald-600">{detailItem.kondisi}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Lokasi Ruangan</span>
                <span className="font-black text-slate-800">{detailItem.lokasi}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Penanggung Jawab</span>
                <span className="font-black text-slate-800">{detailItem.penanggungJawab}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Harga Satuan</span>
                <span className="font-black text-slate-800">Rp {(detailItem.hargaPerolehan || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Sumber Dana / Tahun</span>
                <span className="font-black text-slate-800">{detailItem.sumberDana} ({detailItem.tahunPerolehan})</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Spesifikasi Lengkap</span>
              <p className="text-slate-700 mt-1 leading-relaxed">{detailItem.spesifikasi || 'Spesifikasi standar operasional sarpras.'}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setQrModalItem(detailItem);
                  setDetailItem(null);
                }}
                className="px-4 py-2 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition flex items-center gap-1.5"
              >
                <QrCode size={14} />
                <span>Label QR Code</span>
              </button>
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code Label Cetak */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">Label Inventaris & QR Code</h3>
              <button onClick={() => setQrModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* Label Box to Print */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                PROPERTI RESMI SEKOLAH
              </div>
              <div className="w-24 h-24 bg-white mx-auto rounded-xl border border-slate-300 flex flex-col items-center justify-center p-1 shadow-2xs">
                <QrCode size={64} className="text-slate-900" />
                <span className="font-mono text-[8px] font-black text-slate-600 mt-0.5">{qrModalItem.kode}</span>
              </div>
              <div className="font-black text-xs text-slate-900 leading-tight">
                {qrModalItem.nama}
              </div>
              <div className="text-[10px] text-slate-500">
                Lokasi: {qrModalItem.lokasi} • {qrModalItem.tahunPerolehan}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setQrModalItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                  logActivity({
                    modul: 'Sarpras & Aset',
                    aksi: 'CETAK',
                    target: `Label QR Code: ${qrModalItem.nama}`,
                    rincian: `Mencetak stiker label barcode / QR Code inventaris untuk aset ${qrModalItem.kode}.`
                  });
                }}
                className="px-4 py-2 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-md shadow-orange-200 flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Stiker</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Data Barang Sarpras</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Aset</label>
                  <input
                    type="text"
                    required
                    value={editItem.kode}
                    onChange={(e) => setEditItem({ ...editItem, kode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={editItem.kategori}
                    onChange={(e) => setEditItem({ ...editItem, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Elektronik & IT">Elektronik & IT</option>
                    <option value="Mebel & Perabot">Mebel & Perabot</option>
                    <option value="Laboratorium">Laboratorium</option>
                    <option value="Olahraga & Seni">Olahraga & Seni</option>
                    <option value="Perpustakaan">Perpustakaan</option>
                    <option value="Kendaraan & Logistik">Kendaraan & Logistik</option>
                    <option value="Peralatan Umum">Peralatan Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={editItem.nama}
                  onChange={(e) => setEditItem({ ...editItem, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    min={1}
                    value={editItem.jumlah}
                    onChange={(e) => setEditItem({ ...editItem, jumlah: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={editItem.lokasi}
                    onChange={(e) => setEditItem({ ...editItem, lokasi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kondisi</label>
                  <select
                    value={editItem.kondisi}
                    onChange={(e) => setEditItem({ ...editItem, kondisi: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Spesifikasi</label>
                <textarea
                  rows={2}
                  value={editItem.spesifikasi}
                  onChange={(e) => setEditItem({ ...editItem, spesifikasi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
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
                  className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-200"
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
              <h3 className="text-base font-black text-slate-900">Hapus Barang Aset?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>"{deleteItem.nama}"</strong> ({deleteItem.kode}) dari inventaris?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-200"
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
