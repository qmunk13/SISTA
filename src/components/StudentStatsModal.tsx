import React from 'react';
import {
  X,
  TrendingUp,
  ShieldCheck,
  Award,
  AlertCircle,
  BookOpen,
  Download,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { StudentProfile } from '../types';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';

interface StudentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
}

export const StudentStatsModal: React.FC<StudentStatsModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  if (!isOpen || !student) return null;

  const analysis = StorageService.getIndividualAnalysis(student.nisn);
  const submissions = StorageService.getSubmissionsByNisn(student.nisn);

  const handleDownloadPDF = () => {
    ExportService.exportStudentReportCardPDF(student, submissions, analysis);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 text-white">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900">
          <div className="flex items-center gap-4">
            <img
              src={student.linkFoto}
              alt={student.nama}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">{student.nama}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Kelas {student.kelas} ({student.jenjang})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                NISN: <span className="font-mono text-indigo-300 font-bold">{student.nisn}</span> • {student.rombel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Key Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Rata-rata Nilai
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-400">
                  {analysis.rataRataNilai}
                </span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Mentah: {analysis.rataRataMentah}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Skor Integritas
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${
                  analysis.integritasScore >= 90 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {analysis.integritasScore}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {analysis.totalPelanggaran === 0 ? 'Bersih (Disiplin)' : `${analysis.totalPelanggaran}x Pelanggaran`}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Ujian Diikuti
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {analysis.totalUjianDiikuti}
                </span>
                <span className="text-xs text-slate-500">Mata Pelajaran</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tahun Ajaran 2025/2026
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Kelulusan PTS
              </span>
              <span className="inline-block text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-1">
                {analysis.statusKelulusan}
              </span>
              <p className="text-[10px] text-slate-400 mt-1.5">
                KKM Minimum: 65
              </p>
            </div>
          </div>

          {/* Competency by Subject & Class Benchmark */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Penguasaan Materi & Perbandingan dengan Rata-rata Rombel</span>
            </h3>

            {analysis.mapelBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada data ujian yang selesai.</p>
            ) : (
              <div className="space-y-4">
                {analysis.mapelBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-200">{item.mapel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Rombel: {item.benchmarkKelas}</span>
                        <span className="text-indigo-400 font-black text-sm">{item.nilai}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                          {item.kategori}
                        </span>
                      </div>
                    </div>
                    {/* Visual Bar Comparison */}
                    <div className="w-full bg-slate-700/60 rounded-full h-3 relative overflow-hidden">
                      {/* Benchmark marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                        style={{ left: `${item.benchmarkKelas}%` }}
                        title={`Rata-rata Rombel: ${item.benchmarkKelas}`}
                      />
                      {/* Student Score Bar */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.nilai >= 75
                            ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                            : item.nilai >= 65
                            ? 'bg-gradient-to-r from-indigo-500 to-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(item.nilai, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual Strengths & Improvement Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Kekuatan Utama Siswa</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysis.kekuatan.map((k, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Area Perbaikan & Rekomendasi Guru</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysis.rekomendasi.concat(analysis.areaPerbaikan).map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Laporan dievaluasi otomatis oleh Sistem CBT Karang Taruna Tambora
          </p>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800 transition"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rapor PDF Resmi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
