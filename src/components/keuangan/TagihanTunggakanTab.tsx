import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Plus, CheckSquare, Square, Filter, X, CreditCard, 
  Wallet, CheckCircle, CheckCircle2, Clock, AlertCircle, Trash2, Edit3, ArrowRight, Printer,
  FileSpreadsheet, User, Calendar, Receipt, Upload, ClipboardCheck,
  ChevronLeft, ChevronRight, GraduationCap, FileUp, RefreshCw, Sparkles, RotateCcw,
  DollarSign, Check, TrendingUp, TrendingDown, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  KeuanganTagihan, KeuanganBiaya, KeuanganKelas, 
  KeuanganInvoice, KeuanganTabungan, MASTER_BIAYA_ROMBEL_37,
  seedDefaultKeuanganTransactions, isKeuanganCleared
} from '../../data/keuanganSeed';
import { REAL_TAGIHAN_FROM_SHEETS } from '../../data/keuanganTransactionsData';
import { 
  normalizeTagihanRow, 
  deduplicateTagihanList,
  formatTagihanForSheet, 
  formatPembayaranForSheet, 
  formatTabunganForSheet,
  cleanKeterangan, 
  generateStructuredTabunganId,
  generateStructuredTagihanId,
  generateStructuredInvoiceId,
  generateStructuredPembayaranId
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
import { autoSyncEngine } from '../../data/autoSyncEngine';
import { DEFAULT_APP_CONFIG } from '../../data/config';

interface TagihanTunggakanTabProps {
  onPrintInvoice?: (invoiceId: string) => void;
  onRefreshAll?: () => void;
}

export default function TagihanTunggakanTab({ onPrintInvoice, onRefreshAll }: TagihanTunggakanTabProps) {
  const { students, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('SEMUA');
  const [filterSemester, setFilterSemester] = useState('SEMUA');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getActiveGasUrl = () => {
    return (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || DEFAULT_APP_CONFIG.gasUrl || DEFAULT_APP_CONFIG.scriptUrl || '').trim();
  };

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  // Live Database state (checking both key formats)
  const [tagihanList, setTagihanList] = useState<KeuanganTagihan[]>(() => {
    if (isKeuanganCleared()) {
      return [];
    }
    const existing = db.get<any>('keuangan_tagihan') || db.get<any>('TAGIHAN') || [];
    if (existing.length > 0) {
      const normalized = existing.map((row: any, idx: number) => normalizeTagihanRow(row, idx, students));
      return deduplicateTagihanList(normalized);
    }
    return [];
  });

  useEffect(() => {
    const refreshFromDb = () => {
      const latest = db.get<any>('keuangan_tagihan') || db.get<any>('TAGIHAN') || [];
      const normalized = latest.map((row: any, idx: number) => normalizeTagihanRow(row, idx, students));
      setTagihanList(deduplicateTagihanList(normalized));
    };

    const handleDbUpdated = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'keuangan_tagihan' || key === 'TAGIHAN' || key === 'keuangan_all' || key === 'all_idb') {
        refreshFromDb();
      }
    };
    const handleClear = () => {
      setTagihanList([]);
      setSelectedTagihanIds([]);
    };
    window.addEventListener('erp-db-updated', handleDbUpdated);
    window.addEventListener('erp-db-synced', refreshFromDb);
    window.addEventListener('erp-keuangan-cleared', handleClear);

    // Hydration check in case IndexedDB loads right after mount
    const timer1 = setTimeout(refreshFromDb, 60);
    const timer2 = setTimeout(refreshFromDb, 300);

    // Auto-fetch from server API if currently empty
    const currentList = db.get<any>('keuangan_tagihan') || db.get<any>('TAGIHAN') || [];
    if (currentList.length === 0) {
      fetch('/api/sheet-data/TAGIHAN')
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            const allStudents = students && students.length > 0 ? students : (db.get<any>('students') || db.get<any>('siswa') || []);
            const normalized = res.data.map((r: any, idx: number) => normalizeTagihanRow(r, idx, allStudents));
            const deduped = deduplicateTagihanList(normalized);
            if (deduped.length > 0) {
              db.set('keuangan_tagihan', deduped, { skipPush: true });
              db.set('TAGIHAN', deduped, { skipPush: true });
              setTagihanList(deduped);
            }
          }
        })
        .catch(() => {});
    }

    // Initial check to clean dirty Keterangan and bloated duplicates if any
    const existingTagihan = db.get<any>('keuangan_tagihan') || db.get<any>('TAGIHAN') || [];
    let hasDirtyKeterangan = false;
    const sanitizedTagihan = existingTagihan.map((row: any) => {
      const rawKet = row.keterangan || row.Keterangan || '';
      const cleaned = cleanKeterangan(rawKet);
      if (rawKet && cleaned !== rawKet) {
        hasDirtyKeterangan = true;
        return { ...row, keterangan: cleaned, Keterangan: cleaned };
      }
      return row;
    });

    const dedupedSanitized = deduplicateTagihanList(sanitizedTagihan);
    if (hasDirtyKeterangan || dedupedSanitized.length < existingTagihan.length) {
      db.set('keuangan_tagihan', dedupedSanitized);
      db.set('TAGIHAN', dedupedSanitized);
      setTagihanList(dedupedSanitized.map((row: any, idx: number) => normalizeTagihanRow(row, idx, students)));
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('erp-db-updated', handleDbUpdated);
      window.removeEventListener('erp-db-synced', refreshFromDb);
      window.removeEventListener('erp-keuangan-cleared', handleClear);
    };
  }, []);

  // Extract available Academic Years from data
  const availableAcademicYears = useMemo(() => {
    const dates = tagihanList.map(t => t.periode || t.tanggalJatuhTempo || t.createdAt);
    const explicitTAs = tagihanList.map(t => t.tahunAjaranId);
    return extractAvailableAcademicYears(dates, explicitTAs);
  }, [tagihanList]);

  const [selectedTagihanIds, setSelectedTagihanIds] = useState<string[]>([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  // Sync & Import State
  const [isPullingGas, setIsPullingGas] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Pay Modal State
  const [activePayItem, setActivePayItem] = useState<{
    tagihanIds: string[];
    isMulti: boolean;
    siswaId: string;
    namaSiswa: string;
    kelasNama: string;
    namaBiaya: string;
    nominalAsli: number;
    sisaTagihan: number;
  } | null>(null);

  const [payFormData, setPayFormData] = useState({
    tglBayar: new Date().toISOString().slice(0, 10),
    metode: 'CASH',
    bank: '-',
    noReferensi: '-',
    petugasId: 'Kasir / Bendahara Sekolah',
    jumlahBayar: 0,
    catatan: '',
  });

  // Generate Multi-Month State (Default ke 2023/2024)
  const [genFormData, setGenFormData] = useState({
    fromPeriode: '2023-07',
    toPeriode: '2024-06',
    tahunAjaranId: '2023/2024',
    semesterId: 'Ganjil',
    tanggalTagihan: new Date().toISOString().slice(0, 10),
    jatuhTempo: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    diskon: 0,
    denda: 0,
    petugasId: 'Admin / Kasir Keuangan',
    biayaId: '',
    kelasId: '',
    siswaId: '',
  });

  // Master Data
  const biayaList = useMemo(() => {
    const raw = db.get<KeuanganBiaya>('keuangan_biaya') || db.get<any>('BIAYA') || [];
    return raw;
  }, [isGenerateModalOpen]);
  const kelasList = useMemo(() => db.get<KeuanganKelas>('keuangan_kelas') || [], []);

  // Memanggil seluruh siswa (Aktif, Lulus, Pindah, Belum, dll) agar data historis 2023/2024 lengkap
  const allStudents = useMemo(() => {
    return students;
  }, [students]);

  // Filtered Siswa in Generate modal (seluruh siswa dalam database)
  const filteredStudentsForGen = useMemo(() => {
    if (!genFormData.kelasId) return allStudents;
    return allStudents.filter(s => matchClass(s.class, genFormData.kelasId));
  }, [allStudents, genFormData.kelasId]);

  // Tabungan Saldo checker for active student in Payment modal
  const activeStudentTabunganSaldo = useMemo(() => {
    if (!activePayItem || !activePayItem.siswaId) return 0;
    const allTabungan = db.get<KeuanganTabungan>('keuangan_tabungan') || db.get<any>('TABUNGAN') || [];

    // Comprehensive student matching
    const st = students.find(s => 
      s.id === activePayItem.siswaId || 
      s.nisn === activePayItem.siswaId || 
      s.nopdkt === activePayItem.siswaId || 
      s.nis === activePayItem.siswaId ||
      (s.name && s.name.trim().toLowerCase() === (activePayItem.namaSiswa || '').trim().toLowerCase())
    );

    const validKeys = new Set([
      String(activePayItem.siswaId).trim().toLowerCase(),
      st?.id ? String(st.id).trim().toLowerCase() : '',
      st?.nopdkt ? String(st.nopdkt).trim().toLowerCase() : '',
      st?.nis ? String(st.nis).trim().toLowerCase() : '',
      st?.nisn ? String(st.nisn).trim().toLowerCase() : '',
      (st as any)?.idNumber ? String((st as any).idNumber).trim().toLowerCase() : ''
    ].filter(Boolean));

    const stNameLower = (activePayItem.namaSiswa || st?.name || '').trim().toLowerCase();

    return allTabungan
      .filter((t: any) => {
        const tSiswaId = String(t.siswaId || t.SiswaID || t.nopdkt || t.NoPdkt || t.nis || t.NIS || '').trim().toLowerCase();
        const tNama = String(t.namaSiswa || t.NamaSiswa || t.nama || '').trim().toLowerCase();
        return (tSiswaId && validKeys.has(tSiswaId)) || (stNameLower && tNama === stNameLower);
      })
      .reduce((acc: number, t: any) => {
        const nom = Number(t.nominal || t.Nominal || t.Jumlah || t.jumlah) || 0;
        const jenis = String(t.jenis || t.jenisTransaksi || t.JenisTransaksi || '').toUpperCase();
        const isTarik = jenis === 'TARIK' || jenis.includes('TARIK') || jenis.includes('KELUAR');
        const isSetor = !isTarik;
        return isSetor ? acc + nom : acc - nom;
      }, 0);
  }, [activePayItem, students]);

  const saveTagihanToDb = (newList: KeuanganTagihan[]) => {
    setTagihanList(newList);
    db.set('keuangan_tagihan', newList);
    db.set('TAGIHAN', newList);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'TAGIHAN' } }));
    if (onRefreshAll) onRefreshAll();
  };

  // File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Find sheet TAGIHAN or use the first sheet
        const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('TAGIHAN')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Filter out empty rows
        const validRows = (rawJson || []).filter((row: any) => {
          return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        });

        if (validRows.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: 'File Kosong',
            text: `File kosong atau sheet "${sheetName}" tidak berisi data baris.`
          });
          return;
        }

        const normalized = validRows.map((row, idx) => normalizeTagihanRow(row, idx, students));

        if (importMode === 'replace') {
          saveTagihanToDb(normalized);
        } else {
          const map = new Map(tagihanList.map(t => [t.id, t]));
          normalized.forEach(t => map.set(t.id, t));
          saveTagihanToDb(Array.from(map.values()));
        }

        setIsImportModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        Swal.fire({
          icon: 'success',
          title: 'Impor Berhasil',
          text: `Berhasil mengimpor ${normalized.length} data tagihan dari file "${file.name}" (Sheet: ${sheetName})!`
        });
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Impor Excel',
          text: 'Gagal memproses file Excel: ' + (err.message || 'Format tidak didukung.')
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Text / TSV / Copy-Paste Import
  const handleTextImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importRawText.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Kosong',
        text: 'Silakan tempel (paste) data tabel spreadsheet terlebih dahulu.'
      });
      return;
    }

    try {
      let rawJson: any[] = [];
      try {
        const workbook = XLSX.read(importRawText, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } catch {
        // Fallback manual lines
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
        Swal.fire({
          icon: 'warning',
          title: 'Format Tidak Dikenali',
          text: 'Format data tidak dikenali. Pastikan menyertakan baris judul kolom dan dipisahkan tab/kolom.'
        });
        return;
      }

      const normalized = rawJson.map((row, idx) => normalizeTagihanRow(row, idx, students));

      if (importMode === 'replace') {
        saveTagihanToDb(normalized);
      } else {
        const map = new Map(tagihanList.map(t => [t.id, t]));
        normalized.forEach(t => map.set(t.id, t));
        saveTagihanToDb(Array.from(map.values()));
      }

      setIsImportModalOpen(false);
      setImportRawText('');
      Swal.fire({
        icon: 'success',
        title: 'Impor Berhasil',
        text: `Berhasil mengimpor ${normalized.length} baris data tagihan secara permanen!`
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses Data',
        text: 'Gagal memproses data: ' + err.message
      });
    }
  };

  // Filtered Tagihan
  const filteredTagihan = useMemo(() => {
    return tagihanList.filter(t => {
      const q = searchTerm.toLowerCase();
      const nama = String(t.namaSiswa || '').toLowerCase();
      const nis = String(t.nis || '').toLowerCase();
      const id = String(t.tagihanId || t.id || '').toLowerCase();
      const inv = String(t.invoiceId || '').toLowerCase();
      const biaya = String(t.namaBiaya || '').toLowerCase();
      const matchesQ = !searchTerm || nama.includes(q) || nis.includes(q) || id.includes(q) || inv.includes(q) || biaya.includes(q);
      const matchesKelas = !filterKelas || matchClass(t.kelasNama || t.kelasId, filterKelas);
      const matchesStatus = !filterStatus || t.status === filterStatus;
      
      // Smart TA & Semester Filter
      const periodDate = t.periode || t.tanggalTagihan || t.tanggalJatuhTempo || t.jatuhTempo || t.createdAt;
      const matchesTA = matchAcademicFilter(
        periodDate,
        filterTahunAjaran,
        filterSemester,
        undefined,
        t.tahunAjaranId,
        t.semesterId
      );

      return matchesQ && matchesKelas && matchesStatus && matchesTA;
    });
  }, [tagihanList, searchTerm, filterKelas, filterStatus, filterTahunAjaran, filterSemester]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTagihan.length / pageSize) || 1;
  const paginatedTagihan = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTagihan.slice(start, start + pageSize);
  }, [filteredTagihan, currentPage, pageSize]);

  // Checkbox handlers
  const handleToggleSelectAll = () => {
    if (selectedTagihanIds.length === filteredTagihan.length && filteredTagihan.length > 0) {
      setSelectedTagihanIds([]);
    } else {
      setSelectedTagihanIds(filteredTagihan.map(t => t.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedTagihanIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Open Single Pay (persis alur KSL: openPayFromTagihan)
  const handleOpenSinglePay = (t: KeuanganTagihan) => {
    const sisa = Number(t.sisaTagihan ?? (Number(t.nominal) || 0));
    const nominalAsli = Number(t.nominalAsli || t.nominal || sisa);
    const namaBiayaClean = t.namaBiaya || 'Tagihan';
    
    setActivePayItem({
      tagihanIds: [t.id],
      isMulti: false,
      siswaId: t.siswaId,
      namaSiswa: t.namaSiswa,
      kelasNama: t.kelasNama,
      namaBiaya: namaBiayaClean,
      nominalAsli: nominalAsli,
      sisaTagihan: sisa,
    });

    setPayFormData({
      tglBayar: new Date().toISOString().slice(0, 10),
      metode: 'CASH',
      bank: '-',
      noReferensi: `REF-${Date.now().toString().slice(-6)}`,
      petugasId: 'Kasir / Bendahara Sekolah',
      jumlahBayar: sisa,
      catatan: `Bayar ${namaBiayaClean}`,
    });
    setIsPayModalOpen(true);
  };

  // Open Multi Pay (persis alur KSL: openMultiBayarModal)
  const handleOpenMultiPay = () => {
    if (selectedTagihanIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Pilih Tagihan',
        text: 'Silakan pilih minimal 1 tagihan untuk dibayar.'
      });
      return;
    }
    const selectedItems = tagihanList.filter(t => selectedTagihanIds.includes(t.id));
    const totalSisa = selectedItems.reduce((acc, t) => acc + (Number(t.sisaTagihan ?? t.nominal) || 0), 0);
    const totalAsli = selectedItems.reduce((acc, t) => acc + (Number(t.nominalAsli || t.nominal) || 0), 0);
    const first = selectedItems[0];
    const namaBiayaCombined = selectedItems.map(t => t.namaBiaya).join(', ');

    setActivePayItem({
      tagihanIds: selectedTagihanIds,
      isMulti: true,
      siswaId: first.siswaId,
      namaSiswa: selectedItems.length === 1 ? first.namaSiswa : `${selectedItems.length} Tagihan Terpilih (${first.namaSiswa})`,
      kelasNama: first.kelasNama,
      namaBiaya: namaBiayaCombined,
      nominalAsli: totalAsli,
      sisaTagihan: totalSisa,
    });

    setPayFormData({
      tglBayar: new Date().toISOString().slice(0, 10),
      metode: 'CASH',
      bank: '-',
      noReferensi: `REF-${Date.now().toString().slice(-6)}`,
      petugasId: 'Kasir / Bendahara Sekolah',
      jumlahBayar: totalSisa,
      catatan: `Bayar ${selectedItems.length} Tagihan Sekaligus`,
    });
    setIsPayModalOpen(true);
  };

  // Helper dinamis catatan pembayaran persis alur updateCatatan KSL
  const handleJumlahBayarChange = (newJumlah: number) => {
    setPayFormData(prev => {
      const sisa = activePayItem ? activePayItem.sisaTagihan : 0;
      let newCatatan = prev.catatan;
      if (activePayItem) {
        const namaBiaya = activePayItem.isMulti 
          ? `${activePayItem.tagihanIds.length} Tagihan` 
          : activePayItem.namaBiaya;
        const prefix = (newJumlah > 0 && newJumlah < sisa) ? 'Cicilan' : 'Bayar';
        newCatatan = `${prefix} ${namaBiaya}`;
      }
      return {
        ...prev,
        jumlahBayar: newJumlah,
        catatan: newCatatan
      };
    });
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayItem) return;

    const inputJumlah = Number(payFormData.jumlahBayar) || 0;
    if (inputJumlah <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nominal Tidak Valid',
        text: 'Jumlah pembayaran harus lebih besar dari Rp 0'
      });
      return;
    }

    // Tabungan balance validation
    if (payFormData.metode === 'TABUNGAN') {
      if (activeStudentTabunganSaldo < inputJumlah) {
        Swal.fire({
          icon: 'warning',
          title: 'Saldo Tabungan Tidak Cukup',
          text: `Saldo tabungan tidak mencukupi. Saldo saat ini: Rp ${activeStudentTabunganSaldo.toLocaleString('id-ID')}`
        });
        return;
      }
    }

    const student = students.find(s => 
      s.id === activePayItem.siswaId || 
      s.nisn === activePayItem.siswaId || 
      s.nopdkt === activePayItem.siswaId || 
      (s.name && s.name.trim().toLowerCase() === (activePayItem.namaSiswa || '').trim().toLowerCase())
    );
    const studentNopdkt = student?.nopdkt || student?.noPdkt || student?.NoPDKT || student?.nis || student?.NIS || student?.idNumber || (activePayItem.siswaId && !String(activePayItem.siswaId).startsWith('SIS_') ? activePayItem.siswaId : '');

    const existingInvoices = db.get<KeuanganInvoice>('keuangan_invoices') || [];
    const invoiceId = generateStructuredInvoiceId(payFormData.tglBayar, studentNopdkt, existingInvoices);
    const pembayaranId = generateStructuredPembayaranId(payFormData.tglBayar, studentNopdkt, existingInvoices);

    // 1. Update Tagihan in DB
    let sisaBudget = inputJumlah;
    const invoiceItems: { namaBiaya: string; periode: string; nominal: number }[] = [];

    const updatedTagihanList = tagihanList.map(t => {
      if (activePayItem.tagihanIds.includes(t.id) && sisaBudget > 0) {
        const curRemaining = Number(t.sisaTagihan ?? (Number(t.nominal) || 0));
        const payForThis = Math.min(sisaBudget, curRemaining);
        sisaBudget -= payForThis;

        const newRemaining = Math.max(0, curRemaining - payForThis);
        const newPaidAmount = Number(t.paidAmount ?? (Number(t.totalBayar) || 0)) + payForThis;
        const newStatus = newRemaining === 0 ? 'LUNAS' : 'SEBAGIAN';

        invoiceItems.push({
          namaBiaya: t.namaBiaya,
          periode: t.periode,
          nominal: payForThis,
        });

        return {
          ...t,
          invoiceId: t.invoiceId || invoiceId,
          nominal: newRemaining,
          sisaTagihan: newRemaining,
          totalBayar: newPaidAmount,
          paidAmount: newPaidAmount,
          status: newStatus as any,
          paidAt: payFormData.tglBayar,
          petugasId: payFormData.petugasId,
          paidBy: payFormData.petugasId,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    saveTagihanToDb(updatedTagihanList);

    // 2. Create Invoice
    const newInvoice: KeuanganInvoice = {
      id: invoiceId,
      pembayaranId,
      tagihanId: activePayItem.tagihanIds[0] || '',
      invoiceId,
      siswaId: activePayItem.siswaId,
      namaSiswa: activePayItem.namaSiswa,
      kelasId: '',
      namaKelas: activePayItem.kelasNama,
      tanggal: payFormData.tglBayar,
      tglBayar: payFormData.tglBayar,
      metodePembayaran: payFormData.metode,
      metode: payFormData.metode,
      noReferensi: payFormData.noReferensi,
      bank: payFormData.bank,
      petugasId: payFormData.petugasId,
      nominal: inputJumlah,
      total: inputJumlah,
      status: 'PAID',
      catatan: payFormData.catatan,
      keterangan: payFormData.catatan,
      tagihanIds: activePayItem.tagihanIds,
      items: invoiceItems.length > 0 ? invoiceItems : [{
        namaBiaya: activePayItem.namaBiaya,
        periode: new Date().toISOString().slice(0, 7),
        nominal: inputJumlah,
      }],
      createdBy: payFormData.petugasId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedInvoices = [newInvoice, ...existingInvoices];
    db.set('keuangan_invoices', updatedInvoices);
    db.set('keuangan_pembayaran', updatedInvoices);
    db.set('PEMBAYARAN', updatedInvoices);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_invoices' } }));
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'PEMBAYARAN' } }));

    // 3. If Tabungan, Deduct from Tabungan (TARIK)
    if (payFormData.metode === 'TABUNGAN') {
      const allTabungan = db.get<KeuanganTabungan>('keuangan_tabungan') || [];
      const tabId = generateStructuredTabunganId('TARIK', payFormData.tglBayar, studentNopdkt, allTabungan);

      const newTabEntry: KeuanganTabungan = {
        id: tabId,
        tabunganId: tabId,
        siswaId: activePayItem.siswaId,
        namaSiswa: activePayItem.namaSiswa,
        tanggal: payFormData.tglBayar,
        jenisTransaksi: 'TARIK',
        jenis: 'TARIK',
        debit: 0,
        kredit: inputJumlah,
        nominal: inputJumlah,
        petugasId: payFormData.petugasId,
        catatan: `Debet otomatis bayar tagihan (${invoiceId})`,
        keterangan: `Debet otomatis bayar tagihan (${invoiceId})`,
        status: 'SUKSES',
        createdBy: payFormData.petugasId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedTabungan = [newTabEntry, ...allTabungan];
      db.set('keuangan_tabungan', updatedTabungan);
      db.set('TABUNGAN', updatedTabungan);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'TABUNGAN' } }));
    }

    // 4. Catat otomatis ke Buku Kas sebagai Kas Masuk (Penerimaan Kas dari Pembayaran Siswa)
    let newKasMasuk: any = null;
    try {
      newKasMasuk = {
        id: `KAS_IN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tanggal: payFormData.tglBayar || new Date().toISOString().slice(0, 10),
        jenis: 'MASUK' as const,
        kategori: 'Pembayaran Siswa',
        nominal: inputJumlah,
        keterangan: `Penerimaan Pembayaran: ${activePayItem.namaBiaya} - ${activePayItem.namaSiswa} (${payFormData.metode})`,
        petugas: payFormData.petugasId || 'Bendahara',
        referensi: invoiceId,
        createdAt: new Date().toISOString()
      };
      const existingKas = db.get<any>('keuangan_kas') || [];
      const updatedKas = [newKasMasuk, ...existingKas];
      db.set('keuangan_kas', updatedKas);
      db.set('KAS', updatedKas.map((k: any, idx: number) => ({
        KasID: k.id || `KAS_${idx + 1}`,
        Tanggal: k.tanggal,
        Kategori: k.kategori,
        Jenis: k.jenis,
        Nominal: k.nominal,
        Debit: k.jenis === 'MASUK' ? k.nominal : 0,
        Kredit: k.jenis === 'KELUAR' ? k.nominal : 0,
        Saldo: 0,
        Keterangan: k.keterangan,
        Petugas: k.petugas,
        Referensi: k.referensi || '-',
        CreatedAt: k.createdAt
      })));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_kas' } }));
    } catch (kasErr) {
      console.warn('Auto record Kas Masuk error:', kasErr);
    }

    // Direct push to Google Spreadsheet via Backend API /api/keuangan/transaksi
    try {
      fetch('/api/keuangan/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PEMBAYARAN',
          record: formatPembayaranForSheet(newInvoice, updatedInvoices.length),
          fullList: updatedInvoices.map(formatPembayaranForSheet),
          updateTagihanList: updatedTagihanList.map(formatTagihanForSheet)
        })
      }).catch(err => console.warn('Sync PEMBAYARAN via backend error:', err));

      if (payFormData.metode === 'TABUNGAN') {
        const allTab = db.get<KeuanganTabungan>('keuangan_tabungan') || [];
        if (allTab.length > 0) {
          fetch('/api/keuangan/transaksi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'TABUNGAN',
              fullList: allTab.map((t, idx) => formatTabunganForSheet(t, idx))
            })
          }).catch(err => console.warn('Sync TABUNGAN via backend error:', err));
        }
      }

      // Also sync Kas Masuk to Sheet KAS via Backend API
      const allKasNow = db.get<any>('keuangan_kas') || [];
      if (allKasNow.length > 0) {
        fetch('/api/keuangan/transaksi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'KAS',
            record: newKasMasuk,
            fullList: allKasNow
          })
        }).catch(err => console.warn('Sync KAS via backend error:', err));
      }
    } catch (pushErr) {
      console.warn('Backend sync pay error:', pushErr);
    }

    // Direct push to Google Apps Script as secondary channel
    const scriptUrl = getActiveGasUrl();
    if (isValidGasUrl(scriptUrl)) {
      const spreadsheetId = settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
      if (updatedTagihanList.length > 0) {
        fetchFromGAS(scriptUrl, {
          action: 'syncData',
          table: 'TAGIHAN',
          data: updatedTagihanList.map(formatTagihanForSheet),
          spreadsheetId
        }).catch(err => console.warn('Sync TAGIHAN pay error:', err));
      }

      if (updatedInvoices.length > 0) {
        fetchFromGAS(scriptUrl, {
          action: 'syncData',
          table: 'PEMBAYARAN',
          data: updatedInvoices.map(formatPembayaranForSheet),
          spreadsheetId
        }).catch(err => console.warn('Sync PEMBAYARAN pay error:', err));
      }
    }

    // Immediate background push via AutoSync Engine
    autoSyncEngine.pushSpecificTables(['TAGIHAN', 'PEMBAYARAN', 'TABUNGAN', 'KAS']).catch(err => {
      console.warn('AutoSync pushSpecificTables error:', err);
    });

    setIsPayModalOpen(false);
    setSelectedTagihanIds([]);

    Swal.fire({
      icon: 'success',
      title: 'Pembayaran Berhasil Diproses!',
      html: `
        <div class="text-left text-sm space-y-2">
          <p>Nomor Kwitansi: <b class="font-mono text-emerald-600">${invoiceId}</b></p>
          <p>Siswa: <b>${activePayItem.namaSiswa}</b></p>
          <p>Total Bayar: <b class="text-emerald-700">Rp ${inputJumlah.toLocaleString('id-ID')}</b> (${payFormData.metode})</p>
          <p class="text-xs text-slate-500 mt-2">Data otomatis tersimpan ke Sheet TAGIHAN, PEMBAYARAN, dan BUKU KAS.</p>
        </div>
      `,
      confirmButtonText: 'Cetak Kwitansi',
      showCancelButton: true,
      cancelButtonText: 'Selesai',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(result => {
      if (result.isConfirmed && onPrintInvoice) {
        onPrintInvoice(invoiceId);
      }
    });
  };

  // Generate Multi-Bulan logic
  const handleGenerateTagihan = (e: React.FormEvent) => {
    e.preventDefault();
    const { fromPeriode, toPeriode, tahunAjaranId, semesterId, tanggalTagihan, jatuhTempo, diskon, denda, petugasId, biayaId, kelasId, siswaId } = genFormData;

    // Build period list (e.g. 2026-07 to 2026-12)
    const periods: string[] = [];
    let current = new Date(`${fromPeriode}-01`);
    const end = new Date(`${toPeriode}-01`);

    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      periods.push(`${y}-${m}`);
      current.setMonth(current.getMonth() + 1);
    }

    if (periods.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Periode Tidak Valid',
        text: 'Rentang periode tidak valid.'
      });
      return;
    }

    // Determine target students (seluruh siswa: aktif, lulus, alumni, pindahan)
    let targetStudents = allStudents;
    if (kelasId) {
      targetStudents = targetStudents.filter(s => matchClass(s.class, kelasId));
    }
    if (siswaId) {
      targetStudents = targetStudents.filter(s => s.id === siswaId);
    }

    if (targetStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Siswa Tidak Ditemukan',
        text: 'Tidak ada siswa yang cocok dengan filter kelas/siswa terpilih.'
      });
      return;
    }

    // Determine target biaya
    let targetBiaya = biayaList;
    if (biayaId) {
      targetBiaya = targetBiaya.filter(b => b.id === biayaId || b.biayaId === biayaId);
    }

    if (targetBiaya.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Biaya Belum Dipilih',
        text: 'Tidak ada pos biaya yang dipilih.'
      });
      return;
    }

    const newTagihanRows: KeuanganTagihan[] = [];
    const nowStr = new Date().toISOString();

    periods.forEach(p => {
      targetStudents.forEach(st => {
        targetBiaya.forEach(b => {
          // If the fee is specific to a single student, check student ID
          if (b.siswaId && b.siswaId !== st.id) {
            return;
          }

          // Check duplicates
          const isExists = tagihanList.some(
            t => t.siswaId === st.id && (t.biayaId === b.id || t.biayaId === b.biayaId) && t.periode === p
          );
          if (!isExists) {
            const rawNominal = Number(b.nominal) || 0;
            const netDiskon = Number(diskon) || 0;
            const netDenda = Number(denda) || 0;
            const totalTagihan = Math.max(0, rawNominal - netDiskon + netDenda);
            const stNopdkt = st.nopdkt || st.noPdkt || st.NoPDKT || st.nis || st.NIS || st.idNumber || (st.id && !String(st.id).startsWith('SIS_') ? st.id : '');
            const tagihanId = generateStructuredTagihanId(tanggalTagihan || nowStr.slice(0, 10), stNopdkt, [...tagihanList, ...newTagihanRows]);

            newTagihanRows.push({
              id: tagihanId,
              tagihanId,
              invoiceId: '-',
              siswaId: st.id,
              namaSiswa: st.name,
              nis: st.nis || st.nisn || '-',
              kelasId: st.class || 'Kelas 4',
              kelasNama: st.class || 'Kelas 4',
              biayaId: b.biayaId || b.id,
              namaBiaya: b.namaBiaya || b.nama,
              tahunAjaranId: tahunAjaranId || '2026/2027',
              semesterId: semesterId || 'Ganjil',
              tanggalTagihan: tanggalTagihan || nowStr.slice(0, 10),
              tanggalJatuhTempo: jatuhTempo || `${p}-10`,
              jatuhTempo: jatuhTempo || `${p}-10`,
              nominal: totalTagihan,
              nominalAsli: rawNominal,
              diskon: netDiskon,
              denda: netDenda,
              totalTagihan,
              totalBayar: 0,
              paidAmount: 0,
              sisaTagihan: totalTagihan,
              periode: p,
              status: 'BELUM',
              petugasId: petugasId || 'Admin / Kasir Keuangan',
              createdAt: nowStr,
              updatedAt: nowStr,
            });
          }
        });
      });
    });

    if (newTagihanRows.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tagihan Sudah Ada',
        text: 'Semua tagihan untuk kombinasi siswa, biaya, dan periode ini sudah pernah dibuat sebelumnya.'
      });
      return;
    }

    const allTagihanNew = [...tagihanList, ...newTagihanRows];
    saveTagihanToDb(allTagihanNew);

    setIsGenerateModalOpen(false);

    // Push new tagihan to Google Spreadsheet via backend API
    try {
      fetch('/api/keuangan/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TAGIHAN',
          records: newTagihanRows.map(formatTagihanForSheet),
          fullList: allTagihanNew.map(formatTagihanForSheet)
        })
      }).catch(err => console.warn('Sync TAGIHAN via backend error:', err));
    } catch (e) {}

    // Push new tagihan to Google Apps Script Sheet
    const scriptUrl = getActiveGasUrl();
    if (isValidGasUrl(scriptUrl)) {
      fetchFromGAS(scriptUrl, {
        action: 'syncData',
        table: 'TAGIHAN',
        data: allTagihanNew.map(formatTagihanForSheet),
        spreadsheetId: settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId
      }).catch(err => console.warn('Sync TAGIHAN generate error:', err));
    }
    autoSyncEngine.pushSpecificTables(['TAGIHAN']).catch(err => {
      console.warn('AutoSync push TAGIHAN error:', err);
    });

    Swal.fire({
      icon: 'success',
      title: 'Tagihan Berhasil Dibuat!',
      text: `Berhasil membuat ${newTagihanRows.length} data tagihan baru.`,
      timer: 2500,
      showConfirmButton: false,
    });
  };

  // Pull directly from Google Sheets (Sheet: TAGIHAN)
  const handlePullFromGas = async (silent = false) => {
    const gasUrl = getActiveGasUrl();
    if (!isValidGasUrl(gasUrl)) {
      if (!silent) {
        Swal.fire({
          icon: 'warning',
          title: 'URL Google Apps Script Belum Diatur',
          html: `
            <p class="text-sm text-slate-600 mb-2">URL Web App Google Apps Script belum dikonfigurasi.</p>
            <p class="text-xs text-slate-500">Silakan buka menu <b>Pengaturan Akun / Database</b> dan masukkan Web App URL Google Apps Script Anda.</p>
          `,
          confirmButtonText: 'Mengerti',
          confirmButtonColor: '#059669',
        });
      }
      return;
    }

    setIsPullingGas(true);
    setSyncFeedback(null);
    try {
      let remoteTagihan: any[] = [];
      const fastRes = await pullSpecificSheetFromGas('TAGIHAN', gasUrl);
      if (fastRes.success && Array.isArray(fastRes.data) && fastRes.data.length > 0) {
        remoteTagihan = fastRes.data;
      } else {
        const res = await pullAllSheetsFromGas(gasUrl);
        if (res.success && res.data) {
          remoteTagihan = res.data.TAGIHAN || res.data.tagihan || [];
        }
      }

      if (Array.isArray(remoteTagihan) && remoteTagihan.length > 0) {
        const converted = remoteTagihan.map((row: any, idx: number) => normalizeTagihanRow(row, idx, students));
        saveTagihanToDb(converted);
        if (!silent) {
          Swal.fire({
            icon: 'success',
            title: 'Terkoneksi ke Sheet TAGIHAN!',
            text: `Berhasil memuat ${converted.length} baris data tagihan langsung dari Google Spreadsheet.`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
        setSyncFeedback({
          type: 'success',
          message: `✓ Terkoneksi ke Sheet TAGIHAN: Berhasil memuat ${converted.length} tagihan langsung dari Google Spreadsheet!`
        });
      } else {
        if (!silent) {
          Swal.fire({
            icon: 'info',
            title: 'Sheet Kosong',
            text: 'Sheet TAGIHAN pada Google Spreadsheet belum memiliki data baris tagihan.',
            confirmButtonColor: '#059669',
          });
        }
      }
    } catch (err: any) {
      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: 'Kendala Jaringan',
          text: 'Terjadi kendala saat menarik data dari Google Sheets: ' + (err.message || String(err)),
          confirmButtonColor: '#059669',
        });
      }
    } finally {
      setIsPullingGas(false);
    }
  };

  const handleDeleteTagihan = (id: string, itemData?: KeuanganTagihan) => {
    const rawTarget = itemData?.tagihanId || itemData?.id || id || '';
    const targetId = String(rawTarget).trim().toUpperCase();
    const labelSiswa = itemData?.namaSiswa ? `untuk siswa "${itemData.namaSiswa}" (${itemData.namaBiaya || 'Biaya'})` : `ID "${rawTarget}"`;

    Swal.fire({
      title: 'Hapus Tagihan?',
      html: `Apakah Anda yakin ingin menghapus data tagihan <b>${labelSiswa}</b>?<br><span class="text-xs text-rose-600 font-semibold">Tindakan ini akan menghapus tagihan dari daftar dan Google Sheet.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Tagihan',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = tagihanList.filter(t => {
          const tid = String(t.tagihanId || t.id || '').trim().toUpperCase();
          return tid !== targetId;
        });
        saveTagihanToDb(updated);
        setSelectedTagihanIds(prev => prev.filter(x => String(x).trim().toUpperCase() !== targetId));

        // Push delete to Google Apps Script Sheet
        const scriptUrl = getActiveGasUrl();
        if (isValidGasUrl(scriptUrl)) {
          fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'TAGIHAN',
            data: updated.map(formatTagihanForSheet),
            spreadsheetId: settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId
          }).catch(err => console.warn('Sync TAGIHAN delete error:', err));
        }

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Data tagihan berhasil dihapus.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleDeleteBatchTagihan = () => {
    if (selectedTagihanIds.length === 0) return;
    const count = selectedTagihanIds.length;
    const targetSet = new Set(selectedTagihanIds.map(x => String(x).trim().toUpperCase()));

    Swal.fire({
      title: `Hapus ${count} Tagihan Terpilih?`,
      html: `Apakah Anda yakin ingin menghapus <b>${count} tagihan terpilih</b>?<br><span class="text-xs text-rose-600 font-semibold">Tagihan yang dihapus akan dibersihkan dari sistem dan Google Sheet.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, Hapus ${count} Tagihan`,
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = tagihanList.filter(t => {
          const tid = String(t.tagihanId || t.id || '').trim().toUpperCase();
          return !targetSet.has(tid);
        });
        saveTagihanToDb(updated);
        setSelectedTagihanIds([]);

        const scriptUrl = getActiveGasUrl();
        if (isValidGasUrl(scriptUrl)) {
          fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'TAGIHAN',
            data: updated.map(formatTagihanForSheet),
            spreadsheetId: settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId
          }).catch(err => console.warn('Sync TAGIHAN batch delete error:', err));
        }

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: `${count} tagihan terpilih berhasil dihapus.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  // Bersihkan tagihan lokal tambahan & tarik murni dari Google Sheets TAGIHAN
  const handleResetToRealSheetData = () => {
    Swal.fire({
      title: 'Tarik Ulang dari Google Spreadsheet?',
      html: `Sistem akan menyinkronkan data tagihan langsung dari <b>Sheet TAGIHAN</b> pada spreadsheet resmi.<br><span class="text-xs text-slate-500">Data tagihan lokal akan diperbarui sesuai sheet terkini.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Tarik dari Spreadsheet',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        handlePullFromGas(true);
      }
    });
  };

  const handleExportExcel = () => {
    if (filteredTagihan.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Kosong',
        text: 'Tidak ada data tagihan untuk diekspor.'
      });
      return;
    }
    const rows = filteredTagihan.map((t, idx) => ({
      No: idx + 1,
      TagihanID: t.tagihanId || t.id,
      nopdkt: t.nopdkt || t.siswaId || '-',
      NamaSiswa: t.namaSiswa,
      Kelas: t.kelasNama || t.kelasId || '-',
      KodeBiaya: t.kodeBiaya || t.biayaId || '-',
      NamaBiaya: t.namaBiaya,
      TahunAjaran: t.tahunAjaranId || '2023/2024',
      Semester: t.semesterId || 'Ganjil',
      TanggalTagihan: t.tanggalTagihan || t.createdAt?.slice(0, 10) || '-',
      JatuhTempo: t.jatuhTempo || t.tanggalJatuhTempo || '-',
      Nominal: t.nominalAsli || t.nominal,
      Diskon: t.diskon || 0,
      TotalTagihan: t.totalTagihan || t.nominalAsli || t.nominal,
      TanggalBayar: t.tanggalBayar || t.paidAt || (t.status === 'LUNAS' ? (t.tanggalTagihan || '-') : '-'),
      TotalBayar: t.totalBayar || t.paidAmount || 0,
      SisaTagihan: t.sisaTagihan ?? Math.max(0, (t.totalTagihan || t.nominal) - (t.paidAmount || 0)),
      Status: t.status,
      Keterangan: t.keterangan || '-'
    }));
    exportToExcel(rows, `Data_Tagihan_Sheet_TAGIHAN_${new Date().toISOString().slice(0, 10)}.xlsx`, 'TAGIHAN');
  };

  const hasActiveFilter = Boolean(
    searchTerm || 
    filterKelas || 
    (filterTahunAjaran && filterTahunAjaran !== 'SEMUA') || 
    (filterSemester && filterSemester !== 'SEMUA') || 
    filterStatus
  );

  const totalTagihanCount = tagihanList.length;
  const totalTerbayarNominal = tagihanList.reduce((acc, t) => acc + (Number(t.totalBayar || t.paidAmount) || 0), 0);
  const totalSisaTunggakan = tagihanList.reduce((acc, t) => acc + (Number(t.sisaTagihan ?? (t.totalTagihan || t.nominal)) || 0), 0);
  const totalBrutoNominal = tagihanList.reduce((acc, t) => acc + (Number(t.totalTagihan || t.nominalAsli || t.nominal) || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard size={20} className="text-emerald-600" />
              Tagihan &amp; Bayar Siswa
            </h2>
            <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 font-mono">
              <CreditCard size={12} />
              <span>Data Tagihan ({tagihanList.length.toLocaleString('id-ID')} data • {fmtRp(totalBrutoNominal)})</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penerbitan tagihan siswa, monitoring status pelunasan, cicilan, dan pembayaran kasir terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/sheet-data/TAGIHAN');
                const json = await res.json();
                if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
                  const allStudents = students && students.length > 0 ? students : (db.get<any>('students') || db.get<any>('siswa') || []);
                  const normalized = json.data.map((r: any, idx: number) => normalizeTagihanRow(r, idx, allStudents));
                  const deduped = deduplicateTagihanList(normalized);
                  db.set('keuangan_tagihan', deduped, { skipPush: true });
                  db.set('TAGIHAN', deduped, { skipPush: true });
                  setTagihanList(deduped);
                  Swal.fire({ icon: 'success', title: 'Sinkronisasi Berhasil', text: `Berhasil memuat ${deduped.length} data tagihan dari Google Spreadsheet.` });
                } else {
                  Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data di Sheet TAGIHAN.' });
                }
              } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Gagal Menarik Data', text: err?.message || 'Koneksi bermasalah' });
              }
            }}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Tarik data tagihan dari Google Spreadsheet"
          >
            <RefreshCw size={14} />
            <span>Tarik dari Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Impor tagihan dari Excel / TSV"
          >
            <FileSpreadsheet size={14} />
            <span>Impor Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ekspor data tagihan ke file Excel"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>

          {selectedTagihanIds.length > 0 && (
            <>
              <button
                onClick={handleOpenMultiPay}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <CreditCard size={15} />
                <span>Bayar {selectedTagihanIds.length} Terpilih</span>
              </button>
              <button
                onClick={handleDeleteBatchTagihan}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Hapus semua tagihan yang dicentang"
              >
                <Trash2 size={15} />
                <span>Hapus {selectedTagihanIds.length} Terpilih</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Generate Tagihan Multi-Bulan</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tagihan */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {hasActiveFilter ? 'Tagihan Terfilter' : 'Total Tagihan'}
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(hasActiveFilter ? filteredTagihan.length : totalTagihanCount).toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500">
              {hasActiveFilter ? `dari ${totalTagihanCount} total tagihan` : 'Berkas Tagihan Terdaftar'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard size={20} />
          </div>
        </div>

        {/* Card 2: Terbayar Masuk */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Terbayar Masuk
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredTagihan.reduce((acc, t) => acc + (Number(t.totalBayar || t.paidAmount) || 0), 0) : totalTerbayarNominal)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check size={13} />
              Lunas &amp; Cicilan Diterima
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Sisa Tunggakan */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              Sisa Tunggakan
            </span>
            <div className="text-2xl font-black text-rose-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredTagihan.reduce((acc, t) => acc + (Number(t.sisaTagihan ?? (t.totalTagihan || t.nominal)) || 0), 0) : totalSisaTunggakan)}
            </div>
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <Clock size={13} />
              Belum Terbayar Siswa
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>

        {/* Card 4: Akumulasi Tagihan */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Akumulasi Tagihan
            </span>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredTagihan.reduce((acc, t) => acc + (Number(t.totalTagihan || t.nominalAsli || t.nominal) || 0), 0) : totalBrutoNominal)}
            </div>
            <p className="text-[11px] text-amber-600 font-medium truncate max-w-[180px]">
              Nilai Bruto Tagihan
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign size={20} />
          </div>
        </div>
      </div>


      {/* Sync / Action Feedback Banner */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{syncFeedback.message}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-700">
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
              placeholder="Cari siswa, NIS, TagihanID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            <option value="1">Sem 1 (Ganjil)</option>
            <option value="2">Sem 2 (Genap)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="BELUM">Belum Lunas</option>
            <option value="SEBAGIAN">Sebagian (Cicilan)</option>
            <option value="LUNAS">Lunas</option>
          </select>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKelas('');
                setFilterTahunAjaran('SEMUA');
                setFilterSemester('SEMUA');
                setFilterStatus('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
              title="Reset Semua Filter"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-center shrink-0">
          <span className="text-[11px] font-bold text-slate-500">
            {filteredTagihan.length} Baris Tagihan
          </span>
        </div>
      </div>

      {/* Table Sesuai Skema Sheet TAGIHAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1200px]">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-12 text-center">
                  <button onClick={handleToggleSelectAll} className="text-slate-500 hover:text-emerald-600">
                    {selectedTagihanIds.length > 0 && selectedTagihanIds.length === filteredTagihan.length ? (
                      <CheckSquare size={16} className="text-emerald-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="p-3.5 min-w-[200px]">Nama Siswa</th>
                <th className="p-3.5 w-24 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 min-w-[180px]">Pos Biaya (BiayaID)</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">TA / Semester</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Total Tagihan</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Total Bayar</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Sisa Tagihan</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Status</th>
                <th className="p-3.5 pr-4 w-32 text-center whitespace-nowrap">Aksi Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredTagihan.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400 space-y-3">
                    <CreditCard size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">Belum Ada Data Tagihan Aktif</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Gunakan tombol impor file atau klik "+ Buat Tagihan Baru" untuk membuat tagihan biaya belajar siswa.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Impor File Tagihan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>+ Buat Tagihan Baru</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTagihan.map((t, idx) => {
                  const isSelected = selectedTagihanIds.includes(t.id);
                  const isLunas = t.status === 'LUNAS';
                  const isSebagian = t.status === 'SEBAGIAN';
                  const totTagihan = t.totalTagihan || t.nominalAsli || t.nominal || 0;
                  let totBayar = t.totalBayar ?? t.paidAmount ?? 0;
                  if (isLunas && totBayar === 0 && totTagihan > 0) {
                    totBayar = totTagihan;
                  }
                  const sisa = isLunas ? 0 : (t.sisaTagihan ?? Math.max(0, totTagihan - totBayar));

                  return (
                    <tr key={`${t.id || t.tagihanId || 'tag'}_${idx}`} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                      <td className="p-3.5 pl-4 text-center">
                        <button onClick={() => handleToggleSelectRow(t.id)} className="text-slate-400 hover:text-emerald-600">
                          {isSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                        </button>
                      </td>
                  
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm">{t.namaSiswa}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {t.nopdkt ? <span> <strong className="text-slate-600">{t.nopdkt}</strong> | </span> : ''}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{t.kelasNama || '-'}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{t.namaBiaya}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                        </div>
                        
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11px] whitespace-nowrap">
                        {(() => {
                          const info = getAcademicPeriodInfo(t.periode || t.tanggalTagihan || t.tanggalJatuhTempo || t.jatuhTempo || t.createdAt);
                          const displayTA = t.tahunAjaranId || info.academicYear;
                          const displaySem = t.semesterId || (info.semester === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)');
                          return (
                            <div>
                              <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] inline-block">
                                {displayTA}
                              </span>
                              <div className={`text-[10px] font-bold mt-0.5 ${String(displaySem).toLowerCase().includes('1') || String(displaySem).toLowerCase().includes('ganjil') ? 'text-indigo-600' : 'text-teal-600'}`}>
                                {displaySem.startsWith('Sem') ? displaySem : `Sem ${displaySem}`}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                        {fmtRp(totTagihan)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {fmtRp(totBayar)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                        {fmtRp(sisa)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          isLunas 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isSebagian 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isLunas ? 'LUNAS' : isSebagian ? 'SEBAGIAN' : 'BELUM'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isLunas && (
                            <button
                              onClick={() => handleOpenSinglePay(t)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[11px] transition flex items-center gap-1 active:scale-95 shadow-xs whitespace-nowrap"
                            >
                              <span>Bayar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTagihan(t.id || t.tagihanId, t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Tagihan"
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
        {filteredTagihan.length > 0 && (
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
                <option value={100000}>Tampilkan Semua ({filteredTagihan.length} data)</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Menampilkan <b>{Math.min((currentPage - 1) * pageSize + 1, filteredTagihan.length)}</b> - <b>{Math.min(currentPage * pageSize, filteredTagihan.length)}</b> dari <b>{filteredTagihan.length}</b> total tagihan
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

      {/* Modal Generate Tagihan Multi-Bulan (Sesuai Alur KSL modalTagihanGenerate_) */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard size={19} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Generate Tagihan Multi-Bulan</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Buat tagihan serentak per rombel / siswa dengan proteksi anti-duplikasi</p>
                </div>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateTagihan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Tahun Ajaran</label>
                <select
                  value={genFormData.tahunAjaranId}
                  onChange={(e) => {
                    const ta = e.target.value;
                    const startYear = parseInt(ta.split('/')[0], 10) || 2023;
                    setGenFormData(prev => ({
                      ...prev,
                      tahunAjaranId: ta,
                      fromPeriode: `${startYear}-07`,
                      toPeriode: `${startYear + 1}-06`,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 transition"
                >
                  <option value="2023/2024">TA 2023/2024 (Awal 2023/2024)</option>
                  <option value="2024/2025">TA 2024/2025</option>
                  <option value="2025/2026">TA 2025/2026</option>
                  <option value="2026/2027">TA 2026/2027</option>
                  <option value="2027/2028">TA 2027/2028</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dari Periode</label>
                  <input
                    type="month"
                    required
                    value={genFormData.fromPeriode}
                    onChange={(e) => setGenFormData(prev => ({ ...prev, fromPeriode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sampai Periode</label>
                  <input
                    type="month"
                    required
                    value={genFormData.toPeriode}
                    onChange={(e) => setGenFormData(prev => ({ ...prev, toPeriode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  required
                  value={genFormData.jatuhTempo}
                  onChange={(e) => setGenFormData(prev => ({ ...prev, jatuhTempo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Jenis Tagihan (Pos Biaya)</label>
                <select
                  value={genFormData.biayaId}
                  onChange={(e) => setGenFormData(prev => ({ ...prev, biayaId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 transition"
                >
                  <option value="">Semua Pos Biaya Aktif</option>
                  {biayaList.filter(b => b.status === 'AKTIF' || b.aktif !== false).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.namaBiaya || b.nama} — {fmtRp(b.nominal)} ({b.targetKelas || b.kelasNama || 'Semua Kelas'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas / Rombel</label>
                  <select
                    value={genFormData.kelasId}
                    onChange={(e) => setGenFormData(prev => ({ ...prev, kelasId: e.target.value, siswaId: '' }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 transition"
                  >
                    <option value="">Semua Kelas ({filteredStudentsForGen.length} Siswa)</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{formatClassLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Siswa Spesifik (Opsional)</label>
                  <select
                    value={genFormData.siswaId}
                    onChange={(e) => setGenFormData(prev => ({ ...prev, siswaId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 transition"
                  >
                    <option value="">Semua Siswa di Kelas ({filteredStudentsForGen.length} Siswa)</option>
                    {filteredStudentsForGen.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class}) {s.status && s.status !== 'Aktif' && s.status !== 'aktif' ? `• [${s.status}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Anti Duplikasi Notice */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  <strong>Proteksi Anti-Duplikasi Aktif:</strong> Siswa yang sudah memiliki tagihan pada pos biaya dan periode yang sama akan otomatis dilewati agar tidak terjadi tagihan ganda.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <CreditCard size={15} />
                  <span>Proses & Buat Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pembayaran Kasir (Sesuai Alur KSL openPayFromTagihan & openMultiBayarModal) */}
      {isPayModalOpen && activePayItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard size={19} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Form Pembayaran Tagihan</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Rekam penerimaan kas, alokasi sisa cicilan, & cetak kuitansi sah</p>
                </div>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            {/* Rincian Tagihan Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Siswa:</span>
                <span className="font-black text-slate-900">{activePayItem.namaSiswa}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Kelas / Rombel:</span>
                <span className="font-bold text-slate-700">{activePayItem.kelasNama || '-'}</span>
              </div>
              <div className="flex justify-between items-start text-xs">
                <span className="text-slate-500 font-medium shrink-0">Item Pos Tagihan:</span>
                <span className="font-semibold text-slate-800 text-right line-clamp-2 max-w-[70%]">{activePayItem.namaBiaya}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Tagihan Asli:</span>
                  <span className="font-mono font-bold text-slate-700">{fmtRp(activePayItem.nominalAsli)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Sisa Tagihan Saat Ini:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{fmtRp(activePayItem.sisaTagihan)}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Bayar</label>
                <input
                  type="date"
                  required
                  value={payFormData.tglBayar}
                  onChange={(e) => setPayFormData(prev => ({ ...prev, tglBayar: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={payFormData.metode}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, metode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 transition"
                  >
                    <option value="CASH">CASH (Tunai / Kasir)</option>
                    <option value="TRANSFER">TRANSFER (Bank)</option>
                    <option value="TABUNGAN">TABUNGAN (Potong Saldo)</option>
                    <option value="QRIS">QRIS / E-Wallet</option>
                    <option value="CICILAN">CICILAN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank / Keterangan Channel</label>
                  <input
                    type="text"
                    placeholder="BCA, BRI, Mandiri, Kasir"
                    value={payFormData.bank}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, bank: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Status Tabungan Siswa jika metode TABUNGAN */}
              {payFormData.metode === 'TABUNGAN' && (
                <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-900 font-bold">Saldo Tabungan Siswa:</span>
                    <span className="font-mono font-black text-amber-950 text-sm">{fmtRp(activeStudentTabunganSaldo)}</span>
                  </div>
                  {activeStudentTabunganSaldo < (Number(payFormData.jumlahBayar) || 0) ? (
                    <p className="text-[11px] text-rose-600 font-bold">
                      ⚠️ Saldo tabungan ({fmtRp(activeStudentTabunganSaldo)}) tidak mencukupi untuk membayar {fmtRp(Number(payFormData.jumlahBayar) || 0)}.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✓ Saldo tabungan mencukupi untuk transaksi ini (akan otomatis dipotong).
                    </p>
                  )}
                </div>
              )}

              {/* Jumlah Bayar & Realtime Sisa */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Jumlah Yang Dibayarkan (Rp)</label>
                  <button
                    type="button"
                    onClick={() => handleJumlahBayarChange(activePayItem.sisaTagihan)}
                    className="text-[11px] text-emerald-600 font-black hover:underline hover:text-emerald-700"
                  >
                    Bayar Lunas (100%)
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  max={activePayItem.sisaTagihan}
                  value={payFormData.jumlahBayar || ''}
                  onChange={(e) => handleJumlahBayarChange(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-emerald-700 font-mono focus:bg-white focus:border-emerald-500 transition"
                />

                {/* Indikator Real-Time Sisa Setelah Bayar */}
                {(() => {
                  const bayar = Number(payFormData.jumlahBayar) || 0;
                  const sisaSetelah = Math.max(0, activePayItem.sisaTagihan - bayar);
                  const isLunas = sisaSetelah === 0;
                  return (
                    <div className="flex items-center justify-between mt-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs">
                      <span className="text-slate-600 font-medium">Sisa Setelah Bayar:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-800">{fmtRp(sisaSetelah)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {isLunas ? 'LUNAS' : 'SEBAGIAN / CICILAN'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. Referensi / No. Transaksi</label>
                <input
                  type="text"
                  placeholder="REF-..."
                  value={payFormData.noReferensi}
                  onChange={(e) => setPayFormData(prev => ({ ...prev, noReferensi: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Transaksi</label>
                <input
                  type="text"
                  placeholder="Bayar / Cicilan tagihan..."
                  value={payFormData.catatan}
                  onChange={(e) => setPayFormData(prev => ({ ...prev, catatan: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <CreditCard size={15} />
                  <span>Simpan Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor / Tempel Excel / Google Sheet TAGIHAN */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Impor Data Sheet TAGIHAN</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Unggah file Excel/CSV atau tempel teks tabel dari Google Spreadsheet</p>
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
                      ? 'bg-emerald-50 text-emerald-700 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tambahkan ke Data Ada (Append)
                </button>
              </div>
            </div>

            {/* Opsi 1: Upload File Excel */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/70 transition text-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-tagihan-upload"
              />
              <label
                htmlFor="excel-tagihan-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-2xl bg-white text-emerald-600 shadow-xs flex items-center justify-center">
                  <FileUp size={20} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Klik untuk Memilih File Excel (.xlsx, .xls, .csv)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Sistem otomatis mendeteksi sheet "TAGIHAN"
                </span>
              </label>
            </div>

            {/* Opsi 2: Tempel Teks TSV */}
            <form onSubmit={handleTextImportSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-emerald-600" />
                  <span>Atau Salin-Tempel (Copy-Paste) Tabel:</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Blok tabel di Google Sheets & Ctrl+V di sini</span>
              </div>

              <textarea
                rows={6}
                placeholder={`Format kolom header Sheet TAGIHAN resmi:\nNo\tTagihanID\tnopdkt\tNamaSiswa\tKelas\tKodeBiaya\tNamaBiaya\tTahunAjaran\tSemester\tTanggalTagihan\tJatuhTempo\tNominal\tDiskon\tTotalTagihan\tTanggalBayar\tTotalBayar\tSisaTagihan\tStatus\tKeterangan\n1\tTGH_001\t23001\tAhmad Fauzi\t4\tA4_Modul24\tBuku Modul A4\t2023/2024\tGanjil\t2023-07-15\t2023-08-10\t180000\t0\t180000\t2023-07-20\t180000\t0\tLUNAS\t-`}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  <span>Proses & Simpan Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
