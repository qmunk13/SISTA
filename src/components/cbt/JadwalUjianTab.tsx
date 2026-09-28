import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Plus, Search, X, Eye, Edit, Trash2, 
  Save, AlertTriangle, Clock, Users, Play, CheckCircle2, 
  Shuffle, FileQuestion, BookOpen, Key, Copy, Check, Sparkles, Layers,
  CloudUpload, CloudDownload, RefreshCw, LayoutGrid, List, ChevronLeft, ChevronRight, Filter,
  FileSpreadsheet, Download, Upload, Image as ImageIcon, Database, ExternalLink,
  CalendarDays, ArrowRightLeft
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getAllClasses, matchClass, formatClassLabel, matchStatusActive, STANDARD_CLASSES, formatClockTime } from '../../lib/utils';
import { buildLockedExamToken } from '../../utils/cbtTokenHelper';
import { syncStsToAllSystems, deduplicateUjianSessions } from '../../utils/cbtScheduleSync';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import { pullSpecificSheetFromGas } from '../../utils/gasSync';
import { pullCbtDataFromGoogleSheets, syncAndLinkAllSessionsAndBankSoal } from '../../utils/cbtGoogleSheetService';
import { JENIS_UJIAN_LIST, getJenisUjianBadge } from '../../utils/cbtExamTypes';
import { 
  linkBankSoalToSession,
  saveCustomQuestionsForSession
} from '../../utils/soalScheduleIntegration';
import { 
  parseBulkQuestions, 
  parseExcelQuestions, 
  exportExcelTemplateSoal,
  type SoalPilihanGanda 
} from '../../data/soalGenerator';
import Swal from 'sweetalert2';

