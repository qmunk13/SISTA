import React, { useState } from 'react';
import {
  User,
  Heart,
  Award,
  Download,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { UserAccount, StudentProfile } from '../types';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';

interface ParentDashboardProps {
  currentUser: UserAccount;
  onOpenStats: (student: StudentProfile) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  currentUser,
  onOpenStats,
}) => {
  // Find child based on nisnAnak or default to first student
  const childNisn = currentUser.nisnAnak || '0081234501';
  const child = StorageService.getStudentByNisn(childNisn) || StorageService.getStudents()[0];
  const submissions = StorageService.getSubmissionsByNisn(child.nisn);
  const violations = StorageService.getViolations().filter((v) => v.nisn === child.nisn);
  const analysis = StorageService.getIndividualAnalysis(child.nisn);
  const schedules = StorageService.getSchedules().filter((s) => s.kelas === child.kelas);

  const handleDownloadRaporPDF = () => {
    ExportService.exportStudentReportCardPDF(child, submissions, analysis);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 text-white">
      {/* Parent Greeting & Child Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={child.linkFoto}
                alt={child.nama}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-purple-500/40 shadow-xl"
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                  <span>Portal Orang Tua / Wali Murid</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  Kelas {child.kelas} ({child.jenjang})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {child.nama}
              </h1>
              <p className="text-xs text-purple-200/80">
                Wali Murid: <strong>{currentUser.nama}</strong> • NISN Anak: <span className="font-mono">{child.nisn}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => onOpenStats(child)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analisis Statistik Anak</span>
            </button>
            <button
              onClick={handleDownloadRaporPDF}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Unduh Rapor PTS (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Rata-rata Nilai Anak
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-purple-400">
              {analysis.rataRataNilai}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {analysis.statusKelulusan}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Indeks Disiplin CBT
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black ${
              analysis.integritasScore >= 80 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {analysis.integritasScore}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {analysis.totalPelanggaran === 0 ? 'Tertib tanpa kecurangan' : `${analysis.totalPelanggaran}x Pindah Tab`}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Ujian Telah Dikerjakan
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {submissions.length}
            </span>
            <span className="text-xs text-slate-500">Mata Pelajaran</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Dari {schedules.length} Sesi Terjadwal
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Status Kehadiran
          </span>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-black text-emerald-400">
              Terverifikasi Hadir
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            Rombel KTCT Tambora
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Exam Results Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span>Daftar Nilai PTS Terbaru</span>
            </h2>
            <span className="text-xs text-slate-400">
              Update Real-Time
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Belum ada nilai ujian yang tersimpan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Mata Pelajaran</th>
                      <th className="p-4 text-center">Nilai Mentah</th>
                      <th className="p-4 text-center">Pelanggaran</th>
                      <th className="p-4 text-right">Nilai Akhir</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {submissions.map((sub) => (
                      <tr key={sub.idHasil} className="hover:bg-slate-850/60 transition">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{sub.mapel}</p>
                          <span className="text-[10px] text-slate-400">
                            {sub.waktuSelesai} • Durasi: {sub.durasiPengerjaan}
                          </span>
                        </td>
                        <td className="p-4 text-center font-medium text-slate-300">
                          {sub.nilaiMentah}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.pelanggaran > 0
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {sub.pelanggaran}x
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-base font-black text-purple-400">
                            {sub.nilaiAkhir}
                          </span>
                          <span className="text-[10px] text-slate-500 block">/ 100</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Violation Transparency & Upcoming Schedules */}
        <div className="lg:col-span-1 space-y-6">
          {/* Transparency: Violations Log for Parents */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Transparansi Kedisiplinan Layar</span>
            </h3>

            {violations.length === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-300">
                  Anak Anda Sangat Berdisiplin!
                </p>
                <p className="text-[10px] text-slate-400">
                  Tidak ada catatan pembukaan tab atau aplikasi lain selama ujian CBT.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {violations.map((v) => (
                  <div
                    key={v.idPelanggaran}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-rose-500/20 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-rose-400">{v.jenisPelanggaran}</span>
                      <span className="text-[10px] text-slate-400">{v.waktu.split(' ')[1]}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{v.mapel}</p>
                    <p className="text-[10px] text-slate-400">{v.keterangan}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Schedules for Child */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Jadwal Ujian Anak Mendatang</span>
            </h3>
            <div className="space-y-2 text-xs">
              {schedules.map((s) => (
                <div
                  key={s.idJadwal}
                  className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-200">{s.mapel}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.tanggal} • {s.jamMulai} WIB ({s.durasi} Menit)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-700 text-slate-300">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
