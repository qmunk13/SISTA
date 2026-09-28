/**
 * Utility Service untuk Sinkronisasi Realtime 2-Arah dengan Google Apps Script (56 Sheet)
 * Mendukung JSONP Fallback untuk menghindari CORS issue pada browser!
 */

import { DEFAULT_APP_CONFIG } from '../data/config';
import { fetchFromGAS } from '../lib/api';

export const STORAGE_KEY_GAS_URL = 'sista_gas_url';
export const STORAGE_KEY_SPREADSHEET_URL = 'sista_spreadsheet_url';

let inMemoryGasUrl = '';
let inMemorySpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4/edit?usp=drive_link';
let inMemoryLastSiswaCount = 0;

export function isValidGasUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') && !trimmed.includes('AKfycbx_SISTA_ROMBEL_56_TABLES');
}

export function getStoredGasUrl(): string {
  if (isValidGasUrl(inMemoryGasUrl)) return inMemoryGasUrl;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GAS_URL);
      if (stored && isValidGasUrl(stored)) return stored.trim();
      const erpSettings = localStorage.getItem('erp_settings');
      if (erpSettings) {
        const parsed = JSON.parse(erpSettings);
        if (parsed?.gasUrl && isValidGasUrl(parsed.gasUrl)) return parsed.gasUrl.trim();
        if (parsed?.scriptUrl && isValidGasUrl(parsed.scriptUrl)) return parsed.scriptUrl.trim();
      }
    } catch {}
  }
  return DEFAULT_APP_CONFIG.gasUrl || DEFAULT_APP_CONFIG.scriptUrl || '';
}

export function saveStoredGasUrl(url: string): void {
  inMemoryGasUrl = url.trim();
}

export function getStoredSpreadsheetUrl(): string {
  return inMemorySpreadsheetUrl;
}

export function saveStoredSpreadsheetUrl(url: string): void {
  inMemorySpreadsheetUrl = url.trim();
}

function extractSheetMap(data: any): Record<string, any[]> {
  if (!data || typeof data !== 'object') return {};
  let current = data;
  let iterations = 0;
  while (current && typeof current === 'object' && iterations < 5) {
    iterations++;
    // If current object directly contains known table keys or array values, we found the dictionary
    if (current.SISWA || current.GURU || current.ABSENSI || current.USERS || current.siswa) {
      break;
    }
    if (current.data && typeof current.data === 'object' && !Array.isArray(current.data)) {
      current = current.data;
    } else {
      break;
    }
  }
  return (current && typeof current === 'object') ? current : {};
}

// Track last known remote counts to prevent accidental data overwrites
export const STORAGE_KEY_LAST_SISWA_COUNT = 'sista_last_siswa_count';

/**
 * Smart Merge untuk menggabungkan data lokal & data dari Google Sheets tanpa menghapus data lokal (seperti 378 siswa yang diimpor)
 */
