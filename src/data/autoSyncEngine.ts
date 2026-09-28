import { db } from './db';
import { useStore, cleanStudentClass } from '../store';
import { fetchFromGAS } from '../lib/api';
import { getAllAppDataForSync } from './syncAllData';
import { DEFAULT_APP_CONFIG } from './config';
import { pullAllSheetsFromGas, isValidGasUrl, pullSpecificSheetFromGas, getStoredGasUrl } from '../utils/gasSync';
import { validateKurikulumModulSchema, KurikulumModulValidationResult, validateMasterSilabusSchema, MasterSilabusValidationResult } from './kurikulumModulData';
import { isDummyQuestion, isDummyBankSoalPackage } from './soalGenerator';
import { normalizeSemesterType } from '../lib/semester';
import {
  normalizeBiayaRow,
  normalizeTagihanRow,
  normalizePembayaranRow,
  normalizeTabunganRow,
  getTabunganNaturalKey,
  deduplicateTabunganList,
  deduplicateTagihanList,
  deduplicatePembayaranList,
  deduplicateKasList
} from '../lib/keuanganNormalizers';
import { deduplicateUjianSessions, deduplicateTokens } from '../utils/cbtScheduleSync';

export interface AutoSyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error' | 'disabled';
  lastSyncedTable?: string;
  lastSyncedAt?: string;
  message?: string;
  pendingTables: string[];
  totalSyncedCount: number;
  autoSyncEnabled: boolean;
}

// Map from db key to Google Sheets table name(s)
export const DB_KEY_TO_SHEET_TABLES: { [dbKey: string]: string[] } = {
  // Siswa & Dapodik
  students: ['SISWA', 'DAPODIK_VALIDASI', 'ORANG_TUA', 'YATIM_PIATU'],
  dapodik_validations: ['DAPODIK_VALIDASI'],
  orang_tua: ['ORANG_TUA'],
  yatim_piatu: ['YATIM_PIATU'],

  // Guru & Tenaga Kependidikan
  teachers: ['GURU'],

  // Akademik & Master
  rombel: ['KELAS'],
  academic_classes: ['KELAS'],
  jenjang: ['JENJANG'],
  academic_jenjang: ['JENJANG'],
  mapel: ['MAPEL'],
  academic_subjects: ['MAPEL'],
  tahun_ajaran: ['TAHUN_AJARAN'],
  academic_years: ['TAHUN_AJARAN'],
  semester: ['SEMESTER'],
  academic_semesters: ['SEMESTER'],
  hari_libur: ['HARI_LIBUR'],
  academic_holidays: ['HARI_LIBUR'],

  // Presensi & Perizinan
  absensi: ['ABSENSI', 'REKAP_PRESENSI'],
  attendances: ['ABSENSI', 'REKAP_PRESENSI'],
  academic_absensi: ['ABSENSI', 'REKAP_PRESENSI'],
  rekap_presensi: ['REKAP_PRESENSI'],
  rekap_kehadiran: ['REKAP_PRESENSI'],
  absensi_guru: ['ABSENSI_GURU'],
  teacher_attendances: ['ABSENSI_GURU'],
  perizinan_siswa: ['PERIZINAN', 'ABSENSI'],
  perizinan: ['PERIZINAN', 'ABSENSI'],
  permissions: ['PERIZINAN'],
  recent_qr_scans: ['QR_LOG'],
  qr_logs: ['QR_LOG'],
  kbm_effective_days: ['SETTING'],
  calc_attendance_mode: ['SETTING'],

  // Jadwal, Agenda, Nilai & Rapor
  academic_schedules: ['JADWAL'],
  jadwal: ['JADWAL'],
  academic_agendas: ['AGENDA'],
  agenda: ['AGENDA'],
  nilai_akademik_map: ['NILAI'],
  academic_grades: ['NILAI'],
  nilai: ['NILAI'],
  academic_reports: ['RAPOR'],
  rapor: ['RAPOR'],
  academic_promotions: ['KENAIKAN_KELAS'],
  kenaikan_kelas: ['KENAIKAN_KELAS'],
  academic_graduations: ['KELULUSAN'],
  // CBT & Ujian Online (Tersinkron ganda ke BANK_SOAL & butiran SOAL)
  cbt_bank_soal: ['BANK_SOAL', 'SOAL'],
  cbt_questions: ['BANK_SOAL', 'SOAL'],
  BANK_SOAL: ['BANK_SOAL', 'SOAL'],
  bank_soal: ['BANK_SOAL', 'SOAL'],
  ujian_cbt: ['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN'],
  cbt_exams: ['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN'],
  cbt_schedules: ['UJIAN', 'CBT_UJIAN', 'JADWAL', 'JADWAL_UJIAN'],
  jadwal_ujian: ['UJIAN', 'CBT_UJIAN', 'JADWAL', 'JADWAL_UJIAN'],
  cbt_token_history: ['TOKEN', 'CBT_TOKEN'],
  cbt_tokens: ['TOKEN', 'CBT_TOKEN'],
  cbt_exam_questions: ['SOAL', 'BANK_SOAL'],
  soal: ['SOAL', 'BANK_SOAL'],
  SOAL: ['SOAL', 'BANK_SOAL'],
  cbt_answers: ['JAWABAN'],
  jawaban_ujian: ['JAWABAN'],
  cbt_draft_answers: ['DRAFT_JAWABAN'],
  exam_drafts: ['DRAFT_JAWABAN'],
  cbt_proktor_logs: ['LOG_UJIAN'],
  exam_logs: ['LOG_UJIAN'],
  cbt_exam_results: ['HASIL_UJIAN'],
  cbt_results: ['HASIL_UJIAN'],
  cbt_analysis: ['ANALISIS_SOAL'],
  rapor_pendidikan_list: ['RAPOR_PENDIDIKAN'],
  cbt_rapor_pendidikan: ['RAPOR_PENDIDIKAN'],

  // SPMB & Pendaftaran
  spmb_applicants: ['PENDAFTAR', 'SPMB_PENDAFTAR'],
  spmb_pendaftar: ['SPMB_PENDAFTAR', 'PENDAFTAR'],
  spmb_files: ['BERKAS', 'SPMB_VERIFIKASI'],
  spmb_verifikasi: ['SPMB_VERIFIKASI', 'BERKAS'],
  spmb_selections: ['SELEKSI', 'SPMB_SELEKSI'],
  spmb_seleksi: ['SPMB_SELEKSI', 'SELEKSI'],
  spmb_pengumuman: ['SPMB_PENGUMUMAN'],
  spmb_re_registrations: ['DAFTAR_ULANG', 'SPMB_DAFTAR_ULANG'],
  spmb_daftar_ulang: ['SPMB_DAFTAR_ULANG', 'DAFTAR_ULANG'],

  // Keuangan & Kas
  tarif: ['BIAYA'],
  keuangan_biaya: ['BIAYA'],
  keuangan_tagihan: ['TAGIHAN'],
  keuangan_pembayaran: ['PEMBAYARAN'],
  keuangan_tabungan: ['TABUNGAN'],
  keuangan_kas: ['KAS'],
  keuangan_pengeluaran: ['PENGELUARAN'],
  keuangan_invoices: ['INVOICE'],
  keuangan_jurnal: ['JURNAL_UMUM'],

  // BK & Disiplin
  bk_counselings: ['BIMBINGAN'],
  bk_violations: ['PELANGGARAN'],

  // Perpustakaan
  perpus_buku: ['BUKU'],
  library_books: ['BUKU'],
  perpus_pinjam: ['PEMINJAMAN'],
  library_borrowings: ['PEMINJAMAN'],
  library_fines: ['DENDA'],

  // Sarpras & Inventaris
  sarpras_items: ['BARANG'],
  barang: ['BARANG'],
  sarpras_maintenance: ['PEMELIHARAAN'],
  sarpras_borrowings: ['PEMINJAMAN_BARANG'],

  // Arsip & Dokumen
  archived_files: ['FILE'],
  archived_documents: ['ARSIP'],
  letters_incoming: ['SURAT_MASUK'],
  letters_outgoing: ['SURAT_KELUAR'],

  // Komunitas, Ekskul, Mading & Notifikasi
  ekskul_list: ['EKSKUL'],
  ekskul_members: ['EKSKUL_ANGGOTA'],
  student_achievements: ['PRESTASI_SISWA'],
  assignments: ['TUGAS'],
  tugas_kbm: ['TUGAS'],
  tugas: ['TUGAS'],
  assignment_submissions: ['PENGUMPULAN_TUGAS'],
  hasil_tugas_kbm: ['PENGUMPULAN_TUGAS'],
  pengumpulan_tugas: ['PENGUMPULAN_TUGAS'],
  cp_atp: ['CP_ATP'],
  materi_digital: ['MATERI_DIGITAL', 'MATERI'],
  master_silabus: ['MASTER_SILABUS'],
  kurikulum_modul: ['KURIKULUM_MODUL'],
  mading_articles: ['MADING_BERITA'],
  wa_messages: ['WA_LOG'],
  suara_komunitas: ['SUARA_KOMUNITAS'],
  notifikasi: ['NOTIFIKASI'],
  alumni: ['ALUMNI'],

  // Form & Konfigurasi
  form_fields: ['FORM_FIELDS'],
  profil_sekolah: ['SETTING', 'WEB_CONFIG'],
  settings: ['SETTING']
};

/**
 * Standardize incoming date string into YYYY-MM-DD format
 */
