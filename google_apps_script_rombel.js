/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: SISTEM KONFIRMASI SISWA ROMBEL KARANG TARUNA TAMBORA
 * Spreadsheet ID: 1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E
 * =========================================================================
 * 
 * UPDATE TERBARU (SESUAI INSTRUKSI):
 * 1. Sheet SISWA: Diisi & dimutakhirkan biodatanya secara otomatis & utuh
 *    (Nama, NIK, TTL, Alamat, RT/RW, No HP, Ortu, Foto, Status = Aktif).
 * 2. SKesanggupan & SPernyataan: TIDAK disimpan di sheet SISWA.
 *    Keduanya resmi dimasukkan ke sheet REKAP_STATUS_AKSI.
 * 3. nopdkt, NISN, NIK, No. HP, RT, RW, Kode Pos: Selalu diawali tanda kutip (')
 *    dan diformat Teks Polos (@) sehingga angka 0 di depan TIDAK PERNAH HILANG.
 * 4. REKAP_HARI: Kolom 'nohari' menggunakan kode unik (contoh: HARI-001-1-KT-829104).
 * 5. REKAP_HARI: Hari dan jam dipisah menjadi 3 baris terpisah per orang siswa
 *    (satu siswa tercatat 3 baris dengan nohari/kode unik masing-masing).
 * 
 * PANDUAN PEMASANGAN:
 * 1. Buka Google Spreadsheet:
 *    https://docs.google.com/spreadsheets/d/1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E/edit
 * 2. Klik menu: Ekstensi (Extensions) > Apps Script
 * 3. Hapus seluruh isi lama, lalu Salin & Tempel seluruh kode ini.
 * 4. Klik ikon disket "Simpan".
 * 5. Klik tombol biru "Terapkan" (Deploy) > "Kelola penerapan" (Manage deployments)
 *    atau "Penerapan baru" (New deployment) -> Versi Baru (New version).
 *    Akses: Siapa Saja (Anyone).
 * 6. Klik Terapkan.
 * =========================================================================
 */

// KONFIGURASI GLOBAL
const SPREADSHEET_ID = '1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E';
const FOLDER_ID_FOTO = '1nxSpZEe3ar1_icNZGsWzLLbz3U_oBFQO'; // Folder Google Drive Pas Foto
const FOLDER_ID_PDF  = '1MY3oIwIIj05zlZCL4BF-3TVsbx4tG3TQ'; // Folder Google Drive Berkas PDF

/**
 * Handle GET Request (Status & Test Endpoint)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetSiswa = ss.getSheetByName('SISWA');
    const totalSiswa = sheetSiswa ? Math.max(0, sheetSiswa.getLastRow() - 1) : 0;

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Google Apps Script Rombel Karang Taruna Aktif dan Terhubung!',
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetName: ss.getName(),
      totalSiswaTerdata: totalSiswa,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST Request (Menerima Data Konfirmasi, Update Profil & Simpan Foto)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return respondJSON({ success: false, message: 'Server Google Sheets sibuk, silakan coba beberapa saat lagi.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ success: false, message: 'Payload data kosong.' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'submit_konfirmasi_multisheet';
    const ss = SpreadsheetApp.openById(payload.spreadsheetId || SPREADSHEET_ID);

    // -------------------------------------------------------------------------
    // AKSI 1: SUBMIT KONFIRMASI LENGKAP KE 5 SHEET + MUTAKHIRKAN SHEET SISWA
    // -------------------------------------------------------------------------
    if (action === 'submit_konfirmasi_multisheet') {
      const data = payload.data;
      if (!data || !data.rows) {
        return respondJSON({ success: false, message: 'Format data baris tidak valid.' });
      }

      const rows = data.rows;
      const profile = data.profile || {};
      const schedule = data.schedule || {};
      const statement = data.statement || {};

      // 1. Simpan ke Sheet KONFIRMASI (17 Kolom)
      appendOrUpdateRow(
        ss,
        'KONFIRMASI',
        getKonfirmasiHeaders(),
        rows.KONFIRMASI,
        1, // Cocokkan Kolom No. PDKT (Indeks 1)
        rows.KONFIRMASI ? rows.KONFIRMASI[1] : ''
      );

      // 2. Simpan ke Sheet JADWAL (12 Kolom)
      appendOrUpdateRow(
        ss,
        'JADWAL',
        getJadwalHeaders(),
        rows.JADWAL,
        1, // Cocokkan Kolom No. PDKT
        rows.JADWAL ? rows.JADWAL[1] : ''
      );

      // 3. Simpan ke Sheet REKAP_HARI (5 Kolom, 3 Baris per siswa dengan kode unik)
      if (Array.isArray(rows.REKAP_HARI)) {
        // Jika dikirim sebagai multi-baris (3 baris)
        if (rows.REKAP_HARI.length > 0 && Array.isArray(rows.REKAP_HARI[0])) {
          appendOrUpdateMultipleRows(
            ss,
            'REKAP_HARI',
            getRekapHariHeaders(),
            rows.REKAP_HARI,
            0 // Cocokkan nohari / kode unik (Indeks 0)
          );
        } else {
          // Single row fallback
          appendOrUpdateRow(
            ss,
            'REKAP_HARI',
            getRekapHariHeaders(),
            rows.REKAP_HARI,
            0,
            rows.REKAP_HARI[0]
          );
        }
      }

      // 4. Simpan ke Sheet REKAP_SUDAH (18 Kolom)
      appendOrUpdateRow(
        ss,
        'REKAP_SUDAH',
        getRekapSudahHeaders(),
        rows.REKAP_SUDAH,
        2, // Cocokkan Kolom PDKT (Indeks 2)
        rows.REKAP_SUDAH ? rows.REKAP_SUDAH[2] : ''
      );

      // 5. Simpan ke Sheet REKAP_STATUS_AKSI (13 Kolom termasuk SKesanggupan & SPernyataan)
      appendOrUpdateRow(
        ss,
        'REKAP_STATUS_AKSI',
        getRekapStatusAksiHeaders(),
        rows.REKAP_STATUS_AKSI,
        3, // Cocokkan Kolom PDKT (Indeks 3)
        rows.REKAP_STATUS_AKSI ? rows.REKAP_STATUS_AKSI[3] : ''
      );

      // 6. MUTAKHIRKAN SHEET MASTER SISWA (Semua Biodata Terisi, SKesanggupan & SPernyataan Dikosongkan/Dilewati)
      updateMasterSheetSiswaBiodata(ss, profile, null);

      return respondJSON({
        success: true,
        message: 'Konfirmasi berhasil disimpan ke seluruh 5 sheet dan Sheet SISWA diperbarui.',
        sheetsUpdated: ['SISWA', 'KONFIRMASI', 'JADWAL', 'REKAP_HARI', 'REKAP_SUDAH', 'REKAP_STATUS_AKSI'],
        verificationCode: statement.verificationCode,
        timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      });
    }

    // -------------------------------------------------------------------------
    // AKSI 2: UPDATE PROFIL BIODATA SISWA DI SHEET SISWA & DRIVE PAS FOTO
    // -------------------------------------------------------------------------
    if (action === 'update_profile') {
      const profile = payload.profile;
      const photoBase64 = payload.photoBase64;
      const photoFileName = payload.photoFileName;

      let photoDriveUrl = '';
      if (photoBase64 && photoBase64.includes('base64,')) {
        photoDriveUrl = savePhotoToDrive(photoBase64, photoFileName || `${profile.nopdkt || 'PDKT'} ${profile.namaLengkap || 'Siswa'}.jpg`);
      }

      const updated = updateMasterSheetSiswaBiodata(ss, profile, photoDriveUrl);

      return respondJSON({
        success: true,
        message: updated 
          ? 'Biodata siswa berhasil dimutakhirkan di sheet SISWA.' 
          : 'Data siswa dicatat di sheet SISWA.',
        photoUrl: photoDriveUrl
      });
    }

    // -------------------------------------------------------------------------
    // AKSI 3: UPDATE STATUS AKSI (KIRIM WA / DOWNLOAD PDF)
    // -------------------------------------------------------------------------
    if (action === 'update_status_aksi') {
      const targetPdkt = payload.nopdkt || '';
      const targetNama = payload.namaLengkap || '';
      const waStatus   = payload.statusKirimWa; // e.g. 'SUDAH'
      const pdfStatus  = payload.statusDownloadPdf; // e.g. 'SUDAH'

      updateRekapStatusAksiFlags(ss, targetPdkt, targetNama, waStatus, pdfStatus);

      return respondJSON({
        success: true,
        message: 'Status aksi WhatsApp / PDF berhasil diperbarui di sheet REKAP_STATUS_AKSI.'
      });
    }

    return respondJSON({ success: false, message: 'Aksi tidak dikenali: ' + action });

  } catch (error) {
    return respondJSON({
      success: false,
      message: 'Gagal memproses ke Google Spreadsheet: ' + error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Pembersih & Pengaman Angka 0 di Depan (Leading Zero Protector)
 * Menjamin nopdkt, NISN, NIK, No. HP, RT, RW tidak akan pernah kehilangan 0
 */
function protectLeadingZero(val, minDigits) {
  if (val === null || val === undefined || val === '') return '-';
  const str = String(val).trim();
  if (str === '-') return '-';
  if (str.startsWith("'")) return str;

  // Jika berupa kumpulan digit murni
  if (/^\d+$/.test(str)) {
    const padded = minDigits ? str.padStart(minDigits, '0') : str;
    return "'" + padded;
  }
  return str;
}

/**
 * Menyiapkan format sel agar nomor/ID selalu terbaca sebagai Teks Polos (@)
 */
function sanitizeRowData(rowData) {
  if (!Array.isArray(rowData)) return [];
  return rowData.map(function(item) {
    if (item === null || item === undefined) return '';
    const str = String(item).trim();
    // Jika format angka dengan leading zero (seperti 001, 00888..., 0858...)
    if (/^0\d+$/.test(str) && !str.startsWith("'")) {
      return "'" + str;
    }
    return item;
  });
}

/**
 * Tambahkan atau Perbarui Baris Tunggal di Sheet Tertentu
 */
function appendOrUpdateRow(ss, sheetName, headers, rawRowData, matchColIndex, rawMatchValue) {
  if (!rawRowData || rawRowData.length === 0) return;
  const rowData = sanitizeRowData(rawRowData);

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const lastRow = sheet.getLastRow();
  const cleanMatch = String(rawMatchValue || '').replace(/['\s]/g, '').toLowerCase();

  if (lastRow > 1 && cleanMatch) {
    const numRows = lastRow - 1;
    const colValues = sheet.getRange(2, matchColIndex + 1, numRows, 1).getValues();

    for (let i = 0; i < colValues.length; i++) {
      const cellVal = String(colValues[i][0] || '').replace(/['\s]/g, '').toLowerCase();
      if (cellVal === cleanMatch || cellVal.replace(/^0+/, '') === cleanMatch.replace(/^0+/, '')) {
        sheet.getRange(i + 2, 1, 1, rowData.length).setNumberFormat('@').setValues([rowData]);
        return;
      }
    }
  }

  // Baris baru
  const targetRow = Math.max(2, lastRow + 1);
  sheet.getRange(targetRow, 1, 1, rowData.length).setNumberFormat('@').setValues([rowData]);
}

/**
 * Tambahkan atau Perbarui Banyak Baris Sekaligus (Khusus REKAP_HARI 3 Baris)
 */
function appendOrUpdateMultipleRows(ss, sheetName, headers, rowDataArray, matchColIndex) {
  if (!Array.isArray(rowDataArray) || rowDataArray.length === 0) return;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // Sinkronkan header REKAP_HARI jika masih menggunakan format lama
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0];
    const headerStr = currentHeaders.join('|').toLowerCase();
    if (headerStr.includes('hari1-3')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  for (let r = 0; r < rowDataArray.length; r++) {
    const singleRow = sanitizeRowData(rowDataArray[r]);
    const matchVal = singleRow[matchColIndex];
    appendOrUpdateRow(ss, sheetName, headers, singleRow, matchColIndex, matchVal);
  }
}

/**
 * MUTAKHIRKAN DATA BIODATA SISWA DI SHEET MASTER 'SISWA' (78 KOLOM)
 * Aturan Khusus:
 * 1. SKesanggupan (kolom 73) & SPernyataan (kolom 76) JANGAN DIUBAH / JANGAN DITULIS DI SHEET SISWA!
 * 2. Seluruh identitas (PDKT, NISN, NIK, No. HP, RT, RW, KK, dll) dijaga awalan 0 nya.
 * 3. Status siswa diubah menjadi 'Aktif'.
 */
function updateMasterSheetSiswaBiodata(ss, p, photoUrl) {
  if (!p) return false;
  const sheet = ss.getSheetByName('SISWA');
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return false;

  const headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });

  const pdktIdx = headers.findIndex(function(h) { return h === 'nopdkt' || h.includes('nopdkt') || h.includes('pdkt'); });
  const nisnIdx = headers.findIndex(function(h) { return h === 'nisn'; });
  const nikIdx  = headers.findIndex(function(h) { return h === 'nik'; });
  const namaIdx = headers.findIndex(function(h) { return h === 'namalengkap' || h === 'nama'; });

  const targetPdkt = String(p.nopdkt || p.idNumber || '').replace(/['\s]/g, '').toLowerCase();
  const targetNisn = String(p.nisn || p.NISN || '').replace(/['\s]/g, '');
  const targetNik  = String(p.nik || p.NIK || '').replace(/['\s]/g, '');
  const targetNama = String(p.namaLengkap || p.NamaLengkap || '').trim().toLowerCase();

  let targetRowIndex = -1;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rowPdkt = pdktIdx >= 0 ? String(row[pdktIdx]).replace(/['\s]/g, '').toLowerCase() : '';
    const rowNisn = nisnIdx >= 0 ? String(row[nisnIdx]).replace(/['\s]/g, '') : '';
    const rowNik  = nikIdx >= 0  ? String(row[nikIdx]).replace(/['\s]/g, '') : '';
    const rowNama = namaIdx >= 0 ? String(row[namaIdx]).trim().toLowerCase() : '';

    const isMatch = (targetPdkt && (rowPdkt === targetPdkt || rowPdkt.replace(/^0+/, '') === targetPdkt.replace(/^0+/, ''))) ||
                    (targetNisn && rowNisn === targetNisn) ||
                    (targetNik && rowNik === targetNik) ||
                    (targetNama && rowNama === targetNama);

    if (isMatch) {
      targetRowIndex = r + 1; // 1-indexed di sheet
      break;
    }
  }

  // Format pengaman angka 0
  const formattedPdkt = protectLeadingZero(p.nopdkt || p.idNumber, 3);
  const formattedNisn = protectLeadingZero(p.nisn || p.NISN);
  const formattedNik  = protectLeadingZero(p.nik || p.NIK);
  const formattedNoHp = protectLeadingZero(p.noHpWa || p.NomorHP);
  const formattedRt   = protectLeadingZero(p.rt || p.RT, 3);
  const formattedRw   = protectLeadingZero(p.rw || p.RW, 3);
  const formattedKodePos = protectLeadingZero(p.kodePos || p.KodePos);
  const formattedKK   = protectLeadingZero(p.nomorKartuKeluarga || p.NomorKartuKeluarga);
  const formattedNikAyah = protectLeadingZero(p.nikAyah || p.NIKAyah);
  const formattedNikIbu  = protectLeadingZero(p.nikIbu || p.NIKIbu);

  if (targetRowIndex > 1) {
    // Ambil baris yang ada saat ini
    const currentRow = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
    const updatedRow = currentRow.slice();

    // Petakan setiap kolom sesuai header asli sheet SISWA
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];

      // PERMINTAAN USER 2: JANGAN ISI SKesanggupan & SPernyataan di sheet SISWA!
      if (h.includes('skesanggupan') || h.includes('kesanggupan') || h.includes('spernyataan') || h.includes('pernyataan')) {
        continue; // Lewati, biarkan nilai asli tidak diubah
      }

      if (h === 'nopdkt' || h.includes('pdkt')) {
        if (formattedPdkt !== '-') updatedRow[c] = formattedPdkt;
      } else if (h === 'nisn') {
        if (formattedNisn !== '-') updatedRow[c] = formattedNisn;
      } else if (h === 'namalengkap' || h === 'nama') {
        if (p.namaLengkap || p.NamaLengkap) updatedRow[c] = p.namaLengkap || p.NamaLengkap;
      } else if (h === 'jeniskelamin') {
        if (p.jenisKelamin || p.JenisKelamin) updatedRow[c] = p.jenisKelamin || p.JenisKelamin;
      } else if (h === 'tempat lahir' || h === 'tempatlahir') {
        if (p.tempatLahir || p.TempatLahir) updatedRow[c] = p.tempatLahir || p.TempatLahir;
      } else if (h === 'tanggallahir') {
        if (p.tanggalLahir || p.TanggalLahir) updatedRow[c] = p.tanggalLahir || p.TanggalLahir;
      } else if (h === 'nik') {
        if (formattedNik !== '-') updatedRow[c] = formattedNik;
      } else if (h === 'agama') {
        if (p.agama || p.Agama) updatedRow[c] = p.agama || p.Agama;
      } else if (h === 'golongan darah' || h === 'golongandarah') {
        if (p.golonganDarah || p['Golongan Darah']) updatedRow[c] = p.golonganDarah || p['Golongan Darah'];
      } else if (h === 'tinggibadan(cm)' || h.includes('tinggibadan')) {
        if (p.tinggiBadan || p['TinggiBadan(cm)']) updatedRow[c] = p.tinggiBadan || p['TinggiBadan(cm)'];
      } else if (h === 'beratbadan(kg)' || h.includes('beratbadan')) {
        if (p.beratBadan || p['BeratBadan(kg)']) updatedRow[c] = p.beratBadan || p['BeratBadan(kg)'];
      } else if (h === 'prestasi') {
        if (p.prestasi || p.Prestasi) updatedRow[c] = p.prestasi || p.Prestasi;
      } else if (h === 'hobi') {
        if (p.hobi || p.Hobi) updatedRow[c] = p.hobi || p.Hobi;
      } else if (h === 'catatan penting' || h === 'catatanpenting') {
        if (p.catatanPenting || p['Catatan Penting']) updatedRow[c] = p.catatanPenting || p['Catatan Penting'];
      } else if (h === 'alamat') {
        if (p.alamat || p.Alamat) updatedRow[c] = p.alamat || p.Alamat;
      } else if (h === 'rt') {
        if (formattedRt !== '-') updatedRow[c] = formattedRt;
      } else if (h === 'rw') {
        if (formattedRw !== '-') updatedRow[c] = formattedRw;
      } else if (h === 'kelurahan') {
        if (p.kelurahan || p.Kelurahan) updatedRow[c] = p.kelurahan || p.Kelurahan;
      } else if (h === 'kecamatan') {
        if (p.kecamatan || p.Kecamatan) updatedRow[c] = p.kecamatan || p.Kecamatan;
      } else if (h === 'kota') {
        if (p.kota || p.Kota) updatedRow[c] = p.kota || p.Kota;
      } else if (h === 'provinsi') {
        if (p.provinsi || p.Provinsi) updatedRow[c] = p.provinsi || p.Provinsi;
      } else if (h === 'kodepos') {
        if (formattedKodePos !== '-') updatedRow[c] = formattedKodePos;
      } else if (h === 'nomorhp' || h === 'nohpwa' || h === 'nohp') {
        if (formattedNoHp !== '-') updatedRow[c] = formattedNoHp;
      } else if (h === 'e-mail' || h === 'email') {
        if (p.email || p['E-Mail']) updatedRow[c] = p.email || p['E-Mail'];
      } else if (h === 'pasfoto' || h === 'foto') {
        if (photoUrl) updatedRow[c] = photoUrl;
        else if (p.pasFoto || p.PasFoto) updatedRow[c] = p.pasFoto || p.PasFoto;
      } else if (h === 'nomorkartukeluarga') {
        if (formattedKK !== '-') updatedRow[c] = formattedKK;
      } else if (h === 'namaayah') {
        if (p.namaAyah || p.NamaAyah) updatedRow[c] = p.namaAyah || p.NamaAyah;
      } else if (h === 'nikayah') {
        if (formattedNikAyah !== '-') updatedRow[c] = formattedNikAyah;
      } else if (h === 'namaibu') {
        if (p.namaIbu || p.NamaIbu) updatedRow[c] = p.namaIbu || p.NamaIbu;
      } else if (h === 'nikibu') {
        if (formattedNikIbu !== '-') updatedRow[c] = formattedNikIbu;
      } else if (h === 'statusyatim') {
        if (p.statusYatim || p.StatusYatim) updatedRow[c] = p.statusYatim || p.StatusYatim;
      } else if (h === 'namawali') {
        if (p.namaWali || p.NamaWali) updatedRow[c] = p.namaWali || p.NamaWali;
      } else if (h === 'status') {
        updatedRow[c] = 'Aktif';
      } else if (h === 'kelassaatini') {
        const kls = p.KelasSaatini || p.kelasSaatIni || p.kelasRombel;
        if (kls) updatedRow[c] = kls;
      }
    }

    // Tulis baris secara cepat & serentak
    sheet.getRange(targetRowIndex, 1, 1, updatedRow.length).setNumberFormat('@').setValues([updatedRow]);
    return true;
  }

  return false;
}

/**
 * Perbarui Flag Status Aksi (WhatsApp & Download PDF) di Sheet REKAP_STATUS_AKSI
 */
function updateRekapStatusAksiFlags(ss, targetPdkt, targetNama, waStatus, pdfStatus) {
  const sheet = ss.getSheetByName('REKAP_STATUS_AKSI');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const cleanPdkt = String(targetPdkt || '').replace(/['\s]/g, '').toLowerCase();
  const cleanNama = String(targetNama || '').trim().toLowerCase();

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rowNama = String(row[1] || '').trim().toLowerCase();
    const rowPdkt = String(row[3] || '').replace(/['\s]/g, '').toLowerCase();

    if ((cleanPdkt && rowPdkt === cleanPdkt) || (cleanNama && rowNama === cleanNama)) {
      if (waStatus) sheet.getRange(r + 1, 10).setValue(waStatus); // Kolom Status_Kirim_WA
      if (pdfStatus) sheet.getRange(r + 1, 11).setValue(pdfStatus); // Kolom Status_Download_PDF
      break;
    }
  }
}

/**
 * Simpan Foto Base64 ke Folder Google Drive
 */
function savePhotoToDrive(base64Data, fileName) {
  try {
    const splitData = base64Data.split('base64,');
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const decoded = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(decoded, contentType, fileName);

    let folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_ID_FOTO);
    } catch (e) {
      folder = DriveApp.getRootFolder();
    }

    const existing = folder.getFilesByName(fileName);
    if (existing.hasNext()) {
      const file = existing.next();
      file.setContent(decoded);
      return file.getUrl();
    }

    const newFile = folder.createFile(blob);
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFile.getUrl();
  } catch (err) {
    Logger.log('Drive save error: ' + err.toString());
    return '';
  }
}

/**
 * Format Response JSON
 */
function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Header Kolom untuk Masing-Masing Sheet
 */
function getKonfirmasiHeaders() {
  return [
    'Kode_Verifikasi', 'nopdkt', 'NISN', 'NIK', 'NamaLengkap', 'KelasSaatini',
    'JenisKelamin', 'Tempat Lahir', 'TanggalLahir', 'NomorHP', 'Kelurahan',
    'Status_Yatim', 'Status_Bekerja', 'Nama_Tempat_Kerja', 'Jabatan_Pekerjaan',
    'Bidang_Usaha', 'Alamat_Kerja'
  ];
}

function getJadwalHeaders() {
  return [
    'Kode_Jadwal', 'nopdkt', 'NISN', 'NIK', 'NamaLengkap', 'KelasSaatini',
    'Hari1', 'jam1', 'Hari2', 'jam2', 'Hari3', 'jam3'
  ];
}

/**
 * REKAP_HARI: Menggunakan nohari kode unik & dipisah 3 baris per siswa
 */
function getRekapHariHeaders() {
  return ['nohari', 'NamaLengkap', 'KelasSaatini', 'Hari', 'Jam'];
}

function getRekapSudahHeaders() {
  return [
    'No', 'Kode_Verifikasi', 'nopdkt', 'NISN', 'NIK', 'NamaLengkap', 'KelasSaatini',
    'JenisKelamin', 'NomorHP', 'Status_Bekerja', 'Hari_Belajar_3x', 'Jam_Belajar',
    'Status_Materai_10000', 'Nama_File_Surat', 'Link_Berkas_Drive', 'Tanggal_Konfirmasi',
    'Status_Verifikasi', 'Catatan_Admin'
  ];
}

/**
 * REKAP_STATUS_AKSI: Memuat SKesanggupan & SPernyataan sesuai permintaan user
 */
function getRekapStatusAksiHeaders() {
  return [
    'No', 'NamaLengkap', 'NISN', 'nopdkt', 'KelasSaatini', 'Tanggal_Konfirmasi',
    'Status_Konfirmasi', 'SKesanggupan', 'SPernyataan', 'Status_Kirim_WA', 'Status_Download_PDF', 'Link_Drive_PDF', 'Link_Drive_Foto'
  ];
}
