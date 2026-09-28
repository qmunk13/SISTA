import { db } from '../data/db';

export const DEFAULT_SPREADSHEET_ID = '1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4';
export const DEFAULT_FOLDER_ID = '17aeDN26Y-c72JgfmUEfULb6MiPnv1yH0';

// Helper to parse CSV format safely (handles quotes, commas inside quotes, newlines)
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length <= 1) return [];

  const parseLine = (lineStr: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQ = false;
    for (let j = 0; j < lineStr.length; j++) {
      const c = lineStr[j];
      if (c === '"') {
        inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const vals = parseLine(lines[r]);
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
    const rowObj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const rawVal = vals[idx] !== undefined ? vals[idx].replace(/^"|"$/g, '').trim() : '';
      if (rawVal) hasValue = true;
      rowObj[h] = rawVal;
    });
    if (hasValue) {
      rows.push(rowObj);
    }
  }

  return rows;
}

// Sheet mapping config for Google Spreadsheet sync (60 Sheets)
const SHEET_TO_DB_MAP: Record<string, string> = {
  SETTING: 'setting',
  REFERENSI: 'referensi',
  USERS: 'users',
  ROLE: 'role',
  MENU: 'menu',
  HAK_AKSES: 'hak_akses',
  SESSION: 'session',
  LOG: 'log',
  AUDIT_LOG: 'audit_log',
  NOTIFIKASI: 'notifikasi',
  SISWA: 'siswa',
  GURU: 'guru',
  ORANG_TUA: 'orang_tua',
  KELAS: 'kelas',
  JURUSAN: 'jurusan',
  MAPEL: 'mapel',
  TAHUN_AJARAN: 'tahun_ajaran',
  SEMESTER: 'semester',
  HARI_LIBUR: 'hari_libur',
  JADWAL: 'jadwal',
  AGENDA: 'agenda',
  NILAI: 'nilai',
  RAPOR: 'rapor',
  KENAIKAN_KELAS: 'kenaikan_kelas',
  KELULUSAN: 'kelulusan',
  ABSENSI: 'absensi',
  ABSENSI_GURU: 'absensi_guru',
  ABSENSI_SHOLAT: 'absensi_sholat',
  QR_LOG: 'qr_log',
  BANK_SOAL: 'bank_soal',
  UJIAN: 'ujian',
  TOKEN: 'token',
  SOAL: 'soal',
  JAWABAN: 'jawaban',
  HASIL_UJIAN: 'hasil_ujian',
  ANALISIS_SOAL: 'analisis_soal',
  PENDAFTAR: 'pendaftar',
  BERKAS: 'berkas',
  SELEKSI: 'seleksi',
  DAFTAR_ULANG: 'daftar_ulang',
  BIAYA: 'biaya',
  TAGIHAN: 'tagihan',
  PEMBAYARAN: 'pembayaran',
  TABUNGAN: 'tabungan',
  KAS: 'kas',
  PENGELUARAN: 'pengeluaran',
  INVOICE: 'invoice',
  JURNAL_UMUM: 'jurnal_umum',
  BIMBINGAN: 'bimbingan',
  PELANGGARAN: 'pelanggaran',
  BUKU: 'buku',
  PEMINJAMAN: 'peminjaman',
  DENDA: 'denda',
  BARANG: 'barang',
  PEMELIHARAAN: 'pemeliharaan',
  PEMINJAMAN_BARANG: 'peminjaman_barang',
  FILE: 'file',
  ARSIP: 'arsip',
  DASHBOARD_CACHE: 'dashboard_cache',
  BACKUP: 'backup',

  // Alias fallbacks for backwards compatibility
  SPMB_PENDAFTAR: 'pendaftar',
  PEMINJAMAN_BUKU: 'peminjaman',
  LOGS: 'log',
  SESI_LOGIN: 'session'
};

export interface SyncProgress {
  currentSheet: string;
  syncedSheets: number;
  totalSheets: number;
  successCount: number;
}

