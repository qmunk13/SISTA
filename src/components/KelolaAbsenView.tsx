import React, { useState } from 'react';
import {
  CalendarX,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Calendar
} from 'lucide-react';
import { User, SchoolConfig, Holiday } from '../types';
import { getSchoolConfig, saveSchoolConfig } from '../lib/storage';

interface KelolaAbsenViewProps {
  currentUser: User;
}

export const KelolaAbsenView: React.FC<KelolaAbsenViewProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());
  const [newHoliday, setNewHoliday] = useState({ tanggal: '', keterangan: '' });
  const [message, setMessage] = useState<string | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSchoolConfig(config);
    setMessage('Pengaturan jam operasional & jadwal berhasil disimpan!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.tanggal || !newHoliday.keterangan) return;

    const newH: Holiday = {
      id: 'h_' + Date.now(),
      tanggal: newHoliday.tanggal,
      keterangan: newHoliday.keterangan
    };

    const updated = { ...config, hariLibur: [...config.hariLibur, newH] };
    setConfig(updated);
    saveSchoolConfig(updated);
    setNewHoliday({ tanggal: '', keterangan: '' });
    setMessage('Hari libur baru berhasil ditambahkan!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = { ...config, hariLibur: config.hariLibur.filter(h => h.id !== id) };
    setConfig(updated);
    saveSchoolConfig(updated);
    setMessage('Hari libur berhasil dihapus.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Jam Operasional & Kelola Hari Libur</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Konfigurasi toleransi waktu datang/pulang dan kalender libur sekolah.</p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Operating Hours Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-800 mb-1">Pengaturan Jam Presensi Datang & Pulang</h3>
        <p className="text-xs text-slate-500 mb-6">Tentukan batasan waktu agar sistem dapat mendeteksi siswa Terlambat atau Pulang Cepat secara otomatis.</p>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datang Window */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Waktu Presensi Datang (Pagi)</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mulai Scan Datang</label>
                  <input
                    type="time"
                    value={config.jamMasukMulai}
                    onChange={e => setConfig({ ...config, jamMasukMulai: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Batas Terakhir (Tepat Waktu)</label>
                  <input
                    type="time"
                    value={config.jamMasukSelesai}
                    onChange={e => setConfig({ ...config, jamMasukSelesai: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Siswa yang scan setelah jam {config.jamMasukSelesai} otomatis ditandai Terlambat.</p>
            </div>

            {/* Pulang Window */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Waktu Presensi Pulang (Sore)</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mulai Jam Pulang</label>
                  <input
                    type="time"
                    value={config.jamPulangMulai}
                    onChange={e => setConfig({ ...config, jamPulangMulai: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Batas Akhir Scan Pulang</label>
                  <input
                    type="time"
                    value={config.jamPulangSelesai}
                    onChange={e => setConfig({ ...config, jamPulangSelesai: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Siswa yang scan sebelum jam {config.jamPulangMulai} ditandai Pulang Cepat.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Jam Operasional</span>
            </button>
          </div>
        </form>
      </div>

      {/* Holiday Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-rose-600" />
            <span>Daftar Hari Libur Sekolah</span>
          </h3>
          <p className="text-xs text-slate-500">Pada hari libur terdaftar, sistem otomatis menonaktifkan absensi harian.</p>
        </div>

        {/* Form Add Holiday */}
        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Libur</label>
            <input
              type="date"
              required
              value={newHoliday.tanggal}
              onChange={e => setNewHoliday({ ...newHoliday, tanggal: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Keterangan Hari Libur</label>
            <input
              type="text"
              required
              value={newHoliday.keterangan}
              onChange={e => setNewHoliday({ ...newHoliday, keterangan: e.target.value })}
              placeholder="e.g. Hari Raya Idul Fitri / Libur Semester..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>
        </form>

        {/* Holiday Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-5 py-3">Keterangan Libur</th>
                <th className="px-4 py-3 text-center w-16">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.hariLibur.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                    Belum ada hari libur terdaftar.
                  </td>
                </tr>
              ) : (
                config.hariLibur.map((h, idx) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">{h.tanggal}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{h.keterangan}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Hapus Libur"
                      >
                        <Trash2 className="w-4 h-4" />
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
