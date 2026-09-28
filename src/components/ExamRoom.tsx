import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  Maximize,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuestionItem, ExamSchedule, UserAccount, ExamSubmission } from '../types';
import { StorageService } from '../services/storageService';

interface ExamRoomProps {
  schedule: ExamSchedule;
  student: UserAccount;
  onFinishExam: (submission: ExamSubmission) => void;
  onExitWithoutSubmit: () => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  schedule,
  student,
  onFinishExam,
  onExitWithoutSubmit,
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [violations, setViolations] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(schedule.durasi * 60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [completionData, setCompletionData] = useState<ExamSubmission | null>(null);

  const MAX_VIOLATIONS = 3;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const violationCooldownRef = useRef<boolean>(false);

  // Load questions
  useEffect(() => {
    const list = StorageService.getQuestionsByExam(schedule.idUjian);
    setQuestions(list);

    // Enter fullscreen if supported
    enterFullscreen();

    // Prevent navigation / refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Jawaban Anda mungkin belum tersubmit.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [schedule]);

  // Fullscreen helper
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Fullscreen might be restricted in some iframes, graceful fallback
    }
  };

  // Anti-Cheating: Detect blur and tab switches
  useEffect(() => {
    const triggerViolation = (reason: string) => {
      if (violationCooldownRef.current || isSubmitting || completionData) return;
      violationCooldownRef.current = true;

      setViolations((prev) => {
        const next = prev + 1;

        // Record violation to persistent storage
        StorageService.recordViolation({
          idUjian: schedule.idUjian,
          nisn: student.username,
          namaSiswa: student.nama,
          jenjang: schedule.jenjang,
          kelas: schedule.kelas,
          mapel: schedule.mapel,
          jenisPelanggaran: `${reason} (${next}x)`,
          token: schedule.token,
          keterangan: `Sistem CBT mendeteksi aktivitas mencurigakan saat mengerjakan soal nomor ${currentIndex + 1}.`,
        });

        setWarningReason(reason);
        setShowWarningModal(true);

        // Max violations threshold reached -> Force submit!
        if (next >= MAX_VIOLATIONS) {
          setTimeout(() => {
            handleFinalSubmit(next, true);
          }, 2000);
        }

        return next;
      });

      setTimeout(() => {
        violationCooldownRef.current = false;
      }, 2500);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Pindah Tab atau Membuka Aplikasi Lain');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Kehilangan Fokus Layar Ujian');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };

    // Anti copy-paste-contextmenu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyCutPaste = (e: ClipboardEvent) => e.preventDefault();

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
    };
  }, [schedule, student, currentIndex, isSubmitting, completionData]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinalSubmit(violations, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [violations]);

  // Format Timer
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (choice: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: choice,
    }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const handleFinalSubmit = (currentViolations = violations, isForce = false) => {
    if (isSubmitting || completionData) return;

    if (!isForce && answeredCount < questions.length) {
      alert(`Tidak Dapat Mengumpulkan: Seluruh ${questions.length} butir soal wajib dijawab! Masih ada ${questions.length - answeredCount} soal kosong.`);
      setShowConfirmSubmit(false);
      return;
    }

    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    let benar = 0;
    let salah = 0;
    let totalBobot = 0;
    let skorDiperoleh = 0;

    questions.forEach((q, idx) => {
      const bobot = q.bobot || 1;
      totalBobot += bobot;
      const userAns = answers[idx];

      if (userAns && userAns.toUpperCase() === q.kunci.toUpperCase()) {
        benar++;
        skorDiperoleh += bobot;
      } else {
        salah++;
      }
    });

    const evaluated = StorageService.evaluateExamResult({
      totalBobot,
      skorDiperoleh,
      pelanggaran: currentViolations,
      maxPelanggaran: MAX_VIOLATIONS,
    });

    const elapsedSeconds = schedule.durasi * 60 - timeRemaining;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedSecs = elapsedSeconds % 60;
    const durasiText = `${elapsedMinutes} menit ${elapsedSecs} detik`;

    const submission: ExamSubmission = {
      idHasil: 'HSL-' + Date.now(),
      idJadwal: schedule.idJadwal,
      idUjian: schedule.idUjian,
      mapel: schedule.mapel,
      jenjang: schedule.jenjang,
      kelas: schedule.kelas,
      nisn: student.username,
      namaSiswa: student.nama,
      nilaiMentah: evaluated.nilaiMentah,
      jmlBenar: benar,
      jmlSalah: salah,
      totalSoal: questions.length,
      pelanggaran: currentViolations,
      nilaiAkhir: evaluated.nilaiAkhir,
      status: evaluated.status,
      waktuSelesai: new Date().toISOString().replace('T', ' ').substring(0, 19),
      durasiPengerjaan: durasiText,
      tahunAjaran: schedule.tahunAjaran,
      jawabanUser: answers,
    };

    // Save submission to database
    StorageService.saveSubmission(submission);
    setCompletionData(submission);
    setShowConfirmSubmit(false);
    setIsSubmitting(false);

    // Confetti effect if passed
    if (evaluated.nilaiAkhir >= 65 && currentViolations < MAX_VIOLATIONS) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentIndex];

