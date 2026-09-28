import React, { useState, useEffect } from 'react';
import { 
  Newspaper, Heart, MessageCircle, Eye, Plus, 
  Search, Filter, User, Calendar, Sparkles, X, Share2, Tag 
} from 'lucide-react';
import { MadingPost } from '../../types';
import { db } from '../../data/db';

export default function MadingKaryaTab() {
  const [posts, setPosts] = useState<MadingPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePostDetail, setActivePostDetail] = useState<MadingPost | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<Partial<MadingPost>>({
    judul: '',
    kategori: 'Artikel & Opini',
    penulisNama: '',
    penulisKelas: '5A',
    konten: '',
    ringkasan: '',
    fotoUrl: '',
    tags: ['Karya Siswa', 'Literasi']
  });

  const loadData = () => {
    setPosts(db.get<MadingPost>('mading_posts'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = [
    'Semua', 
    'Artikel & Opini', 
    'Cerpen & Puisi', 
    'Prestasi Siswa', 
    'Komik & Seni', 
    'Inspirasi'
  ];

  const handleLike = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const isCurrentlyLiked = likedPosts[postId];
    const updated = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          sukaCount: (p.sukaCount || 0) + (isCurrentlyLiked ? -1 : 1)
        };
      }
      return p;
    });

    db.set('mading_posts', updated);
    setPosts(updated);
    setLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
    if (activePostDetail?.id === postId) {
      setActivePostDetail(prev => prev ? { ...prev, sukaCount: (prev.sukaCount || 0) + (isCurrentlyLiked ? -1 : 1) } : null);
    }
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.konten || !formData.penulisNama) {
      alert('Judul, penulis, dan konten karya wajib diisi!');
      return;
    }

    const newPost: MadingPost = {
      id: `KARYA-${Date.now().toString().slice(-4)}`,
      judul: formData.judul || '',
      kategori: formData.kategori as any || 'Artikel & Opini',
      penulisNama: formData.penulisNama || '',
      penulisKelas: formData.penulisKelas || '5A',
      penulisPeran: 'Siswa',
      tanggalTerbit: new Date().toISOString().split('T')[0],
      konten: formData.konten || '',
      ringkasan: formData.ringkasan || formData.konten?.slice(0, 120) + '...',
      fotoUrl: formData.fotoUrl || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80',
      tags: formData.tags || ['Karya Murid', 'Literasi'],
      sukaCount: 1,
      komentarCount: 0,
      status: 'Terbit'
    };

    const updated = [newPost, ...posts];
    db.set('mading_posts', updated);
    setPosts(updated);
    setIsAddModalOpen(false);
  };

  const filteredPosts = posts.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQuery = p.judul.toLowerCase().includes(q) || p.penulisNama.toLowerCase().includes(q) || p.konten.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
    return matchQuery && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Category Pills & Action Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari karya siswa, cerpen, puisi, artikel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Kirim Karya Baru</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mading Board Grid (Masonry look) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPosts.map((post) => {
          const isLiked = likedPosts[post.id];
          return (
            <div
              key={post.id}
              onClick={() => setActivePostDetail(post)}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:border-rose-300 hover:shadow-md transition duration-200 cursor-pointer"
            >
              {/* Photo Banner */}
              {post.fotoUrl && (
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={post.fotoUrl}
                    alt={post.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black rounded-full shadow-xs">
                      {post.kategori}
                    </span>
                  </div>
                </div>
              )}

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-1.5">
                    <Calendar size={12} />
                    <span>{post.tanggalTerbit}</span>
                    <span>•</span>
                    <span>{post.penulisPeran || 'Siswa'}</span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 group-hover:text-rose-600 transition leading-snug">
                    {post.judul}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3 mt-2 leading-relaxed">
                    {post.ringkasan || post.konten}
                  </p>
                </div>

                {/* Footer on Card: Author & Likes */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                      {post.penulisNama.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-800 block text-[11px] truncate max-w-[120px]">
                        {post.penulisNama}
                      </span>
                      <span className="text-[9px] text-slate-400">Kelas {post.penulisKelas || '5A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleLike(e, post.id)}
                      className={`flex items-center gap-1 text-xs font-bold transition ${
                        isLiked ? 'text-rose-600 font-black' : 'text-slate-400 hover:text-rose-600'
                      }`}
                    >
                      <Heart size={14} className={isLiked ? 'fill-rose-600' : ''} />
                      <span>{post.sukaCount || 0}</span>
                    </button>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <MessageCircle size={14} />
                      <span>{post.komentarCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Baca Lengkap Karya Mading */}
      {activePostDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Header / Banner */}
            <div className="relative h-56 bg-slate-900 shrink-0">
              {activePostDetail.fotoUrl ? (
                <img
                  src={activePostDetail.fotoUrl}
                  alt={activePostDetail.judul}
                  className="w-full h-full object-cover opacity-80"
                />
              ) : null}
              <button
                onClick={() => setActivePostDetail(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-slate-900 transition"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase">
                  {activePostDetail.kategori}
                </span>
                <h3 className="text-xl font-black mt-1 leading-tight">{activePostDetail.judul}</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    {activePostDetail.penulisNama.charAt(0)}
                  </div>
                  <div>
                    <strong className="text-slate-900 block">{activePostDetail.penulisNama}</strong>
                    <span className="text-[10px] text-slate-400">Kelas {activePostDetail.penulisKelas || '5A'} • {activePostDetail.tanggalTerbit}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleLike(e, activePostDetail.id)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    likedPosts[activePostDetail.id]
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-rose-50'
                  }`}
                >
                  <Heart size={14} className={likedPosts[activePostDetail.id] ? 'fill-rose-600' : ''} />
                  <span>Apresiasi ({activePostDetail.sukaCount || 0})</span>
                </button>
              </div>

              {/* Story Content */}
              <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif text-slate-800 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                {activePostDetail.konten}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {activePostDetail.tags?.map(t => (
                  <span key={t} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Post Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Newspaper size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Kirim Karya ke Mading Digital</h3>
                  <p className="text-xs text-slate-400">Publikasikan cerpen, puisi, opini, atau karya prestasi</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Judul Karya / Tulisan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Menggapai Bintang di Langit Literasi"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori || 'Artikel & Opini'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Artikel & Opini">Artikel & Opini</option>
                    <option value="Cerpen & Puisi">Cerpen & Puisi</option>
                    <option value="Prestasi Siswa">Prestasi Siswa</option>
                    <option value="Komik & Seni">Komik & Seni</option>
                    <option value="Inspirasi">Inspirasi</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Nama Penulis *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Siswa"
                    value={formData.penulisNama || ''}
                    onChange={(e) => setFormData({ ...formData, penulisNama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kelas</label>
                  <input
                    type="text"
                    placeholder="5A"
                    value={formData.penulisKelas || '5A'}
                    onChange={(e) => setFormData({ ...formData, penulisKelas: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">URL Foto Sampul / Ilustrasi</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.fotoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Isi Lengkap Karya / Naskah *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Tulis naskah cerita, bait puisi, atau uraian artikel di sini..."
                  value={formData.konten || ''}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-serif"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Terbitkan di Mading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
