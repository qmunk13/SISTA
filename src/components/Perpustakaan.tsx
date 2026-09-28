import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { Siswa } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { 
  BookOpen, 
  Search, 
  Users, 
  CheckCircle, 
  Award,
  FileText
} from 'lucide-react';

export default function Perpustakaan({ user }: { user?: any }) {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'katalog' | 'peminjaman' | 'denda' | 'anggota'>('perpustakaan', 'dashboard');
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => loadAllData();
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, [activeSubTab]);

  const loadAllData = () => {
    setSiswaList(db.get<Siswa>('siswa').filter(s => s.status === 'AKTIF'));
  };

  const filteredSiswa = siswaList.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.nisn && s.nisn.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
            Layanan Perpustakaan & Pustaka Digital
          </span>
          <h2 className="text-2xl font-black mt-2">Layanan Pustaka & Anggota</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Manajemen keanggotaan perpustakaan digital dan arsip bacaan peserta didik Rombel KTCT Tambora.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeSubTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview Pustaka
        </button>
        <button
          onClick={() => setActiveSubTab('katalog')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeSubTab === 'katalog' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Katalog Buku
        </button>
        <button
          onClick={() => setActiveSubTab('peminjaman')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeSubTab === 'peminjaman' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sirkulasi Peminjaman
        </button>
        <button
          onClick={() => setActiveSubTab('denda')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeSubTab === 'denda' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pengembalian & Denda
        </button>
        <button
          onClick={() => setActiveSubTab('anggota')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeSubTab === 'anggota' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Anggota Terdaftar ({siswaList.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Anggota Perpustakaan Active</h4>
                <p className="text-2xl font-black text-slate-900">{siswaList.length} Siswa</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Seluruh siswa aktif secara otomatis terdaftar sebagai anggota peminjam Pustaka Digital Rombel.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Status Akses Pustaka</h4>
                <p className="text-2xl font-black text-emerald-600">Aktif & Terbuka</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Akses membaca e-book dan modul pembelajaran dibuka untuk seluruh jenjang pendidikan.
            </p>
          </div>
        </div>
      )}

      {activeSubTab === 'katalog' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="font-black text-slate-800 text-sm uppercase">Katalog Buku Perpustakaan</h4>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul / ISBN / pengarang..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-black">
                  <th className="p-3">Kode Buku</th>
                  <th className="p-3">Judul Buku</th>
                  <th className="p-3">Pengarang</th>
                  <th className="p-3">Penerbit</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Stok Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.get('buku').filter((b: any) => 
                  !searchQuery || 
                  b.judul?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  b.kode?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((b: any, idx: number) => (
                  <tr key={b.id || idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-blue-600">{b.kode || b.KodeBuku || `BK-${idx + 101}`}</td>
                    <td className="p-3 font-bold text-slate-800">{b.judul || b.Judul}</td>
                    <td className="p-3 text-slate-600">{b.pengarang || b.Penulis || 'Tim Penyusun'}</td>
                    <td className="p-3 text-slate-500">{b.penerbit || b.Penerbit || 'Erlangga'}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-bold text-slate-700">{b.kategori || b.Kategori || 'Pelajaran'}</span></td>
                    <td className="p-3 font-extrabold text-emerald-600">{b.stok ?? b.Stok ?? 10} Eks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'peminjaman' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-slate-800 text-sm uppercase">Sirkulasi Peminjaman Buku</h4>
            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">Terintegrasi Google Sheets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-black">
                  <th className="p-3">ID Peminjaman</th>
                  <th className="p-3">Peminjam</th>
                  <th className="p-3">Judul Buku</th>
                  <th className="p-3">Tgl Pinjam</th>
                  <th className="p-3">Tgl Kembali</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.get('peminjaman_buku').map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-slate-700">{p.id || `PINJAM-${idx + 1}`}</td>
                    <td className="p-3 font-bold text-slate-800">{p.namaSiswa || p.peminjam || 'Ahmad Fauzi'}</td>
                    <td className="p-3 font-medium text-slate-700">{p.judulBuku || 'Matematika Kelas X'}</td>
                    <td className="p-3 text-slate-500">{p.tglPinjam || '2026-08-01'}</td>
                    <td className="p-3 text-slate-500">{p.tglKembali || '2026-08-08'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        p.status === 'KEMBALI' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.status || 'DIPINJAM'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'denda' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-slate-800 text-sm uppercase">Pengembalian & Catatan Denda</h4>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            Keterlambatan pengembalian buku dikenakan denda keterlambatan sebesar Rp 1.000 / hari. Pembayaran denda dapat dicatat langsung ke kasir perpustakaan atau kas utama keuangan.
          </div>
        </div>
      )}

      {activeSubTab === 'anggota' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="font-black text-slate-800 text-sm uppercase">Daftar Anggota Pustaka Active</h4>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-black">
                  <th className="p-3">No</th>
                  <th className="p-3">Kode PDKT / NISN</th>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Status Keanggotaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswa.slice(0, 50).map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">{s.id || s.nisn || '-'}</td>
                    <td className="p-3 font-bold text-slate-800">{s.nama}</td>
                    <td className="p-3 font-semibold text-slate-600">{s.kelasId || 'X-1'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredSiswa.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                      Tidak ada data anggota ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
