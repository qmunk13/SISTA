import React, { useState } from 'react';
import { db } from '../../data/db';
import { Image, FileDown, Plus, Trash2, X, Download, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';

export default function MediaUnduhanTab() {
  const [activeTab, setActiveTab] = useState<'unduhan' | 'galeri'>('unduhan');

  const [downloads, setDownloads] = useState<any[]>(() => {
    const fromDb = db.get<any>('unduhan');
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const [gallery, setGallery] = useState<any[]>(() => {
    const fromDb = db.get<any>('galeri');
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState('');

  // Form states
  const [downloadForm, setDownloadForm] = useState({
    judul: '',
    kategori: 'SPMB',
    ukuran: '1.5 MB',
    format: 'PDF',
    url: ''
  });

  const [galleryForm, setGalleryForm] = useState({
    judul: '',
    kategori: 'Kegiatan',
    url: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const saveDownloads = (list: any[]) => {
    setDownloads(list);
    db.set('unduhan', list);
  };

  const saveGallery = (list: any[]) => {
    setGallery(list);
    db.set('galeri', list);
  };

  const handleDeleteDownload = (id: string, judul: string) => {
    if (window.confirm(`Hapus berkas unduhan "${judul}"?`)) {
      const updated = downloads.filter(d => d.id !== id);
      saveDownloads(updated);
      setNotification('Berkas unduhan berhasil dihapus.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleDeleteGallery = (id: string, judul: string) => {
    if (window.confirm(`Hapus foto galeri "${judul}"?`)) {
      const updated = gallery.filter(g => g.id !== id);
      saveGallery(updated);
      setNotification('Foto galeri berhasil dihapus.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'unduhan') {
      const newItem = {
        id: String(Date.now()),
        ...downloadForm,
        downloadCount: 0
      };
      saveDownloads([...downloads, newItem]);
      setNotification('Berkas unduhan baru berhasil ditambahkan!');
    } else {
      const newItem = {
        id: String(Date.now()),
        ...galleryForm
      };
      saveGallery([...gallery, newItem]);
      setNotification('Foto galeri baru berhasil ditambahkan!');
    }
    setShowAddModal(false);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Image className="text-emerald-600" size={20} />
            Media Unduhan Publik & Galeri Foto
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola file unduhan dokumen SPMB, panduan akademik, dan foto dokumentasi kegiatan lembaga.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('unduhan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'unduhan' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Dokumen Unduhan
            </button>
            <button
              onClick={() => setActiveTab('galeri')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'galeri' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Galeri Foto
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95"
          >
            <Plus size={14} />
            <span>Tambah {activeTab === 'unduhan' ? 'Dokumen' : 'Foto'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* View 1: Unduhan Dokumen */}
      {activeTab === 'unduhan' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b">
                <tr>
                  <th className="p-3.5 pl-4">No</th>
                  <th className="p-3.5">Nama Dokumen File</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Ukuran & Format</th>
                  <th className="p-3.5">Diunduh</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {downloads.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-4 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <FileDown size={16} className="text-rose-500 shrink-0" />
                      <span>{item.judul}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{item.ukuran} ({item.format})</td>
                    <td className="p-3.5 font-bold text-emerald-600">{item.downloadCount} kali</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                          title="Buka File"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => handleDeleteDownload(item.id, item.judul)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition"
                          title="Hapus File"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Galeri Foto */}
      {activeTab === 'galeri' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white transition space-y-2 relative group">
              <img
                src={item.url}
                alt={item.judul}
                className="w-full h-40 object-cover rounded-xl border border-slate-200/80"
                referrerPolicy="no-referrer"
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 truncate flex-1 pr-2">{item.judul}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                  {item.kategori}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t">
                <span>{item.tanggal}</span>
                <button
                  onClick={() => handleDeleteGallery(item.id, item.judul)}
                  className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="text-emerald-600" size={18} />
                Tambah {activeTab === 'unduhan' ? 'Dokumen Unduhan Baru' : 'Foto Galeri Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              {activeTab === 'unduhan' ? (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Judul / Nama Dokumen:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Formulir Pendaftaran SPMB 2026"
                      value={downloadForm.judul}
                      onChange={(e) => setDownloadForm({ ...downloadForm, judul: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                      <select
                        value={downloadForm.kategori}
                        onChange={(e) => setDownloadForm({ ...downloadForm, kategori: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="SPMB">SPMB</option>
                        <option value="Kurikulum">Kurikulum</option>
                        <option value="Kesiswaan">Kesiswaan</option>
                        <option value="Panduan">Panduan</option>
                        <option value="Keuangan">Keuangan</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ukuran & Format File:</label>
                      <input
                        type="text"
                        placeholder="Contoh: 1.5 MB (PDF)"
                        value={downloadForm.ukuran}
                        onChange={(e) => setDownloadForm({ ...downloadForm, ukuran: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">URL File (Google Drive / Link Langsung):</label>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/..."
                      value={downloadForm.url}
                      onChange={(e) => setDownloadForm({ ...downloadForm, url: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Judul / Caption Foto:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Lomba Membaca Puisi Antar Kelas"
                      value={galleryForm.judul}
                      onChange={(e) => setGalleryForm({ ...galleryForm, judul: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                      <select
                        value={galleryForm.kategori}
                        onChange={(e) => setGalleryForm({ ...galleryForm, kategori: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="Kegiatan">Kegiatan</option>
                        <option value="Upacara">Upacara</option>
                        <option value="KBM">KBM & Praktikum</option>
                        <option value="Fasilitas">Sarana & Prasarana</option>
                        <option value="Prestasi">Prestasi</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tanggal Foto:</label>
                      <input
                        type="date"
                        value={galleryForm.tanggal}
                        onChange={(e) => setGalleryForm({ ...galleryForm, tanggal: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">URL Gambar Foto:</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={galleryForm.url}
                      onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Media
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
