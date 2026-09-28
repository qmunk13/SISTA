import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Wallet, Search, Plus, Trash2, X, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, CheckCircle, UserCheck, FileSpreadsheet, User, Building2,
  Upload, FileText, ChevronLeft, ChevronRight, GraduationCap, RefreshCw, FileUp, AlertCircle, CheckCircle2,
  ClipboardCheck, Edit, Save, AlertTriangle, Sparkles, School, Users, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { KeuanganTabungan, seedDefaultKeuanganTransactions, isKeuanganCleared } from '../../data/keuanganSeed';
import { REAL_TABUNGAN_FROM_SHEETS } from '../../data/keuanganTransactionsData';
import { 
  normalizeTabunganRow, 
  formatTabunganForSheet, 
  generateStructuredTabunganId,
  getTabunganNaturalKey,
  deduplicateTabunganList
} from '../../lib/keuanganNormalizers';
import { exportToExcel } from '../../lib/excel';
import { getAllClasses, formatClassLabel, matchClass } from '../../lib/utils';
import { 
  getAcademicPeriodInfo, 
  matchAcademicFilter, 
  extractAvailableAcademicYears 
} from '../../lib/academicYear';
import { pullAllSheetsFromGas, pullSpecificSheetFromGas, getStoredGasUrl, isValidGasUrl } from '../../utils/gasSync';
import { fetchFromGAS } from '../../lib/api';
import { DEFAULT_APP_CONFIG } from '../../data/config';

