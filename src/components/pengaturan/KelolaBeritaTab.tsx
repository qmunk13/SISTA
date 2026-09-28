import React, { useState } from 'react';
import { db } from '../../data/db';
import { Newspaper, Plus, Edit2, Trash2, X, Eye, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function KelolaBeritaTab() {
  const [newsList, setNewsList] = useState<any[]>(() => {
    const fromDb = db.get<any>('berita');
    if (Array.isArray(fromDb) && fromDb.length > 0) return fromDb;
    const fromWeb = db.get<any>('web_news');
    return Array.isArray(fromWeb) ? fromWeb : [];
  });

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [notification, setNotification] = useState('');

  const [formData, setFormData] = useState({
    judul: '',
    kategori: 'Berita',
    penulis: 'Admin',
    tanggal: new Date().toISOString().split('T')[0],
    ringkasan: '',
    isi: '',
    gambar: ''
  });

  const saveToDb = (newList: any[]) => {
    setNewsList(newList);
    db.set('berita', newList);
    db.set('web_news', newList);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      judul: '',
      kategori: 'Berita',
      penulis: 'Admin',
      tanggal: new Date().toISOString().split('T')[0],
      ringkasan: '',
      isi: '',
      gambar: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      judul: item.judul || '',
      kategori: item.kategori || 'Berita',
      penulis: item.penulis || 'Admin',
      tanggal: item.tanggal || '',
      ringkasan: item.ringkasan || '',
      isi: item.isi || '',
      gambar: item.gambar || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Hapus artikel "${judul}"?`)) {
      const updated = newsList.filter(n => n.id !== id);
      saveToDb(updated);
      setNotification('Artikel berita berhasil dihapus.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const updated = newsList.map(n => n.id === editingItem.id ? { ...n, ...formData } : n);
      saveToDb(updated);
      setNotification('Artikel berhasil diperbarui!');
    } else {
      const newItem = {
        id: String(Date.now()),
        ...formData
      };
      saveToDb([newItem, ...newsList]);
      setNotification('Artikel berita baru berhasil diterbitkan!');
    }
    setShowModal(false);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Newspaper className="text-blue-600" size={20} />
            Kelola Berita, Artikel & Pengumuman Portal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Tulis dan publikasikan warta lembaga, galeri prestasi, & pengumuman resmi ke portal publik.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-xs transition active:scale-95"
        >
          <Plus size={15} />
          <span>Tulis Berita Baru</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {newsList.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed rounded-2xl">
          <Newspaper size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-600 text-sm">Belum Ada Artikel Berita</p>
          <p className="text-xs text-slate-400 mt-1">Klik tombol 'Tulis Berita Baru' untuk menerbitkan artikel pertama.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newsList.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {item.kategori}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{item.tanggal}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{item.judul}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.ringkasan}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">Oleh: <strong className="text-slate-600">{item.penulis}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition"
                    title="Pratinjau Artikel"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                    title="Edit Artikel"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.judul)}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition"
                    title="Hapus Artikel"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Berita */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Newspaper className="text-blue-600" size={18} />
                {editingItem ? 'Edit Artikel Berita' : 'Tulis Artikel Berita Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Artikel:</label>
                <input
                  type="text"
                  placeholder="Contoh: Siswa Raih Medali Emas OSN 2026"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Berita">Berita Umum</option>
                    <option value="Pengumuman">Pengumuman Resmi</option>
                    <option value="Prestasi">Prestasi Siswa & Guru</option>
                    <option value="Ekstrakurikuler">Ekstrakurikuler</option>
                    <option value="Opini">Opini & Literasi</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penulis / Sumber:</label>
                  <input
                    type="text"
                    value={formData.penulis}
                    onChange={(e) => setFormData({ ...formData, penulis: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Gambar Sampul (Cover Image):</label>
                <input
                  type="text"
                  value={formData.gambar}
                  onChange={(e) => setFormData({ ...formData, gambar: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ringkasan Singkat (Lead Paragraph):</label>
                <textarea
                  rows={2}
                  value={formData.ringkasan}
                  onChange={(e) => setFormData({ ...formData, ringkasan: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Isi Lengkap Artikel:</label>
                <textarea
                  rows={5}
                  value={formData.isi}
                  onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Terbitkan Artikel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Berita */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                {previewItem.kategori}
              </span>
              <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            {previewItem.gambar && (
              <img
                src={previewItem.gambar}
                alt={previewItem.judul}
                className="w-full h-44 object-cover rounded-2xl border"
                referrerPolicy="no-referrer"
              />
            )}
            <h3 className="font-bold text-slate-900 text-base leading-snug">{previewItem.judul}</h3>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{previewItem.tanggal}</span>
              <span>&bull;</span>
              <span>Oleh: {previewItem.penulis}</span>
            </div>
            <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              {previewItem.ringkasan}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {previewItem.isi}
            </p>
            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
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
