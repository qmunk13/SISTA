import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckSquare, FileText, CheckCircle2, Search, Plus, Filter, X, Clock, Calendar, Check,
  Eye, Edit, Trash2, Save, AlertTriangle, Users, Award, BookOpen, AlertCircle, RefreshCw, Send,
  Sparkles, Layers, ListOrdered, Download, ArrowRight, UploadCloud, ChevronLeft, ChevronRight,
  FileSpreadsheet, HelpCircle, Copy, Folder, FolderOpen, ChevronDown, Link, Link2, ExternalLink,
  Undo2, Image as ImageIcon, Camera, Share2, MessageCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { db } from '../data/db';
import { useStore } from '../store';
import { matchClass, matchStatusActive, getAllClasses, formatClassLabel, STANDARD_CLASSES, normalizeClassName, extractGoogleDriveFileId } from '../lib/utils';
import { KurikulumModulItem, SilabusItemRow, validateKurikulumModulSchema, validateMasterSilabusSchema } from '../data/kurikulumModulData';
import { generateCpAtpListFromKurikulumModul } from '../data/cpAtpData';
import { fetchFromGAS, renameGoogleDriveFile, uploadFileToGAS } from '../lib/api';
import { getStoredGasUrl } from '../utils/gasSync';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { generate20SoalPilihanGanda, createBankSoalPackageFromSilabus, GOOGLE_DRIVE_MODUL_FOLDER_ID } from '../data/soalGenerator';
import { autoSyncEngine } from '../data/autoSyncEngine';
import SilabusBerkasTab, { generateCurriculumDriveCatalog, sanitizeScannedDriveFiles, deriveFileNameFromUrlAndItem } from '../components/penugasan/SilabusBerkasTab';

interface TugasItem {
  id: string;
  noExcel?: number;
  silabusNo?: number;
  kodeSubTugas?: string;
  kodeModul?: string;
  unitCode?: string;
  subKe?: string;
  subBab?: string;
  temaModul?: string;
  singkatan?: string;
  modulNo?: string;
  paket?: string;
  semester?: string;
  rentangJadwal?: string;
  tanggalMulai?: string;
  jadwalTugas?: string;
  judul: string;
  mapel: string;
  kelas: string;
  tingkatKelas?: string;
  tenggat: string;
  kategori?: string;
  deskripsi?: string;
  kumpul: number;
  totalSiswa: number;
  status: 'Aktif Mengumpulkan' | 'Menunggu Penilaian' | 'Selesai Dinilai';
  avg: number;
  createdAt: string;
  isAutoGrading?: boolean;
  soalList?: any[];
}

interface SubmissionItem {
  tugasId: string;
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  status: 'Sudah Mengumpulkan' | 'Belum Mengumpulkan' | 'Terlambat';
  submittedAt?: string;
  nilai?: number | null;
  catatanGuru?: string;
  jawabanDetail?: { [key: number]: string };
  textJawaban?: string;
  fileLink?: string;
  fotoBuktiUrl?: string;
}

