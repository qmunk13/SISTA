import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { SuratMasuk } from '../../data/dokumenSeed';
import { 
  Mail, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Download, 
  Printer, CheckCircle2, Clock, AlertCircle, FileText, Send, UserCheck,
  Calendar, Building2, User, Sparkles, ArrowRight, Award
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { triggerPrint } from '../../lib/utils';

export default function SuratMasukTab() {
  const { settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSifat, setFilterSifat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPengirim, setFilterPengirim] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<SuratMasuk | null>(null);
  const [disposisiModalItem, setDisposisiModalItem] = useState<SuratMasuk | null>(null);
  const [printDisposisiItem, setPrintDisposisiItem] = useState<SuratMasuk | null>(null);
  const [editItem, setEditItem] = useState<SuratMasuk | null>(null);
  const [deleteItem, setDeleteItem] = useState<SuratMasuk | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<SuratMasuk>>({
    noAgenda: `AGD/${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 900) + 100)}/2026`,
    noSuratAsal: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    tanggalDiterima: new Date().toISOString().split('T')[0],
    pengirim: '',
    kategoriPengirim: 'Dinas Pendidikan',
    perihal: '',
    sifat: 'Penting',
    statusDisposisi: 'Menunggu Disposisi',
    instruksiDisposisi: '',
    diteruskanKepada: '',
    tenggatWaktu: '',
    catatanKepsek: '',
    lampiranNama: 'Surat_Resmi.pdf',
    lampiranUrl: '',
    penerimaBerkas: 'Staf Tata Usaha',
  });

  const suratMasukList = useMemo(() => {
    return db.get<SuratMasuk>('surat_masuk') || [];
  }, []);

  const [dataList, setDataList] = useState<SuratMasuk[]>(suratMasukList);

  const saveToDb = (newList: SuratMasuk[]) => {
    setDataList(newList);
    db.set('surat_masuk', newList);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.noAgenda.toLowerCase().includes(q) ||
        item.noSuratAsal.toLowerCase().includes(q) ||
        item.pengirim.toLowerCase().includes(q) ||
        item.perihal.toLowerCase().includes(q) ||
        (item.diteruskanKepada && item.diteruskanKepada.toLowerCase().includes(q));

      const matchSifat = !filterSifat || item.sifat === filterSifat;
      const matchStatus = !filterStatus || item.statusDisposisi === filterStatus;
      const matchPengirim = !filterPengirim || item.kategoriPengirim === filterPengirim;

      return matchSearch && matchSifat && matchStatus && matchPengirim;
    });
  }, [dataList, searchTerm, filterSifat, filterStatus, filterPengirim]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noSuratAsal || !formData.pengirim || !formData.perihal) {
      alert('Mohon lengkapi No Surat Asal, Pengirim, dan Perihal!');
      return;
    }

    const newItem: SuratMasuk = {
      id: `SM-${Date.now()}`,
      noAgenda: formData.noAgenda || `AGD/${Date.now()}`,
      noSuratAsal: formData.noSuratAsal || '',
      tanggalSurat: formData.tanggalSurat || new Date().toISOString().split('T')[0],
      tanggalDiterima: formData.tanggalDiterima || new Date().toISOString().split('T')[0],
      pengirim: formData.pengirim || '',
      kategoriPengirim: formData.kategoriPengirim as any || 'Dinas Pendidikan',
      perihal: formData.perihal || '',
      sifat: formData.sifat as any || 'Penting',
      statusDisposisi: formData.statusDisposisi as any || 'Menunggu Disposisi',
      instruksiDisposisi: formData.instruksiDisposisi || '',
      diteruskanKepada: formData.diteruskanKepada || '',
      tenggatWaktu: formData.tenggatWaktu || '',
      catatanKepsek: formData.catatanKepsek || '',
      lampiranNama: formData.lampiranNama || 'Surat_Lampiran.pdf',
      lampiranUrl: formData.lampiranUrl || '',
      penerimaBerkas: formData.penerimaBerkas || 'Staf Tata Usaha',
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...dataList];
    saveToDb(updated);
    setIsAddModalOpen(false);
    setFormData({
      noAgenda: `AGD/${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 900) + 100)}/2026`,
      noSuratAsal: '',
      tanggalSurat: new Date().toISOString().split('T')[0],
      tanggalDiterima: new Date().toISOString().split('T')[0],
      pengirim: '',
      kategoriPengirim: 'Dinas Pendidikan',
      perihal: '',
      sifat: 'Penting',
      statusDisposisi: 'Menunggu Disposisi',
      instruksiDisposisi: '',
      diteruskanKepada: '',
      tenggatWaktu: '',
      catatanKepsek: '',
      lampiranNama: 'Surat_Resmi.pdf',
      lampiranUrl: '',
      penerimaBerkas: 'Staf Tata Usaha',
    });
  };

  // Handle Save Disposisi
  const handleSaveDisposisi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposisiModalItem) return;

    const updated = dataList.map(item => {
      if (item.id === disposisiModalItem.id) {
        return {
          ...disposisiModalItem,
          statusDisposisi: disposisiModalItem.instruksiDisposisi ? (disposisiModalItem.statusDisposisi === 'Menunggu Disposisi' ? 'Didisposisikan' : disposisiModalItem.statusDisposisi) : disposisiModalItem.statusDisposisi
        };
      }
      return item;
    });

    saveToDb(updated);
    setDisposisiModalItem(null);
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
      'No. Agenda': item.noAgenda,
      'No. Surat Asal': item.noSuratAsal,
      'Tanggal Surat': item.tanggalSurat,
      'Tanggal Diterima': item.tanggalDiterima,
      Pengirim: item.pengirim,
      'Kategori Pengirim': item.kategoriPengirim,
      Perihal: item.perihal,
      Sifat: item.sifat,
      'Status Disposisi': item.statusDisposisi,
      'Instruksi Disposisi': item.instruksiDisposisi || '-',
      'Diteruskan Kepada': item.diteruskanKepada || '-',
      'Tenggat Waktu': item.tenggatWaktu || '-',
      'Penerima Berkas': item.penerimaBerkas,
    }));
    exportToExcel(rows, `Surat_Masuk_Disposisi_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Mail className="text-indigo-600" size={22} />
            Buku Agenda Surat Masuk & Lembar Disposisi
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pencatatan surat kedinasan, penomoran agenda masuk, penetapan sifat surat, dan instruksi disposisi pimpinan.
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Input Surat Masuk</span>
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
              placeholder="Cari agenda, pengirim, perihal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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

          {/* Sifat Surat Filter */}
          <select
            value={filterSifat}
            onChange={(e) => setFilterSifat(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">Semua Sifat Surat</option>
            <option value="Sangat Segera">Sangat Segera</option>
            <option value="Penting">Penting</option>
            <option value="Biasa">Biasa</option>
            <option value="Rahasia">Rahasia</option>
          </select>

          {/* Status Disposisi Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">Semua Status Disposisi</option>
            <option value="Menunggu Disposisi">Menunggu Disposisi</option>
            <option value="Didisposisikan">Didisposisikan</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Selesai">Selesai</option>
          </select>

          {/* Kategori Pengirim Filter */}
          <select
            value={filterPengirim}
            onChange={(e) => setFilterPengirim(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">Semua Instansi Pengirim</option>
            <option value="Dinas Pendidikan">Dinas Pendidikan</option>
            <option value="Kemenag">Kemenag</option>
            <option value="Sekolah Lain">Sekolah Lain</option>
            <option value="Yayasan">Yayasan</option>
            <option value="Perguruan Tinggi">Perguruan Tinggi</option>
            <option value="Instansi Swasta">Instansi Swasta</option>
          </select>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari total <strong>{dataList.length}</strong> surat masuk</span>
          {(searchTerm || filterSifat || filterStatus || filterPengirim) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSifat('');
                setFilterStatus('');
                setFilterPengirim('');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4">No. Agenda</th>
                <th className="py-3.5 px-4">No. Surat & Asal Pengirim</th>
                <th className="py-3.5 px-4 text-center">Tgl Terima / Surat</th>
                <th className="py-3.5 px-4">Perihal & Pokok Isi</th>
                <th className="py-3.5 px-4 text-center">Sifat</th>
                <th className="py-3.5 px-4 text-center">Status Disposisi</th>
                <th className="py-3.5 px-4">Instruksi Disposisi & Tujuan</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Mail size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Surat Masuk Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    {/* No Agenda */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/60 block whitespace-nowrap">
                        {item.noAgenda}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">TU: {item.penerimaBerkas}</span>
                    </td>

                    {/* No Surat & Pengirim */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-bold text-slate-900 truncate" title={item.noSuratAsal}>
                        {item.noSuratAsal}
                      </div>
                      <div className="text-[11px] text-indigo-800 font-semibold truncate mt-0.5">
                        {item.pengirim}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {item.kategoriPengirim}
                      </span>
                    </td>

                    {/* Tanggal */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <div className="font-bold text-slate-800">{item.tanggalDiterima}</div>
                      <span className="text-[10px] text-slate-400">Surat: {item.tanggalSurat}</span>
                    </td>

                    {/* Perihal */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-black text-slate-900 group-hover:text-indigo-700 transition line-clamp-2">
                        {item.perihal}
                      </div>
                      {item.lampiranNama && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <FileText size={11} className="text-slate-400" />
                          <span className="truncate">{item.lampiranNama}</span>
                        </div>
                      )}
                    </td>

                    {/* Sifat */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${
                        item.sifat === 'Sangat Segera' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        item.sifat === 'Penting' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.sifat === 'Rahasia' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.sifat}
                      </span>
                    </td>

                    {/* Status Disposisi */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md block whitespace-nowrap ${
                        item.statusDisposisi === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.statusDisposisi === 'Menunggu Disposisi' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        item.statusDisposisi === 'Dalam Proses' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                        'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {item.statusDisposisi}
                      </span>
                    </td>

                    {/* Instruksi Disposisi */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      {item.instruksiDisposisi ? (
                        <div>
                          <p className="text-[11px] text-slate-800 font-medium line-clamp-2">
                            "{item.instruksiDisposisi}"
                          </p>
                          {item.diteruskanKepada && (
                            <span className="text-[10px] text-indigo-700 font-bold block mt-0.5 truncate">
                              &rarr; {item.diteruskanKepada}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setDisposisiModalItem(item)}
                          className="text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1"
                        >
                          <Sparkles size={12} />
                          <span>Beri Disposisi</span>
                        </button>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDisposisiModalItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                          title="Lembar Disposisi Kepala Sekolah"
                        >
                          <UserCheck size={14} />
                        </button>
                        <button
                          onClick={() => setPrintDisposisiItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition"
                          title="Cetak Lembar Disposisi Resmi"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => setViewDetail(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition"
                          title="Edit Surat Masuk"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition"
                          title="Hapus Surat Masuk"
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

      {/* Modal Tambah Surat Masuk */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Input Surat Masuk Baru</h3>
                  <p className="text-xs text-slate-400">Registrasi berkas dan nomor agenda tata usaha</p>
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
                  <label className="font-bold text-slate-700 block mb-1">Nomor Agenda *</label>
                  <input
                    type="text"
                    required
                    value={formData.noAgenda}
                    onChange={(e) => setFormData({ ...formData, noAgenda: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Surat Asal / Pengirim *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 421.1/108/Disdik/2026"
                    value={formData.noSuratAsal}
                    onChange={(e) => setFormData({ ...formData, noSuratAsal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Instansi / Asal Pengirim *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dinas Pendidikan Provinsi DKI Jakarta"
                    value={formData.pengirim}
                    onChange={(e) => setFormData({ ...formData, pengirim: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Pengirim</label>
                  <select
                    value={formData.kategoriPengirim}
                    onChange={(e) => setFormData({ ...formData, kategoriPengirim: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Dinas Pendidikan">Dinas Pendidikan</option>
                    <option value="Kemenag">Kemenag</option>
                    <option value="Sekolah Lain">Sekolah Lain</option>
                    <option value="Yayasan">Yayasan</option>
                    <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                    <option value="Instansi Swasta">Instansi Swasta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Surat</label>
                  <input
                    type="date"
                    value={formData.tanggalSurat}
                    onChange={(e) => setFormData({ ...formData, tanggalSurat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Diterima</label>
                  <input
                    type="date"
                    value={formData.tanggalDiterima}
                    onChange={(e) => setFormData({ ...formData, tanggalDiterima: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sifat Surat</label>
                  <select
                    value={formData.sifat}
                    onChange={(e) => setFormData({ ...formData, sifat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Sangat Segera">Sangat Segera</option>
                    <option value="Penting">Penting</option>
                    <option value="Biasa">Biasa</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perihal / Pokok Isi Surat *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Undangan Rapat Koordinasi Teknis Asesmen Nasional 2026..."
                  value={formData.perihal}
                  onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Berkas Lampiran</label>
                  <input
                    type="text"
                    value={formData.lampiranNama}
                    onChange={(e) => setFormData({ ...formData, lampiranNama: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Petugas Penerima TU</label>
                  <input
                    type="text"
                    value={formData.penerimaBerkas}
                    onChange={(e) => setFormData({ ...formData, penerimaBerkas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
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
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Surat Masuk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lembar Disposisi Kepala Sekolah */}
      {disposisiModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Lembar Disposisi Pimpinan</h3>
                  <span className="font-mono text-xs text-indigo-700">{disposisiModalItem.noAgenda}</span>
                </div>
              </div>
              <button 
                onClick={() => setDisposisiModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <div className="font-bold text-slate-800">Perihal: {disposisiModalItem.perihal}</div>
              <div className="text-[11px] text-slate-500">
                Dari: <strong>{disposisiModalItem.pengirim}</strong> (No: {disposisiModalItem.noSuratAsal})
              </div>
            </div>

            <form onSubmit={handleSaveDisposisi} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Status Disposisi</label>
                <select
                  value={disposisiModalItem.statusDisposisi}
                  onChange={(e) => setDisposisiModalItem({ ...disposisiModalItem, statusDisposisi: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Menunggu Disposisi">Menunggu Disposisi</option>
                  <option value="Didisposisikan">Didisposisikan</option>
                  <option value="Dalam Proses">Dalam Proses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instruksi / Petunjuk Pimpinan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Hadiri bersama Waka Kurikulum, pelajari petunjuk teknis, dan siapkan lab komputer..."
                  value={disposisiModalItem.instruksiDisposisi || ''}
                  onChange={(e) => setDisposisiModalItem({ ...disposisiModalItem, instruksiDisposisi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Diteruskan Kepada (Pejabat / GTK)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Waka Kurikulum, Waka Kesiswaan, KTU"
                    value={disposisiModalItem.diteruskanKepada || ''}
                    onChange={(e) => setDisposisiModalItem({ ...disposisiModalItem, diteruskanKepada: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tenggat Waktu / Tanggal Acara</label>
                  <input
                    type="date"
                    value={disposisiModalItem.tenggatWaktu || ''}
                    onChange={(e) => setDisposisiModalItem({ ...disposisiModalItem, tenggatWaktu: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan Kepala Sekolah</label>
                <input
                  type="text"
                  placeholder="Catatan pelaporan hasil kegiatan atau tindak lanjut..."
                  value={disposisiModalItem.catatanKepsek || ''}
                  onChange={(e) => setDisposisiModalItem({ ...disposisiModalItem, catatanKepsek: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisposisiModalItem(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Disposisi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Lembar Disposisi */}
      {printDisposisiItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-in zoom-in-95 printable-container printable-document print:p-0 print:border-none print:shadow-none">
            {/* Header Cetak Kop Resmi */}
            <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-3 gap-4">
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                {settings.logoUrl || settings.schoolLogoUrl ? (
                  <img src={settings.logoUrl || settings.schoolLogoUrl} alt="Logo Sekolah" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-[10px]">LOGO</div>
                )}
              </div>
              <div className="text-center flex-1">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  PEMERINTAH {settings.kabupaten ? `KABUPATEN / KOTA ${settings.kabupaten.toUpperCase()}` : 'DAERAH KHUSUS'}
                </h5>
                <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </h4>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                  {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SATUAN PENDIDIKAN FORMAL'}
                </h3>
                <p className="text-[10px] text-slate-600">
                  {settings.alamat || 'Jl. Pendidikan No. 128'} {settings.desa ? `, ${settings.desa}` : ''} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupaten ? `, ${settings.kabupaten}` : ''}
                </p>
                <p className="text-[9px] text-slate-500">
                  NPSN: {settings.npsn || '20108976'} • Telp: {settings.telepon || settings.kontak || '-'} • Email: {settings.email || 'info@sekolah.sch.id'}
                </p>
              </div>
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-800">
                  <Award size={18} />
                  <span className="text-[7px] font-black uppercase mt-0.5">DISPOSISI</span>
                </div>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center space-y-0.5">
              <h4 className="text-sm font-black tracking-wider uppercase text-slate-900 underline">
                LEMBAR DISPOSISI KEPALA SEKOLAH
              </h4>
              <p className="text-[11px] text-slate-600 font-bold">
                Tahun Ajaran {settings.tahunPelajaran || '2026/2027'}
              </p>
            </div>

            {/* Content Disposisi */}
            <div className="space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3.5 rounded-xl">
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Nomor Agenda</span>
                  <span className="font-mono font-black text-sm">{printDisposisiItem.noAgenda}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Sifat Surat</span>
                  <span className="font-black text-sm uppercase">{printDisposisiItem.sifat}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Tanggal Terima</span>
                  <span className="font-bold">{printDisposisiItem.tanggalDiterima}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Tenggat Waktu</span>
                  <span className="font-bold">{printDisposisiItem.tenggatWaktu || '-'}</span>
                </div>
              </div>

              <div className="border border-slate-300 p-3.5 rounded-xl space-y-2">
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Asal Pengirim</span>
                  <span className="font-bold">{printDisposisiItem.pengirim} (No: {printDisposisiItem.noSuratAsal})</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-500 text-[10px] uppercase">Perihal</span>
                  <span className="font-black text-slate-900">{printDisposisiItem.perihal}</span>
                </div>
              </div>

              <div className="border-2 border-indigo-200 bg-indigo-50/40 p-4 rounded-xl space-y-2">
                <span className="font-black text-indigo-900 text-[11px] uppercase tracking-wider block">
                  Instruksi / Petunjuk Kepala Sekolah:
                </span>
                <p className="font-bold text-slate-900 text-sm whitespace-pre-line">
                  {printDisposisiItem.instruksiDisposisi || 'Tindak lanjuti sesuai prosedur dan laporkan progresnya.'}
                </p>
                <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Diteruskan Kepada: <strong>{printDisposisiItem.diteruskanKepada || 'Wakasek / Tim Terkait'}</strong></span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-6 text-center">
                <div>
                  <span className="text-[11px] text-slate-500">Penerima Berkas TU,</span>
                  <div className="h-16"></div>
                  <span className="font-bold text-slate-800 underline">{printDisposisiItem.penerimaBerkas || 'Petugas TU'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Kepala Sekolah,</span>
                  <div className="h-16"></div>
                  <span className="font-bold text-slate-800 underline">{settings.namaKepsek || '( ............................................ )'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 no-print">
              <button
                onClick={() => setPrintDisposisiItem(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
              <button
                onClick={triggerPrint}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak Lembar Disposisi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Detail Surat Masuk</h3>
                  <span className="font-mono text-xs text-indigo-700">{viewDetail.noAgenda}</span>
                </div>
              </div>
              <button 
                onClick={() => setViewDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-indigo-700">Perihal Surat</span>
                <div className="font-black text-slate-900 text-sm">{viewDetail.perihal}</div>
                <div className="text-slate-600 text-xs">
                  Dari: <strong>{viewDetail.pengirim}</strong> (No: {viewDetail.noSuratAsal})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Sifat Surat</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.sifat}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Status Disposisi</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.statusDisposisi}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tanggal Surat</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.tanggalSurat}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tanggal Diterima</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.tanggalDiterima}</span>
                </div>
              </div>

              {viewDetail.instruksiDisposisi && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-800 block">Instruksi Disposisi</span>
                  <p className="font-semibold text-slate-800">{viewDetail.instruksiDisposisi}</p>
                  <div className="text-[11px] text-slate-500 pt-1">
                    Diteruskan Kepada: <strong>{viewDetail.diteruskanKepada || '-'}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewDetail(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Tutup
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
              <h3 className="text-base font-black text-slate-900">Edit Data Surat Masuk</h3>
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
                  <label className="font-bold text-slate-700 block mb-1">Nomor Agenda</label>
                  <input
                    type="text"
                    required
                    value={editItem.noAgenda}
                    onChange={(e) => setEditItem({ ...editItem, noAgenda: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Surat Asal</label>
                  <input
                    type="text"
                    required
                    value={editItem.noSuratAsal}
                    onChange={(e) => setEditItem({ ...editItem, noSuratAsal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instansi Pengirim</label>
                <input
                  type="text"
                  required
                  value={editItem.pengirim}
                  onChange={(e) => setEditItem({ ...editItem, pengirim: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perihal</label>
                <textarea
                  rows={2}
                  required
                  value={editItem.perihal}
                  onChange={(e) => setEditItem({ ...editItem, perihal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-200"
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
              <h3 className="text-base font-black text-slate-900">Hapus Surat Masuk?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus agenda <strong>"{deleteItem.noAgenda}"</strong>? Tindakan ini tidak dapat dibatalkan.
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