export function formatIndonesianDateDisplay(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const parts = String(isoDateStr).trim().split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${monthNames[monthIdx]} ${year}`;
      }
    }
    const d = new Date(isoDateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch {}
  return String(isoDateStr);
}

export function calculateDurationMinutes(start?: string, end?: string): string {
  try {
    const [h1, m1] = (start || '19:30').split(':').map(Number);
    const [h2, m2] = (end || '22:00').split(':').map(Number);
    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMinutes > 0) {
      return `${totalMinutes} Menit`;
    }
  } catch {}
  return '90 Menit';
}

interface JadwalUjianTabProps {
  ujianList: any[];
  setUjianList: React.Dispatch<React.SetStateAction<any[]>>;
  onSaveDb: (list: any[]) => void;
  initialDraft?: any;
  onNavigateTab?: (tabId: string, context?: any) => void;
}

export default function JadwalUjianTab({ 
  ujianList, 
  setUjianList, 
  onSaveDb,
  initialDraft,
  onNavigateTab
}: JadwalUjianTabProps) {
  const { teachers, students, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterKoneksiSoal, setFilterKoneksiSoal] = useState(''); // '', 'terhubung', 'belum_terhubung', 'ada_soal', 'belum_ada_soal'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isPushingSheet, setIsPushingSheet] = useState(false);
  const [isPullingSheet, setIsPullingSheet] = useState(false);
  const [isGeneratingSoal, setIsGeneratingSoal] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [batchRescheduleOpen, setBatchRescheduleOpen] = useState(false);
  const [batchSourceDate, setBatchSourceDate] = useState('');
  const [batchTargetDate, setBatchTargetDate] = useState('');
  const [batchTargetKelas, setBatchTargetKelas] = useState('');
  const [batchNewJamMulai, setBatchNewJamMulai] = useState('');
  const [batchNewJamSelesai, setBatchNewJamSelesai] = useState('');
  const [viewDetailModal, setViewDetailModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [attachSoalModal, setAttachSoalModal] = useState<any | null>(null);
  const [selectedBankIdToLink, setSelectedBankIdToLink] = useState<string>('');
  
  // State for direct question input from schedule
  const [inputSoalMode, setInputSoalMode] = useState<'manual' | 'excel' | 'bulk' | 'existing'>('excel');
  const [showExistingBankSelector, setShowExistingBankSelector] = useState(false);
  const [excelParsedQuestions, setExcelParsedQuestions] = useState<SoalPilihanGanda[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isReadingExcel, setIsReadingExcel] = useState(false);
  const excelFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [manualQuestionForm, setManualQuestionForm] = useState<{
    pertanyaan: string;
    opsiA: string;
    opsiB: string;
    opsiC: string;
    opsiD: string;
    opsiE: string;
    kunci: string;
    pembahasan: string;
    gambar: string;
    editingIndex: number | null;
  }>({
    pertanyaan: '',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    opsiE: '',
    kunci: 'a',
    pembahasan: '',
    gambar: '',
    editingIndex: null
  });
  const [bulkPasteText, setBulkPasteText] = useState('');

  const activeStudents = useMemo(() => (students || []).filter(s => matchStatusActive(s?.status)), [students]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(activeStudents), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);

  // Read available Mapel directly from sheet MAPEL
  const availableMapel = useMemo(() => {
    const rawMapel = db.get('mapel') || db.get('MAPEL') || db.get('master_mapel') || [];
    const list: string[] = [];
    if (Array.isArray(rawMapel)) {
      rawMapel.forEach((m: any) => {
        const name = String(m.nama || m.Nama || m.namaMapel || m.NamaMapel || m.mapel || m.Mapel || m.Nama_Mapel || '').trim();
        if (name && !list.includes(name)) list.push(name);
      });
    }
    // Standard default fallback if DB empty (Sesuai Sheet MAPEL Resmi)
    const defaults = [
      'Ujian Praktek',
      'Ujian Vokasi',
      'Pendidikan Agama dan Budi Pekerti',
      'Pendidikan Pancasila / Kewarganegaraan',
      'Bahasa Indonesia',
      'Matematika',
      'Ilmu Pengetahuan Alam',
      'Ilmu Pengetahuan Sosial',
      'Pendidikan Jasmani Olahraga dan Kesehatan',
      'Seni Budaya',
      'Bahasa Inggris',
      'Pendidikan Lingkungan dan Budaya Jakarta',
      'Baca Tulis',
      'Teknologi Informasi dan Komunikasi',
      'Prakarya',
      'Pemberdayaan',
      'Sejarah',
      'Sejarah Indonesia',
      'Geografi',
      'Ekonomi',
      'Sosiologi'
    ];
    defaults.forEach(d => {
      if (!list.includes(d)) list.push(d);
    });
    return list.sort((a, b) => a.localeCompare(b, 'id'));
  }, []);

  // Bank Soal Packages for easy attachment
  const bankSoalPackages = useMemo(() => {
    const raw = db.get('cbt_bank_soal') || db.get('cbt_questions') || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      id: p.id || p.BankSoalID,
      mapel: p.mapel || p.Mapel || 'Mata Pelajaran',
      kelas: String(p.kelas || p.Kelas || ''),
      jumlahSoal: p.soalList?.length || p.jumlahSoal || p.JumlahSoal || 0,
      soalDesc: p.soalList?.length ? `${p.soalList.length} Butir Soal` : (p.tipeSoal || 'Paket Soal')
    }));
  }, []);

  // Generate token otomatis yang terkunci per Kelas & Mapel (Format: [KELAS]-[KODEMAPEL]-[KODEUNIK])
  const generateTokenCode = (kelas?: string, mapel?: string) => {
    return buildLockedExamToken(kelas || formState?.kelas || '1A', mapel || formState?.mapel || 'Pendidikan Pancasila');
  };

  // Form State for new session
  const [formState, setFormState] = useState({
    id: `SES-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    mapel: 'Pendidikan Pancasila',
    kelas: '1A',
    jenis: 'Sumatif Harian',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    token: buildLockedExamToken('1A', 'Pendidikan Pancasila'),
    tgl: new Date().toISOString().slice(0, 10),
    jamMulai: '07:30',
    jamSelesai: '09:00',
    durasi: '90 Menit',
    peserta: 28,
    proktor: teachers[0]?.name || 'Guru Pengampu / Proktor',
    acakSoal: true,
    acakOpsi: true,
    tampilkanNilai: true,
    status: 'Terjadwal',
    soal: '35 Soal (30 PG, 5 Esai)',
    bankSoalId: '',
    avg: 0
  });

  // Handle incoming draft from Bank Soal AI Multi-PDF modal
  useEffect(() => {
    if (initialDraft) {
      const targetMapel = initialDraft.mapel || formState.mapel;
      const targetKelas = initialDraft.kelas || formState.kelas;
      setFormState(prev => ({
        ...prev,
        mapel: targetMapel,
        kelas: targetKelas,
        bankSoalId: initialDraft.id || '',
        soal: `${initialDraft.soalList?.length || initialDraft.jumlahSoal || 20} Soal (${initialDraft.tipeSoal || 'Pilihan Ganda'})`,
        token: buildLockedExamToken(targetKelas, targetMapel)
      }));
      setCreateModalOpen(true);
    }
  }, [initialDraft]);

  // Helper pemeriksaan keterhubungan soal & bank soal
  const isExamLinked = (u: any) => Boolean(u.bankSoalId || u.BankSoalID);
  const hasExamQuestions = (u: any) => {
    if (u.bankSoalId || u.BankSoalID) return true;
    if (Array.isArray(u.soalList) && u.soalList.length > 0) return true;
    if (typeof u.soal === 'string' && u.soal.trim() && !u.soal.toLowerCase().includes('belum') && !u.soal.toLowerCase().includes('0 soal')) return true;
    if (Number(u.jumlahSoal) > 0) return true;
    return false;
  };

  // Stats status keterhubungan soal
  const connectionStats = useMemo(() => {
    let linked = 0;
    let unlinked = 0;
    let withQuestions = 0;
    let withoutQuestions = 0;

    ujianList.forEach((u: any) => {
      if (isExamLinked(u)) linked++;
      else unlinked++;

      if (hasExamQuestions(u)) withQuestions++;
      else withoutQuestions++;
    });

    return { linked, unlinked, withQuestions, withoutQuestions };
  }, [ujianList]);

  // Dynamic day list strictly from real data (Google Spreadsheet) - Excludes 2026-10-01 permanently
  const availableExamDates = useMemo(() => {
    const map = new Map<string, { dateKey: string; displayLabel: string; count: number }>();

    ujianList.forEach((u: any) => {
      const rawDate = String(u.tgl || u.tanggal || u.Tanggal || '').trim();
      const rawDisplay = String(u.tglDisplay || '').trim();

      // Permanent filter: do not include 01 Okt 2026 dummy
      if (rawDate.includes('10-01') || rawDate.includes('01 Okt') || rawDate.includes('2026-10-01') || rawDisplay.includes('01 Okt')) {
        return;
      }

      if (!rawDate && !rawDisplay) return;

      const dateKey = rawDate || rawDisplay;
      let displayLabel = rawDisplay;

      if (!displayLabel && rawDate) {
        try {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(d.getTime())) {
              displayLabel = d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
            }
          }
        } catch {}
      }

      if (!displayLabel) {
        displayLabel = dateKey;
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          displayLabel,
          count: 0
        });
      }
      map.get(dateKey)!.count += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [ujianList]);

  // Stats per jenjang untuk quick filter tabs
  const jenjangStats = useMemo(() => {
    let paketA = 0;
    let paketB = 0;
    let paketC = 0;

    ujianList.forEach((u: any) => {
      const tgl = String(u.tgl || u.tglDisplay || '');
      if (tgl.includes('10-01') || tgl.includes('01 Okt') || tgl.includes('2026-10-01')) return;

      const k = String(u.kelas || '').toLowerCase();
      if (['4', '5', '6'].some(c => k.includes(c)) || k.includes('paket a')) paketA++;
      else if (['7', '8', '9'].some(c => k.includes(c)) || k.includes('paket b')) paketB++;
      else if (['10', '11', '12'].some(c => k.includes(c)) || k.includes('paket c')) paketC++;
    });

    return { paketA, paketB, paketC };
  }, [ujianList]);

  const filteredList = useMemo(() => {
    return ujianList.filter((u: any) => {
      const q = searchTerm.toLowerCase();
      const mapel = String(u.mapel || '').toLowerCase();
      const kelas = String(u.kelas || '').toLowerCase();
      const jenis = String(u.jenis || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      const token = String(u.token || '').toLowerCase();
      const pengawas = String(u.proktor || u.pengawas || '').toLowerCase();

      const matchesQ = !searchTerm || mapel.includes(q) || kelas.includes(q) || jenis.includes(q) || id.includes(q) || token.includes(q) || pengawas.includes(q);
      const matchesKelas = !filterKelas || matchClass(u.kelas, filterKelas);
      const matchesMapel = !filterMapel || mapel.includes(filterMapel.toLowerCase());
      const matchesJenis = !filterJenis || u.jenis === filterJenis;
      const matchesStatus = !filterStatus || u.status === filterStatus;
      const matchesTanggal = !filterTanggal || String(u.tgl || '').includes(filterTanggal) || String(u.tglDisplay || '').includes(filterTanggal);

      let matchesJenjang = true;
      if (filterJenjang === 'Paket A') {
        matchesJenjang = ['4', '5', '6'].some(k => kelas.includes(k)) || kelas.includes('paket a');
      } else if (filterJenjang === 'Paket B') {
        matchesJenjang = ['7', '8', '9'].some(k => kelas.includes(k)) || kelas.includes('paket b');
      } else if (filterJenjang === 'Paket C') {
        matchesJenjang = ['10', '11', '12'].some(k => kelas.includes(k)) || kelas.includes('paket c');
      }

      let matchesKoneksi = true;
      if (filterKoneksiSoal === 'terhubung') {
        matchesKoneksi = isExamLinked(u);
      } else if (filterKoneksiSoal === 'belum_terhubung') {
        matchesKoneksi = !isExamLinked(u);
      } else if (filterKoneksiSoal === 'ada_soal') {
        matchesKoneksi = hasExamQuestions(u);
      } else if (filterKoneksiSoal === 'belum_ada_soal') {
        matchesKoneksi = !hasExamQuestions(u);
      }

      return matchesQ && matchesKelas && matchesMapel && matchesJenis && matchesStatus && matchesTanggal && matchesJenjang && matchesKoneksi;
    });
  }, [ujianList, searchTerm, filterKelas, filterMapel, filterJenis, filterStatus, filterTanggal, filterJenjang, filterKoneksiSoal]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKelas, filterMapel, filterJenis, filterStatus, filterTanggal, filterJenjang, filterKoneksiSoal, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    if (itemsPerPage >= 999) return filteredList;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleCopyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Sinkronkan Jadwal CBT Langsung dari Google Spreadsheet
  const handleLoadJadwalSts = async () => {
    setIsPullingSheet(true);
    try {
      const res = await pullCbtDataFromGoogleSheets();
      if (res.success && res.ujian && res.ujian.length > 0) {
        setUjianList(res.ujian);
        onSaveDb(res.ujian);

        await Swal.fire({
          title: 'Jadwal Berhasil Disinkronkan!',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-600">
              <p>✅ Berhasil menarik <b>${res.ujian.length} sesi ujian</b> langsung dari Sheet <code>UJIAN</code>.</p>
              <p>✅ <b>Token Pengawas & Peserta</b> tersinkron dari Sheet <code>TOKEN</code>.</p>
              <p>✅ <b>Jadwal Pelaksanaan</b> tersinkron ke <b>Portal Siswa</b> (Sheet <code>JADWAL</code>).</p>
              <p class="text-emerald-700 font-semibold mt-2">Data CBT 100% bersumber dari Google Spreadsheet.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#0891b2'
        });
      } else {
        // Jika sheet kosong, beri tahu pengguna
        await Swal.fire({
          title: 'Sheet UJIAN Masih Kosong',
          text: 'Sheet UJIAN di Google Spreadsheet belum memiliki data sesi ujian. Anda dapat membuat sesi baru atau mengirim jadwal ke Spreadsheet terlebih dahulu.',
          icon: 'info',
          confirmButtonColor: '#0891b2'
        });
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      Swal.fire({
        title: 'Gagal Sinkronisasi',
        text: err?.message || 'Terjadi kesalahan saat sinkronisasi dengan Google Spreadsheet.',
        icon: 'error',
        confirmButtonColor: '#0891b2'
      });
    } finally {
      setIsPullingSheet(false);
    }
  };

  // Tautkan Otomatis 100% Seluruh Sesi Ujian ke Paket Bank Soal Masing-Masing
  const handleAutoLinkAllPackages = async () => {
    try {
      const res = syncAndLinkAllSessionsAndBankSoal();
      setUjianList(res.ujian);
      onSaveDb(res.ujian);

      // Auto push to Google Spreadsheet agar Sheet UJIAN & BANK_SOAL tersinkron permanen
      autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'BANK_SOAL', 'TOKEN']).catch(() => {});

      await Swal.fire({
        title: 'Semua Sesi Ujian Berhasil Terhubung!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700">
            <p>✅ <b>${res.linkedCount} Sesi Ujian</b> telah otomatis dipasangkan 1-ke-1 dengan <b>Paket Bank Soal Kurikulum</b>.</p>
            <p>✅ Setiap sesi memiliki butir soal lengkap, opsi acak, kunci jawaban, dan token resmi.</p>
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] mt-2">
              🌐 <b>Tersimpan ke Google Sheets:</b> Sheet <code>UJIAN</code> dan <code>BANK_SOAL</code> langsung diperbarui.
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#0891b2'
      });
    } catch (e: any) {
      console.error('Auto link error:', e);
      Swal.fire({
        title: 'Kendala Penautan Soal',
        text: e?.message || 'Gagal menautkan paket soal ke sesi.',
        icon: 'error',
        confirmButtonColor: '#0891b2'
      });
    }
  };

  // Kirim & Sinkronkan Langsung ke Google Sheets
  const handlePushToGoogleSheets = async () => {
    setIsPushingSheet(true);
    try {
      const { fullUjian } = syncStsToAllSystems(ujianList);
      setUjianList(fullUjian);
      onSaveDb(fullUjian);

      const targetSsId = settings?.spreadsheetId || '1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4';
      const ssUrl = `https://docs.google.com/spreadsheets/d/${targetSsId}/edit`;

      const syncResult = await autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN', 'TOKEN', 'CBT_TOKEN', 'BANK_SOAL', 'SOAL'], { forceTruncate: true });

      if (!syncResult.success) {
        Swal.fire({
          title: 'Gagal Menyinkronkan ke Spreadsheet',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p class="text-rose-600 font-semibold">⚠️ Kendala: ${syncResult.message}</p>
              <p><b>Target Spreadsheet ID:</b> <code class="bg-slate-100 px-1 py-0.5 rounded font-mono">${targetSsId}</code></p>
              <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-800 space-y-1.5">
                <p class="font-bold">Langkah Perbaikan di Google Apps Script:</p>
                <ol class="list-decimal pl-4 space-y-1">
                  <li>Buka menu <b>Export GAS</b>, salin kode <code>Code.gs</code> versi terbaru.</li>
                  <li>Di editor Apps Script, pilih fungsi <code>otorisasiDrive</code> lalu klik <b>Jalankan (Run ▶)</b> untuk memberikan izin Google Drive & Spreadsheet.</li>
                  <li>Klik <b>Deploy &rarr; Kelola deployment &rarr; Edit (ikon pensil) &rarr; Versi Baru</b>, dan pastikan Akses disetel ke <b>"Siapa saja" (Anyone)</b>.</li>
                  <li>Pastikan Spreadsheet yang Anda buka memiliki ID yang sama dengan ID di atas.</li>
                </ol>
              </div>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Mengerti',
          confirmButtonColor: '#0891b2'
        });
        return;
      }

      Swal.fire({
        title: 'Tersinkron ke Google Spreadsheet (Sheet UJIAN & TOKEN)!',
        html: `
          <div class="text-left text-xs space-y-2.5 text-slate-600">
            <p>✅ <b>Sesi Ujian CBT</b> berhasil dikirim ke <b>Sheet <code>UJIAN</code></b> (serta alias <code>CBT_UJIAN</code> & <code>JADWAL_UJIAN</code>).</p>
            <p>✅ <b>Token Ujian Resmi</b> berhasil dikirim ke <b>Sheet <code>TOKEN</code></b> & <code>CBT_TOKEN</code>.</p>
            <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-xs space-y-1">
              <p class="font-bold">📌 Informasi Penempatan Spreadsheet:</p>
              <p>• <b>Sheet <code>UJIAN</code>:</b> Tempat master jadwal sesi ujian CBT (UjianID, Mapel, Kelas, Tanggal, Jam, Token, Status).</p>
              <p>• <b>Sheet <code>TOKEN</code>:</b> Daftar token pengawas & durasi ujian.</p>
              <p>• <b>Sheet <code>JADWAL</code>:</b> Khusus Jadwal Pelajaran Mingguan KBM Akademik.</p>
            </div>
            <div class="bg-sky-50 border border-sky-200 p-2.5 rounded-xl text-sky-900 text-xs space-y-1">
              <p><b>Target Spreadsheet:</b> <code class="font-mono text-[11px]">${targetSsId}</code></p>
              <a href="${ssUrl}" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-sky-700 underline font-bold hover:text-sky-900 mt-1">
                🔗 Buka Google Spreadsheet Target di Tab Baru &rarr;
              </a>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Selesai',
        confirmButtonColor: '#0891b2'
      });
    } catch (err: any) {
      console.error('Error push Google Sheets:', err);
      Swal.fire({
        title: 'Kendala Koneksi Sinkronisasi',
        text: err?.message || 'Data tersimpan di database lokal namun gagal dikirim ke Google Apps Script.',
        icon: 'error',
        confirmButtonColor: '#0891b2'
      });
    } finally {
      setIsPushingSheet(false);
    }
  };

  // Tarik & Sinkronkan Langsung dari Sheet UJIAN
  const handlePullFromGoogleSheets = async (silent: boolean = false) => {
    setIsPullingSheet(true);
    try {
      let res = await pullSpecificSheetFromGas('UJIAN');
      let activeSheetSource = 'UJIAN';
      if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
        const resAlt = await pullSpecificSheetFromGas('CBT_UJIAN');
        if (resAlt.success && Array.isArray(resAlt.data) && resAlt.data.length > 0) {
          res = resAlt;
          activeSheetSource = 'CBT_UJIAN';
        } else {
          const resJadwalUjian = await pullSpecificSheetFromGas('JADWAL_UJIAN');
          if (resJadwalUjian.success && Array.isArray(resJadwalUjian.data) && resJadwalUjian.data.length > 0) {
            res = resJadwalUjian;
            activeSheetSource = 'JADWAL_UJIAN';
          }
        }
      }
      const rawRows = (res.success && Array.isArray(res.data)) ? res.data : [];

      if (rawRows.length === 0) {
        if (!silent) {
          Swal.fire({
            title: 'Sheet UJIAN Masih Kosong',
            html: `
              <div class="text-left text-xs space-y-2 text-slate-600">
                <p>Data jadwal sesi ujian di Google Spreadsheet belum ditemukan pada <b>Sheet <code>UJIAN</code></b>.</p>
                <p>Silakan klik tombol <b>"Kirim ke Sheet UJIAN & TOKEN"</b> terlebih dahulu untuk mengekspor jadwal sesi ujian dari aplikasi ke Spreadsheet Anda.</p>
                <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-[11px] mt-2">
                  <b>Catatan:</b> Sesi ujian CBT disimpan di <b>Sheet <code>UJIAN</code></b>. Sheet <code>JADWAL</code> di Spreadsheet adalah khusus untuk jadwal pelajaran mingguan KBM Akademik.
                </div>
              </div>
            `,
            icon: 'info',
            confirmButtonColor: '#0891b2'
          });
        }
        return;
      }

      // Normalisasi setiap baris dari sheet UJIAN (Hapus permanen jadwal dummy 01 Okt 2026)
      const validRows = rawRows.filter((r: any) => {
        const t = String(r.Tanggal || r.tanggal || r.tgl || r.Tgl || r.tglDisplay || '');
        return !t.includes('10-01') && !t.includes('01 Okt') && !t.includes('2026-10-01');
      });

      const normalizedRows = validRows.map((r: any, idx: number) => {
        const id = String(r.UjianID || r.ujianId || r.id || r.KodeSesi || r.kodeSesi || r.No || `SES-STS-26-${String(idx + 1).padStart(3, '0')}`).trim();
        const mapel = String(r.Mapel || r.mapel || r.namaUjian || r.NamaUjian || r.MataPelajaran || r['Mata Pelajaran'] || 'Mata Pelajaran').trim();
        const kelas = String(r.Kelas || r.kelas || r.Rombel || r.rombel || '4').trim();
        const tgl = String(r.Tanggal || r.tanggal || r.tgl || r.Tgl || r.tglDisplay || '2026-09-28').trim();
        const jamMulai = formatClockTime(r.JamMulai || r.jamMulai || r['Jam Mulai'] || '19:29', '19:29');
        const jamSelesai = formatClockTime(r.JamSelesai || r.jamSelesai || r['Jam Selesai'] || '21:00', '21:00');
        const durasi = String(r.Durasi || r.durasi || (r.durasiMenit ? `${r.durasiMenit} Menit` : '90 Menit')).trim();
        const pengawas = String(r.Pengawas || r.pengawas || r.Proktor || r.proktor || 'Guru Kelas').trim();
        const token = String(r.Token || r.token || r.KodeToken || r['Kode Token'] || '').trim();
        const peserta = r.Peserta !== undefined ? r.Peserta : (r.peserta !== undefined ? r.peserta : ' ');
        const status = (String(r.Status || r.status || 'Terjadwal').trim() as any) || 'Terjadwal';
        const soal = String(r.Soal || r.soal || r.JumlahSoal || r.jumlahSoal || '30 Butir Soal (PG)').trim();
        const jenis = String(r.JenisUjian || r.jenisUjian || r.Jenis || r.jenis || r.Kategori || r.kategori || 'Sumatif Tengah Semester (STS)').trim();
        const semester = String(r.Semester || r.semester || 'Ganjil').trim();
        const tahunAjaran = String(r.TahunAjaran || r.tahunAjaran || '2026/2027').trim();
        const acakSoal = r.AcakSoal === true || String(r.AcakSoal || r.acakSoal || '').toLowerCase() === 'true' || String(r.AcakSoal || r.acakSoal || '').toLowerCase() === 'ya';
        const acakOpsi = r.AcakOpsi === true || String(r.AcakOpsi || r.acakOpsi || '').toLowerCase() === 'true' || String(r.AcakOpsi || r.acakOpsi || '').toLowerCase() === 'ya';
        const tampilkanNilai = r.TampilkanNilai === true || String(r.TampilkanNilai || r.tampilkanNilai || '').toLowerCase() === 'true' || String(r.TampilkanNilai || r.tampilkanNilai || '').toLowerCase() === 'ya';

        return {
          id,
          UjianID: id,
          mapel,
          Mapel: mapel,
          namaUjian: r.NamaUjian || r.namaUjian || mapel,
          kelas,
          Kelas: kelas,
          tgl,
          tanggal: tgl,
          tglDisplay: r.tglDisplay || tgl,
          jamMulai,
          jamSelesai,
          durasi,
          Durasi: durasi,
          pengawas,
          proktor: r.proktor || pengawas,
          token: token || buildLockedExamToken(kelas, mapel, id),
          peserta,
          status,
          soal,
          jumlahSoal: soal,
          jenis,
          Jenis: jenis,
          JenisUjian: jenis,
          jenisUjian: jenis,
          semester,
          tahunAjaran,
          acakSoal,
          acakOpsi,
          tampilkanNilai,
          bankSoalId: r.bankSoalId || r.BankSoalID || undefined
        };
      });

      const deduplicated = deduplicateUjianSessions(normalizedRows);

      // Simpan ke DB & State
      setUjianList(deduplicated);
      onSaveDb(deduplicated);

      // Sinkronkan juga ke Token & Jadwal Rombel
      syncStsToAllSystems(deduplicated);

      if (!silent) {
        await Swal.fire({
          title: `Berhasil Menarik Jadwal dari Sheet ${activeSheetSource}!`,
          html: `
            <div class="text-left text-xs space-y-2 text-slate-600">
              <p>✅ Berhasil menarik dan memperbarui <b>${deduplicated.length} sesi ujian</b> langsung dari Sheet <code>${activeSheetSource}</code> di Google Spreadsheet.</p>
              <p>✅ <b>Token Pengawas & Peserta</b> telah diselaraskan ke Sheet <code>TOKEN</code>.</p>
              <p class="text-slate-500 text-[11px]">💡 <i>Data sesi ujian CBT tersimpan di Sheet <b><code>UJIAN</code></b>.</i></p>
              <p class="text-emerald-700 font-semibold mt-2">Data jadwal kini 100% konsisten dengan Google Spreadsheet Anda.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Selesai',
          confirmButtonColor: '#0891b2'
        });
      }
    } catch (err: any) {
      console.error('Error pulling sheet UJIAN:', err);
      if (!silent) {
        Swal.fire({
          title: 'Gagal Menarik dari Spreadsheet',
          text: err?.message || 'Terjadi kesalahan saat mengambil data dari Sheet UJIAN.',
          icon: 'error',
          confirmButtonColor: '#0891b2'
        });
      }
    } finally {
      setIsPullingSheet(false);
    }
  };

  // Ambil butir soal yang saat ini terhubung ke sesi modal
  const getAttachedQuestions = (modalSession: any): SoalPilihanGanda[] => {
    if (!modalSession) return [];
    const allBank = (db.get('cbt_bank_soal') as any[]) || (db.get('cbt_questions') as any[]) || [];
    const currentBank = allBank.find((b: any) => b.id === modalSession.bankSoalId || b.BankSoalID === modalSession.bankSoalId);
    if (Array.isArray(currentBank?.soalList) && currentBank.soalList.length > 0) {
      return currentBank.soalList;
    }
    const allSoal = (db.get('cbt_exam_questions') as any[]) || (db.get('soal') as any[]) || [];
    const filtered = allSoal.filter((s: any) => 
      (modalSession.bankSoalId && (s.bankSoalId === modalSession.bankSoalId || s.BankSoalID === modalSession.bankSoalId)) ||
      (s.ujianId === modalSession.id || s.UjianID === modalSession.id)
    );
    if (filtered.length > 0) {
      return filtered.map((s: any, idx: number) => {
        const rawGambar = (s.gambar || s.Gambar || s.gambarUrl || s.imageUrl || s.LinkGambar || s['Link Gambar'] || '').trim();
        return {
          id: s.nomorSoal || idx + 1,
          nomorSoal: s.nomorSoal || idx + 1,
          pertanyaan: s.pertanyaan || s.Pertanyaan || '',
          opsi: {
            a: s.opsiA || s.PilihanA || s.opsi?.a || '',
            b: s.opsiB || s.PilihanB || s.opsi?.b || '',
            c: s.opsiC || s.PilihanC || s.opsi?.c || '',
            d: s.opsiD || s.PilihanD || s.opsi?.d || '',
            ...(s.opsiE || s.PilihanE || s.opsi?.e ? { e: s.opsiE || s.PilihanE || s.opsi?.e } : {})
          },
          kunci: String(s.kunci || s.KunciJawaban || 'a').toLowerCase() as any,
          bobot: Number(s.bobot || s.Bobot || 5),
          pembahasan: s.pembahasan || s.PembahasanRasional || '',
          tipe: s.tipe || 'Pilihan Ganda',
          gambar: rawGambar || undefined,
          LinkGambar: rawGambar || undefined
        };
      });
    }
    return [];
  };

  // Simpan Satu Butir Soal Baru / Edit Soal ke Sesi Jadwal Ini
  const handleSaveManualQuestion = (sesi: any) => {
    if (!manualQuestionForm.pertanyaan.trim()) {
      Swal.fire({
        title: 'Teks Soal Kosong',
        text: 'Silakan ketik pertanyaan soal terlebih dahulu.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    if (!manualQuestionForm.opsiA.trim() || !manualQuestionForm.opsiB.trim()) {
      Swal.fire({
        title: 'Pilihan Jawaban Belum Lengkap',
        text: 'Minimal sediakan Pilihan A dan Pilihan B.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const currentQuestions = getAttachedQuestions(sesi);
    let updatedQuestions: SoalPilihanGanda[] = [];

    const imgVal = manualQuestionForm.gambar.trim() || undefined;

    if (manualQuestionForm.editingIndex !== null && manualQuestionForm.editingIndex >= 0) {
      // Mode Edit
      updatedQuestions = currentQuestions.map((q, idx) => {
        if (idx === manualQuestionForm.editingIndex) {
          return {
            ...q,
            pertanyaan: manualQuestionForm.pertanyaan.trim(),
            opsi: {
              a: manualQuestionForm.opsiA.trim(),
              b: manualQuestionForm.opsiB.trim(),
              c: manualQuestionForm.opsiC.trim(),
              d: manualQuestionForm.opsiD.trim(),
              ...(manualQuestionForm.opsiE.trim() ? { e: manualQuestionForm.opsiE.trim() } : {})
            },
            kunci: manualQuestionForm.kunci.toLowerCase() as any,
            pembahasan: manualQuestionForm.pembahasan.trim(),
            gambar: imgVal,
            LinkGambar: imgVal
          };
        }
        return q;
      });
    } else {
      // Mode Tambah Baru
      const newQuestion: SoalPilihanGanda = {
        id: currentQuestions.length + 1,
        nomorSoal: currentQuestions.length + 1,
        pertanyaan: manualQuestionForm.pertanyaan.trim(),
        opsi: {
          a: manualQuestionForm.opsiA.trim(),
          b: manualQuestionForm.opsiB.trim(),
          c: manualQuestionForm.opsiC.trim(),
          d: manualQuestionForm.opsiD.trim(),
          ...(manualQuestionForm.opsiE.trim() ? { e: manualQuestionForm.opsiE.trim() } : {})
        },
        kunci: manualQuestionForm.kunci.toLowerCase() as any,
        bobot: 5,
        pembahasan: manualQuestionForm.pembahasan.trim(),
        tipe: 'Pilihan Ganda',
        gambar: imgVal,
        LinkGambar: imgVal
      };
      updatedQuestions = [...currentQuestions, newQuestion];
    }

    // Renumber
    const renumbered = updatedQuestions.map((q, idx) => ({ ...q, id: idx + 1, nomorSoal: idx + 1 }));
    const res = saveCustomQuestionsForSession(sesi, renumbered);
    
    // Update local state
    const updated = (db.get('ujian_cbt') as any[]) || [];
    setUjianList(updated);
    onSaveDb(updated);

    if (attachSoalModal && attachSoalModal.id === sesi.id) {
      setAttachSoalModal(res.updatedSession);
    }

    // Langsung simpan & kirim ke Google Spreadsheet (Sheet SOAL, BANK_SOAL, UJIAN)
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on save question:', err);
    });

    // Reset Form
    setManualQuestionForm({
      pertanyaan: '',
      opsiA: '',
      opsiB: '',
      opsiC: '',
      opsiD: '',
      opsiE: '',
      kunci: 'a',
      pembahasan: '',
      gambar: '',
      editingIndex: null
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: manualQuestionForm.editingIndex !== null 
        ? 'Perubahan butir soal disimpan & otomatis tersinkron ke Spreadsheet!' 
        : 'Butir soal baru berhasil ditambahkan & otomatis tersinkron ke Spreadsheet!',
      showConfirmButton: false,
      timer: 2500
    });
  };

  // Simpan Banyak Soal Sekaligus (Bulk Paste) ke Sesi Jadwal Ini
  const handleSaveBulkQuestions = (sesi: any) => {
    if (!bulkPasteText.trim()) {
      Swal.fire({
        title: 'Teks Soal Kosong',
        text: 'Silakan tempelkan butiran teks soal terlebih dahulu.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const parsed = parseBulkQuestions(bulkPasteText, 5);
    if (parsed.length === 0) {
      Swal.fire({
        title: 'Format Soal Tidak Terdeteksi',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-600">
            <p>Pastikan format soal memiliki nomor, pilihan opsi, dan kunci jawaban, misalnya:</p>
            <pre class="bg-slate-100 p-2 rounded text-[11px] font-mono">1. Pertanyaan soal di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
Kunci: A</pre>
          </div>
        `,
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const currentQuestions = getAttachedQuestions(sesi);
    const combined = [...currentQuestions, ...parsed];
    const renumbered = combined.map((q, idx) => ({ ...q, id: idx + 1, nomorSoal: idx + 1 }));

    const res = saveCustomQuestionsForSession(sesi, renumbered);
    const updated = (db.get('ujian_cbt') as any[]) || [];
    setUjianList(updated);
    onSaveDb(updated);

    if (attachSoalModal && attachSoalModal.id === sesi.id) {
      setAttachSoalModal(res.updatedSession);
    }

    setBulkPasteText('');

    // Langsung simpan & kirim ke Google Spreadsheet (Sheet SOAL, BANK_SOAL, UJIAN)
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on bulk save questions:', err);
    });

    Swal.fire({
      title: 'Soal Berhasil Ditambahkan & Disinkronkan!',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-700">
          <p>✅ <b>${parsed.length} butir soal</b> berhasil diproses dan disimpan ke jadwal sesi ini.</p>
          <p>Total butir soal dalam jadwal sesi ini sekarang: <b>${renumbered.length} butir</b>.</p>
          <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] mt-1.5">
            🌐 <b>Otomatis Tersimpan di Google Spreadsheet:</b> Sheet <code>SOAL</code>, <code>BANK_SOAL</code>, dan <code>UJIAN</code> langsung diperbarui.
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonColor: '#4f46e5'
    });
  };

  // Unggah File Excel Soal (.xlsx / .xls / .csv) ke Sesi Jadwal Ini
  const handleUploadExcelQuestions = async (e: React.ChangeEvent<HTMLInputElement>, sesi: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseExcelQuestions(arrayBuffer, 5);

      if (parsed.length === 0) {
        Swal.fire({
          title: 'Tidak Ada Soal Terdeteksi',
          text: 'Format file Excel tidak sesuai atau baris soal kosong. Silakan gunakan template Excel resmi yang disediakan.',
          icon: 'warning',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      const currentQuestions = getAttachedQuestions(sesi);
      const combined = [...currentQuestions, ...parsed];
      const renumbered = combined.map((q, idx) => ({ ...q, id: idx + 1, nomorSoal: idx + 1 }));

      const res = saveCustomQuestionsForSession(sesi, renumbered);
      const updated = (db.get('ujian_cbt') as any[]) || [];
      setUjianList(updated);
      onSaveDb(updated);

      if (attachSoalModal && attachSoalModal.id === sesi.id) {
        setAttachSoalModal(res.updatedSession);
      }

      // Langsung simpan & kirim ke Google Spreadsheet (Sheet SOAL, BANK_SOAL, UJIAN)
      autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(err => {
        console.warn('AutoSync push error on excel question upload:', err);
      });

      Swal.fire({
        title: 'File Excel Berhasil Diimpor & Disinkronkan!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700">
            <p>✅ <b>${parsed.length} butir soal</b> dari file <code>${file.name}</code> berhasil diimpor.</p>
            <p>Total butir soal dalam jadwal sesi ini sekarang: <b>${renumbered.length} butir</b>.</p>
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] mt-1.5">
              🌐 <b>Otomatis Tersimpan di Google Spreadsheet:</b> Sheet <code>SOAL</code>, <code>BANK_SOAL</code>, dan <code>UJIAN</code> langsung diperbarui.
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });
    } catch (err: any) {
      console.error('Error reading excel file:', err);
      Swal.fire({
        title: 'Gagal Membaca File Excel',
        text: err?.message || 'Terjadi kesalahan saat memproses file Excel.',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      e.target.value = '';
    }
  };

  // Hapus Satu Butir Soal dari Sesi Jadwal Ini
  const handleDeleteQuestionFromSession = async (sesi: any, qIndex: number) => {
    const resConfirm = await Swal.fire({
      title: `Hapus Butir Soal Nomor ${qIndex + 1}?`,
      text: 'Soal ini akan dihapus dari jadwal sesi ujian.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (!resConfirm.isConfirmed) return;

    const currentQuestions = getAttachedQuestions(sesi);
    const filtered = currentQuestions.filter((_, idx) => idx !== qIndex);
    const renumbered = filtered.map((q, idx) => ({ ...q, id: idx + 1, nomorSoal: idx + 1 }));

    const res = saveCustomQuestionsForSession(sesi, renumbered);
    const updated = (db.get('ujian_cbt') as any[]) || [];
    setUjianList(updated);
    onSaveDb(updated);

    if (attachSoalModal && attachSoalModal.id === sesi.id) {
      setAttachSoalModal(res.updatedSession);
    }

    // Jika sedang mengedit soal yang dihapus, reset form
    if (manualQuestionForm.editingIndex === qIndex) {
      setManualQuestionForm({
        pertanyaan: '',
        opsiA: '',
        opsiB: '',
        opsiC: '',
        opsiD: '',
        opsiE: '',
        kunci: 'a',
        pembahasan: '',
        gambar: '',
        editingIndex: null
      });
    }

    // Langsung update Google Spreadsheet (Sheet SOAL, BANK_SOAL, UJIAN) dengan forceTruncate
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL'], { forceTruncate: true }).catch(err => {
      console.warn('AutoSync push error on delete question:', err);
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Butir soal nomor ${qIndex + 1} dihapus & Google Spreadsheet otomatis diperbarui!`,
      showConfirmButton: false,
      timer: 2500
    });
  };

  // Muat Soal ke Form Manual untuk Diedit
  const handleEditQuestionInSession = (q: any, qIndex: number) => {
    const opsiObj = q.opsi || {};
    const rawGambar = (q.gambar || q.Gambar || q.gambarUrl || q.imageUrl || q.LinkGambar || q['Link Gambar'] || '').trim();
    setManualQuestionForm({
      pertanyaan: q.pertanyaan || '',
      opsiA: opsiObj.a || (typeof opsiObj === 'object' && opsiObj['0']?.text) || '',
      opsiB: opsiObj.b || (typeof opsiObj === 'object' && opsiObj['1']?.text) || '',
      opsiC: opsiObj.c || (typeof opsiObj === 'object' && opsiObj['2']?.text) || '',
      opsiD: opsiObj.d || (typeof opsiObj === 'object' && opsiObj['3']?.text) || '',
      opsiE: opsiObj.e || (typeof opsiObj === 'object' && opsiObj['4']?.text) || '',
      kunci: String(q.kunci || 'a').toLowerCase(),
      pembahasan: q.pembahasan || '',
      gambar: rawGambar,
      editingIndex: qIndex
    });
    setInputSoalMode('manual');
  };

  // Hubungkan Bank Soal yang sudah ada ke sesi
  const handleLinkExistingBankSoal = async (sesiId: string, bankId: string) => {
    if (!bankId) return;
    const ok = linkBankSoalToSession(bankId, sesiId);
    if (ok) {
      const updated = (db.get('ujian_cbt') as any[]) || [];
      setUjianList(updated);
      onSaveDb(updated);

      const refreshedSesi = updated.find((u: any) => u.id === sesiId);
      if (refreshedSesi && attachSoalModal) {
        setAttachSoalModal(refreshedSesi);
      }

      // Langsung sinkron ke Google Spreadsheet
      autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(err => {
        console.warn('AutoSync push error on link bank soal:', err);
      });

      Swal.fire({
        title: 'Bank Soal Terhubung & Disinkronkan!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700">
            <p>Paket bank soal <b>${bankId}</b> berhasil dihubungkan ke sesi <b>${sesiId}</b>.</p>
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] mt-1">
              🌐 <b>Otomatis Tersimpan di Google Spreadsheet:</b> Sheet <code>SOAL</code>, <code>BANK_SOAL</code>, dan <code>UJIAN</code> telah disinkronkan.
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#0891b2'
      });
    }
  };

  const handleOpenAttachSoal = (sesi: any) => {
    setAttachSoalModal(sesi);
    setSelectedBankIdToLink(sesi.bankSoalId || '');
    setManualQuestionForm({
      pertanyaan: '',
      opsiA: '',
      opsiB: '',
      opsiC: '',
      opsiD: '',
      opsiE: '',
      kunci: 'a',
      pembahasan: '',
      gambar: '',
      editingIndex: null
    });
    setBulkPasteText('');
    setInputSoalMode('manual');
    setShowExistingBankSelector(false);
  };

  // Actions
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const finalToken = formState.token?.trim() || generateTokenCode();
    const newSession = {
      ...formState,
      token: finalToken,
      peserta: Number(formState.peserta) || 28,
      durasi: formState.durasi.includes('Menit') ? formState.durasi : `${formState.durasi} Menit`
    };

    const updated = [newSession, ...ujianList];
    setUjianList(updated);
    onSaveDb(updated);

    // Synchronize token to sheet TOKEN / cbt_token_history for this specific Mapel & Class
    try {
      const existingTokens = db.get('cbt_token_history') || [];
      const newTokenItem = {
        id: `tok-${Date.now()}`,
        sesiId: newSession.id,
        mapel: newSession.mapel,
        kelas: newSession.kelas,
        token: finalToken,
        waktuDibuat: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        kedaluwarsa: 'Sesuai Sesi Ujian',
        status: 'Aktif',
        proktor: newSession.proktor || 'Admin Proktor CBT'
      };
      db.set('cbt_token_history', [newTokenItem, ...(Array.isArray(existingTokens) ? existingTokens : [])]);
      // Trigger update event
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history' } }));
    } catch (err) {
      console.warn('Failed to sync token item to cbt_token_history:', err);
    }

    // Selaraskan jadwal ke seluruh sistem & langsung kirim ke Google Spreadsheet (Sheet UJIAN, CBT_UJIAN, TOKEN, JADWAL)
    syncStsToAllSystems(updated);
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'TOKEN', 'CBT_TOKEN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on create session:', err);
    });

    setCreateModalOpen(false);

    // Langsung tawarkan kepada guru untuk mengisi soal
    Swal.fire({
      title: 'Jadwal Ujian Berhasil Dibuat & Disinkronkan!',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-700">
          <p>Sesi ujian <b>${newSession.mapel}</b> untuk <b>Kelas ${formatClassLabel(newSession.kelas, true)}</b> telah tersimpan dengan Token: <b class="font-mono text-cyan-700 font-bold">${finalToken}</b>.</p>
          <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] mt-1">
            🌐 <b>Otomatis Tersimpan di Google Spreadsheet:</b> Sheet <code>UJIAN</code>, <code>TOKEN</code>, dan <code>JADWAL</code> telah diperbarui secara langsung.
          </div>
          <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 mt-2">
            <p class="font-bold">Mau langsung mengisi butir soal untuk jadwal ini?</p>
            <p class="text-[11px] text-indigo-700 mt-0.5">Anda dapat mengetik langsung satu per satu, menempelkan teks butir soal dari Word / Notepad, atau mengunggah file Excel.</p>
          </div>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: '✍️ Ya, Langsung Isi Soal Sekarang',
      cancelButtonText: 'Nanti Saja',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b'
    }).then((res) => {
      if (res.isConfirmed) {
        handleOpenAttachSoal(newSession);
      }
    });

    // Reset Form
    setFormState({
      id: `SES-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      mapel: availableMapel[0] || 'Pendidikan Pancasila',
      kelas: '1A',
      jenis: 'Sumatif Harian',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      token: generateTokenCode(),
      tgl: new Date().toISOString().slice(0, 10),
      jamMulai: '07:30',
      jamSelesai: '09:00',
      durasi: '90 Menit',
      peserta: 28,
      proktor: teachers[0]?.name || 'Guru Pengampu / Proktor',
      acakSoal: true,
      acakOpsi: true,
      tampilkanNilai: true,
      status: 'Terjadwal',
      soal: '35 Soal (30 PG, 5 Esai)',
      bankSoalId: '',
      avg: 0
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    const newTgl = editModal.tgl || editModal.tanggal;
    const computedDisplay = newTgl ? formatIndonesianDateDisplay(newTgl) : (editModal.tglDisplay || '');
    const computedDurasi = editModal.durasi || calculateDurationMinutes(editModal.jamMulai, editModal.jamSelesai);

    const updated = ujianList.map(u => u.id === editModal.id ? { 
      ...u, 
      ...editModal,
      tgl: newTgl || u.tgl,
      tanggal: newTgl || u.tanggal,
      tglDisplay: computedDisplay || u.tglDisplay,
      jamMulai: editModal.jamMulai || u.jamMulai,
      jamSelesai: editModal.jamSelesai || u.jamSelesai,
      durasi: computedDurasi,
      proktor: editModal.proktor || u.proktor,
      pengawas: editModal.proktor || u.pengawas,
      peserta: Number(editModal.peserta) || u.peserta,
      avg: Number(editModal.avg) || u.avg
    } : u);
    setUjianList(updated);
    onSaveDb(updated);

    // Update token history if token changed
    if (editModal.token) {
      try {
        const existingTokens = db.get('cbt_token_history') || [];
        const existingIdx = (Array.isArray(existingTokens) ? existingTokens : []).findIndex((t: any) => t.sesiId === editModal.id);
        if (existingIdx >= 0) {
          existingTokens[existingIdx].token = editModal.token;
          existingTokens[existingIdx].mapel = editModal.mapel;
          existingTokens[existingIdx].kelas = editModal.kelas;
          existingTokens[existingIdx].kedaluwarsa = `${computedDisplay}, ${editModal.jamSelesai || '22:00'} WIB`;
          db.set('cbt_token_history', existingTokens);
        } else {
          const newTokenItem = {
            id: `tok-${Date.now()}`,
            sesiId: editModal.id,
            mapel: editModal.mapel,
            kelas: editModal.kelas,
            token: editModal.token,
            waktuDibuat: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            kedaluwarsa: `${computedDisplay}, ${editModal.jamSelesai || '22:00'} WIB`,
            status: 'Aktif',
            proktor: editModal.proktor || 'Admin Proktor CBT'
          };
          db.set('cbt_token_history', [newTokenItem, ...(Array.isArray(existingTokens) ? existingTokens : [])]);
        }
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history' } }));
      } catch (err) {
        console.warn('Failed to update token history:', err);
      }
    }

    // Selaraskan jadwal ke seluruh sistem & langsung kirim ke Google Spreadsheet (Sheet UJIAN, CBT_UJIAN, JADWAL_UJIAN, TOKEN, JADWAL)
    syncStsToAllSystems(updated);
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN', 'TOKEN', 'CBT_TOKEN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on save edit:', err);
    });

    setEditModal(null);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Perubahan jadwal disimpan & otomatis tersinkron ke Spreadsheet!',
      showConfirmButton: false,
      timer: 2500
    });
  };

  const handleApplyBatchReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSourceDate || !batchTargetDate) {
      Swal.fire('Perhatian', 'Pilih tanggal awal dan tanggal tujuan yang valid.', 'warning');
      return;
    }

    const targetDisplay = formatIndonesianDateDisplay(batchTargetDate);
    let countAffected = 0;

    const updated = ujianList.map(u => {
      const uDate = String(u.tgl || u.tanggal || '').trim();
      const matchDate = uDate === batchSourceDate;
      const matchKelas = !batchTargetKelas || String(u.kelas || '').trim() === batchTargetKelas;

      if (matchDate && matchKelas) {
        countAffected++;
        const newStart = batchNewJamMulai || u.jamMulai || '19:30';
        const newEnd = batchNewJamSelesai || u.jamSelesai || '22:00';
        const newDurasi = calculateDurationMinutes(newStart, newEnd);
        return {
          ...u,
          tgl: batchTargetDate,
          tanggal: batchTargetDate,
          tglDisplay: targetDisplay,
          jamMulai: newStart,
          jamSelesai: newEnd,
          durasi: newDurasi
        };
      }
      return u;
    });

    if (countAffected === 0) {
      Swal.fire('Info', 'Tidak ditemukan sesi ujian pada tanggal dan kelas yang dipilih.', 'info');
      return;
    }

    setUjianList(updated);
    onSaveDb(updated);
    syncStsToAllSystems(updated);
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN', 'TOKEN', 'CBT_TOKEN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on batch reschedule:', err);
    });

    setBatchRescheduleOpen(false);
    Swal.fire({
      title: 'Jadwal Berhasil Diganti!',
      html: `Sebanyak <b>${countAffected} sesi ujian</b> berhasil digeser ke tanggal <b>${targetDisplay}</b> dan disinkronkan ke Google Spreadsheet.`,
      icon: 'success',
      confirmButtonColor: '#0891b2'
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const updated = ujianList.filter(u => u.id !== deleteModal.id);
    setUjianList(updated);
    onSaveDb(updated);

    // Selaraskan jadwal ke seluruh sistem & perbarui Google Spreadsheet
    syncStsToAllSystems(updated);
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'TOKEN', 'CBT_TOKEN', 'JADWAL'], { forceTruncate: true }).catch(err => {
      console.warn('AutoSync push error on delete session:', err);
    });

    setDeleteModal(null);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Sesi ujian dihapus & Google Spreadsheet otomatis diperbarui!',
      showConfirmButton: false,
      timer: 2500
    });
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    let nextStatus = 'Berlangsung';
    if (currentStatus === 'Berlangsung') nextStatus = 'Selesai';
    else if (currentStatus === 'Selesai') nextStatus = 'Terjadwal';

    const updated = ujianList.map(u => u.id === id ? { ...u, status: nextStatus } : u);
    setUjianList(updated);
    onSaveDb(updated);

    syncStsToAllSystems(updated);
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(err => {
      console.warn('AutoSync push error on toggle status:', err);
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Status sesi diubah: ${nextStatus} & tersinkron ke Spreadsheet`,
      showConfirmButton: false,
      timer: 2000
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Quick Action */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900">Jadwal & Sesi Pelaksanaan Ujian</h2>
          </div>
          <p className="text-xs text-slate-500">
            Atur kalender sesi ujian online, token pengawas terkunci, sinkronisasi rombel KBM, dan integrasi Google Sheet.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Push to Google Sheets Button */}
          <button
            type="button"
            onClick={handlePushToGoogleSheets}
            disabled={isPushingSheet}
            className="px-3.5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            title="Kirim seluruh Sesi Ujian ke Google Sheet UJIAN dan TOKEN"
          >
            {isPushingSheet ? (
              <RefreshCw size={15} className="animate-spin text-white" />
            ) : (
              <CloudUpload size={15} className="text-white" />
            )}
            <span>{isPushingSheet ? 'Menyinkronkan...' : 'Kirim ke Sheet UJIAN & TOKEN'}</span>
          </button>

          {/* Pull from Google Sheets Button */}
          <button
            type="button"
            onClick={() => handlePullFromGoogleSheets(false)}
            disabled={isPullingSheet || isPushingSheet}
            className="px-3.5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            title="Tarik dan perbarui Jadwal Sesi Ujian langsung dari Sheet UJIAN di Google Spreadsheet"
          >
            {isPullingSheet ? (
              <RefreshCw size={15} className="animate-spin text-white" />
            ) : (
              <CloudDownload size={15} className="text-white" />
            )}
            <span>{isPullingSheet ? 'Menarik dari Sheet...' : 'Tarik dari Sheet UJIAN'}</span>
          </button>

          {/* Sync from Sheets Button */}
          <button
            type="button"
            onClick={handleLoadJadwalSts}
            disabled={isPullingSheet || isPushingSheet}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-2xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
            title="Sinkronkan seluruh Jadwal CBT langsung dari Google Spreadsheet Sheet UJIAN & TOKEN"
          >
            <RefreshCw size={15} className={`text-emerald-600 ${isPullingSheet ? 'animate-spin' : ''}`} />
            <span>Sinkron dari Sheet UJIAN</span>
          </button>

          {/* Auto Link 100% Packages Button */}
          <button
            type="button"
            onClick={handleAutoLinkAllPackages}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-2xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
            title="Tautkan 100% Sesi Ujian ke Paket Bank Soal Masing-Masing & Simpan ke Spreadsheet"
          >
            <Sparkles size={15} className="text-indigo-600" />
            <span>Tautkan 100% Paket Soal</span>
          </button>

          {/* Batch Reschedule Button */}
          <button
            type="button"
            onClick={() => {
              setBatchSourceDate('2026-09-28');
              setBatchTargetDate('');
              setBatchTargetKelas('');
              setBatchNewJamMulai('');
              setBatchNewJamSelesai('');
              setBatchRescheduleOpen(true);
            }}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-2xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
            title="Ganti / Geser Tanggal Ujian Secara Massal untuk Semua Sesi atau Per Kelas"
          >
            <ArrowRightLeft size={15} className="text-amber-600" />
            <span>Ganti Jadwal Massal</span>
          </button>

          {/* New Session Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-2 active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Tambah Sesi Baru</span>
          </button>

          {/* View Mode Toggle: Table vs Cards */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'table'
                  ? 'bg-white text-cyan-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Lega (Spacious Table)"
            >
              <List size={14} />
              <span>Tabel Lega</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-cyan-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Kartu Agenda (Executive Card Grid)"
            >
              <LayoutGrid size={14} />
              <span>Kartu Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Informative Spreadsheet Routing Guide Card */}
      <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-indigo-50 border border-sky-200/90 p-4 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-xs mt-0.5 shrink-0">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-800 text-sm">Panduan Penempatan Google Spreadsheet:</span>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-sky-300">
                Sheet UJIAN & TOKEN
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Jadwal & Sesi Ujian CBT ini tersinkronisasi ke <b>Sheet <code>UJIAN</code></b> (UjianID, Mapel, Kelas, Tanggal, Jam, Durasi, Token, Status) dan <b>Sheet <code>TOKEN</code></b> (Token Aktif CBT).
            </p>
            <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1.5">
              <span>💡</span>
              <span><b>PENTING:</b> Sheet <b><code>JADWAL</code></b> di Google Spreadsheet adalah khusus untuk <b>Jadwal Pelajaran KBM Mingguan</b> (modul Akademik), bukan untuk ujian CBT.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <a
            href={`https://docs.google.com/spreadsheets/d/${settings?.spreadsheetId || '1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4'}/edit`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>Buka Sheet UJIAN</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Quick Day & Jenjang Tabs */}
      <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Day Filter Tabs */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar size={13} className="text-cyan-600" />
            <span>Pilih Hari Pelaksanaan Ujian (Sumber: Google Spreadsheet):</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTanggal('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                !filterTanggal
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              <span>🌟 Semua Hari</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${!filterTanggal ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-200 text-slate-600'}`}>
                {ujianList.length} Sesi
              </span>
            </button>

            {availableExamDates.map(d => {
              const isSelected = filterTanggal === d.dateKey || (filterTanggal && d.displayLabel.includes(filterTanggal));
              return (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => setFilterTanggal(isSelected ? '' : d.dateKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <span>📅 {d.displayLabel}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-200 text-slate-600'}`}>
                    {d.count} Sesi
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Jenjang Filter Chips & Quick Reset */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Jenjang:</span>
            {[
              { label: 'Semua Jenjang', value: '', count: ujianList.length },
              { label: 'Paket A (Kls 4-6)', value: 'Paket A', count: jenjangStats.paketA },
              { label: 'Paket B (Kls 7-9)', value: 'Paket B', count: jenjangStats.paketB },
              { label: 'Paket C (Kls 10-12)', value: 'Paket C', count: jenjangStats.paketC },
            ].map(j => (
              <button
                key={j.label}
                type="button"
                onClick={() => setFilterJenjang(j.value)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  filterJenjang === j.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span>{j.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filterJenjang === j.value ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>
                  {j.count}
                </span>
              </button>
            ))}
          </div>

          {(searchTerm || filterKelas || filterMapel || filterJenis || filterStatus || filterTanggal || filterJenjang || filterKoneksiSoal) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterKelas('');
                setFilterMapel('');
                setFilterJenis('');
                setFilterStatus('');
                setFilterTanggal('');
                setFilterJenjang('');
                setFilterKoneksiSoal('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
            >
              <X size={13} />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* Status Integrasi Bank Soal & Butir Soal Filter Chips */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status Soal:</span>
            {[
              { label: 'Semua Status Soal', value: '', count: ujianList.length },
              { label: '✅ Sudah Terhubung Bank Soal', value: 'terhubung', count: connectionStats.linked },
              { label: '⚠️ Belum Terhubung Bank Soal', value: 'belum_terhubung', count: connectionStats.unlinked },
              { label: '📝 Sudah Ada Butir Soal', value: 'ada_soal', count: connectionStats.withQuestions },
              { label: '❌ Belum Ada Soal', value: 'belum_ada_soal', count: connectionStats.withoutQuestions },
            ].map(item => {
              const active = filterKoneksiSoal === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setFilterKoneksiSoal(item.value)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    active ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari mata pelajaran, kode sesi, token ujian, pengawas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
              ))}
            </select>

            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 max-w-[180px]"
            >
              <option value="">Semua Mata Pelajaran</option>
              {availableMapel.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Jenis Ujian ({JENIS_UJIAN_LIST.length} Jenis)</option>
              {JENIS_UJIAN_LIST.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Status Sesi</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Berlangsung">Sedang Berlangsung</option>
              <option value="Selesai">Selesai</option>
            </select>

            {/* Filter Status Keterhubungan Soal */}
            <select
              value={filterKoneksiSoal}
              onChange={(e) => setFilterKoneksiSoal(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Status Keterhubungan Soal</option>
              <option value="terhubung">✅ Sudah Terhubung Bank Soal ({connectionStats.linked})</option>
              <option value="belum_terhubung">⚠️ Belum Terhubung Bank Soal ({connectionStats.unlinked})</option>
              <option value="ada_soal">📝 Sudah Ada Butir Soal ({connectionStats.withQuestions})</option>
              <option value="belum_ada_soal">❌ Belum Ada Soal ({connectionStats.withoutQuestions})</option>
            </select>

            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl whitespace-nowrap">
              {filteredList.length} Sesi Terdata
            </span>
          </div>
        </div>

        {/* TAMPILAN MODE 1: TABEL LEGA (Spacious Table) */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <table className="w-full text-xs text-left min-w-[1180px]">
              <thead className="bg-slate-50/95 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200/90 sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="p-3.5 pl-4 w-36 whitespace-nowrap">Kode Sesi</th>
                  <th className="p-3.5 min-w-[240px]">Mata Pelajaran & Kurikulum</th>
                  <th className="p-3.5 w-32 whitespace-nowrap">Rombel</th>
                  <th className="p-3.5 w-44 whitespace-nowrap">Token Ujian</th>
                  <th className="p-3.5 w-36 whitespace-nowrap">Jenis Asesmen</th>
                  <th className="p-3.5 w-48 whitespace-nowrap">Jadwal & Waktu</th>
                  <th className="p-3.5 w-24 text-center whitespace-nowrap">Durasi</th>
                  <th className="p-3.5 w-32 whitespace-nowrap">Pengawas</th>
                  <th className="p-3.5 w-28 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 pr-4 w-28 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-600 text-sm">Tidak Ada Sesi Ujian</p>
                      <p className="text-xs text-slate-400 mt-0.5">Silakan sesuaikan filter pencarian atau muat ulang 117 Sesi STS.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((u: any, idx: number) => (
                    <tr key={u.id ? `${u.id}-${idx}` : `sesi-row-${idx}`} className="hover:bg-cyan-50/40 transition even:bg-slate-50/30">
                      {/* Kode Sesi */}
                      <td className="p-3.5 pl-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-cyan-50/90 text-cyan-800 border border-cyan-200/70 px-2.5 py-1 rounded-xl whitespace-nowrap inline-flex items-center gap-1.5 shadow-2xs">
                          <Layers size={11} className="text-cyan-600 shrink-0" />
                          {u.id}
                        </span>
                      </td>

                      {/* Mapel */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{u.mapel}</span>
                          {u.bankSoalId ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              Paket Soal Siap
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1 whitespace-nowrap">
                              Belum Terhubung
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 whitespace-nowrap">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-600">
                            {u.tahunAjaran || '2026/2027'} - Sem {u.semester || '1'}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 font-medium">
                            <FileQuestion size={11} className="text-slate-400" /> {u.bankSoalId ? 'PG Terverifikasi' : (u.soal || 'Belum ada paket soal')}
                          </span>
                        </div>
                      </td>

                      {/* Rombel */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-xl font-bold text-xs border whitespace-nowrap inline-block ${
                          String(u.kelas).toLowerCase().includes('paket a') || ['4', '5', '6'].some(c => String(u.kelas).includes(c))
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                            : String(u.kelas).toLowerCase().includes('paket b') || ['7', '8', '9'].some(c => String(u.kelas).includes(c))
                            ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                            : 'bg-purple-50 text-purple-800 border-purple-200/80'
                        }`}>
                          {formatClassLabel(u.kelas, true)}
                        </span>
                      </td>

                      {/* Token */}
                      <td className="p-3.5 whitespace-nowrap">
                        {u.token ? (
                          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                            <Key size={12} className="text-cyan-600 shrink-0" />
                            <span className="font-mono font-black text-cyan-900 text-xs tracking-wider">{u.token}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyToken(u.token, u.id)}
                              className="text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100/60 transition p-1 rounded-md"
                              title="Salin Token Ujian"
                            >
                              {copiedTokenId === u.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                            {copiedTokenId === u.id && (
                              <span className="text-[10px] text-emerald-600 font-bold animate-in fade-in">Tersalin!</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">-</span>
                        )}
                      </td>

                      {/* Jenis Asesmen */}
                      <td className="p-3.5 whitespace-nowrap">
                        {(() => {
                          const j = String(u.jenis || u.Jenis || u.JenisUjian || u.jenisUjian || 'Sumatif Tengah Semester (STS)');
                          const isPraktek = j.toLowerCase().includes('praktek');
                          const isHarian = j.toLowerCase().includes('harian');
                          const isSas = j.toLowerCase().includes('akhir') || j.toLowerCase().includes('sas');
                          return (
                            <span className={`px-2.5 py-1 font-bold rounded-xl text-[11px] border whitespace-nowrap inline-block ${
                              isPraktek
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : isHarian
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                : isSas
                                ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                                : 'bg-cyan-50/80 text-cyan-800 border-cyan-200/60'
                            }`}>
                              {j}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Jadwal & Waktu */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar size={13} className="text-cyan-600 shrink-0" />
                          <span>{u.tglDisplay || u.tgl || u.tanggal || u.Tanggal}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{u.jamMulai ? `${formatClockTime(u.jamMulai, '19:30')} - ${formatClockTime(u.jamSelesai, '22:00')}` : (u.durasi || u.Durasi || '90 Menit')} WIB</span>
                        </div>
                      </td>

                      {/* Durasi */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 font-semibold text-slate-700 rounded-lg text-xs">
                          {u.durasi || u.Durasi || (u.durasiMenit ? `${u.durasiMenit} Menit` : '90 Menit')}
                        </span>
                      </td>

                      {/* Pengawas */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="text-slate-700 font-medium text-xs whitespace-nowrap">{u.proktor || u.pengawas || 'Guru Kelas'}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] transition cursor-pointer hover:opacity-80 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap ${
                            u.status === 'Berlangsung' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : u.status === 'Selesai' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                          title="Klik untuk mengubah status sesi cepat"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'Berlangsung' ? 'bg-amber-500 animate-pulse' : u.status === 'Selesai' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          <span>{u.status}</span>
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('simulasi', { session: u, sesiId: u.id, token: u.token })}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                              title="Uji Coba CBT Sesi Ini"
                            >
                              <Play size={12} />
                              <span>Uji Coba</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenAttachSoal(u)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 ${
                              u.bankSoalId 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title={u.bankSoalId ? 'Kelola & Edit Soal Sesi Ini' : 'Isi Soal Langsung ke Sesi Jadwal Ini'}
                          >
                            <FileQuestion size={13} />
                            <span>{u.bankSoalId ? 'Kelola Soal' : 'Isi Soal'}</span>
                          </button>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('proktor', { session: u, sesiId: u.id })}
                              className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-bold text-xs transition cursor-pointer"
                              title="Pantau di Pengawasan Proktor"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewDetailModal(u)}
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-bold text-xs transition"
                            title="Lihat Detail Sesi"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditModal({ ...u })}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs transition"
                            title="Edit Sesi"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModal({ id: u.id, name: `${u.mapel} - ${u.kelas}` })}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition"
                            title="Hapus Sesi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAMPILAN MODE 2: KARTU AGENDA (Executive Card Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
            {paginatedList.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-400 bg-slate-50/50 rounded-3xl border border-slate-200">
                <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Tidak Ada Sesi Ujian</p>
                <p className="text-xs text-slate-400 mt-0.5">Silakan sesuaikan filter pencarian atau muat ulang 117 Sesi STS.</p>
              </div>
            ) : (
              paginatedList.map((u: any, idx: number) => (
                <div
                  key={u.id ? `${u.id}-${idx}` : `sesi-card-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:shadow-md hover:border-cyan-300 transition-all duration-200 flex flex-col justify-between group space-y-3.5"
                >
                  {/* Card Top Row: Sesi, Rombel, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      {u.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg font-bold text-xs border ${
                        String(u.kelas).toLowerCase().includes('paket a') || ['4', '5', '6'].some(c => String(u.kelas).includes(c))
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                          : String(u.kelas).toLowerCase().includes('paket b') || ['7', '8', '9'].some(c => String(u.kelas).includes(c))
                          ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                          : 'bg-purple-50 text-purple-800 border-purple-200/80'
                      }`}>
                        {formatClassLabel(u.kelas, true)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] cursor-pointer hover:opacity-80 inline-flex items-center gap-1 ${
                          u.status === 'Berlangsung' 
                            ? 'bg-amber-100 text-amber-800' 
                            : u.status === 'Selesai' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Berlangsung' ? 'bg-amber-500 animate-pulse' : u.status === 'Selesai' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{u.status}</span>
                      </button>
                    </div>
                  </div>

                  {/* Subject Name & Assessment Type */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-black text-slate-900 text-base leading-snug group-hover:text-cyan-700 transition">
                        {u.mapel}
                      </h4>
                      {u.bankSoalId ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                          <CheckCircle2 size={10} className="text-emerald-600" /> 20 Soal Siap
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                          Belum Terhubung
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        String(u.jenis).toLowerCase().includes('praktek')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-cyan-100/80 text-cyan-800'
                      }`}>
                        {u.jenis}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {u.bankSoalId ? '20 Butir Soal (PG Terverifikasi)' : (u.soal || 'Belum ada paket soal')}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Date & Time */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-cyan-600" />
                        <span>{u.tglDisplay || u.tgl}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{u.durasi}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <Clock size={12} className="text-slate-400" />
                      <span>{u.jamMulai ? `${formatClockTime(u.jamMulai, '19:30')} - ${formatClockTime(u.jamSelesai, '22:00')}` : u.durasi} WIB</span>
                    </div>
                  </div>

                  {/* Token Box */}
                  <div className="bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200/80 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1">
                        <Key size={10} />
                        <span>Token Ujian Terkunci:</span>
                      </div>
                      <div className="font-mono font-black text-sm text-cyan-950 tracking-wider">
                        {u.token || '-'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyToken(u.token, u.id)}
                      className="px-2.5 py-1 bg-white hover:bg-cyan-100/80 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      {copiedTokenId === u.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedTokenId === u.id ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>

                  {/* Footer with Pengawas & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-slate-500 truncate max-w-[150px]">
                      <span className="text-[10px] text-slate-400 block">Pengawas:</span>
                      <span className="font-medium text-slate-700">{u.proktor || u.pengawas || 'Guru Kelas'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('simulasi', { session: u, sesiId: u.id, token: u.token })}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                          title="Uji Coba CBT Sesi Ini"
                        >
                          <Play size={11} />
                          <span>Uji Coba</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenAttachSoal(u)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                          u.bankSoalId 
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                        title={u.bankSoalId ? 'Kelola & Edit Soal Sesi Ini' : 'Isi Soal Langsung ke Sesi Jadwal Ini'}
                      >
                        <FileQuestion size={12} />
                        <span>{u.bankSoalId ? 'Kelola Soal' : 'Isi Soal'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewDetailModal(u)}
                        className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-bold text-xs transition"
                        title="Lihat Detail Sesi"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditModal({ ...u })}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs transition"
                        title="Edit Sesi"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModal({ id: u.id, name: `${u.mapel} - ${u.kelas}` })}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition"
                        title="Hapus Sesi"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan{' '}
              <b className="text-slate-800">
                {filteredList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </b>{' '}
              -{' '}
              <b className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, filteredList.length)}
              </b>{' '}
              dari <b className="text-slate-800">{filteredList.length}</b> Sesi Ujian
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value={15}>15 Sesi</option>
                <option value={30}>30 Sesi</option>
                <option value={60}>60 Sesi</option>
                <option value={999}>Semua ({filteredList.length})</option>
              </select>
            </div>
          </div>

          {itemsPerPage < 999 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        currentPage === pageNum
                          ? 'bg-cyan-600 text-white shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Buat Sesi Ujian CBT Baru</h3>
                  <p className="text-[11px] text-slate-500">Tersinkron dengan sheet MAPEL, KELAS, dan TOKEN Ujian</p>
                </div>
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Optional Bank Soal Package Selector */}
              {bankSoalPackages.length > 0 && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Pautkan Paket Bank Soal (Opsional)</span>
                  </div>
                  <select
                    value={formState.bankSoalId || ''}
                    onChange={(e) => {
                      const sel = bankSoalPackages.find(p => p.id === e.target.value);
                      if (sel) {
                        setFormState(prev => ({
                          ...prev,
                          bankSoalId: sel.id,
                          mapel: sel.mapel || prev.mapel,
                          kelas: sel.kelas || prev.kelas,
                          soal: `${sel.jumlahSoal} Butir Soal (${sel.soalDesc})`
                        }));
                      } else {
                        setFormState(prev => ({ ...prev, bankSoalId: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Pilih Paket Bank Soal Tersimpan --</option>
                    {bankSoalPackages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.mapel} {p.kelas ? `(${p.kelas})` : ''} - {p.jumlahSoal} Soal [{p.id}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mapel Selection (From Sheet MAPEL) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Mata Pelajaran (Sesuai Sheet MAPEL)</span>
                  <span className="text-[10px] text-cyan-600 lowercase font-normal">{availableMapel.length} mapel terdata</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formState.mapel}
                    onChange={(e) => {
                      const newMapel = e.target.value;
                      setFormState({ 
                        ...formState, 
                        mapel: newMapel,
                        token: buildLockedExamToken(formState.kelas, newMapel)
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {availableMapel.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formState.mapel}
                    onChange={(e) => {
                      const newMapel = e.target.value;
                      setFormState({ 
                        ...formState, 
                        mapel: newMapel,
                        token: buildLockedExamToken(formState.kelas, newMapel)
                      });
                    }}
                    placeholder="Atau ketik mapel lain jika belum ada..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              {/* Tahun Ajaran & Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tahun Ajaran</label>
                  <select
                    value={formState.tahunAjaran}
                    onChange={(e) => setFormState({ ...formState, tahunAjaran: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Semester</label>
                  <select
                    value={formState.semester}
                    onChange={(e) => setFormState({ ...formState, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="1 (Ganjil)">1 (Ganjil)</option>
                    <option value="2 (Genap)">2 (Genap)</option>
                  </select>
                </div>
              </div>

              {/* Rombel Kelas & Jenis Ujian */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Rombel / Kelas</label>
                  <select
                    value={formState.kelas}
                    onChange={(e) => {
                      const newKelas = e.target.value;
                      setFormState({ 
                        ...formState, 
                        kelas: newKelas,
                        token: buildLockedExamToken(newKelas, formState.mapel)
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jenis Ujian / Asesmen</label>
                  <select
                    value={formState.jenis}
                    onChange={(e) => setFormState({ ...formState, jenis: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {JENIS_UJIAN_LIST.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Token Ujian Terkunci per Mapel & Kelas */}
              <div className="p-3.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} className="text-cyan-700" />
                    <span>Token Ujian (Terkunci Otomatis per Mapel & Kelas)</span>
                  </label>
                  <span className="text-[10px] font-bold bg-cyan-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    🔒 Terkunci Sesuai Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    readOnly
                    value={formState.token}
                    className="w-full px-3.5 py-2.5 bg-white border border-cyan-300 rounded-xl text-sm font-black font-mono tracking-widest text-cyan-900 uppercase shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formState.token);
                      setCopiedTokenId('form-create');
                      setTimeout(() => setCopiedTokenId(null), 2000);
                    }}
                    className="px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0"
                    title="Salin Token Terkunci"
                  >
                    {copiedTokenId === 'form-create' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedTokenId === 'form-create' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-cyan-800 leading-relaxed">
                  Format baku: <strong>[{formState.kelas}]-[KODE MAPEL]-[KODE UNIK]</strong>. Token ini langsung aktif dan menjadi syarat verifikasi ujian siswa kelas {formState.kelas}.
                </p>
              </div>

              {/* Tanggal & Durasi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Ujian</label>
                  <input
                    type="date"
                    required
                    value={formState.tgl}
                    onChange={(e) => setFormState({ ...formState, tgl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Durasi Pengerjaan</label>
                  <input
                    type="text"
                    value={formState.durasi}
                    onChange={(e) => setFormState({ ...formState, durasi: e.target.value })}
                    placeholder="90 Menit"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Mulai</label>
                  <input
                    type="time"
                    value={formState.jamMulai}
                    onChange={(e) => setFormState({ ...formState, jamMulai: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Selesai</label>
                  <input
                    type="time"
                    value={formState.jamSelesai}
                    onChange={(e) => setFormState({ ...formState, jamSelesai: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pengawas / Proktor</label>
                <select
                  value={formState.proktor}
                  onChange={(e) => setFormState({ ...formState, proktor: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  {teachers.map((t, idx) => (
                    <option key={t.id ? `ju-t-${t.id}-${idx}` : `ju-t-${idx}`} value={t.name}>{t.name} ({t.nip || 'Guru'})</option>
                  ))}
                  <option value="Tim Proktor Utama">Tim Proktor Utama</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formState.acakSoal} 
                    onChange={(e) => setFormState({ ...formState, acakSoal: e.target.checked })}
                    className="rounded text-cyan-600 focus:ring-cyan-500" 
                  />
                  <span className="font-bold text-slate-800">Acak Urutan Butir Soal Antar Peserta</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formState.acakOpsi} 
                    onChange={(e) => setFormState({ ...formState, acakOpsi: e.target.checked })}
                    className="rounded text-cyan-600 focus:ring-cyan-500" 
                  />
                  <span className="font-bold text-slate-800">Acak Opsi Pilihan Jawaban (A, B, C, D)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formState.tampilkanNilai} 
                    onChange={(e) => setFormState({ ...formState, tampilkanNilai: e.target.checked })}
                    className="rounded text-cyan-600 focus:ring-cyan-500" 
                  />
                  <span className="font-bold text-slate-800">Tampilkan Nilai Akhir ke Siswa Setelah Submit</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Sesi Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {viewDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Detail Sesi Ujian: {viewDetailModal.mapel}</h3>
              </div>
              <button 
                onClick={() => setViewDetailModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Kode Sesi:</span>
                <span className="font-mono font-bold text-cyan-700">{viewDetailModal.id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Mata Pelajaran:</span>
                <span className="font-extrabold text-slate-900">{viewDetailModal.mapel}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Tahun Ajaran / Semester:</span>
                <span className="font-bold text-indigo-700">{viewDetailModal.tahunAjaran || '2026/2027'} - Semester {viewDetailModal.semester || '1 (Ganjil)'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-500">Token Ujian:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded-md tracking-wider">
                    {viewDetailModal.token || '-'}
                  </span>
                  {viewDetailModal.token && (
                    <button
                      onClick={() => handleCopyToken(viewDetailModal.token, 'detail')}
                      className="p-1 text-cyan-700 hover:text-cyan-900 transition"
                      title="Salin Token"
                    >
                      {copiedTokenId === 'detail' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Rombel Kelas:</span>
                <span className="font-bold text-slate-900">{formatClassLabel(viewDetailModal.kelas, true)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Jenis Asesmen:</span>
                <span className="font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">{viewDetailModal.jenis}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Tanggal Pelaksanaan:</span>
                <span className="font-bold text-slate-800">{viewDetailModal.tgl}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Durasi Pengerjaan:</span>
                <span className="font-bold text-slate-800">{viewDetailModal.durasi}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Pengawas / Proktor:</span>
                <span className="font-bold text-slate-800">{viewDetailModal.proktor || 'Proktor Sekolah'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between">
                <span className="font-bold text-slate-500">Status Sesi:</span>
                <span className="font-bold text-emerald-700">{viewDetailModal.status}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Edit Sesi: {editModal.mapel}</h3>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mata Pelajaran (Sheet MAPEL)</label>
                <select
                  value={editModal.mapel || ''}
                  onChange={(e) => {
                    const newMapel = e.target.value;
                    setEditModal({ 
                      ...editModal, 
                      mapel: newMapel,
                      token: buildLockedExamToken(editModal.kelas || '1A', newMapel)
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  {availableMapel.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tahun Ajaran</label>
                  <select
                    value={editModal.tahunAjaran || '2026/2027'}
                    onChange={(e) => setEditModal({ ...editModal, tahunAjaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Semester</label>
                  <select
                    value={editModal.semester || '1 (Ganjil)'}
                    onChange={(e) => setEditModal({ ...editModal, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="1 (Ganjil)">1 (Ganjil)</option>
                    <option value="2 (Genap)">2 (Genap)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={13} className="text-cyan-700" />
                    <span>Token Ujian (Terkunci Otomatis)</span>
                  </label>
                  <span className="text-[10px] font-bold bg-cyan-600 text-white px-2 py-0.5 rounded-full">
                    🔒 Terkunci
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={editModal.token || ''}
                  className="w-full px-3.5 py-2 bg-white border border-cyan-300 rounded-xl text-sm font-mono font-bold tracking-widest text-cyan-900 uppercase shadow-inner"
                />
                <p className="text-[10px] text-cyan-700">Token otomatis diperbarui sesuai kombinasi kelas & mata pelajaran.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas</label>
                  <select
                    value={editModal.kelas || ''}
                    onChange={(e) => {
                      const newKelas = e.target.value;
                      setEditModal({ 
                        ...editModal, 
                        kelas: newKelas,
                        token: buildLockedExamToken(newKelas, editModal.mapel || 'Pendidikan Pancasila')
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{formatClassLabel(cls, true)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jenis Asesmen</label>
                  <select
                    value={editModal.jenis || 'Sumatif Harian'}
                    onChange={(e) => setEditModal({ ...editModal, jenis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {JENIS_UJIAN_LIST.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Ujian</label>
                  <input
                    type="date"
                    value={editModal.tgl || ''}
                    onChange={(e) => setEditModal({ ...editModal, tgl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Durasi</label>
                  <input
                    type="text"
                    value={editModal.durasi || ''}
                    onChange={(e) => setEditModal({ ...editModal, durasi: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="Contoh: 90 Menit"
                  />
                </div>
              </div>

              {/* JAM MULAI & JAM SELESAI */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Mulai</label>
                  <input
                    type="time"
                    value={editModal.jamMulai || '19:30'}
                    onChange={(e) => {
                      const newMulai = e.target.value;
                      const newDur = calculateDurationMinutes(newMulai, editModal.jamSelesai || '22:00');
                      setEditModal({ ...editModal, jamMulai: newMulai, durasi: newDur });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Selesai</label>
                  <input
                    type="time"
                    value={editModal.jamSelesai || '22:00'}
                    onChange={(e) => {
                      const newSelesai = e.target.value;
                      const newDur = calculateDurationMinutes(editModal.jamMulai || '19:30', newSelesai);
                      setEditModal({ ...editModal, jamSelesai: newSelesai, durasi: newDur });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status</label>
                  <select
                    value={editModal.status || 'Terjadwal'}
                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pengawas / Proktor</label>
                  <select
                    value={editModal.proktor || ''}
                    onChange={(e) => setEditModal({ ...editModal, proktor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="">-- Pilih Guru Pengawas --</option>
                    {teachers.map((t, idx) => (
                      <option key={`em-t-${idx}`} value={t.name}>{t.name} ({t.nip || 'Guru'})</option>
                    ))}
                    <option value="Guru Pengampu / Proktor">Guru Pengampu / Proktor</option>
                    <option value="Tim Proktor Utama">Tim Proktor Utama</option>
                  </select>
                </div>
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH RESCHEDULE MODAL */}
      {batchRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Ganti / Geser Jadwal Massal</h3>
                  <p className="text-xs text-slate-500">Pindahkan sesi ujian secara bersamaan ke tanggal baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchRescheduleOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyBatchReschedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tanggal Asal (Yang Akan Diganti)</label>
                  <input
                    type="date"
                    value={batchSourceDate}
                    onChange={(e) => setBatchSourceDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tanggal Tujuan Baru</label>
                  <input
                    type="date"
                    value={batchTargetDate}
                    onChange={(e) => setBatchTargetDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Filter Kelas (Opsional)</label>
                <select
                  value={batchTargetKelas}
                  onChange={(e) => setBatchTargetKelas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">Semua Kelas (Seluruh Sesi pada Tanggal Tersebut)</option>
                  {availableClasses.map(cls => (
                    <option key={`batch-cls-${cls}`} value={cls}>{formatClassLabel(cls, true)}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Pilih kelas tertentu jika hanya ingin menggeser ujian untuk kelas tersebut.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Mulai Baru (Opsional)</label>
                  <input
                    type="time"
                    value={batchNewJamMulai}
                    onChange={(e) => setBatchNewJamMulai(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jam Selesai Baru (Opsional)</label>
                  <input
                    type="time"
                    value={batchNewJamSelesai}
                    onChange={(e) => setBatchNewJamSelesai(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <p className="col-span-2 text-[10px] text-slate-500">Kosongkan jika ingin mempertahankan jam mulai dan selesai yang sudah ada.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBatchRescheduleOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays size={14} />
                  <span>Terapkan &amp; Sinkronkan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Sesi Ujian</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus sesi ujian <strong className="text-slate-800">"{deleteModal.name}"</strong>?
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

      {/* ATTACH / KELOLA SOAL MODAL */}
      {attachSoalModal && (() => {
        const allBank = (db.get('cbt_bank_soal') as any[]) || (db.get('cbt_questions') as any[]) || [];
        const currentBank = allBank.find((b: any) => b.id === attachSoalModal.bankSoalId || b.BankSoalID === attachSoalModal.bankSoalId);
        const attachedQuestions = getAttachedQuestions(attachSoalModal);

        // Filter recommended banks matching mapel
        const recommendedBanks = allBank.filter((b: any) => 
          String(b.mapel || b.Mapel || '').toLowerCase() === String(attachSoalModal.mapel).toLowerCase()
        );

        const detectedBulkCount = bulkPasteText.trim() ? parseBulkQuestions(bulkPasteText, 5).length : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileQuestion size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Kelola & Isi Soal CBT:</span>
                      <span className="text-indigo-600">{attachSoalModal.mapel}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rombel: <span className="font-bold text-slate-700">{formatClassLabel(attachSoalModal.kelas, true)}</span> • Kode Sesi: <span className="font-mono font-bold text-cyan-700">{attachSoalModal.id}</span> • Token: <span className="font-mono font-bold text-emerald-700">{attachSoalModal.token}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachSoalModal(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Header Badge */}
              <div className={`p-3 rounded-2xl border shrink-0 ${
                attachedQuestions.length > 0
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {attachedQuestions.length > 0 ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    )}
                    <span className="font-bold text-xs">
                      {attachedQuestions.length > 0
                        ? `Sesi Ini Memiliki ${attachedQuestions.length} Butir Soal Terhubung & Siap Diujikan`
                        : 'Belum Ada Butir Soal pada Jadwal Sesi Ini'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold">
                    {attachedQuestions.length} Butir
                  </span>
                </div>
              </div>

              {/* Input Mode Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl shrink-0 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setInputSoalMode('manual')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
                    inputSoalMode === 'manual'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>✍️ Ketik Soal Manual</span>
                  {manualQuestionForm.editingIndex !== null && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">Edit No. {manualQuestionForm.editingIndex + 1}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setInputSoalMode('bulk')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
                    inputSoalMode === 'bulk'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📋 Tempel Banyak Soal (Bulk Paste)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputSoalMode('excel')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    inputSoalMode === 'excel'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Impor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputSoalMode('existing' as any)}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    inputSoalMode === ('existing' as any)
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen size={13} />
                  <span>Pilih Bank Soal</span>
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* TAB EXCEL: IMPOR EXCEL */}
                {inputSoalMode === 'excel' && (
                  <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-emerald-600" />
                        <span>Impor Butir Soal dari File Excel (.xlsx / .xls / .csv)</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => exportExcelTemplateSoal(attachSoalModal.mapel, attachSoalModal.kelas)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>Unduh Template Excel</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Unggah file Excel yang berisi butir pertanyaan, opsi pilihan (A, B, C, D, E), kunci jawaban, dan pembahasan. Soal yang diunggah akan otomatis digabungkan ke jadwal sesi ujian ini dan langsung disinkronkan ke Google Spreadsheet.
                    </p>

                    <div className="p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl text-center space-y-2">
                      <FileSpreadsheet size={32} className="mx-auto text-emerald-600" />
                      <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition">
                          <Upload size={14} />
                          <span>Pilih File Excel Soal</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={(e) => handleUploadExcelQuestions(e, attachSoalModal)}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500">Mendukung format file .xlsx, .xls, atau .csv (Maksimal 10 MB)</p>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">Format Kolom Template Excel:</p>
                      <p className="font-mono text-[10px] text-slate-500">
                        Kolom: <code>No</code> | <code>Pertanyaan</code> | <code>Opsi A</code> | <code>Opsi B</code> | <code>Opsi C</code> | <code>Opsi D</code> | <code>Opsi E</code> | <code>Kunci</code> | <code>Pembahasan</code>
                      </p>
                    </div>
                  </div>
                )}
                {/* TAB 1: KETIK SOAL MANUAL */}
                {inputSoalMode === 'manual' && (
                  <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Edit size={14} className="text-indigo-600" />
                        <span>
                          {manualQuestionForm.editingIndex !== null
                            ? `Edit Butir Soal Nomor ${manualQuestionForm.editingIndex + 1}`
                            : `Tambah Butir Soal Baru (Nomor ${attachedQuestions.length + 1})`}
                        </span>
                      </h4>
                      {manualQuestionForm.editingIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualQuestionForm({
                              pertanyaan: '',
                              opsiA: '',
                              opsiB: '',
                              opsiC: '',
                              opsiD: '',
                              opsiE: '',
                              kunci: 'a',
                              pembahasan: '',
                              gambar: '',
                              editingIndex: null
                            });
                          }}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Batal Edit
                        </button>
                      )}
                    </div>

                    {/* Pertanyaan */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-xs">Pertanyaan Soal:</label>
                      <textarea
                        rows={3}
                        value={manualQuestionForm.pertanyaan}
                        onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, pertanyaan: e.target.value })}
                        placeholder="Ketik teks pertanyaan soal di sini..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Opsi A - D (dan E) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-mono text-[10px]">A</span>
                          <span>Pilihan Jawaban A:</span>
                        </label>
                        <input
                          type="text"
                          value={manualQuestionForm.opsiA}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, opsiA: e.target.value })}
                          placeholder="Pilihan jawaban A"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-mono text-[10px]">B</span>
                          <span>Pilihan Jawaban B:</span>
                        </label>
                        <input
                          type="text"
                          value={manualQuestionForm.opsiB}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, opsiB: e.target.value })}
                          placeholder="Pilihan jawaban B"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-mono text-[10px]">C</span>
                          <span>Pilihan Jawaban C:</span>
                        </label>
                        <input
                          type="text"
                          value={manualQuestionForm.opsiC}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, opsiC: e.target.value })}
                          placeholder="Pilihan jawaban C"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-mono text-[10px]">D</span>
                          <span>Pilihan Jawaban D:</span>
                        </label>
                        <input
                          type="text"
                          value={manualQuestionForm.opsiD}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, opsiD: e.target.value })}
                          placeholder="Pilihan jawaban D"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-mono text-[10px]">E</span>
                          <span>Pilihan Jawaban E (Opsional untuk SMA/SMK/Paket C):</span>
                        </label>
                        <input
                          type="text"
                          value={manualQuestionForm.opsiE}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, opsiE: e.target.value })}
                          placeholder="Pilihan jawaban E (opsional)"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Kunci Jawaban & Pembahasan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Kunci Jawaban Benar:</label>
                        <select
                          value={manualQuestionForm.kunci}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, kunci: e.target.value })}
                          className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="a">A (Pilihan A)</option>
                          <option value="b">B (Pilihan B)</option>
                          <option value="c">C (Pilihan C)</option>
                          <option value="d">D (Pilihan D)</option>
                          {manualQuestionForm.opsiE.trim() && <option value="e">E (Pilihan E)</option>}
                        </select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-slate-700 text-[11px]">Pembahasan Rasional (Opsional):</label>
                        <input
                          type="text"
                          value={manualQuestionForm.pembahasan}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, pembahasan: e.target.value })}
                          placeholder="Penjelasan ringkas kunci jawaban..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Gambar / Diagram / Ilustrasi Soal (Opsional) */}
                    <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-indigo-600" />
                          <span>Gambar / Diagram Soal (Opsional):</span>
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Biarkan kosong jika soal teks biasa (tanpa gambar)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={manualQuestionForm.gambar}
                          onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, gambar: e.target.value })}
                          placeholder="Tempel URL gambar (https://...) atau unggah berkas gambar..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <label className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 flex items-center gap-1.5">
                          <Upload size={12} />
                          <span>Unggah Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  Swal.fire({
                                    title: 'Ukuran Gambar Terlalu Besar',
                                    text: 'Ukuran berkas gambar maksimal 2 MB agar performa ujian lancar.',
                                    icon: 'warning',
                                    confirmButtonColor: '#4f46e5'
                                  });
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (loadEvt) => {
                                  const b64 = loadEvt.target?.result as string;
                                  if (b64) {
                                    setManualQuestionForm(prev => ({ ...prev, gambar: b64 }));
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                        {manualQuestionForm.gambar && (
                          <button
                            type="button"
                            onClick={() => setManualQuestionForm({ ...manualQuestionForm, gambar: '' })}
                            className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition shrink-0"
                            title="Hapus Gambar"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      {/* Preview Gambar jika diisi */}
                      {manualQuestionForm.gambar && (
                        <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            <img
                              src={manualQuestionForm.gambar}
                              alt="Preview Soal"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-600 flex-1">
                            <p className="font-bold text-slate-800">✅ Gambar Soal Terpasang</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-sm">
                              {manualQuestionForm.gambar.startsWith('data:image') ? 'Gambar Lokal (Data URL Terkompresi)' : manualQuestionForm.gambar}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveManualQuestion(attachSoalModal)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                      >
                        <Save size={13} />
                        <span>
                          {manualQuestionForm.editingIndex !== null ? 'Simpan Perubahan Butir Soal' : 'Tambahkan ke Jadwal Ini'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: TEMPEL BANYAK SOAL (BULK PASTE) */}
                {inputSoalMode === 'bulk' && (
                  <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Copy size={14} className="text-indigo-600" />
                        <span>Tempel Teks Soal dari Dokumen (Word / Notepad)</span>
                      </h4>
                      {detectedBulkCount > 0 && (
                        <span className="font-bold font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          {detectedBulkCount} Butir Soal Terdeteksi
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Salin soal yang sudah Anda ketik di Microsoft Word, Google Docs, atau Notepad, lalu tempelkan di kotak di bawah. Format standar:
                    </p>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 space-y-0.5">
                      <p className="text-slate-400">// Contoh Format Teks:</p>
                      <p>1. Apa lambang sila ketiga Pancasila?</p>
                      <p>A. Bintang</p>
                      <p>B. Rantai</p>
                      <p>C. Pohon Beringin</p>
                      <p>D. Padi dan Kapas</p>
                      <p className="text-emerald-700 font-bold">Kunci: C</p>
                    </div>

                    <textarea
                      rows={8}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="Tempelkan naskah butiran soal di sini..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        {detectedBulkCount > 0
                          ? `Siap mengonversi ${detectedBulkCount} butir soal ke jadwal sesi ini.`
                          : 'Ketik atau tempel teks soal di atas.'}
                      </span>
                      <button
                        type="button"
                        disabled={!bulkPasteText.trim()}
                        onClick={() => handleSaveBulkQuestions(attachSoalModal)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save size={13} />
                        <span>Simpan & Terapkan ke Jadwal Ini</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: PILIH DARI BANK SOAL YANG ADA */}
                {inputSoalMode === ('existing' as any) && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <label className="font-bold text-slate-800 text-xs block">
                      Hubungkan dari Paket Bank Soal yang Tersedia di Bank Soal:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedBankIdToLink}
                        onChange={(e) => setSelectedBankIdToLink(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      >
                        <option value="">-- Pilih Paket Bank Soal --</option>
                        {recommendedBanks.length > 0 && (
                          <optgroup label="Sesuai Mata Pelajaran Ini">
                            {recommendedBanks.map((b: any) => (
                              <option key={`rec-${b.id}`} value={b.id}>
                                {b.id} - {b.mapel} (Kelas {b.kelas}) [{b.jumlahSoal || (b.soalList && b.soalList.length) || 20} Soal]
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Seluruh Bank Soal">
                          {allBank.map((b: any) => (
                            <option key={`all-${b.id}`} value={b.id}>
                              {b.id} - {b.mapel} (Kelas {b.kelas}) [{b.jumlahSoal || (b.soalList && b.soalList.length) || 20} Soal]
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <button
                        type="button"
                        disabled={!selectedBankIdToLink || selectedBankIdToLink === attachSoalModal.bankSoalId}
                        onClick={() => handleLinkExistingBankSoal(attachSoalModal.id, selectedBankIdToLink)}
                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50 shrink-0"
                      >
                        Hubungkan Paket
                      </button>
                    </div>
                  </div>
                )}

                {/* DAFTAR BUTIR SOAL TERHUBUNG */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <BookOpen size={14} className="text-cyan-600" />
                      <span>Daftar Butir Soal Terpasang pada Jadwal Ini ({attachedQuestions.length} Butir)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Tersimpan di Sesi & Bank Soal</span>
                  </div>

                  {attachedQuestions.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                      <FileQuestion size={28} className="mx-auto text-slate-400" />
                      <p className="font-bold text-slate-700 text-xs">Jadwal Ini Belum Memiliki Butir Soal</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        Gunakan tab <b>✍️ Ketik Soal Manual</b> di atas atau <b>📋 Tempel Banyak Soal</b> untuk langsung mengisi butir-butir soal ujian untuk sesi ini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {attachedQuestions.map((q: any, idx: number) => {
                        let parsedOpsi: any[] = [];
                        try {
                          if (Array.isArray(q.opsi)) {
                            parsedOpsi = q.opsi;
                          } else if (q.opsi && typeof q.opsi === 'object') {
                            parsedOpsi = Object.entries(q.opsi).map(([k, v]) => ({
                              label: k.toUpperCase(),
                              text: String(v)
                            }));
                          } else if (typeof q.opsi === 'string' && q.opsi.startsWith('[')) {
                            parsedOpsi = JSON.parse(q.opsi);
                          } else if (typeof q.opsi === 'string') {
                            parsedOpsi = q.opsi.split(',');
                          }
                        } catch {
                          parsedOpsi = [];
                        }

                        return (
                          <div key={q.id || `q-${idx}`} className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 hover:border-indigo-200 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 leading-relaxed">
                                    {idx + 1}. {q.pertanyaan}
                                  </span>
                                  {q.gambar ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold shrink-0">
                                      <ImageIcon size={10} />
                                      <span>Bergambar</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] shrink-0">
                                      Teks Saja
                                    </span>
                                  )}
                                </div>
                                {q.gambar && (
                                  <div className="pt-1 flex items-center gap-2">
                                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                      <img
                                        src={q.gambar}
                                        alt="Thumbnail Soal"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-500 italic truncate max-w-xs">
                                      {q.gambar.startsWith('data:image') ? 'Gambar Lokal Terlampir' : q.gambar}
                                    </span>
                                  </div>
                                )}
                                {q.pembahasan && (
                                  <p className="text-[10px] text-slate-500 italic">
                                    💡 Pembahasan: {q.pembahasan}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px]">
                                  Kunci: {String(q.kunci).toUpperCase()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestionInSession(q, idx)}
                                  className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition"
                                  title="Edit Soal Ini"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionFromSession(attachSoalModal, idx)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                                  title="Hapus Soal Ini"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {parsedOpsi.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 pl-4">
                                {parsedOpsi.map((opt: any, oIdx: number) => {
                                  const label = typeof opt === 'object' ? opt.label || String.fromCharCode(65 + oIdx) : String.fromCharCode(65 + oIdx);
                                  const text = typeof opt === 'object' ? opt.text : String(opt);
                                  const isCorrect = String(label).toUpperCase() === String(q.kunci).toUpperCase();
                                  return (
                                    <div key={`opt-${oIdx}`} className={`px-2.5 py-1 rounded-xl border transition ${
                                      isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50/70 border-slate-100'
                                    }`}>
                                      <span className="font-mono mr-1.5 font-bold">{label}.</span>
                                      <span>{text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Total Terpasang: <b className="text-slate-800">{attachedQuestions.length} Butir Soal</b>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachSoalModal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