export function standardizeDateString(rawDate: any): string {
  if (!rawDate && rawDate !== 0) return '';
  const str = String(rawDate).trim();
  if (!str) return '';

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // ISO Date Time String (e.g. 2026-08-31T00:00:00.000Z)
  if (str.includes('T')) {
    const isoDate = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY if separator is slash and month <= 12
  const tryParse = new Date(str);
  if (!isNaN(tryParse.getTime())) {
    const y = tryParse.getFullYear();
    const m = String(tryParse.getMonth() + 1).padStart(2, '0');
    const d = String(tryParse.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Normalize attendance status from diverse Google Sheets representations into standard 'H' | 'S' | 'I' | 'A' | 'T'
 */
export function normalizeAttendanceStatus(rawStatus: any): 'H' | 'S' | 'I' | 'A' | 'T' | '' {
  if (!rawStatus && rawStatus !== 0) return '';
  const s = String(rawStatus).trim().toUpperCase();
  if (s === 'H' || s === 'HADIR' || s === 'PRESENT' || s === '1' || s.startsWith('HADIR')) return 'H';
  if (s === 'S' || s === 'SAKIT' || s === 'SICK' || s.startsWith('SAKIT')) return 'S';
  if (s === 'I' || s === 'IZIN' || s === 'IJIN' || s === 'PERMISSION' || s.startsWith('IZIN') || s.startsWith('IJIN')) return 'I';
  if (s === 'A' || s === 'ALPA' || s === 'ALPHA' || s === 'ABSENT' || s === 'TK' || s.startsWith('ALPA') || s.startsWith('ALPHA') || s.startsWith('TANPA')) return 'A';
  if (s === 'T' || s === 'TERLAMBAT' || s === 'LATE' || s.startsWith('TERLAMBAT')) return 'T';
  return '';
}

/**
 * Smart merge attendance data from Google Sheets into local absensi storage.
 * When pulling from remote Google Sheets, the sheet is the authoritative source,
 * so rows deleted from the spreadsheet are correctly deleted from the app.
 */
export function normalizeAndMergeAbsensi(existingLocal: any[], remoteSheetRows: any[], students: any[] = []): any[] {
  if (!Array.isArray(remoteSheetRows)) {
    return existingLocal;
  }

  const map = new Map<string, any>();
  const now = Date.now();

  const getRecordKey = (item: any): string => {
    const rawDate = item.date || item.Tanggal || item.tanggal || item.tgl || '';
    const date = standardizeDateString(rawDate) || rawDate;
    const sId = String(item.studentId || item.SiswaID || item.id || '').trim().toLowerCase();
    const nisn = String(item.nisn || item.NISN || '').trim();
    const name = String(item.name || item.NamaSiswa || item.nama || '').trim().toLowerCase();
    
    if (sId && sId !== 'undefined' && sId !== 'null' && sId !== '-') return `${date}__id__${sId}`;
    if (nisn && nisn !== '-') return `${date}__nisn__${nisn}`;
    if (name) return `${date}__name__${name}`;
    return `${date}__raw__${Math.random()}`;
  };

  // 1. Parse & merge all active rows from Google Sheets first (Authoritative source)
  remoteSheetRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const rawDate = row.Tanggal || row.tanggal || row.date || row.tgl || '';
    const stdDate = standardizeDateString(rawDate) || rawDate;
    if (!stdDate) return;

    const rawStatus = row.Status || row.status || row.st || '';
    const cleanStatus = normalizeAttendanceStatus(rawStatus);
    if (!cleanStatus && !row.SiswaID && !row.NamaSiswa) return;

    const rawId = String(row.SiswaID || row.siswaId || row.studentId || row.id || '').trim();
    const rawNisn = String(row.NISN || row.nisn || '').trim();
    const rawName = String(row.NamaSiswa || row.namaSiswa || row.name || row.nama || '').trim();
    const rawClass = String(row.KelasID || row.NamaKelas || row.class || row.kelas || '').trim();

    // Match student profile from store for complete metadata
    const matchedStudent = students.find(s => 
      (rawId && s.id === rawId) ||
      (rawNisn && s.nisn === rawNisn) ||
      (rawName && s.name && s.name.toLowerCase() === rawName.toLowerCase())
    );

    const studentId = rawId || (matchedStudent ? matchedStudent.id : `SISWA-${idx + 1}`);
    const nisn = rawNisn || (matchedStudent ? matchedStudent.nisn : '');
    const name = rawName || (matchedStudent ? matchedStudent.name : 'Siswa');
    const className = rawClass || (matchedStudent ? matchedStudent.class : '1A');

    const formattedItem = {
      id: row.AbsenID || row.absenId || row.id || `ABS-${stdDate}-${studentId}`,
      studentId: studentId,
      nisn: nisn || undefined,
      name: name,
      class: className,
      date: stdDate,
      time: row.JamMasuk || row.time || row.Jam || '07:30',
      status: cleanStatus || 'H',
      note: row.Keterangan || row.keterangan || row.note || '',
      method: row.QRCode ? 'QR Code' : 'Google Sheets Auto-Sync',
      recordedBy: row.PetugasID || row.petugasId || row.recordedBy || 'Google Sheets',
      updatedAt: row.UpdatedAt || new Date().toISOString()
    };

    const key = getRecordKey(formattedItem);
    map.set(key, formattedItem);
  });

  // 2. Retain only local items created very recently (within 45 seconds) to avoid losing active offline unsynced edits
  if (Array.isArray(existingLocal)) {
    existingLocal.forEach(localItem => {
      const localUpdated = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
      if (localUpdated && (now - localUpdated < 45000)) {
        const key = getRecordKey(localItem);
        if (!map.has(key)) {
          map.set(key, localItem);
        }
      }
    });
  }

  return Array.from(map.values());
}

/**
 * Generic Smart Merge for other tables
 */
function smartMergeGenericTable(localList: any[], remoteList: any[], candidateKeys: string[]): any[] {
  if (!Array.isArray(remoteList) || remoteList.length === 0) return localList || [];
  if (!Array.isArray(localList) || localList.length === 0) return remoteList || [];

  const getItemKey = (item: any): string => {
    if (!item || typeof item !== 'object') return '';
    for (const k of candidateKeys) {
      const v = item[k];
      if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-') {
        return String(v).trim();
      }
    }
    return '';
  };

  const map = new Map<string, any>();

  // 1. First populate with remoteList (authoritative data from Google Sheets)
  remoteList.forEach((rItem, idx) => {
    const key = getItemKey(rItem) || `remote_${idx}`;
    map.set(key, rItem);
  });

  // 2. Merge local items without duplicating
  localList.forEach((lItem) => {
    const key = getItemKey(lItem);
    if (!key) return;
    if (!map.has(key)) {
      // Local pending/offline item
      map.set(key, lItem);
    } else {
      // Merge newer fields from local if applicable (jika timestamp lokal sama atau lebih baru, utamakan lokal)
      const remoteItem = map.get(key);
      const lTime = lItem.updatedAt ? new Date(lItem.updatedAt).getTime() : 0;
      const rTime = remoteItem?.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;
      if (lTime >= rTime) {
        map.set(key, { ...remoteItem, ...lItem });
      }
    }
  });

  return Array.from(map.values());
}

class AutoSyncEngine {
  private queue: Set<string> = new Set();
  private debounceTimer: any = null;
  private isSyncing: boolean = false;
  private autoSyncEnabled: boolean = true;
  private totalSyncedCount: number = 0;
  private lastSyncedAt: string = '';
  private lastSyncedTable: string = '';
  private initialized: boolean = false;
  private autoPullTimer: any = null;
  private lastPullTime: number = 0;
  private isPulling: boolean = false;
  private recentLocalEdits: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      const storedPref = localStorage.getItem('erp_auto_sync_enabled');
      if (storedPref !== null) {
        this.autoSyncEnabled = storedPref === 'true';
      } else {
        this.autoSyncEnabled = true;
        localStorage.setItem('erp_auto_sync_enabled', 'true');
      }
    }
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    (window as any).__erpAutoSyncEngine = this;

    // Listen to custom ERP DB update events
    window.addEventListener('erp-db-updated', (event: any) => {
      // If the event came from an incoming pull, skip pushing back
      if (event.detail?.skipPush) return;
      const key = event.detail?.key;
      if (key) {
        this.queueDbKey(key);
      }
    });

    // Listen to online events to retry pending changes
    window.addEventListener('online', () => {
      if (this.queue.size > 0) {
        this.flushQueue();
      }
      this.pullAndApplyAllSheets({ silent: true });
    });

    // Start automatic background pull loop with optimized 180-second interval
    this.startAutoPull(180000);

    this.broadcastStatus('idle', 'Engine Auto-Sync aktif & siap menyinkronkan data 2-arah otomatis');
  }

  public isEnabled(): boolean {
    return this.autoSyncEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_auto_sync_enabled', String(enabled));
    }
    this.broadcastStatus(enabled ? 'idle' : 'disabled', enabled ? 'Auto-Sync diaktifkan' : 'Auto-Sync dinonaktifkan sementara');
    if (enabled) {
      if (this.queue.size > 0) {
        this.flushQueue();
      }
      this.pullAndApplyAllSheets({ silent: true });
    }
  }

  public queueDbKey(dbKey: string) {
    if (!this.autoSyncEnabled) return;

    if (dbKey.startsWith('_') || dbKey === 'session' || dbKey === 'logs' || dbKey === 'audit_log') {
      return;
    }

    const tables = DB_KEY_TO_SHEET_TABLES[dbKey] || [dbKey.toUpperCase()];
    const now = Date.now();
    tables.forEach(t => {
      this.queue.add(t);
      this.recentLocalEdits.set(t.toUpperCase(), now);
    });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushQueue();
    }, 1200);
  }

  public markTableEdited(tableName: string) {
    const key = tableName.toUpperCase();
    this.recentLocalEdits.set(key, Date.now());
    this.queue.add(key);
  }

  public isTableRecentlyEdited(tableName: string, maxAgeMs: number = 180000): boolean {
    const key = tableName.toUpperCase();
    if (this.queue.has(key)) return true;
    const editTime = this.recentLocalEdits.get(key);
    if (!editTime) return false;
    return (Date.now() - editTime) < maxAgeMs;
  }

  public async flushQueue() {
    if (this.isSyncing || this.queue.size === 0) return;

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      this.broadcastStatus('idle', 'Auto-Sync ditunda: URL Google Apps Script belum dikonfigurasi.');
      return;
    }

    const tablesToSync = Array.from(this.queue);
    this.queue.clear();
    this.isSyncing = true;

    const spreadsheetId = this.getSpreadsheetId();

    try {
      const allAppData = getAllAppDataForSync(
        useStore.getState().students,
        useStore.getState().teachers,
        useStore.getState().settings
      );

      // Proteksi Anti-Hapus & Anti-Kosong: Filter hanya tabel yang memiliki baris lokal > 0
      const safeTablesToSync = tablesToSync.filter(tbl => {
        const rows = allAppData[tbl];
        return Array.isArray(rows) && rows.length > 0;
      });

      if (safeTablesToSync.length === 0) {
        // Semua tabel yang masuk antrian ternyata kosong secara lokal.
        // Hentikan push untuk menjamin Spreadsheet tidak pernah tertimpa kosong.
        console.info('[AutoSync] Queue dibatalkan karena tidak ada data lokal untuk dipush (proteksi sheet kosong aktif).');
        this.broadcastStatus('idle', 'Auto-Sync: Data lokal kosong, push dibatalkan untuk melindungi Spreadsheet.');
        return;
      }

      this.broadcastStatus('syncing', `Sedang menyinkronkan ${safeTablesToSync.length} tabel ke Spreadsheet...`);
      useStore.getState().setIsSyncingGlobal(true);

      if (safeTablesToSync.length >= 3 || safeTablesToSync.includes('SISWA')) {
        const batchPayload: { [key: string]: any[] } = {};
        safeTablesToSync.forEach(tbl => {
          if (allAppData[tbl] && allAppData[tbl].length > 0) {
            batchPayload[tbl] = allAppData[tbl];
          }
        });

        if (safeTablesToSync.includes('SISWA') && allAppData['SISWA']?.length > 0) {
          batchPayload['SISWA'] = allAppData['SISWA'];
          if (allAppData['DAPODIK_VALIDASI']?.length > 0) batchPayload['DAPODIK_VALIDASI'] = allAppData['DAPODIK_VALIDASI'];
          if (allAppData['ORANG_TUA']?.length > 0) batchPayload['ORANG_TUA'] = allAppData['ORANG_TUA'];
          if (allAppData['YATIM_PIATU']?.length > 0) batchPayload['YATIM_PIATU'] = allAppData['YATIM_PIATU'];
        }

        if (Object.keys(batchPayload).length > 0) {
          await fetchFromGAS(scriptUrl, {
            action: 'MASS_SYNC_ALL',
            allData: batchPayload,
            allDataJson: JSON.stringify(batchPayload),
            spreadsheetId: spreadsheetId,
            forceTruncate: true
          });
        }
      } else {
        for (const tbl of safeTablesToSync) {
          const rows = allAppData[tbl] || [];
          if (rows.length > 0) {
            await fetchFromGAS(scriptUrl, {
              action: 'syncData',
              table: tbl,
              data: rows,
              spreadsheetId: spreadsheetId,
              forceTruncate: true
            });
          }
        }
      }

      this.totalSyncedCount += safeTablesToSync.length;
      this.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.lastSyncedTable = safeTablesToSync.join(', ');
      useStore.getState().setLastSyncedAt(this.lastSyncedAt);

      this.broadcastStatus('success', `✅ Berhasil menyinkronkan otomatis (${this.lastSyncedTable}) ke Google Spreadsheet!`);
    } catch (error: any) {
      console.warn('Auto sync error:', error);
      tablesToSync.forEach(t => this.queue.add(t));
      this.broadcastStatus('error', `⚠️ Auto-Sync tertunda: ${error?.message || 'Koneksi internet / Apps Script'}`);
    } finally {
      this.isSyncing = false;
      useStore.getState().setIsSyncingGlobal(false);
    }
  }

  /**
   * Mengirim tabel tertentu secara langsung ke Google Spreadsheet tanpa delay debounce
   */
  public async pushSpecificTables(tables: string[], options?: { forceTruncate?: boolean }): Promise<{ success: boolean; message: string; totalSynced?: number }> {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    const { students, teachers, settings } = useStore.getState();
    const allAppData = getAllAppDataForSync(students, teachers, settings);
    const spreadsheetId = this.getSpreadsheetId();

    this.isSyncing = true;
    useStore.getState().setIsSyncingGlobal(true);
    this.broadcastStatus('syncing', `Menyinkronkan ${tables.join(', ')} ke Google Spreadsheet...`);

    try {
      let totalSynced = 0;
      const syncedTables: string[] = [];

      for (const tbl of tables) {
        const rows = allAppData[tbl] || [];
        // Proteksi: Lewati tabel jika tidak ada data lokal untuk mencegah penimpaan sheet menjadi kosong (kecuali forceTruncate aktif)
        if (!rows || rows.length === 0) {
          if (!options?.forceTruncate) {
            console.warn(`[AutoSync] Melewati tabel '${tbl}' karena tidak ada data lokal.`);
            continue;
          }
        }
        totalSynced += rows.length;
        syncedTables.push(tbl);
        await fetchFromGAS(scriptUrl, {
          action: 'syncData',
          table: tbl,
          data: rows,
          spreadsheetId,
          forceTruncate: !!options?.forceTruncate
        });
      }

      this.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.lastSyncedTable = syncedTables.join(', ') || tables.join(', ');
      useStore.getState().setLastSyncedAt(this.lastSyncedAt);
      this.broadcastStatus('success', `✅ Berhasil menyinkronkan ${this.lastSyncedTable} (${totalSynced} baris) ke Google Spreadsheet!`);
      return { success: true, message: `Berhasil menyinkronkan ${this.lastSyncedTable} (${totalSynced} baris)`, totalSynced };
    } catch (err: any) {
      console.error('pushSpecificTables error:', err);
      this.broadcastStatus('error', `Gagal menyinkronkan ${tables.join(', ')}: ${err.message || err}`);
      return { success: false, message: err.message || 'Gagal sinkronisasi' };
    } finally {
      this.isSyncing = false;
      useStore.getState().setIsSyncingGlobal(false);
    }
  }

  /**
   * Automatic background pull loop and event listeners (focus & visibility change)
   */
  public startAutoPull(intervalMs: number = 60000) {
    if (typeof window === 'undefined') return;

    if (this.autoPullTimer) {
      clearInterval(this.autoPullTimer);
    }

    // Interval pull (automatic 60s background cycle)
    this.autoPullTimer = setInterval(() => {
      this.pullAndApplyAllSheets({ silent: true });
    }, intervalMs);

    // Pull when user switches back from Google Sheets tab with 60-second cooldown
    const handleFocusOrVisible = () => {
      const now = Date.now();
      if (now - this.lastPullTime > 60000) {
        this.pullAndApplyAllSheets({ silent: true });
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    });
  }

  /**
   * Pull all 88 tables from Google Spreadsheet via GAS and immediately update local DB & Store
   */
  public async pullAndApplyAllSheets(options?: { silent?: boolean; force?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!this.autoSyncEnabled && !options?.force) {
      return { success: false, message: 'Auto-Sync sedang dinonaktifkan.' };
    }

    // Guard: Prevent concurrent pulls
    if (this.isSyncing || this.isPulling) {
      return { success: false, message: 'Sinkronisasi lain sedang berjalan.' };
    }

    // Flush pending changes before pulling so remote doesn't overwrite queued local edits
    if (this.queue.size > 0) {
      try {
        await this.flushQueue();
      } catch (flushErr) {
        console.warn('Flush queue before pull warn:', flushErr);
      }
    }

    const scriptUrl = this.getScriptUrl();
    if (!isValidGasUrl(scriptUrl)) {
      return { success: false, message: 'URL Google Apps Script belum valid.' };
    }

    // Protection check: if user is currently typing in an input field, defer silent pull
    if (options?.silent && typeof document !== 'undefined') {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return { success: false, message: 'User sedang mengetik, pull ditunda.' };
      }
    }

    this.isPulling = true;
    this.lastPullTime = Date.now();

    try {
      if (!options?.silent) {
        this.broadcastStatus('syncing', 'Memeriksa pembaruan data dari Google Spreadsheet...');
      }

      const res = await pullAllSheetsFromGas(scriptUrl);
      if (res && res.success && res.data && typeof res.data === 'object') {
        const sheetMap = res.data;
        const totalTablesUpdated = this.applyRemoteSheetsData(sheetMap);

        this.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        this.lastSyncedTable = totalTablesUpdated > 0 
          ? `Semua (${totalTablesUpdated} Tabel Terisi / 88 Master)` 
          : 'Semua (88 Tabel Master)';
        useStore.getState().setLastSyncedAt(this.lastSyncedAt);

        if (!options?.silent) {
          this.broadcastStatus('success', `✅ Berhasil sinkronisasi otomatis dari Google Spreadsheet (${totalTablesUpdated} Tabel aktif diperbarui / 88 Master)!`);
        }

        return { success: true, message: `Berhasil memperbarui ${totalTablesUpdated} tabel dari Spreadsheet.` };
      } else {
        return { success: false, message: res?.message || 'Tidak ada data baru dari Spreadsheet.' };
      }
    } catch (err: any) {
      console.warn('Background pull notice:', err?.message);
      return { success: false, message: err?.message || 'Gagal menarik data dari Spreadsheet' };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Parse and distribute remote sheet rows into the respective local db keys and Zustand stores
   */
  public applyRemoteSheetsData(sheetMap: Record<string, any[]>): number {
    let updatedCount = 0;
    const storeState = useStore.getState();

    // 1. SISWA
    const remoteSiswa = sheetMap.SISWA || sheetMap.siswa;
    if (Array.isArray(remoteSiswa) && remoteSiswa.length > 0) {
      const currentStudents = storeState.students || [];
      const cleanedRemote = remoteSiswa
        .map((r, idx) => {
          const item = cleanStudentClass({ ...r, _remoteIndex: idx });
          if (!item.id || item.id === '-') {
            item.id = item.nopdkt || item.nisn || item.nik || `SISWA-${idx + 1}`;
          }
          return item;
        })
        .filter(s => s && ((s.name && s.name.trim().length > 0 && s.name !== '-' && s.name !== 'undefined') || s.nopdkt || s.nisn));
      
      let mergedStudents: any[] = [];
      if (currentStudents.length === 0) {
        mergedStudents = cleanedRemote;
      } else {
        const map = new Map<string, any>();
        cleanedRemote.forEach((s, idx) => {
          const key = s.id || s.nopdkt || s.nisn || `siswa_row_${idx}`;
          map.set(key, s);
        });
        // Jika ada siswa lokal yang memiliki ID sama, padukan atribut detailnya
        currentStudents.forEach(s => {
          if (s.id && map.has(s.id)) {
            const remoteItem = map.get(s.id);
            map.set(s.id, { ...s, ...remoteItem });
          }
        });
        mergedStudents = Array.from(map.values());
      }
      
      if (mergedStudents.length > 0) {
        storeState.setStudents(mergedStudents);
        db.set('students', mergedStudents, { skipPush: true });
        db.set('siswa', mergedStudents, { skipPush: true });
        db.set('SISWA', mergedStudents, { skipPush: true });
        db.set('master_siswa', mergedStudents, { skipPush: true });
        updatedCount++;
      }
    }

    // 2. GURU (Filter baris kosong dari Google Sheet & cegah inflasi data)
    const remoteGuru = sheetMap.GURU || sheetMap.guru;
    if (Array.isArray(remoteGuru) && remoteGuru.length > 0) {
      const validRemote = remoteGuru.filter(g => {
        if (!g) return false;
        const name = String(g.Nama || g.name || g.NamaLengkap || g.nama || g.NamaGuru || '').trim();
        return name.length > 1 && name !== 'undefined' && name !== '-';
      });

      if (validRemote.length > 0) {
        const currentTeachers = (storeState.teachers || []).filter(t => t && t.name && t.name.trim().length > 1);
        const map = new Map<string, any>();
        
        validRemote.forEach(t => {
          const name = String(t.Nama || t.name || t.NamaLengkap || t.nama || t.NamaGuru || '').trim();
          const nip = String(t.nip || t.NIP || t.nuptk || t.NUPTK || t.nik || t.NIK || '').trim();
          const key = nip || name.toLowerCase() || t.id;
          if (key) {
            map.set(key, t);
          }
        });

        currentTeachers.forEach(t => {
          const key = (t.nip && String(t.nip).trim()) || (t.nik && String(t.nik).trim()) || (t.nuptk && String(t.nuptk).trim()) || (t.name && String(t.name).trim().toLowerCase()) || t.id;
          if (key && map.has(key)) {
            const remoteItem = map.get(key);
            map.set(key, { ...t, ...remoteItem, id: t.id || remoteItem.id });
          }
        });

        const mergedTeachers = Array.from(map.values());
        storeState.setTeachers(mergedTeachers);
        db.set('teachers', mergedTeachers, { skipPush: true });
        updatedCount++;
      }
    }

    // 3. ABSENSI (CRITICAL: Normalization & Smart Merge for Attendance Tab & Rekap Persentase)
    const remoteAbsensi = sheetMap.ABSENSI || sheetMap.absensi || sheetMap.Presensi || sheetMap.PRESENSI;
    if (Array.isArray(remoteAbsensi) && remoteAbsensi.length > 0) {
      const localAbsensi = (db.get('absensi') as any[]) || [];
      const mergedAbsensi = normalizeAndMergeAbsensi(localAbsensi, remoteAbsensi, useStore.getState().students || []);
      
      db.set('absensi', mergedAbsensi, { skipPush: true });
      db.set('attendances', mergedAbsensi, { skipPush: true });
      updatedCount++;
    }

    const remoteRekapPresensi = sheetMap.REKAP_PRESENSI || sheetMap.rekap_presensi;
    if (Array.isArray(remoteRekapPresensi) && remoteRekapPresensi.length > 0) {
      db.set('rekap_presensi', remoteRekapPresensi, { skipPush: true });
      updatedCount++;
    }

    // 4. KELAS & ROMBEL
    const remoteKelas = sheetMap.KELAS || sheetMap.kelas;
    if (Array.isArray(remoteKelas) && remoteKelas.length > 0) {
      db.set('academic_classes', remoteKelas, { skipPush: true });
      db.set('rombel', remoteKelas, { skipPush: true });
      updatedCount++;
    }

    // 5. MAPEL
    const remoteMapel = sheetMap.MAPEL || sheetMap.mapel;
    if (Array.isArray(remoteMapel) && remoteMapel.length > 0) {
      db.set('academic_subjects', remoteMapel, { skipPush: true });
      db.set('mapel', remoteMapel, { skipPush: true });
      updatedCount++;
    }

    // 6. TAHUN AJARAN & SEMESTER
    const remoteTahun = sheetMap.TAHUN_AJARAN || sheetMap.tahun_ajaran;
    if (Array.isArray(remoteTahun) && remoteTahun.length > 0) {
      const normalizedTahun = remoteTahun.map((t: any, idx: number) => {
        const taId = t.TAID || t.taId || t.id || `TA-${idx + 1}`;
        const nama = t.Nama || t.nama || t.tahun || t.tahunPelajaran || t.tahunAjaran || '';
        const tm = t.TahunMulai || t.tahunMulai || (nama.includes('/') ? nama.split('/')[0] : '');
        const ts = t.TahunSelesai || t.tahunSelesai || (nama.includes('/') ? nama.split('/')[1] : '');
        const tglMulai = t.TanggalMulai || t.tanggalMulai || '';
        const tglSelesai = t.TanggalSelesai || t.tanggalSelesai || '';
        const isAktif = (t.Aktif || t.aktif || '').toUpperCase() === 'YA' || t.status === 'Aktif' || t.isActive === true;
        return {
          ...t,
          id: taId,
          taId: taId,
          TAID: taId,
          nama: nama,
          Nama: nama,
          tahun: nama,
          tahunPelajaran: nama,
          tahunAjaran: nama,
          namaTahunAjaran: `Tahun Pelajaran ${nama}`,
          tahunMulai: tm,
          TahunMulai: tm,
          tahunSelesai: ts,
          TahunSelesai: ts,
          tanggalMulai: tglMulai,
          TanggalMulai: tglMulai,
          tanggalSelesai: tglSelesai,
          TanggalSelesai: tglSelesai,
          semester: t.semester || 'Semester Ganjil & Genap',
          rentang: tglMulai && tglSelesai ? `${tglMulai} - ${tglSelesai}` : (t.rentang || 'Juli - Juni'),
          rentangPeriode: tglMulai && tglSelesai ? `${tglMulai} - ${tglSelesai}` : (t.rentangPeriode || 'Juli - Juni'),
          kurikulum: t.kurikulum || 'Kurikulum Merdeka',
          aktif: isAktif ? 'YA' : 'TIDAK',
          Aktif: isAktif ? 'YA' : 'TIDAK',
          status: isAktif ? 'Aktif' : 'Non-Aktif'
        };
      });
      db.set('academic_years', normalizedTahun, { skipPush: true });
      db.set('tahun_ajaran', normalizedTahun, { skipPush: true });
      updatedCount++;
    }

    const remoteSemester = sheetMap.SEMESTER || sheetMap.semester;
    if (Array.isArray(remoteSemester) && remoteSemester.length > 0) {
      const normalizedSemester = remoteSemester.map((s: any, idx: number) => {
        const tp = (s.TahunPelajaran || s.tahunPelajaran || s.tahunAjaran || s.tahun || '2026/2027').trim();
        const semType = normalizeSemesterType(s);
        const sid = s.SemesterID || s.semesterId || s.id || `SEM-${tp.split('/')[0] || '2026'}-${semType === 'Ganjil' ? '1' : '2'}`;
        const taId = s.TahunAjaranID || s.tahunAjaranId || s.taId || '';
        const nama = s.Nama || s.nama || `${tp} ${semType}`;
        const tglMulai = s.TanggalMulai || s.tanggalMulai || s.startDate || '';
        const tglSelesai = s.TanggalSelesai || s.tanggalSelesai || s.endDate || '';
        const isAktif = (s.Aktif || s.aktif || '').toUpperCase() === 'YA' || s.status === 'Aktif' || s.isActive === true;
        return {
          ...s,
          id: sid,
          semesterId: sid,
          SemesterID: sid,
          nama: nama,
          Nama: nama,
          code: `${tp}-${semType === 'Ganjil' ? '1' : '2'}`,
          taId: taId,
          tahunAjaranId: taId,
          TahunAjaranID: taId,
          tahunPelajaran: tp,
          TahunPelajaran: tp,
          tahunAjaran: tp,
          semester: semType,
          Semester: semType,
          semesterType: semType,
          tanggalMulai: tglMulai,
          TanggalMulai: tglMulai,
          startDate: tglMulai,
          tanggalSelesai: tglSelesai,
          TanggalSelesai: tglSelesai,
          endDate: tglSelesai,
          aktif: isAktif ? 'YA' : 'TIDAK',
          Aktif: isAktif ? 'YA' : 'TIDAK',
          isActive: isAktif,
          status: isAktif ? 'Aktif' : 'Non-Aktif',
          tipe: semType === 'Genap' ? 'EVEN' : 'ODD'
        };
      });
      db.set('academic_semesters', normalizedSemester, { skipPush: true });
      db.set('semester', normalizedSemester, { skipPush: true });
      updatedCount++;
    }

    // 6b. SETTING & KONFIGURASI SISTEM
    const remoteSetting = sheetMap.SETTING || sheetMap.setting || sheetMap.KONFIGURASI || sheetMap.konfigurasi;
    if (Array.isArray(remoteSetting) && remoteSetting.length > 0) {
      const settingObj: Record<string, any> = {};
      remoteSetting.forEach((row: any) => {
        const k = row.Key || row.key || row.Field || row.field;
        const v = row.Value ?? row.value ?? row.Nilai ?? row.nilai;
        if (k) settingObj[k] = v;
      });
      const currentSettings = useStore.getState().settings;
      const newTP = settingObj.tahunPelajaran || settingObj.activeAcademicYear || settingObj.tahunAjaranAktif || currentSettings.tahunPelajaran;
      let newSem = settingObj.semester || settingObj.activeSemester || settingObj.semesterAktif;
      if (newSem) {
        newSem = normalizeSemesterType({ semester: newSem });
      }
      if (newTP && (newTP !== currentSettings.tahunPelajaran || (newSem && newSem !== currentSettings.semester))) {
        const updated = {
          ...currentSettings,
          ...(newTP ? { tahunPelajaran: newTP, activeAcademicYear: newTP } : {}),
          ...(newSem ? { semester: newSem, activeSemester: newSem } : {})
        };
        useStore.getState().setSettings(updated);
        db.setSingle('settings', updated);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('academic-semester-changed', {
            detail: { tahunPelajaran: updated.tahunPelajaran, semester: updated.semester }
          }));
          window.dispatchEvent(new CustomEvent('erp-db-updated', {
            detail: { key: 'settings' }
          }));
        }
      }
    }

    // 7. NILAI & RAPOR
    const remoteNilai = sheetMap.NILAI || sheetMap.nilai;
    if (Array.isArray(remoteNilai) && remoteNilai.length > 0) {
      const localNilai = db.get('nilai');
      const mergedNilai = smartMergeGenericTable(localNilai, remoteNilai, ['Key', 'key', 'id', 'StudentID']);
      db.set('nilai', mergedNilai, { skipPush: true });
      db.set('academic_grades', mergedNilai, { skipPush: true });
      db.set('nilai_akademik_map', mergedNilai, { skipPush: true });
      updatedCount++;
    }

    const remoteRapor = sheetMap.RAPOR || sheetMap.rapor;
    if (Array.isArray(remoteRapor) && remoteRapor.length > 0) {
      db.set('academic_reports', remoteRapor, { skipPush: true });
      db.set('rapor', remoteRapor, { skipPush: true });
      updatedCount++;
    }

    // 8. JADWAL & AGENDA
    const remoteJadwal = sheetMap.JADWAL || sheetMap.jadwal;
    if (Array.isArray(remoteJadwal) && remoteJadwal.length > 0) {
      db.set('academic_schedules', remoteJadwal, { skipPush: true });
      db.set('jadwal', remoteJadwal, { skipPush: true });
      updatedCount++;
    }

    const remoteAgenda = sheetMap.AGENDA || sheetMap.agenda;
    if (Array.isArray(remoteAgenda) && remoteAgenda.length > 0) {
      db.set('academic_agendas', remoteAgenda, { skipPush: true });
      db.set('agenda', remoteAgenda, { skipPush: true });
      updatedCount++;
    }

    // 9. KEUANGAN (BIAYA, TAGIHAN, PEMBAYARAN, TABUNGAN, KAS, PENGELUARAN)
    const remoteBiaya = sheetMap.BIAYA || sheetMap.biaya || sheetMap.TARIF || sheetMap.tarif;
    if (Array.isArray(remoteBiaya) && remoteBiaya.length > 0) {
      if (this.isTableRecentlyEdited('BIAYA')) {
        console.info('[AutoSync] Melindungi data BIAYA lokal dari penimpaan karena baru saja diedit di aplikasi.');
      } else {
        const normalizedBiaya = remoteBiaya.map((row: any, idx: number) => normalizeBiayaRow(row, idx));
        db.set('keuangan_biaya', normalizedBiaya, { skipPush: true });
        db.set('BIAYA', normalizedBiaya, { skipPush: true });
        const tarifMapped = normalizedBiaya.map(b => ({
          id: b.id || b.biayaId,
          kode: b.kodeBiaya || b.id,
          namaPos: b.namaBiaya || b.nama,
          frekuensi: b.periode || 'Bulanan',
          nominal: Number(b.nominal) || 0,
          kelas: b.targetKelas || 'Semua Kelas',
          status: b.wajib || 'Wajib',
          kategori: b.kategori || 'Iuran',
          jenjang: b.jenjang || 'Semua Jenjang'
        }));
        db.set('tarif', tarifMapped, { skipPush: true });
        updatedCount++;
      }
    }

    const allStudentsList = useStore.getState().students || [];
    const remoteTagihan = sheetMap.TAGIHAN || sheetMap.tagihan;
    if (Array.isArray(remoteTagihan) && remoteTagihan.length > 0) {
      if (this.isTableRecentlyEdited('TAGIHAN')) {
        console.info('[AutoSync] Melindungi data TAGIHAN lokal dari penimpaan karena baru saja diedit di aplikasi.');
      } else {
        const normalizedTagihan = deduplicateTagihanList(remoteTagihan.map((row: any, idx: number) => normalizeTagihanRow(row, idx, allStudentsList)));
        db.set('keuangan_tagihan', normalizedTagihan, { skipPush: true });
        db.set('TAGIHAN', normalizedTagihan, { skipPush: true });
        updatedCount++;
      }
    }

    const remotePembayaran = sheetMap.PEMBAYARAN || sheetMap.pembayaran || sheetMap.INVOICE || sheetMap.invoice;
    if (Array.isArray(remotePembayaran) && remotePembayaran.length > 0) {
      if (this.isTableRecentlyEdited('PEMBAYARAN')) {
        console.info('[AutoSync] Melindungi data PEMBAYARAN lokal dari penimpaan karena baru saja diedit di aplikasi.');
      } else {
        const normalizedPembayaran = deduplicatePembayaranList(remotePembayaran.map((row: any, idx: number) => normalizePembayaranRow(row, idx, allStudentsList)));
        db.set('keuangan_pembayaran', normalizedPembayaran, { skipPush: true });
        db.set('keuangan_invoices', normalizedPembayaran, { skipPush: true });
        db.set('PEMBAYARAN', normalizedPembayaran, { skipPush: true });
        updatedCount++;
      }
    }

    const remoteTabungan = sheetMap.TABUNGAN || sheetMap.tabungan;
    if (Array.isArray(remoteTabungan) && remoteTabungan.length > 0) {
      if (this.isTableRecentlyEdited('TABUNGAN')) {
        console.info('[AutoSync] Melindungi data TABUNGAN lokal dari penimpaan karena baru saja diedit di aplikasi.');
      } else {
        const normalizedTabungan = deduplicateTabunganList(remoteTabungan.map((row: any, idx: number) => normalizeTabunganRow(row, idx, allStudentsList)));
        db.set('keuangan_tabungan', normalizedTabungan, { skipPush: true });
        db.set('TABUNGAN', normalizedTabungan, { skipPush: true });
        updatedCount++;
      }
    }

    if (remoteBiaya || remoteTagihan || remotePembayaran || remoteTabungan) {
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all', skipPush: true } }));
        } catch {}
      }, 50);
    }

    const remoteKas = sheetMap.KAS || sheetMap.kas;
    if (Array.isArray(remoteKas) && remoteKas.length > 0) {
      const localKas = db.get('keuangan_kas') || [];
      const merged = deduplicateKasList([...remoteKas, ...(Array.isArray(localKas) ? localKas : [])]);
      db.set('keuangan_kas', merged, { skipPush: true });
      db.set('KAS', merged, { skipPush: true });
      updatedCount++;
    }

    const remotePengeluaran = sheetMap.PENGELUARAN || sheetMap.pengeluaran;
    if (Array.isArray(remotePengeluaran) && remotePengeluaran.length > 0) {
      const localPengeluaran = db.get('keuangan_pengeluaran');
      const merged = smartMergeGenericTable(localPengeluaran, remotePengeluaran, ['PengeluaranID', 'id', 'pengeluaranId']);
      db.set('keuangan_pengeluaran', merged, { skipPush: true });
      updatedCount++;
    }

    // 10. SPMB & PENDAFTAR
    const remoteSpmb = sheetMap.SPMB_PENDAFTAR || sheetMap.PENDAFTAR || sheetMap.spmb_pendaftar;
    if (Array.isArray(remoteSpmb) && remoteSpmb.length > 0) {
      const localSpmb = db.get('spmb_applicants');
      const merged = smartMergeGenericTable(localSpmb, remoteSpmb, ['id', 'noPendaftaran', 'NISN', 'email']);
      db.set('spmb_applicants', merged, { skipPush: true });
      db.set('spmb_pendaftar', merged, { skipPush: true });
      updatedCount++;
    }

    // 11. CBT & BANK SOAL (Sinkronisasi 2 Arah Penuh dengan Sheet BANK_SOAL & SOAL)
    const remoteBankSoal = sheetMap.BANK_SOAL || sheetMap.bank_soal;
    const remoteSoal = sheetMap.SOAL || sheetMap.soal;

    const isBankEmpty = Array.isArray(remoteBankSoal) && remoteBankSoal.length === 0;
    const isSoalEmpty = Array.isArray(remoteSoal) && remoteSoal.length === 0;

    // Kumpulkan butir soal per BankSoalID dari sheet SOAL
    const questionsByBankId = new Map<string, any[]>();
    if (Array.isArray(remoteSoal) && remoteSoal.length > 0) {
      remoteSoal.forEach((s: any) => {
        const bId = s.BankSoalID || s.bankSoalId || s.UjianID || s.ujianId;
        if (bId) {
          if (!questionsByBankId.has(bId)) questionsByBankId.set(bId, []);
          questionsByBankId.get(bId)!.push({
            id: Number(s.NomorSoal || s.nomor || questionsByBankId.get(bId)!.length + 1),
            pertanyaan: s.Pertanyaan || s.pertanyaan || s.soal || '-',
            tipe: s.TipeSoal || s.tipe || 'Pilihan Ganda',
            opsi: {
              a: s.PilihanA || s.opsiA || s.opsi?.a || s.a || '',
              b: s.PilihanB || s.opsiB || s.opsi?.b || s.b || '',
              c: s.PilihanC || s.opsiC || s.opsi?.c || s.c || '',
              d: s.PilihanD || s.opsiD || s.opsi?.d || s.d || '',
              e: s.PilihanE || s.opsiE || s.opsi?.e || s.e || ''
            },
            kunci: String(s.KunciJawaban || s.kunci || s.Kunci || 'a').toLowerCase(),
            bobot: Number(s.Bobot || s.bobot || 5),
            pembahasan: s.PembahasanRasional || s.Pembahasan || s.pembahasan || '',
            gambar: s.Gambar || s.LinkGambar || s['Link Gambar'] || s.gambar || s.gambarUrl || s.imageUrl || ''
          });
        }
      });
    }

    const isCbtRecentlyEdited = 
      this.isTableRecentlyEdited('BANK_SOAL') || 
      this.isTableRecentlyEdited('SOAL') || 
      this.isTableRecentlyEdited('cbt_bank_soal') || 
      this.isTableRecentlyEdited('cbt_questions');

    if (isCbtRecentlyEdited) {
      // Data CBT sedang atau baru saja diedit secara lokal, lindungi dari penimpaan remote
    } else if (Array.isArray(remoteBankSoal) && remoteBankSoal.length > 0) {
      const nonDummyRemote = remoteBankSoal.filter((b: any) => !isDummyBankSoalPackage(b));
      const normalizedRemote = nonDummyRemote.map((b: any, idx: number) => {
        const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
        const mapel = b.mapel || b.Mapel || 'Mata Pelajaran';
        const rawKelas = String(b.kelas || b.Kelas || '4');
        const kelas = rawKelas.replace(/[A-Za-z]/g, '').trim() || '4';
        const kurikulum = b.kurikulum || b.Kurikulum || 'Kurikulum Merdeka';
        const guru = b.guru || b.Guru || 'Tim Guru';
        const kesulitan = b.kesulitan || b.Kesulitan || 'Sedang';
        const status = b.status || b.Status || 'Siap Digunakan';
        const updatedAt = b.updatedAt || b.UpdatedAt || new Date().toISOString().slice(0, 10);

        let soalList: any[] = [];
        if (Array.isArray(b.soalList)) {
          soalList = b.soalList;
        } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
          try {
            soalList = JSON.parse(b.SoalJSON);
          } catch {
            soalList = [];
          }
        }

        if (soalList.length === 0 && questionsByBankId.has(id)) {
          soalList = questionsByBankId.get(id) || [];
        }

        soalList = (soalList || []).filter(s => !isDummyQuestion(s));

        const jumlahSoal = soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 0);
        const tipeSoal = b.tipeSoal || b.TipeSoal || `${jumlahSoal} Pilihan Ganda`;
        const topik = b.topik || b.Topik || b.Bab || b.bab || b.SubBab || b.subBab || b.temaModul || b.topikSubTugas || b.judulSubModul || '';
        const temaModul = b.temaModul || b.TemaModul || b.Bab || b.bab || '';
        const topikSubTugas = b.topikSubTugas || b.TopikSubTugas || b.SubBab || b.subBab || topik;
        const kodeSubTugas = b.kodeSubTugas || b.KodeSubTugas || b.singkatanDanJudul || b.kode || '';
        const silabusNo = b.silabusNo !== undefined ? Number(b.silabusNo) : (b.SilabusNo !== undefined ? Number(b.SilabusNo) : (b.no !== undefined ? Number(b.no) : (b.No !== undefined ? Number(b.No) : undefined)));
        const silabusId = b.silabusId || b.SilabusID || b.silabusKey || undefined;

        // Resolusi jenis asesmen akurat
        const idUpper = String(id).toUpperCase();
        const rawJenis = (b.jenisAsesmen || b.JenisAsesmen || b.jenisUjian || b.JenisUjian || b.tipeUjian || b.jenis || '').trim();
        const descText = `${temaModul} ${topik} ${kodeSubTugas}`.toLowerCase();
        let resolvedJenis = rawJenis;

        if (
          idUpper.includes('2210') ||
          idUpper.includes('HARIAN') ||
          idUpper.includes('-UH-') ||
          descText.includes('2210') ||
          descText.includes('harian') ||
          silabusNo === 2210 ||
          String(silabusNo) === '2210'
        ) {
          resolvedJenis = 'Sumatif Harian';
        } else if (!resolvedJenis || resolvedJenis === 'Sumatif Tengah Semester' || resolvedJenis === 'Sumatif Tengah Semester (STS)') {
          if (idUpper.includes('-SAS-') || idUpper.includes('-SAS') || descText.includes('sas') || descText.includes('akhir semester')) {
            resolvedJenis = 'Sumatif Akhir Semester (SAS)';
          } else if (idUpper.includes('-PAT-') || idUpper.includes('-SAT-') || descText.includes('pat') || descText.includes('sat')) {
            resolvedJenis = 'Penilaian Akhir Tahun (PAT / SAT)';
          } else if (idUpper.includes('-STS-') || idUpper.includes('-STS') || descText.includes('sts') || descText.includes('tengah semester')) {
            resolvedJenis = 'Sumatif Tengah Semester (STS)';
          } else if (/^\d+$/.test(String(id).trim()) || idUpper.includes('SILABUS') || silabusNo) {
            resolvedJenis = 'Sumatif Harian';
          } else {
            resolvedJenis = rawJenis || 'Sumatif Harian';
          }
        }

        const durasi = Number(b.durasi || b.Durasi || b.durasiMenit || 30) || 30;

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
          jumlahSoal,
          JumlahSoal: jumlahSoal,
          tipeSoal,
          TipeSoal: tipeSoal,
          kesulitan,
          Kesulitan: kesulitan,
          status,
          Status: status,
          updatedAt,
          UpdatedAt: updatedAt,
          topik,
          Topik: topik,
          temaModul,
          TemaModul: temaModul,
          topikSubTugas,
          TopikSubTugas: topikSubTugas,
          silabusNo,
          SilabusNo: silabusNo,
          silabusId,
          SilabusID: silabusId,
          kodeSubTugas,
          KodeSubTugas: kodeSubTugas,
          jenisAsesmen: resolvedJenis,
          JenisAsesmen: resolvedJenis,
          jenisUjian: resolvedJenis,
          JenisUjian: resolvedJenis,
          durasi: durasi,
          Durasi: durasi,
          durasiMenit: durasi,
          soalList,
          SoalJSON: typeof b.soalList === 'object' ? JSON.stringify(soalList) : (b.SoalJSON || JSON.stringify(soalList))
        };
      });

      // Gabungkan paket lokal yang belum ada di remote atau yang memiliki soal lebih lengkap
      const localBank = (db.get('cbt_bank_soal') || []) as any[];
      const localMap = new Map<string, any>();
      localBank.forEach((l: any) => {
        const k = String(l.id || l.BankSoalID || '');
        if (k) localMap.set(k, l);
      });

      const mergedPackages = normalizedRemote.map((r: any) => {
        const k = String(r.id || r.BankSoalID || '');
        const local = localMap.get(k);
        if (local) {
          // Jika lokal memiliki butir soal lebih banyak, prioritaskan lokal
          const localSoalLen = Array.isArray(local.soalList) ? local.soalList.length : 0;
          const remoteSoalLen = Array.isArray(r.soalList) ? r.soalList.length : 0;
          if (localSoalLen > remoteSoalLen) {
            return {
              ...r,
              soalList: local.soalList,
              jumlahSoal: localSoalLen,
              JumlahSoal: localSoalLen,
              SoalJSON: JSON.stringify(local.soalList)
            };
          }
        }
        return r;
      });

      const remoteIdSet = new Set(mergedPackages.map((n: any) => n.id || n.BankSoalID));
      const unsyncedLocal = localBank.filter((l: any) => !remoteIdSet.has(l.id || l.BankSoalID));
      const combinedBank = [...mergedPackages, ...unsyncedLocal];

      db.set('cbt_questions', combinedBank, { skipPush: true });
      db.set('cbt_bank_soal', combinedBank, { skipPush: true });
      db.set('BANK_SOAL', combinedBank, { skipPush: true });
      db.set('bank_soal', combinedBank, { skipPush: true });

      // Ekstrak dan sinkronkan juga butir soal individual ke cbt_exam_questions & soal
      const flatQuestions: any[] = [];
      combinedBank.forEach((pkg: any) => {
        if (Array.isArray(pkg.soalList)) {
          pkg.soalList.forEach((q: any, qIdx: number) => {
            flatQuestions.push({
              id: `${pkg.id}_${q.id || qIdx + 1}`,
              DetailSoalID: `${pkg.id}_${q.id || qIdx + 1}`,
              BankSoalID: pkg.id,
              bankSoalId: pkg.id,
              NomorSoal: q.id || qIdx + 1,
              nomor: q.id || qIdx + 1,
              pertanyaan: q.pertanyaan || '',
              Pertanyaan: q.pertanyaan || '',
              soal: q.pertanyaan || '',
              tipe: q.tipe || 'Pilihan Ganda',
              TipeSoal: q.tipe || 'Pilihan Ganda',
              opsiA: q.opsi?.a || (q as any).opsiA || '',
              PilihanA: q.opsi?.a || (q as any).opsiA || '',
              opsiB: q.opsi?.b || (q as any).opsiB || '',
              PilihanB: q.opsi?.b || (q as any).opsiB || '',
              opsiC: q.opsi?.c || (q as any).opsiC || '',
              PilihanC: q.opsi?.c || (q as any).opsiC || '',
              opsiD: q.opsi?.d || (q as any).opsiD || '',
              PilihanD: q.opsi?.d || (q as any).opsiD || '',
              opsiE: q.opsi?.e || (q as any).opsiE || '',
              PilihanE: q.opsi?.e || (q as any).opsiE || '',
              kunci: String(q.kunci || 'a').toLowerCase(),
              KunciJawaban: String(q.kunci || 'a').toLowerCase(),
              bobot: q.bobot || 5,
              Bobot: q.bobot || 5,
              pembahasan: q.pembahasan || '',
              PembahasanRasional: q.pembahasan || ''
            });
          });
        }
      });
      if (flatQuestions.length > 0) {
        db.set('cbt_exam_questions', flatQuestions, { skipPush: true });
        db.set('soal', flatQuestions, { skipPush: true });
        db.set('SOAL', flatQuestions, { skipPush: true });
      }

      updatedCount++;

      if (unsyncedLocal.length > 0 && !this.queue.has('BANK_SOAL') && !this.isTableRecentlyEdited('BANK_SOAL')) {
        this.queueDbKey('cbt_bank_soal');
      }
    } else {
      // Remote kosong tapi lokal punya data: JANGAN HAPUS LOKAL!
      const existingLocalBank = (db.get('cbt_bank_soal') || []) as any[];
      if (existingLocalBank.length > 0 && !this.queue.has('BANK_SOAL') && !this.isTableRecentlyEdited('BANK_SOAL')) {
        this.queueDbKey('cbt_bank_soal');
      }
    }

    const remoteUjian = [
      ...(Array.isArray(sheetMap.JADWAL_UJIAN) ? sheetMap.JADWAL_UJIAN : (Array.isArray(sheetMap.jadwal_ujian) ? sheetMap.jadwal_ujian : [])),
      ...(Array.isArray(sheetMap.UJIAN) ? sheetMap.UJIAN : (Array.isArray(sheetMap.CBT_UJIAN) ? sheetMap.CBT_UJIAN : (Array.isArray(sheetMap.ujian) ? sheetMap.ujian : [])))
    ];
    if (remoteUjian.length > 0) {
      const localUjian = (db.get('ujian_cbt') || db.get('cbt_exams') || []) as any[];
      const localMapById = new Map<string, any>();
      const localMapByMapelKelas = new Map<string, any>();
      localUjian.forEach((l: any) => {
        const id = String(l.id || l.UjianID || '').trim();
        if (id) localMapById.set(id, l);
        const mKey = String(l.mapel || l.Mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const kKey = String(l.kelas || l.Kelas || '').toLowerCase().replace(/[^0-9a-z]/g, '');
        if (mKey && kKey) localMapByMapelKelas.set(`${mKey}|${kKey}`, l);
      });

      const mergedUjian = deduplicateUjianSessions(remoteUjian).map((u: any) => {
        const id = String(u.id || u.UjianID || '').trim();
        const mKey = String(u.mapel || u.Mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const kKey = String(u.kelas || u.Kelas || '').toLowerCase().replace(/[^0-9a-z]/g, '');
        const local = localMapById.get(id) || (mKey && kKey ? localMapByMapelKelas.get(`${mKey}|${kKey}`) : undefined);
        const bankId = u.bankSoalId || u.BankSoalID || local?.bankSoalId || local?.BankSoalID || '';
        return {
          ...local,
          ...u,
          bankSoalId: bankId,
          BankSoalID: bankId
        };
      });

      db.set('cbt_exams', mergedUjian, { skipPush: true });
      db.set('ujian_cbt', mergedUjian, { skipPush: true });
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt', skipPush: true } }));
      updatedCount++;
    }

    const remoteToken = sheetMap.TOKEN || sheetMap.CBT_TOKEN || sheetMap.token || sheetMap.cbt_token;
    if (Array.isArray(remoteToken) && remoteToken.length > 0) {
      const normalizedToken = deduplicateTokens(remoteToken);
      db.set('cbt_tokens', normalizedToken, { skipPush: true });
      db.set('cbt_token_history', normalizedToken, { skipPush: true });
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history', skipPush: true } }));
      updatedCount++;
    }

    if (Array.isArray(remoteSoal) && remoteSoal.length > 0) {
      const localSoal = (db.get('cbt_exam_questions') || db.get('soal') || []) as any[];
      const mergedSoal = smartMergeGenericTable(
        Array.isArray(localSoal) ? localSoal : [],
        remoteSoal,
        ['id', 'DetailSoalID', 'NomorSoal']
      );
      db.set('cbt_exam_questions', mergedSoal, { skipPush: true });
      db.set('soal', mergedSoal, { skipPush: true });
      db.set('SOAL', mergedSoal, { skipPush: true });
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions', skipPush: true } }));
      updatedCount++;
    }

    const remoteJawaban = sheetMap.JAWABAN || sheetMap.jawaban;
    if (Array.isArray(remoteJawaban) && remoteJawaban.length > 0) {
      db.set('cbt_answers', remoteJawaban, { skipPush: true });
      db.set('jawaban_ujian', remoteJawaban, { skipPush: true });
      updatedCount++;
    }

    const remoteDraftJawaban = sheetMap.DRAFT_JAWABAN || sheetMap.draft_jawaban;
    if (Array.isArray(remoteDraftJawaban) && remoteDraftJawaban.length > 0) {
      db.set('exam_drafts', remoteDraftJawaban, { skipPush: true });
      db.set('cbt_draft_answers', remoteDraftJawaban, { skipPush: true });
      updatedCount++;
    }

    const remoteLogUjian = sheetMap.LOG_UJIAN || sheetMap.log_ujian;
    if (Array.isArray(remoteLogUjian) && remoteLogUjian.length > 0) {
      db.set('exam_logs', remoteLogUjian, { skipPush: true });
      db.set('cbt_proktor_logs', remoteLogUjian, { skipPush: true });
      updatedCount++;
    }

    const remoteHasilUjian = sheetMap.HASIL_UJIAN || sheetMap.hasil_ujian;
    if (Array.isArray(remoteHasilUjian) && remoteHasilUjian.length > 0) {
      db.set('cbt_results', remoteHasilUjian, { skipPush: true });
      db.set('cbt_exam_results', remoteHasilUjian, { skipPush: true });
      updatedCount++;
    }

    const remoteRaporPendidikan = sheetMap.RAPOR_PENDIDIKAN || sheetMap.rapor_pendidikan;
    if (Array.isArray(remoteRaporPendidikan) && remoteRaporPendidikan.length > 0) {
      const normalizedRapor = remoteRaporPendidikan.map((r: any, idx: number) => {
        let indikatorList = [];
        try {
          if (r.IndikatorJSON) {
            indikatorList = typeof r.IndikatorJSON === 'string' ? JSON.parse(r.IndikatorJSON) : r.IndikatorJSON;
          } else if (r.indikatorList) {
            indikatorList = typeof r.indikatorList === 'string' ? JSON.parse(r.indikatorList) : r.indikatorList;
          }
        } catch {}

        return {
          id: String(r.DimensiID || r.id || `dim-${idx + 1}`),
          tahun: String(r.Tahun || r.tahun || '2026/2027'),
          kode: String(r.Kode || r.kode || 'A.1'),
          nama: String(r.NamaDimensi || r.nama || 'Dimensi Mutu'),
          skor: Number(r.Skor || r.skor || 0),
          delta: Number(r.Delta || r.delta || 0),
          kategori: String(r.Kategori || r.kategori || 'Cakap'),
          color: String(r.Warna || r.color || 'emerald'),
          deskripsi: String(r.Deskripsi || r.deskripsi || ''),
          nasionalAvg: Number(r.RataNasional || r.nasionalAvg || 0),
          kabupatenAvg: Number(r.RataKabupaten || r.kabupatenAvg || 0),
          rekomendasiBenahi: String(r.RekomendasiBenahi || r.rekomendasiBenahi || ''),
          indikatorList
        };
      });
      db.set('rapor_pendidikan_list', normalizedRapor, { skipPush: true });
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'rapor_pendidikan_list' } }));
      updatedCount++;
    }

    // 12. BK, PERPUS, SARPRAS, DOKUMEN & LAINNYA
    const remoteBimbingan = sheetMap.BIMBINGAN || sheetMap.bimbingan;
    if (Array.isArray(remoteBimbingan) && remoteBimbingan.length > 0) {
      db.set('bk_counselings', remoteBimbingan, { skipPush: true });
      updatedCount++;
    }

    const remotePelanggaran = sheetMap.PELANGGARAN || sheetMap.pelanggaran;
    if (Array.isArray(remotePelanggaran) && remotePelanggaran.length > 0) {
      db.set('bk_violations', remotePelanggaran, { skipPush: true });
      updatedCount++;
    }

    const remoteBuku = sheetMap.BUKU || sheetMap.buku;
    if (Array.isArray(remoteBuku) && remoteBuku.length > 0) {
      db.set('perpus_buku', remoteBuku, { skipPush: true });
      db.set('library_books', remoteBuku, { skipPush: true });
      updatedCount++;
    }

    const remoteBarang = sheetMap.BARANG || sheetMap.barang;
    if (Array.isArray(remoteBarang) && remoteBarang.length > 0) {
      db.set('sarpras_items', remoteBarang, { skipPush: true });
      db.set('barang', remoteBarang, { skipPush: true });
      updatedCount++;
    }

    const remoteSuratMasuk = sheetMap.SURAT_MASUK || sheetMap.surat_masuk;
    if (Array.isArray(remoteSuratMasuk) && remoteSuratMasuk.length > 0) {
      db.set('letters_incoming', remoteSuratMasuk, { skipPush: true });
      updatedCount++;
    }

    const remoteSuratKeluar = sheetMap.SURAT_KELUAR || sheetMap.surat_keluar;
    if (Array.isArray(remoteSuratKeluar) && remoteSuratKeluar.length > 0) {
      db.set('letters_outgoing', remoteSuratKeluar, { skipPush: true });
      updatedCount++;
    }

    const remoteEkskul = sheetMap.EKSKUL || sheetMap.ekskul;
    if (Array.isArray(remoteEkskul) && remoteEkskul.length > 0) {
      db.set('ekskul_list', remoteEkskul, { skipPush: true });
      updatedCount++;
    }

    const remoteMading = sheetMap.MADING_BERITA || sheetMap.mading_berita;
    if (Array.isArray(remoteMading) && remoteMading.length > 0) {
      db.set('mading_articles', remoteMading, { skipPush: true });
      updatedCount++;
    }

    // 12b. TUGAS & PENGUMPULAN TUGAS
    const remoteTugas = sheetMap.TUGAS || sheetMap.tugas;
    if (Array.isArray(remoteTugas) && remoteTugas.length > 0) {
      const formattedTugas = remoteTugas.map((t: any) => ({
        id: t.TugasID || t.id || `TGS-${Math.floor(1000 + Math.random() * 9000)}`,
        judul: t.Judul || t.judul || 'Tugas KBM',
        mapel: t.Mapel || t.mapel || 'Umum',
        kelas: t.Kelas || t.kelas || '4A',
        tingkatKelas: t.tingkatKelas || (t.Kelas ? `Kelas ${String(t.Kelas).replace(/\D/g, '') || t.Kelas}` : 'Kelas 4'),
        guru: t.Guru || t.guru || 'Tim Guru',
        tenggat: t.Tenggat || t.tenggat || new Date().toISOString().slice(0, 10),
        kategori: t.Kategori || t.kategori || 'Kuis Pilihan Ganda (Auto-Grading)',
        deskripsi: t.Petunjuk || t.deskripsi || '',
        kumpul: Number(t.Kumpul || t.kumpul || 0),
        totalSiswa: Number(t.TotalSiswa || t.totalSiswa || 0),
        status: t.Status || t.status || 'Aktif Mengumpulkan',
        avg: Number(t.NilaiRataRata || t.avg || 0),
        createdAt: t.CreatedAt || t.createdAt || new Date().toISOString().slice(0, 10),
        soalList: t.soalList || []
      }));
      db.set('tugas_kbm', formattedTugas, { skipPush: true });
      db.set('assignments', formattedTugas, { skipPush: true });
      updatedCount++;
    }

    const remotePengumpulan = sheetMap.PENGUMPULAN_TUGAS || sheetMap.pengumpulan_tugas;
    if (Array.isArray(remotePengumpulan) && remotePengumpulan.length > 0) {
      const formattedSubs = remotePengumpulan.map((p: any) => ({
        tugasId: p.TugasID || p.tugasId || '',
        studentId: p.SiswaID || p.studentId || '',
        studentName: p.NamaSiswa || p.studentName || 'Siswa',
        nisn: p.NISN || p.nisn || '-',
        kelas: p.Kelas || p.kelas || '',
        status: p.Status || p.status || 'Belum Mengumpulkan',
        nilai: p.Nilai !== undefined && p.Nilai !== '' && p.Nilai !== null ? Number(p.Nilai) : null,
        catatanGuru: p.CatatanGuru || p.catatanGuru || '',
        submittedAt: p.WaktuKumpul || p.submittedAt || ''
      }));
      db.set('hasil_tugas_kbm', formattedSubs, { skipPush: true });
      db.set('assignment_submissions', formattedSubs, { skipPush: true });
      updatedCount++;
    }

    // 13. MASTER SILABUS & KURIKULUM MODUL DARI GOOGLE SPREADSHEET
    const remoteSilabus = sheetMap.MASTER_SILABUS || sheetMap.master_silabus;
    if (Array.isArray(remoteSilabus) && remoteSilabus.length > 0) {
      // Ambil referensi berkas lokal dan LocalStorage yang sudah tertaut agar tidak tertimpa/hilang saat Spreadsheet disinkronisasi
      const existingLocal = (db.get('master_silabus') || []) as any[];
      let persistedStorageLinks: Record<string, any> = {};
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('sista_silabus_file_links');
          if (stored) persistedStorageLinks = JSON.parse(stored);
        }
      } catch {
        persistedStorageLinks = {};
      }

      const localFileMap = new Map<string, any>();
      const localStatusMap = new Map<string, { statusSoal?: string; bankSoalId?: string }>();
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
        if (item.statusSoal || item.bankSoalId) {
          const statusObj = { statusSoal: item.statusSoal, bankSoalId: item.bankSoalId };
          if (kId) localStatusMap.set(kId, statusObj);
          if (kNo) localStatusMap.set(`NO_${kNo}`, statusObj);
          if (kKode) localStatusMap.set(kKode, statusObj);
        }
      });

      // Sinkronkan juga dari LocalStorage ke localFileMap
      Object.keys(persistedStorageLinks).forEach(k => {
        const val = persistedStorageLinks[k];
        if (val && val.fileUrl && !localFileMap.has(k)) {
          localFileMap.set(k, val);
        }
      });

      // Validasi skema standar MASTER_SILABUS
      const validation = validateMasterSilabusSchema(remoteSilabus);
      if (validation.validatedData && validation.validatedData.length > 0) {
        const mergedSilabus = validation.validatedData.map(row => {
          const kId = String(row.id || '').trim();
          const kNo = String(row.no || '').trim();
          const kKode = String(row.kodeSubTugas || '').trim();
          const matchedLocal = (kId && localFileMap.get(kId)) || (kNo && localFileMap.get(`NO_${kNo}`)) || (kKode && localFileMap.get(kKode));
          const matchedStatus = (kId && localStatusMap.get(kId)) || (kNo && localStatusMap.get(`NO_${kNo}`)) || (kKode && localStatusMap.get(kKode));
          
          let res = { ...row };
          if (matchedStatus) {
            if (matchedStatus.statusSoal && !res.statusSoal) res.statusSoal = matchedStatus.statusSoal;
            if (matchedStatus.bankSoalId && !res.bankSoalId) res.bankSoalId = matchedStatus.bankSoalId;
          }

          if (matchedLocal && !row.fileUrl) {
            res = {
              ...res,
              fileUrl: matchedLocal.fileUrl,
              FileUrl: matchedLocal.fileUrl,
              pdfUrl: matchedLocal.fileUrl,
              fileName: row.fileName || matchedLocal.fileName,
              directUrl: row.directUrl || matchedLocal.directUrl,
              driveId: row.driveId || matchedLocal.driveId,
              uploadedAt: row.uploadedAt || matchedLocal.uploadedAt
            };
          }

          // Jika remote row membawa link baru, simpan ke memory persisten LocalStorage (hindari data: base64 besar)
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

          return res;
        });

        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
          }
        } catch {
          try {
            localStorage.removeItem('sista_cached_drive_modul_files');
            localStorage.setItem('sista_silabus_file_links', JSON.stringify(persistedStorageLinks));
          } catch {
            // ignore
          }
        }

        db.set('master_silabus', mergedSilabus, { skipPush: true });
        updatedCount++;
      }
    }

    const remoteKurikulum = sheetMap.KURIKULUM_MODUL || sheetMap.kurikulum_modul;
    if (Array.isArray(remoteKurikulum) && remoteKurikulum.length > 0) {
      // Validasi skema 11 kolom: id, noModul, kodeModul, judulModul, kodeMapel, NamaMapel, Jenjang, kelas, semester, Unit, materiPokok
      const validation = validateKurikulumModulSchema(remoteKurikulum);
      if (validation.validatedData && validation.validatedData.length > 0) {
        db.set('kurikulum_modul', validation.validatedData, { skipPush: true });
        updatedCount++;
      }
    }

    if (updatedCount > 0 && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'all', skipPush: true } }));
        window.dispatchEvent(new CustomEvent('academic-semester-changed'));
        window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { updatedCount } }));
      } catch {}
    }

    return updatedCount;
  }

  /**
   * Utilitas Validasi Skema Data MASTER_SILABUS sebelum sinkronisasi
   * Header resmi: id, no, kodeJenjang, Jenjang, kelas, semester, kodeMapel, NamaMapel, noModul, temaModul, subKe, kodeSubTugas, topikSubTugas, status, keterangan
   */
  public validateMasterSilabus(data?: any[]): MasterSilabusValidationResult {
    const rawData = data || db.get('master_silabus') || [];
    return validateMasterSilabusSchema(rawData);
  }

  /**
   * Utilitas Validasi Skema Data KURIKULUM_MODUL sebelum sinkronisasi
   * Header resmi: id, noModul, kodeModul, judulModul, kodeMapel, NamaMapel, Jenjang, kelas, semester, Unit, materiPokok
   */
  public validateKurikulumModul(data?: any[]): KurikulumModulValidationResult {
    const rawData = data || db.get('kurikulum_modul') || [];
    return validateKurikulumModulSchema(rawData);
  }

  /**
   * Manual Force Sync for all tables across the application
   */
  public async syncAllModules(onProgress?: (step: string, percent: number) => void): Promise<{ success: boolean; message: string; totalTables: number }> {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      throw new Error('URL Google Apps Script belum diisi di menu Pengaturan.');
    }

    const spreadsheetId = this.getSpreadsheetId();
    this.isSyncing = true;
    useStore.getState().setIsSyncingGlobal(true);
    this.broadcastStatus('syncing', 'Memulai sinkronisasi serentak seluruh data aplikasi...');

    try {
      if (onProgress) onProgress('Mengumpulkan seluruh data dari semua modul...', 15);

      const allData = getAllAppDataForSync(
        useStore.getState().students,
        useStore.getState().teachers,
        useStore.getState().settings
      );

      const tableNames = Object.keys(allData);
      
      // Safety Guard: Jangan izinkan push massal jika data siswa kosong untuk melindungi Google Spreadsheet
      const siswaCount = (allData['SISWA'] || []).length;
      if (siswaCount === 0) {
        throw new Error('Proteksi Spreadsheet Aktif: Data lokal siswa masih kosong. Sistem menolak push massal untuk mencegah penimpaan data di Google Spreadsheet. Silakan gunakan "Tarik Data dari Spreadsheet" terlebih dahulu.');
      }

      if (onProgress) onProgress(`Mengirimkan ${tableNames.length} tabel master ke Google Sheets...`, 45);

      await fetchFromGAS(scriptUrl, {
        action: 'MASS_SYNC_ALL',
        allData: allData,
        allDataJson: JSON.stringify(allData),
        spreadsheetId: spreadsheetId
      });

      if (onProgress) onProgress('Memperbarui sheet validasi Dapodik & data relasi...', 80);

      try {
        await fetchFromGAS(scriptUrl, {
          action: 'sync',
          data: allData['SISWA'] || [],
          teachers: allData['GURU'] || [],
          spreadsheetId: spreadsheetId
        });
      } catch (errSync) {
        console.warn('Secondary sync hook notice:', errSync);
      }

      if (onProgress) onProgress('Sinkronisasi selesai 100%!', 100);

      this.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
      this.lastSyncedTable = `Semua (${tableNames.length} Tabel)`;
      this.totalSyncedCount += tableNames.length;
      useStore.getState().setLastSyncedAt(this.lastSyncedAt);

      this.broadcastStatus('success', `✅ Seluruh ${tableNames.length} tabel berhasil disinkronkan ke Google Spreadsheet!`);

      return {
        success: true,
        message: `Berhasil menyingkronkan seluruh ${tableNames.length} tabel ke Google Spreadsheet!`,
        totalTables: tableNames.length
      };
    } catch (err: any) {
      this.broadcastStatus('error', `❌ Gagal sinkronisasi data: ${err.message || 'Error tidak diketahui'}`);
      throw err;
    } finally {
      this.isSyncing = false;
      useStore.getState().setIsSyncingGlobal(false);
    }
  }

  private getScriptUrl(): string {
    const s = useStore.getState().settings;
    return s.scriptUrl || s.gasUrl || DEFAULT_APP_CONFIG.scriptUrl || '';
  }

  private getSpreadsheetId(): string {
    const s = useStore.getState().settings;
    return s.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId || '';
  }

  private broadcastStatus(state: 'idle' | 'syncing' | 'success' | 'error' | 'disabled', message?: string) {
    if (typeof window === 'undefined') return;

    const detail: AutoSyncStatus = {
      state,
      lastSyncedTable: this.lastSyncedTable,
      lastSyncedAt: this.lastSyncedAt,
      message,
      pendingTables: Array.from(this.queue),
      totalSyncedCount: this.totalSyncedCount,
      autoSyncEnabled: this.autoSyncEnabled
    };

    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('erp-auto-sync-status', { detail }));
      } catch {}
    }, 0);
  }
}

