import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Award, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  Layers, 
  Eye, 
  X, 
  Pause, 
  PlusCircle, 
  ChevronRight,
  ShieldAlert,
  Info,
  UserCheck,
  User,
  Users,
  Search,
  KeyRound,
  GraduationCap,
  LogOut,
  ExternalLink,
  Edit3
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { 
  DAFTAR_SIMULASI_PELAJARAN, 
  type SimulasiExamPackage 
} from '../../data/simulasiUjianData';
import { JENIS_UJIAN_LIST, getJenisUjianBadge } from '../../utils/cbtExamTypes';
import { generatePedagogicalQuestions } from '../../utils/cbtGoogleSheetService';

export interface SimulasiStudentProfile {
  id: string;
  name: string;
  nisn: string;
  nis?: string;
  noPeserta: string;
  class: string;
  gender?: 'L' | 'P';
  ruangUjian?: string;
  sesiUjian?: string;
  avatar?: string;
  isDemo?: boolean;
}

export const DEFAULT_PRESET_STUDENTS: SimulasiStudentProfile[] = [];

interface SimulasiUjianTabProps {
  onBackToDashboard?: () => void;
  initialPackage?: any;
  initialSession?: any;
  initialToken?: string;
  onClose?: () => void;
}

export default function SimulasiUjianTab({ 
  onBackToDashboard, 
  initialPackage, 
  initialSession,
  initialToken,
  onClose 
}: SimulasiUjianTabProps) {
  const { students } = useStore();

  // Mode: 'catalog' | 'confirm_entry' | 'exam' | 'result'
  const [viewMode, setViewMode] = useState<'catalog' | 'confirm_entry' | 'exam' | 'result'>('catalog');
  
  // Selected Exam Package
  const [selectedPackage, setSelectedPackage] = useState<SimulasiExamPackage | null>(null);

  // Catalog tab: 'sesi_ujian' | 'bank_soal'
  const [catalogSource, setCatalogSource] = useState<'sesi_ujian' | 'bank_soal'>('sesi_ujian');

  // Active Simulated Student Profile (Real Student from School Database)
  const [activeStudent, setActiveStudent] = useState<SimulasiStudentProfile>(() => {
    const validStudents = (students || []).filter((s: any) => s && (s.name || s.nama));
    const firstStudent = validStudents[0];
    if (firstStudent) {
      const cls = firstStudent.class || firstStudent.kelas || 'Kelas 4';
      return {
        id: firstStudent.id || 'SISWA-001',
        name: firstStudent.name || firstStudent.nama || 'Siswa Sekolah',
        nisn: firstStudent.nisn || '-',
        nis: firstStudent.nis || firstStudent.nopdkt || '-',
        noPeserta: `CBT-${String(cls).replace(/\s+/g, '')}-${String(firstStudent.nisn || '0001').slice(-4)}`,
        class: cls,
        gender: (firstStudent.gender === 'P' ? 'P' : 'L'),
        ruangUjian: 'Lab Komputer CBT',
        sesiUjian: 'Sesi Ujian CBT',
        isDemo: false
      };
    }
    return {
      id: 'SISWA-CBT',
      name: 'Peserta Ujian Sekolah',
      nisn: '1234567890',
      nis: '2026001',
      noPeserta: 'CBT-PESERTA-01',
      class: 'Kelas 4',
      gender: 'L',
      ruangUjian: 'Lab Komputer CBT',
      sesiUjian: 'Sesi 1',
      isDemo: false
    };
  });

  // Modal Switcher State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');
  const [isCustomStudentOpen, setIsCustomStudentOpen] = useState(false);
  const [customStudentForm, setCustomStudentForm] = useState({
    name: '',
    nisn: '',
    class: 'Kelas 4'
  });

  // Token Input for Confirm Entry Screen
  const [inputToken, setInputToken] = useState<string>('');

  // Filter Catalog State
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [activeSourceTab, setActiveSourceTab] = useState<'bank_soal'>('bank_soal');

  // Exam Run State (PURELY IN-MEMORY SANDBOX)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [raguMap, setRaguMap] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [cbtFontSize, setCbtFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);

  // Bank Soal Packages directly from Database (Spreadsheet Sheet BANK_SOAL & SOAL)
  const schoolBankSoalPackages = useMemo(() => {
    const raw = db.get('cbt_bank_soal') || db.get('bank_soal') || db.get('BANK_SOAL') || [];
    const list = Array.isArray(raw) ? raw : [];
    
    const parsedList = list
      .filter((b: any) => b && !String(b.id || b.BankSoalID || '').startsWith('SIM-') && !b.isSimulation)
      .map((b: any) => {
        let soalList = Array.isArray(b.soalList) ? b.soalList : [];
        if (soalList.length === 0 && typeof b.SoalJSON === 'string' && b.SoalJSON.length > 5) {
          try {
            soalList = JSON.parse(b.SoalJSON);
          } catch {
            soalList = [];
          }
        }
        const bMapel = b.mapel || b.Mapel || 'Mata Pelajaran';
        const bKelas = b.kelas || b.Kelas || '4';
        if (soalList.length === 0) {
          soalList = generatePedagogicalQuestions(bMapel, bKelas, 20);
        }

        const bId = String(b.id || b.BankSoalID || `BNK-${Date.now()}`);
        return {
          id: bId,
          BankSoalID: bId,
          judul: b.judul || b.NamaUjian || `Bank Soal: ${bMapel} (${bKelas})`,
          mapel: bMapel,
          Mapel: bMapel,
          kelas: bKelas,
          Kelas: bKelas,
          jenisUjian: b.jenisUjian || b.JenisAsesmen || b.jenisAsesmen || 'Sumatif',
          durasi: Number(b.durasi || b.Durasi || b.durasiMenit || 30),
          token: b.token || b.Token || 'KTCT26',
          deskripsi: b.deskripsi || b.Deskripsi || `Paket soal resmi kurikulum dari Sheet BANK_SOAL (${soalList.length} butir soal).`,
          isSimulation: false,
          isCbtExam: true,
          soalList
        };
      })
      .filter((b: any) => b.soalList && b.soalList.length > 0);

    // If database packages are empty or fewer than 2, provide standard Kurikulum Merdeka packages
    if (parsedList.length < 2) {
      const defaultSubjects = [
        { id: 'BNK-IPAS-4', mapel: 'IPAS (Ilmu Pengetahuan Alam & Sosial)', kelas: '4', jenisUjian: 'Sumatif Tengah Semester', durasi: 30, deskripsi: 'Paket Asesmen Sumatif Kurikulum Merdeka IPAS Bab Ekosistem & Tumbuhan.' },
        { id: 'BNK-BINDO-4', mapel: 'Bahasa Indonesia', kelas: '4', jenisUjian: 'Sumatif Akhir Semester', durasi: 35, deskripsi: 'Paket Pemahaman Literasi Narasi, Ide Pokok, Kosakata, dan Kalimat Efektif.' },
        { id: 'BNK-MTK-4', mapel: 'Matematika', kelas: '4', jenisUjian: 'Sumatif Harian', durasi: 40, deskripsi: 'Paket Numerasi Pecahan, Desimal, Geometri Bangun Datar, dan Pola Bilangan.' },
        { id: 'BNK-PPKN-4', mapel: 'Pendidikan Pancasila (PPKn)', kelas: '4', jenisUjian: 'Sumatif Harian', durasi: 30, deskripsi: 'Paket Nilai Pancasila, Gotong Royong, Keberagaman, dan Kewajiban Siswa.' },
        { id: 'BNK-BING-4', mapel: 'Bahasa Inggris', kelas: '4', jenisUjian: 'Sumatif Akhir Semester', durasi: 30, deskripsi: 'Paket Daily Activities, School Vocabulary, Simple Present, and Dialogue.' },
        { id: 'BNK-ANBK-4', mapel: 'Tryout ANBK (Literasi-Numerasi)', kelas: '4', jenisUjian: 'Tryout ANBK', durasi: 45, deskripsi: 'Simulasi Resmi Asesmen Nasional Berbasis Komputer (ANBK) Kemendikbudristek.' }
      ];

      defaultSubjects.forEach(s => {
        if (!parsedList.some(p => p.mapel.toLowerCase().includes(s.mapel.slice(0, 4).toLowerCase()))) {
          parsedList.push({
            id: s.id,
            BankSoalID: s.id,
            judul: `Bank Soal: ${s.mapel} (${s.kelas})`,
            mapel: s.mapel,
            Mapel: s.mapel,
            kelas: s.kelas,
            Kelas: s.kelas,
            jenisUjian: s.jenisUjian,
            durasi: s.durasi,
            token: 'KTCT26',
            deskripsi: s.deskripsi,
            isSimulation: false,
            isCbtExam: true,
            soalList: generatePedagogicalQuestions(s.mapel, s.kelas, 20)
          });
        }
      });
    }

    return parsedList;
  }, []);

  // Update active student when database students load
  useEffect(() => {
    if (students && students.length > 0 && (!activeStudent.id || activeStudent.id === 'SISWA-CBT')) {
      const s = students[0];
      const cls = s.class || s.kelas || 'Kelas 4';
      setActiveStudent({
        id: s.id || 'SISWA-001',
        name: s.name || s.nama || 'Siswa Sekolah',
        nisn: s.nisn || '-',
        nis: s.nis || s.nopdkt || '-',
        noPeserta: `CBT-${String(cls).replace(/\s+/g, '')}-${String(s.nisn || '0001').slice(-4)}`,
        class: cls,
        gender: (s.gender === 'P' ? 'P' : 'L'),
        ruangUjian: 'Lab Komputer CBT',
        sesiUjian: 'Sesi Ujian CBT',
        isDemo: false
      });
    }
  }, [students]);

  // Filtered Students from School Database for Switcher
  const filteredDatabaseStudents = useMemo(() => {
    const list = students || [];
    if (!studentSearchKeyword.trim()) return list.slice(0, 15);
    const q = studentSearchKeyword.toLowerCase();
    return list.filter((s: any) => 
      (s.name || s.nama || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.class || s.kelas || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [students, studentSearchKeyword]);

  // Timer Effect
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (viewMode === 'exam' && !isTimerPaused && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitOnTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, isTimerPaused, timeLeft]);

  // Keyboard shortcut for answers (A, B, C, D, E) and navigation
  useEffect(() => {
    if (viewMode !== 'exam') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        if (selectedPackage && selectedPackage.soalList[activeQuestionIdx]) {
          const qId = selectedPackage.soalList[activeQuestionIdx].id;
          handleSelectAnswer(qId, key);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedPackage && activeQuestionIdx < selectedPackage.soalList.length - 1) {
          setActiveQuestionIdx(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeQuestionIdx > 0) {
          setActiveQuestionIdx(prev => prev - 1);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedPackage && selectedPackage.soalList[activeQuestionIdx]) {
          const qId = selectedPackage.soalList[activeQuestionIdx].id;
          handleToggleRagu(qId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeQuestionIdx, selectedPackage]);

  // Helper formatting mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Step 1: Open Confirmation Screen (Pilih Paket -> Konfirmasi Data Siswa & Token)
  const handleOpenConfirmEntry = (pkg: SimulasiExamPackage) => {
    setSelectedPackage(pkg);
    setInputToken(pkg.token || 'SIMULASI');
    setViewMode('confirm_entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: Start Actual Exam as this Student Profile
  const handleStartExamRun = () => {
    if (!selectedPackage) return;
    
    // Check Token
    const expectedToken = (selectedPackage.token || 'SIMULASI').trim().toUpperCase();
    const providedToken = inputToken.trim().toUpperCase();

    if (providedToken !== expectedToken && providedToken !== 'SIMULASI') {
      Swal.fire({
        title: 'Token Tidak Cocok!',
        html: `
          <div class="text-left text-xs text-slate-600 space-y-1">
            <p>Token ujian yang Anda masukkan tidak valid.</p>
            <p class="font-bold text-cyan-800">Token Resmi Sesi: ${expectedToken}</p>
          </div>
        `,
        icon: 'error',
        confirmButtonColor: '#0891b2',
        confirmButtonText: 'Perbaiki Token'
      });
      return;
    }

    setActiveQuestionIdx(0);
    setUserAnswers({});
    setRaguMap({});
    setTimeLeft(selectedPackage.durasi * 60);
    setIsTimerPaused(false);
    setStartTime(Date.now());
    setViewMode('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Swal.fire({
      title: 'Selamat Mengerjakan Ujian!',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600">
          <div class="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
            <p class="font-bold text-cyan-900 text-sm">Peserta: ${activeStudent.name}</p>
            <p class="text-[11px] text-cyan-700">NISN: ${activeStudent.nisn} • ${activeStudent.class} • ${activeStudent.ruangUjian}</p>
          </div>
          <p>• <b>Paket Ujian:</b> ${selectedPackage.judul}</p>
          <p>• <b>Durasi:</b> ${selectedPackage.durasi} Menit (${selectedPackage.soalList.length} Butir Soal)</p>
          <div class="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
            ⚡ <b>Mode Simulasi Akun Siswa (Sandbox):</b> Anda melihat dan mengerjakan soal dari sudut pandang siswa. Hasil ujian ini <b>tidak akan disimpan ke Google Sheets</b> dan bisa dibuang kapan saja.
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'Mulai Menjawab',
      confirmButtonColor: '#0891b2'
    });
  };

  // Convert School Bank Soal Package to SimulasiExamPackage
  const handleStartFromBankSoal = (bank: any) => {
    const rawList = Array.isArray(bank.soalList) ? bank.soalList : [];
    const formattedSoal = rawList.map((s: any, idx: number) => ({
      id: idx + 1,
      pertanyaan: s.pertanyaan || s.soal || `Soal nomor ${idx + 1}`,
      tipe: 'Pilihan Ganda' as const,
      opsi: {
        a: s.a || s.opsi?.a || 'Pilihan A',
        b: s.b || s.opsi?.b || 'Pilihan B',
        c: s.c || s.opsi?.c || 'Pilihan C',
        d: s.d || s.opsi?.d || 'Pilihan D',
        ...(s.e || s.opsi?.e ? { e: s.e || s.opsi?.e } : {})
      },
      kunci: String(s.kunci || s.kunciJawaban || 'a').toLowerCase(),
      bobot: Number(s.bobot) || 5,
      pembahasan: s.pembahasan || 'Pembahasan rasional untuk butir soal ini.'
    }));

    const pkg: SimulasiExamPackage = {
      id: `SIM-${bank.id || 'BNK'}`,
      judul: `[Uji Coba Sandbox] ${bank.mapel || 'Mata Pelajaran'} - ${bank.topik || 'Paket Soal'}`,
      mapel: bank.mapel || 'Umum',
      kelas: bank.kelas || activeStudent.class || 'Semua Kelas',
      jenisUjian: bank.jenisUjian || bank.jenisAsesmen || 'Sumatif Harian',
      durasi: Number(bank.durasi) || 30,
      token: 'SIMULASI',
      deskripsi: `Pengujian mandiri paket bank soal "${bank.id}" dalam mode simulasi akun siswa tanpa mempengaruhi database asli.`,
      isSimulation: true,
      isCbtExam: true,
      soalList: formattedSoal
    };

    handleOpenConfirmEntry(pkg);
  };

  // Auto-start if initialPackage is passed as prop
  useEffect(() => {
    if (initialPackage) {
      if (initialPackage.isSimulation) {
        handleOpenConfirmEntry(initialPackage);
      } else {
        handleStartFromBankSoal(initialPackage);
      }
    }
  }, [initialPackage]);

  const handleSelectAnswer = (qId: number, optionKey: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionKey.toLowerCase()
    }));
  };

  const handleToggleRagu = (qId: number) => {
    setRaguMap(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleAutoSubmitOnTimeOut = () => {
    Swal.fire({
      title: 'Waktu Ujian Siswa Habis!',
      text: 'Jawaban simulasi Anda otomatis dikumpulkan untuk dievaluasi.',
      icon: 'warning',
      confirmButtonColor: '#0891b2'
    }).then(() => {
      calculateAndShowResult();
    });
  };

  const handleConfirmSubmit = () => {
    const totalQ = selectedPackage?.soalList?.length || 0;
    const ansCount = Object.keys(userAnswers).length;
    if (ansCount < totalQ) {
      Swal.fire({
        icon: 'warning',
        title: 'Semua Soal Wajib Terisi!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p>Sesuai aturan ujian sekolah, <b>seluruh butir soal wajib terisi jawaban</b> dan tidak dapat langsung disubmit jika masih ada yang kosong.</p>
            <p class="text-rose-600 font-bold">Masih terdapat <b>${totalQ - ansCount} soal</b> yang belum Anda jawab.</p>
            <p class="text-slate-500">Silakan lengkapi seluruh jawaban sebelum mengumpulkan.</p>
          </div>
        `,
        confirmButtonColor: '#0891b2',
        confirmButtonText: 'Lengkapi Jawaban'
      });
      setShowConfirmSubmit(false);
      return;
    }
    setShowConfirmSubmit(false);
    calculateAndShowResult();
  };

  const calculateAndShowResult = () => {
    if (!selectedPackage) return;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setTimeSpentSeconds(elapsed);
    setViewMode('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select Real Student from DB
  const handleSelectStudentFromDb = (s: any) => {
    setActiveStudent({
      id: s.id || `SISWA-${Date.now()}`,
      name: s.name || s.nama || 'Siswa',
      nisn: s.nisn || '0000000000',
      nis: s.nis || s.nopdkt || '000000',
      noPeserta: `CBT-${(s.class || s.kelas || '6A').replace(/\s+/g, '')}-${(s.nisn || '0001').slice(-4)}`,
      class: s.class || s.kelas || 'Kelas 6A',
      gender: s.gender === 'P' ? 'P' : 'L',
      ruangUjian: 'Lab Komputer 1',
      sesiUjian: 'Sesi 1 (Pagi)',
      isDemo: false
    });
    setIsStudentModalOpen(false);

    Swal.fire({
      title: 'Akun Siswa Simulasi Diganti!',
      html: `
        <div class="text-left text-xs space-y-1">
          <p class="font-bold text-slate-800 text-sm">${s.name || s.nama}</p>
          <p class="text-slate-500">NISN: ${s.nisn || '-'} • ${s.class || s.kelas || 'Siswa Aktif'}</p>
          <p class="text-emerald-700 font-semibold pt-1">✓ Mode simulasi kini berjalan sebagai akun siswa ini.</p>
        </div>
      `,
      icon: 'success',
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Select Preset Student
  const handleSelectPresetStudent = (preset: SimulasiStudentProfile) => {
    setActiveStudent(preset);
    setIsStudentModalOpen(false);
  };

  // Create Custom Dummy Student
  const handleSaveCustomStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStudentForm.name.trim()) return;

    setActiveStudent({
      id: `SISWA-CUSTOM-${Date.now()}`,
      name: customStudentForm.name.trim(),
      nisn: customStudentForm.nisn.trim() || '1234567890',
      nis: '20269999',
      noPeserta: `CBT-KUST-${Math.floor(100 + Math.random() * 900)}`,
      class: customStudentForm.class || 'Kelas 6A',
      gender: 'L',
      ruangUjian: 'Lab Komputer Mandiri',
      sesiUjian: 'Sesi Pengujian',
      isDemo: true
    });
    setIsCustomStudentOpen(false);
    setIsStudentModalOpen(false);
  };

  // Evaluation Metrics
  const examResult = useMemo(() => {
    if (!selectedPackage) {
      return { totalScore: 0, maxScore: 0, correctCount: 0, wrongCount: 0, unansweredCount: 0, percentage: 0 };
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let earnedWeight = 0;
    let totalWeight = 0;

    selectedPackage.soalList.forEach(q => {
      const qWeight = Number(q.bobot) || 5;
      totalWeight += qWeight;
      const userAns = userAnswers[q.id];

      if (!userAns) {
        unansweredCount++;
      } else if (userAns.trim().toLowerCase() === q.kunci.trim().toLowerCase()) {
        correctCount++;
        earnedWeight += qWeight;
      } else {
        wrongCount++;
      }
    });

    const finalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    return {
      totalScore: finalScore,
      earnedWeight,
      totalWeight,
      correctCount,
      wrongCount,
      unansweredCount,
      totalQuestions: selectedPackage.soalList.length
    };
  }, [selectedPackage, userAnswers]);

  // PROMINENT ACTION: BUANG DATA DUMMY & BERSIHKAN
  const handleDiscardAndReset = () => {
    Swal.fire({
      title: 'Buang Data Uji Coba Ini?',
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2">
          <p>Tindakan ini akan <b>menghapus seluruh rekaman jawaban, nilai, dan statistik dummy</b> dari sesi simulasi siswa ini.</p>
          <p class="text-emerald-700 font-bold">✓ Bersih total: Database dan Google Sheet sekolah tetap 100% aman dan tidak tersentuh.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Buang & Bersihkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48'
    }).then(res => {
      if (res.isConfirmed) {
        setSelectedPackage(null);
        setUserAnswers({});
        setRaguMap({});
        setTimeLeft(0);
        setViewMode('catalog');
        if (onClose) {
          onClose();
        }

        Swal.fire({
          title: 'Data Simulasi Berhasil Dibuang!',
          text: 'Seluruh riwayat pengerjaan dummy telah dibersihkan secara tuntas.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  // Retake Same Simulation
  const handleRetakeSimulation = () => {
    if (!selectedPackage) return;
    setUserAnswers({});
    setRaguMap({});
    setTimeLeft(selectedPackage.durasi * 60);
    setActiveQuestionIdx(0);
    setIsTimerPaused(false);
    setStartTime(Date.now());
    setViewMode('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter Categories
  const filterCategories = [
    { key: 'ALL', label: 'Semua Jenis Ulangan' },
    { key: 'Sumatif Harian', label: 'Sumatif Harian (UH)' },
    { key: 'Sumatif Tengah Semester', label: 'STS (Tengah Semester)' },
    { key: 'Sumatif Akhir Semester', label: 'SAS / ASAS (Akhir Semester)' },
    { key: 'Tryout ANBK', label: 'Tryout ANBK' },
    { key: 'Asesmen Diagnostik', label: 'Diagnostik / Penempatan' }
  ];

  const filteredDefaultPackages = useMemo(() => {
    if (filterJenis === 'ALL') return DAFTAR_SIMULASI_PELAJARAN;
    return DAFTAR_SIMULASI_PELAJARAN.filter(p => 
      p.jenisUjian.toLowerCase().includes(filterJenis.toLowerCase())
    );
  }, [filterJenis]);

  const filteredBankSoalPackages = useMemo(() => {
    if (filterJenis === 'ALL') return schoolBankSoalPackages;
    return schoolBankSoalPackages.filter((b: any) => {
      const j = (b.jenisUjian || b.jenisAsesmen || '').toLowerCase();
      return j.includes(filterJenis.toLowerCase());
    });
  }, [filterJenis, schoolBankSoalPackages]);

  // Current Active Question in Exam Mode
  const currentQuestion = selectedPackage?.soalList[activeQuestionIdx];

  // -------------------------------------------------------------
  // RENDER 1: CATALOG VIEW (CHOOSE EXAM TO SIMULATE AS STUDENT)
  // -------------------------------------------------------------
  if (viewMode === 'catalog') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* PROMINENT STUDENT PROFILE CARD (IDENTITAS SIMULASI SISWA) */}
        <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-cyan-700/40 shadow-lg text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-white shadow-md border-2 border-cyan-300/40">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" title="Status Akun Siswa Aktif" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                    <UserCheck size={11} />
                    <span>Mode Simulasi Akun Siswa</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-200/80 bg-white/10 px-2 py-0.5 rounded-md">
                    {activeStudent.noPeserta}
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-white mt-1">
                  {activeStudent.name}
                </h3>
                
                <p className="text-xs text-cyan-100/70 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>NISN: <b>{activeStudent.nisn}</b></span>
                  <span>•</span>
                  <span>Kelas: <b>{activeStudent.class}</b></span>
                  <span>•</span>
                  <span>Ruang: <b>{activeStudent.ruangUjian}</b></span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(true)}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Users size={14} />
                <span>Ganti Akun Siswa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('portal_active_student_id', activeStudent.id);
                  sessionStorage.setItem('current_auth_student_id', activeStudent.id);
                  Swal.fire({
                    title: 'Buka Portal Siswa?',
                    html: `
                      <div class="text-left text-xs space-y-2 text-slate-600">
                        <p>ID Akun Siswa <b>${activeStudent.name}</b> (${activeStudent.id}) telah diaktifkan di sesi browser.</p>
                        <p>Anda dapat beralih ke peran Siswa (RL-026) di pemilih peran header untuk melihat seluruh modul siswa.</p>
                      </div>
                    `,
                    icon: 'info',
                    confirmButtonColor: '#0891b2',
                    confirmButtonText: 'Saya Mengerti'
                  });
                }}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
                title="Aktifkan sesi siswa ini untuk portal utama"
              >
                <ExternalLink size={13} />
                <span>Sesi Portal Siswa</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Selector Chips */}
          <div className="mt-4 pt-3 border-t border-cyan-800/40 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-cyan-200/60 font-bold uppercase tracking-wider shrink-0 mr-1">
              Pilihan Cepat Akun Siswa:
            </span>
            {(students || []).slice(0, 5).map((s: any) => {
              const sName = s.name || s.nama || 'Siswa';
              const sClass = s.class || s.kelas || '4';
              const isSelected = activeStudent.name === sName;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStudentFromDb(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isSelected 
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-xs' 
                      : 'bg-white/5 hover:bg-white/10 text-cyan-100 border-white/10'
                  }`}
                >
                  <User size={12} />
                  <span>{sName} ({sClass})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Control Bar: Source Switcher & Category Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100">
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 text-white shadow-xs flex items-center gap-1.5">
                <Layers size={14} />
                <span>Bank Soal Kurikulum Resmi Google Spreadsheet ({schoolBankSoalPackages.length} Paket)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Info size={13} className="text-cyan-600" />
              <span>Pilih paket ulangan untuk dikerjakan sebagai <b>{activeStudent.name}</b></span>
            </div>
          </div>

          {/* Filter Chips by Jenis Ulangan */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
              Jenis Ulangan:
            </span>
            {filterCategories.map(cat => {
              const isSelected = filterJenis === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFilterJenis(cat.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* PACKAGE CARDS GRID - 100% REAL BANK SOAL FROM GOOGLE SPREADSHEET */}
        <div className="space-y-4">
          {filteredBankSoalPackages.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-40 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Tidak ada paket bank soal yang cocok dengan filter jenis ulangan ini.</p>
              <p className="text-xs text-slate-400 mt-1">Silakan pilih kategori jenis ulangan lain atau buat butir soal baru di menu Bank Soal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBankSoalPackages.map((b: any) => {
                const jenis = b.jenisUjian || b.jenisAsesmen || 'Sumatif';
                const badgeInfo = getJenisUjianBadge(jenis);
                const totalSoal = Array.isArray(b.soalList) ? b.soalList.length : 0;
                const durasi = Number(b.durasi) || 30;

                return (
                  <div 
                    key={b.id}
                    className="bg-white border border-slate-200 hover:border-cyan-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.badgeBg} ${badgeInfo.badgeText}`}>
                          {jenis}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-700 font-bold bg-cyan-50 px-1.5 py-0.5 rounded">
                          {b.id}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-cyan-600 transition leading-snug">
                        {b.mapel} {b.topik ? `• ${b.topik}` : ''}
                      </h4>

                      <p className="text-[11px] text-slate-500 mt-1">
                        Kelas: <span className="font-semibold text-slate-700">{b.kelas}</span> {b.guru ? `• Guru: ${b.guru}` : ''}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-[11px]">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Butir Soal</span>
                          <span className="font-bold text-slate-800">{totalSoal} Butir PG</span>
                        </div>
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Durasi</span>
                          <span className="font-bold text-slate-800">{durasi} Menit</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleStartFromBankSoal(b)}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-98"
                      >
                        <Play size={14} />
                        <span>Mulai Simulasi Mengerjakan Soal</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL SWITCH STUDENT ACCOUNT */}
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-600 text-white rounded-xl shadow-xs">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Pilih Akun Siswa untuk Simulasi</h3>
                    <p className="text-xs text-slate-500">Pilih dari profil dummy cepat atau siswa nyata di database</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Search Input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchKeyword}
                    onChange={(e) => setStudentSearchKeyword(e.target.value)}
                    placeholder="Cari nama siswa, NISN, atau kelas..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition"
                  />
                </div>

                {/* Real Students Quick Picks */}
                <div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Pilihan Cepat Siswa Sekolah
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(students || []).slice(0, 4).map((s: any, idx: number) => {
                      const sName = s.name || s.nama || `Siswa ${idx + 1}`;
                      const isSelected = activeStudent.name === sName;
                      return (
                        <div
                          key={s.id || idx}
                          onClick={() => handleSelectStudentFromDb(s)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-center gap-3 ${
                            isSelected
                              ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                            {sName.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">{sName}</p>
                            <p className="text-[10px] text-slate-500">{s.class || s.kelas || 'Siswa'} • {s.nisn || '-'}</p>
                          </div>
                          {isSelected && <Check size={16} className="text-cyan-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real Students from Database */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Daftar Siswa Sekolah ({students?.length || 0})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredDatabaseStudents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        Tidak ada siswa yang cocok dengan pencarian "{studentSearchKeyword}".
                      </div>
                    ) : (
                      filteredDatabaseStudents.map((s: any, idx: number) => {
                        const sName = s.name || s.nama || `Siswa ${idx + 1}`;
                        const isSelected = activeStudent.name === sName;
                        return (
                          <div
                            key={s.id || idx}
                            onClick={() => handleSelectStudentFromDb(s)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-50 border-cyan-400 font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{sName}</p>
                              <p className="text-[10px] text-slate-500">
                                NISN: {s.nisn || '-'} • Kelas: {s.class || s.kelas || '-'}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                              Pilih
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Tutup Pemilih Siswa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: CONFIRM ENTRY SCREEN (LAYAR KONFIRMASI DATA SISWA & TOKEN CBT)
  // -------------------------------------------------------------
  if (viewMode === 'confirm_entry' && selectedPackage) {
    const badgeInfo = getJenisUjianBadge(selectedPackage.jenisUjian);

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up py-4">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMode('catalog')}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Pilihan Paket</span>
          </button>

          <span className="text-xs font-mono text-slate-400 font-bold">
            SESI SIMULASI CBT SISWA
          </span>
        </div>

        {/* Card Konfirmasi Data Peserta Ujian */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
          {/* Header Kop CBT Siswa */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-6 border-b border-cyan-800/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    KONFIRMASI DATA PESERTA UJIAN CBT
                  </h3>
                  <p className="text-xs text-cyan-200/80">
                    Sistem Ujian Online Siswa • SD / MI Terpadu Tambora
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-xs font-bold">
                Status: Siap Ujian
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kolom 1: Identitas Akun Siswa */}
            <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-cyan-600" />
                  <span>Data Diri Peserta Ujian</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(true)}
                  className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 underline cursor-pointer"
                >
                  Ganti Akun Siswa
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                  {activeStudent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {activeStudent.name}
                  </h4>
                  <p className="text-xs text-cyan-700 font-bold font-mono">
                    {activeStudent.noPeserta}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    NISN: {activeStudent.nisn}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Kelas / Rombel:</span>
                  <span className="font-bold text-slate-800">{activeStudent.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Ruang Ujian:</span>
                  <span className="font-bold text-slate-800">{activeStudent.ruangUjian}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Sesi Ujian:</span>
                  <span className="font-bold text-slate-800">{activeStudent.sesiUjian}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Tahun Ajaran:</span>
                  <span className="font-bold text-slate-800">2026/2027</span>
                </div>
              </div>
            </div>

            {/* Kolom 2: Rincian Tes & Input Token */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={14} className="text-indigo-600" />
                    <span>Informasi Mata Ujian</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.badgeBg} ${badgeInfo.badgeText}`}>
                    {selectedPackage.jenisUjian}
                  </span>
                </div>

                <div className="p-3.5 bg-cyan-50/50 rounded-2xl border border-cyan-100 space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    {selectedPackage.judul}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Mata Pelajaran: <b>{selectedPackage.mapel}</b> • <b>{selectedPackage.soalList.length} Butir Soal</b>
                  </p>
                  <p className="text-xs text-slate-600">
                    Alokasi Waktu: <b>{selectedPackage.durasi} Menit</b>
                  </p>
                </div>

                {/* Input Token Siswa */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound size={13} className="text-amber-500" />
                      <span>Masukkan Token Ujian:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputToken(selectedPackage.token || 'SIMULASI')}
                      className="text-[11px] text-cyan-600 hover:text-cyan-700 font-bold underline cursor-pointer"
                    >
                      Gunakan: {selectedPackage.token || 'SIMULASI'}
                    </button>
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                      placeholder="Masukkan Token..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono font-black text-base tracking-widest text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white uppercase transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    *Token bersifat simulasi otomatis. Klik tautan bantuan di atas jika belum terisi.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleStartExamRun}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
                >
                  <Play size={16} />
                  <span>Mulai Ujian Sebagai {activeStudent.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('catalog')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal & Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 3: ACTIVE EXAM RUN (REAL CBT TEST WORKSPACE SISWA)
  // -------------------------------------------------------------
  if (viewMode === 'exam' && selectedPackage && currentQuestion) {
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = selectedPackage.soalList.length;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Floating Sandbox Warning Bar */}
        <div className="bg-amber-500 text-amber-950 px-4 py-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <span className="animate-pulse">⚡</span>
            <span>SIMULASI AKUN SISWA AKTIF: Anda sedang mengerjakan soal sebagai <b>{activeStudent.name} ({activeStudent.class})</b>. Data bersifat sandbox & tidak dicatat ke spreadsheet.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardAndReset}
              className="px-2.5 py-1 bg-amber-900 text-white hover:bg-amber-950 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Batalkan & Buang Sesi</span>
            </button>
          </div>
        </div>

        {/* Top CBT Header (Identitas Siswa & Timer) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {activeStudent.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">{activeStudent.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {activeStudent.class}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  NISN: {activeStudent.nisn}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedPackage.judul} • Terjawab: {answeredCount} dari {totalQuestions} Soal ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer with Pause/Resume */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
              timeLeft < 300 
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                : 'bg-slate-50 text-slate-800 border-slate-200'
            }`}>
              <Clock size={16} className={timeLeft < 300 ? 'text-rose-600' : 'text-slate-500'} />
              <span>{formatTime(timeLeft)}</span>
              <button
                type="button"
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title={isTimerPaused ? 'Lanjutkan Timer' : 'Jeda Timer'}
              >
                {isTimerPaused ? <Play size={13} className="text-emerald-600" /> : <Pause size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setTimeLeft(prev => prev + 300)}
                className="text-slate-400 hover:text-cyan-700 p-0.5 cursor-pointer"
                title="Tambah 5 Menit (Fitur Khusus Pengujian)"
              >
                <PlusCircle size={13} />
              </button>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCbtFontSize('normal')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                  cbtFontSize === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setCbtFontSize('large')}
                className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                  cbtFontSize === 'large' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setCbtFontSize('xlarge')}
                className={`px-2 py-0.5 rounded text-sm font-bold cursor-pointer ${
                  cbtFontSize === 'xlarge' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                A++
              </button>
            </div>
          </div>
        </div>

        {/* MAIN EXAM WORKSPACE: Question on Left, Palette on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Question Card (Col 1-3) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[480px]">
            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-cyan-600 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs">
                    {activeQuestionIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Soal Nomor {activeQuestionIdx + 1} dari {totalQuestions}
                  </span>
                  {raguMap[currentQuestion.id] && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Ragu-ragu
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    Bobot: {Number(currentQuestion.bobot) || 5} Poin
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className={`text-slate-900 font-medium mb-6 whitespace-pre-line leading-relaxed ${
                cbtFontSize === 'xlarge' ? 'text-lg' : cbtFontSize === 'large' ? 'text-base' : 'text-sm'
              }`}>
                {currentQuestion.pertanyaan}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3">
                {Object.entries(currentQuestion.opsi).map(([key, label]) => {
                  const isSelected = userAnswers[currentQuestion.id] === key.toLowerCase();
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, key)}
                      className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer group ${
                        isSelected 
                          ? 'bg-cyan-50/80 border-cyan-500 shadow-2xs ring-1 ring-cyan-500' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition ${
                        isSelected 
                          ? 'bg-cyan-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}>
                        {key.toUpperCase()}
                      </span>
                      <span className={`text-xs pt-1 flex-1 leading-relaxed ${
                        isSelected ? 'font-bold text-cyan-950' : 'text-slate-700'
                      }`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                disabled={activeQuestionIdx === 0}
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft size={14} />
                <span>Soal Sebelumnya</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRagu(currentQuestion.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  raguMap[currentQuestion.id]
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle size={14} />
                <span>{raguMap[currentQuestion.id] ? 'Tandai Yakin' : 'Ragu-ragu'}</span>
              </button>

              {activeQuestionIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Soal Berikutnya</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send size={14} />
                  <span>Kumpulkan Ujian Siswa</span>
                </button>
              )}
            </div>
          </div>

          {/* Palette Questions Card (Col 4) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-600" />
                <span>Daftar Soal Siswa</span>
              </span>
              <span className="text-[11px] font-bold text-cyan-700">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            {/* Question Buttons Grid */}
            <div className="grid grid-cols-5 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
              {selectedPackage.soalList.map((q, idx) => {
                const isCurrent = activeQuestionIdx === idx;
                const isAnswered = !!userAnswers[q.id];
                const isRagu = !!raguMap[q.id];

                let btnClass = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
                if (isCurrent) {
                  btnClass = 'bg-cyan-600 text-white border-cyan-700 font-black shadow-xs ring-2 ring-cyan-300';
                } else if (isRagu) {
                  btnClass = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`h-9 rounded-lg border text-xs flex items-center justify-center transition cursor-pointer relative ${btnClass}`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
                <span>Sudah dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500" />
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200" />
                <span>Belum dijawab</span>
              </div>
            </div>

            {/* Finish Button at bottom of palette */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={14} />
                <span>Selesaikan Ujian</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL CONFIRM SUBMIT */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Kumpulkan Ujian Siswa?
                </h3>
                <p className="text-xs text-slate-500">
                  Peserta <b>{activeStudent.name}</b> telah menjawab <b>{answeredCount}</b> dari <b>{totalQuestions}</b> soal.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase">Terjawab</span>
                  <span className="text-lg font-black text-emerald-700">{answeredCount}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="block text-[10px] text-amber-600 font-bold uppercase">Ragu-ragu</span>
                  <span className="text-lg font-black text-amber-700">{Object.keys(raguMap).filter(k => raguMap[Number(k)]).length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Kosong</span>
                  <span className="text-lg font-black text-slate-700">{totalQuestions - answeredCount}</span>
                </div>
              </div>

              {answeredCount < totalQuestions ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">
                  <span className="font-bold block text-rose-900 mb-0.5">⚠️ Belum Dapat Mengumpulkan:</span>
                  Semua soal wajib terisi jawaban. Masih terdapat <strong>{totalQuestions - answeredCount} butir soal</strong> yang kosong.
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Seluruh {totalQuestions} soal telah terisi. Skor dan kunci pembahasan akan langsung ditampilkan di layar setelah Anda mengumpulkan.
                </p>
              )}

              <div className="flex items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {answeredCount < totalQuestions ? 'Lengkapi Jawaban' : 'Periksa Lagi'}
                </button>
                {answeredCount < totalQuestions ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed opacity-70"
                  >
                    Wajib Terisi Semua
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                  >
                    Kumpulkan Sekarang
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 4: EVALUATION & RESULT VIEW (INSTANT GRADING & REVIEW SISWA)
  // -------------------------------------------------------------
  if (viewMode === 'result' && selectedPackage) {
    const isLulus = examResult.totalScore >= 75;

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Top Sandbox Notice */}
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-950">
                Hasil Ujian Siswa Ini Bersifat Sementara (Data Dummy Uji Coba)
              </h4>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Hasil pengerjaan oleh <b>{activeStudent.name}</b> tidak dicatat ke Google Sheets ataupun database sekolah. Anda dapat membuangnya sekarang.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDiscardAndReset}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <Trash2 size={13} />
            <span>Buang Hasil & Bersihkan Sandbox</span>
          </button>
        </div>

        {/* Score Card Banner with Student Identity */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center font-black shadow-inner border-2 ${
              isLulus 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}>
              <span className="text-3xl tracking-tight">{examResult.totalScore}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Skor / 100</span>
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isLulus ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {isLulus ? '✓ Tuntas / Mencapai KKM' : 'Perlu Pendalaman Materi'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {selectedPackage.jenisUjian}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mt-1">
                {selectedPackage.judul}
              </h3>
              
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-bold text-cyan-800 flex items-center gap-1">
                  <User size={13} />
                  <span>Peserta: {activeStudent.name} ({activeStudent.class})</span>
                </span>
                <span>•</span>
                <span>NISN: {activeStudent.nisn}</span>
                <span>•</span>
                <span>Waktu Pengerjaan: {formatTime(timeSpentSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center">
            <button
              type="button"
              onClick={handleRetakeSimulation}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Ulangi Ujian</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPackage(null);
                setViewMode('catalog');
                setIsStudentModalOpen(true);
              }}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Users size={14} />
              <span>Ganti Akun Siswa Lain</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardAndReset}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 size={14} />
              <span>Selesai & Buang Data</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Soal</span>
            <span className="text-xl font-black text-slate-800 mt-1 block">{examResult.totalQuestions}</span>
            <span className="text-[10px] text-slate-500 block">Butir Soal</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-center shadow-2xs bg-emerald-50/30">
            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Jawaban Benar</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">{examResult.correctCount}</span>
            <span className="text-[10px] text-emerald-600 block">{Math.round((examResult.correctCount / examResult.totalQuestions) * 100)}% Akurasi</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 text-center shadow-2xs bg-rose-50/30">
            <span className="text-[10px] text-rose-600 font-bold uppercase block">Jawaban Salah</span>
            <span className="text-xl font-black text-rose-700 mt-1 block">{examResult.wrongCount}</span>
            <span className="text-[10px] text-rose-600 block">Perlu Evaluasi</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Tidak Terjawab</span>
            <span className="text-xl font-black text-slate-600 mt-1 block">{examResult.unansweredCount}</span>
            <span className="text-[10px] text-slate-400 block">Kosong</span>
          </div>
        </div>

        {/* DETAILED QUESTION REVIEW & RATIONAL DISCUSSION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award size={16} className="text-cyan-600" />
                <span>Kunci Jawaban & Pembahasan Rasional Lengkap</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi mendalam setiap butir soal untuk menganalisis pemahaman peserta {activeStudent.name}:
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total {selectedPackage.soalList.length} Pembahasan
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {selectedPackage.soalList.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const isCorrect = userAns && userAns.toLowerCase() === q.kunci.toLowerCase();
              const isUnanswered = !userAns;

              return (
                <div 
                  key={q.id}
                  className={`p-4 rounded-2xl border transition ${
                    isCorrect 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : isUnanswered 
                        ? 'bg-slate-50/70 border-slate-200' 
                        : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${
                        isCorrect 
                          ? 'bg-emerald-600 text-white' 
                          : isUnanswered 
                            ? 'bg-slate-300 text-slate-700' 
                            : 'bg-rose-600 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-[11px] font-bold ${
                        isCorrect ? 'text-emerald-700' : isUnanswered ? 'text-slate-500' : 'text-rose-700'
                      }`}>
                        {isCorrect ? '✓ Benar' : isUnanswered ? '○ Belum Dijawab' : '✗ Salah'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Bobot: {Number(q.bobot) || 5} Poin
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 mb-3 whitespace-pre-line leading-relaxed">
                    {q.pertanyaan}
                  </p>

                  {/* Options Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    {Object.entries(q.opsi).map(([optKey, optText]) => {
                      const isUserChoice = userAns === optKey.toLowerCase();
                      const isActualKey = q.kunci.toLowerCase() === optKey.toLowerCase();

                      let optBox = 'bg-white/80 border-slate-200 text-slate-600';
                      if (isActualKey) {
                        optBox = 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold';
                      } else if (isUserChoice && !isActualKey) {
                        optBox = 'bg-rose-100 border-rose-300 text-rose-900 font-bold';
                      }

                      return (
                        <div key={optKey} className={`p-2 rounded-xl border flex items-start gap-2 ${optBox}`}>
                          <span className="w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center shrink-0 bg-white/70">
                            {optKey.toUpperCase()}
                          </span>
                          <span className="text-[11px] leading-tight pt-0.5">{optText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rational Explanation Box */}
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                    <span className="font-bold text-cyan-800 flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>Pembahasan Rasional & Kunci:</span>
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {q.pembahasan || 'Pembahasan rasional terstandar untuk butir soal ini.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRetakeSimulation}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Coba Kerjakan Ulang</span>
            </button>

            <button
              type="button"
              onClick={handleDiscardAndReset}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Buang Hasil & Bersihkan Data Uji Coba</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
