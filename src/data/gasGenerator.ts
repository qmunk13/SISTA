import { OFFICIAL_88_SCHEMAS } from './schemas';

export function generateMergedCodeGs(): string {
  return `/**
 * ============================================================================
 * SISTEM INFORMASI TERPADU MANAJEMEN SEKOLAH (${OFFICIAL_88_SCHEMAS.length} TABEL MASTER DATABASE)
 * Google Apps Script Backend (Code.gs) - Merged & Fully Integrated
 * ============================================================================
 * Kepatuhan Mutlak:
 * 1. Skema ${OFFICIAL_88_SCHEMAS.length} tabel & urutan header persis sesuai OFFICIAL_88_SCHEMAS.
 * 2. Operasi massal memori (getDataRange().getValues()) - tanpa loop I/O sheet.
 * 3. Struktur 23 Sub-Folder Master Google Drive untuk penyimpanan tertata rapi.
 * 4. Penanganan error try-catch pada setiap fungsi backend dengan respon JSON standar.
 * ============================================================================
 */

var SPREADSHEET_ID = "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
try {
  var _activeSs = SpreadsheetApp.getActiveSpreadsheet();
  if (_activeSs) SPREADSHEET_ID = _activeSs.getId();
} catch(e) {}

/**
 * Pemicu Otorisasi Izin Google Drive & Spreadsheet
 * Jalankan fungsi ini sekali di editor Apps Script (toolbar atas > pilih 'otorisasiDrive' > klik 'Jalankan / Run ▶')
 * untuk mengaktifkan izin DriveApp & SpreadsheetApp sebelum men-deploy Web App.
 */
function otorisasiDrive() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ssName = ss ? ss.getName() : "Spreadsheet Master";
    var root = DriveApp.getRootFolder();
    Logger.log("✅ Otorisasi Berhasil! Spreadsheet: " + ssName + ", Root Drive: " + root.getName());
    return { status: "success", message: "Otorisasi DriveApp & SpreadsheetApp berhasil diaktifkan!" };
  } catch(e) {
    Logger.log("❌ Error otorisasi: " + e);
    throw e;
  }
}

/**
 * Menu otomatis di bilah menu Google Sheets
 */
function onOpen(e) {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('🎓 SISTA TAMBORA')
        .addItem('🔑 Otorisasi Akses Google Drive & Spreadsheet', 'otorisasiDrive')
        .addSeparator()
        .addItem('🗺️ Generate & Sinkronkan REKAP SISWA PER KELURAHAN', 'autoPopulateRekapKelurahanFromSiswa')
        .addItem('⚡ Salin & Sinkronkan Data ORANG TUA & YATIM', 'autoPopulateOrangTuaAndYatimFromSiswa')
        .addItem('📋 Salin & Audit Data DAPODIK VALIDASI', 'autoPopulateDapodikValidasiFromSiswa')
        .addSeparator()
        .addItem('⚙️ Setup / Buat Seluruh ${OFFICIAL_88_SCHEMAS.length} Sheet Master', 'initialize88SheetsDatabase')
        .addToUi();
    }
  } catch (err) {
    Logger.log("onOpen UI tidak dapat diakses dari context ini (misal dijalankan manual dari editor): " + err);
  }
}

function getSpreadsheet(idOptional) {
  var targetId = idOptional || SPREADSHEET_ID;
  if (targetId && String(targetId).trim().length >= 20) {
    try {
      return SpreadsheetApp.openById(String(targetId).trim());
    } catch(err) {
      Logger.log("openById error: " + err);
    }
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {}
  return null;
}

/**
 * Entry point Web App GAS
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action;
    var callback = params.callback;

    // Inisialisasi Database Master Sheet via GET
    if (action === 'setup' || action === 'setupDatabase' || action === 'setupMasterDatabase' || action === 'init' || action === 'initialize88SheetsDatabase' || action === 'initialize84SheetsDatabase') {
      var setupRes = initialize88SheetsDatabase(params.spreadsheetId || params.ssId);
      var jsonStrSetup = JSON.stringify(setupRes);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSetup + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSetup)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Inisialisasi 23 Sub-Folder Google Drive via GET
    if (action === 'setupDriveFolders' || action === 'setupFolders') {
      var folderRes = setupDriveFolders(params);
      var jsonStrFolder = JSON.stringify(folderRes);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrFolder + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrFolder)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle API Requests via GET
    if (action === 'GET_SHEET_GIDS' || action === 'get_sheet_gids') {
      var targetSsIdGet = (params && params.spreadsheetId) ? params.spreadsheetId : SPREADSHEET_ID;
      var ssGid = getSpreadsheet(targetSsIdGet);
      if (!ssGid) {
        var errOutput = JSON.stringify({ success: false, error: 'Spreadsheet tidak ditemukan atau tidak dapat diakses' });
        if (callback) return ContentService.createTextOutput(callback + '(' + errOutput + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(errOutput).setMimeType(ContentService.MimeType.JSON);
      }
      var sheetsList = ssGid.getSheets();
      var gidsMap = {};
      for (var gi = 0; gi < sheetsList.length; gi++) {
        gidsMap[sheetsList[gi].getName()] = sheetsList[gi].getSheetId();
      }
      var jsonGids = JSON.stringify({ success: true, gids: gidsMap });
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonGids + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonGids)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_ALL_SHEETS') {
      var allData = getAllDatabaseData();
      var jsonStr = JSON.stringify(allData);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStr + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStr)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SHEET') {
      var sheetName = params.sheetName || 'SISWA';
      var sheetData = getTableData(sheetName);
      var jsonStrSheet = JSON.stringify({ status: 'success', sheetName: sheetName, data: sheetData });
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSheet + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSheet)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_TAHUN_AJARAN') {
      var resTA = getTahunAjaranMaster();
      var jsonStrTA = JSON.stringify(resTA);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrTA + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrTA)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SEMESTER') {
      var resSem = getSemesterMaster(params.tahunAjaranId || params.taId);
      var jsonStrSem = JSON.stringify(resSem);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSem + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSem)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_KELAS' || action === 'GET_CLASSES' || action === 'GET_ROMBEL') {
      var resKelas = getKelasMaster(params.jenjangId, params.tingkat);
      var jsonStrKelas = JSON.stringify(resKelas);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrKelas + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrKelas)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_JENJANG') {
      var resJenjang = getJenjangMaster();
      var jsonStrJenjang = JSON.stringify(resJenjang);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrJenjang + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrJenjang)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SET_ACTIVE_TAHUN_AJARAN') {
      var resSetTA = setActiveTahunAjaran(params.taId || params.TAID || params.id);
      var jsonStrSetTA = JSON.stringify(resSetTA);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSetTA + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSetTA)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SET_ACTIVE_SEMESTER') {
      var resSetSem = setActiveSemester(params.semesterId || params.SemesterID || params.id);
      var jsonStrSetSem = JSON.stringify(resSetSem);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSetSem + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSetSem)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SILABUS') {
      var resSilabus = getSilabusMaster(params.paket, params.kelas, params.mapel);
      var jsonStrSilabus = JSON.stringify(resSilabus);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrSilabus + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrSilabus)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_KURIKULUM_MODUL') {
      var resModul = getKurikulumModul(params.paket, params.kelas);
      var jsonStrModul = JSON.stringify(resModul);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrModul + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrModul)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'LIST_DRIVE_FILES' || action === 'SCAN_DRIVE_FOLDER' || action === 'listDriveFiles' || action === 'scanDriveFolder' || action === 'getDriveFiles' || action === 'LIST_FILES' || action === 'GET_DRIVE_FILES' || action === 'SCAN_FOLDER') {
      var scanFolderIdGet = params.folderId || '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';
      var scanFolderNameGet = params.folderName || '11_MATERI_DAN_MODUL_DIGITAL';
      var sFolderGet = null;
      try {
        if (scanFolderIdGet && String(scanFolderIdGet).trim().length >= 20) {
          sFolderGet = DriveApp.getFolderById(String(scanFolderIdGet).trim());
        }
      } catch(e) {}
      if (!sFolderGet) {
        try {
          var sItrGet = DriveApp.getFoldersByName(scanFolderNameGet);
          if (sItrGet.hasNext()) sFolderGet = sItrGet.next();
        } catch(e) {}
      }
      var resScanGet = { status: 'error', success: false, message: 'Folder Google Drive tidak ditemukan.' };
      if (sFolderGet) {
        var fListGet = [];

        function collectFilesRecursively(folder, currentPath, depth) {
          if (!folder || depth > 3 || fListGet.length >= 150) return;
          try {
            var curFolderName = folder.getName();
            var files = folder.getFiles();
            while (files.hasNext()) {
              if (fListGet.length >= 150) return;
              var f = files.next();
              var fid = f.getId();
              var fname = f.getName();
              var fMime = 'application/pdf';
              try { fMime = f.getMimeType(); } catch(e) {}
              var fSize = 0;
              try { fSize = f.getSize(); } catch(e) {}
              fListGet.push({
                id: fid,
                name: fname,
                path: currentPath ? currentPath + ' / ' + fname : fname,
                folderName: curFolderName,
                mimeType: fMime,
                size: fSize,
                url: 'https://drive.google.com/file/d/' + fid + '/view?usp=sharing',
                directUrl: 'https://drive.google.com/uc?export=download&id=' + fid,
                updated: ''
              });
            }
            var subFolders = folder.getFolders();
            while (subFolders.hasNext()) {
              if (fListGet.length >= 150) return;
              var sub = subFolders.next();
              var subPath = currentPath ? currentPath + ' / ' + sub.getName() : sub.getName();
              collectFilesRecursively(sub, subPath, depth + 1);
            }
          } catch(errF) {}
        }

        collectFilesRecursively(sFolderGet, '', 0);

        resScanGet = {
          status: 'success',
          success: true,
          folderId: sFolderGet.getId(),
          folderName: sFolderGet.getName(),
          folderUrl: sFolderGet.getUrl(),
          count: fListGet.length,
          files: fListGet
        };
      }
      var jsonStrScanGet = JSON.stringify(resScanGet);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + jsonStrScanGet + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(jsonStrScanGet)
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'RENAME_DRIVE_FILE' || action === 'renameDriveFile' || action === 'RENAME_FILE' || action === 'renameFile') {
      var fileIdRenGet = params.fileId || params.id;
      var newNameRenGet = params.newName || params.name || params.fileName;
      if (!fileIdRenGet && params.url) {
        var matchIdGet = String(params.url).match(/[-\w]{25,}/);
        if (matchIdGet) fileIdRenGet = matchIdGet[0];
      }
      if (!fileIdRenGet || !newNameRenGet) {
        var resErrRenGet = {
          status: 'error',
          success: false,
          message: 'ID Berkas (fileId) dan Nama Baru (newName) wajib diisi untuk mengubah nama di Google Drive.'
        };
        var jsonErrRenGet = JSON.stringify(resErrRenGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonErrRenGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonErrRenGet).setMimeType(ContentService.MimeType.JSON);
      }
      try {
        var targetFileRenGet = DriveApp.getFileById(String(fileIdRenGet).trim());
        var oldNameRenGet = targetFileRenGet.getName();
        targetFileRenGet.setName(String(newNameRenGet).trim());
        var resSuccessRenGet = {
          status: 'success',
          success: true,
          fileId: fileIdRenGet,
          oldName: oldNameRenGet,
          newName: String(newNameRenGet).trim(),
          url: targetFileRenGet.getUrl(),
          message: 'Nama berkas fisik di Google Drive berhasil diubah dari "' + oldNameRenGet + '" menjadi "' + newNameRenGet + '".'
        };
        var jsonSuccessRenGet = JSON.stringify(resSuccessRenGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonSuccessRenGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonSuccessRenGet).setMimeType(ContentService.MimeType.JSON);
      } catch(errRenGet) {
        var resFailRenGet = {
          status: 'error',
          success: false,
          message: 'Gagal mengubah nama berkas di Google Drive: ' + errRenGet.toString()
        };
        var jsonFailRenGet = JSON.stringify(resFailRenGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonFailRenGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonFailRenGet).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'GET_DRIVE_FILE_INFO' || action === 'getDriveFileInfo' || action === 'GET_FILE_INFO' || action === 'getFileInfo') {
      var fileIdInfoGet = params.fileId || params.id;
      if (!fileIdInfoGet && params.url) {
        var matchInfoGet = String(params.url).match(/[-\w]{25,}/);
        if (matchInfoGet) fileIdInfoGet = matchInfoGet[0];
      }
      if (!fileIdInfoGet) {
        var resErrInfoGet = {
          status: 'error',
          success: false,
          message: 'fileId atau url tidak valid.'
        };
        var jsonErrInfoGet = JSON.stringify(resErrInfoGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonErrInfoGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonErrInfoGet).setMimeType(ContentService.MimeType.JSON);
      }
      try {
        var fileInfoObjGet = DriveApp.getFileById(String(fileIdInfoGet).trim());
        var resSuccessInfoGet = {
          status: 'success',
          success: true,
          fileId: fileInfoObjGet.getId(),
          id: fileInfoObjGet.getId(),
          name: fileInfoObjGet.getName(),
          fileName: fileInfoObjGet.getName(),
          mimeType: fileInfoObjGet.getMimeType(),
          size: fileInfoObjGet.getSize(),
          url: fileInfoObjGet.getUrl()
        };
        var jsonSuccessInfoGet = JSON.stringify(resSuccessInfoGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonSuccessInfoGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonSuccessInfoGet).setMimeType(ContentService.MimeType.JSON);
      } catch(errInfoGet) {
        var resFailInfoGet = {
          status: 'error',
          success: false,
          message: 'Gagal mengambil info berkas Google Drive: ' + errInfoGet.toString()
        };
        var jsonFailInfoGet = JSON.stringify(resFailInfoGet);
        if (callback) return ContentService.createTextOutput(callback + '(' + jsonFailInfoGet + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        return ContentService.createTextOutput(jsonFailInfoGet).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Print Invoice / PDF mode
    if (params.printInvoice) {
      return HtmlService.createHtmlOutput(generateInvoiceHtml_(params.printInvoice))
        .setTitle('Invoice ' + params.printInvoice)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Try rendering Index.html if created by user
    try {
      var template = HtmlService.createTemplateFromFile('Index');
      template.konfigurasi = getKonfigurasiAplikasi().data || {};
      template.WEBAPP_URL = ScriptApp.getService().getUrl();
      return template.evaluate()
        .setTitle('Sistem Terpadu Sekolah - ${OFFICIAL_88_SCHEMAS.length} Sheet')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setFaviconUrl('https://cdn-icons-png.flaticon.com/512/2920/2920224.png');
    } catch (htmlErr) {
      // Friendly fallback status page if Index.html is not created
      return HtmlService.createHtmlOutput(
        '<div style="font-family:system-ui, sans-serif; padding:40px 20px; text-align:center; background:#0f172a; color:#f8fafc; min-height:100vh;">' +
        '<div style="max-width:600px; margin:0 auto; background:#1e293b; padding:32px; border-radius:24px; border:1px solid #334155; shadow:0 20px 25px -5px rgba(0,0,0,0.5);">' +
        '<h2 style="color:#38bdf8; margin-top:0;">⚡ Backend Google Apps Script Master Database Aktif!</h2>' +
        '<p style="color:#cbd5e1; line-height:1.6; font-size:14px;">' +
        'URL Web App ini telah aktif dan siap digunakan untuk <b>Sinkronisasi Realtime 2 Arah (${OFFICIAL_88_SCHEMAS.length} Tabel Sheet & 23 Sub-Folder Drive)</b> dengan seluruh modul Sistem Sekolah.' +
        '</p>' +
        '<div style="background:#0284c7; color:#ffffff; padding:12px 20px; border-radius:12px; font-weight:bold; font-size:13px; margin:20px 0; display:inline-block;">' +
        '✓ Status API: Online & Siap Terhubung (${OFFICIAL_88_SCHEMAS.length} Sheet Tersinkron)' +
        '</div>' +
        '<p style="font-size:12px; color:#94a3b8; margin-bottom:0;">' +
        'Seluruh modul (Absensi QR & Kehadiran, Guru & Leger Nilai, SPMB, CBT, Keuangan & Tabungan, Siswa & Dual Logo) siap digunakan.' +
        '</p>' +
        '</div>' +
        '</div>'
      )
      .setTitle('Backend API GAS Master Database (${OFFICIAL_88_SCHEMAS.length} Sheet) - Online')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Inisialisasi Otomatis 88 Sheet beserta Header Resminya
 */
function initialize88SheetsDatabase(idOptional) {
  try {
    var ss = getSpreadsheet(idOptional);
    if (!ss) {
      return { status: 'error', success: false, message: 'Spreadsheet tidak ditemukan. Pastikan Google Apps Script dibuka melalui Google Sheets (Ekstensi > Apps Script).' };
    }
    var schemas = ${JSON.stringify(OFFICIAL_88_SCHEMAS.map(s => ({ name: s.name, headers: s.headers })))};
    
    var createdCount = 0;
    var updatedCount = 0;
    schemas.forEach(function(schema) {
      var sheet = ss.getSheetByName(schema.name);
      if (!sheet) {
        sheet = ss.insertSheet(schema.name);
        sheet.appendRow(schema.headers);
        sheet.getRange(1, 1, 1, schema.headers.length)
          .setFontWeight('bold')
          .setBackground('#1e293b')
          .setFontColor('#ffffff');
        sheet.setFrozenRows(1);
        try { sheet.autoResizeColumns(1, Math.min(schema.headers.length, 25)); } catch(e) {}
        createdCount++;
      } else {
        // Ensure header integrity (jika sheet sudah ada tapi baris 1 kosong / belum ada header)
        var existingCols = sheet.getLastColumn();
        var existingRows = sheet.getLastRow();
        if (existingCols === 0 || existingRows === 0) {
          sheet.appendRow(schema.headers);
          sheet.getRange(1, 1, 1, schema.headers.length)
            .setFontWeight('bold')
            .setBackground('#1e293b')
            .setFontColor('#ffffff');
          sheet.setFrozenRows(1);
        } else {
          // Periksa apakah baris 1 sudah berisi header
          var firstRowVals = sheet.getRange(1, 1, 1, Math.max(existingCols, schema.headers.length)).getValues()[0];
          var hasValidHeader = firstRowVals.some(function(v) { return v && String(v).trim() !== ''; });
          if (!hasValidHeader) {
            sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
            sheet.getRange(1, 1, 1, schema.headers.length)
              .setFontWeight('bold')
              .setBackground('#1e293b')
              .setFontColor('#ffffff');
            sheet.setFrozenRows(1);
          } else {
            // Periksa dan lengkapi kolom header baru dari skema resmi jika belum ada di baris 1
            var currentHeadersUpper = firstRowVals.map(function(h) { return String(h || '').toUpperCase().trim(); });
            var missingOfficial = schema.headers.filter(function(h) {
              return currentHeadersUpper.indexOf(String(h).toUpperCase().trim()) === -1;
            });
            if (missingOfficial.length > 0) {
              var startCol = sheet.getLastColumn() + 1;
              sheet.getRange(1, startCol, 1, missingOfficial.length).setValues([missingOfficial]);
              sheet.getRange(1, startCol, 1, missingOfficial.length)
                .setFontWeight('bold')
                .setBackground('#1e293b')
                .setFontColor('#ffffff');
            }
          }
        }
        updatedCount++;
      }
    });

    // Otomatis Seed 11 Tahun Ajaran (2023/2024 s/d 2033/2034) jika sheet TAHUN_AJARAN baru/kosong
    var sheetTA = ss.getSheetByName('TAHUN_AJARAN');
    if (sheetTA && sheetTA.getLastRow() <= 1) {
      var seedTAData = [
        ["TA-2023-2024", "2023/2024", "2023", "2024", "2023-07-17", "2024-06-22", "TIDAK"],
        ["TA-2024-2025", "2024/2025", "2024", "2025", "2024-07-15", "2025-06-21", "TIDAK"],
        ["TA-2025-2026", "2025/2026", "2025", "2026", "2025-07-14", "2026-06-20", "TIDAK"],
        ["TA-2026-2027", "2026/2027", "2026", "2027", "2026-07-13", "2027-06-19", "YA"],
        ["TA-2027-2028", "2027/2028", "2027", "2028", "2027-07-12", "2028-06-23", "TIDAK"],
        ["TA-2028-2029", "2028/2029", "2028", "2029", "2028-07-17", "2029-06-22", "TIDAK"],
        ["TA-2029-2030", "2029/2030", "2029", "2030", "2029-07-16", "2030-06-22", "TIDAK"],
        ["TA-2030-2031", "2030/2031", "2030", "2031", "2030-07-15", "2031-06-21", "TIDAK"],
        ["TA-2031-2032", "2031/2032", "2031", "2032", "2031-07-14", "2032-06-20", "TIDAK"],
        ["TA-2032-2033", "2032/2033", "2032", "2033", "2032-07-12", "2033-06-18", "TIDAK"],
        ["TA-2033-2034", "2033/2034", "2033", "2034", "2033-07-11", "2034-06-23", "TIDAK"]
      ];
      sheetTA.getRange(2, 1, seedTAData.length, seedTAData[0].length).setValues(seedTAData);
    }

    // Otomatis Seed 22 Semester (2023 s/d 2034) jika sheet SEMESTER baru/kosong
    var sheetSem = ss.getSheetByName('SEMESTER');
    if (sheetSem && sheetSem.getLastRow() <= 1) {
      var seedSemData = [
        ["SEM-2023-1", "2023/2024 Ganjil", "TA-2023-2024", "2023/2024", "Ganjil", "2023-07-17", "2023-12-22", "TIDAK"],
        ["SEM-2023-2", "2023/2024 Genap", "TA-2023-2024", "2023/2024", "Genap", "2024-01-08", "2024-06-22", "TIDAK"],
        ["SEM-2024-1", "2024/2025 Ganjil", "TA-2024-2025", "2024/2025", "Ganjil", "2024-07-15", "2024-12-20", "TIDAK"],
        ["SEM-2024-2", "2024/2025 Genap", "TA-2024-2025", "2024/2025", "Genap", "2025-01-06", "2025-06-21", "TIDAK"],
        ["SEM-2025-1", "2025/2026 Ganjil", "TA-2025-2026", "2025/2026", "Ganjil", "2025-07-14", "2025-12-19", "TIDAK"],
        ["SEM-2025-2", "2025/2026 Genap", "TA-2025-2026", "2025/2026", "Genap", "2026-01-05", "2026-06-20", "TIDAK"],
        ["SEM-2026-1", "2026/2027 Ganjil", "TA-2026-2027", "2026/2027", "Ganjil", "2026-07-13", "2026-12-18", "YA"],
        ["SEM-2026-2", "2026/2027 Genap", "TA-2026-2027", "2026/2027", "Genap", "2027-01-04", "2027-06-19", "TIDAK"],
        ["SEM-2027-1", "2027/2028 Ganjil", "TA-2027-2028", "2027/2028", "Ganjil", "2027-07-12", "2027-12-17", "TIDAK"],
        ["SEM-2027-2", "2027/2028 Genap", "TA-2027-2028", "2027/2028", "Genap", "2028-01-03", "2028-06-17", "TIDAK"],
        ["SEM-2028-1", "2028/2029 Ganjil", "TA-2028-2029", "2028/2029", "Ganjil", "2028-07-17", "2028-12-22", "TIDAK"],
        ["SEM-2028-2", "2028/2029 Genap", "TA-2028-2029", "2028/2029", "Genap", "2029-01-08", "2029-06-23", "TIDAK"],
        ["SEM-2029-1", "2029/2030 Ganjil", "TA-2029-2030", "2029/2030", "Ganjil", "2029-07-16", "2029-12-21", "TIDAK"],
        ["SEM-2029-2", "2029/2030 Genap", "TA-2029-2030", "2029/2030", "Genap", "2030-01-07", "2030-06-22", "TIDAK"],
        ["SEM-2030-1", "2030/2031 Ganjil", "TA-2030-2031", "2030/2031", "Ganjil", "2030-07-15", "2030-12-20", "TIDAK"],
        ["SEM-2030-2", "2030/2031 Genap", "TA-2030-2031", "2030/2031", "Genap", "2031-01-06", "2031-06-21", "TIDAK"],
        ["SEM-2031-1", "2031/2032 Ganjil", "TA-2031-2032", "2031/2032", "Ganjil", "2031-07-14", "2031-12-19", "TIDAK"],
        ["SEM-2031-2", "2031/2032 Genap", "TA-2031-2032", "2031/2032", "Genap", "2032-01-05", "2032-06-19", "TIDAK"],
        ["SEM-2032-1", "2032/2033 Ganjil", "TA-2032-2033", "2032/2033", "Ganjil", "2032-07-12", "2032-12-17", "TIDAK"],
        ["SEM-2032-2", "2032/2033 Genap", "TA-2032-2033", "2032/2033", "Genap", "2033-01-03", "2033-06-18", "TIDAK"],
        ["SEM-2033-1", "2033/2034 Ganjil", "TA-2033-2034", "2033/2034", "Ganjil", "2033-07-18", "2033-12-23", "TIDAK"],
        ["SEM-2033-2", "2033/2034 Genap", "TA-2033-2034", "2033/2034", "Genap", "2034-01-09", "2034-06-24", "TIDAK"]
      ];
      sheetSem.getRange(2, 1, seedSemData.length, seedSemData[0].length).setValues(seedSemData);
    }

    // Otomatis Seed JENJANG jika kosong
    var sheetJenjang = ss.getSheetByName('JENJANG');
    if (sheetJenjang && sheetJenjang.getLastRow() <= 1) {
      var seedJenjangData = [
        ["J001", "PA", "Paket A", "Kelas 4", "Kelas 5", "Kelas 6", "Pendidikan Dasar Setara SD", "Aktif"],
        ["J002", "PB", "Paket B", "Kelas 7", "Kelas 8", "Kelas 9", "Pendidikan Menengah Pertama Setara SMP", "Aktif"],
        ["J003", "PC", "Paket C", "Kelas 10", "Kelas 11", "Kelas 12", "Pendidikan Menengah Atas Setara SMA", "Aktif"]
      ];
      sheetJenjang.getRange(2, 1, seedJenjangData.length, seedJenjangData[0].length).setValues(seedJenjangData);
    }

    // Otomatis Seed KELAS (Rombel Pokok) jika kosong
    var sheetKelas = ss.getSheetByName('KELAS');
    if (sheetKelas && sheetKelas.getLastRow() <= 1) {
      var seedKelasData = [
        ["A4", "4", "J001", "Paket A Kelas 4", "GR_011", "Nadia Tussolihah", "Nadia Tussolihah", "1", 36, "2026/2027", "AKTIF"],
        ["A5", "5", "J001", "Paket A Kelas 5", "GR_026", "ACHMAD MULYADI", "ACHMAD MULYADI", "2", 36, "2026/2027", "AKTIF"],
        ["A6", "6", "J001", "Paket A Kelas 6", "GR_006", "SYAIDAH", "SYAIDAH", "3", 36, "2026/2027", "AKTIF"],
        ["B7", "7", "J002", "Paket B Kelas 7", "GR_005", "Mey Yuniartin", "Mey Yuniartin", "1", 36, "2026/2027", "AKTIF"],
        ["B8", "8", "J002", "Paket B Kelas 8", "GR_024", "Sumarji", "Sumarji", "2", 36, "2026/2027", "AKTIF"],
        ["B9", "9", "J002", "Paket B Kelas 9", "GR_025", "Andri Aldian AR", "Andri Aldian AR", "3", 36, "2026/2027", "AKTIF"],
        ["C10", "10", "J003", "Paket C Kelas 10", "GR_002", "Nur Andara Sari", "Nur Andara Sari", "1", 36, "2026/2027", "AKTIF"],
        ["C11", "11", "J003", "Paket C Kelas 11", "GR_010", "Mustopa Kamal", "Mustopa Kamal", "2", 36, "2026/2027", "AKTIF"],
        ["C12", "12", "J003", "Paket C Kelas 12", "GR_008", "Abi Setiadi", "Abi Setiadi", "3", 36, "2026/2027", "AKTIF"]
      ];
      sheetKelas.getRange(2, 1, seedKelasData.length, seedKelasData[0].length).setValues(seedKelasData);
    }

    // Clean default Sheet1 if exists and other sheets present
    var defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      try { ss.deleteSheet(defaultSheet); } catch(e) {}
    }

    logAudit('SYSTEM', 'INIT_DATABASE', 'Inisialisasi ' + createdCount + ' sheet baru dari total ' + schemas.length + ' sheet.');
    return { 
      status: 'success', 
      success: true, 
      message: 'Inisialisasi ' + schemas.length + ' Sheet Master Database Berhasil! Total sheet terverifikasi: ' + schemas.length, 
      total: schemas.length, 
      created: createdCount, 
      updated: updatedCount 
    };
  } catch (err) {
    return { status: 'error', success: false, message: 'Gagal inisialisasi ' + schemas.length + ' sheet: ' + err.toString() };
  }
}

// ============================================================================
// FUNGSI ALIAS & KOMPATIBILITAS MUNDUR (BACKWARD COMPATIBILITY)
// ----------------------------------------------------------------------------
// Catatan Arsitektur:
// 1. initialize88SheetsDatabase() adalah fungsi UTAMA resmi untuk membuat seluruh 88 sheet master.
// 2. initialize84SheetsDatabase() adalah fungsi ALIAS dari versi sebelumnya (ketika masih 84 sheet).
//    Fungsi ini sengaja dipertahankan agar tidak memutus integrasi script lama/webhook,
//    dan di dalamnya 100% otomatis memanggil initialize88SheetsDatabase().
// 3. setupMasterDatabase() dan setup() juga merupakan alias yang memanggil initialize88SheetsDatabase().
// ============================================================================
function initialize84SheetsDatabase() {
  return initialize88SheetsDatabase();
}

function setupMasterDatabase() {
  return initialize88SheetsDatabase();
}

function setup() {
  return initialize88SheetsDatabase();
}

/**
 * Otomatisasi Pembuatan & Penataan 24 Sub-Folder Master Google Drive
 * Termasuk Hierarki Lengkap Modul K13 & Silabus (Paket -> Kelas -> Mapel) pada Folder 11
 */
function setupDriveFolders(payload) {
  try {
    var root = null;
    var rawId = payload && (payload.folderId || payload.folderName || "");
    var targetFolderId = (rawId && String(rawId).trim().length >= 20) ? String(rawId).trim() : "13W6zz_g_nN-zGJdbquP4H4NvXrZZLk0j";
    
    if (targetFolderId && targetFolderId !== "BERKAS_SISWA_MASTER") {
      try {
        root = DriveApp.getFolderById(targetFolderId);
      } catch (e) {
        root = null;
      }
    }
    if (!root) {
      try {
        root = DriveApp.getFolderById("13W6zz_g_nN-zGJdbquP4H4NvXrZZLk0j");
      } catch (e) {
        root = null;
      }
    }
    if (!root) {
      var rootFolderName = (payload && payload.folderName && payload.folderName.length < 30) ? payload.folderName : "BERKAS_SISWA_MASTER";
      var folders = DriveApp.getFoldersByName(rootFolderName);
      if (folders.hasNext()) {
        root = folders.next();
      } else {
        root = DriveApp.createFolder(rootFolderName);
        try {
          root.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {}
      }
    }

    function getSub(parent, name) {
      if (!name || !String(name).trim()) return parent;
      var cleanName = String(name).trim();
      var iter = parent.getFoldersByName(cleanName);
      if (iter.hasNext()) return iter.next();
      var created = parent.createFolder(cleanName);
      try {
        created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}
      return created;
    }

    var standardFolders = [
      { name: "01_BERKAS_SISWA_AKTIF", desc: "Berkas pokok siswa (Akta Kelahiran, KK, KTP Ortu, KIA, Ijazah Asal, NISN per folder siswa)" },
      { name: "02_PAS_FOTO_SISWA", desc: "Pas Foto Formal 3x4 / 4x6 Background Merah/Biru Siswa" },
      { name: "03_PRESTASI_DAN_SERTIFIKAT_SISWA", desc: "Piagam Penghargaan, Sertifikat Lomba, Kejuaraan & Portofolio Siswa" },
      { name: "04_BERKAS_GURU_DAN_GTK", desc: "Berkas Pendidik & Tenaga Kependidikan (KTP, KK, Ijazah S1/S2, Sertifikat Pendidik per Guru)" },
      { name: "05_SK_DAN_DOKUMEN_KEPEGAWAIAN", desc: "SK Pengangkatan Yayasan/Dinas, SK Pembagian Tugas Mengajar, Surat Tugas & SPPD" },
      { name: "06_SPMB_PENDAFTARAN_DAN_VERIFIKASI", desc: "Berkas Pendaftar Calon Siswa Baru / PPDB Online & Bukti Verifikasi Berkas" },
      { name: "07_AKADEMIK_DAN_PERANGKAT_AJAR", desc: "Kalender Pendidikan, Capaian Pembelajaran CP/ATP, Modul Ajar, Silabus, RPP & Jadwal Pelajaran" },
      { name: "08_PRESENSI_SURAT_IZIN_DAN_CUTI", desc: "Surat Keterangan Sakit Dokter Siswa, Surat Izin Dispensasi, Surat Cuti Guru & Rekap Presensi" },
      { name: "09_CBT_BANK_SOAL_DAN_ASESMEN", desc: "Naskah Ujian, Bank Soal CBT, Kisi-kisi, Rubrik Penilaian, Kartu Soal & Berita Acara Ujian" },
      { name: "10_TUGAS_DAN_LEMBAR_KERJA_SISWA", desc: "Portofolio Tugas Siswa, LKPD Digital, Hasil Proyek P5 & Karya Belajar" },
      { name: "11_MATERI_DAN_MODUL_DIGITAL", desc: "Modul Pembelajaran Mandiri, E-Book Bahan Ajar, Video Pembelajaran & Presentasi Slide Guru" },
      { name: "12_RAPOR_DAN_LEGER_NILAI", desc: "Arsip E-Rapor Semester, Leger Nilai Hasil Belajar, Surat Keterangan Lulus SKL & Ijazah" },
      { name: "13_KEUANGAN_KWITANSI_DAN_BUKTI_BAYAR", desc: "Foto Bukti Transfer Pembayaran SPP/Iuran, Kwitansi Kasir Digital, Struk Pembayaran Siswa" },
      { name: "14_KAS_PENGELUARAN_DAN_BOS", desc: "Nota Belanja Operasional, Kwitansi Pengeluaran Kas, Laporan Pertanggungjawaban BOS/BOP" },
      { name: "15_TABUNGAN_SISWA_DAN_MUTASI", desc: "Buku Rekening Tabungan Digital, Slip Setoran & Penarikan Tabungan Siswa" },
      { name: "16_BK_DAN_KEDISIPLINAN_SISWA", desc: "Catatan Konseling Bimbingan Siswa, Surat Panggilan Orang Tua, Berita Acara Mediasi & Kasus" },
      { name: "17_SARANA_PRASARANA_DAN_ASET", desc: "Foto Fisik Gedung/Ruangan, Foto Inventaris Aset Barang, Berita Acara Pemeliharaan & Perbaikan" },
      { name: "18_PERSURATAN_DAN_ARSIP_TU", desc: "Scan Surat Masuk Dinas/Instansi, Arsip Surat Keluar Resmi Sekolah & Surat Rekomendasi" },
      { name: "19_PERPUSTAKAAN_DIGITAL_DAN_EBOOK", desc: "Cover Buku Pelajaran/Novel, File E-Book Perpustakaan, Form Peminjaman & Bebas Pustaka" },
      { name: "20_EKSKUL_DAN_DOKUMENTASI_KEGIATAN", desc: "Foto & Video Dokumentasi Upacara, Kegiatan Ekstrakurikuler, Lomba, Pentas Seni & Event Sekolah" },
      { name: "21_MADING_BERITA_DAN_BANNER_WEB", desc: "Banner Pengumuman, Majalah Dinding Digital, Foto Berita Portal Publik & Desain Logo" },
      { name: "22_AKREDITASI_DAN_DOKUMEN_LEMBAGA", desc: "Dokumen 4 Komponen Akreditasi IASP / BAN-S/M, Izin Operasional, NPSN, NPWP & Sertifikat Akreditasi" },
      { name: "23_BACKUP_DATABASE_DAN_LOG_SISTEM", desc: "File Backup JSON & Excel Master Database, Log Audit & Cadangan Sistem" },
      { name: "24_FOTO_DAN_ILUSTRASI_SOAL_CBT", desc: "Gambar ilustrasi soal CBT, grafik, diagram ujian dan media asesmen" }
    ];

    var createdList = [];
    var folder11Ref = null;

    for (var i = 0; i < standardFolders.length; i++) {
      var item = standardFolders[i];
      var f = getSub(root, item.name);
      if (item.name.indexOf("11_MATERI_DAN_MODUL_DIGITAL") !== -1) {
        folder11Ref = f;
      }
      createdList.push({
        name: item.name,
        desc: item.desc,
        id: f.getId(),
        url: f.getUrl()
      });
    }

    // Jika Folder 11 memiliki ID khusus (1xaf825icvAaXO7T1YtxjbWQQw-sud_t0), sinkronkan juga langsung ke sana
    if (!folder11Ref) {
      try {
        folder11Ref = DriveApp.getFolderById("1xaf825icvAaXO7T1YtxjbWQQw-sud_t0");
      } catch (e) {}
    }

    // Struktur Silabus Lengkap (Paket -> Kelas -> Mata Pelajaran)
    var silabusHierarchy = {
      "PAKET A (SD)": {
        "A4 (Kelas 4)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn",
          "BAR - Bahasa Arab"
        ],
        "A5 (Kelas 5)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn",
          "BAR - Bahasa Arab"
        ],
        "A6 (Kelas 6)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn"
        ]
      },
      "PAKET B (SMP)": {
        "B7 (Kelas 7)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn"
        ],
        "B8 (Kelas 8)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn"
        ],
        "B9 (Kelas 9)": [
          "PAI - Pendidikan Agama Islam",
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "IPA - Ilmu Pengetahuan Alam",
          "IPS - Ilmu Pengetahuan Sosial",
          "PPKn - PPKn"
        ]
      },
      "PAKET C (SMA)": {
        "C10 (Kelas 10)": [
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "EKO - Ekonomi",
          "GEO - Geografi",
          "SOS - Sosiologi",
          "SJI - Sejarah Indonesia",
          "SJP - Sejarah Peminatan",
          "PPKn - PPKn",
          "PAI - Pendidikan Agama Islam"
        ],
        "C11 (Kelas 11)": [
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "EKO - Ekonomi",
          "GEO - Geografi",
          "SOS - Sosiologi",
          "SJI - Sejarah Indonesia",
          "SJP - Sejarah Peminatan",
          "PPKn - PPKn",
          "PAI - Pendidikan Agama Islam"
        ],
        "C12 (Kelas 12)": [
          "BIN - Bahasa Indonesia",
          "BIG - Bahasa Inggris",
          "MTK - Matematika",
          "MTKP - Matematika Peminatan",
          "EKO - Ekonomi",
          "GEO - Geografi",
          "SOS - Sosiologi",
          "SJI - Sejarah Indonesia",
          "SJP - Sejarah Peminatan",
          "PPKn - PPKn"
        ]
      }
    };

    var subFolderModulCount = 0;
    if (folder11Ref) {
      for (var paketKey in silabusHierarchy) {
        var paketFolder = getSub(folder11Ref, paketKey);
        var kelasObj = silabusHierarchy[paketKey];
        for (var kelasKey in kelasObj) {
          var kelasFolder = getSub(paketFolder, kelasKey);
          var mapelArr = kelasObj[kelasKey];
          for (var m = 0; m < mapelArr.length; m++) {
            getSub(kelasFolder, mapelArr[m]);
            subFolderModulCount++;
          }
        }
      }
    }

    return {
      success: true,
      status: 'success',
      rootName: root.getName(),
      rootUrl: root.getUrl(),
      rootId: root.getId(),
      folders: createdList,
      totalSubFoldersCreated: createdList.length + subFolderModulCount,
      subFolderModulCount: subFolderModulCount,
      message: "Sukses! 24 Struktur Sub-Folder Master Google Drive & " + subFolderModulCount + " Sub-Folder Modul Digital (Paket > Kelas > Mapel) berhasil dibuat & tertata rapi."
    };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error: "Gagal membuat struktur folder di Google Drive: " + err.toString()
    };
  }
}
function setupFolders(payload) { return setupDriveFolders(payload); }

/**
 * Ambil Seluruh Data 88 Sheet Sekaligus untuk Inisialisasi Frontend SPA
 */
function getAllDatabaseData() {
  try {
    var ss = getSpreadsheet();
    var schemas = ${JSON.stringify(OFFICIAL_88_SCHEMAS.map(s => ({ name: s.name, headers: s.headers })))};
    var result = {};

    schemas.forEach(function(schema) {
      var sheet = ss.getSheetByName(schema.name);
      if (!sheet) {
        result[schema.name] = [];
        return;
      }
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        result[schema.name] = [];
        return;
      }
      var headers = data[0];
      var rows = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, idx) {
          obj[h] = row[idx] !== undefined ? row[idx] : '';
        });
        return obj;
      });
      result[schema.name] = rows;
    });

    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Read Single Sheet Data as Object Array
 */
function getTableData(sheetName) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { status: 'error', message: 'Sheet ' + sheetName + ' tidak ditemukan.' };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [], headers: data[0] || [] };
    }
    
    var headers = data[0];
    var rows = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, idx) {
        obj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      return obj;
    });

    return { status: 'success', data: rows, headers: headers };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Insert Single Record into Specified Sheet
 */
function insertTableRecord(sheetName, recordData) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var defaultHeaders = Object.keys(recordData);
      if (defaultHeaders.length > 0) {
        sheet.appendRow(defaultHeaders);
        sheet.getRange(1, 1, 1, defaultHeaders.length)
          .setFontWeight('bold')
          .setBackground('#1e293b')
          .setFontColor('#ffffff');
        sheet.setFrozenRows(1);
      }
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    if (!headers || headers.length === 0 || !headers[0]) {
      headers = Object.keys(recordData);
      sheet.appendRow(headers);
    }
    var newRow = headers.map(function(h) {
      return recordData[h] !== undefined ? recordData[h] : '';
    });

    sheet.appendRow(newRow);
    logAudit(recordData.username || recordData.createdBy || 'PublicUser', 'INSERT_' + sheetName, 'Menambah data di ' + sheetName);

    return { status: 'success', message: 'Data berhasil disimpan ke ' + sheetName };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Update Existing Record by Matching ID Key & Value
 */
function updateTableRecord(sheetName, idColumn, idValue, updateData) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { status: 'error', message: 'Sheet ' + sheetName + ' tidak ditemukan.' };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'error', message: 'Sheet ' + sheetName + ' kosong.' };

    var headers = data[0];
    var idxId = headers.indexOf(idColumn);
    if (idxId === -1) return { status: 'error', message: 'Kolom ID ' + idColumn + ' tidak ditemukan di ' + sheetName };

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxId]) === String(idValue)) {
        rowIndex = i + 1; // 1-indexed row in sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Record dengan ' + idColumn + ' = ' + idValue + ' tidak ditemukan.' };
    }

    var updatedRow = headers.map(function(h, colIdx) {
      if (updateData[h] !== undefined) {
        return updateData[h];
      }
      return data[rowIndex - 1][colIdx];
    });

    sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
    logAudit(updateData.updatedBy || 'System', 'UPDATE_' + sheetName, 'Mengubah data ' + idColumn + ': ' + idValue);

    return { status: 'success', message: 'Data ' + sheetName + ' berhasil diperbarui.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Delete Record from Specified Sheet by ID
 */
function deleteTableRecord(sheetName, idColumn, idValue) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { status: 'error', message: 'Sheet ' + sheetName + ' tidak ditemukan.' };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'error', message: 'Sheet ' + sheetName + ' kosong.' };

    var headers = data[0];
    var idxId = headers.indexOf(idColumn);
    if (idxId === -1) return { status: 'error', message: 'Kolom ' + idColumn + ' tidak ditemukan.' };

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idxId]) === String(idValue)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Data tidak ditemukan.' };
    }

    sheet.deleteRow(rowIndex);
    logAudit('System', 'DELETE_' + sheetName, 'Menghapus data ' + idColumn + ': ' + idValue);

    return { status: 'success', message: 'Data ' + sheetName + ' berhasil dihapus.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Unified CRUD Router for Frontend SPA
 */
function saveSheetRecord(sheetName, action, recordData, idKey, idValue) {
  if (action === 'CREATE') {
    return insertTableRecord(sheetName, recordData);
  } else if (action === 'UPDATE') {
    return updateTableRecord(sheetName, idKey || 'id', idValue || recordData[idKey || 'id'], recordData);
  } else if (action === 'DELETE') {
    return deleteTableRecord(sheetName, idKey || 'id', idValue);
  }
  return { status: 'error', message: 'Aksi CRUD tidak valid: ' + action };
}

/**
 * Log Audit Handler
 */
function logAudit(username, action, detail) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('AUDIT_LOG');
    if (sheet) {
      sheet.appendRow([
        'AUD-' + new Date().getTime(),
        Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
        username || 'System',
        'SYSTEM',
        action,
        detail,
        '127.0.0.1'
      ]);
    }
  } catch (e) {
    // Ignore audit logging errors
  }
}

/**
 * Autentikasi Pengguna Terintegrasi (Tabel USERS & SISWA)
 */
function loginUser(username, password, nopdkt) {
  try {
    var ss = getSpreadsheet();
    
    // Login Siswa menggunakan NOPDKT / NISN
    if (nopdkt) {
      var sheetSiswa = ss.getSheetByName('SISWA');
      if (!sheetSiswa) return { status: 'error', message: 'Sheet SISWA belum diinisialisasi' };
      
      var siswaData = sheetSiswa.getDataRange().getValues();
      var headersSiswa = siswaData[0];
      var idxNopdkt = headersSiswa.indexOf('nopdkt');
      var idxNisn = headersSiswa.indexOf('NISN');
      var idxNama = headersSiswa.indexOf('Nama Lengkap');
      var idxKelas = headersSiswa.indexOf('Kelas Saat ini');

      for (var i = 1; i < siswaData.length; i++) {
        var row = siswaData[i];
        if (String(row[idxNopdkt]) === String(nopdkt) || String(row[idxNisn]) === String(nopdkt)) {
          return {
            status: 'success',
            user: {
              id: 'SIS-' + row[idxNisn],
              username: String(row[idxNisn]),
              name: row[idxNama],
              role: 'SISWA',
              nopdkt: row[idxNopdkt],
              kelasId: row[idxKelas]
            }
          };
        }
      }
      return { status: 'error', message: 'Nopdkt / NISN siswa tidak ditemukan.' };
    }

    // Login Admin / Guru / Staf via USERS
    var sheetUsers = ss.getSheetByName('USERS');
    if (!sheetUsers) return { status: 'error', message: 'Sheet USERS belum diinisialisasi' };

    var usersData = sheetUsers.getDataRange().getValues();
    if (usersData.length <= 1) return { status: 'error', message: 'Data USERS kosong.' };

    var headersU = usersData[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
    var idxU = headersU.indexOf('username');
    var idxP = headersU.indexOf('password');
    var idxR = headersU.indexOf('roleid') !== -1 ? headersU.indexOf('roleid') : headersU.indexOf('role');
    var idxN = headersU.indexOf('nama') !== -1 ? headersU.indexOf('nama') : headersU.indexOf('name');
    var idxPdkt = headersU.indexOf('nip_nisn') !== -1 ? headersU.indexOf('nip_nisn') : (headersU.indexOf('nopdkt') !== -1 ? headersU.indexOf('nopdkt') : headersU.indexOf('nip'));
    var idxEmail = headersU.indexOf('email');
    var idxNoHp = headersU.indexOf('nohp');
    var idxStatus = headersU.indexOf('status');

    if (idxU === -1 || idxP === -1) {
      idxU = 1; // Fallback kolom 2
      idxP = 2; // Fallback kolom 3
    }

    for (var j = 1; j < usersData.length; j++) {
      var uRow = usersData[j];
      var rowUser = String(uRow[idxU] || '').trim().toLowerCase();
      var rowEmail = idxEmail !== -1 ? String(uRow[idxEmail] || '').trim().toLowerCase() : '';
      var inputUser = String(username || '').trim().toLowerCase();
      var rowPass = String(uRow[idxP] || '').trim();
      var inputPass = String(password || '').trim();

      if ((rowUser === inputUser || (rowEmail && rowEmail === inputUser)) && rowPass === inputPass) {
        var statusVal = idxStatus !== -1 ? String(uRow[idxStatus] || 'Aktif').trim().toUpperCase() : 'AKTIF';
        if (statusVal === 'NONAKTIF' || statusVal === 'TIDAK' || statusVal === 'BLOCKED') {
          return { status: 'error', message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' };
        }

        // Update LastLogin
        try {
          var idxLastLogin = headersU.indexOf('lastlogin');
          if (idxLastLogin !== -1) {
            sheetUsers.getRange(j + 1, idxLastLogin + 1).setValue(formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'));
          }
        } catch (eLog) {}

        // Ambil Hak Akses Role dari Sheet HAK_AKSES jika tersedia
        var userRoleId = idxR !== -1 ? String(uRow[idxR]).trim().toUpperCase() : 'RL-019';
        var permissions = [];
        try {
          var sheetAkses = ss.getSheetByName('HAK_AKSES');
          if (sheetAkses) {
            var aksesData = sheetAkses.getDataRange().getValues();
            if (aksesData.length > 1) {
              var headersA = aksesData[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
              var idxRoleA = headersA.indexOf('roleid') !== -1 ? headersA.indexOf('roleid') : headersA.indexOf('role');
              var idxMenuA = headersA.indexOf('menuid') !== -1 ? headersA.indexOf('menuid') : headersA.indexOf('menu');
              var idxView = headersA.indexOf('read') !== -1 ? headersA.indexOf('read') : headersA.indexOf('dapatlihat');
              var idxCreate = headersA.indexOf('create') !== -1 ? headersA.indexOf('create') : headersA.indexOf('dapattambah');
              var idxUpdate = headersA.indexOf('update') !== -1 ? headersA.indexOf('update') : headersA.indexOf('dapatedit');
              var idxDelete = headersA.indexOf('delete') !== -1 ? headersA.indexOf('delete') : headersA.indexOf('dapathapus');
              var idxApprove = headersA.indexOf('approve');
              var idxExport = headersA.indexOf('export');
              var idxImport = headersA.indexOf('import');

              for (var k = 1; k < aksesData.length; k++) {
                var aRow = aksesData[k];
                var rowRoleId = String(aRow[idxRoleA] || '').trim().toUpperCase();
                if (rowRoleId === userRoleId || rowRoleId === 'ALL' || userRoleId === 'RL-001' || userRoleId === 'SUPERADMIN') {
                  permissions.push({
                    hakAksesId: aRow[0],
                    menuId: aRow[idxMenuA],
                    canView: idxView !== -1 ? (String(aRow[idxView]).toUpperCase() === 'YA') : true,
                    canCreate: idxCreate !== -1 ? (String(aRow[idxCreate]).toUpperCase() === 'YA') : false,
                    canUpdate: idxUpdate !== -1 ? (String(aRow[idxUpdate]).toUpperCase() === 'YA') : false,
                    canDelete: idxDelete !== -1 ? (String(aRow[idxDelete]).toUpperCase() === 'YA') : false,
                    canApprove: idxApprove !== -1 ? (String(aRow[idxApprove]).toUpperCase() === 'YA') : false,
                    canExport: idxExport !== -1 ? (String(aRow[idxExport]).toUpperCase() === 'YA') : true,
                    canImport: idxImport !== -1 ? (String(aRow[idxImport]).toUpperCase() === 'YA') : false
                  });
                }
              }
            }
          }
        } catch (eAkses) {}

        return {
          status: 'success',
          user: {
            id: uRow[0] || ('USR_' + j),
            userId: uRow[0] || ('USR_' + j),
            username: uRow[idxU],
            name: idxN !== -1 ? uRow[idxN] : uRow[idxU],
            nama: idxN !== -1 ? uRow[idxN] : uRow[idxU],
            role: userRoleId,
            roleId: userRoleId,
            nopdkt: idxPdkt !== -1 ? uRow[idxPdkt] : '',
            nip_nisn: idxPdkt !== -1 ? uRow[idxPdkt] : '',
            email: idxEmail !== -1 ? uRow[idxEmail] : '',
            noHp: idxNoHp !== -1 ? uRow[idxNoHp] : '',
            permissions: permissions
          }
        };
      }
    }

    return { status: 'error', message: 'Username/Email atau password salah.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Absensi: Submit Scan / Input Massal
 */
function submitAbsensi(absensiList, tanggal, operator) {
  try {
    var ss = getSpreadsheet();
    var sheetAbsensi = ss.getSheetByName('ABSENSI');
    if (!sheetAbsensi) return { status: 'error', message: 'Sheet ABSENSI tidak ada.' };

    var now = new Date();
    var jamStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss');
    
    var rowsToAppend = absensiList.map(function(item) {
      return [
        'ABS-' + new Date().getTime() + '-' + Math.floor(Math.random()*1000),
        tanggal,
        item.nopdkt,
        item.kelasId,
        item.jamDatang || jamStr,
        item.jamPulang || '',
        item.keterangan || 'Hadir',
        item.status || 'Hadir',
        '', '', '', '', item.catatanIzin || '', ''
      ];
    });

    if (rowsToAppend.length > 0) {
      sheetAbsensi.getRange(sheetAbsensi.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
        .setValues(rowsToAppend);
    }

    logAudit(operator || 'System', 'SUBMIT_ABSENSI', 'Input presensi ' + rowsToAppend.length + ' siswa');
    return { status: 'success', message: 'Berhasil mencatat ' + rowsToAppend.length + ' absensi.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Keuangan & Pembayaran: Input Pembayaran
 */
function submitPembayaran(payload) {
  try {
    var ss = getSpreadsheet();
    var shBayar = ss.getSheetByName('PEMBAYARAN');
    var shTagihan = ss.getSheetByName('TAGIHAN');
    var shInvoice = ss.getSheetByName('INVOICE');

    var invId = 'INV-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd') + '-' + Math.floor(Math.random()*1000);
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    // Insert Pembayaran
    shBayar.appendRow([
      'BYR-' + new Date().getTime(),
      payload.tagihanId,
      payload.nopdkt,
      payload.kelasId,
      payload.tglBayar,
      payload.metode,
      payload.jumlah,
      payload.catatan || '',
      payload.createdBy || 'Admin',
      nowStr,
      invId,
      payload.tagihanId,
      payload.namaSiswa,
      payload.nopdkt
    ]);

    // Insert Invoice
    shInvoice.appendRow([
      'INV-ROW-' + new Date().getTime(),
      invId,
      payload.nopdkt,
      payload.kelasId,
      payload.tglBayar,
      payload.metode,
      payload.jumlah,
      'LUNAS',
      payload.createdBy || 'Admin',
      nowStr,
      payload.namaSiswa
    ]);

    // Update Tagihan
    var tagihanData = shTagihan.getDataRange().getValues();
    var hT = tagihanData[0];
    var idxId = hT.indexOf('id');
    var idxStatus = hT.indexOf('status');
    var idxPaid = hT.indexOf('paidAmount');
    var idxRem = hT.indexOf('remainingAmount');

    for (var i = 1; i < tagihanData.length; i++) {
      if (String(tagihanData[i][idxId]) === String(payload.tagihanId)) {
        var currentPaid = Number(tagihanData[i][idxPaid] || 0) + Number(payload.jumlah);
        var nominal = Number(tagihanData[i][hT.indexOf('nominal')] || 0);
        var remaining = Math.max(0, nominal - currentPaid);
        var newStatus = remaining <= 0 ? 'LUNAS' : 'SEBAGIAN';

        shTagihan.getRange(i + 1, idxStatus + 1).setValue(newStatus);
        shTagihan.getRange(i + 1, idxPaid + 1).setValue(currentPaid);
        shTagihan.getRange(i + 1, idxRem + 1).setValue(remaining);
        break;
      }
    }

    return { status: 'success', message: 'Pembayaran berhasil dicatat. Invoice: ' + invId, invoiceId: invId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul CBT Ujian: Submit Hasil Ujian
 */
function submitHasilUjian(dataUjian) {
  try {
    var ss = getSpreadsheet();
    var shHasil = ss.getSheetByName('HASIL_UJIAN');
    var shLog = ss.getSheetByName('LOG_UJIAN');

    var idHasil = 'HSL-' + new Date().getTime();
    
    shHasil.appendRow([
      idHasil,
      dataUjian.idAsesmen || 'AS-01',
      dataUjian.idUjian,
      dataUjian.jenjang || 'SMA',
      dataUjian.kelas,
      dataUjian.mapel,
      dataUjian.nisn,
      dataUjian.namaSiswa,
      dataUjian.nilaiMentah,
      dataUjian.benar,
      dataUjian.salah,
      dataUjian.totalSoal,
      dataUjian.pelanggaran || 0,
      dataUjian.waktuMulai || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
      dataUjian.status || 'SELESAI',
      dataUjian.tahunAjaran || '2026/2027',
      dataUjian.nilaiAkhir,
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
      dataUjian.durasi || '30 Menit',
      dataUjian.idJadwal
    ]);

    shLog.appendRow([
      'LOG-' + new Date().getTime(),
      dataUjian.nisn,
      dataUjian.namaSiswa,
      dataUjian.jenjang || 'SMA',
      dataUjian.kelas,
      'SELESAI',
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
      dataUjian.pelanggaran || 0,
      dataUjian.token || '-',
      dataUjian.idJadwal
    ]);

    return { status: 'success', message: 'Hasil ujian berhasil disimpan!', idHasil: idHasil, nilaiAkhir: dataUjian.nilaiAkhir };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul SPMB: Submit Pendaftaran Calon Siswa
 */
function submitPendaftaranSpmb(payload) {
  try {
    var ss = getSpreadsheet();
    var shSpmb = ss.getSheetByName('SPMB_PESERTA');
    if (!shSpmb) return { status: 'error', message: 'Sheet SPMB_PESERTA tidak ditemukan.' };

    var regId = 'REG-' + new Date().getTime();
    shSpmb.appendRow([
      regId,
      payload.namaLengkap,
      payload.nisn || '',
      payload.nik || '',
      payload.tempatLahir || '',
      payload.tanggalLahir || '',
      payload.jenisKelamin || 'L',
      payload.asalSekolah || '',
      payload.noHp || '',
      payload.email || '',
      payload.namaOrtu || '',
      payload.gelombangId || 'GEL-1',
      'TERDAFTAR',
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss')
    ]);

    logAudit('PublicPortal', 'REGISTER_SPMB', 'Pendaftaran calon siswa baru: ' + payload.namaLengkap);
    return { status: 'success', message: 'Pendaftaran berhasil! Nomor Registrasi: ' + regId, registrationId: regId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Get Tahun Ajaran
 */
function getTahunAjaranMaster() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('TAHUN_AJARAN');
    if (!sheet) return { status: 'error', message: 'Sheet TAHUN_AJARAN tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };
    
    var headers = data[0];
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }
      results.push(item);
    }
    return { status: 'success', data: results };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Get Semester
 */
function getSemesterMaster(filterTaId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('SEMESTER');
    if (!sheet) return { status: 'error', message: 'Sheet SEMESTER tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };
    
    var headers = data[0];
    var idxTA = headers.indexOf('TahunAjaranID');
    if (idxTA === -1) idxTA = headers.indexOf('taId');
    
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (filterTaId && idxTA !== -1 && String(row[idxTA]).trim() !== String(filterTaId).trim()) {
        continue;
      }
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }
      results.push(item);
    }
    return { status: 'success', data: results };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Set Active Tahun Ajaran
 */
function setActiveTahunAjaran(targetTaId) {
  try {
    if (!targetTaId) return { status: 'error', message: 'TAID harus diisi.' };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('TAHUN_AJARAN');
    if (!sheet) return { status: 'error', message: 'Sheet TAHUN_AJARAN tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'error', message: 'Data sheet TAHUN_AJARAN kosong.' };
    
    var headers = data[0];
    var idxId = headers.indexOf('TAID');
    if (idxId === -1) idxId = 0;
    var idxAktif = headers.indexOf('Aktif');
    if (idxAktif === -1) idxAktif = headers.length - 1;
    
    var updated = 0;
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][idxId]).trim();
      var isTarget = (rowId.toLowerCase() === String(targetTaId).trim().toLowerCase());
      sheet.getRange(i + 1, idxAktif + 1).setValue(isTarget ? 'YA' : 'TIDAK');
      if (isTarget) updated++;
    }
    
    logAudit('ADMIN', 'SET_ACTIVE_TA', 'Tahun Ajaran aktif diubah ke: ' + targetTaId);
    return { status: 'success', message: 'Tahun Ajaran aktif berhasil diperbarui.', targetTaId: targetTaId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Set Active Semester
 */
function setActiveSemester(targetSemesterId) {
  try {
    if (!targetSemesterId) return { status: 'error', message: 'SemesterID harus diisi.' };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('SEMESTER');
    if (!sheet) return { status: 'error', message: 'Sheet SEMESTER tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'error', message: 'Data sheet SEMESTER kosong.' };
    
    var headers = data[0];
    var idxId = headers.indexOf('SemesterID');
    if (idxId === -1) idxId = 0;
    var idxAktif = headers.indexOf('Aktif');
    if (idxAktif === -1) idxAktif = headers.length - 1;
    
    var updated = 0;
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][idxId]).trim();
      var isTarget = (rowId.toLowerCase() === String(targetSemesterId).trim().toLowerCase());
      sheet.getRange(i + 1, idxAktif + 1).setValue(isTarget ? 'YA' : 'TIDAK');
      if (isTarget) updated++;
    }
    
    logAudit('ADMIN', 'SET_ACTIVE_SEMESTER', 'Semester aktif diubah ke: ' + targetSemesterId);
    return { status: 'success', message: 'Semester aktif berhasil diperbarui.', targetSemesterId: targetSemesterId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Get Kelas / Rombel Master
 */
function getKelasMaster(filterJenjangId, filterTingkat) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('KELAS');
    if (!sheet) return { status: 'error', message: 'Sheet KELAS tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };
    
    var headers = data[0];
    var idxJenjang = headers.indexOf('JenjangID');
    if (idxJenjang === -1) idxJenjang = headers.indexOf('Jenjang');
    var idxTingkat = headers.indexOf('Tingkat');
    
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (filterJenjangId && idxJenjang !== -1 && String(row[idxJenjang]).trim() !== String(filterJenjangId).trim()) {
        continue;
      }
      if (filterTingkat && idxTingkat !== -1 && String(row[idxTingkat]).trim() !== String(filterTingkat).trim()) {
        continue;
      }
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }
      results.push(item);
    }
    return { status: 'success', data: results };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Modul Master Akademik: Get Jenjang Master
 */
function getJenjangMaster() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('JENJANG');
    if (!sheet) return { status: 'error', message: 'Sheet JENJANG tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };
    
    var headers = data[0];
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        item[headers[h]] = row[h];
      }
      results.push(item);
    }
    return { status: 'success', data: results };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Direct GAS Sync Helper for HTML Service (google.script.run.syncSheetData)
 */
function syncSheetData(sheetName, dataJsonRaw) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    try { hasLock = lock.tryLock(25000); } catch(eL) { hasLock = false; }
    var dataJson = typeof dataJsonRaw === 'string' ? JSON.parse(dataJsonRaw) : dataJsonRaw;
    if (!Array.isArray(dataJson) || dataJson.length === 0) {
      return { status: 'skipped', message: 'Data kosong diabaikan. Sheet ' + sheetName + ' dipertahankan tanpa perubahan untuk mencegah kehilangan data.' };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (!headers || headers.length === 0 || !headers[0]) {
      headers = Object.keys(dataJson[0]);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // Proteksi Circuit Breaker Anti-Hapus: Jangan timpa jika data baru jauh lebih sedikit dari data lama (>15 baris)
    if (lastRow > 15 && dataJson.length < (lastRow - 1) * 0.2) {
      return {
        status: 'skipped',
        success: false,
        message: 'Proteksi Anti-Hapus Aktif: Data baru (' + dataJson.length + ') jauh lebih sedikit dibanding data lama di spreadsheet (' + (lastRow - 1) + ' baris). Operasi penimpaan dibatalkan demi keamanan data.'
      };
    }

    var rowsToAppend = dataJson.map(function(rowObj) {
      return headers.map(function(h) {
        return resolveRowValue(rowObj, h);
      });
    });

    // Tulis data baru LANGSUNG menimpa mulai dari baris 2 tanpa mengosongkan sheet terlebih dahulu (atomic overwrite)
    var rangeDirectSync = sheet.getRange(2, 1, rowsToAppend.length, headers.length);
    var directFormats = [];
    for (var dfr = 0; dfr < rowsToAppend.length; dfr++) {
      var dfRow = [];
      for (var dfc = 0; dfc < headers.length; dfc++) {
        dfRow.push('@');
      }
      directFormats.push(dfRow);
    }
    rangeDirectSync.setNumberFormats(directFormats);
    rangeDirectSync.setValues(rowsToAppend);

    // HANYA bersihkan baris sisa di bawah jika data lama lebih banyak daripada data baru
    if (lastRow > (rowsToAppend.length + 1)) {
      sheet.getRange(2 + rowsToAppend.length, 1, lastRow - (rowsToAppend.length + 1), sheet.getLastColumn()).clearContent();
    }

    return { status: 'success', message: 'Sheet ' + sheetName + ' berhasil disinkronkan aman (' + rowsToAppend.length + ' baris)' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch(eRel) {}
    }
  }
}

/**
 * Entry Point HTTP POST Endpoint (Web App Integration Router for Realtime Sync)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    var params = {};
    if (e && e.parameter) {
      for (var k in e.parameter) { params[k] = e.parameter[k]; }
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var bodyObj = JSON.parse(e.postData.contents);
        for (var bk in bodyObj) { params[bk] = bodyObj[bk]; }
      } catch (pErr) {}
    }
    var action = params.action || 'GET_ALL_SHEETS';

    // Kunci proses tulis/sinkron untuk mencegah tabrakan/race condition antar user
    var writeActions = ['sync', 'SYNC', 'SYNC_SHEET', 'MASS_SYNC_ALL', 'syncTable', 'syncData', 'SYNC_DATA', 'SYNC_TABLE', 'SAVE_SETTING', 'bayar_add', 'tabungan_add', 'submitAbsensi', 'submitPembayaran', 'submitHasilUjian', 'submitPendaftaranSpmb'];
    if (writeActions.indexOf(action) !== -1) {
      try { hasLock = lock.tryLock(30000); } catch (eLock) { hasLock = false; }
    }

    if (action === 'pull' || action === 'PULL') {
      var allDb = getAllDatabaseData();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        data: allDb.SISWA || [],
        students: allDb.SISWA || [],
        teachers: allDb.GURU || [],
        allData: allDb
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'sync' || action === 'SYNC') {
      var ssSync = getSpreadsheet(params.spreadsheetId || params.ssId);
      if (!ssSync) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'Spreadsheet tidak dapat dibuka. Pastikan ID Spreadsheet valid dan izin otorisasi telah diberikan: ' + (params.spreadsheetId || SPREADSHEET_ID)
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var sSiswa = ssSync.getSheetByName('SISWA');
      var sGuru = ssSync.getSheetByName('GURU');

      if (params.data || params.students) {
        var studentRecords = params.data || params.students;
        if (Array.isArray(studentRecords) && studentRecords.length > 0 && sSiswa) {
          var sLastRow = sSiswa.getLastRow();
          // Circuit Breaker Anti-Hapus
          if (sLastRow > 15 && studentRecords.length < (sLastRow - 1) * 0.2 && !params.forceTruncate) {
            return ContentService.createTextOutput(JSON.stringify({
              status: 'skipped',
              success: false,
              message: 'Proteksi Anti-Hapus Aktif: Data siswa baru (' + studentRecords.length + ') jauh lebih sedikit dibanding data lama di spreadsheet (' + (sLastRow - 1) + ' baris). Operasi penimpaan ditolak demi keamanan.'
            })).setMimeType(ContentService.MimeType.JSON);
          }

          var sHeaders = sSiswa.getRange(1, 1, 1, sSiswa.getLastColumn()).getValues()[0];
          var sRows = studentRecords.map(function(st) {
            return sHeaders.map(function(h) {
              return resolveRowValue(st, h);
            });
          });
          var sRange = sSiswa.getRange(2, 1, sRows.length, sHeaders.length);
          var sFormats = [];
          for (var sr = 0; sr < sRows.length; sr++) {
            var sfRow = [];
            for (var sc = 0; sc < sHeaders.length; sc++) {
              sfRow.push('@');
            }
            sFormats.push(sfRow);
          }
          sRange.setNumberFormats(sFormats);
          sRange.setValues(sRows);

          // Bersihkan sisa baris di bawahnya jika data lama lebih banyak
          if (sLastRow > (1 + sRows.length)) {
            sSiswa.getRange(2 + sRows.length, 1, sLastRow - (1 + sRows.length), sHeaders.length).clearContent();
          }
        }
      }

      // Otomatis sinkronkan sheet ORANG_TUA, YATIM_PIATU, dan REKAP_SISWA_KELURAHAN saat data SISWA berubah
      try {
        autoPopulateOrangTuaAndYatimFromSiswa();
        autoPopulateRekapKelurahanFromSiswa();
      } catch (ePop) {
        // Abaikan jika sheet turunan belum siap
      }

      if (params.teachers && Array.isArray(params.teachers) && params.teachers.length > 0 && sGuru) {
        var tRecords = params.teachers;
        var gLastRow = sGuru.getLastRow();
        if (gLastRow > 15 && tRecords.length < (gLastRow - 1) * 0.2 && !params.forceTruncate) {
          // Lewati penimpaan drastis guru
        } else {
          var gHeaders = sGuru.getRange(1, 1, 1, sGuru.getLastColumn()).getValues()[0];
          var gRows = tRecords.map(function(tc) {
            return gHeaders.map(function(h) {
              return resolveRowValue(tc, h);
            });
          });
          var gRange = sGuru.getRange(2, 1, gRows.length, gHeaders.length);
          var gFormats = [];
          for (var gr = 0; gr < gRows.length; gr++) {
            var gfRow = [];
            for (var gc = 0; gc < gHeaders.length; gc++) {
              gfRow.push('@');
            }
            gFormats.push(gfRow);
          }
          gRange.setNumberFormats(gFormats);
          gRange.setValues(gRows);

          // Bersihkan sisa baris di bawahnya jika data lama lebih banyak
          if (gLastRow > (1 + gRows.length)) {
            sGuru.getRange(2 + gRows.length, 1, gLastRow - (1 + gRows.length), gHeaders.length).clearContent();
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', success: true, message: 'Sinkronisasi berhasil aman!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SAVE_SUARA_KOMUNITAS' || action === 'SAVE_RECORD') {
      var sName = params.sheetName || 'SUARA_KOMUNITAS';
      var recordData = params.recordData || params.data || params;
      var resSuara = insertTableRecord(sName, recordData);
      return ContentService.createTextOutput(JSON.stringify(resSuara))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'tabungan_add' || action === 'TABUNGAN_ADD' || action === 'tambah_tabungan' || action === 'APPEND_ROW' || action === 'appendRow') {
      var sNameTab = params.table || params.sheetName || 'TABUNGAN';
      var rDataTab = params.recordData || params.data || params;
      var resTab = insertTableRecord(sNameTab, rDataTab);
      return ContentService.createTextOutput(JSON.stringify(resTab))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'CREATE' || action === 'UPDATE' || action === 'DELETE') {
      var sName = params.sheetName || params.table || 'SUARA_KOMUNITAS';
      var rData = params.recordData || params.data || params;
      var resCrud = saveSheetRecord(sName, action, rData, params.idKey || 'id', params.idValue || rData[params.idKey || 'id']);
      return ContentService.createTextOutput(JSON.stringify(resCrud))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SHEET_GIDS' || action === 'get_sheet_gids') {
      var targetSsIdPost = (params && params.spreadsheetId) || (e && e.parameter && e.parameter.spreadsheetId) || SPREADSHEET_ID;
      var ssGidPost = getSpreadsheet(targetSsIdPost);
      if (!ssGidPost) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Spreadsheet tidak ditemukan atau tidak dapat diakses' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var sheetsListPost = ssGidPost.getSheets();
      var gidsMapPost = {};
      for (var gp = 0; gp < sheetsListPost.length; gp++) {
        gidsMapPost[sheetsListPost[gp].getName()] = sheetsListPost[gp].getSheetId();
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, gids: gidsMapPost }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_ALL_SHEETS') {
      var allData = getAllDatabaseData();
      return ContentService.createTextOutput(JSON.stringify(allData))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_TAHUN_AJARAN') {
      var resTA = getTahunAjaranMaster();
      return ContentService.createTextOutput(JSON.stringify(resTA))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SEMESTER') {
      var resSem = getSemesterMaster(params.tahunAjaranId || params.taId);
      return ContentService.createTextOutput(JSON.stringify(resSem))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_KELAS' || action === 'GET_CLASSES' || action === 'GET_ROMBEL') {
      var resKelasPost = getKelasMaster(params.jenjangId, params.tingkat);
      return ContentService.createTextOutput(JSON.stringify(resKelasPost))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_JENJANG') {
      var resJenjangPost = getJenjangMaster();
      return ContentService.createTextOutput(JSON.stringify(resJenjangPost))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SET_ACTIVE_TAHUN_AJARAN') {
      var resSetTA = setActiveTahunAjaran(params.taId || params.TAID || params.id);
      return ContentService.createTextOutput(JSON.stringify(resSetTA))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SET_ACTIVE_SEMESTER') {
      var resSetSem = setActiveSemester(params.semesterId || params.SemesterID || params.id);
      return ContentService.createTextOutput(JSON.stringify(resSetSem))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_SHEET') {
      var sheetName = params.sheetName;
      var sheetData = getTableData(sheetName);
      return ContentService.createTextOutput(JSON.stringify(sheetData))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Universal Helper for resolving values from record with flexible header mapping
    function resolveRowValue(record, header) {
      if (!record || typeof record !== 'object') return '';
      var rawVal = '';

      if (record[header] !== undefined && record[header] !== null) {
        var v = record[header];
        rawVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
      } else {
        var cleanH = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
        var keys = Object.keys(record);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH) {
            var val = record[k];
            rawVal = (val !== undefined && val !== null) ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '';
            break;
          }
        }
        if (!rawVal) {
          // Common Fallback Aliases
          if (cleanH === 'namabiaya' || cleanH === 'namapos' || cleanH === 'posbiaya') {
            var nb = record.NamaBiaya || record.namaBiaya || record.nama || record.namaPos || record.posBiaya;
            if (nb) rawVal = String(nb);
          } else if (cleanH === 'kodebiaya' || cleanH === 'kode') {
            var kb = record.KodeBiaya || record.kodeBiaya || record.kode || record.id || record.BiayaID;
            if (kb) rawVal = String(kb);
          } else if (cleanH === 'biayaid' || cleanH === 'idbiaya') {
            var bid = record.BiayaID || record.biayaId || record.id;
            if (bid) rawVal = String(bid);
          } else if (cleanH === 'targetkelas' || cleanH === 'target') {
            var tk = record.Target_Kelas || record.targetKelas || record.kelasNama || record.kelas;
            if (tk) rawVal = String(tk);
          } else if (cleanH === 'namasiswa' || cleanH === 'studentname') {
            var ns = record.NamaSiswa || record.namaSiswa || record.studentName || record.NamaLengkap || record.namaLengkap || record.nama || record.Nama || record.name;
            if (ns) rawVal = String(ns);
          } else if (cleanH === 'nama' || cleanH === 'namalengkap' || cleanH === 'name') {
            var n = record.NamaLengkap || record.namaLengkap || record.NamaSiswa || record.namaSiswa || record.nama || record.Nama || record.name;
            if (n) rawVal = String(n);
          } else if (cleanH === 'tagihanid' || cleanH === 'idtagihan') {
            var tid = record.TagihanID || record.tagihanId || record.id || record.ID;
            if (tid) rawVal = String(tid);
          } else if (cleanH === 'pembayaranid' || cleanH === 'idpembayaran') {
            var pid = record.PembayaranID || record.pembayaranId || record.id || record.ID;
            if (pid) rawVal = String(pid);
          } else if (cleanH === 'invoiceid' || cleanH === 'idinvoice' || cleanH === 'nokwitansi') {
            var invId = record.InvoiceID || record.invoiceId || record.id || record.ID;
            if (invId) rawVal = String(invId);
          } else if (cleanH === 'tabunganid' || cleanH === 'idtabungan') {
            var tabId = record.TabunganID || record.tabunganId || record.id || record.ID;
            if (tabId) rawVal = String(tabId);
          } else if (cleanH === 'kasid' || cleanH === 'idkas') {
            var kId = record.KasID || record.kasId || record.id || record.ID;
            if (kId) rawVal = String(kId);
          } else if (cleanH === 'totaltagihan') {
            var tt = record.TotalTagihan ?? record.totalTagihan ?? record.nominal;
            if (tt !== undefined && tt !== null) rawVal = String(tt);
          } else if (cleanH === 'totalbayar') {
            var tb = record.TotalBayar ?? record.totalBayar ?? record.paidAmount;
            if (tb !== undefined && tb !== null) rawVal = String(tb);
          } else if (cleanH === 'sisatagihan') {
            var st = record.SisaTagihan ?? record.sisaTagihan ?? record.remainingAmount;
            if (st !== undefined && st !== null) rawVal = String(st);
          } else if (cleanH === 'saldosebelumnya') {
            var sPrev = record.SaldoSebelumnya ?? record.saldoSebelumnya;
            if (sPrev !== undefined && sPrev !== null) rawVal = String(sPrev);
          } else if (cleanH === 'saldoakhir') {
            var sAfter = record.SaldoAkhir ?? record.saldoAkhir ?? record.saldoSesudahnya ?? record.saldo;
            if (sAfter !== undefined && sAfter !== null) rawVal = String(sAfter);
          } else if (cleanH === 'metodepembayaran') {
            var mp = record.MetodePembayaran || record.metodePembayaran || record.metode;
            if (mp) rawVal = String(mp);
          } else if (cleanH === 'jatuhtempo') {
            var jt = record.JatuhTempo || record.jatuhTempo || record.tanggalJatuhTempo;
            if (jt) rawVal = String(jt);
          } else if (cleanH === 'tanggaltagihan') {
            var ttgl = record.TanggalTagihan || record.tanggalTagihan;
            if (ttgl) rawVal = String(ttgl);
          } else if (cleanH === 'tanggalbayar') {
            var tbay = record.TanggalBayar || record.tanggalBayar || record.paidAt;
            if (tbay) rawVal = String(tbay);
          } else if (cleanH === 'nisn' || cleanH === 'nis' || cleanH === 'nopdkt') {
            var idVal = record.nisn || record.NISN || record.nis || record.nopdkt || record.NoPDKT || record.id || record.ID;
            if (idVal) rawVal = String(idVal);
          } else if (cleanH === 'siswaid' || cleanH === 'idsiswa' || cleanH === 'studentid') {
            var sId = record.SiswaID || record.siswaId || record.studentId || record.id || record.ID || record.nisn || record.NISN || record.nis || record.nopdkt;
            if (sId) rawVal = String(sId);
          } else if (cleanH === 'guruid' || cleanH === 'idguru' || cleanH === 'teacherid') {
            var gId = record.GuruID || record.guruId || record.teacherId || record.id || record.ID || record.nip || record.NIP;
            if (gId) rawVal = String(gId);
          } else if (cleanH === 'userid' || cleanH === 'iduser') {
            var uId = record.UserID || record.userId || record.id || record.ID;
            if (uId) rawVal = String(uId);
          } else if (cleanH === 'ortuid' || cleanH === 'idortu') {
            var oId = record.OrtuID || record.ortuId || record.id;
            if (oId) rawVal = String(oId);
          } else if (cleanH === 'yatimid' || cleanH === 'idyatim') {
            var yId = record.YatimID || record.yatimId || record.id;
            if (yId) rawVal = String(yId);
          } else if (cleanH === 'kelas' || cleanH === 'kelassaatini' || cleanH === 'rombel' || cleanH === 'namakelas') {
            var cVal = record.class || record.kelas || record.Kelas || record.rombel || record.Rombel || record.NamaKelas || record.namaKelas || record.name;
            if (cVal) rawVal = String(cVal);
          } else if (cleanH === 'kelasid' || cleanH === 'idkelas') {
            var cId = record.KelasID || record.kelasId || record.id || record.ID || record.kode;
            if (cId) rawVal = String(cId);
          } else if (cleanH === 'jenjangid' || cleanH === 'idjenjang') {
            var jId = record.JenjangID || record.jenjangId || record.jenjang || record.paket;
            if (jId) rawVal = String(jId);
          } else if (cleanH === 'namajenjang') {
            var nj = record.NamaJenjang || record.namaJenjang || record.nama || record.jenjang;
            if (nj) rawVal = String(nj);
          } else if (cleanH === 'tingkat' || cleanH === 'tingkatkelas') {
            var tk = record.Tingkat || record.tingkat || record.level || record.grade;
            if (tk !== undefined && tk !== null) rawVal = String(tk);
          } else if (cleanH === 'walikelas' || cleanH === 'wali') {
            var wk = record.WaliKelas || record.waliKelas || record.wali || record.guru;
            if (wk) rawVal = String(wk);
          } else if (cleanH === 'kapasitas') {
            var kpVal = record.Kapasitas || record.kapasitas || record.capacity || 30;
            if (kpVal !== undefined && kpVal !== null) rawVal = String(kpVal);
          } else if (cleanH === 'jeniskelamin' || cleanH === 'lp' || cleanH === 'jk' || cleanH === 'gender') {
            var gVal = record.gender || record.jenisKelamin || record.JenisKelamin || record.jk || record.JK || record.lp;
            if (gVal) rawVal = String(gVal);
          } else if (cleanH === 'status' || cleanH === 'statussiswa') {
            var stVal = record.status || record.Status || record.statusSiswa || record.statusKeaktifan;
            if (stVal) rawVal = String(stVal);
          } else if (cleanH === 'namaayah' || cleanH === 'ayah') {
            var fVal = record.fatherName || record.namaAyah || record.NamaAyah;
            if (fVal) rawVal = String(fVal);
          } else if (cleanH === 'namaibu' || cleanH === 'ibu') {
            var mVal = record.motherName || record.namaIbu || record.NamaIbu;
            if (mVal) rawVal = String(mVal);
          } else if (cleanH === 'nohp' || cleanH === 'telepon' || cleanH === 'phone' || cleanH === 'hp') {
            var pVal = record.phone || record.noHp || record.NoHP || record.telepon || record.tlpWali;
            if (pVal) rawVal = String(pVal);
          } else if (cleanH === 'matapelajaran' || cleanH === 'mapel' || cleanH === 'namamapel' || cleanH === 'subject') {
            var mp = record.MataPelajaran || record['Mata Pelajaran'] || record.mataPelajaran || record.Mapel || record.mapel || record.NamaMapel || record.namaMapel || record.nama;
            if (mp) rawVal = String(mp);
          } else if (cleanH === 'nomorsoal' || cleanH === 'nomor' || cleanH === 'nosoal') {
            var ns = record.NomorSoal !== undefined ? record.NomorSoal : (record.Nomor !== undefined ? record.Nomor : (record.nomorSoal !== undefined ? record.nomorSoal : (record.nomor !== undefined ? record.nomor : record.id)));
            if (ns !== undefined && ns !== null) rawVal = String(ns);
          } else if (cleanH === 'pertanyaan' || cleanH === 'soal' || cleanH === 'isisoal') {
            var pt = record.Pertanyaan || record.pertanyaan || record.Soal || record.soal;
            if (pt) rawVal = String(pt);
          } else if (cleanH === 'kuncijawaban' || cleanH === 'kunci' || cleanH === 'jawaban') {
            var kj = record.KunciJawaban || record.kunciJawaban || record.kunci || record.Kunci || record.Jawaban || record.jawaban;
            if (kj) rawVal = String(kj);
          } else if (cleanH === 'pembahasanrasional' || cleanH === 'pembahasan') {
            var pb = record.PembahasanRasional || record.pembahasanRasional || record.pembahasan || record.Pembahasan;
            if (pb) rawVal = String(pb);
          } else if (cleanH === 'singkatan' || cleanH === 'sing' || cleanH === 'singkatanmapel') {
            var sg = record.singkatan || record.sing || record.singkatanMapel;
            if (sg) rawVal = String(sg);
          } else if (cleanH === 'nomodul' || cleanH === 'modul' || cleanH === 'modulno' || cleanH === 'nomodulangka') {
            var nm = record.noModul !== undefined ? record.noModul : (record.noModulAngka !== undefined ? record.noModulAngka : (record.modulNo !== undefined ? record.modulNo : record.modul));
            if (nm !== undefined && nm !== null) rawVal = String(nm);
          } else if (cleanH === 'temamodul' || cleanH === 'namamodulbab' || cleanH === 'namamodullengkap') {
            var tm = record.temaModul || record.namaModulBab || record.namaModulLengkap || record.judulModul;
            if (tm) rawVal = String(tm);
          } else if (cleanH === 'subke' || cleanH === 'nosubmodul' || cleanH === 'submodulke') {
            var sk = record.subKe !== undefined ? record.subKe : (record.noSubModul !== undefined ? record.noSubModul : record.subModulKe);
            if (sk !== undefined && sk !== null) rawVal = String(sk);
          } else if (cleanH === 'kodesubtugas' || cleanH === 'kodesub') {
            var kst = record.kodeSubTugas || record.kodeSub || record.kode;
            if (kst) rawVal = String(kst);
          } else if (cleanH === 'topiksubtugas' || cleanH === 'judulsubmodul' || cleanH === 'topik') {
            var tst = record.topikSubTugas || record.judulSubModul || record.topik || record.judul;
            if (tst) rawVal = String(tst);
          } else if (cleanH === 'kodemodul') {
            var km = record.kodeModul || record.kode || record.id;
            if (km) rawVal = String(km);
          } else if (cleanH === 'judulmodul') {
            var jm = record.judulModul || record.nama || record.temaModul;
            if (jm) rawVal = String(jm);
          } else if (cleanH === 'babunit' || cleanH === 'bab' || cleanH === 'unit') {
            var bu = record.babUnit || record.bab || record.unit;
            if (bu) rawVal = String(bu);
          } else if (cleanH === 'subbab') {
            var sb = record.subBab ? (typeof record.subBab === 'object' ? JSON.stringify(record.subBab) : String(record.subBab)) : '';
            if (sb) rawVal = sb;
          } else if (cleanH === 'materipokok' || cleanH === 'materi') {
            var mpk = record.materiPokok ? (Array.isArray(record.materiPokok) ? record.materiPokok.join(', ') : String(record.materiPokok)) : '';
            if (mpk) rawVal = mpk;
          } else if (cleanH === 'kodepaket') {
            var kp = record.kodePaket || record.paket;
            if (kp) rawVal = String(kp);
          } else if (cleanH === 'taid' || cleanH === 'tahunajaranid' || cleanH === 'idta') {
            var tid = record.TAID || record.taId || record.TahunAjaranID || record.tahunAjaranId || record.id || record.ID;
            if (tid) rawVal = String(tid);
          } else if (cleanH === 'tahunmulai' || cleanH === 'tm') {
            var tmVal = record.TahunMulai || record.tahunMulai || (record.nama && String(record.nama).includes('/') ? String(record.nama).split('/')[0] : '');
            if (tmVal) rawVal = String(tmVal);
          } else if (cleanH === 'tahunselesai' || cleanH === 'ts') {
            var tsVal = record.TahunSelesai || record.tahunSelesai || (record.nama && String(record.nama).includes('/') ? String(record.nama).split('/')[1] : '');
            if (tsVal) rawVal = String(tsVal);
          } else if (cleanH === 'semesterid' || cleanH === 'idsemester') {
            var semIdVal = record.SemesterID || record.semesterId || record.id;
            if (semIdVal) rawVal = String(semIdVal);
          } else if (cleanH === 'tahunpelajaran' || cleanH === 'tahunajaran') {
            var tpVal = record.TahunPelajaran || record.tahunPelajaran || record.tahunAjaran || record.tahun || record.nama;
            if (tpVal) rawVal = String(tpVal);
          } else if (cleanH === 'semester' || cleanH === 'semestertype') {
            var semVal = record.Semester || record.semester || record.semesterType;
            if (semVal) rawVal = String(semVal);
          } else if (cleanH === 'aktif' || cleanH === 'isactive') {
            var akVal = record.Aktif !== undefined ? record.Aktif : (record.aktif !== undefined ? record.aktif : (record.isActive ? 'YA' : (record.status === 'Aktif' ? 'YA' : 'TIDAK')));
            if (akVal !== undefined && akVal !== null) rawVal = String(akVal);
          } else if (cleanH === 'linkgambar' || cleanH === 'gambar' || cleanH === 'urlgambar' || cleanH === 'gambarilustrasiurl' || cleanH === 'imageurl' || cleanH === 'gambarsoal') {
            var gUrl = record.LinkGambar || record['Link Gambar'] || record.GambarIlustrasiUrl || record.GambarUrl || record.gambarUrl || record.linkGambar || record.gambar || record.urlGambar;
            if (gUrl) rawVal = String(gUrl);
          } else if (cleanH === 'kuncijawaban' || cleanH === 'kunci') {
            var kVal = record.KunciJawaban || record.kunci || record.kunciJawaban || record.Kunci;
            if (kVal) rawVal = String(kVal);
          } else if (cleanH === 'pilihan' || cleanH === 'pilihana' || cleanH === 'opsia') {
            var pa = record.PilihanA || record.opsiA || (record.opsi && record.opsi.a) || record.a;
            if (pa) rawVal = String(pa);
          } else if (cleanH === 'pilihanb' || cleanH === 'opsib') {
            var pb = record.PilihanB || record.opsiB || (record.opsi && record.opsi.b) || record.b;
            if (pb) rawVal = String(pb);
          } else if (cleanH === 'pilihanc' || cleanH === 'opsic') {
            var pc = record.PilihanC || record.opsiC || (record.opsi && record.opsi.c) || record.c;
            if (pc) rawVal = String(pc);
          } else if (cleanH === 'pilihand' || cleanH === 'opsid') {
            var pd = record.PilihanD || record.opsiD || (record.opsi && record.opsi.d) || record.d;
            if (pd) rawVal = String(pd);
          } else if (cleanH === 'pilihane' || cleanH === 'opsie') {
            var pe = record.PilihanE || record.opsiE || (record.opsi && record.opsi.e) || record.e;
            if (pe) rawVal = String(pe);
          } else if (cleanH === 'fileurl' || cleanH === 'link' || cleanH === 'linkfile' || cleanH === 'linkmateri' || cleanH === 'linkmodul' || cleanH === 'linkberkas' || cleanH === 'pdfurl' || cleanH === 'pdf' || cleanH === 'tautan' || cleanH === 'url' || cleanH === 'driveurl' || cleanH === 'berkasurl') {
            var fUrl = record.fileUrl || record.FileUrl || record.pdfUrl || record.PdfUrl || record.linkMateri || record.link || record.Link || record.linkFile || record.linkModul || record.directUrl || record.url || record.URL || record.driveUrl || record.tautan;
            if (fUrl) rawVal = String(fUrl);
          } else if (cleanH === 'filename' || cleanH === 'namaberkas' || cleanH === 'namafile' || cleanH === 'judulfile') {
            var fName = record.fileName || record.FileName || record.namaBerkas || record.namaFile || record.judulFile;
            if (fName) rawVal = String(fName);
          }
        }
      }

      if (rawVal === undefined || rawVal === null || rawVal === '') return '';
      var cleanHFinal = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');

      // Standar Dapodik: Kolom RT dan RW hanya berupa nomor/angka murni, tanpa kata 'RT' atau 'RW'
      if (cleanHFinal === 'rt') {
        var rtClean = String(rawVal).replace(/^RT[\s.:]*/i, '').trim();
        var numRt = rtClean.replace(/[^0-9]/g, '');
        return numRt ? (parseInt(numRt, 10) < 10 ? '0' + parseInt(numRt, 10) : numRt) : (rtClean === '-' ? '-' : rtClean);
      }
      if (cleanHFinal === 'rw') {
        var rwClean = String(rawVal).replace(/^RW[\s.:]*/i, '').trim();
        var numRw = rwClean.replace(/[^0-9]/g, '');
        return numRw ? (parseInt(numRw, 10) < 10 ? '0' + parseInt(numRw, 10) : numRw) : (rwClean === '-' ? '-' : rwClean);
      }

      var str = String(rawVal).trim();

      // Protected Identifiers: NISN, NIS, NIK, NIP, SiswaID, GuruID, UserID, OrtuID, YatimID, NoPDKT, NoKK, NoKTP, NoHP, Telepon, Phone, Telp, NoIjazah, RekapID, AbsenID, etc.
      // ALWAYS format with leading apostrophe ' to guarantee Google Sheets treats it as plain text and never strips leading zeroes!
      var isProtectedId = (
        cleanHFinal.indexOf('nisn') !== -1 ||
        cleanHFinal === 'nis' ||
        cleanHFinal === 'nik' ||
        cleanHFinal === 'nip' ||
        cleanHFinal.indexOf('siswaid') !== -1 ||
        cleanHFinal.indexOf('idsiswa') !== -1 ||
        cleanHFinal.indexOf('guruid') !== -1 ||
        cleanHFinal.indexOf('idguru') !== -1 ||
        cleanHFinal.indexOf('userid') !== -1 ||
        cleanHFinal.indexOf('iduser') !== -1 ||
        cleanHFinal.indexOf('ortuid') !== -1 ||
        cleanHFinal.indexOf('yatimid') !== -1 ||
        cleanHFinal.indexOf('nopdkt') !== -1 ||
        cleanHFinal.indexOf('nokk') !== -1 ||
        cleanHFinal.indexOf('noktp') !== -1 ||
        cleanHFinal.indexOf('nohp') !== -1 ||
        cleanHFinal.indexOf('telepon') !== -1 ||
        cleanHFinal.indexOf('phone') !== -1 ||
        cleanHFinal.indexOf('telp') !== -1 ||
        cleanHFinal.indexOf('noijazah') !== -1 ||
        cleanHFinal.indexOf('noregistrasi') !== -1 ||
        cleanHFinal.indexOf('nipnisn') !== -1 ||
        cleanHFinal.indexOf('nisnnip') !== -1 ||
        cleanHFinal.indexOf('rekapid') !== -1 ||
        cleanHFinal.indexOf('absenid') !== -1 ||
        cleanHFinal.indexOf('presensiid') !== -1 ||
        cleanHFinal.indexOf('tagihanid') !== -1 ||
        cleanHFinal.indexOf('pembayaranid') !== -1 ||
        cleanHFinal.indexOf('transaksiid') !== -1 ||
        cleanHFinal.indexOf('rekening') !== -1
      );

      if (isProtectedId && str && str !== '-') {
        return str.startsWith("'") ? str : ("'" + str);
      }

      return str;
    }

    if (action === 'SYNC_SHEET') {
      var sheetName = params.sheetName || params.sheet || params.table;
      var dataJson = params.data || params.records;
      if (!dataJson && params.dataJson) {
        try {
          dataJson = typeof params.dataJson === 'string' ? JSON.parse(params.dataJson) : params.dataJson;
        } catch (eParse) {
          dataJson = [];
        }
      }
      if (!Array.isArray(dataJson) || dataJson.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'skipped', 
          success: true, 
          message: 'Data kosong diabaikan untuk melindungi sheet ' + sheetName + ' dari penghapusan tidak disengaja.' 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      
      var lastCol = sheet.getLastColumn();
      var lastRow = sheet.getLastRow();
      
      // If append mode is not requested, preserve existing link cells before clearing
      var isAppend = params.append === true || params.isAppend === true;
      var existingRows = (!isAppend && lastRow > 1 && lastCol > 0) ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
      var existingHeaders = existingRows.length > 0 ? existingRows[0] : [];

      // Circuit Breaker Anti-Hapus: Jangan timpa jika data baru berkurang drastis (>15 baris)
      if (!isAppend && lastRow > 15 && dataJson.length < (lastRow - 1) * 0.2 && !params.forceTruncate) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'skipped', 
          success: false, 
          message: 'Proteksi Anti-Hapus Aktif: Data baru (' + dataJson.length + ') jauh lebih sedikit dibanding data sheet ' + sheetName + ' (' + (lastRow - 1) + ' baris). Operasi penimpaan ditolak demi keamanan.' 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Check or initialize headers
      var schemas = ${JSON.stringify(OFFICIAL_88_SCHEMAS.map(s => ({ name: s.name, headers: s.headers })))};
      var targetSchema = schemas.find(function(s) { return s.name.toUpperCase() === sheetName.toUpperCase(); });

      if (lastCol === 0 || lastRow === 0) {
        var defaultHeaders = targetSchema ? targetSchema.headers : Object.keys(dataJson[0]);
        sheet.appendRow(defaultHeaders);
        sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
        sheet.setFrozenRows(1);
      }

      lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

      // Auto expand missing headers if dataJson has new fields (e.g. fileUrl, fileName)
      if (lastCol > 0 && headers.length > 0 && dataJson.length > 0 && typeof dataJson[0] === 'object') {
        var existingHeadersUpper = headers.map(function(h) { return String(h || '').toUpperCase().trim(); });
        var missingKeys = Object.keys(dataJson[0]).filter(function(k) {
          return existingHeadersUpper.indexOf(String(k).toUpperCase().trim()) === -1;
        });
        if (missingKeys.length > 0) {
          var startCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, startCol, 1, missingKeys.length).setValues([missingKeys]);
          sheet.getRange(1, startCol, 1, missingKeys.length)
            .setFontWeight('bold')
            .setBackground('#1e293b')
            .setFontColor('#ffffff');
          headers = headers.concat(missingKeys);
        }
      }

      var rowsToAppend = dataJson.map(function(rowObj, rIdx) {
        return headers.map(function(h) {
          var val = resolveRowValue(rowObj, h);
          // Link Preservation Protection: jika nilai baru kosong, tetapi kolom adalah tautan berkas dan data sheet sebelumnya sudah memiliki tautan URL, pertahankan tautan lama!
          var cleanH = String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          var isLinkCol = cleanH === 'fileurl' || cleanH === 'link' || cleanH === 'pdfurl' || cleanH === 'url' || cleanH === 'driveurl' || cleanH === 'tautan' || cleanH === 'linkmodul' || cleanH === 'linkfile' || cleanH === 'linkberkas';
          if (!val && isLinkCol && existingRows.length > (rIdx + 1)) {
            var origColIdx = -1;
            for (var ec = 0; ec < existingHeaders.length; ec++) {
              if (String(existingHeaders[ec] || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH) {
                origColIdx = ec;
                break;
              }
            }
            if (origColIdx !== -1) {
              var oldVal = existingRows[rIdx + 1][origColIdx];
              if (oldVal && String(oldVal).trim()) {
                val = String(oldVal).trim();
              }
            }
          }
          return val;
        });
      });

      var startRow = isAppend ? (sheet.getLastRow() + 1) : 2;
      var rangeToSet = sheet.getRange(startRow, 1, rowsToAppend.length, headers.length);
      var formatsSync = [];
      for (var fsR = 0; fsR < rowsToAppend.length; fsR++) {
        var rowF = [];
        for (var fsC = 0; fsC < headers.length; fsC++) {
          rowF.push('@');
        }
        formatsSync.push(rowF);
      }
      rangeToSet.setNumberFormats(formatsSync);
      rangeToSet.setValues(rowsToAppend);

      // HANYA bersihkan baris sisa di bawah jika data lama lebih panjang daripada data baru
      if (!isAppend && lastRow > (startRow + rowsToAppend.length - 1)) {
        sheet.getRange(startRow + rowsToAppend.length, 1, lastRow - (startRow + rowsToAppend.length - 1), headers.length).clearContent();
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        success: true, 
        message: 'Sheet ' + sheetName + ' berhasil disinkronkan aman (' + dataJson.length + ' baris)' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'MASS_SYNC_ALL') {
      var allDataObj = JSON.parse(params.allDataJson || '{}');
      var ss = getSpreadsheet();
      var totalSynced = 0;

      Object.keys(allDataObj).forEach(function(sName) {
        var rows = allDataObj[sName];
        if (!Array.isArray(rows) || rows.length === 0) return; // Strict data loss prevention: do not clear sheets if array is empty!
        var sheet = ss.getSheetByName(sName);
        if (!sheet) sheet = ss.insertSheet(sName);

        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        var existingRowsMass = (lastRow > 1 && lastCol > 0) ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
        var existingHeadersMass = existingRowsMass.length > 0 ? existingRowsMass[0] : [];

        // Proteksi Anti-Hapus: lewati sheet jika data yang dikirim berkurang drastis
        if (lastRow > 15 && rows.length < (lastRow - 1) * 0.2 && !params.forceTruncate) {
          return;
        }

        var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
        if (!headers || headers.length === 0 || !headers[0]) {
          headers = Object.keys(rows[0]);
          sheet.appendRow(headers);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
          sheet.setFrozenRows(1);
        } else if (rows.length > 0 && typeof rows[0] === 'object') {
          var existingHeadersUpper = headers.map(function(h) { return String(h || '').toUpperCase().trim(); });
          var missingKeys = Object.keys(rows[0]).filter(function(k) {
            return existingHeadersUpper.indexOf(String(k).toUpperCase().trim()) === -1;
          });
          if (missingKeys.length > 0) {
            var startCol = sheet.getLastColumn() + 1;
            sheet.getRange(1, startCol, 1, missingKeys.length).setValues([missingKeys]);
            sheet.getRange(1, startCol, 1, missingKeys.length)
              .setFontWeight('bold')
              .setBackground('#1e293b')
              .setFontColor('#ffffff');
            headers = headers.concat(missingKeys);
          }
        }

        var rowMatrix = rows.map(function(r, rIdx) {
          return headers.map(function(h) {
            var val = resolveRowValue(r, h);
            // Link Preservation Protection
            var cleanH = String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            var isLinkCol = cleanH === 'fileurl' || cleanH === 'link' || cleanH === 'pdfurl' || cleanH === 'url' || cleanH === 'driveurl' || cleanH === 'tautan' || cleanH === 'linkmodul' || cleanH === 'linkfile' || cleanH === 'linkberkas';
            if (!val && isLinkCol && existingRowsMass.length > (rIdx + 1)) {
              var origColIdx = -1;
              for (var ec = 0; ec < existingHeadersMass.length; ec++) {
                if (String(existingHeadersMass[ec] || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH) {
                  origColIdx = ec;
                  break;
                }
              }
              if (origColIdx !== -1) {
                var oldVal = existingRowsMass[rIdx + 1][origColIdx];
                if (oldVal && String(oldVal).trim()) {
                  val = String(oldVal).trim();
                }
              }
            }
            return val;
          });
        });

        // Set number format '@' (Plain Text) to prevent leading zeros from being stripped by Google Sheets
        var targetRange = sheet.getRange(2, 1, rowMatrix.length, headers.length);
        var formats = [];
        for (var fRow = 0; fRow < rowMatrix.length; fRow++) {
          var rowFormats = [];
          for (var fCol = 0; fCol < headers.length; fCol++) {
            var headName = String(headers[fCol] || '').toUpperCase();
            if (headName.indexOf('NISN') !== -1 || headName.indexOf('NIS') !== -1 || headName.indexOf('NIK') !== -1 || headName.indexOf('NIP') !== -1 || headName.indexOf('NO') !== -1 || headName.indexOf('ID') !== -1 || headName.indexOf('TEL') !== -1 || headName.indexOf('HP') !== -1) {
              rowFormats.push('@');
            } else {
              rowFormats.push('@');
            }
          }
          formats.push(rowFormats);
        }
        targetRange.setNumberFormats(formats);
        targetRange.setValues(rowMatrix);

        // HANYA bersihkan baris berlebih di bawahnya
        if (lastRow > (1 + rowMatrix.length)) {
          sheet.getRange(2 + rowMatrix.length, 1, lastRow - (1 + rowMatrix.length), headers.length).clearContent();
        }

        totalSynced++;
      });

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: totalSynced + ' Sheet Master Database berhasil disinkronkan massal aman!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'syncTable' || action === 'syncData' || action === 'SYNC_DATA' || action === 'SYNC_TABLE' || action === 'SAVE_SETTING') {
      var sTableName = params.table || params.sheetName || 'SETTING';
      var sRecords = params.data || params.records || [];
      if (typeof sRecords === 'string') {
        try { sRecords = JSON.parse(sRecords); } catch (e) { sRecords = []; }
      }
      var ssTable = getSpreadsheet(params.spreadsheetId || params.ssId);
      if (!ssTable) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'Spreadsheet tidak dapat dibuka. Pastikan ID Spreadsheet valid dan izin otorisasi telah diberikan: ' + (params.spreadsheetId || SPREADSHEET_ID)
        })).setMimeType(ContentService.MimeType.JSON);
      }
      if (!Array.isArray(sRecords) || sRecords.length === 0) {
        if (params.forceTruncate) {
          var sheetToTruncate = ssTable.getSheetByName(sTableName);
          if (sheetToTruncate && sheetToTruncate.getLastRow() > 1) {
            sheetToTruncate.getRange(2, 1, sheetToTruncate.getLastRow() - 1, sheetToTruncate.getLastColumn()).clearContent();
            return ContentService.createTextOutput(JSON.stringify({
              status: 'success',
              success: true,
              message: 'Tabel ' + sTableName + ' berhasil dikosongkan (forceTruncate aktif).'
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        return ContentService.createTextOutput(JSON.stringify({
          status: 'skipped',
          success: true,
          message: 'Tabel ' + sTableName + ' dipertahankan (data kiriman kosong).'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var targetSheet = ssTable.getSheetByName(sTableName);
      if (!targetSheet) {
        targetSheet = ssTable.insertSheet(sTableName);
      }
      var sHeaders = targetSheet.getLastColumn() > 0 ? targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0] : [];
      if (!sHeaders || sHeaders.length === 0 || !sHeaders[0]) {
        if (sTableName === 'SETTING') {
          sHeaders = ['Key', 'Value', 'Deskripsi', 'Kategori', 'UpdatedAt'];
        } else {
          sHeaders = Object.keys(sRecords[0]);
        }
        targetSheet.appendRow(sHeaders);
        targetSheet.getRange(1, 1, 1, sHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
        targetSheet.setFrozenRows(1);
      } else if (sRecords.length > 0 && typeof sRecords[0] === 'object') {
        // Otomatis tambahkan kolom header baru hanya jika sheet bukan sheet master inti terproteksi
        var protectedMasterSheets = ['BIAYA', 'SISWA', 'GURU', 'KELAS', 'MAPEL', 'JURUSAN', 'TAHUNAJARAN', 'SEMESTER', 'TAGIHAN', 'PEMBAYARAN', 'TABUNGAN', 'KAS'];
        if (protectedMasterSheets.indexOf(sTableName) === -1) {
          var existingHeadersUpper = sHeaders.map(function(h) { return String(h || '').toUpperCase().trim(); });
          var missingKeys = Object.keys(sRecords[0]).filter(function(k) {
            var cleanKey = String(k).toUpperCase().trim();
            return existingHeadersUpper.indexOf(cleanKey) === -1;
          });
          if (missingKeys.length > 0) {
            var startCol = targetSheet.getLastColumn() + 1;
            targetSheet.getRange(1, startCol, 1, missingKeys.length).setValues([missingKeys]);
            targetSheet.getRange(1, startCol, 1, missingKeys.length)
              .setFontWeight('bold')
              .setBackground('#1e293b')
              .setFontColor('#ffffff');
            sHeaders = sHeaders.concat(missingKeys);
          }
        }
      }

      var lastR = targetSheet.getLastRow();

      // Proteksi Anti-Hapus Massal
      if (lastR > 15 && sRecords.length < (lastR - 1) * 0.2 && !params.forceTruncate) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'skipped',
          success: false,
          message: 'Proteksi Anti-Hapus Aktif: Data baru (' + sRecords.length + ') jauh lebih sedikit dibanding data lama di sheet ' + sTableName + ' (' + (lastR - 1) + ' baris). Operasi dibatalkan demi keamanan.'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var rowsData = sRecords.map(function(item) {
        return sHeaders.map(function(h) {
          return resolveRowValue(item, h);
        });
      });
      var targetRangeTable = targetSheet.getRange(2, 1, rowsData.length, sHeaders.length);
      var tableFormats = [];
      for (var tfr = 0; tfr < rowsData.length; tfr++) {
        var tfRow = [];
        for (var tfc = 0; tfc < sHeaders.length; tfc++) {
          var cleanHCol = String(sHeaders[tfc] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanHCol === 'nominal' || cleanHCol === 'jumlah' || cleanHCol === 'total' || cleanHCol === 'tarif' || cleanHCol === 'debit' || cleanHCol === 'kredit' || cleanHCol === 'totalbayar' || cleanHCol === 'sisatagihan' || cleanHCol === 'diskon' || cleanHCol === 'denda' || cleanHCol === 'paidamount') {
            tfRow.push('#,##0');
          } else {
            tfRow.push('@');
          }
        }
        tableFormats.push(tfRow);
      }
      targetRangeTable.setNumberFormats(tableFormats);
      targetRangeTable.setValues(rowsData);

      // HANYA bersihkan baris sisa di bawahnya jika data lama lebih banyak dari data baru
      if (lastR > (1 + rowsData.length)) {
        targetSheet.getRange(2 + rowsData.length, 1, lastR - (1 + rowsData.length), sHeaders.length).clearContent();
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        message: 'Tabel ' + sTableName + ' berhasil disimpan & disinkronkan aman (' + sRecords.length + ' baris)!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'setup' || action === 'setupDatabase' || action === 'setupMasterDatabase' || action === 'initialize88SheetsDatabase' || action === 'initialize84SheetsDatabase' || action === 'initDatabase') {
      var setupPostRes = initialize88SheetsDatabase();
      return ContentService.createTextOutput(JSON.stringify(setupPostRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'setupDriveFolders' || action === 'setupFolders') {
      var folderPostRes = setupDriveFolders(params);
      return ContentService.createTextOutput(JSON.stringify(folderPostRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'AUTO_POPULATE_ORTU_YATIM') {
      var syncResult = autoPopulateOrangTuaAndYatimFromSiswa();
      return ContentService.createTextOutput(JSON.stringify(syncResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'upload' || action === 'UPLOAD' || action === 'uploadFile') {
      var b64 = params.base64 || params.file || '';
      var fname = params.filename || params.fileName || ('berkas_' + new Date().getTime() + '.png');
      var mtype = params.mimeType || 'image/png';
      var fId = params.folderId || '';
      var targetFolder = null;
      try {
        if (fId && String(fId).trim().length >= 20) {
          targetFolder = DriveApp.getFolderById(String(fId).trim());
        }
      } catch(e) {}
      if (!targetFolder) {
        var fName = params.folderName || '09_CBT_BANK_SOAL_DAN_ASESMEN';
        var fItr = DriveApp.getFoldersByName(fName);
        if (fItr.hasNext()) {
          targetFolder = fItr.next();
        } else {
          targetFolder = DriveApp.createFolder(fName);
          try { targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
        }
      }
      var decodedBytes = Utilities.base64Decode(b64);
      var blobObj = Utilities.newBlob(decodedBytes, mtype, fname);
      var createdFile = targetFolder.createFile(blobObj);
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(e) {}
      var fIdCreated = createdFile.getId();
      var directUc = 'https://drive.google.com/uc?export=view&id=' + fIdCreated;
      var directLh3 = 'https://lh3.googleusercontent.com/d/' + fIdCreated;
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        url: directUc,
        directUrl: directLh3,
        viewUrl: directUc,
        fileId: fIdCreated,
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'LIST_DRIVE_FILES' || action === 'SCAN_DRIVE_FOLDER' || action === 'listDriveFiles' || action === 'scanDriveFolder' || action === 'getDriveFiles' || action === 'LIST_FILES' || action === 'GET_DRIVE_FILES' || action === 'SCAN_FOLDER') {
      var scanFolderIdPost = params.folderId || '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';
      var scanFolderNamePost = params.folderName || '11_MATERI_DAN_MODUL_DIGITAL';
      var sFolderPost = null;
      try {
        if (scanFolderIdPost && String(scanFolderIdPost).trim().length >= 20) {
          sFolderPost = DriveApp.getFolderById(String(scanFolderIdPost).trim());
        }
      } catch(e) {}
      if (!sFolderPost) {
        try {
          var sItrPost = DriveApp.getFoldersByName(scanFolderNamePost);
          if (sItrPost.hasNext()) sFolderPost = sItrPost.next();
        } catch(e) {}
      }
      if (!sFolderPost) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'Folder Google Drive tidak ditemukan.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var fListPost = [];

      function collectFilesRecursivelyPost(folder, currentPath, depth) {
        if (!folder || depth > 3 || fListPost.length >= 150) return;
        try {
          var curFolderName = folder.getName();
          var files = folder.getFiles();
          while (files.hasNext()) {
            if (fListPost.length >= 150) return;
            var f = files.next();
            var fid = f.getId();
            var fname = f.getName();
            var fMime = 'application/pdf';
            try { fMime = f.getMimeType(); } catch(e) {}
            var fSize = 0;
            try { fSize = f.getSize(); } catch(e) {}
            fListPost.push({
              id: fid,
              name: fname,
              path: currentPath ? currentPath + ' / ' + fname : fname,
              folderName: curFolderName,
              mimeType: fMime,
              size: fSize,
              url: 'https://drive.google.com/file/d/' + fid + '/view?usp=sharing',
              directUrl: 'https://drive.google.com/uc?export=download&id=' + fid,
              updated: ''
            });
          }
          var subFolders = folder.getFolders();
          while (subFolders.hasNext()) {
            if (fListPost.length >= 150) return;
            var sub = subFolders.next();
            var subPath = currentPath ? currentPath + ' / ' + sub.getName() : sub.getName();
            collectFilesRecursivelyPost(sub, subPath, depth + 1);
          }
        } catch(errF) {}
      }

      collectFilesRecursivelyPost(sFolderPost, '', 0);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        success: true,
        folderId: sFolderPost.getId(),
        folderName: sFolderPost.getName(),
        folderUrl: sFolderPost.getUrl(),
        count: fListPost.length,
        files: fListPost
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'RENAME_DRIVE_FILE' || action === 'renameDriveFile' || action === 'RENAME_FILE' || action === 'renameFile') {
      var fileIdRenPost = params.fileId || params.id;
      var newNameRenPost = params.newName || params.name || params.fileName;
      if (!fileIdRenPost && params.url) {
        var matchIdPost = String(params.url).match(/[-\w]{25,}/);
        if (matchIdPost) fileIdRenPost = matchIdPost[0];
      }
      if (!fileIdRenPost || !newNameRenPost) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'ID Berkas (fileId) dan Nama Baru (newName) wajib diisi untuk mengubah nama di Google Drive.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      try {
        var targetFileRenPost = DriveApp.getFileById(String(fileIdRenPost).trim());
        var oldNameRenPost = targetFileRenPost.getName();
        targetFileRenPost.setName(String(newNameRenPost).trim());
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          success: true,
          fileId: fileIdRenPost,
          oldName: oldNameRenPost,
          newName: String(newNameRenPost).trim(),
          url: targetFileRenPost.getUrl(),
          message: 'Nama berkas fisik di Google Drive berhasil diubah dari "' + oldNameRenPost + '" menjadi "' + newNameRenPost + '".'
        })).setMimeType(ContentService.MimeType.JSON);
      } catch(errRenPost) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'Gagal mengubah nama berkas di Google Drive: ' + errRenPost.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'GET_DRIVE_FILE_INFO' || action === 'getDriveFileInfo' || action === 'GET_FILE_INFO' || action === 'getFileInfo') {
      var fileIdInfoPost = params.fileId || params.id;
      if (!fileIdInfoPost && params.url) {
        var matchInfoPost = String(params.url).match(/[-\w]{25,}/);
        if (matchInfoPost) fileIdInfoPost = matchInfoPost[0];
      }
      if (!fileIdInfoPost) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'fileId atau url tidak valid.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      try {
        var fileInfoObjPost = DriveApp.getFileById(String(fileIdInfoPost).trim());
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          success: true,
          fileId: fileInfoObjPost.getId(),
          id: fileInfoObjPost.getId(),
          name: fileInfoObjPost.getName(),
          fileName: fileInfoObjPost.getName(),
          mimeType: fileInfoObjPost.getMimeType(),
          size: fileInfoObjPost.getSize(),
          url: fileInfoObjPost.getUrl()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch(errInfoPost) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          success: false,
          message: 'Gagal mengambil info berkas Google Drive: ' + errInfoPost.toString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch(eRel) {}
    }
  }
}

/**
 * Otomatisasi Ekstraksi & Sinkronisasi Sheet ORANG_TUA dan YATIM_PIATU dari Data SISWA
 */
function autoPopulateOrangTuaAndYatimFromSiswa() {
  try {
    var ss = getSpreadsheet();
    var sheetSiswa = ss.getSheetByName('SISWA');
    if (!sheetSiswa) {
      return { status: 'error', message: 'Sheet SISWA belum tersedia' };
    }

    var sDataRange = sheetSiswa.getDataRange();
    var siswaValues = sDataRange.getValues();
    var siswaDisplayValues = sDataRange.getDisplayValues();
    if (siswaValues.length <= 1) {
      return { status: 'error', message: 'Sheet SISWA masih kosong' };
    }

    var sHeaders = siswaValues[0];
    var colMap = {};
    sHeaders.forEach(function(h, idx) {
      colMap[String(h).toLowerCase().trim()] = idx;
    });

    function formatDateClean(val, displayVal) {
      if (displayVal && typeof displayVal === 'string' && displayVal.trim() !== '') {
        var dStr = displayVal.trim();
        if (!dStr.includes('GMT') && !dStr.includes('00:00:00')) {
          return dStr;
        }
      }
      if (val instanceof Date && !isNaN(val.getTime())) {
        var y = val.getFullYear();
        if (y === 1970 && val.getMonth() === 0 && val.getDate() === 1) return '-';
        var m = String(val.getMonth() + 1).padStart(2, '0');
        var d = String(val.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
      }
      if (typeof val === 'string' && (val.includes('GMT') || val.includes('Western Indonesia Time'))) {
        var parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          var py = parsed.getFullYear();
          if (py === 1970 && parsed.getMonth() === 0 && parsed.getDate() === 1) return '-';
          var pm = String(parsed.getMonth() + 1).padStart(2, '0');
          var pd = String(parsed.getDate()).padStart(2, '0');
          return py + '-' + pm + '-' + pd;
        }
      }
      return val !== undefined && val !== null ? String(val).trim() : '';
    }

    function getVal(row, rowIdx, possibleKeys) {
      for (var i = 0; i < possibleKeys.length; i++) {
        var k = possibleKeys[i].toLowerCase();
        if (colMap.hasOwnProperty(k)) {
          var colIdx = colMap[k];
          var rawVal = row[colIdx];
          var dispVal = (siswaDisplayValues && siswaDisplayValues[rowIdx]) ? siswaDisplayValues[rowIdx][colIdx] : '';

          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            if (k.includes('tgl') || k.includes('tanggal') || k.includes('lahir') || k.includes('date')) {
              var formattedDate = formatDateClean(rawVal, dispVal);
              if (formattedDate) return formattedDate;
            }
            if (dispVal && typeof dispVal === 'string' && dispVal.trim() !== '') {
              return dispVal.trim();
            }
            return String(rawVal).trim();
          }
        }
      }
      return '';
    }

    var ortuRows = [];
    var yatimRows = [];
    var ortuCounter = 1;
    var yatimCounter = 1;

    for (var r = 1; r < siswaValues.length; r++) {
      var row = siswaValues[r];
      var siswaId = getVal(row, r, ['siswai', 'id', 'nopdkt', 'nisn', 'nis', 'no']);
      var namaSiswa = getVal(row, r, ['namalengkap', 'namasiswa', 'nama']);
      if (!namaSiswa && !siswaId) continue;

      var kelas = getVal(row, r, ['kelas', 'rombel', 'tingkat']);
      var nisn = getVal(row, r, ['nisn', 'nis']);
      var jalan = getVal(row, r, ['alamat', 'alamatdomisili', 'tempattinggal', 'jalan', 'dusun']);
      var rtVal = getVal(row, r, ['rt']);
      var rwVal = getVal(row, r, ['rw']);
      var kelVal = getVal(row, r, ['kelurahan', 'desa', 'kel']);
      var kecVal = getVal(row, r, ['kecamatan', 'kec']);
      var kotaVal = getVal(row, r, ['kota', 'kabupaten', 'kotakab']);
      var posVal = getVal(row, r, ['kodepos']);

      var addrParts = [];
      if (jalan && jalan !== '-') addrParts.push(jalan);
      var cleanRtVal = rtVal && rtVal !== '-' ? String(rtVal).replace(/^RT[\s.:]*/i, '').trim() : '';
      var cleanRwVal = rwVal && rwVal !== '-' ? String(rwVal).replace(/^RW[\s.:]*/i, '').trim() : '';
      if (cleanRtVal && cleanRwVal) addrParts.push('RT ' + cleanRtVal + '/RW ' + cleanRwVal);
      else if (cleanRtVal) addrParts.push('RT ' + cleanRtVal);
      else if (cleanRwVal) addrParts.push('RW ' + cleanRwVal);

      if (kelVal && kelVal !== '-') {
        addrParts.push(kelVal.toLowerCase().indexOf('kel') === 0 || kelVal.toLowerCase().indexOf('desa') === 0 ? kelVal : ('Kel. ' + kelVal));
      }
      if (kecVal && kecVal !== '-') {
        addrParts.push(kecVal.toLowerCase().indexOf('kec') === 0 ? kecVal : ('Kec. ' + kecVal));
      }
      if (kotaVal && kotaVal !== '-') addrParts.push(kotaVal);
      if (posVal && posVal !== '-') addrParts.push(posVal);

      var alamat = addrParts.length > 0 ? addrParts.join(', ') : (jalan || '-');

      var namaAyah = getVal(row, r, ['namaayah', 'ayah', 'fathername']);
      var statusAyah = getVal(row, r, ['statusayah', 'kondisiayah']) || 'Masih Hidup';
      var nikAyah = getVal(row, r, ['nikayah', 'nik_ayah']);
      var tempatLahirAyah = getVal(row, r, ['tempatlahirayah', 'tmplahirayah']);
      var tglLahirAyah = getVal(row, r, ['tanggallahirayah', 'tgllahirayah']);
      var pendidikanAyah = getVal(row, r, ['pendidikanayah', 'pendidikanterakhirayah']);
      var jobAyah = getVal(row, r, ['pekerjaanayah', 'jobayah', 'fatherjob']);
      var penghasilanAyah = getVal(row, r, ['penghasilanayah', 'gajiayah', 'incomereportayah']);
      var phoneAyah = getVal(row, r, ['nohpayah', 'tlpayah', 'no_hp_ayah', 'nohp', 'telepon', 'phone']);

      var namaIbu = getVal(row, r, ['namaibu', 'ibu', 'NamaIbu']);
      var statusIbu = getVal(row, r, ['statusibu', 'kondisiibu']) || 'Masih Hidup';
      var nikIbu = getVal(row, r, ['nikibu', 'nik_ibu']);
      var tempatLahirIbu = getVal(row, r, ['tempatlahiribu', 'tmplahiribu']);
      var tglLahirIbu = getVal(row, r, ['tanggallahiribu', 'tgllahiribu']);
      var pendidikanIbu = getVal(row, r, ['pendidikanibu', 'pendidikanterakhiribu']);
      var jobIbu = getVal(row, r, ['pekerjaanibu', 'jobibu', 'motherjob']);
      var penghasilanIbu = getVal(row, r, ['penghasilanibu', 'gajiibu']);
      var phoneIbu = getVal(row, r, ['nohpibu', 'tlpibu', 'no_hp_ibu', 'nohp', 'telepon', 'phone']);

      var namaWali = getVal(row, r, ['namawali', 'wali', 'parentname']);
      var hubWali = getVal(row, r, ['hubunganwali', 'statuswali']) || 'Wali Murid';
      var nikWali = getVal(row, r, ['nikwali', 'nik_wali']);
      var tempatLahirWali = getVal(row, r, ['tempatlahirwali', 'tmplahirwali']);
      var tglLahirWali = getVal(row, r, ['tanggallahirwali', 'tgllahirwali']);
      var pendidikanWali = getVal(row, r, ['pendidikanwali', 'pendidikanterakhirwali']);
      var jobWali = getVal(row, r, ['pekerjaanwali', 'jobwali']);
      var penghasilanWali = getVal(row, r, ['penghasilanwali', 'gajiwali']);
      var phoneWali = getVal(row, r, ['nohpwali', 'tlpwali', 'parentphone', 'nohp', 'telepon']);
      var statusWali = getVal(row, r, ['statuswali', 'kondisiwali']) || 'Masih Hidup';

      var rawYatim = getVal(row, r, ['statusyatim', 'yatim', 'piatu', 'kondisiortu']).toLowerCase();
      var kpsPip = getVal(row, r, ['penerimakps', 'penerimapip', 'kip', 'kps', 'pip', 'kps_pip']);
      var nowIso = new Date().toISOString();
      var cleanNisn = nisn ? (String(nisn).startsWith("'") ? String(nisn) : "'" + String(nisn)) : '-';
      var cleanSiswaId = siswaId ? (String(siswaId).startsWith("'") ? String(siswaId) : "'" + String(siswaId)) : ('SISWA-' + r);

      // 1. Ekstraksi Baris ORANG_TUA (17 Kolom)
      // Headers: ["OrtuID", "SiswaID", "NamaSiswa", "NISN", "Hubungan", "Nama", "NIK", "TempatLahir", "TanggalLahir", "Pendidikan", "Pekerjaan", "Penghasilan", "NoHP", "Alamat", "StatusHidup", "CreatedAt", "UpdatedAt"]
      if (namaAyah) {
        ortuRows.push([
          'ORTU-' + String(ortuCounter++).padStart(4, '0'),
          cleanSiswaId,
          namaSiswa || '-',
          cleanNisn,
          'Ayah Kandung',
          namaAyah,
          nikAyah ? (String(nikAyah).startsWith("'") ? String(nikAyah) : "'" + String(nikAyah)) : '-',
          tempatLahirAyah || '-',
          tglLahirAyah || '-',
          pendidikanAyah || '-',
          jobAyah || '-',
          penghasilanAyah || '-',
          phoneAyah ? (String(phoneAyah).startsWith("'") ? String(phoneAyah) : "'" + String(phoneAyah)) : '-',
          alamat || '-',
          statusAyah || 'Masih Hidup',
          nowIso,
          nowIso
        ]);
      }
      if (namaIbu) {
        ortuRows.push([
          'ORTU-' + String(ortuCounter++).padStart(4, '0'),
          cleanSiswaId,
          namaSiswa || '-',
          cleanNisn,
          'Ibu Kandung',
          namaIbu,
          nikIbu ? (String(nikIbu).startsWith("'") ? String(nikIbu) : "'" + String(nikIbu)) : '-',
          tempatLahirIbu || '-',
          tglLahirIbu || '-',
          pendidikanIbu || '-',
          jobIbu || '-',
          penghasilanIbu || '-',
          phoneIbu ? (String(phoneIbu).startsWith("'") ? String(phoneIbu) : "'" + String(phoneIbu)) : '-',
          alamat || '-',
          statusIbu || 'Masih Hidup',
          nowIso,
          nowIso
        ]);
      }
      if (namaWali && namaWali !== namaAyah && namaWali !== namaIbu) {
        ortuRows.push([
          'ORTU-' + String(ortuCounter++).padStart(4, '0'),
          cleanSiswaId,
          namaSiswa || '-',
          cleanNisn,
          hubWali || 'Wali Murid',
          namaWali,
          nikWali ? (String(nikWali).startsWith("'") ? String(nikWali) : "'" + String(nikWali)) : '-',
          tempatLahirWali || '-',
          tglLahirWali || '-',
          pendidikanWali || '-',
          jobWali || '-',
          penghasilanWali || '-',
          phoneWali ? (String(phoneWali).startsWith("'") ? String(phoneWali) : "'" + String(phoneWali)) : '-',
          alamat || '-',
          statusWali || 'Masih Hidup',
          nowIso,
          nowIso
        ]);
      }
      if (!namaAyah && !namaIbu && !namaWali) {
        var pName = getVal(row, ['parentname', 'orangtua', 'namaortu']) || 'Orang Tua Siswa';
        ortuRows.push([
          'ORTU-' + String(ortuCounter++).padStart(4, '0'),
          cleanSiswaId,
          namaSiswa || '-',
          cleanNisn,
          'Orang Tua / Wali',
          pName,
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          (phoneAyah || phoneIbu || phoneWali) ? "'" + (phoneAyah || phoneIbu || phoneWali) : '-',
          alamat || '-',
          'Masih Hidup',
          nowIso,
          nowIso
        ]);
      }

      // 2. Ekstraksi Data YATIM_PIATU (HANYA UNTUK SISWA AKTIF - SISWA TIDAK AKTIF DILARANG DIHITUNG)
      var rawStatusSiswa = getVal(row, r, ['status', 'statussiswa', 'status_siswa', 'statusaktif']) || 'Aktif';
      var cleanStatusSiswa = String(rawStatusSiswa).toLowerCase().trim();
      var isSiswaInactive = cleanStatusSiswa.indexOf('tidak') !== -1 || 
                           cleanStatusSiswa.indexOf('non') !== -1 || 
                           cleanStatusSiswa.indexOf('pindah') !== -1 || 
                           cleanStatusSiswa.indexOf('mutasi') !== -1 || 
                           cleanStatusSiswa.indexOf('lulus') !== -1 || 
                           cleanStatusSiswa.indexOf('alumni') !== -1 || 
                           cleanStatusSiswa.indexOf('keluar') !== -1 || 
                           cleanStatusSiswa.indexOf('do') !== -1 ||
                           cleanStatusSiswa.indexOf('drop') !== -1;

      if (!isSiswaInactive) {
        var isAyahDead = statusAyah.toLowerCase().indexOf('meninggal') !== -1 || statusAyah.toLowerCase().indexOf('almarhum') !== -1 || statusAyah.toLowerCase().indexOf('wafat') !== -1;
        var isIbuDead = statusIbu.toLowerCase().indexOf('meninggal') !== -1 || statusIbu.toLowerCase().indexOf('almarhumah') !== -1 || statusIbu.toLowerCase().indexOf('wafat') !== -1;
        
        var calculatedYatim = 'Lengkap';
        if (rawYatim.indexOf('yatim piatu') !== -1 || (isAyahDead && isIbuDead)) {
          calculatedYatim = 'Yatim Piatu';
        } else if (rawYatim.indexOf('yatim') !== -1 || isAyahDead) {
          calculatedYatim = 'Yatim';
        } else if (rawYatim.indexOf('piatu') !== -1 || isIbuDead) {
          calculatedYatim = 'Piatu';
        }

        yatimRows.push([
          'YTM-' + String(yatimCounter++).padStart(4, '0'),
          siswaId ? (String(siswaId).startsWith("'") ? String(siswaId) : "'" + String(siswaId)) : ('SISWA-' + r),
          nisn ? (String(nisn).startsWith("'") ? String(nisn) : "'" + String(nisn)) : '-',
          namaSiswa,
          kelas || '-',
          calculatedYatim,
          namaAyah || '-',
          statusAyah || (isAyahDead ? 'Meninggal' : 'Masih Hidup'),
          namaIbu || '-',
          statusIbu || (isIbuDead ? 'Meninggal' : 'Masih Hidup'),
          namaWali || (calculatedYatim === 'Yatim' ? (namaIbu || '-') : calculatedYatim === 'Piatu' ? (namaAyah || '-') : (namaAyah || namaIbu || '-')),
          (phoneWali || phoneIbu || phoneAyah) ? "'" + (phoneWali || phoneIbu || phoneAyah) : '-',
          alamat || '-',
          kpsPip || (calculatedYatim !== 'Lengkap' ? 'Ya (Prioritas)' : 'Tidak'),
          calculatedYatim !== 'Lengkap' ? ('Prioritas Bantuan Sosial - ' + calculatedYatim) : 'Reguler',
          new Date().toISOString(),
          new Date().toISOString()
        ]);
      }
    }

    // Tulis ke Sheet ORANG_TUA
    var sheetOrtu = ss.getSheetByName('ORANG_TUA');
    if (!sheetOrtu) sheetOrtu = ss.insertSheet('ORANG_TUA');
    var ortuHeaders = ['OrtuID', 'SiswaID', 'NamaSiswa', 'NISN', 'Hubungan', 'Nama', 'NIK', 'TempatLahir', 'TanggalLahir', 'Pendidikan', 'Pekerjaan', 'Penghasilan', 'NoHP', 'Alamat', 'StatusHidup', 'CreatedAt', 'UpdatedAt'];
    sheetOrtu.clear();
    sheetOrtu.appendRow(ortuHeaders);
    sheetOrtu.getRange(1, 1, 1, ortuHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if (ortuRows.length > 0) {
      var ortuRange = sheetOrtu.getRange(2, 1, ortuRows.length, ortuHeaders.length);
      ortuRange.setNumberFormat("@");
      ortuRange.setValues(ortuRows);
    }
    sheetOrtu.setFrozenRows(1);

    // Tulis ke Sheet YATIM_PIATU
    var sheetYatim = ss.getSheetByName('YATIM_PIATU');
    if (!sheetYatim) sheetYatim = ss.insertSheet('YATIM_PIATU');
    var yatimHeaders = ['YatimID', 'NoPDKT', 'NISN', 'NamaSiswa', 'Kelas', 'StatusYatim', 'NamaAyah', 'StatusAyah', 'NamaIbu', 'StatusIbu', 'NamaWali', 'NoHPWali', 'Alamat', 'PenerimaKPS_PIP', 'Keterangan', 'CreatedAt', 'UpdatedAt'];
    sheetYatim.clear();
    sheetYatim.appendRow(yatimHeaders);
    sheetYatim.getRange(1, 1, 1, yatimHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if (yatimRows.length > 0) {
      var yatimRange = sheetYatim.getRange(2, 1, yatimRows.length, yatimHeaders.length);
      yatimRange.setNumberFormat("@");
      yatimRange.setValues(yatimRows);
    }
    sheetYatim.setFrozenRows(1);

    logAudit('SYSTEM', 'SYNC_ORTU_YATIM', 'Auto-populate ' + ortuRows.length + ' data Orang Tua & ' + yatimRows.length + ' data Yatim Piatu dari SISWA.');
    return {
      status: 'success',
      message: 'Berhasil sinkronisasi otomatis ' + ortuRows.length + ' record Orang Tua dan ' + yatimRows.length + ' record Yatim Piatu dari Sheet SISWA!',
      totalOrtu: ortuRows.length,
      totalYatim: yatimRows.length
    };
  } catch (err) {
    return { status: 'error', message: 'Gagal auto-populate Ortu & Yatim: ' + err.toString() };
  }
}

/**
 * Otomatis Generasi & Sinkronisasi Sheet REKAP_SISWA_KELURAHAN dari Sheet SISWA
 * Menampilkan: RekapKelurahanID, NamaSiswa, NISN, RW, RT, Kelurahan, Kecamatan, Kota, Kelas, Status, JenisKelamin, Alamat, NamaAyah, NamaIbu, NoHP, StatusYatim
 */
function autoPopulateRekapKelurahanFromSiswa() {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { status: 'error', message: 'Spreadsheet tidak ditemukan.' };

    var sheetSiswa = ss.getSheetByName('SISWA');
    if (!sheetSiswa) return { status: 'error', message: 'Sheet SISWA tidak ditemukan.' };

    var rawData = sheetSiswa.getDataRange().getValues();
    if (rawData.length <= 1) return { status: 'error', message: 'Sheet SISWA masih kosong.' };

    var headers = rawData[0].map(function(h) {
      return String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    });

    function getVal(row, possibleNames) {
      for (var i = 0; i < possibleNames.length; i++) {
        var cleanName = possibleNames[i].toLowerCase().replace(/[^a-z0-9]/g, '');
        var idx = headers.indexOf(cleanName);
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
          return String(row[idx]).trim();
        }
      }
      return '';
    }

    var rekapRows = [];
    var nowIso = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    for (var r = 1; r < rawData.length; r++) {
      var row = rawData[r];
      var namaSiswa = getVal(row, ['namalengkap', 'nama', 'name', 'namasantri']);
      if (!namaSiswa && !row[0]) continue;

      var nisn = getVal(row, ['nisn', 'nomorinduksiswanasional', 'nis', 'id']);
      var alamat = getVal(row, ['alamat', 'address', 'domisili', 'tempattinggal']);
      var kelurahan = getVal(row, ['kelurahan', 'kel', 'desa']);
      var rw = getVal(row, ['rw']);
      var rt = getVal(row, ['rt']);
      var kelas = getVal(row, ['kelassaatini', 'kelas', 'class', 'rombel']) || '1A';
      var status = getVal(row, ['status']) || 'Aktif';
      var stLow = String(status).toLowerCase().trim();

      // Rekap Siswa per Kelurahan: Hanya tampilkan siswa yang AKTIF saja
      if (
        stLow.indexOf('tidak') !== -1 ||
        stLow.indexOf('non') !== -1 ||
        stLow.indexOf('lulus') !== -1 ||
        stLow.indexOf('alumni') !== -1 ||
        stLow.indexOf('pindah') !== -1 ||
        stLow.indexOf('mutasi') !== -1 ||
        stLow.indexOf('keluar') !== -1 ||
        stLow.indexOf('drop') !== -1 ||
        stLow.indexOf('do') !== -1 ||
        stLow === 'belum' ||
        stLow === 'pending'
      ) {
        continue;
      }

      var jk = getVal(row, ['jeniskelamin', 'gender', 'jk', 'lp']) || 'L';
      var namaAyah = getVal(row, ['namaayah', 'ayah', 'fathername']);
      var namaIbu = getVal(row, ['namaibu', 'ibu', 'mothername']);
      var noHp = getVal(row, ['nomorhp', 'nohp', 'phone', 'telepon', 'tlpayah', 'tlpibu', 'tlpwali']);
      var statusYatim = getVal(row, ['statusyatim', 'yatim', 'yatimpiatu']) || 'Lengkap';

      // Mengambil kelurahan murni dari kolom Sheet
      if (!kelurahan && alamat) {
        var matchKel = alamat.match(/(?:Kelurahan|Desa|Kel\.)\s+([A-Za-z\s]+?)(?:,|$|\s+RT|\s+RW)/i);
        if (matchKel && matchKel[1]) {
          kelurahan = matchKel[1].trim();
        }
      }
      if (!kelurahan) kelurahan = 'Belum Terdata';

      // Ekstraksi RW murni dari Sheet (Hanya angka murni sesuai standar Dapodik, tanpa awalan 'RW')
      if (!rw && alamat) {
        var matchRw = alamat.match(/RW[\s.:]*0?([0-9]+)/i);
        if (matchRw && matchRw[1]) {
          var nRw = parseInt(matchRw[1], 10);
          rw = !isNaN(nRw) ? (nRw < 10 ? '0' + nRw : String(nRw)) : matchRw[1];
        }
      } else if (rw && rw !== '-') {
        var cleanRw = String(rw).replace(/^RW[\s.:]*/i, '').trim();
        var numRw = cleanRw.replace(/[^0-9]/g, '');
        if (numRw) {
          var nRw2 = parseInt(numRw, 10);
          rw = !isNaN(nRw2) ? (nRw2 < 10 ? '0' + nRw2 : String(nRw2)) : numRw;
        } else {
          rw = cleanRw;
        }
      }
      if (!rw) rw = '-';

      // Ekstraksi RT murni dari Sheet (Hanya angka murni sesuai standar Dapodik, tanpa awalan 'RT')
      if (!rt && alamat) {
        var matchRt = alamat.match(/RT[\s.:]*0?([0-9]+)/i);
        if (matchRt && matchRt[1]) {
          var nRt = parseInt(matchRt[1], 10);
          rt = !isNaN(nRt) ? (nRt < 10 ? '0' + nRt : String(nRt)) : matchRt[1];
        }
      } else if (rt && rt !== '-') {
        var cleanRt = String(rt).replace(/^RT[\s.:]*/i, '').trim();
        var numRt = cleanRt.replace(/[^0-9]/g, '');
        if (numRt) {
          var nRt2 = parseInt(numRt, 10);
          rt = !isNaN(nRt2) ? (nRt2 < 10 ? '0' + nRt2 : String(nRt2)) : numRt;
        } else {
          rt = cleanRt;
        }
      }
      if (!rt) rt = '-';

      rekapRows.push([
        'RKL-' + String(r).padStart(4, '0'),
        namaSiswa || 'Siswa ' + r,
        nisn ? (String(nisn).startsWith("'") ? String(nisn) : "'" + String(nisn)) : '-',
        rw,
        rt,
        kelurahan,
        'Tambora',
        'Jakarta Barat',
        kelas,
        status,
        jk.toUpperCase().indexOf('P') === 0 ? 'P' : 'L',
        alamat || '-',
        namaAyah || '-',
        namaIbu || '-',
        noHp ? (String(noHp).startsWith("'") ? String(noHp) : "'" + String(noHp)) : '-',
        statusYatim,
        nowIso,
        nowIso
      ]);
    }

    // Tulis ke Sheet REKAP_SISWA_KELURAHAN
    var sheetRekap = ss.getSheetByName('REKAP_SISWA_KELURAHAN');
    if (!sheetRekap) sheetRekap = ss.insertSheet('REKAP_SISWA_KELURAHAN');
    var rekapHeaders = ['RekapKelurahanID', 'NamaSiswa', 'NISN', 'RW', 'RT', 'Kelurahan', 'Kecamatan', 'Kota', 'Kelas', 'Status', 'JenisKelamin', 'Alamat', 'NamaAyah', 'NamaIbu', 'NoHP', 'StatusYatim', 'CreatedAt', 'UpdatedAt'];
    sheetRekap.clear();
    sheetRekap.appendRow(rekapHeaders);
    sheetRekap.getRange(1, 1, 1, rekapHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if (rekapRows.length > 0) {
      var rekapRange = sheetRekap.getRange(2, 1, rekapRows.length, rekapHeaders.length);
      rekapRange.setNumberFormat("@");
      rekapRange.setValues(rekapRows);
    }
    sheetRekap.setFrozenRows(1);

    logAudit('SYSTEM', 'SYNC_REKAP_KELURAHAN', 'Auto-populate ' + rekapRows.length + ' data Rekap Siswa per Kelurahan dari SISWA.');
    return {
      status: 'success',
      message: 'Berhasil generate ' + rekapRows.length + ' baris Rekap Siswa per Kelurahan ke Sheet REKAP_SISWA_KELURAHAN!',
      total: rekapRows.length
    };
  } catch (err) {
    return { status: 'error', message: 'Gagal generate Rekap Kelurahan: ' + err.toString() };
  }
}

/**
 * Otomatisasi Ekstraksi & Audit Validasi Sheet DAPODIK_VALIDASI dari Sheet SISWA
 */
function autoPopulateDapodikValidasiFromSiswa() {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { status: 'error', message: 'Spreadsheet tidak ditemukan.' };

    var sheetSiswa = ss.getSheetByName('SISWA');
    if (!sheetSiswa) return { status: 'error', message: 'Sheet SISWA tidak ditemukan.' };

    var sDataRange = sheetSiswa.getDataRange();
    var siswaValues = sDataRange.getValues();
    var siswaDisplayValues = sDataRange.getDisplayValues();
    if (siswaValues.length <= 1) return { status: 'error', message: 'Sheet SISWA masih kosong.' };

    var sHeaders = siswaValues[0];
    var colMap = {};
    sHeaders.forEach(function(h, idx) {
      colMap[String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')] = idx;
    });

    function getVal(row, rowIdx, possibleKeys) {
      for (var i = 0; i < possibleKeys.length; i++) {
        var k = possibleKeys[i].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (colMap.hasOwnProperty(k)) {
          var colIdx = colMap[k];
          var rawVal = row[colIdx];
          var dispVal = (siswaDisplayValues && siswaDisplayValues[rowIdx]) ? siswaDisplayValues[rowIdx][colIdx] : '';

          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            if (dispVal && typeof dispVal === 'string' && dispVal.trim() !== '') {
              return dispVal.trim();
            }
            return String(rawVal).trim();
          }
        }
      }
      return '';
    }

    var nowIso = new Date().toISOString();
    var nowTgl = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    var dapodikRows = [];

    for (var r = 1; r < siswaValues.length; r++) {
      var sRow = siswaValues[r];
      var pdkt = getVal(sRow, r, ['nopdkt', 'pdkt', 'id', 'siswaid']);
      var nama = getVal(sRow, r, ['namalengkap', 'nama', 'namasiswa']);
      if (!pdkt && !nama) continue;

      var nisn = getVal(sRow, r, ['nisn']);
      var nik = getVal(sRow, r, ['nik', 'niksiswa']);
      var noKk = getVal(sRow, r, ['nomorkartukeluarga', 'nokk', 'kartukeluarga', 'kk']);
      var namaIbu = getVal(sRow, r, ['namaibu', 'namaibukandung', 'ibu']);
      var tglLahir = getVal(sRow, r, ['tanggallahir', 'tgllahir', 'tgllahirsiswa', 'birthdate']);

      // Format clean tanggal lahir
      if (tglLahir.includes('GMT') || tglLahir.includes('00:00:00')) {
        try {
          var parsedDate = new Date(tglLahir);
          if (!isNaN(parsedDate.getTime())) {
            tglLahir = Utilities.formatDate(parsedDate, 'Asia/Jakarta', 'yyyy-MM-dd');
          }
        } catch(e) {}
      }

      // Validasi audit Dapodik
      var catatanList = [];
      var cleanNisn = nisn.replace(/[^0-9]/g, '');
      var cleanNik = nik.replace(/[^0-9]/g, '');
      var cleanKk = noKk.replace(/[^0-9]/g, '');

      if (!cleanNisn || cleanNisn.length !== 10) {
        catatanList.push('NISN harus 10 digit angka');
      }
      if (!cleanNik || cleanNik.length !== 16) {
        catatanList.push('NIK Siswa harus 16 digit');
      }
      if (!cleanKk || cleanKk.length !== 16) {
        catatanList.push('No KK harus 16 digit');
      }
      if (!namaIbu || namaIbu === '-' || namaIbu.length < 2) {
        catatanList.push('Nama Ibu Kandung belum lengkap');
      }
      if (!tglLahir || tglLahir === '-') {
        catatanList.push('Tanggal Lahir belum valid');
      }

      var statusDapodik = catatanList.length === 0 ? 'VALID' : 'INVALID';
      var catatanInvalid = catatanList.length > 0 ? catatanList.join('; ') : 'Data Lengkap & Valid';

      dapodikRows.push([
        'DPK-' + String(r).padStart(4, '0'),
        pdkt ? (String(pdkt).startsWith("'") ? String(pdkt) : "'" + String(pdkt)) : ('SISWA-' + r),
        cleanNisn ? "'" + cleanNisn : (nisn || '-'),
        cleanNik ? "'" + cleanNik : (nik || '-'),
        cleanKk ? "'" + cleanKk : (noKk || '-'),
        nama || '-',
        namaIbu || '-',
        tglLahir || '-',
        statusDapodik,
        catatanInvalid,
        nowTgl,
        nowIso,
        '2026/2027',
        statusDapodik === 'VALID' ? 'Terdaftar di Dapodik' : 'Perlu Perbaikan'
      ]);
    }

    // Tulis ke Sheet DAPODIK_VALIDASI
    var sheetDapodik = ss.getSheetByName('DAPODIK_VALIDASI');
    if (!sheetDapodik) sheetDapodik = ss.insertSheet('DAPODIK_VALIDASI');
    var dpkHeaders = ["ValidasiID", "SiswaID", "NISN", "NIK", "NoKK", "NamaSiswa", "NamaIbuKandung", "TanggalLahir", "StatusDapodik", "CatatanInvalid", "TglValidasi", "UpdatedAt", "TahunAjaran", "Buktiterdaftar"];
    sheetDapodik.clear();
    sheetDapodik.appendRow(dpkHeaders);
    sheetDapodik.getRange(1, 1, 1, dpkHeaders.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if (dapodikRows.length > 0) {
      var dpkRange = sheetDapodik.getRange(2, 1, dapodikRows.length, dpkHeaders.length);
      dpkRange.setNumberFormat("@");
      dpkRange.setValues(dapodikRows);
    }
    sheetDapodik.setFrozenRows(1);

    logAudit('SYSTEM', 'SYNC_DAPODIK', 'Auto-populate ' + dapodikRows.length + ' data audit DAPODIK_VALIDASI dari SISWA.');
    return {
      status: 'success',
      message: 'Berhasil audit & sinkronisasi ' + dapodikRows.length + ' data Siswa ke Sheet DAPODIK_VALIDASI!',
      total: dapodikRows.length
    };
  } catch (err) {
    return { status: 'error', message: 'Gagal auto-populate Dapodik: ' + err.toString() };
  }
}

// Alias agar kompatibel dengan pemanggilan fungsi lama
function autoPopulateDapodik() {
  return autoPopulateDapodikValidasiFromSiswa();
}

/**
 * ============================================================================
 * MODUL 1: PRESENSI, QR & JADWAL HARIAN TERPADU
 * ============================================================================
 */

function formatWaktuSheet(waktu, formatPola) {
  try {
    if (!waktu) return "-";
    var dateObj = (waktu instanceof Date) ? waktu : new Date(waktu);
    return Utilities.formatDate(dateObj, 'Asia/Jakarta', formatPola);
  } catch (e) {
    return String(waktu || "-");
  }
}

function calculateTimeDiff(startTime, endTime) {
  try {
    if (!startTime || !endTime) return 0;
    var s1 = (startTime instanceof Date) ? formatWaktuSheet(startTime, 'HH:mm') : String(startTime).trim();
    var s2 = (endTime instanceof Date) ? formatWaktuSheet(endTime, 'HH:mm') : String(endTime).trim();
    if (!s1.includes(':') || !s2.includes(':')) return 0;
    var p1 = s1.split(':').map(Number);
    var p2 = s2.split(':').map(Number);
    return (p2[0] * 60 + (p2[1] || 0)) - (p1[0] * 60 + (p1[1] || 0));
  } catch (e) {
    return 0;
  }
}

function getAppConfig() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('SETTING') || ss.getSheetByName('konfigurasi');
    var defaultJadwal = {
      "1": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "2": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "3": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "4": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "5": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "6": {"libur":false,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"},
      "7": {"libur":true,"masuk_mulai":"06:00","masuk_akhir":"07:15","pulang_mulai":"15:00","pulang_akhir":"17:00"}
    };
    var config = {
      jam_masuk_mulai: '06:00',
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00',
      jadwal_harian: defaultJadwal,
      mode_absen: 'masuk_pulang'
    };
    
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var key = data[i][0];
        var val = data[i][1];
        if (key === 'jadwal_harian') {
          try { config.jadwal_harian = JSON.parse(String(val)); } catch(e) { config.jadwal_harian = defaultJadwal; }
        } else if (config.hasOwnProperty(key)) {
          config[key] = (val instanceof Date) ? formatWaktuSheet(val, 'HH:mm') : String(val);
        }
      }
    }
    return { success: true, data: config };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function saveAppConfig(newConfig) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('SETTING') || ss.getSheetByName('konfigurasi');
    if (!sheet) {
      sheet = ss.insertSheet('SETTING');
      sheet.appendRow(['Key', 'Value']);
    }
    
    var data = sheet.getDataRange().getValues();
    var updateRow = function(key, val) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(val); 
          return true;
        }
      }
      return false;
    };

    if (newConfig.jam_masuk_mulai) updateRow('jam_masuk_mulai', "'" + newConfig.jam_masuk_mulai);
    if (newConfig.jam_masuk_akhir) updateRow('jam_masuk_akhir', "'" + newConfig.jam_masuk_akhir);
    if (newConfig.jam_pulang_mulai) updateRow('jam_pulang_mulai', "'" + newConfig.jam_pulang_mulai);
    if (newConfig.jam_pulang_akhir) updateRow('jam_pulang_akhir', "'" + newConfig.jam_pulang_akhir);
    if (newConfig.mode_absen) updateRow('mode_absen', newConfig.mode_absen);
    if (newConfig.jadwal_harian) {
      var jsonStr = typeof newConfig.jadwal_harian === 'string' ? newConfig.jadwal_harian : JSON.stringify(newConfig.jadwal_harian);
      if (!updateRow('jadwal_harian', jsonStr)) {
        sheet.appendRow(['jadwal_harian', jsonStr]);
      }
    }

    return { success: true, message: 'Konfigurasi sistem berhasil disimpan' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getHariLibur() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('HARI_LIBUR') || ss.getSheetByName('hari_libur');
    if (!sheet) return { success: true, data: [] };
    var data = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] || data[i][1]) {
        var tglRaw = data[i][1] || data[i][0];
        var tgl = formatWaktuSheet(new Date(tglRaw), 'yyyy-MM-dd');
        list.push({
          tanggal: tgl,
          keterangan: data[i][2] || data[i][1] || 'Hari Libur'
        });
      }
    }
    list.sort(function(a, b) { return b.tanggal.localeCompare(a.tanggal); });
    return { success: true, data: list };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addHariLiburRange(tanggalMulai, tanggalAkhir, keterangan) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('HARI_LIBUR') || ss.getSheetByName('hari_libur');
    if (!sheet) {
      sheet = ss.insertSheet('HARI_LIBUR');
      sheet.appendRow(['HariLiburID', 'Tanggal', 'Nama', 'Jenis', 'Keterangan']);
    }

    var dMulai = new Date(tanggalMulai + 'T00:00:00');
    var dAkhir = new Date(tanggalAkhir + 'T00:00:00');
    var rowsToAdd = [];

    for (var d = new Date(dMulai); d <= dAkhir; d.setDate(d.getDate() + 1)) {
      var dStr = formatWaktuSheet(d, 'yyyy-MM-dd');
      rowsToAdd.push([
        'LIB-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
        dStr,
        keterangan,
        'Nasional/Sekolah',
        keterangan
      ]);
    }

    if (rowsToAdd.length > 0) {
      var libRange = sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length);
      libRange.setNumberFormat("@");
      libRange.setValues(rowsToAdd);
    }

    return { success: true, message: rowsToAdd.length + ' hari libur berhasil ditambahkan.', added: rowsToAdd.length };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ============================================================================
 * MODUL 2: ADMINISTRASI GURU, JURNAL AGENDA, NILAI & LEGER
 * ============================================================================
 */

function simpanAbsensiServer(kelas, mapel, pert, tgl, guru, data) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('ABSENSI') || ss.getSheetByName('absensi');
    if (!sheet) return { success: false, message: 'Sheet ABSENSI tidak ditemukan' };
    
    var time = new Date();
    var nowStr = formatWaktuSheet(time, 'HH:mm:ss');
    var rows = data.map(function(d) {
      return [
        'ABS-' + time.getTime() + '-' + Math.floor(Math.random()*1000),
        tgl,
        d.nama,
        kelas,
        nowStr,
        '',
        mapel + ' - Pertemuan ' + pert,
        d.status,
        '', '', '', '', '', nowStr
      ];
    });

    var absRange = sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length);
    absRange.setNumberFormat("@");
    absRange.setValues(rows);
    return { success: true, message: 'Absensi pertemuan ' + pert + ' berhasil disimpan!' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function simpanNilaiServer(judul, mapel, kelas, guru, dataNilai) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('NILAI') || ss.getSheetByName('nilai');
    if (!sheet) return { success: false, message: 'Sheet NILAI tidak ditemukan' };

    var nowStr = formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss');
    var rows = dataNilai.map(function(d) {
      return [
        'NIL-' + new Date().getTime() + '-' + Math.floor(Math.random()*1000),
        d.nama,
        mapel,
        guru,
        kelas,
        '1',
        '2026/2027',
        judul,
        d.nilai,
        75,
        Number(d.nilai) >= 75 ? 'A' : 'C',
        judul,
        nowStr,
        nowStr,
        nowStr
      ];
    });

    var nilRange = sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length);
    nilRange.setNumberFormat("@");
    nilRange.setValues(rows);
    return { success: true, message: 'Nilai ' + judul + ' berhasil disimpan!' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getLegerDinamis(kelas, mapel) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('NILAI') || ss.getSheetByName('nilai');
    if (!sheet) return { headers: [], data: [] };

    var data = sheet.getDataRange().getValues();
    var filtered = data.slice(1).filter(function(r) {
      return String(r[4]).toUpperCase() === String(kelas).toUpperCase() && String(r[2]).toUpperCase() === String(mapel).toUpperCase();
    });

    var headersSet = {};
    filtered.forEach(function(r) { if (r[7]) headersSet[String(r[7])] = true; });
    var headers = Object.keys(headersSet).sort();

    var siswaMap = {};
    filtered.forEach(function(r) {
      var sNama = String(r[1]);
      if (!siswaMap[sNama]) siswaMap[sNama] = { nama: sNama, total: 0, count: 0 };
      siswaMap[sNama][String(r[7])] = Number(r[8] || 0);
      siswaMap[sNama].total += Number(r[8] || 0);
      siswaMap[sNama].count++;
    });

    var rows = Object.keys(siswaMap).map(function(sNama, idx) {
      var item = siswaMap[sNama];
      item.no = idx + 1;
      item.rata = item.count > 0 ? (item.total / (headers.length || 1)).toFixed(1) : '0';
      return item;
    });

    return { success: true, headers: headers, data: rows };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function tambahAgenda(d) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('AGENDA') || ss.getSheetByName('agenda');
    if (!sheet) return { success: false, message: 'Sheet AGENDA tidak ditemukan' };
    sheet.appendRow(d);
    return { success: true, message: 'Jurnal agenda mengajar berhasil disimpan' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getAgenda(g) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('AGENDA') || ss.getSheetByName('agenda');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1).filter(function(r) { return !g || String(r[2]) === String(g) || String(r[10]) === String(g); });
  } catch (e) {
    return [];
  }
}

function simpanCatatanBimbingan(d) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('BIMBINGAN') || ss.getSheetByName('bimbingan');
    if (!sheet) return { success: false, message: 'Sheet BIMBINGAN tidak ditemukan' };
    sheet.appendRow(d);
    return { success: true, message: 'Catatan bimbingan siswa berhasil disimpan' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getRiwayatBimbingan(g) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('BIMBINGAN') || ss.getSheetByName('bimbingan');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1).filter(function(r) { return !g || String(r[3]) === String(g) || String(r[6]) === String(g); });
  } catch (e) {
    return [];
  }
}

/**
 * ============================================================================
 * MODUL 3: SPMB / PPDB ONLINE & FORM BUILDER
 * ============================================================================
 */

function getFormConfig() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('FORM_FIELDS') || ss.getSheetByName('Config');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1).map(function(r) {
      return { label: r[1] || r[0], type: r[2] || 'text', options: r[6] || r[2] || '', width: r[3] || '12', required: Boolean(r[4]) };
    });
  } catch (e) {
    return [];
  }
}

function getKonfigurasiAplikasi() {
  var defaultConf = {
    appName: 'SPMB Online',
    judulSidebar: 'SPMB 2026',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/2920/2920224.png',
    heroImageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop',
    teksHero: 'Penerimaan Siswa Baru',
    heroBaris1: 'Pendidikan Terbaik untuk',
    heroBaris2: 'Masa Depan Cerah',
    heroSubteks: 'Bergabunglah bersama kami untuk meraih prestasi dan karakter unggul.',
    footerJudul: 'Rombel KTCT',
    footerAlamat: 'Gedung Sasana Krida Karang Taruna , Jl. Laksa II No.12, RT.012 RW.002, Jakarta Barat',
    footerTelepon: '0851-4180-9991',
    footerEmail: 'rombelkatartambora@gmail.com',
    footerHakCipta: '© 2026 Rombongan Belajar Karang Taruna Kecamatan Tambora',
    linkFb: '#', linkIg: '#', linkYt: '#',
    pendaftaranStatus: 'dibuka',
    alur1_judul: 'Isi Formulir', alur1_desc: 'Lengkapi biodata diri secara online.',
    alur2_judul: 'Upload Berkas', alur2_desc: 'Unggah berkas KK, Akta & Foto.',
    alur3_judul: 'Verifikasi', alur3_desc: 'Panitia meninjau kelayakan berkas.',
    alur4_judul: 'Pengumuman', alur4_desc: 'Cek status kelulusan secara online.'
  };

  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('WEB_CONFIG') || ss.getSheetByName('Konfigurasi');
    if (!sheet) return { success: true, data: defaultConf };
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: defaultConf };
    
    var r = data[1];
    var conf = {
      appName: r[0] || defaultConf.appName,
      judulSidebar: r[1] || defaultConf.judulSidebar,
      logoUrl: r[2] || defaultConf.logoUrl,
      heroImageUrl: r[3] || defaultConf.heroImageUrl,
      teksHero: r[4] || defaultConf.teksHero,
      heroBaris1: r[5] || defaultConf.heroBaris1,
      heroBaris2: r[6] || defaultConf.heroBaris2,
      heroSubteks: r[7] || defaultConf.heroSubteks,
      footerJudul: r[8] || defaultConf.footerJudul,
      footerAlamat: r[9] || defaultConf.footerAlamat,
      footerTelepon: r[10] || defaultConf.footerTelepon,
      footerEmail: r[11] || defaultConf.footerEmail,
      footerHakCipta: r[12] || defaultConf.footerHakCipta,
      linkFb: r[13] || defaultConf.linkFb,
      linkIg: r[14] || defaultConf.linkIg,
      linkYt: r[15] || defaultConf.linkYt,
      pendaftaranStatus: r[16] || defaultConf.pendaftaranStatus,
      alur1_judul: r[17] || defaultConf.alur1_judul,
      alur1_desc: r[18] || defaultConf.alur1_desc,
      alur2_judul: r[19] || defaultConf.alur2_judul,
      alur2_desc: r[20] || defaultConf.alur2_desc,
      alur3_judul: r[21] || defaultConf.alur3_judul,
      alur3_desc: r[22] || defaultConf.alur3_desc,
      alur4_judul: r[23] || defaultConf.alur4_judul,
      alur4_desc: r[24] || defaultConf.alur4_desc
    };
    return { success: true, data: conf };
  } catch (e) {
    return { success: true, data: defaultConf };
  }
}

/**
 * ============================================================================
 * MODUL 4: CBT & ASESMEN UJIAN ONLINE
 * ============================================================================
 */

function registrasiAkunSiswaMandiri(nisnInput) {
  try {
    var ss = getSpreadsheet();
    var sheetSiswa = ss.getSheetByName('SISWA');
    var sheetUsers = ss.getSheetByName('USERS');
    if (!sheetSiswa || !sheetUsers) return { success: false, message: 'Sheet SISWA/USERS tidak ditemukan' };

    var cleanNisn = String(nisnInput || '').trim();
    var dataSiswa = sheetSiswa.getDataRange().getValues();
    var hS = dataSiswa[0];
    var idxNisn = hS.indexOf('NISN');
    var idxNama = hS.indexOf('NamaLengkap');
    var idxPdkt = hS.indexOf('nopdkt');

    var siswaFound = null;
    for (var i = 1; i < dataSiswa.length; i++) {
      if (String(dataSiswa[i][idxNisn]).trim() === cleanNisn) {
        siswaFound = dataSiswa[i];
        break;
      }
    }

    if (!siswaFound) return { success: false, message: 'NISN ' + cleanNisn + ' tidak terdaftar dalam database siswa.' };

    var nama = String(siswaFound[idxNama] || 'Siswa');
    var pdkt = String(siswaFound[idxPdkt] || '123');
    var password = nama.split(' ')[0].toLowerCase() + pdkt;

    sheetUsers.appendRow([
      'USR-' + new Date().getTime(),
      cleanNisn,
      password,
      'SISWA',
      nama,
      cleanNisn,
      '',
      '',
      'AKTIF',
      '',
      '',
      formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss')
    ]);

    return { success: true, username: cleanNisn, password: password, nama: nama };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function verifyTokenAndFetchExam(idJadwal, tokenInput, nisn) {
  try {
    var ss = getSpreadsheet();
    var shJadwal = ss.getSheetByName('JADWAL');
    if (!shJadwal) return { success: false, message: 'Sheet JADWAL tidak ditemukan' };

    var data = shJadwal.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(idJadwal).trim() || String(data[i][0]).trim() === String(idJadwal).trim()) {
        var tokenDb = String(data[i][10] || data[i][12] || '');
        if (tokenDb && tokenDb !== tokenInput) {
          return { success: false, message: 'Token ujian tidak valid!' };
        }
        return {
          success: true,
          mapel: data[i][3] || data[i][5] || 'Ujian',
          kelas: data[i][5] || data[i][4] || '-',
          durasi: Number(data[i][9] || data[i][8] || 60),
          message: 'Token valid'
        };
      }
    }
    return { success: false, message: 'Jadwal ujian tidak ditemukan.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getSoalUjian(idJadwal) {
  try {
    var ss = getSpreadsheet();
    var sh = ss.getSheetByName('BANK_SOAL');
    if (!sh) return [];
    var data = sh.getDataRange().getValues();
    return data.slice(1).map(function(r, idx) {
      return {
        idSoal: r[0] || ('SOAL-' + (idx + 1)),
        mapel: r[1] || 'Ujian',
        jenjang: r[2] || 'SMA',
        kelas: r[3] || '-',
        soal: r[8] || r[5] || '-',
        a: r[9] || r[7] || '-',
        b: r[10] || r[8] || '-',
        c: r[11] || r[9] || '-',
        d: r[12] || r[10] || '-',
        bobot: Number(r[15] || r[12] || 1)
      };
    });
  } catch (e) {
    return [];
  }
}

function submitJawabanDanNilai(payload) {
  try {
    var ss = getSpreadsheet();
    var shHasil = ss.getSheetByName('HASIL_UJIAN') || ss.getSheetByName('HASIL');
    var shLog = ss.getSheetByName('LOG_UJIAN');

    var benar = 0;
    var totalSoal = payload.totalSoal || (payload.jawabanUser ? payload.jawabanUser.length : 10);
    if (payload.jawabanUser) {
      payload.jawabanUser.forEach(function(j) {
        if (j.jawaban) benar++;
      });
    }

    var nilaiMentah = totalSoal > 0 ? Math.round((benar / totalSoal) * 100) : 0;
    var pelanggaran = Number(payload.pelanggaran || 0);
    var nilaiAkhir = Math.max(0, nilaiMentah - (pelanggaran * 5));
    var status = nilaiAkhir >= 65 ? (pelanggaran === 0 ? '✅ LULUS' : '⚠️ SELESAI') : '❌ TIDAK TUNTAS';

    var idHasil = 'HSL-' + new Date().getTime();
    if (shHasil) {
      shHasil.appendRow([
        idHasil,
        payload.idUjian || 'AS-01',
        payload.jenjang || 'SMA',
        payload.kelas || '-',
        payload.mapel || 'Ujian',
        "'" + payload.nisn,
        payload.namaSiswa || 'Siswa',
        nilaiMentah,
        benar,
        totalSoal - benar,
        totalSoal,
        pelanggaran,
        formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        status,
        payload.tahunAjaran || '2026/2027',
        nilaiAkhir,
        formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        payload.durasi || '30 Menit',
        payload.idJadwal || '-'
      ]);
    }

    if (shLog) {
      shLog.appendRow([
        'LOG-' + new Date().getTime(),
        "'" + payload.nisn,
        payload.namaSiswa || 'Siswa',
        payload.jenjang || 'SMA',
        payload.kelas || '-',
        status,
        formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        pelanggaran,
        payload.token || '-',
        payload.idJadwal || '-'
      ]);
    }

    return {
      success: true,
      jmlBenar: benar,
      jmlSalah: totalSoal - benar,
      jmlPelanggaran: pelanggaran,
      nilaiMentah: nilaiMentah,
      nilaiAkhir: nilaiAkhir,
      status: status
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function catatPelanggaranSiswa(idUjian, nisn, nama, jenjang, kelas, jenisPelanggaran, token) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('PELANGGARAN');
    if (sheet) {
      sheet.appendRow([
        'PLG-' + new Date().getTime(),
        idUjian || '-',
        "'" + nisn,
        nama,
        jenjang || '-',
        kelas || '-',
        jenisPelanggaran || 'Pindah Layar',
        formatWaktuSheet(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        token || '-',
        'Deteksi Otomatis Sistem'
      ]);
    }
  } catch (e) {}
}

/**
 * Mengambil dataset MASTER_SILABUS lengkap atau terfilter
 */
function getSilabusMaster(paketFilter, kelasFilter, mapelFilter) {
  try {
    var raw = getTableData('MASTER_SILABUS');
    if (raw.status !== 'success' || !Array.isArray(raw.data)) {
      return raw;
    }
    var list = raw.data;
    if (paketFilter) {
      list = list.filter(function(r) { return String(r.Jenjang || r.paket || '').toUpperCase() === String(paketFilter).toUpperCase(); });
    }
    if (kelasFilter) {
      list = list.filter(function(r) { return String(r.kelas || '') === String(kelasFilter); });
    }
    if (mapelFilter) {
      list = list.filter(function(r) { return String(r.NamaMapel || r.mataPelajaran || r.mapel || '').toLowerCase().includes(String(mapelFilter).toLowerCase()); });
    }
    return { status: 'success', data: list, total: list.length };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Mengambil dataset KURIKULUM_MODUL lengkap atau terfilter
 */
function getKurikulumModul(paketFilter, kelasFilter, mapelFilter) {
  try {
    var raw = getTableData('KURIKULUM_MODUL');
    if (raw.status !== 'success' || !Array.isArray(raw.data)) {
      return raw;
    }
    var list = raw.data;
    if (paketFilter) {
      list = list.filter(function(r) { return String(r.Jenjang || r.paket || '').toUpperCase() === String(paketFilter).toUpperCase(); });
    }
    if (kelasFilter) {
      list = list.filter(function(r) { return String(r.kelas || '') === String(kelasFilter); });
    }
    if (mapelFilter) {
      list = list.filter(function(r) { return String(r.NamaMapel || r.mataPelajaran || r.mapel || '').toLowerCase().includes(String(mapelFilter).toLowerCase()); });
    }
    return { status: 'success', data: list, total: list.length };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

`;
}

