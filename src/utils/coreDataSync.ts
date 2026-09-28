import { db } from '../data/db';
import { useStore, cleanStudentClass } from '../store';
import { syncUserAccountsFromMasterData } from './studentSyncHelper';
import { pullSpecificSheetFromGas } from './gasSync';
import { 
  normalizePembayaranRow, 
  deduplicatePembayaranList, 
  normalizeTabunganRow, 
  deduplicateTabunganList, 
  normalizeBiayaRow,
  normalizeTagihanRow,
  deduplicateTagihanList,
  deduplicateKasList
} from '../lib/keuanganNormalizers';

let isSyncing = false;
let lastSyncedAtTime = 0;

export interface CoreSyncResult {
  success: boolean;
  message: string;
  counts: {
    siswa: number;
    pembayaran: number;
    tagihan: number;
    tabungan: number;
    biaya: number;
    kas?: number;
  };
}

/**
 * Sinkronisasi data inti Google Spreadsheet (SISWA, PEMBAYARAN, TAGIHAN, TABUNGAN, BIAYA, KAS)
 * langsung dari endpoint server berkecepatan tinggi (1-2 detik) dengan fallback otomatis ke Google Apps Script.
 */
export async function syncCoreSpreadsheetData(options?: { force?: boolean }): Promise<CoreSyncResult> {
  const now = Date.now();
  // Cegah spamming sync berulang dalam rentang 3 detik jika tidak dipaksa
  if (isSyncing || (!options?.force && now - lastSyncedAtTime < 3000)) {
    const currentStudents = useStore.getState().students || [];
    const currentPembayaran = db.get('keuangan_pembayaran') || db.get('PEMBAYARAN') || [];
    const currentTagihan = db.get('keuangan_tagihan') || db.get('TAGIHAN') || [];
    const currentTabungan = db.get('keuangan_tabungan') || db.get('TABUNGAN') || [];
    const currentBiaya = db.get('keuangan_biaya') || db.get('BIAYA') || [];
    const currentKas = db.get('keuangan_kas') || db.get('KAS') || [];
    return {
      success: true,
      message: 'Sinkronisasi inti sedang berjalan atau data masih segar.',
      counts: {
        siswa: currentStudents.length,
        pembayaran: currentPembayaran.length,
        tagihan: currentTagihan.length,
        tabungan: currentTabungan.length,
        biaya: currentBiaya.length,
        kas: currentKas.length
      }
    };
  }

  isSyncing = true;
  const counts = { siswa: 0, pembayaran: 0, tagihan: 0, tabungan: 0, biaya: 0, kas: 0 };

  try {
    // 1. Tarik Sheet SISWA, PEMBAYARAN, TAGIHAN, TABUNGAN, BIAYA, KAS secara paralel (Server CSV 1-2s + Auto Fallback GAS)
    const [resSiswa, resPembayaran, resTagihan, resTabungan, resBiaya, resKas] = await Promise.allSettled([
      pullSpecificSheetFromGas('SISWA'),
      pullSpecificSheetFromGas('PEMBAYARAN'),
      pullSpecificSheetFromGas('TAGIHAN'),
      pullSpecificSheetFromGas('TABUNGAN'),
      pullSpecificSheetFromGas('BIAYA'),
      pullSpecificSheetFromGas('KAS'),
    ]);

    // Handle SISWA (Target: 409 Siswa Real Google Spreadsheet)
    if (resSiswa.status === 'fulfilled' && resSiswa.value?.success && Array.isArray(resSiswa.value.data) && resSiswa.value.data.length > 0) {
      const rawSiswa = resSiswa.value.data;
      const cleaned = rawSiswa
        .map(cleanStudentClass)
        .filter((s: any) => s && s.name && s.name.trim().length > 0 && s.name !== '-' && s.name !== 'undefined');

      if (cleaned.length > 0) {
        useStore.getState().setStudents(cleaned);
        db.set('students', cleaned, { skipPush: true });
        db.set('siswa', cleaned, { skipPush: true });
        db.set('SISWA', cleaned, { skipPush: true });
        counts.siswa = cleaned.length;
        try {
          syncUserAccountsFromMasterData();
        } catch (e) {
          console.warn('syncUserAccounts error in coreDataSync:', e);
        }
      }
    } else {
      counts.siswa = (useStore.getState().students || []).length;
      try {
        syncUserAccountsFromMasterData();
      } catch {}
    }

    const allStudents = useStore.getState().students || [];

    // Handle PEMBAYARAN (Target: 424 Kwitansi Real Google Spreadsheet)
    if (resPembayaran.status === 'fulfilled' && resPembayaran.value?.success && Array.isArray(resPembayaran.value.data) && resPembayaran.value.data.length > 0) {
      const rawPembayaran = resPembayaran.value.data;
      const normalized = rawPembayaran.map((r: any, idx: number) => normalizePembayaranRow(r, idx, allStudents));
      const deduped = deduplicatePembayaranList(normalized);

      if (deduped.length > 0) {
        db.set('keuangan_pembayaran', deduped, { skipPush: true });
        db.set('keuangan_invoices', deduped, { skipPush: true });
        db.set('PEMBAYARAN', deduped, { skipPush: true });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_keuangan_cleared');
        }
        counts.pembayaran = deduped.length;
      }
    } else {
      counts.pembayaran = (db.get('keuangan_pembayaran') || []).length;
    }

    // Handle TAGIHAN (Target: 1574 Tagihan Real Google Spreadsheet)
    if (resTagihan.status === 'fulfilled' && resTagihan.value?.success && Array.isArray(resTagihan.value.data) && resTagihan.value.data.length > 0) {
      const rawTagihan = resTagihan.value.data;
      const normalizedTagihan = rawTagihan.map((r: any, idx: number) => normalizeTagihanRow(r, idx, allStudents));
      const dedupedTagihan = deduplicateTagihanList(normalizedTagihan);

      if (dedupedTagihan.length > 0) {
        db.set('keuangan_tagihan', dedupedTagihan, { skipPush: true });
        db.set('TAGIHAN', dedupedTagihan, { skipPush: true });
        counts.tagihan = dedupedTagihan.length;
      }
    } else {
      counts.tagihan = (db.get('keuangan_tagihan') || db.get('TAGIHAN') || []).length;
    }

    // Handle TABUNGAN (Target: 1656 Transaksi Real Google Spreadsheet)
    if (resTabungan.status === 'fulfilled' && resTabungan.value?.success && Array.isArray(resTabungan.value.data) && resTabungan.value.data.length > 0) {
      const rawTabungan = resTabungan.value.data;
      const normalizedTab = deduplicateTabunganList(rawTabungan.map((r: any, idx: number) => normalizeTabunganRow(r, idx, allStudents)));
      if (normalizedTab.length > 0) {
        db.set('keuangan_tabungan', normalizedTab, { skipPush: true });
        db.set('TABUNGAN', normalizedTab, { skipPush: true });
        counts.tabungan = normalizedTab.length;
      }
    } else {
      counts.tabungan = (db.get('keuangan_tabungan') || []).length;
    }

    // Handle BIAYA
    if (resBiaya.status === 'fulfilled' && resBiaya.value?.success && Array.isArray(resBiaya.value.data) && resBiaya.value.data.length > 0) {
      const rawBiaya = resBiaya.value.data;
      const normalizedBiaya = rawBiaya.map((r: any, idx: number) => normalizeBiayaRow(r, idx));
      if (normalizedBiaya.length > 0) {
        db.set('keuangan_biaya', normalizedBiaya, { skipPush: true });
        db.set('BIAYA', normalizedBiaya, { skipPush: true });
        counts.biaya = normalizedBiaya.length;
      }
    } else {
      counts.biaya = (db.get('keuangan_biaya') || []).length;
    }

    // Handle KAS (Buku Kas Umum Real Google Spreadsheet)
    if (resKas.status === 'fulfilled' && resKas.value?.success && Array.isArray(resKas.value.data) && resKas.value.data.length > 0) {
      const rawKas = resKas.value.data;
      const normalizedKas = deduplicateKasList(rawKas);
      db.set('keuangan_kas', normalizedKas, { skipPush: true });
      db.set('KAS', normalizedKas, { skipPush: true });
      counts.kas = normalizedKas.length;
    } else {
      counts.kas = (db.get('keuangan_kas') || db.get('KAS') || []).length;
    }

    lastSyncedAtTime = Date.now();
    const timeStr = new Date().toLocaleTimeString('id-ID');
    useStore.getState().setLastSyncedAt(timeStr);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'all_synced', skipPush: true } }));
      window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { source: 'core_sync' } }));
    }

    return {
      success: true,
      message: `✓ Berhasil menyinkronkan data Google Spreadsheet (${counts.siswa} Siswa, ${counts.pembayaran} Pembayaran, ${counts.tagihan} Tagihan, ${counts.tabungan} Tabungan, ${counts.biaya} Biaya, ${counts.kas} Kas)!`,
      counts
    };
  } catch (err: any) {
    console.error('Error in syncCoreSpreadsheetData:', err);
    return {
      success: false,
      message: 'Gagal menyinkronkan data: ' + (err?.message || String(err)),
      counts
    };
  } finally {
    isSyncing = false;
  }
}