export default function PenugasanPage() {
  const { students, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState('daftar-tugas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterPaket, setFilterPaket] = useState<string>('SEMUA'); // 'SEMUA', 'A', 'B', 'C'
  const [filterSemester, setFilterSemester] = useState<string>('SEMUA'); // 'SEMUA', 'Ganjil', 'Genap'
  const [viewMode, setViewMode] = useState<'tabel' | 'grup-kelas'>('tabel'); // 'tabel' | 'grup-kelas'
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewDetailModal, setViewDetailModal] = useState<TugasItem | null>(null);
  const [editModal, setEditModal] = useState<TugasItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [inspectSubmissionModal, setInspectSubmissionModal] = useState<{
    student: any;
    submission: any;
    tugas: TugasItem;
  } | null>(null);

  // Popup Modal Penugasan dari Silabus Master
  const [assignSilabusModal, setAssignSilabusModal] = useState<any | null>(null);
  const [assignForm, setAssignForm] = useState({
    targetKelas: '4',
    judul: '',
    kategori: 'Kuis & Modul Pembelajaran',
    tenggat: '',
    deskripsi: '',
    isAutoGrading: true
  });

  // New Tugas Form State
  const [newTugas, setNewTugas] = useState<{
    judul: string;
    mapel: string;
    kelas: string;
    tenggat: string;
    kategori: string;
    deskripsi: string;
    isAutoGrading?: boolean;
    soalList?: any[];
  }>({
    judul: '',
    mapel: '',
    kelas: '',
    tenggat: '',
    kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
    deskripsi: '',
    isAutoGrading: true,
    soalList: []
  });

  // Selected Tugas for Pengumpulan Tab
  const [selectedTugasId, setSelectedTugasId] = useState<string>('');
  
  // Stored Tugas & Submissions - Only contains user-assigned tasks from Silabus Master or Manual
  const [tugasList, setTugasList] = useState<TugasItem[]>(() => {
    const saved = db.get('tugas_kbm') as TugasItem[];
    if (saved && Array.isArray(saved)) {
      // Purge any legacy auto-generated mass demo tasks (starting with TGS-MS-)
      const realTasks = saved.filter(t => !String(t.id || '').startsWith('TGS-MS-'));
      if (realTasks.length !== saved.length) {
        db.set('tugas_kbm', realTasks);
      }
      return realTasks;
    }
    return [];
  });

  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => {
    const saved = db.get('hasil_tugas_kbm') as SubmissionItem[];
    return Array.isArray(saved) ? saved : [];
  });

  // Flexible Class Matching Helper for Tasks
  const isTaskMatchingClass = (t: TugasItem, filter: string): boolean => {
    if (!filter || filter === '' || filter === 'SEMUA' || filter === 'ALL') return true;
    
    const cleanFilter = normalizeClassName(filter);
    const cleanTaskClass = normalizeClassName(t.kelas);
    const cleanTingkat = normalizeClassName(t.tingkatKelas || '');

    // Exact match (e.g. '4A' === '4A' or '4' === '4')
    if (cleanTaskClass === cleanFilter || cleanTingkat === cleanFilter) return true;

    // Extract number from filter (e.g. '4' from '4' or 'KELAS4' or 'A4')
    const filterDigit = cleanFilter.replace(/\D/g, '');
    const taskDigit = cleanTaskClass.replace(/\D/g, '');

    if (filterDigit) {
      if (cleanFilter === filterDigit || cleanFilter === `KELAS${filterDigit}` || cleanFilter === `K${filterDigit}`) {
        if (taskDigit === filterDigit) return true;
        if (t.tingkatKelas && t.tingkatKelas.includes(filterDigit)) return true;
        if (t.kodeModul && (t.kodeModul.includes(`A${filterDigit}`) || t.kodeModul.includes(`B${filterDigit}`) || t.kodeModul.includes(`C${filterDigit}`))) return true;
      }
    }

    return matchClass(t.kelas, filter);
  };

  // Distinct Classes extracted from both tasks and student roster
  const allDistinctClasses = useMemo(() => {
    const set = new Set<string>();
    ['4', '5', '6', '7', '8', '9', '10', '11', '12'].forEach(c => set.add(c));
    tugasList.forEach(t => {
      if (t.kelas) set.add(normalizeClassName(t.kelas));
    });
    students.forEach(s => {
      if (s.class) set.add(normalizeClassName(s.class));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tugasList, students]);

  // Count tasks per class level (Kelas 4 s/d Kelas 12)
  const classCounts = useMemo(() => {
    const counts: { [key: string]: number } = {
      '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0
    };
    tugasList.forEach(t => {
      const digit = normalizeClassName(t.kelas).replace(/\D/g, '') || normalizeClassName(t.tingkatKelas || '').replace(/\D/g, '');
      if (digit && counts[digit] !== undefined) {
        counts[digit]++;
      }
    });
    return counts;
  }, [tugasList]);

  // Unique Classes from students or defaults
  const availableClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(students), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // 25, 50, 100, 250, 500, 1000

  // UI Dropdown States for cleaned-up menus
  const [showSilabusMenu, setShowSilabusMenu] = useState<boolean>(false);
  const [showHeaderActionMenu, setShowHeaderActionMenu] = useState<boolean>(false);

  // Excel Import / Export Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importParsedData, setImportParsedData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reactive trigger for Bank Soal & Local DB updates
  const [bankSoalRefresh, setBankSoalRefresh] = useState(0);

  useEffect(() => {
    const handleDbChange = () => setBankSoalRefresh(prev => prev + 1);
    window.addEventListener('erp-db-updated', handleDbChange);
    window.addEventListener('storage', handleDbChange);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbChange);
      window.removeEventListener('storage', handleDbChange);
    };
  }, []);

  // Bank Soal List for quick task generation from CBT Bank Soal
  const bankSoalList = useMemo(() => {
    const rawCbt = db.get('cbt_bank_soal') || [];
    const rawBank = db.get('BANK_SOAL') || [];
    const rawBankLower = db.get('bank_soal') || [];
    const rawQuestions = db.get('cbt_questions') || [];
    const combinedRaw = [
      ...(Array.isArray(rawCbt) ? rawCbt : []),
      ...(Array.isArray(rawBank) ? rawBank : []),
      ...(Array.isArray(rawBankLower) ? rawBankLower : []),
      ...(Array.isArray(rawQuestions) ? rawQuestions : [])
    ];
    if (combinedRaw.length === 0) return [];

    const seenIds = new Set<string>();
    const uniqueRaw: any[] = [];
    combinedRaw.forEach(item => {
      if (!item) return;
      const idKey = String(item.id || item.BankSoalID || '').trim();
      if (idKey && !seenIds.has(idKey)) {
        seenIds.add(idKey);
        uniqueRaw.push(item);
      } else if (!idKey) {
        uniqueRaw.push(item);
      }
    });

    return uniqueRaw.map((b: any, idx: number) => {
      const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
      const mapel = b.mapel || b.Mapel || 'Mata Pelajaran';
      const rawKelas = String(b.kelas || b.Kelas || '4');
      const kelas = rawKelas.replace(/[A-Za-z]/g, '').trim() || '4';
      const kurikulum = b.kurikulum || b.Kurikulum || 'Kurikulum Merdeka';
      const guru = b.guru || b.Guru || 'Tim Guru';
      const status = b.status || b.Status || 'Siap Digunakan';
      
      let soalList: any[] = [];
      if (Array.isArray(b.soalList) && b.soalList.length > 0) {
        soalList = b.soalList;
      } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
        try {
          soalList = JSON.parse(b.SoalJSON);
        } catch {
          soalList = [];
        }
      }
      if (soalList.length === 0) {
        soalList = generate20SoalPilihanGanda({
          mapel,
          topik: b.topik || `Materi ${mapel}`,
          kelas
        });
      }
      const jumlahSoal = soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 20);

      const rawJenis = b.JenisAsesmen || b.jenisAsesmen || b.JenisUjian || b.jenisUjian || '';
      let resolvedJenis = rawJenis;
      if (!resolvedJenis || resolvedJenis === 'Sumatif Tengah Semester (STS)') {
        const bIdStr = String(id).toUpperCase();
        const bTopikStr = String(b.topik || b.Topik || '').toLowerCase();
        if (bIdStr.includes('2210') || bIdStr.includes('HARIAN') || bTopikStr.includes('harian') || b.silabusNo || b.SilabusNo) {
          resolvedJenis = 'Sumatif Harian';
        } else if (bIdStr.includes('SAS')) {
          resolvedJenis = 'Sumatif Akhir Semester (SAS)';
        } else if (bIdStr.includes('PAT') || bIdStr.includes('SAT')) {
          resolvedJenis = 'Penilaian Akhir Tahun (PAT / SAT)';
        } else if (rawJenis) {
          resolvedJenis = rawJenis;
        } else {
          resolvedJenis = 'Sumatif Harian';
        }
      }

      return {
        id,
        BankSoalID: id,
        mapel,
        Mapel: mapel,
        kelas,
        Kelas: kelas,
        kurikulum,
        Kurikulum: kurikulum,
        guru,
        Guru: guru,
        topik: b.topik || b.Topik || b.Bab || b.bab || b.subBab || b.SubBab || b.temaModul || `Materi ${mapel}`,
        jumlahSoal,
        JumlahSoal: jumlahSoal,
        tipeSoal: b.tipeSoal || b.TipeSoal || `${jumlahSoal} Pilihan Ganda (Auto-Grading)`,
        status,
        Status: status,
        soalList,
        SoalJSON: JSON.stringify(soalList),
        silabusNo: b.silabusNo !== undefined ? b.silabusNo : (b.SilabusNo !== undefined ? b.SilabusNo : (b.no !== undefined ? b.no : undefined)),
        SilabusNo: b.SilabusNo !== undefined ? b.SilabusNo : (b.silabusNo !== undefined ? b.silabusNo : (b.no !== undefined ? b.no : undefined)),
        silabusId: b.silabusId || b.SilabusID || b.silabus_id || '',
        kodeSubTugas: b.kodeSubTugas || b.KodeSubTugas || b.singkatanDanJudul || '',
        topikSubTugas: b.topikSubTugas || b.TopikSubTugas || '',
        temaModul: b.temaModul || b.TemaModul || '',
        subKe: b.subKe || b.SubKe || '',
        jenisUjian: resolvedJenis,
        jenisAsesmen: resolvedJenis,
        durasi: Number(b.durasi || b.Durasi || b.durasiMenit || b.DurasiMenit) || 60
      };
    });
  }, [showAddModal, bankSoalRefresh]);

  // Sync with DB on changes - also dual-write to legacy and modern keys
  const saveTugasList = (updated: TugasItem[]) => {
    setTugasList(updated);
    db.set('tugas_kbm', updated);
    db.set('assignments', updated);
    db.set('tugas', updated);
    db.set('TUGAS', updated);
    db.set('tugas_list', updated);
    db.set('penugasan', updated);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'tugas_kbm' } }));
    window.dispatchEvent(new Event('storage'));
  };

  const saveSubmissions = (updated: SubmissionItem[]) => {
    setSubmissions(updated);
    db.set('hasil_tugas_kbm', updated);
    db.set('assignment_submissions', updated);
    db.set('tugas_submissions', updated);
    db.set('PENGUMPULAN_TUGAS', updated);
    db.set('pengumpulan_tugas', updated);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'hasil_tugas_kbm' } }));
    window.dispatchEvent(new Event('storage'));
  };

  // Export current filtered / all tasks to real Excel .xlsx file
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredTugas.map((t, idx) => ({
        'No': idx + 1,
        'Kode Tugas': t.id,
        'Kode Modul': t.kodeModul || '',
        'Paket': t.paket || (() => {
          const kStr = String(t.kelas || '');
          return (kStr.startsWith('4') || kStr.startsWith('5') || kStr.startsWith('6')) ? 'A' : (kStr.startsWith('7') || kStr.startsWith('8') || kStr.startsWith('9')) ? 'B' : 'C';
        })(),
        'Tingkat Kelas': t.tingkatKelas || `Kelas ${t.kelas}`,
        'Rombel': t.kelas,
        'Semester': t.semester || 'Ganjil',
        'Mata Pelajaran': t.mapel,
        'Judul / Unit Pembelajaran': t.judul,
        'Kategori': t.kategori || 'Kuis Pilihan Ganda (Auto-Grading)',
        'Tenggat Waktu': t.tenggat,
        'Status Pengumpulan': t.status,
        'Jumlah Terkumpul': t.kumpul,
        'Total Siswa': t.totalSiswa,
        'Rata-rata Nilai': t.avg || 0,
        'Deskripsi': t.deskripsi || ''
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Tugas_KBM');
      XLSX.writeFile(wb, `Silabus_Tugas_KBM_Lengkap_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setSyncToast(`Berhasil mengekspor ${dataToExport.length} baris tugas ke file Excel (.xlsx)!`);
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor data ke Excel.');
    }
  };

  // Handle User Uploading their own Excel file (.xlsx / .xls / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const today = new Date();
        const mapped = rawJson.map((row, idx) => {
          // Flexible key lookup
          const judul = row['Judul / Unit Pembelajaran'] || row['Judul'] || row['judul'] || row['Unit Pembelajaran'] || row['Tema'] || row['Materi'] || row['Sub Bab'] || `Tugas Materi ${idx + 1}`;
          const mapel = row['Mata Pelajaran'] || row['Mapel'] || row['mapel'] || row['MATA PELAJARAN'] || 'Umum';
          const kelas = String(row['Rombel'] || row['Kelas'] || row['kelas'] || row['Tingkat Kelas'] || '4A');
          const kode = row['Kode Modul'] || row['Kode'] || row['kode'] || row['KODE'] || '';
          const paket = row['Paket'] || row['paket'] || (() => {
            const kStr = String(kelas || '');
            return (kStr.startsWith('4') || kStr.startsWith('5') || kStr.startsWith('6')) ? 'A' : (kStr.startsWith('7') || kStr.startsWith('8') || kStr.startsWith('9')) ? 'B' : 'C';
          })();
          const tenggat = row['Tenggat Waktu'] || row['Tenggat'] || row['tenggat'] || new Date(today.getTime() + (idx % 14 + 5) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const kategori = row['Kategori'] || row['kategori'] || 'Kuis Pilihan Ganda (Auto-Grading)';
          const deskripsi = row['Deskripsi'] || row['deskripsi'] || `Tugas Silabus ${mapel} ${kelas} - ${judul}`;
          const semester = row['Semester'] || row['semester'] || 'Ganjil';

          return {
            id: `TGS-${String(idx + 1).padStart(5, '0')}`,
            kodeModul: kode,
            paket: paket,
            kelas: kelas,
            tingkatKelas: kelas.includes('Kelas') ? kelas : `Kelas ${kelas.replace(/\D/g, '') || '4'}`,
            semester: semester,
            mapel: mapel,
            judul: String(judul),
            tenggat: String(tenggat),
            kategori: kategori,
            deskripsi: String(deskripsi),
            kumpul: Number(row['Jumlah Terkumpul'] || row['kumpul'] || 0),
            totalSiswa: Number(row['Total Siswa'] || 32),
            status: (row['Status Pengumpulan'] || row['status'] || 'Aktif Mengumpulkan') as any,
            avg: Number(row['Rata-rata Nilai'] || row['avg'] || 0),
            createdAt: today.toISOString().slice(0, 10),
            isAutoGrading: false,
            soalList: row['soalList'] || (row['SoalJSON'] ? JSON.parse(row['SoalJSON']) : [])
          };
        });

        setImportParsedData(mapped);
        setImportModalOpen(true);
      } catch (err) {
        console.error('Parse Excel error:', err);
        alert('Gagal membaca file Excel. Pastikan file dalam format .xlsx, .xls, atau .csv yang valid.');
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input so user can choose same file again if needed
    e.target.value = '';
  };

  // Commit imported rows to state and local storage
  const handleCommitImport = (mode: 'replace' | 'merge') => {
    if (importParsedData.length === 0) return;
    setIsImporting(true);

    setTimeout(() => {
      let finalData: TugasItem[] = [];
      if (mode === 'replace') {
        finalData = importParsedData;
      } else {
        // Merge without duplicate IDs
        const existingIds = new Set(tugasList.map(t => t.id));
        const newOnes = importParsedData.map((d, i) => {
          if (existingIds.has(d.id)) {
            return { ...d, id: `TGS-IMP-${Date.now()}-${i + 1}` };
          }
          return d;
        });
        finalData = [...tugasList, ...newOnes];
      }

      saveTugasList(finalData);
      setIsImporting(false);
      setImportModalOpen(false);
      setImportParsedData([]);
      setCurrentPage(1);
      setSyncToast(`Sukses mengimpor ${importParsedData.length} baris tugas dari Excel! Total sekarang ${finalData.length} tugas.`);
      setTimeout(() => setSyncToast(null), 4000);
    }, 300);
  };

  // Filtered Tugas List with Paket, Class & Semester support
  const filteredTugas = useMemo(() => {
    return tugasList.filter((t) => {
      const q = String(searchTerm || '').toLowerCase();
      const judul = String(t.judul || '').toLowerCase();
      const mapel = String(t.mapel || '').toLowerCase();
      const kelas = String(t.kelas || '').toLowerCase();
      const kode = String(t.kodeModul || '').toLowerCase();

      const matchesQ = !searchTerm || judul.includes(q) || mapel.includes(q) || kelas.includes(q) || kode.includes(q);
      const matchesKelas = isTaskMatchingClass(t, filterKelas);
      const matchesStatus = !filterStatus || t.status === filterStatus;
      const matchesKategori = !filterKategori || t.kategori === filterKategori;
      
      const tKelasStr = String(t.kelas || '');
      const matchesPaket = filterPaket === 'SEMUA' || t.paket === filterPaket || 
        (filterPaket === 'A' && (tKelasStr.startsWith('4') || tKelasStr.startsWith('5') || tKelasStr.startsWith('6'))) ||
        (filterPaket === 'B' && (tKelasStr.startsWith('7') || tKelasStr.startsWith('8') || tKelasStr.startsWith('9'))) ||
        (filterPaket === 'C' && (tKelasStr.startsWith('10') || tKelasStr.startsWith('11') || tKelasStr.startsWith('12')));
      
      const matchesSemester = filterSemester === 'SEMUA' || t.semester === filterSemester;

      return matchesQ && matchesKelas && matchesStatus && matchesKategori && matchesPaket && matchesSemester;
    });
  }, [tugasList, searchTerm, filterKelas, filterStatus, filterKategori, filterPaket, filterSemester]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredTugas.length / (pageSize || 50)));
  const paginatedTugas = useMemo(() => {
    if (pageSize >= 9999) return filteredTugas;
    const start = (currentPage - 1) * pageSize;
    return filteredTugas.slice(start, start + pageSize);
  }, [filteredTugas, currentPage, pageSize]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKelas, filterStatus, filterKategori, filterPaket, filterSemester, pageSize]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalTugas = tugasList.length;
    const tugasAktif = tugasList.filter(t => t.status === 'Aktif Mengumpulkan').length;
    const tugasSelesai = tugasList.filter(t => t.status === 'Selesai Dinilai').length;
    
    let totalKumpul = 0;
    let totalTarget = 0;
    let sumAvg = 0;
    let countAvg = 0;

    tugasList.forEach(t => {
      totalKumpul += Number(t.kumpul || 0);
      totalTarget += Number(t.totalSiswa || 0);
      if (t.avg && t.avg > 0) {
        sumAvg += Number(t.avg);
        countAvg += 1;
      }
    });

    const tingkatPenyerahan = totalTarget > 0 ? ((totalKumpul / totalTarget) * 100).toFixed(1) : '0';
    const overallAvg = countAvg > 0 ? (sumAvg / countAvg).toFixed(1) : '-';

    return {
      totalTugas,
      tugasAktif,
      tugasSelesai,
      totalKumpul,
      tingkatPenyerahan,
      overallAvg
    };
  }, [tugasList]);

  // Set default selected task for submission tab if not set
  useEffect(() => {
    if (tugasList.length > 0 && !selectedTugasId) {
      setSelectedTugasId(tugasList[0].id);
    }
  }, [tugasList, selectedTugasId]);

  // Dynamic Silabus & Kurikulum State (Loaded from MASTER_SILABUS & KURIKULUM_MODUL Sheets / Local DB)
  const [silabusRows, setSilabusRows] = useState<SilabusItemRow[]>(() => {
    const fromDb = db.get('master_silabus');
    return (fromDb && Array.isArray(fromDb)) ? fromDb : [];
  });

  const [kurikulumModulList, setKurikulumModulList] = useState<KurikulumModulItem[]>(() => {
    const fromDb = db.get('kurikulum_modul');
    return (fromDb && Array.isArray(fromDb)) ? fromDb : [];
  });

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isUploadingSheets, setIsUploadingSheets] = useState(false);
  const [isFromSpreadsheet, setIsFromSpreadsheet] = useState<boolean>(() => {
    const fromDb = db.get('master_silabus');
    return !!(fromDb && Array.isArray(fromDb) && fromDb.length > 0);
  });

  // Modal to Add / Edit Silabus Row
  const [silabusModalMode, setSilabusModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedSilabusItem, setSelectedSilabusItem] = useState<any | null>(null);
  const [silabusForm, setSilabusForm] = useState({
    no: 1,
    kodePaket: 'MOD-A4',
    kelas: '4',
    semester: 'Ganjil',
    mataPelajaran: 'Bahasa Indonesia',
    sing: 'BI',
    modul: 1,
    temaModul: '',
    subKe: 1,
    kodeSubTugas: 'BI-A4-1-1',
    topikSubTugas: '',
    status: 'Tersedia'
  });

  // Auto fetch from Google Sheets in background on component mount
  useEffect(() => {
    const fetchLiveCurriculumData = async () => {
      try {
        const scriptUrl = settings?.scriptUrl || settings?.gasUrl || getStoredGasUrl() || (db.getSingle('profil_sekolah') as any)?.gasUrl || (db.getSingle('profil_sekolah') as any)?.scriptUrl || DEFAULT_APP_CONFIG.gasUrl;
        if (!scriptUrl) return;

        // Fetch KURIKULUM_MODUL
        const resModul = await fetchFromGAS(scriptUrl, {
          action: 'GET_SHEET',
          sheetName: 'KURIKULUM_MODUL'
        });
        let pulledModul: any[] = [];
        if (resModul && resModul.data && Array.isArray(resModul.data) && resModul.data.length > 0) {
          pulledModul = resModul.data;
        } else if (resModul && Array.isArray(resModul) && resModul.length > 0) {
          pulledModul = resModul;
        }
        if (pulledModul.length > 0) {
          const validation = validateKurikulumModulSchema(pulledModul);
          if (validation.validatedData && validation.validatedData.length > 0) {
            db.set('kurikulum_modul', validation.validatedData, { skipPush: true });
            setKurikulumModulList(validation.validatedData);
          }
        }

        // Fetch MASTER_SILABUS
        const resSilabus = await fetchFromGAS(scriptUrl, {
          action: 'GET_SHEET',
          sheetName: 'MASTER_SILABUS'
        });
        let pulledSilabus: any[] = [];
        if (resSilabus && resSilabus.data && Array.isArray(resSilabus.data) && resSilabus.data.length > 0) {
          pulledSilabus = resSilabus.data;
        } else if (resSilabus && Array.isArray(resSilabus) && resSilabus.length > 0) {
          pulledSilabus = resSilabus;
        }
        if (pulledSilabus.length > 0) {
          const silabusValidation = validateMasterSilabusSchema(pulledSilabus);
          if (silabusValidation.validatedData && silabusValidation.validatedData.length > 0) {
            // Ambil referensi berkas lokal & LocalStorage agar tautan berkas tidak tertimpa/hilang
            const existingLocal = (db.get('master_silabus') || []) as any[];
            let persistedStorageLinks: Record<string, any> = {};
            try {
              const stored = localStorage.getItem('sista_silabus_file_links');
              if (stored) persistedStorageLinks = JSON.parse(stored);
            } catch {
              persistedStorageLinks = {};
            }

            const localFileMap = new Map<string, any>();
            existingLocal.forEach(item => {
              const kId = String(item.id || '').trim();
              const kNo = String(item.no || '').trim();
              const kKode = String(item.kodeSubTugas || '').trim();
              const fileData = {
                fileUrl: item.fileUrl || item.FileUrl || item.pdfUrl || '',
                fileName: item.fileName || item.FileName || '',
                directUrl: item.directUrl || item.DirectUrl || '',
                driveId: item.driveId || item.DriveId || '',
                uploadedAt: item.uploadedAt || ''
              };
              if (fileData.fileUrl) {
                if (kId) localFileMap.set(kId, fileData);
                if (kNo) localFileMap.set(`NO_${kNo}`, fileData);
                if (kKode) localFileMap.set(kKode, fileData);
              }
            });

            // Sinkronkan juga dari LocalStorage ke localFileMap
            Object.keys(persistedStorageLinks).forEach(k => {
              const val = persistedStorageLinks[k];
              if (val && val.fileUrl && !localFileMap.has(k)) {
                localFileMap.set(k, val);
              }
            });

            const mergedSilabus = silabusValidation.validatedData.map(row => {
              const kId = String(row.id || '').trim();
              const kNo = String(row.no || '').trim();
              const kKode = String(row.kodeSubTugas || '').trim();
              const matchedLocal = (kId && localFileMap.get(kId)) || (kNo && localFileMap.get(`NO_${kNo}`)) || (kKode && localFileMap.get(kKode));
              
              if (matchedLocal && !row.fileUrl) {
                return {
                  ...row,
                  fileUrl: matchedLocal.fileUrl,
                  FileUrl: matchedLocal.fileUrl,
                  pdfUrl: matchedLocal.fileUrl,
                  fileName: row.fileName || matchedLocal.fileName,
                  directUrl: row.directUrl || matchedLocal.directUrl,
                  driveId: row.driveId || matchedLocal.driveId,
                  uploadedAt: row.uploadedAt || matchedLocal.uploadedAt
                };
              }

              // Jika remote row membawa link baru, simpan ke memori persisten (hindari data: base64 besar)
              if (row.fileUrl && !row.fileUrl.startsWith('data:') && row.fileUrl.length <= 2000 && (kId || kNo || kKode)) {
                const linkEntry = {
                  id: kId,
                  no: kNo,
                  fileUrl: row.fileUrl,
                  fileName: row.fileName,
                  directUrl: row.directUrl,
                  driveId: row.driveId,
                  uploadedAt: row.uploadedAt || new Date().toISOString()
                };
                if (kId) persistedStorageLinks[kId] = linkEntry;
                if (kNo) persistedStorageLinks[`NO_${kNo}`] = linkEntry;
                if (kKode) persistedStorageLinks[kKode] = linkEntry;
              }

              return row;
            });

            try {
              localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
            } catch {
              try {
                localStorage.removeItem('sista_cached_drive_modul_files');
                localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
              } catch {
                // ignore
              }
            }

            db.set('master_silabus', mergedSilabus, { skipPush: true });
            setSilabusRows(mergedSilabus);
            setIsFromSpreadsheet(true);
          }
        }
      } catch (err) {
        console.warn("Background auto-sync for curriculum modul/silabus:", err);
      }
    };

    fetchLiveCurriculumData();
  }, [settings?.scriptUrl, settings?.gasUrl]);
  useEffect(() => {
    const handleUpdate = (e?: any) => {
      const detailKey = e?.detail?.key;
      if (!detailKey || detailKey === 'master_silabus' || detailKey === 'kurikulum_modul') {
        const fromDbSilabus = db.get('master_silabus');
        if (fromDbSilabus && Array.isArray(fromDbSilabus)) {
          setSilabusRows(fromDbSilabus);
          setIsFromSpreadsheet(fromDbSilabus.length > 0);
        }
        const fromDbModul = db.get('kurikulum_modul');
        if (fromDbModul && Array.isArray(fromDbModul)) {
          setKurikulumModulList(fromDbModul);
        }
      }
      if (!detailKey || detailKey === 'tugas_kbm' || detailKey === 'assignments') {
        const fromDbTugas = (db.get('tugas_kbm') || db.get('assignments')) as TugasItem[];
        if (fromDbTugas && Array.isArray(fromDbTugas)) {
          setTugasList(fromDbTugas);
        }
      }
      if (!detailKey || detailKey === 'hasil_tugas_kbm' || detailKey === 'assignment_submissions') {
        const fromDbSubs = (db.get('hasil_tugas_kbm') || db.get('assignment_submissions')) as SubmissionItem[];
        if (fromDbSubs && Array.isArray(fromDbSubs)) {
          setSubmissions(fromDbSubs);
        }
      }
    };
    window.addEventListener('erp-db-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Helper to Pull Live Silabus & Modul from Google Spreadsheet
  const handlePullSilabusFromSpreadsheet = async () => {
    setIsSyncingSheets(true);
    setSyncToast('Menghubungi Google Apps Script untuk menarik data...');
    try {
      const scriptUrl = settings?.scriptUrl || settings?.gasUrl || getStoredGasUrl() || (db.getSingle('profil_sekolah') as any)?.gasUrl || (db.getSingle('profil_sekolah') as any)?.scriptUrl || DEFAULT_APP_CONFIG.gasUrl;
      if (!scriptUrl) {
        alert('URL Google Apps Script belum dikonfigurasi. Silakan simpan URL Web App Anda di menu Pengaturan.');
        return;
      }
      
      const resSilabus = await fetchFromGAS(scriptUrl, {
        action: 'GET_SHEET',
        sheetName: 'MASTER_SILABUS'
      });

      let pulledSilabus: any[] = [];
      if (resSilabus && resSilabus.data && Array.isArray(resSilabus.data) && resSilabus.data.length > 0) {
        pulledSilabus = resSilabus.data;
      } else if (resSilabus && Array.isArray(resSilabus)) {
        pulledSilabus = resSilabus;
      }

      const resModul = await fetchFromGAS(scriptUrl, {
        action: 'GET_SHEET',
        sheetName: 'KURIKULUM_MODUL'
      });

      let pulledModul: any[] = [];
      if (resModul && resModul.data && Array.isArray(resModul.data) && resModul.data.length > 0) {
        pulledModul = resModul.data;
      } else if (resModul && Array.isArray(resModul)) {
        pulledModul = resModul;
      }

      if (pulledSilabus.length > 0) {
        const silabusValidation = validateMasterSilabusSchema(pulledSilabus);
        const existingLocal = (db.get('master_silabus') || []) as any[];
        let persistedStorageLinks: Record<string, any> = {};
        try {
          const stored = localStorage.getItem('sista_silabus_file_links');
          if (stored) persistedStorageLinks = JSON.parse(stored);
        } catch {
          persistedStorageLinks = {};
        }

        const localFileMap = new Map<string, any>();
        existingLocal.forEach(item => {
          const kId = String(item.id || '').trim();
          const kNo = String(item.no || '').trim();
          const kKode = String(item.kodeSubTugas || '').trim();
          const fileData = {
            fileUrl: item.fileUrl || item.FileUrl || item.pdfUrl || '',
            fileName: item.fileName || item.FileName || '',
            directUrl: item.directUrl || item.DirectUrl || '',
            driveId: item.driveId || item.DriveId || '',
            uploadedAt: item.uploadedAt || ''
          };
          if (fileData.fileUrl) {
            if (kId) localFileMap.set(kId, fileData);
            if (kNo) localFileMap.set(`NO_${kNo}`, fileData);
            if (kKode) localFileMap.set(kKode, fileData);
          }
        });

        Object.keys(persistedStorageLinks).forEach(k => {
          const val = persistedStorageLinks[k];
          if (val && val.fileUrl && !localFileMap.has(k)) {
            localFileMap.set(k, val);
          }
        });

        const mergedSilabus = silabusValidation.validatedData.map(row => {
          const kId = String(row.id || '').trim();
          const kNo = String(row.no || '').trim();
          const kKode = String(row.kodeSubTugas || '').trim();
          const matchedLocal = (kId && localFileMap.get(kId)) || (kNo && localFileMap.get(`NO_${kNo}`)) || (kKode && localFileMap.get(kKode));
          
          if (matchedLocal && !row.fileUrl) {
            return {
              ...row,
              fileUrl: matchedLocal.fileUrl,
              FileUrl: matchedLocal.fileUrl,
              pdfUrl: matchedLocal.fileUrl,
              fileName: row.fileName || matchedLocal.fileName,
              directUrl: row.directUrl || matchedLocal.directUrl,
              driveId: row.driveId || matchedLocal.driveId,
              uploadedAt: row.uploadedAt || matchedLocal.uploadedAt
            };
          }

          if (row.fileUrl && !row.fileUrl.startsWith('data:') && row.fileUrl.length <= 2000 && (kId || kNo || kKode)) {
            const linkEntry = {
              id: kId,
              no: kNo,
              fileUrl: row.fileUrl,
              fileName: row.fileName,
              directUrl: row.directUrl,
              driveId: row.driveId,
              uploadedAt: row.uploadedAt || new Date().toISOString()
            };
            if (kId) persistedStorageLinks[kId] = linkEntry;
            if (kNo) persistedStorageLinks[`NO_${kNo}`] = linkEntry;
            if (kKode) persistedStorageLinks[kKode] = linkEntry;
          }

          return row;
        });

        try {
          localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
        } catch {
          try {
            localStorage.removeItem('sista_cached_drive_modul_files');
            localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
          } catch {
            // ignore
          }
        }

        db.set('master_silabus', mergedSilabus);
        setSilabusRows(mergedSilabus);
        setIsFromSpreadsheet(true);
      }
      if (pulledModul.length > 0) {
        db.set('kurikulum_modul', pulledModul);
        setKurikulumModulList(pulledModul);
      }

      if (pulledSilabus.length === 0 && pulledModul.length === 0) {
        setSyncToast('Sheet MASTER_SILABUS & KURIKULUM_MODUL di spreadsheet masih kosong. Silakan gunakan tombol "Unggah ke Spreadsheet".');
      } else {
        setSyncToast(`Berhasil menarik ${pulledSilabus.length || silabusRows.length} data Silabus & ${pulledModul.length || kurikulumModulList.length} Modul langsung dari Google Spreadsheet!`);
      }
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      console.error("Error pulling silabus:", err);
      alert('Gagal mengambil data dari Google Spreadsheet:\n' + (err?.message || err) + '\n\nPastikan URL Web App Google Apps Script telah disetel dan di-deploy dengan hak akses "Anyone".');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Helper to Push Live Silabus & Modul dataset to Google Spreadsheet
  const handlePushSilabusToSpreadsheet = async () => {
    const totalSilabus = silabusRows.length;
    const totalModul = kurikulumModulList.length;

    if (!confirm(`Unggah ${totalSilabus} Sub-Tugas Silabus dan ${totalModul} Modul ke Google Spreadsheet (sheet MASTER_SILABUS & KURIKULUM_MODUL)?`)) {
      return;
    }
    
    setIsUploadingSheets(true);
    setSyncToast('Menyiapkan data dan menghubungkan ke Google Apps Script...');
    
    try {
      const scriptUrl = settings?.scriptUrl || settings?.gasUrl || getStoredGasUrl() || (db.getSingle('profil_sekolah') as any)?.gasUrl || (db.getSingle('profil_sekolah') as any)?.scriptUrl || DEFAULT_APP_CONFIG.gasUrl;
      if (!scriptUrl) {
        alert('URL Google Apps Script belum dikonfigurasi. Silakan simpan URL Web App Anda di menu Pengaturan.');
        return;
      }

      // 1. Simpan ke database lokal terlebih dahulu agar selalu aman
      db.set('master_silabus', silabusRows);
      db.set('kurikulum_modul', kurikulumModulList);

      // Cache tautan file persisten dari LocalStorage untuk mencegah kehilangan link
      let persistedStorageLinks: Record<string, any> = {};
      try {
        const stored = localStorage.getItem('sista_silabus_file_links');
        if (stored) persistedStorageLinks = JSON.parse(stored);
      } catch {
        persistedStorageLinks = {};
      }

      // 2. Format 15+2 kolom standar MASTER_SILABUS dengan proteksi tautan berkas
      const cleanSilabusRows = silabusRows.map((r, idx) => {
        const kId = String(r.id || '').trim();
        const kNo = String(r.no || idx + 1).trim();
        const kKode = String(r.kodeSubTugas || '').trim();
        const fallback = (kId && persistedStorageLinks[kId]) || (kNo && (persistedStorageLinks[kNo] || persistedStorageLinks[`NO_${kNo}`])) || (kKode && persistedStorageLinks[kKode]);
        const fileUrl = r.fileUrl || r.FileUrl || r.pdfUrl || r.PdfUrl || r.linkMateri || fallback?.fileUrl || '';
        const fileName = r.fileName || r.FileName || fallback?.fileName || (fileUrl ? `Modul_${r.no || idx + 1}_${r.NamaMapel || r.mataPelajaran || 'Silabus'}.pdf` : '');

        return {
          id: r.id || `MS-${r.no || idx + 1}-${r.subKe || '1'}-${idx + 1}`,
          no: Number(r.no) || idx + 1,
          kodeJenjang: r.kodeJenjang || r.kodePaket || r.namaModulLengkap || '',
          Jenjang: r.Jenjang || r.paket || (['4', '5', '6'].includes(String(r.kelas)) ? 'A' : ['7', '8', '9'].includes(String(r.kelas)) ? 'B' : 'C'),
          kelas: r.kelas || '',
          semester: r.semester || 'SM-I',
          kodeMapel: r.kodeMapel || r.singkatan || r.sing || '',
          NamaMapel: r.NamaMapel || r.mataPelajaran || r.mapel || '',
          noModul: r.noModul || r.modulNo || r.noModulAngka || r.modul || 1,
          temaModul: r.temaModul || r.namaModulBab || r.babUnit || '',
          subKe: r.subKe || `Unit ${r.noSubModul || 1}`,
          kodeSubTugas: r.kodeSubTugas || r.singkatanDanJudul || '',
          topikSubTugas: r.topikSubTugas || r.judulSubModul || '',
          status: r.status || r.statusSoal || 'Tersedia',
          keterangan: r.keterangan || r.catatan || '',
          fileUrl,
          fileName
        };
      });

      // 3. Format 11 kolom standar KURIKULUM_MODUL
      const cleanModulRows = kurikulumModulList.map((m, idx) => ({
        id: m.id || `MOD-${idx + 1}`,
        noModul: m.noModul || m.modulNo || idx + 1,
        kodeModul: m.kodeModul || m.kode || '',
        judulModul: m.judulModul || m.nama || m.temaModul || '',
        kodeMapel: m.kodeMapel || m.singkatan || m.singkatanMapel || '',
        NamaMapel: m.NamaMapel || m.mataPelajaran || m.mapel || '',
        Jenjang: m.Jenjang || m.paket || '',
        kelas: m.kelas || '',
        semester: m.semester || '',
        Unit: m.Unit || m.babUnit || '',
        materiPokok: m.materiPokok ? (Array.isArray(m.materiPokok) ? m.materiPokok.join(', ') : String(m.materiPokok)) : ''
      }));

      setSyncToast(`[1/2] Mengunggah ${cleanSilabusRows.length} data MASTER_SILABUS...`);

      // 4. Kirim MASTER_SILABUS (dengan batching bila jumlah baris besar)
      const BATCH_SIZE = 300;
      if (cleanSilabusRows.length <= BATCH_SIZE) {
        const resSilabus = await fetchFromGAS(scriptUrl, {
          action: 'SYNC_SHEET',
          sheetName: 'MASTER_SILABUS',
          table: 'MASTER_SILABUS',
          data: cleanSilabusRows,
          append: false
        });
        if (resSilabus?.status === 'error' || resSilabus?.error) {
          throw new Error(resSilabus.message || resSilabus.error || 'Gagal sinkron MASTER_SILABUS');
        }
      } else {
        // First batch: clear and insert
        const firstChunk = cleanSilabusRows.slice(0, BATCH_SIZE);
        await fetchFromGAS(scriptUrl, {
          action: 'SYNC_SHEET',
          sheetName: 'MASTER_SILABUS',
          table: 'MASTER_SILABUS',
          data: firstChunk,
          append: false
        });

        // Remaining batches: append
        for (let i = BATCH_SIZE; i < cleanSilabusRows.length; i += BATCH_SIZE) {
          const chunk = cleanSilabusRows.slice(i, i + BATCH_SIZE);
          setSyncToast(`[1/2] Mengunggah MASTER_SILABUS baris ${i + 1} - ${Math.min(i + BATCH_SIZE, cleanSilabusRows.length)}...`);
          await fetchFromGAS(scriptUrl, {
            action: 'SYNC_SHEET',
            sheetName: 'MASTER_SILABUS',
            table: 'MASTER_SILABUS',
            data: chunk,
            append: true
          });
        }
      }

      setSyncToast(`[2/2] Mengunggah ${cleanModulRows.length} data KURIKULUM_MODUL...`);

      // 5. Kirim KURIKULUM_MODUL
      if (cleanModulRows.length <= BATCH_SIZE) {
        const resModul = await fetchFromGAS(scriptUrl, {
          action: 'SYNC_SHEET',
          sheetName: 'KURIKULUM_MODUL',
          table: 'KURIKULUM_MODUL',
          data: cleanModulRows,
          append: false
        });
        if (resModul?.status === 'error' || resModul?.error) {
          throw new Error(resModul.message || resModul.error || 'Gagal sinkron KURIKULUM_MODUL');
        }
      } else {
        const firstModulChunk = cleanModulRows.slice(0, BATCH_SIZE);
        await fetchFromGAS(scriptUrl, {
          action: 'SYNC_SHEET',
          sheetName: 'KURIKULUM_MODUL',
          table: 'KURIKULUM_MODUL',
          data: firstModulChunk,
          append: false
        });

        for (let i = BATCH_SIZE; i < cleanModulRows.length; i += BATCH_SIZE) {
          const chunk = cleanModulRows.slice(i, i + BATCH_SIZE);
          setSyncToast(`[2/3] Mengunggah KURIKULUM_MODUL baris ${i + 1} - ${Math.min(i + BATCH_SIZE, cleanModulRows.length)}...`);
          await fetchFromGAS(scriptUrl, {
            action: 'SYNC_SHEET',
            sheetName: 'KURIKULUM_MODUL',
            table: 'KURIKULUM_MODUL',
            data: chunk,
            append: true
          });
        }
      }

      // 6. Auto-Formulasikan dan Kirim Sheet CP_ATP (9 Kolom Standar)
      setSyncToast(`[3/3] Memformulasikan dan mengunggah data CP_ATP...`);
      const synthesizedCpAtp = generateCpAtpListFromKurikulumModul(kurikulumModulList, silabusRows);
      db.set('cp_atp', synthesizedCpAtp);

      const cleanCpAtpRows = synthesizedCpAtp.map((item, idx) => ({
        CpaID: item.CpaID || `CP-${idx + 1}`,
        Mapel: item.Mapel || 'Umum',
        Fase: item.Fase || 'Fase B',
        Elemen: item.Elemen || 'Pemahaman Konsep',
        CapaianPembelajaran: item.CapaianPembelajaran || '-',
        TujuanPembelajaran: item.TujuanPembelajaran || '-',
        AlurTujuan: item.AlurTujuan || '-',
        Kelas: item.Kelas || 'Kelas 4',
        Semester: item.Semester || 'Ganjil'
      }));

      if (cleanCpAtpRows.length > 0) {
        await fetchFromGAS(scriptUrl, {
          action: 'SYNC_SHEET',
          sheetName: 'CP_ATP',
          table: 'CP_ATP',
          data: cleanCpAtpRows,
          append: false
        });
      }

      setIsFromSpreadsheet(true);
      setSyncToast(`Sukses! ${cleanSilabusRows.length} Silabus, ${cleanModulRows.length} Modul & ${cleanCpAtpRows.length} CP/ATP berhasil diunggah ke Google Spreadsheet!`);
      setTimeout(() => setSyncToast(null), 6000);
      alert(`Berhasil!\n\n1. ${cleanSilabusRows.length} baris data MASTER_SILABUS\n2. ${cleanModulRows.length} data KURIKULUM_MODUL\n3. ${cleanCpAtpRows.length} Capaian & Alur Pembelajaran (CP_ATP)\n\nSemua data telah sukses diintegrasikan dan diunggah ke Google Spreadsheet Anda.`);
    } catch (err: any) {
      console.error("Gagal unggah silabus ke spreadsheet:", err);
      const errMsg = err?.message || JSON.stringify(err);
      alert(
        `Pemberitahuan Sinkronisasi:\n${errMsg}\n\n` +
        `Catatan:\n` +
        `1. Data Silabus & Modul telah disimpan dengan aman di database lokal aplikasi.\n` +
        `2. Pastikan Anda telah menerapkan kode Code.gs terbaru di Apps Script dan melakukan Deploy Ulang (Web App -> Anyone).\n` +
        `3. Anda juga dapat menggunakan tombol 'Unduh Excel Master (15 Kolom Rapi)' lalu mengimpornya langsung ke Google Sheets.`
      );
    } finally {
      setIsUploadingSheets(false);
    }
  };

  const handleOpenAddSilabusModal = () => {
    const nextNo = silabusRows.length > 0 ? Math.max(...silabusRows.map(r => Number(r.no) || 0)) + 1 : 1;
    const defaultKelas = silabusKelas !== 'SEMUA' ? silabusKelas : '4';
    const defaultPaket = ['4', '5', '6'].includes(defaultKelas) ? 'A' : ['7', '8', '9'].includes(defaultKelas) ? 'B' : 'C';
    setSilabusForm({
      no: nextNo,
      kodePaket: `MOD-${defaultPaket}${defaultKelas}`,
      kelas: defaultKelas,
      semester: silabusSemester !== 'SEMUA' ? silabusSemester : 'Ganjil',
      mataPelajaran: silabusMapel !== 'SEMUA' ? silabusMapel : 'Bahasa Indonesia',
      sing: 'BI',
      modul: 1,
      temaModul: 'Mengenal Lingkungan Belajar',
      subKe: 1,
      kodeSubTugas: `BI-${defaultPaket}${defaultKelas}-1-${nextNo}`,
      topikSubTugas: '',
      status: 'Tersedia'
    });
    setSelectedSilabusItem(null);
    setSilabusModalMode('add');
  };

  const handleOpenEditSilabusModal = (r: any) => {
    setSelectedSilabusItem(r);
    setSilabusForm({
      no: r.no,
      kodePaket: r.kodePaket || '',
      kelas: String(r.kelas || '4'),
      semester: r.semester || 'Ganjil',
      mataPelajaran: r.mataPelajaran || '',
      sing: r.sing || '',
      modul: Number(r.modul) || 1,
      temaModul: r.temaModul || '',
      subKe: Number(r.subKe) || 1,
      kodeSubTugas: r.kodeSubTugas || '',
      topikSubTugas: r.topikSubTugas || '',
      status: r.status || 'Tersedia'
    });
    setSilabusModalMode('edit');
  };

  const handleSaveSilabusForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!silabusForm.topikSubTugas.trim() || !silabusForm.mataPelajaran.trim()) {
      alert('Mohon isi Mata Pelajaran dan Topik Sub-Tugas.');
      return;
    }

    const calculatedPaket = ['4', '5', '6'].includes(silabusForm.kelas) ? 'A' : ['7', '8', '9'].includes(silabusForm.kelas) ? 'B' : 'C';

    if (silabusModalMode === 'add') {
      const newItem: SilabusItemRow = {
        id: `MS-${calculatedPaket}-${silabusForm.kelas}-${silabusForm.modul}-${silabusForm.subKe}-${Date.now()}`,
        no: Number(silabusForm.no),
        kodePaket: silabusForm.kodePaket || `MOD-${calculatedPaket}${silabusForm.kelas}`,
        kelas: Number(silabusForm.kelas) || 4,
        semester: silabusForm.semester as 'Ganjil' | 'Genap',
        mataPelajaran: silabusForm.mataPelajaran.trim(),
        sing: silabusForm.sing.trim() || silabusForm.mataPelajaran.slice(0, 3).toUpperCase(),
        modul: Number(silabusForm.modul) || 1,
        temaModul: silabusForm.temaModul.trim() || 'Modul Pembelajaran',
        subKe: String(silabusForm.subKe || '1'),
        kodeSubTugas: silabusForm.kodeSubTugas.trim() || `${silabusForm.sing}-${calculatedPaket}${silabusForm.kelas}-${silabusForm.modul}-${silabusForm.subKe}`,
        topikSubTugas: silabusForm.topikSubTugas.trim(),
        status: silabusForm.status || 'Tersedia',
        paket: calculatedPaket
      };

      const updated = [newItem, ...silabusRows];
      setSilabusRows(updated);
      db.set('master_silabus', updated);
      setSyncToast(`Berhasil menambahkan sub-tugas "${newItem.topikSubTugas}" ke Silabus Master!`);
    } else if (silabusModalMode === 'edit' && selectedSilabusItem) {
      const updated = silabusRows.map(r => {
        if (r.no === selectedSilabusItem.no && r.kodeSubTugas === selectedSilabusItem.kodeSubTugas) {
          return {
            ...r,
            no: Number(silabusForm.no),
            kodePaket: silabusForm.kodePaket,
            kelas: Number(silabusForm.kelas),
            semester: silabusForm.semester as 'Ganjil' | 'Genap',
            mataPelajaran: silabusForm.mataPelajaran.trim(),
            sing: silabusForm.sing.trim(),
            modul: Number(silabusForm.modul),
            temaModul: silabusForm.temaModul.trim(),
            subKe: String(silabusForm.subKe || '1'),
            kodeSubTugas: silabusForm.kodeSubTugas.trim(),
            topikSubTugas: silabusForm.topikSubTugas.trim(),
            status: silabusForm.status,
            paket: calculatedPaket
          };
        }
        return r;
      });
      setSilabusRows(updated);
      db.set('master_silabus', updated);
      setSyncToast(`Berhasil memperbarui data sub-tugas "${silabusForm.topikSubTugas}"!`);
    }

    setSilabusModalMode(null);
    setSelectedSilabusItem(null);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleDeleteSilabusItem = (itemToDelete: any) => {
    if (!confirm(`Hapus sub-tugas "${itemToDelete.topikSubTugas}" (${itemToDelete.kodeSubTugas}) dari Silabus Master?`)) {
      return;
    }
    const updated = silabusRows.filter(r => !(r.no === itemToDelete.no && r.kodeSubTugas === itemToDelete.kodeSubTugas));
    setSilabusRows(updated);
    db.set('master_silabus', updated);
    setSyncToast(`Sub-tugas silabus berhasil dihapus.`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Silabus Master Tab States
  const [silabusSearch, setSilabusSearch] = useState('');
  const [silabusPaket, setSilabusPaket] = useState<string>('SEMUA'); // 'SEMUA', 'A', 'B', 'C'
  const [silabusKelas, setSilabusKelas] = useState<string>('SEMUA'); // 'SEMUA', '4'..'12'
  const [silabusSemester, setSilabusSemester] = useState<string>('SEMUA'); // 'SEMUA',  'Ganjil', 'Genap'
  const [silabusMapel, setSilabusMapel] = useState<string>('SEMUA');
  const [silabusStatusFilter, setSilabusStatusFilter] = useState<'SEMUA' | 'SUDAH' | 'BELUM'>('SEMUA');
  const [silabusPdfFilter, setSilabusPdfFilter] = useState<'SEMUA' | 'ADA_PDF' | 'BELUM_PDF'>('SEMUA');
  const [silabusSoalFilter, setSilabusSoalFilter] = useState<'SEMUA' | 'ADA_SOAL' | 'BELUM_SOAL'>('SEMUA');
  const [silabusPage, setSilabusPage] = useState<number>(1);
  const [silabusPageSize, setSilabusPageSize] = useState<number>(50);

  // Quick Link PDF & File Picker Modal State
  const [quickLinkPdfModal, setQuickLinkPdfModal] = useState<any | null>(null);
  const [quickPdfUrl, setQuickPdfUrl] = useState('');
  const [quickPdfName, setQuickPdfName] = useState('');
  const [renamePhysicalFileOnDrive, setRenamePhysicalFileOnDrive] = useState(true);
  const [quickPickerSearch, setQuickPickerSearch] = useState('');
  const [quickPickerFilter, setQuickPickerFilter] = useState<'RECOMMENDED' | 'KELAS' | 'ALL'>('RECOMMENDED');
  const [quickPickerTab, setQuickPickerTab] = useState<'PICKER' | 'MANUAL'>('PICKER');
  const [quickPickerSelectedDocId, setQuickPickerSelectedDocId] = useState<string | null>(null);

  // Bulk Operations State for Silabus Master (Tautkan PDF & Buat Soal Sekaligus Banyak)
  const [selectedSilabusKeys, setSelectedSilabusKeys] = useState<string[]>([]);
  const [showBulkLinkPdfModal, setShowBulkLinkPdfModal] = useState(false);
  const [bulkLinkPdfUrl, setBulkLinkPdfUrl] = useState('');
  const [bulkLinkPdfName, setBulkLinkPdfName] = useState('');
  const [bulkLinkPdfSource, setBulkLinkPdfSource] = useState<'URL' | 'UPLOAD'>('URL');
  const [bulkLinkPdfUploadFile, setBulkLinkPdfUploadFile] = useState<File | null>(null);
  const [isProcessingBulkPdfLink, setIsProcessingBulkPdfLink] = useState(false);
  const [bulkLinkPdfRenameDrive, setBulkLinkPdfRenameDrive] = useState(true);

  // Helper membuat nama standar kodeMapel-noModul-temaModul sesuai sheet MASTER_SILABUS
  const getStandardBulkPdfName = (targetKeys?: string[]): string => {
    const keys = targetKeys || selectedSilabusKeys;
    let first: any = null;
    if (keys && keys.length > 0) {
      const keySet = new Set(keys);
      first = silabusRows.find(r => {
        const k = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
        return keySet.has(k) || keySet.has(String(r.id)) || keySet.has(String(r.no));
      });
    }
    if (!first) {
      const targetItems = getSelectedSilabusItems();
      if (targetItems.length > 0) first = targetItems[0];
    }
    if (!first) return 'Modul_Materi.pdf';

    return deriveFileNameFromUrlAndItem('', first, [], 'BULK_MODUL').fileName;
  };

  // Otomatis isi Nama Berkas standar (kodeMapel-noModul-temaModul) dan aktifkan rename Google Drive saat modal dibuka
  useEffect(() => {
    if (showBulkLinkPdfModal && selectedSilabusKeys.length > 0) {
      const autoName = getStandardBulkPdfName();
      if (autoName) {
        setBulkLinkPdfName(autoName);
      }
      setBulkLinkPdfRenameDrive(true);
    }
  }, [showBulkLinkPdfModal, selectedSilabusKeys]);

  const [showBulkGenerateSoalModal, setShowBulkGenerateSoalModal] = useState(false);
  const [bulkJumlahSoalPerJudul, setBulkJumlahSoalPerJudul] = useState(20);
  const [isGeneratingBulkSoal, setIsGeneratingBulkSoal] = useState(false);

  // States untuk Fitur "Buatkan Tugas Sekaligus" & "Batalkan Tugas Sekaligus"
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [isProcessingBulkAssign, setIsProcessingBulkAssign] = useState(false);
  const [bulkAssignSkipExisting, setBulkAssignSkipExisting] = useState(true);
  const [bulkAssignAllRombels, setBulkAssignAllRombels] = useState(true);
  const [bulkAssignSemesterOverride, setBulkAssignSemesterOverride] = useState<'AUTO' | 'GANJIL' | 'GENAP'>('AUTO');
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; title: string } | null>(null);

  // Helper to strictly normalize Paket letter: 'A' | 'B' | 'C' | ''
  const normalizePaketLetter = (r: any): 'A' | 'B' | 'C' | '' => {
    if (!r) return '';
    const pRaw = String(r.paket || r.Jenjang || r.jenjang || r.kodePaket || r.kodeJenjang || '').toUpperCase().trim();
    if (pRaw.includes('PAKET A') || pRaw === 'A' || pRaw.includes('SD') || pRaw.includes('MI')) return 'A';
    if (pRaw.includes('PAKET B') || pRaw === 'B' || pRaw.includes('SMP') || pRaw.includes('MTS')) return 'B';
    if (pRaw.includes('PAKET C') || pRaw === 'C' || pRaw.includes('SMA') || pRaw.includes('SMK') || pRaw.includes('MA')) return 'C';

    const cleanGrade = String(r.kelas || '').replace(/\D/g, '');
    if (cleanGrade) {
      const num = Number(cleanGrade);
      if (num >= 1 && num <= 6) return 'A';
      if (num >= 7 && num <= 9) return 'B';
      if (num >= 10 && num <= 12) return 'C';
    }
    return '';
  };

  // Helper to check if silabus row has PDF
  const hasPdfForSilabus = (r: any): boolean => {
    if (!r) return false;
    return Boolean(
      r.fileUrl ||
      r.FileUrl ||
      r.pdfUrl ||
      r.PdfUrl ||
      r.berkasUrl ||
      r.fileDriveId ||
      r.driveFileId ||
      r.linkMateri ||
      r.fileMateriUrl ||
      (Array.isArray(r.berkas) && r.berkas.length > 0)
    );
  };

  // Helper to check if silabus row has generated Bank Soal
  const getBankSoalForSilabus = (r: any): any | null => {
    if (!r) return null;
    const cleanKelas = String(r.kelas || '').replace(/\D/g, '');
    const pLetter = normalizePaketLetter(r);
    const targetId = `BNK-${pLetter}${cleanKelas}-${String(r.no || '').padStart(3, '0')}`;
    const rNo = Number(r.no);
    const rNoStr = String(r.no || '').trim();
    const rIdStr = String(r.id || '').trim();
    const rKode = String(r.kodeSubTugas || '').trim().toLowerCase();
    const rTopik = String(r.topikSubTugas || r.temaModul || '').trim().toLowerCase();
    const rMapel = String(r.mataPelajaran || '').trim().toLowerCase();

    // 1. Direct status flag from spreadsheet or local store
    const rawStatus = String(r.statusSoal || r.StatusSoal || r.status_soal || '').trim().toLowerCase();
    if (rawStatus === 'tersedia' || rawStatus === 'ada' || rawStatus.includes('ada') || rawStatus.includes('tersedia') || r.bankSoalId || r.BankSoalID) {
      return { id: r.bankSoalId || r.BankSoalID || targetId, jumlahSoal: 20, mapel: r.mataPelajaran, kelas: r.kelas };
    }

    // 2. Check in memoized bankSoalList
    if (Array.isArray(bankSoalList) && bankSoalList.length > 0) {
      const found = bankSoalList.find((b: any) => {
        if (!b) return false;
        const bId = String(b.id || b.BankSoalID || '').trim();
        const bIdUpper = bId.toUpperCase();
        if (bId === targetId) return true;
        if (r.bankSoalId && (bId === r.bankSoalId || b.BankSoalID === r.bankSoalId)) return true;

        // Match 2210 or specific silabus no
        if (rNoStr && (bId === rNoStr || bId.includes(rNoStr) || bIdUpper.includes(`BNK-${rNoStr}`))) return true;
        if (rIdStr && (bId === rIdStr || bId.includes(rIdStr))) return true;
        if (rNo && (Number(b.silabusNo) === rNo || Number(b.SilabusNo) === rNo || Number(b.no) === rNo)) return true;
        if (rKode && b.kodeSubTugas && String(b.kodeSubTugas).trim().toLowerCase() === rKode) return true;

        // Check if b.topik or b.judul contains 2210 or rNoStr
        const bTopik = String(b.topik || b.Topik || b.temaModul || '').trim().toLowerCase();
        if (rNoStr && rNoStr.length >= 3 && bTopik.includes(rNoStr)) return true;
        
        const bGrade = String(b.kelas || b.Kelas || '').replace(/\D/g, '');
        const bMapel = String(b.mapel || b.Mapel || '').trim().toLowerCase();
        if (bGrade === cleanKelas && bMapel === rMapel) {
          if (rTopik && (bTopik === rTopik || bTopik.includes(rTopik) || rTopik.includes(bTopik))) {
            return true;
          }
        }
        return false;
      });

      if (found) return found;
    }

    // 3. Direct fallback check in raw cbt_bank_soal, BANK_SOAL, and cbt_questions
    const rawAll = [
      ...(db.get('cbt_bank_soal') || []),
      ...(db.get('BANK_SOAL') || []),
      ...(db.get('bank_soal') || [])
    ];
    if (Array.isArray(rawAll) && rawAll.length > 0) {
      const directFound = rawAll.find((b: any) => {
        if (!b) return false;
        const bId = String(b.id || b.BankSoalID || '').trim();
        const bIdUpper = bId.toUpperCase();
        if (rNoStr && (bId === rNoStr || bId.includes(rNoStr) || bIdUpper.includes(`BNK-${rNoStr}`))) return true;
        if (rIdStr && (bId === rIdStr || bId.includes(rIdStr))) return true;
        if (rNo && (Number(b.silabusNo) === rNo || Number(b.SilabusNo) === rNo || Number(b.no) === rNo || bId.includes(String(rNo)))) return true;
        if (bId === targetId || (r.bankSoalId && bId === r.bankSoalId)) return true;
        if (rKode && b.kodeSubTugas && String(b.kodeSubTugas).trim().toLowerCase() === rKode) return true;
        return false;
      });
      if (directFound) return directFound;
    }

    // 4. Check in cbt_questions / SOAL directly
    const rawQuestions = [...(db.get('cbt_questions') || []), ...(db.get('SOAL') || [])];
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      const qFound = rawQuestions.find((q: any) => {
        if (!q) return false;
        const qBankId = String(q.bankSoalId || q.BankSoalID || '').trim();
        const qSilabusNo = String(q.silabusNo || q.SilabusNo || '').trim();
        if (rNoStr && (qBankId.includes(rNoStr) || qSilabusNo === rNoStr)) return true;
        if (rIdStr && qBankId.includes(rIdStr)) return true;
        return false;
      });
      if (qFound) {
        return { id: qFound.bankSoalId || `BNK-${rNoStr || '2210'}`, jumlahSoal: 20, mapel: r.mataPelajaran, kelas: r.kelas };
      }
    }

    // Special match for silabus 2210 if explicitly created
    if (rNoStr === '2210' || rIdStr.includes('2210')) {
      const any2210 = rawAll.find((b: any) => String(b?.id || b?.BankSoalID || '').includes('2210')) ||
                      (Array.isArray(bankSoalList) ? bankSoalList.find((b: any) => String(b?.id || b?.BankSoalID || '').includes('2210')) : null);
      if (any2210) return any2210;
    }

    return null;
  };

  // Helper to find all assigned tasks for a silabus row with strict grade & class matching
  const getAssignedTasksForSilabus = (r: any): TugasItem[] => {
    const silabusGrade = String(r.kelas || '').replace(/\D/g, '');

    return tugasList.filter(t => {
      // 1. Strict Grade / Class Isolation Check
      const taskGrade = String(t.kelas || t.tingkatKelas || '').replace(/\D/g, '');
      const gradeMatches = !silabusGrade || !taskGrade || taskGrade === silabusGrade || (t.tingkatKelas && t.tingkatKelas.includes(silabusGrade));
      if (!gradeMatches) return false;

      // 2. Strict ID/No check
      if (t.silabusNo !== undefined && t.silabusNo !== null && r.no !== undefined && r.no !== null) {
        if (Number(t.silabusNo) === Number(r.no)) return true;
      }
      
      // 3. Strict Kode Sub-Tugas check
      if (t.kodeSubTugas && r.kodeSubTugas && t.kodeSubTugas === r.kodeSubTugas) {
        return true;
      }
      if (t.unitCode && (t.unitCode === r.kodeSubTugas || t.unitCode === r.singkatanDanJudul)) {
        return true;
      }

      // 4. Topic + Mapel Match
      const mapelMatches = !t.mapel || !r.mataPelajaran || t.mapel.trim().toLowerCase() === r.mataPelajaran.trim().toLowerCase();
      if (mapelMatches) {
        if (t.subBab && r.topikSubTugas && t.subBab.trim().toLowerCase() === r.topikSubTugas.trim().toLowerCase()) {
          return true;
        }
        if (t.judul && r.topikSubTugas && (
          t.judul.trim().toLowerCase() === r.topikSubTugas.trim().toLowerCase() ||
          t.judul.toLowerCase().includes(r.topikSubTugas.toLowerCase()) ||
          t.judul === `${r.sing}: ${r.topikSubTugas}` ||
          t.judul === `${r.kodeSubTugas}: ${r.topikSubTugas}`
        )) {
          return true;
        }
      }

      return false;
    });
  };

  // Distinct Mapel list from silabusRows
  const silabusMapelList = useMemo(() => {
    const set = new Set<string>();
    silabusRows.forEach(r => {
      if (r.mataPelajaran) set.add(r.mataPelajaran);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [silabusRows]);

  // Filtered Silabus Rows
  const filteredSilabusRows = useMemo(() => {
    return silabusRows.filter(r => {
      const paket = normalizePaketLetter(r);
      const matchesPaket = silabusPaket === 'SEMUA' || paket === silabusPaket;
      
      const cleanGrade = String(r.kelas || '').replace(/\D/g, '');
      const matchesKelas = silabusKelas === 'SEMUA' || cleanGrade === silabusKelas || String(r.kelas) === silabusKelas;
      const matchesSemester = silabusSemester === 'SEMUA' || r.semester === silabusSemester;
      const matchesMapel = silabusMapel === 'SEMUA' || r.mataPelajaran === silabusMapel;

      const assignedTasks = getAssignedTasksForSilabus(r);
      const matchesStatus = silabusStatusFilter === 'SEMUA' ||
        (silabusStatusFilter === 'SUDAH' && assignedTasks.length > 0) ||
        (silabusStatusFilter === 'BELUM' && assignedTasks.length === 0);

      // Status PDF Filter
      const hasPdf = hasPdfForSilabus(r);
      const matchesPdf = silabusPdfFilter === 'SEMUA' ||
        (silabusPdfFilter === 'ADA_PDF' && hasPdf) ||
        (silabusPdfFilter === 'BELUM_PDF' && !hasPdf);

      // Status Soal Filter
      const hasSoal = Boolean(getBankSoalForSilabus(r));
      const matchesSoal = silabusSoalFilter === 'SEMUA' ||
        (silabusSoalFilter === 'ADA_SOAL' && hasSoal) ||
        (silabusSoalFilter === 'BELUM_SOAL' && !hasSoal);

      const q = silabusSearch.toLowerCase();
      const matchesSearch = !silabusSearch ||
        (r.kodePaket && r.kodePaket.toLowerCase().includes(q)) ||
        (r.mataPelajaran && r.mataPelajaran.toLowerCase().includes(q)) ||
        (r.temaModul && r.temaModul.toLowerCase().includes(q)) ||
        (r.kodeSubTugas && r.kodeSubTugas.toLowerCase().includes(q)) ||
        (r.topikSubTugas && r.topikSubTugas.toLowerCase().includes(q)) ||
        (r.sing && r.sing.toLowerCase().includes(q)) ||
        String(r.no).includes(q);

      return matchesPaket && matchesKelas && matchesSemester && matchesMapel && matchesStatus && matchesPdf && matchesSoal && matchesSearch;
    });
  }, [silabusRows, silabusPaket, silabusKelas, silabusSemester, silabusMapel, silabusStatusFilter, silabusPdfFilter, silabusSoalFilter, silabusSearch, tugasList, bankSoalList]);

  // Silabus Assignment, PDF, and Soal Counts
  const silabusCounts = useMemo(() => {
    let sudahTugas = 0;
    let adaPdf = 0;
    let adaSoal = 0;

    silabusRows.forEach(r => {
      if (getAssignedTasksForSilabus(r).length > 0) sudahTugas++;
      if (hasPdfForSilabus(r)) adaPdf++;
      if (getBankSoalForSilabus(r)) adaSoal++;
    });

    return {
      total: silabusRows.length,
      sudahTugas,
      belumTugas: silabusRows.length - sudahTugas,
      adaPdf,
      belumPdf: silabusRows.length - adaPdf,
      adaSoal,
      belumSoal: silabusRows.length - adaSoal
    };
  }, [silabusRows, tugasList, bankSoalList]);

  // Handler for Tautkan Link Berkas Modul PDF
  const handleOpenQuickLinkPdf = (r: any) => {
    setQuickLinkPdfModal(r);
    const existingUrl = r.fileUrl || r.FileUrl || r.pdfUrl || r.linkMateri || '';
    setQuickPdfUrl(existingUrl);
    const cleanKode = r.kodeSubTugas ? String(r.kodeSubTugas).trim() : '';
    const cleanTopik = String(r.topikSubTugas || r.temaModul || 'Materi').trim();
    let standardBase = '';
    if (cleanKode && cleanTopik) {
      const kLower = cleanKode.toLowerCase();
      const tLower = cleanTopik.toLowerCase();
      if (kLower.endsWith(tLower) || kLower.includes(tLower)) {
        standardBase = cleanKode;
      } else {
        standardBase = `${cleanKode}-${cleanTopik}`;
      }
    } else {
      standardBase = cleanKode || cleanTopik || 'Materi';
    }
    // Format Standar Silabus (kodeSubTugas-topikSubTugas) langsung aktif sebagai default utama
    const defaultFileName = standardBase.replace(/[\/\\?%*:|"<>]/g, '_').trim() + '.pdf';
    setQuickPdfName(defaultFileName);
    setRenamePhysicalFileOnDrive(true);
  };

  const handleSaveQuickLinkPdf = () => {
    if (!quickLinkPdfModal) return;
    if (!quickPdfUrl.trim()) {
      alert('Silakan masukkan link Google Drive atau URL berkas PDF terlebih dahulu.');
      return;
    }
    const r = quickLinkPdfModal;
    const cleanUrl = quickPdfUrl.trim();
    const cleanKode = r.kodeSubTugas ? String(r.kodeSubTugas).trim() : '';
    const cleanTopik = String(r.topikSubTugas || r.temaModul || 'Materi').trim();
    let standardBase = '';
    if (cleanKode && cleanTopik) {
      const kLower = cleanKode.toLowerCase();
      const tLower = cleanTopik.toLowerCase();
      if (kLower.endsWith(tLower) || kLower.includes(tLower)) {
        standardBase = cleanKode;
      } else {
        standardBase = `${cleanKode}-${cleanTopik}`;
      }
    } else {
      standardBase = cleanKode || cleanTopik || 'Materi';
    }
    const fallbackName = standardBase.replace(/[\/\\?%*:|"<>]/g, '_').trim() + '.pdf';
    const cleanName = quickPdfName.trim() || fallbackName;

    // Otomatis ubah nama berkas fisik di Google Drive jika ada Google Drive File ID (default aktif)
    const gDriveId = extractGoogleDriveFileId(cleanUrl);
    if (renamePhysicalFileOnDrive && gDriveId) {
      const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
      renameGoogleDriveFile(gasUrl, gDriveId, cleanName)
        .then(() => {
          setSyncToast(`✓ Nama berkas fisik di Google Drive berhasil diubah menjadi: "${cleanName}"`);
        })
        .catch(err => {
          console.warn('Peringatan saat mengubah nama berkas di Google Drive:', err);
          if (err?.message?.includes('DEPLOYMENT_OUTDATED')) {
            alert('Perhatian: Tautan tersimpan di silabus, tetapi nama fisik berkas di Google Drive belum berubah karena Google Apps Script belum diperbarui ke Versi Baru.');
          }
        });
    }

    const updatedRows = silabusRows.map(item => {
      if ((item.id && item.id === r.id) || (item.no && item.no === r.no)) {
        return {
          ...item,
          fileUrl: cleanUrl,
          FileUrl: cleanUrl,
          pdfUrl: cleanUrl,
          fileName: cleanName,
          statusPdf: 'Ada Berkas'
        };
      }
      return item;
    });
    setSilabusRows(updatedRows);
    db.set('master_silabus', updatedRows);

    try {
      const existingMateri = db.get('materi_digital') || [];
      const newEntry = {
        id: `MAT-${r.no}-${Date.now()}`,
        silabusNo: r.no,
        mataPelajaran: r.mataPelajaran,
        kelas: r.kelas,
        semester: r.semester,
        judul: r.topikSubTugas || r.temaModul,
        fileUrl: cleanUrl,
        fileName: cleanName,
        uploadedAt: new Date().toISOString()
      };
      db.set('materi_digital', [newEntry, ...(Array.isArray(existingMateri) ? existingMateri : [])]);
    } catch {}

    setQuickLinkPdfModal(null);
    setSyncToast(`✓ Tautan berkas PDF untuk "${r.topikSubTugas || r.temaModul}" berhasil disimpan (${cleanName})! Status PDF kini aktif berwarna Biru.`);
    setTimeout(() => setSyncToast(null), 3500);
  };

  // Panduan membuat Bank Soal secara mandiri oleh Guru
  const handleGenerateBankSoalFromSilabus = (r: any) => {
    Swal.fire({
      icon: 'info',
      title: 'Input Butir Soal Mandiri',
      html: `<div class="text-left text-xs space-y-2 text-slate-700">
        <p>Pembuatan butir soal dilakukan secara mandiri oleh Guru agar butiran soal 100% akurat sesuai bahan ajar.</p>
        <p>Silakan buka menu <strong>CBT & Ujian &gt; Bank Soal</strong> untuk membuat paket soal resmi untuk materi <strong>${r.topikSubTugas || r.temaModul || 'ini'}</strong>.</p>
      </div>`,
      confirmButtonText: 'Buka Bank Soal CBT',
      showCancelButton: true,
      cancelButtonText: 'Tutup'
    }).then((res) => {
      if (res.isConfirmed) {
        window.location.hash = '#/cbt';
      }
    });
  };

  // Helper mendapatkan silabus item yang dipilih
  const getSelectedSilabusItems = () => {
    return silabusRows.filter(r => {
      const key = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
      return selectedSilabusKeys.includes(key);
    });
  };

  // Toggle checklist 1 baris silabus
  const handleToggleSelectSilabusRow = (key: string) => {
    setSelectedSilabusKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Toggle checklist semua judul di halaman saat ini
  const handleToggleSelectAllCurrentPage = () => {
    const pageKeys = paginatedSilabusRows.map(r => String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`));
    const allSelected = pageKeys.length > 0 && pageKeys.every(k => selectedSilabusKeys.includes(k));
    if (allSelected) {
      setSelectedSilabusKeys(prev => prev.filter(k => !pageKeys.includes(k)));
    } else {
      setSelectedSilabusKeys(prev => Array.from(new Set([...prev, ...pageKeys])));
    }
  };

  // Eksekusi Tautkan 1 Berkas PDF ke Banyak Judul Silabus Sekaligus
  const handleExecuteBulkLinkPdf = async () => {
    const targetItems = getSelectedSilabusItems();
    if (targetItems.length === 0) {
      alert('Pilih minimal 1 judul silabus untuk ditautkan berkas.');
      return;
    }

    let finalUrl = '';
    let finalName = bulkLinkPdfName.trim();

    if (bulkLinkPdfSource === 'URL') {
      if (!bulkLinkPdfUrl.trim()) {
        alert('Mohon masukkan tautan / URL berkas PDF materi.');
        return;
      }
      finalUrl = bulkLinkPdfUrl.trim();
      if (!finalName || finalName === 'Modul_Materi.pdf') {
        finalName = getStandardBulkPdfName();
      }

      // Otomatis ubah nama file fisik di Google Drive jika diminta
      if (bulkLinkPdfRenameDrive && finalName) {
        const gDriveId = extractGoogleDriveFileId(finalUrl);
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        if (gDriveId && gasUrl) {
          try {
            await renameGoogleDriveFile(gasUrl, gDriveId, finalName);
          } catch (err: any) {
            console.warn('Peringatan saat mengubah nama di Google Drive:', err);
          }
        }
      }
    } else if (bulkLinkPdfSource === 'UPLOAD') {
      if (!bulkLinkPdfUploadFile) {
        alert('Pilih berkas PDF dari komputer/perangkat Anda.');
        return;
      }
      setIsProcessingBulkPdfLink(true);
      try {
        finalName = bulkLinkPdfName.trim() || getStandardBulkPdfName();
        const gasUrl = settings?.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
        const targetFolder = settings?.folderModulId || settings?.folderId || GOOGLE_DRIVE_MODUL_FOLDER_ID;
        let driveUploadedUrl = '';
        if (gasUrl) {
          try {
            const res = await uploadFileToGAS(gasUrl, bulkLinkPdfUploadFile, targetFolder, finalName);
            if (res && (res.url || res.directUrl)) {
              driveUploadedUrl = res.url || res.directUrl;
            }
          } catch (e) {
            console.warn('Upload to GAS warning:', e);
          }
        }
        if (driveUploadedUrl) {
          finalUrl = driveUploadedUrl;
        } else {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(bulkLinkPdfUploadFile);
          });
          finalUrl = dataUrl;
        }
      } catch (err: any) {
        setIsProcessingBulkPdfLink(false);
        alert(`Gagal memproses berkas: ${err?.message || err}`);
        return;
      }
    }

    const targetKeySet = new Set(selectedSilabusKeys);
    const updatedRows = silabusRows.map(r => {
      const key = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
      if (targetKeySet.has(key)) {
        return {
          ...r,
          fileUrl: finalUrl,
          FileUrl: finalUrl,
          pdfUrl: finalUrl,
          fileName: finalName,
          statusPdf: 'Ada Berkas'
        };
      }
      return r;
    });

    setSilabusRows(updatedRows);
    db.set('master_silabus', updatedRows);

    // Perbarui entri materi_digital
    try {
      const existingMateri = db.get<any[]>('materi_digital') || [];
      const newEntries = targetItems.map((r, idx) => ({
        id: `MAT-${r.no}-${Date.now()}-${idx}`,
        silabusNo: r.no,
        mataPelajaran: r.mataPelajaran,
        kelas: r.kelas,
        semester: r.semester,
        judul: r.topikSubTugas || r.temaModul,
        fileUrl: finalUrl,
        fileName: finalName,
        uploadedAt: new Date().toISOString()
      }));
      db.set('materi_digital', [...newEntries, ...(Array.isArray(existingMateri) ? existingMateri : [])]);
    } catch {}

    setIsProcessingBulkPdfLink(false);
    setShowBulkLinkPdfModal(false);
    setSelectedSilabusKeys([]);
    setBulkLinkPdfUrl('');
    setBulkLinkPdfName('');
    setBulkLinkPdfUploadFile(null);

    setSyncToast(`✓ Berhasil menautkan berkas "${finalName}" ke ${targetItems.length} judul silabus sekaligus!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Eksekusi Pembuatan Soal Sekaligus Banyak dari Judul Silabus (Bank Soal CBT)
  const handleExecuteBulkGenerateSoal = async () => {
    const targetItems = getSelectedSilabusItems();
    if (targetItems.length === 0) {
      alert('Pilih minimal 1 judul silabus untuk dibuatkan paket soal.');
      return;
    }

    setIsGeneratingBulkSoal(true);
    try {
      const generatedPackages: any[] = [];
      const generatedQuestions: any[] = [];
      const targetKeySet = new Set(selectedSilabusKeys);

      targetItems.forEach((r, idx) => {
        const pkg = createBankSoalPackageFromSilabus({
          no: Number(r.no) || idx + 1,
          mataPelajaran: r.mataPelajaran,
          NamaMapel: r.mataPelajaran,
          kelas: r.kelas,
          topikSubTugas: r.topikSubTugas || r.temaModul || 'Materi Silabus',
          temaModul: r.temaModul,
          kodeSubTugas: r.kodeSubTugas,
          kodePaket: r.kodePaket,
          paket: r.paket,
          subKe: r.subKe,
          guru: 'Tim Guru Pengembang Kurikulum',
          jumlahSoal: bulkJumlahSoalPerJudul || 20
        });
        generatedPackages.push(pkg);
        if (Array.isArray(pkg.soalList)) {
          pkg.soalList.forEach(s => {
            generatedQuestions.push({
              ...s,
              bankSoalId: pkg.id,
              mapel: pkg.mapel,
              kelas: pkg.kelas
            });
          });
        }
      });

      // Simpan ke cbt_bank_soal
      const existingBankSoal = db.get<any>('cbt_bank_soal') || [];
      const newPkgIds = new Set(generatedPackages.map(p => p.id));
      const filteredBank = Array.isArray(existingBankSoal) 
        ? existingBankSoal.filter((b: any) => !newPkgIds.has(b?.id) && !newPkgIds.has(b?.BankSoalID))
        : [];
      db.set('cbt_bank_soal', [...generatedPackages, ...filteredBank]);

      // Simpan ke cbt_questions
      const existingQuestions = db.get<any[]>('cbt_questions') || [];
      db.set('cbt_questions', [...generatedQuestions, ...(Array.isArray(existingQuestions) ? existingQuestions : [])]);

      // Update statusSoal pada silabusRows
      const updatedRows = silabusRows.map(r => {
        const key = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
        if (targetKeySet.has(key)) {
          return {
            ...r,
            statusSoal: 'Tersedia',
            status: 'Tersedia'
          };
        }
        return r;
      });
      setSilabusRows(updatedRows);
      db.set('master_silabus', updatedRows);

      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
      window.dispatchEvent(new Event('storage'));

      setIsGeneratingBulkSoal(false);
      setShowBulkGenerateSoalModal(false);
      setSelectedSilabusKeys([]);

      setSyncToast(`✓ Berhasil membuat ${generatedPackages.length} Paket Bank Soal CBT (${generatedQuestions.length} butir soal pilihan ganda)!`);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      console.error(err);
      setIsGeneratingBulkSoal(false);
      alert(`Gagal membuat paket soal: ${err?.message || err}`);
    }
  };

  // Helper Penjadwalan Waktu Tugas Semester (Ganjil: Juli-Desember 2026, Genap: Januari-Juni 2027)
  const getSemesterSchedule = (semesterRaw: any, override: 'AUTO' | 'GANJIL' | 'GENAP' = 'AUTO') => {
    let isGenap = false;
    if (override === 'GENAP') isGenap = true;
    else if (override === 'GANJIL') isGenap = false;
    else {
      const s = String(semesterRaw || '').toLowerCase().trim();
      isGenap = s.includes('ii') || s.includes('2') || s.includes('genap');
    }

    if (isGenap) {
      return {
        semesterLabel: 'Semester Genap',
        rentangJadwal: 'Januari s/d Juni 2027',
        tanggalMulai: '2027-01-05',
        tenggat: '2027-06-20',
        bulanMulai: 'Januari',
        bulanSelesai: 'Juni',
        isGenap: true
      };
    }
    return {
      semesterLabel: 'Semester Ganjil',
      rentangJadwal: 'Juli s/d Desember 2026',
      tanggalMulai: '2026-07-15',
      tenggat: '2026-12-20',
      bulanMulai: 'Juli',
      bulanSelesai: 'Desember',
      isGenap: false
    };
  };

  // Helper Pemetaan Kelas Siswa yang Sesuai untuk Sub-Tugas Silabus
  const getTargetClassesForSilabus = (r: any, allRombels: boolean = true): string[] => {
    const gradeStr = String(r.kelas || '').replace(/\D/g, '');
    if (!gradeStr) return ['4A'];
    
    const matched = availableClasses.filter(c => {
      const digit = String(c).replace(/\D/g, '');
      return digit === gradeStr || matchClass(c, r.kelas);
    });

    if (matched.length === 0) {
      return [`${gradeStr}A`];
    }

    if (allRombels) {
      return matched;
    } else {
      return [matched[0]];
    }
  };

  // Eksekusi Fitur "Buatkan Tugas Sekaligus"
  const handleExecuteBulkAssignTasks = async () => {
    const targetItems = getSelectedSilabusItems();
    if (targetItems.length === 0) {
      Swal.fire({
        title: 'Pilih Silabus Terlebih Dahulu',
        text: 'Centang minimal 1 judul silabus di tabel untuk membuatkan tugas sekaligus.',
        icon: 'info',
        confirmButtonColor: '#059669'
      });
      return;
    }

    setIsProcessingBulkAssign(true);
    try {
      const newTasks: TugasItem[] = [];
      const newSubmissionsList: SubmissionItem[] = [];
      const newBankPackages: any[] = [];
      let skippedCount = 0;

      targetItems.forEach((r, idx) => {
        const schedule = getSemesterSchedule(r.semester, bulkAssignSemesterOverride);
        const targetClasses = getTargetClassesForSilabus(r, bulkAssignAllRombels);

        targetClasses.forEach((targetClass) => {
          // Cek apakah sudah pernah ditugaskan di kelas ini
          if (bulkAssignSkipExisting) {
            const alreadyAssigned = getAssignedTasksForSilabus(r).some(t => matchClass(t.kelas, targetClass));
            if (alreadyAssigned) {
              skippedCount++;
              return;
            }
          }

          const newId = `TGS-${(r.kodeSubTugas || 'KBM').replace(/[^a-zA-Z0-9]/g, '')}-${targetClass}-${Date.now().toString().slice(-4)}${idx}`;
          
          // Generate 20 Soal Pilihan Ganda (Auto-Grading)
          const soal20 = generate20SoalPilihanGanda({
            mapel: r.mataPelajaran,
            topik: r.topikSubTugas,
            tema: r.temaModul,
            kelas: String(r.kelas || ''),
            paket: r.paket,
            subKe: String(r.subKe || '1'),
            kodeSubTugas: r.kodeSubTugas
          });

          const matchingStudents = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, targetClass));
          const totalSiswa = matchingStudents.length > 0 ? matchingStudents.length : 32;

          const task: TugasItem = {
            id: newId,
            silabusNo: Number(r.no) || idx + 1,
            noExcel: Number(r.no) || idx + 1,
            kodeModul: r.kodePaket || `MOD-${r.paket}${r.kelas}`,
            unitCode: r.kodeSubTugas,
            kodeSubTugas: r.kodeSubTugas,
            subKe: `Unit ${r.subKe || 1}`,
            subBab: r.topikSubTugas,
            temaModul: r.temaModul,
            singkatan: r.sing,
            modulNo: String(r.modul || 1),
            paket: r.paket,
            semester: schedule.semesterLabel,
            rentangJadwal: schedule.rentangJadwal,
            tanggalMulai: schedule.tanggalMulai,
            judul: r.topikSubTugas,
            mapel: r.mataPelajaran,
            kelas: targetClass,
            tingkatKelas: `Kelas ${r.kelas}`,
            tenggat: schedule.tenggat,
            kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
            deskripsi: `Tugas Silabus Kurikulum ${r.mataPelajaran} (${schedule.semesterLabel} - Pelaksanaan: ${schedule.rentangJadwal}) untuk kelas ${formatClassLabel(targetClass, true)}. Topik: "${r.topikSubTugas}" (${r.kodeSubTugas}). Kumpulkan bukti pengerjaan berupa foto dan tulisan serta kirimkan ke WhatsApp Group PDKT.`,
            kumpul: 0,
            totalSiswa,
            status: 'Aktif Mengumpulkan',
            avg: 0,
            createdAt: schedule.tanggalMulai,
            isAutoGrading: true,
            soalList: soal20
          };

          newTasks.push(task);

          // Buat entri pengumpulan awal dengan status Belum Mengumpulkan
          matchingStudents.forEach(st => {
            newSubmissionsList.push({
              tugasId: newId,
              studentId: st.id,
              studentName: st.name,
              nisn: st.nisn || '-',
              kelas: st.class,
              status: 'Belum Mengumpulkan',
              nilai: null,
              catatanGuru: ''
            });
          });

          // Otomatis sinkronkan paket bank soal jika belum ada
          try {
            const bankPkg = createBankSoalPackageFromSilabus({
              no: Number(r.no) || idx + 1,
              mataPelajaran: r.mataPelajaran,
              NamaMapel: r.mataPelajaran,
              kelas: r.kelas,
              topikSubTugas: r.topikSubTugas || r.temaModul || 'Materi Silabus',
              temaModul: r.temaModul,
              kodeSubTugas: r.kodeSubTugas,
              kodePaket: r.kodePaket,
              paket: r.paket,
              subKe: r.subKe,
              guru: 'Tim Pengembang Kurikulum',
              jumlahSoal: 20
            });
            newBankPackages.push(bankPkg);
          } catch (e) {
            // ignore
          }
        });
      });

      if (newTasks.length === 0) {
        Swal.fire({
          title: 'Tugas Sudah Diterbitkan',
          text: `Semua (${targetItems.length}) silabus terpilih sudah pernah ditugaskan sebelumnya di kelas terkait.`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b'
        });
        setIsProcessingBulkAssign(false);
        setShowBulkAssignModal(false);
        return;
      }

      // Simpan tugas ke state & semua tabel DB
      const combinedTasks = [...newTasks, ...tugasList];
      saveTugasList(combinedTasks);

      // Simpan sub-submissions
      if (newSubmissionsList.length > 0) {
        const combinedSubs = [...submissions, ...newSubmissionsList];
        saveSubmissions(combinedSubs);
      }

      // Simpan bank soal
      if (newBankPackages.length > 0) {
        const existingBankSoal = db.get<any>('cbt_bank_soal') || [];
        const newPkgIds = new Set(newBankPackages.map(p => p.id));
        const filteredBank = Array.isArray(existingBankSoal) ? existingBankSoal.filter((b: any) => !newPkgIds.has(b?.id)) : [];
        db.set('cbt_bank_soal', [...newBankPackages, ...filteredBank]);
      }

      setShowBulkAssignModal(false);
      setSelectedSilabusKeys([]);

      Swal.fire({
        title: 'Tugas Berhasil Diterbitkan!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700">
            <p>Berhasil membuatkan <b>${newTasks.length} tugas</b> dari <b>${targetItems.length} silabus</b> terpilih.</p>
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
              <p>✓ <b>Jadwal Semester Ganjil</b>: Juli s/d Desember 2026 (Tenggat: 20 Des 2026)</p>
              <p>✓ <b>Jadwal Semester Genap</b>: Januari s/d Juni 2027 (Tenggat: 20 Jun 2027)</p>
              <p>✓ <b>Langsung Terhubung</b>: Ke daftar tugas KBM dan portal siswa masing-masing sesuai kelas</p>
              <p>✓ <b>Bukti Penyelesaian</b>: Siswa dapat melampirkan foto dan tulisan serta kirim langsung ke WhatsApp Group PDKT</p>
            </div>
            ${skippedCount > 0 ? `<p class="text-slate-500 italic">* ${skippedCount} tugas dilewati karena sudah ada sebelumnya.</p>` : ''}
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#059669',
        confirmButtonText: 'Selesai & Lihat Tugas'
      });

    } catch (err: any) {
      console.error('Bulk assign error:', err);
      Swal.fire({
        title: 'Gagal Membuat Tugas',
        text: err?.message || 'Terjadi kesalahan saat membuat tugas sekaligus.',
        icon: 'error',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setIsProcessingBulkAssign(false);
    }
  };

  // Eksekusi Fitur "Batalkan Tugas Sekaligus"
  const handleExecuteBulkCancelTasks = async () => {
    const targetItems = getSelectedSilabusItems();
    if (targetItems.length === 0) {
      Swal.fire({
        title: 'Pilih Silabus Terlebih Dahulu',
        text: 'Centang minimal 1 judul silabus di tabel untuk membatalkan tugas sekaligus.',
        icon: 'info',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    // Cari seluruh tugas yang terhubung dengan silabus-silabus terpilih
    const matchedTasks: TugasItem[] = [];
    targetItems.forEach(r => {
      const assigned = getAssignedTasksForSilabus(r);
      assigned.forEach(t => {
        if (!matchedTasks.some(existing => existing.id === t.id)) {
          matchedTasks.push(t);
        }
      });
    });

    if (matchedTasks.length === 0) {
      Swal.fire({
        title: 'Tidak Ada Tugas Terhubung',
        text: `Dari ${targetItems.length} silabus yang dipilih, belum ada tugas yang berstatus sudah ditugaskan.`,
        icon: 'info',
        confirmButtonColor: '#64748b'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Batalkan Tugas Sekaligus?',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-700">
          <p>Ditemukan <b>${matchedTasks.length} tugas aktif</b> yang terhubung dengan <b>${targetItems.length} silabus</b> terpilih:</p>
          <div class="max-h-36 overflow-y-auto p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            ${matchedTasks.slice(0, 5).map(t => `<div class="truncate text-rose-900">• <b>[${formatClassLabel(t.kelas, true)}]</b> ${t.judul}</div>`).join('')}
            ${matchedTasks.length > 5 ? `<div class="text-[11px] text-rose-700 font-bold italic">... dan ${matchedTasks.length - 5} tugas lainnya</div>` : ''}
          </div>
          <p class="text-rose-600 font-semibold pt-1">Tindakan ini akan menarik seluruh tugas ini dari daftar tugas guru dan portal siswa kelas terkait.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, Batalkan ${matchedTasks.length} Tugas`,
      cancelButtonText: 'Kembali'
    });

    if (result.isConfirmed) {
      const taskIdsToRemove = new Set(matchedTasks.map(t => t.id));
      const updatedTugas = tugasList.filter(t => !taskIdsToRemove.has(t.id));
      const updatedSubs = submissions.filter(s => !taskIdsToRemove.has(s.tugasId));

      saveTugasList(updatedTugas);
      saveSubmissions(updatedSubs);
      setSelectedSilabusKeys([]);

      Swal.fire({
        title: 'Tugas Berhasil Dibatalkan!',
        text: `${matchedTasks.length} tugas telah berhasil ditarik dari daftar tugas dan portal siswa.`,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false
      });
    }
  };

  // Strict Workflow Initiation Handler:
  // Step 1: Must have PDF
  // Step 2: Must have Bank Soal
  // Step 3: Assign to Students
  const handleInitiateAssignWorkflow = (r: any) => {
    // 1. Cek Berkas PDF
    if (!hasPdfForSilabus(r)) {
      alert('⚠️ Alur Penugasan:\nJudul Katalog harus ada berkas PDF materi terlebih dahulu agar acuan materi akurat.\n\nSilakan tautkan berkas PDF sekarang.');
      handleOpenQuickLinkPdf(r);
      return;
    }

    // 2. Cek Bank Soal
    const bankSoal = getBankSoalForSilabus(r);
    if (!bankSoal) {
      if (confirm(`⚠️ Alur Penugasan:\nMateri ini sudah memiliki PDF, namun belum memiliki paket soal di BANK_SOAL.\n\nApakah Anda ingin membuatkan 20 butir soal (Generate) sekarang agar bisa langsung ditugaskan?`)) {
        handleGenerateBankSoalFromSilabus(r);
      }
      return;
    }

    // 3. Jika sudah ada PDF dan sudah ada Bank Soal -> Buka Form Penugasan
    handleOpenAssignModal(r);
  };

  // Open Pop Up Modal to Assign Silabus Item
  const handleOpenAssignModal = (r: any) => {
    const defaultGrade = String(r.kelas || '4');
    // find first matching class or default to `${r.kelas}A`
    const matchingClassObj = availableClasses.find(c => {
      const digit = c.replace(/\D/g, '');
      return digit === defaultGrade;
    });
    const targetClass = matchingClassObj || `${defaultGrade}A`;
    const schedule = getSemesterSchedule(r.semester);

    setAssignForm({
      targetKelas: targetClass,
      judul: r.topikSubTugas,
      kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
      tenggat: schedule.tenggat,
      deskripsi: `Tugas Silabus Kurikulum ${r.mataPelajaran} (${schedule.semesterLabel} - Jadwal: ${schedule.rentangJadwal}) untuk kelas ${formatClassLabel(targetClass, true)}. Topik: "${r.topikSubTugas}" (${r.kodeSubTugas}). Kumpulkan bukti pengerjaan berupa foto dan tulisan serta kirimkan ke WhatsApp Group PDKT.`,
      isAutoGrading: true
    });
    setAssignSilabusModal(r);
  };

  // Submit and Confirm Assignment from Silabus Master Modal
  const handleConfirmAssignSilabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSilabusModal) return;

    if (!assignForm.targetKelas || !assignForm.judul.trim() || !assignForm.tenggat) {
      alert('Mohon lengkapi Kelas Target, Judul Tugas, dan Tenggat Waktu.');
      return;
    }

    const r = assignSilabusModal;
    const targetKelas = assignForm.targetKelas;
    const matchingStudents = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, targetKelas));
    const totalSiswa = matchingStudents.length > 0 ? matchingStudents.length : 32;

    const newId = `TGS-${String(Date.now()).slice(-5)}`;
    const schedule = getSemesterSchedule(r.semester);
    
    // Generate 20 Soal Pilihan Ganda (PG) sesuai materi silabus & kurikulum
    const soal20 = generate20SoalPilihanGanda({
      mapel: r.mataPelajaran,
      topik: r.topikSubTugas,
      tema: r.temaModul,
      kelas: r.kelas,
      paket: r.paket,
      subKe: r.subKe,
      kodeSubTugas: r.kodeSubTugas
    });

    const createdTugas: TugasItem = {
      id: newId,
      silabusNo: r.no,
      noExcel: r.no,
      kodeModul: r.kodePaket || `MOD-${r.paket}${r.kelas}`,
      unitCode: r.kodeSubTugas,
      kodeSubTugas: r.kodeSubTugas,
      subKe: `Unit ${r.subKe || 1}`,
      subBab: r.topikSubTugas,
      temaModul: r.temaModul,
      singkatan: r.sing,
      modulNo: String(r.modul || 1),
      paket: r.paket,
      semester: schedule.semesterLabel,
      rentangJadwal: schedule.rentangJadwal,
      tanggalMulai: schedule.tanggalMulai,
      judul: assignForm.judul.trim(),
      mapel: r.mataPelajaran,
      kelas: targetKelas,
      tingkatKelas: `Kelas ${r.kelas}`,
      tenggat: assignForm.tenggat,
      kategori: assignForm.kategori || 'Kuis Pilihan Ganda (Auto-Grading)',
      deskripsi: assignForm.deskripsi.trim() || `Tugas Silabus ${r.mataPelajaran} Unit ${r.subKe}: ${r.topikSubTugas} (${r.kodeSubTugas}). Paket 20 Soal Pilihan Ganda Terpadu. Bukti foto dan tulisan dikirimkan ke WhatsApp Group PDKT.`,
      kumpul: 0,
      totalSiswa,
      status: 'Aktif Mengumpulkan',
      avg: 0,
      createdAt: schedule.tanggalMulai,
      isAutoGrading: assignForm.isAutoGrading !== false,
      soalList: soal20
    };

    // Auto register/sync package into BANK_SOAL / cbt_bank_soal
    try {
      const bankPackage = createBankSoalPackageFromSilabus(r);
      const existingBankSoal = db.get('cbt_bank_soal') || [];
      const filteredBank = Array.isArray(existingBankSoal) ? existingBankSoal.filter((b: any) => b.id !== bankPackage.id && b.BankSoalID !== bankPackage.BankSoalID) : [];
      db.set('cbt_bank_soal', [bankPackage, ...filteredBank]);
    } catch (err) {
      console.warn('Auto register bank soal warning:', err);
    }

    const updatedTugas = [createdTugas, ...tugasList];
    saveTugasList(updatedTugas);

    // Initialize blank submission records for this class
    if (matchingStudents.length > 0) {
      const newSubs: SubmissionItem[] = matchingStudents.map(st => ({
        tugasId: newId,
        studentId: st.id,
        studentName: st.name,
        nisn: st.nisn || '-',
        kelas: st.class,
        status: 'Belum Mengumpulkan',
        nilai: null,
        catatanGuru: ''
      }));
      saveSubmissions([...submissions, ...newSubs]);
    }

    setAssignSilabusModal(null);
    setSyncToast(`Berhasil menugaskan "${createdTugas.judul}" ke ${formatClassLabel(targetKelas, true)}!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const totalSilabusPages = Math.ceil(filteredSilabusRows.length / silabusPageSize) || 1;
  const paginatedSilabusRows = useMemo(() => {
    const start = (silabusPage - 1) * silabusPageSize;
    return filteredSilabusRows.slice(start, start + silabusPageSize);
  }, [filteredSilabusRows, silabusPage, silabusPageSize]);

  // Export Silabus Master to Excel (.xlsx) - Format Bersih MASTER_SILABUS (15 Kolom) & KURIKULUM_MODUL (12 Kolom)
  const handleExportSilabusExcel = () => {
    try {
      // 1. Sheet 1: MASTER_SILABUS (15 Kolom Bersih, Tidak Ada Kolom Duplikat)
      const exportSilabusData = silabusRows.map((r, idx) => ({
        id: r.id || `MS-${r.no || idx + 1}-${r.subKe || '1'}-${idx + 1}`,
        no: Number(r.no) || idx + 1,
        kodeJenjang: r.kodeJenjang || r.kodePaket || r.namaModulLengkap || '',
        Jenjang: r.Jenjang || r.paket || (['4', '5', '6'].includes(String(r.kelas)) ? 'A' : ['7', '8', '9'].includes(String(r.kelas)) ? 'B' : 'C'),
        kelas: r.kelas || '',
        semester: r.semester || 'SM-I',
        kodeMapel: r.kodeMapel || r.singkatan || r.sing || '',
        NamaMapel: r.NamaMapel || r.mataPelajaran || r.mapel || '',
        noModul: r.noModul || r.modulNo || r.noModulAngka || r.modul || 1,
        temaModul: r.temaModul || r.namaModulBab || r.babUnit || '',
        subKe: r.subKe || `Unit ${r.noSubModul || 1}`,
        kodeSubTugas: r.kodeSubTugas || r.singkatanDanJudul || '',
        topikSubTugas: r.topikSubTugas || r.judulSubModul || '',
        status: r.status || r.statusSoal || 'Tersedia',
        keterangan: r.keterangan || r.catatan || ''
      }));

      // 2. Sheet 2: KURIKULUM_MODUL (11 Kolom Bersih)
      const exportModulData = kurikulumModulList.map((m, idx) => ({
        id: m.id || `MOD-${idx + 1}`,
        noModul: m.noModul || m.modulNo || idx + 1,
        kodeModul: m.kodeModul || m.kode || '',
        judulModul: m.judulModul || m.nama || m.temaModul || '',
        kodeMapel: m.kodeMapel || m.singkatan || m.singkatanMapel || '',
        NamaMapel: m.NamaMapel || m.mataPelajaran || m.mapel || '',
        Jenjang: m.Jenjang || m.paket || '',
        kelas: m.kelas || '',
        semester: m.semester || '',
        Unit: m.Unit || m.babUnit || '',
        materiPokok: m.materiPokok ? (Array.isArray(m.materiPokok) ? m.materiPokok.join(', ') : String(m.materiPokok)) : ''
      }));

      const wb = XLSX.utils.book_new();

      const wsSilabus = XLSX.utils.json_to_sheet(exportSilabusData);
      XLSX.utils.book_append_sheet(wb, wsSilabus, 'MASTER_SILABUS');

      const wsModul = XLSX.utils.json_to_sheet(exportModulData);
      XLSX.utils.book_append_sheet(wb, wsModul, 'KURIKULUM_MODUL');

      XLSX.writeFile(wb, `MASTER_SILABUS_BERSIH_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setSyncToast(`Berhasil mengekspor ${exportSilabusData.length} baris MASTER_SILABUS (15 kolom bersih) & ${exportModulData.length} Modul ke Excel!`);
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengekspor data: ' + (err?.message || err));
    }
  };

  const subTabs = [
    { id: 'daftar-tugas', label: 'Daftar Tugas KBM', icon: FileText, count: tugasList.length },
    { id: 'dashboard', label: 'Ringkasan & Monitoring', icon: CheckSquare },
    { id: 'pengumpulan', label: 'Hasil Pengumpulan & Nilai', icon: CheckCircle2, count: submissions.filter(s => s.status !== 'Belum Mengumpulkan').length },
    { id: 'silabus-master', label: 'Katalog Silabus Kurikulum', icon: FileSpreadsheet, count: silabusRows.length },
    { id: 'berkas-silabus', label: 'Berkas Materi & Silabus', icon: Folder },
  ];

  const handleSubTabChange = (tabId: string) => {
    setActiveSubTab(tabId);
    setSearchTerm('');
    setFilterKelas('');
    setFilterStatus('');
    setFilterKategori('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Create Task Action
  const handleCreateTugas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTugas.judul.trim() || !newTugas.mapel.trim() || !newTugas.kelas || !newTugas.tenggat) {
      alert('Mohon lengkapi Judul, Mata Pelajaran, Kelas, dan Tenggat Waktu tugas.');
      return;
    }

    const classStudentsCount = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, newTugas.kelas)).length;
    const totalSiswa = classStudentsCount > 0 ? classStudentsCount : 30; // fallback if student count not registered

    const id = `TGS-${String(Date.now()).slice(-4)}`;
    
    // Attach or generate 20 Pilihan Ganda questions
    const soal20 = (newTugas.soalList && newTugas.soalList.length > 0)
      ? newTugas.soalList
      : generate20SoalPilihanGanda({
          mapel: newTugas.mapel.trim(),
          topik: newTugas.judul.trim(),
          kelas: newTugas.kelas,
        });

    const createdItem: TugasItem = {
      id,
      judul: newTugas.judul.trim(),
      mapel: newTugas.mapel.trim(),
      kelas: newTugas.kelas,
      tingkatKelas: `Kelas ${String(newTugas.kelas || '').replace(/\D/g, '') || '4'}`,
      tenggat: newTugas.tenggat,
      kategori: newTugas.kategori || 'Kuis Pilihan Ganda (Auto-Grading)',
      deskripsi: newTugas.deskripsi.trim() || 'Selesaikan paket 20 soal pilihan ganda sesuai petunjuk guru mata pelajaran.',
      kumpul: 0,
      totalSiswa,
      status: 'Aktif Mengumpulkan',
      avg: 0,
      createdAt: new Date().toISOString().split('T')[0],
      isAutoGrading: newTugas.isAutoGrading !== false,
      soalList: soal20
    };

    const updated = [createdItem, ...tugasList];
    saveTugasList(updated);

    // Initialize blank submission records for this class
    const matchingStudents = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, newTugas.kelas));
    if (matchingStudents.length > 0) {
      const newSubs: SubmissionItem[] = matchingStudents.map(st => ({
        tugasId: id,
        studentId: st.id,
        studentName: st.name,
        nisn: st.nisn || '-',
        kelas: st.class,
        status: 'Belum Mengumpulkan',
        nilai: null,
        catatanGuru: ''
      }));
      saveSubmissions([...submissions, ...newSubs]);
    }

    setNewTugas({
      judul: '',
      mapel: '',
      kelas: '',
      tenggat: '',
      kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
      deskripsi: '',
      isAutoGrading: true,
      soalList: []
    });
    setShowAddModal(false);
    setActiveSubTab('daftar-tugas');
  };

  // Edit Task Action
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    const updated = tugasList.map(t => t.id === editModal.id ? { ...t, ...editModal, avg: Number(editModal.avg || 0) } : t);
    saveTugasList(updated);
    setEditModal(null);
  };

  // Delete Task Action
  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const updated = tugasList.filter(t => t.id !== deleteModal.id);
    saveTugasList(updated);
    // Also clean up submissions
    const cleanSubs = submissions.filter(s => s.tugasId !== deleteModal.id);
    saveSubmissions(cleanSubs);
    if (selectedTugasId === deleteModal.id) {
      setSelectedTugasId(updated[0]?.id || '');
    }
    setDeleteModal(null);
  };

  // Grading / Submission update for a student
  const handleUpdateStudentSubmission = (
    studentId: string, 
    status: 'Sudah Mengumpulkan' | 'Belum Mengumpulkan' | 'Terlambat', 
    nilai: number | null, 
    catatanGuru: string
  ) => {
    if (!selectedTugasId) return;

    let updatedSubs = [...submissions];
    const existingIndex = updatedSubs.findIndex(s => s.tugasId === selectedTugasId && s.studentId === studentId);
    
    if (existingIndex >= 0) {
      updatedSubs[existingIndex] = {
        ...updatedSubs[existingIndex],
        status,
        nilai,
        catatanGuru,
        submittedAt: status !== 'Belum Mengumpulkan' ? (updatedSubs[existingIndex].submittedAt || new Date().toLocaleString('id-ID')) : undefined
      };
    } else {
      const student = students.find(s => s.id === studentId);
      updatedSubs.push({
        tugasId: selectedTugasId,
        studentId,
        studentName: student?.name || 'Siswa',
        nisn: student?.nisn || '-',
        kelas: student?.class || '',
        status,
        nilai,
        catatanGuru,
        submittedAt: status !== 'Belum Mengumpulkan' ? new Date().toLocaleString('id-ID') : undefined
      });
    }

    saveSubmissions(updatedSubs);

    // Recalculate parent task kumpul & avg
    const taskSubs = updatedSubs.filter(s => s.tugasId === selectedTugasId);
    const kumpulCount = taskSubs.filter(s => s.status === 'Sudah Mengumpulkan' || s.status === 'Terlambat').length;
    const gradedSubs = taskSubs.filter(s => s.nilai !== null && s.nilai !== undefined);
    const avgScore = gradedSubs.length > 0 
      ? Math.round(gradedSubs.reduce((acc, curr) => acc + Number(curr.nilai || 0), 0) / gradedSubs.length)
      : 0;

    const taskStatus = kumpulCount >= (taskSubs.length || 1) && gradedSubs.length === taskSubs.length 
      ? 'Selesai Dinilai' 
      : kumpulCount > 0 ? 'Menunggu Penilaian' : 'Aktif Mengumpulkan';

    const updatedTugas = tugasList.map(t => {
      if (t.id === selectedTugasId) {
        return {
          ...t,
          kumpul: kumpulCount,
          avg: avgScore,
          status: taskStatus as any
        };
      }
      return t;
    });

    saveTugasList(updatedTugas);
  };

  const selectedTugas = tugasList.find(t => t.id === selectedTugasId);
  const studentsInSelectedClass = useMemo(() => {
    if (!selectedTugas) return [];
    return students
      .filter(s => matchStatusActive(s.status) && matchClass(s.class, selectedTugas.kelas))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  }, [students, selectedTugas]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs flex-shrink-0">
            <CheckSquare size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Penugasan KBM Siswa
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manajemen pembagian tugas KBM, pemantauan status pengumpulan, & pemberian umpan balik nilai.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Quick Summary Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-600">
            <span><strong className="text-slate-900">{stats.totalTugas}</strong> Tugas</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold">{stats.tugasAktif} Aktif</span>
            <span className="text-slate-300">•</span>
            <span>{stats.tingkatPenyerahan}% Kumpul</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-200 transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Buat Penugasan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80 rounded-2xl text-xs font-black transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={15} className="text-cyan-600" />
            <span>Tarik Dari Bank Soal ({bankSoalList.length})</span>
          </button>
        </div>
      </div>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sub-Navigation */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Pilih Sub-Menu Penugasan:
        </label>
        <div className="relative">
          <select
            value={activeSubTab}
            onChange={(e) => handleSubTabChange(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 appearance-none transition"
          >
            {subTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200 font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-rose-600 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SILABUS MASTER EXCEL 1:1 TAB */}
      {activeSubTab === 'silabus-master' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in">
          {/* Header & Stats Banner */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full font-black text-xs flex items-center gap-1.5 ${
                  isFromSpreadsheet
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isFromSpreadsheet ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                  {isFromSpreadsheet ? 'Tersinkron Google Spreadsheet' : 'Format Master Kurikulum'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Total: {filteredSilabusRows.length} dari {silabusRows.length} Sub-Tugas Silabus
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                Katalog Silabus Master Kurikulum (Paket A, B, C)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tabel referensi kurikulum memuat seluruh modul, sub-bab, topik penugasan. Dapat disinkronkan langsung ke Google Spreadsheet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePullSilabusFromSpreadsheet}
                disabled={isSyncingSheets || isUploadingSheets}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Tarik data MASTER_SILABUS & KURIKULUM_MODUL terbaru dari Google Spreadsheet"
              >
                <RefreshCw size={14} className={isSyncingSheets ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                <span>{isSyncingSheets ? 'Menarik dari GAS...' : 'Tarik dari Sheets'}</span>
              </button>

              <button
                type="button"
                onClick={handlePushSilabusToSpreadsheet}
                disabled={isSyncingSheets || isUploadingSheets}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Unggah dan sinkronkan seluruh baris MASTER_SILABUS & KURIKULUM_MODUL ke Google Spreadsheet"
              >
                <UploadCloud size={14} className={isUploadingSheets ? 'animate-bounce' : ''} />
                <span>{isUploadingSheets ? 'Mengunggah...' : 'Unggah ke Sheets'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubTabChange('berkas-silabus')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                title="Kelola file PDF & Berkas Materi Google Drive untuk Silabus"
              >
                <Folder size={14} />
                <span>Kelola Berkas & PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Otomatis saring agar item yang SUDAH memiliki berkas PDF tidak diikutkan / ditampilkan
                  const itemsWithoutPdf = selectedSilabusKeys.filter(key => {
                    const row = silabusRows.find(r => String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`) === key);
                    const hasPdf = Boolean(row?.fileUrl || row?.FileUrl || row?.pdfUrl || row?.linkMateri);
                    return !hasPdf;
                  });

                  if (selectedSilabusKeys.length > 0 && itemsWithoutPdf.length === 0) {
                    alert('Seluruh judul silabus yang Anda centang sudah memiliki berkas PDF. Judul yang sudah ada PDF tidak ditampilkan.');
                    return;
                  }

                  if (itemsWithoutPdf.length !== selectedSilabusKeys.length) {
                    setSelectedSilabusKeys(itemsWithoutPdf);
                  }

                  setBulkLinkPdfUrl('');
                  const autoName = getStandardBulkPdfName(itemsWithoutPdf.length > 0 ? itemsWithoutPdf : selectedSilabusKeys);
                  setBulkLinkPdfName(autoName);
                  setBulkLinkPdfRenameDrive(true);
                  setBulkLinkPdfUploadFile(null);
                  setShowBulkLinkPdfModal(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer ${
                  selectedSilabusKeys.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                }`}
                title="Tautkan 1 berkas PDF ke banyak judul silabus terpilih sekaligus"
              >
                <Link2 size={14} />
                <span>Tautkan PDF Sekaligus {selectedSilabusKeys.length > 0 ? `(${selectedSilabusKeys.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSilabusKeys.length === 0) {
                    Swal.fire({
                      title: 'Pilih Silabus',
                      text: 'Centang satu atau beberapa judul silabus di tabel bawah terlebih dahulu.',
                      icon: 'info',
                      confirmButtonColor: '#059669'
                    });
                    return;
                  }
                  setShowBulkAssignModal(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer ${
                  selectedSilabusKeys.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-emerald-200 shadow-sm ring-2 ring-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
                title="Buatkan tugas sekaligus untuk seluruh silabus terpilih ke portal masing-masing siswa sesuai kelas"
              >
                <Send size={14} />
                <span>Buatkan Tugas Sekaligus {selectedSilabusKeys.length > 0 ? `(${selectedSilabusKeys.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteBulkCancelTasks}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer ${
                  selectedSilabusKeys.length > 0
                    ? 'bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-rose-200 shadow-sm ring-2 ring-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
                title="Batalkan dan tarik tugas yang terhubung dengan silabus terpilih dari portal siswa"
              >
                <Undo2 size={14} />
                <span>Batalkan Tugas Sekaligus {selectedSilabusKeys.length > 0 ? `(${selectedSilabusKeys.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSilabusKeys.length === 0) {
                    alert('Centang satu atau beberapa judul silabus di tabel bawah terlebih dahulu.');
                    return;
                  }
                  setShowBulkGenerateSoalModal(true);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer ${
                  selectedSilabusKeys.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-200 shadow-sm ring-2 ring-amber-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
                title="Buat paket 20 butir soal CBT untuk banyak judul silabus terpilih sekaligus"
              >
                <Sparkles size={14} />
                <span>Buat Soal Sekaligus {selectedSilabusKeys.length > 0 ? `(${selectedSilabusKeys.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddSilabusModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Sub-Tugas</span>
              </button>

              <button
                type="button"
                onClick={handleExportSilabusExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                title="Unduh file Excel rapi dengan 15 kolom MASTER_SILABUS & 11 kolom KURIKULUM_MODUL siap impor langsung ke Google Spreadsheet"
              >
                <FileSpreadsheet size={14} />
                <span>Unduh Excel Master</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            {/* Row 1: Search & Primary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor, kode, topik, tema modul..."
                  value={silabusSearch}
                  onChange={(e) => {
                    setSilabusSearch(e.target.value);
                    setSilabusPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {silabusSearch && (
                  <button
                    onClick={() => {
                      setSilabusSearch('');
                      setSilabusPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Paket Filter */}
              <div className="lg:col-span-2">
                <select
                  value={silabusPaket}
                  onChange={(e) => {
                    const p = e.target.value;
                    setSilabusPaket(p);
                    setSilabusPage(1);
                    if (p === 'A' && !['4', '5', '6'].includes(silabusKelas)) setSilabusKelas('SEMUA');
                    else if (p === 'B' && !['7', '8', '9'].includes(silabusKelas)) setSilabusKelas('SEMUA');
                    else if (p === 'C' && !['10', '11', '12'].includes(silabusKelas)) setSilabusKelas('SEMUA');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Jenjang / Paket</option>
                  <option value="A">Paket A (SD - Kls 4-6)</option>
                  <option value="B">Paket B (SMP - Kls 7-9)</option>
                  <option value="C">Paket C (SMA - Kls 10-12)</option>
                </select>
              </div>

              {/* Kelas Filter */}
              <div className="lg:col-span-2">
                <select
                  value={silabusKelas}
                  onChange={(e) => {
                    setSilabusKelas(e.target.value);
                    setSilabusPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Kelas</option>
                  {(silabusPaket === 'SEMUA' || silabusPaket === 'A') && (
                    <optgroup label="Paket A (SD)">
                      <option value="4">Kelas 4</option>
                      <option value="5">Kelas 5</option>
                      <option value="6">Kelas 6</option>
                    </optgroup>
                  )}
                  {(silabusPaket === 'SEMUA' || silabusPaket === 'B') && (
                    <optgroup label="Paket B (SMP)">
                      <option value="7">Kelas 7</option>
                      <option value="8">Kelas 8</option>
                      <option value="9">Kelas 9</option>
                    </optgroup>
                  )}
                  {(silabusPaket === 'SEMUA' || silabusPaket === 'C') && (
                    <optgroup label="Paket C (SMA)">
                      <option value="10">Kelas 10</option>
                      <option value="11">Kelas 11</option>
                      <option value="12">Kelas 12</option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Semester Filter */}
              <div className="lg:col-span-2">
                <select
                  value={silabusSemester}
                  onChange={(e) => {
                    setSilabusSemester(e.target.value);
                    setSilabusPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Semester</option>
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              {/* Mata Pelajaran Filter */}
              <div className="lg:col-span-2">
                <select
                  value={silabusMapel}
                  onChange={(e) => {
                    setSilabusMapel(e.target.value);
                    setSilabusPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Mapel ({silabusMapelList.length})</option>
                  {silabusMapelList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Status Indicators & Reset Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Penugasan (Hijau / Merah) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Tugas:</span>
                  <button
                    type="button"
                    onClick={() => { setSilabusStatusFilter('SEMUA'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      silabusStatusFilter === 'SEMUA' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusStatusFilter('SUDAH'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusStatusFilter === 'SUDAH' ? 'bg-emerald-600 text-white font-black shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                    title="Sudah Ditugaskan ke Kelas (Warna Hijau)"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Sudah ({silabusCounts.sudahTugas})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusStatusFilter('BELUM'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusStatusFilter === 'BELUM' ? 'bg-rose-600 text-white font-black shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                    }`}
                    title="Belum Ditugaskan ke Kelas (Warna Merah)"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Belum ({silabusCounts.belumTugas})</span>
                  </button>
                </div>

                {/* Status Berkas PDF (Biru) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">PDF:</span>
                  <button
                    type="button"
                    onClick={() => { setSilabusPdfFilter('SEMUA'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      silabusPdfFilter === 'SEMUA' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusPdfFilter('ADA_PDF'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusPdfFilter === 'ADA_PDF' ? 'bg-blue-600 text-white font-black shadow-2xs' : 'text-blue-700 hover:bg-blue-50'
                    }`}
                    title="Sudah Ada Berkas PDF (Warna Biru)"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Ada PDF ({silabusCounts.adaPdf})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusPdfFilter('BELUM_PDF'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusPdfFilter === 'BELUM_PDF' ? 'bg-slate-700 text-white font-black shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Belum ({silabusCounts.belumPdf})</span>
                  </button>
                </div>

                {/* Status Bank Soal (Kuning) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Soal:</span>
                  <button
                    type="button"
                    onClick={() => { setSilabusSoalFilter('SEMUA'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      silabusSoalFilter === 'SEMUA' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusSoalFilter('ADA_SOAL'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusSoalFilter === 'ADA_SOAL' ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                    }`}
                    title="Sudah Di-generate di BANK_SOAL (Warna Kuning)"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Ada di Bank Soal ({silabusCounts.adaSoal})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSilabusSoalFilter('BELUM_SOAL'); setSilabusPage(1); }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      silabusSoalFilter === 'BELUM_SOAL' ? 'bg-slate-700 text-white font-black shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Belum ({silabusCounts.belumSoal})</span>
                  </button>
                </div>

                {(silabusSearch || silabusPaket !== 'SEMUA' || silabusKelas !== 'SEMUA' || silabusSemester !== 'SEMUA' || silabusMapel !== 'SEMUA' || silabusStatusFilter !== 'SEMUA' || silabusPdfFilter !== 'SEMUA' || silabusSoalFilter !== 'SEMUA') && (
                  <button
                    onClick={() => {
                      setSilabusSearch('');
                      setSilabusPaket('SEMUA');
                      setSilabusKelas('SEMUA');
                      setSilabusSemester('SEMUA');
                      setSilabusMapel('SEMUA');
                      setSilabusStatusFilter('SEMUA');
                      setSilabusPdfFilter('SEMUA');
                      setSilabusSoalFilter('SEMUA');
                      setSilabusPage(1);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={12} />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>

              <div className="text-xs font-medium text-slate-500">
                Menampilkan <strong className="text-slate-900">{filteredSilabusRows.length}</strong> dari {silabusRows.length} sub-tugas silabus
              </div>
            </div>
          </div>

          {/* Workflow Explanation Banner */}
          <div className="bg-gradient-to-r from-blue-50/70 via-amber-50/70 to-emerald-50/70 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span className="text-slate-500">Alur Wajib:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                1. Berkas PDF (Biru)
              </span>
              <span className="text-slate-400">&rarr;</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                2. Generate BANK_SOAL (Kuning)
              </span>
              <span className="text-slate-400">&rarr;</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                3. Tugaskan ke Siswa (Hijau)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              *Mencegah soal duplikat &amp; memastikan acuan materi selalu presisi.
            </div>
          </div>

          {/* Simplified Silabus Table with Checkbox, Columns and Color Coding */}
          {selectedSilabusKeys.length > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-700/80 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckSquare size={16} className="text-amber-400" />
                <span>{selectedSilabusKeys.length} Judul Silabus Terpilih</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  title="Terbitkan tugas serentak ke portal siswa sesuai kelas dan semester"
                >
                  <Send size={13} />
                  <span>⚡ Buatkan Tugas Sekaligus ({selectedSilabusKeys.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBulkCancelTasks}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  title="Batalkan dan tarik tugas terpilih dari portal siswa"
                >
                  <Undo2 size={13} />
                  <span>Batalkan Tugas Sekaligus ({selectedSilabusKeys.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkLinkPdfUrl('');
                    const autoName = getStandardBulkPdfName(selectedSilabusKeys);
                    setBulkLinkPdfName(autoName);
                    setBulkLinkPdfRenameDrive(true);
                    setBulkLinkPdfUploadFile(null);
                    setShowBulkLinkPdfModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  title="Tautkan 1 berkas PDF ke semua judul terpilih"
                >
                  <Link2 size={13} />
                  <span>📎 Tautkan PDF ({selectedSilabusKeys.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBulkGenerateSoalModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  title="Buat paket 20 butir soal CBT untuk semua judul terpilih"
                >
                  <Sparkles size={13} className="text-slate-950" />
                  <span>Buat Soal ({selectedSilabusKeys.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSilabusKeys([])}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="px-2.5 py-3 border-r border-slate-800 text-center w-10">
                      <input
                        type="checkbox"
                        checked={paginatedSilabusRows.length > 0 && paginatedSilabusRows.every(r => selectedSilabusKeys.includes(String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`)))}
                        onChange={handleToggleSelectAllCurrentPage}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4 accent-indigo-600"
                        title="Centang semua judul di halaman ini"
                      />
                    </th>
                    <th className="px-3 py-3 border-r border-slate-800 text-center w-12">NO</th>
                    <th className="px-3 py-3 border-r border-slate-800 text-center w-20">KELAS</th>
                    <th className="px-3.5 py-3 border-r border-slate-800 min-w-[160px]">MATA PELAJARAN</th>
                    <th className="px-3.5 py-3 border-r border-slate-800 min-w-[240px]">TOPIK SUB-TUGAS</th>
                    <th className="px-3 py-3 border-r border-slate-800 text-center min-w-[130px]">STATUS PDF</th>
                    <th className="px-3 py-3 border-r border-slate-800 text-center min-w-[140px]">STATUS SOAL</th>
                    <th className="px-3.5 py-3 border-r border-slate-800 text-center min-w-[150px]">STATUS PENUGASAN</th>
                    <th className="px-3 py-3 text-center min-w-[150px]">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedSilabusRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <FileSpreadsheet size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">Tidak ada data silabus yang sesuai filter.</p>
                        <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter di atas.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSilabusRows.map((r, idx) => {
                      const rowKey = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
                      const isRowSelected = selectedSilabusKeys.includes(rowKey);
                      const pLetter = normalizePaketLetter(r);
                      const paketColor = pLetter === 'A' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                        pLetter === 'B' ? 'bg-sky-100 text-sky-900 border-sky-200' : 'bg-purple-100 text-purple-900 border-purple-200';
                      const assignedTasks = getAssignedTasksForSilabus(r);
                      const hasPdf = hasPdfForSilabus(r);
                      const bankSoal = getBankSoalForSilabus(r);
                      const isAssigned = assignedTasks.length > 0;

                      return (
                        <tr key={`${r.kodePaket}-${r.subKe}-${idx}`} className={`transition group ${isRowSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}>
                          {/* 0. CHECKBOX */}
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-100 bg-slate-50/40">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectSilabusRow(rowKey)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4 accent-indigo-600"
                            />
                          </td>

                          {/* 1. NO */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600 bg-slate-50/50 border-r border-slate-100">
                            {r.no}
                          </td>

                          {/* 2. KELAS */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-100">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${paketColor}`}>
                              {r.kelas}
                            </span>
                            <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{r.semester}</div>
                          </td>

                          {/* 3. MATA PELAJARAN */}
                          <td className="px-3.5 py-2.5 border-r border-slate-100">
                            <div className="font-bold text-slate-900 text-xs">{r.mataPelajaran}</div>
                            <div className="text-[10px] text-slate-400 font-medium">Modul {r.modul}: {r.temaModul}</div>
                          </td>

                          {/* 4. TOPIK SUB-TUGAS */}
                          <td className="px-3.5 py-2.5 border-r border-slate-100">
                            <div className="font-bold text-slate-900 text-xs">{r.topikSubTugas}</div>
                            <div className="text-[10px] font-mono text-slate-400 font-semibold">{r.kodeSubTugas}</div>
                          </td>

                          {/* 5. STATUS BERKAS PDF (BIRU) */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-100">
                            {hasPdf ? (
                              <a
                                href={r.fileUrl || r.FileUrl || r.pdfUrl || r.linkMateri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[10px] border border-blue-300 transition shadow-2xs"
                                title="Lihat berkas PDF materi kurikulum"
                              >
                                <FileText size={11} className="text-blue-600" />
                                <span>Ada PDF</span>
                                <ExternalLink size={9} className="opacity-60" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickLinkPdf(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold text-[10px] border border-slate-200 hover:border-blue-200 transition cursor-pointer"
                                title="Klik untuk menautkan link berkas PDF"
                              >
                                <Plus size={10} className="text-slate-400" />
                                <span>Belum Ada PDF</span>
                              </button>
                            )}
                          </td>

                          {/* 6. STATUS SOAL DI BANK_SOAL (KUNING) */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-100">
                            {bankSoal ? (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300 shadow-2xs"
                                title={`Tersedia di BANK_SOAL (${bankSoal.id || 'Paket BNK'})`}
                              >
                                <CheckCircle2 size={11} className="text-amber-600" />
                                <span>Ada di Bank Soal</span>
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] border border-slate-200"
                                title="Belum di-generate ke BANK_SOAL"
                              >
                                <Clock size={11} className="text-slate-400" />
                                <span>Belum Ada Soal</span>
                              </span>
                            )}
                          </td>

                          {/* 7. STATUS PENUGASAN (HIJAU / MERAH) */}
                          <td className="px-3.5 py-2.5 text-center border-r border-slate-100">
                            {isAssigned ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>Sudah Ditugaskan</span>
                                </span>
                                <span className="text-[9px] text-slate-500 font-semibold max-w-[130px] truncate" title={assignedTasks.map(t => formatClassLabel(t.kelas, false)).join(', ')}>
                                  {assignedTasks.map(t => formatClassLabel(t.kelas, false)).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300 shadow-2xs">
                                <Clock size={11} className="text-rose-600" />
                                <span>Belum Ditugaskan</span>
                              </span>
                            )}
                          </td>

                          {/* 8. AKSI (WORKFLOW STEP: PDF -> SOAL -> TUGASKAN) */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!hasPdf ? (
                                /* Step 1: Harus Tautkan PDF dulu */
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickLinkPdf(r)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95"
                                  title="Tahap 1: Tautkan berkas PDF materi terlebih dahulu"
                                >
                                  <Link size={12} />
                                  <span>Tautkan PDF</span>
                                </button>
                              ) : !bankSoal ? (
                                /* Step 2: Harus Buatkan Soal dulu di BANK_SOAL */
                                <button
                                  type="button"
                                  onClick={() => handleGenerateBankSoalFromSilabus(r)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs active:scale-95"
                                  title="Tahap 2: Buatkan 20 butir soal di BANK_SOAL"
                                >
                                  <Sparkles size={12} />
                                  <span>Buat Soal</span>
                                </button>
                              ) : (
                                /* Step 3: Baru bisa Ditugaskan (WARNA INDIGO / EMERALD, BUKAN MERAH!) */
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(r)}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 ${
                                    isAssigned
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                  title={isAssigned ? 'Tugaskan ke kelas lain' : 'Tugaskan materi dan soal ini ke kelas'}
                                >
                                  <Plus size={13} />
                                  <span>{isAssigned ? 'Tugaskan Lagi' : 'Tugaskan'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditSilabusModal(r)}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-lg transition cursor-pointer"
                                title="Edit data sub-tugas silabus"
                              >
                                <Edit size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSilabusItem(r)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg transition cursor-pointer"
                                title="Hapus sub-tugas silabus"
                              >
                                <Trash2 size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(r.kodeSubTugas);
                                  setSyncToast(`Kode sub-tugas "${r.kodeSubTugas}" disalin!`);
                                  setTimeout(() => setSyncToast(null), 2500);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                title="Salin kode sub-tugas"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>Tampilkan</span>
                <select
                  value={silabusPageSize}
                  onChange={(e) => {
                    setSilabusPageSize(Number(e.target.value));
                    setSilabusPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
                >
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                  <option value={250}>250 Baris</option>
                  <option value={500}>500 Baris</option>
                  <option value={1004}>Semua (1.004 Baris)</option>
                </select>
                <span>
                  dari <strong>{filteredSilabusRows.length}</strong> total baris
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={silabusPage === 1}
                  onClick={() => setSilabusPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <ChevronLeft size={13} />
                  <span>Sebelumnya</span>
                </button>

                <span className="px-2 font-bold text-slate-700">
                  Halaman {silabusPage} dari {totalSilabusPages}
                </span>

                <button
                  type="button"
                  disabled={silabusPage >= totalSilabusPages}
                  onClick={() => setSilabusPage(p => Math.min(totalSilabusPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BERKAS MATERI & SILABUS TAB */}
      {activeSubTab === 'berkas-silabus' && (
        <SilabusBerkasTab />
      )}

      {/* DASHBOARD TAB */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Dynamic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => handleSubTabChange('daftar-tugas')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5 cursor-pointer hover:border-rose-300 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tugas Terdaftar</span>
                <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                  <FileText size={16} />
                </span>
              </div>
              <div className="text-3xl font-black text-rose-600">
                {stats.totalTugas} <span className="text-xs font-bold text-slate-400">Tugas</span>
              </div>
              <p className="text-[11px] text-rose-600 font-bold group-hover:underline flex items-center gap-1">
                <span>{stats.tugasAktif} Tugas Aktif</span> &rarr;
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tingkat Penyerahan</span>
                <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {stats.tingkatPenyerahan}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {stats.totalKumpul} lembar tugas diserahkan
              </p>
            </div>

            <div 
              onClick={() => handleSubTabChange('pengumpulan')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5 cursor-pointer hover:border-purple-300 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tugas Selesai Dinilai</span>
                <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                  <Award size={16} />
                </span>
              </div>
              <div className="text-3xl font-black text-purple-600">
                {stats.tugasSelesai} <span className="text-xs font-bold text-slate-400">Tugas</span>
              </div>
              <p className="text-[11px] text-purple-600 font-bold group-hover:underline flex items-center gap-1">
                <span>Rata-rata Nilai: {stats.overallAvg}</span> &rarr;
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Tasks */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Clock size={16} className="text-rose-600" />
                Daftar Tugas KBM Terkini
              </h2>
              {tugasList.length > 0 && (
                <button 
                  onClick={() => handleSubTabChange('daftar-tugas')}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Lihat Semua ({tugasList.length})
                </button>
              )}
            </div>

            {tugasList.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                  <CheckSquare size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Belum Ada Tugas KBM</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Buat tugas pembelajaran pertama untuk memulai pembagian tugas dan penilaian siswa.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Plus size={14} />
                  <span>Tambah Tugas KBM</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {tugasList.slice(0, 6).map((t) => (
                  <div 
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-rose-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-700 font-mono font-bold text-[10px]">
                        {t.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        t.status === 'Selesai Dinilai' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'Menunggu Penilaian' ? 'bg-amber-100 text-amber-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{t.judul}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                        <span>{t.mapel}</span> &bull; 
                        <span className="font-bold text-slate-700">{formatClassLabel(t.kelas, true)}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        Tenggat: {t.tenggat}
                      </span>
                      <span className="font-bold text-slate-700">
                        {t.kumpul}/{t.totalSiswa} Terkumpul
                      </span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTugasId(t.id);
                          setActiveSubTab('pengumpulan');
                        }}
                        className="w-full py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        <span>Nilai Pengumpulan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAFTAR TUGAS KBM TAB */}
      {activeSubTab === 'daftar-tugas' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Unified Clean Filter & Toolbar */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            {/* Top row: Search & Primary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari judul tugas, modul, mapel, kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Paket Filter */}
              <div className="lg:col-span-2">
                <select
                  value={filterPaket}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterPaket(val);
                    if (val === 'A' && !['4', '5', '6'].includes(filterKelas.replace(/\D/g, ''))) setFilterKelas('');
                    else if (val === 'B' && !['7', '8', '9'].includes(filterKelas.replace(/\D/g, ''))) setFilterKelas('');
                    else if (val === 'C' && !['10', '11', '12'].includes(filterKelas.replace(/\D/g, ''))) setFilterKelas('');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Jenjang / Paket</option>
                  <option value="A">Paket A (SD - Kls 4-6)</option>
                  <option value="B">Paket B (SMP - Kls 7-9)</option>
                  <option value="C">Paket C (SMA - Kls 10-12)</option>
                </select>
              </div>

              {/* Kelas Filter */}
              <div className="lg:col-span-2">
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="">Semua Kelas</option>
                  {(filterPaket === 'SEMUA' || filterPaket === 'A') && (
                    <optgroup label="Paket A (SD)">
                      <option value="4">Kelas 4 ({classCounts['4'] || 0} Tugas)</option>
                      <option value="5">Kelas 5 ({classCounts['5'] || 0} Tugas)</option>
                      <option value="6">Kelas 6 ({classCounts['6'] || 0} Tugas)</option>
                    </optgroup>
                  )}
                  {(filterPaket === 'SEMUA' || filterPaket === 'B') && (
                    <optgroup label="Paket B (SMP)">
                      <option value="7">Kelas 7 ({classCounts['7'] || 0} Tugas)</option>
                      <option value="8">Kelas 8 ({classCounts['8'] || 0} Tugas)</option>
                      <option value="9">Kelas 9 ({classCounts['9'] || 0} Tugas)</option>
                    </optgroup>
                  )}
                  {(filterPaket === 'SEMUA' || filterPaket === 'C') && (
                    <optgroup label="Paket C (SMA)">
                      <option value="10">Kelas 10 ({classCounts['10'] || 0} Tugas)</option>
                      <option value="11">Kelas 11 ({classCounts['11'] || 0} Tugas)</option>
                      <option value="12">Kelas 12 ({classCounts['12'] || 0} Tugas)</option>
                    </optgroup>
                  )}
                  <optgroup label="Rombel / Kelas Spesifik">
                    {allDistinctClasses.filter(c => !['4','5','6','7','8','9','10','11','12'].includes(c)).map(c => {
                      const studentCount = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
                      return (
                        <option key={c} value={c}>
                          {formatClassLabel(c, true)} ({studentCount} Siswa)
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* Semester Filter */}
              <div className="lg:col-span-2">
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="SEMUA">Semua Semester</option>
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="Aktif Mengumpulkan">Aktif Mengumpulkan</option>
                  <option value="Menunggu Penilaian">Menunggu Penilaian</option>
                  <option value="Selesai Dinilai">Selesai Dinilai</option>
                </select>
              </div>
            </div>

            {/* Bottom row: Counter, Reset, View Mode & Excel Tools */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">
                  Menampilkan <strong className="text-slate-900">{filteredTugas.length}</strong> dari <strong className="text-slate-900">{tugasList.length}</strong> tugas
                </span>
                {(searchTerm || filterPaket !== 'SEMUA' || filterKelas || filterSemester !== 'SEMUA' || filterStatus || filterKategori) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterPaket('SEMUA');
                      setFilterKelas('');
                      setFilterSemester('SEMUA');
                      setFilterStatus('');
                      setFilterKategori('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <X size={12} />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => setViewMode('tabel')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'tabel'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListOrdered size={13} />
                    <span>Tabel</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grup-kelas')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'grup-kelas'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Pisah Per Kelas</span>
                  </button>
                </div>

                {/* Excel Import / Export */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Impor file Excel (.xlsx)"
                >
                  <UploadCloud size={13} className="text-slate-500" />
                  <span>Impor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Ekspor ke file Excel (.xlsx)"
                >
                  <Download size={13} className="text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* EMPTY STATE WHEN ALL TASKS ARE CLEARED */}
          {tugasList.length === 0 ? (
            <div className="bg-white p-10 sm:p-14 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 shadow-2xs max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <FileSpreadsheet size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">Belum Ada Tugas KBM yang Ditugaskan</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Silakan buka tab <strong>"Tabel Silabus Master"</strong> untuk memilih materi kurikulum dan menugaskannya langsung ke kelas siswa, atau buat tugas secara manual.
                </p>
              </div>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('silabus-master')}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-200 transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare size={16} />
                  <span>Buka Tabel Silabus Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tambah Tugas Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 rounded-2xl text-xs font-bold transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud size={15} />
                  <span>Impor Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'grup-kelas' ? (
            /* VIEW MODE: GROUPED BY CLASS (PISAH PER KELAS) */
            <div className="space-y-6">
              {['4', '5', '6', '7', '8', '9', '10', '11', '12'].map((grade) => {
                const gradeTasks = filteredTugas.filter(t => isTaskMatchingClass(t, grade));
                if (gradeTasks.length === 0 && filterKelas && !isTaskMatchingClass({ kelas: `${grade}A` } as any, filterKelas)) {
                  return null;
                }
                if (gradeTasks.length === 0) return null;

                const paketBadge = Number(grade) <= 6 
                  ? { name: 'SD / Paket A', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' }
                  : Number(grade) <= 9 
                  ? { name: 'SMP / Paket B', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' }
                  : { name: 'SMA / Paket C', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' };

                return (
                  <div key={grade} className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${paketBadge.bg} ${paketBadge.text} ${paketBadge.border}`}>
                          {paketBadge.name}
                        </span>
                        <h3 className="text-base font-black text-slate-900">
                          Kelas {grade}
                        </h3>
                        <span className="text-xs text-slate-500 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {gradeTasks.length} Tugas Modul
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTugasId(gradeTasks[0]?.id || '');
                          setActiveSubTab('pengumpulan');
                        }}
                        className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 size={13} />
                        <span>Buka Penilaian Kelas {grade}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-3 pl-4">Kode</th>
                            <th className="p-3">Judul Tugas Pembelajaran</th>
                            <th className="p-3">Mata Pelajaran</th>
                            <th className="p-3">Rombel</th>
                            <th className="p-3">Tenggat</th>
                            <th className="p-3 text-center">Pengumpulan</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 pr-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {gradeTasks.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 pl-4 font-mono font-bold text-rose-700">
                                {t.id}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 text-xs">{t.judul}</div>
                                {t.kodeModul && (
                                  <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded mr-1">
                                    {t.kodeModul}
                                  </span>
                                )}
                                {t.soalList && t.soalList.length > 0 && (
                                  <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                    {t.soalList.length} Soal PG
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-semibold text-slate-800">{t.mapel}</td>
                              <td className="p-3 font-bold text-slate-700">{formatClassLabel(t.kelas, true)}</td>
                              <td className="p-3 text-slate-600 font-mono">{t.tenggat}</td>
                              <td className="p-3 text-center font-bold font-mono text-slate-800">
                                {t.kumpul}/{t.totalSiswa}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                  t.status === 'Selesai Dinilai' ? 'bg-emerald-100 text-emerald-800' :
                                  t.status === 'Menunggu Penilaian' ? 'bg-amber-100 text-amber-800' :
                                  'bg-sky-100 text-sky-800'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="p-3 pr-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setSelectedTugasId(t.id);
                                      setActiveSubTab('pengumpulan');
                                    }}
                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold text-[10px] transition"
                                    title="Nilai"
                                  >
                                    Nilai
                                  </button>
                                  <button
                                    onClick={() => setViewDetailModal(t)}
                                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[10px] transition"
                                    title="Detail"
                                  >
                                    Lihat
                                  </button>
                                  <button
                                    onClick={() => setEditModal({ ...t })}
                                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md font-bold text-[10px] transition"
                                    title="Edit"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteModal({ id: t.id, name: t.judul })}
                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold text-[10px] transition"
                                    title="Hapus"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* STANDARD TABLE VIEW */
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pl-4">Kode</th>
                      <th className="p-3.5">Judul Tugas Pembelajaran</th>
                      <th className="p-3.5">Mata Pelajaran</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Tenggat Waktu</th>
                      <th className="p-3.5 text-center">Pengumpulan</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Rata-rata Nilai</th>
                      <th className="p-3.5 pr-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedTugas.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-slate-400">
                          <CheckSquare size={36} className="mx-auto text-slate-300 mb-2.5" />
                          <p className="font-bold text-slate-700 text-sm">Tidak Ada Tugas KBM Ditemukan</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Belum ada tugas yang cocok dengan filter. Klik tombol "Buat Tugas Baru" atau ubah pilihan kelas.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedTugas.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 pl-4 font-mono font-bold text-rose-700">
                            <div>{t.id}</div>
                            {t.kodeModul && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">
                                {t.kodeModul}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{t.judul}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {t.kategori && (
                                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                                  {t.kategori}
                                </span>
                              )}
                              {t.soalList && t.soalList.length > 0 && (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Sparkles size={11} className="text-amber-500" />
                                  {t.soalList.length} Soal PG (Auto-Grading)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{t.mapel}</td>
                          <td className="p-3.5">
                            {(() => {
                              const kStr = String(t.kelas || '');
                              const isPaketA = kStr.startsWith('4') || kStr.startsWith('5') || kStr.startsWith('6');
                              const isPaketB = kStr.startsWith('7') || kStr.startsWith('8') || kStr.startsWith('9');
                              return (
                                <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] border ${
                                  isPaketA
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : isPaketB
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-purple-50 text-purple-800 border-purple-200'
                                }`}>
                                  {formatClassLabel(t.kelas, true)}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-slate-700 flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {t.tenggat}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-800 font-mono">
                            {t.kumpul}/{t.totalSiswa}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              t.status === 'Selesai Dinilai' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'Menunggu Penilaian' ? 'bg-amber-100 text-amber-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-rose-700">
                            {t.avg > 0 ? t.avg : '-'}
                          </td>
                          <td className="p-3.5 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTugasId(t.id);
                                  setActiveSubTab('pengumpulan');
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Penilaian"
                              >
                                <CheckCircle2 size={12} />
                                <span className="hidden sm:inline">Nilai</span>
                              </button>
                              <button
                                onClick={() => setViewDetailModal(t)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Lihat Detail"
                              >
                                <Eye size={12} />
                                <span className="hidden sm:inline">Lihat</span>
                              </button>
                              <button
                                onClick={() => setEditModal({ ...t })}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Edit Data"
                              >
                                <Edit size={12} />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteModal({ id: t.id, name: t.judul })}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Hapus Data"
                              >
                                <Trash2 size={12} />
                                <span className="hidden sm:inline">Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION CONTROLS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                  <span>
                    Menampilkan <strong className="text-slate-900">{filteredTugas.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> - <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredTugas.length)}</strong> dari <strong className="text-rose-600 font-black">{filteredTugas.length}</strong> Tugas
                  </span>

                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                    <span className="text-slate-400 text-[11px] font-bold">Baris per halaman:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                      <option value={99999}>Semua ({filteredTugas.length})</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                      title="Halaman Pertama"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1 px-1 text-xs font-bold text-slate-700">
                      <span>Hal</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          }
                        }}
                        className="w-12 px-1.5 py-1 text-center font-black bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20"
                      />
                      <span>dari {totalPages}</span>
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                      title="Halaman Terakhir"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HASIL PENGUMPULAN & NILAI TAB */}
      {activeSubTab === 'pengumpulan' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Task Selector Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1 w-full">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pilih Tugas KBM untuk Penilaian:
                  </label>
                  {filterKelas && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      Difilter: {formatClassLabel(filterKelas, true)}
                    </span>
                  )}
                </div>

                {tugasList.length === 0 ? (
                  <p className="text-xs text-rose-600 font-bold">Belum ada tugas dibuat. Silakan buat tugas terlebih dahulu.</p>
                ) : (
                  <select
                    value={selectedTugasId}
                    onChange={(e) => setSelectedTugasId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <optgroup label="Paket A (Kelas 4 - 6 SD)">
                      {tugasList
                        .filter(t => isTaskMatchingClass(t, '4') || isTaskMatchingClass(t, '5') || isTaskMatchingClass(t, '6'))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            [{t.id}] {t.judul} - {formatClassLabel(t.kelas, true)} ({t.mapel})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Paket B (Kelas 7 - 9 SMP)">
                      {tugasList
                        .filter(t => isTaskMatchingClass(t, '7') || isTaskMatchingClass(t, '8') || isTaskMatchingClass(t, '9'))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            [{t.id}] {t.judul} - {formatClassLabel(t.kelas, true)} ({t.mapel})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Paket C (Kelas 10 - 12 SMA)">
                      {tugasList
                        .filter(t => isTaskMatchingClass(t, '10') || isTaskMatchingClass(t, '11') || isTaskMatchingClass(t, '12'))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            [{t.id}] {t.judul} - {formatClassLabel(t.kelas, true)} ({t.mapel})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                )}
              </div>

              {selectedTugas && (
                <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">Kelas / Rombel</span>
                    <span className="font-black text-slate-900">{formatClassLabel(selectedTugas.kelas, true)}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">Tenggat Waktu</span>
                    <span className="font-bold text-slate-800">{selectedTugas.tenggat}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">Terkumpul</span>
                    <span className="font-bold text-rose-600">{selectedTugas.kumpul} Siswa</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">Rata-rata Nilai</span>
                    <span className="font-bold text-emerald-600">{selectedTugas.avg > 0 ? selectedTugas.avg : '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Grading List */}
          {selectedTugas ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Lembar Pengumpulan & Nilai Siswa ({formatClassLabel(selectedTugas.kelas, true)})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Input nilai dan status penyerahan untuk setiap siswa di kelas ini.</p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  Total Siswa: {studentsInSelectedClass.length}
                </span>
              </div>

              {studentsInSelectedClass.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Belum Ada Siswa Terdaftar di {formatClassLabel(selectedTugas.kelas, true)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Silakan daftarkan siswa melalui menu Data Siswa / SPMB.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 pl-4">No</th>
                        <th className="p-3.5">NISN / ID</th>
                        <th className="p-3.5">Nama Siswa</th>
                        <th className="p-3.5 text-center">Status Pengumpulan</th>
                        <th className="p-3.5 text-center">Waktu Kumpul</th>
                        <th className="p-3.5 text-center">Nilai (0-100)</th>
                        <th className="p-3.5">Catatan / Umpan Balik Guru</th>
                        <th className="p-3.5 pr-4 text-center">Lembar Jawaban</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {studentsInSelectedClass.map((student, idx) => {
                        const sub = submissions.find(s => s.tugasId === selectedTugasId && s.studentId === student.id);
                        const currentStatus = sub?.status || 'Belum Mengumpulkan';
                        const currentNilai = sub?.nilai ?? '';
                        const currentCatatan = sub?.catatanGuru || '';

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 pl-4 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3.5 font-mono text-slate-600">{student.nisn || student.id}</td>
                            <td className="p-3.5 font-bold text-slate-900">{student.name}</td>
                            <td className="p-3.5 text-center">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleUpdateStudentSubmission(
                                  student.id, 
                                  e.target.value as any, 
                                  currentNilai !== '' ? Number(currentNilai) : null, 
                                  currentCatatan
                                )}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                  currentStatus === 'Sudah Mengumpulkan' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  currentStatus === 'Terlambat' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <option value="Belum Mengumpulkan">Belum Mengumpulkan</option>
                                <option value="Sudah Mengumpulkan">Sudah Mengumpulkan</option>
                                <option value="Terlambat">Terlambat</option>
                              </select>
                            </td>
                            <td className="p-3.5 text-center font-mono text-[11px] text-slate-500">
                              {sub?.submittedAt || '-'}
                            </td>
                            <td className="p-3.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                value={currentNilai}
                                onChange={(e) => handleUpdateStudentSubmission(
                                  student.id, 
                                  currentStatus, 
                                  e.target.value !== '' ? Number(e.target.value) : null, 
                                  currentCatatan
                                )}
                                className="w-20 px-2.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                              />
                            </td>
                            <td className="p-3.5">
                              <input
                                type="text"
                                placeholder="Tulis masukan untuk siswa..."
                                value={currentCatatan}
                                onChange={(e) => handleUpdateStudentSubmission(
                                  student.id, 
                                  currentStatus, 
                                  currentNilai !== '' ? Number(currentNilai) : null, 
                                  e.target.value
                                )}
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                              />
                            </td>
                            <td className="p-3.5 pr-4 text-center">
                              {sub && sub.status !== 'Belum Mengumpulkan' ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectSubmissionModal({
                                    student,
                                    submission: sub,
                                    tugas: selectedTugas
                                  })}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer border border-indigo-200 shadow-2xs"
                                  title="Lihat rincian lembar jawaban siswa"
                                >
                                  <Eye size={12} />
                                  <span>{sub.jawabanDetail || selectedTugas.isAutoGrading ? 'Jawaban Kuis' : 'Lihat Jawaban'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Belum Mengumpulkan</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center text-slate-400">
              <CheckSquare size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Pilih Tugas KBM untuk Menampilkan Lembar Penilaian</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL (TAMBAH TUGAS) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Buat Tugas KBM Baru</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTugas} className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
              {/* Quick Preset Selector: BANK SOAL CBT (Tarik dari Bank Soal) */}
              <div className="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={14} className="text-cyan-600" />
                    Tarik Dari Bank Soal CBT ({bankSoalList.length} Paket Tersedia)
                  </label>
                </div>

                {bankSoalList.length > 0 ? (
                  <select
                    onChange={(e) => {
                      const bankId = e.target.value;
                      if (!bankId) return;
                      const found = bankSoalList.find(b => (b.id === bankId || b.BankSoalID === bankId));
                      if (!found) return;
                      const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                      const rawK = String(found.kelas || found.Kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
                      const qList = (found.soalList && Array.isArray(found.soalList)) ? found.soalList : [];
                      const qCount = qList.length;
                      setNewTugas({
                        judul: `Latihan Penugasan: ${found.mapel || found.Mapel || 'Mata Pelajaran'} (${found.id || found.BankSoalID})`,
                        mapel: found.mapel || found.Mapel || 'Mata Pelajaran',
                        kelas: rawK,
                        tenggat: defaultDeadline,
                        kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
                        deskripsi: `Penugasan ditarik dari Bank Soal CBT [${found.id || found.BankSoalID}] - ${found.mapel || found.Mapel}. Terdiri dari ${qCount} butir soal. Kurikulum: ${found.kurikulum || 'Kurikulum Merdeka'}.`,
                        isAutoGrading: true,
                        soalList: qList
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="">-- Pilih Paket Bank Soal CBT untuk Ditarik ke Tugas --</option>
                    {bankSoalList.map((b: any) => (
                      <option key={b.id || b.BankSoalID} value={b.id || b.BankSoalID}>
                        [{b.id || b.BankSoalID}] {b.mapel || b.Mapel} - Kelas {b.kelas || b.Kelas} ({b.jumlahSoal || (b.soalList ? b.soalList.length : 0)} Soal)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    Belum ada paket Bank Soal. Anda dapat membuat paket soal secara mandiri di menu CBT & Ujian atau menariknya dari Google Spreadsheet.
                  </div>
                )}
                <p className="text-[10px] text-cyan-700 font-medium">
                  Mengintegrasikan butir soal asli guru langsung ke modul penugasan & penilaian siswa.
                </p>
              </div>

              {/* Quick Preset Selector: Silabus Modul */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl space-y-1.5">
                <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Pilih Cepat Dari Modul Silabus Excel ({kurikulumModulList.length} Modul)
                </label>
                <select
                  onChange={(e) => {
                    const modulId = e.target.value;
                    if (!modulId) return;
                    const found = kurikulumModulList.find(m => m.id === modulId);
                    if (!found) return;
                    const targetClass = found.paket === 'A' ? '4' : found.paket === 'B' ? '7' : '10';
                    const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                    const topicTitle = found.subBab && found.subBab[0] ? found.subBab[0] : (found.temaModul || 'Materi Pembelajaran');
                    const generated20 = generate20SoalPilihanGanda({
                      mapel: found.mataPelajaran,
                      topik: topicTitle,
                      tema: found.temaModul,
                      kelas: targetClass,
                      paket: found.paket
                    });
                    setNewTugas({
                      judul: `${found.kode} - ${topicTitle}`,
                      mapel: found.mataPelajaran,
                      kelas: targetClass,
                      tenggat: defaultDeadline,
                      kategori: 'Kuis Pilihan Ganda (Auto-Grading)',
                      deskripsi: `${found.kode} (Modul ${found.modulNo}: ${found.temaModul}). Paket 20 Soal Pilihan Ganda Auto-Grading. Sub-Bab: ${found.subBab.join(', ')}.`,
                      isAutoGrading: true,
                      soalList: generated20
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- Pilih Silabus Modul untuk Auto-Fill --</option>
                  <optgroup label="Paket A (Setara SD - Kelas 4-6)">
                    {kurikulumModulList.filter(m => m.paket === 'A').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.kode} - {m.mataPelajaran}: {m.temaModul}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Paket B (Setara SMP - Kelas 7-9)">
                    {kurikulumModulList.filter(m => m.paket === 'B').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.kode} - {m.mataPelajaran}: {m.temaModul}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Paket C (Setara SMA - Kelas 10-12)">
                    {kurikulumModulList.filter(m => m.paket === 'C').map(m => (
                      <option key={m.id} value={m.id}>
                        {m.kode} - {m.mataPelajaran}: {m.temaModul}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Judul Tugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Portofolio Mengarang Bahasa Indonesia"
                  value={newTugas.judul}
                  onChange={(e) => setNewTugas({ ...newTugas, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Matematika, IPA"
                    value={newTugas.mapel}
                    onChange={(e) => setNewTugas({ ...newTugas, mapel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Kelas / Rombel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={newTugas.kelas}
                    onChange={(e) => setNewTugas({ ...newTugas, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="">Pilih Kelas...</option>
                    {availableClasses.map(c => {
                      const count = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
                      return (
                        <option key={c} value={c}>{formatClassLabel(c, true)} ({count} Siswa)</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Tenggat Waktu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newTugas.tenggat}
                    onChange={(e) => setNewTugas({ ...newTugas, tenggat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Kategori Tugas
                  </label>
                  <select
                    value={newTugas.kategori}
                    onChange={(e) => setNewTugas({ ...newTugas, kategori: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Kuis Pilihan Ganda (Auto-Grading)">Kuis Pilihan Ganda (Auto-Grading)</option>
                    <option value="Tugas Individu">Tugas Individu</option>
                    <option value="Tugas Kelompok">Tugas Kelompok</option>
                    <option value="Pekerjaan Rumah (PR)">Pekerjaan Rumah (PR)</option>
                    <option value="Praktik & Portofolio">Praktik & Portofolio</option>
                    <option value="Proyek Siswa">Proyek Siswa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Petunjuk & Uraian Pengerjaan
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan petunjuk pengerjaan atau instruksi tugas..."
                  value={newTugas.deskripsi}
                  onChange={(e) => setNewTugas({ ...newTugas, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Simpan Tugas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (LIHAT) */}
      {viewDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Detail Tugas KBM Siswa</h3>
              </div>
              <button 
                onClick={() => setViewDetailModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Kode Tugas</span>
                <span className="font-mono font-black text-rose-600">{viewDetailModal.id}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Judul Tugas</span>
                <span className="font-extrabold text-slate-900 text-right">{viewDetailModal.judul}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Mata Pelajaran</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.mapel}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Rombel / Kelas</span>
                <span className="font-extrabold text-slate-900">{formatClassLabel(viewDetailModal.kelas, true)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Tenggat Waktu</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.tenggat}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Progres Pengumpulan</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.kumpul} / {viewDetailModal.totalSiswa} Siswa</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Status Tugas</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.status}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Rata-rata Nilai</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.avg > 0 ? `${viewDetailModal.avg} Poin` : 'Belum Ada Nilai'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                <span className="font-bold text-slate-500 block">Petunjuk Pengerjaan</span>
                <p className="font-medium text-slate-800 leading-relaxed">{viewDetailModal.deskripsi || '-'}</p>
              </div>

              {/* Soal Pilihan Ganda (Auto-Grading 20 Soal) */}
              {Array.isArray(viewDetailModal.soalList) && viewDetailModal.soalList.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="font-black text-rose-900 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-rose-600" />
                      Paket Soal Pilihan Ganda ({viewDetailModal.soalList.length} Butir Soal)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-900 font-bold text-[10px]">
                        Auto-Grading
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                    {viewDetailModal.soalList.map((soal: any, idx: number) => (
                      <div key={soal.id || idx} className="p-3 bg-white rounded-xl border border-rose-100/80 shadow-2xs space-y-1.5">
                        <div className="font-bold text-slate-900 flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{soal.pertanyaan}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold shrink-0">
                            {soal.bobot || 5} Poin
                          </span>
                        </div>

                        {soal.opsi && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {Object.entries(soal.opsi).map(([optKey, optVal]) => {
                              const isKey = (soal.kunci || soal.kunciJawaban || soal.KunciJawaban) && 
                                String(soal.kunci || soal.kunciJawaban || soal.KunciJawaban).toLowerCase() === optKey.toLowerCase();
                              return (
                                <div
                                  key={optKey}
                                  className={`p-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 ${
                                    isKey
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black uppercase shrink-0 ${
                                    isKey ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {optKey}
                                  </span>
                                  <span className="truncate">{String(optVal)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {(soal.pembahasan || soal.PembahasanRasional || soal.Pembahasan) && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <strong className="text-indigo-700">Pembahasan Rasional:</strong> {soal.pembahasan || soal.PembahasanRasional || soal.Pembahasan}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Tampilan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (EDIT) */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Edit Tugas: {editModal.judul}</h3>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Judul Tugas</label>
                <input
                  type="text"
                  required
                  value={editModal.judul || ''}
                  onChange={(e) => setEditModal({ ...editModal, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={editModal.mapel || ''}
                    onChange={(e) => setEditModal({ ...editModal, mapel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas</label>
                  <select
                    value={editModal.kelas || ''}
                    onChange={(e) => setEditModal({ ...editModal, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {availableClasses.map(c => {
                      const count = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
                      return (
                        <option key={c} value={c}>{formatClassLabel(c, true)} ({count} Siswa)</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tenggat Waktu</label>
                  <input
                    type="date"
                    required
                    value={editModal.tenggat || ''}
                    onChange={(e) => setEditModal({ ...editModal, tenggat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Tugas</label>
                  <select
                    value={editModal.status || 'Aktif Mengumpulkan'}
                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Aktif Mengumpulkan">Aktif Mengumpulkan</option>
                    <option value="Menunggu Penilaian">Menunggu Penilaian</option>
                    <option value="Selesai Dinilai">Selesai Dinilai</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Petunjuk Pengerjaan</label>
                <textarea
                  rows={2}
                  value={editModal.deskripsi || ''}
                  onChange={(e) => setEditModal({ ...editModal, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (HAPUS) */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Tugas Pembelajaran</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus tugas <strong className="text-slate-800">"{deleteModal.name}"</strong>? Seluruh data pengumpulan tugas ini juga akan dihapus.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT PREVIEW & COMMIT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Preview Impor File Excel Silabus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    File: <strong className="text-emerald-700">{importFileName}</strong> &bull; Ditemukan <strong className="text-slate-900">{importParsedData.length} baris tugas</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setImportModalOpen(false);
                  setImportParsedData([]);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Format spreadsheet terbaca dengan sukses!</strong>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  Sistem otomatis mendeteksi kolom No, Kode Modul, Tingkat Kelas/Rombel, Mata Pelajaran, Judul Sub-Bab, dan Tenggat Waktu dari {importParsedData.length} baris data Anda.
                </p>
              </div>
            </div>

            {/* Table Preview (first 10 rows) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Contoh 10 Baris Pertama yang Terbaca:</span>
                <span className="text-[11px] text-slate-400 font-normal">Total {importParsedData.length} data siap dimasukkan</span>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 pl-3">No</th>
                      <th className="p-2.5">Kode</th>
                      <th className="p-2.5">Judul / Sub-Bab</th>
                      <th className="p-2.5">Mata Pelajaran</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">Tenggat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {importParsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-2.5 pl-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-rose-600 font-bold text-[11px]">{row.kodeModul || row.id}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.judul}</td>
                        <td className="p-2.5 text-slate-600">{row.mapel}</td>
                        <td className="p-2.5 font-bold">{row.kelas}</td>
                        <td className="p-2.5 font-mono text-slate-500">{row.tenggat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Selection */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                Pilih metode penyimpanan ke database:
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportParsedData([]);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => handleCommitImport('merge')}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer"
                  title="Tambahkan data ini ke daftar tugas yang sudah ada"
                >
                  <Plus size={14} />
                  <span>Gabungkan (Merge)</span>
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => handleCommitImport('replace')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer"
                  title="Ganti semua data tugas dengan data dari file Excel ini"
                >
                  <Check size={14} />
                  <span>Ganti Semua Data ({importParsedData.length} Baris)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: TUGASKAN DARI SILABUS MASTER */}
      {assignSilabusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shadow-2xs">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Formulir Penugasan Silabus KBM
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tetapkan materi silabus resmi menjadi tugas aktif siswa di kelas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignSilabusModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Silabus Item Information Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${
                    assignSilabusModal.paket === 'A' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                    assignSilabusModal.paket === 'B' ? 'bg-sky-100 text-sky-900 border-sky-200' : 'bg-purple-100 text-purple-900 border-purple-200'
                  }`}>
                    Paket {assignSilabusModal.paket} &bull; Kelas {assignSilabusModal.kelas}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold">
                    Semester {assignSilabusModal.semester}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  No. {assignSilabusModal.no}
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500">{assignSilabusModal.mataPelajaran} &bull; Modul {assignSilabusModal.modul} ({assignSilabusModal.temaModul})</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  {assignSilabusModal.topikSubTugas}
                </div>
                <div className="text-[11px] font-mono text-rose-600 font-bold mt-1">
                  {assignSilabusModal.kodeSubTugas}
                </div>
              </div>
            </div>

            {/* Assignment Configuration Form */}
            <form onSubmit={handleConfirmAssignSilabus} className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {/* Target Kelas & Tenggat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Users size={12} className="text-rose-600" />
                    <span>Target Kelas / Rombel *</span>
                  </label>
                  <select
                    value={assignForm.targetKelas}
                    onChange={(e) => setAssignForm({ ...assignForm, targetKelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  >
                    {availableClasses.map(c => {
                      const count = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
                      return (
                        <option key={c} value={c}>
                          {formatClassLabel(c, true)} ({count} Siswa Aktif)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} className="text-rose-600" />
                    <span>Tenggat Waktu *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={assignForm.tenggat}
                    onChange={(e) => setAssignForm({ ...assignForm, tenggat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Judul Tugas & Kategori */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Judul Penugasan Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={assignForm.judul}
                  onChange={(e) => setAssignForm({ ...assignForm, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="Judul penugasan KBM..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Kategori Penugasan
                  </label>
                  <select
                    value={assignForm.kategori}
                    onChange={(e) => setAssignForm({ ...assignForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Kuis & Modul Pembelajaran">Kuis & Modul Pembelajaran</option>
                    <option value="Tugas Harian / Individu">Tugas Harian / Individu</option>
                    <option value="Ulangan Harian / Asesmen">Ulangan Harian / Asesmen</option>
                    <option value="Proyek & Portofolio">Proyek & Portofolio</option>
                    <option value="Latihan & PR">Latihan & PR</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={assignForm.isAutoGrading}
                      onChange={(e) => setAssignForm({ ...assignForm, isAutoGrading: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">Penilaian Otomatis (Auto-Grading)</span>
                  </label>
                </div>
              </div>

              {/* Petunjuk & Instruksi Guru */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Instruksi / Petunjuk Guru untuk Siswa
                </label>
                <textarea
                  rows={3}
                  value={assignForm.deskripsi}
                  onChange={(e) => setAssignForm({ ...assignForm, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                  placeholder="Tuliskan petunjuk pengerjaan..."
                />
              </div>

              {/* Info box */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <HelpCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  Setelah tombol <strong>"Tugaskan Sekarang"</strong> ditekan, data tugas ini akan langsung otomatis disinkronkan ke tab <strong>"Daftar Tugas KBM Siswa"</strong> dan tercatat pada status silabus.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignSilabusModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Send size={14} />
                  <span>Tugaskan Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SILABUS ROW MODAL */}
      {silabusModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  {silabusModalMode === 'add' ? <Plus size={18} /> : <Edit size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {silabusModalMode === 'add' ? 'Tambah Sub-Tugas Silabus' : 'Edit Sub-Tugas Silabus'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {silabusModalMode === 'add' ? 'Tambahkan entri baru ke master silabus kurikulum' : `Mengedit data sub-tugas No #${silabusForm.no}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSilabusModalMode(null);
                  setSelectedSilabusItem(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSilabusForm} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={silabusForm.kelas}
                    onChange={(e) => {
                      const k = e.target.value;
                      const p = ['4', '5', '6'].includes(k) ? 'A' : ['7', '8', '9'].includes(k) ? 'B' : 'C';
                      setSilabusForm({
                        ...silabusForm,
                        kelas: k,
                        kodePaket: `MOD-${p}${k}`
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {['4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                      <option key={g} value={g}>Kelas {g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Semester
                  </label>
                  <select
                    value={silabusForm.semester}
                    onChange={(e) => setSilabusForm({ ...silabusForm, semester: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    No. Urut
                  </label>
                  <input
                    type="number"
                    value={silabusForm.no}
                    onChange={(e) => setSilabusForm({ ...silabusForm, no: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={silabusForm.mataPelajaran}
                    onChange={(e) => setSilabusForm({ ...silabusForm, mataPelajaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="Contoh: Bahasa Indonesia"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Singkatan
                  </label>
                  <input
                    type="text"
                    value={silabusForm.sing}
                    onChange={(e) => setSilabusForm({ ...silabusForm, sing: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 uppercase"
                    placeholder="BI"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Modul Ke-
                  </label>
                  <input
                    type="number"
                    value={silabusForm.modul}
                    onChange={(e) => setSilabusForm({ ...silabusForm, modul: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Sub Ke-
                  </label>
                  <input
                    type="number"
                    value={silabusForm.subKe}
                    onChange={(e) => setSilabusForm({ ...silabusForm, subKe: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Tema Modul
                </label>
                <input
                  type="text"
                  value={silabusForm.temaModul}
                  onChange={(e) => setSilabusForm({ ...silabusForm, temaModul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  placeholder="Contoh: Lingkungan Sahabat Kita"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Kode Sub-Tugas
                  </label>
                  <input
                    type="text"
                    value={silabusForm.kodeSubTugas}
                    onChange={(e) => setSilabusForm({ ...silabusForm, kodeSubTugas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="BI-A4-1-1"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Status
                  </label>
                  <input
                    type="text"
                    value={silabusForm.status}
                    onChange={(e) => setSilabusForm({ ...silabusForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="Tersedia"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Topik Sub-Tugas <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={silabusForm.topikSubTugas}
                  onChange={(e) => setSilabusForm({ ...silabusForm, topikSubTugas: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                  placeholder="Contoh: Mengidentifikasi Teks Nonfiksi"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSilabusModalMode(null);
                    setSelectedSilabusItem(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Save size={14} />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: INSPEKSI LEMBAR JAWABAN SISWA */}
      {inspectSubmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Lembar Jawaban: {inspectSubmissionModal.student.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectSubmissionModal.tugas.judul} &bull; Kelas {formatClassLabel(inspectSubmissionModal.student.class || inspectSubmissionModal.tugas.kelas, true)} &bull; NISN: {inspectSubmissionModal.student.nisn || '-'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectSubmissionModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Status Pengumpulan</span>
                  <span className="text-xs font-black text-emerald-700 mt-0.5 block">
                    {inspectSubmissionModal.submission?.status || 'Sudah Mengumpulkan'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Waktu Kumpul</span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                    {inspectSubmissionModal.submission?.submittedAt || '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Skor Saat Ini</span>
                  <span className="text-base font-black text-rose-600 mt-0.5 block">
                    {inspectSubmissionModal.submission?.nilai ?? '-'} / 100
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tipe Pengerjaan</span>
                  <span className="text-xs font-bold text-indigo-700 mt-0.5 block">
                    {inspectSubmissionModal.submission?.jawabanDetail || inspectSubmissionModal.tugas.isAutoGrading ? 'Kuis Soal Langsung' : 'Dokumen / Teks'}
                  </span>
                </div>
              </div>

              {/* SECTION A: LANGSUNG MENGERJAKAN SOAL (KUIS PILIHAN GANDA / AUTO-GRADING) */}
              {Array.isArray(inspectSubmissionModal.tugas.soalList) && inspectSubmissionModal.tugas.soalList.length > 0 && (
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" />
                      Rincian Pengerjaan Soal Kuis ({inspectSubmissionModal.tugas.soalList.length} Butir Soal)
                    </h4>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Auto-Grading
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {inspectSubmissionModal.tugas.soalList.map((soal: any, sIdx: number) => {
                      const userAns = inspectSubmissionModal.submission?.jawabanDetail?.[soal.id || (sIdx + 1)];
                      const kunci = String(soal.kunci || '').toLowerCase();
                      const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
                      const isCorrect = isAnswered && String(userAns).toLowerCase() === kunci;

                      return (
                        <div 
                          key={soal.id || sIdx} 
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            !isAnswered ? 'bg-slate-50 border-slate-200' :
                            isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : isAnswered ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-700'
                              }`}>
                                {sIdx + 1}
                              </span>
                              <span className="font-bold text-slate-900">{soal.pertanyaan}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              !isAnswered ? 'bg-slate-200 text-slate-700' :
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {!isAnswered ? 'Tidak Dijawab' : isCorrect ? 'Benar (+Poin)' : 'Salah'}
                            </span>
                          </div>

                          {/* Options display */}
                          {soal.opsi && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pl-7">
                              {Object.entries(soal.opsi).map(([optKey, optVal]: [string, any]) => {
                                const isUserChoice = String(userAns).toLowerCase() === optKey.toLowerCase();
                                const isKeyChoice = kunci === optKey.toLowerCase();

                                return (
                                  <div 
                                    key={optKey}
                                    className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                                      isUserChoice && isKeyChoice ? 'bg-emerald-100 border-emerald-300 font-bold text-emerald-900' :
                                      isUserChoice && !isKeyChoice ? 'bg-rose-100 border-rose-300 font-bold text-rose-900' :
                                      isKeyChoice ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' :
                                      'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <span className="uppercase font-mono font-black">{optKey}.</span>
                                    <span className="truncate">{String(optVal)}</span>
                                    {isUserChoice && <span className="text-[9px] px-1 bg-white rounded font-bold ml-auto shrink-0">(Pilihan Siswa)</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {soal.pembahasan && (
                            <p className="text-[10px] text-slate-500 italic pl-7 pt-0.5">
                              Pembahasan: {soal.pembahasan}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION B: BUKTI PENYELESAIAN TUGAS (FOTO, TULISAN & BERKAS) */}
              {(inspectSubmissionModal.submission?.fotoBuktiUrl || inspectSubmissionModal.submission?.textJawaban || inspectSubmissionModal.submission?.fileLink) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-600" />
                      Bukti Penyelesaian Tugas (Foto & Tulisan)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const student = inspectSubmissionModal.student;
                        const tugas = inspectSubmissionModal.tugas;
                        const sub = inspectSubmissionModal.submission;
                        const msg = `*BUKTI PENYELESAIAN TUGAS - WHATSAPP GROUP PDKT*\n` +
                          `-----------------------------------------\n` +
                          `• *Nama Siswa:* ${student.name}\n` +
                          `• *NISN / Kelas:* ${student.nisn || '-'} / ${formatClassLabel(student.class, true)}\n` +
                          `• *Mata Pelajaran:* ${tugas.mapel}\n` +
                          `• *Judul Tugas:* ${tugas.judul}\n` +
                          `• *Jadwal:* ${tugas.rentangJadwal || tugas.semester || '-'}\n` +
                          `• *Waktu Kumpul:* ${sub?.submittedAt || new Date().toLocaleString('id-ID')}\n` +
                          (sub?.textJawaban ? `• *Tulisan/Catatan:* ${sub.textJawaban}\n` : '') +
                          (sub?.fileLink ? `• *Link Dokumen:* ${sub.fileLink}\n` : '') +
                          (sub?.fotoBuktiUrl ? `• *Lampiran Foto Bukti:* Terlampir di sistem portal\n` : '') +
                          `-----------------------------------------\n` +
                          `_Telah diverifikasi oleh Guru Pengajar melalui Portal Akademik KTCT Tambora._`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      title="Bagikan ringkasan bukti tugas ke WhatsApp Group PDKT"
                    >
                      <Share2 size={12} />
                      <span>Kirim ke WhatsApp Group PDKT</span>
                    </button>
                  </div>

                  {/* Foto Bukti Penyelesaian */}
                  {inspectSubmissionModal.submission?.fotoBuktiUrl && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Camera size={12} className="text-emerald-600" />
                        Foto Bukti Pengerjaan Tugas:
                      </span>
                      <div className="flex items-start gap-3 p-2 bg-white border border-slate-200 rounded-xl">
                        <img
                          src={inspectSubmissionModal.submission.fotoBuktiUrl}
                          alt="Foto Bukti Tugas"
                          className="w-24 h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition shrink-0"
                          onClick={() => setPreviewPhotoModal({
                            url: inspectSubmissionModal.submission?.fotoBuktiUrl || '',
                            title: `${inspectSubmissionModal.student.name} - ${inspectSubmissionModal.tugas.judul}`
                          })}
                        />
                        <div className="space-y-1.5 text-xs py-1">
                          <p className="font-bold text-slate-800">Lampiran Foto Bukti Pengerjaan</p>
                          <p className="text-[11px] text-slate-500">Klik pada gambar untuk memperbesar foto bukti pengerjaan tugas siswa.</p>
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoModal({
                              url: inspectSubmissionModal.submission?.fotoBuktiUrl || '',
                              title: `${inspectSubmissionModal.student.name} - ${inspectSubmissionModal.tugas.judul}`
                            })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            <Eye size={12} />
                            <span>Perbesar Tampilan Foto</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectSubmissionModal.submission?.textJawaban && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Jawaban / Catatan Tertulis Siswa:</span>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {inspectSubmissionModal.submission.textJawaban}
                      </div>
                    </div>
                  )}

                  {inspectSubmissionModal.submission?.fileLink && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tautan Berkas Tugas:</span>
                      <div>
                        <a
                          href={inspectSubmissionModal.submission.fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                        >
                          <BookOpen size={13} />
                          <span>Buka Dokumen / Link Tugas Siswa</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION C: EDIT NILAI & MASUKAN GURU */}
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-rose-600" />
                  Penyesuaian Nilai & Masukan Guru
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Nilai Akhir (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={inspectSubmissionModal.submission?.nilai ?? ''}
                      id="modal-submission-nilai"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Catatan / Umpan Balik untuk Siswa</label>
                    <input
                      type="text"
                      defaultValue={inspectSubmissionModal.submission?.catatanGuru || ''}
                      id="modal-submission-catatan"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      placeholder="Catatan hasil koreksi atau apresiasi guru..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nilaiInput = document.getElementById('modal-submission-nilai') as HTMLInputElement;
                      const catatanInput = document.getElementById('modal-submission-catatan') as HTMLInputElement;
                      const parsedNilai = nilaiInput && nilaiInput.value !== '' ? Number(nilaiInput.value) : null;
                      const catatanVal = catatanInput ? catatanInput.value : '';

                      handleUpdateStudentSubmission(
                        inspectSubmissionModal.student.id,
                        (inspectSubmissionModal.submission?.status as any) || 'Sudah Mengumpulkan',
                        parsedNilai,
                        catatanVal
                      );
                      setInspectSubmissionModal(null);
                      setSyncToast(`Nilai siswa ${inspectSubmissionModal.student.name} berhasil diperbarui!`);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save size={13} />
                    <span>Simpan Perubahan Nilai</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectSubmissionModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Lembar Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LINK PDF & FILE PICKER MODAL FOR SILABUS */}
      {quickLinkPdfModal && (() => {
        const targetKelas = String(quickLinkPdfModal.kelas || '').replace(/[A-Za-z]/g, '').trim();
        const targetMapel = (quickLinkPdfModal.mataPelajaran || '').trim().toLowerCase();
        
        let allDocs: any[] = [];
        try {
          const cached = localStorage.getItem('sista_cached_drive_modul_files');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              allDocs = sanitizeScannedDriveFiles(parsed);
            }
          }
          if (allDocs.length === 0) {
            allDocs = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusRows));
          }
        } catch {
          allDocs = sanitizeScannedDriveFiles(generateCurriculumDriveCatalog(silabusRows));
        }

        const handleManualUrlChange = (newUrl: string) => {
          setQuickPdfUrl(newUrl);
          if (newUrl.trim()) {
            const { fileName } = deriveFileNameFromUrlAndItem(newUrl, quickLinkPdfModal, allDocs);
            setQuickPdfName(fileName);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] space-y-4">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Tautkan Link Berkas Modul</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                        Google Drive
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">Salin dan tempelkan tautan berkas Google Drive untuk modul materi ini</p>
                  </div>
                </div>
                <button 
                  onClick={() => setQuickLinkPdfModal(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                  title="Tutup dialog"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Rincian Silabus Target */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1 shrink-0">
                <div className="text-[11px] font-bold text-blue-900 uppercase">
                  {quickLinkPdfModal.mataPelajaran} • Kelas {quickLinkPdfModal.kelas} ({quickLinkPdfModal.semester})
                </div>
                <div className="text-sm font-black text-slate-900">
                  {quickLinkPdfModal.topikSubTugas}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Kode: {quickLinkPdfModal.kodeSubTugas} | Modul {quickLinkPdfModal.modul}: {quickLinkPdfModal.temaModul}
                </div>
              </div>


                <div className="space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Link size={13} className="text-blue-600" />
                      <span>Link Berkas PDF Google Drive / URL Web</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/... atau https://..."
                      value={quickPdfUrl}
                      onChange={(e) => handleManualUrlChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400">
                      Masukkan tautan berkas PDF yang dapat diakses publik atau diatur "Siapa saja yang memiliki tautan".
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nama Tampilan Berkas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Modul_1_Bahasa_Indonesia_Kls4.pdf"
                      value={quickPdfName}
                      onChange={(e) => setQuickPdfName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>💡 Format Standar Silabus otomatis terisi saat memilih berkas atau memasukkan URL.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const { fileName } = deriveFileNameFromUrlAndItem('', quickLinkPdfModal, allDocs);
                          setQuickPdfName(fileName);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={10} /> Format Standar Silabus
                      </button>
                    </div>

                    {extractGoogleDriveFileId(quickPdfUrl) && (
                      <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl mt-2">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={renamePhysicalFileOnDrive}
                            onChange={(e) => setRenamePhysicalFileOnDrive(e.target.checked)}
                            className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                              <span>Ubah nama berkas fisik di Google Drive saat tombol "Simpan & Tautkan" diklik</span>
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                Default Aktif
                              </span>
                            </span>
                            <span className="text-[10px] text-sky-700 block mt-0.5">
                              Nama file fisik di Google Drive Anda akan langsung berganti sesuai nama di atas via DriveApp.setName().
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickLinkPdfModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!quickPdfUrl.trim()}
                  onClick={handleSaveQuickLinkPdf}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  <span>Simpan & Tautkan ke Silabus</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: TAUTKAN BERKAS PDF SEKALIGUS KE BANYAK JUDUL SILABUS */}
      {showBulkLinkPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tautkan PDF Sekaligus Banyak
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mentautkan 1 berkas ke <strong>{selectedSilabusKeys.length}</strong> judul silabus terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkLinkPdfModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Selected Items Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-36 overflow-y-auto space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-slate-500 block">
                  Target Judul Silabus ({getSelectedSilabusItems().filter(item => !item.fileUrl && !item.FileUrl && !item.pdfUrl && !item.linkMateri).length} judul):
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  Hanya yang belum ada PDF
                </span>
              </div>
              {getSelectedSilabusItems()
                .filter(item => !item.fileUrl && !item.FileUrl && !item.pdfUrl && !item.linkMateri)
                .slice(0, 6).map((item, idx) => (
                <div key={idx} className="text-xs text-slate-700 truncate font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span><strong>[{item.kelas} - {item.mataPelajaran}]</strong> {item.topikSubTugas || item.temaModul}</span>
                </div>
              ))}
              {getSelectedSilabusItems().filter(item => !item.fileUrl && !item.FileUrl && !item.pdfUrl && !item.linkMateri).length > 6 && (
                <div className="text-[11px] text-slate-400 italic pt-1">
                  ... dan {getSelectedSilabusItems().filter(item => !item.fileUrl && !item.FileUrl && !item.pdfUrl && !item.linkMateri).length - 6} judul silabus lainnya
                </div>
              )}
              {selectedSilabusKeys.length === 0 && (
                <div className="text-xs text-amber-800 space-y-1 py-1">
                  <p className="font-semibold">Belum ada judul yang dicentang. Pilih dari daftar yang belum ada PDF:</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {silabusRows
                      .filter(r => !r.fileUrl && !r.FileUrl && !r.pdfUrl && !r.linkMateri)
                      .slice(0, 20).map((r, i) => {
                        const key = String(r.id || `${r.kodePaket || r.kodeSubTugas || 'row'}_${r.no}`);
                        return (
                          <label key={key} className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-slate-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedSilabusKeys.includes(key)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSilabusKeys(prev => [...prev, key]);
                                else setSelectedSilabusKeys(prev => prev.filter(k => k !== key));
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="truncate">[{r.kelas} - {r.mataPelajaran}] {r.topikSubTugas || r.temaModul}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Source Selection Tab */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBulkLinkPdfSource('URL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  bulkLinkPdfSource === 'URL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tautan / URL Web / Drive
              </button>
              <button
                type="button"
                onClick={() => setBulkLinkPdfSource('UPLOAD')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  bulkLinkPdfSource === 'UPLOAD' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unggah Berkas PDF
              </button>
            </div>

            {bulkLinkPdfSource === 'URL' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  URL Berkas PDF / Google Drive <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/... atau URL PDF materi"
                  value={bulkLinkPdfUrl}
                  onChange={(e) => setBulkLinkPdfUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    Pilih File PDF dari Komputer / Perangkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBulkLinkPdfUploadFile(file);
                      if (file && !bulkLinkPdfName) {
                        setBulkLinkPdfName(file.name);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
                {bulkLinkPdfUploadFile && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="truncate">{bulkLinkPdfUploadFile.name} ({(bulkLinkPdfUploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Nama Berkas & Opsi Google Drive Rename */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Nama Berkas (kodeMapel-noModul-temaModul)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const stdName = getStandardBulkPdfName();
                    setBulkLinkPdfName(stdName);
                  }}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} />
                  <span>⚡ Reset Format Otomatis</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Contoh: C12-BING-11-With My Pleasure.pdf"
                value={bulkLinkPdfName}
                onChange={(e) => setBulkLinkPdfName(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={bulkLinkPdfRenameDrive}
                  onChange={(e) => setBulkLinkPdfRenameDrive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>✓ Otomatis ganti nama berkas fisik di Google Drive sesuai format</span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkLinkPdfModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingBulkPdfLink}
                onClick={handleExecuteBulkLinkPdf}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isProcessingBulkPdfLink ? 'Memproses...' : `Tautkan ke (${selectedSilabusKeys.length}) Judul`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUAT SOAL SEKALIGUS BANYAK DARI JUDUL SILABUS (BANK SOAL CBT) */}
      {showBulkGenerateSoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Buat Paket Soal CBT Sekaligus Banyak
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otomatis generate bank soal untuk <strong>{selectedSilabusKeys.length}</strong> judul terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkGenerateSoalModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info Workflow */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl text-xs space-y-1.5 text-amber-900">
              <div className="font-black flex items-center gap-1.5 text-amber-950">
                <CheckCircle2 size={15} className="text-amber-600 shrink-0" />
                <span>Alur Otomasi Bank Soal Kurikulum:</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Sistem akan membuat paket Bank Soal CBT terstandar (Pilihan Ganda A/B/C/D dengan kunci jawaban presisi &amp; pembahasan) untuk setiap judul kurikulum yang dipilih. Status soal silabus akan otomatis berubah menjadi <strong>Kuning (Tersedia)</strong> dan siap ditugaskan ke kelas.
              </p>
            </div>

            {/* Setting: Jumlah Soal Per Judul */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Jumlah Butir Soal Tiap Judul:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[20, 15, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBulkJumlahSoalPerJudul(num)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition cursor-pointer ${
                      bulkJumlahSoalPerJudul === num
                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-bold'
                    }`}
                  >
                    <div className="text-sm font-black">{num} Soal</div>
                    <div className="text-[9px] opacity-80">{num === 20 ? 'Standar Ujian' : num === 15 ? 'Ulangan Blok' : 'Kuis Harian'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Akan dibuatkan untuk ({selectedSilabusKeys.length}) Judul:
              </span>
              {getSelectedSilabusItems().slice(0, 5).map((item, idx) => (
                <div key={idx} className="text-xs text-slate-700 truncate font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span><strong>[{item.kelas} - {item.mataPelajaran}]</strong> {item.topikSubTugas || item.temaModul}</span>
                </div>
              ))}
              {selectedSilabusKeys.length > 5 && (
                <div className="text-[11px] text-slate-400 italic pt-1">
                  ... dan {selectedSilabusKeys.length - 5} judul silabus lainnya
                </div>
              )}
            </div>

            {/* Summary Total */}
            <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-2xl text-xs font-bold">
              <span>Total Estimasi Butir Soal:</span>
              <span className="text-amber-400 font-mono text-sm font-black">
                {selectedSilabusKeys.length * bulkJumlahSoalPerJudul} Butir Soal ({selectedSilabusKeys.length} Paket)
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkGenerateSoalModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isGeneratingBulkSoal}
                onClick={handleExecuteBulkGenerateSoal}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-amber-200 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={14} className="text-slate-950" />
                <span>{isGeneratingBulkSoal ? 'Membuat Soal...' : `Buat ${selectedSilabusKeys.length * bulkJumlahSoalPerJudul} Soal Sekaligus`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUATKAN TUGAS SEKALIGUS (SERENTAK TERHUBUNG KE PORTAL SISWA & JADWAL SEMESTER) */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Buatkan Tugas Sekaligus ke Portal Siswa</h3>
                  <p className="text-xs text-slate-500">
                    Otomatis terhubung ke daftar tugas KBM dan portal siswa masing-masing kelas terpilih.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aturan Jadwal Semester */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                <Calendar size={15} className="text-emerald-700" />
                <span>Standarisasi Waktu & Jadwal Tugas Semester</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-white/80 border border-emerald-200 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Semester Ganjil
                  </span>
                  <p className="text-slate-600">Juli s/d Desember 2026</p>
                  <p className="text-slate-500 font-mono text-[10px]">Mulai: 15 Juli 2026 • Tenggat: 20 Des 2026</p>
                </div>
                <div className="p-2.5 bg-white/80 border border-emerald-200 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Semester Genap
                  </span>
                  <p className="text-slate-600">Januari s/d Juni 2027</p>
                  <p className="text-slate-500 font-mono text-[10px]">Mulai: 5 Jan 2027 • Tenggat: 20 Jun 2027</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs font-bold text-emerald-900 shrink-0">Opsi Penentuan Semester:</label>
                <select
                  value={bulkAssignSemesterOverride}
                  onChange={(e: any) => setBulkAssignSemesterOverride(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-white border border-emerald-200 rounded-xl text-slate-800 outline-hidden"
                >
                  <option value="AUTO">Otomatis deteksi dari kolom Semester di Silabus</option>
                  <option value="GANJIL">Paksa semua ke Semester Ganjil (Juli - Desember)</option>
                  <option value="GENAP">Paksa semua ke Semester Genap (Januari - Juni)</option>
                </select>
              </div>
            </div>

            {/* Pengaturan Penugasan */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
              <span className="font-black text-slate-800 block uppercase tracking-wider text-[10px]">
                Opsi Distribusi & Validasi Kelas
              </span>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkAssignAllRombels}
                  onChange={(e) => setBulkAssignAllRombels(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-medium">
                  Distribusikan ke semua rombel paralel (Contoh: Kelas 4 otomatis ditugaskan ke 4A dan 4B)
                </span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkAssignSkipExisting}
                  onChange={(e) => setBulkAssignSkipExisting(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-medium">
                  Lewati jika judul tugas sudah pernah diterbitkan di kelas yang sama
                </span>
              </label>
            </div>

            {/* Bukti Penyelesaian & WhatsApp Info */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-950">
              <span className="font-bold flex items-center gap-1">
                <Share2 size={13} className="text-amber-700" />
                Bukti Penyelesaian Tugas Siswa (WhatsApp Group PDKT)
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Tugas yang dibuatkan sudah dilengkapi dengan modul kuis interaktif 20 butir PG auto-grading serta form pengumpulan bukti penyelesaian tugas (berupa Foto dan Tulisan) yang langsung tersambung dan dapat dikirimkan ke WhatsApp Group PDKT.
              </p>
            </div>

            {/* Daftar Silabus Terpilih */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Daftar {selectedSilabusKeys.length} Judul Silabus Terpilih:</span>
                <span className="text-[11px] text-slate-400 font-mono">Paket A, B, C</span>
              </div>
              <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 divide-y divide-slate-100">
                {getSelectedSilabusItems().map((item, idx) => {
                  const schedule = getSemesterSchedule(item.semester, bulkAssignSemesterOverride);
                  return (
                    <div key={idx} className="pt-1.5 first:pt-0 text-xs flex items-center justify-between gap-2">
                      <div className="truncate font-medium text-slate-800">
                        <strong className="text-emerald-700">[{item.kelas} - {item.mataPelajaran}]</strong> {item.topikSubTugas || item.temaModul}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {schedule.semesterLabel} ({schedule.bulanMulai}-{schedule.bulanSelesai})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingBulkAssign}
                onClick={handleExecuteBulkAssignTasks}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 cursor-pointer"
              >
                <Send size={14} />
                <span>
                  {isProcessingBulkAssign ? 'Menerbitkan Tugas...' : `Terbitkan ${selectedSilabusKeys.length} Tugas Sekarang`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW FOTO BUKTI */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-white px-2">
              <div className="text-xs font-bold truncate">
                <span>Foto Bukti: </span>
                <span className="text-slate-300 font-normal">{previewPhotoModal.title}</span>
              </div>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <a
                href={previewPhotoModal.url}
                download="bukti_tugas.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <Download size={13} />
                <span>Unduh Foto Bukti</span>
              </a>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End of Page */}
    </div>
  );
}
