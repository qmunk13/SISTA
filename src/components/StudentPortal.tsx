import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  KeyRound,
  Play,
  Award,
  BarChart3,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  ShieldAlert,
  UserCheck,
  UserPen,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  Home,
} from 'lucide-react';
import { UserAccount, ExamSchedule, ExamSubmission, StudentProfile } from '../types';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';
import { StudentEditModal } from './StudentEditModal';

interface StudentPortalProps {
  currentUser: UserAccount;
  onStartExam: (schedule: ExamSchedule) => void;
  onOpenStats: (student: StudentProfile) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  onStartExam,
  onOpenStats,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBiodataDetail, setShowBiodataDetail] = useState(false);

  const [schedules, setSchedules] = useState<ExamSchedule[]>(() => StorageService.getSchedules());
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => StorageService.getSubmissionsByNisn(currentUser.username));
  const [student, setStudent] = useState<StudentProfile>(() => {
    return StorageService.getStudentByNisn(currentUser.username) || {
      id: currentUser.idUser,
      nisn: currentUser.username,
      nama: currentUser.nama,
      jenjang: currentUser.jenjang || 'Paket B',
      kelas: currentUser.kelas || '9',
      rombel: `Rombel KTCT Tambora Kelas ${currentUser.kelas || '9'}`,
      status: 'AKTIF',
      linkFoto: currentUser.linkFoto || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    };
  });

  const handleSaveStudent = (updated: StudentProfile) => {
    StorageService.saveStudent(updated, true);
    setStudent(updated);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setSchedules(StorageService.getSchedules());
      setSubmissions(StorageService.getSubmissionsByNisn(currentUser.username));
      const s = StorageService.getStudentByNisn(currentUser.username);
      if (s) setStudent(s);
    };

    window.addEventListener('ktct_storage_change', handleStorageChange);
    return () => window.removeEventListener('ktct_storage_change', handleStorageChange);
  }, [currentUser.username]);

  // Filter schedules matching student's class and not yet completed
  const completedExamCodes = submissions.map((s) => s.idUjian);
  const studentClass = currentUser.kelas || '9';

  const isScheduleForStudent = (s: ExamSchedule) => {
    if (s.kelas === studentClass) return true;
    if (['4', '5', '6'].includes(studentClass) && (s.jenjang === 'Paket A' || s.kelas === 'Paket A' || (s.namaKelas && s.namaKelas.includes('Paket A')))) return true;
    if (['7', '8', '9'].includes(studentClass) && (s.jenjang === 'Paket B' || s.kelas === 'Paket B' || (s.namaKelas && s.namaKelas.includes('Paket B')))) return true;
    if (['10', '11', '12'].includes(studentClass) && (s.jenjang === 'Paket C' || s.kelas === 'Paket C' || (s.namaKelas && s.namaKelas.includes('Paket C')))) return true;
    return false;
  };

  const studentSchedules = schedules.filter(isScheduleForStudent);
  const activeSchedules = studentSchedules.filter((s) => s.status === 'AKTIF' || s.status === 'Terjadwal');

  const handleOpenTokenModal = (sched: ExamSchedule) => {
    setSelectedSchedule(sched);
    setTokenInput('');
    setTokenError('');
  };

  const handleValidateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    if (!tokenInput.trim()) {
      setTokenError('Token ujian wajib diisi!');
      return;
    }

    if (tokenInput.trim().toUpperCase() !== selectedSchedule.token.toUpperCase()) {
      setTokenError(`Token salah! (Petunjuk: token ujian untuk sesi ini adalah "${selectedSchedule.token}")`);
      return;
    }

    // Token valid -> Start exam
    const target = selectedSchedule;
    setSelectedSchedule(null);
    onStartExam(target);
  };

  const handleDownloadRaporPDF = () => {
    const analysis = StorageService.getIndividualAnalysis(student.nisn);
    ExportService.exportStudentReportCardPDF(student, submissions, analysis);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Student Profile Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            <img
              src={student.linkFoto}
              alt={student.nama}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-indigo-500/40 shadow-2xl"
            />
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 ring-2 ring-emerald-400" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Siswa Aktif CBT</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {student.jenjang} - Kelas {student.kelas}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {student.nama}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-200/80 font-medium">
              NISN: <span className="font-mono text-white font-bold">{student.nisn}</span> • {student.rombel}
            </p>

            <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <button
                onClick={() => onOpenStats(student)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analisis Statistik & Progres Siswa</span>
              </button>

              <button
                onClick={handleDownloadRaporPDF}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Unduh Rapor PTS (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 1 Col: Active Schedules */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Jadwal Ujian Aktif</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
              {activeSchedules.length} Sesi
            </span>
          </div>

          {activeSchedules.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto opacity-30 text-indigo-400" />
              <p className="text-sm font-semibold text-slate-300">
                Tidak ada ujian aktif saat ini
              </p>
              <p className="text-xs text-slate-500">
                Semua mata pelajaran untuk kelas Anda telah diselesaikan atau menunggu jadwal baru dari admin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSchedules.map((sched) => {
                const isCompleted = completedExamCodes.includes(sched.idUjian);

                return (
                  <div
                    key={sched.idJadwal}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-5 shadow-sm hover:shadow-lg transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                          {sched.jenjang} • Kelas {sched.kelas}
                        </span>
                        <h3 className="text-base font-black text-white leading-snug">
                          {sched.mapel}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {sched.status}
                      </span>
                    </div>

                    <div className="bg-slate-800/60 rounded-2xl p-3 space-y-2 text-xs text-slate-300 font-medium">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{sched.hari ? `${sched.hari}, ${sched.tglDisplay || sched.tanggal}` : sched.tanggal}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{sched.jam || `${sched.jamMulai} WIB`}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-700/60">
                        <span className="text-emerald-400 font-medium truncate">{sched.ruangan || 'Ruang CBT Online'}</span>
                        <span>Token: <strong className="font-mono text-indigo-300">{sched.token}</strong></span>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Sudah Dikerjakan</span>
                      </div>
                    ) : sched.status === 'AKTIF' ? (
                      <button
                        onClick={() => handleOpenTokenModal(sched)}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Play className="w-4 h-4" />
                        <span>Mulai Ujian CBT</span>
                      </button>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-slate-800/80 text-amber-300/80 text-center text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Terjadwal (Menunggu Sesi Dibuka)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Anti-Cheat Reminder Box */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-3xl p-5 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-indigo-200 flex items-center gap-1.5 text-sm">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Ketentuan Ujian CBT Karang Taruna</span>
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              1. Pastikan koneksi internet stabil sebelum memasukkan token.
              <br />
              2. Browser akan otomatis meminta tampilan Layar Penuh.
              <br />
              3. Berpindah tab browser akan memicu peringatan pelanggaran (Maksimal 3x).
            </p>
          </div>
        </div>

        {/* Right 2 Cols: Exam History & Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Riwayat Hasil Ujian PTS</span>
            </h2>
            <span className="text-xs text-slate-400">
              Sistem Rekapitulasi Real-Time
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {submissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Award className="w-12 h-12 mx-auto opacity-30 text-indigo-400 mb-2" />
                <p className="text-sm font-semibold text-slate-300">
                  Belum ada riwayat ujian
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih salah satu jadwal ujian di samping untuk memulai pengerjaan CBT.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Mata Pelajaran</th>
                      <th className="p-4 text-center">Nilai Mentah</th>
                      <th className="p-4 text-center">Pelanggaran</th>
                      <th className="p-4 text-center">Penyesuaian</th>
                      <th className="p-4 text-right">Nilai Akhir</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {submissions.map((sub) => {
                      const selisih = sub.nilaiAkhir - sub.nilaiMentah;
                      const isBonus = selisih >= 0;

                      return (
                        <tr
                          key={sub.idHasil}
                          className="hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">
                              {sub.mapel}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {sub.waktuSelesai} • {sub.durasiPengerjaan}
                            </div>
                          </td>
                          <td className="p-4 text-center text-slate-300 font-medium">
                            {sub.nilaiMentah}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.pelanggaran > 0
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {sub.pelanggaran}x
                            </span>
                          </td>
                          <td
                            className={`p-4 text-center font-bold text-xs ${
                              isBonus ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isBonus ? `+${selisih}` : `${selisih}`}
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-base font-black text-indigo-400">
                              {sub.nilaiAkhir}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              / 100
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Token Verification Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <KeyRound className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-center text-white">
              Masukkan Token Ujian
            </h3>
            <p className="text-xs text-slate-300 text-center mt-1">
              Ujian: <strong>{selectedSchedule.mapel}</strong> ({selectedSchedule.durasi} Menit)
            </p>

            <form onSubmit={handleValidateToken} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Token Asesmen (Dari Pengawas Rombel)
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value.toUpperCase());
                    setTokenError('');
                  }}
                  placeholder={`Contoh: ${selectedSchedule.token}`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 text-center font-mono font-black text-lg tracking-widest text-white uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Hint Helper for seamless test evaluation */}
              <p className="text-[11px] text-indigo-300 text-center">
                Token aktif untuk sesi ini: <strong className="underline">{selectedSchedule.token}</strong>
              </p>

              {tokenError && (
                <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/30 py-1.5 px-3 rounded-xl">
                  {tokenError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSchedule(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>Mulai Sekarang</span>
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
