import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Clock, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, 
  Send, Award, RefreshCw, Check, Sparkles, BookOpen, AlertCircle,
  FileQuestion, Flag, ZoomIn, Grid, HelpCircle, Layers, Maximize2,
  ShieldAlert, ShieldCheck, Lock, AlertOctagon, Eye, Monitor, Volume2, Play,
  FileText, ExternalLink
} from 'lucide-react';
import { db } from '../../data/db';
import { recordCbtHeartbeat, recordCbtViolation, CBT_MONITOR_KEY } from '../../utils/cbtMonitorHelper';
import { validateExamSchedule } from '../../utils/examScheduleValidation';
import { getLastExtractedPdfImages, PdfPageImage } from '../../utils/pdfExtractor';
import { submitCbtExamResult } from '../../services/cbtSubmissionService';

interface QuestionItem {
  id: number | string;
  pertanyaan: string;
  tipe: 'Pilihan Ganda';
  opsi: {
    a: string;
    b: string;
    c: string;
    d: string;
    e?: string;
  };
  kunci: string;
  bobot: number;
  pembahasan?: string;
  gambar?: string;
  gambarUrl?: string;
  imageUrl?: string;
  LinkGambar?: string;
}

interface KuisPilihanGandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tugas: {
    id: string;
    judul: string;
    mapel: string;
    kelas: string;
    tenggat?: string;
    soalList?: QuestionItem[];
    isCbtExam?: boolean;
    isExam?: boolean;
    isTugas?: boolean;
    isPenugasan?: boolean;
    type?: string;
    kategori?: string;
    jenjang?: string;
    durasi?: number | string;
    jenis?: string;
    [key: string]: any;
  } | null;
  student?: {
    id?: string;
    name?: string;
    nama?: string;
    nisn?: string;
    class?: string;
    [key: string]: any;
  } | null;
  onQuizCompleted?: (score: number, correctCount: number, totalCount: number) => void;
}

