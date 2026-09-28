import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { SuratKeluar } from '../../data/dokumenSeed';
import { 
  Send, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Download, 
  Printer, CheckCircle2, Clock, AlertCircle, FileText, Check, Sparkles,
  QrCode, Stamp, Building2, User, Award
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { triggerPrint } from '../../lib/utils';

export default function SuratKeluarTab() {
  const { settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<SuratKeluar | null>(null);
  const [printOfficialLetter, setPrintOfficialLetter] = useState<SuratKeluar | null>(null);
  const [editItem, setEditItem] = useState<SuratKeluar | null>(null);
  const [deleteItem, setDeleteItem] = useState<SuratKeluar | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<SuratKeluar>>({
    noSurat: `421.2/${String(Math.floor(Math.random() * 900) + 100)}/SMK-IT/${new Date().getFullYear()}`,
    kodeKlasifikasi: '421.2 (Kesiswaan)',
    tanggalSurat: new Date().toISOString().split('T')[0],
    jenisSurat: 'Surat Keterangan Siswa Aktif',
    penerima: '',
    alamatPenerima: 'Di Tempat',
    perihal: '',
    isiSurat: '',
    penandatangan: '',
    jabatanPenandatangan: 'Kepala Sekolah',
    status: 'Diterbitkan / Sah',
    namaSiswa: '',
    nisn: '',
    kelas: '',
    keperluan: '',
    tembusan: 'Arsip Tata Usaha',
  });

  const suratKeluarList = useMemo(() => {
    return db.get<SuratKeluar>('surat_keluar') || [];
  }, []);

  const [dataList, setDataList] = useState<SuratKeluar[]>(suratKeluarList);

  const saveToDb = (newList: SuratKeluar[]) => {
    setDataList(newList);
    db.set('surat_keluar', newList);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.noSurat.toLowerCase().includes(q) ||
        item.penerima.toLowerCase().includes(q) ||
        item.perihal.toLowerCase().includes(q) ||
        (item.namaSiswa && item.namaSiswa.toLowerCase().includes(q)) ||
        (item.keperluan && item.keperluan.toLowerCase().includes(q));

      const matchJenis = !filterJenis || item.jenisSurat === filterJenis;
      const matchStatus = !filterStatus || item.status === filterStatus;

      return matchSearch && matchJenis && matchStatus;
    });
  }, [dataList, searchTerm, filterJenis, filterStatus]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noSurat || !formData.penerima || !formData.perihal) {
      alert('Mohon lengkapi No Surat, Penerima, dan Perihal!');
      return;
    }

    const newItem: SuratKeluar = {
      id: `SKL-${Date.now()}`,
      noSurat: formData.noSurat || `421/${Date.now()}`,
      kodeKlasifikasi: formData.kodeKlasifikasi || '421.2',
      tanggalSurat: formData.tanggalSurat || new Date().toISOString().split('T')[0],
      jenisSurat: formData.jenisSurat as any || 'Surat Keterangan Siswa Aktif',
      penerima: formData.penerima || '',
      alamatPenerima: formData.alamatPenerima || 'Di Tempat',
      perihal: formData.perihal || '',
      isiSurat: formData.isiSurat || '',
      penandatangan: formData.penandatangan || '',
      jabatanPenandatangan: formData.jabatanPenandatangan || 'Kepala Sekolah',
      status: formData.status as any || 'Diterbitkan / Sah',
      namaSiswa: formData.namaSiswa || '',
      nisn: formData.nisn || '',
      kelas: formData.kelas || '',
      keperluan: formData.keperluan || '',
      tembusan: formData.tembusan || 'Arsip Tata Usaha',
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...dataList];
    saveToDb(updated);
    setIsAddModalOpen(false);
    setFormData({
      noSurat: `421.2/${String(Math.floor(Math.random() * 900) + 100)}/SMK-IT/${new Date().getFullYear()}`,
      kodeKlasifikasi: '421.2 (Kesiswaan)',
      tanggalSurat: new Date().toISOString().split('T')[0],
      jenisSurat: 'Surat Keterangan Siswa Aktif',
      penerima: '',
      alamatPenerima: 'Di Tempat',
      perihal: '',
      isiSurat: '',
      penandatangan: '',
      jabatanPenandatangan: 'Kepala Sekolah',
      status: 'Diterbitkan / Sah',
      namaSiswa: '',
      nisn: '',
      kelas: '',
      keperluan: '',
      tembusan: 'Arsip Tata Usaha',
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
      'No. Surat': item.noSurat,
      'Tanggal Surat': item.tanggalSurat,
      'Jenis Surat': item.jenisSurat,
      Penerima: item.penerima,
      Perihal: item.perihal,
      'Nama Siswa': item.namaSiswa || '-',
      NISN: item.nisn || '-',
      Kelas: item.kelas || '-',
      Keperluan: item.keperluan || '-',
      Penandatangan: item.penandatangan,
      Status: item.status,
      Tembusan: item.tembusan || '-'
    }));
    exportToExcel(rows, `Surat_Keluar_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Send className="text-emerald-600" size={22} />
            Penerbitan Surat Keluar Resmi & Tata Naskah Dinas
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pembuatan surat keterangan siswa aktif, rekomendasi beasiswa, surat tugas guru, dan undangan resmi berkop sekolah.
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Buat Surat Keluar</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari no surat, penerima, nama siswa, perihal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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

          {/* Jenis Surat Filter */}
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="">Semua Jenis Surat Keluar</option>
            <option value="Surat Keterangan Siswa Aktif">Surat Keterangan Siswa Aktif</option>
            <option value="Undangan Rapat Orang Tua">Undangan Rapat Orang Tua</option>
            <option value="Surat Tugas Guru">Surat Tugas Guru</option>
            <option value="Surat Rekomendasi">Surat Rekomendasi</option>
            <option value="Permohonan Izin / Kunjungan">Permohonan Izin / Kunjungan</option>
            <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
            <option value="Surat Pengantar Dinas">Surat Pengantar Dinas</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="">Semua Status Penerbitan</option>
            <option value="Diterbitkan / Sah">Diterbitkan / Sah</option>
            <option value="Draft">Draft</option>
            <option value="Terkirim">Terkirim</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari total <strong>{dataList.length}</strong> surat keluar</span>
          {(searchTerm || filterJenis || filterStatus) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterJenis('');
                setFilterStatus('');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-bold"
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
                <th className="py-3.5 px-4">No. Surat Resmi</th>
                <th className="py-3.5 px-4">Jenis Surat & Klasifikasi</th>
                <th className="py-3.5 px-4 text-center">Tanggal Surat</th>
                <th className="py-3.5 px-4">Ditujukan Kepada</th>
                <th className="py-3.5 px-4">Perihal & Rincian</th>
                <th className="py-3.5 px-4">Penandatangan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Send size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Surat Keluar Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba sesuaikan kata kunci atau buat surat keluar baru.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    {/* No Surat */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 block whitespace-nowrap">
                        {item.noSurat}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.id}</span>
                    </td>

                    {/* Jenis Surat */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.jenisSurat}</div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.kodeKlasifikasi}</span>
                    </td>

                    {/* Tanggal */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                      {item.tanggalSurat}
                    </td>

                    {/* Penerima */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      <div className="font-bold text-slate-900 truncate">{item.penerima}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.alamatPenerima || 'Di Tempat'}</div>
                    </td>

                    {/* Perihal & Rincian */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-black text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                        {item.perihal}
                      </div>
                      {item.namaSiswa && (
                        <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                          Siswa: {item.namaSiswa} ({item.kelas || '-'})
                        </div>
                      )}
                      {item.keperluan && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          Ket: {item.keperluan}
                        </div>
                      )}
                    </td>

                    {/* Penandatangan */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 truncate max-w-[130px]">{item.penandatangan}</div>
                      <div className="text-[10px] text-slate-400">{item.jabatanPenandatangan}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${
                        item.status === 'Diterbitkan / Sah' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'Terkirim' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintOfficialLetter(item)}
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                          title="Cetak Naskah Dinas Resmi (Kop + TTD + Cap)"
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
                          title="Edit Surat Keluar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition"
                          title="Hapus Surat Keluar"
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

      {/* Modal Buat Surat Keluar */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Buat Surat Keluar Baru</h3>
                  <p className="text-xs text-slate-400">Penomoran dinas dan registrasi naskah keluar</p>
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
                  <label className="font-bold text-slate-700 block mb-1">Nomor Surat Resmi *</label>
                  <input
                    type="text"
                    required
                    value={formData.noSurat}
                    onChange={(e) => setFormData({ ...formData, noSurat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Surat</label>
                  <select
                    value={formData.jenisSurat}
                    onChange={(e) => setFormData({ ...formData, jenisSurat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Surat Keterangan Siswa Aktif">Surat Keterangan Siswa Aktif</option>
                    <option value="Undangan Rapat Orang Tua">Undangan Rapat Orang Tua</option>
                    <option value="Surat Tugas Guru">Surat Tugas Guru</option>
                    <option value="Surat Rekomendasi">Surat Rekomendasi</option>
                    <option value="Permohonan Izin / Kunjungan">Permohonan Izin / Kunjungan</option>
                    <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
                    <option value="Surat Pengantar Dinas">Surat Pengantar Dinas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ditujukan Kepada *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pimpinan Cabang BPJS Ketenagakerjaan"
                    value={formData.penerima}
                    onChange={(e) => setFormData({ ...formData, penerima: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Surat</label>
                  <input
                    type="date"
                    value={formData.tanggalSurat}
                    onChange={(e) => setFormData({ ...formData, tanggalSurat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perihal *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surat Keterangan Siswa Aktif Belajar (Ahmad Rizki)"
                  value={formData.perihal}
                  onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Bagian Siswa Jika Terkait */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="font-black text-[11px] text-slate-700 block uppercase">
                  Data Siswa Terkait (Opsional / Jika Surat Siswa)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Nama Siswa</label>
                    <input
                      type="text"
                      placeholder="Nama Lengkap Siswa"
                      value={formData.namaSiswa}
                      onChange={(e) => setFormData({ ...formData, namaSiswa: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">NISN</label>
                    <input
                      type="text"
                      placeholder="0081234567"
                      value={formData.nisn}
                      onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Kelas</label>
                    <input
                      type="text"
                      placeholder="X-A / XI-B"
                      value={formData.kelas}
                      onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keperluan / Keterangan Isi</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Surat keterangan ini diberikan sebagai kelengkapan administrasi tunjangan beasiswa..."
                  value={formData.keperluan}
                  onChange={(e) => setFormData({ ...formData, keperluan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penandatangan</label>
                  <input
                    type="text"
                    value={formData.penandatangan}
                    onChange={(e) => setFormData({ ...formData, penandatangan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={formData.jabatanPenandatangan}
                    onChange={(e) => setFormData({ ...formData, jabatanPenandatangan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Terbitkan Surat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Surat Resmi Naskah Dinas */}
      {printOfficialLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-in zoom-in-95 printable-container printable-document print:p-0 print:border-none print:shadow-none">
            {/* Kop Surat Resmi */}
            <div className="border-b-4 border-double border-slate-900 pb-3 text-center space-y-1">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  {settings.logoUrl || settings.schoolLogoUrl ? (
                    <img src={settings.logoUrl || settings.schoolLogoUrl} alt="Logo Sekolah" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-[10px]">LOGO</div>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    PEMERINTAH {settings.kabupaten ? `KABUPATEN / KOTA ${settings.kabupaten.toUpperCase()}` : 'DAERAH KHUSUS IBUKOTA JAKARTA'}
                  </h5>
                  <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h4>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                    {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SEKOLAH MENENGAH TEKNOLOGI INFORMASI'}
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    {settings.alamat || 'Jl. Pendidikan No. 128'} {settings.desa ? `, ${settings.desa}` : ''} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupaten ? `, ${settings.kabupaten}` : ''}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    NPSN: {settings.npsn || '20108976'} • Telp: {settings.telepon || settings.kontak || '(021) 7890-1234'} • Email: {settings.email || 'info@sekolah.sch.id'}
                  </p>
                </div>
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-800">
                    <Award size={18} />
                    <span className="text-[7px] font-black uppercase mt-0.5">RESMI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Isi Surat */}
            <div className="space-y-4 text-xs text-slate-900 leading-relaxed">
              <div className="text-center space-y-0.5">
                <h4 className="font-black uppercase tracking-wider text-sm underline">
                  {printOfficialLetter.jenisSurat.toUpperCase()}
                </h4>
                <div className="font-mono text-xs font-bold text-slate-700">
                  Nomor: {printOfficialLetter.noSurat}
                </div>
              </div>

              <div className="pt-2">
                <p>Yang bertanda tangan di bawah ini:</p>
                <div className="grid grid-cols-3 gap-1 pt-1 pl-4">
                  <span className="text-slate-600">Nama</span>
                  <span className="col-span-2 font-bold">: {printOfficialLetter.penandatangan || settings.namaKepsek || 'Kepala Sekolah'}</span>
                  <span className="text-slate-600">Jabatan</span>
                  <span className="col-span-2 font-bold">: {printOfficialLetter.jabatanPenandatangan || 'Kepala Sekolah'}</span>
                </div>
              </div>

              {printOfficialLetter.namaSiswa ? (
                <div className="pt-1">
                  <p>Menerangkan dengan sesungguhnya bahwa:</p>
                  <div className="grid grid-cols-3 gap-1 pt-1 pl-4">
                    <span className="text-slate-600">Nama Siswa</span>
                    <span className="col-span-2 font-bold">: {printOfficialLetter.namaSiswa}</span>
                    <span className="text-slate-600">NISN / NIS</span>
                    <span className="col-span-2 font-bold">: {printOfficialLetter.nisn || '-'}</span>
                    <span className="text-slate-600">Kelas / Rombel</span>
                    <span className="col-span-2 font-bold">: {printOfficialLetter.kelas || '-'}</span>
                  </div>
                  <p className="pt-2">
                    Adalah benar peserta didik yang tercatat aktif mengikuti kegiatan belajar mengajar pada Tahun Ajaran {settings.tahunPelajaran || '2026/2027'} di satuan pendidikan kami.
                  </p>
                </div>
              ) : (
                <div className="pt-1">
                  <p>
                    Sehubungan dengan perihal <strong>{printOfficialLetter.perihal}</strong>, dengan ini kami sampaikan kepada:
                  </p>
                  <div className="pl-4 font-bold">
                    Kepada Yth. {printOfficialLetter.penerima}<br/>
                    {printOfficialLetter.alamatPenerima || 'Di Tempat'}
                  </div>
                </div>
              )}

              <p>
                {printOfficialLetter.keperluan || 'Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.'}
              </p>

              {/* Tanda Tangan & QR Code */}
              <div className="grid grid-cols-2 pt-6 items-end">
                <div className="space-y-1">
                  <div className="w-20 h-20 border border-slate-200 rounded-xl p-1 bg-slate-50 flex items-center justify-center">
                    <QrCode size={64} className="text-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    Dokumen Sah Elektronik • {printOfficialLetter.id}
                  </span>
                </div>

                <div className="text-center space-y-0.5">
                  <div className="text-[11px] text-slate-700">
                    {settings.kabupaten || 'Jakarta'}, {printOfficialLetter.tanggalSurat}
                  </div>
                  <div className="text-[11px] font-bold text-slate-800">
                    {printOfficialLetter.jabatanPenandatangan || 'Kepala Sekolah'},
                  </div>
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      [TTE & CAP DIGITAL TERVERIFIKASI]
                    </span>
                  </div>
                  <div className="font-black text-slate-900 underline">
                    {printOfficialLetter.penandatangan || settings.namaKepsek || 'Kepala Sekolah'}
                  </div>
                </div>
              </div>

              {printOfficialLetter.tembusan && (
                <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-200">
                  <strong>Tembusan:</strong> {printOfficialLetter.tembusan}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 no-print">
              <button
                onClick={() => setPrintOfficialLetter(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
              <button
                onClick={triggerPrint}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak Surat Resmi</span>
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
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Detail Surat Keluar</h3>
                  <span className="font-mono text-xs text-emerald-700">{viewDetail.noSurat}</span>
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
                <span className="text-[10px] font-black uppercase text-emerald-700">{viewDetail.jenisSurat}</span>
                <div className="font-black text-slate-900 text-sm">{viewDetail.perihal}</div>
                <div className="text-slate-600">
                  Kepada: <strong>{viewDetail.penerima}</strong> ({viewDetail.alamatPenerima || 'Di Tempat'})
                </div>
              </div>

              {viewDetail.namaSiswa && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">Peserta Didik / Siswa Terkait</span>
                  <div className="font-bold text-slate-900">{viewDetail.namaSiswa} • NISN: {viewDetail.nisn || '-'} • Kelas: {viewDetail.kelas || '-'}</div>
                  <div className="text-slate-600">{viewDetail.keperluan}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tanggal Terbit</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.tanggalSurat}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Status Naskah</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{viewDetail.status}</span>
                </div>
              </div>
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
              <h3 className="text-base font-black text-slate-900">Edit Data Surat Keluar</h3>
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
                  <label className="font-bold text-slate-700 block mb-1">Nomor Surat</label>
                  <input
                    type="text"
                    required
                    value={editItem.noSurat}
                    onChange={(e) => setEditItem({ ...editItem, noSurat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penerima</label>
                  <input
                    type="text"
                    required
                    value={editItem.penerima}
                    onChange={(e) => setEditItem({ ...editItem, penerima: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perihal</label>
                <input
                  type="text"
                  required
                  value={editItem.perihal}
                  onChange={(e) => setEditItem({ ...editItem, perihal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keperluan / Keterangan</label>
                <textarea
                  rows={2}
                  value={editItem.keperluan || ''}
                  onChange={(e) => setEditItem({ ...editItem, keperluan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-200"
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
              <h3 className="text-base font-black text-slate-900">Hapus Surat Keluar?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus surat nomor <strong>"{deleteItem.noSurat}"</strong>?
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
