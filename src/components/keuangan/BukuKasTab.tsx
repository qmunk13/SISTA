import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, Plus, ArrowDownLeft, ArrowUpRight, Search, Filter, 
  FileSpreadsheet, Printer, Trash2, Calendar, CheckCircle2, AlertCircle, X,
  Building2, Receipt, TrendingUp, TrendingDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { KeuanganKas, KeuanganInvoice } from '../../data/keuanganSeed';
import { exportToExcel } from '../../lib/excel';
import { 
  generateStructuredKasId, 
  deduplicateKasList, 
  normalizePembayaranRow, 
  deduplicatePembayaranList 
} from '../../lib/keuanganNormalizers';
import { syncCoreSpreadsheetData } from '../../utils/coreDataSync';

function loadNormalizedKas(): KeuanganKas[] {
  const rawLocal = db.get<any>('keuangan_kas') || [];
  const rawSheet = db.get<any>('KAS') || [];
  const source = Array.isArray(rawLocal) && rawLocal.length > 0 ? rawLocal : (Array.isArray(rawSheet) ? rawSheet : []);
  return deduplicateKasList(source);
}

function loadNormalizedPembayaran(studentsList?: any[]): KeuanganInvoice[] {
  const raw = db.get<any>('keuangan_pembayaran') || db.get<any>('PEMBAYARAN') || db.get<any>('keuangan_invoices') || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const norm = raw.map((r: any, idx: number) => normalizePembayaranRow(r, idx, studentsList));
  return deduplicatePembayaranList(norm);
}

