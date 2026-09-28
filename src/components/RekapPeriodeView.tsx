import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { User } from '../types';
import { getKelasList, getAbsensiRecords, getTodayDateString } from '../lib/storage';
import { exportPeriodReportToExcel } from '../lib/exportUtils';

interface RekapPeriodeViewProps {
  currentUser: User;
}

export const RekapPeriodeView: React.FC<RekapPeriodeViewProps> = ({ currentUser }) => {
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const classes = getKelasList();
  const allRecords = getAbsensiRecords();

  const filteredRecords = allRecords.filter(r => {
    const dateMatch = r.tanggal >= startDate && r.tanggal <= endDate;
    const classMatch = !selectedKelas || r.kelas === selectedKelas;
    const searchMatch = !searchQuery ||
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nisn.includes(searchQuery);
    return dateMatch && classMatch && searchMatch;
  });

  const handleExportExcel = () => {
    exportPeriodReportToExcel(filteredRecords, startDate, endDate, selectedKelas);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Laporan Presensi Rentang Periode</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Filter riwayat kehadiran siswa berdasarkan rentang tanggal khusus.</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Periode Excel</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kelas</label>
          <select
            value={selectedKelas}
            onChange={e => setSelectedKelas(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Nama / NISN</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>Menampilkan {filteredRecords.length} Catatan Presensi Periode ({startDate} s.d. {endDate})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-10">#</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-3 py-3 text-center">Kelas</th>
                <th className="px-3 py-3 text-center">Jam Datang</th>
                <th className="px-3 py-3 text-center">Jam Pulang</th>
                <th className="px-4 py-3 text-center">Keterangan</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada catatan presensi dalam rentang periode ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{r.tanggal}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {r.nama}
                      <div className="text-[10px] font-mono text-slate-400 font-normal">{r.nisn}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">{r.kelas}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{r.jamDatang}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{r.jamPulang}</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">{r.keterangan}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold ${
                        r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'Sakit' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'Izin' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
