import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, Users, Award, PieChart as PieIcon, CheckCircle2, Bookmark } from 'lucide-react';
import { BookItem, BookLoanItem, DendaRecord } from '../../types';
import { db } from '../../data/db';

export default function PerpusStatistikTab() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loans, setLoans] = useState<BookLoanItem[]>([]);
  const [dendas, setDendas] = useState<DendaRecord[]>([]);

  useEffect(() => {
    setBooks(db.get<BookItem>('perpustakaan_buku'));
    setLoans(db.get<BookLoanItem>('perpustakaan_peminjaman'));
    setDendas(db.get<DendaRecord>('perpustakaan_denda'));
  }, []);

  const totalJudul = books.length;
  const totalEksemplar = books.reduce((acc, b) => acc + (b.jumlah || 0), 0);
  const totalDipinjam = loans.filter(l => l.status === 'Dipinjam' || l.status === 'Terlambat').length;
  const totalKembali = loans.filter(l => l.status === 'Kembali').length;

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  books.forEach(b => {
    categoryCounts[b.kategori] = (categoryCounts[b.kategori] || 0) + (b.jumlah || 1);
  });

  // Top borrowers
  const borrowerCounts: Record<string, { count: number; name: string; kelas: string }> = {};
  loans.forEach(l => {
    if (!borrowerCounts[l.peminjamNama]) {
      borrowerCounts[l.peminjamNama] = { count: 0, name: l.peminjamNama, kelas: l.peminjamKelas || '-' };
    }
    borrowerCounts[l.peminjamNama].count += 1;
  });

  const topBorrowers = Object.values(borrowerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top 4 Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Total Judul Buku</span>
            <BookOpen size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalJudul}</p>
          <span className="text-[10px] text-slate-500 font-medium">Koleksi terdaftar di sistem</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Total Eksemplar Fisik</span>
            <Bookmark size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600">{totalEksemplar}</p>
          <span className="text-[10px] text-slate-500 font-medium">Buku fisik di seluruh rak</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Tingkat Sirkulasi</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{loans.length}</p>
          <span className="text-[10px] text-slate-500 font-medium">Total transaksi peminjaman</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase">Buku Dalam Peminjaman</span>
            <Users size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{totalDipinjam}</p>
          <span className="text-[10px] text-slate-500 font-medium">Sedang dibaca oleh siswa/guru</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PieIcon size={16} className="text-amber-500" />
              <span>Distribusi Koleksi Berdasarkan Kategori</span>
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const percentage = totalEksemplar > 0 ? Math.round((count / totalEksemplar) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{cat}</span>
                    <span className="font-mono text-slate-500">{count} Eks. ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Active Readers Leaderboard */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Duta Literasi (Peminjam Teraktif)</span>
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
              Top 5 Siswa
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {topBorrowers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada data peminjaman buku</p>
            ) : (
              topBorrowers.map((borrower, idx) => (
                <div
                  key={borrower.name}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{borrower.name}</p>
                      <p className="text-[10px] text-slate-500">Kelas: {borrower.kelas}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl font-mono font-bold text-amber-800 text-[11px]">
                      {borrower.count} Buku
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
