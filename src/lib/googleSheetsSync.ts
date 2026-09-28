import { AbsensiRecord, Siswa, PengajuanIzin } from '../types';
import { generateMergedCodeGs } from '../data/gasGenerator';

export const DEFAULT_SPREADSHEET_ID = '1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4';
export const DEFAULT_PARENT_FOLDER_ID = '17aeDN26Y-c72JgfmUEfULb6MiPnv1yH0';
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;
export const FOLDER_URL = `https://drive.google.com/drive/u/0/folders/${DEFAULT_PARENT_FOLDER_ID}`;

const KEYS = {
  WEB_APP_URL: 'gas_web_app_url',
  AUTO_SYNC: 'gas_auto_sync',
  LAST_SYNC: 'gas_last_sync_time',
  SPREADSHEET_ID: 'gas_spreadsheet_id',
  FOLDER_ID: 'gas_folder_id',
};

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  parentFolderId: string;
  gasWebAppUrl: string;
  autoSyncEnabled: boolean;
  lastSyncTime: string | null;
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  return {
    spreadsheetId: localStorage.getItem(KEYS.SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID,
    parentFolderId: localStorage.getItem(KEYS.FOLDER_ID) || DEFAULT_PARENT_FOLDER_ID,
    gasWebAppUrl: localStorage.getItem(KEYS.WEB_APP_URL) || '',
    autoSyncEnabled: localStorage.getItem(KEYS.AUTO_SYNC) !== 'false', // default true
    lastSyncTime: localStorage.getItem(KEYS.LAST_SYNC) || null,
  };
}

export function saveGoogleSheetsConfig(config: Partial<GoogleSheetsConfig>): void {
  if (config.spreadsheetId !== undefined) localStorage.setItem(KEYS.SPREADSHEET_ID, config.spreadsheetId);
  if (config.parentFolderId !== undefined) localStorage.setItem(KEYS.FOLDER_ID, config.parentFolderId);
  if (config.gasWebAppUrl !== undefined) localStorage.setItem(KEYS.WEB_APP_URL, config.gasWebAppUrl.trim());
  if (config.autoSyncEnabled !== undefined) localStorage.setItem(KEYS.AUTO_SYNC, String(config.autoSyncEnabled));
  if (config.lastSyncTime !== undefined) {
    if (config.lastSyncTime) {
      localStorage.setItem(KEYS.LAST_SYNC, config.lastSyncTime);
    } else {
      localStorage.removeItem(KEYS.LAST_SYNC);
    }
  }
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  timestamp?: string;
  data?: any;
}

/**
 * Send request to GAS Web App (Direct or Proxy fallback)
 */
async function sendToGas(action: string, payloadData: any): Promise<any> {
  const cfg = getGoogleSheetsConfig();
  const bodyPayload = {
    action,
    spreadsheetId: cfg.spreadsheetId,
    parentFolderId: cfg.parentFolderId,
    ...payloadData,
  };

  if (cfg.gasWebAppUrl) {
    try {
      const res = await fetch(cfg.gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyPayload),
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: res.ok, status: res.ok ? 'success' : 'error', message: text };
      }
    } catch (err) {
      // Fallback to backend proxy if direct fetch fails (e.g. CORS)
    }
  }

  // Fallback via server proxy
  const resProxy = await fetch('/api/gas/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: cfg.gasWebAppUrl,
      body: bodyPayload,
    }),
  });
  const textProxy = await resProxy.text();
  try {
    return JSON.parse(textProxy);
  } catch {
    return { success: false, status: 'error', message: textProxy || `HTTP ${resProxy.status}` };
  }
}

/**
 * Sync attendance records or permissions to Google Spreadsheet
 */