export function generateMergedIndexHtml(): string {
  const schemasJson = JSON.stringify(OFFICIAL_88_SCHEMAS);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistem Terpadu Sekolah - SISTA ROMBEL</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: #0f172a; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen">
  <div id="app" class="flex flex-col min-h-screen">
    <!-- Header Utama -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between sticky top-0 z-50 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-amber-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20">
          <i class="fas fa-school-flag"></i>
        </div>
        <div>
          <h1 class="font-black text-base tracking-wide text-white flex items-center gap-2">
            SISTA ROMBEL <span class="bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">GAS WEB APP</span>
          </h1>
          <p class="text-[10px] text-slate-400 font-medium">Sistem Informasi Terpadu Manajemen Sekolah • ${OFFICIAL_88_SCHEMAS.length} Sheet Master Engine Native</p>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-2 sm:mt-0">
        <button onclick="syncAllData()" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-2">
          <i class="fas fa-sync-alt text-indigo-400" id="syncIcon"></i> Tarik / Sync Data
        </button>
        <button onclick="initDatabase()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center gap-2">
          <i class="fas fa-database"></i> Inisialisasi ${OFFICIAL_88_SCHEMAS.length} Sheet
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-grow flex flex-col md:flex-row">
      <!-- Sidebar Navigation -->
      <aside class="w-full md:w-72 bg-slate-900/90 border-r border-slate-800 p-4 space-y-4 shrink-0">
        <!-- Quick Sheet Switcher Dropdown -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fas fa-table text-indigo-400"></i> Pilih Sheet (${OFFICIAL_88_SCHEMAS.length} Skema):
          </label>
          <select id="sheetSelector" onchange="onSelectSheet(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500">
            <!-- Populated dynamically via JS -->
          </select>
        </div>

        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 pt-2 border-t border-slate-800">
          Kategori Modul Sekolah
        </div>
        
        <nav class="space-y-1 scrollbar-thin max-h-[60vh] overflow-y-auto pr-1" id="categoryMenu">
          <button onclick="filterCategory('ALL')" id="cat-ALL" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between bg-indigo-600 text-white shadow-md">
            <span class="flex items-center gap-2.5"><i class="fas fa-border-all w-4"></i> Semua ${OFFICIAL_88_SCHEMAS.length} Sheet</span>
            <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">${OFFICIAL_88_SCHEMAS.length}</span>
          </button>
          <button onclick="filterCategory('MASTER')" id="cat-MASTER" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-users-gear w-4"></i> Master & Kesiswaan</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">11</span>
          </button>
          <button onclick="filterCategory('PENUGASAN')" id="cat-PENUGASAN" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-book-open w-4"></i> Penugasan & Silabus</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">8</span>
          </button>
          <button onclick="filterCategory('KEUANGAN')" id="cat-KEUANGAN" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-wallet w-4"></i> Keuangan & Tagihan</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">8</span>
          </button>
          <button onclick="filterCategory('AKADEMIK')" id="cat-AKADEMIK" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-graduation-cap w-4"></i> Akademik & CBT</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">8</span>
          </button>
          <button onclick="filterCategory('SPMB')" id="cat-SPMB" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-user-plus w-4"></i> SPMB Penerimaan</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">4</span>
          </button>
          <button onclick="filterCategory('INVENTARIS')" id="cat-INVENTARIS" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-boxes-packing w-4"></i> Inventaris & Aset</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">3</span>
          </button>
          <button onclick="filterCategory('BK')" id="cat-BK" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-user-shield w-4"></i> BK & Kedisiplinan</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">3</span>
          </button>
          <button onclick="filterCategory('SURAT')" id="cat-SURAT" class="cat-btn w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <span class="flex items-center gap-2.5"><i class="fas fa-file-contract w-4"></i> Surat & Dokumen</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">4</span>
          </button>
        </nav>
      </aside>

      <!-- Content Area -->
      <main class="flex-grow p-6 space-y-6 overflow-y-auto">
        <!-- Sheet Info & Action Bar -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span id="sheetCategoryBadge" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Master</span>
              <h2 id="sheetTitle" class="text-xl font-black text-white">SISWA</h2>
            </div>
            <p id="sheetDesc" class="text-xs text-slate-400">Data Pokok Siswa & Biodata Lengkap</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div class="relative flex-1 md:flex-initial min-w-[200px]">
              <i class="fas fa-search absolute left-3 top-3 text-slate-500 text-xs"></i>
              <input type="text" id="searchInput" oninput="onSearchChange(this.value)" placeholder="Cari data..." class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            </div>
            <button onclick="openAddModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0">
              <i class="fas fa-plus"></i> Tambah Data
            </button>
            <button onclick="saveCurrentSheetToGas()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0">
              <i class="fas fa-floppy-disk"></i> Simpan Ke Sheet
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div class="overflow-x-auto scrollbar-thin">
            <table class="w-full text-left text-xs text-slate-200">
              <thead id="tableHeader" class="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
                <!-- Headers rendered dynamically -->
              </thead>
              <tbody id="tableBody" class="divide-y divide-slate-800/60 font-medium">
                <!-- Rows rendered dynamically -->
              </tbody>
            </table>
          </div>
          <div id="tableFooter" class="p-4 bg-slate-950/60 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
            <span>Menampilkan <b id="rowCount" class="text-white">0</b> baris data</span>
            <span id="syncStatusTag" class="text-[11px] text-emerald-400 font-semibold">Ready</span>
          </div>
        </div>
      </main>
    </div>
  </div>

  <!-- Modal Form Add/Edit -->
  <div id="modalForm" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <h3 id="modalTitle" class="font-bold text-base text-white">Tambah Data Baru</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white transition">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <form id="dataForm" onsubmit="handleFormSubmit(event)" class="p-6 space-y-4 overflow-y-auto scrollbar-thin flex-grow">
        <div id="modalInputsContainer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Inputs generated dynamically -->
        </div>
        <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition">Batal</button>
          <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition">Simpan Data</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const SCHEMAS = ${schemasJson};

    let currentSchema = SCHEMAS[0];
    let sheetDataStore = {}; // { [sheetName]: array_of_row_objects }
    let searchQuery = '';
    let editingRowIndex = null;

    // Initialize UI on Load
    document.addEventListener('DOMContentLoaded', () => {
      populateSheetSelector(SCHEMAS);
      loadSheet(SCHEMAS[0].name);
    });

    function populateSheetSelector(schemaList) {
      const select = document.getElementById('sheetSelector');
      select.innerHTML = schemaList.map(s => \`<option value="\${s.name}">[\${s.category}] \${s.name} - \${s.description.slice(0, 30)}...</option>\`).join('');
    }

    function filterCategory(cat) {
      document.querySelectorAll('.cat-btn').forEach(el => {
        el.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
        el.classList.add('text-slate-400');
      });
      const activeBtn = document.getElementById('cat-' + cat);
      if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
        activeBtn.classList.remove('text-slate-400');
      }

      const filtered = cat === 'ALL' ? SCHEMAS : SCHEMAS.filter(s => s.category.toUpperCase().includes(cat));
      populateSheetSelector(filtered);
      if (filtered.length > 0) {
        loadSheet(filtered[0].name);
        document.getElementById('sheetSelector').value = filtered[0].name;
      }
    }

    function onSelectSheet(sheetName) {
      loadSheet(sheetName);
    }

    function loadSheet(sheetName) {
      const schema = SCHEMAS.find(s => s.name === sheetName);
      if (!schema) return;
      
      currentSchema = schema;
      document.getElementById('sheetTitle').innerText = schema.name;
      document.getElementById('sheetDesc').innerText = schema.description || 'Skema Tabel SISTA ROMBEL';
      document.getElementById('sheetCategoryBadge').innerText = schema.category;

      if (!sheetDataStore[sheetName]) {
        sheetDataStore[sheetName] = generateSampleDataForSchema(schema);
        // Try fetching live data from GAS backend if available
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(res => {
              if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
                sheetDataStore[sheetName] = res.data;
                renderTable();
              }
            })
            .getTableData(sheetName);
        }
      }

      renderTable();
    }

    function generateSampleDataForSchema(schema) {
      const rows = [];
      for (let i = 1; i <= 3; i++) {
        const row = {};
        schema.headers.forEach(h => {
          if (h.toLowerCase().includes('id')) row[h] = h.toUpperCase() + '-00' + i;
          else if (h.toLowerCase().includes('nama')) row[h] = 'Contoh Data ' + schema.name + ' #' + i;
          else if (h.toLowerCase().includes('tgl') || h.toLowerCase().includes('tanggal')) row[h] = '2026-07-26';
          else if (h.toLowerCase().includes('status')) row[h] = 'AKTIF';
          else if (h.toLowerCase().includes('nominal') || h.toLowerCase().includes('jumlah')) row[h] = 150000;
          else row[h] = 'Val-' + i;
        });
        rows.push(row);
      }
      return rows;
    }

    function renderTable() {
      const rows = sheetDataStore[currentSchema.name] || [];
      const filtered = rows.filter(r => {
        if (!searchQuery) return true;
        return Object.values(r).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));
      });

      // Render Header
      const thead = document.getElementById('tableHeader');
      thead.innerHTML = \`
        <tr>
          <th class="p-3.5 w-12 text-center">#</th>
          \${currentSchema.headers.map(h => \`<th class="p-3.5 shadow-sm whitespace-nowrap">\${h}</th>\`).join('')}
          <th class="p-3.5 w-24 text-center">Aksi</th>
        </tr>
      \`;

      // Render Body
      const tbody = document.getElementById('tableBody');
      if (filtered.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="\${currentSchema.headers.length + 2}" class="p-8 text-center text-slate-500 italic">
              Tidak ada data dalam sheet [\${currentSchema.name}]
            </td>
          </tr>
        \`;
      } else {
        tbody.innerHTML = filtered.map((row, idx) => \`
          <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/40">
            <td class="p-3 text-center text-slate-500 font-mono">\${idx + 1}</td>
            \${currentSchema.headers.map(h => \`<td class="p-3 max-w-[200px] truncate">\${row[h] !== undefined ? row[h] : '-'}</td>\`).join('')}
            <td class="p-3 text-center space-x-1 whitespace-nowrap">
              <button onclick="openEditModal(\${idx})" class="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteRow(\${idx})" class="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition" title="Hapus">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        \`).join('');
      }

      document.getElementById('rowCount').innerText = filtered.length;
    }

    function onSearchChange(val) {
      searchQuery = val;
      renderTable();
    }

    function openAddModal() {
      editingRowIndex = null;
      document.getElementById('modalTitle').innerText = 'Tambah Data - ' + currentSchema.name;
      buildModalInputs({});
      document.getElementById('modalForm').classList.remove('hidden');
    }

    function openEditModal(idx) {
      editingRowIndex = idx;
      const rows = sheetDataStore[currentSchema.name] || [];
      document.getElementById('modalTitle').innerText = 'Edit Data #' + (idx + 1) + ' - ' + currentSchema.name;
      buildModalInputs(rows[idx] || {});
      document.getElementById('modalForm').classList.remove('hidden');
    }

    function buildModalInputs(data) {
      const container = document.getElementById('modalInputsContainer');
      container.innerHTML = currentSchema.headers.map(h => \`
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-400 uppercase">\${h}</label>
          <input type="text" name="\${h}" value="\${data[h] !== undefined ? data[h] : ''}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
        </div>
      \`).join('');
    }

    function closeModal() {
      document.getElementById('modalForm').classList.add('hidden');
    }

    function handleFormSubmit(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const newObj = {};
      currentSchema.headers.forEach(h => {
        newObj[h] = formData.get(h) || '';
      });

      if (!sheetDataStore[currentSchema.name]) sheetDataStore[currentSchema.name] = [];

      if (editingRowIndex !== null) {
        sheetDataStore[currentSchema.name][editingRowIndex] = newObj;
      } else {
        sheetDataStore[currentSchema.name].unshift(newObj);
      }

      closeModal();
      renderTable();
      saveCurrentSheetToGas(true);
    }

    function deleteRow(idx) {
      if (confirm('Apakah Anda yakin ingin menghapus baris data ini?')) {
        sheetDataStore[currentSchema.name].splice(idx, 1);
        renderTable();
        saveCurrentSheetToGas(true);
      }
    }

    function saveCurrentSheetToGas(silent = false) {
      const rows = sheetDataStore[currentSchema.name] || [];
      const statusTag = document.getElementById('syncStatusTag');
      if (statusTag) statusTag.innerText = '⚡ Menyimpan ke Google Sheet...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            if (statusTag) statusTag.innerText = '✅ Tersimpan di Google Sheet!';
            if (!silent) Swal.fire('Berhasil!', 'Data sheet [' + currentSchema.name + '] tersimpan di Google Spreadsheet!', 'success');
            setTimeout(() => { if (statusTag) statusTag.innerText = 'Ready'; }, 4000);
          })
          .withFailureHandler(err => {
            if (statusTag) statusTag.innerText = '❌ Error Sync';
            if (!silent) Swal.fire('Gagal', err.toString(), 'error');
          })
          .syncSheetData(currentSchema.name, JSON.stringify(rows));
      } else {
        setTimeout(() => {
          if (statusTag) statusTag.innerText = 'Local Save OK';
          if (!silent) Swal.fire('Mode Lokal', 'Data [' + currentSchema.name + '] tersimpan di memori browser!', 'info');
          setTimeout(() => { if (statusTag) statusTag.innerText = 'Ready'; }, 3000);
        }, 500);
      }
    }

    function syncAllData() {
      const icon = document.getElementById('syncIcon');
      if (icon) icon.classList.add('fa-spin');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            if (icon) icon.classList.remove('fa-spin');
            if (res && res.status === 'success') {
              Swal.fire('Sync Berhasil', 'Seluruh ${OFFICIAL_88_SCHEMAS.length} Sheet berhasil ditarik dari Google Sheets!', 'success');
              if (res.data) {
                sheetDataStore = res.data;
                renderTable();
              }
            }
          })
          .withFailureHandler(err => {
            if (icon) icon.classList.remove('fa-spin');
            Swal.fire('Error', err.toString(), 'error');
          })
          .getAllDatabaseData();
      } else {
        setTimeout(() => {
          if (icon) icon.classList.remove('fa-spin');
          Swal.fire('Mode Pratinjau', 'Fungsi sinkronisasi aktif saat aplikasi terpasang di Google Apps Script.', 'info');
        }, 800);
      }
    }

    function initDatabase() {
      Swal.fire({
        title: 'Menginisialisasi ${OFFICIAL_88_SCHEMAS.length} Sheet...',
        text: 'Sedang membuat seluruh ${OFFICIAL_88_SCHEMAS.length} Sheet Google Sheets beserta Header Resminya...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            Swal.fire(res.status === 'success' ? 'Berhasil' : 'Gagal', res.message, res.status === 'success' ? 'success' : 'error');
          })
          .withFailureHandler(err => {
            Swal.fire('Error', err.toString(), 'error');
          })
          .initialize88SheetsDatabase();
      } else {
        setTimeout(() => {
          Swal.fire('Mode Pratinjau', 'Inisialisasi ${OFFICIAL_88_SCHEMAS.length} Sheet siap dijalankan di lingkungan Google Apps Script.', 'info');
        }, 1000);
      }
    }
  </script>
</body>
</html>`;
}