export async function syncSingleSheetFromGoogle(
  sheetName: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  forceOverwrite: boolean = false
): Promise<any[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengunduh sheet ${sheetName}: HTTP ${res.status}`);
  }
  const text = await res.text();
  const rows = parseCSV(text);

  const dbKey = SHEET_TO_DB_MAP[sheetName];
  if (dbKey && rows.length > 0) {
    // Map fields if necessary for Siswa, Tagihan, etc.
    let processedRows: any[] = rows;
    if (sheetName === 'SISWA') {
      processedRows = rows.map((r, idx) => ({
        id: r.noPdkt || r.nopdkt || `SW_${idx + 1}`,
        nopdkt: r.noPdkt || r.nopdkt || `${idx + 1}`.padStart(3, '0'),
        nama: r.nama || r['Nama Lengkap'] || '',
        nisn: r.nisn || r.NISN || '',
        jk: r.jk || r['Jenis Kelamin'] || 'L',
        kelasId: r['Kelas Saat ini'] || r.kelasId || 'X-1',
        tahunMasuk: r.tahunMasuk || r['Tahun Masuk'] || '2023',
        status: r.Status || r['Status'] || r['Status Terbaru'] || r.status || 'Aktif',
        tempatLahir: r['Tempat Lahir'] || '',
        tglLahir: r['Tanggal Lahir'] || '',
        nik: r.nik || r.NIK || '',
        noHp: r['Nomor HP Aktif'] || r.noHp || '',
        email: r['E-Mail'] || r.email || '',
        asalSekolah: r['Asal Sekolah'] || '',
        noKk: r['Nomor Kartu Keluarga'] || '',
        namaAyah: r['Nama Ayah'] || '',
        nikAyah: r['NIK Ayah'] || '',
        pekerjaanAyah: r['Pekerjaan Ayah'] || '',
        tlpAyah: r['Tlp. Ayah'] || '',
        namaIbu: r['Nama Ibu'] || '',
        nikIbu: r['NIK Ibu'] || '',
        pekerjaanIbu: r['Pekerjaan Ibu'] || '',
        tlpIbu: r['Tlp. Ibu'] || '',
        alamat: r.Alamat || r.alamat || '',
        rt: r.RT || '',
        rw: r.RW || '',
        kelurahan: r.Kelurahan || '',
        kecamatan: r.Kecamatan || '',
        kota: r.Kota || '',
        provinsi: r.Provinsi || '',
        kodePos: r['Kode Pos'] || ''
      }));
    } else if (sheetName === 'TAGIHAN') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || `TAG_${idx + 1}`,
        nopdkt: r.nopdkt || r['Kode PDKT'] || '',
        namasiswa: r.namasiswa || r['Nama Siswa'] || '',
        kelasId: r.kelasId || '',
        biayaId: r.biayaId || '',
        namaBiaya: r.namaBiaya || r.nama || '',
        nominal: Number(r.nominal || 0),
        periode: r.periode || 'Bulan ini',
        status: r.status || 'BELUM_BAYAR',
        paidAmount: Number(r.paidAmount || 0),
        remainingAmount: Number(r.remainingAmount || r.nominal || 0)
      }));
    } else if (sheetName === 'TABUNGAN') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || `TAB_${idx + 1}`,
        nopdkt: r.nopdkt || '',
        namasiswa: r.namasiswa || '',
        tanggal: r.tanggal || new Date().toISOString().split('T')[0],
        jenis: r.jenis || 'SETOR',
        nominal: Number(r.nominal || 0),
        catatan: r.catatan || ''
      }));
    } else if (sheetName === 'PEMBAYARAN') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || `PEMB_${idx + 1}`,
        tagihanId: r.tagihanId || '',
        nopdkt: r.nopdkt || r['Kode PDKT'] || '',
        namasiswa: r.namasiswa || '',
        tglBayar: r.tglBayar || r.tanggal || '',
        metode: r.metode || 'TUNAI',
        jumlah: Number(r.jumlah || r.nominal || 0),
        catatan: r.catatan || ''
      }));
    } else if (sheetName === 'KELAS') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `k_${idx + 1}`,
        nama: r.nama || r['Nama Kelas'] || r.Nama || r.Kelas || '',
        waliKelas: r.waliKelas || r['Wali Kelas'] || '',
        ruangan: r.ruangan || r.Ruangan || '',
        tingkat: r.tingkat || r.Tingkat || '',
        tahunAjaran: r.tahunAjaran || r['Tahun Ajaran'] || ''
      }));
    } else if (sheetName === 'GURU') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `g_${idx + 1}`,
        nip: r.nip || r.NIP || '',
        nama: r.nama || r['Nama Lengkap'] || r.Nama || '',
        jk: r.jk || r['Jenis Kelamin'] || 'L',
        noHp: r.noHp || r['Nomor HP'] || r['No HP'] || '',
        email: r.email || r.Email || '',
        mapel: r.mapel || r['Mata Pelajaran'] || '',
        jabatan: r.jabatan || r.Jabatan || 'Guru Pengajar',
        status: r.status || r.Status || 'AKTIF'
      }));
    } else if (sheetName === 'MAPEL') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `mp_${idx + 1}`,
        kode: r.kode || r['Kode Mapel'] || '',
        nama: r.nama || r['Nama Mapel'] || '',
        kelompok: r.kelompok || r.Kelompok || 'A',
        kkm: Number(r.kkm || r.KKM || 75)
      }));
    } else if (sheetName === 'ABSENSI') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `abs_${idx + 1}`,
        tanggal: r.tanggal || r.Tanggal || '',
        nisn: r.nisn || r.NISN || '',
        nama: r.nama || r['Nama Siswa'] || '',
        kelas: r.kelas || r.Kelas || '',
        jamDatang: r.jamDatang || r['Jam Datang'] || '',
        jamPulang: r.jamPulang || r['Jam Pulang'] || '',
        status: r.status || r.Status || 'HADIR',
        keterangan: r.keterangan || r.Keterangan || '',
        alasan: r.alasan || r.Alasan || '',
        buktiFotoUrl: r.buktiFotoUrl || r['Bukti Foto'] || ''
      }));
    } else if (sheetName === 'PENGAJUAN_IZIN') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `izn_${idx + 1}`,
        tanggalPengajuan: r.tanggalPengajuan || r['Tanggal Pengajuan'] || '',
        nisn: r.nisn || r.NISN || '',
        nama: r.nama || r['Nama Siswa'] || '',
        kelas: r.kelas || r.Kelas || '',
        jenisIzin: r.jenisIzin || r['Jenis Izin'] || 'IZIN',
        tanggalMulai: r.tanggalMulai || r['Tanggal Mulai'] || '',
        tanggalSelesai: r.tanggalSelesai || r['Tanggal Selesai'] || '',
        alasan: r.alasan || r.Alasan || '',
        buktiFotoUrl: r.buktiFotoUrl || r['Bukti Foto'] || '',
        statusPersetujuan: r.statusPersetujuan || r['Status Persetujuan'] || 'Pending',
        disetujuiOleh: r.disetujuiOleh || r['Disetujui Oleh'] || '',
        tanggalDisetujui: r.tanggalDisetujui || r['Tanggal Disetujui'] || '',
        catatanPersetujuan: r.catatanPersetujuan || r['Catatan Persetujuan'] || ''
      }));
    } else if (sheetName === 'USERS') {
      processedRows = rows.map((r, idx) => ({
        id: r.id || r.ID || `USR_${idx + 1}`,
        username: r.username || r.Username || r['User Name'] || r.email || r.Email || '',
        email: r.email || r.Email || r['E-Mail'] || '',
        password: r.password || r.Password || r.passHash || r.PassHash || 'admin123',
        role: (r.role || r.Role || 'ADMIN').toUpperCase(),
        name: r.name || r.Name || r.Nama || r['Nama Lengkap'] || '',
        status: (r.status || r.Status || 'AKTIF').toUpperCase(),
        nopdkt: r.nopdkt || r.noPdkt || r['Kode PDKT'] || ''
      }));

      const defaultUsers = [
        { id: 'USR_superadmin', username: 'superadmin', email: 'superadmin@sisko.sch.id', password: 'admin123', role: 'SUPERADMIN', name: 'Super Admin', status: 'AKTIF' },
        { id: 'USR_admin', username: 'admin', email: 'admin@sisko.sch.id', password: 'admin123', role: 'ADMIN', name: 'Administrator', status: 'AKTIF' }
      ];

      for (const defU of defaultUsers) {
        const existingIdx = processedRows.findIndex(u => 
          (u.username && u.username.toLowerCase() === defU.username) || 
          u.id === defU.id
        );
        if (existingIdx === -1) {
          processedRows.unshift(defU);
        } else {
          if (!processedRows[existingIdx].password) {
            processedRows[existingIdx].password = defU.password;
          }
        }
      }
    }

    const isLocalModified = typeof window !== 'undefined' && localStorage.getItem('ERP_modified_' + dbKey) === 'true';
    if (!forceOverwrite && isLocalModified) {
      console.log(`[SYNC] Preserving local modifications for '${dbKey}'. Skipping automatic CSV overwrite.`);
    } else {
      db.set(dbKey, processedRows);
    }
  }
  return rows;
}

export async function syncAllSheetsFromGoogle(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  onProgress?: (progress: SyncProgress) => void,
  forceOverwrite: boolean = false
): Promise<{ success: boolean; totalSheetsSynced: number; totalRowsSynced: number }> {
  const sheetNames = Object.keys(SHEET_TO_DB_MAP);
  let syncedSheets = 0;
  let totalRows = 0;

  for (let i = 0; i < sheetNames.length; i++) {
    const s = sheetNames[i];
    if (onProgress) {
      onProgress({
        currentSheet: s,
        syncedSheets: i,
        totalSheets: sheetNames.length,
        successCount: syncedSheets
      });
    }

    try {
      const rows = await syncSingleSheetFromGoogle(s, spreadsheetId, forceOverwrite);
      if (rows.length > 0) {
        syncedSheets++;
        totalRows += rows.length;
      }
    } catch (err) {
      console.warn(`Direct sync warning for ${s}:`, err);
    }
  }

  if (onProgress) {
    onProgress({
      currentSheet: 'Selesai',
      syncedSheets: sheetNames.length,
      totalSheets: sheetNames.length,
      successCount: syncedSheets
    });
  }

  // Record timestamp of sync
  localStorage.setItem('ERP_last_google_sync', new Date().toISOString());
  localStorage.setItem('ERP_google_spreadsheet_id', spreadsheetId);

  return {
    success: true,
    totalSheetsSynced: syncedSheets,
    totalRowsSynced: totalRows
  };
}
