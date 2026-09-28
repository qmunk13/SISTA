import React from 'react';
import {
  Users,
  CalendarCheck,
  GraduationCap,
  UserPlus,
  Wallet,
  Laptop2,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  BookOpen
} from 'lucide-react';
import { Siswa, Guru, Absensi, PendaftarSPMB, Tabungan, Ujian } from '../../types';

interface DashboardModuleProps {
  siswaList: Siswa[];
  guruList: Guru[];
  absensiList: Absensi[];
  spmbList: PendaftarSPMB[];
  tabunganList: Tabungan[];
  ujianList: Ujian[];
  onNavigate: (tab: string) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  siswaList,
  guruList,
  absensiList,
  spmbList,
  tabunganList,
  ujianList,
  onNavigate
}) => {
  const totalHadir = absensiList.filter((a) => a.Status === 'Hadir').length;
  const totalSakit = absensiList.filter((a) => a.Status === 'Sakit').length;
  const totalIzin = absensiList.filter((a) => a.Status === 'Izin').length;
  const totalAlpa = absensiList.filter((a) => a.Status === 'Alpa').length;

  const totalTabungan = tabunganList.reduce((acc, t) => acc + (t.Debit - t.Kredit), 0);
  const totalPendaftar = spmbList.length;
  const totalDiterima = spmbList.filter((s) => s.Status === 'Diterima').length;

  return (
    <div className="space-y-6">
      {/* Banner Selamat Datang */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> System Integration GAS Master Version
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-tight">
            Sistem ERP Sekolah Terpadu Google Apps Script
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed font-medium">
            Terhubung langsung dengan 60 Tab Master Spreadsheet ID <code className="bg-black/30 px-2 py-0.5 rounded text-blue-300">1AS8bfr6...</code> & Drive Folder ID <code className="bg-black/30 px-2 py-0.5 rounded text-indigo-300">17aeDN2...</code>
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onNavigate('gas-export')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <span>Lihat Kode Code.gs & Index.html</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('database')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition"
            >
              Jelajahi Skema 60 Tab
            </button>
          </div>
        </div>
      </div>

      {/* 6 Quick Stat Cards for 6 Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Modul 1: Absensi */}
        <div
          onClick={() => onNavigate('absensi')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Modul 1
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Hadir Hari Ini</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{totalHadir} Siswa</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Izin: {totalIzin} | Sakit: {totalSakit} | Alpa: {totalAlpa}</p>
        </div>

        {/* Modul 2: Nilai */}
        <div
          onClick={() => onNavigate('nilai')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              Modul 2
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Rata-Rata Rapor</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">86.4</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ 98.5% Tuntas KKM</p>
        </div>

        {/* Modul 3: SISKO */}
        <div
          onClick={() => onNavigate('sisko')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Modul 3
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Data Master</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{siswaList.length} Siswa</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">{guruList.length} Guru & Pendidik</p>
        </div>

        {/* Modul 4: SPMB */}
        <div
          onClick={() => onNavigate('spmb')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              Modul 4
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">SPMB / PPDB</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{totalPendaftar} Pendaftar</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">{totalDiterima} Diterima</p>
        </div>

        {/* Modul 5: Keuangan */}
        <div
          onClick={() => onNavigate('tabungan')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              Modul 5
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Saldo Tabungan</p>
          <h3 className="text-lg font-black text-slate-800 mt-1">
            Rp {(totalTabungan / 1000000).toFixed(1)} Juta
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Auto-debet SPP Aktif</p>
        </div>

        {/* Modul 6: Ujian */}
        <div
          onClick={() => onNavigate('ujian')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <Laptop2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Modul 6
            </span>
          </div>
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Ujian Online</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{ujianList.length} Jadwal</h3>
          <p className="text-[10px] text-indigo-600 font-bold mt-1">CBT & Token Dinamis</p>
        </div>
      </div>

      {/* Detail Section & System Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Nav Cards */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Akses Cepat 6 Modul Utama ERP</h3>
              <p className="text-xs text-slate-500 mt-0.5">Operasional sekolah terpusat pada satu database Google Sheets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('absensi')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">
                  Pencatatan Kehadiran (Absensi)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Scan QR code, lokasi GPS, absensi harian kelas, dan absensi guru.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('nilai')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-purple-700 transition">
                  Penilaian & Cetak Rapor
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Input nilai per KD, Leger nilai, ranking otomatis, dan cetak rapor semester.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('sisko')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-blue-700 transition">
                  SISKO (Sistem Informasi Sekolah)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Siswa, Guru, Wali Murid, Kelas, Jurusan, Kenaikan Kelas & Kelulusan.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('spmb')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-amber-50/50 hover:border-amber-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-amber-700 transition">
                  SPMB / Penerimaan Siswa Baru
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Formulir pendaftaran online, verifikasi berkas Drive, seleksi, & daftar ulang.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('tabungan')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-teal-700 transition">
                  Tabungan & Keuangan Sekolah
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Setoran tabungan, tagihan SPP, pembayaran kasir, & buku kas umum.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('ujian')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition text-left group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                <Laptop2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 group-hover:text-indigo-700 transition">
                  Manajemen Ujian Online (CBT)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Bank Soal, Token dinamis, timer otomatis, anti-cheating, & analisis butir soal.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center text-xl mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-white">Status Master Database</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Arsitektur database terdiri dari 60 Tab Spreadsheet terkoordinasi dengan relasi ID terpusat.
            </p>

            <div className="mt-6 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/10">
                <span className="text-slate-400">Total Tab Schemas</span>
                <span className="font-bold text-emerald-400">60 Tab Selesai</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/10">
                <span className="text-slate-400">Master Spreadsheet ID</span>
                <span className="font-mono text-[10px] text-blue-300">1AS8bfr6...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/10">
                <span className="text-slate-400">Drive Media Storage ID</span>
                <span className="font-mono text-[10px] text-indigo-300">17aeDN26...</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Status Server GAS</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready Deploy
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('gas-export')}
            className="w-full mt-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition shadow"
          >
            Salin / Download Kode Complete
          </button>
        </div>
      </div>
    </div>
  );
};
