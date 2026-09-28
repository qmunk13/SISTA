import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, Search, Copy, Check, Table, Layers, ArrowRight, 
  Sparkles, CheckCircle2, ChevronRight, Download, Filter, Eye, RefreshCw,
  CloudUpload, UploadCloud, CheckCircle, ExternalLink, Edit3, Link2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { MASTER_TABLES_60, TableSchema } from '../data/masterDatabase60';
import { useStore } from '../store';
import { fetchFromGAS } from '../lib/api';
import { getAllAppDataForSync } from '../data/syncAllData';
import { downloadMenuStructureExcel } from '../data/menuDataStructureExport';
import { DEFAULT_APP_CONFIG } from '../data/config';

export default function MasterDatabaseViewer() {
  const { settings, students, teachers } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTable, setSelectedTable] = useState<TableSchema>(
    () => MASTER_TABLES_60.find(t => t.name === 'SISWA') || MASTER_TABLES_60[0]
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [provisionResult, setProvisionResult] = useState<string | null>(null);

  const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";

  // Cache mapping sheet name -> sheet GID (ID tab spesifik)
  const [sheetGids, setSheetGids] = useState<Record<string, number | string>>(() => {
    try {
      const saved = localStorage.getItem('sista_sheet_gids');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isLoadingGids, setIsLoadingGids] = useState(false);

  // Ambil GID setiap tab sheet langsung dari Google Apps Script
  const fetchSheetGids = async (showFeedback = false) => {
    if (!settings.scriptUrl) {
      if (showFeedback) {
        Swal.fire({
          title: 'URL Script Belum Diisi',
          text: 'Harap isi URL Google Apps Script di tab Pengaturan > Integrasi & Sync GAS terlebih dahulu.',
          icon: 'warning',
          confirmButtonColor: '#4f46e5'
        });
      }
      return;
    }
    setIsLoadingGids(true);
    try {
      let gidsResult: Record<string, string | number> | null = null;

      // Percobaan 1: Mengambil langsung dari backend server (/api/sheet-gids) yang mengekstrak GID instan dari Spreadsheet HTML
      try {
        const resp = await fetch(`/api/sheet-gids?spreadsheetId=${encodeURIComponent(spreadsheetId)}&scriptUrl=${encodeURIComponent(settings.scriptUrl || '')}`);
        if (resp.ok) {
          const apiData = await resp.json();
          if (apiData && apiData.gids && typeof apiData.gids === 'object' && Object.keys(apiData.gids).length > 0) {
            gidsResult = apiData.gids;
          }
        }
      } catch (directErr) {
        console.warn("[GID Sync] Backend /api/sheet-gids attempt:", directErr);
      }

      // Percobaan 2: Jika backend belum dapat, coba langsung ke Google Apps Script (POST)
      if (!gidsResult && settings.scriptUrl) {
        try {
          const res = await fetchFromGAS(settings.scriptUrl, { 
            action: 'GET_SHEET_GIDS',
            spreadsheetId 
          });
          if (res && res.gids && typeof res.gids === 'object' && Object.keys(res.gids).length > 0) {
            gidsResult = res.gids;
          }
        } catch (postErr) {
          console.warn("[GID Sync] GAS POST attempt:", postErr);
        }
      }

      if (gidsResult && Object.keys(gidsResult).length > 0) {
        setSheetGids(gidsResult);
        localStorage.setItem('sista_sheet_gids', JSON.stringify(gidsResult));
        if (showFeedback) {
          Swal.fire({
            title: 'Sinkronisasi GID Berhasil!',
            text: `Berhasil mendapatkan ${Object.keys(gidsResult).length} ID Tab (GID) langsung dari Google Spreadsheet Anda. Setiap tombol "Buka Sheet" kini akan otomatis melompat ke tab yang sesuai!`,
            icon: 'success',
            confirmButtonColor: '#10b981'
          });
        }
      } else {
        throw new Error('Tidak ada data GID yang dikembalikan. Pastikan Spreadsheet ID valid dan dapat diakses.');
      }
    } catch (e: any) {
      console.warn("Could not fetch sheet GIDs:", e);
      if (showFeedback) {
        Swal.fire({
          title: 'Gagal Mengambil GID Tab',
          html: `Terjadi kendala saat meminta ID tab dari Google Spreadsheet:<br/><span class="text-xs text-rose-600 font-mono">${e.message || e}</span><br/><br/><p class="text-xs text-slate-600">Anda juga dapat mengklik tombol <b>Set GID</b> manual pada sheet yang diinginkan untuk memasukkan angka <code>#gid=</code> secara langsung.</p>`,
          icon: 'error',
          confirmButtonColor: '#4f46e5'
        });
      }
    } finally {
      setIsLoadingGids(false);
    }
  };

  useEffect(() => {
    if (settings.scriptUrl && Object.keys(sheetGids).length === 0) {
      fetchSheetGids(false);
    }
  }, [settings.scriptUrl]);

  // Set nomor GID secara manual untuk sheet tertentu
  const handleSetManualGid = (tableName: string) => {
    const currentGid = sheetGids[tableName] !== undefined ? String(sheetGids[tableName]) : '';
    Swal.fire({
      title: `Set GID Tab '${tableName}'`,
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mb-3">
          <p>Buka sheet <b>'${tableName}'</b> di Google Spreadsheet Anda pada browser.</p>
          <p>Lihat URL di address bar, lalu salin angka setelah <code>#gid=</code> (contoh: <code>184920491</code> atau <code>0</code>).</p>
        </div>
      `,
      input: 'text',
      inputValue: currentGid,
      inputPlaceholder: 'Contoh: 0 atau 184920491',
      showCancelButton: true,
      confirmButtonText: 'Simpan GID',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      inputValidator: (val) => {
        if (!val || val.trim() === '') {
          return 'Nomor GID tidak boleh kosong!';
        }
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const cleanedGid = res.value.trim().replace(/^#?gid=/i, '');
        const updated = { ...sheetGids, [tableName]: cleanedGid };
        setSheetGids(updated);
        localStorage.setItem('sista_sheet_gids', JSON.stringify(updated));
        Swal.fire({
          title: 'Tersimpan!',
          text: `ID Tab '${tableName}' berhasil disetel ke #gid=${cleanedGid}. Tombol "Buka Sheet" sekarang akan langsung melompat ke tab tersebut!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  };

  // URL langsung ke tab sheet bersangkutan
  const getSpreadsheetSheetUrl = (tableName: string) => {
    const gid = sheetGids[tableName];
    if (gid !== undefined && gid !== null && gid !== '') {
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;
    }
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  };

  // Aksi saat tombol "Buka Sheet di Google Spreadsheet" diklik
  const handleOpenSheetTab = (tableName: string) => {
    const gid = sheetGids[tableName];
    if (gid !== undefined && gid !== null && gid !== '') {
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`, '_blank');
      return;
    }

    // Jika GID belum tersedia di memori aplikasi
    Swal.fire({
      title: `Tab '${tableName}' Belum Tersinkron`,
      html: `
        <div class="text-left text-xs text-slate-600 space-y-3">
          <p>
            Google Spreadsheet <b>hanya dapat melompat ke tab spesifik melalui nomor ID Tab (#gid=...)</b>, bukan menggunakan nama sheet.
          </p>
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <b>Status:</b> Nomor GID untuk tab <code>${tableName}</code> belum tersimpan di memori browser.
          </div>
          <p class="font-bold text-slate-700">Pilihan Solusi:</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><b>Sinkron Otomatis:</b> Klik <i>"Tarik GID dari GAS"</i> (akan otomatis mengambil seluruh ID tab dari Web App Google Apps Script).</li>
            <li><b>Input Manual:</b> Buka spreadsheet, lihat angka setelah <code>#gid=</code> di tab ${tableName}, lalu masukkan di sini.</li>
            <li><b>Buka Biasa:</b> Tetap buka Google Spreadsheet (akan membuka halaman utama spreadsheet).</li>
          </ul>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '🔄 Tarik GID dari GAS',
      denyButtonText: '✏️ Input GID Manual',
      cancelButtonText: '🚀 Buka Spreadsheet Saja',
      confirmButtonColor: '#4f46e5',
      denyButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        fetchSheetGids(true);
      } else if (result.isDenied) {
        handleSetManualGid(tableName);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
      }
    });
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(MASTER_TABLES_60.map(t => t.category));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return MASTER_TABLES_60.filter(table => {
      const matchCat = selectedCategory === 'ALL' || table.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;
      const matchName = table.name.toLowerCase().includes(q);
      const matchDesc = table.description.toLowerCase().includes(q);
      const matchHeaders = table.headers.some(h => h.toLowerCase().includes(q));
      return matchCat && (matchName || matchDesc || matchHeaders);
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyHeaders = (table: TableSchema) => {
    navigator.clipboard.writeText(table.headers.join('\t'));
    setCopiedKey(table.name);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyJson = (table: TableSchema) => {
    navigator.clipboard.writeText(JSON.stringify(table.headers, null, 2));
    setCopiedKey(`${table.name}_json`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalTables = MASTER_TABLES_60.length;

  const handleProvisionAll = async () => {
    if (!settings.scriptUrl) {
      setProvisionResult("⚠️ Harap masukkan URL Google Apps Script di tab 'Integrasi & Sync GAS' terlebih dahulu.");
      return;
    }

    try {
      setIsProvisioning(true);
      setProvisionResult(`⏳ Sedang memproses dan membuat ${totalTables} Sheet di Google Spreadsheet Anda...`);
      const res = await fetchFromGAS(settings.scriptUrl, { action: 'setup' });
      if (res && (res.success || !res.error)) {
        setProvisionResult(`✅ Sukses! ${totalTables} Sheet Master Database berhasil dibuat & diformat di Google Sheets (${res.created || totalTables} sheet baru/diperbarui).`);
      } else {
        throw new Error(res?.error || `Gagal membuat ${totalTables} sheet`);
      }
    } catch (err: any) {
      setProvisionResult(`❌ Gagal: ${err.message}. Pastikan script sudah di-Deploy ulang.`);
    } finally {
      setIsProvisioning(false);
    }
  };

  // Kirim SEMUA data yang ada di aplikasi (Siswa, GTK, Keuangan, Akademik, CBT, dll) ke Google Spreadsheet
  const handlePushAllDataToSpreadsheet = async () => {
    if (!settings.scriptUrl) {
      setProvisionResult("⚠️ Harap pastikan URL Google Apps Script sudah terisi di tab 'Integrasi & Sync GAS'.");
      return;
    }

    try {
      setIsSyncingAll(true);
      setProvisionResult("⏳ Sedang mengumpulkan seluruh data aplikasi & mengekspor ke semua sheet Google Spreadsheet...");
      
      const allData = getAllAppDataForSync(students, teachers, settings);
      const tableCount = Object.keys(allData).length;

      const res = await fetchFromGAS(settings.scriptUrl, {
        action: 'MASS_SYNC_ALL',
        allData: allData
      });

      if (res && (res.success || !res.error)) {
        setProvisionResult(`✅ SEMUA DATA BERHASIL DI-EXPORT! Seluruh data dari ${tableCount} modul/tabel aplikasi (Siswa, PTK/Guru, Keuangan, Tabungan, Profil, Akademik, CBT, dll) telah masuk & sinkron 100% ke Google Spreadsheet!`);
      } else {
        throw new Error(res?.error || "Gagal sinkronisasi masal");
      }
    } catch (err: any) {
      setProvisionResult(`❌ Gagal Sync Masal: ${err.message}. Pastikan koneksi dan Deployment GAS aktif.`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Ringkasan Master Tabel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles size={14} className="text-indigo-400" />
              Master Database Terintegrasi ({totalTables} Tabel / Sheet)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Struktur Master Database Lengkap ({totalTables} Sheet)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Arsitektur database {totalTables} tabel mencakup modul Sistem, Kesiswaan Dapodik, GTK, Akademik, Presensi QR, Ujian CBT, SPMB, Keuangan &amp; POS Kasir, BK, Perpustakaan, Sarpras, Arsip Dokumen, hingga Suara Komunitas Lembaga.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition shadow-sm"
              title={`Buka Google Spreadsheet (ID: ${spreadsheetId})`}
            >
              <ExternalLink size={16} className="text-emerald-400" />
              <span>BUKA SPREADSHEET UTAMA</span>
            </a>

            <button
              onClick={() => fetchSheetGids(true)}
              disabled={isLoadingGids}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
              title="Tarik semua ID Tab (GID) dari Google Spreadsheet agar tombol 'Buka Sheet' otomatis melompat ke tab spesifik"
            >
              <RefreshCw size={16} className={isLoadingGids ? "animate-spin" : ""} />
              <span>
                {isLoadingGids 
                  ? "Menarik GID..." 
                  : `SINKRONKAN GID TAB (${Object.keys(sheetGids).length}/${totalTables})`}
              </span>
            </button>

            <button
              onClick={downloadMenuStructureExcel}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/30 transition cursor-pointer"
              title="Download file Excel pemetaan struktur menu dan sheet spreadsheet"
            >
              <Download size={16} />
              <span>DOWNLOAD EXCEL STRUKTUR DATA (.XLSX)</span>
            </button>

            <button
              onClick={handlePushAllDataToSpreadsheet}
              disabled={isSyncingAll || isProvisioning}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Mengirim Semua Data...
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  MASUKKAN SEMUA KE SPREADSHEET
                </>
              )}
            </button>

            <button
              onClick={handleProvisionAll}
              disabled={isProvisioning || isSyncingAll}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isProvisioning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Membuat {totalTables} Sheet...
                </>
              ) : (
                <>
                  <Database size={16} />
                  Setup {totalTables} Sheet Otomatis
                </>
              )}
            </button>
          </div>
        </div>

        {provisionResult && (
          <div className={`mt-4 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5 ${
            provisionResult.includes('✅') 
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
              : provisionResult.includes('⚠️')
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
          }`}>
            <span className="leading-relaxed">{provisionResult}</span>
          </div>
        )}
      </div>

      {/* Grid Filter & Pencarian */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari tabel (contoh: SISWA, BIAYA, ABSENSI, NIK)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 flex-shrink-0">
              <Filter size={14} /> Kategori:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? `Semua Kategori (${totalTables} Tabel)` : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                  isSel 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? `Semua (${totalTables})` : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: Master Table List (Left) & Inspector Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: List Tabel */}
        <div className="lg:col-span-5 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Tabel ({filteredTables.length} dari {totalTables})
            </span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Pilih untuk melihat detail kolom
            </span>
          </div>

          <div className="space-y-1.5">
            {filteredTables.map((tbl) => {
              const isSelected = selectedTable.id === tbl.id;
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedTable(tbl)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between gap-3 border ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs text-indigo-950'
                      : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tbl.id}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm tracking-tight truncate">
                          {tbl.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 text-slate-600 font-bold">
                          {tbl.headers.length} kol
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {tbl.category}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                </button>
              );
            })}

            {filteredTables.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada tabel yang cocok dengan kata kunci "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Detail Inspector Kolom Tabel Terpilih */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          {/* Header Tabel Terpilih */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {selectedTable.id}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {selectedTable.name}
                </h3>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-xl">
                  {selectedTable.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1.5">
                {selectedTable.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenSheetTab(selectedTable.name)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                title={`Buka Tab Sheet '${selectedTable.name}' Langsung di Google Spreadsheet`}
              >
                <ExternalLink size={14} />
                <span>Buka Sheet di Google Spreadsheet</span>
              </button>

              <button
                onClick={() => handleSetManualGid(selectedTable.name)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Input atau ubah nomor GID tab ini secara manual"
              >
                <Edit3 size={13} className="text-indigo-600" />
                <span>{sheetGids[selectedTable.name] !== undefined ? `#gid=${sheetGids[selectedTable.name]}` : 'Set GID'}</span>
              </button>

              <button
                onClick={() => handleCopyHeaders(selectedTable)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Salin Baris Header (Tab-Separated)"
              >
                {copiedKey === selectedTable.name ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedKey === selectedTable.name ? 'Tersalin!' : 'Copy Header'}</span>
              </button>

              <button
                onClick={() => handleCopyJson(selectedTable)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Salin Format JSON Array"
              >
                {copiedKey === `${selectedTable.name}_json` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Info Singkat */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Kolom</span>
              <span className="text-base font-black text-slate-800">{selectedTable.headers.length} Kolom Header</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kunci Utama (Primary Key)</span>
              <span className="text-base font-black text-indigo-600">{selectedTable.primaryKey}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sheet Target</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-emerald-600 font-mono">'{selectedTable.name}'</span>
                  {sheetGids[selectedTable.name] !== undefined ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-mono" title="ID Tab Terhubung">
                      #{sheetGids[selectedTable.name]}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleSetManualGid(selectedTable.name)}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded cursor-pointer transition"
                      title="Klik untuk memasukkan nomor GID tab ini"
                    >
                      + GID
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleOpenSheetTab(selectedTable.name)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg transition cursor-pointer"
                title="Buka tab ini di Google Spreadsheet"
              >
                <span>Buka</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Grid Chip Daftar Kolom */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Table size={14} className="text-indigo-600" />
                Urutan Kolom Spreadsheet (A, B, C, ...)
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                Klik kolom untuk menyalin namanya
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto p-1">
              {selectedTable.headers.map((hdr, idx) => {
                const isPk = hdr === selectedTable.primaryKey;
                const isCopied = copiedKey === `hdr_${hdr}`;
                return (
                  <button
                    key={hdr}
                    onClick={() => {
                      navigator.clipboard.writeText(hdr);
                      setCopiedKey(`hdr_${hdr}`);
                      setTimeout(() => setCopiedKey(null), 1500);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition flex items-center justify-between group active:scale-95 ${
                      isPk 
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold'
                        : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/40 hover:border-indigo-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 w-5">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-bold truncate">
                        {hdr}
                      </span>
                    </div>
                    {isPk && (
                      <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-md flex-shrink-0">
                        PK
                      </span>
                    )}
                    {isCopied && (
                      <span className="text-[10px] text-emerald-600 font-bold flex-shrink-0">
                        Copied!
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