export default function BukuKasTab() {
  const [kasList, setKasList] = useState<KeuanganKas[]>(() => loadNormalizedKas());
  const [pembayaranList, setPembayaranList] = useState<KeuanganInvoice[]>(() => loadNormalizedPembayaran(useStore.getState().students));

  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('SEMUA');
  const [filterKategori, setFilterKategori] = useState<string>('SEMUA');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: 'MASUK' as 'MASUK' | 'KELUAR',
    kategori: 'Infaq / Sumbangan',
    nominal: '',
    keterangan: '',
    petugas: 'Bendahara Sekolah',
    referensi: ''
  });

  useEffect(() => {
    const refreshKasAndPembayaran = () => {
      const currentStudents = useStore.getState().students || [];
      const normKas = loadNormalizedKas();
      const normBayar = loadNormalizedPembayaran(currentStudents);
      setKasList(normKas);
      setPembayaranList(normBayar);

      // Persist normalized kas if raw items had capitalized keys without lowercase jenis/nominal
      const rawStored = db.get<any>('keuangan_kas') || [];
      if (rawStored.length > 0 && !rawStored[0]?.jenis && normKas.length > 0) {
        db.set('keuangan_kas', normKas, { skipPush: true });
      }
    };

    refreshKasAndPembayaran();

    // Auto-sync from Google Spreadsheet so KAS & PEMBAYARAN are always up to date
    syncCoreSpreadsheetData().then(refreshKasAndPembayaran).catch(() => {});

    const handleDbUpdated = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'keuangan_kas' || key === 'KAS' || key === 'keuangan_pembayaran' || key === 'PEMBAYARAN' || key === 'keuangan_invoices' || key === 'keuangan_all' || key === 'all_synced' || key === 'all') {
        refreshKasAndPembayaran();
      }
    };
    const handleCleared = () => {
      setKasList([]);
      setPembayaranList([]);
    };
    window.addEventListener('erp-db-updated', handleDbUpdated);
    window.addEventListener('erp-db-synced', refreshKasAndPembayaran);
    window.addEventListener('erp-keuangan-cleared', handleCleared);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdated);
      window.removeEventListener('erp-db-synced', refreshKasAndPembayaran);
      window.removeEventListener('erp-keuangan-cleared', handleCleared);
    };
  }, []);

  // Combine operational KAS + Pembayaran Siswa from Sheet PEMBAYARAN (deduplicated) with chronological running balance
  const combinedKasList = useMemo(() => {
    const existingRefs = new Set<string>();
    kasList.forEach(k => {
      if (k.id) existingRefs.add(String(k.id).trim().toUpperCase());
      if (k.referensi && k.referensi !== '-') existingRefs.add(String(k.referensi).trim().toUpperCase());
    });

    const derivedFromPembayaran: KeuanganKas[] = [];
    pembayaranList.forEach((inv, idx) => {
      const nom = Number(inv.total ?? inv.nominal ?? 0) || 0;
      if (nom <= 0) return;
      const payId = String(inv.pembayaranId || inv.id || `BAY_${idx + 1}`).trim();
      const invRef = String(inv.invoiceId || payId).trim();
      if (existingRefs.has(payId.toUpperCase()) || existingRefs.has(invRef.toUpperCase())) {
        return; // Already recorded in kasList
      }
      const ketBase = inv.catatan || inv.keterangan || 'Pembayaran Tagihan';
      const ketFull = inv.namaSiswa && !ketBase.toLowerCase().includes(inv.namaSiswa.toLowerCase())
        ? `${ketBase} - ${inv.namaSiswa}${inv.namaKelas ? ` (${inv.namaKelas})` : ''}`
        : ketBase;

      derivedFromPembayaran.push({
        id: payId,
        tanggal: inv.tanggal || inv.tglBayar || new Date().toISOString().slice(0, 10),
        kategori: 'Pembayaran Siswa',
        jenis: 'MASUK',
        nominal: nom,
        keterangan: ketFull,
        petugas: inv.petugasId || inv.createdBy || 'Admin / Kasir Keuangan',
        referensi: invRef,
        saldo: 0,
        createdAt: inv.createdAt || inv.tanggal || new Date().toISOString()
      });
    });

    const merged = [...kasList, ...derivedFromPembayaran];
    const sorted = merged.sort((a, b) => {
      const tA = new Date(a.tanggal).getTime() || 0;
      const tB = new Date(b.tanggal).getTime() || 0;
      if (tA !== tB) return tA - tB;
      return String(a.id).localeCompare(String(b.id));
    });

    let runningBalance = 0;
    return sorted.map(item => {
      const nom = Number(item.nominal) || 0;
      if (item.jenis === 'MASUK') {
        runningBalance += nom;
      } else {
        runningBalance -= nom;
      }
      return { ...item, saldo: runningBalance };
    });
  }, [kasList, pembayaranList]);

  const saveKasList = (newList: KeuanganKas[]) => {
    // Recompute cumulative balance in chronological order for KAS sheet
    let runningBalance = 0;
    const sorted = [...newList].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    const withBalance = sorted.map(item => {
      const nom = Number(item.nominal) || 0;
      if (item.jenis === 'MASUK') {
        runningBalance += nom;
      } else {
        runningBalance -= nom;
      }
      return { ...item, saldo: runningBalance };
    });

    setKasList(withBalance);
    db.set('keuangan_kas', withBalance);
    db.set('KAS', withBalance.map((k, idx) => ({
      KasID: k.id || `KAS_${idx + 1}`,
      Tanggal: k.tanggal,
      Kategori: k.kategori,
      Jenis: k.jenis,
      Nominal: k.nominal,
      Debit: k.jenis === 'MASUK' ? k.nominal : 0,
      Kredit: k.jenis === 'KELUAR' ? k.nominal : 0,
      Saldo: k.saldo,
      Keterangan: k.keterangan,
      Petugas: k.petugas,
      Referensi: k.referensi || '-',
      CreatedAt: k.createdAt
    })));

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_kas' } }));
  };

  // Summaries (Termasuk Pembayaran Siswa dari Sheet PEMBAYARAN & Kas Operasional dari Sheet KAS)
  const totalMasuk = useMemo(() => {
    return combinedKasList.filter(k => k.jenis === 'MASUK').reduce((acc, k) => acc + (Number(k.nominal) || 0), 0);
  }, [combinedKasList]);

  const totalKeluar = useMemo(() => {
    return combinedKasList.filter(k => k.jenis === 'KELUAR').reduce((acc, k) => acc + (Number(k.nominal) || 0), 0);
  }, [combinedKasList]);

  const countMasuk = useMemo(() => combinedKasList.filter(k => k.jenis === 'MASUK').length, [combinedKasList]);
  const countKeluar = useMemo(() => combinedKasList.filter(k => k.jenis === 'KELUAR').length, [combinedKasList]);

  const saldoKas = totalMasuk - totalKeluar;

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  // Filtered List
  const filteredKas = useMemo(() => {
    return [...combinedKasList].reverse().filter(k => {
      const matchSearch = (k.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (k.petugas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (k.referensi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (k.kategori || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchJenis = filterJenis === 'SEMUA' || k.jenis === filterJenis;
      const matchKategori = filterKategori === 'SEMUA' || k.kategori === filterKategori;

      return matchSearch && matchJenis && matchKategori;
    });
  }, [combinedKasList, searchTerm, filterJenis, filterKategori]);

  const previewKasId = useMemo(() => {
    return generateStructuredKasId(formData.jenis, formData.tanggal, kasList);
  }, [formData.jenis, formData.tanggal, kasList]);

  const handleOpenModal = (jenisDefault: 'MASUK' | 'KELUAR') => {
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      jenis: jenisDefault,
      kategori: jenisDefault === 'MASUK' ? 'Infaq / Sumbangan' : 'Belanja ATK & Sarpras',
      nominal: '',
      keterangan: '',
      petugas: 'Bendahara Sekolah',
      referensi: `KAS-${Date.now().toString().slice(-6)}`
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = Number(formData.nominal) || 0;
    if (nom <= 0) {
      Swal.fire({ icon: 'warning', title: 'Nominal Tidak Valid', text: 'Masukkan nominal lebih dari Rp 0' });
      return;
    }
    if (!formData.keterangan.trim()) {
      Swal.fire({ icon: 'warning', title: 'Keterangan Wajib', text: 'Tuliskan rincian atau alasan transaksi' });
      return;
    }

    const kasId = generateStructuredKasId(formData.jenis, formData.tanggal, kasList);
    const newKasItem: KeuanganKas = {
      id: kasId,
      tanggal: formData.tanggal,
      jenis: formData.jenis,
      kategori: formData.kategori,
      nominal: nom,
      keterangan: formData.keterangan.trim(),
      petugas: formData.petugas.trim() || 'Bendahara',
      referensi: formData.referensi.trim() || '-',
      createdAt: new Date().toISOString()
    };

    saveKasList([...kasList, newKasItem]);
    setIsModalOpen(false);

    // Sinkronisasi otomatis ke Google Spreadsheet Sheet KAS via Backend API
    try {
      fetch('/api/keuangan/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'KAS',
          record: {
            KasID: newKasItem.id,
            Tanggal: newKasItem.tanggal,
            Kategori: newKasItem.kategori,
            Jenis: newKasItem.jenis,
            Nominal: newKasItem.nominal,
            Debit: newKasItem.jenis === 'MASUK' ? newKasItem.nominal : 0,
            Kredit: newKasItem.jenis === 'KELUAR' ? newKasItem.nominal : 0,
            Saldo: 0,
            Keterangan: newKasItem.keterangan,
            Petugas: newKasItem.petugas,
            Referensi: newKasItem.referensi,
            CreatedAt: newKasItem.createdAt
          }
        })
      }).catch(err => console.warn('Sync KAS error:', err));
    } catch {}

    window.dispatchEvent(new CustomEvent('erp-keuangan-updated', { detail: { action: 'KAS', kasId } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_kas' } }));
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'KAS' } }));

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Masuk ke Google Spreadsheet!',
      text: `Transaksi kas ${formData.jenis.toLowerCase()} sebesar ${fmtRp(nom)} telah disimpan dan disinkronkan ke Sheet KAS.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDelete = (id: string, ket: string) => {
    Swal.fire({
      title: 'Hapus Transaksi Kas?',
      text: `Anda yakin ingin menghapus catatan: "${ket}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        const next = kasList.filter(k => k.id !== id);
        saveKasList(next);
        Swal.fire({ icon: 'success', title: 'Terhapus', timer: 1500, showConfirmButton: false });
      }
    });
  };

  const handleExportExcel = () => {
    if (combinedKasList.length === 0) {
      Swal.fire({ icon: 'info', title: 'Data Kosong', text: 'Belum ada transaksi buku kas untuk diekspor.' });
      return;
    }

    const exportData = combinedKasList.map((k, idx) => ({
      No: idx + 1,
      Tanggal: k.tanggal,
      Referensi: k.referensi || '-',
      Kategori: k.kategori,
      Keterangan: k.keterangan,
      Petugas: k.petugas,
      KasMasuk: k.jenis === 'MASUK' ? k.nominal : 0,
      KasKeluar: k.jenis === 'KELUAR' ? k.nominal : 0,
      Saldo: k.saldo || 0
    }));

    exportToExcel(exportData, `buku-kas-sekolah-${new Date().toISOString().slice(0, 10)}.xlsx`, 'BUKU_KAS');
  };

  const handlePrint = () => {
    window.print();
  };

  const kategoriMasuk = ['Pembayaran Siswa', 'Infaq / Sumbangan', 'Bantuan Dana / Donasi', 'Pendapatan Usaha / Kantin', 'Pengembalian Dana', 'Lain-lain'];
  const kategoriKeluar = ['Belanja ATK & Sarpras', 'Listrik, Air & Internet', 'Konsumsi & Jamuan', 'Transportasi & Perjalanan', 'Pemeliharaan Gedung', 'Honor / Insentif', 'Kegiatan Siswa', 'Lain-lain'];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 3 Summary Cards: Kas Masuk, Kas Keluar, Saldo Kas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ArrowDownLeft size={16} className="text-emerald-600" />
              Total Kas Masuk
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 tracking-tight">
            {fmtRp(totalMasuk)}
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            {countMasuk} Penerimaan Kas (Termasuk Pembayaran Siswa)
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-rose-50/80 border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <ArrowUpRight size={16} className="text-rose-600" />
              Total Kas Keluar
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-900 tracking-tight">
            {fmtRp(totalKeluar)}
          </div>
          <div className="text-xs text-rose-700 font-semibold mt-1">
            {kasList.filter(k => k.jenis === 'KELUAR').length} Pengeluaran Operasional Lembaga
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <DollarSign size={16} className="text-blue-600" />
              Saldo Kas Tersedia
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${saldoKas >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}></span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${saldoKas >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
            {fmtRp(saldoKas)}
          </div>
          <div className="text-xs text-blue-700 font-semibold mt-1">
            Saldo Kas = Uang Masuk − Uang Keluar
          </div>
        </div>
      </div>

      {/* Control Bar: Filter, Search, Action Buttons */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi, uraian, petugas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Filter Jenis */}
          <select
            value={filterJenis}
            onChange={e => setFilterJenis(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none"
          >
            <option value="SEMUA">Semua Jenis Kas</option>
            <option value="MASUK">Hanya Kas Masuk</option>
            <option value="KELUAR">Hanya Kas Keluar</option>
          </select>

          {/* Filter Kategori */}
          <select
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none"
          >
            <option value="SEMUA">Semua Kategori</option>
            {[...kategoriMasuk, ...kategoriKeluar].filter((v, i, a) => a.indexOf(v) === i).map((k, idx) => (
              <option key={idx} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95"
            title="Ekspor ke Excel"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95"
            title="Cetak Buku Kas"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={() => handleOpenModal('MASUK')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Plus size={15} />
            <span>Kas Masuk</span>
          </button>
          <button
            onClick={() => handleOpenModal('KELUAR')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Plus size={15} />
            <span>Kas Keluar</span>
          </button>
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Daftar Transaksi Buku Kas Umum
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pencatatan kas masuk & kas keluar operasional sekolah (terhubung dengan Sheet: KAS)
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredKas.length} Transaksi
          </span>
        </div>

        {filteredKas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <p className="text-xs font-bold text-slate-600">Belum ada transaksi buku kas.</p>
            <p className="text-[11px] text-slate-400">Klik tombol "Kas Masuk" atau "Kas Keluar" di atas untuk mencatat transaksi operasional.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200/80">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5 w-28">Tanggal</th>
                  <th className="p-3.5 w-32">No. Bukti</th>
                  <th className="p-3.5 w-40">Kategori</th>
                  <th className="p-3.5">Uraian / Keterangan</th>
                  <th className="p-3.5 w-32">Petugas</th>
                  <th className="p-3.5 w-32 text-right">Kas Masuk</th>
                  <th className="p-3.5 w-32 text-right">Kas Keluar</th>
                  <th className="p-3.5 w-32 text-right">Saldo Kas</th>
                  <th className="p-3.5 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKas.map((row, idx) => (
                  <tr key={row.id ? `${row.id}_${idx}` : `kas_${idx}`} className="hover:bg-slate-50/70 transition font-medium">
                    <td className="p-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3.5 text-slate-700 whitespace-nowrap font-mono">{row.tanggal}</td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{row.referensi || '-'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {row.kategori}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{row.keterangan}</td>
                    <td className="p-3.5 text-slate-600 text-[11px]">{row.petugas}</td>
                    <td className="p-3.5 text-right font-black font-mono text-emerald-700">
                      {row.jenis === 'MASUK' ? fmtRp(row.nominal) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-black font-mono text-rose-700">
                      {row.jenis === 'KELUAR' ? fmtRp(row.nominal) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-black font-mono text-slate-900">
                      {fmtRp(row.saldo ?? 0)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDelete(row.id, row.keterangan)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition inline-flex items-center justify-center"
                        title="Hapus transaksi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Catat Kas Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  formData.jenis === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {formData.jenis === 'MASUK' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Catat {formData.jenis === 'MASUK' ? 'Kas Masuk (Pemasukan)' : 'Kas Keluar (Pengeluaran)'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Buku Kas Operasional Rombel KTCT</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Jenis Toggle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis: 'MASUK', kategori: kategoriMasuk[0] })}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition ${
                      formData.jenis === 'MASUK'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft size={16} />
                    <span>Kas Masuk (Penerimaan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis: 'KELUAR', kategori: kategoriKeluar[0] })}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition ${
                      formData.jenis === 'KELUAR'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight size={16} />
                    <span>Kas Keluar (Pengeluaran)</span>
                  </button>
                </div>
              </div>

              {/* KasID Otomatis Preview */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <Receipt size={14} className={formData.jenis === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'} />
                  <span>KasID Otomatis:</span>
                </div>
                <div className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-lg border shadow-2xs ${
                  formData.jenis === 'MASUK' 
                    ? 'text-emerald-700 bg-white border-emerald-100' 
                    : 'text-rose-700 bg-white border-rose-100'
                }`}>
                  {previewKasId}
                </div>
              </div>

              {/* Tanggal & Referensi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Bukti / Kwitansi</label>
                  <input
                    type="text"
                    value={formData.referensi}
                    onChange={e => setFormData({ ...formData, referensi: e.target.value })}
                    placeholder="Contoh: KWT-001 / NOTA-12"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Transaksi</label>
                <select
                  value={formData.kategori}
                  onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {(formData.jenis === 'MASUK' ? kategoriMasuk : kategoriKeluar).map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={formData.nominal}
                    onChange={e => setFormData({ ...formData, nominal: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                {Number(formData.nominal) > 0 && (
                  <p className="text-[11px] font-bold text-emerald-600 mt-1 font-mono">
                    {fmtRp(Number(formData.nominal))}
                  </p>
                )}
              </div>

              {/* Uraian Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Uraian / Keterangan Transaksi</label>
                <textarea
                  rows={2}
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Contoh: Belanja kertas HVS, spidol boardmarker, tinta printer..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Petugas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Petugas Penanggung Jawab</label>
                <input
                  type="text"
                  value={formData.petugas}
                  onChange={e => setFormData({ ...formData, petugas: e.target.value })}
                  placeholder="Nama Bendahara / Petugas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black text-white rounded-xl shadow-xs transition active:scale-95 ${
                    formData.jenis === 'MASUK' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
