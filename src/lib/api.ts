import { Student } from '../types';
import { DEFAULT_APP_CONFIG } from '../data/config';

// Converts a File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const fetchFromGAS = async (url: string, payload: any) => {
  if (!url) throw new Error("Google Apps Script URL is not configured. Go to Settings.");
  
  // Circuit Breaker: Cegah transmisi array kosong pada aksi tulis/sinkron sheet untuk melindungi dari penghapusan massal
  const syncWriteActions = ['syncData', 'syncTable', 'SYNC_SHEET', 'sync', 'SYNC', 'SYNC_DATA', 'SYNC_TABLE', 'db_import'];
  if (payload && syncWriteActions.includes(payload.action)) {
    const candidateData = payload.data ?? payload.records ?? payload.students;
    if (Array.isArray(candidateData) && candidateData.length === 0) {
      console.warn(`[Anti-Empty Circuit Breaker] Mencegah pengiriman payload kosong ke GAS action '${payload.action}' tabel '${payload.table || payload.sheetName || 'target'}'.`);
      return {
        status: 'skipped',
        success: true,
        ok: true,
        message: `Proteksi Keamanan Aktif: Pengiriman data kosong ke sheet '${payload.table || payload.sheetName || 'target'}' dicegah agar data di spreadsheet tidak terhapus.`
      };
    }
  }

  const targetSpreadsheetId = payload?.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
  const enrichedPayload = {
    spreadsheetId: targetSpreadsheetId,
    ...payload
  };

  let directErrorMsg = '';
  try {
    // Attempt 1: Direct fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(enrichedPayload)
    });

    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();

      // If GAS direct response returns HTML (e.g. Google Sign-In redirect or Drive warning), treat it as an error to fallback to proxy
      if (trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html')) {
        throw new Error("Google Apps Script mengembalikan dokumen HTML alih-alih JSON (kemungkinan izin 'Anyone' belum aktif atau redirect Google).");
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }

      if (data && data.error) {
        throw new Error(data.error);
      }
      return data;
    } else {
      directErrorMsg = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (directErr: any) {
    directErrorMsg = directErr?.message || String(directErr);
    console.warn(`[fetchFromGAS] Direct fetch attempt to GAS failed (${directErrorMsg}), falling back to backend proxy /api/gas-proxy...`);
  }

  // Attempt 2: Fallback via backend proxy (/api/gas-proxy)
  const executeProxy = async (retryCount = 0): Promise<any> => {
    try {
      const proxyRes = await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          payload: enrichedPayload,
        }),
      });

      const resText = await proxyRes.text().catch(() => '');
      const trimmed = resText.trim();

      // Check if proxy returned HTML (e.g. cold start screen or container 502/504 gateway timeout)
      const isHtml = trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html');

      if (isHtml) {
        if (retryCount < 1) {
          console.warn(`[fetchFromGAS] Proxy returned HTML (server might be booting), retrying in 1.2s...`);
          await new Promise(r => setTimeout(r, 1200));
          return executeProxy(retryCount + 1);
        }
        throw new Error(
          `Server backend atau Google Apps Script mengembalikan halaman web HTML (HTTP ${proxyRes.status}). Pastikan server aktif dan deployment Google Apps Script disetel ke akses 'Anyone'.`
        );
      }

      let data: any;
      try {
        data = JSON.parse(resText);
      } catch (parseErr: any) {
        console.warn(`[fetchFromGAS] Non-JSON proxy response: ${resText.slice(0, 100)}`);
        return {
          success: false,
          status: 'error',
          isOffline: true,
          message: `Format respons proxy server bukan JSON valid: ${resText.slice(0, 100)}`,
          data: null
        };
      }

      // Check if proxy returned offline / network error payload
      if (data && (data.isOffline || data.status === 'network_error')) {
        console.warn(`[fetchFromGAS] Google Apps Script server offline/socket reset:`, data.error || data.message);
        return {
          success: false,
          status: 'offline_fallback',
          isOffline: true,
          message: data.message || data.error || 'Server Google Apps Script sedang offline atau koneksi terputus.',
          data: null
        };
      }

      // Check if proxy returned HTML indication
      if (data && (data.isHtml || data.status === 'html_response')) {
        console.warn(`[fetchFromGAS] Google Apps Script returned HTML document instead of JSON`);
        return {
          success: false,
          status: 'html_response',
          isHtml: true,
          message: data.error || 'Google Apps Script mengembalikan dokumen HTML alih-alih data JSON.',
          data: null
        };
      }

      if (!proxyRes.ok) {
        const errMsg = data?.error || data?.message || `Server Proxy Error: HTTP ${proxyRes.status} ${proxyRes.statusText}`;
        console.warn(`[fetchFromGAS] Proxy response status not ok:`, errMsg);
        return {
          success: false,
          status: 'error',
          message: errMsg,
          data: null
        };
      }

      if (data && data.error && !data.success) {
        console.warn(`[fetchFromGAS] GAS response indicated error:`, data.error);
        return data;
      }

      // Safeguard against { raw: "<!doctype..." }
      if (data && data.raw && typeof data.raw === 'string') {
        const rawTrimmed = data.raw.trim();
        if (rawTrimmed.startsWith('<') || rawTrimmed.toLowerCase().includes('<!doctype') || rawTrimmed.toLowerCase().includes('<html')) {
          console.warn(`[fetchFromGAS] GAS returned raw HTML string`);
          return {
            success: false,
            status: 'html_response',
            isHtml: true,
            message: "Google Apps Script mengembalikan halaman web HTML, bukan data JSON.",
            data: null
          };
        }
      }

      return data;
    } catch (proxyErr: any) {
      if (retryCount < 1 && proxyErr?.message && proxyErr.message.includes('Failed to fetch')) {
        console.warn(`[fetchFromGAS] Proxy network failure, retrying in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
        return executeProxy(retryCount + 1);
      }
      throw proxyErr;
    }
  };

  try {
    return await executeProxy();
  } catch (proxyErr: any) {
    console.warn(`[fetchFromGAS] Handled proxy failure gracefully:`, proxyErr?.message || proxyErr);
    return {
      success: false,
      status: 'offline_fallback',
      isOffline: true,
      message: `Gagal menghubungi server sync atau Google Apps Script (Direct: ${directErrorMsg || 'CORS/Network error'}, Proxy: ${proxyErr?.message || 'Failed to fetch'}).`,
      data: null
    };
  }
};

export const uploadFileToGAS = async (
  url: string, 
  file: File, 
  folderNameOrFolderId: string = "SI_Siswa_Uploads", 
  customFilename?: string,
  extraMeta?: {
    studentId?: string;
    nopdkt?: string;
    studentName?: string;
    studentClass?: string;
    subFolder?: string;
    nisn?: string;
    docKey?: string;
    modul?: string;
    kategori?: string;
    uploadedBy?: string;
    nip?: string;
    teacherName?: string;
    [key: string]: any;
  }
): Promise<{ success: boolean; url: string; fileId?: string; directUrl?: string; folderName?: string; folderUrl?: string; folderId?: string }> => {
  const base64Data = await fileToBase64(file);
  // Remove data:image/png;base64, or any mime prefix cleanly
  const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  
  // Google Drive folder ID is typically 25+ alphanumeric characters (may contain _ and -) without whitespace
  const trimmedFolder = (folderNameOrFolderId || "").trim();
  const isLikelyFolderId = trimmedFolder.length >= 25 && /^[a-zA-Z0-9_-]+$/.test(trimmedFolder);
  
  const payload = {
    action: 'upload',
    filename: customFilename || file.name,
    mimeType: file.type || 'application/octet-stream',
    base64: base64Content,
    folderName: isLikelyFolderId ? "SI_Siswa_Uploads" : (trimmedFolder || "SI_Siswa_Uploads"),
    folderId: isLikelyFolderId ? trimmedFolder : undefined,
    ...(extraMeta || {})
  };

  const res = await fetchFromGAS(url, payload);
  if (res && res.error) {
    let errMsg = String(res.error);
    if (errMsg.includes('DriveApp') || errMsg.includes('Akses ditolak') || errMsg.includes('Access denied')) {
      errMsg = "Izin Google Drive (DriveApp) belum aktif pada Google Apps Script Anda. Buka editor Apps Script, pilih fungsi 'otorisasiDrive' (atau 'setup') di toolbar atas, klik 'Jalankan' (Run ▶) lalu izinkan akses, kemudian klik 'Deploy' > 'Deployment Baru'.";
    }
    throw new Error(errMsg);
  }
  return res; // Return response object { success: true, url: "...", fileId: "...", directUrl: "..." }
};

export const renameGoogleDriveFile = async (
  gasUrl: string,
  fileIdOrUrl: string,
  newName: string
): Promise<{ success: boolean; fileId?: string; oldName?: string; newName?: string; message?: string }> => {
  // Extract 25+ character Google Drive ID if full URL is passed
  let fileId = fileIdOrUrl;
  const match = String(fileIdOrUrl).match(/[-\w]{25,}/);
  if (match) {
    fileId = match[0];
  }
  if (!fileId) throw new Error("ID berkas Google Drive tidak ditemukan dari URL/input.");

  const payload = {
    action: 'RENAME_DRIVE_FILE',
    fileId,
    newName
  };

  const res = await fetchFromGAS(gasUrl, payload);
  if (!res || res.error || res.status === 'error' || res.success === false) {
    const rawMsg = res?.error || res?.message || 'Gagal mengubah nama berkas di Google Drive';
    let errMsg = String(rawMsg);
    if (errMsg.includes('Aksi tidak dikenal') || errMsg.includes('unknown action')) {
      errMsg = "DEPLOYMENT_OUTDATED: Google Apps Script di akun Anda belum diperbarui dengan versi terbaru yang memiliki fitur RENAME_DRIVE_FILE. Harap salin kode script terbaru lalu lakukan 'Kelola Deployment' -> 'Versi Baru' di Apps Script.";
    } else if (errMsg.includes('DriveApp') || errMsg.includes('Akses ditolak') || errMsg.includes('Access denied') || errMsg.includes('terkait izin')) {
      errMsg = "IZIN_DRIVE_BELUM_AKTIF: Izin DriveApp belum diotorisasi pada Google Apps Script Anda. Buka editor Google Apps Script, jalankan fungsi 'otorisasiDrive' (atau 'setup') sekali untuk memberi izin akses Google Drive.";
    } else if (errMsg.includes('tidak ditemukan') || errMsg.includes('File not found')) {
      errMsg = "BERKAS_TIDAK_DITEMUKAN: Berkas Google Drive tidak ditemukan atau akun Google Apps Script Anda tidak memiliki hak akses edit ke berkas tersebut.";
    }
    throw new Error(errMsg);
  }
  return res;
};

export const getGoogleDriveFileInfo = async (
  gasUrl: string,
  fileIdOrUrl: string
): Promise<{ success: boolean; id?: string; name?: string; fileName?: string; mimeType?: string; size?: number; url?: string }> => {
  let fileId = fileIdOrUrl;
  const match = String(fileIdOrUrl).match(/[-\w]{25,}/);
  if (match) {
    fileId = match[0];
  }
  if (!fileId) throw new Error("ID berkas Google Drive tidak ditemukan.");

  const payload = {
    action: 'GET_DRIVE_FILE_INFO',
    fileId
  };

  const res = await fetchFromGAS(gasUrl, payload);
  if (!res || res.error || res.status === 'error' || res.success === false) {
    const rawMsg = res?.error || res?.message || 'Gagal mengambil info berkas Google Drive';
    throw new Error(String(rawMsg));
  }
  return res;
};