export function smartMergeDbData(prevLocal: Record<string, any[]>, newRemote: Record<string, any[]>): Record<string, any[]> {
  if (!newRemote || typeof newRemote !== 'object') return prevLocal;
  const merged: Record<string, any[]> = { ...prevLocal };

  Object.keys(newRemote).forEach((sheetKey) => {
    const remoteList = newRemote[sheetKey];
    if (!Array.isArray(remoteList)) return;

    const upperKey = sheetKey.toUpperCase();
    const localList = prevLocal[upperKey] || prevLocal[sheetKey] || [];

    // Track total siswa dari remote jika ini sheet SISWA
    if (upperKey === 'SISWA' && remoteList.length > 0) {
      if (remoteList.length > inMemoryLastSiswaCount) {
        inMemoryLastSiswaCount = remoteList.length;
      }
    }

    // Rule 1: Untuk sheet operasional dinamis (CBT & Keuangan), jika remote kosong berarti pengguna telah menghapus/mengosongkannya di spreadsheet.
    const dynamicOperasionalSheets = ['BANK_SOAL', 'SOAL', 'BIAYA', 'TAGIHAN', 'PEMBAYARAN', 'TABUNGAN', 'KAS'];
    if (remoteList.length === 0) {
      if (dynamicOperasionalSheets.includes(upperKey)) {
        merged[upperKey] = [];
        merged[sheetKey] = [];
      } else if (localList.length > 0) {
        // Hanya pertahankan lokal untuk master data kritikal jika remote gagal load
        merged[upperKey] = localList;
        merged[sheetKey] = localList;
      }
      return;
    }

    // Rule 2: Jika lokal kosong, langsung gunakan remote
    if (localList.length === 0) {
      merged[upperKey] = remoteList;
      merged[sheetKey] = remoteList;
      return;
    }

    // Rule 3: Cari field primary key unik
    const sample = localList[0] || remoteList[0] || {};
    const keyCandidates = [
      'BankSoalID', 'bankSoalId', 'DetailSoalID', 'detailSoalId', 'NomorSoal',
      'UjianID', 'ujianId', 'idUjian', 'JadwalID', 'idJadwal',
      'nopdkt', 'NISN', 'id', 'tagihanId', 'TagihanID', 'NoTagihan', 'invoiceId',
      'pembayaranId', 'PembayaranID', 'noKwitansi', 'NoKwitansi', 'NoBukti',
      'tabunganId', 'TabunganID', 'NoTransaksi', 'biayaId', 'kodeBiaya', 'KodeBiaya',
      'KasID', 'idNotif', 'username',
      'NO_JADWAL', 'ID_HASIL', 'idFile', 'idAgenda', 'idTugas', 'PengeluaranID',
      'idBackup', 'idArsip', 'NO_LOG', 'idPemeliharaan'
    ];
    const keyField = keyCandidates.find((k) => k in sample || (remoteList[0] && k in remoteList[0]));

    if (keyField) {
      const map = new Map<string, any>();
      // Helper untuk mendapatkan key unik yang stabil untuk setiap baris
      const getItemKey = (item: any, prefix: string, idx: number) => {
        const val = String(item[keyField] ?? '').trim();
        if (val && val !== '-' && val !== 'undefined' && val !== 'null') return val;
        // Fallback ke identifier lain yang mungkin ada
        const alt = String(item.id || item.ID || item.nopdkt || item.NISN || item.NIK || item.NamaLengkap || item.Nama || '').trim();
        if (alt && alt !== '-' && alt !== 'undefined' && alt !== 'null') return alt;
        return `${prefix}_row_${idx}`;
      };

      // 1. Masukkan semua data lokal terlebih dahulu
      localList.forEach((item, idx) => {
        const key = getItemKey(item, 'loc', idx);
        map.set(key, item);
      });
      // 2. Gabungkan data remote: perbarui jika ada, tambahkan jika belum ada (Remote selalu diutamakan)
      remoteList.forEach((item, idx) => {
        const key = getItemKey(item, 'rem', idx);
        const existing = map.get(key);
        map.set(key, existing ? { ...existing, ...item } : item);
      });
      const combined = Array.from(map.values());
      merged[upperKey] = combined;
      merged[sheetKey] = combined;
    } else {
      // Jika tidak ada key unik & lokal memiliki baris jauh lebih banyak, pertahankan lokal agar tidak terhapus
      if (localList.length > remoteList.length) {
        merged[upperKey] = localList;
        merged[sheetKey] = localList;
      } else {
        merged[upperKey] = remoteList;
        merged[sheetKey] = remoteList;
      }
    }
  });

  return merged;
}

let inFlightPullAllPromise: Promise<{ success: boolean; data?: Record<string, any[]>; message: string }> | null = null;
const inFlightSheetPullMap = new Map<string, Promise<{ success: boolean; data?: any[]; message: string }>>();

/**
 * Memanggil GET_ALL_SHEETS secara berjenjang (Server CSV Cache/Fast -> Server Proxy -> JSONP Fallback)
 * sehingga tidak membanjiri jaringan dengan 4 request besar sekaligus.
 */