  // If completed, show celebration result modal
  if (completionData) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-850 border border-indigo-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-2">
            ASESMEN TELAH SELESAI
          </span>

          <h2 className="text-2xl font-black text-white">
            Hasil Ujian PTS Anda
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {schedule.mapel} • Kelas {schedule.kelas} ({student.nama})
          </p>

          {/* Score Box */}
          <div className="my-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <span className="text-xs font-bold text-slate-300">Nilai Akhir:</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-indigo-400">
                  {completionData.nilaiAkhir}
                </span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Nilai Mentah:</span>
                <p className="font-bold text-slate-200">{completionData.nilaiMentah}</p>
              </div>
              <div>
                <span className="text-slate-400">Status Kelulusan:</span>
                <p className="font-bold text-emerald-400">{completionData.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Benar / Salah:</span>
                <p className="font-bold text-slate-200">
                  {completionData.jmlBenar} Benar • {completionData.jmlSalah} Salah
                </p>
              </div>
              <div>
                <span className="text-slate-400">Pelanggaran Layar:</span>
                <p className={`font-bold ${completionData.pelanggaran > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {completionData.pelanggaran}x Pelanggaran
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Durasi Pengerjaan:</span>
                <p className="font-bold text-slate-200">{completionData.durasiPengerjaan}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Data ujian telah tersimpan secara otomatis ke database dan rekapitulasi guru serta portal orang tua.
          </p>

          <button
            onClick={() => onFinishExam(completionData)}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            Kembali ke Dashboard Siswa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Exam Status Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
            CBT
          </div>
          <div>
            <h1 className="font-black text-sm sm:text-base text-white tracking-tight">
              {schedule.mapel}
            </h1>
            <p className="text-[11px] text-slate-400">
              Kelas {schedule.kelas} • {student.nama} ({student.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connection Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>

          {/* Violations Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
              violations === 0
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Pelanggaran: {violations}/{MAX_VIOLATIONS}</span>
          </div>

          {/* Timer Countdown */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-black border ${
              timeRemaining <= 300
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={enterFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hidden sm:block"
            title="Layar Penuh"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Exam Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Question Content */}
        <div className="lg:col-span-3 space-y-5">
          {questions.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-12 text-center border border-slate-800">
              <p className="text-slate-400 text-sm">Sedang mempersiapkan soal ujian...</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    dari {questions.length} Soal
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFlag}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      flagged[currentIndex]
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{flagged[currentIndex] ? 'Ditandai Ragu-ragu' : 'Ragu-ragu'}</span>
                  </button>

                  <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 font-bold">
                    Bobot {currentQuestion?.bobot || 20}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-slate-100 text-base sm:text-lg leading-relaxed font-medium">
                {currentQuestion?.soal}
              </div>

              {/* Optional Diagram / Image */}
              {currentQuestion?.gambar && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-center">
                  <img
                    src={currentQuestion.gambar}
                    alt="Diagram Soal"
                    className="max-h-64 object-contain rounded-xl"
                  />
                </div>
              )}

              {/* Choices (A, B, C, D) */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const text = currentQuestion?.[letter.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
                  const isSelected = answers[currentIndex] === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectAnswer(letter)}
                      className={`text-left p-4 rounded-2xl border flex items-start gap-4 transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-md'
                          : 'bg-slate-850/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm pt-0.5 leading-relaxed font-normal">
                        {text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border ${
                    currentIndex === 0
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition active:scale-95"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmSubmit(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95"
                  >
                    <span>Selesai & Kumpulkan</span>
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Question Navigator Palette */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-3">
              Navigasi Nomor Soal
            </h3>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = idx === currentIndex;
                const isFlagged = flagged[idx];

                let bg = 'bg-slate-800/80 text-slate-400 border-slate-700';
                if (isAnswered) {
                  bg = 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 font-bold';
                }
                if (isFlagged) {
                  bg = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold';
                }
                if (isCurrent) {
                  bg += ' ring-2 ring-indigo-400 text-white';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs flex items-center justify-center border transition relative ${bg}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-600/30 border border-emerald-500" />
                <span>Terjawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500" />
                <span>Ragu-ragu ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
                <span>Belum Dijawab ({questions.length - answeredCount})</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              className="w-full mt-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kumpulkan Ujian</span>
            </button>
          </div>

          {/* Cheating Rule Notice */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-[11px] text-indigo-300 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-indigo-200 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Protokol CBT Anti-Nyontek:</span>
            </p>
            Dilarang berganti tab atau keluar dari browser. Setiap pelanggaran dicatat otomatis oleh server dan mengurangi skor penyesuaian (-5 poin).
          </div>
        </div>
      </main>

      {/* Warning Modal when violation triggered */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto mb-4 text-rose-400 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-rose-400">
              Peringatan Pelanggaran!
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Sistem CBT mendeteksi aktivitas: <br />
              <strong className="text-rose-300">"{warningReason}"</strong>
            </p>

            <div className="my-4 p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl">
              <span className="text-xs text-slate-300 block">Total Pelanggaran Anda:</span>
              <span className="text-3xl font-black text-rose-400">
                {violations} / {MAX_VIOLATIONS}
              </span>
              <p className="text-[10px] text-rose-300 mt-1">
                {violations >= MAX_VIOLATIONS
                  ? 'Batas pelanggaran terlampaui! Ujian akan dihentikan secara paksa.'
                  : 'Jika mencapai 3x pelanggaran, ujian otomatis dihentikan dan dinyatakan diskualifikasi.'}
              </p>
            </div>

            <button
              onClick={() => {
                setShowWarningModal(false);
                enterFullscreen();
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
            >
              Saya Mengerti & Kembali ke Ujian
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 text-white shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">
              Kumpulkan Lembar Jawaban?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> butir soal.
            </p>

            {answeredCount < questions.length ? (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-600/60 text-xs text-rose-300">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Tidak Bisa Mengumpulkan:</span>
                </p>
                Seluruh <strong>{questions.length} butir soal wajib terisi</strong>. Masih ada <strong>{questions.length - answeredCount} butir soal</strong> yang belum Anda jawab.
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-600/60 text-xs text-emerald-300">
                ✓ Seluruh {questions.length} butir soal telah terisi lengkap. Anda siap mengumpulkan lembar jawaban.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  if (answeredCount < questions.length) {
                    const firstEmpty = questions.findIndex((_, idx) => !answers[idx]);
                    if (firstEmpty >= 0) setCurrentIndex(firstEmpty);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                {answeredCount < questions.length ? 'Lengkapi Jawaban' : 'Cek Kembali'}
              </button>

              {answeredCount < questions.length ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed opacity-60"
                  title="Wajib terisi semua sebelum submit"
                >
                  Wajib Terisi Semua
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(violations, false)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ya, Kumpulkan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
