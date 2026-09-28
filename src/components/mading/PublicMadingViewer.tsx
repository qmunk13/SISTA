import React, { useState, useEffect } from 'react';
import { 
  Newspaper, Megaphone, Calendar, Sparkles, Heart, Eye, 
  Share2, Search, Filter, User, Tag, Clock, MapPin, Download, AlertCircle, FileText, CheckCircle2, X
} from 'lucide-react';
import { MadingPost, MadingPengumuman, MadingAgenda } from '../../types';
import { db } from '../../data/db';
import { ensureMadingSeedData } from '../../data/madingSeed';
import Swal from 'sweetalert2';

interface PublicMadingViewerProps {
  t?: (idText: string, enText: string) => string;
}

export default function PublicMadingViewer({ t = (idText) => idText }: PublicMadingViewerProps) {
  const [activeTab, setActiveTab] = useState<'karya' | 'edaran' | 'agenda'>('karya');
  const [posts, setPosts] = useState<MadingPost[]>([]);
  const [announcements, setAnnouncements] = useState<MadingPengumuman[]>([]);
  const [agendas, setAgendas] = useState<MadingAgenda[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [activePostDetail, setActivePostDetail] = useState<MadingPost | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MadingPengumuman | null>(null);

  const loadAllData = () => {
    ensureMadingSeedData();
    const storedPosts = db.get<MadingPost>('mading_posts') || [];
    const storedPengumuman = db.get<MadingPengumuman>('mading_pengumuman') || [];
    const storedAgenda = db.get<MadingAgenda>('mading_agenda') || [];

    setPosts(storedPosts);
    setAnnouncements(storedPengumuman);
    setAgendas(storedAgenda);
  };

  useEffect(() => {
    loadAllData();
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

  const filteredPosts = posts.filter(post => {
    const matchesCat = selectedCategory === 'Semua' || post.kategori === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (post.judul && post.judul.toLowerCase().includes(q)) ||
      (post.konten && post.konten.toLowerCase().includes(q)) ||
      (post.penulisNama && post.penulisNama.toLowerCase().includes(q)) ||
      (post.ringkasan && post.ringkasan.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const filteredAnnouncements = announcements.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.judul && item.judul.toLowerCase().includes(q)) ||
      (item.konten && item.konten.toLowerCase().includes(q)) ||
      (item.nomorSurat && item.nomorSurat.toLowerCase().includes(q))
    );
  });

  const filteredAgendas = agendas.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.judul && item.judul.toLowerCase().includes(q)) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(q)) ||
      (item.lokasi && item.lokasi.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-br from-[#1a1967] via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold">
              <Sparkles size={14} className="text-amber-300" />
              <span>{t('Pojok Literasi & Papan Informasi Sekolah', 'School Literacy & Public Bulletin Wall')}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {t('Papan Mading Digital Sekolah', 'Digital Mading & Bulletin Board')}
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {t(
                'Menampilkan karya literasi kreatif siswa (puisi, cerpen, artikel ilmiah), surat edaran resmi kedinasan, serta jadwal kalender agenda kegiatan akademik secara real-time dan terbuka.',
                'Presenting student creative literature (poetry, short stories, scientific essays), official school circulars, and the academic calendar schedule.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
              <span className="block text-2xl font-black text-amber-300">{posts.length}</span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t('Karya Siswa', 'Student Posts')}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
              <span className="block text-2xl font-black text-emerald-300">{announcements.length}</span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t('Surat Edaran', 'Circulars')}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
              <span className="block text-2xl font-black text-sky-300">{agendas.length}</span>
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t('Agenda', 'Events')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'karya', label: t('Mading Karya & Literasi Siswa', 'Student Literature Wall'), icon: Newspaper, count: posts.length },
            { id: 'edaran', label: t('Surat Edaran & Pengumuman', 'Official Circulars'), icon: Megaphone, count: announcements.length },
            { id: 'agenda', label: t('Kalender & Agenda Sekolah', 'Academic Calendar'), icon: Calendar, count: agendas.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1967] text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Search Filter */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('Cari mading, edaran, agenda...', 'Search posts, circulars, events...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-blue-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: KARYA & LITERASI SISWA */}
      {activeTab === 'karya' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="bg-white border rounded-3xl p-12 text-center space-y-3">
              <Newspaper className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">{t('Belum Ada Karya Ditemukan', 'No articles found')}</h4>
              <p className="text-xs text-slate-400">{t('Coba ubah kata kunci pencarian atau pilih kategori lain.', 'Try changing your search term or select another category.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => {
                const isLiked = likedPosts[post.id];
                return (
                  <div
                    key={post.id}
                    onClick={() => setActivePostDetail(post)}
                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col justify-between cursor-pointer border-t-4 border-t-blue-600"
                  >
                    {post.fotoUrl && (
                      <div className="h-44 w-full overflow-hidden relative bg-slate-100">
                        <img
                          src={post.fotoUrl}
                          alt={post.judul}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <span className="absolute top-3 right-3 text-[10px] font-black bg-slate-900/80 text-white px-2.5 py-1 rounded-full backdrop-blur-md">
                          {post.kategori}
                        </span>
                      </div>
                    )}

                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {!post.fotoUrl && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                              {post.kategori}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                              <Clock size={12} /> {post.tanggal || post.tanggalTerbit || 'Terbaru'}
                            </span>
                          </div>
                        )}
                        <h3 className="font-black text-base text-slate-900 line-clamp-2 group-hover:text-blue-600 transition leading-snug">
                          {post.judul}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {post.ringkasan || post.konten}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(post.penulisNama || post.penulis || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <span className="font-bold text-slate-800 text-[11px] block truncate max-w-[130px]">
                              {post.penulisNama || post.penulis || 'Siswa Rombel'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {post.penulisKelas ? `Kelas ${post.penulisKelas}` : (post.kelas || 'Siswa')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleLike(e, post.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              isLiked ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500 hover:text-rose-600'
                            }`}
                          >
                            <Heart size={13} className={isLiked ? 'fill-rose-600 text-rose-600' : ''} />
                            <span>{post.sukaCount || 0}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(`${window.location.origin}/mading#${post.id}`);
                              Swal.fire({
                                title: t('Tautan Disalin!', 'Link Copied!'),
                                text: t('Tautan artikel karya mading berhasil disalin ke clipboard.', 'Article link copied to clipboard.'),
                                icon: 'success',
                                timer: 1200,
                                showConfirmButton: false
                              });
                            }}
                            className="p-1.5 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-full transition"
                            title="Bagikan Tautan"
                          >
                            <Share2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SURAT EDARAN KEDINASAN */}
      {activeTab === 'edaran' && (
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white border rounded-3xl p-12 text-center space-y-3">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">{t('Belum Ada Surat Edaran', 'No circulars found')}</h4>
              <p className="text-xs text-slate-400">{t('Semua surat edaran kedinasan resmi akan ditampilkan di sini.', 'All official circulars will be displayed here.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-rose-200 hover:shadow-md transition cursor-pointer space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-mono">
                        {ann.nomorSurat || 'NO-SURAT/RESMI'}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        ann.prioritas === 'Urgent' || ann.prioritas === 'Darurat'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : ann.prioritas === 'Penting'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {ann.prioritas}
                      </span>
                    </div>

                    <h4 className="font-black text-base text-slate-900 leading-snug">
                      {ann.judul}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {ann.konten}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar size={13} />
                      <span>{ann.tanggal}</span>
                    </div>

                    {ann.lampiranUrl && (
                      <a
                        href={ann.lampiranUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] rounded-xl transition"
                      >
                        <Download size={12} />
                        <span>Unduh PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KALENDER & AGENDA AKADEMIK */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {filteredAgendas.length === 0 ? (
            <div className="bg-white border rounded-3xl p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">{t('Belum Ada Agenda Terjadwal', 'No upcoming events')}</h4>
              <p className="text-xs text-slate-400">{t('Jadwal kegiatan akademik dan agenda sekolah akan muncul di sini.', 'Upcoming school events will appear here.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgendas.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-300 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">
                        {evt.kategori}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        evt.status === 'Berlangsung'
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {evt.status || 'Akan Datang'}
                      </span>
                    </div>

                    <h4 className="font-black text-base text-slate-900 leading-snug">
                      {evt.judul}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {evt.deskripsi}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-blue-600 shrink-0" />
                      <span>{evt.tanggalMulai}{evt.tanggalSelesai && evt.tanggalSelesai !== evt.tanggalMulai ? ` s.d ${evt.tanggalSelesai}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-amber-600 shrink-0" />
                      <span>{evt.waktu}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-rose-600 shrink-0" />
                      <span className="truncate">{evt.lokasi}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL KARYA MADING */}
      {activePostDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                  {activePostDetail.kategori}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">{activePostDetail.judul}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Karya: <b className="text-slate-700">{activePostDetail.penulisNama || activePostDetail.penulis}</b> ({activePostDetail.penulisKelas ? `Kelas ${activePostDetail.penulisKelas}` : activePostDetail.kelas || 'Siswa'}) • {activePostDetail.tanggal || 'Terbaru'}
                </p>
              </div>
              <button
                onClick={() => setActivePostDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {activePostDetail.fotoUrl && (
              <div className="w-full max-h-72 rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={activePostDetail.fotoUrl}
                  alt={activePostDetail.judul}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-light">
              {activePostDetail.konten}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <button
                onClick={(e) => handleLike(e, activePostDetail.id)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl text-xs font-bold transition"
              >
                <Heart size={16} className={likedPosts[activePostDetail.id] ? 'fill-rose-600 text-rose-600' : ''} />
                <span>{activePostDetail.sukaCount || 0} Apresiasi</span>
              </button>

              <button
                onClick={() => setActivePostDetail(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SURAT EDARAN */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase">
                  {selectedAnnouncement.prioritas} • Surat Edaran Resmi
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">{selectedAnnouncement.judul}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Nomor: {selectedAnnouncement.nomorSurat} • Tanggal: {selectedAnnouncement.tanggal}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Sasaran Penerima:</span>
                <span className="font-bold text-slate-800">{selectedAnnouncement.sasaran}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Diterbitkan Oleh:</span>
                <span className="font-bold text-slate-800">{selectedAnnouncement.penulis}</span>
              </div>
            </div>

            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-light">
              {selectedAnnouncement.konten}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              {selectedAnnouncement.lampiranUrl ? (
                <a
                  href={selectedAnnouncement.lampiranUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition shadow-sm"
                >
                  <Download size={14} />
                  <span>Unduh Lampiran Resmi PDF</span>
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition"
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
