import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { ArsipDigital } from '../../data/dokumenSeed';
import { 
  FolderArchive, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Download, 
  FileText, CheckCircle2, AlertCircle, FileSpreadsheet, ExternalLink, Calendar,
  ShieldCheck, User, Tag, Lock, Globe, FileCode, Check, Printer, Award
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { triggerPrint } from '../../lib/utils';

export default function ArsipDigitalTab() {
  const { settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterAkses, setFilterAkses] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<ArsipDigital | null>(null);
  const [editItem, setEditItem] = useState<ArsipDigital | null>(null);
  const [deleteItem, setDeleteItem] = useState<ArsipDigital | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ArsipDigital>>({
    nomorDokumen: '',
    judulDokumen: '',
    kategori: 'SK & Regulasi',
    tahunAjaran: '2026/2027',
    tahunTerbit: '2026',
    formatFile: 'PDF',
    ukuranFile: '2.5 MB',
    fileUrl: 'https://drive.google.com/file/d/arsip-dokumen-sekolah',
    pengunggah: 'Staf Tata Usaha',
    tingkatAkses: 'Internal Guru',
    deskripsi: '',
    tags: ['Dokumen Resmi', 'Sekolah'],
  });

  const [tagInput, setTagInput] = useState('');

  const arsipList = useMemo(() => {
    return db.get<ArsipDigital>('arsip') || [];
  }, []);

  const [dataList, setDataList] = useState<ArsipDigital[]>(arsipList);

  const saveToDb = (newList: ArsipDigital[]) => {
    setDataList(newList);
    db.set('arsip', newList);
  };

  // Filtered
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        item.judulDokumen.toLowerCase().includes(q) ||
        item.nomorDokumen.toLowerCase().includes(q) ||
        item.pengunggah.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
      
      const matchKategori = !filterKategori || item.kategori === filterKategori;
      const matchAkses = !filterAkses || item.tingkatAkses === filterAkses;
      const matchTahun = !filterTahun || item.tahunTerbit === filterTahun || item.tahunAjaran === filterTahun;

      return matchSearch && matchKategori && matchAkses && matchTahun;
    });
  }, [dataList, searchTerm, filterKategori, filterAkses, filterTahun]);

  // Unique Tahun for filter
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    dataList.forEach(a => {
      if (a.tahunTerbit) set.add(a.tahunTerbit);
    });
    return Array.from(set).sort().reverse();
  }, [dataList]);

  // Handle Add Form Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judulDokumen || !formData.nomorDokumen) {
      alert('Mohon isi Judul Dokumen dan Nomor Dokumen!');
      return;
    }

    const newItem: ArsipDigital = {
      id: `ARS-${Date.now()}`,
      nomorDokumen: formData.nomorDokumen || `DOC/${Date.now()}`,
      judulDokumen: formData.judulDokumen || '',
      kategori: formData.kategori as any || 'SK & Regulasi',
      tahunAjaran: formData.tahunAjaran || '2026/2027',
      tahunTerbit: formData.tahunTerbit || '2026',
      formatFile: formData.formatFile as any || 'PDF',
      ukuranFile: formData.ukuranFile || '2.0 MB',
      fileUrl: formData.fileUrl || 'https://drive.google.com/file/d/arsip-dokumen',
      pengunggah: formData.pengunggah || 'Staf Tata Usaha',
      tingkatAkses: formData.tingkatAkses as any || 'Internal Guru',
      deskripsi: formData.deskripsi || '',
      tags: formData.tags && formData.tags.length > 0 ? formData.tags : ['Dokumen'],
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...dataList];
    saveToDb(updated);
    setIsAddModalOpen(false);
    setFormData({
      nomorDokumen: '',
      judulDokumen: '',
      kategori: 'SK & Regulasi',
      tahunAjaran: '2026/2027',
      tahunTerbit: '2026',
      formatFile: 'PDF',
      ukuranFile: '2.5 MB',
      fileUrl: 'https://drive.google.com/file/d/arsip-dokumen-sekolah',
      pengunggah: 'Staf Tata Usaha',
      tingkatAkses: 'Internal Guru',
      deskripsi: '',
      tags: ['Dokumen Resmi'],
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const updated = dataList.map(item => item.id === editItem.id ? editItem : item);
    saveToDb(updated);
    setEditItem(null);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteItem) return;
    const updated = dataList.filter(item => item.id !== deleteItem.id);
    saveToDb(updated);
    setDeleteItem(null);
  };

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      'No. Dokumen': item.nomorDokumen,
      'Judul Dokumen': item.judulDokumen,
      Kategori: item.kategori,
      'Tahun Ajaran': item.tahunAjaran,
      'Tahun Terbit': item.tahunTerbit,
      Format: item.formatFile,
      'Ukuran File': item.ukuranFile,
      'Tingkat Akses': item.tingkatAkses,
      Pengunggah: item.pengunggah,
      Deskripsi: item.deskripsi,
      'Link Berkas': item.fileUrl,
      'Tanggal Upload': item.createdAt.split('T')[0]
    }));
    exportToExcel(rows, `Arsip_Digital_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FolderArchive className="text-sky-600" size={22} />
            Repositori Arsip Digital & Dokumen Resmi
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Penyimpanan terpusat SK Pembagian Tugas, Dokumen Akreditasi, KOSP Kurikulum, RKAS BOS, dan SOP Satuan Pendidikan.
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Upload Arsip Baru</span>
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
              placeholder="Cari judul, no dokumen, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
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
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="">Semua Kategori Dokumen</option>
            <option value="SK & Regulasi">SK & Regulasi</option>
            <option value="Akreditasi">Akreditasi</option>
            <option value="Kurikulum">Kurikulum</option>
            <option value="Laporan Keuangan">Laporan Keuangan</option>
            <option value="Administrasi GTK">Administrasi GTK</option>
            <option value="Sarpras & Aset">Sarpras & Aset</option>
            <option value="Kesiswaan">Kesiswaan</option>
          </select>

          {/* Tingkat Akses Filter */}
          <select
            value={filterAkses}
            onChange={(e) => setFilterAkses(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="">Semua Tingkat Akses</option>
            <option value="Publik">Publik</option>
            <option value="Internal Guru">Internal Guru</option>
            <option value="Pimpinan & TU">Pimpinan & TU</option>
            <option value="Rahasia">Rahasia</option>
          </select>

          {/* Tahun Filter */}
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="">Semua Tahun Terbit</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>Tahun {yr}</option>
            ))}
          </select>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari total <strong>{dataList.length}</strong> berkas arsip digital</span>
          {(searchTerm || filterKategori || filterAkses || filterTahun) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKategori('');
                setFilterAkses('');
                setFilterTahun('');
              }}
              className="text-sky-600 hover:text-sky-700 font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">No. Dokumen / SK</th>
                <th className="py-3.5 px-4">Judul Dokumen & Deskripsi</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Tahun / T.A</th>
                <th className="py-3.5 px-4 text-center">Format & Ukuran</th>
                <th className="py-3.5 px-4 text-center">Akses</th>
                <th className="py-3.5 px-4">Pengunggah</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <FolderArchive size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Dokumen Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau filter kategori.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* No Dokumen */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/60 block truncate max-w-[180px]">
                        {item.nomorDokumen}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{item.id}</span>
                    </td>

                    {/* Judul & Deskripsi */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-black text-slate-900 group-hover:text-sky-700 transition">
                        {item.judulDokumen}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {item.deskripsi || 'Tidak ada deskripsi tambahan.'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${
                        item.kategori === 'SK & Regulasi' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        item.kategori === 'Akreditasi' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.kategori === 'Kurikulum' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.kategori === 'Laporan Keuangan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>

                    {/* Tahun / T.A */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      <div>{item.tahunTerbit}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{item.tahunAjaran}</span>
                    </td>

                    {/* Format & Ukuran */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {item.formatFile}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.ukuranFile}</span>
                    </td>

                    {/* Tingkat Akses */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.tingkatAkses === 'Publik' ? 'bg-emerald-50 text-emerald-700' :
                        item.tingkatAkses === 'Internal Guru' ? 'bg-sky-50 text-sky-700' :
                        item.tingkatAkses === 'Pimpinan & TU' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {item.tingkatAkses}
                      </span>
                    </td>

                    {/* Pengunggah */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 truncate max-w-[130px]">{item.pengunggah}</div>
                      <div className="text-[10px] text-slate-400">{item.createdAt.split('T')[0]}</div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewDetail(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition"
                          title="Lihat Detail & Preview"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition"
                          title="Edit Dokumen"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition"
                          title="Hapus Dokumen"
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

      {/* Modal Tambah Arsip */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <FolderArchive size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Upload Arsip Digital Baru</h3>
                  <p className="text-xs text-slate-400">Masukkan metadata berkas resmi sekolah</p>
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
                  <label className="font-bold text-slate-700 block mb-1">Nomor Dokumen / SK *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 421.3/012/SK/VII/2026"
                    value={formData.nomorDokumen}
                    onChange={(e) => setFormData({ ...formData, nomorDokumen: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Dokumen *</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="SK & Regulasi">SK & Regulasi</option>
                    <option value="Akreditasi">Akreditasi</option>
                    <option value="Kurikulum">Kurikulum</option>
                    <option value="Laporan Keuangan">Laporan Keuangan</option>
                    <option value="Administrasi GTK">Administrasi GTK</option>
                    <option value="Sarpras & Aset">Sarpras & Aset</option>
                    <option value="Kesiswaan">Kesiswaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Dokumen Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SK Pembagian Tugas Mengajar Semester Ganjil TP 2026/2027"
                  value={formData.judulDokumen}
                  onChange={(e) => setFormData({ ...formData, judulDokumen: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tahun Terbit</label>
                  <input
                    type="text"
                    value={formData.tahunTerbit}
                    onChange={(e) => setFormData({ ...formData, tahunTerbit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={formData.tahunAjaran}
                    onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat Akses</label>
                  <select
                    value={formData.tingkatAkses}
                    onChange={(e) => setFormData({ ...formData, tingkatAkses: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="Publik">Publik</option>
                    <option value="Internal Guru">Internal Guru</option>
                    <option value="Pimpinan & TU">Pimpinan & TU</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Format Berkas</label>
                  <select
                    value={formData.formatFile}
                    onChange={(e) => setFormData({ ...formData, formatFile: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="PDF">PDF (Portable Document)</option>
                    <option value="DOCX">DOCX (Word Document)</option>
                    <option value="XLSX">XLSX (Excel Spreadsheet)</option>
                    <option value="SCAN / JPG">SCAN / JPG (Gambar Dokumen)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Petugas Pengunggah</label>
                  <input
                    type="text"
                    value={formData.pengunggah}
                    onChange={(e) => setFormData({ ...formData, pengunggah: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Berkas / Google Drive Link</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Catatan Dokumen</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat mengenai isi dokumen atau landasan hukum..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-md shadow-sky-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Arsip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail / Preview */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Detail Arsip Digital</h3>
                  <span className="font-mono text-xs text-sky-700">{viewDetail.nomorDokumen}</span>
                </div>
              </div>
              <button 
                onClick={() => setViewDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs printable-container printable-document print:p-0 print:border-none">
              {/* Kop Sekolah untuk Print */}
              <div className="hidden print:block border-b-4 border-double border-slate-900 pb-3 text-center space-y-1 mb-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  LEMBAR IDENTITAS ARSIP DIGITAL ELEKTRONIK
                </h4>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SATUAN PENDIDIKAN FORMAL'}
                </h3>
                <p className="text-[9px] text-slate-600">
                  {settings.alamat || 'Jl. Pendidikan No. 128'} • NPSN: {settings.npsn || '20108976'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 print:bg-white print:border-slate-300">
                <div className="font-black text-slate-900 text-sm">{viewDetail.judulDokumen}</div>
                <p className="text-slate-600">{viewDetail.deskripsi || 'Tidak ada deskripsi.'}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {viewDetail.tags.map((t, i) => (
                    <span key={i} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Kategori</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.kategori}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tingkat Akses</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.tingkatAkses}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Format & Ukuran</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.formatFile} • {viewDetail.ukuranFile}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tahun / T.A</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.tahunTerbit} ({viewDetail.tahunAjaran})</span>
                </div>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center justify-between print:hidden">
                <div className="space-y-0.5">
                  <div className="font-bold text-sky-900">Berkas Digital Terlampir</div>
                  <div className="text-[11px] text-sky-700 truncate max-w-xs">{viewDetail.fileUrl}</div>
                </div>
                <a
                  href={viewDetail.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shrink-0"
                >
                  <ExternalLink size={13} />
                  <span>Buka Berkas</span>
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 no-print">
              <button
                onClick={() => setViewDetail(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Tutup
              </button>
              <button
                onClick={triggerPrint}
                className="px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-md shadow-sky-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak Lembar Arsip</span>
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
              <h3 className="text-base font-black text-slate-900">Edit Metadata Arsip Digital</h3>
              <button 
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Dokumen / SK</label>
                  <input
                    type="text"
                    required
                    value={editItem.nomorDokumen}
                    onChange={(e) => setEditItem({ ...editItem, nomorDokumen: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={editItem.kategori}
                    onChange={(e) => setEditItem({ ...editItem, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="SK & Regulasi">SK & Regulasi</option>
                    <option value="Akreditasi">Akreditasi</option>
                    <option value="Kurikulum">Kurikulum</option>
                    <option value="Laporan Keuangan">Laporan Keuangan</option>
                    <option value="Administrasi GTK">Administrasi GTK</option>
                    <option value="Sarpras & Aset">Sarpras & Aset</option>
                    <option value="Kesiswaan">Kesiswaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Dokumen</label>
                <input
                  type="text"
                  required
                  value={editItem.judulDokumen}
                  onChange={(e) => setEditItem({ ...editItem, judulDokumen: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editItem.deskripsi}
                  onChange={(e) => setEditItem({ ...editItem, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Link File</label>
                <input
                  type="text"
                  value={editItem.fileUrl}
                  onChange={(e) => setEditItem({ ...editItem, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-md shadow-sky-200"
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
              <h3 className="text-base font-black text-slate-900">Hapus Arsip Digital?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus arsip <strong>"{deleteItem.judulDokumen}"</strong>? Tindakan ini tidak dapat dibatalkan.
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