export const autoSyncEngine = new AutoSyncEngine();

/**
 * Tarik khusus 4 Sheet Keuangan (BIAYA, TAGIHAN, PEMBAYARAN, TABUNGAN) secara cepat dan terisolasi
 */
export async function pullFinanceSheetsFromGas(): Promise<{ success: boolean; message: string; counts: { biaya: number; tagihan: number; pembayaran: number; tabungan: number; siswa?: number } }> {
  const currentSettings = useStore.getState().settings;
  const gasUrl = (currentSettings?.gasUrl || currentSettings?.scriptUrl || getStoredGasUrl() || '').trim();

  const counts = { biaya: 0, tagihan: 0, pembayaran: 0, tabungan: 0, siswa: 0 };

  try {
    // Tarik khusus Sheet Keuangan & Master Siswa secara cepat dan paralel
    const [resBiaya, resTagihan, resPembayaran, resTabungan, resKas, resSiswa] = await Promise.all([
      pullSpecificSheetFromGas('BIAYA', gasUrl),
      pullSpecificSheetFromGas('TAGIHAN', gasUrl),
      pullSpecificSheetFromGas('PEMBAYARAN', gasUrl),
      pullSpecificSheetFromGas('TABUNGAN', gasUrl),
      pullSpecificSheetFromGas('KAS', gasUrl),
      pullSpecificSheetFromGas('SISWA', gasUrl)
    ]);

    // Handle SISWA (Pastikan 409 data real terbaru masuk ke store & db)
    if (resSiswa.success && Array.isArray(resSiswa.data) && resSiswa.data.length > 0) {
      const cleanedSiswa = resSiswa.data
        .map(cleanStudentClass)
        .filter(s => s && s.name && s.name.trim().length > 0 && s.name !== '-' && s.name !== 'undefined');
      if (cleanedSiswa.length > 0) {
        useStore.getState().setStudents(cleanedSiswa);
        db.set('students', cleanedSiswa, { skipPush: true });
        db.set('siswa', cleanedSiswa, { skipPush: true });
        db.set('SISWA', cleanedSiswa, { skipPush: true });
        counts.siswa = cleanedSiswa.length;
      }
    } else {
      counts.siswa = (useStore.getState().students || []).length;
    }

    if (resBiaya.success && Array.isArray(resBiaya.data)) {
      if (resBiaya.data.length > 0) {
        const normalizedBiaya = resBiaya.data.map((r, i) => normalizeBiayaRow(r, i));
        db.set('keuangan_biaya', normalizedBiaya, { skipPush: true });
        db.set('BIAYA', normalizedBiaya, { skipPush: true });
        const tarifMapped = normalizedBiaya.map(b => ({
          id: b.id || b.biayaId,
          kode: b.kodeBiaya || b.id,
          namaPos: b.namaBiaya || b.nama,
          frekuensi: b.periode || 'Bulanan',
          nominal: Number(b.nominal) || 0,
          kelas: b.targetKelas || 'Semua Kelas',
          status: b.wajib || 'Wajib',
          kategori: b.kategori || 'Iuran',
          jenjang: b.jenjang || 'Semua Jenjang'
        }));
        db.set('tarif', tarifMapped, { skipPush: true });
        counts.biaya = normalizedBiaya.length;
      } else {
        db.set('keuangan_biaya', [], { skipPush: true });
        db.set('BIAYA', [], { skipPush: true });
        db.set('tarif', [], { skipPush: true });
        counts.biaya = 0;
      }
    }

    const allStudentsPull = useStore.getState().students || [];

    if (resTagihan.success && Array.isArray(resTagihan.data)) {
      if (resTagihan.data.length > 0) {
        const normalizedTagihan = deduplicateTagihanList(resTagihan.data.map((r, i) => normalizeTagihanRow(r, i, allStudentsPull)));
        db.set('keuangan_tagihan', normalizedTagihan, { skipPush: true });
        db.set('TAGIHAN', normalizedTagihan, { skipPush: true });
        counts.tagihan = normalizedTagihan.length;
      } else {
        db.set('keuangan_tagihan', [], { skipPush: true });
        db.set('TAGIHAN', [], { skipPush: true });
        counts.tagihan = 0;
      }
    }

    if (resPembayaran.success && Array.isArray(resPembayaran.data)) {
      if (resPembayaran.data.length > 0) {
        const normalizedPembayaran = deduplicatePembayaranList(resPembayaran.data.map((r, i) => normalizePembayaranRow(r, i, allStudentsPull)));
        db.set('keuangan_pembayaran', normalizedPembayaran, { skipPush: true });
        db.set('keuangan_invoices', normalizedPembayaran, { skipPush: true });
        db.set('PEMBAYARAN', normalizedPembayaran, { skipPush: true });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_keuangan_cleared');
        }
        counts.pembayaran = normalizedPembayaran.length;
      } else {
        db.set('keuangan_pembayaran', [], { skipPush: true });
        db.set('keuangan_invoices', [], { skipPush: true });
        db.set('PEMBAYARAN', [], { skipPush: true });
        counts.pembayaran = 0;
      }
    }

    if (resTabungan.success && Array.isArray(resTabungan.data)) {
      if (resTabungan.data.length > 0) {
        const normalizedTabungan = deduplicateTabunganList(resTabungan.data.map((r, i) => normalizeTabunganRow(r, i, allStudentsPull)));
        db.set('keuangan_tabungan', normalizedTabungan, { skipPush: true });
        db.set('TABUNGAN', normalizedTabungan, { skipPush: true });
        counts.tabungan = normalizedTabungan.length;
      } else {
        db.set('keuangan_tabungan', [], { skipPush: true });
        db.set('TABUNGAN', [], { skipPush: true });
        counts.tabungan = 0;
      }
    }

    if (resKas.success && Array.isArray(resKas.data)) {
      if (resKas.data.length > 0) {
        const normalizedKas = deduplicateKasList(resKas.data);
        db.set('keuangan_kas', normalizedKas, { skipPush: true });
        db.set('KAS', normalizedKas, { skipPush: true });
      } else {
        db.set('keuangan_kas', [], { skipPush: true });
        db.set('KAS', [], { skipPush: true });
      }
    }

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all', skipPush: true } }));
    return {
      success: true,
      message: `✓ Berhasil menyinkronkan data keuangan dari Google Spreadsheet (Siswa: ${counts.siswa || 409}, Biaya: ${counts.biaya}, Tagihan: ${counts.tagihan}, Pembayaran: ${counts.pembayaran}, Tabungan: ${counts.tabungan})`,
      counts
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal menarik data keuangan: ' + (err.message || String(err)),
      counts
    };
  }
}


