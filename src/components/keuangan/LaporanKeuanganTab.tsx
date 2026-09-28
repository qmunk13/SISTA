import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart3, Download, Printer, Eye, Search, Filter, X, 
  Calendar, FileSpreadsheet, Layers, UserCheck, Wallet, 
  CreditCard, CheckCircle2, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  KeuanganTagihan, KeuanganInvoice, KeuanganTabungan, KeuanganKelas 
} from '../../data/keuanganSeed';
import { getAllClasses, formatClassLabel, matchClass } from '../../lib/utils';
import { matchAcademicFilter, extractAvailableAcademicYears } from '../../lib/academicYear';
import {
  normalizeTagihanRow,
  deduplicateTagihanList,
  normalizePembayaranRow,
  deduplicatePembayaranList,
  normalizeTabunganRow,
  deduplicateTabunganList
} from '../../lib/keuanganNormalizers';
import { syncCoreSpreadsheetData } from '../../utils/coreDataSync';

function getValidArray(...keys: string[]): any[] {
  for (const k of keys) {
    const val = db.get<any>(k);
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

function loadNormalizedTagihan(studentsList?: any[]): KeuanganTagihan[] {
  const raw = getValidArray('keuangan_tagihan', 'TAGIHAN', 'tagihan');
  const norm = raw.map((r: any, idx: number) => normalizeTagihanRow(r, idx, studentsList));
  return deduplicateTagihanList(norm);
}

function loadNormalizedInvoices(studentsList?: any[]): KeuanganInvoice[] {
  const raw = getValidArray('keuangan_invoices', 'keuangan_pembayaran', 'PEMBAYARAN', 'INVOICE');
  const norm = raw.map((r: any, idx: number) => normalizePembayaranRow(r, idx, studentsList));
  return deduplicatePembayaranList(norm);
}

function loadNormalizedTabungan(studentsList?: any[]): KeuanganTabungan[] {
  const raw = getValidArray('keuangan_tabungan', 'TABUNGAN', 'tabungan');
  const norm = raw.map((r: any, idx: number) => normalizeTabunganRow(r, idx, studentsList));
  return deduplicateTabunganList(norm);
}

interface LaporanKeuanganTabProps {
  onOpenPdfReport: (filterState: any) => void;
  onOpenStudentDetail: (siswaId: string) => void;
}

export default function LaporanKeuanganTab({ onOpenPdfReport, onOpenStudentDetail }: LaporanKeuanganTabProps) {
  const { students } = useStore();
  const currentYear = new Date().getFullYear();

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  // Filters - Default: SEMUA TAHUN & SEMUA KELAS
  const [selectedYear, setSelectedYear] = useState<string>('SEMUA');
  const [mode, setMode] = useState<'BULAN' | 'SEMESTER'>('BULAN');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedSemester, setSelectedSemester] = useState<string>('SEMUA');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Data from DB dengan normalisasi penuh terhadap kolom Google Spreadsheet
  const [tagihanList, setTagihanList] = useState<KeuanganTagihan[]>(() => loadNormalizedTagihan(useStore.getState().students));
  const [invoiceList, setInvoiceList] = useState<KeuanganInvoice[]>(() => loadNormalizedInvoices(useStore.getState().students));
  const [tabunganList, setTabunganList] = useState<KeuanganTabungan[]>(() => loadNormalizedTabungan(useStore.getState().students));

  // Reload data from DB on mount, when DB changes, or when window gains focus
  useEffect(() => {
    const refreshData = () => {
      const currentStudents = useStore.getState().students || [];
      const normTag = loadNormalizedTagihan(currentStudents);
      const normInv = loadNormalizedInvoices(currentStudents);
      const normTab = loadNormalizedTabungan(currentStudents);
      setTagihanList(normTag);
      setInvoiceList(normInv);
      setTabunganList(normTab);

      // Persist normalized tagihan back to db if raw items lacked siswaId
      const rawTag = db.get<any>('keuangan_tagihan') || [];
      if (rawTag.length > 0 && !rawTag[0]?.siswaId && normTag.length > 0 && normTag[0]?.siswaId) {
        db.set('keuangan_tagihan', normTag, { skipPush: true });
        db.set('TAGIHAN', normTag, { skipPush: true });
      }
    };
    refreshData();

    // Auto-sync from Google Spreadsheet to ensure fresh finance data
    syncCoreSpreadsheetData().then(refreshData).catch(() => {});

    window.addEventListener('erp-db-updated', refreshData);
    window.addEventListener('erp-db-synced', refreshData);
    window.addEventListener('focus', refreshData);
    window.addEventListener('erp-keuangan-cleared', refreshData);
    return () => {
      window.removeEventListener('erp-db-updated', refreshData);
      window.removeEventListener('erp-db-synced', refreshData);
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('erp-keuangan-cleared', refreshData);
    };
  }, []);

  // Compute year options
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 4; y <= currentYear + 3; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Aggregate Report Data per Student
  const reportRows = useMemo(() => {
    // 1. Build Base Student Map & Alias Lookup
    const studentMap: { [id: string]: {
      siswaId: string;
      nis: string;
      nama: string;
      kelasNama: string;
      totalTagihan: number;
      totalBayar: number;
      paidFromInvoices: number;
      sisaTagihan: number;
      totalTabungan: number;
      jumlahTagihan: number;
    } } = {};

    const aliasToId = new Map<string, string>();
    const registerAliases = (canonicalId: string, s: any) => {
      const candidates = [
        canonicalId,
        s.id,
        s.nopdkt,
        s.NoPDKT,
        s.NoPdkt,
        s.nis,
        s.nisn,
        s.registrationCode,
        s.no_pendaftaran
      ];
      candidates.forEach(c => {
        if (!c) return;
        const str = String(c).trim();
        if (!str || str === '-') return;
        aliasToId.set(str, canonicalId);
        aliasToId.set(str.toLowerCase(), canonicalId);
        if (/^\d+$/.test(str)) {
          aliasToId.set(str.padStart(3, '0'), canonicalId);
          aliasToId.set(String(Number(str)), canonicalId);
        }
      });
      const nm = String(s.name || s.nama || s.namaSiswa || '').trim().toLowerCase();
      if (nm && nm !== 'siswa') {
        aliasToId.set(`name:${nm}`, canonicalId);
      }
    };

    const resolveStudentKey = (rawId?: string, rawNopdkt?: string, rawNis?: string, rawName?: string): string => {
      for (const candidate of [rawId, rawNopdkt, rawNis]) {
        if (!candidate) continue;
        const str = String(candidate).trim();
        if (!str || str === '-') continue;
        if (studentMap[str]) return str;
        if (aliasToId.has(str)) return aliasToId.get(str)!;
        if (aliasToId.has(str.toLowerCase())) return aliasToId.get(str.toLowerCase())!;
        if (/^\d+$/.test(str)) {
          const padded = str.padStart(3, '0');
          if (studentMap[padded]) return padded;
          if (aliasToId.has(padded)) return aliasToId.get(padded)!;
        }
      }
      if (rawName) {
        const nm = String(rawName).trim().toLowerCase();
        if (aliasToId.has(`name:${nm}`)) return aliasToId.get(`name:${nm}`)!;
      }
      return String(rawId || rawNopdkt || rawNis || '').trim();
    };

    const allStudents = students;
    allStudents.forEach(s => {
      const k = String(s.class || s.kelas || 'Kelas -');
      if (selectedKelas && !matchClass(k, selectedKelas)) return;

      const canonicalId = String(s.id);
      studentMap[canonicalId] = {
        siswaId: canonicalId,
        nis: String(s.nis || s.nisn || s.nopdkt || '-'),
        nama: String(s.name || 'Siswa'),
        kelasNama: k,
        totalTagihan: 0,
        totalBayar: 0,
        paidFromInvoices: 0,
        sisaTagihan: 0,
        totalTabungan: 0,
        jumlahTagihan: 0,
      };
      registerAliases(canonicalId, s);
    });

    const checkPeriodMatch = (periodStr: string): boolean => {
      if (selectedYear === 'SEMUA') return true;
      if (mode === 'BULAN') {
        const targetYm = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        return periodStr === targetYm || periodStr.startsWith(targetYm);
      } else if (mode === 'SEMESTER') {
        if (selectedSemester === '1') {
          return ['07', '08', '09', '10', '11', '12'].some(m => periodStr.includes(`${selectedYear}-${m}`));
        } else if (selectedSemester === '2') {
          return ['01', '02', '03', '04', '05', '06'].some(m => periodStr.includes(`${selectedYear}-${m}`));
        } else {
          return periodStr.includes(selectedYear);
        }
      }
      return true;
    };

    // 2. Filter & Apply Tagihan
    tagihanList.forEach(t => {
      const resolvedKey = resolveStudentKey(t.siswaId, t.nopdkt || (t as any).NoPDKT, t.nis, t.namaSiswa || (t as any).NamaSiswa);
      if (!resolvedKey) return;

      if (!studentMap[resolvedKey]) {
        const k = String(t.kelasNama || t.kelasId || (t as any).kelas || (t as any).Kelas || 'Kelas -');
        if (!selectedKelas || matchClass(k, selectedKelas)) {
          studentMap[resolvedKey] = {
            siswaId: resolvedKey,
            nis: String(t.nis || t.nopdkt || resolvedKey || '-'),
            nama: String(t.namaSiswa || (t as any).NamaSiswa || 'Siswa'),
            kelasNama: k,
            totalTagihan: 0,
            totalBayar: 0,
            paidFromInvoices: 0,
            sisaTagihan: 0,
            totalTabungan: 0,
            jumlahTagihan: 0,
          };
          registerAliases(resolvedKey, { id: resolvedKey, nopdkt: t.nopdkt, nis: t.nis, name: t.namaSiswa });
        }
      }

      const st = studentMap[resolvedKey];
      if (!st) return;

      const periodStr = String(t.periode || t.tanggalTagihan || t.jatuhTempo || '');
      if (checkPeriodMatch(periodStr)) {
        const nomAsli = Number(t.totalTagihan || t.nominalAsli || t.nominal) || 0;
        const paid = Number(t.paidAmount) || Number((t as any).totalBayar) || (t.status === 'LUNAS' ? nomAsli : 0);
        const sisa = t.status === 'LUNAS' 
          ? 0 
          : ((t as any).remainingAmount !== undefined 
              ? Number((t as any).remainingAmount) 
              : ((t as any).sisaTagihan !== undefined ? Number((t as any).sisaTagihan) : Math.max(0, nomAsli - paid)));

        st.totalTagihan += nomAsli;
        st.totalBayar += paid;
        st.sisaTagihan += sisa;
        st.jumlahTagihan += 1;
      }
    });

    // 2b. Reconcile with PEMBAYARAN (invoiceList) in case payments were recorded in PEMBAYARAN
    invoiceList.forEach(inv => {
      const resolvedKey = resolveStudentKey(inv.siswaId, (inv as any).nopdkt || (inv as any).NoPDKT, undefined, inv.namaSiswa);
      if (!resolvedKey) return;
      const st = studentMap[resolvedKey];
      if (!st) return;
      const periodStr = String(inv.tanggal || inv.tglBayar || inv.createdAt || '');
      if (checkPeriodMatch(periodStr)) {
        const nom = Number(inv.total ?? inv.nominal ?? 0) || 0;
        st.paidFromInvoices += nom;
      }
    });

    Object.values(studentMap).forEach(st => {
      if (st.paidFromInvoices > st.totalBayar) {
        st.totalBayar = st.paidFromInvoices;
      }
    });

    // 3. Apply Tabungan per Student
    tabunganList.forEach(tb => {
      const resolvedKey = resolveStudentKey(tb.siswaId, (tb as any).nopdkt || (tb as any).NoPDKT, undefined, tb.namaSiswa);
      if (!resolvedKey) return;
      const st = studentMap[resolvedKey];
      if (!st) return;
      const nom = Number(tb.nominal) || 0;
      const jns = String(tb.jenis || tb.jenisTransaksi || '').toUpperCase();
      if (jns === 'SETOR') st.totalTabungan += nom;
      else if (jns === 'TARIK') st.totalTabungan -= nom;
    });

    // 4. Convert to Array and Filter by Search Term
    let rows = Object.values(studentMap);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r => 
        String(r.nama || '').toLowerCase().includes(q) || 
        String(r.nis || '').toLowerCase().includes(q) || 
        String(r.kelasNama || '').toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => 
      String(a.kelasNama || '').localeCompare(String(b.kelasNama || ''), undefined, { numeric: true }) || 
      String(a.nama || '').localeCompare(String(b.nama || ''))
    );
    return rows;
  }, [students, tagihanList, invoiceList, tabunganList, selectedYear, mode, selectedMonth, selectedSemester, selectedKelas, searchTerm]);

  // Overall Summaries
  const summary = useMemo(() => {
    return reportRows.reduce((acc, r) => {
      acc.totalSiswa += 1;
      acc.totalTagihan += r.totalTagihan;
      acc.totalBayar += r.totalBayar;
      acc.sisaTagihan += r.sisaTagihan;
      acc.totalTabungan += r.totalTabungan;
      return acc;
    }, {
      totalSiswa: 0,
      totalTagihan: 0,
      totalBayar: 0,
      sisaTagihan: 0,
      totalTabungan: 0,
    });
  }, [reportRows]);

  // Paginated Rows
  const totalPages = Math.ceil(reportRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reportRows.slice(start, start + pageSize);
  }, [reportRows, currentPage, pageSize]);

  // Export Excel
  const handleExportExcel = () => {
    if (reportRows.length === 0) {
      alert('Tidak ada data laporan untuk diexport.');
      return;
    }

    const dataToExport = reportRows.map((r, idx) => ({
      'No': idx + 1,
      'NIS / NISN': r.nis,
      'Nama Siswa': r.nama,
      'Kelas / Rombel': r.kelasNama,
      'Total Tagihan (Rp)': r.totalTagihan,
      'Total Terbayar (Rp)': r.totalBayar,
      'Sisa Tagihan (Rp)': r.sisaTagihan,
      'Saldo Tabungan (Rp)': r.totalTabungan,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');

    const fileName = `Laporan_Keuangan_${selectedYear === 'SEMUA' ? 'Semua_Tahun' : selectedYear}_${selectedKelas || 'Semua_Kelas'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getPeriodeLabel = () => {
    if (selectedYear === 'SEMUA') return 'Semua Tahun (Seluruh Periode)';
    if (mode === 'BULAN') return `Bulan ${String(selectedMonth).padStart(2, '0')}-${selectedYear}`;
    if (selectedSemester === 'SEMUA') return `Tahun Ajaran ${selectedYear}`;
    return `Semester ${selectedSemester} Tahun ${selectedYear}`;
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header & Main Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" />
            Laporan Rekapitulasi Keuangan & Pembayaran Tagihan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {getPeriodeLabel()} • {selectedKelas ? `Kelas ${selectedKelas}` : 'Semua Kelas'} • {reportRows.length} Siswa Terdata
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={() => onOpenPdfReport({
              year: selectedYear,
              mode,
              month: selectedMonth,
              semester: selectedSemester,
              kelas: selectedKelas,
              label: getPeriodeLabel(),
              rows: reportRows,
              summary,
            })}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Printer size={14} />
            <span>Cetak / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Tahun - Default: SEMUA */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tahun Ajaran / Periode
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="SEMUA">Semua Tahun (Total Rekap)</option>
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>Tahun {y}</option>
              ))}
            </select>
          </div>

          {/* Mode (Hanya muncul jika memilih tahun tertentu) */}
          {selectedYear !== 'SEMUA' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Mode Laporan
              </label>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="BULAN">Bulanan</option>
                <option value="SEMESTER">Semester / Tahunan</option>
              </select>
            </div>
          )}

          {/* Bulan or Semester Picker */}
          {selectedYear !== 'SEMUA' && mode === 'BULAN' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Pilih Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>Bulan {String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          )}

          {selectedYear !== 'SEMUA' && mode === 'SEMESTER' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Pilih Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="SEMUA">Semua Semester</option>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
          )}

          {/* Filter Kelas - Default: Semua Kelas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{formatClassLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa / NIS..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-0.5">
          <small className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Siswa Terdata</small>
          <div className="text-2xl font-black text-slate-900 font-mono">{summary.totalSiswa}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-0.5">
          <small className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Tagihan Siswa (Bruto)</small>
          <div className="text-2xl font-black text-slate-900 font-mono">{fmtRp(summary.totalTagihan)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-0.5">
          <small className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Total Pembayaran Masuk</small>
          <div className="text-2xl font-black text-emerald-700 font-mono">{fmtRp(summary.totalBayar)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-0.5">
          <small className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Sisa Tunggakan Belum Lunas</small>
          <div className="text-2xl font-black text-rose-700 font-mono">{fmtRp(summary.sisaTagihan)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[950px]">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-12 text-center">No</th>
                <th className="p-3.5 min-w-[180px]">Nama Siswa</th>
                <th className="p-3.5 w-24 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Tagihan</th>
                <th className="p-3.5 w-32 text-right font-black text-slate-900 whitespace-nowrap">Bayar</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Sisa Tagihan</th>
                <th className="p-3.5 w-32 text-right text-emerald-700 whitespace-nowrap">Tabungan</th>
                <th className="p-3.5 pr-4 w-28 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 space-y-2">
                    <BarChart3 size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Data Laporan</p>
                    <p className="text-xs text-slate-400">Silakan sesuaikan filter tahun, bulan, atau kelas di atas.</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const hasSisa = r.sisaTagihan > 0;
                  const hasTabungan = r.totalTabungan > 0;

                  return (
                    <tr key={`${r.siswaId}_${globalIdx}`} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 text-center font-bold text-slate-400">{globalIdx}</td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div>{r.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">{r.nis}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{r.kelasNama}</td>
                      <td className="p-3.5 text-right font-mono text-slate-700 font-semibold">{fmtRp(r.totalTagihan)}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{fmtRp(r.totalBayar)}</td>
                      <td className={`p-3.5 text-right font-mono font-black ${hasSisa ? 'text-rose-600' : 'text-slate-800'}`}>
                        {fmtRp(r.sisaTagihan)}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-black ${hasTabungan ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {fmtRp(r.totalTabungan)}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          onClick={() => onOpenStudentDetail(r.siswaId)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Detail Siswa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {reportRows.length > 0 && (
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
                <option value={500}>Semua ({reportRows.length})</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Menampilkan <b>{Math.min((currentPage - 1) * pageSize + 1, reportRows.length)}</b> - <b>{Math.min(currentPage * pageSize, reportRows.length)}</b> dari <b>{reportRows.length}</b> total siswa
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

