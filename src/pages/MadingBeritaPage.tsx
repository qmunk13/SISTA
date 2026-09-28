import React, { useState, useEffect } from 'react';
import { 
  Newspaper, Plus, Search, Filter, Trash2, Edit3, Eye, Calendar, 
  User, Tag, CheckCircle2, AlertCircle, Share2, Sparkles, X, 
  ExternalLink, Bell, Bookmark, Image as ImageIcon, Download
} from 'lucide-react';
import { useStore } from '../store';
import { MadingItem } from '../types';
import { INITIAL_MADING } from '../data/madingSeed';
import { db } from '../data/db';
import { exportToExcel } from '../lib/excel';

export default function MadingBeritaPage() {
  const { teachers, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'mading-list' | 'preview-publik'>('mading-list');

  const [articles, setArticles] = useState<MadingItem[]>(() => {
    const saved = db.get<MadingItem>('mading_articles');
    return (saved && saved.length > 0) ? saved : INITIAL_MADING;
  });

  useEffect(() => {
    db.set('mading_articles', articles);
    // Also mirror to web_news so PublicPortal displays the latest news
    const webNewsFormat = articles.map(a => ({
      id: a.id,
      title: a.judul,
      category: a.kategori,
      date: a.tanggal,
      author: a.penulis,
      summary: a.konten.slice(0, 150) + (a.konten.length > 150 ? '...' : ''),
      content: a.konten,
      image: a.gambarUrl,
      priority: a.prioritas
    }));
    db.set('web_news', webNewsFormat);
    db.set('berita', webNewsFormat);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'web_news' } }));
  }, [articles]);

  const handleExportArticles = () => {
    const rows = articles.map((a, idx) => ({
      'No': idx + 1,
      'Judul Berita / Pengumuman': a.judul,
      'Kategori': a.kategori,
      'Tanggal': a.tanggal,
      'Penulis': a.penulis,
      'Peran Penulis': a.peranPenulis,
      'Target Audiens': a.targetAudiens,
      'Prioritas': a.prioritas,
      'Status': a.status,
      'Isi Lengkap': a.konten
    }));
    exportToExcel(rows, `Data_Mading_Berita_Sekolah_${new Date().toISOString().slice(0, 10)}.xlsx`, 'MADING_BERITA');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<MadingItem | null>(null);
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<MadingItem | null>(null);

  // Form
  const [formData, setFormData] = useState<Partial<MadingItem>>({
    judul: '',
    kategori: 'Pengumuman',
    konten: '',
    penulis: 'Humas Sekolah',
    peranPenulis: 'Admin',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'Publish',
    prioritas: 'Normal',
    gambarUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
    targetAudiens: 'Semua',
  });

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.konten) {
      alert('Judul dan Konten Berita/Pengumuman wajib diisi!');
      return;
    }

    if (editingArticle) {
      setArticles(prev => prev.map(a => a.id === editingArticle.id ? { ...a, ...formData } as MadingItem : a));
      alert('Berita / Pengumuman berhasil diperbarui!');
    } else {
      const newItem: MadingItem = {
        id: `MAD-${Date.now().toString().slice(-4)}`,
        judul: formData.judul || '',
        kategori: (formData.kategori as any) || 'Pengumuman',
        konten: formData.konten || '',
        penulis: formData.penulis || 'Humas Sekolah',
        peranPenulis: (formData.peranPenulis as any) || 'Admin',
        tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
        status: (formData.status as any) || 'Publish',
        prioritas: (formData.prioritas as any) || 'Normal',
        gambarUrl: formData.gambarUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
        targetAudiens: (formData.targetAudiens as any) || 'Semua',
      };
      setArticles(prev => [newItem, ...prev]);
      alert('Berita / Pengumuman baru berhasil dipublikasikan!');
    }

    setIsModalOpen(false);
    setEditingArticle(null);
  };

  const handleDelete = (id: string, judul: string) => {
    if (confirm(`Hapus pengumuman "${judul}"?`)) {
      setArticles(prev => prev.filter(a => a.id !== id));
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchSearch = (a.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.konten || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.penulis || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedKategori === 'Semua' || a.kategori === selectedKategori;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Newspaper size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Pusat Informasi & Mading Digital
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Papan Mading & Berita Sekolah</h1>
          <p className="text-violet-100 text-xs sm:text-sm">
            Publikasi berita prestasi, pengumuman ujian, agenda kegiatan sekolah, dan karya tulis siswa yang tampil di portal publik & portal siswa
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportArticles}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl backdrop-blur-xs border border-white/20 shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Download size={16} />
            <span>Ekspor Berita & Mading (.xlsx)</span>
          </button>
          <button
            onClick={() => {
              setEditingArticle(null);
              setFormData({
                judul: '',
                kategori: 'Pengumuman',
                konten: '',
                penulis: 'Humas Sekolah',
                peranPenulis: 'Admin',
                tanggal: new Date().toISOString().split('T')[0],
                status: 'Publish',
                prioritas: 'Normal',
                gambarUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
                targetAudiens: 'Semua',
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Tulis Berita / Pengumuman</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 max-w-md">
        <button
          onClick={() => setActiveSubTab('mading-list')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'mading-list' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Newspaper size={14} />
          <span>Kelola Artikel & Berita ({articles.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('preview-publik')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'preview-publik' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={14} />
          <span>Tampilan Mading Siswa</span>
        </button>
      </div>

      {/* SUBTAB 1: KELOLA MADING */}
      {activeSubTab === 'mading-list' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berita, pengumuman, penulis..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={selectedKategori}
                onChange={e => setSelectedKategori(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Pengumuman">Pengumuman</option>
                <option value="Berita">Berita</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Agenda">Agenda</option>
                <option value="Artikel Siswa">Artikel Siswa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map(art => (
              <div key={art.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={art.gambarUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'}
                      alt={art.judul}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/95 text-purple-900 shadow-xs backdrop-blur-xs">
                        {art.kategori}
                      </span>
                      {art.prioritas === 'Penting' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-xs">
                          Penting
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar size={13} />
                      <span>{art.tanggal}</span>
                      <span>•</span>
                      <User size={13} />
                      <span className="font-semibold text-slate-600">{art.penulis}</span>
                    </div>

                    <h3 className="font-black text-base text-slate-900 line-clamp-2 leading-snug">
                      {art.judul}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {art.konten}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                    Audiens: {art.targetAudiens}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedArticleDetail(art)}
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Lihat Detail"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingArticle(art);
                        setFormData(art);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(art.id, art.judul)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PREVIEW MADING DIGITAL */}
      {activeSubTab === 'preview-publik' && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-amber-400 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Papan Mading Interaktif Siswa & Guru
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">Update Realtime</span>
            </div>
            <h2 className="text-2xl font-black">{settings.namaSekolah || 'SISTA ROMBEL DIGITAL'}</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Selamat datang di papan informasi resmi sekolah. Ikuti terus perkembangan kegiatan, prestasi akademik dan non-akademik, serta pengumuman penting pembelajaran.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.filter(a => a.status === 'Publish').map(art => (
              <div key={art.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg transition p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={art.gambarUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'}
                    alt={art.judul}
                    className="w-24 h-24 rounded-2xl object-cover shadow-xs shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {art.kategori}
                    </span>
                    <h3 className="font-black text-sm text-slate-900 leading-snug line-clamp-2 pt-1">
                      {art.judul}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Oleh <span className="text-purple-700 font-bold">{art.penulis}</span> • {art.tanggal}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {art.konten}
                </p>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400">Untuk: {art.targetAudiens}</span>
                  <button
                    onClick={() => setSelectedArticleDetail(art)}
                    className="text-xs font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Baca Selengkapnya</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedArticleDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <span className="px-3 py-1 bg-purple-100 text-purple-900 text-xs font-black uppercase rounded-full">
                {selectedArticleDetail.kategori}
              </span>
              <button onClick={() => setSelectedArticleDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>

            <img
              src={selectedArticleDetail.gambarUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'}
              alt={selectedArticleDetail.judul}
              className="w-full h-64 object-cover rounded-2xl shadow-xs"
            />

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {selectedArticleDetail.judul}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Penulis: <b className="text-slate-700">{selectedArticleDetail.penulis}</b> ({selectedArticleDetail.peranPenulis})</span>
                <span>•</span>
                <span>{selectedArticleDetail.tanggal}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pt-2">
              {selectedArticleDetail.konten}
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedArticleDetail(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">
                {editingArticle ? 'Edit Pengumuman / Berita' : 'Tulis Pengumuman & Berita Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Judul Berita / Pengumuman *</label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="Contoh: Jadwal Ujian Tengah Semester..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={e => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Berita">Berita Sekolah</option>
                    <option value="Prestasi">Prestasi Siswa/Guru</option>
                    <option value="Agenda">Agenda Mendatang</option>
                    <option value="Artikel Siswa">Artikel & Karya Siswa</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Target Audiens</label>
                  <select
                    value={formData.targetAudiens}
                    onChange={e => setFormData({ ...formData, targetAudiens: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Semua">Semua (Publik & Siswa)</option>
                    <option value="Siswa">Khusus Siswa</option>
                    <option value="Orang Tua">Khusus Orang Tua</option>
                    <option value="Guru">Khusus Guru & Staf</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">URL Gambar Banner / Foto</label>
                <input
                  type="text"
                  value={formData.gambarUrl}
                  onChange={e => setFormData({ ...formData, gambarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Nama Penulis / Humas</label>
                  <input
                    type="text"
                    value={formData.penulis}
                    onChange={e => setFormData({ ...formData, penulis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Prioritas Tampilan</label>
                  <select
                    value={formData.prioritas}
                    onChange={e => setFormData({ ...formData, prioritas: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Penting">Penting (Highlight)</option>
                    <option value="Urgent">Urgent (Darurat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Isi Pengumuman / Berita Lengkap *</label>
                <textarea
                  rows={6}
                  required
                  value={formData.konten}
                  onChange={e => setFormData({ ...formData, konten: e.target.value })}
                  placeholder="Tuliskan isi pengumuman atau berita secara lengkap..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg"
                >
                  Publikasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
