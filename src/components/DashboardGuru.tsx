import React from 'react';
import {
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserX,
  Camera,
  ArrowRight,
  Eye,
  Calendar
} from 'lucide-react';
import { User } from '../types';
import { getSiswaList, getMonitoringRealtime, getTodayDateString } from '../lib/storage';

interface DashboardGuruProps {
  currentUser: User;
  onSelectView: (view: string) => void;
  onRefresh: () => void;
}

export const DashboardGuru: React.FC<DashboardGuruProps> = ({
  currentUser,
  onSelectView,
  onRefresh
}) => {
  const todayStr = getTodayDateString();
  const assignedClassesStr = currentUser.kelas || '';
  const assignedList = assignedClassesStr ? assignedClassesStr.split(',').map(k => k.trim()) : [];

  const studentList = getSiswaList(assignedClassesStr);
  const records = getMonitoringRealtime(assignedClassesStr);

  const hadir = records.filter(r => r.status === 'Hadir').length;
  const sakit = records.filter(r => r.status === 'Sakit').length;
  const izin = records.filter(r => r.status === 'Izin').length;
  const alpa = records.filter(r => r.status === 'Alpa').length;
  const belumAbsen = records.filter(r => r.status === 'Belum Absen').length;
  const totalSiswa = studentList.length;

  const dateDisplay = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Dashboard Guru Wali Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan kehadiran siswa di kelas binaan: <span className="font-bold text-indigo-600">{assignedClassesStr || 'Semua Kelas'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{dateDisplay}</span>
          </span>
          <button
            onClick={() => onSelectView('daftar-hadir-guru')}
            className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Buka Daftar Hadir</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa Binaan</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{totalSiswa}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Kelas {assignedClassesStr}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir Hari Ini</p>
          <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{hadir}</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-2">
            {totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0}% Kehadiran
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sakit / Izin</p>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{sakit + izin}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Sakit: {sakit} | Izin: {izin}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alpa / Belum Absen</p>
          <h3 className="text-3xl font-extrabold text-rose-600 mt-2">{alpa + belumAbsen}</h3>
          <p className="text-[10px] text-rose-500 font-medium mt-2">Perlu pemeriksaan</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Daftar Hadir Kelas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Catat absensi masuk & pulang secara cepat atau gunakan scanner QR live.
            </p>
          </div>
          <button
            onClick={() => onSelectView('daftar-hadir-guru')}
            className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Isi Presensi Kelas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Kelola Izin & Surat Dokter</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi permohonan izin, alasan, dan bukti foto dari siswa/orang tua.
            </p>
          </div>
          <button
            onClick={() => onSelectView('kelola-izin')}
            className="mt-5 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Buka Pengajuan Izin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Monitoring Realtime</h3>
            <p className="text-xs text-slate-500 mt-1">
              Pantau status jam masuk, jam pulang, dan update status siswa langsung.
            </p>
          </div>
          <button
            onClick={() => onSelectView('monitoring')}
            className="mt-5 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Pantau Realtime</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