export default function KuisPilihanGandaModal({
  isOpen,
  onClose,
  tugas,
  student,
  onQuizCompleted
}: KuisPilihanGandaModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string | number]: string }>({});
  const [raguMap, setRaguMap] = useState<{ [questionId: string | number]: boolean }>({});
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<{
    score: number;
    correctCount: number;
    wrongCount: number;
    total: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds

  // ANTI-NYONTEK & SECURITY MONITORING STATES
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [proctorBroadcast, setProctorBroadcast] = useState<{ message: string; timestamp: string } | null>(null);
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    reason: string;
    message: string;
    count: number;
  } | null>(null);
  const [isLockedPermanently, setIsLockedPermanently] = useState(false);

  // Initialize/Reset state when exam opens
  useEffect(() => {
    if (isOpen && tugas) {
      setInputToken('');
      setTokenError(null);
      const isCbt = Boolean(tugas.isCbtExam || tugas.isExam || tugas.type === 'CBT_EXAM');
      setHasStartedExam(!isCbt);
    }
  }, [isOpen, tugas?.id]);

  const handleStartExamWithToken = () => {
    const scheduleInfo = validateExamSchedule(tugas, false);
    if (!scheduleInfo.isOpen) {
      setTokenError(scheduleInfo.detailedMessage);
      return;
    }

    const isCbt = Boolean(tugas?.isCbtExam || tugas?.isExam || tugas?.type === 'CBT_EXAM');
    if (isCbt) {
      const expectedToken = String(tugas?.token || '').trim();
      const entered = inputToken.trim();

      if (expectedToken) {
        if (!entered) {
          setTokenError('Silakan masukkan token ujian yang diberikan oleh proktor pengawas.');
          return;
        }
        if (entered.toUpperCase() !== expectedToken.toUpperCase()) {
          setTokenError('Token ujian salah atau tidak sesuai untuk sesi dan kelas Anda.');
          return;
        }
      }
    }
    setTokenError(null);
    requestFullscreenMode();
    setHasStartedExam(true);
  };

  // Listen to live broadcasts from proctor
  useEffect(() => {
    const handleBroadcastEvent = (e: any) => {
      if (e?.detail) {
        setProctorBroadcast({
          message: e.detail.message,
          timestamp: e.detail.timestamp || new Date().toLocaleTimeString('id-ID')
        });
      }
    };
    window.addEventListener('cbt-proctor-broadcast', handleBroadcastEvent);
    return () => window.removeEventListener('cbt-proctor-broadcast', handleBroadcastEvent);
  }, []);

  // Helper to validate whether a question has a valid illustration/diagram/image
  const isValidDiagram = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""') return false;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/images/') || trimmed.startsWith('./');
  };

  // Check if we have extracted PDF images from the uploaded PDF in this session or stored with the exam
  const fallbackPdfImages: PdfPageImage[] = useMemo(() => {
    return (tugas?.pdfImages && tugas.pdfImages.length > 0) ? tugas.pdfImages : getLastExtractedPdfImages();
  }, [tugas]);

  const questions: QuestionItem[] = useMemo(() => {
    if (!tugas) return [];
    const rawList: any[] = (tugas?.soalList || (tugas as any)?.soal || (tugas as any)?.questions || []) as any[];
    if (!Array.isArray(rawList)) return [];

    return rawList
      .filter((q: any) => {
        if (!q || typeof q !== 'object') return false;
        const p = (q.pertanyaan || q.Pertanyaan || q.soal || q.Soal || '').trim();
        if (!p || p === '-') return false;
        if (p.includes('Berapakah hasil dari 15 x 6?') || p.includes('Ibu kota negara Indonesia saat ini')) return false;
        return true;
      })
      .map((q: any, idx: number) => {
        const qId = q.id !== undefined && q.id !== null ? q.id : (idx + 1);
        const rawOpsi = q.opsi || {
          a: q.opsiA || q.OpsiA || '',
          b: q.opsiB || q.OpsiB || '',
          c: q.opsiC || q.OpsiC || '',
          d: q.opsiD || q.OpsiD || '',
          e: q.opsiE || q.OpsiE || ''
        };
        const rawGambar = (q.gambar || q.Gambar || q.gambarUrl || q.imageUrl || q.LinkGambar || q['Link Gambar'] || '').trim();
        return {
          id: qId,
          pertanyaan: q.pertanyaan || q.Pertanyaan || q.soal || q.Soal || '',
          tipe: 'Pilihan Ganda' as const,
          opsi: rawOpsi,
          kunci: String(q.kunci || q.kunciJawaban || q.KunciJawaban || 'a').toLowerCase(),
          bobot: Number(q.bobot || q.Bobot || 5),
          pembahasan: q.pembahasan || q.Pembahasan || '',
          gambar: rawGambar || undefined
        };
      });
  }, [tugas]);

  const currentQ = questions && questions.length > 0 ? (questions[currentIdx] || questions[0]) : null;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const raguCount = Object.values(raguMap).filter(Boolean).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  // Request Fullscreen helper
  const requestFullscreenMode = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      setHasStartedExam(true);
    } catch (err) {
      console.log('Fullscreen permission info:', err);
      setIsFullscreen(true);
      setHasStartedExam(true);
    }
  };

  // Trigger violation handler
  const triggerViolation = (tipe: 'PINDAH_TAB' | 'KELUAR_FULLSCREEN' | 'KLIK_KANAN' | 'SHORTCUT_DEVTOOLS' | 'COPY_PASTE', keterangan: string) => {
    if (isFinished || isLockedPermanently || !hasStartedExam || !tugas) return;

    const res = recordCbtViolation({
      studentId: student?.id || 'std-1',
      examId: tugas.id,
      name: student?.name || student?.nama || 'Siswa',
      nisn: student?.nisn || '-',
      class: student?.class || tugas.kelas || '-',
      tipe,
      keterangan
    });

    const nextCount = res.newViolationCount;
    setViolationCount(nextCount);

    if (res.shouldLockExam || nextCount >= 3) {
      setIsLockedPermanently(true);
      setWarningModal({
        isOpen: true,
        reason: 'AKSES UJIAN DIKUNCI (3x PELANGGARAN KECURANGAN)',
        message: 'Sistem Anti-Nyontek mendeteksi Anda telah melakukan 3 kali pelanggaran keamanan (berpindah tab / keluar layar penuh / klik kanan / shortcut). Layar ujian Anda saat ini dikunci. Silakan melapor ke Pengawas / Proktor ruang ujian untuk membuka kembali akses pengerjaan!',
        count: nextCount
      });
    } else {
      setWarningModal({
        isOpen: true,
        reason: tipe === 'PINDAH_TAB' ? 'PERINGATAN: TERDETEKSI BERPINDAH TAB / BROWSER LAIN' :
                tipe === 'KELUAR_FULLSCREEN' ? 'PERINGATAN: KELUAR DARI LAYAR PENUH' :
                tipe === 'KLIK_KANAN' ? 'PERINGATAN: KLIK KANAN DILARANG' :
                tipe === 'COPY_PASTE' ? 'PERINGATAN: MENYALIN / MENEMPEL TEKS DILARANG' :
                'PERINGATAN PELANGGARAN KEAMANAN UJIAN',
        message: `${keterangan}. Perhatian: Ini adalah PELANGGARAN KE-${nextCount} dari batas maksimal 3 kali. Jika mencapai 3 kali, ujian Anda akan otomatis dikunci dan diserahkan ke pengawas proktor!`,
        count: nextCount
      });
    }
  };

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(0);
      setUserAnswers({});
      setRaguMap({});
      setIsFinished(false);
      setResultData(null);
      setIsConfirmModalOpen(false);
      setIsMobileDrawerOpen(false);
      setZoomImg(null);
      setTimeLeft(30 * 60);
      setViolationCount(0);
      setWarningModal(null);
      setIsLockedPermanently(false);
      setHasStartedExam(false);
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Otomatis minta fullscreen jika didukung
      requestFullscreenMode();
    }
  }, [isOpen, tugas?.id]);

  // ANTI-CHEAT SECURITY LISTENERS
  useEffect(() => {
    if (!isOpen || isFinished || isLockedPermanently) return;

    // 1. Blokir klik kanan
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('KLIK_KANAN', 'Mencoba melakukan klik kanan pada lembar ujian');
    };

    // 2. Blokir copy, cut, paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('COPY_PASTE', 'Mencoba menyalin (copy) teks soal ujian');
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('COPY_PASTE', 'Mencoba memotong (cut) teks soal ujian');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('COPY_PASTE', 'Mencoba menempelkan (paste) teks ke lembar ujian');
    };

    // 3. Blokir seleksi teks
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // 4. Deteksi perpindahan tab browser
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('PINDAH_TAB', 'Terdeteksi berpindah ke tab browser lain atau meminimalkan layar');
      }
    };

    // 5. Deteksi window blur (buka aplikasi lain)
    const handleWindowBlur = () => {
      triggerViolation('PINDAH_TAB', 'Terdeteksi membuka aplikasi lain / jendela di luar ujian');
    };

    // 6. Deteksi perubahan layar penuh
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && hasStartedExam) {
        triggerViolation('KELUAR_FULLSCREEN', 'Terdeteksi keluar dari mode layar penuh ujian');
      }
    };

    // 7. Blokir shortcut keyboard berbahaya (F12, Ctrl+U, Ctrl+Shift+I, dll)
    const handleKeyDownSecurity = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) ||
        (e.ctrlKey && ['U', 'C', 'V', 'P', 'S', 'A'].includes(key)) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('SHORTCUT_DEVTOOLS', `Mencoba menekan kombinasi tombol shortcut terlarang (${e.key})`);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDownSecurity, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDownSecurity, true);
    };
  }, [isOpen, isFinished, isLockedPermanently, hasStartedExam]);

  // HEARTBEAT TO PROCTOR LIVE MONITORING
  useEffect(() => {
    if (!isOpen || isFinished || !tugas) return;

    const sendHeartbeat = () => {
      if (!tugas) return;
      recordCbtHeartbeat({
        studentId: student?.id || 'std-1',
        examId: tugas.id,
        name: student?.name || student?.nama || 'Siswa',
        nisn: student?.nisn || '-',
        class: student?.class || tugas.kelas || '-',
        totalSoal: totalQuestions,
        terjawab: Object.keys(userAnswers).length,
        sisaDetik: timeLeft,
        status: isLockedPermanently ? 'Peringatan' : violationCount > 0 ? 'Peringatan' : 'Mengerjakan'
      });

      // Periksa tindakan langsung dari proktor (force finish / extra time / unlock)
      const monitorList = db.get(CBT_MONITOR_KEY) || [];
      if (Array.isArray(monitorList)) {
        const mySession = monitorList.find((p: any) => 
          (p.studentId === student?.id || (student?.nisn && p.nisn === student?.nisn)) && 
          (!p.examId || p.examId === tugas.id)
        );
        if (mySession) {
          if (mySession.isUnlockedByProctor) {
            setIsLockedPermanently(false);
            setViolationCount(0);
            setWarningModal(null);
            mySession.isUnlockedByProctor = false;
            db.set(CBT_MONITOR_KEY, monitorList);
            Swal.fire({
              icon: 'success',
              title: 'Ujian Dibuka Kembali oleh Proktor!',
              text: 'Pengawas telah membuka kunci ujian Anda. Silakan lanjutkan pengerjaan butir soal dengan tertib dan jujur.',
              confirmButtonColor: '#0284c7'
            });
          }
          if (mySession.forceFinished && !isFinished) {
            handleSubmitQuiz(true);
          }
          if (mySession.extraTimeMinutes && mySession.extraTimeMinutes > 0) {
            setTimeLeft(prev => prev + mySession.extraTimeMinutes * 60);
            mySession.extraTimeMinutes = 0;
            db.set(CBT_MONITOR_KEY, monitorList);
          }
        }
      }
    };

    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 3500);
    return () => clearInterval(hbInterval);
  }, [isOpen, isFinished, student?.id, tugas?.id, totalQuestions, userAnswers, timeLeft, violationCount, isLockedPermanently]);

  // Listener event cbt-student-unlocked untuk membuka kunci instan
  useEffect(() => {
    const handleStudentUnlocked = (e: any) => {
      const sId = e?.detail?.studentId;
      if (sId === student?.id || (student?.nisn && sId === student?.nisn)) {
        setIsLockedPermanently(false);
        setViolationCount(0);
        setWarningModal(null);
        Swal.fire({
          icon: 'success',
          title: 'Kunci Ujian Dibuka Proktor!',
          text: 'Pengawas telah membuka kembali akses ujian Anda. Silakan lanjutkan pengerjaan soal dengan jujur dan tertib.',
          confirmButtonColor: '#0284c7'
        });
      }
    };
    window.addEventListener('cbt-student-unlocked', handleStudentUnlocked);
    return () => window.removeEventListener('cbt-student-unlocked', handleStudentUnlocked);
  }, [student?.id, student?.nisn]);

  const userAnswersRef = useRef(userAnswers);
  userAnswersRef.current = userAnswers;

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isFinished]);

  // Keyboard shortcut listener for options (A, B, C, D, E) and arrows
  useEffect(() => {
    if (!isOpen || isFinished || !currentQ) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (['a', 'b', 'c', 'd', 'e'].includes(key)) {
        if ((currentQ.opsi as any)[key]) {
          handleSelectAnswer(key);
        }
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        const optMap: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' };
        const mapped = optMap[key];
        if (mapped && (currentQ.opsi as any)[mapped]) {
          handleSelectAnswer(mapped);
        }
      } else if (e.key === 'ArrowRight' && currentIdx < totalQuestions - 1) {
        setCurrentIdx(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
        setCurrentIdx(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, currentQ, totalQuestions, userAnswers, currentIdx]);

  if (!isOpen || !tugas) return null;

  const handleToggleRagu = (qId: string | number) => {
    setRaguMap(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleSelectAnswer = (optionKey: string) => {
    if (isFinished || !tugas || !currentQ) return;
    const updatedAnswers = {
      ...userAnswers,
      [currentQ.id]: optionKey
    };
    setUserAnswers(updatedAnswers);

    // Auto-save realtime draft into `exam_drafts` & `cbt_draft_answers` for DRAFT_JAWABAN sheet
    try {
      const draftList = (db.get('exam_drafts') as any[]) || (db.get('cbt_draft_answers') as any[]) || [];
      const sId = student?.id || 'std-1';
      const sName = student?.name || student?.nama || 'Siswa';
      const sNisn = student?.nisn || '-';
      const draftEntry = {
        DraftID: `DFT-${tugas.id}-${sId}`,
        UjianID: tugas.id,
        SiswaID: sId,
        NISN: sNisn,
        Username: sName,
        JawabanJSON: JSON.stringify(updatedAnswers),
        SisaWaktu: `${Math.floor(timeLeft / 60)} Menit ${timeLeft % 60} Detik`,
        LastSync: new Date().toISOString(),
        Timestamp: new Date().toLocaleString('id-ID')
      };
      const filteredDrafts = draftList.filter((d: any) => !(d.UjianID === tugas.id && d.SiswaID === sId));
      const newDrafts = [draftEntry, ...filteredDrafts];
      db.set('exam_drafts', newDrafts);
      db.set('cbt_draft_answers', newDrafts);
    } catch (e) {
      console.error('Auto save draft error:', e);
    }
  };

  const handleSubmitQuiz = (forceSubmit: boolean = false) => {
    if (!tugas) return;

    // Strict Rule: Siswa ketika mengerjakan soal harus semua terisi jawaban tidak bisa langsung submit
    const currentAnswers = userAnswersRef.current;
    const missingQuestions = questions.filter(q => !currentAnswers[q.id] || String(currentAnswers[q.id]).trim() === '');
    if (!forceSubmit && missingQuestions.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Lembar Jawaban Belum Lengkap!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p>Sesuai tata tertib ujian CBT, <b>seluruh butir soal wajib terisi jawaban</b> dan tidak dapat langsung disubmit jika masih ada yang kosong.</p>
            <p class="text-rose-600 font-bold">Masih terdapat <b>${missingQuestions.length} butir soal</b> yang belum Anda jawab.</p>
            <p class="text-slate-500">Silakan lengkapi seluruh nomor soal sebelum mengumpulkan.</p>
          </div>
        `,
        confirmButtonColor: '#0284c7',
        confirmButtonText: 'Lengkapi Jawaban Sekarang'
      }).then(() => {
        const firstEmptyIdx = questions.findIndex(q => !currentAnswers[q.id]);
        if (firstEmptyIdx >= 0) setCurrentIdx(firstEmptyIdx);
      });
      return;
    }

    const sId = student?.id || (student as any)?.nisn || 'SISWA-USER';
    const sName = student?.name || student?.nama || 'Siswa';
    const sNisn = student?.nisn || '-';
    const sClass = student?.class || tugas.kelas || '-';

    // Calculate Score
    let correctCount = 0;
    let totalScore = 0;
    const totalMaxScore = questions.reduce((acc, q) => acc + (q.bobot || 10), 0);
    const answersMap = userAnswersRef.current;

    const questionResults = questions.map((q) => {
      const studentAns = (answersMap[q.id] || '').toLowerCase();
      const correctAns = (q.kunci || '').toLowerCase();
      const isCorrect = Boolean(studentAns && studentAns === correctAns);
      const points = isCorrect ? (q.bobot || 5) : 0;
      if (isCorrect) {
        correctCount += 1;
        totalScore += points;
      }
      return {
        nomorSoal: q.id,
        jawabanSiswa: studentAns || '-',
        kunciJawaban: correctAns,
        isCorrect: isCorrect ? 'BENAR' : 'SALAH',
        nilai: points
      };
    });

    const finalScaledScore = totalMaxScore > 0 
      ? Math.round((totalScore / totalMaxScore) * 100) 
      : Math.round((correctCount / totalQuestions) * 100);

    const wrongCount = totalQuestions - correctCount;

    setResultData({
      score: finalScaledScore,
      correctCount,
      wrongCount,
      total: totalQuestions
    });
    setIsFinished(true);

    const nowIso = new Date().toISOString();
    const nowDate = nowIso.slice(0, 10);

    // Deteksi tegas apakah sesi ini adalah UJIAN CBT atau PENUGASAN (TUGAS SISWA)
    const isActualCbtExam = Boolean(
      tugas.isCbtExam === true ||
      tugas.isExam === true ||
      tugas.type === 'CBT_EXAM' ||
      tugas.kategori === 'Penilaian Sumatif' ||
      tugas.kategori === 'SUMATIF' ||
      (tugas.id && (
        String(tugas.id).startsWith('UJ_') ||
        String(tugas.id).startsWith('JDW_') ||
        String(tugas.id).startsWith('SES_') ||
        String(tugas.id).startsWith('CBT_')
      ))
    );

    // Jika mode simulasi interaktif, jangan simpan hasil atau jawaban ke database / Google Sheets
    if (tugas.isSimulation) {
      return;
    }

    if (isActualCbtExam) {
      // =========================================================================
      // JALUR 1: UJIAN CBT RESMI (Disimpan di Hasil Ujian & Jawaban Ujian CBT)
      // =========================================================================
      // 1. Simpan jawaban butir soal ke `cbt_answers` & `jawaban_ujian` (Sheet JAWABAN)
      const existingAnswers = (db.get('cbt_answers') as any[]) || (db.get('jawaban_ujian') as any[]) || [];
      const filteredAnswers = existingAnswers.filter((a: any) => 
        !(String(a.UjianID || a.ujianId) === String(tugas.id) && String(a.SiswaID || a.siswaId || a.studentId) === String(sId))
      );

      const newAnswerRows = questionResults.map((qr) => ({
        JawabanID: `JAW-${tugas.id}-${sId}-${qr.nomorSoal}`,
        UjianID: tugas.id,
        SiswaID: sId,
        NISN: sNisn,
        NamaSiswa: sName,
        Kelas: sClass,
        BankSoalID: tugas.id,
        NomorSoal: qr.nomorSoal,
        JawabanSiswa: qr.jawabanSiswa,
        KunciJawaban: qr.kunciJawaban,
        IsCorrect: qr.isCorrect,
        Nilai: qr.nilai,
        Tanggal: nowDate,
        CreatedAt: nowIso
      }));

      const updatedAnswers = [...newAnswerRows, ...filteredAnswers];
      db.set('cbt_answers', updatedAnswers);
      db.set('jawaban_ujian', updatedAnswers);

      // 2. Simpan hasil ujian ke `cbt_exam_results` & `cbt_results` (Sheet HASIL_UJIAN)
      const existingCbtResults = (db.get('cbt_exam_results') as any[]) || [];
      const newCbtRes = {
        id: `RES-${Date.now()}`,
        HasilUjianID: `HSL-${tugas.id}-${sId}`,
        examId: tugas.id,
        UjianID: tugas.id,
        examName: tugas.judul,
        NamaUjian: tugas.judul,
        mapel: tugas.mapel,
        Mapel: tugas.mapel,
        studentId: sId,
        SiswaID: sId,
        studentName: sName,
        NamaSiswa: sName,
        nisn: sNisn,
        NISN: sNisn,
        kelas: sClass,
        Kelas: sClass,
        nilai: finalScaledScore,
        Nilai: finalScaledScore,
        nilaiAkhir: finalScaledScore,
        benar: correctCount,
        Benar: correctCount,
        salah: wrongCount,
        Salah: wrongCount,
        totalSoal: totalQuestions,
        TotalSoal: totalQuestions,
        status: finalScaledScore >= 75 ? 'Tuntas' : 'Remedial',
        StatusTuntas: finalScaledScore >= 75 ? 'Tuntas' : 'Remedial',
        waktuSelesai: nowIso,
        WaktuSelesai: nowIso,
        submittedAt: nowIso,
        createdAt: nowIso,
        CreatedAt: nowIso
      };
      const filteredCbtResults = existingCbtResults.filter((r: any) => 
        !(String(r.examId || r.UjianID) === String(tugas.id) && String(r.studentId || r.SiswaID) === String(sId))
      );
      db.set('cbt_exam_results', [newCbtRes, ...filteredCbtResults]);
      db.set('cbt_results', [newCbtRes, ...filteredCbtResults]);

      // Simpan juga ke tabel `hasil_ujian` untuk CBT.tsx & Rapor Sumatif
      const existingHasilUjian = (db.get('hasil_ujian') as any[]) || [];
      const newHasilUjian = {
        idHasil: `HSL_${Date.now()}`,
        idUjian: tugas.id,
        mapel: tugas.mapel,
        jenjang: tugas.jenjang || 'SMA',
        kelas: sClass,
        nisn: sNisn,
        namaSiswa: sName,
        nilai: finalScaledScore,
        nilaiAkhir: finalScaledScore,
        benar: correctCount,
        salah: wrongCount,
        totalSoal: totalQuestions,
        pelanggaran: 0,
        waktuMulai: nowIso,
        status: 'SELESAI',
        tanggal: nowDate,
        durasi: `${tugas.durasi || 60} Menit`,
        tahunAjaran: '2026/2027',
        semester: 'Ganjil',
        idAsesmen: tugas.id,
        jenisAsesmen: tugas.jenis || 'SUMATIF'
      };
      const filteredHasilUjian = existingHasilUjian.filter((h: any) => 
        !(String(h.idUjian || h.UjianID) === String(tugas.id) && String(h.nisn || h.NISN) === String(sNisn))
      );
      db.set('hasil_ujian', [newHasilUjian, ...filteredHasilUjian]);

      // Sinkronisasi otomatis langsung ke Google Spreadsheet (Sheet HASIL_UJIAN, NILAI, LOG_UJIAN, JAWABAN)
      const cbtJawabanDetail = questionResults.map((qr, idx) => ({
        nomorSoal: typeof qr.nomorSoal === 'number' ? qr.nomorSoal : (parseInt(String(qr.nomorSoal), 10) || idx + 1),
        jawabanSiswa: qr.jawabanSiswa,
        kunci: qr.kunciJawaban,
        isCorrect: Boolean(qr.isCorrect === 'BENAR' || qr.isCorrect === true || qr.nilai > 0),
        bobot: qr.nilai || 1
      }));

      submitCbtExamResult({
        idHasil: newHasilUjian.idHasil,
        idUjian: tugas.id,
        mapel: tugas.mapel,
        jenjang: tugas.jenjang || 'SMA',
        kelas: sClass,
        nisn: sNisn,
        namaSiswa: sName,
        nilaiMentah: finalScaledScore,
        nilaiAkhir: finalScaledScore,
        nilai: finalScaledScore,
        benar: correctCount,
        salah: wrongCount,
        totalSoal: totalQuestions,
        pelanggaran: 0,
        status: finalScaledScore >= 75 ? 'LULUS' : 'REMEDIAL',
        durasi: `${tugas.durasi || 60} Menit`,
        tahunAjaran: '2026/2027',
        semester: 'Ganjil',
        token: tugas.token || '-',
        guru: tugas.guru || 'Guru Pengampu',
        jawabanDetail: cbtJawabanDetail
      }).then(res => {
        if (res.success) {
          console.log('[KuisPilihanGanda] Berhasil sync hasil ujian ke Google Sheets:', res.idHasil);
        }
      }).catch(err => {
        console.warn('[KuisPilihanGanda] Sync hasil ujian ke Google Sheets error:', err);
      });

    } else {
      // =========================================================================
      // JALUR 2: PENUGASAN BELAJAR / TUGAS SISWA
      // (DILARANG DISIMPAN DI HASIL UJIAN PESERTA CBT!)
      // =========================================================================
      // 1. Simpan jawaban ke `jawaban_tugas` (khusus lembar tugas, bukan cbt_answers)
      const existingJawabanTugas = (db.get('jawaban_tugas') as any[]) || [];
      const filteredJawabanTugas = existingJawabanTugas.filter((a: any) => 
        !(String(a.tugasId || a.TugasID) === String(tugas.id) && String(a.studentId || a.SiswaID) === String(sId))
      );
      const newJawabanTugas = questionResults.map((qr) => ({
        JawabanID: `JAW-TGS-${tugas.id}-${sId}-${qr.nomorSoal}`,
        TugasID: tugas.id,
        tugasId: tugas.id,
        SiswaID: sId,
        studentId: sId,
        NISN: sNisn,
        NamaSiswa: sName,
        Kelas: sClass,
        NomorSoal: qr.nomorSoal,
        JawabanSiswa: qr.jawabanSiswa,
        KunciJawaban: qr.kunciJawaban,
        IsCorrect: qr.isCorrect,
        Nilai: qr.nilai,
        Tanggal: nowDate,
        CreatedAt: nowIso
      }));
      db.set('jawaban_tugas', [...newJawabanTugas, ...filteredJawabanTugas]);

      // 2. Simpan hasil penugasan ke `hasil_tugas_kbm` & `assignment_submissions` & `hasil_tugas`
      const existingSubmissions = (db.get('hasil_tugas_kbm') as any[]) || [];
      const existingHasilTugas = (db.get('hasil_tugas') as any[]) || [];

      const newSub = {
        id: `SUB-${tugas.id}-${sId}`,
        PengumpulanID: `PST-${tugas.id}-${sId}`,
        tugasId: tugas.id,
        TugasID: tugas.id,
        idTugas: tugas.id,
        studentId: sId,
        SiswaID: sId,
        idSiswa: sId,
        studentName: sName,
        NamaSiswa: sName,
        namaSiswa: sName,
        nisn: sNisn,
        NISN: sNisn,
        kelas: sClass,
        Kelas: sClass,
        status: 'Sudah Mengumpulkan',
        Status: 'Sudah Mengumpulkan',
        submittedAt: nowDate,
        waktuKumpul: nowIso,
        WaktuKumpul: nowIso,
        nilai: finalScaledScore,
        Nilai: finalScaledScore,
        nilaiAkhir: finalScaledScore,
        catatanGuru: `Pengerjaan Kuis PG Otomatis (Benar: ${correctCount}/${totalQuestions} - Skor: ${finalScaledScore})`,
        jawabanDetail: userAnswers
      };

      const filteredSubs = existingSubmissions.filter(s => 
        !(String(s.tugasId || s.TugasID) === String(tugas.id) && String(s.studentId || s.SiswaID) === String(sId))
      );
      const updatedSubs = [newSub, ...filteredSubs];
      db.set('hasil_tugas_kbm', updatedSubs);
      db.set('assignment_submissions', updatedSubs);
      db.set('tugas_submissions', updatedSubs);

      // Simpan juga ke `hasil_tugas` untuk modul Penugasan & Penilaian Formatif
      const newHasilTugasItem = {
        id: `HTG-${tugas.id}-${sId}`,
        tugasId: tugas.id,
        idTugas: tugas.id,
        siswaId: sId,
        idSiswa: sId,
        namaSiswa: sName,
        nisn: sNisn,
        kelas: sClass,
        mapel: tugas.mapel,
        nilai: finalScaledScore,
        nilaiAkhir: finalScaledScore,
        status: 'TERDINILAI',
        tanggalKumpul: nowDate,
        catatan: `Kuis PG Otomatis (Skor: ${finalScaledScore})`
      };
      const filteredHasilTugas = existingHasilTugas.filter((h: any) => 
        !(String(h.tugasId || h.idTugas) === String(tugas.id) && String(h.siswaId || h.idSiswa || h.nisn) === String(sId || sNisn))
      );
      db.set('hasil_tugas', [newHasilTugasItem, ...filteredHasilTugas]);

      // 3. Perbarui statistik agregat pada `tugas_kbm` & `assignments`
      const existingTugasList = (db.get('tugas_kbm') as any[]) || (db.get('assignments') as any[]) || [];
      const thisTugasSubs = updatedSubs.filter(s => 
        String(s.tugasId || s.TugasID) === String(tugas.id) && s.nilai !== null && s.nilai !== undefined
      );
      const avgScore = thisTugasSubs.length > 0 
        ? Math.round(thisTugasSubs.reduce((a, b) => a + Number(b.nilai || 0), 0) / thisTugasSubs.length)
        : finalScaledScore;

      const updatedTugasList = existingTugasList.map(t => {
        if (t.id === tugas.id || t.TugasID === tugas.id) {
          return {
            ...t,
            kumpul: thisTugasSubs.length,
            Kumpul: thisTugasSubs.length,
            avg: avgScore,
            NilaiRataRata: avgScore,
            status: 'Selesai Dinilai',
            Status: 'Selesai Dinilai'
          };
        }
        return t;
      });
      db.set('tugas_kbm', updatedTugasList);
      db.set('assignments', updatedTugasList);

      // PEMBERSIHAN MUTLAK: Pastikan tidak ada data penugasan ini yang tersimpan di `cbt_exam_results` atau `hasil_ujian`!
      const existingCbtResults = (db.get('cbt_exam_results') as any[]) || [];
      const cleanedCbtResults = existingCbtResults.filter((r: any) => 
        !(String(r.examId || r.UjianID) === String(tugas.id) || String(r.HasilUjianID || '').startsWith(`HSL-${tugas.id}`))
      );
      if (cleanedCbtResults.length !== existingCbtResults.length) {
        db.set('cbt_exam_results', cleanedCbtResults);
        db.set('cbt_results', cleanedCbtResults);
      }

      const existingHasilUjian = (db.get('hasil_ujian') as any[]) || [];
      const cleanedHasilUjian = existingHasilUjian.filter((h: any) => 
        !(String(h.idUjian || h.UjianID) === String(tugas.id) || String(h.idHasil || '').includes(String(tugas.id)))
      );
      if (cleanedHasilUjian.length !== existingHasilUjian.length) {
        db.set('hasil_ujian', cleanedHasilUjian);
      }
    }

    // Automatically sync into `nilai_akademik_map` & `academic_grades` (Buku Nilai & Rapor)
    try {
      const gradesMap = (db.get('nilai_akademik_map') as any) || {};
      const semester = 'Ganjil';
      const gradeKey = `${sId}_${semester}_${tugas.mapel}`;
      const prevGrade = gradesMap[gradeKey] || { tp1: 0, tp2: 0, tp3: 0, tp4: 0, sts: 0, sas: 0 };

      let tp1 = prevGrade.tp1 || 0;
      let tp2 = prevGrade.tp2 || 0;
      let tp3 = prevGrade.tp3 || 0;
      let tp4 = prevGrade.tp4 || 0;

      if (!tp1) tp1 = finalScaledScore;
      else if (!tp2) tp2 = finalScaledScore;
      else if (!tp3) tp3 = finalScaledScore;
      else tp4 = finalScaledScore;

      const sts = Number(prevGrade.sts || 0);
      const sas = Number(prevGrade.sas || 0);
      const avgFormatif = (tp1 + tp2 + tp3 + tp4) / 4;
      const finalScore = Math.round((avgFormatif + sts + 2 * sas) / 4);
      const ketercapaian = finalScore >= 75 ? 'Tuntas' : 'Perlu Bimbingan';

      gradesMap[gradeKey] = {
        ...prevGrade,
        studentId: sId,
        studentName: sName,
        nisn: sNisn,
        kelas: sClass,
        semester,
        mapel: tugas.mapel,
        tp1, tp2, tp3, tp4, sts, sas,
        nilaiAkhir: finalScore,
        ketercapaian,
        deskripsiTinggi: `Menunjukkan penguasaan sangat baik dalam capaian materi ${tugas.mapel}.`,
        deskripsiRendah: finalScore < 75 
          ? `Perlu pendampingan dan latihan mandiri lebih lanjut pada materi ${tugas.mapel}.` 
          : `Mencapai kompetensi dasar dengan baik pada materi ${tugas.mapel}.`
      };
      db.set('nilai_akademik_map', gradesMap);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'nilai_akademik_map' } }));
    } catch {
      // safe fallback
    }

    if (onQuizCompleted) {
      onQuizCompleted(finalScaledScore, correctCount, totalQuestions);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in">
      {/* FULLSCREEN CBT TOPBAR */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 text-white select-none">
        {/* Brand & Exam Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                SISTA CBT TAMBORA
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Kelas {tugas.kelas || 'Umum'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[220px] sm:max-w-md mt-0.5">
              {tugas.judul} ({tugas.mapel})
            </h3>
          </div>
        </div>

        {/* Center: Digital Countdown Timer */}
        {!isFinished && totalQuestions > 0 && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-black text-sm sm:text-base transition-all ${
              timeLeft < 300
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : timeLeft < 600
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <Clock size={16} className={timeLeft < 300 ? 'text-rose-400 animate-spin' : 'text-emerald-400'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        )}

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Font Size Adjuster */}
          {!isFinished && (
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-xl border border-slate-700/80 p-0.5">
              <button
                type="button"
                title="Ukuran Font Standar"
                onClick={() => setFontSize('normal')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  fontSize === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A-
              </button>
              <button
                type="button"
                title="Ukuran Font Sedang"
                onClick={() => setFontSize('large')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  fontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A
              </button>
              <button
                type="button"
                title="Ukuran Font Besar"
                onClick={() => setFontSize('xlarge')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  fontSize === 'xlarge' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A+
              </button>
            </div>
          )}

          {/* Mobile Drawer Trigger for Question Grid */}
          {!isFinished && totalQuestions > 0 && (
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(prev => !prev)}
              className="lg:hidden px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
            >
              <Grid size={15} />
              <span className="hidden sm:inline">Daftar Soal</span>
              <span className="bg-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {answeredCount} Terisi
              </span>
            </button>
          )}

          {/* Close / Exit Button */}
          <button
            type="button"
            onClick={() => {
              if (!isFinished && answeredCount > 0) {
                if (window.confirm('Ujian sedang berlangsung! Jawaban Anda telah tersimpan. Apakah Anda yakin ingin keluar sementara?')) {
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center transition cursor-pointer"
            title="Keluar dari Lembar Ujian"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* QUIZ CONTENT BODY */}
      {totalQuestions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900 text-white">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <FileQuestion size={32} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Belum Ada Butir Soal</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Paket ujian/kuis ini belum memiliki butir soal aktif dari guru pengampu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            Tutup Lembar Kuis
          </button>
        </div>
      ) : !hasStartedExam && !isFinished ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-950 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white animate-in zoom-in-95 duration-200">
            {/* Header Badge */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ShieldAlert size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                    Sistem Anti-Nyontek Aktif
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
                    Proctor Live
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Konfirmasi Memulai Ujian CBT Online
                </h3>
              </div>
            </div>

            {/* Exam & Student Info Card */}
            {(() => {
              const scheduleInfo = validateExamSchedule(tugas, false);
              return (
                <>
                  <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nama Peserta:</span>
                      <span className="font-black text-white">{student?.name || student?.nama || 'Siswa CBT'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">NISN / ID:</span>
                      <span className="font-black text-white">{student?.nisn || student?.id || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kelas:</span>
                      <span className="font-black text-white">{student?.class || tugas.kelas || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Mata Pelajaran:</span>
                      <span className="font-black text-indigo-300">{tugas.mapel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Jadwal Pelaksanaan:</span>
                      <span className="font-black text-amber-300">{scheduleInfo.scheduledTimeText}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Durasi Ujian:</span>
                      <span className="font-black text-emerald-400">{Math.floor(timeLeft / 60)} Menit</span>
                    </div>
                  </div>

                  {/* If exam is locked due to schedule not matching date/time */}
                  {!scheduleInfo.isOpen ? (
                    <div className="p-6 rounded-2xl bg-amber-950/50 border border-amber-500/50 space-y-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                        <Lock size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-amber-200">
                          Sesi Soal Ujian Belum Dibuka
                        </h4>
                        <p className="text-xs text-amber-300/90 max-w-md mx-auto leading-relaxed">
                          {scheduleInfo.detailedMessage}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-200">
                        <span>Status Waktu:</span>
                        <span className="font-black text-amber-400">{scheduleInfo.statusLabel} ({scheduleInfo.scheduledTimeText})</span>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Tutup & Kembali ke Portal Siswa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Strict Anti-Cheat Directives */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Lock size={14} className="text-rose-400" />
                          <span>Protokol Keamanan & Integritas Ujian:</span>
                        </h4>
                        <div className="space-y-2 text-xs text-slate-300">
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                            <span><strong>Layar Penuh Terkunci (Fullscreen Mode):</strong> Seluruh layar Anda akan ditutup oleh lembar soal ujian.</span>
                          </div>
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                            <span><strong>Dilarang Berpindah Tab & Split Screen:</strong> Menutup layar, beralih tab browser, atau membuka jendela lain terdeteksi otomatis.</span>
                          </div>
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                            <span><strong>Blokir Klik Kanan & DevTools:</strong> Klik kanan, copy-paste, tombol F12, dan inspect element dinonaktifkan demi keamanan.</span>
                          </div>
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200">
                            <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">!</span>
                            <span><strong>Toleransi Maksimal 3x Pelanggaran:</strong> Pelanggaran ke-3 akan menyebabkan lembar ujian <strong>terkunci permanen</strong> dan dilaporkan langsung ke pengawas proktor.</span>
                          </div>
                        </div>
                      </div>

                      {/* Input Token Ujian (Khusus CBT Ujian Online) */}
                      {(tugas.isCbtExam || tugas.isExam || tugas.type === 'CBT_EXAM') && (
                        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                              <Lock size={14} className="text-indigo-400" />
                              <span>Masukkan Token Ujian CBT:</span>
                            </label>
                            {tugas.token && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInputToken(tugas.token);
                                  setTokenError(null);
                                }}
                                className="text-[11px] font-bold text-indigo-300 hover:text-white underline cursor-pointer"
                              >
                                Isi Token Sesi ({tugas.token})
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={inputToken}
                              onChange={(e) => {
                                setInputToken(e.target.value.toUpperCase());
                                setTokenError(null);
                              }}
                              placeholder="Contoh: 1A-PKN-842"
                              className="flex-1 px-4 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-sm font-black font-mono tracking-widest text-indigo-200 uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {tugas.token && inputToken !== tugas.token && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInputToken(tugas.token);
                                  setTokenError(null);
                                }}
                                className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Pakai Token
                              </button>
                            )}
                          </div>
                          {tokenError && (
                            <p className="text-xs font-bold text-rose-400 flex items-center gap-1 mt-1 animate-in fade-in">
                              <AlertCircle size={14} />
                              <span>{tokenError}</span>
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400">
                            Token ujian diberikan oleh proktor atau pengawas bersamaan dengan jadwal sesi ujian Anda.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                        >
                          Batal / Kembali
                        </button>
                        <button
                          type="button"
                          onClick={handleStartExamWithToken}
                          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
                        >
                          <Play size={16} className="fill-white" />
                          <span>Mulai Mengerjakan Ujian Sekarang (Layar Penuh)</span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : !isFinished ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* PROCTOR LIVE BROADCAST BANNER */}
          {proctorBroadcast && (
            <div className="bg-amber-400 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-black animate-pulse shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-slate-900 shrink-0" />
                <span>PENGUMUMAN PROKTOR ({proctorBroadcast.timestamp}): {proctorBroadcast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setProctorBroadcast(null)}
                className="p-1 rounded-md hover:bg-amber-500 text-slate-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT/CENTER: ACTIVE QUESTION CANVAS */}
          <main className="flex-1 flex flex-col overflow-hidden">
            
            {/* Question Work Area Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
              
              {/* Question Card */}
              {!currentQ ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Memuat lembar soal ujian...</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  
                  {/* Header inside question card */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-black tracking-wide shadow-xs">
                        SOAL NO. {currentIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        Bobot: {currentQ.bobot || 5} Poin
                      </span>
                    </div>

                    {/* Status Ragu-Ragu Indicator */}
                    {raguMap[currentQ.id] && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 text-xs font-bold">
                        <Flag size={14} className="fill-amber-500 text-amber-500" />
                        <span>Ragu-Ragu</span>
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <div className={`text-slate-900 dark:text-slate-100 font-medium leading-relaxed ${
                    fontSize === 'normal'
                      ? 'text-sm sm:text-base'
                      : fontSize === 'xlarge'
                      ? 'text-lg sm:text-xl'
                      : 'text-base sm:text-lg'
                  }`}>
                    {currentQ.pertanyaan}
                  </div>

                  {/* Question Image / Diagram (Hanya muncul jika butir soal memiliki gambar) */}
                  {isValidDiagram(currentQ.gambar) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-indigo-500" />
                          <span>Gambar / Diagram Soal Nomor {currentIdx + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomImg(currentQ.gambar || null)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition text-[11px] cursor-pointer"
                        >
                          <ZoomIn size={12} />
                          <span>Perbesar Gambar</span>
                        </button>
                      </div>
                      <div 
                        className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-h-80 flex items-center justify-center cursor-pointer group"
                        onClick={() => setZoomImg(currentQ.gambar || null)}
                      >
                        <img
                          src={currentQ.gambar}
                          alt={`Ilustrasi Soal Nomor ${currentIdx + 1}`}
                          className="max-h-72 w-auto max-w-full object-contain mx-auto rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                      <span>Pilihan Jawaban:</span>
                      <span className="text-[11px] font-normal normal-case hidden sm:inline text-slate-400">
                        Tekan huruf <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">A</kbd> - <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">E</kbd> pada keyboard
                      </span>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(currentQ.opsi).map(([key, val]) => {
                        if (!val) return null;
                        const isSelected = (userAnswers[currentQ.id] || '').toLowerCase() === key.toLowerCase();
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectAnswer(key)}
                            className={`w-full p-4 sm:p-4.5 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center uppercase shrink-0 transition-transform group-active:scale-95 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600'
                            }`}>
                              {key}
                            </span>
                            
                            <span className={`flex-1 leading-relaxed ${
                              fontSize === 'normal'
                                ? 'text-xs sm:text-sm'
                                : fontSize === 'xlarge'
                                ? 'text-base sm:text-lg'
                                : 'text-sm sm:text-base'
                            } ${isSelected ? 'font-bold' : ''}`}>
                              {val}
                            </span>

                            {isSelected && (
                              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={16} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attachment PDF Link if available */}
                  {fallbackPdfImages.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPdfViewerOpen(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 hover:underline cursor-pointer"
                      >
                        <BookOpen size={14} />
                        <span>Buka Lampiran Materi PDF ({fallbackPdfImages.length} Halaman)</span>
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Bottom Floating Navigation Strip */}
            <footer className="h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 gap-2">
              {/* Previous button */}
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-2xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Soal Sebelumnya</span>
                <span className="sm:hidden">Sebelumnya</span>
              </button>

              {/* Ragu-Ragu Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleRagu(currentQ.id)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center gap-2 cursor-pointer shadow-xs ${
                  raguMap[currentQ.id]
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500 font-black'
                    : 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                }`}
              >
                <Flag size={16} className={raguMap[currentQ.id] ? 'fill-slate-950 text-slate-950' : 'text-amber-600'} />
                <span>{raguMap[currentQ.id] ? 'Hapus Ragu-Ragu' : 'Ragu-Ragu'}</span>
              </button>

              {/* Next / Submit Button */}
              {currentIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 sm:px-7 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span className="hidden sm:inline">Soal Selanjutnya</span>
                  <span className="sm:hidden">Berikutnya</span>
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (unansweredCount > 0) {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Jawaban Belum Lengkap!',
                        html: `
                          <div class="text-left text-xs space-y-2">
                            <p>Sesuai tata tertib ujian CBT, <b>seluruh soal wajib terisi jawaban</b> sebelum dapat dikumpulkan.</p>
                            <p class="text-rose-600 font-bold">Masih terdapat <b>${unansweredCount} butir soal</b> yang belum Anda jawab.</p>
                            <p class="text-slate-500">Silakan lengkapi seluruh jawaban nomor soal terlebih dahulu.</p>
                          </div>
                        `,
                        confirmButtonColor: '#0284c7',
                        confirmButtonText: 'Lengkapi Jawaban Sekarang'
                      }).then(() => {
                        const firstEmpty = questions.findIndex(q => !userAnswersRef.current[q.id]);
                        if (firstEmpty >= 0) setCurrentIdx(firstEmpty);
                      });
                      return;
                    }
                    setIsConfirmModalOpen(true);
                  }}
                  className={`px-5 sm:px-7 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-black rounded-2xl transition flex items-center gap-2 shadow-md cursor-pointer ${
                    unansweredCount > 0
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 active:scale-95'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <Send size={16} />
                  <span>{unansweredCount > 0 ? `Lengkapi (${answeredCount}/${totalQuestions})` : 'Selesaikan Ujian'}</span>
                </button>
              )}
            </footer>

          </main>

          {/* RIGHT: QUESTION MATRIX PALETTE (DESKTOP) */}
          <aside className="hidden lg:flex w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  <Grid size={16} className="text-indigo-600" />
                  <span>Daftar Nomor Soal</span>
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  {answeredCount} Terjawab
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.round((answeredCount / Math.max(1, totalQuestions)) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Progres Terjawab</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {Math.round((answeredCount / Math.max(1, totalQuestions)) * 100)}%
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shrink-0" />
                  <span>Dijawab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block shrink-0" />
                  <span>Ragu-Ragu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 inline-block shrink-0" />
                  <span>Belum Terisi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border-2 border-indigo-600 inline-block shrink-0" />
                  <span>Aktif</span>
                </div>
              </div>
            </div>

            {/* Matrix 5 columns */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isRagu = !!raguMap[q.id];
                  const isCurrent = currentIdx === idx;
                  const selectedKey = userAnswers[q.id]?.toUpperCase();

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900 z-10'
                          : ''
                      } ${
                        isRagu
                          ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                          : isAnswered
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-[11px]">{idx + 1}</span>
                      {selectedKey && (
                        <span className="text-[9px] opacity-90 font-mono">
                          {selectedKey}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar bottom action */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={15} />
                <span>Kumpulkan Jawaban Ujian</span>
              </button>
            </div>
          </aside>

        </div>
      </div>
      ) : (
          /* RESULT & REVIEW SCREEN */
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            
            {/* Score Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center mx-auto shadow-md">
                <Award size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-3 py-0.5 rounded-full">
                  Nilai Otomatis Terekap
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Hasil Penugasan Pilihan Ganda
                </h3>
                <p className="text-xs text-indigo-200">
                  Data nilai telah disimpan langsung ke Rekap Tugas Kelas & Rapor Siswa.
                </p>
              </div>

              {/* Big Score Box */}
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl max-w-xs mx-auto border border-white/20">
                <span className="text-[11px] text-indigo-200 font-bold uppercase tracking-wider block">Skor Akhir Siswa</span>
                <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono">
                  {resultData?.score}
                </span>
                <span className="text-xs text-indigo-200 block mt-1">dari skala 100 Poin</span>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2 text-xs">
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                  <span className="block text-[10px] text-emerald-300 font-bold">Hasil Benar</span>
                  <span className="font-black text-white text-base">{resultData?.correctCount}</span>
                </div>
                <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-400/30">
                  <span className="block text-[10px] text-rose-300 font-bold">Hasil Salah</span>
                  <span className="font-black text-white text-base">{resultData?.wrongCount}</span>
                </div>
              </div>
            </div>

            {/* Review & Pembahasan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-600" />
                  <span>Kunci Jawaban & Pembahasan Lengkap</span>
                </h4>
              </div>

              <div className="space-y-4">
                {questions.map((soal, idx) => {
                  const studentAns = (userAnswers[soal.id] || '').toLowerCase();
                  const correctAns = (soal.kunci || '').toLowerCase();
                  const isCorrect = studentAns === correctAns;

                  return (
                    <div
                      key={soal.id}
                      className={`p-4 rounded-2xl border ${
                        isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                      } space-y-3`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-relaxed">
                              {soal.pertanyaan}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? 'Benar (+10)' : 'Salah'}
                        </span>
                      </div>

                      {/* Detail Jawaban */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pl-8">
                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">Jawaban Anda:</span>
                          <span className="font-bold uppercase text-slate-800">
                            {studentAns ? `${studentAns.toUpperCase()}. ${(soal.opsi as any)[studentAns] || ''}` : '(Tidak Dijawab)'}
                          </span>
                        </div>
                        <div className="p-2 bg-emerald-100/60 rounded-xl border border-emerald-300">
                          <span className="text-[10px] text-emerald-800 font-bold block">Kunci Jawaban Benar:</span>
                          <span className="font-black uppercase text-emerald-950">
                            {correctAns.toUpperCase()}. {(soal.opsi as any)[correctAns] || ''}
                          </span>
                        </div>
                      </div>

                      {/* Pembahasan */}
                      {soal.pembahasan && (
                        <div className="ml-8 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-black text-indigo-950 block">💡 Pembahasan:</span>
                          <p className="leading-relaxed mt-0.5">{soal.pembahasan}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Kembali ke Portal Siswa
              </button>
            </div>

          </div>
        )}

      {/* CONFIRMATION SUBMIT MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                <Send size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Konfirmasi Selesaikan Ujian
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Periksa rekap jawaban Anda sebelum mengumpulkan
                </p>
              </div>
            </div>

            {/* Quick Summary Badges */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Terjawab</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {answeredCount}
                </span>
                <span className="text-[10px] text-slate-400 block">soal</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Ragu-Ragu</span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                  {raguCount}
                </span>
                <span className="text-[10px] text-slate-400 block">soal</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Belum</span>
                <span className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">
                  {unansweredCount}
                </span>
                <span className="text-[10px] text-slate-400 block">soal</span>
              </div>
            </div>

            {/* Warning if any unanswered or ragu-ragu */}
            {unansweredCount > 0 ? (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block text-rose-700 dark:text-rose-300">Tidak Dapat Mengumpulkan Ujian:</span>
                  Terdapat <span className="font-black text-rose-800 dark:text-rose-100">{unansweredCount} butir soal</span> yang belum Anda jawab. Semua soal wajib terisi lengkap sebelum ujian dapat disubmit.
                </div>
              </div>
            ) : raguCount > 0 ? (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Peringatan:</span>
                  Masih terdapat <span className="font-black">{raguCount}</span> soal bertanda ragu-ragu.
                </div>
              </div>
            ) : null}

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-center">
              {unansweredCount > 0 
                ? 'Silakan klik "Lengkapi Soal Kosong" untuk langsung mengisi butir soal yang belum terjawab.'
                : 'Apakah Anda yakin ingin menyelesaikan dan mengumpulkan lembar ujian ini sekarang? Setelah dikumpulkan, jawaban tidak dapat diubah kembali.'
              }
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  if (unansweredCount > 0) {
                    const firstEmpty = questions.findIndex(q => !userAnswersRef.current[q.id]);
                    if (firstEmpty >= 0) setCurrentIdx(firstEmpty);
                  }
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                {unansweredCount > 0 ? 'Lengkapi Soal Kosong' : 'Periksa Kembali'}
              </button>

              {unansweredCount > 0 ? (
                <button
                  type="button"
                  disabled
                  className="py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-black cursor-not-allowed flex items-center justify-center gap-1.5 opacity-80"
                  title="Seluruh soal harus terisi jawaban sebelum submit"
                >
                  <Lock size={15} />
                  <span>Wajib Terisi Semua</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    handleSubmitQuiz();
                  }}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check size={16} />
                  <span>Ya, Kumpulkan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX IMAGE ZOOM MODAL */}
      {zoomImg && (
        <div 
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl overflow-hidden border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomImg(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
            <img 
              src={zoomImg} 
              alt="Perbesaran Diagram Soal" 
              className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* MOBILE DRAWER FOR QUESTION PALETTE */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[65] bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Grid size={16} className="text-indigo-600" />
                <span>Daftar Nomor Soal</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold">
                {answeredCount} Dijawab
              </div>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 font-bold">
                {raguCount} Ragu
              </div>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold">
                Belum Terisi
              </div>
            </div>

            {/* 5-Column Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isRagu = !!raguMap[q.id];
                  const isCurrent = currentIdx === idx;
                  const selectedKey = userAnswers[q.id]?.toUpperCase();

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIdx(idx);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center relative ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 ring-offset-2'
                          : ''
                      } ${
                        isRagu
                          ? 'bg-amber-400 text-slate-950 font-extrabold'
                          : isAnswered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-[11px]">{idx + 1}</span>
                      {selectedKey && (
                        <span className="text-[9px] opacity-90 font-mono">
                          {selectedKey}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                setIsConfirmModalOpen(true);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Send size={15} />
              <span>Kumpulkan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* PDF ATTACHMENT / MATERI DOCUMENT VIEWER MODAL */}
      {pdfViewerOpen && (
        <div className="fixed inset-0 z-[75] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Lampiran Materi Dokumen PDF</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gunakan materi di bawah ini sebagai referensi stimulus dan pemecahan soal ujian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfViewerOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100 dark:bg-slate-950">
              {fallbackPdfImages.map((page, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span>Halaman {page.pageNumber}</span>
                    <button
                      type="button"
                      onClick={() => setZoomImg(page.dataUrl)}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-bold"
                    >
                      <Maximize2 size={13} />
                      <span>Perbesar Halaman Ini</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                    <img 
                      src={page.dataUrl} 
                      alt={`Halaman Dokumen PDF ${page.pageNumber}`} 
                      className="max-h-[70vh] w-auto object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
              <button
                type="button"
                onClick={() => setPdfViewerOpen(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
              >
                Tutup Dokumen & Kembali Mengerjakan Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Zooming Question Illustration */}
      {zoomImg && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomImg(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setZoomImg(null)}
              className="absolute -top-12 right-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <X size={16} />
              <span>Tutup Gambar</span>
            </button>
            <img
              src={zoomImg}
              alt="Perbesaran Gambar Soal"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/20"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
}
