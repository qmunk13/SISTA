import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../data/db';
import { 
  cn, matchClass, matchStatusKenaikanKelas, getActiveClasses, getAllClasses, 
  normalizeClassName, formatClassLabel, STANDARD_CLASSES, 
  sortStudentsByStatusAndName, getStatusPriority, triggerPrint 
} from '../lib/utils';
import { Student } from '../types';
import { 
  Users, ArrowUpCircle, CheckCircle2, AlertCircle, TrendingUp, 
  Sparkles, Check, RefreshCw, GraduationCap, XCircle, ArrowRight,
  Filter, CheckSquare, UserCheck, AlertTriangle, History, BarChart3,
  Search, FileSpreadsheet, Printer, Calendar, Clock, BookOpen, Award,
  Trash2
} from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { PromotionOption, getPromotionOptionsForClass } from '../lib/promotionService';
import { exportToExcel } from '../lib/excel';
import CustomDropdown from '../components/common/CustomDropdown';

export interface RiwayatKenaikanRecord {
  KenaikanID: string;
  TAHUNMASUK: string;
  SiswaID: string;
  NISN: string;
  NamaSiswa: string;
  KelasAsal: string;
  KelasTujuan: string;
  TahunAjaran: string;
  Semester: string;
  StatusKenaikan: string;
  CatatanKeputusan: string;
  TanggalProses: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export default function KenaikanKelas() {
  const { 
    students, updateStudentsBulk, settings, setLoading, 
    setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'proses' | 'riwayat' | 'rekap'>('proses');

  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusKenaikanKelas(s?.status));
  }, [students]);

  const activeClasses = useMemo(() => {
    const fromActive = getActiveClasses(activeStudents);
    const fromAll = getAllClasses(activeStudents);
    return Array.from(new Set([...fromActive, ...fromAll])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);
  const allClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(activeStudents), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);

  const [selectedClass, setSelectedClass] = useState<string>(activeClasses[0] || '4');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>(settings.tahunPelajaran || '2026/2027');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Genap');
  
  // State for decisions per student: { [studentId]: { option: PromotionOption, catatan: string, tahunMasuk: string } }
  const [studentDecisions, setStudentDecisions] = useState<{
    [studentId: string]: {
      option: PromotionOption;
      catatan: string;
      tahunMasuk: string;
    };
  }>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stored history from db
  const [historyList, setHistoryList] = useState<RiwayatKenaikanRecord[]>(() => {
    const raw = db.get<RiwayatKenaikanRecord>('academic_promotions');
    if (raw && raw.length > 0) return raw;
    const rawAlt = db.get<RiwayatKenaikanRecord>('kenaikan_kelas');
    return rawAlt && rawAlt.length > 0 ? rawAlt : [];
  });

  // History search and filters
  const [historySearch, setHistorySearch] = useState('');
  const [filterTahunMasuk, setFilterTahunMasuk] = useState('Semua');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('Semua');
  const [filterStatusKenaikan, setFilterStatusKenaikan] = useState('Semua');
  const [filterKelasAsal, setFilterKelasAsal] = useState('Semua');

  // Process Tab Filters
  const [filterProsesStatus, setFilterProsesStatus] = useState<string>('Semua');
  const [filterProsesTahunMasuk, setFilterProsesTahunMasuk] = useState<string>('Semua');
  const [massApplyValue, setMassApplyValue] = useState<string>('');

  // Promotion options for currently selected class
  const classPromotionOptions = useMemo(() => {
    return getPromotionOptionsForClass(selectedClass);
  }, [selectedClass]);

  const defaultOption: PromotionOption = useMemo(() => {
    return classPromotionOptions[0] || { value: 'Naik', label: 'Naik Kelas', action: 'Naik', targetClass: '5' };
  }, [classPromotionOptions]);

  // Helper to extract automatic Tahun Masuk
  const getAutoTahunMasuk = (s: Student) => {
    if ((s as any).tahunMasuk) return String((s as any).tahunMasuk);
    if ((s as any).entryYear) return String((s as any).entryYear);
    if ((s as any).tahun_masuk) return String((s as any).tahun_masuk);
    if ((s as any).TahunMasuk) return String((s as any).TahunMasuk);
    
    // Auto-calculate from current class level and active academic year
    const activeYearNum = parseInt(settings.tahunPelajaran ? settings.tahunPelajaran.split('/')[0] : '2026', 10);
    const classNum = parseInt(s.class || '1', 10);
    if (!isNaN(classNum) && classNum >= 1 && classNum <= 12) {
      return String(activeYearNum - (classNum - 1));
    }
    return String(activeYearNum);
  };

  // Students in selected class sorted by status: Aktif -> Tidak Aktif -> Belum (Excludes Pindah, Lulus, Keluar)
  const classStudents = useMemo(() => {
    if (!activeStudents) return [];
    let filtered = activeStudents.filter(s => matchClass(s.class, selectedClass));
    
    if (filterProsesStatus !== 'Semua') {
      if (filterProsesStatus === 'Aktif') {
        filtered = filtered.filter(s => getStatusPriority(s.status) === 1);
      } else if (filterProsesStatus === 'Tidak Aktif') {
        filtered = filtered.filter(s => getStatusPriority(s.status) === 2);
      } else if (filterProsesStatus === 'Belum') {
        filtered = filtered.filter(s => getStatusPriority(s.status) === 3);
      }
    }

    if (filterProsesTahunMasuk !== 'Semua') {
      filtered = filtered.filter(s => getAutoTahunMasuk(s) === filterProsesTahunMasuk);
    }

    return sortStudentsByStatusAndName(filtered);
  }, [activeStudents, selectedClass, filterProsesStatus, filterProsesTahunMasuk, settings.tahunPelajaran]);

  // Unique Tahun Masuk for class
  const classUniqueTahunMasuk = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach(s => {
      set.add(getAutoTahunMasuk(s));
    });
    return Array.from(set).sort().reverse();
  }, [activeStudents, settings.tahunPelajaran]);

  // Track previous selected class to only reset when class actually changes
  const prevSelectedClassRef = React.useRef(selectedClass);

  // Initialize individual decisions when class or student list changes
  useEffect(() => {
    const isClassChanged = prevSelectedClassRef.current !== selectedClass;
    prevSelectedClassRef.current = selectedClass;

    setStudentDecisions(prev => {
      const updated: typeof studentDecisions = isClassChanged ? {} : { ...prev };
      classStudents.forEach(s => {
        if (!updated[s.id] || isClassChanged) {
          const existingTahunMasuk = getAutoTahunMasuk(s);
          updated[s.id] = {
            option: defaultOption,
            catatan: defaultOption.action === 'Naik' ? 'Memenuhi KKM dan Kriteria Kenaikan' : (defaultOption.action === 'Lulus' ? 'Lulus Ujian Sekolah & Asesmen Akhir' : 'Keputusan Dewan Pendidik'),
            tahunMasuk: String(existingTahunMasuk)
          };
        }
      });
      return updated;
    });
  }, [selectedClass, classStudents.length, defaultOption]);

  const handleDecisionChange = (studentId: string, optionValue: string) => {
    const selectedOpt = classPromotionOptions.find(o => o.value === optionValue) || defaultOption;
    let defaultCatatan = 'Keputusan Dewan Pendidik';
    if (selectedOpt.action === 'Naik') defaultCatatan = 'Memenuhi KKM dan Kriteria Kenaikan';
    else if (selectedOpt.action === 'Lulus') defaultCatatan = 'Lulus Ujian Sekolah & Asesmen Akhir';
    else if (selectedOpt.action === 'Tinggal') defaultCatatan = 'Perlu pendalaman materi dan remedial';
    else if (selectedOpt.action === 'Pindah') defaultCatatan = 'Mutasi pindah sekolah';
    else if (selectedOpt.action === 'Keluar') defaultCatatan = 'Mengundurkan diri / Putus Sekolah';

    setStudentDecisions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        option: selectedOpt,
        catatan: defaultCatatan
      }
    }));
  };

  const handleCatatanChange = (studentId: string, catatan: string) => {
    setStudentDecisions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        catatan
      }
    }));
  };

  const handleTahunMasukChange = (studentId: string, tahunMasuk: string) => {
    setStudentDecisions(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        tahunMasuk
      }
    }));
  };

  const handleApplyToAll = (optionValue: string) => {
    const selectedOpt = classPromotionOptions.find(o => o.value === optionValue);
    if (!selectedOpt) return;
    
    let defaultCatatan = 'Keputusan Dewan Pendidik';
    if (selectedOpt.action === 'Naik') defaultCatatan = 'Memenuhi KKM dan Kriteria Kenaikan';
    else if (selectedOpt.action === 'Lulus') defaultCatatan = 'Lulus Ujian Sekolah & Asesmen Akhir';
    else if (selectedOpt.action === 'Tinggal') defaultCatatan = 'Perlu pendalaman materi dan remedial';
    else if (selectedOpt.action === 'Pindah') defaultCatatan = 'Mutasi pindah sekolah';
    else if (selectedOpt.action === 'Keluar') defaultCatatan = 'Mengundurkan diri / Putus Sekolah';

    setStudentDecisions(prev => {
      const updated: typeof studentDecisions = {};
      classStudents.forEach(s => {
        updated[s.id] = {
          option: selectedOpt,
          catatan: defaultCatatan,
          tahunMasuk: prev[s.id]?.tahunMasuk || (s as any).tahunMasuk || '2025'
        };
      });
      return updated;
    });
  };

  const handleExecutePromotion = async () => {
    if (classStudents.length === 0) {
      alert('Tidak ada siswa di kelas ini.');
      return;
    }

    const confirmMsg = `Konfirmasi eksekusi kenaikan / kelulusan untuk ${classStudents.length} siswa di Kelas ${selectedClass} (T.A ${selectedTahunAjaran} Semester ${selectedSemester})?\n\n1. Status & Kelas pada data induk Siswa akan otomatis diperbarui.\n2. Riwayat lengkap akan dicatat pada riwayat KENAIKAN_KELAS & KELULUSAN.`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);

    try {
      const nowStr = new Date().toISOString();
      const todayStr = new Date().toISOString().slice(0, 10);
      const newHistoryRecords: RiwayatKenaikanRecord[] = [];
      const newGraduationRecords: any[] = [];

      const studentUpdates = classStudents.map(s => {
        const item = studentDecisions[s.id] || {
          option: defaultOption,
          catatan: 'Memenuhi kriteria kenaikan',
          tahunMasuk: (s as any).tahunMasuk || '2025'
        };
        const decision = item.option;
        
        let newStatus: Student['status'] = 'Aktif';
        let newClass = s.class;

        if (decision.action === 'Lulus') {
          newStatus = 'Lulus';
          newClass = `Alumni (Lulus ${decision.targetClass || selectedClass})`;
        } else if (decision.action === 'Pindah') {
          newStatus = 'Pindah';
        } else if (decision.action === 'Keluar') {
          newStatus = 'Keluar';
        } else if (decision.action === 'Tinggal') {
          newStatus = 'Aktif';
          newClass = decision.targetClass || selectedClass;
        } else {
          // Naik
          newStatus = 'Aktif';
          newClass = decision.targetClass || selectedClass;
        }

        // Create promotion history record
        const kenaikanId = `KK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const rec: RiwayatKenaikanRecord = {
          KenaikanID: kenaikanId,
          TAHUNMASUK: item.tahunMasuk || (s as any).tahunMasuk || '-',
          SiswaID: s.nopdkt || s.id,
          NISN: s.nisn || '-',
          NamaSiswa: s.name,
          KelasAsal: formatClassLabel(selectedClass, true),
          KelasTujuan: decision.action === 'Lulus' ? 'Lulus / Alumni' : formatClassLabel(decision.targetClass, true),
          TahunAjaran: selectedTahunAjaran,
          Semester: selectedSemester,
          StatusKenaikan: decision.label || decision.action,
          CatatanKeputusan: item.catatan || 'Sesuai Keputusan Rapat Dewan Guru',
          TanggalProses: todayStr,
          CreatedAt: nowStr,
          UpdatedAt: nowStr
        };
        newHistoryRecords.push(rec);

        if (decision.action === 'Lulus') {
          newGraduationRecords.push({
            KelulusanID: `LULUS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            SiswaID: s.nopdkt || s.id,
            NISN: s.nisn || '-',
            NamaSiswa: s.name,
            KelasTerakhir: formatClassLabel(selectedClass, true),
            TahunLulus: selectedTahunAjaran.split('/')[0] || String(new Date().getFullYear()),
            NomorSKL: `SKL/${new Date().getFullYear()}/${s.nopdkt || s.nis || s.id}`,
            NomorIjazah: '-',
            NilaiAkhir: 85,
            Predikat: 'Sangat Baik',
            StatusKelulusan: 'Lulus',
            Keterangan: item.catatan || 'Lulus Ujian Sekolah',
            TanggalLulus: todayStr,
            CreatedAt: nowStr,
            UpdatedAt: nowStr
          });
        }

        return {
          id: s.id,
          data: {
            class: newClass,
            status: newStatus,
            tahunMasuk: item.tahunMasuk || (s as any).tahunMasuk
          }
        };
      });

      // 1. Update in-memory state
      updateStudentsBulk(studentUpdates);

      // 2. Persist promotion history in DB
      const updatedHistory = [...newHistoryRecords, ...historyList];
      setHistoryList(updatedHistory);
      db.set('academic_promotions', updatedHistory);
      db.set('kenaikan_kelas', updatedHistory);

      if (newGraduationRecords.length > 0) {
        const prevGrads = db.get('academic_graduations') || [];
        db.set('academic_graduations', [...newGraduationRecords, ...prevGrads]);
      }

      // 3. Trigger cloud sync if scriptUrl is present
      if (settings.scriptUrl) {
        setIsSyncingGlobal(true);
        const updatedAll = useStore.getState().students;
        await fetchFromGAS(settings.scriptUrl, {
          action: 'sync',
          data: updatedAll,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        });
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
        setIsSyncingGlobal(false);
      }

      setSuccessMessage(`Berhasil memproses kenaikan/kelulusan untuk ${classStudents.length} siswa di Kelas ${selectedClass}! Riwayat & Rekap telah tersimpan.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e) {
      console.error("Error executing promotion:", e);
      alert("Terjadi kesalahan saat memproses data promosi siswa.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteHistoryItem = (kenaikanId: string) => {
    if (!window.confirm("Hapus catatan riwayat kenaikan kelas ini?")) return;
    const filtered = historyList.filter(h => h.KenaikanID !== kenaikanId);
    setHistoryList(filtered);
    db.set('academic_promotions', filtered);
    db.set('kenaikan_kelas', filtered);
  };

  const handleClearAllHistory = () => {
    if (!window.confirm("Hapus seluruh catatan riwayat kenaikan kelas? Tindakan ini tidak dapat dibatalkan.")) return;
    setHistoryList([]);
    db.set('academic_promotions', []);
    db.set('kenaikan_kelas', []);
  };

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return historyList.filter(h => {
      const matchSearch = historySearch 
        ? (h.NamaSiswa && h.NamaSiswa.toLowerCase().includes(historySearch.toLowerCase())) ||
          (h.NISN && h.NISN.includes(historySearch)) ||
          (h.KenaikanID && h.KenaikanID.toLowerCase().includes(historySearch.toLowerCase())) ||
          (h.CatatanKeputusan && h.CatatanKeputusan.toLowerCase().includes(historySearch.toLowerCase()))
        : true;
      
      const matchTM = filterTahunMasuk === 'Semua' || h.TAHUNMASUK === filterTahunMasuk;
      const matchTA = filterTahunAjaran === 'Semua' || h.TahunAjaran === filterTahunAjaran;
      const matchStatus = filterStatusKenaikan === 'Semua' || (h.StatusKenaikan && h.StatusKenaikan.toLowerCase().includes(filterStatusKenaikan.toLowerCase()));
      const matchKelas = filterKelasAsal === 'Semua' || (h.KelasAsal && h.KelasAsal.includes(filterKelasAsal));

      return matchSearch && matchTM && matchTA && matchStatus && matchKelas;
    });
  }, [historyList, historySearch, filterTahunMasuk, filterTahunAjaran, filterStatusKenaikan, filterKelasAsal]);

  // Unique options for history filter
  const uniqueTahunMasuk = useMemo(() => {
    const set = new Set<string>();
    historyList.forEach(h => { if (h.TAHUNMASUK) set.add(h.TAHUNMASUK); });
    students.forEach(s => { const tm = (s as any).tahunMasuk || (s as any).entryYear; if (tm) set.add(String(tm)); });
    return Array.from(set).sort().reverse();
  }, [historyList, students]);

  const uniqueTahunAjaran = useMemo(() => {
    const set = new Set<string>();
    ['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028'].forEach(ta => set.add(ta));
    historyList.forEach(h => { if (h.TahunAjaran) set.add(h.TahunAjaran); });
    if (settings.tahunPelajaran) set.add(settings.tahunPelajaran);
    return Array.from(set).sort().reverse();
  }, [historyList, settings.tahunPelajaran]);

  // Rekap Analytics Calculations
  const rekapByTahunMasuk = useMemo(() => {
    const map: { [tm: string]: { total: number; naik: number; tinggal: number; lulus: number; pindah: number; keluar: number } } = {};
    
    historyList.forEach(h => {
      const tm = h.TAHUNMASUK || 'Tidak Tercatat';
      if (!map[tm]) {
        map[tm] = { total: 0, naik: 0, tinggal: 0, lulus: 0, pindah: 0, keluar: 0 };
      }
      map[tm].total++;
      const s = (h.StatusKenaikan || '').toLowerCase();
      if (s.includes('lulus')) map[tm].lulus++;
      else if (s.includes('tinggal') || s.includes('mengulang')) map[tm].tinggal++;
      else if (s.includes('pindah') || s.includes('mutasi')) map[tm].pindah++;
      else if (s.includes('keluar') || s.includes('do')) map[tm].keluar++;
      else map[tm].naik++;
    });

    return Object.entries(map).map(([tm, stats]) => ({
      tahunMasuk: tm,
      ...stats,
      persenKenaikan: stats.total > 0 ? Math.round(((stats.naik + stats.lulus) / stats.total) * 100) : 0
    })).sort((a, b) => b.tahunMasuk.localeCompare(a.tahunMasuk));
  }, [historyList]);

  const rekapByTahunAjaran = useMemo(() => {
    const map: { [ta: string]: { total: number; naik: number; tinggal: number; lulus: number; mutasi: number } } = {};
    
    historyList.forEach(h => {
      const ta = `${h.TahunAjaran || '2026/2027'} - ${h.Semester || 'Genap'}`;
      if (!map[ta]) {
        map[ta] = { total: 0, naik: 0, tinggal: 0, lulus: 0, mutasi: 0 };
      }
      map[ta].total++;
      const s = (h.StatusKenaikan || '').toLowerCase();
      if (s.includes('lulus')) map[ta].lulus++;
      else if (s.includes('tinggal')) map[ta].tinggal++;
      else if (s.includes('pindah') || s.includes('keluar')) map[ta].mutasi++;
      else map[ta].naik++;
    });

    return Object.entries(map).map(([ta, stats]) => ({
      tahunAjaranSemester: ta,
      ...stats
    }));
  }, [historyList]);

  const totalHistoryCount = historyList.length;
  const totalNaikCount = useMemo(() => historyList.filter(h => (h.StatusKenaikan || '').toLowerCase().includes('naik')).length, [historyList]);
  const totalLulusCount = useMemo(() => historyList.filter(h => (h.StatusKenaikan || '').toLowerCase().includes('lulus')).length, [historyList]);
  const totalTinggalCount = useMemo(() => historyList.filter(h => (h.StatusKenaikan || '').toLowerCase().includes('tinggal')).length, [historyList]);

  const handleExportHistoryExcel = () => {
    if (filteredHistory.length === 0) {
      alert("Tidak ada data riwayat untuk diekspor.");
      return;
    }
    const rows = filteredHistory.map((h, idx) => ({
      No: idx + 1,
      KenaikanID: h.KenaikanID,
      TAHUNMASUK: h.TAHUNMASUK,
      SiswaID: h.SiswaID,
      NISN: h.NISN,
      NamaSiswa: h.NamaSiswa,
      KelasAsal: h.KelasAsal,
      KelasTujuan: h.KelasTujuan,
      TahunAjaran: h.TahunAjaran,
      Semester: h.Semester,
      StatusKenaikan: h.StatusKenaikan,
      CatatanKeputusan: h.CatatanKeputusan,
      TanggalProses: h.TanggalProses,
      CreatedAt: h.CreatedAt
    }));
    exportToExcel(rows, `Riwayat_Kenaikan_Kelas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportRekapExcel = () => {
    if (rekapByTahunMasuk.length === 0) {
      alert("Belum ada data rekap untuk diekspor.");
      return;
    }
    const rows = rekapByTahunMasuk.map((r, idx) => ({
      No: idx + 1,
      'Tahun Masuk (TAHUNMASUK)': r.tahunMasuk,
      'Total Siswa Diproses': r.total,
      'Naik Kelas': r.naik,
      'Lulus': r.lulus,
      'Tinggal Kelas': r.tinggal,
      'Pindah / Mutasi': r.pindah,
      'Keluar / DO': r.keluar,
      'Persentase Sukses (%)': `${r.persenKenaikan}%`
    }));
    exportToExcel(rows, `Rekapitulasi_Kenaikan_TahunMasuk_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="printable-area" className="printable-container w-full max-w-6xl mx-auto space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:bg-white text-slate-900">
      {/* Official Print Header */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
        <h2 className="text-xs font-bold uppercase tracking-wider">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h2>
        <h1 className="text-base font-black uppercase">{settings.schoolName || 'SISTEM INFORMASI AKADEMIK'}</h1>
        <p className="text-[9pt] text-gray-700">{settings.schoolAddress || '-'}</p>
        <div className="border-t border-black mt-2 pt-1">
          <h3 className="text-xs font-black uppercase underline">
            {activeTab === 'riwayat' ? 'LAPORAN RIWAYAT KENAIKAN KELAS & KELULUSAN SISWA' : 'LAPORAN REKAPITULASI PROMOSI DAN MUTASI PESERTA DIDIK'}
          </h3>
          <p className="text-[8pt] text-gray-600">
            TAHUN AJARAN {selectedTahunAjaran} • DICETAK PADA: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </p>
        </div>
      </div>

      {/* Header with Navigation Tabs */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100/80 shadow-xs">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">Kenaikan Kelas & Kelulusan Terpadu</h2>
            <p className="text-xs text-slate-500 font-medium">
              Manajemen eksekusi promosi, riwayat kenaikan (sheet KENAIKAN_KELAS), dan rekapitulasi TAHUNMASUK.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setActiveTab('proses')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeTab === 'proses'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-white/60'
            }`}
          >
            <ArrowUpCircle size={15} />
            <span>1. Proses Kenaikan</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeTab === 'riwayat'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-white/60'
            }`}
          >
            <History size={15} />
            <span>2. Riwayat Kenaikan ({historyList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeTab === 'rekap'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-900 hover:bg-white/60'
            }`}
          >
            <BarChart3 size={15} />
            <span>3. Rekap & Statistik</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PROSES KENAIKAN & KELULUSAN */}
      {/* ========================================================================= */}
      {activeTab === 'proses' && (
        <div className="space-y-6">
          {/* Controls Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Origin Class */}
              <div>
                <CustomDropdown
                  id="kenaikan-origin-class"
                  label="1. Pilih Kelas Asal"
                  value={selectedClass}
                  onChange={(val) => setSelectedClass(val)}
                  options={allClasses.map(c => {
                    const countActive = activeStudents.filter(s => matchClass(s.class, c)).length;
                    return {
                      value: c,
                      label: `${formatClassLabel(c, true)} (${countActive} Siswa)`
                    };
                  })}
                  placeholder="Pilih Kelas Asal..."
                  searchable={allClasses.length > 5}
                />
              </div>

              {/* Tahun Ajaran */}
              <div>
                <CustomDropdown
                  id="kenaikan-tahun-ajaran"
                  label="2. Tahun Ajaran"
                  value={selectedTahunAjaran}
                  onChange={(val) => setSelectedTahunAjaran(val)}
                  options={[
                    { value: settings.tahunPelajaran || '2026/2027', label: `${settings.tahunPelajaran || '2026/2027'} (Aktif)` },
                    { value: '2025/2026', label: '2025/2026' },
                    { value: '2024/2025', label: '2024/2025' },
                    { value: '2023/2024', label: '2023/2024 (Historis)' },
                    { value: '2027/2028', label: '2027/2028 (Mendatang)' }
                  ]}
                  placeholder="Pilih Tahun Ajaran..."
                />
              </div>

              {/* Semester */}
              <div>
                <CustomDropdown
                  id="kenaikan-semester"
                  label="3. Semester"
                  value={selectedSemester}
                  onChange={(val) => setSelectedSemester(val as any)}
                  options={[
                    { value: 'Genap', label: 'Semester Genap (Kenaikan Kelas / Kelulusan)' },
                    { value: 'Ganjil', label: 'Semester Ganjil (Promosi Akselerasi)' }
                  ]}
                  placeholder="Pilih Semester..."
                />
              </div>

              {/* Default Target Info */}
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">Target Standar Rombel</span>
                <div className="text-sm font-black text-indigo-950 truncate">
                  {defaultOption.label} &rarr; <span className="text-indigo-600">{defaultOption.targetClass ? formatClassLabel(defaultOption.targetClass, true) : 'Lulus'}</span>
                </div>
              </div>
            </div>

            {/* Quick Bulk Action Banner & Secondary Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="min-w-[200px]">
                  <CustomDropdown
                    id="kenaikan-proses-status"
                    label="Status Saat Ini"
                    value={filterProsesStatus}
                    onChange={(val) => setFilterProsesStatus(val)}
                    options={[
                      { value: 'Semua', label: 'Semua Status (Aktif → Tdk Aktif → Belum)' },
                      { value: 'Aktif', label: 'Status Aktif' },
                      { value: 'Tidak Aktif', label: 'Status Tidak Aktif' },
                      { value: 'Belum', label: 'Status Belum' }
                    ]}
                    placeholder="Semua Status"
                  />
                </div>

                <div className="min-w-[180px]">
                  <CustomDropdown
                    id="kenaikan-proses-tahun-masuk"
                    label="Tahun Masuk (TAHUNMASUK)"
                    value={filterProsesTahunMasuk}
                    onChange={(val) => setFilterProsesTahunMasuk(val)}
                    options={[
                      { value: 'Semua', label: 'Semua Tahun Masuk' },
                      ...classUniqueTahunMasuk.map(tm => ({
                        value: tm,
                        label: `Angkatan ${tm}`
                      }))
                    ]}
                    placeholder="Semua Tahun Masuk"
                    searchable={classUniqueTahunMasuk.length > 5}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={triggerPrint}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end"
                  title="Cetak Formulir Keputusan Kenaikan Kelas"
                >
                  <Printer size={15} />
                  <span>Cetak Form Kenaikan</span>
                </button>

                <div className="w-64">
                  <CustomDropdown
                    id="kenaikan-mass-apply"
                    label="Terapkan Massal Semua Siswa"
                    value={massApplyValue}
                    onChange={(val) => {
                      if (val) {
                        setMassApplyValue(val);
                        handleApplyToAll(val);
                      }
                    }}
                    options={classPromotionOptions.map(opt => ({
                      value: opt.value,
                      label: opt.label
                    }))}
                    placeholder="Pilih Keputusan Massal..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span>DAFTAR SISWA KELAS {selectedClass} - FORMULIR KEPUTUSAN KENAIKAN</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">Total: {classStudents.length} Siswa</span>
            </div>

            <div className="overflow-x-auto min-h-[460px] pb-44">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 pl-4 text-center w-10">No</th>
                    <th className="p-3 text-center w-24">NIS / NISN</th>
                    <th className="p-3 min-w-[180px]">Nama Lengkap Siswa</th>
                    <th className="p-3 text-center w-24">Tahun Masuk</th>
                    <th className="p-3 text-center w-24">Status Saat Ini</th>
                    <th className="p-3 min-w-[240px]">Keputusan Kenaikan / Kelulusan</th>
                    <th className="p-3 min-w-[220px]">Catatan Keputusan</th>
                    <th className="p-3 pr-4 text-center w-28">Hasil Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Users size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Tidak ada data siswa di Kelas {selectedClass}</p>
                        <p className="text-xs text-slate-400 mt-1">Silakan pilih kelas lain atau tambahkan siswa di Data Siswa.</p>
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((s, idx) => {
                      const item = studentDecisions[s.id] || {
                        option: defaultOption,
                        catatan: 'Memenuhi KKM dan Kriteria Kenaikan',
                        tahunMasuk: (s as any).tahunMasuk || '2025'
                      };
                      const decision = item.option;
                      const statusPriority = getStatusPriority(s.status);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 pl-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            <div>{s.nopdkt || s.nis || '-'}</div>
                            <div className="text-[10px] text-slate-400">{s.nisn || '-'}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            <div className="uppercase tracking-tight text-xs">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{s.address || (s as any).alamat || '-'}</div>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="text"
                              value={item.tahunMasuk}
                              onChange={(e) => handleTahunMasukChange(s.id, e.target.value)}
                              placeholder="2025"
                              className="w-20 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                              statusPriority === 1 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : statusPriority === 2
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {s.status || 'Belum Aktif'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="w-56">
                              <CustomDropdown
                                id={`kenaikan-decision-${s.id}`}
                                value={decision.value}
                                onChange={(val) => handleDecisionChange(s.id, val)}
                                options={classPromotionOptions.map(opt => ({
                                  value: opt.value,
                                  label: opt.label
                                }))}
                                placeholder="Pilih Keputusan..."
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.catatan}
                              onChange={(e) => handleCatatanChange(s.id, e.target.value)}
                              placeholder="Catatan hasil rapat kelulusan/kenaikan..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white"
                            />
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl font-black text-xs inline-block shadow-2xs border ${
                              decision.action === 'Naik' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              decision.action === 'Lulus' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              decision.action === 'Tinggal' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              decision.action === 'Pindah' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {decision.action === 'Naik' || decision.action === 'Tinggal' 
                                ? formatClassLabel(decision.targetClass, true) 
                                : decision.targetClass || decision.action}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Warning & Execution Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 max-w-xl">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  Setelah dieksekusi, sistem akan memperbarui kolom <strong>Kelas</strong> & <strong>Status</strong> pada data induk Siswa dan mencatat riwayat lengkap ke <strong>KENAIKAN_KELAS</strong>.
                </p>
              </div>

              <button 
                onClick={handleExecutePromotion}
                disabled={classStudents.length === 0 || isProcessing}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-md shadow-indigo-200 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Menyimpan & Menyinkronkan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Eksekusi Kenaikan ({classStudents.length} Siswa)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT KENAIKAN & KELULUSAN (LENGKAP) */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <History size={18} className="text-indigo-600" />
                  <span>Riwayat Kenaikan Kelas & Kelulusan ({filteredHistory.length} dari {historyList.length} Catatan)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Struktur data terintegrasi sesuai sheet KENAIKAN_KELAS dan KELULUSAN.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Cetak Riwayat Kenaikan Kelas"
                >
                  <Printer size={15} />
                  <span>Cetak Riwayat</span>
                </button>
                <button
                  onClick={handleExportHistoryExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Ekspor Excel</span>
                </button>
                {historyList.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Kosongkan Riwayat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cari Siswa / ID:</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nama, NISN, ID..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <CustomDropdown
                  id="filter-tahun-masuk-riwayat"
                  label="Tahun Masuk (TAHUNMASUK)"
                  value={filterTahunMasuk}
                  onChange={(val) => setFilterTahunMasuk(val)}
                  options={[
                    { value: 'Semua', label: 'Semua Tahun Masuk' },
                    ...uniqueTahunMasuk.map(tm => ({ value: tm, label: `Angkatan ${tm}` }))
                  ]}
                  placeholder="Semua Tahun Masuk"
                  searchable={uniqueTahunMasuk.length > 5}
                />
              </div>

              <div>
                <CustomDropdown
                  id="filter-tahun-ajaran-riwayat"
                  label="Tahun Ajaran"
                  value={filterTahunAjaran}
                  onChange={(val) => setFilterTahunAjaran(val)}
                  options={[
                    { value: 'Semua', label: 'Semua Tahun Ajaran' },
                    ...uniqueTahunAjaran.map(ta => ({ value: ta, label: ta }))
                  ]}
                  placeholder="Semua Tahun Ajaran"
                  searchable={uniqueTahunAjaran.length > 5}
                />
              </div>

              <div>
                <CustomDropdown
                  id="filter-status-kenaikan-riwayat"
                  label="Status Kenaikan"
                  value={filterStatusKenaikan}
                  onChange={(val) => setFilterStatusKenaikan(val)}
                  options={[
                    { value: 'Semua', label: 'Semua Status' },
                    { value: 'Naik', label: 'Naik Kelas' },
                    { value: 'Lulus', label: 'Lulus' },
                    { value: 'Tinggal', label: 'Tinggal / Mengulang' },
                    { value: 'Pindah', label: 'Pindah / Mutasi' },
                    { value: 'Keluar', label: 'Keluar / DO' }
                  ]}
                  placeholder="Semua Status"
                />
              </div>

              <div>
                <CustomDropdown
                  id="filter-kelas-asal-riwayat"
                  label="Kelas Asal"
                  value={filterKelasAsal}
                  onChange={(val) => setFilterKelasAsal(val)}
                  options={[
                    { value: 'Semua', label: 'Semua Kelas Asal' },
                    ...allClasses.map(c => ({ value: c, label: formatClassLabel(c, true) }))
                  ]}
                  placeholder="Semua Kelas Asal"
                  searchable={allClasses.length > 5}
                />
              </div>
            </div>
          </div>

          {/* History Data Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 pl-4 text-center w-10">No</th>
                    <th className="p-3 text-center">KenaikanID</th>
                    <th className="p-3 text-center bg-indigo-50/50">TAHUN MASUK</th>
                    <th className="p-3">Nama Siswa & NISN</th>
                    <th className="p-3 text-center">Kelas Asal</th>
                    <th className="p-3 text-center">Kelas Tujuan</th>
                    <th className="p-3 text-center">T.A & Semester</th>
                    <th className="p-3 text-center">Status Kenaikan</th>
                    <th className="p-3 min-w-[180px]">Catatan Keputusan</th>
                    <th className="p-3 text-center">Tgl Proses</th>
                    <th className="p-3 pr-4 text-center w-10">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-400">
                        <History size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Belum ada riwayat kenaikan kelas yang tercatat</p>
                        <p className="text-xs text-slate-400 mt-1">Lakukan proses eksekusi di tab "1. Proses Kenaikan" untuk mulai menyimpan riwayat.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((h, idx) => (
                      <tr key={h.KenaikanID || idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 pl-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500 font-semibold">{h.KenaikanID}</td>
                        <td className="p-3 text-center font-mono font-black text-indigo-700 bg-indigo-50/30">
                          {h.TAHUNMASUK || '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="uppercase">{h.NamaSiswa}</div>
                          <div className="text-[10px] font-mono text-slate-400 font-normal">NISN: {h.NISN || '-'}</div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-600">{h.KelasAsal}</td>
                        <td className="p-3 text-center font-bold text-indigo-700">{h.KelasTujuan}</td>
                        <td className="p-3 text-center text-slate-600 font-medium">
                          <div>{h.TahunAjaran}</div>
                          <div className="text-[10px] text-slate-400">Sem. {h.Semester}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border ${
                            (h.StatusKenaikan || '').toLowerCase().includes('lulus') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            (h.StatusKenaikan || '').toLowerCase().includes('tinggal') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            (h.StatusKenaikan || '').toLowerCase().includes('pindah') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {h.StatusKenaikan}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 text-xs">{h.CatatanKeputusan || '-'}</td>
                        <td className="p-3 text-center font-mono text-slate-500 text-[11px]">{h.TanggalProses}</td>
                        <td className="p-3 pr-4 text-center">
                          <button
                            onClick={() => handleDeleteHistoryItem(h.KenaikanID)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Catatan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAPITULASI & STATISTIK (TAHUNMASUK, TAHUN AJARAN, STATUS) */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Diproses</span>
              <div className="text-2xl font-black text-slate-900">
                {totalHistoryCount} <span className="text-xs text-slate-500 font-normal">Riwayat</span>
              </div>
              <p className="text-[10px] text-slate-400">Seluruh angkatan & tahun</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Naik Kelas</span>
              <div className="text-2xl font-black text-indigo-600">
                {totalNaikCount} <span className="text-xs text-slate-500 font-normal">Siswa</span>
              </div>
              <p className="text-[10px] text-slate-400">{totalHistoryCount > 0 ? Math.round((totalNaikCount / totalHistoryCount) * 100) : 0}% dari total</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Lulus</span>
              <div className="text-2xl font-black text-emerald-600">
                {totalLulusCount} <span className="text-xs text-slate-500 font-normal">Siswa</span>
              </div>
              <p className="text-[10px] text-slate-400">{totalHistoryCount > 0 ? Math.round((totalLulusCount / totalHistoryCount) * 100) : 0}% dari total</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Tinggal / Remedial</span>
              <div className="text-2xl font-black text-amber-600">
                {totalTinggalCount} <span className="text-xs text-slate-500 font-normal">Siswa</span>
              </div>
              <p className="text-[10px] text-slate-400">{totalHistoryCount > 0 ? Math.round((totalTinggalCount / totalHistoryCount) * 100) : 0}% dari total</p>
            </div>
          </div>

          {/* REKAP TABLE 1: REKAP BERDASARKAN TAHUN MASUK (TAHUNMASUK) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  <span>REKAPITULASI PROMOSI PER TAHUN MASUK (TAHUNMASUK)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Rincian angka kelulusan, kenaikan, tinggal kelas, dan mutasi per angkatan masuk peserta didik.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Cetak Rekapitulasi Kenaikan Kelas"
                >
                  <Printer size={15} />
                  <span>Cetak Rekap Kenaikan</span>
                </button>
                <button
                  onClick={handleExportRekapExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Unduh Rekap Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 pl-4 text-center w-12">No</th>
                    <th className="p-3 font-bold text-indigo-900">Tahun Masuk (TAHUNMASUK)</th>
                    <th className="p-3 text-center font-bold">Total Siswa</th>
                    <th className="p-3 text-center text-indigo-700">Naik Kelas</th>
                    <th className="p-3 text-center text-emerald-700">Lulus</th>
                    <th className="p-3 text-center text-amber-700">Tinggal Kelas</th>
                    <th className="p-3 text-center text-purple-700">Pindah</th>
                    <th className="p-3 text-center text-rose-700">Keluar</th>
                    <th className="p-3 pr-4 text-center font-bold text-slate-900">% Kenaikan / Kelulusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {rekapByTahunMasuk.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400">
                        Belum ada data rekap tahun masuk. Silakan eksekusi promosi terlebih dahulu.
                      </td>
                    </tr>
                  ) : (
                    rekapByTahunMasuk.map((r, idx) => (
                      <tr key={r.tahunMasuk} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 pl-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-black text-indigo-700 font-mono text-sm">
                          Angkatan {r.tahunMasuk}
                        </td>
                        <td className="p-3 text-center font-black text-slate-900">{r.total}</td>
                        <td className="p-3 text-center font-bold text-indigo-600">{r.naik}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{r.lulus}</td>
                        <td className="p-3 text-center font-bold text-amber-600">{r.tinggal}</td>
                        <td className="p-3 text-center font-bold text-purple-600">{r.pindah}</td>
                        <td className="p-3 text-center font-bold text-rose-600">{r.keluar}</td>
                        <td className="p-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${r.persenKenaikan}%` }}
                              />
                            </div>
                            <span className="font-mono font-black text-slate-900">{r.persenKenaikan}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* REKAP TABLE 2: REKAP BERDASARKAN TAHUN AJARAN & SEMESTER */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <span>REKAPITULASI PROMOSI PER TAHUN AJARAN & SEMESTER</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 pl-4 text-center w-12">No</th>
                    <th className="p-3">Tahun Ajaran & Semester</th>
                    <th className="p-3 text-center font-bold">Total Siswa</th>
                    <th className="p-3 text-center text-indigo-700">Naik Kelas</th>
                    <th className="p-3 text-center text-emerald-700">Lulus</th>
                    <th className="p-3 text-center text-amber-700">Tinggal</th>
                    <th className="p-3 pr-4 text-center text-purple-700">Mutasi / Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {rekapByTahunAjaran.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Belum ada riwayat per tahun ajaran.
                      </td>
                    </tr>
                  ) : (
                    rekapByTahunAjaran.map((r, idx) => (
                      <tr key={r.tahunAjaranSemester} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 pl-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{r.tahunAjaranSemester}</td>
                        <td className="p-3 text-center font-black text-slate-900">{r.total}</td>
                        <td className="p-3 text-center font-bold text-indigo-600">{r.naik}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{r.lulus}</td>
                        <td className="p-3 text-center font-bold text-amber-600">{r.tinggal}</td>
                        <td className="p-3 pr-4 text-center font-bold text-purple-600">{r.mutasi}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Signature Footer for Print */}
      <div className="hidden print:flex justify-between items-center pt-8 text-xs">
        <div>
          <p>Mengetahui,</p>
          <p className="mt-12 font-bold">{settings.headmasterName || 'Kepala Sekolah'}</p>
          <p>NIP. {settings.headmasterNip || '-'}</p>
        </div>
        <div className="text-right">
          <p>...................., {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          <p className="mt-12 font-bold">Koordinator Kurikulum & Kesiswaan</p>
          <p>NIP. -</p>
        </div>
      </div>
    </div>
  );
}
