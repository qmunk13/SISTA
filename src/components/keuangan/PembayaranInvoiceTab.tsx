import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Receipt, Search, Eye, Printer, Trash2, X, ArrowUpRight, 
  Calendar, CheckCircle, Clock, FileSpreadsheet, User, Building2, Hash, Upload, ClipboardCheck,
  ChevronLeft, ChevronRight, GraduationCap, RefreshCw, FileUp, AlertCircle, CheckCircle2, Sparkles,
  RotateCcw, DollarSign, Check, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { KeuanganInvoice, seedDefaultKeuanganTransactions, isKeuanganCleared } from '../../data/keuanganSeed';
import { REAL_PEMBAYARAN_FROM_SHEETS } from '../../data/keuanganTransactionsData';
import { normalizePembayaranRow, deduplicatePembayaranList, formatPembayaranForSheet } from '../../lib/keuanganNormalizers';
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

interface PembayaranInvoiceTabProps {
  onPrintInvoice: (invoiceId: string) => void;
}

export default function PembayaranInvoiceTab({ onPrintInvoice }: PembayaranInvoiceTabProps) {
  const { students, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMetode, setFilterMetode] = useState('');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('SEMUA');
  const [filterSemester, setFilterSemester] = useState('SEMUA');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<KeuanganInvoice | null>(null);
  
  // Sync & Import State
  const [isPullingGas, setIsPullingGas] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getActiveGasUrl = () => {
    return (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || DEFAULT_APP_CONFIG.gasUrl || DEFAULT_APP_CONFIG.scriptUrl || '').trim();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  const [invoices, setInvoices] = useState<KeuanganInvoice[]>(() => {
    const rawInv = db.get<any>('keuangan_invoices') || [];
    const rawPem = db.get<any>('keuangan_pembayaran') || [];
    const sheetPem = db.get<any>('PEMBAYARAN') || [];
    const source = rawInv.length > 0 ? rawInv : (rawPem.length > 0 ? rawPem : sheetPem);

    if (source.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('erp_keuangan_cleared');
      }
      const normalized = source.map((r: any, idx: number) => normalizePembayaranRow(r, idx, students));
      return deduplicatePembayaranList(normalized);
    }
    return [];
  });

  useEffect(() => {
    const refreshFromDb = () => {
      const latest = db.get<any>('keuangan_invoices') || db.get<any>('keuangan_pembayaran') || db.get<any>('PEMBAYARAN') || [];
      if (latest.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_keuangan_cleared');
        }
        const normalized = latest.map((r: any, idx: number) => normalizePembayaranRow(r, idx, students));
        setInvoices(deduplicatePembayaranList(normalized));
      }
    };

    const handleClear = () => {
      setInvoices([]);
    };
    const handleDbUpdated = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'keuangan_invoices' || key === 'keuangan_pembayaran' || key === 'PEMBAYARAN' || key === 'keuangan_all' || key === 'all_idb' || key === 'all_synced') {
        refreshFromDb();
      }
    };

    window.addEventListener('erp-keuangan-cleared', handleClear);
    window.addEventListener('erp-db-updated', handleDbUpdated);
    window.addEventListener('erp-db-synced', refreshFromDb);

    // Hydration check in case IndexedDB loads right after mount
    const timer1 = setTimeout(refreshFromDb, 60);
    const timer2 = setTimeout(refreshFromDb, 300);

    // Auto-fetch from server API if currently empty
    const currentList = db.get<any>('keuangan_invoices') || db.get<any>('keuangan_pembayaran') || db.get<any>('PEMBAYARAN') || [];
    if (currentList.length === 0) {
      fetch('/api/sheet-data/PEMBAYARAN')
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            const allStudents = students && students.length > 0 ? students : (db.get<any>('students') || db.get<any>('siswa') || []);
            const normalized = res.data.map((r: any, idx: number) => normalizePembayaranRow(r, idx, allStudents));
            const deduped = deduplicatePembayaranList(normalized);
            if (deduped.length > 0) {
              db.set('keuangan_pembayaran', deduped, { skipPush: true });
              db.set('keuangan_invoices', deduped, { skipPush: true });
              db.set('PEMBAYARAN', deduped, { skipPush: true });
              if (typeof window !== 'undefined') {
                localStorage.removeItem('erp_keuangan_cleared');
              }
              setInvoices(deduped);
            }
          }
        })
        .catch(() => {});
    }

    // Initial check to clean bloated duplicates in storage if any
    const latest = db.get<any>('keuangan_invoices') || db.get<any>('keuangan_pembayaran') || db.get<any>('PEMBAYARAN') || [];
    if (latest.length > 0) {
      const normalized = latest.map((r: any, idx: number) => normalizePembayaranRow(r, idx, students));
      const deduped = deduplicatePembayaranList(normalized);
      if (deduped.length < latest.length) {
        db.set('keuangan_invoices', deduped, { skipPush: true });
        db.set('keuangan_pembayaran', deduped, { skipPush: true });
        db.set('PEMBAYARAN', deduped, { skipPush: true });
        setInvoices(deduped);
      }
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('erp-keuangan-cleared', handleClear);
      window.removeEventListener('erp-db-updated', handleDbUpdated);
      window.removeEventListener('erp-db-synced', refreshFromDb);
    };
  }, [students]);

  const saveInvoicesToDb = (newList: KeuanganInvoice[]) => {
    const deduped = deduplicatePembayaranList(newList);
    setInvoices(deduped);
    db.set('keuangan_invoices', deduped);
    db.set('keuangan_pembayaran', deduped);
    db.set('PEMBAYARAN', deduped);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_invoices' } }));
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'PEMBAYARAN' } }));
  };

  // Pull from Google Sheets Web App (Sheet PEMBAYARAN)
  const handlePullFromGas = async () => {
    const gasUrl = getActiveGasUrl();
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
      let remotePem: any[] = [];
      const fastRes = await pullSpecificSheetFromGas('PEMBAYARAN', gasUrl);
      if (fastRes.success && Array.isArray(fastRes.data) && fastRes.data.length > 0) {
        remotePem = fastRes.data;
      } else {
        const res = await pullAllSheetsFromGas(gasUrl);
        if (res.success && res.data) {
          remotePem = res.data.PEMBAYARAN || res.data.pembayaran || res.data.INVOICE || res.data.invoice || [];
        }
      }

      if (Array.isArray(remotePem) && remotePem.length > 0) {
        const converted = remotePem.map((row: any, idx: number) => normalizePembayaranRow(row, idx, students));
        saveInvoicesToDb(converted);
        setSyncFeedback({
          type: 'success',
          message: `✓ Terkoneksi ke Sheet PEMBAYARAN: Berhasil memuat ${converted.length} baris riwayat pembayaran langsung dari Google Spreadsheet!`
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'Sheet "PEMBAYARAN" di Google Spreadsheet saat ini belum memiliki baris data (kosong).'
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
        
        // Find sheet PEMBAYARAN or INVOICE or use first sheet
        const sheetName = workbook.SheetNames.find(n => 
          n.toUpperCase().includes('BAYAR') || 
          n.toUpperCase().includes('PEMBAYARAN') || 
          n.toUpperCase().includes('INVOICE')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert(`File kosong atau sheet "${sheetName}" tidak berisi baris data.`);
          return;
        }

        const normalized = rawJson.map((row, idx) => normalizePembayaranRow(row, idx, students));

        if (importMode === 'replace') {
          saveInvoicesToDb(normalized);
        } else {
          const map = new Map(invoices.map(i => [i.invoiceId || i.id, i]));
          normalized.forEach(i => map.set(i.invoiceId || i.id, i));
          saveInvoicesToDb(Array.from(map.values()));
        }

        setIsImportModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`Berhasil mengimpor ${normalized.length} data kwitansi/pembayaran dari file "${file.name}"!`);
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
      alert('Silakan tempel data tabel terlebih dahulu.');
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
        alert('Gagal membaca format data. Pastikan menyertakan baris judul kolom.');
        return;
      }

      const normalized = rawJson.map((row, idx) => normalizePembayaranRow(row, idx, students));

      if (importMode === 'replace') {
        saveInvoicesToDb(normalized);
      } else {
        const map = new Map(invoices.map(i => [i.invoiceId || i.id, i]));
        normalized.forEach(i => map.set(i.invoiceId || i.id, i));
        saveInvoicesToDb(Array.from(map.values()));
      }

      setIsImportModalOpen(false);
      setImportRawText('');
      alert(`Berhasil mengimpor ${normalized.length} data riwayat pembayaran secara permanen!`);
    } catch (err: any) {
      alert('Gagal memproses data: ' + err.message);
    }
  };

  const availableAcademicYears = useMemo(() => {
    const dates = invoices.map(i => i.tanggal || i.tglBayar || i.createdAt);
    const explicitTAs = invoices.map(i => i.tahunAjaranId);
    return extractAvailableAcademicYears(dates, explicitTAs);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = searchTerm.toLowerCase();
      const no = String(inv.invoiceId || '').toLowerCase();
      const pemId = String(inv.pembayaranId || inv.id || '').toLowerCase();
      const tagId = String(inv.tagihanId || '').toLowerCase();
      const nama = String(inv.namaSiswa || '').toLowerCase();
      const sId = String(inv.siswaId || '').toLowerCase();
      const metode = String(inv.metodePembayaran || inv.metode || '').toLowerCase();
      const bank = String(inv.bank || '').toLowerCase();
      const ref = String(inv.noReferensi || '').toLowerCase();
      const petugas = String(inv.petugasId || inv.createdBy || '').toLowerCase();

      const matchesQ = !searchTerm || 
        no.includes(q) || 
        pemId.includes(q) || 
        tagId.includes(q) || 
        nama.includes(q) || 
        sId.includes(q) || 
        metode.includes(q) || 
        bank.includes(q) || 
        ref.includes(q) || 
        petugas.includes(q);

      const matchesKelas = !filterKelas || matchClass(inv.namaKelas, filterKelas);
      const matchesMetode = !filterMetode || (inv.metodePembayaran || inv.metode) === filterMetode;
      
      const invDate = inv.tanggal || inv.tglBayar || inv.createdAt;
      const matchesTA = matchAcademicFilter(
        invDate,
        filterTahunAjaran,
        filterSemester,
        undefined,
        inv.tahunAjaranId,
        inv.semesterId
      );

      return matchesQ && matchesKelas && matchesMetode && matchesTA;
    });
  }, [invoices, searchTerm, filterKelas, filterMetode, filterTahunAjaran, filterSemester]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const handleDeleteInvoice = (id: string, inv?: KeuanganInvoice) => {
    const targetId = inv?.pembayaranId || inv?.id || id;
    Swal.fire({
      title: 'Hapus Riwayat Pembayaran?',
      html: `Apakah Anda yakin ingin menghapus kwitansi <b>${inv?.invoiceId || targetId}</b> (${inv?.namaSiswa || 'Siswa'})?<br><span class="text-xs text-rose-600 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = invoices.filter(i => i.id !== targetId && i.pembayaranId !== targetId);
        saveInvoicesToDb(updated);

        // Restore associated tagihan if present
        let updatedTagihanListForSync: any[] = [];
        try {
          const existingTagihan = db.get<any>('keuangan_tagihan') || [];
          if (existingTagihan.length > 0 && inv) {
            const affectedTagihanIds = new Set<string>();
            if (inv.tagihanId) affectedTagihanIds.add(String(inv.tagihanId));
            if (Array.isArray(inv.tagihanIds)) {
              inv.tagihanIds.forEach((id: string) => affectedTagihanIds.add(String(id)));
            }
            if (affectedTagihanIds.size > 0) {
              const updatedTagihan = existingTagihan.map((t: any) => {
                const tId = String(t.id || t.tagihanId || '');
                if (affectedTagihanIds.has(tId)) {
                  const nom = Number(t.nominal || 0);
                  const invAmount = Number((inv as any).totalBayar || inv.total || inv.nominal || 0);
                  const curPaid = Number(t.paidAmount || t.dibayar || 0);
                  const restoredPaid = Math.max(0, curPaid - invAmount);
                  const restoredSisa = Math.max(0, nom - restoredPaid);
                  const restoredStatus = restoredSisa === 0 ? 'LUNAS' : (restoredPaid > 0 ? 'SEBAGIAN' : 'BELUM');
                  return {
                    ...t,
                    paidAmount: restoredPaid,
                    dibayar: restoredPaid,
                    sisa: restoredSisa,
                    status: restoredStatus,
                    updatedAt: new Date().toISOString()
                  };
                }
                return t;
              });
              updatedTagihanListForSync = updatedTagihan;
              db.set('keuangan_tagihan', updatedTagihan);
              db.set('TAGIHAN', updatedTagihan);
              window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
              window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'TAGIHAN' } }));
            }
          }
        } catch (restoreErr) {
          console.warn('Error restoring tagihan on invoice delete:', restoreErr);
        }

        // Push delete to Google Spreadsheet via Backend API
        try {
          fetch('/api/keuangan/transaksi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'PEMBAYARAN',
              fullList: updated.map(formatPembayaranForSheet),
              updateTagihanList: updatedTagihanListForSync.length > 0 ? updatedTagihanListForSync : undefined
            })
          }).catch(err => console.warn('Sync PEMBAYARAN delete via backend error:', err));
        } catch (e) {}

        // Push delete to Google Apps Script Sheet
        const scriptUrl = getActiveGasUrl();
        if (isValidGasUrl(scriptUrl) && updated.length > 0) {
          fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'PEMBAYARAN',
            data: updated.map(formatPembayaranForSheet),
            spreadsheetId: settings?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId
          }).catch(err => console.warn('Sync PEMBAYARAN delete error:', err));
        }

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Riwayat pembayaran berhasil dihapus.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      alert("Tidak ada data kwitansi/invoice untuk diekspor.");
      return;
    }
    const rows = filteredInvoices.map((inv, idx) => ({
      No: idx + 1,
      PembayaranID: inv.pembayaranId || inv.id,
      TagihanID: inv.tagihanId || (inv.tagihanIds && inv.tagihanIds[0]) || '-',
      InvoiceID: inv.invoiceId,
      SiswaID: inv.siswaId || '-',
      NamaSiswa: inv.namaSiswa,
      Kelas: inv.namaKelas || '-',
      Tanggal: inv.tanggal || inv.tglBayar,
      Nominal: inv.nominal || inv.total,
      MetodePembayaran: inv.metodePembayaran || inv.metode,
      NoReferensi: inv.noReferensi || '-',
      Bank: inv.bank || '-',
      PetugasID: inv.petugasId || inv.createdBy || 'Bendahara Sekolah',
      Keterangan: inv.keterangan || inv.catatan || '-',
      Status: inv.status || 'PAID',
      CreatedAt: inv.createdAt || '-',
      UpdatedAt: inv.updatedAt || '-'
    }));
    exportToExcel(rows, `Riwayat_Sheet_PEMBAYARAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  const hasActiveFilter = Boolean(
    searchTerm || 
    filterKelas || 
    (filterTahunAjaran && filterTahunAjaran !== 'SEMUA') || 
    (filterSemester && filterSemester !== 'SEMUA') || 
    filterMetode
  );

  const totalInvoicesCount = invoices.length;
  const totalPenerimaanNominal = invoices.reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0);
  const totalTunaiNominal = invoices.filter(inv => (inv.metodePembayaran || inv.metode) === 'CASH').reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0);
  const totalNonTunaiNominal = invoices.filter(inv => (inv.metodePembayaran || inv.metode) !== 'CASH').reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Receipt size={20} className="text-emerald-600" />
              Riwayat Kwitansi Sah
            </h2>
            <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 font-mono">
              <Receipt size={12} />
              <span>Kwitansi Sah ({invoices.length.toLocaleString('id-ID')} data • {fmtRp(totalPenerimaanNominal)})</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi penerimaan kasir, arsip bukti pembayaran sah, dan pencetakan kwitansi siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/sheet-data/PEMBAYARAN');
                const json = await res.json();
                if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
                  const allStudents = students && students.length > 0 ? students : (db.get<any>('students') || db.get<any>('siswa') || []);
                  const normalized = json.data.map((r: any, idx: number) => normalizePembayaranRow(r, idx, allStudents));
                  const deduped = deduplicatePembayaranList(normalized);
                  db.set('keuangan_pembayaran', deduped, { skipPush: true });
                  db.set('keuangan_invoices', deduped, { skipPush: true });
                  db.set('PEMBAYARAN', deduped, { skipPush: true });
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('erp_keuangan_cleared');
                  }
                  setInvoices(deduped);
                  Swal.fire({ icon: 'success', title: 'Sinkronisasi Berhasil', text: `Berhasil memuat ${deduped.length} data riwayat kwitansi dari Google Spreadsheet.` });
                } else {
                  Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data di Sheet PEMBAYARAN.' });
                }
              } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Gagal Menarik Data', text: err?.message || 'Koneksi bermasalah' });
              }
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Tarik data kwitansi dari Google Spreadsheet"
          >
            <RefreshCw size={14} />
            <span>Tarik dari Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Impor riwayat pembayaran dari Excel / TSV"
          >
            <FileSpreadsheet size={14} />
            <span>Impor Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ekspor riwayat pembayaran ke file Excel"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kwitansi */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {hasActiveFilter ? 'Kwitansi Terfilter' : 'Total Kwitansi Sah'}
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(hasActiveFilter ? filteredInvoices.length : totalInvoicesCount).toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500">
              {hasActiveFilter ? `dari ${totalInvoicesCount} total kwitansi` : 'Arsip Transaksi Kasir'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Receipt size={20} />
          </div>
        </div>

        {/* Card 2: Total Penerimaan */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Total Penerimaan
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredInvoices.reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0) : totalPenerimaanNominal)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check size={13} />
              Kas Masuk Terverifikasi
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Pembayaran Tunai */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Penerimaan Tunai
            </span>
            <div className="text-2xl font-black text-blue-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredInvoices.filter(inv => (inv.metodePembayaran || inv.metode) === 'CASH').reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0) : totalTunaiNominal)}
            </div>
            <p className="text-[11px] text-blue-600 font-medium truncate max-w-[180px]">
              Metode Bayar CASH
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Card 4: Non-Tunai & Autodebet */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Non-Tunai &amp; Tabungan
            </span>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {fmtRp(hasActiveFilter ? filteredInvoices.filter(inv => (inv.metodePembayaran || inv.metode) !== 'CASH').reduce((acc, inv) => acc + (Number(inv.nominal || inv.total) || 0), 0) : totalNonTunaiNominal)}
            </div>
            <p className="text-[11px] text-amber-600 font-medium truncate max-w-[180px]">
              Transfer &amp; Tabungan Siswa
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <ArrowUpRight size={20} />
          </div>
        </div>
      </div>

      {/* Sync Feedback Banner */}
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
              placeholder="Cari invoice, siswa, ID..."
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
            value={filterMetode}
            onChange={(e) => {
              setFilterMetode(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">Semua Metode</option>
            <option value="CASH">CASH (Tunai)</option>
            <option value="TRANSFER">TRANSFER (Bank)</option>
            <option value="TABUNGAN">TABUNGAN (Autodebet)</option>
            <option value="QRIS">QRIS</option>
          </select>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKelas('');
                setFilterTahunAjaran('SEMUA');
                setFilterSemester('SEMUA');
                setFilterMetode('');
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
            {filteredInvoices.length} Kwitansi Tercatat
          </span>
        </div>
      </div>

      {/* Table Sesuai Skema Sheet PEMBAYARAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-44 whitespace-nowrap">ID Pembayaran & Invoice</th>
                <th className="p-3.5 min-w-[180px]">Nama Siswa (SiswaID)</th>
                <th className="p-3.5 w-24 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Tahun Ajaran / Sem</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Tanggal Bayar</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Nominal Bayar</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Metode & Ref</th>
                <th className="p-3.5 w-32 whitespace-nowrap">Petugas Kasir</th>
                <th className="p-3.5 w-24 text-center whitespace-nowrap">Status</th>
                <th className="p-3.5 pr-4 w-32 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 space-y-3">
                    <Receipt size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">Belum Ada Riwayat Kwitansi Sah</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Kwitansi sah otomatis terbit saat pembayaran diproses dari tab Tagihan & Pembayaran Kasir, atau dapat ditarik langsung dari Google Spreadsheet.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/sheet-data/PEMBAYARAN');
                            const json = await res.json();
                            if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
                              const allStudents = students && students.length > 0 ? students : (db.get<any>('students') || db.get<any>('siswa') || []);
                              const normalized = json.data.map((r: any, idx: number) => normalizePembayaranRow(r, idx, allStudents));
                              const deduped = deduplicatePembayaranList(normalized);
                              db.set('keuangan_pembayaran', deduped, { skipPush: true });
                              db.set('keuangan_invoices', deduped, { skipPush: true });
                              db.set('PEMBAYARAN', deduped, { skipPush: true });
                              localStorage.removeItem('erp_keuangan_cleared');
                              setInvoices(deduped);
                              Swal.fire({ icon: 'success', title: 'Sinkronisasi Berhasil', text: `Berhasil memuat ${deduped.length} data riwayat pembayaran dari Google Spreadsheet.` });
                            } else {
                              Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Tidak ada data di Sheet PEMBAYARAN.' });
                            }
                          } catch (err: any) {
                            Swal.fire({ icon: 'error', title: 'Gagal Menarik Data', text: err?.message || 'Koneksi bermasalah' });
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        <span>Muat Ulang Riwayat Kwitansi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Impor Riwayat Kwitansi</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, idx) => {
                  const pemId = inv.pembayaranId || inv.id;
                  const invId = inv.invoiceId;
                  const tagId = inv.tagihanId || (inv.tagihanIds && inv.tagihanIds[0]) || '-';
                  const nominal = inv.nominal || inv.total;
                  const metode = inv.metodePembayaran || inv.metode || 'CASH';
                  const petugas = inv.petugasId || inv.createdBy || 'Bendahara';
                  const tgl = inv.tanggal || inv.tglBayar;

                  return (
                    <tr key={`${inv.id || pemId || 'inv'}_${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono">
                        <div className="font-black text-emerald-800 text-xs flex items-center gap-1">
                          <Receipt size={12} />
                          <span>{invId}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {pemId} | Tag: {tagId}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="text-sm font-black text-slate-900">{inv.namaSiswa}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">SiswaID: {inv.siswaId || '-'}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {inv.namaKelas || '-'}
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11px]">
                        {(() => {
                          const info = getAcademicPeriodInfo(tgl || inv.createdAt);
                          const displayTA = inv.tahunAjaranId || info.academicYear;
                          const displaySem = inv.semesterId || (info.semester === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)');
                          return (
                            <div>
                              <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] inline-block">
                                TA {displayTA}
                              </span>
                              <div className={`text-[10px] font-bold mt-0.5 ${String(displaySem).toLowerCase().includes('1') || String(displaySem).toLowerCase().includes('ganjil') ? 'text-indigo-600' : 'text-teal-600'}`}>
                                {displaySem.startsWith('Sem') ? displaySem : `Sem ${displaySem}`}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-700">
                        {tgl}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                        {fmtRp(nominal)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200">
                            {metode}
                          </span>
                          {inv.bank && inv.bank !== '-' && (
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">{inv.bank}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 text-xs">
                        <div className="font-semibold">{petugas}</div>
                        {inv.catatan && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{inv.catatan}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                          {inv.status || 'PAID'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Lihat Detail Mutasi"
                          >
                            <Eye size={12} />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => onPrintInvoice(inv.invoiceId)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                            title="Cetak Kwitansi / Struk"
                          >
                            <Printer size={12} />
                            <span>Cetak</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id || inv.pembayaranId, inv)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Data Kwitansi"
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
        {filteredInvoices.length > 0 && (
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
                <option value={100000}>Tampilkan Semua ({filteredInvoices.length} data)</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Menampilkan <b>{Math.min((currentPage - 1) * pageSize + 1, filteredInvoices.length)}</b> - <b>{Math.min(currentPage * pageSize, filteredInvoices.length)}</b> dari <b>{filteredInvoices.length}</b> total pembayaran
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

      {/* Modal Detail Invoice Sesuai Skema Sheet PEMBAYARAN */}
      {selectedInvoiceForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Kwitansi: {selectedInvoiceForDetail.invoiceId}</h3>
                  <p className="text-xs text-slate-500">{selectedInvoiceForDetail.namaSiswa} ({selectedInvoiceForDetail.namaKelas})</p>
                </div>
              </div>
              <button onClick={() => setSelectedInvoiceForDetail(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Field Skema Database Sheet PEMBAYARAN */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PembayaranID</span>
                <span className="font-mono font-bold text-slate-800">{selectedInvoiceForDetail.pembayaranId || selectedInvoiceForDetail.id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">SiswaID</span>
                <span className="font-mono font-bold text-slate-800">{selectedInvoiceForDetail.siswaId || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">TagihanID</span>
                <span className="font-mono font-bold text-slate-800">{selectedInvoiceForDetail.tagihanId || (selectedInvoiceForDetail.tagihanIds && selectedInvoiceForDetail.tagihanIds[0]) || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal Bayar</span>
                <span className="font-mono font-bold text-slate-800">{selectedInvoiceForDetail.tanggal || selectedInvoiceForDetail.tglBayar}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Metode</span>
                <span className="font-mono font-bold text-emerald-700">{selectedInvoiceForDetail.metodePembayaran || selectedInvoiceForDetail.metode}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank / Ref</span>
                <span className="font-mono font-bold text-slate-700">{selectedInvoiceForDetail.bank || selectedInvoiceForDetail.noReferensi || '-'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Rincian Tagihan yang Dibayar
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-left">Pos Biaya</th>
                      <th className="p-3 text-center">Periode</th>
                      <th className="p-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedInvoiceForDetail.items && selectedInvoiceForDetail.items.length > 0 ? (
                      selectedInvoiceForDetail.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-slate-800">{item.namaBiaya}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{item.periode}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtRp(item.nominal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Pembayaran Tagihan</td>
                        <td className="p-3 text-center font-mono text-slate-600">-</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtRp(selectedInvoiceForDetail.nominal || selectedInvoiceForDetail.total)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="p-3 text-right text-slate-700 font-black">TOTAL DITERIMA KASIR:</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {fmtRp(selectedInvoiceForDetail.nominal || selectedInvoiceForDetail.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedInvoiceForDetail.catatan && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-600 block mb-0.5">Catatan Kasir:</span>
                <p className="text-slate-700 font-medium">{selectedInvoiceForDetail.catatan}</p>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400">
                Petugas Kasir: {selectedInvoiceForDetail.petugasId || selectedInvoiceForDetail.createdBy || 'Bendahara'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForDetail(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPrintInvoice(selectedInvoiceForDetail.invoiceId);
                    setSelectedInvoiceForDetail(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  <span>Cetak Kwitansi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impor / Tempel Sheet PEMBAYARAN */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Impor Data Sheet PEMBAYARAN</h3>
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
                id="excel-pembayaran-upload"
              />
              <label
                htmlFor="excel-pembayaran-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-2xl bg-white text-emerald-600 shadow-xs flex items-center justify-center">
                  <FileUp size={20} />
                </div>
                <span className="text-xs font-black text-slate-800">
                  Klik untuk Memilih File Excel (.xlsx, .xls, .csv)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Sistem otomatis membaca data dari sheet "PEMBAYARAN" atau "INVOICE"
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
                placeholder={`Contoh format:\nPembayaranID\tTagihanID\tInvoiceID\tSiswaID\tNamaSiswa\tKelas\tTanggal\tNominal\tMetodePembayaran\tNoReferensi\tBank\tPetugasID\tKeterangan\nBYR_001\tTGH_001\tINV-001\t001\tAhmad\tPaket A\t2026-07-05\t150000\tCASH\t-\t-\tAdmin\tBayar Iuran Bulanan`}
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
                  <span>Proses & Simpan Kwitansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
