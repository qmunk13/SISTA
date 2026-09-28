import React, { useState } from 'react';
import { X, BookOpen, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Bookmark, Share2 } from 'lucide-react';
import { BookItem } from '../../types';

interface EBookReaderModalProps {
  book: BookItem;
  onClose: () => void;
}

export default function EBookReaderModal({ book, onClose }: EBookReaderModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const totalPages = book.halaman || 120;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 text-slate-100 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {book.judul}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {book.penulis} • {book.penerbit} ({book.tahunTerbit})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {book.pdfUrl && (
              <a
                href={book.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <ExternalLink size={14} />
                <span>Buka Sumber Asli</span>
              </a>
            )}
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-xl border transition ${
                isBookmarked ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Tandai Halaman (Bookmark)"
            >
              <Bookmark size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Tutup Reader"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Reader Center Screen */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-slate-900/60">
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-12 w-full max-w-2xl min-h-[520px] transition-transform duration-150 border border-slate-200 flex flex-col justify-between"
          >
            {/* Header of Simulated Book Page */}
            <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>{book.kategori} • {book.kodeBuku}</span>
              <span>Bab {Math.ceil(currentPage / 15)}: Pembahasan Materi</span>
            </div>

            {/* Simulated Content Body */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-700 flex-1">
              <h4 className="text-lg font-black text-slate-900">
                {book.judul} (Halaman {currentPage})
              </h4>
              
              {currentPage === 1 ? (
                <div className="space-y-4">
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 mb-4 flex items-center justify-center border border-slate-200">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen size={48} className="text-slate-300" />
                    )}
                  </div>
                  <p className="font-medium text-slate-800">
                    <strong>Sinopsis & Ringkasan Resmi:</strong>
                  </p>
                  <p className="text-slate-600 italic">
                    "{book.deskripsi || 'Buku literasi bermutu tinggi untuk menunjang wawasan dan kompetensi murid di lingkungan sekolah.'}"
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div><strong>ISBN:</strong> {book.isbn || '-'}</div>
                    <div><strong>Lokasi Rak:</strong> {book.rak}</div>
                    <div><strong>Bahasa:</strong> {book.bahasa || 'Indonesia'}</div>
                    <div><strong>Total Halaman:</strong> {totalPages} Hlm.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>
                    Pembelajaran literasi aktif mengembangkan daya kritis, logika analitis, dan imajinasi kreatif anak. Dalam bagian ini, peserta didik diajak untuk mengamati fenomena kontekstual, merumuskan hipotesis sederhana, dan mendiskusikan temuan bersama rekan sekelas.
                  </p>
                  <p>
                    Setiap bab disusun secara sistematis berdasarkan capaian pembelajaran Kurikulum Merdeka yang menekankan pada nilai-nilai Profil Pelajar Pancasila: beriman, bertakwa kepada Tuhan YME, berakhlak mulia, berkebinekaan global, bergotong royong, mandiri, bernalar kritis, dan kreatif.
                  </p>
                  <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100 text-indigo-900 text-xs font-medium my-4">
                    💡 <strong>Pertanyaan Refleksi Siswa:</strong> Bagaimana penerapan konsep bab ini dapat membantu memecahkan permasalahan nyata yang kalian temui di sekitar lingkungan sekolah atau tempat tinggalmu?
                  </div>
                </div>
              )}
            </div>

            {/* Footer of Simulated Book Page */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400 font-mono">
              <span>Perpustakaan Digital SISTA ROMBEL</span>
              <span className="font-bold text-slate-700">{currentPage} / {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Reader Bottom Navigation & Zoom Controls */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel(z => Math.max(70, z - 10))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Perkecil Tampilan"
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-slate-400 w-12 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Perbesar Tampilan"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Page Selector & Prev/Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-xl border border-slate-700">
              <span className="text-slate-400">Halaman</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  }
                }}
                className="w-12 bg-slate-800 text-center text-white rounded font-bold font-mono py-0.5 border border-slate-600 focus:outline-none"
              />
              <span className="text-slate-400">dari {totalPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