export async function pullAllSheetsFromGas(gasUrl?: string): Promise<{ success: boolean; data?: Record<string, any[]>; message: string }> {
  if (inFlightPullAllPromise) {
    return inFlightPullAllPromise;
  }

  inFlightPullAllPromise = (async () => {
    let url = (gasUrl?.trim() || getStoredGasUrl()).trim();
    const timestamp = Date.now();

    // Method 0: Ultra-Fast Server Direct Sync (Reads all sheets via cached/concurrent CSV exports)
    try {
      const fastRes = await fetch(`/api/sync-all-sheets?t=${timestamp}`);
      if (fastRes.ok) {
        const fastJson = await fastRes.json();
        const extracted = extractSheetMap(fastJson);
        if (fastJson && fastJson.success && Object.keys(extracted).length > 0) {
          return {
            success: true,
            data: extracted,
            message: `✓ Berhasil memperbarui data dari Google Spreadsheet (${fastJson.sheetCount || Object.keys(extracted).length} sheet)!`
          };
        }
      }
    } catch {}

    if (!isValidGasUrl(url)) {
      return { success: false, message: 'URL Google Apps Script belum diatur atau belum valid.' };
    }

    if (url.endsWith('/dev')) {
      url = url.substring(0, url.length - 4) + '/exec';
    }

    // Fallback Methods (Proxy + Direct + JSONP) only when Method 0 fails
    return new Promise<{ success: boolean; data?: Record<string, any[]>; message: string }>((resolve) => {
      let isResolved = false;
      const callbackName = `gas_callback_${Math.floor(Math.random() * 1000000)}`;
      const script = document.createElement('script');
      script.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve({
            success: false,
            message: 'Timeout koneksi Google Apps Script (75s). Pastikan Web App dipublikasikan dengan akses "Anyone" (Siapa saja) dan URL berakhiran "/exec".'
          });
        }
      }, 75000);

      const cleanup = () => {
        (window as any)[callbackName] = () => {
          try {
            delete (window as any)[callbackName];
          } catch {}
        };
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        clearTimeout(timeout);
      };

      (window as any)[callbackName] = (data: any) => {
        if (!isResolved) {
          const extracted = extractSheetMap(data);
          if (data && (data.status === 'success' || data.data || Object.keys(extracted).length > 0)) {
            isResolved = true;
            cleanup();
            resolve({
              success: true,
              data: extracted,
              message: '✓ Berhasil memperbarui data dari Google Spreadsheet via JSONP!'
            });
          }
        }
      };

      const separator = url.includes('?') ? '&' : '?';

      // Method 1: Server Proxy Fetch
      fetch(`/api/gas-proxy?url=${encodeURIComponent(url)}&action=GET_ALL_SHEETS&t=${timestamp}`)
        .then(async (proxyRes) => {
          if (!isResolved && proxyRes.ok) {
            try {
              const proxyJson = await proxyRes.json().catch(() => null);
              if (!proxyJson) return;
              const extracted = extractSheetMap(proxyJson);
              if (proxyJson && (proxyJson.status === 'success' || proxyJson.data || Object.keys(extracted).length > 0)) {
                isResolved = true;
                cleanup();
                resolve({
                  success: true,
                  data: extracted,
                  message: '✓ Berhasil memperbarui data dari Google Spreadsheet via Server Proxy!'
                });
              }
            } catch {}
          }
        })
        .catch(() => {});

      // Method 2: JSONP Fallback
      script.src = `${url}${separator}action=GET_ALL_SHEETS&callback=${callbackName}&t=${timestamp}`;
      script.onerror = (e) => {
        if (typeof e === 'object' && e !== null && 'stopPropagation' in e && typeof (e as Event).stopPropagation === 'function') {
          (e as Event).stopPropagation();
        }
      };

      try {
        document.head.appendChild(script);
      } catch {}
    });
  })();

  try {
    return await inFlightPullAllPromise;
  } finally {
    inFlightPullAllPromise = null;
  }
}

/**
 * Mengirim & Menyingkronkan Massal 56 Sheet ke Google Apps Script (POST Instan)
 */
export async function pushAllSheetsToGas(dbData: Record<string, any[]>, gasUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = gasUrl?.trim() || getStoredGasUrl();
  if (!isValidGasUrl(url)) {
    return { success: false, message: 'URL Google Apps Script tidak diset atau belum valid.' };
  }

  // Protection Guard: Jangan izinkan push jika data siswa lokal hanya contoh/sample kecil (< 10) padahal sebelumnya ada 10+ siswa
  const siswaList = dbData.SISWA || dbData.siswa || [];
  const lastKnownSiswaCount = inMemoryLastSiswaCount;
  
  if (lastKnownSiswaCount > 10 && siswaList.length <= 5) {
    console.warn(`[Protection] Auto-push dibatalkan untuk mencegah penimpaan data Sheet (${lastKnownSiswaCount} siswa di Sheet vs ${siswaList.length} siswa lokal).`);
    return {
      success: false,
      message: `Aplikasi menolak menimpa Google Sheets (${lastKnownSiswaCount} data di Sheet) dengan sampel data lokal yang lebih sedikit. Mengambil data terbaru dari Sheet...`
    };
  }

  const payloadData = {
    action: 'MASS_SYNC_ALL',
    allDataJson: JSON.stringify(dbData)
  };

  try {
    // Standard fast no-cors POST payload
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadData)
    });

    return {
      success: true,
      message: '⚡ Data 56 Sheet terkirim & disinkronkan ke Google Spreadsheet!'
    };
  } catch (err) {
    console.error('Push to GAS error:', err);
    return {
      success: false,
      message: 'Gagal mengirim data ke Google Apps Script: ' + (err instanceof Error ? err.message : String(err))
    };
  }
}