export async function syncRecordsToGoogleSheets(
  records: AbsensiRecord[] | Siswa[] | PengajuanIzin[],
  type: 'harian' | 'izin' | 'siswa' = 'harian'
): Promise<SyncResult> {
  if (!records || records.length === 0) {
    return {
      success: true,
      message: 'Tidak ada data presensi yang perlu disinkronkan.',
      syncedCount: 0,
    };
  }

  try {
    const tableMap: Record<string, string> = {
      harian: 'ABSENSI',
      izin: 'PENGAJUAN_IZIN',
      siswa: 'SISWA',
    };
    const tableName = tableMap[type] || 'ABSENSI';

    const res = await sendToGas('sync_table', {
      table: tableName,
      records: records,
      type: type,
    });

    if (res.status === 'success' || res.success || res.ok) {
      const nowStr = new Date().toLocaleString('id-ID');
      saveGoogleSheetsConfig({ lastSyncTime: nowStr });
      return {
        success: true,
        message: res.message || `Berhasil menyinkronkan ${records.length} data ke Google Spreadsheet!`,
        syncedCount: records.length,
        timestamp: nowStr,
      };
    } else {
      return {
        success: false,
        message: res.message || res.error || 'Gagal mengirim data ke Google Apps Script Web App.',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Terjadi kesalahan saat menyinkronkan data: ' + (error?.message || String(error)),
    };
  }
}

/**
 * Sync single table data directly to Google Apps Script
 */
export async function syncTableToGoogleSheets(tableName: string, records: any[]): Promise<SyncResult> {
  try {
    const res = await sendToGas('sync_table', {
      table: tableName.toUpperCase(),
      records: records,
    });

    if (res.status === 'success' || res.success || res.ok) {
      const nowStr = new Date().toLocaleString('id-ID');
      saveGoogleSheetsConfig({ lastSyncTime: nowStr });
      return {
        success: true,
        message: res.message || `Berhasil menyinkronkan tabel ${tableName} (${records.length} baris)`,
        syncedCount: records.length,
        timestamp: nowStr,
      };
    }
    return { success: false, message: res.message || res.error || 'Gagal sinkronisasi tabel' };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

/**
 * Purge all tables in Google Spreadsheet via GAS Web App
 */
export async function purgeAllGoogleSheets(): Promise<SyncResult> {
  const cfg = getGoogleSheetsConfig();
  if (!cfg.gasWebAppUrl) {
    return {
      success: false,
      message: 'GAS Web App URL belum dikonfigurasi. Pengosongan hanya berlaku di penyimpanan lokal aplikasi.'
    };
  }

  const allTables = [
    'SISWA', 'GURU', 'KELAS', 'MAPEL', 'USERS', 'ABSENSI', 'PENGAJUAN_IZIN',
    'TAGIHAN', 'PEMBAYARAN', 'TABUNGAN', 'BIAYA', 'SPMB_PENDAFTAR', 'SOAL',
    'UJIAN', 'LOG_UJIAN', 'HASIL_UJIAN', 'TUGAS', 'HASIL_TUGAS', 'BUKU',
    'PEMINJAMAN_BUKU', 'BARANG', 'PEMINJAMAN_BARANG', 'BIMBINGAN', 'PELANGGARAN'
  ];

  let successCount = 0;
  for (const tbl of allTables) {
    try {
      await syncTableToGoogleSheets(tbl, []);
      successCount++;
    } catch (e) {}
  }

  return {
    success: true,
    message: `Berhasil mengosongkan ${successCount} tabel di Google Spreadsheet.`,
    syncedCount: successCount
  };
}

/**
 * Fetch table records from Google Apps Script Web App
 */
export async function fetchTableFromGoogleSheets(tableName: string): Promise<SyncResult> {
  try {
    const cfg = getGoogleSheetsConfig();
    let resData: any = null;

    if (cfg.gasWebAppUrl) {
      try {
        const fetchUrl = `${cfg.gasWebAppUrl}?action=read_table&table=${encodeURIComponent(tableName)}&spreadsheetId=${encodeURIComponent(cfg.spreadsheetId)}`;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          resData = await res.json();
        }
      } catch (e) {
        // Fallback to POST
      }
    }

    if (!resData) {
      resData = await sendToGas('read_table', { table: tableName });
    }

    if (resData && (resData.status === 'success' || resData.success || resData.ok)) {
      return {
        success: true,
        message: `Berhasil mengambil data ${tableName}`,
        data: resData.data || resData.records || [],
      };
    }

    return { success: false, message: resData?.message || resData?.error || 'Gagal mengambil data dari Google Sheets' };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

/**
 * Returns complete, production-ready Google Apps Script code for 60 sheets 2-way sync
 */
export function generateGASScriptCode(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  folderId: string = DEFAULT_PARENT_FOLDER_ID
): string {
  return generateMergedCodeGs();
}

function _legacyGenerateGASScriptCode(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  folderId: string = DEFAULT_PARENT_FOLDER_ID
): string {
  return `/**
 * SCRIPT DATABASE ERP ROMBEL KTCT TAMBORA AUTOMATIC 2-WAY SYNC (60 SHEETS)
 * Spreadsheet ID: ${spreadsheetId}
 * Folder ID: ${folderId}
 */

const SPREADSHEET_ID = '${spreadsheetId}';
const PARENT_FOLDER_ID = '${folderId}';

const TABLE_HEADERS = {
  // 1-10: System, User, Role, Access, Session & Log
  'SETTING': ['Key', 'Value'],
  'REFERENSI': ['Kategori', 'Kode', 'Nama', 'Aktif'],
  'USERS': ['UserID', 'Username', 'Password', 'RoleID', 'Nama', 'NIP_NISN', 'Email', 'NoHP', 'Status', 'LastLogin', 'Token', 'CreatedAt', 'UpdatedAt'],
  'ROLE': ['RoleID', 'NamaRole', 'Keterangan'],
  'MENU': ['MenuID', 'ParentID', 'NamaMenu', 'Icon', 'URL', 'Urutan', 'Status'],
  'HAK_AKSES': ['HakAksesID', 'RoleID', 'MenuID', 'Create', 'Read', 'Update', 'Delete', 'Approve', 'Export', 'Import'],
  'SESSION': ['SessionID', 'UserID', 'Token', 'IPAddress', 'Device', 'LoginAt', 'ExpiredAt', 'Status'],
  'LOG': ['LogID', 'UserID', 'Tanggal', 'Aktivitas', 'IP', 'Device', 'Browser'],
  'AUDIT_LOG': ['AuditID', 'UserID', 'Tabel', 'RecordID', 'Field', 'ValueLama', 'ValueBaru', 'Tanggal'],
  'NOTIFIKASI': ['NotifID', 'UserID', 'Judul', 'Pesan', 'Jenis', 'Status', 'Tanggal'],

  // 11-20: Master Data, Civitas & Jadwal
  'SISWA': ['SiswaID', 'NIS', 'NISN', 'NIK', 'NamaLengkap', 'NamaPanggilan', 'JenisKelamin', 'TempatLahir', 'TanggalLahir', 'Agama', 'Alamat', 'RT', 'RW', 'Desa', 'Kecamatan', 'Kabupaten', 'Provinsi', 'KodePos', 'NoHP', 'Email', 'Ayah', 'Ibu', 'NoHPAyah', 'NoHPIbu', 'KelasID', 'JurusanID', 'JenjangID', 'Status', 'Foto', 'TahunMasuk', 'AnakKe', 'Saudara', 'GolonganDarah', 'TinggiBadan', 'BeratBadan', 'Prestasi', 'Hobi', 'CatatanPenting', 'JenisTinggal', 'AlatTransportasi', 'AsalSekolah', 'SKHUN', 'PenerimaKPS', 'NoKPS', 'NoKK', 'NIKAyah', 'TempatLahirAyah', 'TanggalLahirAyah', 'PendidikanAyah', 'PekerjaanAyah', 'PenghasilanAyah', 'TlpAyah', 'NIKIbu', 'TempatLahirIbu', 'TanggalLahirIbu', 'PendidikanIbu', 'PekerjaanIbu', 'PenghasilanIbu', 'TlpIbu', 'NamaWali', 'TempatLahirWali', 'TanggalLahirWali', 'PendidikanWali', 'PekerjaanWali', 'PenghasilanWali', 'HubunganWali', 'TlpWali', 'BerkasAkta', 'BerkasKK', 'BerkasKTPKIA', 'BerkasKTPAyah', 'BerkasKTPIbu', 'BerkasIjazah', 'BerkasKTPWali', 'BerkasRapor', 'BerkasSPindah', 'BerkasDomisili', 'CatatanBerkas', 'CreatedAt', 'UpdatedAt'],
  'GURU': ['GuruID', 'NIP', 'NUPTK', 'Nama', 'JenisKelamin', 'TempatLahir', 'TanggalLahir', 'Alamat', 'NoHP', 'Email', 'Pendidikan', 'Jabatan', 'Status', 'Foto', 'CreatedAt', 'UpdatedAt'],
  'ORANG_TUA': ['OrtuID', 'SiswaID', 'Hubungan', 'Nama', 'NIK', 'Pekerjaan', 'NoHP', 'Alamat'],
  'KELAS': ['KelasID', 'NamaKelas', 'JenjangID', 'JurusanID', 'Tingkat', 'WaliKelasID', 'Ruangan', 'Status'],
  'JURUSAN': ['JurusanID', 'Kode', 'NamaJurusan', 'Keterangan'],
  'MAPEL': ['MapelID', 'Kode', 'NamaMapel', 'KKM', 'GuruID', 'Kelompok', 'Status'],
  'TAHUN_AJARAN': ['TAID', 'Nama', 'TanggalMulai', 'TanggalSelesai', 'Aktif'],
  'SEMESTER': ['SemesterID', 'Nama', 'TahunAjaranID', 'Aktif'],
  'HARI_LIBUR': ['HariLiburID', 'Tanggal', 'Nama', 'Jenis', 'Keterangan'],
  'JADWAL': ['JadwalID', 'Hari', 'JamMulai', 'JamSelesai', 'KelasID', 'MapelID', 'GuruID', 'Ruangan', 'TahunAjaranID', 'SemesterID', 'Status', 'CreatedAt', 'UpdatedAt'],

  // 21-29: Proses Akademik & Presensi
  'AGENDA': ['AgendaID', 'Tanggal', 'GuruID', 'MapelID', 'KelasID', 'Materi', 'Pertemuan', 'Metode', 'Catatan', 'Status', 'CreatedAt', 'UpdatedAt'],
  'NILAI': ['NilaiID', 'SiswaID', 'MapelID', 'GuruID', 'KelasID', 'SemesterID', 'TahunAjaranID', 'JenisNilai', 'Nilai', 'KKM', 'Predikat', 'Deskripsi', 'TanggalInput', 'CreatedAt', 'UpdatedAt'],
  'RAPOR': ['RaporID', 'SiswaID', 'SemesterID', 'TahunAjaranID', 'RataRata', 'Ranking', 'NaikKelas', 'CatatanWaliKelas', 'TanggalCetak', 'CreatedAt', 'UpdatedAt'],
  'KENAIKAN_KELAS': ['KenaikanID', 'SiswaID', 'KelasAsalID', 'KelasTujuanID', 'SemesterID', 'TahunAjaranID', 'Status', 'Keputusan', 'Tanggal', 'CreatedAt', 'UpdatedAt'],
  'KELULUSAN': ['KelulusanID', 'SiswaID', 'NomorSKL', 'TanggalLulus', 'NilaiAkhir', 'Predikat', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'ABSENSI': ['AbsenID', 'Tanggal', 'SiswaID', 'KelasID', 'JamMasuk', 'JamPulang', 'Status', 'Keterangan', 'Lokasi', 'Latitude', 'Longitude', 'QRCode', 'PetugasID', 'CreatedAt', 'UpdatedAt'],
  'ABSENSI_GURU': ['AbsenGuruID', 'Tanggal', 'GuruID', 'JamMasuk', 'JamPulang', 'Status', 'Lokasi', 'Latitude', 'Longitude', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'ABSENSI_SHOLAT': ['AbsenSholatID', 'Tanggal', 'SiswaID', 'JenisSholat', 'Status', 'PetugasID', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'QR_LOG': ['QRLogID', 'Tanggal', 'UserID', 'QRCode', 'Latitude', 'Longitude', 'Device', 'Browser', 'Status', 'Keterangan', 'CreatedAt'],

  // 30-36: CBT, Soal & Hasil Ujian
  'BANK_SOAL': ['BankSoalID', 'Mapel', 'Kelas', 'Kurikulum', 'JenisAsesmen', 'Durasi', 'Guru', 'JumlahSoal', 'TipeSoal', 'Kesulitan', 'Status', 'SoalJSON', 'CreatedAt', 'UpdatedAt'],
  'UJIAN': ['UjianID', 'NamaUjian', 'Mapel', 'Kelas', 'JenisUjian', 'Tanggal', 'JamMulai', 'JamSelesai', 'Durasi', 'Peserta', 'Proktor', 'JumlahSoal', 'AcakSoal', 'AcakOpsi', 'TampilkanNilai', 'Token', 'Status', 'NilaiRataRata', 'CreatedAt', 'UpdatedAt'],
  'TOKEN': ['TokenID', 'UjianID', 'Token', 'Tanggal', 'JamMulai', 'JamSelesai', 'Status', 'CreatedAt'],
  'SOAL': ['DetailSoalID', 'UjianID', 'BankSoalID', 'MataPelajaran', 'Kelas', 'Jenjang', 'NomorSoal', 'Pertanyaan', 'TipeSoal', 'PilihanA', 'PilihanB', 'PilihanC', 'PilihanD', 'PilihanE', 'KunciJawaban', 'Bobot', 'PembahasanRasional', 'CreatedAt'],
  'JAWABAN': ['JawabanID', 'UjianID', 'SiswaID', 'BankSoalID', 'Jawaban', 'Benar', 'Nilai', 'Tanggal', 'CreatedAt'],
  'HASIL_UJIAN': ['HasilUjianID', 'UjianID', 'SiswaID', 'Benar', 'Salah', 'Kosong', 'Nilai', 'Peringkat', 'Durasi', 'Status', 'CreatedAt'],
  'ANALISIS_SOAL': ['AnalisisID', 'BankSoalID', 'JumlahPeserta', 'Benar', 'Salah', 'PersentaseBenar', 'PersentaseSalah', 'TingkatKesukaran', 'DayaPembeda', 'CreatedAt'],

  // 37-40: SPMB & PPDB
  'PENDAFTAR': ['PendaftarID', 'NoPendaftaran', 'Nama', 'NIK', 'NISN', 'TempatLahir', 'TanggalLahir', 'JK', 'Agama', 'Alamat', 'AsalSekolah', 'JenjangID', 'Program', 'Jalur', 'NoHP', 'Email', 'Status', 'TanggalDaftar', 'CreatedAt', 'UpdatedAt'],
  'BERKAS': ['BerkasID', 'PendaftarID', 'JenisBerkas', 'NamaFile', 'URL', 'Status', 'Verifikator', 'TanggalUpload', 'TanggalVerifikasi', 'Catatan', 'CreatedAt', 'UpdatedAt'],
  'SELEKSI': ['SeleksiID', 'PendaftarID', 'NilaiAdministrasi', 'NilaiTes', 'NilaiWawancara', 'NilaiTotal', 'Status', 'Keterangan', 'Tanggal', 'CreatedAt', 'UpdatedAt'],
  'DAFTAR_ULANG': ['DaftarUlangID', 'PendaftarID', 'Tanggal', 'PetugasID', 'Nominal', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],

  // 41-48: Keuangan, Kas & Akuntansi
  'BIAYA': ['No', 'BiayaID', 'KodeBiaya', 'NamaBiaya', 'Kategori', 'Jenjang', 'Target_Kelas', 'KelasID', 'SiswaID', 'NamaSiswa', 'Nominal', 'Periode', 'Wajib', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'TAGIHAN': ['TagihanID', 'InvoiceID', 'SiswaID', 'BiayaID', 'TahunAjaranID', 'SemesterID', 'TanggalTagihan', 'TanggalJatuhTempo', 'Nominal', 'Diskon', 'Denda', 'TotalTagihan', 'TotalBayar', 'SisaTagihan', 'Status', 'PetugasID', 'CreatedAt', 'UpdatedAt'],
  'PEMBAYARAN': ['PembayaranID', 'TagihanID', 'InvoiceID', 'SiswaID', 'Tanggal', 'Nominal', 'MetodePembayaran', 'NoReferensi', 'Bank', 'PetugasID', 'Keterangan', 'Status', 'CreatedAt', 'UpdatedAt'],
  'TABUNGAN': ['TabunganID', 'SiswaID', 'Tanggal', 'JenisTransaksi', 'Debit', 'Kredit', 'Saldo', 'PetugasID', 'Keterangan', 'Status', 'CreatedAt', 'UpdatedAt'],
  'KAS': ['KasID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Keterangan', 'Referensi', 'PetugasID', 'Status', 'CreatedAt', 'UpdatedAt'],
  'PENGELUARAN': ['PengeluaranID', 'Tanggal', 'Kategori', 'NamaPengeluaran', 'Nominal', 'Penerima', 'MetodePembayaran', 'Bukti', 'PetugasID', 'Keterangan', 'Status', 'CreatedAt', 'UpdatedAt'],
  'INVOICE': ['InvoiceID', 'NomorInvoice', 'Tanggal', 'SiswaID', 'Total', 'Diskon', 'Denda', 'GrandTotal', 'Status', 'TanggalBayar', 'PetugasID', 'CreatedAt', 'UpdatedAt'],
  'JURNAL_UMUM': ['JurnalID', 'Tanggal', 'KodeAkun', 'NamaAkun', 'Keterangan', 'Debit', 'Kredit', 'Referensi', 'UserID', 'CreatedAt', 'UpdatedAt'],

  // 49-50: BK & Konseling
  'BIMBINGAN': ['BimbinganID', 'Tanggal', 'SiswaID', 'GuruBKID', 'JenisBimbingan', 'Permasalahan', 'Solusi', 'TindakLanjut', 'Status', 'Catatan', 'CreatedAt', 'UpdatedAt'],
  'PELANGGARAN': ['PelanggaranID', 'Tanggal', 'SiswaID', 'Kategori', 'JenisPelanggaran', 'Poin', 'Sanksi', 'GuruID', 'Keterangan', 'Status', 'CreatedAt', 'UpdatedAt'],

  // 51-53: Perpustakaan
  'BUKU': ['BukuID', 'ISBN', 'KodeBuku', 'Judul', 'Penulis', 'Penerbit', 'TahunTerbit', 'Kategori', 'Rak', 'Jumlah', 'Stok', 'Status', 'CreatedAt', 'UpdatedAt'],
  'PEMINJAMAN': ['PeminjamanID', 'BukuID', 'SiswaID', 'GuruID', 'TanggalPinjam', 'TanggalKembali', 'TanggalPengembalian', 'Status', 'Denda', 'PetugasID', 'CreatedAt', 'UpdatedAt'],
  'DENDA': ['DendaID', 'PeminjamanID', 'Tanggal', 'Nominal', 'Status', 'TanggalBayar', 'PetugasID', 'Keterangan', 'CreatedAt', 'UpdatedAt'],

  // 54-56: Inventaris & Sarpras
  'BARANG': ['BarangID', 'KodeBarang', 'NamaBarang', 'Kategori', 'Merk', 'Tipe', 'SerialNumber', 'Jumlah', 'Satuan', 'Lokasi', 'Kondisi', 'Status', 'CreatedAt', 'UpdatedAt'],
  'PEMELIHARAAN': ['PemeliharaanID', 'BarangID', 'Tanggal', 'Jenis', 'Biaya', 'Pelaksana', 'Hasil', 'Keterangan', 'Status', 'CreatedAt', 'UpdatedAt'],
  'PEMINJAMAN_BARANG': ['PeminjamanBarangID', 'BarangID', 'Peminjam', 'Unit', 'TanggalPinjam', 'TanggalKembali', 'TanggalPengembalian', 'Jumlah', 'Status', 'PetugasID', 'CreatedAt', 'UpdatedAt'],

  // 57-60: Dokumen, Cache, Backup
  'FILE': ['FileID', 'Kategori', 'Modul', 'NamaFile', 'NamaAsli', 'URL', 'Ukuran', 'TipeFile', 'UploadBy', 'TanggalUpload', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'ARSIP': ['ArsipID', 'Kategori', 'NomorArsip', 'Judul', 'Tanggal', 'Lokasi', 'FileID', 'Status', 'Keterangan', 'CreatedAt', 'UpdatedAt'],
  'DASHBOARD_CACHE': ['DashboardID', 'Tanggal', 'TotalSiswa', 'TotalGuru', 'TotalKelas', 'TotalMapel', 'TotalHadir', 'TotalIzin', 'TotalSakit', 'TotalAlpa', 'TotalPendaftar', 'TotalDiterima', 'TotalTagihan', 'TotalPembayaran', 'TotalTabungan', 'TotalKas', 'TotalPengeluaran', 'TotalBuku', 'TotalBarang', 'UserUpdate', 'UpdatedAt'],
  'BACKUP': ['BackupID', 'NamaBackup', 'Tanggal', 'Jam', 'UkuranFile', 'LokasiFile', 'Jenis', 'Status', 'UserID', 'Keterangan', 'CreatedAt', 'UpdatedAt']
};

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  const headers = TABLE_HEADERS[sheetName] || ['id', 'nama', 'keterangan', 'updatedAt'];
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return { sheet, headers };
}

function doPost(e) {
  try {
    const contents = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ssId = contents.spreadsheetId || SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(ssId);
    
    const action = contents.action || 'sync_table';
    const payload = contents.payload || contents;
    const table = (payload.table || contents.table || contents.tableName || contents.type || 'SISWA').toUpperCase();
    const records = payload.records || contents.records || (payload.data ? [payload.data] : []);

    if (action === 'sync_table' || action === 'db_import' || action === 'sync_presensi' || action === 'write_table') {
      let sheetName = table;
      if (contents.type === 'izin') sheetName = 'PENGAJUAN_IZIN';
      if (contents.type === 'harian') sheetName = 'ABSENSI';
      if (contents.type === 'siswa') sheetName = 'SISWA';

      const { sheet, headers } = getOrCreateSheet(ss, sheetName);

      // Clear existing content except header row
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      if (records && records.length > 0) {
        const rowsToAppend = records.map(r => {
          return headers.map(h => {
            const val = r[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
          });
        });
        sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        ok: true,
        success: true,
        message: \`Berhasil menyinkronkan \${records.length} baris ke sheet "\${sheetName}"\`,
        syncedCount: records.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'insert') {
      const { sheet, headers } = getOrCreateSheet(ss, table);
      const rowData = contents.data || payload.data || {};
      const newRow = headers.map(h => {
        const val = rowData[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', ok: true, success: true, message: \`Berhasil menambahkan data ke \${table}\`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update') {
      const { sheet, headers } = getOrCreateSheet(ss, table);
      const rowData = contents.data || payload.data || {};
      const targetId = rowData.id;
      if (!targetId) throw new Error('Field id dibutuhkan untuk update.');

      const values = sheet.getDataRange().getValues();
      const idColIdx = headers.indexOf('id');
      let foundRow = -1;

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idColIdx]) === String(targetId)) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        const updatedRow = headers.map((h, idx) => {
          const val = rowData[h] !== undefined ? rowData[h] : values[foundRow - 1][idx];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
        sheet.getRange(foundRow, 1, 1, headers.length).setValues([updatedRow]);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success', ok: true, success: true, message: \`Berhasil memperbarui data ID \${targetId} di \${table}\`
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Append if not found
        const newRow = headers.map(h => {
          const val = rowData[h];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
        sheet.appendRow(newRow);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success', ok: true, success: true, message: \`Data ID \${targetId} ditambahkan ke \${table}\`
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'delete') {
      const { sheet, headers } = getOrCreateSheet(ss, table);
      const targetId = (contents.data && contents.data.id) || contents.id || payload.id;
      if (!targetId) throw new Error('Field id dibutuhkan untuk delete.');

      const values = sheet.getDataRange().getValues();
      const idColIdx = headers.indexOf('id');

      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idColIdx]) === String(targetId)) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success', ok: true, success: true, message: \`Berhasil menghapus data ID \${targetId} dari \${table}\`
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', ok: true, success: true, message: \`Data ID \${targetId} tidak ditemukan di \${table}\`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', ok: false, success: false, message: 'Action tidak dikenal: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', ok: false, success: false, message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'read_all';
    const ssId = (e && e.parameter && e.parameter.spreadsheetId) || SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(ssId);

    if (action === 'read_table') {
      const tableName = ((e.parameter && e.parameter.table) || 'SISWA').toUpperCase();
      const sheet = ss.getSheetByName(tableName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', ok: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
      }
      const values = sheet.getDataRange().getValues();
      if (values.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', ok: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
      }
      const headers = values[0];
      const data = [];
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = row[idx];
        });
        data.push(obj);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', ok: true, data: data })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'read_all' || action === 'read_all_tables') {
      const allSheets = ss.getSheets();
      const resultData = {};
      allSheets.forEach(sheet => {
        const sheetName = sheet.getName();
        const values = sheet.getDataRange().getValues();
        if (values.length > 1) {
          const headers = values[0];
          const data = [];
          for (let i = 1; i < values.length; i++) {
            const row = values[i];
            const obj = {};
            headers.forEach((h, idx) => {
              if (h) obj[h] = row[idx];
            });
            data.push(obj);
          }
          resultData[sheetName] = data;
        } else {
          resultData[sheetName] = [];
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', ok: true, tables: resultData })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'online',
      ok: true,
      app: 'ERP Rombel KTCT Tambora Google Sheets 2-Way Sync API',
      spreadsheetId: SPREADSHEET_ID,
      folderId: PARENT_FOLDER_ID
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      ok: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}
