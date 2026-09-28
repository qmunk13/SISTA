import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { MasterTemplateSurat } from '../../data/dokumenSeed';
import { 
  FileCode, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Download, 
  Sparkles, CheckCircle2, Play, Code2, Copy, Check, Printer, Award
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { triggerPrint } from '../../lib/utils';

export default function TemplateSuratTab() {
  const { settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MasterTemplateSurat | null>(null);
  const [editItem, setEditItem] = useState<MasterTemplateSurat | null>(null);
  const [deleteItem, setDeleteItem] = useState<MasterTemplateSurat | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<MasterTemplateSurat>>({
    kodeTemplate: `TPL-${String(Math.floor(Math.random() * 900) + 100)}`,
    namaTemplate: '',
    kategori: 'Kesiswaan',
    deskripsi: '',
    variabel: ['{{NO_SURAT}}', '{{NAMA_SISWA}}', '{{NISN}}', '{{KELAS}}', '{{TANGGAL_SURAT}}', '{{NAMA_KEPSEK}}'],
    penandatanganDefault: '',
    jabatanDefault: 'Kepala Sekolah',
    formatKop: 'KOP RESMI SEKOLAH LENGKAP',
    strukturIsi: `Dengan ini menerangkan bahwa:
Nama Siswa: {{NAMA_SISWA}}
NISN: {{NISN}}
Kelas: {{KELAS}}

Telah terdaftar aktif dan berkelakuan baik pada tahun ajaran 2026/2027.`,
    status: 'Aktif',
  });

  const templateList = useMemo(() => {
    return db.get<MasterTemplateSurat>('template_surat') || [];
  }, []);

  const [dataList, setDataList] = useState<MasterTemplateSurat[]>(templateList);

  const saveToDb = (newList: MasterTemplateSurat[]) => {
    setDataList(newList);
    db.set('template_surat', newList);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.namaTemplate.toLowerCase().includes(q) ||
        item.kodeTemplate.toLowerCase().includes(q) ||
        item.deskripsi.toLowerCase().includes(q) ||
        item.variabel.some(v => v.toLowerCase().includes(q));

      const matchKategori = !filterKategori || item.kategori === filterKategori;

      return matchSearch && matchKategori;
    });
  }, [dataList, searchTerm, filterKategori]);

  // Handle Copy Tag
  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaTemplate || !formData.strukturIsi) {
      alert('Mohon lengkapi Nama Template dan Struktur Isi!');
      return;
    }

    const newItem: MasterTemplateSurat = {
      id: `TPL-${Date.now()}`,
      kodeTemplate: formData.kodeTemplate || `TPL-${Date.now()}`,
      namaTemplate: formData.namaTemplate || '',
      kategori: formData.kategori as any || 'Kesiswaan',
      deskripsi: formData.deskripsi || '',
      variabel: formData.variabel || ['{{NO_SURAT}}', '{{TANGGAL}}'],
      penandatanganDefault: formData.penandatanganDefault || '',
      jabatanDefault: formData.jabatanDefault || 'Kepala Sekolah',
      formatKop: formData.formatKop || 'KOP RESMI SEKOLAH',
      strukturIsi: formData.strukturIsi || '',
      status: formData.status as any || 'Aktif',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newItem, ...dataList];
    saveToDb(updated);
    setIsAddModalOpen(false);
    setFormData({
      kodeTemplate: `TPL-${String(Math.floor(Math.random() * 900) + 100)}`,
      namaTemplate: '',
      kategori: 'Kesiswaan',
      deskripsi: '',
      variabel: ['{{NO_SURAT}}', '{{NAMA_SISWA}}', '{{NISN}}', '{{KELAS}}', '{{TANGGAL_SURAT}}', '{{NAMA_KEPSEK}}'],
      penandatanganDefault: '',
      jabatanDefault: 'Kepala Sekolah',
      formatKop: 'KOP RESMI SEKOLAH LENGKAP',
      strukturIsi: '',
      status: 'Aktif',
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const updated = dataList.map(item => item.id === editItem.id ? { ...editItem, updatedAt: new Date().toISOString().split('T')[0] } : item);
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
      'Kode Template': item.kodeTemplate,
      'Nama Template': item.namaTemplate,
      Kategori: item.kategori,
      Deskripsi: item.deskripsi,
      'Variabel Tersedia': item.variabel.join(', '),
      'Penandatangan Default': item.penandatanganDefault,
      Status: item.status,
      'Tanggal Update': item.updatedAt
    }));
    exportToExcel(rows, `Template_Surat_${new Date().toISOString().split('T')[0]}`);
  };

  // Live test preview format
  const renderLivePreview = (template: MasterTemplateSurat) => {
    let text = template.strukturIsi;
    text = text.replace(/{{NO_SURAT}}/g, '421.2/001/SEK/2026');
    text = text.replace(/{{NAMA_SISWA}}/g, '[Nama Lengkap Siswa]');
    text = text.replace(/{{NISN}}/g, '[0000000000]');
    text = text.replace(/{{KELAS}}/g, '[Kelas]');
    text = text.replace(/{{TEMPAT_TANGGAL_LAHIR}}/g, '[Kota, Tanggal Lahir]');
    text = text.replace(/{{NAMA_ORTU}}/g, '[Nama Orang Tua/Wali]');
    text = text.replace(/{{KEPERLUAN}}/g, '[Tujuan Keperluan]');
    text = text.replace(/{{TANGGAL_SURAT}}/g, new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
    text = text.replace(/{{NAMA_KEPSEK}}/g, template.penandatanganDefault || '[Nama Kepala Sekolah]');
    text = text.replace(/{{NIP_KEPSEK}}/g, '[NIP Kepala Sekolah]');
    text = text.replace(/{{NAMA_GURU}}/g, '[Nama Guru / GTK]');
    text = text.replace(/{{NIP_NUPTK}}/g, '[NIP / NUPTK]');
    text = text.replace(/{{JABATAN}}/g, '[Jabatan]');
    text = text.replace(/{{AGENDA_TUGAS}}/g, '[Uraian Tugas / Kegiatan]');
    text = text.replace(/{{LOKASI_TUGAS}}/g, '[Lokasi Pelaksanaan]');
    text = text.replace(/{{WAKTU_PELAKSANAAN}}/g, '[Hari, Tanggal Waktu]');
    text = text.replace(/{{HARI_TANGGAL}}/g, '[Hari / Tanggal]');
    text = text.replace(/{{WAKTU}}/g, '[08.00 WIB s.d Selesai]');
    text = text.replace(/{{TEMPAT}}/g, '[Tempat Pertemuan]');
    text = text.replace(/{{AGENDA}}/g, '[Agenda Acara]');
    text = text.replace(/{{PRESTASI_UTAMA}}/g, '[Prestasi Siswa]');
    text = text.replace(/{{INSTANSI_TUJUAN}}/g, '[Instansi / Perguruan Tinggi Tujuan]');
    return text;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FileCode className="text-purple-600" size={22} />
            Master Format & Template Naskah Dinas Baku
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Standarisasi redaksi surat dinas, pemetaan variabel dinamis (merge tags), dan auto-filler persuratan sekolah.
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Tambah Format Template</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama template, kode, variabel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
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
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
          >
            <option value="">Semua Kategori Template</option>
            <option value="Kesiswaan">Kesiswaan</option>
            <option value="Kepegawaian">Kepegawaian</option>
            <option value="Humas & Kerjasama">Humas & Kerjasama</option>
            <option value="Akademik">Akademik</option>
            <option value="Administrasi Umum">Administrasi Umum</option>
          </select>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari total <strong>{dataList.length}</strong> template persuratan</span>
          {(searchTerm || filterKategori) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKategori('');
              }}
              className="text-purple-600 hover:text-purple-700 font-bold"
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
                <th className="py-3.5 px-4">Kode Template</th>
                <th className="py-3.5 px-4">Nama Template & Deskripsi</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Variabel Tag Dinamis</th>
                <th className="py-3.5 px-4">Penandatangan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <FileCode size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Template Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba sesuaikan pencarian atau buat template baru.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Kode Template */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 block whitespace-nowrap">
                        {item.kodeTemplate}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.updatedAt}</span>
                    </td>

                    {/* Nama & Deskripsi */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-black text-slate-900 group-hover:text-purple-700 transition">
                        {item.namaTemplate}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {item.deskripsi || 'Format naskah dinas resmi.'}
                      </p>
                    </td>

                    {/* Kategori */}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {item.kategori}
                      </span>
                    </td>

                    {/* Variabel Tags */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="flex flex-wrap gap-1">
                        {item.variabel.slice(0, 3).map((v, i) => (
                          <span 
                            key={i} 
                            onClick={() => handleCopy(v)}
                            className="font-mono text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md border border-purple-200/60 cursor-pointer transition"
                            title="Klik untuk salin tag"
                          >
                            {v}
                          </span>
                        ))}
                        {item.variabel.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-bold self-center">
                            +{item.variabel.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Penandatangan */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 truncate max-w-[130px]">{item.penandatanganDefault}</div>
                      <div className="text-[10px] text-slate-400">{item.jabatanDefault}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition"
                          title="Preview & Live Test Data"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition"
                          title="Edit Template"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition"
                          title="Hapus Template"
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

      {/* Modal Tambah Template */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <FileCode size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Tambah Template Naskah Baru</h3>
                  <p className="text-xs text-slate-400">Buat pola format surat dengan merge tags</p>
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
                  <label className="font-bold text-slate-700 block mb-1">Kode Template *</label>
                  <input
                    type="text"
                    required
                    value={formData.kodeTemplate}
                    onChange={(e) => setFormData({ ...formData, kodeTemplate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Kesiswaan">Kesiswaan</option>
                    <option value="Kepegawaian">Kepegawaian</option>
                    <option value="Humas & Kerjasama">Humas & Kerjasama</option>
                    <option value="Akademik">Akademik</option>
                    <option value="Administrasi Umum">Administrasi Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Template Surat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surat Rekomendasi Prestasi Siswa"
                  value={formData.namaTemplate}
                  onChange={(e) => setFormData({ ...formData, namaTemplate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  placeholder="Format untuk pengajuan beasiswa atau lomba siswa"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Struktur Isi Surat (Gunakan Tag `&#123;&#123;TAG&#125;&#125;`) *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.strukturIsi}
                  onChange={(e) => setFormData({ ...formData, strukturIsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penandatangan Bawaan</label>
                  <input
                    type="text"
                    value={formData.penandatanganDefault}
                    onChange={(e) => setFormData({ ...formData, penandatanganDefault: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jabatan Bawaan</label>
                  <input
                    type="text"
                    value={formData.jabatanDefault}
                    onChange={(e) => setFormData({ ...formData, jabatanDefault: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-md shadow-purple-200 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview & Live Test */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95 printable-container printable-document print:p-0 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Play size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Uji Format & Live Preview</h3>
                  <span className="font-mono text-xs text-purple-700">{previewItem.namaTemplate}</span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1 no-print">
                <span className="text-[10px] font-black uppercase text-purple-900 block">Variabel yang Terdefinisi:</span>
                <div className="flex flex-wrap gap-1.5">
                  {previewItem.variabel.map((v, i) => (
                    <span key={i} className="font-mono text-[10px] font-bold bg-white text-purple-800 px-2 py-0.5 rounded-lg border border-purple-200">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Simulation Box */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 print:bg-white print:border-none print:p-0">
                {/* Kop Surat Live */}
                <div className="border-b-4 border-double border-slate-900 pb-3 text-center space-y-1">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    PEMERINTAH {settings.kabupaten ? `KABUPATEN / KOTA ${settings.kabupaten.toUpperCase()}` : 'DAERAH KHUSUS'}
                  </h4>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                    {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SATUAN PENDIDIKAN FORMAL'}
                  </h3>
                  <p className="text-[9px] text-slate-600">
                    {settings.alamat || 'Jl. Pendidikan No. 128'} • NPSN: {settings.npsn || '20108976'} • Telp: {settings.telepon || '-'}
                  </p>
                </div>

                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider no-print">
                  Hasil Simulasi Penggabungan Data (Sample Test Data):
                </span>
                <div className="bg-white p-4 rounded-xl border border-slate-200 font-sans text-xs text-slate-900 leading-relaxed whitespace-pre-line shadow-2xs print:border-none print:p-0 print:shadow-none">
                  {renderLivePreview(previewItem)}
                </div>

                {/* TTD Preview */}
                <div className="flex justify-end pt-4 text-xs">
                  <div className="text-center w-52 space-y-1">
                    <p className="text-[10px] text-slate-600">{settings.kabupaten || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold text-slate-800">{previewItem.jabatanDefault || 'Kepala Sekolah'},</p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        [TTE TERVALIDASI]
                      </span>
                    </div>
                    <p className="font-black text-slate-900 underline">{previewItem.penandatanganDefault || settings.namaKepsek || 'Kepala Sekolah'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 no-print">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Tutup
              </button>
              <button
                onClick={triggerPrint}
                className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer size={14} />
                <span>Cetak Contoh Naskah</span>
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
              <h3 className="text-base font-black text-slate-900">Edit Template Surat</h3>
              <button 
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Template</label>
                <input
                  type="text"
                  required
                  value={editItem.namaTemplate}
                  onChange={(e) => setEditItem({ ...editItem, namaTemplate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={editItem.deskripsi}
                  onChange={(e) => setEditItem({ ...editItem, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Struktur Isi</label>
                <textarea
                  rows={4}
                  required
                  value={editItem.strukturIsi}
                  onChange={(e) => setEditItem({ ...editItem, strukturIsi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-md shadow-purple-200"
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
              <h3 className="text-base font-black text-slate-900">Hapus Template?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus template <strong>"{deleteItem.namaTemplate}"</strong>?
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