/**
 * Menarik 1 sheet spesifik secara cepat (2-4 detik) menggunakan action=GET_SHEET&sheetName=...
 */
export async function pullSpecificSheetFromGas(
  sheetName: string,
  gasUrl?: string
): Promise<{ success: boolean; data?: any[]; message: string }> {
  const upperKey = sheetName.trim().toUpperCase();
  const existingFlight = inFlightSheetPullMap.get(upperKey);
  if (existingFlight) {
    return existingFlight;
  }

  const pullPromise = (async (): Promise<{ success: boolean; data?: any[]; message: string }> => {
    // Method 0: Ultra-fast direct server CSV endpoint (fetches from server RAM cache in <5ms or live GID in 1-2s)
    try {
      const fastRes = await fetch(`/api/sheet-data/${encodeURIComponent(upperKey)}`);
      if (fastRes.ok) {
        const fastJson = await fastRes.json();
        if (fastJson.success && Array.isArray(fastJson.data)) {
          return {
            success: true,
            data: fastJson.data,
            message: fastJson.data.length > 0 
              ? `✓ Berhasil menarik ${fastJson.data.length} baris dari Sheet ${sheetName} secara instan!`
              : `Sheet ${sheetName} di Google Spreadsheet saat ini kosong (0 data).`
          };
        }
      }
    } catch {
      // Continue to standard GAS methods
    }

  let url = (gasUrl?.trim() || getStoredGasUrl()).trim();
  if (!isValidGasUrl(url)) {
    return { success: false, message: 'URL Google Apps Script belum diatur atau belum valid.' };
  }
  if (url.endsWith('/dev')) {
    url = url.substring(0, url.length - 4) + '/exec';
  }

  // Method 1: Proxy/Direct via fetchFromGAS (bypasses CORS via server proxy seamlessly)
  try {
    const res = await fetchFromGAS(url, { action: 'GET_SHEET', sheetName });
    let rows: any[] = [];
    if (res) {
      if (Array.isArray(res.data)) rows = res.data;
      else if (res.data && Array.isArray(res.data.data)) rows = res.data.data;
      else if (Array.isArray(res)) rows = res;
      else if (res.status === 'success' && Array.isArray(res.result)) rows = res.result;

      if (rows.length > 0 || res.status === 'success') {
        return {
          success: true,
          data: rows,
          message: `✓ Berhasil menarik ${rows.length} baris dari Sheet ${sheetName}!`
        };
      }
    }
  } catch {
    // Continue to GET / JSONP fallback
  }

  const separator = url.includes('?') ? '&' : '?';
  const targetUrl = `${url}${separator}action=GET_SHEET&sheetName=${encodeURIComponent(sheetName)}&t=${Date.now()}`;

  // Method 2: standard fetch
  try {
    const res = await fetch(targetUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      let rows: any[] = [];
      if (Array.isArray(json.data)) rows = json.data;
      else if (json.data && Array.isArray(json.data.data)) rows = json.data.data;
      else if (json.status === 'success' && Array.isArray(json.result)) rows = json.result;

      return {
        success: true,
        data: rows,
        message: `✓ Berhasil menarik ${rows.length} baris dari Sheet ${sheetName}!`
      };
    }
  } catch {
    // Continue to JSONP fallback
  }

  // Method 3: JSONP Fallback
  return new Promise((resolve) => {
    let isResolved = false;
    const callbackName = `gas_sheet_cb_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    script.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({
          success: false,
          message: `Timeout menarik Sheet ${sheetName} (45s).`
        });
      }
    }, 45000);

    const cleanup = () => {
      (window as any)[callbackName] = () => {};
      if (script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timeout);
    };

    (window as any)[callbackName] = (json: any) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        let rows: any[] = [];
        if (Array.isArray(json?.data)) rows = json.data;
        else if (json?.data && Array.isArray(json.data.data)) rows = json.data.data;
        else if (json?.status === 'success' && Array.isArray(json?.result)) rows = json.result;

        resolve({
          success: true,
          data: rows,
          message: `✓ Berhasil menarik ${rows.length} baris dari Sheet ${sheetName}!`
        });
      }
    };

    script.src = `${targetUrl}&callback=${callbackName}`;
    script.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({
          success: false,
          message: `Gagal memuat Sheet ${sheetName} via JSONP.`
        });
      }
    };
    document.body.appendChild(script);
  });
  })();

  inFlightSheetPullMap.set(upperKey, pullPromise);
  try {
    return await pullPromise;
  } finally {
    inFlightSheetPullMap.delete(upperKey);
  }
}

