import React, { useState } from 'react';
import {
  Eye,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserX,
  FileText,
  Edit2
} from 'lucide-react';
import { User, AbsensiRecord } from '../types';
import { getMonitoringRealtime, getKelasList, getTodayDateString, updateAbsensiStatus } from '../lib/storage';
import { exportMonitoringToExcel } from '../lib/exportUtils';

interface MonitoringViewProps {
  currentUser: User;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ currentUser }) => {
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayDateString());
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingNisn, setEditingNisn] = useState<string | null>(null);

  const classes = getKelasList();
  const records = getMonitoringRealtime(selectedKelas, selectedTanggal);

  const filteredRecords = records.filter(r => {
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesSearch = !searchQuery ||
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nisn.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = (nisn: string, newStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Belum Absen') => {
    updateAbsensiStatus(nisn, selectedTanggal, newStatus);
    setEditingNisn(null);
  };

  const handleExportExcel = () => {
    exportMonitoringToExcel(filteredRecords, selectedTanggal, selectedKelas);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <span>Monitoring Realtime Presensi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Pantau keterlambatan, jam masuk, jam pulang, dan sunting status secara realtime.</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Monitoring Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        {/* Date Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedTanggal}
            onChange={e => setSelectedTanggal(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          />
        </div>

        {/* Class Filter */}
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

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Sakit">Sakit</option>
            <option value="Izin">Izin</option>
            <option value="Alpa">Alpa</option>
            <option value="Belum Absen">Belum Absen</option>
          </select>
        </div>

        {/* Search */}
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

      {/* Monitoring Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>Menampilkan {filteredRecords.length} Data Siswa ({selectedTanggal})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-10">#</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-3 py-3 text-center">Kelas</th>
                <th className="px-3 py-3 text-center">Jam Datang</th>
                <th className="px-3 py-3 text-center">Jam Pulang</th>
                <th className="px-4 py-3 text-center">Keterangan</th>
                <th className="px-4 py-3 text-center">Status Presensi</th>
                <th className="px-3 py-3 text-center">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada data presensi cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {r.nama}
                      <div className="text-[10px] font-mono text-slate-400 font-normal">{r.nisn}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">{r.kelas}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{r.jamDatang}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{r.jamPulang}</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">{r.keterangan}</td>
                    <td className="px-4 py-3 text-center">
                      {editingNisn === r.nisn ? (
                        <select
                          value={r.status}
                          onChange={e => handleUpdateStatus(r.nisn, e.target.value as any)}
                          className="bg-indigo-50 border border-indigo-300 font-bold text-xs rounded-lg px-2 py-1"
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alpa">Alpa</option>
                          <option value="Belum Absen">Belum Absen</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold ${
                          r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'Sakit' ? 'bg-amber-100 text-amber-800' :
                          r.status === 'Izin' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'Alpa' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setEditingNisn(editingNisn === r.nisn ? null : r.nisn)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                        title="Ubah Status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
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
