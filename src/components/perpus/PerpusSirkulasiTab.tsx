import React, { useState, useEffect } from 'react';
import { 
  BookMarked, Plus, Search, Filter, CheckCircle2, 
  Clock, AlertTriangle, Printer, MessageSquare, RotateCcw,
  User, Calendar, X, FileText, ArrowRightLeft, DollarSign
} from 'lucide-react';
import { BookLoanItem, BookItem, DendaRecord, Siswa } from '../../types';
import { db } from '../../data/db';

interface PerpusSirkulasiTabProps {
  initialBookToLoan?: BookItem | null;
  onClearInitialBook?: () => void;
  onOpenWaReminder?: (loan: BookLoanItem) => void;
}

export default function PerpusSirkulasiTab({ 
  initialBookToLoan, 
  onClearInitialBook,
  onOpenWaReminder 
}: PerpusSirkulasiTabProps) {
  const [loans, setLoans] = useState<BookLoanItem[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [receiptLoan, setReceiptLoan] = useState<BookLoanItem | null>(null);

  // New Loan Form State
  const [formData, setFormData] = useState({
    bukuId: '',
    peminjamType: 'siswa' as 'siswa' | 'guru' | 'staf',
    peminjamId: '',
    peminjamNama: '',
    peminjamKelas: '5A',
    tanggalPinjam: new Date().toISOString().split('T')[0],
    durasiHari: 7,
    petugas: 'Siti Aminah, S.I.Pust.',
    catatan: ''
  });

  const loadData = () => {
    const loanList = db.get<BookLoanItem>('perpustakaan_peminjaman');
    const bookList = db.get<BookItem>('perpustakaan_buku');
    const studentList = db.get<Siswa>('siswa');
    setLoans(loanList);
    setBooks(bookList);
    setStudents(studentList);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialBookToLoan) {
      setFormData(prev => ({
        ...prev,
        bukuId: initialBookToLoan.id
      }));
      setIsLoanModalOpen(true);
    }
  }, [initialBookToLoan]);

  const handleCloseModal = () => {
    setIsLoanModalOpen(false);
    if (onClearInitialBook) onClearInitialBook();
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    const found = students.find(s => s.id === sId);
    if (found) {
      setFormData({
        ...formData,
        peminjamId: found.id,
        peminjamNama: found.nama,
        peminjamKelas: found.kelas || '5A'
      });
    }
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bukuId) {
      alert('Pilih buku yang akan dipinjam!');
      return;
    }
    if (!formData.peminjamNama) {
      alert('Isi nama peminjam!');
      return;
    }

    const selectedBook = books.find(b => b.id === formData.bukuId);
    if (!selectedBook) return;

    if ((selectedBook.stok || 0) <= 0) {
      alert('Stok buku ini sedang habis!');
      return;
    }

    const tglPinjam = new Date(formData.tanggalPinjam);
    const tglKembali = new Date(tglPinjam);
    tglKembali.setDate(tglKembali.getDate() + Number(formData.durasiHari));

    const newLoan: BookLoanItem = {
      id: `LN-${Date.now().toString().slice(-6)}`,
      bukuId: selectedBook.id,
      bukuJudul: selectedBook.judul,
      kodeBuku: selectedBook.kodeBuku,
      peminjamType: formData.peminjamType,
      peminjamId: formData.peminjamId || `ID-${Date.now().toString().slice(-4)}`,
      peminjamNama: formData.peminjamNama,
      peminjamKelas: formData.peminjamKelas,
      tanggalPinjam: formData.tanggalPinjam,
      tanggalKembaliRencana: tglKembali.toISOString().split('T')[0],
      status: 'Dipinjam',
      denda: 0,
      statusDenda: 'Tanpa Denda',
      petugas: formData.petugas,
      catatan: formData.catatan,
      createdAt: new Date().toISOString()
    };

    // Update book stock (-1)
    const updatedBooks = books.map(b => {
      if (b.id === selectedBook.id) {
        const newStok = Math.max(0, (b.stok || 1) - 1);
        return {
          ...b,
          stok: newStok,
          status: newStok === 0 ? 'Habis' : 'Dipinjam Sebagian'
        };
      }
      return b;
    });

    const updatedLoans = [newLoan, ...loans];

    db.set('perpustakaan_buku', updatedBooks);
    db.set('perpustakaan_peminjaman', updatedLoans);

    setBooks(updatedBooks as BookItem[]);
    setLoans(updatedLoans);
    handleCloseModal();
    setReceiptLoan(newLoan);
  };

  const handleReturnBook = (loan: BookLoanItem) => {
    const returnDateStr = new Date().toISOString().split('T')[0];
    const today = new Date(returnDateStr);
    const planDate = new Date(loan.tanggalKembaliRencana);
    
    // Calculate late days
    const diffTime = today.getTime() - planDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isLate = diffDays > 0;
    const finePerDay = 1000;
    const calculatedFine = isLate ? diffDays * finePerDay : 0;

    let confirmMsg = `Konfirmasi pengembalian buku "${loan.bukuJudul}" untuk ${loan.peminjamNama}?`;
    if (isLate) {
      confirmMsg += `\n\n⚠️ Terlambat ${diffDays} hari!\nTotal Denda: Rp ${calculatedFine.toLocaleString('id-ID')}`;
    }

    if (!confirm(confirmMsg)) return;

    // Update Loan Record
    const updatedLoans = loans.map(l => {
      if (l.id === loan.id) {
        return {
          ...l,
          status: 'Kembali' as const,
          tanggalPengembalian: returnDateStr,
          denda: calculatedFine,
          statusDenda: calculatedFine > 0 ? ('Belum Lunas' as const) : ('Tanpa Denda' as const)
        };
      }
      return l;
    });

    // Update Book Stock (+1)
    const updatedBooks = books.map(b => {
      if (b.id === loan.bukuId) {
        const newStok = (b.stok || 0) + 1;
        return {
          ...b,
          stok: newStok,
          status: newStok >= b.jumlah ? 'Tersedia' : 'Dipinjam Sebagian'
        };
      }
      return b;
    });

    // If fine occurred, insert to Denda table
    if (calculatedFine > 0) {
      const existingDendas = db.get<DendaRecord>('perpustakaan_denda');
      const newDenda: DendaRecord = {
        id: `DND-${Date.now().toString().slice(-4)}`,
        peminjamanId: loan.id,
        peminjamNama: loan.peminjamNama,
        peminjamKelas: loan.peminjamKelas,
        bukuJudul: loan.bukuJudul,
        tanggalDenda: returnDateStr,
        nominal: calculatedFine,
        hariTerlambat: diffDays,
        status: 'Belum Lunas',
        petugas: 'Siti Aminah, S.I.Pust.',
        keterangan: `Terlambat ${diffDays} hari pengembalian buku.`
      };
      db.set('perpustakaan_denda', [newDenda, ...existingDendas]);
    }

    db.set('perpustakaan_peminjaman', updatedLoans);
    db.set('perpustakaan_buku', updatedBooks);

    setLoans(updatedLoans);
    setBooks(updatedBooks as BookItem[]);
  };

  const filteredLoans = loans.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchQuery = 
      l.peminjamNama.toLowerCase().includes(q) ||
      l.bukuJudul.toLowerCase().includes(q) ||
      l.kodeBuku.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'Semua' || l.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalDipinjam = loans.filter(l => l.status === 'Dipinjam' || l.status === 'Terlambat').length;
  const totalKembali = loans.filter(l => l.status === 'Kembali').length;
  const totalTerlambat = loans.filter(l => {
    if (l.status === 'Kembali') return false;
    const planDate = new Date(l.tanggalKembaliRencana);
    return new Date() > planDate;
  }).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Sedang Dipinjam</span>
            <BookMarked size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalDipinjam}</p>
          <span className="text-[10px] text-amber-700 font-medium">Buku beredar di luar</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Telah Kembali</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalKembali}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Sirkulasi selesai</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Terlambat</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{totalTerlambat}</p>
          <span className="text-[10px] text-rose-700 font-medium">Perlu dikirim teguran</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Total Transaksi</span>
            <ArrowRightLeft size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{loans.length}</p>
          <span className="text-[10px] text-indigo-700 font-medium">Riwayat sirkulasi</span>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama peminjam, judul buku, kode pinjam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="Semua">Semua Status</option>
            <option value="Dipinjam">Sedang Dipinjam</option>
            <option value="Kembali">Sudah Kembali</option>
            <option value="Terlambat">Terlambat</option>
          </select>

          <button
            onClick={() => {
              setFormData({
                bukuId: books.length > 0 ? books[0].id : '',
                peminjamType: 'siswa',
                peminjamId: students.length > 0 ? students[0].id : '',
                peminjamNama: students.length > 0 ? students[0].nama : '',
                peminjamKelas: students.length > 0 ? (students[0].kelas || '5A') : '5A',
                tanggalPinjam: new Date().toISOString().split('T')[0],
                durasiHari: 7,
                petugas: 'Siti Aminah, S.I.Pust.',
                catatan: ''
              });
              setIsLoanModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Peminjaman Baru</span>
          </button>
        </div>
      </div>

      {/* Circulation Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">No. Transaksi</th>
                <th className="py-3.5 px-4">Peminjam</th>
                <th className="py-3.5 px-4">Buku & Kode</th>
                <th className="py-3.5 px-4">Tgl Pinjam & Batas</th>
                <th className="py-3.5 px-4">Status & Denda</th>
                <th className="py-3.5 px-4 text-right">Aksi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada data peminjaman buku ditemukan
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const isReturned = loan.status === 'Kembali';
                  const planDate = new Date(loan.tanggalKembaliRencana);
                  const isOverdue = !isReturned && new Date() > planDate;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        <span className="text-amber-800">{loan.id}</span>
                        <p className="text-[10px] text-slate-400 font-sans font-normal">Petugas: {loan.petugas}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                            {loan.peminjamNama.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{loan.peminjamNama}</span>
                            <span className="text-[10px] text-slate-500">
                              {loan.peminjamType === 'siswa' ? `Kelas ${loan.peminjamKelas || '-'}` : 'Guru / Staf'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 line-clamp-1">{loan.bukuJudul}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{loan.kodeBuku}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>Pinjam: <strong className="text-slate-800">{loan.tanggalPinjam}</strong></div>
                        <div>Batas: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>{loan.tanggalKembaliRencana}</strong></div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${
                            isReturned 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isOverdue 
                                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isReturned ? 'Kembali' : isOverdue ? 'Terlambat' : 'Dipinjam'}
                          </span>

                          {loan.denda > 0 && (
                            <div className="text-[10px] font-mono font-bold text-rose-600">
                              Denda: Rp {loan.denda.toLocaleString('id-ID')} ({loan.statusDenda})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isReturned && (
                            <button
                              onClick={() => handleReturnBook(loan)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Proses Pengembalian"
                            >
                              <RotateCcw size={12} />
                              <span>Kembalikan</span>
                            </button>
                          )}

                          <button
                            onClick={() => setReceiptLoan(loan)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="Cetak Bukti Peminjaman"
                          >
                            <Printer size={13} />
                          </button>

                          {onOpenWaReminder && !isReturned && (
                            <button
                              onClick={() => onOpenWaReminder(loan)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                              title="Kirim Peringatan WA"
                            >
                              <MessageSquare size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Peminjaman Baru */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <BookMarked size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Form Peminjaman Buku</h3>
                  <p className="text-xs text-slate-400">Catat transaksi sirkulasi perpustakaan</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-4 sm:p-6 space-y-3.5 text-xs">
              {/* Select Peminjam Type */}
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Tipe Peminjam</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, peminjamType: 'siswa' })}
                    className={`py-2 rounded-xl font-extrabold border transition ${
                      formData.peminjamType === 'siswa' 
                        ? 'bg-amber-50 border-amber-300 text-amber-900' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    👨‍🎓 Siswa / Siswi
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, peminjamType: 'guru' })}
                    className={`py-2 rounded-xl font-extrabold border transition ${
                      formData.peminjamType === 'guru' 
                        ? 'bg-amber-50 border-amber-300 text-amber-900' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    👩‍🏫 Guru / Pegawai
                  </button>
                </div>
              </div>

              {/* Peminjam Selector / Input */}
              {formData.peminjamType === 'siswa' ? (
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Pilih Siswa Terdaftar</label>
                  <select
                    onChange={handleStudentSelect}
                    value={formData.peminjamId}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">-- Pilih Nama Siswa --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || '5A'} - NIS: {s.nis || s.id})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Nama Guru / Staf</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap & Gelar"
                    value={formData.peminjamNama}
                    onChange={(e) => setFormData({ ...formData, peminjamNama: e.target.value, peminjamKelas: 'Guru/Staf' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              {/* Select Book */}
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Pilih Buku Koleksi *</label>
                <select
                  required
                  value={formData.bukuId}
                  onChange={(e) => setFormData({ ...formData, bukuId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">-- Pilih Judul Buku --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id} disabled={(b.stok || 0) <= 0}>
                      {b.judul} [{b.kodeBuku}] - Stok: {b.stok} Eks.
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates and Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Tanggal Pinjam</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalPinjam}
                    onChange={(e) => setFormData({ ...formData, tanggalPinjam: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Durasi Peminjaman</label>
                  <select
                    value={formData.durasiHari}
                    onChange={(e) => setFormData({ ...formData, durasiHari: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value={3}>3 Hari (Standar Kilat)</option>
                    <option value={7}>7 Hari (1 Minggu Standar)</option>
                    <option value={14}>14 Hari (2 Minggu)</option>
                    <option value={30}>30 Hari (Buku Referensi)</option>
                    <option value={120}>1 Semester (Buku Paket)</option>
                  </select>
                </div>
              </div>

              {/* Petugas & Catatan */}
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Kondisi buku awal / keperluan tugas proyek..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Proses Pinjam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip / Receipt Print Modal */}
      {receiptLoan && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                Bukti Peminjaman Perpustakaan
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">Transaksi Berhasil</h3>
              <p className="text-xs font-mono font-bold text-slate-500">{receiptLoan.id}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Peminjam:</span>
                <strong className="text-slate-900">{receiptLoan.peminjamNama}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kelas/Unit:</span>
                <strong className="text-slate-900">{receiptLoan.peminjamKelas || '-'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Judul Buku:</span>
                <strong className="text-slate-900 text-right line-clamp-1">{receiptLoan.bukuJudul}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Buku:</span>
                <strong className="text-amber-800 font-mono">{receiptLoan.kodeBuku}</strong>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">Tgl Pinjam:</span>
                <strong className="font-mono">{receiptLoan.tanggalPinjam}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Batas Kembali:</span>
                <strong className="text-rose-600 font-mono font-bold">{receiptLoan.tanggalKembaliRencana}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReceiptLoan(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Selesai
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
              >
                <Printer size={14} />
                <span>Cetak Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
