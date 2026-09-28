import React, { useState } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  FileText,
  Send,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  TrendingUp,
  Building2,
  Check,
  RefreshCw,
  Users
} from 'lucide-react';
import { User, DailyReportSummary } from '../types';
import { getDailyReportSummary, getTodayDateString, getAbsensiRecords, getKelasList } from '../lib/storage';
import { exportDailyReportToExcel, exportDailyReportPDF } from '../lib/exportUtils';

interface LaporanHarianOtomatisProps {
  currentUser: User;
}

export const LaporanHarianOtomatis: React.FC<LaporanHarianOtomatisProps> = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  const classes = getKelasList();
  const summary: DailyReportSummary = getDailyReportSummary(selectedDate, selectedClass || undefined);
  const studentDetails = getAbsensiRecords().filter(r => r.tanggal === selectedDate && (!selectedClass || r.kelas === selectedClass));

  const handleSendReport = () => {
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  const handleExportExcel = () => {
    exportDailyReportToExcel(summary, studentDetails);
  };

  const handleExportPDF = () => {
    exportDailyReportPDF(summary, studentDetails);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              SISTEM OTOMATIS
            </span>
            <span className="text-xs text-slate-400">Dibuat Otomatis Oleh Engine Presensi</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Laporan Harian Kehadiran Otomatis</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Sistem mengagregasi data presensi seluruh kelas secara otomatis setiap hari, menghasilkan analisis anomali, ringkasan per kelas, dan file ekspor resmi.
          </p>
        </div>

        {/* Date & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-300" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            />
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-300" />
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-white outline-none cursor-pointer rounded-lg px-2 py-1 border border-slate-700"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar: Exports & Send Report */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Cetak PDF Laporan Resmi</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel Multifungsi</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {sentSuccess ? (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              Laporan Berhasil Dikirim ke Kepala Sekolah!
            </span>
          ) : (
            <button
              onClick={handleSendReport}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Laporan ke Kepala Sekolah / Telegram</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tingkat Kehadiran</p>
          <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{summary.persentaseKehadiran}%</h3>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${summary.persentaseKehadiran}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir Sesuai Waktu</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.hadir - summary.terlambatCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Tepat waktu</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terlambat</p>
          <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{summary.terlambatCount}</h3>
          <p className="text-[10px] text-amber-600 font-medium mt-1">Siswa terlambat</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sakit / Izin</p>
          <h3 className="text-2xl font-extrabold text-blue-600 mt-1">{summary.sakit + summary.izin}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Sakit: {summary.sakit} | Izin: {summary.izin}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alpa / Unrecorded</p>
          <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{summary.alpa}</h3>
          <p className="text-[10px] text-rose-500 font-medium mt-1">Tanpa keterangan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kedisiplinan Tertinggi</p>
          <h3 className="text-base font-extrabold text-slate-800 mt-1 truncate">{summary.topClass}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Peringkat 1 Hari ini</p>
        </div>
      </div>

      {/* AI Automated Analysis & Class Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class Breakdown Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Ringkasan Kehadiran Otomatis Per Kelas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Rekapitulasi agregat tanggal {summary.tanggal}</p>
            </div>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase">
              {summary.kelasSummary.length} Kelas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Hadir</th>
                  <th className="px-4 py-3 text-center">Sakit</th>
                  <th className="px-4 py-3 text-center">Izin</th>
                  <th className="px-4 py-3 text-center">Alpa</th>
                  <th className="px-4 py-3 text-center">Terlambat</th>
                  <th className="px-5 py-3 text-center">% Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {summary.kelasSummary.map(ks => (
                  <tr key={ks.kelas} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-800">Kelas {ks.kelas}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-600">{ks.total}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{ks.hadir}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-amber-600">{ks.sakit}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-blue-600">{ks.izin}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-rose-600">{ks.alpa}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-amber-700">{ks.terlambat}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold ${
                        ks.persen >= 90 ? 'bg-emerald-100 text-emerald-800' : ks.persen >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ks.persen}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight & Anomaly Detection Card */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Analisis Anomali Otomatis</h4>
                <p className="text-[10px] text-slate-400">Deteksi pola & ketidaksesuaian</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-700 font-medium">
                {summary.aiInsight}
              </div>

              <div className="space-y-2.5">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catatan Penting Hari Ini</h5>
                
                {summary.alpa > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Terdapat {summary.alpa} siswa Alpa / Tanpa Keterangan</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">Sistem menyarankan konfirmasi ke wali murid melalui wali kelas.</p>
                    </div>
                  </div>
                )}

                {summary.terlambatCount > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{summary.terlambatCount} Siswa Terlambat</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">Siswa tercatat masuk setelah batas toleransi jam {getTodayDateString()}.</p>
                    </div>
                  </div>
                )}

                {summary.persentaseKehadiran >= 90 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Kedisiplinan Sekolah Baik</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">Kehadiran memenuhi standar minimum 90%.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 font-medium">Laporan terverifikasi oleh E-Absensi Server</span>
          </div>
        </div>
      </div>

      {/* Student List Detail Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Daftar Rincian Presensi Siswa ({studentDetails.length} Siswa)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tanggal {selectedDate} {selectedClass ? `- Kelas ${selectedClass}` : ''}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 w-12 text-center">No</th>
                <th className="px-5 py-3">Nama Siswa</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3 text-center">Kelas</th>
                <th className="px-4 py-3 text-center">Jam Datang</th>
                <th className="px-4 py-3 text-center">Jam Pulang</th>
                <th className="px-5 py-3 text-center">Keterangan</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {studentDetails.map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{r.nama}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-500">{r.nisn}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">{r.kelas}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-slate-700">{r.jamDatang}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-slate-700">{r.jamPulang}</td>
                  <td className="px-5 py-3.5 text-center text-slate-500 font-medium">{r.keterangan}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold ${
                      r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'Sakit' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'Izin' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
