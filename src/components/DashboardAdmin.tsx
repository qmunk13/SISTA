import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  FileText,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserX,
  RefreshCw,
  Award
} from 'lucide-react';
import { User, DailyReportSummary } from '../types';
import { getDailyReportSummary, getTodayDateString, getSiswaList } from '../lib/storage';

interface DashboardAdminProps {
  currentUser: User;
  onSelectView: (view: string) => void;
  onRefresh: () => void;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({
  currentUser,
  onSelectView,
  onRefresh
}) => {
  const todayStr = getTodayDateString();
  const summary: DailyReportSummary = getDailyReportSummary(todayStr);
  const isWakel = currentUser.role === 'wakel';

  const dateDisplay = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {isWakel ? 'Dashboard Wakil Kepala Sekolah' : 'Dashboard Admin Presensi'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat kontrol dan ringkasan otomatis statistik kehadiran sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{dateDisplay}</span>
          </span>
          <button
            onClick={() => onSelectView('laporan-harian-otomatis')}
            className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Laporan Otomatis</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Siswa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{summary.totalSiswa}</h3>
          </div>
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-500">Terdaftar aktif</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Hadir */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir Hari Ini</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{summary.hadir}</h3>
          </div>
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
              {summary.persentaseKehadiran}% Kehadiran
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Sakit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sakit</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{summary.sakit}</h3>
          </div>
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-500">Surat terlampir</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Izin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Izin</p>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-1">{summary.izin}</h3>
          </div>
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-500">Izin resmi</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Alpa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alpa / Belum</p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{summary.alpa}</h3>
          </div>
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-rose-500 font-medium">Tanpa keterangan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class Performance Progress List */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Statistik Kehadiran Per Kelas Hari Ini</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Persentase siswa hadir di masing-masing kelas</p>
            </div>
            <button
              onClick={() => onSelectView('laporan-harian-otomatis')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Detail Laporan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {summary.kelasSummary.map(ks => (
              <div key={ks.kelas} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">Kelas {ks.kelas}</span>
                    <span className="text-[10px] text-slate-500">
                      ({ks.hadir}/{ks.total} Hadir)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {ks.terlambat > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {ks.terlambat} Terlambat
                      </span>
                    )}
                    <span className={`text-xs font-bold ${ks.persen >= 90 ? 'text-emerald-600' : ks.persen >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {ks.persen}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-2 transition-all duration-500" style={{ width: `${ks.persen}%` }}></div>
                  <div className="bg-rose-400 h-2 transition-all duration-500" style={{ width: `${((ks.alpa) / ks.total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight & Quick Access Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Automated AI Report Summary Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-6 text-white border border-slate-800 shadow-md relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>LAPORAN OTOMATIS</span>
              </span>
            </div>
            <h4 className="font-bold text-base mb-2 text-white">Ringkasan AI Harian</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {summary.aiInsight}
            </p>
            <button
              onClick={() => onSelectView('laporan-harian-otomatis')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Fitur Laporan Harian Otomatis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions (Admin Only) */}
          {!isWakel && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Akses Cepat Pengelolaan</span>
              </h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => onSelectView('daftar-hadir-guru')}
                  className="w-full flex items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Daftar Hadir Guru</div>
                    <div className="text-[10px] text-slate-400">Absen masuk & pulang cepat</div>
                  </div>
                </button>

                <button
                  onClick={() => onSelectView('scanner')}
                  className="w-full flex items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 transition text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mr-3 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Scan QR Kolektif</div>
                    <div className="text-[10px] text-slate-400">Scan banyak siswa berturut-turut</div>
                  </div>
                </button>

                <button
                  onClick={() => onSelectView('data-siswa')}
                  className="w-full flex items-center p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Direktori Siswa</div>
                    <div className="text-[10px] text-slate-400">Kelola data & cetak kartu QR</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
