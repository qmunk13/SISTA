import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { 
  GraduationCap, Search, Filter, Download, Eye, Award, 
  Calendar, BookOpen, Briefcase, CheckCircle2, X, User
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

interface RiwayatGtkItem {
  id: string;
  namaGtk: string;
  nipNuptk: string;
  tahunAjaran: string;
  semester: string;
  jenisPenugasan: 'Guru Mapel' | 'Wali Kelas' | 'Kepala Laboratorium' | 'Pembina Ekskul' | 'Wakil Kepala Sekolah' | 'Tenaga Administrasi';
  detailTugas: string;
  jamMengajarMinggu?: number;
  statusSertifikasi: 'Sudah Bersertifikat' | 'Belum Bersertifikat' | 'Dalam Proses PPG';
  pangkatGolongan: string;
  riwayatPelatihan: string;
  nilaiPkmPkg: number;
}

export default function RiwayatGtkTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterTugas, setFilterTugas] = useState('');
  const [detailItem, setDetailItem] = useState<RiwayatGtkItem | null>(null);

  const [gtkHistoryList] = useState<RiwayatGtkItem[]>(() => {
    const fromDb = db.get<RiwayatGtkItem>('riwayat_gtk_historis');
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const filteredList = useMemo(() => {
    return gtkHistoryList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.namaGtk.toLowerCase().includes(q) ||
        item.nipNuptk.toLowerCase().includes(q) ||
        item.detailTugas.toLowerCase().includes(q) ||
        item.riwayatPelatihan.toLowerCase().includes(q);

      const matchTahun = !filterTahun || item.tahunAjaran === filterTahun;
      const matchTugas = !filterTugas || item.jenisPenugasan === filterTugas;
      return matchSearch && matchTahun && matchTugas;
    });
  }, [gtkHistoryList, searchTerm, filterTahun, filterTugas]);

  // Export to Excel
  const handleExport = () => {
    const rows = filteredList.map((r, idx) => ({
      No: idx + 1,
      'Nama GTK': r.namaGtk,
      'NIP / NUPTK': r.nipNuptk,
      'Tahun Ajaran': r.tahunAjaran,
      Semester: r.semester,
      'Jenis Penugasan': r.jenisPenugasan,
      'Detail Beban Kerja': r.detailTugas,
      'Jam Mengajar/Minggu': r.jamMengajarMinggu || 0,
      'Status Sertifikasi': r.statusSertifikasi,
      'Pangkat / Golongan': r.pangkatGolongan,
      'Nilai PKG/PKM': r.nilaiPkmPkg,
      'Pelatihan / Diklat': r.riwayatPelatihan
    }));

    exportToExcel(rows, `Riwayat_Rekam_Jejak_GTK_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Master Data',
      aksi: 'EKSPOR',
      target: 'Ekspor Riwayat Rekam Jejak GTK',
      rincian: `Mengekspor ${filteredList.length} berkas penugasan dan riwayat karir GTK.`
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <GraduationCap className="text-indigo-600" size={22} />
            Rekam Jejak Penugasan & Kinerja GTK Lampau
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Database arsip penugasan mengajar guru, riwayat wali kelas, sertifikasi pendidik PPG, kepangkatan/golongan, serta histori diklat.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
        >
          <Download size={15} />
          <span>Ekspor Excel GTK</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, mapel, diklat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Semua Tahun Ajaran</option>
            <option value="2024/2025">T.A 2024/2025</option>
            <option value="2023/2024">T.A 2023/2024</option>
            <option value="2022/2023">T.A 2022/2023</option>
          </select>

          <select
            value={filterTugas}
            onChange={(e) => setFilterTugas(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">Semua Jenis Penugasan</option>
            <option value="Guru Mapel">Guru Mapel</option>
            <option value="Wali Kelas">Wali Kelas</option>
            <option value="Kepala Laboratorium">Kepala Laboratorium</option>
            <option value="Pembina Ekskul">Pembina Ekskul</option>
            <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
          </select>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Guru & NIP</th>
                <th className="py-3.5 px-4">Periode T.A</th>
                <th className="py-3.5 px-4">Penugasan & Beban Jam</th>
                <th className="py-3.5 px-4">Sertifikasi & Golongan</th>
                <th className="py-3.5 px-4 text-center">Nilai PKG</th>
                <th className="py-3.5 px-4">Histori Diklat Terakhir</th>
                <th className="py-3.5 px-4 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <GraduationCap size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Rekam Jejak GTK</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-indigo-700 transition">
                        {item.namaGtk}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        NIP: {item.nipNuptk}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {item.tahunAjaran}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.semester}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-indigo-700">
                        {item.jenisPenugasan}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{item.detailTugas}</p>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {item.jamMengajarMinggu} Jam/Minggu
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border block w-fit ${
                        item.statusSertifikasi === 'Sudah Bersertifikat'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.statusSertifikasi}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-1">
                        Gol: {item.pangkatGolongan}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-black text-slate-900">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        {item.nilaiPkmPkg}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-700 font-medium line-clamp-2">
                        {item.riwayatPelatihan}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                        title="Lihat Detail Profil GTK"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail GTK */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Portofolio Historis GTK</h3>
                <span className="text-xs text-indigo-700 font-bold">{detailItem.namaGtk}</span>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">NIP / NUPTK</span>
                <span className="font-mono font-bold text-slate-800">{detailItem.nipNuptk}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Pangkat & Golongan</span>
                <span className="font-bold text-slate-800">{detailItem.pangkatGolongan}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Status Sertifikasi</span>
                <span className="font-black text-emerald-600">{detailItem.statusSertifikasi}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Nilai PKG / Beban Jam</span>
                <span className="font-black text-indigo-600">{detailItem.nilaiPkmPkg} (Amat Baik) • {detailItem.jamMengajarMinggu} Jam</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Rincian Penugasan T.A {detailItem.tahunAjaran}</span>
                <p className="text-slate-800 font-bold mt-0.5">{detailItem.jenisPenugasan} - {detailItem.detailTugas}</p>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Histori Pelatihan & Diklat</span>
                <p className="text-slate-700 mt-0.5">{detailItem.riwayatPelatihan}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
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
