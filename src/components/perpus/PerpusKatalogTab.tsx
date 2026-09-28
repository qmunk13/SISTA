import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, Grid, List, BookOpen, 
  Download, Eye, Edit2, Trash2, QrCode, Tag, CheckCircle, 
  AlertCircle, BookMarked, X
} from 'lucide-react';
import { BookItem } from '../../types';
import { db } from '../../data/db';
import EBookReaderModal from './EBookReaderModal';

interface PerpusKatalogTabProps {
  onQuickLoan?: (book: BookItem) => void;
}

export default function PerpusKatalogTab({ onQuickLoan }: PerpusKatalogTabProps) {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals
  const [readingBook, setReadingBook] = useState<BookItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [barcodeBook, setBarcodeBook] = useState<BookItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BookItem>>({
    judul: '',
    kodeBuku: '',
    isbn: '',
    penulis: '',
    penerbit: '',
    tahunTerbit: 2026,
    kategori: 'Pelajaran',
    rak: 'Rak A1 - Utama',
    jumlah: 10,
    stok: 10,
    status: 'Tersedia',
    deskripsi: '',
    bahasa: 'Indonesia',
    halaman: 150,
    coverUrl: '',
    pdfUrl: ''
  });

  const loadBooks = () => {
    const list = db.get<BookItem>('perpustakaan_buku');
    setBooks(list);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const categories = [
    'Semua', 'Pelajaran', 'Fiksi', 'Non-Fiksi', 'Ensiklopedia', 'Agama', 'Kamus', 'Komik Edukasi'
  ];

  const filteredBooks = books.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      b.judul.toLowerCase().includes(q) ||
      b.penulis.toLowerCase().includes(q) ||
      b.kodeBuku.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q));

    const matchCat = selectedCategory === 'Semua' || b.kategori === selectedCategory;
    const matchStatus = selectedStatus === 'Semua' || b.status === selectedStatus;

    return matchQuery && matchCat && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingBook(null);
    setFormData({
      judul: '',
      kodeBuku: `BK-${Date.now().toString().slice(-4)}`,
      isbn: '978-602-xxx-xxx-x',
      penulis: '',
      penerbit: '',
      tahunTerbit: new Date().getFullYear(),
      kategori: 'Pelajaran',
      rak: 'Rak A1 - Utama',
      jumlah: 10,
      stok: 10,
      status: 'Tersedia',
      deskripsi: '',
      bahasa: 'Indonesia',
      halaman: 150,
      coverUrl: '',
      pdfUrl: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (book: BookItem) => {
    setEditingBook(book);
    setFormData({ ...book });
    setIsFormModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.kodeBuku) {
      alert('Mohon lengkapi judul dan kode buku!');
      return;
    }

    if (editingBook) {
      const updatedList = books.map(b => b.id === editingBook.id ? { ...b, ...formData, updatedAt: new Date().toISOString() } : b);
      db.set('perpustakaan_buku', updatedList);
      setBooks(updatedList as BookItem[]);
    } else {
      const newBook: BookItem = {
        id: `BK-${Date.now().toString().slice(-6)}`,
        judul: formData.judul || '',
        kodeBuku: formData.kodeBuku || '',
        isbn: formData.isbn,
        penulis: formData.penulis || 'Anonim',
        penerbit: formData.penerbit || 'Penerbit Sekolah',
        tahunTerbit: formData.tahunTerbit || 2026,
        kategori: formData.kategori || 'Pelajaran',
        rak: formData.rak || 'Rak A1',
        jumlah: Number(formData.jumlah) || 1,
        stok: Number(formData.stok) || Number(formData.jumlah) || 1,
        status: (Number(formData.stok) || 0) > 0 ? 'Tersedia' : 'Habis',
        deskripsi: formData.deskripsi || '',
        bahasa: formData.bahasa || 'Indonesia',
        halaman: Number(formData.halaman) || 100,
        coverUrl: formData.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
        pdfUrl: formData.pdfUrl || '',
        createdAt: new Date().toISOString().split('T')[0]
      };
      const updatedList = [newBook, ...books];
      db.set('perpustakaan_buku', updatedList);
      setBooks(updatedList);
    }
    setIsFormModalOpen(false);
  };

  const handleDeleteBook = (id: string) => {
    if (confirm('Yakin ingin menghapus koleksi buku ini dari perpustakaan?')) {
      const updatedList = books.filter(b => b.id !== id);
      db.set('perpustakaan_buku', updatedList);
      setBooks(updatedList);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul buku, penulis, ISBN, kode buku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        {/* Filter Controls & Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'Semua' ? 'Semua Kategori' : c}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="Semua">Semua Status</option>
            <option value="Tersedia">Tersedia</option>
            <option value="Dipinjam Sebagian">Dipinjam Sebagian</option>
            <option value="Habis">Habis Dipinjam</option>
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Tampilan Kartu (Grid)"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Tampilan Tabel (List)"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Buku</span>
          </button>
        </div>
      </div>

      {/* Main Content Render: Grid or Table */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <BookMarked size={48} className="mx-auto text-slate-300" />
          <h3 className="text-base font-extrabold text-slate-800">Tidak ada buku ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau ganti filter kategori buku.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredBooks.map((book) => {
            const isAvailable = (book.stok || 0) > 0;
            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                {/* Book Cover Image */}
                <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-amber-50/50">
                      <BookOpen size={40} className="text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-700 mt-2">E-PERPUSTAKAAN</span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black rounded-full shadow-xs">
                      {book.kategori}
                    </span>
                  </div>

                  {/* Availability Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border backdrop-blur-xs shadow-xs ${
                      isAvailable 
                        ? 'bg-emerald-500/90 text-white border-emerald-400' 
                        : 'bg-rose-500/90 text-white border-rose-400'
                    }`}>
                      {isAvailable ? `Sisa: ${book.stok} Eks.` : 'Habis'}
                    </span>
                  </div>
                </div>

                {/* Book Info Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md w-fit mb-1.5">
                      <Tag size={10} />
                      <span>{book.kodeBuku}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-800 transition">
                      {book.judul}
                    </h4>

                    <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                      ✍️ {book.penulis}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      🏢 {book.penerbit} ({book.tahunTerbit})
                    </p>
                  </div>

                  {/* Location & Quick Action */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>📍 {book.rak}</span>
                      <span>📖 {book.halaman || 100} Hal.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => setReadingBook(book)}
                        className="w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Baca / PDF</span>
                      </button>

                      {onQuickLoan ? (
                        <button
                          onClick={() => onQuickLoan(book)}
                          disabled={!isAvailable}
                          className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <BookMarked size={13} />
                          <span>Pinjam</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setBarcodeBook(book)}
                          className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <QrCode size={13} />
                          <span>Barcode</span>
                        </button>
                      )}
                    </div>

                    {/* Admin Tool Row */}
                    <div className="flex items-center justify-between pt-1 text-slate-400">
                      <button
                        onClick={() => setBarcodeBook(book)}
                        className="hover:text-slate-700 flex items-center gap-1 text-[10px] cursor-pointer"
                      >
                        <QrCode size={12} />
                        <span>QR Tag</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(book)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                          title="Edit Buku"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition"
                          title="Hapus Buku"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Kode & Judul</th>
                  <th className="py-3.5 px-4">Kategori & Rak</th>
                  <th className="py-3.5 px-4">Penulis & Penerbit</th>
                  <th className="py-3.5 px-4 text-center">Total / Stok</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => {
                  const isAvailable = (book.stok || 0) > 0;
                  return (
                    <tr key={book.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                            {book.coverUrl ? (
                              <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen size={16} className="m-auto text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-mono text-[10px] font-extrabold text-amber-800 block">
                              {book.kodeBuku}
                            </span>
                            <span className="font-bold text-slate-900 line-clamp-1">
                              {book.judul}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ISBN: {book.isbn || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                          {book.kategori}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">{book.rak}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{book.penulis}</p>
                        <p className="text-[10px] text-slate-400">{book.penerbit} ({book.tahunTerbit})</p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="text-slate-800">{book.jumlah}</span> / <span className="text-amber-800">{book.stok}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setReadingBook(book)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                            title="Baca E-Book"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setBarcodeBook(book)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="QR Barcode"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(book)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reader Modal */}
      {readingBook && (
        <EBookReaderModal book={readingBook} onClose={() => setReadingBook(null)} />
      )}

      {/* Form Add / Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingBook ? 'Edit Data Koleksi Buku' : 'Tambah Koleksi Buku Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Lengkapi metadata katalog perpustakaan digital</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Judul Buku *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Matematika untuk SD Kelas 4"
                    value={formData.judul || ''}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kode Buku / Nomor Panggil *</label>
                  <input
                    type="text"
                    required
                    placeholder="PEL-MAT-4"
                    value={formData.kodeBuku || ''}
                    onChange={(e) => setFormData({ ...formData, kodeBuku: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Nomor ISBN</label>
                  <input
                    type="text"
                    placeholder="978-602-xxx-xxx-x"
                    value={formData.isbn || ''}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Penulis / Pengarang</label>
                  <input
                    type="text"
                    placeholder="Nama Pengarang"
                    value={formData.penulis || ''}
                    onChange={(e) => setFormData({ ...formData, penulis: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Penerbit</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kemendikbudristek / Erlangga"
                    value={formData.penerbit || ''}
                    onChange={(e) => setFormData({ ...formData, penerbit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kategori Buku</label>
                  <select
                    value={formData.kategori || 'Pelajaran'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {categories.filter(c => c !== 'Semua').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Lokasi Rak</label>
                  <input
                    type="text"
                    placeholder="Rak A1 - Buku Pelajaran"
                    value={formData.rak || ''}
                    onChange={(e) => setFormData({ ...formData, rak: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Jumlah Eksemplar</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.jumlah || 1}
                    onChange={(e) => {
                      const j = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, jumlah: j, stok: j });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Tahun Terbit</label>
                  <input
                    type="number"
                    value={formData.tahunTerbit || 2026}
                    onChange={(e) => setFormData({ ...formData, tahunTerbit: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Link Cover Gambar (URL)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.coverUrl || ''}
                    onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Link File PDF / E-Book Online</label>
                  <input
                    type="url"
                    placeholder="https://buku.kemdikbud.go.id/katalog/..."
                    value={formData.pdfUrl || ''}
                    onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Sinopsis / Ringkasan Buku</label>
                  <textarea
                    rows={3}
                    placeholder="Tulis deskripsi ringkas materi atau sinopsis buku..."
                    value={formData.deskripsi || ''}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode / QR Modal */}
      {barcodeBook && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
              <QrCode size={24} />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                Label Barcode & Lokasi Rak
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">{barcodeBook.judul}</h3>
              <p className="text-xs font-mono font-bold text-slate-500">{barcodeBook.kodeBuku}</p>
            </div>

            {/* Simulated Barcode Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-mono text-2xl tracking-[6px] font-black py-2 bg-white rounded-lg border border-slate-300 select-all">
                |||| ||| ||||| || |||
              </div>
              <p className="font-mono text-[11px] font-bold text-slate-700">
                {barcodeBook.kodeBuku} • {barcodeBook.rak}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBarcodeBook(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition shadow-xs"
              >
                Cetak Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
