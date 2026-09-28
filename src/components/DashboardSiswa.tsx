import React from 'react';
import {
  User as UserIcon,
  Calendar,
  Clock,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Award,
  IdCard
} from 'lucide-react';
import { User } from '../types';
import { getAbsensiRecords, getTodayDateString, checkHolidayToday, getSiswaByNisn } from '../lib/storage';

interface DashboardSiswaProps {
  currentUser: User;
  onSelectView: (view: string) => void;
}

export const DashboardSiswa: React.FC<DashboardSiswaProps> = ({
  currentUser,
  onSelectView
}) => {
  const todayStr = getTodayDateString();
  const nisn = currentUser.nisn || currentUser.username;
  const siswaDetail = getSiswaByNisn(nisn);

  const { isLibur, keterangan: holidayKet } = checkHolidayToday(todayStr);
  const records = getAbsensiRecords().filter(r => r.tanggal === todayStr && r.nisn.replace(/[^a-zA-Z0-9]/g, '') === nisn.replace(/[^a-zA-Z0-9]/g, ''));
  const todayRecord = records.length > 0 ? records[0] : null;

  const dateDisplay = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Hero Welcome Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-md transition-all ${
        isLibur
          ? 'bg-gradient-to-br from-rose-700 to-red-900'
          : todayRecord
            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'
            : 'bg-gradient-to-br from-amber-800 to-slate-900'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-indigo-300 mb-1">{dateDisplay}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hai, {currentUser.nama.split(' ')[0]} 👋
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {isLibur
                ? `Hari ini Libur: ${holidayKet}`
                : todayRecord
                  ? 'Kehadiran Anda telah dicatat oleh sistem sekolah.'
                  : 'Anda belum melakukan scan absensi masuk hari ini. Harap lakukan scan QR.'}
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold shadow-xs flex items-center gap-2 shrink-0">
            {isLibur ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span>HARI LIBUR</span>
              </>
            ) : todayRecord ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SUDAH ABSEN: {todayRecord.status}</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>BELUM SCAN</span>
              </>
            )}
          </div>
        </div>

        {/* Time Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Jam Datang</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
              {todayRecord ? todayRecord.jamDatang : '--:--'}
            </div>
            {todayRecord && (
              <p className="text-[10px] text-emerald-300 font-semibold mt-1">{todayRecord.keterangan}</p>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Jam Pulang</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
              {todayRecord && todayRecord.jamPulang !== '-' ? todayRecord.jamPulang : '--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl mx-auto mb-3 border-2 border-indigo-200 shadow-xs">
            {(currentUser?.nama || currentUser?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <h3 className="font-bold text-slate-800 text-base">{currentUser?.nama || currentUser?.name || 'Siswa'}</h3>
          <p className="text-xs font-mono text-slate-500 mt-0.5">NISN: {nisn}</p>

          <div className="grid grid-cols-2 gap-3 mt-6 text-left">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Kelas</p>
              <p className="text-xs font-bold text-slate-800">{siswaDetail ? siswaDetail.kelas : currentUser.kelas || '-'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Status Siswa</p>
              <p className="text-xs font-bold text-emerald-600">Aktif Terdaftar</p>
            </div>
          </div>
        </div>

        {/* Digital Student Card CTA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Kartu Pelajar Digital QR</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tampilkan QR Code Anda kepada guru atau petugas piket untuk scan kehadiran harian secara otomatis.
            </p>
          </div>

          <button
            onClick={() => onSelectView('kartu-siswa')}
            className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <IdCard className="w-4 h-4" />
            <span>Tampilkan Kartu QR Saya</span>
          </button>
        </div>
      </div>
    </div>
  );
};