export default function TabunganSiswaTab() {
  const { students, settings } = useStore();
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('SEMUA');
  const [filterSemester, setFilterSemester] = useState('SEMUA');
  const [filterJenis, setFilterJenis] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTabungan, setEditingTabungan] = useState<KeuanganTabungan | null>(null);

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  // Helper to extract comparable millisecond timestamp from any date format
  const getNormalizedTimestamp = (t: any): number => {
    if (!t) return 0;
    const val = t.tanggal || t.Tanggal || t.createdAt || t.CreatedAt || t.UpdatedAt || '';
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10) - 1;
      const y = parseInt(dmy[3], 10);
      return new Date(y, m, d).getTime();
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Tabungan State
  const [tabunganList, setTabunganList] = useState<KeuanganTabungan[]>(() => {
    if (isKeuanganCleared()) {
      return [];
    }
    const rawData = db.get<any>('keuangan_tabungan') || db.get<any>('TABUNGAN') || [];
    const normalized = rawData.map((row: any, idx: number) => normalizeTabunganRow(row, idx, students));
    return deduplicateTabunganList(normalized);
  });

  const [isSyncingLatest, setIsSyncingLatest] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const refreshFromDb = () => {
      const latest = db.get<any>('keuangan_tabungan') || db.get<any>('TABUNGAN') || [];
      const normalized = latest.map((row: any, idx: number) => normalizeTabunganRow(row, idx, students));
      const deduped = deduplicateTabunganList(normalized);
      if (deduped.length < latest.length) {
        db.set('keuangan_tabungan', deduped, { skipPush: true });
        db.set('TABUNGAN', deduped, { skipPush: true });
      }
      setTabunganList(deduped);
    };

    // Instant Pull On Mount: Langsung menarik data sheet TABUNGAN dari server/Google Sheets dalam hitungan detik
    const pullLatestTabunganImmediately = async () => {
      if (isKeuanganCleared()) return;
      setIsSyncingLatest(true);
      try {
        const fastRes = await pullSpecificSheetFromGas('TABUNGAN');
        if (isSubscribed && fastRes.success && Array.isArray(fastRes.data) && fastRes.data.length > 0) {
          const normalizedRemote = deduplicateTabunganList(fastRes.data.map((row: any, idx: number) => normalizeTabunganRow(row, idx, students)));
          setTabunganList(normalizedRemote);
          db.set('keuangan_tabungan', normalizedRemote, { skipPush: true });
          db.set('TABUNGAN', normalizedRemote, { skipPush: true });
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.warn('Silent on-mount Tabungan fast sync failed:', err);
      } finally {
        if (isSubscribed) {
          setIsSyncingLatest(false);
        }
      }
    };

    pullLatestTabunganImmediately();

    const handleDbUpdated = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'keuangan_tabungan' || key === 'TABUNGAN' || key === 'keuangan_all' || key === 'all_idb') {
        refreshFromDb();
      }
    };
    const handleClear = () => {
      setTabunganList([]);
    };
    window.addEventListener('erp-db-updated', handleDbUpdated);
    window.addEventListener('erp-db-synced', refreshFromDb);
    window.addEventListener('erp-keuangan-cleared', handleClear);

    // Hydration check in case IndexedDB loads right after mount
    const timer1 = setTimeout(refreshFromDb, 60);
    const timer2 = setTimeout(refreshFromDb, 300);

    return () => {
      isSubscribed = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('erp-db-updated', handleDbUpdated);
      window.removeEventListener('erp-db-synced', refreshFromDb);
      window.removeEventListener('erp-keuangan-cleared', handleClear);
    };
  }, [students]);

  // Modal Form State
  const [formData, setFormData] = useState({
    siswaId: '',
    namaSiswa: '',
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: 'SETOR' as 'SETOR' | 'TARIK',
    nominal: 50000,
    petugasId: 'Bendahara Tabungan',
    keterangan: 'Setoran tabungan rutin',
  });

  const [siswaSearchInput, setSiswaSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Sync & Import State
  const [isPullingGas, setIsPullingGas] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const saveTabunganToDb = (newList: KeuanganTabungan[]) => {
    const unique = deduplicateTabunganList(newList);
    setTabunganList(unique);
    db.set('keuangan_tabungan', unique);
    db.set('TABUNGAN', unique, { skipPush: true });
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'TABUNGAN' } }));
  };

  const getActiveGasUrl = () => {
    return (settings?.scriptUrl || settings?.gasUrl || getStoredGasUrl() || '').trim();
  };

  // Pull Directly from Google Sheets Web App (Sheet TABUNGAN)
  const handlePullFromGas = async () => {
    const gasUrl = (settings?.gasUrl || getStoredGasUrl() || '').trim();
    if (!isValidGasUrl(gasUrl)) {
      setSyncFeedback({
        type: 'error',
        message: 'URL Google Apps Script belum valid. Atur URL Web App di menu Pengaturan Akun / Database.'
      });
      return;
    }

    setIsPullingGas(true);
    setSyncFeedback(null);
    try {
      let remoteTabungan: any[] = [];
      const fastRes = await pullSpecificSheetFromGas('TABUNGAN', gasUrl);
      if (fastRes.success && Array.isArray(fastRes.data) && fastRes.data.length > 0) {
        remoteTabungan = fastRes.data;
      } else {
        const res = await pullAllSheetsFromGas(gasUrl);
        if (res.success && res.data) {
          remoteTabungan = res.data.TABUNGAN || res.data.tabungan || [];
        }
      }

      if (Array.isArray(remoteTabungan) && remoteTabungan.length > 0) {
        const converted = remoteTabungan.map((row: any, idx: number) => normalizeTabunganRow(row, idx, students));
        saveTabunganToDb(converted);
        setSyncFeedback({
          type: 'success',
          message: `Berhasil menarik ${converted.length} baris riwayat tabungan dari Google Sheets (Sheet TABUNGAN)!`
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'Sheet "TABUNGAN" di Google Spreadsheet saat ini belum memiliki baris data (kosong).'
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: 'Terjadi kendala jaringan saat menarik data: ' + (err.message || String(err))
      });
    } finally {
      setIsPullingGas(false);
    }
  };

  // File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find sheet TABUNGAN or use the first sheet
        const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('TABUNG')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert(`File kosong atau sheet "${sheetName}" tidak berisi data baris.`);
          return;
        }

        const normalized = rawJson.map((row, idx) => normalizeTabunganRow(row, idx, students));

        if (importMode === 'replace') {
          saveTabunganToDb(normalized);
        } else {
          const map = new Map(tabunganList.map(t => [t.id, t]));
          normalized.forEach(t => map.set(t.id, t));
          saveTabunganToDb(Array.from(map.values()));
        }

        setIsImportModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`Berhasil mengimpor ${normalized.length} mutasi tabungan dari file "${file.name}"!`);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        alert('Gagal memproses file Excel: ' + (err.message || 'Format tidak didukung.'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Text / TSV / Copy-Paste Import
  const handleTextImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importRawText.trim()) {
      alert('Silakan tempel (paste) data tabel spreadsheet terlebih dahulu.');
      return;
    }

    try {
      let rawJson: any[] = [];
      try {
        const workbook = XLSX.read(importRawText, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } catch {
        const lines = importRawText.trim().split(/\r?\n/);
        if (lines.length > 1) {
          const headers = lines[0].split('\t').map(h => h.trim());
          rawJson = lines.slice(1).map(l => {
            const cols = l.split('\t');
            const obj: Record<string, any> = {};
            headers.forEach((h, idx) => {
              obj[h] = cols[idx] || '';
            });
            return obj;
          });
        }
      }

      if (!rawJson || rawJson.length === 0) {
        alert('Format data tidak dikenali. Pastikan menyertakan baris judul kolom.');
        return;
      }

      const normalized = rawJson.map((row, idx) => normalizeTabunganRow(row, idx, students));

      if (importMode === 'replace') {
        saveTabunganToDb(normalized);
      } else {
        const map = new Map(tabunganList.map(t => [t.id, t]));
        normalized.forEach(t => map.set(t.id, t));
        saveTabunganToDb(Array.from(map.values()));
      }

      setIsImportModalOpen(false);
      setImportRawText('');
      alert(`Berhasil mengimpor ${normalized.length} transaksi tabungan secara permanen!`);
    } catch (err: any) {
      alert('Gagal memproses data: ' + err.message);
    }
  };

  const availableAcademicYears = useMemo(() => {
    const dates = tabunganList.map(t => t.tanggal);
    return extractAvailableAcademicYears(dates);
  }, [tabunganList]);

  // Memanggil seluruh siswa (aktif, lulus, alumni, pindahan)
  const allStudents = useMemo(() => {
    return students;
  }, [students]);

  // Distinct Siswa List with Savings
  const distinctSiswaList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; class: string }>();
    allStudents.forEach(s => {
      map.set(s.id, { id: s.id, name: s.name, class: s.class || '' });
    });
    tabunganList.forEach(t => {
      if (!map.has(t.siswaId)) {
        map.set(t.siswaId, { id: t.siswaId, name: t.namaSiswa, class: '-' });
      }
    });
    const all = Array.from(map.values());
    if (!filterKelas) return all;
    return all.filter(s => matchClass(s.class, filterKelas));
  }, [allStudents, tabunganList, filterKelas]);

  // Map students by ID and NIS for O(1) class lookup
  const studentClassMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => {
      if (s.id) map.set(s.id, s.class || '');
      if (s.nis) map.set(s.nis, s.class || '');
    });
    return map;
  }, [students]);

  // Compute running balance once per tabunganList change (O(N) operation instead of O(N^2) on every search keystroke)
  const itemsWithRunningBalance = useMemo(() => {
    // 1. Urutkan secara kronologis (dari mutasi paling awal ke mutasi terkini berdasarkan No urut buku kas / tanggal) untuk perhitungan saldo berjalan siswa
    const sorted = [...tabunganList].sort((a, b) => {
      const noA = Number((a as any).no ?? (a as any).No ?? 0);
      const noB = Number((b as any).no ?? (b as any).No ?? 0);
      if (noA > 0 && noB > 0 && noA !== noB) return noA - noB;
      const timeA = getNormalizedTimestamp(a);
      const timeB = getNormalizedTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;
      return 0;
    });

    const balanceMap: { [siswaId: string]: number } = {};
    const withRunningBalance = sorted.map(t => {
      const nom = Number(t.nominal) || 0;
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
      if (!balanceMap[t.siswaId]) balanceMap[t.siswaId] = 0;
      if (isSetor) balanceMap[t.siswaId] += nom;
      else balanceMap[t.siswaId] -= nom;

      const studentClass = studentClassMap.get(t.siswaId) || t.studentClass || '';
      const debit = isSetor ? nom : 0;
      const kredit = !isSetor ? nom : 0;

      return {
        ...t,
        tabunganId: t.tabunganId || t.id,
        jenisTransaksi: (isSetor ? 'SETOR' : 'TARIK') as 'SETOR' | 'TARIK',
        debit,
        kredit,
        studentClass,
        saldo: balanceMap[t.siswaId],
      };
    });

    // 2. Tampilkan langsung data paling mutakhir / transaksi terbaru di baris paling atas (Page 1)
    return withRunningBalance.sort((a, b) => {
      const noA = Number((a as any).no ?? (a as any).No ?? 0);
      const noB = Number((b as any).no ?? (b as any).No ?? 0);
      if (noA > 0 && noB > 0 && noA !== noB) return noB - noA; // Nomor transaksi tertinggi di atas
      const timeA = getNormalizedTimestamp(a);
      const timeB = getNormalizedTimestamp(b);
      if (timeA !== timeB) return timeB - timeA; // Paling baru di atas
      return 0;
    });
  }, [tabunganList, studentClassMap]);

  // Filtered Tabungan Items
  const filteredAndCalculatedItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return itemsWithRunningBalance.filter(t => {
      const matchesQ = !searchTerm || 
        String(t.namaSiswa || '').toLowerCase().includes(q) || 
        String(t.siswaId || '').toLowerCase().includes(q) || 
        String(t.tabunganId || t.id || '').toLowerCase().includes(q) || 
        String(t.keterangan || t.catatan || '').toLowerCase().includes(q) || 
        String(t.petugasId || t.createdBy || '').toLowerCase().includes(q);

      const matchesSiswa = !selectedSiswaId || t.siswaId === selectedSiswaId;
      const matchesKelas = !filterKelas || matchClass(t.studentClass, filterKelas);
      const matchesTA = matchAcademicFilter(t.tanggal, filterTahunAjaran, filterSemester);
      const matchesJenis = !filterJenis || t.jenisTransaksi === filterJenis || t.jenis === filterJenis;

      return matchesQ && matchesSiswa && matchesKelas && matchesTA && matchesJenis;
    });
  }, [itemsWithRunningBalance, selectedSiswaId, filterKelas, filterTahunAjaran, filterSemester, filterJenis, searchTerm]);

  const totalPages = Math.ceil(filteredAndCalculatedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndCalculatedItems.slice(start, start + pageSize);
  }, [filteredAndCalculatedItems, currentPage, pageSize]);

  // Overall Total Savings
  const totalSaldoSemua = useMemo(() => {
    return tabunganList.reduce((acc, t) => {
      const nom = Number(t.nominal) || 0;
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
      return isSetor ? acc + nom : acc - nom;
    }, 0);
  }, [tabunganList]);

  // Total Masuk (Setoran) & Total Keluar (Tarik/Belanja)
  const totalSetorSemua = useMemo(() => {
    return tabunganList.reduce((acc, t) => {
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
      return isSetor ? acc + (Number(t.nominal) || 0) : acc;
    }, 0);
  }, [tabunganList]);

  const totalTarikSemua = useMemo(() => {
    return tabunganList.reduce((acc, t) => {
      const isTarik = t.jenis === 'TARIK' || t.jenisTransaksi === 'TARIK';
      return isTarik ? acc + (Number(t.nominal) || 0) : acc;
    }, 0);
  }, [tabunganList]);

  // Selected Student Details & Balance
  const selectedStudentObj = useMemo(() => {
    if (!selectedSiswaId) return null;
    return distinctSiswaList.find(s => s.id === selectedSiswaId) || students.find(s => s.id === selectedSiswaId);
  }, [selectedSiswaId, distinctSiswaList, students]);

  const selectedStudentBalance = useMemo(() => {
    if (!selectedSiswaId) return 0;
    return tabunganList
      .filter(t => t.siswaId === selectedSiswaId)
      .reduce((acc, t) => {
        const nom = Number(t.nominal) || 0;
        const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
        return isSetor ? acc + nom : acc - nom;
      }, 0);
  }, [tabunganList, selectedSiswaId]);

  const selectedStudentSetor = useMemo(() => {
    if (!selectedSiswaId) return 0;
    return tabunganList
      .filter(t => t.siswaId === selectedSiswaId)
      .reduce((acc, t) => {
        const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
        return isSetor ? acc + (Number(t.nominal) || 0) : acc;
      }, 0);
  }, [tabunganList, selectedSiswaId]);

  const selectedStudentTarik = useMemo(() => {
    if (!selectedSiswaId) return 0;
    return tabunganList
      .filter(t => t.siswaId === selectedSiswaId)
      .reduce((acc, t) => {
        const isTarik = t.jenis === 'TARIK' || t.jenisTransaksi === 'TARIK';
        return isTarik ? acc + (Number(t.nominal) || 0) : acc;
      }, 0);
  }, [tabunganList, selectedSiswaId]);

  // Total balance of currently filtered items
  const filteredTotalSaldo = useMemo(() => {
    return filteredAndCalculatedItems.reduce((acc, t) => {
      const nom = Number(t.nominal) || 0;
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
      return isSetor ? acc + nom : acc - nom;
    }, 0);
  }, [filteredAndCalculatedItems]);

  const hasActiveFilter = Boolean(selectedSiswaId || filterKelas || filterJenis || filterTahunAjaran !== 'SEMUA' || filterSemester !== 'SEMUA' || searchTerm);

  // Modal Filters: Filter Kelas & Status Siswa
  const [modalFilterKelas, setModalFilterKelas] = useState('');
  const [modalFilterStatus, setModalFilterStatus] = useState('Aktif');

  // Filtered list of students for modal based on selected class and status
  const modalFilteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const matchK = !modalFilterKelas || modalFilterKelas === 'Semua Kelas' || matchClass(s.class, modalFilterKelas);
      const sStatus = String(s.status || 'Aktif').trim();
      const matchS = !modalFilterStatus || modalFilterStatus === 'Semua Status' || sStatus.toLowerCase() === modalFilterStatus.toLowerCase();
      return matchK && matchS;
    });
  }, [allStudents, modalFilterKelas, modalFilterStatus]);

  // Filtered list of students for autocomplete within modal
  const autocompleteStudents = useMemo(() => {
    const pool = modalFilteredStudents;
    if (!siswaSearchInput.trim()) return pool.slice(0, 15);
    const q = siswaSearchInput.toLowerCase();
    return pool.filter(s => 
      s.name.toLowerCase().includes(q) || 
      String(s.nis || s.nisn || '').toLowerCase().includes(q) ||
      String(s.class || '').toLowerCase().includes(q) ||
      String(s.id || '').toLowerCase().includes(q)
    ).slice(0, 25);
  }, [modalFilteredStudents, siswaSearchInput]);

  // Selected student object in modal
  const selectedStudentInModal = useMemo(() => {
    if (!formData.siswaId) return null;
    return allStudents.find(s => s.id === formData.siswaId) || null;
  }, [allStudents, formData.siswaId]);

  // Real-time current balance for selected student in modal
  const selectedStudentCurrentSaldo = useMemo(() => {
    if (!formData.siswaId) return 0;
    const studentTxs = tabunganList.filter(t => t.siswaId === formData.siswaId);
    let bal = 0;
    studentTxs.forEach(t => {
      const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
      const nom = Number(t.nominal) || 0;
      if (isSetor) bal += nom;
      else bal -= nom;
    });
    return Math.max(0, bal);
  }, [tabunganList, formData.siswaId]);

  // Auto-generate structured TabunganID: TAB_nopdkt_TTTTBBDD_nomor urut atau TAR_nopdkt_TTTTBBDD_nomor urut
  const previewTabId = useMemo(() => {
    const rawNopdkt = selectedStudentInModal?.nopdkt || 
      selectedStudentInModal?.noPdkt || 
      selectedStudentInModal?.NoPDKT || 
      selectedStudentInModal?.nis || 
      selectedStudentInModal?.NIS || 
      selectedStudentInModal?.idNumber || 
      (formData.siswaId && !String(formData.siswaId).startsWith('SIS_') ? formData.siswaId : '');
    return generateStructuredTabunganId(formData.jenis, formData.tanggal, rawNopdkt, tabunganList);
  }, [formData.jenis, formData.tanggal, formData.siswaId, selectedStudentInModal, tabunganList]);

  const handleOpenAdd = () => {
    setModalFilterKelas('');
    setModalFilterStatus('Aktif');
    // Mulai dengan form kosong agar pengguna bebas memilih siswa tanpa pre-fill otomatis
    setFormData({
      siswaId: '',
      namaSiswa: '',
      tanggal: new Date().toISOString().slice(0, 10),
      jenis: 'SETOR',
      nominal: 50000,
      petugasId: 'Bendahara Tabungan',
      keterangan: 'Setoran tabungan rutin',
    });
    setSiswaSearchInput('');
    setIsAddModalOpen(true);
  };

  const handleSelectStudentInModal = (st: any) => {
    setFormData(prev => ({
      ...prev,
      siswaId: st.id,
      namaSiswa: st.name,
    }));
    setSiswaSearchInput(`${st.name} (${st.class || 'Kelas'})`);
    setIsDropdownOpen(false);
  };

  const handleSubmitTabungan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Siswa',
        text: 'Silakan pilih siswa terlebih dahulu sebelum menyimpan transaksi.'
      });
      return;
    }

    const inputNominal = Number(formData.nominal) || 0;
    if (inputNominal <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nominal Tidak Valid',
        text: 'Nominal transaksi tabungan harus lebih besar dari Rp 0.'
      });
      return;
    }

    const isSetor = formData.jenis === 'SETOR';

    // Cari data siswa resmi dari master students
    const targetStudent = students.find(s => 
      s.id === formData.siswaId || 
      s.nisn === formData.siswaId || 
      s.nopdkt === formData.siswaId || 
      (s.name && s.name.trim().toLowerCase() === formData.namaSiswa.trim().toLowerCase())
    );
    const namaResmi = targetStudent?.name || formData.namaSiswa;
    const kelasResmi = targetStudent?.class || targetStudent?.kelasNama || targetStudent?.studentClass || '';
    const nisnResmi = targetStudent?.nisn || '';

    // Hitung saldo siswa saat ini
    const currentSaldo = tabunganList
      .filter(t => t.siswaId === formData.siswaId || (t.namaSiswa && t.namaSiswa.trim().toLowerCase() === namaResmi.trim().toLowerCase()))
      .reduce((acc, t) => {
        const isTxSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
        return isTxSetor ? acc + Number(t.nominal || 0) : acc - Number(t.nominal || 0);
      }, 0);

    const safeSaldo = Math.max(0, currentSaldo);

    // Cek batas penarikan
    if (!isSetor && inputNominal > safeSaldo) {
      Swal.fire({
        icon: 'error',
        title: 'Saldo Tidak Cukup',
        text: `Saldo siswa saat ini Rp ${safeSaldo.toLocaleString('id-ID')}, tidak mencukupi untuk penarikan sebesar Rp ${inputNominal.toLocaleString('id-ID')}.`
      });
      return;
    }

    const saldoSebelumnya = safeSaldo;
    const saldoSesudahnya = isSetor ? saldoSebelumnya + inputNominal : Math.max(0, saldoSebelumnya - inputNominal);

    const nowStr = new Date().toISOString();
    const rawNopdkt = targetStudent?.nopdkt || 
      targetStudent?.noPdkt || 
      targetStudent?.NoPDKT || 
      targetStudent?.nis || 
      targetStudent?.NIS || 
      targetStudent?.idNumber || 
      (formData.siswaId && !String(formData.siswaId).startsWith('SIS_') ? formData.siswaId : '');
    const cleanNopdkt = rawNopdkt ? String(rawNopdkt).trim().replace(/[^a-zA-Z0-9-]/g, '') : '';

    const maxNo = tabunganList.reduce((max, t) => Math.max(max, Number((t as any).no ?? (t as any).No ?? 0)), 0);
    const newNo = maxNo + 1;

    const tabId = generateStructuredTabunganId(formData.jenis, formData.tanggal, cleanNopdkt, tabunganList);
    const newItem: KeuanganTabungan = {
      id: tabId,
      no: newNo,
      No: newNo,
      tabunganId: tabId,
      siswaId: formData.siswaId,
      nisn: nisnResmi,
      namaSiswa: namaResmi,
      kelasNama: kelasResmi,
      studentClass: kelasResmi,
      tanggal: formData.tanggal,
      tglTransaksi: formData.tanggal,
      jenisTransaksi: formData.jenis,
      jenis: formData.jenis,
      debit: isSetor ? inputNominal : 0,
      kredit: isSetor ? 0 : inputNominal,
      nominal: inputNominal,
      saldoSebelumnya: saldoSebelumnya,
      saldoSesudahnya: saldoSesudahnya,
      saldoAkhir: saldoSesudahnya,
      saldo: saldoSesudahnya,
      petugasId: formData.petugasId || 'Bendahara Tabungan',
      keterangan: formData.keterangan || (isSetor ? 'Setoran tabungan siswa' : 'Penarikan tabungan siswa'),
      catatan: formData.keterangan || (isSetor ? 'Setoran tabungan siswa' : 'Penarikan tabungan siswa'),
      status: 'SUKSES',
      createdBy: formData.petugasId || 'Bendahara Tabungan',
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    const updatedList = [newItem, ...tabunganList];
    saveTabunganToDb(updatedList);
    setIsAddModalOpen(false);

    // SINKRONISASI OTOMATIS KE GOOGLE SPREADSHEET (Sheet TABUNGAN)
    const scriptUrl = getActiveGasUrl();
    const spreadsheetId = settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
    const formattedRow = formatTabunganForSheet(newItem, updatedList.length);

    Swal.fire({
      title: 'Menyimpan ke Google Spreadsheet...',
      html: `Mencatat mutasi <b>${formData.jenis}</b> sebesar <b>Rp ${inputNominal.toLocaleString('id-ID')}</b> untuk <b>${namaResmi}</b>.<br><span class="text-xs text-slate-500">Mengirim data secara otomatis ke sheet TABUNGAN...</span>`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    let syncSuccess = false;
    let syncErrMsg = '';

    try {
      // Sinkronisasi via Backend Proxy /api/keuangan/transaksi (Otomatis & Tanpa Terkendala CORS)
      const res = await fetch('/api/keuangan/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TABUNGAN',
          record: formattedRow,
          fullList: updatedList.map((t, idx) => formatTabunganForSheet(t, idx))
        })
      });
      const data = await res.json();
      if (data?.success) {
        syncSuccess = true;
      } else {
        syncErrMsg = data?.error || 'Gagal menyimpan transaksi ke Google Spreadsheet';
        // Fallback langsung ke GAS jika backend proxy mengembalikan pesan error
        if (isValidGasUrl(scriptUrl)) {
          await fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'TABUNGAN',
            data: updatedList.map((t, idx) => formatTabunganForSheet(t, idx)),
            spreadsheetId
          });
          syncSuccess = true;
        }
      }
    } catch (err: any) {
      console.warn('Sync TABUNGAN via backend error:', err);
      syncErrMsg = err?.message || String(err);
      if (isValidGasUrl(scriptUrl)) {
        try {
          await fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'TABUNGAN',
            data: updatedList.map((t, idx) => formatTabunganForSheet(t, idx)),
            spreadsheetId
          });
          syncSuccess = true;
        } catch (e: any) {
          syncErrMsg = e?.message || String(e);
        }
      }
    }

    if (syncSuccess) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Masuk ke Sheet TABUNGAN!',
        html: `Transaksi tabungan <b>${formData.jenis}</b> Rp ${inputNominal.toLocaleString('id-ID')} atas nama <b>${namaResmi}</b> berhasil dicatat dan <b>otomatis masuk ke Google Spreadsheet</b>.<br><div class="mt-3 p-3 bg-emerald-50 rounded-xl text-left text-xs space-y-1 border border-emerald-200"><div class="flex justify-between"><span>No. Transaksi:</span> <span class="font-mono font-bold text-slate-800">${tabId}</span></div><div class="flex justify-between"><span>Saldo Sebelumnya:</span> <span class="font-semibold text-slate-700">Rp ${saldoSebelumnya.toLocaleString('id-ID')}</span></div><div class="flex justify-between font-bold text-emerald-700"><span>Saldo Baru:</span> <span>Rp ${saldoSesudahnya.toLocaleString('id-ID')}</span></div></div>`,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Selesai'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Tersimpan di Aplikasi!',
        html: `Transaksi tabungan <b>${formData.jenis}</b> Rp ${inputNominal.toLocaleString('id-ID')} berhasil dicatat.<br><span class="text-xs text-amber-600 mt-2 block">Catatan: Data tersimpan secara lokal dan otomatis disinkronkan ke Google Spreadsheet saat koneksi aktif.</span>`,
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleSaveEditTabungan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTabungan) return;
    const nominal = Number(editingTabungan.nominal || 0);
    const isSetor = (editingTabungan.jenis || editingTabungan.jenisTransaksi) === 'SETOR';
    const updatedItem: KeuanganTabungan = {
      ...editingTabungan,
      nominal: nominal,
      debit: isSetor ? nominal : 0,
      kredit: isSetor ? 0 : nominal,
      updatedAt: new Date().toISOString()
    };
    const updatedList = tabunganList.map(t => t.id === editingTabungan.id ? updatedItem : t);
    saveTabunganToDb(updatedList);
    setEditingTabungan(null);

    const scriptUrl = getActiveGasUrl();
    if (isValidGasUrl(scriptUrl)) {
      const spreadsheetId = settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
      fetchFromGAS(scriptUrl, {
        action: 'syncData',
        table: 'TABUNGAN',
        data: updatedList.map((t, idx) => formatTabunganForSheet(t, idx)),
        spreadsheetId
      }).catch(err => console.warn('Sync edit TABUNGAN error:', err));
    }

    Swal.fire({
      icon: 'success',
      title: 'Perubahan Disimpan!',
      text: 'Data transaksi tabungan berhasil diperbarui dan disinkronkan ke Google Spreadsheet.',
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleDeleteTabungan = (id: string, itemData?: KeuanganTabungan) => {
    const targetId = itemData?.tabunganId || itemData?.id || id;
    const label = itemData?.namaSiswa ? `transaksi siswa "${itemData.namaSiswa}"` : `ID "${targetId}"`;

    Swal.fire({
      title: 'Hapus Transaksi Tabungan?',
      html: `Apakah Anda yakin ingin menghapus data ${label}?<br><span class="text-xs text-rose-600 font-semibold">Tindakan ini akan menghapus mutasi tabungan dari sistem dan memperbarui Google Spreadsheet.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = tabunganList.filter(t => t.id !== targetId && t.tabunganId !== targetId);
        saveTabunganToDb(updated);

        const scriptUrl = getActiveGasUrl();
        if (isValidGasUrl(scriptUrl)) {
          const spreadsheetId = settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
          fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'TABUNGAN',
            data: updated.map((t, idx) => formatTabunganForSheet(t, idx)),
            spreadsheetId
          }).catch(err => console.warn('Sync delete TABUNGAN error:', err));
        }

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Transaksi tabungan berhasil dihapus dan diperbarui ke Google Spreadsheet.',
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const handleResetTabungan = () => {
    Swal.fire({
      title: 'Kosongkan Riwayat Tabungan?',
      html: 'Apakah Anda ingin mengosongkan riwayat tabungan di aplikasi ini?<br><span class="text-xs text-slate-500">Saldo akan menjadi Rp 0. Anda dapat menarik ulang data terbaru kapan saja langsung dari Google Spreadsheet dengan tombol <b>Tarik dari Sheets</b>.</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kosongkan',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        saveTabunganToDb([]);
        Swal.fire({
          icon: 'success',
          title: 'Data Tabungan Dikosongkan',
          text: 'Saldo simpanan sekarang Rp 0.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  const handleExportExcel = () => {
    if (filteredAndCalculatedItems.length === 0) {
      alert("Tidak ada transaksi tabungan untuk diekspor.");
      return;
    }
    const rows = filteredAndCalculatedItems.map((t, idx) => ({
      No: idx + 1,
      TabunganID: t.tabunganId || t.id,
      SiswaID: t.siswaId,
      NamaSiswa: t.namaSiswa,
      Kelas: t.studentClass || '-',
      Tanggal: t.tanggal,
      JenisTransaksi: t.jenisTransaksi || t.jenis,
      Debit: t.debit ?? (t.jenis === 'SETOR' ? t.nominal : 0),
      Kredit: t.kredit ?? (t.jenis === 'TARIK' ? t.nominal : 0),
      Saldo: t.saldo || 0,
      PetugasID: t.petugasId || t.createdBy || 'Bendahara Tabungan',
      Keterangan: t.keterangan || t.catatan || '-',
      Status: t.status || 'SUKSES',
      CreatedAt: t.createdAt || '-',
      UpdatedAt: t.updatedAt || '-'
    }));
    exportToExcel(rows, `Buku_Sheet_TABUNGAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header & Actions Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet size={20} className="text-amber-600" />
              Tabungan Siswa
            </h2>
            <span className="text-[11px] bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 font-mono">
              <Wallet size={12} />
              <span>{tabunganList.length.toLocaleString('id-ID')} Data • Saldo: {fmtRp(totalSaldoSemua)}</span>
            </span>
            {isSyncingLatest && (
              <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={11} className="animate-spin" />
                <span>Memuat data terbaru...</span>
              </span>
            )}
            {lastSyncTime && !isSyncingLatest && (
              <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={11} />
                <span>Terbaru: {lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan buku simpanan siswa, setoran tunai (debit), penarikan (kredit), dan saldo tabungan terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePullFromGas}
            disabled={isPullingGas || isSyncingLatest}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isSyncingLatest || isPullingGas
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs active:scale-95'
            }`}
            title="Perbarui mutasi tabungan siswa terkini"
          >
            <RefreshCw size={13} className={isSyncingLatest || isPullingGas ? 'animate-spin text-amber-600' : 'text-slate-500'} />
            <span>{isSyncingLatest || isPullingGas ? 'Memperbarui...' : 'Perbarui Mutasi'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={14} />
            <span>+ Transaksi Tabungan</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Mutasi */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {hasActiveFilter ? 'Mutasi Terfilter' : 'Total Transaksi'}
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(hasActiveFilter ? filteredAndCalculatedItems.length : tabunganList.length).toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500">
              {hasActiveFilter ? `dari ${tabunganList.length} total mutasi` : 'Mutasi Setor & Tarik'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Wallet size={20} />
          </div>
        </div>

        {/* Card 2: Total Setoran (Debit) */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Total Setoran (Debit)
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {fmtRp(selectedSiswaId ? selectedStudentSetor : totalSetorSemua)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <ArrowDownRight size={13} />
              Penerimaan Simpanan
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <ArrowDownRight size={20} />
          </div>
        </div>

        {/* Card 3: Total Penarikan (Kredit) */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              Total Tarik (Kredit)
            </span>
            <div className="text-2xl font-black text-rose-700 font-mono">
              {fmtRp(selectedSiswaId ? selectedStudentTarik : totalTarikSemua)}
            </div>
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <ArrowUpRight size={13} />
              Penarikan & Autodebet
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <ArrowUpRight size={20} />
          </div>
        </div>

        {/* Card 4: Saldo Simpanan Siswa */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                {selectedSiswaId ? 'Saldo Siswa (Setor - Tarik)' : (hasActiveFilter ? 'Saldo Terfilter (Setor - Tarik)' : 'Saldo Bersih (Setor - Tarik)')}
              </span>
              {hasActiveFilter && (
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-800">
                  Filter
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {fmtRp(selectedSiswaId ? selectedStudentBalance : (hasActiveFilter ? filteredTotalSaldo : totalSaldoSemua))}
            </div>
            <p className="text-[11px] text-amber-600 font-medium truncate max-w-[180px]">
              {selectedSiswaId ? (selectedStudentObj?.name || 'Siswa Terpilih') : 'Tersimpan di Kas Sekolah'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Sync / Action Feedback Banner */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border transition ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, ID, catatan..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filterKelas}
            onChange={(e) => {
              setFilterKelas(e.target.value);
              setSelectedSiswaId('');
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">Semua Rombel</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>{formatClassLabel(c)}</option>
            ))}
          </select>

          {/* Smart Filter Tahun Ajaran */}
          <select
            value={filterTahunAjaran}
            onChange={(e) => {
              setFilterTahunAjaran(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="SEMUA">Semua TA</option>
            {availableAcademicYears.map(ta => (
              <option key={ta} value={ta}>TA {ta}</option>
            ))}
          </select>

          {/* Smart Filter Semester */}
          <select
            value={filterSemester}
            onChange={(e) => {
              setFilterSemester(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="SEMUA">Semua Semester</option>
            <option value="1">Sem 1 (Ganjil: Jul-Des)</option>
            <option value="2">Sem 2 (Genap: Jan-Jun)</option>
          </select>

          {/* Filter Jenis Mutasi */}
          <select
            value={filterJenis}
            onChange={(e) => {
              setFilterJenis(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">Semua Mutasi</option>
            <option value="SETOR">SETOR (Debit)</option>
            <option value="TARIK">TARIK (Kredit)</option>
          </select>

          {/* Filter Siswa */}
          <select
            value={selectedSiswaId}
            onChange={(e) => {
              setSelectedSiswaId(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none max-w-[200px]"
          >
            <option value="">Semua Siswa ({distinctSiswaList.length})</option>
            {distinctSiswaList.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({formatClassLabel(s.class)})</option>
            ))}
          </select>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKelas('');
                setFilterTahunAjaran('SEMUA');
                setFilterSemester('SEMUA');
                setFilterJenis('');
                setSelectedSiswaId('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition flex items-center gap-1"
              title="Reset Semua Filter"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-center shrink-0">
          <span className="text-[11px] font-bold text-slate-500">
            {filteredAndCalculatedItems.length} Baris Mutasi
          </span>
        </div>
      </div>

      {/* Table Sesuai Skema Sheet TABUNGAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1150px]">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-36 whitespace-nowrap">ID & Tanggal</th>
                <th className="p-3.5 min-w-[180px]">Nama Siswa (SiswaID)</th>
                <th className="p-3.5 w-24 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Tahun Ajaran / Sem</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Jenis Transaksi</th>
                <th className="p-3.5 w-32 text-right text-emerald-700 whitespace-nowrap">Debit / Setor (Rp)</th>
                <th className="p-3.5 w-32 text-right text-rose-700 whitespace-nowrap">Kredit / Tarik (Rp)</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Saldo Berjalan</th>
                <th className="p-3.5 min-w-[140px]">Petugas / Keterangan</th>
                <th className="p-3.5 w-24 text-center whitespace-nowrap">Status</th>
                <th className="p-3.5 pr-4 w-32 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAndCalculatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 space-y-3">
                    <Wallet size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">Belum Ada Transaksi Tabungan</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Gunakan tombol "+ Transaksi Tabungan" untuk mencatat setoran/penarikan baru, atau gunakan tombol impor file.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>+ Transaksi Tabungan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Impor File Tabungan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        <span>+ Transaksi Baru</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((t, idx) => {
                  const isSetor = t.jenisTransaksi === 'SETOR' || t.jenis === 'SETOR';
                  const tabId = t.tabunganId || t.id;

                  return (
                    <tr key={`${t.id || tabId || 'tab'}_${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono">
                        <div className="font-bold text-slate-900">{t.tanggal}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tabId}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="text-sm font-black text-slate-900">{t.namaSiswa}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">SiswaID: {t.siswaId}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {t.studentClass || '-'}
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11px]">
                        {(() => {
                          const info = getAcademicPeriodInfo(t.tanggal);
                          return (
                            <div>
                              <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] inline-block">
                                TA {info.academicYear}
                              </span>
                              <div className={`text-[10px] font-bold mt-0.5 ${info.semester === 'Ganjil' ? 'text-indigo-600' : 'text-teal-600'}`}>
                                Sem {info.semesterNum} ({info.semester})
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] inline-flex items-center gap-1 ${
                          isSetor ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isSetor ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {isSetor ? 'SETOR (Debit)' : 'TARIK (Kredit)'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                        {isSetor ? fmtRp(t.nominal) : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-700">
                        {!isSetor ? fmtRp(t.nominal) : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm">
                        {fmtRp(t.saldo || 0)}
                      </td>
                      <td className="p-3.5 text-slate-700 text-xs">
                        <div className="font-semibold">{t.petugasId || t.createdBy || 'Bendahara'}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{t.keterangan || t.catatan || '-'}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {t.status || 'SUKSES'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingTabungan({ ...t })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Transaksi Tabungan"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTabungan(t.id || t.tabunganId, t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Transaksi Tabungan"
                          >
                            <Trash2 size={13} />
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

        {/* Pagination Bar */}
        {filteredAndCalculatedItems.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
                <option value={250}>250 baris</option>
                <option value={500}>500 baris</option>
                <option value={100000}>Tampilkan Semua ({filteredAndCalculatedItems.length} data)</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Menampilkan <b>{Math.min((currentPage - 1) * pageSize + 1, filteredAndCalculatedItems.length)}</b> - <b>{Math.min(currentPage * pageSize, filteredAndCalculatedItems.length)}</b> dari <b>{filteredAndCalculatedItems.length}</b> total transaksi
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800">
                Halaman {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Transaksi Tabungan Sesuai Skema Sheet TABUNGAN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Transaksi Tabungan Siswa</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Rekam mutasi simpanan setor debit atau tarik kredit</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitTabungan} className="space-y-3.5">
              {/* Filter Kelas & Status Siswa */}
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1 flex items-center gap-1">
                    <School size={13} className="text-emerald-600" />
                    Filter Kelas
                  </label>
                  <select
                    value={modalFilterKelas}
                    onChange={(e) => {
                      setModalFilterKelas(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Semua Kelas ({allStudents.length})</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1 flex items-center gap-1">
                    <Users size={13} className="text-emerald-600" />
                    Filter Status
                  </label>
                  <select
                    value={modalFilterStatus}
                    onChange={(e) => {
                      setModalFilterStatus(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Semua Status">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              {/* Autocomplete Search Siswa */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Cari & Pilih Siswa ({modalFilteredStudents.length} siswa)</label>
                  <span className="text-[10px] text-slate-400 font-medium">Ketik nama / NIS</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ketik nama siswa..."
                    value={siswaSearchInput}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setSiswaSearchInput(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formData.siswaId && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                      {formData.siswaId}
                    </span>
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {autocompleteStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium">
                        Tidak ada siswa dengan filter Kelas/Status ini
                      </div>
                    ) : (
                      autocompleteStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudentInModal(s)}
                          className="w-full text-left p-2.5 text-xs hover:bg-emerald-50 hover:text-emerald-800 transition flex items-center justify-between"
                        >
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {s.class || 'Semua'} | {s.nis || s.nisn || s.id}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Ringkasan Siswa & Saldo Terkini */}
              {selectedStudentInModal ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{selectedStudentInModal.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-bold">
                        {selectedStudentInModal.class || 'Kelas'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${String(selectedStudentInModal.status).toLowerCase() === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedStudentInModal.status || 'Aktif'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      NIS: {selectedStudentInModal.nis || selectedStudentInModal.nisn || selectedStudentInModal.id}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 block">Saldo Tabungan Saat Ini</span>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      Rp {selectedStudentCurrentSaldo.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-slate-500">
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <span>Silakan ketik atau pilih siswa dari daftar pencarian di atas untuk memulai transaksi.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Transaksi</label>
                  <select
                    value={formData.jenis}
                    onChange={(e) => setFormData(prev => ({ ...prev, jenis: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="SETOR">SETOR (Debit / Tambah)</option>
                    <option value="TARIK">TARIK (Kredit / Kurang)</option>
                  </select>
                </div>
              </div>

              {/* TabunganID Otomatis Preview */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>TabunganID Otomatis:</span>
                </div>
                <div className="font-mono font-black text-xs text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                  {previewTabId}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Transaksi (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step="any"
                  value={formData.nominal}
                  onChange={(e) => setFormData(prev => ({ ...prev, nominal: Number(e.target.value) || 0 }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-700 font-mono"
                />

                {/* Simulasi Saldo Setelah Transaksi */}
                {selectedStudentInModal && (
                  <div className="mt-2 text-xs">
                    {formData.jenis === 'TARIK' ? (
                      <div>
                        {Number(formData.nominal) > selectedStudentCurrentSaldo ? (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5 text-[11px]">
                            <span>⚠️ Saldo tidak cukup! Maksimal penarikan: Rp {selectedStudentCurrentSaldo.toLocaleString('id-ID')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-100/70 p-2 rounded-xl">
                            <span>Sisa Saldo Setelah Tarik:</span>
                            <span className="font-mono font-black text-slate-800">
                              Rp {Math.max(0, selectedStudentCurrentSaldo - Number(formData.nominal)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                        <span>Saldo Baru Setelah Setoran:</span>
                        <span className="font-mono font-black text-emerald-700">
                          Rp {(selectedStudentCurrentSaldo + Number(formData.nominal)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Petugas (PetugasID)</label>
                <input
                  type="text"
                  required
                  value={formData.petugasId}
                  onChange={(e) => setFormData(prev => ({ ...prev, petugasId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan Transaksi</label>
                <input
                  type="text"
                  placeholder="misal: Setoran kas mingguan..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Impor / Tempel Sheet TABUNGAN */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Impor Data Sheet TABUNGAN</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Unggah file Excel/CSV atau tempel teks tabel mutasi tabungan</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Opsi Mode Impor */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">Mode Penyimpanan:</span>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    importMode === 'replace'
                      ? 'bg-rose-50 text-rose-700 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ganti Semua Data (Replace)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    importMode === 'append'
                      ? 'bg-indigo-50 text-indigo-700 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tambahkan ke Data Ada (Append)
                </button>
              </div>
            </div>

            {/* Opsi 1: Upload File Excel */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50/70 transition text-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-tabungan-upload"
              />
              <label
                htmlFor="excel-tabungan-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-2xl bg-white text-indigo-600 shadow-xs flex items-center justify-center">
                  <FileUp size={20} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Klik untuk Memilih File Excel (.xlsx, .xls, .csv)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Sistem otomatis membaca data dari sheet "TABUNGAN"
                </span>
              </label>
            </div>

            {/* Opsi 2: Tempel Teks TSV */}
            <form onSubmit={handleTextImportSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-indigo-600" />
                  <span>Atau Salin-Tempel (Copy-Paste) Tabel:</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Blok tabel di Google Sheets & Ctrl+V di sini</span>
              </div>

              <textarea
                rows={6}
                placeholder={`Contoh format:\nTabunganID\tSiswaID\tNamaSiswa\tKelas\tTanggal\tJenisTransaksi\tDebit\tKredit\tPetugasID\tKeterangan\nTAB_001\t001\tAhmad\tPaket A\t2026-07-10\tSETOR\t50000\t0\tBendahara\tSetoran Awal`}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportRawText('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  <span>Proses & Simpan Tabungan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Transaksi Tabungan */}
      {editingTabungan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit className="text-blue-600" size={18} />
                Edit Transaksi Tabungan Siswa
              </h3>
              <button onClick={() => setEditingTabungan(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEditTabungan} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Siswa:</label>
                <input
                  type="text"
                  disabled
                  value={editingTabungan.namaSiswa || ''}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    value={editingTabungan.tanggal || ''}
                    onChange={(e) => setEditingTabungan({ ...editingTabungan, tanggal: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Transaksi:</label>
                  <select
                    value={editingTabungan.jenis || editingTabungan.jenisTransaksi || 'SETOR'}
                    onChange={(e) => setEditingTabungan({ ...editingTabungan, jenis: e.target.value as any, jenisTransaksi: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="SETOR">SETOR (Simpan Uang)</option>
                    <option value="TARIK">TARIK (Ambil Uang)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal (Rp):</label>
                <input
                  type="number"
                  min={1000}
                  step="any"
                  value={editingTabungan.nominal || 0}
                  onChange={(e) => setEditingTabungan({ ...editingTabungan, nominal: Number(e.target.value) })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 font-mono text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Petugas / Bendahara:</label>
                <input
                  type="text"
                  value={editingTabungan.petugasId || editingTabungan.createdBy || ''}
                  onChange={(e) => setEditingTabungan({ ...editingTabungan, petugasId: e.target.value, createdBy: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan / Keterangan:</label>
                <textarea
                  rows={2}
                  value={editingTabungan.keterangan || editingTabungan.catatan || ''}
                  onChange={(e) => setEditingTabungan({ ...editingTabungan, keterangan: e.target.value, catatan: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingTabungan(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
