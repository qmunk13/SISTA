import React, { useState, useEffect, useRef } from 'react';
import { db } from '../data/db';
import { Soal, Ujian, HasilUjian, LogUjian, JenisUjian } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { 
  Users, 
  Search, 
  RefreshCw, 
  BookOpen, 
  Key, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Save,
  Play,
  Award,
  Sparkles,
  Lock,
  Copy,
  Activity,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  Database,
  Grid,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Flag,
  Maximize2,
  Send,
  Check,
  AlertTriangle,
  Layers,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend,
  LineChart,
  Line
} from 'recharts';
import { parseCheatLogs } from '../data/cheatLogs';
import { parseHasilUjian } from '../data/hasilUjian';

interface CBTProps {
  user: any;
}

export default function CBT({ user }: CBTProps) {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'bank' | 'ujian' | 'token' | 'proktor' | 'hasil' | 'analisis' | 'log_ujian' | 'rapor' | 'jenis_ujian'>('cbt', 'dashboard');
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [ujianList, setUjianList] = useState<Ujian[]>([]);
  const [hasilList, setHasilList] = useState<HasilUjian[]>([]);
  const [logUjianList, setLogUjianList] = useState<LogUjian[]>([]);
  const [jenisUjianList, setJenisUjianList] = useState<JenisUjian[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [semesterList, setSemesterList] = useState<any[]>([]);

  // Hasil Ujian filters
  const [filterHasilJenisUjian, setFilterHasilJenisUjian] = useState('');
  const [filterHasilSemester, setFilterHasilSemester] = useState('');
  const [filterHasilTahunAjaran, setFilterHasilTahunAjaran] = useState('');
  const [filterHasilKelas, setFilterHasilKelas] = useState('');

  // Log Ujian filters
  const [proktorViewTab, setProktorViewTab] = useState<'monitoring' | 'log_ujian'>('monitoring');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [filterLogJenjang, setFilterLogJenjang] = useState('');
  const [filterLogStatus, setFilterLogStatus] = useState('');
  const [filterLogClass, setFilterLogClass] = useState('');
  const [filterLogExamType, setFilterLogExamType] = useState('');
  const [proktorActiveMode, setProktorActiveMode] = useState<'SEMUA' | 'KECURANGAN'>('SEMUA');

  // Evaluation Matrix & Simulator States
  const [calcSumatif, setCalcSumatif] = useState<number>(80);
  const [calcAsas, setCalcAsas] = useState<number>(75);
  const [calcBobotSumatif, setCalcBobotSumatif] = useState<number>(60); // Default 60%, ranges from 50 to 60
  const [matrixFilterSearch, setMatrixFilterSearch] = useState<string>('');
  const [matrixFilterCat, setMatrixFilterCat] = useState<'ALL' | 'I' | 'II' | 'III'>('ALL');
  const [selectedRaporSiswa, setSelectedRaporSiswa] = useState<string>('');

  // Database CBT Subtab internal states
  const [dbSubTab, setDbSubTab] = useState<'soal' | 'ujian' | 'sync'>('soal');
  const [searchSoal, setSearchSoal] = useState('');
  const [searchUjian, setSearchUjian] = useState('');
  
  // Soal Form State
  const [showSoalForm, setShowSoalForm] = useState(false);
  const [editingSoal, setEditingSoal] = useState<Soal | null>(null);
  const [soalForm, setSoalForm] = useState<Partial<Soal>>({
    idSoal: '', mapel: '', jenjang: 'SMA', kelas: 'X', tipe: 'PILIHAN_GANDA',
    soal: '', a: '', b: '', c: '', d: '', kunci: 'A', bobot: 5
  });

  // Ujian Form State
  const [showUjianForm, setShowUjianForm] = useState(false);
  const [editingUjian, setEditingUjian] = useState<Ujian | null>(null);
  const [ujianForm, setUjianForm] = useState<Partial<Ujian>>({
    idJadwal: '', idUjian: '', mapel: '', jenjang: 'SMA', kelas: 'X',
    tanggal: '', jamMulai: '', jamSelesai: '', durasi: 60, token: 'TK123A', status: 'AKTIF', tahunAjaran: '2026/2027'
  });

  // Jenis Ujian Form State
  const [showJenisUjianForm, setShowJenisUjianForm] = useState(false);
  const [editingJenisUjian, setEditingJenisUjian] = useState<JenisUjian | null>(null);
  const [jenisUjianForm, setJenisUjianForm] = useState<Partial<JenisUjian>>({
    idAsesmen: '', kategori: 'SUMATIF', jenisAsesmen: '', singkatan: '',
    jenjang: 'PAKET C', kelas: '12', semester: 'Ganjil', tahunAjaran: '2026/2027', status: 'AKTIF'
  });

  // Bulk Deactivation States
  const [showBulkDeactivate, setShowBulkDeactivate] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkKelas, setBulkKelas] = useState('');

  // Active Exam state
  const [activeUjian, setActiveUjian] = useState<Ujian | null>(null);
  const [examSoal, setExamSoal] = useState<Soal[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [raguMap, setRaguMap] = useState<Record<string, boolean>>({});
  const [cbtFontSize, setCbtFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);

  // Token state
  const [examToken, setExamToken] = useState('TK889A');
  const [proktorStudents, setProktorStudents] = useState<any[]>([]);
  
  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const siswaList = db.get<any>('siswa');
  const studentUser = siswaList.find((s: any) => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
  const filteredUjianList = user.role === 'SISWA' && studentUser
    ? ujianList.filter((uj: any) => {
        const matchesClass = uj.kelas === studentUser.kelasId || 
                             uj.kelas === 'Semua' ||
                             (studentUser.kelasId && (
                               studentUser.kelasId === uj.kelas ||
                               studentUser.kelasId.replace('A', '') === uj.kelas ||
                               studentUser.kelasId.replace('B', '') === uj.kelas ||
                               studentUser.kelasId.replace('C', '') === uj.kelas
                             ));
        if (!matchesClass) return false;
        const isCompleted = hasilList.some((h: any) => 
          (h.idUjian === uj.idUjian || h.idJadwal === uj.idJadwal) && 
          (h.nisn === studentUser.nisn || h.namaSiswa === user.name)
        );
        return !isCompleted;
      })
    : ujianList;

  useEffect(() => {
    if (user.role === 'SISWA' && activeSubTab !== 'ujian') {
      setActiveSubTab('ujian');
    }
  }, [user.role, activeSubTab]);

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => loadAllData();
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, [activeSubTab]);

  const loadAllData = () => {
    setSoalList(db.get<Soal>('soal'));
    setUjianList(db.get<Ujian>('ujian'));
    const rawHasil = db.get<HasilUjian>('hasil_ujian') || [];
    // Khusus Hasil Ujian Peserta: Jangan masukkan penugasan ke dalam hasil ujian peserta CBT
    const pureHasil = rawHasil.filter((h: any) => {
      const uId = String(h.idUjian || h.UjianID || h.id || '');
      const idH = String(h.idHasil || h.HasilUjianID || '');
      const jAsesmen = String(h.jenisAsesmen || '').toUpperCase();
      const jName = String(h.mapel || h.namaUjian || '').toLowerCase();
      return !(h.isTugas || h.isPenugasan || uId.startsWith('TGS') || idH.includes('TGS') || jAsesmen === 'TUGAS' || jName.startsWith('tugas '));
    });
    setHasilList(pureHasil);
    setLogUjianList(db.get<LogUjian>('log_ujian'));
    setJenisUjianList(db.get<JenisUjian>('jenis_ujian'));
    setKelasList(db.get<any>('kelas') || []);
    setTahunAjaranList(db.get<any>('tahun_ajaran') || []);
    setSemesterList(db.get<any>('semester') || []);
  };

  // --- DATABASE HELPER FUNCTIONS ---

  // Save/Edit Soal
  const handleSaveSoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soalForm.mapel || !soalForm.soal || !soalForm.a || !soalForm.b || !soalForm.c || !soalForm.d) {
      Swal.fire('Error', 'Semua kolom wajib diisi!', 'error');
      return;
    }

    const currentSoalList = db.get<Soal>('soal') || [];
    let updatedList: Soal[];

    if (editingSoal) {
      // Edit mode
      updatedList = currentSoalList.map(s => s.idSoal === editingSoal.idSoal ? { ...s, ...soalForm } as Soal : s);
      Swal.fire('Berhasil', 'Butir soal berhasil diperbarui di database.', 'success');
    } else {
      // Create mode
      const newId = `Q_${Date.now().toString().slice(-6)}`;
      const newSoal: Soal = {
        ...(soalForm as Soal),
        idSoal: newId,
        idUjian: soalForm.idUjian || `UJ_${Date.now().toString().slice(-4)}`
      };
      updatedList = [newSoal, ...currentSoalList];
      Swal.fire('Berhasil', 'Butir soal baru berhasil ditambahkan.', 'success');
    }

    db.set('soal', updatedList);
    setSoalList(updatedList);
    setShowSoalForm(false);
    setEditingSoal(null);
    setSoalForm({
      idSoal: '', mapel: '', jenjang: 'SMA', kelas: 'X', tipe: 'PILIHAN_GANDA',
      soal: '', a: '', b: '', c: '', d: '', kunci: 'A', bobot: 5
    });
  };

  // Delete Soal
  const handleDeleteSoal = (idSoal: string) => {
    Swal.fire({
      title: 'Hapus Soal?',
      text: 'Data butir soal akan dihapus permanen dari database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const currentSoalList = db.get<Soal>('soal') || [];
        const filtered = currentSoalList.filter(s => s.idSoal !== idSoal);
        db.set('soal', filtered);
        setSoalList(filtered);
        Swal.fire('Terhapus', 'Butir soal telah dihapus.', 'success');
      }
    });
  };

  // Save/Edit Jenis Ujian
  const handleSaveJenisUjian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisUjianForm.idAsesmen || !jenisUjianForm.jenisAsesmen || !jenisUjianForm.singkatan) {
      Swal.fire('Error', 'Id Asesmen, Jenis Asesmen, dan Singkatan wajib diisi!', 'error');
      return;
    }

    const currentList = db.get<JenisUjian>('jenis_ujian') || [];
    let updatedList: JenisUjian[];

    if (editingJenisUjian) {
      updatedList = currentList.map(j => j.idAsesmen === editingJenisUjian.idAsesmen ? { ...j, ...jenisUjianForm } as JenisUjian : j);
      Swal.fire('Berhasil', 'Jenis ujian berhasil diperbarui.', 'success');
    } else {
      if (currentList.some(j => j.idAsesmen.toUpperCase() === jenisUjianForm.idAsesmen?.toUpperCase())) {
        Swal.fire('Error', 'Id Asesmen sudah digunakan!', 'error');
        return;
      }
      const newJenis: JenisUjian = {
        ...(jenisUjianForm as JenisUjian),
        idAsesmen: jenisUjianForm.idAsesmen.toUpperCase()
      };
      updatedList = [...currentList, newJenis];
      Swal.fire('Berhasil', 'Jenis ujian baru berhasil ditambahkan.', 'success');
    }

    db.set('jenis_ujian', updatedList);
    setJenisUjianList(updatedList);
    setShowJenisUjianForm(false);
    setEditingJenisUjian(null);
    setJenisUjianForm({
      idAsesmen: '', kategori: 'SUMATIF', jenisAsesmen: '', singkatan: '',
      jenjang: 'PAKET C', kelas: '12', semester: 'Ganjil', tahunAjaran: '2026/2027', status: 'AKTIF'
    });
  };

  // Delete Jenis Ujian
  const handleDeleteJenisUjian = (idAsesmen: string) => {
    Swal.fire({
      title: 'Hapus Jenis Ujian?',
      text: 'Data jenis ujian ini akan dihapus permanen dari database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const currentList = db.get<JenisUjian>('jenis_ujian') || [];
        const filtered = currentList.filter(j => j.idAsesmen !== idAsesmen);
        db.set('jenis_ujian', filtered);
        setJenisUjianList(filtered);
        Swal.fire('Terhapus', 'Jenis ujian telah dihapus.', 'success');
      }
    });
  };

  // Save/Edit Ujian
  const handleSaveUjian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianForm.mapel || !ujianForm.kelas || !ujianForm.tanggal || !ujianForm.jamMulai || !ujianForm.jamSelesai) {
      Swal.fire('Error', 'Semua kolom wajib diisi!', 'error');
      return;
    }

    const currentUjianList = db.get<Ujian>('ujian') || [];
    let updatedList: Ujian[];

    if (editingUjian) {
      // Edit Mode
      updatedList = currentUjianList.map(u => u.idJadwal === editingUjian.idJadwal ? { ...u, ...ujianForm } as Ujian : u);
      Swal.fire('Berhasil', 'Jadwal sesi ujian berhasil diperbarui.', 'success');
    } else {
      // Create Mode
      const randId = Date.now().toString().slice(-4);
      const newUjian: Ujian = {
        ...(ujianForm as Ujian),
        idJadwal: `JDW_${randId}`,
        idUjian: `UJ_${randId}`
      };
      updatedList = [newUjian, ...currentUjianList];
      Swal.fire('Berhasil', 'Jadwal sesi ujian baru berhasil dirilis.', 'success');
    }

    db.set('ujian', updatedList);
    setUjianList(updatedList);
    setShowUjianForm(false);
    setEditingUjian(null);
    setUjianForm({
      idJadwal: '', idUjian: '', mapel: '', jenjang: 'SMA', kelas: 'X',
      tanggal: '', jamMulai: '', jamSelesai: '', durasi: 60, token: 'TK123A', status: 'AKTIF', tahunAjaran: '2026/2027'
    });
  };

  // Delete Ujian
  const handleDeleteUjian = (idJadwal: string) => {
    Swal.fire({
      title: 'Hapus Sesi Ujian?',
      text: 'Menghapus sesi ujian ini juga akan menghapus keikutsertaan proktor.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const currentUjianList = db.get<Ujian>('ujian') || [];
        const filtered = currentUjianList.filter(u => u.idJadwal !== idJadwal);
        db.set('ujian', filtered);
        setUjianList(filtered);
        Swal.fire('Terhapus', 'Sesi ujian berhasil dihapus.', 'success');
      }
    });
  };

  // Bulk Deactivate schedules by date and class
  const handleBulkDeactivate = () => {
    const matchingUjian = ujianList.filter(u => {
      const matchDate = bulkDate ? u.tanggal === bulkDate : true;
      const matchKelas = bulkKelas ? u.kelas === bulkKelas : true;
      return matchDate && matchKelas && u.status === 'AKTIF';
    });

    if (matchingUjian.length === 0) {
      Swal.fire('Info', 'Tidak ditemukan jadwal ujian AKTIF yang cocok dengan kriteria tersebut.', 'info');
      return;
    }

    const isAll = !bulkDate && !bulkKelas;
    const warningText = isAll 
      ? `Apakah Anda yakin ingin menonaktifkan seluruh (${matchingUjian.length}) jadwal ujian aktif yang ada?`
      : `Apakah Anda yakin ingin menonaktifkan ${matchingUjian.length} jadwal ujian sekaligus?`;

    Swal.fire({
      title: isAll ? '⚠️ Nonaktifkan Seluruh Jadwal?' : 'Nonaktifkan Jadwal Masal?',
      text: warningText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: isAll ? 'Ya, Nonaktifkan SEMUA' : 'Ya, Nonaktifkan Semua',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updatedList = ujianList.map(u => {
          const matchDate = bulkDate ? u.tanggal === bulkDate : true;
          const matchKelas = bulkKelas ? u.kelas === bulkKelas : true;
          if (matchDate && matchKelas) {
            return { ...u, status: 'NONAKTIF' } as Ujian;
          }
          return u;
        });

        db.set('ujian', updatedList);
        setUjianList(updatedList);
        Swal.fire('Berhasil', `${matchingUjian.length} Sesi ujian berhasil dinonaktifkan secara masal.`, 'success');
        
        // Reset bulk selectors
        setBulkDate('');
        setBulkKelas('');
        setShowBulkDeactivate(false);
      }
    });
  };

  // Bulk Import/Update Ujian & Token
  const handleBulkImportUjian = (tsvText: string) => {
    try {
      const lines = tsvText.trim().split('\n');
      if (lines.length < 2) {
        Swal.fire('Gagal', 'Format data tidak valid.', 'error');
        return;
      }
      
      const headers = lines[0].split('\t').map(h => h.trim());
      const currentUjianList = db.get<Ujian>('ujian') || [];
      const updatedList = [...currentUjianList];
      let addedCount = 0;
      let updatedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t').map(c => c.trim());
        if (cols.length < 3) continue;

        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = cols[idx] || '';
        });

        const idUjian = row.ID_UJIAN || `UJ_${Date.now()}_${i}`;
        // Map or generate an ID_JADWAL if missing
        const idJadwal = row.ID_JADWAL || `JDW_${idUjian}`;
        const mapel = row.MAPEL || row.NAMA_UJIAN || 'Mata Pelajaran';
        const jenjang = row.JENJANG || 'PAKET C';
        const kelas = row.KELAS || 'XII';
        
        // Date formatting helper
        let tanggal = row.TANGGAL || '';
        if (tanggal.includes('-')) {
          const parts = tanggal.split('-');
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              tanggal = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (parts[0].length === 4) {
              tanggal = `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
          }
        }

        // Time formatting helper
        const formatTime = (timeStr: string) => {
          if (!timeStr) return '08:00';
          const upper = timeStr.toUpperCase();
          const isPM = upper.includes('PM');
          const isAM = upper.includes('AM');
          const cleanTime = upper.replace('AM', '').replace('PM', '').trim();
          const parts = cleanTime.split(':');
          if (parts.length >= 2) {
            let hour = parseInt(parts[0], 10);
            const min = parts[1];
            if (isPM && hour < 12) hour += 12;
            if (isAM && hour === 12) hour = 0;
            return `${hour.toString().padStart(2, '0')}:${min}`;
          }
          return timeStr;
        };

        const jamMulai = formatTime(row.JAM_MULAI);
        const jamSelesai = formatTime(row.JAM_SELESAI);
        const durasi = parseInt(row.DURASI, 10) || 30;
        const token = row.TOKEN || 'KATAR1';
        const status = row.STATUS === 'AKTIF' || row.STATUS === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF';
        const tahunAjaran = row.TAHUN_AJARAN || '2026/2027';

        const newUjian: Ujian = {
          idJadwal,
          idUjian,
          mapel,
          jenjang,
          kelas,
          tanggal,
          jamMulai,
          jamSelesai,
          durasi,
          token,
          status,
          tahunAjaran
        };

        const existingIdx = updatedList.findIndex(u => u.idJadwal === idJadwal || u.idUjian === idUjian);
        if (existingIdx > -1) {
          updatedList[existingIdx] = newUjian;
          updatedCount++;
        } else {
          updatedList.push(newUjian);
          addedCount++;
        }
      }

      db.set('ujian', updatedList);
      setUjianList(updatedList);
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Berhasil',
        html: `Berhasil memproses data ujian:<br/>♻️ <b>${updatedCount}</b> sesi diperbarui (overwrite)<br/>➕ <b>${addedCount}</b> sesi baru ditambahkan.`,
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      Swal.fire('Error', `Gagal memproses data: ${err.message}`, 'error');
    }
  };

  // Bulk Import Log Aktivitas & Kecurangan
  const handleBulkImportLogs = (tsvText: string) => {
    try {
      const parsed = parseCheatLogs(tsvText);
      if (parsed.length === 0) {
        Swal.fire('Gagal', 'Format data tidak valid atau kosong.', 'error');
        return;
      }
      
      const currentLogs = db.get<LogUjian>('log_ujian') || [];
      const updatedList = [...currentLogs];
      let addedCount = 0;
      let updatedCount = 0;

      parsed.forEach((newLog) => {
        const existingIdx = updatedList.findIndex(l => l.id === newLog.id || (l.nisn === newLog.nisn && l.waktu === newLog.waktu));
        if (existingIdx > -1) {
          updatedList[existingIdx] = { ...updatedList[existingIdx], ...newLog };
          updatedCount++;
        } else {
          updatedList.push(newLog);
          addedCount++;
        }
      });

      db.set('log_ujian', updatedList);
      setLogUjianList(updatedList);
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Log Berhasil',
        html: `Berhasil memproses log aktivitas:<br/>♻️ <b>${updatedCount}</b> log diperbarui (overwrite)<br/>➕ <b>${addedCount}</b> log baru ditambahkan.`,
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      Swal.fire('Error', `Gagal memproses data log: ${err.message}`, 'error');
    }
  };

  // Bulk Import Hasil Ujian
  const handleBulkImportHasilUjian = (tsvText: string) => {
    try {
      const parsed = parseHasilUjian(tsvText);
      if (parsed.length === 0) {
        Swal.fire('Gagal', 'Format data tidak valid atau kosong.', 'error');
        return;
      }

      const currentHasil = db.get<HasilUjian>('hasil_ujian') || [];
      const updatedList = [...currentHasil];
      let addedCount = 0;
      let updatedCount = 0;

      parsed.forEach((newHasil) => {
        const existingIdx = updatedList.findIndex(h => h.id === newHasil.id || (h.nisn === newHasil.nisn && h.idUjian === newHasil.idUjian));
        if (existingIdx > -1) {
          updatedList[existingIdx] = { ...updatedList[existingIdx], ...newHasil };
          updatedCount++;
        } else {
          updatedList.push(newHasil);
          addedCount++;
        }
      });

      db.set('hasil_ujian', updatedList);
      setHasilList(updatedList);
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Hasil Ujian Berhasil',
        html: `Berhasil memproses hasil ujian ASAS:<br/>♻️ <b>${updatedCount}</b> hasil diperbarui (overwrite)<br/>➕ <b>${addedCount}</b> hasil baru ditambahkan.`,
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      Swal.fire('Error', `Gagal memproses data hasil ujian: ${err.message}`, 'error');
    }
  };

  // Reset to Default Template Data
  const handleResetCbtDb = () => {
    Swal.fire({
      title: 'Reset Database CBT?',
      text: 'Tindakan ini akan mengembalikan database bank soal & jadwal ke format template standar awal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Ya, Reset Format'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const seedSoal: Soal[] = [
          {
            idSoal: 'Q_001', idUjian: 'UJ_001', mapel: 'Pendidikan Agama Islam', jenjang: 'SMA', kelas: 'XI', tipe: 'PILIHAN_GANDA',
            soal: 'Di bawah ini yang merupakan salah satu sifat wajib bagi rasul Allah SWT adalah...',
            a: 'Amanah', b: 'Khianat', c: 'Kizib', d: 'Jahlun', kunci: 'A', bobot: 20
          },
          {
            idSoal: 'Q_002', idUjian: 'UJ_001', mapel: 'Pendidikan Agama Islam', jenjang: 'SMA', kelas: 'XI', tipe: 'PILIHAN_GANDA',
            soal: 'Kitab Al-Qur\'an diturunkan kepada Nabi Muhammad SAW pada malam lailatul qadar di bulan...',
            a: 'Syawal', b: 'Ramadhan', c: 'Muharram', d: 'Rabiul Awwal', kunci: 'B', bobot: 20
          },
          {
            idSoal: 'Q_003', idUjian: 'UJ_002', mapel: 'Matematika Peminatan', jenjang: 'SMA', kelas: 'XI', tipe: 'PILIHAN_GANDA',
            soal: 'Berapakah hasil turunan pertama dari fungsi f(x) = 3x^2 + 5x - 7?',
            a: 'f\'(x) = 6x + 5', b: 'f\'(x) = 3x + 5', c: 'f\'(x) = 6x^2 + 5', d: 'f\'(x) = 6x - 7', kunci: 'A', bobot: 25
          },
          {
            idSoal: 'Q_004', idUjian: 'UJ_002', mapel: 'Matematika Peminatan', jenjang: 'SMA', kelas: 'XI', tipe: 'PILIHAN_GANDA',
            soal: 'Tentukan himpunan penyelesaian sin(x) = 0.5 untuk rentang 0 <= x <= 180 derajat.',
            a: '{30, 150}', b: '{30, 90}', c: '{45, 135}', d: '{60, 120}', kunci: 'A', bobot: 25
          }
        ];

        const seedUjian: Ujian[] = [
          { idJadwal: 'JDW_001', idUjian: 'UJ_001', mapel: 'Pendidikan Agama Islam', jenjang: 'SMA', kelas: 'XI', tanggal: '2026-07-20', jamMulai: '08:00', jamSelesai: '09:30', durasi: 90, token: 'TK889A', status: 'AKTIF', tahunAjaran: '2026/2027' },
          { idJadwal: 'JDW_002', idUjian: 'UJ_002', mapel: 'Matematika Peminatan', jenjang: 'SMA', kelas: 'XI', tanggal: '2026-07-21', jamMulai: '10:00', jamSelesai: '11:30', durasi: 90, token: 'TK889A', status: 'AKTIF', tahunAjaran: '2026/2027' }
        ];

        db.set('soal', seedSoal);
        db.set('ujian', seedUjian);
        setSoalList(seedSoal);
        setUjianList(seedUjian);
        Swal.fire('Database Direset', 'Database CBT telah diisi dengan data template standar.', 'success');
      }
    });
  };

  // Export to CSV helper
  const handleExportCSV = (type: 'soal' | 'ujian' | 'hasil') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `CBT_${type}_export.csv`;

    if (type === 'soal') {
      headers = ['idSoal', 'idUjian', 'mapel', 'jenjang', 'kelas', 'tipe', 'soal', 'a', 'b', 'c', 'd', 'kunci', 'bobot'];
      const data = db.get<Soal>('soal') || [];
      rows = data.map(s => [
        s.idSoal, s.idUjian || '', s.mapel, s.jenjang, s.kelas, s.tipe,
        s.soal.replace(/"/g, '""'), s.a.replace(/"/g, '""'), s.b.replace(/"/g, '""'),
        s.c.replace(/"/g, '""'), s.d.replace(/"/g, '""'), s.kunci || '', String(s.bobot)
      ]);
    } else if (type === 'ujian') {
      headers = ['idJadwal', 'idUjian', 'mapel', 'jenjang', 'kelas', 'tanggal', 'jamMulai', 'jamSelesai', 'durasi', 'token', 'status', 'tahunAjaran'];
      const data = db.get<Ujian>('ujian') || [];
      rows = data.map(u => [
        u.idJadwal, u.idUjian, u.mapel, u.jenjang, u.kelas, u.tanggal,
        u.jamMulai, u.jamSelesai, String(u.durasi), u.token, u.status, u.tahunAjaran
      ]);
    } else {
      headers = ['id', 'idUjian', 'mapel', 'kelas', 'nisn', 'namaSiswa', 'nilaiMentah', 'nilaiAkhir', 'benar', 'salah', 'status', 'tanggal', 'tahunAjaran', 'idAsesmen', 'jenisAsesmen', 'semester'];
      const data = db.get<HasilUjian>('hasil_ujian') || [];
      rows = data.map(h => [
        h.id, h.idUjian, h.mapel, h.kelas, h.nisn, h.namaSiswa,
        String(h.nilaiMentah), String(h.nilaiAkhir), String(h.benar), String(h.salah), h.status, h.tanggal, h.tahunAjaran,
        h.idAsesmen || '', h.jenisAsesmen || '', h.semester || ''
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire('Ekspor Berhasil', `File ${filename} siap diunduh.`, 'success');
  };

  // CSV Import handler
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          Swal.fire('Gagal', 'File CSV kosong atau tidak valid!', 'error');
          return;
        }

        // Simple CSV parser
        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        const importedSoals: Soal[] = [];

        for (let i = 1; i < lines.length; i++) {
          const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
          const matches = lines[i].match(regex) || [];
          const cleanCols = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

          if (cleanCols.length < 6) continue;

          const rowData: any = {};
          headers.forEach((h, idx) => {
            if (cleanCols[idx] !== undefined) {
              rowData[h] = cleanCols[idx];
            }
          });

          const mapel = rowData.mapel || 'Mata Pelajaran Umum';
          const soalText = rowData.soal || '';
          const a = rowData.a || '';
          const b = rowData.b || '';
          const c = rowData.c || '';
          const d = rowData.d || '';
          const kunci = (rowData.kunci || 'A').toUpperCase();
          const bobot = parseInt(rowData.bobot || '5') || 5;

          if (!soalText || !a || !b) continue;

          importedSoals.push({
            idSoal: rowData.idSoal || `Q_IMP_${Date.now().toString().slice(-4)}_${i}`,
            idUjian: rowData.idUjian || `UJ_IMP_${Date.now().toString().slice(-4)}`,
            mapel,
            jenjang: rowData.jenjang || 'SMA',
            kelas: rowData.kelas || 'XI',
            tipe: rowData.tipe || 'PILIHAN_GANDA',
            soal: soalText,
            a, b, c, d, kunci, bobot
          });
        }

        if (importedSoals.length === 0) {
          Swal.fire('Info', 'Tidak ada baris data soal valid yang diimpor.', 'info');
          return;
        }

        const currentSoalList = db.get<Soal>('soal') || [];
        const combined = [...importedSoals, ...currentSoalList];
        db.set('soal', combined);
        setSoalList(combined);

        Swal.fire('Impor Berhasil', `Berhasil mengimpor <b>${importedSoals.length}</b> butir soal baru ke database CBT.`, 'success');
      } catch (err: any) {
        Swal.fire('Error', `Gagal memproses file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkUpdateSoalDialog = () => {
    return;
    const defaultPasteData = `idSoal,idUjian,mapel,jenjang,kelas,tipe,soal,a,b,c,d,kunci,bobot
Q_001,UJ_001,Pendidikan Agama Islam,PAKET C,XII,PILIHAN_GANDA,Bagaimana integrasi nilai ketuhanan dalam andragogi kesetaraan?,Dengan toleransi dan akhlak mulia,Dengan memisahkannya,Dengan melupakan teori,Dengan hafalan kaku,A,25
Q_002,UJ_001,Pendidikan Agama Islam,PAKET B,IX,PILIHAN_GANDA,Apa pengertian iman menurut istilah syar'i kesetaraan?,Keyakinan hati diucapkan lisan diamalkan perbuatan,Sekadar ucapan di bibir,Pikiran logis semata,Tradisi leluhur,A,25
Q_003,UJ_002,Matematika Peminatan,PAKET C,XII,PILIHAN_GANDA,Berapakah nilai limit fungsi x mendekati 0 dari sin(x)/x?,1,0,Tak hingga,2,A,25
Q_004,UJ_002,Matematika Peminatan,PAKET B,IX,PILIHAN_GANDA,Selesaikan persamaan kuadrat x^2 - 5x + 6 = 0.,{2, 3},{1, 6},{-2, -3},{3, 4},A,25
Q_005,UJ_003,Bahasa Indonesia,PAKET C,XII,PILIHAN_GANDA,Manakah yang merupakan ciri karya ilmiah menurut Permendikdasmen?,Objektif dan sistematis,Bahasa bebas,Penuh metafora,Berpihak satu sisi,A,25
Q_006,UJ_003,Bahasa Indonesia,PAKET A,VI,PILIHAN_GANDA,Tentukan gagasan pokok dari paragraf deduktif.,Gagasan di awal paragraf,Gagasan di akhir,Gagasan tersirat,Gagasan di tengah,A,25`;

    Swal.fire({
      title: '🛠️ Bulk Update Bank Soal (Paste Data 16 Juli)',
      html: `
        <div class="text-left space-y-2">
          <p class="text-xs text-slate-500">Pilah & tiban (overwrite) butir soal yang sudah ada berdasarkan ID untuk menjamin kecocokan jenjang master & pemetaan ujian baru.</p>
          <textarea id="bulkPasteText" class="w-full h-48 p-2 font-mono text-[10px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Paste CSV/TSV data here...">${defaultPasteData}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Proses Sinkronisasi',
      confirmButtonColor: '#2563eb',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const text = (document.getElementById('bulkPasteText') as HTMLTextAreaElement).value;
        if (!text || text.trim().length === 0) {
          Swal.showValidationMessage('Data paste tidak boleh kosong!');
        }
        return text;
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        try {
          const text = result.value;
          const lines = text.split('\\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          if (lines.length < 2) {
            Swal.fire('Gagal', 'Format data tidak valid.', 'error');
            return;
          }

          const headers = lines[0].split(',').map((h: string) => h.replace(/^["']|["']$/g, '').trim());
          const currentSoals = db.get<Soal>('soal') || [];
          let updatedCount = 0;
          let addedCount = 0;

          const updatedList = [...currentSoals];

          for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            const regex = /(".*?"|[^",\\s]+)(?=\\s*,|\\s*$)/g;
            const matches = row.match(regex) || [];
            const cleanCols = matches.map((m: string) => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

            if (cleanCols.length < 6) continue;

            const rowData: any = {};
            headers.forEach((h: string, idx: number) => {
              if (cleanCols[idx] !== undefined) {
                rowData[h] = cleanCols[idx];
              }
            });

            const idSoal = rowData.idSoal || `Q_BULK_\${Date.now()}_\${i}`;
            const mapel = rowData.mapel || 'Mata Pelajaran';
            const jenjang = rowData.jenjang || 'PAKET C';
            const kelas = rowData.kelas || 'XII';
            const tipe = rowData.tipe || 'PILIHAN_GANDA';
            const soal = rowData.soal || '';
            const a = rowData.a || '';
            const b = rowData.b || '';
            const c = rowData.c || '';
            const d = rowData.d || '';
            const kunci = (rowData.kunci || 'A').toUpperCase();
            const bobot = parseInt(rowData.bobot || '5') || 5;

            if (!soal) continue;

            const newSoal: Soal = {
              idSoal,
              idUjian: rowData.idUjian || 'UJ_001',
              mapel,
              jenjang,
              kelas,
              tipe,
              soal,
              a, b, c, d, kunci, bobot
            };

            const existingIdx = updatedList.findIndex(s => s.idSoal === idSoal);
            if (existingIdx > -1) {
              updatedList[existingIdx] = newSoal;
              updatedCount++;
            } else {
              updatedList.push(newSoal);
              addedCount++;
            }
          }

          db.set('soal', updatedList);
          setSoalList(updatedList);

          Swal.fire({
            icon: 'success',
            title: 'Sinkronisasi Berhasil',
            html: `Berhasil memproses bulk update data:<br/>♻️ <b>\${updatedCount}</b> butir soal ditiban (overwrite)<br/>➕ <b>\${addedCount}</b> butir soal baru ditambahkan.`,
            confirmButtonColor: '#2563eb'
          });
        } catch (err: any) {
          Swal.fire('Error', `Gagal mengurai data: \${err.message}`, 'error');
        }
      }
    });
  };

  const handleStartExam = (uj: Ujian) => {
    // Prompt for exam token
    Swal.fire({
      title: 'Masukkan Token Ujian',
      input: 'text',
      inputPlaceholder: 'Contoh: TK889A',
      showCancelButton: true,
      confirmButtonText: 'Verifikasi Token & Mulai',
      confirmButtonColor: '#3b82f6',
      preConfirm: (value: string) => {
        const entered = value ? value.trim().toUpperCase() : '';
        const allowedTokens = [
          examToken.toUpperCase(),
          (uj.token || '').toUpperCase()
        ].filter(Boolean);

        if (!entered || !allowedTokens.includes(entered)) {
          Swal.showValidationMessage('Token Ujian tidak valid!');
        }
      }
    }).then((tokenResult: any) => {
      if (tokenResult.isConfirmed) {
        Swal.fire({
          title: 'Mulai Ujian?',
          text: `Ujian ${uj.mapel} akan dimulai. Pastikan koneksi stabil.`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Mulai',
          confirmButtonColor: '#3b82f6'
        }).then((res: any) => {
          if (res.isConfirmed) {
            // Fetch exam questions
            const allSoal = db.get<Soal>('soal');
            const filtered = allSoal.filter(s => s.mapel === uj.mapel);
            
            if (filtered.length === 0) {
              Swal.fire('Gagal', 'Tidak ada soal dalam bank soal untuk pelajaran ini.', 'error');
              return;
            }

            setExamSoal(filtered);
            setActiveUjian(uj);
            setAnswers({});
            setViolations(0);
            setTimeLeft(uj.durasi * 60);
            setActiveQuestionIdx(0);
            setRaguMap({});
            setIsSubmitConfirmOpen(false);
            setIsMobilePaletteOpen(false);

            // Alert full-screen instructions
            Swal.fire({
              title: 'Perhatian!',
              text: 'Jangan meninggalkan halaman ujian, berganti tab, atau screenshot. Pelanggaran berulang akan otomatis men-submit jawaban Anda.',
              icon: 'warning',
              confirmButtonColor: '#3b82f6'
            });
          }
        });
      }
    });
  };

  const isSubmittingExamRef = useRef(false);
  const activeQuestionIdxRef = useRef(activeQuestionIdx);
  activeQuestionIdxRef.current = activeQuestionIdx;
  const examSoalRef = useRef(examSoal);
  examSoalRef.current = examSoal;

  useEffect(() => {
    if (!activeUjian) {
      if (timerRef.current) clearInterval(timerRef.current);
      isSubmittingExamRef.current = false;
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeUjian]);

  // Anti-cheat simulation (simulated focus out)
  useEffect(() => {
    const handleBlur = () => {
      if (activeUjian) {
        setViolations(v => {
          const next = v + 1;
          Swal.fire({
            title: 'Peringatan Pelanggaran!',
            html: `Anda dideteksi berpindah halaman/tab. Pelanggaran: <b class="text-rose-500">${next} / 3</b>`,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
          if (next >= 3) {
            handleSubmitExam();
          }
          return next;
        });
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeUjian]);

  const handleSelectAnswer = (soalId: string, char: string) => {
    setAnswers(prev => ({ ...prev, [soalId]: char }));
  };

  useEffect(() => {
    if (!activeUjian) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
        return;
      }

      const currentSoalList = examSoalRef.current;
      if (!currentSoalList || currentSoalList.length === 0) return;

      const currentIdx = activeQuestionIdxRef.current;
      const currentQ = currentSoalList[currentIdx];
      const qId = currentQ?.idSoal || `soal_${currentIdx}`;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveQuestionIdx(prev => Math.min(currentSoalList.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveQuestionIdx(prev => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setRaguMap(prev => ({ ...prev, [qId]: !prev[qId] }));
      } else {
        const keyMap: Record<string, string> = {
          a: 'A', b: 'B', c: 'C', d: 'D', e: 'E',
          '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
        };
        const mapped = keyMap[e.key.toLowerCase()];
        if (mapped) {
          e.preventDefault();
          handleSelectAnswer(qId, mapped);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeUjian]);

  const handleSubmitExam = (force: boolean = false) => {
    if (!activeUjian || isSubmittingExamRef.current) return;

    // Strict Rule: Siswa ketika mengerjakan soal harus semua terisi jawaban tidak bisa langsung submit
    if (!force) {
      const unanswered = examSoal.filter(s => {
        if (!s) return false;
        const sId = s.idSoal || '';
        return !sId || !answers[sId] || String(answers[sId]).trim() === '';
      });
      if (unanswered.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Lembar Jawaban Belum Lengkap!',
          html: `
            <div class="text-left text-xs space-y-2">
              <p>Sesuai aturan ujian sekolah, <b>seluruh butir soal wajib terisi jawaban</b> dan tidak dapat langsung disubmit jika masih ada yang kosong.</p>
              <p class="text-rose-600 font-bold">Masih terdapat <b>${unanswered.length} butir soal</b> yang belum Anda jawab.</p>
              <p class="text-slate-500">Silakan lengkapi seluruh butir soal sebelum mengumpulkan ujian.</p>
            </div>
          `,
          confirmButtonColor: '#0284c7',
          confirmButtonText: 'Lengkapi Jawaban Sekarang'
        });
        return;
      }
    }

    isSubmittingExamRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    Swal.fire({
      title: 'Menyimpan Jawaban...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.close();

      // Calculate score
      let correct = 0;
      let wrong = 0;
      let score = 0;

      examSoal.forEach(s => {
        if (!s) return;
        const sId = s.idSoal || '';
        const studentAns = sId ? (answers[sId] || '') : '';
        if (s.kunci && studentAns === s.kunci) {
          correct++;
          score += (s.bobot || 0);
        } else {
          wrong++;
        }
      });

      const maxScore = examSoal.reduce((acc, s) => acc + (s?.bobot || 0), 0);
      const nilaiMentah = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const penalty = violations * 5;
      const nilaiAkhir = Math.max(0, nilaiMentah - penalty);

      const status = violations >= 3 ? 'REMEDIAL' : (nilaiAkhir >= 65 ? 'LULUS' : 'TIDAK TUNTAS');

      const idUjUpper = (activeUjian.idUjian || '').toUpperCase();
      let jenisAsesmen = 'ASAS';
      if (idUjUpper.includes('ASTS')) jenisAsesmen = 'ASTS';
      else if (idUjUpper.includes('ASAS')) jenisAsesmen = 'ASAS';
      else if (idUjUpper.includes('ASAJ')) jenisAsesmen = 'ASAJ';
      else if (idUjUpper.includes('AFM') || idUjUpper.includes('FM')) jenisAsesmen = 'AFM';

      const activeSem = (localStorage.getItem('ERP_active_semester') || 'GANJIL').toUpperCase();
      const semester = activeSem === 'GENAP' ? 'Genap' : 'Ganjil';

      const newHasil: HasilUjian = {
        id: `HSL_${Date.now().toString().slice(-4)}`,
        idUjian: activeUjian.idUjian,
        idJadwal: activeUjian.idJadwal,
        mapel: activeUjian.mapel,
        kelas: activeUjian.kelas,
        nisn: studentUser?.nisn || user.username || '2024001',
        namaSiswa: user.name,
        nilaiMentah,
        nilaiAkhir,
        benar: correct,
        salah: wrong,
        totalSoal: examSoal.length,
        pelanggaran: violations,
        status,
        tanggal: new Date().toISOString().slice(0, 10),
        durasi: `${activeUjian.durasi - Math.ceil(timeLeft / 60)} Menit`,
        tahunAjaran: activeUjian.tahunAjaran || '2026/2027',
        semester,
        jenjang: activeUjian.jenjang || '',
        idAsesmen: activeUjian.idUjian,
        jenisAsesmen
      };

      db.insert<any>('hasil_ujian', newHasil);

      Swal.fire({
        icon: 'success',
        title: 'Ujian Selesai!',
        html: `
          <div class="text-left space-y-2 text-sm leading-relaxed p-4 bg-slate-50 border rounded-2xl">
            <p>💯 Nilai Mentah: <b>${nilaiMentah}</b></p>
            <p>⚠️ Pelanggaran: <b>${violations}</b></p>
            <p>🏆 Nilai Akhir: <b class="text-blue-600 text-lg">${nilaiAkhir}</b></p>
            <p>📜 Status: <b class="text-emerald-600">${status}</b></p>
          </div>
        `,
        confirmButtonText: 'Selesai',
        confirmButtonColor: '#3b82f6'
      });

      setActiveUjian(null);
      setActiveSubTab('hasil');
    }, 1500);
  };

  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setExamToken(rand);
    Swal.fire('Token Dirilis', `Token baru untuk KBM Ujian: <b>${rand}</b>`, 'success');
  };

  const handleGenerateBulkLogs = () => {
    Swal.fire({
      title: 'Generasi 100+ Log Aktif?',
      text: 'Sistem akan otomatis menghasilkan 100+ entri log aktivitas & kecurangan baru untuk seluruh daftar siswa aktif di database.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Ya, Generasikan',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: 'Memproses Generasi...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        setTimeout(() => {
          const siswaList = db.get<any>('siswa') || [];
          const currentLogs = db.get<LogUjian>('log_ujian') || [];
          const newGeneratedLogs: LogUjian[] = [];

          if (siswaList.length === 0) {
            Swal.fire('Error', 'Daftar siswa kosong. Mohon sinkronkan master data terlebih dahulu.', 'error');
            return;
          }

          siswaList.forEach((s: any, idx: number) => {
            const nisn = s.nisn;
            const nama = s.nama;
            const baseClass = s.kelasId || 'C12';
            
            // Log 1: Mulai Ujian (Sesi KBM Ujian)
            const hour1 = 7 + (idx % 3);
            const min1 = 10 + (idx % 45);
            const sec1 = 10 + (idx % 50);
            const time1 = `16/07/2026 ${hour1.toString().padStart(2, '0')}:${min1.toString().padStart(2, '0')}:${sec1.toString().padStart(2, '0')}`;
            
            newGeneratedLogs.push({
              id: `LOG-GEN-A-${Date.now()}-${idx}`,
              nisn,
              namaSiswa: nama,
              jenjang: baseClass.startsWith('A') ? 'PAKET A' : baseClass.startsWith('B') ? 'PAKET B' : 'PAKET C',
              kelas: baseClass.replace(/[A-Z]/g, '') || '12',
              status: 'MULAI',
              waktu: time1,
              pelanggaran: 0,
              token: 'KATAR1',
              idJadwal: `JDW-0${81 + (idx % 3)}`
            });

            // Log 2: Mengerjakan / Kecurangan (Setiap siswa ke-6 terdeteksi curang, ke-12 di-block)
            const isCurang = idx % 6 === 0;
            const isBlock = idx % 12 === 0;
            
            if (isCurang || isBlock) {
              const hour2 = hour1 + 1;
              const min2 = (min1 + 15) % 60;
              const time2 = `16/07/2026 ${hour2.toString().padStart(2, '0')}:${min2.toString().padStart(2, '0')}:${sec1.toString().padStart(2, '0')}`;
              
              newGeneratedLogs.push({
                id: `LOG-GEN-B-${Date.now()}-${idx}`,
                nisn,
                namaSiswa: nama,
                jenjang: baseClass.startsWith('A') ? 'PAKET A' : baseClass.startsWith('B') ? 'PAKET B' : 'PAKET C',
                kelas: baseClass.replace(/[A-Z]/g, '') || '12',
                status: isBlock ? 'BLOCK' : 'DETEKSI CURANG',
                waktu: time2,
                pelanggaran: isBlock ? 3 : (idx % 2 === 0 ? 1 : 2),
                token: 'KATAR1',
                idJadwal: `JDW-0${81 + (idx % 3)}`
              });
            } else {
              // Sukses Tuntas
              const hour3 = hour1 + 1;
              const min3 = (min1 + 25) % 60;
              const time3 = `16/07/2026 ${hour3.toString().padStart(2, '0')}:${min3.toString().padStart(2, '0')}:${sec1.toString().padStart(2, '0')}`;
              
              newGeneratedLogs.push({
                id: `LOG-GEN-C-${Date.now()}-${idx}`,
                nisn,
                namaSiswa: nama,
                jenjang: baseClass.startsWith('A') ? 'PAKET A' : baseClass.startsWith('B') ? 'PAKET B' : 'PAKET C',
                kelas: baseClass.replace(/[A-Z]/g, '') || '12',
                status: idx % 2 === 0 ? '✅ LULUS' : '⭐ TUNTAS',
                waktu: time3,
                pelanggaran: 0,
                token: 'KATAR1',
                idJadwal: `JDW-0${81 + (idx % 3)}`
              });
            }
          });

          // Prepend new logs
          const combined = [...newGeneratedLogs, ...currentLogs];
          db.set('log_ujian', combined);
          setLogUjianList(combined);
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: 'Generasi Berhasil!',
            html: `Berhasil menambahkan <b>${newGeneratedLogs.length}</b> entri log aktivitas dan kecurangan baru untuk seluruh siswa aktif.`,
            confirmButtonColor: '#4f46e5'
          });
        }, 1200);
      }
    });
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (activeUjian) {
    const totalQuestions = examSoal.length;
    const currentQ = examSoal[activeQuestionIdx] || examSoal[0];
    const currentQId = currentQ?.idSoal || `soal_${activeQuestionIdx}`;
    const answeredCount = Object.keys(answers).length;
    const raguCount = Object.values(raguMap).filter(Boolean).length;
    const unansweredCount = Math.max(0, totalQuestions - answeredCount);

    const currentOptions: { key: string; val?: string }[] = [
      { key: 'A', val: currentQ?.a },
      { key: 'B', val: currentQ?.b },
      { key: 'C', val: currentQ?.c },
      { key: 'D', val: currentQ?.d },
      { key: 'E', val: (currentQ as any)?.e }
    ].filter(o => Boolean(o.val));

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in select-none">
        {/* EXECUTIVE CBT HEADER */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Award size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  CBT KBM UTAMA
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Kelas {activeUjian.kelas || 'Umum'} • {activeUjian.jenjang || 'Paket C'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[220px] sm:max-w-md mt-0.5">
                {activeUjian.mapel} {activeUjian.idUjian ? `(${activeUjian.idUjian})` : ''}
              </h3>
            </div>
          </div>

          {/* Countdown timer */}
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

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Font Resizing */}
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-xl border border-slate-700/80 p-0.5">
              <button
                type="button"
                onClick={() => setCbtFontSize('normal')}
                title="Ukuran Font Standar"
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  cbtFontSize === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setCbtFontSize('large')}
                title="Ukuran Font Sedang"
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  cbtFontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setCbtFontSize('xlarge')}
                title="Ukuran Font Besar"
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  cbtFontSize === 'xlarge' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A+
              </button>
            </div>

            {/* Mobile Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobilePaletteOpen(prev => !prev)}
              className="lg:hidden px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
            >
              <Grid size={15} />
              <span className="hidden sm:inline">Daftar Soal</span>
              <span className="bg-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {answeredCount}/{totalQuestions}
              </span>
            </button>

            {/* Safety Exit Button */}
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: 'Batalkan Ujian?',
                  text: 'Ujian sedang berlangsung. Jika Anda keluar sekarang, progres ujian tidak akan terkirim sebagai nilai akhir.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Ya, Keluar',
                  cancelButtonText: 'Tetap Lanjut Ujian',
                  confirmButtonColor: '#ef4444'
                }).then((res) => {
                  if (res.isConfirmed) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setActiveUjian(null);
                  }
                });
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center transition cursor-pointer"
              title="Keluar dari Ujian"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* WORKSPACE: LEFT MAIN CANVAS + RIGHT QUESTION MATRIX */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
          
          {/* MAIN QUESTION WORK AREA */}
          <main className="flex-1 flex flex-col overflow-hidden">
            
            {/* Scrollable Question Box */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                
                {/* Header in Card */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-black tracking-wide shadow-xs">
                      SOAL NO. {activeQuestionIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      Bobot: {currentQ?.bobot || 5} Poin
                    </span>
                  </div>

                  {/* Ragu Indicator */}
                  {raguMap[currentQId] && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 text-xs font-bold">
                      <Flag size={14} className="fill-amber-500 text-amber-500" />
                      <span>Ragu-Ragu</span>
                    </span>
                  )}
                </div>

                {/* Question text */}
                <div className={`text-slate-900 dark:text-slate-100 font-medium leading-relaxed ${
                  cbtFontSize === 'normal'
                    ? 'text-sm sm:text-base'
                    : cbtFontSize === 'xlarge'
                    ? 'text-lg sm:text-xl'
                    : 'text-base sm:text-lg'
                }`}>
                  {currentQ?.soal}
                </div>

                {/* Option Choice Buttons */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                    <span>Pilihan Jawaban:</span>
                    <span className="text-[11px] font-normal normal-case hidden sm:inline text-slate-400">
                      Tekan huruf <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">A</kbd> - <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">E</kbd> pada keyboard
                    </span>
                  </div>

                  <div className="space-y-3">
                    {currentOptions.map((opt) => {
                      const isSelected = answers[currentQId] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectAnswer(currentQId, opt.key)}
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
                            {opt.key}
                          </span>

                          <span className={`flex-1 leading-relaxed ${
                            cbtFontSize === 'normal'
                              ? 'text-xs sm:text-sm'
                              : cbtFontSize === 'xlarge'
                              ? 'text-base sm:text-lg'
                              : 'text-sm sm:text-base'
                          } ${isSelected ? 'font-bold' : ''}`}>
                            {opt.val}
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

              </div>
            </div>

            {/* Bottom Bar: Prev, Ragu, Next, Submit */}
            <footer className="h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 gap-2">
              <button
                type="button"
                disabled={activeQuestionIdx === 0}
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-2xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Soal Sebelumnya</span>
                <span className="sm:hidden">Sebelumnya</span>
              </button>

              {/* Ragu-Ragu toggle */}
              <button
                type="button"
                onClick={() => setRaguMap(prev => ({ ...prev, [currentQId]: !prev[currentQId] }))}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center gap-2 cursor-pointer shadow-xs ${
                  raguMap[currentQId]
                    ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500 font-black'
                    : 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                }`}
              >
                <Flag size={16} className={raguMap[currentQId] ? 'fill-slate-950 text-slate-950' : 'text-amber-600'} />
                <span>{raguMap[currentQId] ? 'Hapus Ragu-Ragu' : 'Ragu-Ragu'}</span>
              </button>

              {/* Next or Finish */}
              {activeQuestionIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 sm:px-7 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span className="hidden sm:inline">Soal Selanjutnya</span>
                  <span className="sm:hidden">Berikutnya</span>
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  className="px-5 sm:px-7 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Send size={16} />
                  <span>Selesaikan Ujian</span>
                </button>
              )}
            </footer>

          </main>

          {/* DESKTOP QUESTION PALETTE SIDEBAR */}
          <aside className="hidden lg:flex w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                  <Grid size={16} className="text-indigo-600" />
                  <span>Daftar Nomor Soal</span>
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  {answeredCount}/{totalQuestions}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.round((answeredCount / (totalQuestions || 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Progres Terjawab</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {Math.round((answeredCount / (totalQuestions || 1)) * 100)}%
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shrink-0" />
                  <span>Dijawab ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block shrink-0" />
                  <span>Ragu-Ragu ({raguCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 inline-block shrink-0" />
                  <span>Belum ({unansweredCount})</span>
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
                {examSoal.map((q, idx) => {
                  const qId = q.idSoal || `soal_${idx}`;
                  const isAnswered = !!answers[qId];
                  const isRagu = !!raguMap[qId];
                  const isCurrent = activeQuestionIdx === idx;
                  const selectedOpt = answers[qId];

                  return (
                    <button
                      key={qId}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
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
                      {selectedOpt && (
                        <span className="text-[9px] opacity-90 font-mono">
                          {selectedOpt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar submit */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={15} />
                <span>Kumpulkan Jawaban Ujian</span>
              </button>
            </div>
          </aside>

        </div>

        {/* CONFIRMATION MODAL */}
        {isSubmitConfirmOpen && (
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

              {/* Status summary */}
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

              {(unansweredCount > 0 || raguCount > 0) && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold block">Peringatan:</span>
                    Masih ada <span className="font-black">{unansweredCount}</span> soal belum dijawab dan <span className="font-black">{raguCount}</span> bertanda ragu-ragu.
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-center">
                Apakah Anda yakin ingin menyelesaikan ujian ini sekarang? Hasil dan skor akan langsung dihitung.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitConfirmOpen(false)}
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
                      setIsSubmitConfirmOpen(false);
                      handleSubmitExam();
                    }}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} />
                    <span>Ya, Kumpulkan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE PALETTE DRAWER */}
        {isMobilePaletteOpen && (
          <div className="lg:hidden fixed inset-0 z-[65] bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Grid size={16} className="text-indigo-600" />
                  <span>Daftar Nomor Soal</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsMobilePaletteOpen(false)}
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
                  {unansweredCount} Belum
                </div>
              </div>

              {/* 5-col grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-5 gap-2">
                  {examSoal.map((q, idx) => {
                    const qId = q.idSoal || `soal_${idx}`;
                    const isAnswered = !!answers[qId];
                    const isRagu = !!raguMap[qId];
                    const isCurrent = activeQuestionIdx === idx;
                    const selectedOpt = answers[qId];

                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => {
                          setActiveQuestionIdx(idx);
                          setIsMobilePaletteOpen(false);
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
                        {selectedOpt && (
                          <span className="text-[9px] opacity-90 font-mono">
                            {selectedOpt}
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
                  setIsMobilePaletteOpen(false);
                  setIsSubmitConfirmOpen(true);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <Send size={15} />
                <span>Kumpulkan Ujian</span>
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        {[
          { id: 'dashboard', label: 'CBT Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'jenis_ujian', label: 'Jenis Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'rapor', label: 'Rapor Pendidikan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'bank', label: 'Bank Soal', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
          { id: 'ujian', label: 'Jadwal Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'token', label: 'Token Ujian', roles: ['SUPERADMIN', 'ADMIN', 'GURU'] },
          { id: 'proktor', label: 'Pengawasan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
          { id: 'hasil', label: 'Hasil Ujian (Sumatif)', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'analisis', label: 'Analisis Nilai', roles: ['SUPERADMIN', 'ADMIN', 'GURU'] }
        ].filter(tab => !tab.roles || tab.roles.includes(user.role)).map((tab) => (
          <button
            key={tab.id}
            id={`tab-cbt-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all border shrink-0 ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Quick-Access Indicators & Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BookOpen className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Soal Terdaftar</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">{soalList.length} Butir</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><FileCheck className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Sesi Ujian Aktif</span>
                <h4 className="text-xl font-black text-emerald-600 mt-1">
                  {ujianList.filter(u => u.status === 'AKTIF').length || 2} Aktif
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Activity className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Asesmen Formatif (Internal)</span>
                <h4 className="text-xl font-black text-indigo-600 mt-1">1 Kategori</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Award className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Asesmen Sumatif (Rapor)</span>
                <h4 className="text-xl font-black text-amber-600 mt-1">5 Kategori</h4>
              </div>
            </div>
          </div>

          {/* Quick-Access Info Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-500/30">Kemendikdasmen No. 9/2026</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-500/30">Kurikulum Kesetaraan</span>
              </div>
              <h3 className="text-xl font-extrabold mt-2.5">Arsitektur Evaluasi & Ragam Jenis Ujian</h3>
              <p className="text-xs text-blue-100 mt-1 max-w-2xl">Integrasi evaluasi nasional yang menyatukan kemampuan Literasi-Numerasi dengan TKA (Tes Kemampuan Akademik) untuk mengukur capaian akademik mapel spesifik.</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 px-4 py-3 rounded-2xl text-center shrink-0">
              <span className="text-[10px] text-blue-300 font-bold uppercase block">KBM Token Proktor</span>
              <span className="text-xl font-black font-mono tracking-widest text-white">{examToken}</span>
            </div>
          </div>

          {/* Dynamic Evaluation Matrix Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base uppercase">Matriks Asesmen & Pembobotan Rapor</h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter dan telusuri berbagai ragam asesmen untuk penentuan kelulusan & pengisian Rapor PKBM.</p>
              </div>

              {/* Matrix Filter & Categories */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={matrixFilterSearch}
                    onChange={(e) => setMatrixFilterSearch(e.target.value)}
                    placeholder="Cari asesmen/tujuan..."
                    className="pl-8 pr-3 py-1.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                
                {(['ALL', 'I', 'II', 'III'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMatrixFilterCat(cat)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition ${
                      matrixFilterCat === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' && 'Semua Kategori'}
                    {cat === 'I' && 'I. Asesmen Awal'}
                    {cat === 'II' && 'II. Asesmen Formatif'}
                    {cat === 'III' && 'III. Asesmen Sumatif'}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4 w-[25%]">Jenis Ujian / Asesmen</th>
                    <th className="p-4 w-[35%]">Fungsi & Tujuan Utama</th>
                    <th className="p-4 w-[20%]">Jenjang & Sasaran Kelas</th>
                    <th className="p-4 w-[20%]">Pembobotan & Sifat Kontribusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      cat: 'I',
                      jenis: 'Placement Test (Tes Penempatan)',
                      tujuan: 'Mengukur kompetensi akademik awal Siswa baru agar ditempatkan pada tingkatan atau derajat yang sesuai.',
                      kelas: 'Siswa baru: Paket A (Kls 1-6), Paket B (Kls 7-9), Paket C (Kls 10-12)',
                      bobot: '0% (Non-Rapor): Hasil berupa rekomendasi penempatan kelas/fase.',
                      badge: 'bg-blue-50 text-blue-700 border-blue-100'
                    },
                    {
                      cat: 'I',
                      jenis: 'Asesmen Diagnostik Non-Kognitif',
                      tujuan: 'Memetakan profil psikologis, gaya belajar, kesiapan mental, dan latar belakang pekerjaan Siswa nonformal.',
                      kelas: 'Paket A, B, C (Kelas 1-12) - Rutin di awal tahun ajaran baru',
                      bobot: '0% (Non-Rapor): Acuan tutor dalam strategi andragogi (belajar dewasa).',
                      badge: 'bg-blue-50 text-blue-700 border-blue-100'
                    },
                    {
                      cat: 'I',
                      jenis: 'Asesmen Diagnostik Kognitif',
                      tujuan: 'Menguji materi prasyarat atau pengetahuan dasar Siswa sebelum masuk ke pembahasan modul baru.',
                      kelas: 'Paket A, B, C (Kelas 1-12) - Berkala di tiap awal modul baru',
                      bobot: '0% (Non-Rapor): Memetakan kesiapan akademik dasar materi terkait.',
                      badge: 'bg-blue-50 text-blue-700 border-blue-100'
                    },
                    {
                      cat: 'II',
                      jenis: 'Asesmen Formatif Internal Modul',
                      tujuan: 'Memantau perkembangan belajar harian (kuis CBT, tugas mandiri, penilaian performa) untuk umpan balik tutor.',
                      kelas: 'Paket A, B, C (Kelas 1-12) - Berkelanjutan',
                      bobot: '0% (Non-Rapor): Murni perbaikan proses belajar (bukan angka rapor).',
                      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    },
                    {
                      cat: 'III',
                      jenis: 'Sumatif Lingkup Materi (Nilai Akhir Modul)',
                      tujuan: 'Menilai capaian kompetensi Siswa tiap kali merampungkan satu Modul penuh secara terkomputerisasi.',
                      kelas: 'Paket A, B, C (Kelas 1-12) - Tiap penyelesaian satu modul',
                      bobot: '50% s.d. 60% (Bobot Utama Rapor): Rata-rata nilai sumatif per modul.',
                      badge: 'bg-amber-50 text-amber-700 border-amber-100'
                    },
                    {
                      cat: 'III',
                      jenis: 'ASAS (Asesmen Sumatif Akhir Semester)',
                      tujuan: 'Mengukur penguasaan kompetensi atas gabungan seluruh modul selama satu semester berjalan (Semester Ganjil & Genap).',
                      kelas: 'Paket A (Kls 1-6), Paket B (Kls 7-9), Paket C (Kls 10-12)',
                      bobot: '40% s.d. 50% (Bobot Pendamping Rapor): Berkontribusi pada nilai rapor akhir.',
                      badge: 'bg-amber-50 text-amber-700 border-amber-100'
                    },
                    {
                      cat: 'III',
                      jenis: 'ASAJ (Asesmen Sumatif Akhir Jenjang)',
                      tujuan: 'Evaluasi akhir tingkat satuan pendidikan PKBM untuk menentukan kriteria kelulusan sekolah.',
                      kelas: 'Paket A (Kls 6), Paket B (Kls 9), Paket C (Kls 12)',
                      bobot: '100% Nilai Kelulusan Internal: Komponen utama penentu ijazah sekolah.',
                      badge: 'bg-rose-50 text-rose-700 border-rose-100'
                    },
                    {
                      cat: 'III',
                      jenis: 'Asesmen Nasional & TKA (Kemendikdasmen No. 9/2026)',
                      tujuan: 'Pemetaan mutu nasional mengintegrasikan kemampuan literasi-numerasi dengan Tes Kemampuan Akademik (TKA) spesifik.',
                      kelas: 'Paket A (Kls 5), Paket B (Kls 8), Paket C (Kls 11/12)',
                      bobot: '0% Nilai Rapor: Digunakan murni untuk pemetaan mutu & rapor lembaga.',
                      badge: 'bg-purple-50 text-purple-700 border-purple-100'
                    },
                    {
                      cat: 'III',
                      jenis: 'Uji Kesetaraan (UK)',
                      tujuan: 'Asesmen nasional khusus nonformal untuk menerbitkan Sertifikat Hasil Uji Kesetaraan (SHUK) sebagai legalitas penyetaraan.',
                      kelas: 'Paket A (Kls 6), Paket B (Kls 9), Paket C (Kls 12)',
                      bobot: '0% Nilai Rapor: Nilai berdiri sendiri dalam bentuk SHUK nasional.',
                      badge: 'bg-teal-50 text-teal-700 border-teal-100'
                    }
                  ].filter(item => {
                    const matchesCategory = matrixFilterCat === 'ALL' ? true : item.cat === matrixFilterCat;
                    const matchesSearch = matrixFilterSearch === '' ? true : 
                      item.jenis.toLowerCase().includes(matrixFilterSearch.toLowerCase()) || 
                      item.tujuan.toLowerCase().includes(matrixFilterSearch.toLowerCase()) ||
                      item.kelas.toLowerCase().includes(matrixFilterSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-800">{item.jenis}</div>
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border mt-1.5 ${item.badge}`}>
                          Kategori {item.cat}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 leading-relaxed font-semibold">{item.tujuan}</td>
                      <td className="p-4 text-slate-500 font-mono font-bold">{item.kelas}</td>
                      <td className="p-4">
                        <div className="text-blue-700 font-black">{item.bobot.split(':')[0]}</div>
                        <div className="text-slate-400 font-semibold text-[10px] mt-0.5">{item.bobot.substring(item.bobot.indexOf(':') + 1)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Weight Simulator & Regulatory Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Sparkles className="w-4 h-4" /></div>
                <h4 className="font-extrabold text-slate-800 text-sm uppercase">Simulator Pintar Kenaikan Nilai Rapor (Kemendikdasmen No. 9/2026)</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gunakan simulator andragogi ini untuk mensimulasikan nilai rapor akhir berdasarkan regulasi pembobotan Kemendikdasmen. 
                Secara default, kontribusi <strong>Sumatif Lingkup Materi</strong> berbobot <strong>50% - 60%</strong>, dan <strong>ASAS</strong> berbobot <strong>40% - 50%</strong>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600">Rata-rata Sumatif Modul (Rapor)</span>
                      <span className="text-blue-600 font-extrabold">{calcSumatif} / 100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={calcSumatif}
                      onChange={(e) => setCalcSumatif(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600 font-semibold">Nilai Ujian ASAS (Akhir Semester)</span>
                      <span className="text-indigo-600 font-extrabold">{calcAsas} / 100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={calcAsas}
                      onChange={(e) => setCalcAsas(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600">Bobot Sumatif Modul vs ASAS</span>
                      <span className="text-amber-600 font-extrabold">{calcBobotSumatif}% Modul / {100 - calcBobotSumatif}% ASAS</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="60"
                      value={calcBobotSumatif}
                      onChange={(e) => setCalcBobotSumatif(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1 uppercase">
                      <span>Min 50%</span>
                      <span>Max 60%</span>
                    </div>
                  </div>
                </div>

                {/* Score Result Circle Display */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-center items-center text-center space-y-3">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Hasil Simulasi Nilai Akhir Rapor</span>
                  
                  {(() => {
                    const finalScore = Math.round((calcSumatif * calcBobotSumatif + calcAsas * (100 - calcBobotSumatif)) / 100);
                    let grade = 'D';
                    let label = 'Kurang (Remedial)';
                    let color = 'text-rose-600';
                    let bgCircle = 'border-rose-200';

                    if (finalScore >= 85) {
                      grade = 'A';
                      label = 'Sangat Baik (Lulus Memuaskan)';
                      color = 'text-emerald-600';
                      bgCircle = 'border-emerald-200';
                    } else if (finalScore >= 75) {
                      grade = 'B';
                      label = 'Baik (Tuntas Kriteria)';
                      color = 'text-blue-600';
                      bgCircle = 'border-blue-200';
                    } else if (finalScore >= 60) {
                      grade = 'C';
                      label = 'Cukup (Perlu Pendampingan)';
                      color = 'text-amber-600';
                      bgCircle = 'border-amber-200';
                    }

                    return (
                      <>
                        <div className={`w-28 h-28 rounded-full border-4 ${bgCircle} flex flex-col justify-center items-center bg-white shadow-inner`}>
                          <span className={`text-3xl font-black ${color}`}>{finalScore}</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">Predikat {grade}</span>
                        </div>
                        <div>
                          <span className={`text-xs font-extrabold ${color} block`}>{label}</span>
                          <span className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-1 block">
                            Regulasi penilai PKBM: Nilai akhir diperoleh dari penggabungan proporsional sumatif materi dan ujian akhir semester.
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between shadow-sm">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Mekanisme Anti-Curang CBT
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Sistem pengawasan real-time memonitor fokus jendela ujian. Jika siswa berganti tab browser atau memindahkan aplikasi sebanyak lebih dari <strong>3 kali</strong>, ujian akan langsung terkunci secara permanen dan otomatis dikirimkan ke server.
                </p>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl my-4">
                <span className="text-[10px] font-extrabold text-rose-700 block uppercase mb-1">Ambang Batas Toleransi</span>
                <p className="text-xs font-bold text-rose-600">Maksimal Tab Switch: 3 Pelanggaran</p>
                <p className="text-[10px] text-slate-400 mt-1">Lebih dari 3 pelanggaran akan otomatis mengubah status menjadi BLOCK atau DETEKSI CURANG.</p>
              </div>

              <button
                type="button"
                onClick={handleGenerateToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                Rilis Token Ujian Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'bank' && (
        <div className="space-y-6">
          {/* Bank Soal Actions & Search */}
          <div className="bg-white p-5 border rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchSoal}
                onChange={(e) => setSearchSoal(e.target.value)}
                placeholder="Cari butir soal atau mapel..."
                className="w-full pl-9 pr-4 py-2 text-xs border rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => handleExportCSV('soal')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition"
                  title="Ekspor Soal ke CSV"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  Ekspor Soal
                </button>

                <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition cursor-pointer" title="Impor Soal dari CSV">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Impor Soal
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>



                <button
                  type="button"
                  onClick={() => {
                    setEditingSoal(null);
                    setSoalForm({
                      idSoal: '', mapel: '', jenjang: 'SMA', kelas: 'XI', tipe: 'PILIHAN_GANDA',
                      soal: '', a: '', b: '', c: '', d: '', kunci: 'A', bobot: 5
                    });
                    setShowSoalForm(!showSoalForm);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md shadow-blue-600/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  {showSoalForm ? 'Tutup Formulir' : 'Tambah Soal'}
                </button>
              </div>
            )}
          </div>

          {/* Soal CRUD Form */}
          {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && showSoalForm && (
            <form onSubmit={handleSaveSoal} className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in-up">
              <h4 className="font-black text-slate-800 text-sm uppercase">
                {editingSoal ? 'Edit Butir Soal' : 'Formulir Tambah Butir Soal'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={soalForm.mapel || ''}
                    onChange={(e) => setSoalForm({ ...soalForm, mapel: e.target.value })}
                    placeholder="Contoh: Matematika Peminatan"
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jenjang</label>
                  <select
                    value={soalForm.jenjang || 'SMA'}
                    onChange={(e) => setSoalForm({ ...soalForm, jenjang: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kelas</label>
                  <select
                    value={soalForm.kelas || 'XI'}
                    onChange={(e) => setSoalForm({ ...soalForm, kelas: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="VII">VII</option>
                    <option value="VIII">VIII</option>
                    <option value="IX">IX</option>
                    <option value="X">X</option>
                    <option value="XI">XI</option>
                    <option value="XII">XII</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pertanyaan / Soal</label>
                <textarea
                  value={soalForm.soal || ''}
                  onChange={(e) => setSoalForm({ ...soalForm, soal: e.target.value })}
                  placeholder="Ketik deskripsi pertanyaan lengkap di sini..."
                  className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilihan A</label>
                  <input
                    type="text"
                    value={soalForm.a || ''}
                    onChange={(e) => setSoalForm({ ...soalForm, a: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilihan B</label>
                  <input
                    type="text"
                    value={soalForm.b || ''}
                    onChange={(e) => setSoalForm({ ...soalForm, b: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilihan C</label>
                  <input
                    type="text"
                    value={soalForm.c || ''}
                    onChange={(e) => setSoalForm({ ...soalForm, c: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilihan D</label>
                  <input
                    type="text"
                    value={soalForm.d || ''}
                    onChange={(e) => setSoalForm({ ...soalForm, d: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kunci Jawaban</label>
                  <select
                    value={soalForm.kunci || 'A'}
                    onChange={(e) => setSoalForm({ ...soalForm, kunci: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Bobot Nilai</label>
                    <span className="text-[10px] text-blue-600 font-bold">💡 Preset Cerdas (Skor 100):</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={soalForm.bobot || 5}
                    onChange={(e) => setSoalForm({ ...soalForm, bobot: parseFloat(e.target.value) || 5 })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    min="0.1"
                    required
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {[
                      { n: 10, w: 10 },
                      { n: 20, w: 5 },
                      { n: 25, w: 4 },
                      { n: 30, w: 3.33 },
                      { n: 40, w: 2.5 },
                      { n: 50, w: 2 }
                    ].map(p => (
                      <button
                        key={p.n}
                        type="button"
                        onClick={() => setSoalForm({ ...soalForm, bobot: p.w })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                          soalForm.bobot === p.w 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={`${p.n} soal total skor 100`}
                      >
                        {p.n} Soal: {p.w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSoalForm(false);
                    setEditingSoal(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
                >
                  {editingSoal ? 'Simpan Perubahan' : 'Tambah ke Database'}
                </button>
              </div>
            </form>
          )}

          {/* Soal List Table */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b bg-slate-50/50">
              <h4 className="font-black text-slate-800 text-sm uppercase">Total Soal Database ({soalList.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Mata Pelajaran</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">Butir Pertanyaan</th>
                    <th className="p-4 text-center">Kunci</th>
                    <th className="p-4 text-center">Bobot</th>
                    {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                      <th className="p-4 text-center">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {soalList
                    .filter(s => 
                      s && (
                        (s.mapel && s.mapel.toLowerCase().includes(searchSoal.toLowerCase())) || 
                        (s.soal && s.soal.toLowerCase().includes(searchSoal.toLowerCase()))
                      )
                    )
                    .map((s, idx) => (
                      <tr key={s.idSoal || `soal_tr_${idx}`} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-4 text-blue-600 font-bold">{s.mapel}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                            {s.jenjang} - {s.kelas}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-slate-700">{s.soal}</td>
                        <td className="p-4 text-center">
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded font-black">{s.kunci}</span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">{s.bobot}</td>
                        {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSoal(s);
                                  setSoalForm(s);
                                  setShowSoalForm(true);
                                }}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSoal(s.idSoal)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      )}

      {activeSubTab === 'ujian' && (
        <div className="space-y-6">
          {/* Ujian Actions & Search for managers */}
          {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
            <div className="bg-white p-5 border rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in-up">
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchUjian}
                  onChange={(e) => setSearchUjian(e.target.value)}
                  placeholder="Cari sesi ujian..."
                  className="w-full pl-9 pr-4 py-2 text-xs border rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDeactivate(!showBulkDeactivate);
                    setBulkDate('');
                    setBulkKelas('');
                    setShowUjianForm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-rose-600/10 transition-all w-full sm:w-auto justify-center"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {showBulkDeactivate ? 'Tutup Nonaktifkan Masal' : 'Nonaktifkan Masal'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    Swal.fire({
                      title: '📥 Bulk Import Jadwal Ujian & Token',
                      html: `
                        <div class="text-left space-y-2">
                          <p class="text-xs text-slate-500">Tempelkan (Paste) data TSV dari spreadsheet Anda di bawah ini untuk mengimpor atau memperbarui jadwal sesi ujian dan token secara massal.</p>
                          <textarea id="bulkPasteUjianText" class="w-full h-48 p-2 font-mono text-[10px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" placeholder="Paste ID_UJIAN\\tNAMA_UJIAN\\tMAPEL\\t... di sini..."></textarea>
                        </div>
                      `,
                      showCancelButton: true,
                      confirmButtonText: 'Proses Sinkronisasi',
                      confirmButtonColor: '#2563eb',
                      cancelButtonText: 'Batal',
                      preConfirm: () => {
                        const textarea = document.getElementById('bulkPasteUjianText') as HTMLTextAreaElement;
                        const text = textarea ? textarea.value : '';
                        if (!text || text.trim().length === 0) {
                          Swal.showValidationMessage('Data paste tidak boleh kosong!');
                        }
                        return text;
                      }
                    }).then((result: any) => {
                      if (result.isConfirmed) {
                        handleBulkImportUjian(result.value);
                      }
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-all w-full sm:w-auto justify-center"
                >
                  <Database className="w-4 h-4" />
                  Sinkronisasi Masal Ujian
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingUjian(null);
                    setUjianForm({
                      idJadwal: '', idUjian: '', mapel: '', jenjang: 'SMA', kelas: 'XI',
                      tanggal: new Date().toISOString().slice(0, 10), jamMulai: '08:00', jamSelesai: '09:30', durasi: 90, token: 'TK889A', status: 'AKTIF', tahunAjaran: '2026/2027'
                    });
                    setShowUjianForm(!showUjianForm);
                    setShowBulkDeactivate(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-emerald-600/10 transition-all w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  {showUjianForm ? 'Tutup Formulir' : 'Rilis Jadwal Ujian'}
                </button>
              </div>
            </div>
          )}

          {/* Ujian Bulk Deactivate Form */}
          {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && showBulkDeactivate && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in-up">
              <div>
                <h4 className="font-black text-rose-800 text-sm uppercase flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Fitur Nonaktifkan Jadwal Ujian Secara Masal
                </h4>
                <p className="text-[11px] text-rose-600/80 mt-1">
                  Pilih kriteria tanggal dan kelas di bawah ini. Semua jadwal ujian yang saat ini berstatus <strong>AKTIF</strong> yang cocok dengan pilihan Anda akan diubah statusnya menjadi <strong>NONAKTIF</strong> sekaligus.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Berdasarkan Tanggal</label>
                  <select
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-700"
                  >
                    <option value="">-- Semua Tanggal --</option>
                    {Array.from(new Set(ujianList.map(u => u.tanggal).filter(Boolean)))
                      .sort()
                      .map(date => (
                        <option key={date} value={date}>{date}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Berdasarkan Kelas</label>
                  <select
                    value={bulkKelas}
                    onChange={(e) => setBulkKelas(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-700"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {(Array.from(new Set(ujianList.map(u => String(u.kelas || '')).filter(Boolean))) as string[])
                      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                      .map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Show preview count of matched ACTIVE exams */}
              {(() => {
                const matchedCount = ujianList.filter(u => {
                  const matchDate = bulkDate ? u.tanggal === bulkDate : true;
                  const matchKelas = bulkKelas ? u.kelas === bulkKelas : true;
                  return matchDate && matchKelas && u.status === 'AKTIF';
                }).length;

                return (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                    <p className="text-xs font-bold text-slate-600">
                      Jumlah jadwal AKTIF yang cocok: <span className="text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full text-xs font-extrabold">{matchedCount} Sesi</span>
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkDate('');
                          setBulkKelas('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                      >
                        Reset Pilihan
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeactivate}
                        disabled={matchedCount === 0}
                        className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-md transition flex items-center gap-1.5 ${
                          matchedCount > 0 
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' 
                            : 'bg-slate-300 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Nonaktifkan Sekarang
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Ujian CRUD Form */}
          {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && showUjianForm && (
            <form onSubmit={handleSaveUjian} className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in-up">
              <h4 className="font-black text-slate-800 text-sm uppercase">
                {editingUjian ? 'Edit Sesi Jadwal Ujian' : 'Formulir Rilis Jadwal Sesi Ujian'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={ujianForm.mapel || ''}
                    onChange={(e) => setUjianForm({ ...ujianForm, mapel: e.target.value })}
                    placeholder="Contoh: Matematika Peminatan"
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jenjang</label>
                  <select
                    value={ujianForm.jenjang || 'SMA'}
                    onChange={(e) => setUjianForm({ ...ujianForm, jenjang: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kelas</label>
                  <select
                    value={ujianForm.kelas || 'XI'}
                    onChange={(e) => setUjianForm({ ...ujianForm, kelas: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Semua">Semua Kelas</option>
                    <option value="VII">VII</option>
                    <option value="VIII">VIII</option>
                    <option value="IX">IX</option>
                    <option value="X">X</option>
                    <option value="XI">XI</option>
                    <option value="XII">XII</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={ujianForm.tanggal || ''}
                    onChange={(e) => setUjianForm({ ...ujianForm, tanggal: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={ujianForm.jamMulai || ''}
                    onChange={(e) => setUjianForm({ ...ujianForm, jamMulai: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={ujianForm.jamSelesai || ''}
                    onChange={(e) => setUjianForm({ ...ujianForm, jamSelesai: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={ujianForm.durasi || 60}
                    onChange={(e) => setUjianForm({ ...ujianForm, durasi: parseInt(e.target.value) || 60 })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Token Akses</label>
                  <input
                    type="text"
                    value={ujianForm.token || 'TK889A'}
                    onChange={(e) => setUjianForm({ ...ujianForm, token: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Keaktifan</label>
                  <select
                    value={ujianForm.status || 'AKTIF'}
                    onChange={(e) => setUjianForm({ ...ujianForm, status: e.target.value as any })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={ujianForm.tahunAjaran || localStorage.getItem('ERP_academic_year') || '2026/2027'}
                    onChange={(e) => setUjianForm({ ...ujianForm, tahunAjaran: e.target.value })}
                    className="w-full p-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUjianForm(false);
                    setEditingUjian(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  {editingUjian ? 'Simpan Perubahan' : 'Rilis Sesi Ujian'}
                </button>
              </div>
            </form>
          )}

          {/* Ujian List Table */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
              <h4 className="font-black text-slate-800 text-sm uppercase">Jadwal Sesi Ujian Aktif ({filteredUjianList.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Mata Pelajaran</th>
                    {['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'].includes(user.role) && (
                      <th className="p-4 text-center">Kelas</th>
                    )}
                    <th className="p-4 text-center">Tanggal</th>
                    <th className="p-4 text-center">Waktu / Durasi</th>
                    {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                      <th className="p-4 text-center">Token</th>
                    )}
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {filteredUjianList
                    .filter(u => u.mapel.toLowerCase().includes(searchUjian.toLowerCase()))
                    .map((u, idx) => (
                      <tr key={u.idJadwal} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-4 text-slate-800 font-bold">{u.mapel}</td>
                        {['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'].includes(user.role) && (
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              {u.jenjang} - {u.kelas}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-center font-bold text-slate-600">{u.tanggal}</td>
                        <td className="p-4 text-center font-medium text-slate-500">
                          {u.jamMulai} s/d {u.jamSelesai} ({u.durasi} Menit)
                        </td>
                        {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                          <td className="p-4 text-center font-mono font-bold text-blue-600 bg-blue-50/30">{u.token}</td>
                        )}
                        <td className="p-4 text-center">
                          {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedStatus = u.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
                                const list = ujianList.map(item => item.idJadwal === u.idJadwal ? { ...item, status: updatedStatus } as Ujian : item);
                                db.set('ujian', list);
                                setUjianList(list);
                                Swal.fire('Status Diubah', `Ujian ${u.mapel} diubah menjadi ${updatedStatus}.`, 'success');
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider transition ${
                                u.status === 'AKTIF'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.status}
                            </button>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                              u.status === 'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {user.role === 'SISWA' ? (
                            <button 
                              onClick={() => handleStartExam(u)}
                              disabled={u.status !== 'AKTIF'}
                              className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md mx-auto transition ${
                                u.status === 'AKTIF'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                              }`}
                            >
                              <Play className="w-3.5 h-3.5" /> Ikuti Ujian
                            </button>
                          ) : ['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) ? (
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUjian(u);
                                  setUjianForm(u);
                                  setShowUjianForm(true);
                                }}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUjian(u.idJadwal)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">Hanya Baca</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'token' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Rilis & Management Token Ujian</h3>
              <p className="text-xs text-slate-400 mt-1">Kelola dan salin token aktif ujian untuk divalidasi ke siswa sebelum mulai pengerjaan CBT.</p>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Lock className="w-6 h-6" /></div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm">Token Ujian Utama Saat Ini</h5>
                <p className="text-xs text-slate-400 mt-0.5">Semua siswa KBM wajib mengisi token ini.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-black text-blue-600 bg-white border px-4 py-2 rounded-xl">{examToken}</span>
              <button onClick={() => {
                navigator.clipboard.writeText(examToken);
                Swal.fire('Disalin', 'Token berhasil disalin ke clipboard.', 'success');
              }} className="p-3 bg-white border hover:bg-slate-50 text-slate-700 rounded-xl transition">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handleGenerateToken} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow">
                Rilis Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'proktor' && (
        <div className="space-y-6">
          {/* Segment Toggle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Pengawasan & Log Ujian</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Sistem monitoring terpusat dan rekapitulasi kecurangan siswa.</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setProktorViewTab('monitoring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  proktorViewTab === 'monitoring'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monitoring Sesi Live
              </button>
              <button
                type="button"
                onClick={() => setProktorViewTab('log_ujian')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  proktorViewTab === 'log_ujian'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Log Aktivitas & Kecurangan
                {logUjianList.length > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {logUjianList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {proktorViewTab === 'monitoring' ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Ruang Proktor (Live Monitoring)</h3>
                <p className="text-xs text-slate-400 mt-1">Pantau status pengerjaan siswa, total tab switch, dan durasi pengerjaan aktif.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/50 font-bold text-slate-500 border-b">
                    <tr>
                      <th className="p-4">Nama Siswa</th>
                      <th className="p-4">Status Pengerjaan</th>
                      <th className="p-4 text-center">Pelanggaran Tab Out</th>
                      <th className="p-4 text-center">Sisa Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proktorStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800 text-sm">{s.nama}</td>
                        <td className="p-4"><span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'Mengerjakan' ? 'bg-blue-50 text-blue-700 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>{s.status}</span></td>
                        <td className="p-4 text-center font-bold text-rose-600">{s.pelanggaran} / 3</td>
                        <td className="p-4 text-center font-mono font-semibold text-slate-500">{s.sisaWaktu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in-up">
              {/* Bento Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Log Masuk</span>
                    <h4 className="text-xl font-black text-slate-800 mt-1">{logUjianList.length}</h4>
                  </div>
                </div>

                <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Kecurangan / Pelanggaran</span>
                    <h4 className="text-xl font-black text-rose-600 mt-1">
                      {logUjianList.reduce((acc, curr) => acc + Number(curr.pelanggaran || 0), 0)} Kali
                    </h4>
                  </div>
                </div>

                <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Sedang Mengerjakan</span>
                    <h4 className="text-xl font-black text-amber-600 mt-1">
                      {logUjianList.filter(l => l.status === 'MULAI' || l.status === 'MENGERJAKAN').length}
                    </h4>
                  </div>
                </div>

                <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Selesai Ujian</span>
                    <h4 className="text-xl font-black text-emerald-600 mt-1">
                      {logUjianList.filter(l => l.status === 'SELESAI').length}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Main Control Panel and Filter */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg uppercase">Log Aktivitas & Deteksi Kecurangan CBT</h3>
                    <p className="text-xs text-slate-400 mt-1">Sistem pencatatan terpusat untuk mendeteksi siswa yang memindahkan tab browser, membuka aplikasi lain, atau melanggar aturan CBT.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sampleCheats = [
                          { nisn: '2024001', namaSiswa: 'Budi Santoso', jenjang: 'PAKET C', kelas: '12', status: 'DETEKSI CURANG', pelanggaran: 1, token: examToken, idJadwal: 'JDW-001' },
                          { nisn: '2024002', namaSiswa: 'Citra Kirana', jenjang: 'PAKET B', kelas: '9', status: 'BLOCK', pelanggaran: 3, token: examToken, idJadwal: 'JDW-002' },
                          { nisn: '2024003', namaSiswa: 'Dewi Lestari', jenjang: 'PAKET A', kelas: '6', status: 'MULAI', pelanggaran: 0, token: examToken, idJadwal: 'JDW-003' }
                        ];
                        const randomSample = sampleCheats[Math.floor(Math.random() * sampleCheats.length)];
                        const now = new Date();
                        const newLog: LogUjian = {
                          id: `LOG-${Date.now().toString().slice(-6)}`,
                          nisn: randomSample.nisn,
                          namaSiswa: randomSample.namaSiswa,
                          jenjang: randomSample.jenjang,
                          kelas: randomSample.kelas,
                          status: randomSample.status,
                          waktu: `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`,
                          pelanggaran: randomSample.pelanggaran,
                          token: randomSample.token,
                          idJadwal: randomSample.idJadwal
                        };
                        db.insert<LogUjian>('log_ujian', newLog);
                        Swal.fire('Sukses', 'Simulasi log pelanggaran baru berhasil ditambahkan secara live!', 'success');
                        loadAllData();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Simulasi Log Baru
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateBulkLogs}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Generasi Masal (100+ Log Siswa Aktif)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        Swal.fire({
                          title: '📥 Bulk Import Log Aktivitas & Kecurangan',
                          html: `
                            <div class="text-left space-y-2">
                              <p class="text-xs text-slate-500">Tempelkan (Paste) data TSV log dari spreadsheet Anda di bawah ini untuk mengimpor atau memperbarui log secara massal.</p>
                              <textarea id="bulkPasteLogText" class="w-full h-48 p-2 font-mono text-[10px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" placeholder="NO_LOG\\tNISN\\tNAMA_SISWA\\tJENJANG\\tKELAS\\tSTATUS\\tWaktu\\tPelanggaran\\tTOKEN\\tID_JADWAL... di sini..."></textarea>
                            </div>
                          `,
                          showCancelButton: true,
                          confirmButtonText: 'Proses Sinkronisasi',
                          confirmButtonColor: '#2563eb',
                          cancelButtonText: 'Batal',
                          preConfirm: () => {
                            const textarea = document.getElementById('bulkPasteLogText') as HTMLTextAreaElement;
                            const text = textarea ? textarea.value : '';
                            if (!text || text.trim().length === 0) {
                              Swal.showValidationMessage('Data paste tidak boleh kosong!');
                            }
                            return text;
                          }
                        }).then((result: any) => {
                          if (result.isConfirmed) {
                            handleBulkImportLogs(result.value);
                          }
                        });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" /> Sinkronisasi Masal Log
                    </button>

                    {['SUPERADMIN', 'ADMIN'].includes(user.role) && (
                      <button
                        type="button"
                        onClick={() => {
                          Swal.fire({
                            title: 'Reset Seluruh Log?',
                            text: 'Tindakan ini tidak dapat dibatalkan. Seluruh log riwayat aktivitas ujian akan dihapus permanen!',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            confirmButtonText: 'Ya, Reset Semua',
                            cancelButtonText: 'Batal'
                          }).then((res) => {
                            if (res.isConfirmed) {
                              db.set('log_ujian', []);
                              Swal.fire('Terhapus', 'Database log aktivitas ujian telah dikosongkan.', 'success');
                              loadAllData();
                            }
                          });
                        }}
                        className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-extrabold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Reset Database Log
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col gap-4">
                  {/* Mode Selector and Search */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Cari siswa berdasarkan nama atau NISN..."
                        value={searchLogQuery}
                        onChange={(e) => setSearchLogQuery(e.target.value)}
                        className="w-full text-xs font-bold border rounded-xl pl-10 pr-4 py-2.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl self-center">
                      <button
                        type="button"
                        onClick={() => setProktorActiveMode('SEMUA')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          proktorActiveMode === 'SEMUA'
                            ? 'bg-white text-blue-700 shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Semua Log ({logUjianList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setProktorActiveMode('KECURANGAN')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          proktorActiveMode === 'KECURANGAN'
                            ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                            : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        Hanya Kecurangan ({logUjianList.filter(l => Number(l.pelanggaran) > 0 || l.status === 'DETEKSI CURANG' || l.status === 'BLOCK').length})
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Filters Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Jenjang:</span>
                      <select
                        value={filterLogJenjang}
                        onChange={(e) => setFilterLogJenjang(e.target.value)}
                        className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                      >
                        <option value="">Semua Jenjang</option>
                        <option value="PAKET A">PAKET A</option>
                        <option value="PAKET B">PAKET B</option>
                        <option value="PAKET C">PAKET C</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kelas:</span>
                      <select
                        value={filterLogClass}
                        onChange={(e) => setFilterLogClass(e.target.value)}
                        className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                      >
                        <option value="">Semua Kelas</option>
                        {kelasList.map((k, idx) => (
                          <option key={idx} value={k.nama}>Kelas {k.nama}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Jenis Ujian:</span>
                      <select
                        value={filterLogExamType}
                        onChange={(e) => setFilterLogExamType(e.target.value)}
                        className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm font-sans"
                      >
                        <option value="">Semua Jenis</option>
                        <option value="PLACEMENT_TEST">Placement Test</option>
                        <option value="DIAGNOSTIK">Diagnostik</option>
                        <option value="FORMATIF">Formatif</option>
                        <option value="SUMATIF">Sumatif Modul</option>
                        <option value="ASAS">ASAS</option>
                        <option value="ASAJ">ASAJ</option>
                        <option value="UJI_KESETARAAN">Uji Kesetaraan</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status:</span>
                      <select
                        value={filterLogStatus}
                        onChange={(e) => setFilterLogStatus(e.target.value)}
                        className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                      >
                        <option value="">Semua Status</option>
                        <option value="MULAI">MULAI / AKTIF</option>
                        <option value="MENGERJAKAN">MENGERJAKAN</option>
                        <option value="SELESAI">SELESAI</option>
                        <option value="DETEKSI CURANG">DETEKSI CURANG</option>
                        <option value="BLOCK">TERBLOKIR</option>
                      </select>
                    </div>

                    {(searchLogQuery || filterLogJenjang || filterLogStatus || filterLogClass || filterLogExamType) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchLogQuery('');
                          setFilterLogJenjang('');
                          setFilterLogStatus('');
                          setFilterLogClass('');
                          setFilterLogExamType('');
                        }}
                        className="px-3 py-2 text-xs bg-rose-50 text-rose-600 font-extrabold rounded-xl hover:bg-rose-100 transition border border-rose-200 shadow-sm"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Waktu Log</th>
                        <th className="p-4">Nama Siswa / NISN</th>
                        <th className="p-4">Jenjang & Kelas</th>
                        <th className="p-4 text-center">Token / Jadwal</th>
                        <th className="p-4 text-center">Pelanggaran</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logUjianList.filter(log => {
                        const matchesSearch = searchLogQuery
                          ? log.namaSiswa.toLowerCase().includes(searchLogQuery.toLowerCase()) || log.nisn.includes(searchLogQuery)
                          : true;
                        const matchesJenjang = filterLogJenjang
                          ? log.jenjang.toUpperCase().includes(filterLogJenjang.toUpperCase())
                          : true;
                        const matchesStatus = filterLogStatus
                          ? log.status.toUpperCase() === filterLogStatus.toUpperCase()
                          : true;
                        const matchesClass = filterLogClass
                          ? log.kelas.toString() === filterLogClass
                          : true;

                        // Lookup exam type from CBT session schedule table
                        const exam = (db.get<any>('ujian') || []).find((u: any) => u.idJadwal === log.idJadwal || u.token === log.token);
                        const examType = exam ? (exam.tipe || 'SUMATIF') : 'SUMATIF';
                        const matchesExamType = filterLogExamType
                          ? examType.toUpperCase() === filterLogExamType.toUpperCase()
                          : true;

                        const matchesMode = proktorActiveMode === 'KECURANGAN'
                          ? (Number(log.pelanggaran) > 0 || log.status === 'DETEKSI CURANG' || log.status === 'BLOCK')
                          : true;

                        return matchesSearch && matchesJenjang && matchesStatus && matchesClass && matchesExamType && matchesMode;
                      }).length > 0 ? (
                        logUjianList
                          .filter(log => {
                            const matchesSearch = searchLogQuery
                              ? log.namaSiswa.toLowerCase().includes(searchLogQuery.toLowerCase()) || log.nisn.includes(searchLogQuery)
                              : true;
                            const matchesJenjang = filterLogJenjang
                              ? log.jenjang.toUpperCase().includes(filterLogJenjang.toUpperCase())
                              : true;
                            const matchesStatus = filterLogStatus
                              ? log.status.toUpperCase() === filterLogStatus.toUpperCase()
                              : true;
                            const matchesClass = filterLogClass
                              ? log.kelas.toString() === filterLogClass
                              : true;

                            const exam = (db.get<any>('ujian') || []).find((u: any) => u.idJadwal === log.idJadwal || u.token === log.token);
                            const examType = exam ? (exam.tipe || 'SUMATIF') : 'SUMATIF';
                            const matchesExamType = filterLogExamType
                              ? examType.toUpperCase() === filterLogExamType.toUpperCase()
                              : true;

                            const matchesMode = proktorActiveMode === 'KECURANGAN'
                              ? (Number(log.pelanggaran) > 0 || log.status === 'DETEKSI CURANG' || log.status === 'BLOCK')
                              : true;

                            return matchesSearch && matchesJenjang && matchesStatus && matchesClass && matchesExamType && matchesMode;
                          })
                          .map((log, idx) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="p-4 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                              <td className="p-4 font-mono font-medium text-slate-600 whitespace-nowrap">{log.waktu}</td>
                              <td className="p-4">
                                <div>
                                  <p className="font-extrabold text-slate-800 text-sm">{log.namaSiswa}</p>
                                  <p className="text-[10px] text-slate-400 font-bold font-mono">NISN: {log.nisn}</p>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    log.jenjang.toUpperCase().includes('PAKET A') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    log.jenjang.toUpperCase().includes('PAKET B') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                    'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}>{log.jenjang}</span>
                                  <span className="font-mono font-bold text-slate-600">Kls {log.kelas}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold text-slate-600 block w-max mx-auto">{log.token}</span>
                                  <span className="text-[9px] text-slate-400 font-bold font-mono block">{log.idJadwal}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {Number(log.pelanggaran) > 0 ? (
                                  <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-xl">
                                    {log.pelanggaran}x Tab Out
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                                    Aman (0)
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border tracking-wider block w-max mx-auto ${
                                  log.status === 'DETEKSI CURANG' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                                  log.status === 'BLOCK' ? 'bg-red-600 text-white border-red-700' :
                                  log.status === 'SELESAI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>{log.status}</span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      Swal.fire({
                                        title: '🔍 Rincian Aktivitas Ujian',
                                        html: `
                                          <div class="text-left text-xs space-y-2 border p-4 rounded-2xl bg-slate-50 font-mono text-slate-800">
                                            <p><strong>Log ID:</strong> ${log.id}</p>
                                            <p><strong>Nama Siswa:</strong> ${log.namaSiswa}</p>
                                            <p><strong>NISN:</strong> ${log.nisn}</p>
                                            <p><strong>Program Pendidikan:</strong> ${log.jenjang} (Kelas ${log.kelas})</p>
                                            <p><strong>Status Terakhir:</strong> ${log.status}</p>
                                            <p><strong>Waktu Kejadian:</strong> ${log.waktu}</p>
                                            <p><strong>Jumlah Pelanggaran:</strong> ${log.pelanggaran} Kali Terdeteksi Tab Out</p>
                                            <p><strong>Token Sesi:</strong> ${log.token}</p>
                                            <p><strong>ID Jadwal Ujian:</strong> ${log.idJadwal}</p>
                                          </div>
                                        `,
                                        confirmButtonText: 'Tutup'
                                      });
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                    title="Lihat Rincian"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {['SUPERADMIN', 'ADMIN'].includes(user.role) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        Swal.fire({
                                          title: 'Hapus Log Ini?',
                                          text: 'Log aktivitas spesifik ini akan dihapus dari database.',
                                          icon: 'warning',
                                          showCancelButton: true,
                                          confirmButtonColor: '#ef4444',
                                          confirmButtonText: 'Ya, Hapus',
                                          cancelButtonText: 'Batal'
                                        }).then((res) => {
                                          if (res.isConfirmed) {
                                            const updatedLogs = logUjianList.filter(l => l.id !== log.id);
                                            db.set('log_ujian', updatedLogs);
                                            Swal.fire('Terhapus', 'Entri log berhasil dihapus.', 'success');
                                            loadAllData();
                                          }
                                        });
                                      }}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-bold text-sm">
                            Tidak ada log aktivitas ujian yang cocok dengan kriteria filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'hasil' && (() => {
        const filteredHasilList = hasilList.filter((h) => {
          // Jangan simpan atau tampilkan hasil penugasan di rekapitulasi hasil ujian peserta!
          const uId = String(h.idUjian || h.UjianID || h.id || '');
          const idH = String(h.idHasil || h.HasilUjianID || '');
          const jAsesmen = String(h.jenisAsesmen || '').toUpperCase();
          const jName = String(h.mapel || h.namaUjian || '').toLowerCase();
          if ((h as any).isTugas || (h as any).isPenugasan || uId.startsWith('TGS') || idH.includes('TGS') || jAsesmen === 'TUGAS' || jName.startsWith('tugas ')) {
            return false;
          }

          const matchesJenis = filterHasilJenisUjian
            ? h.idUjian?.toUpperCase() === filterHasilJenisUjian.toUpperCase() ||
              h.idUjian?.toUpperCase().includes(filterHasilJenisUjian.toUpperCase()) ||
              h.jenisAsesmen?.toUpperCase() === filterHasilJenisUjian.toUpperCase()
            : true;

          const matchesSemester = filterHasilSemester
            ? h.semester?.toUpperCase() === filterHasilSemester.toUpperCase()
            : true;

          const matchesTahunAjaran = filterHasilTahunAjaran
            ? h.tahunAjaran?.replace('-', '/').trim() === filterHasilTahunAjaran.replace('-', '/').trim()
            : true;

          const matchesKelas = filterHasilKelas
            ? h.kelas?.toString().toUpperCase() === filterHasilKelas.toString().toUpperCase() ||
              h.kelas?.toString().toUpperCase().includes(filterHasilKelas.toString().toUpperCase()) ||
              filterHasilKelas.toString().toUpperCase().includes(h.kelas?.toString().toUpperCase() || '_nomatch_')
            : true;

          return matchesJenis && matchesSemester && matchesTahunAjaran && matchesKelas;
        });

        return (
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-800 text-sm uppercase">Riwayat Kelulusan CBT</h4>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Nilai Sumatif
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Monitoring hasil ujian evaluasi mandiri siswa yang dihitung sebagai <b>Nilai Sumatif</b> (Sumatif Lingkup Materi / LM, STS, dan SAS).</p>
              </div>

              {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      Swal.fire({
                        title: '📥 Bulk Import Hasil Ujian ASAS',
                        html: `
                          <div class="text-left space-y-2">
                            <p class="text-xs text-slate-500">Tempelkan (Paste) data TSV Hasil Ujian dari spreadsheet Anda di bawah ini untuk mengimpor atau memperbarui hasil ujian secara massal.</p>
                            <textarea id="bulkPasteHasilText" class="w-full h-48 p-2 font-mono text-[10px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" placeholder="ID_HASIL\tID_UJIAN\tJENJANG\tKELAS\tMAPEL\tNISN\tNAMA_SISWA\tNILAI\tBENAR\tSALAH\tTOTAL_SOAL\tPELANGGARAN\tWAKTU_MULAI\tSTATUS\tTAHUN_AJARAN\tNILAI_AKHIR... di sini..."></textarea>
                          </div>
                        `,
                        showCancelButton: true,
                        confirmButtonText: 'Proses Sinkronisasi',
                        confirmButtonColor: '#2563eb',
                        cancelButtonText: 'Batal',
                        preConfirm: () => {
                          const textarea = document.getElementById('bulkPasteHasilText') as HTMLTextAreaElement;
                          const text = textarea ? textarea.value : '';
                          if (!text || text.trim().length === 0) {
                            Swal.showValidationMessage('Data paste tidak boleh kosong!');
                          }
                          return text;
                        }
                      }).then((result: any) => {
                        if (result.isConfirmed) {
                          handleBulkImportHasilUjian(result.value);
                        }
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" /> Sinkronisasi Masal Hasil Ujian
                  </button>
                </div>
              )}
            </div>

            {/* Filter Panel */}
            <div className="p-5 bg-slate-50/50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Jenis Ujian */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Jenis Ujian:</span>
                  <select
                    value={filterHasilJenisUjian}
                    onChange={(e) => setFilterHasilJenisUjian(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm font-sans"
                  >
                    <option value="">Semua Jenis</option>
                    <option value="ASAS">ASAS</option>
                    <option value="ASTS">ASTS</option>
                    <option value="AFM">AFM</option>
                    <option value="ASAJ">ASAJ</option>
                    <option value="ADK">ADK</option>
                    <option value="UPJ">UPJ</option>
                  </select>
                </div>

                {/* Filter Semester */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Semester:</span>
                  <select
                    value={filterHasilSemester}
                    onChange={(e) => setFilterHasilSemester(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Semester</option>
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                    {semesterList.map((s, idx) => (
                      <option key={idx} value={s.sem}>{s.sem}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahun Ajaran */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tahun Ajaran:</span>
                  <select
                    value={filterHasilTahunAjaran}
                    onChange={(e) => setFilterHasilTahunAjaran(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Tahun</option>
                    {tahunAjaranList.map((t, idx) => (
                      <option key={idx} value={t.ta}>{t.ta}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kelas:</span>
                  <select
                    value={filterHasilKelas}
                    onChange={(e) => setFilterHasilKelas(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Kelas</option>
                    {kelasList.map((k, idx) => (
                      <option key={idx} value={k.nama}>Kelas {k.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Clear Filter Button */}
                {(filterHasilJenisUjian || filterHasilSemester || filterHasilTahunAjaran || filterHasilKelas) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterHasilJenisUjian('');
                      setFilterHasilSemester('');
                      setFilterHasilTahunAjaran('');
                      setFilterHasilKelas('');
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/60 px-3 py-2 rounded-xl transition flex items-center gap-1"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-extrabold uppercase bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                Menampilkan: {filteredHasilList.length} dari {hasilList.length} hasil
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Nama Siswa</th>
                    <th className="p-4 text-center">Kelas</th>
                    <th className="p-4 hidden sm:table-cell">Mata Pelajaran</th>
                    <th className="p-4 text-center hidden md:table-cell">ID Asesmen</th>
                    <th className="p-4 text-center hidden md:table-cell">Jenis Asas</th>
                    <th className="p-4 text-center hidden md:table-cell">Semester</th>
                    <th className="p-4 text-center hidden lg:table-cell">Tahun Ajaran</th>
                    <th className="p-4 text-center">Pelanggaran</th>
                    <th className="p-4 text-center">Nilai Akhir</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {filteredHasilList.length > 0 ? (
                    filteredHasilList.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{h.namaSiswa}</p>
                            <p className="text-[10px] text-blue-500 font-bold sm:hidden mt-0.5">{h.mapel}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700">{h.kelas}</td>
                        <td className="p-4 font-semibold text-blue-600 hidden sm:table-cell">{h.mapel}</td>
                        <td className="p-4 text-center font-mono font-bold text-slate-500 hidden md:table-cell">{h.idAsesmen || 'N/A'}</td>
                        <td className="p-4 text-center hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {h.jenisAsesmen || 'ASAS'}
                          </span>
                        </td>
                        <td className="p-4 text-center hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {h.semester || 'Ganjil'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono hidden lg:table-cell text-slate-500">{h.tahunAjaran}</td>
                        <td className="p-4 text-center text-rose-600 font-bold font-mono">{h.pelanggaran}</td>
                        <td className="p-4 text-center text-sm font-black text-slate-700 font-mono">{h.nilaiAkhir}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            h.status === 'LULUS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>{h.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-bold text-sm">
                        Tidak ada hasil ujian yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {activeSubTab === 'analisis' && (() => {
        const filteredHasilList = hasilList.filter((h) => {
          const matchesJenis = filterHasilJenisUjian
            ? h.idUjian?.toUpperCase() === filterHasilJenisUjian.toUpperCase() ||
              h.idUjian?.toUpperCase().includes(filterHasilJenisUjian.toUpperCase()) ||
              h.jenisAsesmen?.toUpperCase() === filterHasilJenisUjian.toUpperCase()
            : true;

          const matchesSemester = filterHasilSemester
            ? h.semester?.toUpperCase() === filterHasilSemester.toUpperCase()
            : true;

          const matchesTahunAjaran = filterHasilTahunAjaran
            ? h.tahunAjaran?.replace('-', '/').trim() === filterHasilTahunAjaran.replace('-', '/').trim()
            : true;

          const matchesKelas = filterHasilKelas
            ? h.kelas?.toString().toUpperCase() === filterHasilKelas.toString().toUpperCase() ||
              h.kelas?.toString().toUpperCase().includes(filterHasilKelas.toString().toUpperCase()) ||
              filterHasilKelas.toString().toUpperCase().includes(h.kelas?.toString().toUpperCase() || '_nomatch_')
            : true;

          return matchesJenis && matchesSemester && matchesTahunAjaran && matchesKelas;
        });

        return (
          <div className="space-y-6 animate-fade-in-up">
            {/* Header & Filter Panel */}
            <div className="bg-white p-5 border rounded-3xl shadow-sm flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-200">
                    Statistik & Evaluasi
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-lg uppercase mt-1">Analisis Nilai Hasil Ujian</h3>
                  <p className="text-xs text-slate-400">Analisis statistik nilai, distribusi rentang skor, dan pencapaian siswa berdasarkan filter.</p>
                </div>
                <div className="text-[10px] text-slate-400 font-extrabold uppercase bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm self-start md:self-center">
                  Menampilkan: {filteredHasilList.length} dari {hasilList.length} hasil
                </div>
              </div>

              {/* Filters row synced with Hasil tab */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {/* Filter Jenis Ujian */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Jenis Ujian:</span>
                  <select
                    value={filterHasilJenisUjian}
                    onChange={(e) => setFilterHasilJenisUjian(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm font-sans"
                  >
                    <option value="">Semua Jenis</option>
                    <option value="ASAS">ASAS</option>
                    <option value="ASTS">ASTS</option>
                    <option value="AFM">AFM</option>
                    <option value="ASAJ">ASAJ</option>
                    <option value="ADK">ADK</option>
                    <option value="UPJ">UPJ</option>
                  </select>
                </div>

                {/* Filter Semester */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Semester:</span>
                  <select
                    value={filterHasilSemester}
                    onChange={(e) => setFilterHasilSemester(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Semester</option>
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                    {semesterList.map((s, idx) => (
                      <option key={idx} value={s.sem}>{s.sem}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahun Ajaran */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tahun Ajaran:</span>
                  <select
                    value={filterHasilTahunAjaran}
                    onChange={(e) => setFilterHasilTahunAjaran(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Tahun</option>
                    {tahunAjaranList.map((t, idx) => (
                      <option key={idx} value={t.ta}>{t.ta}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kelas:</span>
                  <select
                    value={filterHasilKelas}
                    onChange={(e) => setFilterHasilKelas(e.target.value)}
                    className="border bg-white rounded-xl px-2.5 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">Semua Kelas</option>
                    {kelasList.map((k, idx) => (
                      <option key={idx} value={k.nama}>Kelas {k.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Clear Filter Button */}
                {(filterHasilJenisUjian || filterHasilSemester || filterHasilTahunAjaran || filterHasilKelas) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterHasilJenisUjian('');
                      setFilterHasilSemester('');
                      setFilterHasilTahunAjaran('');
                      setFilterHasilKelas('');
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/60 px-3 py-2 rounded-xl transition flex items-center gap-1"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Peserta Ujian</span>
                <h4 className="text-2xl font-black text-slate-800">{filteredHasilList.length} Siswa</h4>
                <p className="text-[10px] text-slate-400 font-medium">Telah menyelesaikan CBT</p>
              </div>

              <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Nilai Tertinggi</span>
                <h4 className="text-2xl font-black text-blue-600">
                  {filteredHasilList.length > 0 ? Math.max(...filteredHasilList.map(h => h.nilaiAkhir)) : 0}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Skor terbaik siswa</p>
              </div>

              <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Nilai Terendah</span>
                <h4 className="text-2xl font-black text-rose-600">
                  {filteredHasilList.length > 0 ? Math.min(...filteredHasilList.map(h => h.nilaiAkhir)) : 0}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Batas bawah nilai aktif</p>
              </div>

              <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Rata-rata Nilai</span>
                <h4 className="text-2xl font-black text-amber-500">
                  {filteredHasilList.length > 0 ? (filteredHasilList.reduce((sum, h) => sum + h.nilaiAkhir, 0) / filteredHasilList.length).toFixed(1) : '0'}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Nilai tengah keseluruhan</p>
              </div>

              <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Persentase Kelulusan</span>
                <h4 className="text-2xl font-black text-emerald-600">
                  {filteredHasilList.length > 0 ? ((filteredHasilList.filter(h => h.status === 'LULUS').length / filteredHasilList.length) * 100).toFixed(0) : '0'}%
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Lolos kriteria ketuntasan</p>
              </div>
            </div>

            {/* Visual Analytics Charts using Recharts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grade Distribution Chart */}
              <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Grafik Distribusi Rentang Nilai</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pengelompokan perolehan nilai akhir siswa seluruh mata pelajaran.</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '90 - 100 (A)', jumlah: filteredHasilList.filter(h => h.nilaiAkhir >= 90).length },
                        { name: '80 - 89 (B)', jumlah: filteredHasilList.filter(h => h.nilaiAkhir >= 80 && h.nilaiAkhir < 90).length },
                        { name: '70 - 79 (C)', jumlah: filteredHasilList.filter(h => h.nilaiAkhir >= 70 && h.nilaiAkhir < 80).length },
                        { name: '< 70 (D)', jumlah: filteredHasilList.filter(h => h.nilaiAkhir < 70).length },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <ChartTooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                        labelClassName="font-bold text-slate-800"
                      />
                      <Bar dataKey="jumlah" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Average Score by Subject Chart */}
              <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Grafik Rata-rata Nilai per Mata Pelajaran</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Metrik pencapaian kognitif rata-rata kelas di masing-masing ujian mapel.</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(
                        filteredHasilList.reduce((acc, curr) => {
                          if (!acc[curr.mapel]) {
                            acc[curr.mapel] = { sum: 0, count: 0 };
                          }
                          acc[curr.mapel].sum += curr.nilaiAkhir;
                          acc[curr.mapel].count += 1;
                          return acc;
                        }, {} as { [key: string]: { sum: number; count: number } })
                      ).map(([mapel, val]) => ({
                        name: mapel,
                        rataRata: Math.round((val as any).sum / (val as any).count)
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <ChartTooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                        labelClassName="font-bold text-slate-800"
                      />
                      <Bar dataKey="rataRata" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Ranking & Performance Table */}
            <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-slate-50/50">
                <h4 className="font-black text-slate-800 text-sm uppercase">Peringkat & Analisis Hasil Siswa</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                    <tr>
                      <th className="p-4 w-16 text-center">Rank</th>
                      <th className="p-4">Nama Siswa</th>
                      <th className="p-4">NISN</th>
                      <th className="p-4">Mata Pelajaran</th>
                      <th className="p-4 text-center">Pelanggaran</th>
                      <th className="p-4 text-center">Nilai Akhir</th>
                      <th className="p-4 text-center">Predikat</th>
                      <th className="p-4 text-center">Status Kelulusan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {filteredHasilList.length > 0 ? (
                      [...filteredHasilList]
                        .sort((a, b) => b.nilaiAkhir - a.nilaiAkhir)
                        .map((h, idx) => {
                          let predikat = 'D';
                          let color = 'text-rose-600';
                          if (h.nilaiAkhir >= 90) { predikat = 'A'; color = 'text-emerald-600'; }
                          else if (h.nilaiAkhir >= 80) { predikat = 'B'; color = 'text-blue-600'; }
                          else if (h.nilaiAkhir >= 70) { predikat = 'C'; color = 'text-amber-600'; }

                          return (
                            <tr key={h.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 text-center text-slate-400 font-bold">
                                {idx + 1 === 1 ? '🥇 1' : idx + 1 === 2 ? '🥈 2' : idx + 1 === 3 ? '🥉 3' : idx + 1}
                              </td>
                              <td className="p-4 text-slate-800 font-extrabold">{h.namaSiswa}</td>
                              <td className="p-4 font-mono">{h.nisn || '10294857'}</td>
                              <td className="p-4 text-blue-600 font-bold">{h.mapel}</td>
                              <td className="p-4 text-center text-rose-600 font-bold">{h.pelanggaran}</td>
                              <td className="p-4 text-center text-sm font-black text-slate-700">{h.nilaiAkhir}</td>
                              <td className={`p-4 text-center font-black ${color}`}>{predikat}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  h.status === 'LULUS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>{h.status}</span>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold text-sm">
                          Tidak ada data hasil ujian atau peringkat siswa yang sesuai dengan filter saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeSubTab === 'jenis_ujian' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header Panel */}
          <div className="bg-white p-5 border rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div>
              <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-200">
                Data Konfigurasi Evaluasi
              </span>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase mt-1">Jenis Ujian & Kategori Asesmen</h3>
              <p className="text-xs text-slate-400">Pengaturan standar evaluasi akademik, format penilaian, dan instrumen kelulusan.</p>
            </div>

            {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
              <button
                type="button"
                onClick={() => {
                  setEditingJenisUjian(null);
                  setJenisUjianForm({
                    idAsesmen: '', kategori: 'SUMATIF', jenisAsesmen: '', singkatan: '',
                    jenjang: 'PAKET C', kelas: '12', semester: 'Ganjil', tahunAjaran: '2026/2027', status: 'AKTIF'
                  });
                  setShowJenisUjianForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Jenis Ujian
              </button>
            )}
          </div>

          {/* Main Table Card */}
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm uppercase">Daftar Jenis Ujian & Standar Asesmen</h4>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Total instrumen aktif: {jenisUjianList.length} kategori</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4 w-12 text-center">Nomor</th>
                    <th className="p-4">Id Asesmen</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Jenis Asesmen</th>
                    <th className="p-4">Singkatan</th>
                    <th className="p-4">Jenjang</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4 text-center">Semester</th>
                    <th className="p-4 text-center">Tahun Ajaran</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {jenisUjianList.length > 0 ? (
                    jenisUjianList.map((item, idx) => {
                      let catColor = 'bg-slate-50 text-slate-700 border-slate-200';
                      if (item.kategori === 'SUMATIF') catColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      else if (item.kategori === 'FORMATIF') catColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (item.kategori === 'AWAL') catColor = 'bg-purple-50 text-purple-700 border-purple-200';
                      else if (item.kategori === 'DIAGNOSTIK') catColor = 'bg-violet-50 text-violet-700 border-violet-200';
                      else if (item.kategori === 'PLACEMENT_TEST') catColor = 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr key={item.idAsesmen} className="hover:bg-slate-50/80 transition">
                          <td className="p-4 text-center text-slate-400 font-bold font-mono">{idx + 1}</td>
                          <td className="p-4 font-mono font-bold text-slate-700">{item.idAsesmen}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${catColor}`}>
                              {item.kategori.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-slate-800 font-extrabold">{item.jenisAsesmen}</td>
                          <td className="p-4 font-mono font-bold text-blue-600">{item.singkatan}</td>
                          <td className="p-4 text-slate-700">{item.jenjang}</td>
                          <td className="p-4 text-center font-mono font-bold">{item.kelas}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.semester === 'Ganjil' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-teal-50 text-teal-700 border border-teal-100'
                            }`}>{item.semester}</span>
                          </td>
                          <td className="p-4 text-center font-mono">{item.tahunAjaran}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {item.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingJenisUjian(item);
                                      setJenisUjianForm(item);
                                      setShowJenisUjianForm(true);
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition border"
                                    title="Edit Jenis"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJenisUjian(item.idAsesmen)}
                                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition border"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-bold">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-bold text-sm">
                        Tidak ada data jenis ujian yang tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Modal */}
          {showJenisUjianForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase">
                    {editingJenisUjian ? '📝 Edit Jenis Ujian / Asesmen' : '✨ Tambah Jenis Ujian Baru'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowJenisUjianForm(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <form onSubmit={handleSaveJenisUjian} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Id Asesmen *</label>
                      <input
                        type="text"
                        placeholder="Contoh: ASM-007"
                        required
                        disabled={!!editingJenisUjian}
                        value={jenisUjianForm.idAsesmen}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, idAsesmen: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50 disabled:bg-slate-100 font-mono font-bold"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Singkatan *</label>
                      <input
                        type="text"
                        placeholder="Contoh: ASTS, ASAJ, AFM"
                        required
                        value={jenisUjianForm.singkatan}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, singkatan: e.target.value.toUpperCase() }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Kategori Asesmen *</label>
                    <select
                      value={jenisUjianForm.kategori}
                      onChange={(e) => setJenisUjianForm(prev => ({ ...prev, kategori: e.target.value }))}
                      className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
                    >
                      <option value="AWAL">AWAL (ASESMEN AWAL)</option>
                      <option value="SUMATIF">SUMATIF</option>
                      <option value="FORMATIF">FORMATIF</option>
                      <option value="DIAGNOSTIK">DIAGNOSTIK</option>
                      <option value="PLACEMENT_TEST">PLACEMENT TEST</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Nama Jenis Asesmen / Ujian *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Asesmen Sumatif Akhir Tahun"
                      required
                      value={jenisUjianForm.jenisAsesmen}
                      onChange={(e) => setJenisUjianForm(prev => ({ ...prev, jenisAsesmen: e.target.value }))}
                      className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Jenjang *</label>
                      <select
                        value={jenisUjianForm.jenjang}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, jenjang: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
                      >
                        <option value="PAKET A">PAKET A</option>
                        <option value="PAKET B">PAKET B</option>
                        <option value="PAKET C">PAKET C</option>
                        <option value="Semua">Semua Jenjang</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Kelas *</label>
                      <input
                        type="text"
                        placeholder="Contoh: 12, 9, atau Semua"
                        required
                        value={jenisUjianForm.kelas}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, kelas: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Semester *</label>
                      <select
                        value={jenisUjianForm.semester}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, semester: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-xs font-bold"
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                        {semesterList.map((s, idx) => (
                          <option key={idx} value={s.sem}>{s.sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Tahun Ajaran *</label>
                      <select
                        value={jenisUjianForm.tahunAjaran}
                        onChange={(e) => setJenisUjianForm(prev => ({ ...prev, tahunAjaran: e.target.value }))}
                        className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-xs font-bold"
                      >
                        <option value="">-- Pilih Tahun Ajaran --</option>
                        {tahunAjaranList.map((t, idx) => (
                          <option key={idx} value={t.ta}>{t.ta}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-500 uppercase text-[10px]">Status Keaktifan *</label>
                    <select
                      value={jenisUjianForm.status}
                      onChange={(e) => setJenisUjianForm(prev => ({ ...prev, status: e.target.value as 'AKTIF' | 'NONAKTIF' }))}
                      className="w-full p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NON-AKTIF</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowJenisUjianForm(false)}
                      className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Save className="w-4 h-4" />
                      Simpan Data
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'rapor' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header & Student Selector */}
          <div className="bg-white p-5 border rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div>
              <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-200">
                Laporan Capaian Belajar (Rapor)
              </span>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase mt-1">Rapor Pendidikan & Kelulusan</h3>
              <p className="text-xs text-slate-400">Pembobotan terpadu berdasarkan Keputusan Kemendikdasmen No. 9 Tahun 2026.</p>
            </div>

            {user.role !== 'SISWA' ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Pilih Siswa:</span>
                <select
                  value={selectedRaporSiswa}
                  onChange={(e) => setSelectedRaporSiswa(e.target.value)}
                  className="p-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 text-slate-700 font-mono"
                >
                  <option value="">-- Pilih Siswa Aktif --</option>
                  {(db.get<any>('siswa') || []).slice(0, 15).map((s: any) => (
                    <option key={s.nisn} value={s.nisn || s.id}>
                      {s.nama} ({s.nisn || 'Siswa'}) - Kls {s.kelasId || 'X'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.name.slice(0, 2)}
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 font-bold uppercase block">Nama Siswa Terkunci</span>
                  <span className="text-xs font-extrabold text-blue-900">{user.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Card & Summary */}
          {(() => {
            const listSiswa = db.get<any>('siswa') || [];
            const activeNisn = selectedRaporSiswa || listSiswa[0]?.nisn || '';
            const targetStudent = listSiswa.find((s: any) => s.nisn === activeNisn || s.id === activeNisn) || {
              nama: user.role === 'SISWA' ? user.name : 'Siswa',
              nisn: user.role === 'SISWA' ? user.username : '-',
              kelasId: '-',
              jenjang: '-',
              ttl: '-'
            };

            const mapelRaporList = [
              { code: 'MTK', mapel: 'Matematika Peminatan', modul: 86, asas: 82 },
              { code: 'IND', mapel: 'Bahasa Indonesia', modul: 92, asas: 84 },
              { code: 'ING', mapel: 'Bahasa Inggris', modul: 88, asas: 80 },
              { code: 'FIS', mapel: 'Fisika Terapan', modul: 78, asas: 75 },
              { code: 'PKN', mapel: 'Pancasila & Kewarganegaraan', modul: 94, asas: 90 },
              { code: 'EKO', mapel: 'Ekonomi Kesetaraan', modul: 85, asas: 78 }
            ];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Profile Detail Card */}
                <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Identitas Siswa</h4>
                  <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Nama Lengkap</span>
                      <span className="font-extrabold text-slate-700 text-right">{targetStudent.nama}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Nomor Induk (NISN)</span>
                      <span className="font-mono font-bold text-slate-700">{targetStudent.nisn || '10294857'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Jenjang Program</span>
                      <span className="text-blue-700 font-extrabold">{targetStudent.jenjang || 'PAKET C (SETARA SMA)'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Kelas / Rombel</span>
                      <span className="font-bold text-slate-700">{targetStudent.kelasId || 'XII - FASE F'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Tempat, Tanggal Lahir</span>
                      <span className="font-medium text-slate-700">{targetStudent.ttl || 'Semarang, 12 Mei 2008'}</span>
                    </div>
                  </div>

                  {/* Weighting Meter Graphical Breakdown */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs uppercase">Rasio Pembobotan Nilai Rapor</h5>
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                      <div className="flex justify-between text-xs font-bold text-blue-900">
                        <span>Sumatif Modul (Fase Belajar)</span>
                        <span>{calcBobotSumatif}%</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-indigo-900">
                        <span>Asesmen Sumatif Akhir (ASAS)</span>
                        <span>{100 - calcBobotSumatif}%</span>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="w-full h-3 bg-indigo-200 rounded-full overflow-hidden flex shadow-inner">
                        <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${calcBobotSumatif}%` }} />
                        <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${100 - calcBobotSumatif}%` }} />
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                        Sesuai standar nasional, komponen Sumatif Modul menyumbang bobot mayoritas (50% s.d. 60%) untuk memastikan proses belajar andragogi lebih dihargai dibanding sekadar hasil ujian akhir.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Subject Table & Comparison Chart */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Score Bar Chart comparison */}
                  <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Perbandingan Komponen Nilai & Hasil Akhir Rapor</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={mapelRaporList.map(item => {
                            const na = Math.round((item.modul * calcBobotSumatif + item.asas * (100 - calcBobotSumatif)) / 100);
                            return {
                              name: item.code,
                              Modul: item.modul,
                              ASAS: item.asas,
                              Akhir: na
                            };
                          })}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <ChartTooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                            labelClassName="font-bold text-slate-800"
                          />
                          <ChartLegend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Modul" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ASAS" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Akhir" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b bg-slate-50/50">
                      <h4 className="font-black text-slate-800 text-sm uppercase">Daftar Mata Pelajaran & Nilai Akhir (Kemendikdasmen No. 9/2026)</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                          <tr>
                            <th className="p-4">Mata Pelajaran Umum</th>
                            <th className="p-4 text-center">Rata Modul ({calcBobotSumatif}%)</th>
                            <th className="p-4 text-center">Ujian ASAS ({100 - calcBobotSumatif}%)</th>
                            <th className="p-4 text-center">Nilai Rapor (NA)</th>
                            <th className="p-4 text-center">Predikat</th>
                            <th className="p-4 text-center">Sifat Kontribusi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                          {mapelRaporList.map((item, idx) => {
                            const finalScore = Math.round((item.modul * calcBobotSumatif + item.asas * (100 - calcBobotSumatif)) / 100);
                            let predikat = 'D';
                            let color = 'text-rose-600 font-black';
                            if (finalScore >= 85) { predikat = 'A'; color = 'text-emerald-600 font-black'; }
                            else if (finalScore >= 75) { predikat = 'B'; color = 'text-blue-600 font-black'; }
                            else if (finalScore >= 60) { predikat = 'C'; color = 'text-amber-600 font-black'; }

                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition">
                                <td className="p-4 text-slate-800 font-extrabold">{item.mapel}</td>
                                <td className="p-4 text-center font-mono font-bold">{item.modul}</td>
                                <td className="p-4 text-center font-mono font-bold text-indigo-600">{item.asas}</td>
                                <td className="p-4 text-center text-slate-900 text-sm font-black bg-emerald-50/30">{finalScore}</td>
                                <td className={`p-4 text-center text-sm ${color}`}>{predikat}</td>
                                <td className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Komponen Utama</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

declare const Swal: any;
export {};
