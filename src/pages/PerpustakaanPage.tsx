import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Filter, Trash2, Edit3, CheckCircle2, 
  Clock, AlertCircle, Bookmark, User, Calendar, RotateCcw, 
  FileText, Download, Check, X, Library, BookMarked, Sparkles
} from 'lucide-react';
import { useStore } from '../store';
import { BookItem, BookLoan } from '../types';
import { INITIAL_BOOKS, INITIAL_LOANS } from '../data/perpustakaanSeed';
import { db } from '../data/db';
import { exportToExcel } from '../lib/excel';
import CustomDropdown from '../components/common/CustomDropdown';

export default function PerpustakaanPage() {
  const { students, teachers, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'katalog' | 'peminjaman' | 'tambah-buku' | 'riwayat'>('katalog');
  
  // State for books and loans
  const [books, setBooks] = useState<BookItem[]>(() => {
    const saved = db.get<BookItem>('perpus_buku');
    return (saved && saved.length > 0) ? saved : INITIAL_BOOKS;
  });

  const [loans, setLoans] = useState<BookLoan[]>(() => {
    const saved = db.get<BookLoan>('perpus_pinjam');
    return (saved && saved.length > 0) ? saved : INITIAL_LOANS;
  });

  useEffect(() => {
    db.set('perpus_buku', books);
  }, [books]);

  useEffect(() => {
    db.set('perpus_pinjam', loans);
  }, [loans]);

  // Export functions
  const handleExportBooks = () => {
    const rows = books.map((b, idx) => ({
      'No': idx + 1,
      'Kode Buku': b.kodeBuku,
      'ISBN': b.isbn,
      'Judul Buku': b.judul,
      'Pengarang': b.pengarang,
      'Penerbit': b.penerbit,
      'Tahun Terbit': b.tahunTerbit,
      'Kategori': b.kategori,
      'Lokasi Rak': b.lokasiRak,
      'Total Stok': b.stokTotal,
      'Stok Tersedia': b.stokTersedia,
      'Deskripsi': b.deskripsi
    }));
    exportToExcel(rows, `Katalog_Perpustakaan_${new Date().toISOString().slice(0, 10)}.xlsx`, 'KATALOG_BUKU');
  };

  const handleExportLoans = () => {
    const rows = loans.map((l, idx) => ({
      'No': idx + 1,
      'Kode Peminjaman': l.kodePeminjaman,
      'Judul Buku': l.judulBuku,
      'Tipe Peminjam': l.tipePeminjam,
      'Nama Peminjam': l.namaPeminjam,
      'Kelas / Jabatan': l.kelasOrDepartemen,
      'Tanggal Pinjam': l.tanggalPinjam,
      'Tenggat Pengembalian': l.tenggatKembali,
      'Tanggal Kembali': l.tanggalKembali || '-',
      'Status': l.status,
      'Denda (Rp)': l.denda || 0,
      'Catatan': l.catatan || '-'
    }));
    exportToExcel(rows, `Sirkulasi_Peminjaman_Buku_${new Date().toISOString().slice(0, 10)}.xlsx`, 'SIRKULASI_PINJAM');
  };

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  // Modal / Form state
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);

  // Form input states
  const [bookForm, setBookForm] = useState<Partial<BookItem>>({
    kodeBuku: '',
    isbn: '',
    judul: '',
    pengarang: '',
    penerbit: '',
    tahunTerbit: new Date().getFullYear().toString(),
    kategori: 'Buku Paket/Pelajaran',
    lokasiRak: 'Rak A-01',
    stokTotal: 10,
    stokTersedia: 10,
    deskripsi: '',
    coverUrl: '',
  });

  const [loanForm, setLoanForm] = useState({
    bukuId: '',
    peminjamType: 'Siswa' as 'Siswa' | 'Guru',
    peminjamId: '',
    tanggalPinjam: new Date().toISOString().split('T')[0],
    durasiHari: 7,
    catatan: '',
  });

  // Save to DB when changed
  useEffect(() => {
    db.set('perpus_buku', books);
  }, [books]);

  useEffect(() => {
    db.set('perpus_pinjam', loans);
  }, [loans]);

  // Statistics
  const totalJudul = books.length;
  const totalEksemplar = books.reduce((acc, b) => acc + (Number(b.stokTotal) || 0), 0);
  const totalDipinjam = loans.filter(l => l.status === 'Dipinjam' || l.status === 'Terlambat').length;
  const totalTersedia = totalEksemplar - totalDipinjam;

  // Filter books
  const filteredBooks = books.filter(b => {
    const matchSearch = (b.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.kodeBuku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.pengarang || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.isbn || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Semua' || b.kategori === selectedCategory;
    return matchSearch && matchCat;
  });

  // Filter loans
  const filteredLoans = loans.filter(l => {
    const matchSearch = (l.judulBuku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (l.namaPeminjam || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (l.kodePeminjaman || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStat = selectedStatus === 'Semua' || l.status === selectedStatus;
    return matchSearch && matchStat;
  });

  // Handle Save Book
  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.judul || !bookForm.kodeBuku) {
      alert('Mohon lengkapi Judul Buku dan Kode Buku!');
      return;
    }

    if (editingBook) {
      setBooks(prev => prev.map(b => b.id === editingBook.id ? { ...b, ...bookForm } as BookItem : b));
      alert('Data buku berhasil diperbarui!');
    } else {
      const newBook: BookItem = {
        id: `BK-${Date.now().toString().slice(-4)}`,
        kodeBuku: bookForm.kodeBuku || `BP-${Date.now()}`,
        isbn: bookForm.isbn || '-',
        judul: bookForm.judul || '',
        pengarang: bookForm.pengarang || '-',
        penerbit: bookForm.penerbit || '-',
        tahunTerbit: bookForm.tahunTerbit || '2026',
        kategori: (bookForm.kategori as any) || 'Buku Paket/Pelajaran',
        lokasiRak: bookForm.lokasiRak || 'Rak A-01',
        stokTotal: Number(bookForm.stokTotal) || 1,
        stokTersedia: Number(bookForm.stokTotal) || 1,
        deskripsi: bookForm.deskripsi || '',
        coverUrl: bookForm.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setBooks(prev => [newBook, ...prev]);
      alert('Buku baru berhasil ditambahkan ke katalog perpustakaan!');
    }

    setIsAddBookModalOpen(false);
    setEditingBook(null);
    setBookForm({
      kodeBuku: '',
      isbn: '',
      judul: '',
      pengarang: '',
      penerbit: '',
      tahunTerbit: new Date().getFullYear().toString(),
      kategori: 'Buku Paket/Pelajaran',
      lokasiRak: 'Rak A-01',
      stokTotal: 10,
      stokTersedia: 10,
      deskripsi: '',
      coverUrl: '',
    });
  };

  // Handle Delete Book
  const handleDeleteBook = (id: string, judul: string) => {
    if (confirm(`Yakin ingin menghapus buku "${judul}" dari katalog?`)) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  // Handle Submit Loan
  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.bukuId || !loanForm.peminjamId) {
      alert('Mohon pilih Buku dan Peminjam!');
      return;
    }

    const selectedBook = books.find(b => b.id === loanForm.bukuId);
    if (!selectedBook) {
      alert('Buku tidak ditemukan');
      return;
    }

    if (selectedBook.stokTersedia <= 0) {
      alert('Stok buku ini sedang habis atau seluruhnya sedang dipinjam!');
      return;
    }

    let peminjamNama = '';
    let peminjamKelasOrDept = '';

    if (loanForm.peminjamType === 'Siswa') {
      const s = students.find(item => item.id === loanForm.peminjamId);
      peminjamNama = s?.name || 'Siswa';
      peminjamKelasOrDept = s?.class || (s as any)?.kelas || 'Kelas Siswa';
    } else {
      const t = teachers.find(item => item.id === loanForm.peminjamId);
      peminjamNama = t?.name || 'Guru';
      peminjamKelasOrDept = t?.subject || t?.role || 'Tenaga Pendidik';
    }

    const pinjamDate = new Date(loanForm.tanggalPinjam);
    const tenggatDate = new Date(pinjamDate);
    tenggatDate.setDate(tenggatDate.getDate() + Number(loanForm.durasiHari));

    const newLoan: BookLoan = {
      id: `LN-${Date.now().toString().slice(-6)}`,
      kodePeminjaman: `PJ-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(loans.length + 1).toString().padStart(2, '0')}`,
      bukuId: selectedBook.id,
      judulBuku: selectedBook.judul,
      peminjamId: loanForm.peminjamId,
      namaPeminjam: peminjamNama,
      tipePeminjam: loanForm.peminjamType,
      kelasOrDepartemen: peminjamKelasOrDept,
      tanggalPinjam: loanForm.tanggalPinjam,
      tenggatKembali: tenggatDate.toISOString().split('T')[0],
      status: 'Dipinjam',
      denda: 0,
      catatan: loanForm.catatan,
    };

    // Update book stock
    setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, stokTersedia: Math.max(0, b.stokTersedia - 1) } : b));
    setLoans(prev => [newLoan, ...prev]);

    alert(`Peminjaman buku "${selectedBook.judul}" untuk "${peminjamNama}" berhasil dicatat!`);
    setIsLoanModalOpen(false);
  };

  // Handle Return Book
  const handleReturnBook = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (confirm(`Konfirmasi pengembalian buku "${loan.judulBuku}" oleh ${loan.namaPeminjam}?`)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tenggatDate = new Date(loan.tenggatKembali);
      const returnDate = new Date(todayStr);

      let denda = 0;
      if (returnDate > tenggatDate) {
        const diffDays = Math.ceil((returnDate.getTime() - tenggatDate.getTime()) / (1000 * 60 * 60 * 24));
        denda = diffDays * 1000; // Rp 1.000 / hari
      }

      setLoans(prev => prev.map(l => l.id === loanId ? {
        ...l,
        status: 'Kembali',
        tanggalKembali: todayStr,
        denda: denda,
      } : l));

      // Restore book available stock
      setBooks(prev => prev.map(b => b.id === loan.bukuId ? { ...b, stokTersedia: b.stokTersedia + 1 } : b));

      alert(`Buku berhasil dikembalikan! ${denda > 0 ? `Terdapat denda keterlambatan sebesar Rp ${denda.toLocaleString('id-ID')}` : 'Tidak ada denda.'}`);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Library size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Sistem Perpustakaan Digital
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Perpustakaan & Katalog Buku (E-Perpus)</h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            Katalog buku kurikulum merdeka, sirkulasi peminjaman, pengembalian, dan pencatatan denda otomatis
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportBooks}
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl backdrop-blur-xs border border-white/20 shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor Katalog (.xlsx)</span>
          </button>
          <button
            onClick={handleExportLoans}
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl backdrop-blur-xs border border-white/20 shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor Sirkulasi (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <BookMarked size={16} />
            <span>Peminjaman Baru</span>
          </button>
          <button
            onClick={() => {
              setEditingBook(null);
              setBookForm({
                kodeBuku: `BP-${Date.now().toString().slice(-4)}`,
                isbn: '',
                judul: '',
                pengarang: '',
                penerbit: '',
                tahunTerbit: new Date().getFullYear().toString(),
                kategori: 'Buku Paket/Pelajaran',
                lokasiRak: 'Rak A-01',
                stokTotal: 10,
                stokTersedia: 10,
                deskripsi: '',
                coverUrl: '',
              });
              setIsAddBookModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Judul Buku</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Judul</span>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">{totalJudul}</p>
          <span className="text-[10px] text-slate-500 font-medium">Buku & Referensi Terdaftar</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Eksemplar</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-700">{totalEksemplar}</p>
          <span className="text-[10px] text-slate-500 font-medium">Fisik Buku di Perpustakaan</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sedang Dipinjam</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{totalDipinjam}</p>
          <span className="text-[10px] text-amber-700 font-medium">Sirkulasi Aktif</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stok Tersedia</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{totalTersedia}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Siap Dipinjam di Rak</span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 max-w-xl">
        <button
          onClick={() => setActiveSubTab('katalog')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'katalog' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen size={14} />
          <span>Katalog Buku ({books.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('peminjaman')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'peminjaman' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={14} />
          <span>Sirkulasi & Peminjaman ({loans.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: KATALOG BUKU */}
      {activeSubTab === 'katalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul, ISBN, pengarang, kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div className="w-full sm:w-56">
              <CustomDropdown
                id="perpus-kategori-filter"
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                options={[
                  { value: 'Semua', label: 'Semua Kategori' },
                  { value: 'Buku Paket/Pelajaran', label: 'Buku Paket/Pelajaran' },
                  { value: 'Referensi/Kamus', label: 'Referensi/Kamus' },
                  { value: 'Novel/Fiksi', label: 'Novel/Fiksi' },
                  { value: 'Ensiklopedia', label: 'Ensiklopedia' },
                  { value: 'Karya Ilmiah', label: 'Karya Ilmiah' }
                ]}
                placeholder="Pilih Kategori..."
                icon={<Filter size={15} />}
              />
            </div>
          </div>

          {/* Book Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <div key={book.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'}
                      alt={book.judul}
                      className="w-16 h-22 object-cover rounded-xl shadow-xs shrink-0 bg-slate-100"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                        {book.kategori}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 line-clamp-2 leading-snug">
                        {book.judul}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">Oleh: <span className="font-semibold text-slate-700">{book.pengarang}</span></p>
                      <p className="text-[11px] text-slate-400">Penerbit: {book.penerbit} ({book.tahunTerbit})</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Kode Buku:</span>
                      <span className="font-mono font-bold text-slate-800">{book.kodeBuku}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Lokasi Rak:</span>
                      <span className="font-bold text-indigo-700">{book.lokasiRak}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Ketersediaan:</span>
                      <span className={`font-black ${book.stokTersedia > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {book.stokTersedia} / {book.stokTotal} Eks.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">ISBN: {book.isbn || '-'}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingBook(book);
                        setBookForm(book);
                        setIsAddBookModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Buku"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id, book.judul)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Buku"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Buku yang Sesuai</h4>
              <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter kategori.</p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SIRKULASI & PEMINJAMAN */}
      {activeSubTab === 'peminjaman' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama peminjam, buku, kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div className="w-full sm:w-48">
              <CustomDropdown
                id="perpus-status-filter"
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                options={[
                  { value: 'Semua', label: 'Semua Status' },
                  { value: 'Dipinjam', label: 'Sedang Dipinjam' },
                  { value: 'Kembali', label: 'Sudah Kembali' },
                  { value: 'Terlambat', label: 'Terlambat' }
                ]}
                placeholder="Pilih Status..."
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-6">Kode & Buku</th>
                    <th className="p-3.5">Peminjam</th>
                    <th className="p-3.5">Tgl Pinjam</th>
                    <th className="p-3.5">Tenggat</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Denda</th>
                    <th className="p-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-6">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400">{loan.kodePeminjaman}</span>
                          <p className="font-bold text-slate-900 max-w-xs">{loan.judulBuku}</p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-indigo-900">{loan.namaPeminjam}</p>
                        <span className="text-[10px] text-slate-400">{loan.tipePeminjam} • {loan.kelasOrDepartemen}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{loan.tanggalPinjam}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-700">{loan.tenggatKembali}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          loan.status === 'Kembali' ? 'bg-emerald-100 text-emerald-800' :
                          loan.status === 'Dipinjam' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {loan.denda && loan.denda > 0 ? (
                          <span className="font-black text-rose-600">Rp {loan.denda.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        {loan.status === 'Dipinjam' ? (
                          <button
                            onClick={() => handleReturnBook(loan.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw size={12} />
                            <span>Kembalikan</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Selesai ({loan.tanggalKembali || '-'})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH / EDIT BUKU */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                <span>{editingBook ? 'Edit Data Buku' : 'Tambah Judul Buku Baru'}</span>
              </h3>
              <button onClick={() => setIsAddBookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Kode Buku *</label>
                  <input
                    type="text"
                    required
                    value={bookForm.kodeBuku}
                    onChange={e => setBookForm({ ...bookForm, kodeBuku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    placeholder="BP-MAT-07"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">ISBN</label>
                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="978-602-..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Judul Buku Lengkap *</label>
                <input
                  type="text"
                  required
                  value={bookForm.judul}
                  onChange={e => setBookForm({ ...bookForm, judul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  placeholder="Matematika SMP Kelas VII..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Pengarang / Penulis</label>
                  <input
                    type="text"
                    value={bookForm.pengarang}
                    onChange={e => setBookForm({ ...bookForm, pengarang: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="Nama Pengarang..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Penerbit & Tahun</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bookForm.penerbit}
                      onChange={e => setBookForm({ ...bookForm, penerbit: e.target.value })}
                      className="w-2/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      placeholder="Penerbit..."
                    />
                    <input
                      type="text"
                      value={bookForm.tahunTerbit}
                      onChange={e => setBookForm({ ...bookForm, tahunTerbit: e.target.value })}
                      className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      placeholder="2026"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <CustomDropdown
                    id="add-book-kategori"
                    label="Kategori"
                    value={bookForm.kategori}
                    onChange={(val) => setBookForm({ ...bookForm, kategori: val as any })}
                    options={[
                      { value: 'Buku Paket/Pelajaran', label: 'Buku Paket' },
                      { value: 'Referensi/Kamus', label: 'Referensi' },
                      { value: 'Novel/Fiksi', label: 'Novel/Fiksi' },
                      { value: 'Ensiklopedia', label: 'Ensiklopedia' },
                      { value: 'Karya Ilmiah', label: 'Karya Ilmiah' }
                    ]}
                    placeholder="Pilih Kategori"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Lokasi Rak</label>
                  <input
                    type="text"
                    value={bookForm.lokasiRak}
                    onChange={e => setBookForm({ ...bookForm, lokasiRak: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="Rak A-01"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Jumlah Stok</label>
                  <input
                    type="number"
                    min="1"
                    value={bookForm.stokTotal}
                    onChange={e => setBookForm({ ...bookForm, stokTotal: Number(e.target.value), stokTersedia: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATAT PEMINJAMAN BUKU */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <BookMarked size={18} className="text-sky-600" />
                <span>Formulir Peminjaman Buku</span>
              </h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="space-y-3.5">
              <div>
                <CustomDropdown
                  id="loan-buku-select"
                  label="Pilih Buku *"
                  value={loanForm.bukuId}
                  onChange={(val) => setLoanForm({ ...loanForm, bukuId: val })}
                  options={books.filter(b => b.stokTersedia > 0).map(b => ({
                    value: b.id,
                    label: `[${b.kodeBuku}] ${b.judul}`,
                    badge: `Sisa: ${b.stokTersedia}`
                  }))}
                  placeholder="-- Pilih Judul Buku (Stok Tersedia) --"
                  searchable
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <CustomDropdown
                    id="loan-peminjam-type"
                    label="Tipe Peminjam"
                    value={loanForm.peminjamType}
                    onChange={(val) => setLoanForm({ ...loanForm, peminjamType: val as any, peminjamId: '' })}
                    options={[
                      { value: 'Siswa', label: 'Peserta Didik (Siswa)' },
                      { value: 'Guru', label: 'Tenaga Pendidik (Guru)' }
                    ]}
                    placeholder="Pilih Tipe"
                  />
                </div>

                <div>
                  <CustomDropdown
                    id="loan-durasi-hari"
                    label="Durasi Peminjaman"
                    value={String(loanForm.durasiHari)}
                    onChange={(val) => setLoanForm({ ...loanForm, durasiHari: Number(val) })}
                    options={[
                      { value: '3', label: '3 Hari' },
                      { value: '7', label: '7 Hari (1 Minggu)' },
                      { value: '14', label: '14 Hari (2 Minggu)' },
                      { value: '30', label: '30 Hari (1 Bulan)' }
                    ]}
                    placeholder="Pilih Durasi"
                  />
                </div>
              </div>

              <div>
                <CustomDropdown
                  id="loan-peminjam-id"
                  label={`Pilih Nama Peminjam (${loanForm.peminjamType}) *`}
                  value={loanForm.peminjamId}
                  onChange={(val) => setLoanForm({ ...loanForm, peminjamId: val })}
                  options={
                    loanForm.peminjamType === 'Siswa'
                      ? students.map((s, idx) => ({
                          value: s.id,
                          label: `${s.name} • Kelas ${s.class || (s as any).kelas || '-'}`,
                          badge: s.nis ? `NIS: ${s.nis}` : undefined
                        }))
                      : teachers.map((t, idx) => ({
                          value: t.id,
                          label: t.name,
                          badge: t.subject || 'GTK'
                        }))
                  }
                  placeholder={`-- Pilih ${loanForm.peminjamType} --`}
                  searchable
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Tanggal Mulai Pinjam</label>
                <input
                  type="date"
                  value={loanForm.tanggalPinjam}
                  onChange={e => setLoanForm({ ...loanForm, tanggalPinjam: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30"
                >
                  Konfirmasi Pinjam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
